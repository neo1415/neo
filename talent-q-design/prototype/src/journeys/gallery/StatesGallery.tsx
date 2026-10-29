// Indexed interaction-state gallery (/gallery/states). Every state a journey can reach, shown live with a
// replay control, so requirements that the stories don't exercise still have an inspectable implementation.
// Specimens use the same Direction D classes and QMark as the product; timings are short and reduced
// motion skips straight to each state's end.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { QMark, MOOD_LABEL, type QMood } from '../../ds/QMark';
import { Glyph, GLYPH_LABEL, type GlyphKind } from '../../ds/Glyph';
import '../../ds/ds.css';

interface Spec { id: string; title: string; covers: string; body: (k: number) => ReactNode }

/** Runs a list of [delayMs, step] after each replay; reduced motion jumps to the last step. */
function useSteps<T>(steps: [number, T][], k: number): T {
  const reduce = useReducedMotion();
  const [s, setS] = useState(steps[0][1]);
  useEffect(() => {
    if (reduce) { setS(steps[steps.length - 1][1]); return; }
    setS(steps[0][1]);
    let t = 0; const ids = steps.slice(1).map(([d, v]) => { t += d; return window.setTimeout(() => setS(v), t); });
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, reduce]);
  return s;
}

const Thread = ({ children }: { children: ReactNode }) => <div className="ink gs-thread">{children}</div>;
const QLine = ({ children, kind }: { children: ReactNode; kind?: string }) => <div className="ds-q" data-kind={kind}>{children}</div>;
const Chip = ({ children, go, on }: { children: ReactNode; go?: boolean; on?: () => void }) => <button type="button" className={`ds-chip ${go ? 'go' : ''}`} onClick={on}>{children}</button>;

function Streaming({ k }: { k: number }) {
  const full = 'Tobi has shipped payment services in Go for four years. Two of his claims are verified; the third is from his CV only.';
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const phase = useSteps<QMood>([[0, 'thinking'], [700, 'working'], [1400, 'done']], k);
  useEffect(() => { if (reduce) { setN(full.length); return; } setN(0); const start = window.setTimeout(() => { const id = window.setInterval(() => setN((x) => { if (x >= full.length) { clearInterval(id); return x; } return x + 3; }), 24); }, 700); return () => clearTimeout(start); }, [k, reduce]);
  return <Thread><div className="gs-row"><QMark mood={phase} agents={phase === 'working' ? [{ label: 'Reading evidence', done: 2, total: 3 }] : []} size={32} /><span className="t14" style={{ color: 'var(--moon-2)' }} aria-live="polite">{MOOD_LABEL[phase]}</span></div><QLine><p className="say">{full.slice(0, n)}{n < full.length && <span className="gs-caret" aria-hidden="true" />}</p></QLine></Thread>;
}

function Clarify({ k }: { k: number }) {
  const [pick, setPick] = useState<string | null>(null);
  useEffect(() => setPick(null), [k]);
  return <Thread><p className="ds-me">need someone for the shop</p><QLine kind="question"><p className="say">Happy to help. Is this mostly serving customers, or keeping the books and stock in order?</p>{!pick ? <div className="ds-next"><Chip go on={() => setPick('Serving customers')}>Serving customers</Chip><Chip on={() => setPick('Books and stock')}>Books and stock</Chip><Chip on={() => setPick('Not sure yet')}>Not sure yet</Chip></div> : <p className="t14" style={{ color: 'var(--moon-2)' }}>You chose “{pick}”. Q reuses this answer later instead of asking again.</p>}</QLine></Thread>;
}

