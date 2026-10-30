// Talent Q domain model for the prototype's one authoritative store (World v4).
// Every slice is typed; every change worth auditing is a DomainEvent with an actor and a scope.
// Scope decides who may ever see an event or record:
//   ORG:<id>     members of that organisation (and only them: tenant isolation for agencies)
//   PERSON:<id>  that candidate only (private Passport, J7 practice, private memory)
//   SHARED:<org>:<person>  both, because the candidate chose to share with that organisation
import type { Requirement } from '@contracts';

export type Side = 'recruiter' | 'candidate';
export type OrgRole = 'OWNER' | 'ADMIN' | 'RECRUITER' | 'HIRING_MANAGER' | 'INTERVIEWER' | 'VIEWER';
export type JourneyId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'J12';

export interface Actor {
  id: string; name: string; first: string; initials: string; side: Side; title: string; timezone: string;
  orgId?: string; role?: OrgRole; journey?: JourneyId; email: string;
  /** Candidates: the person record in PEOPLE / people. */
  personId?: string;
  /** False until the person signs up in the prototype (R1, T1, T4 start signed out). */
  signedUp: boolean;
}

export interface Org {
  id: string; name: string; kind: 'EMPLOYER' | 'AGENCY'; industry: string; size: string; city: string;
  verified: { domain: boolean; registry: 'VERIFIED' | 'PENDING' | 'NONE' };
  delegation: 'DRAFT_ONLY' | 'APPROVE_EACH_SEND' | 'APPROVED_CAMPAIGN';
  /** Agencies only: client organisations they recruit for. */
  clients?: string[];
  setup: { done: boolean; step: number };
  guidelines: string[];
}

export type MandateStatus = 'DRAFT' | 'APPROVED' | 'SOURCING' | 'INTERVIEWING' | 'PAUSED' | 'FILLED' | 'CLOSED';
export interface MandateX {
  id: string; orgId: string; clientOrgId?: string; title: string; plain: string; team: string;
  location: string; workMode: 'ONSITE' | 'HYBRID' | 'REMOTE';
  pay: { min: number; max: number; currency: 'NGN' | 'GBP' | 'USD'; period: 'month' | 'year' };
  requirements: Requirement[]; status: MandateStatus; confidential?: boolean;
  versions: { v: number; at: string; by: string; note: string }[];
  createdBy: string;
}

