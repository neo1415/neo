# Production vertical slice: the evidence-first role (Phase 0 + Phase 1)

The pack's definition of the first commercially meaningful outcome (00 §Sequence):
> One verified employer finds and speaks to one consenting candidate because of credible relevant evidence that a resume-only process could plausibly miss, and the process proceeds without manual stitching across apps.

This document maps J12 (`journeys/J12-EVIDENCE-FIRST.md`), as it runs in the prototype, onto the real build. It does not reopen the concept phase.

**Scope:** one role family (backend), one verified employer, direct candidate sign-ups, one mail channel, and one calendar. Everything else in the 183/57/41 registers stays specified for later slices (ledger "Not built first").

## 1. How Talent Q consumes Q (decision)

**Verified against `neo1415/q` on 30 Oct 2026** (read-only): `build/int-rc` at `a513ebf` (2026-10-30 09:41 UTC), and `speed/q-oct20` at `8136d91`. Re-verify at the start of Phase 0; branch state moves daily.

| Q package | Capital Q dependencies | Decision |
|---|---|---|
| `@capital-q/contracts` (zod only) | none | **Consume as a pinned, versioned package.** Use `q/stream.ts` (`QStreamEventSchema`: `q.run.started`, `q.stage.changed`, `q.message.delta`, `q.artifact.preview`, `q.action.proposed`, `q.approval.required`, `q.input.required`, `q.run.completed`, `q.run.failed`), `q/action.ts` (`QActionProposal`, `QActionBindingEnvelope`), `q/approval.ts` (`QApprovalView`), `q/result-block.ts` (`QResultBlockSchema`), `q/firewall.ts` (`PermittedContextPlan`), `events/envelope.ts`. |
| `@capital-q/api-client` | contracts | **Consume pinned.** It is the typed HTTP client for q-api. |
| `@capital-q/q-core` (prompt registry, renderer, untrusted-content boundaries) | contracts | Not consumed directly. Q owns prompts. Talent Q adds its task prompts through the Q team (D12). |
| `q-runtime`, `q-actions`, `q-tools`, `q-orchestrator`, `q-knowledge`, `q-firewall`, `model-gateway` | capital, companies, investors, discovery, … | **Do not import and do not fork.** Call them as a service through **q-api**: the run stream (SSE with `Last-Event-ID` replay over `q_runtime.run_events`), actions and approvals. `ApprovedQAction` and `QActionExecutionReport` live in `q-actions`, so they reach Talent Q as API payloads, not imports. |

**Talent Q's side** is one module, `tq-q-adapter`, inside the app. It contains:
1. **Tool adapter.** Talent Q's tools (`find_by_evidence`, `explain_candidate`, `propose_reuse`, `review_sample`, `request_interest`, `draft_message`, `propose_slots`) are registered with q-api as an external tool provider. Q calls back into Talent Q's API with the user's delegated token. Talent Q enforces authorisation; Q is a caller, never a privileged database client (02 §Example state flow).
2. **Stream client.** It renders `QStreamEventSchema` into the existing `QThread`, with the stage names already used in the prototype.
3. **Approval bridge.** Talent Q actions become `QActionProposal` with a `QActionBindingEnvelope` payload hash. An edit voids the approval, as in Q and in the prototype.

**This needs the Q team (D12):** external tool-provider registration in q-api, a Talent Q tenant vocabulary for stages and subjects, and prompt bundles. If registration is not available by the end of Phase 0, the fallback is a Talent Q-hosted tool loop that calls q-api only for model and stream. It is still one Q: no second planner and no second memory store.

## 2. Interaction map (J12 → production)

Modules are numbered as in `MODULE-MAP-AND-ROADMAP.md`. "Perm" is the service-layer check. UI checks are never trusted.

