// Multi-agent planner service (simulated). The UI talks only to the typed surface below
// (PlannerState + the actions at the bottom), so the future Q runtime can replace this file without
// changing a screen. Rules the simulation keeps, because the real system must too:
//   - progress moves only when a unit of work finishes (no timers that pretend progress);
//   - an unavailable integration is reported by name, and Q either recovers or asks;
//   - anything that leaves Talent Q (a message, a calendar hold, a referee contact) waits for approval;
//   - state is durable: a plan interrupted by closing the tab resumes from its last finished unit.
// Simulated: every source, provider and receipt here is fictional and labelled so in the UI.
import { useSyncExternalStore } from 'react';

export type AgentId = 'sourcing' | 'evidence' | 'outreach' | 'scheduling' | 'references';
export const AGENTS: Record<AgentId, { name: string; does: string }> = {
  sourcing: { name: 'Sourcing agent', does: 'Searches approved sources for people who match the mandate' },
  evidence: { name: 'Evidence agent', does: 'Opens shared evidence and checks it at the source' },
  outreach: { name: 'Outreach drafter', does: 'Drafts messages in your voice and the approved templates' },
  scheduling: { name: 'Scheduler', does: 'Finds interview times against calendars and your rules' },
  references: { name: 'Reference agent', does: 'Prepares reference requests for consent' },
};
export type TaskState = 'BLOCKED' | 'READY' | 'RUNNING' | 'WAITING_INPUT' | 'DONE' | 'SKIPPED';
export interface Source { name: string; status: 'OK' | 'RATE_LIMITED' | 'NOT_CONNECTED' | 'SKIPPED' | 'RETRYING' }
export interface Task {
  id: string; label: string; agent: AgentId; deps: string[]; total: number; done: number; state: TaskState;
  tool: string; approval?: string; sources?: Source[]; optional?: boolean; question?: { prompt: string; options: string[] };
}
export interface LogLine { id: number; at: number; agent: AgentId | 'q'; kind: 'tool' | 'finding' | 'issue' | 'decision' | 'approval'; text: string }
export interface Approval { id: string; taskId: string; kind: 'MESSAGE' | 'CALENDAR_HOLD' | 'REFERENCE_REQUEST'; to: string; title: string; preview: string; effect: string; state: 'WAITING' | 'APPROVED' | 'REJECTED'; receipt?: string }
export type PlanStatus = 'NONE' | 'CLARIFYING' | 'PLANNED' | 'RUNNING' | 'PAUSED' | 'WAITING_INPUT' | 'COMPLETED';
export interface PlannerState {
  v: 1;
  goal: string; scope: string | null; status: PlanStatus; pausedReason?: string;
  tasks: Task[]; log: LogLine[]; approvals: Approval[]; findings: { who: string; note: string; strength: 'strong' | 'partial' }[];
  /** A plan from an earlier session, to show continuation across sessions. */
  earlier: { title: string; at: string; progress: string; status: 'PAUSED' | 'RESUMED' };
  seq: number;
}

const KEY = 'tq.planner.v1';
export const GOAL = 'Fill Senior Backend Engineer by 30 November';
export const CONTEXT_USED = ['Mandate v1 · approved 22 Oct', 'Your meeting hours (20 Oct)', 'Kora handbook p.7 · panel of two', 'Policy: approve each send'];

