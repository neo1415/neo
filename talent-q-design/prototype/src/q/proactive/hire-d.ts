// HIRE-D proactive rules. Deliberately narrow: they only fire on state this area creates (an offer waiting on this
// person's approval, a scheduled reminder the calendar has since overtaken), so other areas' cards keep their place.
import { registerRule } from '../core/proactive';
import { hd } from '../../state/areas/hire-d';
import { firstOf } from '../../journeys/hire-c/lib';
import { curV, reminderQueue } from '../../journeys/hire-d/model';

registerRule({ id: 'hd.offer.approve', side: 'recruiter', priority: 'high', evaluate: (w, a) => hd(w).offers
  .filter((o) => o.orgId === a.orgId && o.state === 'AWAITING_APPROVAL' && o.approvals.some((x) => x.who === a.id && (!x.at || x.voided || x.v !== curV(o).v)))
  .map((o) => ({ subject: `offer:${o.id}`, text: `The offer for ${firstOf(w, o.personId)} (v${curV(o).v}) is waiting for your approval.`, why: `You’re the ${o.approvals.find((x) => x.who === a.id)?.role === 'HR' ? 'HR' : 'hiring manager'} approver. Nothing goes to ${firstOf(w, o.personId)} until everyone approves and a person sends it.`,
    actions: [{ label: 'Open the offer', primary: true, act: { t: 'nav', to: `/r/offer/${o.mandateId}/${o.personId}` } }] })) });

registerRule({ id: 'hd.rem.stale', side: 'recruiter', priority: 'normal', evaluate: (w, a) => {
  if (!a.orgId) return [];
  const live = new Set(reminderQueue(w, a.orgId).filter((x) => !x.blocked).map((x) => x.id));
  return hd(w).reminders.filter((r) => r.orgId === a.orgId && r.state === 'SCHEDULED' && !live.has(r.id))
    .map((r) => ({ subject: `rem:${r.id}`, text: `A reminder to ${firstOf(w, r.personId)} no longer fits: the interview or their choices changed.`, why: 'I re-read the calendar and their notification choices. It won’t send; you can cancel it.', actions: [{ label: 'Cancel it', primary: true, act: { t: 'do', op: 'hd.rem.cancel', args: { id: r.id } } }] }));
} });
