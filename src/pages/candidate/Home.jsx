import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, Bookmark, Clock, EyeOff, Lock, MapPin, Sparkles, Wallet, Zap } from 'lucide-react'
import { Avatar, Badge, Button, Meter, QOrb, ScoreRing, ease, stagger } from '../../ui'
import { opportunities } from '../../data'
import { useStore } from '../../store'

export default function Home() {
  const nav = useNavigate()
  const { candidateUser } = useStore()
  const first = candidateUser.name.split(' ')[0]
  const invite = opportunities[0]
  return (
    <div>
      <div className="page-head">
        <div><div className="muted small">Your private career hub</div><h1>Welcome back, {first}</h1></div>
        <Button icon={Sparkles} onClick={() => nav('/me/rehearsal')}>Practice an interview</Button>
      </div>

      <motion.div {...stagger(0)} className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--ink)', color: '#efece3', borderColor: 'var(--ink)', position: 'relative' }}>
        <div className="glow" style={{ width: 400, height: 300, background: 'rgba(201,160,75,.25)', right: -100, top: -100 }} />
        <div className="row" style={{ padding: 24, gap: 20, position: 'relative' }}>
          <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 0.6, delay: 0.6 }} className="ic-box" style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(201,160,75,.16)', color: 'var(--gold-2)' }}><Lock size={24} /></motion.div>
          <div className="grow">
            <div className="row" style={{ gap: 8 }}><Badge tone="gold" icon={EyeOff}>Confidential invite</Badge><span style={{ fontSize: 12, color: '#7f7c73' }}>14 minutes ago</span></div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, marginTop: 8 }}>A Series A fintech in Lagos wants to talk</div>
            <div style={{ color: '#a9a69d', marginTop: 4 }}>Backend Engineer — API reliability · {invite.pay} · Remote</div>
          </div>
          <div className="row" style={{ gap: 16 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 750, color: 'var(--gold-2)' }}>87</div><div style={{ fontSize: 11, color: '#7f7c73', letterSpacing: '.06em' }}>MUTUAL</div></div>
            <Button variant="gold" size="lg" iconRight={ArrowRight} onClick={() => nav('/me/invite')} data-q="open-invite">Review invite</Button>
          </div>
        </div>
      </motion.div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', marginTop: 16 }}>
        <div className="card">
          <div className="row between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="card-title">Opportunities that fit both ways</div><span className="small muted">Ranked by mutual fit, not by who paid most</span>
          </div>
          {opportunities.map((o, i) => (
            <motion.div key={o.id} {...stagger(i + 1)} whileHover={{ backgroundColor: '#fbfaf6' }} className="row" style={{ padding: '16px 20px', gap: 16, borderBottom: i < opportunities.length - 1 ? '1px solid var(--line)' : 0, cursor: 'pointer' }} onClick={() => o.invite && nav('/me/invite')}>
              <Avatar name={o.invite ? '?' : o.company} size={42} hue={o.hue} />
              <div className="grow">
                <div className="row" style={{ fontWeight: 650 }}>{o.invite ? 'Confidential employer' : o.company}{o.invite && <Badge tone="gold">Invited you</Badge>}</div>
                <div className="small">{o.role}</div>
                <div className="row tiny muted" style={{ marginTop: 4, gap: 10 }}><span className="row"><MapPin size={11} />{o.city}</span><span className="row"><Wallet size={11} />{o.pay}</span>{o.window && <span className="row"><Clock size={11} />{o.window}</span>}</div>
              </div>
              <ScoreRing value={o.F} size={44} stroke={4} label="YOU" delay={0.2 + i * 0.1} />
              <ScoreRing value={o.A} size={44} stroke={4} label="FITS" color="var(--blue)" delay={0.25 + i * 0.1} />
              <button className="btn ghost sm icon" aria-label="Save" onClick={(e) => e.stopPropagation()}><Bookmark size={15} /></button>
            </motion.div>
          ))}
        </div>
        <div className="col" style={{ gap: 14 }}>
          <motion.div {...stagger(2)} className="card pad">
            <div className="row" style={{ gap: 16 }}>
              <ScoreRing value={78} size={72} label="PROFILE" />
              <div><div className="card-title">Profile strength</div><div className="muted small">Add 1 verified skill to reach 90%</div></div>
            </div>
            {[['Experience approved', 100], ['Preferences complete', 100], ['Verified evidence', 45]].map(([l, v], i) => <div key={l} style={{ marginTop: 12 }}><div className="row between small"><span>{l}</span><b>{v}%</b></div><div style={{ marginTop: 5 }}><Meter value={v} delay={0.3 + i * 0.1} color={v < 60 ? 'var(--amber)' : 'var(--green)'} /></div></div>)}
            <Button style={{ width: '100%', marginTop: 16 }} icon={Zap} onClick={() => nav('/me/growth')}>Take a 15-min practice task</Button>
          </motion.div>
          <motion.div {...stagger(3)} className="card pad row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <QOrb size={30} />
            <div className="small" style={{ lineHeight: 1.55 }}><b>From Q:</b> 2 roles you might expect weren’t shown — they required on-site work in Abuja, which you excluded. <a style={{ color: 'var(--gold-ink)', fontWeight: 600 }}>See why</a></div>
          </motion.div>
          <motion.div {...stagger(4)} className="card pad row small" style={{ gap: 10 }}><BadgeCheck size={18} color="var(--green)" />Your status never changes publicly without your action.</motion.div>
        </div>
      </div>
    </div>
  )
}
