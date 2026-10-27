// Direction D · The Living Intelligence Workspace.
// One system: an ink THREAD where Q thinks and speaks, and a paper CANVAS where Q builds the artifact
// the task needs. Q moves only when work happens: each agent is a point travelling the bowl of the
// Q mark, advanced by finished units of work, and still when nothing runs.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link } from '../../ui/router';
import { useNarrow } from '../shared/hooks';
import type { CState } from './data';
import './d.css';


export interface Agent { label: string; done: number; total: number }

/** The Q mark: an open bowl (the letter's body) with a tail. Agents sit on the bowl at done/total.
    Idle = still. No breathing, no glow loop: motion is reserved for finished work. */
export function QMark({ agents = [], size = 36, settled = false }: { agents?: Agent[]; size?: number; settled?: boolean }) {
  const running = agents.some((a) => a.done < a.total);
  const R = 13;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ flex: 'none', overflow: 'visible' }}>
      <path d="M 29.2 29.2 A 13 13 0 1 1 33 20" fill="none" stroke="var(--gold-light)" strokeWidth="2" strokeLinecap="round" opacity={running ? 0.55 : 1} />
      <path d="M 27 27 L 34 34" stroke="var(--gold-light)" strokeWidth="2.4" strokeLinecap="round" />
      <motion.circle cx="20" cy="20" fill="var(--gold-light)" initial={false} animate={{ r: settled ? 6.5 : running ? 4 : 5 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
      {running && agents.map((a, i) => {
        const deg = -90 + i * 37 + (a.done / a.total) * 300;
        const done = a.done >= a.total;
        return (
          <g key={i} style={{ transform: `rotate(${deg}deg)`, transformOrigin: '20px 20px', transition: 'transform 380ms cubic-bezier(.2,.7,.2,1)' }}>
            <circle cx={20 + R} cy="20" r={done ? 1.8 : 2.6} fill={done ? 'var(--moon-2)' : 'var(--gold-light)'} />
          </g>
        );
      })}
    </svg>
  );
}

export function qStatus(agents: Agent[], waiting?: boolean) {
  const live = agents.filter((a) => a.done < a.total).length;
  if (live) return `Working · ${live} ${live === 1 ? 'agent' : 'agents'}`;
  return waiting ? 'Waiting for you' : 'Ready';
}

