// Live cards inside Q's messages (rendered on ink in the thread): entry-level matches, CV draft lines and
// a work-sample assessment. They read the store, so they stay true after reloads and later changes.
import { useMemo } from 'react';
import { Glyph } from '../../ds/Glyph';
import { useWorld } from '../../mock/world';
import { registerRef } from '../../q/refs';
import { Link } from '../../ui/router';
import { entryMatches } from './match';
import { taRead } from '../../state/areas/talent-a';
import { compById, personaFor, readJ7 } from '../career/j7';

const G = { evidenced: 'full', mentioned: 'unclear', none: 'none' } as const;

function Matches({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const ms = useMemo(() => entryMatches(w, id).slice(0, 3), [w, id]);
  if (!ms.length) return null;
  return (
    <ul className="talent-a-ref" aria-label="Closest entry-level jobs">
      {ms.map((m) => (
        <li key={m.job.id}>
          <p className="talent-a-ref-h"><Link to={`/c/jobs/${m.job.id}`}>{m.job.title}</Link> <span>· {m.org} · {m.fit} of {m.needs.length}{m.applied ? ' · applied' : ''}{m.isNew ? ' · new' : ''}</span></p>
          <ul>{m.needs.map((n) => <li key={n.need}><Glyph k={G[n.state]} size={14} title={n.state === 'none' ? 'Not shown yet' : n.state === 'mentioned' ? 'Mentioned (claim)' : 'Evidenced'} /><span>{n.need}{n.state === 'mentioned' ? ' · claim' : n.state === 'evidenced' ? ' · evidenced' : ' · not shown'}</span></li>)}</ul>
        </li>
      ))}
    </ul>
  );
}
function Cv({ id }: { id: string }) {
  const cv = useWorld((w) => taRead(w).cv[id]);
  if (!cv) return null;
  return (
    <div className="talent-a-ref" aria-label="CV draft">
      <p className="talent-a-ref-h">{cv.status === 'APPROVED' ? 'CV lines · saved, private' : 'CV draft · from your words only'}</p>
      <ul>{cv.lines.slice(0, 6).map((l) => <li key={l.id}><span className="talent-a-ref-sec">{l.section}</span><span>{l.text}</span></li>)}</ul>
      {cv.lines.length > 6 && <p className="talent-a-ref-more">+{cv.lines.length - 6} more on your profile page</p>}
    </div>
  );
}
function Assess({ id }: { id: string }) {
  const [pid, comp] = id.split(':');
  const S = useWorld((w) => w.j7[pid] ? readJ7(w, pid) : null);
  if (!S) return null;
  const as = S.assessments.filter((a) => a.comp === comp);
  const last = as[as.length - 1]; if (!last) return null;
  const P = personaFor(pid);
  return (
    <div className="talent-a-ref" aria-label="Assessment result">
      <p className="talent-a-ref-h">{compById(P, comp).label} · level {as.length > 1 ? `${as[as.length - 2].level} → ` : ''}{last.level} of 4 · simulated reviewer</p>
      <div className="talent-a-pips" role="img" aria-label={`Level ${last.level} of 4`}>{[1, 2, 3, 4].map((l) => <span key={l} data-on={l <= last.level ? '1' : undefined} data-was={as.length > 1 && l <= as[as.length - 2].level ? '1' : undefined} />)}<span className="talent-a-ref-proof">Counts as proof</span></div>
      <ul>{last.rubric.map((r) => <li key={r.c}><Glyph k={r.ok ? 'full' : 'partial'} size={14} /><span>{r.c} · {r.ok ? 'met' : 'not yet'}</span></li>)}</ul>
      <p className="talent-a-ref-more">Private in your Passport. Not shared with anyone.</p>
    </div>
  );
}
registerRef('ta.matches', Matches);
registerRef('ta.cv', Cv);
registerRef('ta.assess', Assess);