function Approval({ k }: { k: number }) {
  const [s, setS] = useState<'ask' | 'sending' | 'sent' | 'cancelled'>('ask');
  useEffect(() => setS('ask'), [k]);
  useEffect(() => { if (s === 'sending') { const id = window.setTimeout(() => setS('sent'), 700); return () => clearTimeout(id); } }, [s]);
  return <Thread><p className="ds-me">send it</p><QLine kind="approval"><span className="lab" style={{ color: 'var(--gold-light)' }}>Needs your approval</span><p className="say">Send Tobi the interview invitation for Friday 10:00 (his time, Lagos)? I checked: Seyi and Musa are free, Kora’s rule to include the pay band is met, and Tobi accepts email.</p>
    <div className="ds-used"><span>Kora guidelines</span><span>Calendars (3)</span><span>Tobi’s consent</span></div>
    {s === 'ask' && <div className="ds-next"><Chip go on={() => setS('sending')}>Approve and send</Chip><Chip on={() => setS('cancelled')}>Not yet</Chip></div>}
    {s === 'sending' && <p className="t14" aria-live="polite" style={{ color: 'var(--moon-2)' }}>Sending…</p>}
    {s === 'sent' && <p className="t14" aria-live="polite">Sent <span className="ds-sim">Simulated send</span> · Undo for 10 seconds</p>}
    {s === 'cancelled' && <p className="t14" aria-live="polite" style={{ color: 'var(--moon-2)' }}>Kept as a draft. Nothing was sent.</p>}
  </QLine></Thread>;
}

function Refusal() {
  return <Thread><p className="ds-me">only show me candidates under 30</p><QLine kind="refusal"><span className="lab" style={{ color: 'var(--gold-light)' }}>Declined</span><p className="say">I can’t filter by age; it isn’t related to doing the job and it’s unfair. If you’re after energy for a fast-paced role, I can look for recent experience in high-volume teams instead.</p><div className="ds-next"><Chip go>Use high-volume experience</Chip><Chip>Why not?</Chip></div><span className="ds-why">Recorded in the audit log</span></QLine></Thread>;
}

function Upload({ k }: { k: number }) {
  const s = useSteps<[number, 'up' | 'fail' | 'paused' | 'resume' | 'done']>([[0, [0, 'up']], [500, [30, 'up']], [500, [60, 'up']], [600, [60, 'fail']], [1300, [60, 'resume']], [500, [85, 'resume']], [500, [100, 'done']]], k);
  const [p, st] = s;
  const label = { up: 'Uploading', fail: 'Connection lost. Saved up to 60%.', paused: 'Paused', resume: 'Resuming from 60%', done: 'Uploaded. Waiting for the issuer to confirm.' }[st];
  return <div className="ds-sheet gs-pad"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>care-certificate.pdf</b><span className="t14 muted">{p}%</span></div>
    <div className="gs-bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress"><motion.span animate={{ width: `${p}%` }} transition={{ duration: 0.3 }} data-state={st} /></div>
    <p className="t14" aria-live="polite" style={{ margin: 0, color: st === 'fail' ? 'var(--risk)' : undefined }}>{label}</p>{st === 'done' && <span className="ds-sim">Simulated upload</span>}</div>;
}

function Offline({ k }: { k: number }) {
  const s = useSteps<'online' | 'offline' | 'queued' | 'back' | 'flushed'>([[0, 'online'], [500, 'offline'], [700, 'queued'], [1300, 'back'], [700, 'flushed']], k);
  return <Thread><div className="gs-row"><QMark mood={s === 'offline' || s === 'queued' ? 'offline' : 'idle'} size={28} /><span className="t14" aria-live="polite" style={{ color: 'var(--moon-2)' }}>{s === 'offline' || s === 'queued' ? 'Offline: Q will read your messages when you reconnect' : s === 'back' ? 'Back online. Sending what you wrote…' : 'Ready'}</span></div>
    {s !== 'online' && s !== 'offline' && <p className="ds-me">move zara to interview{s === 'queued' && <span className="t14" style={{ display: 'block', color: 'var(--moon-2)' }}>Waiting to send</span>}</p>}
    {s === 'flushed' && <QLine><p className="say">Done: Zara is now at Interview. You wrote this while offline, so I’ve checked nothing changed in the meantime.</p></QLine>}</Thread>;
}

function Denied() {
  return <div className="ds-sheet gs-pad"><span className="t14 muted">Backend Engineer (Kora Pay, via agency)</span><b>You don’t have access to this confidential role.</b><p className="t14" style={{ margin: 0 }}>Viewers at Talentbridge can’t open confidential client roles. Dele Martins (owner) can give you access.</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" className="ds-btn primary">Ask Dele for access</button><button type="button" className="ds-btn quiet">Back to roles</button></div></div>;
}

