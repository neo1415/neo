import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bot, CheckCircle2, Clock, Code2, FileText, Lock, MessageSquare, Play, ShieldCheck, Sparkles, Unlock, UserCheck, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, Meter, QOrb, ScoreRing, Segmented, ease, spring, stagger, useToast } from '../../ui'

const transcript = [
  { who: 'Q', t: '00:12', text: 'Tell me about the last production incident you led. What broke, and how did you find it?' },
  { who: 'Femi', t: '00:31', text: 'A settlement job held row locks on the ledger table and our payout API timed out. I traced it with pg_stat_activity, killed the blocker, then moved the job to batched updates with SKIP LOCKED.', tag: 'API reliability', strong: true },
  { who: 'Q', t: '01:48', text: 'How did you make sure it didn’t happen again?' },
  { who: 'Femi', t: '02:05', text: 'Post-mortem within 48h, an alert on lock wait time, and a runbook. Incidents on that service went from five a month to one.', tag: 'Observability', strong: true },
  { who: 'Q', t: '03:20', text: 'What would you do differently with Kubernetes autoscaling in that setup?' },
  { who: 'Femi', t: '03:41', text: 'Honestly I’ve mostly worked on VMs with autoscaling groups — I’d want to learn how HPA interacts with connection pools.', tag: 'Gap noted', strong: false },
]

const tests = [
  ['Reproduces slow endpoint', true, '2m'], ['Identifies missing composite index', true, '9m'], ['Fixes N+1 query in handler', true, '14m'], ['Adds regression test', true, '19m'], ['Adds latency alert', false, '—'],
]

