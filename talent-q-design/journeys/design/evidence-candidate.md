# Design pass · evidence-first, candidate side (build pack 30 Oct; J12 steps 6, 7, 10, 12, 13; pack items D, E, F; P6)

Routes extended, not duplicated: `/c/home` (`CandidateHome` in `routes/entry.tsx`), `/c/passport`, `/c/applications`,
`/c/jobs` and `/c/jobs/:id` (`journeys/talent-b/*`). J7 (`/c/career`) is reused through its own `ta.j7.quiz.start` op.
New pieces live in `prototype/src/journeys/evidence/candidate/` (logic, ProofClass, Requests, Status, Cv, Gap, CSS).
Q: `q/skills/evidence-candidate.ts` (skills and `evc.*` ops) and `q/proactive/evidence-candidate.ts` (5 rules).
Captures: `captures/features/evidence-candidate/{d,m}-NN-*.png` (full page, from the test). The first-render and
corrected sets are in `captures/review/pairs/evidence-candidate/{before,after}/` under the same file names.
`qa/scripts/features/evidence-candidate.mjs` passes 124/124 (62 desktop, 62 phone). T1 76/76, T3 54/54, T4 43/43,
T5 52/52, and privacy.mjs all pass on the same build. No page scrolls sideways at 390 px.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design** → the request card is a small state machine read straight from the shared decision:
  SENT (three choices) → IN_PROGRESS (sample panel; "Save and finish later" keeps the answer) → SUBMITTED
  ("Self-reported, waiting for review") → REVIEWED (outcome and note) or DECLINED. "Share existing work instead"
  is a separate branch: the request stays SENT. Decline and offer open inline forms rather than modals, and both
  have a "Back" way out. Submit stays disabled until there's an answer, with a one-line hint (no error state). A
  proof-class label is a disclosure button, so its meaning appears on demand. The home shows a compact card; the full
  panel lives on Applications ("Carry on with the sample").
- **ux-writing** → no judgement anywhere. Q's CV line: "Every CV line is read as a claim, for everyone, and that
  isn't doubt about yours." The request's why: "Your CV already describes work on Postgres at scale. A short sample
  lets Kora Pay see it directly, instead of a full take-home assessment." Decline: "recorded as declined, not as a
  failed result." Overdue: "That's late on their side. It says nothing about you." Interest: "Not answering yet is
  fine; it isn't a no." Unknown preferences read "Not said". Proper nouns keep their case (Postgres).
- **design-elevation** → Direction D materials. Gold is only Q's: the Q mark, Q's own words in the CV diff, and the
  gold-wash marks. Evidence states use the ink family plus texture. There's one elevation level: the sample panel,
  notes and commitments are flat ruled panels inside the sheet. The J7 card wears a dashed edge, the practice
  language for "private, not proof".
- **design-superpowers:creative** (L2, inside Direction D) → two visual ideas, no new tokens. (1) The proof-class
  stamp: a pill with a shape and the word (dashed for Claim, struck for Disputed) and a small "?" for its meaning.
  (2) The CV diff as "Now / Was": the new line in full with Q's words marked, and the old line muted underneath with
  removed words struck through.
- **dataviz** → the Passport's "proof at a glance" strip is now a part-to-whole bar by proof class. It has a 2 px gap
  and a texture per class: Issuer-verified solid ok, Assessed solid ink, Self-reported hatched, Claim dotted
  outline, Disputed red hatch, Confidential ruled. The key always shows a count, the swatch and the same word. The
  grouped list below is the text alternative.
- **design-critique** → a rendered critique of both widths, below. Defects were fixed and the screens re-rendered.

## Rendered critique (first render), most severe first
1. Sev 3 · H8, readability (CV draft, both widths): a positional word diff across split and reordered lines read as
   noise, with half-struck words and highlights running into each other. → Changed to "Now / Was" per line, with
   set-based marking and the original hidden while a draft is open (pair 10).
