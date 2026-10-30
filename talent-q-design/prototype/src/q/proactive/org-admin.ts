// ORG-ADMIN proactive rules, from real state. MO-035: the agent budget passing its warning threshold raises a high-
// priority card (stop or spend) for admins; recruiters hear that an admin decides. Deletion requests and learnings
// waiting for review are raised to the people who can act. Q suggests; it never decides on its own.
import { registerRule } from '../core/proactive';
import { personOf } from '../../mock/world';
import { oa } from '../../state/areas/org-admin';
import { billingOf, budgetShare, isAdmin, level, usd } from '../../journeys/org-admin/model';

registerRule({
  id: 'org-admin.budget', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => {
    const b = billingOf(w, a.orgId); if (!b || level(w, a, 'billing') === 'NONE') return [];
    if (budgetShare(b) < b.budget.warnAt || b.budget.decision) return [];
    return [{ subject: `oa.budget.${a.orgId}`, text: `The agent budget passed ${Math.round(b.budget.warnAt * 100)}%: ${usd(b.budget.spent)} of ${usd(b.budget.cap)} (simulated).`,
      why: `Runs keep going until the cap, then stop and ask. ${isAdmin(a) ? 'You decide whether to pause new runs or allow more.' : 'An admin decides; nothing is charged.'}`,
      actions: isAdmin(a) ? [{ label: 'Pause new runs', act: { t: 'say' as const, text: 'pause new agent runs' } }, { label: 'Allow $10 more', act: { t: 'say' as const, text: 'allow $10 more budget' } }, { label: 'Open billing', act: { t: 'nav' as const, to: '/r/admin/billing' } }]
        : [{ label: 'Open billing', primary: true, act: { t: 'nav' as const, to: '/r/admin/billing' } }] }];
  },
});
registerRule({
  id: 'org-admin.deletion', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => {
    if (level(w, a, 'retention') !== 'EDIT') return [];
    return (oa(w).retention.find((r) => r.orgId === a.orgId)?.deletions ?? []).filter((d) => d.state === 'OPEN').map((d) => ({ subject: d.id,
      text: `${personOf(w, d.personId)?.name} asked ${'you'} to delete their records.`, why: 'A deletion request should be handled promptly; the receipt tells them what is kept and why (D9).',
      actions: [{ label: 'Open the request', primary: true, act: { t: 'nav' as const, to: '/r/admin/retention' } }] }));
  },
});
registerRule({
  id: 'org-admin.learning', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => {
    if (level(w, a, 'learning') !== 'EDIT') return [];
    const n = oa(w).learnings.filter((l) => l.orgId === a.orgId && l.state === 'PROPOSED').length;
    return n ? [{ subject: 'oa.learning', text: `${n} thing${n === 1 ? '' : 's'} Q noticed in your outcomes need${n === 1 ? 's' : ''} a reviewer’s yes or no.`, why: 'Q applies nothing it learned until a reviewer approves it.', actions: [{ label: 'Review them', primary: true, act: { t: 'nav' as const, to: '/r/admin/learning' } }] }] : [];
  },
});
