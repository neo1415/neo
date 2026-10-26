import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, CalendarClock, GripVertical, MoreHorizontal, Plus, UserX } from 'lucide-react'
import { Avatar, Badge, Button, ease, spring, useToast } from '../../ui'
import { candidates, pipelineSeed, scoreCandidate, baseRequirements, stages } from '../../data'

const extra = { halima: { name: 'Halima Sule', title: 'Support Lead', M: 84.2 }, bayo: { name: 'Bayo Ade', title: 'Support Lead', M: 79.5 } }
const meta = { kwame: { next: 'Q screen today 14:00', days: 1 }, daniel: { next: 'Confirm timezone overlap', days: 2 }, femi: { next: 'Interested · schedule screen', days: 0, hot: true }, aisha: { next: 'Awaiting reply · day 4', days: 4, warn: true }, ngozi: { next: 'Scorecards: 1 of 2', days: 3 } }

export default function Pipeline() {
  const nav = useNavigate()
  const toast = useToast()
  const [cols, setCols] = useState(pipelineSeed)
  const [drag, setDrag] = useState(null) // {id, from, x, y, w, ox, oy}
  const [over, setOver] = useState(null)
  const laneRefs = useRef({})

  useEffect(() => {
    if (!drag) return
    const move = (e) => {
      setDrag((d) => ({ ...d, x: e.clientX, y: e.clientY }))
      const hit = Object.entries(laneRefs.current).find(([, el]) => { const r = el.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom })
      setOver(hit ? hit[0] : null)
    }
    const up = () => {
      setDrag((d) => {
        if (d && over && over !== d.from) drop(d.id, d.from, over)
        return null
      })
      setOver(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [drag, over])

  const drop = (id, from, to) => {
    setCols((c) => ({ ...c, [from]: c[from].filter((x) => x !== id), [to]: [id, ...c[to]] }))
    const n = (candidates.find((x) => x.id === id) || {}).name
    if (to === 'screened') toast(`${n} → Screened`, { sub: 'Q will run the structured screen and request a practical task', tone: 'gold' })
    else if (to === 'interviewed') toast(`${n} → Interviewed`, { sub: 'Scorecards requested from Ada & Tolu (independent until both submit)', tone: 'success' })
    else if (to === 'offered') toast('Decision record required', { sub: 'Moving to Offer opens the human decision review', tone: 'warn' })
    else toast(`${n} moved to ${stages.find((s) => s.id === to).label}`)
  }

  const card = (id, lane) => {
    const c = candidates.find((x) => x.id === id)
    const m = meta[id] || { next: 'Review', days: 1 }
    const sc = scoreCandidate(c, baseRequirements)
    const isDrag = drag?.id === id
    return (
      <motion.div key={id} layout layoutId={'k-' + id} transition={spring} className="kcard" style={{ opacity: isDrag ? 0.35 : 1, borderColor: m.hot ? 'var(--gold-2)' : undefined }}
        onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setDrag({ id, from: lane, x: e.clientX, y: e.clientY, w: r.width, ox: e.clientX - r.left, oy: e.clientY - r.top }) }} data-q={`k-${id}`}>
        <div className="row" style={{ gap: 10 }}>
          <Avatar name={c.name} size={30} />
          <div className="grow" style={{ minWidth: 0 }}><div style={{ fontWeight: 650, fontSize: 13.5 }}>{c.name}</div><div className="muted tiny">{c.title}</div></div>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 750 }}>{sc.M.toFixed(0)}</span>
        </div>
        <div className="row tiny" style={{ marginTop: 10, gap: 6, color: m.warn ? 'var(--amber)' : 'var(--muted)' }}>{m.warn ? <AlertTriangle size={12} /> : <CalendarClock size={12} />}{m.next}</div>
        <div className="row between" style={{ marginTop: 10 }}>
          <div className="row" style={{ gap: -6 }}><Avatar name="Ada Nwosu" size={20} /><span style={{ marginLeft: -6 }}><Avatar name="Tolu Bello" size={20} hue={3} /></span></div>
          <span className="tiny faint">{m.days}d in stage</span>
        </div>
      </motion.div>
    )
  }

  const dragC = drag && candidates.find((x) => x.id === drag.id)
  return (
    <div style={{ userSelect: drag ? 'none' : 'auto' }}>
      <div className="page-head">
        <div><div className="small muted">Backend Engineer · v3</div><h1>Hiring pipeline</h1></div>
        <div className="row"><Badge tone="amber" icon={AlertTriangle}>1 stage delay</Badge><Button icon={Plus}>Add candidate</Button><Button variant="primary" iconRight={ArrowRight} onClick={() => nav('/app/assess')} data-q="to-assess">Assessments</Button></div>
      </div>
      <div className="kanban">
        {stages.map((s, si) => (
          <motion.div key={s.id} ref={(el) => (laneRefs.current[s.id] = el)} className={`lane ${over === s.id && drag?.from !== s.id ? 'over' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05, ease }} data-q={`lane-${s.id}`}>
            <div className="row between" style={{ padding: '4px 4px 10px' }}>
              <span className="row" style={{ fontWeight: 650, fontSize: 13 }}><Badge tone={s.tone} dot>{s.label}</Badge></span>
              <span className="row tiny muted">{cols[s.id].length}<MoreHorizontal size={14} /></span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <AnimatePresence>{cols[s.id].map((id) => card(id, s.id))}</AnimatePresence>
              {cols[s.id].length === 0 && <div className="tiny faint" style={{ textAlign: 'center', padding: '24px 8px', border: '1.5px dashed var(--line-2)', borderRadius: 10 }}>Drop here</div>}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="row small muted" style={{ marginTop: 12, gap: 8 }}><UserX size={14} /> Declined & withdrawn (2) are kept with reasons and feedback sent. <GripVertical size={14} /> Drag cards or use ⌘→ to move.</div>
      {drag && dragC && (
        <div style={{ position: 'fixed', left: drag.x - drag.ox, top: drag.y - drag.oy, width: drag.w, zIndex: 300, pointerEvents: 'none' }}>
          <div className="kcard dragging">
            <div className="row" style={{ gap: 10 }}><Avatar name={dragC.name} size={30} /><div className="grow"><div style={{ fontWeight: 650, fontSize: 13.5 }}>{dragC.name}</div><div className="muted tiny">{dragC.title}</div></div></div>
          </div>
        </div>
      )}
    </div>
  )
}
