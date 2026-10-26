import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { Check, CheckCircle2, Info, Sparkles, X, AlertTriangle } from 'lucide-react'
import confetti from 'canvas-confetti'

export const ease = [0.2, 0.8, 0.2, 1]
export const spring = { type: 'spring', stiffness: 420, damping: 34 }

/* ---------- Brand ---------- */
export function QMark({ size = 28, color = '#D4AE5C', bg }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {bg && <rect width="64" height="64" rx="16" fill={bg} />}
      <circle cx="30" cy="30" r="15" fill="none" stroke={color} strokeWidth="7" />
      <path d="M38 38l11 11" stroke={color} strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ dark = false, size = 26 }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <QMark size={size} bg={dark ? undefined : '#0B0C0F'} />
      <span style={{ fontFamily: 'var(--display)', fontWeight: 750, fontSize: size * 0.68, letterSpacing: '-0.03em', color: dark ? '#f5f2ea' : 'var(--text)' }}>
        Talent<span style={{ color: 'var(--gold)' }}> Q</span>
      </span>
    </div>
  )
}

/* ---------- Button with ripple ---------- */
export function Button({ variant = '', size = '', icon: Icon, iconRight: IconRight, children, className = '', onClick, loading, ...rest }) {
  const ref = useRef(null)
  const handle = (e) => {
    const el = ref.current
    if (el) {
      const r = el.getBoundingClientRect()
      const s = document.createElement('span')
      const d = Math.max(r.width, r.height)
      s.className = 'ripple'
      s.style.width = s.style.height = d + 'px'
      s.style.left = e.clientX - r.left - d / 2 + 'px'
      s.style.top = e.clientY - r.top - d / 2 + 'px'
      el.appendChild(s)
      setTimeout(() => s.remove(), 650)
    }
    onClick && onClick(e)
  }
  return (
    <button ref={ref} className={`btn ${variant} ${size} ${className}`} onClick={handle} {...rest}>
      <span className="shine" />
      {loading ? <span className="spin" style={{ width: 15, height: 15, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%' }} /> : Icon && <Icon size={size === 'lg' ? 18 : 16} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight size={size === 'lg' ? 18 : 16} strokeWidth={2.2} />}
    </button>
  )
}

/* ---------- Avatar ---------- */
const hues = [['#2a2e37', '#545a66'], ['#7a5a17', '#c9a04b'], ['#1f5a3f', '#3b9c6c'], ['#283f7a', '#4f78d6'], ['#4e3a8f', '#836ee0'], ['#8a3a33', '#cf6b5f'], ['#2b5a66', '#4ba0b0']]
export function Avatar({ name = '?', size = 36, online, hue }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  const h = hues[hue ?? (name.charCodeAt(0) + name.length) % hues.length]
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${h[0]}, ${h[1]})` }}>
      {initials}
      {online && <span className="status" />}
    </span>
  )
}

export function Badge({ tone = '', dot, pulse, children, icon: Icon }) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <span className={`dot ${pulse ? 'pulse' : ''}`} />}
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      {children}
    </span>
  )
}

/* ---------- Q orb ---------- */
export function QOrb({ size = 32, thinking }) {
  return (
    <motion.span
      className={`qorb ${thinking ? 'thinking' : ''}`}
      style={{ width: size, height: size, display: 'inline-block' }}
      animate={thinking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={thinking ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : {}}
    />
  )
}

export function Typing() {
  return <span className="typing"><i /><i /><i /></span>
}

/* ---------- Count up ---------- */
export function CountUp({ to, decimals = 0, duration = 1.2, prefix = '', suffix = '', start = true }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView || !start) return
    const c = animate(0, to, { duration, ease, onUpdate: (x) => setV(x) })
    return () => c.stop()
  }, [inView, to, start])
  return <span ref={ref}>{prefix}{v.toFixed(decimals)}{suffix}</span>
}

/* ---------- Score ring ---------- */
export function ScoreRing({ value, size = 56, stroke = 5, color = 'var(--gold)', track = 'var(--paper-2)', label, delay = 0, textColor }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const mv = useMotionValue(0)
  const offset = useTransform(mv, (v) => c - (v / 100) * c)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const ctl = animate(mv, value, { duration: 1.1, delay, ease, onUpdate: (v) => setShown(v) })
    return () => ctl.stop()
  }, [value])
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} style={{ strokeDashoffset: offset }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', lineHeight: 1 }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 750, fontSize: size * 0.3, color: textColor }}>{Math.round(shown)}</div>
          {label && <div style={{ fontSize: Math.max(8.5, size * 0.14), color: 'var(--muted)', marginTop: 2, fontWeight: 600, letterSpacing: '.04em' }}>{label}</div>}
        </div>
      </div>
    </div>
  )
}

export function Meter({ value, color = 'var(--gold)', delay = 0, height = 6 }) {
  return (
    <div className="meter" style={{ height }}>
      <motion.i initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.9, delay, ease }} style={{ background: color }} />
    </div>
  )
}

export function Toggle({ on, onChange, label }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
}

export function Segmented({ options, value, onChange, id = 'seg' }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => {
        const v = o.value ?? o
        const l = o.label ?? o
        return (
          <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)} role="tab" aria-selected={value === v}>
            {value === v && <motion.span layoutId={`${id}-pill`} className="seg-pill" transition={spring} />}
            {l}
          </button>
        )
      })}
    </div>
  )
}

export function Typewriter({ text, speed = 18, onDone, className, style }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    let i = 0
    const t = setInterval(() => {
      i += 1
      setN(i)
      if (i >= text.length) { clearInterval(t); onDone && onDone() }
    }, speed)
    return () => clearInterval(t)
  }, [text])
  return <span className={className} style={style}>{text.slice(0, n)}{n < text.length && <span style={{ opacity: 0.5 }}>▍</span>}</span>
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    setItems((s) => [...s, { id, msg, ...opts }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), opts.duration || 3600)
  }, [])
  const icons = { success: CheckCircle2, gold: Sparkles, warn: AlertTriangle, info: Info }
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const Ic = icons[t.tone || 'success']
            return (
              <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }} transition={spring}>
                <span className={`t-ic ${t.tone === 'gold' ? 'gold' : t.tone === 'warn' ? 'warn' : ''}`}><Ic size={15} /></span>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{t.msg}</div>
                  {t.sub && <div style={{ color: '#a4a198', fontSize: 12.5, marginTop: 2 }}>{t.sub}</div>}
                </div>
                {t.action && <button className="btn sm dark-outline" onClick={t.action.onClick}>{t.action.label}</button>}
                <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} style={{ background: 'none', border: 0, color: '#77746b', padding: 0 }} aria-label="Dismiss"><X size={14} /></button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- Drawer & Modal ---------- */
export function Drawer({ open, onClose, children, width }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside className="drawer" style={width ? { width } : undefined} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 36 }} role="dialog" aria-modal>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function Modal({ open, onClose, children, width }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="modal" style={{ x: '-50%', y: '-50%', ...(width ? { width } : {}) }} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={spring} role="dialog" aria-modal>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ---------- Celebrate ---------- */
export function celebrate(opts = {}) {
  const colors = ['#C9A04B', '#E2C27C', '#F3E3BD', '#0B0C0F', '#ffffff']
  confetti({ particleCount: 90, spread: 75, startVelocity: 42, origin: { y: 0.6 }, colors, ...opts })
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 180)
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 300)
}

export function CheckDraw({ size = 72, color = 'var(--green)' }) {
  return (
    <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'grid', placeItems: 'center', boxShadow: `0 12px 36px -8px ${color}` }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.45, ease }} />
      </svg>
    </motion.div>
  )
}

/* ---------- Page transition ---------- */
export function Page({ children, className = '', style }) {
  return (
    <motion.div className={className} style={style} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
      {children}
    </motion.div>
  )
}

export const stagger = (i, base = 0.05) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * base, duration: 0.45, ease } })

export function Tick({ on }) {
  return <span className="tick">{on && <Check size={12} strokeWidth={3} />}</span>
}

export function Empty({ icon: Icon, title, body, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div className="ic-box gold" style={{ margin: '0 auto 12px', width: 48, height: 48 }}><Icon size={22} /></div>
      <div className="card-title">{title}</div>
      <p className="muted" style={{ marginTop: 6, maxWidth: 360, marginInline: 'auto' }}>{body}</p>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}
