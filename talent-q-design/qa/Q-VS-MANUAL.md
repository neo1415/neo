# With Q versus by hand

Definition of done, point 10: "demonstrably easier than doing it manually". This compares six tasks from
the journeys.

- **With Q:** the actions are counted from the journey scripts. These are the exact messages and clicks the
  tests perform (`qa/scripts/journeys/*.mjs`), and they appear in the films.
- **By hand:** the same outcome reached by reading the prototype's own pages and writing the message
  yourself. It is counted from what each page shows (observed on the running build), not timed with users.

**Limits of this evidence:** it is a count of actions and of checks a person must hold in their head. It is
not a usability study. Real recruiters, on real tasks, timed, is the next step.

| # | Task (journey) | With Q | By hand (in this prototype's pages) | What by hand leaves to memory |
|---|---|---|---|---|
| 1 | Invite Tobi for Friday, friendlier tone, and send within the rules (R3; your sequence) | **4 actions:** "draft an interview invitation for him", "Change it to Friday and make the tone more friendly", "Send it", and **Approve and send**. Q shows each check as a "used" chip. | **About 14 actions over 4 pages:** <ul><li>Tobi's profile, for time zone and contact choices.</li><li>The calendar: read Ada's, Seyi's and Musa's Friday; Musa is in London, one hour behind.</li><li>Organisation and policy: 4 guidelines (pay band in the first message, panel of two, interview hours 10:00–16:00 Lagos, job-related wording).</li><li>Write the email, then re-check it against all four.</li></ul> | <ul><li>The time-zone conversion.</li><li>Whether the pay band is in the message.</li><li>Whether the panel has two people.</li><li>Whether Tobi accepts email.</li><li>Whether Ada may send without approval: Kora's setting is "approve each send".</li></ul> |
| 2 | Find a time for Kunle with Seyi and Musa next week (R3) | **2 messages:** "find a time…", then "hold the first one". | Read 3 rows × 5 days of busy times, convert London to Lagos, intersect with interview hours, then create the hold. **About 8 actions.** | The overlap, done mentally across two time zones. |
| 3 | Compare Tobi and Zara on payments and Go, then add Postgres (R2) | **2 messages.** Q writes notes on what changed and why. | Open the comparison, select 2 people, untick 3 criteria, then re-tick one. **About 7 clicks.** Reading what each mark rests on means opening each person's evidence. | Which evidence is verified, which is from the CV only, and what the weighting does. |
| 4 | Agency: "stop the medlink search, kora is urgent" (R4) | **1 message.** Medlink pauses (resumable) and Kora moves to the front. | Agents page: pause Medlink, raise Kora's priority, then check nothing from either client mixed. **About 4 actions.** | That a paused run can be resumed from the same point, and tenant isolation. |
| 5 | Zara: Rivers Tech has not replied in 12 days (T5) | **2 clicks.** Q notices from real state ("why am I seeing this?" shows the dates), then **Draft a polite follow-up** and approve. | Remember the application date, count the days, judge whether it's worth chasing, write a polite note. **About 6 actions**, and it only happens if she remembers. | Noticing at all; Q raises it unprompted. |
| 6 | Grace doesn't understand "passport" (T4) | **1 message** ("whats a passport here"). The plain answer comes in the same place, without leaving the step. | Find help or a glossary, leave the step, come back. There is no in-page glossary outside Q. | Losing her place, on a slow phone. |

## What this shows, and what it doesn't

- Q mostly saves **checking**, not clicking. Task 1 matters most: by hand, a recruiter must carry five rules
  and two time zones in their head. Q checks them and shows that it did. In R3, the curveball
  "just send zaras invite pls" shows Q catching a missing pay band and a calendar clash before anything is
  sent.
- On small tasks (4), the saving is modest. The by-hand path stays available on every page, and the
  journeys use it too: the pipeline, team and calendar all have direct controls.
- Not shown: speed for experienced users, errors in real use, or trust. Those need a moderated study with
  recruiters and candidates.
