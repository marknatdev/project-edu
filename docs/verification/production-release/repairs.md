# DEF-02–DEF-05 release repairs

**Implementation phase complete; independent whole-app review required. No commit, push, deployment or hosted migration was performed.**

## Scope and authority

Continuation on task `t_5c005460` confirmed the HTTP and Save/Export/OAuth browser seams in `repairs/SEAMS.md`. Read the production-release spec, amended ADR 0002, glossary and original rejected `REVIEW.md`. Preserved the existing personalized Discovery/foundation/DEF-01 work and original review; its SHA-256 remains `387653b158f17b41aabffd33b5de4d7fef8e5663d71484b5b9a19a5ba49d3d9d`.

The previous interrupted attempt contained partial repairs, not a releasable result. Resumed baseline had **15 failing tests** and TypeScript errors. Prior red logs are retained as historical evidence; final verification below was rerun in this attempt.

## Repairs

- **DEF-02:** `/api/ai/pivot` accepts strict `open` / `turn` commands, not client `anonymousId`, `tier`, or `unlockedTiers`. Durable foundation records bind progression to the verified owner + idea ID/content + evaluation axis. Tier 1 question → non-empty learner answer → persisted Tier 2 hint → explicit Tier 3 request. Empty answers and early Tier 3 are rejected; another owner gets 404. CAS revisions, owner-generation fencing and idempotency receipts preserve the winner across concurrency/restart/wipe. Production uses Supabase, not a process-local map. This reuses the foundation persistence/authority used by conversations, with a separate Pivot record collection.
- **DEF-03:** Pivot never calls evaluate/proposal quota consumption. Migration `202611060005_evaluate_pivot_admission.sql` adds independent admission: **Pivot 12/owner/minute, 60 global/minute; evaluation 6/owner/minute, 60 global/minute**. Existing auth/coach/cards limits remain. Successful/replayed existing Pivot reads do not call the model again. Daily entitlements remain **5 free + 30 extra starter cards, 5 evaluations, 2 proposals**, per owner/Bangkok day.
- **DEF-04:** Evaluation GET/POST and proposal check/consume resolve the owner from verified Supabase `getUser()` or the server-issued signed HttpOnly Guest capability. JSON identities are rejected; query identities cannot select a bucket. Proposal consumption requires an owner-scoped UUID idempotency key. Migrated evaluation/proposal clients and all active callers; old learner strings no longer become request IDs. Serialized first-cookie bootstrap to avoid minting competing owners. Source-driven proposal creation now honors the server result; exhausted/unavailable allowance leaves a blank manual draft instead of silently assembling anyway. Save/manual editing/export remain free. Initial evaluation quota failures render an actionable error rather than a permanent spinner/repeated automatic requests.
- **DEF-05:** Optional Google offering is next to Save and Export, retaining Guest actions and explaining Auth name/email processing, no Drive/Calendar scopes, no automatic guest import/overwrite, and no cross-device project-sync claim. Uses the foundation's real server PKCE start/callback/session/logout paths. Before OAuth navigation, mounted proposal drafts save synchronously; storage errors or unfinished plan edit/add forms veto navigation instead of discarding work.
- **Related UI races:** Pivot axis switches are disabled during pending turns; changed idea ID/title/content remounts the workshop so previous-topic progress cannot leak into an edited topic. Offline guidance never invents Tier 3 progress. Minor existing small controls encountered in the browser were raised to 40px.
- **Production AI configuration:** Public-host HTTPS provider URL required in production; localhost/local/internal hostnames and literal IPs are refused before sending learner text/keys. Redirect following is disabled. Calls now have a default 2,000-token ceiling (explicit feature limits still override it). Production is not allowed to use the development OmniRoute URL.

## Red → green evidence

All paths below are relative to `docs/verification/production-release/repairs/`.

- Prior attempt: `red-01-evaluate-identity.txt`, `red-02-proposal-identity.txt`, `red-03-pivot-authority.txt`, `red-04-postgres-without-0005.txt`. `red-05-clients.txt` is a missing-module startup failure, **not** a behavioral red assertion.
- This attempt: `resume-baseline.txt` (15 failures), `resume-typecheck.txt`; `red-06-draft-browser.txt` (unsaved draft lost before OAuth), `red-08-production-ai.txt` (5 disallowed endpoint fetches), `red-11-rewrite-browser.txt` (old Pivot progression survives changed idea), `red-12-assembly-browser.txt` (exhausted quota still auto-assembles), `red-13-evaluation-quota-browser.txt` (quota failure remains loading).
- Early axis-race browser logs used an incorrect Thai selector; they are **not** proof of that behavior. The corrected selector and delayed real response pass in the final harness. Original intermediate failures remain unedited.

## Final executed verification

