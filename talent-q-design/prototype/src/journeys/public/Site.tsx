// The public site frame (SC-001…SC-006, SC-013): a paper page with one header, the "simulated" mark once,
// a footer, and the sample Q. Desktop: Q docks as a side panel from an "Ask Q" button. Phone: the header
// collapses to a Menu sheet, and "Ask Q" is a bottom bar that opens the conversation as a full-height sheet.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useRoute } from '../../ui/router';
import { QMark } from '../../ds/QMark';
import { useNarrow } from '../../ds/Workspace';
import { DUR, EASE } from '../../ds/motion';
import { SampleQ } from './SampleQ';
import { ask, useSampleQ } from './qsample';
import '../../ds/ds.css';
import './public.css';

export const NAV = [
  { to: '/site/how', label: 'How it works' },
  { to: '/site/employers', label: 'For employers' },
  { to: '/site/talent', label: 'For talent' },
  { to: '/site/pricing', label: 'Pricing' },
  { to: '/site/trust', label: 'Trust' },
];

function Brand() {
  return <Link to="/site" className="ps-brand" aria-label="Talent Q, home"><QMark size={30} /><span className="voice">Talent Q</span></Link>;
}

function useEscape(open: boolean, close: () => void) {
  useEffect(() => { if (!open) return; const on = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on); }, [open, close]);
}

