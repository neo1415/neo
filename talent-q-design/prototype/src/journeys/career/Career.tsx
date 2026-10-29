// J7 Career Intelligence (career atlas). The global Q drives it (see q/skills/talent-a.ts): discovery,
// transferable skills, evidence vs gaps, a plan with practice, work samples and learning, assessment and
// reassessment, goal changes, and openings from real listings. This canvas shows and refines the work;
// buttons here act through Q's operations so the conversation records what happened.
// Evidence model: practice is private and never moves the map; only reviewed work or a verified credential does.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Glyph, GLYPH_LABEL, type GlyphKind } from '../../ds/Glyph';
import { Canvas, useNarrow, type ViewDef } from '../../ds/Workspace';
import { Link } from '../../ui/router';
import { actorOf, simNow, update, useWorld, type World } from '../../mock/world';
import { runAction, useViewState } from '../../q/core/engine';
import type { QAction } from '../../state/domain';
import { BandAtlas, OccList, RadialAtlas } from './Atlas';
import { compById, daysBetween, mentionOf, employerView, fmtDay, gapsFor, j7, jobsFor, occById, overdue, personaFor, readJ7, sampleFor, shown, simISO, stateOf, type J7State } from './j7';
import type { CState, Persona, RecClass } from './personas';

type View = 'atlas' | 'list' | 'skills' | 'role' | 'plan' | 'progress' | 'record' | 'opps';
const CLS_GLYPH: Record<RecClass, CState> = { 'Practice attempt': 'practice', 'Work sample submitted': 'partial', 'Assessed by rubric and reviewer': 'full', 'Verified credential': 'verified' };
const LADDER: { cls: RecClass; counts: string }[] = [
  { cls: 'Practice attempt', counts: 'Private. Never counts as proof; the map does not move.' },
  { cls: 'Work sample submitted', counts: 'Counts as partial until someone reviews it.' },
  { cls: 'Assessed by rubric and reviewer', counts: 'Counts as evidenced. The map moves.' },
  { cls: 'Verified credential', counts: 'Issuer confirmed. Counts as verified.' },
];
const run = (a: QAction) => void runAction(a);
const say = (text: string) => run({ label: text, act: { t: 'say', text } });
const op = (name: string, args: Record<string, unknown> = {}) => run({ label: name, act: { t: 'do', op: name, args } });
const STATE_TEXT = (k: CState) => (k === 'unclear' ? 'Mentioned, not shown yet' : GLYPH_LABEL[k]);

