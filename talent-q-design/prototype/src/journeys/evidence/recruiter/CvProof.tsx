// The comparison's "CV and proof" view (J12 step 3; build pack 02 UI item C). Per requirement, what the CV says next
// to what the evidence shows, with how each item is known. Not a ranking and not a score: the difference between two
// people is shown as evidence, not as a judgement. dataviz: a two-channel table (CV text | proof mark + word), every
// state has a word and a shape, a list view is the keyboard and phone alternative (no shrunk grid), the rubric weight
// sits on each requirement as in the ledger. Interest is shown apart, below a rule, and is never part of the reading.
import { useState } from 'react';
import type { World } from '../../../mock/world';
import { runAction } from '../../../q/core/engine';
import { Glyph } from '../../../ds/Glyph';
import { Link } from '../../../ui/router';
import type { ProofClass } from '../../../state/domain';
import { cellFor, nameOf, reqsOf, usesRubric, weightOf, type CompareView } from '../../hire-b/model';
import { proofReading } from '../model';
import { CV_WORD, cvLineFor, INTEREST_WORD, interestFor, nextStepFor, PROOF_ORDER, proofItems, shapeWord } from './model';
import { ProofKey, ProofTag } from './ui';

type Says = 'YES' | 'VAGUE' | 'NO' | 'NO_CV';
interface CellRead { says: Says; line: string | null; cls: ProofClass | null; note: string; supported: boolean; flag: 'BEYOND' | 'AHEAD' | null; review: boolean }
function readCell(w: World, pid: string, reqId: string, v: CompareView): CellRead {
  const says = (proofReading(w, pid).rows.find((r) => r.reqId === reqId)?.cv ?? 'NO_CV') as Says;
  const items = proofItems(w, pid, reqId);
  const live = items.filter((i) => !i.excluded);
  const level = cellFor(w, pid, reqId, v).level;
  // Strongest way it's known, ignoring CV claims when anything else exists (the CV column already says the claim).
  const best = [...live].sort((a, b) => PROOF_ORDER.indexOf(a.cls) - PROOF_ORDER.indexOf(b.cls))[0];
  const supported = level === 'verified' || level === 'evidenced';
  const flag = supported && says !== 'YES' ? 'BEYOND' : !supported && says === 'YES' ? 'AHEAD' : null;
  return { says, line: cvLineFor(w, pid, reqId), cls: best?.cls ?? null, note: best?.note ?? '', supported, flag, review: items.some((i) => i.excluded === 'review') };
}
const FLAG = { BEYOND: 'Shown beyond the CV', AHEAD: 'Claim ahead of the evidence' } as const;

function CvSays({ c }: { c: CellRead }) {
  return <span className="evr-cv" data-says={c.says}><span className="lab">CV</span>{c.line ? <q>{c.line.length > 90 ? `${c.line.slice(0, 88)}…` : c.line}</q> : <span>{CV_WORD[c.says]}</span>}</span>;
}
function Shows({ c }: { c: CellRead }) {
  return (
    <span className="evr-shows"><span className="lab">Evidence</span>
      {c.cls ? <span className="evr-shows-v"><ProofTag c={c.cls} small /><span className="evr-shows-n">{c.note}</span></span>
        : <span className="evr-shows-v evr-shows-none"><Glyph k="none" size={12} /><span className="evr-shows-n">Nothing shared yet. Unknown, not zero.</span></span>}
      {c.review && <span className="evr-shows-n muted">One result under review, left out.</span>}
    </span>
  );
}

