// R3 (Ngozi, Kora HR) state slice: structured org guidelines Q checks against, message drafts with versions,
// time proposals, panel changes and reschedule requests. Lives at w.areas['hire-c'] in the one store.
import type { World } from '../../mock/world';

/** What Q can actually check for a guideline. NONE: shown and cited, not machine-checked. */
export type GuideCheck = 'PAY_BAND' | 'PANEL_TWO' | 'APPROVE_EACH' | 'JOB_RELATED' | 'HOURS' | 'NONE';
export interface Guide { id: string; text: string; source: string; check: GuideCheck; on: boolean; v: number; by: string; at: string; used: number; lastUsed?: string }

export type DraftKind = 'INVITE' | 'RESCHEDULE' | 'FOLLOW_UP' | 'REJECTION' | 'REPLY';
export type Tone = 'neutral' | 'friendlier' | 'formal' | 'shorter';
export interface DraftVersion { v: number; at: string; by: string; subject: string; body: string; note: string; manual?: boolean; slot?: { start: string; end: string }; tone?: Tone; panel?: string[] }
export interface Check { id: string; group: 'Approval' | 'Candidate' | 'Calendar' | 'Guidelines' | 'Consent'; label: string; ok: boolean; warn?: boolean; detail: string; fix?: { label: string; op: string; args: Record<string, unknown> } }
export interface DraftMeta {
  msgId: string; threadId: string; personId: string; orgId: string; kind: DraftKind; by: string; tone: Tone;
  slot?: { start: string; end: string }; panel: string[]; mandateId?: string; versions: DraftVersion[];
  checks?: Check[]; checkedAt?: string; checkedV?: number; eventId?: string; reason?: string;
}
export interface Slot { start: string; end: string; notes: { id: string; name: string; tz: string; local: string; early?: boolean }[] }
export interface SlotProposal { id: string; personId: string; panel: string[]; slots: Slot[]; at: string; by: string; label: string; kind: 'INVITE' | 'RESCHEDULE' }
export interface PanelChange { id: string; interviewId: string; personId: string; by: string; at: string; from: string[]; to: string[]; holds: string; ok: boolean }
export interface RescheduleReq { eventId: string; personId: string; text: string; days: string[]; part?: 'morning' | 'afternoon'; at: string; handled?: boolean }

export interface HireCState {
  guides: Record<string, Guide[]>;
  drafts: Record<string, DraftMeta>;
  proposals: Record<string, SlotProposal>;
  panelChanges: PanelChange[];
  reschedules: RescheduleReq[];
  /** Last candidate profile each recruiter opened (for "draft one for him"). */
  lastPerson: Record<string, { id: string; at: string }>;
}

const G = (id: string, text: string, source: string, check: GuideCheck): Guide => ({ id, text, source, check, on: true, v: 1, by: 'u_ngozi', at: '2026-10-01T09:00:00+01:00', used: 0 });

export const SEYI_ZARA_BODY = 'Hi Zara,\n\nThanks for applying for the Senior Backend Engineer role. We’d like to invite you to a 45-minute video interview on Tuesday 3 November at 14:00 (Lagos time) with me and Ngozi Eze.\n\nPlease reply to confirm.\n\nSeyi Balogun\nEngineering manager, Kora Pay';

export const area = {
  id: 'hire-c',
  init: (): HireCState => ({
    guides: {
      org_kora: [
        G('g_payband', 'Name the pay band in the first message to a candidate', 'Kora hiring handbook, p.4', 'PAY_BAND'),
        G('g_panel', 'Panel of two for engineering interviews', 'Kora hiring handbook, p.7', 'PANEL_TWO'),
        G('g_approve', 'Approve each outgoing message', 'Kora delegation setting', 'APPROVE_EACH'),
        G('g_jobrel', 'Ask job-related questions only; never age, marital status, religion, ethnicity or state of origin', 'Kora hiring handbook, p.2', 'JOB_RELATED'),
        G('g_hours', 'Interviews 10:00–16:00 Lagos time unless the candidate asks otherwise', 'Kora hiring handbook, p.7', 'HOURS'),
        G('g_tone', 'Plain, warm, no exaggeration', 'Kora hiring handbook, p.4', 'NONE'),
      ],
    },
    drafts: {
      hc_zara_inv: {
        msgId: 'hc_zara_inv', threadId: 't_hc_zara', personId: 'p_zara', orgId: 'org_kora', kind: 'INVITE', by: 'u_seyi', tone: 'neutral', mandateId: 'm_backend',
        slot: { start: '2026-11-03T13:00:00.000Z', end: '2026-11-03T13:45:00.000Z' }, panel: ['u_seyi', 'u_ngozi'],
        versions: [{ v: 1, at: '2026-10-27T16:20:00+01:00', by: 'u_seyi', subject: 'Interview: Senior Backend Engineer at Kora Pay', body: SEYI_ZARA_BODY, note: 'Written by Seyi', manual: true }],
      },
    },
    proposals: {},
    panelChanges: [],
    reschedules: [],
    lastPerson: {},
  }),
};

/** Typed accessor. Reading never mutates; inside update() use hcw() to get a writable slice. */
export const hc = (w: World) => ((w.areas['hire-c'] as HireCState | undefined) ?? area.init());
export const hcw = (w: World) => ((w.areas['hire-c'] ??= area.init()) as HireCState);
