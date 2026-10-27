// D · recruitment: find → examine evidence → compare → arrange interviews, in one continuous
// conversation. Q picks the view each step needs; every earlier view stays available, nothing resets.
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNarrow } from '../shared/hooks';
import { STRENGTH_LABEL } from '../shared/scenario';
import { Canvas, Glyph, GlyphKey, Thread, Workspace, useTimers, useWidth, type Agent, type Entry, type Version, type ViewDef } from './kit';
import { BUSY, DAYS, DEVIDENCE, HOURS, MUST_TOTAL, POOL, POOL_LARGE, REQS, ROLE_TITLE, ROW_NOTES, ROW_NOTES_SIX, RULES, SET_ASIDE, SIX, SLOTS, STAGES, mustShown, type DPerson } from './data';

type View = 'today' | 'pool' | 'evidence' | 'ledger' | 'map' | 'pair' | 'plan';
interface StageDef { key: string; ask: string; view: View; vlabel: string; agents: { label: string; total: number }[]; say: string; why: string }
const STEPS: StageDef[] = [
  { key: 'find', ask: 'Find backend engineers who have shown payments work', view: 'pool', vlabel: 'Pool',
    agents: [{ label: 'Reading profiles', total: 24 }, { label: 'Checking the basics', total: 24 }, { label: 'Looking for must-have evidence', total: 14 }],
    say: 'I read 24 profiles. Six show evidence for at least one must-have; three show all three. Each of the 18 I set aside has a reason you can check.',
    why: 'Shown as a sieve: the question is who is in, and why' },
  { key: 'evidence', ask: 'Examine their technical evidence', view: 'evidence', vlabel: 'Evidence',
    agents: [{ label: 'Opening shared evidence', total: 7 }, { label: 'Checking sources', total: 7 }, { label: 'Mapping to requirements', total: 5 }],
    say: 'Tobi’s reconciliation service is the strongest proof: a verified repository snapshot. Kunle’s case study is from 2024, so I marked it outdated, not weak.',
    why: 'Shown as cards: each item has its own source and limits' },
  { key: 'compare', ask: 'Compare the three', view: 'ledger', vlabel: 'Comparison',
    agents: [{ label: 'Weighing each requirement', total: 5 }, { label: 'Finding real differences', total: 3 }],
    say: 'Talk to Tobi first: he is the only one with verified reconciliation, the hardest part of this job. Ifeoma has the most complete record. Ask Tobi and Kunle about on-call.',
    why: 'Shown as a ledger: requirements in rows, so gaps line up' },
  { key: 'interviews', ask: 'Arrange interviews with all three', view: 'plan', vlabel: 'Interviews',
    agents: [{ label: 'Reading your calendar (simulated)', total: 5 }, { label: 'Applying your rules', total: 2 }, { label: 'Proposing times', total: 3 }],
    say: 'Three times that start after 10 and keep Tuesday 1–3 clear. Nothing is sent until you approve.',
    why: 'Shown as your week: times only make sense against your calendar' },
];
const VIEW_LABEL: Record<View, string> = { today: 'Today', pool: 'Pool', evidence: 'Evidence', ledger: 'Ledger', map: 'Map', pair: 'Pair', plan: 'Plan' };
const firstOf = (pid: string) => SIX.find((p) => p.id === pid)!.first;

