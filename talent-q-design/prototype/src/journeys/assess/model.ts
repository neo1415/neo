// ASSESS logic shared by the pages and Q (so every task works by button or by asking Q). Every change that matters is
// an audited event with a tenant or shared scope. Simulation is labelled: no real video, recording, code execution,
// log ingestion or provider call happens. Rules kept here, in code:
//   · a locked question is never reworded (Q may only add a follow-up beside it);
//   · Q's live suggestions go to the interviewer only, and the candidate is told Q is present;
//   · recording starts only after the candidate says yes; a "no" keeps the interview going, unrecorded;
//   · exercise results are self-reported until a person reviews them; declining is recorded as declined, never failed;
//   · interviewer coaching is about the interviewer's questions and process, never the candidate's face or voice;
//   · feedback reaches the candidate only when the employer shares it; unknown is never zero.
import type { Actor, Rating } from '../../state/domain';
import { canSeeCandidate, emit, now, uid, type World } from '../../mock/world';
import { assess, type AvatarRoom, type BankQ, type BankVersion, type Exercise, type FeedbackShare, type InterviewPlan, type LiveRoom, type QuestionBank, type Turn } from '../../state/areas/assess';
import { approvedVersion, putRating, ratingsOf, rubricFor } from '../../state/areas/rubrics';
import { proof } from '../../state/areas/proof';
import { cellFor, followUpsFor, isVague, LEVEL_VALUE, questionsFor, reqLabel, reqsOf } from '../hire-b/model';
import { startSample, submitSample, reviewSample, declineSample } from '../evidence/ops';

export const fmtDay = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = (s: string) => new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
export const actorFirst = (w: World, id: string) => w.actors.find((a) => a.id === id)?.first ?? id;
export const actorName = (w: World, id: string) => w.actors.find((a) => a.id === id)?.name ?? id;
export const personName = (w: World, pid: string) => w.people.find((p) => p.personId === pid)?.name ?? pid;
/** First name, except where a recruiter shares it (Seyi Okoro vs Seyi Balogun). */
export const personFirst = (w: World, pid: string) => { const n = personName(w, pid); const f = n.split(' ')[0]; return w.actors.some((a) => a.side === 'recruiter' && a.first === f) ? n : f; };
export const orgName = (w: World, id: string) => w.orgs.find((o) => o.id === id)?.name ?? id;
export const roleTitle = (w: World, mandateId: string) => (mandateId === 'm_backend' ? w.mandate.title : w.mandates.find((m) => m.id === mandateId)?.title ?? 'the role');
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const org = (a: Actor) => `ORG:${a.orgId}`;

// =====================================================================================================
// Question bank (SC-095, V14)
// =====================================================================================================
export const banksOf = (w: World, orgId?: string) => assess(w).banks.filter((b) => b.orgId === orgId);
export const bankFor = (w: World, mandateId: string, orgId?: string) => assess(w).banks.find((b) => b.mandateId === mandateId && b.orgId === orgId);
export const lockedOf = (b: QuestionBank) => [...b.versions].reverse().find((v) => v.state === 'LOCKED');
export const draftOf = (b: QuestionBank) => b.versions.find((v) => v.state === 'DRAFT');
export const canEdit = (b: QuestionBank, a: Actor) => a.orgId === b.orgId && b.editors.includes(a.id);
export const canManage = (b: QuestionBank, a: Actor) => a.orgId === b.orgId && (b.owner === a.id || a.role === 'ADMIN' || a.role === 'OWNER');

/** Fairness screen for any question that enters a bank or is asked live. Returns why it can't be used, or a leading flag. */
const PROTECTED: [RegExp, string, string][] = [
  [/\b(how old|your age|age are you|born in|year of birth|retire)\b/, 'It asks about age, a protected characteristic.', 'Ask about the experience the role needs, e.g. “Tell me about the largest system you’ve run.”'],
  [/\b(children|kids|pregnan|married|marriage|husband|wife|family plans?)\b/, 'It asks about family or marital status, a protected characteristic.', 'If the role has on-call duties, describe the rota and ask “Can you meet this rota?”'],
  [/\b(religio|church|mosque|pray|faith)\b/, 'It asks about religion, a protected characteristic.', 'Ask only about availability the job really needs, stated plainly.'],
  [/\b(originally from|where are you from|tribe|ethnic|nationality|native (english )?speaker|accent)\b/, 'It asks about origin, ethnicity or accent, or a proxy for them.', 'If the job needs clear written English, ask for a short written explanation and judge its content.'],
  [/\b(disab|health condition|medical|sick days?)\b/, 'It asks about health or disability.', 'Ask whether they need any adjustment for the interview, without asking why.'],
];
const LEADING = /\b(right\?|wouldn'?t you|wouldn’t you|don'?t you|don’t you|isn'?t it|isn’t it|surely|you probably|i assume you|you'?d agree|you’d agree|correct\?)/i;
export function screenQuestion(text: string): { why: string; instead: string } | null {
  const t = text.toLowerCase();
  for (const [re, why, instead] of PROTECTED) if (re.test(t)) return { why, instead };
  return null;
}
export function leadingOf(text: string): string | null {
  if (!LEADING.test(text)) return null;
  return 'It suggests the answer you want. Ask it open: “How do you …?” or “Tell me about a time …”.';
}

/** The simulated file a recruiter "uploads" (nothing is read from the device). One question per line: text | tags. */
export const SAMPLE_FILE = { name: 'kora-backend-round2.csv', text: [
  'How do you make a payment request safe to retry? Where do you keep track of it? | payments, go, must-have',
  'Walk me through a schema change you shipped to a large Postgres table without downtime. | postgres, must-have',
  'You’d agree idempotency matters most in payments, right? | payments',
  'What did you change after the last incident you were part of? | on-call',
  'Are you planning to have children in the next few years? | culture',
].join('\n') };
const TAG_REQ: [RegExp, string][] = [[/payment|reconcil/, 'r1'], [/\bgo\b|golang/, 'r2'], [/postgres|sql|database/, 'r3'], [/on-?call|incident/, 'r4'], [/mentor/, 'r5']];
const reqOfTags = (tags: string[], text: string) => TAG_REQ.find(([re]) => tags.some((t) => re.test(t)))?.[1] ?? TAG_REQ.find(([re]) => re.test(text.toLowerCase()))?.[1];

/** The editable draft, created from the locked version on first change. */
function ensureDraft(a: Actor, b: QuestionBank): BankVersion {
  const d = draftOf(b); if (d) return d;
  const base = lockedOf(b);
  const nv: BankVersion = { v: (b.versions.at(-1)?.v ?? 0) + 1, state: 'DRAFT', questions: structuredClone(base?.questions ?? []), at: now(), by: a.id, note: '' };
  b.versions.push(nv); return nv;
}
export type Res = { ok: boolean; say: string };
const no = (say: string): Res => ({ ok: false, say });

