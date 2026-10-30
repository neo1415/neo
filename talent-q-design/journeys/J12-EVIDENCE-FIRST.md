# J12: evidence-first hiring, the defining Talent Q experience

Source: Consolidated Build Pack (30 Oct 2026, `docs/sources/batch-6/`): 00 "the key product example", 02 UI improvements A–H, 05 scenario P1.
Method: `design-skills:journey-mapping` (usage story, peak-end). This is a proto map; the cast is fictional.

**Promise under test:** "Find the people who can do the work, not merely the people who write the best CVs. Show the proof, close only the gaps, and move the opportunity forward."

## Rules the experience must keep (from the pack, enforced in code)

- An unverified claim is not incompetence.
- A demonstrated sample is not guaranteed performance.
- Q's analysis is not the hiring decision.
- Missing CV keywords never reject anyone.
- A polished CV is never treated as verified competence.
- Weak writing is never treated as evidence of skill.
- Unknown is not zero.
- Candidate interest is a pending check, not a score.
- No outbound message without approval.

## Cast

- **Ada Okafor** (recruiter, Kora Pay), hiring a Senior Backend Engineer (`m_backend`). Rubric approved, or approved during the journey.
- **Tobi Adeyemi** (`p_tobi`). Thin CV: no "Postgres", vague on payments. Reviewed evidence he chose to share with Kora:
  - reconciliation project;
  - Postgres tuning exercise;
  - debugging work sample (`e_tobi_incident`).
- **Seyi Okoro** (`p_seyio`, new). Polished CV naming all five requirements. Behind it:
  - CV claims;
  - a 2019 certificate the issuer hasn't confirmed;
  - a project he describes but hasn't shown.

  Not to be confused with Seyi Balogun, Kora's engineering manager (ledger CL-03).
- **Dele** (agency): must not see Kora's rubric (not even whether one exists), Seyi Okoro (verified employers only), or anything Tobi shared only with Kora. Tobi chose to share three items with Talentbridge himself; Dele sees exactly those.

## Steps (desktop and phone)

| # | Who, where | Says or does | What the person sees | Owner |
|---|---|---|---|---|
| 1 | Ada, `/r/home` | "find someone who can troubleshoot Postgres, not just list it on a CV" | Q streams its work with truthful stages: planning; reading permitted candidates; checking evidence. Then a result card: Tobi (Postgres shown by two reviewed items, though his CV never names it), Ifeoma (Postgres partial), Seyi Okoro (CV says "Postgres performance expert"; the only support is a 2019 certificate waiting on its issuer). No one is rejected for missing keywords. Chips: "Compare Tobi and Seyi Okoro", "Why is Tobi worth a look?" | RECRUITER |
| 2 | Ada, Q | "why is Tobi worth reviewing when his CV is weak?" | Q cites the items (source, reviewer, date, limits) and says plainly that the CV's wording isn't evidence either way, and what is still open (on-call: partial). | RECRUITER |
| 3 | Ada, `/r/compare` (new **CV and proof** view) | Opens the view, or Q's chip | Per requirement, side by side: what the CV says vs what the evidence shows (proof class: Claim, Self-reported, Assessed, Issuer-verified, Disputed). A headline state per person: "Shows more than the CV says" / "Strong claims, limited supporting evidence". A next step per person. | RECRUITER |
| 4 | Ada, `/r/people/p_seyio` | Opens Seyi Okoro | The CV shown as a document with its claims marked; the evidence list by proof class; mutual fit as a separate, candidate-shared panel (unknowns shown as unknown). Actions: accept existing evidence, ask for verification, or one bounded work sample (40 min, Postgres) instead of the full take-home. | RECRUITER |
| 5 | Ada | "accept Tobi's Postgres evidence, no retest" · "ask Seyi Okoro for one short Postgres sample instead of the full assessment" | Tobi: an ACCEPT_PRIOR decision, audited. Seyi: a BOUNDED_SAMPLE decision, then an in-app request drafted through correspondence, approved by Ada, sent (simulated). | RECRUITER |
| 6 | Seyi Okoro, `/c/home` → `/c/applications` | Opens the request | A respectful explanation ("Kora would like to see one piece of Postgres work; your CV already describes it"); the effort (40 min); choices: do it now, share existing work, or decline (recorded as declined, not failed). Q never calls the CV untrue. | CANDIDATE |
| 7 | Seyi Okoro, `/c/passport` | Sees his items | Proof classes in the same words Ada sees. Does the sample (simulated) and submits it: "Self-reported, waiting for review". | CANDIDATE |
| 8 | Ada, `/r/people/p_seyio` | "review Seyi Okoro's sample" → marks it "shows part of it" with a note | The sample becomes Assessed (partial); the comparison updates; the decision is audited with the reviewer and the note. **Peak:** both candidates progress on their own evidence. Ada: "move both to interview". | RECRUITER |
| 9 | Ada | "is Tobi interested?" → interest request approved and sent | Candidate interest is a pending check, shown separately from suitability. | RECRUITER |
| 10 | Tobi, `/c/applications` | Confirms interest | The job shows "Hiring confirmed by Kora Pay on 27 Oct" (participating employer only). The application shows Kora's commitment: next update by a date, and who owns it. | CANDIDATE |
| 11 | Ada, `/r/messages` | "email Tobi an interview invite for Thursday or Friday" | The existing email flow: approval bound to the exact content; status "accepted by Google (simulated)". | existing (email) |
| 12 | Tobi, `/c/home` | Q card | J7 responds to the open gap (on-call leadership: partial). A private practice suggestion, never visible to employers, and how a reviewed incident walk-through would count. **End:** Tobi knows what happens next and what would strengthen his case. | CANDIDATE |
| 13 | Tobi, `/c/passport` | Stops sharing the debugging sample with Kora | Ada's comparison and the Q result card update immediately; nothing cached keeps it. | CANDIDATE + RECRUITER |
| 14 | Dele, `/r/home` | "show me Kora's rubric" · "show me everything about Tobi" | Refused without revealing whether anything exists. | existing (privacy) |

## Moments of truth

- **Step 1 (the first screen):** Tobi is not missing.
- **Step 3 (understanding):** the difference between the two candidates is visible as evidence, not as a judgement.
- **Step 8 (the peak):** Seyi is not punished for lacking proof yet. He is asked for one bounded piece of it, and both progress.
- **Step 12 (the end):** the candidate leaves with a fair status and a way forward.
