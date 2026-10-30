// ASSESS proactive rules. Each reads real state, says why, and acts only through an action the person taps. They stay
// silent on the seeded world (nothing submitted, no draft, no shared feedback), so other journeys' homes are unchanged.
import { registerRule } from '../core/proactive';
import type { AssessState } from '../../state/areas/assess';
import type { World } from '../../mock/world';
// Read-only: proactive rules never write to the store (no lazy slice creation here).
const assess = (w: World): AssessState => (w.areas.assess as AssessState | undefined) ?? { banks: [], plans: {}, rooms: {}, feedback: {}, avatar: {}, avatarSettings: {}, exercises: [], coached: {} };
import { KIND_WORD, draftOf, feedbackForCandidate, orgName, personFirst } from '../../journeys/assess/model';

// Recruiter: an exercise is waiting for a person (until then it counts as self-reported).
registerRule({
  id: 'as.exercise.review', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => assess(w).exercises.filter((e) => e.orgId === a.orgId && e.state === 'SUBMITTED').map((e) => ({
    subject: e.id,
    text: `${personFirst(w, e.personId)} sent the ${KIND_WORD[e.kind].toLowerCase()} “${e.title}”. It counts as self-reported until someone reviews it.`,
    why: `${personFirst(w, e.personId)} submitted it; no one at ${orgName(w, e.orgId)} has reviewed it yet.`,
    actions: [{ label: 'Review it', primary: true, act: { t: 'nav', to: '/r/exercises' } }],
  })),
});

// Recruiter (editors only): a draft of the question bank is waiting to be locked.
registerRule({
  id: 'as.bank.draft', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => assess(w).banks.filter((b) => b.orgId === a.orgId && b.editors.includes(a.id) && draftOf(b)).map((b) => ({
    subject: `${b.id}:v${draftOf(b)!.v}`,
    text: `Draft v${draftOf(b)!.v} of your interview questions isn’t locked, so interviews still use the older version.`,
    why: 'Only locked questions are used in interviews. You can edit this bank.',
    actions: [{ label: 'Open the question bank', primary: true, act: { t: 'nav', to: '/r/questions' } }],
  })),
});

// Candidate: an exercise they started and haven't sent (kept, no clock).
registerRule({
  id: 'as.exercise.carryon', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => assess(w).exercises.filter((e) => e.personId === a.personId && e.state === 'IN_PROGRESS').map((e) => ({
    subject: e.id,
    text: `Your “${e.title}” for ${orgName(w, e.orgId)} is saved. Carry on whenever you like; there’s no clock.`,
    why: 'You started it and haven’t sent it. Nothing is sent until you say so.',
    actions: [{ label: 'Carry on', primary: true, act: { t: 'nav', to: `/c/assess/ex/${e.id}` } }],
  })),
});

// Candidate: the employer chose to share interview feedback.
registerRule({
  id: 'as.feedback.shared', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => Object.values(assess(w).feedback).filter((f) => f.personId === a.personId && feedbackForCandidate(w, a.personId!, f.interviewId)).map((f) => ({
    subject: `fb:${f.interviewId}`,
    text: `${orgName(w, f.orgId)} shared feedback on your interview.`,
    why: `${orgName(w, f.orgId)} chose to share it. It’s their words, approved by them.`,
    actions: [{ label: 'Read it', primary: true, act: { t: 'nav', to: `/c/assess/record/${f.interviewId}` } }],
  })),
});
