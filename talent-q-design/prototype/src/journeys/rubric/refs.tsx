// Live cards inside Q's replies for the evaluation studio: the rubric's weights as share bars (rb.rubric) and a
// compact scorecard (rb.card). The text says the finding; the card carries the structure. Cards read live state,
// so a card about a draft shows the draft as it is now, and a card about a frozen version never changes.
import { useWorld } from '../../mock/world';
import { registerRef } from '../../q/refs';
import { Link } from '../../ui/router';
import { draftVersion, latestApproved } from '../../state/areas/rubrics';
import { card, indexLine, roleOf, scored, studioPath } from './model';
import { Meter } from './Scorecard';
import './rubric.css';

function RubricCard({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const ver = draftVersion(w, id) ?? latestApproved(w, id); const role = roleOf(w, id);
  if (!ver || !role) return null;
  const cs = ver.criteria.filter(scored); const t = cs.reduce((s, c) => s + c.weight, 0) || 1;
  return (
    <div className="hire-b-qcard" role="group" aria-label={`${role.title} rubric weights`}>
      <div className="hire-b-qcard-head"><span className="lab">{ver.state === 'Q_PROPOSED' ? `Draft v${ver.v}` : `v${ver.v} approved`}</span><Link className="t14" to={studioPath(id)}>Open the rubric</Link></div>
      <ul className="rb-shares rb-shares-sm">
        {cs.map((c) => <li key={c.id}><span className="rb-share-l">{c.label}</span><span className="rb-share-bar" role="img" aria-label={`${c.label}: weight ${c.weight}, ${Math.round((100 * c.weight) / t)}%`}><span className="rb-share-fill" style={{ width: `${(100 * c.weight) / t}%` }} /></span><span className="rb-share-v num">w{c.weight}</span></li>)}
      </ul>
    </div>
  );
}
function ScoreCard({ id }: { id: string }) {
  const w = useWorld((x) => x);
  let x: { pid: string; id: string; v: number } | null = null; try { x = JSON.parse(id); } catch { return null; }
  const cd = x && card(w, x.id, x.pid, x.v); if (!cd || !x) return null;
  return (
    <div className="hire-b-qcard" role="group" aria-label="Scorecard">
      <div className="hire-b-qcard-head"><span className="lab">Rubric v{cd.ver.v}</span><b className="num">{indexLine(cd.idx)}</b></div>
      <ul className="rb-rows rb-rows-sm">{cd.rows.filter((r) => scored(r.c)).map(({ c, r }) => <li key={c.id}><div className="rb-row"><span className="t14">{c.label}</span><Meter r={r} label={c.label} /></div></li>)}</ul>
    </div>
  );
}
registerRef('rb.rubric', RubricCard);
registerRef('rb.card', ScoreCard);
