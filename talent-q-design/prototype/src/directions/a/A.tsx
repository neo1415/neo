// Direction A · Atelier — "lucid, annotated, atelier".
// Composition: editorial spread (margin conversation + feature-page artifacts). Q: a gold ink hand that
// draws its own mark as work progresses. Nav: a magazine contents line. Motion: line drawing, no overshoot.
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import './a.css';
import { Link } from '../../ui/router';
import { useNarrow } from '../shared/hooks';
import {
  COACH_OPTIONS, COACH_Q, DEVELOPMENT, PROGRESS, Q_SUGGESTIONS, REQS, ROLES, SHORTLIST, SKILLS, STRENGTH_LABEL, USED,
  cellOf, evidenceById, fitOf, initials, mustHaveCoverage, strength, useCoach, useQRun, type RunPhase, type Strength,
} from '../shared/scenario';

const EASE = [0.2, 0, 0, 1] as const;

// ---------------- Q: the ink hand ----------------
const Q_PATH = 'M30 6 C14 6 6 18 6 30 C6 44 18 54 30 54 C44 54 54 42 54 30 C54 17 44 6 30 6 M37 41 C45 52 53 59 66 61';
function InkQ({ phase, progress = 0, size = 64 }: { phase: RunPhase | 'waiting'; progress?: number; size?: number }) {
  const reduce = useReducedMotion();
  const drawn = phase === 'working' ? Math.max(0.06, progress) : phase === 'thinking' ? 0.3 : 1;
  const label = { idle: 'Q is ready', thinking: 'Q is reading your question', working: `Q is working, ${Math.round(progress * 100)}% of steps done`, answering: 'Q is writing', done: 'Q has finished', waiting: 'Q is waiting for you' }[phase];
  return (
    <svg width={size} height={size} viewBox="0 0 72 66" role="img" aria-label={label} style={{ overflow: 'visible', flex: 'none' }}>
      <path d={Q_PATH} fill="none" stroke="var(--rule)" strokeWidth="2.2" strokeLinecap="round" />
      <motion.path d={Q_PATH} fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round"
        initial={false}
        animate={phase === 'thinking' && !reduce ? { pathLength: [0.05, 0.35, 0.05], pathOffset: [0, 0.4, 0.8] } : { pathLength: drawn, pathOffset: 0 }}
        transition={phase === 'thinking' ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: reduce ? 0 : 0.45, ease: EASE }} />
      {phase === 'waiting' && <circle cx="66" cy="10" r="4" fill="var(--gold)" />}
    </svg>
  );
}

