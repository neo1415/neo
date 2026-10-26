import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Check, Compass, Play, Target, Zap } from 'lucide-react'
import { Badge, Button, Meter, QOrb, stagger, useToast } from '../../ui'

const gaps = [
  { t: 'Kubernetes autoscaling with connection pools', from: 'Noted in Paystride screen & 2 target roles', lvl: 35, tasks: [['Read: HPA and PgBouncer in practice', BookOpen, '12 min'], ['Practice task: tune a pool under load', Zap, '25 min']] },
  { t: 'Distributed tracing (OpenTelemetry)', from: 'Required by 3 of your top 10 matches', lvl: 55, tasks: [['Guided lab: trace a slow request', Play, '20 min']] },
]
const paths = [['Senior backend', 'Current fit', 92], ['Platform / SRE', '+2 skills away', 74], ['Engineering manager', 'Leadership evidence needed', 58]]

export default function Growth() {
  const toast = useToast()
  const [done, setDone] = useState({})
  return (
    <div>
      <div className="page-head"><div><div className="small muted">Close real gaps — not a course catalogue</div><h1>Growth</h1></div><Badge tone="green">Free</Badge></div>
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="col" style={{ gap: 14 }}>
          {gaps.map((g, i) => (
            <motion.div key={g.t} {...stagger(i)} className="card pad">
              <div className="row" style={{ gap: 12 }}><span className="ic-box amber"><Target size={18} /></span><div className="grow"><div className="card-title">{g.t}</div><div className="muted small">{g.from}</div></div></div>
              <div className="row small" style={{ gap: 10, marginTop: 14 }}><span className="muted">Evidence level</span><div className="grow"><Meter value={done[g.t] ? g.lvl + 30 : g.lvl} color="var(--amber)" /></div><b>{done[g.t] ? g.lvl + 30 : g.lvl}%</b></div>
              <div className="col" style={{ gap: 8, marginTop: 14 }}>
                {g.tasks.map(([t, I, d]) => (
                  <div key={t} className="row" style={{ padding: 12, borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--line)', gap: 12 }}>
                    <I size={16} color="var(--gold-ink)" /><span className="grow small" style={{ fontWeight: 550 }}>{t}</span><span className="tiny faint">{d}</span>
                    {done[t] ? <Badge tone="green" icon={Check}>Done</Badge> : <Button size="sm" onClick={() => { setDone({ ...done, [t]: true, [g.t]: true }); toast('Progress saved', { sub: 'Evidence level increased — employers see this only if you share it' }) }} data-q={`grow-${i}`}>Start</Button>}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div {...stagger(2)} className="card pad">
          <div className="card-title row"><Compass size={16} /> Career paths from your evidence</div>
          {paths.map(([t, d, v], i) => (
            <div key={t} style={{ marginTop: 18 }}>
              <div className="row between"><div><div style={{ fontWeight: 600 }}>{t}</div><div className="muted tiny">{d}</div></div><b>{v}</b></div>
              <div style={{ marginTop: 6 }}><Meter value={v} delay={0.2 + i * 0.1} color={i === 0 ? 'var(--green)' : 'var(--gold)'} /></div>
            </div>
          ))}
          <div className="row small" style={{ marginTop: 20, gap: 10, padding: 12, borderRadius: 12, background: 'var(--gold-soft)' }}><QOrb size={22} />Platform roles near you pay 12–18% more on average.</div>
        </motion.div>
      </div>
    </div>
  )
}
