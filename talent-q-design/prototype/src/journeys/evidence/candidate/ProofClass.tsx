// The proof-class label, in the same words the recruiter sees (PROOF_WORD), with its meaning on demand (PROOF_MEANS).
// State is carried by shape and word, never by colour alone.
import { useState } from 'react';
import type { ProofClass } from '../../../state/domain';
import { CLASS_SHAPE, PROOF_MEANS, PROOF_WORD } from './logic';
import './candidate.css';

export function ClassShape({ k, size = 14 }: { k: ProofClass; size?: number }) {
  const s = CLASS_SHAPE[k];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flex: 'none' }}>
      {s === 'verified' && <><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="5" fill="currentColor" /></>}
      {s === 'full' && <circle cx="10" cy="10" r="6.5" fill="currentColor" />}
      {s === 'partial' && <><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 4 A6 6 0 0 0 10 16 Z" fill="currentColor" /></>}
      {s === 'unclear' && <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2.4" />}
      {s === 'disputed' && <><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5.5 14.5 14.5 5.5" stroke="currentColor" strokeWidth="1.6" /></>}
    </svg>
  );
}

/** A label that explains itself when pressed. `extra` adds the item's own state, e.g. "waiting for review". */
export function ProofClassTag({ k, extra, id }: { k: ProofClass; extra?: string; id: string }) {
  const [open, setOpen] = useState(false);
  const nid = `evc-pc-${id}`;
  return (
    <span className="evc-pc" data-c={k}>
      <button type="button" className="evc-pc-btn" aria-expanded={open} aria-controls={nid} onClick={() => setOpen(!open)} title="What this means">
        <ClassShape k={k} /><b>{PROOF_WORD[k]}</b>{extra ? <span className="evc-pc-extra">, {extra}</span> : null}<span className="evc-pc-q" aria-hidden="true">?</span>
        <span className="sr"> · what this means</span>
      </button>
      {open && <span id={nid} className="evc-pc-means" role="note">{PROOF_MEANS[k]}</span>}
    </span>
  );
}

export function ClassKey() {
  return (
    <dl className="evc-key">
      {(['CLAIM', 'SELF_REPORTED', 'ASSESSED', 'ISSUER_VERIFIED', 'DISPUTED'] as ProofClass[]).map((k) => (
        <div key={k}><dt><ClassShape k={k} />{PROOF_WORD[k]}</dt><dd>{PROOF_MEANS[k]}</dd></div>
      ))}
    </dl>
  );
}
