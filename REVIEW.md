# Final Review (M1–M5 Whole Build) — Project Edu

STATUS: REJECTED

## Executive Summary
Independent read-only audit of the entire build (M1–M5, commit `48cc22b39d18205f23adfacdd64040ae0660bb20` since baseline `fe49613`) against `PLAN.md`, `CONTEXT.md`, `docs/design-brief.md`, `docs/adr/0001-ai-provider-via-openai-compatible-gateway.md`, and `docs/adr/0002-socratic-advisor-first-ai-pedagogy.md`.

The codebase displays exceptional architectural craftsmanship, rigorous typing, 100% test pass rate across 318 unit tests, comprehensive offline fallbacks, zero bundle secret leakage, robust Zero-PII protection, and fully responsive mobile layouts (360px viewport with no horizontal overflow and ≥40px touch targets).

However, **5 defects** were identified and reproduced against the live running application, including **2 critical pedagogical gate bypasses (ADR 0002)** where unverified client state enables students to bypass Tier 1 and Tier 2 Socratic scaffolding to receive Tier 3 idea examples immediately, a **quota collision** where Socratic Pivot consumes proposal quota and locks students out of Proposal generation, and a **shared quota Denial-of-Service** where all guest users share hardcoded session IDs. Consequently, the build cannot be approved for Gate 3 until these defects are remediated by `@builder`.

---

## 1. Verification Commands & Test Matrix

All commands were executed independently both in the workspace `D:/millmaker/EdTech` and in an isolated clean clone (`/tmp/edtech-clean-test`):

| Check | Command | Exit Code | Result / Output |
|---|---|---|---|
| Fresh Install | `npm ci` | 0 | 440 packages audited, clean install (resolved initial file lock on `next-swc` from orphaned PID 26748) |
| Clean Clone Install | `git clone ... && npm ci` | 0 | 440 packages audited in fresh temp directory |
| TypeScript Check | `npm run typecheck` (`tsc --noEmit`) | 0 | No TypeScript diagnostics or compilation errors |
| Code Linting | `npm run lint` (`eslint .`) | 0 | Zero ESLint errors or warnings |
| Unit Test Suite | `npm run test` (`vitest run`) | 0 | **31 files passed, 318 tests passed (100%)** |
| Production Build | `npm run build` (`next build`) | 0 | 17/17 Next.js App Router routes generated successfully |
| Headless Browser Smoke | Playwright / Chromium via CDP | 0 | Verified flow at 360x800 and 1280x900 viewports |

---

## 2. Mandatory Verification Checks

### 2.1 AI Key & Secret Security (ADR 0001) — PASS
- **Client Bundle Scan**: Scanned all `.js` bundles under `.next/static/` with regular expressions for `AI_API_KEY`, `AI_BASE_URL`, `localhost:20128`, `service_role`, `sk-[a-zA-Z0-9]{20,}`, and `eyJhbGciOi`. **0 matches found (clean)**.
- **Git Commit Scan**: Audited `git log -p fe49613..HEAD` for accidentally committed secrets or tokens. **0 matches found (clean)**.
- **Environment Template**: `.env.example` contains only unpopulated placeholders (`AI_BASE_URL=`, `AI_API_KEY=`, `AI_MODEL=`, `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`). `.env*` files are strictly gitignored in `.gitignore`.
- **Server Boundaries**: `callAiGateway` and AI route handlers run with `export const runtime = 'nodejs'` and never import into client components.

### 2.2 Zero-PII Architecture — PASS
- **Domain Schemas**: `LearnerSchema` and `InterviewSchema` in `src/lib/schemas.ts` are enforced with Zod `.strict()`. They reject arbitrary properties (`realName`, `schoolName`, `email`, `phone`).
- **Interview Wizard**: Collects only educational stage (`m_ton` / `m_plai`), project goal, and constraints (budget, time, equipment, team size, skills). Zero personal identity inputs.
- **Advisor Share Codec (`src/lib/advisor-review/codec.ts`)**: Generates an export snapshot containing only proposal text, plan, and notes. The snapshot schema explicitly strips learner IDs, project IDs, and interview history. Checksums bind snapshot integrity without identity leakage.
- **PDPA & Local-First Storage**: Consent is gated via `ConsentView.tsx` with a single-click data purge option (`wipeAllLearnerData()`).

