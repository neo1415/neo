// Q skills for T4 (Grace): plain explanations (including care-sector words), first steps, the resumable
// certificate upload, voice/text/form switching with an honest voice fallback, lite mode, "where was I",
// and the interview room (repeat, simpler words, pause, what the employer sees, send with approval).
// Everything here works by typing or speaking to the global Q, from any page, in imperfect language.
import { emit } from '../../mock/world';
import type { Actor, QAction } from '../../state/domain';
import { pushUndo, registerOp, registerSkill } from '../core/engine';
import { GLOSSARY, findTerm } from '../core/glossary';
import type { QCtx, QReply } from '../core/types';
import { personC, readPersonC, roomC } from '../../state/areas/talent-c';
import { kick, partsLine, resumeIn, uploadPct, whereLine, STEP_LABEL } from '../../journeys/talent-c/runtime';
import { bankOfRoom, current, qText, startRoom, submitReal } from '../../journeys/talent-c/interview';
import { bankFor, timeText, whenText } from '../../journeys/talent-c/questions';

const pidOf = (a: Actor) => a.personId ?? a.id;
const scope = (a: Actor) => `PERSON:${pidOf(a)}`;
const plainFor = (c: QCtx) => !!c.w.q.prefs[c.actor.id]?.plain;
const onInterview = (c: QCtx) => c.route.startsWith('/c/interview');

