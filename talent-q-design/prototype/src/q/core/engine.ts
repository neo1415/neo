// Q's engine for the prototype: one conversation per person, skills that understand turns, serialisable
// actions, undo, navigation with view-state, and an optional model gateway. Everything goes through the
// one store (World v4), so the conversation and its effects survive navigation, reloads and other tabs.
import { useCallback } from 'react';
import type { Actor, QAction, QFrame, QMsg } from '../../state/domain';
import { actorOf, emit, getWorld, now, uid, update, useWorld, type World } from '../../mock/world';
import { navigate } from '../../ui/router';
import { entities, normalise } from './nlu';
import { getPageTask } from '../../ds/Workspace';
import type { QCtx, QReply, ReplyMsg, Skill } from './types';

// ---------------- Registries (skills, ops, live renderers) ----------------
const skills: Skill[] = [];
export const registerSkill = (s: Skill) => { if (!skills.some((x) => x.id === s.id)) skills.push(s); };
export const allSkills = () => skills;

type OpFn = (w: World, args: Record<string, unknown>, actor: Actor) => void | { say?: string; nav?: { to: string; label: string } };
const ops = new Map<string, OpFn>();
export const registerOp = (name: string, fn: OpFn) => { ops.set(name, fn); };

// ---------------- Conversation ----------------
const route = () => (location.hash.replace(/^#/, '').split('?')[0] || '/');
export function appendQ(w: World, actorId: string, m: Omit<QMsg, 'id' | 'at'>) {
  (w.q.threads[actorId] ??= []).push({ ...m, id: uid('qm'), at: now(), route: m.route ?? route() });
}
export const useQThread = () => useWorld((w) => w.q.threads[w.session.actor] ?? EMPTY);
const EMPTY: QMsg[] = [];

/** Shows "Q is thinking" between the person's turn and Q's reply (a real wait on async skills / gateway). */
let thinking = false; const thinkSubs = new Set<() => void>();
const setThinking = (v: boolean) => { thinking = v; thinkSubs.forEach((f) => f()); };
export const onThinking = (f: () => void) => { thinkSubs.add(f); return () => { thinkSubs.delete(f); }; };
export const isThinking = () => thinking;

function lastQ(w: World, actor: string) { const t = w.q.threads[actor] ?? []; for (let i = t.length - 1; i >= 0; i--) if (t[i].who === 'q') return t[i]; return null; }

function ctxFor(w: World, text: string): QCtx {
  const actor = actorOf(w);
  const norm = normalise(text);
  return { w, actor, route: route(), text, norm, ents: entities(norm, w), frame: w.q.frames[actor.id] ?? null, lastQ: lastQ(w, actor.id) };
}

/** Apply a skill's reply atomically: messages, effects, frame, then navigation. */
function applyReply(r: QReply, engine: QMsg['engine'] = 'rules') {
  update((w) => {
    const actor = actorOf(w);
    r.effects?.(w, actor);
    for (const m of r.msgs) appendQ(w, actor.id, { who: m.who ?? 'q', engine, ...m });
    if (r.frame !== undefined) w.q.frames[actor.id] = r.frame;
  });
  if (r.nav) qNavigate(r.nav.to, r.nav.label);
}

/** The person said something to Q (typed, spoken or tapped a suggestion that says words). */
export async function sendToQ(text: string) {
  const t = text.trim(); if (!t) return;
  if (getWorld().network === 'offline') {
    update((w) => { appendQ(w, w.session.actor, { who: 'me', text: t }); (w.q.outbox[w.session.actor] ??= []).push(t); appendQ(w, w.session.actor, { who: 'system', kind: 'notice', text: 'You’re offline. I’ll read this as soon as you reconnect; nothing is lost.', engine: 'system' }); });
    return;
  }
  // A page task (onboarding, planner, J7) can own turns Q's skills don't clearly claim. Its own thread shows
  // the person's words, so they are not duplicated here.
  const task = getPageTask();
  if (task) {
    const c0 = ctxFor(getWorld(), t);
    const top = Math.max(0, ...skills.filter((s) => s.side === 'both' || s.side === c0.actor.side).map((s) => s.match(c0)));
    const owner0 = c0.frame ? skills.find((s) => s.id === c0.frame!.intent) : undefined;
    if (top < 0.75 && !owner0?.answer) { task.onSend(t); return; }
  }
  update((w) => { appendQ(w, w.session.actor, { who: 'me', text: t }); });
  setThinking(true);
  try {
    const c = ctxFor(getWorld(), t);
    // 1. An awaited answer to the active frame wins, unless the person clearly changed topic.
    const owner = c.frame ? skills.find((s) => s.id === c.frame!.intent) : undefined;
    if (owner?.answer) {
      const r = await owner.answer(c);
      if (r) { applyReply(r); return; }
    }
    // 2. Score every skill for this side; highest wins above the threshold.
    const scored = skills.filter((s) => s.side === 'both' || s.side === c.actor.side).map((s) => ({ s, score: s.match(c) })).sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best && best.score >= 0.45) {
      const r = await best.s.handle(c);
      // A new intent suspends (not discards) the previous frame, so Q can come back to it.
      if (c.frame && best.s.id !== c.frame.intent && r.frame === undefined) r.frame = { ...c.frame, topic: 'suspended' };
      applyReply(r);
      return;
    }
    // 3. Nothing matched: try the model gateway if configured, otherwise be honest about the limit.
    const g = await gatewayReply(c);
    if (g) { applyReply(g, 'gateway'); return; }
    applyReply(fallback(c));
  } finally { setThinking(false); }
}

function fallback(c: QCtx): QReply {
  update((w) => emit(w, c.actor.id, 'q.unhandled', c.actor.orgId ? `ORG:${c.actor.orgId}` : `PERSON:${c.actor.personId}`, `Q could not understand: “${c.text.slice(0, 120)}”`));
  const recruiter = c.actor.side === 'recruiter';
  return {
    msgs: [{ kind: 'reply', text: `I’m not sure I understood that, and I don’t want to guess. In this prototype my understanding is limited to hiring and career tasks. Could you say it another way, or pick one of these?`,
      actions: recruiter
        ? [{ label: 'Help me hire someone', act: { t: 'say', text: 'I need to hire someone' } }, { label: 'Show my candidates', act: { t: 'nav', to: '/r/pipeline' } }, { label: 'What can you do?', act: { t: 'say', text: 'what can you do' } }]
        : [{ label: 'Help me find a job', act: { t: 'say', text: 'help me find a job' } }, { label: 'Where could my career go?', act: { t: 'nav', to: '/c/career' } }, { label: 'What can you do?', act: { t: 'say', text: 'what can you do' } }] }],
  };
}

// ---------------- Optional model gateway (ModelGatewayRequest shape; never ships credentials) ----------------
const GATEWAY = (import.meta.env.VITE_TQ_MODEL_GATEWAY_URL as string | undefined) || '';
export const gatewayConfigured = () => !!GATEWAY;
async function gatewayReply(c: QCtx): Promise<QReply | null> {
  if (!GATEWAY || c.w.network === 'offline') return null;
  try {
    const res = await fetch(GATEWAY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      taskClass: 'CONVERSATION', sensitivity: 'PERSONAL', dataPosture: 'NO_TRAINING', output: { type: 'text' },
      messages: [{ role: 'system', content: `You are Q inside Talent Q. Reply in two or three sentences. Never claim to send, book or share anything. Side: ${c.actor.side}.` }, ...(c.w.q.threads[c.actor.id] ?? []).slice(-8).map((m) => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text }))],
      budget: { maxAttempts: 1, maxEstimatedCostUsd: 0.01, maxOutputTokens: 200, attemptTimeoutMs: 8000 }, attribution: { tenantId: c.actor.orgId ?? 'talent', userId: c.actor.id, correlationId: uid('corr'), purpose: 'talent-q-prototype' },
    }) });
    if (!res.ok) return null;
    const j = await res.json() as { text?: string };
    return j.text ? { msgs: [{ kind: 'reply', text: j.text }] } : null;
  } catch { return null; }
}