export function uploadQuestions(w: World, a: Actor, bankId: string, text = SAMPLE_FILE.text, file = SAMPLE_FILE.name): Res {
  const b = assess(w).banks.find((x) => x.id === bankId); if (!b || b.orgId !== a.orgId) return no('That question bank isn’t available to you.');
  if (!canEdit(b, a)) return no(`Only ${b.editors.map((e) => actorFirst(w, e)).join(' and ')} can change this bank. You can read it and use the locked version.`);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const accepted: string[] = []; const rejected: { line: string; why: string; instead?: string }[] = [];
  const d = ensureDraft(a, b);
  for (const line of lines) {
    const [q, tagStr = ''] = line.split('|').map((x) => x.trim());
    if (!q || q.length < 12) { rejected.push({ line, why: 'Too short to be a question.' }); continue; }
    const bad = screenQuestion(q); if (bad) { rejected.push({ line: q, why: bad.why, instead: bad.instead }); continue; }
    const lead = leadingOf(q); if (lead) { rejected.push({ line: q, why: `Leading question. ${lead}` }); continue; }
    if (d.questions.some((x) => x.text.toLowerCase() === q.toLowerCase())) { rejected.push({ line: q, why: 'Already in the bank.' }); continue; }
    const tags = tagStr.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    d.questions.push({ id: uid('bq'), text: q, tags, reqId: reqOfTags(tags, q) }); accepted.push(q);
  }
  b.upload = { file, at: now(), by: a.id, accepted, rejected };
  b.log.unshift({ at: now(), by: a.id, text: `Uploaded ${file}: ${accepted.length} added to draft v${d.v}, ${rejected.length} not added.` });
  emit(w, a.id, 'questions.uploaded', org(a), `${a.first} uploaded ${file} to “${b.title}”: ${accepted.length} added to draft v${d.v}, ${rejected.length} not added (simulated upload).`, { bankId, v: d.v });
  return { ok: true, say: `I read ${lines.length} lines from ${file} (simulated upload). ${accepted.length} went into draft v${d.v}. ${rejected.length ? `${rejected.length} didn’t: ${rejected.map((r) => r.why.split('.')[0].toLowerCase()).join('; ')}.` : ''} Nothing is in use until you lock the draft.` };
}
export function addQuestion(w: World, a: Actor, bankId: string, text: string, tags: string[] = []): Res {
  const b = assess(w).banks.find((x) => x.id === bankId); if (!b || b.orgId !== a.orgId) return no('That question bank isn’t available to you.');
  if (!canEdit(b, a)) return no(`Only ${b.editors.map((e) => actorFirst(w, e)).join(' and ')} can change this bank.`);
  const bad = screenQuestion(text); if (bad) return no(`I can’t add that. ${bad.why} Instead: ${bad.instead}`);
  const lead = leadingOf(text); if (lead) return no(`That’s a leading question. ${lead}`);
  const d = ensureDraft(a, b); d.questions.push({ id: uid('bq'), text, tags, reqId: reqOfTags(tags, text) });
  b.log.unshift({ at: now(), by: a.id, text: `Added a question to draft v${d.v}.` });
  return { ok: true, say: `Added to draft v${d.v}. It’s not used in interviews until the draft is locked.` };
}
export function removeQuestion(w: World, a: Actor, bankId: string, qid: string): Res {
  const b = assess(w).banks.find((x) => x.id === bankId); if (!b || !canEdit(b, a)) return no('You can’t change this bank.');
  const d = ensureDraft(a, b); const q = d.questions.find((x) => x.id === qid); if (!q) return no('That question isn’t in the draft.');
  d.questions = d.questions.filter((x) => x.id !== qid);
  b.log.unshift({ at: now(), by: a.id, text: `Removed “${q.text.slice(0, 48)}…” from draft v${d.v}.` });
  return { ok: true, say: 'Removed from the draft.' };
}
export function lockBank(w: World, a: Actor, bankId: string): Res {
  const b = assess(w).banks.find((x) => x.id === bankId); if (!b || b.orgId !== a.orgId) return no('That question bank isn’t available to you.');
  if (!canEdit(b, a)) return no(`Only ${b.editors.map((e) => actorFirst(w, e)).join(' and ')} can lock this bank.`);
  const d = draftOf(b); if (!d) return no(`There’s no draft to lock. v${lockedOf(b)?.v ?? 1} is already locked.`);
  if (!d.questions.length) return no('The draft is empty. Add at least one question first.');
  const prev = lockedOf(b); if (prev) prev.state = 'SUPERSEDED';
  Object.assign(d, { state: 'LOCKED', lockedBy: a.id, lockedAt: now(), note: d.note || `Locked by ${a.first}` });
  b.log.unshift({ at: now(), by: a.id, text: `Locked v${d.v} (${d.questions.length} questions). v${prev?.v ?? '–'} kept for the record.` });
  emit(w, a.id, 'questions.locked', org(a), `${a.first} locked v${d.v} of “${b.title}” (${d.questions.length} questions). Interviews planned from now on use v${d.v}; plans already made keep v${prev?.v}.`, { bankId, v: d.v });
  return { ok: true, say: `Locked v${d.v}: ${d.questions.length} questions, word for word. New plans use it; plans already made keep v${prev?.v ?? 1}, so no one is judged on a moving target.` };
}
export function discardDraft(w: World, a: Actor, bankId: string): Res {
  const b = assess(w).banks.find((x) => x.id === bankId); if (!b || !canEdit(b, a)) return no('You can’t change this bank.');
  const d = draftOf(b); if (!d) return no('There’s no draft.');
  b.versions = b.versions.filter((v) => v !== d); b.upload = undefined;
  b.log.unshift({ at: now(), by: a.id, text: `Discarded draft v${d.v}.` });
  return { ok: true, say: `Draft v${d.v} discarded. v${lockedOf(b)?.v} stays locked.` };
}
export function setEditor(w: World, a: Actor, bankId: string, actorId: string, on: boolean): Res {
  const b = assess(w).banks.find((x) => x.id === bankId); if (!b) return no('That bank isn’t available.');
  if (!canManage(b, a)) return no(`Only ${actorFirst(w, b.owner)} (the owner) or an admin decides who can edit.`);
  const t = w.actors.find((x) => x.id === actorId && x.orgId === b.orgId); if (!t) return no('They’re not in your organisation.');
  if (!on && actorId === b.owner) return no('The owner always keeps edit rights.');
  b.editors = on ? [...new Set([...b.editors, actorId])] : b.editors.filter((x) => x !== actorId);
  b.log.unshift({ at: now(), by: a.id, text: `${on ? 'Gave' : 'Removed'} edit rights ${on ? 'to' : 'from'} ${t.first}.` });
  emit(w, a.id, 'questions.editors', org(a), `${a.first} ${on ? 'let' : 'stopped'} ${t.first} ${on ? 'edit' : 'editing'} “${b.title}”.`);
  return { ok: true, say: `${t.first} ${on ? 'can now edit drafts and lock new versions' : 'can read the bank but not change it'}.` };
}
export function bankDiff(a: BankVersion | undefined, b: BankVersion): { added: BankQ[]; removed: BankQ[] } {
  const ta = new Set((a?.questions ?? []).map((q) => q.text)); const tb = new Set(b.questions.map((q) => q.text));
  return { added: b.questions.filter((q) => !ta.has(q.text)), removed: (a?.questions ?? []).filter((q) => !tb.has(q.text)) };
}

