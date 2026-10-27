# Q runtime reuse audit for Talent Q

Read-only audit of the Capital Q monorepo (`neo1415/q`), done to decide what Talent Q can reuse from Q's intelligence layer. Nothing was modified in that repo. All paths below are relative to `/home/user/neo1415/q`. "Not found" means a grep and read of the named packages turned up nothing; it is not a guess.

## Summary

- **The run ledger and resumable stream are production-grade and generic. Reuse them.** `q_runtime.runs` + `q_runtime.run_events` have a per-run monotonic `sequence`. SSE replays from `Last-Event-ID` and wakes on Postgres `NOTIFY`. The stream is a closed, Zod-validated event union (`QStreamEventSchema`), and cancel is a deterministic, idempotent lifecycle transition. The vocabulary (stages, subjects) is Capital-Q-specific and has to be swapped out.
- **One Q, many workers, but the engines are fragmented.** Q Brain is a 7-node LangGraph `StateGraph` with a Postgres checkpointer (`BatchedPostgresSaver extends PostgresSaver`). The "workforce" (bounded parallel specialist steps, per-step budgets, HELD/FAILED, resume) is plain TypeScript on a leased Postgres queue. Standing instructions are a third, separate engine. Talent Q should adopt the *contracts* (`BoundStep`, `StepResult`, `boundPlan`) and build one engine, not copy all three.
- **The approval and action contract is the strongest asset.** `QActionProposal` → `QApprovalView` → `ApprovedQAction` → `QActionExecutionReport`. It has a payload-hash binding (`QActionBindingEnvelope`, `sha256:`), idempotency keys, a `RECONCILIATION_REQUIRED` state, and the rule that an edit voids the approval. Reuse it nearly verbatim.
- **Memory has a real write gate, provenance, TTL and revocation:**
  - `MemoryCandidate` / `MemoryItem`: quote-checked, `validTo`, statuses `superseded`, `forgotten` and `revoked`.
  - The Knowledge Write Gate: derived visibility and sensitivity, revisions, `reassessForWithdrawnEvidence`.
  - A computed two-hop "connected recall" graph.

  It covers about 4 of Talent Q's 7 memory layers. Missing: org rules with versions and precedence, and evaluated learning, which today is only "what worked" notes.
- **There is no general org-policy engine.** The pieces that exist are the Context Firewall (11 monotonic stages producing a `PermittedContextPlan`), a pure disclosure evaluator (deny-by-default, union of grant paths), and grant settling (`settleGrant`: AUTO is downgraded to ASK by code). A resolver with versioned rules and precedence is a **GAP**.
- **Artifacts are typed and allowlisted** (`QResultBlockSchema`, a 22-kind discriminated union with `TABLE`, `CHART`, `COMPARISON` and `TIMELINE`, plus a server-side `disclosable()` filter). Documents are versioned (`QArtifactVersion`, PDF/PPTX export). The table and chart contracts are directly mirrorable.
- **Correspondence is half there:**
  - Present: a Google Calendar `CalendarProvider` (idempotent event ids), Gmail `EmailProvider`, SMTP/Brevo, and Postmark inbound.
  - Present: approval-bound email drafts (`relationship.email.propose`).
  - Present: delegation modes `AUTO`/`ASK` with a code-enforced AUTO allowlist.
  - Not found: Microsoft/Outlook, SMS and WhatsApp.
- **Voice and video adapters exist behind ports:**
  - Tavus CVI client; `GateqVideoProvider` for a *video interview* with session caps, allowance and concurrency.
  - Deepgram, ElevenLabs and OpenAI realtime (`RealtimeVoiceProvider`, `LiveVoiceProvider`).
  - The GateQ video interview is the closest analogue to Talent Q interviews.

## Source state

- **Checkout:** `/home/user/neo1415/q`, shallow, branch `build/int-rc`, commit `91a8acbcee5ce00216d4e8fefb3ced2229dc8c0f` ("Merge PR #561 perf/fit-deck-reads-batched"), committed 2026-10-26 12:58 UTC.
- **Integration branch:** per `docs/ai-handoff/HANDOFF-2026-10-26.md` §1, the active integration branch is now `speed/q-oct20`. `build/int-rc` is "kept in step = the deployed SHA". Production was at `e8dc710dc` and the MVP was declared done (QA 99.0%).
- **Read:**
  - root `CLAUDE.md` and `AGENTS.md`
  - `docs/ai-handoff/START-HERE.md`
  - `HANDOFF-2026-10-26.md`, `HANDOFF-2026-10-24-INCIDENT.md` (Supabase egress-quota outage)
  - `AGENT-EXECUTION-MATRIX.md` (an audit of the agent architecture at `b021d53b`; partly historical)
  - `REUSE-MAP.md`
  - the tail of `DECISIONS.md`
