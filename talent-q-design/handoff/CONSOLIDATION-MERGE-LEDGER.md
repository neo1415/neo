# Consolidation merge ledger (Build Pack, 30 Oct 2026)

Sources: `docs/sources/batch-6/00`–`05`, read in full. These files **add and prioritise**. They delete or supersede nothing in the founder atlases (183 screens, 57 motions, 41 vision groups), the addenda, the decision register, J1–J11 or working code.

Each change has an ID (CL-nn), the pack file it comes from, and one of three classifications:
- **Duplicate:** already specified or built. The ledger names where, and nothing new is built.
- **New:** added. The ledger names the requirement ID in `registry/CONSOLIDATION-REQUIREMENTS.csv` and the code.
- **Unresolved:** a genuine decision. The safest default is built, and the decision is recorded in `DECISION-REGISTER.md`.

## Duplicates: already in the product definition, kept as they are

| ID | Pack item (file) | Already covered by | Action |
|---|---|---|---|
| CL-01 | One Q everywhere, chat/voice/form, artifacts, approvals, memory (00 §Decisions 6; 02 §Runtime) | M15/M19; `Q-INTELLIGENCE-SPEC.md`; `q/core/*`; J1–J11 | None. J12 uses the same Q (new skills register into the one engine). |
| CL-02 | Permission filtering before Q sees results; revocation updates views (02 §Indexing; 05 P1.8, P4) | M3 (`canSeeCandidate`, `visibleEvidence`, `canDiscover`); privacy suite; `PRIVACY-AND-PERMISSIONS.md` | Reused. J12's find, comparison and profile read through the same filters. The gate script re-checks revocation (QG-02). |
| CL-04 | Approved, versioned role rubric; unknown is not zero (02 §Indexing stage 3; 03 Work B) | Rubric Studio (`journeys/rubric/*`, D17); hire-b `cellFor` coverage | Reused. Effort budget and accepted-evidence per criterion added (CQ-06). |
| CL-05 | Draft, approve, send with truthful receipts; accepted ≠ delivered ≠ read (02 §Runtime; 05 P1.7) | M9/M20 (`journeys/hire-c`, `email`), E-01 addendum, J11 | Reused for every J12 message. No new messaging surface. |
| CL-06 | Time-zone and collision checks; simulated provider statuses (03 Work B) | M10 calendar (`journeys/hire-c` scheduling, J11) | Reused (J12 step 11). |
| CL-07 | Agency client isolation (02 G; 05 P4) | M14, R4, privacy suite | Reused. Dele is refused in J12 step 14. |
| CL-08 | Mobile is task-first with sheets, not a shrunk grid (02 H; 05 design checks) | `DESIGN-QUALITY-GATE.md`, the PD1 phone pass | Applied to the new views. |
| CL-09 | No one-way video as a prerequisite; text/form alternatives (01 §11; 02 §Security) | Interview room (T2), D10, D18 | None. |
| CL-10 | Never score face, accent, emotion or personality (02 §Security) | D18; media addendum (transcript only) | None. |
| CL-11 | Campaigns linked by ID, not copied (02 G) | Campaigns (M14/M8, addendum) | None. |
| CL-12 | No real sends, payments or provider calls in the prototype; simulation labels (03 Directives) | Standing rule; `SIMULATED` labels | Applied. |

## New: added to the product definition and the prototype