export function CvProofView({ w, v, onCell }: { w: World; v: CompareView; onCell: (pid: string, reqId: string) => void }) {
  const [asList, setAsList] = useState(false);
  const people = v.people; const reqs = reqsOf(w).filter((r) => v.criteria.includes(r.reqId));
  const rub = usesRubric(w, v.weighting);
  const head = (pid: string) => { const n = nameOf(w, pid); const step = nextStepFor(w, pid, n); const i = interestFor(w, pid); return { n, shape: shapeWord(w, pid), step, interest: INTEREST_WORD[i?.state ?? 'NONE'] }; };
  const Step = ({ pid }: { pid: string }) => { const h = head(pid); return (
    <div className="evr-step"><span className="lab">Next step</span><span>{h.step.text}</span>
      {h.step.say && <button type="button" className="ds-btn evr-step-btn" onClick={() => void runAction({ label: 'Ask Q', act: { t: 'say', text: h.step.say! } })}>Ask Q to do this</button>}
    </div>); };
  return (
    <div className="evr-cvp" data-list={asList ? '1' : undefined}>
      <div className="evr-cvp-bar">
        <ProofKey />
        <div className="ds-views evr-cvp-switch" role="group" aria-label="Show as">
          <button type="button" aria-pressed={!asList} onClick={() => setAsList(false)}>Table</button>
          <button type="button" aria-pressed={asList} onClick={() => setAsList(true)}>List</button>
        </div>
      </div>

      <div className="evr-cvp-table">
        <table className="evr-table">
          <caption className="sr">For each requirement and person: what the CV says and what the shared evidence shows. Select a cell to see where it comes from.</caption>
          <colgroup><col style={{ width: people.length > 3 ? '16%' : '20%' }} />{people.map((p) => <col key={p} />)}</colgroup>
          <thead>
            <tr><th scope="col"><span className="sr">Requirement</span></th>{people.map((p) => { const h = head(p); return (
              <th key={p} scope="col" className="evr-th">
                <Link to={`/r/people/${p}`} className="evr-th-name">{h.n}</Link>
                <span className="evr-headline">{h.shape}</span>
              </th>); })}</tr>
          </thead>
          <tbody>
            {reqs.map((r) => (
              <tr key={r.reqId}>
                <th scope="row" className="evr-req"><span>{r.label}</span><span className="t14 muted">{r.mustHave ? 'Must have' : 'Nice to have'}{rub ? (weightOf(w, r.reqId, v.weighting) ? ` · weight ${weightOf(w, r.reqId, v.weighting)}` : ' · not in the rubric') : ''}</span></th>
                {people.map((p) => { const c = readCell(w, p, r.reqId, v); const sel = v.open?.pid === p && v.open.reqId === r.reqId; return (
                  <td key={p}>
                    <button type="button" className="evr-cell" data-sup={c.supported ? '1' : c.cls ? 'part' : undefined} data-flag={c.flag ?? undefined} aria-pressed={sel}
                      aria-label={`${nameOf(w, p)}, ${r.label}. CV: ${c.line ?? CV_WORD[c.says]}. Evidence: ${c.cls ? `${c.cls.toLowerCase().replace('_', ' ')}, ${c.note}` : 'nothing shared yet'}${c.flag ? `. ${FLAG[c.flag]}` : ''}. Show where this comes from`}
                      onClick={() => onCell(p, r.reqId)}>
                      <CvSays c={c} /><Shows c={c} />
                      {c.flag && <span className="evr-flag" data-f={c.flag}>{FLAG[c.flag]}</span>}
                    </button>
                  </td>); })}
              </tr>
            ))}
            <tr className="evr-next"><th scope="row" className="evr-req"><span>Next step</span><span className="t14 muted">One per person</span></th>{people.map((p) => <td key={p}><Step pid={p} /></td>)}</tr>
          </tbody>
        </table>
      </div>

      <div className="evr-cvp-list">
        {people.map((p) => { const h = head(p); return (
          <article key={p} className="evr-person" aria-labelledby={`evr-p-${p}`}>
            <header><h3 id={`evr-p-${p}`}><Link to={`/r/people/${p}`}>{h.n}</Link></h3><p className="evr-headline">{h.shape}</p></header>
            <ul className="evr-plist">
              {reqs.map((r) => { const c = readCell(w, p, r.reqId, v); return (
                <li key={r.reqId}>
                  <button type="button" className="evr-cell" data-sup={c.supported ? '1' : c.cls ? 'part' : undefined} data-flag={c.flag ?? undefined} aria-pressed={v.open?.pid === p && v.open.reqId === r.reqId} onClick={() => onCell(p, r.reqId)}>
                    <span className="evr-plist-req"><b>{r.label}</b><span className="t14 muted">{r.mustHave ? 'must have' : 'nice to have'}{rub && weightOf(w, r.reqId, v.weighting) ? ` · weight ${weightOf(w, r.reqId, v.weighting)}` : ''}</span></span>
                    <CvSays c={c} /><Shows c={c} />
                    {c.flag && <span className="evr-flag" data-f={c.flag}>{FLAG[c.flag]}</span>}
                  </button>
                </li>); })}
            </ul>
            <Step pid={p} />
          </article>); })}
      </div>

      <section className="evr-interest" aria-labelledby="evr-int-h">
        <h3 id="evr-int-h" className="lab">Interest</h3>
        <ul>{people.map((p) => { const i = interestFor(w, p); return <li key={p}><b>{nameOf(w, p)}</b><span data-s={i?.state ?? 'NONE'}>{i?.state === 'REQUESTED' ? <><Glyph k="unclear" size={13} /> Pending check: asked {new Date(i.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</> : i?.state === 'CONFIRMED' ? <><Glyph k="verified" size={13} /> Interested</> : i?.state === 'DECLINED' ? 'Said no, thanks' : <><Glyph k="none" size={13} /> Not asked yet</>}</span></li>; })}</ul>
        <p className="t14 muted" style={{ margin: 0 }}>Asked separately and never scored. Whether someone wants the role says nothing about whether they can do it, so it sits apart from the evidence.</p>
      </section>
    </div>
  );
}
