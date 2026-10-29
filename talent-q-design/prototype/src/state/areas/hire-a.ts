// State owned by the hire-a area (R1 Funmi, R5 Bayo). Lives at w.areas['hire-a'] in the one store.
import type { World } from '../../mock/world';
import type { MandateX } from '../domain';

export type RoleKey = 'bookkeeper' | 'assistant' | 'manager' | 'baker' | 'rider';
export type IntakeStep = 'business' | 'pains' | 'role' | 'hours' | 'budget' | 'budgetfix' | 'review' | 'approved' | 'searched' | 'shortlisted' | 'scheduled';
export interface HAIntake {
  step: IntakeStep; business?: string; city?: string; pains?: string; roleKey?: RoleKey; prevRoleKey?: RoleKey;
  hours?: 'FULL' | 'PART'; days?: number; budget?: number; mandateId?: string; updatedAt: string;
}
/** A readable copy of a mandate at one version (old versions stay readable). */
export type Snap = Pick<MandateX, 'title' | 'plain' | 'location' | 'workMode' | 'pay' | 'requirements'> & { hours?: 'FULL' | 'PART'; days?: number };
export interface Instruction { key: 'level'; value: 'SENIOR' | 'ALL'; text: string; at: string }
export interface HireAState {
  intake: Record<string, HAIntake>;
  /** Organisations Q created in conversation (founders without an org at signup). */
  orgs: string[];
  snapshots: Record<string, Record<number, Snap>>;
  meta: Record<string, { roleKey?: RoleKey; hours?: 'FULL' | 'PART'; days?: number; approvedV?: number; approvedBy?: string; approvedAt?: string }>;
  discarded: Record<string, MandateX>;
  search: Record<string, { at: string; found: string[]; by: string }>;
  /** Standing instructions per person and mandate (e.g. Bayo's "only seniors"), used to spot contradictions. */
  instructions: Record<string, Instruction[]>;
  /** Source conflicts per person: how the team chose to handle them. */
  conflicts: Record<string, 'INTERVIEW' | 'ASKED'>;
  requests: { id: string; from: string; to: string; what: string; text: string; at: string }[];
  koraIntake?: { step: 'mode' | 'hardest' | 'review'; at: string };
  /** Run ids of Kora sourcing runs already forwarded into the global Q thread. */
  forwarded: string[];
}

export const area = {
  id: 'hire-a',
  init: (): HireAState => ({ intake: {}, orgs: [], snapshots: {}, meta: {}, discarded: {}, search: {}, instructions: {}, conflicts: {}, requests: [], forwarded: [] }),
};
/** For effects and ops inside update(): creates or completes the slice. */
export const hireA = (w: World): HireAState => {
  const s = (w.areas['hire-a'] ??= area.init()) as HireAState;
  // Older saved worlds may lack newer keys.
  for (const [k, v] of Object.entries(area.init())) if ((s as unknown as Record<string, unknown>)[k] === undefined) (s as unknown as Record<string, unknown>)[k] = v;
  return s;
};
/** Read-only view for selectors and renderers (never mutates the store). */
export const readA = (w: World): HireAState => ({ ...area.init(), ...((w.areas['hire-a'] as Partial<HireAState> | undefined) ?? {}) });
