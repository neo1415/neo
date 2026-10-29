// R2 operations. Pages and Q's replies both perform work through these registered ops, so a button and
// a typed request do exactly the same thing (and Q can offer them as serialisable actions).
import { emit, getWorld, now, uid, update, type World } from '../../mock/world';
import type { Actor, Stage } from '../../state/domain';
import { pushUndo, qSays, registerOp } from '../../q/core/engine';
import { hireB, type Level, type Rating } from '../../state/areas/hire-b';
import { cellFor, defaultView, draftFeedback, firstName, KORA_ROLE, questionsFor, reqLabel, visibleIds, type CompareView } from './model';

const scope = (a: Actor) => (a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId}`);
export const CMP_KEY = (actorId: string) => `${actorId}|/r/compare`;
export function cmpView(w: World, actorId = w.session.actor): CompareView {
  return { ...defaultView(w), ...((w.q.ui[CMP_KEY(actorId)]?.cmp as Partial<CompareView> | undefined) ?? {}) };
}
export function setCmp(w: World, actorId: string, patch: Partial<CompareView>) {
  const k = CMP_KEY(actorId);
  (w.q.ui[k] ??= {}).cmp = { ...cmpView(w, actorId), ...patch };
}

// ---------- GitHub (simulated connector) ----------
let ghTimer: number | undefined;
/** Retry the simulated GitHub connector. The outage clears on the second retry: the first honestly fails. */
export function ghRetry(w: World, actor: Actor) {
  const g = hireB(w).github;
  if (g.status === 'CHECKING') return g.tries;
  g.status = 'CHECKING'; g.tries += 1;
  emit(w, actor.id, 'integration.retry', scope(actor), `Retried GitHub (attempt ${g.tries}, simulated).`);
  window.clearTimeout(ghTimer);
  ghTimer = window.setTimeout(() => {
    let ok = false;
    update((d) => {
      const s = hireB(d).github; s.checkedAt = now();
      if (s.tries >= 2) { ok = true; s.status = 'OK'; s.cachedAt = now(); emit(d, actor.id, 'integration.recovered', scope(actor), 'GitHub responded; repositories refreshed (simulated).'); }
      else s.status = 'DOWN';
    });
    qSays(ok ? 'GitHub answered. The repositories now show the current copy. Answering isn’t the same as verifying: whether each repository really belongs to the candidate is still checked separately.' : 'GitHub still isn’t responding (simulated outage). I’m keeping the cached copy on screen and treating those repositories as unknown, not weak. You can retry again in a moment.', { kind: 'notice' });
  }, 1200);
  return g.tries;
}
registerOp('hb.github.retry', (w, _a, actor) => { ghRetry(w, actor); });
registerOp('hb.github.outage', (w) => { const g = hireB(w).github; g.status = 'DOWN'; g.tries = 0; });

// ---------- Comparison ----------
registerOp('hb.cmp.set', (w, a, actor) => { setCmp(w, actor.id, a as Partial<CompareView>); });
export function addCorrection(w: World, actor: Actor, pid: string, reqId: string, level: Level, note: string) {
  const id = uid('corr');
  hireB(w).corrections.push({ id, personId: pid, reqId, level, note, by: actor.id, at: now() });
  pushUndo(w, actor.id, `your correction to ${firstName(w, pid)}’s ${reqLabel(w, reqId)}`, 'hb.correct.remove', { id });
  emit(w, actor.id, 'q.corrected', scope(actor), `${actor.first} corrected Q’s reading of ${firstName(w, pid)}’s ${reqLabel(w, reqId)}: ${note}`);
}
registerOp('hb.correct', (w, a, actor) => { addCorrection(w, actor, String(a.pid), String(a.reqId), a.level as Level, String(a.note)); });
registerOp('hb.correct.remove', (w, a) => { const s = hireB(w); s.corrections = s.corrections.filter((c) => c.id !== a.id); });

// ---------- Profile: "since you last looked" ----------
export function markSeen(pid: string) {
  const w = getWorld(); const ids = visibleIds(w, pid);
  const prev = hireB(w).seen[w.session.actor]?.[pid];
  if (prev && prev.items.join() === ids.join()) return;
  update((d) => { ((hireB(d).seen[d.session.actor] ??= {}))[pid] = { at: now(), items: ids }; });
}

// ---------- Interviews ----------
export function live(w: World, id: string) {
  return (hireB(w).live[id] ??= { step: 'BRIEF', current: 0, ratings: {}, notes: [] });
}
const movePipeline = (w: World, actor: Actor, pid: string, stage: Stage, note?: string) => {
  const p = w.pipeline.find((x) => x.mandateId === KORA_ROLE && x.personId === pid);
  if (!p) return;
  const from = p.stage;
  if (stage !== from) { p.stage = stage; p.at = now(); p.by = actor.id; }
  if (note) p.note = note;
  emit(w, actor.id, 'pipeline.updated', `ORG:${actor.orgId}`, `${firstName(w, pid)}: ${from === stage ? `note added (${note})` : `moved from ${from.toLowerCase()} to ${stage.toLowerCase()}`}.`, { personId: pid, from, to: stage });
};
export function startInterview(w: World, actor: Actor, id: string) {
  const i = w.interviews.find((x) => x.id === id); if (!i) return;
  const l = live(w, i.id); if (l.step !== 'BRIEF') return;
  l.step = 'LIVE'; l.startedAt = now();
  if (!hireB(w).plans[i.id]) hireB(w).plans[i.id] = questionsFor(w, i.personId).map(({ id: qid, reqId, text, why }) => ({ id: qid, reqId, text, why }));
  movePipeline(w, actor, i.personId, 'INTERVIEW');
  emit(w, actor.id, 'interview.started', scope(actor), `${actor.first} started the interview with ${firstName(w, i.personId)} (copilot, simulated).`);
}
registerOp('hb.iv.start', (w, a, actor) => { startInterview(w, actor, String(a.id)); });
registerOp('hb.iv.note', (w, a) => {
  const l = live(w, String(a.id));
  l.notes.push({ id: uid('n'), reqId: (a.reqId as string) || undefined, text: String(a.text), at: now(), vague: !!a.vague, followups: (a.followups as string[]) ?? [] });
});
registerOp('hb.iv.rate', (w, a) => { const l = live(w, String(a.id)); l.ratings[String(a.reqId)] = a.rating as Rating; });
registerOp('hb.iv.goto', (w, a) => { live(w, String(a.id)).current = Number(a.index); });
export function finishInterview(w: World, id: string) {
  const i = w.interviews.find((x) => x.id === id); if (!i) return null;
  const l = live(w, i.id); l.step = 'FEEDBACK';
  if (!l.draft) l.draft = { ...draftFeedback(w, i, l.ratings, l.notes), byQ: true };
  return l.draft;
}
registerOp('hb.iv.finish', (w, a) => { finishInterview(w, String(a.id)); });
registerOp('hb.iv.draft', (w, a) => { const l = live(w, String(a.id)); l.draft = { rating: a.rating as 'STRONG' | 'MIXED' | 'CONCERNS', notes: String(a.notes), byQ: false }; });
registerOp('hb.iv.submit', (w, a, actor) => {
  const i = w.interviews.find((x) => x.id === a.id); if (!i) return;
  const l = live(w, i.id); const d = l.draft; if (!d) return;
  const refs = cellIds(w, i.personId);
  i.feedback.push({ by: actor.id, rating: d.rating, notes: d.notes, at: now(), evidenceRefs: refs });
  i.status = 'DONE'; l.step = 'SUBMITTED';
  movePipeline(w, actor, i.personId, 'INTERVIEW', `Feedback from ${actor.first}: ${d.rating.toLowerCase()}`);
  emit(w, actor.id, 'interview.feedback', scope(actor), `${actor.first} submitted feedback on ${firstName(w, i.personId)}: ${d.rating.toLowerCase()}.`, { interviewId: i.id });
  return { say: `Submitted. ${firstName(w, i.personId)}’s pipeline card now shows your feedback (${d.rating.toLowerCase()}). Next steps like a second round are scheduled from Messages or the calendar.` };
});
registerOp('hb.plan.keep', (w, a, actor) => {
  const id = String(a.id); const qs = a.questions as { id: string; reqId: string; text: string; why: string }[];
  hireB(w).plans[id] = qs;
  emit(w, actor.id, 'interview.plan', scope(actor), `Interview plan saved for ${firstName(w, w.interviews.find((x) => x.id === id)?.personId ?? '')} (${qs.length} questions from evidence gaps).`);
  return { nav: { to: `/r/interviews/${id}`, label: 'the interview' } };
});
registerOp('hb.pipeline.move', (w, a, actor) => { movePipeline(w, actor, String(a.pid), a.stage as Stage); return { say: `Done. ${firstName(w, String(a.pid))} is now at “${String(a.stage).toLowerCase()}” in the pipeline.` }; });

// ---------- Disputes ----------
registerOp('hb.dispute.simulate', (w, a) => {
  const i = w.interviews.find((x) => x.id === a.id); if (!i) return;
  i.disputed = { by: i.personId, reason: 'The brief didn’t say retries had to be safe to repeat. With that in the spec I’d have handled it.', state: 'OPEN' };
  emit(w, i.personId, 'interview.disputed', `SHARED:${i.orgId}:${i.personId}`, `${firstName(w, i.personId)} disputed the assessment result.`, { interviewId: i.id });
});
registerOp('hb.review.open', (w, a, actor) => {
  const i = w.interviews.find((x) => x.id === a.id); if (!i?.disputed) return;
  hireB(w).reviews[i.id] = { openedAt: now(), by: actor.id, reviewer: 'u_seyi', state: 'OPEN' };
  for (const f of i.feedback) for (const id of f.evidenceRefs) { const e = w.evidence.find((x) => x.evidenceId === id); if (e) e.verification = 'UNDER_REVIEW'; }
  emit(w, actor.id, 'assessment.review.opened', `SHARED:${i.orgId}:${i.personId}`, `Review opened for ${firstName(w, i.personId)}’s disputed assessment. Seyi Balogun will review it; the result is excluded until then.`, { interviewId: i.id });
  return { say: `Review opened. Seyi will look at it (simulated), and ${firstName(w, i.personId)} is told it’s under review, nothing more. Until it’s resolved I leave that result out of every comparison.` };
});
registerOp('hb.review.resolve', (w, a, actor) => {
  const i = w.interviews.find((x) => x.id === a.id); if (!i?.disputed) return;
  const upheld = a.outcome === 'UPHELD';
  i.disputed.state = 'RESOLVED';
  const r = hireB(w).reviews[i.id]; if (r) r.state = upheld ? 'UPHELD' : 'REVISED';
  for (const f of i.feedback) for (const id of f.evidenceRefs) { const e = w.evidence.find((x) => x.evidenceId === id); if (e) e.verification = upheld ? 'VERIFIED' : 'FAILED'; }
  emit(w, actor.id, 'assessment.review.resolved', `SHARED:${i.orgId}:${i.personId}`, `Review of ${firstName(w, i.personId)}’s assessment ${upheld ? 'upheld the result' : 'withdrew the result'} (simulated).`, { interviewId: i.id });
  return { say: upheld ? 'The reviewer upheld the result, so it counts again in comparisons.' : 'The reviewer withdrew the result. It no longer counts anywhere, and it’s marked as withdrawn rather than deleted.' };
});

function cellIds(w: World, pid: string) {
  return w.mandate.requirements.flatMap((r) => cellFor(w, pid, r.reqId).items.filter((i) => !i.excluded).map((i) => i.e.evidenceId)).filter((x, i, a) => a.indexOf(x) === i);
}