// ---------------- Actions (chips, buttons, suggestion actions) ----------------
export async function runAction(a: QAction) {
  if (a.act.t === 'say') return sendToQ(a.act.text);
  if (a.act.t === 'nav') return qNavigate(a.act.to, a.label);
  const fn = ops.get(a.act.op);
  if (!fn) { console.warn('Unknown op', a.act.op); return; }
  let result: ReturnType<OpFn> = undefined;
  update((w) => { result = fn(w, a.act.t === 'do' ? a.act.args ?? {} : {}, actorOf(w)); });
  const r = result as ReturnType<OpFn>;
  if (r && typeof r === 'object') {
    if (r.say) update((w) => appendQ(w, w.session.actor, { who: 'q', kind: 'reply', text: r.say!, engine: 'rules' }));
    if (r.nav) qNavigate(r.nav.to, r.nav.label);
  }
}
export const useRunAction = () => useCallback((a: QAction) => { void runAction(a); }, []);

// ---------------- Undo ----------------
export function pushUndo(w: World, actorId: string, label: string, op: string, args: Record<string, unknown>) {
  (w.q.undo[actorId] ??= []).push({ id: uid('u'), label, at: now(), inverse: { op, args } });
  if (w.q.undo[actorId].length > 20) w.q.undo[actorId].shift();
}
registerOp('undo', (w, _a, actor) => {
  const u = w.q.undo[actor.id]?.pop();
  if (!u) return { say: 'There’s nothing for me to undo yet.' };
  const fn = ops.get(u.inverse.op);
  fn?.(w, u.inverse.args, actor);
  emit(w, actor.id, 'q.undo', actor.orgId ? `ORG:${actor.orgId}` : `PERSON:${actor.personId}`, `Undid: ${u.label}`);
  return { say: `Done: I undid “${u.label}”.` };
});

