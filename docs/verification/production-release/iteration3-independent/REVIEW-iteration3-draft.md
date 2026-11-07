# Independent Whole-App Production-Release Review (Iteration 3)

STATUS: REJECTED
CODE STATUS: REJECTED

**Iteration:** 3 of 3 (Loop Cap reached — final whole-app review iteration).

| Verification Lane | Status |
|---|---|
| Application Release Code | **REJECTED** — Reproducible privacy/wipe data-resurrection defects (D1, D2), transient session unmount data-loss (D3), and quota-reset race (D4) |
| Security Audit (Zod & Minimatch) | **BLOCKED / REQUIRES USER RISK DECISION** — 1 HIGH (GHSA-mrhx-c7xc-m3w5) + 6 MODERATE; no compatible in-major patches exist |
| LIVE DEPLOYMENT | **PENDING / NOT VERIFIED** — No deployment performed by this reviewer |
| GOOGLE OAUTH | **PENDING / NOT VERIFIED LIVE** — Local PKCE/callback/session routes tested with synthetic auth only; live interactive Google OAuth is not verified |
| AI UPSTREAM | **PENDING / NOT VERIFIED LIVE** — All browser and integration suites used labelled mock/synthetic fixtures; live upstream AI not exercised |
| Hosted Supabase Migrations & RLS | **PENDING / NOT VERIFIED HOSTED** — Disposable local PostgreSQL 17 verified; hosted Supabase database and 2-identity RLS not exercised |

**Publication Decision:** **DO NOT COMMIT, PUSH, OR DEPLOY.** Publisher tasks `t_79868881` and `t_395cc319` must remain explicitly blocked. The working tree cannot be approved for release. Because the 3-iteration review loop cap has been reached, these findings are escalated directly to `@user` rather than auto-decomposing into another endless worker cycle.

---

## 1. Scope, Independence & Revision State

- **Baseline Commit (Fixed Point):** Detached HEAD `880e3a30a62e5fd61791bb3e7bab4025afdc2a30` (`docs(review): final review M1–M5`).
- **Remote Divergence:** 17 commits ahead of `origin/main` (commit `48cc22b39d18205f23adfacdd64040ae0660bb20`), 0 commits behind.
- **Working Tree Scope:** 53 tracked modified files, 88 new source/test/SQL files (317 total publishable files). 34 source/test files were modified during iteration-3 remediation.
- **Scope Manifest:** `docs/verification/production-release/iteration3-independent/scope-start.json` (SHA-256 verified at start). Re-hashed at completion with **0 drift / 0 mismatches** (`scope-end-drift.json`).
- **Prior Reviews Preserved:**
  - Iteration 1 whole-build review: `REVIEW.md` (root, SHA-256 `387653b158f17b41aabffd33b5de4d7fef8e5663d71484b5b9a19a5ba49d3d9d`).
  - Iteration 2 release review: `docs/verification/production-release/REVIEW-iteration2.md` and `iteration3-independent/REVIEW-iteration2-preserved.md` (SHA-256 `111b90beb03e54bd08ae4d19d53f1ec669972eab5bd3ab0d9c45c5575539b28a`).
  - Iteration 2 evidence files: 90 files preserved and hashed in `iteration2-evidence-hashes.json`.
- **Publication Exclusions Established & Verified:**
  - Runtime logs, test scratch data, and browser profiles (`.local/`, `.next/`, `node_modules/`) are verified ignored via `git check-ignore`.
  - Ephemeral browser artifacts, test downloads, and screenshots in `review-remediation/` and `iteration3-independent/` are excluded from release.
  - `.env.example` scanned and verified placeholder-only (no live secrets or connection strings).
  - No secret scanning was performed on `.env` or credentials. Secret scan over 264 publishable text files returned 0 matches using bounded regexes (`secret-scan.json`). Note: native gitleaks and trufflehog are unavailable on this host; no entropy or Git history scan was performed.

---

## 2. Independent Verification Commands & Test Matrix

All checks were executed independently in `D:/millmaker/EdTech` with ports and processes verified:

| Check | Command | Exit Code | Result / Details |
|---|---|:---:|---|
| Working Tree Hygiene | `git diff --check` | 0 | Clean. No whitespace errors or conflict markers. |
| Test Suite | `npm test` (`vitest run`) | 0 | **64 test files passed, 513/513 tests passed** (duration: 38.9s). |
| Static Analysis | `npm run lint` (`eslint .`) | 0 | Clean. 0 errors, 0 warnings. |
| Type Check | `npm run typecheck` (`tsc --noEmit`) | 0 | Clean. 0 TypeScript errors. |
| Production Build | `npm run build` (`next build`) | 0 | Clean. All 17 static and dynamic routes compiled successfully. |
| Native Dependency Audit | `npm audit --json` | 1 | **1 HIGH + 6 MODERATE** vulnerabilities. |
| Lockfile Audit | `npm audit --package-lock-only --json` | 1 | Identical 1 HIGH + 6 MODERATE vulnerabilities. |
| Process & Port Cleanup | Socket connect probe | 0 | All test ports (3043, 55553, 55554, 55555, 3021, 55493, 55494, 55495) confirmed **CLOSED**. |

