# Design pass: hire-c (R3, Ngozi and the Kora HR team)

## Defects found (most severe first)
1. Q's diff card showed a whole tone rewrite as word confetti (struck and highlighted text throughout), with no summary of what actually changed.
2. Pre-send checks: 8–10 bold, multi-line items, all expanded, plus 8 duplicate "used" chips: 30+ lines in the phone Q sheet before "Approve and send". A failing check was labelled "Calendar: Everyone is free".
3. The calendar week was a text table. Shared free time, London's working day and Q's options weren't visible.
4. `/r/outreach`, `/r/calendar/connect` and `/r/setup/handbook` were legacy screens in another visual system, and the outreach page was empty and stale.
5. Candidate pages felt institutional: mono status pills, "Verified employer (domain and company registry)", and the full date repeated twice.
6. The pipeline board wrapped into a second row, which broke stage order. Empty stages took full width and move selects overflowed the cards.
7. The inbox had a 2-row filter wall, a "RECEIVED" pill on the candidate's own words, no receipt for sent messages, and status crammed into the kickers.

## Skills → screens → changes
- **design-critique** (all routes): defects ranked by heuristic (H1 status, H8 minimalism, Hick, Proximity).
  - The checks card now leads with the problems and groups the passes (H8).
  - The status that was in kickers moved to tags and banners. Kickers are now one line ("Kora Pay").
  - Excise removed: Q's approval line went from 45 words to 15, and the context chips from 8 to 3.
  - Failing checks are named by the problem ("someone on the panel is now busy").
- **design-elevation**:
  - Q cards follow one order: label and status → facts (To/When/Panel as a key-value list) → the letter on a ruled block → long text one tap away.
  - The inbox has avatar rows and one tag per state. Their words and ours sit on different surfaces.
  - Sent messages show a receipt line: approved by, receipt id, "Simulated send".
- **interaction-design**:
  - Every state is designed: draft, waiting for approval, queued offline (dashed amber), sent (green receipt), reschedule asked, confirmed, and the empty states (inbox, filters, bookings, outbox, candidate).
  - Destructive actions are undoable, so "Discard draft" is quiet.
  - The test toggle uses the shared `SwitchRow`, and so do the guidelines.
  - The reject form autofocuses when it opens.
  - The handbook reading shows determinate progress.
- **ux-writing**:
  - Labels: "To approve", "Need a reply", "Outbox and receipts".
  - Plain refusals: "I haven't sent it. 2 things need sorting first: someone on the panel is now busy and the pay band is missing."
  - Candidate reassurance avoids promises: "That's normal, and it isn't about you. We can't say when they'll reply."
- **dataviz** (`/r/calendar`, `WeekOverlap.tsx`):
  - Form: overview (shared free time per day, a meter on one hue), then the detail (a day chart).
  - One Lagos axis, with London's clock as a second label row on the same scale. Never two scales.
  - Marks: busy is muted ink, interviews are solid ink with a name, holds are dashed gold, outside working day is hatched, everyone free is a gold wash, and Q's options are numbered gold ticks.
  - 2px surface rings, a legend, hover and focus tooltips on every mark, and a table view of the whole week.
  - Gold stays Q's: the overlap and the options are Q's computation.
- **creative** (candidate warmth, inside Direction D's `data-audience` palette):
  - The interview is a personal ticket: an ink date stub (it turns green when confirmed) and the time in their own zone in Fraunces.
  - The ticket shows the employer's time difference. It also says "Asking for another time is completely normal".
  - Messages are a conversation: theirs on the left, yours on the right, warm wash.
  - The empty state is addressed by name ("Nothing here yet, Zara"). Reply starters fill the box but never send.
- **Motion** (tokens from `ds/motion.ts`):
  - `arrive` on threads, messages, proposals (MO-042), the consent panel and rules.
  - Checks tick in with a 40 ms stagger, under 300 ms in total (MO-027).
  - New wording settles from gold to the wash in 300 ms after 200 ms (MO-015).
  - Meters grow over 300 ms. The ticket uses layout on state change (MO-045/047).
  - Nothing waits on an animation.

## New or replaced
- `Outbox.tsx` (`/r/outreach`): waiting, queued and sent, with receipts.
- `Connections.tsx` (`/r/calendar/connect`): one-permission consent and team status.
- `Handbook.tsx` (`/r/setup/handbook`): approved rules join the guidelines; injected instructions are set aside.
- `WeekOverlap.tsx`.
- `refs.tsx` was rewritten (draft, receipt, diff, checks and slots cards).
- Decision D1: the weekly allowance for unverified organisations is enforced in `approveAndSend` and `flushQueued`. It shows as a check and on the candidate side.

## Pairs (`captures/review/pairs/hire-c/`)
- 01: Q diff in the phone sheet. Confetti becomes "What changed: When / Tone" plus the clean v2.
- 02: Checks before "Approve and send" on the phone. 30 lines become 6, with an "All 10 passed" status.
- 03: Calendar. The text table becomes the shared-free-time strip and the day overlap chart.
- 04: Pipeline. The wrapped grid becomes a single-row board with collapsed empty stages.
- 05: `/r/outreach`. The stale legacy page becomes a native outbox with receipts.
- 06: Grace's `/c/slots` on the phone. An institutional card becomes a personal ticket.
- After captures: `captures/review/after/{desktop,phone}/` (u_ada and u_ngozi recruiter routes, p_zara and p_grace) and `after/states/hire-c/q-*` (the founder's sequence, failing checks and slots, desktop and phone).

## Remaining weaknesses
- The Q sheet header and the "Simulated Q" badge are shared. Long Q sentences are still long in Fraunces at 18 px on phones.
- The pipeline role filters wrap to 3 rows at 390 px. A select would be tighter.
- The day chart's tooltip positions per row and can clip at the far right on very narrow tracks. The table view is the fallback.
- Approved handbook rules join as "guidance", not machine-checked. Classifying them is production work (see the handoff).
- `screens/OrgSetup|Outreach|CalendarSetup` are no longer routed. The old `qa/scripts/flow.mjs` and `films.mjs` click their labels and will need re-pointing.
