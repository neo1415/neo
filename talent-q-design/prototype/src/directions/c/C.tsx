// Direction C · Studio — "bold, warm, studio".
// Composition: a bento stage, one focus at a time. Q: a large flat gold form whose rings are its working
// agents, and which becomes the artifact it made (shared-layout morph). Nav: rail on desktop, tab bar on
// phones. Evidence as bar length (ordinal) plus an icon. Motion: springs, morphs, gentle overshoot.
import { useState, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import './c.css';
import { Link } from '../../ui/router';
import { useNarrow } from '../shared/hooks';
import {
  COACH_OPTIONS, COACH_Q, DEVELOPMENT, PROGRESS, Q_SUGGESTIONS, REQS, ROLES, SHORTLIST, SKILLS, STRENGTH_LABEL, USED,
  cellOf, evidenceById, fitOf, initials, mustHaveCoverage, strength, strengthScore, useCoach, useQRun, type RunPhase, type Step, type Strength,
} from '../shared/scenario';

const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const;
const AVATAR = ['var(--gold)', '#d8cdb8', '#c9d3cf'];

// ---------------- Q: the bloom ----------------
function Bloom({ phase, steps, size = 150, label }: { phase: RunPhase; steps?: Step[]; size?: number; label?: string }) {
  const reduce = useReducedMotion();
  const working = phase === 'working' && steps;
  const text = label ?? { idle: 'Q', thinking: 'Reading', working: `${steps?.filter((s) => s.done < s.total && s.done > 0).length || 1} at work`, answering: 'Writing', done: 'Done' }[phase];
  const aria = { idle: 'Q is ready', thinking: 'Q is reading your question', working: 'Q is working', answering: 'Q is writing', done: 'Q has finished' }[phase];
  return (
    <div role="img" aria-label={aria} style={{ width: size, height: size, position: 'relative', flex: 'none' }}>
      <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
        {working && steps!.map((s, i) => (
          <circle key={s.id} r={34 + i * 6} fill="none" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round" pathLength={1}
            strokeDasharray={`${s.done / s.total} 1`} transform="rotate(-90)" style={{ transition: 'stroke-dasharray .3s' }} opacity={s.done ? 1 : .25} />
        ))}
      </svg>
      <motion.div
        animate={phase === 'thinking' && !reduce ? { scale: [1, .92, 1] } : { scale: phase === 'idle' ? 1 : working ? .78 : 1 }}
        transition={phase === 'thinking' ? { duration: 1.2, repeat: Infinity } : SPRING}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--gold)', display: 'grid', placeItems: 'center' }}>
        <span style={{ fontFamily: 'var(--display)', fontWeight: 750, fontSize: size * (text === 'Q' ? .42 : .15), color: 'var(--ink)', letterSpacing: '-.02em' }}>{text}</span>
      </motion.div>
    </div>
  );
}

// ---------------- Evidence as bar length + icon ----------------
function Bar({ s }: { s: Strength }) {
  const w = { verified: 100, full: 72, partial: 38, none: 0, unclear: 0 }[s];
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }} role="img" aria-label={STRENGTH_LABEL[s]}>
      <span style={{ position: 'relative', flex: 1, height: 12, borderRadius: 99, border: s === 'unclear' ? '1.5px dashed var(--muted)' : '1.5px solid var(--ink)', overflow: 'hidden' }}>
        <motion.span initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={SPRING} style={{ position: 'absolute', inset: 0, right: 'auto', background: s === 'partial' ? 'repeating-linear-gradient(135deg, var(--ink) 0 4px, transparent 4px 7px)' : 'var(--ink)', borderRadius: 99 }} />
      </span>
      <span aria-hidden="true" style={{ width: 18, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{s === 'verified' ? '✓' : s === 'unclear' ? '?' : ''}</span>
    </span>
  );
}
function BarKey() {
  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', listStyle: 'none', padding: 0, margin: 0 }} aria-label="Key">
      {(['verified', 'full', 'partial', 'none', 'unclear'] as Strength[]).map((s) => <li key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--muted)', width: 190 }}><span style={{ width: 80, display: 'flex' }}><Bar s={s} /></span>{STRENGTH_LABEL[s]}</li>)}
    </ul>
  );
}