| ID | Pack item (file) | Requirement | Where it lives |
|---|---|---|---|
| CL-13 | Two evidence states that are not moral judgements: "weak CV, credible evidence" vs "polished CV, limited supporting evidence" (00 §Key example 5; 03 Work A.2) | CQ-01, CQ-02 | `journeys/evidence/model.ts` (`proofReading`, `ProofShape`, `SHAPE_WORD`); compare "CV and proof" view; profile |
| CL-14 | Proof classes CLAIM / SELF-REPORTED / ASSESSED / ISSUER-VERIFIED / DISPUTED, the same words on both sides (02 D) | CQ-03 | `proofClass`, `PROOF_WORD`, `PROOF_MEANS`; Passport; profile |
| CL-15 | Repeat-assessment avoidance: accept prior evidence, request verification, or one bounded sample with a reason (02 §Layer 5; 00 §Key example 6) | CQ-04 | `EvidenceReuseDecision`; `journeys/evidence/ops.ts` (`ev.reuse`, `ev.sample.*`) |
| CL-16 | A declined sample is recorded as declined, not failed (derived from 00 "not punish Seyi") | CQ-05 | `declineSample` |
| CL-17 | Effort budget and accepted evidence per rubric criterion (02 B) | CQ-06 | Rubric Studio (small addition) |
| CL-18 | Verified hiring intent: shown only for participating employers, with an owner and freshness; never on discovered posts (02 §Layer 7, E) | CQ-07 | `HiringIntentConfirmation` in `state/areas/proof.ts`; `/c/jobs` |
| CL-19 | Process commitments: next factual update due, owner, overdue shown honestly (02 §Layer 8) | CQ-08 | `ProcessCommitment`; `/c/applications` |
| CL-20 | Candidate interest is a pending check, never a score (02 §Indexing stage 4) | CQ-09 | `InterestCheck`; `ev.interest.*` |
| CL-21 | Candidate mutual preferences, candidate-controlled; unknown stays unknown (02 §Layer 6) | CQ-10 | `CandidateMutualPreferences`; Passport/Applications panel; profile mutual-fit panel |
| CL-22 | Candidate-side feedback, shared only when the employer shares it (03 Work A.3; 00 §Key example 8) | CQ-11 | Applications (review note "shared by Kora") |
| CL-23 | J7 answers a verified gap with private practice; practice never becomes employer-visible without a review and the candidate's choice (02 F; 05 P2) | CQ-12 | J7 card on candidate home |
| CL-24 | "Make my CV sound stronger" without inventing jobs, qualifications or skills; the candidate approves (05 P6) | CQ-13 | Candidate Q skill and CV artifact |
| CL-25 | Recruiter Q Home "what needs attention" from events, plus "investigate surprising fits" (02 A) | CQ-14 | `screens/QHome.tsx`; proactive rules |
| CL-26 | Find by demonstrated ability ("troubleshoot Postgres, not just list it") with a live result card that re-renders on revocation (03 Work B; 05 P1.3) | CQ-15 | Recruiter Q skill `q/skills/evidence.ts` |
| CL-27 | "Why is Tobi worth reviewing?": an evidence-cited explanation with limits and open items (00 §Key example 5; 05 P1.4) | CQ-16 | Recruiter Q skill |
| CL-28 | A reviewer marks a sample shows it / shows part / didn't show it, with a note; audited (02 §Indexing stage 6) | CQ-17 | `reviewSample`; profile review panel |
| CL-29 | Truthful run stages: planning, reading permitted candidates, checking evidence, waiting for approval, done (02 §Runtime) | CQ-18 | Q run steps in the find skill. Production stream mapping is in `PRODUCTION-VERTICAL-SLICE.md`. |
| CL-30 | Quality gates as an executable check: privacy/revocation/cache, unknown ≠ 0, rubric version consistency, no outbound send without approval (03 §Output) | CQ-19 | `qa/scripts/gates/consolidation-gates.mjs` |
| CL-31 | `CapabilityEvidenceForRole` layer: RoleCompetency, EvidenceClaimLink, RoleEvidenceEvaluation, HiringOutcome (02 §The one new integration layer) | CQ-20 | Prototype: `EvidenceLink` and `cellFor`. Production: the entity sketch in `PRODUCTION-VERTICAL-SLICE.md` §4. |
| CL-32 | J12, the defining journey, and a 4–7 minute film plus a phone film (03 Work B, D) | CQ-21 | `journeys/J12-EVIDENCE-FIRST.md`; `qa/scripts/journeys/J12.mjs`; `captures/films/J12/` |
| CL-33 | Production vertical slice and Q consumption decision (03 Work C) | CQ-22 | `handoff/PRODUCTION-VERTICAL-SLICE.md` |
| CL-34 | Motion count 34 vs 38 (00 §Current state) | — | Reconciled. Four interview motions (MO-021, 022, 024, 025) and MO-002's re-pointing were recorded only in the generated CSV. They were checked against the code and moved into `registry/status.json`, and the registers were regenerated: **38 of 57 prototyped**, with no rows deleted. |