| # | Interaction | Route / component (from prototype) | Module | Entities | Perm (service) | API / Q tool | Event | Worker | Cache / latency | Audit | Recovery |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | "find someone who can troubleshoot Postgres…" | `/r/home` → QThread; result card `ev.find` | M7 + M15 | RoleRubricVersion, EvidenceItem, EvidenceClaimLink | `canDiscover(org, person)` **before** retrieval; `visibleEvidence` per item | Q tool `find_by_evidence(roleId, rubricVersionId, query)` → `GET /roles/:id/evidence-matches` | `role_evaluation.requested` → `evidence_map.ready` | none (indexed query plus one LLM call to phrase the answer) | Key `{tenant, permissionVersion, roleId, rubricVersionId, contentHash, modelVersion}`; the first partial result is streamed in under 1 s | Run and tool call | Stream replay from `Last-Event-ID`; the card re-fetches on `consent.revoked` |
| 2 | "why is Tobi worth reviewing?" | QThread answer with citations | M7 + M15 | RoleEvidenceEvaluation | Same, per cited item | `explain_candidate(personId, roleId)` | none (read) | none | Explanation cached per evaluation version | Run | "Couldn't load evidence": retry, with nothing invented |
| 3 | CV and proof view | `/r/compare` (`journeys/hire-b/Compare.tsx`) | M7 | RoleEvidenceEvaluation × requirement; CvDocument mentions | Per row | `GET /roles/:id/comparison?people=` | none | none | Deterministic arithmetic, no LLM per row (02 §Runtime) | none (read) | Offline: last good snapshot, labelled with its time |
| 4 | Profile: CV, proof classes, mutual fit | `/r/people/:id` (`Profile.tsx`) | M4 + M5 | CvDocument, EvidenceItem, CandidateMutualPreferences | `canSeeCandidate`; preferences only where `shareWith ∋ org` | `GET /people/:id?role=` | none | none | Per permissionVersion | Read access logged for evidence | Revoked item: removed with a notice |
| 5 | Accept prior evidence / ask for one bounded sample | Profile actions; Q `ev.reuse` | M11 + M5 | EvidenceReuseDecision | Hiring-org member with role access | `propose_reuse` → `POST /reuse-decisions` (a QActionProposal only when it sends something) | `evidence.reuse.accepted` / `evidence.reuse.requested` | none | none | Decision, reason, actor | Idempotent by `(org, person, role, req)` |
| 5b | Send the request | Correspondence draft → approval | M9 | Message (versioned), Approval, Outbox | Sender identity owned by the actor (P5) | `draft_message` → QActionProposal → approve → send | `communication.approved` → `message.sent` | **outbox worker** | none | Approval bound to the payload hash | Outbox retry with an idempotency key; status "accepted by provider" only on receipt |
| 6–7 | Candidate sees the request; does, shares or declines; submits | `/c/home`, `/c/applications`, `/c/passport` | M12 + M5 | EvidenceReuseDecision, EvidenceItem (SELF_REPORTED) | Only the candidate | `POST /reuse-decisions/:id/{start,submit,decline}` | `evidence.sample.submitted` / `.declined` | **file ingestion worker** (scan, hash) | none | Candidate action | Draft kept on device; resumable upload |
| 8 | Review the sample; move both to interview | Profile review panel; pipeline | M11 + M8 | EvidenceItem → ASSESSED; EvidenceClaimLink REVIEWED; PipelineEntry | Named reviewer in the hiring org (D21) | `review_sample` → `POST /evidence/:id/review`; `PATCH /pipeline/:id` | `evidence.reviewed`; `application.stage_changed` | none | Invalidates the comparison cache for that person | Reviewer, outcome, note | Undo for stage moves (existing pattern) |
| 9–10 | Interest request; candidate confirms | Q `ev.interest.*`; `/c/applications` | M12 + M9 | InterestCheck, ProcessCommitment, HiringIntentConfirmation | Contact policy (D19) | `request_interest` → message approval | `candidate.interest_requested` / `.confirmed` | outbox | none | Both | Shown as a pending check, never a score |
| 11 | Invite for Thursday or Friday | `/r/messages`, calendar | M9 + M10 + M20 | Message, Hold, Booking | Sender identity; calendar ownership | `propose_slots` → approval → send | `invitation.accepted_by_provider` → `booking.confirmed` | outbox, calendar sync | Free/busy read cached for 5 min | Approval and receipt | Collision check before booking; honest receipt states |
| 12 | J7 responds to the open gap | `/c/home` card; `journeys/career/*` | M13 | J7 plan item (PERSON scope) | Only the candidate; never employer-readable | J7 suggestion (deterministic from the open requirement) | `career.gap_suggested` (PERSON scope) | none | none | none | none |
| 13 | Candidate revokes shared evidence | `/c/passport` | M5 + M3 | Consent → revoked | Only the candidate | `POST /evidence/:id/revoke` | `consent.revoked` | **cache invalidation fan-out** (sync in the same transaction for read models) | Increments permissionVersion; every key above misses | Revocation receipt | Employer views drop the item on next read; open streams get a `q.artifact.preview` refresh |
| 14 | Agency asks for Kora's rubric or Tobi | `/r/home` | M3 + M14 | none | Tenant boundary, discovery rule | Tools return "not available" without revealing existence | none | none | Never cached across tenants | Denied-access log | none |