function Empty() {
  return <div className="ds-sheet gs-pad" style={{ textAlign: 'center', justifyItems: 'center' }}><QMark mood="idle" size={36} /><b>No applications yet</b><p className="t14 muted" style={{ margin: 0, maxWidth: 300 }}>When you apply, you’ll see each one here with an honest status. Q can find jobs that fit what you’ve shown so far.</p><button type="button" className="ds-btn">Find jobs with Q</button></div>;
}

function Loading({ k }: { k: number }) {
  const s = useSteps<'load' | 'ready' | 'error'>([[0, 'load'], [1100, 'error']], k);
  const [retry, setRetry] = useState(0);
  const r = useSteps<'load' | 'ready'>([[0, retry ? 'load' : 'ready'], [700, 'ready']], retry);
  const state = retry ? r : s;
  return <div className="ds-sheet gs-pad" aria-busy={state === 'load'}>{state === 'load' && <><span className="gs-skel" style={{ width: '60%' }} /><span className="gs-skel" /><span className="gs-skel" style={{ width: '80%' }} /><span className="gs-sr">Loading GitHub projects</span></>}
    {state === 'error' && <><b>GitHub isn’t responding</b><p className="t14" style={{ margin: 0 }}>Showing what we had on 27 Oct. <span className="ds-sim">Simulated outage</span></p><button type="button" className="ds-btn" onClick={() => setRetry((x) => x + 1)}>Try again</button></>}
    {state === 'ready' && <><b>3 public repositories</b><p className="t14 muted" style={{ margin: 0 }}>payments-ledger (Go) · settlement-worker (Go) · notes</p></>}</div>;
}

function Interrupted({ k }: { k: number }) {
  const [s, setS] = useState<'paused' | 'running' | 'cancelled'>('paused');
  useEffect(() => setS('paused'), [k]);
  return <Thread><QLine kind="notice"><span className="lab">Update</span><p className="say">{s === 'paused' ? 'Your “Kora backend search” stopped when the page closed, at 2 of 3 sources. Nothing was lost.' : s === 'running' ? 'Resumed from source 3 of 3. I’ll tell you when it’s done.' : 'Cancelled. The 14 people already found are kept; nothing else will run.'}</p>
    {s === 'paused' && <div className="ds-next"><Chip go on={() => setS('running')}>Resume</Chip><Chip on={() => setS('cancelled')}>Cancel it</Chip></div>}</QLine>
    <div className="gs-row"><QMark mood={s === 'running' ? 'working' : s === 'paused' ? 'waiting' : 'idle'} agents={s === 'running' ? [{ label: 'Sources', done: 2, total: 3 }] : []} size={28} /><span className="t14" style={{ color: 'var(--moon-2)' }}>{s === 'running' ? 'Working · 2 of 3' : s === 'paused' ? 'Paused' : 'Cancelled'}</span></div></Thread>;
}

function Proactive({ k }: { k: number }) {
  const [s, setS] = useState<'open' | 'why' | 'snoozed' | 'dismissed'>('open');
  useEffect(() => setS('open'), [k]);
  return <Thread><AnimatePresence>{(s === 'open' || s === 'why') && <motion.div className="ds-suggest" exit={{ opacity: 0, height: 0 }} role="note" aria-label="Q noticed"><span className="lab" style={{ color: 'var(--gold-light)' }}>Q noticed</span><p style={{ margin: 0 }}>Rivers Tech hasn’t replied to your application in 12 days.</p>
    <button type="button" className="ds-linkbtn" aria-expanded={s === 'why'} onClick={() => setS(s === 'why' ? 'open' : 'why')}>{s === 'why' ? 'Hide why' : 'Why am I seeing this?'}</button>
    {s === 'why' && <p className="t14" style={{ margin: 0, color: 'var(--moon-2)' }}>You applied on 17 Oct. Most employers reply within 10 days, and Rivers Tech isn’t verified yet.</p>}
    <div className="ds-next"><Chip go>Draft a polite follow-up</Chip><Chip on={() => setS('snoozed')}>Later</Chip><Chip on={() => setS('dismissed')}>Dismiss</Chip></div></motion.div>}</AnimatePresence>
    {s === 'snoozed' && <p className="t14" style={{ color: 'var(--moon-2)' }} aria-live="polite">Snoozed until tomorrow. You can turn suggestions down in Settings.</p>}
    {s === 'dismissed' && <p className="t14" style={{ color: 'var(--moon-2)' }} aria-live="polite">Dismissed. Q won’t raise this again unless something changes.</p>}</Thread>;
}