- **Not read in full:** `ACTIVE-TASKS.md` (984 lines; superseded for this purpose by the 10-26 handoff).
- **Repo scale:** 61 packages, 4 apps (`web`, `api`, `q-api`, `workers`), 261 migrations. All packages are `"private": true`.
- **Stack versions:** Node 24, TS 5.9 strict, Zod, Fastify 5, Next 16. `@langchain/langgraph@1.4.14`, `@langchain/langgraph-checkpoint-postgres@1.0.5` (`packages/q-orchestrator/package.json:31-33`).

## Need → existing code → verdict

| # | Talent Q need | Where (paths) | What exists (code-grounded) | Verdict | Risks |
|---|---|---|---|---|---|
| 1a | Typed run events to the UI | `packages/contracts/src/q/stream.ts:48-60,289-303`; `packages/q-runtime/src/contracts/index.ts:191-215` | Closed union of 11 `QStreamEventType`s. `Q_STREAM_DURABLE_EVENT_TYPES` vs `Q_STREAM_EPHEMERAL_EVENT_TYPES` (`q.message.delta`, `q.artifact.preview`). Each event is `{contractVersion,eventId,runId,sequence,occurredAt,type,data}` with `.strict()` data. Writer validates before storing (`NewQRunEvent`). | REUSE (shape); ADAPT (vocabulary) | Stage enum and subjects are Capital Q domain; the DB has CHECK constraints on `event_type`/`visible_stage` (`supabase/migrations/20260906120000_q_runtime_foundation.sql:263-290`), so new types need migrations. |
| 1b | Resumable cursor | `packages/q-runtime/src/application/stream.ts:24-45,287-293,320+`; `apps/q-api/src/http/q-events.ts:35-51,195`; `postgres-run-event-notifier.ts` | `GET /v1/q/runs/:runId/events`. `afterSequence` from `Last-Event-ID`. Replay then live (subscribe → read → re-read on wake), `pg_notify` on channel `q_run_events`, 15 s safety poll, heartbeat comments, `retry:` hint, per-user stream caps. Deltas carry no `id:`. | REUSE | A reconnect loses ephemeral deltas by design; UI must render from `q.message.completed`. |
| 1c | Cancel | `packages/q-runtime/src/application/cancel-run.ts:34-60`; `domain/lifecycle.ts`; `contracts/src/q/http.ts:12` | `POST …/cancel`: locked, versioned. Nothing in flight → CANCELLED + `q.run.failed`. In flight → `CANCEL_REQUESTED` (cooperative). Idempotent. `Q_RUN_TRANSITIONS` is the single transition map. | REUSE | Cooperative only; the comment says nothing interrupts an external call. A closed socket is never a cancel. |
| 1d | Cost approval mid-run | `packages/model-gateway/src/policy/spend-cap.ts`; `contracts/src/model/index.ts:490-498`; `apps/q-api/src/composition/workforce/limit.ts` | Per-request `ModelBudget` (`maxEstimatedCostUsd`, `maxAttempts`, tokens, timeout). Daily aggregate `ModelSpendCap` → `BUDGET_EXCEEDED`. Workforce monthly cap checked at job start. **No "approve extra spend" event or approval: not found.** | GAP (event); ADAPT (caps) | Matrix §4/§10.4: job budget is a plan-time sum of constants, not measured spend. |
| 1e | Partial results | `stream.ts:150-160,173-245` (`q.message.delta`, `q.artifact.preview` with optional prebuilt `table`); `model-gateway/src/policy/partial-answer.ts`, `partial-findings.ts` | Streaming JSON scanner extracts `answer` prose before the object closes. Artifact preview pushes subjects/table early. `q.finding.available` is durable. | REUSE | `artifact.preview` is presentation-only; the persisted message's blocks win. |
| 2a | One Q + bounded parallel specialists | `packages/q-orchestrator/src/graph.ts:45-60,566-594`; `workforce/plan.ts:40-84,190`; `workforce/job-runner.ts:26-108,309-356`; `apps/q-api/src/composition/workforce/runner.ts:40,289-300` | **Q Brain:** `StateGraph(QGraphAnnotation)` with nodes preflight → context_firewall → pause → retrieval → answer → action_prepare → approval_gate (`interrupt()`). **Workforce:** `boundPlan` validates `ProposedStep[]` → `BoundStep[]` (refusals `STEP_REFUSALS`, `MAX_JOB_STEPS=12`). `runJob` starts steps when `dependsOn` settle (parallel), serialises `outward` steps, supports `fallbackFor`. Queue `CLAIM_PER_PASS=2` bounds job concurrency. | ADAPT | Matrix §1/§10.11: three or four engines with no shared contract; workforce bypasses q-tools authorize (§10.12); executor errors swallowed (§10.7). |
| 2b | Budgets | `workforce/plan.ts:112-160` (`PlanBounds.budgetUsd`, `stepBudgetUsd`, `DEEP_WORK_STEP_BUDGETS_USD` 0.6/1.2); `contracts/src/model/index.ts:490-498` | Per-step USD budgets summed at plan time (`OVER_BUDGET` refusal). Per-call gateway caps. Daily and monthly caps. Usage ledger `ai_ops.model_usage` attributed by `qRunId`/`correlationId` (`workforceCorrelationId`). | ADAPT | Not measured mid-run; a refused step drops the whole plan (`planIsValid`). |
| 2c | Approvals | `contracts/src/q/action.ts:48-56,79-90,138-152,180-186,239-284`; `contracts/src/q/approval.ts:44-136`; `packages/q-actions/src/definition.ts:43-207`; `q-actions/src/domain/binding.ts`, `lifecycle.ts` | `QActionClass` (SAFE_READ…PROHIBITED); `CONFIRM_REQUIRED`/`RESTRICTED` must require approval (schema refine). Approval binds `hashBindingEnvelope(QActionBindingEnvelope)`; execution re-verifies (`QActionPayloadMismatchError`). | REUSE | Workforce jobs are approved as a whole plan; inner sends are not individually approved (matrix §5). |
| 2d | Action receipts | `q-actions/src/ports.ts:24-51` (`QActionRecord`); `definition.ts:98-112` (`QActionExecutionReport`); `contracts/src/q/ui-act-receipts.ts` | Records carry `idempotencyKey`, `payloadHash`, `executionResult`, `failureCode`, `retryPermitted`, `executionAttempts`, `executedAt`. Outcome `UNKNOWN` → `RECONCILIATION_REQUIRED`. | REUSE | — |
| 2e | Pause / resume | `graph.ts:350-363,520-529` (`interrupt`); `packages/q-orchestrator/src/checkpoint-store.ts:86,114,241`; `packages/app-actions/src/actions/work.ts:55,81,214` | Runs pause at `AWAITING_INPUT`/`AWAITING_APPROVAL` via LangGraph `interrupt()` + Postgres checkpoints (`MemorySaver` in tests only). Resume re-validates the firewall plan (`revalidateOnResume: true`). Standing instructions have `q.work.pause`/`q.work.resume`; jobs have `q.work.job.stop`. Job resume skips DONE steps (`JobRecorder.prior`). | ADAPT | No user-level pause of an in-flight *job* (only stop); pause/resume applies to standing instructions. |
| 3a | L1 live run state | `q-orchestrator/src/state.ts`; checkpointer | LangGraph state channels + Postgres checkpoints; run record `QRunRecord`. | REUSE | — |
| 3b | L2 conversation history | `q-runtime/src/contracts/index.ts:58-189` | `QConversation` (owner-only, `summary` = "untrusted text", `summaryThrough`), `QConversationMessage` with `blocks` re-validated on read. | REUSE | Summary is model-written. |
| 3c | L3 context packs | `packages/security/src/context-cache/cache.ts`, `key.ts`, `isolation.ts`; `apps/q-api/src/voice/live/context.ts` | Process-local `ContextCache<T>`: full scope key, single-flight, invalidation by actor/tenant/org/subject, TTL. "Never authority." | ADAPT | Process memory only, not durable or shared. |
| 3d | L4 durable prefs / org rules with versions | `packages/q-knowledge/src/memory/contracts.ts:39-164`; `q-runtime/src/infrastructure/postgres-etiquette-guides.ts`; `q-core/src/etiquette/guidance.ts:131-141` | Personal prefs via `MemoryItem` (`memoryType: preference`, supersede by `memoryKey`). Personal etiquette guide is append-only versions, personal > platform precedence. **Versioned org rules: not found.** | ADAPT / GAP | Org rule layer must be designed. |
| 3e | L5 entity/evidence graph | `packages/q-knowledge/src/knowledge/write-gate.ts`, `knowledge/contracts.ts:117-266`; `memory/graph.ts:1-30`; `packages/evidence/` | `KnowledgeObject` + `KnowledgeRevision` with truth/evidence/confidence axes, lineage, `validFrom/validTo`. Graph is computed on read (≤2 hops), no graph store. | ADAPT | Subject types are COMPANY/INVESTOR-centric. |
| 3f | L6 episodic task memory | `MEMORY_TYPES` incl. `episodic`, `small_talk` (90-day TTL); `memory/graph.ts` `GraphJob` | Jobs/steps/outputs are durable in workforce tables and read by connected recall. | ADAPT | — |
| 3g | L7 evaluated learning | `apps/q-api/src/composition/workforce/learning.ts:9-24`; `contracts/src/q/memory.ts:79-110`; `packages/q-evals/` | "What worked" notes from approve/edit/reject, through the memory write gate (quote-checked, `LEARNED_NOTES_MAX=6`). Consent `NOT_ASKED/GRANTED/DECLINED/REVOKED`. `q-evals` is an offline grader harness (incl. `workforce/grade.ts`), not wired to promote learnings. | GAP (evaluation loop) | Learning lives in an app composition, not a package. |
| 3h | Write gate / provenance / TTL / revocation | `memory/contracts.ts:82-195`; `memory/service.ts:172-179,476-483`; `write-gate.ts:28-92` | Memory: `writeMode`, `sourceRunId`, `sourceConversationId`, `contentSha256`, refusals `QUOTE_NOT_IN_TURNS`/`SENSITIVE_CONTENT`, `forget`, `validTo`. Knowledge: provenance ids resolved in the actor's tenant, visibility = narrowest input, sensitivity = strongest, `reassessForWithdrawnEvidence`. | REUSE (pattern) | Retrieval is hybrid FTS+pgvector RRF (`retrieval/service.ts:458`); embeddings via OpenAI or local TEI. |
| 4 | Org policy resolved before each action, with precedence | `packages/q-firewall/src/firewall.ts:60-84,264`; `combination.ts:25-78`; `contracts/src/q/firewall.ts:51-117,284-331`; `packages/permissions/src/domain/evaluator.ts`; `app-actions/src/delegation.ts:15-60` | Firewall runs before model invocation and produces a fingerprinted `PermittedContextPlan` (TTL 15 min, `CONTEXT_PLAN_REVALIDATE_AFTER_MS`). Combination-risk rules exist. Disclosure evaluator is deny-by-default, a union of grant paths, with expiry/revocation. Every tool runs `authorize` → `execute`. **A generic org-policy resolver with precedence: not found.** | ADAPT (pipeline) / GAP (policy model) | Firewall scope kinds are investment-specific (`COMPANY_PRIVATE_FINANCIALS`…). |
| 5 | Typed allowlisted artifacts | `contracts/src/q/result-block.ts:43-69,318-353,355-424,596-631`; `contracts/src/q/artifact.ts:41-46,84-99,589-620,722-760,933`; `packages/q-artifacts/`; `packages/deck-render/src/export.ts`; web renderers `apps/web/src/features/q/q-result-blocks.tsx`, `blocks/data-blocks.tsx`, `answer-canvas.tsx` | `QResultBlock` union (TEXT, TABLE, CHART, COMPARISON, COMPARISON_CARDS, TIMELINE, MAP, SUMMARY, ACTION_PROPOSAL, ARTIFACT_REFERENCE, WORK_IN_PROGRESS…). Chart series gated by `chartableSeries` (truth/evidence). Documents are `QArtifactVersion` with sections + findings + `gaps`, `PREPARING/READY/FAILED`, pdf/pptx export. | REUSE (table/chart/comparison/document shape) | `Q_RESULT_BLOCK_KINDS` omits `WORK_IN_PROGRESS` though the union includes it (drift). Comparison blocks reference companies. |
| 6a | Calendar | `packages/integrations/src/google/calendar.ts:11-80,175`; `oauth.ts`; `packages/communication/src/schedule/` (`proposal.ts` state machine, `slots.ts`, `ics.ts`) | Google only: busy, timeZone, probe, insert (client event id = idempotency, Meet link), move, cancel. Slot proposals with `PROPOSAL_TRANSITIONS`. **Microsoft/Outlook: not found.** | ADAPT / GAP (MS) | Busy read via `events.list`, not freeBusy. |
| 6b | Email | `integrations/src/email-provider.ts:33-57`, `google/gmail.ts:96`, `smtp.ts`, `inbound-email.ts` (Postmark); `q-tools/src/tools/email.ts:20-49` | Send from the user's Gmail after approval. Inbound replies via a Q address. Recipient restricted to relationship parties, re-checked at proposal, approval and send. | ADAPT | Tied to "relationship" parties. |
| 6c | SMS / WhatsApp | — | Not found (only text mentions in an etiquette guide). | GAP | — |
| 6d | Delegation modes DRAFT_ONLY / APPROVE_EACH_SEND / APPROVED_CAMPAIGN | `contracts/src/q/instructions.ts:11-29,40,72-140`; `app-actions/src/delegation.ts:15-60`; `review-loop.ts`, `review.ts` | `InstructionActionMode = AUTO \| ASK`, `INSTRUCTION_AUTO_ELIGIBLE_ACTIONS`, a per-counterpart cap of 8 messages, working hours, tone/topics, `routineReplies`, monthly budget. `settleGrant` downgrades AUTO → ASK. Writer/reviewer loop with integrity rules; near-misses become approval cards. | ADAPT (map ASK=APPROVE_EACH_SEND, grant=APPROVED_CAMPAIGN; DRAFT_ONLY not explicit) | Standing-instruction engine is a 3,850-line app file (`apps/q-api/src/composition/instructions/engine.ts`). |
| 7 | Voice / video interview adapters | `integrations/src/tavus/client.ts`; `packages/gateq-intake/src/video/video-interview.ts:29-60,210-260`; `apps/q-api/src/voice/provider.ts:89-100`, `voice/providers/{deepgram,elevenlabs,gpt-live}.ts`; `contracts/src/q/interview.ts:33,166-186`; `model-gateway/src/realtime/openai.ts` | GateQ video interview: Tavus is only the face; every line comes from the canonical typed conversation via a bridge; config `maxSeconds 480`, `perApplication 2`, `concurrency 2`, `testMode`; refusals `DISABLED/ALLOWANCE_EXHAUSTED/CONCURRENCY_LIMIT/PROVIDER_UNAVAILABLE`. The typed/voice interview shares one SSE contract (`sentence/stage/result/problem`). | ADAPT | Voice providers live in `apps/q-api`, not a package; paid providers; owner forbids voice tests. |

