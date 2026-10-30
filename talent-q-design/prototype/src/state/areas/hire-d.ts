// HIRE-D slice (coverage build, 30 Oct): search scope per organisation, saved discovery, interview bookings with
// format, recruiter stage notes and due dates, offers (Q drafts, people approve, a named person hands off; Q never
// sends), HiringOutcome records (consented, human-verified, kept apart from evidence and ratings), the reminder
// queue's decisions, candidates' own reminder opt-outs, and simulated delivery receipts. Lives at w.areas['hire-d'].
import type { World } from '../../mock/world';

/** Sources Q may search for an organisation (permitted sources only; see journeys/hire-d/model.ts SOURCES). */
export interface ScopeChoice { on: string[]; by: string; at: string }
export interface SavedDiscovery { id: string; orgId: string; label: string; query: string; by: string; at: string; seen: string[] }
export type Format = 'VIDEO' | 'PHONE' | 'ONSITE';
/** What the candidate said about when they can meet (from their reply; simulated). Unknown stays unset. */
export interface Availability { personId: string; text: string; days?: number[]; part?: 'morning' | 'afternoon'; sharedAt: string }
export interface Booking { id: string; orgId: string; personId: string; mandateId?: string; format: Format; slot: { start: string; end: string }; panel: string[]; holdId: string; msgId: string; by: string; at: string }
export interface StageNote { id: string; text: string; by: string; at: string }
export interface StageDue { date: string; what: string; by: string; at: string }

export type OfferState = 'DRAFT' | 'AWAITING_APPROVAL' | 'APPROVED' | 'HANDED_OFF' | 'NEGOTIATING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
export interface OfferVersion { v: number; at: string; by: string; amount: number | null; start: string | null; note: string }
export interface OfferApproval { role: 'HIRING_MANAGER' | 'HR'; who: string; v?: number; at?: string; voided?: string }
export interface Offer {
  id: string; orgId: string; personId: string; mandateId: string; state: OfferState; currency: 'NGN';
  amount: number | null; start: string | null; terms: string; versions: OfferVersion[]; approvals: OfferApproval[];
  handoff?: { by: string; at: string; how: string };
  counter?: { amount: number | null; text: string; at: string; by: string };
  answer?: { what: 'ACCEPTED' | 'DECLINED'; at: string; by: string; note: string };
  requestedBy: string;
}

export type MilestoneKind = 'OFFER_ACCEPTED' | 'STARTED' | 'CHECKIN_30' | 'CHECKIN_90';
export interface Milestone { kind: MilestoneKind; due?: string; at?: string; verifiedBy?: string; note?: string }
/** HiringOutcome (pack 02 §9): consented, human-verified status events; longer-term outcomes held separately. */
export interface HiringOutcome {
  id: string; orgId: string; personId?: string; name: string; roleTitle: string; mandateId?: string; offerId?: string;
  milestones: Milestone[];
  consent: { state: 'NOT_ASKED' | 'ASKED' | 'GIVEN' | 'DECLINED'; at?: string; scope: string };
  longTerm: string;
}

export type ReminderKind = 'CONFIRM_FOLLOWUP' | 'INTERVIEW_24H' | 'COMMITMENT_UPDATE';
export interface ReminderDecision { id: string; orgId: string; personId: string; kind: ReminderKind; subject: string; state: 'SCHEDULED' | 'SENT' | 'CANCELLED'; sendAt: string; channel: 'EMAIL' | 'SMS' | 'IN_APP'; approvedBy: string; at: string; msgId?: string; reason?: string }
export interface Receipt { deliveredAt?: string; readAt?: string }

export interface HireDState {
  scope: Record<string, ScopeChoice>;
  saved: SavedDiscovery[];
  availability: Record<string, Availability>;
  bookings: Booking[];
  formats: Record<string, Format>;
  notes: Record<string, StageNote[]>;
  due: Record<string, StageDue>;
  offers: Offer[];
  outcomes: HiringOutcome[];
  reminders: ReminderDecision[];
  /** The candidate's own choice: no interview reminders from employers (set on /c/reminders). */
  optOut: Record<string, { at: string }>;
  receipts: Record<string, Receipt>;
  /** Testing switch: one source fails to refresh (shown, never hidden). */
  sourceDown: boolean;
  checkedAt: Record<string, string>;
}

export const area = {
  id: 'hire-d',
  init: (): HireDState => ({
    scope: {},
    saved: [
      { id: 'sd_pg', orgId: 'org_kora', label: 'Postgres in production, Lagos or remote', query: 'postgres', by: 'u_ada', at: '2026-10-21T10:00:00+01:00', seen: ['p_tobi', 'p_ife'] },
      { id: 'sd_support', orgId: 'org_kora', label: 'Support leads who have run a team', query: 'support lead', by: 'u_ngozi', at: '2026-10-12T09:30:00+01:00', seen: [] },
    ],
    availability: {
      p_tobi: { personId: 'p_tobi', text: 'Weekday afternoons work best', part: 'afternoon', sharedAt: '2026-10-28T12:10:00+01:00' },
      p_zara: { personId: 'p_zara', text: 'Mornings, Accra time; not Wednesdays', part: 'morning', days: [1, 2, 4, 5], sharedAt: '2026-10-27T10:12:00+01:00' },
    },
    bookings: [], formats: {}, notes: {
      'm_backend:p_tobi': [{ id: 'sn_1', text: 'Strong reconciliation work; ask about on-call load at Lumen.', by: 'u_ada', at: '2026-10-24T16:00:00+01:00' }],
    },
    due: { 'm_backend:p_tobi': { date: '2026-11-04', what: 'Book the technical interview', by: 'u_ada', at: '2026-10-24T16:00:00+01:00' } },
    offers: [],
    outcomes: [
      { id: 'ho_bisi', orgId: 'org_kora', name: 'Bisi Lawal', roleTitle: 'Data Analyst I', milestones: [
        { kind: 'OFFER_ACCEPTED', at: '2026-07-14', verifiedBy: 'u_ngozi', note: 'Signed offer received by HR.' },
        { kind: 'STARTED', at: '2026-08-03', verifiedBy: 'u_ngozi', note: 'First day confirmed by her manager.' },
        { kind: 'CHECKIN_30', at: '2026-09-04', verifiedBy: 'u_ngozi', note: 'Settled in; asked for SQL mentoring.' },
        { kind: 'CHECKIN_90', due: '2026-11-01' },
      ], consent: { state: 'GIVEN', at: '2026-07-14', scope: 'Status milestones only (offer, start, 30 and 90 days)' }, longTerm: 'Not held. Longer-term outcomes need their own legal basis and a separate consent.' },
    ],
    reminders: [], optOut: {}, receipts: {}, sourceDown: false, checkedAt: {},
  }),
};

export const hd = (w: World) => ((w.areas['hire-d'] as HireDState | undefined) ?? area.init());
export const hdw = (w: World) => ((w.areas['hire-d'] ??= area.init()) as HireDState);
export const keyOf = (mandateId: string, personId: string) => `${mandateId}:${personId}`;
