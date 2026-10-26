import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, EyeOff, Radio } from 'lucide-react'
import Stage from '../ui/Stage'
import { Avatar, Fact, Lens, MomentHead, ease } from '../ui/kit'
import { useQ } from '../q/useQ'
import { emit, isFilm, on, waitFor } from '../q/bus'
import { brief, interview, mutual, people } from '../data'

const param = (k) => new URLSearchParams(window.location.hash.split('?')[1] || '').get(k)
const femi = people[0]

/* ---------------- moments ---------------- */

function BriefMoment({ v2 }) {
  const rows = [
    ['Role', v2 ? brief.level : 'Senior Backend Engineer'],
    ['First 90 days', brief.outcomes[0]],
    ['Must have', brief.musts.join(' · ')],
    ['Budget', brief.budget],
    ['Where', brief.where],
  ]
  return (
    <div className="moment">
      <MomentHead label={v2 ? 'Brief · v2' : 'Draft brief'} right={<span className="label">{v2 ? 'Saved · v1 kept' : 'Listening'}</span>} />
      {rows.map(([k, v], i) => (
        <motion.div key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.4, ease }} className="row" style={{ alignItems: 'baseline', padding: '9px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
          <span className="label" style={{ width: 120, flexShrink: 0 }}>{k}</span>
          <motion.span key={v} initial={{ color: '#f0d395' }} animate={{ color: '#ece6da' }} transition={{ duration: 1.6 }} style={{ fontSize: 15 }}>{v}</motion.span>
        </motion.div>
      ))}
    </div>
  )
}

function FeasibilityMoment({ onPick }) {
  const opts = [
    ['raise', 'Raise the budget to $2,600', 'Keeps “senior”. About 38 people.'],
    ['mid', 'Strong mid-level, evidence first', 'Keeps your budget. About 64 people.', true],
    ['junior', 'Train a junior, add a contractor', '$900 a month plus mentoring.'],
  ]
  return (
    <div className="moment">
      <MomentHead label="Before I search" right={<span className="chip warn">Budget vs seniority</span>} />
      <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.55 }}>Senior engineers with this kind of evidence usually ask <span style={{ color: 'var(--text)' }}>$2,400–3,200</span> here. At $2,000, few would say yes.</p>
      <div className="col" style={{ gap: 8 }}>
        {opts.map(([id, t, d, rec]) => (
          <button key={id} onClick={() => onPick(t)} data-q={`opt-${id}`} className="row" style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: `1px solid ${rec ? 'var(--gold-line)' : 'var(--line)'}`, background: rec ? 'var(--gold-dim)' : 'transparent', transition: 'background .15s, border-color .15s' }}>
            <span className="grow"><span style={{ display: 'block', fontSize: 15 }}>{t}</span><span className="t3" style={{ fontSize: 13 }}>{d}</span></span>
            {rec && <span className="label" style={{ color: 'var(--gold)' }}>Q suggests</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function ApproveMoment({ label, title, lines, primary, secondary, onYes, onNo, q = 'approve' }) {
  return (
    <div className="moment">
      <MomentHead label={label} />
      {title && <p className="voice" style={{ fontSize: 'var(--t-xl)', marginBottom: 12 }}>{title}</p>}
      <div className="col" style={{ gap: 8, marginBottom: 18 }}>
        {lines.map((l) => <div key={l} className="row t2" style={{ fontSize: 14.5, alignItems: 'flex-start' }}><Check size={15} style={{ color: 'var(--gold)', marginTop: 3, flexShrink: 0 }} />{l}</div>)}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" onClick={onYes} data-q={q}>{primary}</button>
        {secondary && <button className="btn btn-text" onClick={onNo}>{secondary}</button>}
      </div>
    </div>
  )
}

function Night({ lines }) {
  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <div style={{ position: 'relative', height: 120, marginBottom: 6 }}>
        {Array.from({ length: 70 }).map((_, i) => {
          const fit = [7, 19, 33, 48, 61].includes(i)
          const x = (i * 37) % 100
          const y = (i * 53) % 100
          return <motion.span key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: fit ? 1 : 0.28, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.5 }} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: fit ? 6 : 3, height: fit ? 6 : 3, borderRadius: '50%', background: fit ? 'var(--gold-2)' : 'var(--text-2)', boxShadow: fit ? '0 0 12px var(--gold)' : 'none' }} />
        })}
      </div>
      <div className="row num" style={{ justifyContent: 'space-between' }}>
        <span className="label">Looked at</span><span className="label">Fit both ways</span>
      </div>
      <div className="row num" style={{ justifyContent: 'space-between', fontSize: 'var(--t-2xl)' }}>
        <Count to={575} /><span style={{ color: 'var(--gold)' }}><Count to={7} delay={2600} /></span>
      </div>
    </div>
  )
}
function Count({ to, delay = 0 }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf; const t0 = performance.now() + delay
    const f = (n) => { const p = Math.max(0, Math.min(1, (n - t0) / 2200)); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf)
  }, [to])
  return <span className="voice">{v}</span>
}