export function J7() {
  const w = useWorld((x) => x);
  const narrow = useNarrow();
  const a = actorOf(w);
  const pid = a.personId ?? 'p_amaka';
  const P = personaFor(pid);
  const stored = w.j7[pid] as J7State | undefined;
  // Persist the person's career space the first time they open it (private, PERSON-scoped).
  useEffect(() => { if (!stored || stored.v !== 2) update((d) => { j7(d, pid); }); }, [stored, pid]);
  const S = readJ7(w, pid);
  const [view, setView] = useViewState<View>('view', 'atlas');
  const [occSel, setOcc] = useViewState<string | null>('occ', null);
  const [reach, setReach] = useState(false);
  const [large, setLarge] = useState(false);
  const [openFam, setOpenFam] = useState<string | null>(null);
  const st = (c: string) => stateOf(w, pid, S, c);
  const goal = occById(P, S.goal) ?? P.occs[0];
  const occs = large && P.extra.length ? [...P.occs, ...P.extra] : P.occs;
  const occ = (occSel && occById(P, occSel)) ? occSel : (view === 'role' ? goal.id : null);
  const shownCount = P.comps.filter((c) => shown(st(c.id))).length;
  const openRole = (oid: string) => { setOcc(oid); setView('role'); };
  const views: ViewDef<View>[] = [{ id: 'atlas', label: 'Atlas' }, { id: 'list', label: 'List' }, { id: 'skills', label: 'Your skills' }, { id: 'role', label: occ ? occById(P, occ)!.short : goal.short }, { id: 'plan', label: 'Plan' }, { id: 'progress', label: 'Progress' }, { id: 'record', label: 'Record' }, { id: 'opps', label: 'Openings' }];
  const title = view === 'record' ? 'Every change, with its reason and its limits' : view === 'plan' ? planTitle(w, S, goal.label) : view === 'progress' ? 'Progress over time' : view === 'skills' ? (P.id === 'switcher' ? 'What carries over from sales, and what doesn’t yet' : 'What you’ve shown, and what you’ve only mentioned')
    : view === 'opps' ? 'Openings, from real listings' : view === 'role' ? (occById(P, occ ?? goal.id)!.label) : `Where you could go, ${a.first}`;
  const d = simNow(w);
  return (
    <Canvas title={title} kicker={<span>{a.first} · goal: {goal.label} · {shownCount} of {P.comps.length} shown · private</span>} views={views} view={view} setView={(v) => { if (v === 'role' && !occ) setOcc(goal.id); setView(v); }} open onClose={() => {}}
      aside={<div className="talent-a-clock" role="group" aria-label="Demo clock"><span className="t14 muted">{w.session.offsetDays ? 'Simulated date' : 'Today'}: <b className="num">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })}</b></span><button type="button" className="ds-btn quiet" onClick={() => op('ta.time.skip', { days: 21 })}>Simulate 3 weeks later <span className="ds-sim">Demo</span></button></div>}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          {view === 'atlas' && (narrow
            ? <BandAtlas occs={occs} st={st} sel={occ} onSel={openRole} reach={reach} setReach={setReach} moved={S.moved} goal={S.goal} fams={P.families} />
            : <RadialAtlas occs={occs} st={st} sel={occ} onSel={openRole} reach={reach} setReach={setReach} large={large} openFam={openFam} setOpenFam={setOpenFam} moved={S.moved} fams={P.families} goal={S.goal} />)}
          {view === 'atlas' && P.extra.length > 0 && <div className="ds-actions"><button type="button" className="ds-filter" aria-pressed={large} onClick={() => { setLarge(!large); setOpenFam(null); }}>{large ? 'Back to the nearest' : `Show ${P.occs.length + P.extra.length} occupations (illustrative)`}</button></div>}
          {view === 'list' && <OccList occs={occs} st={st} reach={reach} onSel={openRole} cb={(id) => compById(P, id)} />}
          {view === 'skills' && <SkillsView w={w} pid={pid} P={P} S={S} st={st} />}
          {view === 'role' && <Role w={w} pid={pid} P={P} S={S} oid={occ ?? goal.id} st={st} />}
          {view === 'plan' && <PlanView w={w} P={P} S={S} />}
          {view === 'progress' && <Progress P={P} S={S} />}
          {view === 'record' && <RecordView P={P} S={S} />}
          {view === 'opps' && <Openings w={w} pid={pid} P={P} S={S} />}
          {['skills', 'role', 'opps', 'record'].includes(view) && <EmployerBox w={w} pid={pid} />}
        </motion.div>
      </AnimatePresence>
    </Canvas>
  );
}
/** Key with this journey's wording: "unclear" means mentioned by you, not yet shown. */
function Key() {
  return <ul aria-label="Key" className="talent-a-key t14">{(['verified', 'full', 'partial', 'practice', 'unclear', 'none'] as GlyphKind[]).map((k) => <li key={k}><Glyph k={k} size={16} />{STATE_TEXT(k)}</li>)}</ul>;
}
function planTitle(w: World, S: J7State, goal: string) {
  const left = S.plan.filter((s) => !s.done); const od = overdue(w, S);
  return left.length ? `${left.length} steps toward ${goal}${od.length ? `, ${od.length} past their date` : ''}` : `Every planned step for ${goal} is done`;
}

function EmployerBox({ w, pid }: { w: World; pid: string }) {
  const v = employerView(w, pid);
  return (
    <section className="ds-sheet talent-a-employer" aria-labelledby="emp-h">
      <h2 id="emp-h" className="lab" style={{ margin: 0 }}>What employers can see right now</h2>
      <ul>{v.map((x) => <li key={x.org}><b>{x.name}</b><span className="num">{x.items.length ? `${x.items.length} ${x.items.length === 1 ? 'item' : 'items'}` : 'nothing'}</span><span className="t14 muted">{x.items.map((i) => i.title).slice(0, 2).join('; ')}</span></li>)}</ul>
      <p className="t14 muted" style={{ margin: 0 }}>Your career plan, practice and assessments are private. They never become visible on their own; sharing is a separate step you approve.</p>
    </section>
  );
}

