import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Mic, X } from 'lucide-react'

export const ease = [0, 0, 0.2, 1]
export const gentle = { type: 'spring', stiffness: 100, damping: 26, mass: 1 }
export const stiff = { type: 'spring', stiffness: 210, damping: 24 }

export function Avatar({ name = '', size = 36, src }) {
  const i = name.split(' ').map((p) => p[0]).join('').slice(0, 2)
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>{i}</span>
}

/* Q's words arrive one at a time, like speech. */
export function QLine({ line, size = 'var(--t-3xl)', max = '28ch', align = 'center' }) {
  const words = line.text ? line.text.split(' ') : []
  const steps = ['var(--t-lg)', 'var(--t-xl)', 'var(--t-2xl)', 'var(--t-3xl)']
  if (line.text && line.text.length > 52 && steps.indexOf(size) > 0) size = steps[steps.indexOf(size) - 1]
  return (
    <div aria-live="polite" style={{ fontSize: size, minHeight: '2.5em', maxWidth: max, margin: align === 'center' ? '0 auto' : 0, textAlign: align }}>
      <AnimatePresence mode="wait">
        <motion.p key={line.key} className="voice" style={{ fontSize: '1em' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}>
          {words.map((w, i) => (
            <motion.span key={i} style={{ display: 'inline-block', marginRight: '0.26em' }} initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: i * 0.075, duration: 0.45, ease }}>
              {w}
            </motion.span>
          ))}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

/* The only persistent control: talk or type. */
export function Dock({ q, onAsk, suggestions = [], compact }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const timer = useRef()
  const expected = q.expect?.text

  const startListening = () => {
    if (listening) return
    const script = expected || ''
    setListening(true)
    q.setState('listening')
    const words = script.split(' ')
    let i = 0
    q.setHeard('')
    const tick = () => {
      i += 1
      q.setHeard(words.slice(0, i).join(' '))
      if (i < words.length) timer.current = setTimeout(tick, 150 + Math.random() * 90)
      else timer.current = setTimeout(() => finish(script), 650)
    }
    timer.current = setTimeout(tick, script ? 420 : 1600)
  }
  const finish = (said) => {
    setListening(false)
    q.setState('thinking')
    if (q.expect) q.fire('voice', said)
    else if (said) onAsk && onAsk(said)
    else q.setState('idle')
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  const send = () => {
    const t = text.trim()
    if (!t) return
    setText('')
    if (q.expect) q.fire('voice', t)
    else onAsk && onAsk(t)
  }

  return (
    <div data-expecting={expected ? 'true' : 'false'} style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <AnimatePresence mode="wait">
        {listening || q.heard ? (
          <motion.p key="heard" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ maxWidth: 640, textAlign: 'center', color: 'var(--text)', fontSize: compact ? 15 : 17, minHeight: 26 }}>
            {q.heard || <span className="t3">Listening…</span>}
            <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--gold)', marginLeft: 3, verticalAlign: '-2px', animation: 'blink 1s steps(2) infinite' }} />
          </motion.p>
        ) : expected ? (
          <motion.p key="hint" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="t3" style={{ fontSize: 14, textAlign: 'center', maxWidth: 560 }}>
            {q.expect.hint || <>Try saying <span className="t2">“{expected.length > 64 ? expected.slice(0, 62) + '…' : expected}”</span></>}
          </motion.p>
        ) : suggestions.length ? (
          <motion.div key="sugg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="row" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {suggestions.map((s) => <button key={s} className="chip" onClick={() => onAsk && onAsk(s)} data-q={`ask-${s.slice(0, 12)}`}>{s}</button>)}
          </motion.div>
        ) : <div style={{ height: 26 }} />}
      </AnimatePresence>
      <div className="row" style={{ gap: 12, width: '100%', maxWidth: compact ? 420 : 520 }}>
        <div className="row grow" style={{ height: 52, borderRadius: 'var(--r-pill)', background: 'rgba(26,24,20,.85)', border: '1px solid var(--line)', padding: '0 6px 0 20px', backdropFilter: 'blur(16px)' }}>
          <input aria-label="Type to Q" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type to Q, or hold the mic" style={{ flex: 1, background: 'none', border: 0, outline: 'none', fontSize: 15, minWidth: 0 }} data-q="dock-input" />
          <AnimatePresence>{text && <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="btn btn-primary" style={{ width: 40, height: 40, padding: 0 }} onClick={send} aria-label="Send" data-q="dock-send"><ArrowUp size={18} /></motion.button>}</AnimatePresence>
        </div>
        <button aria-label={listening ? 'Listening' : 'Talk to Q'} onClick={startListening} data-q="mic"
          style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, color: listening ? '#1a1408' : 'var(--gold)', background: listening ? 'var(--gold)' : 'rgba(217,181,107,.08)', border: '1px solid var(--gold-line)', transition: 'background .2s, color .2s' }}>
          {listening && <motion.span style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '1px solid var(--gold-line)' }} animate={{ scale: [1, 1.25], opacity: [0.8, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />}
          <Mic size={22} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

/* A moment rises when Q needs a human, and settles away when resolved. */
export function MomentHost({ moment }) {
  return (
    <AnimatePresence mode="wait">
      {moment && (
        <motion.div key={moment.key} initial={{ opacity: 0, y: 40, scale: 0.98, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -16, scale: 0.98, filter: 'blur(6px)', transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }} transition={{ ...gentle }} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {moment.node}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function MomentHead({ label, right }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
      <span className="label" style={{ color: 'var(--gold)' }}>{label}</span>
      {right}
    </div>
  )
}

/* A lens opens a single detailed view on demand, over a dimmed Q. */
export function Lens({ open, onClose, title, children, width = 880 }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,10,8,.72)', backdropFilter: 'blur(10px)', zIndex: 40 }} />
          <motion.section role="dialog" aria-modal aria-label={title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }} transition={{ type: 'spring', stiffness: 170, damping: 28 }}
            style={{ position: 'fixed', left: 0, right: 0, bottom: 0, margin: '0 auto', width: `min(${width}px, 100%)`, height: 'min(88vh, 100%)', background: 'var(--ink-1)', border: '1px solid var(--line-2)', borderBottom: 0, borderRadius: '28px 28px 0 0', zIndex: 41, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="row" style={{ padding: '18px 22px 14px 28px', justifyContent: 'space-between' }}>
              <span className="label">{title}</span>
              <button className="btn btn-quiet btn-sm" onClick={onClose} data-q="lens-close"><X size={14} /> Back to Q</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 28px 32px' }}>{children}</div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  )
}

/* What Q did in the background — quiet, glanceable. */
export function Thread({ log }) {
  return (
    <aside className="thread" aria-label="What Q did">
      <AnimatePresence initial={false}>
        {log.slice(0, 5).map((l, i) => (
          <motion.div key={l.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1 - i * 0.17, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease }} className="row" style={{ alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
            <span className="label num" style={{ marginTop: 2 }}>{l.t}</span>
            <span className="t2" style={{ lineHeight: 1.45 }}>{l.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </aside>
  )
}

/* Success as light, not confetti. */
export function Bloom({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 0], scale: [0.6, 1.4, 1.8] }} exit={{ opacity: 0 }} transition={{ duration: 2.4, ease }}
          style={{ position: 'fixed', left: '50%', top: '38%', width: 900, height: 900, marginLeft: -450, marginTop: -450, borderRadius: '50%', pointerEvents: 'none', zIndex: 2, background: 'radial-gradient(circle, rgba(240,211,149,.28), rgba(240,211,149,0) 60%)' }} />
      )}
    </AnimatePresence>
  )
}

export function Fact({ k, v, tone }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="label" style={{ marginBottom: 4 }}>{k}</div>
      <div style={{ fontSize: 14.5, color: tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : 'var(--text)' }}>{v}</div>
    </div>
  )
}