// ---------------- Shell ----------------
function Shell({ at, children }: { at: 'home' | 'compare' | 'career'; children: ReactNode }) {
  const items = [['home', 'Q', <IQ key="q" />], ['compare', 'Talent', <IPeople key="p" />], ['career', 'Career', <IPath key="c" />]] as const;
  return (
    <div className="dc">
      <nav className="dc-rail" aria-label="Main">
        <Link to="/x" className="home" aria-label="Talent Q, back to directions"><span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)' }}>Q</span></Link>
        {items.map(([k, l, ic]) => <Link key={k} to={`/x/c/${k}`} current={at === k}>{ic}<span>{l}</span></Link>)}
      </nav>
      <main className="dc-main">{children}</main>
    </div>
  );
}

// ================= 1 · Q home =================
export function CHome() {
  const run = useQRun();
  const narrow = useNarrow();
  const [text, setText] = useState('');
  const asked = run.phase !== 'idle';
  const ready = run.phase === 'answering' || run.phase === 'done';
  return (
    <Shell at="home">
      <LayoutGroup>
        <div className="dc-bento">
          <section className="dc-tile ink on-ink" style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: 22, minHeight: narrow ? 0 : 'calc(100vh - 40px)' }} aria-labelledby="ch">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <span className="label">Kora Pay · Tuesday</span>
              {!ready && <motion.div layoutId="q-artifact" transition={SPRING} style={{ borderRadius: '50%' }}><Bloom phase={run.phase} steps={run.steps} size={narrow ? 88 : 132} /></motion.div>}
              {ready && <Bloom phase="done" size={narrow ? 60 : 72} />}
            </div>
            <h1 id="ch" className="dc-display">{ready ? 'Here’s who.' : asked ? 'On it.' : <>Morning,<br />Ada.</>}</h1>
            {!asked && <p className="dc-lead" style={{ fontSize: 20 }}>Three things moved overnight. One needs you.</p>}
            {(run.phase === 'working' || ready) && (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }} aria-label="What Q is doing">
                {run.steps.map((s, i) => <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 600, opacity: s.done ? 1 : .55 }}><span>{s.done === s.total ? '✓' : `${i + 1}.`} {s.label}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{s.done}/{s.total}</span></li>)}
              </ol>
            )}
            <div role="log" aria-label="Conversation with Q" style={{ display: 'grid', gap: 10, marginTop: 'auto' }}>
              {asked && <p className="dc-bubble me" style={{ margin: 0 }}>{run.asked}</p>}
              {run.answer && <p className="dc-bubble" style={{ margin: 0 }}>{run.answer}</p>}
              {run.phase === 'done' && <p className="label" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>Used: {USED.join(' · ')}</p>}
            </div>
            {!asked && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Q_SUGGESTIONS.map((s, i) => <button key={s} className="dc-chip" disabled={i > 0} onClick={() => run.ask(s)} title={i > 0 ? 'Not part of this prototype' : undefined}>{s}</button>)}</div>}
            <form className="dc-compose" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { run.ask(text.trim()); setText(''); } }}>
              <label htmlFor="c-ask" className="sr">Ask Q</label>
              <input id="c-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder="Talk or type to Q" />
              <button type="button" className="dc-round" aria-label="Speak to Q (simulated)" onClick={() => setText(Q_SUGGESTIONS[0])}><Mic /></button>
              <button type="submit" className="dc-round go" aria-label="Send" disabled={!text.trim()}><Arrow /></button>
            </form>
          </section>

          <div style={{ gridColumn: 'span 5', display: 'grid', gap: 14, alignContent: 'start' }}>
            <AnimatePresence mode="popLayout">
              {!ready ? (
                <motion.div key="overnight" style={{ display: 'grid', gap: 14 }} exit={{ opacity: 0, scale: .96 }}>
                  <button className="dc-tile gold" onClick={() => run.ask(Q_SUGGESTIONS[0])} style={{ border: 0, textAlign: 'left', display: 'grid', gap: 6 }} disabled={asked}>
                    <span className="label" style={{ color: 'var(--ink)' }}>Senior Backend</span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}><span className="dc-num">3</span><span className="dc-h3">people worth comparing</span></span>
                    <span style={{ fontWeight: 700 }}>{asked ? 'Q is on it…' : 'Ask who to talk to first →'}</span>
                  </button>
                  <div className="dc-tile"><span className="label">Reply</span><p className="dc-h3" style={{ marginTop: 6 }}>Tobi: “Happy to talk next week.”</p></div>
                  <div className="dc-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div><span className="label">Calendar</span><p className="dc-h3" style={{ marginTop: 6 }}>Seyi: two free mornings</p></div>
                    <div role="img" aria-label="Free Tuesday and Thursday mornings" style={{ display: 'flex', gap: 5 }}>{[0, 1, 0, 1, 0].map((f, i) => <span key={i} style={{ width: 16, height: 40, borderRadius: 8, background: f ? 'var(--gold)' : 'var(--line)' }} />)}</div>
                  </div>
                </motion.div>
              ) : (
                <motion.article key="artifact" layoutId="q-artifact" transition={SPRING} className="dc-tile gold" style={{ borderRadius: 28 }} aria-labelledby="cart">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .2 }}><Verdict /></motion.div>
                </motion.article>
              )}
            </AnimatePresence>
          </div>
        </div>
      </LayoutGroup>
    </Shell>
  );
}

