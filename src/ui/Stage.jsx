import { motion } from 'framer-motion'
import QPresence from '../q/QPresence'
import { Avatar, Dock, MomentHost, QLine, Thread, Bloom } from './kit'

export function useNarrow() {
  return typeof window !== 'undefined' && window.innerWidth < 760
}

// The one home. Q at the centre; a moment rises only when a human is needed.
export default function Stage({ q, user, focus, working, onAsk, suggestions, bloom, onFocus, onWorking, children }) {
  const narrow = useNarrow()
  const hasMoment = !!q.moment
  const orb = narrow ? 150 : 230
  return (
    <div className="stage">
      <div className="atmos" />
      <header className="topbar">
        <div className="wordmark">Talent <b>Q</b></div>
        {focus && (onFocus ? <button className="pill hide-sm" onClick={onFocus} data-q="focus" aria-label={`${focus}. Open roles and people`}>{focus}<span className="t3">▾</span></button> : <div className="pill hide-sm">{focus}</div>)}
        <div className="row" style={{ gap: 12 }}>
          {working ? <button className="pill" data-q="working" onClick={onWorking} aria-label={`Q is busy: ${working}. See what Q is doing`}><span className="dot" />{working}</button> : null}
          <Avatar name={user} size={34} />
        </div>
      </header>
      <main className="center" style={{ justifyContent: hasMoment ? 'flex-start' : 'center', paddingTop: hasMoment ? (narrow ? 4 : 8) : 0 }}>
        <h1 className="sr-only">Talent Q · {user}’s home</h1>
        <motion.div layout transition={{ type: 'spring', stiffness: 120, damping: 24 }} animate={{ scale: hasMoment ? (narrow ? 0.62 : 0.7) : 1 }} style={{ height: hasMoment ? orb * 0.78 : orb * 1.05, display: 'grid', placeItems: 'center' }}>
          <QPresence size={orb} state={q.state} />
        </motion.div>
        <motion.div layout transition={{ type: 'spring', stiffness: 120, damping: 24 }} style={{ width: '100%' }}>
          <QLine line={q.line} size={narrow ? 'var(--t-xl)' : hasMoment ? 'var(--t-2xl)' : 'var(--t-3xl)'} max={narrow ? '17em' : '19em'} />
        </motion.div>
        <MomentHost moment={q.moment} />
        {children}
      </main>
      <footer className="dockwrap" aria-label="Talk to Q"><Dock q={q} onAsk={onAsk} suggestions={suggestions} compact={narrow} /></footer>
      <Thread log={q.log} />
      <Bloom show={bloom} />
    </div>
  )
}
