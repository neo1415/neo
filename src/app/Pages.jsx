import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, MessageSquare, Mic, Play } from 'lucide-react'
import { Avatar, Fact } from '../ui/kit'
import { brief, mutual } from '../data'
import { PageHead } from './Shell'
import { activity, everyone, interviews, needsYou, person, role, roles, stages } from './data'

const fade = (i) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.04, duration: 0.35, ease: [0, 0, 0.2, 1] } })

function AskBar({ placeholder }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav('/app/chat/new')} className="row" style={{ width: '100%', height: 52, borderRadius: 'var(--r-pill)', border: '1px solid var(--line-2)', background: 'var(--ink-2)', padding: '0 8px 0 20px', color: 'var(--text-3)', fontSize: 15, marginBottom: 36 }}>
      <span className="grow" style={{ textAlign: 'left' }}>{placeholder}</span>
      <span className="row" style={{ width: 38, height: 38, borderRadius: '50%', justifyContent: 'center', color: 'var(--gold)', border: '1px solid var(--gold-line)' }}><Mic size={16} strokeWidth={1.75} /></span>
    </button>
  )
}

/* ---------------- Today: every decision across roles ---------------- */
export function Today() {
  const [done, setDone] = useState({})
  const nav = useNavigate()
  const open = needsYou.filter((n) => !done[n.id])
  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <PageHead kicker="Monday, October 26" title={open.length ? `${open.length} thing${open.length > 1 ? 's' : ''} need${open.length > 1 ? '' : 's'} you` : 'You’re all caught up'} sub="Everything Q is waiting on, across all your roles." />
      <AskBar placeholder="Ask Q anything, or say what you need…" />
      <AnimatePresence>
        {open.map((n, i) => (
          <motion.div key={n.id} layout {...fade(i)} exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }} className="row today-row" style={{ padding: '20px 0', borderTop: '1px solid var(--line)', gap: 16, alignItems: 'flex-start' }}>
            <Avatar name={person(n.who).name} size={40} />
            <div className="grow">
              <div className="label" style={{ marginBottom: 4 }}>{role(n.role).title}</div>
              <div style={{ fontSize: 17 }}>{n.title}</div>
              <p className="t2" style={{ fontSize: 14.5, marginTop: 2 }}>{n.detail}</p>
            </div>
            <div className="row today-actions" style={{ gap: 6 }}>
              <button className="btn btn-quiet btn-sm" onClick={() => nav(`/app/people/${n.who}`)}>Details</button>
              <button className="btn btn-primary btn-sm" onClick={() => setDone({ ...done, [n.id]: true })} data-q={`do-${n.id}`}>{n.cta}</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {!open.length && <p className="t2" style={{ padding: '20px 0', borderTop: '1px solid var(--line)' }}>Nothing is waiting on you. Q will bring the next decision here.</p>}

      <div className="label" style={{ margin: '48px 0 14px' }}>While you were away</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'var(--line)', borderRadius: 18, overflow: 'hidden' }}>
        {[['575', 'profiles looked at'], ['7', 'fit both ways'], ['1', 'said yes'], ['1', 'interview done']].map(([n, l]) => (
          <div key={l} style={{ background: 'var(--ink-1)', padding: '20px 22px' }}><div className="voice num" style={{ fontSize: 'var(--t-2xl)' }}>{n}</div><div className="t3" style={{ fontSize: 13 }}>{l}</div></div>
        ))}
      </div>
      <Link to="/app/activity" className="t2" style={{ display: 'inline-block', fontSize: 14, marginTop: 14 }}>See everything Q did →</Link>
    </div>
  )
}

