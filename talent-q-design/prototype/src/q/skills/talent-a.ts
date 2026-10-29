// talent-a skills: T1 (Amaka, a graduate with no work history) and T2 (Chidi, sales → product or business
// analyst). The global Q drives onboarding, the career atlas (J7), entry-level matching, interview rehearsal,
// CV help and applying. Pages only show and refine the work. Rules that hold everywhere here:
//  - Q never claims a skill or experience the person didn't state or prove; CV lines come only from their words.
//  - Practice is private and never proof; J7 never becomes visible to employers unless the person approves a share.
//  - Applying and sharing are consequential: Q asks, and only the approval action performs them.
import type { Actor, QAction } from '../../state/domain';
import { emit, simNow, update, type World } from '../../mock/world';
import { allSkills, appendQ, pushUndo, registerOp, registerSkill } from '../core/engine';
import type { QCtx, QReply, ReplyMsg, Skill } from '../core/types';
import { near } from '../core/nlu';
import type { PlanStep } from '../../journeys/career/personas';
import { QUESTIONS, applyAnswer, completeProfile, editProfile, missingOf, nextSection, profileText, readCv, readProfile, saveForm, samplesFor, suggestFix, tidy, toolsIn, validateForm, type FormDraft, type Profile, type Section } from '../../services/profile';
import { entryMatches, jobFromText, needStatus } from '../../journeys/onboarding/match';
import { addDays, answerQuiz, changesSince, compById, compFromText, employerView, fmtDay, focusComp, gapsFor, j7, jobsFor, nearest, occById, occFromText, overdue, personaFor, practiceFor, readJ7, setGoal, simISO, startQuiz, stateOf, submitSample } from '../../journeys/career/j7';
import { ta, taRead, type CvLine } from '../../state/areas/talent-a';

// ---------------- Helpers ----------------
// Candidate skills from several areas share one Q. For this area's own people (T1 Amaka, T2 Chidi) these
// skills win clear ties; for other candidates they stay available but step back behind their own areas'.
const OWN = new Set(['p_amaka', 'p_chidi']);
const reg = (s: Skill) => registerSkill({ ...s, match: (c) => { const v = s.match(c); return v <= 0 ? 0 : OWN.has(c.actor.personId ?? '') ? Math.min(0.99, v + 0.06) : v * 0.85; } });
const cand = (c: QCtx) => c.actor.side === 'candidate' && !!c.actor.personId;
const pidOf = (a: Actor) => a.personId!;
const reply = (text: string, extra: Partial<ReplyMsg> = {}): ReplyMsg => ({ kind: 'reply', text, ...extra });
const say = (label: string, text: string, primary = false): QAction => ({ label, primary, act: { t: 'say', text } });
const nav = (label: string, to: string, primary = false): QAction => ({ label, primary, act: { t: 'nav', to } });
const op = (label: string, name: string, args: Record<string, unknown> = {}, primary = false): QAction => ({ label, primary, act: { t: 'do', op: name, args } });
const ui = (w: World, actorId: string, route: string, patch: Record<string, unknown>) => Object.assign((w.q.ui[`${actorId}|${route}`] ??= {}), patch);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n: number, w: string, p = `${w}s`) => `${n} ${n === 1 ? w : p}`;
const onRoute = (c: QCtx, r: string) => c.route === r || c.route.startsWith(`${r}/`);
/** Highest score any OTHER skill gives this turn: a frame only keeps a turn that nothing else clearly claims. */
const othersTop = (c: QCtx, mine: string[]) => Math.max(0, ...allSkills().filter((s) => !mine.includes(s.id) && (s.side === 'both' || s.side === c.actor.side)).map((s) => { try { return s.match(c); } catch { return 0; } }));
const frameOf = (c: QCtx, intent: string) => (c.frame && c.frame.intent === intent && c.frame.topic !== 'suspended' ? c.frame : null);
const isGrad = (c: QCtx) => personaFor(pidOf(c.actor)).id === 'graduate';
const NUMS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, couple: 2, few: 3 };

// =====================================================================================================
// T1 · Guided profile: chat, CV upload or a short form, switchable at any point
// =====================================================================================================
const ONB = 'ta.onboard';
const ONB_MINE = [ONB, 'core.lost', 'core.keep', 'core.thanks'];
function askFor(p: Profile, sec: Section, _first: string, intro = ''): QReply['msgs'] {
  const q = QUESTIONS[sec];
  const n = missingOf(p).length;
  return [reply(`${intro}${intro ? ' ' : ''}${q.ask}`, { kind: 'question', why: `${plural(n, 'question')} left · skip any you like`,
    actions: [say('I don’t know what to write', 'i dont know what to write'), say('Skip this one', 'skip this'), op('Upload a CV instead', 'ta.cv.choose'), op('Use the short form', 'ta.view', { route: '/c/welcome', view: 'form', say: 'Here’s the short form. Fill in what you like; I’ll check it when you save.' })] })];
}
/** Side-steps (upload instead, form instead) keep the guided profile open, so a typed answer still lands. */
const keepOnb = (c: QCtx) => (c.frame?.intent === ONB ? { ...c.frame, topic: undefined } : undefined);
const onbFrame = (sec: Section, help = 0) => ({ intent: ONB, slots: { sec, help: String(help) }, awaiting: sec, startedAt: new Date().toISOString() });
function finishMsgs(w: World, a: Actor): QReply['msgs'] {
  const p = readProfile(w, pidOf(a));
  const claims = p.experience.reduce((n, x) => n + x.claims.length, 0);
  const skipped = p.skipped.map((s) => QUESTIONS[s].label.toLowerCase());
  return [reply(`That’s your profile, ${a.first}: ${plural(claims, 'claim')} in your own words and ${plural(p.skills.length, 'tool')} you named. Nothing is shared with anyone.${skipped.length ? ` You skipped ${list(skipped)}; that’s fine, it’s noted as missing and I won’t keep asking.` : ''} Next, we can look at where you could go, or at jobs that fit what you’ve told me.`,
    { used: ['Your answers', ...(p.cv.status === 'read' ? [p.cv.file ?? 'Your CV'] : [])], actions: [say('Where could I go?', 'what jobs could i do with what i have', true), say('Jobs that fit me', 'show me entry level jobs that fit me'), say('Help me with my CV', 'help me write my cv')] })];
}
function nextOrFinish(w: World, a: Actor, intro: string): QReply {
  const p = readProfile(w, pidOf(a));
  const sec = nextSection(p);
  if (!sec) return { msgs: [reply(intro), ...finishMsgs(w, a)].filter((m) => m.text), frame: null, effects: (d) => { if (!readProfile(d, pidOf(a)).done) completeProfile(d, pidOf(a)); } };
  return { msgs: askFor(p, sec, a.first, intro), frame: onbFrame(sec) };
}
/** Apply an answer to a copy first, so the reply can describe exactly what was kept. */
function preview(w: World, a: Actor, f: (p: Profile) => void) { const copy = structuredClone(w); editProfile(copy, pidOf(a), f); return copy; }

