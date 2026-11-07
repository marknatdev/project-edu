# Discovery UI integration — seams under test (card t_ea82b33e)

The worker runs headless (no live user to confirm), so the seams were fixed up front from the
approved contract (`docs/specs/personalized-discovery-and-def01.md` §1–8, Deliverable B), ADR 0002
(Amendment), `CONTEXT.md`, the parent mockup `docs/mockups/personalized-discovery.html` and the
fresh-card API handoff (`fresh-cards/FRESH-CARDS-REPORT.md`). No test reaches inside these seams.

| # | Seam (public interface) | Why it is a seam | Behaviour verified there |
|---|---|---|---|
| D1 | `nextInterestQuestion(answers, known)` / `interestSummaryDraft(answers)` in `src/lib/discovery/interest-interview.ts` | The adaptive Thai interest chat is a product rule (2–4 one-at-a-time questions, “ยังไม่รู้” guidance, no repeated constraints, no PII questions) | first question; follow-up adapts to the previous answer; “ยังไม่รู้” yields a guiding question with near-life choices (never a catalog subject pick); finishes after 2 confident answers, after 3 when the last is confident, always by 4; no question asks about grade/budget/time/equipment/team/skills/name/school. |
| D2 | Discovery session reducer + request builder + local persistence in `src/lib/discovery/fresh-session.ts` (`discoveryReducer`, `buildFreshCardsRequest`, `loadDiscoverySession`, `saveDiscoverySession`) | Owns every UI state transition that the contract constrains: what is sent, what is kept, what is resumed | request carries interview constraints (ids → Thai labels, clamped to API limits) + answers + editable summary; validates against `FreshCardsRequestSchema`; refinement uses likes/skips/typed text and all seen ids; one skip never removes other cards of that subject; responses: ok (cards appended, replay de-duplicated, partial count honest), pending/rate-limited/network (same requestId + byte-identical body kept for retry), unavailable/failed/conflict (pending cleared → next retry gets a new id), quota exhausted; previous cards/answers always kept; shortlist ≤5, compare = 2, undo within batch; restart interview keeps cards and quota; persistence round-trip for refresh resume, corrupt data rejected safely. |
| D3 | `requestFreshCards()` / `fetchCardQuota()` in `src/lib/discovery/fresh-client.ts` | The only browser path to `/api/discovery/cards` | maps HTTP statuses to the response union, never fabricates cards; non-JSON / network errors become a truthful retryable failure that keeps the same intent; invalid card payloads are not accepted as success. |
| D4 | `coachingOperation(store, {action:'open', context})` in `src/lib/advisor/coaching-store.server.ts` (B1 per-topic coaching) | Where a selected generated card enters coaching | the first server turn for a generated (`fresh_…`, non-catalog) card is built from that card's actual problem + rough direction + interest link; topics stay isolated per `card:<id>` key; tier gates unchanged. |
| D5 | Legacy client `fetchAiGeneratedCards()` in `src/lib/discovery/ai-cards.ts` | Spec §8: no misleading “verified” claim | no `verified` badge flag on returned cards. |

Real-runtime check (not a unit seam): `run-discovery-ui-browser.py` drives real headless Chrome
against the real `next start` production server → supabase-js → test-only REST shim → real local
PostgreSQL 17, with a **labelled MOCK** OpenAI-compatible upstream for card generation. It is NOT
live-AI evidence.