## 3. What Phase 1 reuses from the prototype (and what it does not)

- **Reuse as written.** Design tokens, `ds/*` components, route layout, copy, `PROOF_WORD` and `SHAPE_WORD` vocabulary, the comparison arithmetic (`cellFor` semantics, where unknown ≠ 0), contract shapes in `contracts/*`, and the QA journey scripts as acceptance specs.
- **Do not reuse.** `mock/world.ts`, the rule-based skill matcher, or simulated providers. These are the reference UX only (00 §Decisions 8).
- **Keep the prototype runnable.** It moves to `design-reference/` on the production branch, or stays on this branch untouched.

## 4. Entity sketch (Postgres, tenant RLS on every table)

```sql
-- M2/M3
org(id, kind, verified_at, …)                         -- verified hiring org; agency flag
membership(org_id, user_id, role)
consent(id, person_id, evidence_id, org_id, scope, reuse_scope, granted_at, revoked_at, permission_version)
-- M4
person(id, user_id, display_name, …)
cv_document(id, person_id, file_id, polish, uploaded_at)          -- polish is descriptive, never scored
cv_mention(cv_id, competency_id, strength)                         -- YES | VAGUE | NO
candidate_mutual_preferences(person_id, pay_min, currency, work_modes[], locations[], available_from, share_with_org_ids[], updated_at)
-- M5
evidence_item(id, person_id, kind, source, content_hash, provenance jsonb, proof_class, state, limitations, created_at, expires_at)
evidence_review(id, evidence_id, reviewer_user_id, org_id, outcome, note, reviewed_at)   -- SHOWS_IT | PARTLY | NOT_SHOWN
-- M6
role(id, org_id, title, owner_user_id)
role_rubric_version(id, role_id, version, approved_by, approved_at, frozen bool)
role_competency(id, rubric_version_id, competency_ref, must bool, weight, proof_methods[], effort_budget_min)
hiring_intent_confirmation(role_id, state, owner_user_id, confirmed_at, fresh_until, reply_within_days)
-- M7
evidence_claim_link(id, evidence_id, role_competency_id, coverage, reasoning, state, mapping_version)   -- PROPOSED | REVIEWED | DISPUTED
role_evidence_evaluation(id, person_id, role_id, rubric_version_id, competency_id, evidence_ids[], state, coverage, explanation, reviewer_user_id, reviewed_at)
                                                               -- state UNKNOWN | NOT_SHOWN never maps to 0
-- M11
evidence_reuse_decision(id, org_id, person_id, role_id, competency_id, decision, reason, effort_min, state, result_evidence_id, decided_by, decided_at)
-- M12
interest_check(org_id, person_id, role_id, state, requested_by, at)
process_commitment(id, org_id, person_id, application_id, milestone, next_update_due, owner_user_id, state)
-- M18
event(id, tenant_id, subject_person_id, type, payload jsonb, actor, at)   -- append-only; outbox reads from here
```

