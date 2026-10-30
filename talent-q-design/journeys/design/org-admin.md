# Design pass · org admin (coverage brief 30 Oct; SC-020, 021, 023, 024, 025, 140, 141, 142, 144, 145, 146; V03, V09, V29; MO-035)

Extended beside the existing pages, not duplicated: `/r/team`, `/r/setup` and `/r/audit` stay where they are. The
Admin hub (`/r/admin`, rail group Organisation, order 33) links to them and to `/settings/email`. Email templates
are read from the email policy (`state/areas/mail.ts`), not copied. The rail gains **one** item (the hub). Each section
nests under `/r/admin/*`, so the rail still marks where you are. The candidate's channel choices live at
`/settings/channels`, beside `/settings/email`.

Code: `prototype/src/journeys/org-admin/` holds `model.ts` (access table, derived figures, every `oa.*` op), `Frame.tsx`
(the shared frame, hub and MO-035 budget warning), `PagesOrg.tsx`, `PagesOversight.tsx` and `org-admin.css`. The rest
is in `state/areas/org-admin.ts`, `routes/org-admin.tsx` and `q/{skills,openers,proactive}/org-admin.ts`.

Tests: `qa/scripts/features/org-admin.mjs` passes **174/174** (85 desktop, 89 phone). These also pass on the same
build:
- privacy.mjs: all checks
- R3: 48/48
- R4: 72/72
- R5: 67/67 (the first run had one timing flake on the 9-second sourcing wait; the rerun was clean)

axe (WCAG 2.1 AA) reports 0 violations on all 15 admin views at both sizes, after one fix. No page scrolls sideways at
390 px, and body text is at least 12 px. Captures from the test are in `captures/cx/org-admin/{d,m}-NN-*.png`.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design**: every admin action is a small state machine read from the store.
  - Channel: NOT_STARTED → CODE_SENT → IN_REVIEW → VERIFIED, or FAILED. A wrong code changes nothing.
  - WhatsApp: AWAITING_APPROVAL → ACCEPTED → DELIVERED → READ, or FAILED. Each step is a separate simulated provider
    update.
  - Invoice: NONE → DRAFT (step n of 3, resumable) → READY → MARKED_SENT. Paid stays UNKNOWN until marked.
  - Budget: under → past 80% → STOP (paused) or SPEND (cap raised).
  - Destructive actions are confirmed in place (ConfirmButton): delete records, retire a template, pause a version.
  - Rejecting a learning needs a reason. Approve stays disabled while a template line is flagged; a screen-reader
    hint explains why.
- **ux-writing**: amounts read "Hypothesis, not a price" and "None taken. No card on file." Other key copy:
  - "Not asked is not a yes, and it isn't a no either."
  - "Accepted isn't delivered."
  - "Talent Q can't see your bank, so this is your word."
  - Retention rows read "Proposed · D9 open".
  - Quality checks read "Not run · needs D17" and "Too few to tell", never a number.
  - Permission states say who can, and that asking Q won't reveal it either.
  - The placement denial names no agency.
- **design-elevation**: Direction D only.
  - One elevation level: the budget warning is a flat panel inside its sheet (critique fix).
  - Data marks are ink. Gold appears only on Q's chips and cards.
  - `--warn` is used only as a status colour (the budget threshold mark and the warning rule), always with words.
  - Section switching uses the existing pill language; on phones it becomes a select.
- **design-superpowers:creative** (L2, constrained): the work stayed inside Direction D, with no new tokens, faces or
  colours. The one visual idea is the provider ladder: ✓ / ○ marks with words across accepted, delivered and read. It
  reuses the shape-not-shade rule from Glyph.
- **dataviz**: usage meters, the time-to-shortlist bars and the reports.
  - Each chart is a single series in ink, with direct value labels and a recessive track.
  - The threshold is a 2 px marker.
  - Every chart has a Table view, and the engagement data is a table from the start.
  - A bar's hover title repeats its value.
  - No dual axes. No colour for identity, because there is only one series.
- **design-critique** (on the first renders, below) and **accessibility** (axe pass): the first render had a
  contrast failure on the "Show the n lines" link (`ds-linkbtn` is styled for ink). It now uses ink-2 with an
  underline on paper.

