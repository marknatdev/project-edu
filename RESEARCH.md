# Research Report: Project Edu

**Author**: `@researcher`  
**Date**: 2026-11-03  
**Status**: Completed — Ready for Gate 1 Review  
**Target Repository**: `D:/millmaker/EdTech` (`marknatdev/project-edu`)

---

## 1. Project Overview & Tech Stack

### 1.1 Project Objective
Project Edu is an educational web application designed for Thai secondary school students (ม.ต้น and ม.ปลาย) who are starting a project for national/international competitions (YSC, NSC, งานศิลปหัตถกรรมนักเรียน, Regeneron ISEF), classroom grading, TCAS portfolio submission, or personal interest.

The core user experience centers on **Socratic Advisor-First Pedagogy ([ADR 0002](docs/adr/0002-socratic-advisor-first-ai-pedagogy.md))**: AI acts as a project advisor teacher (ครูที่ปรึกษาโครงงาน) that scaffolds the student's own thinking through guiding questions and cognitive lenses, keeping AI-generated ideas as a **last resort (ตัวเลือกสุดท้าย)**.

The user journey spans two tracks:
1. **Discovery Track (ยังไม่มีไอเดีย)**: Subject selection → Subfields → Tinder-style Topic Card swiping (← Skip, → Interested, ↑ Do It Now) on curated problem sparks/phenomena → 5-card Shortlist comparative matrix with Fit Score → **Socratic Idea Formulation** (AI advisor asks guiding questions so the student shapes the selected Topic Card into their own Idea; AI-generated idea examples are offered only as a last-resort button if the student is stuck).
2. **Idea Track (มีไอเดียแล้ว)**: Interactive Socratic advisor chat (up to 8 targeted questions) that coaches the student to articulate and sharpen their own problem, objective, methodology, and measurement variables.

Both tracks converge into:
- **Evaluation**: 5-dimensional rubric assessment (Novelty, Feasibility, Impact, Hypothesis & Measurement, Goal Alignment) with color badges (🟢/🟡/🔴), scores (1–10), qualitative rationale, constructive coaching questions, Prior Work references with verifiable links, and SRC/ISEF Safety Screening flags.
- **Socratic Pivot Coaching (Progressive 3-Tier Scaffolding)**: If flagged red, the AI advisor does NOT immediately hand out ready-made ideas. Instead, it follows a 3-tier progression:
  - *Tier 1 (Socratic Prompt)*: Explains the bottleneck/Prior Work overlap and asks guiding questions so the student proposes their own adjustment.
  - *Tier 2 (Thinking Lenses / Hints)*: Offers structured ideation lenses (from `brainstorming-research-ideas`: scale down, shift local context, swap independent variable, substitute accessible materials).
  - *Tier 3 (AI-Generated Pivot Examples — Last Resort)*: Only when the student explicitly requests help after trying ("ยังคิดไม่ออก ขอดูตัวอย่างมุมใหม่"), AI presents 2–3 example angles, which the student must still adapt and explain in their own words before re-evaluation.
- **Artifact Co-Creation**: 1-page structured Project Proposal + weekly milestone Execution Plan synthesized directly from the student's own answers (with AI acting as editor/coach rather than ghostwriter, complying with YSC Rule 8) and exported to PDF, DOCX, Google Docs, and shareable read-only links.

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
5. **Socratic Advisor First (AI Idea Generation as Last Resort)**: Per [ADR 0002](docs/adr/0002-socratic-advisor-first-ai-pedagogy.md), every AI interaction must prioritize questioning and scaffolding student reasoning (Tier 1: Socratic questions → Tier 2: Thinking lenses/hints → Tier 3: Explicit user-triggered fallback examples). AI must never auto-generate a finished project idea or ghostwrite a proposal without the student formulating the core hypothesis, variables, and approach in their own words.

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

## 10. Feature Gap Analysis & High-Value Expansion Opportunities (ส่วนที่ควรเพิ่มเติมลงในแอป)

จากการสำรวจแพลตฟอร์มโครงงานระดับโลก (เช่น **Science Buddies**, ** Regeneron ISEF Rules Wizard**, **ProjectBoard**) และจุดเจ็บปวดจริง (Pain Points) ของนักเรียนไทยในการส่งประกวด **YSC, NSC, ศิลปหัตถกรรม สพฐ.** รวมถึงการยื่น **TCAS รอบ 1 (Portfolio)** พบว่านอกเหนือจากฟีเจอร์หลักใน MVP (ปัดการ์ด → โค้ช Socratic → ประเมิน 5 ด้าน → Export Proposal 1 หน้า) มี **8 ฟีเจอร์สำคัญที่ช่วยเติมเต็มช่องว่าง** และเพิ่มคุณค่าให้แอปอย่างก้าวกระโดด:

### หมวด A: ฟีเจอร์เสริมที่ทำได้ง่ายและคุ้มค่าสูง (Quick Wins — แนะนำให้รวมใน MVP หรือ M3/M4)

1. **Variable & Control Isolator Canvas (ตารางแยกตัวแปรและชุดควบคุมอัตโนมัติ)**
   - **ปัญหาที่พบ**: นักเรียน ม.ต้น/ม.ปลาย มักสับสนระหว่าง *ตัวแปรต้น (Independent)*, *ตัวแปรตาม (Dependent)*, *ตัวแปรควบคุม (Controlled)* และมักลืมกำหนด *ชุดควบคุม (Control Group / Baseline)* ทำให้เสียคะแนนหมวดระเบียบวิธีวิจัย (Rigor 20–30 คะแนน) ใน YSC และศิลปหัตถกรรม
   - **สิ่งที่ควรเพิ่ม**: บล็อกตาราง Interactive ให้ผู้เรียนลากหรือกรอกตัวแปรทั้ง 3 ชนิด + หน่วยวัด (เช่น ซม., วินาที, % ความแม่นยำ F1-score) พร้อมตัวตรวจเช็กว่ามี Baseline เปรียบเทียบหรือยัง

2. **ISEF / YSC Safety & Forms Checklist Wizard (ตัวช่วยเช็กเอกสารรับรองความปลอดภัย)**
   - **ปัญหาที่พบ**: ปัจจุบันเรามี `Safety Flag` เตือน 5 ด้านแล้ว แต่นักเรียนและครูที่ปรึกษาไม่ทราบว่าเมื่อติดธงแล้ว **ต้องเตรียมเอกสารหรือแบบฟอร์มใด** (เช่น แบบฟอร์มขออนุญาตใช้สัตว์ทดลอง, ใบยินยอมอาสาสมัคร Informed Consent, หรือการรับรองห้องปฏิบัติการ BSL-1/BSL-2)
   - **สิ่งที่ควรเพิ่ม**: เมื่อติด `Safety Flag` ให้แสดง **Checklist เอกสารและขั้นตอนที่ต้องทำ** (อ้างอิง ISEF Rules Wizard / เกณฑ์ YSC) แนบไปกับใบ Proposal เพื่อให้ครูเซ็นรับรองได้ทันที

3. **Abstract & Competition Pitch Generator (โครงสร้างบทคัดย่อ 250 คำ & บทพูดนำเสนอ 3 นาที)**
   - **ปัญหาที่พบ**: ในการส่งรอบคัดเลือก YSC/NSC และรอบชิงชนะเลิศ นักเรียนเขียนบทคัดย่อ (Abstract) ไม่ตรงประเด็น และไม่รู้จะเริ่มพรีเซนต์อย่างไรในเวลา 3–5 นาที
   - **สิ่งที่ควรเพิ่ม**: ปุ่มสร้าง **โครงร่างบทคัดย่อมาตรฐาน (Background → Objective → Methodology → Expected Result)** และ **สคริปต์ Elevator Pitch 3 นาที** จากข้อมูลที่นักเรียนตอบไว้ในระบบ (โดยให้ผู้เรียนเติมคำสำคัญเองตามหลัก Socratic)

4. **TCAS Portfolio Storyteller Card (สรุปโครงงาน 1 หน้าสำหรับแฟ้มสะสมผลงาน TCAS รอบ 1)**
   - **ปัญหาที่พบ**: นักเรียน ม.ปลาย ที่เลือกเป้าหมาย `Portfolio TCAS` ไม่ได้ต้องการแค่ Proposal ทางวิชาการ แต่ต้องการหน้าสรุปที่โชว์ **Role & Contribution (บทบาทหน้าที่ในทีม), ทักษะที่ได้ (Hard/Soft Skills), และเชื่อมโยงกับคณะที่อยากเข้า** (เช่น วิศวะ, แพทย์, วิทยาการคอมฯ)
   - **สิ่งที่ควรเพิ่ม**: เทมเพลต Export พิเศษสำหรับ **TCAS Portfolio 1-Page Summary** ที่จัดวางหัวข้อให้ตรงกับสิ่งที่กรรมการสัมภาษณ์มหาวิทยาลัยมองหา

---

### หมวด B: ฟีเจอร์ต่อยอดหลังตั้งต้นโครงงาน (Phase 1.5 / Phase 2 Roadmap)

5. **Mock Judge Q&A Simulator (ซ้อมตอบคำถามกรรมการปราบเซียน)**
   - **แนวคิด**: โหมดจำลองกรรมการตามเวทีที่เลือก (เช่น กรรมการ YSC สายระเบียบวิธีวิจัย, กรรมการ NSC สายเทคนิคซอฟต์แวร์, หรืออาจารย์สัมภาษณ์ TCAS) ยิงคำถามจี้จุดอ่อน 3–5 ข้อจากผลประเมินสีเหลือง/แดง (🟡🔴) เพื่อให้นักเรียนฝึกซ้อมตอบก่อนวันแข่งจริง

