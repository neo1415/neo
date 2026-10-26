import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Check, CheckCircle2, Clock, Eye, EyeOff, Filter, HelpCircle, Info, MapPin, Send, ShieldCheck, Sparkles, ThumbsDown, Wallet, X, Database, Undo2, GitBranch } from 'lucide-react'
import { Avatar, Badge, Button, Drawer, Meter, QOrb, ScoreRing, Segmented, Toggle, ease, spring, useToast } from '../../ui'
import { baseRequirements, candidates, scoreCandidate, sources } from '../../data'

const reasons = [
  { id: 'oncall', t: 'Needs more production on-call experience', apply: (r) => r.map((x) => (x.id === 'r1' ? { ...x, w: 0.4 } : x.id === 'r2' ? { ...x, w: 0.22 } : x.id === 'r5' ? { ...x, w: 0.06 } : x)) },
  { id: 'data', t: 'Too analytics / data-warehouse focused', apply: (r) => r.map((x) => (x.id === 'r3' ? { ...x, w: 0.28 } : x)) },
  { id: 'budget', t: 'Seniority is above our budget', apply: (r) => r },
]

function SourceBadge({ s, fresh }) {
  const src = sources[s]
  return <span className="row tiny muted" style={{ gap: 6 }}><Badge tone={src.tone} icon={Database}>{src.label}</Badge><Clock size={11} />{fresh}</span>
}

function CandidateRow({ c, sc, rank, onOpen, onLess, status, onInterest }) {
  const lowCov = sc.C < 65
  return (
    <motion.div layout="position" transition={{ type: 'spring', stiffness: 260, damping: 30 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card hover" style={{ padding: 16, display: 'grid', gridTemplateColumns: '28px 1.5fr 1fr auto', gap: 18, alignItems: 'center', cursor: 'pointer' }} onClick={onOpen} data-q={`cand-${c.id}`}>
      <motion.div key={rank} initial={{ scale: 1.5, color: 'var(--gold)' }} animate={{ scale: 1, color: 'var(--faint)' }} style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, textAlign: 'center' }}>{rank}</motion.div>
      <div className="row" style={{ gap: 12, minWidth: 0 }}>
        <Avatar name={c.name} size={44} />
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ fontWeight: 650, fontSize: 15 }}>{c.name}
            {status === 'interested' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}><Badge tone="green" icon={Check}>Interested</Badge></motion.span>}
            {status === 'sent' && <Badge tone="blue" dot pulse>Interest check sent</Badge>}
          </div>
          <div className="muted small">{c.title} · {c.company} · <MapPin size={11} style={{ verticalAlign: -1 }} /> {c.city}</div>
          <div style={{ marginTop: 6 }}><SourceBadge s={c.source} fresh={c.fresh} /></div>
        </div>
      </div>
      <div className="col" style={{ gap: 6 }}>
        <div className="row tiny" style={{ gap: 6 }}>
          {c.unknown.slice(0, 1).map((u) => <Badge key={u} tone="amber" icon={HelpCircle}>{u}</Badge>)}
        </div>
        <div className="row small" style={{ gap: 8 }}>
          <span className="muted" style={{ width: 62 }}>Coverage</span>
          <div className="grow"><Meter value={sc.C} color={lowCov ? 'var(--amber)' : 'var(--green)'} height={5} /></div>
          <b style={{ width: 28, textAlign: 'right' }}>{sc.C}</b>
        </div>
      </div>
      <div className="row" style={{ gap: 14 }}>
        <ScoreRing value={sc.F} size={50} label="FIT" />
        <ScoreRing value={sc.A} size={50} label="THEM" color="var(--blue)" />
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          <motion.div key={sc.M} initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={spring} style={{ fontFamily: 'var(--display)', fontWeight: 750, fontSize: 26, letterSpacing: '-.03em' }}>{sc.M.toFixed(1)}</motion.div>
          <div className="tiny muted" style={{ fontWeight: 600, letterSpacing: '.06em' }}>MUTUAL</div>
        </div>
        <div className="col" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant={status ? '' : 'primary'} disabled={!!status} onClick={onInterest} data-q={`interest-${c.id}`}>{status ? 'Sent' : 'Check interest'}</Button>
          <Button size="sm" variant="ghost" icon={ThumbsDown} onClick={onLess} data-q={`less-${c.id}`}>Less like this</Button>
        </div>
      </div>
    </motion.div>
  )
}

