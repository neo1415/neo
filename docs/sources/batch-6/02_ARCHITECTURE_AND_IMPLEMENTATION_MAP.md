# Talent Q | Preserve Claude's system, integrate new value, build the production vertical slice
**Based on Talent-Q-Complete.zip and ALL-SPECS.md uploaded 30 October 2026**

## Source-of-truth order
1. Latest checked-in `product-definition` requirements and coverage registers in Claude's repository, **not** stale text copied into chat.
2. Founder approved brand, Direction D and vision; all old additions retained unless explicitly superseded.
3. This consolidation's requirements and launch priority clarify execution; **they do not delete or replace old features**.
4. The current working Q runtime repo `neo1415/q`, inspected against its latest integration branch *at implementation time*, determines reuse feasibility. Earlier branch summaries are stale until verified.

## What Claude already made (do not duplicate)
- `prototype/src/ds` Direction D shell, Q mark, resizable thread + canvas, mobile Q sheet, tokens, motion.
- `prototype/src/q` Q simulated conversation engine, role-specific skills, openers, proactive rules, artifact references.
- `prototype/src/mock/world.ts` and domain stores (prototype only), consent/tenant logic and state-sharing.
- Workflows: onboarding, J7, Evidence Passport, role brief, recruiter comparison, hiring campaigns, rubric studio, email and messages, calendar, interview, agency and planners.
- `handoff/MODULE-MAP-AND-ROADMAP.md`, `handoff/ADDENDUM-HANDOFF.md`, `handoff/Q-INTELLIGENCE-SPEC.md`, `handoff/PRIVACY-AND-PERMISSIONS.md` and `journeys/J11-CONNECTED-JOURNEY.md`.
- TypeScript contracts and the 183/57/41 coverage maps. Zero production external connections or validated hiring prediction.

## The one new integration layer: `CapabilityEvidenceForRole`
**Do not create a separate magical global candidate-scoring service.** Extend existing M4/M5/M6/M7/M11/M13 and Q tools:

1. `RoleCompetency` attached to an approved requisition/rubric version, with expected proficiency and method of proof.
2. `EvidenceItem` in M5: owner, source, content hash when applicable, provenance, timestamp, truthful state, permitted observers, limitations, optional assessor.
3. `EvidenceClaimLink`: evidence ID → competency ID (ESCO or approved local extension), strength/coverage and reasoning, disputed/review state. Many-to-many, with versioned mappings.
4. `RoleEvidenceEvaluation`: `{candidateId, requisitionId, rubricVersionId, criterionId, evidenceIds[], state, coverage, assessedLevel?, explanation, reviewer, reviewedAt}`. UNKNOWN/NOT_SHOWN never automatically means 0 skill.
5. `EvidenceReuseDecision`: employer accepts prior evidence, requests verification or asks a bounded additional work sample, with decision and reason.
6. `CandidateMutualPreferences`: candidate-controlled compatible compensation/location/arrangement/availability; unknown remains unknown; changes trigger reranking with permission.
7. `HiringIntentConfirmation`: approved/active/paused/closed, accountable owner, last confirmed timestamp, freshness expiry and communication obligations (only on participating employers, not scraped job posts).
8. `ProcessCommitment`: application milestone, next factual update due, owner, overdue/fulfilled state; Q may send approved factual updates and escalation, never invent employer decisions.
9. `HiringOutcome`: consented, human-verified status events; optional longer-term outcomes held separately with specific legal basis.

## Indexing and scoring rules
- Stage 1: eligibility conditions restricted to lawful, genuinely role-required criteria; mark missing evidence, do not assume.
- Stage 2: candidate retrieval blends ESCO-linked competencies, actual experiences, text semantic embeddings and role-specific evidence (with access filtering *before* results reach Q).
- Stage 3: show each criterion's supported evidence and coverage. Use a human-approved rubric; allow Q to propose **unvalidated provisional** weighting, with versions. No universal talent rating.
- Stage 4: show separate employer suitability and candidate interest/compatibility. Unknown candidate interest is a pending check, not a zero.
- Stage 5: Q recommends **the minimum additional credible evidence** where it improves the decision; human signoff for consequential ranking and rejection.
- Stage 6: record reviewer acceptance and outcome for later offline evaluations; do not reinforce discriminatory prior hiring patterns or train on private data without valid permission.

## Example state flow
`requisition.approved` → `rubric.approved.v1` → `candidate.evidence.shared` → `role_evaluation.requested` → `evidence_map.ready` → `shortlist.proposed` → `human_reviewed` → `candidate.interest_requested` → `communication.approved` → `invitation.accepted_by_provider` → `booking.confirmed` → `application.stage_changed` → optional `outcome.recorded`.

Authorization on **every** transition. Events carry tenant and candidate scopes. Q is a caller/orchestrator, not a privileged DB client. File ingestion and downloaded source text are untrusted and never allowed to instruct the agent.