---

## 3. Iteration-2 Repairs Verified

The remediation applied in task `t_3f87cb57` was independently verified:
1. **Discovery Wipe & Queued Responses:** Handled via epoch and abort controllers in Discovery (`green-wipe.txt` 14/14, `green-wipe-queued.txt` 2/2).
2. **Semantic Acceptance CAS (SPEC-1):** Tested in `tests/integration/semantic-acceptance.test.ts` on both SQLite and local PostgreSQL 17; concurrent identical requests charged only once.
3. **Topic Routing & Resume:** Verified in `green-routing.txt` (13/13).
4. **Bounded HTTP Stream Admission (STD-3):** Verified in `tests/integration/streaming-limits.test.ts` (14/14). Oversized chunk streams cancel before buffering.
5. **Guest vs Account Provenance Isolation (SPEC-3):** Verified in `tests/integration/workspace-boundary.test.ts` (5/5) and `green-import-browser.txt` (17/17). Explicit continuation avoids automatic local-to-cloud copying.
6. **Quota Reset Recovery:** Verified in `green-quota.txt` (11/11).

---

## 4. Actionable Defects Found & Reproduced (Iteration 3)

Four adversarial probes were executed using real headless Chrome 156, the production Next.js server, and disposable local PostgreSQL 17. All four reproduced concrete defects:

### Defect 1 (HIGH — STD-1 & SPEC-2 Extension): Evaluation Late-Response Resurrects Erased Data
- **Location:** `src/app/evaluation/page.tsx:63–86` (`performEvaluation`) and `src/app/api/ai/evaluate/route.ts:66–71`.
- **Defect Description:** The wipe invalidation listeners added in iteration 3 only fence Discovery and Coaching. In Evaluation, when a learner initiates an evaluation and then wipes all data in a second tab (at `/consent`), the outstanding `/api/ai/evaluate` response completes with status 200. Upon arrival, `performEvaluation()` calls `saveEvaluation(result.evaluation)` unconditionally without checking whether the learner, project, or idea was wiped. `saveEvaluation()` invokes `saveState()`, which re-creates `edtech:state` with default values and injects the evaluation for the erased idea!
- **Reproduction Evidence:** `docs/verification/production-release/iteration3-independent/evaluation-wipe/reproduction.json`.
  - Initial wipe in Tab 2 confirmed: `localStorage.getItem("edtech:state") === null` (`deletedInitially: true`).
  - Late response received: status 200.
  - Final local storage: `edtech:state` resurrected with `evaluations: [{ id: "eval_...", ideaId: "privacy-probe-idea", ... }]` while all other state remains empty.
- **Server Seam:** `src/app/api/ai/evaluate/route.ts` lacks a post-model generation/lease check to verify owner validity before returning output.

### Defect 2 (HIGH — STD-1 & SPEC-2 Extension): Mounted TCAS/Pitch Notes Editor Restores Erased Notes
- **Location:** `src/components/presentation/ProjectDeliverables.tsx:16–24`, `PresentationNotesEditor.tsx:21–25`, and `src/lib/presentation/notes-store.ts:12–14`.
- **Defect Description:** When a student enters personal notes (roles, skills, learning) under the TCAS/Pitch tabs, the notes are saved to `edtech:presentation:<projectId>`. If data is wiped across tabs, the keys are deleted. However, the mounted `ProjectDeliverables` editor retains its in-memory draft. If the student clicks "Save", `savePresentationNotes()` writes the entire draft back into `localStorage` without verifying whether the underlying project or learner still exists. Erased personal notes are restored.
- **Reproduction Evidence:** `docs/verification/production-release/iteration3-independent/notes-wipe/reproduction.json`.
  - Pre-wipe notes stored: `edtech:presentation:<proj-id>`.
  - Cross-tab wipe confirmed: all presentation keys deleted (`deletedInitially: true`).
  - Save re-clicked: identical presentation keys and personal text restored (`before == after`).

### Defect 3 (MEDIUM — SPEC-3 Data Loss): Transient Session Failure Destroys Unsaved Drafts
- **Location:** `src/components/auth/WorkspaceBoundary.tsx:28–31` and `src/components/proposal/ProposalEditor.tsx`.
- **Defect Description:** When `/auth/session` fails transiently (network glitch, offline transition, or temporary service interruption), `WorkspaceBoundary` catches `AUTH_UNAVAILABLE`, sets `session = null`, and replaces the entire view with an error banner (`ตรวจสอบบัญชีไม่ได้...`). This immediately unmounts the child components without triggering a preservation save or warning, destroying any uncommitted user input (e.g., in `ProposalEditor` or `WeeklyPlanEditor`).
- **Reproduction Evidence:** `docs/verification/production-release/iteration3-independent/session-draft/reproduction.json`.
  - User typed proposal title draft: `"ร่างยังไม่บันทึกต้องไม่หายเมื่อ auth ตรวจสอบไม่ได้"`.
  - Transient session failure simulated. Children unmounted.
  - Upon connection recovery and reload: draft is lost; title reverts to old saved value (`savedTitleAfterFailure != draft`).

