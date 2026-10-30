# Design pass · EVIDENCE-FIRST, recruiter side (J12 steps 1–5, 8, 9, recruiter half of 13)

Source: build pack `docs/sources/batch-6/` (00 key example, 02 UI items A–C, 05 P1), `journeys/J12-EVIDENCE-FIRST.md`.
Routes: `/r/home` (attention items, one-click task), Q thread (find and "why" cards), `/r/compare` (new **CV and proof**
view beside the evidence ledger), `/r/people/:id` (CV as a document, gaps, review, proof-class groups, mutual fit),
`/r/roles/:id/rubric` (evidence we accept, effort budget). Captures: `captures/cx/evidence-recruiter/{d,m}-NN-*.png`.
Pairs: `captures/review/pairs/evidence-recruiter/`. Test: `qa/scripts/features/evidence-recruiter.mjs` 99/99 (50
desktop, 49 phone). Simulated data and simulated sends; nothing here was tested with real recruiters.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design** → state machine per requirement: none → ACCEPT_PRIOR (undoable) | REQUEST_VERIFICATION |
  BOUNDED_SAMPLE PROPOSED → (draft → checks → approval) SENT → IN_PROGRESS → SUBMITTED → REVIEWED | DECLINED. Only the
  real (simulated) send moves PROPOSED to SENT (`onMessageSent` hook), so the UI can never claim a request went out
  before approval. Review is a choice of three `ds-opt` cards plus a required note, validated inline on submit (not a
  confirm dialog). "Move both" is one audited, undoable action. Q's stages are words recorded from what it actually
  did (planned, read N permitted people, checked M shared items, done): no artificial delay. Peak-end: the peak is the
  review (both candidates progress on their own evidence); the end is "move both to interview" with undo.
- **dataviz** → form choice for the CV-vs-proof comparison: not a chart and not a score; a two-channel table (CV phrase |
  proof mark + word) because the reader must compare text claims with how each is known. Every state has shape + word
  (`ProofMark`: ring-and-core issuer-verified, disc assessed, open ring self-reported, dashed ring claim, barred ring
  disputed), plus a left rule per cell (solid = shown, dashed = partly or only claimed, none = nothing). A list view is
  the keyboard/phone alternative (on phones the grid is replaced, never shrunk). Rubric weights sit on each requirement
  as in the ledger. Interest is set apart below a dashed rule and never enters the table.
- **ux-writing** → headlines from `SHAPE_WORD` only ("Shows more than the CV says", "Strong claims, limited supporting
  evidence"); "Unknown, not zero" wherever nothing is shared; no reject, liar or "fake" language (the test greps for
  it). The sample request names effort (40 min), offers sharing existing work instead, and says declining is
  "recorded as declined, not as a failed result". Buttons are verb + object ("Accept existing evidence", "Ask to
  verify", "One sample · 40 min", "Record the review"). Long all-caps labels shortened after critique.
- **design-elevation** → one elevation level: the CV slip is a flat paper panel inside the sheet; ink for data and
  proof marks; gold only for Q (the margin rule beside Q's annotations, the stage "done" diamond, the review panel's
  edge while it waits on a person). Fraunces for the per-person headline and CV quotes, Plex Mono for labels.
- **design-superpowers:creative** (maturity L2: Direction D exists, so no new tokens) → art direction for the "CV vs
  proof" moment: the CV is shown as the document it is, with claims underlined in a wavy proofreader's line and Q's
  reading of each claim in the margin, like an editor annotating a manuscript. Used only on the profile; the
  comparison stays a quiet table.
- **design-critique** → run on rendered 1440 and 390 screenshots (below), fixes re-rendered.

## Critique of the first render (severity 0–4) and fixes
1. (3, H2 accuracy) The CV column quoted Seyi Okoro's whole headline line for Payments, Go and Postgres alike. **Fix:**
   `cvLineFor` quotes the most specific phrase that speaks to that requirement ("owned Postgres performance tuning end
   to end", "Go at scale"). Pair 01.
2. (3, match to the journey) Seyi Okoro's next step proposed a Payments sample; Tobi's proposed accepting Payments. The
   story's open question is Postgres. **Fix:** the next step prefers a claim with partial support (closest to settled)
   and reuse where the CV says nothing at all (what a keyword search misses). Pair 01.
3. (2, H2) Profile said "Claimed, not yet shown: … Postgres, On-call" while partial self-reported items exist. **Fix:**
   "Claimed, without reviewed or checked support yet". Pair 04.
4. (2, H4) "Impressive CV, thin evidence" banner contradicted the pack's wording. **Fix:** "Strong claims, limited
   supporting evidence". Pair 02.
5. (2, ux-writing all-caps ≤3 words) Phone labels "INTEREST · ASKED SEPARATELY, NEVER SCORED" and "YOUR NOTE (GOES ON THE
   RECORD…)" wrapped as shouting. **Fix:** short label + sentence-case helper. Pair 05.
6. (2, H8) Q's reply repeated a name ("Tobi … , Tobi even though…"). **Fix:** two short sentences. Pair 03.
7. (1) "Nothing shared yet" put its glyph on its own line. **Fix:** inline row.
8. (2, names, CL-03) "Seyi's interview invitation" on Q Home (colleague) beside the candidate Seyi Okoro. **Fix:** a
   colleague who shares a candidate's first name is shown with the surname; candidates likewise (`firstName`,
   hire-c `firstOf`).

## Remaining weaknesses (honest)
- The profile is long on phones (now eight index stops). A collapsed "Close only the gaps" would help.
- The CV margin notes stack under each line at every width; a true side margin at desktop needs the sheet wider.
- Seed strings still say "Seyi’s account…" / "What Seyi says…" (state/seeds/proof.ts), and the rubric Scorecard says
  "Seyi is compared…": owned elsewhere, reported to the lead.
- Q's find is rule-based (regex to requirement), not semantic retrieval; ESCO links are not used yet.
