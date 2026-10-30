// Small shared pieces for the ASSESS pages. Page buttons call the same model functions as Q's ops, inside one store
// update, and show the result inline (a refusal is explained beside the control, not only in Q's thread).
import { useState, type ReactNode } from 'react';
import { actorOf, update, useWorld, type World } from '../../mock/world';
import type { Actor } from '../../state/domain';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import type { Res } from './model';
import './assess.css';

export const useMe = () => useWorld((w) => actorOf(w));
/** Run a model function as the current person; returns its message so the page can show it next to the control. */
export function useRun(): [string | null, (fn: (w: World, a: Actor) => Res | void) => boolean, (m: string | null) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: (w: World, a: Actor) => Res | void) => {
    let r: Res | void = undefined;
    update((w) => { r = fn(w, actorOf(w)); });
    const res = r as Res | void;
    setMsg(res && !res.ok ? res.say : null);
    return !res || res.ok;
  };
  return [msg, run, setMsg];
}
export function Refusal({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="as-note" data-k="risk" role="alert"><Glyph k="unclear" size={16} /><span>{msg}</span></p>;
}
export function Stamp({ k = 'locked', children }: { k?: 'locked' | 'draft' | 'old'; children: ReactNode }) {
  return (
    <span className="as-stamp" data-k={k === 'locked' ? undefined : k}>
      {k === 'locked' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>}
      {children}
    </span>
  );
}
export function NotAvailable({ title = 'This isn’t available', why, back }: { title?: string; why: string; back: { to: string; label: string } }) {
  return (
    <Canvas title={title} kicker="Assessment" open onClose={() => history.back()}>
      <section className="ds-sheet as-empty" role="status"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>{why}</b><p className="t14 muted as-p"><Link to={back.to}>{back.label}</Link></p></div></section>
    </Canvas>
  );
}
export function Demo({ children, note }: { children: ReactNode; note: string }) {
  return (
    <section className="as-demo" aria-label="Demo controls">
      <span className="lab">Demo controls</span>
      <p className="t14 muted as-p">{note}</p>
      <div className="as-actions">{children}</div>
    </section>
  );
}
export function Meter({ rating, u, label }: { rating?: number; u?: 'LOW' | 'MEDIUM' | 'HIGH'; label: string }) {
  if (rating === undefined) return <span className="t14"><Glyph k="none" size={14} /> Unknown: not rated</span>;
  return (
    <span className="t14" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span className="as-meter" data-u={u} role="img" aria-label={`${label}: ${rating} of 4, ${u === 'HIGH' ? 'high' : u === 'LOW' ? 'low' : 'some'} uncertainty`}>
        {[1, 2, 3, 4].map((i) => <i key={i} data-on={i <= rating ? '1' : undefined} />)}
      </span>
      <span className="num">{rating} of 4</span>
    </span>
  );
}
export const UNC = { LOW: 'Low uncertainty', MEDIUM: 'Some uncertainty', HIGH: 'High uncertainty' } as const;