### Defect 4 (LOW — Timing / Quota UX): Focus Refresh Before Reset Drops Post-Reset Enablement
- **Location:** `src/components/discovery/FreshDiscovery.tsx:284–287`.
- **Defect Description:** If a user switches away and back to the window shortly before their daily card quota reset timestamp, a `focus` event triggers an early quota check. Because the timer is reset or the component relies on the focus check, after the actual reset timestamp has elapsed, the button remains disabled until a subsequent manual interaction.
- **Reproduction Evidence:** `docs/verification/production-release/iteration3-independent/quota-race/reproduction.json`.
  - Quota reads: 2.
  - Button disabled: `true` even when `elapsedPastResetMs: 1516` (>1.5s past daily reset).

---

## 5. Security Audit Analysis & Migration Review

### Dependency Vulnerabilities
`npm audit` reports **1 HIGH + 6 MODERATE** vulnerabilities:
1. **HIGH:** `zod` (<4.6.6) — [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) (Memory exhaustion during oversized constrained collection parsing).
   - *Registry Check:* `npm view zod@3 version` confirms version 3.25.76 is the maximum 3.x release. No non-major patch exists. Resolving this requires migrating to Zod 4.6.7, which is a major breaking change prohibited without explicit architectural authorization. While server-side streaming body byte limits (`boundedText`) mitigate request-flood vectors, the vulnerability remains in the audit report.
2. **MODERATE (6x):** `minimatch` (>=7.0.0 <11.0.1) — [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) via `@typescript-eslint/typescript-estree`.
   - *Registry Check:* `minimatch@10` tops out at 10.2.6. Upstream `@typescript-eslint/typescript-estree` still requires `^10.2.2`. Resolving requires minimatch 11+, which also has no non-major backport.

### Database Migrations Review (0001–0006)
- **Migrations 0001–0005:** Additive schemas (`edu_owners`, `edu_records`, `edu_daily_quota`, `edu_rate_windows`) with strict RLS and `service_role` security.
- **Migration 0006 (`202611060006_semantic_acceptance.sql`):** Patches `public.edu_card_operation` by reading `pg_get_functiondef` and string-injecting a count-based CAS check (`p_input->>"ledgerCount"`).
  - *Risk / Assumption:* The CAS logic assumes the ledger is strictly append-only within an owner generation. While verified on local PostgreSQL 17, string-replacement of function definitions is fragile across differing PostgreSQL minor versions on hosted Supabase. Verification on the live hosted database is a mandatory gate.

---

## 6. Recommended Architectural Remediation

To eliminate piecemeal event-listener patches that repeatedly leak across different screens, the following systemic fixes are recommended:

1. **Centralized Wipe Generation Counter in Storage Layer:**
   - In `src/lib/storage/store.ts` and `notes-store.ts`, bind persistent state to an internal `wipeGeneration` integer (stored in `localStorage` under `edtech:meta:generation`).
   - Every read captures the current generation. Every write (`saveState`, `saveEvaluation`, `savePresentationNotes`) must verify that `readGeneration === currentGeneration`. If a wipe occurred in any tab, the generation increments, and any stale in-flight write is rejected.
2. **Post-Model Generation Check on Server Routes:**
   - In `/api/ai/evaluate`, `/api/ai/pivot`, and `/api/ai/proposal`, verify that the owner generation/lease in `edu_owners` has not incremented between model dispatch and response delivery. Return HTTP 410 on mismatch.
3. **Draft Preservation on Auth Interruption:**
   - Modify `WorkspaceBoundary` so that transient `AUTH_UNAVAILABLE` errors display an alert banner without unmounting children, allowing users to continue editing local drafts offline.

---

## 7. Separate Live Verification Gates (All PENDING)

The following live gates remain unverified and must be validated by the publisher:
1. **LIVE Vercel Deployment:** Production deployment to Vercel team `team_glmawLQlxzaWRFiNoQ16yY9G` / project `project-edu` (Node 24, `sin1`).
2. **Interactive Google OAuth:** Real browser redirect, consent, callback, and session refresh against Google Cloud credentials.
3. **Live AI Upstream:** Real model inference through public HTTPS provider without mock fixtures.
4. **Hosted Supabase Migrations & Isolation:** Applying migrations 0001–0006 to hosted project `ppctndzkerwiokjfaklw` and proving row-level security isolation across two distinct identities.
5. **Dependency Risk Decision:** Human sign-off on the unpatched Zod High advisory.

---

## 8. Handoff & Escalation

- **Final Decision:** `STATUS: REJECTED` / `CODE STATUS: REJECTED`.
- **Iteration:** 3 of 3 (Loop Cap reached).
- **Recipient:** `@user` (Escalation report). Publisher tasks `t_79868881` and `t_395cc319` remain blocked.
