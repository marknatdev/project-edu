# Deliverable A — Personalized Discovery mockup verification

**Scope:** `t_9106e10f`, approved specification `docs/specs/personalized-discovery-and-def01.md`, Deliverable A only. Implementation is complete and self-verified; this is **not** approval of Deliverable B or the whole application. The existing `REVIEW.md` remains unchanged and REJECTED.

## Open the deliverable

Open [`../../mockups/personalized-discovery.html`](../../mockups/personalized-discovery.html) directly in Chromium/Edge. It is a standalone Thai document with inline CSS/JavaScript, no network resources, no keys, and no app API calls. It reuses the legacy Theme A+B gradient, indigo/pink/mint tokens, glass panels, and dark-bordered swipe-card treatment. The legacy `interactive-prototype.html` is unchanged.

The sticky disclosure reads **“ข้อมูลจำลองเพื่อทดลอง UI — ไม่ได้เรียก AI จริง”**. Every card is also labeled as a fixed sample, including the comparison and coaching views. The 35 hand-authored fixtures are UI demonstration data, **not freshly generated AI content, verified-original ideas, safe-experiment endorsements, or research findings**.

## Implemented and exercised

- Adaptive Thai interest interview, one question at a time, finishing in 2, 3, or 4 answers. “ยังไม่รู้” gets follow-up choices, not a silently substituted catalog. No real name/school questions; known grade, goal, budget, time, equipment, team and skills are reused from a visibly marked sample profile.
- Editable saved summary → visibly simulated loading → first batch of five fixed-fixture cards. Each has title, problem, rough direction, approximate budget/time, preliminary advisory context, and an explicit source label.
- Mouse drag, touch swipes, arrow keys scoped to the focused card, and equivalent buttons; skip, like, select, current-batch undo; five-card shortlist with remove/empty/full states; two-card comparison; selected snapshot and learner context carried to a **simulated** Tier-1 coaching handoff. Drafts persist but grant no production unlocks.
- Refine text and subsequent five-card requests. Transparent keyword/like/skip ranking of fixed examples; already received IDs/content are excluded. One skip adjusts preference without excluding a whole subject.
- Local simulated Bangkok-calendar-day ledger: first five accepted cards free, then 30 extra. Interview restart does not renew allowance. Full failure/timeout/malformed/duplicate scenarios charge zero; partial success accepts and charges only three. The final request at 33 accepts only two; 35 prevents further acceptance. Explicit “จำลองวันถัดไป” resets the day allowance but preserves seen cards. Exhausting all fixed fixtures is disclosed rather than fabricating more content.
- Interview answers, drafts, card snapshots, shortlist, current deck, selected card, and quota survive refresh. Interrupted loading becomes a truthful uncharged error with retry. Unavailability retains previous work. Storage-denial and malformed/incomplete saved-state warnings remain usable.

## Exact execution results

Commands were run from `D:/millmaker/EdTech`. Raw stdout/stderr is retained alongside this report.

| Command | Result | Evidence |
|---|---|---|
| `node docs/verification/personalized-discovery/check-mockup.mjs` | exit 0; standalone Thai document, disclosure, Bangkok clock, no external resources/API calls, inline JS syntax | `static.log` |
| `python -u docs/verification/personalized-discovery/run-browser.py` | exit 0; **94 checks passed, 0 failed** in real **Chrome/156.0.8078.80** | `browser-run.log`, `mockup/browser-results.json`, `mockup/browser-summary.json` |
| `npm run test` | exit 0; **318 tests in 31 files passed** | `test.log` |
| `npm run lint` | exit 0 | `lint.log` |
| `npm run typecheck` | exit 0 | `typecheck.log` |
| `npm run build` | exit 0; Next.js 15.5.29 compiled and generated 17/17 static pages | `build.log` |
| `node docs/verification/personalized-discovery/verify-preservation.mjs` | exit 0; all pinned hashes, HEAD, index, source/test boundaries and profile cleanup passed | `preservation.log`, `preservation.json` |
| `git diff --check` | exit 0; no whitespace errors in tracked changes | tool execution recorded for this task |

The initial static check was run **before** the mockup existed and failed with `AssertionError [ERR_ASSERTION]: New standalone mockup exists` (exit 1), then passed after implementation. Existing app tests are regression checks, not evidence that the newly approved real-AI or DEF-01 behavior has been implemented. The gateway errors printed by existing unit tests are their explicitly mocked failure cases, not live upstream observations.

## Browser and visual coverage

The final reproducible runner launches an isolated real headless Chrome process, drives DOM/form interactions and native CDP keyboard, mouse and touch events, captures real PNGs, and deletes only its own disposable profile. It uses the already installed `websockets` Python package and installed Chrome; no project dependencies or lockfiles were changed. It does not use intercepted AI responses: **all AI-like output in A is fixed/demo fixture content**.

