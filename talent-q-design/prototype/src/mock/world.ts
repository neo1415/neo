// The shared, persisted state of the simulated product. One store, synced across tabs so
// the recruiter and candidate sides see one coherent record (acceptance sample 3).
import { useRef, useSyncExternalStore } from 'react';
import type { ActionProposal, ActionReceipt, CalendarConnection, DelegationMode, Mandate, MeetingPreferences, MemoryItem, PracticeAttempt, ProviderReceipt, SchedulingRequest, SchedulingState, MessagePayload, ContextUse } from '@contracts';
import type { Person } from '@contracts';
import { ADA_PREFS, CALENDARS, EVIDENCE, MANDATE, MEMORIES, PEOPLE, POLICIES, type PersonaId } from './fixtures';
import type { Actor, Application, CalEvent, Consent, DomainEvent, Interview, Job, MandateX, Org, PipelineEntry, QSlice, Thread } from '../state/domain';
import { ACTORS, APPLICATIONS, CAL, EXTRA_EVIDENCE, EXTRA_PEOPLE, INTERVIEWS, JOBS, MANDATES, NOW, ORGS, PIPELINE, THREADS, consentFor, defaultPrefs } from '../state/seed';
import type { Profile } from '../services/profile';
import type { PlannerState } from '../services/agents';

export interface ChatTurn { id: string; who: 'me' | 'q'; text: string; at: string; used?: ContextUse[]; runId?: string; link?: { label: string; to: string } }

