// Proactive rules for R2 (Ada). Each reads real, authorised state and says why it is showing.
import { registerRule } from '../core/proactive';
import { visibleEvidence } from '../../mock/world';
import { hireB } from '../../state/areas/hire-b';
import { firstName, koraInterviews, viewerOrg, visibleIds } from '../../journeys/hire-b/model';
import { rubrics, draftVersion } from '../../state/areas/rubrics';
import { approvalNeeds } from '../../journeys/rubric/ops';
import { firstOf as rbFirst, studioPath } from '../../journeys/rubric/model';

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

// ---------- Evaluation rubric (audit addendum §E) ----------

// "Tobi asked for a correction to a rating." Grounded in an open dispute on a rating in this organisation.
registerRule({
  id: 'rubric.dispute', side: 'recruiter', priority: 'high',
  evaluate: (w, actor) => rubrics(w).ratings.filter((r) => r.dispute?.state === 'OPEN' && rubrics(w).list.some((x) => x.id === r.rubricId && x.orgId === actor.orgId)).map((r) => {
    const rub = rubrics(w).list.find((x) => x.id === r.rubricId)!; const c = rub.versions.find((v) => v.v === r.v)?.criteria.find((x) => x.id === r.criterionId);
    return {
      subject: r.id,
      text: `${rbFirst(w, r.personId)} asked for a correction to their ${c?.label ?? 'rating'} (${r.rating} of 4 on rubric v${r.v}).`,
      why: `${rbFirst(w, r.personId)} wrote: “${r.dispute!.text.slice(0, 90)}”. A person should look before this rating informs any decision.`,
      actions: [{ label: 'Open the scorecard', primary: true, act: { t: 'nav' as const, to: `/r/people/${r.personId}` } }],
    };
  }),
});

// "Your rubric change is waiting on a decision." Only when a draft with a material change has people rated on the old version.
registerRule({
  id: 'rubric.notice-pending', side: 'recruiter', priority: 'normal',
  evaluate: (w, actor) => rubrics(w).list.filter((x) => x.orgId === actor.orgId && draftVersion(w, x.mandateId)?.changeNotice).flatMap((x) => {
    const n = approvalNeeds(w, x.mandateId); if (!n.affected.length || !n.draft) return [];
    return [{
      subject: `${x.id}:v${n.draft.v}`,
      text: `Rubric v${n.draft.v} is waiting on your decision: ${n.affected.map((p) => rbFirst(w, p)).join(' and ')} ${n.affected.length === 1 ? 'was' : 'were'} rated on v${n.base?.v}.`,
      why: 'You tried to approve a change that alters how people are scored after some were already rated. It needs notice and a principled choice before it takes effect.',
      actions: [{ label: 'Notify and reassess', primary: true, act: { t: 'say' as const, text: 'notify and reassess' } }, { label: `Keep v${n.base?.v} for this round`, act: { t: 'say' as const, text: `keep v${n.base?.v} for this round` } }, { label: 'Open the rubric', act: { t: 'nav' as const, to: studioPath(x.mandateId) } }],
    }];
  }),
});