## Event and contract shapes worth mirroring

The excerpts below are trimmed. Doc comments are removed and only the load-bearing fields are kept.

**Run status and stage.** `packages/contracts/src/q/run.ts:27-48`, `stage.ts:18-37`:

```ts
Q_RUN_STATUSES = ["RECEIVED","PREFLIGHT","CONTEXT_RESOLUTION","POLICY_CHECK","PLANNING","RETRIEVAL",
  "SPECIALIST_EXECUTION","SYNTHESIS","VERIFICATION","AWAITING_INPUT","AWAITING_APPROVAL",
  "ACTION_EXECUTION","CANCEL_REQUESTED","COMPLETED","FAILED","CANCELLED","EXPIRED"]
// QVisibleStage: closed, approved, user-facing; labels in Q_VISIBLE_STAGE_LABELS (no free-text stage)
```

**Stream event envelope and union.** `packages/contracts/src/q/stream.ts:48-60,118-136,138-301`:

```ts
Q_STREAM_EVENT_TYPES = ["q.run.started","q.stage.changed","q.message.delta","q.artifact.preview",
  "q.message.completed","q.finding.available","q.action.proposed","q.approval.required",
  "q.input.required","q.run.completed","q.run.failed"]
eventShape = { contractVersion, eventId, runId, sequence /* int ≥1 */, occurredAt }  // + type, data (.strict)
"q.approval.required": { proposalId, approvalId, expiresAt? }   // refs only; approve via HTTP, never the stream
"q.run.failed":        { status: "FAILED"|"CANCELLED"|"EXPIRED", failure: QPublicFailure }
"q.artifact.preview":  { messageId, subjects[≤10], layout: "CARD"|"CARDS"|"TABLE"|"SUMMARY"|null, table? }
```

