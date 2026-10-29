// Readiness to apply (SC-162/165/176), rebuilt on the one store: six separate measures read from the
// person's own career space (J7) and profile, each with its basis. No overall score anywhere (addendum 08 §3).
// Private to the person; nothing here is shown to employers.
import { useEffect } from 'react';
import { Canvas } from '../ds/Workspace';
import { Glyph } from '../ds/Glyph';
import { actorOf, update, useWorld } from '../mock/world';
import { runAction } from '../q/core/engine';
import { compById, gapsFor, j7, occById, personaFor, readJ7, shown, stateOf, fmtDay } from '../journeys/career/j7';
import { missingOf, readProfile } from '../services/profile';
import { taRead } from '../state/areas/talent-a';

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
  const M = [
    { label: 'Evidence coverage', value: `${goal.needs.length - g.length} of ${goal.needs.length}`, basis: `${goal.label} competencies shown with reviewed or verified evidence` },
    { label: 'Competency mastery', value: S.assessments.length ? S.assessments.map((x) => `${compById(P, x.comp).label}: level ${x.level} of 4`).join(' · ') : 'Not assessed yet', basis: 'Rubric-reviewed work samples only (simulated reviewer)' },
    { label: 'Practice', value: practice.length ? `${practice.length} private ${practice.length === 1 ? 'attempt' : 'attempts'}` : 'No practice yet', basis: 'Private. Never proof, never shared' },
    { label: 'Role fit', value: g.length ? `${g.length} to show: ${g.map((x) => compById(P, x).label.toLowerCase()).join(', ')}` : 'Every need shown', basis: 'For the role family, not one job' },
    { label: 'Readiness to apply', value: `${checklist.filter((c) => c.done).length} of ${checklist.length} done`, basis: 'An advisory checklist. Never used to filter you out' },
    { label: 'Plan adherence', value: `${done} of ${S.plan.length} steps`, basis: 'Private to you. Never shared or used in hiring' },
  ];
  return (
    <Canvas title={g.length ? `${g.length} to show before ${goal.label} is in reach` : `You show everything ${goal.label} asks for`} kicker={<span>{a.first} · readiness · private</span>} open onClose={() => {}}>
      <section className="ds-sheet" aria-labelledby="ms-h" style={{ display: 'grid', gap: 14 }}>
        <h2 id="ms-h" className="voice t24" style={{ margin: 0 }}>Six separate measures, each with its basis. No overall score.</h2>
        <div className="talent-a-measures">{M.map((m) => <div key={m.label}><span className="t14 muted">{m.label}</span><span className="voice t19">{m.value}</span><span className="t14 muted">{m.basis}</span></div>)}</div>
      </section>
      <section className="ds-sheet" aria-labelledby="rd-h" style={{ display: 'grid', gap: 12 }}>
        <h2 id="rd-h" className="voice t24" style={{ margin: 0 }}>Before you apply</h2>
        <ul className="talent-a-check">{checklist.map((c) => <li key={c.item}><Glyph k={c.done ? 'full' : 'none'} title={c.done ? 'Done' : 'Not done'} /><span>{c.item}</span></li>)}</ul>
        <ul className="talent-a-check" aria-label="Competencies">{goal.needs.map((n) => { const k = stateOf(w, pid, S, n); return <li key={n}><Glyph k={k} title={k} /><span>{compById(P, n).label} · {shown(k) ? 'shown' : 'not shown yet'}</span></li>; })}</ul>
        <div className="ds-actions">
          <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'plan', act: { t: 'say', text: 'show my plan' } })}>Ask Q for the next step</button>
          <button type="button" className="ds-btn" onClick={download}>Download my plan (text, under 2 KB)</button>
        </div>
        <p className="t14 muted" style={{ margin: 0 }}>On a slow connection? The text file works offline and on any phone.</p>
      </section>
    </Canvas>
  );
}
