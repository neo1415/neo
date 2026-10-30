// Profile panels for evidence-first hiring (J12 steps 4, 5, 8). The CV is shown as the document it is, with each
// claim marked by where it stands; reuse decisions close only the gaps (accept, verify, or one bounded sample);
// a person reviews a submitted sample; mutual fit shows only what the candidate shared, unknowns as unknown.
// Art direction (creative, inside Direction D): the CV is a paper slip set on the sheet, like a document on a desk;
// Q's reading of each claim sits in the margin as a proof mark, the way an editor annotates a manuscript.
import { useState } from 'react';
import type { Evidence } from '@contracts';
import type { World } from '../../../mock/world';
import { runAction } from '../../../q/core/engine';
import { Glyph } from '../../../ds/Glyph';
import type { ProofClass } from '../../../state/domain';
import { proof } from '../../../state/areas/proof';
import { cellFor, criteriaIn, firstName, reqsOf, shortLabel, viewerOrg } from '../../hire-b/model';
import { fmtDate } from '../../hire-b/ui';
import { BOUNDED_SAMPLE, proofClass, proofReading, SHAPE_WORD } from '../model';
import { decisionsFor, interestFor, PROOF_ORDER, proofItems } from './model';
import { OUTCOME_WORD } from './ops';
import { ProofTag } from './ui';

const best = (w: World, pid: string, reqId: string) => proofItems(w, pid, reqId).filter((i) => !i.excluded).sort((a, b) => PROOF_ORDER.indexOf(a.cls) - PROOF_ORDER.indexOf(b.cls)).find((i) => i.cls !== 'CLAIM') ?? null;
const dm = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const actorName = (w: World, id: string) => w.actors.find((a) => a.id === id)?.name ?? 'your team';

/** The CV as a document, claims marked in the margin with what the evidence shows. */
export function CvDocument({ w, pid }: { w: World; pid: string }) {
  const cv = proof(w).cvs[pid]; const f = firstName(w, pid);
  const r = proofReading(w, pid);
  if (!cv) return (
    <section id="pf-cv" className="ds-sheet hire-b-grid" aria-labelledby="pf-cv-h">
      <div className="hire-b-row"><h2 id="pf-cv-h" className="voice t24" style={{ margin: 0 }}>CV and proof</h2><span className="evr-badge">{SHAPE_WORD.NO_CV}</span></div>
      <p className="t14" style={{ margin: 0 }}>{f} hasn’t shared a CV with you. That’s fine: the evidence below is read on its own, and nothing counts against {f} for it.</p>
    </section>
  );
  const marked = (line: string) => criteriaIn(line.toLowerCase()).filter((q) => (cv.mentions[q] ?? 'NO') !== 'NO');
  const beyond = r.rows.filter((x) => x.cv !== 'YES' && (x.level === 'verified' || x.level === 'evidenced'));
  return (
    <section id="pf-cv" className="ds-sheet hire-b-grid" aria-labelledby="pf-cv-h">
      <div className="hire-b-row"><h2 id="pf-cv-h" className="voice t24" style={{ margin: 0 }}>CV and proof</h2><span className="evr-badge" data-shape={r.shape}>{SHAPE_WORD[r.shape]}</span></div>
      <figure className="evr-doc" aria-label={`${f}’s CV, with each claim marked by what the evidence shows`}>
        <ol className="evr-doc-lines">
          {cv.lines.map((line, k) => { const qs = marked(line); return (
            <li key={k} data-first={k === 0 ? '1' : undefined} data-claim={qs.length ? '1' : undefined}>
              <span className="evr-doc-text">{qs.length ? <mark>{line}</mark> : line}</span>
              {qs.length > 0 && <span className="evr-doc-margin">{qs.map((q) => { const b = best(w, pid, q); const lvl = cellFor(w, pid, q).level; return (
                <span key={q} className="evr-doc-note"><span className="lab">{shortLabel(w, q)}{cv.mentions[q] === 'VAGUE' ? ' · vague' : ''}</span>{b ? <ProofTag c={b.cls} small /> : <span className="evr-tag" data-small="1"><Glyph k="none" size={12} />Nothing shown</span>}{lvl === 'partial' && <span className="muted">partial</span>}</span>); })}</span>}
            </li>); })}
        </ol>
        <figcaption>Uploaded {fmtDate(cv.uploadedAt)}. A CV line is a claim: not evidence of the work, and not a sign it isn’t true. How polished it reads doesn’t count either way.</figcaption>
      </figure>
      {beyond.length > 0 && <p className="t14" style={{ margin: 0 }}><b>Shown, but not in the CV:</b> {beyond.map((x) => { const b = best(w, pid, x.reqId); return `${shortLabel(w, x.reqId)} (${b ? b.cls === 'ASSESSED' ? 'assessed' : b.cls === 'ISSUER_VERIFIED' ? 'issuer-verified' : 'self-reported' : 'shown'})`; }).join(', ')}.</p>}
      {r.claimedOnly.length > 0 && <p className="t14" style={{ margin: 0 }}><b>Claimed, not yet shown:</b> {r.claimedOnly.map((q) => shortLabel(w, q)).join(', ')}. Unknown, not weak: one bounded piece of work would settle it.</p>}
    </section>
  );
}