function SkillsView({ w, pid, P, S, st }: { w: World; pid: string; P: Persona; S: J7State; st: (c: string) => CState }) {
  const goal = occById(P, S.goal)!;
  const src = P.comps.find((c) => c.from)?.from;
  const ev = src ? w.evidence.find((e) => e.evidenceId === src) : null;
  const rows = [...P.comps].sort((x, y) => Number(goal.needs.includes(y.id)) - Number(goal.needs.includes(x.id)));
  return (
    <section className="ds-sheet" aria-labelledby="sk-h" style={{ display: 'grid', gap: 14 }}>
      {ev && (
        <div className="talent-a-source">
          <Glyph k="verified" title="Verified" />
          <span><b>{ev.title}</b><span className="t14 muted" style={{ display: 'block' }}>{ev.source} · {ev.verification === 'VERIFIED' ? 'verified' : 'not verified'} · {ev.shows}</span></span>
        </div>
      )}
      <h2 id="sk-h" className="voice t24" style={{ margin: 0 }}>{P.id === 'switcher' ? `Evidence vs gaps for ${goal.label}` : `Your skills, against ${goal.label}`}</h2>
      <Key />
      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead><tr><th scope="col">Competency</th><th scope="col">State</th><th scope="col" className="talent-a-hide-narrow">Basis</th><th scope="col">For your goal?</th></tr></thead>
          <tbody>{rows.map((c) => { const k = st(c.id); return (
            <tr key={c.id}>
              <th scope="row" style={{ fontWeight: 600 }}>{c.label}<span className="t14 muted" style={{ display: 'block', fontWeight: 400 }}>{c.plain}</span></th>
              <td><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Glyph k={k} />{c.from && k === 'partial' ? 'Transferable, partial' : STATE_TEXT(k)}</span></td>
              <td className="talent-a-hide-narrow t14">{k === 'unclear' && mentionOf(w, pid, S, c.id) ? `You said: “${mentionOf(w, pid, S, c.id)!.replace(/\.$/, '').slice(0, 90)}” (claim)` : c.evidence && k !== 'none' ? `${c.evidence.title}. Doesn’t show: ${c.evidence.notProves.replace(/\.$/, '').toLowerCase()}.` : k === 'unclear' ? (c.why ?? 'Mentioned; not shown yet.') : k === 'full' ? 'Reviewed work sample' : k === 'practice' ? 'Practice only (private, not proof)' : '—'}</td>
              <td className="t14">{goal.needs.includes(c.id) ? (shown(k) ? 'Needed · shown' : 'Needed · gap') : 'Not for this goal'}</td>
            </tr>); })}</tbody>
        </table>
      </div>
      <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say('make me a plan')}>Plan the gaps</button><button type="button" className="ds-btn" onClick={() => say('quiz me')}>Practise one</button></div>
    </section>
  );
}