function Undo({ k }: { k: number }) {
  const [s, setS] = useState<'done' | 'undone'>('done');
  useEffect(() => setS('done'), [k]);
  return <Thread><p className="ds-me">move zara to rejected</p><QLine><p className="say">{s === 'done' ? 'Moved Zara to Not progressing. No message has been sent to her.' : 'Undone: Zara is back at Interview, as before.'}</p>{s === 'done' && <div className="ds-next"><Chip on={() => setS('undone')}>Undo</Chip></div>}</QLine></Thread>;
}

function Conflict() {
  return <div className="ds-sheet gs-pad"><b>Years with Go: sources disagree</b><div className="gs-conf"><span><Glyph k="partial" /> CV says <b>6 years</b> <span className="t14 muted">(self-reported, Mar 2026)</span></span><span><Glyph k="full" /> GitHub shows Go since <b>2024</b> <span className="t14 muted">(public commits)</span></span></div><p className="t14" style={{ margin: 0 }}>Q doesn’t pick one. Ask in the interview: “Tell me about the first Go service you ran in production.”</p></div>;
}

function Evidence() {
  const kinds: GlyphKind[] = ['verified', 'full', 'partial', 'practice', 'none', 'unclear'];
  return <div className="ds-sheet gs-pad"><ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>{kinds.map((g) => <li key={g} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Glyph k={g} /><span>{GLYPH_LABEL[g]}</span></li>)}</ul><p className="t14 muted" style={{ margin: 0 }}>Shape, not colour alone, carries meaning. Practice is never counted as proof.</p></div>;
}

function Moods() {
  const moods: QMood[] = ['idle', 'listening', 'thinking', 'working', 'waiting', 'blocked', 'done', 'offline'];
  return <Thread><ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>{moods.map((m) => <li key={m} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><QMark mood={m} size={28} agents={m === 'working' ? [{ label: 'a', done: 1, total: 3 }, { label: 'b', done: 2, total: 2 }] : []} /><span className="t14">{MOOD_LABEL[m]}</span></li>)}</ul></Thread>;
}


function NoResults() {
  const [widen, setWiden] = useState<'none' | 'remote' | 'drop'>('none');
  const n = widen === 'none' ? 0 : widen === 'remote' ? 4 : 7;
  return <div className="ds-sheet gs-pad"><b>{n === 0 ? 'No one matched in 3 sources' : `${n} people match now`}</b>
    <p className="t14" style={{ margin: 0 }}>{n === 0 ? 'Every profile missed the same must-have: “on-site in Lagos, 5 days a week”. Nothing is wrong with the search; the brief is narrow.' : widen === 'remote' ? 'Widened to hybrid and remote in Nigeria. The brief now says so (v2), and you can undo it.' : 'Postgres moved from must-have to nice-to-have (brief v2). Undo is one click.'}</p>
    {n === 0 ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" className="ds-btn" onClick={() => setWiden('remote')}>Allow hybrid or remote</button><button type="button" className="ds-btn quiet" onClick={() => setWiden('drop')}>Make Postgres nice-to-have</button></div>
      : <button type="button" className="ds-btn quiet" style={{ justifySelf: 'start' }} onClick={() => setWiden('none')}>Undo</button>}</div>;
}