## Unresolved: safest default built, decision recorded

| ID | Question (file) | Safe default in the prototype | Decision |
|---|---|---|---|
| CL-03 | The pack names the polished-CV candidate "Seyi". The cast already has **Seyi Balogun**, Kora's engineering manager and interviewer (J5, J11). | The new candidate is **Seyi Okoro** (`p_seyio`). Both surnames show wherever both could appear. Q resolves "Seyi" to the candidate in candidate contexts and to the colleague in panel contexts. | Rename either fixture before production seed data? Recorded as D20. |
| CL-35 | Who may review a bounded work sample (the recruiter, a named technical reviewer, an external assessor), and whether a recruiter's review counts as "Assessed" (02 §Layer 4) | Reviews are by a named member of the hiring org, recorded with name and note. The class is "Assessed", never "Issuer-verified". | D21 |
| CL-36 | Hiring-intent freshness period and who must reconfirm (02 §Layer 7) | 14 days, with the role owner as reconfirmer. Expired intent hides the label rather than showing a stale one. | D22 |
| CL-37 | Default process-commitment interval and the escalation when overdue (02 §Layer 8) | 5 working days. Overdue shows on both sides, and Q drafts a factual update for approval. Q never invents an employer decision. | D23 |
| CL-38 | Whether accepted prior evidence can be reused by **another** employer (02 D "reuse scope") | Never automatic. Reuse scope is per employer and set by the candidate. | D24 |
| CL-39 | Pricing hypotheses (01) | Not in the product UI. Pricing stays a commercial experiment outside this branch. | Founder (commercial). No product change. |
| CL-40 | **Privacy defect found by gate QG-01:** a candidate with no discovery rule falls back to `ANYONE` (`mock/world.ts` `discoveryRule`), so the new fixture Seyi Okoro was discoverable by the agency. | Seyi Okoro now has an explicit "verified employers only" rule. The fallback stays, because other seeded candidates rely on it, and is recorded here. **Production is deny-by-default:** no rule means no discovery (slice task 4). | Engineering (slice task 4). No founder decision needed. |
| CL-41 | **Privacy defect found by gate QG-01:** Q's "open the rubric" reply told an agency user that Kora's rubric existed, and its version, even though the page itself refused. | Fixed in `q/skills/rubric.ts`: another organisation's role gets a neutral refusal that reveals nothing. The gate checks the wording. | Fixed. |
| CL-42 | **Small numbers on maps and reports** (raised by the q-tools builder): a city with one person can identify them. | The candidate map (`/q/artifacts`) shows only people the viewer may already see, with the city from their own profile, so it discloses nothing new to that viewer. Organisation reports (`/r/admin/reports`) show counts, not names. | Production: suppress any group under 3 in anything shared beyond the hiring team or exported. Added to the slice's privacy gate (task 4). |
| CL-43 | **WhatsApp messages sit beside the thread** (org-admin builder): they share the thread id but are not in its message list, so `/r/messages` doesn't show them. | Left as is in the prototype; the channel page shows them. | Production: one `Msg.channel` value set (`EMAIL`, `SMS`, `IN_APP`, `WHATSAPP`) in M9, with one thread per person and organisation. |

## Not built first, and not abandoned

These remain in the 183/57/41 registers at their current status (02 §What not to build first): a full ATS replacement, all 183 production routes, a live coding sandbox, video judging, universal credential verification, a course marketplace, unlimited agents, a social feed, and 3D cinematic UI. No register rows were removed or downgraded by this consolidation.
