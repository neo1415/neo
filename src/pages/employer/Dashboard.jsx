import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, ArrowUpRight, Calendar, CheckCircle2, Clock, Mail, Search, ShieldCheck, Sparkles, TrendingDown, Users } from 'lucide-react'
import { Avatar, Badge, Button, CountUp, Meter, QOrb, ease, stagger } from '../../ui'
import { agentFeed } from '../../data'
import { useStore } from '../../store'

function Spark({ data, color = 'var(--gold)' }) {
  const max = Math.max(...data)
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${30 - (d / max) * 26}`).join(' ')
  return (
    <svg viewBox="0 0 100 32" style={{ width: 96, height: 32 }} preserveAspectRatio="none">
      <motion.polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease }} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const mandates = [
  { t: 'Backend Engineer — API reliability', v: 'v2', st: 'Shortlisting', funnel: [7, 4, 2, 1], tone: 'gold', due: 'Day 6 of 30' },
  { t: 'Customer Support Lead', v: 'v1', st: 'Interviewing', funnel: [12, 8, 5, 3], tone: 'blue', due: 'Day 18 of 30' },
  { t: 'Growth Marketer', v: 'v3', st: 'Offer stage', funnel: [9, 6, 4, 2], tone: 'green', due: 'Day 24 of 30' },
]
const icons = { search: Search, mail: Mail, alert: AlertTriangle, cal: Calendar, shield: ShieldCheck }

export default function Dashboard() {
  const nav = useNavigate()
  const { user } = useStore()
  const first = (user.name || 'Ada').split(' ')[0]
  return (
    <div>
      <div className="page-head">
        <div>
          <div className="muted small">Monday, 26 October</div>
          <h1>Good morning, {first}</h1>
        </div>
        <div className="row"><Button icon={Calendar}>This week</Button><Button variant="primary" icon={Sparkles} onClick={() => nav('/app/intake')}>Describe a new role</Button></div>
      </div>

      <motion.div {...stagger(0)} className="card row" style={{ padding: 16, gap: 14, marginBottom: 16, background: 'linear-gradient(90deg, var(--gold-soft), #fff 60%)', borderColor: 'var(--gold-3)' }}>
        <QOrb size={34} thinking />
        <div className="grow">
          <div style={{ fontWeight: 650 }}>2 things need you today</div>
          <div className="muted small">Femi Okafor accepted your confidential interest check · Tobi Adeyemi’s pay expectation exceeds your ceiling</div>
        </div>
        <Button size="sm" onClick={() => nav('/app/shortlist')} iconRight={ArrowRight} data-q="dash-review">Review shortlist</Button>
      </motion.div>

      <div className="grid g4">
        {[['Active mandates', 3, '', [2, 2, 3, 3, 3, 3], 'var(--gold)', '+1 this month'], ['Qualified & interested', 7, '', [1, 2, 3, 3, 5, 7], 'var(--green)', '+4 vs last week'], ['Days to first shortlist', 2.4, '', [6, 5.2, 4.1, 3.5, 2.9, 2.4], 'var(--blue)', '−58% vs baseline'], ['Recruiter hours saved', 31, 'h', [3, 8, 12, 19, 25, 31], 'var(--violet)', 'This month']].map(([l, v, suf, d, c, sub], i) => (
          <motion.div key={l} {...stagger(i + 1)} className="card pad hover">
            <div className="muted small" style={{ fontWeight: 550 }}>{l}</div>
            <div className="row between" style={{ marginTop: 10, alignItems: 'flex-end' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 750, letterSpacing: '-.03em' }}><CountUp to={v} decimals={v % 1 ? 1 : 0} suffix={suf} /></div>
              <Spark data={d} color={c} />
            </div>
            <div className="small" style={{ color: i === 2 ? 'var(--green)' : 'var(--muted)', marginTop: 4 }} >{i === 2 && <TrendingDown size={12} style={{ verticalAlign: -1 }} />} {sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', marginTop: 16 }}>
        <motion.div {...stagger(5)} className="card">
          <div className="row between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="card-title">Active mandates</div>
            <span className="small muted">Shortlisted → Interested → Interviewed → Offer</span>
          </div>
          {mandates.map((m, i) => (
            <motion.button key={m.t} whileHover={{ backgroundColor: '#fbfaf6' }} onClick={() => nav('/app/shortlist')} className="row" style={{ width: '100%', padding: '16px 20px', gap: 16, border: 0, borderBottom: i < 2 ? '1px solid var(--line)' : 0, background: 'none', textAlign: 'left' }}>
              <div className="grow">
                <div className="row" style={{ fontWeight: 650 }}>{m.t} <Badge>{m.v}</Badge></div>
                <div className="row small muted" style={{ marginTop: 4, gap: 10 }}><Badge tone={m.tone} dot>{m.st}</Badge><Clock size={12} />{m.due}</div>
              </div>
              <div className="row" style={{ gap: 4, alignItems: 'flex-end', height: 40 }}>
                {m.funnel.map((f, k) => <motion.i key={k} initial={{ height: 0 }} animate={{ height: (f / 12) * 40 }} transition={{ delay: 0.3 + i * 0.1 + k * 0.06, duration: 0.6, ease }} style={{ width: 16, borderRadius: 4, background: k === 3 ? 'var(--gold)' : `rgba(201,160,75,${0.25 + k * 0.18})` }} />)}
              </div>
              <ArrowUpRight size={16} color="var(--faint)" />
            </motion.button>
          ))}
        </motion.div>

        <motion.div {...stagger(6)} className="card">
          <div className="row between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="card-title row"><QOrb size={18} /> Q activity</div>
            <Button variant="ghost" size="sm" onClick={() => nav('/app/agents')}>Agents</Button>
          </div>
          <div style={{ padding: '6px 20px 14px' }}>
            {agentFeed.map((a, i) => {
              const I = icons[a.icon]
              return (
                <motion.div key={a.text} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }} className="row" style={{ gap: 12, padding: '10px 0', alignItems: 'flex-start', borderBottom: i < agentFeed.length - 1 ? '1px dashed var(--line)' : 0 }}>
                  <span className={`ic-box ${a.tone === 'gold' ? 'gold' : a.tone === 'green' ? 'green' : a.tone === 'amber' ? 'amber' : ''}`} style={{ width: 30, height: 30, borderRadius: 9 }}><I size={14} /></span>
                  <div className="grow small" style={{ lineHeight: 1.45 }}>{a.text}</div>
                  <span className="tiny faint">{a.t}</span>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <motion.div {...stagger(7)} className="card pad">
          <div className="card-title">Upcoming interviews</div>
          {[['Kwame Mensah', 'Structured screen · Q-led (text)', 'Today 14:00 WAT', 'Backend'], ['Femi Okafor', 'Practical task review · with Tolu', 'Wed 11:00 WAT', 'Backend'], ['Halima Sule', 'Final interview · panel', 'Thu 16:30 WAT', 'Support Lead']].map(([n, t, w, r], i) => (
            <div key={n} className="row" style={{ gap: 12, marginTop: 14 }}>
              <Avatar name={n} size={36} hue={i + 2} />
              <div className="grow"><div style={{ fontWeight: 600 }}>{n}</div><div className="muted small">{t}</div></div>
              <div style={{ textAlign: 'right' }}><div className="small" style={{ fontWeight: 600 }}>{w}</div><div className="tiny faint">{r}</div></div>
            </div>
          ))}
        </motion.div>
        <motion.div {...stagger(8)} className="card pad">
          <div className="row between"><div className="card-title">Candidate experience</div><Badge tone="green" icon={CheckCircle2}>On track</Badge></div>
          <p className="muted small" style={{ marginTop: 4 }}>Your committed review window: 3 working days</p>
          {[['Responses within window', 96, 'var(--green)'], ['Candidates given feedback', 88, 'var(--gold)'], ['Interest-check acceptance', 64, 'var(--blue)']].map(([l, v, c], i) => (
            <div key={l} style={{ marginTop: 16 }}>
              <div className="row between small"><span>{l}</span><b>{v}%</b></div>
              <div style={{ marginTop: 6 }}><Meter value={v} color={c} delay={0.3 + i * 0.1} /></div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
