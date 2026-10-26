import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, Check, Code2, Download, Github, Lock, Mic, Trash2, UserCheck } from 'lucide-react'
import { Avatar, Fact, MomentHead } from '../ui/kit'
import { ChatView } from './Chat'
import { PageHead } from './Shell'

const fade = (i) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.04, duration: 0.35, ease: [0, 0, 0.2, 1] } })

const jobs = [
  { id: 'paystride', co: 'Paystride', role: 'Backend Engineer', where: 'Remote · WAT', pay: '$1.8–2k', fit: 83, want: 91, state: 'Offer' },
  { id: 'kora', co: 'Kora Health', role: 'Platform Engineer', where: 'Remote · Africa', pay: '$1.9–2.4k', fit: 81, want: 84, state: 'Screen Thu' },
  { id: 'northwind', co: 'Northwind Logistics', role: 'Backend Engineer (Go)', where: 'Remote · EU overlap', pay: '€3.2–3.8k', fit: 78, want: 72, state: 'New' },
  { id: 'ledgerline', co: 'Ledgerline', role: 'Senior SRE', where: 'Lagos · hybrid', pay: '$2.2–2.6k', fit: 74, want: 66, state: 'New' },
]

const Card = ({ children }) => <div className="moment" style={{ maxWidth: 'none', padding: '18px 20px', marginTop: 14 }}>{children}</div>

function OfferCardYou() {
  return (
    <Card>
      <MomentHead label="Offer · Paystride" right={<span className="label">Reply by Nov 5</span>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}><Fact k="Pay" v="$2,000 · above your $1.8k" tone="ok" /><Fact k="Work" v="Remote · WAT" tone="ok" /><Fact k="Starts" v="December 1" tone="ok" /></div>
      <p className="t2" style={{ fontSize: 14, marginTop: 12 }}>Similar remote roles for your evidence pay $1,900–2,300. Asking a question won’t withdraw the offer.</p>
      <div className="row" style={{ gap: 8, marginTop: 14 }}><Link className="btn btn-gold btn-sm" to="/work?at=after">Open offer</Link><button className="btn btn-text btn-sm">Ask Paystride a question</button></div>
    </Card>
  )
}
function PrepCard() {
  return (
    <Card>
      <MomentHead label="Practice · private, never shared" />
      {['Walk me through the first 15 minutes of an outage.', 'How do pod autoscaling and a connection pool interact?', 'Tell me about a decision you’d make differently.'].map((q, i) => <div key={q} className="row" style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 0, fontSize: 14.5 }}><span className="label num" style={{ width: 24 }}>{i + 1}</span>{q}</div>)}
      <div className="row" style={{ gap: 8, marginTop: 12 }}><button className="btn btn-primary btn-sm"><Mic size={14} /> Practice out loud</button></div>
    </Card>
  )
}
function SeeCard() {
  return (
    <Card>
      <MomentHead label="What employers see" />
      {[['Summary and experience', true], ['Three verified pieces of evidence', true], ['Your current employer', false], ['Your exact pay expectation', false]].map(([t, on], i) => <div key={t} className="row" style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 0, fontSize: 14.5, color: on ? 'var(--text)' : 'var(--text-3)' }}><span className="grow">{t}</span>{on ? <span className="chip ok">Shared</span> : <span className="chip"><Lock size={12} /> Hidden</span>}</div>)}
    </Card>
  )
}

