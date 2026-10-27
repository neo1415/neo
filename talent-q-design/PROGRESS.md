# Progress and next tasks

Updated 27 Oct 2026. Measured counts are in `COVERAGE-SUMMARY.md`; this file says what is done and what to do next, in order.

## Current gate: design direction (27 Oct, founder feedback)

The founder rejected Nocturne as too dashboard-like. Three working directions (A, B, C) were built on the same three experiences. The founder approved none of them unchanged and asked for a fourth, **D · Living Intelligence Workspace**, unifying their strengths. D is built (`src/directions/d/`). **No further screens are designed until the founder chooses among A, B, C and D.**
- D evidence: `captures/directions/screens/d-*` (desktop and phone, full interaction paths, via `qa/scripts/direction-d.mjs`); four films `captures/directions/d-{hiring,career}-{desktop,phone}.mp4`; axe-core 0 violations in 22 scans (`qa/scripts/axe-direction-d.mjs`).
- D critique, improvements over A, B and C, and the trade-offs that remain: end of `decisions/DIRECTION-REVIEW.md`.
- Prototypes: `#/x` in the app; published privately at https://claude.ai/artifact/G8kYmDwwdE4b3jUeTTC9Dd
- Critique and scores: `decisions/DIRECTION-REVIEW.md`. Process: `qa/DESIGN-REVIEW-PROCESS.md`
- Evidence: `captures/directions/` (A–C: 41 screenshots and 6 motion previews; D: see above). Captions sit in a band below the UI.
- Audits: `qa/RECORDING-ISSUES-AUDIT.md`, `DESIGN-SKILL-AUDIT.md` (rebuilt from transcript evidence)

**After the choice, in order:**
1. Rebuild the tokens and components in the chosen direction (if D: promote `src/directions/d/kit.tsx` and `d.css` to the app's design system) (`design-elevation` and `design-review` skills).
2. Apply the new system to the 12 working screens, keeping their state, scheduling, memory and evidence logic.
3. Re-record F1, F3, F4, F5, F7 and F8 with the band-caption pipeline.
4. Build onboarding (SC-061–066) and the planner and multi-agent view (SC-119, SC-131, SC-132), then record F2 and F6.
5. Continue the remaining 126 unrepresented screen concepts in journey batches, each going through both review gates.

## Done

**Phase 1 (complete)**
- All 4 source batches saved, with hashes and conflicts recorded (`research/SOURCE-AND-VISION-COVERAGE.md`).
- Registers generated: 183 screens, 57 motions, 41 vision groups.
- Read-only Q audit, plus a skill audit.
- Three directions drawn on the design canvas; one selected (D1).

**Phase 2 (complete for what the 12 screens need)**
- Tokens with a contrast gate.
- Typed contracts.
- A mock Q runtime with resumable cursors, cancel, approvals and questions.
- Q presence with 8 states.
- The component kit and gallery.

**Phase 3 (12 of 12 priority screens built and connected)**
- All are `INTEGRATED`, with captures.
- One automated golden path covers them all.
- axe found 0 violations.
- None is `VERIFIED` yet: the manual keyboard and screen-reader pass is outstanding.

## Not done yet

- **Videos:** 6 of 8 journey films recorded from the prototype (`captures/video/`, report in `qa/VIDEO-CAPTURE-REPORT.md`). Films 2 (onboarding) and 6 (multi-agent) are blocked by unbuilt screens. The old `video/talentq-film.mp4` predates this directive and is not counted.
- **Motion clips:** 28 of 57 motions are wired to real state; none is captured as an individual clip.
- **Screens:** 128 of 183 are only RESEARCHED.
- **Q contracts:** not yet diffed against `speed/q-oct20` (source conflict C6).

## Next tasks, in order

1. Build candidate onboarding (SC-061–066), then record film 2. Build the planner and multi-agent view (SC-119, SC-131, SC-132), then record film 6. Both use `qa/scripts/films.mjs`.
2. Do a manual keyboard and screen-reader pass on the 12 screens. Promote them to VERIFIED with evidence.
3. Add a cost-approval event (`q.cost.approval.required`) to the planner, plus SC-068 uploader and SC-072 credential verification.
4. Record per-motion clips (8–20 s) and their reduced-motion versions for the 28 wired motions.
5. Complete J7 depth:
   - the three persona paths end to end (graduate, switcher, specialist)
   - a comparable-progress chart using the `dataviz` skill
   - a role-map graph with a list alternative
   - SC-163, SC-166, SC-167, SC-169 to SC-172, SC-174 and SC-175
   - the standalone J7 storyboard and reviewer sign-off sheet
6. Complete scheduling depth: panel conflicts (SC-148), inbox (SC-156), templates (SC-157), reminders (SC-159), audit (SC-161), plus hard scenarios A, D–O.
7. Write the research specs the directive names: `PROVIDER-CAPABILITY-MATRIX.md`, `J7-CAREER-INTELLIGENCE-SPEC.md`, `SCHEDULING-AND-CORRESPONDENCE-SPEC.md` and `Q-MEMORY-AND-CONTEXT-SPEC.md`.
8. Work through the remaining sections in atlas order: public site, employer governance, pipeline and offer, interviews and assessments, agency and admin, Q tools.
9. Diff the mirrored contracts against `neo1415/q` `speed/q-oct20`.

## How to resume

```bash
cd talent-q-design/prototype && npm install && npm run build && npx vite preview --port 4174 &
node ../qa/scripts/flow.mjs /tmp/shots                          # golden path + screenshots (+ state.json)
node ../qa/scripts/axe.mjs <path to axe.min.js> /tmp/shots/state.json
# after changing registry/status.json:
node ../scripts/build-registers.mjs
```
