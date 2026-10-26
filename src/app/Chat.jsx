import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Check, Mic, Paperclip, X } from 'lucide-react'
import { Avatar, Fact, MomentHead } from '../ui/kit'
import { mutual } from '../data'
import { everyone, needsYou, person, role, stages } from './data'

/* ---------------- inline cards Q can put in a reply ---------------- */

const Card = ({ children, style }) => <div className="moment" style={{ maxWidth: 'none', padding: '18px 20px', marginTop: 14, ...style }}>{children}</div>

function NeedsCard() {
  const [done, setDone] = useState({})
  return (
    <Card>
      <MomentHead label="Needs you · 3" right={<Link to="/app/today" className="label" style={{ color: 'var(--text-2)' }}>Open Today →</Link>} />
      {needsYou.map((n, i) => (
        <div key={n.id} className="row" style={{ padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 0, gap: 14 }}>
          <Avatar name={person(n.who).name} size={34} />
          <div className="grow"><div style={{ fontSize: 15 }}>{n.title}</div><div className="t3" style={{ fontSize: 13 }}>{role(n.role).title} · {n.detail}</div></div>
          {done[n.id] ? <span className="chip ok"><Check size={13} /> Done</span> : <button className="btn btn-quiet btn-sm" onClick={() => setDone({ ...done, [n.id]: true })}>{n.cta}</button>}
        </div>
      ))}
    </Card>
  )
}