/** Evidence grouped by how it's known. */
export function groupByProof(w: World, items: Evidence[]): { c: ProofClass; items: Evidence[] }[] {
  return PROOF_ORDER.map((c) => ({ c, items: items.filter((e) => !e.confidential && proofClass(w, e) === c) })).filter((g) => g.items.length);
}

const DSTATE: Record<string, string> = { PROPOSED: 'Drafted, not sent yet', SENT: 'Sent, waiting', IN_PROGRESS: 'In progress', SUBMITTED: 'Submitted, waiting for your review', REVIEWED: 'Reviewed', DECLINED: 'Declined (not a failed result)' };
/** Reuse before retest: per requirement, accept existing evidence, ask for it to be verified, or one bounded sample. */
export function ReusePanel({ w, pid }: { w: World; pid: string }) {
  const f = firstName(w, pid);
  const ds = decisionsFor(w, pid);
  const go = (op: string, reqId: string) => void runAction({ label: op, act: { t: 'do', op, args: { personId: pid, reqId } } });
  return (
    <section id="pf-reuse" className="ds-sheet hire-b-grid" aria-labelledby="pf-reuse-h">
      <div className="hire-b-row"><h2 id="pf-reuse-h" className="voice t24" style={{ margin: 0 }}>Close only the gaps</h2><span className="t14 muted">Reuse before you retest</span></div>
      <p className="t14 muted" style={{ margin: 0 }}>For each requirement: accept what {f} already shared, ask for it to be checked, or ask for one short piece of work instead of a full assessment. Anything that reaches {f} goes through Messages with your approval.</p>
      <ul className="evr-reuse">
        {reqsOf(w).map((r) => {
          const items = proofItems(w, pid, r.reqId).filter((i) => !i.excluded);
          const reviewed = items.filter((i) => i.cls === 'ASSESSED' || i.cls === 'ISSUER_VERIFIED');
          const selfRep = items.filter((i) => i.cls === 'SELF_REPORTED');
          const level = cellFor(w, pid, r.reqId).level;
          const d = ds.find((x) => x.reqId === r.reqId);
          const sample = BOUNDED_SAMPLE[r.reqId];
          const b = best(w, pid, r.reqId);
          return (
            <li key={r.reqId}>
              <div className="evr-reuse-head"><b>{r.label}</b><span className="t14 muted">{r.mustHave ? 'must have' : 'nice to have'}</span>{b ? <ProofTag c={b.cls} small /> : <span className="evr-tag" data-small="1"><Glyph k="none" size={12} />Not shown yet</span>}{level === 'partial' && <span className="t14 muted">partial</span>}</div>
              {d ? (
                <p className="evr-decision" role="status"><span className="lab">{d.decision === 'ACCEPT_PRIOR' ? 'Accepted, no retest' : d.decision === 'REQUEST_VERIFICATION' ? 'Verification asked' : `One ${d.effortMinutes}-minute sample`}</span> {d.decision === 'BOUNDED_SAMPLE' ? DSTATE[d.state] : ''}{d.decision === 'BOUNDED_SAMPLE' ? ' · ' : ''}by {actorName(w, d.by)}, {dm(d.at)}</p>
              ) : (
                <div className="evr-reuse-acts">
                  {reviewed.length > 0 && <button type="button" className="ds-btn" onClick={() => go('evr.accept', r.reqId)}>Accept existing evidence</button>}
                  {selfRep.length > 0 && level !== 'verified' && <button type="button" className="ds-btn quiet" onClick={() => go('evr.verify', r.reqId)}>Ask to verify</button>}
                  {sample && level !== 'verified' && <button type="button" className="ds-btn quiet" onClick={() => go('evr.sample.draft', r.reqId)}>One sample · {sample.minutes} min</button>}
                  {!reviewed.length && !selfRep.length && !sample && <span className="t14 muted">Ask in the interview.</span>}
                </div>
              )}
              {!d && sample && level !== 'verified' && <p className="t14 muted evr-sample-task" style={{ margin: 0 }}>Sample: {sample.task}.</p>}
            </li>);
        })}
      </ul>
    </section>
  );
}