export default function Assessment() {
  const nav = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState('screen')
  const [reviewer, setReviewer] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [scores, setScores] = useState({ r1: 4, r2: 4, r3: 4, r4: 3, r5: 4 })
  return (
    <div>
      <div className="page-head">
        <div className="row" style={{ gap: 14 }}>
          <Avatar name="Femi Okafor" size={52} />
          <div><div className="small muted">Backend Engineer · Assessment</div><h1>Femi Okafor</h1></div>
        </div>
        <div className="row">
          <Segmented id="atab" options={[{ value: 'screen', label: 'Q screen' }, { value: 'task', label: 'Practical task' }, { value: 'cards', label: 'Scorecards' }]} value={tab} onChange={setTab} />
          <Button variant="primary" iconRight={ArrowRight} onClick={() => nav('/app/decision')} data-q="to-decision">Compare & decide</Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'screen' && (
          <motion.div key="s" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
            <div className="card">
              <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', gap: 10 }}>
                <MessageSquare size={17} color="var(--gold)" /><div className="grow"><div style={{ fontWeight: 650 }}>Structured screen · text</div><div className="tiny muted">18 min · 6 role-specific questions · candidate disclosed AI interviewer</div></div>
                <Badge tone="green" icon={CheckCircle2}>Completed</Badge>
              </div>
              <div style={{ padding: 18 }} className="col">
                {transcript.map((m, i) => (
                  <motion.div key={i} {...stagger(i, 0.08)} className="row" style={{ alignItems: 'flex-start', gap: 12, padding: '8px 0' }}>
                    {m.who === 'Q' ? <QOrb size={26} /> : <Avatar name="Femi Okafor" size={26} />}
                    <div className="grow">
                      <div className="row tiny muted" style={{ gap: 8 }}><b style={{ color: 'var(--text)' }}>{m.who}</b>{m.t}{m.tag && <Badge tone={m.strong ? 'green' : 'amber'}>{m.tag}</Badge>}</div>
                      <div style={{ marginTop: 3, lineHeight: 1.55, ...(m.strong ? { background: 'linear-gradient(transparent 60%, rgba(46,139,87,.12) 60%)' } : {}) }}>{m.text}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="col" style={{ gap: 14 }}>
              <div className="card pad">
                <div className="row between"><div className="card-title">Rubric signals</div><Badge tone="violet" icon={Bot}>AI advice</Badge></div>
                {[['API reliability & incidents', 90], ['PostgreSQL performance', 86], ['Service design', 82], ['Observability', 78], ['Communication', 88]].map(([l, v], i) => (
                  <div key={l} style={{ marginTop: 14 }}><div className="row between small"><span>{l}</span><b>{v}</b></div><div style={{ marginTop: 5 }}><Meter value={v} delay={0.2 + i * 0.08} /></div></div>
                ))}
                <p className="tiny muted" style={{ marginTop: 14 }}>Signals are provisional aids tied to rubric v3. A human reviewer decides.</p>
              </div>
              <div className="card pad" style={{ background: 'var(--amber-soft)', borderColor: '#f1ddb6' }}>
                <div className="row" style={{ fontWeight: 650, color: 'var(--amber)' }}><Sparkles size={15} /> Q suggests</div>
                <p className="small" style={{ marginTop: 6, color: '#6b4f1c' }}>Strong incident evidence. Kubernetes is a learnable gap, not a must-have in your mandate. Recommend the practical task to confirm database depth.</p>
              </div>
            </div>
          </motion.div>
        )}
        {tab === 'task' && (
          <motion.div key="t" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', gap: 10 }}>
                <Code2 size={17} color="var(--gold)" /><div className="grow"><div style={{ fontWeight: 650 }}>Debug a slow payments API</div><div className="tiny muted">Standardised task · Node + PostgreSQL · 45 min limit</div></div>
                <Badge icon={Clock}>Finished in 31 min</Badge>
              </div>
              <div style={{ background: '#0f1115', color: '#d8d5cc', padding: 18, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, lineHeight: 1.7 }}>
                {[['- ', 'SELECT * FROM transfers WHERE account_id = $1', '#e88'], ['- ', '  AND status = \'pending\' ORDER BY created_at;', '#e88'], ['+ ', 'CREATE INDEX CONCURRENTLY idx_transfers_acct_status', '#7fd8a5'], ['+ ', '  ON transfers (account_id, status, created_at);', '#7fd8a5'], ['+ ', 'SELECT id, amount, created_at FROM transfers …', '#7fd8a5'], ['  ', '// p95: 2,140ms → 86ms on 4M rows', '#c9a04b']].map(([p, l, c], i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1 }} style={{ color: c }}><span style={{ opacity: 0.5 }}>{p}</span>{l}</motion.div>
                ))}
              </div>
              <div style={{ padding: 16 }}>
                {tests.map(([t, ok, time], i) => (
                  <motion.div key={t} {...stagger(i, 0.07)} className="row small" style={{ padding: '7px 0', gap: 10 }}>
                    {ok ? <CheckCircle2 size={16} color="var(--green)" /> : <XCircle size={16} color="var(--red)" />}<span className="grow">{t}</span><span className="tiny faint">{time}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="col" style={{ gap: 14 }}>
              <div className="card pad row" style={{ gap: 16 }}><ScoreRing value={84} size={72} label="TASK" /><div><div className="card-title">4 of 5 checks passed</div><div className="muted small">Top 15% of 62 attempts on this task</div></div></div>
              <div className="card pad">
                <div className="card-title">Qualified human review</div>
                <p className="muted small" style={{ marginTop: 4 }}>Where results matter, a qualified engineer confirms the outcome.</p>
                <AnimatePresence mode="wait">
                  {reviewer ? (
                    <motion.div key="r" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="row" style={{ marginTop: 14, gap: 12, padding: 12, borderRadius: 12, background: 'var(--green-soft)' }}>
                      <Avatar name="Tolu Bello" size={34} hue={3} /><div className="grow"><div style={{ fontWeight: 600 }}>Tolu Bello · CTO</div><div className="small" style={{ color: 'var(--green)' }}>Reviewed — “Confirmed. Clean reasoning on locking.”</div></div><UserCheck size={18} color="var(--green)" />
                    </motion.div>
                  ) : (
                    <motion.div key="b" exit={{ opacity: 0 }}><Button style={{ marginTop: 14 }} icon={UserCheck} onClick={() => { setReviewer(true); toast('Tolu confirmed the task result', { sub: 'Review linked to evidence record', tone: 'success' }) }} data-q="request-review">Request review from Tolu</Button></motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="card pad row small" style={{ gap: 10 }}><FileText size={16} color="var(--muted)" />With Femi’s consent, this result is added to his reusable evidence wallet.</div>
            </div>
          </motion.div>
        )}
        {tab === 'cards' && (
          <motion.div key="c" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid g2">
            <div className="card pad">
              <div className="row between"><div className="card-title">Your scorecard</div><Badge>Independent</Badge></div>
              <p className="muted small" style={{ marginTop: 4 }}>Rate against the mandate rubric. You won’t see Tolu’s until you submit.</p>
              {[['r1', 'API reliability & incidents'], ['r2', 'PostgreSQL performance'], ['r3', 'Service design'], ['r4', 'Observability'], ['r5', 'Communication']].map(([k, l]) => (
                <div key={k} className="row between" style={{ marginTop: 14 }}>
                  <span className="small" style={{ fontWeight: 550 }}>{l}</span>
                  <div className="row" style={{ gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <motion.button key={n} whileTap={{ scale: 0.85 }} disabled={submitted} onClick={() => setScores({ ...scores, [k]: n })} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid', borderColor: scores[k] >= n ? 'var(--ink)' : 'var(--line)', background: scores[k] >= n ? 'var(--ink)' : '#fff', color: scores[k] >= n ? '#fff' : 'var(--muted)', fontWeight: 600, fontSize: 12 }} data-q={`score-${k}-${n}`}>{n}</motion.button>
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="primary" style={{ marginTop: 20, width: '100%' }} disabled={submitted} onClick={() => { setSubmitted(true); setTimeout(() => setRevealed(true), 700) }} data-q="submit-scorecard">{submitted ? 'Submitted' : 'Submit scorecard'}</Button>
            </div>
            <div className="card pad" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="row between"><div className="card-title">Tolu Bello · CTO</div>{revealed ? <Badge tone="green" icon={Unlock}>Revealed</Badge> : <Badge icon={Lock}>Hidden until you submit</Badge>}</div>
              <motion.div animate={{ filter: revealed ? 'blur(0px)' : 'blur(7px)', opacity: revealed ? 1 : 0.6 }} transition={{ duration: 0.6 }}>
                {[['API reliability & incidents', 5], ['PostgreSQL performance', 4], ['Service design', 4], ['Observability', 3], ['Communication', 4]].map(([l, v]) => (
                  <div key={l} className="row between" style={{ marginTop: 14 }}><span className="small">{l}</span><div className="row" style={{ gap: 4 }}>{[1, 2, 3, 4, 5].map((n) => <i key={n} style={{ width: 30, height: 30, borderRadius: 8, background: v >= n ? 'var(--gold)' : 'var(--paper-2)' }} />)}</div></div>
                ))}
                <p className="small" style={{ marginTop: 16, padding: 12, background: 'var(--paper)', borderRadius: 10 }}>“Best incident answer we’ve heard. Would pair him with our infra contractor on k8s.”</p>
              </motion.div>
              <AnimatePresence>{revealed && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="row small" style={{ marginTop: 12, gap: 8, color: 'var(--green)', fontWeight: 600 }}><ShieldCheck size={15} /> Agreement on 4 of 5 competencies · no conflict to resolve</motion.div>}</AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
