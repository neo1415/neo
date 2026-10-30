// Candidate score review (MO-026) and the feedback the employer may share (SC-107). Uses the shared rubric model:
// ratings bind to the approved version, the index is never shown without its coverage, and criteria without evidence
// are listed as unknown, never as zero. The review opens on what is uncertain; the ratings come after (motion: the
// uncertainty is highlighted first; reduced motion: a static scorecard with the uncertainty on top).
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { DUR, EASE } from '../../ds/motion';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { approvedVersion, ratingsOf, roleIndex, rubricFor } from '../../state/areas/rubrics';
import { assess } from '../../state/areas/assess';
import { actorName, confirmRating, draftCandidateFeedback, fmtDay, fromInterview, ivOf, personFirst, proposeInterviewRatings, readRoom, roleTitle, shareFeedback } from './model';
import { Meter, NotAvailable, Refusal, UNC, useMe, useRun } from './ui';

export function ScoreReview({ id }: { id: string }) {
  const me = useMe();
  const w = useWorld((x) => x);
  const [msg, run] = useRun();
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(false);
  const [hl, setHl] = useState(true);
  const [ov, setOv] = useState<{ id: string; v: number; reason: string } | null>(null);
  useEffect(() => { const t = window.setTimeout(() => setHl(false), 1600); return () => window.clearTimeout(t); }, []);
  const iv = ivOf(w, id);
  if (!iv || iv.orgId !== me.orgId) return <NotAvailable why="This interview isn’t available. It may belong to another organisation." back={{ to: '/r/interviews', label: 'See all interviews' }} />;
  const first = personFirst(w, iv.personId);
  const r = readRoom(w, id); const rub = rubricFor(w, iv.mandateId); const ver = approvedVersion(w, iv.mandateId);
  const p = fromInterview(w, id);
  const mine = rub && ver ? ratingsOf(w, rub.id, ver.v, iv.personId) : [];
  const fromIv = mine.filter((x) => x.refs.some((ref) => ref.evidenceId === `iv_${id}`));
  const idx = roleIndex(w, iv.mandateId, iv.personId);
  const high = fromIv.filter((x) => x.uncertainty === 'HIGH');
  const sim = r?.turns.some((t) => t.simulated && r.excerpts.some((e) => e.turnId === t.id));
  const open = shown || !!reduce;
  const crit = (cid: string) => ver?.criteria.find((c) => c.id === cid);
  const title = !ver ? `No approved rubric for ${roleTitle(w, iv.mandateId)} yet` : fromIv.length ? `${first}: ${fromIv.filter((x) => !x.reviewed).length} rating${fromIv.filter((x) => !x.reviewed).length === 1 ? '' : 's'} to review` : `Review ${first}’s interview`;
  return (
    <Canvas title={title} kicker={`Score review · ${roleTitle(w, iv.mandateId)}`} open onClose={() => history.back()}
      aside={<div className="ds-actions"><Link className="ds-btn quiet" to={`/r/interviews/${id}/transcript`}>Transcript</Link><Link className="ds-btn quiet" to={`/r/people/${iv.personId}`}>Profile</Link></div>}>
      {!ver || !rub ? (
        <section className="ds-sheet as-empty"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>Nothing can be rated until a rubric is approved.</b><p className="t14 muted as-p">The rubric says what each level means. Without it, Q won’t propose a number. <Link to={`/r/roles/${iv.mandateId}/rubric`}>Open the evaluation studio</Link></p></div></section>
      ) : !r || !r.excerpts.length ? (
        <section className="ds-sheet as-empty"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>No interview answers are marked as evidence yet.</b><p className="t14 muted as-p">Mark recorded answers in the <Link to={`/r/interviews/${id}/transcript`}>transcript</Link>. Criteria without evidence stay unknown, not zero.</p></div></section>
      ) : (
        <>
          <motion.section className="as-unc" data-hl={hl && !reduce ? '1' : undefined} aria-labelledby="rv-unc" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.slow, ease: EASE.enter }}>
            <h2 id="rv-unc" className="as-h2">Read this first: what’s uncertain</h2>
            <ul className="as-list">
              {p.unknown.length > 0 && <li><b>Unknown, not zero:</b> {p.unknown.map((u) => u.label).join(', ')}. No marked interview answer covers these and they have no rating yet. They’re left out of the index, which lowers its coverage instead. {first}’s shared evidence may cover some: Q can rate it on <Link to={`/r/people/${iv.personId}`}>the profile scorecard</Link>.</li>}
              {high.length > 0 && <li><b>High uncertainty:</b> {high.map((x) => crit(x.criterionId)?.label).join(', ')}. The answer was general; a follow-up or a work sample would tell you more.</li>}
              {p.list.some((x) => x.existing && !x.existing.refs.some((ref) => ref.evidenceId === `iv_${id}`)) && <li><b>Already rated from shared evidence:</b> {p.list.filter((x) => x.existing && !x.existing.refs.some((ref) => ref.evidenceId === `iv_${id}`)).map((x) => x.label).join(', ')}. The interview doesn’t replace those ratings.</li>}
              {sim && <li><b>Simulated answers:</b> some marked answers were scripted for this prototype.</li>}
              <li><b>One interview is one sample.</b> It shows how {first} described the work, not how they’ll perform. Q never rates face, voice, accent or confidence.</li>
            </ul>
            {!fromIv.length && <div className="as-actions"><button type="button" className="ds-btn primary" onClick={() => run((x, a) => proposeInterviewRatings(x, a, id))}>Ask Q to propose ratings from the marked answers</button></div>}
            {fromIv.length > 0 && !open && <div className="as-actions"><button type="button" className="ds-btn primary" onClick={() => setShown(true)}>I’ve read this: show the ratings</button></div>}
          </motion.section>
          <Refusal msg={msg} />
          {fromIv.length > 0 && open && (
            <section className="ds-sheet as-grid" aria-labelledby="rv-r">
              <div className="as-row">
                <h2 id="rv-r" className="as-h2">Proposed from the interview · rubric v{ver.v}</h2>
                <span className="as-index" aria-label={`Observed index ${idx.index ?? 'none'} at ${idx.coverage}% coverage`}><span className="lab">Observed index</span><b className="num">{idx.index ?? '–'}</b><span className="t14">at {idx.coverage}% coverage · {idx.observed} of {idx.total} criteria</span></span>
              </div>
              <ol className="as-list">
                {fromIv.map((x, i) => (
                  <motion.li key={x.id} className="as-li" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.normal, ease: EASE.enter, delay: reduce ? 0 : 0.15 + i * 0.08 }}>
                    <div className="as-rate">
                      <div className="as-grid" style={{ gap: 4 }}><b>{crit(x.criterionId)?.label}</b><span className="t14">{UNC[x.uncertainty]} · {x.reviewed ? `Confirmed by ${actorName(w, x.by)}` : 'Q proposed, not reviewed'}{x.override ? ` · changed from ${x.override.from}: “${x.override.reason}”` : ''}</span></div>
                      <Meter rating={x.rating} u={x.uncertainty} label={crit(x.criterionId)?.label ?? ''} />
                    </div>
                    <span className="t14 muted">Level {x.rating} means: {crit(x.criterionId)?.anchors[x.rating]}</span>
                    {x.refs.map((ref, k) => ref.quote && <blockquote key={k} className="as-quote">{ref.quote}</blockquote>)}
                    <span className="t14">{x.note}</span>
                    {ov?.id === x.id ? (
                      <form className="as-actions" onSubmit={(e) => { e.preventDefault(); void runAction({ label: 'Change rating', act: { t: 'do', op: 'rb.rating.override', args: { id: x.id, rating: ov.v, reason: ov.reason } } }); if (ov.reason.trim()) setOv(null); }}>
                        <label className="t14" htmlFor={`rv-v-${x.id}`}>New level</label>
                        <select id={`rv-v-${x.id}`} className="ds-input" style={{ width: 'auto' }} value={ov.v} onChange={(e) => setOv({ ...ov, v: Number(e.target.value) })}>{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                        <label className="sr" htmlFor={`rv-r-${x.id}`}>Reason</label>
                        <input id={`rv-r-${x.id}`} className="ds-input" style={{ flex: 1, minWidth: 180 }} placeholder="Why? (required, audited)" value={ov.reason} onChange={(e) => setOv({ ...ov, reason: e.target.value })} />
                        <button type="submit" className="ds-btn" disabled={!ov.reason.trim()}>Save</button><button type="button" className="ds-btn quiet" onClick={() => setOv(null)}>Cancel</button>
                      </form>
                    ) : !x.reviewed && (
                      <div className="as-actions"><button type="button" className="ds-btn" onClick={() => run((d, a) => confirmRating(d, a, x.id))}>Confirm {x.rating} of 4</button><button type="button" className="ds-btn quiet" onClick={() => setOv({ id: x.id, v: x.rating, reason: '' })}>Change it</button></div>
                    )}
                  </motion.li>
                ))}
              </ol>
              <p className="t14 muted as-p">Prototype arithmetic, not a validated test. Not comparable across roles. The full scorecard is on <Link to={`/r/people/${iv.personId}`}>{first}’s profile</Link>.</p>
            </section>
          )}
          <FeedbackComposer id={id} />
        </>
      )}
    </Canvas>
  );
}