const youSeeds = {
  c1: [{ who: 'me', text: 'Is the Paystride offer fair?' }, { who: 'q', text: 'Yes. It’s above your minimum and in the middle of what people with your evidence earn for remote roles. It meets every preference you set.', card: 'offer' }],
  c2: [{ who: 'me', text: 'Help me prep for my interview' }, { who: 'q', text: 'Kora Health’s screen is on Thursday. These three come up most for platform roles. Practice is private: employers never see it.', card: 'prep' }],
  c3: [{ who: 'me', text: 'What will employers see?' }, { who: 'q', text: 'Only what you allow. Right now that’s your summary and three verified pieces of evidence. Kudi Ledger is blocked completely.', card: 'see' }],
}
const youReply = (text) => {
  const t = text.toLowerCase()
  if (/(offer|fair|salary|pay)/.test(t)) return { text: 'It’s above your minimum and in the middle of the market for your evidence. Here it is.', card: 'offer' }
  if (/(prep|practice|interview)/.test(t)) return { text: 'Here are the questions most likely to come up. Practice is private.', card: 'prep' }
  if (/(see|privacy|employer|visible)/.test(t)) return { text: 'Only what you allow. Kudi Ledger can never see you.', card: 'see' }
  return { text: 'I can help with offers, interview prep, your privacy and finding roles. For example:', chips: true }
}
export function YouChat() {
  const cards = () => ({ offer: <OfferCardYou />, prep: <PrepCard />, see: <SeeCard /> })
  return <ChatView seeds={youSeeds} reply={youReply} cards={cards} suggestions={['Is the Paystride offer fair?', 'Help me prep for Thursday', 'What will employers see?']} greeting="What’s on your mind, Femi?" voiceTo="/work?at=after" />
}

function AskBar({ text }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav('/you/chat/new')} className="row" style={{ width: '100%', height: 52, borderRadius: 'var(--r-pill)', border: '1px solid var(--line-2)', background: 'var(--ink-2)', padding: '0 8px 0 20px', color: 'var(--text-3)', fontSize: 15, marginBottom: 36 }}>
      <span className="grow" style={{ textAlign: 'left' }}>{text}</span>
      <span className="row" style={{ width: 38, height: 38, borderRadius: '50%', justifyContent: 'center', color: 'var(--gold)', border: '1px solid var(--gold-line)' }}><Mic size={16} strokeWidth={1.75} /></span>
    </button>
  )
}

export function YouToday() {
  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <PageHead kicker="Confidential mode · Kudi Ledger blocked" title="You have an offer" sub="Paystride replied inside their promised three days." />
      <AskBar text="Ask Q about an offer, a job or your profile…" />
      <OfferCardYou />
      <div className="label" style={{ margin: '44px 0 10px' }}>Coming up</div>
      {[['Kora Health', 'Platform Engineer · Q screen, Thursday 11:00', 'Prepare'], ['Northwind Logistics', 'New match · Mutual 75 · remote, EU overlap', 'Look']].map(([c, d, a], i) => (
        <motion.div key={c} {...fade(i)} className="row" style={{ padding: '16px 0', borderTop: '1px solid var(--line)', gap: 14 }}>
          <Avatar name={c} size={36} /><div className="grow"><div style={{ fontSize: 15.5 }}>{c}</div><div className="t2" style={{ fontSize: 14 }}>{d}</div></div>
          <Link to={a === 'Prepare' ? '/you/chat/c2' : '/you/jobs'} className="btn btn-quiet btn-sm">{a}</Link>
        </motion.div>
      ))}
    </div>
  )
}

export function Jobs() {
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHead title="Jobs for you" sub="Ranked by fit both ways: what you can do, and what you asked for." />
      {jobs.map((j, i) => (
        <motion.div key={j.id} {...fade(i)} className="row" style={{ padding: '20px 0', borderTop: '1px solid var(--line)', gap: 16 }}>
          <Avatar name={j.co} size={42} />
          <div className="grow"><div style={{ fontSize: 16 }}>{j.role} <span className="t3" style={{ fontSize: 13.5 }}>· {j.co}</span></div><div className="t2" style={{ fontSize: 14 }}>{j.where} · {j.pay}</div></div>
          <span className={`chip ${j.state === 'Offer' ? 'gold' : j.state === 'New' ? '' : 'ok'}`}>{j.state}</span>
          <span className="voice num hide-md" style={{ fontSize: 22, color: 'var(--gold)', width: 40, textAlign: 'right' }}>{Math.round(Math.sqrt(j.fit * j.want))}</span>
        </motion.div>
      ))}
      <p className="t3" style={{ fontSize: 13, marginTop: 16 }}>2 roles weren’t shown: they need on-site work in Abuja, which you excluded.</p>
    </div>
  )
}

