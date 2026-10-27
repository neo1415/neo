// Direction B · Constellation — "luminous, spatial, observatory".
// Composition: a dark field lit by one source (Q). Q: an orbit whose satellites ARE the live agents,
// each travelling as its step's count advances. Nav: a floating command dock. Evidence is drawn as
// connections. Motion: orbit and connect, no overshoot.
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import './b.css';
import { Link } from '../../ui/router';
import { useNarrow } from '../shared/hooks';
import {
  COACH_OPTIONS, COACH_Q, DEVELOPMENT, PROGRESS, Q_SUGGESTIONS, REQS, SHORTLIST, SKILLS, STRENGTH_LABEL, USED,
  cellOf, evidenceById, fitOf, initials, mustHaveCoverage, strength, useCoach, useQRun, type RunPhase, type Step, type Strength,
} from '../shared/scenario';

const EASE = [0.2, 0, 0, 1] as const;
const SHORT: Record<string, string> = { r1: 'Payments', r2: 'Go', r3: 'Postgres', r4: 'On-call', r5: 'Mentoring' };

// ---------------- Q: the orbit ----------------
const ORBITS = [{ rx: 78, ry: 26, rot: -18 }, { rx: 62, ry: 40, rot: 34 }, { rx: 46, ry: 58, rot: 86 }];
function onEllipse(o: typeof ORBITS[number], t: number) {
  const a = (t * 360 - 90) * (Math.PI / 180), r = (o.rot * Math.PI) / 180;
  const x = o.rx * Math.cos(a), y = o.ry * Math.sin(a);
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}
function Orbit({ phase, steps, size = 200 }: { phase: RunPhase; steps?: Step[]; size?: number }) {
  const reduce = useReducedMotion();
  const active = phase === 'working' || phase === 'answering' || phase === 'done';
  const label = { idle: 'Q is ready', thinking: 'Q is reading your question', working: `Q is working: ${steps?.filter((s) => s.done === s.total).length ?? 0} of 3 agents finished`, answering: 'Q is writing the answer', done: 'Q has finished' }[phase];
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" role="img" aria-label={label} style={{ overflow: 'visible', flex: 'none' }}>
      <defs><radialGradient id="dbcore"><stop offset="0" stopColor="#f3dca6" /><stop offset="1" stopColor="#d9b56b" /></radialGradient></defs>
      <motion.g animate={phase === 'thinking' && !reduce ? { rotate: 360 } : { rotate: 0 }} transition={phase === 'thinking' ? { duration: 6, repeat: Infinity, ease: 'linear' } : { duration: .6 }}>
        {ORBITS.map((o, i) => <ellipse key={i} rx={o.rx} ry={o.ry} transform={`rotate(${o.rot})`} fill="none" stroke={active && steps && steps[i].done > 0 ? 'rgb(227 194 125 / .5)' : 'var(--line-2)'} strokeWidth="1" />)}
      </motion.g>
      {active && steps && steps.map((s, i) => {
        const p = onEllipse(ORBITS[i], s.done / s.total);
        const fin = s.done === s.total;
        return (
          <motion.g key={s.id} initial={false} animate={{ x: phase === 'done' ? 0 : p.x, y: phase === 'done' ? 0 : p.y, opacity: phase === 'done' ? 0 : 1 }} transition={{ duration: reduce ? 0 : .3, ease: EASE }}>
            <circle r={fin ? 5 : 6} fill={fin ? 'var(--muted)' : 'var(--gold-2)'} />
          </motion.g>
        );
      })}
      <circle className="db-core" r={phase === 'thinking' ? 13 : phase === 'done' ? 17 : 15} fill="url(#dbcore)" />
      {phase === 'done' && !reduce && <motion.circle r="18" fill="none" stroke="var(--gold)" strokeWidth="1.5" initial={{ scale: 1, opacity: .8 }} animate={{ scale: 4, opacity: 0 }} transition={{ duration: .9, ease: 'easeOut' }} />}
    </svg>
  );
}