## Runtime and performance standards
- One Q accessible from everywhere: `QThread` + `Workspace`; contextual artifacts from approved renderer types.
- Use the existing Q model gateway, run events, planner, approval and memory where verified. No second reasoning/orchestration engine; avoid new microservice boundaries unless measured throughput or security justify them.
- Normal navigation/filtering/rubric arithmetic = indexed queries and deterministic code, not LLM calls.
- Reuse existing snapshots, embeddings and approved evidence; cache by `{tenantScope, permissionVersion, contentHash, roleId, rubricVersionId, modelVersion}`. Revocation invalidates affected views and caches; never leak cross-tenant.
- Stream truthful `planning`, `source_read`, `evidence_checked`, `waiting_permission`, `awaiting_approval`, `queued`, `done`, `failed`, `recovery` events. The user sees partial useful results quickly.
- One AI call should not be made for every UI repaint, candidate row, filter click or progress tick.
- Batch independent read-only enrichment; set budget, timeouts, retry and idempotency for external actions; no limitless autonomous agent loop.
- Prompt caching for stable system/org instructions where gateway/provider supports it. Keep mutable user-specific, private context securely scoped; no indiscriminate cross-tenant caching.
- Preserve offline drafts; replay only after authorization, freshness and state checks. Email "accepted" ≠ "delivered" ≠ "read".

## Concrete UI improvements to the existing Direction D experience
A. Recruiter Q Home: **"What needs attention"** from authoritative events; a one-click/live Q task to investigate "surprising fit" candidates; not generic text.
B. Role/Rubric Studio: real-work outcomes, Q suggested proof methods, thresholds and effort budgets, human approval and versioning.
C. Candidate comparison: two alternative paths for the same role: "excellent CV, little proof" vs "poor CV, demonstrable ability". Each has factual, inspectable, candidate-consented evidence and missing-evidence notices.
D. Evidence Passport: label CLAIM / SELF-REPORTED / ASSESSED / ISSUER-VERIFIED / DISPUTED, visibility controls, source expiry, redaction and reuse scope; don't present work-quality judgments as absolute truth.
E. Candidate jobs: show confirmed employer job intent separately from externally listed jobs; show exact next update obligations only when participating employer confirms them.
F. J7: gap-specific practice without falsely auto-promoting to recruiter-visible proof; after valid assessment, evidence is available for *candidate-approved* reuse.
G. Campaigns/agency: original employer-owned role, candidate pipeline and correspondences, linked via IDs rather than copied into silo stores; cross-client restrictions maintained.
H. Mobile: conversational task-first experience plus sheets and responsive evidence inspectability, no dense desktop grid shrunk to fit.

## Security, compliance and evaluation blockers that cannot be skipped
- Candidate private records, revoked evidence, cross-client data and search visibility must be guarded at service layer, not only in route UI. Check cache and generated artifacts too.
- Assessments and hiring recommendation logic must be job-related, challengeable, transparent enough for reviewers, validated for intended uses, and human-reviewed for significant decisions.
- Never score video facial expressions, accent, appearance, emotion, or inferred personality. Provide text/form alternatives and appropriate accommodations.
- Never turn a CV's missing keywords into a hidden hard negative; never treat a polished CV as verified competence.
- No unfounded "predicts job performance" marketing claim before validation; no "real job verified" label for externally discovered records.

## Implementation in one repository / one vertical slice
1. **Branch** from newest audited Talent Q code; preserve existing prototype as `design-reference` directory or independent package. Create an implementation branch, don't overwrite the prototype.
2. **Q shared runtime audit:** decide between versioned package reuse and secure API adapter. Keep Capital Q behavior intact.
3. **Minimal app + domain backbone:** auth + org roles + candidate identities, real DB with tenant RLS/service checks, file storage, audit/outbox, Q stream client. Implement modular monolith first if sufficient.
4. **Candidate real evidence path:** signup, claim-based profile, consented upload and safe ingestion, EvidenceItem and revisions, permissions and redaction.
5. **Employer real role path:** signup, verified hiring-org status, requisition, approved role rubric and hiring campaign, permission-aware candidate retrieval.
6. **Human-reviewable proof-aware shortlist:** show 2 contrast cases, evidence / uncertainty / candidate preferences, explanations and calibration checks.
7. **One real mail + calendar path:** start in-app or a verified email adapter, draft-approve-send with idempotency, candidate reply, real scheduling proof and honest receipts.
8. **J7 first improvement path:** candidate-led practice, one demonstrable practical task, optional review and consented incorporation into Passport.
9. **Release gates:** cross-tenant privacy tests, correct statuses, intent + applicant outcome analytics, a small accessible and reliable human-readable UX review.
10. **Then extend** other already approved journey modules, rather than recreating their specs.

## What not to build first
- Full ATS replacement, 183 production routes, proprietary live coding sandbox, universal video judging, universal credential verification, full course marketplace, unlimited parallel agents, app-store-style social feed, expensive 3D cinematic UI or a second Q brain.
- These remain in the scope/register as later capabilities; they aren't silently abandoned.

## Acceptance scenario (for engineers and investors)
Use seeded fictional **Tobi (weak CV, stronger reviewed evidence)** and **Seyi (polished CV, unverified claims)** as deterministic fixtures. Demonstrate: recruiter states real work needed → rubric approved → role-specific evidence retrieval → both profiles shown with correct proof classes → candidate-approved disclosure → shortlist explanation → recruiter human override → consented contact and availability → truthful invitation receipt → candidate sees correct status → J7 responds to verified gap. All interactions survive reload; no privilege escalation; no fake AI outcome claims.
