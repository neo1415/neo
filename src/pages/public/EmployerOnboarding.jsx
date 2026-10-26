import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Calendar, Check, Globe2, Lock, Mail, Plus, ShieldCheck, Sparkles, Users, X, Database } from 'lucide-react'
import OnboardingFrame from './OnboardingFrame'
import { Avatar, Badge, Button, QOrb, Tick, Toggle, celebrate, spring, stagger } from '../../ui'
import { useStore } from '../../store'

const steps = [
  { t: 'Your company', d: 'Size, market and sector' },
  { t: 'How you hire', d: 'Volume, roles and tools' },
  { t: 'Compliance', d: 'Jurisdiction & review gates' },
  { t: 'Connect tools', d: 'Calendar, email, ATS', optional: true },
  { t: 'Invite your team', d: 'Managers & interviewers', optional: true },
  { t: 'Ready', d: 'Meet Q' },
]

const qLines = [
  'Hi! I’m Q. A few questions so I can set up the right defaults — nothing here is permanent.',
  'This helps me suggest realistic timelines and budgets for the roles you hire most.',
  'I’ve pre-selected policies for your market. Human review on decisions is always on.',
  'Connecting your calendar lets me propose interview slots without back-and-forth.',
  'Teammates get their own scorecards, so feedback stays independent until you compare.',
  'All set. Tell me about the work you need done — in your own words.',
]

function Pick({ options, value, onChange, multi, dataPrefix }) {
  const isOn = (o) => (multi ? value.includes(o) : value === o)
  const toggle = (o) => (multi ? onChange(isOn(o) ? value.filter((x) => x !== o) : [...value, o]) : onChange(o))
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {options.map((o, i) => (
        <motion.button key={o} {...stagger(i, 0.03)} className={`chip ${isOn(o) ? 'on' : ''}`} onClick={() => toggle(o)} data-q={dataPrefix ? `${dataPrefix}-${i}` : undefined}>
          <AnimatePresence>{isOn(o) && <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 14, opacity: 1 }} exit={{ width: 0, opacity: 0 }} style={{ display: 'inline-flex' }}><Check size={14} strokeWidth={3} /></motion.span>}</AnimatePresence>
          {o}
        </motion.button>
      ))}
    </div>
  )
}

