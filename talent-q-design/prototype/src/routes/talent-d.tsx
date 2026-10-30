// Routes for TALENT-D (coverage build, 30 Oct). No rail entries: the Career rail is at its nine-item limit, so these
// pages are reached from the Passport, jobs, applications, the career atlas, the command palette and Q.
import { registerRoute } from './registry';
import { WorkPermitPage } from '../journeys/talent-d/WorkPermit';
import { CritiquePage, VersionsPage } from '../journeys/talent-d/Work';
import { LetterPage } from '../journeys/talent-d/Letter';
import { LearnPage } from '../journeys/talent-d/Learn';
import { ImprovePage } from '../journeys/talent-d/Improve';
import { RecoveryPage } from '../journeys/talent-d/Recovery';
import '../journeys/talent-d/refs';
import { registerHomeSection } from './entry';
import { Link } from '../ui/router';
import { actorOf, useWorld, type World } from '../mock/world';
import { Still } from '../journeys/talent-d/motions';
import { tdRead } from '../state/areas/talent-d';
import { authOf, resourcesFor, worksOf } from '../journeys/talent-d/logic';
import type { ReactNode } from 'react';

const S = (n: ReactNode) => <Still>{n}</Still>;

/** Home: at most two quiet links into these pages, from the person's own state. */
function links(w: World): { to: string; label: string; why: string }[] {
  const a = actorOf(w); const pid = a.personId ?? ''; const out: { to: string; label: string; why: string }[] = [];
  const rej = w.applications.find((x) => x.personId === pid && x.status === 'NOT_PROGRESSING');
  if (rej) out.push({ to: `/c/applications/${rej.id}/recovery`, label: 'After a “no”', why: 'Only what the employer told you, and what could help next.' });
  const work = worksOf(w, pid)[0];
  if (work) out.push({ to: `/c/work/critique?w=${work.id}`, label: `Q’s read of “${work.title.split(':')[0].split(',')[0]}”`, why: 'Kind, specific, private.' });
  const r = resourcesFor(pid)[0];
  if (r && !tdRead(w).learn[pid]?.[r.id]?.done) out.push({ to: `/c/learn/${r.id}`, label: r.title, why: `A ${r.minutes}-minute lesson tied to your plan.` });
  if (a.timezone !== 'Africa/Lagos' || authOf(w, pid).entries.length) out.push({ to: '/c/work-permit', label: 'Where you can work', why: 'Optional, private, never a filter.' });
  if (pid === 'p_grace') out.push({ to: '/c/jobs/j_care_coord/letter', label: 'A cover note for Sunrise Care', why: 'From your own facts only.' });
  return out.slice(0, 2);
}
function ForYou() {
  const l = JSON.parse(useWorld((w) => JSON.stringify(links(w)))) as ReturnType<typeof links>;
  if (!l.length) return null;
  return (
    <section className="ds-sheet td-stack" aria-labelledby="td-home-h">
      <h2 id="td-home-h" className="lab" style={{ margin: 0 }}>Also for you</h2>
      <ul className="td-nextsteps">{l.map((x) => <li key={x.to}><span><b>{x.label}</b><span className="t14 muted" style={{ display: 'block' }}>{x.why}</span></span><Link className="ds-btn" to={x.to}>Open</Link></li>)}</ul>
    </section>
  );
}
registerHomeSection('candidate', { id: 'talent-d.for-you', order: 60, when: (w) => links(w).length > 0, render: () => <ForYou /> });

registerRoute({ path: '/c/work-permit', side: 'candidate', label: 'where you can work', render: () => S(<WorkPermitPage />) });
registerRoute({ path: '/c/work/critique', side: 'candidate', label: 'Q’s read of your work', render: () => S(<CritiquePage />) });
registerRoute({ path: '/c/work/versions', side: 'candidate', label: 'your work’s versions', render: () => S(<VersionsPage />) });
registerRoute({ path: '/c/jobs/:id/letter', side: 'candidate', label: 'a cover note', render: (p) => S(<LetterPage jobId={p.id} />) });
registerRoute({ path: '/c/learn/:id', side: 'candidate', label: 'a lesson', render: (p) => S(<LearnPage id={p.id} />) });
registerRoute({ path: '/c/career/improve', side: 'candidate', label: 'improve your work sample', render: () => S(<ImprovePage />) });
registerRoute({ path: '/c/applications/:id/recovery', side: 'candidate', label: 'after a decision', render: (p) => S(<RecoveryPage appId={p.id} />) });
