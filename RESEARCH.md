# Research Report: Project Edu

**Author**: `@researcher`  
**Date**: 2026-11-03  
**Status**: Completed — Ready for Gate 1 Review  
**Target Repository**: `D:/millmaker/EdTech` (`marknatdev/project-edu`)

---

## 1. Project Overview & Tech Stack

### 1.1 Project Objective
Project Edu is an educational web application designed for Thai secondary school students (ม.ต้น and ม.ปลาย) who are starting a project for national/international competitions (YSC, NSC, งานศิลปหัตถกรรมนักเรียน, Regeneron ISEF), classroom grading, TCAS portfolio submission, or personal interest.

The core user experience spans two tracks:
1. **Discovery Track (ยังไม่มีไอเดีย)**: Subject selection → Subfields → Tinder-style Topic Card swiping (← Skip, → Interested, ↑ Do It Now) → 5-card Shortlist comparative matrix with Fit Score → Chosen Idea.
2. **Idea Track (มีไอเดียแล้ว)**: Interactive AI conversational elicitation (up to 8 targeted questions) to extract problem, objective, methodology, and measurement variables.

Both tracks converge into:
- **Evaluation**: 5-dimensional rubric assessment (Novelty, Feasibility, Impact, Hypothesis & Measurement, Goal Alignment) with color badges (🟢/🟡/🔴), scores (1–10), qualitative rationale, constructive next steps, Prior Work references with verifiable links, and SRC/ISEF Safety Screening flags.
- **Pivot Suggestions**: If flagged red, suggests 2–3 concrete angles to differentiate or simplify, allowing re-evaluation without gatekeeping.
- **Artifact Generation**: 1-page structured Project Proposal + weekly milestone Execution Plan exported to PDF, DOCX, Google Docs, and shareable read-only links.

### 1.2 Recommended Tech Stack
Based on project requirements (mobile-first PWA, secure server-side AI calls, Google OAuth, relational + vector data, document generation, fluid gesture animations):

| Layer | Recommended Choice | Rationale & Alternatives Evaluated |
|---|---|---|
| **Framework** | **Next.js 15 (App Router, React 19, TypeScript)** | Fullstack capabilities in single repo. Server Actions and API Route handlers isolate AI keys (`AI_API_KEY`) and OmniRoute proxy from browser. Fast edge rendering. |
| **Styling & UI** | **Tailwind CSS + shadcn/ui + Lucide Icons** | Accessible Radix UI primitives, dark/light theme support, responsive mobile-first utilities. |
| **Animation & Gestures** | **Framer Motion (`framer-motion`)** | Standard for high-performance physics-based gesture swiping (drag, velocity thresholds, swipe exit animations, spring card re-stacking). |
| **Database & Auth** | **Supabase (PostgreSQL + pgvector + Supabase Auth)** | Native Google OAuth provider, Row Level Security (RLS) enforcing strict user boundary isolation, built-in vector search for Topic Cards and Prior Work semantic similarity, local dev via Supabase CLI. |
| **PWA Engine** | **`@ducanh2912/next-pwa` (or Serwist)** | Zero-config service worker generation, offline fallback caching, manifest.json, app-shell mobile installability. |
| **Document Export** | **`@react-pdf/renderer` + `docx` npm** | Server or client PDF generation embedding Thai fonts (Sarabun/Prompt); `docx` produces standards-compliant MS Word files; Google Docs API integration via user Google OAuth token. |
| **AI Gateway Client** | **`openai` Node SDK** | Follows ADR 0001: standard OpenAI-compatible interface targeting `AI_BASE_URL` (`http://localhost:20128/v1` for local OmniRoute in dev; pluggable in prod). |

---

## 2. Directory Structure & Key Entry Points

### 2.1 Current Repository Layout
```
D:/millmaker/EdTech/
├── .env.example                # Config template for OpenAI-compatible gateway
├── .gitignore                  # Git hygiene rules
├── README.md                   # Repository introduction
├── CONTEXT.md                  # Ubiquitous domain language and terminology
└── docs/
    ├── design-brief.md         # Consolidated product requirements from grill rounds
    └── adr/
        └── 0001-ai-provider-via-openai-compatible-gateway.md
```

