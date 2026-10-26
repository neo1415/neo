import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Briefcase, Compass, EyeOff, Home, LogOut, Mic, Shield, Sprout, Wallet, Gift } from 'lucide-react'
import { Avatar, Badge, Logo, QOrb, ease, spring } from '../../ui'
import { useStore } from '../../store'

const nav = [
  { to: '/me', icon: Home, label: 'Home', end: true },
  { to: '/me/invite', icon: Compass, label: 'Invites', count: 1 },
  { to: '/me/applications', icon: Briefcase, label: 'Applications' },
  { to: '/me/interview', icon: Mic, label: 'Interviews' },
  { to: '/me/offer', icon: Gift, label: 'Offers' },
]
const nav2 = [
  { to: '/me/evidence', icon: Wallet, label: 'Evidence wallet' },
  { to: '/me/rehearsal', icon: Sprout, label: 'Practice' },
  { to: '/me/growth', icon: Compass, label: 'Growth' },
  { to: '/me/privacy', icon: Shield, label: 'Privacy & data' },
]

function Item({ item }) {
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-q={`cnav-${item.label.toLowerCase().replace(/[^a-z]/g, '')}`}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="cnav-bg" className="nav-bg" transition={spring} />}
          {isActive && <motion.span layoutId="cnav-bar" className="nav-bar" transition={spring} />}
          <item.icon size={17} /><span>{item.label}</span>{item.count && <span className="count">{item.count}</span>}
        </>
      )}
    </NavLink>
  )
}

export default function CandidateShell() {
  const { candidateUser } = useStore()
  const loc = useLocation()
  const go = useNavigate()
  return (
    <motion.div className="shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <aside className="sidebar">
        <div className="brand"><Logo dark size={24} /></div>
        <div className="row" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '10px 12px', gap: 10, marginBottom: 14 }}>
          <EyeOff size={16} color="#e2c27c" />
          <div className="grow"><div style={{ fontWeight: 600, fontSize: 13, color: '#e8e5dc' }}>Confidential mode</div><div style={{ fontSize: 11.5, color: '#77746b' }}>Kudi Ledger blocked</div></div>
        </div>
        {nav.map((n) => <Item key={n.to} item={n} />)}
        <div className="nav-label">Your career</div>
        {nav2.map((n) => <Item key={n.to} item={n} />)}
        <div className="grow" />
        <div className="row" style={{ padding: 12, borderRadius: 12, background: 'rgba(201,160,75,.08)', border: '1px solid rgba(201,160,75,.18)', gap: 10, alignItems: 'flex-start' }}>
          <QOrb size={22} />
          <div style={{ fontSize: 12, color: '#cfccc3', lineHeight: 1.5 }}>Talent Q is <b style={{ color: '#e2c27c' }}>free for candidates</b>. Always.</div>
        </div>
        <div className="row" style={{ padding: '14px 8px 0', gap: 10 }}>
          <Avatar name={candidateUser.name} size={32} hue={1} online />
          <div className="grow"><div style={{ fontSize: 13, color: '#e8e5dc', fontWeight: 600 }}>{candidateUser.name}</div><div style={{ fontSize: 11.5, color: '#6f6c64' }}>Senior Backend Engineer</div></div>
          <button onClick={() => go('/')} style={{ background: 'none', border: 0, color: '#6f6c64' }} aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="search" style={{ width: 300 }}><Compass size={15} /><span>Explore roles that fit you</span></div>
          <span className="grow" />
          <Badge tone="gold" dot pulse>1 new invite</Badge>
          <button className="btn icon" aria-label="Notifications"><Bell size={17} /></button>
          <Avatar name={candidateUser.name} size={34} hue={1} />
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} className="content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.32, ease }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
