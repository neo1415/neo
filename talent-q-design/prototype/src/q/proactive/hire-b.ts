// Proactive rules for R2 (Ada). Each reads real, authorised state and says why it is showing.
import { registerRule } from '../core/proactive';
import { visibleEvidence } from '../../mock/world';
import { hireB } from '../../state/areas/hire-b';
import { firstName, koraInterviews, viewerOrg, visibleIds } from '../../journeys/hire-b/model';

// "Tobi uploaded a new verified certificate since you last looked."
registerRule({
  id: 'hire-b.new-evidence', side: 'recruiter', priority: 'normal',
  evaluate: (w, actor) => {
    const seen = hireB(w).seen[actor.id] ?? {};
    const out = [];
    for (const [pid, s] of Object.entries(seen)) {
      const fresh = visibleIds(w, pid).filter((x) => !s.items.includes(x));
      if (!fresh.length) continue;
      const items = visibleEvidence(w, pid, viewerOrg(w));
      const [eid, ver] = fresh[0].split(':');
      const e = items.find((x) => x.evidenceId === eid);
      const what = e ? (e.confidential ? 'a confidential item' : `“${e.title}”`) : 'an item';
      const kind = e?.kind === 'CREDENTIAL' ? 'certificate' : 'item';
      out.push({
        subject: `${pid}:${fresh.join(',')}`,
        text: `${firstName(w, pid)} shared ${ver === 'VERIFIED' ? `a new verified ${kind}` : `a new ${kind}`} since you last looked: ${what}${fresh.length > 1 ? ` (and ${fresh.length - 1} more change${fresh.length > 2 ? 's' : ''})` : ''}.`,
        why: `You last opened ${firstName(w, pid)}’s profile on ${new Date(s.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. This is what ${firstName(w, pid)} has shared with your organisation since; nothing private is included.`,
        actions: [{ label: `Open ${firstName(w, pid)}’s profile`, primary: true, act: { t: 'nav' as const, to: `/r/people/${pid}` } }],
      });
    }
    return out;
  },
});

// "An assessment was disputed."
registerRule({
  id: 'hire-b.dispute', side: 'recruiter', priority: 'high',
  evaluate: (w, actor) => koraInterviews(w).filter((i) => i.orgId === actor.orgId && i.disputed?.state === 'OPEN' && !hireB(w).reviews[i.id]).map((i) => ({
    subject: i.id,
    text: `${firstName(w, i.personId)} disputed an assessment result. I’ve marked it under review and left it out of comparisons until it’s resolved.`,
    why: `${firstName(w, i.personId)} raised a dispute on the interview record (“${i.disputed!.reason.slice(0, 80)}”). Contested results shouldn’t decide anything until someone reviews them.`,
    actions: [{ label: 'Open a review request', primary: true, act: { t: 'say' as const, text: `open a review for ${firstName(w, i.personId)}'s assessment` } }, { label: 'Explain', act: { t: 'say' as const, text: `what is happening with ${firstName(w, i.personId)}'s dispute` } }],
  })),
});

// "Write your feedback while it's fresh."
registerRule({
  id: 'hire-b.feedback-due', side: 'recruiter', priority: 'normal',
  evaluate: (w, actor) => koraInterviews(w).filter((i) => i.panel.includes(actor.id) && !i.feedback.some((f) => f.by === actor.id) && hireB(w).live[i.id]?.step === 'FEEDBACK').map((i) => ({
    subject: i.id,
    text: `Your feedback on ${firstName(w, i.personId)} is drafted but not submitted.`,
    why: 'You ended the interview and I drafted feedback from your notes. The panel can’t decide until it’s submitted.',
    actions: [{ label: 'Review and submit', primary: true, act: { t: 'nav' as const, to: `/r/interviews/${i.id}` } }],
  })),
});
