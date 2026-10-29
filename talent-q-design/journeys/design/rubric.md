# Design pass · RUBRIC (audit addendum §E: evaluation studio, scorecard, candidate explanation)

Routes: `/r/roles/:id/rubric` (new), `/r/people/:id` (scorecard, inspector, history, page index), `/r/compare` (rubric
weights), `/c/applications` (the person's own ratings). Captures: `captures/cx/rubric/{d,m}-NN-*.png`, copied to
`captures/review/after/{desktop,phone}/u_ada_rubric_*.png`. `qa/scripts/features/rubric.mjs`: 85/85 (41 desktop, 44
phone). No checked page scrolls sideways at 390 px. Nothing here was usability-tested with real people.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design** → studio state machine (none → Q_PROPOSED → edited → APPROVED frozen → draft v+1 → change notice
  → NOTIFY_AND_REASSESS | KEEP_FOR_ROUND). "Provide choices, don't ask questions": the notice is two `ds-opt` cards that
  each say their consequence, not a confirm dialog. Undo instead of confirm for overrides. Override is a segmented 0–4
  control plus a required reason, validated inline on save. Motion: share bars ease on weight change (`DUR.slow`,
  `EASE.standard`), the notice arrives with `arrive`; nothing functional waits on animation.
- **ux-writing** → titles are subjects ("Senior Backend Engineer rubric"); status in tags, not kickers. Q's lede says
  what it did ("I drafted 4 scored criteria … left out mentoring until it's defined"). Refusals follow [what] + [why] +
  [instead]. The index is only ever written "62 at 55% coverage"; on the candidate side it's translated into plain words
  ("63 out of 100 on the 50% of the rubric your evidence covers … isn't a score of you as a person"). "Unknown, not zero"
  is said wherever the index appears. Buttons are verb + object ("Approve v2…", "Ask for a correction", "Save the change").
- **dataviz** → form choice: part-to-whole per criterion = one horizontal share bar each, one ink hue (the hire-b ordinal
  ramp, already validated with `validate_palette.js --ordinal`), direct % label and weight; never a pie. Rating = 4-cell
  ordinal meter with "3 of 4" text (high uncertainty drops one ramp step, and the word says it). Index = a stat tile with
  coverage as a segmented meter (reviewed vs proposed by shade + the sentence). Comparison ledger: block width now = the
  rubric weight, header reads "weight 2"; the margin note names the version and approver.
- **design-elevation** → one elevation level (criteria are sheets with two flat columns), gold only for Q (the proposal
  column wash, "Why Q proposed it", the lede diamond), ink for data, tabular numbers only where they align.
- **design-critique** → run on the rendered screenshots below (heuristics + severity), fixes re-rendered.
- design-superpowers:creative: not used (recruiter surfaces; the candidate block reuses talent-b's warm tokens).

## Critique of the first render (severity 0–4) and fixes
1. (3, H8 minimalism, excise) Studio was 5,568 px tall on desktop: every criterion's anchors appeared twice (Q and yours
   identical). **Fix:** Q's column shows only what differs ("Your version matches Q's proposal" or "You changed weight (Q
   proposed 1)" + the differing levels); columns 0.8 : 1.2. Now ~4,800 px with the same information.
2. (2, H4 consistency) Right-to-work and compatibility were drawn as full criteria with "Not met ×3" anchors. **Fix:** a
   compact "Conditions and the candidate's side (not scored)" panel.
3. (3, Fitts / visibility of the primary action) "Approve" sat at the very bottom. **Fix:** a sticky draft bar under the
   lede with the change count and the approve button (kept the full approve section with the diff too).
4. (2, H8) "Below the minimum flags…" repeated in every criterion. **Fix:** said once under the share bars.
5. (2, H2) On phones the change notice sat below the long validation banner. **Fix:** notice first, lede rewritten to the
   decision; banner follows.
6. (2, H2 match real world) The candidate saw "63 at 50% coverage" with no translation. **Fix:** plain-language sentence
   plus "Not rated yet … don't count against you" with an aligned glyph.
7. (2, H8 repetition) Comparison listed "No index yet: nothing rated" four times. **Fix:** one sentence until someone is rated.
8. (1, H2) Ledger head said "w2". **Fix:** "weight 2". Scorecard header duplicated the index. **Fix:** shows the version;
   a sentence explains fit (strength of proof) vs scorecard (level shown) as separate signals.

## Before/after pairs (`captures/review/pairs/rubric/`)
- 01: Studio, desktop: duplicated Q/you columns → Q shows only differences; sticky approve; compact unscored panel.
- 02: Comparison, desktop: fixed 1.5× (old render had rubric already) → "weight 2" heads, one-line empty scorecards.
- 03: Candidate's own ratings: jargon index → plain words; correction request on the right rating.
- 04: Change notice, phone: notice below the banner → decision first, lede states the decision.
- 05: Profile, desktop: duplicated index in the header → version label and the fit-vs-scorecard sentence.

## Requirement IDs prototyped (evidence = step names in `rubric.mjs`)
AD-E-01 (proposal with anchors, evidence, questions, method, weights, minimums, ESCO illustrative ids), AD-E-02 (side by
side, approve → frozen), AD-E-03 (ratings bound to `{rubricId, v}`; v1 in force for the round), AD-E-04 (change notice,
both choices, v1 ratings unchanged), AD-E-05 (eligibility/compatibility outside the index; fit vs scorecard), AD-E-06
(refusals: accent proxy, age, eye contact; logged), AD-E-07 (revisions with who, when, diff; edit log), AD-E-08
(not-validated banner), AD-E-09 + AD-B-05 (comparison weights from rubric v1 with margin note; equal-must-have fallback
labelled), AD-E-10/11 (index only with coverage; unknown not zero), AD-E-12 (inspector: evidence, timestamps,
freshness, reliability, why), AD-E-13 (override needs reason, audited, undo; Q asks for a missing reason), AD-E-14
(candidate view + correction request + proactive card), AD-B-03 (sticky page index on the profile).

## Remaining weaknesses (honest)
- Studio is still long on phones (~11,500 px at 2×); a per-criterion collapse would help. Anchor editing is inline inputs
  saved on blur, without per-field undo.
- KEEP_FOR_ROUND has no "start the next round" control yet; v2 waits indefinitely.
- Q's proposal and evidence ratings are rule tables, not a model; ESCO ids are illustrative.
- The comparison ledger (evidence strength) and the scorecard (anchored level) can disagree; they're labelled as separate
  signals, but recruiters may still read them as one. Needs testing.
- Media-based ratings in the test are injected the way the MEDIA builder writes them; the joined J11 run is the lead's.