function PersonMoment({ p, onInvite, onWhy, onAll }) {
  return (
    <div className="moment">
      <MomentHead label="Worth your time" right={<span className="label num">Mutual {mutual(p)}</span>} />
      <div className="row" style={{ gap: 14, marginBottom: 12 }}>
        <Avatar name={p.name} size={48} />
        <div className="grow"><div style={{ fontSize: 18, fontWeight: 560 }}>{p.name}</div><div className="t3" style={{ fontSize: 13.5 }}>{p.now} · {p.city}</div></div>
      </div>
      <p className="voice" style={{ fontSize: 'var(--t-lg)', color: 'var(--text)', marginBottom: 16 }}>“{p.why}”</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Fact k="Pay" v="Fits budget" tone="ok" /><Fact k="Remote" v="WAT, fits" tone="ok" /><Fact k="Unknown" v={p.gaps} tone="warn" />
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onInvite} data-q="invite">Ask if he’s interested</button>
        <button className="btn btn-quiet" onClick={onWhy} data-q="why">Why him?</button>
        <button className="btn btn-text" onClick={onAll} data-q="all">See all 7</button>
      </div>
    </div>
  )
}

function DraftMoment({ onSend }) {
  const [hide, setHide] = useState(true)
  return (
    <div className="moment">
      <MomentHead label="Q drafted this · nothing sent yet" />
      <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--text)' }}>
        Hi Femi — a <motion.span key={hide} initial={{ color: '#f0d395' }} animate={{ color: '#ece6da' }}>{hide ? '42-person Series A fintech in Lagos' : 'Paystride, a fintech in Lagos,'}</motion.span> is hiring someone to make their payments API reliable. Your latency work looks very relevant. Remote, $1,800–2,000. Interested?
      </p>
      <button onClick={() => setHide(!hide)} className="row" style={{ marginTop: 16, gap: 10, color: 'var(--text-2)', fontSize: 14 }} data-q="toggle-hide">
        <span style={{ width: 34, height: 20, borderRadius: 99, background: hide ? 'var(--gold)' : 'var(--ink-3)', position: 'relative', transition: 'background .2s' }}><motion.i layout style={{ position: 'absolute', top: 2, left: hide ? 16 : 2, width: 16, height: 16, borderRadius: 99, background: '#fff8ec' }} /></span>
        <EyeOff size={15} /> Hide your company name until he says yes
      </button>
      <div className="row" style={{ gap: 8, marginTop: 18 }}>
        <button className="btn btn-primary" onClick={onSend} data-q="send-invite">Send it</button>
        <button className="btn btn-text">Edit wording</button>
      </div>
    </div>
  )
}

function LiveMoment({ onWatch }) {
  return (
    <div className="moment row" style={{ gap: 16 }}>
      <span style={{ position: 'relative', width: 12, height: 12 }}><span style={{ position: 'absolute', inset: 0, borderRadius: 99, background: 'var(--risk)' }} /><motion.span animate={{ scale: [1, 2.4], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ position: 'absolute', inset: 0, borderRadius: 99, background: 'var(--risk)' }} /></span>
      <div className="grow"><div className="label" style={{ color: 'var(--risk)' }}>Live now</div><div style={{ fontSize: 16 }}>Q is interviewing Femi</div></div>
      <button className="btn btn-quiet" onClick={onWatch} data-q="watch"><Radio size={15} /> Watch live</button>
    </div>
  )
}

