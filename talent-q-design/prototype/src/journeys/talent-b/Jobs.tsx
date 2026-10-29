// T5 · Jobs and job detail: employer verification signals (and what they don't mean), matching with the
// evidence used, mutual fit from what the person told Q, applying with per-item consent, and a listing that
// can close part-way through. Q can do every step from the conversation.
import type { Job } from '../../state/domain';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { runAction, useViewState } from '../../q/core/engine';
import { prefillQ } from '../../q/QThread';
import { Link, navigate, useRoute } from '../../ui/router';
import { APP_LABEL, NEED_GLYPH, NEED_LABEL, adviceFor, fitLine, matchFor, mutualFit, orgName, signalsOf, tb, verifiedEmployer, evById, KIND } from './logic';
import { VerTag } from './ui';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
type F = 'all' | 'verified' | 'saved' | 'remote';

function Signals({ job, compact }: { job: Job; compact?: boolean }) {
  const w = useWorld((x) => x);
  const s = signalsOf(w, job); const ok = verifiedEmployer(w, job);
  if (compact) return <span className="ds-tag" data-k={ok ? 'ok' : 'warn'}>{ok ? <Glyph k="verified" size={14} /> : <span aria-hidden="true">?</span>}{ok ? 'Verified employer' : 'Not verified'}</span>;
  return (
    <ul className="tb-signals">
      {s.map((x) => <li key={x.k}><span className="ds-tag" data-k={x.on ? 'ok' : 'warn'}>{x.on ? '✓' : '–'} {x.k}: {x.on ? 'yes' : 'no'}</span><span className="t14 muted">{x.plain}</span></li>)}
      <li><span className="ds-tag">{job.signals.replies}</span><span className="t14 muted">From this employer’s past replies on Talent Q. It isn’t a promise that you’ll hear back.</span></li>
    </ul>
  );
}