**Stored event record.** `packages/q-runtime/src/contracts/index.ts:191-201`:

```ts
type QRunEventRecord = { id; tenantId; runId; sequence: number; eventType: QStreamEventType;
  visibleStage: QVisibleStage | null; payload: Record<string, unknown>; occurredAt }
```

**Run record.** `packages/q-runtime/src/contracts/index.ts:92-126`:

```ts
QRunRecord fields: id, tenantId, actorUserId, actorOrganisationId, conversationId, objective,
  capability, consequenceClass, status, subjects, orchestrationVersion, promptBundleVersion,
  modelPolicyVersion, correlationId, createdAt, startedAt, completedAt,
  failureCode /* internal */, version, lastEventSequence
```

**Stream service input.** `packages/q-runtime/src/application/stream.ts:287-293`:

```ts
{ run: QRunRecord; afterSequence: number; signal: AbortSignal }
```

**Action, approval and receipt.** `packages/contracts/src/q/action.ts`:

```ts
Q_ACTION_CLASSES = ["SAFE_READ","LOW_RISK_INTERNAL","PREPARE_ONLY","CONFIRM_REQUIRED","RESTRICTED","PROHIBITED"] // :48
Q_ACTION_STATUSES = ["PROPOSED","AWAITING_APPROVAL","APPROVED","EXECUTING","EXECUTED","FAILED",
  "RECONCILIATION_REQUIRED","REJECTED","EXPIRED","WITHDRAWN"]                                         // :79
QActionBindingEnvelope = { bindingVersion: 1, tenantId, organisationId|null, runId, actionId,
  actionType, actionVersion, actionClass, targets[≥1], payload }   // hashed → "sha256:<hex>"      // :138
Q_APPROVAL_STATUSES = ["PENDING","APPROVED","REJECTED","EXPIRED","REVOKED"]                         // :180
QActionProposal = { contractVersion, proposalId, runId, actionType, actionClass, targets, summary,
  preview?, reason?, named?, approval: {required:false}|{required:true, approval?:{approvalId,status}},
  status: "PROPOSED"|"WITHDRAWN"|"EXPIRED", createdAt, expiresAt? }                                 // :239
```