// ---------------- Evidence mark: Harvey ball ----------------
function Ball({ s, size = 20 }: { s: Strength; size?: number }) {
  const r = size / 2 - 1.5;
  const c = size / 2;
  return (
    <svg className="da-ball" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {s === 'unclear' ? <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ink-3)" strokeWidth="1.4" strokeDasharray="2.5 2.5" />
        : <circle cx={c} cy={c} r={r} fill={s === 'full' ? 'var(--ink)' : s === 'verified' ? 'var(--gold-ink)' : 'none'} stroke={s === 'verified' ? 'var(--gold-ink)' : 'var(--ink)'} strokeWidth="1.4" />}
      {s === 'partial' && <path d={`M${c} ${c - r} A${r} ${r} 0 0 0 ${c} ${c + r} Z`} fill="var(--ink)" />}
      {s === 'verified' && <path d={`M${c - r * 0.45} ${c} l${r * 0.32} ${r * 0.34} l${r * 0.6} -${r * 0.68}`} stroke="var(--sheet)" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
function Legend() {
  return (
    <ul className="da-chips" aria-label="Key" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 16 }}>
      {(['verified', 'full', 'partial', 'none', 'unclear'] as Strength[]).map((s) => <li key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--ink-3)' }}><Ball s={s} size={16} />{STRENGTH_LABEL[s]}</li>)}
    </ul>
  );
}

// ---------------- Shell ----------------
function Shell({ at, children }: { at: 'home' | 'compare' | 'career'; children: ReactNode }) {
  const items = [['home', '01', 'Ask Q'], ['compare', '02', 'Talent'], ['career', '03', 'Career']] as const;
  return (
    <div className="da">
      <header className="da-top">
        <Link to="/x" className="da-mark" aria-label="Talent Q, back to directions">Talent <em>Q</em></Link>
        <nav className="da-index" aria-label="Sections">
          {items.map(([k, n, l]) => <Link key={k} to={`/x/a/${k}`} current={at === k}><b>{n}</b>{l}</Link>)}
        </nav>
        <span className="da-who">{at === 'career' ? 'Amaka Eze · graduate' : 'Ada Okafor · Kora Pay'}</span>
      </header>
      <main className="da-page">{children}</main>
    </div>
  );
}

// ================= 1 · Q home =================
export function AHome() {
  const run = useQRun();
  const [text, setText] = useState('');
  const asked = run.phase !== 'idle';
  return (
    <Shell at="home">
      <div className="da-spread">
        <section aria-labelledby="ah">
          <p className="da-kicker">Tuesday 27 October · Kora Pay hiring</p>
          <h1 id="ah" className="da-hero">Good morning, <i>Ada.</i></h1>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 28 }}>
            <InkQ phase={run.phase} progress={run.progress} />
            <p className="da-q" aria-live="polite">
              {run.phase === 'idle' && 'Three things moved overnight. One of them needs you.'}
              {run.phase === 'thinking' && 'Reading your question…'}
              {run.phase === 'working' && (run.activeStep ? `${run.activeStep.label}…` : 'Almost there…')}
              {(run.phase === 'answering' || run.phase === 'done') && 'I’ve set it out on the right.'}
            </p>
          </div>

          <div className="da-thread" role="log" aria-label="Conversation with Q">
            {!asked && <div className="da-chips">{Q_SUGGESTIONS.map((s, i) => <button key={s} className="da-chip" onClick={() => run.ask(Q_SUGGESTIONS[0])} disabled={i > 0} aria-disabled={i > 0} title={i > 0 ? 'Not part of this prototype' : undefined}>{s}</button>)}</div>}
            {asked && <div className="da-ex"><span className="n">01</span><p className="da-me" style={{ margin: 0 }}>{run.asked}</p></div>}
            {run.answer && (
              <div className="da-ex"><span className="n">02</span>
                <div><p className="da-q" style={{ fontStyle: 'normal' }}>{run.answer}</p>
                  {run.phase === 'done' && <p className="da-cap" style={{ marginTop: 10 }}>Used: {USED.join(' · ')}</p>}</div>
              </div>
            )}
          </div>

          <form className="da-compose" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { run.ask(text.trim()); setText(''); } }}>
            <label htmlFor="a-ask" className="sr">Ask Q</label>
            <input id="a-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Q, or tell it what to do…" />
            <button type="button" className="da-icon" aria-label="Speak to Q (simulated)" onClick={() => setText(Q_SUGGESTIONS[0])}><Mic /></button>
            <button type="submit" className="da-icon da-send" aria-label="Send" disabled={!text.trim()}><Arrow /></button>
          </form>
        </section>

        <section aria-label="Q's work">
          <AnimatePresence mode="wait">
            {run.phase === 'idle' && <motion.div key="brief" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .3, ease: EASE }}><TodayBrief onOpen={() => run.ask(Q_SUGGESTIONS[0])} /></motion.div>}
            {(run.phase === 'thinking' || run.phase === 'working') && <motion.div key="prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Preparing run={run} /></motion.div>}
            {(run.phase === 'answering' || run.phase === 'done') && <motion.div key="art" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, ease: EASE }}><ShortlistBrief /></motion.div>}
          </AnimatePresence>
        </section>
      </div>
    </Shell>
  );
}