export function JobsPage() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const { query } = useRoute();
  const [f, setF] = useViewState<F>('filter', 'all');
  const filter: F = (query.get('f') as F | null) ?? f;
  const saved = tb(w).saved[pid] ?? [];
  // Fit first; at equal fit, verified employers before unverified ones.
  const score = (j: Job, m: ReturnType<typeof matchFor>) => m.filter((n) => n.state !== 'NONE').length / Math.max(1, m.length) + (verifiedEmployer(w, j) ? 0.01 : 0);
  const open = w.jobs.filter((j) => j.status === 'OPEN');
  const shown = open.filter((j) => filter === 'all' || (filter === 'verified' && verifiedEmployer(w, j)) || (filter === 'saved' && saved.includes(j.id)) || (filter === 'remote' && j.workMode === 'REMOTE'))
    .map((j) => ({ j, m: matchFor(w, pid, j) })).sort((x, y) => score(y.j, y.m) - score(x.j, x.m));
  const closedSaved = saved.map((id) => w.jobs.find((j) => j.id === id)).filter((j): j is Job => !!j && j.status === 'CLOSED');
  return (
    <Canvas title="Jobs" kicker={`${a.first} · ${open.length} open`} open onClose={() => navigate('/c/home')}>
      {closedSaved.map((j) => <div key={j.id} className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">⚠</span><span><b>Closed:</b> {orgName(w, j.orgId)}’s {j.title}, which you saved. Closing a listing isn’t a decision about you.</span><button type="button" className="ds-btn" onClick={() => act('tb.save', { jobId: j.id })}>Remove</button></div>)}
      <div className="tb-filters" role="group" aria-label="Filter jobs">
        {([['all', 'All'], ['verified', 'Verified employers'], ['saved', `Saved (${saved.filter((id) => open.some((j) => j.id === id)).length})`], ['remote', 'Remote']] as const).map(([v, l]) => <button key={v} type="button" className="ds-filter" aria-pressed={filter === v} onClick={() => { setF(v); if (query.get('f')) navigate('/c/jobs'); }}>{l}</button>)}
      </div>
      {shown.length === 0 ? <section className="ds-sheet"><p style={{ margin: 0 }}>{filter === 'saved' ? 'No saved jobs are open right now.' : 'No jobs match this filter.'} <button type="button" className="ds-btn quiet" onClick={() => setF('all')}>Show all jobs</button></p></section> : (
        <ul className="tb-grid" aria-label="Open jobs">
          {shown.map(({ j, m }) => (
            <li key={j.id} className="ds-sheet tb-card">
              <div className="tb-row-between"><span className="lab">{orgName(w, j.orgId)}</span><Signals job={j} compact /></div>
              <h2 className="tb-title"><Link to={`/c/jobs/${j.id}`}>{j.title}</Link></h2>
              <p className="t14" style={{ margin: 0 }}>{j.location} · {j.workMode.toLowerCase()} · {j.pay}</p>
              <p className="t14" style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{m.map((n) => <Glyph key={n.need} k={NEED_GLYPH[n.state]} size={16} title={`${n.need}: ${NEED_LABEL[n.state]}`} />)}<b>{fitLine(m)}</b></p>
              <p className="t14 muted" style={{ margin: 0 }}>{j.signals.replies}</p>
              <div className="tb-actions">
                <Link className="ds-btn primary" to={`/c/jobs/${j.id}`}>Open</Link>
                <button type="button" className="ds-btn" aria-pressed={saved.includes(j.id)} onClick={() => act('tb.save', { jobId: j.id })}>{saved.includes(j.id) ? 'Saved' : 'Save'}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <details className="ds-sheet tb-details">
        <summary><b>What the employer signals mean, and what they don’t</b></summary>
        <ul className="t14">
          <li><b>Email domain checked</b>: the recruiter’s email is on the company’s own domain. It shows they work there; not that the job is good.</li>
          <li><b>Registered business</b>: confirmed with the business registry (simulated). It shows the company exists; nothing about pay, culture or fairness.</li>
          <li><b>Recruiter active</b>: someone from the employer used Talent Q in the last 14 days. Inactive employers may never read applications.</li>
          <li><b>Not verified</b> doesn’t mean a scam. It means unchecked: share less, and never pay to apply.</li>
          <li><b>Needs shown</b>: how many of the job’s stated needs your Passport shows. It isn’t a prediction of the employer’s decision.</li>
        </ul>
      </details>
    </Canvas>
  );
}

export function JobDetailPage({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const job = w.jobs.find((j) => j.id === id);
  if (!job) return <Canvas title="Job not found" kicker="Jobs" open onClose={() => navigate('/c/jobs')}><section className="ds-sheet"><p style={{ margin: 0 }}>This job doesn’t exist or was removed. <Link to="/c/jobs">Back to jobs</Link></p></section></Canvas>;
  const m = matchFor(w, pid, job); const fit = mutualFit(w, pid, job);
  const app = w.applications.find((x) => x.personId === pid && x.jobId === job.id && x.status !== 'WITHDRAWN');
  const ap = tb(w).applying[pid]; const applying = ap?.jobId === job.id ? ap : null;
  const saved = (tb(w).saved[pid] ?? []).includes(job.id);
  const advice = adviceFor(w, pid, job);
  const declined = tb(w).declined[pid] ?? [];
  const closed = job.status === 'CLOSED';
  return (
    <Canvas title={job.title} kicker={<>{orgName(w, job.orgId)} · <Link to="/c/jobs">All jobs</Link></>} open onClose={() => navigate('/c/jobs')}
      aside={<div className="tb-actions"><button type="button" className="ds-btn" aria-pressed={saved} onClick={() => act('tb.save', { jobId: job.id })}>{saved ? 'Saved' : 'Save'}</button>{!app && !applying && !closed && <button type="button" className="ds-btn primary" onClick={() => act('tb.apply.start', { jobId: job.id })}>Apply</button>}</div>}>
      {closed && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">⚠</span><span><b>This listing has closed.</b> It isn’t taking applications. {applying ? 'Nothing was sent; your choices are kept below in case it reopens.' : ''}</span><button type="button" className="ds-btn" onClick={() => void runAction({ label: 'similar', act: { t: 'say', text: 'show me similar jobs that are still open' } })}>Similar open jobs</button></div>}
      {app && <div className="ds-banner" role="status"><Glyph k="full" /><span>You applied. Status: <b>{APP_LABEL[app.status]}</b>.</span><Link className="ds-btn" to="/c/applications">Track it</Link></div>}
      <p style={{ margin: 0 }}>{job.location} · {job.workMode.toLowerCase()} · {job.pay} · posted {new Date(job.posted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>

      {applying && (
        <section className="ds-sheet tb-stack tb-apply" aria-labelledby="tb-ap-h">
          <div className="tb-row-between"><h2 id="tb-ap-h" className="voice t24" style={{ margin: 0 }}>Your application</h2><span className="ds-sim">Simulated send</span></div>
          <p className="t14" style={{ margin: 0 }}>Choose exactly what {orgName(w, job.orgId)} sees. Nothing else in your Passport is shared.{!verifiedEmployer(w, job) && ' This employer isn’t verified: share as little as you can.'}</p>
          <div className="tb-stack" role="group" aria-label="Items to share">
            {[...new Set([...m.flatMap((n) => n.used.map((e) => e.evidenceId)), ...applying.shared])].map((eid) => { const e = evById(w, eid); if (!e) return null; const on = applying.shared.includes(eid); return <button key={eid} type="button" className="ds-opt" aria-pressed={on} disabled={closed} onClick={() => act('tb.apply.set', { toggle: eid })}><span><b>{e.title}</b><span className="t14 muted" style={{ display: 'block' }}>{KIND[e.kind]} · {on ? 'will be shared' : 'not shared'}</span></span></button>; })}
          </div>
          <label className="tb-check"><input type="checkbox" checked={applying.consent} disabled={closed} onChange={(ev) => act('tb.apply.set', { consent: ev.target.checked })} /> I agree {orgName(w, job.orgId)} can see these {applying.shared.length} items for this application.</label>
          {applying.blocked && <p role="alert" className="t14" style={{ margin: 0, color: 'var(--risk)' }}>The listing closed while you were applying. Nothing was sent.</p>}
          <div className="tb-actions">
            <button type="button" className="ds-btn primary" disabled={closed || !applying.consent} onClick={() => act('tb.apply.submit')}>Submit application</button>
            <button type="button" className="ds-btn quiet" onClick={() => act('tb.apply.cancel')}>{closed ? 'Discard' : 'Stop'}</button>
          </div>
          {!applying.consent && !closed && <p className="t14 muted" style={{ margin: 0 }}>Tick the box to submit, or tell Q “send it”.</p>}
        </section>
      )}

      <section className="ds-sheet tb-stack" aria-labelledby="tb-why-h">
        <div className="tb-row-between"><h2 id="tb-why-h" className="voice t24" style={{ margin: 0 }}>Why this might fit: {fitLine(m)}</h2><button type="button" className="ds-btn" onClick={() => prefillQ('That match is wrong: ')}>Challenge this match</button></div>
        <ul className="tb-needs">
          {m.map((n) => (
            <li key={n.need}>
              <Glyph k={NEED_GLYPH[n.state]} size={20} />
              <span><b>{n.need}</b>: {NEED_LABEL[n.state]}
                {n.used.length > 0 && <span className="t14" style={{ display: 'block' }}>Evidence used: {n.used.map((e, i) => <span key={e.evidenceId}>{i ? '; ' : ''}<Link to={`/c/passport?item=${e.evidenceId}`}>{e.title}</Link> <VerTag e={e} /></span>)}</span>}
                {n.told && <span className="t14 muted" style={{ display: 'block' }}>You told me: “{n.told}”. Employers see this as your statement, not checked proof.</span>}
                {n.state === 'NONE' && <span className="t14 muted" style={{ display: 'block' }}>Nothing in your Passport shows this yet. That isn’t the same as not having it.</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="t14 muted" style={{ margin: 0 }}>This counts the job’s stated needs your proof shows. It isn’t a prediction of {orgName(w, job.orgId)}’s decision.</p>
      </section>

      <section className="ds-sheet tb-stack" aria-labelledby="tb-mf-h">
        <h2 id="tb-mf-h" className="voice t24" style={{ margin: 0 }}>Does it fit you?</h2>
        <ul className="tb-needs">{fit.map((x) => <li key={x.k}><span className="ds-tag" data-k={x.ok === true ? 'ok' : x.ok === false ? 'risk' : undefined}>{x.ok === true ? 'Fits' : x.ok === false ? 'Doesn’t fit' : 'Unknown'}</span><span><b>{x.k}</b>: {x.text}</span></li>)}</ul>
        <p className="t14 muted" style={{ margin: 0 }}>From what you’ve told Q. <Link to="/c/memory">See or delete what Q remembers</Link>.</p>
      </section>

      <section className="ds-sheet tb-stack" aria-labelledby="tb-emp-h">
        <h2 id="tb-emp-h" className="voice t24" style={{ margin: 0 }}>About {orgName(w, job.orgId)}</h2>
        <Signals job={job} />
      </section>

      {!closed && (
        <section className="ds-sheet tb-stack" aria-labelledby="tb-adv-h">
          <h2 id="tb-adv-h" className="voice t24" style={{ margin: 0 }}>Q’s suggestions</h2>
          <ul className="tb-needs">{advice.map((x) => <li key={x.key}><span aria-hidden="true">·</span><span>{x.text} <button type="button" className="ds-btn quiet" onClick={() => act('tb.advice.decline', { key: x.key, label: x.key === 'cover_note' ? 'cover letters or cover notes' : x.text.toLowerCase().slice(0, 40) })}>Not for me</button></span></li>)}</ul>
          {declined.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>Left out because you asked: {declined.length} suggestion{declined.length === 1 ? '' : 's'}.</p>}
        </section>
      )}
    </Canvas>
  );
}