/** A person reviews a submitted sample. Nothing counts until this is recorded, with a note. */
export function ReviewPanel({ w, pid }: { w: World; pid: string }) {
  const d = decisionsFor(w, pid).find((x) => x.decision === 'BOUNDED_SAMPLE' && (x.state === 'SUBMITTED' || x.state === 'REVIEWED') && x.resultEvidenceId);
  const [outcome, setOutcome] = useState<keyof typeof OUTCOME_WORD | ''>('');
  const [note, setNote] = useState(''); const [tried, setTried] = useState(false);
  if (!d) return null;
  const e = w.evidence.find((x) => x.evidenceId === d.resultEvidenceId);
  const f = firstName(w, pid);
  if (!e) return null;
  if (d.state === 'REVIEWED') {
    const ev = [...w.events].reverse().find((x) => x.type === 'evidence.sample.reviewed' && (x.data as { decisionId?: string } | undefined)?.decisionId === d.id);
    return (
      <section id="pf-review" className="ds-sheet hire-b-grid evr-review" data-done="1" aria-labelledby="pf-review-h">
        <div className="hire-b-row"><h2 id="pf-review-h" className="voice t24" style={{ margin: 0 }}>{shortLabel(w, d.reqId)} sample, reviewed</h2><ProofTag c={proofClass(w, e)} /></div>
        <p className="t14" style={{ margin: 0 }}>{ev?.text ?? 'Reviewed.'}</p>
      </section>
    );
  }
  const err = tried && (!outcome || !note.trim());
  const submit = () => { setTried(true); if (!outcome || !note.trim()) return; void runAction({ label: 'Record review', act: { t: 'do', op: 'evr.review', args: { id: d.id, outcome, note: note.trim() } } }); };
  return (
    <section id="pf-review" className="ds-sheet hire-b-grid evr-review" aria-labelledby="pf-review-h">
      <div className="hire-b-row"><h2 id="pf-review-h" className="voice t24" style={{ margin: 0 }}>Review {f}’s {shortLabel(w, d.reqId)} sample</h2><ProofTag c={proofClass(w, e)} /></div>
      <div className="evr-review-body">
        <p style={{ margin: 0 }}><span className="lab">Task</span> {BOUNDED_SAMPLE[d.reqId]?.task} · {d.effortMinutes} min</p>
        <p style={{ margin: 0 }}><span className="lab">{f} wrote</span> {e.shows}</p>
        <p className="t14 muted" style={{ margin: 0 }}>{e.limits} Submitted {fmtDate(e.observedAt)} (simulated work).</p>
      </div>
      <fieldset className="evr-outcomes">
        <legend className="lab">What does it show?</legend>
        {(Object.keys(OUTCOME_WORD) as (keyof typeof OUTCOME_WORD)[]).map((k) => (
          <label key={k} className="ds-opt evr-opt" data-on={outcome === k ? '1' : undefined}>
            <input type="radio" name={`rv-${d.id}`} value={k} checked={outcome === k} onChange={() => setOutcome(k)} />
            <span><b>{OUTCOME_WORD[k]}</b><span className="t14 muted">{k === 'SHOWS_IT' ? 'Counts as Assessed for this requirement.' : k === 'PARTLY' ? 'Counts as Assessed, partial.' : 'Doesn’t count. About this sample, not the person.'}</span></span>
          </label>
        ))}
      </fieldset>
      <label className="evr-note"><span className="lab">Your note (goes on the record with your name)</span>
        <textarea className="ds-input" rows={3} value={note} onChange={(x) => setNote(x.target.value)} aria-invalid={err && !note.trim() ? true : undefined} aria-describedby={err ? `rv-err-${d.id}` : undefined} placeholder="What the work showed, in a sentence or two" />
      </label>
      {err && <p id={`rv-err-${d.id}`} className="evr-err" role="alert">{!outcome ? 'Choose what the sample shows.' : 'Add a short note so the decision can be explained later.'}</p>}
      <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={submit}>Record the review</button></div>
    </section>
  );
}