function TodayBrief({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="da-sheet">
      <div className="da-sheet-head"><h2 className="da-h3">Today’s brief</h2><span className="mono">3 items</span></div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <li style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 14, padding: '18px 0', borderBottom: '1px solid var(--rule)', alignItems: 'start' }}>
          <span className="mono">01</span>
          <div><h3 className="da-h3">Three people are worth comparing for Senior Backend.</h3><p className="da-cap" style={{ marginTop: 6 }}>Read overnight: 24 profiles, 7 pieces of shared evidence.</p>
            <button className="da-btn" style={{ marginTop: 12 }} onClick={onOpen}>Who should I talk to first?</button></div>
          <MiniLedger />
        </li>
        <li style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 14, padding: '18px 0', borderBottom: '1px solid var(--rule)' }}>
          <span className="mono">02</span>
          <div><h3 className="da-h3">Tobi replied: “Happy to talk next week.”</h3><p className="da-cap" style={{ marginTop: 6 }}>Q can offer times from your remembered hours.</p></div>
        </li>
        <li style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 14, padding: '18px 0', alignItems: 'center' }}>
          <span className="mono">03</span>
          <div><h3 className="da-h3">Seyi has two free mornings next week.</h3><p className="da-cap" style={{ marginTop: 6 }}>Busy times only. Q never sees what his meetings are.</p></div>
          <WeekStrip />
        </li>
      </ol>
    </article>
  );
}
function MiniLedger() {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 16px)', gap: 6 }}>
      {REQS.map((r) => SHORTLIST.map((p) => <Ball key={r.reqId + p.personId} s={strength(cellOf(p.personId, r.reqId).state)} size={16} />))}
    </div>
  );
}
function WeekStrip() {
  const free = [false, true, false, true, false];
  return (
    <div aria-label="Seyi free on Tuesday and Thursday mornings" role="img" style={{ display: 'flex', gap: 4 }}>
      {['M', 'T', 'W', 'T', 'F'].map((d, i) => <span key={i} style={{ width: 22, textAlign: 'center' }}><span style={{ display: 'block', height: 26, borderRadius: 3, background: free[i] ? 'var(--gold)' : 'var(--paper-2)', border: '1px solid var(--rule)' }} /><span className="mono" style={{ fontSize: 12 }}>{d}</span></span>)}
    </div>
  );
}

function Preparing({ run }: { run: ReturnType<typeof useQRun> }) {
  return (
    <article className="da-sheet" aria-busy="true">
      <div className="da-sheet-head"><h2 className="da-h3">Preparing: Shortlist brief</h2><span className="da-sim">Simulated run</span></div>
      <div style={{ height: 2, background: 'var(--rule)', marginBottom: 24, position: 'relative' }} aria-hidden="true">
        <motion.div style={{ position: 'absolute', inset: 0, background: 'var(--gold)', transformOrigin: 'left' }} animate={{ scaleX: run.progress }} transition={{ duration: .25 }} />
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Steps">
        {run.steps.map((s, i) => <li key={s.id} className="da-foot"><sup>{i + 1}</sup><span style={{ color: s.done ? 'var(--ink)' : 'var(--ink-3)' }}>{s.label}</span><span className="c">{s.done} / {s.total}</span></li>)}
      </ol>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 56px)', gap: '14px 8px', marginTop: 28, opacity: .9 }} aria-hidden="true">
        {REQS.map((r, ri) => [
          <span key={r.reqId} style={{ height: 12, background: 'var(--paper-2)', borderRadius: 2, width: `${60 + ri * 7}%` }} />,
          ...SHORTLIST.map((p, pi) => <motion.span key={r.reqId + p.personId} style={{ justifySelf: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: (run.steps[1].done / 7) * 15 > ri * 3 + pi ? 1 : .12 }}><Ball s={strength(cellOf(p.personId, r.reqId).state)} /></motion.span>),
        ])}
      </div>
    </article>
  );
}

