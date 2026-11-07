# Redesign checklist (definition of done)

Every screen in Figma (mobile 390×844, desktop 1280×900) and every restyled app page must pass every item. Each item has a pass test and a verification method. The per-screen results table lives in `results.md`.

Sources: Nielsen's 10 usability heuristics; WCAG 2.2 AA (W3C, Oct 2023); Apple HIG and WWDC *Designing Fluid Interfaces*; Laws of UX (Hick, Fitts, Miller/cognitive load, Jakob); Gestalt proximity/similarity; W3C Thai Layout Requirements; Thai readability research (Kamollimsakul, ICCHP 2014: Thai readers prefer conventional/looped faces, ≥14–16pt).

## A. Accessibility (WCAG 2.2 AA)

| ID | Pass test | How verified |
|---|---|---|
| A1 | Normal text contrast ≥ 4.5:1; large text (≥ 24px, or ≥ 18.66px bold) ≥ 3:1, for every text/background token pair in light and dark | `scratchpad/contrast.mjs` over the token table |
| A2 | Non-text UI (borders of inputs, icons that carry meaning, focus ring, progress) ≥ 3:1 against adjacent color | same script |
| A3 | Color is never the only signal (axis scores, safety flags, tier lock, swipe result) — always paired with icon or text | screen review |
| A4 | Visible focus ring on every interactive element; never hidden by sticky bars (2.4.11) | app: keyboard tab-through; Figma: focus state variants exist |
| A5 | Pointer targets ≥ 44×44 on mobile (exceeds 2.5.8's 24×24), ≥ 8px apart | app: `getBoundingClientRect` audit; Figma: frame measurement |
| A6 | Drag/swipe actions have single-tap button alternatives (2.5.7) | swipe deck review |
| A7 | Headings are sequential; one h1 per page; icon-only buttons have accessible names | app DOM audit |
| A8 | Works with `prefers-reduced-motion` (no slide/spring, fades only) | app CSS review |

## B. Usability (Nielsen heuristics)

| ID | Pass test | How verified |
|---|---|---|
| B1 | Visibility of status: multi-step flows show where you are (step x of y) and async actions show loading and result | screen review |
| B2 | Match the real world: plain Thai a ม.1 student understands; no internal jargon (Tier, Fit Score) without a Thai label | copy review |
| B3 | User control: every sheet/modal/sub-flow has back or cancel; destructive actions confirm or undo | screen review |
| B4 | Consistency: the same component looks and behaves the same everywhere; navigation stays in the same place | component inventory |
| B5 | Error prevention and recovery: errors sit next to the field, in Thai, say cause + how to fix | form review |
| B6 | Recognition over recall: choices are visible, earlier answers are shown, not re-asked (3.3.7 Redundant Entry) | flow review |
| B7 | Aesthetic and minimalist: each screen has one job and one primary CTA; secondary actions are visually quieter | screen review |
| B8 | Help: consistent help entry in the same place on every screen (3.2.6) | screen review |

## C. Cognitive load (Laws of UX)

| ID | Pass test | How verified |
|---|---|---|
| C1 | Hick: any single choice point shows ≤ 5 options; more go behind "ดูเพิ่ม"/progressive disclosure | screen review |
| C2 | Miller/chunking: content grouped in ≤ 4 visible chunks per viewport on mobile | screen review |
| C3 | Fitts: primary CTA is the largest target and sits in the thumb zone on mobile (bottom third) | frame measurement |
| C4 | Jakob: standard patterns (bottom tab bar on mobile, sidebar on desktop, iOS-style sheets) | screen review |

## D. Visual system (Apple-minimal, refined)

| ID | Pass test | How verified |
|---|---|---|
| D1 | One font family for Figma and app, with Thai glyphs; body ≥ 16px; Thai body line-height ≥ 1.6; headings line-height ≥ 1.3 so Thai stacked marks (e.g. "ที่ปรึกษา") never clip | screenshot check with stacked marks |
| D2 | Type scale has ≤ 7 sizes, each with one defined role (Display is desktop-landing only); hierarchy from size + weight, not color alone | style inventory |
| D3 | Spacing only from the 4/8 scale; radius and elevation only from tokens | Figma lint; app class audit |
| D4 | Color: neutral surfaces + one accent; status colors (good/caution/risk) only for status | token review |
| D5 | Light and dark themes defined together from the same semantic tokens | token review |
| D6 | One icon set, one stroke weight (2px, 24px grid), no emoji as icons | inventory |
| D7 | Proximity: spacing inside a group < spacing between groups (Gestalt) | screen review |
| D8 | Layout: no horizontal scroll at 375px; desktop text measure ≤ ~75 characters; content max-width set | app overflow audit |

## E. Product rules (Project Edu)

| ID | Pass test | How verified |
|---|---|---|
| E1 | Topic Cards are presented as starting points, never finished projects | copy review |
| E2 | The words "verified"/"ยืนยันแล้ว" never appear in UI copy | text search |
| E3 | Safety flags are advice: amber, icon + text, and never disable the continue action | screen review |
| E4 | No field asks for a real name, school, or email | form review |
| E5 | Coaching chat follows ADR 0004: mode picker (ถาม / ค้นคว้า / คิดไอเดีย / อัตโนมัติ) at the top as a radiogroup; research results come only from the curated prior-work list; the own-words step before saving an idea stays. Pivot workshop keeps the ADR 0002 ladder | coaching + pivot screen review, server tests |
| E6 | Sign-in is required before the app (ADR 0003); landing explains why and links PDPA page | landing review |
