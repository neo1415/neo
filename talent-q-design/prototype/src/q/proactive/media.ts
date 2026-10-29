// MEDIA proactive rules (one subject per media item). Each reads real state and says why; nothing acts on its own.
import { registerRule } from '../core/proactive';
import { visibleSegments } from '../../state/areas/media';
import { fmt, ms, roleFor, roleTitle } from '../../journeys/media/logic';

// Recruiter: a candidate shared a new walkthrough relevant to one of your roles (not yet opened by you).
registerRule({
  id: 'media.shared', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => {
    const org = a.orgId; if (!org) return [];
    const seen = ms(w).seen?.[a.id] ?? [];
    return ms(w).items.filter((m) => !seen.includes(m.id) && visibleSegments(w, m.id, org).length && roleFor(w, m.ownerId, org)).map((m) => {
      const segs = visibleSegments(w, m.id, org); const p = w.people.find((x) => x.personId === m.ownerId);
      const first = p?.name.split(' ')[0] ?? 'A candidate'; const role = roleTitle(w, roleFor(w, m.ownerId, org));
      return {
        subject: m.id,
        text: `${first} shared a walkthrough video for ${role}: ${segs.length} of ${m.segments.length} parts, ${fmt(segs.reduce((s, x) => s + x.tEnd - x.t, 0))}. Q’s report maps it to the role’s criteria, with moments you can play.`,
        why: `${first} chose to share it with your organisation, for “${m.consent?.purpose}”. You haven’t opened it yet.`,
        actions: [{ label: 'Open Q’s report', primary: true, act: { t: 'nav', to: `/r/people/${m.ownerId}/video` } }, { label: 'Summarise it', act: { t: 'say', text: `summarise ${first}'s video` } }],
      };
    });
  },
});

// Candidate: the transcript is ready to check (nothing is shared until they do).
registerRule({
  id: 'media.transcript.ready', side: 'candidate', priority: 'high',
  evaluate: (w, a) => ms(w).items.filter((m) => m.ownerId === a.personId && m.state === 'REVIEW').map((m) => ({
    subject: m.id,
    text: `Your transcript of “${m.title}” is ready to check. Nothing is shared until you’ve looked at it and chosen the parts.`,
    why: 'Transcription finished. You check it first, so no one reads words Q got wrong.',
    actions: [{ label: 'Check the transcript', primary: true, act: { t: 'nav', to: '/c/passport?media=review' } }],
  })),
});
