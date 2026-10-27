// Talent Q component kit. Each component's spec (purpose, variants, states, a11y) is in
// talent-q-design/components/COMPONENTS.md. Variants are capped at five.
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type InputHTMLAttributes } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EVIDENCE_LABELS, STAGE_LABELS, type ContextUse, type EvidenceState, type RunStep } from '@contracts';
import { EvidenceMark, IAlert, ICheck, IInfo, IMic, ISend, IX } from './icons';

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';
export function Button({ variant = 'secondary', compact, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; compact?: boolean }) {
  return <button type="button" className={`btn btn-${variant} ${compact ? 'btn-compact' : ''} ${className}`} {...p} />;
}
export function IconButton({ label, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" className="btn btn-icon" aria-label={label} title={label} {...p}>{children}</button>;
}

// ---------- Labels ----------
export const Sim = ({ children = 'Simulated' }: { children?: ReactNode }) => <span className="sim">{children}</span>;
export const Label = ({ children, as: As = 'span', id }: { children: ReactNode; as?: 'span' | 'h2' | 'h3' | 'p'; id?: string }) => <As className="t-label" id={id}>{children}</As>;

export function EvidenceBadge({ state }: { state: EvidenceState }) {
  return <span className="ev" data-state={state}><EvidenceMark state={state} />{EVIDENCE_LABELS[state]}</span>;
}

export function Banner({ tone = 'info', title, children, action }: { tone?: 'info' | 'warn' | 'risk' | 'ok'; title: string; children?: ReactNode; action?: ReactNode }) {
  const Mark = tone === 'ok' ? ICheck : tone === 'info' ? IInfo : IAlert;
  return (
    <div className="banner" data-tone={tone} role={tone === 'risk' ? 'alert' : 'status'}>
      <Mark className="banner-mark" />
      <div className="stack gap-1 grow"><strong style={{ fontWeight: 600 }}>{title}</strong>{children && <div className="muted">{children}</div>}</div>
      {action}
    </div>
  );
}

// ---------- Form fields ----------
export function Field({ label, help, error, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: string; error?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={help || error ? `${id}-d` : undefined} {...p} />
      {(error || help) && <span id={`${id}-d`} className={error ? 'field-error' : 'field-help'}>{error || help}</span>}
    </div>
  );
}
export function TextArea({ label, help, value, onChange, rows = 4 }: { label: string; help?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <textarea id={id} className="textarea" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={help ? `${id}-d` : undefined} />
      {help && <span id={`${id}-d`} className="field-help">{help}</span>}
    </div>
  );
}
export function Switch({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="stack"><span>{label}</span>{help && <span className="t-caption">{help}</span>}</span>
    </label>
  );
}
export function Choice({ name, value, checked, onChange, title, detail }: { name: string; value: string; checked: boolean; onChange: (v: string) => void; title: string; detail?: ReactNode }) {
  return (
    <label className="choice">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      <span className="stack gap-1"><span style={{ fontWeight: 500 }}>{title}</span>{detail && <span className="t-caption">{detail}</span>}</span>
    </label>
  );
}
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

// ---------- Run steps (agent progress) ----------
export function RunSteps({ steps }: { steps: RunStep[] }) {
  if (!steps.length) return null;
  return (
    <ol className="steps" aria-label="What Q is doing">
      {steps.map((s) => {
        const pct = s.total ? s.done / s.total : s.result === 'DONE' ? 1 : 0;
        return (
          <li key={s.stepId} className="step" data-result={s.result}>
            <StepMark result={s.result} />
            <span>{s.label}<span className="sr-only">, {s.result.toLowerCase()}</span></span>
            <span className="step-count">{s.total ? `${s.done} of ${s.total}` : s.result === 'DONE' ? 'done' : s.result === 'FAILED' ? 'failed' : s.result === 'HELD' ? 'held' : ''}</span>
            {s.total && s.result !== 'DONE' ? <span className="step-bar" aria-hidden="true"><span style={{ transform: `scaleX(${pct})` }} /></span> : null}
            {s.failure && <span className="step-note">{s.failure.message}{s.failure.recoverable ? ' Q carried on without it.' : ''}</span>}
          </li>
        );
      })}
    </ol>
  );
}
function StepMark({ result }: { result: RunStep['result'] }) {
  const reduce = useReducedMotion();
  if (result === 'DONE') return <ICheck className="step-mark" />;
  if (result === 'FAILED') return <IX className="step-mark" />;
  if (result === 'HELD') return <IAlert className="step-mark" />;
  return (
    <svg className="step-mark" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7" fill="none" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <motion.circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="11 44" strokeLinecap="round"
        animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '10px 10px' }} />
    </svg>
  );
}

export function StageLine({ stage }: { stage: keyof typeof STAGE_LABELS | null }) {
  return <p className="t-label" aria-live="polite">{stage ? STAGE_LABELS[stage] : ' '}</p>;
}

