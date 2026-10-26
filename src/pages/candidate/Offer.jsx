import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Check, Clock, FileText, MapPin, MessageCircle, PartyPopper, Wallet } from 'lucide-react'
import { Avatar, Badge, Button, CheckDraw, QOrb, celebrate, ease, spring, stagger, useToast } from '../../ui'
import { useStore } from '../../store'

export default function Offer() {
  const toast = useToast()
  const { set } = useStore()
  const [accepted, setAccepted] = useState(false)
  const accept = () => { setAccepted(true); set({ offerAccepted: true }); celebrate(); setTimeout(() => celebrate({ particleCount: 140, spread: 110 }), 900) }
  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <AnimatePresence mode="wait">
        {accepted ? (
          <motion.div key="yay" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease }} style={{ textAlign: 'center', padding: '50px 0' }}>
            <div style={{ display: 'inline-block' }}><CheckDraw size={96} color="var(--gold)" /></div>
            <h1 style={{ fontSize: 48, marginTop: 28 }}>Congratulations, <span className="serif" style={{ color: 'var(--gold)' }}>Femi.</span></h1>
            <p className="muted" style={{ fontSize: 17, marginTop: 12 }}>You start at Paystride on <b style={{ color: 'var(--text)' }}>1 December 2026</b>. Your evidence wallet comes with you.</p>
            <div className="grid g3" style={{ maxWidth: 720, margin: '32px auto 0' }}>
              {[[FileText, 'Contract', 'Sent for e-signature'], [Calendar, 'Onboarding call', 'Mon 3 Nov, 10:00'], [MessageCircle, 'Other processes', 'Kora Health notified kindly']].map(([I, t, d], i) => (
                <motion.div key={t} {...stagger(i + 2, 0.12)} className="card pad"><span className="ic-box gold" style={{ margin: '0 auto' }}><I size={18} /></span><div style={{ fontWeight: 650, marginTop: 10 }}>{t}</div><div className="muted small">{d}</div></motion.div>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 28 }}>Your profile has switched to <b>Hidden</b>. Switch back any time.</p>
          </motion.div>
        ) : (
          <motion.div key="offer" exit={{ opacity: 0, y: -10 }}>
            <div className="page-head"><div><div className="small muted">Offers</div><h1>You have an offer</h1></div><Badge icon={Clock}>Respond by 5 Nov</Badge></div>
            <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
              <motion.div {...stagger(0)} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: 28, background: 'var(--ink)', color: '#efece3', position: 'relative', overflow: 'hidden' }}>
                  <div className="glow" style={{ width: 300, height: 300, background: 'rgba(201,160,75,.3)', right: -80, top: -120 }} />
                  <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ ...spring, delay: 0.2 }} style={{ position: 'relative' }}><PartyPopper size={28} color="var(--gold-2)" /></motion.div>
                  <div className="row" style={{ gap: 12, marginTop: 16, position: 'relative' }}><Avatar name="Paystride" size={44} hue={1} /><div><div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>Paystride</div><div style={{ color: '#a9a69d' }}>Backend Engineer — API reliability</div></div></div>
                </div>
                <div style={{ padding: 24 }}>
                  {[[Wallet, 'Salary', '$2,000 / month', 'Above your $1,800 minimum'], [MapPin, 'Work pattern', 'Remote · WAT ±2h', 'Matches your preference'], [Calendar, 'Start date', '1 December 2026', 'Fits your 4-week notice']].map(([I, l, v, d], i) => (
                    <motion.div key={l} {...stagger(i + 1)} className="row" style={{ padding: '12px 0', gap: 14, borderBottom: i < 2 ? '1px solid var(--line)' : 0 }}>
                      <span className="ic-box"><I size={17} /></span><div className="grow"><div className="muted small">{l}</div><div style={{ fontWeight: 650, fontSize: 16 }}>{v}</div></div>
                      <Badge tone="green" icon={Check}>{d}</Badge>
                    </motion.div>
                  ))}
                  <p className="small muted" style={{ marginTop: 14 }}>Note from Ada: “Your incident answer was the best we heard. We’d love you to own reliability with us.”</p>
                </div>
              </motion.div>
              <div className="col" style={{ gap: 14 }}>
                <motion.div {...stagger(1)} className="card pad row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <QOrb size={28} />
                  <div className="small" style={{ lineHeight: 1.6 }}><b>Q’s take:</b> This meets every preference you set. Similar remote roles for your evidence pay $1,900–2,300. You can ask questions or negotiate — it won’t withdraw the offer.</div>
                </motion.div>
                <motion.div {...stagger(2)} className="card pad col" style={{ gap: 8 }}>
                  <Button variant="gold" size="lg" icon={Check} onClick={accept} data-q="accept-offer">Accept offer</Button>
                  <Button icon={MessageCircle} onClick={() => toast('Message sent to Ada', { tone: 'info' })}>Ask a question</Button>
                  <Button variant="ghost">Decline politely</Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
