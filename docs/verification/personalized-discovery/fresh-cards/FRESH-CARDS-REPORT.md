# Fresh-card API + durable batch quota: verification report (card t_b16ea6da)

Status: implemented and verified at the code level and on a real production-mode
runtime against a local Postgres. **No live AI was called.** Every upstream model
response in the tests and in the runtime harness came from a **labelled MOCK**.
Nothing was committed, staged, pushed or deployed. HEAD is still detached at
`880e3a30a62e5fd61791bb3e7bab4025afdc2a30`. `REVIEW.md` and the user's uncommitted
spec, ADR and CONTEXT documents were not touched.

## What was built
| Area | Files |
|---|---|
| Strict upstream call that never returns fallback data. `callAiGateway` (coaching, evaluation, pivot, proposal) keeps its offline fallback and now uses the strict call internally. Logs carry only reason codes and HTTP status: no prompt, model output, upstream body or key. | `src/lib/ai/gateway.ts` |
| Client-safe API contract: bounded request schema, response union, Thai notice | `src/lib/discovery/fresh-contract.ts` |
| Prompt and output contract: learner text passed as JSON data, contact details redacted, valid subfield ids only, per-candidate validation, rejection of reference/novelty/safety claims | `src/lib/discovery/fresh-prompt.ts` |
| Conservative semantic-repeat check (Thai character bigrams with template words stripped) | `src/lib/discovery/fresh-dedupe.ts` |
| Domain service: reserve → model → screen → atomic charge of accepted cards only | `src/lib/discovery/fresh-cards.server.ts` |
| HTTP route: `POST` / `GET /api/discovery/cards` | `src/app/api/discovery/cards/route.ts` |
| Optional `starter` metadata on `TopicCard` (catalog cards are unaffected) | `src/types/domain.ts`, `src/lib/schemas.ts` |
| Admission kind `cards` (6 per owner per minute, 60 global per minute), checked before any model call | `supabase/migrations/202611060004_card_generation_admission.sql` (additive; replaces only `edu_rate_admission`), `sqlite-store.server.ts`, `contracts.ts` |
| Legacy `/api/ai/cards/generate` (dev only; production is still gated) no longer returns template cards as AI output and charges only cards the model actually returned | `src/app/api/ai/cards/generate/route.ts` |
| Apply note for the publication owner: migrations ALL FOUR | `docs/verification/production-release/foundation-contracts.md` (one sentence) |

The seed catalog (`TOPIC_CARDS`, 90 cards) is unchanged and is never used as fresh output.

## API contract (for the UI card t_ea82b33e)
`POST /api/discovery/cards` takes a strict JSON body of at most 16 KB. **Identity never goes in the body.** The owner comes from the verified account session, or else from the signed HttpOnly Guest capability.
```
{ requestId: uuid,               // ONE intent. Network retry / double tap / reload MUST resend the SAME body + id.
  count?: 1..5 (default 5),      //   A user-initiated retry after a failure uses a NEW id.
  learner: { gradeLevel, goal?, constraints: { timeWeeks 1..104, budgetBaht 0..200000, equipment[<=15 x <=60], teamSize 1..10, skills[<=15 x <=60] } },
  interest: { answers: [{question<=200, answer<=500}] 1..4  ("ยังไม่รู้" is valid), summary?<=600 },
  refinement?: { text?<=300, likedCardIds[<=20], skippedCardIds[<=40] },
  seenCardIds?: [<=100] }        // ids: [A-Za-z0-9_-]{1,120}; resolved ONLY against this owner's own ledger
```
The intent fingerprint covers the whole canonical body except `requestId`, so a retry must resend a byte-equivalent body. Responses always carry `Cache-Control: no-store`.

