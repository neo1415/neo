import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowUp, Check, ClipboardList, GitBranch, History, Mic, Paperclip, Scale, ShieldCheck, Sparkles, Target, UserCheck, Wallet } from 'lucide-react'
import { Badge, Button, QOrb, Typing, ease, spring, useToast } from '../../ui'
import { useStore } from '../../store'

const script = [
  { q: 'Tell me about the work you need done. Outcomes matter more than job titles — talk to me like you would a colleague.' },
  { q: 'Thanks — that’s clear. Which outcome matters most in the first 90 days?', chips: ['Stop the API outages', 'Speed up the database', 'Both, equally'] },
  { q: 'Can this person work remotely if they overlap your hours (WAT ±2h)?', chips: ['Remote is fine', 'Must be in Lagos', 'Hybrid, 2 days'] },
  { q: 'Who makes the final hiring decision?', chips: ['Me', 'Me and our CTO, Tolu'] },
  { feasibility: true, q: 'One honest flag before I search.' },
  { q: 'Mandate v2 is ready. I’ll search only permissioned sources and show you what I don’t know. Start the search?', confirm: true },
]

const options = [
  { id: 'budget', icon: Wallet, t: 'Raise budget to $2,600/mo', d: 'Keeps “senior”. Pool: ~38 matching profiles', tone: '' },
  { id: 'mid', icon: UserCheck, t: 'Strong mid-level, 5+ yrs, evidence-first', d: 'Keeps budget. Pool: ~64 profiles · recommended', tone: 'gold' },
  { id: 'junior', icon: Sparkles, t: 'Train a junior hire + contractor support', d: '$900/mo + mentoring. Pool: 120+', tone: '' },
  { id: 'narrow', icon: Target, t: 'Narrow scope: drop Go, Node only', d: 'Pool: ~51 profiles', tone: '' },
]