function ShortlistBrief() {
  const [focus, setFocus] = useState('p_tobi');
  const narrow = useNarrow();
  const ev = cellOf(focus, 'r1').evidenceIds.map(evidenceById)[0];
  const person = SHORTLIST.find((p) => p.personId === focus)!;
  return (
    <article className="da-sheet">
      <div className="da-sheet-head"><span className="mono">Artifact · Shortlist brief · v1</span><span className="da-sim">Simulated data</span></div>
      <h2 className="da-h2">Talk to <i style={{ color: 'var(--gold-ink)' }}>Tobi</i> first.</h2>
      <p className="da-deck" style={{ marginTop: 10 }}>He is the only one whose evidence of the hardest requirement could be verified.</p>

      <figure style={{ margin: '28px 0 0' }}>
        <div role="group" aria-label="Choose a person to focus" style={{ display: 'grid', gridTemplateColumns: `minmax(0,1fr) repeat(3, ${narrow ? 52 : 76}px)`, gap: 8, alignItems: 'end' }}>
          <span className="mono">Requirement</span>
          {SHORTLIST.map((p) => (
            <button key={p.personId} onClick={() => setFocus(p.personId)} aria-pressed={focus === p.personId} style={{ border: 0, background: 'none', display: 'grid', justifyItems: 'center', gap: 6, padding: 0 }}>
              <span className="da-mono-face" style={{ background: focus === p.personId ? 'var(--ink)' : 'var(--sheet)', color: focus === p.personId ? 'var(--paper)' : 'var(--ink)' }}>{initials(p.name)}</span>
              <span style={{ fontSize: 13, fontWeight: focus === p.personId ? 600 : 400 }}>{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        <div style={{ borderTop: '1.5px solid var(--ink)', marginTop: 10 }}>
          {REQS.map((r, ri) => (
            <div key={r.reqId} style={{ display: 'grid', gridTemplateColumns: `minmax(0,1fr) repeat(3, ${narrow ? 52 : 76}px)`, gap: 8, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--rule)', background: ri === 0 ? 'linear-gradient(90deg, var(--gold-soft), transparent 70%)' : undefined }}>
              <span><span style={{ fontWeight: 500 }}>{r.label}</span>{ri === 0 && <span className="da-note" style={{ display: 'block' }}>the hardest part of the job</span>}</span>
              {SHORTLIST.map((p) => (
                <span key={p.personId} style={{ justifySelf: 'stretch', display: 'grid', placeItems: 'center', alignSelf: 'stretch', margin: '-12px 0', padding: '12px 0', background: focus === p.personId ? 'rgb(163 122 36 / .12)' : undefined, transition: 'background .2s' }}
                  aria-label={`${p.name}: ${STRENGTH_LABEL[strength(cellOf(p.personId, r.reqId).state)]}`} role="img">
                  <Ball s={strength(cellOf(p.personId, r.reqId).state)} size={24} />
                </span>
              ))}
            </div>
          ))}
        </div>
        <figcaption style={{ marginTop: 14 }}><Legend /></figcaption>
      </figure>

      <AnimatePresence mode="wait">
        <motion.div key={focus} className="da-specimen" style={{ marginTop: 24 }} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25, ease: EASE }}>
          <span className="mono">{person.name} · on the hardest requirement</span>
          {ev ? <blockquote className="da-quote">{ev.shows}</blockquote> : <p className="da-body">Nothing shared yet.</p>}
          {ev && <p className="da-cap">{ev.source} · {ev.observedAt} · Limits: {ev.limits}</p>}
          <p className="da-body"><b>{mustHaveCoverage(focus).shown} of {mustHaveCoverage(focus).total}</b> must-haves shown. Unknown: {fitOf(focus).unknowns.join('; ') || 'nothing noted'}.</p>
        </motion.div>
      </AnimatePresence>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
        <button className="da-btn da-btn-ink">Draft a note to {person.name.split(' ')[0]}</button>
        <button className="da-btn">Add “on-call” to all three interviews</button>
        <Link to="/x/a/compare" className="da-btn">Open the full ledger</Link>
      </div>
    </article>
  );
}

// ================= 2 · Recruiter discovery: the evidence ledger =================
export function ACompare() {
  const narrow = useNarrow();
  const [must, setMust] = useState(false);
  const [pair, setPair] = useState<string[]>([]);
  const [sel, setSel] = useState<{ p: string; r: string } | null>(() => (window.matchMedia('(max-width: 760px)').matches ? null : { p: 'p_tobi', r: 'r1' }));
  const reqs = REQS.filter((r) => !must || r.mustHave);
  const differs = (rid: string) => pair.length === 2 && strength(cellOf(pair[0], rid).state) !== strength(cellOf(pair[1], rid).state);
  const togglePair = (pid: string) => setPair((p) => (p.includes(pid) ? p.filter((x) => x !== pid) : [...p.slice(-1), pid]));
  const NOTES: Record<string, string> = { r1: 'Only Tobi’s is verified.', r2: 'Kunle works in Java and Kotlin.', r3: 'Strong across the board.', r4: 'Ask everyone. Only Ifeoma has shown it.', r5: 'Define this in the mandate first.' };

  return (
    <Shell at="compare">
      <header style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
        <p className="da-kicker">Senior Backend · Payments platform · ledger v1</p>
        <h1 className="da-hero" style={{ fontSize: 'clamp(36px,5vw,60px)' }}>Three people, <i>five requirements,</i> every claim sourced.</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Legend />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="da-seg" role="group" aria-label="Rows"><button aria-pressed={!must} onClick={() => setMust(false)}>All five</button><button aria-pressed={must} onClick={() => setMust(true)}>Must-haves</button></div>
          </div>
        </div>
      </header>

      <div className="da-spread" style={{ gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 8fr) minmax(0, 4fr)' }}>
        <section aria-label="Evidence ledger" className="da-sheet" style={{ padding: narrow ? 14 : undefined }}>
          {!narrow ? (
            <table className="da-ledger">
              <caption className="sr">Evidence for each requirement and person. Select a cell to read the evidence.</caption>
              <thead><tr><th scope="col"><span className="mono">Requirement</span></th>
                {SHORTLIST.map((p) => (
                  <th key={p.personId} scope="col">
                    <div style={{ display: 'grid', gap: 6 }}>
                      <span className="da-mono-face">{initials(p.name)}</span>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span className="da-cap">{p.location}</span>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--ink-3)', fontWeight: 400 }}><input type="checkbox" checked={pair.includes(p.personId)} onChange={() => togglePair(p.personId)} style={{ accentColor: '#7a5a17', width: 16, height: 16 }} />Compare</label>
                    </div>
                  </th>
                ))}
                <th scope="col"><span className="mono">Q’s note</span></th></tr></thead>
              <tbody>
                {reqs.map((r) => (
                  <tr key={r.reqId} style={{ opacity: pair.length === 2 && !differs(r.reqId) ? .4 : 1, transition: 'opacity .2s' }}>
                    <th scope="row" style={{ fontWeight: 400 }}><span style={{ fontWeight: 600, display: 'block' }}>{r.label}</span><span className="da-cap">{r.mustHave ? 'Must have' : 'Nice to have'}</span></th>
                    {SHORTLIST.map((p) => { const c = cellOf(p.personId, r.reqId); const s = strength(c.state); return (
                      <td key={p.personId}><button className="da-cellbtn" aria-pressed={sel?.p === p.personId && sel?.r === r.reqId} onClick={() => setSel({ p: p.personId, r: r.reqId })} aria-label={`${p.name}, ${r.label}: ${STRENGTH_LABEL[s]}. Read evidence`}>
                        <Ball s={s} size={26} /><span style={{ fontSize: 14 }}>{STRENGTH_LABEL[s]}</span></button></td>); })}
                    <td><span className="da-note">{NOTES[r.reqId]}</span></td>
                  </tr>
                ))}
                <tr><th scope="row" style={{ fontWeight: 600 }}>Must-haves shown</th>{SHORTLIST.map((p) => { const m = mustHaveCoverage(p.personId); return <td key={p.personId}><Ticks n={m.shown} of={m.total} /></td>; })}<td /></tr>
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              {SHORTLIST.map((p) => (
                <section key={p.personId} aria-label={p.name} style={{ borderTop: '1.5px solid var(--ink)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="da-mono-face">{initials(p.name)}</span><div><b>{p.name}</b><p className="da-cap">{p.location}</p></div><span style={{ marginLeft: 'auto' }}><Ticks n={mustHaveCoverage(p.personId).shown} of={mustHaveCoverage(p.personId).total} /></span></div>
                  {reqs.map((r) => { const s = strength(cellOf(p.personId, r.reqId).state); return (
                    <button key={r.reqId} className="da-cellbtn" style={{ width: '100%', margin: 0, padding: '10px 0', borderBottom: '1px solid var(--rule)', borderRadius: 0 }} onClick={() => setSel({ p: p.personId, r: r.reqId })} aria-label={`${r.label}: ${STRENGTH_LABEL[s]}. Read evidence`}>
                      <Ball s={s} size={22} /><span style={{ flex: 1 }}>{r.label}</span><span className="da-cap">{STRENGTH_LABEL[s]}</span></button>); })}
                </section>
              ))}
            </div>
          )}
          {pair.length === 2 && !narrow && <p className="da-cap" style={{ marginTop: 14 }} role="status">Showing where {SHORTLIST.find((p) => p.personId === pair[0])!.name.split(' ')[0]} and {SHORTLIST.find((p) => p.personId === pair[1])!.name.split(' ')[0]} differ. Other rows are faded.</p>}
        </section>

        {(!narrow || sel) && (
          <aside aria-label="Evidence" className={narrow ? 'da-sheetbar' : ''} style={narrow ? undefined : { position: 'sticky', top: 24 }}>
            {narrow && <button className="da-btn" style={{ float: 'right' }} onClick={() => setSel(null)}>Close</button>}
            {sel ? <Specimen p={sel.p} r={sel.r} /> : <p className="da-body">Select any mark to read the evidence behind it.</p>}
          </aside>
        )}
      </div>
    </Shell>
  );
}
function Ticks({ n, of }: { n: number; of: number }) {
  return <span role="img" aria-label={`${n} of ${of} must-haves shown`} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{Array.from({ length: of }, (_, i) => <span key={i} style={{ width: 6, height: 18, background: i < n ? 'var(--ink)' : 'transparent', border: '1px solid var(--ink)', borderRadius: 1 }} />)}<span className="mono" style={{ marginLeft: 6 }}>{n}/{of}</span></span>;
}
function Specimen({ p, r }: { p: string; r: string }) {
  const c = cellOf(p, r); const person = SHORTLIST.find((x) => x.personId === p)!; const req = REQS.find((x) => x.reqId === r)!;
  const evs = c.evidenceIds.map(evidenceById);
  return (
    <AnimatePresence mode="wait">
      <motion.div key={p + r} className="da-specimen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, ease: EASE }}>
        <span className="mono">Specimen · {person.name}</span>
        <h2 className="da-h3">{req.label}</h2>
        <p className="da-cap">{req.plain}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Ball s={strength(c.state)} size={26} /><b>{STRENGTH_LABEL[strength(c.state)]}</b></div>
        {evs.length === 0 && <p className="da-body">Nothing has been shared for this. That’s a question for the interview, not a reason to rule {person.name.split(' ')[0]} out.</p>}
        {evs.map((e) => (
          <div key={e.evidenceId} style={{ display: 'grid', gap: 8 }}>
            {e.verified && <span className="da-stamp">Verified by Q</span>}
            <blockquote className="da-quote">{e.shows}</blockquote>
            <p className="da-cap"><b>{e.title}</b> · {e.source} · {e.observedAt}</p>
            <p className="da-cap">What it doesn’t show: {e.limits}</p>
          </div>
        ))}
        <p className="da-note">{c.note}</p>
      </motion.div>
    </AnimatePresence>
  );
}

// ================= 3 · J7 Career atlas =================
export function ACareer() {
  const narrow = useNarrow();
  const coach = useCoach();
  const [skill, setSkill] = useState('sql');
  const skills = SKILLS.map((s) => (s.id === 'sql' && coach.promoted ? { ...s, state: 'EVIDENCED' as const, level: coach.feedback?.level ?? 2 } : s));
  const sel = skills.find((s) => s.id === skill)!;
  const series = [...PROGRESS, ...(coach.feedback ? [{ skill: 'sql', label: 'SQL window functions', points: [{ at: 'Today', level: coach.feedback.level }] }] : [])];

  return (
    <Shell at="career">
      <header className="da-spread" style={{ alignItems: 'center' }}>
        <div>
          <p className="da-kicker">Career atlas · private to you</p>
          <h1 className="da-hero" style={{ fontSize: 'clamp(40px,5.2vw,68px)' }}>Amaka’s route to <i>Product Analyst.</i></h1>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <InkQ phase={coach.feedback ? 'done' : 'idle'} size={52} />
          <p className="da-q">Your thesis already shows real analysis. Two things stand between you and applying with confidence, and neither is about ability. They just haven’t been shown yet.</p>
        </div>
      </header>

      {/* The route */}
      <section aria-labelledby="route" style={{ marginTop: 40 }}>
        <h2 id="route" className="mono">The route</h2>
        {narrow ? (
          <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', borderLeft: '2px solid var(--ink)' }}>
            {ROLES.map((r) => <li key={r.id} style={{ padding: '10px 0 10px 18px', position: 'relative' }}><span style={{ position: 'absolute', left: -8, top: 16, width: 14, height: 14, borderRadius: '50%', background: r.stage === 'now' ? 'var(--ink)' : 'var(--paper)', border: `2px solid ${r.stage === 'goal' ? 'var(--gold)' : 'var(--ink)'}` }} />
              <span className="mono" style={{ display: 'block' }}>{{ now: 'You are here', next: 'Next', goal: 'Your goal', later: 'Later' }[r.stage]}</span><b className="serif" style={{ fontSize: 20, fontWeight: 500 }}>{r.label}</b></li>)}
          </ol>
        ) : (
          <svg viewBox="0 0 1200 170" width="100%" role="img" aria-label="Route: Economics graduate, then Junior Data Analyst, then Product Analyst (your goal), later Growth Analyst" style={{ marginTop: 8 }}>
            <path className="da-route" pathLength={1} d="M120 110 C 300 30, 400 150, 560 95 S 820 40, 880 80" fill="none" stroke="var(--ink)" strokeWidth="2" />
            <path d="M880 80 C 960 110, 1020 115, 1080 70" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="5 6" />
            {[[120, 110], [470, 112], [880, 80], [1080, 70]].map(([x, y], i) => { const r = ROLES[i]; return (
              <g key={r.id}>
                <circle cx={x} cy={y} r={r.stage === 'goal' ? 14 : 9} fill={r.stage === 'now' ? 'var(--ink)' : 'var(--sheet)'} stroke={r.stage === 'goal' ? 'var(--gold)' : 'var(--ink)'} strokeWidth={r.stage === 'goal' ? 4 : 2} />
                <text x={x} y={y + 40} textAnchor="middle" fontFamily="var(--serif)" fontSize="20" fill="var(--ink)">{r.label}</text>
                <text x={x} y={y - 26} textAnchor="middle" fontFamily="var(--mono)" fontSize="12" letterSpacing="1.2" fill={r.stage === 'goal' ? 'var(--gold-ink)' : 'var(--ink-3)'}>{{ now: 'YOU ARE HERE', next: 'NEXT', goal: 'YOUR GOAL', later: 'LATER' }[r.stage]}</text>
              </g>); })}
          </svg>
        )}
      </section>

      {/* What the role is made of */}
      <section aria-labelledby="made" className="da-spread" style={{ marginTop: 48 }}>
        <div>
          <h2 id="made" className="da-h2">What Product Analyst is made of</h2>
          <p className="da-body" style={{ marginTop: 10 }}>Six skills, weighted by how often they appear in roles you saved. Choose one to see why it matters to you.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
            {skills.map((s) => (
              <li key={s.id}><button className="da-cellbtn" style={{ width: '100%', margin: 0, padding: '12px 4px', borderBottom: '1px solid var(--rule)', borderRadius: 0 }} aria-pressed={skill === s.id} onClick={() => setSkill(s.id)}>
                <Ball s={strength(s.state)} size={22} /><span style={{ flex: 1, fontWeight: 500 }}>{s.label}</span>
                <span aria-label={`Importance ${s.weight} of 3`} style={{ display: 'inline-flex', gap: 3 }}>{[1, 2, 3].map((i) => <span key={i} style={{ width: 14, height: 3, background: i <= s.weight ? 'var(--gold)' : 'var(--rule)' }} />)}</span>
              </button></li>
            ))}
          </ul>
        </div>
        <AnimatePresence mode="wait">
          <motion.article key={sel.id + sel.state} className="da-sheet" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .3, ease: EASE }}>
            <span className="mono">{STRENGTH_LABEL[strength(sel.state)]}{sel.level ? ` · level ${sel.level} of 5` : ''}</span>
            <h3 className="da-h2" style={{ marginTop: 8 }}>{sel.label}</h3>
            <p className="da-deck" style={{ marginTop: 8 }}>{sel.plain}.</p>
            <p className="da-body" style={{ marginTop: 14 }}>Used in: {sel.roles.map((r) => ROLES.find((x) => x.id === r)!.label).join(', ')}.</p>
            {sel.id === 'sql' && !coach.promoted && <p className="da-body" style={{ marginTop: 10 }}>Asked for in 7 of the 10 Lagos product-analyst roles you saved. You haven’t shown it yet, which is different from not having it.</p>}
            {sel.id === 'sql' && coach.promoted && <p className="da-body" style={{ marginTop: 10 }}>Shown today in practice, level {sel.level}. You chose to add it to your passport.</p>}
          </motion.article>
        </AnimatePresence>
      </section>

      {/* Coaching + progress */}
      <section className="da-spread" style={{ marginTop: 48 }} aria-label="Practise and progress">
        <article className="da-sheet" aria-labelledby="coach">
          <div className="da-sheet-head"><h2 id="coach" className="da-h3">A two-minute practice</h2><span className="mono">Private · SQL</span></div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}><InkQ phase={coach.pick ? 'done' : 'waiting'} size={36} /><p className="da-q" style={{ fontSize: 19 }}>{COACH_Q}</p></div>
          <div style={{ display: 'grid', gap: 8, marginTop: 16 }} role="group" aria-label="Your answer">
            {COACH_OPTIONS.map((o) => <button key={o.id} className="da-opt" aria-pressed={coach.pick === o.id} onClick={() => coach.setPick(o.id)} disabled={!!coach.pick && coach.pick !== o.id}><span className="mono">{o.id}</span>{o.id === 'b' ? <code>{o.text}</code> : <span>{o.text}</span>}</button>)}
          </div>
          <AnimatePresence>
            {coach.feedback && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: .35, ease: EASE }} style={{ overflow: 'hidden' }}>
                <div className="da-specimen" style={{ marginTop: 20 }}>
                  <span className="mono">Feedback · level {coach.feedback.level} of 5 · rubric sql-2026.2</span>
                  <p className="da-body">{coach.feedback.text}</p>
                  {!coach.promoted ? (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="da-btn da-btn-ink" onClick={() => { coach.promote(); setSkill('sql'); }}>Add to my Evidence Passport</button>
                      <button className="da-btn" onClick={coach.reset}>Try again</button>
                    </div>
                  ) : <p className="da-note" role="status">Added. Evidence coverage is now 7 of 9. Employers see the result, never the attempt.</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </article>

        <div>
          <h2 className="da-h2">Progress, on comparable tasks</h2>
          <div className="da-grid3" style={{ marginTop: 18 }}>
            {series.map((s) => <Spark key={s.skill} label={s.label} points={s.points} emphasis={s.skill === 'sql'} />)}
          </div>
          <div className="da-grid3" style={{ marginTop: 28 }} aria-label="Six separate measures. There is no overall score.">
            <Measure k="Evidence coverage" v={`${coach.coverage} of 9`} b="Requirements with evidence" />
            <Measure k="Competency mastery" v="Spreadsheets L3" b="Timed task, rubric sheets-2026.1, ±1" />
            <Measure k="Practice progress" v={coach.feedback ? '+1 skill started' : '+1 level'} b="Same rubric, comparable tasks" />
            <Measure k="Role fit" v="Partial" b="For the role family, not one job" />
            <Measure k="Readiness to apply" v="2 of 4" b="Advisory checklist only" />
            <Measure k="Plan adherence" v="3 of 5" b="Private. Never used in hiring." />
          </div>
        </div>
      </section>

      <section aria-labelledby="next" style={{ marginTop: 48 }}>
        <h2 id="next" className="da-h2">Next chapter</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', borderTop: '1.5px solid var(--ink)' }}>
          {DEVELOPMENT.map((d, i) => (
            <li key={d.id} style={{ display: 'grid', gridTemplateColumns: narrow ? '28px 1fr' : '40px 1fr 160px auto', gap: 16, alignItems: 'center', padding: '18px 0', borderBottom: '1px solid var(--rule)' }}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>
              <div><b className="serif" style={{ fontSize: 20, fontWeight: 500 }}>{d.title}</b><p className="da-cap">{d.why}</p></div>
              {!narrow && <span className="mono">{d.kind} · {d.minutes} min</span>}
              {!narrow && <button className="da-btn">{i === 0 ? 'Start' : 'Plan it'}</button>}
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}
function Measure({ k, v, b }: { k: string; v: string; b: string }) {
  return <div><span className="mono">{k}</span><p className="serif" style={{ fontSize: 24, margin: '6px 0 2px', fontWeight: 400 }}>{v}</p><p className="da-cap">{b}</p></div>;
}
function Spark({ label, points, emphasis }: { label: string; points: { at: string; level: number }[]; emphasis?: boolean }) {
  const W = 200, H = 70;
  const x = (i: number) => (points.length === 1 ? W / 2 : 10 + (i * (W - 20)) / (points.length - 1));
  const y = (l: number) => H - 8 - ((l - 1) / 4) * (H - 20);
  const last = points[points.length - 1];
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontWeight: 500, fontSize: 15 }}>{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${label}: ${points.map((p) => `level ${p.level} on ${p.at}`).join(', ')}`}>
        {[1, 3, 5].map((l) => <line key={l} x1="0" x2={W} y1={y(l)} y2={y(l)} stroke="var(--rule)" strokeWidth="1" />)}
        <polyline points={points.map((p, i) => `${x(i)},${y(p.level)}`).join(' ')} fill="none" stroke={emphasis ? 'var(--gold)' : 'var(--ink)'} strokeWidth="2" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.level)} r="4.5" fill={emphasis ? 'var(--gold)' : 'var(--ink)'} stroke="var(--sheet)" strokeWidth="2" />)}
      </svg>
      <p className="da-cap">Level {last.level} of 5 · {last.at}</p>
    </figure>
  );
}

const Mic = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
