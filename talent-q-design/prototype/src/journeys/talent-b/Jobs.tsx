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

/** Location and work mode without repeating each other (“Remote · remote”). */
const where = (loc: string, mode: string) => (loc.toLowerCase().includes(mode.toLowerCase()) ? loc : `${loc} · ${mode.toLowerCase()}`);

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
type F = 'all' | 'verified' | 'saved' | 'remote';

function Signals({ job, compact }: { job: Job; compact?: boolean }) {
  const w = useWorld((x) => x);
  const s = signalsOf(w, job); const ok = verifiedEmployer(w, job);
  if (compact) return <span className="ds-tag" data-k={ok ? 'ok' : 'warn'}>{ok ? <Glyph k="verified" size={14} /> : <span aria-hidden="true">?</span>}{ok ? 'Verified employer' : 'Not verified'}</span>;
  return (
    <dl className="tb-signals">
      {s.map((x) => <div key={x.k} data-on={x.on || undefined}><dt><span className="tb-sigmark" aria-hidden="true">{x.on ? '✓' : '–'}</span>{x.k}<span className="sr">: {x.on ? 'yes' : 'no'}</span><span className="tb-sigval" aria-hidden="true">{x.on ? 'Yes' : 'No'}</span></dt><dd className="t14 muted">{x.plain}</dd></div>)}
      <div><dt><span className="tb-sigmark" aria-hidden="true">↺</span>{job.signals.replies}</dt><dd className="t14 muted">From this employer’s past replies on Talent Q. It isn’t a promise that you’ll hear back.</dd></div>
    </dl>
  );
}

/** How many of the job's stated needs the person's proof shows. Shape carries the state (never colour alone),
 *  with the count as a direct label. */
function FitLine({ m }: { m: ReturnType<typeof matchFor> }) {
  const checked = m.filter((n) => n.state === 'VERIFIED').length;
  return (
    <p className="tb-fit">
      <span className="tb-pips" aria-hidden="true">{m.map((n) => <Glyph key={n.need} k={NEED_GLYPH[n.state]} size={16} />)}</span>
      <b>{fitLine(m)}</b>{checked ? <span className="muted"> · {checked} checked</span> : null}
      <span className="sr">{m.map((n) => `${n.need}: ${NEED_LABEL[n.state]}`).join('; ')}</span>
    </p>
  );
}
function FitKey() {
  return <ul className="tb-fitkey" aria-label="Key">{(['VERIFIED', 'SHOWN', 'TOLD', 'NONE'] as const).map((k) => <li key={k}><Glyph k={NEED_GLYPH[k]} size={14} />{NEED_LABEL[k]}</li>)}</ul>;
}