function initialTasks(scope: string): Task[] {
  return [
    { id: 't1', label: 'Search approved sources', agent: 'sourcing', deps: [], total: 18, done: 0, state: 'READY', tool: 'talent.search',
      sources: [{ name: 'Talent Q network', status: 'OK' }, { name: 'GitHub public profiles', status: 'OK' }, { name: 'LinkedIn Recruiter', status: 'OK' }] },
    { id: 't2', label: 'Check evidence for the top matches', agent: 'evidence', deps: ['t1'], total: 9, done: 0, state: 'BLOCKED', tool: 'evidence.verify' },
    { id: 't3', label: 'Draft outreach to the shortlist', agent: 'outreach', deps: ['t2'], total: 3, done: 0, state: 'BLOCKED', tool: 'message.draft', approval: 'Each message waits for your yes' },
    { id: 't4', label: 'Find interview times', agent: 'scheduling', deps: ['t2'], total: 5, done: 0, state: 'BLOCKED', tool: 'calendar.freebusy', approval: 'Calendar holds wait for your yes' },
    { id: 't5', label: 'Prepare reference requests', agent: 'references', deps: ['t2'], total: 2, done: 0, state: 'BLOCKED', tool: 'reference.prepare', approval: 'Referees are contacted only with consent', optional: true },
  ].map((t) => (scope.includes('relocation') && t.id === 't1' ? { ...t, total: 24 } : t)) as Task[];
}

export function initialPlanner(): PlannerState {
  return { v: 1, goal: '', scope: null, status: 'NONE', tasks: [], log: [], approvals: [], findings: [], earlier: { title: 'Reference checks for Ifeoma Obi', at: '27 Oct, 16:40', progress: '1 of 2 referees confirmed', status: 'PAUSED' }, seq: 0 };
}
function load(): PlannerState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as PlannerState | null;
    if (s?.v === 1) {
      // The simulated runtime lives in this tab. If the tab closed mid-run, say so and resume from the cursor.
      if (s.status === 'RUNNING') return { ...s, status: 'PAUSED', pausedReason: 'Interrupted when the page closed. Every finished step was kept.' };
      return s;
    }
  } catch { /* storage unavailable */ }
  return initialPlanner();
}
let state: PlannerState = load();
const subs = new Set<() => void>();
const set = (f: (s: PlannerState) => PlannerState) => { state = f(state); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } subs.forEach((l) => l()); };
export const getPlanner = () => state;
export function usePlanner<T>(sel: (s: PlannerState) => T): T { return useSyncExternalStore((l) => { subs.add(l); return () => subs.delete(l); }, () => sel(state)); }
const line = (s: PlannerState, agent: LogLine['agent'], kind: LogLine['kind'], text: string): PlannerState => ({ ...s, seq: s.seq + 1, log: [...s.log, { id: s.seq + 1, at: Date.now(), agent, kind, text }] });

// ---------------- The engine: one unit of work per tick, round-robin across runnable tasks ----------------
const FINDS = [
  { who: 'Tobi Adeyemi', note: 'Reconciliation service, verified snapshot', strength: 'strong' as const },
  { who: 'Ifeoma Obi', note: 'Go in production, reference-confirmed', strength: 'strong' as const },
  { who: 'Kunle Bakare', note: 'Payments API, case study from 2024', strength: 'partial' as const },
  { who: 'Zara Mensah', note: 'Postgres at scale, no payments yet', strength: 'partial' as const },
];
let timer: number | null = null;
const TICK = 240;