`packages/contracts/src/q/approval.ts:71-85`:

```ts
QApprovalView = { contractVersion, approvalId, runId, status, requestedAt, expiresAt, decidedAt?,
  canDecide, action: QApprovalActionView }
```

`packages/q-actions/src/definition.ts:58-112`:

```ts
ApprovedQAction<P> = { actionId, runId, tenantId, organisationId, actionType, actionVersion, targets,
  payload: P, idempotencyKey, payloadHash, approvalId, approvedByUserId }
QActionExecutionReport<R> = {outcome:"EXECUTED",result:R} | {outcome:"FAILED",failureCode,retryable}
  | {outcome:"UNKNOWN",failureCode}
```

**Tool contract.** `packages/q-tools/src/definition.ts:85-200`:

```ts
QToolDefinition<I,O,G> = { id, version, status, providerName, description, classification,
  riskClass: QActionClass, requiredCapabilities, supportedPurposes: QTaskClass[], idempotency:
  "SAFE_TO_REPEAT", owner, visibleStage, input: ZodType<I>, output: ZodType<O>,
  authorize(input, ctx) => {outcome:"ALLOW",sensitivity,grant:G} | {outcome:"DENY",code,safeMessage},
  execute(input, ctx, grant) }
Q_TOOL_FAILURE_CODES: TOOL_NOT_ELIGIBLE, INVALID_ARGUMENTS, ACTOR_MISMATCH, NOT_AVAILABLE,
  SENSITIVITY_NOT_PERMITTED, CANCELLED, TOOL_INTERNAL_ERROR, INVALID_TOOL_OUTPUT, RESULT_TOO_LARGE, ...
```

