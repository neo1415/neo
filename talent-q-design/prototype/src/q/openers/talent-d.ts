// Page-aware openers for TALENT-D pages. Each names the one thing on the page that needs the person, from live state.
import { registerOpener } from '../core/openers';
import { tdRead } from '../../state/areas/talent-d';
import { authOf, latest, letterOf, liveShares, orgNm, resourceById, worksOf } from '../../journeys/talent-d/logic';
import { readJ7 } from '../../journeys/career/j7';

registerOpener({
  id: 'td.auth', side: 'candidate', match: (p) => p === '/c/work-permit',
  build: (w, a) => {
    const au = authOf(w, a.personId ?? ''); const live = liveShares(au);
    if (!au.entries.length) return [{ subject: 'td.auth.empty', text: 'Where can you work? Tell me in a sentence; it stays private.', action: { label: 'I’m a Ghanaian citizen', act: { t: 'say', text: 'I’m a Ghanaian citizen and I’d need a permit for Nigeria' } } }];
    if (!live.length) return [{ subject: 'td.auth.private', text: 'Nobody can see this yet. Share it only with employers you pick.', action: { label: 'Who could I share it with?', act: { t: 'say', text: 'who can see my work permit' } } }];
    return [{ subject: 'td.auth.live', text: `${live.map((r) => orgNm(w, r.org)).join(' and ')} can see it. End that any time.`, action: { label: `Stop ${orgNm(w, live[0].org)} seeing it`, act: { t: 'say', text: `stop ${orgNm(w, live[0].org)} seeing my work permit` } } }];
  },
});

registerOpener({
  id: 'td.critique', side: 'candidate', match: (p) => p === '/c/work/critique',
  build: (w, a) => {
    const x = worksOf(w, a.personId ?? '')[0]; if (!x) return [];
    const open = x.critique?.points.filter((p) => p.state === 'OPEN') ?? [];
    if (!x.critique) return [{ subject: `td.crit.${x.id}`, text: `Want me to read version ${latest(x).v}? Kind, specific, private.`, action: { label: 'Read it', primary: true, act: { t: 'do', op: 'td.work.critique', args: { id: x.id } } } }];
    return open.length ? [{ subject: `td.crit.open.${x.id}`, text: `${open.length} suggestion${open.length === 1 ? '' : 's'} still open. Start with “${open[0].title.toLowerCase()}”.` }] : [];
  },
});

registerOpener({
  id: 'td.versions', side: 'candidate', match: (p) => p === '/c/work/versions',
  build: (w, a) => {
    const x = worksOf(w, a.personId ?? '')[0]; if (!x) return [];
    const behind = Object.entries(x.sharedV).filter(([, v]) => v < latest(x).v);
    return behind.length ? [{ subject: `td.v.behind.${x.id}`, text: 'Compare any two versions, or bring an old one back. Nothing is ever deleted.', action: { label: 'What changed?', act: { t: 'say', text: 'what changed in my versions' } } }] : [];
  },
});

registerOpener({
  id: 'td.letter', side: 'candidate', match: (p) => /^\/c\/jobs\/[\w-]+\/letter$/.test(p),
  build: (w, a, p) => {
    const jobId = p.split('/')[3]; const l = letterOf(w, a.personId ?? '', jobId);
    if (!l) return [{ subject: `td.l.${jobId}`, text: 'I’ll write only from your own facts, with a source on every line.', action: { label: 'Draft a short note', primary: true, act: { t: 'do', op: 'td.letter.draft', args: { jobId, length: 'NOTE' } } } }];
    return l.state === 'DRAFT' ? [{ subject: `td.l.d.${jobId}`, text: 'Your draft is waiting for your yes. Nothing is sent.', action: { label: 'Approve it', act: { t: 'say', text: 'approve the cover letter' } } }] : [];
  },
});

registerOpener({
  id: 'td.learn', side: 'candidate', match: (p) => p.startsWith('/c/learn/'),
  build: (w, a, p) => {
    const r = resourceById(p.split('/')[3]); if (!r) return [];
    const st = tdRead(w).learn[a.personId ?? '']?.[r.id];
    return st?.done ? [{ subject: `td.learn.done.${r.id}`, text: 'Finished. Want one private practice question next?', action: { label: 'Practise', act: { t: 'do', op: r.practice.op, args: r.practice.args } } }]
      : [{ subject: `td.learn.${r.id}`, text: `About ${r.minutes} minutes. Prefer reading? The same lesson is an article.`, action: { label: 'Show the transcript', act: { t: 'say', text: 'show the transcript' } } }];
  },
});

registerOpener({
  id: 'td.improve', side: 'candidate', match: (p) => p === '/c/career/improve',
  build: (w, a) => {
    const s = tdRead(w).wizard[a.personId ?? '']; const first = readJ7(w, a.personId ?? '').assessments.some((x) => x.comp === (s?.comp ?? 'writing'));
    if (!first) return [{ subject: 'td.wiz.first', text: 'Your brief needs a first review before we improve it.', action: { label: 'Send it for review', primary: true, act: { t: 'do', op: 'td.wiz.first' } } }];
    if (s?.step === 3) return [{ subject: 'td.wiz.choose', text: 'Reviewed. It counts only if you choose to use it.' }];
    return [{ subject: 'td.wiz.go', text: 'The reviewer asked for evidence. Only you can add that part.' }];
  },
});

registerOpener({
  id: 'td.recovery', side: 'candidate', match: (p) => /^\/c\/applications\/[\w-]+\/recovery$/.test(p),
  build: (w, _a, p) => {
    const appId = p.split('/')[3]; const r = tdRead(w).recovery[appId]; const app = w.applications.find((x) => x.id === appId); const job = app && w.jobs.find((j) => j.id === app.jobId); if (!job) return [];
    const org = orgNm(w, job.orgId);
    if (r?.feedback) return [{ subject: `td.rec.fb.${appId}`, text: `${org} named one thing. Your brief is the closest fix.`, action: { label: 'Improve my brief', primary: true, act: { t: 'nav', to: '/c/career/improve' } } }];
    if (r?.asked?.state === 'DRAFT') return [{ subject: `td.rec.draft.${appId}`, text: `Your note to ${org} is waiting for your yes.` }];
    if (r?.asked) return [{ subject: `td.rec.sent.${appId}`, text: `Asked ${org}. Sent isn’t read; they may not reply.` }];
    return [{ subject: `td.rec.${appId}`, text: `${org} didn’t say why. I won’t guess; you could ask them.`, action: { label: `Ask ${org} for feedback`, act: { t: 'do', op: 'td.rec.ask', args: { appId } } } }];
  },
});