## Rendered critique (first render), most severe first
1. **Models on a phone was a 9,500 px scroll** (Miller's law, progressive disclosure; severity 3). Six tasks each showed
   a full definition list. Fix: the route stays visible, and the tier, budget, timeout, cache and issues sit behind a
   `<details>` summary ("Budget 1,500 tokens · timeout 6 s · issues"). The phone page is about 25% shorter.
2. **The billing meter near its limit was shown by colour alone** (H1, WCAG 1.4.1; severity 2). The "Live roles" bar
   at 80% was only darker. Fix: it now also reads "Near the limit · 80%."
3. **Two stacked info banners on Bayo's reports** (H8, minimalist; severity 2). Fix: the generic "you can read this"
   banner is dropped on read-only report pages, and the role-scope banner stays. The value "4 d" wrapped onto two
   lines; it now reads "4 days" and doesn't wrap.
4. **The budget box sat inside a sheet** (Direction D: one elevation; Common Region; severity 1). Fix: it is flat
   inside a sheet, with a left warn rule when over the threshold. The demo trigger moved under it and is labelled
   "Demo: record 3 more runs", so it no longer competes with the heading.
5. **The channel lede's grammar** (content; severity 1). It read "Text messages (SMS) and WhatsApp and Phone calls
   aren't verified". Fix: a list join with lower-case labels after the first.

## Before/after pairs
- 01: Billing, desktop. The nested budget box and the colour-only near-limit meter become a flat panel with words.
- 02: Models, phone. Each route's details now sit behind a summary line.
- 03: Reports as Bayo, desktop. The duplicate banner is gone and the bar value no longer wraps.
- 04: Channels, desktop. The verification lede's list grammar is fixed.

## Requirements covered (evidence = test step names in `qa/scripts/features/org-admin.mjs`)
- **SC-020**: own instructions, override shown, add by Q and on the page, loading, error and empty states.
- **SC-021**: three template kinds, Q flags a state-of-origin question, a recruiter can't approve, the email
  templates are reused, and the template is fixed and approved by asking Q.
- **SC-023 / V09**:
  - Verification states, including a wrong code.
  - The consent table, where unknown is not zero.
  - A WhatsApp draft from a template, kept with thread `t_zara_kora`.
  - Accepted → delivered, with read "not yet".
  - No message to Tobi, who was never asked.
  - Call eligibility checks.
  - Asking for consent, and the candidate's opt-in by Q. Zara sees the message.
- **SC-024 / MO-035**:
  - The hypothesis label and no payment.
  - Meters with a table view.
  - No warning at 76%; the warning and the decision appear at 82%.
  - A `budget.threshold` event and a Q card.
  - Request approved by Q, and the pause stops new runs.
  - Reduced-motion text.
  - The recruiter sees usage only. Bayo is refused on the page and by Q.
- **SC-025 / D9**: five rows marked proposed, recordings by design, a D9 answer from Q, deletion with a receipt that
  removes the pipeline entries (shared state), a SHARED event to Grace, and a simulated export.
- **SC-141**: the four areas, unknown consent, an incident resolved with a note, and the recruiter refused.
- **SC-142**: four days to shortlist from the pipeline, engagement, cost labelled, the table alternative, and Bayo
  seeing fewer roles and no cost.
- **SC-144 / V03**: routes with budget, timeout and fallback, labelled simulated. Q explains them. The simulated
  timeout uses the fallback route. Pausing a rollout affects Kora only. Not validated (D17).
- **SC-145 / D17**: adverse impact not run, no percentage or ratio on the page, never-scored signals enforced, Q lists
  the statuses, and a run is recorded.
- **V29**: provenance shown, private practice never used, a reason required to reject, approved learning becomes
  Ngozi's instruction and shows on SC-144, nothing applied while Talentbridge has learning off, and tenancy holds.
- **SC-146**: terms, health and no scraping, and a renewal request with no payment.
- **SC-140**: attribution, consent, dispute and invoice step. Zara never appears to the agency. The invoice resumes,
  a consent request is a shared event, the dispute is settled, and paid stays unknown.
- **Tenancy and roles**:
  - Kora is refused placements and sees no agency name.
  - Dele sees only Talentbridge compliance and templates.
  - Bayo's overview is smaller than Ada's, and he is refused the model inspector.

## Remaining weaknesses (honest)
- The section switcher has 12 links. On desktop it wraps to two rows (Hick's law). Grouping it as You, Organisation
  and Oversight, as the hub does, would read better.
- WhatsApp messages sit beside the M9 thread (same `threadId`), not inside `thread.messages`. `Msg.channel` has no
  `WHATSAPP` value, and adding one would break the exhaustive `CHANNEL_LABEL` record in hire-c. Suggested shared
  change: add `'WHATSAPP'` to `Msg.channel` and label it there. Until then `/r/messages` doesn't show WhatsApp lines.
- Usage figures other than live roles are seeded, simulated numbers. "Agent runs" is not yet counted from real
  planner runs.
- Report bars use the role's first version date. Kora's original Senior Backend mandate has no stored creation date,
  so it uses a fixed opening date of 20 Oct.
- Accessibility was checked with axe and keyboard reachability. There has been no manual screen-reader pass. The
  MO-035 clip (MP4) is not recorded, only the working state and captures.
- On a phone, the route buttons in Models stack one per row. They are usable but take more space than they need.
