# Design pass · HIRE-D (coverage build, 30 Oct): sources, explore, booking, stage, offer, placements, reminders

Screens: SC-033, SC-034, SC-046, SC-053, SC-056, SC-058, SC-060, SC-159. Motions: MO-013, MO-046.
Existing pages are extended, not copied:
- `/r/sourcing/scope` extends `/r/sourcing`.
- `/r/explore` holds SC-046 as one of its states.
- `/r/calendar/book/:id` extends `/r/calendar`. It reuses hire-c's `findSlots`, `WeekOverlap`, `createDraft` and the `hire-c.check`/`hire-c.approve` ops.
- `/r/pipeline/:mandate/:person` is a detail state of `/r/pipeline`. Moves go through `hire-c.move`.
- `/r/offer/:mandate/:person`, `/r/outcomes` and `/r/reminders` are new. `/c/reminders` is the candidate's own choice page.

Code:
- `prototype/src/journeys/hire-d/`: pages, `model.ts`, `ops.ts` and `hire-d.css`.
- `state/areas/hire-d.ts` holds the slice: scope, saved discovery, availability, bookings, notes, due dates, offers, HiringOutcome, reminder decisions, opt-outs and receipts.
- `routes/hire-d.tsx`.
- Q: `q/skills/hire-d.ts` (8 skills), `q/openers/hire-d.ts` (8 openers), `q/proactive/hire-d.ts` (2 narrow rules).

Test: `qa/scripts/features/hire-d.mjs` covers desktop 1440×900 and phone 390×844. Captures are in `captures/features/hire-d/`.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design:** each page is a small state machine read from the store.
  - Offer: DRAFT → AWAITING_APPROVAL → APPROVED (bound to the version) → HANDED_OFF (by a named person) → NEGOTIATING → ACCEPTED | DECLINED. Any edit voids the approvals.
  - Reminder: suggested → scheduled → re-checked at send → sent, or stopped with its reason.
  - Booking: held → invited → booked only when the candidate confirms.
  - Every mutation is an op, so buttons and Q do the same thing. Destructive or outward steps need a person's yes.
- **ux-writing:** plain, non-blaming wording. Examples:
  - "No one found for '…'", followed by "Why / Try / Other ways to find people".
  - "Unknown isn't a mismatch: ask Tobi, don't guess".
  - "Accepted isn't delivered, and delivered isn't read".
  - "Stopped: Grace turned off interview reminders. Nothing was sent."
  - Proper nouns keep their case ("Talent Q members open to being found"). Running text uses short source names instead of lower-cased labels.
- **design-elevation:** Direction D materials only. These pages add no new colour, type or elevation.
  - Gold stays Q's. It appears only on the Q-computed mutual slot numbers, as in hire-c's chart.
  - State is carried by shape: filled, ringed, open or dashed marks on the stage track, the placement journal and the delivery rail.
- **design-superpowers:creative (L2, inside Direction D):** three visual ideas, none needing new tokens.
  1. The source ledger: a table on desktop and switch cards on phone, with a mono freshness stamp (LIVE, FRESH, STALE dashed, NOT REFRESHED).
  2. The placement journal: a vertical rule with filled marks for verified milestones and open or dashed marks for due ones.
  3. The receipt rail: four steps, where a connector fills only when the next receipt exists.
- **dataviz:** small tables and lists, not charts. The sources table has a list alternative on phone. The week chart is reused from hire-c, with its table view. The rail has an `aria-label` that states its status in words, plus a live region.
- **design-critique:** a rendered critique of both widths, below. Defects were fixed and re-rendered.
- **accessibility-audit:** not invoked, because nothing unusual was added (no players, sandboxes or maps). The pages use native controls, labelled switches, `role=radio` for format, keyboard-reachable buttons and no colour-only state.

## Rendered critique (first render), most severe first
1. Sev 3 · H1 visibility (booking, desktop): the interview-format chips used `role=radio` and `aria-checked`, but only `aria-pressed` was styled, so the chosen format didn't show. → `[role=radio][aria-checked=true]` now uses the pressed style (pair 01). Slots are also spread to at most 3 a day, so the first screen isn't all Monday.
2. Sev 2 · Layout (offer, no offer yet): the shared `.hd-empty` padding override flattened the sheet's padding. → Sheet padding is kept; the override applies only outside sheets (pair 02).
3. Sev 2 · Redundancy (sources, phone): "LIVE Live: checked…" repeated the stamp. → The text now reads "Checked each time a result is shown" (pair 03).
4. Sev 2 · H4 consistency (explore, sources line and empty state): lower-cased labels gave "talent q members". Role "Explore" buttons searched odd fragments ("Engineer, Payouts"). → Short source names keep proper nouns. Role searches use the cleaned title (pair 04).
5. Sev 1 · Alignment (sources, "Not used"): the glyph wrapped above each label. → Glyph and label sit inline (pair 05).
6. Sev 1 · Noise (delivery rail): an empty "TESTING" label stayed after every receipt had arrived. → The testing row hides when nothing is left to simulate (pair 06).
7. Sev 1 · Readability (offer, phone): the raw amount "2800000" was hard to check. → A live formatted hint ("₦2.8m a month") sits under the field (pair 07).

