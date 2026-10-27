// The shared, persisted state of the simulated product. One store, synced across tabs so
// the recruiter and candidate sides see one coherent record (acceptance sample 3).
import { useSyncExternalStore } from 'react';
import type { ActionProposal, ActionReceipt, CalendarConnection, DelegationMode, Mandate, MeetingPreferences, MemoryItem, PracticeAttempt, ProviderReceipt, SchedulingRequest, SchedulingState, MessagePayload, ContextUse } from '@contracts';
import { ADA_PREFS, CALENDARS, EVIDENCE, MANDATE, MEMORIES, POLICIES, type PersonaId } from './fixtures';

export interface ChatTurn { id: string; who: 'me' | 'q'; text: string; at: string; used?: ContextUse[]; runId?: string; link?: { label: string; to: string } }

export interface World {
  v: 3;
  org: { setupStep: number; setupDone: boolean; delegation: DelegationMode; policies: typeof POLICIES };
  mandate: Mandate & { shortlist: string[] };
  sourcing: { runId: string | null; cursor: number; found: string[]; failedSource: boolean; done: boolean };
  calendars: CalendarConnection[];
  prefs: MeetingPreferences;
  proposals: ActionProposal<MessagePayload>[];
  receipts: ActionReceipt[];
  scheduling: SchedulingRequest | null;
  bookingReceipt: ProviderReceipt | null;
  memories: MemoryItem[];
  evidence: typeof EVIDENCE;
  persona: PersonaId;
  practice: PracticeAttempt[];
  interview: { questionIndex: number; answers: { q: string; a: string; followUp?: string }[]; mode: 'TEXT' | 'FORM' | 'VOICE'; paused: boolean; done: boolean };
  chat: Record<'recruiter' | 'candidate', ChatTurn[]>;
  activity: { at: string; text: string; actor: 'Q' | 'You' | 'Candidate' | 'System' }[];
  network: 'online' | 'offline';
  /** Hard scenarios from addendum 08 that a reviewer can switch on. */
  scenarios: { slotTakenAfterProposal: boolean; calendarRevoked: boolean };
}

const KEY = 'tq.world.v3';

export function initialWorld(): World {
  return {
    v: 3,
    org: { setupStep: 0, setupDone: false, delegation: 'APPROVE_EACH_SEND', policies: POLICIES },
    mandate: { ...MANDATE, shortlist: [] },
    sourcing: { runId: null, cursor: 0, found: [], failedSource: false, done: false },
    calendars: CALENDARS,
    prefs: ADA_PREFS,
    proposals: [],
    receipts: [],
    scheduling: null,
    bookingReceipt: null,
    memories: MEMORIES,
    evidence: EVIDENCE,
    persona: 'p_amaka',
    practice: [],
    interview: { questionIndex: 0, answers: [], mode: 'TEXT', paused: false, done: false },
    chat: { recruiter: [], candidate: [] },
    activity: [],
    network: 'online',
    scenarios: { slotTakenAfterProposal: false, calendarRevoked: false },
  };
}

function load(): World {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const w = JSON.parse(raw) as World; if (w.v === 3) return { ...w, network: 'online' }; }
  } catch { /* storage unavailable: start fresh */ }
  return initialWorld();
}

let state: World = load();
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tq.world') : null;

channel?.addEventListener('message', (e: MessageEvent<World>) => {
  state = { ...e.data, network: state.network };
  listeners.forEach((l) => l());
});

export function getWorld() { return state; }

export function update(fn: (w: World) => World | void) {
  const draft = structuredClone(state);
  const next = (fn(draft) as World | undefined) ?? draft;
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore quota or privacy mode */ }
  channel?.postMessage(next);
  listeners.forEach((l) => l());
}

export function resetWorld() { update(() => initialWorld()); }

export function useWorld<T>(select: (w: World) => T): T {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => select(state), () => select(state));
}

export const now = () => new Date().toISOString();
export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export function log(w: World, actor: World['activity'][number]['actor'], text: string) {
  w.activity.unshift({ at: now(), actor, text });
}

export function setSchedulingState(w: World, s: SchedulingState, note?: string) {
  if (!w.scheduling) return;
  w.scheduling.state = s;
  w.scheduling.history.push({ state: s, at: now(), note });
}

/** Live memories visible to a viewer. Revoked and private-practice items never leave their scope. */
export function visibleMemories(w: World, viewer: 'recruiter' | 'candidate') {
  return w.memories.filter((m) => {
    if (m.lifecycle_status === 'revoked' || m.lifecycle_status === 'forgotten') return false;
    if (viewer === 'recruiter') return m.visibility_scope !== 'CANDIDATE_PRIVATE_PRACTICE' && m.owner_id !== 'p_tobi';
    return m.owner_id === 'p_tobi' || m.visibility_scope === 'SHARED_WITH_EMPLOYER';
  });
}
