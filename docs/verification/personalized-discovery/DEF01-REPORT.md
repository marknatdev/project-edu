# DEF-01 — authoritative, resumable per-topic Socratic coaching: verification report

Card `t_632f7c83`, contract: `docs/specs/personalized-discovery-and-def01.md` § "DEF-01 coaching contract" + ADR 0002 clarification. Workspace HEAD `880e3a3` (detached), **nothing staged or committed, no deployment, no live AI, no hosted Supabase/Vercel calls.** `REVIEW.md` (old whole-build REJECTED report) is unchanged. This report covers DEF-01 only. It does not approve Discovery B, DEF-02–05, or the whole app.

## Run history
- Run 24 (builder) implemented DEF-01 test-first and verified it against SQLite: 334 tests and 88/88 browser checks in `def01/`. It then ran out of iterations before completing.
- The release foundation (`t_5fe0273e`) then replaced persistence. Production now **must** use Supabase/Postgres (`next start` refuses SQLite), so the run-24 SQLite browser runner `run-def01-browser.py` can no longer exercise production mode. It is kept as history.
- This run (35) re-verified DEF-01 against the new backend, fixed 2 defects (red → green below) and fixed 1 layout overlap. Evidence is in `def01-cloud/`.

## Storage / checkpoint design (chosen: durable server storage, explicit deletion)
- **Authority:** the server conversation record is the only authority: `FoundationStore` collection `coaching`, key = topic key. Browser state is never accepted. `CoachRequestSchema` is `.strict()`, so `state`, `unlockedTiers`, `history`, `anonymousId` and similar fields return 400. Gating reads only server-issued ordered history (`nextCoachTurn`). The default `unlockedTiers:[1]` is display data, not evidence.
- **Tier 3 sequence (per conversation, per ADR):** the server issues a Tier-1 question. The learner sends any non-empty response ("ยังคิดไม่ออก" is fine; there is no length or correctness grading). The server issues a Tier-2 hint with lenses after that answer. Only then does an explicit `requestedTier:3` return examples. Earlier Tier-3 requests are downgraded (`tierDowngraded:true`) to Tier 2, or to Tier 1 if there is no answer yet. Chosen Tier-3 angles still pass the own-words `RewriteGate`.
- **Identity:** the owner comes only from `resolvePrincipal`: either a verified Supabase `getUser` ID, or the Guest cookie `edu-coaching-owner` = random 256-bit token + HMAC (`APP_GUEST_SECRET`), set HttpOnly, SameSite=Strict, and Secure in production.
  - Conversation identity is a server UUID plus a revision (CAS). Topic identity is `card:<cardId>` or `idea:own`.
  - The card snapshot given on first `open` is stored in `conversation.context.topicCard`. Later opens cannot replace it. This is the extension point for generated cards, which have no `TOPIC_CARDS` lookup: `saveTopicCardSnapshot` / `resolveCoachingCard`.
- **Idempotency / concurrency:** each turn carries `requestId`. The receipt fingerprint covers tier, answer and aspect. A replay returns the current truth; reusing the same id with a different payload returns 409. A stale revision returns 409 and the winner is kept.
- **Restart persistence:**
  - Production: Supabase Postgres via service-role RPC (`supabase/migrations/2026110600{01,02,03}`). Data survives app and DB restarts. If the cloud config is missing, the route returns 503. It never falls back to SQLite or to an ephemeral key.
  - Local `npm run dev` and tests: durable SQLite at `COACH_DB_PATH` (default `.local/coaching/conversations.sqlite`).
- **Required runtime setup (operator, secure UI only):** `PERSISTENCE_BACKEND=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY`, `APP_ORIGIN` = exact deployed origin, and server-only `APP_GUEST_SECRET`.
  - `APP_GUEST_SECRET` must be a CSPRNG value of at least 32 bytes, **stable across instances and restarts**.
  - Rotating it makes existing Guest capabilities unverifiable. Since this run, the browser recovers with a fresh owner instead of a permanent 401, but old Guest conversations become inaccessible.
  - See `docs/verification/production-release/foundation-contracts.md`. No secret was read, printed or changed.