// ---------- Interview plan (MO-018) ----------
export function buildPlan(w: World, a: Actor, interviewId: string): InterviewPlan | null {
  const iv = w.interviews.find((i) => i.id === interviewId && i.orgId === a.orgId); if (!iv) return null;
  const b = bankFor(w, iv.mandateId, iv.orgId); const lv = b && lockedOf(b);
  const fromQ = questionsFor(w, iv.personId);
  const cards = reqsOf(w).map((r) => {
    const locked = (lv?.questions ?? []).filter((q) => q.reqId === r.reqId).map((q) => ({ id: q.id, text: q.text, locked: true, why: `Locked in v${lv!.v}: asked word for word.` }));
    const q = fromQ.find((x) => x.reqId === r.reqId);
    const qs = locked.length ? locked : q ? [{ id: q.id, text: q.text, locked: false, why: `Q suggested (not in the locked bank). ${q.why}` }] : [];
    return { reqId: r.reqId, label: r.label, mustHave: r.mustHave, level: cellFor(w, iv.personId, r.reqId).level, qs };
  }).sort((x, y) => Number(y.mustHave) - Number(x.mustHave) || LEVEL_VALUE[x.level as keyof typeof LEVEL_VALUE] - LEVEL_VALUE[y.level as keyof typeof LEVEL_VALUE]);
  const plan: InterviewPlan = { interviewId, bankId: b?.id ?? '', v: lv?.v ?? 0, at: now(), by: a.id, cards };
  assess(w).plans[interviewId] = plan;
  emit(w, a.id, 'interview.plan_ready', org(a), `${a.first} built the question plan for ${personFirst(w, iv.personId)}’s interview from ${lv ? `locked bank v${lv.v}` : 'Q’s suggestions (no locked bank)'}.`, { interviewId });
  return plan;
}

// =====================================================================================================
// Live room (SC-103, MO-023)
// =====================================================================================================
export const roomOf = (w: World, id: string): LiveRoom => (assess(w).rooms[id] ??= { interviewId: id, state: 'LOBBY', consent: { told: false, recording: 'NOT_ASKED' }, candidateJoined: false, recording: 'OFF', panel: 'OPEN', turns: [], suggestions: [], excerpts: [] });
export const readRoom = (w: World, id: string): LiveRoom | undefined => assess(w).rooms[id];
export const ivOf = (w: World, id: string) => w.interviews.find((i) => i.id === id);
/** The candidate's live interviews they can join (they always see that Q is present before joining). */
export const myLive = (w: World, pid?: string) => w.interviews.filter((i) => i.personId === pid && assess(w).rooms[i.id] && assess(w).rooms[i.id].state !== 'ENDED');

/** What Tobi says (simulated) when the interviewer asks about each requirement: first answers, then follow-up answers. */
const SCRIPT: Record<string, string[]> = {
  r1: ['At Lumen we get settlement files from three processors, about four million lines a day. One morning a processor resent a whole day. Because each chunk has an idempotency key, I re-ran just that day and nothing was counted twice.', 'Finance noticed within fifteen minutes; before the service it took about three days.'],
  r2: ['I run a Go worker that reads settlement files in chunks of ten thousand rows. We watch queue lag and error rate, and it pages at fifteen minutes of lag.', 'We watch p99 latency per chunk and the exceptions count; lag over fifteen minutes pages whoever is on call.'],
  r3: ['The daily exceptions report took nine seconds on a two hundred million row table. I moved the settlement date out of a JSON column, partitioned by month and added an index, and it dropped to about 140 milliseconds on a copy.', 'About two hundred million rows; we archive partitions after ninety days.'],
  r4: ['We had an outage in March and the team handled it. We worked on it together and fixed things.', 'I was on call that night. I paged the processor, switched matching to the backup file feed within twenty minutes, and wrote the post-mortem the next morning. We added an alert for a missing file after thirty minutes.'],
  r5: ['I help newer engineers with code reviews, kind of informally.', 'One junior engineer: we paired weekly for three months, and she now runs the nightly matcher on her own.'],
};
const GENERIC = 'I’d need a moment to think about that one. Could you say a bit more about what you’re looking for?';

export function scriptedAnswer(room: LiveRoom, reqId?: string) {
  if (!reqId || !SCRIPT[reqId]) return GENERIC;
  const n = room.turns.filter((t) => t.who === 'CAND' && t.reqId === reqId).length;
  return SCRIPT[reqId][Math.min(n, SCRIPT[reqId].length - 1)];
}