export type Stage = 'SOURCED' | 'SHORTLISTED' | 'CONTACTED' | 'REPLIED' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
export const STAGES: Stage[] = ['SOURCED', 'SHORTLISTED', 'CONTACTED', 'REPLIED', 'INTERVIEW', 'OFFER', 'HIRED'];
export const STAGE_LABEL: Record<Stage, string> = { SOURCED: 'Found', SHORTLISTED: 'Shortlisted', CONTACTED: 'Contacted', REPLIED: 'Replied', INTERVIEW: 'Interview', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Not progressing', WITHDRAWN: 'Withdrew' };
export interface PipelineEntry { mandateId: string; personId: string; stage: Stage; at: string; by: string; note?: string }

export type MsgStatus = 'DRAFT' | 'AWAITING_APPROVAL' | 'QUEUED_OFFLINE' | 'SENT_SIMULATED' | 'RECEIVED' | 'DISCARDED';
/**
 * Delivery is a separate axis from approval (addendum E-01 §6, statechart in handoff/ADDENDUM-HANDOFF.md §2):
 *   APPROVED ─send→ QUEUED ─provider ok→ ACCEPTED ─(provider evidence only)→ DELIVERED
 *                          └ provider error → FAILED (retryable, e.g. AUTH_EXPIRED) | BOUNCED (final)
 * "Sent" in the UI means ACCEPTED by the provider, never "received" or "read".
 */
export type Delivery = 'QUEUED' | 'ACCEPTED' | 'DELIVERED' | 'BOUNCED' | 'FAILED' | 'CANCELLED';
export type FailReason = 'AUTH_EXPIRED' | 'DISCONNECTED' | 'SMTP_REJECTED' | 'RATE_LIMITED' | 'SUPPRESSED' | 'BAD_ADDRESS' | 'OFFLINE' | 'MISSING_ATTACHMENT';
export interface Msg {
  id: string; from: string; to: string; subject?: string; body: string; at: string; status: MsgStatus; approvedBy?: string; receipt?: string; channel: 'EMAIL' | 'IN_APP' | 'SMS';
  // ---- Connected email and candidate contact (addenda, 29 Oct). All optional so earlier records stay valid. ----
  /** MailboxConnection id the message goes out from (email only). Talent Q notices use the service mailbox. */
  senderId?: string; cc?: string[]; bcc?: string[]; attachments?: { id: string; label: string; artifact?: string }[];
  /** Hash of recipients + subject + body + attachments at approval. A material edit changes the hash and voids approval. */
  approvedHash?: string;
  /** One key per approved draft. A retry after an ambiguous failure reuses it, so the provider sends once. */
  idempotencyKey?: string;
  delivery?: Delivery; failReason?: FailReason; providerId?: string; acceptedAt?: string;
  attempts?: { at: string; result: 'ACCEPTED' | 'FAILED' | 'DUPLICATE_PREVENTED'; reason?: FailReason }[];
  /** Inbound only: seen with read scope, and how it was matched to this thread. */
  inbound?: { mailbox?: string; matchedBy: 'PROVIDER_THREAD' | 'SENDER_AND_ROLE' | 'USER_CONFIRMED'; subjectChanged?: boolean };
}
/**
 * Thread lifecycle for candidate-initiated contact (audit addendum §C):
 *   (draft) → AWAITING_PERMISSION (policy needs the org's ok) → OPEN → REPLIED → CLOSED
 *   OPEN with no reply in policy window → TIMEOUT (shown honestly, never as rejection)
 *   either side: MUTED; org: REPORTED → BLOCKED; candidate: CONSENT_REVOKED, APPLICATION_WITHDRAWN
 */
export type ThreadState = 'AWAITING_PERMISSION' | 'OPEN' | 'REPLIED' | 'TIMEOUT' | 'CLOSED' | 'MUTED' | 'REPORTED' | 'BLOCKED' | 'CONSENT_REVOKED' | 'APPLICATION_WITHDRAWN';
export interface Thread {
  id: string; orgId: string; personId: string; mandateId?: string; messages: Msg[];
  /** The hiring campaign this thread was routed into (role → campaign is canonical; this is the routing record). */
  campaignId?: string; initiatedBy?: 'CANDIDATE' | 'ORG'; state?: ThreadState;
  /** Recommended channel and who chose it (Q recommends; an authorised person may override). */
  channel?: { current: 'EMAIL' | 'IN_APP' | 'SMS'; reason: string; overriddenBy?: string };
}

// ---------- Hiring campaigns (audit addendum §D) ----------
/** Groups requisitions (MandateX / the legacy Senior Backend mandate) for navigation and workload. A role points to its
 *  campaign via `campaignOf`; the campaign never copies role or candidate data. Outreach campaigns (agency) are separate. */
export interface HiringCampaign {
  id: string; orgId: string; clientOrgId?: string; name: string; goal: string; owner: string; deadline?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'; createdAt: string; createdBy: string;
  /** Requisition ids in this campaign (mandate ids). The one place the role→campaign link lives. */
  roles: string[];
  savedFilters?: { id: string; label: string; query: string }[];
}

// ---------- Evaluation rubrics (audit addendum §E) ----------
export type CriterionKind = 'ELIGIBILITY' | 'SKILL' | 'INTERVIEW' | 'PRACTICAL' | 'COMPATIBILITY';
export interface RubricCriterion {
  id: string; label: string; kind: CriterionKind; weight: number; minimum?: number;
  /** Anchored levels 0–4: what each rating means, in observable terms. */
  anchors: [string, string, string, string, string];
  evidenceToInspect: string[]; questions: string[]; method: string;
  /** Requirement on the brief it comes from, and the taxonomy reference (ESCO skill, D6). */
  requirementId?: string; escoRef?: string; why: string;
}
/** Q_PROPOSED → (edits) → APPROVED (frozen) → SUPERSEDED when a newer version is approved, with a change notice. */
export interface RubricVersion { v: number; state: 'Q_PROPOSED' | 'APPROVED' | 'SUPERSEDED'; criteria: RubricCriterion[]; at: string; by: string; approvedBy?: string; note: string; changeNotice?: { text: string; affected: string[]; decision?: 'NOTIFY_AND_REASSESS' | 'KEEP_FOR_ROUND' } }
export interface Rubric { id: string; mandateId: string; orgId: string; versions: RubricVersion[] }
export interface EvidenceRef { evidenceId: string; t?: number; tEnd?: number; quote?: string }
/** One rating of one person on one criterion of one rubric version. Q proposes; a person reviews or overrides. */
export interface Rating {
  id: string; rubricId: string; v: number; personId: string; criterionId: string;
  rating: 0 | 1 | 2 | 3 | 4; uncertainty: 'LOW' | 'MEDIUM' | 'HIGH'; refs: EvidenceRef[]; note: string;
  source: 'Q_PROPOSED' | 'REVIEWER'; by: string; at: string; reviewed: boolean;
  override?: { from: number; reason: string; by: string; at: string };
  dispute?: { by: string; text: string; state: 'OPEN' | 'RESOLVED'; at: string };
}

// ---------- Candidate-authorised media evidence (audit addendum §F) ----------
/** CONSENT → (UPLOADING | FETCHING) → TRANSCRIBING → REVIEW (candidate checks transcript) → READY; failure states:
 *  UNSAFE_LINK (never fetched), FETCH_FAILED, PAUSED (upload interrupted, resumable). REVOKED ends sharing. */
export type MediaState = 'CONSENT' | 'UPLOADING' | 'PAUSED' | 'FETCHING' | 'UNSAFE_LINK' | 'FETCH_FAILED' | 'TRANSCRIBING' | 'REVIEW' | 'READY' | 'REVOKED';
export interface MediaEvidence {
  id: string; evidenceId: string; ownerId: string; kind: 'VIDEO' | 'AUDIO';
  source: 'UPLOAD' | 'LINK' | 'PORTFOLIO' | 'INTERVIEW_RECORDING'; title: string; duration: number; contentHash: string;
  state: MediaState; progress?: { done: number; total: number };
  link?: string; transcript: { t: number; text: string; edited?: boolean }[];
  segments: { id: string; t: number; tEnd: number; label: string; sharedWith: string[] }[];
  consent?: { at: string; orgs: string[]; purpose: string; expires?: string; alternativeOffered: boolean };
}
/** Q's evidence report for one media item against one rubric version. Cached by contentHash + rubric version. */
export interface MediaReview {
  id: string; mediaId: string; rubricId: string; v: number; personId: string; orgId: string; cacheKey: string;
  findings: { criterionId: string; moments: { t: number; tEnd: number; text: string }[]; rating?: 0 | 1 | 2 | 3 | 4; uncertainty: 'LOW' | 'MEDIUM' | 'HIGH'; note: string }[];
  notShown: string[]; state: 'Q_DRAFT' | 'HUMAN_REVIEWED' | 'DISPUTED'; reviewedBy?: string;
}

// ---------- Connected email (addendum E-01) ----------
/** NONE → CONSENT (scopes explained) → CONNECTED (SEND or SEND+READ) → EXPIRED (token) → CONNECTED on reconnect;
 *  REVOKED by the user or provider. Credentials never live in the store (production: secret storage). */
export interface MailboxConnection {
  id: string; owner: string; orgId?: string; clientOrgId?: string; provider: 'GOOGLE' | 'MICROSOFT' | 'OTHER' | 'TALENTQ';
  address: string; label: string; kind: 'PERSONAL' | 'ORG' | 'SHARED' | 'CLIENT' | 'SERVICE';
  /** Actors allowed to send as this address (delegation). */
  sendAs: string[]; scopes: ('SEND' | 'READ')[]; state: 'CONNECTED' | 'EXPIRED' | 'REVOKED'; connectedAt: string; simulated: true;
}
export interface ContactPolicy {
  orgId: string; candidateInitiated: 'OFF' | 'AFTER_APPLYING' | 'BEFORE_APPLYING'; channels: ('IN_APP' | 'EMAIL')[];
  /** New candidate-initiated threads per candidate per week. */
  perCandidateWeek: number; publicRoute: string; publicAddress?: string; replyWindowDays: number;
}
export interface Suppression { orgId: string; personId?: string; address?: string; reason: string; at: string }
export interface FollowUpRule { id: string; threadId: string; afterHours: number; state: 'SUGGESTED' | 'SCHEDULED' | 'SENT' | 'CANCELLED'; auto: boolean; cap: number; why: string }

export type EventStatus = 'HOLD' | 'INVITED' | 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULE_REQUESTED';
export interface CalEvent { id: string; orgId: string; title: string; start: string; end: string; attendees: string[]; status: EventStatus; mandateId?: string; personId?: string; simulated: true }

export interface Feedback { by: string; rating: 'STRONG' | 'MIXED' | 'CONCERNS'; notes: string; at: string; evidenceRefs: string[] }
export interface Interview { id: string; orgId: string; mandateId: string; personId: string; eventId?: string; panel: string[]; status: 'PLANNING' | 'INVITED' | 'CONFIRMED' | 'DONE' | 'CANCELLED'; feedback: Feedback[]; candidateFeedback?: string; disputed?: { by: string; reason: string; state: 'OPEN' | 'RESOLVED' } }

export interface Job {
  id: string; orgId: string; mandateId?: string; title: string; location: string; workMode: 'ONSITE' | 'HYBRID' | 'REMOTE'; pay: string; posted: string;
  status: 'OPEN' | 'CLOSED'; needs: string[];
  signals: { domainVerified: boolean; registryVerified: boolean; recruiterActive: boolean; replies: string };
}
export type AppStatus = 'DRAFT' | 'SUBMITTED' | 'VIEWED' | 'INTERVIEW' | 'OFFER' | 'NOT_PROGRESSING' | 'WITHDRAWN' | 'JOB_CLOSED';
export interface Application { id: string; jobId: string; personId: string; status: AppStatus; timeline: { at: string; text: string; by: 'YOU' | 'EMPLOYER' | 'Q' | 'SYSTEM' }[]; shared: string[]; lastEmployerActivity?: string }

/** registeredWith: agencies the person signed up with (an explicit relationship, like applying). */
export interface Consent { personId: string; discoverable: boolean; withdrawnFrom: string[]; registeredWith?: string[]; notifications: { email: boolean; sms: boolean; inApp: boolean; digest: 'DAILY' | 'WEEKLY' | 'OFF' }; lite: boolean }

// ---------- Q ----------
export type QOp = { t: 'say'; text: string } | { t: 'nav'; to: string } | { t: 'do'; op: string; args?: Record<string, unknown> };
export interface QAction { label: string; primary?: boolean; act: QOp }
export interface QMsg {
  id: string; who: 'me' | 'q' | 'system'; text: string; at: string; route?: string;
  used?: string[]; why?: string; actions?: QAction[];
  kind?: 'reply' | 'question' | 'suggestion' | 'refusal' | 'approval' | 'notice' | 'plan' | 'undo';
  /** Live-bound content rendered from state (e.g. a plan's agents or a draft). */
  ref?: { type: string; id: string };
  /** Which engine produced this reply: honest labelling of simulation. */
  engine?: 'rules' | 'gateway' | 'system';
}
export interface QFrame { intent: string; slots: Record<string, string>; awaiting?: string; startedAt: string; topic?: string }
export interface Suggestion { id: string; actor: string; rule: string; subject: string; text: string; why: string; actions: QAction[]; at: string; state: 'OPEN' | 'DISMISSED' | 'SNOOZED' | 'DONE'; until?: string }
export interface UndoEntry { id: string; label: string; at: string; inverse: { op: string; args: Record<string, unknown> } }
export interface QPrefs { proactive: 'OFF' | 'QUIET' | 'NORMAL'; voice: boolean; plain: boolean }
export interface QSlice {
  threads: Record<string, QMsg[]>;
  frames: Record<string, QFrame | null>;
  suggestions: Suggestion[];
  prefs: Record<string, QPrefs>;
  nav: Record<string, { path: string; label: string; at: string }[]>;
  /** View-state per actor and route, e.g. the comparison's focus and filters, restored on return. */
  ui: Record<string, Record<string, unknown>>;
  undo: Record<string, UndoEntry[]>;
  glossarySeen: Record<string, string[]>;
  /** Messages typed while offline, read by Q on reconnect (never silently dropped). */
  outbox: Record<string, string[]>;
}

export interface DomainEvent { id: string; at: string; actor: string; type: string; scope: string; text: string; data?: Record<string, unknown> }

// ---------- Evidence-first hiring (Consolidated Build Pack, 30 Oct: 02_ARCHITECTURE §"CapabilityEvidenceForRole") ----------
// These extend M4/M5/M6/M7/M11/M13; they are not a separate scoring service. The role-evidence evaluation itself is
// the existing Rating (rubrics slice) plus the comparison's per-criterion cell; no global talent score exists.

/** How a piece of evidence is known. Shown on both sides with the same words (Passport and recruiter views). */
export type ProofClass = 'CLAIM' | 'SELF_REPORTED' | 'ASSESSED' | 'ISSUER_VERIFIED' | 'DISPUTED';

/** The CV as the candidate uploaded it, kept separate from evidence. `mentions` says whether the CV text names each
 *  requirement; it is a reading of the document, never a verdict on the person (missing keywords never reject). */
export interface CvDoc { personId: string; uploadedAt: string; polish: 'THIN' | 'POLISHED'; lines: string[]; mentions: Record<string, 'YES' | 'VAGUE' | 'NO'> }

/** The employer's decision about evidence for one requirement: accept what the candidate already has, ask for it to
 *  be verified, or ask for one bounded work sample (with its effort). Avoids repeat assessment (pack §Work A.3). */
export interface EvidenceReuseDecision {
  id: string; orgId: string; personId: string; mandateId: string; reqId: string;
  decision: 'ACCEPT_PRIOR' | 'REQUEST_VERIFICATION' | 'BOUNDED_SAMPLE';
  evidenceIds: string[]; reason: string; effortMinutes?: number; by: string; at: string;
  state: 'PROPOSED' | 'SENT' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEWED' | 'DECLINED';
  /** The evidence the bounded sample produced, once reviewed. */
  resultEvidenceId?: string;
}

/** A participating employer's confirmation that a role is really hiring (never set for discovered external posts). */
export interface HiringIntentConfirmation { jobId: string; orgId: string; state: 'ACTIVE' | 'PAUSED' | 'CLOSED'; owner: string; confirmedAt: string; freshUntil: string; replyWithinDays: number }

/** What the employer has committed to tell a candidate, and by when. Q may send approved factual updates; it never
 *  invents an employer decision. */
export interface ProcessCommitment { id: string; orgId: string; personId: string; applicationId?: string; mandateId: string; milestone: string; nextUpdateDue: string; owner: string; state: 'OPEN' | 'FULFILLED' | 'OVERDUE' }

/** The candidate's own preferences for mutual fit. Unknown stays unknown; it is never scored against them. */
export interface CandidateMutualPreferences { personId: string; payMin?: number; currency?: 'NGN' | 'GBP' | 'USD'; workModes?: ('ONSITE' | 'HYBRID' | 'REMOTE')[]; locations?: string[]; availableFrom?: string; updatedAt: string; shareWith: string[] }
