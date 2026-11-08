# ADR 0002: Deep Tech Cyan & Violet Palette for Project Edu

## Status
Accepted

## Context
Project Edu's domain is scientific exploration and youth research (YSC, Science Fair, ISEF, TCAS Portfolio). The initial AllTCAS design used an orange-heavy test-prep theme (`#FF6D00`). The product requirements demand a distinct, coherent color palette that reflects scientific inquiry, high-level AI mentorship, and lab safety rigor while preserving the proven AllTCAS container hierarchy.

## Decision
1. **Color Palette — Deep Tech Cyan & Violet**:
   - `background`: Void Slate `#0B0F17` (deeper than AllTCAS for maximum contrast)
   - `surface1`: Navy Card `#131B2A`
   - `surface2`: Elevated Card `#1B263B`
   - `borderStroke`: Blueprint Stroke `#22334D`
   - `primaryCyan`: Science Electric Cyan `#00E5FF` (Discovery, Science, Exploration)
   - `secondaryViolet`: Socratic AI Violet `#8B5CF6` (AI Socratic Coach, Evaluation)
   - `accentGreen`: Emerald Mint `#10B981` (Variables Lab Safety, Approved status)
   - `accentAmber`: Amber Blaze `#F59E0B` (Competition deadlines, advisory warning)
   - `accentRed`: Crimson `#EF4444` (Safety Flag alerts, destructive actions)

2. **Feature Mapping on Dashboard**:
   - Top Hero Banner: Competition Deadlines (YSC 2027) with days/hours/minutes.
   - Quick Action Bar: `สัมภาษณ์ (Interview)`, `ปรับมุม (Pivot)`, `BOM อุปกรณ์`, `ปฏิทินแข่ง`, `ส่งออก .docx`.
   - 2x2 Feature Grid:
     * Card 1: `ค้นพบหัวข้อ (Discovery)` [ปัดการ์ด]
     * Card 2: `ตรวจไอเดีย 5 ด้าน (Evaluation)` [AI EVAL]
     * Card 3: `เอกสาร & แผนงาน (Proposal & Plan)` [.DOCX]
     * Card 4: `ซ้อมตอบกรรมการ (Judge Defense)` [MOCK]
   - Status Card: 5-Axis Idea Evaluation Progress Bars (Novelty, Feasibility, Impact, Testability, Goal Fit) + Non-blocking SRC/ISEF Safety Flag.

## Consequences
- Positive: High domain relevance, distinctive modern aesthetic, WCAG AA compliant contrast ratios.
- Preserved: AllTCAS 2-step stepper layout, sticky bottom dock, and responsive mobile architecture.