export function liveOp(w: World, a: Actor, id: string, kind: string, args: Record<string, unknown> = {}): Res | void {
  const iv = ivOf(w, id); if (!iv) return no('That interview isn’t available.');
  const r = roomOf(w, id);
  const sys = (text: string) => r.turns.push({ id: uid('t'), who: 'SYS', text, at: now(), recorded: r.recording === 'ON' });
  const isCand = a.personId === iv.personId;
  if (!isCand && a.orgId !== iv.orgId) return no('That interview isn’t available.');
  if (isCand && !['join', 'consent', 'answer'].includes(kind)) return no('Only the interviewers control the room.');
  if (!isCand && !iv.panel.includes(a.id) && !['excerpt', 'unexcerpt'].includes(kind)) return no('You’re not on this interview’s panel, so you can’t run the room.');
  const scope = `SHARED:${iv.orgId}:${iv.personId}`;
  switch (kind) {
    case 'join': // candidate: always told Q is present first
      r.consent.told = true; r.candidateJoined = true; sys(`${personFirst(w, iv.personId)} joined. They were told Q is present for the interviewer and doesn’t score them.`);
      emit(w, a.id, 'interview.live.joined', scope, `${personFirst(w, iv.personId)} joined the live interview room${isCand ? '' : ' (simulated)'}.`, { id }); return;
    case 'ask-consent': if (r.consent.recording === 'YES') return; r.consent.recording = 'PENDING'; sys('Recording consent requested. Nothing is recorded until the candidate says yes.'); return;
    case 'consent': {
      const yes = !!args.yes; r.consent.recording = yes ? 'YES' : 'NO'; r.consent.at = now(); if (!yes) r.recording = 'OFF';
      sys(yes ? `${personFirst(w, iv.personId)} agreed to recording.` : `${personFirst(w, iv.personId)} said no to recording. The interview carries on; only the interviewer’s own notes are kept.`);
      emit(w, a.id, yes ? 'interview.recording.consented' : 'interview.recording.declined', scope, yes ? 'Recording consent given.' : 'Recording declined. Declining is not held against anyone.', { id }); return;
    }
    case 'start': if (!r.candidateJoined) return no(`${personFirst(w, iv.personId)} hasn’t joined yet.`); r.state = 'LIVE'; r.startedAt ??= now(); sys('Interview started.'); return;
    case 'record': {
      const on = args.on !== false;
      if (on && r.consent.recording !== 'YES') return no('Recording needs the candidate’s yes first.');
      r.recording = on ? 'ON' : 'PAUSED'; sys(on ? 'Recording on.' : 'Recording paused.'); return;
    }
    case 'ask': {
      if (r.state !== 'LIVE') return no('Start the interview first.');
      const text = String(args.text ?? '').trim(); if (!text) return;
      const bad = screenQuestion(text); if (bad) return no(`Don’t ask that. ${bad.why} ${bad.instead}`);
      const reqId = args.reqId ? String(args.reqId) : undefined;
      r.turns.push({ id: uid('t'), who: 'INT', by: a.id, text, at: now(), reqId, qid: args.qid ? String(args.qid) : undefined, recorded: r.recording === 'ON', leading: leadingOf(text) ?? undefined });
      r.awaiting = reqId ?? 'any';
      r.suggestions.forEach((s) => { if (s.state === 'NEW' && s.reqId === reqId && s.text === text) s.state = 'USED'; });
      return;
    }
    case 'answer': {
      if (r.state !== 'LIVE' || !r.awaiting) return no('There’s no question waiting for an answer.');
      const reqId = r.awaiting === 'any' ? undefined : r.awaiting;
      const text = String(args.text ?? '').trim() || scriptedAnswer(r, reqId);
      r.turns.push({ id: uid('t'), who: 'CAND', text, at: now(), reqId, recorded: r.recording === 'ON', simulated: !args.text });
      r.awaiting = undefined;
      // MO-023: a follow-up suggestion when the answer is general. It goes to the interviewer's panel only.
      if (isVague(text)) {
        const bankFu = bankFor(w, iv.mandateId, iv.orgId)?.versions.flatMap((v) => v.questions).find((q) => q.reqId === reqId && q.followUp)?.followUp;
        const fu = [...(bankFu ? [bankFu] : []), ...followUpsFor(reqId, text)].filter((x, i, xs) => xs.indexOf(x) === i).slice(0, 2);
        for (const f of fu) if (!r.suggestions.some((s) => s.text === f && s.state === 'NEW')) r.suggestions.push({ id: uid('sg'), text: f, reqId, why: 'The answer was general: no specific situation, number or personal decision yet.', state: 'NEW', at: now() });
      }
      return;
    }
    case 'suggestion': {
      const s = r.suggestions.find((x) => x.id === args.sid); if (!s) return;
      if (args.use) { s.state = 'USED'; return liveOp(w, a, id, 'ask', { text: s.text, reqId: s.reqId }); }
      s.state = 'DISMISSED'; return;
    }
    case 'panel': r.panel = r.panel === 'OPEN' ? 'HIDDEN' : 'OPEN'; return;
    case 'drop': if (r.state !== 'LIVE') return; r.state = 'INTERRUPTED'; if (r.recording === 'ON') r.recording = 'PAUSED'; sys('Connection lost. Everything so far is kept; recording paused.'); return;
    case 'resume': if (r.state !== 'INTERRUPTED') return; r.state = 'LIVE'; sys('Reconnected. Carrying on where you left off. Recording stays paused until you turn it back on.'); return;
    case 'end': {
      r.state = 'ENDED'; r.endedAt = now(); if (r.recording === 'ON') r.recording = 'OFF'; r.awaiting = undefined; sys('Interview ended.');
      emit(w, a.id, 'interview.live.ended', `ORG:${iv.orgId}`, `${a.first} ended the live interview with ${personFirst(w, iv.personId)}: ${r.turns.filter((t) => t.who === 'INT').length} questions asked${r.consent.recording === 'YES' ? ', recorded parts kept as a transcript' : ', not recorded'}.`, { id });
      return { ok: true, say: 'Ended. The transcript (recorded parts only), your score review and your private coaching are ready.' };
    }
    case 'excerpt': {
      const t = r.turns.find((x) => x.id === args.turnId); if (!t || !t.recorded || t.who !== 'CAND') return no('Only recorded answers can be used as evidence.');
      const reqId = String(args.reqId ?? t.reqId ?? ''); if (!reqId) return no('Which requirement does it show?');
      if (r.excerpts.some((e) => e.turnId === t.id && e.reqId === reqId)) return;
      r.excerpts.push({ id: uid('ex'), turnId: t.id, reqId, by: a.id, at: now() });
      emit(w, a.id, 'interview.excerpt', `ORG:${iv.orgId}`, `${a.first} marked an answer as evidence for ${reqLabel(w, reqId)}.`, { id }); return;
    }
    case 'unexcerpt': r.excerpts = r.excerpts.filter((e) => e.id !== args.eid); return;
  }
}
/** Which recorded turns the viewer may read. Candidates read their own transcript; the employer reads only recorded parts,
 *  and only the panel and the role's recruiter (not the whole organisation). */
export function transcriptFor(w: World, a: Actor, id: string): { allowed: boolean; reason?: string; turns: Turn[]; gaps: number } {
  const iv = ivOf(w, id); const r = readRoom(w, id);
  if (!iv || !r) return { allowed: false, reason: 'missing', turns: [], gaps: 0 };
  const own = a.personId === iv.personId;
  if (!own && (a.orgId !== iv.orgId)) return { allowed: false, reason: 'missing', turns: [], gaps: 0 };
  if (!own && !iv.panel.includes(a.id) && a.role !== 'RECRUITER') return { allowed: false, reason: 'panel', turns: [], gaps: 0 };
  if (r.consent.recording !== 'YES') return { allowed: true, reason: 'not-recorded', turns: [], gaps: 0 };
  const turns = r.turns.filter((t) => t.recorded && t.who !== 'SYS');
  return { allowed: true, turns, gaps: r.turns.filter((t) => !t.recorded && t.who !== 'SYS').length };
}

// =====================================================================================================
// Score review (MO-026) — through the shared rubric model (rubrics.ts). Unknown is never zero.
// =====================================================================================================
const specific = (t: string) => !isVague(t) && words(t) >= 12;
export interface ProposedFromInterview { criterionId: string; label: string; reqId: string; rating: 0 | 1 | 2 | 3 | 4; uncertainty: 'LOW' | 'MEDIUM' | 'HIGH'; quote: string; note: string; existing?: Rating }
export function fromInterview(w: World, id: string): { list: ProposedFromInterview[]; unknown: { id: string; label: string }[]; rubricV?: number } {
  const iv = ivOf(w, id); const r = readRoom(w, id); if (!iv || !r) return { list: [], unknown: [] };
  const ver = approvedVersion(w, iv.mandateId); const rub = rubricFor(w, iv.mandateId); if (!ver || !rub) return { list: [], unknown: [] };
  const crit = ver.criteria.filter((c) => c.kind !== 'COMPATIBILITY' && c.kind !== 'ELIGIBILITY' && c.weight > 0);
  const have = ratingsOf(w, rub.id, ver.v, iv.personId);
  const list: ProposedFromInterview[] = [];
  for (const c of crit) {
    const ex = r.excerpts.filter((e) => e.reqId === c.requirementId).map((e) => r.turns.find((t) => t.id === e.turnId)!).filter(Boolean);
    if (!ex.length) continue;
    const best = ex.find((t) => specific(t.text)) ?? ex[0]; const good = specific(best.text);
    list.push({ criterionId: c.id, label: c.label, reqId: c.requirementId!, rating: good ? 3 : 1, uncertainty: good ? 'MEDIUM' : 'HIGH', quote: best.text,
      note: good ? 'A specific example with numbers and their own decisions, said in the interview. One answer, not a work sample.' : 'A general answer: no specific situation or personal decision yet.', existing: have.find((x) => x.criterionId === c.id) });
  }
  return { list, unknown: crit.filter((c) => !list.some((x) => x.criterionId === c.id) && !have.some((x) => x.criterionId === c.id)).map((c) => ({ id: c.id, label: c.label })), rubricV: ver.v };
}
export function proposeInterviewRatings(w: World, a: Actor, id: string): Res {
  const iv = ivOf(w, id); if (!iv || iv.orgId !== a.orgId) return no('That interview isn’t available.');
  const rub = rubricFor(w, iv.mandateId); const ver = approvedVersion(w, iv.mandateId);
  if (!rub || !ver) return no(`There’s no approved rubric for ${roleTitle(w, iv.mandateId)} yet, so nothing can be rated. Approve one in the evaluation studio first.`);
  const p = fromInterview(w, id); let n = 0;
  for (const x of p.list) {
    if (x.existing && (x.existing.reviewed || x.existing.source === 'REVIEWER')) continue;
    if (x.existing && x.existing.refs.some((ref) => !ref.evidenceId.startsWith('iv_'))) continue; // never replaces a rating from shared evidence
    putRating(w, { id: uid('rt'), rubricId: rub.id, v: ver.v, personId: iv.personId, criterionId: x.criterionId, rating: x.rating, uncertainty: x.uncertainty, refs: [{ evidenceId: `iv_${id}`, quote: x.quote }], note: `From the interview: ${x.note}`, source: 'Q_PROPOSED', by: 'q', at: now(), reviewed: false }); n++;
  }
  if (!n) return no(p.list.length ? 'Those criteria already have ratings from shared evidence or a reviewer; I didn’t replace them.' : 'Mark at least one recorded answer as evidence first. Criteria without evidence stay unknown, not zero.');
  emit(w, a.id, 'interview.ratings.proposed', `ORG:${iv.orgId}`, `Q proposed ${n} rating${n === 1 ? '' : 's'} for ${personFirst(w, iv.personId)} from interview excerpts (rubric v${ver.v}). A person reviews them.`, { id });
  return { ok: true, say: `I proposed ${n} rating${n === 1 ? '' : 's'} from the marked answers. Read what’s uncertain first, then confirm or change each one.` };
}
export function confirmRating(w: World, a: Actor, ratingId: string): Res {
  const { rubrics } = { rubrics: (w.areas.rubrics as { ratings: Rating[] }) };
  const r = rubrics.ratings.find((x) => x.id === ratingId); if (!r) return no('That rating isn’t there any more.');
  r.reviewed = true; r.by = a.id; r.at = now();
  emit(w, a.id, 'rubric.rating.reviewed', `ORG:${a.orgId}`, `${a.first} confirmed a rating (${r.criterionId}, ${r.rating} of 4) after reading its uncertainty.`);
  return { ok: true, say: 'Confirmed.' };
}

