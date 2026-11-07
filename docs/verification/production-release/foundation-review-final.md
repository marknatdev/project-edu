# Independent foundation review — final re-review

Verdict: **APPROVE (foundation scope only)**. Fresh-context read-only agent (Claude Opus 5.5); no file edits, no credential reads, no remote calls. Reviewer ran `npm test`: 45 files / 374 tests passed (including the real-PostgreSQL 14-test suite and the PKCE callback tests).

## Prior findings — confirmed resolved
1. Abandoned reservations: owner-locked (`FOR UPDATE`) expiry sweep releases capacity (`202611060002_card_quota.sql:60-67`); reclaim issues a new `lease_id` (`:105`); stale worker gets `LEASE_EXPIRED` before reclaim and 404 after (`:111-113`); completed/failed batches never reclaimed (`:97`). Covered by crash + actual Postgres restart + stale-lease + idempotent replay test (`foundation-postgres.test.ts:184-201`).
2. Shared admission: `edu_rate_admission` atomic upsert, per-owner + global (auth 6/10min + 30/min; coach 12/min + 60/min), `service_role` only, enforced before model work in coach and before login/callback/logout. 40-owner test admits exactly 30.
3. Strict Guest on OAuth return: callback calls `admitAuth` but never applies its cookie; Guest cookie remains `sameSite:'strict'`; Lax-verifier-only test asserts no `edu-coaching-owner` Set-Cookie (red in `red-20`, green now).

## Non-blocking findings
- **P3-1 (documented, not fixed here):** a cookieless Guest request binds an owner row (`edu_bind_owner`, `202611060001_foundation.sql:39`, via `factory.server.ts:15`) before `allowRequest` runs (`admission.server.ts:9-10`, coach `route.ts:27-28`). Model work stays globally capped, but owner/rate rows can grow. Release owner: add edge/WAF limit and an empty-Guest-owner sweep, or move the global check before fresh Guest binding, before public exposure.
- **P3-2 (FIXED after review):** callback `catch` (rate limit/backend failure) skipped `clearVerifier`. Regression `tests/integration/auth-pkce.test.ts` › "clears the PKCE verifier when callback admission is rate limited or the backend fails" — red output `red-21-callback-verifier-cleanup.txt`; fixed in `src/app/auth/callback/route.ts`; green in final `tests-final.txt`.
- **Self-found while fixing P3-2 (FIXED):** `clearVerifier` matched only the legacy `sb-<ref>-auth-token-code-verifier` cookie, but the installed `@supabase/ssr` also writes per-flow `-flow-<id>-code-verifier` slot and `-flows-code-verifier` index cookies, so every callback failure path (error/cancel/bad code/unavailable) left them behind. Test strengthened to require every request verifier cookie cleared — red `red-22-flow-verifier-cookies.txt`; regex widened in `src/lib/supabase/server.ts` (same SDK slot pattern); green in final `tests-final.txt`. Not re-reviewed by the independent agent.

## Controls verified
`safeNext` exact allowlist (rejects `//`, encoded `//`, backslash, control chars, absolute URLs); `getUser()` for authorization (principal, callback, middleware) with cookie refresh onto request and response; HMAC Guest capability, production fail-closed on missing/short secret; production `PERSISTENCE_UNAVAILABLE` with no SQLite fallback; legacy AI routes 503 in production; client reads only static `NEXT_PUBLIC_*`; service-role key only in server-only modules; `appOrigin` ignores forwarded host and requires `APP_ORIGIN` in production; login checks Origin.

Not an approval of live OAuth, hosted PostgREST/RLS, deployment, dependency remediation or whole-app release.
