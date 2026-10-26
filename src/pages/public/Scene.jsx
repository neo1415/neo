import { useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo, QMark, QOrb, ease } from '../../ui'

// Title cards used between chapters of the product walkthrough video.
export default function Scene() {
  const { id } = useParams()
  const [p] = useSearchParams()
  const title = p.get('t') || 'Talent Q'
  const sub = p.get('s') || ''
  const kicker = p.get('k') || ''
  const persona = p.get('p') || ''
  if (id === 'intro' || id === 'outro') {
    return (
      <div className="scene">
        <div className="grid-bg" />
        <motion.div className="glow" style={{ width: 800, height: 800, background: 'rgba(201,160,75,.22)' }} animate={{ scale: [0.9, 1.1, 0.9] }} transition={{ duration: 6, repeat: Infinity }} />
        <div className="grain" />
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <motion.div initial={{ scale: 0.3, opacity: 0, rotate: -40 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 1.1, ease }} style={{ display: 'inline-block' }}>
            <QMark size={120} />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30, letterSpacing: '0.2em' }} animate={{ opacity: 1, y: 0, letterSpacing: '-0.04em' }} transition={{ delay: 0.5, duration: 1.1, ease }} style={{ fontSize: 96, fontWeight: 750, marginTop: 24, color: '#f7f4ec' }}>
            Talent <span style={{ color: 'var(--gold)' }}>Q</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.8 }} className="serif" style={{ fontSize: 40, color: 'var(--gold-2)', marginTop: 10 }}>{title}</motion.p>
          {sub && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} style={{ fontSize: 20, color: '#8f8c83', marginTop: 22 }}>{sub}</motion.p>}
        </div>
      </div>
    )
  }
  return (
    <div className="scene">
      <div className="grid-bg" />
      <div className="grain" />
      <motion.div className="glow" style={{ width: 600, height: 600, background: 'rgba(201,160,75,.16)', right: -100, top: -100 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }} />
      <div style={{ position: 'absolute', top: 48, left: 64 }}><Logo dark /></div>
      <div style={{ width: 1100, position: 'relative' }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease }} className="row" style={{ gap: 14 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--gold)', fontSize: 22 }}>{id}</span>
          <motion.span initial={{ width: 0 }} animate={{ width: 80 }} transition={{ delay: 0.2, duration: 0.6, ease }} style={{ height: 2, background: 'var(--gold)' }} />
          <span style={{ fontSize: 16, letterSpacing: '.18em', textTransform: 'uppercase', color: '#a9a69d', fontWeight: 600 }}>{kicker}</span>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.25, duration: 0.9, ease }} style={{ fontSize: 88, fontWeight: 750, letterSpacing: '-.045em', color: '#f7f4ec', marginTop: 26, lineHeight: 1.02 }}>{title}</motion.h1>
        {sub && <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7, ease }} style={{ fontSize: 26, color: '#a9a69d', marginTop: 26, maxWidth: 900, lineHeight: 1.45 }}>{sub}</motion.p>}
        {persona && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.7, ease }} className="row" style={{ marginTop: 44, gap: 16, padding: '14px 22px 14px 14px', borderRadius: 99, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', display: 'inline-flex' }}>
            <QOrb size={40} thinking />
            <span style={{ fontSize: 19, color: '#e8e5dc' }}>{persona}</span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