### 2.3 Verified Prior Work Citations — PASS (Zero Fabricated Citations)
Spot-checked 6 entries from `src/data/prior-work.ts` with direct HTTP requests. All returned HTTP 200 and matched the exact cited scientific competition or peer-reviewed journal article:
1. `ibraille-isef2025` (`https://www.nstda.or.th/home/news_post/isef-20250518`): **HTTP 200** — Title: *"สุดยอดเยาวชนไทย! กวาด 11 รางวัล บนเวที REGENERON ISEF 2025"* (MATCH: True)
2. `sprinkler-polar-isef2018` (`https://www.nectec.or.th/news/news-pr-news/result-isef2018.html`): **HTTP 200** — Title: *"เด็กไทยสุดเจ๋ง! คว้า 6 รางวัลใหญ่ จากการประกวดโครงงานวิทยาศาสตร์ระดับโลก Intel ISEF 2018"* (MATCH: True)
3. `wonder-bonding-nsc2018` (`https://www.nectec.or.th/news/news-pr-news/ticta2018-nsc.html`): **HTTP 200** — Title: *"เยาวชน NSC 2018 คว้ารางวัลจากเวทีประกวดซอฟต์แวร์ดีเด่นแห่งชาติ (TICTA 2018) - NECTEC"* (MATCH: True)
4. `math-modeling-sikkha` (`https://so05.tci-thaijo.org/index.php/sikkha/article/view/272696`): **HTTP 200** — Title: *"การพัฒนาการจัดการเรียนรู้โดยใช้แบบจำลองทางคณิตศาสตร์..."* in สิกขา วารสารศึกษาศาสตร์ (MATCH: True)
5. `shortest-path-ayutthaya-tsp` (`https://ph02.tci-thaijo.org/index.php/scibru/article/view/252918`): **HTTP 200** — Title: *"การหาเส้นทางที่สั้นที่สุดในการไหว้พระ 9 วัด ในจังหวัดพระนครศรีอยุธยา..."* (MATCH: True)
6. `supercapacitor-solar-charge` (`https://ph02.tci-thaijo.org/index.php/itm-journal/article/view/246567`): **HTTP 200** — Title: *"การศึกษาการเก็บประจุและการปล่อยประจุของตัวเก็บประจุยวดยิ่งร่วมกับแบตเตอรี่โดยใช้..."* (MATCH: True)

### 2.4 Safety Flags Non-Blocking — PASS
- Verified in `src/components/evaluation/SafetyFlagPanel.tsx`, `src/app/evaluation/page.tsx:410-418`, and `tests/unit/pivot-flow-reducer.test.ts:30`.
- Ideas triggering SRC/ISEF safety flags (e.g. human subjects, hazardous chemicals, biological agents) surface actionable compliance guidance and safety checklists, but never disable navigation or block students from proceeding to `/proposal`.

### 2.5 Responsive Viewport & Touch Targets — PASS
- **Mobile 360x800 Layout**: Tested `/`, `/consent`, `/interview`, `/discovery`, `/idea`, `/evaluation`, `/proposal` using real Chromium via CDP emulation.
  - `document.documentElement.scrollWidth <= document.documentElement.clientWidth` across all tested views. Zero horizontal scrollbar/overflow.
  - Interactive touch targets adhere to mobile-first standards (primary buttons ≥ 44px; minimum interactive targets ≥ 40px, with one minor 55x32 link on Home noted below).
- **Desktop 1280x900 Layout**: Two-column layout responsive and centered without horizontal clipping.

### 2.6 Smoke-Test Exercise Coverage
- **Exercised**:
  - PDPA consent acceptance and storage initialization.
  - Interview wizard 4-step progression, grade level (`m_plai`), goal (`ysc`), constraints, and Discovery Track navigation.
  - Discovery Track subject selection (`วิทยาศาสตร์`), card swipe gestures, shortlist collection, and swipe-up to Idea.
  - Socratic Advisor chat interface and progressive fallback response rendering.
  - 5-axis Evaluation dashboard with badge scoring, Fit Score radar, safety warnings, and prior work cards.
  - Proposal & Plan editor, tab switching (Proposal, Weekly Plan, TCAS Portfolio, Abstract & Pitch, Advisor Review), inline editing, and client-side Word (.docx) export generation.
