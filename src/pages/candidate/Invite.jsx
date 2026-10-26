import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Building2, CalendarClock, Check, Clock, EyeOff, Keyboard, Lock, MapPin, Mic, ShieldCheck, Unlock, Video, Wallet, X } from 'lucide-react'
import { Avatar, Badge, Button, CheckDraw, Modal, QOrb, Toggle, ease, spring, stagger, useToast } from '../../ui'
import { useStore } from '../../store'

export default function Invite() {
  const nav = useNavigate()
  const toast = useToast()
  const { set } = useStore()
  const [state, setState] = useState('pending') // pending | accepted
  const [share, setShare] = useState({ summary: true, evidence: true, employer: false, salary: false })
  const [decline, setDecline] = useState(false)
  const [format, setFormat] = useState('text')
  const accept = () => {
    setState('accepted')
    set({ inviteStatus: 'accepted' })
    toast('Interest confirmed', { sub: 'Paystride can now see what you chose to share', tone: 'gold' })
  }
  return (
    <div style={{ maxWidth: 1080 }}>
      <div className="page-head">
        <div><div className="small muted">Invites</div><h1>Confidential interest check</h1></div>
        <Badge icon={Clock}>Respond by 31 Oct · no pressure</Badge>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <motion.div {...stagger(0)} className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 24, background: 'linear-gradient(180deg, var(--gold-soft), #fff)' }}>
            <div className="row" style={{ gap: 14 }}>
              <AnimatePresence mode="wait">
                {state === 'accepted' ? (
                  <motion.div key="a" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.5 }}><Avatar name="Paystride" size={56} hue={1} /></motion.div>
                ) : (
                  <motion.div key="h" exit={{ rotateY: -90 }} transition={{ duration: 0.3 }} className="ic-box dark" style={{ width: 56, height: 56, borderRadius: 50 }}><Lock size={22} /></motion.div>
                )}
              </AnimatePresence>
              <div>
                <AnimatePresence mode="wait">
                  <motion.div key={state} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700 }}>{state === 'accepted' ? 'Paystride' : 'Series A fintech · 42 people'}</motion.div>
                </AnimatePresence>
                <div className="muted">Backend Engineer — API reliability</div>
              </div>
            </div>
            <p style={{ marginTop: 18, lineHeight: 1.65 }}>Hi Femi, a <b>{state === 'accepted' ? 'Paystride' : '42-person Series A fintech'}</b> in Lagos is hiring a Backend Engineer to make their payments API reliable. Your work cutting p95 latency on a high-volume ledger looks highly relevant.</p>
          </div>
          <div style={{ padding: 24 }}>
            <div className="card-title">How this fits what you told Q</div>
            <div className="grid g3" style={{ marginTop: 12, gap: 10 }}>
              {[[Wallet, 'Pay', '$1,800–2,000/mo', 'Meets your $1,800 minimum'], [MapPin, 'Work pattern', 'Remote · WAT ±2h', 'Matches “Remote”'], [CalendarClock, 'Start', 'Within 6 weeks', 'Fits 4 weeks notice']].map(([I, l, v, d], i) => (
                <motion.div key={l} {...stagger(i + 1)} className="card" style={{ padding: 14 }}>
                  <div className="row tiny muted"><I size={12} />{l}</div><div style={{ fontWeight: 650, marginTop: 4 }}>{v}</div>
                  <div className="row tiny" style={{ color: 'var(--green)', marginTop: 6, fontWeight: 600 }}><Check size={12} strokeWidth={3} />{d}</div>
                </motion.div>
              ))}
            </div>
            <div className="card-title" style={{ marginTop: 22 }}>Why you were invited</div>
            {['Cut p95 latency 41% on a 30M-req/day payments API', 'Led 14 incident post-mortems as on-call lead', 'PostgreSQL partitioning of a 2B-row ledger'].map((e) => <div key={e} className="row small" style={{ marginTop: 8 }}><Check size={14} color="var(--gold)" />{e}</div>)}
            <div className="row small muted" style={{ marginTop: 18, gap: 8 }}><ShieldCheck size={14} />This employer committed to reviewing within 3 working days and giving feedback.</div>
          </div>
        </motion.div>

        <div className="col" style={{ gap: 14 }}>
          <AnimatePresence mode="wait">
            {state === 'pending' ? (
              <motion.div key="p" exit={{ opacity: 0, scale: 0.97 }} className="col" style={{ gap: 14 }}>
                <motion.div {...stagger(1)} className="card pad">
                  <div className="card-title">If you accept, they’ll see</div>
                  <p className="muted small" style={{ marginTop: 4 }}>Selective disclosure — you can change this later.</p>
                  {[['summary', 'Professional summary & experience', false], ['evidence', 'Evidence wallet (3 verified items)', false], ['employer', 'Current employer name', true], ['salary', 'Exact pay expectation', true]].map(([k, l, sensitive]) => (
                    <div key={k} className="row" style={{ marginTop: 14, gap: 12 }}>
                      {share[k] ? <Unlock size={15} color="var(--green)" /> : <EyeOff size={15} color="var(--muted)" />}
                      <span className="grow small" style={{ fontWeight: 550 }}>{l}{sensitive && <span className="faint"> · hidden by default</span>}</span>
                      <Toggle on={share[k]} onChange={(v) => setShare({ ...share, [k]: v })} label={l} />
                    </div>
                  ))}
                </motion.div>
                <motion.div {...stagger(2)} className="card pad col" style={{ gap: 8 }}>
                  <Button variant="gold" size="lg" icon={Check} onClick={accept} data-q="accept-invite">I’m interested</Button>
                  <div className="row" style={{ gap: 8 }}>
                    <Button style={{ flex: 1 }} icon={Clock} onClick={() => toast('Deferred for 2 weeks', { sub: 'We’ll check back on 9 Nov', tone: 'info' })}>Not now</Button>
                    <Button style={{ flex: 1 }} variant="danger" icon={X} onClick={() => setDecline(true)}>Decline</Button>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div key="a" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }} className="card pad">
                <div className="row" style={{ gap: 14 }}><CheckDraw size={44} /><div><div className="card-title">You’re in the running</div><div className="muted small">Next: a short structured screen with Q</div></div></div>
                <div className="card-title" style={{ marginTop: 22, fontSize: 14 }}>Choose how you’d like to do it</div>
                <div className="col" style={{ gap: 8, marginTop: 10 }}>
                  {[['text', Keyboard, 'Text chat', 'Best on low bandwidth · pause anytime'], ['voice', Mic, 'Voice', '≈ 15 min · transcript shared with you'], ['video', Video, 'Video', 'Optional · never required']].map(([k, I, t, d]) => (
                    <button key={k} className={`option ${format === k ? 'on' : ''}`} style={{ padding: 12 }} onClick={() => setFormat(k)} data-q={`format-${k}`}>
                      <span className={`ic-box ${format === k ? 'dark' : ''}`} style={{ width: 34, height: 34 }}><I size={16} /></span>
                      <span className="grow"><div style={{ fontWeight: 600, fontSize: 13.5 }}>{t}</div><div className="muted tiny">{d}</div></span>
                    </button>
                  ))}
                </div>
                <Button variant="primary" size="lg" style={{ width: '100%', marginTop: 16 }} iconRight={ArrowRight} onClick={() => nav('/me/interview')} data-q="start-interview">Start screen now</Button>
                <p className="tiny muted" style={{ marginTop: 10, textAlign: 'center' }}>Or schedule for later — your progress is always saved.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal open={decline} onClose={() => setDecline(false)} width={460}>
        <div style={{ padding: 24 }}>
          <div className="card-title" style={{ fontSize: 18 }}>Decline this invite?</div>
          <p className="muted small" style={{ marginTop: 6 }}>Optional: tell Q why, so you get better matches. The employer only sees “declined”.</p>
          <div className="col" style={{ gap: 8, marginTop: 14 }}>{['Pay too low', 'Not the right role', 'Bad timing', 'Don’t contact me about similar roles'].map((r) => <button key={r} className="option" style={{ padding: 12 }} onClick={() => { setDecline(false); toast('Declined politely', { sub: r }) }}><span className="small" style={{ fontWeight: 550 }}>{r}</span></button>)}</div>
        </div>
      </Modal>
    </div>
  )
}
