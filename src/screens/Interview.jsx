import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff, Pause, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QPresence from '../q/QPresence'
import { Dock, QLine, ease, gentle } from '../ui/kit'
import { useNarrow } from '../ui/Stage'
import { useQ } from '../q/useQ'
import { emit, isFilm } from '../q/bus'
import { interview } from '../data'

// Femi's camera tile. Stylised on purpose: a prototype should never fake a real person.
function SelfView({ speaking, lowData, narrow }) {
  return (
    <div style={{ position: 'relative', width: narrow ? 92 : 300, aspectRatio: '3/4', borderRadius: narrow ? 16 : 22, overflow: 'hidden', border: '1px solid var(--line-2)', background: 'radial-gradient(120% 90% at 70% 10%, #3a3125, #15130f 70%)', flexShrink: 0 }}>
      <AnimatePresence>
        {lowData ? (
          <motion.div key="low" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 12 }}>
            <div><CloudOff size={narrow ? 18 : 26} style={{ color: 'var(--gold)' }} /><div className="label" style={{ marginTop: 8 }}>Text mode</div>{!narrow && <div className="t3" style={{ fontSize: 12.5, marginTop: 4 }}>About 3 KB per answer</div>}</div>
          </motion.div>
        ) : (
          <motion.svg key="cam" viewBox="0 0 300 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} animate={{ y: [0, -2, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <defs>
              <radialGradient id="rim" cx="0.75" cy="0.25" r="0.9"><stop offset="0" stopColor="#f0d395" stopOpacity=".55" /><stop offset=".5" stopColor="#7a5a2c" stopOpacity=".15" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
              <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b241b" /><stop offset="1" stopColor="#14110d" /></linearGradient>
            </defs>
            <rect width="300" height="400" fill="url(#rim)" />
            <ellipse cx="150" cy="165" rx="58" ry="70" fill="url(#body)" />
            <path d="M40 400 C50 300, 95 262, 150 262 C205 262, 250 300, 260 400 Z" fill="url(#body)" />
            <path d="M196 120 C214 140, 214 190, 198 214" stroke="#f0d395" strokeOpacity=".35" strokeWidth="3" fill="none" />
          </motion.svg>
        )}
      </AnimatePresence>
      <div className="row" style={{ position: 'absolute', left: 10, bottom: 10, gap: 6 }}>
        <span className="label" style={{ color: 'var(--text)', background: 'rgba(11,10,8,.6)', padding: '3px 8px', borderRadius: 99 }}>You</span>
        {speaking && !narrow && <span className="row" style={{ gap: 2 }}>{[0, 1, 2, 3].map((i) => <motion.i key={i} animate={{ height: [4, 14, 4] }} transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }} style={{ width: 3, borderRadius: 2, background: 'var(--gold)' }} />)}</span>}
      </div>
    </div>
  )
}

