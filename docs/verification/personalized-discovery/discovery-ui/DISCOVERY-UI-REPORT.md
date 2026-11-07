# Personalized Discovery B — UI integration: verification report (card t_ea82b33e)

Status: implemented and verified at code level and in a real production-mode browser run.
**No live AI was called.** Every AI upstream response (fresh cards AND coaching while AI was
configured) came from a **labelled MOCK** OpenAI-compatible server inside the browser runner.
Nothing was committed, staged, pushed or deployed; HEAD is still detached at
`880e3a30a62e5fd61791bb3e7bab4025afdc2a30`. `REVIEW.md`, `CONTEXT.md`, ADR 0002, the specs and both
mockups were not modified. This report covers the Discovery UI card only; it does not approve
DEF-02–05 or the whole app.

## What changed
| Area | Files |
|---|---|
| Adaptive Thai interest chat (scripted guide questions, not AI): 2–4 questions one at a time; “ยังไม่รู้/ไม่แน่ใจ/ยังคิดไม่ออก” → guiding near-life question; never asks known constraints/name/school | `src/lib/discovery/interest-interview.ts` (new) |
| Discovery session: reducer, exact per-`requestId` request builder (interview constraints → Thai labels, clamped), likes/skips/typed refinement + seen ids, result handling (ok/partial/replay/pending/rate/network/unavailable/failed/conflict/quota), shortlist ≤5, compare 2, undo, restart-keeps-cards-and-quota, bounded (200) validated localStorage persistence under `edtech:` (wipe clears it) | `src/lib/discovery/fresh-session.ts` (new) |
| Browser transport for `POST/GET /api/discovery/cards`: validates the response union, never fabricates/repairs cards; network/non-JSON → truthful retryable error; serialized with coaching's owner lock | `src/lib/discovery/fresh-client.ts` (new) |
| New Discovery UI (Theme A+B, mobile-first, parent mockup flow): chat → editable summary → loading → swipe deck (buttons, ←/→/↑ keys, drag) → shortlist / compare / saved → coaching handoff; real quota panel; truthful notices with retry; no-interview gate (links to /interview instead of guessing constraints) | `src/components/discovery/FreshDiscovery.tsx` (new), `src/app/discovery/page.tsx` (replaced) |
| Seed-first default removed: page no longer builds the 90-card deck or calls the legacy endpoint; seed data, legacy components and their tests are kept | `src/app/discovery/page.tsx`; copy updated in `src/app/page.tsx`, `src/components/interview/InterviewWizard.tsx` |
| Coaching handoff (B1 per-topic design unchanged): a generated card (no catalog entry) is coached from its own problem + rough direction + interest link; idea page shows that selected card context | `src/lib/advisor/coaching-store.server.ts` (`ideaContext` description), `src/app/idea/page.tsx` (presentational panel only) |
| Misleading “verified” removed (spec §8) from the legacy client + legacy SwipeDeck badge | `src/lib/discovery/ai-cards.ts`, `src/components/discovery/SwipeDeck.tsx` |
| Pre-existing flaky parent test made timing-robust (same invariant: one model call, one charge, one non-replayed ok; late arrivals may legitimately replay) | `tests/integration/fresh-cards-postgres.test.ts` |

No server API/contract, quota, migration or dependency change was needed: the UI reuses the
parent's `/api/discovery/cards` and `/api/ai/coach` contracts as-is.

## Seams and TDD record
Seams fixed up front (headless worker): `SEAMS.md`. Red → green outputs in this folder:

| Slice | Red | Green | Candid note |
|---|---|---|---|
| D1 opening + adaptive follow-up | `red-01-interview.txt` (module missing) | (1 test) | — |
| D1 “ยังไม่รู้” guidance, 2–4 termination, no constraint/PII questions, summary draft | `red-02-interview-adaptive.txt` (2 failed) | `green-02-interview-adaptive.txt` (5) | the “never asks constraints” and summary tests passed on first run (behaviour already implied by slice 1) |
| D2 request: constraints/answers/summary, clamping | `red-03-session-request.txt` (module missing) | `green-03-session-request.txt` (2) | — |
| D2 results: partial honesty, replay de-dupe, failure kinds keep work, same-vs-new intent, stale result | `red-04-session-results.txt` (3 failed) | `green-04-session-results.txt` (5) | — |
| D2 swipes/no subject veto/undo/shortlist cap/compare/select/refinement/restart | `red-05-session-swipes.txt` (4 failed) | `green-05-session-swipes.txt` (9) | — |
| D2 refresh resume, corrupt/tampered data | `red-06-session-resume.txt` (3 failed) | `green-06-session-resume.txt` (12) | — |
| D3 browser transport | `red-07-client.txt` (module missing) | `green-07-client.txt` (4) | — |
| D4 generated card → coaching context, Tier-3 gate, per-card isolation (real route handlers, SQLite adapter, MOCK upstream) | `red-08-coaching-handoff.txt` (rough direction absent from opening) | `green-08-coaching-handoff.txt` (1) | — |
| D5 no “verified” badge | `red-09-no-verified-badge.txt` (1 failed) | `green-09-no-verified-badge.txt` (3) | one legacy assertion that required `verified:true` was changed to the spec §8 contract |
| D2 bounded local history | `red-10-bounded-history.txt` (1 failed) | `green-10-bounded-history.txt` (13) | — |