| HTTP | `status` | Meaning / UI action |
|---|---|---|
| 200 | `ok` | `cards` = accepted starter snapshots (`id` `fresh_<uuid>`, `starter.{problem, roughDirection, interestLink, fitNotes, safetyScreen:'preliminary', noveltyChecked:false}`, plus `estimatedWeeks/Budget/equipment/team/skills` for fit), `accepted`, `requested` (null on replay), `partial`, `rejected{invalid, unsupportedClaims, repeats}` (null on replay), `replayed`, real `quota`, `noticeTh` |
| 202 | `pending` | The same intent is already generating. Do not resend in a tight loop: polls count against admission. `leaseExpiresAt` is included. |
| 503 | `unavailable` | `code` is AI_UNCONFIGURED, AI_UNAVAILABLE, AI_TIMEOUT or AI_OUTPUT_UNUSABLE. The Thai message says answers and cards are kept and no quota was used. `retryable` is true; retry with a **new** id. |
| 429 | `quota_exhausted` | 35 accepted cards today (Bangkok day), or the remaining allowance is reserved by another in-flight request. No model call was made. |
| 429 | `rate_limited` | Admission limit reached. Wait about a minute. |
| 409 | `failed_intent` | This id already failed. Send a new id (`retryWithNewRequestId`). |
| 409 | `conflict` | This id was used before with a different body. |
| 400 / 403 / 413 / 401 | — | Invalid input (field paths only, no values echoed) / cross-site / body too large / unverifiable Guest capability (cookie cleared) |

`GET /api/discovery/cards` returns `{ quota: { day, used, reserved, remaining, freeRemaining, extraRemaining, resetAt } }` and never generates or charges.

## Decisions (made headless; recorded in `SEAMS.md`)
- **Quota.** I reused the foundation batch ledger as-is. The free tier and the extra tier are one per-owner, per-Bangkok-day counter (35 = 5 free + 30 extra), split for display as `freeRemaining` / `extraRemaining`. The counter does not depend on topic or interview. Quota is reserved before the model call, and only accepted unique cards are charged.
- **Smaller remaining allowance.** When fewer than 5 cards remain, the service reserves `min(count, remaining)`. A retry of the same id probes downward to find the capacity recorded at the first reservation: a 409 means a different capacity or intent, a 429 means not enough allowance.
- **Semantic repeats.** A card is a repeat if title Dice ≥ 0.8, or title ≥ 0.6 and problem ≥ 0.4. Calibrated on Thai paraphrases: the same idea scored 1.0/0.81, different ideas ≤ 0.05/0.26. Each card is compared against this owner's whole accepted ledger (up to 1000 cards) and against earlier cards in the same batch. The store still catches exact repeats atomically.
- **Unsupported claims.** A candidate that contains URLs, DOIs, citations, reference-like keys, novelty claims or "proven safe" claims is rejected whole and never edited into shape. Rejected and invalid candidates cost nothing, and the service never fills a batch with templates.
- **Safety.** Categories come from the keyword screener combined with the model's hints. They are labelled `preliminary`, are non-blocking, and are never presented as proof of safety.

## Evidence (exact outputs in this folder)
Test-first record, with honest notes on which slices were not truly red:
| Slice | Red | Green |
|---|---|---|
| S1 strict gateway | `red-01` (8 failed) | `green-01` (33 passed, incl. existing gateway tests) |
| S2 dedupe | `red-02` (module missing) | `green-02` (6) |
| S3 personalization | `red-03` (module missing) | `green-03` (2) |
| S3 unavailable / no charge | `red-04` (5 failed) | `green-04` (7). The mock fetch fixture also had to start honouring `AbortSignal`. |
| S3 bad output / partial | `red-05` (1 failed) | `green-05` (9) |
| S3 repeats + context | `red-06` (2 failed). The contact-redaction test passed on first run: its implementation arrived with the prompt module. | `green-06` (12) |
| S3 idempotency / concurrency | `red-07` (5 failed) | `green-07` (17) |
| S3 allowance / rollover / restart | `quota-08`. First failures were caused by the fixture: repeat screening rejected near-identical sample cards. Fixed with synthetic distinct samples; **no production change was needed**, because the foundation store already enforced these rules. | 22 |
| S3 on real PostgreSQL 17 | `postgres-09`, `postgres-10` passed on first run. They characterize the cloud adapter: jsonb round-trip, real DB restart replay, cross-connection double submit, failures not charged, and the production route with a signed guest through the supabase-js transport. | 4 |
| S4 route | `red-10` (route missing) | `green-10` (14). Plus `coaching-handoff-12` (15): a generated card is accepted as coaching context with `starter` intact. That test passed on first run. |
| S5 legacy route | `red-11` (2 failed) | `green-11` (26). One old test that asserted fabricated fallback cards was rewritten to assert a truthful 503. |