- **Client role:** `localStorage` holds a per-topic cache of the last server conversation plus local work: drafts, input, the rewrite and variables. It is used to show history while offline or loading and to keep learner text. On every load the cache is shown unverified (`serverVerified:false`) until the server `open` re-hydrates it. Offline sends become unverified drafts and never unlock tiers. Re-sending a draft is an explicit, idempotent server turn.
- **Start-new / wipe:**
  - `reset` (CAS on the old id) creates a new UUID with fresh gates, fences the old handle (404) and leaves other topics alone.
  - `DELETE` wipes the owner's records, bumps the generation (in-flight writes get 410), clears the cookie and broadcasts to other tabs. App `edtech:*` local keys are erased; unrelated keys are kept.
- **Limits / tradeoffs:**
  - 64 history entries per conversation.
  - 8000 characters per answer; 64 KiB per request.
  - Admission limit of 12 coach requests per owner per minute plus 60 per minute globally (fixed windows).
  - One AI call per turn, outside any transaction. With concurrent different turns, the loser gets 409 after its AI call.
  - A Guest's data does not move to an account on login (no import, by design).
  - Signed-out data is tied to the browser cookie: deleting the cookie loses server access, though the local cache and drafts remain.

## Defects found and fixed this run (tests first)
1. **Permanent lockout on an unverifiable Guest cookie.** A tampered cookie, or one issued before a secret rotation, got 401 on every request forever, because an HttpOnly cookie cannot be cleared by JS.
   - Red: `def01-cloud/red-01-guest-401-recovery.txt` (no Set-Cookie on 401). Green: `green-01-guest-401-recovery.txt`.
   - Fix in `src/app/api/ai/coach/route.ts`: on `GUEST_VERIFICATION_REQUIRED`, return 401 with a Thai recovery message and clear the cookie (Secure in production). The invalid capability still grants nothing.
   - Browser checks for this were added and pass.
2. **A displaced tab could resurrect a reset conversation.** After start-new in tab A, tab B (same topic, unsent draft) autosaved its stale conversation over the shared local cache. A's next load would then restore the deleted history as "recovered" drafts.
   - Red: `def01-cloud/red-02-displaced-tab-cache-overwrite.txt` plus diagnostic JSON. The reset succeeded server-side (new id `3d2b…`), but the cache kept the old id `c18b…`.
   - Fix in `src/app/idea/page.tsx`: a `displaced` ref is set by the reset broadcast. While it is set, autosave writes drafts and work but `cached:null`. It is cleared on a successful reconnect, or right after this tab's own reset broadcast (the same-window listener also fires).
   - The displaced draft is still kept and still grants nothing.
3. **Layout (visual inspection at 320px):** the tier header text touched "ปลดล็อกตามลำดับ". Fixed with `gap-3`, `min-w-0` and `shrink-0` in `TierButtons.tsx`.

## Commands and results (final, after all edits; outputs in `def01-cloud/final-*.txt`)
| Command | Result |
|---|---|
| `npm run test` | exit 0 — **379 tests / 46 files passed**. Includes the new `tests/integration/coaching-cloud.test.ts` (4) and `coaching-api.test.ts` (11, local SQLite). Real PostgreSQL 17 foundation tests still pass. |
| `npm run lint` | exit 0, no warnings |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 (Next 15.5; normal build without harness env, run after the browser run). The harness shim URL is absent from the build output; it appears only in `.next/cache` packs. |
| `git diff --check` | exit 0 |
| `python docs/verification/personalized-discovery/def01-cloud/run-def01-cloud-browser.py` | exit 0 — **93/93 checks**, Chrome/156.0.8078.81, widths 320/360/390/1280 (`browser-output.txt`, `browser-results.json`, `browser-summary.json`) |

