# Fresh-card API — seams under test (card t_b16ea6da)

Worker runs headless (no live user to confirm), so the seams were fixed up front
from the approved spec (`docs/specs/personalized-discovery-and-def01.md` §6–8,
Deliverable B) and the foundation contract (`docs/verification/production-release/foundation-contracts.md`).
No test is written against internals outside these seams.

| # | Seam (public interface) | Why it is a seam | Behaviour verified there |
|---|---|---|---|
| S1 | `callAiStrict()` in `src/lib/ai/gateway.ts` | The only way fresh generation talks to the upstream model; never substitutes fallback data | unconfigured / HTTP error / network / timeout / empty / malformed JSON / schema / oversized → typed failure, never data; success → data; no learner text or upstream body in logs. `callAiGateway()` (other features) keeps its documented offline fallback. |
| S2 | `isSemanticRepeat()` in `src/lib/discovery/fresh-dedupe.ts` | Conservative semantic-repeat policy is a product rule that needs calibration examples | Thai paraphrases of the same idea are repeats; different ideas in the same subject are not. |
| S3 | `generateFreshCards(store, request, deps)` in `src/lib/discovery/fresh-cards.server.ts` | Domain service: quota, idempotency, dedupe, partial acceptance, truthful unavailable. Tested over the REAL durable adapters (SQLite local + real PostgreSQL 17) with an explicitly MOCKED upstream model | personalization prompt from interest + constraints; 5 free then 30 extra per Bangkok day; topic switch no renewal; no charge for errors / fallback / malformed / duplicates; partial honesty; same-request retry replays without a second model call; concurrent submits cannot overspend; persistence across restart; rollover. |
| S4 | `POST/GET /api/discovery/cards` route handler | HTTP contract used by the UI card | strict bounded input validation, no caller-chosen identity, cross-origin refusal, size limits, status codes/DTO, signed-guest cookie, admission limit. |
| S5 | Legacy `POST /api/ai/cards/generate` | Existing endpoint that used to return template cards as "fresh" | It no longer returns template/fallback cards as AI output and does not charge failed generation. |

Real-runtime check (not a unit seam): `run-fresh-cards-runtime.py` drives the real
`next start` production server → supabase-js → test-only REST shim → real local
PostgreSQL 17, with a labelled MOCK OpenAI-compatible upstream, including Next
server restart and replay. It is NOT live-AI evidence.
