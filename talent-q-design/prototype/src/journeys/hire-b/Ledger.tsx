// The evidence ledger (R2): one row per person, one block per requirement. Block width is how much the
// requirement counts (the approved rubric's weight for that requirement, or equal must-haves when no rubric is
// approved: AD-B-05 replaced the old fixed 1.5x payments rule), block shade is how strong the evidence is (one ink hue, light to dark: dataviz ordinal ramp,
// validated: #b9b1a3 / #5d5648 / #16140f on #fffdf8). Nothing relies on shade alone: every block carries a
// glyph, a word where it fits, an accessible name, and the table below the chart repeats every value.
// Motion (MO-013 comparison morph): rows re-order with a layout animation and block widths ease when the
// weighting or criteria change, using the shared motion tokens; reduced motion is handled globally.
import { motion } from 'motion/react';
import type { World } from '../../mock/world';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { DUR, EASE } from '../../ds/motion';
import type { Level } from '../../state/areas/hire-b';
import { cellFor, firstName, GLYPH_OF, LEVEL_WORD, nameOf, rank, reqLabel, roleRubric, shortLabel, usesRubric, weighted, weightOf, type Change, type CompareView } from './model';

const WORD: Record<Level, string> = { verified: 'Verified', evidenced: 'Shown', partial: 'Partial', claim: 'Claimed', none: 'Not shown' };
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
const morph = { duration: DUR.slow, ease: EASE.standard };

export function Ledger({ w, v, change, onCell, compact, linkNames = true, ranked = true, bare, noKey }: {
  w: World; v: CompareView; change?: Change | null; onCell?: (pid: string, reqId: string) => void; compact?: boolean; linkNames?: boolean; ranked?: boolean;
  /** One person, no name column (the profile's own summary strip). */ bare?: boolean; noKey?: boolean;
}) {
  const rows = ranked ? rank(w, v) : v.people.map((pid) => ({ pid }));
  // A requirement the approved rubric leaves out carries no weight, so it has no block (the margin says so).
  const crit = weighted(w, v).length ? weighted(w, v) : v.criteria;
  const rub = usesRubric(w, v.weighting);
  const weights = crit.map((r) => weightOf(w, r, v.weighting));
  const changed = new Set(change?.cells.map((c) => `${c.pid}:${c.reqId}`) ?? []);
  const moved = (pid: string) => {
    const m = change?.moves.find((x) => x.startsWith(firstName(w, pid) + ' '));
    return m ? (m.includes(' up ') ? `up from ${m.match(/from (\w+)/)?.[1]}` : `down from ${m.match(/from (\w+)/)?.[1]}`) : null;
  };
  return (
    <div className="hire-b-ledger" data-compact={compact ? '1' : undefined} data-bare={bare ? '1' : undefined}>
      <div className="hire-b-lrow hire-b-lhead" aria-hidden="true">
        {!bare && <>{ranked && <span />}<span /></>}
        <span className="hire-b-lstrip">
          {crit.map((r, i) => (
            <motion.span key={r} layout="position" className="hire-b-lcol" style={{ flexGrow: weights[i] }} animate={{ flexGrow: weights[i] }} transition={morph}>
              <span className="hire-b-lcol-name">{shortLabel(w, r)}</span>{rub && !compact && <span className="hire-b-lcol-x"> weight {weights[i]}</span>}
            </motion.span>
          ))}
        </span>
      </div>
      <ol className="hire-b-lrows" aria-label={ranked ? 'Who to talk to first, strongest evidence first' : 'Evidence by requirement'}>
        {rows.map((r, i) => { const mv = moved(r.pid); return (
          <motion.li key={r.pid} layout transition={morph} className="hire-b-lrow">
            {ranked && !bare && <span className="hire-b-lrank num" aria-hidden="true">{i + 1}</span>}
            {!bare && <span className="hire-b-lname">
              {linkNames ? <Link to={`/r/people/${r.pid}`}>{compact ? firstName(w, r.pid) : nameOf(w, r.pid)}</Link> : <b>{compact ? firstName(w, r.pid) : nameOf(w, r.pid)}</b>}
              {ranked && <span className="sr">, {ORD[i]}</span>}
              {mv && <span className="hire-b-lmove" data-dir={mv.startsWith('up') ? 'up' : 'down'}><span aria-hidden="true">{mv.startsWith('up') ? '↑' : '↓'}</span> {mv}</span>}
            </span>}
            <span className="hire-b-lstrip" role="group" aria-label={`${nameOf(w, r.pid)}: evidence by requirement`}>
              {crit.map((req, j) => {
                const c = cellFor(w, r.pid, req, v);
                const note = c.correction ? `${c.correction.note} (your correction)` : c.items.filter((x) => !x.excluded).map((x) => x.note)[0] ?? (c.items.some((x) => x.excluded === 'review') ? 'Result under review, left out' : 'Nothing shared for this yet');
                const ch = changed.has(`${r.pid}:${req}`);
                const label = `${nameOf(w, r.pid)}, ${reqLabel(w, req)}: ${LEVEL_WORD[c.level]}${c.correction ? ' (your correction)' : ''}${ch ? ', changed' : ''}. ${note}`;
                const inner = (<>
                  <span className="hire-b-bar"><Glyph k={GLYPH_OF[c.level]} size={compact ? 11 : 13} /><span className="hire-b-bar-w">{WORD[c.level]}</span></span>
                  {ch && <span className="hire-b-changed" aria-hidden="true" />}
                  {!compact && <span className="hire-b-tip" aria-hidden="true"><b>{LEVEL_WORD[c.level]}</b> · {reqLabel(w, req)}<br />{note}</span>}
                </>);
                const sel = v.open?.pid === r.pid && v.open.reqId === req;
                return onCell ? (
                  <motion.button key={req} type="button" layout="position" className="hire-b-seg" data-l={c.level} data-corr={c.correction ? '1' : undefined} aria-pressed={sel} aria-label={label} title="" style={{ flexGrow: weights[j] }} animate={{ flexGrow: weights[j] }} transition={morph} onClick={() => onCell(r.pid, req)}>{inner}</motion.button>
                ) : (
                  <motion.span key={req} layout="position" className="hire-b-seg" data-l={c.level} role="img" aria-label={label} style={{ flexGrow: weights[j] }} animate={{ flexGrow: weights[j] }} transition={morph}>{inner}</motion.span>
                );
              })}
            </span>
          </motion.li>); })}
      </ol>
      {!noKey && <LedgerKey compact={compact} note={rub ? `weights from rubric v${roleRubric(w)!.v}` : v.weighting === 'EQUAL' ? 'you set must-haves to count the same' : 'no approved rubric yet, so must-haves count the same, twice a nice-to-have'} />}
    </div>
  );
}

export function LedgerKey({ compact, note }: { compact?: boolean; note?: string }) {
  const lv: Level[] = ['verified', 'evidenced', 'partial', 'claim', 'none'];
  return (
    <div className="hire-b-lkey">
      <ul aria-label="What the shades mean">
        {lv.map((l) => <li key={l}><span className="hire-b-sw" data-l={l} aria-hidden="true" />{compact ? WORD[l] : LEVEL_WORD[l]}</li>)}
      </ul>
      {!compact && <p className="t14 muted" style={{ margin: 0 }}>Wider blocks count for more{note ? `: ${note}` : ''}. Claimed and not shown count nothing, and that means unknown, not weak.</p>}
    </div>
  );
}
