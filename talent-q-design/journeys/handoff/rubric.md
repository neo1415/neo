# Engineering handoff · RUBRIC (role-specific evaluation studio and evidence-backed scoring)

Specification only. The prototype is the behavioural and design blueprint, not the implementation. Paths are under
`prototype/src/`. **PROD ≠ SIM** marks where production must differ. Requirements: AD-E-01…14, AD-B-05 (and AD-B-03
for the profile index). Journey: J11 steps 5, 8 (scorecard) and 9.

Code map: model `journeys/rubric/model.ts` (proposal, fairness screen, diff, scorecard reading, comparison weights),
ops `journeys/rubric/ops.ts` (`rb.*`), pages `journeys/rubric/{Studio,Scorecard,CandidateRatings}.tsx`, Q cards
`journeys/rubric/refs.tsx` (`rb.rubric`, `rb.card`), skills `q/skills/rubric.ts` (`rubric.*`), proactive
`q/proactive/hire-b.ts` (`rubric.dispute`, `rubric.notice-pending`), state `state/areas/rubrics.ts`, comparison
`journeys/hire-b/{model,Ledger,Compare}.ts(x)`, route `/r/roles/:id/rubric` in `routes/hire-b.tsx`.
Proof: `qa/scripts/features/rubric.mjs` (desktop 41 + phone 44 steps).

## 1. Entities and ownership

Owned by **M11 Interviews and assessments** (the "assessment module"). M6 owns the role brief the rubric derives from;
M21 (media analysis) writes Q-proposed ratings into M11 through its API, never directly into the table.

