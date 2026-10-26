import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Calendar, Check, Clock, Gavel, Lock, Mail, Pause, Play, Plus, Search, ShieldAlert, Wallet, X } from 'lucide-react'
import { Badge, Button, Drawer, Meter, QOrb, Toggle, ease, spring, stagger, useToast } from '../../ui'

const tools = [['search', 'Search permissioned sources', Search], ['outreach', 'Draft outreach (you approve)', Mail], ['sched', 'Propose interview slots', Calendar], ['follow', 'Polite follow-ups (max 2)', Clock]]
const runLog = [
  'Loaded mandate v3 and rubric',
  'Searched candidate-owned profiles · 2 new matches',
  'Skipped 1 profile — opted out of outreach',
  'Drafted interest check for Daniel Mwangi → awaiting your approval',
  'Escalated: Tobi Adeyemi pay above ceiling — needs human',
]

export default function Agents() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [perm, setPerm] = useState({ search: true, outreach: true, sched: true, follow: false })
  const [budget, setBudget] = useState(25)
  const [ttl, setTtl] = useState('14 days')
  const [agents, setAgents] = useState([{ id: 1, name: 'Sourcing agent', mandate: 'Backend Engineer v3', spend: 4.2, cap: 25, running: true, log: 5 }])
  const [logN, setLogN] = useState(0)
  useEffect(() => { if (logN < runLog.length) { const t = setTimeout(() => setLogN(logN + 1), 700); return () => clearTimeout(t) } }, [logN])

  const launch = () => {
    setOpen(false)
    setAgents((a) => [{ id: 2, name: 'Scheduling agent', mandate: 'Customer Support Lead v1', spend: 0, cap: budget, running: true, log: 0, fresh: true }, ...a])
    toast('Scheduling agent launched', { sub: `Scope: 1 mandate · $${budget} cap · expires in ${ttl}`, tone: 'gold' })
  }

  return (
    <div>
      <div className="page-head">
        <div><div className="small muted">Delegate with guardrails</div><h1>Q agents</h1></div>
        <Button variant="primary" icon={Plus} onClick={() => setOpen(true)} data-q="new-agent">New agent</Button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="col" style={{ gap: 12 }}>
          <AnimatePresence>
            {agents.map((a) => (
              <motion.div key={a.id} layout initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className="card pad" style={a.fresh ? { borderColor: 'var(--gold-2)', boxShadow: 'var(--sh-gold)' } : {}}>
                <div className="row" style={{ gap: 12 }}>
                  <QOrb size={36} thinking={a.running} />
                  <div className="grow"><div style={{ fontWeight: 650 }}>{a.name}</div><div className="muted small">{a.mandate}</div></div>
                  <Badge tone={a.running ? 'green' : ''} dot pulse={a.running}>{a.running ? 'Running' : 'Paused'}</Badge>
                  <button className="btn sm icon" onClick={() => setAgents(agents.map((x) => (x.id === a.id ? { ...x, running: !x.running } : x)))} aria-label="Pause">{a.running ? <Pause size={14} /> : <Play size={14} />}</button>
                </div>
                <div className="row small" style={{ marginTop: 14, gap: 10 }}><Wallet size={14} color="var(--muted)" /><span className="muted">Spend</span><div className="grow"><Meter value={(a.spend / a.cap) * 100} height={5} /></div><b>${a.spend.toFixed(2)} / ${a.cap}</b></div>
                <div className="row wrap tiny" style={{ marginTop: 12, gap: 6 }}><Badge icon={Lock}>No final decisions</Badge><Badge>Outreach needs approval</Badge><Badge>Escalates exceptions</Badge></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="card">
          <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', gap: 10 }}><Bot size={17} color="var(--gold)" /><div className="card-title grow">Live run · Sourcing agent</div><Badge tone="green" dot pulse>Streaming</Badge></div>
          <div style={{ padding: 18 }}>
            {runLog.slice(0, logN).map((l, i) => (
              <motion.div key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="row" style={{ gap: 12, padding: '9px 0', alignItems: 'flex-start' }}>
                <span style={{ marginTop: 2 }}>{l.startsWith('Escalated') ? <ShieldAlert size={16} color="var(--amber)" /> : <Check size={16} color="var(--green)" />}</span>
                <span className="small grow" style={{ fontWeight: l.startsWith('Escalated') ? 600 : 400 }}>{l}</span>
                <span className="tiny faint mono">10:{String(12 + i * 3).padStart(2, '0')}</span>
              </motion.div>
            ))}
            {logN < runLog.length && <div className="row small muted" style={{ gap: 10, padding: '9px 0' }}><span className="spin" style={{ width: 14, height: 14, border: '2px solid var(--gold)', borderRightColor: 'transparent', borderRadius: '50%' }} />Working…</div>}
          </div>
        </div>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} width={520}>
        <div className="row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', gap: 12 }}><QOrb size={30} /><div className="grow"><div className="card-title">New Q agent</div><div className="muted small">Every action has a scope, a budget and a human escalation rule</div></div><button className="btn ghost icon" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button></div>
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }} className="col">
          <div className="field"><label>Mandate scope</label><select className="input"><option>Customer Support Lead v1</option><option>Backend Engineer v3</option></select></div>
          <div className="field" style={{ marginTop: 12 }}><label>Permitted tools</label>
            <div className="card">
              {tools.map(([k, t, I]) => <div key={k} className="row" style={{ padding: '11px 14px', gap: 12, borderBottom: '1px solid var(--line)' }}><I size={16} color="var(--muted)" /><span className="grow small" style={{ fontWeight: 550 }}>{t}</span><Toggle on={perm[k]} onChange={(v) => setPerm({ ...perm, [k]: v })} label={t} /></div>)}
              <div className="row" style={{ padding: '11px 14px', gap: 12, background: 'var(--paper)' }}><Gavel size={16} color="var(--muted)" /><span className="grow small" style={{ fontWeight: 550 }}>Make final hiring or rejection decisions</span><Lock size={14} color="var(--muted)" /><span className="tiny muted">Never</span></div>
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}><div className="row between"><label>Spend cap</label><b>${budget}</b></div><input type="range" className="range" min={5} max={100} step={5} value={budget} onChange={(e) => setBudget(+e.target.value)} style={{ '--p': ((budget - 5) / 95) * 100 + '%' }} data-q="agent-budget" /></div>
          <div className="field" style={{ marginTop: 12 }}><label>Time to live</label><div className="row" style={{ gap: 6 }}>{['7 days', '14 days', '30 days'].map((t) => <button key={t} className={`chip ${ttl === t ? 'on' : ''}`} onClick={() => setTtl(t)}>{t}</button>)}</div></div>
          <div className="field" style={{ marginTop: 12 }}><label>Escalate to a human when</label><div className="card pad small col" style={{ gap: 6 }}>{['Pay or location conflicts with mandate', 'Candidate asks a question Q can’t answer', 'Spend reaches 80% of cap'].map((t) => <span key={t} className="row"><Check size={14} color="var(--green)" />{t}</span>)}</div></div>
        </div>
        <div className="row" style={{ padding: 16, borderTop: '1px solid var(--line)' }}><span className="grow" /><Button variant="gold" icon={Play} onClick={launch} data-q="launch-agent">Launch agent</Button></div>
      </Drawer>
    </div>
  )
}
