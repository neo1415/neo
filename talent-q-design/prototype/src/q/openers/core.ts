// Openers for the pages the audit named (AD-B-01): recruiter home, compare, messages, candidate home, Passport,
// job detail. Each names the single most useful thing from live state; subjects match proactive-card subjects
// (event ids, evidence ids) so a card and the opener never say the same thing.
import { simNow } from '../../mock/world';
import { registerOpener } from '../core/openers';

const firstOf = (w: Parameters<Parameters<typeof registerOpener>[0]['build']>[0], pid: string) => w.people.find((p) => p.personId === pid)?.name.split(' ')[0] ?? 'They';
const ago = (from: string, now: Date) => { const d = Math.round((now.getTime() - new Date(from).getTime()) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'since yesterday' : `for ${d} days`; };

registerOpener({
  id: 'r.home', side: 'recruiter', match: (p) => p === '/r/home',
  build: (w, a) => {
    if (!a.orgId) return [];
    const now = simNow(w); const ts = w.threads.filter((t) => t.orgId === a.orgId);
    // Same as the page's "Needs you" (drafts and approvals first), so Q names the page's top item, not another.
    const waiting = ts.flatMap((t) => t.messages.filter((m) => m.status === 'AWAITING_APPROVAL' || m.status === 'DRAFT').map((m) => ({ t, m })));
    const replied = ts.filter((t) => t.messages.at(-1)?.status === 'RECEIVED');
    return [
      ...waiting.map(({ t, m }) => ({ subject: m.id, text: `${m.from === a.id ? 'Your' : `${w.actors.find((x) => x.id === m.from)?.first ?? 'A colleague'}’s`} ${/interview/i.test(m.subject ?? '') ? 'invitation' : 'message'} to ${firstOf(w, t.personId)} has waited ${ago(m.at, now).replace(/^for /, '')} for a yes.`, action: { label: 'Open it', primary: true, act: { t: 'nav' as const, to: '/r/messages' } } })),
      ...replied.map((t) => ({ subject: t.id, text: `${firstOf(w, t.personId)} replied and is waiting to hear back.`, action: { label: 'Draft a reply', primary: true, act: { t: 'say' as const, text: `draft a reply to ${firstOf(w, t.personId)}` } } })),
    ];
  },
});

registerOpener({
  id: 'r.compare', side: 'recruiter', match: (p) => p === '/r/compare',
  build: () => [{ subject: 'compare', text: 'Ask why someone ranks where they do, or change what counts.', action: { label: 'Why is Tobi first?', act: { t: 'say', text: 'why is tobi first' } } }],
});

registerOpener({
  id: 'r.messages', side: 'recruiter', match: (p) => p === '/r/messages',
  build: (w, a) => {
    const now = simNow(w);
    const open = w.threads.filter((t) => t.orgId === a.orgId && t.messages.at(-1)?.status === 'RECEIVED').sort((x, y) => (x.messages.at(-1)!.at).localeCompare(y.messages.at(-1)!.at));
    return open.map((t) => ({ subject: t.id, text: `${firstOf(w, t.personId)} has been waiting on a reply ${ago(t.messages.at(-1)!.at, now)}.`, action: { label: `Draft a reply to ${firstOf(w, t.personId)}`, primary: true, act: { t: 'say' as const, text: `draft a reply to ${firstOf(w, t.personId)}` } } }));
  },
});

registerOpener({
  id: 'c.home', side: 'candidate', match: (p) => p === '/c/home',
  build: (w, a) => {
    const now = simNow(w).getTime();
    const next = w.calendar.filter((e) => e.personId === a.personId && e.status !== 'CANCELLED' && new Date(e.start).getTime() > now).sort((x, y) => x.start.localeCompare(y.start))[0];
    const pending = w.evidence.filter((e) => e.ownerId === a.personId && e.verification === 'PENDING');
    return [
      ...(next ? [{ subject: next.id, text: 'Want a short practice first? It’s private and never counts.', action: { label: 'Practise now', primary: true, act: { t: 'say' as const, text: 'practice for my interview' } } }] : []),
      ...pending.map((e) => ({ subject: e.evidenceId, text: `“${e.title}” is still waiting on a check. Pending isn’t failed.`, action: { label: 'Ask again', act: { t: 'say' as const, text: `check ${e.title} again` } } })),
    ];
  },
});

registerOpener({
  id: 'c.passport', side: 'candidate', match: (p) => p === '/c/passport',
  build: (w, a) => {
    const mine = w.evidence.filter((e) => e.ownerId === a.personId && e.kind !== 'PRACTICE');
    const pending = mine.filter((e) => e.verification === 'PENDING');
    const priv = mine.filter((e) => e.visibility === 'PRIVATE').length;
    return [
      ...pending.map((e) => ({ subject: e.evidenceId, text: `“${e.title}” is waiting on its issuer. I can ask again.`, action: { label: 'Ask the issuer again', act: { t: 'say' as const, text: `check ${e.title} again` } } })),
      ...(priv ? [{ subject: 'passport.private', text: `${priv} of your items are private. Ask me what any employer can see.`, action: { label: 'What can Kora see?', act: { t: 'say' as const, text: 'what can kora see' } } }] : []),
    ];
  },
});

registerOpener({
  id: 'c.job', side: 'candidate', match: (p) => p.startsWith('/c/jobs/'),
  build: (w, _a, p) => {
    const job = w.jobs.find((j) => j.id === p.split('/')[3]); if (!job) return [];
    const org = w.orgs.find((o) => o.id === job.orgId)?.name ?? 'the employer';
    return [{ subject: `job:${job.id}`, text: `Ask me anything about this role, or whether you can contact ${org} first.`, action: { label: 'Can I contact someone?', act: { t: 'say', text: 'can I contact someone about this role?' } } }];
  },
});

registerOpener({
  id: 'r.home.founder', side: 'recruiter', match: (p) => p === '/r/home',
  build: (w, a) => {
    const org = w.orgs.find((o) => o.id === a.orgId);
    if (!org || org.setup.done) return [];
    return [{ subject: 'founder.start', text: 'Start with one line about what keeps going wrong. I’ll work out the role from it.', action: { label: 'Start with Q', primary: true, act: { t: 'say', text: 'I need help but I’m not sure who to hire' } } }];
  },
});

registerOpener({
  id: 'c.home.new', side: 'candidate', match: (p) => p === '/c/home',
  build: (w, a) => {
    const has = w.evidence.some((e) => e.ownerId === a.personId) || !!w.profiles[a.personId ?? '']?.answered.length;
    return has ? [] : [{ subject: 'candidate.start', text: 'Tell me one thing you’ve done that you’re proud of. Anything counts.', action: { label: 'Start with Q', primary: true, act: { t: 'say', text: 'help me build my profile' } } }];
  },
});

registerOpener({
  id: 'r.rubric', side: 'recruiter', match: (p) => /^\/r\/roles\/[^/]+\/rubric$/.test(p),
  build: (w, _a, p) => {
    const id = p.split('/')[3];
    const rub = (w.areas.rubrics as { list: { mandateId: string; versions: { v: number; state: string }[] }[] } | undefined)?.list.find((r) => r.mandateId === id);
    const title = id === w.mandate.mandateId ? w.mandate.title : w.mandates.find((m) => m.id === id)?.title ?? 'this role';
    const draft = rub?.versions.find((v) => v.state === 'Q_PROPOSED');
    if (!rub) return [{ subject: `rubric:${id}`, text: 'I can draft the criteria from the approved brief. You edit them, then approve.', action: { label: 'Propose a rubric', primary: true, act: { t: 'say', text: `propose a rubric for the ${title.toLowerCase()} role` } } }];
    if (draft) return [{ subject: `rubric:${id}`, text: `Draft v${draft.v} isn’t in use until you approve it.`, action: { label: 'Approve the rubric', primary: true, act: { t: 'say', text: 'approve the rubric' } } }];
    return [];
  },
});

registerOpener({
  id: 'settings.email', side: 'both', match: (p) => p === '/settings/email',
  build: (w, a) => {
    const boxes = (w.areas.mail as { mailboxes: { address: string; sendAs: string[]; state: string }[] } | undefined)?.mailboxes.filter((m) => m.sendAs.includes(a.id)) ?? [];
    const exp = boxes.find((m) => m.state === 'EXPIRED');
    return exp
      ? [{ subject: `mailbox:${exp.address}`, text: `${exp.address} needs you to sign in again. Approved drafts are kept.`, action: { label: 'How do I reconnect?', act: { t: 'say', text: 'reconnect my email' } } }]
      : boxes.length ? [{ subject: 'mail.what', text: 'Ask what I may do with each account before you change anything.', action: { label: 'What can Q do with my email?', act: { t: 'say', text: 'what can you do with my email?' } } }] : [];
  },
});
