// Candidate proactive rules for evidence-first hiring. Each reads real state and says why; nothing acts on its own.
import { registerRule } from '../core/proactive';
import { commitmentFor, openRequests, orgNm, requestsFor, reviewOf, roleTitle, interestFor, verifiedGap, weekdayDate } from '../../journeys/evidence/candidate/logic';
import { reqLabel } from '../../journeys/hire-b/model';

registerRule({
  id: 'evc.request', side: 'candidate', priority: 'high',
  evaluate: (w, a) => openRequests(w, a.personId ?? '').filter((d) => d.state === 'SENT').map((d) => ({
    subject: d.id,
    text: `${orgNm(w, d.orgId)} would like one short ${reqLabel(w, d.reqId).toLowerCase()} sample, about ${d.effortMinutes ?? 40} minutes, instead of a full assessment. Doing it, offering existing work and declining are all fine.`,
    why: `${orgNm(w, d.orgId)} sent this request through an approved message. Declining is recorded as declined, not as a fail.`,
    actions: [{ label: 'See the request', primary: true, act: { t: 'nav', to: `/c/applications?sample=${d.id}` } }, { label: 'Why are they asking?', act: { t: 'say', text: 'what does kora want from the sample' } }],
  })),
});

registerRule({
  id: 'evc.review.shared', side: 'candidate', priority: 'high',
  evaluate: (w, a) => requestsFor(w, a.personId ?? '').filter((d) => d.state === 'REVIEWED').map((d) => ({ d, r: reviewOf(w, d) })).filter((x) => x.r).map(({ d, r }) => ({
    subject: `rev:${d.id}`,
    text: `${orgNm(w, d.orgId)} reviewed your ${reqLabel(w, d.reqId).toLowerCase()} sample: ${r!.word.toLowerCase()}. They shared the reviewer’s note with you.`,
    why: `${orgNm(w, d.orgId)} marked the sample reviewed and shared the outcome. It stays between you and them.`,
    actions: [{ label: 'Read the note', primary: true, act: { t: 'nav', to: '/c/applications' } }],
  })),
});

registerRule({
  id: 'evc.interest', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => interestFor(w, a.personId ?? '').filter((i) => i.state === 'REQUESTED').map((i) => ({
    subject: `int:${i.orgId}:${i.mandateId}`,
    text: `${orgNm(w, i.orgId)} asked whether you’re interested in their ${roleTitle(w, i.mandateId)} role.`,
    why: 'They asked before taking more of your time. Not answering yet isn’t a no.',
    actions: [{ label: 'Yes, I’m interested', primary: true, act: { t: 'do', op: 'ev.interest.answer', args: { orgId: i.orgId, yes: true } } }, { label: 'Not right now', act: { t: 'do', op: 'ev.interest.answer', args: { orgId: i.orgId, yes: false } } }],
  })),
});

registerRule({
  id: 'evc.commit.late', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => w.applications.filter((x) => x.personId === a.personId && ['SUBMITTED', 'VIEWED', 'INTERVIEW'].includes(x.status)).map((x) => commitmentFor(w, x.id)).filter((c) => c?.late).map((c) => ({
    subject: `commit:${c!.id}`,
    text: `${orgNm(w, c!.orgId)} said they’d update you by ${weekdayDate(c!.nextUpdateDue)} and hasn’t yet. That’s late on their side, not a sign about you.`,
    why: `${orgNm(w, c!.orgId)} committed to “${c!.milestone.toLowerCase()}” by that date.`,
    actions: [{ label: 'Ask for an update', primary: true, act: { t: 'say', text: `follow up with ${orgNm(w, c!.orgId)}` } }],
  })),
});

registerRule({
  id: 'evc.gap', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => { const g = verifiedGap(w, a.personId ?? ''); return g ? [{
    subject: `gap:${g.reqId}`,
    text: `${g.label} is only partly shown for Kora Pay’s role. A 15-minute private practice could help, and only you would see it.`,
    why: 'Kora Pay’s reading of the evidence you shared marks it partial. Practice never becomes visible to employers.',
    actions: [{ label: 'Practise privately', primary: true, act: { t: 'do', op: 'ta.j7.quiz.start', args: { comp: 'incident' } } }],
  }] : []; },
});