## Before/after pairs
- 01: Booking: the chosen interview format now shows as selected; slots are spread across days
- 02: Offer, no offer yet: the sheet keeps its padding
- 03: Sources, phone: the freshness line no longer repeats "Live"
- 04: Explore: source names keep their capitals ("Talent Q members"); role searches use clean titles
- 05: Sources, desktop: "Not used" glyphs sit inline with their labels
- 06: Reminder rail, phone: no empty testing row once every receipt has arrived
- 07: Offer negotiation, phone: the amount field shows the amount in words as you type

## Requirements covered (evidence = test step names in hire-d.mjs)
- **SC-033 Sources:**
  - Permitted sources only, each with why it may be used, licence, freshness and coverage.
  - "Not used: LinkedIn profiles … never extracts or scrapes LinkedIn" (decision 30 Oct).
  - States: stale, error (testing switch) and permission (interviewer can read only). Loading is the "Check freshness now" pass.
  - Switching is undoable, by button or by Q.
- **SC-034 Explore:**
  - Roles with status and pipeline counts.
  - Saved discovery with "new since last look", re-run against permissions.
  - A labelled loading state.
  - Results tagged by source, explicitly "not a score".
- **SC-046 empty state:** reasons, repairs that actually run, and alternate sourcing (post the role, referrals, agency partner). It never counts hidden people.
- **SC-053 Booking:**
  - Mutual slots against what the candidate said ("Mornings, Accra time; not Wednesdays").
  - Lagos, Accra and London per slot; collisions; format.
  - The hold is simulated, the invitation is a draft, checks pass, a person approves, and the event becomes "Invited: waiting for Zara to confirm".
- **SC-056 Stage detail:**
  - Stage track, due date (set and change), commitments, approvals, internal notes (non-job-related notes refused) and history.
  - Moves go through the shared pipeline.
  - Other organisations get a permission state.
- **SC-058 Offer:**
  - Salary shows only the band and what the candidate shared. Zara has shared nothing, so it reads "Not shared".
  - Q's draft starts from Tobi's shared minimum.
  - Two approvals, one given by Q chat. Nothing is sent.
  - A person records the hand-off and the pipeline moves to Offer.
  - A counter-offer and a v2 void the approvals; re-approval follows; accepted → Hired plus a placement record.
- **SC-060 Placements:**
  - Kept separately; each milestone shows who verified it and when.
  - Without consent, later milestones can't be added. A consent request goes as an approved in-app message, and the answer is simulated.
  - Verifying "Started" works once consent is given.
  - Placements never enter evidence. Interviewers are refused.
- **SC-159 Reminders:**
  - The queue is derived from calendar, commitments, `consents.notifications` and suppressions, and shows plan, choices and limits.
  - Approve → scheduled → send now (re-checked).
  - Grace turns reminders off on `/c/reminders` → the scheduled send is stopped with that reason.
  - An interviewer can see the queue but can't approve.
- **MO-013:** the comparison's main sheet is one shared layout element across the two lenses. It morphs over DUR.slow/EASE.standard and its content cross-fades. Under reduced motion the table redraws directly (`data-motion=off`, tested with `reducedMotion: 'reduce'`).
- **MO-046:**
  - The rail fills only from receipts: accepted → delivered (simulated receipt; sets `Msg.delivery = DELIVERED`, which Messages reads) → read (in-app only, when opened; or when the candidate replies).
  - "Not tracked for email (no tracking pixels)".
  - The CSS transition uses `--motion-base` and is off under reduced motion.

## Remaining weaknesses (honest)
- No recorded MP4 clips for MO-013 and MO-046 yet. Only the working states and stills exist.
- The `/r/sourcing` run page (hire-a) still says it reads "three sources" and can name PeopleGraph. My sources page lists PeopleGraph as not used. The run itself doesn't read the scope yet; Explore and Q do. Flagged for the lead.
- The pipeline board's cards don't link to stage detail, because hire-c owns them. People reach it from Q ("what stage is Tobi at?"), offers, reminders and bookings.
- "Ruled out" lists the candidate's own new invitation as "busy" once it exists. That's accurate, but it could say "your invitation".
- The employer-records source is a simulated count (42), not people in the world. Candidate availability is seeded for Tobi and Zara only; everyone else reads "hasn't said".
- Delivery and read receipts, consent answers and candidate confirmations are simulated through labelled testing controls.
