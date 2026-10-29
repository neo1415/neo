// Scorecard on the candidate profile, with the uncertainty inspector (AD-E-10…13, J11 step 8).
// The index is never shown without coverage, and unknown criteria are listed as unknown, never as zero.
// Every rating shows its anchor, evidence (timestamps open the video evidence report), uncertainty, freshness and
// whether a person reviewed it or Q proposed it. An override needs a reason and is audited.
import { useState } from 'react';
import { useWorld, type World } from '../../mock/world';
import type { Rating, RubricCriterion } from '../../state/domain';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { approvedVersion, rubricFor } from '../../state/areas/rubrics';
import { actorName, card, firstOf, fmtDay, fmtT, freshness, indexLine, KIND_WORD, list, proposeRatings, refView, roleOf, scored, studioPath, UNC_WORD } from './model';
import './ops';
import './rubric.css';

const op = (name: string, args: Record<string, unknown>) => void runAction({ label: name, act: { t: 'do', op: name, args } });

export function Meter({ r, label }: { r?: Rating; label: string }) {
  if (!r) return <span className="rb-rate"><Glyph k="none" size={14} />Unknown: not rated</span>;
  return (
    <span className="rb-rate">
      <span className="rb-meter" data-u={r.uncertainty} role="img" aria-label={`${label}: level ${r.rating} of 4, ${UNC_WORD[r.uncertainty].toLowerCase()}`}>
        {[1, 2, 3, 4].map((i) => <i key={i} data-on={i <= r.rating ? '1' : undefined} />)}
      </span>
      <span className="num">{r.rating} of 4</span>
    </span>
  );
}

export function Scorecard({ personId, mandateId, orgId }: { personId: string; mandateId: string; orgId: string }) {
  const w = useWorld((x) => x);
  const [pick, setPick] = useState<number | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);
  const first = firstOf(w, personId);
  const rub = rubricFor(w, mandateId);
  const inForce = approvedVersion(w, mandateId);
  const cd = card(w, mandateId, personId, pick ?? inForce?.v);
  if (!rub || !inForce || !cd) return (
    <div className="rb-empty"><Glyph k="none" /><div className="rb-grid" style={{ gap: 6 }}><b>No approved rubric for {roleOf(w, mandateId)?.title ?? 'this role'} yet.</b><p className="t14 muted" style={{ margin: 0 }}>Until there is one, {first} is compared on equal must-haves and there’s no scorecard. <Link to={studioPath(mandateId)}>Open the evaluation studio</Link></p></div></div>
  );
  const { ver, rows, idx, unknown, older } = cd;
  const scoredRows = rows.filter((x) => scored(x.c));
  const separate = rows.filter((x) => !scored(x.c));
  const canPropose = ver === inForce && proposeRatings(w, mandateId, personId, orgId).length > 0;
  const unreviewed = rows.filter((x) => x.r && !x.r.reviewed).length;
  const total = scoredRows.reduce((s, x) => s + x.c.weight, 0);
  return (
    <div className="rb-grid">
      <div className="rb-row">
        <span className="t14 muted">Rubric v{ver.v} · approved by {actorName(w, ver.approvedBy ?? ver.by)} on {fmtDay(ver.at)}{ver !== inForce ? ' · not the version in force' : ''}</span>
        <Link className="t14" to={studioPath(mandateId)}>Open the rubric</Link>
      </div>
      {older.length > 0 && (
        <div className="rb-vers" role="group" aria-label="Rubric versions with ratings">
          {[inForce.v, ...older].filter((v, i, a) => a.indexOf(v) === i).sort().map((v) => <button key={v} type="button" className="ds-filter" aria-pressed={v === ver.v} onClick={() => setPick(v)}>v{v}{v === inForce.v ? ' · in force' : ''}</button>)}
        </div>
      )}
      <div className="rb-score-top">
        <div className="rb-index" aria-label={`Observed role-evidence index: ${indexLine(idx)}`}>
          <span className="lab">Observed index</span>
          <span className="rb-index-n">{idx.index ?? '–'}<small> at {idx.coverage}% coverage</small></span>
        </div>
        <div className="rb-cov">
          <span className="rb-covbar" role="img" aria-label={`Coverage ${idx.coverage}%: ${idx.observed} of ${scoredRows.length} scored criteria rated, ${idx.reviewed} reviewed by a person`}>
            {scoredRows.map((x) => x.r ? <span key={x.c.id} data-rev={x.r.reviewed ? '1' : undefined} style={{ width: `${(100 * x.c.weight) / (total || 1)}%` }} /> : null)}
          </span>
          <p className="t14" style={{ margin: 0 }}>{idx.observed} of {scoredRows.length} criteria rated ({idx.reviewed} reviewed by a person). {unknown.length ? `${list(unknown.map((c) => c.label))} ${unknown.length === 1 ? 'isn’t' : 'aren’t'} rated, so ${unknown.length === 1 ? 'it’s' : 'they’re'} unknown and not counted as zero.` : 'Every scored criterion has a rating.'}</p>
        </div>
      </div>
      <p className="t14 muted" style={{ margin: 0 }}>A prototype formula over the rated criteria only, weighted by the rubric. It isn’t a probability of doing well, isn’t comparable across roles, and isn’t validated. A person decides.</p>
      <ul className="rb-rows">
        {scoredRows.map(({ c, r }) => <Row key={c.id} w={w} c={c} r={r} personId={personId} orgId={orgId} open={open === c.id} onOpen={() => setOpen(open === c.id ? null : c.id)} frozen={ver.state !== 'APPROVED' && ver.state !== 'SUPERSEDED'} />)}
      </ul>
      {separate.length > 0 && (
        <div className="rb-separate">
          <span className="lab">Reported separately, never in the index</span>
          {separate.map(({ c, r }) => <p key={c.id} className="t14" style={{ margin: 0 }}><b>{c.label}</b> · {KIND_WORD[c.kind]}: {r ? (r.rating >= 3 ? 'met or suits them' : 'not met or doesn’t suit') : 'not asked yet'}.</p>)}
        </div>
      )}
      <div className="ds-actions">
        {canPropose && <button type="button" className="ds-btn" onClick={() => op('rb.rate', { mandateId, personId })}>Ask Q to rate from shared evidence</button>}
        {unreviewed > 0 && <button type="button" className="ds-btn primary" onClick={() => op('rb.review', { mandateId, personId, v: ver.v })}>Mark {unreviewed} Q-proposed rating{unreviewed === 1 ? '' : 's'} reviewed</button>}
      </div>
    </div>
  );
}

