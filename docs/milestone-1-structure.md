# Milestone 1: Folder Structure & package.json Specification

เอกสารนำเสนอโครงสร้างโฟลเดอร์และรายการแพ็กเกจสำหรับ **Milestone 1** ตามข้อกำหนดใน [PLAN.md](../../PLAN.md) และแนวทาง UI แบบ **ผสม A + B** (โครงสร้างกระจกใสคลีนสไตล์ Modern Glassmorphism + สีสันสดใส Neo-Pop สำหรับวัยรุ่น)

---

## 1. Directory Tree (โครงสร้างโฟลเดอร์)

```text
D:/millmaker/EdTech/
├── .env.example                     # ค่าคอนฟิก AI gateway (OmniRoute / OpenAI / Gemini)
├── .gitignore                       # ละเว้น node_modules, .next, .env ฯลฯ
├── package.json                     # รายการ dependency และ scripts
├── tsconfig.json                    # คอนฟิก TypeScript แบบ strict
├── next.config.ts                   # Next.js 15 App Router + PWA header
├── tailwind.config.ts               # ธีมสี Neo-Pop + Glass utilities (Indigo, Mint, Coral)
├── postcss.config.mjs               # PostCSS loader
├── vitest.config.ts                 # Runner สำหรับ Unit tests
│
├── src/
│   ├── app/                         # Next.js 15 App Router
│   │   ├── layout.tsx               # Root layout (Prompt & Plus Jakarta Sans font, Metadata)
│   │   ├── page.tsx                 # หน้าแรก: Welcome & Start Wizard
│   │   └── globals.css              # Glassmorphism + Neo-Pop animations & variables
│   │
│   ├── types/
│   │   └── domain.ts                # Canonical interfaces ครบถ้วนตาม CONTEXT.md:
│   │                                # Learner, Interview, Goal, Constraints,
│   │                                # Subject, Subfield, TopicCard, SwipeAction,
│   │                                # ShortlistItem, FitScore, Idea, Evaluation,
│   │                                # RubricPreset, PriorWork, SafetyFlag, Project
│   │
│   ├── lib/
│   │   ├── schemas.ts               # Zod validation schemas สำหรับ runtime check
│   │   │
│   │   ├── rubrics/                 # ระบบประเมิน 5 ด้าน & คำนวณความเหมาะสม
│   │   │   ├── presets.ts           # เกณฑ์มาตรฐาน 4 Goals × 2 GradeLevels (YSC, NSC ฯลฯ)
│   │   │   └── engine.ts            # ฟังก์ชันคำนวณ FitScore (0–100) & แปลงเกรด 🟢🟡🔴
│   │   │
│   │   └── safety/                  # ระบบคัดกรองความปลอดภัย (SRC / ISEF)
│   │       └── screener.ts          # ตรวจจับ 5 ความเสี่ยง (สารเคมี, สัตว์ทดลอง, อาสาสมัครคน,
│   │                                # เชื้อโรค, ไฟฟ้าแรงสูง) ออกป้ายเตือนแบบ Non-blocking
│   │
│   └── data/                        # ข้อมูลตั้งต้น (เตรียมไว้สำหรับ Milestone 2)
│       ├── subfields.ts             # สาขาย่อย วิทย์, คอม/AI, คณิต
│       ├── topic-cards.ts           # การ์ดหัวข้อ 90 ใบ (30 ใบ/วิชา)
│       └── prior-work.ts            # ฐานข้อมูลงานแข่งจริงที่มีลิงก์อ้างอิง
│
├── tests/
│   └── unit/                        # Automated Unit Tests (รันผ่าน vitest)
│       ├── domain-schemas.test.ts   # ทดสอบ Zod schemas และ Domain types
│       ├── rubrics-engine.test.ts   # ทดสอบคำนวณ FitScore & เกณฑ์ 5 ด้าน
│       └── safety-screener.test.ts  # ทดสอบการตรวจจับความเสี่ยง SRC/ISEF
│
└── docs/
    ├── CONTEXT.md                   # พจนานุกรมคำศัพท์ (Glossary)
    ├── RESEARCH.md                  # ผลสำรวจเทคโนโลยีและเกณฑ์การแข่งขัน (Gate 1)
    ├── PLAN.md                      # แผนงานสถาปัตยกรรม 4 Milestones (Gate 2)
    ├── design-brief.md              # สรุปผลการสัมภาษณ์ความต้องการ (Grill Brief)
    ├── adr/                         # Architecture Decision Records (0001, 0002)
    └── mockups/
        └── ui-design-variants.html  # Mockup หน้าจอจริง 3 รูปแบบ (Interactive)
```

---

## 2. package.json Specification

```json
{
  "name": "project-edu",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.1.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.2",
    "framer-motion": "^12.4.10",
    "lucide-react": "^0.475.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.2",
    "docx": "^9.2.1"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "postcss": "^8.5.2",
    "tailwindcss": "^3.4.17",
    "vitest": "^3.0.6"
  }
}
```

---

## 3. รายละเอียดการเลือกใช้เทคโนโลยีในแต่ละส่วน

1. **Core Framework**: `Next.js 15` (App Router) + `React 19` + `TypeScript 5.7`
   - รองรับ SSR / Client Hydration สำหรับ PWA บนมือถือ
   - Server Actions สำหรับเรียกใช้ AI Gateway โดยไม่เปิดเผย Secret Keys

2. **UI & Styling (Theme ผสม A + B)**:
   - `Tailwind CSS 3.4` + `framer-motion` (แอนิเมชันปัดการ์ด Tinder ที่นุ่มนวล)
   - `lucide-react` สำหรับไอคอนสะอาดตาตามสาขาวิชา
   - สีหลัก: Electric Indigo (`#6366F1`), Emerald/Mint (`#10B981`), Coral Pink (`#EC4899`) บนการ์ดโปร่งแสง Glassmorphism

3. **Domain & Validation**:
   - `zod 3.24`: ทำ Schema validation ให้ตรงตาม `CONTEXT.md` แบบ Type-safe 100%

4. **Export Engine**:
   - `docx 9.2`: สร้างเอกสารข้อเสนอโครงงาน 1 หน้า + แผนรายสัปดาห์ดาวน์โหลดได้ทันที

5. **Automated Testing**:
   - `vitest 3.0`: รัน Unit test ได้เร็วระดับมิลลิวินาทีสำหรับเกณฑ์ Rubrics, FitScore และตัวกรองความปลอดภัย SRC
