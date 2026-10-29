// Small shared pieces for talent-b pages, plus live renderers Q uses inside its messages.
import { useMemo } from 'react';
import type { Evidence } from '@contracts';
import { useWorld } from '../../mock/world';
import { registerRef } from '../../q/refs';
import { Link } from '../../ui/router';
import { Glyph } from '../../ds/Glyph';
import { APP_LABEL, KIND, NEED_GLYPH, NEED_LABEL, VER, appExplain, cellOf, matchFor, orgName, summaryFor, tb, verOf, viewerOrgs } from './logic';
import type { Upload } from '../../state/areas/talent-b';

export function VerTag({ e }: { e: Evidence }) {
  const v = verOf(e);
  return <span className="ds-tag" data-k={VER[v].k} title={VER[v].plain}>{v === 'VERIFIED' ? <Glyph k="verified" size={14} /> : v === 'FAILED' ? <span aria-hidden="true">✕</span> : v === 'PENDING' ? <span aria-hidden="true">…</span> : null}{VER[v].label}</span>;
}

export function UploadRow({ u, onRetry, onCancel }: { u: Upload; onRetry?: () => void; onCancel?: () => void }) {
  return (
    <div className="tb-upload" data-state={u.state}>
      <div className="tb-upload-head">
        <b className="tb-break">{u.name}</b>
        <span className="t14 muted num" aria-live="polite">{u.state === 'DONE' ? 'In your Passport' : u.state === 'FAILED' ? `Stopped at ${u.progress}%` : u.state === 'CANCELLED' ? 'Cancelled' : `${u.progress}%`}</span>
      </div>
      <div className="tb-bar" role="progressbar" aria-label={`Uploading ${u.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={u.progress}><i style={{ width: `${u.progress}%` }} /></div>
      {u.state === 'FAILED' && <p className="t14" role="alert" style={{ margin: 0, color: 'var(--risk)' }}>{u.error}</p>}
      {(u.state === 'FAILED' || u.state === 'UPLOADING') && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {u.state === 'FAILED' && onRetry && <button type="button" className="ds-btn" onClick={onRetry}>Retry from {u.progress}%</button>}
          {onCancel && <button type="button" className="ds-btn quiet" onClick={onCancel}>Cancel</button>}
        </div>
      )}
    </div>
  );
}

export function SeenBy({ e }: { e: Evidence }) {
  const w = useWorld((x) => x);
  if (e.confidential) return <span className="t14 muted">Only you. Confidential originals can’t be shared.</span>;
  const orgs = viewerOrgs(w, e.ownerId);
  const seen = orgs.filter((o) => ['SHARED', 'PUBLIC'].includes(cellOf(w, e, o))).map((o) => orgName(w, o));
  const ended = orgs.filter((o) => cellOf(w, e, o) === 'REVOKED').map((o) => orgName(w, o));
  return <span className="t14 muted">{e.visibility === 'PUBLIC_PROFILE' ? 'Public on your profile' : seen.length ? `Seen by ${seen.join(', ')}` : 'Only you'}{ended.length ? ` · access ended: ${ended.join(', ')}` : ''}</span>;
}

registerRef('tb.evidence', ({ id }) => {
  const e = useWorld((w) => w.evidence.find((x) => x.evidenceId === id));
  if (!e) return null;
  return (
    <div className="tb-ref">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><span className="lab">{KIND[e.kind]}</span><VerTag e={e} /></div>
      <b>{e.title}</b>
      <span className="t14">{e.shows}</span>
      <Link to={`/c/passport?item=${e.evidenceId}`} className="t14" style={{ color: 'inherit' }}>Open in Passport</Link>
    </div>
  );
});
registerRef('tb.uploads', ({ id }) => {
  const ups = useWorld((w) => tb(w).uploads.filter((u) => u.personId === id && u.state !== 'CANCELLED').slice(-2));
  if (!ups.length) return null;
  return <div className="tb-ref">{ups.map((u) => <UploadRow key={u.id} u={u} />)}</div>;
});

registerRef('tb.summary', ({ id }) => {
  const w = useWorld((x) => x);
  const lines = useMemo(() => summaryFor(w, id), [w, id]);
  return <ul className="tb-ref tb-reflist">{lines.map((l) => <li key={l.topic}><b>{l.text}</b><span className="t14">Based on: {l.basis}</span></li>)}</ul>;
});
registerRef('tb.match', ({ id }) => {
  const w = useWorld((x) => x);
  const [pid, jobId] = id.split('~');
  const job = w.jobs.find((j) => j.id === jobId);
  const m = useMemo(() => (job ? matchFor(w, pid, job) : []), [w, pid, job]);
  if (!job) return null;
  return (
    <ul className="tb-ref tb-reflist" aria-label={`Match for ${job.title}`}>
      {m.map((n) => <li key={n.need} className="tb-refrow"><Glyph k={NEED_GLYPH[n.state]} size={16} /><span><b>{n.need}</b>: {NEED_LABEL[n.state].toLowerCase()}{n.used.length ? <span className="t14" style={{ display: 'block' }}>Used: {n.used.map((e) => e.title).join('; ')}</span> : null}{n.told ? <span className="t14" style={{ display: 'block' }}>You said: “{n.told}”</span> : null}</span></li>)}
    </ul>
  );
});
registerRef('tb.apps', ({ id }) => {
  const w = useWorld((x) => x);
  const rows = useMemo(() => w.applications.filter((a) => a.personId === id).map((a) => ({ a, x: appExplain(w, a) })), [w, id]);
  return <ul className="tb-ref tb-reflist">{rows.map(({ a, x }) => <li key={a.id}><b>{x.job?.title} · {x.org}</b><span className="t14">{APP_LABEL[a.status]}{['SUBMITTED', 'VIEWED'].includes(a.status) ? ` · ${x.days} days since last activity` : ''}</span></li>)}<li><Link to="/c/applications" className="t14" style={{ color: 'inherit' }}>All applications</Link></li></ul>;
});
