// P10 · SC-162 Career home, SC-164 role pathway, SC-165 gap explainer, SC-176 low-bandwidth plan.
// Six separate measures, each with its basis. No overall score anywhere (addendum 08 §3).
import { PEOPLE, PERSONAS, type PersonaId } from '../mock/fixtures';
import { update, useWorld } from '../mock/world';
import { EvidenceBadge, Label, QSays, Segmented, Button } from '../ui/kit';
import { Link } from '../ui/router';
import { ICheck } from '../ui/icons';

const COMPETENCY_LABEL: Record<string, string> = {
  c_sql_window: 'SQL window functions', c_writing: 'Product writing', c_experiment: 'Experiment design', c_sheets: 'Spreadsheet modelling',
  c_prospecting: 'Outbound prospecting', c_crm: 'Working in a CRM', c_discovery: 'Discovery questions', c_sysdesign: 'System design', c_oncall: 'Incident leadership',
};

export function Career() {
  const persona = useWorld((w) => w.persona);
  const practice = useWorld((w) => w.practice);
  const P = PERSONAS[persona];
  const person = PEOPLE.find((p) => p.personId === persona)!;
  const m = P.measures;
  const first = person.name.split(' ')[0];
  const promoted = practice.filter((a) => a.visibility === 'PROMOTED_TO_EVIDENCE').length;

  const download = () => {
    const lines = [`${first}'s plan: ${P.goal.targetRole}`, `Goal horizon: ${P.goal.horizon}`, '', 'Next steps:', ...P.gaps.map((g, i) => `${i + 1}. ${COMPETENCY_LABEL[g.competencyId]}: ${g.nextStep}${g.minutes ? ` (${g.minutes} min)` : ''}`), '', 'Before you apply:', ...m.readiness_to_apply.map((r) => `[${r.done ? 'x' : ' '}] ${r.item}`), '', 'Made by Talent Q (prototype, simulated data).'];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `talent-q-plan-${first.toLowerCase()}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="main stack gap-12">
      <div className="row between wrap gap-4">
        <Segmented<PersonaId> label="Viewing as" value={persona} onChange={(v) => update((d) => { d.persona = v; })}
          options={(Object.keys(PERSONAS) as PersonaId[]).map((k) => ({ value: k, label: PERSONAS[k].label }))} />
        <span className="t-caption">Three example people. Each one sees only their own career space.</span>
      </div>

      <header className="stack gap-4">
        <span className="t-label q-text">{first}’s path · {P.goal.targetRole}</span>
        <h1 className="t-display measure">{headline(P.gaps)}</h1>
        <QSays text={persona === 'p_amaka'
          ? 'Your final-year project already shows real analysis. What’s missing is proof of SQL and a recent piece of product writing. Neither is a judgement of your ability; they’re things you haven’t shown yet.'
          : persona === 'p_chidi' ? 'Running a store taught you targets, objections and follow-up. That transfers. Prospecting and CRM use are new, and both can be practised in weeks, not months.'
          : 'You’re strong on design and data. Staff roles also want proof that you lead during incidents. You described one in conversation; writing it up would close the gap.'}
          used={[{ kind: 'AUTHORIZED_FACT', label: 'Your Evidence Passport' }, { kind: 'KNOWLEDGE_SOURCE', label: `${P.goal.targetRole} requirements` }, { kind: 'INFERENCE', label: 'Gap reading' }]} />
      </header>

      <section aria-labelledby="path-h" className="stack gap-4">
        <h2 id="path-h" className="t-label">Route</h2>
        <ol className="row wrap gap-2" style={{ alignItems: 'stretch' }}>
          {P.path.map((n, i) => (
            <li key={n.id} className="row gap-2">
              <span className="panel stack gap-1" style={{ padding: '12px 16px', borderColor: n.target ? 'var(--color-q)' : undefined, minWidth: 160 }}>
                <span className="t-label">{n.current ? 'You are here' : n.target ? 'Your goal' : i > P.path.findIndex((x) => x.target) ? 'Later' : 'On the way'}</span>
                <span style={{ fontWeight: 500 }}>{n.label}</span>
              </span>
              {i < P.path.length - 1 && <span aria-hidden="true" className="subtle">→</span>}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gaps-h" className="stack gap-4">
        <h2 id="gaps-h" className="t-label">Gaps, most useful first</h2>
        <ul className="stack gap-4">
          {P.gaps.map((g) => (
            <li key={g.competencyId} className="panel stack gap-3">
              <div className="row between wrap gap-3"><h3 className="t-title" style={{ fontSize: 19 }}>{COMPETENCY_LABEL[g.competencyId]}</h3><EvidenceBadge state={g.state} /></div>
              <p className="measure">{g.why}</p>
              <div className="row wrap gap-3 between">
                <span className="muted">Next: {g.nextStep}{g.minutes ? ` · ${g.minutes} min` : ''}</span>
                {g.minutes > 0 && <Link to={`/c/interview?practice=${g.competencyId}`} className="btn btn-primary btn-compact">Start practice</Link>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="meas-h" className="stack gap-4">
        <h2 id="meas-h" className="t-label">Six separate measures</h2>
        <div className="grid-3">
          <Measure label="Evidence coverage" value={`${m.evidence_coverage.covered} of ${m.evidence_coverage.total}`} basis={`Requirements of ${P.goal.targetRole} with shared or private evidence`} />
          <Measure label="Competency mastery" value={m.competency_mastery.filter((c) => c.level !== null).map((c) => `${COMPETENCY_LABEL[c.competencyId]}: level ${c.level} of 5`).join(' · ') || 'Not assessed yet'}
            basis={m.competency_mastery.filter((c) => c.level !== null).map((c) => `${c.conditions}; ${c.uncertainty}; rubric ${c.rubricVersion}`).join('. ') + (m.competency_mastery.some((c) => c.level === null) ? `. Not yet assessed: ${m.competency_mastery.filter((c) => c.level === null).map((c) => COMPETENCY_LABEL[c.competencyId]).join(', ')}.` : '')} />
          <Measure label="Practice progress" value={m.practice_progress.map((p) => `${COMPETENCY_LABEL[p.competencyId]}: ${p.attempts.map((a) => a.level).join(' → ')}`).join(' · ') || 'No practice yet'} basis="Comparable tasks only, same rubric" />
          <Measure label="Role fit" value={m.role_fit.summary.toLowerCase()} basis={m.role_fit.mandateId ? 'For one specific job you were invited to' : 'For the role family, not one job'} />
          <Measure label="Readiness to apply" value={`${m.readiness_to_apply.filter((r) => r.done).length} of ${m.readiness_to_apply.length} done`} basis="An advisory checklist. Never used to filter you out." />
          <Measure label="Plan adherence" value={`${m.growth_plan_adherence.done} of ${m.growth_plan_adherence.planned} steps`} basis="Private to you. Never shared or used in hiring." />
        </div>
      </section>

      <section aria-labelledby="ready-h" className="grid-2">
        <div className="stack gap-3">
          <h2 id="ready-h" className="t-label">Before you apply</h2>
          <ul className="stack gap-2">{m.readiness_to_apply.map((r) => <li key={r.item} className="row gap-3">{r.done ? <ICheck style={{ color: 'var(--color-ok)' }} /> : <span aria-hidden="true" style={{ width: 20, height: 20, border: '1.5px solid var(--color-line-strong)', borderRadius: 4, display: 'inline-block' }} />}<span>{r.item}<span className="sr-only">{r.done ? ', done' : ', not done'}</span></span></li>)}</ul>
        </div>
        <div className="stack gap-3">
          <Label as="h2">On a slow connection?</Label>
          <p className="muted">Take the plan with you as a small text file. It works offline and on any phone.</p>
          <Button onClick={download}>Download my plan (text, under 2 KB)</Button>
          {promoted > 0 && <p className="t-caption">{promoted} practice result{promoted === 1 ? '' : 's'} added to your passport this session.</p>}
        </div>
      </section>
    </main>
  );
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];
function headline(gaps: { minutes: number }[]) {
  const act = gaps.filter((g) => g.minutes > 0).length;
  const open = gaps.length - act;
  const n = (k: number, w: string) => `${WORDS[k] ?? k} ${w}${k === 1 ? '' : 's'}`;
  return `${n(act, 'gap')} to close before you apply${open ? `, and ${n(open, 'question').toLowerCase()} Q is still checking` : ''}.`;
}

function Measure({ label, value, basis }: { label: string; value: string; basis: string }) {
  return (
    <div className="panel stack gap-2" style={{ padding: 18 }}>
      <span className="t-caption">{label}</span>
      <span className="t-voice" style={{ fontSize: 19 }}>{value}</span>
      <span className="t-caption">{basis}</span>
    </div>
  );
}
