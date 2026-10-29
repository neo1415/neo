// Proactive help for the agency, from real state only: saved searches with new matches, clients who haven't
// replied to a submittal, failed agents, consent withdrawals, conflicting client requirements, access requests
// and mentions. Each suggestion names one client at a time (never mixes clients' candidates in one card).
import { actorOf, simNow } from '../../mock/world';
import { registerRule } from '../core/proactive';
import { agency } from '../../state/areas/agency';
import { clientName, clientShort, conflicts, fmtDay, isAgency, isWithdrawn, personName, today } from '../../journeys/agency/model';

const P = '/r/agency';

registerRule({
  id: 'agency.agent-failed', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => (!isAgency(w, a) || a.role === 'VIEWER' ? [] : agency(w).runs.filter((r) => r.state === 'FAILED').map((r) => ({
    subject: `${r.id}:${r.attempts}`,
    text: `The ${clientShort(w, r.clientOrgId)} ${r.label.toLowerCase()} failed: ${r.provider} isn’t responding. ${r.done} of ${r.total} profiles are kept.`,
    why: `Agent status is “failed” after ${r.attempts} attempt${r.attempts === 1 ? '' : 's'}; other clients’ agents are still running.`,
    actions: [{ label: 'Retry now', primary: true, act: { t: 'do', op: 'agency.run.retry', args: { id: r.id } } }, { label: 'What happened?', act: { t: 'say', text: 'what happened to the failed search' } }],
  }))),
});

registerRule({
  id: 'agency.consent-withdrawn', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => (!isAgency(w, a) || a.role === 'VIEWER' ? [] : Object.entries(agency(w).withdrawn).map(([pid, at]) => ({
    subject: pid,
    text: `${personName(w, pid)} withdrew consent on ${fmtDay(at)}. They’re out of every pool, campaign and new submittal.`,
    why: 'The candidate’s consent record changed; Talentbridge may no longer hold or share their details.',
    actions: [{ label: 'Show the pool', primary: true, act: { t: 'nav', to: `${P}/pools` } }],
  }))),
});

registerRule({
  id: 'agency.search-new', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => {
    if (!isAgency(w, a)) return [];
    const t = today(w);
    return agency(w).searches.map((s) => ({ s, fresh: s.universe.filter((u) => u.since > s.lastRunAt && u.since <= t && !isWithdrawn(w, u.personId) && !s.results.includes(u.personId)) })).filter((x) => x.fresh.length).map(({ s, fresh }) => ({
      subject: `${s.id}:${s.lastRunAt}`,
      text: `${clientShort(w, s.clientOrgId)}’s saved search “${s.name}” has ${fresh.length} new ${fresh.length === 1 ? 'match' : 'matches'} since ${fmtDay(s.lastRunAt)}.`,
      why: `People matching ${clientShort(w, s.clientOrgId)}’s criteria joined after the last run.`,
      actions: [{ label: 'Re-run and show what’s new', primary: true, act: { t: 'say', text: `run the ${clientShort(w, s.clientOrgId)} ${s.keywords[0]} search again and tell me what is new` } }],
    }));
  },
});

registerRule({
  id: 'agency.submittal-silent', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => (!isAgency(w, a) || a.role === 'VIEWER' ? [] : agency(w).submittals.filter((s) => s.status === 'SENT_SIMULATED' && !s.reply && !s.nudgedAt && s.sentAt && (simNow(w).getTime() - new Date(`${s.sentAt}T12:00:00Z`).getTime()) / 864e5 >= 3).map((s) => {
    const days = Math.floor((simNow(w).getTime() - new Date(`${s.sentAt}T12:00:00Z`).getTime()) / 864e5);
    return { subject: s.id, text: `${clientName(w, s.clientOrgId)} hasn’t replied to the shortlist you sent on ${fmtDay(s.sentAt)} (${days} days).`, why: 'No client reply recorded on that submittal.', actions: [{ label: 'Send a nudge (simulated)', primary: true, act: { t: 'do', op: 'agency.submittal.nudge', args: { id: s.id } } }] };
  })),
});

registerRule({
  id: 'agency.conflict', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => (!isAgency(w, a) || a.role === 'VIEWER' ? [] : conflicts(w).map((x) => ({
    subject: `${x.personId}:${x.a.id}:${x.b.id}`,
    text: `Conflict: ${personName(w, x.personId)} is in progress for ${clientShort(w, x.a.clientOrgId!)} (${x.a.workMode === 'ONSITE' ? 'on-site' : 'remote only'}) and ${clientShort(w, x.b.clientOrgId!)} (${x.b.workMode === 'ONSITE' ? 'on-site' : 'remote only'}).`,
    why: 'Two clients’ mandates set opposite work modes for similar roles, and the same person is in both pipelines.',
    actions: [{ label: 'Explain', primary: true, act: { t: 'say', text: 'explain the conflict' } }],
  }))),
});

registerRule({
  id: 'agency.access-request', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => (!isAgency(w, a) || a.role === 'VIEWER' ? [] : agency(w).access.filter((r) => r.state === 'PENDING').map((r) => ({
    subject: r.id, text: `${actorOf(w, r.actorId).first} asked to see the confidential ${r.recordLabel} record.`, why: `${actorOf(w, r.actorId).first}’s role is Viewer; confidential client records need your yes.`,
    actions: [{ label: `Let ${actorOf(w, r.actorId).first} see it`, primary: true, act: { t: 'do', op: 'agency.access.decide', args: { id: r.id, d: 'GRANTED' } } }, { label: 'Decline', act: { t: 'do', op: 'agency.access.decide', args: { id: r.id, d: 'DECLINED' } } }],
  }))),
});

registerRule({
  id: 'agency.mention', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => (!isAgency(w, a) ? [] : agency(w).notes.filter((n) => n.mentions.includes(a.id) && !n.readBy.includes(a.id)).map((n) => ({
    subject: n.id, text: `${actorOf(w, n.by).first} mentioned you on ${clientShort(w, n.clientOrgId)}: “${n.text.slice(0, 90)}${n.text.length > 90 ? '…' : ''}”`, why: 'A note mentions you and you haven’t opened it yet.',
    actions: [{ label: 'Open notes', primary: true, act: { t: 'nav', to: `${P}/notes` } }],
  }))),
});