| Entity | Key fields | Notes |
|---|---|---|
| `Rubric` | `id, mandateId, orgId, versions[]` | One per requisition. `orgId` is the tenant (agency: also `clientOrgId` of the role). |
| `RubricVersion` | `v, state (Q_PROPOSED → APPROVED → SUPERSEDED), criteria[], at, by, approvedBy, note, changeNotice{text, affected[], decision}` | **Immutable once APPROVED.** An edit to an approved rubric creates draft `v+1`. |
| `RubricCriterion` | `id, label, kind (ELIGIBILITY, SKILL, INTERVIEW, PRACTICAL, COMPATIBILITY), weight ≥ 0, minimum?, anchors[0..4], evidenceToInspect[], questions[], method, requirementId?, escoRef?, why` | `id` is stable across versions so diffs and carry-over work. ESCO ids are illustrative in the prototype (D6). |
| `Rating` | `id, rubricId, v, personId, criterionId, rating 0..4, uncertainty, refs[{evidenceId, t?, tEnd?, quote?}], note, source (Q_PROPOSED, REVIEWER), by, at, reviewed, override{from, reason, by, at}, dispute{by, text, state, at}` | Bound to `{rubricId, v}`. Unique on `{rubricId, v, personId, criterionId}` (`putRating`). |
| `RubricMeta` (prototype) | `proposals[rubricId:v]` (Q's untouched proposal and sources), `edits[rubricId:v]` (draft edit log) | **PROD:** a `rubric_draft_events` table; the proposal is an artifact version in M15. |

## 2. Version immutability and the change contract (AD-E-02…04, 07)
- Approval freezes the version. No API mutates an APPROVED version's criteria; edits create a draft. Every candidate for the
  same role and stage is scored on one version (`approvedVersion` = version in force).
- **Material change** = a criterion added or removed, or a change to weight, minimum or anchors. Wording of questions,
  evidence or method is not material (`diff()` marks it).
- Approving a material change while ratings exist on the version in force raises a **change notice** listing the affected
  people. The approver chooses:
  - `NOTIFY_AND_REASSESS`: the new version is in force; the old one becomes SUPERSEDED; each affected candidate gets a
    notice (event scope `SHARED:<org>:<person>`); ratings on unchanged criteria (same id and anchors) are copied to the new
    version as **Q proposals that need review**; new or changed criteria start unknown.
  - `KEEP_FOR_ROUND`: the new version is approved for the next round; the old version stays in force for everyone this round.
- Old ratings are never moved or re-scored. **Gap:** the "next round starts" transition for KEEP_FOR_ROUND is not built
  (production: a round entity on the requisition, M6/M8).

## 3. Scoring contract (AD-E-10, 11) — keep exactly
```
O = criteria (kind ≠ COMPATIBILITY) with a rating on version v
index    = round(100 · Σ_O w·(r/4) / Σ_O w)          null when Σ_O w = 0
coverage = round(100 · Σ_O w / Σ_all w)
```
- The founder's prototype formula, **not a validated test**. Displayed only as "62 at 55% coverage", always with the
  rated/unrated list and the evidence behind each rating. Unknown is never zero. Not a probability, not global, not
  comparable across roles or versions. No API returns `index` without `coverage`, `v` and the per-criterion rows.
- Eligibility and compatibility carry weight 0: eligibility is a met/not-met gate with lawful necessity; compatibility is the
  candidate's side, reported separately.
- A minimum flags a person for **human review**; it never auto-rejects.
- The comparison (`/r/compare`) ranks shared evidence with **the rubric's weights** per requirement (AD-B-05, AD-E-09). With
  no approved rubric it falls back to equal must-haves (2 vs 1) and says so. Requirements absent from the rubric don't count.

## 4. Separation of signals (AD-E-05)
| Signal | Where it lives | Never mixed with |
|---|---|---|
| Eligibility (lawful necessity) | ELIGIBILITY criteria, weight 0 | the index |
| Demonstrated skills (with provenance) | SKILL criteria; refs to evidence with source and verification | CV claims (never rated) |
| Structured interview answers | INTERVIEW criteria; copilot ratings (hire-b live rubric) | video demeanour |
| Practical assessments | PRACTICAL criteria; assessment version and human marker | — |
| Compatibility and availability | COMPATIBILITY criterion, weight 0 | the index |
| Coverage, uncertainty, freshness, reliability | computed per rating (`freshness`, `refView`) | the rating value |
| Evidence-strength ledger (hire-b) | `cellFor` levels: how strong the proof is | the anchored rating: what level it shows |

## 5. Fairness controls (AD-E-06, 13, 14)
- `screen()` refuses protected characteristics (shared `protectedCriterion`) **and proxies**: accent/native speaker, faces,
  voice or manner on video, "culture fit", CV gaps, graduation year or "energy", university prestige, home address, health.
  Each refusal gives the reason and a job-related alternative; an event `rubric.refused` is logged; nothing is added.
- Ratings are proposals until a person reviews them. Overrides need a reason (UI, op and Q all enforce it), keep the
  original value, and are visible to the candidate.
- Candidate view (`/c/applications` → "How employers rated your evidence"): their own ratings, anchors, evidence used,
  review state, override reasons, plain-language index with coverage, and "Ask for a correction" (dispute → recruiter
  proactive card → "Mark answered").
- Privacy: evidence refs are re-checked at read time (`visibleEvidence`, `visibleSegments`); a ref the org can no longer see
  is counted ("no longer shared, needs a fresh review"), never shown. Tenant guard on the studio route by role org.

## 6. Audit (M18 events)
`rubric.proposed`, `rubric.refused`, `rubric.change_notice`, `rubric.approved` (with decision), `rubric.draft_discarded`,
`rubric.candidate_notified` (SHARED), `rating.proposed`, `rating.set`, `rating.overridden` (from, to, reason),
`scorecard.reviewed`, `rating.disputed` (SHARED), `rating.dispute_resolved` (SHARED). Draft edits are logged per version
(who, when, what).

## 7. APIs, events and Q tools (approval classes)
| API (M11) | Q tool / op | Class |
|---|---|---|
| `POST /roles/:id/rubric/proposal` | `rb.propose` · "propose a rubric for …" | Draft (no approval) |
| `PATCH /rubrics/:id/draft` (weight, minimum, anchors, add, remove) | `rb.weight`, `rb.minimum`, `rb.patch`, `rb.add`, `rb.remove` · "make X weight 2", "add mentoring", "remove X" | Draft |
| `POST /rubrics/:id/versions/:v/approve {decision?}` | `rb.approve` · "approve the rubric", "keep v1 for this round", "notify and reassess" | **Consequential**: the person's own command or button; RECRUITER/ADMIN/OWNER only |
| `POST /ratings` (from M21 or Q, `source: Q_PROPOSED`) | `rb.rate` · "rate Ifeoma against the rubric" | Proposal |
| `POST /ratings/:id/override {rating, reason}` | `rb.rating.override` · "lower postgres to 2 because …" | Consequential, reason required, undoable |
| `POST /people/:id/scorecard/review` | `rb.review` · "mark Tobi's scorecard reviewed" | Consequential |
| `POST /ratings/:id/dispute` (candidate) / `…/resolve` | `rb.dispute`, `rb.dispute.resolve` | Candidate right / recruiter reply |
| `GET /people/:id/scorecard?role&v` | "show Tobi's scorecard", `rb.card` | Read (authorised) |

## 8. Task boundaries
- M11 owns rubrics, versions, ratings and the scoring function. M21 proposes ratings with refs; M7 reads weights; M6 owns the
  brief; M15 drafts proposals (LLM) using the brief, org guidelines (M2) and the ESCO taxonomy service.
- **PROD ≠ SIM:** proposal drafting is a rules table (`LIB`) and ratings from shared evidence are a lookup (`EV_RATING`).
  Production drafts with an LLM grounded on the brief and ESCO, validated against the same schema and fairness screen.

## 9. Costs and caching
Proposals are generated once per brief version and cached as artifacts. Scorecards are computed on read (cheap). Media-based
ratings are cached by `{contentHash, rubricId, v}` (M21), so a new rubric version re-maps moments without re-transcribing.

## 10. Failure and recovery
Draft edits are idempotent per op; approval is a single transaction (version state + notice + carried ratings + events).
A failed approval leaves the draft unchanged. A withdrawn share flags affected ratings for review rather than deleting them.

## 11. Validation still required (do not ship scoring to customers without it)
- SIOP-style job analysis per role family with incumbents and managers to confirm criteria, anchors and weights.
- Anchor calibration (inter-rater agreement on sample evidence) before ratings inform decisions.
- Adverse-impact monitoring (selection rates by group, four-fifths rule as a screen, not a defence), with group data held
  separately under consent and never visible to raters.
- Empirical check that the index relates to job outcomes; until then label it as a reading aid only.
- Legal review per market (EU AI Act high-risk obligations, UK ICO guidance, EEOC accommodations for assessments).
- Usability testing with recruiters (do they over-trust the number?) and candidates (is the explanation understood?).

## 12. Risks
Over-trust in a single number (mitigated: coverage and unknowns always shown, no global score); weight-gaming to favour a
known candidate (mitigated: versioning, audit, change notice); proxies we haven't listed (mitigated: the screen is a list,
so it needs red-teaming); ratings carried across versions without review (mitigated: carried ratings are unreviewed
proposals); KEEP_FOR_ROUND leaving an approved-but-unused version (round entity needed).