## 5. Event contracts (envelope from `@capital-q/contracts/events/envelope.ts`)

The names follow the pack's state flow (02 §Example state flow). Every event carries `tenantId`, `subject` (person and role) and `actor`, and each passes an authorisation check on emit.

```ts
type TalentEvent =
  | { type: 'rubric.approved'; roleId; rubricVersionId; approvedBy }
  | { type: 'candidate.evidence.shared'; personId; evidenceId; orgId; reuseScope }
  | { type: 'consent.revoked'; personId; evidenceId; orgId; permissionVersion }
  | { type: 'role_evaluation.requested'; roleId; rubricVersionId; runId }
  | { type: 'evidence_map.ready'; roleId; rubricVersionId; personIds: string[] }
  | { type: 'evidence.reuse.accepted' | 'evidence.reuse.requested'; decisionId; personId; competencyId; effortMin? }
  | { type: 'evidence.sample.submitted' | 'evidence.sample.declined'; decisionId; evidenceId? }
  | { type: 'evidence.reviewed'; evidenceId; outcome: 'SHOWS_IT' | 'PARTLY' | 'NOT_SHOWN'; reviewerId }
  | { type: 'candidate.interest_requested' | 'candidate.interest_confirmed' | 'candidate.interest_declined'; personId; roleId }
  | { type: 'communication.approved'; messageId; bindingHash }
  | { type: 'invitation.accepted_by_provider'; messageId; providerMessageId }
  | { type: 'booking.confirmed'; bookingId; calendarEventId }
  | { type: 'application.stage_changed'; applicationId; from; to; by };
```

**Task contracts.** Q tools are request and response DTOs with zod schemas. Each tool declares a `sideEffect: 'none' | 'proposal'`. Only `proposal` tools may produce a `QActionProposal`, and none sends directly.

## 6. Thin migration plan

| Step | Migration | Notes |
|---|---|---|
| 0001 | Organisations, memberships, people, users | Auth via the chosen provider (D13) |
| 0002 | Consent and `permission_version`; RLS policies | Gate tests (§9) before any data |
| 0003 | Files, `evidence_item`, `evidence_review` | Content hash; scan status |
| 0004 | Role, rubric versions (frozen once approved), competencies, hiring intent | |
| 0005 | `evidence_claim_link`, `role_evidence_evaluation` | `mapping_version`; no `score` column |
| 0006 | `evidence_reuse_decision`, `interest_check`, `process_commitment` | |
| 0007 | `event` (append-only trigger) and outbox | Mirrors Q's `run_events` append-only pattern |
| 0008 | Messages, approvals, bookings | Reuses the M9/M10 contracts from the prototype |

Seeds: the fictional fixtures (Kora, Ada, Tobi, Seyi Okoro, Dele), clearly marked and loaded only in non-production.

## 7. Branch plan

