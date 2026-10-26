import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import QPresence from '../q/QPresence'

// A directed stage for the product film: a laptop and a phone running the real app,
// moved like a camera, with titles between beats. Driven by video/record.mjs via window.__film.
const W = 1920
const H = 1080
const layouts = {
  black: { desk: { x: 240, y: 1200, s: 1, o: 0 }, phone: { x: 1960, y: 106, s: 1, o: 0 } },
  desk: { desk: { x: 240, y: 72, s: 1, o: 1 }, phone: { x: 1960, y: 106, s: 1, o: 0 } },
  deskDim: { desk: { x: 240, y: 72, s: 1, o: 0.18 }, phone: { x: 1960, y: 106, s: 1, o: 0 } },
  phone: { desk: { x: -1500, y: 72, s: 1, o: 0 }, phone: { x: 753, y: 106, s: 1, o: 1 } },
  split: { desk: { x: 96, y: 236, s: 0.66, o: 1 }, phone: { x: 1290, y: 106, s: 1, o: 1 } },
  splitDesk: { desk: { x: 96, y: 150, s: 0.84, o: 1 }, phone: { x: 1390, y: 150, s: 0.86, o: 0.55 } },
}

function Device({ kind, src, pose, label }) {
  const isDesk = kind === 'desk'
  return (
    <motion.div initial={false} animate={{ x: pose.x, y: pose.y, scale: pose.s, opacity: pose.o }} transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 1.1 }}
      style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', willChange: 'transform' }}>
      {isDesk ? (
        <div style={{ width: 1440, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(236,230,218,.12)', boxShadow: '0 60px 120px -40px rgba(0,0,0,.9), 0 0 0 1px rgba(0,0,0,.6)', background: '#0b0a08' }}>
          <div style={{ height: 34, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', background: '#14130f', borderBottom: '1px solid rgba(236,230,218,.06)' }}>
            {[0, 1, 2].map((i) => <i key={i} style={{ width: 11, height: 11, borderRadius: 9, background: '#2c2924' }} />)}
            <div style={{ margin: '0 auto', fontFamily: 'var(--mono)', fontSize: 11.5, color: '#8f887b', letterSpacing: '.04em' }}>{label}</div>
          </div>
          {src && <iframe name="desk" title="Desktop" src={src} style={{ display: 'block', width: 1440, height: 900, border: 0 }} />}
        </div>
      ) : (
        <div style={{ padding: 12, borderRadius: 58, background: 'linear-gradient(160deg, #2a2722, #121110)', boxShadow: '0 60px 120px -40px rgba(0,0,0,.95), inset 0 0 0 1px rgba(236,230,218,.12)' }}>
          <div style={{ position: 'relative', width: 390, height: 844, borderRadius: 46, overflow: 'hidden', background: '#0b0a08' }}>
            {src && <iframe name="phone" title="Phone" src={src} style={{ display: 'block', width: 390, height: 844, border: 0 }} />}
            <div style={{ position: 'absolute', top: 11, left: '50%', width: 118, height: 34, marginLeft: -59, borderRadius: 20, background: '#000' }} />
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function Film() {
  const [layout, setLayout] = useState('black')
  const [src, setSrc] = useState({ desk: null, phone: null })
  const [url, setUrl] = useState('talentq.app')
  const [title, setTitle] = useState(null) // { text, sub, kind: 'full' | 'super', key }
  const [orb, setOrb] = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    window.__film = {
      layout: setLayout,
      load: (which, route) => { setSrc((s) => ({ ...s, [which]: `#${route}${route.includes('?') ? '&' : '?'}film=1&t=${Date.now()}` })); if (which === 'desk') setUrl('talentq.app' + route.split('?')[0]) },
      title: (t) => setTitle(t ? { ...t, key: Math.random() } : null),
      orb: setOrb,
    }
    return () => { document.body.style.overflow = '' }
  }, [])

  const pose = layouts[layout] || layouts.black
  return (
    <div style={{ position: 'fixed', inset: 0, width: W, height: H, background: '#070605', overflow: 'hidden' }}>
      <div className="atmos" />
      <Device kind="desk" src={src.desk} pose={pose.desk} label={url} />
      <Device kind="phone" src={src.phone} pose={pose.phone} />

      <AnimatePresence>
        {orb && (
          <motion.div key="orb" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2, transition: { duration: 0.8 } }} transition={{ duration: 1.6, ease: [0, 0, 0.2, 1] }}
            style={{ position: 'absolute', left: 0, right: 0, top: 150, display: 'grid', placeItems: 'center' }}>
            <QPresence size={240} state={orb} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {title && title.kind === 'full' && (
          <motion.div key={title.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }} transition={{ duration: 0.9 }}
            style={{ position: 'absolute', left: 0, right: 0, top: orb ? 600 : 0, bottom: orb ? 'auto' : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none', background: orb ? 'none' : 'radial-gradient(60% 50% at 50% 50%, rgba(7,6,5,.85), rgba(7,6,5,.6))' }}>
            <motion.p initial={{ y: 16, filter: 'blur(8px)' }} animate={{ y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.2, ease: [0, 0, 0.2, 1] }} className="voice" style={{ fontSize: title.size || 76, letterSpacing: '-0.03em', lineHeight: 1.05, maxWidth: 1300 }}>{title.text}</motion.p>
            {title.sub && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.9 }} style={{ fontSize: 24, color: 'var(--text-2)', marginTop: 22 }}>{title.sub}</motion.p>}
          </motion.div>
        )}
        {title && title.kind === 'super' && (
          <motion.div key={title.key} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.5 } }} transition={{ duration: 0.8, ease: [0, 0, 0.2, 1] }}
            style={{ position: 'absolute', left: 72, bottom: 64, pointerEvents: 'none', padding: '18px 24px 18px 20px', borderLeft: '2px solid var(--gold)', background: 'linear-gradient(90deg, rgba(7,6,5,.88), rgba(7,6,5,0))' }}>
            <div className="label" style={{ color: 'var(--gold)', fontSize: 13 }}>{title.sub}</div>
            <div className="voice" style={{ fontSize: 34, marginTop: 6, maxWidth: 820 }}>{title.text}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