function QChart({ k }: { k: number }) {
  // dataviz: the title states the finding; direct labels, no legend; the same data is available as a table.
  const rows = [['Applied', 46], ['Screened', 18], ['Interviewed', 7], ['Offered', 2]] as const;
  const [table, setTable] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => setTable(false), [k]);
  return <Thread><p className="ds-me">how is the support lead role doing</p><QLine><p className="say">Most people drop out before screening: 18 of 46 applicants were screened this month.</p>
    <div className="gs-chartcard"><div className="gs-charthead"><b>Customer Support Lead, October</b><button type="button" className="ds-linkbtn" aria-pressed={table} onClick={() => setTable(!table)}>{table ? 'Show chart' : 'Show as table'}</button></div>
      {table ? <table className="gs-table"><thead><tr><th scope="col">Stage</th><th scope="col">People</th></tr></thead><tbody>{rows.map(([l, v]) => <tr key={l}><td>{l}</td><td>{v}</td></tr>)}</tbody></table> : (
        <div className="gs-bars" role="img" aria-label={rows.map(([l, v]) => `${l} ${v}`).join(', ')}>{rows.map(([l, v], i) => (
          <div key={l} className="gs-barrow"><span className="l">{l}</span><motion.span className="b" initial={{ width: reduce ? `${(v / 46) * 100}%` : 0 }} animate={{ width: `${(v / 46) * 100}%` }} transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.06, ease: [0, 0, 0.2, 1] }} /><span className="v">{v}</span></div>))}</div>)}
      <span className="t14" style={{ color: 'var(--moon-2)' }}>Source: Kora’s pipeline, 1–29 Oct. Simulated data.</span></div></QLine></Thread>;
}

function FileCheck({ k }: { k: number }) {
  const s = useSteps<'scan' | 'ok' | 'blocked'>([[0, 'scan'], [1200, k % 2 ? 'blocked' : 'ok']], k);
  return <div className="ds-sheet gs-pad"><b>portfolio-kemi.zip</b>
    {s === 'scan' && <p className="t14" aria-live="polite" style={{ margin: 0 }}>Checking the file before anyone opens it…</p>}
    {s === 'ok' && <><p className="t14" aria-live="polite" style={{ margin: 0 }}>No threats found. It opens in the safe viewer: read-only, no scripts run.</p><button type="button" className="ds-btn" style={{ justifySelf: 'start' }}>Open in the safe viewer</button></>}
    {s === 'blocked' && <p className="t14" role="alert" style={{ margin: 0, color: 'var(--risk)' }}>Blocked: the archive contains a program (setup.exe). Talent Q won’t open it. Ask Kemi for a PDF or a link instead.</p>}
    <span className="ds-sim" style={{ justifySelf: "start" }}>Simulated scan</span></div>;
}

function Budget({ k }: { k: number }) {
  const s = useSteps<'run' | 'warn'>([[0, 'run'], [1400, 'warn']], k);
  const [choice, setChoice] = useState<'' | 'more' | 'stop'>('');
  useEffect(() => setChoice(''), [k]);
  return <Thread><div className="gs-row"><QMark mood={s === 'warn' && !choice ? 'waiting' : 'working'} agents={[{ label: 'Sourcing', done: s === 'run' ? 3 : 4, total: 5 }]} size={28} /><span className="t14" style={{ color: 'var(--moon-2)' }}>Sourcing · {s === 'run' ? '62' : '80'}% of the budget used</span></div>
    {s === 'warn' && <QLine kind="approval"><span className="lab" style={{ color: 'var(--gold-light)' }}>Needs your yes</span><p className="say">The Medlink search has used 80% of its ₦25,000 budget with one source left. I’ve paused it so nothing more is spent without you.</p>
      {!choice ? <div className="ds-next"><Chip go on={() => setChoice('more')}>Continue, up to ₦31,000</Chip><Chip on={() => setChoice('stop')}>Stop here and keep results</Chip></div>
        : <p className="t14" aria-live="polite" style={{ margin: 0 }}>{choice === 'more' ? 'Continuing with a new limit of ₦31,000. You’ll see the final cost when it finishes.' : 'Stopped. The 14 people found so far are kept.'} <span className="ds-sim">Simulated cost</span></p>}</QLine>}</Thread>;
}

