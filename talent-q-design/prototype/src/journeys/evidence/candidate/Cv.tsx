// The CV as the candidate wrote it, shown honestly as claims with a calm Q line (pack item D), and P6 "make my CV sound
// stronger": a clearer draft that restructures and rewords, shows the wording diff, marks what Q won't add, can link
// evidence the candidate permits, and changes nothing until the candidate approves it.
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { actorOf, useWorld, type World } from '../../../mock/world';
import { runAction } from '../../../q/core/engine';
import { registerRef } from '../../../q/refs';
import { arrive } from '../../../ds/motion';
import { QMark } from '../../../ds/QMark';
import { Link } from '../../../ui/router';
import { proof } from '../../../state/areas/proof';
import { proofReading } from '../model';
import { PROOF_WORD, canDraftCv, cvOffer, dayMonth, evcRead, orgNm, proofClass, type CvDraft } from './logic';
import { ClassShape, ProofClassTag } from './ProofClass';
import './candidate.css';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

/** Q's reading of the CV next to the evidence: constructive, never "untrue", never praise for weak writing. */
export function cvLine(w: World, pid: string): string {
  const r = proofReading(w, pid);
  if (r.shape === 'CLAIMS_AHEAD_OF_PROOF') return `Your CV names ${r.cvNames} of the ${r.rows.length} things Kora Pay is looking for. Every CV line is read as a claim, for everyone, and that isn’t doubt about yours. A reviewed piece of work next to a claim is what turns it into evidence.`;
  if (r.shape === 'SHOWS_MORE_THAN_CV') return 'Your CV is short and leaves out some of what you’ve shown. That’s fine: employers you share with see your reviewed work next to it, and Q can help the wording if you want.';
  return 'Employers read a CV as your own account. Your Passport items sit next to it and show the work.';
}

type Tok = { t: string; k: 'same' | 'del' | 'add' };
/** Word-level diff (LCS) so the candidate sees exactly which words changed. */
function diff(a: string, b: string): Tok[] {
  const A = a.split(/(\s+)/).filter((x) => x.trim()); const B = b.split(/(\s+)/).filter((x) => x.trim());
  const L = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Tok[] = []; let i = 0, j = 0;
  while (i < A.length && j < B.length) { if (A[i] === B[j]) { out.push({ t: A[i], k: 'same' }); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: A[i++], k: 'del' }); else out.push({ t: B[j++], k: 'add' }); }
  while (i < A.length) out.push({ t: A[i++], k: 'del' });
  while (j < B.length) out.push({ t: B[j++], k: 'add' });
  return out;
}
const CHANGE: Record<string, string> = { SAME: 'Unchanged', REWORDED: 'Reworded', SPLIT: 'Split into lines', REORDERED: 'Reordered' };

export function CvSection({ pid }: { pid: string }) {
  const w = useWorld((x) => x);
  const cv = proof(w).cvs[pid];
  const claim = w.evidence.find((e) => e.ownerId === pid && e.kind === 'CLAIM' && /^CV/.test(e.title));
  const draft = evcRead(w).drafts[pid];
  if (!cv) return null;
  return (
    <section className="ds-sheet evc-cv" aria-labelledby="evc-cv-h">
      <div className="evc-row"><h2 id="evc-cv-h" className="tb-h2">Your CV, as you wrote it</h2><ProofClassTag id="cv" k={claim ? proofClass(w, claim) : 'CLAIM'} /></div>
      <div className="evc-qline"><QMark mood="idle" size={20} /><p>{cvLine(w, pid)}</p></div>
      <ol className="evc-cvdoc" aria-label="Your CV">{cv.lines.map((l, i) => <li key={i}>{l}</li>)}</ol>
      <p className="t14 muted" style={{ margin: 0 }}>Uploaded {dayMonth(cv.uploadedAt)}{claim ? ` · ${claim.sharedWith.filter((o) => !claim.revokedFrom?.includes(o)).map((o) => orgNm(w, o)).join(', ') || 'only you'} can see it` : ''}.</p>
      {canDraftCv(w, pid) && !draft && <div className="evc-acts"><button type="button" className="ds-btn" onClick={() => act('evc.cv.draft')}>Make my CV clearer</button><span className="t14 muted">Q rewords and reorganises. It never adds jobs, qualifications or skills.</span></div>}
      {draft && <CvDraftView d={draft} />}
    </section>
  );
}

