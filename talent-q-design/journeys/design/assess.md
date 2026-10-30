# Design pass · ASSESS (coverage build, 30 Oct): SC-095, 102, 103, 106, 107, 109, 111, 112, 113 · MO-018, 023, 026 · V14, V20

Routes. Recruiter:
- `/r/assess` (hub, rail entry "Assessments");
- `/r/questions`, `/r/exercises`, `/r/coaching`;
- `/r/interviews/:id/live`, `/r/interviews/:id/transcript`, `/r/interviews/:id/review`. These sit under the existing Interviews entry, so `/r/interviews/:id` (R2's copilot) is extended, not replaced.

Candidate:
- `/c/assess` (hub, rail entry "Interviews and exercises");
- `/c/assess/avatar`, `/c/assess/live/:id`, `/c/assess/record/:id`, `/c/assess/ex/:id`.

The candidate practice room `/c/interview` (talent-c) and the rubric studio `/r/roles/:id/rubric` are reused, never rebuilt. The score review writes through `state/areas/rubrics.ts` (`putRating`, `roleIndex`). The code exercise answers a J12 bounded-sample request through `journeys/evidence/ops.ts`. Exercise evidence uses the proof classes from `journeys/evidence/model.ts`.

Files:
- `prototype/src/journeys/assess/*`;
- `state/areas/assess.ts`;
- `routes/assess.tsx`;
- `q/skills|proactive|openers/assess.ts`.

Test: `qa/scripts/features/assess.mjs` passes 200/200 (100 desktop, 100 phone). On the same build:
- T4 43/43, R2 74/74, J11 64/64, J12 71/71;
- rubric 85/85, media 114/114, privacy 21/21;
- the other clusters' feature tests (hire-d 144, talent-d 194, org-admin 174, q-tools 158, public 125) stay green, so these Q matchers don't take their turns.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design** produced explicit state machines in the model:
  - bank: DRAFT → LOCKED → SUPERSEDED;
  - live room: LOBBY → LIVE ⇄ INTERRUPTED → ENDED, with consent NOT_ASKED → PENDING → YES/NO;
  - avatar: CHOOSE → CONSENT → DEVICE → LIVE ⇄ INTERRUPTED → DONE, or HUMAN_REQUESTED;
  - exercise: ASSIGNED → IN_PROGRESS → SUBMITTED → REVIEWED, or DECLINED.

  Impossible states are blocked in the ops, not only in buttons: no recording without a yes, no running the room off-panel, no excerpt from an unrecorded turn, no candidate control of the room. Irreversible steps use the in-place ConfirmButton: lock, share feedback, send an exercise, end the interview. Reversible ones don't ask. The peak-end of each flow is designed: the avatar receipt, "Sent. Waiting for a reviewer.", and "What worked" in coaching.
- **ux-writing**: no judgement words, and every refusal gives a reason plus an alternative. Examples:
  - "Declining is recorded as declined, not failed."
  - "Saying no is fine: the interview carries on."
  - "Unknown, not zero."
  - "That says nothing about you; it may come up in a next round."
  - Q's suggestions read "Only interviewers see this."
  - The candidate's notice reads "Q is here for the interviewers… It doesn't score you, and it doesn't watch your face or listen to how you sound."
- **design-elevation** keeps Direction D materials. Paper is for what people read. Ink is the simulated machine surfaces: the avatar stage, the SQL editor and the log. Gold is reserved for Q's follow-up panel, the Q avatar dot and Q's proposals. There is one elevation level, with inner surfaces as ruled panels.
- **design-superpowers:creative** (L2, inside Direction D: no new tokens):
  1. The locked stamp: a ruled ink label with a lock and the version, dashed for drafts and faded for superseded.
  2. The avatar: a line-drawn figure on ink, plainly not a person, with a permanent "Simulated avatar · not a person" tag and captions always on.
  3. The interviewer-only Q panel: a gold left edge plus the words, never colour alone.
- **dataviz**: talk-time is a two-segment part-to-whole bar, with ink for the interviewer and hatching for the candidate. It has direct labels with % and word counts, and the key/list is the text alternative. The score meter uses filled cells, hatched under high uncertainty, and always shows "n of 4". The index is always written with its coverage.
- **accessibility-audit**:
  - the log timeline is a list of native checkboxes, keyboard-operable (the test ticks them with Space);
  - the chat has screen-reader speaker prefixes;
  - the code editor is a labelled textarea that doesn't trap Tab;
  - the avatar always has a caption and a text-only mode;
  - live regions cover questions, suggestions and test results;
  - every visual has a text equivalent.
- **design-critique**: the rendered critique of both widths is below. Defects were fixed and re-rendered.

## Rendered critique (first render), most severe first
1. **Live room, phone (task-first, Hick/Visual hierarchy), severity 3.** The five-card plan led the page, and Q's follow-ups landed about four screens down, under the plan and transcript.
   - Fix: on phones the columns dissolve (`display: contents`) and sections take a state-dependent order. Mid-interview the order is Q follow-ups → what was said → questions → consent → people. In the lobby, consent and the plan come first (pair 02).
2. **Live room, desktop (H8, Proximity), severity 3.** The transcript sat below a tall card grid, and the answers were clipped inside a 520 px scroll box.
   - Fix: while live, the plan becomes a compact one-line-per-requirement list below "What was said". The scroll box was removed, and routine room events collapse to one-line timestamps (pair 01).
3. **Cyber log, phone (reflow), severity 3.** The message column fell into the 24 px checkbox track, one word per line.
   - Fix: on phones the checkbox spans the rows, and time, source and message stack in column 2 (pair 03).
4. **Score review (H2, honesty), severity 3.** "Nothing in … Tobi's shared evidence shows these" was false, because Tobi has Postgres evidence that simply hadn't been rated.
   - Fix: it now reads "No marked interview answer covers these and they have no rating yet… Q can rate it on the profile scorecard" (pair 05).
5. **Question bank (Direction D rule), severity 2.** "new in v2" used the gold "busy" tag, and gold is Q's alone.
   - Fix: it's now an ink-ruled "New in v2" tag (pair 04).
6. **Coaching (peak-end), severity 2.** Only faults were listed.
   - Fix: a "What worked" section was added, covering the candidate's talk share, open questions and follow-ups used (pair 06).
7. **Avatar, phone (H8), severity 1.** The kicker was truncated mid-word, and "Simulated" appeared twice.
   - Fix: the kicker is now "Kora Pay · first round", and the page tag is dropped while the stage carries its own label (pair 07).
8. **Exercises (H4), severity 1.** The canvas title and the first sheet heading repeated the exercise name.
   - Fix: the sheet now reads "The brief" once started; the kicker is shortened (pair 08).
9. **Question bank, severity 1.** The interview row for Kunle's ended interview offered "Plan and open the room".
   - Fix: it now reads "See the room record".

## Before/after pairs
- 01: Live room desktop: transcript first while live, compact plan, one-line room events
- 02: Live room phone: Q's follow-ups first, task-first order
- 03: Cyber exercise phone: log timeline reflows without one-word lines
- 04: Question bank: "New in v2" in ink, not Q's gold
- 05: Score review: honest unknown-not-zero wording with a route to the scorecard
- 06: Coaching: "What worked" alongside what to try
- 07: Avatar phone: short kicker, one simulation label
- 08: Code exercise: no repeated title

## Requirements covered (evidence = step names in `features/assess.mjs`, d + m)
- **SC-095 / V14**:
  - ready, loading, error, draft and permission-denied states;
  - fairness screen on upload, typed questions and Q (age, family, religion, origin/accent, health refused with an alternative; leading questions refused);
  - lock with approval, v1 kept as SUPERSEDED;
  - edit rights owned by Ngozi and enforced in the op;
  - audited events in `ORG:` scope.
- **MO-018**: cards stagger in with DUR/EASE. A reduced-motion context gets the same list fully visible.
- **SC-103 / MO-023**:
  - the candidate notice comes before joining;
  - recording waits for consent;
  - suggestions only in the interviewer panel; the candidate page never shows unused suggestions;
  - hide/show, then "Ask it" leads to a specific follow-up answer;
  - interrupted/resume;
  - a protected question is stopped live;
  - tenant isolation.
- **SC-106**:
  - only recorded turns, with gaps stated;
  - excerpts from recorded answers only;
  - the panel and role recruiter only (Ngozi refused);
  - declined recording means no transcript;
  - the candidate reads their own and can request a correction.
- **MO-026 / rubric model**:
  - no rubric means no numbers;
  - Q_PROPOSED ratings via `putRating`, never replacing evidence-based or reviewed ratings;
  - uncertainty first, with ratings revealed after acknowledgement;
  - index with coverage;
  - confirm or override (reason required);
  - reduced motion gives a static scorecard.
- **SC-107**: nothing before sharing. Afterwards only the switched-on points and the note, in shared scope.
- **SC-109 / V20**:
  - talk-time, leading questions, unasked must-haves and missed follow-ups;
  - "Got it" acknowledgements;
  - Q refuses nerves/face/voice;
  - a colleague's coaching is private (Ada can't see Musa's).
- **SC-102**:
  - four equal routes, with the human route by Q (approval);
  - consent text, device check and slow-connection still image;
  - interrupted/resume keeps the draft;
  - switch to text with answers kept;
  - simulated send with receipt;
  - employer toggle off means the option is disabled with a reason;
  - cost marked "Hypothesis, not a quote".
- **SC-111/112/113**:
  - fake runner with labelled planner estimates; SIEM-style log; scripted customer with a words-only rubric;
  - SELF_REPORTED on submit, ASSESSED (or partial) only after a person reviews;
  - the note reaches the candidate only if shared;
  - declining is DECLINED with no evidence;
  - the code exercise answers Kora's J12 BOUNDED_SAMPLE decision (state SENT → SUBMITTED → REVIEWED, same evidence id);
  - the agency sees none.

## Remaining weaknesses (honest)
- **Scripted candidate answers.** They are keyed by requirement and written for Tobi. Another candidate in the live room gets Tobi's words unless they answer from their own side. They're labelled "Simulated answer", but it's thin.
- **Rule-based checks.** The SQL runner, log checks and conversation rubric are pattern checks on text, not execution or understanding. They're labelled, but a clever wrong answer could pass a check, and a correct but unusual one could fail.
- **Duplicated cards.** Proactive cards don't know the current route, so "Draft v2 isn't locked" and "Carry on" also show while you're on that very page (the same limitation the evidence builders noted).
- **Interview ratings and evidence ratings.** Interview ratings share one slot per criterion with evidence ratings (the rubric model keeps one rating per criterion), so an interview never adds a second rating beside an evidence one. The review says so, but a combined "interview + evidence" view is not designed.
- **Fixed avatar round.** The avatar round is fixed to Kora and the first three locked questions. There are no per-role round settings.
- **Coaching history.** Coaching has no trend across interviews, and acknowledgements don't fade advice over time.
- **Not recorded as films.** MO-018/023/026 are captured as working component states and stills. The MP4 films the atlas asks for are not recorded here.
- **Flaky parallel runs.** Under heavy parallel test load, one rubric phone step and one org-admin step failed once each. Both pass when re-run alone, and both are timing-related.