function PipelineCard({ roleId = 'backend' }) {
  const ppl = everyone.filter((p) => p.role === roleId)
  return (
    <Card>
      <MomentHead label={`${role(roleId).title} · brief ${role(roleId).brief}`} right={<Link to={`/app/roles/${roleId}`} className="label" style={{ color: 'var(--text-2)' }}>Open role →</Link>} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(0,1fr))`, borderTop: '1px solid var(--line)' }}>
        {stages.map((s, i) => {
          const here = ppl.filter((p) => p.stage === s)
          return (
            <div key={s} style={{ padding: '12px 8px 4px', borderLeft: i ? '1px solid var(--line)' : 0 }}>
              <div className="label" style={{ marginBottom: 10 }}>{s} {here.length ? `· ${here.length}` : ''}</div>
              {here.map((p) => <Link key={p.id} to={`/app/people/${p.id}`} className="row" style={{ gap: 6, fontSize: 13, marginBottom: 8 }}><Avatar name={p.name} size={20} />{p.name.split(' ')[0]}</Link>)}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function PersonCard({ id = 'femi', onOffer }) {
  const p = person(id)
  return (
    <Card>
      <MomentHead label="Person" right={<span className="label num">Mutual {mutual(p)}</span>} />
      <div className="row" style={{ gap: 12 }}><Avatar name={p.name} size={42} /><div className="grow"><div style={{ fontSize: 16 }}>{p.name}</div><div className="t3" style={{ fontSize: 13 }}>{p.now} · {p.city} · {p.source}</div></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, margin: '16px 0' }}>
        <Fact k="Can do the work" v={`${p.fit} · verified evidence`} tone="ok" /><Fact k="Suits him" v={`${p.want} · pay & remote fit`} tone="ok" /><Fact k="Unknown" v={p.gaps || '—'} tone="warn" />
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Link to={`/app/people/${p.id}`} className="btn btn-quiet btn-sm">Open profile</Link>
        {onOffer && <button className="btn btn-primary btn-sm" onClick={onOffer}>Draft an offer</button>}
      </div>
    </Card>
  )
}

function ShortlistCard({ roleId = 'support' }) {
  const ppl = everyone.filter((p) => p.role === roleId).sort((a, b) => mutual(b) - mutual(a))
  const nav = useNavigate()
  return (
    <Card>
      <MomentHead label={`${role(roleId).title} · shortlist`} />
      <table className="tbl">
        <thead><tr><th>Person</th><th>Why</th><th>Stage</th><th style={{ textAlign: 'right' }}>Mutual</th></tr></thead>
        <tbody>{ppl.map((p) => (
          <tr key={p.id} onClick={() => nav(`/app/people/${p.id}`)}>
            <td><span className="row" style={{ gap: 8 }}><Avatar name={p.name} size={24} />{p.name}</span></td>
            <td className="t2" style={{ fontSize: 13.5 }}>{p.why}</td><td><span className="chip">{p.stage}</span></td>
            <td className="voice num" style={{ textAlign: 'right', fontSize: 20, color: 'var(--gold)' }}>{mutual(p)}</td>
          </tr>
        ))}</tbody>
      </table>
    </Card>
  )
}

function BriefCard() {
  const [saved, setSaved] = useState(false)
  return (
    <Card>
      <MomentHead label="Draft brief · Data Analyst" right={saved ? <span className="chip ok"><Check size={13} /> Saved as a role</span> : null} />
      {[['Outcome', 'Weekly growth dashboards the team trusts'], ['Must have', 'SQL · one BI tool · explaining numbers to non-analysts'], ['Budget', '$1,000–1,300 / month'], ['Where', 'Lagos, hybrid 2 days']].map(([k, v], i) => (
        <div key={k} className="row" style={{ alignItems: 'baseline', padding: '9px 0', borderTop: i ? '1px solid var(--line)' : 0 }}><span className="label" style={{ width: 110 }}>{k}</span><span style={{ fontSize: 14.5 }}>{v}</span></div>
      ))}
      {!saved && <div className="row" style={{ gap: 8, marginTop: 14 }}><button className="btn btn-primary btn-sm" onClick={() => setSaved(true)}>Save and start searching</button><button className="btn btn-text btn-sm">Edit</button></div>}
    </Card>
  )
}

function OfferCard() {
  const [sent, setSent] = useState(false)
  const [confirm, setConfirm] = useState(false)
  return (
    <Card>
      <MomentHead label="Offer draft · Femi Okafor" right={<span className="label">You decide</span>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}><Fact k="Salary" v="$2,000 / month" /><Fact k="Work" v="Remote · WAT" /><Fact k="Start" v="December 1" /></div>
      <p className="t2" style={{ fontSize: 14, margin: '14px 0' }}>“Femi, your incident answer was the best we heard. We’d love you to own reliability with us.”</p>
      {sent ? <span className="chip ok"><Check size={13} /> Offer sent · Kwame told kindly</span> : confirm ? (
        <div className="row" style={{ gap: 8 }}><span className="t2" style={{ fontSize: 14 }}>Send this offer now?</span><button className="btn btn-gold btn-sm" onClick={() => setSent(true)}>Send offer</button><button className="btn btn-text btn-sm" onClick={() => setConfirm(false)}>Back</button></div>
      ) : (
        <div className="row" style={{ gap: 8 }}><button className="btn btn-primary btn-sm" onClick={() => setConfirm(true)}>Review and send</button><button className="btn btn-text btn-sm">Change terms</button></div>
      )}
    </Card>
  )
}

/* ---------------- Q's replies (prototype: keyword intents) ---------------- */

function reply(text, ctx) {
  const t = text.toLowerCase()
  if (ctx.drafting) return { text: 'Got it. Here’s the brief as I understand it. Nothing runs until you save it.', card: 'brief', done: true }
  if (/(new role|hire a|start a role|need a|data analyst)/.test(t)) return { text: 'Happy to. Tell me about the work: what should this person get done in their first 90 days?', drafting: true }
  if (/(today|need me|needs me|what.*waiting|todo)/.test(t)) return { text: 'Three things need you. The offer for Femi is the time-sensitive one.', card: 'needs' }
  if (/(pipeline|where is|everyone|backend)/.test(t)) return { text: 'Here’s where everyone is on Backend Engineer. Femi is furthest along. Kwame hasn’t replied yet.', card: 'pipeline' }
  if (/(why|femi|rank)/.test(t)) return { text: 'Femi ranks first because he’s done this exact job at higher volume, and the role suits him: pay, remote and notice all fit. The one gap is Kubernetes, which isn’t on your must-have list.', card: 'person' }
  if (/(shortlist|support|halima)/.test(t)) return { text: 'Three people are left for Customer Support Lead. Halima leads; I still need your scorecard for her.', card: 'shortlist' }
  if (/(offer|salary)/.test(t)) return { text: 'Here’s a draft based on his range and your budget. I won’t send anything until you confirm.', card: 'offer' }
  return { text: 'I can help with roles, people, interviews and offers. For example:', chips: true }
}

const seeds = {
  c1: [{ who: 'me', text: 'We need a backend engineer who can stop our API failures. Up to $2,000 a month.' }, { who: 'q', text: 'One honest flag: senior engineers here usually ask $2,400–3,200. I went with a strong mid-level, evidence first, and kept your budget. Here’s where things stand now.', card: 'pipeline' }],
  c2: [{ who: 'me', text: 'Why is Femi first?' }, { who: 'q', text: 'He’s done this exact job at higher volume, and the role suits him: pay, remote and notice all fit. The one gap is Kubernetes, which isn’t on your must-have list.', card: 'person' }],
  c3: [{ who: 'me', text: 'Show me the support lead shortlist' }, { who: 'q', text: 'Three people are left. Halima leads; I still need your scorecard for her.', card: 'shortlist' }],
  c4: [{ who: 'me', text: 'Draft Femi’s offer' }, { who: 'q', text: 'Here’s a draft based on his range and your budget. I won’t send anything until you confirm.', card: 'offer' }],
}

const suggestions = ['What needs me today?', 'Where is everyone on Backend Engineer?', 'Why is Femi first?', 'Start a new role']

function Words({ text, onDone }) {
  const words = text.split(' ')
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= words.length) { onDone && onDone(); return }
    const t = setTimeout(() => setN(n + 1), 32)
    return () => clearTimeout(t)
  }, [n])
  return <>{words.slice(0, n).join(' ')}</>
}

function QMark({ busy }) {
  return <span aria-hidden style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: 'radial-gradient(circle at 35% 30%, #fff3d6, #e3bd72 45%, #8a6428 80%)', boxShadow: busy ? '0 0 16px rgba(240,211,149,.7)' : '0 0 8px rgba(240,211,149,.3)', animation: busy ? 'qpulse 1.1s ease-in-out infinite' : 'none' }} />
}

export default function Chat() {
  const cards = (send) => ({ needs: <NeedsCard />, pipeline: <PipelineCard />, person: <PersonCard onOffer={() => send('Draft Femi’s offer')} />, shortlist: <ShortlistCard />, brief: <BriefCard />, offer: <OfferCard /> })
  return <ChatView seeds={seeds} reply={reply} cards={cards} suggestions={suggestions} greeting="What can I help with, Ada?" voiceTo="/app/voice" context={(id) => (id === 'c3' ? 'Customer Support Lead' : 'Backend Engineer')} />
}

export function ChatView({ seeds, reply, cards: makeCards, suggestions, greeting, voiceTo, context }) {
  const { id = 'new' } = useParams()
  const nav = useNavigate()
  const [msgs, setMsgs] = useState(seeds[id] || [])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [ctxRole, setCtxRole] = useState(context ? context(id) : null)
  const [drafting, setDrafting] = useState(false)
  const end = useRef()
  const ta = useRef()
  useEffect(() => { setMsgs(seeds[id] || []); setDrafting(false); setCtxRole(context ? context(id) : null) }, [id])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, busy])

  const send = (raw) => {
    const t = (raw ?? text).trim()
    if (!t || busy) return
    setText('')
    setMsgs((m) => [...m, { who: 'me', text: t }])
    setBusy(true)
    setTimeout(() => {
      const r = reply(t, { drafting })
      setDrafting(!!r.drafting)
      setMsgs((m) => [...m, { who: 'q', text: r.text, card: r.card, chips: r.chips, stream: true }])
      if (r.go) setTimeout(() => nav(r.go), 1800)
      setBusy(false)
    }, 700)
  }

  const cards = makeCards(send)
  const empty = msgs.length === 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: empty ? '0 20px' : '40px 20px 24px', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: empty ? 'center' : 'flex-start' }}>
          {empty ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 18 }}><span style={{ width: 54, height: 54, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #fff3d6, #e3bd72 45%, #8a6428 80%)', boxShadow: '0 0 40px rgba(240,211,149,.35)' }} /></div>
              <h1 className="voice" style={{ fontSize: 'var(--t-3xl)' }}>{greeting}</h1>
              <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
                {suggestions.map((s) => <button key={s} className="chip" style={{ height: 34, fontSize: 13.5 }} onClick={() => send(s)} data-q={`sugg-${s.slice(0, 10)}`}>{s}</button>)}
              </div>
            </motion.div>
          ) : (
            <div className="col" style={{ gap: 28 }}>
              <h1 className="sr-only">Chat with Q</h1>
              {msgs.map((m, i) => m.who === 'me' ? (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: 'flex-end', maxWidth: '78%', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 20, padding: '11px 16px', fontSize: 15.5, lineHeight: 1.55 }}>{m.text}</motion.div>
              ) : (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                  <QMark />
                  <div className="grow" style={{ fontSize: 16, lineHeight: 1.65 }}>
                    <AnswerBody m={m} cards={cards} send={send} last={i === msgs.length - 1} suggestions={suggestions} />
                  </div>
                </motion.div>
              ))}
              {busy && <div className="row" style={{ gap: 14 }}><QMark busy /><span className="t3" style={{ fontSize: 14 }}>Thinking…</span></div>}
              <div ref={end} />
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line-2)', borderRadius: 24, padding: '10px 10px 10px 16px' }}>
            {ctxRole && (
              <span className="chip gold" style={{ height: 24, fontSize: 12, marginBottom: 6 }}>Context: {ctxRole}<button aria-label="Remove context" onClick={() => setCtxRole(null)} style={{ display: 'grid', placeItems: 'center' }}><X size={12} /></button></span>
            )}
            <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
              <textarea ref={ta} rows={1} value={text} onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(160, e.target.scrollHeight) + 'px' }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Message Q" aria-label="Message Q"
                style={{ flex: 1, background: 'none', border: 0, outline: 'none', resize: 'none', fontSize: 15.5, lineHeight: 1.5, padding: '8px 0' }} data-q="chat-input" />
              <button className="btn btn-text" aria-label="Attach a file" style={{ width: 38, height: 38, padding: 0 }}><Paperclip size={17} strokeWidth={1.75} /></button>
              <button className="btn btn-quiet" aria-label="Switch to voice" onClick={() => nav(voiceTo)} style={{ width: 38, height: 38, padding: 0, color: 'var(--gold)', borderColor: 'var(--gold-line)' }} data-q="chat-voice"><Mic size={17} strokeWidth={1.75} /></button>
              <button className="btn btn-primary" aria-label="Send" disabled={!text.trim() || busy} onClick={() => send()} style={{ width: 38, height: 38, padding: 0 }} data-q="chat-send"><ArrowUp size={18} /></button>
            </div>
          </div>
          <p className="t3" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>Q can make mistakes. It never sends, rejects or hires without you.</p>
        </div>
      </div>
    </div>
  )
}

function AnswerBody({ m, cards, send, last, suggestions }) {
  const [shown, setShown] = useState(!m.stream)
  return (
    <>
      <p>{m.stream && !shown ? <Words text={m.text} onDone={() => setShown(true)} /> : m.text}</p>
      <AnimatePresence>
        {shown && m.card && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>{cards[m.card]}</motion.div>}
        {shown && m.chips && last && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {suggestions.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
