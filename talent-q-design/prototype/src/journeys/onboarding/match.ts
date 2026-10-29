// Entry-level matching against the world's real listings (w.jobs), explained need by need.
// A need is "evidenced" only by a Passport item that isn't a claim or practice; "mentioned" when the
// person said it (CV or conversation); otherwise "not shown". Fit is never a promise of anything.
import type { Job } from '../../state/domain';
import { simNow, type World } from '../../mock/world';
import { profileText, readProfile } from '../../services/profile';

export const NEED_KWS: Record<string, string[]> = {
  'SQL': ['sql'], 'Dashboards': ['dashboard', 'power bi', 'tableau', 'chart'], 'Product writing': ['brief', 'memo', 'product writing'],
  'Spreadsheets': ['excel', 'google sheets', 'spreadsheet', 'pivot'], 'Spreadsheet modelling': ['excel', 'google sheets', 'spreadsheet', 'model', 'tracker'],
  'Statistics': ['statistic', 'econometric', 'regression', 'spss', 'stata'], 'Survey analysis': ['survey', 'questionnaire'],
  'Clear writing': ['report', 'wrote', 'write-up', 'essay', 'thesis', 'brief'], 'Written clarity': ['report', 'wrote', 'write-up', 'essay', 'brief'],
  'Process mapping': ['process map', 'process mapping', 'workflow', 'flowchart'], 'Stakeholder conversations': ['interviewed', 'interview', 'committee', 'retail accounts', 'clients', 'stakeholder'],
  'User research': ['user research', 'interviewed', 'survey', 'questionnaire'], 'Team leadership': ['led a team', 'team lead', 'captain', 'president'],
  'Care experience': ['care assistant', 'caring'], 'Rota planning': ['rota'], 'First aid': ['first aid'],
  'Go in production': ['golang', ' go '], 'Postgres at scale': ['postgres'], 'Payments systems': ['payments'], 'Logistics systems': ['logistics'], 'Go': ['golang'], 'Incident leadership': ['incident'],
};
export type NeedState = 'evidenced' | 'mentioned' | 'none';
export interface NeedFit { need: string; state: NeedState; basis?: string }
export interface Match { job: Job; org: string; needs: NeedFit[]; fit: number; notes: string[]; applied?: string; isNew: boolean }

export const isEntry = (j: Job) => j.status === 'OPEN' && !/\b(senior|lead|staff|head|principal)\b/i.test(j.title) && (/\b(junior|graduate|trainee|assistant|associate|analyst)\b/i.test(j.title) || /\bI\b/.test(j.title));

export function needStatus(w: World, pid: string, need: string): NeedFit {
  const kws = NEED_KWS[need] ?? [need.toLowerCase()];
  const ev = w.evidence.find((e) => e.ownerId === pid && e.kind !== 'CLAIM' && e.kind !== 'PRACTICE' && kws.some((k) => `${e.title} ${e.shows}`.toLowerCase().includes(k.trim())));
  if (ev) return { need, state: 'evidenced', basis: `${ev.title} (${ev.verification === 'VERIFIED' ? 'checked' : 'in your Passport'})` };
  const p = readProfile(w, pid);
  const txt = ` ${profileText(p)} `;
  const k = kws.find((x) => txt.includes(x));
  if (k) {
    const claim = p.experience.flatMap((e) => e.claims).find((c) => c.text.toLowerCase().includes(k.trim()));
    const skill = p.skills.find((s) => s.label.toLowerCase().includes(k.trim()));
    return { need, state: 'mentioned', basis: claim ? `you said: “${claim.text.replace(/\.$/, '').slice(0, 60)}${claim.text.length > 61 ? '…' : ''}”` : skill ? `you listed ${skill.label}` : 'you mentioned it' };
  }
  return { need, state: 'none' };
}

export function entryMatches(w: World, pid: string, all = false): Match[] {
  const p = readProfile(w, pid);
  const t = simNow(w).getTime();
  return w.jobs.filter(isEntry).map((job) => {
    const needs = job.needs.map((n) => needStatus(w, pid, n));
    const fit = needs.filter((n) => n.state !== 'none').length;
    const notes: string[] = [];
    const remote = job.workMode === 'REMOTE';
    if (!p.location) notes.push('You haven’t said where you can work, so I haven’t checked location.');
    else if (!remote && !job.location.toLowerCase().includes(p.location.toLowerCase().split(/[ ,]/)[0]) && p.workMode !== 'remote') notes.push(`${job.workMode === 'HYBRID' ? 'Hybrid' : 'On-site'} in ${job.location}; you said ${p.location}.`);
    else if (remote) notes.push('Remote, so location isn’t a problem.');
    if (!job.signals.domainVerified) notes.push('Employer not verified yet.');
    const app = w.applications.find((a) => a.jobId === job.id && a.personId === pid);
    const age = (t - new Date(`${job.posted}T09:00:00+01:00`).getTime()) / 864e5;
    return { job, org: w.orgs.find((o) => o.id === job.orgId)?.name ?? job.orgId, needs, fit, notes, applied: app?.status, isNew: age >= 0 && age <= 7 };
  }).filter((m) => all || m.fit > 0).sort((a, b) => b.fit - a.fit || (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || a.job.title.localeCompare(b.job.title));
}

/** Find a job the person is talking about ("the tinda graduate one", "medlink BA"). */
export function jobFromText(w: World, norm: string, pool?: Job[]): Job | null {
  const jobs = pool ?? w.jobs;
  let best: { j: Job; s: number } | null = null;
  for (const j of jobs) {
    const org = w.orgs.find((o) => o.id === j.orgId)?.name.toLowerCase().split(' ')[0] ?? '';
    const tw = j.title.toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter((x) => x.length > 2 && !['the', 'and'].includes(x));
    let s = tw.filter((x) => norm.includes(x.slice(0, Math.max(4, x.length - 2)))).length;
    if (org && norm.includes(org)) s += 2;
    if (/\bba\b/.test(norm) && /business analyst/i.test(j.title)) s += 2;
    if (/\b(apm|pm)\b/.test(norm) && /product manager/i.test(j.title)) s += 2;
    if (s > 0 && (!best || s > best.s)) best = { j, s };
  }
  return best && best.s >= 2 ? best.j : null;
}
