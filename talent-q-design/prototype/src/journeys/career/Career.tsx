// J7 Career Intelligence workspace: SC-162 career home · SC-163 goals and transitions · SC-164 role pathway
// (atlas) · SC-165 skill evidence and gap explainer · SC-166 growth plan editor · SC-167 practice launch ·
// SC-169 practical challenge · SC-170 feedback · SC-171 progress over time · SC-172 work-sample improvement ·
// SC-174 archived goals · SC-082 mutual-fit openings (illustrative). Three personas, one evidence model:
// practice is private and never changes the map; only a reviewed work sample or a verified credential does.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Glyph, GlyphKey, GLYPH_LABEL } from '../../ds/Glyph';
import { moodOf, type QAgent } from '../../ds/QMark';
import { Canvas, Split, Thread, useNarrow, useTimers, type Chip, type Entry, type ViewDef } from '../../ds/Workspace';
import { BandAtlas, OccList, RadialAtlas, gapsOf, shown } from './Atlas';
import { PERSONAS, type CState, type Persona, type PlanStep, type Rec, type RecClass } from './personas';

type View = 'atlas' | 'list' | 'role' | 'plan' | 'progress' | 'record';
type PId = Persona['id'];
const CLS_GLYPH: Record<RecClass, CState> = { 'Practice attempt': 'practice', 'Work sample submitted': 'partial', 'Assessed by rubric and reviewer': 'full', 'Verified credential': 'verified' };
const LADDER: { cls: RecClass; counts: string }[] = [
  { cls: 'Practice attempt', counts: 'Private. Never counts as proof; the map does not move.' },
  { cls: 'Work sample submitted', counts: 'Counts as partial until someone reviews it.' },
  { cls: 'Assessed by rubric and reviewer', counts: 'Counts as evidenced. The map moves.' },
  { cls: 'Verified credential', counts: 'Issuer confirmed. Counts as verified.' },
];

interface J7State { states: Record<string, CState>; record: Rec[]; plan: PlanStep[]; moved: Record<string, number>; goal: string; archived: { occ: string; at: string; why: string }[]; pick: string | null; practising: boolean; sample: 'none' | 'running' | 'assessed' }
const fresh = (p: Persona): J7State => ({ states: Object.fromEntries(p.comps.map((c) => [c.id, c.state])), record: p.record, plan: p.plan, moved: {}, goal: p.goal, archived: [], pick: null, practising: false, sample: 'none' });
const KEY = 'tq.j7.v1';
const loadAll = (): Partial<Record<PId, J7State>> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };

export function J7() {
  const narrow = useNarrow();
  const later = useTimers();
  const [pid, setPid] = useState<PId>(() => { try { return (localStorage.getItem('tq.j7.persona') as PId) || 'graduate'; } catch { return 'graduate'; } });
  const P = PERSONAS[pid];
  const [all, setAll] = useState(loadAll);
  const S = all[pid] ?? fresh(P);
  const setS = (f: (s: J7State) => J7State) => setAll((a) => { const n = { ...a, [pid]: f(a[pid] ?? fresh(P)) }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  useEffect(() => { try { localStorage.setItem('tq.j7.persona', pid); } catch { /* ignore */ } }, [pid]);

  const [view, setView] = useState<View>('atlas');
  const [occRaw, setOcc] = useState<string | null>(null);
  const [comp, setComp] = useState<string | null>(null);
  const [reach, setReach] = useState(false);
  const [large, setLarge] = useState(false);
  const [openFam, setOpenFam] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<QAgent[]>([]);
  const [rubric, setRubric] = useState(0);
  const [log, setLog] = useState<Entry[]>([]);
  const n = useRef(0);
  const id = () => `j${++n.current}`;
  const st = (c: string) => S.states[c];
  const cb = (c: string) => P.comps.find((x) => x.id === c)!;
  const occs = large && P.extra.length ? [...P.occs, ...P.extra] : P.occs;
  // A role selected under another persona is not valid here (persona switch happens before the reset effect).
  const occ = occRaw && [...P.occs, ...P.extra].some((o) => o.id === occRaw) ? occRaw : null;
  const goalOcc = P.occs.find((o) => o.id === S.goal) ?? P.occs.find((o) => o.id === P.goal)!;
  const show = (v: View) => { setView(v); if (narrow) setOpen(true); };
  const say = (me: string | null, q: Entry | string) => setLog((l) => [...l, ...(me ? [{ id: id(), who: 'me' as const, text: me }] : []), typeof q === 'string' ? { id: id(), who: 'q' as const, text: q } : q]);

  // Switching persona resets the transient conversation; each persona's record persists.
  useEffect(() => { setLog([]); setView('atlas'); setOcc(null); setComp(null); setLarge(false); setReach(false); setOpen(false); }, [pid]);

  const openRole = (oid: string, said?: string) => {
    const o = occs.find((x) => x.id === oid)!; const g = gapsOf(o, st);
    setOcc(oid); setComp(null); show('role');
    say(said ?? `Open ${o.label}`, { id: id(), who: 'q', why: 'Shown as a role sheet: each competency with its evidence', text: `${o.label} needs ${o.needs.length} competencies. You’ve shown ${o.needs.length - g.length}.${g.length ? ` Still to show: ${g.map((x) => cb(x).label).join(', ')}.` : ' You could apply today.'}` });
  };
  const startPractice = () => {
    setOcc(goalOcc.id); setS((s) => ({ ...s, practising: true, pick: null })); show('role');
    say('Practise', `One question on ${cb(P.practice.comp).label.toLowerCase()}. It’s private, and it can’t count against you or for you.`);
  };
  const answer = (o: string) => {
    if (S.pick) return;
    const v = P.practice.options.find((x) => x.id === o)!.verdict;
    setS((s) => ({ ...s, pick: o, states: s.states[P.practice.comp] === 'none' ? { ...s.states, [P.practice.comp]: 'practice' } : s.states,
      record: [{ id: id(), at: '29 Oct', comp: P.practice.comp, cls: 'Practice attempt', why: v === 'right' ? 'Chose the right approach on one practice question.' : 'Attempted one practice question; not the strongest approach yet.', not: 'That you can do this at work. Practice is not proof.' }, ...s.record] }));
    say(null, v === 'right' ? `${P.practice.feedback.right} Logged as a private practice attempt: not proof, so your map stays put. To change it, submit a short work sample for review.` : `${P.practice.feedback[v]} Logged privately as practice.`);
  };
  const submit = () => {
    setS((s) => ({ ...s, sample: 'running' })); setRubric(0); show('role');
    const R = P.practice.sample.rubric;
    const plan = [{ label: 'Receiving your work sample (simulated)', done: 0, total: 1 }, { label: 'Checking against the rubric', done: 0, total: R.length }, { label: 'Reviewer sign-off (simulated)', done: 0, total: 1 }];
    setAgents(plan);
    const eid = id();
    setLog((l) => [...l, { id: id(), who: 'me', text: `Submit: ${P.practice.sample.title}` }, { id: eid, who: 'q', plan, live: true }]);
    const tick = (ai: number, d: number, t: number) => later(t, () => {
      setAgents((a) => a.map((x, j) => (j === ai ? { ...x, done: d } : x)));
      setLog((l) => l.map((e) => (e.id === eid ? { ...e, plan: e.plan?.map((x, j) => (j === ai ? { ...x, done: d } : x)) } : e)));
      if (ai === 1) setRubric(d);
    });
    tick(0, 1, 600); R.forEach((_, k) => tick(1, k + 1, 600 + (k + 1) * 520)); tick(2, 1, 900 + R.length * 520);
    later(1300 + R.length * 520, () => {
      const before = Object.fromEntries(occs.map((o) => [o.id, gapsOf(o, st).length]));
      const touched = occs.filter((o) => o.needs.includes(P.practice.comp));
      setS((s) => ({ ...s, sample: 'assessed', states: { ...s.states, [P.practice.comp]: 'full' }, moved: Object.fromEntries(touched.map((o) => [o.id, before[o.id]])),
        record: [{ id: id(), at: '29 Oct', comp: P.practice.comp, cls: 'Assessed by rubric and reviewer', why: `${P.practice.sample.title} scored level ${P.practice.sample.level}: ${R.filter((r) => r.ok).length} of ${R.length} rubric criteria met; reviewer signed off (simulated).`, not: P.practice.sample.not, moved: `${touched.length} occupations moved one ring closer` }, ...s.record],
        plan: s.plan.map((x) => (x.comp === P.practice.comp ? { ...x, done: true } : x)) }));
      setAgents([]); setView('atlas'); setOcc(goalOcc.id);
      setLog((l) => l.map((e) => (e.id === eid ? { ...e, live: false, text: `Assessed: level ${P.practice.sample.level}. ${cb(P.practice.comp).label} now counts as evidenced, so the map moved: ${touched.length} occupations are a ring closer. The reason, and what it doesn’t prove, are in your record.`, why: 'Back to the atlas: this change moves you' } : e)));
    });
  };
  const makeGoal = (oid: string) => {
    const prev = S.goal;
    if (prev === oid) return;
    setS((s) => ({ ...s, goal: oid, archived: [{ occ: prev, at: '29 Oct', why: 'You chose a new goal' }, ...s.archived] }));
    say(`Make ${occs.find((o) => o.id === oid)!.label} my goal`, `Done. ${P.occs.find((o) => o.id === prev)!.label} is archived with everything you did for it; nothing is lost. Your plan now points at the new goal.`);
  };

  const chips = (): Chip[] => {
    if (S.sample === 'running') return [];
    if (S.sample === 'assessed') return [{ label: 'Show my record', go: true, on: () => { say('Show my record', 'Newest first. Each change shows its class of evidence, why it counted, and what it doesn’t prove.'); show('record'); } }, { label: 'How have I progressed?', on: () => { say('How have I progressed?', 'Only assessed attempts are plotted as a line, because only they are comparable. Practice shows as dots.'); show('progress'); } }];
    const verdict = S.pick ? P.practice.options.find((x) => x.id === S.pick)!.verdict : null;
    if (S.practising && verdict === 'right') return [{ label: 'Submit a work sample', go: true, on: submit }, { label: 'Show my plan', on: () => show('plan') }];
    if (S.practising && verdict) return [{ label: 'Try again', go: true, on: () => setS((s) => ({ ...s, pick: null })) }];
    if (S.practising) return [];
    if (occ) return [{ label: `Practise ${cb(P.practice.comp).label.toLowerCase()}`, go: true, on: startPractice }, { label: 'Show my development plan', on: () => { say('Show my plan', 'Here’s your plan, ordered by what moves you furthest for the least time. Reorder or remove anything.'); show('plan'); } }];
    return [
      { label: `Open ${goalOcc.label}`, go: true, on: () => openRole(goalOcc.id) },
      { label: reach ? 'Show every occupation' : 'What’s within reach?', on: () => { setReach(!reach); say(reach ? 'Show every occupation' : 'What’s within reach?', reach ? 'All occupations again.' : `${occs.filter((o) => gapsOf(o, st).length <= 2).length} occupations are two gaps or fewer away.`); show('atlas'); } },
      ...(P.extra.length ? [{ label: large ? 'Back to the nearest' : `Show ${P.occs.length + P.extra.length} occupations`, on: () => { setLarge(!large); setOpenFam(null); say(large ? 'Back to the nearest' : 'Show more occupations', large ? 'Back to the nearest occupations.' : 'At this many, I group each family into one point at its nearest role. Extra roles are illustrative.'); show('atlas'); } }] : []),
    ];
  };
  const entries = useMemo<Entry[]>(() => {
    const hello: Entry = { id: `hi-${pid}`, who: 'q', used: ['Your Evidence Passport', 'Listings you saved', `Goal: ${goalOcc.label}`],
      text: `Morning, ${P.first}. Your goal is ${goalOcc.label}, ${gapsOf(goalOcc, st).length} ${gapsOf(goalOcc, st).length === 1 ? 'competency' : 'competencies'} away. On the atlas, the closer an occupation sits, the fewer competencies you still need to show.`,
      why: narrow ? 'Shown as distance bands on your phone' : 'Shown as an atlas: distance is what you still need to show' };
    const e = [hello, ...log];
    const li = e.length - 1;
    if (!e[li].live) e[li] = { ...e[li], chips: chips() };
    return e;
  }, [log, S, occ, reach, large, pid, narrow]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSend = (t: string) => {
    const s = t.toLowerCase();
    if (/practi|quiz|try/.test(s)) startPractice();
    else if (/record|history/.test(s)) { say(t, 'Here is your record.'); show('record'); }
    else if (/plan/.test(s)) { say(t, 'Here is your plan.'); show('plan'); }
    else if (/progress|improv/.test(s)) { say(t, 'Assessed attempts only, so the comparison is fair.'); show('progress'); }
    else { const o = occs.find((x) => s.includes(x.label.toLowerCase()) || s.includes(x.short.toLowerCase())); if (o) openRole(o.id, t); else say(t, 'I can open any occupation by name, show what’s within reach, run practice, or show your plan, progress and record. Your message isn’t stored in this prototype.'); }
  };

  const views: ViewDef<View>[] = [{ id: 'atlas', label: 'Atlas' }, { id: 'list', label: 'List' }, { id: 'role', label: occ ? [...P.occs, ...P.extra].find((o) => o.id === occ)!.short : 'Role', ready: !!occ }, { id: 'plan', label: 'Plan' }, { id: 'progress', label: 'Progress' }, { id: 'record', label: 'Record' }];
  const shownCount = P.comps.filter((c) => shown(st(c.id))).length;
  const title = view === 'record' ? 'Development record' : view === 'plan' ? 'Development plan' : view === 'progress' ? 'Progress over time' : view === 'role' && occ ? [...P.occs, ...P.extra].find((o) => o.id === occ)!.label : `Where you could go, ${P.first}`;
  return (
    <Split id="career"
      thread={<Thread title="Career" entries={entries} onSend={onSend} agents={agents} mood={moodOf({ agents, done: S.sample === 'assessed' })} placeholder="Ask about a role, or practise"
        />}
      canvas={
        <Canvas title={title} kicker={`${P.first} · goal: ${goalOcc.label} · ${shownCount} of ${P.comps.length} shown`} views={views} view={view} setView={setView}
          building={S.sample === 'running'} open={open} onClose={() => setOpen(false)} qLine={[...entries].reverse().find((e) => e.who === 'q' && e.text)?.text}
          aside={
            <div role="group" aria-label="Demo persona" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}><span className="lab">Demo persona</span>
              {(Object.keys(PERSONAS) as PId[]).map((k) => <button key={k} type="button" className="ds-filter" aria-pressed={pid === k} onClick={() => setPid(k)}>{PERSONAS[k].first} · {k === 'graduate' ? 'graduate' : k === 'switcher' ? 'switcher' : 'experienced'}</button>)}
            </div>}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view + pid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
              {view === 'atlas' && (narrow
                ? <BandAtlas occs={occs} st={st} sel={occ} onSel={(o) => openRole(o)} reach={reach} setReach={setReach} moved={S.moved} goal={S.goal} fams={P.families} />
                : <RadialAtlas occs={occs} st={st} sel={occ} onSel={(o) => openRole(o)} reach={reach} setReach={setReach} large={large} openFam={openFam} setOpenFam={setOpenFam} moved={S.moved} fams={P.families} goal={S.goal} />)}
              {view === 'list' && <OccList occs={occs} st={st} reach={reach} onSel={(o) => openRole(o)} cb={cb} />}
              {view === 'role' && occ && <Role P={P} S={S} oid={occ} st={st} comp={comp} setComp={setComp} answer={answer} onPractise={startPractice} rubric={rubric} onSubmit={submit} onGoal={makeGoal} />}
              {view === 'plan' && <PlanView P={P} S={S} setS={setS} goal={goalOcc.label} />}
              {view === 'progress' && <Progress P={P} S={S} />}
              {view === 'record' && <RecordView P={P} S={S} />}
            </motion.div>
          </AnimatePresence>
        </Canvas>
      } />
  );
}

// ---------------- Role sheet ----------------
function Role({ P, S, oid, st, comp, setComp, answer, onPractise, rubric, onSubmit, onGoal }: {
  P: Persona; S: J7State; oid: string; st: (c: string) => CState; comp: string | null; setComp: (c: string | null) => void; answer: (o: string) => void; onPractise: () => void; rubric: number; onSubmit: () => void; onGoal: (o: string) => void;
}) {
  const o = [...P.occs, ...P.extra].find((x) => x.id === oid)!;
  const g = gapsOf(o, st);
  const cb = (c: string) => P.comps.find((x) => x.id === c)!;
  const verdict = S.pick ? P.practice.options.find((x) => x.id === S.pick)!.verdict : null;
  const openings = P.openings.filter((x) => x.occ === oid);
  const pc = P.practice.comp;
  return (
    <section className="ds-sheet" aria-labelledby="role-h" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <h2 id="role-h" className="voice t24" style={{ margin: 0 }}>{g.length ? `${o.needs.length - g.length} of ${o.needs.length} shown. ${g.length} to go.` : 'Every competency shown. You could apply today.'}</h2>
          {o.demand && <p className="t14 muted" style={{ margin: 0 }}>Illustrative demand: {o.demand}.</p>}
        </div>
        {S.goal === oid ? <span className="ds-tag" data-k="busy">Your goal</span> : <button type="button" className="ds-btn" onClick={() => onGoal(oid)}>Make this my goal</button>}
      </div>
      <GlyphKey kinds={['verified', 'full', 'partial', 'practice', 'none', 'unclear']} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {o.needs.map((cid) => {
          const c = cb(cid); const k = st(cid); const isOpen = comp === cid;
          const ev = cid === pc && S.sample === 'assessed' ? { title: P.practice.sample.title, cls: 'Assessed by rubric and reviewer', proves: P.practice.sample.proves, notProves: P.practice.sample.not } : c.evidence;
          return (
            <li key={cid} style={{ borderTop: '1px solid var(--rule)', padding: '12px 0', display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 12, alignItems: 'center' }}>
                <motion.span key={k} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} style={{ display: 'inline-flex' }}><Glyph k={k} size={22} /></motion.span>
                <div style={{ minWidth: 0 }}><p style={{ margin: 0, fontWeight: 600 }}>{c.label}</p><p className="t14 muted" style={{ margin: 0 }}>{GLYPH_LABEL[k]} · {c.plain}</p></div>
                {ev ? <button type="button" className="ds-btn quiet" aria-expanded={isOpen} onClick={() => setComp(isOpen ? null : cid)}>{isOpen ? 'Hide' : 'Evidence'}</button>
                  : cid === pc && !S.practising ? <button type="button" className="ds-btn" onClick={onPractise}>Practise</button> : <span />}
              </div>
              <AnimatePresence initial={false}>
                {isOpen && ev && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24 }} style={{ overflow: 'hidden' }}>
                    <div style={{ border: '1px solid var(--rule-2)', borderRadius: 14, padding: 16, display: 'grid', gap: 8, background: 'var(--paper)' }}>
                      <span className="lab">{ev.cls}</span><p style={{ margin: 0, fontWeight: 600 }}>{ev.title}</p>
                      <p className="t14" style={{ margin: 0 }}><strong>Proves: </strong>{ev.proves}</p><p className="t14" style={{ margin: 0 }}><strong>Does not prove: </strong>{ev.notProves}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {cid === pc && S.practising && S.sample === 'none' && (
                <div style={{ background: 'var(--paper)', borderRadius: 14, padding: 16, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><span className="lab">Practice · private · unscored</span><span className="ds-sim">Not proof</span></div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{P.practice.question}</p>
                  <div role="group" aria-label="Choose an approach" style={{ display: 'grid', gap: 8 }}>
                    {P.practice.options.map((x) => <button key={x.id} type="button" className="ds-opt" aria-pressed={S.pick === x.id} aria-disabled={!!S.pick && S.pick !== x.id} onClick={() => answer(x.id)}>{x.code ? <code>{x.text}</code> : <span>{x.text}</span>}</button>)}
                  </div>
                  {verdict && <p className="ds-note" style={{ margin: 0 }} aria-live="polite">{P.practice.feedback[verdict]}</p>}
                  {verdict === 'right' && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={onSubmit}>Submit a work sample for review</button><span className="t14 muted">{P.practice.sample.title} · about {P.practice.sample.minutes} minutes · reviewed against a rubric.</span></div>}
                </div>
              )}
              {cid === pc && S.sample === 'running' && (
                <div style={{ background: 'var(--paper)', borderRadius: 14, padding: 16, display: 'grid', gap: 8 }} aria-live="polite">
                  <span className="lab">Rubric review · simulated reviewer</span>
                  {P.practice.sample.rubric.map((r, i) => <div key={r.c} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10, alignItems: 'center', opacity: i < rubric ? 1 : 0.45 }}><Glyph k={i < rubric ? (r.ok ? 'full' : 'partial') : 'none'} /><span className="t14">{r.c}{i < rubric ? (r.ok ? ' · met' : ' · not yet') : ''}</span></div>)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {openings.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <h3 className="lab" style={{ margin: 0 }}>Openings that fit · illustrative</h3>
          {openings.map((x) => (
            <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', background: 'var(--paper)', borderRadius: 12, padding: 12 }}>
              <span><b>{x.title}</b> <span className="muted">· {x.org} · {x.where}</span><span className="t14 muted" style={{ display: 'block' }}>{x.note}. You show {o.needs.length - g.length} of {o.needs.length} needs{g.length ? `; missing ${g.map((c) => cb(c).label).join(', ')}` : ''}.</span></span>
              <span className="ds-tag">{g.length ? 'Build first' : 'Ready'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------- Development plan (SC-166) with goals history (SC-163, SC-174) ----------------
function PlanView({ P, S, setS, goal }: { P: Persona; S: J7State; setS: (f: (s: J7State) => J7State) => void; goal: string }) {
  const cb = (c: string) => P.comps.find((x) => x.id === c)!;
  const move = (i: number, d: -1 | 1) => setS((s) => { const p = [...s.plan]; const j = i + d; if (j < 0 || j >= p.length) return s; [p[i], p[j]] = [p[j], p[i]]; return { ...s, plan: p }; });
  const left = S.plan.filter((x) => !x.done);
  return (
    <section className="ds-sheet" aria-labelledby="plan-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="plan-h" className="voice t24" style={{ margin: 0 }}>{left.length ? `${left.length} steps toward ${goal}, about ${Math.round(left.reduce((a, x) => a + x.minutes, 0) / 60 * 10) / 10} hours.` : `Every planned step for ${goal} is done.`}</h2>
      <p className="t14 muted" style={{ margin: 0 }}>Private to you. Steps that end in review or a credential can change your record; practice steps never do on their own.</p>
      {!S.plan.length && <p className="muted">Your plan is empty. Ask Q to suggest steps for your goal.</p>}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {S.plan.map((x, i) => (
          <motion.li key={x.id} layout style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--rule)', opacity: x.done ? 0.6 : 1 }}>
            <span className="num voice t19" aria-hidden="true">{i + 1}</span>
            <span><b style={{ fontWeight: 600, textDecoration: x.done ? 'line-through' : undefined }}>{x.title}</b><span className="t14 muted" style={{ display: 'block' }}>{x.kind} · {x.minutes} min · {cb(x.comp).label} · {x.why}</span></span>
            <span style={{ display: 'flex', gap: 2 }}>
              <button type="button" className="ds-btn quiet" aria-label={`Move “${x.title}” up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="ds-btn quiet" aria-label={`Move “${x.title}” down`} disabled={i === S.plan.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="ds-btn quiet" aria-pressed={!!x.done} onClick={() => setS((s) => ({ ...s, plan: s.plan.map((y) => (y.id === x.id ? { ...y, done: !y.done } : y)) }))}>{x.done ? 'Undo' : 'Done'}</button>
              <button type="button" className="ds-btn quiet" aria-label={`Remove “${x.title}”`} onClick={() => setS((s) => ({ ...s, plan: s.plan.filter((y) => y.id !== x.id) }))}>×</button>
            </span>
          </motion.li>
        ))}
      </ol>
      {S.archived.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Archived goals ({S.archived.length})</summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{S.archived.map((a, i) => <li key={i}>{P.occs.find((o) => o.id === a.occ)?.label} · archived {a.at} · {a.why}. Its evidence stays in your record.</li>)}</ul>
        </details>
      )}
    </section>
  );
}

// ---------------- Progress over time (SC-171) ----------------
// dataviz review (29 Oct): small multiples, one series each, so no dual axis and no colour identity needed;
// two mark types (assessed = filled and joined, practice = hollow, never joined) carry a legend; 2px line,
// r=4 markers with a 2px surface ring; solid hairline grid; end label on the latest assessed level; every
// point focusable with a text equivalent, and a table view. Ink only: no categorical palette to validate.
function Progress({ P, S }: { P: Persona; S: J7State }) {
  const cb = (c: string) => P.comps.find((x) => x.id === c)!;
  const series = [...P.progress];
  if (S.sample === 'assessed' && !series.some((x) => x.comp === P.practice.comp)) series.unshift({ comp: P.practice.comp, points: [{ at: '29 Oct', level: 1, cls: 'practice' }, { at: '29 Oct', level: Number(P.practice.sample.level[0]), cls: 'assessed' }] });
  const rising = series.filter((x) => { const a = x.points.filter((p) => p.cls === 'assessed'); return a.length > 1 && a[a.length - 1].level > a[0].level; });
  const W = 260, H = 128, padL = 22, padR = 46, padB = 22, padT = 10;
  return (
    <section className="ds-sheet" aria-labelledby="pr-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="pr-h" className="voice t24" style={{ margin: 0 }}>{rising.length ? `${rising.map((x) => cb(x.comp).label).join(' and ')} ${rising.length === 1 ? 'has' : 'have'} risen on assessment.` : 'Not enough assessed attempts yet to show a trend.'}</h2>
      <ul aria-label="Key" className="t14" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', listStyle: 'none', margin: 0, padding: 0 }}>
        <li style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><svg width="30" height="10" aria-hidden="true"><line x1="2" y1="5" x2="28" y2="5" stroke="var(--ink)" strokeWidth="2" /><circle cx="15" cy="5" r="4" fill="var(--ink)" stroke="var(--sheet)" strokeWidth="2" /></svg>Assessed (same rubric, comparable): joined</li>
        <li style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="var(--sheet)" stroke="var(--ink)" strokeWidth="1.5" /></svg>Practice: shown, never joined or counted</li>
      </ul>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
        {series.map((x) => {
          const xs = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, x.points.length - 1);
          const ys = (l: number) => H - padB - ((l - 1) / 3) * (H - padB - padT);
          const assessed = x.points.map((p, i) => ({ ...p, i })).filter((p) => p.cls === 'assessed');
          const last = assessed[assessed.length - 1];
          return (
            <figure key={x.comp} style={{ margin: 0, display: 'grid', gap: 6 }}>
              <figcaption style={{ fontWeight: 600 }}>{cb(x.comp).label}</figcaption>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${cb(x.comp).label}, level by date`}>
                {[1, 2, 3, 4].map((l) => <g key={l}><line x1={padL} x2={W - padR + 8} y1={ys(l)} y2={ys(l)} stroke="var(--rule)" strokeWidth={1} /><text x={4} y={ys(l) + 4} fontSize={10} fill="var(--ink-3)" fontFamily="var(--data)">{l}</text></g>)}
                {assessed.length > 1 && <polyline points={assessed.map((p) => `${xs(p.i)},${ys(p.level)}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
                {x.points.map((p, i) => (
                  <g key={i} tabIndex={0} role="img" aria-label={`${p.at}: level ${p.level}, ${p.cls === 'assessed' ? 'assessed' : 'practice, not counted'}`} className="ds-node">
                    <title>{`${p.at} · level ${p.level} · ${p.cls === 'assessed' ? 'assessed' : 'practice (not counted)'}`}</title>
                    <circle cx={xs(i)} cy={ys(p.level)} r={12} fill="transparent" />
                    <circle className="ring" cx={xs(i)} cy={ys(p.level)} r={4} fill={p.cls === 'assessed' ? 'var(--ink)' : 'var(--sheet)'} stroke={p.cls === 'assessed' ? 'var(--sheet)' : 'var(--ink)'} strokeWidth={p.cls === 'assessed' ? 2 : 1.5} />
                  </g>
                ))}
                {last && <text x={xs(last.i) + 10} y={ys(last.level) + 4} fontSize={11} fill="var(--ink)" fontFamily="var(--data)">L{last.level}</text>}
                {x.points.map((p, i) => <text key={`t${i}`} x={xs(i)} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--ink-3)" fontFamily="var(--data)">{p.at}</text>)}
              </svg>
            </figure>
          );
        })}
      </div>
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Show as a table</summary>
        <table className="ds-table" style={{ marginTop: 8 }}>
          <thead><tr><th scope="col">Competency</th><th scope="col">Date</th><th scope="col">Level</th><th scope="col">Kind</th></tr></thead>
          <tbody>{series.flatMap((x) => x.points.map((p, i) => <tr key={x.comp + i}><td>{cb(x.comp).label}</td><td className="num">{p.at}</td><td className="num">{p.level}</td><td>{p.cls === 'assessed' ? 'Assessed' : 'Practice (not counted)'}</td></tr>))}</tbody>
        </table>
      </details>
    </section>
  );
}

function RecordView({ P, S }: { P: Persona; S: J7State }) {
  const cb = (c: string) => P.comps.find((x) => x.id === c)!;
  return (
    <section className="ds-sheet" aria-labelledby="rec-h" style={{ display: 'grid', gap: 18 }}>
      <h2 id="rec-h" className="voice t24" style={{ margin: 0 }}>Every change, with its reason and its limits.</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
        {LADDER.map((l) => <div key={l.cls} style={{ background: 'var(--paper)', borderRadius: 12, padding: 12, display: 'grid', gap: 6, alignContent: 'start' }}><span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14 }}><Glyph k={CLS_GLYPH[l.cls]} />{l.cls}</span><span className="t14 muted">{l.counts}</span></div>)}
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <AnimatePresence initial={false}>
          {S.record.map((r) => (
            <motion.li key={r.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 12, padding: '12px 0', borderTop: '1px solid var(--rule)' }}>
              <span style={{ paddingTop: 2 }}><Glyph k={CLS_GLYPH[r.cls]} size={18} /></span>
              <div style={{ display: 'grid', gap: 4 }}>
                <p style={{ margin: 0 }}><span className="num" style={{ fontFamily: 'var(--data)', fontSize: 13, color: 'var(--ink-3)' }}>{r.at} · </span><strong>{cb(r.comp).label}</strong> · {r.cls}</p>
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
