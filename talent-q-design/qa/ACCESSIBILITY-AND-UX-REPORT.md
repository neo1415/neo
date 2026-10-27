# Accessibility and UX report

Prototype `talent-q-design/prototype`, as of 27 Oct 2026.

## What was checked, and how

| Check | Method | Result |
|---|---|---|
| Golden path runs end to end | `qa/scripts/flow.mjs` (Playwright) | Pass. Runs org setup → home → intake → sourcing (incl. offline + reconnect) → compare → outreach approval → calendar consent → slots → candidate picks → booked → passport revoke → compare reflects revoke → career → interview (text, follow-up, form, voice) → practice feedback → memory revoke + correct → candidate memory. 0 console errors. |
| Automated WCAG 2.2 AA + best practice | `qa/scripts/axe.mjs` (axe-core), 16 routes × dark/light × 1440/390 | **0 violations** after one fix (the four split screens lacked a `main` landmark) |
| Colour contrast of every token pair | `tokens/build.mjs` (build fails under ratio) | 44 pairs pass. Report: `tokens/CONTRAST-REPORT.txt` |
| No horizontal scroll at 390px | flow script measures `scrollWidth` | Pass on all 12 screens |
| Text size | Token scale | Body 16px; minimum 12px (mono labels only) |
| Touch targets | Component tokens | Buttons, icon buttons and composer controls ≥ 44px; compact buttons are 36px (used only beside a full-size primary action) |

## Not yet checked (so no screen is marked VERIFIED)

- A manual keyboard-only pass of each flow: tab order, focus return from sheets, and skip-link target.
- A screen-reader pass (VoiceOver and NVDA): announcement of streaming Q text, step progress and toasts.
- Reduced motion has not been captured. `MotionConfig reducedMotion="user"` and a CSS media rule are in place, but there is no captured evidence yet.
- 200% zoom and text-spacing overrides.

## Design review findings, fixed in this session

1. **Paper surfaces rendered dark form fields.** Text was unreadable (mandate editor, outreach draft). Fixed with paper-scoped `--color-surface-sunken`.
2. **Switch "off" state was black on black on paper.** It became an outlined track with a muted knob.
3. **A revoked memory's content was still printed in the "What Q would use" panel**, which is acceptance sample 5. Its content is now hidden, and the panel says it is excluded.
4. **The J7 headline counted an open question as a gap** ("3 gaps" while Q named two). It now reads "Two gaps … and one question Q is still checking".
5. **The mobile top bar took about 190px.** The label is now shortened, nav items never wrap mid-label, and the actions share the brand row.
6. **The passport crashed** because a store selector returned a new array on every call (an infinite render). The selector was fixed, and the codebase was checked for the same pattern.

## Known UX gaps, next to address

- The mobile slot picker shows the full outreach email above the times. Collapse earlier messages on small screens.
- Compare on mobile is a horizontally scrolling table. Add a per-person card view under 600px.
- Q home's "Recently" list has no link to the full activity log (SC-121).