**Specialist plan and step.** `packages/q-orchestrator/src/workforce/plan.ts:60-84`, `job-runner.ts:26-46`:

```ts
BoundStep = { key, role, executor, agentName, goal, tools[], dependsOn[], document?, budgetUsd,
  outward: boolean, spawned, why?, evidence?, fallbackFor? }
StepResult = { status: "DONE"|"HELD"|"FAILED", summary, outputs? /* ids & counts, never model prose */ }
WORKFORCE_JOB_STATUSES = ["PLANNING","RUNNING","DONE","HELD","STOPPED","FAILED"]  // contracts/src/q/workforce.ts:69
```

**Memory and knowledge records.** `packages/q-knowledge/src/memory/contracts.ts:39-164`:

```ts
MEMORY_TYPES = ["preference","pronunciation","correction","fact","episodic","small_talk"]
MEMORY_STATUSES = ["candidate","confirmed","active","superseded","forgotten","revoked","archived"]
MEMORY_WRITE_MODES = ["AUTOMATIC_SYSTEM","USER_CONFIRMED","Q_PROPOSED","ADMIN_VERIFIED","DERIVED"]
MemoryCandidate = { memoryType, memoryKey, content, quote|null, subject|null, structuredValue }
MemoryItem = { id, tenantId, ownerContextType, ownerContextId, subject, memoryType, memoryKey, content,
  structuredValue, quote, contentSha256, sourceConversationId, sourceRunId, writeMode, status,
  supersededBy, validFrom, validTo, lastUsedAt, useCount, createdAt, updatedAt }
```