// Evidence as a line: style carries strength (solid gold / solid / dashed / dotted / none).
function edgeStyle(s: Strength) {
  switch (s) {
    case 'verified': return { stroke: 'var(--gold)', strokeWidth: 3.2, dash: undefined };
    case 'full': return { stroke: 'var(--text)', strokeWidth: 2, dash: undefined };
    case 'partial': return { stroke: 'var(--text)', strokeWidth: 2, dash: '7 6' };
    case 'unclear': return { stroke: 'var(--faint)', strokeWidth: 1.6, dash: '1.5 5' };
    default: return null;
  }
}
function EdgeLegend() {
  const items: Strength[] = ['verified', 'full', 'partial', 'unclear'];
  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', listStyle: 'none', padding: 0, margin: 0 }} aria-label="Key">
      {items.map((s) => { const e = edgeStyle(s)!; return <li key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}><svg width="28" height="8" aria-hidden="true"><line x1="0" x2="28" y1="4" y2="4" stroke={e.stroke} strokeWidth={e.strokeWidth} strokeDasharray={e.dash} strokeLinecap="round" /></svg>{STRENGTH_LABEL[s]}</li>; })}
      <li style={{ fontSize: 13, color: 'var(--muted)' }}>No line: not shown yet</li>
    </ul>
  );
}

// ---------------- Shell ----------------
function Shell({ at, ctx, children }: { at: 'home' | 'compare' | 'career'; ctx: string; children: ReactNode }) {
  return (
    <div className="db">
      <header className="db-top"><Link to="/x" className="db-mark" aria-label="Talent Q, back to directions"><i aria-hidden="true" />Talent Q</Link><span className="db-ctx">{ctx}</span></header>
      <main className="db-wrap">{children}</main>
      <nav className="db-dock" aria-label="Go to">
        {([['home', 'Ask Q'], ['compare', 'Talent'], ['career', 'Career']] as const).map(([k, l]) => <Link key={k} to={`/x/b/${k}`} current={at === k}><span className="dot" aria-hidden="true" />{l}</Link>)}
      </nav>
    </div>
  );
}

// ================= 1 · Q home =================
export function BHome() {
  const run = useQRun();
  const narrow = useNarrow();
  const [text, setText] = useState('');
  const asked = run.phase !== 'idle';
  return (
    <Shell at="home" ctx="Kora Pay · Ada Okafor">
      <div className="db-grid" style={{ gridTemplateColumns: narrow ? '1fr' : 'minmax(0,5fr) minmax(0,7fr)', minHeight: 'calc(100vh - 200px)' }}>
        <section aria-labelledby="bh" style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: narrow ? 0 : 24 }}>
          <Orbit phase={run.phase} steps={run.steps} size={narrow ? 150 : 210} />
          <h1 id="bh" className="db-h1">{run.phase === 'idle' ? <>Three things moved overnight. <b>One needs you.</b></> : run.phase === 'done' ? <>Talk to <b>Tobi</b> first.</> : <>Working on it.</>}</h1>
          <p className="db-lead" aria-live="polite">
            {run.phase === 'idle' && 'I read 24 profiles and 7 pieces of evidence while you were away.'}
            {run.phase === 'thinking' && 'Reading your question…'}
            {run.phase === 'working' && `${run.steps.filter((s) => s.done > 0).length} agents running · ${run.activeStep?.label ?? 'finishing'}`}
            {(run.phase === 'answering' || run.phase === 'done') && 'Three agents, one answer. The evidence is mapped on the right.'}
          </p>
          <div role="log" aria-label="Conversation with Q" style={{ display: 'grid', gap: 14 }}>
            {asked && <p style={{ margin: 0, color: 'var(--muted)' }}><span className="mono" style={{ marginRight: 10 }}>You</span>{run.asked}</p>}
            {run.answer && <p className="db-q">{run.answer}</p>}
            {run.phase === 'done' && <p className="mono" style={{ textTransform: 'none', letterSpacing: 0 }}>Used · {USED.join(' · ')}</p>}
          </div>
          {!asked && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Q_SUGGESTIONS.map((s, i) => <button key={s} className="db-chip" disabled={i > 0} onClick={() => run.ask(s)} title={i > 0 ? 'Not part of this prototype' : undefined}>{s}</button>)}</div>}
          <form className="db-console" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { run.ask(text.trim()); setText(''); } }}>
            <label htmlFor="b-ask" className="sr">Ask Q</label>
            <input id="b-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Q or jump to anything" />
            {!narrow && <span className="db-kbd" aria-hidden="true">⌘K</span>}
            <button type="button" className="db-ib" aria-label="Speak to Q (simulated)" onClick={() => setText(Q_SUGGESTIONS[0])}><Mic /></button>
            <button type="submit" className="db-ib db-go" aria-label="Send" disabled={!text.trim()}><Arrow /></button>
          </form>
        </section>

        <section aria-label="Q's work">
          <AnimatePresence mode="wait">
            {run.phase === 'idle' ? (
              <motion.div key="i" className="db-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Overnight onOpen={() => run.ask(Q_SUGGESTIONS[0])} />
              </motion.div>
            ) : (
              <motion.div key="a" className="db-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, ease: EASE }}>
                <Threads run={run} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </Shell>
  );
}

