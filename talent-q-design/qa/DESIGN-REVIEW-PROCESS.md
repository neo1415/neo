# Design review process

Zero axe violations and zero console errors prove that something works, not that it is good. Every batch of screens goes through both gates below before it can be marked VERIFIED.

## Gate 1: functional (automated, already in place)

| Check | Script |
|---|---|
| Golden-path flow, console errors, horizontal overflow at 390px | `qa/scripts/flow.mjs` |
| axe-core WCAG 2.2 AA + best practice, both themes, 1440 and 390 | `qa/scripts/axe.mjs`, `qa/scripts/axe-directions.mjs` |
| Token contrast (the build fails below the ratio) | `tokens/build.mjs` |

## Gate 2: design review (human-judgement, evidence-based)

Inputs for every screen:
- desktop and phone screenshots in their key states;
- a motion preview with captions in the band below the UI;
- the user's goal for the screen.

Method (from the `design-skills:design-critique` skill):
1. **Context.** Actor, goal, place in the journey, posture: sovereign for recruiters, transient or mobile for candidates.
2. **Five-second scan.** What is this? What is the primary action? Where would I look first?
3. **Heuristic pass (Nielsen H1–H10).** Each violation gets a severity from 0 to 4 and a specific fix.
4. **UX laws.** Hick, Fitts, Von Restorff, Jakob, Miller, goal-gradient, peak-end.
5. **Score from 1 to 5** on the founder's ten criteria. Every score cites the evidence it is based on:
   - visual hierarchy
   - comprehension
   - interaction quality
   - typography
   - creative quality
   - mobile usability
   - coherence
   - motion
   - accessibility
   - product differentiation
6. **Watch the motion preview at 1×.** Does motion follow real events? Can a first-time viewer follow it?
7. **Fix, re-render, re-score.** A screen with any criterion below 3, or any severity-3 or -4 finding, does not pass.

A screen is **VERIFIED** only when it passes both gates and has had a manual keyboard and screen-reader pass.

## Findings from this round, fixed before presenting

Each finding was caught by reviewing the rendered screens, not by automated tests.

| Direction | Finding | Principle | Fix |
|---|---|---|---|
| A | Dark buttons rendered with invisible text | H1 / contrast | Selector specificity |
| A | Dimming unfocused columns made black "evidenced" marks look grey, as if they had a different state | Data integrity, H4 | Focus now uses a column band; marks are never altered |
| A | Route labels clipped by the SVG edge; the route line didn't render | Visual craft | Re-laid out; CSS dash animation |
| A | On phones, the evidence sheet opened on load and covered the ledger | H3 | Opens only when asked |
| B | The floating dock covered the composer and actions at desktop height | Fitts, H3 | Dock sits in the header on desktop and floats only on phones |
| B | SVG labels rendered at about 9px | Legibility (12px floor) | Drawings sized 1:1 with their render width; labels enlarged |
| B | Names collided with evidence lines | Visual craft | Halo behind SVG text |
| B | Clickable nodes sat inside an SVG labelled as an image (axe: nested-interactive) | ARIA | Changed to a labelled group |
| C | After Q finished, the headline still said "On it." | H1 | Says "Here's who." and keeps the finished-agents record |
| C | On phones, the key tile led the swipe row and pushed cards off-screen | H8 | Key moved below; cards are 86% wide so the next one peeks |
| C | Phone face-off bars didn't say whose they were | H6 | Name above each bar |
| C | Hovering the selected answer dropped its contrast to 1.55:1 | Contrast | Hover never overrides the selected state |