6. **Advisor Review & Sign-off Mode (โหมดครูที่ปรึกษาตรวจและคอมเมนต์ผ่านลิงก์แชร์)**
   - **แนวคิด**: ต่อยอดจากฟีเจอร์ *ลิงก์แชร์ Read-only* ให้ครูที่ปรึกษาสามารถกดปุ่ม **"อนุมัติหัวข้อ (Approve)"**, **"ขอให้ปรับแก้ (Request Revision)"** หรือฝากคอมเมนต์สั้นๆ บนหน้าเว็บได้โดยที่ครูไม่ต้องสมัครสมาชิก (เหมือนระบบ Teacher Approval ของ Science Buddies)

7. **Bill of Materials (BOM) & Local Resource Estimator (ตารางรายการอุปกรณ์และแหล่งซื้อในไทย)**
   - **แนวคิด**: แปลงงบประมาณคร่าวๆ ให้เป็นตารางรายการอุปกรณ์ (เช่น บอร์ด ESP32, เซนเซอร์วัดความชื้น, สารเคมีพื้นฐาน, หรือ Cloud GPU ฟรีอย่าง Google Colab) พร้อมประเมินราคาในไทยและชี้เป้าอุปกรณ์ทดแทนที่หาได้ในห้องแล็บโรงเรียนเพื่อลดต้นทุน

8. **Team Role & Skill Matrix (ระบบแบ่งหน้าที่สมาชิกในกลุ่ม 1–3 คน)**
   - **แนวคิด**: โครงงานส่วนใหญ่ทำเป็นทีม 2–3 คน ระบบช่วยจับคู่ทักษะของสมาชิกแต่ละคนเข้ากับงานใน Weekly Plan (เช่น คนที่ 1: ฮาร์ดแวร์/เก็บผลการทดลอง, คนที่ 2: โค้ดดิ้ง/วิเคราะห์สถิติ, คนที่ 3: เอกสารรูปเล่ม/กราฟิกนำเสนอ)

---

### ตารางสรุปการจัดลำดับความสำคัญ (Prioritization Matrix)

| ฟีเจอร์ที่แนะนำเพิ่มเติม | ผลกระทบต่อผู้เรียน | ความยากในการพัฒนา | แนะนำบรรจุในเฟส |
|---|:---:|:---:|:---:|
| **1. Variable & Control Isolator** (ตารางตัวแปรต้น-ตาม-ควบคุม) | สูงมาก (ตรงเกณฑ์ 30%) | ต่ำ (UI + Schema) | **MVP (M3/M4)** |
| **2. Safety & IRB Checklist** (รายการเอกสารตามธงความปลอดภัย) | สูง (ลดเสี่ยงถูกตัดสิทธิ์) | ต่ำ (Rule-based) | **MVP (M1/M3)** |
| **3. TCAS Portfolio & Pitch Template** (เทมเพลตพอร์ต & บทพูด) | สูงมาก (สำหรับ ม.ปลาย) | ต่ำ–กลาง (Template) | **MVP (M4)** |
| **4. Abstract Structure Guide** (โครงร่างบทคัดย่อ) | สูง | ต่ำ | **MVP (M4)** |
| **5. Mock Judge Q&A Simulator** (ซ้อมตอบคำถามกรรมการ) | สูงมาก (Wow Factor) | กลาง (Prompt โหมดใหม่) | **Phase 1.5 / M4 เสริม** |
| **6. Advisor Sign-off Link** (ลิงก์ให้ครูคอมเมนต์/อนุมัติ) | สูง (ช่วยงานในชั้นเรียน) | กลาง (DB Table เพิ่ม) | **Phase 2** |
| **7. BOM & Equipment Estimator** (ตารางอุปกรณ์และงบ) | กลาง–สูง | กลาง | **Phase 2** |
| **8. Team Role Matrix** (แบ่งงานสมาชิก 2–3 คน) | กลาง | ต่ำ–กลาง | **Phase 2** |

---

## Deliberation & Mention Protocol
- **Researcher Assessment**: Completed deep-dive gap analysis comparing global science fair platforms (Science Buddies, ProjectBoard, ISEF Wizard) and Thai student needs (YSC, NSC, OBEC, TCAS Portfolio). Added Section 10 with 8 actionable feature expansions.
- **Next Step**: Ask `@user` which expansion features to include in the current MVP scope (`PLAN.md`) vs deferring to Phase 2.
- **Mention**: `@user`
