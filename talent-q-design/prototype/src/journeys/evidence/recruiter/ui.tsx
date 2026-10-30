// Proof-class marks for recruiter surfaces. One shape per class (never shade alone), always with its word, and the
// class's meaning (PROOF_MEANS) available on demand, so Ada and the candidate read the same five words.
import { useId, useState } from 'react';
import type { ProofClass } from '../../../state/domain';
import { PROOF_MEANS, PROOF_WORD } from '../model';
import './evidence.css';

/** Issuer-verified: ring + core · Assessed: solid disc · Self-reported: open ring · Claim: dashed ring · Disputed: ring with a bar. */
export function ProofMark({ c, size = 14 }: { c: ProofClass; size?: number }) {
  return (
    <svg className="evr-mark" data-c={c} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flex: 'none' }}>
      {c === 'ISSUER_VERIFIED' && <><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="5" fill="currentColor" /></>}
      {c === 'ASSESSED' && <circle cx="10" cy="10" r="6.5" fill="currentColor" />}
      {c === 'SELF_REPORTED' && <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {c === 'CLAIM' && <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2.4" />}
      {c === 'DISPUTED' && <><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 15 L15 5" stroke="currentColor" strokeWidth="1.6" /></>}
    </svg>
  );
}
/** The mark and its word, e.g. "◉ Assessed". */
export function ProofTag({ c, small }: { c: ProofClass; small?: boolean }) {
  return <span className="evr-tag" data-c={c} data-small={small ? '1' : undefined}><ProofMark c={c} size={small ? 12 : 14} />{PROOF_WORD[c]}</span>;
}
/** A proof-class heading whose meaning opens in place (a disclosure, not a tooltip: works by keyboard and touch). */
export function ProofHeading({ c, n }: { c: ProofClass; n: number }) {
  const [open, setOpen] = useState(false); const id = useId();
  return (
    <div className="evr-ph">
      <h3 className="evr-ph-h"><ProofMark c={c} size={16} />{PROOF_WORD[c]} <span className="muted num">{n}</span></h3>
      <button type="button" className="evr-means-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? 'Hide what this means' : 'What this means'}</button>
      <p id={id} className="evr-means" hidden={!open}>{PROOF_MEANS[c]}</p>
    </div>
  );
}
/** The five classes with their meanings, for keys and help. */
export function ProofKey({ only }: { only?: ProofClass[] }) {
  const cs: ProofClass[] = only ?? ['CLAIM', 'SELF_REPORTED', 'ASSESSED', 'ISSUER_VERIFIED', 'DISPUTED'];
  return <ul className="evr-key" aria-label="How each item is known">{cs.map((c) => <li key={c}><ProofTag c={c} small /><span className="sr">: {PROOF_MEANS[c]}</span></li>)}</ul>;
}
