// J7 Career Intelligence (career atlas). The global Q drives it (see q/skills/talent-a.ts): discovery,
// transferable skills, evidence vs gaps, a plan with practice, work samples and learning, assessment and
// reassessment, goal changes, and openings from real listings. This canvas shows and refines the work;
// buttons here act through Q's operations so the conversation records what happened.
// Evidence model: practice is private and never moves the map; only reviewed work or a verified credential does.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Glyph } from '../../ds/Glyph';
import { arrive, DUR, EASE } from '../../ds/motion';
import { Canvas, useNarrow, useWidth, type ViewDef } from '../../ds/Workspace';
import { Link } from '../../ui/router';
import { actorOf, simNow, update, useWorld, type World } from '../../mock/world';
import { runAction, useViewState } from '../../q/core/engine';
import type { QAction } from '../../state/domain';
import { BandAtlas, OccList, RadialAtlas } from './Atlas';
import { ProofKey, Route, STATE_WORD, isProof } from './Route';
import { compById, daysBetween, mentionOf, employerView, fmtDay, gapsFor, j7, jobsFor, occById, overdue, personaFor, readJ7, sampleFor, simISO, stateOf, type J7State } from './j7';
import type { CState, Persona, RecClass } from './personas';

type View = 'atlas' | 'list' | 'skills' | 'role' | 'plan' | 'progress' | 'record' | 'opps';
const CLS_GLYPH: Record<RecClass, CState> = { 'Practice attempt': 'practice', 'Work sample submitted': 'partial', 'Assessed by rubric and reviewer': 'full', 'Verified credential': 'verified' };
const run = (a: QAction) => void runAction(a);
const say = (text: string) => run({ label: text, act: { t: 'say', text } });
const op = (name: string, args: Record<string, unknown> = {}) => run({ label: name, act: { t: 'do', op: name, args } });
const STATE_TEXT = (k: CState) => STATE_WORD[k];

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
  const openRole = (oid: string) => { setOcc(oid); setView('role'); };
  // Seven tabs, not eight: the list is the atlas's accessible twin, so it lives under the Atlas tab (Hick's law).
  const views: ViewDef<View>[] = [{ id: 'atlas', label: 'Atlas' }, { id: 'skills', label: 'Your skills' }, { id: 'role', label: occ ? occById(P, occ)!.short : goal.short }, { id: 'plan', label: 'Plan' }, { id: 'progress', label: 'Progress' }, { id: 'record', label: 'Record' }, { id: 'opps', label: 'Openings' }];
  const title = view === 'record' ? 'Every change, with its reason and its limits' : view === 'plan' ? planTitle(w, S, goal.label) : view === 'progress' ? 'Progress over time' : view === 'skills' ? (P.id === 'switcher' ? 'What carries over from sales, and what doesn’t yet' : 'What you’ve shown, and what you’ve only mentioned')
    : view === 'opps' ? 'Openings, from real listings' : view === 'role' ? (occById(P, occ ?? goal.id)!.label) : `Where you could go, ${a.first}`;
  const d = simNow(w);
  const mapList = (
    <div className="talent-a-seg" role="group" aria-label="Show the atlas as">
      <button type="button" className="ds-filter" aria-pressed={view === 'atlas'} onClick={() => setView('atlas')}>Map</button>
      <button type="button" className="ds-filter" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
    </div>
  );
  return (
    <Canvas title={title} kicker={<span>Career atlas</span>} views={views} view={view === 'list' ? 'atlas' : view} setView={(v) => { if (v === 'role' && !occ) setOcc(goal.id); setView(v); }} open onClose={() => {}}
      aside={<div className="talent-a-clock" role="group" aria-label="Privacy and demo clock"><span className="ds-tag">Private to you</span><span className="t14 muted">{w.session.offsetDays ? 'Simulated date' : 'Today'} <b className="num">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })}</b></span><button type="button" className="ds-btn quiet" onClick={() => op('ta.time.skip', { days: 21 })}>Simulate 3 weeks later <span className="ds-sim">Demo</span></button></div>}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view === 'list' ? 'atlas' : view} {...arrive} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          {(view === 'atlas' || view === 'list') && <Route goal={goal.label} needs={goal.needs} st={st} comp={(id) => compById(P, id)} first={a.first} onOpen={() => openRole(goal.id)} />}
          {view === 'atlas' && (narrow
            ? <BandAtlas occs={occs} st={st} sel={occ} onSel={openRole} reach={reach} setReach={setReach} moved={S.moved} goal={S.goal} fams={P.families} tools={mapList} />
            : <RadialAtlas occs={occs} st={st} sel={occ} onSel={openRole} reach={reach} setReach={setReach} large={large} openFam={openFam} setOpenFam={setOpenFam} moved={S.moved} fams={P.families} goal={S.goal} tools={mapList} />)}
          {view === 'atlas' && P.extra.length > 0 && <div className="ds-actions"><button type="button" className="ds-filter" aria-pressed={large} onClick={() => { setLarge(!large); setOpenFam(null); }}>{large ? 'Back to the nearest' : `Show ${P.occs.length + P.extra.length} occupations (illustrative)`}</button></div>}
          {view === 'list' && <OccList occs={occs} st={st} reach={reach} onSel={openRole} cb={(id) => compById(P, id)} tools={mapList} />}
          {view === 'skills' && <SkillsView w={w} pid={pid} P={P} S={S} st={st} />}
          {view === 'role' && <Role w={w} pid={pid} P={P} S={S} oid={occ ?? goal.id} st={st} />}
          {view === 'plan' && <PlanView w={w} P={P} S={S} />}
          {view === 'progress' && <Progress P={P} S={S} st={st} />}
          {view === 'record' && <RecordView P={P} S={S} />}
          {view === 'opps' && <Openings w={w} pid={pid} P={P} S={S} />}
          {['skills', 'role', 'opps', 'record'].includes(view) && <EmployerBox w={w} pid={pid} />}
        </motion.div>
      </AnimatePresence>
    </Canvas>
  );
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