export function Applications() {
  const steps = ['Invited', 'You said yes', 'Q interview', 'Reviewed', 'Offer']
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHead title="Applications" sub="Live status from employers who promised to reply." />
      {[['Paystride', 'Backend Engineer', 5], ['Kora Health', 'Platform Engineer', 2], ['Northwind Logistics', 'Backend Engineer (Go)', 0]].map(([c, r, n], i) => (
        <motion.div key={c} {...fade(i)} style={{ padding: '22px 0', borderTop: '1px solid var(--line)' }}>
          <div className="row" style={{ gap: 12, marginBottom: 14 }}><Avatar name={c} size={34} /><div className="grow"><div style={{ fontSize: 15.5 }}>{c}</div><div className="t3" style={{ fontSize: 13 }}>{r}</div></div>{n === 5 && <span className="chip gold">Offer</span>}</div>
          <div className="row" style={{ gap: 4 }}>{steps.map((s, k) => <div key={s} style={{ flex: 1 }}><div style={{ height: 3, borderRadius: 3, background: k < n ? 'var(--gold)' : 'var(--ink-3)' }} /><div className="label hide-md" style={{ marginTop: 8, color: k < n ? 'var(--text-2)' : 'var(--text-3)' }}>{s}</div></div>)}</div>
        </motion.div>
      ))}
    </div>
  )
}

export function Evidence() {
  const items = [[Code2, 'Practical task: debug a slow payments API', 'Score 84 · confirmed by a qualified engineer', 'Verified'], [UserCheck, 'Reference: incident leadership', 'From a former engineering manager', 'Verified'], [Github, 'ledger-partition-tools', 'Public repo you chose', 'Linked'], [Award, 'AWS Solutions Architect', 'Checking with the issuer', 'Pending']]
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHead title="My evidence" sub="Prove it once. Reuse it with any employer you choose." />
      {items.map(([I, t, d, s], i) => (
        <motion.div key={t} {...fade(i)} className="row" style={{ padding: '18px 0', borderTop: '1px solid var(--line)', gap: 16 }}>
          <I size={18} strokeWidth={1.75} style={{ color: 'var(--gold)' }} /><div className="grow"><div style={{ fontSize: 15.5 }}>{t}</div><div className="t2" style={{ fontSize: 14 }}>{d}</div></div>
          <span className={`chip ${s === 'Verified' ? 'ok' : s === 'Pending' ? 'warn' : ''}`}>{s}</span>
        </motion.div>
      ))}
      <p className="t2" style={{ fontSize: 14.5, marginTop: 24 }}>Your task result saved you two repeat tests: Kora Health accepted it instead of their own.</p>
    </div>
  )
}

export function Privacy() {
  const [vis, setVis] = useState('Confidential')
  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <PageHead title="Privacy" sub="You decide who sees you, and you can take everything with you." />
      <div className="label" style={{ marginBottom: 10 }}>Visibility</div>
      <div className="row" style={{ gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {['Open', 'Confidential', 'Hidden'].map((v) => <button key={v} className="chip" style={{ height: 36, padding: '0 16px', ...(vis === v ? { color: 'var(--void)', background: 'var(--text)', borderColor: 'var(--text)' } : {}) }} onClick={() => setVis(v)}>{v}</button>)}
      </div>
      <div className="label" style={{ marginBottom: 10 }}>Who looked</div>
      {[['Paystride', 'Viewed your evidence · you allowed it', 'Oct 26'], ['Kora Health', 'Saw an anonymous match card', 'Oct 25']].map(([c, d, w]) => (
        <div key={c} className="row" style={{ padding: '14px 0', borderTop: '1px solid var(--line)', gap: 14 }}><Avatar name={c} size={30} /><div className="grow"><div style={{ fontSize: 15 }}>{c}</div><div className="t3" style={{ fontSize: 13 }}>{d}</div></div><span className="label">{w}</span></div>
      ))}
      <div className="row" style={{ gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
        <button className="btn btn-quiet btn-sm"><Download size={14} /> Download my data</button>
        <button className="btn btn-quiet btn-sm">Correct something</button>
        <button className="btn btn-text btn-sm" style={{ color: 'var(--risk)' }}><Trash2 size={14} /> Delete account</button>
      </div>
    </div>
  )
}