function DecideMoment({ onOffer }) {
  const [confirm, setConfirm] = useState(false)
  const rows = [['Incident response', 92, 78], ['PostgreSQL', 88, 74], ['Communication', 86, 90]]
  return (
    <div className="moment">
      <MomentHead label="Your call" right={<span className="label">Q advises · you decide</span>} />
      <AnimatePresence mode="wait">
        {!confirm ? (
          <motion.div key="cmp" exit={{ opacity: 0 }}>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 26, marginBottom: 6 }}><span className="label" style={{ color: 'var(--gold)' }}>Femi</span><span className="label">Kwame</span></div>
            {rows.map(([k, a, b], i) => (
              <div key={k} className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                <span className="grow" style={{ fontSize: 14.5 }}>{k}</span>
                <div style={{ width: 160, height: 4, borderRadius: 4, background: 'var(--ink-3)', position: 'relative' }}><motion.i initial={{ width: 0 }} animate={{ width: `${a}%` }} transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'var(--gold)', borderRadius: 4 }} /></div>
                <span className="num" style={{ width: 32, textAlign: 'right', color: 'var(--gold)' }}>{a}</span>
                <span className="num t3" style={{ width: 32, textAlign: 'right' }}>{b}</span>
              </div>
            ))}
            <p className="t2" style={{ fontSize: 14, margin: '14px 0 18px', lineHeight: 1.55 }}><span className="label" style={{ color: 'var(--gold)', marginRight: 8 }}>Q’s view</span>Femi is stronger on both must-haves. Tolu agreed after reviewing the transcript.</p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" onClick={() => setConfirm(true)} data-q="offer">Offer Femi $2,000</button>
              <button className="btn btn-text">Talk to Tolu first</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="voice" style={{ fontSize: 'var(--t-xl)' }}>Send Femi the offer?</p>
            <p className="t2" style={{ fontSize: 14.5, margin: '8px 0 18px' }}>$2,000 a month · remote · starts December 1. Q will tell Kwame kindly, with feedback.</p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-gold" onClick={onOffer} data-q="send-offer">Send offer</button>
              <button className="btn btn-text" onClick={() => setConfirm(false)}>Back</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------- lenses ---------------- */

function PersonLens({ p }) {
  const ev = [
    ['Production incident response', 'Led 14 post-mortems; on-call lead for 2 years', 'Verified · reference'],
    ['PostgreSQL performance', 'Partitioned a 2-billion-row ledger table', 'Verified · work sample'],
    ['Node or Go', '7 years, mostly Node and Go', 'From his profile'],
  ]
  return (
    <div style={{ maxWidth: 680 }}>
      <div className="row" style={{ gap: 16, marginTop: 8 }}><Avatar name={p.name} size={64} /><div><div style={{ fontSize: 'var(--t-2xl)', fontWeight: 560, letterSpacing: '-.02em' }}>{p.name}</div><div className="t3">{p.now} · {p.city} · {p.source}</div></div></div>
      <p className="voice" style={{ fontSize: 'var(--t-2xl)', margin: '28px 0 32px', maxWidth: '26ch' }}>He’s done this exact job before, at higher volume than yours.</p>
      <div className="label" style={{ marginBottom: 6 }}>Can he do the work?</div>
      {ev.map(([k, d, s]) => (
        <div key={k} className="row" style={{ padding: '14px 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
          <div className="grow"><div style={{ fontSize: 15.5 }}>{k}</div><div className="t2" style={{ fontSize: 14 }}>{d}</div></div>
          <span className={`chip ${s.startsWith('Verified') ? 'ok' : ''}`}>{s}</span>
        </div>
      ))}
      <div className="label" style={{ margin: '28px 0 6px' }}>Would it suit him?</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: '14px 0', borderTop: '1px solid var(--line)' }}>
        <Fact k="Pay" v="Wants $1.8–2.1k" tone="ok" /><Fact k="Work" v="Remote, WAT" tone="ok" /><Fact k="Notice" v="4 weeks" />
      </div>
      <div className="label" style={{ margin: '28px 0 6px' }}>What I don’t know</div>
      <p className="t2" style={{ padding: '14px 0', borderTop: '1px solid var(--line)' }}>Kubernetes depth isn’t evidenced. I’d treat it as learnable — it isn’t on your must-have list.</p>
      <div className="row num t3" style={{ marginTop: 28, gap: 24, fontSize: 13.5 }}>
        <span>Fit for you <b style={{ color: 'var(--text)' }}>{p.fit}</b></span><span>Fit for him <b style={{ color: 'var(--text)' }}>{p.want}</b></span><span>Mutual <b style={{ color: 'var(--gold)' }}>{mutual(p)}</b></span>
      </div>
      <p className="t3" style={{ fontSize: 12.5, marginTop: 8 }}>A ranking aid, not a prediction. Age, gender and other protected traits are never inputs.</p>
    </div>
  )
}