2. Sev 3 · H4, H8 (Passport cards): two status pills stacked, "Self-reported" and "Not checked", saying the same
   thing. The class sat under the kind/date line. → The proof class now leads the card header. The check pill shows
   only while a check is in flight or failed, and never alongside "waiting for review" (pairs 01, 05).
3. Sev 2 · Visual hierarchy (Passport, phone): the full CV document pushed "Add proof" two screens down. → The CV is
   collapsed into "Read your CV (6 lines)"; the label and Q's line stay visible (pair 01).
4. Sev 2 · H2 (request card, proactive card, Q replies): "postgres at scale" was lower-cased. → Case-aware wording:
   "your work on Postgres at scale".
5. Sev 2 · Noise (Applications): "No hiring confirmation from this employer" repeated on each application card. →
   Applications show only a confirmation that exists. Jobs keep the explicit absence, because that page separates
   confirmed listings from the rest (pairs 09, 16).
6. Sev 1 · Legend (Passport strip): each key item had both a swatch and a glyph. → Swatch only, matching the bar.
7. Sev 1 · Age line: "seven years old" was bold warn. → Regular weight. It's freshness, not a verdict.

## Requirements covered (evidence = test step names)
- **Item D:**
  - each item shows its class in the recruiter's words, with the meaning on demand;
  - source, age in words, and reuse scope ("Kora Pay only. Not reused for other employers unless you choose");
  - "Stop sharing with Kora Pay" on the card, then "See what Kora Pay sees now";
  - the CV is shown as a claim with a calm Q line.
- **Item E:** "Hiring confirmed by Kora Pay on 27 Oct" appears only for an ACTIVE `proof.intents` confirmation, with
  a "Hiring confirmed" filter and who confirmed it, until when, and the reply commitment. Rivers shows "No hiring
  confirmation". The confirmation is never called verified.
- **Item F:** the J7 card on Tobi's home is private. It offers private practice (J7's own incident quiz), says how a
  reviewed walk-through would become Assessed evidence, and states that he chooses who sees it. The test checks that
  Kora's view is unchanged after practising.
- **Steps 6 and 7:**
  - the request appears on the home and on Applications;
  - "Do it now" runs `ev.sample.start` and opens the simulated panel; submitting runs `ev.sample.submit`;
  - the item then reads "Self-reported, waiting for review";
  - the review outcome shows with the note "shared by Kora Pay".
- **Decline:** `evc.sample.decline` wraps the shared `declineSample` and keeps the optional reason. The state is
  DECLINED, with no result.
- **Commitments and interest:**
  - an open commitment reads "Next update by Mon 2 Nov · Ada Okafor, Kora Pay";
  - Zara's reads as overdue, with Ngozi Eze named as the owner;
  - Tobi's interest is answered from the card, Q or the proactive chip, through `ev.interest.answer`.
- **"What you want":** edited only by the candidate. Blanks stay blank; the save removes fields rather than
  defaulting them. A per-employer switch controls who sees it.
- **P6:**
  - the clearer draft is a Q artifact (ref `evc.cv`) and a Passport section;
  - a guard (`addedClaims`) must find nothing new, and approval refuses otherwise;
  - each draft lists what Q won't add, and evidence links are optional, labelled and candidate-chosen;
  - nothing is sent on approval;
  - "add kubernetes to my cv" is refused with the honest route.
- **Names:** Seyi Okoro and Seyi Balogun stay distinct. Owners and reviewers always appear with surnames.

## Remaining weaknesses (honest)
- The reviewer's note is treated as shared once the decision is REVIEWED, because the shared model has no explicit
  "shared with candidate" flag yet (raised with the lead).
- The employer's free-text `reason` on a request isn't shown to the candidate. Its wording is the recruiter's, and it
  could read as a judgement. The candidate sees a composed "why" instead (raised with the lead).
- Hiding a stale "Q noticed" card while the same request is on the page needs route context in proactive rules,
  which they don't have, so on the home the request appears in both places.
- The CV drafts are authored for Tobi and Seyi Okoro only. Anyone else is told honestly that Q has no CV to work from.
- The sample answer isn't evaluated. Ada's review was injected through the store in the test, in the same way as
  `reviewSample()`.