// ---------------- Plain words (one or two sentences), including care-sector terms ----------------
const PLAIN: Record<string, { plain: string; simpler: string }> = {
  evidence: { plain: 'Evidence means proof of what you did, like a certificate or a photo of your work.', simpler: 'Proof. For example, the photo of your first aid certificate is proof you did the course.' },
  passport: { plain: 'Your Evidence Passport is your private folder of proof about your work, like your certificates. You choose which employer can see each thing.', simpler: 'Think of it as a folder on your phone for your certificates. Nobody sees it unless you say yes.' },
  verified: { plain: 'Verified means someone checked it with whoever gave it to you. “Not checked yet” isn’t bad; it just hasn’t been checked.', simpler: 'Checked. Like calling the Red Cross to ask “did Grace really do this course?”' },
  practice: { plain: 'Practice is just for you. It never counts as proof, and employers never see it.', simpler: 'A try-out. Like rehearsing before the real thing. Nobody else sees it.' },
  consent: { plain: 'Consent means your permission. An employer sees nothing until you say yes, and you can take it back.', simpler: 'Your “yes”. Nothing is shared without it.' },
  claim: { plain: 'A claim is something you say about yourself, like “I worked 4 years”. It’s useful, but it isn’t proof until something backs it up.', simpler: 'Your own words about yourself. True, but not yet shown.' },
  gap: { plain: 'A gap is something a job asks for that you haven’t shown yet. It doesn’t mean you can’t do it.', simpler: 'Something you still need to show. Not something you can’t do.' },
  atlas: { plain: 'Your career atlas is a map of jobs you could move into next.', simpler: 'A map of possible next jobs.' },
  shortlist: { plain: 'A shortlist is the few people an employer wants to look at closely.', simpler: 'The small group an employer picks to talk to.' },
};
const CARE: { key: string; term: string; aliases: string[]; plain: string; simpler: string }[] = [
  { key: 'pending', term: 'Pending', aliases: ['pending', 'waiting for a check', 'issuer check'], plain: 'Pending means waiting. Your certificate is saved, and someone still has to check it with whoever gave it to you.', simpler: 'Waiting. Nothing is wrong.' },
  { key: 'lite', term: 'Lite mode', aliases: ['lite mode', 'lite', 'light mode'], plain: 'Lite mode makes the app use less data: fewer pictures, no moving parts and bigger buttons.', simpler: 'A lighter app for slow internet.' },
  { key: 'upload', term: 'Upload', aliases: ['upload', 'uploading'], plain: 'Upload means sending a photo or file from your phone to Talent Q. If your signal drops, it waits and carries on later.', simpler: 'Sending a photo from your phone.' },
  { key: 'issuer', term: 'Issuer', aliases: ['issuer'], plain: 'The issuer is whoever gave you the certificate, for example the Red Cross.', simpler: 'Who gave you the certificate.' },
  { key: 'simulated', term: 'Simulated', aliases: ['simulated', 'simulation'], plain: 'Simulated means pretend, for this demo. Nothing is really sent or checked.', simpler: 'Pretend, for practice.' },
  { key: 'employer', term: 'Employer', aliases: ['employer'], plain: 'The employer is the company that might hire you. Here, that’s Kora Pay.', simpler: 'The company that might give you the job.' },
  { key: 'room', term: 'Interview room', aliases: ['interview room'], plain: 'The interview room is the page where you answer the interview questions, by typing, speaking or a simple form, with no time limit.', simpler: 'The page with the questions.' },
  { key: 'safeguarding', term: 'Safeguarding', aliases: ['safeguarding', 'safe guarding'], plain: 'Safeguarding means keeping the people you care for safe from harm, and speaking up if something is wrong.', simpler: 'Keeping people safe and telling someone if they’re not.' },
  { key: 'handover', term: 'Handover', aliases: ['handover', 'hand over', 'hand-over'], plain: 'A handover is telling the next carer on shift what happened and what needs doing.', simpler: 'Passing on the news to the next shift.' },
  { key: 'careplan', term: 'Care plan', aliases: ['care plan'], plain: 'A care plan is the written plan for each person you look after: their needs, medicines and routine.', simpler: 'The plan for each person you look after.' },
  { key: 'check', term: 'Background check', aliases: ['background check', 'dbs', 'police check'], plain: 'A background check looks at your record. Some care jobs ask for one before you start.', simpler: 'A check of your record.' },
  { key: 'cert', term: 'Certificate', aliases: ['care certificate', 'certificate', 'cert'], plain: 'A certificate is a paper that shows you finished a course, like first aid. A photo of it is enough here.', simpler: 'The paper from your course.' },
  { key: 'receipt', term: 'Receipt', aliases: ['receipt'], plain: 'A receipt is a note that proves something was sent, with a reference number.', simpler: 'Proof it was sent.' },
  { key: 'reference', term: 'Reference', aliases: ['reference', 'referee'], plain: 'A reference is a person who can say what you’re like at work, like a former manager.', simpler: 'Someone who knows your work.' },
];
const ASKING = /\b(what is|what are|what does|what do you mean|wat|wats|whats|meaning|mean|means|define|explain|do not understand|not understand|do not get|dont get|confus\w*|huh|no idea what)\b|\?\s*$/;
function termIn(norm: string): { key: string; term: string; plain: string; simpler: string } | null {
  const care = CARE.find((t) => t.aliases.some((a) => new RegExp(`\\b${a}\\b`).test(norm)));
  const g = findTerm(norm);
  // Prefer the more specific care term (e.g. "care certificate") unless the glossary term is named exactly.
  if (care && (!g || care.aliases.some((a) => a.includes(' ') && norm.includes(a)) || !g.aliases.some((a) => new RegExp(`\\b${a}\\b`).test(norm)))) return care;
  if (g) { const p = PLAIN[g.key]; return { key: g.key, term: g.term, plain: p?.plain ?? GLOSSARY[g.key].plain.split(/(?<=\.)\s/).slice(0, 2).join(' '), simpler: p?.simpler ?? (GLOSSARY[g.key].example ?? GLOSSARY[g.key].plain.split('.')[0] + '.') }; }
  return null;
}
registerSkill({
  id: 'talent-c.explain', side: 'candidate',
  match: (c) => {
    if (!ASKING.test(c.norm)) return 0;
    const t = termIn(c.norm); if (!t) return 0;
    // Plain-words users get the short version; for others, the core glossary (core.explain) answers glossary terms.
    if (plainFor(c)) return 0.9;
    return CARE.some((x) => x.key === t.key) ? 0.86 : 0;
  },
  handle: (c) => {
    const t = termIn(c.norm)!;
    return { msgs: [{ kind: 'reply', text: t.plain, actions: [{ label: 'Still not clear', act: { t: 'say', text: 'still dont get it' } }, { label: 'Got it', act: { t: 'say', text: 'got it' } }] }],
      effects: (w, a) => { (w.q.glossarySeen[a.id] ??= []).push(t.key); }, frame: { intent: 'talent-c.explain', slots: { term: t.key }, awaiting: 'clarity', startedAt: new Date().toISOString() } };
  },
  answer: (c) => {
    const key = c.frame?.slots.term; const t = [...CARE, ...Object.entries(PLAIN).map(([k, v]) => ({ key: k, term: k, aliases: [], ...v }))].find((x) => x.key === key);
    if (!t) return null;
    if (/\b(still|again|simpler|easier|lost|huh|what|confus\w*|do not get|not get|do not understand|not clear)\b/.test(c.norm) && !termIn(c.norm.replace(/\bstill\b/, ''))) return { msgs: [{ kind: 'reply', text: `Put simply: ${t.simpler}` }], frame: null };
    if (c.ents.yes || c.ents.thanks || /\b(got it|ok|i see|understand now|makes sense)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: 'Good. Ask me about any other word, any time.' }], frame: null };
    return null;
  },
});

