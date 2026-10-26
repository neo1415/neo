import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BarChart3, Bot, Building2, ClipboardCheck, Command, Home, KanbanSquare, LogOut, Plus, Scale, Search, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Badge, Button, Logo, QOrb, ease, spring } from '../../ui'
import { useStore } from '../../store'

const nav = [
  { to: '/app', icon: Home, label: 'Overview', end: true },
  { to: '/app/shortlist', icon: Users, label: 'Shortlist', count: 7 },
  { to: '/app/pipeline', icon: KanbanSquare, label: 'Pipeline' },
  { to: '/app/assess', icon: ClipboardCheck, label: 'Assessments', count: 2 },
  { to: '/app/decision', icon: Scale, label: 'Decisions' },
]
const nav2 = [
  { to: '/app/agents', icon: Bot, label: 'Q Agents' },
  { to: '/app/agency', icon: Building2, label: 'Agency console' },
  { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/app/governance', icon: ShieldCheck, label: 'Trust & audit' },
]

function NavItem({ item }) {
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-q={`nav-${item.label.toLowerCase().replace(/[^a-z]/g, '')}`}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="nav-bg" className="nav-bg" transition={spring} />}
          {isActive && <motion.span layoutId="nav-bar" className="nav-bar" transition={spring} />}
          <item.icon size={17} />
          <span>{item.label}</span>
          {item.count && <span className="count">{item.count}</span>}
        </>
      )}
    </NavLink>
  )
}

const notifs = [
  { t: 'Femi Okafor accepted your interest check', s: 'Paystride · Backend Engineer · 14m', tone: 'green' },
  { t: 'Q needs a decision: budget vs seniority', s: 'Mandate v2 feasibility · 1h', tone: 'amber' },
  { t: 'Tolu submitted a scorecard', s: 'Kwame Mensah · structured screen · 3h', tone: '' },
]

export default function EmployerShell() {
  const { user } = useStore()
  const loc = useLocation()
  const go = useNavigate()
  const [bell, setBell] = useState(false)
  return (
    <motion.div className="shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <aside className="sidebar">
        <div className="brand"><Logo dark size={24} /></div>
        <button className="row" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '10px 12px', gap: 10, color: '#e8e5dc', textAlign: 'left', marginBottom: 10 }}>
          <Avatar name={user.company || 'Paystride'} size={30} hue={1} />
          <div className="grow"><div style={{ fontWeight: 600, fontSize: 13.5 }}>{user.company || 'Paystride'}</div><div style={{ fontSize: 11.5, color: '#77746b' }}>Growth plan · 3 mandates</div></div>
        </button>
        <Button variant="gold" icon={Plus} onClick={() => go('/app/intake')} style={{ marginBottom: 14 }} data-q="new-mandate">New mandate</Button>
        {nav.map((n) => <NavItem key={n.to} item={n} />)}
        <div className="nav-label">Workspace</div>
        {nav2.map((n) => <NavItem key={n.to} item={n} />)}
        <div className="grow" />
        <div className="row" style={{ padding: 12, borderRadius: 12, background: 'rgba(201,160,75,.08)', border: '1px solid rgba(201,160,75,.18)', gap: 10, alignItems: 'flex-start' }}>
          <QOrb size={22} thinking />
          <div style={{ fontSize: 12, color: '#cfccc3', lineHeight: 1.5 }}><b style={{ color: '#e2c27c' }}>Sourcing agent</b> is running for Backend Engineer · $4.20 of $25 budget used</div>
        </div>
        <div className="row" style={{ padding: '14px 8px 0', gap: 10 }}>
          <Avatar name={user.name} size={32} online />
          <div className="grow"><div style={{ fontSize: 13, color: '#e8e5dc', fontWeight: 600 }}>{user.name}</div><div style={{ fontSize: 11.5, color: '#6f6c64' }}>Founder · Admin</div></div>
          <button onClick={() => go('/')} style={{ background: 'none', border: 0, color: '#6f6c64' }} aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="search"><Search size={15} /><span className="grow">Search candidates, mandates, notes…</span><span className="kbd">⌘K</span></div>
          <span className="grow" />
          <Badge tone="green" dot pulse>Q online</Badge>
          <div style={{ position: 'relative' }}>
            <button className="btn icon" onClick={() => setBell(!bell)} aria-label="Notifications" data-q="bell"><Bell size={17} /><span style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 9, background: 'var(--red)', border: '2px solid #fff' }} /></button>
            <AnimatePresence>
              {bell && (
                <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.18 }} className="card" style={{ position: 'absolute', right: 0, top: 46, width: 360, boxShadow: 'var(--sh-3)', zIndex: 40, transformOrigin: 'top right' }}>
                  <div className="row between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}><b>Notifications</b><span className="small muted">Mark all read</span></div>
                  {notifs.map((n, i) => (
                    <motion.div key={n.t} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="row" style={{ padding: '12px 16px', gap: 12, borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                      <span className={`badge ${n.tone}`} style={{ width: 8, height: 8, padding: 0, marginTop: 6, background: n.tone === 'green' ? 'var(--green)' : n.tone === 'amber' ? 'var(--amber)' : 'var(--faint)' }} />
                      <div><div style={{ fontWeight: 550, fontSize: 13 }}>{n.t}</div><div className="muted tiny">{n.s}</div></div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Avatar name={user.name} size={34} />
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