function Overnight({ onOpen }: { onOpen: () => void }) {
  const items = [
    { k: 'Shortlist', t: 'Three people fit Senior Backend', d: 'Read 24 profiles across 2 sources; 1 source was rate-limited.', go: true },
    { k: 'Reply', t: 'Tobi: “Happy to talk next week.”', d: 'Q can offer times from your remembered hours.' },
    { k: 'Calendar', t: 'Seyi has two free mornings', d: 'Busy times only. No meeting details are read.' },
  ];
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><h2 className="db-h2">Overnight</h2><span className="mono">3 signals</span></div>
      {items.map((x, i) => (
        <div key={x.k} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 16, padding: '16px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
          <svg viewBox="-30 -30 60 60" width="56" height="56" aria-hidden="true">
            <circle r="26" fill="none" stroke="var(--line-2)" />
            {Array.from({ length: [3, 1, 2][i] }, (_, j) => <circle key={j} r="5" cx={Math.cos((j * 2 * Math.PI) / 3 - 1.57) * 14} cy={Math.sin((j * 2 * Math.PI) / 3 - 1.57) * 14} fill={i === 0 ? 'var(--gold)' : 'var(--text)'} />)}
          </svg>
          <div><span className="mono">{x.k}</span><p style={{ margin: '2px 0 0', fontSize: 19 }}>{x.t}</p><p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: 15 }}>{x.d}</p>
            {x.go && <button className="db-btn db-btn-gold" style={{ marginTop: 12 }} onClick={onOpen}>Who should I talk to first?</button>}</div>
        </div>
      ))}
    </div>
  );
}