reg({
  id: ONB, side: 'candidate',
  match: (c) => onbMatch(c),
  handle: (c) => onbHandle(c),
  answer: (c) => onbAnswer(c),
});
function onbMatch(c: QCtx): number {
    if (!cand(c)) return 0;
    const p = readProfile(c.w, pidOf(c.actor));
    if (/\b(set ?up|make|build|create|start|fill( in)?|finish|continue|update|do|edit)\b.*\b(my |a )?profile\b/.test(c.norm) || /\bback to (my )?profile\b/.test(c.norm)) return 0.87;
    if (/\b(just (finished|graduated|left)|fresh graduate|new graduate|i graduated|finished (school|uni|university|my degree)|after nysc|done with (school|uni))\b/.test(c.norm)) return 0.85;
    if (!p.done && /\b(get started|getting started|where do i (start|begin)|how do i (start|begin))\b/.test(c.norm)) return 0.82;
    if (!p.done && /\b(do not know what to (write|put|say)|nothing to (write|put))\b/.test(c.norm)) return 0.8;
    if (!p.done && !p.answered.length && /\b(find|get|looking for)\b.*\b(a )?(job|work)\b/.test(c.norm)) return 0.8;
    return 0;
}
function onbHandle(c: QCtx): QReply {
    const p = readProfile(c.w, pidOf(c.actor));
    const navTo = onRoute(c, '/c/welcome') ? undefined : { to: '/c/welcome', label: 'your profile' };
    const effects = (w: World, a: Actor) => ui(w, a.id, '/c/welcome', { view: 'profile' });
    if (p.done && !missingOf(p).length) return { msgs: [reply(`Your profile is already set up, ${c.actor.first}. Tell me anything you want to add or change, in your own words, and I’ll update it.`, { actions: [say('Jobs that fit me', 'show me entry level jobs that fit me', true), say('Help me with my CV', 'help me write my cv')] })], nav: navTo, effects };
    const sec = nextSection(p) ?? missingOf(p)[0];
    const fresh = !p.answered.length;
    const intro = fresh ? `${/finished|graduat|nysc|left/.test(c.norm) ? 'Congratulations on finishing. ' : ''}Let’s build your profile together, ${c.actor.first}: a few small questions, in your own words. You can skip anything, upload a CV, or use a short form instead, and switch at any point. Nothing is shared until you choose.`
      : `Let’s carry on from where we stopped. ${p.answered.length} of 6 done${p.skipped.length ? `; you skipped ${list(p.skipped.map((s) => QUESTIONS[s].label.toLowerCase()))}, which I’ve noted` : ''}.`;
    if (/\b(do not know what to (write|put|say)|nothing to (write|put))\b/.test(c.norm)) return { msgs: [reply(`That’s very normal. Let’s make it small and concrete. ${QUESTIONS[sec].help[0]}`, { kind: 'question', actions: [say('Skip this one', 'skip this')] })], frame: onbFrame(sec, 1), nav: navTo, effects };
    return { msgs: askFor(p, sec, c.actor.first, intro), frame: onbFrame(sec), nav: navTo, effects };
}
function onbAnswer(c: QCtx): QReply | null {
    const f = frameOf(c, ONB); if (!f || !cand(c)) return null;
    // "Set up my profile" / "back to my profile" restarts the guided flow where it stopped; it isn't an answer.
    if (onbMatch(c) >= 0.82 && !/\b(do not know what to (write|put|say)|nothing to (write|put))\b/.test(c.norm)) return null;
    if (othersTop(c, ONB_MINE) >= 0.85) return null;
    const a = c.actor; const pid = pidOf(a); const sec = f.slots.sec as Section | 'project_detail';
    const p = readProfile(c.w, pid);
    const t = c.text.trim();
    // Skipping is always allowed; Q remembers what's missing without nagging.
    if (/\b(skip|pass|move on|next question|leave (it|that|this)|later|can i not|do i have to|rather not|prefer not)\b/.test(c.norm) && t.split(' ').length <= 9) {
      if (sec === 'project_detail') return nextOrFinish(c.w, a, 'Fine, I’ll leave the number out.');
      const after = preview(c.w, a, (x) => { if (!x.skipped.includes(sec)) x.skipped.push(sec); });
      const r = nextOrFinish(after, a, `No problem, skipped. I’ll remember ${QUESTIONS[sec].label.toLowerCase()} is missing and I won’t keep asking.`);
      return { ...r, effects: (w, ac) => { editProfile(w, pid, (x) => { if (!x.skipped.includes(sec)) x.skipped.push(sec); }); r.effects?.(w, ac); } };
    }
    // "I don't know what to write": small concrete questions, then an easy way out.
    const unsure = c.ents.unsure || /\b(do not know what to (write|put|say)|nothing to (write|say|put)|no idea|not sure what|i do not know)\b/.test(c.norm);
    if (unsure && sec !== 'goal' && sec !== 'project_detail') {
      const h = Number(f.slots.help ?? 0); const help = QUESTIONS[sec].help;
      if (h < help.length) return { msgs: [reply(`${h === 0 ? 'That’s fine, lots of people feel that way. Let’s make it smaller.' : 'Okay, another way in.'} ${help[h]}`, { kind: 'question', actions: [say('Skip this one', 'skip this')] })], frame: { ...f, slots: { ...f.slots, help: String(h + 1) } } };
      return { msgs: [reply('That’s okay. We can leave this one for now. I’ll keep it on your list for later and won’t push.', { kind: 'question', actions: [say('Skip it for now', 'skip this', true), say('Let me try once more', 'let me try again')] })], frame: f };
    }
    if (/\blet me try (again|once more)\b/.test(c.norm)) return { msgs: [reply(QUESTIONS[sec as Section]?.ask ?? 'Go ahead.', { kind: 'question' })], frame: { ...f, slots: { ...f.slots, help: '0' } } };
    // Correction of the previous answer ("actually it was 150 not 120").
    if (c.ents.correction && f.slots.last) {
      const last = f.slots.last as Section;
      const nums = c.text.match(/\d[\d,]*/g);
      const old = p.answers[last] ?? '';
      const fixed = nums && nums.length >= 2 && old.includes(nums[1]) ? old.replace(nums[1], nums[0]) : nums && nums.length === 1 && /\d/.test(old) ? old.replace(/\d[\d,]*/, nums[0]) : t.replace(/^(actually|sorry|wait|no|i meant|i mean)[,:]?\s*/i, '');
      return { msgs: [reply(`Fixed. ${QUESTIONS[last].label}: “${tidy(fixed).replace(/\.$/, '')}”.`), ...(sec !== 'project_detail' ? [reply(QUESTIONS[sec as Section].ask, { kind: 'question' })] : [])], frame: f, effects: (w) => editProfile(w, pid, (x) => { applyAnswer(x, last, fixed); }) };
    }
    if (sec === 'project_detail') {
      const after = preview(c.w, a, (x) => { const e = [...x.experience].reverse().find((y) => y.kind === 'project'); const cl = e?.claims[e.claims.length - 1]; if (cl) { cl.text = `${cl.text.replace(/\.$/, '')} (${t.replace(/\.$/, '')}).`; cl.flagged = undefined; cl.confidence = 'sure'; } });
      const r = nextOrFinish(after, a, 'Thanks, added that detail to the project, in your words.');
      return { ...r, effects: (w, ac) => { editProfile(w, pid, (x) => { const e = [...x.experience].reverse().find((y) => y.kind === 'project'); const cl = e?.claims[e.claims.length - 1]; if (cl) { cl.text = `${cl.text.replace(/\.$/, '')} (${t.replace(/\.$/, '')}).`; cl.flagged = undefined; cl.confidence = 'sure'; } }); r.effects?.(w, ac); } };
    }
    // "No" to volunteering/projects/tools is an answer, not a failure.
    if ((c.ents.no || /^(none|nothing|never|not really|i have not|i haven'?t|no i have not)\b/.test(c.norm)) && ['project', 'volunteer', 'tools'].includes(sec)) {
      const after = preview(c.w, a, (x) => { if (!x.none.includes(sec)) x.none.push(sec); });
      const r = nextOrFinish(after, a, sec === 'volunteer' ? 'That’s completely fine; plenty of people haven’t. Your studies and projects can carry your profile.' : sec === 'project' ? 'That’s fine. We’ll lean on what else you’ve done.' : 'No problem.');
      return { ...r, effects: (w, ac) => { editProfile(w, pid, (x) => { if (!x.none.includes(sec)) x.none.push(sec); }); r.effects?.(w, ac); } };
    }
    // Quick checks on obviously wrong answers, with a way to recover.
    if (sec === 'location' && (/^\d+$/.test(t) || t.length > 80)) return { msgs: [reply('I couldn’t tell a place from that. Type a city, like “Enugu”, or “remote only”. Or say skip.', { kind: 'question' })], frame: f };
    if (t.split(' ').length < 2 && ['project', 'volunteer'].includes(sec) && !c.ents.yes) return { msgs: [reply(`Could you say a little more? ${QUESTIONS[sec].help[0]}`, { kind: 'question' })], frame: f };
    if (c.ents.yes && t.split(' ').length <= 2 && sec !== 'goal') return { msgs: [reply(`Great, tell me about it in a sentence or two. ${QUESTIONS[sec as Section].help[0]}`, { kind: 'question' })], frame: f };
    // Record the answer in their words.
    const s = sec as Section;
    const after = preview(c.w, a, (x) => { applyAnswer(x, s, t); });
    const pa = readProfile(after, pid);
    const kept = s === 'tools' ? (toolsIn(t).length ? `Noted: ${list(toolsIn(t))}.` : 'Noted, in your words.')
      : s === 'goal' ? (/not sure|do not know|no idea|anything/.test(c.norm) ? 'That’s a good place to start; the career atlas can show you options.' : `Noted: ${pa.goal}.`)
      : s === 'location' ? `Noted: ${pa.location}.` : s === 'study' ? `Noted: ${pa.study}.` : `Got it. Saved as a claim, in your words: “${tidy(t).replace(/\.$/, '')}”.`;
    const extraTools = s !== 'tools' ? toolsIn(t).filter((x) => !p.skills.some((y) => y.label === x)) : [];
    const intro = `${kept}${extraTools.length ? ` I’ve also noted ${list(extraTools)}, because you mentioned ${extraTools.length === 1 ? 'it' : 'them'}.` : ''}`;
    if (s === 'project' && !/\d/.test(t) && f.slots.detailAsked !== '1') {
      return { msgs: [reply(`${intro} Roughly how many people, records or pages were involved? A rough number is fine, or say skip.`, { kind: 'question' })], frame: { ...onbFrame('project_detail' as Section), slots: { sec: 'project_detail', last: s, detailAsked: '1', help: '0' } }, effects: (w) => editProfile(w, pid, (x) => { applyAnswer(x, s, t); }) };
    }
    const r = nextOrFinish(after, a, intro);
    return { ...r, frame: r.frame ? { ...r.frame, slots: { ...r.frame.slots, last: s } } : r.frame, effects: (w, ac) => { editProfile(w, pid, (x) => { applyAnswer(x, s, t); }); r.effects?.(w, ac); } };
}

reg({
  id: 'ta.nowork', side: 'candidate',
  match: (c) => (cand(c) && /\b(never (had|done|held) (a |any )?(proper )?(job|work)|no (work|job|real) (experience|history)|have not (worked|had a (proper |real )?job)|not worked anywhere|i have no experience|i do not have (any )?(work |job )?experience|no experience|never worked)\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const f = c.frame && c.frame.intent === ONB ? c.frame : null;
    const p = readProfile(c.w, pidOf(c.actor));
    const sec = f ? (f.slots.sec as Section) : null;
    return {
      msgs: [reply('That’s completely normal straight out of school, and it isn’t a dead end. Employers hiring graduates look at what you did in your studies, projects, volunteering and anything you helped run. I’ll build your profile from those, and I will never invent a job you didn’t have.', { used: ['What you’ve told me'] }),
        ...(sec && QUESTIONS[sec] ? [reply(QUESTIONS[sec].ask, { kind: 'question', actions: [say('I don’t know what to write', 'i dont know what to write'), say('Skip this one', 'skip this')] })] : !p.done ? [reply('Shall we start with your studies?', { actions: [say('Set up my profile', 'set up my profile', true)] })] : [])],
      effects: (w, a) => editProfile(w, pidOf(a), (x) => { x.noJobs = true; }),
      frame: keepOnb(c),
    };
  },
});

// ---------- CV upload (simulated parse), including an unreadable scan ----------
reg({
  id: 'ta.cv.upload', side: 'candidate',
  match: (c) => (cand(c) && (/\b(upload|attach|send|share|add)\b.*\bcv\b/.test(c.norm) || /\b(i have|i've got|i got|here is|use)\b.*\bcv\b/.test(c.norm) || /\bcv\b.*\b(instead|upload)\b/.test(c.norm)) && !/\b(help|write|draft|improve|build|make)\b/.test(c.norm) ? (!readProfile(c.w, pidOf(c.actor)).done || onRoute(c, '/c/welcome') || c.frame?.intent === ONB ? 0.87 : 0.6) : 0),
  handle: (c) => ({ msgs: [cvChooseMsg(pidOf(c.actor))], nav: onRoute(c, '/c/welcome') ? undefined : { to: '/c/welcome', label: 'your profile' }, effects: (w, a) => ui(w, a.id, '/c/welcome', { view: 'profile' }), frame: keepOnb(c) }),
});
function cvChooseMsg(pid: string): ReplyMsg {
  return reply('Choose your CV. In this prototype, pick one of the sample files below; nothing leaves your device. I’ll show you everything I take from it, and it all stays a claim in your words.', { kind: 'question', why: 'Simulated upload',
    actions: samplesFor(pid).map((s, i) => op(`Upload ${s.file}`, 'ta.cv.read', { file: s.file, kind: s.kind }, i === 0)) });
}
registerOp('ta.cv.choose', (w, _a, actor) => { appendQ(w, actor.id, { who: 'q', engine: 'rules', ...cvChooseMsg(pidOf(actor)) }); ui(w, actor.id, '/c/welcome', { view: 'profile' }); });
registerOp('ta.cv.read', (w, a, actor) => {
  const pid = pidOf(actor); const file = String(a.file); const kind = a.kind === 'scan' ? 'scan' : 'pdf';
  if (w.network === 'offline') { appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'notice', text: 'You’re offline, so I can’t read a file right now. It isn’t lost: try again when you reconnect, or tell me about yourself here meanwhile.' }); return; }
  editProfile(w, pid, (p) => { p.cv = { status: 'reading', file }; });
  ui(w, actor.id, '/c/welcome', { view: 'profile' });
  appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'notice', text: `Reading ${file}… I’ll show you what I find before anything is used.` });
  setTimeout(() => update((d) => {
    const r = readCv(d, pid, file, kind);
    if (!r.ok) {
      editProfile(d, pid, (p) => { p.cv = { status: 'unreadable', file }; });
      emit(d, actor.id, 'profile.cv.unreadable', `PERSON:${pid}`, `${file} could not be read (no text); nothing was saved from it.`);
      appendQ(d, actor.id, { who: 'q', engine: 'rules', kind: 'reply', text: `I couldn’t read that one. ${r.message} Nothing was saved from it, so there’s nothing to undo. What would you like to do?`, why: 'Couldn’t read the file · nothing saved',
        actions: [...samplesFor(pid).filter((s) => s.kind === 'pdf').map((s) => op(`Upload ${s.file} instead`, 'ta.cv.read', { file: s.file, kind: 'pdf' }, true)), say('Tell Q instead', 'set up my profile'), op('Fill in the short form', 'ta.view', { route: '/c/welcome', view: 'form', say: 'Here’s the short form. Fill in what you like; I’ll check it when you save.' })] });
      return;
    }
    const p = readProfile(d, pid);
    const jobs = p.experience.filter((e) => e.kind === 'job').length;
    const vague = p.experience.flatMap((e) => e.claims).filter((cl) => cl.flagged);
    emit(d, actor.id, 'profile.cv.read', `PERSON:${pid}`, `${file} read: ${p.experience.length} items kept as claims.`);
    const next = nextSection(p);
    appendQ(d, actor.id, { who: 'q', engine: 'rules', kind: 'reply', used: [file], why: 'Shown as claims: what your CV says, before any proof',
      text: `I read ${file}. I found your studies (${p.study}), ${plural(p.experience.filter((e) => e.kind === 'project').length, 'project')}, ${plural(p.experience.filter((e) => e.kind === 'volunteer').length, 'volunteering role')}${jobs ? ` and ${plural(jobs, 'job')}` : ', and no jobs, which is normal for a new graduate'}. Everything is saved as a claim in your words; I added nothing.${vague.length ? ` One line is vague: “${vague[0].text.replace(/\.$/, '')}”. An example would make it believable; we can fix it later.` : ''}${next ? ` I still need one thing: ${QUESTIONS[next].ask}` : ''}`,
      actions: next ? [say('I don’t know yet', 'not sure yet'), say('Skip this one', 'skip this')] : [say('Where could I go?', 'what jobs could i do with what i have', true), say('Jobs that fit me', 'show me entry level jobs that fit me')] });
    if (next) d.q.frames[actor.id] = onbFrame(next); else { d.q.frames[actor.id] = null; completeProfile(d, pid); }
  }), 1500);
});

// ---------- The optional short form, validated with a recovery path through Q ----------
registerOp('ta.view', (w, a, actor) => {
  ui(w, actor.id, String(a.route), { view: a.view, ...(a.occ ? { occ: a.occ } : {}) });
  if (a.say) appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'reply', text: String(a.say) });
  return a.route && typeof location !== 'undefined' && !location.hash.startsWith(`#${a.route}`) ? { nav: { to: String(a.route), label: String(a.route) } } : undefined;
});
reg({
  id: 'ta.form', side: 'candidate',
  match: (c) => (cand(c) && /\bform\b/.test(c.norm) && /\b(fill|use|rather|instead|just|give me|show|open|can i|prefer|type)\b/.test(c.norm) ? 0.86 : 0),
  handle: (c) => ({ frame: keepOnb(c), msgs: [reply('Here’s the short form. Fill in what you like and leave the rest; I’ll check it when you save. Anything you’ve already told me is kept, and you can come back to chatting any time.')], nav: { to: '/c/welcome', label: 'your profile' }, effects: (w, a) => ui(w, a.id, '/c/welcome', { view: 'form' }) }),
});
const FIELD_LABEL: Record<keyof FormDraft, string> = { name: 'Name', location: 'Where you can work', study: 'Course and university', year: 'Year you finished', project: 'One project', volunteer: 'Volunteering or activities', tools: 'Tools' };
registerOp('ta.form.save', (w, _a, actor) => {
  const pid = pidOf(actor); const p = readProfile(w, pid);
  const errs = validateForm(p.form);
  const keys = Object.keys(errs) as (keyof FormDraft)[];
  if (keys.length) {
    editProfile(w, pid, (x) => { x.formErrors = errs; });
    const k = keys[0]; const fix = suggestFix(k, p.form);
    appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'question', text: `${keys.length === 1 ? 'One thing' : `${keys.length} things`} to fix before I save. ${FIELD_LABEL[k]}: ${errs[k]}${fix ? ` Did you mean ${fix}?` : ''} Nothing else is lost.`, why: 'Form not saved yet',
      actions: fix ? [op(`Yes, use ${fix}`, 'ta.form.fix', { field: k, value: fix }, true), say('I’ll fix it myself', 'ok i will fix it myself')] : [say('Leave that field blank', `clear the ${k} field`)] });
    w.q.frames[actor.id] = { intent: 'ta.formfix', slots: { field: k, fix: fix ?? '' }, awaiting: 'fix', startedAt: new Date().toISOString() };
    return;
  }
  editProfile(w, pid, (x) => { saveForm(x); x.formErrors = {}; });
  const after = readProfile(w, pid);
  const next = nextSection(after);
  ui(w, actor.id, '/c/welcome', { view: 'profile' });
  appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'reply', used: ['The short form'], text: `Saved from the form, as claims in your words.${next ? ` ${QUESTIONS[next].ask}` : ''}`, actions: next ? [say('Skip this one', 'skip this')] : [say('Jobs that fit me', 'show me entry level jobs that fit me', true)] });
  if (next) w.q.frames[actor.id] = onbFrame(next); else { w.q.frames[actor.id] = null; completeProfile(w, pid); }
});
registerOp('ta.form.fix', (w, a, actor) => {
  const pid = pidOf(actor); const k = a.field as keyof FormDraft;
  editProfile(w, pid, (x) => { x.form = { ...x.form, [k]: String(a.value ?? '') }; x.formErrors = validateForm(x.form); });
  w.q.frames[actor.id] = null;
  appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'reply', text: `Fixed: ${FIELD_LABEL[k]} is now ${a.value ? `“${a.value}”` : 'blank'}. Save the form when you’re ready.`, actions: [op('Save it now', 'ta.form.save', {}, true)] });
});
reg({
  id: 'ta.formfix', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    const p = readProfile(c.w, pidOf(c.actor));
    return Object.keys(p.formErrors ?? {}).length && /\b(form|wrong|mistake|error|fix|what is the problem|why (will|can) not|did not save|year)\b/.test(c.norm) ? 0.86 : 0;
  },
  handle: (c) => {
    const p = readProfile(c.w, pidOf(c.actor)); const k = Object.keys(p.formErrors)[0] as keyof FormDraft; const fix = suggestFix(k, p.form);
    return { msgs: [reply(`The form isn’t saved yet because of ${FIELD_LABEL[k].toLowerCase()}: ${p.formErrors[k]}${fix ? ` I think you meant ${fix}.` : ''}`, { kind: 'question', actions: fix ? [op(`Use ${fix}`, 'ta.form.fix', { field: k, value: fix }, true)] : [] })], frame: { intent: 'ta.formfix', slots: { field: k, fix: fix ?? '' }, awaiting: 'fix', startedAt: new Date().toISOString() } };
  },
  answer: (c) => {
    const f = frameOf(c, 'ta.formfix'); if (!f) return null;
    const k = f.slots.field as keyof FormDraft;
    const val = k === 'year' ? c.text.match(/\b(19|20)\d{2}\b/)?.[0] : undefined;
    const v = val ?? (c.ents.yes && f.slots.fix ? f.slots.fix : /\bclear\b/.test(c.norm) ? '' : undefined);
    if (/\bmyself\b/.test(c.norm)) return { msgs: [reply('Okay. The field is highlighted on the form; save again when you’re ready.')], frame: null };
    if (v === undefined) return null;
    const fixIt = (x: Profile) => { x.form = { ...x.form, [k]: v }; x.formErrors = validateForm(x.form); if (!Object.keys(x.formErrors).length) saveForm(x); };
    const after = preview(c.w, c.actor, fixIt);
    const r = nextOrFinish(after, c.actor, `Fixed: ${FIELD_LABEL[k]} is now ${v ? `“${v}”` : 'blank'}, and I’ve saved the form as claims in your words.`);
    return { ...r, effects: (w, a) => { editProfile(w, pidOf(a), fixIt); ui(w, a.id, '/c/welcome', { view: 'profile' }); r.effects?.(w, a); } };
  },
});

