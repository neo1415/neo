// talent-a proactive rules: each reads real state and states why. Nothing acts on its own; the engine
// handles dismiss and snooze, so a missing profile item is raised once, never nagged about.
import { simNow } from '../../mock/world';
import { registerRule } from '../core/proactive';
import { QUESTIONS, missingOf, readProfile } from '../../services/profile';
import { entryMatches } from '../../journeys/onboarding/match';
import { daysBetween, fmtDay, overdue, personaFor, readJ7, simISO } from '../../journeys/career/j7';
import { taRead } from '../../state/areas/talent-a';

registerRule({
  id: 'ta.plan.overdue', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => {
    if (!a.personId || !w.j7[a.personId]) return [];
    const S = readJ7(w, a.personId); const od = overdue(w, S);
    if (!od.length) return [];
    const s = od[0];
    return [{ subject: `${s.id}:${s.due?.slice(0, 10)}`, text: od.length === 1 ? `Your plan step “${s.title}” was due ${fmtDay(s.due!)}.` : `${od.length} plan steps are past their dates, starting with “${s.title}” (${fmtDay(s.due!)}).`,
      why: `You planned ${od.length === 1 ? 'it' : 'them'} for a date that has passed, and ${od.length === 1 ? 'it isn’t' : 'they aren’t'} marked done. Moving a date is fine; this is private to you.`,
      actions: [{ label: 'Move to next week', primary: true, act: { t: 'do', op: 'ta.j7.reschedule', args: { days: 7 } } }, { label: 'Show my plan', act: { t: 'say', text: 'show my plan' } }] }];
  },
});

registerRule({
  id: 'ta.jobs.new', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => {
    if (!a.personId || personaFor(a.personId).id !== 'graduate') return [];
    const p = readProfile(w, a.personId); if (!p.answered.length) return [];
    const seen = taRead(w).seenJobs[a.personId] ?? [];
    const m = entryMatches(w, a.personId).find((x) => x.isNew && !x.applied && !seen.includes(x.job.id));
    if (!m) return [];
    const mentioned = m.needs.filter((n) => n.state !== 'none').map((n) => n.need.toLowerCase());
    return [{ subject: m.job.id, text: `A new entry-level job matches what you’ve told me: ${m.job.title} at ${m.org} asks for ${mentioned.join(' and ')}.`,
      why: `Posted ${fmtDay(m.job.posted)}, within the last week, and ${m.fit} of its ${m.needs.length} needs match things you mentioned. Mentioned isn’t proof, and the employer decides.`,
      actions: [{ label: 'Why it fits', primary: true, act: { t: 'say', text: `why does the ${m.org.split(' ')[0].toLowerCase()} ${m.job.title.toLowerCase()} job fit me` } }, { label: 'Open the listing', act: { t: 'nav', to: `/c/jobs/${m.job.id}` } }] }];
  },
});

registerRule({
  id: 'ta.commitment.due', side: 'candidate', priority: 'high',
  evaluate: (w, a) => {
    if (!a.personId) return [];
    const t = simNow(w).getTime();
    return taRead(w).commitments.filter((k) => k.personId === a.personId && k.state === 'OPEN' && new Date(k.due).getTime() < t).slice(0, 1).map((k) => ({
      subject: k.id, text: `You said: “${k.text.replace(/\.$/, '')}” by ${fmtDay(k.due)}. Want to do it now?`,
      why: `You asked me to remember this on ${fmtDay(k.at)}. I’ll only mention it this once; dismiss it and I won’t again.`,
      actions: [{ label: 'Submit it now', primary: true, act: { t: 'say', text: 'i improved it, please reassess my work sample' } }, { label: 'Drop the reminder', act: { t: 'say', text: 'drop that reminder' } }],
    }));
  },
});

registerRule({
  id: 'ta.j7.back', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => {
    if (!a.personId || !w.j7[a.personId]) return [];
    const S = readJ7(w, a.personId); const gap = daysBetween(S.lastVisit, simISO(w));
    if (gap < 14) return [];
    return [{ subject: S.lastVisit.slice(0, 10), text: `Welcome back. It’s been ${Math.round(gap / 7)} weeks since you last looked at your career plan. Want a summary of what changed?`,
      why: `Your last visit to your plan was ${fmtDay(S.lastVisit)}. Since then, dates have passed and practice has aged.`,
      actions: [{ label: 'What changed?', primary: true, act: { t: 'say', text: 'what changed since i was last here' } }] }];
  },
});

registerRule({
  id: 'ta.profile.missing', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => {
    if (!a.personId) return [];
    const p = readProfile(w, a.personId);
    if (!p.done || !p.skipped.includes('location') || !missingOf(p).includes('location')) return [];
    return [{ subject: 'location', text: 'When you’re ready: tell me where you can work from, so I only match jobs you can actually take.',
      why: `You skipped “${QUESTIONS.location.label.toLowerCase()}” during set-up. That’s fine; I’m mentioning it once because it changes which jobs fit.`,
      actions: [{ label: 'Add it now', primary: true, act: { t: 'say', text: 'continue my profile' } }] }];
  },
});
