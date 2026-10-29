# Progress and next tasks

Updated 29 Oct 2026. Measured counts are in `COVERAGE-SUMMARY.md`; this file says what is done and what to do next, in order.

## Milestone: the complete experience (29 Oct): ten connected journeys on one Q

The founder's "complete experience" directive. Each journey is built, tested with curveballs, and filmed.

| | Status |
|---|---|
| **Foundations** | <ul><li>One store (World v4) holds people, organisations, pipeline, messages, calendar, interviews, jobs, applications, consents, profiles, J7 and planners, with typed domain events and private, organisation and shared scopes.</li><li>One global Q conversation per person on every page, by typing or voice.</li><li>Q handles typos and casual speech, asks clarifying questions, explains terms, undoes, and goes back to a page as it was left.</li><li>Messages typed offline are kept and sent on reconnect.</li><li>Q makes proactive suggestions from real state, each with a reason and a later/dismiss choice that it remembers.</li><li>Q declines unfair criteria. Every simulation is labelled.</li><li>Feature areas plug in their own routes, Q skills, proactive rules, seed data and state, so they could be built in parallel.</li></ul> |
| **Journeys** | <ul><li>R1 Funmi (first-time employer)</li><li>R2 Ada (technical recruiter)</li><li>R3 Ngozi (HR team)</li><li>R4 Dele (agency)</li><li>R5 Bayo (sceptical manager)</li><li>T1 Amaka (graduate)</li><li>T2 Chidi (sales to PM/BA)</li><li>T3 Tobi (specialist)</li><li>T4 Grace (low-bandwidth phone)</li><li>T5 Zara (sceptic)</li></ul>All ten pass together on one build: 607 steps, desktop and phone (`qa/scripts/journeys/run-all.sh`, `qa/results/summary.txt`). Every journey has at least three curveballs. |
| **Interaction states** | `/gallery/states`: 15 live, replayable specimens covering loading, streaming, failure and retry, offline, permission denied, interrupted and resumed, approval, refusal, undo, suggestions, source conflict, evidence marks and Q moods. |
| **Review** | <ul><li>106 axe scans, every route as its user, desktop and phone: 0 violations, Q reachable everywhere, no sideways scrolling (`qa/results/axe-all.json`).</li><li>The keyboard review passes (`qa/scripts/review/keyboard.mjs`).</li><li>The screen-reader pass is still outstanding, so nothing is marked VERIFIED.</li></ul> |
| **Films** | <ul><li>Film A (R1–R5) and Film B (T1–T5), each on desktop and phone, with chapters.</li><li>An indexed library of curveball clips (`captures/films/`).</li><li>Recorded from the tested journeys themselves: every caption is a step the test verified at that moment.</li></ul> |
| **Easier than by hand** | `qa/Q-VS-MANUAL.md`: six measured tasks. For example, the invitation sequence takes 4 actions with Q versus about 14 over 4 pages by hand. These are counted actions, not a user study. |
| **Register** | Screens: 132 of 183 represented (54 integrated, 78 prototyped, 0 verified). Vision: 30 of 41. Motions: 34 of 57 prototyped. See `COVERAGE-SUMMARY.md`. |
| **Known gaps** | <ul><li>Recruiter search doesn't yet apply candidates' stricter visibility choices (`discoverableBy` in `journeys/talent-b/logic.ts`).</li><li>The agency's agents don't show in Q's status line.</li><li>Q is a rule-based simulation; no model gateway is configured.</li><li>51 screens are not yet represented: public site, parts of governance, interviews and Q tools.</li></ul> |

## Milestone: Batch 1 (29 Oct): Direction D is the design system

The founder approved Direction D. It is now the product's system (`prototype/src/ds/`, `design-system/DIRECTION-D-SYSTEM.md`).

| | Status |
|---|---|
| **Designed and prototyped** | <ul><li>D tokens, with a warmer candidate variant</li><li>The Q mark with 8 moods</li><li>A resizable and collapsible thread\|canvas workspace</li><li>Product navigation: workspace switcher, rail, command palette, phone tabs with More</li><li>The legacy bridge for the original screens</li><li>Q home rebuilt natively in D</li><li>Candidate onboarding SC-061–066, with three tracks, CV failure and recovery, and claims-not-evidence</li><li>The multi-agent planner SC-119/131/132, with clarify, context and policy recall, a DAG plan, agent lanes, integration outage and recovery, pause and resume across sessions, and a handoff approval queue</li><li>The J7 workspace: three personas; desktop atlas and phone distance bands; role sheet; development plan; progress (assessed attempts only); record ladder; goal change and archive; illustrative openings</li></ul> |
| **Integrated** (shared typed state across screens) | <ul><li>Unchanged: the original hiring flow, scheduling, memory and evidence logic, now inside the D shell</li><li>The new journeys use their own typed simulated services (`services/agents.ts`, `services/profile.ts`, the J7 store). Wiring them into the shared world is the first task of batch 2</li></ul> |
| **Verified** | None. axe passes 0/42 scans, but the manual keyboard and screen-reader pass is outstanding |
| **Evidence** | <ul><li>`captures/batch1/` (screens)</li><li>`captures/journeys/` (F2, F6 and J7 films, desktop and phone)</li><li>`qa/BATCH-1-REVIEW.md`</li><li>`contracts/Q-WORKSPACE-CONTRACT.md` (what the real Q runtime must emit; view choice in the prototype is scripted)</li></ul> |
| **Register** | <ul><li>Screens: 70 of 183 represented (16 unique routes, 54 states or sections), 113 not yet represented, 0 integrations, 0 verified</li><li>Motions: 37 of 57 prototyped</li><li>Vision groups: unchanged this batch</li></ul> |

## Batch plan for the remaining 113 concepts (journeys × shared components)

Each batch ships runnable D-native interfaces, states (loading, empty, success, failure, recovery), phone layouts, screenshots, an axe run and a register update.

| Batch | Journey | Concepts | Shared components it adds |
|---|---|---|---|
| **2** | Recruiter workspace, native | <ul><li>Rebuild mandate, sourcing, compare, outreach and calendar as thread\|canvas</li><li>Wire onboarding, J7 and the planner into the shared world</li><li>SC-030–033, 037, 038, 042–044, 046</li></ul> | Candidate quickview, deep profile, search scope selector, saved search |
| **3** | Pipeline, communications and offers | SC-050–060, 148, 156, 157, 159 | Pipeline board, conversation inbox, templates, reminder queue |
| **4** | Candidate jobs and applications | SC-079–094, 075, 082, 083 | Job card, mutual-fit view, application timeline, CV and letter builders |
| **5** | Evidence and verification | SC-068–072, 076, 077, 182 | Uploader, credential vault, verification request, conflict reconciliation |
| **6** | Interviews and assessments | SC-095–097, 102–116, 172, 175 | Question bank, plan builder, live rooms, copilot, assessment players, accommodations, appeals |
| **7** | Q artifacts and tools | SC-124–130, 134, 136 | Chart and map result, document editor, diagram, video, secure browser, link viewer, download, notification preferences, research sources |
| **8** | Organisation, agency and admin | SC-015–017, 020–026, 137–146 | Team and roles, templates, integrations, billing, compliance, audit, model inspector, bias dashboard |
| **9** | Public site and entry | SC-001–013 | Landing, how it works, trust, auth, work mode, Q personalisation |

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
