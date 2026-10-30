// TALENT-D proactive rules. Each reads real state and says why; nothing acts on its own.
import { registerRule } from '../core/proactive';
import { tdRead } from '../../state/areas/talent-d';
import { latest, orgNm, worksOf } from '../../journeys/talent-d/logic';

registerRule({
  id: 'td.recovery', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => w.applications.filter((x) => x.personId === a.personId && x.status === 'NOT_PROGRESSING' && !tdRead(w).recovery[x.id]).map((x) => {
    const job = w.jobs.find((j) => j.id === x.jobId); const org = job ? orgNm(w, job.orgId) : 'The employer';
    return {
      subject: `td.rec:${x.id}`,
      text: `${org} isn’t taking your ${job?.title ?? ''} application further. Want to talk it through? I’ll only use what they tell you.`,
      why: `${org} updated the application in Talent Q. They didn’t share a reason, and Q doesn’t guess one.`,
      actions: [{ label: 'Talk it through', primary: true, act: { t: 'nav', to: `/c/applications/${x.id}/recovery` } }],
    };
  }),
});

registerRule({
  id: 'td.version.behind', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => worksOf(w, a.personId ?? '').flatMap((x) => Object.entries(x.sharedV).filter(([o, v]) => v < latest(x).v && x.versions.slice(v).some((ver) => ver.changes.some((c) => c.kind === 'CORRECTED')) && w.evidence.find((e) => e.evidenceId === x.evidenceId)?.sharedWith.includes(o)).map(([o, v]) => ({
    subject: `td.vb:${x.id}:${o}`,
    text: `${orgNm(w, o)} has version ${v} of “${x.title.split(',')[0]}”, from before you corrected a figure.`,
    why: 'Employers keep the version you gave them. New versions stay private until you share one.',
    actions: [{ label: 'See versions', primary: true, act: { t: 'nav', to: `/c/work/versions?w=${x.id}` } }],
  }))),
});