- **Could Not Be Exercised**:
  - Live remote Google OAuth redirect (requires live client ID and domain authentication).
  - Live remote LLM token streaming (OmniRoute dev gateway was not running during headless test, so deterministic fallback was verified).
  - Native OS print spooler dialog (virtual print preview was triggered).

---

## 3. Acceptance Criteria Audit (`PLAN.md` AC-1…AC-10 & M5)

| AC | Status | Evidence & Verification Notes |
|---|---|---|
| **AC-1** (Fit Score Math & Rubrics) | **PASS** | `src/lib/rubrics/`: 4 rubric presets (YSC, NSC, Classroom, General), 5-axis weighted scoring, strict validation. 21 unit tests in `tests/unit/rubrics-engine.test.ts` pass. |
| **AC-2** (Zero-PII & Dual Persistence) | **PARTIAL** | Guest Mode works seamlessly with localStorage; Zero-PII strictly enforced. However, **Google OAuth sign-in trigger is absent on Save/Export** (Defect 5). |
| **AC-3** (SRC/ISEF Safety Screener) | **PASS** | `src/lib/safety/`: screener detects keywords and categories; returns non-blocking actionable safety warnings. 12 unit tests in `tests/unit/safety-screener.test.ts` pass. |
| **AC-4** (90 Topic Cards & Discovery Track) | **PASS** | 90 curated Topic Cards across Science, Computing, Math. SwipeDeck supports left (pass), right (shortlist up to 5), up (instant idea), and undo. All 90 cards validated by schema. |
| **AC-5** (Verified Prior Work Database) | **PASS** | Real Thai competitions and ThaiJO entries. Live HTTP spot-check of 6 URLs verified 100% active and authentic. Hallucinated IDs rejected in `src/app/api/ai/evaluate/route.ts:251`. |
| **AC-6** (Socratic Advisor Pedagogy) | **FAIL** | 3-tier progressive scaffolding is designed in `socratic-coach.ts`. However, **POST `/api/ai/coach` allows client-forged `state` via `z.custom` to bypass Tier 1 and 2 to serve Tier 3 examples on turn 1** (Defect 1). |
| **AC-7** (Evaluation Dashboard 5 Axes) | **PASS** | 5 axes scored 1–10 with green/yellow/red badges. Radar chart, Fit Score comparison, Prior Work list, and non-blocking safety warnings displayed cleanly. |
| **AC-8** (Socratic Pivot & Re-Evaluation) | **FAIL** | Socratic Pivot workshop functions on red axes. However, **POST `/api/ai/pivot` allows client-supplied `unlockedTiers` to bypass reflection to Tier 3** (Defect 2) and **consumes `'proposal'` quota, causing pivot usage to block proposal generation** (Defect 3). |
| **AC-9** (Proposal, Weekly Plan & Exports) | **PASS** | Proposal with 5 mandatory sections, weekly plan generator, multi-project switcher, DOCX export via `docx`, PDF print CSS, and share links. |
| **AC-10** (AI Gateway ADR 0001 & Quotas) | **PARTIAL** | AI Gateway adheres to ADR 0001 with fallback. Quota tracker works in-memory, but **evaluation page hardcodes `'guest'` ID, causing a Denial-of-Service where all users share a 5-evaluation daily pool** (Defect 4). |
| **M5.1** (Variable Isolator & Safety Form) | **PASS** | IV/DV/CV identification, test matrix, and Form 1/1A/1B/3 checklist. 26 unit tests in `tests/unit/variable-isolator.test.ts` pass. |
| **M5.2** (BOM Estimator & Calendar) | **PASS** | Budget estimator with local store prices, scrap material reuse suggestions, competition timeline calendar for YSC/NSC. 33 unit tests pass. |
| **M5.3** (Mock Judge, Advisor & Templates) | **PASS** | 3 judge personas with Socratic counter-questioning; SHA-256 bound advisor review token; TCAS/Abstract/Pitch templates. 54 unit tests pass. |

---

## 4. Two-Axis Code Review

Note: As `docs/agents/issue-tracker.md` is not present in the repository, the originating specification sources are `PLAN.md`, `CONTEXT.md`, `docs/design-brief.md`, `docs/adr/0001-ai-provider-via-openai-compatible-gateway.md`, and `docs/adr/0002-socratic-advisor-first-ai-pedagogy.md`.

### 4.1 Standards Axis

#### Documented-Standard Violations & Architecture Flaws