/** A sheet that keeps focus inside while open and returns it to the trigger on close. */
function Sheet({ open, onClose, label, side, children, trigger }: { open: boolean; onClose: () => void; label: string; side: 'right' | 'full'; children: ReactNode; trigger: React.RefObject<HTMLButtonElement> }) {
  const box = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);
  const was = useRef(false);
  useEffect(() => {
    // Focus moves in on open and back to the trigger on close, never on first render (that stole page focus).
    if (open) { const f = box.current?.querySelector<HTMLElement>('input:not([disabled]), a[href], button:not(.ps-close)'); (f ?? box.current?.querySelector<HTMLElement>('button'))?.focus(); }
    else if (was.current) trigger.current?.focus({ preventScroll: true });
    was.current = open;
  }, [open, trigger]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="ps-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DUR.normal } }} exit={{ opacity: 0, transition: { duration: DUR.fast } }} />
          <motion.div ref={box} className="ps-sheet" data-side={side} role="dialog" aria-modal="true" aria-label={label}
            initial={side === 'right' ? { x: 24, opacity: 0 } : { y: 24, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1, transition: { duration: DUR.slow, ease: EASE.enter } }}
            exit={{ opacity: 0, transition: { duration: DUR.fast, ease: EASE.exit } }}
            onKeyDown={(e) => {
              if (e.key !== 'Tab' || !box.current) return;
              const els = [...box.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')];
              if (!els.length) return; const first = els[0], last = els[els.length - 1];
              if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }}>
            <button type="button" className="ps-close" onClick={onClose} aria-label={`Close ${label.toLowerCase()}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Site({ children, dock = true, audience }: { children: ReactNode; dock?: boolean; audience?: 'candidate' }) {
  const { path } = useRoute();
  const narrow = useNarrow(860);
  const [menu, setMenu] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const askBtn = useRef<HTMLButtonElement>(null);
  const { msgs } = useSampleQ();
  useEffect(() => { setMenu(false); setAskOpen(false); }, [path]);
  useEffect(() => { document.title = `Talent Q · ${NAV.find((n) => n.to === path)?.label ?? (path === '/sign-in' ? 'Sign in' : path === '/site/ask' ? 'Ask Q (sample)' : 'Evidence-first hiring')}`; }, [path]);
  const last = [...msgs].reverse().find((m) => m.who === 'q');
  return (
    <div className="ds ps" data-audience={audience}>
      <a className="ps-skip" href="#ps-main" onClick={(e) => { e.preventDefault(); document.getElementById('ps-main')?.focus(); }}>Skip to content</a>
      <header className="ps-header">
        <Brand />
        {narrow ? (
          <div className="ps-head-actions">
            <Link to="/sign-in" className="ds-btn quiet ps-signin">Sign in</Link>
            <button ref={menuBtn} type="button" className="ds-btn ps-menubtn" aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)}>Menu</button>
          </div>
        ) : (
          <>
            <nav className="ps-nav" aria-label="Main">{NAV.map((n) => <Link key={n.to} to={n.to} current={n.to === path}>{n.label}</Link>)}</nav>
            <div className="ps-head-actions">
              <Link to="/sign-in" className="ds-btn quiet" current={path === '/sign-in'}>Sign in</Link>
              <Link to="/signup" className="ds-btn primary">Get started</Link>
            </div>
          </>
        )}
      </header>
      <p className="ps-proto"><span className="ds-sim">Prototype</span> A design prototype. Every person, company and number here is fictional, and nothing is sent or charged.</p>
      <main id="ps-main" tabIndex={-1} className="ps-main">{children}</main>
      <footer className="ps-foot">
        <div className="ps-foot-in">
          <div className="ps-foot-brand"><Brand /><p className="t14 muted">Evidence-first hiring, with Q doing the work.</p></div>
          <nav aria-label="Footer"><ul>{NAV.map((n) => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}<li><Link to="/site/ask">Ask Q (sample)</Link></li></ul></nav>
          <nav aria-label="Account"><ul><li><Link to="/sign-in">Sign in</Link></li><li><Link to="/signup">Create an account</Link></li><li><Link to="/">Prototype start (demo people)</Link></li></ul></nav>
        </div>
      </footer>
      {dock && (narrow ? (
        <div className="ps-askbar">
          <button ref={askBtn} type="button" onClick={() => setAskOpen(true)} aria-haspopup="dialog" aria-expanded={askOpen}>
            <QMark size={24} /><span><b>Ask Q</b> <span className="muted">· sample</span></span>{last && <span className="peek">{last.text}</span>}
          </button>
        </div>
      ) : (
        <button ref={askBtn} type="button" className="ps-askpill" onClick={() => setAskOpen(true)} aria-haspopup="dialog" aria-expanded={askOpen}>
          <QMark size={24} /><span>Ask Q</span><span className="ds-sim">Sample</span>
        </button>
      ))}
      {dock && <Sheet open={askOpen} onClose={() => setAskOpen(false)} label="Ask Q, sample conversation" side={narrow ? 'full' : 'right'} trigger={askBtn}><SampleQ path={path} variant="dock" headingId="pq-dock-h" onNavigate={() => setAskOpen(false)} /></Sheet>}
      {narrow && (
        <Sheet open={menu} onClose={() => setMenu(false)} label="Menu" side="full" trigger={menuBtn}>
          <nav className="ps-menu" aria-label="Main">
            <ul>{[{ to: '/site', label: 'Home' }, ...NAV].map((n) => <li key={n.to}><Link to={n.to} current={n.to === path} onClick={() => setMenu(false)}>{n.label}</Link></li>)}</ul>
            <div className="ps-menu-acts"><Link to="/signup" className="ds-btn primary">Get started</Link><Link to="/sign-in" className="ds-btn">Sign in</Link></div>
          </nav>
        </Sheet>
      )}
    </div>
  );
}

/** Page head: kicker (context only), title (the subject), lede. */
export function PageHead({ kicker, title, lede, children }: { kicker: string; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <div className="ps-pagehead">
      <p className="lab">{kicker}</p>
      <h1 className="voice t46">{title}</h1>
      {lede && <p className="t19 ps-lede">{lede}</p>}
      {children}
    </div>
  );
}

/** "Ask Q about this": opens nothing new; it asks the sample Q and opens the dock (desktop) or sheet (phone). */
export function AskAbout({ q, label }: { q: string; label: string }) {
  return <button type="button" className="ps-askabout" onClick={() => { ask(q); document.querySelector<HTMLButtonElement>('.ps-askpill, .ps-askbar button')?.click(); }}><QMark size={18} />{label}</button>;
}