// =====================================================================================================
// Candidate feedback (SC-107): drafted by Q, chosen by the employer, shared only when they say so.
// =====================================================================================================
export function draftCandidateFeedback(w: World, id: string): FeedbackShare | null {
  const iv = ivOf(w, id); const r = readRoom(w, id); if (!iv || !r) return null;
  const ex = r.excerpts.map((e) => ({ e, t: r.turns.find((x) => x.id === e.turnId)! })).filter((x) => x.t);
  const strong = ex.filter((x) => specific(x.t.text)).map((x) => x.e.reqId).filter((v, i, a) => a.indexOf(v) === i);
  const weak = ex.filter((x) => !specific(x.t.text)).map((x) => x.e.reqId).filter((v, i, a) => a.indexOf(v) === i && !strong.includes(v));
  const unasked = reqsOf(w).filter((q) => q.mustHave && !r.turns.some((t) => t.who === 'INT' && t.reqId === q.reqId)).map((q) => q.reqId);
  return {
    interviewId: id, personId: iv.personId, orgId: iv.orgId, state: 'DRAFT', note: '',
    strengths: strong.map((q) => ({ id: `s_${q}`, text: `${reqLabel(w, q)}: you gave a specific example, with what you did yourself and the result.`, on: true })),
    routes: [
      ...weak.map((q) => ({ id: `r_${q}`, text: `${reqLabel(w, q)}: next time, pick one specific time and walk through it step by step: what happened, what you decided, what changed.`, on: true })),
      ...unasked.map((q) => ({ id: `u_${q}`, text: `${reqLabel(w, q)} wasn’t covered in this interview. That says nothing about you; it may come up in a next round.`, on: false })),
    ],
  };
}
export const feedbackOf = (w: World, id: string) => assess(w).feedback[id];
export function shareFeedback(w: World, a: Actor, id: string, patch?: Partial<FeedbackShare>): Res {
  const iv = ivOf(w, id); if (!iv || iv.orgId !== a.orgId) return no('That interview isn’t available.');
  const f = (assess(w).feedback[id] ??= draftCandidateFeedback(w, id)!); if (!f) return no('Run the interview first.');
  if (patch) Object.assign(f, patch);
  const items = [...f.strengths, ...f.routes].filter((x) => x.on);
  if (!items.length && !f.note.trim()) return no('Choose at least one point to share, or write a note.');
  f.state = 'SHARED'; f.sharedAt = now(); f.by = a.id;
  emit(w, a.id, 'interview.feedback.shared', `SHARED:${iv.orgId}:${iv.personId}`, `${a.first} shared interview feedback with ${personFirst(w, iv.personId)}: ${items.length} point${items.length === 1 ? '' : 's'}${f.note ? ' and a note' : ''}.`, { id });
  return { ok: true, say: `Shared with ${personFirst(w, iv.personId)}: ${items.length} point${items.length === 1 ? '' : 's'}. They see exactly what you approved, nothing else.` };
}
/** What the candidate may read: nothing until the employer shares, then only the points switched on. */
export function feedbackForCandidate(w: World, pid: string, id: string) {
  const f = assess(w).feedback[id]; if (!f || f.personId !== pid || f.state !== 'SHARED') return null;
  return { strengths: f.strengths.filter((x) => x.on), routes: f.routes.filter((x) => x.on), note: f.note, at: f.sharedAt!, by: f.by!, org: orgName(w, f.orgId) };
}

// =====================================================================================================
// Interviewer coaching (SC-109, V20). About the interviewer's own questions and process; private to them.
// =====================================================================================================
export interface Coaching { id: string; talk: { me: number; them: number; share: number }; leading: { text: string; why: string }[]; unasked: string[]; noFollowUp: string[]; offBank: number; usedSug: number; dismissedSug: number; asked: number }
export function coachingFor(w: World, a: Actor, id: string): Coaching | null {
  const iv = ivOf(w, id); const r = readRoom(w, id); if (!iv || !r || iv.orgId !== a.orgId) return null;
  const mine = r.turns.filter((t) => t.who === 'INT' && t.by === a.id); if (!mine.length) return null;
  const me = mine.reduce((s, t) => s + words(t.text), 0); const them = r.turns.filter((t) => t.who === 'CAND').reduce((s, t) => s + words(t.text), 0);
  const asked = new Set(r.turns.filter((t) => t.who === 'INT').map((t) => t.reqId));
  const vagueReqs = r.turns.filter((t) => t.who === 'CAND' && t.reqId && isVague(t.text)).map((t) => t.reqId!);
  const fuAfter = (req: string) => { const idx = r.turns.findIndex((t) => t.who === 'CAND' && t.reqId === req && isVague(t.text)); return r.turns.slice(idx + 1).some((t) => t.who === 'INT' && t.reqId === req); };
  const bank = bankFor(w, iv.mandateId, iv.orgId); const bankTexts = new Set(bank?.versions.flatMap((v) => v.questions.map((q) => q.text)) ?? []);
  return {
    id, asked: mine.length, talk: { me, them, share: me + them ? Math.round((100 * me) / (me + them)) : 0 },
    leading: mine.filter((t) => t.leading).map((t) => ({ text: t.text, why: t.leading! })),
    unasked: reqsOf(w).filter((q) => q.mustHave && !asked.has(q.reqId)).map((q) => q.label),
    noFollowUp: [...new Set(vagueReqs)].filter((q) => !fuAfter(q)).map((q) => reqLabel(w, q)),
    offBank: mine.filter((t) => !bankTexts.has(t.text) && !r.suggestions.some((s) => s.text === t.text)).length,
    usedSug: r.suggestions.filter((s) => s.state === 'USED').length, dismissedSug: r.suggestions.filter((s) => s.state === 'DISMISSED').length,
  };
}
/** Interviews this person interviewed in (coaching is theirs alone: a colleague's coaching is never listed). */
export const coachedInterviews = (w: World, a: Actor) => Object.values(assess(w).rooms).filter((r) => r.turns.some((t) => t.who === 'INT' && t.by === a.id) && ivOf(w, r.interviewId)?.orgId === a.orgId).map((r) => r.interviewId);