### 2.2 Proposed Target Architecture (App Router)
```
src/
├── app/
│   ├── (auth)/login/page.tsx           # Google Auth & Guest transition
│   ├── (dashboard)/
│   │   ├── interview/page.tsx          # Initial onboarding & route splitter
│   │   ├── discover/page.tsx           # Subfield selection & swipe deck
│   │   ├── shortlist/page.tsx          # 5-card comparative matrix
│   │   ├── idea/page.tsx               # AI elicitation chat (Idea Track)
│   │   ├── evaluation/[id]/page.tsx    # 5-dimension scorecard & pivot suggestions
│   │   └── project/[id]/
│   │       ├── proposal/page.tsx       # 1-page proposal view & editor
│   │       ├── plan/page.tsx           # Weekly milestone roadmap
│   │       └── export/page.tsx         # PDF / DOCX / Google Docs export
│   ├── api/
│   │   ├── ai/cards/generate/route.ts  # Dynamic card creation from right-swipes
│   │   ├── ai/evaluate/route.ts        # 5-axis evaluation & safety screening
│   │   ├── ai/pivot/route.ts           # Red-score pivots + prior work search
│   │   └── export/
│   │       ├── pdf/route.ts            # PDF streaming endpoint
│   │       └── docx/route.ts           # DOCX generator endpoint
│   └── layout.tsx                      # PWA meta, theme provider, auth context
├── components/
│   ├── deck/
│   │   ├── SwipeDeck.tsx               # Framer-motion card stack
│   │   ├── TopicCardView.tsx           # Card front & back metadata
│   │   └── SwipeControls.tsx           # Left/Right/Up & Undo buttons
│   ├── shortlist/
│   │   └── ComparativeGrid.tsx         # Fit score, constraints radar, AI summary
│   ├── evaluation/
│   │   ├── DimensionBadge.tsx          # 🟢🟡🔴 badge + 1-10 score display
│   │   ├── SafetyAlert.tsx             # ISEF/SRC risk flag box
│   │   └── PivotCard.tsx               # Differentiated angle suggestion
│   └── ui/                             # shadcn UI components
├── lib/
│   ├── ai/
│   │   ├── client.ts                   # OpenAI client configured with ADR 0001
│   │   ├── prompts/                    # Strongly-typed system & user prompts
│   │   └── safety-checker.ts           # SRC hazard pattern matching
│   ├── db/                             # Supabase client, queries, types
│   ├── export/
│   │   ├── pdf-template.tsx            # React-PDF proposal layout
│   │   └── docx-template.ts            # docx table/paragraph definitions
│   └── rubrics/                        # Presets for YSC, NSC, Silpahatakam, ISEF
└── types/                              # TypeScript domain interfaces
```

---

## 3. Existing Tests & Verification Commands

### 3.1 Current Status
- No automated test suite or build harness is committed yet.
- Git repository is initialized on branch `main` and synced to remote `origin` (`marknatdev/project-edu`).

### 3.2 Proposed Test Suite & CI Toolchain
1. **Unit & Prompt Schema Tests**: Vitest (`npm run test:unit`)
   - Test rubric calculation logic, Fit Score formula, and JSON schema validation of AI responses.
2. **Component & Swipe Interaction Tests**: React Testing Library + Vitest
   - Test swipe state transitions (left/right/up/undo), 5-card counter, shortlist thresholding.
3. **E2E Smoke Tests**: Playwright (`npm run test:e2e`)
   - Flow 1: Interview → Discovery (swipe 5 cards) → Shortlist → Select Idea → Evaluation → Proposal.
   - Flow 2: Interview → Idea Track (chat questions) → Evaluation → Pivot → Re-evaluate.
4. **Typecheck & Lint**: `npm run lint && npm run typecheck` (tsc `--noEmit`).

---

## 4. Conventions & Coding Standards Observed

1. **Ubiquitous Domain Language**: Strict adherence to [CONTEXT.md](CONTEXT.md):
   - `Learner` (ผู้เรียน), `Topic Card` (การ์ดหัวข้อ), `Idea` (ไอเดีย), `Shortlist`, `Fit Score`, `Evaluation`, `Rubric Preset`, `Prior Work` (งานที่คล้ายกัน), `Safety Flag` (ธงความปลอดภัย), `Pivot` (มุมใหม่), `Project` (โครงงาน), `Proposal` (ข้อเสนอโครงงาน), `Plan` (แผนงาน).
   - "Topic Card" must never be referred to as an "Idea" in code or UX copy.
2. **Fail-Closed AI Gate**: AI outputs must adhere to strict zod schemas. If JSON schema parsing fails, retry with bounded exponential backoff before fallback.
3. **No Fabricated References**: All Prior Work citations must carry validated URLs from real web indexing or curated records. AI is prohibited from inventing academic papers.
4. **Stateless Gateway Communication**: Client components never call external AI APIs directly; all AI calls route through Next.js server endpoints using server-side environment variables.