// ---------------- First steps ----------------
registerSkill({
  id: 'talent-c.start', side: 'candidate',
  match: (c) => {
    if (!/\b(get started|getting started|start|begin|first steps?|where do i start|what do i do( now| first)?|what should i do|set up|setup|help me|next step)\b/.test(c.norm)) return 0;
    if (/\b(interview|practi[cs]e|upload|cert\w*)\b/.test(c.norm)) return 0;
    const p = readPersonC(c.w, pidOf(c.actor));
    // Plain-words users get the three small steps (the full profile builder is one tap away there).
    return plainFor(c) && p.stepsDone.length < 3 ? 0.84 : 0;
  },
  handle: (c) => {
    const p = readPersonC(c.w, pidOf(c.actor)); const step = p.stepsDone.length ? Math.min(p.step, 2) : 0;
    return { msgs: [{ kind: 'reply', text: `Let’s do it in three small steps: your work, your certificate, your interview. You’re on step ${step + 1}: ${STEP_LABEL[step]}. You can type, speak or use a simple form, and switch any time.` }], nav: { to: '/c/start', label: 'your first steps' } };
  },
});
registerSkill({
  id: 'talent-c.where', side: 'candidate',
  match: (c) => (/\b(where was i|where were we|what was i doing|carry on|continue|pick up where|resume|i am back|im back)\b/.test(c.norm) && !/\bupload|cert/.test(c.norm) && readPersonC(c.w, pidOf(c.actor)).place ? 0.84 : 0),
  handle: (c) => {
    const p = readPersonC(c.w, pidOf(c.actor));
    return { msgs: [{ kind: 'reply', text: `Last time ${whereLine(p)}. Nothing was lost.`, actions: [{ label: 'Carry on', primary: true, act: { t: 'do', op: 'talent-c.continue' } }] }] };
  },
});
registerOp('talent-c.continue', (w, _a, actor) => {
  const pid = pidOf(actor); const p = personC(w, pid);
  const to = p.place?.route ?? '/c/start';
  let say = 'Here you are, just where you left off.';
  if (to.startsWith('/c/start') && p.step === 1 && p.upload && (p.upload.status === 'PAUSED' || p.upload.status === 'FAILED')) { say = resumeIn(w, pid).say; queueMicrotask(kick); }
  if (to.startsWith('/c/interview')) { const r = p.rooms[p.room]; if (r?.paused && w.network !== 'offline') r.paused = null; say = r?.draft.trim() ? 'Here’s your question, with your answer just as you left it.' : 'Here’s your question.'; }
  if (p.place) p.place.left = false;
  return { say, nav: { to, label: to.startsWith('/c/interview') ? 'the interview room' : 'your first steps' } };
});