function basisOf(w: World, pid: string, S: J7State, c: Persona['comps'][number], k: CState) {
  const m = k === 'unclear' ? mentionOf(w, pid, S, c.id) : null;
  if (m) { const t = m.replace(/\.$/, ''); const cut = t.length > 90 ? `${t.slice(0, 90).replace(/\s+\S*$/, '')}…` : t; return `You said: “${cut}”. A claim until it’s shown.`; }
  if (c.evidence && k !== 'none') return `${c.evidence.title}. Doesn’t show: ${c.evidence.notProves.replace(/\.$/, '').toLowerCase()}.`;
  if (k === 'unclear') return c.why ?? 'Mentioned; not shown yet.';
  if (k === 'full') return 'A reviewed work sample.';
  if (k === 'practice') return 'Practice only. Private, and not proof.';
  return null;
}

function SkillsView({ w, pid, P, S, st }: { w: World; pid: string; P: Persona; S: J7State; st: (c: string) => CState }) {
  const goal = occById(P, S.goal)!;
  const src = P.comps.find((c) => c.from)?.from;
  const ev = src ? w.evidence.find((e) => e.evidenceId === src) : null;
  const needed = P.comps.filter((c) => goal.needs.includes(c.id));
  const other = P.comps.filter((c) => !goal.needs.includes(c.id));
  const row = (c: Persona['comps'][number]) => {
    const k = st(c.id); const basis = basisOf(w, pid, S, c, k);
    return (
      <li key={c.id} data-proof={isProof(k) ? '1' : undefined}>
        <Glyph k={k} size={22} title={STATE_TEXT(k)} />
        <div style={{ minWidth: 0, display: 'grid', gap: 2 }}>
          <p style={{ margin: 0 }}><b>{c.label}</b> <span className="t14 muted">· {c.plain}</span></p>
          {basis && <p className="t14 muted" style={{ margin: 0 }}>{basis}</p>}
        </div>
        <span className={`talent-a-statepill${isProof(k) ? ' is-proof' : ''}`}>{c.from && k === 'partial' ? 'Transferable, partial' : STATE_TEXT(k)}</span>
      </li>
    );
  };
  const n = needed.filter((c) => isProof(st(c.id))).length;
  return (
    <section className="ds-sheet" aria-labelledby="sk-h" style={{ display: 'grid', gap: 16 }}>
      {ev && (
        <div className="talent-a-source">
          <Glyph k="verified" title="Verified" />
          <span><span className="lab" style={{ display: 'block' }}>Where this starts</span><b>{ev.title}</b><span className="t14 muted" style={{ display: 'block' }}>{ev.source} · {ev.verification === 'VERIFIED' ? 'verified' : 'not verified'} · {ev.shows}</span></span>
        </div>
      )}
      <h2 id="sk-h" className="voice t24" style={{ margin: 0 }}>{P.id === 'switcher' ? `Evidence vs gaps for ${goal.label}: ${n} of ${needed.length} shown` : `Your skills against ${goal.label}: ${n} of ${needed.length} shown`}</h2>
      <ProofKey />
      <div style={{ display: 'grid', gap: 6 }}>
        <h3 className="lab" style={{ margin: 0 }}>Needed for {goal.label}</h3>
        <ul className="talent-a-skilllist">{needed.map(row)}</ul>
      </div>
      {other.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <h3 className="lab" style={{ margin: 0 }}>Also yours, not needed for this goal</h3>
          <ul className="talent-a-skilllist">{other.map(row)}</ul>
        </div>
      )}
      <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say('make me a plan')}>Plan the gaps</button><button type="button" className="ds-btn" onClick={() => say('quiz me')}>Practise one (private)</button></div>
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
  const shownIds = o.needs.filter((c) => !g.includes(c));
  const item = (cid: string) => {
    const c = compById(P, cid); const k = st(cid); const isOpen = openC === cid;
    const as = [...S.assessments].reverse().find((x) => x.comp === cid);
    const sm = sampleFor(P, cid);
    const ev = as && sm ? { title: sm.title, cls: `Assessed by rubric and reviewer · level ${as.level} of 4`, proves: sm.proves, notProves: sm.not } : k !== 'none' && k !== 'unclear' ? c.evidence : undefined;
    const hasPractice = P.practices.some((x) => x.comp === cid);
    return (
      <li key={cid}>
        <div className="talent-a-comprow">
          {/* MO-050: the glyph is keyed by state, so a change scales in once (feedback, DUR.normal). */}
          <motion.span key={k} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: DUR.normal, ease: EASE.enter }} style={{ display: 'inline-flex' }}><Glyph k={k} size={22} title={STATE_TEXT(k)} /></motion.span>
          <div style={{ minWidth: 0 }}><p style={{ margin: 0, fontWeight: 600 }}>{c.label}</p><p className="t14 muted" style={{ margin: 0 }}>{c.from && k === 'partial' ? 'Transferable from sales, partial' : STATE_TEXT(k)} · {c.plain}</p></div>
          <span className="ds-actions" style={{ justifyContent: 'flex-end' }}>
            {ev && <button type="button" className="ds-btn quiet" aria-expanded={isOpen} onClick={() => setOpenC(isOpen ? null : cid)}>{isOpen ? 'Hide evidence' : 'Evidence'}</button>}
            {!isProof(k) && hasPractice && !quiz && <button type="button" className="ds-btn quiet" onClick={() => op('ta.j7.quiz.start', { comp: cid })}>Practise</button>}
            {sm && (!as || as.round === 1) && <button type="button" className="ds-btn" onClick={() => op('ta.j7.sample.submit', { comp: cid })}>{as ? 'Submit improved version' : 'Submit work sample'}</button>}
          </span>
        </div>
        <AnimatePresence initial={false}>
          {isOpen && ev && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', transition: { duration: DUR.normal, ease: EASE.enter } }} exit={{ opacity: 0, height: 0, transition: { duration: DUR.fast, ease: EASE.exit } }} style={{ overflow: 'hidden' }}>
              <div className="talent-a-evidence"><span className="lab">{ev.cls}</span><p style={{ margin: 0, fontWeight: 600 }}>{ev.title}</p>
                <div className="talent-a-proves"><p className="t14" style={{ margin: 0 }}><strong>Proves</strong>{ev.proves}</p><p className="t14" style={{ margin: 0 }}><strong>Does not prove</strong>{ev.notProves}</p></div>
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
            {quiz.pick && <p className="talent-a-feedback" aria-live="polite">{pr.feedback[pr.options.find((x) => x.id === quiz.pick)!.verdict]} <span className="muted">Logged as private practice. Your map didn’t move: practice isn’t proof.</span></p>}
          </div>
        )}
      </li>
    );
  };
  return (
    <section className="ds-sheet" aria-labelledby="role-h" style={{ display: 'grid', gap: 16 }}>
      <div className="talent-a-rolehead">
        <div style={{ display: 'grid', gap: 6 }}>
          <h2 id="role-h" className="voice t24" style={{ margin: 0 }}>{g.length ? `${o.needs.length - g.length} of ${o.needs.length} shown. ${g.length} to go.` : 'Every competency shown. You could apply today.'}</h2>
          {o.demand && <p className="t14 muted" style={{ margin: 0 }}>{o.demand}.</p>}
        </div>
        {S.goal === oid ? <span className="ds-tag" data-k="ok">Your goal</span> : <button type="button" className="ds-btn" onClick={() => op('ta.j7.goal.set', { occ: oid })}>Make this my goal</button>}
      </div>
      <ProofKey />
      {g.length > 0 && <div style={{ display: 'grid', gap: 4 }}><h3 className="lab" style={{ margin: 0 }}>Still to show · {g.length}</h3><ul className="talent-a-comps">{g.map(item)}</ul></div>}
      {shownIds.length > 0 && <div style={{ display: 'grid', gap: 4 }}><h3 className="lab" style={{ margin: 0 }}>Shown with proof · {shownIds.length}</h3><ul className="talent-a-comps">{shownIds.map(item)}</ul></div>}
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

const KIND: Record<string, { proof: boolean; note: string }> = {
  'Work sample': { proof: true, note: 'Counts as proof once reviewed' }, Credential: { proof: true, note: 'Counts as proof once verified' },
  Practice: { proof: false, note: 'Private practice · not proof' }, Learning: { proof: false, note: 'Learning · prepares you, not proof' }, Conversation: { proof: false, note: 'Prepares you, not proof' },
};
function PlanView({ w, P, S }: { w: World; P: Persona; S: J7State }) {
  const goal = occById(P, S.goal)!;
  const t = simNow(w).getTime();
  const left = S.plan.filter((x) => !x.done);
  const done = S.plan.length - left.length;
  const late = overdue(w, S).length;
  const hours = Math.round(left.reduce((n, x) => n + x.minutes, 0) / 6) / 10;
  const proofSteps = left.filter((x) => KIND[x.kind]?.proof).length;
  return (
    <section className="ds-sheet" aria-labelledby="plan-h" style={{ display: 'grid', gap: 14 }}>
      <h2 id="plan-h" className="voice t24" style={{ margin: 0 }}>{left.length ? `About ${hours} hours left for ${goal.label}.` : `Every planned step for ${goal.label} is done. Well done.`}</h2>
      {S.plan.length > 0 && (
        <div className="talent-a-planmeter">
          <div className="talent-a-segs" aria-hidden="true">{S.plan.map((x) => { const isLate = !x.done && x.due && new Date(x.due).getTime() < t; return <span key={x.id} data-done={x.done ? '1' : undefined} data-late={isLate ? '1' : undefined} data-proof={KIND[x.kind]?.proof ? '1' : undefined} />; })}</div>
          <p className="t14" style={{ margin: 0 }}><b className="num">{done} of {S.plan.length}</b> done{late ? <> · <span style={{ color: 'var(--warn)' }}>{late} past {late === 1 ? 'its' : 'their'} date</span></> : null}{proofSteps ? ` · ${proofSteps} ${proofSteps === 1 ? 'step makes' : 'steps make'} proof` : ''}</p>
        </div>
      )}
      <p className="t14 muted" style={{ margin: 0 }}>Private to you. Practice and learning get you ready; only reviewed work or a credential moves your map. Ask Q to change anything, or use the buttons.</p>
      {!S.plan.length && <div className="talent-a-empty"><p style={{ margin: 0 }}>No steps yet.</p><button type="button" className="ds-btn primary" onClick={() => say('make me a plan')}>Ask Q for a plan</button></div>}
      <ol className="talent-a-plan">
        {S.plan.map((x, i) => {
          const isLate = !x.done && x.due && new Date(x.due).getTime() < t;
          const shared = x.goals.length > 1 && S.archived.some((a) => x.goals.includes(a.occ));
          const kd = KIND[x.kind] ?? { proof: false, note: x.kind };
          return (
            <motion.li key={x.id} layout transition={{ duration: DUR.slow, ease: EASE.standard }} data-done={x.done ? '1' : undefined}>
              <span className="talent-a-stepn num" data-proof={kd.proof ? '1' : undefined} aria-hidden="true">{x.done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg> : i + 1}</span>
              <span style={{ minWidth: 0 }}>
                <b style={{ fontWeight: 600, textDecoration: x.done ? 'line-through' : undefined }}>{x.title}</b>
                <span className="t14 muted" style={{ display: 'block' }}>{x.kind} · {x.minutes} min · {compById(P, x.comp).label}{x.due ? ` · ${x.done ? `done ${fmtDay(x.doneAt ?? x.due)}` : `by ${fmtDay(x.due)}`}` : ''}{x.progress && !x.done ? ` · ${x.progress}% through` : ''}</span>
                <span className="t14 muted" style={{ display: 'block' }}>{x.why}{x.note ? ` ${x.note}.` : ''}</span>
                <span className="talent-a-tags"><span className={`talent-a-kind${kd.proof ? ' is-proof' : ''}`}><Glyph k={kd.proof ? 'full' : 'practice'} size={14} />{kd.note}</span>{isLate && <span className="ds-tag" data-k="warn">Past its date</span>}{shared && <span className="ds-tag">Kept from your earlier goal</span>}</span>
              </span>
              <span className="talent-a-stepbtns">
                <button type="button" className="ds-btn quiet" aria-label={`Move “${x.title}” up`} disabled={i === 0} onClick={() => op('ta.j7.step.move', { id: x.id, d: -1 })}>↑</button>
                <button type="button" className="ds-btn quiet" aria-label={`Move “${x.title}” down`} disabled={i === S.plan.length - 1} onClick={() => op('ta.j7.step.move', { id: x.id, d: 1 })}>↓</button>
                {x.kind !== 'Work sample' ? <button type="button" className="ds-btn quiet" aria-pressed={!!x.done} onClick={() => op('ta.j7.step.toggle', { id: x.id })}>{x.done ? 'Undo' : 'Mark done'}</button>
                  : !x.done ? <button type="button" className="ds-btn" onClick={() => op('ta.j7.sample.submit', { comp: x.comp })}>Submit</button> : null}
                <button type="button" className="ds-btn quiet" aria-label={`Remove “${x.title}”`} onClick={() => op('ta.j7.step.remove', { id: x.id })}>×</button>
              </span>
            </motion.li>
          );
        })}
      </ol>
      {S.adjustments.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>Changed at your request: {S.adjustments.map((x) => `${compById(P, x.comp).label.toLowerCase()} (${x.choice})`).join(', ')}.</p>}
      {S.archived.length > 0 && (
        <details className="talent-a-details">
          <summary>Archived goals ({S.archived.length})</summary>
          <ul style={{ margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>{S.archived.map((x) => <li key={x.occ + x.at}>{occById(P, x.occ)?.label} · archived {fmtDay(x.at)} · {x.why}. {x.steps.length ? `Steps kept with it: ${x.steps.map((s) => s.title).join('; ')}.` : ''} Its evidence stays in your record.</li>)}</ul>
        </details>
      )}
    </section>
  );
}

// Progress (SC-171, MO-051). Information architecture: PROOF and PRACTICE never share a scale.
// Each competency is a small multiple: the level axis (1–4) carries assessed attempts only, joined because the
// rubric is the same; practice sits in its own lane underneath, labelled "doesn't count", never joined.
// X is real time (dates), so a three-week gap looks like three weeks. Hover/focus shows the point; a table twin
// follows. Competencies the goal needs with nothing yet are listed as a designed empty state, not hidden.
type Pt = { at: string; level: number; cls: 'assessed' | 'practice' };
function Progress({ P, S, st }: { P: Persona; S: J7State; st: (c: string) => CState }) {
  const goal = occById(P, S.goal)!;
  const series = new Map<string, Pt[]>();
  for (const x of P.progress) series.set(x.comp, [...x.points]);
  for (const r of [...S.record].reverse()) {
    if (r.cls !== 'Practice attempt' && r.cls !== 'Assessed by rubric and reviewer') continue;
    if (!r.level) continue;
    (series.get(r.comp) ?? series.set(r.comp, []).get(r.comp)!).push({ at: r.at, level: r.level, cls: r.cls === 'Practice attempt' ? 'practice' : 'assessed' });
  }
  const all = [...series.entries()].filter(([, pts]) => pts.length);
  const rising = all.map(([c, pts]) => ({ c, a: pts.filter((p) => p.cls === 'assessed') })).filter((x) => x.a.length > 1 && x.a[x.a.length - 1].level > x.a[0].level);
  const empty = goal.needs.filter((c) => !series.get(c)?.length);
  const nAssessed = all.reduce((n, [, pts]) => n + pts.filter((p) => p.cls === 'assessed').length, 0);
  const nPractice = all.reduce((n, [, pts]) => n + pts.filter((p) => p.cls === 'practice').length, 0);
  return (
    <section className="ds-sheet" aria-labelledby="pr-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="pr-h" className="voice t24" style={{ margin: 0 }}>{rising.length ? rising.map((x) => `${compById(P, x.c).label} rose from level ${x.a[0].level} to ${x.a[x.a.length - 1].level}`).join('; ') + ', on the same rubric.' : all.length ? 'Not enough assessed attempts yet to show a trend.' : 'Nothing to plot yet. Your first reviewed work sample starts a line.'}</h2>
      {all.length > 0 && (
        <dl className="talent-a-tally">
          <div data-proof="1"><dt>Assessed attempts</dt><dd className="num">{nAssessed}</dd><dd className="t14 muted">Counts. Same rubric each time, so they compare.</dd></div>
          <div><dt>Practice attempts</dt><dd className="num">{nPractice}</dd><dd className="t14 muted">Private. Never counted, never shared.</dd></div>
        </dl>
      )}
      <div className="talent-a-multiples">
        {all.map(([comp, pts]) => <Trend key={comp} label={compById(P, comp).label} pts={pts} k={st(comp)} needed={goal.needs.includes(comp)} />)}
      </div>
      {empty.length > 0 && (
        <div className="talent-a-empty">
          <p style={{ margin: 0 }}><b>No line yet</b> for {empty.map((c) => compById(P, c).label.toLowerCase()).join(', ')}.</p>
          <p className="t14 muted" style={{ margin: 0 }}>A line starts with your first reviewed work sample. Practice shows here too, but only as private dots.</p>
          <button type="button" className="ds-btn" onClick={() => say('make me a plan')}>Plan a work sample</button>
        </div>
      )}
      {all.length > 0 && (
        <details className="talent-a-details">
          <summary>Show as a table</summary>
          <div className="ds-table-wrap"><table className="ds-table" style={{ marginTop: 8 }}>
            <thead><tr><th scope="col">Competency</th><th scope="col">Date</th><th scope="col">Level</th><th scope="col">Kind</th></tr></thead>
            <tbody>{all.flatMap(([c, pts]) => pts.map((p, i) => <tr key={c + i}><td>{compById(P, c).label}</td><td className="num">{fmtDay(p.at)}</td><td className="num">{p.level}</td><td>{p.cls === 'assessed' ? 'Assessed (counts)' : 'Practice (not counted)'}</td></tr>))}</tbody>
          </table></div>
        </details>
      )}
    </section>
  );
}

function Trend({ label, pts, k, needed }: { label: string; pts: Pt[]; k: CState; needed: boolean }) {
  const [ref, W] = useWidth<HTMLDivElement>(320);
  const [hot, setHot] = useState<number | null>(null);
  const H = 176, padL = 76, padR = 40, padT = 12, lane = 26, axisB = 22;
  const plotB = H - axisB - lane - 8; // bottom of the level plot
  const times = pts.map((p) => new Date(p.at).getTime());
  const t0 = Math.min(...times), t1 = Math.max(...times);
  const xs = (t: number) => (t1 === t0 ? (padL + W - padR) / 2 : padL + ((t - t0) / (t1 - t0)) * (W - padL - padR));
  const ys = (l: number) => plotB - ((l - 1) / 3) * (plotB - padT);
  const laneY = plotB + 8 + lane / 2;
  const assessed = pts.map((p, i) => ({ ...p, i })).filter((p) => p.cls === 'assessed');
  const last = assessed[assessed.length - 1];
  const dates = [...new Set(pts.map((p) => fmtDay(p.at)))];
  const at = (p: Pt) => ({ x: xs(new Date(p.at).getTime()), y: p.cls === 'assessed' ? ys(p.level) : laneY });
  const hp = hot != null ? pts[hot] : null;
  return (
    <figure className="talent-a-trend">
      <figcaption><b>{label}</b><span className="t14 muted">{last ? ` · now level ${last.level} of 4 · practice dots below the line don’t count` : ' · practice only so far, which doesn’t count'}{needed ? '' : ' · not needed for your goal'}</span><span className={`talent-a-statepill${isProof(k) ? ' is-proof' : ''}`}>{STATE_TEXT(k)}</span></figcaption>
      <div ref={ref} style={{ minWidth: 0 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${label}: assessed level by date, with practice shown separately`}>
          {[1, 2, 3, 4].map((l) => <g key={l}><line x1={padL} x2={W - padR + 10} y1={ys(l)} y2={ys(l)} stroke="var(--rule)" strokeWidth={1} /><text x={padL - 10} y={ys(l) + 4} fontSize={11} textAnchor="end" fill="var(--ink-3)" fontFamily="var(--data)">Level {l}</text></g>)}
          <rect x={padL} y={plotB + 8} width={W - padL - padR + 10} height={lane} rx={6} fill="var(--paper)" />
          <text x={padL - 10} y={laneY + 4} fontSize={11} textAnchor="end" fill="var(--ink-3)" fontFamily="var(--data)">Practice</text>
          {assessed.length > 1 && <polyline points={assessed.map((p) => `${at(p).x},${at(p).y}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {pts.map((p, i) => { const q = at(p); const a = p.cls === 'assessed'; return (
            <g key={i} tabIndex={0} role="img" aria-label={`${fmtDay(p.at)}: level ${p.level}, ${a ? 'assessed, counts' : 'practice, not counted'}`} className="ds-node"
              onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(i)} onBlur={() => setHot(null)}>
              <circle cx={q.x} cy={q.y} r={14} fill="transparent" />
              <circle className="ring" cx={q.x} cy={q.y} r={a ? 5 : 4} fill={a ? 'var(--ink)' : 'var(--sheet)'} stroke={a ? 'var(--sheet)' : 'var(--ink-2)'} strokeWidth={a ? 2 : 1.5} />
            </g>); })}
          {last && hot == null && <text x={at(last).x + 10} y={at(last).y + 4} fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--data)">L{last.level}</text>}
          {dates.map((d) => { const p = pts.find((x) => fmtDay(x.at) === d)!; return <text key={d} x={xs(new Date(p.at).getTime())} y={H - 6} fontSize={11} textAnchor="middle" fill="var(--ink-3)" fontFamily="var(--data)">{d}</text>; })}
          {hp && (() => { const q = at(hp); const txt = `${fmtDay(hp.at)} · L${hp.level} · ${hp.cls === 'assessed' ? 'assessed' : 'practice'}`; const tw = txt.length * 6.6 + 16; const x = Math.min(W - tw - 2, Math.max(2, q.x - tw / 2)); const y = q.y - 34 < 0 ? q.y + 12 : q.y - 34; return <g pointerEvents="none"><rect x={x} y={y} width={tw} height={24} rx={6} fill="var(--ink)" /><text x={x + 8} y={y + 16} fontSize={12} fill="var(--paper)" fontFamily="var(--data)">{txt}</text></g>; })()}
        </svg>
      </div>
    </figure>
  );
}

const LADDER_SHORT: { cls: RecClass; short: string; counts: string }[] = [
  { cls: 'Practice attempt', short: 'Practice', counts: 'Private. Never moves the map.' },
  { cls: 'Work sample submitted', short: 'Work submitted', counts: 'Partial until reviewed.' },
  { cls: 'Assessed by rubric and reviewer', short: 'Reviewed', counts: 'Proof. The map moves.' },
  { cls: 'Verified credential', short: 'Verified', counts: 'Proof, issuer confirmed.' },
];
function RecordView({ P, S }: { P: Persona; S: J7State }) {
  const proofN = S.record.filter((r) => r.cls === 'Assessed by rubric and reviewer' || r.cls === 'Verified credential').length;
  return (
    <section className="ds-sheet" aria-labelledby="rec-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="rec-h" className="voice t24" style={{ margin: 0 }}>{S.record.length ? `${S.record.length} ${S.record.length === 1 ? 'entry' : 'entries'}, newest first. ${proofN} ${proofN === 1 ? 'counts' : 'count'} as proof.` : 'Nothing recorded yet.'}</h2>
      <ol className="talent-a-ladder" aria-label="What counts, from weakest to strongest">
        {LADDER_SHORT.map((l, i) => (
          <li key={l.cls} data-proof={i >= 2 ? '1' : undefined}>
            <span className="talent-a-ladderh"><Glyph k={CLS_GLYPH[l.cls]} size={18} />{l.short}</span>
            <span className="t14 muted">{l.counts}</span>
          </li>
        ))}
      </ol>
      {!S.record.length && <div className="talent-a-empty"><p style={{ margin: 0 }}>Practice, submitted work and reviews will be listed here with what each one proves and doesn’t.</p></div>}
      <ol className="talent-a-record">
        {S.record.map((r) => { const proof = r.cls === 'Assessed by rubric and reviewer' || r.cls === 'Verified credential'; return (
          <motion.li key={r.id} layout {...arrive} data-proof={proof ? '1' : undefined}>
            <span style={{ paddingTop: 2 }}><Glyph k={CLS_GLYPH[r.cls]} size={18} /></span>
            <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <p style={{ margin: 0 }}><span className="num talent-a-date">{fmtDay(r.at)} · </span><strong>{compById(P, r.comp).label}</strong> · {r.cls}{r.level ? ` · level ${r.level} of 4` : ''}</p>
              <p className="t14" style={{ margin: 0 }}>{r.why}{r.moved ? ` ${r.moved}.` : ''}</p>
              <p className="t14 muted" style={{ margin: 0 }}>Does not prove: {r.not}</p>
            </div>
            <span className={`talent-a-statepill${proof ? ' is-proof' : ''}`}>{proof ? 'Counts' : r.cls === 'Practice attempt' ? 'Doesn’t count' : 'Partial'}</span>
          </motion.li>); })}
      </ol>
    </section>
  );
}