// ---------- Conversation ----------
export function QSays({ text, used, live }: { text: string; used?: ContextUse[]; live?: boolean }) {
  return (
    <div className="msg-q">
      <div className="stack">
        <p className="t-voice" aria-live={live ? 'polite' : undefined}>{text}</p>
        {used && used.length > 0 && <UsedContext used={used} />}
      </div>
    </div>
  );
}
export function UsedContext({ used }: { used: ContextUse[] }) {
  const names: Record<ContextUse['kind'], string> = { CURRENT_PROMPT: 'From you', AUTHORIZED_FACT: 'Fact', KNOWLEDGE_SOURCE: 'Source', INFERENCE: 'Inferred', MEMORY: 'Remembered', POLICY: 'Policy' };
  return (
    <ul className="used" aria-label="What Q used">
      {used.map((u, i) => <li key={i} className="tag"><span className="t-mono" style={{ fontSize: 12 }}>{names[u.kind]}</span>{u.label}</li>)}
    </ul>
  );
}
export const MeSays = ({ text }: { text: string }) => <p className="msg-me">{text}</p>;

// ---------- Composer (text and voice are equal; voice is never the only path) ----------
type Rec = { start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; interimResults: boolean; lang: string };
export function Composer({ onSend, placeholder = 'Ask Q, or tell it what to do', suggestion, disabled, label = 'Message Q' }: { onSend: (text: string) => void; placeholder?: string; suggestion?: string; disabled?: boolean; label?: string }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const recRef = useRef<Rec | null>(null);
  const id = useId();

  const send = () => { const t = text.trim(); if (!t) return; onSend(t); setText(''); };

  const startVoice = () => {
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    setListening(true);
    if (Ctor && !navigator.webdriver) {
      const rec = new Ctor();
      rec.interimResults = true; rec.lang = 'en-NG';
      rec.onresult = (e) => setText(Array.from(e.results).map((r) => r[0].transcript).join(' '));
      rec.onend = () => setListening(false);
      recRef.current = rec; rec.start();
      return;
    }
    // No speech engine (or automated capture): simulate the transcription of the suggested phrase, labelled as such.
    setSimulated(true);
    const phrase = suggestion || 'Show me what needs me today';
    let i = 0;
    const tick = () => { i += 3; setText(phrase.slice(0, i)); if (i < phrase.length) setTimeout(tick, 40); else setListening(false); };
    tick();
  };

  return (
    <form className="stack gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <div className="composer" data-listening={listening}>
        <label htmlFor={id} className="sr-only">{label}</label>
        <input id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} disabled={disabled} autoComplete="off" />
        <IconButton label={listening ? 'Stop listening' : 'Speak to Q'} onClick={startVoice} aria-pressed={listening} disabled={disabled}><IMic /></IconButton>
        <button type="submit" className="btn btn-primary btn-icon" aria-label="Send" disabled={disabled || !text.trim()} style={{ borderColor: 'transparent' }}><ISend /></button>
      </div>
      <p className="t-caption" aria-live="polite" style={{ minHeight: 20, paddingLeft: 18 }}>
        {listening ? 'Listening… speak, or keep typing.' : simulated && text ? <>Transcribed. Check it, then send. <Sim>Simulated speech</Sim></> : suggestion ? <>Try: “{suggestion}”</> : ''}
      </p>
    </form>
  );
}

// ---------- Sheet / dialog ----------
export function Sheet({ open, onClose, title, children, side = 'bottom' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; side?: 'bottom' | 'center' }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Keep the latest onClose without re-running the focus effect on every render (that would steal focus from inputs).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="sheet" data-side={side}
            initial={reduce ? { opacity: 0 } : side === 'bottom' ? { y: 40, opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : side === 'bottom' ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
            style={side === 'center' ? { x: '-50%', y: '-50%' } : undefined}>
            <div className="row between gap-4" style={{ marginBottom: 16 }}>
              <h2 className="t-title">{title}</h2>
              <IconButton label="Close" onClick={onClose}><IX /></IconButton>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------- Toasts (receipts, undo) ----------
type Toast = { id: number; text: ReactNode; action?: { label: string; run: () => void } };
let toastSet: ((f: (t: Toast[]) => Toast[]) => void) | null = null;
let toastId = 0;
export function toast(text: ReactNode, action?: Toast['action'], ms = 6000) {
  const id = ++toastId;
  toastSet?.((t) => [...t, { id, text, action }]);
  setTimeout(() => toastSet?.((t) => t.filter((x) => x.id !== id)), ms);
}
export function ToastHost() {
  const [items, set] = useState<Toast[]>([]);
  useEffect(() => { toastSet = set; return () => { toastSet = null; }; }, []);
  return (
    <div className="toast-host" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ICheck style={{ color: 'var(--color-ok)', flex: 'none' }} />
            <span className="grow">{t.text}</span>
            {t.action && <Button compact variant="quiet" onClick={() => { t.action!.run(); set((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</Button>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------- Page head ----------
export function PageHead({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="stack gap-3" style={{ marginBottom: 32 }}>
      {eyebrow && <span className="t-label q-text">{eyebrow}</span>}
      <h1 className="t-display measure">{title}</h1>
      {lead && <p className="t-lead muted measure">{lead}</p>}
      {children}
    </header>
  );
}

/** Arrival motion for content Q surfaces (MO: card arrival). Reduced motion: no movement, instant. */
export function Arrive({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay, ease: [0.2, 0.7, 0.2, 1] }}>{children}</motion.div>;
}
