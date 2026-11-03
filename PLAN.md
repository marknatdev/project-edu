# Architecture & Implementation Plan: Project Edu

**Author**: `@architect`  
**Date**: 2026-11-03  
**Status**: Ready for Gate 2 Review (`@user`)  
**Target Repository**: `D:/millmaker/EdTech` (`marknatdev/project-edu`)  
**References**: [CONTEXT.md](CONTEXT.md), [RESEARCH.md](RESEARCH.md), [docs/design-brief.md](docs/design-brief.md), [ADR 0001](docs/adr/0001-ai-provider-via-openai-compatible-gateway.md), [ADR 0002](docs/adr/0002-socratic-advisor-first-ai-pedagogy.md)

---

## 1. Architecture Blueprint & System Boundaries

### 1.1 High-Level System Architecture
Project Edu is a mobile-first Progressive Web App (PWA) built on **Next.js 15 (App Router, TypeScript, React 19)** with **Tailwind CSS**, **Framer Motion**, and a **dual-mode persistence layer** (Local-first `localStorage`/IndexedDB for Guest Mode + **Supabase PostgreSQL/Auth** for cloud sync and Google OAuth).

```
+-----------------------------------------------------------------------+
|                        Client Layer (PWA / Mobile)                    |
|  +-----------------+  +-------------------+  +---------------------+  |
|  | Interview Flow  |  | Discovery Track   |  | Socratic Coaching   |  |
|  | (Step Wizard +  |  | (SwipeDeck, Undo, |  | & Idea Track Chat   |  |
|  |  Constraints)   |  |  Shortlist, Fit)  |  | (Tier 1 -> 2 -> 3)  |  |
|  +--------+--------+  +---------+---------+  +----------+----------+  |
|           |                     |                       |             |
|  +--------v---------------------v-----------------------v----------+  |
|  |        Evaluation View (5 Axes, Prior Work, Safety Flag,        |  |
|  |        Socratic Pivot Coaching) & Co-Created Proposal/Plan      |  |
|  +------------------------------+----------------------------------+  |
|                                 |                                     |
|  +------------------------------v----------------------------------+  |
|  | Dual-Mode Store (Guest LocalStorage + Supabase Sync + PDPA Wipe)|  |
|  +------------------------------+----------------------------------+  |
+---------------------------------|-------------------------------------+
                                  | HTTPS / Server Actions / Route Handlers
+---------------------------------v-------------------------------------+
|                     Next.js Server Boundary                           |
|  +-------------------+  +--------------------+  +------------------+  |
|  | AI Gateway Client |  | Rubric & Fit Score |  | Document Export  |  |
|  | (ADR 0001 OpenAI  |  | Engine + SRC/ISEF  |  | Engine (PDF,     |  |
|  |  SDK + Quota Cap) |  | Safety Screener    |  | DOCX, GDocs, MD) |  |
|  +---------+---------+  +---------+----------+  +------------------+  |
|            |                      |                                   |
|  +---------v----------------------v--------------------------------+  |
|  | Curated Seed Catalog (~90 Topic Cards) & Verified Prior Work DB |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

### 1.2 Core Module Boundaries

| Module | Path | Responsibility & Boundary Contract |
|---|---|---|
| **Domain Types & Schemas** | `src/types/domain.ts`, `src/lib/schemas.ts` | Canonical TypeScript interfaces and Zod schemas matching `CONTEXT.md` (`Learner`, `Interview`, `Goal`, `Constraints`, `Subject`, `Subfield`, `TopicCard`, `SwipeAction`, `ShortlistItem`, `FitScore`, `Idea`, `Evaluation`, `RubricPreset`, `PriorWork`, `SafetyFlag`, `PivotCoaching`, `Project`, `Proposal`, `Plan`). |
| **Seed Catalog & Prior Work** | `src/data/topic-cards.ts`, `src/data/prior-work.ts`, `src/data/subfields.ts` | Curated dataset of **90 Topic Cards** (30 per Subject: วิทยาศาสตร์ [ฟิสิกส์/เคมี/ชีววิทยา], คอมพิวเตอร์/AI/IoT, คณิตศาสตร์) written as **problem sparks / phenomena to observe** (not finished ideas), plus verified Thai student competition projects (YSC, NSC, ศิลปหัตถกรรม, ISEF) with authentic URLs. |
| **Fit Score & Rubric Engine** | `src/lib/rubrics/engine.ts`, `src/lib/rubrics/presets.ts` | Pure, deterministic functions computing: (a) `FitScore` (0–100) comparing `TopicCard` requirements against `Learner` `Constraints` (time, budget, equipment, team size, skills, grade level); (b) `RubricPreset` lookup for `Goal × GradeLevel` across the 5 axes (`novelty`, `feasibility`, `impact`, `rigor`, `fit`) with badge thresholds (🟢 7–10, 🟡 4–6, 🔴 1–3). |
| **Safety Screener (SRC/ISEF)** | `src/lib/safety/screener.ts` | Deterministic keyword + AI classifier detecting regulated risk categories (`hazardous_chemicals`, `vertebrate_animals`, `human_subjects`, `biological_agents`, `high_voltage_radiation`) and emitting non-blocking `SafetyFlag` advisories. |
| **Socratic Advisor & AI Gateway** | `src/lib/ai/gateway.ts`, `src/lib/ai/socratic-coach.ts`, `src/lib/ai/quota.ts` | Implements ADR 0001 (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` via OpenAI-compatible endpoint with deterministic structured fallback when offline/unconfigured) and ADR 0002 (**3-Tier Progressive Scaffolding**: Tier 1 Socratic Questioning → Tier 2 Thinking Lenses from `brainstorming-research-ideas` → Tier 3 Explicit Last-Resort Example Generation). Enforces per-user daily quotas (30 extra cards, 5 evaluations, 2 proposals/day). |
| **Dual-Mode State & PDPA Privacy** | `src/lib/storage/store.ts`, `src/lib/supabase/client.ts` | Guest-first state management storing multiple `Idea` and `Project` records, swipe history, and evaluation logs locally; optional Google OAuth via Supabase to sync across devices; strict Zero-PII rule (never stores real name or school name); single-click PDPA erasure (`wipeAllLearnerData()`). |
| **Document Export Service** | `src/lib/export/docx-export.ts`, `src/lib/export/pdf-export.ts`, `src/lib/export/share-link.ts` | Exports co-created 1-page `Proposal` + weekly `Plan` into downloadable `.docx`, printable/downloadable `.pdf` (Thai font support), read-only shareable URL state, and Google Docs import format. |

