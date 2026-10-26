import { motion } from 'framer-motion'
import { Clock, DollarSign, MessageCircle, Target } from 'lucide-react'
import { Badge, CountUp, ease, stagger } from '../../ui'

const funnel = [['Scanned (permissioned)', 575], ['Matched', 31], ['Shortlisted', 7], ['Interested', 5], ['Screened', 3], ['Interviewed', 2], ['Offer', 1]]
const stageDays = [['Intake → mandate', 0.2, 2.5], ['Mandate → shortlist', 2.2, 9], ['Shortlist → interest', 1.4, 5], ['Interest → screen', 1.8, 4], ['Screen → decision', 3.1, 8]]
const weeks = [12, 18, 15, 22, 27, 31, 29, 36]

export default function Analytics() {
  const max = funnel[1][1]
  return (
    <div>
      <div className="page-head"><div><div className="small muted">Last 30 days · all mandates</div><h1>Recruiter analytics</h1></div><Badge tone="gold">Compared with your pre-Talent Q baseline</Badge></div>
      <div className="grid g4">
        {[[Clock, 'Median time-to-hire', 9, ' days', '−61%'], [Target, 'Shortlist → interview', 42, '%', '+18 pts'], [MessageCircle, 'Candidate response', 71, '%', '+29 pts'], [DollarSign, 'Direct cost / mandate', 38, '', 'USD']].map(([I, l, v, s, d], i) => (
          <motion.div key={l} {...stagger(i)} className="card pad">
            <div className="row muted small"><I size={14} />{l}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 750, marginTop: 8 }}><CountUp to={v} prefix={i === 3 ? '$' : ''} suffix={s} /></div>
            <div className="small" style={{ color: i === 3 ? 'var(--muted)' : 'var(--green)', fontWeight: 600 }}>{d}</div>
          </motion.div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', marginTop: 16 }}>
        <div className="card pad">
          <div className="card-title">Hiring funnel · Backend Engineer</div>
          <div style={{ marginTop: 16 }}>
            {funnel.map(([l, v], i) => (
              <div key={l} className="row" style={{ gap: 12, marginTop: 8 }}>
                <span className="small" style={{ width: 170 }}>{l}</span>
                <div className="grow" style={{ height: 26, background: 'var(--paper)', borderRadius: 6, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: i === 0 ? '100%' : Math.max(4, (v / max) * 100) + '%' }} transition={{ delay: i * 0.08, duration: 0.8, ease }} style={{ height: '100%', background: i === 0 ? 'var(--line-2)' : `rgba(201,160,75,${0.35 + i * 0.1})`, borderRadius: 6 }} />
                </div>
                <b style={{ width: 40, textAlign: 'right' }}>{v}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="card pad">
          <div className="card-title">Days per stage <span className="muted small" style={{ fontWeight: 400 }}>· now vs baseline</span></div>
          {stageDays.map(([l, a, b], i) => (
            <div key={l} style={{ marginTop: 14 }}>
              <div className="row between small"><span>{l}</span><span><b>{a}d</b> <span className="faint">/ {b}d</span></span></div>
              <div style={{ position: 'relative', height: 8, background: 'var(--paper-2)', borderRadius: 9, marginTop: 5 }}>
                <div style={{ position: 'absolute', inset: 0, width: (b / 9) * 100 + '%', background: 'var(--line-2)', borderRadius: 9 }} />
                <motion.div initial={{ width: 0 }} animate={{ width: (a / 9) * 100 + '%' }} transition={{ delay: 0.2 + i * 0.08, duration: 0.8, ease }} style={{ position: 'absolute', inset: 0, background: 'var(--green)', borderRadius: 9 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card pad" style={{ marginTop: 16 }}>
        <div className="card-title">Recruiter hours saved per week</div>
        <svg viewBox="0 0 800 160" style={{ width: '100%', height: 180, marginTop: 10 }}>
          {[0, 1, 2, 3].map((g) => <line key={g} x1="0" x2="800" y1={20 + g * 40} y2={20 + g * 40} stroke="var(--line)" strokeDasharray="3 4" />)}
          <motion.path d={`M0,${140 - weeks[0] * 3} ` + weeks.map((w, i) => `L${(i / (weeks.length - 1)) * 800},${140 - w * 3}`).join(' ') + ' L800,160 L0,160 Z'} fill="rgba(201,160,75,.14)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} />
          <motion.path d={weeks.map((w, i) => `${i ? 'L' : 'M'}${(i / (weeks.length - 1)) * 800},${140 - w * 3}`).join(' ')} fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease }} />
          {weeks.map((w, i) => <motion.circle key={i} cx={(i / (weeks.length - 1)) * 800} cy={140 - w * 3} r="5" fill="#fff" stroke="var(--gold)" strokeWidth="2.5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.12 }} />)}
        </svg>
      </div>
    </div>
  )
}