---

## 5. Identified Risks, Constraints, and Technical Debt

1. **Guest Mode Data Continuity**: If a guest clears browser cookies/localStorage before logging in, unsaved cards and drafts will be lost.
   - *Mitigation*: Store guest state in `IndexedDB`/`localStorage` and run an atomic hydration sync into Supabase user records upon Google OAuth completion.
2. **AI Thai Language Latency & Token Quotas**: Deep evaluation with 5 criteria + Prior Work synthesis can take 10–20 seconds if executed sequentially.
   - *Mitigation*: Stream intermediate evaluation stages or run evaluation dimensions and prior work retrieval concurrently using `Promise.all`.
3. **Mobile Swipe Performance**: Low-end Android phones may drop frames during 3D card transforms with heavy drop-shadows.
   - *Mitigation*: Use hardware-accelerated CSS transforms (`will-change: transform`, `transform3d`) in Framer Motion; render at most 3 DOM nodes in the card stack (active card + next card + preview card).
4. **OmniRoute Local vs Production Discrepancy**: Local dev uses models served via OmniRoute (e.g. GLM-5.3-Flash, Qwen), which may produce slight variations in Thai grammar compared to production API endpoints.
   - *Mitigation*: Pin temperature to 0.2 for evaluation/rubrics; test prompt schemas against standard OpenAI/Gemini/Claude schemas.

---

## 6. Domain Analysis & Competition Rubrics

### 6.1 Synthesized 5-Axis Evaluation Model
To support multiple competition targets without confusing students, the system uses a unified 5-axis framework, adjusting criteria weightings and rubric descriptors dynamically via `Rubric Preset (Goal × Grade Level)`:

| Unified Axis | Description & Criteria | YSC Mapping | NSC Mapping | ศิลปหัตถกรรม (สพฐ.) | ISEF Mapping |
|---|---|---|---|---|---|
| **1. ความใหม่ (Novelty)** | ความริเริ่มสร้างสรรค์, แตกต่างจากงานเดิม, มุมมองหรือวิธีการใหม่ | ความคิดริเริ่ม, ช่องว่างความรู้ | ความคิดริเริ่ม, นวัตกรรมซอฟต์แวร์ | ความคิดริเริ่มสร้างสรรค์ (5 คะแนน) | Creativity (20 pts) |
| **2. ความเป็นไปได้ (Feasibility)** | เหมาะสมกับเวลา งบ ทักษะ อุปกรณ์ ปลอดภัย ทำได้จริงในโรงเรียน | วิธีการทดลอง, ความรอบคอบ | ความเป็นไปได้ทางเทคนิค, สถาปัตยกรรม | วิธีดำเนินงาน/เครื่องมือ (15 คะแนน) | Design & Methodology (15 pts) |
| **3. ผลกระทบ (Impact)** | ประโยชน์ต่อสังคม ชุมชน สิ่งแวดล้อม หรือมูลค่าทางวิชาการ/เศรษฐกิจ | การสร้างผลกระทบ, การนำไปใช้จริง (10 คะแนน) | ประโยชน์และการประยุกต์ใช้งานจริง | การนำไปใช้ประโยชน์ (5 คะแนน) | Contribution to Field (10 pts) |
| **4. สมมติฐานและวิธีวัด (Rigor)** | นิยามปัญหาชัด สมมติฐานทดสอบได้ ตัวแปรครบ เครื่องมือวัดแม่นยำ | Problem Formulation & Scientific Method (30 คะแนน) | ความถูกต้องของการออกแบบ, ข้อมูลทดสอบ | วัตถุประสงค์ สมมติฐาน ตัวแปร (5+20 คะแนน) | Execution, Data Collection & Analysis (20 pts) |
| **5. ความเหมาะกับเป้าหมาย (Fit)** | ตรงกับประเภทการแข่งขัน หมวดหมู่ หรือระดับชั้นของผู้เรียน | ตรงตามสาขา YSC วิทย์/วิศวะ | ตรงหมวด NSC (บันเทิง/การเรียนรู้/ประยุกต์) | ถูกต้องตามเกณฑ์ สพฐ. 100 คะแนน | Category fit & scientific conventions |