### 1.3 Socratic Advisor State Machine (ADR 0002 Enforcement)
Every ideation and pivot screen enforces a strict 3-tier progression so AI never thinks *for* the student by default:
1. **Tier 1 (`SOCRATIC_QUESTION` — Default)**:
   - *Discovery Track (after selecting a Topic Card from Shortlist or swiping ↑)*: AI advisor asks 3–4 guiding questions connecting the card's phenomenon to the student's context (e.g., *"จากหัวข้อนี้ ในโรงเรียนหรือชุมชนของคุณเจอปัญหานี้ในรูปแบบไหน?"*, *"คุณอยากลองจัดกระทำกับตัวแปรต้นตัวไหน และจะวัดผลอย่างไรด้วยอุปกรณ์ที่มี?"*).
   - *Idea Track*: AI advisor asks up to 8 targeted questions until minimum viable fields (`problem`, `objective`, `methodology`, `measurement`) are articulated by the student.
   - *Red Evaluation (`Pivot`)*: AI advisor shows verified `PriorWork` or feasibility bottlenecks and asks the student how they want to differentiate or rescope.
2. **Tier 2 (`THINKING_LENS` — Student clicks "ขอคำใบ้ / กรอบวิธีคิด")**:
   - Provides 3 structured thinking lenses adapted from `brainstorming-research-ideas` (e.g., *Abstraction Ladder: ย่อสเกลลงมาในห้องเรียน*, *Cross-Pollination: เปลี่ยนวัสดุเป็นของเหลือใช้ในท้องถิ่น*, *Boundary Probing: ทดสอบในสภาวะสุดขั้ว*) without giving away a finished topic.
3. **Tier 3 (`LAST_RESORT_EXAMPLES` — Student clicks "คิดไม่ออกจริง ๆ ขอดูแนวทางตัวอย่าง (ตัวเลือกสุดท้าย)")**:
   - Only unlocked after Tier 1 & Tier 2 have been viewed. Displays 2–3 concrete angle suggestions, but requires the student to edit/explain the chosen angle in their own words before proceeding to `Evaluation` or `Proposal`.

---

## 2. Implementation Milestones

