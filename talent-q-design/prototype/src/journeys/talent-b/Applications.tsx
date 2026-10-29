// Applications for whichever candidate is signed in (Zara, Amaka, Chidi…): honest status with no promises,
// days since the employer last did anything, a polite follow-up or "move on" after N days, the evidence
// shared with each application, and a link to the conversation in messages.
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { runAction } from '../../q/core/engine';
import { Link, navigate } from '../../ui/router';
import { APP_LABEL, appExplain, evById, fmtDate, tb } from './logic';
import type { Application } from '../../state/domain';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
const say = (text: string) => void runAction({ label: text, act: { t: 'say', text } });
const K: Record<Application['status'], 'ok' | 'warn' | 'risk' | 'busy' | undefined> = { DRAFT: undefined, SUBMITTED: undefined, VIEWED: 'busy', INTERVIEW: 'ok', OFFER: 'ok', NOT_PROGRESSING: 'risk', WITHDRAWN: undefined, JOB_CLOSED: 'warn' };

export function ApplicationsPage() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const apps = w.applications.filter((x) => x.personId === pid);
  const moved = (id: string) => tb(w).followups.find((f) => f.appId === id)?.state === 'MOVED_ON';
  const sorted = [...apps].sort((x, y) => Number(moved(x.id)) - Number(moved(y.id)) || (y.timeline[0]?.at ?? '').localeCompare(x.timeline[0]?.at ?? ''));
  return (
    <Canvas title="Your applications" kicker={`${a.first} · ${apps.length} ${apps.length === 1 ? 'application' : 'applications'}`} open onClose={() => navigate('/c/home')}>
      <p className="t14 muted" style={{ margin: 0, maxWidth: 720 }}>Statuses come only from what employers actually did in Talent Q. Q never guesses a decision and can’t promise one.</p>
      {apps.length === 0 ? (
        <section className="ds-sheet tb-stack"><p style={{ margin: 0 }}>You haven’t applied for anything yet.</p><Link className="ds-btn" style={{ justifySelf: 'start' }} to="/c/jobs">Find jobs</Link></section>
      ) : (
        <ul className="tb-stack" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Applications">
          {sorted.map((app) => {
            const x = appExplain(w, app);
            const thread = w.threads.find((t) => t.personId === pid && t.orgId === x.job?.orgId);
            const shared = app.shared.map((id) => evById(w, id)).filter(Boolean);
            const live = ['SUBMITTED', 'VIEWED', 'INTERVIEW'].includes(app.status);
            return (
              <li key={app.id} className="ds-sheet tb-stack tb-app" data-moved={moved(app.id) || undefined}>
                <div className="tb-row-between">
                  <span className="lab">{x.org}{x.job?.status === 'CLOSED' ? ' · listing closed' : ''}</span>
                  <span className="ds-tag" data-k={K[app.status]}>{APP_LABEL[app.status]}</span>
                </div>
                <h2 className="tb-title">{x.job ? <Link to={`/c/jobs/${x.job.id}`}>{x.job.title}</Link> : 'Job removed'}</h2>
                <p style={{ margin: 0 }}>{x.plain}</p>
                {live && app.status !== 'INTERVIEW' && <p className="t14" style={{ margin: 0 }}><b>{x.days} days</b> since {app.lastEmployerActivity ? `${x.org} last did anything` : 'you applied'}.</p>}
                {x.waiting && (
                  <div className="ds-banner" data-k="warn"><span aria-hidden="true">…</span><span>No reply in {x.days} days. That’s common and says nothing about you. A short, polite follow-up is fine, or you can move on.</span><span /></div>
                )}
                {x.followup && <p className="t14 muted" style={{ margin: 0 }}>{x.followup.state === 'MOVED_ON' ? 'You moved on. It stays open on their side.' : `You followed up on ${fmtDate(x.followup.at)} (simulated).`}</p>}
                <details>
                  <summary className="t14">Timeline and what you shared</summary>
                  <ol className="tb-timeline">{app.timeline.map((t, i) => <li key={i}><span className="t14 muted num">{fmtDate(t.at)}</span><span>{t.text}</span></li>)}</ol>
                  <p className="t14" style={{ margin: 0 }}>Shared with this application: {shared.length ? shared.map((e) => e!.title).join('; ') : 'nothing from your Passport'}.</p>
                </details>
                <div className="tb-actions">
                  {x.waiting && <button type="button" className="ds-btn primary" onClick={() => say(`follow up with ${x.org}`)}>Draft a follow-up</button>}
                  {x.waiting && <button type="button" className="ds-btn" onClick={() => act('tb.followup.moveon', { appId: app.id })}>Move on</button>}
                  {thread ? <Link className="ds-btn" to="/c/messages">Messages ({thread.messages.length})</Link> : null}
                  {live && <button type="button" className="ds-btn quiet" onClick={() => say(`withdraw my application to ${x.org}`)}>Withdraw</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <details className="ds-sheet tb-details">
        <summary><b>What each status means</b></summary>
        <ul className="t14">
          <li><b>Sent</b>: delivered. The employer hasn’t opened it, as far as Talent Q can see.</li>
          <li><b>Viewed</b>: someone opened it. Only that: not a shortlist, not a decision.</li>
          <li><b>Interview</b>: you were invited. A step, not an offer.</li>
          <li><b>Not progressing</b>: the employer told Talent Q they aren’t taking it further.</li>
          <li><b>Listing closed</b>: the job stopped taking applications. Not a rejection.</li>
        </ul>
        <p className="t14 muted" style={{ margin: 0 }}>Some employers never reply to anyone. Q suggests a follow-up after {tb(w).noReplyDays} days with no activity.</p>
      </details>
    </Canvas>
  );
}

