# ADR 0001: AllTCAS Mobile UI/UX Design System Adaptation for Project Edu

## Status
Accepted

## Context
Project Edu was initially built with Next.js + Capacitor. To support fluid iPadOS/mobile interactions, low-latency UI, and structured scientific project workflows, the platform is transitioning to a native Flutter architecture.

AllTCAS (`com.alllearn.alltcas`) was studied via physical iPad reverse engineering (`ALLTCAS_UI_UX_STUDY.md`) for its proven high-engagement Dark Slate aesthetic, 2-step stepper flows, sticky floating capsules, and zero-friction onboarding.

## Decision
1. **Design Tokens**:
   - Background: Deep Slate `#0D111A`, Surface 1 `#191E2B`, Surface 2 `#222938`, Border `#262F40`.
   - Accent: Shift from AllTCAS Orange (`#FF6D00`) to Science Cyan/Blue (`#00B0FF`) for domain alignment with engineering & science fairs.
   - Contrast: Maintain AllTCAS Pure White (`#FFFFFF`) pre-login auth surface.
2. **Layout Structure**:
   - Remove social ranking/leaderboard from top of Dashboard; replace with single Hero Competition Countdown Banner (e.g., YSC submission deadline).
   - Bottom Dock (5 slots):
     * Slot 0: Dashboard (Milestones & Deadlines)
     * Slot 1: Discovery (Idea Cards)
     * Slot 2 (Hero Center Button): Quick AI Coach (Voice/Text Socratic Mentor)
     * Slot 3: Docs (Proposal, Variables, BOM, Calendar)
     * Slot 4: Profile (Advisor linkages, Account)
3. **Stepper Flow Reuse**:
   - Standardize on AllTCAS 2-Step Stepper (`1 Select Category` → `2 Configure Parameters`) for both:
     * Discovery Wizard (Field selection → Budget & constraints)
     * Judge Simulator (Defense focus → Rigor & time limits)
4. **Safety & Advisor Gate**:
   - Adopt Soft Warnings for incomplete Variables Safety Assessment or Advisor feedback, avoiding hard fail-closed blocks on student draft exports.

## Consequences
- Positive: High visual polish, 120fps performance, familiar mobile interaction paradigms.
- Trade-off: Center button shifts from continuous passive timer to active on-demand AI session.