// =====================================================================================================
// Avatar room (SC-102). A simulated, labelled presenter reads the employer's locked questions; never mandatory.
// =====================================================================================================
export const AVATAR_COST = { perMinute: 0.35, minutes: 20, source: 'Sampled public overage price for a conversational-video provider (Tavus, 2026 research notes). Unverified: a hypothesis to confirm with the provider, not a quote.' };
const akey = (pid: string, orgId: string) => `${pid}:${orgId}`;
export const avatarOf = (w: World, pid: string, orgId: string): AvatarRoom | undefined => assess(w).avatar[akey(pid, orgId)];
export function avatarQuestions(w: World, pid: string, orgId: string): { qs: BankQ[]; v?: number; role: string } {
  const pipe = w.pipeline.find((p) => p.personId === pid && (p.mandateId === 'm_backend' ? orgId === 'org_kora' : w.mandates.find((m) => m.id === p.mandateId)?.orgId === orgId));
  const mandateId = pipe?.mandateId ?? 'm_backend';
  const b = bankFor(w, mandateId, orgId); const lv = b && lockedOf(b);
  return { qs: (lv?.questions ?? []).slice(0, 3), v: lv?.v, role: roleTitle(w, mandateId) };
}
export function avatarOp(w: World, a: Actor, orgId: string, kind: string, args: Record<string, unknown> = {}): Res | void {
  const pid = a.personId; if (!pid) return no('Only the candidate can take this interview.');
  const k = akey(pid, orgId);
  const r = (assess(w).avatar[k] ??= { personId: pid, orgId, step: 'CHOOSE', stillImage: false, captions: true, qIndex: 0, answers: [], draft: '' });
  const scope = `SHARED:${orgId}:${pid}`;
  const qs = avatarQuestions(w, pid, orgId).qs;
  switch (kind) {
    case 'choose': {
      const mode = args.mode as AvatarRoom['mode'];
      if (mode === 'AVATAR' && !assess(w).avatarSettings[orgId]?.enabled) return no(`${orgName(w, orgId)} hasn’t turned on the avatar option. Text, voice or a person all work.`);
      r.mode = mode;
      if (mode === 'HUMAN') { r.step = 'HUMAN_REQUESTED'; emit(w, a.id, 'interview.human_requested', scope, `${a.first} asked for this round with a person instead. That’s their choice to make and isn’t held against them.`); return { ok: true, say: `Done. ${orgName(w, orgId)} will offer you times with a person. Choosing this isn’t held against you.` }; }
      r.step = mode === 'AVATAR' ? (r.consentAt ? 'DEVICE' : 'CONSENT') : r.step === 'INTERRUPTED' ? 'INTERRUPTED' : 'LIVE';
      if (mode !== 'AVATAR') r.stillImage = true;
      return;
    }
    case 'consent': r.consentAt = now(); r.step = 'DEVICE'; emit(w, a.id, 'interview.avatar.consent', scope, `${a.first} agreed to the simulated avatar format. No camera; answers only.`); return;
    case 'device': r.device = args.slow ? 'SLOW' : 'OK'; r.stillImage = !!args.slow; if (args.go) r.step = 'LIVE'; return;
    case 'go': r.step = 'LIVE'; return;
    case 'lite': r.stillImage = !r.stillImage; return;
    case 'draft': r.draft = String(args.text ?? ''); return;
    case 'answer': {
      const t = (String(args.text ?? '') || r.draft).trim(); const q = qs[r.qIndex]; if (!t || !q) return no('Write or say an answer first.');
      r.answers = r.answers.filter((x) => x.qid !== q.id).concat({ qid: q.id, text: t, via: args.via === 'VOICE' ? 'VOICE' : 'TEXT' }); r.draft = '';
      if (r.qIndex + 1 < qs.length) r.qIndex += 1; else r.step = 'DONE';
      return;
    }
    case 'drop': if (r.step === 'LIVE') r.step = 'INTERRUPTED'; return;
    case 'resume': if (r.step === 'INTERRUPTED') r.step = 'LIVE'; return;
    case 'back': r.step = 'CHOOSE'; return;
    case 'submit': {
      if (r.step !== 'DONE' || r.submittedAt) return;
      r.submittedAt = now(); r.receipt = uid('rcpt').toUpperCase();
      emit(w, a.id, 'interview.avatar.submitted', scope, `${a.first} sent ${r.answers.length} answers from the ${r.mode === 'AVATAR' ? 'avatar' : r.mode === 'VOICE' ? 'voice' : 'text'} interview (simulated).`, { answers: r.answers.length });
      return { ok: true, say: `Sent to ${orgName(w, orgId)} (simulated). A person there reads your answers; the avatar doesn’t judge you.` };
    }
    case 'reset': delete assess(w).avatar[k]; return;
  }
}
export function setAvatarEnabled(w: World, a: Actor, on: boolean): Res {
  if (!a.orgId) return no('Only an employer can change this.');
  if (!['ADMIN', 'OWNER', 'RECRUITER'].includes(a.role ?? '')) return no('Only a recruiter or an admin can change the interview format.');
  assess(w).avatarSettings[a.orgId] = { enabled: on, at: now(), by: a.id };
  emit(w, a.id, 'interview.avatar.setting', org(a), `${a.first} turned the simulated avatar option ${on ? 'on' : 'off'}. Text, voice and a person stay available either way.`);
  return { ok: true, say: on ? 'The avatar option is on. Candidates can still choose text, voice or a person.' : 'The avatar option is off. Candidates choose text, voice or a person.' };
}

// =====================================================================================================
// Exercises (SC-111 code, SC-112 cyber incident, SC-113 customer conversation)
// =====================================================================================================
export const KIND_WORD = { CODE: 'Code exercise', CYBER: 'Incident investigation', SALES: 'Customer conversation' } as const;
export const exerciseOf = (w: World, id: string) => assess(w).exercises.find((e) => e.id === id);
export const exercisesFor = (w: World, a: Actor) => assess(w).exercises.filter((e) => (a.personId ? e.personId === a.personId : e.orgId === a.orgId));