### Milestone 1: Project Scaffolding, Domain Schema, Rubrics & Safety Engine
- Initialize Next.js 15 TypeScript project with Tailwind CSS, Framer Motion, Lucide icons, `docx`, `zod`, and Vitest.
- Implement `src/types/domain.ts` and `src/lib/schemas.ts` covering all terms in `CONTEXT.md`.
- Implement `src/lib/rubrics/presets.ts` and `src/lib/rubrics/engine.ts` (4 Goals × 2 Grade Levels, Fit Score 0–100 calculator, 1–10 score to 🟢/🟡/🔴 mapper).
- Implement `src/lib/safety/screener.ts` (ISEF/SRC 5 risk categories, non-blocking Thai advisory messages).
- Write unit tests in `tests/unit/rubrics-and-safety.test.ts`.

### Milestone 2: Curated Seed Catalog (~90 Topic Cards), Prior Work DB & AI Gateway
- Create `src/data/subfields.ts` and `src/data/topic-cards.ts` containing **90 curated Topic Cards** (30 Science [Physics/Chemistry/Biology], 30 Computer/AI/IoT, 30 Mathematics) tagged by `GradeLevel` (`m_ton`, `m_plai`), difficulty, time, budget, curiosity hook, and subfield icon.
- Create `src/data/prior-work.ts` with verified Thai student competition entries and real reference links.
- Implement `src/lib/ai/gateway.ts`, `src/lib/ai/socratic-coach.ts`, and `src/lib/ai/quota.ts` adhering to ADR 0001 & ADR 0002, plus Next.js API routes (`/api/ai/coach`, `/api/ai/cards/generate`, `/api/ai/evaluate`, `/api/ai/pivot`).
- Write unit tests in `tests/unit/socratic-and-catalog.test.ts` verifying 90 cards, 3-tier Socratic state transitions, daily quota enforcement, and Prior Work citation integrity.

### Milestone 3: Core Interactive Flows (PDPA Consent, Interview, Swipe Deck, Shortlist, Socratic Coaching)
- Build PDPA Youth Privacy Banner & Modal (`Zero-PII` disclosure + one-click data wipe + Guest Mode / Google Login switcher).
- Build **Step 1: Interview Wizard** (`GradeLevel`, `Goal`, `Constraints` [time/deadline, budget/equipment, team size, skills], and Track choice: `มีไอเดียแล้ว` vs `ยังไม่มีไอเดีย`).
- Build **Step 2A (Discovery Track)**: Subject & multi-Subfield selector (including `ยังไม่รู้` mixed mode) → **Tinder-style Swipe Deck** (`← ข้าม`, `→ สนใจ`, `↑ อยากทำเลย`, `ย้อนกลับ`, background AI card verification badge, report card button) → **5-Card Shortlist Comparison Matrix** (side-by-side `FitScore`, constraints match, AI pros/cons) → **3-Tier Socratic Idea Formulation**.
- Build **Step 2B (Idea Track)**: Socratic Advisor Chat (up to 8 questions tracking completion of Problem, Objective, Methodology, Measurement, with Tier 1 → Tier 2 → Tier 3 support).

### Milestone 4: 5-Axis Evaluation, Socratic Pivot Loop, Co-Created Proposal/Plan & Multi-Format Export
- Build **Step 3: Evaluation Dashboard** displaying 5 axes with 1–10 scores, 🟢/🟡/🔴 badges, rationale, advisor coaching prompts, verified `PriorWork` links, and `SafetyFlag` alerts.
- Build **Socratic Pivot Workshop** for red-flagged dimensions (Tier 1 guiding questions → Tier 2 thinking lenses → Tier 3 last-resort 2–3 Pivot angles → re-evaluate without blocking).
- Build **Step 4: Co-Created 1-Page Proposal & Weekly Plan** editor + multi-project workspace switcher (save/resume multiple Ideas & Projects).
- Implement export handlers: downloadable `.docx` (`docx` package), printable/downloadable `.pdf`, read-only share link, and Google Docs copy/export.
- Configure PWA manifest (`public/manifest.json`) and mobile-first responsive layout.

---

## 3. Test Strategy & Exact Verification Commands

| Verification Layer | Command | Target Criteria |
|---|---|---|
| **Typecheck** | `npm run typecheck` | Zero TypeScript errors (`tsc --noEmit`). |
| **Linter** | `npm run lint` | Zero ESLint errors across `src/` and `tests/`. |
| **Unit & Integration Tests** | `npm run test` | Vitest suite passing 100%: rubric presets, Fit Score math, 90-card seed integrity, SRC/ISEF safety flags, 3-tier Socratic scaffolding rules, quota tracker, and DOCX/share export generators. |
| **Production Build** | `npm run build` | Next.js production build succeeds cleanly for all pages and API routes. |