export default function EmployerOnboarding() {
  const nav = useNavigate()
  const { user } = useStore()
  const [step, setStep] = useState(0)
  const [size, setSize] = useState('11–50')
  const [country, setCountry] = useState('Nigeria')
  const [industry, setIndustry] = useState('Fintech')
  const [freq, setFreq] = useState('')
  const [roles, setRoles] = useState(['Software engineering'])
  const [ats, setAts] = useState('Spreadsheet')
  const [policies, setPolicies] = useState({ ndpa: true, gdpr: false, aiact: false, human: true, residency: true })
  const [conn, setConn] = useState({})
  const [connecting, setConnecting] = useState(null)
  const [invites, setInvites] = useState([{ email: 'tolu@paystride.co', role: 'Hiring manager' }])
  const [inv, setInv] = useState('')

  const connect = (k) => {
    setConnecting(k)
    setTimeout(() => { setConn((c) => ({ ...c, [k]: true })); setConnecting(null) }, 1100)
  }
  const first = (user?.name || 'there').split(' ')[0]

  const body = [
    <div key="0">
      <div className="eyebrow">Welcome, {first}</div>
      <h1 style={{ fontSize: 34, marginTop: 10 }}>Tell us about {user?.company || 'your company'}</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>We use this to set currency, policies and sensible role templates.</p>
      <div className="col" style={{ gap: 26, marginTop: 34 }}>
        <div className="field"><label>Team size</label><Pick options={['Just me', '2–10', '11–50', '51–200', '200+']} value={size} onChange={setSize} dataPrefix="size" /></div>
        <div className="field"><label>Where are you hiring?</label><Pick options={['Nigeria', 'Ghana', 'Kenya', 'United Kingdom', 'United States', 'EU', 'Remote — anywhere']} value={country} onChange={setCountry} dataPrefix="country" /></div>
        <div className="field"><label>Industry</label><Pick options={['Fintech', 'Healthtech', 'E-commerce', 'Logistics', 'Professional services', 'Other']} value={industry} onChange={setIndustry} /></div>
      </div>
    </div>,
    <div key="1">
      <h1 style={{ fontSize: 34 }}>How do you usually hire?</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>No wrong answers — Q adapts to occasional and high-volume hiring.</p>
      <div className="grid g2" style={{ marginTop: 30, gap: 10 }}>
        {[['Occasionally', 'A few hires a year, no recruiter', Building2], ['Every quarter', 'Several roles, small HR team', Users], ['Continuously', 'Dedicated TA team, many roles', Sparkles], ['For clients', 'I run an agency', Globe2]].map(([t, d, I], i) => (
          <motion.button key={t} {...stagger(i)} className={`option ${freq === t ? 'on' : ''}`} onClick={() => setFreq(t)} data-q={`freq-${i}`}>
            <span className={`ic-box ${freq === t ? 'dark' : ''}`}><I size={18} /></span>
            <span><div style={{ fontWeight: 650 }}>{t}</div><div className="muted small">{d}</div></span>
            <Tick on={freq === t} />
          </motion.button>
        ))}
      </div>
      <div className="field" style={{ marginTop: 28 }}><label>Roles you hire most</label><Pick multi options={['Software engineering', 'Customer support', 'Sales & BD', 'Operations', 'Data & analytics', 'Security', 'Design']} value={roles} onChange={setRoles} dataPrefix="roles" /></div>
      <div className="field" style={{ marginTop: 22 }}><label>Where do candidates live today?</label><Pick options={['Spreadsheet', 'Email inbox', 'Greenhouse', 'Workable', 'BambooHR', 'Other ATS']} value={ats} onChange={setAts} /></div>
    </div>,
    <div key="2">
      <h1 style={{ fontSize: 34 }}>Compliance, set up for you</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Based on <b style={{ color: 'var(--text)' }}>{country}</b>. Your legal team can review every policy later.</p>
      <div className="card" style={{ marginTop: 28 }}>
        {[
          ['ndpa', 'Nigeria Data Protection Act 2023', 's.37 safeguards for automated decisions — human intervention and right to contest.', 'Recommended'],
          ['gdpr', 'UK GDPR / EU GDPR', 'Enable if you hire candidates located in the UK or EU.', ''],
          ['aiact', 'EU AI Act — high-risk controls', 'Recruitment AI is Annex III high-risk. Adds logging, transparency notices and impact reviews.', 'Dec 2027'],
          ['residency', 'Keep candidate data in-region', 'Store evidence and transcripts in the closest compliant region.', ''],
        ].map(([k, t, d, b], i) => (
          <motion.div key={k} {...stagger(i)} className="row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', gap: 16, alignItems: 'flex-start' }}>
            <span className="ic-box"><Globe2 size={18} /></span>
            <div className="grow"><div className="row" style={{ fontWeight: 600 }}>{t}{b && <Badge tone={b === 'Recommended' ? 'green' : 'amber'}>{b}</Badge>}</div><div className="muted small" style={{ marginTop: 3 }}>{d}</div></div>
            <Toggle on={policies[k]} onChange={(v) => setPolicies({ ...policies, [k]: v })} label={t} />
          </motion.div>
        ))}
        <div className="row" style={{ padding: '16px 20px', gap: 16, background: 'var(--gold-soft)', borderRadius: '0 0 14px 14px' }}>
          <span className="ic-box dark"><ShieldCheck size={18} /></span>
          <div className="grow"><div style={{ fontWeight: 600 }}>Human review gate</div><div className="small" style={{ color: 'var(--gold-ink)' }}>No automated final rejection or hiring decision. This can’t be turned off.</div></div>
          <Lock size={16} color="var(--gold-ink)" />
        </div>
      </div>
    </div>,
    <div key="3">
      <h1 style={{ fontSize: 34 }}>Connect your tools</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Talent Q works alongside what you have. No migration needed.</p>
      <div className="col" style={{ gap: 10, marginTop: 28 }}>
        {[['gcal', 'Google Calendar', 'Propose and book interview slots', Calendar, 'blue'], ['gmail', 'Google Workspace email', 'Send approved outreach from your domain', Mail, 'red'], ['ats', 'Workable ATS', 'Two-way candidate stage sync', Database, 'violet']].map(([k, t, d, I, tone], i) => (
          <motion.div key={k} {...stagger(i)} className="card row" style={{ padding: 16, gap: 14 }}>
            <span className={`ic-box ${tone}`}><I size={18} /></span>
            <div className="grow"><div style={{ fontWeight: 600 }}>{t}</div><div className="muted small">{d}</div></div>
            <AnimatePresence mode="wait">
              {conn[k] ? (
                <motion.span key="c" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}><Badge tone="green" icon={Check}>Connected</Badge></motion.span>
              ) : (
                <motion.span key="b" exit={{ opacity: 0, scale: 0.9 }}><Button size="sm" loading={connecting === k} onClick={() => connect(k)} data-q={`connect-${k}`}>{connecting === k ? 'Authorising…' : 'Connect'}</Button></motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>,
    <div key="4">
      <h1 style={{ fontSize: 34 }}>Invite your hiring team</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Each person gets role-based access and their own independent scorecard.</p>
      <div className="row" style={{ marginTop: 28, gap: 8 }}>
        <div className="input-wrap grow"><Mail size={16} /><input className="input" value={inv} onChange={(e) => setInv(e.target.value)} placeholder="colleague@paystride.co" data-q="invite-input" onKeyDown={(e) => { if (e.key === 'Enter' && inv) { setInvites([...invites, { email: inv, role: 'Interviewer' }]); setInv('') } }} /></div>
        <Button variant="primary" icon={Plus} onClick={() => { if (inv) { setInvites([...invites, { email: inv, role: 'Interviewer' }]); setInv('') } }} data-q="invite-add">Add</Button>
      </div>
      <div className="col" style={{ gap: 8, marginTop: 16 }}>
        <AnimatePresence>
          {invites.map((v) => (
            <motion.div key={v.email} layout initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 30 }} transition={spring} className="card row" style={{ padding: '10px 14px', gap: 12 }}>
              <Avatar name={v.email} size={32} />
              <div className="grow"><div style={{ fontWeight: 550 }}>{v.email}</div><div className="muted tiny">Invite pending</div></div>
              <select className="input" style={{ height: 32, width: 160, fontSize: 13 }} defaultValue={v.role}><option>Hiring manager</option><option>Interviewer</option><option>Approver</option><option>Admin</option></select>
              <button className="btn ghost sm icon" onClick={() => setInvites(invites.filter((x) => x.email !== v.email))} aria-label="Remove"><X size={14} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>,
    <div key="5" style={{ textAlign: 'center', paddingTop: 30 }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} style={{ display: 'inline-block' }}><QOrb size={96} thinking /></motion.div>
      <h1 style={{ fontSize: 40, marginTop: 30 }}>Your workspace is <span className="serif" style={{ color: 'var(--gold)' }}>ready.</span></h1>
      <p className="muted" style={{ marginTop: 12, fontSize: 16, maxWidth: 520, marginInline: 'auto' }}>I’ve set up {country} policies, {roles.length} role templates and {Object.keys(conn).length} integrations. Let’s define your first hiring mandate together.</p>
      <div className="row center wrap" style={{ marginTop: 26, gap: 8 }}>
        {[`${size} people`, freq || 'Occasional hiring', `${invites.length} teammate${invites.length === 1 ? '' : 's'} invited`, 'Human review on'].map((t, i) => <motion.span key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}><Badge tone="gold" icon={Check}>{t}</Badge></motion.span>)}
      </div>
    </div>,
  ]

  return (
    <OnboardingFrame steps={steps} step={step} setStep={(s) => { setStep(s); if (s === steps.length - 1) setTimeout(() => celebrate(), 300) }} qSays={qLines[step]} canNext={step !== 1 || !!freq}
      nextLabel={step === steps.length - 1 ? 'Create my first mandate' : undefined}
      onFinish={() => nav('/app/intake')}>
      {body[step]}
    </OnboardingFrame>
  )
}
