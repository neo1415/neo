import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Database, FileText, Fingerprint, Gavel, RotateCcw, Scale, ShieldCheck, User, Wallet } from 'lucide-react'
import { Badge, Button, Meter, Segmented, Toggle, stagger, useToast } from '../../ui'

const audit = [
  ['10:42', 'Ada Nwosu', 'Human decision', 'Selected Femi Okafor · reason recorded', 'dark', Gavel],
  ['10:31', 'Tolu Bello', 'Scorecard', 'Submitted independent scorecard (rubric v3)', '', User],
  ['10:12', 'Q · Sourcing agent', 'Agent action', 'Drafted outreach · held for approval', 'violet', Bot],
  ['09:58', 'Q', 'Re-rank', 'Mandate v2 → v3 after recruiter correction', 'gold', RotateCcw],
  ['09:40', 'System', 'Consent', 'Femi Okafor granted employer view: evidence wallet (3 items)', 'green', Fingerprint],
  ['09:12', 'System', 'Source', 'Licensed partner sync · 128 profiles · provenance stamped', 'blue', Database],
]

export default function Governance() {
  const toast = useToast()
  const [tab, setTab] = useState('audit')
  const [caps, setCaps] = useState({ email: true, video: true, sms: false })
  return (
    <div>
      <div className="page-head">
        <div><div className="small muted">Paystride workspace</div><h1>Trust & audit</h1></div>
        <div className="row"><Segmented id="gov" options={[{ value: 'audit', label: 'Audit trail' }, { value: 'fair', label: 'Fairness' }, { value: 'spend', label: 'Spend controls' }]} value={tab} onChange={setTab} /><Button icon={FileText} onClick={() => toast('Audit export prepared', { sub: 'CSV + model/rubric versions · 214 events' })}>Export</Button></div>
      </div>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        {[[ShieldCheck, 'Human review gate', 'Enforced', 'green'], [Fingerprint, 'Evidence with provenance', '100%', 'green'], [Scale, 'Last fairness review', '3 days ago', 'green'], [Database, 'Open data requests', '0', '']].map(([I, l, v, t], i) => (
          <motion.div key={l} {...stagger(i)} className="card pad row" style={{ gap: 12 }}><span className={`ic-box ${t}`}><I size={18} /></span><div><div className="muted small">{l}</div><div style={{ fontWeight: 700, fontSize: 16 }}>{v}</div></div></motion.div>
        ))}
      </div>
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
        {tab === 'audit' && (
          <table className="table">
            <thead><tr><th>Time</th><th>Actor</th><th>Event</th><th>Detail</th></tr></thead>
            <tbody>{audit.map(([t, a, e, d, tone, I], i) => <motion.tr key={i} {...stagger(i, 0.05)}><td className="mono muted">{t}</td><td><span className="row"><I size={14} />{a}</span></td><td><Badge tone={tone}>{e}</Badge></td><td>{d}</td></motion.tr>)}</tbody>
          </table>
        )}
        {tab === 'fair' && (
          <div style={{ padding: 20 }}>
            <p className="muted small">Shortlist-to-interview selection rates across self-reported groups (aggregated, opt-in, never used for scoring). Four-fifths rule threshold shown.</p>
            {[['Group A', 0.44], ['Group B', 0.41], ['Group C', 0.39], ['Group D', 0.42]].map(([g, v], i) => (
              <div key={g} className="row" style={{ gap: 12, marginTop: 14 }}><span className="small" style={{ width: 80 }}>{g}</span><div className="grow" style={{ position: 'relative' }}><Meter value={v * 200} delay={i * 0.08} height={10} color="var(--green)" /><i style={{ position: 'absolute', left: '70.4%', top: -4, bottom: -4, width: 2, background: 'var(--red)' }} /></div><b className="small" style={{ width: 40 }}>{Math.round(v * 100)}%</b></div>
            ))}
            <div className="row small" style={{ marginTop: 18, gap: 8, color: 'var(--green)', fontWeight: 600 }}><ShieldCheck size={15} /> All groups above 80% of the highest rate · next review in 27 days</div>
          </div>
        )}
        {tab === 'spend' && (
          <div style={{ padding: 20 }} className="grid g2">
            <div>
              <div className="card-title">This month</div>
              {[['Source licensing', 22, 40], ['AI inference', 12, 30], ['Voice & video interviews', 10, 25], ['Messaging', 8, 15]].map(([l, v, cap], i) => (
                <div key={l} style={{ marginTop: 14 }}><div className="row between small"><span>{l}</span><span><b>${v}</b> <span className="faint">/ ${cap}</span></span></div><div style={{ marginTop: 5 }}><Meter value={(v / cap) * 100} delay={i * 0.08} color={v / cap > 0.7 ? 'var(--amber)' : 'var(--gold)'} /></div></div>
              ))}
            </div>
            <div>
              <div className="card-title">Caps & routing</div>
              <div className="card" style={{ marginTop: 12 }}>
                {[['email', 'Email outreach cap: 3 per candidate'], ['video', 'Premium video only when chosen by candidate'], ['sms', 'SMS reminders (metered)']].map(([k, l]) => <div key={k} className="row" style={{ padding: '12px 14px', gap: 12, borderBottom: '1px solid var(--line)' }}><Wallet size={15} color="var(--muted)" /><span className="grow small">{l}</span><Toggle on={caps[k]} onChange={(v) => setCaps({ ...caps, [k]: v })} label={l} /></div>)}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
