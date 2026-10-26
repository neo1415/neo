import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Check, FileSignature, Gavel, Heart, Mail, Scale, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { Avatar, Badge, Button, CheckDraw, Modal, QOrb, Toggle, celebrate, ease, spring, stagger, useToast } from '../../ui'
import { useStore } from '../../store'

const rubric = [['API reliability & incidents', 92, 78], ['PostgreSQL performance', 88, 74], ['Service design', 84, 86], ['Observability', 76, 60], ['Communication', 86, 90], ['Mutual index', 87, 80]]

export default function Decision() {
  const toast = useToast()
  const { set } = useStore()
  const [choice, setChoice] = useState(null)
  const [reason, setReason] = useState('')
  const [phase, setPhase] = useState('compare') // compare | offer | sent
  const [salary, setSalary] = useState(2000)
  const [feedback, setFeedback] = useState(true)
  const [open, setOpen] = useState(false)

  const sendOffer = () => {
    setOpen(false)
    setPhase('sent')
    set({ offerSent: true })
    setTimeout(() => celebrate(), 200)
    toast('Offer sent to Femi Okafor', { sub: 'Decision record #D-2041 saved · 3 other candidates notified with feedback', tone: 'gold', duration: 5000 })
  }

  if (phase === 'sent') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-block' }}><CheckDraw size={88} color="var(--gold)" /></div>
        <h1 style={{ fontSize: 40, marginTop: 26 }}>Offer sent.</h1>
        <p className="muted" style={{ fontSize: 16, marginTop: 10 }}>Femi has your offer of <b style={{ color: 'var(--text)' }}>${salary.toLocaleString()}/month</b>. Q will remind you if he hasn’t responded in 3 days.</p>
        <div className="card" style={{ marginTop: 28, textAlign: 'left' }}>
          {[['Decision record', 'Ada Nwosu & Tolu Bello · reason captured · rubric v3', ShieldCheck], ['Other candidates', '3 notified kindly, with competency feedback where permitted', Heart], ['Mandate', 'Closed on day 9 of 30 · 31 recruiter hours saved', Sparkles]].map(([t, d, I], i) => (
            <motion.div key={t} {...stagger(i + 2, 0.1)} className="row" style={{ padding: '14px 18px', gap: 14, borderBottom: i < 2 ? '1px solid var(--line)' : 0 }}><span className="ic-box gold"><I size={17} /></span><div><div style={{ fontWeight: 600 }}>{t}</div><div className="muted small">{d}</div></div><span className="grow" /><Check size={16} color="var(--green)" /></motion.div>
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <div>
      <div className="page-head">
        <div><div className="small muted">Backend Engineer · v3 · Final round</div><h1>Compare & decide</h1></div>
        <Badge tone="dark" icon={Gavel}>A human makes this decision</Badge>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card">
          <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="card-title grow">Against your original rubric</div>
            <div className="row small" style={{ gap: 16 }}><span className="row"><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--gold)' }} />Femi</span><span className="row"><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--blue)' }} />Kwame</span></div>
          </div>
          <div style={{ padding: 18 }}>
            {rubric.map(([l, a, b], i) => (
              <div key={l} style={{ marginBottom: 16 }}>
                <div className="row between small" style={{ fontWeight: 550 }}><span>{l}</span><span className="muted">{a} · {b}</span></div>
                {[[a, 'var(--gold)'], [b, 'var(--blue)']].map(([v, c], k) => (
                  <div key={k} style={{ height: 8, borderRadius: 9, background: 'var(--paper-2)', marginTop: 5, overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: v + '%' }} transition={{ delay: 0.1 + i * 0.08 + k * 0.05, duration: 0.8, ease }} style={{ height: '100%', background: c, borderRadius: 9 }} /></div>
                ))}
              </div>
            ))}
          </div>
          <div className="row" style={{ padding: 16, gap: 12, borderTop: '1px solid var(--line)', background: 'var(--violet-soft)', borderRadius: '0 0 14px 14px' }}>
            <QOrb size={26} />
            <div className="grow small"><Badge tone="violet" icon={Bot}>AI advice</Badge> <span style={{ marginLeft: 6 }}>Femi is stronger on your two must-haves; Kwame communicates slightly better and is cheaper. Both are viable. Evidence coverage: Femi 82%, Kwame 76%.</span></div>
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          {[['femi', 'Femi Okafor', 'Kudi Ledger · 7 yrs · Lagos', '$1,800–2,100', 'Task 84 · Screen 90'], ['kwame', 'Kwame Mensah', 'Payments · 5 yrs · Accra', '$1,600–1,900', 'Task 71 · Screen 82']].map(([id, n, s, pay, ev], i) => (
            <motion.button key={id} {...stagger(i)} className={`option ${choice === id ? 'on' : ''}`} onClick={() => setChoice(id)} style={{ padding: 16 }} data-q={`choose-${id}`}>
              <Avatar name={n} size={44} />
              <span className="grow"><div style={{ fontWeight: 650, fontSize: 15 }}>{n}</div><div className="muted small">{s}</div><div className="row tiny" style={{ marginTop: 6, gap: 6 }}><Badge>{pay}</Badge><Badge tone="green">{ev}</Badge></div></span>
              <span className="tick">{choice === id && <Check size={12} strokeWidth={3} />}</span>
            </motion.button>
          ))}
          <div className="card pad">
            <div className="card-title row"><Scale size={16} /> Decision record</div>
            <p className="muted small" style={{ marginTop: 4 }}>Required. Stored with rubric and model versions for audit.</p>
            <textarea className="input" rows={3} style={{ marginTop: 10 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this candidate, in your words…" data-q="decision-reason" />
            <div className="row" style={{ marginTop: 10, gap: 10 }}>
              <Toggle on={feedback} onChange={setFeedback} label="Send feedback" /><span className="small">Send kind, rubric-based feedback to the others</span>
            </div>
            <Button variant="gold" size="lg" style={{ width: '100%', marginTop: 16 }} disabled={!choice || reason.length < 8} icon={FileSignature} onClick={() => setOpen(true)} data-q="make-offer">Record decision & prepare offer</Button>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} width={520}>
        <div style={{ padding: 24 }}>
          <div className="row" style={{ gap: 12 }}><Avatar name="Femi Okafor" size={42} /><div><div className="card-title">Offer for Femi Okafor</div><div className="muted small">Backend Engineer · Remote (WAT ±2h)</div></div></div>
          <div className="field" style={{ marginTop: 20 }}>
            <div className="row between"><label>Monthly salary (USD)</label><motion.b key={salary} initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ fontFamily: 'var(--display)', fontSize: 22 }}>${salary.toLocaleString()}</motion.b></div>
            <input type="range" className="range" min={1800} max={2200} step={50} value={salary} onChange={(e) => setSalary(+e.target.value)} style={{ '--p': ((salary - 1800) / 400) * 100 + '%' }} />
            <div className="row small" style={{ gap: 6, color: salary > 2000 ? 'var(--amber)' : 'var(--green)' }}>{salary > 2000 ? 'Above mandate ceiling — needs approval from Tolu' : <><Check size={13} /> Within budget and his stated range</>}</div>
          </div>
          <div className="grid g2" style={{ marginTop: 14, gap: 10 }}>
            <div className="field"><label>Start date</label><input className="input" defaultValue="1 December 2026" /></div>
            <div className="field"><label>Response by</label><input className="input" defaultValue="5 November 2026" /></div>
          </div>
          <div className="row small muted" style={{ marginTop: 14, gap: 8 }}><Mail size={14} /> Sent via Talent Q and your Google Workspace domain</div>
          <div className="row" style={{ marginTop: 20, gap: 10 }}><span className="grow" /><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="gold" icon={Send} onClick={sendOffer} data-q="send-offer">Send offer</Button></div>
        </div>
      </Modal>
    </div>
  )
}
