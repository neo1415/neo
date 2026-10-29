// R2 (Ada, non-technical recruiter) state slice. Owned by hire-b. Lives at w.areas['hire-b'].
// Only `import type` from the store here: this file is globbed eagerly by mock/world.ts.
import type { World } from '../../mock/world';

export type Level = 'verified' | 'evidenced' | 'partial' | 'claim' | 'none';
export type Rating = 'STRONG' | 'SOME' | 'NOT_SHOWN';
export interface Correction { id: string; personId: string; reqId: string; level: Level; note: string; by: string; at: string }
export interface LiveNote { id: string; reqId?: string; text: string; at: string; vague?: boolean; followups?: string[] }
export interface LiveInterview {
  step: 'BRIEF' | 'LIVE' | 'FEEDBACK' | 'SUBMITTED';
  startedAt?: string;
  current: number;
  ratings: Record<string, Rating>;
  notes: LiveNote[];
  draft?: { rating: 'STRONG' | 'MIXED' | 'CONCERNS'; notes: string; byQ: boolean };
}
export interface PlanQ { id: string; reqId: string; text: string; why: string }
export interface HireBState {
  /** Simulated GitHub connector. Starts DOWN so the honest outage state is visible (R2 curveball). */
  github: { status: 'DOWN' | 'CHECKING' | 'OK'; cachedAt: string; checkedAt?: string; tries: number };
  /** What each recruiter last saw of a person's shared evidence (id:verification), for "since you last looked". */
  seen: Record<string, Record<string, { at: string; items: string[] }>>;
  /** Recruiter corrections to Q's reading of evidence ("that library isn't production"). */
  corrections: Correction[];
  /** Interview plan per interview id: questions Q generated from evidence gaps, kept by the recruiter. */
  plans: Record<string, PlanQ[]>;
  live: Record<string, LiveInterview>;
  /** Review requests opened after a candidate disputed an assessment. */
  reviews: Record<string, { openedAt: string; by: string; reviewer: string; state: 'OPEN' | 'UPHELD' | 'REVISED' }>;
}

export const area = {
  id: 'hire-b',
  init: (): HireBState => ({ github: { status: 'DOWN', cachedAt: '2026-10-21T08:10:00+01:00', tries: 0 }, seen: {}, corrections: [], plans: {}, live: {}, reviews: {} }),
};
export const hireB = (w: World) => (w.areas['hire-b'] ??= area.init()) as HireBState;