`packages/q-knowledge/src/knowledge/contracts.ts:47-56,117-266`:

```ts
KNOWLEDGE_STATUSES = ["CANDIDATE","ACTIVE","REJECTED","SUPERSEDED","DISPUTED","STALE","REVOKED","ARCHIVED"]
KnowledgeCandidate = { subject, knowledgeType, knowledgeKey, statement, structuredValue,
  truthClassProposal, supportingClaimIds, supportingEvidenceItemIds, supportingSourceIds,
  validFrom, validTo, measurementBasis, correctsEarlier, lineage[{parentObjectId,relationship}], reason }
KnowledgeRevision = { revisionNumber, statement, truthClass, evidenceStatus, confidenceClass,
  changeReason, createdByType: "USER"|"SYSTEM"|"Q", ... }
```

**Context plan (policy resolved before retrieval).** `packages/contracts/src/q/firewall.ts:284-330`:

```ts
PermittedContextPlan = { contractVersion:1, policyVersion, planId, fingerprint /*sha256*/, runId,
  tenantId, actor, purpose:{capability,taskClass}, subjects, scopes[], denied[], maxSensitivity,
  allowedLayers[], combinationConstraints[], evaluatedAt, revalidateAfter, revalidateOnResume: true }
```

**Artifacts.** `packages/contracts/src/q/result-block.ts:318-344,382-424`, `artifact.ts:722-741`:

```ts
QTableBlock = { kind:"TABLE", title, columns[{label, subject|null}], rows[{label, cells: string[]}] }
  // refine: cells.length === columns.length
QChartBlock = { kind:"CHART", chart:"BAR"|"LINE", title, unit, currency|null,
  series[≤4]{label, truthClass, evidenceStatus, source, points[≤24]{label,value}} } // refine chartableSeries
QArtifactVersion = { artifactId, version, title, summary, content:{sections[{heading,body,findings}],
  gaps[], deck?, look?, audit?}, instruction?, composedByRunId?, createdAt }
```

**Delegation grant.** `packages/contracts/src/q/instructions.ts:40,72-140`:

```ts
InstructionActionMode = "AUTO" | "ASK"
InstructionGrant = { actions[{action, mode}], counterparts{scope:"ALL_MY_RELATIONSHIPS"|"LISTED",
  relationshipIds, includeNewCompanies, exclude[]}, workingHours{timeZone,days,start,end}, tone,
  topics[], followUps?, routineReplies?, maxMessagesPerCounterpart, ... }
```

**Model gateway request.** `packages/contracts/src/model/index.ts:36-53,490-498,586-611`:

```ts
ModelGatewayRequest = { taskClass /* MODEL_TASK_CLASSES */, sensitivity, dataPosture, messages, output,
  tools, requiredCapabilities, qualityFloor?, latencyTarget?, reasoning, temperature?,
  budget:{maxAttempts,maxEstimatedCostUsd,maxOutputTokens,attemptTimeoutMs,maxInputTokens?},
  attribution:{tenantId,userId?,qRunId?,correlationId,purpose?}, tenantPolicy? }
```

## Capital-Q-specific coupling to avoid

