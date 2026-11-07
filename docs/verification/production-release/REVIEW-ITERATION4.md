# Remediation re-review (Iteration 4)

CODE STATUS: APPROVED (independent re-review round 3, 2026-11-07)
LIVE STATUS: PENDING — hosted migrations, Google OAuth, live AI and deployment are verified separately.

Supersedes the code verdict in `REVIEW.md` (Iteration 3, REJECTED for D1–D4). Live lanes in that file stay pending until their own evidence exists.

## Rounds
| Round | Verdict | Blocking findings |
|---|---|---|
| 1 | REJECTED | D1–D4 fixed; new: H1 proposal creation resurrects erased idea after wipe (reproduced in Chrome), M1 judge answers, M2 drafts lost on workspace switch, M3 wipe resets daily AI quota, L1–L3 |
| 2 | REJECTED | All round-1 items fixed; M2 fix regressed: unedited editor flush overwrote another tab's newer save (reproduced); late re-wipe in thawed tabs |
| 3 | APPROVED | None Critical/High. Both round-2 items verified in StrictMode + two-tab Chrome probes |

## Fix summary
- Opaque UUID wipe generations shared by Guest/account storage; every async-after-await writer (evaluation, pivot, notes, project create/update, learner, interview, judge) refuses a stale generation. Shared `useWipeInvalidation()` hook.
- Server: evaluate/proposal routes recheck owner generation after awaited work → 410 without data; pivot keeps CAS.
- Wipe keeps only today's numeric quota counters for accounts (SQLite + `202611060002_card_quota.sql`); guests are revoked.
- ProposalEditor save loop removed; workspace-change flush saves only dirty drafts and vetoes when the stored copy changed elsewhere.
- FreshDiscovery quota reads serialized, queued boundary refresh, bounded re-reads (+2/+4/+8 s).
- Zod 3.25.76 → 4.6.7.

## Local evidence (final tree)
- `npm run test`: 68 files, 549 tests passed. `typecheck`, `lint`, `build`: exit 0.
- `node tests/browser/privacy-generation.browser.mjs`, `node tests/browser/proposal-discovery.browser.mjs`: exit 0, no errors.
- `npm audit --omit=dev`: 0 vulnerabilities. Full audit: 6 moderate (dev-only minimatch via @typescript-eslint 8.72.1; fix needs minimatch 11, not yet supported upstream — accepted dev-only risk).

## Accepted non-blocking (Low)
- Thawed tab whose timer write precedes a late wipe notice can still re-wipe device-wide.
- Other-tab workspace switch drops unsaved drafts in judge/notes/BOM/interview editors.
- Wipe is device-wide (also clears the Guest local workspace).
- Test gap: save-then-edit and plan-modal veto are probe-verified, not in the fixture.
