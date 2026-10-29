// Proactive rules for R1 and R5, read from real state, each with a stated reason.
//  · a draft brief left unapproved for a day or more (for its author, or for a hiring manager it waits on)
//  · a budget below the usual range for the role and hours (high priority)
//  · a shortlist ready but no interview times proposed
//  · two sources disagreeing about a shortlisted person (hiring managers)
import { simNow, type World } from '../../mock/world';
import type { Actor } from '../../state/domain';
import { registerRule } from '../core/proactive';
import { campaignsFor } from '../../state/areas/campaigns';
import { readA } from '../../state/areas/hire-a';
import { band, can, curV, dayLabel, ensureSeeded, isFounder, lastAt, naira, needsSeed, orgMandates, ROLES, hoursText } from '../../journeys/hire-a/model';

// Kora's history (audit events, Bayo's remembered preference) is added once to whatever world is loaded,
// including after "Reset the demo". The suggestions engine evaluates on every change, so it notices first.
let pending = false;
const seedSoon = (w: World) => { if (!pending && needsSeed(w)) { pending = true; queueMicrotask(() => { pending = false; ensureSeeded(); }); } };

registerRule({
  id: 'hire-a.draft-stale', side: 'recruiter', priority: 'normal',
  evaluate: (w: World, a: Actor) => {
    seedSoon(w);
    const t = simNow(w).getTime();
    return orgMandates(w, a).filter((m) => m.status === 'DRAFT' && can(a, 'approve_brief') && (isFounder(a) ? m.createdBy === a.id : a.role === 'HIRING_MANAGER' && m.createdBy !== a.id) && t - new Date(lastAt(m)).getTime() >= 864e5)
      .map((m) => {
        const by = w.actors.find((x) => x.id === m.versions[m.versions.length - 1].by);
        return { subject: `${m.id}:v${curV(m)}`,
          text: `“${m.title}” has been a draft since ${dayLabel(lastAt(m), a.timezone)}. Nothing happens until it’s approved.`,
          why: `v${curV(m)} was last changed by ${by?.id === a.id ? 'you' : by?.name ?? 'a colleague'} on ${dayLabel(lastAt(m), a.timezone)}. Drafts aren’t searched, and you can approve it as ${a.role === 'OWNER' ? 'the owner' : a.role?.toLowerCase().replace('_', ' ')}.`,
          actions: [{ label: 'Review the brief', primary: true, act: { t: 'nav', to: `/r/roles/${m.id}` } }, { label: 'Approve it', act: { t: 'say', text: `approve the ${m.title} brief` } }] };
      });
  },
});

registerRule({
  id: 'hire-a.budget-below', side: 'recruiter', priority: 'high',
  evaluate: (w: World, a: Actor) => {
    if (!isFounder(a)) return [];
    const s = readA(w);
    return orgMandates(w, a).filter((m) => m.status === 'DRAFT' && s.meta[m.id]?.roleKey).flatMap((m) => {
      const meta = s.meta[m.id]; const [lo, hi] = band(meta.roleKey!, meta.hours, meta.days);
      if (m.pay.max >= lo || /below the usual range/.test(m.versions[m.versions.length - 1].note)) return [];
      return [{ subject: `${m.id}:v${curV(m)}`, text: `${naira(m.pay.max)} a month is below what ${hoursText(meta.hours, meta.days)} ${ROLES[meta.roleKey!].label}s usually earn (about ${naira(lo)}–${naira(hi)}).`,
        why: 'Compared with an illustrative Lagos pay guide for this role and these hours. Below it, fewer people reply.',
        actions: [{ label: 'See my options', primary: true, act: { t: 'say', text: 'help me fix the budget' } }] }];
    });
  },
});

registerRule({
  id: 'hire-a.shortlist-ready', side: 'recruiter', priority: 'normal',
  evaluate: (w: World, a: Actor) => {
    if (!isFounder(a)) return [];
    return orgMandates(w, a).filter((m) => m.status !== 'DRAFT').flatMap((m) => {
      const sl = w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED');
      if (sl.length < 2 || w.calendar.some((e) => e.mandateId === m.id && e.status !== 'CANCELLED')) return [];
      return [{ subject: m.id, text: `${sl.length} people are shortlisted for “${m.title}”. Shall I suggest interview times?`, why: 'Your shortlist is ready and no interview times are held yet.',
        actions: [{ label: 'Propose interview times', primary: true, act: { t: 'say', text: 'propose interview times' } }] }];
    });
  },
});

registerRule({
  id: 'hire-a.source-conflict', side: 'recruiter', priority: 'normal',
  evaluate: (w: World, a: Actor) => {
    if (a.orgId !== 'org_kora' || a.role !== 'HIRING_MANAGER' || readA(w).conflicts.p_kunle) return [];
    if (!w.pipeline.some((e) => e.personId === 'p_kunle' && (e.mandateId === 'm_backend' || e.mandateId === 'm_payouts') && e.stage !== 'REJECTED')) return [];
    return [{ subject: 'p_kunle', text: 'Kunle Bakare’s CV and his GitHub disagree about his experience (6 years against about 2).', why: 'Both sources are shared with Kora Pay and give different numbers. Q hasn’t picked one.',
      actions: [{ label: 'Show me both', primary: true, act: { t: 'say', text: 'how many years has kunle really got' } }] }];
  },
});

// Hiring campaigns (addendum §D): a campaign's deadline is within 10 days and one of its roles is still a draft brief, so nothing
// is searched for it yet. Shown to the campaign owner. The subject is the brief version, the same subject as
// 'hire-a.draft-stale', so one decision (dismiss, later) covers both and the brief never gets two cards.
registerRule({
  id: 'hire-a.campaign-draft', side: 'recruiter', priority: 'normal',
  evaluate: (w: World, a: Actor) => {
    const t = simNow(w).getTime();
    return campaignsFor(w, a.orgId ?? '').filter((c) => c.owner === a.id && c.status === 'ACTIVE' && c.deadline && new Date(`${c.deadline}T23:59:00+01:00`).getTime() - t < 10 * 864e5).flatMap((c) =>
      orgMandates(w, a).filter((m) => c.roles.includes(m.id) && m.status === 'DRAFT').map((m) => {
        const days = Math.ceil((new Date(`${c.deadline}T23:59:00+01:00`).getTime() - t) / 864e5);
        const waits = w.actors.find((x) => x.orgId === a.orgId && new RegExp(`for ${x.first}’s approval`).test(m.versions[m.versions.length - 1].note));
        return { subject: `${m.id}:v${curV(m)}`,
          text: `“${c.name}” is due in ${days} days, and the ${m.title} brief is still a draft${waits ? ` waiting for ${waits.first}` : ''}.`,
          why: `You own the campaign. Nothing is searched for a role until its brief is approved, and the campaign’s deadline is ${dayLabel(`${c.deadline}T12:00:00+01:00`, a.timezone)}.`,
          actions: [{ label: 'Open the campaign', primary: true, act: { t: 'nav', to: `/r/campaigns/${c.id}` } }, { label: 'Review the brief', act: { t: 'nav', to: `/r/roles/${m.id}` } }] };
      }));
  },
});
