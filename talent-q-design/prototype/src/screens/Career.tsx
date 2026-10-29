// Readiness to apply (SC-162/165/176), rebuilt on the one store: six separate measures read from the
// person's own career space (J7) and profile, each with its basis. No overall score anywhere (addendum 08 §3).
// Private to the person; nothing here is shown to employers.
import { useEffect } from 'react';
import { Canvas } from '../ds/Workspace';
import { Glyph } from '../ds/Glyph';
import { actorOf, update, useWorld } from '../mock/world';
import { runAction } from '../q/core/engine';
import { compById, gapsFor, j7, occById, personaFor, readJ7, stateOf, fmtDay } from '../journeys/career/j7';
import { missingOf, readProfile } from '../services/profile';
import { taRead } from '../state/areas/talent-a';
import { Route } from '../journeys/career/Route';

export function Career() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId ?? 'p_amaka';
  useEffect(() => { if (!w.j7[pid]) update((d) => { j7(d, pid); }); }, [w.j7, pid]);
  const P = personaFor(pid); const S = readJ7(w, pid); const goal = occById(P, S.goal)!;
  const p = readProfile(w, pid); const cv = taRead(w).cv[pid];
  const g = gapsFor(w, pid, S, goal);
  const practice = S.record.filter((r) => r.cls === 'Practice attempt');
  const done = S.plan.filter((s) => s.done).length;
  const checklist = [
    { item: 'Profile set up (claims in your words)', done: p.done },
    { item: 'Where you can work is filled in', done: !missingOf(p).includes('location') },
    { item: 'CV lines approved', done: cv?.status === 'APPROVED' },
    { item: 'At least one reviewed work sample', done: S.assessments.length > 0 },
    { item: `Every ${goal.short} competency shown`, done: g.length === 0 },
  ];
  const download = () => {
    const lines = [`${a.first}'s plan: ${goal.label}`, '', 'Steps:', ...S.plan.map((s, i) => `${i + 1}. [${s.done ? 'x' : ' '}] ${s.title} (${s.kind}, ${s.minutes} min${s.due ? `, by ${fmtDay(s.due)}` : ''})`), '', 'Before you apply:', ...checklist.map((c) => `[${c.done ? 'x' : ' '}] ${c.item}`), '', 'Made by Talent Q (prototype, simulated data). Private to you.'];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' })); const el = document.createElement('a'); el.href = url; el.download = `talent-q-plan-${a.first.toLowerCase()}.txt`; el.click(); URL.revokeObjectURL(url);
  };
  const latest = new Map<string, { level: number; prev?: number }>();
  for (const x of S.assessments) latest.set(x.comp, { level: x.level, prev: latest.get(x.comp)?.level });
  const M: { label: string; value: string; basis: string; counts: 'proof' | 'private' | 'advice' }[] = [
    { label: 'Evidence coverage', value: `${goal.needs.length - g.length} of ${goal.needs.length}`, basis: `${goal.label} competencies shown with reviewed or verified evidence`, counts: 'proof' },
    { label: 'Competency mastery', value: latest.size ? [...latest].map(([c, x]) => `${compById(P, c).label}: level ${x.level} of 4${x.prev != null && x.prev !== x.level ? ` (was ${x.prev})` : ''}`).join(' · ') : 'Not assessed yet', basis: 'Rubric-reviewed work samples only (simulated reviewer)', counts: 'proof' },
    { label: 'Role fit', value: g.length ? `${g.length} still to show` : 'Every need shown', basis: 'For the role family, not one job', counts: 'proof' },
    { label: 'Practice', value: practice.length ? `${practice.length} private ${practice.length === 1 ? 'attempt' : 'attempts'}` : 'No practice yet', basis: 'Helps you get ready. Never proof, never shared', counts: 'private' },
    { label: 'Plan adherence', value: `${done} of ${S.plan.length} steps`, basis: 'Private to you. Never shared or used in hiring', counts: 'private' },
    { label: 'Readiness to apply', value: `${checklist.filter((c) => c.done).length} of ${checklist.length} done`, basis: 'An advisory checklist. Never used to filter you out', counts: 'advice' },
  ];
  const nDone = checklist.filter((c) => c.done).length;
  const next = checklist.findIndex((c) => !c.done);
  const COUNTS = { proof: 'Built from proof', private: 'Private · doesn’t count', advice: 'Advice only' } as const;
  return (
    <Canvas title={g.length ? `${g.length} to show before ${goal.label} is in reach` : `You show everything ${goal.label} asks for`} kicker={<span>Readiness to apply</span>} open onClose={() => {}} aside={<span className="ds-tag">Private to you</span>}>
      <Route goal={goal.label} needs={goal.needs} st={(c) => stateOf(w, pid, S, c)} comp={(c) => compById(P, c)} first={a.first} />
      <section className="ds-sheet" aria-labelledby="rd-h" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <h2 id="rd-h" className="voice t24" style={{ margin: 0 }}>Before you apply: {nDone} of {checklist.length} done</h2>
          <div className="talent-a-segs" aria-hidden="true">{checklist.map((c) => <span key={c.item} data-done={c.done ? '1' : undefined} />)}</div>
        </div>
        <ul className="talent-a-check talent-a-checklist">{checklist.map((c, i) => <li key={c.item} data-done={c.done ? '1' : undefined} data-next={i === next ? '1' : undefined}><Glyph k={c.done ? 'full' : 'none'} title={c.done ? 'Done' : 'Not done'} /><span>{c.item}</span>{i === next && <span className="ds-tag">Next</span>}</li>)}</ul>
        <div className="ds-actions">
          <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'plan', act: { t: 'say', text: 'show my plan' } })}>Ask Q for the next step</button>
          <button type="button" className="ds-btn" onClick={download}>Download my plan (text, under 2 KB)</button>
        </div>
        <p className="t14 muted" style={{ margin: 0 }}>On a slow connection? The text file works offline and on any phone. This list is advice; it’s never used to filter you out.</p>
      </section>
      <section className="ds-sheet" aria-labelledby="ms-h" style={{ display: 'grid', gap: 12 }}>
        <h2 id="ms-h" className="voice t24" style={{ margin: 0 }}>Six measures, each on its own. No overall score.</h2>
        <dl className="talent-a-measures">{M.map((m) => <div key={m.label} data-counts={m.counts}><dt>{m.label}<span className={`talent-a-statepill${m.counts === 'proof' ? ' is-proof' : ''}`}>{COUNTS[m.counts]}</span></dt><dd className="voice t19">{m.value}</dd><dd className="t14 muted">{m.basis}</dd></div>)}</dl>
      </section>
    </Canvas>
  );
}