1. **High: Client-Forged State Bypasses Socratic Pedagogy Gate (ADR 0002)**
   - **File:Line**: `src/app/api/ai/coach/route.ts:29`, `src/app/api/ai/coach/route.ts:55-58`
   - **Rule**: ADR 0002 mandates that AI must act as a Socratic advisor where Tier 3 idea examples are unlocked *only* as a last resort after Tiers 1 and 2 have been actively engaged.
   - **Evidence**:
     ```ts
     29: state: z.custom<CoachSessionState>().optional(),
     ...
     55: const sessionState: CoachSessionState =
     56:   data.state && typeof data.state.turnCount === 'number'
     57:     ? data.state
     58:     : coachSessionStore.getOrCreate(data.anonymousId, data.ideaId);
     ```
   - **Reproduction & Live Verification**: Sent a POST request to `http://127.0.0.1:3123/api/ai/coach` with payload:
     ```json
     {
       "anonymousId": "bypass-tester-1",
       "requestedTier": 3,
       "state": {
         "anonymousId": "bypass-tester-1",
         "turnCount": 0,
         "unlockedTiers": [1, 2],
         "aspectProgress": { "problem": false, "objective": false, "methodology": false, "measurement": false },
         "history": [],
         "isComplete": false
       }
     }
     ```
     **Observed Result**: HTTP 200 returned immediately with `turn.tier = 3` and explicit example prompts (`"ตัวอย่างแนวทางการระบุปัญหา..."`), completely bypassing the pedagogical gate on turn 1.
   - **Remediation**: Session state must be managed authoritatively on the server via `coachSessionStore.getOrCreate(data.anonymousId, data.ideaId)`. Remove client-supplied `state` from `CoachRequestSchema` or validate cryptographic state signatures.

2. **High: Client-Supplied `unlockedTiers` Bypasses Pivot Tier-3 Scaffolding (ADR 0002)**
   - **File:Line**: `src/app/api/ai/pivot/route.ts:21-23`, `src/app/api/ai/pivot/route.ts:71-76`
   - **Rule**: ADR 0002 requires progressive scaffolding during Pivot coaching; Tier 3 angles must only unlock after Tier 1 and Tier 2 reflection.
   - **Evidence**:
     ```ts
     71: const hasTier1 = unlockedTiers?.includes(1) ?? true;
     72: const hasTier2 = unlockedTiers?.includes(2) ?? false;
     75: if (requestedTier === 3 && (!hasTier1 || !hasTier2)) {
     76:   effectiveTier = hasTier1 ? 2 : 1;
     77: }
     ```
   - **Reproduction & Live Verification**: Sent a POST request to `http://127.0.0.1:3123/api/ai/pivot` with `tier: 3` and `unlockedTiers: [1, 2]`.
     **Observed Result**: Server accepted client assertion and immediately returned `coaching.tier = 3` with `tier3Examples`.
   - **Remediation**: Track pivot progression server-side or require verified turn tokens to advance tiers.

#### Baseline Code Smells (Judgment Calls)
- **Feature Envy / Incomplete Extraction (`src/app/proposal/page.tsx:75-120`)**: The proposal page component directly parses raw URL search parameters, instantiates default snapshots, and coordinates export models inline instead of delegating to a dedicated presenter or custom hook (`useProposalWorkspace`).
- **Primitive Obsession (`src/lib/ai/quota.ts:10`)**: `QuotaKind` is represented as `'cards' | 'evaluate' | 'proposal'`. Adding `pivot` as a distinct quota kind or modeling quotas as a structured value object would prevent accidental cross-feature collisions.

---

### 4.2 Spec Axis

#### Spec Deviations & Functional Defects

1. **High: Socratic Pivot Route Steals and Exhausts Proposal Quota (AC-8 & AC-10)**
   - **File:Line**: `src/app/api/ai/pivot/route.ts:56-65`
   - **Requirement**: `PLAN.md` AC-8 specifies: *"allow unlimited re-evaluation within daily quota without blocking access to Proposal."* AC-10 defines daily quotas as: *"30 cards, 5 evaluations, 2 proposals"*.
   - **Evidence**:
     ```ts
     56: // Enforce proposal quota (2 per day)
     57: const quotaResult = await quotaStore.consume(anonymousId, 'proposal', 1);
     ```
   - **Reproduction & Live Verification**:
     1. User tests 1 pivot in the Pivot Workshop (`POST /api/ai/pivot`). This consumes 1 `'proposal'` quota.
     2. User generates/consumes 1 proposal (`POST /api/ai/proposal` with action: `consume`). Total consumed = 2.
     3. User attempts to consume or re-generate proposal: server returns **HTTP 429 Too Many Requests** (`getQuotaExceededMessage('proposal')`).
   - **Impact**: Exercising Socratic Pivot coaching on red evaluation axes prevents students from writing their final project proposal.
   - **Remediation**: Remove `'proposal'` quota consumption from `/api/ai/pivot`. Socratic Pivot should either share the `'evaluate'` quota or have its own non-blocking allocation.