export interface World {
  v: 4;
  // ---- v4: one authoritative store for the whole product (see state/domain.ts) ----
  session: { actor: string; now: string; offsetDays: number; lastRoute: Record<string, string> };
  actors: Actor[];
  orgs: Org[];
  people: Person[];
  /** Mandates other than Kora's Senior Backend, which remains `mandate` for the original screens. */
  mandates: MandateX[];
  /** Per-area slices owned by one feature area each (see src/state/areas/*). Typed by that area's accessor. */
  areas: Record<string, unknown>;
  pipeline: PipelineEntry[];
  threads: Thread[];
  calendar: CalEvent[];
  interviews: Interview[];
  jobs: Job[];
  applications: Application[];
  consents: Record<string, Consent>;
  profiles: Record<string, Profile>;
  /** J7 per person (opaque to the store; owned by journeys/career). */
  j7: Record<string, unknown>;
  planners: Record<string, PlannerState>;
  q: QSlice;
  events: DomainEvent[];
  // ---- v3 slices used by the original screens ----
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

const KEY = 'tq.world.v4';

/** Feature areas add their own seed records in src/state/seeds/*.ts (export const seed: SeedPatch). */
export interface SeedPatch { actors?: Actor[]; orgs?: Org[]; people?: Person[]; mandates?: MandateX[]; pipeline?: PipelineEntry[]; threads?: Thread[]; calendar?: CalEvent[]; interviews?: Interview[]; jobs?: Job[]; applications?: Application[]; evidence?: World['evidence']; memories?: World['memories']; events?: World['events'] }
/** Feature areas with their own state register an initial slice in src/state/areas/*.ts (export const area). */
const AREA_INITS = Object.values(import.meta.glob<{ area: { id: string; init: () => unknown } }>('../state/areas/*.ts', { eager: true })).map((m) => m.area).filter(Boolean);
const SEEDS = Object.values(import.meta.glob<{ seed: SeedPatch }>('../state/seeds/*.ts', { eager: true })).map((m) => m.seed).filter(Boolean);
function merged<K extends keyof SeedPatch>(k: K, base: NonNullable<SeedPatch[K]>): NonNullable<SeedPatch[K]> { const extra = SEEDS.flatMap((s) => ((s[k] ?? []) as unknown[])); return [...(base as unknown[]), ...extra] as NonNullable<SeedPatch[K]>; }

export function initialWorld(): World {
  const actors = merged('actors', ACTORS);
  const people = merged('people', [...PEOPLE, ...EXTRA_PEOPLE]);
  return {
    v: 4,
    session: { actor: 'u_ada', now: NOW, offsetDays: 0, lastRoute: {} },
    actors, orgs: merged('orgs', ORGS), people, mandates: merged('mandates', MANDATES), pipeline: merged('pipeline', PIPELINE), threads: merged('threads', THREADS), calendar: merged('calendar', CAL), interviews: merged('interviews', INTERVIEWS), jobs: merged('jobs', JOBS), applications: merged('applications', APPLICATIONS),
    consents: Object.fromEntries(people.map((p) => [p.personId, consentFor(p.personId)])),
    profiles: {}, j7: {}, planners: {}, areas: Object.fromEntries(AREA_INITS.map((a) => [a.id, a.init()])),
    q: { threads: {}, frames: {}, suggestions: [], prefs: Object.fromEntries(actors.map((a) => [a.id, defaultPrefs(a)])), nav: {}, ui: {}, undo: {}, glossarySeen: {}, outbox: {} },
    events: merged('events', []),
    org: { setupStep: 0, setupDone: false, delegation: 'APPROVE_EACH_SEND', policies: POLICIES },
    mandate: { ...MANDATE, shortlist: [] },
    sourcing: { runId: null, cursor: 0, found: [], failedSource: false, done: false },
    calendars: CALENDARS,
    prefs: ADA_PREFS,
    proposals: [],
    receipts: [],
    scheduling: null,
    bookingReceipt: null,
    memories: merged('memories', MEMORIES),
    evidence: merged('evidence', [...EVIDENCE.map((e) => ({ ...e, origin: 'SEED' as const, verification: e.verified ? 'VERIFIED' as const : 'UNVERIFIED' as const })), ...EXTRA_EVIDENCE]),
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
    if (raw) { const w = JSON.parse(raw) as World; if (w.v === 4) return { ...w, network: 'online', areas: { ...Object.fromEntries(AREA_INITS.map((a) => [a.id, a.init()])), ...(w.areas ?? {}) } }; }
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

const shallowEq = (a: unknown, b: unknown) => {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Select from the store. Selectors may build new arrays/objects: results are kept while shallowly equal. */
export function useWorld<T>(select: (w: World) => T): T {
  const last = useRef<{ v: T } | null>(null);
  const get = () => { const v = select(state); if (last.current && shallowEq(last.current.v, v)) return last.current.v; last.current = { v }; return v; };
  return useSyncExternalStore(subscribe, get, get);
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

// ---------------- v4 helpers ----------------
/** Record a domain event. Scope decides who may ever see it (ORG:<id>, PERSON:<id>, SHARED:<org>:<person>). */
export function emit(w: World, actor: string, type: string, scope: string, text: string, data?: Record<string, unknown>) {
  w.events.push({ id: uid('ev'), at: now(), actor, type, scope, text, data });
  if (w.events.length > 800) w.events.splice(0, w.events.length - 800);
}
export const actorOf = (w: World, id = w.session.actor) => w.actors.find((a) => a.id === id)!;
export const orgOf = (w: World, id?: string) => w.orgs.find((o) => o.id === id);
export const personOf = (w: World, id: string) => w.people.find((p) => p.personId === id);
export const useActor = () => useWorld((w) => actorOf(w));
/** Simulated "now" (the clock can be moved forward for "three weeks later"). */
export const simNow = (w: World) => new Date(new Date(w.session.now).getTime() + w.session.offsetDays * 864e5);

/** What an organisation may see of a person's Passport: shared items only, never practice, never revoked. */
export function visibleEvidence(w: World, personId: string, viewerOrgId: string) {
  if (w.consents[personId]?.withdrawnFrom.includes(viewerOrgId)) return [];
  return w.evidence.filter((e) => e.ownerId === personId && e.kind !== 'PRACTICE' && !e.revokedFrom?.includes(viewerOrgId)
    && (e.visibility === 'PUBLIC_PROFILE' || (e.visibility === 'SHARED_WITH' && e.sharedWith.includes(viewerOrgId))));
}
/** Events a given actor may read (tenant isolation). */
export function eventsFor(w: World, actorId: string) {
  const a = actorOf(w, actorId);
  return w.events.filter((e) => e.scope === 'PUBLIC' || (a.orgId && (e.scope === `ORG:${a.orgId}` || e.scope.startsWith(`SHARED:${a.orgId}:`))) || (a.personId && (e.scope === `PERSON:${a.personId}` || e.scope.endsWith(`:${a.personId}`))));
}
