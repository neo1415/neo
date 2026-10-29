// Talent Q domain model for the prototype's one authoritative store (World v4).
// Every slice is typed; every change worth auditing is a DomainEvent with an actor and a scope.
// Scope decides who may ever see an event or record:
//   ORG:<id>     members of that organisation (and only them: tenant isolation for agencies)
//   PERSON:<id>  that candidate only (private Passport, J7 practice, private memory)
//   SHARED:<org>:<person>  both, because the candidate chose to share with that organisation
import type { Requirement } from '@contracts';

export type Side = 'recruiter' | 'candidate';
export type OrgRole = 'OWNER' | 'ADMIN' | 'RECRUITER' | 'HIRING_MANAGER' | 'INTERVIEWER' | 'VIEWER';
export type JourneyId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

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
export interface Msg { id: string; from: string; to: string; subject?: string; body: string; at: string; status: MsgStatus; approvedBy?: string; receipt?: string; channel: 'EMAIL' | 'IN_APP' | 'SMS' }
export interface Thread { id: string; orgId: string; personId: string; mandateId?: string; messages: Msg[] }

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