function Role({ w, pid, P, S, oid, st }: { w: World; pid: string; P: Persona; S: J7State; oid: string; st: (c: string) => CState }) {
  const o = occById(P, oid)!;
  const g = gapsFor(w, pid, S, o);
  const [openC, setOpenC] = useState<string | null>(null);
  const jobs = jobsFor(w, P, oid);
  const quiz = S.quiz && o.needs.includes(S.quiz.comp) ? S.quiz : null;
  const pr = quiz ? P.practices.find((x) => x.comp === quiz.comp)! : null;
  return (
    <section className="ds-sheet" aria-labelledby="role-h" style={{ display: 'grid', gap: 16 }}>
      <div className="talent-a-rolehead">
        <div style={{ display: 'grid', gap: 6 }}>
          <h2 id="role-h" className="voice t24" style={{ margin: 0 }}>{g.length ? `${o.needs.length - g.length} of ${o.needs.length} shown. ${g.length} to go.` : 'Every competency shown. You could apply today.'}</h2>
          {o.demand && <p className="t14 muted" style={{ margin: 0 }}>{o.demand}.</p>}
        </div>
        {S.goal === oid ? <span className="ds-tag" data-k="busy">Your goal</span> : <button type="button" className="ds-btn" onClick={() => op('ta.j7.goal.set', { occ: oid })}>Make this my goal</button>}
      </div>
      <Key />
      <ul className="talent-a-comps">
        {o.needs.map((cid) => {
          const c = compById(P, cid); const k = st(cid); const isOpen = openC === cid;
          const as = [...S.assessments].reverse().find((x) => x.comp === cid);
          const sm = sampleFor(P, cid);
          const ev = as && sm ? { title: sm.title, cls: `Assessed by rubric and reviewer · level ${as.level} of 4`, proves: sm.proves, notProves: sm.not } : k !== 'none' && k !== 'unclear' ? c.evidence : undefined;
          const hasPractice = P.practices.some((x) => x.comp === cid);
          return (
            <li key={cid}>
              <div className="talent-a-comprow">
                <motion.span key={k} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }} style={{ display: 'inline-flex' }}><Glyph k={k} size={22} title={STATE_TEXT(k)} /></motion.span>
                <div style={{ minWidth: 0 }}><p style={{ margin: 0, fontWeight: 600 }}>{c.label}</p><p className="t14 muted" style={{ margin: 0 }}>{c.from && k === 'partial' ? 'Transferable from sales, partial' : STATE_TEXT(k)} · {c.plain}</p></div>
                <span className="ds-actions" style={{ justifyContent: 'flex-end' }}>
                  {ev && <button type="button" className="ds-btn quiet" aria-expanded={isOpen} onClick={() => setOpenC(isOpen ? null : cid)}>{isOpen ? 'Hide' : 'Evidence'}</button>}
                  {!shown(k) && hasPractice && !quiz && <button type="button" className="ds-btn quiet" onClick={() => op('ta.j7.quiz.start', { comp: cid })}>Practise</button>}
                  {sm && (!as || as.round === 1) && <button type="button" className="ds-btn" onClick={() => op('ta.j7.sample.submit', { comp: cid })}>{as ? 'Submit improved version' : 'Submit work sample'}</button>}
                </span>
              </div>
              <AnimatePresence initial={false}>
                {isOpen && ev && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                    <div className="talent-a-evidence"><span className="lab">{ev.cls}</span><p style={{ margin: 0, fontWeight: 600 }}>{ev.title}</p><p className="t14" style={{ margin: 0 }}><strong>Proves: </strong>{ev.proves}</p><p className="t14" style={{ margin: 0 }}><strong>Does not prove: </strong>{ev.notProves}</p>
                      {as && <ul className="talent-a-rubric">{as.rubric.map((r) => <li key={r.c}><Glyph k={r.ok ? 'full' : 'partial'} size={16} /><span className="t14">{r.c} · {r.ok ? 'met' : 'not yet'}</span></li>)}</ul>}</div>
                  </motion.div>
                )}
              </AnimatePresence>
              {quiz && pr && quiz.comp === cid && (
                <div className="talent-a-quiz">
                  <div className="talent-a-quizhead"><span className="lab">Practice · private · unscored</span><span className="ds-sim">Not proof</span></div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{pr.question}</p>
                  <div role="group" aria-label="Choose an approach" style={{ display: 'grid', gap: 8 }}>
                    {pr.options.map((x, i) => <button key={x.id} type="button" className="ds-opt" aria-pressed={quiz.pick === x.id} disabled={!!quiz.pick && quiz.pick !== x.id} onClick={() => !quiz.pick && op('ta.j7.quiz.answer', { opt: x.id })}><span><b>{'ABC'[i]}.</b> {x.code ? <code>{x.text}</code> : x.text}</span></button>)}
                  </div>
                  {quiz.pick && <p className="ds-note" style={{ margin: 0 }} aria-live="polite">{pr.feedback[pr.options.find((x) => x.id === quiz.pick)!.verdict]} Logged as private practice. Your map didn’t move.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {jobs.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <h3 className="lab" style={{ margin: 0 }}>Real openings for this role</h3>
          {jobs.map((j) => <JobLine key={j.id} w={w} pid={pid} j={j} gaps={g.map((x) => compById(P, x).label)} total={o.needs.length} />)}
        </div>
      )}
    </section>
  );
}

function JobLine({ w, pid, j, gaps, total }: { w: World; pid: string; j: World['jobs'][number]; gaps: string[]; total: number }) {
  const org = w.orgs.find((o) => o.id === j.orgId)?.name ?? '';
  const app = w.applications.find((x) => x.jobId === j.id && x.personId === pid);
  const age = daysBetween(j.posted, simISO(w));
  return (
    <div className="talent-a-jobline">
      <span><b>{j.title}</b> <span className="muted">· {org} · {j.location} · {j.pay}</span>
        <span className="t14 muted" style={{ display: 'block' }}>You show {total - gaps.length} of {total}{gaps.length ? `; still to show ${gaps.join(', ').toLowerCase()}` : ''}. Posted {fmtDay(j.posted)}{age > 30 ? ` (${age} days ago; may be close to filled)` : ''}.{app ? ` You applied: ${app.status === 'NOT_PROGRESSING' ? 'not progressed' : app.status.toLowerCase()}.` : ''}</span></span>
      <span className="ds-actions"><span className="ds-tag" data-k={j.status === 'CLOSED' ? 'risk' : gaps.length ? undefined : 'ok'}>{j.status === 'CLOSED' ? 'Closed' : gaps.length ? 'Build first' : 'Ready'}</span><Link className="ds-btn quiet" to={`/c/jobs/${j.id}`}>Listing</Link></span>
    </div>
  );
}

function Openings({ w, pid, P, S }: { w: World; pid: string; P: Persona; S: J7State }) {
  const occIds = [S.goal, ...Object.keys(P.jobs).filter((x) => x !== S.goal)];
  const seen = new Set<string>();
  const rows = occIds.flatMap((oid) => jobsFor(w, P, oid).filter((j) => !seen.has(j.id) && seen.add(j.id)).map((j) => ({ j, o: occById(P, oid)! })));
  return (
    <section className="ds-sheet" aria-labelledby="op-h" style={{ display: 'grid', gap: 12 }}>
      <h2 id="op-h" className="voice t24" style={{ margin: 0 }}>{rows.length ? `${rows.length} real listings near your goals. Employers decide; this is a reading, not a promise.` : 'No listings linked to your goals right now.'}</h2>
      {rows.map(({ j, o }) => <div key={j.id} style={{ display: 'grid', gap: 4 }}><span className="lab">{o.label}{o.id === S.goal ? ' · your goal' : ''}</span><JobLine w={w} pid={pid} j={j} gaps={gapsFor(w, pid, S, o).map((x) => compById(P, x).label)} total={o.needs.length} /></div>)}
    </section>
  );
}

function PlanView({ w, P, S }: { w: World; P: Persona; S: J7State }) {
  const goal = occById(P, S.goal)!;
  const t = simNow(w).getTime();
  const left = S.plan.filter((x) => !x.done);
  return (
    <section className="ds-sheet" aria-labelledby="plan-h" style={{ display: 'grid', gap: 14 }}>
      <h2 id="plan-h" className="voice t24" style={{ margin: 0 }}>{left.length ? `About ${Math.round(left.reduce((n, x) => n + x.minutes, 0) / 6) / 10} hours left for ${goal.label}.` : `Every planned step for ${goal.label} is done.`}</h2>
      <p className="t14 muted" style={{ margin: 0 }}>Private to you. Practice and learning help you; only reviewed work or a credential changes your map. Ask Q to change anything, or use the buttons.</p>
      {!S.plan.length && <p className="muted" style={{ margin: 0 }}>Your plan is empty. Ask Q to suggest steps for your goal.</p>}
      <ol className="talent-a-plan">
        {S.plan.map((x, i) => {
          const late = !x.done && x.due && new Date(x.due).getTime() < t;
          const shared = x.goals.length > 1 && S.archived.some((a) => x.goals.includes(a.occ));
          return (
            <motion.li key={x.id} layout data-done={x.done ? '1' : undefined}>
              <span className="num voice t19" aria-hidden="true">{i + 1}</span>
              <span style={{ minWidth: 0 }}>
                <b style={{ fontWeight: 600, textDecoration: x.done ? 'line-through' : undefined }}>{x.title}</b>
                <span className="t14 muted" style={{ display: 'block' }}>{x.kind} · {x.minutes} min · {compById(P, x.comp).label}{x.due ? ` · ${x.done ? `done ${fmtDay(x.doneAt ?? x.due)}` : `by ${fmtDay(x.due)}`}` : ''}{x.progress && !x.done ? ` · ${x.progress}% through` : ''}</span>
                <span className="t14 muted" style={{ display: 'block' }}>{x.why}{x.note ? ` ${x.note}.` : ''}</span>
                <span className="talent-a-tags">{late && <span className="ds-tag" data-k="warn">Past its date</span>}{shared && <span className="ds-tag">Kept from your earlier goal</span>}{x.kind === 'Practice' && <span className="ds-tag">Private · not proof</span>}</span>
              </span>
              <span className="talent-a-stepbtns">
                <button type="button" className="ds-btn quiet" aria-label={`Move “${x.title}” up`} disabled={i === 0} onClick={() => op('ta.j7.step.move', { id: x.id, d: -1 })}>↑</button>
                <button type="button" className="ds-btn quiet" aria-label={`Move “${x.title}” down`} disabled={i === S.plan.length - 1} onClick={() => op('ta.j7.step.move', { id: x.id, d: 1 })}>↓</button>
                {x.kind !== 'Work sample' ? <button type="button" className="ds-btn quiet" aria-pressed={!!x.done} onClick={() => op('ta.j7.step.toggle', { id: x.id })}>{x.done ? 'Undo' : 'Done'}</button>
                  : !x.done ? <button type="button" className="ds-btn quiet" onClick={() => op('ta.j7.sample.submit', { comp: x.comp })}>Submit</button> : null}
                <button type="button" className="ds-btn quiet" aria-label={`Remove “${x.title}”`} onClick={() => op('ta.j7.step.remove', { id: x.id })}>×</button>
              </span>
            </motion.li>
          );
        })}
      </ol>
      {S.adjustments.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>Changed at your request: {S.adjustments.map((x) => `${compById(P, x.comp).label.toLowerCase()} (${x.choice})`).join(', ')}.</p>}
      {S.archived.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 44, display: 'flex', alignItems: 'center' }}>Archived goals ({S.archived.length})</summary>
          <ul style={{ margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>{S.archived.map((x) => <li key={x.occ + x.at}>{occById(P, x.occ)?.label} · archived {fmtDay(x.at)} · {x.why}. {x.steps.length ? `Steps kept with it: ${x.steps.map((s) => s.title).join('; ')}.` : ''} Its evidence stays in your record.</li>)}</ul>
        </details>
      )}
    </section>
  );
}

// Progress (SC-171): small multiples, one per competency; assessed points (same rubric) are joined, practice
// is a hollow dot, never joined or counted. Table fallback below.
function Progress({ P, S }: { P: Persona; S: J7State }) {
  const series = new Map<string, { at: string; level: number; cls: 'assessed' | 'practice' }[]>();
  for (const x of P.progress) series.set(x.comp, [...x.points]);
  for (const r of [...S.record].reverse()) {
    if (r.cls !== 'Practice attempt' && r.cls !== 'Assessed by rubric and reviewer') continue;
    if (!r.level) continue;
    (series.get(r.comp) ?? series.set(r.comp, []).get(r.comp)!).push({ at: r.at, level: r.level, cls: r.cls === 'Practice attempt' ? 'practice' : 'assessed' });
  }
  const all = [...series.entries()].filter(([, pts]) => pts.length);
  const rising = all.filter(([, pts]) => { const a = pts.filter((p) => p.cls === 'assessed'); return a.length > 1 && a[a.length - 1].level > a[0].level; });
  const W = 260, H = 128, padL = 22, padR = 46, padB = 22, padT = 10;
  return (
    <section className="ds-sheet" aria-labelledby="pr-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="pr-h" className="voice t24" style={{ margin: 0 }}>{rising.length ? `${rising.map(([c]) => compById(P, c).label).join(' and ')} rose on reassessment, same rubric.` : all.length ? 'Not enough assessed attempts yet to show a trend.' : 'Nothing to plot yet. Practice shows here as dots; assessed work as a line.'}</h2>
      <ul aria-label="Key" className="talent-a-key t14">
        <li><svg width="30" height="10" aria-hidden="true"><line x1="2" y1="5" x2="28" y2="5" stroke="var(--ink)" strokeWidth="2" /><circle cx="15" cy="5" r="4" fill="var(--ink)" stroke="var(--sheet)" strokeWidth="2" /></svg>Assessed (same rubric, comparable): joined</li>
        <li><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="var(--sheet)" stroke="var(--ink)" strokeWidth="1.5" /></svg>Practice: shown, never joined or counted</li>
      </ul>
      <div className="talent-a-multiples">
        {all.map(([comp, pts]) => {
          const xs = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, pts.length - 1);
          const ys = (l: number) => H - padB - ((l - 1) / 3) * (H - padB - padT);
          const assessed = pts.map((p, i) => ({ ...p, i })).filter((p) => p.cls === 'assessed');
          const last = assessed[assessed.length - 1];
          return (
            <figure key={comp} style={{ margin: 0, display: 'grid', gap: 6 }}>
              <figcaption style={{ fontWeight: 600 }}>{compById(P, comp).label}</figcaption>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${compById(P, comp).label}, level by date`}>
                {[1, 2, 3, 4].map((l) => <g key={l}><line x1={padL} x2={W - padR + 8} y1={ys(l)} y2={ys(l)} stroke="var(--rule)" strokeWidth={1} /><text x={4} y={ys(l) + 4} fontSize={10} fill="var(--ink-3)" fontFamily="var(--data)">{l}</text></g>)}
                {assessed.length > 1 && <polyline points={assessed.map((p) => `${xs(p.i)},${ys(p.level)}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
                {pts.map((p, i) => (
                  <g key={i} tabIndex={0} role="img" aria-label={`${fmtDay(p.at)}: level ${p.level}, ${p.cls === 'assessed' ? 'assessed' : 'practice, not counted'}`} className="ds-node">
                    <circle cx={xs(i)} cy={ys(p.level)} r={12} fill="transparent" />
                    <circle className="ring" cx={xs(i)} cy={ys(p.level)} r={4} fill={p.cls === 'assessed' ? 'var(--ink)' : 'var(--sheet)'} stroke={p.cls === 'assessed' ? 'var(--sheet)' : 'var(--ink)'} strokeWidth={p.cls === 'assessed' ? 2 : 1.5} />
                  </g>
                ))}
                {last && <text x={xs(last.i) + 10} y={ys(last.level) + 4} fontSize={11} fill="var(--ink)" fontFamily="var(--data)">L{last.level}</text>}
                {pts.map((p, i) => <text key={`t${i}`} x={xs(i)} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--ink-3)" fontFamily="var(--data)">{fmtDay(p.at)}</text>)}
              </svg>
            </figure>
          );
        })}
      </div>
      {all.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 44, display: 'flex', alignItems: 'center' }}>Show as a table</summary>
          <table className="ds-table" style={{ marginTop: 8 }}>
            <thead><tr><th scope="col">Competency</th><th scope="col">Date</th><th scope="col">Level</th><th scope="col">Kind</th></tr></thead>
            <tbody>{all.flatMap(([c, pts]) => pts.map((p, i) => <tr key={c + i}><td>{compById(P, c).label}</td><td className="num">{fmtDay(p.at)}</td><td className="num">{p.level}</td><td>{p.cls === 'assessed' ? 'Assessed' : 'Practice (not counted)'}</td></tr>))}</tbody>
          </table>
        </details>
      )}
    </section>
  );
}

