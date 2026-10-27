// A browser-side stand-in for Q's run stream (GET /v1/q/runs/:runId/events).
// It emits the typed events in @contracts/run with per-run sequences. Durable events are kept
// and replayed after a cursor; deltas are live-only, as in Q. Progress only moves when a script
// finishes a unit of work: there are no timers that pretend progress.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  CONTRACT_VERSION, EPHEMERAL_TYPES, TERMINAL_STATUSES,
  type Capability, type ContextUse, type QStreamEvent, type RunId, type RunStatus, type RunStep, type VisibleStage,
} from '@contracts';
import { getWorld } from './world';

type Listener = (e: QStreamEvent) => void;
type Pending = { kind: 'approval' | 'input' | 'cost'; id: string; resolve: (v: string) => void };

interface Run {
  runId: RunId;
  capability: Capability;
  title: string;
  status: RunStatus;
  durable: QStreamEvent[];
  seq: number;
  listeners: Set<Listener>;
  pending: Map<string, Pending>;
  cancelled: boolean;
}

const runs = new Map<RunId, Run>();
const runListeners = new Set<() => void>();
const notifyRuns = () => runListeners.forEach((l) => l());

export class Cancelled extends Error { constructor() { super('cancelled'); } }

/** Simulated provider latency: fixed values, so captures are reproducible. */
export const latency = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function emit<T extends QStreamEvent['type']>(run: Run, type: T, data: Extract<QStreamEvent, { type: T }>['data']) {
  run.seq += 1;
  const e = { contractVersion: CONTRACT_VERSION, eventId: `evt_${run.runId.slice(4)}_${run.seq}`, runId: run.runId, sequence: run.seq, occurredAt: new Date().toISOString(), type, data } as QStreamEvent;
  if (!EPHEMERAL_TYPES.includes(type)) run.durable.push(e);
  if ('status' in (data as object)) run.status = (data as { status: RunStatus }).status;
  // Offline: nothing is delivered. Subscribers re-open with their cursor when back online.
  if (getWorld().network === 'online') run.listeners.forEach((l) => l(e));
  notifyRuns();
}

export interface ScriptContext {
  runId: RunId;
  stage(stage: VisibleStage, status?: RunStatus): void;
  step(step: RunStep): void;
  say(text: string, used?: ContextUse[]): Promise<void>;
  find(kind: 'candidate' | 'source' | 'slot' | 'gap' | 'conflict', ref: string, summary: string): void;
  approval(proposalId: string, payloadHash: `sha256:${string}`): Promise<'APPROVED' | 'REJECTED' | 'EDITED'>;
  ask(prompt: string, options?: string[]): Promise<string>;
  work(ms: number): Promise<void>;
  checkCancelled(): void;
}

export type Script = (ctx: ScriptContext) => Promise<string[] | void>;

