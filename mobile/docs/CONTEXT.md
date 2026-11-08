# Project Edu Domain Glossary & Context

## Context
Project Edu: AI-assisted science/engineering research project builder for secondary students (grades 7-12) competing in fairs (YSC, Science Fair, ISEF).

## Core Domain Terms

### 1. Discovery (การค้นพบหัวข้อ)
- **Interest Interview**: Socratic intake of student passions, constraints, and local problems.
- **Idea Card**: Atomic research direction candidates generated from student profile.
- **Pivot**: Transforming an infeasible/ordinary topic into a novel, testable hypothesis.

### 2. Research Planning (การวางแผนวิจัย)
- **Variables & Safety**: Independent, dependent, controlled variables plus lab risk assessment.
- **Proposal Draft**: Structured scientific proposal complying with standard competition rubrics.
- **Bill of Materials (BOM)**: Hardware, sensors, reagents, and estimated project cost.
- **Competition Calendar**: Milestones and countdown deadlines (e.g. YSC Proposal Deadline).

### 3. Simulation & Review (การซ้อมและประเมินผล)
- **AI Coach**: Interactive Socratic mentor challenging assumptions without writing solutions for the student.
- **Judge Simulator**: Timed multi-persona mock defense simulating ruthless science fair judges.
- **Advisor Review**: Teacher portal for feedback, safety check-off, and progression sign-offs.

## UI/UX Mapping from AllTCAS
- **Theme**: Deep Slate (`#0D111A`) + Surface Elevated (`#191E2B`) + Electric Science Blue (`#00B0FF`) + Warning Amber (`#FFB300`).
- **5-Tab Navigation**:
  - Tab 0: `หน้าหลัก (Overview)` — Hero Competition Countdown, Progress, Quick Tools.
  - Tab 1: `ค้นพบ (Discovery)` — Socratic interview, Idea cards, Topic selector.
  - Tab 2 (Center Hero): `AI Coach` — Instant Voice/Text Socratic consultation.
  - Tab 3: `เอกสาร (Docs)` — Proposal editor, Variables/Safety, BOM, Export.
  - Tab 4: `โปรไฟล์ (Profile)` — Research logs, Advisor connection, Settings.
- **Reusable 2-Step Stepper**:
  - `Step 1 (Category/Focus)` → `Step 2 (Parameters/Rules)` used for both Discovery Wizard and Judge Defense Simulation.
- **Export Control**: Soft warning banner with non-blocking export for maximum student agility.
