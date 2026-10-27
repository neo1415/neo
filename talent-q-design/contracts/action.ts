// Proposals, approvals and receipts. Mirrors neo1415/q contracts/src/q/{action,approval}.ts and
// q-actions definition.ts: an approval binds to the sha256 of the exact payload, so any edit needs re-approval.

export const ACTION_CLASSES = ['SAFE_READ', 'LOW_RISK_INTERNAL', 'PREPARE_ONLY', 'CONFIRM_REQUIRED', 'RESTRICTED', 'PROHIBITED'] as const;
export type ActionClass = (typeof ACTION_CLASSES)[number];

export const ACTION_STATUSES = ['PROPOSED', 'AWAITING_APPROVAL', 'APPROVED', 'EXECUTING', 'EXECUTED', 'FAILED', 'RECONCILIATION_REQUIRED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

/** Talent Q's delegation modes (addendum 08). Mapping to Q grants: DRAFT_ONLY = no grant, APPROVE_EACH_SEND = ASK, APPROVED_CAMPAIGN = AUTO within a bounded grant. */
export type DelegationMode = 'DRAFT_ONLY' | 'APPROVE_EACH_SEND' | 'APPROVED_CAMPAIGN';

export interface CampaignGrant {
  grantId: string;
  mode: 'APPROVED_CAMPAIGN';
  audience: string;
  templateId: string;
  maxSends: number;
  sent: number;
  budgetMinorUnits: number;
  expiresAt: string;
}

export type ActionType =
  | 'message.send' | 'calendar.event.create' | 'calendar.event.cancel' | 'candidate.stage.move'
  | 'evidence.share' | 'memory.write' | 'mandate.publish' | 'policy.publish';

export type Channel = 'EMAIL' | 'IN_APP' | 'SMS' | 'WHATSAPP_MESSAGE' | 'WHATSAPP_CALL' | 'PHONE';

export interface PolicyCitation { policyId: string; version: number; layer: PolicyLayer; text: string }
export type PolicyLayer = 'PLATFORM' | 'JURISDICTION' | 'CONSENT' | 'ORG_RULE' | 'MANDATE' | 'PERSON_PREFERENCE' | 'CURRENT_INSTRUCTION';
/** Highest first. A lower layer can narrow but never widen a higher one. */
export const POLICY_PRECEDENCE: readonly PolicyLayer[] = ['PLATFORM', 'JURISDICTION', 'CONSENT', 'ORG_RULE', 'MANDATE', 'PERSON_PREFERENCE', 'CURRENT_INSTRUCTION'];

export interface ActionProposal<P = unknown> {
  proposalId: string;
  runId: string;
  actionType: ActionType;
  actionClass: ActionClass;
  summary: string;
  /** Human-readable preview of exactly what will happen. */
  preview: string;
  payload: P;
  payloadHash: `sha256:${string}`;
  delegation: DelegationMode;
  /** Policies resolved before drafting; rechecked before execution. */
  policies: PolicyCitation[];
  evidenceRefs: string[];
  status: ActionStatus;
  simulated: true;
}

export interface MessagePayload {
  to: { personId: string; name: string };
  channel: Channel;
  subject?: string;
  body: string;
  templateId?: string;
  attachments: { evidenceId: string; approvedForRecipient: boolean }[];
}

export interface ActionReceipt {
  proposalId: string;
  outcome: 'EXECUTED' | 'FAILED' | 'UNKNOWN';
  idempotencyKey: string;
  provider: string;
  providerRef?: string;
  /** Always true in the design prototype: no real provider is called. */
  simulated: true;
  at: string;
  approvedBy: string;
}
