// Mandates, people, evidence and J7. No global talent score: every measure is named and scoped (addendum 08 §3, J8).

export type EvidenceState =
  | 'VERIFIED_CAPABILITY' | 'EVIDENCED' | 'NOT_EVIDENCED' | 'EVIDENCE_OUTDATED' | 'BELOW_TARGET_ON_ASSESSMENT' | 'REQUIREMENT_UNCLEAR';

export const EVIDENCE_LABELS: Record<EvidenceState, string> = {
  VERIFIED_CAPABILITY: 'Verified',
  EVIDENCED: 'Evidenced',
  NOT_EVIDENCED: 'Not evidenced yet',
  EVIDENCE_OUTDATED: 'Evidence outdated',
  BELOW_TARGET_ON_ASSESSMENT: 'Below target on assessment',
  REQUIREMENT_UNCLEAR: 'Requirement unclear',
};

export interface Requirement { reqId: string; label: string; mustHave: boolean; plain: string }

export interface Mandate {
  mandateId: string;
  title: string;
  team: string;
  location: string;
  workMode: 'ONSITE' | 'HYBRID' | 'REMOTE';
  payBand: string;
  requirements: Requirement[];
  version: number;
  status: 'DRAFT' | 'APPROVED' | 'SOURCING' | 'INTERVIEWING' | 'CLOSED';
  approvedBy?: string;
}

export interface Evidence {
  evidenceId: string;
  ownerId: string;
  /** CLAIM = said by the candidate (CV or conversation), not evidence. PRACTICE = private practice, never shareable. */
  kind: 'PROJECT' | 'CREDENTIAL' | 'ASSESSMENT' | 'WORK_SAMPLE' | 'REFERENCE' | 'EMPLOYMENT' | 'CLAIM' | 'PRACTICE';
  title: string;
  source: string;
  observedAt: string;
  verified: boolean;
  /** What it shows, in plain language for non-technical recruiters. */
  shows: string;
  limits: string;
  visibility: 'PRIVATE' | 'SHARED_WITH' | 'PUBLIC_PROFILE';
  sharedWith: string[];
  /** Where the item came from in Talent Q (onboarding, J7, an upload, a reviewer). */
  origin?: 'ONBOARDING' | 'J7' | 'UPLOAD' | 'REVIEW' | 'SEED';
  /** Verification lifecycle; PENDING means not yet checked, which is different from failed. */
  verification?: 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'FAILED' | 'UNDER_REVIEW';
  /** The original is confidential; only a redacted summary or an attestation may be shared. */
  confidential?: boolean;
  redactedOf?: string;
  /** Organisations whose access the candidate revoked (kept for audit, never re-granted silently). */
  revokedFrom?: string[];
}

export interface Person {
  personId: string;
  name: string;
  headline: string;
  location: string;
  timezone: string;
  synthetic: true;
}

/** Role-specific, two-sided fit for one mandate (Q-Match baseline). Never shown as one number. */
export interface RoleFit {
  personId: string;
  mandateId: string;
  byRequirement: { reqId: string; state: EvidenceState; evidenceIds: string[]; note: string }[];
  mutual: { workMode: 'MATCH' | 'PARTIAL' | 'MISMATCH' | 'UNKNOWN'; pay: 'MATCH' | 'PARTIAL' | 'MISMATCH' | 'UNKNOWN'; location: 'MATCH' | 'PARTIAL' | 'MISMATCH' | 'UNKNOWN' };
  unknowns: string[];
}

// ---- J7 Career Intelligence ----

export type J7Engine = 'B1_NAVIGATOR' | 'B2_GAP_EXPLAINER' | 'B3_GROWTH_PLANNER' | 'B4_PRACTICE_STUDIO' | 'B5_EVIDENCE_BUILDER' | 'B6_PROGRESS_LOOP';

export interface CareerGoal { goalId: string; targetRole: string; roleFamily: string; horizon: string; preferences: { location: string; remote: boolean; salaryFloor?: string }; status: 'ACTIVE' | 'ARCHIVED'; archivedReason?: string }

export interface Competency { competencyId: string; label: string; plain: string; rubricVersion: string; levels: { level: number; descriptor: string }[] }

export interface RoleGap { competencyId: string; state: EvidenceState; why: string; nextStep: string; minutes: number }

/** The six separate measures. Each carries its own basis; none are combined. */
export interface J7Measures {
  evidence_coverage: { covered: number; total: number };
  competency_mastery: { competencyId: string; level: number | null; rubricVersion: string; conditions: string; uncertainty: string }[];
  practice_progress: { competencyId: string; attempts: { at: string; level: number }[]; comparable: boolean }[];
  role_fit: { mandateId: string | null; summary: 'STRONG' | 'PARTIAL' | 'WEAK' | 'UNKNOWN' };
  readiness_to_apply: { item: string; done: boolean }[];
  growth_plan_adherence: { private: true; planned: number; done: number };
}

export interface PracticeAttempt {
  attemptId: string;
  competencyId: string;
  mode: 'TEXT' | 'FORM' | 'VOICE';
  rubricVersion: string;
  level: number;
  feedback: { criterion: string; observed: string; improve: string }[];
  /** Private by default; promotion to evidence needs explicit approval (B5). */
  visibility: 'PRIVATE_PRACTICE' | 'PROMOTED_TO_EVIDENCE';
  at: string;
}
