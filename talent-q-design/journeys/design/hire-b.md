# Design pass · hire-b (R2 Ada, non-technical recruiter hiring engineers)

Routes: `/r/compare`, `/r/people/:id`, `/r/interviews`, `/r/interviews/:id`, plus Q reply cards. Captures in
`captures/review/after/{desktop,phone}/u_ada_r_*.png` and the states `u_ada_r2_*.png`; journey states in `captures/cx/R2/`.
`R2.mjs` passes 74 of 74 steps on desktop and phone. `privacy.mjs` passes. No page scrolls sideways at 390 px.

## Defects found (most severe first)
1. Comparison: the evidence table scrolled sideways (the fourth person was cut off on desktop). There was no chart:
   strength showed only as small glyphs and counts like "3 verified, 0 evidenced…". Weighting was invisible.
2. Comparison: the controls took the first screen on phones (11 black pills). The title was a three-line sentence that
   repeated the first note. Nothing said what had changed after a change; the order change was only in Q's text.
3. Profile: the brief fit was below seven evidence items and the viewer. Provenance used four mono labels per item.
   Pipeline stages looked like buttons. "How to check" repeated the same sentence three times.
4. Copilot: there was no progress or coverage. The rubric was 15 identical pills. The vague-answer follow-ups sat
   under the form. "Before the interview" evidence was missing, so Ada couldn't see what to probe.
5. Interviews list: there were five floating cards and no time hierarchy. The title said "0 waiting". The next
   action was missing.
6. Q replies: the challenge and question replies were walls of bullets in serif text in the thread.

## Skills → screens → changes
- **dataviz** (choosing-a-form, marks, interaction, anti-patterns, palette validator) → `/r/compare`, profile, Q cards.
  New `journeys/hire-b/Ledger.tsx`. Rows are people (ranked) and blocks are requirements. **Block width = weight**,
  so Q's 1.5× on payments is visible and "weigh equally" morphs the widths. **Shade = evidence strength** on one
  ordinal ink ramp, validated with `validate_palette.js --ordinal` (#b9b1a3/#5d5648/#16140f on #fffdf8, all pass;
  "not shown" is the track, not a mark). There is a 2 px surface gap, 4 px rounded ends, a glyph in every block,
  a word where it fits (container query, never clipped), a legend for ≥2 series, and a hover/focus tooltip with a
  24 px+ hit area (44 px tall). The table view twin is kept ("The evidence behind each block"). Filters sit in one
  row above the chart. The title states the finding.
- **design-critique** → all four pages. Information order follows the task: profile = name + Q lede → where they
  are → fit against the brief (one-row ledger, then a row per requirement linking ↓ to the items it rests on) →
  shared items grouped "Checked at the source / Not checked yet / Confidential" → viewer → questions. The
  interviews list is grouped by next action (Disputed, Waiting for your feedback, Coming up, Not scheduled, Done)
  with a date block and one action per row. There is one elevation level, so groups are sheets with flat rows.
- **interaction-design** → state machines and motion with `ds/motion.ts` tokens. MO-013: ledger rows re-order with
  `layout` and block widths ease (`DUR.slow`, `EASE.standard`). The "What changed" note arrives (`arrive`).
  MO-022: the question rail shows asked, noted and rated per question. MO-023: follow-ups arrive beside the
  question the moment a note is vague. MO-019: question text is keyed by question. MO-033: the viewer frame arrives
  per project and file, behind a skeleton while GitHub is checked. The inspector scrolls into view on selection
  (smooth unless reduced motion). Rubric and overall rating are segmented controls (44 px, ✓ + fill, never colour
  alone). On/off settings now use the shared `SwitchRow` (lead's request).
- **ux-writing** → titles became findings ("Tobi has the strongest evidence. Ifeoma is next"; "1 disputed result
  needs a review"; "Kunle's interview is done"). "What changed" is written in plain words ("You took out Zara,
  Payments and Postgres. Kunle moved up from 3rd to 2nd."). The lede is generated in sentences ("Checked evidence
  for payments, Go and Postgres. On-call leadership and mentoring aren't shown yet, so ask in the interview.").
  Fixes: list grammar ("Tobi, Kunle and Zara's"), "(—)" removed from "how to check", and the question-order claim
  corrected to "must-haves first, the least-shown first". The withdrawn state now explains what remains.
- **design-elevation** → one accent rule: gold only for Q (the lede diamond, Q's notes, "What changed", follow-ups,
  the 1.5× marker). The ink ramp is for data. Kickers are one line (`Senior Backend Engineer · comparison`,
  `Candidate · Senior Backend Engineer`, `Interview · Ifeoma Obi`). `tabular-nums` is used only where numbers align.
- **Q reply cards** (`journeys/hire-b/refs.tsx`): `hb.ledger` (a compact ledger on every compare reply),
  `hb.reason` (requirement × two people with "X ahead", for "why is Tobi stronger"), `hb.questions` and
  `hb.followups`. The reply text is now one or two sentences, and the card carries the structure.
- **design-superpowers:creative**: not used (recruiter area, not talent).

## Before/after pairs (`captures/review/pairs/hire-b/`)
- 01: Compare, desktop. A sideways-scrolling glyph table becomes the weighted evidence ledger with margin notes,
  and the table fits.
- 02: Compare, phone. Controls folded to a one-line summary, the chart on the first screen, compact cards.
- 03: Challenge reply. A wall of bullets becomes a short answer plus a requirement-by-requirement card, with
  "What changed" on the page.
- 04: Live copilot. Question rail, "before the interview" evidence, follow-ups beside the question, segmented rubric.
- 05: Profile. Fit against the brief moved up and linked to its evidence. Provenance on one line. Grouped items.
  Contextual GitHub outage.
- 06: Interviews. Grouped by next action, with a date block, a primary action per row and counted filters.

## Remaining weaknesses (honest)
- The phone ledger hides block words under about 92 px, so on phones the glyph + legend + table carry the level.
  The tooltip is hover/focus only (tap opens the inspector instead).
- Profile on phones is still long (about 9 screens for Tobi). A sticky in-page index would help.
- The copilot doesn't track time per question. "Previous / Next" and the rail duplicate each other on desktop.
- The canvas header puts the aside actions on a second row when the title is long (shared `Canvas`, not changed).
- The weighting is still rule-based (1.5× fixed). The ledger explains it, but Ada can't set her own weights by
  dragging; she can only turn Q's weighting off.