// ---------- Adding to the profile later, only in the person's words ----------
reg({
  id: 'ta.profile.add', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    const p = readProfile(c.w, pidOf(c.actor));
    if (!p.answered.length && !p.done) return 0;
    return /\b(i (actually |also |did also |have also )?(did|have done|took|completed|finished|built|made|ran|organised|organized|taught|volunteered|led|wrote|managed|helped|tutored|was the|was a))\b/.test(c.norm) && c.norm.split(' ').length >= 5 ? 0.74 : 0;
  },
  handle: (c) => {
    const m = c.text.match(/\bi\s+(actually\s+|also\s+)?(did|have done|took|completed|finished|built|made|ran|organi[sz]ed|taught|volunteered|led|wrote|managed|helped|tutored|was)\b/i);
    const t = (m ? c.text.slice(m.index) : c.text).replace(/\b(actually|also)\s+/i, '');
    const course = /\b(course|certificate|coursera|udemy|class|training|bootcamp|alison)\b/.test(c.norm);
    const vol = /\b(volunteer|church|tutor|taught|club|society|association|community)\b/.test(c.norm);
    const sec: Section = vol ? 'volunteer' : 'project';
    const tools = toolsIn(t);
    const comp = compFromText(personaFor(pidOf(c.actor)), c.norm);
    return { msgs: [reply(`Added to your profile, in your words: “${tidy(t).replace(/\.$/, '')}”. It’s a claim until something backs it up${tools.length ? `, and I’ve noted ${list(tools)}` : ''}.`, { used: ['Your message'], actions: [say('Update my CV lines', 'help me write my cv')] })],
      effects: (w, a) => {
        editProfile(w, pidOf(a), (x) => {
          if (course) { x.experience.push({ id: `x_course_${Date.now().toString(36)}`, kind: 'course', title: 'Course', org: '', when: '', claims: [{ id: `c${Date.now().toString(36)}`, text: tidy(t), source: 'CONVERSATION', confidence: 'sure' }] }); for (const tool of tools) if (!x.skills.some((s) => s.label === tool)) x.skills.push({ id: `sk_${tool}`, label: tool, state: 'claimed', note: 'You said so · claim', source: 'CONVERSATION' }); }
          else { const keep = x.experience.filter((e) => e.kind === sec); applyAnswer(x, sec, t); x.experience = [...x.experience.filter((e) => e.kind !== sec), ...keep, ...x.experience.filter((e) => e.kind === sec && !keep.includes(e))]; }
        });
        if (comp) { const S = j7(w, pidOf(a)); S.mentioned[comp.id] = tidy(t); }
      } };
  },
});

// =====================================================================================================
// Matching against real listings (entry level for graduates; goal-linked openings for switchers)
// =====================================================================================================
function matchesMsg(w: World, a: Actor): ReplyMsg {
  const pid = pidOf(a); const p = readProfile(w, pid); const ms = entryMatches(w, pid);
  if (!p.answered.length) return reply('I can match you better once I know a little about you. It takes a few minutes, and you can skip anything.', { actions: [say('Set up my profile', 'set up my profile', true), op('Upload a CV', 'ta.cv.choose')] });
  if (!ms.length) return reply('None of the open entry-level listings asks for anything you’ve told me about yet. That isn’t a judgement of you; it means I have nothing to compare. Adding one project or tool you’ve used usually changes this.', { actions: [say('Add something to my profile', 'set up my profile', true)] });
  const top = ms[0];
  const showN = ms.filter((m) => m.fit === top.fit).length;
  return reply(`${plural(ms.length, 'open entry-level job')} ask for things you’ve told me about. The closest${showN > 1 ? ' ones' : ''}: ${list(ms.slice(0, Math.min(3, ms.length)).map((m) => `${m.job.title} at ${m.org} (${m.fit} of ${m.needs.length})`))}. These count what you’ve mentioned, which are claims, not proof, and an employer decides; I can’t promise anything.${!p.location ? ' You skipped where you can work, so I haven’t filtered by location.' : ''}`,
    { used: ['Your profile (claims)', 'Open listings'], ref: { type: 'ta.matches', id: pid }, why: 'Need by need: mentioned, evidenced or not shown',
      actions: [say(`Why ${top.job.title}?`, `why does the ${top.org.split(' ')[0].toLowerCase()} ${top.job.title.toLowerCase()} job fit me`, true), say('Practise for an interview', 'can i practise for an interview'), say('Help me with my CV', 'help me write my cv')] });
}
function oppsMsg(w: World, a: Actor): ReplyMsg {
  const pid = pidOf(a); const P = personaFor(pid); const S = readJ7(w, pid);
  const occs = [S.goal, ...P.occs.map((o) => o.id).filter((x) => x !== S.goal)].filter((o) => (P.jobs[o] ?? []).length);
  const lines = occs.slice(0, 3).flatMap((oid) => jobsFor(w, P, oid).map((j) => {
    const o = occById(P, oid)!; const g = gapsFor(w, pid, S, o); const app = w.applications.find((x) => x.jobId === j.id && x.personId === pid);
    return `${j.title} at ${w.orgs.find((x) => x.id === j.orgId)?.name}: ${o.needs.length - g.length} of ${o.needs.length} shown${g.length ? `, still to show ${list(g.map((x) => compById(P, x).label.toLowerCase()))}` : ''}${app ? ` (you applied before; ${app.status === 'NOT_PROGRESSING' ? 'they didn’t progress it' : app.status.toLowerCase()})` : ''}${j.status === 'CLOSED' ? ' (closed)' : ''}`;
  }));
  return reply(`Openings linked to your goals, from real listings: ${lines.join('; ')}. Distance counts evidence only, and an employer decides; I can’t promise an outcome.`, { used: ['Your evidence', 'Open listings'], why: 'Shown with what you’ve shown and what’s missing', actions: [say('What can employers see?', 'what can employers see about me'), say('Show my plan', 'show my plan')] });
}
reg({
  id: 'ta.jobs', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    if (/\bapply\b/.test(c.norm) && jobFromText(c.w, c.norm)) return 0;
    if (/\b(jobs?|openings?|vacanc\w*|opportunit\w*|positions?|listings?|roles? (i can|to) apply|where (can|should) i apply|who is hiring)\b/.test(c.norm) && /\b(fit|fits|match|matches|for me|suit|any|show|find|good|entry|graduate|beginner|apply|open|available|me)\b/.test(c.norm)) return /\b(why|how)\b/.test(c.norm) ? 0.7 : 0.86;
    return 0;
  },
  handle: (c) => {
    const pid = pidOf(c.actor);
    if (isGrad(c)) return { msgs: [matchesMsg(c.w, c.actor)], nav: onRoute(c, '/c/welcome') ? undefined : { to: '/c/welcome', label: 'your profile' }, effects: (w, a) => { ui(w, a.id, '/c/welcome', { view: 'jobs' }); const s = ta(w); s.seenJobs[pid] = Array.from(new Set([...(s.seenJobs[pid] ?? []), ...entryMatches(w, pid).map((m) => m.job.id)])); } };
    return { msgs: [oppsMsg(c.w, c.actor)], nav: onRoute(c, '/c/career') ? undefined : { to: '/c/career', label: 'your career atlas' }, effects: (w, a) => ui(w, a.id, '/c/career', { view: 'opps' }) };
  },
});
reg({
  id: 'ta.jobs.why', side: 'candidate',
  match: (c) => (cand(c) && /\b(why|how)\b.*\b(fit|fits|match|matches|suit|good for me|recommend|close)\b/.test(c.norm) && jobFromText(c.w, c.norm) ? 0.88 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const j = jobFromText(c.w, c.norm)!; const org = c.w.orgs.find((o) => o.id === j.orgId)?.name ?? '';
    const needs = j.needs.map((n) => needStatus(c.w, pid, n));
    const m = entryMatches(c.w, pid, true).find((x) => x.job.id === j.id);
    const parts = needs.map((n) => `${n.need}: ${n.state === 'evidenced' ? `evidenced by ${n.basis}` : n.state === 'mentioned' ? `mentioned (${n.basis}), a claim, not proof yet` : 'not shown yet'}`);
    return { msgs: [reply(`${j.title} at ${org} asks for ${plural(j.needs.length, 'thing')}. ${parts.join('. ')}.${m?.notes.length ? ` ${m.notes.join(' ')}` : ''} ${org} decides; this is my reading of the listing, not a prediction.`, { used: [`${org} listing`, 'Your profile'],
      actions: j.status === 'OPEN' ? [say('Apply for it', `apply for the ${org.split(' ')[0].toLowerCase()} ${j.title.toLowerCase()} job`, true), nav('Open the listing', `/c/jobs/${j.id}`), say('Practise for this interview', 'can i practise for an interview')] : [] })] };
  },
});