function FeedbackComposer({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const [msg, run] = useRun();
  const iv = ivOf(w, id)!; const first = personFirst(w, iv.personId);
  const f = assess(w).feedback[id] ?? draftCandidateFeedback(w, id);
  const [note, setNote] = useState(f?.note ?? '');
  if (!f) return null;
  const shared = f.state === 'SHARED';
  const toggle = (item: string) => void runAction({ label: 'toggle', act: { t: 'do', op: 'as.feedback.toggle', args: { id, item } } });
  const items = [...f.strengths.map((x) => ({ ...x, g: 'Strength' })), ...f.routes.map((x) => ({ ...x, g: 'Next time' }))];
  return (
    <section className="ds-sheet as-grid" aria-labelledby="fb-h">
      <div className="as-row"><h2 id="fb-h" className="as-h2">Feedback for {first}</h2><span className="ds-tag" data-k={shared ? 'ok' : undefined}>{shared ? `Shared ${fmtDay(f.sharedAt!)}` : 'Not shared: only your team sees this'}</span></div>
      <p className="t14 muted as-p">Q drafted these from the marked answers. {first} sees only the points you switch on, and only after you share. Nothing about the score is shared.</p>
      <ul className="as-list">
        {items.map((x) => (
          <li key={x.id} className="as-li">
            <label style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 10, alignItems: 'start', cursor: shared ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={x.on} disabled={shared} onChange={() => toggle(x.id)} style={{ width: 20, height: 20, marginTop: 3 }} />
              <span><span className="lab">{x.g}</span><br />{x.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="ds-field"><label htmlFor="fb-note">A note in your own words (optional)</label><textarea id="fb-note" className="ds-input" rows={3} value={note} disabled={shared} onChange={(e) => setNote(e.target.value)} onBlur={() => void runAction({ label: 'note', act: { t: 'do', op: 'as.feedback.note', args: { id, note } } })} /></div>
      {!shared ? <ConfirmButton className="ds-btn primary" label={`Share with ${first}`} question={`Share ${items.filter((x) => x.on).length} point${items.filter((x) => x.on).length === 1 ? '' : 's'}${note.trim() ? ' and your note' : ''} with ${first}? They’ll see exactly this.`} yes="Share" onConfirm={() => run((d, a) => shareFeedback(d, a, id, { note }))} />
        : <p className="t14 as-p" role="status"><Glyph k="full" size={14} /> {first} can read this on their interview record.</p>}
      <Refusal msg={msg} />
    </section>
  );
}
