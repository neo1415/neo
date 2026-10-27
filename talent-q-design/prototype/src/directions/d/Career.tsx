// D · J7 career atlas. Distance from "you" is the number of competencies an occupation needs that you
// have not yet SHOWN. Practice never moves the map; only assessed or verified evidence does, and every
// change is written to the development record with its class, its reason and what it does not prove.
import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNarrow } from '../shared/hooks';
import { COACH_FEEDBACK, COACH_OPTIONS, COACH_Q } from '../shared/scenario';
import { Canvas, Glyph, GlyphKey, GLYPH_LABEL, Thread, Workspace, useTimers, useWidth, type Agent, type Entry, type ViewDef } from './kit';
import { COMPS, FAMILIES, OCCS, OCCS_EXTRA, compById, gapsOf, shown, type CState, type Family, type Occ } from './data';

type View = 'atlas' | 'list' | 'role' | 'record';
interface Rec { id: string; at: string; comp: string; cls: 'Practice attempt' | 'Work sample submitted' | 'Assessed by rubric and reviewer' | 'Verified credential'; why: string; not: string; moved?: string }
const CLS_GLYPH: Record<Rec['cls'], CState> = { 'Practice attempt': 'practice', 'Work sample submitted': 'partial', 'Assessed by rubric and reviewer': 'full', 'Verified credential': 'verified' };
const LADDER: { cls: Rec['cls']; counts: string }[] = [
  { cls: 'Practice attempt', counts: 'Private. Never counts as proof; the map does not move.' },
  { cls: 'Work sample submitted', counts: 'Counts as partial until someone reviews it.' },
  { cls: 'Assessed by rubric and reviewer', counts: 'Counts as evidenced. The map moves.' },
  { cls: 'Verified credential', counts: 'Issuer confirmed. Counts as verified.' },
];
const SEED_RECORD: Rec[] = [
  { id: 'r3', at: '16 Oct', comp: 'sheets', cls: 'Verified credential', why: 'The course issuer confirmed your certificate (simulated).', not: 'Modelling real business data at work.' },
  { id: 'r2', at: '9 Oct', comp: 'story', cls: 'Assessed by rubric and reviewer', why: 'A reviewer scored your market-prices dashboard 3 of 4 on decision clarity.', not: 'That a team used it to decide.' },
  { id: 'r1', at: '2 Oct', comp: 'writing', cls: 'Work sample submitted', why: 'Your 2024 thesis summary. Counted as partial: unreviewed and outdated.', not: 'Writing a product memo.' },
];
const RUBRIC = [
  { c: 'Uses LAG over a per-user window', ok: true },
  { c: 'Orders sessions by start time', ok: true },
  { c: 'Handles users with one session', ok: false },
  { c: 'Explains what the number means', ok: true },
];