### 6.2 Target Grading Level Differentiation
- **มัธยมศึกษาตอนต้น (Grades 7–9)**:
  - Focus: Basic scientific inquiry, observational rigor, household/school-level materials, accessible math/coding, strong curiosity.
  - Evaluation threshold: Higher tolerance for known concepts if applied to local/school problems; emphasizes safety and hands-on feasibility.
- **มัธยมศึกษาตอนปลาย (Grades 10–12)**:
  - Focus: Rigorous experimental design, statistical controls, advanced algorithmic or engineering concepts, literature gap identification.
  - Evaluation threshold: Demands distinct novelty over prior art; requires clear variable isolation and reproducibility.

---

## 7. Minor Protection & PDPA Compliance Architecture

Under Thailand's Personal Data Protection Act (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562) Section 20, data processing for minors under 20 requires parental/legal guardian consent unless the processing falls under Civil and Commercial Code Section 21 (strictly personal rights or actions appropriate to their age and necessary for livelihood).

### Architectural Strategy: "Zero-PII Student Architecture"
1. **No Real PII Collected**:
   - The app does not ask for, store, or display: student legal names, school names, student IDs, phone numbers, or physical addresses.
   - Google OAuth is used strictly for authentication: only the opaque identifier (`provider_id`) is stored as a foreign key. The student chooses an arbitrary nickname/handle.
2. **Guest Mode First**:
   - Students can complete the entire discovery, swiping, and initial chat without authenticating.
   - Authentication is only prompted when persisting projects to cloud storage or exporting.
3. **Youth-Friendly Notice & Consent**:
   - A plain-Thai, transparent notice explaining: "เราเก็บเฉพาะไอเดียที่คุณคิด เพื่อให้คุณกลับมาแก้ไขได้ภายหลัง เราไม่เก็บชื่อจริงหรือโรงเรียนของคุณ".
4. **Data Portability & Erasure**:
   - A single-click "ลบข้อมูลทั้งหมดของฉัน" button permanently cascades deletions across ideas, projects, proposals, and auth records.

---

## 8. Prior Work Grounding & Safety Screening

### 8.1 Prior Work Grounding
- **Problem**: LLMs frequently hallucinate research papers, creating fake DOIs and non-existent Thai project titles.
- **Architecture**:
  1. **Curated Repository**: Seed database of ~200 authentic Thai award-winning student projects (from NECTEC YSC/NSC public catalogs and OBEC fairs) with real titles, abstracts, and authors.
  2. **Search Verification Service**: For novel topics outside the seed set, the backend triggers Tavily / Serper API with targeted Thai query terms (`"โครงงาน" OR "งานวิจัย" + topic`), extracts top 3 verified URLs, and injects verified snippets into the prompt context.
  3. **Prompt Guard**: LLM instructions specify: *"Cite only items from the provided search context. If no direct match exists, state clearly that no prior Thai school project was found in public records."*

### 8.2 Safety Screening (ISEF/SRC Alignment)
Automated detection of regulated project domains:
1. **Hazardous Chemicals & Activities**: Explosives, strong acids, flammables, toxic fumes.
2. **Vertebrate Animals**: Testing on fish, amphibians, reptiles, birds, mammals.
3. **Human Subjects**: Psychological testing, questionnaires on sensitive topics, physical exercise trials, biological sample collection.
4. **Potentially Hazardous Biological Agents (PHBAs)**: Microorganisms, bacteria, viruses, fungi, rDNA.
5. **High Voltage & Radiation**: X-rays, lasers > Class 3R, mains voltage circuits.

*Action*: Flags an advisory badge: **"⚠️ ข้อควรระวังด้านความปลอดภัยและจริยธรรม"** detailing required safety equipment, adult supervision guidelines, and Institutional Review Board (IRB/SRC) approval requirements without preventing the student from drafting the project.

---

## 9. Technology Recommendation for Phase 2 (Architecture)

1. **Next.js 15 + React 19 + Tailwind CSS + Framer Motion**: Provides optimal developer velocity, native touch responsiveness, and bulletproof server-side API security.
2. **Supabase**: Delivers Postgres RLS, Auth, and pgvector without devops overhead.
3. **Document Export Engine**: Client/Server `@react-pdf/renderer` for standardized 1-page PDF proposal sheets, and `docx` for editable submission templates.

---

## Deliberation & Mention Protocol
- **Researcher Assessment**: All exploratory requirements, tech evaluation, competition rubric alignment, legal constraints, and architectural risks have been fully addressed and grounded in the repository context and official benchmarks.
- **Next Step**: Awaiting human checkpoint approval (Gate 1).
- **Mention**: `@user`
