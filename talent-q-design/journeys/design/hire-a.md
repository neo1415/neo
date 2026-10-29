# Design pass: hire-a (R1 Funmi, founder of Crumb & Co; R5 Bayo, sceptical hiring manager at Kora Pay)

Routes: founder home (`/r/home`), `/r/roles`, `/r/roles/:id` (Brief, People, Versions), `/r/audit`, `/r/memory`,
`/r/mandate`, `/r/sourcing`, and the Q cards `hire-a.brief`, `hire-a.verify` (new), `hire-a.memory`, `hire-a.conflict`.
Code: `prototype/src/journeys/hire-a/*`, `src/q/skills/hire-a.ts`, `src/screens/{MandateIntake,Sourcing,Memory}.tsx`,
`src/styles/hire-a.css`. R1.mjs passes 94 of 94 steps and R5.mjs 66 of 66, on desktop and phone. `privacy.mjs` passes.

## Defects found (most severe first)
1. **R1 was broken by the privacy rules.** An unverified Crumb & Co found nobody. The People view then said
   "0 shown", with no explanation and no next step, while Q said "I'll keep looking". There was no verification step.
   (H1, H9, dead end)
2. **Status crammed into kickers and card labels.** Examples: "Role brief · Approved · people found" (shown with 0 people)
   and "Mandate · version 1 · draft".
3. **Pay against the market was three stacked bits of text:** "Usual: …", an ILLUSTRATIVE badge, and a "Below" tag.
   You had to read and compare numbers to see where the offer sat. (dataviz: a single value against a band)
4. **Roles list:** the title was a status ("1 draft waiting for approval"). Each role was a floating card, and nothing
   said what happens next without opening it.
5. **Audit on a phone:** about 330 px of stacked filters before the first entry. Each day was its own floating card.
6. **Founder home on a phone:** "Start with Q" sat below six steps, under the Ask bar. The intro card repeated the
   steps card.
7. **Kora search before it starts:** a three-column banner squeezed its text to one word per line at 390 px. Below it
   were two empty cards ("Steps", "Early results · 0"). Its button said "Approve the mandate first", which is jargon.
8. **Memory:** a long sentence as the title, and three empty layers shown as headings. Every memory was a floating
   card. "Used/Left out" tags didn't line up. The page didn't use the Canvas, so it had no kicker or arrival.
9. **Kora brief:** each requirement had a switch labelled "Must have", whatever its state.

## Skills → screens → changes
- **design-critique** (all pages). Kickers are now one line of context ("Role brief · Crumb & Co"). Status moved to a
  `StatusTag` in the header aside and in Q cards ("v3 · Draft"). The roles list became one sheet of whole-row links,
  each with a "next" line ("Next: approve it", "4 found · 2 shortlisted · posted"). Audit days became one sheet with
  sticky day headers and quiet mono kind labels. Memory moved onto the Canvas: rows inside one panel per layer, and
  empty layers folded into one "Not kept as memories" list at the end.
- **interaction-design** (R1 verification and limits, home, sourcing). The flow follows founder decisions D1 and D3.
  Funmi searches straight away. While Crumb & Co is unverified, `LimitsPanel` shows what the store's `orgLimits` allows:
  messages this week, posting off, and the "not verified yet" label. Posting is refused with a reason and a way out.
  Verification is a two-check state machine: the email check runs from sign-up, then the CAC check, which allows
  3 tries and fails gracefully once. Every attempt is logged. Interview proposals are planned within the weekly
  allowance (drafts count against it) and name who was left out. The home page puts the one next step first, with
  progress "n of 7 done". The Kora search shows one designed not-started state instead of empty cards.
- **dataviz** (brief pay, message allowance, home progress). `PayRange` is a bullet meter: the usual band, a marker
  for her offer, and direct labels. It has no legend, gives the verdict in words and an icon, and has an `aria-label`
  summary. `Allowance` uses one segment per message, with sent, drafted and free shown by fill and outline and counted
  in words. The home progress bar uses the ink token only.
- **design-elevation**. One elevation level throughout: people, roles and audit are rows inside one sheet, and the
  limits panel is a flat bordered panel inside People. Ink is the only accent; gold stays with Q.
- **ux-writing** (every Q reply in the area). Verification copy says why ("so people can trust the job offers they
  get"), what is limited, and how to fix it. The failed check reads "I couldn't find BN 312456 … 7 digits after RC or
  BN; it may be a typo". "Approve the mandate first" became "Review the brief". The intake asks one question at a time.
- **SwitchRow** (lead's shared component). Kora requirements now use `SwitchRow`, which says On or Off in words. A tag
  says "Must have" or "Nice to have", and one line explains that On means must have.

## Motion (tokens from `src/ds/motion.ts`)
- The pay marker glides to the new value when the brief changes (MO-015, `DUR.slow`, `EASE.standard`).
- The home progress bar grows to the new step (MO-008).
- Verification checks pop in place when their state changes (feedback, `DUR.normal`, `EASE.enter`).
- People rows arrive with `arrive` (MO-011).
- Allowance segments change fill (`DUR.normal`).
- Nothing waits on an animation, and reduced motion is handled globally.

## Pairs (`captures/review/pairs/hire-a/`)
- 01: Funmi's People view after approval. Before: "0 shown", dead end. After: 4 people, the limits panel with
  0 of 3 messages, and a way to verify.
- 02: Draft brief pay. Before: three stacked text bits. After: the `PayRange` bullet meter with a verdict.
- 03: Roles list (desktop). Before: a status as the title, floating cards. After: one sheet of rows with tags and the next step.
- 04: Audit (phone). Before: 330 px of filters and a card per day. After: a two-column toolbar and one sheet of days.
- 05: Founder home (phone). Before: CTA below the fold. After: the next step first, then progress.
- 06: Kora search, not started (phone). Before: squeezed banner and empty cards. After: one explained start state.

## Remaining weaknesses
- People rows still repeat a fact: "Asks about ₦150,000" and "Not shown yet: asks ₦150k+" come from two seed fields.
- The roles list "next" line is text only. A small stage track per role would scan faster.
- `MandateIntake` still edits the legacy `w.mandate` (Senior Backend), not a `MandateX`, so it has no versions view.
- After-captures of Bayo's pages come from `R5.mjs` states, because `capture-all` has no `u_bayo` entry.
- Shared-layer request: expose `orgLimits` and `outreachThisWeek` on `window.__tqQA` in `src/main.tsx`, so
  `R1.mjs` can read the limits from the store directly. It currently checks the org record and the rendered text.