function Threads({ run }: { run: ReturnType<typeof useQRun> }) {
  const narrow = useNarrow();
  const [focus, setFocus] = useState('p_tobi');
  const W = narrow ? 320 : 640, H = narrow ? 330 : 360;
  const cx = (i: number) => (W / 3) * i + W / 6;
  const rx = (i: number) => (W / 5) * i + W / 10;
  const evDone = run.steps[1].done / run.steps[1].total;
  const edges = SHORTLIST.flatMap((p, pi) => REQS.map((r, ri) => ({ p, pi, r, ri, s: strength(cellOf(p.personId, r.reqId).state) })));
  const shown = run.phase === 'done' || run.phase === 'answering' ? edges.length : Math.floor(evDone * edges.length);
  const ev = cellOf(focus, 'r1').evidenceIds.map(evidenceById)[0];
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="mono">Artifact · evidence map · v1</span><span className="db-sim">Simulated</span>
      </div>
      {run.phase !== 'done' && run.phase !== 'answering' && (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Agents">
          {run.steps.map((s, i) => <li key={s.id} className="db-step"><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: s.done === s.total ? 'var(--muted)' : s.done ? 'var(--gold-2)' : 'transparent', border: '1px solid var(--line-2)' }} /><span>Agent {i + 1} · {s.label}</span><span className="n">{s.done}/{s.total}</span></li>)}
        </ol>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label="Evidence map: lines connect each person to the requirements they have evidence for. Details in the table below.">
        {edges.slice(0, shown).map((e) => {
          const st = edgeStyle(e.s); if (!st) return null;
          const x1 = cx(e.pi), x2 = rx(e.ri), y1 = 64, y2 = H - 78;
          return <motion.path key={e.p.personId + e.r.reqId} d={`M${x1} ${y1} C ${x1} ${y1 + 110}, ${x2} ${y2 - 110}, ${x2} ${y2}`} fill="none" stroke={st.stroke} strokeWidth={st.strokeWidth} strokeDasharray={st.dash} strokeLinecap="round"
            initial={{ opacity: 0 }} animate={{ opacity: e.p.personId === focus ? 1 : .2 }} transition={{ duration: .3 }} />;
        })}
        {REQS.map((r, ri) => (
          <g key={r.reqId}>
            {ri === 0 && <circle cx={rx(ri)} cy={H - 78} r="17" fill="none" stroke="var(--gold)" strokeOpacity=".45" />}
            <circle cx={rx(ri)} cy={H - 78} r="8" fill="var(--deep)" stroke="var(--text)" strokeWidth="1.5" />
            <text x={rx(ri)} y={H - 44} textAnchor="middle" fill="var(--text)" fontSize="14">{SHORT[r.reqId]}</text>
            {ri === 0 && <text x={rx(ri)} y={H - 24} textAnchor="middle" fill="var(--gold)" fontSize="12" fontFamily="var(--mono)">HARDEST</text>}
          </g>
        ))}
        {SHORTLIST.map((p, pi) => (
          <g key={p.personId} className="db-node" role="button" tabIndex={0} aria-pressed={focus === p.personId} aria-label={`Focus ${p.name}`} onClick={() => setFocus(p.personId)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus(p.personId); } }}>
            <circle className="ring" cx={cx(pi)} cy={40} r="24" fill={focus === p.personId ? 'var(--gold)' : 'var(--deep)'} stroke={focus === p.personId ? 'var(--gold)' : 'var(--line-2)'} strokeWidth="1.5" />
            <text x={cx(pi)} y={45} textAnchor="middle" fontSize="14" fontWeight="600" fill={focus === p.personId ? '#17140c' : 'var(--text)'}>{initials(p.name)}</text>
            <text x={cx(pi)} y={84} textAnchor="middle" fontSize="13" fill="var(--muted)">{p.name.split(' ')[0]}</text>
          </g>
        ))}
      </svg>
      {(run.phase === 'done' || run.phase === 'answering') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gap: 14 }}>
          <EdgeLegend />
          <hr className="db-hair" />
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="mono">{SHORTLIST.find((p) => p.personId === focus)!.name} · payments</span>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 300 }}>{ev ? ev.shows : 'Nothing shared yet for the hardest requirement.'}</p>
            {ev && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>{ev.source} · {ev.verified ? 'verified by Q' : 'not verified'} · limits: {ev.limits}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="db-btn db-btn-gold">Draft a note to {SHORTLIST.find((p) => p.personId === focus)!.name.split(' ')[0]}</button>
            <Link to="/x/b/compare" className="db-btn">Open the full map</Link>
          </div>
          <details><summary className="mono" style={{ cursor: 'pointer' }}>View as a table</summary><EvidenceTable /></details>
        </motion.div>
      )}
    </div>
  );
}
function EvidenceTable() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 14 }}>
        <thead><tr><th scope="col" style={{ textAlign: 'left', padding: 8 }}>Requirement</th>{SHORTLIST.map((p) => <th key={p.personId} scope="col" style={{ textAlign: 'left', padding: 8 }}>{p.name}</th>)}</tr></thead>
        <tbody>{REQS.map((r) => <tr key={r.reqId} style={{ borderTop: '1px solid var(--line)' }}><th scope="row" style={{ textAlign: 'left', padding: 8, fontWeight: 400 }}>{r.label}</th>{SHORTLIST.map((p) => <td key={p.personId} style={{ padding: 8, color: 'var(--muted)' }}>{STRENGTH_LABEL[strength(cellOf(p.personId, r.reqId).state)]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// ================= 2 · Discovery: the evidence constellation =================
export function BCompare() {
  const narrow = useNarrow();
  const [req, setReq] = useState('r1');
  const [person, setPerson] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'table'>('map');
  const W = narrow ? 330 : 760, H = 520;
  const py = (i: number) => 110 + i * (narrow ? 150 : 150);
  const ry = (i: number) => 60 + i * ((H - 120) / 4);
  const PX = narrow ? 44 : 110, RX = narrow ? 200 : 470;
  const r = REQS.find((x) => x.reqId === req)!;
  const lit = (pid: string, rid: string) => (person ? pid === person : rid === req);
  return (
    <Shell at="compare" ctx="Senior Backend · evidence map">
      <header style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        <h1 className="db-h1">Every line is <b>evidence</b>. No line is a question.</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <EdgeLegend />
          <div className="db-seg" role="group" aria-label="View"><button aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button><button aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button></div>
        </div>
      </header>
      <div className="db-grid">
        <section className="db-panel" aria-label="Evidence map" style={{ padding: narrow ? 10 : undefined }}>
          {view === 'table' ? <EvidenceTable /> : (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label="People on the left, requirements on the right, connected by evidence. Choose a requirement or person to focus. The table view has the same information.">
              {SHORTLIST.map((p, pi) => REQS.map((q, qi) => {
                const st = edgeStyle(strength(cellOf(p.personId, q.reqId).state)); if (!st) return null;
                const x1 = PX + 30, y1 = py(pi), x2 = RX - 12, y2 = ry(qi);
                return <motion.path key={p.personId + q.reqId} d={`M${x1} ${y1} C ${x1 + (x2 - x1) / 2} ${y1}, ${x1 + (x2 - x1) / 2} ${y2}, ${x2} ${y2}`} fill="none" stroke={st.stroke} strokeWidth={st.strokeWidth} strokeDasharray={st.dash} strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1, opacity: lit(p.personId, q.reqId) ? 1 : .16 }} transition={{ pathLength: { duration: .7, delay: pi * .12 + qi * .05, ease: EASE }, opacity: { duration: .25 } }} />;
              }))}
              {SHORTLIST.map((p, pi) => (
                <g key={p.personId} className="db-node" role="button" tabIndex={0} aria-pressed={person === p.personId} aria-label={`Focus ${p.name}`} onClick={() => setPerson(person === p.personId ? null : p.personId)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPerson(person === p.personId ? null : p.personId); } }}>
                  <circle className="ring" cx={PX} cy={py(pi)} r="30" fill={person === p.personId ? 'var(--gold)' : 'var(--deep)'} stroke={person === p.personId ? 'var(--gold)' : 'var(--line-2)'} strokeWidth="1.5" />
                  <text x={PX} y={py(pi) + 5} textAnchor="middle" fontSize="16" fontWeight="600" fill={person === p.personId ? '#17140c' : 'var(--text)'}>{initials(p.name)}</text>
                  <text x={PX} y={py(pi) + 52} textAnchor="middle" fontSize="14" fill="var(--text)">{narrow ? p.name.split(' ')[0] : p.name}</text>
                  <text x={PX} y={py(pi) + 72} textAnchor="middle" fontSize="13" fill="var(--muted)" fontFamily="var(--mono)">{mustHaveCoverage(p.personId).shown}/{mustHaveCoverage(p.personId).total} MUST-HAVES</text>
                </g>
              ))}
              {REQS.map((q, qi) => (
                <g key={q.reqId} className="db-node" role="button" tabIndex={0} aria-pressed={req === q.reqId && !person} aria-label={`Compare everyone on ${q.label}`} onClick={() => { setReq(q.reqId); setPerson(null); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setReq(q.reqId); setPerson(null); } }}>
                  {qi === 0 && <circle cx={RX} cy={ry(qi)} r="20" fill="none" stroke="var(--gold)" strokeOpacity=".4" />}
                  <circle className="ring" cx={RX} cy={ry(qi)} r="10" fill={req === q.reqId && !person ? 'var(--gold)' : 'var(--deep)'} stroke="var(--text)" strokeWidth="1.5" />
                  <text x={RX + 26} y={ry(qi) + 5} fontSize="16" fill="var(--text)">{narrow ? SHORT[q.reqId] : q.label}</text>
                  <text x={RX + 26} y={ry(qi) + 25} fontSize="13" fill={qi === 0 ? 'var(--gold)' : 'var(--muted)'} fontFamily="var(--mono)">{qi === 0 ? 'HARDEST · ' : ''}{q.mustHave ? 'MUST' : 'NICE'}</text>
                </g>
              ))}
            </svg>
          )}
        </section>

        <aside className="db-panel" aria-live="polite" aria-label="Comparison detail">
          {person ? <PersonDetail pid={person} /> : (
            <div style={{ display: 'grid', gap: 16 }}>
              <span className="mono">Comparing everyone on</span>
              <h2 className="db-h2">{r.label}</h2>
              <p style={{ margin: 0, color: 'var(--muted)' }}>{r.plain}.</p>
              {SHORTLIST.map((p) => { const c = cellOf(p.personId, r.reqId); const s = strength(c.state); const e = c.evidenceIds.map(evidenceById)[0]; const st = edgeStyle(s); return (
                <div key={p.personId} style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><b style={{ fontWeight: 500 }}>{p.name}</b><svg width="34" height="8" aria-hidden="true">{st && <line x1="0" x2="34" y1="4" y2="4" stroke={st.stroke} strokeWidth={st.strokeWidth} strokeDasharray={st.dash} strokeLinecap="round" />}</svg><span className="mono" style={{ marginLeft: 'auto' }}>{STRENGTH_LABEL[s]}</span></div>
                  <p style={{ margin: 0, fontWeight: 300 }}>{e ? e.shows : c.note}</p>
                  {e && <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{e.source} · limits: {e.limits}</p>}
                </div>); })}
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}
function PersonDetail({ pid }: { pid: string }) {
  const p = SHORTLIST.find((x) => x.personId === pid)!; const f = fitOf(pid);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <span className="mono">Focus</span><h2 className="db-h2">{p.name}</h2><p style={{ margin: 0, color: 'var(--muted)' }}>{p.headline} · {p.location}</p>
      <div className="db-read">
        <div><span className="mono">Must-haves</span><b>{mustHaveCoverage(pid).shown} of {mustHaveCoverage(pid).total}</b></div>
        <div><span className="mono">Work mode</span><b style={{ textTransform: 'capitalize' }}>{f.mutual.workMode.toLowerCase()}</b></div>
        <div><span className="mono">Pay</span><b style={{ textTransform: 'capitalize' }}>{f.mutual.pay.toLowerCase()}</b></div>
      </div>
      <p style={{ margin: 0 }}>Unknown: {f.unknowns.join('; ') || 'nothing noted'}.</p>
      <button className="db-btn db-btn-gold" style={{ justifySelf: 'start' }}>Draft outreach</button>
    </div>
  );
}

// ================= 3 · J7 skill sky =================
type Pos = Record<string, [number, number]>;
const SKY_D: Pos = { you: [80, 460], r_jda: [300, 390], r_pa: [700, 120], r_ga: [1120, 330], sheets: [380, 250], story: [560, 380], sql: [500, 170], writing: [840, 290], stake: [960, 170], exp: [980, 440] };
const SKY_M: Pos = { you: [40, 600], r_jda: [90, 480], r_pa: [180, 90], r_ga: [270, 330], sheets: [60, 340], story: [190, 430], sql: [90, 210], writing: [270, 200], stake: [290, 470], exp: [210, 560] };
const ROLE_NAME: Record<string, string> = { r_jda: 'Junior Data Analyst', r_pa: 'Product Analyst', r_ga: 'Growth Analyst' };

function Star({ s, r = 9 }: { s: Strength; r?: number }) {
  if (s === 'verified') return <path d={`M0 ${-r * 1.5} L${r * .4} ${-r * .4} L${r * 1.5} 0 L${r * .4} ${r * .4} L0 ${r * 1.5} L${-r * .4} ${r * .4} L${-r * 1.5} 0 L${-r * .4} ${-r * .4} Z`} fill="var(--gold-2)" />;
  if (s === 'full') return <circle r={r} fill="var(--text)" />;
  if (s === 'partial') return <g><circle r={r} fill="none" stroke="var(--text)" strokeWidth="1.6" /><path d={`M0 ${-r} A${r} ${r} 0 0 0 0 ${r} Z`} fill="var(--text)" /></g>;
  if (s === 'unclear') return <circle r={r} fill="none" stroke="var(--faint)" strokeWidth="1.6" strokeDasharray="2 3" />;
  return <circle r={r} fill="none" stroke="var(--text)" strokeWidth="1.6" />;
}

export function BCareer() {
  const narrow = useNarrow();
  const coach = useCoach();
  const [sel, setSel] = useState('sql');
  const P = narrow ? SKY_M : SKY_D;
  const W = narrow ? 340 : 1240, H = narrow ? 640 : 520;
  const skills = SKILLS.map((s) => (s.id === 'sql' && coach.promoted ? { ...s, state: 'EVIDENCED' as const, level: coach.feedback?.level ?? 2 } : s));
  const sk = skills.find((s) => s.id === sel)!;
  const rings = [...PROGRESS.map((p) => ({ label: p.label, level: p.points[p.points.length - 1].level, first: p.points[0].level, n: p.points.length })), ...(coach.feedback ? [{ label: 'SQL window functions', level: coach.feedback.level, first: coach.feedback.level, n: 1 }] : [])];
  return (
    <Shell at="career" ctx="Amaka Eze · private career space">
      <header style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
        <span className="mono">Goal · Product Analyst · 3 months</span>
        <h1 className="db-h1">Your sky of skills. <b>Two stars</b> to light before you apply.</h1>
        <p className="db-lead">Each star is a skill. Lines show which roles need it. Brightness is evidence, never a score.</p>
      </header>
      <section className="db-panel" aria-label="Skill map" style={{ padding: narrow ? 8 : 16, marginBottom: 20 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label="Skill map linking your skills to Junior Data Analyst, Product Analyst (your goal) and Growth Analyst. The list beside it has the same information.">
            <path d={`M${P.you[0]} ${P.you[1]} Q ${(P.you[0] + P.r_jda[0]) / 2} ${P.r_jda[1] + 40} ${P.r_jda[0]} ${P.r_jda[1]} T ${P.r_pa[0]} ${P.r_pa[1]}`} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="3 7" opacity=".7" />
            {skills.flatMap((s) => s.roles.map((rid) => <motion.line key={s.id + rid} x1={P[s.id][0]} y1={P[s.id][1]} x2={P[rid][0]} y2={P[rid][1]} stroke={sel === s.id ? 'var(--gold-2)' : 'var(--line-2)'} strokeWidth={sel === s.id ? 1.6 : 1} initial={false} animate={{ opacity: sel === s.id ? 1 : .7 }} />))}
            {(['r_jda', 'r_pa', 'r_ga'] as const).map((rid) => (
              <g key={rid} transform={`translate(${P[rid][0]} ${P[rid][1]})`}>
                <circle r={rid === 'r_pa' ? 34 : 22} fill="var(--void)" stroke={rid === 'r_pa' ? 'var(--gold)' : 'var(--line-2)'} strokeWidth={rid === 'r_pa' ? 2 : 1.2} />
                <text y={rid === 'r_pa' ? -46 : -32} textAnchor="middle" fontSize={rid === 'r_pa' ? 19 : 15} fill="var(--text)" fontWeight={rid === 'r_pa' ? 600 : 400}>{ROLE_NAME[rid]}</text>
                {rid === 'r_pa' && <text y="5" textAnchor="middle" fontSize="12" fill="var(--gold)" fontFamily="var(--mono)">GOAL</text>}
              </g>
            ))}
            <g transform={`translate(${P.you[0]} ${P.you[1]})`}><circle r="7" fill="var(--gold)" /><text y="28" textAnchor="middle" fontSize="15" fill="var(--muted)">You</text></g>
            {skills.map((s) => (
              <g key={s.id} className="db-node" transform={`translate(${P[s.id][0]} ${P[s.id][1]})`} role="button" tabIndex={0} aria-pressed={sel === s.id} aria-label={`${s.label}: ${STRENGTH_LABEL[strength(s.state)]}`} onClick={() => setSel(s.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(s.id); } }}>
                <circle className="ring" r="24" fill="transparent" stroke={sel === s.id ? 'var(--gold-2)' : 'transparent'} strokeWidth="1.5" />
                <motion.g key={s.state} initial={{ scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .45, ease: EASE }}><Star s={strength(s.state)} /></motion.g>
                <text y="42" textAnchor="middle" fontSize="15" fill="var(--text)">{narrow ? s.label.split(' ')[0] : s.label}</text>
              </g>
            ))}
          </svg>
          <ul className="db-list" style={{ listStyle: 'none', padding: '0 8px', margin: '8px 0 0', columns: narrow ? 1 : 2, columnGap: 32 }} aria-label="Skills as a list">
            {skills.map((s) => <li key={s.id}><button aria-pressed={sel === s.id} onClick={() => setSel(s.id)}><svg width="26" height="26" viewBox="-13 -13 26 26" aria-hidden="true"><Star s={strength(s.state)} r={7} /></svg><span style={{ flex: 1 }}>{s.label}</span><span className="mono">{STRENGTH_LABEL[strength(s.state)]}</span></button></li>)}
          </ul>
        </section>
      <div className="db-grid">

        <aside style={{ display: 'grid', gap: 16 }}>
          <AnimatePresence mode="wait">
            <motion.div key={sk.id + sk.state} className="db-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, ease: EASE }} style={{ display: 'grid', gap: 10 }}>
              <span className="mono">{STRENGTH_LABEL[strength(sk.state)]}{sk.level ? ` · level ${sk.level} of 5` : ''}</span>
              <h2 className="db-h2">{sk.label}</h2>
              <p style={{ margin: 0, color: 'var(--muted)' }}>{sk.plain}. Needed for {sk.roles.map((r) => ROLE_NAME[r]).join(', ')}.</p>
              {sk.id === 'sql' && !coach.promoted && <p style={{ margin: 0 }}>Asked for in 7 of 10 roles you saved. Not shown yet, which is different from not having it.</p>}
            </motion.div>
          </AnimatePresence>

          <div className="db-panel" style={{ display: 'grid', gap: 12 }} aria-labelledby="bcoach">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Orbit phase={coach.pick ? 'done' : 'idle'} size={44} /><h2 id="bcoach" className="db-h2" style={{ fontSize: 22 }}>Two-minute practice</h2></div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 300 }}>{COACH_Q}</p>
            <div style={{ display: 'grid', gap: 8 }} role="group" aria-label="Your answer">
              {COACH_OPTIONS.map((o) => <button key={o.id} className="db-opt" aria-pressed={coach.pick === o.id} disabled={!!coach.pick && coach.pick !== o.id} onClick={() => coach.setPick(o.id)}><span className="mono">{o.id}</span>{o.id === 'b' ? <code>{o.text}</code> : <span>{o.text}</span>}</button>)}
            </div>
            {coach.feedback && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <span className="mono">Feedback · level {coach.feedback.level} of 5 · private</span>
                <p style={{ margin: 0 }}>{coach.feedback.text}</p>
                {!coach.promoted ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="db-btn db-btn-gold" onClick={() => { coach.promote(); setSel('sql'); }}>Add to my Evidence Passport</button><button className="db-btn" onClick={coach.reset}>Try again</button></div>
                  : <p style={{ margin: 0, color: 'var(--gold-2)' }} role="status">The SQL star is lit. Evidence coverage is now 7 of 9.</p>}
              </motion.div>
            )}
          </div>
        </aside>
      </div>

      <section className="db-grid" style={{ marginTop: 24 }} aria-label="Progress and next steps">
        <div className="db-panel" style={{ display: 'grid', gap: 16 }}>
          <h2 className="db-h2">Progress on comparable tasks</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {rings.map((r) => <Ring key={r.label} {...r} />)}
          </div>
          <div className="db-read" aria-label="Six separate measures. There is no overall score.">
            <div><span className="mono">Evidence coverage</span><b>{coach.coverage} of 9</b></div>
            <div><span className="mono">Mastery</span><b>Sheets L3</b><p>rubric sheets-2026.1 ±1</p></div>
            <div><span className="mono">Practice</span><b>{rings.length} tracked</b></div>
            <div><span className="mono">Role fit</span><b>Partial</b><p>role family</p></div>
            <div><span className="mono">Readiness</span><b>2 of 4</b><p>advisory</p></div>
            <div><span className="mono">Plan</span><b>3 of 5</b><p>private</p></div>
          </div>
        </div>
        <div className="db-panel">
          <h2 className="db-h2">Next moves</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
            {DEVELOPMENT.map((d) => <li key={d.id} style={{ padding: '14px 0', borderTop: '1px solid var(--line)', display: 'grid', gap: 4 }}><span className="mono">{d.kind} · {d.minutes} min</span><b style={{ fontWeight: 500, fontSize: 18 }}>{d.title}</b><span style={{ color: 'var(--muted)', fontSize: 15 }}>{d.why}</span></li>)}
          </ol>
        </div>
      </section>
    </Shell>
  );
}
function Ring({ label, level, first, n }: { label: string; level: number; first: number; n: number }) {
  const R = 34, C = 2 * Math.PI * R;
  return (
    <figure style={{ margin: 0, display: 'grid', justifyItems: 'center', gap: 6, width: 140, textAlign: 'center' }}>
      <svg width="96" height="96" viewBox="-48 -48 96 96" role="img" aria-label={`${label}: level ${level} of 5, from level ${first}, ${n} comparable attempts`}>
        <circle r={R} fill="none" stroke="var(--line-2)" strokeWidth="6" />
        <motion.circle r={R} fill="none" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" transform="rotate(-90)" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - level / 5) }} transition={{ duration: .9, ease: EASE }} />
        <text y="8" textAnchor="middle" fontSize="22" fill="var(--text)">{level}</text>
      </svg>
      <figcaption style={{ fontSize: 14 }}>{label}<span style={{ display: 'block', color: 'var(--muted)', fontSize: 13 }}>{level > first ? `+${level - first} since start` : n === 1 ? 'first attempt' : 'holding'}</span></figcaption>
    </figure>
  );
}

const Mic = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