- **This branch** (`claude/blissful-allen-0jweaf`) stays the design reference. Nothing here becomes production code.
- **After approval:** create `talent-q/app-phase-1` from the newest audited Talent Q code, add `apps/web` (moving the prototype's `ds/` and `contracts/` across), `apps/api` (modular monolith: modules M2–M12 and M18 as folders, not services) and `packages/tq-q-adapter`, with the prototype copied to `design-reference/`.
- **Pin** the Q packages by commit (`@capital-q/contracts@a513ebf` or later, re-audited) through a git dependency or a private registry tag. Never use a workspace link into the Q repo.

## 8. Implementation-start checklist: the first 10 tasks

| # | Task | Module (owner) | Depends on | Accepted when |
|---|---|---|---|---|
| 1 | Re-audit `neo1415/q` at the current head; confirm external tool-provider registration in q-api with the Q team | M15 (Q team plus TQ lead) | none | A written yes or no, with the API surface named. If no, the fallback in §1 is adopted. |
| 2 | Create `talent-q/app-phase-1`, the repo skeleton, CI, the design reference copy and the pinned Q contracts | M19 (TQ lead) | 1 | CI green; `design-reference/` runs; contracts import compiles |
| 3 | Auth, organisations, memberships, verified-org flag | M1/M2 (backend) | 2, D13 | Ada, Dele and Tobi sign in; an agency is flagged |
| 4 | Consent, `permission_version`, RLS and the service-layer `canSeeCandidate`/`canDiscover` | M3 (backend, security review) | 3 | The ported privacy gate suite passes against the API: agency, revocation, cache key |
| 5 | Candidate sign-up, CV upload and parse into `cv_mention`, evidence upload with scan and hash, Passport with proof classes | M4/M5/M17 (full stack) | 4 | Tobi and Seyi Okoro fixtures created through the UI; proof classes match the prototype words |
| 6 | Role, rubric draft with Q, approve, freeze version; hiring-intent confirmation | M6 (full stack) plus a Q prompt | 3, 1 | An approved version cannot change; an edit creates v2; intent shows only for this verified org |
| 7 | `evidence_claim_link` and `role_evidence_evaluation`; comparison API; CV and proof view | M7 (backend plus web) | 5, 6 | Tobi shows "Shows more than the CV says" and Seyi "Strong claims, limited supporting evidence"; unknown is never 0 (gate) |
| 8 | Q tool adapter: `find_by_evidence`, `explain_candidate` streaming into QThread | M15 adapter (TQ lead) | 1, 7 | J12 steps 1–2 against real data; stages are real stream events; permission filtering happens before the model sees anything |
| 9 | Reuse decisions, the bounded sample, review, interest check and process commitments | M11/M12 (full stack) | 7, 8 | J12 steps 5–10; a decline is recorded as declined; the review is audited |
| 10 | One mail path (send-only, D16) plus one calendar, through approval bound to the payload hash, the outbox and honest receipts | M9/M10/M20 (backend) | 4, 8 | The invite is approved, then sent, then shows "accepted by provider" from a real receipt; no duplicate on retry |

The release gates for the slice are the scripts in `qa/scripts/gates/` and `qa/scripts/journeys/J12.mjs`, ported to run against the API.

## 9. Q reuse risks (current)

1. **External tool registration in q-api is not confirmed.** Registering Talent Q's tools needs Q-team approval (D12). Mitigation: decide in task 1; the fallback keeps one Q.
2. **Contract drift.** Q ships many changes a day, and the latest commit tightened plan-schema validation. Pin by commit and run contract tests on each bump.
3. **Vocabulary.** Q's stages and subjects are Capital-specific. Talent Q needs its own stage set without forking `QStreamEventSchema`; this is negotiated in task 1.
4. **Memory and policy gaps.** Q has no versioned org-rule resolver (see `research/Q-REUSE-AUDIT.md`). Talent Q's org guidelines stay in Talent Q until Q provides one.
5. **Open owner actions on Q's side** (from Q's handoff log): production domain, sender domain (SPF/DKIM/DMARC), Google consent screen, token rotation. Search-provider credits are exhausted except Brave. These block real mail (task 10) and any external discovery.
6. **Tenant isolation across two systems.** Q's run cache and Talent Q's evidence cache must share the permission version in the key, or revocation will not reach Q's cached previews. Gate QG-02 covers this.

## 10. Not in this slice (still in scope, unchanged)

Campaigns and agency workspaces, multi-channel messaging, live interviews and media analysis, J7 beyond the gap card, issuer verification, and the remaining routes. These are tracked in `COVERAGE-SUMMARY.md` and `MODULE-MAP-AND-ROADMAP.md`.
