import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EyeOff, Lightbulb, Mic, RotateCcw, Square, ThumbsUp, TrendingUp } from 'lucide-react'
import { Badge, Button, QOrb, ScoreRing, Segmented, ease, stagger } from '../../ui'

export default function Rehearsal() {
  const [role, setRole] = useState('Senior backend')
  const [phase, setPhase] = useState('ready') // ready | rec | analysing | feedback
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (phase !== 'rec') return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])
  const stop = () => { setPhase('analysing'); setTimeout(() => setPhase('feedback'), 1800) }
  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div><div className="small muted">Private practice</div><h1>Interview rehearsal</h1></div>
        <Badge tone="dark" icon={EyeOff}>Never shared with employers</Badge>
      </div>
      <div className="row" style={{ marginBottom: 16 }}><Segmented id="rr" options={['Senior backend', 'Platform / SRE', 'Engineering manager']} value={role} onChange={setRole} /></div>
      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
        <div className="card" style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <QOrb size={64} thinking={phase === 'analysing'} />
          <div className="muted small" style={{ marginTop: 18 }}>Question 1 of 3 · System design</div>
          <p style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 650, marginTop: 8, lineHeight: 1.35 }}>“Your payments API returns 502s for 3% of requests at peak. Walk me through the first 15 minutes.”</p>
          <div className="row center" style={{ gap: 3, height: 60, marginTop: 24 }}>
            {Array.from({ length: 44 }).map((_, i) => (
              <motion.i key={i} animate={phase === 'rec' ? { height: [6, 10 + Math.abs(Math.sin(i * 1.7)) * 44, 6] } : { height: 6 }} transition={phase === 'rec' ? { duration: 0.5 + (i % 5) * 0.12, repeat: Infinity } : { duration: 0.3 }} style={{ width: 4, borderRadius: 4, background: phase === 'rec' ? 'var(--gold)' : 'var(--line-2)' }} />
            ))}
          </div>
          <div className="mono muted" style={{ marginTop: 8 }}>0:{String(secs).padStart(2, '0')}</div>
          <div style={{ marginTop: 18 }}>
            {phase === 'ready' && <Button variant="primary" size="lg" icon={Mic} onClick={() => setPhase('rec')} data-q="rec-start">Start answering</Button>}
            {phase === 'rec' && <Button variant="danger" size="lg" icon={Square} onClick={stop} data-q="rec-stop">Stop & get feedback</Button>}
            {phase === 'analysing' && <Button size="lg" loading>Analysing your answer…</Button>}
            {phase === 'feedback' && <Button size="lg" icon={RotateCcw} onClick={() => { setSecs(0); setPhase('ready') }}>Try again</Button>}
          </div>
        </div>
        <AnimatePresence mode="wait">
          {phase === 'feedback' ? (
            <motion.div key="f" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ ease }} className="card pad">
              <div className="row" style={{ gap: 16 }}><ScoreRing value={81} size={68} label="CLARITY" /><div><div className="card-title">Strong structure</div><div className="muted small">Up from 68 on your last attempt</div></div><TrendingUp size={18} color="var(--green)" /></div>
              {[[ThumbsUp, 'green', 'What worked', 'You stated impact first, then triaged by blast radius. Clear rollback criteria.'], [Lightbulb, 'amber', 'Try next time', 'Name the dashboards you’d open. Mention communicating status to support within 5 minutes.']].map(([I, tone, t, d], i) => (
                <motion.div key={t} {...stagger(i + 1, 0.12)} className="row" style={{ marginTop: 18, gap: 12, alignItems: 'flex-start' }}><span className={`ic-box ${tone}`} style={{ width: 32, height: 32 }}><I size={15} /></span><div><div style={{ fontWeight: 600 }}>{t}</div><div className="muted small" style={{ marginTop: 2, lineHeight: 1.55 }}>{d}</div></div></motion.div>
              ))}
              <div className="divider" />
              <div className="small muted">Transcript excerpt</div>
              <p className="small" style={{ marginTop: 6, lineHeight: 1.6 }}>“First I’d check whether it’s one upstream or all… <mark style={{ background: 'var(--green-soft)' }}>roll back the last deploy if errors started with it</mark>… then look at connection pool saturation…”</p>
            </motion.div>
          ) : (
            <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card pad">
              <div className="card-title">How practice works</div>
              {['Questions tailored to roles you’re targeting', 'Instant, specific feedback on structure and substance', 'Repeat as often as you like — it’s free', 'Results stay private unless you choose to share'].map((t, i) => <motion.div key={t} {...stagger(i)} className="row small" style={{ marginTop: 12 }}><span className="ic-box gold" style={{ width: 26, height: 26 }}>{i + 1}</span>{t}</motion.div>)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
