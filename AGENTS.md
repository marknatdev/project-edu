# AGENTS.md

This file provides guidance to Codex (claude.ai/code) when working with code in this repository.

## What this is

Project Edu: a mobile-first Thai-language PWA that helps lower/upper secondary students (ม.ต้น/ม.ปลาย) start a science/computing/math project. Flow: Interview → Idea Track (evaluate own idea) or Discovery Track (AI-generated topic cards, Tinder-style swipe, shortlist) → Socratic coaching → Evaluation (5 axes, prior work, safety flags, pivot) → Proposal + weekly Plan → export (PDF/DOCX/share link), plus BOM, competition calendar, mock judge, advisor sign-off.

Stack: Next.js 15 App Router, React 19, TypeScript strict, Tailwind 3, Framer Motion, Zod 4, Supabase (Postgres + Auth/Google OAuth via `@supabase/ssr`), Vitest 4. Deployed on Vercel (Node 24.x); Node 24 is used locally (`node:sqlite` is required by the local persistence adapter), though `package.json` has no `engines` field.

Domain vocabulary (Learner, Topic Card, Swipe, Shortlist, Fit Score, Evaluation, Pivot, Safety Flag, Coaching Conversation, ...) is defined in `CONTEXT.md`; use those terms. UI copy and user-facing error messages (`messageTh`) are Thai.

Key docs: `docs/adr/` (decisions), `docs/specs/` (approved scope, incl. `production-release.md` for Vercel/Supabase/GCP targets and release gates), `REVIEW.md` (historic review findings), `docs/verification/<feature>/` (red/green test evidence and screenshots per milestone). `README.md` and the `PLAN.md` header status lines are out of date; check `git log` for current state.

## Commands

```bash
npm run dev          # next dev
npm run build        # next build
npm run lint         # eslint . (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
npm test             # vitest run (all tests/**/*.test.ts)
npx vitest run tests/unit/store.test.ts          # single file
npx vitest run tests/unit/store.test.ts -t "name" # single test
```

- Vitest only collects `tests/**/*.test.ts` (node environment). `@/` aliases `src/`; `server-only` is aliased to a no-op stub (`tests/support/server-only.ts`) so server modules can be imported in tests.
- `npm test` includes real-Postgres integration tests (`tests/integration/*postgres*.test.ts`, `coaching-cloud`, `semantic-acceptance`, `wipe-quota-retention`, `ai-owner-invalidation`) with no skip guard. `tests/support/postgres.ts` boots a throwaway embedded PostgreSQL 17 under `.local/foundation-tests/`, stubs `auth.uid()`, and applies every `supabase/migrations/*.sql` in sorted order. They are slower; on Windows they drive `pg_ctl` directly. Never point them at a real/hosted database.
- Browser regression harnesses (not part of `npm test`): `node tests/browser/<name>.browser.mjs`. They bundle a fixture with esbuild and drive real Chrome/Edge over CDP with synthetic transport/storage. Need Chrome/Edge (or `CHROME_BIN`) and `TMPDIR`/`TEMP`/`TMP` set. There is no Playwright test suite in this repo.
- RLS SQL checks live in `supabase/tests/foundation-rls.sql`.

## Environment variables

`.env.example` lists only a subset. Variables actually read by the code:

- AI (ADR 0001, OpenAI-compatible gateway): `AI_BASE_URL`, `AI_API_KEY` (server-only), `AI_MODEL`. Dev default gateway is a local OmniRoute (`http://localhost:20128/v1`). In production the gateway counts as configured only for a public HTTPS hostname (no localhost, IP literal, or URL credentials).
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY` (server-only, used by the persistence factory).
- Identity/persistence: `APP_GUEST_SECRET` (HMAC key for guest cookie, ≥32 bytes, required in production), `PERSISTENCE_BACKEND` (`sqlite` | `supabase`), `COACH_DB_PATH` (local SQLite path, default `.local/coaching/conversations.sqlite`), `APP_ORIGIN` (exact deployed origin for OAuth redirects and same-origin checks; required in production because forwarded-host headers are never trusted), `CARD_BATCH_LEASE_SECONDS`.

With Supabase env vars set, Google sign-in is required before any app page or owner-bound API (ADR 0003). Without them (local dev and most tests) the app runs Guest-only and middleware/auth are no-ops; without AI env vars, Discovery card generation honestly reports "unavailable" while other AI features use deterministic fallbacks.

## Architecture

### Two state planes
1. **Client local-first store** (`src/lib/storage/store.ts`): versioned `localStorage` state under the `edtech:` prefix (learner, interview, swipes, ideas, projects, evaluations, pivots, BOM). Per-project auxiliary records use `projectRecordKey()` (`storage/project-records.ts`). PDPA wipe (`wipeAllLearnerData`) bumps a wipe-generation token so other tabs and in-flight requests stop writing stale data (`use-wipe-invalidation.ts`). Schemas in `src/lib/schemas.ts` are `.strict()` to keep the zero-PII rule (no real names, school names, emails).
2. **Server-authoritative records** for coaching conversations, discovery sessions/cards, pivot progression, rate limits and quotas, accessed through the `FoundationStore` interface (`src/lib/persistence/contracts.ts`): CAS writes with revisions, idempotency receipts, wipe, rate admission, daily card quota (5 free + 30 extra/day, Asia/Bangkok day), card batch leases, evaluate/proposal quotas.

### Persistence backend selection (fail closed)
`persistence/config.ts` + `factory.server.ts`: local dev defaults to the SQLite adapter (`sqlite-store.server.ts`, `node:sqlite`); production, `VERCEL=1` or Lambda requires Supabase (`supabase-store.server.ts`, which calls Postgres RPC functions defined in `supabase/migrations/` using the service-role key). If the required backend is not configured, it throws `PERSISTENCE_UNAVAILABLE`. It must never silently fall back to local/in-memory storage. Both adapters must implement the same contract semantics; add a migration plus matching SQLite behavior together, and cover them with the Postgres integration tests.

### Identity and ownership
`OwnerKey` (`g:<digest>` for guests, `u:<uuid>` for accounts) comes only from `resolvePrincipal()` in `src/lib/auth/principal.server.ts`: a verified Supabase `getUser()` or a server-issued, HMAC-signed guest cookie. Never accept an owner, anonymous ID, or unlocked tier from a request body, query, or custom header. When Supabase is configured, an unauthenticated request gets `401 AUTH_REQUIRED` (no Guest principal is minted, except `guestOnly` for sign-in rate admission) and a signed-in user is always the account workspace; the `x-edu-workspace` header must match the verified scope or the request fails with `409 WORKSPACE_*`.. Owner-bound API routes use the helpers in `persistence/owner-route.server.ts` (same-origin check, bounded body via `lib/http/bounded-body.ts`, field-path-only validation errors, no echo of learner input or provider errors). `src/middleware.ts` (Next 15 `middleware.ts`, not the Next 16 proxy convention) refreshes Supabase session cookies and, when Supabase is configured, redirects signed-out page requests to `/auth?next=` (the landing/sign-in page). Exempt: `/auth`, `/api` (routes return JSON 401), `/share`, `/advisor-review`, `/consent`. OAuth is PKCE via `src/app/auth/*` routes with a local-only return-path allowlist (`lib/auth/paths.ts`).

### AI gateway and pedagogy
`src/lib/ai/gateway.ts` reads config at call time (never cache env at module scope; tests use `vi.stubEnv`). `callAiStrict` never returns substitute data and is used for fresh Discovery cards, so seed/template cards must never be presented as freshly generated. `callAiGateway` wraps it with a deterministic offline fallback for the other features. Log only reason codes/status, never prompts, model output, upstream error bodies, or keys. AI routes live under `src/app/api/ai/*` with `runtime = 'nodejs'`.

ADR 0002 (Socratic Advisor First) still governs the Pivot workshop: Tier 1 questions → Tier 2 hints → Tier 3 examples only after server-verified progression for that specific topic/idea, stored server-side in `pivot/pivot-store.server.ts` and never trusted from the client; locally cached offline turns do not count as unlock evidence. Pivot does not consume proposal quota. The coaching chat (`/api/ai/coach`) follows ADR 0004 instead: four user-selected modes (ask / research / ideate / auto) replace the tier ladder there. Research mode may only show prior work from `src/data/prior-work.ts` (the server strips model URLs), ideas from AI stay starting points, and the RewriteGate own-words step before saving an idea stays. Keep the regression tests for both rule sets green.

### Code layout conventions
- `src/app/<page>/page.tsx` are thin; feature UI lives in `src/components/<feature>/`, logic in `src/lib/<feature>/`.
- `*.server.ts` files import `server-only` and must never reach client bundles. `*-client.ts` files are browser fetch wrappers; `*-contract.ts` / `*-dto.ts` hold the Zod request/response schemas shared by both sides.
- Pure deterministic engines (rubrics/fit score, safety screener, variables rigor, BOM budget, weekly plan, judge practice) live in `src/lib/*` and are unit-tested directly.
- Static data (seed topic cards, verified prior work with real URLs, subfields, competitions) is in `src/data/`. Prior-work citations must be real and verifiable; do not invent them.
- Safety flags (SRC/ISEF categories) are advisory and must not block progress.

### Security headers
`next.config.ts` sets CSP and other headers. `connect-src` hardcodes the Supabase project host, so update it if the Supabase project changes.

## Working rules from the project specs

- Never let tests or agents perform irreversible real-world actions. Postgres tests use their own ephemeral cluster; checks against the hosted Supabase project are read-only or use synthetic fixtures that are cleaned up afterwards.
- Do not disable RLS or add open policies to make tests pass. Service-role keys stay server-side.
- Google OAuth requests sign-in scopes only. Never copy OAuth profile data into app rows, telemetry, or AI prompts.
- For GCP CLI commands always pass `--project=project-edu-marknatdev` (the CLI default project belongs to another app).
- No `npm audit fix --force`, force-push, or history rewrite.