function useRecruit(seed: number) {
  const later = useTimers();
  const [done, setDone] = useState(seed); // stages finished
  const [running, setRunning] = useState<number | null>(null);
  const [prog, setProg] = useState<number[]>([]);
  const [view, setViewRaw] = useState<View>(seed >= 3 ? 'ledger' : 'today');
  const [versions, setVersions] = useState<Version<View>[]>(() => STEPS.slice(0, seed).map((s, i) => ({ v: i + 1, label: s.vlabel, view: s.view })));
  const [six, setSix] = useState(false);
  const [large, setLarge] = useState(false);
  const [approved, setApproved] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(() => seedEntries(seed));
  const n = useRef(0);
  const id = () => `e${++n.current}`;
  const push = (...e: Entry[]) => setEntries((x) => [...x, ...e]);
  const patchLast = (f: (e: Entry) => Entry) => setEntries((x) => x.map((e, i) => (i === x.length - 1 ? f(e) : e)));
  const setView = (v: View) => setViewRaw(v);

  const run = useCallback((k: number, said?: string) => {
    const s = STEPS[k];
    if (!s) return;
    const agents = s.agents.map((a) => ({ ...a, done: 0 }));
    push({ id: id(), who: 'me', text: said ?? s.ask }, { id: id(), who: 'q', plan: agents, live: true });
    setRunning(k); setProg(agents.map(() => 0));
    setVersions((v) => [...v.filter((x) => x.v !== k + 1), { v: k + 1, label: s.vlabel, view: s.view }]);
    setViewRaw(s.view);
    let t = 450;
    s.agents.forEach((a, ai) => {
      const step = Math.max(70, Math.round(1500 / a.total));
      for (let i = 1; i <= a.total; i++) {
        t += step;
        later(t, () => {
          setProg((p) => p.map((x, j) => (j === ai ? i : x)));
          patchLast((e) => ({ ...e, plan: e.plan?.map((x, j) => (j === ai ? { ...x, done: i } : x)) }));
        });
      }
    });
    later(t + 250, () => {
      setRunning(null); setDone(k + 1);
      patchLast((e) => ({ ...e, live: false, text: s.say, why: s.why, preview: <Preview k={k} /> }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = (pids: string[]) => {
    setApproved((a) => {
      const next = Array.from(new Set([...a, ...pids]));
      if (next.length === 3 && a.length < 3) {
        later(120, () => { setDone(5); push({ id: id(), who: 'q', text: 'Sent. Three invitations went out and your calendar holds are placed (both simulated). I’ll tell you when someone replies or asks to move.', chips: [] }); });
      }
      return next;
    });
  };

  return { done, running, prog, view, setView, versions, six, setSix, large, setLarge, approved, approve, open, setOpen, entries, push, id, run };
}

function seedEntries(seed: number): Entry[] {
  const out: Entry[] = [{ id: 's0', who: 'q', text: 'Morning, Ada. Overnight, two candidates shared new evidence for Senior Backend and Kunle replied. Where should we start?' }];
  STEPS.slice(0, seed).forEach((s, k) => {
    out.push({ id: `s${k}m`, who: 'me', text: s.ask }, { id: `s${k}q`, who: 'q', text: s.say, why: s.why, preview: <Preview k={k} />, plan: s.agents.map((a) => ({ ...a, done: a.total })) });
  });
  return out;
}

/** A compact reference to the artifact version a reply produced. On phones it opens the canvas. */
function Preview({ k }: { k: number }) {
  const lines = ['v1 · Pool · 24 read → 14 → 6 → 3', 'v2 · Evidence · 7 items, 3 verified', 'v3 · Comparison · 3 people × 5 requirements', 'v4 · Interviews · 3 times proposed'];
  return <span className="dd-why" data-preview={k} style={{ borderStyle: 'solid' }}>{lines[k]}</span>;
}

export function DHome() { return <Recruit seed={0} />; }
export function DCompare() { return <Recruit seed={3} />; }

function Recruit({ seed }: { seed: number }) {
  const R = useRecruit(seed);
  const narrow = useNarrow(860);
  const [focus, setFocus] = useState<{ pid: string; req: string } | null>(seed >= 3 ? { pid: 'p_tobi', req: 'r1' } : null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [pair, setPair] = useState<[string, string]>(['p_tobi', 'p_ife']);
  const [mapFocus, setMapFocus] = useState<string | null>(null);
  const people = R.six ? SIX : SIX.filter((p) => p.shortlist);
  const agents: Agent[] = R.running != null ? STEPS[R.running].agents.map((a, i) => ({ ...a, done: R.prog[i] ?? 0 })) : [];

  const nextChips = (): Entry['chips'] => {
    const go = (k: number) => () => { R.run(k); if (narrow) R.setOpen(true); };
    const say = (me: string, q: string, f: () => void) => () => { R.push({ id: R.id(), who: 'me', text: me }, { id: R.id(), who: 'q', text: q }); f(); if (narrow) R.setOpen(true); };
    switch (R.done) {
      case 0: return [{ label: STEPS[0].ask, go: true, on: go(0) }, { label: 'What changed overnight?', on: say('What changed overnight?', 'Tobi shared a code review and Ifeoma shared post-mortems. Kunle replied that he’s open to a call. I’ll fold all of it into the search.', () => {}) }];
      case 1: return [{ label: STEPS[1].ask, go: true, on: go(1) }, { label: R.large ? 'Back to 24 profiles' : 'What if the pool were 240?', on: say(R.large ? 'Back to 24 profiles' : 'What if the pool were 240?', R.large ? 'Back to the 24 I actually read, one dot each.' : 'At 240, dots stop being readable, so the sieve switches to counts per stage. Same question, same answer shape.', () => { R.setLarge(!R.large); R.setView('pool'); }) }];
      case 2: return [{ label: STEPS[2].ask, go: true, on: go(2) }, { label: verifiedOnly ? 'Show all evidence' : 'Only verified evidence', on: say(verifiedOnly ? 'Show all evidence' : 'Only verified evidence', verifiedOnly ? 'Showing all seven items again.' : 'Three items are verified. The rest stay one tap away.', () => { setVerifiedOnly(!verifiedOnly); R.setView('evidence'); }) }];
      case 3: return [{ label: STEPS[3].ask, go: true, on: go(3) }, { label: R.six ? 'Back to the three' : 'Add the other three', on: say(R.six ? 'Back to the three' : 'Add the other three', R.six ? 'Back to the shortlist.' : 'Added Zara, Dayo and Musa. Each shows one or two must-haves, never all three. The ledger keeps rows fixed, so gaps still line up.', () => R.setSix(!R.six)) }, { label: 'Show how they connect', on: say('Show how they connect', 'Same evidence, drawn as links from each requirement to each person. Line style is strength: heavy is verified, dashed is partial.', () => R.setView('map')) }];
      case 4: return [{ label: 'Approve all three', go: true, on: () => R.approve(['p_tobi', 'p_ife', 'p_kunle']) }, { label: 'Open the Tobi vs Ifeoma pair', on: say('Tobi or Ifeoma, side by side', 'Tobi leads on payments and Postgres; Ifeoma on Go in production and on-call. Mentoring is undefined for both.', () => R.setView('pair')) }];
      default: return [];
    }
  };
  // Attach chips to the latest Q entry when it has none (keeps chips in sync with state).
  const entries = useMemo(() => {
    const e = [...R.entries];
    const li = e.length - 1;
    if (li >= 0 && e[li].who === 'q' && !e[li].live && e[li].chips === undefined && R.running == null) e[li] = { ...e[li], chips: nextChips() };
    if (narrow) return e.map((x) => (x.preview && x.who === 'q' ? { ...x, preview: <OpenPreview onOpen={() => { const k = Number((x.preview as { props: { k: number } }).props.k); R.setView(STEPS[k].view); R.setOpen(true); }}>{x.preview}</OpenPreview> } : x));
    return e;
  }, [R.entries, R.done, R.running, R.six, R.large, verifiedOnly, narrow]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSend = (t: string) => {
    const s = t.toLowerCase();
    if (/interview|schedul|book|calendar/.test(s) && R.done >= 3) R.run(3, t);
    else if (/compar|rank|who first|versus|vs/.test(s) && R.done >= 2) R.run(2, t);
    else if (/evidence|technical|check|proof/.test(s) && R.done >= 1) R.run(1, t);
    else if (R.done < 4) R.run(R.done, t);
    else R.push({ id: R.id(), who: 'me', text: t }, { id: R.id(), who: 'q', text: 'Noted. In this prototype I can only work through this hiring scenario; your message is not stored.' });
    if (narrow) R.setOpen(true);
  };

  const views: ViewDef<View>[] = R.done === 0 && R.running == null
    ? [{ id: 'today', label: 'Today', ready: true }]
    : [
      { id: 'pool', label: 'Pool', ready: R.done >= 1 || R.running === 0 },
      { id: 'evidence', label: 'Evidence', ready: R.done >= 2 || R.running === 1 },
      { id: 'ledger', label: 'Ledger', ready: R.done >= 3 || R.running === 2 },
      { id: 'map', label: 'Map', ready: R.done >= 3 },
      { id: 'pair', label: 'Pair', ready: R.done >= 3 },
      { id: 'plan', label: 'Plan', ready: R.done >= 4 || R.running === 3 },
    ];
  const p = (k: number) => (R.running === k ? R.prog : null); // live progress for the stage being built

  const title = R.view === 'today' ? 'Tuesday, 27 October' : `${ROLE_TITLE} · ${VIEW_LABEL[R.view] === 'Plan' ? 'interview plan' : 'shortlist'}`;
  return (
    <Workspace
      thread={<Thread title="Hiring" nav="hire" entries={entries} onSend={onSend} agents={agents} waiting={R.done === 4 && R.approved.length < 3} settled={R.done === 5} placeholder="Ask Q, or pick a next step" />}
      canvas={
        <Canvas title={title} kicker={R.view === 'today' ? 'Q · your day' : 'Artifact Q is building'} views={views} view={R.view} setView={R.setView}
          versions={R.versions} onVersion={(v) => R.setView(v.view)} building={R.running != null} open={R.open} onClose={() => R.setOpen(false)}
          qLine={R.running != null ? `Working: ${agents.find((a) => a.done < a.total)?.label ?? 'finishing'}…` : [...R.entries].reverse().find((e) => e.who === 'q' && e.text)?.text}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={R.view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
              {R.view === 'today' && <Today onStart={() => { R.run(0); if (narrow) R.setOpen(true); }} />}
              {R.view === 'pool' && <Pool prog={p(0)} large={R.large} />}
              {R.view === 'evidence' && <EvidenceView prog={p(1)} verifiedOnly={verifiedOnly} setVerifiedOnly={setVerifiedOnly} />}
              {R.view === 'ledger' && <Ledger people={people} prog={p(2)} focus={focus} setFocus={setFocus} six={R.six} setSix={R.setSix} />}
              {R.view === 'map' && <MapView people={people} focus={mapFocus} setFocus={setMapFocus} />}
              {R.view === 'pair' && <Pair people={people} pair={pair} setPair={setPair} />}
              {R.view === 'plan' && <Plan prog={p(3)} approved={R.approved} approve={R.approve} />}
            </motion.div>
          </AnimatePresence>
        </Canvas>
      }
    />
  );
}

function OpenPreview({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  return <button type="button" className="dd-chip" onClick={onOpen} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0, border: 0 }}>{children}<span aria-hidden="true">→</span><span className="sr">Open artifact</span></button>;
}

// ---------------- Today (Q home, before any request) ----------------
function Today({ onStart }: { onStart: () => void }) {
  const items = [
    { k: 'full' as const, t: 'Tobi shared a code review of a settlement retry PR', s: 'Bears on payments systems and Go. Not yet checked.' },
    { k: 'full' as const, t: 'Ifeoma shared three incident post-mortems', s: 'Bears on on-call leadership. Redacted copies.' },
    { k: 'none' as const, t: 'Kunle replied: open to a call next week', s: 'He is in Nairobi, two hours ahead.' },
  ];
  return (
    <section className="dd-sheet" aria-labelledby="today-h" style={{ display: 'grid', gap: 20, maxWidth: 760 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <span className="lab">Senior Backend Engineer · 1 open role</span>
        <h2 id="today-h" className="voice t24" style={{ margin: 0 }}>Three things changed overnight. One needs you.</h2>
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
        {items.map((x, i) => (
          <li key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 12, padding: '14px 0', borderTop: '1px solid var(--rule)' }}>
            <span style={{ color: 'var(--ink)', paddingTop: 2 }}><Glyph k={x.k} /></span>
            <div><p style={{ margin: 0, fontWeight: 600 }}>{x.t}</p><p className="t14 muted" style={{ margin: '2px 0 0' }}>{x.s}</p></div>
          </li>
        ))}
      </ol>
      <div className="dd-actions"><button type="button" className="dd-btn primary" onClick={onStart}>Find who to talk to first</button><span className="t14 muted">Q will search, check evidence and compare. You approve anything that leaves Talent Q.</span></div>
    </section>
  );
}

// ---------------- Pool: a sieve, unit dots up to 24, counts beyond ----------------
function Pool({ prog, large }: { prog: number[] | null; large: boolean }) {
  const narrow = useNarrow(860);
  const readN = prog ? prog[0] : 24, basicsN = prog ? prog[1] : 24, mustN = prog ? prog[2] : 14;
  const passedBasics = POOL.filter((x) => x.reached >= 1).map((x) => x.id);
  const at = (x: (typeof POOL)[number]) => {
    if (x.order >= readN) return -1;
    let s = 0;
    if (x.order < basicsN && x.reached >= 1) s = 1;
    if (s === 1 && passedBasics.indexOf(x.id) < mustN && x.reached >= 2) s = x.reached;
    return s;
  };
  const counts = [0, 1, 2, 3].map((k) => POOL.filter((x) => at(x) >= k).length);
  const largeCounts = [POOL_LARGE.read, POOL_LARGE.basics, POOL_LARGE.must, POOL_LARGE.all];
  return (
    <section className="dd-sheet" aria-labelledby="pool-h" style={{ display: 'grid', gap: 20 }}>
      <h2 id="pool-h" className="voice t24" style={{ margin: 0 }}>{large ? `${POOL_LARGE.all} of ${POOL_LARGE.read} would show all three must-haves.` : `${counts[3]} of 24 show all three must-haves.`}</h2>
      {large ? (
        <div style={{ display: 'grid', gap: 12 }} role="list" aria-label="Screening stages, counts">
          {STAGES.map((s, k) => (
            <div key={s.id} role="listitem" style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 180px) 1fr 48px', gap: 12, alignItems: 'center' }}>
              <span className="t14" style={{ fontWeight: 600 }}>{s.label}</span>
              <span style={{ height: 14, background: 'var(--wash)', borderRadius: 3, position: 'relative' }}><motion.span initial={{ width: 0 }} animate={{ width: `${(largeCounts[k] / POOL_LARGE.read) * 100}%` }} transition={{ duration: 0.4, delay: k * 0.06, ease: 'easeOut' }} style={{ position: 'absolute', inset: 0, right: 'auto', background: k === 3 ? 'var(--gold)' : 'var(--ink-2)', borderRadius: 3 }} /></span>
              <span className="num" style={{ fontFamily: 'var(--data)', textAlign: 'right' }}>{largeCounts[k]}</span>
            </div>
          ))}
          <p className="t14 muted" style={{ margin: 0 }}>Above 60 profiles the sieve shows counts, not dots. Illustrative: in this prototype Q only reads the 24.</p>
        </div>
      ) : (
        <div className="dd-sieve" style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {STAGES.map((s, k) => (
            <div key={s.id} style={{ display: 'grid', gap: 10, alignContent: 'start', gridTemplateColumns: narrow ? '128px 1fr' : undefined, alignItems: narrow ? 'center' : undefined, padding: '12px 10px', borderRadius: 12, background: k === 3 ? 'var(--gold-wash)' : 'var(--paper)', minWidth: 0 }}>
              <div style={{ display: 'grid', gap: 2 }}>
                <span className="num" style={{ fontFamily: 'var(--data)', fontSize: 24, lineHeight: 1 }}>{counts[k]}</span>
                <span className="t14" style={{ fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} aria-hidden="true">
                {POOL.filter((x) => at(x) === k).map((x) => (
                  <motion.span key={x.id} layoutId={`pool-${x.id}`} transition={{ duration: 0.36, ease: [0.2, 0.7, 0.2, 1] }}
                    style={{ width: 14, height: 14, borderRadius: '50%', background: k === 3 ? 'var(--gold)' : k === 0 ? 'transparent' : 'var(--ink-2)', border: `1.5px solid ${k === 3 ? 'var(--gold-ink)' : 'var(--ink-2)'}` }} />
                ))}
              </div>
              <span className="t14 muted" style={{ gridColumn: narrow ? '1 / -1' : undefined }}>{k === 3 ? 'Shortlist' : `${POOL.filter((x) => at(x) === k).length} stopped here`}</span>
            </div>
          ))}
        </div>
      )}
      {!large && (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 32 }}>Why 18 were set aside</summary>
          <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid' }}>
            {SET_ASIDE.map((r) => <li key={r.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 8, padding: '8px 0', borderTop: '1px solid var(--rule)' }}><span className="num" style={{ fontFamily: 'var(--data)' }}>{r.n}</span><span>{r.label} <span className="muted t14">· after “{STAGES[r.stage].label}”</span></span></li>)}
          </ul>
        </details>
      )}
      <p className="t14 muted" style={{ margin: 0 }}>Shortlist: {POOL.filter((x) => x.reached === 3).map((x) => x.name).join(', ')}. Also reached evidence: Zara Mensah, Dayo Lawal, Musa Danjuma.</p>
    </section>
  );
}

// ---------------- Evidence cards, grouped by person, statuses resolve as Q checks ----------------
function EvidenceView({ prog, verifiedOnly, setVerifiedOnly }: { prog: number[] | null; verifiedOnly: boolean; setVerifiedOnly: (v: boolean) => void }) {
  const opened = prog ? prog[0] : 99, checked = prog ? prog[1] : 99;
  const items = DEVIDENCE.filter((e) => ['p_tobi', 'p_ife', 'p_kunle'].includes(e.owner)).slice(0, opened);
  const shown = verifiedOnly ? items.filter((e, i) => i < checked && e.outcome === 'verified') : items;
  const groups = ['p_tobi', 'p_ife', 'p_kunle'].map((pid) => ({ pid, list: shown.filter((e) => e.owner === pid) })).filter((g) => g.list.length);
  return (
    <section className="dd-sheet" aria-labelledby="ev-h" style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 id="ev-h" className="voice t24" style={{ margin: 0 }}>{prog ? `Checking ${Math.min(checked, items.length)} of ${items.length}…` : 'Seven items. Three are verified at source.'}</h2>
        <button type="button" className="dd-filter" aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)}>Verified only</button>
      </div>
      {groups.map((g) => (
        <div key={g.pid} style={{ display: 'grid', gap: 10 }}>
          <h3 className="lab" style={{ margin: 0 }}>{SIX.find((p) => p.id === g.pid)!.name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
            {g.list.map((e) => {
              const idx = items.indexOf(e);
              const st = idx < checked ? e.outcome : 'checking';
              return (
                <motion.article key={e.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ border: '1px solid var(--rule)', borderRadius: 14, padding: 16, display: 'grid', gap: 10, alignContent: 'start', background: 'var(--sheet)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <span className="lab">{e.kind}</span>
                    <span className="dd-tag" data-k={st}>{st === 'checking' ? 'Checking…' : st === 'verified' ? 'Verified at source' : st === 'outdated' ? 'Outdated (2024)' : 'Self-reported'}</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 17, lineHeight: 1.3 }}>{e.title}</h4>
                  <p className="dd-quote">{e.shows}</p>
                  <p className="t14" style={{ margin: 0 }}><span className="muted">Limits: </span>{e.limits}</p>
                  <p className="t14 muted" style={{ margin: 0 }}>{e.source} · {e.reqs.map((r) => REQS.find((x) => x.reqId === r)!.label).join(', ')}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

// ---------------- Ledger: rows are requirements (fixed), columns are people (grow) ----------------
function Ledger({ people, prog, focus, setFocus, six, setSix }: { people: DPerson[]; prog: number[] | null; focus: { pid: string; req: string } | null; setFocus: (f: { pid: string; req: string } | null) => void; six: boolean; setSix: (v: boolean) => void }) {
  const rows = prog ? prog[0] : REQS.length;
  const fp = focus && people.find((p) => p.id === focus.pid);
  const fi = focus ? REQS.findIndex((r) => r.reqId === focus.req) : -1;
  return (
    <section className="dd-sheet" aria-labelledby="led-h" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 id="led-h" className="voice t24" style={{ margin: 0, maxWidth: '32ch' }}>Tobi is the only one who has shown the hardest requirement, verified.</h2>
        <button type="button" className="dd-filter" aria-pressed={six} onClick={() => setSix(!six)}>{six ? 'Showing 6 people' : 'Show all 6 who reached evidence'}</button>
      </div>
      <GlyphKey kinds={['verified', 'full', 'partial', 'none', 'unclear']} />
      <div className="dd-ledger-wrap">
        <table className="dd-ledger">
          <caption className="sr">Evidence by requirement and person. Select a mark to see the evidence.</caption>
          <thead><tr><th scope="col">Requirement</th>{people.map((p) => <th key={p.id} scope="col" style={{ textAlign: 'center', minWidth: 76 }}><span style={{ display: 'block' }}>{p.first}</span><span className="num t14 muted" style={{ fontWeight: 400 }}>{mustShown(p)}/{MUST_TOTAL} must</span></th>)}<th scope="col" className="hide-narrow" style={{ minWidth: 220 }}><span className="sr">Q’s note</span></th></tr></thead>
          <tbody>
            {REQS.map((r, ri) => (
              <tr key={r.reqId}>
                <th scope="row"><span style={{ display: 'block' }}>{r.label}</span><span className="t14 muted">{r.mustHave ? 'Must-have' : 'Nice to have'}</span></th>
                {people.map((p) => {
                  const k = p.states[ri];
                  const sel = focus?.pid === p.id && focus.req === r.reqId;
                  return (
                    <td key={p.id} style={{ textAlign: 'center' }}>
                      {ri < rows ? (
                        <motion.button type="button" className="dd-cell" aria-pressed={sel} aria-label={`${p.first}, ${r.label}: ${STRENGTH_LABEL[k]}`} onClick={() => setFocus(sel ? null : { pid: p.id, req: r.reqId })}
                          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
                          <Glyph k={k} size={22} />
                        </motion.button>
                      ) : <span aria-hidden="true" style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', background: 'var(--wash)' }} />}
                    </td>
                  );
                })}
                <td className="hide-narrow">{ri < rows && <span className="dd-note">{(six ? ROW_NOTES_SIX : ROW_NOTES)[r.reqId]}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AnimatePresence initial={false}>
        {fp && fi >= 0 && (
          <motion.div key={`${fp.id}-${fi}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24 }} style={{ overflow: 'hidden' }}>
            <CellDetail p={fp} ri={fi} onClose={() => setFocus(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CellDetail({ p, ri, onClose }: { p: DPerson; ri: number; onClose: () => void }) {
  const r = REQS[ri];
  const ev = DEVIDENCE.filter((e) => e.owner === p.id && e.reqs.includes(r.reqId));
  const k = p.states[ri];
  return (
    <div style={{ border: '1px solid var(--rule-2)', borderRadius: 14, padding: 16, display: 'grid', gap: 10, background: 'var(--paper)' }} aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 17, display: 'flex', gap: 8, alignItems: 'center' }}><Glyph k={k} />{p.first} · {r.label}: {STRENGTH_LABEL[k]}</h3>
        <button type="button" className="dd-btn quiet" onClick={onClose}>Close</button>
      </div>
      <p style={{ margin: 0 }}>{p.notes[ri]}.</p>
      {ev.map((e) => <div key={e.id} style={{ display: 'grid', gap: 4 }}><p className="dd-quote">{e.shows}</p><p className="t14 muted" style={{ margin: 0 }}>{e.title} · {e.source} · Limits: {e.limits}</p></div>)}
      {!ev.length && <p className="dd-note" style={{ margin: 0 }}>Nothing shared for this yet. Ask: “Tell me about a time you {r.reqId === 'r4' ? 'led an incident from page to post-mortem' : `worked on ${r.label.toLowerCase()}`}.”</p>}
    </div>
  );
}

// ---------------- Map: requirement → person links; line style carries strength ----------------
const EDGE: Record<string, { w: number; dash?: string; o: number }> = { verified: { w: 3.5, o: 1 }, full: { w: 2, o: 0.9 }, partial: { w: 1.6, dash: '6 5', o: 0.9 }, unclear: { w: 1.4, dash: '1 5', o: 0.7 } };
function MapView({ people, focus, setFocus }: { people: DPerson[]; focus: string | null; setFocus: (f: string | null) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>(700);
  const narrow = w < 520;
  const H = Math.max(REQS.length, people.length) * (narrow ? 64 : 72) + 40;
  const lx = narrow ? 8 : 24, rx = w - (narrow ? 96 : 180);
  const ly = (i: number) => 40 + i * ((H - 60) / (REQS.length - 1));
  const py = (i: number) => (people.length === 1 ? H / 2 : 40 + i * ((H - 60) / (people.length - 1)));
  const lw = narrow ? 128 : 190;
  return (
    <section className="dd-sheet" aria-labelledby="map-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="map-h" className="voice t24" style={{ margin: 0 }}>{focus ? `${people.find((p) => p.id === focus)?.first}’s links to each requirement` : 'Only one heavy line reaches payments systems.'}</h2>
      <EdgeKey />
      <p className="t14 muted" style={{ margin: 0 }}>No line means not shown yet. Select a person to isolate their links; the Ledger has the same data as a table.</p>
      <div ref={ref} style={{ minWidth: 0 }}>
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Evidence links between requirements and people">
          {people.map((p, pi) => REQS.map((r, ri) => {
            const k = p.states[ri]; const e = EDGE[k];
            if (!e) return null;
            const x1 = lx + lw, y1 = ly(ri), x2 = rx - 17, y2 = py(pi), mx = (x1 + x2) / 2;
            const dim = focus && focus !== p.id;
            return <motion.path key={`${p.id}${r.reqId}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={k === 'verified' ? 'var(--gold-ink)' : 'var(--ink-2)'} strokeWidth={e.w} strokeDasharray={e.dash} strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1, opacity: dim ? 0.12 : e.o }} transition={{ duration: 0.45, delay: pi * 0.05, ease: 'easeOut' }} />;
          }))}
          {REQS.map((r, ri) => (
            <g key={r.reqId}>
              <text x={lx} y={ly(ri) - 2} fontSize={narrow ? 13 : 15} fontWeight={600} fill="var(--ink)">{narrow ? r.label.replace(' systems', '').replace(' in production', '').replace(' at scale', '') : r.label}</text>
              <text x={lx} y={ly(ri) + 15} fontSize={12} fill="var(--ink-3)" fontFamily="var(--data)">{r.mustHave ? 'MUST' : 'NICE'} · {people.filter((p) => ['verified', 'full'].includes(p.states[ri])).length}/{people.length} shown</text>
              <circle cx={lx + lw} cy={ly(ri)} r={4} fill="var(--ink)" />
            </g>
          ))}
          {people.map((p, pi) => (
            <g key={p.id} className="dd-node" role="button" tabIndex={0} aria-pressed={focus === p.id} aria-label={`${p.name}: ${mustShown(p)} of ${MUST_TOTAL} must-haves shown`}
              onClick={() => setFocus(focus === p.id ? null : p.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus(focus === p.id ? null : p.id); } }}>
              <rect x={rx - 14} y={py(pi) - 22} width={w - rx + 12} height={44} fill="transparent" />
              <circle className="ring" cx={rx} cy={py(pi)} r={16} fill={focus === p.id ? 'var(--gold-wash)' : 'var(--sheet)'} stroke="var(--ink)" strokeWidth={1.5} />
              <text x={rx} y={py(pi) + 4} fontSize={10.5} textAnchor="middle" fontFamily="var(--data)" fill="var(--ink)">{mustShown(p)}/{MUST_TOTAL}</text>
              <text x={rx + 24} y={py(pi) + 5} fontSize={narrow ? 14 : 15} fontWeight={600} fill="var(--ink)">{narrow ? p.first : p.name}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function EdgeKey() {
  const items: [string, string][] = [['verified', 'Verified'], ['full', 'Evidenced'], ['partial', 'Partial or outdated'], ['unclear', 'Unclear']];
  return (
    <ul aria-label="Line key" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map(([k, l]) => <li key={k} className="t14" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)' }}><svg width="28" height="10" aria-hidden="true"><line x1="2" y1="5" x2="26" y2="5" stroke={k === 'verified' ? 'var(--gold-ink)' : 'var(--ink-2)'} strokeWidth={EDGE[k].w} strokeDasharray={EDGE[k].dash} strokeLinecap="round" /></svg>{l}</li>)}
    </ul>
  );
}

// ---------------- Pair: two people, row by row, the difference named ----------------
function Pair({ people, pair, setPair }: { people: DPerson[]; pair: [string, string]; setPair: (p: [string, string]) => void }) {
  const narrow = useNarrow(860);
  const [a, b] = pair.map((id) => people.find((p) => p.id === id) ?? people[0]);
  const score = { verified: 3, full: 2, partial: 1, none: 0, unclear: 0 } as const;
  return (
    <section className="dd-sheet" aria-labelledby="pair-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="pair-h" className="voice t24" style={{ margin: 0 }}>{a.first} and {b.first}: where they differ</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[0, 1].map((side) => (
          <div key={side} role="group" aria-label={side ? 'Right person' : 'Left person'} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: side ? 'flex-end' : 'flex-start' }}>
            {people.map((p) => <button key={p.id} type="button" className="dd-filter" aria-pressed={pair[side] === p.id} disabled={pair[1 - side] === p.id} onClick={() => setPair(side ? [pair[0], p.id] : [p.id, pair[1]])}>{p.first}</button>)}
          </div>
        ))}
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {REQS.map((r, i) => {
          const d = score[a.states[i]] - score[b.states[i]];
          return (
            <li key={r.reqId} style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr minmax(96px, auto) 1fr', gap: narrow ? '6px 12px' : 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--rule)' }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontWeight: d > 0 ? 600 : 400, order: narrow ? 2 : undefined }}><Glyph k={a.states[i]} title={STRENGTH_LABEL[a.states[i]]} /><span className="t14">{a.notes[i]}</span></span>
              <span style={{ textAlign: narrow ? 'left' : 'center', display: narrow ? 'flex' : 'grid', justifyContent: 'space-between', gridColumn: narrow ? '1 / -1' : undefined, order: narrow ? 1 : undefined }}><span style={{ fontWeight: 600 }}>{r.label}</span><span className="lab" style={{ color: d ? 'var(--gold-ink)' : undefined }}>{d > 0 ? `← ${a.first}` : d < 0 ? `${b.first} →` : 'Even'}</span></span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'right', fontWeight: d < 0 ? 600 : 400, order: narrow ? 3 : undefined }}><span className="t14">{b.notes[i]}</span><Glyph k={b.states[i]} title={STRENGTH_LABEL[b.states[i]]} /></span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------- Plan: your week, your rules, Q's proposed times ----------------
function Plan({ prog, approved, approve }: { prog: number[] | null; approved: string[]; approve: (p: string[]) => void }) {
  const narrow = useNarrow(860);
  const shownSlots = SLOTS.slice(0, prog ? prog[2] : 3);
  const rulesOn = !prog || prog[1] > 0;
  const top = (h: number) => `${((h - 9) / 8) * 100}%`;
  const hgt = (s: number, e: number) => `${((e - s) / 8) * 100}%`;
  return (
    <section className="dd-sheet" aria-labelledby="plan-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="plan-h" className="voice t24" style={{ margin: 0 }}>{approved.length === 3 ? 'All three invited. Holds placed (simulated).' : `Three interviews fit your week without breaking a rule.`}</h2>
      {!narrow && <ul aria-label="Calendar key" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', listStyle: 'none', margin: 0, padding: 0 }} className="t14">
        <li style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span aria-hidden="true" style={{ width: 22, height: 14, borderRadius: 3, border: '1px dashed var(--gold-ink)', background: 'repeating-linear-gradient(135deg, transparent 0 4px, rgb(122 90 23 / .18) 4px 6px)' }} />Your rules: no calls before 10 · Tuesday 1–3 kept clear</li>
        <li style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span aria-hidden="true" style={{ width: 22, height: 14, borderRadius: 3, background: 'var(--wash)', border: '1px solid var(--rule-2)' }} />Busy (simulated calendar)</li>
        <li style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span aria-hidden="true" style={{ width: 22, height: 14, borderRadius: 3, background: 'var(--gold-wash)', border: '1.5px dashed var(--gold-ink)' }} />Proposed by Q</li>
      </ul>}
      {!narrow && (
        <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(5, minmax(0, 1fr))', gap: 6 }}>
          <span />
          {DAYS.map((d) => <span key={d} className="lab" style={{ textAlign: 'center' }}>{d}</span>)}
          <div style={{ position: 'relative', height: 400 }} aria-hidden="true">
            {HOURS.map((h) => <span key={h} className="num" style={{ position: 'absolute', top: top(h), fontFamily: 'var(--data)', fontSize: 12, color: 'var(--ink-3)', transform: 'translateY(-50%)' }}>{h}:00</span>)}
          </div>
          {DAYS.map((d, di) => (
            <div key={d} style={{ position: 'relative', height: 400, background: 'var(--paper)', borderRadius: 10, overflow: 'hidden' }}>
              {HOURS.map((h) => <span key={h} style={{ position: 'absolute', left: 0, right: 0, top: top(h), borderTop: '1px solid var(--rule)' }} />)}
              {rulesOn && RULES.filter((r) => r.d === -1 || r.d === di).map((r, i) => (
                <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: top(r.s), height: hgt(r.s, r.e), background: 'repeating-linear-gradient(135deg, transparent 0 6px, rgb(122 90 23 / .14) 6px 8px)', borderTop: '1px dashed var(--gold-ink)', borderBottom: '1px dashed var(--gold-ink)', fontSize: 12, color: 'var(--gold-ink)', padding: '2px 6px' }}>{r.d === di ? r.l : ''}</motion.span>
              ))}
              {BUSY.filter((b) => b.d === di).map((b, i) => <span key={i} style={{ position: 'absolute', left: 4, right: 4, top: top(b.s), height: hgt(b.s, b.e), background: 'var(--wash)', border: '1px solid var(--rule-2)', borderRadius: 6, fontSize: 12, padding: '2px 6px', color: 'var(--ink-2)', overflow: 'hidden' }}>{b.l}</span>)}
              {shownSlots.filter((s) => s.d === di).map((s) => {
                const ok = approved.includes(s.pid);
                return (
                  <motion.span key={s.pid} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{ position: 'absolute', left: 4, right: 4, top: top(s.s), height: hgt(s.s, s.e), background: ok ? 'var(--ink)' : 'var(--gold-wash)', color: ok ? 'var(--paper)' : 'var(--ink)', border: `1.5px ${ok ? 'solid' : 'dashed'} var(--gold-ink)`, borderRadius: 6, fontSize: 13, padding: '4px 8px', fontWeight: 600 }}>
                    {firstOf(s.pid)} · {s.s}:00{ok ? ' ✓' : ''}
                  </motion.span>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
        {shownSlots.map((s) => {
          const ok = approved.includes(s.pid);
          return (
            <li key={s.pid} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--rule)' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{SIX.find((p) => p.id === s.pid)!.name} · {DAYS[s.d]}, {s.s}:00–{s.e}:00</p>
                <p className="t14 muted" style={{ margin: '2px 0 0' }}>{s.why}</p>
              </div>
              {ok ? <span className="dd-tag" data-k="verified">Sent (simulated)</span> : <button type="button" className="dd-btn" onClick={() => approve([s.pid])}>Approve</button>}
            </li>
          );
        })}
      </ul>
      {shownSlots.length === 3 && approved.length < 3 && (
        <div className="dd-actions"><button type="button" className="dd-btn primary" onClick={() => approve(SLOTS.map((s) => s.pid))}>Approve and send all three</button><span className="t14 muted">Simulated: no email is sent and no calendar is written.</span></div>
      )}
    </section>
  );
}