const MODE: Record<string, string> = { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' };
/** Mutual fit: only what the candidate shared with this organisation; unknown stays unknown; never scored. */
export function MutualFit({ w, pid }: { w: World; pid: string }) {
  const f = firstName(w, pid); const org = viewerOrg(w);
  const p = proof(w).prefs[pid]; const shared = p && p.shareWith.includes(org) ? p : undefined;
  const m = w.mandate; const i = interestFor(w, pid);
  const max = Number(m.payBand.match(/–₦([\d.]+)m/)?.[1] ?? '3.1') * 1e6;
  type Row = { k: string; role: string; them: string | null; fit: 'Fits' | 'Doesn’t fit' | 'Partly' | null };
  const rows: Row[] = [
    { k: 'Way of working', role: MODE[m.workMode], them: shared?.workModes?.length ? shared.workModes.map((x) => MODE[x]).join(' or ') : null, fit: shared?.workModes?.length ? (shared.workModes.includes(m.workMode) ? 'Fits' : 'Doesn’t fit') : null },
    { k: 'Location', role: m.location, them: shared?.locations?.length ? shared.locations.join(', ') : null, fit: shared?.locations?.length ? (shared.locations.includes(m.location) ? 'Fits' : 'Doesn’t fit') : null },
    { k: 'Pay', role: m.payBand, them: shared?.payMin ? `From ₦${(shared.payMin / 1e6).toFixed(1)}m / month` : null, fit: shared?.payMin ? (shared.payMin <= max ? 'Fits' : 'Doesn’t fit') : null },
    { k: 'Available from', role: 'As soon as possible', them: shared?.availableFrom ? fmtDate(shared.availableFrom) : null, fit: shared?.availableFrom ? 'Fits' : null },
  ];
  return (
    <section id="pf-mutual" className="ds-sheet hire-b-grid" aria-labelledby="pf-mutual-h">
      <div className="hire-b-row"><h2 id="pf-mutual-h" className="voice t24" style={{ margin: 0 }}>Mutual fit</h2><span className="t14 muted">{shared ? `Shared by ${f}, ${fmtDate(shared.updatedAt)}` : 'Nothing shared yet'}</span></div>
      <p className="t14 muted" style={{ margin: 0 }}>Only what {f} chose to share with you. It sits apart from the evidence and never changes the reading or any order. Unknown means not shared, not a mismatch.</p>
      <table className="ds-table evr-mutual">
        <caption className="sr">The role’s terms beside what {f} shared</caption>
        <thead><tr><th scope="col"><span className="sr">Term</span></th><th scope="col">The role</th><th scope="col">{f}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.k}><th scope="row">{r.k}</th><td>{r.role}</td><td>{r.them ? <><span>{r.them}</span> <span className="evr-fit" data-fit={r.fit}>{r.fit}</span></> : <span className="evr-unknown"><Glyph k="unclear" size={12} /> Unknown</span>}</td></tr>)}</tbody>
      </table>
      <p className="evr-int-line" style={{ margin: 0 }}><span className="lab">Interest</span> {i?.state === 'REQUESTED' ? `Pending check: asked ${dm(i.at)}. Pending isn’t a no.` : i?.state === 'CONFIRMED' ? `Interested (confirmed ${dm(i.at)}).` : i?.state === 'DECLINED' ? `Said no, thanks (${dm(i.at)}).` : 'Not asked yet.'}
        {!i && <button type="button" className="ds-btn quiet evr-inline" onClick={() => void runAction({ label: 'Ask', act: { t: 'do', op: 'evr.interest.draft', args: { personId: pid } } })}>Ask {f} (with your approval)</button>}
      </p>
    </section>
  );
}
