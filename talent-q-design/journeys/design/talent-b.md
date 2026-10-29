# Design pass · talent-b (T3 Tobi, T5 Zara)

Routes: `/c/passport` (Proof, Sharing, Summary, Search), `/c/jobs`, `/c/jobs/:id`, `/c/applications`, `/c/prep`,
`/c/memory`, plus Q reply cards `tb.evidence|uploads|summary|match|apps`. After captures:
`captures/review/after/{desktop,phone}/p_tobi_*`, `p_zara_*` and key states `talent-b_state_*`.

## Defects found (most severe first)
1. Recruiter search explained a rule that wasn't the enforced one ("verified employers and agencies" is really
   "any org with a checked domain"), never mentioned that applying/sharing keeps an org able to see you, and
   showed no preview of who can find you.
2. Passport items: ten equal-weight cards, each repeating a 30-word verification paragraph; no portfolio summary;
   the preview opened at the top of the page, far from the card that opened it.
3. Phone: the fourth Passport tab ("Recruiter search") was hidden off-screen in a sideways-scrolling strip.
4. Disclosure matrix: every cell a heavy pill, "Not shared" as loud as "Shared"; public items shown as "Public"
   for organisations that can't see the person at all (dishonest).
5. Jobs: 12 identical cards with 12 black "Open" buttons; fit dots with no key; 0-of-3 roles mixed with fits.
6. Job detail: signals as tag + paragraph pairs; "Not for me" buttons floating mid-sentence; fit as loose tags.
7. Quiet buttons ("This is wrong", "Practise with Q", "Delete…") looked indented and orphaned; disclosure
   summaries lost their markers; kickers crammed facts and truncated on phones.

## Skills → screens → changes
- **design-critique** (all routes). Hierarchy: Passport now leads with a portfolio header and groups proof by
  weight (Checked / Waiting / Your own / Confidential); jobs split "Closest to your proof" vs "Other open roles";
  one primary per card ("View job" outline, Save as a star toggle). Excise: per-card verification essays removed
  (one "What the labels mean" disclosure). H2/H5: Withdraw moved into the application's timeline disclosure.
- **design-elevation** (Passport, job detail, prep, memory). One heading style (`tb-h2`, voice 22 px), counts as
  quiet pills, card footers separated by a rule, evidence as chips that link to the Passport item, fit as three
  tiles, memory as one ruled list instead of four floating sheets (single elevation), interview hero with date in
  the voice face, likely questions set as quotations.
- **interaction-design** (Passport, sharing, uploads, memory). Preview opens in place after its card and scrolls
  into view; selected card ringed; "Preview" ⇄ "Close preview" with `aria-expanded`; matrix cells "+ Share" /
  "● Shared" / "Access ended" states; per-org Hide/Stop hiding in Search; demo failure toggle uses the shared
  `SwitchRow`; `tb-linkbtn` keeps 44 px targets for quiet actions.
- **ux-writing** (all). Verb-first upload buttons ("Upload a certificate"); short tab labels Proof / Sharing /
  Summary / Search; one-line kickers ("Private to you", "12 open roles"); "Correct this" instead of "This is
  wrong"; empty states rewritten with a next step (Passport, jobs filters, applications, memory); search options
  renamed "Checked employers only" / "Employers and agencies" with copy matching `canDiscover` exactly.
- **dataviz** (Passport proof strip, job fit line). Part-to-whole strip: 12 px, 2 px gaps, 4 px ends, legend
  with direct counts always present, confidential uses texture (CVD/print). Validator run on the status set:
  CVD and normal-vision separation pass; gold moved to `--gold` and own-uploads to ink-400 to clear contrast;
  the remaining lightness/chroma FAILs are categorical-only checks that don't apply to a status + neutral set.
  Fit pips are shape-coded (Glyph vocabulary) with a key and a numeric label; no colour-only meaning.
- **creative** (candidate warmth, L2 — Direction D constrains). Kept paper/ink/gold-for-Q; warmth through
  address ("Tobi, 4 of your 10 items are checked…"), encouraging group notes ("Still useful; they just carry
  less weight") and the person's name as the portfolio title. No new tokens.

## Privacy wiring
`reachOf()` (logic.ts) takes each organisation's verdict only from `canSeeCandidate` / `relationshipWith` /
`canDiscover` and adds a plain reason; Search shows "N can see you · M can't" with reasons. `cellOf` now
returns `PUBLIC_UNSEEN` when `canSeeCandidate` is false; Q's "what does X see" reads `visibleEvidence` directly.

## Motion (tokens only)
MO-033 preview and "see it as they do" panel arrive with `arrive` (200 ms decelerate); MO-029 matrix cells
change colour at `--motion-quick` (160 ms); MO-016 upload bar width at `--motion-base`; disclosure chevrons
turn at 160 ms; receipts arrive with `arrive`. Nothing delays an action; reduced motion is global.

## Before / after pairs (`captures/review/pairs/talent-b/`)
- 01 desktop Passport: flat card wall → portfolio header, proof strip, grouped by weight.
- 02 desktop Search: three vague options → accurate options, live "who can see you" list, plain rules.
- 03 phone Sharing: pill clutter and odd wrapping → one row per organisation with a clear cell.
- 04 desktop Jobs: 12 equal cards → grouped by fit, keyed pips, one primary action.
- 05 desktop job detail: tag/paragraph pairs → evidence chips, fit tiles, signal list, aligned suggestions.
- 06 phone Passport top: hidden fourth tab, wrapped button row → four tabs fit, personal header first.

## Tests
T3 54/54, T5 52/52, privacy.mjs all pass. Selector updates only: T3 clicks the "Sharing" tab (renamed),
T5 reads the jobs list from `.tb-jobs` (two grids now). Lead's `role="switch"` edit to T5 kept.

## Remaining weaknesses
- Canvas `aside` (Save) stacks above the content on phones on job detail; that's the shared Canvas layout.
- `/settings` links to `/c/passport`; it should link to `/c/passport?tab=discovery` (shared file, lead's).
- Matrix columns are a fixed demo set (`viewerOrgs`); production needs search/add for more organisations.
- Proof strip has no hover tooltip beyond `title`; legend counts carry the data. Q reply cards are restyled but
  their wording is unchanged; previews of documents are still static simulations.