## What is real vs simulated
- **`coaching-cloud.test.ts`:** real Next route handlers, the real signed Guest cookie in production mode, real supabase-js, and a **real local PostgreSQL 17** running the shipped migrations.
  - Only the HTTP hop to PostgREST is simulated (fetch calls the same SQL function as service_role).
  - It covers the Tier 1 → stuck answer → Tier 2 → explicit Tier 3 sequence, first-turn and early Tier-3 downgrades, and exact resume **after an actual Postgres process restart**.
  - It also covers topic and owner isolation, forged state (400), a forged cookie (401 plus clear plus fresh recovery), start-new fencing, and wipe with revocation while other owners stay intact.
- **Browser harness:**
  - Setup: real headless Chrome and a real `next start` (production) with `PERSISTENCE_BACKEND=supabase`. supabase-js talks to `def01-cloud/rest-shim.mjs`, a *test-only* PostgREST-compatible RPC forwarder, which talks to a **real local PostgreSQL 17** with the repo migrations.
  - **Both the Next server and the database process are restarted** mid-run; their PIDs differ. Chrome is also fully closed and reopened on its profile.
  - All keys are synthetic per-run values generated by the runner. The runner waits for the real production rate window ("PACE") rather than loosening the limits.
  - AI is unconfigured, so coaching content is the server's deterministic fallback, labelled in the UI as "ไม่ได้เรียก AI สด". This is **not live-AI evidence**.
  - The noncatalog generated card is an explicitly labelled test fixture.
  - API outages are simulated by blocking `/api/ai/coach` in the browser.
- **Browser coverage:**
  - The real selected card and constraints are hydrated. Hint and examples start locked. Concurrent first-use tabs share one owner. The HttpOnly cookie is invisible to JS. Tampered state is rejected over real HTTP.
  - Native keyboard: Enter submits and Tab reaches the hint button. The stuck answer is accepted, a normal answer never escalates, and the Tier-2 hint shows lenses.
  - **Server + DB restart, then reload, gives the exact same conversation.** A full browser close and reopen resumes it too. Only an explicit Tier-3 click issues examples. A copy of the second example is rejected. A partial rewrite survives refresh.
  - Other topics keep fresh gates. Offline answers never unlock. Drafts survive refresh and are recovered and resent explicitly.
  - The noncatalog snapshot resolves. Start-new and cross-tab reset are covered, including the displaced-cache regression. Cross-tab wipe clears app keys and keeps unrelated ones. After wipe a new conversation starts.
  - An invalid capability is recovered.
  - Overflow and 40px touch-size checks were run at each screenshot width. There are no JS errors.
- **Screenshots** are in `def01-cloud/*.png`, viewport plus `*-full.png`. In full-page captures the fixed bottom navigation is drawn mid-page; that is a capture artifact, not a layout overlap.

## Not verified / blockers (truthful)
- Live AI coaching quality: AI is not configured here.
- Hosted Supabase PostgREST/JWT/RLS, Vercel runtime, and real Google OAuth sessions for account-owned coaching. These are pending the publication owner, per foundation open items.
- Legacy local SQLite browser runner (`run-def01-browser.py`): superseded because production forbids SQLite. The local adapter is still covered by `coaching-api.test.ts`.
- The rewrite (own-words) gate is a client-side pedagogic gate. It is not part of the server tier authority, and the server does not record the rewrite.
- No independent review of this run yet. Parent default/Hermes owns review and user approval.

## Files changed this run
`src/app/api/ai/coach/route.ts`, `src/app/idea/page.tsx`, `src/components/advisor/TierButtons.tsx`, new `tests/integration/coaching-cloud.test.ts`, new `docs/verification/personalized-discovery/def01-cloud/*` (runner, shim, evidence), and this report. The pre-existing uncommitted DEF-01, foundation and user-doc changes are preserved.
