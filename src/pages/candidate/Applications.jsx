import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock, Gift, MessageSquareText } from 'lucide-react'
import { Avatar, Badge, Button, ease, stagger } from '../../ui'
import { useStore } from '../../store'

const steps = [
  ['Invited', '26 Oct · confidential interest check'],
  ['You accepted', '26 Oct · shared 3 evidence items'],
  ['Q screen completed', '26 Oct · transcript available'],
  ['Practical task reviewed', '27 Oct · score 84, confirmed by CTO'],
  ['Final interview', '29 Oct · with Ada & Tolu'],
  ['Decision', 'Offer sent 30 Oct'],
]

export default function Applications() {
  const nav = useNavigate()
  const { offerSent } = useStore()
  const done = offerSent ? 6 : 3
  return (
    <div>
      <div className="page-head"><div><div className="small muted">Live status from participating employers</div><h1>Applications</h1></div></div>
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <motion.div {...stagger(0)} className="card pad">
          <div className="row" style={{ gap: 12 }}>
            <Avatar name="Paystride" size={46} hue={1} />
            <div className="grow"><div className="card-title" style={{ fontSize: 17 }}>Paystride · Backend Engineer</div><div className="muted small">Remote · $1,800–2,000/mo</div></div>
            {offerSent ? <Badge tone="green" icon={Gift}>Offer received</Badge> : <Badge tone="blue" dot pulse>In review</Badge>}
          </div>
          <div style={{ marginTop: 22, position: 'relative' }}>
            {steps.map(([t, d], i) => {
              const ok = i < done
              const cur = i === done
              return (
                <motion.div key={t} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.09 }} className="row" style={{ gap: 14, alignItems: 'flex-start', paddingBottom: 18, position: 'relative' }}>
                  {i < steps.length - 1 && <span style={{ position: 'absolute', left: 13, top: 30, bottom: 2, width: 2, background: 'var(--line)' }}><motion.i initial={{ height: 0 }} animate={{ height: ok ? '100%' : 0 }} transition={{ delay: 0.3 + i * 0.12, duration: 0.4, ease }} style={{ display: 'block', width: '100%', background: 'var(--gold)' }} /></span>}
                  <span style={{ width: 28, height: 28, borderRadius: 50, display: 'grid', placeItems: 'center', flexShrink: 0, background: ok ? 'var(--gold)' : '#fff', border: `2px solid ${ok || cur ? 'var(--gold)' : 'var(--line-2)'}`, color: '#1a1408', boxShadow: cur ? '0 0 0 5px rgba(201,160,75,.18)' : 'none' }}>{ok ? <Check size={14} strokeWidth={3} /> : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{i + 1}</span>}</span>
                  <div><div style={{ fontWeight: 600, color: ok || cur ? 'var(--text)' : 'var(--faint)' }}>{t}</div><div className="small muted">{ok ? d : cur ? 'Next · employer reviewing' : 'Upcoming'}</div></div>
                </motion.div>
              )
            })}
          </div>
          {offerSent && <Button variant="gold" size="lg" style={{ width: '100%' }} iconRight={ArrowRight} onClick={() => nav('/me/offer')} data-q="view-offer">View your offer</Button>}
        </motion.div>
        <div className="col" style={{ gap: 14 }}>
          {!offerSent && (
            <motion.div {...stagger(1)} className="card pad">
              <div className="row between"><div className="card-title">Review window</div><Clock size={16} color="var(--muted)" /></div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 750, marginTop: 8 }}>2d 18h</div>
              <div className="muted small">left in Paystride’s committed review window</div>
              <div className="meter" style={{ marginTop: 12 }}><motion.i initial={{ width: 0 }} animate={{ width: '22%' }} transition={{ duration: 1, ease }} /></div>
            </motion.div>
          )}
          {[['Kora Health', 'Platform Engineer', 'Screen scheduled · Thu', 'violet'], ['Northwind Logistics', 'Backend Engineer (Go)', 'Not selected · feedback available', '']].map(([c, r, s, tone], i) => (
            <motion.div key={c} {...stagger(i + 2)} className="card pad row" style={{ gap: 12 }}>
              <Avatar name={c} size={38} hue={i + 2} />
              <div className="grow"><div style={{ fontWeight: 600 }}>{c}</div><div className="muted small">{r}</div></div>
              <div style={{ textAlign: 'right' }}><Badge tone={tone}>{s.split(' · ')[0]}</Badge>{s.includes('feedback') && <div className="row tiny" style={{ color: 'var(--gold-ink)', fontWeight: 600, marginTop: 4, justifyContent: 'flex-end' }}><MessageSquareText size={11} />Read feedback</div>}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