function step() {
  timer = null;
  const s = state;
  if (s.status !== 'RUNNING') return;
  let next = { ...s, tasks: s.tasks.map((t) => ({ ...t })) };
  // Unblock tasks whose dependencies finished.
  next.tasks.forEach((t) => { if (t.state === 'BLOCKED' && t.deps.every((d) => ['DONE', 'SKIPPED'].includes(next.tasks.find((x) => x.id === d)!.state))) t.state = 'READY'; });
  const runnable = next.tasks.filter((t) => t.state === 'READY' || t.state === 'RUNNING');
  if (!runnable.length) {
    if (next.tasks.every((t) => t.state === 'DONE' || t.state === 'SKIPPED')) {
      const n = next.approvals.filter((a) => a.state === 'WAITING').length;
      next = line({ ...next, status: 'COMPLETED' }, 'q', 'decision', `All agents finished. ${n} actions are waiting for your approval; nothing has left Talent Q.`);
    }
    set(() => next); return;
  }
  for (const t of runnable) {
    if (t.state === 'READY') { t.state = 'RUNNING'; next = line(next, t.agent, 'tool', `${AGENTS[t.agent].name} started · ${t.tool}`); }
    // Scripted integration events (simulated):
    if (t.id === 't1' && t.done === 5 && t.sources![1].status === 'OK') {
      t.sources![1].status = 'RATE_LIMITED';
      next = line(next, 'sourcing', 'issue', 'GitHub public profiles: rate limited (simulated). Retrying in a moment with backoff; other sources continue.');
    } else if (t.id === 't1' && t.done === 8 && t.sources![1].status === 'RATE_LIMITED') {
      t.sources![1].status = 'OK';
      next = line(next, 'sourcing', 'decision', 'GitHub public profiles recovered after one retry. No results were lost.');
    } else if (t.id === 't1' && t.done === 11 && t.sources![2].status === 'OK') {
      t.sources![2].status = 'NOT_CONNECTED'; t.state = 'WAITING_INPUT';
      t.question = { prompt: 'LinkedIn Recruiter isn’t connected for Kora Pay. Skip it, or connect it now?', options: ['Skip LinkedIn for this plan', 'Connect LinkedIn (simulated)'] };
      next = line({ ...next, status: 'WAITING_INPUT' }, 'sourcing', 'issue', 'LinkedIn Recruiter: not connected. Q needs your decision; other work keeps its place.');
      set(() => next); return;
    }
    t.done = Math.min(t.total, t.done + 1);
    if (t.id === 't1' && t.done % 4 === 0) next = line(next, 'sourcing', 'tool', `Read ${t.done} of ${t.total} profiles across ${t.sources!.filter((x) => x.status !== 'SKIPPED' && x.status !== 'NOT_CONNECTED').length} sources`);
    if (t.id === 't2' && t.done % 2 === 0 && next.findings.length < FINDS.length) {
      const f = FINDS[next.findings.length];
      next = line({ ...next, findings: [...next.findings, f] }, 'evidence', 'finding', `${f.who}: ${f.note}`);
    }
    if (t.done >= t.total) {
      t.state = 'DONE';
      next = line(next, t.agent, 'decision', `${AGENTS[t.agent].name} finished: ${t.label.toLowerCase()}`);
      next = { ...next, approvals: [...next.approvals, ...approvalsFor(t.id)] };
      if (approvalsFor(t.id).length) next = line(next, t.agent, 'approval', `${approvalsFor(t.id).length} ${approvalsFor(t.id).length === 1 ? 'action waits' : 'actions wait'} for your approval`);
    }
  }
  set(() => next);
  timer = window.setTimeout(step, TICK);
}
function approvalsFor(id: string): Approval[] {
  const ppl = [['Tobi Adeyemi', 'Tue 3 Nov, 11:00'], ['Ifeoma Obi', 'Wed 4 Nov, 14:00'], ['Kunle Bakare', 'Thu 5 Nov, 11:00']];
  if (id === 't3') return ppl.map(([n]) => ({ id: `a_msg_${n.split(' ')[0]}`, taskId: id, kind: 'MESSAGE', to: n, title: `Message to ${n}`, preview: `Hi ${n.split(' ')[0]}, I’m Ada, hiring for Kora Pay. Your work on ${n.startsWith('Tobi') ? 'ledger reconciliation' : n.startsWith('Ifeoma') ? 'Go payment services' : 'the open banking gateway'} stood out. Would you be open to a 45-minute conversation next week?`, effect: 'Sends one message by email from ada@kora.example (simulated provider).', state: 'WAITING' }));
  if (id === 't4') return ppl.map(([n, t]) => ({ id: `a_cal_${n.split(' ')[0]}`, taskId: id, kind: 'CALENDAR_HOLD', to: n, title: `Hold ${t} for ${n.split(' ')[0]}`, preview: `${t} · 60 min · Ada + Musa (panel of two, per handbook p.7). Keeps your Tuesday 13:00–15:00 clear.`, effect: 'Places a tentative hold on two calendars (simulated). Released automatically if not confirmed in 48h.', state: 'WAITING' }));
  if (id === 't5') return [{ id: 'a_ref_ifeoma', taskId: id, kind: 'REFERENCE_REQUEST', to: 'Ifeoma Obi', title: 'Ask Ifeoma’s consent to contact two referees', preview: 'Ifeoma is asked first. Referees are contacted only if she agrees, and only about on-call leadership.', effect: 'Sends a consent request to Ifeoma (simulated). No referee is contacted yet.', state: 'WAITING' }];
  return [];
}
const kick = () => { if (timer == null && state.status === 'RUNNING') timer = window.setTimeout(step, TICK); };