const SPECS: Spec[] = [
  { id: 'GS-01', title: 'Thinking, working, streaming, done', covers: 'Q presence (M-01–M-04); truthful progress; streaming reply', body: (k) => <Streaming k={k} /> },
  { id: 'GS-02', title: 'Clarifying question', covers: 'Ask only what’s needed; answers reused', body: (k) => <Clarify k={k} /> },
  { id: 'GS-03', title: 'Approval before a consequential action', covers: 'Send/book/share; checks shown; simulated send; cancel', body: (k) => <Approval k={k} /> },
  { id: 'GS-04', title: 'Declined and redirected', covers: 'Fair-hiring guard; audit', body: () => <Refusal /> },
  { id: 'GS-05', title: 'Upload: progress, failure, resume', covers: 'Resumable upload; low bandwidth', body: (k) => <Upload k={k} /> },
  { id: 'GS-06', title: 'Offline, queued, reconnected', covers: 'Offline outbox; reconnect', body: (k) => <Offline k={k} /> },
  { id: 'GS-07', title: 'Permission denied', covers: 'Role permissions; tenant isolation; request access', body: () => <Denied /> },
  { id: 'GS-08', title: 'Empty state', covers: 'Empty lists with a next step', body: () => <Empty /> },
  { id: 'GS-09', title: 'Loading, failure, retry', covers: 'Provider outage; cached fallback; retry', body: (k) => <Loading k={k} /> },
  { id: 'GS-10', title: 'Interrupted, resumed, cancelled', covers: 'Long-running work survives page close', body: (k) => <Interrupted k={k} /> },
  { id: 'GS-11', title: 'Proactive suggestion: why, later, dismiss', covers: 'Initiative from real state; remembered dismissal', body: (k) => <Proactive k={k} /> },
  { id: 'GS-12', title: 'Undo', covers: 'Reversible actions', body: (k) => <Undo k={k} /> },
  { id: 'GS-13', title: 'Sources disagree', covers: 'Source conflicts shown, not resolved silently', body: () => <Conflict /> },
  { id: 'GS-14', title: 'Evidence marks', covers: 'Verification states; practice ≠ proof', body: () => <Evidence /> },
  { id: 'GS-15', title: 'Q moods', covers: 'Q presence system', body: () => <Moods /> },
  { id: 'GS-16', title: 'Search found nobody', covers: 'SC-046 search empty state; widen the brief with undo', body: () => <NoResults /> },
  { id: 'GS-17', title: 'Q answers with a chart', covers: 'SC-124 chart result, MO-031 graphic from Q; table view; source line', body: (k) => <QChart k={k} /> },
  { id: 'GS-18', title: 'File checked before opening', covers: "MO-034 download scanned; safe viewer (future capability C5). Replay alternates passed and blocked", body: (k) => <FileCheck k={k} /> },
  { id: 'GS-19', title: 'Budget nearly used', covers: 'MO-035 agent budget warning; cost approval', body: (k) => <Budget k={k} /> },
];

export function StatesGallery() {
  const [ks, setKs] = useState<Record<string, number>>({});
  const top = useRef<HTMLHeadingElement>(null);
  useEffect(() => { document.title = 'Interaction states · Talent Q'; }, []);
  return (
    <div className="ds gs">
      <header className="gs-head"><QMark mood="idle" size={36} /><div><h1 ref={top} className="voice t30" style={{ margin: 0 }}>Interaction states</h1><p className="t14 muted" style={{ margin: 0 }}>Every state the journeys can reach, live. Press Replay to run one again. <span className="ds-sim">Simulated data</span></p></div><a className="ds-btn" href="#/">Back to the prototype</a></header>
      <nav aria-label="States index" className="gs-index">{SPECS.map((s) => <a key={s.id} href={`#/gallery/states`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); }}>{s.id} {s.title}</a>)}</nav>
      <main className="gs-grid">
        {SPECS.map((s) => (
          <section key={s.id} id={s.id} className="gs-card" aria-labelledby={`${s.id}-h`}>
            <div className="gs-cardhead"><span className="gs-id">{s.id}</span><h2 id={`${s.id}-h`} className="gs-h" style={{ margin: 0 }}>{s.title}</h2><button type="button" className="ds-linkbtn" style={{ marginLeft: 'auto', color: 'var(--ink-2)' }} onClick={() => setKs({ ...ks, [s.id]: (ks[s.id] ?? 0) + 1 })} aria-label={`Replay ${s.title}`}>Replay</button></div>
            <p className="t14 muted" style={{ margin: 0 }}>{s.covers}</p>
            <div key={ks[s.id] ?? 0}>{s.body(ks[s.id] ?? 0)}</div>
          </section>
        ))}
      </main>
    </div>
  );
}
