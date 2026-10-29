// The Q workspace contract (draft, 29 Oct 2026). What the future Q runtime must emit so the Direction D
// workspace can show Q's work truthfully. The prototype's scripted view switching does NOT satisfy this
// contract by itself: in the prototype a human-written mapping chooses each view. In production, Q must
// return typed artifacts whose views and stated reason come from the run. See Q-WORKSPACE-CONTRACT.md.
// These events extend the stream in ./run.ts (same envelope, cursor and durability rules); they do not
// introduce a second orchestration system and they do not change neo1415/q.
import type { RunId, UtcTimestamp } from './run';

type Env<T extends string, D> = { contractVersion: 'tq.2026-10'; eventId: string; runId: RunId; sequence: number; occurredAt: UtcTimestamp; type: T; data: D };

/** 1. Understanding: Q restates the request and either proceeds or asks. */
export type RequestUnderstood = Env<'q.request.understood', { intent: string; restated: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; missing: string[] }>;
export type ClarificationRequired = Env<'q.clarification.required', { questionId: string; prompt: string; options: { id: string; label: string; consequence: string }[]; allowFreeText: boolean; blocking: boolean }>;

/** 2. Context: only authorised items, each with its source and scope, shown to the user before use. */
export interface ContextItem { ref: string; kind: 'MEMORY' | 'POLICY' | 'INSTRUCTION' | 'DOCUMENT' | 'RECORD' | 'CONVERSATION'; label: string; scope: 'USER' | 'ORG' | 'SHARED_BY_CANDIDATE' | 'PUBLIC'; version?: string; usedFor: string }
export type ContextRecalled = Env<'q.context.recalled', { items: ContextItem[]; withheld: { kind: ContextItem['kind']; reason: 'NOT_AUTHORISED' | 'PRIVATE_TO_OTHER_PARTY' | 'REVOKED' | 'EXPIRED' }[] }>;
export type PolicyApplied = Env<'q.policy.applied', { policyRef: string; version: string; rule: string; effect: 'CONSTRAINS_PLAN' | 'REQUIRES_APPROVAL' | 'BLOCKS_ACTION' }>;

/** 3. Planning and delegation: a DAG of tasks, each owned by a named agent, with explicit approval gates. */
export interface PlanTask { taskId: string; label: string; agent: string; dependsOn: string[]; tool: string; unit: string; estimatedUnits: number | null; gate?: { kind: 'SEND_MESSAGE' | 'CALENDAR_WRITE' | 'CONTACT_THIRD_PARTY' | 'SPEND' | 'SHARE_DATA'; policyRef?: string }; optional: boolean }
export type PlanProposed = Env<'q.plan.proposed', { planId: string; goal: string; tasks: PlanTask[]; estimate: { minutes: number | null; costMinorUnits: number | null; currency?: string }; requiresStartApproval: boolean }>;
export type TaskUpdated = Env<'q.task.updated', { planId: string; taskId: string; state: 'BLOCKED' | 'READY' | 'RUNNING' | 'WAITING_INPUT' | 'DONE' | 'SKIPPED' | 'FAILED'; done: number; total: number | null; note?: string }>;

/** 4. Tools and integrations: every external call is attributable, and unavailability is reported by name. */
export type ToolCalled = Env<'q.tool.called', { callId: string; taskId: string; tool: string; connector: string; simulated: boolean }>;
export type ToolResult = Env<'q.tool.result', { callId: string; ok: boolean; summary: string; units: number }>;
export type IntegrationUnavailable = Env<'q.integration.unavailable', { connector: string; reason: 'NOT_CONNECTED' | 'RATE_LIMITED' | 'AUTH_EXPIRED' | 'OUTAGE' | 'POLICY_DISABLED'; recovery: 'RETRYING' | 'SKIPPED' | 'ASK_USER'; retryAt?: UtcTimestamp }>;
export type TaskFindingAvailable = Env<'q.finding.available', { findingId: string; taskId: string; kind: string; summary: string; evidenceRefs: string[] }>;

/** 5. Presentation: Q chooses views for an artifact and says why. The client renders only known view kinds. */
export type ViewKind = 'SIEVE' | 'CARDS' | 'LEDGER' | 'RELATION_MAP' | 'PAIR' | 'WEEK_PLAN' | 'AGENDA' | 'ATLAS' | 'BANDS' | 'PLAN_GRAPH' | 'AGENT_LANES' | 'APPROVAL_QUEUE' | 'DOCUMENT' | 'TABLE' | 'TIMELINE' | 'SMALL_MULTIPLES';
export interface ArtifactView { viewId: string; kind: ViewKind; label: string; /** A plain sentence the UI shows: why this view answers the request. */ reason: string; /** Data binding: paths into the artifact content the view reads. */ binds: string[]; fallback: 'TABLE' | 'LIST'; scale?: { unitLimit: number; aggregateAs: string } }
export interface ArtifactVersion { artifactId: string; version: number; label: string; createdBy: RunId; basedOn: number | null; views: ArtifactView[]; defaultView: string; sources: string[]; simulated: boolean }
export type ArtifactCreated = Env<'q.artifact.created', { artifact: ArtifactVersion; titleStatesFinding: string }>;
/** Progressive update: a JSON patch to content, plus which views it affects. Partial artifacts are allowed and marked. */
export type ArtifactPatched = Env<'q.artifact.patched', { artifactId: string; version: number; patch: { op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }[]; partial: boolean; affectsViews: string[] }>;
export type FollowUpsOffered = Env<'q.followups.offered', { artifactId: string; actions: { id: string; label: string; primary: boolean; gate?: PlanTask['gate'] }[] }>;

/** 6. Continuity: durable cursors; a paused or interrupted run resumes from its last finished unit. */
export type RunPaused = Env<'q.run.paused', { by: 'USER' | 'POLICY' | 'BUDGET' | 'DISCONNECT'; resumable: boolean; cursor: number }>;
export type RunResumed = Env<'q.run.resumed', { fromCursor: number; sessionId: string }>;

/** 7. Authorisation: consequential actions are proposals until approved; approval binds to a payload hash. */
export interface Handoff { proposalId: string; kind: NonNullable<PlanTask['gate']>['kind']; to: string; preview: string; effect: string; payloadHash: `sha256:${string}`; expiresAt?: UtcTimestamp; reversible: boolean }
export type HandoffProposed = Env<'q.handoff.proposed', Handoff>;
export type HandoffDecided = Env<'q.handoff.decided', { proposalId: string; decision: 'APPROVED' | 'REJECTED' | 'EDITED'; receipt?: { provider: string; ref: string; simulated: boolean } }>;

export type WorkspaceEvent =
  | RequestUnderstood | ClarificationRequired | ContextRecalled | PolicyApplied | PlanProposed | TaskUpdated
  | ToolCalled | ToolResult | IntegrationUnavailable | TaskFindingAvailable
  | ArtifactCreated | ArtifactPatched | FollowUpsOffered | RunPaused | RunResumed | HandoffProposed | HandoffDecided;

/** Ephemeral (not replayed after a cursor): progress ticks may be coalesced; everything else is durable. */
export const WORKSPACE_EPHEMERAL: WorkspaceEvent['type'][] = ['q.tool.called'];