---

## 4. Acceptance Checklist

- [ ] **AC-1 (Ubiquitous Language & Docs)**: Codebase, UI labels, and types strictly follow `CONTEXT.md` (`Learner`, `Interview`, `Goal`, `Constraints`, `Subject`, `Subfield`, `Socratic Advisor`, `Topic Card`, `Swipe`, `Shortlist`, `Fit Score`, `Idea`, `Evaluation`, `Rubric Preset`, `Prior Work`, `Safety Flag`, `Pivot`, `Project`, `Proposal`, `Plan`).
- [ ] **AC-2 (PDPA Zero-PII & Guest Mode)**: App works end-to-end in Guest Mode without requiring login upfront; never asks for real name or school name; includes plain-Thai PDPA consent notice, Google OAuth sign-in trigger on save/export, and a working "ลบข้อมูลทั้งหมดของฉัน" button.
- [ ] **AC-3 (Hybrid Interview & Track Routing)**: Collects `GradeLevel` (ม.ต้น/ม.ปลาย), `Goal` (YSC/NSC/ศิลปหัตถกรรม/ISEF, ส่งงานในชั้นเรียน, Portfolio/TCAS, ทำเพราะอยากทำ), and `Constraints` (time, budget/equipment, team size, skills), then routes to either `Idea Track` or `Discovery Track`.
- [ ] **AC-4 (Discovery Track, 90 Curated Cards & Swipe Deck)**: Provides ≥90 curated `Topic Card` entries (~30 per Subject across วิทย์, คอม/AI/IoT, คณิต), multi-subfield + "ยังไม่รู้" selection, swipe gestures/buttons (`← ข้าม`, `→ สนใจ`, `↑ อยากทำเลย`, `ย้อนกลับ`), card reporting, and automatic transition to `Shortlist` upon 5 right-swipes.
- [ ] **AC-5 (Shortlist Comparison & Fit Score)**: Displays 5 shortlisted cards side-by-side with calculated `Fit Score`, difficulty/time/budget comparison, AI pros/cons summary, and 1-card recommendation.
- [ ] **AC-6 (Socratic Advisor First — ADR 0002)**: Both Discovery Track (Topic Card → Idea) and Idea Track (up to 8 questions) use 3-tier progressive scaffolding (Tier 1 Socratic questions → Tier 2 Thinking lenses/hints → Tier 3 AI-generated idea examples as explicit last resort).
- [ ] **AC-7 (5-Axis Evaluation, Verified Prior Work & Safety Flags)**: Evaluates `Idea` using `Rubric Preset (Goal × GradeLevel)` on 5 axes (1–10 score + 🟢 7–10 / 🟡 4–6 / 🔴 1–3 + reason + coaching advice), attaches real `Prior Work` with verifiable URLs (no hallucinated citations), and shows non-blocking SRC/ISEF `Safety Flag` warnings when applicable.
- [ ] **AC-8 (Socratic Pivot & Non-Blocking Re-Evaluation)**: Red-scored ideas trigger Socratic Pivot coaching (Tier 1 question → Tier 2 lens → Tier 3 last-resort 2–3 Pivot angles) and allow unlimited re-evaluation within daily quota without blocking access to Proposal.
- [ ] **AC-9 (1-Page Proposal, Weekly Plan, Multi-Project & Export)**: Generates 1-page `Proposal` (ที่มา, วัตถุประสงค์, สมมติฐาน, ตัวแปร, วิธีทำ) + weekly `Plan` from the student's own answers; supports saving/switching multiple Ideas/Projects; exports to PDF, Word (`.docx`), Google Docs, and shareable link.
- [ ] **AC-10 (AI Gateway ADR 0001, Daily Quota & Verification)**: Server-side AI gateway targets OpenAI-compatible `AI_BASE_URL` (OmniRoute local in dev) with daily per-user quota tracking (30 cards, 5 evaluations, 2 proposals) and passes `npm run typecheck`, `npm run test`, and `npm run build`.

---

## Deliberation & Mention Protocol
- **Architect Assessment**: `PLAN.md` defines clear module boundaries, enforces ADR 0001 (OpenAI-compatible gateway) and ADR 0002 (Socratic Advisor First with 3-tier scaffolding and AI idea generation as last resort), and establishes 10 objective acceptance criteria with automated test verification commands.
- **Next Step**: Awaiting human checkpoint approval (Gate 2) before implementation begins.
- **Mention**: `@user`
