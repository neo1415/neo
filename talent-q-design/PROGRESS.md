# Progress and next tasks

Updated 27 Oct 2026. Measured counts are in `COVERAGE-SUMMARY.md`; this file says what is done and what to do next, in order.

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