// ---------- Applying (consequential: approval first) ----------
reg({
  id: 'ta.apply', side: 'candidate',
  match: (c) => (cand(c) && /\b(apply|application|send my profile)\b/.test(c.norm) && !/\b(my applications|track|status)\b/.test(c.norm) ? (jobFromText(c.w, c.norm) ? 0.9 : 0.6) : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const j = jobFromText(c.w, c.norm);
    if (!j) return { msgs: [reply('Which job would you like to apply for? Here are the closest matches.', { kind: 'question', actions: entryMatches(c.w, pid).slice(0, 3).map((m) => say(`${m.job.title} · ${m.org}`, `apply for the ${m.org.split(' ')[0].toLowerCase()} ${m.job.title.toLowerCase()} job`)) })] };
    const org = c.w.orgs.find((o) => o.id === j.orgId)?.name ?? '';
    if (j.status !== 'OPEN') return { msgs: [reply(`${j.title} at ${org} has closed, so I can’t apply for it. I can show similar open jobs.`, { actions: [say('Similar open jobs', 'show me entry level jobs that fit me', true)] })] };
    const prev = c.w.applications.find((x) => x.jobId === j.id && x.personId === pid);
    if (prev) return { msgs: [reply(`You already applied for ${j.title} at ${org}${prev.status === 'NOT_PROGRESSING' ? `, and ${org} didn’t progress it` : ` (status: ${prev.status.toLowerCase().replace('_', ' ')})`}. ${prev.status === 'NOT_PROGRESSING' ? 'Applying again with nothing new rarely changes the answer. Adding reviewed evidence first is a better use of your time.' : 'I’ll tell you when anything changes.'}`, { actions: [nav('Open my applications', '/c/applications', true)] })] };
    const p = readProfile(c.w, pid);
    const claims = p.experience.reduce((n, x) => n + x.claims.length, 0);
    const cv = taRead(c.w).cv[pid];
    const assessed = c.w.evidence.filter((e) => e.ownerId === pid && e.kind === 'ASSESSMENT' && e.origin === 'J7');
    const missing = missingOf(p).filter((s) => s === 'location' && j.workMode !== 'REMOTE');
    return { msgs: [reply(`Here’s what I’d send to ${org} for ${j.title} (simulated): your profile (${plural(claims, 'claim')} in your own words${p.skills.length ? `, ${plural(p.skills.length, 'tool')}` : ''})${cv?.status === 'APPROVED' ? ' and the CV lines you approved' : ''}. Not sent: practice, your career plan${assessed.length ? `, and your assessed work sample unless you share it separately` : ''}. ${missing.length ? `Your profile doesn’t say where you can work; the role is ${j.workMode.toLowerCase()} in ${j.location}. That’s okay to leave. ` : ''}${org} decides what happens next; I can’t promise a reply. Shall I submit it?`,
      { kind: 'approval', used: ['Your profile', `${org} listing`], why: 'Needs your yes: this shares your profile with an employer',
        actions: [op('Submit application', 'ta.apply.submit', { jobId: j.id }, true), say('Not yet', 'not now')] })] };
  },
});
registerOp('ta.apply.submit', (w, a, actor) => {
  const pid = pidOf(actor); const j = w.jobs.find((x) => x.id === a.jobId); if (!j) return;
  const org = w.orgs.find((o) => o.id === j.orgId);
  if (w.applications.some((x) => x.jobId === j.id && x.personId === pid)) return { say: 'That application is already in.' };
  if (w.network === 'offline') return { say: 'You’re offline, so nothing was submitted. I’ll keep the draft; submit it again when you reconnect.' };
  const claims = w.evidence.filter((e) => e.ownerId === pid && e.kind === 'CLAIM' && e.origin === 'ONBOARDING');
  for (const e of claims) { e.visibility = e.visibility === 'PUBLIC_PROFILE' ? e.visibility : 'SHARED_WITH'; if (!e.sharedWith.includes(j.orgId)) e.sharedWith.push(j.orgId); }
  const id = `a_${pid}_${j.id}`;
  w.applications.push({ id, jobId: j.id, personId: pid, status: 'SUBMITTED', shared: claims.map((e) => e.evidenceId), timeline: [{ at: simISO(w).slice(0, 10), text: 'You applied (simulated: nothing was really sent)', by: 'YOU' }] });
  emit(w, actor.id, 'application.submitted', `SHARED:${j.orgId}:${pid}`, `${actor.name} applied for ${j.title} and shared ${plural(claims.length, 'profile claim')}.`, { applicationId: id, jobId: j.id });
  pushUndo(w, actor.id, `Application to ${org?.name}`, 'ta.apply.withdraw', { id });
  appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'reply', text: `Submitted to ${org?.name} (simulated: nothing was really sent). ${org?.name} ${j.signals.replies.charAt(0).toLowerCase()}${j.signals.replies.slice(1)}, but I can’t promise a reply or an outcome. I’ll tell you when the status changes.`,
    why: 'Shared only your profile claims with this employer', actions: [nav('Open my applications', '/c/applications', true), say('Practise for the interview', 'can i practise for an interview')] });
});
registerOp('ta.apply.withdraw', (w, a, actor) => { const x = w.applications.find((y) => y.id === a.id); if (x) { x.status = 'WITHDRAWN'; x.timeline.push({ at: simISO(w).slice(0, 10), text: 'You withdrew (simulated)', by: 'YOU' }); emit(w, actor.id, 'application.withdrawn', `PERSON:${pidOf(actor)}`, 'Application withdrawn.'); } });