/** One evidence-strength vocabulary for hiring and careers. Strength is carried by SHAPE, never by shade. */
export type GlyphKind = CState;
export const GLYPH_LABEL: Record<GlyphKind, string> = { verified: 'Verified', full: 'Evidenced', partial: 'Partial or outdated', practice: 'Practising (private)', none: 'Not shown yet', unclear: 'Unclear' };
export function Glyph({ k, size = 20, title }: { k: GlyphKind; size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={{ flex: 'none' }}>
      {k === 'verified' && <><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="5" fill="currentColor" /></>}
      {k === 'full' && <circle cx="10" cy="10" r="6.5" fill="currentColor" />}
      {k === 'partial' && <><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 4 A6 6 0 0 0 10 16 Z" fill="currentColor" /></>}
      {k === 'none' && <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {k === 'unclear' && <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2.4" />}
      {k === 'practice' && <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="0.1 3" strokeLinecap="round" />}
    </svg>
  );
}
export function GlyphKey({ kinds }: { kinds: GlyphKind[] }) {
  return (
    <ul aria-label="Key" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', listStyle: 'none', margin: 0, padding: 0 }}>
      {kinds.map((k) => <li key={k} className="t14" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}><Glyph k={k} size={16} />{GLYPH_LABEL[k]}</li>)}
    </ul>
  );
}

// ---------------- Thread ----------------
export interface Chip { label: string; go?: boolean; on: () => void }
export interface Entry { id: string; who: 'me' | 'q'; text?: string; plan?: Agent[]; why?: string; preview?: ReactNode; chips?: Chip[]; live?: boolean }

export function Thread({ title, entries, onSend, agents, waiting, nav, placeholder, settled }: { title: string; entries: Entry[]; onSend: (t: string) => void; agents: Agent[]; waiting?: boolean; nav: 'hire' | 'career'; placeholder: string; settled?: boolean }) {
  const [text, setText] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const last = entries[entries.length - 1];
  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [entries.length, last?.text, last?.plan?.map((a) => a.done).join()]);
  const busy = agents.some((a) => a.done < a.total);
  const narrow = useNarrow(860);
  // On a phone the thread IS the page, so it is the main landmark; on desktop the canvas is.
  const Tag = narrow ? 'main' : 'aside';
  return (
    <Tag className="dd-thread ink" aria-label={`Conversation with Q · ${title}`}>
      {narrow && <h1 className="sr">{title} · conversation with Q</h1>}
      <div className="dd-thread-head">
        <Link to="/x/d" className="dd-brand" aria-label="Talent Q, direction D overview"><QMark agents={agents} settled={settled} />Talent Q</Link>
        <nav className="dd-nav" aria-label="Workspace">
          <Link to="/x/d/home" current={nav === 'hire'}>Hiring</Link>
          <Link to="/x/d/career" current={nav === 'career'}>Career</Link>
        </nav>
      </div>
      <p className="lab" style={{ margin: 0, padding: '12px 20px 0' }} aria-live="polite"><span className="sr">Q status: </span>{qStatus(agents, waiting)}</p>
      <div className="dd-log" ref={log} role="log" aria-label="Messages">
        {entries.map((e, i) => <EntryView key={e.id} e={e} latest={i === entries.length - 1} />)}
      </div>
      <form className="dd-compose" onSubmit={(ev) => { ev.preventDefault(); if (!text.trim() || busy) return; onSend(text.trim()); setText(''); }}>
        <label htmlFor="dd-ask" className="sr">Message Q</label>
        <input id="dd-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder={busy ? 'Q is working. You can still read and switch views.' : placeholder} autoComplete="off" />
        <button className={`dd-ib ${text.trim() ? 'go' : ''}`} type="submit" aria-label="Send" disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
    </Tag>
  );
}

function EntryView({ e, latest }: { e: Entry; latest: boolean }) {
  if (e.who === 'me') return <motion.p className="dd-me" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{e.text}</motion.p>;
  return (
    <motion.div className="dd-q" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
      {e.plan && (e.live || latest) && e.plan.length > 0 && (
        <div className="dd-plan" aria-label="What Q is doing">
          {e.plan.map((a) => (
            <div key={a.label} className="dd-agent" data-s={a.done >= a.total ? 'done' : a.done > 0 ? 'run' : 'wait'}>
              <i aria-hidden="true" /><span>{a.label}</span><span className="c num">{a.done}/{a.total}</span>
            </div>
          ))}
        </div>
      )}
      {e.text && <p className="say">{e.text}</p>}
      {e.why && <span className="dd-why"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="var(--gold-light)" /></svg>{e.why}</span>}
      {e.preview}
      {latest && e.chips && e.chips.length > 0 && (
        <div className="dd-next" role="group" aria-label="Suggested next steps">
          {e.chips.map((c) => <button key={c.label} type="button" className={`dd-chip ${c.go ? 'go' : ''}`} onClick={c.on}>{c.label}</button>)}
        </div>
      )}
    </motion.div>
  );
}

// ---------------- Canvas ----------------
export interface ViewDef<V extends string> { id: V; label: string; ready: boolean }
export interface Version<V extends string> { v: number; label: string; view: V }

export function Canvas<V extends string>({ title, kicker, views, view, setView, versions, onVersion, building, open, onClose, children, actions, qLine }: {
  title: string; kicker: string; views: ViewDef<V>[]; view: V; setView: (v: V) => void; versions: Version<V>[]; onVersion: (v: Version<V>) => void;
  building?: boolean; open: boolean; onClose: () => void; children: ReactNode; actions?: ReactNode; qLine?: string;
}) {
  const narrow = useNarrow(860);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (narrow && open) ref.current?.focus(); }, [narrow, open]);
  if (narrow && !open) return null;
  const latest = versions[versions.length - 1];
  const Tag = narrow ? 'section' : 'main';
  return (
    <Tag ref={ref} tabIndex={-1} className={`dd-canvas ${narrow ? 'as-sheet' : ''}`} aria-label={`${title}, artifact`} role={narrow ? 'dialog' : undefined} aria-modal={narrow ? true : undefined}
      onKeyDown={(e) => { if (narrow && e.key === 'Escape') onClose(); }} style={{ outline: 'none' }}>
      {narrow && (
        <div className="dd-sheetbar ink">
          <button type="button" className="dd-ib" onClick={onClose} aria-label="Back to the conversation with Q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg></button>
          <p className="dd-qline" aria-live="polite">{qLine ?? 'Q'}</p>
        </div>
      )}
      <header className="dd-canvas-head">
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span className="lab" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {kicker}{latest && <span className="num">· v{latest.v}{building ? ' · updating' : ''}</span>}
            <span className="dd-sim">Simulated</span>
          </span>
          <h1 className="voice t30" style={{ margin: 0 }}>{title}</h1>
        </div>
      </header>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="dd-views" role="group" aria-label="Views of this artifact">
          {views.map((v) => <button key={v.id} type="button" aria-pressed={view === v.id} disabled={!v.ready} onClick={() => setView(v.id)}>{v.label}</button>)}
        </div>
        {versions.length > 1 && (
          <div className="dd-versions" role="group" aria-label="Versions Q built">
            {versions.map((x) => <button key={x.v} type="button" aria-pressed={x.view === view} onClick={() => onVersion(x)} title={`Version ${x.v}: ${x.label}`}>v{x.v} {x.label}</button>)}
          </div>
        )}
      </div>
      {children}
      {actions && <div className="dd-actions">{actions}</div>}
    </Tag>
  );
}

export function Workspace({ thread, canvas }: { thread: ReactNode; canvas: ReactNode }) {
  return <div className="dd dd-frame">{thread}{canvas}</div>;
}

/** Width of an element, for SVGs whose viewBox must match rendered width (keeps labels at real size). */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    setW(el.clientWidth || fallback);
    const ro = new ResizeObserver(() => setW(el.clientWidth || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, w] as const;
}

/** Timers that are cleared on unmount. */
export function useTimers() {
  const t = useRef<number[]>([]);
  useEffect(() => () => t.current.forEach(clearTimeout), []);
  return (ms: number, f: () => void) => { t.current.push(window.setTimeout(f, ms)); };
}
