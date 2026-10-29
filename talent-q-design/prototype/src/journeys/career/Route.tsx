// The route to your goal: the one picture every J7 surface shares, so a person can tell at a glance
// where they are (how many of the goal's competencies are shown with proof), what is between them and the
// goal (each remaining competency, by name) and what counts as proof versus practice or a claim.
// Dataviz: a single ordered series, so position along the track is the encoding (proof first, contiguous from
// "You"); strength is carried by glyph SHAPE (never shade) and every state is also written in words.
// Motion (MO-048/050): a stop whose state changes re-keys its glyph and scales in with DUR.normal / EASE.enter.
import { motion } from 'motion/react';
import { Glyph } from '../../ds/Glyph';
import { DUR, EASE } from '../../ds/motion';
import type { CState, Comp } from './personas';

export const isProof = (k: CState) => k === 'verified' || k === 'full';
/** Plain words for a competency state, grouped by whether it counts. */
export const STATE_WORD: Record<CState, string> = {
  verified: 'Verified', full: 'Reviewed work', partial: 'Partly shown', practice: 'Practising', unclear: 'Mentioned by you', none: 'Not shown yet',
};
const ORDER: Record<CState, number> = { verified: 0, full: 1, partial: 2, practice: 3, unclear: 4, none: 5 };

export function Route({ goal, needs, st, comp, first, onOpen, compact }: {
  goal: string; needs: string[]; st: (id: string) => CState; comp: (id: string) => Comp; first: string; onOpen?: (id: string) => void; compact?: boolean;
}) {
  const stops = needs.map((id) => ({ id, k: st(id) })).sort((a, b) => ORDER[a.k] - ORDER[b.k]);
  const n = stops.filter((s) => isProof(s.k)).length, left = stops.length - n;
  const head = left === 0 ? `${first}, you show everything ${goal} asks for.`
    : n === 0 ? `${first}, ${left} things stand between you and ${goal}.`
    : `${n} of ${stops.length} shown with proof, ${first}. ${left} to go.`;
  const sub = left === 0 ? 'Employers still decide, but nothing on your route is missing proof.' : 'Reviewed work moves you closer. Practice and mentions help, but don’t count yet.';
  return (
    <section className={`talent-a-routebox${compact ? ' is-compact' : ''}`} aria-labelledby="route-h">
      <div className="talent-a-routehead">
        <span className="lab">Your route to {goal}</span>
        <h2 id="route-h" className="voice t24" style={{ margin: 0 }}>{head}</h2>
        <p className="t14 muted" style={{ margin: 0 }}>{sub}</p>
      </div>
      <ol className="talent-a-route" aria-label={`Route to ${goal}: ${n} of ${stops.length} shown with proof`}>
        <li className="is-you" data-line="none"><span className="talent-a-routedot" aria-hidden="true">You</span><span className="sr">You are here</span></li>
        {stops.map((s) => {
          const c = comp(s.id), proof = isProof(s.k);
          const body = (
            <>
              <motion.span key={s.k} className="talent-a-routeglyph" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: DUR.normal, ease: EASE.enter }}><Glyph k={s.k} size={22} /></motion.span>
              <span className="talent-a-routelab"><b>{c.label}</b><span className={proof ? 'is-proof' : 'muted'}>{proof ? `Proof · ${STATE_WORD[s.k].toLowerCase()}` : STATE_WORD[s.k]}</span></span>
            </>
          );
          return (
            <li key={s.id} data-line={proof ? 'solid' : 'dotted'} data-proof={proof ? '1' : undefined}>
              {onOpen ? <button type="button" onClick={() => onOpen(s.id)} aria-label={`${c.label}: ${STATE_WORD[s.k]}${proof ? ', counts as proof' : ', does not count as proof yet'}. Open the role sheet.`}>{body}</button> : <span className="talent-a-routestatic">{body}</span>}
            </li>
          );
        })}
        <li className="is-goal" data-line={left ? 'dotted' : 'solid'}><span className="talent-a-routedot" aria-hidden="true">Goal</span><span className="talent-a-routelab"><b>{goal}</b><span className="muted">{left ? `${left} to go` : 'In reach'}</span></span></li>
      </ol>
      <ProofKey />
    </section>
  );
}

/** The key, grouped by what matters: what counts as proof, and what doesn't yet. */
export function ProofKey() {
  return (
    <div className="talent-a-proofkey t14" role="group" aria-label="Key">
      <span className="talent-a-proofgrp"><span className="lab">Counts as proof</span><span><Glyph k="verified" size={16} />Verified</span><span><Glyph k="full" size={16} />Reviewed work</span></span>
      <span className="talent-a-proofgrp"><span className="lab">Doesn’t count yet</span><span><Glyph k="partial" size={16} />Partly shown</span><span><Glyph k="practice" size={16} />Practising</span><span><Glyph k="unclear" size={16} />Mentioned</span><span><Glyph k="none" size={16} />Not shown</span></span>
    </div>
  );
}