function RecordView({ P, S }: { P: Persona; S: J7State }) {
  return (
    <section className="ds-sheet" aria-labelledby="rec-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="rec-h" className="voice t24" style={{ margin: 0 }}>{S.record.length ? `${S.record.length} ${S.record.length === 1 ? 'entry' : 'entries'}, newest first.` : 'Nothing recorded yet.'}</h2>
      <div className="talent-a-ladder">{LADDER.map((l) => <div key={l.cls}><span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14 }}><Glyph k={CLS_GLYPH[l.cls]} />{l.cls}</span><span className="t14 muted">{l.counts}</span></div>)}</div>
      <ol className="talent-a-record">
        {S.record.map((r) => (
          <motion.li key={r.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <span style={{ paddingTop: 2 }}><Glyph k={CLS_GLYPH[r.cls]} size={18} /></span>
            <div style={{ display: 'grid', gap: 4 }}>
              <p style={{ margin: 0 }}><span className="num talent-a-date">{fmtDay(r.at)} · </span><strong>{compById(P, r.comp).label}</strong> · {r.cls}</p>
              <p className="t14" style={{ margin: 0 }}>{r.why}{r.moved ? ` ${r.moved}.` : ''}</p>
              <p className="t14 muted" style={{ margin: 0 }}>Does not prove: {r.not}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