export function DCareer() {
  const later = useTimers();
  const narrow = useNarrow(860);
  const [states, setStates] = useState<Record<string, CState>>(() => Object.fromEntries(COMPS.map((c) => [c.id, c.state])));
  const st = (id: string) => states[id];
  const [view, setView] = useState<View>('atlas');
  const [occ, setOcc] = useState<string | null>(null);
  const [reach, setReach] = useState(false);
  const [large, setLarge] = useState(false);
  const [openFam, setOpenFam] = useState<Family | null>(null);
  const [comp, setComp] = useState<string | null>(null);
  const [practising, setPractising] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [sample, setSample] = useState<'none' | 'running' | 'assessed'>('none');
  const [rubric, setRubric] = useState(0);
  const [record, setRecord] = useState<Rec[]>(SEED_RECORD);
  const [moved, setMoved] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const n = useRef(0);
  const id = () => `c${++n.current}`;
  const [entries, setEntries] = useState<Entry[]>([{ id: 'c0', who: 'q', text: 'Morning, Amaka. This is your atlas: 14 occupations in five families. The closer one sits to you, the fewer competencies you still need to show.', why: 'Shown as an atlas: distance is what you still need to show' }]);
  const push = (...e: Entry[]) => setEntries((x) => [...x, ...e]);
  const patchLast = (f: (e: Entry) => Entry) => setEntries((x) => x.map((e, i) => (i === x.length - 1 ? f(e) : e)));
  const show = (v: View) => { setView(v); if (narrow) setOpen(true); };

  const occs = large ? [...OCCS, ...OCCS_EXTRA] : OCCS;
  const verdict = pick ? COACH_OPTIONS.find((o) => o.id === pick)!.verdict : null;

  const openRole = (oid: string, said?: string) => {
    const o = occs.find((x) => x.id === oid)!;
    const g = gapsOf(o, st);
    setOcc(oid); setComp(null); show('role');
    push({ id: id(), who: 'me', text: said ?? `Open ${o.label}` }, { id: id(), who: 'q', text: `${o.label} needs ${o.needs.length} competencies. You’ve shown ${o.needs.length - g.length}. ${g.includes('sql') ? 'SQL window functions is the one most asked for, and you haven’t shown it yet.' : g.length ? `Still to show: ${g.map((x) => compById(x).label).join(', ')}.` : 'You’ve shown all of them.'}`, why: 'Shown as a role sheet: each competency with its evidence' });
  };
  const startPractice = () => {
    setOcc('pa'); setPractising(true); setPick(null); show('role');
    push({ id: id(), who: 'me', text: 'Practise SQL' }, { id: id(), who: 'q', text: 'One question, about the technique Product Analyst listings ask for. It’s private, and it can’t count against you or for you.' });
  };
  const answer = (o: string) => {
    if (pick) return;
    setPick(o);
    const v = COACH_OPTIONS.find((x) => x.id === o)!.verdict;
    setRecord((r) => [{ id: id(), at: '27 Oct', comp: 'sql', cls: 'Practice attempt', why: v === 'right' ? 'Chose the window-function approach on one practice question.' : 'Attempted one practice question; not the right technique yet.', not: 'That you can write or use this at work. Practice is not proof.' }, ...r]);
    if (st('sql') === 'none') setStates((s) => ({ ...s, sql: 'practice' }));
    push({ id: id(), who: 'q', text: v === 'right' ? 'Right technique. I’ve logged a practice attempt in your record: private, and not proof of competence, so your map stays where it is. To change it, submit a short work sample for review.' : `${COACH_FEEDBACK[v].text} Logged privately as practice.` });
  };
  const submit = () => {
    setSample('running'); setRubric(0); show('role');
    const plan = [{ label: 'Receiving your notebook (simulated)', done: 0, total: 1 }, { label: 'Checking against the rubric', done: 0, total: 4 }, { label: 'Reviewer sign-off (simulated)', done: 0, total: 1 }];
    setAgents(plan);
    push({ id: id(), who: 'me', text: 'Submit my cohort-retention notebook' }, { id: id(), who: 'q', plan, live: true });
    const tick = (ai: number, d: number, t: number) => later(t, () => {
      setAgents((a) => a.map((x, j) => (j === ai ? { ...x, done: d } : x)));
      patchLast((e) => ({ ...e, plan: e.plan?.map((x, j) => (j === ai ? { ...x, done: d } : x)) }));
      if (ai === 1) setRubric(d);
    });
    tick(0, 1, 600); [1, 2, 3, 4].forEach((d) => tick(1, d, 600 + d * 520)); tick(2, 1, 3400);
    later(3800, () => {
      const before = Object.fromEntries(occs.map((o) => [o.id, gapsOf(o, st).length]));
      setStates((s) => ({ ...s, sql: 'full' }));
      setMoved(Object.fromEntries(occs.filter((o) => o.needs.includes('sql')).map((o) => [o.id, before[o.id]])));
      setSample('assessed'); setAgents([]); setView('atlas'); setOcc('pa');
      setRecord((r) => [{ id: id(), at: '27 Oct', comp: 'sql', cls: 'Assessed by rubric and reviewer', why: 'Notebook scored level 2 of 4: three of four rubric criteria met; reviewer signed off (simulated).', not: 'Level 3 or above, or SQL on production-sized data.', moved: `${OCCS.filter((o) => o.needs.includes('sql')).length} occupations moved one ring closer` }, ...r]);
      patchLast((e) => ({ ...e, live: false, text: 'Assessed: level 2 of 4. SQL now counts as evidenced, so the map moved. Product Analyst went from 3 gaps to 2; Junior Data Analyst now has none. The reason is in your record.', why: 'Back to the atlas: this change moves you' }));
    });
  };

  const chips = (): Entry['chips'] => {
    if (sample === 'running') return [];
    if (sample === 'assessed') return [{ label: 'Show my record', go: true, on: () => { push({ id: id(), who: 'me', text: 'Show my record' }, { id: id(), who: 'q', text: 'Newest first. Each change shows its class of evidence, why it counted, and what it doesn’t prove.' }); show('record'); } }, { label: 'Back to Product Analyst', on: () => openRole('pa', 'Back to Product Analyst') }];
    if (practising && verdict === 'right') return [{ label: 'Submit a work sample', go: true, on: submit }, { label: 'Show my record', on: () => show('record') }];
    if (practising && verdict) return [{ label: 'Try again', go: true, on: () => setPick(null) }];
    if (practising) return [];
    if (occ === 'pa') return [{ label: 'Practise SQL', go: true, on: startPractice }, { label: 'Review my evidence', on: () => { setComp('story'); push({ id: id(), who: 'me', text: 'Review my evidence' }, { id: id(), who: 'q', text: 'Each item says what it proves and what it doesn’t. Your writing sample is from 2024 and unreviewed, so it counts as partial.' }); show('role'); } }];
    return [
      { label: 'Open Product Analyst', go: true, on: () => openRole('pa') },
      { label: reach ? 'Show every occupation' : 'What’s within reach?', on: () => { setReach(!reach); push({ id: id(), who: 'me', text: reach ? 'Show every occupation' : 'What’s within reach?' }, { id: id(), who: 'q', text: reach ? 'All 14 again.' : `${occs.filter((o) => gapsOf(o, st).length <= 2).length} occupations are two gaps or fewer away. The rest stay on the map, faded.` }); show('atlas'); } },
      { label: large ? 'Back to 14' : 'Show 48 occupations', on: () => { setLarge(!large); setOpenFam(null); push({ id: id(), who: 'me', text: large ? 'Back to 14' : 'Show 48 occupations' }, { id: id(), who: 'q', text: large ? 'Back to the 14 nearest your goal.' : 'At 48, I group each family into one point at its nearest occupation. Open a family to see its roles. The 34 extra roles are illustrative.' }); show('atlas'); } },
    ];
  };
  const shownEntries = useMemo(() => entries.map((e, i) => (i === entries.length - 1 && e.who === 'q' && !e.live ? { ...e, chips: chips() } : e)),
    [entries, practising, verdict, sample, occ, reach, large, states]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSend = (t: string) => {
    const s = t.toLowerCase();
    if (/practi|sql|quiz/.test(s)) startPractice();
    else if (/submit|sample|review my work/.test(s) && verdict === 'right') submit();
    else if (/record|history/.test(s)) { push({ id: id(), who: 'me', text: t }, { id: id(), who: 'q', text: 'Here is your record.' }); show('record'); }
    else if (/reach|close|near/.test(s)) { setReach(true); push({ id: id(), who: 'me', text: t }, { id: id(), who: 'q', text: 'Showing occupations two gaps or fewer away.' }); show('atlas'); }
    else { const o = occs.find((x) => s.includes(x.label.toLowerCase())); if (o) openRole(o.id, t); else push({ id: id(), who: 'me', text: t }, { id: id(), who: 'q', text: 'In this prototype I can open an occupation by name, show what’s within reach, run SQL practice or show your record. Your message is not stored.' }); }
  };

  const views: ViewDef<View>[] = [{ id: 'atlas', label: 'Atlas', ready: true }, { id: 'list', label: 'List', ready: true }, { id: 'role', label: occ ? occs.find((o) => o.id === occ)!.short : 'Role', ready: !!occ }, { id: 'record', label: 'Record', ready: true }];
  const shownCount = COMPS.filter((c) => shown(st(c.id))).length;
  return (
    <Workspace
      thread={<Thread title="Career" nav="career" entries={shownEntries} onSend={onSend} agents={agents} settled={sample === 'assessed'} placeholder="Ask about a role, or practise" />}
      canvas={
        <Canvas title={view === 'record' ? 'Development record' : view === 'role' && occ ? occs.find((o) => o.id === occ)!.label : 'Your career atlas'} kicker={`Amaka · goal: Product Analyst · ${shownCount} of ${COMPS.length} competencies shown`}
          views={views} view={view} setView={setView} versions={[]} onVersion={() => {}} building={sample === 'running'} open={open} onClose={() => setOpen(false)}
          qLine={sample === 'running' ? `Working: ${agents.find((a) => a.done < a.total)?.label ?? 'finishing'}…` : [...entries].reverse().find((e) => e.who === 'q' && e.text)?.text}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
              {view === 'atlas' && <Atlas occs={occs} st={st} sel={occ} onSel={(o) => openRole(o)} reach={reach} setReach={setReach} large={large} openFam={openFam} setOpenFam={setOpenFam} moved={moved} />}
              {view === 'list' && <OccList occs={occs} st={st} reach={reach} onSel={(o) => openRole(o)} />}
              {view === 'role' && occ && <Role o={occs.find((x) => x.id === occ)!} st={st} comp={comp} setComp={setComp} practising={practising} pick={pick} answer={answer} onPractise={startPractice} sample={sample} rubric={rubric} onSubmit={submit} />}
              {view === 'record' && <Record record={record} />}
            </motion.div>
          </AnimatePresence>
        </Canvas>
      }
    />
  );
}

// ---------------- Atlas ----------------
function Atlas({ occs, st, sel, onSel, reach, setReach, large, openFam, setOpenFam, moved }: {
  occs: Occ[]; st: (id: string) => CState; sel: string | null; onSel: (id: string) => void; reach: boolean; setReach: (v: boolean) => void;
  large: boolean; openFam: Family | null; setOpenFam: (f: Family | null) => void; moved: Record<string, number>;
}) {
  const [ref, w] = useWidth<HTMLDivElement>(720);
  const [hot, setHot] = useState<string | null>(null);
  const narrow = w < 560;
  const H = narrow ? w + 20 : Math.min(640, Math.max(500, w * 0.74));
  const cx = w / 2, cy = H / 2 + 6;
  const maxR = Math.min(w / 2 - (narrow ? 22 : 150), H / 2 - 40);
  const r0 = maxR * 0.2, step = (maxR - r0) / 4;
  const rad = (g: number) => r0 + Math.min(g, 4) * step;
  const famAngle = (f: Family) => -90 + FAMILIES.indexOf(f) * 72;
  const pos = (o: Occ, g: number, i: number, nInFam: number) => {
    const spread = large && openFam === o.family ? 120 : Math.min(64, 16 * nInFam);
    const a = ((famAngle(o.family) + (nInFam > 1 ? (i / (nInFam - 1) - 0.5) * spread : 0)) * Math.PI) / 180;
    return { x: cx + rad(g) * Math.cos(a), y: cy + rad(g) * Math.sin(a), a };
  };
  const gap = (o: Occ) => gapsOf(o, st).length;
  type N = { kind: 'occ'; key: string; o: Occ; g: number; x: number; y: number; a: number } | { kind: 'fam'; key: string; f: Family; n: number; g: number; x: number; y: number; a: number };
  const nodes: N[] = FAMILIES.flatMap((f): N[] => {
    const list = occs.filter((o) => o.family === f).sort((a, b) => gap(a) - gap(b) || a.label.localeCompare(b.label));
    if (large && openFam !== f) {
      const g = gap(list[0]);
      return [{ kind: 'fam' as const, key: `f-${f}`, f, n: list.length, g, ...pos(list[0], g, 0, 1) }];
    }
    return list.map((o, i) => ({ kind: 'occ' as const, key: o.id, o, g: gap(o), ...pos(o, gap(o), i, list.length) }));
  });

  // Label placement: greedy, collision-aware. Priority: goal, selected, hovered, then nearest first.
  // A label that cannot be placed without overlap is hidden (the node keeps its accessible name, and
  // hovering or focusing it shows the label); the List view always has every name.
  const fs = narrow ? 12 : 13;
  const famR = maxR + (narrow ? 22 : 30);
  type Box = { x0: number; y0: number; x1: number; y1: number };
  const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const boxes: Box[] = FAMILIES.map((f) => { const a = (famAngle(f) * Math.PI) / 180; const x = Math.min(w - f.length * 4.6 - 4, Math.max(f.length * 4.6 + 4, cx + famR * Math.cos(a))), y = cy + famR * Math.sin(a); const hw = f.length * 4.6 + 6; return { x0: x - hw, y0: y - 9, x1: x + hw, y1: y + 9 }; });
  boxes.push({ x0: cx - 22, y0: cy - 22, x1: cx + 22, y1: cy + 22 });
  [0, 1, 2, 3, 4].forEach((g) => boxes.push({ x0: cx + 2, y0: cy - rad(g) + 2, x1: cx + 20, y1: cy - rad(g) + 16 }));
  nodes.forEach((n) => boxes.push({ x0: n.x - 9, y0: n.y - 9, x1: n.x + 9, y1: n.y + 9 }));
  const textOf = (n: N) => (n.kind === 'fam' ? `${n.f} · ${n.n}` : `${narrow ? n.o.short : n.o.label}${n.o.id === 'pa' ? ' · goal' : ''}`);
  const prio = (n: N) => (n.kind === 'occ' && n.o.id === 'pa' ? -3 : n.key === sel ? -2 : n.kind === 'fam' ? 0 : n.g + (n.o.extra ? 0.5 : 0));
  const labels: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' } | null> = {};
  [...nodes].sort((a, b) => prio(a) - prio(b)).forEach((n) => {
    const faded = n.kind === 'occ' && reach && n.g > 2;
    const tw = textOf(n).length * fs * 0.56, r = n.kind === 'fam' ? 20 : 14;
    const right = Math.cos(n.a) >= -0.01;
    const cands: { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }[] = [
      { dx: right ? r : -r, dy: 4, anchor: right ? 'start' : 'end' }, { dx: right ? -r : r, dy: 4, anchor: right ? 'end' : 'start' },
      { dx: 0, dy: -r - 2, anchor: 'middle' }, { dx: 0, dy: r + 12, anchor: 'middle' },
    ];
    const forced = n.key === sel || (n.kind === 'occ' && n.o.id === 'pa');
    if (faded && !forced) { labels[n.key] = null; return; }
    const own = { x0: n.x - 9, y0: n.y - 9, x1: n.x + 9, y1: n.y + 9 };
    for (const c of cands) {
      const x0 = n.x + c.dx - (c.anchor === 'end' ? tw : c.anchor === 'middle' ? tw / 2 : 0);
      const b = { x0, y0: n.y + c.dy - 12, x1: x0 + tw, y1: n.y + c.dy + 4 };
      if (b.x0 < 2 || b.x1 > w - 2 || b.y0 < 2 || b.y1 > H - 2) continue;
      if (boxes.some((o) => o !== own && !(o.x0 === own.x0 && o.y0 === own.y0) && hit(o, b))) continue;
      labels[n.key] = c; boxes.push(b); return;
    }
    labels[n.key] = forced ? cands[0] : null;
  });
  const within = occs.filter((o) => gap(o) <= 2).length;
  const movedN = Object.entries(moved).filter(([oid, g0]) => { const o = occs.find((x) => x.id === oid); return o && gap(o) < g0; }).length;
  const act = (n: N) => (n.kind === 'fam' ? setOpenFam(n.f) : onSel(n.o.id));
  return (
    <section className="dd-sheet" aria-labelledby="atlas-h" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 id="atlas-h" className="voice t24" style={{ margin: 0, maxWidth: '30ch' }}>{movedN ? `One assessed notebook moved ${movedN} occupations a ring closer.` : `${within} occupations are two gaps or fewer away.`}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="dd-filter" aria-pressed={reach} onClick={() => setReach(!reach)}>Within 2 gaps</button>
          {large && openFam && <button type="button" className="dd-filter" onClick={() => setOpenFam(null)}>Collapse {openFam}</button>}
        </div>
      </div>
      <p className="t14 muted" style={{ margin: 0 }}>Rings count competencies you haven’t shown yet: 0 at the centre, 4 or more at the edge.{large ? ' Families are grouped; select one to open it.' : ''} Names that don’t fit appear on hover; the List view has them all.</p>
      <div ref={ref} style={{ minWidth: 0 }}>
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Career atlas. Occupations placed by family and by number of competencies still to show.">
          {[0, 1, 2, 3, 4].map((g) => <circle key={g} cx={cx} cy={cy} r={rad(g)} fill="none" stroke={g === 2 && reach ? 'var(--ink-3)' : 'var(--rule)'} strokeDasharray={g === 2 && reach ? undefined : '2 4'} strokeWidth={g === 2 && reach ? 1.5 : 1} />)}
          {[0, 1, 2, 3, 4].map((g) => <text key={g} x={cx + 4} y={cy - rad(g) + 13} fontSize={11} fill="var(--ink-3)" fontFamily="var(--data)">{g === 4 ? '4+' : g}</text>)}
          {FAMILIES.map((f) => { const a = (famAngle(f) * Math.PI) / 180; const hw = f.length * 4.6 + 4; const x = Math.min(w - hw, Math.max(hw, cx + famR * Math.cos(a))), y = cy + famR * Math.sin(a); return <text key={f} x={x} y={y + 4} fontSize={12} textAnchor="middle" fill="var(--ink-3)" fontFamily="var(--data)" letterSpacing=".08em">{f.toUpperCase()}</text>; })}
          {Object.entries(moved).map(([oid, g0]) => {
            const n = nodes.find((x) => x.key === oid); if (!n || n.kind !== 'occ' || g0 === n.g) return null;
            const x0 = cx + rad(g0) * Math.cos(n.a), y0 = cy + rad(g0) * Math.sin(n.a);
            return <g key={oid}><motion.line x1={x0} y1={y0} x2={n.x} y2={n.y} stroke="var(--gold-ink)" strokeWidth={1.5} strokeDasharray="2 3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.35 }} /><circle cx={x0} cy={y0} r={3} fill="none" stroke="var(--gold-ink)" strokeWidth={1} /></g>;
          })}
          <circle cx={cx} cy={cy} r={narrow ? 16 : 20} fill="var(--ink)" />
          <text x={cx} y={cy + 4} fontSize={12} textAnchor="middle" fill="var(--paper)" fontWeight={600}>You</text>
          {nodes.map((n) => {
            const faded = n.kind === 'occ' && reach && n.g > 2;
            const isSel = sel === n.key, goal = n.kind === 'occ' && n.o.id === 'pa';
            const L = labels[n.key];
            const name = n.kind === 'fam' ? `${n.f}: ${n.n} occupations, nearest is ${n.g} gaps away. Open family.` : `${n.o.label}, ${n.g} ${n.g === 1 ? 'gap' : 'gaps'}${goal ? ', your goal' : ''}`;
            return (
              <motion.g key={n.key} className="dd-node" role="button" tabIndex={0} aria-label={name} aria-pressed={n.kind === 'occ' ? isSel : undefined}
                onClick={() => act(n)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(n); } }}
                onMouseEnter={() => setHot(n.key)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(n.key)} onBlur={() => setHot(null)}
                initial={false} animate={{ opacity: faded ? 0.28 : 1 }} transition={{ duration: 0.3 }}>
                <motion.g initial={false} animate={{ x: n.x, y: n.y }} transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}>
                  <circle r={20} fill="transparent" />
                  {n.kind === 'fam' ? (
                    <><circle className="ring" r={15} fill="var(--wash)" stroke="var(--ink-2)" strokeWidth={1.5} /><text y={4} fontSize={11} textAnchor="middle" fontFamily="var(--data)" fill="var(--ink)">{n.n}</text></>
                  ) : (
                    <><circle className="ring" r={goal ? 9 : 7} fill={isSel ? 'var(--gold-wash)' : n.g === 0 ? 'var(--ink)' : 'var(--sheet)'} stroke="var(--ink)" strokeWidth={goal ? 2.5 : 1.5} />{goal && <circle r={14} fill="none" stroke="var(--ink)" strokeWidth={1} />}</>
                  )}
                  {L && <text x={L.dx} y={L.dy} fontSize={fs} fontWeight={goal || isSel || hot === n.key ? 600 : 400} textAnchor={L.anchor} fill={n.kind === 'fam' ? 'var(--ink-2)' : 'var(--ink)'} style={{ paintOrder: 'stroke', stroke: 'var(--sheet)', strokeWidth: 4, cursor: 'pointer' }}>{textOf(n)}</text>}
                </motion.g>
              </motion.g>
            );
          })}
          {(() => {
            const n = nodes.find((x) => x.key === hot);
            if (!n || labels[n.key]) return null;
            const t = textOf(n), tw = t.length * fs * 0.56 + 12, right = n.x + 16 + tw < w;
            return (
              <g pointerEvents="none">
                <rect x={right ? n.x + 14 : n.x - 14 - tw} y={n.y - 13} width={tw} height={24} rx={6} fill="var(--ink)" />
                <text x={right ? n.x + 20 : n.x - 20} y={n.y + 4} fontSize={fs} textAnchor={right ? 'start' : 'end'} fill="var(--paper)" fontWeight={600}>{t}</text>
              </g>
            );
          })()}
        </svg>
      </div>
      {narrow && (
        <ol aria-label="Nearest occupations" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {occs.map((o) => ({ o, g: gap(o) })).sort((a, b) => a.g - b.g || a.o.label.localeCompare(b.o.label)).slice(0, 5).map(({ o, g }) => (
            <li key={o.id} style={{ borderTop: '1px solid var(--rule)' }}>
              <button type="button" onClick={() => onSel(o.id)} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, width: '100%', padding: '10px 0', minHeight: 44, alignItems: 'center' }}>
                <span><span style={{ fontWeight: 600 }}>{o.label}</span><span className="t14 muted"> · {o.family}</span></span>
                <span className="num t14" style={{ fontFamily: 'var(--data)' }}>{g} {g === 1 ? 'gap' : 'gaps'}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function OccList({ occs, st, reach, onSel }: { occs: Occ[]; st: (id: string) => CState; reach: boolean; onSel: (id: string) => void }) {
  const rows = occs.map((o) => ({ o, g: gapsOf(o, st) })).filter((r) => !reach || r.g.length <= 2).sort((a, b) => a.g.length - b.g.length || a.o.label.localeCompare(b.o.label));
  return (
    <section className="dd-sheet" aria-labelledby="list-h" style={{ display: 'grid', gap: 12 }}>
      <h2 id="list-h" className="voice t24" style={{ margin: 0 }}>Nearest first</h2>
      <div className="dd-ledger-wrap">
        <table className="dd-ledger" style={{ minWidth: 0 }}>
          <thead><tr><th scope="col">Occupation</th><th scope="col">Gaps</th><th scope="col" className="hide-narrow">Still to show</th></tr></thead>
          <tbody>
            {rows.map(({ o, g }) => (
              <tr key={o.id}>
                <th scope="row"><button type="button" onClick={() => onSel(o.id)} style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, minHeight: 32, display: 'inline-flex', alignItems: 'center' }}>{o.label}</button><span className="t14 muted" style={{ display: 'block' }}>{o.family}{o.extra ? ' · illustrative' : ''}</span></th>
                <td className="num" style={{ fontFamily: 'var(--data)' }}>{g.length}</td>
                <td className="hide-narrow t14">{g.map((x) => compById(x).label).join(', ') || 'None. Ready to apply.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------- Role sheet: competencies, evidence, practice, work sample ----------------
function Role({ o, st, comp, setComp, practising, pick, answer, onPractise, sample, rubric, onSubmit }: {
  o: Occ; st: (id: string) => CState; comp: string | null; setComp: (c: string | null) => void; practising: boolean; pick: string | null; answer: (id: string) => void; onPractise: () => void;
  sample: 'none' | 'running' | 'assessed'; rubric: number; onSubmit: () => void;
}) {
  const g = gapsOf(o, st);
  const verdict = pick ? COACH_OPTIONS.find((x) => x.id === pick)!.verdict : null;
  return (
    <section className="dd-sheet" aria-labelledby="role-h" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <h2 id="role-h" className="voice t24" style={{ margin: 0 }}>{g.length ? `${o.needs.length - g.length} of ${o.needs.length} shown. ${g.length} to go.` : 'Every competency shown.'}</h2>
        {o.demand && <p className="t14 muted" style={{ margin: 0 }}>Illustrative demand: {o.demand}.</p>}
      </div>
      <GlyphKey kinds={['verified', 'full', 'partial', 'practice', 'none', 'unclear']} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {o.needs.map((cid) => {
          const c = compById(cid); const k = st(cid); const isOpen = comp === cid;
          return (
            <li key={cid} style={{ borderTop: '1px solid var(--rule)', padding: '12px 0', display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 12, alignItems: 'center' }}>
                <motion.span key={k} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} style={{ display: 'inline-flex' }}><Glyph k={k} size={22} /></motion.span>
                <div style={{ minWidth: 0 }}><p style={{ margin: 0, fontWeight: 600 }}>{c.label}</p><p className="t14 muted" style={{ margin: 0 }}>{GLYPH_LABEL[k]} · {c.plain}</p></div>
                {c.evidence || (cid === 'sql' && sample === 'assessed')
                  ? <button type="button" className="dd-btn quiet" aria-expanded={isOpen} onClick={() => setComp(isOpen ? null : cid)}>{isOpen ? 'Hide' : 'Evidence'}</button>
                  : cid === 'sql' && !practising ? <button type="button" className="dd-btn" onClick={onPractise}>Practise</button> : <span />}
              </div>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24 }} style={{ overflow: 'hidden' }}>
                    <EvidenceCard title={cid === 'sql' ? 'Cohort-retention notebook' : c.evidence!.title} cls={cid === 'sql' ? 'Assessed by rubric and reviewer' : c.evidence!.cls}
                      proves={cid === 'sql' ? 'You can use LAG over a per-user window and explain the result; level 2 of 4 on the rubric.' : c.evidence!.proves}
                      not={cid === 'sql' ? 'Handling edge cases (users with one session), or SQL on production-sized data.' : c.evidence!.notProves} />
                  </motion.div>
                )}
              </AnimatePresence>
              {cid === 'sql' && practising && sample === 'none' && (
                <div style={{ background: 'var(--paper)', borderRadius: 14, padding: 16, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><span className="lab">Practice · private · unscored</span><span className="dd-sim">Not proof</span></div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{COACH_Q}</p>
                  <div role="group" aria-label="Choose an approach" style={{ display: 'grid', gap: 8 }}>
                    {COACH_OPTIONS.map((x) => <button key={x.id} type="button" className="dd-opt" aria-pressed={pick === x.id} aria-disabled={!!pick && pick !== x.id} onClick={() => answer(x.id)}>{x.id === 'b' ? <code>{x.text}</code> : <span>{x.text}</span>}</button>)}
                  </div>
                  {verdict && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dd-note" style={{ margin: 0 }} aria-live="polite">{COACH_FEEDBACK[verdict].text}</motion.p>}
                  {verdict === 'right' && (
                    <div className="dd-actions"><button type="button" className="dd-btn primary" onClick={onSubmit}>Submit a work sample for review</button><span className="t14 muted">A 30-minute cohort-retention notebook, reviewed against a rubric.</span></div>
                  )}
                </div>
              )}
              {cid === 'sql' && sample === 'running' && (
                <div style={{ background: 'var(--paper)', borderRadius: 14, padding: 16, display: 'grid', gap: 8 }} aria-live="polite">
                  <span className="lab">Rubric review · simulated reviewer</span>
                  {RUBRIC.map((r, i) => (
                    <div key={r.c} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10, alignItems: 'center', opacity: i < rubric ? 1 : 0.45 }}>
                      <Glyph k={i < rubric ? (r.ok ? 'full' : 'partial') : 'none'} /><span className="t14">{r.c}{i < rubric ? (r.ok ? ' · met' : ' · not yet') : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EvidenceCard({ title, cls, proves, not }: { title: string; cls: string; proves: string; not: string }) {
  return (
    <div style={{ border: '1px solid var(--rule-2)', borderRadius: 14, padding: 16, display: 'grid', gap: 8, background: 'var(--paper)' }}>
      <span className="lab">{cls}</span>
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      <p className="t14" style={{ margin: 0 }}><strong>Proves: </strong>{proves}</p>
      <p className="t14" style={{ margin: 0 }}><strong>Does not prove: </strong>{not}</p>
    </div>
  );
}

// ---------------- Development record ----------------
function Record({ record }: { record: Rec[] }) {
  return (
    <section className="dd-sheet" aria-labelledby="rec-h" style={{ display: 'grid', gap: 18 }}>
      <h2 id="rec-h" className="voice t24" style={{ margin: 0 }}>Every change, with its reason and its limits.</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
        {LADDER.map((l) => (
          <div key={l.cls} style={{ background: 'var(--paper)', borderRadius: 12, padding: 12, display: 'grid', gap: 6, alignContent: 'start' }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14 }}><Glyph k={CLS_GLYPH[l.cls]} />{l.cls}</span>
            <span className="t14 muted">{l.counts}</span>
          </div>
        ))}
      </div>
      <ol className="dd-record">
        <AnimatePresence initial={false}>
          {record.map((r) => (
            <motion.li key={r.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
              <span style={{ paddingTop: 2 }}><Glyph k={CLS_GLYPH[r.cls]} size={18} /></span>
              <div style={{ display: 'grid', gap: 4 }}>
                <p style={{ margin: 0 }}><span className="num" style={{ fontFamily: 'var(--data)', fontSize: 13, color: 'var(--ink-3)' }}>{r.at} · </span><strong>{compById(r.comp).label}</strong> · {r.cls}</p>
                <p className="t14" style={{ margin: 0 }}>{r.why}{r.moved ? ` ${r.moved}.` : ''}</p>
                <p className="t14 muted" style={{ margin: 0 }}>Does not prove: {r.not}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}