// ---------------- Certificate upload ----------------
registerSkill({
  id: 'talent-c.upload', side: 'candidate',
  match: (c) => {
    const u = readPersonC(c.w, pidOf(c.actor)).upload;
    // The resumable care-certificate upload is Grace's; others' uploads go to the Passport (talent-b).
    if (!u && (pidOf(c.actor) !== 'p_grace' || c.route.startsWith('/c/passport'))) return 0;
    if (/\b(try again|retry|again)\b/.test(c.norm) && u?.status === 'FAILED') return 0.9;
    if (/\b(upload\w*|cert\w*|certificate|photo of|send (my|the) (cert|photo|paper))\b/.test(c.norm) && !ASKING.test(c.norm.replace(/\b(how|is|status)\b/g, '')) ) return 0.84;
    if (/\b(upload\w*|cert\w*)\b/.test(c.norm) && /\b(how|status|done|finished|stuck|working|percent|%)\b/.test(c.norm)) return 0.86;
    return 0;
  },
  handle: (c) => {
    const pid = pidOf(c.actor); const u = readPersonC(c.w, pid).upload;
    const nav = { to: '/c/start', label: 'your certificate' };
    const toStep = (w: Parameters<NonNullable<QReply['effects']>>[0]) => { personC(w, pid).step = 1; };
    if (!u || u.status === 'IDLE') return { msgs: [{ kind: 'reply', text: 'Let’s add your certificate. Tap “Take or choose a photo”. It sends in small parts, so if your signal drops nothing is lost. If you can’t take a photo, you can type what it says instead.' }], effects: toStep, nav };
    if (u.status === 'DONE') return { msgs: [{ kind: 'reply', text: 'Your certificate is already sent in full. It’s waiting for a check with whoever gave it to you, which is normal.' }] };
    if (u.status === 'UPLOADING') return { msgs: [{ kind: 'reply', text: `It’s sending now: ${partsLine(u)} are safe.` }], effects: toStep, nav };
    // Dry run on a copy for the words; the effect does it for real in the same update as the reply.
    const said = resumeIn(structuredClone(c.w), pid).say;
    return { msgs: [{ kind: 'reply', text: said }], effects: (w) => { toStep(w); resumeIn(w, pid); queueMicrotask(kick); }, nav };
  },
});
registerOp('talent-c.upload.resume', (w, _a, actor) => { const r = resumeIn(w, pidOf(actor)); personC(w, pidOf(actor)).step = 1; queueMicrotask(kick); return { say: r.say, nav: { to: '/c/start', label: 'your certificate' } }; });

// ---------------- Voice, typing or the simple form ----------------
function setMode(w: Parameters<NonNullable<QReply['effects']>>[0], pid: string, m: 'TEXT' | 'VOICE' | 'FORM') {
  const p = personC(w, pid);
  p.stepMode[Math.min(p.step, 1)] = p.step === 1 && m === 'TEXT' ? 'TEXT' : m;
  const r = p.rooms[p.room]; if (r) r.answerMode = m;
}
registerSkill({
  id: 'talent-c.voice', side: 'candidate',
  match: (c) => {
    // On T4's own pages (first steps, interview room) the switch is about this step, so it outranks other areas' forms.
    const here = c.route.startsWith('/c/start') || onInterview(c) ? 0.06 : 0;
    const s = score(c); return s ? s + here : 0;
  },
  handle: (c) => voiceHandle(c),
});
function score(c: QCtx): number {
    const voiceWord = /\b(voice|mic|microphone|speak|speaking|talk|talking|record|audio)\b/.test(c.norm);
    if (voiceWord && /\b(not work\w*|cannot|can not|does not|do not|is not|broken|wont|will not|denied|blocked|no sound|not allowed|failed|fail\w*)\b/.test(c.norm)) return 0.9;
    if (voiceWord && /\b(instead|can i|let me|i want to|use)\b/.test(c.norm)) return 0.82;
    if (/\b(type|typing|write|keyboard)\b/.test(c.norm) && /\b(instead|can i|let me|i want to|rather)\b/.test(c.norm)) return 0.82;
    if (/\b(form)\b/.test(c.norm) && /\b(instead|can i|let me|use|simple|rather|fill)\b/.test(c.norm)) return 0.82;
    return 0;
}
function voiceHandle(c: QCtx): QReply {
    const pid = pidOf(c.actor);
    const broken = /\b(not work\w*|cannot|can not|does not|do not|is not|broken|wont|will not|denied|blocked|no sound|not allowed|fail\w*)\b/.test(c.norm) && /\b(voice|mic|microphone|speak|talk|record|audio)\b/.test(c.norm);
    const where = onInterview(c) ? 'your answer' : 'this step';
    if (broken) return { msgs: [{ kind: 'reply', text: `That’s fine. I’ve switched ${where} to typing, and anything you already said is kept. Short answers are fine. You can also use the simple form, with one small box per question.`, actions: [{ label: 'Use the simple form', act: { t: 'say', text: 'use the form instead' } }] }],
      effects: (w, a) => { personC(w, pid).voice = 'UNAVAILABLE'; setMode(w, pid, 'TEXT'); emit(w, a.id, 'q.voice.unavailable', scope(a), 'Voice could not be used; switched to typing.'); } };
    const m = /\b(form)\b/.test(c.norm) ? 'FORM' : /\b(type|typing|write|keyboard)\b/.test(c.norm) ? 'TEXT' : 'VOICE';
    const voiceOff = m === 'VOICE' && !c.w.q.prefs[c.actor.id]?.voice;
    return { msgs: [{ kind: 'reply', text: m === 'FORM' ? `Switched ${where} to the simple form. Your words are kept.` : m === 'TEXT' ? `Switched ${where} to typing. Your words are kept.` : voiceOff ? 'Voice is turned off for you right now. I’ve turned it on; tap the microphone to speak. If it doesn’t work on your phone, typing gives the same result.' : `Switched ${where} to speaking. Tap the microphone. If it doesn’t work, I’ll switch you back to typing.` }],
      effects: (w, a) => { setMode(w, pid, m); if (voiceOff) w.q.prefs[a.id] = { ...w.q.prefs[a.id], voice: true }; } };
}