export default function Interview() {
  const q = useQ()
  const nav = useNavigate()
  const narrow = useNarrow()
  const [phase, setPhase] = useState('intro') // intro | live | dropped | done
  const [n, setN] = useState(0)
  const [lowData, setLowData] = useState(false)
  const resume = useRef()

  const begin = async () => {
    setPhase('live')
    let low = false
    emit('interview_started')
    for (let i = 0; i < interview.length; i++) {
      setN(i)
      const t = interview[i]
      emit('interview_line', { who: 'Q', text: t.q })
      await q.say((i === 2 ? 'Welcome back — nothing was lost. ' : '') + t.q, { pace: 1 })
      const said = await q.hear(t.a, i === 2 && low ? 'Type your answer — it’s lighter on data' : 'Answer out loud when you’re ready')
      emit('interview_line', { who: 'Femi', text: said })
      emit('interview_note', t.note)
      if (i === 1) {
        await q.sleep(500)
        setPhase('dropped')
        emit('interview_drop')
        low = await new Promise((r) => (resume.current = r))
        setLowData(low)
        emit('interview_resume', { lowData: low })
        setPhase('live')
      } else {
        await q.say(i === 3 ? 'Thank you, that’s honest and useful.' : ['Clear, thank you.', 'Got it.', 'Good.'][i], { pace: 0.6 })
      }
    }
    await q.say('That’s everything, Femi. Paystride will review within three working days.', { then: 'done' })
    emit('interview_done')
    setPhase('done')
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      <div className="atmos" />
      <header className="topbar" style={{ position: 'relative', zIndex: 2 }}>
        <h1 className="sr-only">Interview with Q for Paystride</h1>
        <div><div className="label" style={{ color: 'var(--gold)' }}>Interview · Paystride</div>{!narrow && <div className="t2" style={{ fontSize: 14 }}>Backend Engineer · with Q</div>}</div>
        {phase !== 'intro' && (
          <div className="row" style={{ gap: 6 }}>
            {interview.map((_, i) => <motion.i key={i} animate={{ background: i < n || phase === 'done' ? '#d9b56b' : i === n ? '#7a6743' : '#2a2620' }} style={{ width: narrow ? 18 : 28, height: 3, borderRadius: 3 }} />)}
            <span className="label num" style={{ marginLeft: 8 }}>{Math.min(n + 1, 4)} / 4</span>
          </div>
        )}
        <button className="btn btn-quiet btn-sm hide-sm"><Pause size={14} /> Pause</button>
      </header>

      <main style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: narrow ? 0 : 64, padding: narrow ? '0 18px' : '0 48px', flexDirection: narrow ? 'column' : 'row' }}>
        <AnimatePresence mode="wait">
          {phase === 'intro' ? (
            <motion.div key="intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ maxWidth: 560, textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center' }}><QPresence size={narrow ? 120 : 170} state="idle" /></div>
              <p className="voice" style={{ fontSize: narrow ? 'var(--t-xl)' : 'var(--t-2xl)', margin: '18px 0 20px' }}>I’m Q, an AI interviewer. A person at Paystride reads every answer and makes the decision.</p>
              <div className="col t2" style={{ gap: 10, fontSize: 14.5, textAlign: 'left', maxWidth: 440, margin: '0 auto 28px' }}>
                {['Four questions. Pause whenever you like.', 'If your connection drops, nothing is lost.', 'Need more time or a different format? Just ask. It won’t count against you.'].map((t) => <div key={t} className="row" style={{ alignItems: 'flex-start' }}><ShieldCheck size={16} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />{t}</div>)}
              </div>
              <button className="btn btn-primary" onClick={begin} data-q="begin">I’m ready</button>
            </motion.div>
          ) : phase === 'done' ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', maxWidth: 520 }}>
              <div style={{ display: 'grid', placeItems: 'center' }}><QPresence size={narrow ? 130 : 180} state="done" /></div>
              <p className="voice" style={{ fontSize: narrow ? 'var(--t-xl)' : 'var(--t-2xl)', margin: '18px 0 8px' }}>That’s everything. Thank you, Femi.</p>
              <p className="t2" style={{ marginBottom: 24 }}>Paystride will reply within three working days. You’ll get a copy of the transcript.</p>
              <button className="btn btn-primary" onClick={() => nav(`/work?at=after${isFilm() ? '&film=1' : ''}`)} data-q="back-home">Back to Q</button>
            </motion.div>
          ) : (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: narrow ? 0 : 64, flexDirection: narrow ? 'column' : 'row', width: '100%', maxWidth: 1100, justifyContent: 'center', position: 'relative' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxWidth: 620 }}>
                <QPresence size={narrow ? 130 : 210} state={phase === 'dropped' ? 'idle' : q.state} />
                <QLine line={q.line} size={narrow ? 'var(--t-xl)' : 'var(--t-2xl)'} max="17em" />
              </div>
              <div style={narrow ? { position: 'fixed', top: 64, right: 16, zIndex: 3 } : {}}>
                <SelfView speaking={q.state === 'listening'} lowData={lowData} narrow={narrow} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="dockwrap" aria-label="Answer" style={{ position: 'relative', zIndex: 2, minHeight: 120 }}>
        {phase === 'live' && <Dock q={q} compact={narrow} />}
      </footer>

      <AnimatePresence>
        {phase === 'dropped' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', background: 'rgba(11,10,8,.78)', backdropFilter: 'blur(8px)', padding: 20 }}>
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} transition={gentle} className="moment" style={{ maxWidth: 440, textAlign: 'center' }}>
              <motion.div animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }}><WifiOff size={28} style={{ color: 'var(--warn)' }} /></motion.div>
              <p className="voice" style={{ fontSize: 'var(--t-xl)', margin: '14px 0 6px' }}>Connection lost. You’re safe.</p>
              <p className="t2" style={{ fontSize: 14.5, marginBottom: 20 }}>Both answers are saved. Dropping out never counts against you.</p>
              <div className="col" style={{ gap: 8 }}>
                <button className="btn btn-primary" onClick={() => resume.current(false)} data-q="rejoin"><RefreshCw size={15} /> Rejoin</button>
                <button className="btn btn-quiet" onClick={() => resume.current(true)} data-q="low-data"><CloudOff size={15} /> Continue in low-data text</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