export function startRun(capability: Capability, title: string, script: Script): RunId {
  const runId = `run_${Math.random().toString(36).slice(2, 10)}` as RunId;
  const run: Run = { runId, capability, title, status: 'RECEIVED', durable: [], seq: 0, listeners: new Set(), pending: new Map(), cancelled: false };
  runs.set(runId, run);
  const check = () => { if (run.cancelled) throw new Cancelled(); };
  const ctx: ScriptContext = {
    runId,
    stage: (stage, status = 'SPECIALIST_EXECUTION') => { check(); emit(run, 'q.stage.changed', { stage, status }); },
    step: (step) => { check(); emit(run, 'q.step.updated', step); },
    say: async (text, used = []) => {
      check();
      const messageId = `msg_${run.seq + 1}`;
      // Deltas stream by word; the completed message is the durable record.
      const words = text.split(/(\s+)/);
      let acc = '';
      for (let i = 0; i < words.length; i += 6) {
        acc += words.slice(i, i + 6).join('');
        emit(run, 'q.message.delta', { messageId, text: acc });
        await latency(28);
      }
      emit(run, 'q.message.completed', { messageId, text, usedContext: used });
    },
    find: (kind, ref, summary) => { check(); emit(run, 'q.finding.available', { findingId: `f_${run.seq + 1}`, kind, ref, summary }); },
    approval: (proposalId, payloadHash) => {
      check();
      emit(run, 'q.action.proposed', { proposalId });
      emit(run, 'q.approval.required', { proposalId, payloadHash });
      emit(run, 'q.stage.changed', { stage: 'WAITING_FOR_APPROVAL', status: 'AWAITING_APPROVAL' });
      return new Promise((resolve) => run.pending.set(proposalId, { kind: 'approval', id: proposalId, resolve: resolve as (v: string) => void }));
    },
    ask: (prompt, options) => {
      check();
      const questionId = `q_${run.seq + 1}`;
      emit(run, 'q.input.required', { questionId, prompt, options });
      run.status = 'AWAITING_INPUT';
      return new Promise((resolve) => run.pending.set(questionId, { kind: 'input', id: questionId, resolve }));
    },
    work: async (ms) => { check(); await latency(ms); check(); },
    checkCancelled: check,
  };
  queueMicrotask(async () => {
    emit(run, 'q.run.started', { capability, status: 'PREFLIGHT', title });
    try {
      const artifactIds = (await script(ctx)) || [];
      emit(run, 'q.run.completed', { status: 'COMPLETED', artifactIds });
    } catch (err) {
      if (err instanceof Cancelled) emit(run, 'q.run.failed', { status: 'CANCELLED', code: 'CANCELLED_BY_USER', recoverable: true, message: 'You stopped this. Nothing after the last finished step was done.' });
      else emit(run, 'q.run.failed', { status: 'FAILED', code: 'SCRIPT_ERROR', recoverable: true, message: err instanceof Error ? err.message : 'Something went wrong.' });
    }
  });
  notifyRuns();
  return runId;
}

/** Open the stream after a cursor: durable events after `afterSequence` replay first, then live. */
export function subscribe(runId: RunId, afterSequence: number, listener: Listener) {
  const run = runs.get(runId);
  if (!run) return () => {};
  run.durable.filter((e) => e.sequence > afterSequence).forEach(listener);
  run.listeners.add(listener);
  return () => run.listeners.delete(listener);
}

export function respond(runId: RunId, id: string, value: string) {
  const run = runs.get(runId);
  const p = run?.pending.get(id);
  if (!run || !p) return;
  run.pending.delete(id);
  if (p.kind === 'approval') emit(run, 'q.stage.changed', { stage: value === 'APPROVED' ? 'COMPLETING_APPROVED_ACTION' : 'WAITING_FOR_REPLY', status: value === 'APPROVED' ? 'ACTION_EXECUTION' : 'SYNTHESIS' });
  p.resolve(value);
}

export function cancelRun(runId: RunId) {
  const run = runs.get(runId);
  if (!run || TERMINAL_STATUSES.includes(run.status)) return;
  run.cancelled = true;
  emit(run, 'q.stage.changed', { stage: 'UNDERSTANDING_REQUEST', status: 'CANCEL_REQUESTED' });
  // Wake anything waiting so the script can observe the cancel.
  run.pending.forEach((p) => p.resolve('REJECTED'));
  run.pending.clear();
}

export function runInfo(runId: RunId | null) { return runId ? runs.get(runId) ?? null : null; }
export function allRuns() { return [...runs.values()]; }
export function onRuns(l: () => void) { runListeners.add(l); return () => { runListeners.delete(l); }; }

// ---------- React view of one run ----------