// =====================================================================================================
// Interview rehearsal: practice, never proof (the full room is /c/interview)
// =====================================================================================================
function rehearsalQuestion(p: Profile, n: number) {
  const proj = p.experience.find((e) => e.kind === 'project'); const vol = p.experience.find((e) => e.kind === 'volunteer'); const job = p.experience.find((e) => e.kind === 'job');
  const qs = [
    proj ? `Tell me about your ${proj.title.toLowerCase()}: what question were you answering, what did you do yourself, and what did you find?` : job ? `Tell me about a time at ${job.org} when something went wrong and what you did.` : 'Tell me about something you organised or worked hard on, and how it turned out.',
    vol ? `As ${vol.title.toLowerCase()}, tell me about a time something didn’t add up or went wrong. What did you do?` : 'Tell me about a time you had to learn something quickly.',
    'Why do you want this kind of role, and what would you like to learn in your first six months?',
  ];
  return qs[n % qs.length];
}
reg({
  id: 'ta.rehearse', side: 'candidate',
  match: (c) => (cand(c) && (/\b(practi[sc]e|rehears\w*|mock|prepare|prep|ready)\b.*\binterview\b|\binterview\b.*\b(practi[sc]e|questions?|prep|rehears\w*|tips)\b/.test(c.norm) || /\b(another (interview )?question|ask me (another|a) question)\b/.test(c.norm) && !!(c.frame && c.frame.intent === 'ta.rehearse')) ? 0.86 : 0),
  handle: (c) => {
    const p = readProfile(c.w, pidOf(c.actor)); const n = (taRead(c.w).rehearsals[pidOf(c.actor)] ?? []).length;
    const q = rehearsalQuestion(p, n);
    return { msgs: [reply(`Let’s rehearse. This is practice: private, never shown to employers and never proof of anything. Answer as you would in the room; a few sentences is fine. ${q}`, { kind: 'question', why: 'Practice · private',
      actions: [nav('Open full interview practice', '/c/interview'), say('Stop practising', 'stop practising')] })], frame: { intent: 'ta.rehearse', slots: { q }, awaiting: 'answer', startedAt: new Date().toISOString() } };
  },
  answer: (c) => {
    const f = frameOf(c, 'ta.rehearse'); if (!f) return null;
    if (/\b(stop|enough|done|later|quit)\b/.test(c.norm) && c.norm.split(' ').length < 6) return { msgs: [reply('Okay, we’ll stop there. Your practice answers stay private.')], frame: null };
    if (othersTop(c, ['ta.rehearse']) >= 0.85 || c.text.trim().split(' ').length < 4) return null;
    const a = c.text.trim(); const n = a.split(/\s+/).length;
    const notes: string[] = [];
    notes.push(/\d/.test(a) ? 'Good: you gave a number, which makes it concrete.' : 'Add a number if you can: how many people, how much money, how long.');
    if (!/\b(found|showed|learn\w*|result\w*|so that|which meant|helped|improv\w*|changed|saved)\b/i.test(a)) notes.push('End with what you found or what changed because of it.');
    else notes.push('Good: you ended with a result.');
    if (/\bwe\b/i.test(a) && !/\bi\b/i.test(a)) notes.push('Say what you did yourself, not only the group: use “I”.');
    if (n < 25) notes.push('It’s a bit short for an interview; aim for four or five sentences.');
    return { msgs: [reply(`Thanks. ${notes.join(' ')} Remember, this rehearsal is private and isn’t evidence of anything; it’s just for you.`, { why: 'Practice feedback · not shared',
      actions: [say('Try that one again', 'let me try that interview question again'), say('Another question', 'ask me another interview question', true), nav('Open full interview practice', '/c/interview')] })], frame: { ...f, awaiting: 'next' },
      effects: (w, ac) => { const s = ta(w); (s.rehearsals[pidOf(ac)] ??= []).push({ at: simISO(w), question: f.slots.q, answer: a, notes }); emit(w, ac.id, 'rehearsal.logged', `PERSON:${pidOf(ac)}`, 'Interview rehearsal answer logged (private practice).'); } };
  },
});
reg({
  id: 'ta.rehearse.again', side: 'candidate',
  match: (c) => (cand(c) && c.frame?.intent === 'ta.rehearse' && /\b(try (that|it) (one )?again|again)\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => ({ msgs: [reply(`Go ahead. ${c.frame!.slots.q}`, { kind: 'question' })], frame: { ...c.frame!, awaiting: 'answer', topic: undefined } }),
});

// =====================================================================================================
// CV help: lines drafted ONLY from the person's own claims; never invented
// =====================================================================================================
const TOOL_CAPS: [RegExp, string][] = [[/\bexcel\b/gi, 'Excel'], [/\bgoogle sheets\b/gi, 'Google Sheets'], [/\bpython\b/gi, 'Python'], [/\bsql\b/gi, 'SQL'], [/\bpower ?bi\b/gi, 'Power BI'], [/\bpowerpoint\b/gi, 'PowerPoint'], [/\bcoursera\b/gi, 'Coursera'], [/\bspss\b/gi, 'SPSS']];
/** CV wording: drops "I", filler and repetition and capitalises names. It never adds a fact. */
export function polish(text: string) {
  let s = text.replace(/\.$/, '').trim();
  s = s.replace(/^my final[- ]?year project was (on|about)\s+/i, 'Final-year project on ');
  s = s.replace(/^(i was|i am) (the |a |an )?/i, '');
  s = s.replace(/^i did a survey of\b/i, 'Surveyed').replace(/,?\s*\bi did a survey of\b/gi, '; surveyed');
  s = s.replace(/\b(actually|really|basically|tho|though|lol|like,)\s*/gi, '');
  s = s.replace(/,\s*i\s+/gi, '; ').replace(/^i\s+(\w)/i, (_m, c: string) => c.toUpperCase()).replace(/\s+i\s+/gi, ' ');
  for (const [re, rep] of TOOL_CAPS) s = s.replace(re, rep);
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}.` : s;
}
export function draftCv(p: Profile): CvLine[] {
  const lines: CvLine[] = [];
  if (p.study) lines.push({ id: 'l_study', text: `${p.study.replace(/,?\s*\bi (finished|graduated|completed|left)\b.*$/i, '').replace(/\.$/, '')}${p.year && !p.study.includes(`(${p.year})`) && !/\b(19|20)\d{2}\b/.test(p.study.replace(/,?\s*\bi (finished|graduated|completed|left)\b.*$/i, '')) ? ` (${p.year})` : ''}`, from: 'study', section: 'Education' });
  for (const e of p.experience) for (const cl of e.claims) {
    const body = polish(cl.text);
    const startsWithTitle = body.toLowerCase().startsWith(e.title.toLowerCase().split(' ')[0]);
    const head = e.kind === 'job' ? `${e.title}, ${e.org}${e.when ? ` (${e.when})` : ''}: ` : e.kind === 'course' || startsWithTitle ? '' : `${e.title}${e.org ? `, ${e.org}` : ''}: `;
    lines.push({ id: `l_${cl.id}`, text: `${head}${body}`, from: cl.id, section: e.kind === 'project' || e.kind === 'course' ? 'Projects' : e.kind === 'volunteer' ? 'Volunteering' : 'Work' });
  }
  const tools = p.skills.filter((s) => s.state !== 'suggested').map((s) => s.label);
  if (tools.length) lines.push({ id: 'l_tools', text: `Tools: ${tools.join(', ')}`, from: 'skills', section: 'Skills' });
  return lines;
}
reg({
  id: 'ta.cv', side: 'candidate',
  match: (c) => (cand(c) && /\bcv\b/.test(c.norm) && /\b(help|write|make|build|draft|redraft|redo|again|improve|fix|update|create|better|look at|check|tidy|show)\b/.test(c.norm) && !/\b(upload|attach)\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const p = readProfile(c.w, pid);
    if (!p.answered.length) return { msgs: [reply('I write CV lines only from what you’ve told me, so let’s gather that first. A few small questions; skip anything.', { actions: [say('Set up my profile', 'set up my profile', true), op('Upload a CV', 'ta.cv.choose')] })] };
    const lines = draftCv(p);
    const vague = p.experience.flatMap((e) => e.claims).filter((x) => x.flagged);
    return { msgs: [reply(`Here’s a first draft, built only from what you told me or what your CV says. I tidied the wording into CV style; each line shows the words it came from, and I haven’t added anything. ${p.noJobs || !p.experience.some((e) => e.kind === 'job') ? 'With no job history, projects and volunteering lead, which is what graduate employers expect. ' : ''}${vague.length ? `One line is vague: “${vague[0].text.replace(/\.$/, '')}”. Give me an example and I’ll use your words, or I can drop it.` : ''}`,
      { used: ['Your profile (claims)'], ref: { type: 'ta.cv', id: pid }, why: 'Every line traces to something you said',
        actions: [op('Use these lines', 'ta.cv.approve', {}, true), say('Make it sound more impressive', 'make my cv sound more impressive'), nav('See it on the page', '/c/welcome')] })],
      effects: (w, a) => { ta(w).cv[pidOf(a)] = { lines, status: 'DRAFT', at: simISO(w) }; ui(w, a.id, '/c/welcome', { view: 'cv' }); }, nav: onRoute(c, '/c/welcome') ? undefined : { to: '/c/welcome', label: 'your profile' } };
  },
});
registerOp('ta.cv.approve', (w, _a, actor) => {
  const pid = pidOf(actor); const s = ta(w); const p = readProfile(w, pid);
  s.cv[pid] = { lines: s.cv[pid]?.lines ?? draftCv(p), status: 'APPROVED', at: simISO(w) };
  emit(w, actor.id, 'cv.approved', `PERSON:${pid}`, `CV lines approved (${s.cv[pid]!.lines.length}); private until you apply.`);
  return { say: 'Saved. These lines stay private; they’re only sent if you approve an application. You can download them from your profile page.' };
});
/** Things a CV can't say unless the person said them. */
const INFLATE: { re: RegExp; what: string; check: RegExp }[] = [
  { re: /\b(intern|internship)\b/, what: 'an internship', check: /\bintern/ },
  { re: /\b(worked|work) (at|for|as)\b|\bjob at\b|\bemployed\b/, what: 'a job', check: /\b(worked|employed|job)\b/ },
  { re: /\b(\d+|one|two|three|five) years?\b/, what: 'years of experience', check: /\byears?\b/ },
  { re: /\bpython\b/, what: 'Python', check: /\bpython\b/ }, { re: /\bsql\b/, what: 'SQL', check: /\bsql\b/ }, { re: /\bpower ?bi\b/, what: 'Power BI', check: /\bpower ?bi\b/ },
  { re: /\b(manager|team lead|led a team|supervisor)\b/, what: 'leading a team', check: /\b(led|lead|manag|supervis)\w*/ },
  { re: /\b(expert|advanced|fluent)\b/, what: 'an expert level', check: /\b(expert|advanced|fluent)\b/ },
];
reg({
  id: 'ta.cv.invent', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    if (/\b(more impressive|sound (better|bigger|more experienced)|exaggerat\w*|spice (it )?up|boost|pad (it|my cv)|make (me|it) look (better|experienced))\b/.test(c.norm)) return 0.9;
    const asks = /\b(add|put|say|write|include|make it say|pretend|claim|list|tell them)\b/.test(c.norm) && /\b(cv|profile|that i|i was|i have|i know)\b/.test(c.norm);
    return asks && INFLATE.some((x) => x.re.test(c.norm)) ? 0.91 : 0;
  },
  handle: (c) => {
    const p = readProfile(c.w, pidOf(c.actor)); const txt = profileText(p);
    const asked = INFLATE.filter((x) => x.re.test(c.norm));
    const unsupported = asked.filter((x) => !x.check.test(txt));
    if (asked.length && !unsupported.length) return { msgs: [reply('You’ve already told me about that, so it can go in. I’ll redraft your CV lines with it, in your words.', { actions: [say('Redraft my CV', 'help me write my cv', true)] })] };
    const what = unsupported.length ? list(unsupported.map((x) => x.what)) : null;
    return { msgs: [reply(`${what ? `I can’t add ${what}: you haven’t told me about ${unsupported.length === 1 ? 'it' : 'them'}, and a CV that claims things you can’t talk about tends to fall apart in the interview.` : 'I’ll make it clearer, not bigger: I won’t add anything you didn’t say.'} What I can do: use stronger verbs for what you actually did, and add any real number or result you remember. If you did do something I don’t know about, tell me in your own words (for example “I did a free Python course in 2025”) and I’ll add it as your claim.`,
      { kind: 'refusal', why: 'Q never claims skills you didn’t state or prove', actions: [say('Add something I did', 'i also did a short course', false), say('Show my CV draft', 'help me write my cv', true)] })],
      effects: (w, a) => emit(w, a.id, 'q.declined.fabrication', `PERSON:${pidOf(a)}`, `Q declined to add unsupported claims to the CV${what ? ` (${what})` : ''}.`) };
  },
});

// =====================================================================================================
// T2 · Career atlas (J7) driven by Q: discovery, transferable skills, evidence vs gaps, plan, practice,
// assessment and reassessment, goal changes, disagreement, opportunities, time passing
// =====================================================================================================
const toCareer = (c: QCtx) => (onRoute(c, '/c/career') ? undefined : { to: '/c/career', label: 'your career atlas' });
const view = (v: string, occ?: string) => (w: World, a: Actor) => { ui(w, a.id, '/c/career', { view: v, ...(occ ? { occ } : {}) }); };
const both = (...fs: ((w: World, a: Actor) => void)[]) => (w: World, a: Actor) => fs.forEach((f) => f(w, a));
const ensureJ7 = (w: World, a: Actor) => { j7(w, pidOf(a)); };

reg({
  id: 'ta.j7.discover', side: 'candidate',
  match: (c) => (cand(c) && /\b(where could i go|what (jobs|roles|careers?|work|kind of (jobs|work)) (could|can|might|should) i|career options|options (for|with) me|move into|switch (into|to|careers?)|what else could i do|explore|career atlas|what can i do with|what jobs suit|which careers?|leave sales|out of sales|get out of)\b/.test(c.norm) ? 0.84 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid);
    const near3 = nearest(c.w, pid, S, 3); const goal = occById(P, S.goal)!; const gg = gapsFor(c.w, pid, S, goal);
    const text = P.id === 'graduate'
      ? `Here’s your career atlas. Each point is a kind of job; the closer it sits, the fewer things you still need to show. Things you’ve only mentioned count as claims, not yet as shown, which is normal for a new graduate. Closest for you: ${list(near3.map((x) => `${x.o.label} (${x.g.length} to show; you’ve mentioned ${x.m})`))}. The quickest way to move closer is one reviewed piece of work, like your survey spreadsheet.`
      : `From ${P.id === 'switcher' ? 'sales' : 'where you are'}, the closest roles are ${list(near3.map((x) => `${x.o.label} (${x.g.length} to show)`))}. Your goal, ${goal.label}, is ${plural(gg.length, 'competency', 'competencies')} away. ${P.id === 'switcher' ? 'Business Analyst is close too: it leans on the same stakeholder work you already do.' : ''}`;
    return { msgs: [reply(text, { used: ['Your Passport', ...(P.id === 'graduate' ? ['Your profile (claims)'] : ['Sales executive, Bole Distributors (verified)'])], why: 'Shown as an atlas: distance is what you still need to show',
      actions: [say(P.id === 'switcher' ? 'What transfers from sales?' : 'What skills do I have?', P.id === 'switcher' ? 'what skills transfer from sales' : 'what skills do i have', true), say(`What’s missing for ${goal.short}?`, `what am i missing for ${goal.label.toLowerCase()}`)] })],
      nav: toCareer(c), effects: both(ensureJ7, view('atlas')) };
  },
});
reg({
  id: 'ta.j7.skills', side: 'candidate',
  match: (c) => (cand(c) && /\b(transfer\w*|carry over|what (skills )?do i (already )?have|what am i good at|my strengths|skills i have|what skills|useful from sales|what counts)\b/.test(c.norm) ? 0.85 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid);
    if (P.id === 'graduate') {
      const p = readProfile(c.w, pid);
      const mentioned = P.comps.filter((x) => stateOf(c.w, pid, S, x.id) === 'unclear');
      const shownC = P.comps.filter((x) => ['full', 'verified'].includes(stateOf(c.w, pid, S, x.id)));
      if (!p.answered.length) return { msgs: [reply('I don’t know enough about you yet to say. Tell me about your studies and anything you’ve done, and I’ll show you which skills it points to.', { actions: [say('Set up my profile', 'set up my profile', true)] })] };
      return { msgs: [reply(`From what you’ve told me, you’ve mentioned ${list(mentioned.map((x) => x.label.toLowerCase()))}. ${shownC.length ? `Shown with evidence: ${list(shownC.map((x) => x.label.toLowerCase()))}.` : 'None of them is proven yet, and that’s normal for a new graduate: they’re claims until someone reviews your work.'} The quickest to prove is ${compById(P, focusComp(c.w, pid, S) ?? 'sheets').label.toLowerCase()}, because you already have the project.`,
        { used: ['Your profile (claims)'], why: 'Mentioned is not the same as shown', actions: [say('Quiz me on it', 'quiz me', true), say('Where could I go?', 'what jobs could i do with what i have')] })], nav: toCareer(c), effects: both(ensureJ7, view('skills')) };
    }
    const tr = P.comps.filter((x) => x.from);
    return { msgs: [reply(`From your verified sales work (Bole Distributors, employer letter): ${tr.map((x) => `${x.label.toLowerCase()}, ${x.state === 'verified' ? 'verified' : 'transferable but partial'} (${x.evidence?.notProves.replace(/\.$/, '').toLowerCase()} isn’t shown)`).join('; ')}. That’s real evidence, not just a CV line. What it doesn’t show is the product and analysis work itself.`,
      { used: ['Sales executive, Bole Distributors (verified)'], why: 'Shown as your skills: evidence vs gaps', actions: [say('Evidence vs gaps for my goal', 'show me evidence vs gaps for my goal', true), say('Make me a plan', 'make me a plan')] })],
      nav: toCareer(c), effects: both(ensureJ7, view('skills')) };
  },
});
reg({
  id: 'ta.j7.gaps', side: 'candidate',
  match: (c) => (cand(c) && /\b(gaps?|missing|what do i (still )?need|what else do i need|evidence (vs|versus|and) gaps?|how far|how close|am i ready|ready to apply|what is stopping)\b/.test(c.norm) && !/\bprofile\b/.test(c.norm) ? 0.84 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid);
    const o = occFromText(P, c.norm) ?? occById(P, S.goal)!;
    const by = (k: string[]) => o.needs.filter((n) => k.includes(stateOf(c.w, pid, S, n))).map((n) => compById(P, n).label);
    const ev = by(['verified', 'full']), part = by(['partial']), claim = by(['unclear', 'practice']), none = by(['none']);
    return { msgs: [reply(`${o.label} needs ${plural(o.needs.length, 'thing')}. ${ev.length ? `Shown with evidence: ${list(ev)}. ` : ''}${part.length ? `Partly shown (transferable, not the same thing): ${list(part)}. ` : ''}${claim.length ? `Mentioned or practised only, so not proof: ${list(claim)}. ` : ''}${none.length ? `Not shown yet: ${list(none)}. ` : ''}A gap means no proof yet, not that you can’t do it.${o.demand ? ` ${o.demand}.` : ''}`,
      { used: ['Your evidence', `${o.label} requirements`], why: 'Evidence vs gaps, competency by competency', actions: [say('Make me a plan', 'make me a plan', true), say('Quiz me', 'quiz me')] })],
      nav: toCareer(c), effects: both(ensureJ7, view('role', o.id)) };
  },
});
reg({
  id: 'ta.j7.role', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    const o = occFromText(personaFor(pidOf(c.actor)), c.norm); if (!o) return 0;
    if (/\b(open|show|tell me about|what about|look at|details|what does|explain)\b/.test(c.norm)) return 0.8;
    return onRoute(c, '/c/career') && c.norm.split(' ').length <= 5 ? 0.7 : 0;
  },
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid); const o = occFromText(P, c.norm)!; const g = gapsFor(c.w, pid, S, o);
    return { msgs: [reply(`${o.label} needs ${plural(o.needs.length, 'competency', 'competencies')}. You’ve shown ${o.needs.length - g.length}.${g.length ? ` Still to show: ${list(g.map((x) => compById(P, x).label.toLowerCase()))}.` : ' You could apply today.'}${S.goal === o.id ? ' This is your goal.' : ''}`,
      { why: 'Shown as a role sheet: each competency with its evidence', actions: S.goal === o.id ? [say('Make me a plan', 'show my plan', true)] : [say(`Make ${o.short} my goal`, `make ${o.label.toLowerCase()} my goal instead`, true), say('Back to the atlas', 'where could i go')] })],
      nav: toCareer(c), effects: both(ensureJ7, view('role', o.id)) };
  },
});

// ---------- Goal change: the plan re-points and keeps shared progress (undoable) ----------
reg({
  id: 'ta.j7.goal', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    const o = occFromText(personaFor(pidOf(c.actor)), c.norm);
    const verb = /\b(goal|switch|change|instead|rather|prefer|focus|aim|go for|target|suits? me|better fit|want to (be|become|do)|become|pivot)\b/.test(c.norm);
    if (o && verb) return 0.9;
    if (/\b(change|switch|new) (my )?goal\b/.test(c.norm)) return 0.85;
    return 0;
  },
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid);
    const o = occFromText(P, c.norm);
    if (!o) return { msgs: [reply('Which role would you like to aim for instead?', { kind: 'question', actions: nearest(c.w, pid, S, 3).filter((x) => x.o.id !== S.goal).map((x) => say(x.o.label, `make ${x.o.label.toLowerCase()} my goal`)) })] };
    if (o.id === S.goal) return { msgs: [reply(`${o.label} is already your goal.`, { actions: [say('Show my plan', 'show my plan')] })] };
    const sim = structuredClone(c.w); const r = setGoal(sim, pid, o.id, 'You chose a new goal')!;
    const snap = JSON.stringify(readJ7(c.w, pid));
    return { msgs: [reply(`Done: ${r.to.label} is your goal now, and ${r.from.label} is archived with everything you did for it. Your plan re-pointed. Kept, with progress: ${list(r.kept.map((s) => `“${s.title}”${s.done ? ' (done)' : s.progress ? ` (${s.progress}% through)` : ''}`)) || 'nothing shared'}. Added for ${r.to.short}: ${list(r.added.map((s) => `“${s.title}”`))}. Archived: ${plural(r.archived.length, 'step')} that only served ${r.from.short}. You can switch back any time; nothing is lost.`,
      { kind: 'reply', used: [`Goal: ${r.from.label} → ${r.to.label}`], why: 'Shown as your plan: what changed and what carried over', actions: [say('Undo that', 'undo'), say(`What’s missing for ${r.to.short}?`, `what am i missing for ${r.to.label.toLowerCase()}`, true)] })],
      nav: toCareer(c), effects: (w, a) => { setGoal(w, pid, o.id, 'You chose a new goal'); pushUndo(w, a.id, `Goal change to ${o.label}`, 'ta.j7.restore', { personId: pid, snap }); view('plan')(w, a); } };
  },
});
registerOp('ta.j7.restore', (w, a) => { w.j7[String(a.personId)] = JSON.parse(String(a.snap)); });

reg({
  id: 'ta.j7.plan', side: 'candidate',
  match: (c) => (cand(c) && /\b(my plan|the plan|a plan|plan for|next steps?|what should i do (next|now|first)|roadmap|to-?do|make me a plan|development plan)\b/.test(c.norm) ? 0.83 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid); const goal = occById(P, S.goal)!;
    const left = S.plan.filter((s) => !s.done);
    const kinds = Array.from(new Set(left.map((s) => s.kind.toLowerCase())));
    const od = overdue(c.w, S);
    return { msgs: [reply(`Your plan for ${goal.label}: ${plural(left.length, 'step')} left (${list(kinds)}), about ${Math.round(left.reduce((n, s) => n + s.minutes, 0) / 6) / 10} hours, ${S.plan.length - left.length} done. Next: “${left[0]?.title ?? 'nothing left'}”${left[0]?.due ? `, by ${fmtDay(left[0].due)}` : ''}.${od.length ? ` ${plural(od.length, 'step is', 'steps are')} past the date you planned; move them if your week changed.` : ''} Practice steps help you; only reviewed work changes your map.`,
      { used: [`Goal: ${goal.label}`], why: 'Shown as your plan: ordered by what moves you furthest', actions: [say('Quiz me', 'quiz me', true), say('I disagree with a step', 'i dont agree with the plan')] })],
      nav: toCareer(c), effects: both(ensureJ7, view('plan')) };
  },
});
reg({
  id: 'ta.j7.step', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    if (!/\b(i (have |just )?(finished|done|completed|did)|mark .* (as )?(done|complete)|done with|halfway|half way|half-way|started|i am (doing|on|through))\b/.test(c.norm)) return 0;
    const S = readJ7(c.w, pidOf(c.actor)); const P = personaFor(pidOf(c.actor));
    if (stepFromText(S.plan, c.norm)) return 0.88;
    const comp = compFromText(P, c.norm); return comp && S.plan.some((s) => s.comp === comp.id) ? 0.86 : /\b(step|course)\b/.test(c.norm) ? 0.8 : 0;
  },
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid);
    const comp = compFromText(P, c.norm);
    const kind = /\b(course|module|learning|class)\b/.test(c.norm) ? 'Learning' : /\b(notes|practi[sc]e|question)\b/.test(c.norm) ? 'Practice' : /\b(sample|map|brief|write-?up|interviews?)\b/.test(c.norm) ? 'Work sample' : null;
    const byTitle = stepFromText(S.plan.filter((s) => !s.done), c.norm);
    const cands = S.plan.filter((s) => !s.done && (!comp || s.comp === comp.id));
    const step = byTitle ?? cands.find((s) => !kind || s.kind === kind) ?? cands[0];
    if (!step) return { msgs: [reply('I couldn’t tell which step you mean. Which one?', { kind: 'question', actions: S.plan.filter((s) => !s.done).slice(0, 4).map((s) => say(s.title.slice(0, 40), `i finished ${s.title.toLowerCase()}`)) })] };
    if (step.kind === 'Work sample') return { msgs: [reply(`Great. A work sample only counts once it’s reviewed, so let’s submit “${step.title}” for review (simulated reviewer, rubric shown).`, { actions: [say('Submit it for review', `submit my ${compById(P, step.comp).label.toLowerCase()} work sample for review`, true)] })] };
    const half = /\b(halfway|half way|half-way|started|i am (doing|on|through))\b/.test(c.norm);
    return { msgs: [reply(half ? `Noted: “${step.title}” is about half done. I’ve kept your place.` : `Marked done: “${step.title}”. ${step.kind === 'Learning' ? 'A course helps you learn; it isn’t proof on its own, so your map stays where it is until reviewed work backs it up.' : 'Practice stays private and doesn’t move your map.'}`, { why: 'Progress on your plan · private', actions: [say('Show my plan', 'show my plan')] })],
      effects: (w, a) => { const st = j7(w, pid).plan.find((s) => s.id === step.id)!; if (half) st.progress = 50; else { st.done = true; st.doneAt = simISO(w); st.progress = 100; } emit(w, a.id, 'j7.step.progress', `PERSON:${pid}`, `${half ? 'Half done' : 'Done'}: ${step.title}.`); view('plan')(w, a); } };
  },
});

/** A plan step the person names by its words ("the discovery notes thing", "that spreadsheet course"). */
const STOP = new Set(['about', 'their', 'there', 'which', 'with', 'what', 'from', 'your', 'free', 'external', 'hours', 'question', 'write', 'where']);
function stepFromText(plan: PlanStep[], norm: string): PlanStep | null {
  let best: { s: PlanStep; n: number } | null = null;
  for (const s of plan) {
    const ws = Array.from(new Set(s.title.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter((x) => x.length >= 5 && !STOP.has(x))));
    const n = ws.filter((x) => near(norm, x)).length + (/\bcourse\b/.test(norm) && s.kind === 'Learning' ? 1 : 0);
    if (n >= 2 && (!best || n > best.n)) best = { s, n };
  }
  return best?.s ?? null;
}

// ---------- Disagreement: Q explains its basis, then adjusts on request ----------
reg({
  id: 'ta.j7.disagree', side: 'candidate',
  match: (c) => (cand(c) && /\b(disagree|do not agree|dont agree|not convinced|why (do|would|should) i (need|do|have to)|i do not need|no need for|that is (wrong|not right)|makes no sense|pointless|waste of (my )?time|i already (know|do|can|use|build|make)|i (use|build|make) .* (every|daily|all the time)|do not think i need)\b/.test(c.norm) ? 0.87 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid); const goal = occById(P, S.goal)!;
    const comp = compFromText(P, c.norm);
    if (!comp) return { msgs: [reply('Fair enough to question it. Which part don’t you agree with?', { kind: 'question', actions: S.plan.filter((s) => !s.done).slice(0, 4).map((s) => say(compById(P, s.comp).label, `why do i need ${compById(P, s.comp).label.toLowerCase()}`)) })] };
    const st = stateOf(c.w, pid, S, comp.id); const step = S.plan.find((s) => s.comp === comp.id && !s.done);
    const said = /\b(i (already|use|build|make|do)|every (day|week)|daily)\b/.test(c.norm) ? tidy(c.text) : '';
    const basis = `${comp.why ?? `${goal.label} listings ask for it.`} In your record it’s ${st === 'none' ? 'not shown yet' : st === 'unclear' ? 'mentioned but not shown' : st === 'partial' ? 'partly shown' : st === 'practice' ? 'practised only' : 'shown'}${comp.from ? ' (your sales evidence covers part of it)' : ''}.`;
    return { msgs: [reply(`Here’s my reasoning, so you can judge it. ${basis}${said ? ` You’ve told me “${said.replace(/\.$/, '')}”. I believe you, and I’ve noted it as your claim, but it isn’t something an employer can check yet.` : ''} You know your week better than I do, so it’s your call.${step ? ` For “${step.title}”, I can keep it, swap it for a quicker work sample that shows what you already do, or remove it.` : ''}`,
      { kind: 'question', used: [`${goal.label} requirements`, 'Your record'], why: 'Q’s basis, shown before anything changes',
        actions: step ? [say('Swap it for a work sample', 'swap it for a work sample', true), say('Remove it from my plan', 'remove it from my plan'), say('Keep it', 'ok keep it')] : [] })],
      frame: step ? { intent: 'ta.j7.disagree', slots: { comp: comp.id, step: step.id, said }, awaiting: 'choice', startedAt: new Date().toISOString() } : undefined,
      effects: (w) => { if (said) { const s = j7(w, pid); s.mentioned[comp.id] = said; } } };
  },
  answer: (c) => {
    const f = frameOf(c, 'ta.j7.disagree'); if (!f) return null;
    const pid = pidOf(c.actor); const P = personaFor(pid); const comp = compById(P, f.slots.comp);
    const choice = /\b(swap|replace|instead|work sample|sample)\b/.test(c.norm) ? 'swapped' : /\b(remove|drop|delete|take (it )?out|get rid)\b/.test(c.norm) ? 'removed' : /\b(keep|leave it|fine|you are right|ok)\b/.test(c.norm) ? 'kept' : null;
    if (!choice) return null;
    const snap = JSON.stringify(readJ7(c.w, pid));
    const swapTitle = comp.id === 'sheets' ? 'Share one tracker you built, with the question it answers, for review' : `Show one real example of ${comp.label.toLowerCase()} you’ve done, for review`;
    const text = choice === 'kept' ? 'Okay, it stays in your plan as it is.'
      : choice === 'swapped' ? `Done. I swapped it for “${swapTitle}”. If what you told me is right, this is the faster route: a reviewed example counts as evidence, a course doesn’t.`
      : `Removed from your plan. The gap still shows on your map, because the map reflects evidence, not the plan; you can add it back any time.`;
    return { msgs: [reply(text, { why: 'Adjusted at your request', actions: [say('Undo that', 'undo'), say('Show my plan', 'show my plan', true)] })], frame: null, nav: toCareer(c),
      effects: (w, a) => {
        const S = j7(w, pid); const i = S.plan.findIndex((s) => s.id === f.slots.step);
        if (choice === 'swapped' && i >= 0) S.plan[i] = { ...S.plan[i], id: `${S.plan[i].id}_swap`, title: swapTitle, kind: 'Work sample', minutes: 30, why: 'Swapped at your request: shows what you said you already do.', note: f.slots.said ? `You said: ${f.slots.said}` : undefined };
        if (choice === 'removed' && i >= 0) S.plan.splice(i, 1);
        S.adjustments.push({ at: simISO(w), comp: comp.id, choice, said: f.slots.said || undefined });
        if (choice !== 'kept') pushUndo(w, a.id, `Plan change (${comp.label})`, 'ta.j7.restore', { personId: pid, snap });
        emit(w, a.id, 'j7.plan.adjusted', `PERSON:${pid}`, `Plan step for ${comp.label} ${choice} at the person’s request.`);
        view('plan')(w, a);
      } };
  },
});

// ---------- Practice quiz: private, never proof ----------
reg({
  id: 'ta.j7.quiz', side: 'candidate',
  match: (c) => (cand(c) && /\b(quiz|test me|try a question|a question on|practi[sc]e)\b/.test(c.norm) && !/\binterview\b/.test(c.norm) ? 0.84 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid);
    const comp = compFromText(P, c.norm);
    const sim = structuredClone(c.w); const pr = startQuiz(sim, pid, comp?.id);
    if (!pr) return { msgs: [reply('I don’t have a practice question for that yet in this prototype.')] };
    return { msgs: [reply(`One practice question on ${compById(P, pr.comp).label.toLowerCase()}. It’s private and can’t count for or against you. ${pr.question} ${pr.options.map((o, i) => `(${'abc'[i]}) ${o.text}`).join(' ')}`,
      { kind: 'question', why: 'Practice · private · not proof', actions: pr.options.map((o, i) => op(`${'ABC'[i]}: ${o.text.length > 48 ? `${o.text.slice(0, 46)}…` : o.text}`, 'ta.j7.quiz.answer', { opt: o.id })) })],
      frame: { intent: 'ta.j7.quiz', slots: { comp: pr.comp }, awaiting: 'option', startedAt: new Date().toISOString() }, nav: toCareer(c),
      effects: (w, a) => { startQuiz(w, pid, pr.comp); view('role', occById(P, readJ7(w, pid).goal)?.needs.includes(pr.comp) ? readJ7(w, pid).goal : (P.occs.find((o) => o.needs.includes(pr.comp))?.id ?? readJ7(w, pid).goal))(w, a); } };
  },
  answer: (c) => {
    const f = frameOf(c, 'ta.j7.quiz'); if (!f) return null;
    const pid = pidOf(c.actor); const P = personaFor(pid); const pr = practiceFor(P, f.slots.comp)!;
    const letter = c.norm.match(/^(?:option |answer |i (?:think|pick|choose|go with|would say) |it is |its )?\(?([abc])\)?\b/)?.[1] ?? c.norm.match(/\b(first|second|third|last) (one|option)\b/)?.[1];
    const idx = letter ? (letter === 'first' ? 0 : letter === 'second' ? 1 : letter === 'third' || letter === 'last' ? 2 : 'abc'.indexOf(letter)) : -1;
    const opt = idx >= 0 ? pr.options[idx] : pr.options.find((o) => o.kws.some((k) => c.norm.includes(k)));
    if (!opt) return othersTop(c, ['ta.j7.quiz']) >= 0.8 ? null : { msgs: [reply('Which option: a, b or c? Or describe your approach in a few words.', { kind: 'question' })], frame: f };
    return quizResult(c.w, c.actor, opt.id);
  },
});
function quizResult(w0: World, actor: Actor, optId: string): QReply {
  const pid = pidOf(actor); const P = personaFor(pid);
  const sim = structuredClone(w0); const r = answerQuiz(sim, pid, optId);
  if (!r) return { msgs: [reply('There isn’t a question open right now. Say “quiz me” to start one.')], frame: null };
  const before = employerView(w0, pid).find((x) => x.org === 'org_medlink')!.items.length;
  const sm = P.samples.find((s) => s.comp === r.pr.comp);
  const text = r.verdict === 'right'
    ? `${r.pr.feedback.right} Logged as a private practice attempt. To be clear: this is not proof. Your map hasn’t moved, and what employers can see is unchanged (Medlink would see ${plural(before, 'item')}, exactly as before). To make it count, submit a real piece of work for review.`
    : `${r.pr.feedback[r.verdict]} Logged privately as practice; try again whenever you like.`;
  return { msgs: [reply(text, { why: 'Practice is private and never proof', actions: r.verdict === 'right' ? [...(sm ? [say(`Submit ${sm.title.split(':')[0].toLowerCase()} for review`, `submit my ${compById(P, r.pr.comp).label.toLowerCase()} work sample for review`, true)] : []), say('What can employers see?', 'what can employers see about me')] : [say('Try again', 'quiz me again', true)] })],
    frame: null, effects: (w, a) => { answerQuiz(w, pid, optId); view('role')(w, a); } };
}
registerOp('ta.j7.quiz.answer', (w, a, actor) => {
  const r = quizResult(w, actor, String(a.opt));
  r.effects?.(w, actor);
  for (const m of r.msgs) appendQ(w, actor.id, { who: 'q', engine: 'rules', ...m });
  w.q.frames[actor.id] = null;
});
reg({
  id: 'ta.j7.notproof', side: 'candidate',
  match: (c) => (cand(c) && /\b(i (passed|got it right|aced it|nailed it)|add (it|that|this) to (my )?(profile|cv|passport)|show (it|that|this) to (employers?|recruiters?|medlink|tinda)|does (that|this|it) (count|prove)|(count|counts) as (proof|evidence)|so (now )?i (can|know how to) do)\b/.test(c.norm) && readJ7(c.w, pidOf(c.actor)).record.some((r) => r.cls === 'Practice attempt') ? 0.89 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid); const last = S.record.find((r) => r.cls === 'Practice attempt')!;
    const sm = P.samples.find((s) => s.comp === last.comp);
    const vis = employerView(c.w, pid);
    return { msgs: [reply(`No, and I want to be straight with you about why. Getting a practice question right shows you know the approach; it doesn’t show you can do it on real work, so it never counts as proof and I won’t put it on your profile or show it to employers. Right now ${list(vis.map((v) => `${v.name} sees ${plural(v.items.length, 'item')}`))}, the same as before the quiz.${sm ? ` What would count: “${sm.title}”, reviewed against a rubric (about ${sm.minutes} minutes).` : ''}`,
      { kind: 'refusal', why: 'Practice is never proof', used: ['Your record', 'What employers can see'], actions: sm ? [say('Submit a work sample', `submit my ${compById(P, sm.comp).label.toLowerCase()} work sample for review`, true)] : [] })] };
  },
});

// ---------- Work sample: assessment and reassessment (simulated reviewer) ----------
reg({
  id: 'ta.j7.sample', side: 'candidate',
  match: (c) => {
    if (!cand(c) || onRoute(c, '/c/passport')) return 0;
    // Only for people actually working in their career atlas (an active J7 space, or on /c/career).
    if (!c.w.j7[pidOf(c.actor)] && !onRoute(c, '/c/career')) return 0;
    if (/\b(upload|attach)\b/.test(c.norm) && !onRoute(c, '/c/career')) return 0;
    const S = readJ7(c.w, pidOf(c.actor));
    if (S.assessments.length && /\b(reassess\w*|re-assess\w*|again|improved|new version|second version|updated (it|version|map|brief)|check it again|resubmit|re-submit|look at it again)\b/.test(c.norm) && /\b(map|sample|brief|spreadsheet|it|work|assess\w*)\b/.test(c.norm)) return 0.91;
    if (/\b(submit|send|upload|hand in|turn in)\b.*\b(sample|map|brief|work|spreadsheet|notebook|write-?up)\b/.test(c.norm) || /\b(work sample|for review|get it (reviewed|assessed|checked)|assess (me|it|my)|review my)\b/.test(c.norm)) return 0.87;
    return 0;
  },
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid);
    if (c.w.network === 'offline') return { msgs: [reply('You’re offline, so I can’t send anything for review. Your work is safe; try again when you reconnect.', { kind: 'notice' })] };
    const comp = compFromText(P, c.norm);
    const sim = structuredClone(c.w); const r = submitSample(sim, pid, comp?.id);
    if (!r) return { msgs: [reply('I don’t have a reviewable task for that yet in this prototype.')] };
    const met = r.rubric.filter((x) => x.ok).length;
    const occsTouched = r.moved;
    const text = r.round === 1
      ? `Reviewed (simulated reviewer, rubric v1): “${r.sm.title}” scored level ${r.level} of 4, with ${met} of ${r.rubric.length} criteria met. ${compById(P, r.sm.comp).label} now counts as evidenced, so your map moved: ${plural(occsTouched, 'occupation')} came a ring closer. It proves: ${r.sm.proves.replace(/\.$/, '').toLowerCase()}. It doesn’t prove: ${r.sm.not.replace(/\.$/, '').toLowerCase()}. To improve: ${r.advice} It’s private in your Passport until you choose to share it.`
      : `Reassessed against the same rubric: level ${r.prevLevel} → ${r.level} of 4, with ${met} of ${r.rubric.length} criteria met. Because the conditions were the same, the two scores are comparable, so your progress chart shows a real rise. Still private; share it only if you want to.`;
    return { msgs: [reply(text, { used: [r.sm.title, `Rubric for ${compById(P, r.sm.comp).label}`], ref: { type: 'ta.assess', id: `${pid}:${r.sm.comp}` }, why: r.round === 1 ? 'Back to the atlas: this change moves you' : 'Shown as progress: same rubric, comparable',
      actions: r.round === 1 ? [say('I’ll improve it by Saturday', 'i will improve the map by saturday', true), say('What can employers see?', 'what can employers see about me')] : [say('Show my progress', 'how am i progressing', true), say('Share it with Medlink', 'share my process map with medlink')] })],
      nav: toCareer(c), effects: (w, a) => { submitSample(w, pid, r.sm.comp); const k = ta(w).commitments.find((x) => x.personId === pid && x.state === 'OPEN' && (!x.comp || x.comp === r.sm.comp)); if (k && r.round > 1) k.state = 'KEPT'; view(r.round === 1 ? 'atlas' : 'progress')(w, a); } };
  },
});

// ---------- "I'll do it later": a commitment Q remembers once ----------
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function dueFrom(w: World, norm: string, days: string[]) {
  const base = simNow(w);
  const d = days[0] ?? (/\bweekend\b/.test(norm) ? 'saturday' : '');
  if (d === 'tomorrow') return addDays(base.toISOString(), 1);
  if (d === 'today') return base.toISOString();
  if (d === 'next week' || /\bnext week\b/.test(norm)) return addDays(base.toISOString(), 7);
  const i = WEEKDAYS.indexOf(d);
  if (i >= 0) { const diff = ((i - base.getUTCDay()) + 7) % 7 || 7; return addDays(base.toISOString(), diff); }
  return addDays(base.toISOString(), 3);
}
reg({
  id: 'ta.commit', side: 'candidate',
  match: (c) => (cand(c) && /\b(i will|i'll|i am going to|going to|i plan to|i promise to|remind me to)\b.*\b(add|do|finish|submit|improve|upload|send|write|fix|redo|update|share)\b.*\b(it|that|sample|map|brief|course|cv|profile|work|step|notes|spreadsheet|by|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(c.norm) && !/\b(would like|will like|like to)\b/.test(c.norm) ? 0.8 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid);
    const due = dueFrom(c.w, c.norm, c.ents.days);
    const comp = compFromText(P, c.norm) ?? (readJ7(c.w, pid).assessments.length ? compById(P, readJ7(c.w, pid).assessments[0].comp) : null);
    const text = tidy(c.text.replace(/^(ok(ay)?|cool|thanks|great)[,!. ]+/i, ''));
    return { msgs: [reply(`Noted: “${text.replace(/\.$/, '')}”, by ${fmtDay(due)}. I’ll mention it once if it’s still open then, and not again unless you ask. Say “drop that reminder” any time.`, { why: 'Remembered at your request · private' })],
      effects: (w, a) => { ta(w).commitments.push({ id: `k${Date.now().toString(36)}`, personId: pidOf(a), text, due, at: simISO(w), comp: comp?.id, state: 'OPEN' }); } };
  },
});
reg({
  id: 'ta.commit.drop', side: 'candidate',
  match: (c) => (cand(c) && /\b(drop|forget|cancel|stop)\b.*\b(reminder|that promise|commitment|reminding)\b/.test(c.norm) ? 0.88 : 0),
  handle: () => ({ msgs: [reply('Dropped. I won’t remind you about it.')], effects: (w, a) => { for (const k of ta(w).commitments) if (k.personId === pidOf(a) && k.state === 'OPEN') k.state = 'DROPPED'; } }),
});

// ---------- Time passes (demo control) and "what changed since I was last here" ----------
reg({
  id: 'ta.time', side: 'candidate',
  match: (c) => (cand(c) && (/\b(simulate|skip|jump|fast[- ]?forward|pretend|move)\b.*\b(\d+|a|one|two|three|four|five|six|couple|few) (weeks?|days?)\b/.test(c.norm) || /\b(\d+|three|two|four) weeks later\b/.test(c.norm)) ? 0.95 : 0),
  handle: (c) => {
    const m = c.norm.match(/\b(\d+|a|an|one|two|three|four|five|six|seven|eight|couple|few) (weeks?|days?)\b/);
    const n = m ? (Number(m[1]) || NUMS[m[1]] || 1) * (m[2].startsWith('week') ? 7 : 1) : 21;
    const to = new Date(simNow(c.w).getTime() + n * 864e5);
    return { msgs: [reply(`Simulated: the demo clock moved forward ${plural(n, 'day')}, to ${to.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' })}. Nothing real happened in between; I’ll treat it as you coming back after a break.`, { kind: 'notice', why: 'Demo control · simulated time', actions: [say('What changed?', 'hi im back, what changed since i was last here', true)] })],
      effects: (w, a) => { w.session.offsetDays += n; emit(w, a.id, 'demo.time.skipped', `PERSON:${pidOf(a)}`, `Demo clock moved forward ${n} days.`); } };
  },
});
registerOp('ta.time.skip', (w, a, actor) => {
  const n = Number(a.days ?? 21); w.session.offsetDays += n;
  emit(w, actor.id, 'demo.time.skipped', `PERSON:${pidOf(actor)}`, `Demo clock moved forward ${n} days.`);
  appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'notice', text: `Simulated: ${plural(n, 'day')} later (${simNow(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' })}). Nothing real happened in between.`, actions: [say('What changed?', 'hi im back, what changed since i was last here', true)] });
});
reg({
  id: 'ta.j7.changes', side: 'candidate',
  match: (c) => (cand(c) && /\b(what (has )?changed|what did i miss|catch me up|i am back|im back|i'm back|been a while|since i was (last )?here|since last time|where did we leave|remind me where|anything new)\b/.test(c.norm) && (personaFor(pidOf(c.actor)).id !== 'graduate' || !!c.w.j7[pidOf(c.actor)]) ? 0.86 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const S = readJ7(c.w, pid); const ch = changesSince(c.w, pid); const goal = occById(P, S.goal)!;
    const ks = taRead(c.w).commitments.filter((k) => k.personId === pid && k.state === 'OPEN');
    const kDue = ks.filter((k) => new Date(k.due).getTime() < simNow(c.w).getTime());
    const parts: string[] = [];
    parts.push(`Welcome back, ${c.actor.first}. It’s been ${plural(ch.days, 'day')} since ${fmtDay(ch.since)}.`);
    parts.push(`Your goal is still ${goal.label}.`);
    if (ch.doneSince.length) parts.push(`Done since then: ${list(ch.doneSince.map((s) => `“${s.title}”`))}.`);
    if (ch.od.length) parts.push(`Past the date you planned: ${list(ch.od.map((s) => `“${s.title}” (${fmtDay(s.due!)})`))}. No problem; I can move them.`);
    if (kDue.length) parts.push(`You said you’d ${kDue.map((k) => k.text.replace(/^I('ll| will) /i, '').replace(/\.$/, '')).join('; ')}, by ${fmtDay(kDue[0].due)}. It’s still open.`);
    if (ch.stalePractice.length) parts.push(`Stale: your practice from ${fmtDay(ch.stalePractice[0].at)} is ${Math.round(ch.days / 7)} weeks old; practice fades, so a quick redo helps before an interview. Your reviewed work doesn’t go stale this fast.`);
    if (ch.jobNotes.length) parts.push(`Openings: ${ch.jobNotes.map((x) => `${x.j.title} at ${c.w.orgs.find((o) => o.id === x.j.orgId)?.name}: ${x.note}`).join('; ')}.`);
    parts.push(`What employers can see hasn’t changed (${plural(ch.visible, 'item')} in total).`);
    return { msgs: [reply(parts.join(' '), { used: ['Your plan', 'Your record', 'Open listings'], why: 'Summary of what changed and what is stale',
      actions: [...(S.assessments.length ? [say('Reassess my improved work', `i improved the ${compById(P, S.assessments[0].comp).label.toLowerCase()} sample, reassess it`, true)] : [say('Quiz me', 'quiz me', true)]), op('Move overdue steps to next week', 'ta.j7.reschedule', { days: 7 }), say('Show my plan', 'show my plan')] })],
      nav: toCareer(c), effects: (w, a) => { const s = j7(w, pid); s.lastVisit = simISO(w); ta(w).lastSeen[pid] = simISO(w); view('plan')(w, a); } };
  },
});
registerOp('ta.j7.reschedule', (w, a, actor) => {
  const pid = pidOf(actor); const S = j7(w, pid); const od = overdue(w, S);
  for (const s of od) s.due = addDays(simISO(w), Number(a.days ?? 7));
  return { say: od.length ? `Moved ${plural(od.length, 'step')} to ${fmtDay(addDays(simISO(w), Number(a.days ?? 7)))}.` : 'Nothing is overdue.' };
});

reg({
  id: 'ta.j7.view', side: 'candidate',
  match: (c) => (cand(c) && /\b(my record|history of|how am i (doing|progressing)|how have i (done|improved|progressed)|my progress|progress over time|show progress|am i improving)\b/.test(c.norm) ? 0.82 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const S = readJ7(c.w, pid); const rec = /\brecord|history\b/.test(c.norm);
    const as = S.assessments; const prog = as.length > 1 ? `Assessed twice on the same rubric: level ${as[0].level} → ${as[as.length - 1].level}.` : as.length ? `One assessment so far (level ${as[0].level}); a second, comparable one would show a trend.` : 'No assessed work yet, so there’s no trend to show; practice appears as dots, never as a line.';
    return { msgs: [reply(rec ? `Your record, newest first. Each change shows its kind of evidence, why it counted and what it doesn’t prove. ${S.record.length} entries.` : `${prog} Practice shows as dots, never joined, because it isn’t comparable.`, { why: rec ? 'Shown as your record' : 'Shown as progress over time' })],
      nav: toCareer(c), effects: both(ensureJ7, view(rec ? 'record' : 'progress')) };
  },
});
reg({
  id: 'ta.j7.learn', side: 'candidate',
  match: (c) => (cand(c) && /\b(course|learn|learning|resource|tutorial|class|where can i study|teach me)\b/.test(c.norm) && !!compFromText(personaFor(pidOf(c.actor)), c.norm) && !/\b(finished|done|completed|halfway|did|took|have done|i (actually|also) )\b/.test(c.norm) ? 0.82 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const P = personaFor(pid); const comp = compFromText(P, c.norm)!; const S = readJ7(c.w, pid);
    const step = P.steps.find((s) => s.comp === comp.id && s.kind === 'Learning');
    if (!step) return { msgs: [reply(`I don’t have a vetted learning resource for ${comp.label.toLowerCase()} in this prototype. A reviewed work sample is the stronger route anyway.`)] };
    const has = S.plan.some((s) => s.id === step.id);
    return { msgs: [reply(`${step.resource}. ${has ? 'It’s already in your plan.' : 'I’ve added it to your plan.'} Learning helps, but a course on its own isn’t proof; pair it with a small piece of real work.`, { why: 'Learning resource · external, illustrative', actions: [say('Show my plan', 'show my plan', true)] })],
      nav: toCareer(c), effects: (w, a) => { const s = j7(w, pid); if (!s.plan.some((x) => x.id === step.id)) { s.plan.push({ ...step, due: addDays(simISO(w), step.dueIn) }); s.adjustments.push({ at: simISO(w), comp: comp.id, choice: 'added' }); } view('plan')(w, a); } };
  },
});

// ---------- Privacy: what employers can see, and explicit, approved sharing ----------
reg({
  id: 'ta.privacy', side: 'candidate',
  match: (c) => (cand(c) && /\b(what (can|do|does|will) (employers?|recruiters?|medlink|tinda|kora|companies|they) see|who can see|is (this|it|my \w+) (private|visible|public|shared)|can (employers?|recruiters?) see|visible to|recruiter-visible|my public profile)\b/.test(c.norm) ? 0.87 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const v = employerView(c.w, pid);
    const S = c.w.j7[pid] ? readJ7(c.w, pid) : null;
    return { msgs: [reply(`Right now: ${v.map((x) => `${x.name} sees ${x.items.length ? `${plural(x.items.length, 'item')} (${x.items.map((i) => i.title).slice(0, 2).join('; ')})` : 'nothing'}`).join('; ')}. ${S ? `Your career plan, practice and ${S.assessments.length ? 'assessed work' : 'record'} are private to you; they never become visible on their own. ` : ''}Sharing anything is a separate step you approve, item by item, and you can take it back.`,
      { used: ['Your Passport sharing settings'], why: 'Only what you’ve shared, per employer', actions: [nav('Open my Evidence Passport', '/c/passport')] })] };
  },
});
reg({
  id: 'ta.share', side: 'candidate',
  match: (c) => (cand(c) && /\b(share|show|send|give)\b.*\b(with|to)\b.*\b(medlink|tinda|kora|employers?|recruiters?)\b/.test(c.norm) && !/\bwhat\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const pid = pidOf(c.actor); const org = c.w.orgs.find((o) => c.norm.includes(o.name.toLowerCase().split(' ')[0]));
    if (/\b(quiz|practi[sc]e|plan)\b/.test(c.norm)) return { msgs: [reply('Practice and your career plan can’t be shared: they’re private by design and aren’t proof. I can share reviewed work or your profile claims instead.', { kind: 'refusal' })] };
    if (!org) return { msgs: [reply('Which employer would you like to share it with?', { kind: 'question' })] };
    const P = personaFor(pid); const comp = compFromText(P, c.norm);
    const ev = c.w.evidence.find((e) => e.ownerId === pid && e.origin === 'J7' && e.kind === 'ASSESSMENT' && (!comp || e.evidenceId.endsWith(`_${comp.id}`)));
    if (!ev) return { msgs: [reply('There’s no reviewed work to share yet. Practice can’t be shared; a reviewed work sample can.', { actions: [say('Submit a work sample', 'submit my work sample for review', true)] })] };
    if (ev.sharedWith.includes(org.id)) return { msgs: [reply(`${org.name} can already see “${ev.title}”.`)] };
    return { msgs: [reply(`Share “${ev.title}” with ${org.name}? They’d see the result, what it proves and what it doesn’t. Nothing else from your career space goes with it, and you can take it back any time.`, { kind: 'approval', why: 'Needs your yes: shares evidence with an employer',
      actions: [op(`Share with ${org.name}`, 'ta.share.do', { evidenceId: ev.evidenceId, orgId: org.id }, true), say('Not now', 'not now')] })] };
  },
});
registerOp('ta.share.do', (w, a, actor) => {
  const ev = w.evidence.find((e) => e.evidenceId === a.evidenceId && e.ownerId === actor.personId); const org = w.orgs.find((o) => o.id === a.orgId);
  if (!ev || !org || ev.kind === 'PRACTICE') return { say: 'I couldn’t share that.' };
  if (ev.visibility === 'PRIVATE') ev.visibility = 'SHARED_WITH';
  if (!ev.sharedWith.includes(org.id)) ev.sharedWith.push(org.id);
  ev.revokedFrom = (ev.revokedFrom ?? []).filter((x) => x !== org.id);
  emit(w, actor.id, 'evidence.shared', `SHARED:${org.id}:${pidOf(actor)}`, `${actor.name} shared “${ev.title}” with ${org.name}.`, { evidenceId: ev.evidenceId });
  pushUndo(w, actor.id, `Sharing with ${org.name}`, 'ta.share.undo', { evidenceId: ev.evidenceId, orgId: org.id });
  return { say: `Shared with ${org.name} (simulated). They see only this item. You can take it back from your Passport, or say “undo”.` };
});
registerOp('ta.share.undo', (w, a) => { const ev = w.evidence.find((e) => e.evidenceId === a.evidenceId); if (ev) { ev.sharedWith = ev.sharedWith.filter((x) => x !== a.orgId); if (!ev.sharedWith.length && ev.visibility === 'SHARED_WITH') ev.visibility = 'PRIVATE'; } });

// Steps and buttons on the atlas page go through Q too, so the conversation records what happened.
registerOp('ta.j7.goal.set', (w, a, actor) => {
  const pid = pidOf(actor); const snap = JSON.stringify(readJ7(w, pid));
  const r = setGoal(w, pid, String(a.occ), 'You chose a new goal'); if (!r) return;
  pushUndo(w, actor.id, `Goal change to ${r.to.label}`, 'ta.j7.restore', { personId: pid, snap });
  ui(w, actor.id, '/c/career', { view: 'plan' });
  appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'reply', text: `Done: ${r.to.label} is your goal; ${r.from.label} is archived with everything you did for it. Kept with progress: ${plural(r.kept.length, 'step')}. Added: ${plural(r.added.length, 'step')}.`, actions: [say('Undo that', 'undo')] });
});
registerOp('ta.j7.step.toggle', (w, a, actor) => {
  const S = j7(w, pidOf(actor)); const s = S.plan.find((x) => x.id === a.id); if (!s) return;
  s.done = !s.done; s.doneAt = s.done ? simISO(w) : undefined; s.progress = s.done ? 100 : 0;
  return { say: s.done ? `Marked done: “${s.title}”.` : `Back on your list: “${s.title}”.` };
});
registerOp('ta.j7.step.move', (w, a, actor) => { const S = j7(w, pidOf(actor)); const i = S.plan.findIndex((x) => x.id === a.id); const j = i + Number(a.d); if (i < 0 || j < 0 || j >= S.plan.length) return; [S.plan[i], S.plan[j]] = [S.plan[j], S.plan[i]]; });
registerOp('ta.j7.step.remove', (w, a, actor) => {
  const pid = pidOf(actor); const S = j7(w, pid); const s = S.plan.find((x) => x.id === a.id); if (!s) return;
  pushUndo(w, actor.id, `Removed “${s.title}”`, 'ta.j7.restore', { personId: pid, snap: JSON.stringify(S) });
  S.plan = S.plan.filter((x) => x.id !== a.id);
  return { say: `Removed “${s.title}” from your plan. The gap stays on your map until evidence closes it. Say “undo” to bring it back.` };
});
registerOp('ta.j7.quiz.start', (w, a, actor) => {
  const pr = startQuiz(w, pidOf(actor), a.comp ? String(a.comp) : undefined); if (!pr) return;
  const P = personaFor(pidOf(actor));
  w.q.frames[actor.id] = { intent: 'ta.j7.quiz', slots: { comp: pr.comp }, awaiting: 'option', startedAt: new Date().toISOString() };
  appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'question', why: 'Practice · private · not proof', text: `One practice question on ${compById(P, pr.comp).label.toLowerCase()}. Answer on the page or here: a, b or c.` });
});
registerOp('ta.j7.sample.submit', (w, a, actor) => {
  const pid = pidOf(actor); const r = submitSample(w, pid, a.comp ? String(a.comp) : undefined); if (!r) return;
  const P = personaFor(pid);
  appendQ(w, actor.id, { who: 'q', engine: 'rules', kind: 'reply', ref: { type: 'ta.assess', id: `${pid}:${r.sm.comp}` }, text: r.round === 1 ? `Reviewed (simulated): level ${r.level} of 4. ${compById(P, r.sm.comp).label} now counts as evidenced; ${plural(r.moved, 'occupation')} moved a ring closer. To improve: ${r.advice}` : `Reassessed on the same rubric: level ${r.prevLevel} → ${r.level}.` });
});
void gapsFor;