Layout measurements passed at **320, 360, 390 and 1280px** for chat, summary, shortlist, comparison, handoff, and unavailable states; deck also passed at all mobile widths and desktop. Mobile document `scrollWidth` equaled its requested viewport width; desktop scrollbar content width was 1265 where appropriate. No page-level overflow was hidden as a substitute for layout fixes. The animated card has its own clipped drag viewport. No measured visible interactive target was below 40×40px; controls use minimum 44px height, including primary actions. Focus outline, Tab/Enter, and arrow behavior were exercised. Resource entries and uncaught error collections were empty during the final checks. This is Chromium emulation, not physical-device or screen-reader certification.

**19 actual screenshots** are in `mockup/`; dimensions and SHA-256 hashes are recorded in `screenshot-inventory.json`. Representative captures:

- `mobile-320-chat.png`, `mobile-360-chat.png`, `mobile-390-chat.png`, `desktop-chat.png`
- `mobile-360-summary-four-questions.png`, `mobile-360-summary.png`, `mobile-360-loading.png`
- `mobile-360-deck.png`, `desktop-deck.png`, `mobile-360-drag.png`
- `mobile-360-shortlist.png`, `mobile-360-compare.png`, `desktop-compare.png`
- `mobile-360-coaching.png`
- `mobile-360-unavailable-no-charge.png`, `desktop-unavailable-no-charge.png`
- `mobile-360-partial-three.png`, `mobile-360-quota-exhausted.png`, `desktop-storage-unavailable.png`

Visually inspected the mobile deck, loading and unavailable captures and desktop comparison: Thai text, disclosure, card fields, buttons and advisory blocks are visible without horizontal clipping. Mobile comparison stacks cards; desktop displays them side by side.

### Verification-tool corrections, not product evidence

The original browser helper intermittently stalled `Page.captureScreenshot` after viewport emulation. A blank fallback capture was discarded; the final evidence was recaptured using the isolated direct-CDP runner. An early drag harness scrolled while holding the pointer; it was corrected to preserve scroll during the gesture. Native Windows Enter events were corrected to include the carriage-return character before rerunning the keyboard checks. Final logs contain the complete passing rerun, not fabricated screenshot or AI output.

## Two-axis self-review and regression fixes

Read-only spec and standards audits identified these issues; fixes are included and covered by final browser checks:

| Axis | Finding | Resolution |
|---|---|---|
| Spec | Skip penalty could not affect unseen fixtures | Apply a small tag-level preference penalty without subject exclusion. Browser comparison observed different next batches with/without one skip. |
| Spec | Undo could replace a newer batch with an older deck | Scope undo to current batch and disable cross-batch undo. |
| Standards | Undo could remove an independently saved shortlist item | Record whether the reaction added the entry; undo only its own change. |
| Both | Saving from the Saved view lost keyboard focus | Restore focus to the same card's select action and announce success. |
| Standards | Incomplete local JSON could crash rendering | Normalize/validate consumed collections, IDs, text, cursor and ledger fields; recover with a warning. |

These are self-review inputs, not the later independent acceptance review. The existing serial implementation/review graph remains authoritative.

## Preservation and limitations

- HEAD remains **`880e3a30a62e5fd61791bb3e7bab4025afdc2a30`**, detached. **No checkout/reset/rebase/switch, staging, commit, push or deployment.**
- `src/` and `tests/` have no modified or newly untracked files. No DEF-02–DEF-05 fixes were attempted.
- Byte-level SHA-256 preservation passed for the user's existing `CONTEXT.md`, ADR 0002, approved spec, legacy mockup, `REVIEW.md`, `package.json` and `package-lock.json`. Their original intentional uncommitted state is preserved.
- No existing secret/credential/`.env` files were inspected, printed or changed. No upstream AI endpoint was called by the mockup.
- Demo data is confined to `project-edu-personalized-discovery-demo-v1` and `project-edu-personalized-discovery-demo-quota-v1`. It does not read, migrate, or clear actual app storage. Browser automation uses an isolated disposable profile, not user accounts.
- The local quota demo suppresses double submission within its own UI and uses persisted receipts for interrupted/retry behavior; it is **not a secure multi-tab/multi-device accounting service**. Actual anonymous identity, concurrency, durable server authorization and live AI behavior belong to B.
- The sample learner constraints are fixed and visibly identified; this standalone document is not integrated with the app interview. The handoff is a real saved UI snapshot within the demo, not a live coaching API call. No Tier-2/Tier-3 authorization implementation is claimed.
- Fixed-fixture exhaustion is intentional. A simulated day reset cannot manufacture new fixture content. Clearing browser storage is outside any genuine entitlement enforcement.

## Handoff

Deliverable A is ready as the visual/interaction reference. The next pre-created task is DEF-01, followed by real generation/quota and app integration in the approved serial chain. Do **not** copy these fixed fixtures into a successful production AI response or use demo coaching drafts as verified tier progress. Preserve the later scoped independent review and user approval gates; the application is not declared release-ready.