export interface RunView {
  runId: RunId | null;
  title: string;
  status: RunStatus | 'IDLE';
  stage: VisibleStage | null;
  steps: RunStep[];
  live: string;
  messages: { id: string; text: string; used: ContextUse[] }[];
  findings: { kind: string; ref: string; summary: string }[];
  pendingApproval: string | null;
  pendingInput: { questionId: string; prompt: string; options?: string[] } | null;
  failure: { code: string; message: string; recoverable: boolean; status: string } | null;
  lastSequence: number;
  replayed: number;
  completed: boolean;
}

const emptyView = (runId: RunId | null): RunView => ({ runId, title: '', status: 'IDLE', stage: null, steps: [], live: '', messages: [], findings: [], pendingApproval: null, pendingInput: null, failure: null, lastSequence: 0, replayed: 0, completed: false });

export function reduce(v: RunView, e: QStreamEvent): RunView {
  const n = { ...v, lastSequence: EPHEMERAL_TYPES.includes(e.type) ? v.lastSequence : e.sequence };
  switch (e.type) {
    case 'q.run.started': return { ...n, title: e.data.title, status: e.data.status };
    case 'q.stage.changed': return { ...n, stage: e.data.stage, status: e.data.status, pendingApproval: e.data.status === 'AWAITING_APPROVAL' ? n.pendingApproval : null };
    case 'q.step.updated': {
      const steps = n.steps.some((s) => s.stepId === e.data.stepId) ? n.steps.map((s) => (s.stepId === e.data.stepId ? e.data : s)) : [...n.steps, e.data];
      return { ...n, steps };
    }
    case 'q.message.delta': return { ...n, live: e.data.text };
    case 'q.message.completed': return { ...n, live: '', messages: [...n.messages, { id: e.data.messageId, text: e.data.text, used: e.data.usedContext }] };
    case 'q.finding.available': return { ...n, findings: [...n.findings, e.data] };
    case 'q.approval.required': return { ...n, pendingApproval: e.data.proposalId };
    case 'q.input.required': return { ...n, pendingInput: e.data, status: 'AWAITING_INPUT' };
    case 'q.run.completed': return { ...n, status: 'COMPLETED', completed: true, pendingInput: null };
    case 'q.run.failed': return { ...n, status: e.data.status, failure: { code: e.data.code, message: e.data.message, recoverable: e.data.recoverable, status: e.data.status }, pendingInput: null, pendingApproval: null };
    default: return n;
  }
}

/** Subscribes to a run and folds its events. Re-opens from the last durable cursor after going offline. */
export function useRun(runId: RunId | null, network: 'online' | 'offline'): RunView {
  const [view, setView] = useState<RunView>(() => emptyView(runId));
  const cursor = useRef(0);
  useEffect(() => { cursor.current = 0; setView(emptyView(runId)); }, [runId]);
  useEffect(() => {
    if (!runId || network === 'offline') return;
    let replayed = 0;
    const resumingFrom = cursor.current;
    const off = subscribe(runId, resumingFrom, (e) => {
      if (!EPHEMERAL_TYPES.includes(e.type)) cursor.current = e.sequence;
      if (resumingFrom > 0) replayed += 1;
      setView((v) => ({ ...reduce(v, e), replayed: resumingFrom > 0 ? replayed : v.replayed }));
    });
    return off;
  }, [runId, network]);
  // Pending input or approval might be set before a re-subscribe; surface from the run record.
  const run = runId ? runs.get(runId) : null;
  if (run && view.pendingInput && !run.pending.has(view.pendingInput.questionId)) return { ...view, pendingInput: null };
  return view;
}

// ---------- Named runs: the run a screen is following (e.g. 'intake', 'sourcing', 'schedule') ----------
const named = new Map<string, RunId>();
export function nameRun(name: string, runId: RunId) { named.set(name, runId); notifyRuns(); return runId; }
export function namedRun(name: string): RunId | null {
  const id = named.get(name);
  return id && runs.has(id) ? id : null;
}
export function useNamedRun(name: string): RunId | null {
  return useSyncExternalStore(onRuns, () => namedRun(name));
}
