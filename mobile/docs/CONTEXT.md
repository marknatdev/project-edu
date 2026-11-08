# Project Edu Domain Glossary & Context

## Context
Project Edu: AI-assisted science/engineering research project builder for secondary students (grades 7-12) competing in fairs (YSC, Science Fair, ISEF).

## Core Domain Terms

### 1. Discovery (การค้นพบหัวข้อ)
- **Interest Interview**: Socratic intake of student passions, constraints, and local problems.
- **Idea Card (Topic Card)**: Atomic research direction candidates generated from student profile; swipe right to shortlist, swipe up to evaluate.
- **Shortlist**: 5 shortlisted topic cards compared side-by-side using Fit Score.
- **Fit Score**: Alignment of topic card with learner constraints (time, budget, hardware, skills).
- **Pivot (ปรับมุมใหม่)**: Socratic transformation of rejected/saturated topics using Prior Work citations.

### 2. Research Planning (การวางแผนวิจัย)
- **5-Axis Evaluation**: Automated assessment across Novelty, Feasibility, Impact, Testability, and Goal Fit.
- **Variables & Safety**: Independent, dependent, controlled variables plus lab risk assessment (SRC/ISEF).
- **Safety Flag**: Advisory warnings for biological agents, hazardous chemicals, human subjects, or high voltage.
- **Proposal Draft**: Structured 1-page scientific proposal complying with standard competition rubrics.
- **Bill of Materials (BOM)**: Hardware, sensors, reagents, and estimated project cost.
- **Competition Calendar**: Milestones and countdown deadlines (e.g. YSC 2027 Submission).

### 3. Simulation & Review (การซ้อมและประเมินผล)
- **Quick AI Coach**: Center dock action triggering immediate Socratic dialogue without writing code/answers for students.
- **Judge Defense (Judge Simulator)**: Multi-persona mock defense simulating tough science fair inquiries.
- **Advisor Review**: Teacher portal for feedback, safety check-off, and progression sign-offs.

## UI/UX Mapping (AllTCAS Adapted + Deep Tech Cyan/Violet)
- **Theme**: Void Slate (`#0B0F17`) + Surface Elevated (`#131B2A`, `#1B263B`) + Science Electric Cyan (`#00E5FF`) + Socratic Violet (`#8B5CF6`) + Mint Safety (`#10B981`) + Amber Deadline (`#F59E0B`).
- **5-Tab Navigation**:
  - Tab 0: `หน้าหลัก (Overview)` — Hero Competition Countdown, 5-Axis Evaluation status, Quick Actions.
  - Tab 1: `ค้นพบ (Discovery)` — Socratic interview, Idea cards, Topic selector.
  - Tab 2 (Center Hero): `AI Coach` — Instant Socratic consultation.
  - Tab 3: `เอกสาร (Docs)` — Proposal editor, Variables/Safety, BOM, Export.
  - Tab 4: `โปรไฟล์ (Profile)` — Research logs, Advisor connection, Settings.
- **Reusable 2-Step Stepper**:
  - `Step 1 (Category/Focus)` → `Step 2 (Parameters/Rules)` used for both Discovery Wizard and Judge Defense Simulation.
- **Export Control**: Soft warning banner with non-blocking export for maximum student agility.