export const STARTER_SQL = `-- Daily exceptions report. 9.1 s on a synthetic copy (200m rows).
SELECT processor, count(*)
FROM exceptions
WHERE (payload->>'settled_on')::date = DATE '2026-10-01'
GROUP BY processor;`;
/** The simulated test runner: it checks the shape of the change, it doesn't execute anything. */
export function runSql(code: string) {
  const c = code.toLowerCase().replace(/\s+/g, ' ');
  const where = c.split(' where ')[1] ?? '';
  const t1 = !/payload->>/.test(where) && /settled_on/.test(where);
  const t2 = /create index[^;]*\(\s*(processor\s*,\s*)?settled_on/.test(c) || /create index[^;]*\(\s*settled_on\s*(,\s*processor)?\s*\)/.test(c);
  const t3 = /group by processor/.test(c) && /count\(/.test(c);
  const ms = t1 && t2 ? 140 : t1 ? 2300 : 9100;
  return [
    { name: 'Filters on a real date column, not inside JSON', pass: t1, detail: t1 ? 'The filter can use an index.' : 'The date is still read out of the JSON payload on every row.' },
    { name: 'An index matches the filter', pass: t2, detail: t2 ? 'Index found on settled_on.' : 'No index on settled_on yet.' },
    { name: 'Returns the same rows as before', pass: t3, detail: t3 ? 'Same grouping and count.' : 'The grouping or the count changed.' },
    { name: 'Report runs in under 500 ms', pass: ms < 500, detail: `Planner estimate ${ms.toLocaleString('en-GB')} ms (simulated plan, not a real run).` },
  ];
}
export const LOGS = [
  { id: 'l1', t: '00:58:12', src: 'scheduler', lvl: 'INFO', msg: 'nightly-settlement job started (processor=Paystack, Flutterwave, Interswitch)' },
  { id: 'l2', t: '01:00:03', src: 'sftp-gw', lvl: 'WARN', msg: 'expected file IWS_20261029.csv not present; retry in 10m', key: true },
  { id: 'l3', t: '01:00:04', src: 'matcher', lvl: 'INFO', msg: 'Paystack: 1,402,118 lines read, 0 exceptions' },
  { id: 'l4', t: '01:04:40', src: 'auth', lvl: 'INFO', msg: 'user ngozi.e signed in from Lagos (MFA ok)' },
  { id: 'l5', t: '01:10:05', src: 'sftp-gw', lvl: 'WARN', msg: 'expected file IWS_20261029.csv not present; retry in 10m', key: true },
  { id: 'l6', t: '01:20:06', src: 'sftp-gw', lvl: 'ERROR', msg: 'IWS_20261029.csv still missing after 3 attempts; giving up', key: true },
  { id: 'l7', t: '01:20:07', src: 'matcher', lvl: 'INFO', msg: 'Interswitch: 0 lines read (no input). Marked complete.', key: true },
  { id: 'l8', t: '01:21:00', src: 'alerting', lvl: 'INFO', msg: 'no alert rules matched in the last 60m' , key: true },
  { id: 'l9', t: '07:42:31', src: 'support', lvl: 'WARN', msg: 'ticket #4471: merchant reports settlements missing for 29 Oct' },
  { id: 'l10', t: '07:55:10', src: 'firewall', lvl: 'INFO', msg: 'blocked 14 port scans from 3 addresses (routine)' },
];
export function checkCyber(e: Exercise) {
  const m = new Set(e.marked ?? []); const keys = LOGS.filter((l) => l.key).map((l) => l.id);
  const found = keys.filter((k) => m.has(k)).length; const noise = [...m].filter((k) => !keys.includes(k)).length;
  return [
    { name: 'Found the missing file and the give-up', pass: m.has('l2') && m.has('l6'), detail: `${found} of ${keys.length} key events marked.` },
    { name: 'Saw that the job still reported success', pass: m.has('l7'), detail: m.has('l7') ? 'Marked: “0 lines read … marked complete”.' : 'The “marked complete” line is the quiet part of this failure.' },
    { name: 'Noticed nothing alerted', pass: m.has('l8'), detail: m.has('l8') ? 'Marked the silent alerting line.' : 'No alert fired for a missing file.' },
    { name: 'Left routine noise out', pass: noise <= 1, detail: noise ? `${noise} routine event${noise === 1 ? '' : 's'} marked as relevant.` : 'Sign-ins and routine scans left out.' },
    { name: 'Wrote a cause and a first action', pass: (e.cause ?? '').trim().length > 10 && (e.action ?? '').trim().length > 10, detail: 'Your own words, read by a reviewer.' },
  ];
}
export const CUSTOMER = [
  'Hello? My shop’s money from yesterday hasn’t arrived. I have suppliers to pay this morning. What is going on?',
  'It’s Mama Ijeoma Stores. I don’t know any reference, I just see nothing in my account.',
  'So when will I get it? I can’t keep telling my supplier “soon”.',
  'OK. And if it doesn’t come by then?',
];
const CONV_RUBRIC = [
  { name: 'Acknowledges the worry before explaining', re: /\b(sorry|understand|i hear|worrying|stressful|frustrat)/ },
  { name: 'Asks for what’s needed to find the payment', re: /\b(merchant id|business name|phone|reference|email|account|which|what is|can you (tell|share))\b|\?/ },
  { name: 'Says what happens next, with a time', re: /\b(\d+\s?(am|pm|minutes?|hours?)|by (today|tomorrow|noon|\d)|within|this morning|before)\b/ },
  { name: 'Doesn’t promise what it can’t control', re: null as RegExp | null },
];
const OVERPROMISE = /\b(guarantee|definitely|100%)|(?<!(can’t|cannot|can't|not|won’t|won't) )\bpromise\b/;
export function checkSales(e: Exercise) {
  const mine = (e.chat ?? []).filter((m) => m.who === 'ME').map((m) => m.text.toLowerCase()); const all = mine.join(' \n ');
  return CONV_RUBRIC.map((r) => r.re ? { name: r.name, pass: r.re.test(all), detail: r.re.test(all) ? 'Found in your replies.' : 'Not in your replies yet.' }
    : { name: r.name, pass: !OVERPROMISE.test(all), detail: OVERPROMISE.test(all) ? 'A reply promises an outcome the team can’t control.' : 'No promises beyond what you can do.' });
}
export const resultsOf = (e: Exercise) => (e.kind === 'CODE' ? (e.runs.at(-1)?.results ?? []) : e.kind === 'CYBER' ? checkCyber(e) : checkSales(e));

/** The open bounded-sample request from J12 this exercise can answer (same person, organisation and requirement). */
export const linkedReuse = (w: World, e: Exercise) => proof(w).reuse.find((d) => d.decision === 'BOUNDED_SAMPLE' && d.personId === e.personId && d.orgId === e.orgId && d.reqId === e.reqId && ['SENT', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED'].includes(d.state) && (!e.reuseId || d.id === e.reuseId));

export function exerciseOp(w: World, a: Actor, id: string, kind: string, args: Record<string, unknown> = {}): Res | void {
  const e = exerciseOf(w, id); if (!e) return no('That exercise isn’t available.');
  const cand = a.personId === e.personId; const rec = a.orgId === e.orgId;
  if (!cand && !rec) return no('That exercise isn’t available.');
  const scope = `SHARED:${e.orgId}:${e.personId}`;
  const open = e.state === 'ASSIGNED' || e.state === 'IN_PROGRESS';
  switch (kind) {
    case 'start': if (!cand || !open) return; e.state = 'IN_PROGRESS'; if (e.kind === 'CODE' && !e.code) e.code = STARTER_SQL; if (e.kind === 'SALES' && !e.chat) e.chat = [{ who: 'CUST', text: CUSTOMER[0], step: 0 }];
      { const d = linkedReuse(w, e); if (d && d.state === 'SENT') { startSample(w, a, d.id); e.reuseId = d.id; } }
      emit(w, a.id, 'exercise.started', scope, `${a.first} started “${e.title}” (simulated exercise).`, { id }); return;
    case 'code': if (cand && open) e.code = String(args.code ?? ''); return;
    case 'run': if (!cand || !open) return; e.runs.push({ at: now(), results: runSql(e.code ?? STARTER_SQL) }); return;
    case 'mark': if (!cand || !open) return; { const s = new Set(e.marked ?? []); const l = String(args.log); if (s.has(l)) s.delete(l); else s.add(l); e.marked = [...s]; } return;
    case 'notes': if (!cand || !open) return; if (args.cause !== undefined) e.cause = String(args.cause); if (args.action !== undefined) e.action = String(args.action); return;
    case 'say': {
      if (!cand || !open) return; const t = String(args.text ?? '').trim(); if (!t) return;
      const chat = (e.chat ??= []); chat.push({ who: 'ME', text: t });
      const step = chat.filter((m) => m.who === 'CUST').length;
      if (step < CUSTOMER.length) chat.push({ who: 'CUST', text: CUSTOMER[step], step });
      else if (!chat.some((m) => m.who === 'CUST' && m.step === 99)) chat.push({ who: 'CUST', text: 'Alright. Thank you for actually explaining it.', step: 99 });
      return;
    }
    case 'submit': {
      if (!cand || !open) return;
      const res = resultsOf(e); const passed = res.filter((r) => r.pass).length;
      const summary = e.kind === 'CODE' ? `Rewrote the report query and added an index; simulated runner: ${passed} of ${res.length} checks passed.` : e.kind === 'CYBER' ? `Marked ${e.marked?.length ?? 0} log events. Cause: ${e.cause}. First action: ${e.action}` : `Handled a ${CUSTOMER.length}-turn scripted customer conversation; ${passed} of ${res.length} conversation points present.`;
      e.state = 'SUBMITTED'; e.submittedAt = now(); e.summary = summary;
      const d = linkedReuse(w, e);
      if (d && ['SENT', 'IN_PROGRESS'].includes(d.state)) { if (d.state === 'SENT') startSample(w, a, d.id); submitSample(w, a, d.id, summary); e.reuseId = d.id; e.evidenceId = d.resultEvidenceId; }
      else {
        const evidenceId = `e_ex_${e.id}`;
        w.evidence = w.evidence.filter((x) => x.evidenceId !== evidenceId);
        w.evidence.push({ evidenceId, ownerId: e.personId, kind: 'WORK_SAMPLE', title: `${KIND_WORD[e.kind]}: ${e.title}`, source: `Talent Q exercise for ${orgName(w, e.orgId)} (simulated)`, observedAt: now().slice(0, 10), verified: false, verification: 'PENDING', origin: 'UPLOAD', shows: summary, limits: `A ${e.minutes}-minute simulated exercise on synthetic data. Self-reported until a reviewer at ${orgName(w, e.orgId)} looks at it.`, visibility: 'SHARED_WITH', sharedWith: [e.orgId] });
        if (e.reqId) proof(w).links.push({ evidenceId, reqId: e.reqId, note: `${KIND_WORD[e.kind]}, waiting for review`, v: 1, state: 'PROPOSED' });
        e.evidenceId = evidenceId;
      }
      emit(w, a.id, 'exercise.submitted', scope, `${a.first} submitted “${e.title}” (simulated). Self-reported until reviewed.`, { id });
      return { ok: true, say: `Sent to ${orgName(w, e.orgId)}. It shows as self-reported until a person there reviews it.` };
    }
    case 'decline': {
      if (!cand || !open) return; e.state = 'DECLINED'; e.whyDeclined = String(args.why ?? '') || undefined;
      const d = linkedReuse(w, e); if (d && ['SENT', 'IN_PROGRESS'].includes(d.state)) declineSample(w, a, d.id, e.whyDeclined ?? '');
      emit(w, a.id, 'exercise.declined', scope, `${a.first} declined “${e.title}”${e.whyDeclined ? `: ${e.whyDeclined}` : ''}. Recorded as declined, not as a failed result.`, { id });
      return { ok: true, say: 'Recorded as declined, not as a failed result.' };
    }
    case 'review': {
      if (!rec || e.state !== 'SUBMITTED') return no('Only a submitted exercise can be reviewed.');
      if (e.orgId === 'org_kora' && !canSeeCandidate(w, e.personId, e.orgId) && !w.evidence.some((x) => x.evidenceId === e.evidenceId)) return no('That exercise isn’t available.');
      const outcome = (args.outcome as 'SHOWS_IT' | 'PARTLY' | 'NOT_SHOWN') ?? 'PARTLY'; const note = String(args.note ?? '').trim();
      if (!note) return no('Add a short note on what it showed. It’s kept with the result.');
      const share = !!args.share;
      const d = e.reuseId ? proof(w).reuse.find((x) => x.id === e.reuseId) : undefined;
      if (d && d.state === 'SUBMITTED') reviewSample(w, a, d.id, outcome, note, share);
      else {
        const ev = w.evidence.find((x) => x.evidenceId === e.evidenceId);
        if (ev) { ev.verified = outcome !== 'NOT_SHOWN'; ev.verification = outcome === 'NOT_SHOWN' ? 'UNVERIFIED' : 'VERIFIED'; ev.origin = 'REVIEW'; ev.source = `${ev.source.replace(' (simulated)', '')}, reviewed by ${a.name} (simulated)`; ev.limits = `${ev.limits.split(' Self-reported')[0]} Reviewer’s note: ${note}`; }
        const l = proof(w).links.find((x) => x.evidenceId === e.evidenceId && x.reqId === e.reqId); if (l) { l.state = outcome === 'NOT_SHOWN' ? 'DISPUTED' : 'REVIEWED'; l.partial = outcome === 'PARTLY'; l.note = note; }
        emit(w, a.id, 'exercise.reviewed', scope, `${a.first} reviewed ${personFirst(w, e.personId)}’s “${e.title}”: ${outcome === 'SHOWS_IT' ? 'shows it' : outcome === 'PARTLY' ? 'shows part of it' : 'didn’t show it'}. ${note}`, { id, outcome });
      }
      e.state = 'REVIEWED'; e.review = { outcome, note, by: a.id, at: now(), shared: share };
      return { ok: true, say: `Reviewed. It now counts as ${outcome === 'NOT_SHOWN' ? 'not shown (kept, not hidden)' : 'assessed'}${share ? `, and ${personFirst(w, e.personId)} can read your note` : `. Your note stays with ${orgName(w, e.orgId)} unless you share it`}.` };
    }
    case 'share-note': if (!rec || !e.review) return; e.review.shared = true; { const d = e.reuseId ? proof(w).reuse.find((x) => x.id === e.reuseId) : undefined; if (d) d.candidateNote = e.review.note; }
      emit(w, a.id, 'exercise.feedback.shared', scope, `${a.first} shared the reviewer’s note on “${e.title}” with ${personFirst(w, e.personId)}.`); return { ok: true, say: 'Shared.' };
    case 'reset': if (!cand) return; Object.assign(e, { state: 'ASSIGNED', runs: [], code: undefined, marked: undefined, cause: undefined, action: undefined, chat: undefined }); return;
  }
}
