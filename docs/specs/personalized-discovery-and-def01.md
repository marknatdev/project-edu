# Personalized Discovery + DEF-01 — approved implementation scope

Status: user approved both A (interactive mockup) and B (real app + DEF-01) via clarify Q13: “A และ B”. The later production-release request also authorizes push/deploy and Google OAuth after verification: see `production-release.md` for expanded scope, exact cloud targets and release gates. Implementation workers still must not commit/push; final publication is a separate gated task. DEF-02–DEF-05 remain outside individual Discovery/DEF-01 cards, but are covered by the release-repairs task.

## Sources and precedence
- The user's Q1–Q5 and Q6–Q13 decisions, captured in `docs/adr/0002-socratic-advisor-first-ai-pedagogy.md` and `CONTEXT.md`, supersede seed-first Discovery and the old “phenomena only” card content rule.
- Existing Theme A+B/mobile UX reference: `docs/mockups/interactive-prototype.html`. Preserve it; create the new mockup separately.
- Baseline: whole-build review `REVIEW.md` is REJECTED. Do not overwrite it or claim the whole app is approved merely because this scope passes.

## Product contract
1. Start Discovery with a short adaptive Thai conversation, 2–4 questions, one at a time, about what the learner wants to work on. Reuse known grade, goal, budget, time, equipment, team and skills; do not ask for real name/school or repeat constraints already supplied. A learner may say “ยังไม่รู้”; guide them toward an interest through choices/questions rather than silently showing the fixed catalog.
2. Generate 5 personalized starter-idea cards from their answers and constraints. Each contains a title, problem and rough experimental direction. These are not finished projects, research findings, proven-safe experiments or verified-original ideas. The learner selects, adapts, and explains their own idea through coaching afterward.
3. This replaces the initial 90-card deck as the default. Preserve the seed data/tests for now, but do not use catalog/templates as a disguised successful AI response.
4. Persist the interest conversation, generated-card snapshots and selection for refresh/resume. A generated card must resolve and be passed into coaching even though its id is not in `TOPIC_CARDS`.
5. Subsequent batches are 5 cards, informed by likes/skips and optional typed refinement. One skip does not exclude a whole subject. Avoid repetition of already seen ideas, not just duplicate ids. Keep budget/time/safety advisory context visible.
6. Quota: first 5 successful cards free per anonymous learner per Bangkok calendar day; then 30 extra successful cards per day. Changing topics/restarting the interview does not renew the free allowance. Only accepted successful unique cards count. Errors, gateway fallback, malformed results and duplicates must not be charged. Concurrent/double-submit requests must not overspend; idempotent retry must not issue/charge the same batch twice. If only some candidates pass, preserve accepted work and charge only those; do not fill with fake templates. Tell the UI the real accepted count/remaining allowance.
7. When AI is unconfigured, unreachable, timed out or output unusable: show a truthful Thai generation-unavailable error with retry; retain answers and previously generated cards. Do not pretend deterministic templates are fresh generation. Other app features may keep their documented offline fallback.
8. The card source must be truthful. Remove misleading “verified” badges; safety keyword screening is preliminary, never proof of safety, and fresh generation is not proof of academic novelty. Keep non-blocking Safety Flags and separate Prior Work evaluation.

## DEF-01 coaching contract
- Reject unsigned client-authoritative `state` and other fake unlock assertions. Zod shape validation alone is not authorization.
- Before Tier 3: a real Tier-1 question must have been issued, the learner has submitted a non-empty response (including “ยังคิดไม่ออก”; no correctness/minimum-length assessment), a Tier-2 hint has been issued, then the learner explicitly requests Tier 3. Tier 1 being present in `unlockedTiers` by default is not evidence it happened.
- Separate stable conversations per learner/topic. No anonymousId:default cross-topic bleed. Starting a new topic/conversation resets gates; returning to the same conversation resumes history and progress across page reload/browser reopening AND app server restart. Explicit start-new and wipe clear local conversation state appropriately.
- Client history/offline replies may be retained as drafts/history, but are not proof of server-verified tier progression. Online recovery should explain what still needs verification; do not silently lose learner text.
- Fix the `{turn: ...}` API/client DTO mismatch and reducer hydration so the real server result/card context is actually used. Keep shared client types/prompts separate from server-only persistence/signing as needed.
- Choose the smallest robust persistence design (e.g. server-signed resumable checkpoints stored locally, or durable server storage with explicit deletion). Document tradeoffs, restart requirements, key/storage setup and limits; never fall back to trusting unsigned client state or ephemeral keys while claiming restart persistence. No existing secret/credential files may be read, printed, changed or committed. Configure/document any new dedicated runtime key safely, outside the bundle and git.
- Tier-3 chosen angles still require explanation in the learner's own words before proceeding.

## Deliverable A: interactive UI mockup
- New standalone `docs/mockups/personalized-discovery.html`, preserving the legacy mockup.
- Thai Theme A+B, mobile-first (320/360/390px) + desktop: interest chat → editable interest summary → loading → swipeable card deck → shortlist/compare/selected-card coaching handoff, refine/regenerate, quota, saved/resume and error states.
- All fixture/sample responses MUST have a prominent persistent “ข้อมูลจำลองเพื่อทดลอง UI — ไม่ได้เรียก AI จริง” disclosure. No API keys or claim of real fresh AI generation in the standalone demo. Simulate unavailable state explicitly, not a real API call.
- Exercise interactions with a real browser, capture representative screenshots under `docs/verification/personalized-discovery/mockup/` and save a concise factual verification report.

## Deliverable B: real app + regression tests
- Tests for API request/response schemas, successful personalization from interest+constraints, no seed-first default, card persistence/handoff and coaching hydration, truthful unavailable behavior, dedupe/idempotency/concurrency quota, date reset/free allowance/topic switches, tampered-state rejection, first-turn Tier-3 attempts, valid Tier-1-answer → Tier-2 → explicit Tier-3 sequence, per-topic isolation, reload/server-restart resume, offline history not granting unlocks, and wipe/reset.
- Browser-test the production app at 360px and desktop. Use real live generation if safely configured; otherwise report live-AI unavailable honestly and use explicitly labeled intercepted/mocked responses for automated happy-path tests, never present those as real upstream evidence.
- Required commands: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`. Preserve unrelated work, no broad refactors/dependency upgrades.
- Record exact commands/results and test counts, real-vs-mocked browser coverage, screenshots and blockers in `docs/verification/personalized-discovery/`.

## Workflow / boundaries
Build A → DEF-01 → fresh-card service/quota → real Discovery UI integration → scoped independent review. Serial workers on the same workspace to avoid edit/build races. All workers use GPT-6.1-sol/openai-codex. No git commit/push, no deployment, no fixing other defects unasked. Preserve the user's existing uncommitted doc changes. Do not close future cards merely because this card is done. Stop/mark blocked on a genuine unmet prerequisite rather than inventing results.