function Row({ w, c, r, personId, orgId, open, onOpen }: { w: World; c: RubricCriterion; r?: Rating; personId: string; orgId: string; open: boolean; onOpen: () => void; frozen?: boolean }) {
  const [val, setVal] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const refs = r?.refs.map((x) => ({ x, v: refView(w, orgId, personId, x) })) ?? [];
  const hidden = refs.filter((x) => !x.v.visible).length;
  const shown = refs.filter((x) => x.v.visible);
  const save = () => { setTried(true); if (!r || val === null || !reason.trim()) return; op('rb.rating.override', { id: r.id, rating: val, reason }); setVal(null); setReason(''); setTried(false); };
  return (
    <li>
      <div className="rb-row"><span><b>{c.label}</b><span className="t14 muted"> · weight {c.weight}{c.minimum !== undefined ? ` · minimum ${c.minimum}` : ''}</span></span><Meter r={r} label={c.label} /></div>
      {r ? <p className="t14" style={{ margin: 0 }}><span className="muted">Level {r.rating}:</span> {c.anchors[r.rating]}</p> : <p className="t14 muted" style={{ margin: 0 }}>Nothing shared shows this yet. Ask in the interview: “{c.questions[0]}”</p>}
      {r && (
        <div className="rb-src t14">
          <span className="ds-tag" data-k={r.reviewed ? 'ok' : 'busy'}><Glyph k={r.reviewed ? 'verified' : 'partial'} size={13} />{r.override ? `Changed by ${firstOf(w, r.override.by)}` : r.reviewed ? 'Reviewed by a person' : 'Q proposed, not reviewed'}</span>
          <span className="ds-tag">{UNC_WORD[r.uncertainty]}</span>
          <span className="ds-tag">{freshness(w, r)}</span>
          {r.dispute?.state === 'OPEN' && <span className="ds-tag" data-k="warn">Correction requested</span>}
        </div>
      )}
      {r?.override && <p className="t14" style={{ margin: 0 }}>{firstOf(w, r.override.by)} changed this from {r.override.from} to {r.rating} on {fmtDay(r.override.at)}: “{r.override.reason}”</p>}
      {r?.dispute && <p className="t14 rb-dispute" style={{ margin: 0 }}>{firstOf(w, personId)} asked for a correction: “{r.dispute.text}” {r.dispute.state === 'OPEN' ? <button type="button" className="rb-link" onClick={() => op('rb.dispute.resolve', { id: r.id, note: 'reviewed the request and replied in messages.' })}>Mark answered</button> : <span className="muted">(answered)</span>}</p>}
      {r && <div><button type="button" className="rb-link" aria-expanded={open} onClick={onOpen}>{open ? 'Close the inspector' : 'Inspect evidence and uncertainty'}</button></div>}
      {r && open && (
        <div className="rb-inspect" role="region" aria-label={`Why ${c.label} is rated ${r.rating}`}>
          <p className="t14" style={{ margin: 0 }}><span className="rb-q">Why</span> {r.note}</p>
          <ul className="rb-refs">
            {shown.map(({ x, v }, i) => (
              <li key={i}>{v.video ? <Link to={`/r/people/${personId}/video?t=${v.video.t}`}>{v.title} · {fmtT(v.video.t)}{v.video.tEnd !== undefined ? `–${fmtT(v.video.tEnd)}` : ''}</Link> : <b>{v.title}</b>}
                <span className="muted"> · {v.reliability}{v.when ? ` · ${fmtDay(v.when)}` : ''}</span>{x.quote && <><br />“{x.quote}”</>}</li>
            ))}
            {!shown.length && <li className="muted">No evidence this organisation can still see.</li>}
          </ul>
          {hidden > 0 && <p className="t14" style={{ margin: 0 }}><Glyph k="none" size={14} /> {hidden === 1 ? 'One item behind this rating is' : `${hidden} items behind this rating are`} no longer shared with you, so the rating needs a fresh review.</p>}
          <p className="t14 muted" style={{ margin: 0 }}>Uncertainty: {UNC_WORD[r.uncertainty].toLowerCase()}. {r.uncertainty === 'HIGH' ? 'One thin or second-hand source.' : r.uncertainty === 'MEDIUM' ? 'Shown, but not checked at the source or only partly.' : 'Specific, checked or shown in their own words with numbers.'} Rated by {r.source === 'Q_PROPOSED' ? 'Q (a proposal)' : actorName(w, r.by)} on {fmtDay(r.at)}.</p>
          <details>
            <summary className="t14">All levels for {c.label.toLowerCase()}</summary>
            <ol className="rb-anchors" start={0}>{c.anchors.map((a, i) => <li key={i} data-diff={i === r.rating ? '1' : undefined}><span className="rb-lv num" aria-hidden="true">{i}</span><span><span className="sr">Level {i}{i === r.rating ? ' (current)' : ''}: </span>{a}</span></li>)}</ol>
          </details>
          <fieldset className="rb-grid" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
            <legend className="lab" style={{ marginBottom: 6 }}>Change this rating</legend>
            <div className="rb-seg" role="group" aria-label={`New level for ${c.label}`}>{[0, 1, 2, 3, 4].map((l) => <button key={l} type="button" aria-pressed={(val ?? r.rating) === l} onClick={() => setVal(l)}>{l}</button>)}</div>
            <label htmlFor={`why-${r.id}`} className="t14">Reason (required, audited, and shown to {firstOf(w, personId)})</label>
            <textarea id={`why-${r.id}`} className="ds-input rb-textarea" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={tried && !reason.trim() ? true : undefined} aria-describedby={`why-${r.id}-e`} />
            {tried && !reason.trim() && <p id={`why-${r.id}-e`} className="t14 rb-refuse" role="alert">Add a reason. Overrides without one aren’t saved.</p>}
            {tried && val === null && reason.trim() && <p className="t14 rb-refuse" role="alert">Choose the new level first.</p>}
            <div><button type="button" className="ds-btn" onClick={save}>Save the change</button></div>
          </fieldset>
        </div>
      )}
    </li>
  );
}
