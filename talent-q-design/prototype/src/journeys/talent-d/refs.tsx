// Live result cards in Q's thread for TALENT-D: a cover note draft and the work authorisation statement. They read
// the store each render, so an edit on the page shows in the thread straight away, and only for their owner.
import { actorOf, useWorld } from '../../mock/world';
import { registerRef } from '../../q/refs';
import { Link } from '../../ui/router';
import { AUTH_SHORT, authOf, letterOf, liveShares, orgNm } from './logic';
import { Source } from './ui';

registerRef('td.letter', ({ id }) => {
  const [pid, jobId] = id.split('|');
  const me = useWorld((w) => actorOf(w).personId);
  const l = useWorld((w) => letterOf(w, pid, jobId));
  if (!l || me !== pid) return null;
  return (
    <div className="tb-ref td-stack">
      <ol className="td-letter" style={{ padding: 12 }}>{l.lines.slice(0, 4).map((x, i) => <li key={i}><p className="td-lline" style={{ fontSize: 15 }}>{x.text}</p><Source text={x.source} mine={x.by === 'YOU'} /></li>)}</ol>
      <Link to={`/c/jobs/${jobId}/letter`} className="t14" style={{ color: 'inherit' }}>{l.state === 'APPROVED' ? 'Approved · not sent. Open it' : 'Review, edit and approve'}</Link>
    </div>
  );
});

registerRef('td.auth', ({ id }) => {
  const me = useWorld((w) => actorOf(w).personId);
  const au = useWorld((w) => authOf(w, id));
  const names = useWorld((w) => liveShares(authOf(w, id)).map((r) => orgNm(w, r.org)));
  if (me !== id) return null;
  return (
    <div className="tb-ref td-stack">
      {au.entries.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{au.entries.map((e) => <li key={e.country}>{e.country}: {AUTH_SHORT[e.status].toLowerCase()}</li>)}</ul> : <p className="t14" style={{ margin: 0 }}>Nothing stated yet.</p>}
      <p className="t14 muted" style={{ margin: 0 }}>{names.length ? `Shared with ${names.join(' and ')} only.` : 'Private. Nobody sees it.'}</p>
      <Link to="/c/work-permit" className="t14" style={{ color: 'inherit' }}>Open work authorisation</Link>
    </div>
  );
});