export function JobsPage() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const { query } = useRoute();
  const [f, setF] = useViewState<F>('filter', 'all');
  const filter: F = (query.get('f') as F | null) ?? f;
  const saved = tb(w).saved[pid] ?? [];
  // Fit first; at equal fit, verified employers before unverified ones.
  const share = (m: ReturnType<typeof matchFor>) => m.filter((n) => n.state !== 'NONE').length / Math.max(1, m.length);
  const score = (j: Job, m: ReturnType<typeof matchFor>) => share(m) + (verifiedEmployer(w, j) ? 0.01 : 0);
  const open = w.jobs.filter((j) => j.status === 'OPEN');
  const shown = open.filter((j) => filter === 'all' || (filter === 'verified' && verifiedEmployer(w, j)) || (filter === 'saved' && saved.includes(j.id)) || (filter === 'remote' && j.workMode === 'REMOTE'))
    .map((j) => ({ j, m: matchFor(w, pid, j) })).sort((x, y) => score(y.j, y.m) - score(x.j, x.m));
  const close = shown.filter((x) => share(x.m) > 0); const rest = shown.filter((x) => share(x.m) === 0);
  const closedSaved = saved.map((id) => w.jobs.find((j) => j.id === id)).filter((j): j is Job => !!j && j.status === 'CLOSED');
  const card = ({ j, m }: { j: Job; m: ReturnType<typeof matchFor> }) => (
    <li key={j.id} className="ds-sheet tb-card tb-jobcard">
      <div className="tb-row-between"><span className="lab">{orgName(w, j.orgId)}</span><Signals job={j} compact /></div>
      <h3 className="tb-title"><Link to={`/c/jobs/${j.id}`}>{j.title}</Link></h3>
      <p className="t14 tb-meta" style={{ margin: 0 }}>{where(j.location, j.workMode)} · <span className="num">{j.pay}</span></p>
      <FitLine m={m} />
      <div className="tb-card-foot">
        <p className="t14 muted" style={{ margin: 0 }}>{j.signals.replies}</p>
        <div className="tb-actions">
          <Link className="ds-btn" to={`/c/jobs/${j.id}`} aria-label={`View ${j.title} at ${orgName(w, j.orgId)}`}>View job</Link>
          <button type="button" className="ds-btn quiet tb-save" aria-pressed={saved.includes(j.id)} onClick={() => act('tb.save', { jobId: j.id })}>{saved.includes(j.id) ? <><span aria-hidden="true">★</span> Saved</> : <><span aria-hidden="true">☆</span> Save</>}</button>
        </div>
      </div>
    </li>
  );
  return (
    <Canvas title="Jobs" kicker={`${open.length} open roles`} open onClose={() => navigate('/c/home')}>
      {closedSaved.map((j) => <div key={j.id} className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">⚠</span><span><b>Closed:</b> {orgName(w, j.orgId)}’s {j.title}, which you saved. Closing a listing isn’t a decision about you.</span><button type="button" className="ds-btn" onClick={() => act('tb.save', { jobId: j.id })}>Remove</button></div>)}
      <div className="tb-filters" role="group" aria-label="Filter jobs">
        {([['all', 'All'], ['verified', 'Verified employers'], ['saved', `Saved (${saved.filter((id) => open.some((j) => j.id === id)).length})`], ['remote', 'Remote']] as const).map(([v, l]) => <button key={v} type="button" className="ds-filter" aria-pressed={filter === v} onClick={() => { setF(v); if (query.get('f')) navigate('/c/jobs'); }}>{l}</button>)}
      </div>
      {shown.length === 0 ? (
        <section className="ds-sheet tb-empty">
          <h2 className="tb-h2">{filter === 'saved' ? 'No saved jobs are open right now' : 'No jobs match this filter'}</h2>
          <p className="t14 muted" style={{ margin: 0 }}>{filter === 'saved' ? 'Save a job and Q tells you if it closes.' : 'New roles appear here as employers post them.'}</p>
          <button type="button" className="ds-btn" style={{ justifySelf: 'start' }} onClick={() => setF('all')}>Show all jobs</button>
        </section>
      ) : (
        <div className="tb-jobs" aria-label="Open jobs">
          <FitKey />
          {close.length > 0 && <section className="tb-group" aria-labelledby="tb-jg-close"><header className="tb-group-h"><h2 id="tb-jg-close" className="tb-h2">Closest to your proof <span className="tb-count num">{close.length}</span></h2></header><ul className="tb-grid">{close.map(card)}</ul></section>}
          {rest.length > 0 && <section className="tb-group" aria-labelledby="tb-jg-rest"><header className="tb-group-h"><h2 id="tb-jg-rest" className="tb-h2">Other open roles <span className="tb-count num">{rest.length}</span></h2><p className="t14 muted">Your Passport doesn’t show these needs yet. That isn’t the same as not having them.</p></header><ul className="tb-grid">{rest.map(card)}</ul></section>}
        </div>
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
      <ul className="tb-facts" aria-label="About this job">
        <li>{where(job.location, job.workMode)}</li><li className="num">{job.pay}</li><li>Posted {new Date(job.posted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</li><li><Signals job={job} compact /></li>
      </ul>

      {applying && (
        <section className="ds-sheet tb-stack tb-apply" aria-labelledby="tb-ap-h">
          <div className="tb-row-between"><h2 id="tb-ap-h" className="tb-h2">Your application</h2><span className="ds-sim">Simulated send</span></div>
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
        <div className="tb-row-between"><h2 id="tb-why-h" className="tb-h2">Why this might fit: {fitLine(m)}</h2><button type="button" className="ds-btn" onClick={() => prefillQ('That match is wrong: ')}>Challenge this match</button></div>
        <ul className="tb-needs">
          {m.map((n) => (
            <li key={n.need} data-state={n.state}>
              <Glyph k={NEED_GLYPH[n.state]} size={20} />
              <div className="tb-need">
                <p className="tb-need-h"><b>{n.need}</b><span className="tb-need-state">{NEED_LABEL[n.state]}</span></p>
                {n.used.length > 0 && <ul className="tb-evchips" aria-label={`Evidence used for ${n.need}`}>{n.used.map((e) => <li key={e.evidenceId}><Link to={`/c/passport?item=${e.evidenceId}`}>{e.title}</Link><VerTag e={e} /></li>)}</ul>}
                {n.told && <p className="t14 muted">You told me: “{n.told}”. Employers see this as your statement, not checked proof.</p>}
                {n.state === 'NONE' && <p className="t14 muted">Nothing in your Passport shows this yet. That isn’t the same as not having it.</p>}
              </div>
            </li>
          ))}
        </ul>
        <p className="t14 muted" style={{ margin: 0 }}>This counts the job’s stated needs your proof shows. It isn’t a prediction of {orgName(w, job.orgId)}’s decision.</p>
      </section>

      <section className="ds-sheet tb-stack" aria-labelledby="tb-mf-h">
        <h2 id="tb-mf-h" className="tb-h2">Does it fit you?</h2>
        <ul className="tb-fittiles">{fit.map((x) => <li key={x.k} data-ok={x.ok === true ? 'yes' : x.ok === false ? 'no' : 'unknown'}><div className="tb-row-between"><span className="lab">{x.k}</span><span className="ds-tag" data-k={x.ok === true ? 'ok' : x.ok === false ? 'risk' : undefined}>{x.ok === true ? '✓ Fits' : x.ok === false ? '✕ Doesn’t fit' : '? Not sure'}</span></div><span className="t14">{x.text}</span></li>)}</ul>
        <p className="t14 muted" style={{ margin: 0 }}>From what you’ve told Q. <Link to="/c/memory">See or delete what Q remembers</Link>.</p>
      </section>

      <section className="ds-sheet tb-stack" aria-labelledby="tb-emp-h">
        <h2 id="tb-emp-h" className="tb-h2">About {orgName(w, job.orgId)}</h2>
        <Signals job={job} />
      </section>

      {!closed && (
        <section className="ds-sheet tb-stack" aria-labelledby="tb-adv-h">
          <h2 id="tb-adv-h" className="tb-h2">Q’s suggestions</h2>
          <ul className="tb-advice">{advice.map((x) => <li key={x.key}><span>{x.text}</span><button type="button" className="tb-linkbtn" aria-label={`Not for me: ${x.text}`} onClick={() => act('tb.advice.decline', { key: x.key, label: x.key === 'cover_note' ? 'cover letters or cover notes' : x.text.toLowerCase().slice(0, 40) })}>Not for me</button></li>)}</ul>
          {declined.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>Left out because you asked: {declined.length} suggestion{declined.length === 1 ? '' : 's'}.</p>}
        </section>
      )}
    </Canvas>
  );
}
