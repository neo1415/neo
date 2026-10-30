// ASSESS Q skills: everything on the assessment pages can be asked of Q, in plain words. Matches are narrow (they name
// the question bank, the live room, a transcript, coaching, an exercise or the avatar) so they never take turns that
// belong to the interview copilot (R2), the rubric studio or the candidate interview room (T4).
import { registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import type { QAction } from '../../state/domain';
import { assess } from '../../state/areas/assess';
import {
  AVATAR_COST, KIND_WORD, banksOf, canEdit, coachedInterviews, coachingFor, draftOf, exercisesFor, feedbackForCandidate, ivOf, lockedOf, orgName,
  personFirst, readRoom, screenQuestion, leadingOf,
} from '../../journeys/assess/model';
import '../../journeys/assess/ops';

const reply = (text: string, extra: Partial<QReply['msgs'][number]> = {}): QReply['msgs'][number] => ({ kind: 'reply', text, ...extra });
const rec = (c: QCtx) => c.actor.side === 'recruiter' && !!c.actor.orgId;
const cand = (c: QCtx) => c.actor.side === 'candidate' && !!c.actor.personId;
const doA = (label: string, op: string, args: Record<string, unknown> = {}, primary = false): QAction => ({ label, primary, act: { t: 'do', op, args } });
const navA = (label: string, to: string, primary = false): QAction => ({ label, primary, act: { t: 'nav', to } });
const ivInRoute = (route: string) => route.match(/\/r\/interviews\/(i_\w+)/)?.[1];
/** The interview the person means: from the route, a named person, or the one room they have open. */
function ivFor(c: QCtx): string | undefined {
  const r = ivInRoute(c.route); if (r) return r;
  const ivs = c.w.interviews.filter((i) => i.orgId === c.actor.orgId && i.status !== 'CANCELLED');
  const named = ivs.find((i) => c.ents.people.includes(i.personId) && i.mandateId === 'm_backend') ?? ivs.find((i) => c.ents.people.includes(i.personId));
  if (named) return named.id;
  const open = Object.values(assess(c.w).rooms).find((x) => x.state !== 'ENDED' && ivOf(c.w, x.interviewId)?.orgId === c.actor.orgId && ivOf(c.w, x.interviewId)?.panel.includes(c.actor.id));
  return open?.interviewId ?? Object.values(assess(c.w).rooms).filter((x) => ivOf(c.w, x.interviewId)?.orgId === c.actor.orgId && x.turns.some((t) => t.by === c.actor.id)).slice(-1)[0]?.interviewId;
}
const FACE = /\b(nervous|confident|confidence|accent|voice|face|facial|body language|eye contact|personality|emotion|honest|lying|smile|smiled)\b/;

// ---------------------------------------------------------------- Question bank (SC-095, V14)
registerSkill({
  id: 'as.bank', side: 'recruiter',
  match: (c) => (rec(c) && (/\bquestion bank\b|\b(our|the|my|locked|approved) (interview )?questions\b|\block (the |our )?(draft|questions|bank|v\d)\b|\bupload (the |our |my )?(interview )?questions\b|\bwho can edit (the )?questions\b|\b(add|put) .* (to|in|into) the (question )?bank\b/.test(c.norm) || (c.route === '/r/questions' && /\b(lock|upload|edit|add|draft|version)\b/.test(c.norm))) ? 0.9 : 0),
  handle: (c) => {
    const b = banksOf(c.w, c.actor.orgId)[0];
    if (!b) return { msgs: [reply('Your organisation has no question bank yet. You can upload one, and I’ll screen each question for fairness first.', { actions: [navA('Open the question bank', '/r/questions', true)] })] };
    const lv = lockedOf(b); const d = draftOf(b); const nav = c.route === '/r/questions' ? undefined : { to: '/r/questions', label: 'the question bank' };
    const quoted = c.text.match(/[“"]([^”"]{12,})[”"]/)?.[1] ?? c.text.match(/(?:add|put)(?: the question)?:?\s+(.{12,}?)\s+(?:to|in|into) the (?:question )?bank/i)?.[1];
    if (quoted) {
      const bad = screenQuestion(quoted); const lead = leadingOf(quoted);
      if (bad) return { msgs: [reply(`I can’t add that. ${bad.why} Instead: ${bad.instead}`, { kind: 'refusal' })] };
      if (lead) return { msgs: [reply(`That’s a leading question. ${lead}`, { kind: 'refusal' })] };
      return { msgs: [reply(`Add “${quoted}” to a draft? It isn’t used until the draft is locked.`, { kind: 'approval', actions: [doA('Add it to the draft', 'as.bank.add', { bankId: b.id, text: quoted }, true)] })], nav };
    }
    if (/\bupload\b/.test(c.norm)) return { msgs: [reply('Uploading adds to a draft. I screen every line for fairness and leading wording; nothing is used until someone with edit rights locks it.', { actions: [doA('Upload kora-backend-round2.csv (simulated)', 'as.bank.upload', { bankId: b.id }, true)] })], nav };
    if (/\block\b/.test(c.norm)) {
      if (!d) return { msgs: [reply(`v${lv?.v} is already locked and there’s no draft to lock.`)], nav };
      if (!canEdit(b, c.actor)) return { msgs: [reply(`Only ${b.editors.map((e) => c.w.actors.find((a) => a.id === e)?.first).join(' and ')} can lock this bank.`, { kind: 'refusal' })] };
      return { msgs: [reply(`Lock draft v${d.v} (${d.questions.length} questions)? New interview plans will ask them word for word; plans already made keep v${lv?.v}.`, { kind: 'approval', actions: [doA(`Lock v${d.v}`, 'as.bank.lock', { bankId: b.id }, true), navA('Look at the draft first', '/r/questions')] })] };
    }
    const who = c.w.actors.find((a) => a.orgId === b.orgId && a.side === 'recruiter' && new RegExp(`\\b${a.first.toLowerCase()}\\b`).test(c.norm));
    if (who && /\b(edit|change|can)\b/.test(c.norm) && /\b(let|give|allow|add|remove|stop|take away)\b/.test(c.norm)) {
      const on = !/\b(remove|stop|take away)\b/.test(c.norm);
      return { msgs: [reply(`${on ? 'Let' : 'Stop'} ${who.first} ${on ? 'edit' : 'editing'} the question bank?`, { kind: 'approval', actions: [doA(on ? `Let ${who.first} edit` : `Remove ${who.first}’s edit rights`, 'as.bank.editor', { bankId: b.id, actorId: who.id, on }, true)] })] };
    }
    if (/\bwho\b/.test(c.norm)) return { msgs: [reply(`${b.editors.map((e) => c.w.actors.find((a) => a.id === e)?.name).join(' and ')} can edit drafts and lock versions. Everyone else at ${orgName(c.w, b.orgId)} can read and use the locked version.`)], nav };
    return { msgs: [reply(`${b.title}: v${lv?.v} is locked with ${lv?.questions.length} questions${d ? `, and draft v${d.v} is waiting to be locked` : ''}. Locked questions are asked word for word; I only ever add a follow-up beside them.`, { actions: [navA('Open the question bank', '/r/questions', true)] })], nav };
  },
});

// ---------------------------------------------------------------- Plan (MO-018) and live room (SC-103, MO-023)
registerSkill({
  id: 'as.live', side: 'recruiter',
  match: (c) => {
    if (!rec(c)) return 0;
    if (/\blive room\b|\binterview room\b/.test(c.norm)) return 0.9;
    if (/\b(question|interview) plan\b|\bplan (the|for|my) .*interview\b/.test(c.norm)) return 0.88;
    if (/\/live$/.test(c.route) && /\b(follow-?up|suggestion|suggest|hide|show|record|recording|end|consent|drop|reconnect|ask)\b/.test(c.norm)) return 0.92;
    return 0;
  },
  handle: (c) => {
    const id = ivFor(c);
    if (!id) return { msgs: [reply('Which interview? Name the candidate, or open one from Assessments.', { kind: 'question', actions: [navA('Assessments', '/r/assess')] })] };
    const iv = ivOf(c.w, id)!; const first = personFirst(c.w, iv.personId); const r = readRoom(c.w, id);
    const to = `/r/interviews/${id}/live`; const nav = c.route === to ? undefined : { to, label: 'the live interview room' };
    if (/\bplan\b/.test(c.norm)) return { msgs: [reply(`Building ${first}’s plan from the locked bank: must-haves first, least-shown first, so you go deeper where the evidence is thin.`, { actions: [doA('Build the plan', 'as.plan.build', { id }, true), navA('Open the live room', to)] })], nav };
    if (/\b(hide|close)\b/.test(c.norm)) return { msgs: [reply('Done: my follow-ups are hidden. Say “show suggestions” to bring them back.')], effects: (w, a) => { if (readRoom(w, id)?.panel === 'OPEN') assess(w).rooms[id].panel = 'HIDDEN'; void a; }, nav };
    if (/\bshow\b/.test(c.norm) && /\b(suggestion|follow)/.test(c.norm)) return { msgs: [reply('My follow-ups are back in the side panel. Only interviewers see them.')], effects: (w) => { if (readRoom(w, id)) assess(w).rooms[id].panel = 'OPEN'; }, nav };
    if (/\b(follow-?up|suggest)/.test(c.norm)) {
      const s = (r?.suggestions ?? []).filter((x) => x.state === 'NEW');
      if (!s.length) return { msgs: [reply(`Nothing to suggest right now: ${first}’s last answer was specific. When an answer sounds general, a follow-up appears in the side panel, for interviewers only.`)], nav };
      return { msgs: [reply(`For you only (${first} doesn’t see this): “${s[0].text}” ${s[0].why}`, { actions: [doA('Ask it', 'as.live', { id, kind: 'suggestion', sid: s[0].id, use: true }, true), doA('Not now', 'as.live', { id, kind: 'suggestion', sid: s[0].id })] })], nav };
    }
    if (/\b(record|recording)\b/.test(c.norm)) {
      if (r?.consent.recording !== 'YES') return { msgs: [reply(`I can’t start recording: ${first} hasn’t said yes${r?.consent.recording === 'NO' ? ' (they said no, and that stands)' : ''}. ${r?.consent.recording === 'NO' ? '' : 'Ask them first.'}`, { kind: 'refusal', actions: r?.consent.recording === 'NO' ? [] : [doA(`Ask ${first} to agree`, 'as.live', { id, kind: 'ask-consent' }, true)] })], nav };
      return { msgs: [reply(`${first} agreed, so recording can start.`, { actions: [doA('Start recording', 'as.live', { id, kind: 'record', on: true }, true)] })], nav };
    }
    if (/\bend\b/.test(c.norm)) return { msgs: [reply(`End the interview with ${first}? You can’t add to it afterwards.`, { kind: 'approval', actions: [doA('End it', 'as.live', { id, kind: 'end' }, true)] })], nav };
    const asked = r?.turns.filter((t) => t.who === 'INT').length ?? 0;
    return { msgs: [reply(`${first}’s room: ${r ? ({ LOBBY: 'open, not started', LIVE: `live, ${asked} questions asked`, INTERRUPTED: 'connection lost', ENDED: 'ended' } as const)[r.state] : 'not opened yet'}. ${first} is told I’m here for the interviewers; my follow-ups go only to you.`, { actions: [navA('Open the live room', to, true)] })], nav };
  },
});

// ---------------------------------------------------------------- Transcript (SC-106), score review (MO-026), feedback (SC-107)
registerSkill({
  id: 'as.review', side: 'recruiter',
  match: (c) => (rec(c) && (/\btranscript\b/.test(c.norm) || /\b(score|scores|rating|ratings) review\b|\breview (the |his |her |their )?(interview )?(scores|ratings)\b|\bpropose ratings from (the )?interview\b|\b(share|send) (the |his |her |their |interview )?feedback\b/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const id = ivFor(c); if (!id) return { msgs: [reply('Which interview? Name the candidate.', { kind: 'question' })] };
    const iv = ivOf(c.w, id)!; const first = personFirst(c.w, iv.personId);
    if (/\btranscript\b/.test(c.norm)) return { msgs: [reply(`${first}’s transcript has only what was recorded after they said yes, for the panel and the role’s recruiter. Mark answers as evidence there; they feed the score review.`)], nav: { to: `/r/interviews/${id}/transcript`, label: 'the transcript' } };
    if (/\bfeedback\b/.test(c.norm)) {
      const f = assess(c.w).feedback[id];
      if (f?.state === 'SHARED') return { msgs: [reply(`You already shared feedback with ${first}. They see exactly what you approved.`)] };
      return { msgs: [reply(`I drafted feedback for ${first} from the marked answers. Choose what to share; they see only that, and nothing about the score.`, { actions: [navA('Choose what to share', `/r/interviews/${id}/review`, true), doA(`Share the draft as it is`, 'as.feedback.share', { id })] })] };
    }
    return { msgs: [reply(`Start with what’s uncertain: criteria with no evidence stay unknown, not zero, and general answers carry high uncertainty. Then confirm or change each rating.`, { actions: [doA('Propose ratings from the marked answers', 'as.review.propose', { id }, true)] })], nav: { to: `/r/interviews/${id}/review`, label: 'the score review' } };
  },
});

// ---------------------------------------------------------------- Coaching (SC-109, V20)
registerSkill({
  id: 'as.coaching', side: 'recruiter',
  match: (c) => (rec(c) && (/\bcoach(ing)? me\b|\binterview(er)? coaching\b|\bhow did i do\b|\bdid i talk too much\b|\bmy coaching\b|\bwas (that|my question) leading\b|\bmy interviewing\b/.test(c.norm) || (c.route === '/r/coaching' && /\b(why|what|how)\b/.test(c.norm))) ? 0.9 : 0),
  handle: (c) => {
    if (FACE.test(c.norm)) return { msgs: [reply('Coaching is about your questions and how the interview ran, never the candidate’s face, voice, accent, nerves or personality. I don’t read those, and they’re not part of any rubric.', { kind: 'refusal', used: ['Fair-hiring rule: no inferences from face or voice'] })] };
    const ids = coachedInterviews(c.w, c.actor); const id = ivInRoute(c.route) ?? (c.ents.people.length ? ids.find((i) => c.ents.people.includes(ivOf(c.w, i)?.personId ?? '')) : undefined) ?? ids.slice(-1)[0];
    const k = id ? coachingFor(c.w, c.actor, id) : null;
    if (!k) return { msgs: [reply('There’s nothing to coach yet: coaching comes from interviews you ran in the live room. It’s private to you.', { actions: [navA('Assessments', '/r/assess')] })] };
    const first = personFirst(c.w, ivOf(c.w, id!)!.personId);
    const bits = [`You did ${k.talk.share}% of the talking`, k.leading.length ? `${k.leading.length} leading question${k.leading.length === 1 ? '' : 's'}` : 'no leading questions', k.unasked.length ? `must-haves not asked: ${k.unasked.join(', ')}` : 'every must-have asked', k.noFollowUp.length ? `no follow-up after a general answer on ${k.noFollowUp.join(', ')}` : ''].filter(Boolean);
    return { msgs: [reply(`From your interview with ${first} (private to you): ${bits.join('; ')}. This is about your questions, not about ${first}.`, { actions: [navA('Open your coaching', `/r/coaching?i=${id}`, true)] })] };
  },
});

// ---------------------------------------------------------------- Exercises: recruiter (SC-111–113)
registerSkill({
  id: 'as.exercise.rec', side: 'recruiter',
  match: (c) => (rec(c) && /\b(exercise|exercises|sandbox|code test|incident investigation|customer conversation|roleplay|role-play)\b/.test(c.norm) && !/\brubric\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const list = exercisesFor(c.w, c.actor);
    const e = list.find((x) => c.ents.people.includes(x.personId)) ?? list.find((x) => x.state === 'SUBMITTED');
    const outcome = /\bpart\b|partly|partial/.test(c.norm) ? 'PARTLY' : /\b(did not|didn’t|not) show\b/.test(c.norm) ? 'NOT_SHOWN' : /\bshows? it\b|\bpass(ed)?\b/.test(c.norm) ? 'SHOWS_IT' : null;
    const note = c.text.match(/\b(?:because|note:?)\s+(.{6,})$/i)?.[1];
    if (e && outcome && e.state === 'SUBMITTED') {
      if (!note) return { msgs: [reply(`What did it show? Add a short note, for example “…because the index is right but the query still reads JSON”. It’s kept with the result.`, { kind: 'question' })] };
      return { msgs: [reply(`Mark ${personFirst(c.w, e.personId)}’s “${e.title}” as ${outcome === 'SHOWS_IT' ? 'shows it' : outcome === 'PARTLY' ? 'shows part of it' : 'didn’t show it'}, with your note? It then counts as ${outcome === 'NOT_SHOWN' ? 'not shown' : 'assessed'}.`, { kind: 'approval', actions: [doA('Save the review', 'as.ex', { id: e.id, kind: 'review', outcome, note }, true), doA('Save and share the note', 'as.ex', { id: e.id, kind: 'review', outcome, note, share: true })] })] };
    }
    const waiting = list.filter((x) => x.state === 'SUBMITTED');
    return { msgs: [reply(waiting.length ? `${waiting.length} waiting for review: ${waiting.map((x) => `${personFirst(c.w, x.personId)} (${KIND_WORD[x.kind].toLowerCase()})`).join(', ')}. Each is self-reported until you review it.` : `Nothing waiting. ${list.length} exercise${list.length === 1 ? '' : 's'} sent; results stay self-reported until a person reviews them.`, { actions: [navA('Open exercises', '/r/exercises', true)] })], nav: c.route === '/r/exercises' ? undefined : { to: '/r/exercises', label: 'exercises' } };
  },
});

// ---------------------------------------------------------------- Avatar option: employer (SC-102)
registerSkill({
  id: 'as.avatar.rec', side: 'recruiter',
  match: (c) => (rec(c) && /\b(avatar|tavus)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const on = !!assess(c.w).avatarSettings[c.actor.orgId!]?.enabled;
    if (/\b(cost|price|how much)\b/.test(c.norm)) return { msgs: [reply(`About $${AVATAR_COST.perMinute.toFixed(2)} a minute, so roughly $${(AVATAR_COST.perMinute * AVATAR_COST.minutes).toFixed(0)} for a ${AVATAR_COST.minutes}-minute round. That’s a hypothesis from sampled public pricing, not a quote; confirm it with the provider.`)] };
    if (/\b(turn off|switch off|disable|stop offering)\b/.test(c.norm)) return { msgs: [reply('Turn the simulated avatar option off? Candidates keep text, voice and a person.', { kind: 'approval', actions: [doA('Turn it off', 'as.avatar.setting', { on: false }, true)] })] };
    if (/\b(turn on|switch on|enable|offer)\b/.test(c.norm)) return { msgs: [reply('Turn the simulated avatar option on? It’s never mandatory: candidates can still choose text, voice or a person.', { kind: 'approval', actions: [doA('Turn it on', 'as.avatar.setting', { on: true }, true)] })] };
    return { msgs: [reply(`The avatar option is ${on ? 'on' : 'off'}. It’s a simulated presenter reading your locked questions; candidates can always choose text, voice or a person. It never scores, and never reads faces or voices.`, { actions: [navA('Avatar settings', '/r/questions#qb-avatar', true)] })] };
  },
});

// ---------------------------------------------------------------- Candidate: format, live room, exercises, feedback
registerSkill({
  id: 'as.c.format', side: 'candidate',
  match: (c) => (cand(c) && (/\bavatar\b/.test(c.norm) || /\b(with a (real )?person|human interviewer|a real person|text only|instead of (the )?(video|avatar))\b/.test(c.norm) || /\bfirst round\b/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const mode = /\b(person|human)\b/.test(c.norm) ? 'HUMAN' : /\btext\b/.test(c.norm) ? 'TEXT' : /\bvoice|speak\b/.test(c.norm) ? 'VOICE' : /\bavatar\b/.test(c.norm) && /\b(use|try|do|with|choose)\b/.test(c.norm) ? 'AVATAR' : null;
    const nav = c.route === '/c/assess/avatar' ? undefined : { to: '/c/assess/avatar', label: 'the first-round interview' };
    if (/\b(judge|score|watch|look at) (my|me)\b|\bmy (face|voice|accent)\b/.test(c.norm)) return { msgs: [reply('No. The avatar is a simulated presenter that reads Kora’s questions. It doesn’t use your camera and nothing judges your face, voice or accent. A person at Kora reads your answers.')], nav };
    if (mode === 'HUMAN') return { msgs: [reply('You can do this round with a person instead. Kora will offer you times. It isn’t held against you and you don’t need a reason.', { kind: 'approval', actions: [doA('Ask for a person', 'as.avatar', { orgId: 'org_kora', kind: 'choose', mode: 'HUMAN' }, true)] })], nav };
    if (mode) return { msgs: [reply(`Use ${mode === 'AVATAR' ? 'the simulated avatar' : mode === 'TEXT' ? 'text only' : 'voice'} for Kora’s first round? Your answers so far are kept.`, { actions: [doA(`Use ${mode === 'AVATAR' ? 'the avatar' : mode.toLowerCase()}`, 'as.avatar', { orgId: 'org_kora', kind: 'choose', mode }, true)] })], nav };
    return { msgs: [reply('Kora’s first round can be done four ways: a simulated avatar (no camera), text, voice, or with a person. All count the same, and none is required.')], nav };
  },
});

registerSkill({
  id: 'as.c.live', side: 'candidate',
  match: (c) => (cand(c) && (/^\/c\/assess\/live\//.test(c.route) && /\b(record|recording|join|q|listening|watching)\b/.test(c.norm) || /\b(join (the |my )?live interview|do not (want to be )?record|don’t record)\b/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const id = c.route.match(/live\/(i_\w+)/)?.[1] ?? c.w.interviews.find((i) => i.personId === c.actor.personId && assess(c.w).rooms[i.id] && assess(c.w).rooms[i.id].state !== 'ENDED')?.id;
    if (!id) return { msgs: [reply('You don’t have a live interview open right now.')] };
    if (/\b(is q|q is|listening|watching)\b/.test(c.norm)) return { msgs: [reply('I’m there for the interviewers: I may suggest follow-up questions to them. I don’t score you, and I don’t watch your face or listen to how you sound. Recording happens only if you say yes.')] };
    if (/\brecord/.test(c.norm)) { const yes = !/\b(no|not|do not|don’t|never)\b/.test(c.norm); return { msgs: [reply(yes ? 'Tell them yes to recording?' : 'Tell them not to record? The interview carries on; only their own notes are kept. It isn’t held against you.', { kind: 'approval', actions: [doA(yes ? 'Yes, record it' : 'No, don’t record', 'as.live', { id, kind: 'consent', yes }, true)] })] }; }
    return { msgs: [reply('Before you join: the interviewers are there, and I’m there for them only. Joining doesn’t start a recording.', { actions: [doA('Join the interview', 'as.live', { id, kind: 'join' }, true)] })], nav: { to: `/c/assess/live/${id}`, label: 'the live interview' } };
  },
});

registerSkill({
  id: 'as.c.exercise', side: 'candidate',
  match: (c) => (cand(c) && !c.route.startsWith('/c/learn') && (/\b(exercise|sandbox|run (the |my )?tests|the logs?|customer chat)\b/.test(c.norm) || (/^\/c\/assess\/ex\//.test(c.route) && /\b(submit|send|decline|run|test|help)\b/.test(c.norm))) ? 0.88 : 0),
  handle: (c) => {
    const list = exercisesFor(c.w, c.actor);
    const id = c.route.match(/ex\/(ex_\w+)/)?.[1]; const e = list.find((x) => x.id === id) ?? list.find((x) => x.state === 'IN_PROGRESS') ?? list.find((x) => x.state === 'ASSIGNED');
    if (!e) return { msgs: [reply('You don’t have any exercises. If an employer asks for one, it appears under Interviews and exercises.')] };
    const to = `/c/assess/ex/${e.id}`; const nav = c.route === to ? undefined : { to, label: 'the exercise' };
    const org = orgName(c.w, e.orgId);
    if (/\brun\b|\btests?\b/.test(c.norm) && e.kind === 'CODE') return { msgs: [reply('I’ll run the simulated checks. They look at the shape of your change; nothing is executed.', { actions: [doA('Run the tests', 'as.ex', { id: e.id, kind: 'run' }, true)] })], nav };
    if (/\bdecline\b|\bdo not want\b|\bdon’t want\b/.test(c.norm)) return { msgs: [reply(`Decline “${e.title}”? It’s recorded as declined, not as a failed result, and ${org} sees that.`, { kind: 'approval', actions: [doA('Decline it', 'as.ex', { id: e.id, kind: 'decline' }, true)] })], nav };
    if (/\b(submit|send)\b/.test(c.norm)) {
      if (e.state !== 'IN_PROGRESS') return { msgs: [reply(e.state === 'ASSIGNED' ? 'Start it first; nothing is sent until you say so.' : 'It’s already sent.')], nav };
      return { msgs: [reply(`Send it to ${org}? It shows as self-reported until a person there reviews it.`, { kind: 'approval', actions: [doA(`Send to ${org}`, 'as.ex', { id: e.id, kind: 'submit' }, true)] })], nav };
    }
    return { msgs: [reply(`“${e.title}” for ${org}: ${e.minutes} minutes, synthetic data, no clock. It counts as self-reported when you send it and as assessed only after a person reviews it. Declining is never a fail.`, { actions: e.state === 'ASSIGNED' ? [doA('Start it', 'as.ex', { id: e.id, kind: 'start' }, true)] : [] })], nav };
  },
});

registerSkill({
  id: 'as.c.feedback', side: 'candidate',
  match: (c) => (cand(c) && (/\b(my )?interview feedback\b|\bfeedback (from|on) (my |the )?interview\b|\bmy transcript\b|\btranscript (has|is) (a )?(mistake|wrong)/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const ivs = c.w.interviews.filter((i) => i.personId === c.actor.personId && assess(c.w).rooms[i.id]);
    const iv = ivs.slice(-1)[0];
    if (!iv) return { msgs: [reply('You haven’t had a live interview here yet, so there’s no transcript or feedback.')] };
    if (/\b(mistake|wrong)\b/.test(c.norm)) return { msgs: [reply(`I’ll send ${orgName(c.w, iv.orgId)} a correction request for your transcript. They see your note; the transcript isn’t changed until they review it.`, { kind: 'approval', actions: [{ label: 'Send the correction request', primary: true, act: { t: 'do', op: 'as.transcript.correct', args: { id: iv.id } } }] })] };
    const fb = feedbackForCandidate(c.w, c.actor.personId!, iv.id);
    return { msgs: [reply(fb ? `${fb.org} shared feedback: ${fb.strengths.length} strength${fb.strengths.length === 1 ? '' : 's'} and ${fb.routes.length} thing${fb.routes.length === 1 ? '' : 's'} to try next time.` : `${orgName(c.w, iv.orgId)} hasn’t shared feedback. They choose whether to; I can’t share it for them, and it isn’t a result either way.`, { actions: [{ label: 'Your interview record', primary: true, act: { t: 'nav', to: `/c/assess/record/${iv.id}` } }] })] };
  },
});