2. **High: Shared Hardcoded Guest ID Causes Quota Denial-of-Service (AC-2 & AC-10)**
   - **File:Line**: `src/app/evaluation/page.tsx:70, 132`, `src/components/evaluation/PivotWorkshop.tsx:43`
   - **Requirement**: `PLAN.md` AC-10 specifies *"daily per-user quota tracking"*. `CONTEXT.md` defines Learner as an anonymous individual student with a local profile.
   - **Evidence**:
     - `src/app/evaluation/page.tsx:70`: `const res = await fetchEvaluation({ anonymousId: 'guest', ... });`
     - `src/app/evaluation/page.tsx:132`: `fetch('/api/ai/evaluate?anonymousId=guest')`
     - `src/components/evaluation/PivotWorkshop.tsx:43`: `anonymousId = 'guest_user'`
   - **Reproduction**: While `InterviewWizard.tsx` generates a unique anonymous ID (`learner-${Date.now()}-...`) and `idea/page.tsx` uses `getLearner()?.id`, `evaluation/page.tsx` completely ignores `getLearner()?.id` and sends literal `'guest'` to the evaluation API.
   - **Impact**: All students in guest mode share a single global quota bucket of 5 evaluations per day. When any one user runs 5 evaluations, all other users receive HTTP 429.
   - **Remediation**: Use `getLearner()?.id ?? 'guest-learner'` in `evaluation/page.tsx` and pass `anonymousId` into `<PivotWorkshop />`.

3. **Medium: Missing Google OAuth Trigger on Save / Export (AC-2)**
   - **File:Line**: `src/app/proposal/page.tsx:400-500`, `src/components/export/ExportPanel.tsx:150-250`
   - **Requirement**: `PLAN.md` line 118 (AC-2): *"Guest Mode (localStorage only, no backend required) with Google OAuth sign-in trigger on Save/Export/Sync"*.
   - **Finding**: While guest mode and local export (DOCX/PDF) work completely offline, there is no interactive prompt or sign-in banner inviting the user to authenticate with Google when clicking "บันทึก" or exporting their proposal.
   - **Remediation**: Add a modal or toast notification on Save/Export offering Google sign-in to sync the project to Supabase.

---

## 5. Defect Summary Table

| Defect # | Severity | Location | Summary |
|---|---|---|---|
| **DEF-01** | **High** | `src/app/api/ai/coach/route.ts:29, 55-58` | Client-forged `state.unlockedTiers` bypasses Socratic pedagogy gate to Tier 3 on turn 1. |
| **DEF-02** | **High** | `src/app/api/ai/pivot/route.ts:21-23, 71-76` | Client-supplied `unlockedTiers` bypasses Pivot reflection scaffolding directly to Tier 3. |
| **DEF-03** | **High** | `src/app/api/ai/pivot/route.ts:56-65` | `/api/ai/pivot` consumes `'proposal'` quota; pivoting red axes locks students out of Proposal generation. |
| **DEF-04** | **High** | `src/app/evaluation/page.tsx:70, 132`, `PivotWorkshop.tsx:43` | Evaluation and Pivot pages hardcode `'guest'` / `'guest_user'`, causing multi-user quota exhaustion DoS. |
| **DEF-05** | **Medium** | `src/app/proposal/page.tsx`, `ExportPanel.tsx` | Absence of Google OAuth sign-in trigger on Save/Export (AC-2). |

---

## 6. One-Line Axis Summaries

- **Standards**: 2 High violations (ADR 0002 pedagogical gate bypasses in coach and pivot routes) and 2 baseline smell heuristics.
- **Spec**: 2 High functional defects (quota collision blocking proposals, shared guest quota DoS) and 1 Medium defect (missing OAuth trigger on Save/Export).