function Verdict() {
  const [open, setOpen] = useState('p_tobi');
  const ev = cellOf(open, 'r1').evidenceIds.map(evidenceById)[0];
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span className="label" style={{ color: 'var(--ink)' }}>Made by Q · shortlist</span><span className="dc-sim">Simulated</span></div>
      <h2 id="cart" className="dc-display" style={{ fontSize: 'clamp(40px,4.6vw,64px)' }}>Talk to Tobi first.</h2>
      <p style={{ margin: 0, fontWeight: 600 }}>The only verified proof of the hardest requirement: payments reconciliation.</p>
      <div style={{ display: 'grid', gap: 8 }} role="group" aria-label="People">
        {SHORTLIST.map((p, i) => (
          <button key={p.personId} className="dc-cardsel" aria-pressed={open === p.personId} onClick={() => setOpen(p.personId)} style={{ gridTemplateColumns: '44px 1fr 90px', alignItems: 'center' }}>
            <span className="dc-avatar" style={{ width: 44, height: 44, fontSize: 17, borderRadius: 14, background: AVATAR[i] }}>{initials(p.name)}</span>
            <span><b>{p.name}</b><span style={{ display: 'block', fontSize: 13, color: 'var(--muted)' }}>{mustHaveCoverage(p.personId).shown} of {mustHaveCoverage(p.personId).total} must-haves shown</span></span>
            <span style={{ display: 'grid', gap: 3 }} aria-hidden="true">{REQS.map((r) => <Bar key={r.reqId} s={strength(cellOf(p.personId, r.reqId).state)} />)}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={open} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} style={{ background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: 20, padding: 16 }}>
          <span className="label" style={{ color: 'var(--on-ink-2)' }}>On payments</span>
          <p style={{ margin: '4px 0 0', fontSize: 17 }}>{ev ? ev.shows : 'Nothing shared yet.'}</p>
        </motion.div>
      </AnimatePresence>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="dc-btn">Draft a note</button><Link to="/x/c/compare" className="dc-btn ghost">Face them off</Link></div>
    </div>
  );
}

// ================= 2 · Discovery: face-off =================
export function CCompare() {
  const narrow = useNarrow();
  const [pair, setPair] = useState<string[]>(['p_tobi', 'p_ife']);
  const [mode, setMode] = useState<'all' | 'off'>('all');
  const toggle = (pid: string) => setPair((p) => (p.includes(pid) ? p.filter((x) => x !== pid) : [...p.slice(-1), pid]));
  const [a, b] = pair.map((id) => SHORTLIST.find((p) => p.personId === id)!);
  return (
    <Shell at="compare">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div><span className="label">Senior Backend · 3 people</span><h1 className="dc-display" style={{ fontSize: 'clamp(40px,5.4vw,76px)', marginTop: 6 }}>Who’s strongest where?</h1></div>
        <div className="dc-seg" role="group" aria-label="View"><button aria-pressed={mode === 'all'} onClick={() => setMode('all')}>All three</button><button aria-pressed={mode === 'off'} onClick={() => setMode('off')} disabled={pair.length < 2}>Face-off</button></div>
      </div>
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {mode === 'all' ? (
            <motion.div key="all" className={narrow ? 'dc-scroll' : 'dc-bento'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {SHORTLIST.map((p, i) => (
                <motion.article layoutId={`card-${p.personId}`} key={p.personId} className={`dc-tile ${i === 0 ? 'ink on-ink' : ''}`} style={{ gridColumn: 'span 4', display: 'grid', gap: 16, alignContent: 'start' }} transition={SPRING} aria-labelledby={`n-${p.personId}`}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <span className="dc-avatar" style={{ background: AVATAR[i], color: 'var(--ink)' }}>{initials(p.name)}</span>
                    <div><h2 id={`n-${p.personId}`} className="dc-h3">{p.name}</h2><span className="label">{p.location}</span></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span className="dc-num" style={{ fontSize: 64 }}>{mustHaveCoverage(p.personId).shown}/{mustHaveCoverage(p.personId).total}</span><span style={{ fontWeight: 600 }}>must-haves<br />shown</span></div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10, ['--ink' as string]: i === 0 ? 'var(--on-ink)' : undefined }}>
                    {REQS.map((r) => { const s = strength(cellOf(p.personId, r.reqId).state); return <li key={r.reqId} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, alignItems: 'center' }}><span style={{ fontWeight: 600, fontSize: 15 }}>{r.label}</span><Bar s={s} /></li>; })}
                  </ul>
                  <p style={{ margin: 0, fontSize: 14, opacity: .8 }}>Unknown: {fitOf(p.personId).unknowns.join('; ') || 'nothing noted'}</p>
                  <button className={`dc-btn ${i === 0 ? 'gold' : 'ghost'}`} aria-pressed={pair.includes(p.personId)} onClick={() => toggle(p.personId)}>{pair.includes(p.personId) ? 'In the face-off ✓' : 'Add to face-off'}</button>
                </motion.article>
              ))}
              {!narrow && <div className="dc-tile line" style={{ gridColumn: '1 / -1' }}><BarKey /></div>}
            </motion.div>
          ) : (
            <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="dc-bento">
              {[a, b].map((p, k) => (
                <motion.div key={p.personId} layoutId={`card-${p.personId}`} transition={SPRING} className={`dc-tile ${k === 0 ? 'ink on-ink' : 'gold'}`} style={{ gridColumn: 'span 6', display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span className="dc-avatar" style={{ background: k === 0 ? 'var(--gold)' : 'var(--ink)', color: k === 0 ? 'var(--ink)' : 'var(--on-ink)' }}>{initials(p.name)}</span>
                  <div><h2 className="dc-h2">{p.name}</h2><span style={{ fontWeight: 600 }}>{mustHaveCoverage(p.personId).shown}/{mustHaveCoverage(p.personId).total} must-haves</span></div>
                </motion.div>
              ))}
              {REQS.map((r, ri) => {
                const sa = strength(cellOf(a.personId, r.reqId).state), sb = strength(cellOf(b.personId, r.reqId).state);
                const d = strengthScore(sa) - strengthScore(sb);
                const ea = cellOf(a.personId, r.reqId).evidenceIds.map(evidenceById)[0], eb = cellOf(b.personId, r.reqId).evidenceIds.map(evidenceById)[0];
                return (
                  <motion.div key={r.reqId} className="dc-tile" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 220px 1fr', gap: 18, alignItems: 'center' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: ri * .05 }}>
                    <div style={{ display: 'grid', gap: 6 }}>{narrow && <span className="label">{a.name.split(' ')[0]}</span>}<Bar s={sa} /><span style={{ fontSize: 14, color: 'var(--muted)' }}>{ea ? ea.shows : cellOf(a.personId, r.reqId).note}</span></div>
                    <div style={{ textAlign: 'center', display: 'grid', gap: 6, justifyItems: 'center', order: narrow ? -1 : 0 }}>
                      <span className="dc-h3">{r.label}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, padding: '4px 12px', borderRadius: 99, background: d === 0 ? 'var(--line)' : 'var(--ink)', color: d === 0 ? 'var(--ink)' : 'var(--on-ink)' }}>{d === 0 ? 'Level' : `${(d > 0 ? a : b).name.split(' ')[0]} ahead`}</span>
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>{narrow && <span className="label">{b.name.split(' ')[0]}</span>}<Bar s={sb} /><span style={{ fontSize: 14, color: 'var(--muted)' }}>{eb ? eb.shows : cellOf(b.personId, r.reqId).note}</span></div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
      {narrow && mode === 'all' && <div className="dc-tile line" style={{ marginTop: 14 }}><BarKey /></div>}
    </Shell>
  );
}

// ================= 3 · J7: your next move =================
export function CCareer() {
  const coach = useCoach();
  const [card, setCard] = useState(0);
  const [skill, setSkill] = useState<string | null>(null);
  const skills = SKILLS.map((s) => (s.id === 'sql' && coach.promoted ? { ...s, state: 'EVIDENCED' as const } : s));
  const sk = skill ? skills.find((s) => s.id === skill)! : null;
  const d = DEVELOPMENT[card];
  return (
    <Shell at="career">
      <div className="dc-bento">
        <section className="dc-tile ink on-ink" style={{ gridColumn: 'span 8', display: 'grid', gap: 24 }} aria-labelledby="cc">
          <span className="label">Amaka · private career space</span>
          <h1 id="cc" className="dc-display" style={{ fontSize: 'clamp(40px,5.6vw,80px)' }}>Next stop:<br /><span style={{ color: 'var(--gold)' }}>Product Analyst.</span></h1>
          <ol aria-label="Route" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 6 }}>
            {ROLES.map((r) => (
              <li key={r.id} style={{ display: 'grid', gap: 8 }}>
                <span style={{ height: 10, borderRadius: 99, background: r.stage === 'now' ? 'var(--gold)' : r.stage === 'later' ? 'transparent' : 'rgb(246 241 231 / .2)', border: r.stage === 'later' ? '1.5px dashed var(--on-ink-2)' : r.stage === 'goal' ? '2px solid var(--gold)' : 'none' }} />
                <span className="label">{{ now: 'Now', next: 'Next', goal: 'Goal', later: 'Later' }[r.stage]}</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{r.label}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="dc-tile gold" style={{ gridColumn: 'span 4', display: 'grid', gap: 12, alignContent: 'space-between' }} aria-label="Evidence coverage">
          <span className="label" style={{ color: 'var(--ink)' }}>Evidence coverage</span>
          <span className="dc-num">{coach.coverage}<span style={{ fontSize: '.45em' }}>/9</span></span>
          <div role="img" aria-label={`${coach.coverage} of 9 requirements have evidence`} style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 5 }}>
            {Array.from({ length: 9 }, (_, i) => <motion.span key={i} animate={{ scale: i === 6 && coach.promoted ? [1, 1.35, 1] : 1 }} transition={{ duration: .5 }} style={{ height: 26, borderRadius: 8, background: i < coach.coverage ? 'var(--ink)' : 'transparent', border: '1.5px solid var(--ink)' }} />)}
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>One measure of six. There is no overall score.</span>
        </section>

        <section className="dc-tile" style={{ gridColumn: 'span 7', display: 'grid', gap: 14, alignContent: 'start' }} aria-labelledby="sk">
          <h2 id="sk" className="dc-h2">What the role needs</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.map((s) => { const st = strength(s.state); return (
              <motion.button layout key={s.id} onClick={() => setSkill(skill === s.id ? null : s.id)} aria-pressed={skill === s.id} transition={SPRING}
                style={{ border: st === 'unclear' ? '1.5px dashed var(--muted)' : '1.5px solid var(--ink)', borderRadius: 999, padding: '10px 16px', minHeight: 44, fontWeight: 700, fontSize: 15, background: st === 'verified' || st === 'full' ? 'var(--ink)' : st === 'partial' ? 'repeating-linear-gradient(135deg, var(--line) 0 6px, var(--card) 6px 12px)' : 'transparent', color: st === 'verified' || st === 'full' ? 'var(--on-ink)' : 'var(--ink)' }}>
                {st === 'verified' ? '✓ ' : st === 'none' ? '+ ' : ''}{s.label}
              </motion.button>); })}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Filled: shown · striped: partial or outdated · outlined “+”: not shown yet · dashed: unclear</p>
          <AnimatePresence>{sk && (
            <motion.div key={sk.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING} style={{ overflow: 'hidden' }}>
              <div style={{ background: 'var(--cream)', borderRadius: 20, padding: 16, display: 'grid', gap: 6 }}>
                <span className="label">{STRENGTH_LABEL[strength(sk.state)]}</span><b className="dc-h3">{sk.label}</b><span>{sk.plain}. Needed for {sk.roles.length} of your 3 roles.</span>
              </div>
            </motion.div>
          )}</AnimatePresence>
        </section>

        <section className="dc-tile" style={{ gridColumn: 'span 5', display: 'grid', gap: 14, alignContent: 'start' }} aria-labelledby="prog">
          <h2 id="prog" className="dc-h2">Getting better</h2>
          {[...PROGRESS, ...(coach.feedback ? [{ skill: 'sql', label: 'SQL window functions', points: [{ at: 'Today', level: coach.feedback.level }] }] : [])].map((p) => (
            <div key={p.skill} style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}><span>{p.label}</span><span>Level {p.points[p.points.length - 1].level}/5</span></div>
              <div role="img" aria-label={`${p.label}: ${p.points.map((x) => `level ${x.level} on ${x.at}`).join(', ')}`} style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 72, borderBottom: '1.5px solid var(--ink)', backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px)', backgroundSize: '100% 20%' }}>
                {p.points.map((x, i) => <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${x.level * 20}%` }} transition={{ ...SPRING, delay: i * .06 }} style={{ flex: 1, borderRadius: 8, background: i === p.points.length - 1 ? 'var(--gold)' : 'var(--line)' }} />)}
              </div>
            </div>
          ))}
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Comparable tasks, same rubric. Practice stays private.</p>
        </section>

        <section className="dc-tile gold" style={{ gridColumn: 'span 5', display: 'grid', gap: 14, alignContent: 'space-between' }} aria-labelledby="move">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label" style={{ color: 'var(--ink)' }}>Your next move · {card + 1} of {DEVELOPMENT.length}</span>
            <span style={{ display: 'flex', gap: 6 }}><button className="dc-round" style={{ width: 44, height: 44 }} aria-label="Previous suggestion" onClick={() => setCard((c) => (c + DEVELOPMENT.length - 1) % DEVELOPMENT.length)}>‹</button><button className="dc-round" style={{ width: 44, height: 44 }} aria-label="Next suggestion" onClick={() => setCard((c) => (c + 1) % DEVELOPMENT.length)}>›</button></span></div>
          <AnimatePresence mode="wait">
            <motion.div key={d.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={SPRING}>
              <h2 id="move" className="dc-h2">{d.title}</h2>
              <p style={{ margin: '8px 0 0', fontWeight: 600 }}>{d.kind} · {d.minutes} min</p>
              <p style={{ margin: '6px 0 0' }}>{d.why}</p>
            </motion.div>
          </AnimatePresence>
          <a href="#coach" className="dc-btn" style={{ justifySelf: 'start' }}>Start</a>
        </section>

        <section id="coach" className="dc-tile ink on-ink" style={{ gridColumn: 'span 7', display: 'grid', gap: 12 }} aria-labelledby="coachh">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Bloom phase={coach.pick ? 'done' : 'idle'} size={48} label={coach.pick ? '✓' : 'Q'} /><h2 id="coachh" className="dc-h2" style={{ fontSize: 28 }}>Two-minute practice</h2></div>
          <p className="dc-bubble" style={{ margin: 0 }}>{COACH_Q}</p>
          <div style={{ display: 'grid', gap: 8 }} role="group" aria-label="Your answer">
            {COACH_OPTIONS.map((o) => <button key={o.id} className="dc-opt" aria-pressed={coach.pick === o.id} aria-disabled={!!coach.pick && coach.pick !== o.id} onClick={() => !coach.pick && coach.setPick(o.id)}><b>{o.id.toUpperCase()}</b>{o.id === 'b' ? <code>{o.text}</code> : <span>{o.text}</span>}</button>)}
          </div>
          <AnimatePresence>{coach.feedback && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} style={{ display: 'grid', gap: 10 }}>
              <p className="dc-bubble" style={{ margin: 0 }}><b>Level {coach.feedback.level} of 5.</b> {coach.feedback.text}</p>
              {!coach.promoted ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="dc-btn gold" onClick={coach.promote}>Add to my Evidence Passport</button><button className="dc-btn ghost" onClick={coach.reset}>Try again</button></div>
                : <p style={{ margin: 0, fontWeight: 700, color: 'var(--gold)' }} role="status">+1 evidence. Coverage is now 7 of 9. Employers see the result, never the attempt.</p>}
            </motion.div>
          )}</AnimatePresence>
        </section>

        <section className="dc-tile line" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18 }} aria-label="Other measures, each separate">
          {[['Competency mastery', 'Sheets · level 3', 'Rubric sheets-2026.1, ±1'], ['Role fit', 'Partial', 'For the role family'], ['Readiness to apply', '2 of 4', 'Advisory only'], ['Plan adherence', '3 of 5', 'Private, never in hiring']].map(([k, v, b]) => (
            <div key={k}><span className="label">{k}</span><p className="dc-h3" style={{ margin: '4px 0 2px' }}>{v}</p><span style={{ fontSize: 14, color: 'var(--muted)' }}>{b}</span></div>
          ))}
        </section>
      </div>
    </Shell>
  );
}

const IQ = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="7" /><path d="M15 15l4 4" /></svg>;
const IPeople = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="3.5" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2 1.5-4 4-4" /></svg>;
const IPath = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6" /></svg>;
const Mic = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
const Arrow = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
