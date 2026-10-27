// Scheduling and correspondence (addendum 08 §2). Providers are simulated in the design prototype.
import type { Channel, DelegationMode } from './action';

export const SCHEDULING_STATES = [
  'DRAFT_REQUEST', 'POLICY_AND_CONSENT_CHECK', 'CALENDAR_CONNECTION_CHECK', 'AVAILABILITY_READ', 'SLOTS_CALCULATED',
  'RECRUITER_CONFIRMATION', 'CANDIDATE_PROPOSAL_SENT', 'AWAITING_CANDIDATE',
  'CANDIDATE_ACCEPTS', 'CANDIDATE_COUNTERPROPOSES', 'CANDIDATE_DECLINES', 'NO_RESPONSE',
  'AVAILABILITY_RECHECK', 'EVENT_WRITE', 'PROVIDER_ACK', 'BOOKED', 'REMINDERS',
  'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'FAILED',
] as const;
export type SchedulingState = (typeof SCHEDULING_STATES)[number];

/** Legal transitions. Anything else is a bug. A choice is never a booking before PROVIDER_ACK. */
export const SCHEDULING_TRANSITIONS: Record<SchedulingState, SchedulingState[]> = {
  DRAFT_REQUEST: ['POLICY_AND_CONSENT_CHECK', 'CANCELLED'],
  POLICY_AND_CONSENT_CHECK: ['CALENDAR_CONNECTION_CHECK', 'FAILED', 'CANCELLED'],
  CALENDAR_CONNECTION_CHECK: ['AVAILABILITY_READ', 'FAILED'],
  AVAILABILITY_READ: ['SLOTS_CALCULATED', 'FAILED'],
  SLOTS_CALCULATED: ['RECRUITER_CONFIRMATION', 'CANDIDATE_PROPOSAL_SENT'],
  RECRUITER_CONFIRMATION: ['CANDIDATE_PROPOSAL_SENT', 'SLOTS_CALCULATED', 'CANCELLED'],
  CANDIDATE_PROPOSAL_SENT: ['AWAITING_CANDIDATE', 'FAILED'],
  AWAITING_CANDIDATE: ['CANDIDATE_ACCEPTS', 'CANDIDATE_COUNTERPROPOSES', 'CANDIDATE_DECLINES', 'NO_RESPONSE', 'CANCELLED'],
  CANDIDATE_ACCEPTS: ['AVAILABILITY_RECHECK'],
  CANDIDATE_COUNTERPROPOSES: ['AVAILABILITY_RECHECK', 'SLOTS_CALCULATED'],
  CANDIDATE_DECLINES: ['CANCELLED'],
  NO_RESPONSE: ['CANDIDATE_PROPOSAL_SENT', 'CANCELLED'],
  AVAILABILITY_RECHECK: ['EVENT_WRITE', 'SLOTS_CALCULATED'],
  EVENT_WRITE: ['PROVIDER_ACK', 'FAILED'],
  PROVIDER_ACK: ['BOOKED', 'FAILED'],
  BOOKED: ['REMINDERS', 'RESCHEDULED', 'CANCELLED'],
  REMINDERS: ['COMPLETED', 'RESCHEDULED', 'CANCELLED'],
  COMPLETED: [], RESCHEDULED: ['SLOTS_CALCULATED'], CANCELLED: [], FAILED: ['SLOTS_CALCULATED'],
};

export type CalendarProvider = 'GOOGLE' | 'MICROSOFT';
export type ConnectionHealth = 'NOT_CONNECTED' | 'CONNECTED_FREEBUSY_ONLY' | 'CONNECTED_WRITE' | 'TOKEN_EXPIRED' | 'REVOKED' | 'PROVIDER_DEGRADED';

export interface CalendarConnection {
  personId: string;
  provider: CalendarProvider;
  health: ConnectionHealth;
  /** Requested separately: free/busy first, event write only when booking. */
  scopes: ('freebusy.read' | 'events.write')[];
  checkedAt: string;
}

export interface MeetingPreferences {
  personId: string;
  timezone: string;
  workingHours: { day: 1 | 2 | 3 | 4 | 5 | 6 | 7; start: string; end: string }[];
  noMeetingBlocks: { label: string; day: number; start: string; end: string }[];
  bufferMinutes: number;
  minLeadHours: number;
  preferMornings: boolean;
  defaultDurationMinutes: number;
  /** Provenance: the memory item that holds this preference. */
  memoryId: string;
}

/** Busy intervals only. Event titles, attendees and descriptions never cross this boundary. */
export interface BusyInterval { start: string; end: string }

export interface Slot {
  slotId: string;
  start: string;
  end: string;
  /** Interpretable score terms, each 0..1, shown on request. */
  terms: { availabilityPreference: number; timezoneFairness: number; leadTime: number; panelLoadBalance: number };
  candidateLocal: string;
  recruiterLocal: string;
  dstNote?: string;
}

export interface SchedulingRequest {
  requestId: string;
  mandateId: string;
  candidateId: string;
  panel: { personId: string; name: string; provider: CalendarProvider; required: boolean }[];
  durationMinutes: number;
  mode: 'VIDEO' | 'PHONE' | 'ONSITE' | 'TEXT_ACCESSIBLE';
  state: SchedulingState;
  history: { state: SchedulingState; at: string; note?: string }[];
  slots: Slot[];
  chosenSlotId?: string;
  counterProposal?: { text: string; windows: { start: string; end: string }[] };
  delegation: DelegationMode;
  channel: Channel;
}

export interface ProviderReceipt {
  provider: CalendarProvider;
  eventId: string;
  etag: string;
  idempotencyKey: string;
  conferenceLink?: string;
  /** Always true here: no calendar is written during design. */
  simulated: true;
  at: string;
}

export type PipelineEvent = 'INTERVIEW_PROPOSED' | 'INVITED' | 'BOOKED' | 'RESCHEDULE_REQUESTED' | 'COMPLETED';
export type ReplyIntent = 'ACCEPT' | 'COUNTEROFFER' | 'NEEDS_ACCOMMODATION' | 'WITHDRAW' | 'UNSUBSCRIBE' | 'UNCLEAR';

/** Country eligibility is checked before a channel is offered (WhatsApp outbound calls exclude NG and US senders). */
export interface ChannelEligibility { channel: Channel; eligible: boolean; reason?: string; fallback?: Channel }
