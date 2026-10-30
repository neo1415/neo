// Live cards inside Q's replies for evidence-first hiring (J12 steps 1–2). The card id holds only the question and
// what Q read at the time; everything shown is recomputed from the store on each render, through the same
// permission checks as every page. So when a candidate stops sharing an item, the card drops it at once and says so.
import { canSeeCandidate, useWorld, visibleEvidence } from '../../../mock/world';
import { registerRef } from '../../../q/refs';
import { Glyph } from '../../../ds/Glyph';
import { Link } from '../../../ui/router';
import { cellFor, nameOf, reqsOf, shortLabel, viewerOrg } from '../../hire-b/model';
import { fmtDate } from '../../hire-b/ui';
import { proof } from '../../../state/areas/proof';
import { CV_WORD, GROUP_NOTE, GROUP_WORD, permittedPool, proofItems, reqWords, runFind, shapeWord, type FindQuery } from './model';
import { ProofTag } from './ui';

const parse = <T,>(s: string): T | null => { try { return JSON.parse(s) as T; } catch { return null; } };
export interface FindId extends FindQuery { s?: { read: number; hidden: number; checked: number }; ids?: string[] }
const shortSource = (s: string) => s.replace(/\s*\(simulated\)/, '').replace(/^Talent Q /, '');

