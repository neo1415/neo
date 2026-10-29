// Interview room logic shared by the page and Q's skills (so everything can be done by talking to Q).
import { emit, getWorld, now, uid, type World } from '../../mock/world';
import { personC, readPersonC, roomC, type AnswerMode, type InterviewRoom, type PersonState } from '../../state/areas/talent-c';
import { bankFor, type Bank, type IQ } from './questions';

export const bankOfRoom = (w: World, pid: string, key: string): Bank => bankFor(w, pid, key.startsWith('J7:') ? key.slice(3) : null);
export function current(w: World, pid: string): { p: PersonState; key: string; bank: Bank; room: InterviewRoom | undefined; q: IQ | undefined } {
  const p = readPersonC(w, pid); const key = p.room || 'PRACTICE'; const bank = bankOfRoom(w, pid, key); const room = p.rooms[key];
  return { p, key, bank, room, q: bank.questions[room?.qIndex ?? 0] };
}
export const qText = (q: IQ, room?: InterviewRoom) => (room?.simpler[q.id] ? q.simpler : q.text);

export function startRoom(w: World, pid: string, key: string) {
  const r = roomC(w, pid, key); const p = personC(w, pid); p.room = key;
  if (!key.startsWith('J7:')) p.stepsDone = [...new Set([...p.stepsDone, 2])];
  if (r.done) Object.assign(r, { started: true, qIndex: 0, answers: [], draft: '', form: { what: '', did: '', end: '' }, simpler: {}, paused: null, done: false, submitted: undefined });
  r.started = true;
  if (w.network === 'offline') r.paused = { reason: 'OFFLINE', at: now(), qIndex: r.qIndex };
}

/** Save the answer to the current question and move on. Returns false if there is nothing to save. */
export function answerCurrent(w: World, pid: string, via: AnswerMode): boolean {
  const p = personC(w, pid); const key = p.room; const r = roomC(w, pid, key); const bank = bankOfRoom(w, pid, key);
  const q = bank.questions[r.qIndex]; if (!q) return false;
  const text = via === 'FORM' ? [r.form.what && `What happened: ${r.form.what}`, r.form.did && `What I did: ${r.form.did}`, r.form.end && `How it ended: ${r.form.end}`].filter(Boolean).join('\n') : r.draft.trim();
  if (!text.trim()) return false;
  r.answers = r.answers.filter((a) => a.qid !== q.id).concat({ qid: q.id, text, via, simpler: !!r.simpler[q.id], at: now() });
  r.draft = ''; r.form = { what: '', did: '', end: '' };
  if (r.qIndex + 1 < bank.questions.length) {
    r.qIndex += 1;
    // Changing answers before sending: the next saved answer comes back to edit.
    const prev = r.answers.find((a) => a.qid === bank.questions[r.qIndex].id);
    if (prev && prev.via !== 'FORM') r.draft = prev.text;
  }
  else {
    r.done = true; r.paused = null;
    if (r.mode === 'PRACTICE') { p.practicesDone += 1; emit(w, w.session.actor, 'practice.done', `PERSON:${pid}`, 'Finished a private practice interview. Not shared, not counted as proof.'); }
  }
  return true;
}

export function submitReal(w: World, pid: string) {
  const r = roomC(w, pid, 'REAL'); const bank = bankOfRoom(w, pid, 'REAL');
  if (!r.done || r.submitted) return null;
  r.submitted = { at: now(), receipt: uid('rcpt').toUpperCase(), status: 'SENT_SIMULATED' };
  emit(w, w.session.actor, 'interview.answers.submitted', `SHARED:${bank.orgId}:${pid}`, `Interview answers sent to ${bank.org} (simulated): ${r.answers.length} answers.`, { answers: r.answers.map((a) => ({ q: bank.questions.find((x) => x.id === a.qid)?.[a.simpler ? 'simpler' : 'text'], a: a.text, via: a.via })), status: 'SENT_SIMULATED' });
  return r.submitted;
}

/** Simple, private tips after practice. Not a score, never shown to anyone else. */
export function tipsFor(r: InterviewRoom): string[] {
  const tips = r.answers.map((a, i) => {
    const n = a.text.split(/\s+/).filter(Boolean).length;
    if (n < 8) return `Question ${i + 1}: short and clear. If you can, add one example: what happened and what you did.`;
    if (!/\b(i|we)\b/i.test(a.text)) return `Question ${i + 1}: good detail. Try saying “I did…” so it’s clear what you did yourself.`;
    return `Question ${i + 1}: clear. You said what you did. That’s what interviewers look for.`;
  });
  const body = (t: string) => t.replace(/^Question \d+: /, '');
  return tips.length > 1 && tips.every((t) => body(t) === body(tips[0])) ? [`All ${tips.length} answers: ${body(tips[0])}`] : tips;
}
export const isOffline = () => getWorld().network === 'offline';
