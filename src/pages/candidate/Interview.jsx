import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Accessibility, ArrowRight, Check, CloudOff, FileText, Info, RefreshCw, Save, Send, Wifi, WifiOff } from 'lucide-react'
import { Badge, Button, CheckDraw, QOrb, Typewriter, Typing, ease, spring } from '../../ui'
import { useStore } from '../../store'

const qs = [
  'Tell me about the last production incident you led. What broke, and how did you find it?',
  'How did you make sure it didn’t happen again?',
  'Describe a PostgreSQL query you made dramatically faster. What was the bottleneck?',
  'Last one: how do you keep teammates informed during an outage when everyone is remote?',
]

export default function Interview() {
  const nav = useNavigate()
  const { set } = useStore()
  const [phase, setPhase] = useState('intro') // intro | live | dropped | done
  const [i, setI] = useState(0)
  const [log, setLog] = useState([])
  const [ans, setAns] = useState('')
  const [qReady, setQReady] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [lowData, setLowData] = useState(false)
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [log, qReady, thinking])

  const submit = () => {
    if (!ans.trim()) return
    setLog((l) => [...l, { q: qs[i], a: ans }])
    setAns('')
    setQReady(false)
    if (i === 1) { setTimeout(() => setPhase('dropped'), 700); return }
    if (i === qs.length - 1) { setThinking(true); setTimeout(() => { setThinking(false); setPhase('done'); set({ interviewDone: true }) }, 1400); return }
    setThinking(true)
    setTimeout(() => { setThinking(false); setI(i + 1) }, 1100)
  }
  const resume = (low) => {
    setLowData(low)
    setPhase('live')
    setThinking(true)
    setTimeout(() => { setThinking(false); setI(2) }, 900)
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div className="page-head">
        <div><div className="small muted">Paystride · Backend Engineer</div><h1>Structured screen with Q</h1></div>
        <div className="row">
          {lowData && <Badge tone="blue" icon={CloudOff}>Low-data mode</Badge>}
          <Badge tone={phase === 'dropped' ? 'red' : 'green'} icon={phase === 'dropped' ? WifiOff : Wifi}>{phase === 'dropped' ? 'Offline' : 'Connected'}</Badge>
        </div>
      </div>

      {phase !== 'intro' && phase !== 'done' && (
        <div className="row" style={{ gap: 6, marginBottom: 14 }}>
          {qs.map((_, k) => <motion.i key={k} animate={{ background: k < log.length ? 'var(--gold)' : k === i ? 'var(--gold-3)' : 'var(--line)' }} style={{ flex: 1, height: 5, borderRadius: 9 }} />)}
          <span className="small muted" style={{ marginLeft: 8 }}>{Math.min(log.length + 1, qs.length)} of {qs.length}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card" style={{ padding: 32, textAlign: 'center' }}>
            <QOrb size={72} thinking />
            <h2 style={{ fontSize: 26, marginTop: 20 }}>Before we start</h2>
            <div className="col" style={{ gap: 12, marginTop: 20, textAlign: 'left', maxWidth: 520, marginInline: 'auto' }}>
              {[[Info, 'You’re talking to Q, an AI interviewer. A person at Paystride reviews your answers and makes any decision.'], [Save, '4 questions · about 15 minutes. Progress saves after every answer — you can pause or lose signal safely.'], [FileText, 'You’ll get a copy of the transcript.'], [Accessibility, 'Need more time, a different format or another accommodation? Just ask — it won’t count against you.']].map(([I, t], k) => (
                <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + k * 0.08 }} className="row" style={{ alignItems: 'flex-start', gap: 12 }}><span className="ic-box gold" style={{ width: 30, height: 30 }}><I size={15} /></span><span className="small" style={{ lineHeight: 1.55, marginTop: 5 }}>{t}</span></motion.div>
              ))}
            </div>
            <Button variant="primary" size="lg" style={{ marginTop: 26 }} iconRight={ArrowRight} onClick={() => setPhase('live')} data-q="begin-interview">Begin</Button>
          </motion.div>
        )}

        {(phase === 'live' || phase === 'dropped') && (
          <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ padding: 22, minHeight: 380, maxHeight: 'calc(100vh - 330px)', overflowY: 'auto' }} className="col">
              {log.map((l, k) => (
                <div key={k} className="col" style={{ gap: 10, marginBottom: 6 }}>
                  <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}><QOrb size={24} /><div className="msg q">{l.q}</div></div>
                  <div className="msg me">{l.a}</div>
                </div>
              ))}
              {thinking && <div className="row" style={{ gap: 10 }}><QOrb size={24} thinking /><div className="msg q" style={{ padding: '8px 14px' }}><Typing /></div></div>}
              {!thinking && phase === 'live' && log.length === i && (
                <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}><QOrb size={24} /><div className="msg q"><Typewriter key={i} text={(i === 2 ? 'Welcome back — nothing was lost. ' : '') + qs[i]} speed={14} onDone={() => setQReady(true)} /></div></div>
              )}
              <div ref={endRef} />
            </div>
            <div style={{ padding: 14, borderTop: '1px solid var(--line)' }}>
              <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
                <textarea className="input grow" rows={3} value={ans} onChange={(e) => setAns(e.target.value)} placeholder={qReady ? 'Type your answer… (autosaves)' : 'Q is asking…'} disabled={!qReady || phase !== 'live'} data-q="answer-input" />
                <Button variant="primary" icon={Send} onClick={submit} disabled={!ans.trim()} data-q="answer-send">Send</Button>
              </div>
              <div className="row tiny muted" style={{ marginTop: 8, gap: 6 }}><Save size={12} />{ans ? 'Draft saved just now' : 'Every answer is checkpointed'}</div>
            </div>

            <AnimatePresence>
              {phase === 'dropped' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(248,246,241,.88)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center' }}>
                  <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} transition={spring} className="card" style={{ padding: 28, width: 440, textAlign: 'center', boxShadow: 'var(--sh-3)' }}>
                    <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="ic-box red" style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 16 }}><WifiOff size={24} /></motion.div>
                    <div className="card-title" style={{ fontSize: 19, marginTop: 16 }}>Connection lost — you’re safe</div>
                    <p className="muted small" style={{ marginTop: 6 }}>Your answers are saved at <b>checkpoint 2 of 4</b>. Nothing counts against you for dropping out.</p>
                    <div className="row tiny" style={{ justifyContent: 'center', gap: 6, marginTop: 12, color: 'var(--green)', fontWeight: 600 }}><Check size={13} strokeWidth={3} />2 answers synced</div>
                    <div className="col" style={{ gap: 8, marginTop: 18 }}>
                      <Button variant="primary" icon={RefreshCw} onClick={() => resume(false)} data-q="resume">Resume where I left off</Button>
                      <Button icon={CloudOff} onClick={() => resume(true)} data-q="resume-low">Switch to low-data text mode</Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ display: 'inline-block' }}><CheckDraw size={72} /></div>
            <h2 style={{ fontSize: 28, marginTop: 20 }}>Thanks, Femi — that’s it.</h2>
            <p className="muted" style={{ marginTop: 8, maxWidth: 480, marginInline: 'auto' }}>Paystride committed to review within <b style={{ color: 'var(--text)' }}>3 working days</b>. You’ll see every status change here — no silent ghosting.</p>
            <div className="row center" style={{ gap: 10, marginTop: 22 }}><Button icon={FileText}>View transcript</Button><Button variant="primary" iconRight={ArrowRight} onClick={() => nav('/me/applications')} data-q="to-applications">Track application</Button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