function Detail({ c, reqs, sc, onInterest, status }) {
  const [compose, setCompose] = useState(false)
  const [hideCo, setHideCo] = useState(true)
  const [sending, setSending] = useState(false)
  if (!c) return null
  const total = reqs.reduce((a, r) => a + r.w, 0)
  return (
    <>
      <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--line)', background: '#fff' }}>
        <div className="row" style={{ gap: 14 }}>
          <Avatar name={c.name} size={56} />
          <div className="grow">
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700 }}>{c.name}</div>
            <div className="muted">{c.title} · {c.company} · {c.years} yrs</div>
            <div style={{ marginTop: 6 }}><SourceBadge s={c.source} fresh={c.fresh} /></div>
          </div>
        </div>
        <div className="grid g4" style={{ marginTop: 18, gap: 10 }}>
          {[['Employer fit', sc.F, 'var(--gold)'], ['Their compatibility', sc.A, 'var(--blue)'], ['Evidence coverage', sc.C, sc.C < 65 ? 'var(--amber)' : 'var(--green)']].map(([l, v, col]) => (
            <div key={l} className="card row" style={{ padding: 10, gap: 10 }}><ScoreRing value={v} size={42} stroke={4} color={col} /><span className="small" style={{ fontWeight: 550, lineHeight: 1.25 }}>{l}</span></div>
          ))}
          <div className="card" style={{ padding: 10, background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' }}><div className="tiny" style={{ color: 'var(--gold-2)', fontWeight: 600 }}>MUTUAL √(F×A)</div><div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 750 }}>{sc.M.toFixed(1)}</div></div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 26px' }}>
        <AnimatePresence mode="wait">
          {!compose ? (
            <motion.div key="d" exit={{ opacity: 0, x: -20 }}>
              <div className="row between"><div className="card-title">Why Q ranked {c.name.split(' ')[0]} here</div><Badge icon={Info}>Rubric v2 · model 2026.10</Badge></div>
              <div className="card" style={{ marginTop: 12 }}>
                <table className="table">
                  <thead><tr><th>Requirement</th><th>Weight</th><th>Skill</th><th>Confidence</th></tr></thead>
                  <tbody>
                    {reqs.map((r, j) => (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: j * 0.06 }}>
                        <td style={{ fontWeight: 550 }}>{r.short}{r.must && <span className="badge dark" style={{ marginLeft: 6, height: 18 }}>Must</span>}</td>
                        <td>{Math.round((r.w / total) * 100)}%</td>
                        <td style={{ width: 110 }}><Meter value={c.s[j] * 100} delay={j * 0.05} height={5} /></td>
                        <td>{c.c[j] >= 0.75 ? <Badge tone="green">Verified</Badge> : c.c[j] >= 0.55 ? <Badge tone="blue">Partial</Badge> : <Badge tone="amber">Unverified</Badge>}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="tiny muted" style={{ marginTop: 8 }}>Unverified evidence uses a neutral prior (0.5) — it is not counted as failure.</p>
              <div className="card-title" style={{ marginTop: 22 }}>Evidence</div>
              {c.evidence.map((e) => <div key={e} className="row small" style={{ marginTop: 8, alignItems: 'flex-start' }}><CheckCircle2 size={15} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />{e}</div>)}
              <div className="card-title" style={{ marginTop: 22 }}>What Q doesn’t know</div>
              {c.unknown.map((e) => <div key={e} className="row small" style={{ marginTop: 8 }}><HelpCircle size={15} color="var(--amber)" />{e}</div>)}
              <div className="card-title" style={{ marginTop: 22 }}>Compatibility for them</div>
              <div className="grid g3" style={{ marginTop: 10, gap: 8 }}>
                {[[Wallet, 'Pay', c.salary, !c.salary.includes('3,500')], [MapPin, 'Work pattern', c.remote, true], [Clock, 'Notice', c.notice, true]].map(([I, l, v, ok]) => (
                  <div key={l} className="card" style={{ padding: 12 }}><div className="row tiny muted"><I size={12} />{l}</div><div className="small" style={{ fontWeight: 600, marginTop: 4 }}>{v}</div><div style={{ marginTop: 6 }}>{ok ? <Badge tone="green" icon={Check}>Fits</Badge> : <Badge tone="red" icon={X}>Above ceiling</Badge>}</div></div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="c" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="row" style={{ gap: 10 }}><QOrb size={26} /><div className="card-title">Confidential interest check</div></div>
              <p className="muted small" style={{ marginTop: 6 }}>Q drafted this. Nothing is sent until you approve.</p>
              <div className="card" style={{ marginTop: 14, padding: 16, lineHeight: 1.65, fontSize: 14 }}>
                Hi {c.name.split(' ')[0]}, a <b>{hideCo ? '42-person Series A fintech' : 'Paystride'}</b> in Lagos is hiring a Backend Engineer to make their payments API reliable. Your work cutting p95 latency on a high-volume ledger looks highly relevant.
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'var(--paper)', border: '1px solid var(--line)' }} className="small">
                  <b>Budget:</b> $1,800–2,000/mo · <b>Remote</b> (WAT ±2h) · <b>Review window:</b> 3 working days
                </div>
                <div className="small muted" style={{ marginTop: 10 }}>You can accept, defer or decline — and opt out of future contact with one tap.</div>
              </div>
              <div className="card" style={{ marginTop: 12 }}>
                {[[EyeOff, 'Hide company name until they accept', hideCo, setHideCo], [ShieldCheck, 'Respect opt-outs & contact limits', true, () => {}]].map(([I, t, v, s]) => (
                  <div key={t} className="row" style={{ padding: '12px 14px', gap: 12, borderBottom: '1px solid var(--line)' }}><I size={16} color="var(--muted)" /><span className="grow small" style={{ fontWeight: 550 }}>{t}</span><Toggle on={v} onChange={s} label={t} /></div>
                ))}
                <div className="row small muted" style={{ padding: '12px 14px', gap: 8 }}><Info size={14} />1 of 3 monthly outreach credits for this mandate</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="row" style={{ padding: 16, borderTop: '1px solid var(--line)', gap: 10, background: '#fff' }}>
        {compose && !status && <Button onClick={() => setCompose(false)}>Back</Button>}
        <span className="grow" />
        {status ? <Badge tone={status === 'interested' ? 'green' : 'blue'} icon={status === 'interested' ? Check : Send}>{status === 'interested' ? 'Candidate is interested' : 'Sent · awaiting response'}</Badge> : compose ? (
          <Button variant="gold" icon={Send} loading={sending} onClick={() => { setSending(true); setTimeout(() => { setSending(false); onInterest() }, 900) }} data-q="approve-send">Approve & send</Button>
        ) : (
          <Button variant="primary" iconRight={ArrowRight} onClick={() => setCompose(true)} data-q="compose-interest">Check mutual interest</Button>
        )}
      </div>
    </>
  )
}

export default function Shortlist() {
  const toast = useToast()
  const nav = useNavigate()
  const [reqs, setReqs] = useState(baseRequirements)
  const [prevReqs, setPrevReqs] = useState(null)
  const [version, setVersion] = useState(2)
  const [sort, setSort] = useState('M')
  const [loaded, setLoaded] = useState(0)
  const [open, setOpen] = useState(null)
  const [less, setLess] = useState(null)
  const [status, setStatus] = useState({})
  const [reranking, setReranking] = useState(false)

  useEffect(() => {
    if (loaded >= candidates.length) return
    const t = setTimeout(() => setLoaded((l) => l + 1), loaded === 0 ? 500 : 380)
    return () => clearTimeout(t)
  }, [loaded])

  const scored = useMemo(() => candidates.slice(0, loaded).map((c) => ({ c, sc: scoreCandidate(c, reqs) })).sort((a, b) => b.sc[sort] - a.sc[sort]), [loaded, reqs, sort])

  const applyLess = (r) => {
    setPrevReqs(reqs)
    setLess(null)
    setReranking(true)
    setTimeout(() => {
      setReqs(r.apply(reqs))
      setVersion(3)
      setReranking(false)
      toast('Mandate v3 · re-ranked in 0.8s', { sub: `“${r.t}” — prior decisions kept`, tone: 'gold', action: { label: 'Undo', onClick: () => { setReqs(baseRequirements); setVersion(2) } } })
    }, 800)
  }
  const interest = (id) => {
    setStatus((s) => ({ ...s, [id]: 'sent' }))
    toast('Interest check sent', { sub: 'Company name hidden until they accept', tone: 'success' })
    setTimeout(() => {
      setStatus((s) => ({ ...s, [id]: 'interested' }))
      const n = candidates.find((x) => x.id === id).name
      toast(`${n} is interested`, { sub: 'Pay ✓ · Remote ✓ · Notice 4 weeks ✓', tone: 'gold', duration: 5000 })
    }, 3200)
  }
  const openC = candidates.find((x) => x.id === open)

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="row small muted" style={{ gap: 8 }}>Mandates / Paystride <AnimatePresence mode="wait"><motion.span key={version} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}><Badge tone="gold" icon={GitBranch}>v{version}</Badge></motion.span></AnimatePresence></div>
          <h1>Backend Engineer — API reliability</h1>
        </div>
        <div className="row">
          <Segmented id="sort" options={[{ value: 'M', label: 'Mutual' }, { value: 'F', label: 'Employer fit' }, { value: 'C', label: 'Coverage' }]} value={sort} onChange={setSort} />
          <Button icon={Filter}>Filters</Button>
          <Button variant="primary" iconRight={ArrowRight} onClick={() => nav('/app/pipeline')} data-q="to-pipeline">Pipeline</Button>
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 14 }}>
        <div className="card row grow" style={{ padding: '10px 14px', gap: 10 }}>
          <QOrb size={22} thinking={loaded < candidates.length || reranking} />
          <span className="small grow">
            {reranking ? 'Re-ranking with your correction…' : loaded < candidates.length ? <>Streaming results from 4 permissioned sources… <b>{loaded}</b> found</> : <><b>7 matches</b> from 575 scanned · 5 well-evidenced, 2 provisional. No profiles were fabricated to fill the list.</>}
          </span>
          {loaded >= candidates.length && <Badge tone="green" icon={ShieldCheck}>Protected traits excluded</Badge>}
        </div>
      </div>

      <motion.div className="col" style={{ gap: 10, opacity: reranking ? 0.55 : 1, transition: 'opacity .3s' }}>
        <AnimatePresence>
          {scored.map(({ c, sc }, i) => (
            <CandidateRow key={c.id} c={c} sc={sc} rank={i + 1} status={status[c.id]} onOpen={() => setOpen(c.id)} onLess={() => setLess(c.id)} onInterest={() => { setOpen(c.id) }} />
          ))}
        </AnimatePresence>
        {loaded < candidates.length && Array.from({ length: Math.min(2, candidates.length - loaded) }).map((_, i) => (
          <div key={'s' + i} className="card row" style={{ padding: 16, gap: 18 }}>
            <div className="skel" style={{ width: 44, height: 44, borderRadius: 99 }} />
            <div className="grow col" style={{ gap: 8 }}><div className="skel" style={{ height: 12, width: '30%' }} /><div className="skel" style={{ height: 10, width: '50%' }} /></div>
            <div className="skel" style={{ width: 160, height: 44 }} />
          </div>
        ))}
      </motion.div>

      <AnimatePresence>
        {less && (
          <>
            <motion.div className="scrim" style={{ background: 'rgba(11,12,15,.2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLess(null)} />
            <motion.div className="modal" style={{ x: '-50%', y: '-50%', width: 480, padding: 22 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring}>
              <div className="row" style={{ gap: 10 }}><QOrb size={26} /><div className="card-title">Not quite this kind of candidate?</div></div>
              <p className="muted small" style={{ marginTop: 6 }}>Tell Q why. I’ll update the mandate and re-rank — without losing any decisions you’ve already made.</p>
              <div className="col" style={{ gap: 8, marginTop: 16 }}>
                {reasons.map((r, i) => <motion.button key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="option" style={{ padding: 12 }} onClick={() => applyLess(r)} data-q={`reason-${r.id}`}><span className="small" style={{ fontWeight: 600 }}>{r.t}</span></motion.button>)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Drawer open={!!open} onClose={() => setOpen(null)}>
        {openC && <Detail c={openC} reqs={reqs} sc={scoreCandidate(openC, reqs)} status={status[openC.id]} onInterest={() => interest(openC.id)} />}
      </Drawer>
    </div>
  )
}
