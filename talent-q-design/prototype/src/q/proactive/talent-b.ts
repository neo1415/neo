// talent-b proactive rules: each reads real state and says why. Nothing acts on its own.
import { registerRule } from '../core/proactive';
import { simNow } from '../../mock/world';
import { appExplain, orgName, tb, verOf } from '../../journeys/talent-b/logic';

registerRule({
  id: 'tb.cert.failed', side: 'candidate', priority: 'high',
  evaluate: (w, a) => w.evidence.filter((e) => e.ownerId === a.personId && verOf(e) === 'FAILED' && !tb(w).ackFailed.includes(e.evidenceId)).map((e) => ({
    subject: e.evidenceId,
    text: `Your ${/aws/i.test(e.title) ? 'AWS certificate' : `“${e.title}”`} check failed: the issuer couldn’t confirm it. It’s usually a typo or an expired record, and it’s fixable.`,
    why: `The issuer answered the last check on “${e.title}” but couldn’t match it. Until it’s fixed, employers you share it with would see “check failed”.`,
    actions: [{ label: 'What can I do?', primary: true, act: { t: 'say', text: `my ${/aws/i.test(e.title) ? 'aws cert' : 'certificate'} check failed, what do i do now` } }],
  })),
});

registerRule({
  id: 'tb.app.noreply', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => w.applications.filter((x) => x.personId === a.personId).map((x) => ({ x, e: appExplain(w, x) })).filter((y) => y.e.waiting).map(({ x, e }) => ({
    subject: x.id,
    text: `${e.org} hasn’t replied in ${e.days} days about ${e.job?.title}. That’s common and isn’t about you. A polite follow-up is fine, or you can move on.`,
    why: `You applied on ${e.applied ? new Date(e.applied).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'an earlier date'} and ${e.org} hasn’t done anything on Talent Q since. I suggest a follow-up after ${tb(w).noReplyDays} days.`,
    actions: [{ label: 'Draft a follow-up', primary: true, act: { t: 'say', text: `follow up with ${e.org}` } }, { label: 'Move on', act: { t: 'do', op: 'tb.followup.moveon', args: { appId: x.id } } }],
  })),
});

registerRule({
  id: 'tb.saved.closed', side: 'candidate', priority: 'high',
  evaluate: (w, a) => (tb(w).saved[a.personId ?? ''] ?? []).map((id) => w.jobs.find((j) => j.id === id)).filter((j) => j?.status === 'CLOSED').map((j) => ({
    subject: j!.id,
    text: `A job you saved closed: ${orgName(w, j!.orgId)}’s ${j!.title}. There are similar ones still open.`,
    why: `You saved “${j!.title}”, and ${orgName(w, j!.orgId)} closed the listing. Closing a listing isn’t a decision about you.`,
    actions: [{ label: 'Show similar open jobs', primary: true, act: { t: 'say', text: 'show me similar jobs that are still open' } }],
  })),
});

registerRule({
  id: 'tb.interview.soon', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => {
    const t = simNow(w).getTime();
    return w.calendar.filter((e) => e.personId === a.personId && e.status !== 'CANCELLED' && new Date(e.start).getTime() > t && new Date(e.start).getTime() - t < 7 * 864e5).map((e) => ({
      subject: e.id,
      text: `Your ${orgName(w, e.orgId)} interview is ${new Date(e.start).toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: a.timezone })}. Want to prepare together?`,
      why: 'It’s on your calendar within the next week.',
      actions: [{ label: 'Prepare', primary: true, act: { t: 'say', text: 'help me prepare for my interview' } }],
    }));
  },
});

registerRule({
  id: 'tb.cert.pending', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => w.evidence.filter((e) => e.ownerId === a.personId && verOf(e) === 'PENDING' && e.kind === 'CREDENTIAL' && !tb(w).checks.some((c) => c.evidenceId === e.evidenceId)).slice(0, 1).map((e) => ({
    subject: e.evidenceId,
    text: `“${e.title}” is still waiting on the issuer. Pending isn’t failed. Want me to ask again?`,
    why: 'The check was started a while ago and the issuer hasn’t answered.',
    actions: [{ label: 'Ask again', primary: true, act: { t: 'do', op: 'tb.verify', args: { id: e.evidenceId } } }],
  })),
});