export function CvDraftView({ d, compact }: { d: CvDraft; compact?: boolean }) {
  const w = useWorld((x) => x);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!compact && location.hash.includes('cv=draft')) ref.current?.scrollIntoView({ block: 'start' }); }, [compact]);
  const offers = cvOffer(d.personId).map((id) => w.evidence.find((e) => e.evidenceId === id)).filter((e): e is NonNullable<typeof e> => !!e && e.ownerId === d.personId);
  const approved = d.state === 'APPROVED';
  return (
    <motion.div {...arrive} ref={ref} className="evc-draft" data-state={d.state} aria-labelledby="evc-draft-h" role="region">
      <div className="evc-row"><h3 id="evc-draft-h" className="evc-h3">{approved ? 'Your approved CV' : 'A clearer draft, for you to approve'}</h3><span className="ds-tag" data-k={approved ? 'ok' : 'busy'}>{approved ? `Approved ${dayMonth(d.approvedAt ?? d.at)}` : 'Draft · not saved'}</span></div>
      {!compact && <p className="t14 muted" style={{ margin: 0 }}><span className="evc-del">struck through</span> are words Q took out; <span className="evc-add">marked</span> are Q’s words. Facts, numbers and names are yours.</p>}
      <ol className="evc-diff">
        {d.lines.map((l, i) => (
          <li key={i}>
            <p className="evc-diffline">{diff(l.before, l.after.join(' ')).map((t, k) => <span key={k} className={t.k === 'del' ? 'evc-del' : t.k === 'add' ? 'evc-add' : undefined}>{t.k === 'del' ? <span className="sr">removed: </span> : t.k === 'add' ? <span className="sr">added: </span> : null}{t.t} </span>)}</p>
            {!compact && <p className="evc-diffmeta t14"><b>{CHANGE[l.change]}</b>{l.after.length > 1 ? ` · ${l.after.length} lines` : ''}{l.from ? ` · from ${l.from.toLowerCase()}` : ''}{l.note ? ` · ${l.note}` : ''}</p>}
          </li>
        ))}
      </ol>
      {!compact && (
        <>
          <div className="evc-wont">
            <h4 className="lab">Q won’t add</h4>
            <ul>{d.wontAdd.map((x, i) => <li key={i}><span aria-hidden="true">✕</span><span>{x}</span></li>)}</ul>
            <p className="t14 muted" style={{ margin: 0 }}>{d.added.length ? `Check before approving: ${d.added.join(', ')}` : 'Checked: every name, number and skill in the draft is already in your CV, profile or Passport.'}</p>
          </div>
          {offers.length > 0 && (
            <div className="evc-links">
              <h4 className="lab">Link evidence (only if you want)</h4>
              <div className="evc-opts" role="group" aria-label="Evidence to link from your CV">
                {offers.map((e) => <button key={e.evidenceId} type="button" className="ds-opt" disabled={approved} aria-pressed={d.links.includes(e.evidenceId)} onClick={() => act('evc.cv.link', { id: e.evidenceId })}><span><b>{e.title}</b><span className="t14 muted evc-optsub"><ClassShape k={proofClass(w, e)} /> {PROOF_WORD[proofClass(w, e)]} · {d.links.includes(e.evidenceId) ? 'Linked, with its label' : 'Not linked'}</span></span></button>)}
              </div>
              <p className="t14 muted" style={{ margin: 0 }}>A link carries its label, so a reader sees “{proofClass(w, offers[0]) === 'ASSESSED' ? 'Assessed' : 'Self-reported'}” next to it. Linking doesn’t share anything new: each employer still sees only what you’ve shared with them.</p>
            </div>
          )}
          <div className="evc-acts">
            {!approved ? <>
              <button type="button" className="ds-btn primary" onClick={() => act('evc.cv.approve')}>Approve this version</button>
              <button type="button" className="ds-btn quiet" onClick={() => act('evc.cv.discard')}>Keep my original</button>
            </> : <p className="t14" style={{ margin: 0 }}>Saved as your CV. Employers who already have your old CV keep that version; Q won’t send this one anywhere without asking you.</p>}
          </div>
        </>
      )}
    </motion.div>
  );
}

registerRef('evc.cv', ({ id }) => {
  const d = useWorld((w) => evcRead(w).drafts[id]);
  const me = useWorld((w) => actorOf(w).personId);
  if (!d || me !== id) return null;
  return <div className="tb-ref"><CvDraftView d={d} compact /><Link to="/c/passport?cv=draft" className="t14" style={{ color: 'inherit' }}>Review and approve in your Passport</Link></div>;
});