## Final gates (normal environment, after the harness build) — `final-exit-codes.txt`
- `npm run test` exit 0 — **56 files / 460 tests** (`final-test.txt`; baseline before this card: 52 files / 437 tests, 1 flaky failure — `baseline-tests.txt`)
- `npm run lint` exit 0 · `npm run typecheck` exit 0
- `npm run build` exit 0 — 17/17 pages incl. `○ /discovery`, `ƒ /api/discovery/cards` (`final-build.txt`)
- `git diff --check` exit 0; new untracked files checked separately: no trailing whitespace

## Real production browser run — `run-discovery-ui-browser.py` → **129/129 PASS**
Outputs: `browser-output.txt`, `browser-results.json`, `browser-summary.json`, `runtime.log`, `harness-build.txt`, screenshots in `screenshots/` (viewport + `-full`).
- **Stack (real):** headless Chrome 156; `next start` production build; `PERSISTENCE_BACKEND=supabase`; signed HttpOnly Guest capability; supabase-js → `rest-shim.mjs` (test-only PostgREST stand-in, copy of the def01-cloud shim that additionally reports `cards` admission windows) → **real local PostgreSQL 17** with repository migrations 0001–0004; Next server restarted twice (3 PIDs); production admission limits honoured by waiting (no loosening).
- **Mocked (labelled):** the AI upstream (9 fresh-card calls, 5 coaching calls) — hand-written Thai sample cards then synthetic random-letter samples; coaching replies are a fixed text starting “คำถามจาก MOCK (ไม่ใช่ AI)”. Synthetic per-run keys. Network failure simulated with CDP URL blocking.
- **Covered at 360px:** chat opens (no seed deck/subject picker); real quota 5/30 before generation; “ยังไม่รู้” guided; typed answer adapts follow-up; no constraint/identity questions; editable summary; truthful loading (“ยังไม่หักโควตา…”); generate5 carries edited summary + Thai constraint labels, upstream prompt got them, key only server-side; 5 snapshots persisted; source/limits shown, no “Verified”/safety-passed claim; keyboard ← → and buttons, undo; one skip keeps same-subject cards; **refresh resumes** exact deck position/swipes/shortlist without regenerating; more5 sends likes/skips/typed refinement/seen ids and the prompt carried liked/skipped/avoid titles; 10 unique cards; partial batch “2 จาก 5”, charged 2, no filler; upstream down → Thai AI_UNAVAILABLE, cards/answers kept, quota unchanged, retry with **new** requestId; network failure → same intent kept across a **page reload**, resent with the **same** requestId, charged once; shortlist/compare 2/fit text; select → `/idea?topicCardId=fresh_…` with the card snapshot + constraints, server coaching prompt built from that card's problem/direction/interest link, context panel visible; Tier 3 locked on first turn and after the answer until a Tier-2 hint, explicit Tier 3 issues examples, copied example rejected by the own-words gate; second card = separate conversation with its own context and fresh gate; first card resumes its history; after **Next restart** saved cards + server quota (22) intact; allowance consumed 27 → 32 → 35 (last batch capacity 3); UI shows 0/0 and disables more; forced 36th request → 429 `quota_exhausted` with no upstream call; restarting the interview/new topic does **not** renew (button disabled, all 35 cards kept); **AI unconfigured** (fresh owner) → 503 AI_UNCONFIGURED in Thai, zero cards, nothing charged, no upstream call, answers kept.
- **Widths:** overflow + ≥40px control checks and screenshots at 320, 360, 390 and 1280 (deck), plus 1280 shortlist/summary/coach/unconfigured. No JS errors on any captured page.
- **Regression smoke (360px):** `/`, `/interview`, `/idea`, `/evaluation`, `/proposal`, `/consent` load without JS errors.
- **Logs:** server log contains no learner interest text and none of the synthetic secrets.
- Full-page captures draw the sticky header / fixed bottom nav mid-page; that is a capture artifact (same as DEF-01 report), not an overlap in the viewport.

## Design decisions (made headless)
- Interest questions are deterministic scripted guidance (adaptive to the previous answers), not AI output, and labelled as such in the chat; they work offline and cost no quota. Fresh AI is used only for the cards.
- Discovery state lives in validated localStorage (`edtech:discovery-fresh:v1`), the server ledger stays authoritative for quota, idempotency and accepted snapshots. Pending intents store the exact body; refresh resends the same `requestId`. Retry semantics: `pending`/`rate_limited`/network/unknown HTTP → same intent; `unavailable`/`failed_intent`/`conflict`/`quota_exhausted` → new intent.
- Pending responses are polled slowly (10 s, max 12) because polls count against the 6/min admission limit.
- Without a completed interview the page asks the learner to do it instead of inventing constraints.

## Not verified / residual risks (truthful)
- Live AI generation and live coaching quality — AI is not configured here; all upstream content was MOCK.
- Hosted Supabase PostgREST/JWT/RLS, migration 0004 on the hosted project, Vercel runtime, Google OAuth account-owned sessions.
- Two tabs editing Discovery at once: last local write wins for the browser session copy (server ledger and quota stay correct; cards remain counted).
- Clearing cookies/wipe/new account starts a fresh allowance (inherited from the parent design).
- The legacy `SwipeDeck`/`ShortlistMatrix`/`SubjectSubfieldPicker` components and `/api/ai/cards/generate` remain in the tree, unused by `/discovery` (kept per “don't delete archive/catalog tests”).
- No independent review of this card yet; parent default/Hermes owns review and user approval. DEF-02–05 untouched.
