// A destructive action confirmed in place: the button turns into the question with "Yes" and "Keep it".
// Used instead of window.confirm(), which embedded viewers block (it returns false without asking).
import { useState } from 'react';

export function ConfirmButton({ label, question, yes, onConfirm, className = 'ds-btn quiet' }: { label: string; question: string; yes: string; onConfirm: () => void; className?: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className={className} onClick={() => setAsking(true)}>{label}</button>;
  return (
    <span role="group" aria-label={question} className="ds-confirm">
      <span className="t14">{question}</span>
      <button type="button" className="ds-btn" onClick={() => { setAsking(false); onConfirm(); }}>{yes}</button>
      <button type="button" className="ds-btn quiet" autoFocus onClick={() => setAsking(false)}>Keep it</button>
    </span>
  );
}