function Feasibility({ onPick, picked }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginTop: 10, padding: 14, borderRadius: 14, background: 'var(--amber-soft)', border: '1px solid #f1ddb6' }}>
      <div className="row" style={{ fontWeight: 650, color: 'var(--amber)' }}><AlertTriangle size={16} /> Hiring feasibility review</div>
      <p className="small" style={{ marginTop: 6, color: '#6b4f1c', lineHeight: 1.55 }}>Senior backend engineers with production incident evidence in this market typically expect <b>$2,400–3,200/mo</b>. Your ceiling is <b>$2,000</b>. Searching as-is would likely return few interested people.</p>
      <div className="col" style={{ gap: 8, marginTop: 12 }}>
        {options.map((o, i) => (
          <motion.button key={o.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.08 }} whileHover={{ x: 3 }} className={`option ${picked === o.id ? 'on' : ''}`} style={{ padding: 12, ...(o.tone === 'gold' && !picked ? { borderColor: 'var(--gold-2)' } : {}) }} onClick={() => !picked && onPick(o)} disabled={!!picked && picked !== o.id} data-q={`feas-${o.id}`}>
            <span className={`ic-box ${o.tone}`} style={{ width: 34, height: 34 }}><o.icon size={16} /></span>
            <span className="grow"><div style={{ fontWeight: 600, fontSize: 13.5 }}>{o.t}</div><div className="muted small">{o.d}</div></span>
            {picked === o.id ? <Badge tone="green" icon={Check}>Chosen</Badge> : o.tone === 'gold' ? <Badge tone="gold">Q suggests</Badge> : null}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

function Section({ icon: Icon, title, children, show, delay = 0, highlight }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, delay, ease }} style={{ overflow: 'hidden' }}>
          <motion.div animate={highlight ? { backgroundColor: ['rgba(201,160,75,.25)', 'rgba(201,160,75,0)'] } : {}} transition={{ duration: 1.6 }} style={{ padding: '14px 18px', borderTop: '1px solid var(--line)' }}>
            <div className="row small" style={{ fontWeight: 650, color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 11 }}><Icon size={13} /> {title}</div>
            <div style={{ marginTop: 10 }}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Intake() {
  const nav = useNavigate()
  const toast = useToast()
  const { set } = useStore()
  const [msgs, setMsgs] = useState([])
  const [stage, setStage] = useState(0)
  const [thinking, setThinking] = useState(true)
  const [text, setText] = useState('')
  const [answers, setAnswers] = useState({})
  const [picked, setPicked] = useState(null)
  const [version, setVersion] = useState(0)
  const [searching, setSearching] = useState(false)
  const [voice, setVoice] = useState(false)
  const endRef = useRef(null)

  const qSay = (i, delay = 900) => {
    setThinking(true)
    setTimeout(() => {
      setThinking(false)
      setMsgs((m) => [...m, { who: 'q', i, ...script[i] }])
      setStage(i)
    }, delay)
  }
  useEffect(() => { qSay(0, 700) }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, thinking])

  const answer = (txt) => {
    setMsgs((m) => [...m, { who: 'me', text: txt }])
    setAnswers((a) => ({ ...a, [stage]: txt }))
    if (stage === 0) setVersion(1)
    if (stage < 4) qSay(stage + 1, stage === 0 ? 1600 : 1000)
  }
  const send = () => { if (text.trim()) { answer(text.trim()); setText('') } }
  const pick = (o) => {
    setPicked(o.id)
    setMsgs((m) => [...m, { who: 'me', text: o.t }])
    setTimeout(() => { setVersion(2); set({ mandateVersion: 2 }); toast('Mandate v2 saved', { sub: 'Budget kept · seniority adjusted · v1 preserved in history', tone: 'gold' }) }, 500)
    qSay(5, 1400)
  }
  const start = () => {
    setSearching(true)
    setTimeout(() => nav('/app/shortlist'), 2200)
  }

  const remote = answers[2] || 'Remote, WAT ±2h'
  const decider = answers[3] || ''
  const focus = answers[1] || ''

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 18, height: 'calc(100vh - 120px)' }}>
      {/* Chat */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', gap: 12 }}>
          <QOrb size={30} thinking={thinking} />
          <div className="grow"><div style={{ fontWeight: 650 }}>New mandate with Q</div><div className="muted tiny">Conversational intake · text or voice</div></div>
          <Badge tone="green" dot pulse>Live</Badge>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, background: 'linear-gradient(180deg, #fbfaf6, #fff)' }}>
          <AnimatePresence initial={false}>
            {msgs.map((m, k) => (
              <motion.div key={k} layout initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className="row" style={{ alignItems: 'flex-start', gap: 10, justifyContent: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
                {m.who === 'q' && <QOrb size={26} />}
                <div className={`msg ${m.who}`}>
                  {m.text || m.q}
                  {m.feasibility && <Feasibility onPick={pick} picked={picked} />}
                  {m.chips && stage === m.i && !answers[m.i] && (
                    <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
                      {m.chips.map((c, ci) => <motion.button key={c} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + ci * 0.07 }} className="chip" style={{ height: 30, fontSize: 12.5 }} onClick={() => answer(c)} data-q={`chip-${m.i}-${ci}`}>{c}</motion.button>)}
                    </div>
                  )}
                  {m.confirm && (
                    <div className="row" style={{ marginTop: 12 }}>
                      <Button variant="gold" icon={searching ? undefined : Sparkles} loading={searching} onClick={start} data-q="start-search">{searching ? 'Searching permissioned sources…' : 'Confirm & start search'}</Button>
                      {!searching && <Button variant="ghost">Edit first</Button>}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {thinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="row" style={{ gap: 10 }}>
              <QOrb size={26} thinking />
              <div className="msg q" style={{ padding: '8px 14px' }}><Typing /></div>
            </motion.div>
          )}
          {searching && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: 14 }}>
              {['Candidate-owned profiles', 'Your consented past applicants', 'Licensed partner network', 'Permitted public work'].map((s, i) => (
                <motion.div key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.35 }} className="row small" style={{ gap: 10, padding: '5px 0' }}>
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.35 + 0.3, ...spring }} style={{ color: 'var(--green)' }}><Check size={14} strokeWidth={3} /></motion.span>{s}
                  <span className="grow" /><span className="faint tiny">{[312, 46, 128, 89][i]} scanned</span>
                </motion.div>
              ))}
            </motion.div>
          )}
          <div ref={endRef} />
        </div>
        <div style={{ padding: 14, borderTop: '1px solid var(--line)' }}>
          <AnimatePresence>
            {voice && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 44, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="row center" style={{ gap: 3, marginBottom: 8 }}>
                {Array.from({ length: 36 }).map((_, i) => <motion.i key={i} animate={{ height: [6, 8 + Math.random() * 26, 6] }} transition={{ duration: 0.6 + Math.random() * 0.5, repeat: Infinity }} style={{ width: 3, borderRadius: 3, background: 'var(--gold)' }} />)}
                <span className="small muted" style={{ marginLeft: 12 }}>Listening…</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="row" style={{ gap: 8, padding: 6, borderRadius: 14, border: '1px solid var(--line-2)', background: '#fff' }}>
            <button className="btn ghost icon" aria-label="Attach"><Paperclip size={17} /></button>
            <textarea className="grow" rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={stage === 0 ? 'e.g. We need someone who can stop our API failures…' : 'Reply to Q…'} style={{ border: 0, outline: 'none', resize: 'none', fontSize: 14, padding: '9px 4px', background: 'none' }} data-q="intake-input" />
            <button className={`btn icon ${voice ? 'gold' : 'ghost'}`} onClick={() => setVoice(!voice)} aria-label="Voice"><Mic size={17} /></button>
            <motion.button whileTap={{ scale: 0.9 }} className="btn primary icon" onClick={send} disabled={!text.trim()} aria-label="Send" data-q="intake-send"><ArrowUp size={17} /></motion.button>
          </div>
        </div>
      </div>

      {/* Live mandate */}
      <div className="card" style={{ overflowY: 'auto' }}>
        <div className="row" style={{ padding: '14px 18px', gap: 10, position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
          <ClipboardList size={18} color="var(--gold)" />
          <div className="grow"><div style={{ fontWeight: 650 }}>Hiring mandate</div><div className="muted tiny">Builds as you talk · you confirm before anything runs</div></div>
          <AnimatePresence mode="wait">
            {version > 0 && <motion.span key={version} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}><Badge tone={version === 2 ? 'gold' : ''} icon={GitBranch}>v{version}{version === 2 ? ' · adjusted' : ' · draft'}</Badge></motion.span>}
          </AnimatePresence>
        </div>
        {version === 0 && <div style={{ padding: '40px 24px', textAlign: 'center' }} className="muted"><div className="skel" style={{ height: 14, width: '70%', margin: '0 auto' }} /><div className="skel" style={{ height: 14, width: '50%', margin: '10px auto' }} /><p className="small" style={{ marginTop: 16 }}>Your mandate will appear here as you describe the role.</p></div>}
        <Section icon={Target} title="Role" show={version > 0}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>{version === 2 ? 'Backend Engineer (mid–senior)' : 'Senior Backend Engineer'}</div>
          <div className="muted small" style={{ marginTop: 4 }}>Make the payments API reliable and the database fast.</div>
        </Section>
        <Section icon={Sparkles} title="Outcomes in 90 days" show={version > 0} delay={0.1}>
          {['Reduce API incidents from ~6/month to ≤1', 'Bring p95 latency under 300ms', 'Own on-call runbooks & post-mortems'].map((o, i) => <motion.div key={o} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="row small" style={{ marginTop: 6 }}><Check size={14} color="var(--green)" />{o}{focus && i === (focus.includes('database') ? 1 : 0) && <Badge tone="gold">Priority</Badge>}</motion.div>)}
        </Section>
        <Section icon={Scale} title="Competencies & weights" show={version > 0} delay={0.2}>
          {[['API reliability & incident response', 30, true], ['PostgreSQL performance', 25, true], ['Node.js / Go service design', 20], ['Observability (tracing, SLOs)', 15], ['Written async communication', 10]].map(([l, w, must], i) => (
            <div key={l} style={{ marginTop: i ? 10 : 0 }}>
              <div className="row between small"><span className="row">{l}{must && <Badge tone="dark">Must</Badge>}</span><b>{w}%</b></div>
              <div className="meter" style={{ marginTop: 5, height: 5 }}><motion.i initial={{ width: 0 }} animate={{ width: w * 3 + '%' }} transition={{ delay: 0.4 + i * 0.08, duration: 0.7, ease }} /></div>
            </div>
          ))}
        </Section>
        <Section icon={Wallet} title="Conditions" show={version > 0} delay={0.3} highlight={version === 2}>
          <div className="grid g2" style={{ gap: 8 }}>
            {[['Budget', '$1,800–2,000/mo'], ['Location', remote], ['Experience', version === 2 ? '5+ yrs, evidence-first' : 'Senior (7+ yrs)'], ['Start', 'Within 6 weeks']].map(([k, v]) => (
              <div key={k} style={{ padding: 10, borderRadius: 10, background: 'var(--paper)', border: '1px solid var(--line)' }}><div className="tiny muted">{k}</div><motion.div key={v} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="small" style={{ fontWeight: 600 }}>{v}</motion.div></div>
            ))}
          </div>
        </Section>
        <Section icon={ClipboardList} title="Assessment plan" show={stage >= 3} delay={0.1}>
          <div className="row" style={{ gap: 6 }}>
            {['Q structured screen', 'Practical: debug slow API', 'Human final interview'].map((s, i) => <span key={s} className="row" style={{ gap: 6 }}><Badge tone={i === 2 ? 'dark' : ''}>{s}</Badge>{i < 2 && <span className="faint">→</span>}</span>)}
          </div>
        </Section>
        <Section icon={ShieldCheck} title="Decision & governance" show={!!decider} delay={0.1}>
          <div className="small">Final decision: <b>{decider === 'Me' ? 'Ada Nwosu' : 'Ada Nwosu + Tolu (CTO)'}</b></div>
          <div className="small muted" style={{ marginTop: 4 }}>Q may propose; humans decide. Protected traits excluded from scoring.</div>
        </Section>
        {version === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="row small muted" style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', gap: 8 }}><History size={13} /> v1 “Senior, 7+ yrs” preserved · changed by Ada · reason: budget feasibility</motion.div>
        )}
      </div>
    </div>
  )
}