// ---------------- Navigation with history and view-state ----------------
export function qNavigate(to: string, label: string) {
  update((w) => {
    const a = w.session.actor;
    const stack = (w.q.nav[a] ??= []);
    const here = route();
    if (stack[stack.length - 1]?.path !== here) stack.push({ path: here, label: labelFor(here), at: now() });
    if (stack.length > 30) stack.shift();
    w.session.lastRoute[a] = to;
  });
  void label;
  navigate(to);
}
/** "Go back" to the previous place Q or the person visited (view-state there is restored by the page). */
export function qBack(): { to: string; label: string } | null {
  const w = getWorld(); const stack = w.q.nav[w.session.actor] ?? [];
  const here = route();
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].path !== here) {
    const t = stack[i];
    update((d) => { d.q.nav[d.session.actor] = stack.slice(0, i); });
    navigate(t.path);
    return { to: t.path, label: t.label };
  }
  return null;
}
export function labelFor(path: string) {
  const w = getWorld();
  const person = path.match(/people\/(p_\w+)/)?.[1];
  if (person) return `${w.people.find((p) => p.personId === person)?.name ?? 'Profile'}’s profile`;
  const M: Record<string, string> = { '/r/home': 'Q home', '/r/compare': 'the comparison', '/r/plan': 'plans and agents', '/r/pipeline': 'the pipeline', '/r/messages': 'messages', '/r/calendar': 'the calendar', '/r/mandate': 'the role', '/r/interviews': 'interviews', '/c/career': 'your career atlas', '/c/passport': 'your Evidence Passport', '/c/jobs': 'jobs', '/c/applications': 'your applications', '/c/welcome': 'getting started', '/c/home': 'Q home' };
  return M[path] ?? path;
}

/** Page view-state that survives navigation (e.g. the comparison's focus). Stored per person and route. */
export function useViewState<T>(key: string, initial: T): [T, (v: T) => void] {
  const k = `${useWorld((w) => w.session.actor)}|${route().split('/').slice(0, 3).join('/')}`;
  const v = useWorld((w) => (w.q.ui[k]?.[key] as T | undefined));
  const set = useCallback((nv: T) => update((w) => { (w.q.ui[k] ??= {})[key] = nv as unknown; }), [k, key]);
  return [v === undefined ? initial : v, set];
}

/** Q says something without a user turn (proactive follow-ups, results of background work). */
export function qSays(text: string, extra: Partial<Omit<QMsg, 'id' | 'at' | 'who' | 'text'>> = {}) {
  update((w) => appendQ(w, w.session.actor, { who: 'q', text, engine: 'rules', ...extra }));
}
export type { QReply, ReplyMsg };
export type Frame = QFrame;

/** On reconnect, Q reads what was typed offline, in order. */
export async function flushOutbox() {
  const w = getWorld(); const box = w.q.outbox[w.session.actor] ?? [];
  if (!box.length) return;
  update((d) => { d.q.outbox[d.session.actor] = []; appendQ(d, d.session.actor, { who: 'system', kind: 'notice', text: `Back online. Reading the ${box.length === 1 ? 'message' : `${box.length} messages`} you sent while offline.`, engine: 'system' }); });
  for (const t of box) {
    // Re-run understanding without re-appending the person's message.
    const c = ctxFor(getWorld(), t);
    const scored = skills.filter((s) => s.side === 'both' || s.side === c.actor.side).map((s) => ({ s, score: s.match(c) })).sort((a, b) => b.score - a.score);
    applyReply(scored[0] && scored[0].score >= 0.45 ? await scored[0].s.handle(c) : fallback(c));
  }
}
