// Q context and memory (addendum 08 §4). Shapes extend neo1415/q q-knowledge/src/memory/contracts.ts
// (MemoryCandidate, MemoryItem, statuses, write modes) with the addendum's full data contract.

export const MEMORY_LAYERS = [
  'LIVE_STATE', 'CONVERSATION', 'CONTEXT_PACK', 'PREFERENCE_OR_RULE', 'ENTITY_KNOWLEDGE', 'EPISODIC_TASK', 'EVALUATED_LEARNING',
] as const;
export type MemoryLayer = (typeof MEMORY_LAYERS)[number];

export const MEMORY_LAYER_LABELS: Record<MemoryLayer, string> = {
  LIVE_STATE: 'This conversation right now',
  CONVERSATION: 'Conversation history',
  CONTEXT_PACK: 'Summaries of past work',
  PREFERENCE_OR_RULE: 'Preferences and rules',
  ENTITY_KNOWLEDGE: 'People, roles and evidence',
  EPISODIC_TASK: 'What Q did on a task',
  EVALUATED_LEARNING: 'Reviewed improvements',
};

export type LifecycleStatus = 'candidate' | 'confirmed' | 'active' | 'superseded' | 'forgotten' | 'revoked' | 'archived';
export type WriteMode = 'AUTOMATIC_SYSTEM' | 'USER_CONFIRMED' | 'Q_PROPOSED' | 'ADMIN_VERIFIED' | 'DERIVED';
export type TruthClass = 'STATED_BY_USER' | 'VERIFIED_FACT' | 'THIRD_PARTY_CLAIM' | 'INFERENCE' | 'ORG_POLICY';
export type VisibilityScope = 'PERSONAL_PRIVATE' | 'TEAM' | 'ORGANIZATION' | 'SHARED_WITH_EMPLOYER' | 'CANDIDATE_PRIVATE_PRACTICE';
export type RetentionClass = 'RUN' | 'TEMPORARY_TASK' | 'CONFIRMED_PREFERENCE' | 'ORG_GUIDELINE' | 'EVALUATION_RECORD' | 'AGGREGATED_LEARNING';
export type ClassifyAs = 'EXPLICIT_SAVE' | 'TASK_CONTINUITY' | 'MATERIAL_PREFERENCE' | 'EPHEMERAL' | 'THIRD_PARTY_CLAIM' | 'UNCERTAIN_INFERENCE';

export interface SourceRef { kind: 'MESSAGE' | 'DOCUMENT' | 'POLICY' | 'RUN' | 'PROVIDER' | 'ASSESSMENT'; ref: string; label: string; quote?: string; at: string }

export interface MemoryItem {
  memory_id: string;
  layer: MemoryLayer;
  memory_key: string;
  subject_type: 'PERSON' | 'ORGANIZATION' | 'ROLE' | 'MANDATE' | 'TEAM';
  subject_id: string;
  tenant_id: string;
  visibility_scope: VisibilityScope;
  owner_id: string;
  content: string;
  structured_value: Record<string, unknown>;
  source_refs: SourceRef[];
  source_timestamp: string;
  recorded_at: string;
  last_confirmed_at: string | null;
  expires_at: string | null;
  retention_class: RetentionClass;
  truth_class: TruthClass;
  evidence_status: 'SUPPORTED' | 'UNSUPPORTED' | 'CONTESTED';
  lifecycle_status: LifecycleStatus;
  write_mode: WriteMode;
  importance_reason: string;
  confidence_basis: string;
  consent_and_purpose: string;
  supersedes_id: string | null;
  payload_schema_version: 1;
  retrieval_tags: string[];
  encryption_class: 'STANDARD' | 'SENSITIVE';
  delete_or_revoke_state: 'NONE' | 'DELETE_REQUESTED' | 'PURGED' | 'REVOKED';
}

/** What Q may propose; the deterministic write gate decides. The model never persists directly. */
export interface MemoryCandidate {
  layer: MemoryLayer;
  memory_key: string;
  content: string;
  quote: string | null;
  classify_as: ClassifyAs;
  proposed_scope: VisibilityScope;
}

export type WriteGateDecision =
  | { decision: 'WRITE'; item: MemoryItem }
  | { decision: 'ASK_CONFIRMATION'; reason: string }
  | { decision: 'DISCARD'; reason: 'EPHEMERAL' | 'NOT_PERMITTED' | 'REDUNDANT' | 'UNSUPPORTED' };

export type MemoryEvent =
  | { type: 'memory.written'; memory_id: string }
  | { type: 'memory.corrected'; memory_id: string; supersedes_id: string }
  | { type: 'memory.revoked'; memory_id: string; caches_invalidated: string[] }
  | { type: 'memory.forgotten'; memory_id: string };

/** Retrieval pipeline order (addendum): access check first, embeddings never outrank source, authority or time. */
export const RETRIEVAL_STEPS = [
  'ACCESS_CHECK', 'TASK_ENTITY_ROUTING', 'STRUCTURED_FACTS', 'LEXICAL_SEMANTIC_LOOKUP', 'TIME_SOURCE_VALIDITY', 'CONFLICT_DETECTION', 'RELEVANCE_SCORING', 'BUDGET_PACKING',
] as const;

/** A context pack: what Q is using for the current task, with scope and revision ids. */
export interface ContextPack {
  packId: string;
  task: string;
  scopeFingerprint: string;
  revision: number;
  items: { memory_id: string; why: string }[];
  excluded: { memory_id: string; reason: 'REVOKED' | 'OUT_OF_SCOPE' | 'STALE' | 'PRIVATE_PRACTICE' }[];
  expiresAt: string;
}
