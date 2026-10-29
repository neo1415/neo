// The Direction D workspace: an ink THREAD where Q works, a resizable separator, and a paper CANVAS
// where Q builds artifacts. Desktop: drag or use arrow keys on the separator; collapse the thread to a
// strip that still shows Q's state. Phones: the thread is the page and the canvas opens as a sheet.
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { QMark, moodOf, presenceLine, type QAgent, type QMood } from './QMark';

export function useNarrow(px = 860) {
  const q = `(max-width: ${px}px)`;
  const [narrow, set] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const on = () => set(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, [q]);
  return narrow;
}
const read = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

type ThreadMode = 'open' | 'collapsed';
const SplitCtx = createContext<{ mode: ThreadMode; setMode: (m: ThreadMode) => void; handle?: ReactNode }>({ mode: 'open', setMode: () => {} });
export const useSplit = () => useContext(SplitCtx);

/** Thread | separator | canvas. Width and collapse state persist per user (localStorage, convenience only). */
export function Split({ thread, canvas, id = 'main', defaultMode = 'open' }: { thread: ReactNode; canvas: ReactNode; id?: string; defaultMode?: ThreadMode }) {
  const [w, setW] = useState(() => Number(read(`tq.split.${id}.w`, '380')) || 380);
  const [mode, setModeRaw] = useState<ThreadMode>(() => (read(`tq.split.${id}.mode`, defaultMode) as ThreadMode));
  const [drag, setDrag] = useState(false);
  const setMode = (m: ThreadMode) => { setModeRaw(m); write(`tq.split.${id}.mode`, m); };
  const clamp = (v: number) => Math.round(Math.min(Math.max(v, 300), Math.min(640, window.innerWidth * 0.55)));
  const commit = (v: number) => { const c = clamp(v); setW(c); write(`tq.split.${id}.w`, String(c)); };
  const host = useRef<HTMLDivElement>(null);
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault(); setDrag(true);
    const left = host.current?.getBoundingClientRect().left ?? 0;
    const move = (ev: PointerEvent) => commit(ev.clientX - left);
    const up = () => { setDrag(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  return (
    // The resize handle is rendered by the Thread, inside its landmark, so every control belongs to a region.
    <SplitCtx.Provider value={{ mode, setMode, handle: (
      <button type="button" className="ds-sep" role="separator" aria-orientation="vertical" aria-label="Resize conversation" aria-valuemin={300} aria-valuemax={640} aria-valuenow={w}
        data-drag={drag ? '1' : undefined} onPointerDown={onDown} onDoubleClick={() => commit(380)}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') commit(w - 24); if (e.key === 'ArrowRight') commit(w + 24); if (e.key === 'Home') commit(300); if (e.key === 'End') commit(640); }} />
    ) }}>
      <div ref={host} className="ds-split" data-thread={mode} style={{ ['--thread-w' as string]: `${w}px` }}>
        {thread}
        {canvas}
      </div>
    </SplitCtx.Provider>
  );
}

// ---------------- Thread ----------------
export interface Chip { label: string; go?: boolean; on: () => void }
export interface Entry {
  id: string; who: 'me' | 'q';
  text?: string;
  /** Authorised context Q recalled for this reply (memories, policies, files). Always shown, never hidden. */
  used?: string[];
  plan?: QAgent[];
  why?: string;
  extra?: ReactNode;
  chips?: Chip[];
  live?: boolean;
}

export function Thread({ title, entries, onSend, agents = [], mood, detail, placeholder, head, busy, composer, typing }: {
  title: string; entries: Entry[]; onSend: (t: string) => void; agents?: QAgent[]; mood?: QMood; detail?: string; placeholder: string; head?: ReactNode; busy?: boolean;
  /** Replaces the default text composer (e.g. the multimodal composer with voice, SC-118). */ composer?: ReactNode; typing?: boolean;
}) {
  const { mode, setMode, handle } = useSplit();
  const narrow = useNarrow();
  const [text, setText] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const last = entries[entries.length - 1];
  const m = mood ?? moodOf({ agents });
  const working = busy ?? agents.some((a) => a.done < a.total && !a.failed);
  // Desktop: the log scrolls inside the thread. Phone: the page scrolls, so bring the newest message and its choices into view.
  useEffect(() => { const el = log.current; if (!el) return; if (narrow) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); else el.scrollTop = el.scrollHeight; }, [entries.length, last?.text, last?.chips?.length, last?.plan?.map((a) => a.done).join(), narrow]);
  if (mode === 'collapsed' && !narrow) {
    return (
      <button type="button" className="ds-strip" onClick={() => setMode('open')} aria-label={`Open the conversation with Q. Q: ${presenceLine(m, agents, detail)}`}>
        <QMark mood={m} agents={agents} size={32} />
        <span>Q · {presenceLine(m, agents, detail)}</span>
      </button>
    );
  }
  const Tag = narrow ? 'main' : 'aside';
  return (
    <Tag className="ds-thread ink" aria-label={`Conversation with Q · ${title}`}>
      {narrow && <h1 className="sr">{title} · conversation with Q</h1>}
      <div className="ds-thread-head">
        <QMark mood={m} agents={agents} size={44} />
        <div className="state" aria-live="polite"><b>Q</b><span><span className="sr">Q status: </span>{presenceLine(m, agents, detail)}</span></div>
        {head}
        {!narrow && <button type="button" className="ds-iconbtn" aria-label="Collapse the conversation" onClick={() => setMode('collapsed')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>}
      </div>
      <div className="ds-log" ref={log} role="log" aria-label="Messages">
        {entries.map((e, i) => <EntryView key={e.id} e={e} latest={i === entries.length - 1} />)}
        {typing && <p className="muted t14" aria-live="polite" style={{ margin: 0 }}>Q is replying…</p>}
      </div>
      {composer ? <div style={{ margin: '12px 16px 16px' }}>{composer}</div> : <form className="ds-compose" onSubmit={(ev) => { ev.preventDefault(); if (!text.trim() || working) return; onSend(text.trim()); setText(''); }}>
        <label htmlFor={`ask-${title}`} className="sr">Message Q</label>
        <input id={`ask-${title}`} value={text} onChange={(e) => setText(e.target.value)} placeholder={working ? 'Q is working. You can still read and switch views.' : placeholder} autoComplete="off" />
        <button className={`ds-send ${text.trim() ? 'go' : ''}`} type="submit" aria-label="Send" disabled={working}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>}
      {!narrow && handle}
    </Tag>
  );
}

function EntryView({ e, latest }: { e: Entry; latest: boolean }) {
  if (e.who === 'me') return <motion.p className="ds-me" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{e.text}</motion.p>;
  return (
    <motion.div className="ds-q" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
      {e.used && e.used.length > 0 && <div className="ds-used" aria-label="Context Q used"><span className="sr">Q used: </span>{e.used.map((u) => <span key={u}>{u}</span>)}</div>}
      {e.plan && (e.live || latest) && e.plan.length > 0 && (
        <div className="ds-plan" aria-label="What Q is doing">
          {e.plan.map((a) => (
            <div key={a.label} className="ds-agent" data-s={a.failed ? 'fail' : a.done >= a.total ? 'done' : a.done > 0 ? 'run' : 'wait'}>
              <i aria-hidden="true" /><span>{a.label}{a.failed ? ' · unavailable' : ''}</span><span className="c num">{a.done}/{a.total}</span>
            </div>
          ))}
        </div>
      )}
      {e.text && <p className="say">{e.text}</p>}
      {e.why && <span className="ds-why"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="var(--gold-light)" /></svg>{e.why}</span>}
      {e.extra}
      {latest && e.chips && e.chips.length > 0 && (
        <div className="ds-next" role="group" aria-label="Suggested next steps">
          {e.chips.map((c) => <button key={c.label} type="button" className={`ds-chip ${c.go ? 'go' : ''}`} onClick={c.on}>{c.label}</button>)}
        </div>
      )}
    </motion.div>
  );
}

// ---------------- Canvas ----------------
export interface ViewDef<V extends string> { id: V; label: string; ready?: boolean }
export interface Version<V extends string> { v: number; label: string; view: V }

export function Canvas<V extends string>({ title, kicker, views, view, setView, versions = [], onVersion, building, open, onClose, children, qLine, aside }: {
  title: string; kicker: ReactNode; views?: ViewDef<V>[]; view?: V; setView?: (v: V) => void; versions?: Version<V>[]; onVersion?: (v: Version<V>) => void;
  building?: boolean; open: boolean; onClose: () => void; children: ReactNode; qLine?: string; aside?: ReactNode;
}) {
  const narrow = useNarrow();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (narrow && open) ref.current?.focus(); }, [narrow, open]);
  if (narrow && !open) return null;
  const latest = versions[versions.length - 1];
  const Tag = narrow ? 'section' : 'main';
  return (
    <Tag ref={ref} tabIndex={-1} className={`ds-canvas ${narrow ? 'as-sheet' : ''}`} aria-label={`${title}, artifact`} role={narrow ? 'dialog' : undefined} aria-modal={narrow ? true : undefined}
      onKeyDown={(e) => { if (narrow && e.key === 'Escape') onClose(); }} style={{ outline: 'none' }}>
      {narrow && (
        <div className="ds-sheetbar ink">
          <button type="button" className="ds-send" onClick={onClose} aria-label="Back to the conversation with Q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg></button>
          <p className="ds-qline" aria-live="polite">{qLine ?? 'Q'}</p>
        </div>
      )}
      <header className="ds-canvas-head">
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span className="lab" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {kicker}{latest && <span className="num">· v{latest.v}{building ? ' · updating' : ''}</span>}
            <span className="ds-sim">Simulated</span>
          </span>
          <h1 className="voice t30" style={{ margin: 0 }}>{title}</h1>
        </div>
        {aside}
      </header>
      {(views && views.length > 1) || versions.length > 1 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {views && views.length > 1 && (
            <div className="ds-views" role="group" aria-label="Views of this artifact">
              {views.map((v) => <button key={v.id} type="button" aria-pressed={view === v.id} disabled={v.ready === false} onClick={() => setView?.(v.id)}>{v.label}</button>)}
            </div>
          )}
          {versions.length > 1 && (
            <div className="ds-versions" role="group" aria-label="Versions Q built">
              {versions.map((x) => <button key={x.v} type="button" aria-pressed={x.view === view} onClick={() => onVersion?.(x)}>v{x.v} {x.label}</button>)}
            </div>
          )}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

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

export function useTimers() {
  const t = useRef<number[]>([]);
  useEffect(() => () => t.current.forEach(clearTimeout), []);
  return (ms: number, f: () => void) => { t.current.push(window.setTimeout(f, ms)); };
}