- **Domain vocabulary baked into "generic" contracts:**
  - `QSubjectRef` kinds are COMPANY, INVESTOR_ORGANISATION, RELATIONSHIP and CAPITAL_OBJECTIVE (`contracts/src/q/subject.ts:29-60`).
  - `Q_VISIBLE_STAGES` (`REVIEWING_INVESTOR_CRITERIA`…), the firewall scope kinds, `Q_TASK_CLASSES`, combination rules (`LIQUIDITY_POSITION`) and `MEMORY_OWNER_CONTEXT_TYPES` (`capital_objective`) are all investment-specific.
  - Mirror the shapes and redefine the enums for hiring: candidate, role or requisition, application, interview.
- **`packages/model-gateway/src/q/`** (78 files; `index.ts` alone is 10,546 lines) is Capital Q's answer pipeline living inside the gateway. Reuse `gateway.ts`, `policy/*`, `providers/*` and `ports.ts` only.
- **`@capital-q/contracts`** is one 151-file barrel (`q/index.ts` is 1,307 lines) that mixes Q runtime contracts with GateQ, deck, readiness and billing. Talent Q should copy the selected schemas into its own contracts package rather than depend on it.
- **App-level composition holds core behaviour:**
  - `apps/q-api/src/main.ts` is 7,768 lines.
  - Workforce runner, learning, limits and the standing-instruction engine live in `apps/q-api/src/composition/**`.
  - The voice providers live in `apps/q-api/src/voice/providers`.

  None of this is importable as a package.
- **Multiple agent engines.** The engines are the LangGraph answer graph, the LangGraph work lanes (`q-orchestrator/src/work/*`), the workforce job runner, and the standing-instruction engine. Each has its own plan schema and review hook (matrix §10.11). Pick one runner for Talent Q.
- **Supabase/Postgres specifics:**
  - Schema-qualified tables (`q_runtime.*`, `ai_ops.model_usage`) with RLS keyed on `identity.tenants` and `identity.user_profiles`.
  - `pg_notify` for stream wakeups.
  - `BatchedPostgresSaver` for checkpoints.
  - The 2026-10-24 egress-quota outage shows the cost of heavy run-event jsonb and 2.5 s polling.
- **Product rules encoded as code:**
  - The ADR-001 truth/evidence/lifecycle axes, "unknown stays unknown", and no LLM in ranking. These are good principles, but their enums are investment-specific.
  - Owner-specific constants: `INSTRUCTION_AUTO_ELIGIBLE_ACTIONS` lists `relationship.interest.express`, and GateQ video defaults.
- **Provider lock-ins:**
  - No Anthropic provider; the gateway has OpenAI, Google, Groq and fake providers (`packages/model-gateway/src/providers/`).
  - Web search is Serper-only today; other providers are exhausted.
  - Tavus keys are owner-held.

## Open questions for the owner

1. **Licensing and access.** May Talent Q copy or fork code from the private `neo1415/q` packages, or only mirror the contracts? Who owns shared packages if both products evolve them?
2. **Engine choice.** Should Talent Q standardise on the LangGraph answer graph plus one durable step runner, retiring the standing-instruction engine pattern?
3. **Delegation modes.** Should `DRAFT_ONLY`, `APPROVE_EACH_SEND` and `APPROVED_CAMPAIGN` replace `AUTO`/`ASK`, or map onto them? Which actions may ever be campaign-auto (Capital Q allows only three)?
4. **Org policy model.** Policy layers, precedence order (platform > org > team > user?), versioning, and whether a policy change mid-run re-plans the run (Capital Q's firewall plans expire after 15 min and on resume).
5. **Cost approval UX.** Is a new durable stream event (for example `q.budget.approval_required`) acceptable? Should budgets be measured spend, not the plan-time constants used today?
6. **Channels.** Are Microsoft 365 calendar/mail, SMS and WhatsApp in V1? Through which provider (Twilio, Meta Cloud API)? None exist in Capital Q.
7. **Interviews.** Is Tavus (video) plus ElevenLabs/Deepgram/OpenAI realtime (voice) acceptable for candidate interviews, given consent and recording rules for hiring? Capital Q's GateQ flow is the template.
8. **Evaluated learning.** What counts as "evaluated"? Is a `q-evals` grader gate before a learning is promoted acceptable, versus Capital Q's direct approve/edit "what worked" notes?
9. **Tenancy and identity.** Will Talent Q share Capital Q's Supabase project, `identity.*` schema and RLS model, or run separately?
