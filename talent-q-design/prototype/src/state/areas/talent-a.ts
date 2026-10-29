// Area slice for T1 (Amaka) and T2 (Chidi): CV drafts, jobs a person has already been told about, things
// they said they would do, rehearsal notes and when they last looked at their career space. Keyed by person.
// Only `import type` from the store here (this file is globbed eagerly by the store).
import type { World } from '../../mock/world';

export interface CvLine { id: string; text: string; /** The claim (or profile field) the line was drafted from, never anything else. */ from: string; section: 'Education' | 'Projects' | 'Volunteering' | 'Work' | 'Skills' }
export interface CvDraft { lines: CvLine[]; status: 'DRAFT' | 'APPROVED'; at: string }
export interface Commitment { id: string; personId: string; text: string; due: string; at: string; comp?: string; state: 'OPEN' | 'KEPT' | 'DROPPED' }
export interface Rehearsal { at: string; question: string; answer: string; notes: string[] }
export interface TalentAState {
  cv: Record<string, CvDraft | undefined>;
  /** Jobs Q has already raised with a person (so "a new job matches" is said once). */
  seenJobs: Record<string, string[]>;
  commitments: Commitment[];
  /** Simulated time a person last caught up on their career space (for "what changed since"). */
  lastSeen: Record<string, string>;
  rehearsals: Record<string, Rehearsal[]>;
}
export const area = { id: 'talent-a', init: (): TalentAState => ({ cv: {}, seenJobs: {}, commitments: [], lastSeen: {}, rehearsals: {} }) };
const EMPTY = area.init();
/** Read-only view (safe inside selectors). */
export const taRead = (w: World): TalentAState => ({ ...EMPTY, ...((w.areas['talent-a'] as TalentAState | undefined) ?? {}) });
/** Mutable slice (use inside update()/effects only). */
export const ta = (w: World): TalentAState => {
  const s = ((w.areas['talent-a'] as TalentAState | undefined) ?? (w.areas['talent-a'] = area.init())) as TalentAState;
  s.cv ??= {}; s.seenJobs ??= {}; s.commitments ??= []; s.lastSeen ??= {}; s.rehearsals ??= {};
  return s;
};
