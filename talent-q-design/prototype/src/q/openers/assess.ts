// ASSESS openers: on each assessment page Q names the one thing that needs the person, from live state.
import { registerOpener } from '../core/openers';
import { assess } from '../../state/areas/assess';
import { coachedInterviews, coachingFor, draftOf, exercisesFor, feedbackForCandidate, ivOf, lockedOf, orgName, personFirst, readRoom } from '../../journeys/assess/model';

registerOpener({
  id: 'as.r.hub', side: 'recruiter', match: (p) => p === '/r/assess' || p === '/r/exercises',
  build: (w, a) => {
    const waiting = assess(w).exercises.filter((e) => e.orgId === a.orgId && e.state === 'SUBMITTED');
    return [
      ...waiting.map((e) => ({ subject: e.id, text: `${personFirst(w, e.personId)}’s exercise is self-reported until you review it.`, action: { label: 'Review it', primary: true, act: { t: 'nav' as const, to: '/r/exercises' } } })),
      { subject: 'as.hub', text: 'Ask me to plan an interview, open a live room, or review an exercise.', action: { label: 'Plan Tobi’s interview', act: { t: 'say' as const, text: 'build the interview plan for tobi' } } },
    ];
  },
});

registerOpener({
  id: 'as.r.bank', side: 'recruiter', match: (p) => p === '/r/questions',
  build: (w, a) => {
    const b = assess(w).banks.find((x) => x.orgId === a.orgId); if (!b) return [];
    const d = draftOf(b);
    if (d && b.editors.includes(a.id)) return [{ subject: `${b.id}:v${d.v}`, text: `Draft v${d.v} isn’t in use until you lock it.`, action: { label: `Lock v${d.v}`, primary: true, act: { t: 'say', text: 'lock the question bank' } } }];
    return [{ subject: b.id, text: `v${lockedOf(b)?.v} is locked: ${lockedOf(b)?.questions.length} questions, asked word for word.`, action: b.editors.includes(a.id) ? { label: 'Upload more questions', act: { t: 'say', text: 'upload our interview questions' } } : { label: 'Who can edit?', act: { t: 'say', text: 'who can edit the questions' } } }];
  },
});

registerOpener({
  id: 'as.r.interview', side: 'recruiter', match: (p) => /^\/r\/interviews\/i_\w+\/(live|transcript|review)$/.test(p),
  build: (w, a, p) => {
    const id = p.split('/')[3]; const iv = ivOf(w, id); if (!iv || iv.orgId !== a.orgId) return [];
    const r = readRoom(w, id); const first = personFirst(w, iv.personId);
    if (p.endsWith('/live')) {
      const s = r?.suggestions.find((x) => x.state === 'NEW');
      if (s) return [{ subject: s.id, text: `A follow-up for you only: “${s.text}”`, action: { label: 'Ask it', primary: true, act: { t: 'do', op: 'as.live', args: { id, kind: 'suggestion', sid: s.id, use: true } } } }];
      if (!assess(w).plans[id]) return [{ subject: `plan:${id}`, text: `${first}’s question plan isn’t built yet.`, action: { label: 'Build the plan', primary: true, act: { t: 'do', op: 'as.plan.build', args: { id } } } }];
      if (!r?.candidateJoined) return [{ subject: `join:${id}`, text: `${first} hasn’t joined. They’ll be told I’m here for you.`, action: { label: 'Who sees your suggestions?', act: { t: 'say', text: 'who sees the live room suggestions' } } }];
      return [{ subject: `live:${id}`, text: 'My follow-ups appear beside the transcript, for interviewers only.', action: { label: 'Hide suggestions', act: { t: 'say', text: 'hide suggestions in the live room' } } }];
    }
    if (p.endsWith('/transcript')) return [{ subject: `tr:${id}`, text: r?.consent.recording === 'YES' ? `${r.excerpts.length ? `${r.excerpts.length} answers marked.` : 'No answers marked yet.'} Marked answers feed the score review.` : `${first} said no to recording, so there’s no transcript.`, action: { label: 'Review scores', act: { t: 'nav', to: `/r/interviews/${id}/review` } } }];
    return [{ subject: `rv:${id}`, text: 'Read what’s uncertain before the numbers. Unknown stays unknown, not zero.', action: { label: 'Propose ratings', primary: true, act: { t: 'do', op: 'as.review.propose', args: { id } } } }];
  },
});

registerOpener({
  id: 'as.r.coaching', side: 'recruiter', match: (p) => p === '/r/coaching',
  build: (w, a) => {
    const ids = coachedInterviews(w, a); const k = ids.length ? coachingFor(w, a, ids[ids.length - 1]) : null;
    if (!k) return [{ subject: 'coach.none', text: 'Coaching comes from interviews you run in the live room.' }];
    return [{ subject: `coach:${k.id}`, text: `You did ${k.talk.share}% of the talking${k.leading.length ? ` and asked ${k.leading.length} leading question${k.leading.length === 1 ? '' : 's'}` : ''}.`, action: { label: 'How did I do?', primary: true, act: { t: 'say', text: 'how did i do in that interview' } } }];
  },
});

registerOpener({
  id: 'as.c.pages', side: 'candidate', match: (p) => p === '/c/assess' || p.startsWith('/c/assess/'),
  build: (w, a, p) => {
    if (p.startsWith('/c/assess/ex/')) { const e = exercisesFor(w, a).find((x) => x.id === p.split('/')[4]); if (!e) return []; return [{ subject: `ex:${e.id}`, text: e.state === 'ASSIGNED' ? `${e.minutes} minutes, no clock. Declining is never a fail.` : e.state === 'IN_PROGRESS' ? 'Saved as you go. Nothing is sent until you say so.' : 'Self-reported until a person reviews it.', action: e.state === 'IN_PROGRESS' ? { label: 'Send it', act: { t: 'say', text: 'submit my exercise' } } : undefined }]; }
    if (p === '/c/assess/avatar') return [{ subject: 'avatar', text: 'Avatar, text, voice or a person: all count the same.', action: { label: 'Does the avatar judge me?', act: { t: 'say', text: 'does the avatar judge my face' } } }];
    if (p.startsWith('/c/assess/live/')) return [{ subject: 'live', text: 'I’m here for the interviewers only. I don’t score you.', action: { label: 'Is Q watching me?', act: { t: 'say', text: 'is q watching me in the live interview' } } }];
    if (p.startsWith('/c/assess/record/')) { const id = p.split('/')[4]; const fb = feedbackForCandidate(w, a.personId!, id); return [{ subject: `rec:${id}`, text: fb ? `${fb.org} shared feedback with you.` : 'Feedback appears here only if the employer shares it.' }]; }
    const todo = exercisesFor(w, a).filter((e) => e.state === 'ASSIGNED' || e.state === 'IN_PROGRESS');
    return todo.map((e) => ({ subject: `ex:${e.id}`, text: `${orgName(w, e.orgId)} asked for “${e.title}”: ${e.minutes} minutes, no clock.`, action: { label: 'Open it', primary: true, act: { t: 'nav' as const, to: `/c/assess/ex/${e.id}` } } }));
  },
});
