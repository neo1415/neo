import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Briefcase, Calendar, Compass, FileCheck, Inbox, Menu, MessageSquare, Mic, PenSquare, Search, Settings, Shield, Users, X } from 'lucide-react'
import { Avatar } from '../ui/kit'
import { chats, needsYou } from './data'

export const hireCfg = {
  base: '/app', org: 'Paystride', user: ['Ada Nwosu', 'Growth plan'], voice: '/app/voice', search: 'Search people, roles, chats', chats,
  nav: [['/app/today', Inbox, 'Today', needsYou.length], ['/app/roles', Briefcase, 'Roles'], ['/app/people', Users, 'People'], ['/app/interviews', Calendar, 'Interviews'], ['/app/activity', Activity, 'What Q did']],
}
export const workCfg = {
  base: '/you', org: 'Confidential', user: ['Femi Okafor', 'Free, always'], voice: '/work?at=after', search: 'Search jobs, chats', chats: [
    { id: 'c1', title: 'Is the Paystride offer fair?', when: 'Today' }, { id: 'c2', title: 'Prep for my interview', when: 'Yesterday' }, { id: 'c3', title: 'What will employers see?', when: 'Previous 7 days' }],
  nav: [['/you/today', Inbox, 'Today', 1], ['/you/jobs', Compass, 'Jobs for you'], ['/you/applications', Briefcase, 'Applications'], ['/you/evidence', FileCheck, 'My evidence'], ['/you/privacy', Shield, 'Privacy']],
}

function Rail({ onNavigate, cfg }) {
  const go = useNavigate()
  const nav = cfg.nav
  const groups = cfg.chats.reduce((g, c) => ({ ...g, [c.when]: [...(g[c.when] || []), c] }), {})
  return (
    <nav className="rail" aria-label="Workspace">
      <div className="row" style={{ justifyContent: 'space-between', padding: '4px 6px 14px' }}>
        <span className="wordmark">Talent <b>Q</b></span>
        <span className="label rail-org">{cfg.org}</span>
      </div>
      <button className="rail-cta" onClick={() => { go(`${cfg.base}/chat/new`); onNavigate() }} data-q="new-chat"><PenSquare size={16} strokeWidth={1.75} /> New chat</button>
      <button className="rail-cta talk" onClick={() => { go(cfg.voice); onNavigate() }} data-q="voice-mode"><Mic size={16} strokeWidth={1.75} /> Talk to Q</button>
      <div className="rail-search"><Search size={14} /><span>{cfg.search}</span><kbd>⌘K</kbd></div>
      <div className="col" style={{ gap: 2, marginTop: 10 }}>
        {nav.map(([to, I, label, count]) => (
          <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `rail-item ${isActive ? 'on' : ''}`} data-q={`nav-${label.toLowerCase().replace(/\W/g, '')}`}>
            {({ isActive }) => (<>
              {isActive && <motion.span layoutId="rail-on" className="rail-on" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <I size={16} strokeWidth={1.75} /><span className="grow">{label}</span>{count ? <span className="rail-count">{count}</span> : null}
            </>)}
          </NavLink>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', marginTop: 18 }}>
        {Object.entries(groups).map(([when, list]) => (
          <div key={when} style={{ marginBottom: 14 }}>
            <div className="label" style={{ padding: '0 10px 6px' }}>{when}</div>
            {list.map((c) => (
              <NavLink key={c.id} to={`${cfg.base}/chat/${c.id}`} onClick={onNavigate} className={({ isActive }) => `rail-item chat ${isActive ? 'on' : ''}`}>
                {({ isActive }) => (<>{isActive && <motion.span layoutId="rail-on" className="rail-on" />}<MessageSquare size={14} strokeWidth={1.75} /><span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span></>)}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="row" style={{ padding: '12px 6px 4px', borderTop: '1px solid var(--line)', gap: 10 }}>
        <Avatar name={cfg.user[0]} size={30} />
        <div className="grow"><div style={{ fontSize: 13.5 }}>{cfg.user[0]}</div><div className="t3" style={{ fontSize: 12 }}>{cfg.user[1]}</div></div>
        <button className="btn btn-text btn-sm" aria-label="Settings" style={{ padding: 0, width: 32 }}><Settings size={16} strokeWidth={1.75} /></button>
      </div>
    </nav>
  )
}

export default function Shell({ cfg = hireCfg }) {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  return (
    <div className="ws">
      <div className="atmos" style={{ opacity: 0.6 }} />
      <aside className="ws-rail"><Rail cfg={cfg} onNavigate={() => {}} /></aside>
      <header className="ws-mobilebar">
        <button className="btn btn-text btn-sm" onClick={() => setOpen(true)} aria-label="Open menu" style={{ width: 40, padding: 0 }}><Menu size={20} /></button>
        <span className="wordmark">Talent <b>Q</b></span>
        <span style={{ width: 40 }} />
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,10,8,.7)', zIndex: 50 }} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 300, damping: 34 }} className="ws-rail mobile">
              <button className="btn btn-text btn-sm" onClick={() => setOpen(false)} aria-label="Close menu" style={{ position: 'absolute', right: 10, top: 12, width: 34, padding: 0 }}><X size={18} /></button>
              <Rail cfg={cfg} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <main className="ws-main">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }} style={{ height: '100%' }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export function PageHead({ kicker, title, sub, right }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
      <div>
        {kicker && <div className="label" style={{ color: 'var(--gold)', marginBottom: 8 }}>{kicker}</div>}
        <h1 className="voice" style={{ fontSize: 'var(--t-3xl)' }}>{title}</h1>
        {sub && <p className="t2" style={{ marginTop: 6, fontSize: 15.5 }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}
