// Area slice for TALENT-D (coverage build, 30 Oct): work authorisation (SC-071), the candidate's own work with
// Q's critique and its versions (SC-076, SC-077), cover notes (SC-087), the learning player (SC-092), the work
// sample improvement wizard (SC-172) and recovery after a rejection (SC-175). Keyed by person or record id.
// Only `import type` from the store here (this file is globbed eagerly by the store).
import type { World } from '../../mock/world';

// ---------------- SC-071 · work authorisation (stated by the candidate; private by default) ----------------
export type AuthStatus = 'CITIZEN' | 'HOLDS_PERMIT' | 'NEEDS_PERMIT' | 'NOT_SURE';
export interface AuthEntry { country: string; status: AuthStatus; detail?: string; at: string }
/** A consent receipt: what was shared, with whom, when, and how to end it. */
export interface Receipt { id: string; what: string; org: string; at: string; endedAt?: string }
export interface WorkAuth {
  entries: AuthEntry[];
  /** Organisations that may read the statement. Absent = private. */
  shares: Record<string, Receipt>;
  /** A document attached by the candidate. Talent Q never checks it; "attached" is not "verified". */
  doc: null | { name: string; at: string; sharedWith: string[] };
  updatedAt?: string;
}

// ---------------- SC-076 / SC-077 · the candidate's own work, critiqued and versioned ----------------
export interface WorkChange { kind: 'ORIGINAL' | 'REWORDED' | 'ADDED' | 'REMOVED' | 'CORRECTED' | 'RESTORED'; para?: number; what: string; source: string }
export interface WorkVersion { v: number; at: string; by: 'YOU' | 'YOU_WITH_Q'; note: string; paras: string[]; changes: WorkChange[] }
export interface CritPoint { id: string; para: number; title: string; why: string; tryThis: string; suggestion: string | null; state: 'OPEN' | 'DONE' | 'NOT_FOR_ME' }
export interface Critique { at: string; forV: number; focus: 'ALL' | 'CLARITY' | 'EVIDENCE'; strengths: string[]; points: CritPoint[] }
export interface Work {
  id: string; personId: string; title: string; kind: string; evidenceId?: string;
  versions: WorkVersion[];
  critique: Critique | null;
  /** Which version each organisation was given (only through the Passport share). */
  sharedV: Record<string, number>;
}

// ---------------- SC-087 · cover notes ----------------
export interface LetterLine { text: string; source: string | null; by: 'Q' | 'YOU' }
export interface Letter { personId: string; jobId: string; at: string; length: 'NOTE' | 'LETTER'; state: 'DRAFT' | 'APPROVED'; lines: LetterLine[]; approvedAt?: string }

// ---------------- SC-092 · learning player ----------------
export interface LearnState { mode: 'VIDEO' | 'ARTICLE'; pos: number; captions: boolean; transcript: boolean; answer: string; done: boolean; at?: string }

// ---------------- SC-172 · improvement wizard ----------------
export interface Wizard { step: 0 | 1 | 2 | 3 | 4; comp: string; picks: Record<string, boolean>; fact: string; review: null | { at: string; level: number; rubric: { c: string; ok: boolean }[] }; choice: null | 'USED' | 'KEPT_OLD'; receipt: Receipt | null }

// ---------------- SC-175 · recovery after a rejection ----------------
export interface Recovery { asked: null | { at: string; msgId: string; state: 'DRAFT' | 'SENT_SIMULATED' }; feedback: null | { at: string; text: string; msgId: string }; steps: string[] }

export interface TalentDState {
  auth: Record<string, WorkAuth>;
  works: Record<string, Work>;
  letters: Record<string, Letter>;
  learn: Record<string, Record<string, LearnState>>;
  wizard: Record<string, Wizard>;
  recovery: Record<string, Recovery>;
}

const AMAKA_V1 = [
  'This paper looks at food prices at Mile 12 market in Lagos. Prices went up a lot in 2025 and I wanted to understand why.',
  'I collected prices for tomatoes, rice and garri every week from January to June 2025, from 12 traders. Tomato prices rose 12% over the period; rice rose 9%.',
  'There are many reasons prices go up such as inflation, transport, the exchange rate, weather and also demand. All of these probably played a part.',
  'In conclusion food prices are a big problem for Lagos families and the government should do something about it.',
];
const AMAKA_V2 = AMAKA_V1.map((p, i) => (i === 1 ? p.replace('12%', '21%') : p));
const CHIDI_V1 = [
  'Problem: shop owners run out of fast-moving stock and lose sales before the distributor’s next visit.',
  'Who: small retail shops that buy from distributors.',
  'Idea: a reminder that tells a shop owner when to reorder, based on how fast they sold last time.',
  'Success: fewer stock-outs and more repeat orders.',
];

export const seedWorks = (): Record<string, Work> => ({
  w_amaka_prices: {
    id: 'w_amaka_prices', personId: 'p_amaka', title: 'Why food prices rose at Mile 12 market, January to June 2025', kind: 'Project write-up', evidenceId: 'e_amaka_prices',
    versions: [
      { v: 1, at: '2026-10-12T10:00:00+01:00', by: 'YOU', note: 'Uploaded from your file “Mile12-summary.docx”.', paras: AMAKA_V1, changes: [{ kind: 'ORIGINAL', what: 'First version, as you wrote it.', source: 'Your file Mile12-summary.docx' }] },
      { v: 2, at: '2026-10-20T18:30:00+01:00', by: 'YOU', note: 'You corrected a figure.', paras: AMAKA_V2, changes: [{ kind: 'CORRECTED', para: 1, what: 'Tomato price rise: 12% → 21%.', source: 'Your weekly price sheet (you said the 12% was a typo)' }] },
    ],
    critique: null, sharedV: { org_medlink: 1 },
  },
  w_chidi_brief: {
    id: 'w_chidi_brief', personId: 'p_chidi', title: 'One-page product brief: reorder reminders for shop owners', kind: 'Product brief',
    versions: [{ v: 1, at: '2026-10-22T09:00:00+01:00', by: 'YOU', note: 'Written in Talent Q.', paras: CHIDI_V1, changes: [{ kind: 'ORIGINAL', what: 'First version, as you wrote it.', source: 'Typed by you' }] }],
    critique: null, sharedV: {},
  },
});

export const area = { id: 'talent-d', init: (): TalentDState => ({ auth: {}, works: seedWorks(), letters: {}, learn: {}, wizard: {}, recovery: {} }) };

/** Mutable accessor (inside update/ops). Fills anything an older saved world lacks. */
export function td(w: World): TalentDState {
  const s = (w.areas['talent-d'] ??= area.init()) as TalentDState;
  s.auth ??= {}; s.works ??= seedWorks(); s.letters ??= {}; s.learn ??= {}; s.wizard ??= {}; s.recovery ??= {};
  return s;
}
const EMPTY: TalentDState = { auth: {}, works: seedWorks(), letters: {}, learn: {}, wizard: {}, recovery: {} };
/** Read-only accessor for render (never writes). */
export const tdRead = (w: World): TalentDState => { const s = w.areas['talent-d'] as Partial<TalentDState> | undefined; return s ? { ...EMPTY, ...s } as TalentDState : EMPTY; };
export const newAuth = (): WorkAuth => ({ entries: [], shares: {}, doc: null });