// ---------------- Lite mode ----------------
registerOp('talent-c.lite', (w, a, actor) => {
  const pid = actor.personId; if (!pid) return { say: 'Lite mode is for candidate accounts.' };
  const on = a.on !== false; const was = !!w.consents[pid]?.lite;
  w.consents[pid] = { ...w.consents[pid], lite: on };
  if (was !== on) pushUndo(w, actor.id, on ? 'Turn on lite mode' : 'Turn off lite mode', 'talent-c.lite', { on: was });
  emit(w, actor.id, 'settings.changed', `PERSON:${pid}`, `Lite mode ${on ? 'on' : 'off'}.`);
  return { say: on ? 'Lite mode is on: fewer pictures, no animations, bigger buttons. Say “turn off lite mode” any time, or change it in Settings.' : 'Lite mode is off.' };
});
registerSkill({
  id: 'talent-c.lite', side: 'candidate',
  match: (c) => (/\b(lite|light mode|data saver|save data|less data|slow|network is bad|bad network|poor network|no network|weak signal|bad signal|internet is (slow|bad))\b/.test(c.norm) && !ASKING.test(c.norm.replace(/\b(slow)\b/, '')) ? 0.86 : 0),
  handle: (c) => {
    const off = /\b(turn off|switch off|disable|stop|no more|normal mode|full)\b/.test(c.norm) && /\blite|light\b/.test(c.norm);
    const pid = pidOf(c.actor);
    return { msgs: [{ kind: 'reply', text: off ? 'Lite mode is off. Pictures and animations are back.' : 'I’ve turned on lite mode: fewer pictures, no animations and bigger buttons, so the app uses less data. Your work is still saved as you go. Say “undo” to switch it back.' }],
      effects: (w, a) => {
        const was = !!w.consents[pid]?.lite; w.consents[pid] = { ...w.consents[pid], lite: !off };
        if (!off && /\bslow|bad|poor|weak|no network\b/.test(c.norm)) personC(w, pid).slow = true;
        if (was !== !off) pushUndo(w, a.id, off ? 'Turn off lite mode' : 'Turn on lite mode', 'talent-c.lite', { on: was });
        emit(w, a.id, 'settings.changed', scope(a), `Lite mode ${off ? 'off' : 'on'} (asked Q).`);
      } };
  },
});

