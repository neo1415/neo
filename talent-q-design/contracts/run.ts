// Q run and stream contracts for Talent Q.
// Mirrors neo1415/q packages/contracts/src/q/{stream,run,stage}.ts (build/int-rc 91a8acb):
// same envelope, same durable/ephemeral split, same closed vocabulary rule.
// Hiring-specific stages replace investment ones. Members marked EXTENSION are
// proposals that do not exist in Q today (see research/Q-REUSE-AUDIT.md).

export const CONTRACT_VERSION = 'tq.2026-10' as const;

export type RunId = `run_${string}`;
export type EventId = `evt_${string}`;
export type UtcTimestamp = string;

export const RUN_STATUSES = [
  'RECEIVED', 'PREFLIGHT', 'CONTEXT_RESOLUTION', 'POLICY_CHECK', 'PLANNING', 'RETRIEVAL',
  'SPECIALIST_EXECUTION', 'SYNTHESIS', 'VERIFICATION', 'AWAITING_INPUT', 'AWAITING_APPROVAL',
  'ACTION_EXECUTION', 'CANCEL_REQUESTED', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED',
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];
export const TERMINAL_STATUSES: readonly RunStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'];

/** Closed list of what a person may be told Q is doing. Labels may change; ids may not. */
export const VISIBLE_STAGES = [
  'UNDERSTANDING_REQUEST',
  'APPLYING_POLICY',
  'READING_MANDATE',
  'SEARCHING_SOURCES',
  'READING_PROFILES',
  'CHECKING_EVIDENCE',
  'COMPARING_CANDIDATES',
  'CHECKING_CALENDARS',
  'CALCULATING_SLOTS',
  'DRAFTING_MESSAGE',
  'PREPARING_DOCUMENT',
  'PREPARING_PLAN',
  'WAITING_FOR_REPLY',
  'WAITING_FOR_APPROVAL',
  'COMPLETING_APPROVED_ACTION',
] as const;
export type VisibleStage = (typeof VISIBLE_STAGES)[number];

export const STAGE_LABELS: Record<VisibleStage, string> = {
  UNDERSTANDING_REQUEST: 'Understanding what you asked',
  APPLYING_POLICY: 'Applying your organisation’s rules',
  READING_MANDATE: 'Reading the mandate',
  SEARCHING_SOURCES: 'Searching permitted sources',
  READING_PROFILES: 'Reading profiles',
  CHECKING_EVIDENCE: 'Checking evidence',
  COMPARING_CANDIDATES: 'Comparing candidates',
  CHECKING_CALENDARS: 'Checking calendars (busy times only)',
  CALCULATING_SLOTS: 'Finding times that work',
  DRAFTING_MESSAGE: 'Drafting a message',
  PREPARING_DOCUMENT: 'Preparing a document',
  PREPARING_PLAN: 'Preparing a plan',
  WAITING_FOR_REPLY: 'Waiting for a reply',
  WAITING_FOR_APPROVAL: 'Waiting for your approval',
  COMPLETING_APPROVED_ACTION: 'Doing what you approved',
};

export type Capability =
  | 'mandate.intake' | 'talent.sourcing' | 'talent.compare' | 'outreach.draft'
  | 'schedule.interview' | 'interview.conduct' | 'career.plan' | 'memory.review' | 'org.setup';

/** One bounded specialist step inside a run (mirrors workforce BoundStep / StepResult). */
export interface RunStep {
  stepId: string;
  stage: VisibleStage;
  label: string;
  /** Measured units, never a timer: e.g. profiles read of total. */
  done: number;
  total: number | null;
  result: 'RUNNING' | 'DONE' | 'HELD' | 'FAILED';
  failure?: { code: StepFailureCode; recoverable: boolean; message: string };
}
export type StepFailureCode = 'SOURCE_UNAVAILABLE' | 'RATE_LIMITED' | 'PERMISSION_DENIED' | 'POLICY_BLOCKED' | 'TIMEOUT' | 'BUDGET_EXCEEDED';

interface Envelope<T extends string, D> {
  contractVersion: typeof CONTRACT_VERSION;
  eventId: EventId;
  runId: RunId;
  /** Starts at 1, +1 per event. Durable events are the resume cursor. */
  sequence: number;
  occurredAt: UtcTimestamp;
  type: T;
  data: D;
}

export type RunStarted = Envelope<'q.run.started', { capability: Capability; status: RunStatus; title: string }>;
export type StageChanged = Envelope<'q.stage.changed', { stage: VisibleStage; status: RunStatus }>;
export type MessageDelta = Envelope<'q.message.delta', { messageId: string; text: string }>;
export type ArtifactPreview = Envelope<'q.artifact.preview', { artifactId: string; partial: boolean }>;
export type MessageCompleted = Envelope<'q.message.completed', { messageId: string; text: string; usedContext: ContextUse[] }>;
export type FindingAvailable = Envelope<'q.finding.available', { findingId: string; kind: 'candidate' | 'source' | 'slot' | 'gap' | 'conflict'; ref: string; summary: string }>;
export type ActionProposed = Envelope<'q.action.proposed', { proposalId: string }>;
export type ApprovalRequired = Envelope<'q.approval.required', { proposalId: string; payloadHash: `sha256:${string}` }>;
export type InputRequired = Envelope<'q.input.required', { questionId: string; prompt: string; options?: string[] }>;
export type RunCompleted = Envelope<'q.run.completed', { status: 'COMPLETED'; artifactIds: string[] }>;
export type RunFailed = Envelope<'q.run.failed', { status: 'FAILED' | 'CANCELLED' | 'EXPIRED'; code: string; recoverable: boolean; message: string }>;
/** EXTENSION: per-step progress for parallel specialists. Q keeps this inside workforce jobs, not on the stream. */
export type StepUpdated = Envelope<'q.step.updated', RunStep>;
/** EXTENSION: mid-run spend approval. Gap noted in the audit (need 1). */
export type CostApprovalRequired = Envelope<'q.cost.approval.required', { estimateMinorUnits: number; currency: string; reason: string }>;

export type QStreamEvent =
  | RunStarted | StageChanged | MessageDelta | ArtifactPreview | MessageCompleted | FindingAvailable
  | ActionProposed | ApprovalRequired | InputRequired | RunCompleted | RunFailed | StepUpdated | CostApprovalRequired;
export type QStreamEventType = QStreamEvent['type'];

export const EPHEMERAL_TYPES: readonly QStreamEventType[] = ['q.message.delta', 'q.artifact.preview'];
export const isDurable = (e: QStreamEvent) => !EPHEMERAL_TYPES.includes(e.type);

/**
 * Transport: GET /v1/q/runs/:runId/events (SSE). The client sends Last-Event-ID = last durable sequence.
 * The server replays durable events after it; ephemeral deltas are never replayed.
 */
export interface StreamOpen { runId: RunId; afterSequence: number }

/** Every answer separates these four sources (directive Track A). */
export interface ContextUse {
  kind: 'CURRENT_PROMPT' | 'AUTHORIZED_FACT' | 'KNOWLEDGE_SOURCE' | 'INFERENCE' | 'MEMORY' | 'POLICY';
  label: string;
  ref?: string;
}
