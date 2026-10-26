import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button, Logo, QOrb, ease } from '../../ui'

export default function OnboardingFrame({ steps, step, setStep, children, canNext = true, onFinish, nextLabel, qSays, hideNav }) {
  const last = step === steps.length - 1
  return (
    <motion.div className="ob" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <aside className="ob-side">
        <div className="grain" />
        <Logo dark />
        <div style={{ marginTop: 44 }}>
          {steps.map((s, i) => (
            <div key={s.t} className={`ob-step ${i < step ? 'done' : ''} ${i === step ? 'cur' : ''}`}>
              {i < steps.length - 1 && <span className="line"><i style={{ height: i < step ? '100%' : '0%' }} /></span>}
              <span className="num">{i < step ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
              <div>
                <div style={{ fontWeight: 600, color: i <= step ? '#f2efe6' : '#77746b', fontSize: 14, transition: 'color .3s' }}>{s.t}</div>
                <div style={{ fontSize: 12.5, color: '#6f6c64', marginTop: 2 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="grow" />
        <AnimatePresence mode="wait">
          {qSays && (
            <motion.div key={qSays} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4, ease }} className="row" style={{ alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <QOrb size={26} />
              <p style={{ fontSize: 13, color: '#cfccc3', lineHeight: 1.55 }}>{qSays}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
      <main className="ob-main">
        <div className="row between" style={{ marginBottom: 36 }}>
          <div className="meter" style={{ width: 220, height: 4 }}><motion.i animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.5, ease }} /></div>
          <span className="muted small">Step {step + 1} of {steps.length}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease }} style={{ flex: 1 }}>
            {children}
          </motion.div>
        </AnimatePresence>
        {!hideNav && (
          <div className="row" style={{ marginTop: 40, gap: 10 }}>
            {step > 0 && <Button icon={ArrowLeft} onClick={() => setStep(step - 1)}>Back</Button>}
            <span className="grow" />
            {steps[step].optional && <Button variant="ghost" onClick={() => setStep(step + 1)} data-q="ob-skip">Skip for now</Button>}
            <Button variant={last ? 'gold' : 'primary'} size="lg" disabled={!canNext} iconRight={ArrowRight} onClick={() => (last ? onFinish() : setStep(step + 1))} data-q="ob-next">{nextLabel || (last ? 'Finish' : 'Continue')}</Button>
          </div>
        )}
      </main>
    </motion.div>
  )
}