| Check | Result | Evidence |
|---|---|---|
| `npm ci --ignore-scripts` | exit 0; frozen lockfile installation | `clean-install.txt` |
| `npm test` | exit 0; **61 files, 489 tests passed** | `tests-final.txt` |
| `npm run lint` | exit 0; no warnings/errors | `lint-final.txt` |
| `npm run typecheck` | exit 0 | `typecheck-final.txt` |
| `npm run build` | exit 0; **17/17 static pages**, dynamic API/Auth routes | `build-final.txt` |
| `git diff --check` | exit 0 | `diffcheck-final.txt` |
| Real Chrome | **48/48 checks**, 360px + 1280px, Chrome 156 | `browser-results.json`, `browser-summary.json`, `browser-final.txt` |
| Native `npm audit --json` | exit 1; **0 critical, 1 high, 6 moderate remain**; triage below | `audit-final.json` |

### What was real vs simulated

**Real:** production `next start`, Chromium DOM/React/input/layout/cookies, downloaded DOCX ZIP containing the saved Thai draft, Supabase JS RPC transport, disposable local PostgreSQL 17 applying all five repository migrations, independent DB connections, real PostgreSQL process restart, database role/RLS/RPC permission tests. Browser verifies optional consent, storage-failure veto, draft preservation before redirect, PKCE cookie creation/clearing, sanitized return path, cancellation, Guest logout, forged unlock rejection, answer/hint/examples, content reset, independent Guest isolation, no proposal allowance loss, exhausted allowances and preserved personalized Discovery answers.

**Simulated/unconfigured:** the HTTP PostgREST hop is a test-only shim forwarding the actual shipped RPC SQL to local PostgreSQL as `service_role`; account/Auth responses in integration tests use synthetic fixtures. AI is **unconfigured** for the repair browser (explicit deterministic fallback for evaluation/Pivot; honest unavailable for new Discovery cards). Other suite tests label their mocked upstream. A browser fetch wrapper interrupts the first login response only to inspect the draft before provider navigation. Subsequent PKCE start/cancel/logout tests exercise real application handlers. **No Google account sign-in, successful real provider callback/session, hosted JWT verification, hosted RLS/PostgREST or live AI quality is claimed.**

Twelve screenshots cover Proposal/optional login, Pivot, and Discovery unavailable at mobile/desktop, including full-page captures. Full-page sticky headers can appear mid-image; actual viewport screenshots were also inspected. Checkbox hit areas are measured via their clickable labels, not only 20px glyphs.

## Dependency security triage

Initial native audit: 12 findings (2 critical, 2 high, 8 moderate). Updated **Vitest to 4.1.12**, pinned compatible **Vite 7.3.7** for the existing JSX harness, and applied a scoped **PostCSS 8.5.32** override. Clean installation, full tests and production build pass. No forced audit upgrade. Next remains 15.5.29; final `npm ls postcss` succeeds. The initial nested override was ineffective with the existing lock; the final root `$postcss` override resolves correctly after `npm ci`.

Remaining findings, to be explicitly considered at independent release review (reassess before publication and before exposing new parsing/build surfaces):

1. **HIGH Zod (`GHSA-mrhx-c7xc-m3w5`, installed 3.25.76; patched major 4.6.6+): mitigated, not removed from the audit.** Oversized untrusted collections are rejected **before Zod validation** at all public coaching/evaluation/Pivot/proposal/fresh-card JSON boundaries (64 KiB maximum or stricter). The new production boundary regression submits a 40,000-element collection to each and observes 413 without issuing identity cookies. Model content/envelope also have explicit byte ceilings before schema validation. This bounds the advisory's unbounded per-element issue accumulation; it is not a claim of general DoS immunity or a clean dependency audit. A major Zod migration would alter schemas/types across the app and was not folded into this narrow repair. Reviewer must assess this mitigation before approving release.
2. **Six MODERATE audit entries** are the lint-only minimatch advisory (`GHSA-g3hv-75wg-m249`) and its five TypeScript-ESLint dependents. No HTTP/user input reaches lint glob processing; repository/CI configuration is trusted. Deferred rather than forcing minimatch 11 into a dependency expecting another major. Reassess on the next lint-toolchain update, and before accepting untrusted build/glob configuration.

Primary advisory references: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 ; https://github.com/advisories/GHSA-85c8-ppgw-ccpr ; https://github.com/vitest-dev/vitest/releases/tag/v4.1.12 .

## Handoff / live gates

The existing independent reviewer child consumes this implementation handoff. Review **all dirty/untracked source**, not merely HEAD; it includes earlier foundation/Discovery work. Do not overwrite original `REVIEW.md`. No source was staged or committed here.

Publication must still wait for independent APPROVED whole-app review (including the remaining audit mitigation), reviewed migrations 0001–0005 on the exact hosted project, service/Guest secrets configured through approved secure UI, actual public HTTPS AI configuration/key, returned Vercel deployment origin, Google provider configuration, and a real interactive Google sign-in/callback/session/logout check. The implementation worker did not apply hosted changes or claim these gates complete.