// ---------------- Actions (the service surface the UI calls) ----------------
export const planner = {
  setGoal(goal: string) { set((s) => line({ ...initialPlanner(), earlier: s.earlier, goal, status: 'CLARIFYING' }, 'q', 'decision', `Goal received: ${goal}`)); },
  answerScope(scope: string) { set((s) => line({ ...s, scope, status: 'PLANNED', tasks: initialTasks(scope) }, 'q', 'decision', `Scope: ${scope}. Plan drafted with 5 tasks across 5 agents.`)); },
  toggleOptional(id: string) { set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id && t.optional ? { ...t, state: t.state === 'SKIPPED' ? 'BLOCKED' : 'SKIPPED' } : t)) })); },
  start() { set((s) => line({ ...s, status: 'RUNNING', pausedReason: undefined }, 'q', 'decision', 'Plan approved. Agents started.')); kick(); },
  pause() { if (timer) { clearTimeout(timer); timer = null; } set((s) => line({ ...s, status: 'PAUSED', pausedReason: 'Paused by you. Every finished step is kept.' }, 'q', 'decision', 'Paused.')); },
  resume() { set((s) => line({ ...s, status: 'RUNNING', pausedReason: undefined }, 'q', 'decision', 'Resumed from the last finished step.')); kick(); },
  answerQuestion(taskId: string, option: string) {
    set((s) => {
      const tasks = s.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const skip = /skip/i.test(option);
        return { ...t, state: 'RUNNING' as TaskState, question: undefined, total: skip ? t.total - 4 : t.total, sources: t.sources?.map((x) => (x.name === 'LinkedIn Recruiter' ? { ...x, status: (skip ? 'SKIPPED' : 'OK') as Source['status'] } : x)) };
      });
      return line({ ...s, tasks, status: 'RUNNING' }, 'q', 'decision', /skip/i.test(option) ? 'LinkedIn skipped for this plan. Search continues on two sources.' : 'LinkedIn connected (simulated). Search continues on three sources.');
    });
    kick();
  },
  decide(id: string, d: 'APPROVED' | 'REJECTED') {
    set((s) => {
      const a = s.approvals.find((x) => x.id === id)!;
      const receipt = d === 'APPROVED' ? `${a.kind === 'MESSAGE' ? 'msg' : a.kind === 'CALENDAR_HOLD' ? 'hold' : 'consent'}_sim_${(s.seq + 101).toString(36)}` : undefined;
      return line({ ...s, approvals: s.approvals.map((x) => (x.id === id ? { ...x, state: d, receipt } : x)) }, 'q', 'approval', `${d === 'APPROVED' ? 'Approved' : 'Declined'}: ${a.title}${receipt ? ` · receipt ${receipt} (simulated)` : ''}`);
    });
  },
  resumeEarlier() { set((s) => line({ ...s, earlier: { ...s.earlier, status: 'RESUMED', progress: '2 of 2 referees confirmed' } }, 'references', 'decision', 'Resumed the paused reference check from 27 Oct: the second referee confirmed (simulated).')); },
  reset() { if (timer) { clearTimeout(timer); timer = null; } set(() => initialPlanner()); },
};
