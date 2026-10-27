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

- **Videos:** 0 of 8 journey films recorded with the new prototype. The old `video/talentq-film.mp4` predates this directive and is not counted.
- **Motion clips:** 28 of 57 motions are wired to real state; none is captured as an individual clip.
- **Screens:** 128 of 183 are only RESEARCHED.
- **Q contracts:** not yet diffed against `speed/q-oct20` (source conflict C6).

## Next tasks, in order

1. Record 8 captioned journey films from the prototype with Playwright and ffmpeg. Reuse `qa/scripts/flow.mjs` steps. Write the report to `qa/VIDEO-CAPTURE-REPORT.md`. The films:
   - (1) recruiter discovery and compare
   - (2) candidate onboarding
   - (3) scheduling
   - (4) J7
   - (5) adaptive interview
   - (6) multi-agent work and artifacts
   - (7) memory correction
   - (8) evidence portfolios

   Film (2) needs SC-061–066 (welcome, CV ingestion, conversational onboarding) built first. Film (6) needs SC-119 planner and SC-131 multi-agent view.
2. Do a manual keyboard and screen-reader pass on the 12 screens. Promote them to VERIFIED with evidence.
3. Build candidate onboarding: SC-061 to SC-066, SC-068 and SC-072.
4. Build the Q planner and multi-agent view: SC-119, SC-131 and SC-132. Add a cost-approval event (`q.cost.approval.required`).
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