**Runtime** (`run-fresh-cards-runtime.py` → `runtime-results.json`, `runtime-output.txt`): **26/26 PASS**.
- Stack: real `next start` (production) → supabase-js → test-only `def01-cloud/rest-shim.mjs` → a real local PostgreSQL 17 running all 4 repository migrations. MOCK upstream: 12 mock calls in total.
- Covered: 5 personalized cards, with the prompt carrying the learner's answer and constraints and the bearer key sent only server-side; replay with no model call; 409 conflict; partial acceptance (2 accepted; rejections invalid 1, unsupportedClaims 2, repeats 1); 502 and malformed output both returned as 503 with no charge; failed-intent 409; admission 429 before any model call; 5 concurrent submits giving one model call (one 200 and four 202) and one charge; validation 400/403/413/401.
- Restarts: after a **Next restart** the admission window persisted, replay returned identical cards, and the counter was unchanged. After a **DB + Next restart**, replay was still identical.
- Allowance: 7 topic switches reached 35, then the 36th card got 429 with no model call. With AI unconfigured the route returned 503 AI_UNCONFIGURED and coaching still served its labelled offline fallback.
- Logs: server logs contained no learner text and none of the synthetic keys.

**Final gates** (normal environment, after the harness build), from `final-exit-codes.txt`:
- `npm run test` exit 0: **52 files, 437 tests** (pre-change baseline: 46 files, 379 tests)
- `npm run lint` exit 0
- `npm run typecheck` exit 0
- `npm run build` exit 0: 17/17 pages, including `ƒ /api/discovery/cards`
- `git diff --check` exit 0

New untracked files were checked separately for trailing whitespace: none.

## Real vs mocked
- **Real:** route handlers, `next start` production server, signed Guest capability, supabase-js client, PostgreSQL 17 running the repository's SQL (local, test-owned), SQLite local adapter, process and database restarts, concurrency.
- **Mocked or simulated:** the AI upstream (hand-written sample JSON, labelled MOCK, never model output); the PostgREST hop (test-only shim); synthetic per-run keys.
- **Not verified:** live AI generation quality and personalization, hosted Supabase PostgREST/JWT/RLS, migration 0004 on the hosted project, Vercel runtime, Google OAuth accounts.

## Residual risks and notes for the next cards
- Clearing the Guest cookie, an explicit wipe (the foundation deletes quota rows by design), or a new account all start a fresh allowance. This is inherent to anonymous use. Only the global admission ceiling (60 per minute) bounds rotation.
- Repeat screening is a heuristic. Two *concurrent* batches from one owner can produce semantic near-repeats of each other; exact repeats are still blocked atomically.
- The claim filter is conservative and may reject benign text containing words such as "อ้างอิง". Rejected candidates cost nothing.
- The model timeout is 45 s and the lease defaults to 120 s (60 s minimum in production). If the model outlives the lease, the store releases the reservation, the late result is fenced off, and the learner sees AI_TIMEOUT. Nothing is charged.
- Left for the UI card (out of scope here): the Discovery page still calls the legacy endpoint and shows the legacy "verified" badge in `src/lib/discovery/ai-cards.ts`, plus the toast "ผ่านการตรวจสอบความปลอดภัย". The UI card must switch to `/api/discovery/cards`, remove those claims, persist the exact request body per `requestId` for retries, and poll `pending` slowly.