function ShortlistLens({ onLess }) {
  const [list, setList] = useState(people)
  return (
    <div style={{ maxWidth: 760 }}>
      <p className="voice" style={{ fontSize: 'var(--t-2xl)', margin: '8px 0 24px' }}>Seven fit. Here are the five I’d talk to first.</p>
      <AnimatePresence>
        {list.map((p) => (
          <motion.div key={p.id} layout exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3 }} className="row" style={{ padding: '18px 0', borderTop: '1px solid var(--line)', gap: 16, opacity: p.fits ? 1 : 0.5 }}>
            <Avatar name={p.name} size={40} />
            <div className="grow"><div style={{ fontSize: 15.5 }}>{p.name} <span className="t3" style={{ fontSize: 13 }}>· {p.city}</span></div><div className="t2" style={{ fontSize: 13.5 }}>{p.why}</div><div style={{ fontSize: 12.5, color: p.fits ? 'var(--text-3)' : 'var(--warn)', marginTop: 2 }}>{p.gaps}</div></div>
            <span className="voice num" style={{ fontSize: 'var(--t-xl)', color: p.fits ? 'var(--gold)' : 'var(--text-3)' }}>{mutual(p)}</span>
            <button className="btn btn-text btn-sm" onClick={() => { setList(list.filter((x) => x.id !== p.id)); onLess(p) }} data-q={`less-${p.id}`}>Less like this</button>
          </motion.div>
        ))}
      </AnimatePresence>
      <p className="t3" style={{ fontSize: 13, marginTop: 18 }}>Ranked by mutual fit. Tobi is strongest on paper but expects well above your budget, so he’s unlikely to say yes.</p>
    </div>
  )
}

// The live view keeps the whole transcript, even the part spoken before Ada opened it.
const live = { turns: [], notes: [], status: 'Live', subs: new Set() }
const push = () => live.subs.forEach((f) => f())
on('interview_line', (d) => { live.turns = [...live.turns, d]; push() })
on('interview_note', (d) => { live.notes = [d, ...live.notes]; push() })
on('interview_drop', () => { live.status = 'Femi lost connection · answers are saved'; push() })
on('interview_resume', (d) => { live.status = d.lowData ? 'Femi rejoined in low-data text mode' : 'Femi rejoined'; push() })

