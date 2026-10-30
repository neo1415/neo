// ASSESS ops: the one way pages, chips and Q's replies change assessment state (a button and a typed request do the
// same thing). Each returns an optional { say } that the engine posts back into the person's Q thread.
import { registerOp } from '../../q/core/engine';
import { emit } from '../../mock/world';
import { assess } from '../../state/areas/assess';
import {
  addQuestion, avatarOp, buildPlan, confirmRating, discardDraft, draftCandidateFeedback, exerciseOp, liveOp, lockBank, proposeInterviewRatings, removeQuestion,
  setAvatarEnabled, setEditor, shareFeedback, uploadQuestions, type Res,
} from './model';

const S = (a: Record<string, unknown>, k: string) => String(a[k] ?? '');
const say = (r: Res | void) => (r && !r.ok ? { say: r.say } : undefined);
const sayAll = (r: Res | void) => (r ? { say: r.say } : undefined);

registerOp('as.bank.upload', (w, a, actor) => sayAll(uploadQuestions(w, actor, S(a, 'bankId'), a.text ? S(a, 'text') : undefined, a.file ? S(a, 'file') : undefined)));
registerOp('as.bank.add', (w, a, actor) => sayAll(addQuestion(w, actor, S(a, 'bankId'), S(a, 'text'), (a.tags as string[]) ?? [])));
registerOp('as.bank.remove', (w, a, actor) => say(removeQuestion(w, actor, S(a, 'bankId'), S(a, 'qid'))));
registerOp('as.bank.lock', (w, a, actor) => sayAll(lockBank(w, actor, S(a, 'bankId'))));
registerOp('as.bank.discard', (w, a, actor) => sayAll(discardDraft(w, actor, S(a, 'bankId'))));
registerOp('as.bank.editor', (w, a, actor) => sayAll(setEditor(w, actor, S(a, 'bankId'), S(a, 'actorId'), a.on !== false)));
registerOp('as.plan.build', (w, a, actor) => { const p = buildPlan(w, actor, S(a, 'id')); return p ? undefined : { say: 'That interview isn’t available to you.' }; });
registerOp('as.live', (w, a, actor) => sayAll(liveOp(w, actor, S(a, 'id'), S(a, 'kind'), a)));
registerOp('as.review.propose', (w, a, actor) => sayAll(proposeInterviewRatings(w, actor, S(a, 'id'))));
registerOp('as.review.confirm', (w, a, actor) => say(confirmRating(w, actor, S(a, 'ratingId'))));
registerOp('as.feedback.toggle', (w, a, actor) => {
  const id = S(a, 'id'); const iv = w.interviews.find((i) => i.id === id); if (!iv || iv.orgId !== actor.orgId) return;
  const f = (assess(w).feedback[id] ??= draftCandidateFeedback(w, id)!); if (!f || f.state === 'SHARED') return;
  const it = [...f.strengths, ...f.routes].find((x) => x.id === a.item); if (it) it.on = !it.on;
});
registerOp('as.feedback.note', (w, a, actor) => { const id = S(a, 'id'); const iv = w.interviews.find((i) => i.id === id); if (!iv || iv.orgId !== actor.orgId) return; const f = (assess(w).feedback[id] ??= draftCandidateFeedback(w, id)!); if (f && f.state === 'DRAFT') f.note = S(a, 'note'); });
registerOp('as.feedback.share', (w, a, actor) => sayAll(shareFeedback(w, actor, S(a, 'id'))));
registerOp('as.coaching.ack', (w, a) => { const k = `${w.session.actor}:${S(a, 'id')}`; assess(w).coached[k] = [...new Set([...(assess(w).coached[k] ?? []), S(a, 'item')])]; });
registerOp('as.avatar', (w, a, actor) => sayAll(avatarOp(w, actor, S(a, 'orgId') || 'org_kora', S(a, 'kind'), a)));
registerOp('as.avatar.setting', (w, a, actor) => sayAll(setAvatarEnabled(w, actor, a.on !== false)));
registerOp('as.ex', (w, a, actor) => sayAll(exerciseOp(w, actor, S(a, 'id'), S(a, 'kind'), a)));
/** The candidate asks the employer to correct their transcript. The transcript is unchanged until the panel reviews it. */
registerOp('as.transcript.correct', (w, a, actor) => {
  const iv = w.interviews.find((i) => i.id === a.id && i.personId === actor.personId); if (!iv) return { say: 'That interview isn’t yours.' };
  emit(w, actor.id, 'interview.transcript.correction_requested', `SHARED:${iv.orgId}:${iv.personId}`, `${actor.first} asked for a correction to their interview transcript. It stays as recorded until the panel reviews it.`, { id: iv.id });
  return { say: 'Sent. The panel sees your request; the transcript stays as recorded until they review it.' };
});
