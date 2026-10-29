# Design pass brief: bring every journey page up to the Direction D standard

The founder's verdict: the ten journeys work (keep every behaviour, the shared store, the Q integration
and the contracts), but the pages went from "functional" to "recorded" without a design pass. Your job is
to make the real pages in your area better: visibly, on desktop and phone.

This is the same checkout as before, and other area builders are working at the same time. File ownership
is unchanged from `journeys/BUILD-BRIEF.md`; read that file for the contracts and the files you own.

## What the lead already changed in the shared layer (don't redo, don't patch locally)

- **Q noticed cards.** The observation and its main actions show as chips. "Why am I seeing this?",
  "Later" and "Dismiss" sit in a quiet footer row.
- **Simulation label.** It appears once in the shell (rail brand; a thin bar on phones). Pages no longer
  carry a SIMULATED badge. Keep per-action labels where a real system would act: "Simulated send",
  "Simulated upload" and so on.
- **Page kicker.** The kicker is one line of context and truncates. Put status in tags or banners, never in
  the kicker. Rewrite any kicker in your area that crams in status or several facts.
- **Elevation.** There is one level: a `ds-sheet` inside a `ds-sheet` becomes a flat bordered panel. Don't
  nest floating cards.
- **Motion tokens.** Import `src/ds/motion.ts` (`DUR`, `EASE`, `arrive`). Use them for anything you animate:
  feedback 100–200 ms, orientation 200–400 ms, enter slower than exit, nothing functional above 500 ms.
  Reduced motion is already global.
- **Page arrival** is animated by the shell. Q's thinking state uses the animated Q mark.
- **Q never offers to open the page you're on.** The candidate rail has an Interviews group.
- **Privacy is enforced in the store.** `canSeeCandidate`, `canDiscover` and `relationshipWith` in
  `mock/world.ts`, and `visibleEvidence` honours them. Never bypass them. `qa/scripts/review/privacy.mjs`
  must keep passing.

Shared files stay read-only for you: `src/ds/*`, `src/q/QThread.tsx`, `src/q/core/*`, `src/q/skills/core.ts`,
`src/mock/world.ts`, `src/state/domain.ts`, `src/state/seed.ts`, `src/routes/entry.tsx`, `src/routes/guard.tsx`,
`src/routes/registry.ts`, `src/app/*`. If the right fix is in a shared component, say so in your report,
with the exact change. Don't fork it locally.

## Method (mandatory, in this order)

1. **Load the skills with the Skill tool, read their instructions and their relevant reference files, and
   apply them to your real pages.**
   - Always: `design-skills:design-critique`, `design-skills:design-elevation`,
     `design-skills:interaction-design` and `design-skills:ux-writing`.
   - `dataviz` for any chart, ledger, atlas, progress or monitoring view.
   - `design-superpowers:creative` for candidate-side warmth. Talent areas only, and within Direction D;
     don't invent a new identity.
2. **Look at every page and every distinct state in your area, desktop and phone.** "Before" captures are in
   `captures/review/before/{desktop,phone}/<actor>_<route>.png`, and journey-state captures are in
   `captures/cx/<J>/`. Don't sample.
   - Render your own current pages with your dev server and
     `node qa/scripts/review/capture-all.mjs http://localhost:<PORT>/ <out> "<actor/route filter>"`.
   - Drive states with your journey script.
3. **Write down the defects first** (hierarchy, density, excise, labels, copy, mobile touch, states, motion,
   data-viz information architecture), most severe first.
4. **Fix root causes in your area's components.** Where several of your pages share a pattern, fix the
   pattern.
   - Candidate pages must feel personal and encouraging, not institutional.
   - Recruiter pages must stay dense and scannable, but with clear hierarchy.
   - Copy must be understandable by ordinary people.
   - Every list needs a designed empty state, and every slow thing a useful loading or failure state.
   - Touch targets are at least 44 px. Nothing scrolls sideways at 390 px.
5. **Motion.** Review what moves in your area: Q artifacts arriving, progress, state changes, uploads,
   interview turns.
   - Animate only for feedback, orientation or focus, with the tokens.
   - Never delay functionality to show an animation.
   - Cite the motion requirement (`motion/` atlas, MO-xx) where you implement one.
6. **Re-render, look at your screens again, and fix what still looks wrong.** Repeat until you'd show it to a
   design lead.
7. **Run your journey scripts and keep them passing.** Legitimate design changes may change the DOM, and you
   may update the selectors and assertions for that. Never weaken what a step proves.

## Deliver

- After captures for every route in your area, desktop and phone, in
  `captures/review/after/{desktop,phone}/` using the capture script's naming, plus key states.
- Before/after pairs for your 3–6 worst problems: `captures/review/pairs/<area>/NN-before.png` and
  `NN-after.png`, same viewport and same state.
- `journeys/design/<area>.md`, at most 80 lines:
  - each skill invoked → which screens → the concrete changes it caused;
  - the pairs, with one-line captions;
  - remaining weaknesses, honestly.
- Don't commit. Report back in under 300 words.
