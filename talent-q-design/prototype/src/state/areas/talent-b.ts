// talent-b (T3 Tobi, T5 Zara): uploads, verification checks, Q's summary corrections, discovery settings,
// saved jobs, match corrections, advice the person declined, follow-ups, and candidate-held memories with
// deletion receipts. Lives at w.areas['talent-b'] in the one store.
import type { World } from '../../mock/world';

export type UploadKind = 'CV' | 'CERTIFICATE' | 'WORK_SAMPLE' | 'LINK';
export interface Upload {
  id: string; personId: string; name: string; kind: UploadKind; progress: number;
  state: 'UPLOADING' | 'FAILED' | 'DONE' | 'CANCELLED'; failAt?: number; attempt: number; error?: string; evidenceId?: string; startedAt: string;
}
export interface Check { evidenceId: string; personId: string; attempt: number; startedMs: number; state: 'RUNNING' | 'DONE'; outcome?: 'VERIFIED' | 'UNREACHABLE' | 'FAILED' }
export interface CandMemory {
  id: string; personId: string; key: string; text: string; source: string; at: string; usedFor: string;
  sensitive?: boolean; sharedWith: string[]; state: 'ACTIVE' | 'DELETED'; tags: string[];
}
export interface Deletion { id: string; personId: string; at: string; what: string; deleted: string[]; kept: string[]; neverShared: boolean }
export interface Correction { at: string; topic: string; said: string; before: string }
export interface Discovery { who: 'ANYONE' | 'EMPLOYERS_AND_AGENCIES' | 'VERIFIED_EMPLOYERS' | 'NOBODY'; hideFrom: string[]; showSalary: boolean }
export interface Followup { appId: string; state: 'SENT_SIMULATED' | 'MOVED_ON'; at: string }
export interface Applying { jobId: string; shared: string[]; startedMs: number; consent: boolean; note: string; blocked?: string }

export interface TalentB {
  uploads: Upload[];
  checks: Check[];
  memories: CandMemory[];
  deletions: Deletion[];
  corrections: Record<string, Correction[]>;
  /** Match corrections, per person and need (applies to every job with that need). */
  told: Record<string, { need: string; said: string; at: string }[]>;
  discovery: Record<string, Discovery>;
  saved: Record<string, string[]>;
  declined: Record<string, string[]>;
  followups: Followup[];
  applying: Record<string, Applying | null>;
  /** Listings that close part-way through an application in this demo (curveball). */
  closesOnApply: string[];
  ackFailed: string[];
  noReplyDays: number;
}

const m = (id: string, personId: string, key: string, text: string, source: string, at: string, usedFor: string, tags: string[], sensitive = false): CandMemory =>
  ({ id, personId, key, text, source, at, usedFor, tags, sensitive, sharedWith: [], state: 'ACTIVE' });

export const area = {
  id: 'talent-b',
  init: (): TalentB => ({
    uploads: [], checks: [], deletions: [], corrections: {}, told: {}, followups: [], applying: {}, ackFailed: [],
    memories: [
      m('cm_zara_leave', 'p_zara', 'search.leaving_current_job', 'You’re looking to leave your current job at Fleetline, and they don’t know yet.', 'Your message, 21 Oct', '2026-10-21T19:04:00Z', 'Keeping your search discreet and never mentioning it to employers.', ['leave', 'leaving', 'quit', 'current job', 'fleetline', 'looking to leave'], true),
      m('cm_zara_pay', 'p_zara', 'pay.minimum', 'You want at least US$3,000 a month, or the naira or cedi equivalent.', 'Your message, 21 Oct', '2026-10-21T19:06:00Z', 'Checking pay fit on listings. Never shown to employers unless you say so.', ['salary', 'pay', 'money', '3,000', 'minimum']),
      m('cm_zara_move', 'p_zara', 'location.relocation', 'You’d move to Lagos for the right role, but not to Port Harcourt.', 'Your message, 22 Oct', '2026-10-22T08:30:00Z', 'Working out location fit on listings.', ['lagos', 'move', 'relocate', 'location', 'port harcourt']),
      m('cm_zara_style', 'p_zara', 'q.style.short', 'You prefer short, direct answers.', 'Your feedback, 22 Oct', '2026-10-22T08:31:00Z', 'How Q writes to you.', ['style', 'short', 'direct']),
      m('cm_tobi_nda', 'p_tobi', 'evidence.nda.lumen', 'Your Lumen fraud-rules work is under NDA until March 2027.', 'Your message, 14 Oct', '2026-10-14T11:00:00Z', 'Stopping anyone, including you by accident, from sharing the original.', ['nda', 'lumen', 'fraud', 'confidential']),
      m('cm_tobi_lead', 'p_tobi', 'goal.staff', 'You’re aiming for a staff or principal role within two years.', 'Your message, 14 Oct', '2026-10-14T11:02:00Z', 'Choosing which roles and interview topics to suggest.', ['staff', 'principal', 'goal']),
    ],
    discovery: {
      p_tobi: { who: 'VERIFIED_EMPLOYERS', hideFrom: [], showSalary: false },
      p_zara: { who: 'VERIFIED_EMPLOYERS', hideFrom: [], showSalary: false },
    },
    saved: { p_zara: ['j_harbour_backend', 'j_kora_backend'] },
    declined: {},
    closesOnApply: ['j_harbour_backend'],
    noReplyDays: 10,
  }),
};

export const tb = (w: World) => w.areas['talent-b'] as TalentB;