function FindCard({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const q = parse<FindId>(id); if (!q) return null;
  const res = runFind(w, q);
  const org = viewerOrg(w);
  // What changed since Q answered: items no longer shared with this organisation are counted, never named.
  const now = new Set(permittedPool(w).pids.flatMap((pid) => visibleEvidence(w, pid, org).map((e) => e.evidenceId)));
  const gone = (q.ids ?? []).filter((e) => !now.has(e)).length;
  const s = q.s ?? { read: res.read, hidden: res.hidden, checked: res.checked };
  return (
    <div className="hire-b-qcard evr-find" role="group" aria-label={`Who has shown ${reqWords(w, res.reqs)}, grouped by how it’s known`}>
      <ol className="evr-stages" aria-label="What Q did">
        <li><span className="lab">Planned</span> {q.mode === 'surprise' ? 'evidence beyond the CV, every requirement' : reqWords(w, res.reqs)}</li>
        <li><span className="lab">Read</span> {s.read} permitted {s.read === 1 ? 'person' : 'people'}{s.hidden ? ` (${s.hidden} not visible to you, not named)` : ''}</li>
        <li><span className="lab">Checked</span> {s.checked} shared items</li>
        <li><span className="lab">Done</span></li>
      </ol>
      {gone > 0 && <p className="evr-gone" role="status"><Glyph k="none" size={13} /> Since I answered, {gone === 1 ? 'one item is' : `${gone} items are`} no longer shared with you. I’ve stopped using {gone === 1 ? 'it' : 'them'}.</p>}
      {res.groups.map(({ g, rows }) => (
        <section key={g} className="evr-group" data-g={g} aria-label={GROUP_WORD[g]}>
          <h4 className="evr-group-h">{GROUP_WORD[g]}<span>{GROUP_NOTE[g]}</span></h4>
          <ul className="evr-rows">
            {rows.map((r) => { const live = r.items.filter((i) => !i.excluded && i.cls !== 'CLAIM'); const review = r.items.some((i) => i.excluded === 'review'); return (
              <li key={r.pid}>
                <div className="evr-row-top"><Link to={`/r/people/${r.pid}`}>{nameOf(w, r.pid)}</Link><span className="evr-shape">{shapeWord(w, r.pid)}</span></div>
                <p className="evr-cvl">{r.cv.map((c) => <span key={c.reqId}><span className="lab">CV · {shortLabel(w, c.reqId)}</span> {c.line ? `“${c.line.length > 70 ? `${c.line.slice(0, 68)}…` : c.line}”` : CV_WORD[c.says]}</span>)}</p>
                {live.length > 0 ? (
                  <ul className="evr-items">{live.slice(0, 3).map((i) => <li key={`${i.e.evidenceId}${i.reqId}`}><ProofTag c={i.cls} small /><span>{i.note}<span className="muted"> · {shortSource(i.e.source)}, {fmtDate(i.e.observedAt)}</span></span></li>)}</ul>
                ) : <p className="evr-none">Nothing shared shows {reqWords(w, res.reqs)} yet. Unknown, not a no.</p>}
                {review && <p className="evr-none">One result is under review and left out.</p>}
              </li>); })}
          </ul>
        </section>
      ))}
      {!res.rows.length && <p className="evr-none">No one in this role’s pipeline is visible to you.</p>}
      <p className="evr-foot">Grouped by how it’s known, not ranked by a score. Missing CV keywords never leave anyone out.</p>
    </div>
  );
}

function WhyCard({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const x = parse<{ p: string }>(id); if (!x) return null;
  const pid = x.p; const name = nameOf(w, pid);
  if (!canSeeCandidate(w, pid, viewerOrg(w))) return <div className="hire-b-qcard"><p className="evr-none" role="status">{name} is no longer visible to you, so I can’t show what they shared.</p></div>;
  const reqs = reqsOf(w);
  const cells = reqs.map((r) => ({ r, c: cellFor(w, pid, r.reqId) }));
  const shown = cells.filter(({ c }) => c.level === 'verified' || c.level === 'evidenced');
  const open = cells.filter(({ c }) => c.level === 'partial' || c.level === 'none' || c.level === 'claim');
  const cv = proof(w).cvs[pid];
  const says = (k: 'YES' | 'VAGUE' | 'NO') => reqs.filter((r) => (cv?.mentions[r.reqId] ?? 'NO') === k).map((r) => shortLabel(w, r.reqId));
  return (
    <div className="hire-b-qcard evr-why" role="group" aria-label={`Why ${name} is worth reviewing`}>
      <span className="lab">What the evidence shows</span>
      {shown.length ? (
        <ul className="evr-why-list">{shown.map(({ r }) => proofItems(w, pid, r.reqId).filter((i) => !i.excluded && i.level !== 'claim' && i.level !== 'partial').slice(0, 2).map((i) => (
          <li key={`${r.reqId}${i.e.evidenceId}`}>
            <div className="evr-row-top"><b>{r.label}</b><ProofTag c={i.cls} small /></div>
            <span>{i.e.title}</span>
            <span className="muted">{shortSource(i.e.source)} · {fmtDate(i.e.observedAt)}</span>
            {i.e.limits && <span className="evr-limit"><span className="lab">Limits</span> {i.e.limits}</span>}
          </li>)))}</ul>
      ) : <p className="evr-none">Nothing {name} shares shows a requirement yet.</p>}
      <span className="lab">What the CV says</span>
      <p className="evr-cvsum">{cv ? <>Names {says('YES').join(', ') || 'none of them'}{says('VAGUE').length ? `; vague about ${says('VAGUE').join(', ')}` : ''}; doesn’t name {says('NO').join(', ') || 'anything else'}. The CV’s wording isn’t evidence either way.</> : 'No CV shared. That’s fine: the evidence is read on its own.'}</p>
      {open.length > 0 && <><span className="lab">Still open</span>
        <ul className="evr-open">{open.map(({ r, c }) => <li key={r.reqId}><b>{shortLabel(w, r.reqId)}</b>: {c.level === 'partial' ? `partial (${c.items.find((i) => !i.excluded && i.level === 'partial')?.note ?? 'thin or older evidence'})` : c.level === 'claim' ? 'claimed, not shown' : 'not shown yet'}{r.mustHave ? '' : ' · nice to have'}</li>)}</ul></>}
      <p className="evr-foot">A reviewed sample shows the task, not guaranteed performance in the job. You decide.</p>
    </div>
  );
}

registerRef('ev.find', FindCard);
registerRef('ev.why', WhyCard);