export function ObserverLens() {
  const [, force] = useState(0)
  useEffect(() => { const f = () => force((n) => n + 1); live.subs.add(f); return () => live.subs.delete(f) }, [])
  const { turns, notes, status } = live
  const end = useRef()
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [turns])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 36 }}>
      <div>
        <div className="row" style={{ gap: 10, marginBottom: 16 }}><span style={{ width: 8, height: 8, borderRadius: 9, background: status.includes('lost') ? 'var(--warn)' : 'var(--risk)' }} /><span className="t2" style={{ fontSize: 14 }}>{status}</span></div>
        {turns.length === 0 && <p className="t3">Waiting for Femi to join…</p>}
        {turns.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 18 }}>
            <div className="label" style={{ marginBottom: 4, color: t.who === 'Q' ? 'var(--gold)' : 'var(--text-3)' }}>{t.who}</div>
            <p className={t.who === 'Q' ? 'voice' : ''} style={{ fontSize: t.who === 'Q' ? 19 : 15.5, color: t.who === 'Q' ? 'var(--text)' : 'var(--text-2)', lineHeight: 1.5 }}>{t.text}</p>
          </motion.div>
        ))}
        <div ref={end} />
      </div>
      <div>
        <div className="label" style={{ marginBottom: 12 }}>What Q is noting · you decide</div>
        <AnimatePresence>
          {notes.map((n) => (
            <motion.div key={n.tag} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} style={{ padding: '14px 0', borderTop: '1px solid var(--line)' }}>
              <span className={`chip ${n.tone}`}>{n.tag}</span>
              <p className="t2" style={{ fontSize: 14, marginTop: 8 }}>{n.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function RolesLens() {
  const roles = [
    ['Backend Engineer', 'Brief v2 · 7 fit · Femi in progress', 'Active'],
    ['Customer Support Lead', '3 interviewed · waiting on your feedback', 'Needs you'],
    ['Growth Marketer', 'Offer accepted · starts Nov 18', 'Filled'],
  ]
  const river = [['Found', ['Daniel', 'Ngozi', 'Tobi']], ['Asked', ['Kwame']], ['Interested', ['Femi']], ['Interviewed', []], ['Offer', []]]
  return (
    <div style={{ maxWidth: 820 }}>
      <p className="voice" style={{ fontSize: 'var(--t-2xl)', margin: '8px 0 24px' }}>Three roles. One needs you today.</p>
      {roles.map(([r, d, st]) => (
        <div key={r} className="row" style={{ padding: '16px 0', borderTop: '1px solid var(--line)' }}>
          <div className="grow"><div style={{ fontSize: 16 }}>{r}</div><div className="t2" style={{ fontSize: 14 }}>{d}</div></div>
          <span className={`chip ${st === 'Needs you' ? 'warn' : st === 'Filled' ? 'ok' : 'gold'}`}>{st}</span>
        </div>
      ))}
      <div className="label" style={{ margin: '36px 0 14px' }}>Backend Engineer · where everyone is</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, borderTop: '1px solid var(--line)' }}>
        {river.map(([stage, names], i) => (
          <div key={stage} style={{ padding: '14px 12px 18px 0', borderLeft: i ? '1px solid var(--line)' : 0, paddingLeft: i ? 14 : 0 }}>
            <div className="label" style={{ marginBottom: 12 }}>{stage} · {names.length}</div>
            <div className="col" style={{ gap: 10 }}>{names.map((n) => <span key={n} className="row" style={{ gap: 8, fontSize: 14 }}><Avatar name={n} size={24} />{n}</span>)}</div>
          </div>
        ))}
      </div>
      <p className="t3" style={{ fontSize: 13, marginTop: 16 }}>Ask Q to move anyone, or say “where is Kwame?”</p>
    </div>
  )
}

function DoingLens({ log, working }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <p className="voice" style={{ fontSize: 'var(--t-2xl)', margin: '8px 0 24px' }}>{working}.</p>
      <div className="label" style={{ marginBottom: 8 }}>Limits I’m working within</div>
      {['Only sources people agreed to', 'No message sent without your OK', 'Spend so far $4.20 of your $25 cap', 'I never reject or hire anyone'].map((t) => <div key={t} className="row t2" style={{ padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 15 }}><Check size={15} style={{ color: 'var(--gold)' }} />{t}</div>)}
      <div className="label" style={{ margin: '28px 0 8px' }}>What I’ve done</div>
      {log.map((l) => <div key={l.id} className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--line)', fontSize: 14.5 }}><span className="label num" style={{ width: 52 }}>{l.t}</span><span className="t2">{l.text}</span></div>)}
    </div>
  )
}

/* ---------------- the flow ---------------- */

export default function Hire() {
  const q = useQ()
  const [lens, setLens] = useState(null)
  const [working, setWorking] = useState(null)
  const [bloom, setBloom] = useState(false)
  const [suggest, setSuggest] = useState([])
  const started = useRef(false)

  const flash = () => { setBloom(true); setTimeout(() => setBloom(false), 2500) }

  useEffect(() => {
    if (started.current) return
    started.current = true
    const at = param('at') || 'brief'
    const M = (key, node) => q.show({ key, node })

    const briefFlow = async () => {
      await q.say('Hi Ada. Tell me about the work you need done — in your own words.')
      await q.hear('We need a backend engineer who can stop our API failures and speed up the database. Up to two thousand a month, and they must overlap our hours.')
      q.note('Heard the role · drafting a brief')
      M('brief1', <BriefMoment />)
      await q.say('Here’s what I heard.', { pace: 0.8 })
      await q.sleep(2600)
      M('feas', <FeasibilityMoment onPick={(t) => q.fire('voice', t)} />)
      await q.say('One honest flag before I search.')
      const pick = await q.hear('Go with strong mid-level, evidence first.', 'Pick an option, or just tell me')
      q.note(`Brief v2 · ${pick}`)
      M('brief2', <BriefMoment v2 />)
      await q.say('Done. Brief two is saved, and the first version is kept.')
      await q.sleep(1600)
      M('go', <ApproveMoment label="Ready to search" title="Search four permissioned sources?" lines={['People’s own profiles, and your past applicants who agreed', 'A licensed partner network', 'No outreach goes out without your OK']} primary="Start the search" secondary="Change something" onYes={() => q.fire('approve')} />)
      await q.say('I’ll only look where people agreed to be found.')
      await q.wait('approve')
      q.show(null)
      setWorking('Searching · 4 sources')
      await q.say('On it. Get some rest — I’ll keep working.', { then: 'working' })
      M('night', <Night />)
      const notes = ['Read 312 people’s own profiles', 'Checked 46 past applicants who consented', 'Skipped 1 person who opted out', 'Matched everyone against brief v2', '7 people fit both ways']
      for (const n of notes) { await q.sleep(1100); q.note(n) }
      await q.sleep(1600)
      return morningFlow()
    }

    const morningFlow = async () => {
      setWorking(null)
      q.show(null)
      await q.say('Morning, Ada. Seven people fit. Five have solid evidence — and Femi Okafor stands out.')
      setSuggest(['Why Femi?', 'Show me all seven'])
      let action
      do {
        M('femi', <PersonMoment p={femi} onInvite={() => q.fire('act', 'invite')} onWhy={() => q.fire('act', 'why')} onAll={() => q.fire('act', 'all')} />)
        action = await q.wait('act')
        if (action === 'why') { setLens('person'); await q.wait('lensClosed') }
        if (action === 'all') { setLens('list'); await q.wait('lensClosed') }
      } while (action !== 'invite')
      setSuggest([])
      M('draft', <DraftMoment onSend={() => q.fire('send')} />)
      await q.say('Here’s what I’d send. Your name stays hidden until he’s interested.')
      await q.wait('send')
      q.show(null)
      setSuggest(['Undo'])
      await q.say('Sending in a few seconds. Say “undo” to stop it.', { pace: 0.7 })
      const undone = await Promise.race([q.wait('undo').then(() => true), q.sleep(3500).then(() => false)])
      setSuggest([])
      if (undone) { await q.say('Stopped. Nothing was sent.'); return morningFlow() }
      emit('invite_sent', { to: 'femi' })
      q.note('Asked Femi · company hidden')
      q.show(null)
      setWorking('Waiting on Femi')
      await q.say('Sent. I’ll tell you the moment he answers.', { then: 'working' })
      await waitFor('invite_accepted', { fallbackMs: 5000 })
      return yesFlow()
    }

    const yesFlow = async () => {
      setWorking(null)
      q.note('Femi said yes · pay, remote, notice fit')
      await q.say('Femi said yes. Pay, remote and notice all fit. Shall I interview him today?')
      M('iv', <ApproveMoment label="Q-led interview" title="Four questions, about fifteen minutes." lines={['Built from your must-haves', 'He can use text, voice or video, and pause any time', 'You get the transcript and my notes. You decide.']} primary="Yes, interview him" secondary="I’ll do it myself" onYes={() => q.fire('approve')} />)
      await q.wait('approve')
      emit('interview_invited')
      q.show(null)
      setWorking('Interview pending')
      await q.say('Invited. You can watch live if you like.', { then: 'working' })
      await waitFor('interview_started', { fallbackMs: 2500 })
      setWorking('Interviewing Femi')
      M('live', <LiveMoment onWatch={() => { setLens('observe'); q.fire('watch') }} />)
      await waitFor('interview_done', { fallbackMs: 12000 })
      setLens(null)
      setWorking(null)
      return decideFlow()
    }

    const decideFlow = async () => {
      q.note('Interview done · transcript and notes ready')
      q.show(null)
      await q.say('Femi was strong on both must-haves. Kubernetes is a gap, and a learnable one.')
      M('decide', <DecideMoment onOffer={() => q.fire('offer')} />)
      await q.wait('offer')
      emit('offer_sent', { amount: 2000 })
      q.note('Offer sent · Kwame told kindly, with feedback')
      q.show(null)
      flash()
      setWorking('Offer out')
      await q.say('Offer sent. I’ve told Kwame kindly, with real feedback.', { then: 'working' })
      await waitFor('offer_accepted', { fallbackMs: 5000 })
      setWorking(null)
      flash()
      q.note('Femi accepted · starts December 1')
      await q.say('Femi accepted. He starts on December 1st. That’s your hire, Ada.', { then: 'done' })
    }

    // In standalone demos, simulate the interview on Ada's side so the live view isn't empty.
    if (!isFilm()) {
      on('interview_invited', async () => {
        await new Promise((r) => setTimeout(r, 1500))
        emit('interview_started')
        for (const [i, t] of interview.entries()) {
          emit('interview_line', { who: 'Q', text: t.q }); await new Promise((r) => setTimeout(r, 1200))
          emit('interview_line', { who: 'Femi', text: t.a }); emit('interview_note', t.note); await new Promise((r) => setTimeout(r, 1300))
          if (i === 3) emit('interview_done')
        }
      })
    }

    ;({ brief: briefFlow, morning: morningFlow, yes: yesFlow, decide: decideFlow }[at] || briefFlow)()
  }, [])

  const ask = (text) => {
    const t = text.toLowerCase()
    if (t.includes('undo')) q.fire('undo')
    else if (t.includes('where') || t.includes('roles') || t.includes('everyone')) setLens('roles')
    else if (t.includes('why')) q.fire('act', 'why')
    else if (t.includes('all') || t.includes('seven') || t.includes('shortlist')) q.fire('act', 'all')
    else q.say('I can help with that once this is done.')
  }

  return (
    <>
      <Stage q={q} user="Ada Nwosu" focus="Paystride · Backend Engineer" working={working} onAsk={ask} suggestions={suggest} bloom={bloom} onFocus={() => setLens('roles')} onWorking={() => setLens('doing')} />
      <Lens open={lens === 'roles'} onClose={() => setLens(null)} title="Roles & people"><RolesLens /></Lens>
      <Lens open={lens === 'doing'} onClose={() => setLens(null)} title="What Q is doing" width={700}><DoingLens log={q.log} working={working || 'Nothing running'} /></Lens>
      <Lens open={lens === 'person'} onClose={() => { setLens(null); q.fire('lensClosed') }} title="Femi Okafor · why Q picked him"><PersonLens p={femi} /></Lens>
      <Lens open={lens === 'list'} onClose={() => { setLens(null); q.fire('lensClosed') }} title="Shortlist · brief v2"><ShortlistLens onLess={(p) => q.note(`Less like ${p.name.split(' ')[0]} · brief v3, re-ranked`)} /></Lens>
      <Lens open={lens === 'observe'} onClose={() => setLens(null)} title="Live · Q interviewing Femi Okafor" width={1040}><ObserverLens /></Lens>
    </>
  )
}