// ---------------- Interview room ----------------
const inRoom = (c: QCtx) => { const { room } = current(c.w, pidOf(c.actor)); return onInterview(c) && !!room?.started && !room.done; };
registerSkill({
  id: 'talent-c.interview.ctl', side: 'candidate',
  match: (c) => {
    if (!inRoom(c)) return 0;
    if (/\b(repeat|say (that|it) again|again|pardon|come again|did not hear|didnt hear|what was the question|read it)\b/.test(c.norm)) return 0.93;
    if (/\b(simpler|simple|easier|plain|do not understand|not understand|confus\w*|hard words|too hard|dont get|do not get)\b/.test(c.norm) && !termIn(c.norm)) return 0.93;
    if (/\b(pause|stop for now|take a break|break|hold on|wait)\b/.test(c.norm)) return 0.9;
    if (/^(my answer is|answer:|answer is|i would say|i'd say)\b/.test(c.norm)) return 0.86;
    if (/\b(next question|skip)\b/.test(c.norm)) return 0.86;
    return 0;
  },
  handle: (c) => {
    const pid = pidOf(c.actor); const { key, q, room } = current(c.w, pidOf(c.actor));
    if (!q || !room) return { msgs: [{ kind: 'reply', text: 'There’s no question open right now.' }] };
    if (/\b(repeat|again|pardon|come again|hear|what was the question|read it)\b/.test(c.norm) && !/\bsimpl|easier|understand/.test(c.norm)) {
      try { const s = window.speechSynthesis; if (s) { s.cancel(); s.speak(new SpeechSynthesisUtterance(qText(q, room))); } } catch { /* no speech */ }
      return { msgs: [{ kind: 'reply', text: `Here it is again, question ${room.qIndex + 1}: “${qText(q, room)}”`, actions: [{ label: 'Simpler words', act: { t: 'say', text: 'simpler please' } }] }], effects: (w) => { roomC(w, pid, key).repeats += 1; } };
    }
    if (/\b(pause|stop for now|break|hold on|wait)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: `Paused at question ${room.qIndex + 1}. Your answer so far is saved. There’s no clock; say “carry on” when you’re ready.`, actions: [{ label: 'Carry on', primary: true, act: { t: 'say', text: 'carry on' } }] }],
      effects: (w) => { roomC(w, pid, key).paused = { reason: 'USER', at: new Date().toISOString(), qIndex: room.qIndex }; } };
    if (/^(my answer is|answer:|answer is|i would say|i'd say)\b/.test(c.norm)) {
      const t = c.text.replace(/^\s*(my answer is|answer:|answer is|i would say|i'?d say)\s*/i, '');
      return { msgs: [{ kind: 'reply', text: 'I’ve put that in your answer box. Check it, change anything, then save it when you’re happy. Nothing is sent yet.' }], effects: (w) => { const r = roomC(w, pid, key); r.draft = (r.draft ? r.draft + ' ' : '') + t; r.answerMode = r.answerMode === 'FORM' ? 'TEXT' : r.answerMode; } };
    }
    if (/\b(next question|skip)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: room.mode === 'REAL' ? 'You can leave this one short, but I can’t skip it in the real interview: write a line, even “I haven’t done this yet, but I would…”. That’s an honest answer.' : 'In practice you can skip. Write anything, even one line, and save it to move on.' }] };
    return { msgs: [{ kind: 'reply', text: `In simpler words: “${q.simpler}” ${plainFor(c) ? `Tip: ${q.hint}` : ''}`.trim() }], effects: (w) => { roomC(w, pid, key).simpler[q.id] = true; } };
  },
});
registerSkill({
  id: 'talent-c.interview.go', side: 'candidate',
  match: (c) => {
    if (!c.w.interviews.some((i) => i.personId === pidOf(c.actor))) return 0;
    if (/\b(when|what time|what day|where)\b.*\binterview\b|\binterview\b.*\b(when|what time|tomorrow)\b/.test(c.norm) && !/\b(practi[cs]e|start|open)\b/.test(c.norm)) return 0.87;
    if (/\b(what|who)\b.*\b(see|sees|seen)\b/.test(c.norm) && /\b(employer|kora|they|interview|answers?)\b/.test(c.norm)) return 0.88;
    if (/\b(practi[cs]e|rehearse|mock|try out|warm up)\b/.test(c.norm)) return 0.86;
    if (/\b(start|begin|open|do|take|go to)\b.*\b(real )?interview\b/.test(c.norm)) return 0.86;
    if (/\b(carry on|resume|continue)\b/.test(c.norm) && onInterview(c) && current(c.w, pidOf(c.actor)).room?.paused) return 0.9;
    return 0;
  },
  handle: (c) => {
    const pid = pidOf(c.actor); const bank = bankFor(c.w, pid, null);
    const when = `${whenText(bank.when, c.actor.timezone)}`;
    if (/\b(carry on|resume|continue)\b/.test(c.norm)) {
      const { key, room } = current(c.w, pid);
      if (c.w.network === 'offline') return { msgs: [{ kind: 'reply', text: 'You’re still offline, so I’ll keep it paused. Your answer is saved on this phone.' }] };
      return { msgs: [{ kind: 'reply', text: `Carrying on at question ${(room?.qIndex ?? 0) + 1}. Take your time.` }], effects: (w) => { roomC(w, pid, key).paused = null; } };
    }
    if (/\b(see|sees|seen)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: `In the real interview, ${bank.org} sees your final answers, the wording you answered (simpler words if you asked for them) and whether you typed or spoke. They don’t see your practice, deleted drafts, pauses or how long you took. Practice is never shown to anyone.` }] };
    if (/\b(when|what time|what day|where)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: `Your interview with ${bank.org} (${bank.title}) is ${when}. It’s simulated in this demo. Want a quick practice first?`, used: [`Calendar · ${bank.org} · ${bank.when ? timeText(bank.when, c.actor.timezone) : ''}`], actions: [{ label: 'Quick practice', primary: true, act: { t: 'say', text: 'practice for my interview' } }] }] };
    const real = /\b(real|actual|proper)\b/.test(c.norm) || (!/\b(practi[cs]e|rehearse|mock|try out|warm up)\b/.test(c.norm));
    const key = real ? 'REAL' : 'PRACTICE';
    return { msgs: [{ kind: 'reply', text: real ? `Opening your interview with ${bank.org}. ${bank.questions.length} questions, no time limit, and you can pause any time. I’ll show you exactly what ${bank.org} will see before anything is sent.` : `Let’s practise. ${bank.questions.length} questions like the real ones. It’s private: it never counts as proof and ${bank.org} never sees it. Ask me “say it again” or “simpler” whenever you like.` }],
      effects: (w) => { const p = personC(w, pid); p.room = key; const r = roomC(w, pid, key); if (!r.started || r.done) startRoom(w, pid, key); }, nav: { to: '/c/interview', label: real ? 'your interview' : 'practice' } };
  },
});
registerSkill({
  id: 'talent-c.interview.submit', side: 'candidate',
  match: (c) => (/\b(send|submit|hand in|finish)\b.*\b(answers?|interview)\b/.test(c.norm) && c.w.interviews.some((i) => i.personId === pidOf(c.actor)) ? 0.9 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const r = readPersonC(c.w, pid).rooms.REAL; const bank = bankOfRoom(c.w, pid, 'REAL');
    if (r?.submitted) return { msgs: [{ kind: 'reply', text: `Already sent (simulated), receipt ${r.submitted.receipt}. A person at ${bank.org} reads them; I can’t tell you the result.` }] };
    if (!r?.done) return { msgs: [{ kind: 'reply', text: `Not yet: you’ve answered ${r?.answers.length ?? 0} of ${bank.questions.length} questions in the real interview. Practice answers are never sent.`, actions: [{ label: 'Open the interview', primary: true, act: { t: 'say', text: 'open my real interview' } }] }] };
    const acts: QAction[] = [{ label: 'Yes, send them', primary: true, act: { t: 'do', op: 'talent-c.interview.submit' } }, { label: 'Not yet', act: { t: 'say', text: 'not now' } }];
    return { msgs: [{ kind: 'approval', text: `Send your ${r.answers.length} answers to ${bank.org}? They’ll see them exactly as shown on the page. This can’t be undone. (Simulated: nothing really leaves this demo.)`, actions: acts }] };
  },
});
registerOp('talent-c.interview.submit', (w, _a, actor) => {
  const pid = pidOf(actor); const bank = bankOfRoom(w, pid, 'REAL');
  const s = submitReal(w, pid);
  if (!s) return { say: 'There’s nothing ready to send.' };
  return { say: `Sent to ${bank.org} (simulated). Receipt ${s.receipt}. A person at ${bank.org} reads your answers. I don’t decide, and I can’t tell you the result; you’ll hear from them directly.`, nav: { to: '/c/interview', label: 'your interview' } };
});

// "dont understand" on first steps, with no term: explain the step in plain words.
registerSkill({
  id: 'talent-c.step.explain', side: 'candidate',
  match: (c) => (c.route.startsWith('/c/start') && /\b(do not understand|not understand|confus\w*|what do i do|what does this mean|lost|help)\b/.test(c.norm) && !termIn(c.norm) ? 0.8 : 0),
  handle: (c) => {
    const p = readPersonC(c.w, pidOf(c.actor)); const s = Math.min(p.step, 2);
    const T = [
      'This step is just: tell us what work you’ve done. One line is enough, like “care assistant, 4 years”. Type it, say it, or use the small form.',
      `This step is: send a photo of your certificate. Tap “Take or choose a photo”. ${p.upload && p.upload.status !== 'DONE' && p.upload.done ? `${uploadPct(p.upload)}% is already sent.` : ''} If you can’t, type what the certificate says.`,
      'This step is: get ready for your interview. You can practise first; practice is private and never counts.',
    ];
    return { msgs: [{ kind: 'reply', text: T[s].trim() }] };
  },
});