/* ---------------- Roles ---------------- */
export function Roles() {
  const nav = useNavigate()
  return (
    <div className="page">
      <PageHead title="Roles" sub="Three open, one filled this month." right={<button className="btn btn-primary btn-sm" onClick={() => nav('/app/chat/new')}>Describe a new role</button>} />
      <div className="col" style={{ gap: 12 }}>
        {roles.map((r, i) => {
          const ppl = everyone.filter((p) => p.role === r.id)
          return (
            <motion.button key={r.id} {...fade(i)} onClick={() => nav(`/app/roles/${r.id}`)} data-q={`role-${r.id}`} style={{ textAlign: 'left', padding: 24, borderRadius: 22, border: '1px solid var(--line)', background: 'var(--ink-1)', display: 'grid', gridTemplateColumns: '1.3fr 1fr auto', gap: 24, alignItems: 'center' }} className="role-card">
              <div>
                <div className="row" style={{ gap: 10 }}><span style={{ fontSize: 19 }}>{r.title}</span><span className={`chip ${r.status === 'Needs you' ? 'warn' : r.status === 'Filled' ? 'ok' : 'gold'}`}>{r.status}</span></div>
                <p className="t2" style={{ fontSize: 14.5, marginTop: 6 }}>{r.summary}</p>
              </div>
              <div className="hide-md">
                <div className="row" style={{ gap: 4 }}>
                  {stages.map((s) => {
                    const n = ppl.filter((p) => p.stage === s).length
                    return <div key={s} title={`${s}: ${n}`} style={{ flex: 1, height: 4, borderRadius: 4, background: n ? 'var(--gold)' : 'var(--ink-3)', opacity: n ? 0.45 + Math.min(n, 3) * 0.18 : 1 }} />
                  })}
                </div>
                <div className="t3" style={{ fontSize: 12.5, marginTop: 8 }}>{stages.map((s) => [s, ppl.filter((p) => p.stage === s).length]).filter(([, n]) => n).map(([s, n]) => `${n} ${s.toLowerCase()}`).join(' · ')}</div>
              </div>
              <span className="t3 num" style={{ fontSize: 13 }}>{ppl.length} people</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export function RolePage() {
  const { id } = useParams()
  const r = role(id) || roles[0]
  const [tab, setTab] = useState('pipeline')
  const nav = useNavigate()
  const ppl = everyone.filter((p) => p.role === r.id)
  return (
    <div className="page">
      <Link to="/app/roles" className="row t2" style={{ gap: 6, fontSize: 14, marginBottom: 20 }}><ArrowLeft size={15} /> Roles</Link>
      <PageHead kicker={`Brief ${r.brief} · open since ${r.open}`} title={r.title} sub={`${r.budget} · ${r.where}`} right={<button className="btn btn-quiet btn-sm" onClick={() => nav('/app/chat/c1')}><MessageSquare size={14} /> Ask Q about this role</button>} />
      <div className="tabs" role="tablist">
        {[['pipeline', 'Pipeline'], ['people', 'People'], ['brief', 'Brief'], ['activity', 'Activity']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)} data-q={`tab-${k}`}>{l}{tab === k && <motion.span layoutId="tabbar" className="bar" />}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {tab === 'pipeline' && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(140px, 1fr))`, gap: 10, overflowX: 'auto' }}>
              {stages.map((s) => {
                const here = ppl.filter((p) => p.stage === s)
                return (
                  <div key={s} style={{ minHeight: 280, borderRadius: 18, background: 'var(--ink-1)', border: '1px solid var(--line)', padding: 12 }}>
                    <div className="label" style={{ marginBottom: 12 }}>{s} · {here.length}</div>
                    <div className="col" style={{ gap: 8 }}>
                      {here.map((p) => (
                        <Link key={p.id} to={`/app/people/${p.id}`} style={{ padding: 12, borderRadius: 14, background: 'var(--ink-2)', border: '1px solid var(--line)' }} data-q={`card-${p.id}`}>
                          <div className="row" style={{ gap: 8 }}><Avatar name={p.name} size={26} /><span className="grow" style={{ fontSize: 14 }}>{p.name}</span><span className="voice num" style={{ color: 'var(--gold)' }}>{mutual(p)}</span></div>
                          <div className="t3" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.4 }}>{p.gaps || p.now}</div>
                        </Link>
                      ))}
                      {!here.length && <div className="t3" style={{ fontSize: 12.5 }}>No one yet</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {tab === 'people' && <PeopleTable list={ppl} />}
          {tab === 'brief' && (
            <div style={{ maxWidth: 680 }}>
              {[['Role', brief.level], ['First 90 days', brief.outcomes.join(' · ')], ['Must have', brief.musts.join(' · ')], ['Nice to have', brief.nice.join(' · ')], ['Budget', r.budget], ['Where', r.where], ['Decided by', 'Ada Nwosu with Tolu Bello (CTO)']].map(([k, v]) => (
                <div key={k} className="row" style={{ alignItems: 'baseline', padding: '14px 0', borderTop: '1px solid var(--line)' }}><span className="label" style={{ width: 150, flexShrink: 0 }}>{k}</span><span style={{ fontSize: 15 }}>{v}</span></div>
              ))}
              <p className="t3" style={{ fontSize: 13, marginTop: 16 }}>v1 “Senior, 7+ years” kept in history · changed Oct 20 for budget fit.</p>
            </div>
          )}
          {tab === 'activity' && <ActivityList filter={r.id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ---------------- People ---------------- */
function PeopleTable({ list }) {
  const nav = useNavigate()
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead><tr><th>Person</th><th className="hide-md">Role</th><th>Stage</th><th className="hide-md">Source</th><th className="hide-md">What Q doesn’t know</th><th style={{ textAlign: 'right' }}>Mutual</th></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id} onClick={() => nav(`/app/people/${p.id}`)} data-q={`row-${p.id}`}>
              <td><span className="row" style={{ gap: 10 }}><Avatar name={p.name} size={30} /><span><span style={{ display: 'block' }}>{p.name}</span><span className="t3" style={{ fontSize: 12.5 }}>{p.now} · {p.city}</span></span></span></td>
              <td className="hide-md t2">{role(p.role).title}</td>
              <td><span className={`chip ${p.stage === 'Hired' ? 'ok' : p.stage === 'Interviewed' || p.stage === 'Interested' ? 'gold' : ''}`}>{p.stage}</span></td>
              <td className="hide-md t3" style={{ fontSize: 13 }}>{p.source}</td>
              <td className="hide-md" style={{ fontSize: 13, color: p.fits ? 'var(--text-3)' : 'var(--warn)' }}>{p.gaps || '—'}</td>
              <td className="voice num" style={{ textAlign: 'right', fontSize: 20, color: p.fits ? 'var(--gold)' : 'var(--text-3)' }}>{mutual(p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function People() {
  const [f, setF] = useState('all')
  const list = everyone.filter((p) => f === 'all' || p.role === f).sort((a, b) => mutual(b) - mutual(a))
  return (
    <div className="page">
      <PageHead title="People" sub={`${everyone.length} people across your roles. Everyone here agreed to be found.`} />
      <div className="row" style={{ gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['all', 'All roles'], ...roles.map((r) => [r.id, r.title])].map(([k, l]) => <button key={k} className="chip" style={f === k ? { color: 'var(--void)', background: 'var(--text)', borderColor: 'var(--text)' } : {}} onClick={() => setF(k)} data-q={`filter-${k}`}>{l}</button>)}
      </div>
      <PeopleTable list={list} />
    </div>
  )
}

export function PersonPage() {
  const { id } = useParams()
  const p = person(id) || everyone[0]
  const iv = interviews.find((i) => i.who === p.id && i.transcript.length)
  const nav = useNavigate()
  return (
    <div className="page" style={{ maxWidth: 940 }}>
      <button onClick={() => nav(-1)} className="row t2" style={{ gap: 6, fontSize: 14, marginBottom: 20 }}><ArrowLeft size={15} /> Back</button>
      <div className="row" style={{ gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar name={p.name} size={72} />
        <div className="grow">
          <h1 style={{ fontSize: 'var(--t-2xl)', fontWeight: 560, letterSpacing: '-.02em' }}>{p.name}</h1>
          <div className="t2">{p.now} · {p.city} · {role(p.role).title}</div>
          <div className="t3" style={{ fontSize: 13, marginTop: 2 }}>{p.source}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-quiet btn-sm" onClick={() => nav('/app/chat/c2')}><MessageSquare size={14} /> Ask Q</button>
          {p.stage === 'Interviewed' && p.id === 'femi' && <button className="btn btn-primary btn-sm" onClick={() => nav('/app/chat/c4')}>Draft offer</button>}
        </div>
      </div>
      <p className="voice" style={{ fontSize: 'var(--t-2xl)', margin: '32px 0', maxWidth: '28ch' }}>“{p.why}”</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, padding: '20px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <Fact k="Stage" v={p.stage} /><Fact k="Can do the work" v={p.fit} tone="ok" /><Fact k="Suits them" v={p.want} tone="ok" /><Fact k="Mutual" v={mutual(p)} /><Fact k="Expects" v={p.pay} tone={p.fits ? undefined : 'warn'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, marginTop: 36 }}>
        <div>
          <div className="label" style={{ marginBottom: 10 }}>Timeline</div>
          {[['Oct 20', 'Matched to brief v2'], ['Oct 26', 'Asked · company hidden'], ['Oct 26', 'Said yes · shared 3 pieces of evidence'], ['Oct 26', 'Q interview · 16 min'], ['Oct 26', 'Tolu reviewed transcript · 4/5']].slice(0, p.id === 'femi' ? 5 : 1).map(([d, t], i) => (
            <div key={i} className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 14.5, alignItems: 'baseline' }}><span className="label num" style={{ width: 60 }}>{d}</span><span className="t2">{t}</span></div>
          ))}
          <div className="label" style={{ margin: '28px 0 10px' }}>What Q doesn’t know</div>
          <p className="t2" style={{ padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 14.5 }}>{p.gaps || 'Nothing important missing.'}</p>
        </div>
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><span className="label">Interview transcript</span>{iv && <span className="label">{iv.length} · {iv.mode}</span>}</div>
          {iv ? iv.transcript.map((t, i) => (
            <div key={i} style={{ padding: '14px 0', borderTop: '1px solid var(--line)' }}>
              <p className="voice" style={{ fontSize: 17 }}>{t.q}</p>
              <p className="t2" style={{ fontSize: 14.5, marginTop: 6 }}>{t.a}</p>
              <span className={`chip ${t.note.tone}`} style={{ marginTop: 8 }}>{t.note.tag} · {t.note.text}</span>
            </div>
          )) : <p className="t3" style={{ padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 14.5 }}>No interview yet. Ask Q to arrange one.</p>}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Interviews ---------------- */
export function Interviews() {
  const nav = useNavigate()
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHead title="Interviews" sub="Q-led and human interviews, with transcripts and Q’s notes." />
      {interviews.map((iv, i) => {
        const p = person(iv.who)
        return (
          <motion.button key={iv.id} {...fade(i)} onClick={() => nav(`/app/people/${p.id}`)} className="row" style={{ width: '100%', textAlign: 'left', padding: '20px 0', borderTop: '1px solid var(--line)', gap: 16 }}>
            <Avatar name={p.name} size={40} />
            <div className="grow"><div style={{ fontSize: 16 }}>{p.name} <span className="t3" style={{ fontSize: 13.5 }}>· {role(iv.role).title}</span></div><div className="t2" style={{ fontSize: 14 }}>{iv.when} · {iv.mode} · {iv.length}</div></div>
            {iv.status === 'Done' ? <span className="chip ok"><Check size={13} /> Transcript ready</span> : <span className="chip warn">{iv.status}</span>}
            <Play size={16} className="t3" />
          </motion.button>
        )
      })}
    </div>
  )
}

/* ---------------- What Q did ---------------- */
function ActivityList({ filter }) {
  return activity.filter((a) => !filter || a[2] === filter).map(([t, text, r], i) => (
    <motion.div key={i} {...fade(i)} className="row" style={{ padding: '14px 0', borderTop: '1px solid var(--line)', alignItems: 'baseline', gap: 16 }}>
      <span className="label num" style={{ width: 70 }}>{t}</span><span className="grow" style={{ fontSize: 15 }}>{text}</span><span className="t3 hide-md" style={{ fontSize: 13 }}>{role(r).title}</span>
    </motion.div>
  ))
}

export function ActivityPage() {
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHead title="What Q did" sub="Everything Q did in the background, and the limits it works within." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, background: 'var(--line)', borderRadius: 18, overflow: 'hidden', marginBottom: 36 }}>
        {[['Only consented sources', 'Profiles, past applicants who agreed, one licensed partner'], ['Nothing sent without you', '2 messages approved this week'], ['$4.20 of $25', 'This month’s search and interview spend'], ['Never decides', 'Every rejection or hire is a person’s call']].map(([a, b]) => (
          <div key={a} style={{ background: 'var(--ink-1)', padding: '18px 20px' }}><div style={{ fontSize: 15 }}>{a}</div><div className="t3" style={{ fontSize: 13, marginTop: 4 }}>{b}</div></div>
        ))}
      </div>
      <ActivityList />
    </div>
  )
}
