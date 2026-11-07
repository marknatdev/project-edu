# Redesign results (2026-11-07)

Checklist: [`checklist.md`](checklist.md). Figma file `z4zVDNyXxsBAG8mZiBi0sb`, pages **Design System v2** and **Screens v2**.

## How each group was verified

| Group | Method | Result |
|---|---|---|
| A1, A2 contrast | `contrast.mjs` over all 25 text/non-text token pairs, light and dark | all pass (lowest: text3 on surface2 ≥ 4.5, control on bg ≥ 3) |
| A1–A5 Figma | `figma_lint_design` (WCAG rules) on H, 06a, 07 | only finding: tab-bar *container* fill/stroke vs page (1.1–1.2:1). Not a 1.4.11 failure: the container is not needed to identify a control; tab icons and labels pass |
| Components | `figma_audit_component_accessibility` on Button (target 44) | 97/100: focus ring 6.4:1, targets ≥ 44, colour-blind safe, states default/hover/pressed/focus/disabled/loading (error N/A for buttons) |
| A5, A7, D1, D8 app | in-browser audit script at 375 px on `/`, `/auth`, `/consent`, `/interview` (all 4 steps), `/discovery`, `/idea` (chat, rewrite, variables, saved), `/evaluation` (empty + filled), `/variables`, `/proposal` | no horizontal overflow; one h1 per page; every target ≥ 44 px except the visually hidden skip link; text sizes only from the v2 ramp (13/14/16/18/24/32/44); no "verified"/"ยืนยันแล้ว" |
| B, C, E | screen review of every Figma frame and the walked app flow (consent → interview → idea → ideate → own-words → variables → saved idea → evaluation → documents) | see table |
| Tests | `npm run typecheck`, `npm run lint`, `npm test` | green (Postgres foundation test is flaky only in the full parallel run; passes alone) |

## Per screen

✓ = passes. Notes list what was changed to pass.

| Screen (Figma · route) | A a11y | B usability | C load | D visual | E product | Notes |
|---|---|---|---|---|---|---|
| 00 landing · `/auth` | ✓ | ✓ | ✓ | ✓ | ✓ E4 E6 | one Google CTA in the thumb zone; coach preview shows the product's voice |
| H home hub · `/` | ✓ | ✓ B1 | ✓ | ✓ | ✓ | new: step x of 5 + one "ทำต่อ"; progressbar role |
| 01 help · `/consent` | ✓ alertdialog | ✓ B3 B8 | ✓ details on demand | ✓ | ✓ E4 | delete-all separated (risk tint) and confirmed; mobile sign-out added; stale "anonymous cookie" copy fixed |
| 02 interview · `/interview` | ✓ aria-pressed | ✓ B1 | ✓ C1 ≤ 5 + ดูเพิ่ม | ✓ | ✓ E4 | steps hidden until consent (one primary action); nested scroll removed |
| 03 discovery chat · `/discovery` | ✓ | ✓ B6 known facts shown | ✓ | ✓ | ✓ E1 | live AI not configured locally, so only the honest "unavailable" state was walked |
| 04 cards · `/discovery` | ✓ A6 skip/like buttons | ✓ undo | ✓ | ✓ | ✓ E1 "จุดตั้งต้น" | floating toast moved above tab bar |
| 05 compare · `/discovery` | ✓ fit as % + text | ✓ | ✓ | ✓ | ✓ | compare bar moved above tab bar |
| 06a chat modes · `/idea` | ✓ radiogroup, arrow keys, named radios | ✓ | ✓ 4 modes | ✓ | ✓ E5 (ADR 0004) | composer sticks above the raised chat button |
| 06b research mode · `/idea` | ✓ links named | ✓ | ✓ | ✓ | ✓ E5 curated only | server strips model links (tested) |
| own-words step · `/idea` | ✓ label + aria-describedby | ✓ B3 "คุยต่อก่อน" | ✓ | ✓ | ✓ ADR 0004 | can defer, still required before saving |
| 07 evaluation · `/evaluation` | ✓ A3 icon + text status | ✓ | ✓ reasons on demand | ✓ | ✓ E3 advice never blocks | English labels removed |
| 08a proposal · `/proposal` | ✓ | ✓ | ✓ tools behind เครื่องมือ | ✓ | ✓ | segmented ข้อเสนอ/แผนงาน/ส่งออก; save bar above tab bar |
| 08b plan · `/proposal?tab=plan` | ✓ | ✓ | ✓ | ✓ | ✓ | |
| 09 export · `/proposal?tab=export` | ✓ | ✓ | ✓ | ✓ | ✓ E4 PII self-check | export only on export-type views |
| tools · `/bom` `/calendar` `/judge` | ✓ | ✓ B4 same DocsNav | ✓ | ✓ tokens | ✓ | restyled via tokens and shared header; not separately drawn in Figma |
| dark samples (04, 06a) | ✓ | – | – | ✓ D5 | – | app ships light only (user decision); dark tokens defined and checked |

## Known limits

- The desktop coaching frame shows a right-hand "สิ่งที่คุณตอบแล้ว" panel; the app keeps a single column with progress chips instead.
- `/variables`, `/bom`, `/calendar`, `/judge`, `/advisor-review`, `/share` were migrated by token codemod plus the shared header; their inner layouts were not redrawn.
- Live AI (Discovery cards, AI coach text) was not exercised locally; deterministic server fallbacks were.
