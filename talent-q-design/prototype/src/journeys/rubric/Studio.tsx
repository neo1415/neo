// SC: Evaluation studio (/r/roles/:id/rubric). Audit addendum §E, AD-E-01…09. Reads top to bottom as the task:
// what Q proposed and why → how much each criterion counts (share bars) → each criterion, Q's proposal beside your
// version (stacked with a "Q proposed / Your version" switch on phones) → approve, which freezes a version →
// revisions as a diff. A material change after people were rated raises a change notice with two principled
// choices. Q refuses protected characteristics and proxies with a reason and an alternative.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { actorOf, useWorld, type World } from '../../mock/world';
import type { RubricCriterion, RubricVersion } from '../../state/domain';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { arrive, DUR, EASE } from '../../ds/motion';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { approvedVersion, draftVersion, meta, rubricFor } from '../../state/areas/rubrics';
import { campaignOf } from '../../state/areas/campaigns';
import { actorName, affectedBy, baseOf, card, diff, firstOf, fmtDay, indexLine, KIND_WORD, list, roleOf, scored, screen } from './model';
import './ops';
import './rubric.css';

const op = (name: string, args: Record<string, unknown>) => void runAction({ label: name, act: { t: 'do', op: name, args } });
const say = (text: string) => void runAction({ label: text, act: { t: 'say', text } });
const LEVELS = [0, 1, 2, 3, 4] as const;

export function Studio({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const narrow = useNarrow(760);
  const role = roleOf(w, id);
  const [side, setSide] = useState<'q' | 'you'>('you');
  const [pick, setPick] = useState<number | null>(null);
  const [adding, setAdding] = useState('');
  const me = actorOf(w);
  if (!role) return (
    <Canvas title="We can’t find this role" kicker="Evaluation rubric" open onClose={() => history.back()}>
      <section className="ds-sheet rb-empty"><Glyph k="none" /><div><b>There’s no role with this link.</b><p className="t14 muted" style={{ margin: 0 }}><Link to="/r/roles">Back to your roles</Link></p></div></section>
    </Canvas>
  );
  const rub = rubricFor(w, id);
  const draft = draftVersion(w, id);
  const inForce = approvedVersion(w, id);
  const camp = campaignOf(w, id, role.orgId);
  const kicker = `${w.orgs.find((o) => o.id === role.orgId)?.name ?? ''}${camp ? ` · ${camp.name}` : ''}`;
  const title = `${role.title} rubric`;

  if (!rub || !rub.versions.length) return (
    <Canvas title={title} kicker={kicker} open onClose={() => history.back()} qLine="No rubric yet. I can propose one from the brief.">
      <p className="voice rb-lede" style={{ margin: 0 }}><span className="rb-lede-q" aria-hidden="true" />There’s no rubric for this role yet, so every candidate is compared on equal must-haves. I can propose one from the approved brief and {w.orgs.find((o) => o.id === role.orgId)?.name ?? 'your'} guidelines for you to edit and approve.</p>
      <section className="ds-sheet rb-empty" aria-labelledby="rb-none">
        <div className="rb-grid">
          <h2 id="rb-none" className="voice t24" style={{ margin: 0 }}>Agree how to judge this role before anyone is rated</h2>
          <p style={{ margin: 0 }}>A rubric lists what the job needs, how much each part counts, what each level looks like (0 to 4), what evidence to look at, and which questions to ask. Every candidate for this role is then judged against the same approved version.</p>
          <ul className="rb-plain t14">{role.reqs.map((r) => <li key={r.reqId}>{r.label} <span className="muted">· {r.mustHave ? 'must have' : 'nice to have'}</span></li>)}</ul>
          <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say(`propose a rubric for the ${role.title.toLowerCase()} role`)}>Ask Q to propose a rubric</button></div>
          <p className="t14 muted" style={{ margin: 0 }}>Q drafts; you decide. Nothing is used for scoring until you approve it.</p>
        </div>
      </section>
    </Canvas>
  );

  const versions = rub.versions;
  const ver: RubricVersion = versions.find((v) => v.v === pick) ?? draft ?? inForce ?? versions[versions.length - 1];
  const editing = ver.state === 'Q_PROPOSED';
  const prop = meta(w).proposals[`${rub.id}:v${ver.v}`];
  const qCrit = prop?.criteria ?? [];
  const base = baseOf(w, id);
  const changes = editing ? diff(base?.criteria ?? (base ? undefined : qCrit), ver.criteria) : [];
  const affected = editing ? affectedBy(w, id) : [];
  const notice = editing && ver.changeNotice && affected.length ? ver.changeNotice : null;
  const share = (c: RubricCriterion, list: RubricCriterion[]) => { const t = list.filter(scored).reduce((s, x) => s + x.weight, 0); return t ? Math.round((100 * c.weight) / t) : 0; };
  const ids = [...ver.criteria.map((c) => c.id), ...qCrit.filter((c) => !ver.criteria.some((x) => x.id === c.id)).map((c) => c.id)];
  const canApprove = me.role && ['OWNER', 'ADMIN', 'RECRUITER'].includes(me.role);
  const lede = editing
    ? (versions.length === 1 ? `I drafted ${ver.criteria.filter(scored).length} scored criteria from the brief${prop?.leftOut.length ? ` and left out ${list(prop.leftOut.map((x) => x.label.toLowerCase()))} until it’s defined` : ''}. Change anything, then approve to freeze it as v${ver.v}.` : `Draft v${ver.v}, changed from v${base?.v}. ${changes.length ? `${changes.length} change${changes.length === 1 ? '' : 's'} so far.` : 'No changes yet.'}`)
    : `v${ver.v} is ${ver.state === 'APPROVED' ? (ver === inForce ? 'in force and frozen' : 'approved for the next round') : 'superseded'}. Approved by ${firstOf(w, ver.approvedBy ?? ver.by)} on ${fmtDay(ver.at)}.`;

  const addNow = () => { const t = adding.trim(); if (!t) return; const r = screen(t); if (r) { say(`add ${t} to the rubric`); return; } op('rb.add', { mandateId: id, words: t }); setAdding(''); };
  const refusal = adding.trim() ? screen(adding) : null;

  return (
    <Canvas title={title} kicker={kicker} open onClose={() => history.back()} qLine={lede}
      aside={<div className="ds-actions">
        <span className="ds-tag" data-k={editing ? undefined : 'ok'}><Glyph k={editing ? 'partial' : 'verified'} size={14} />{editing ? `Draft v${ver.v}` : `v${ver.v} ${ver.state === 'APPROVED' ? 'approved' : 'superseded'}`}</span>
        <Link className="ds-btn quiet" to="/r/compare">Comparison</Link>
      </div>}>
      <p className="voice rb-lede" style={{ margin: 0 }}><span className="rb-lede-q" aria-hidden="true" />{lede}</p>

      {versions.length > 1 && (
        <div className="rb-vers" role="group" aria-label="Rubric versions">
          {versions.map((v) => <button key={v.v} type="button" className="ds-filter" aria-pressed={v.v === ver.v} onClick={() => setPick(v.v)}>v{v.v} · {v.state === 'Q_PROPOSED' ? 'draft' : v.state === 'APPROVED' ? (v === inForce ? 'in force' : 'next round') : 'superseded'}</button>)}
        </div>
      )}

      <div className="ds-banner rb-valid" role="note"><Glyph k="unclear" /><span><b>Not a validated test.</b> These weights, minimums and the index are a prototype starting point. Before they inform hiring decisions they need a job analysis with people who do the work, and monitoring for adverse impact. A person reviews every consequential decision.</span><span /></div>

      <AnimatePresence initial={false}>
        {notice && (
          <motion.section key="notice" {...arrive} className="ds-sheet rb-notice" aria-labelledby="rb-n" role="alertdialog" aria-describedby="rb-n-d">
            <h2 id="rb-n" className="voice t24" style={{ margin: 0 }}>This change affects people already rated</h2>
            <p id="rb-n-d" style={{ margin: 0 }}>{notice.text}</p>
            <ul className="rb-affected">
              {affected.map((p) => { const cd = card(w, id, p, base?.v); return <li key={p}><Link to={`/r/people/${p}`}>{w.people.find((x) => x.personId === p)?.name}</Link><span className="t14 muted num">v{base?.v}: {cd ? indexLine(cd.idx) : 'rated'}</span></li>; })}
            </ul>
            <div className="rb-choices">
              <button type="button" className="ds-opt rb-choice" onClick={() => op('rb.approve', { mandateId: id, decision: 'NOTIFY_AND_REASSESS' })}>
                <b>Notify and reassess</b><span className="t14">Approve v{ver.v} now. {list(affected.map((p) => firstOf(w, p)))} {affected.length === 1 ? 'is' : 'are'} told (simulated notice) and reassessed on v{ver.v}. Unchanged criteria carry over as Q proposals to review; new ones start unknown.</span>
              </button>
              <button type="button" className="ds-opt rb-choice" onClick={() => op('rb.approve', { mandateId: id, decision: 'KEEP_FOR_ROUND' })}>
                <b>Keep v{base?.v} for this round</b><span className="t14">Everyone in this round stays on v{base?.v}, so they’re judged the same way. v{ver.v} is approved for the next round.</span>
              </button>
            </div>
            <p className="t14 muted" style={{ margin: 0 }}>Either way, v{base?.v} ratings stay attached to v{base?.v}. Nothing is re-scored silently.</p>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="ds-sheet rb-grid" aria-labelledby="rb-w">
        <div className="rb-row"><h2 id="rb-w" className="voice t24" style={{ margin: 0 }}>How much each part counts</h2><span className="t14 muted">Share of the index</span></div>
        <ul className="rb-shares">
          {ver.criteria.filter(scored).map((c) => { const s = share(c, ver.criteria); const q = qCrit.find((x) => x.id === c.id); return (
            <li key={c.id}>
              <span className="rb-share-l">{c.label}{q && q.weight !== c.weight && <span className="rb-was t14"> · Q proposed {q.weight}</span>}{!q && <span className="rb-was t14"> · you added</span>}</span>
              <span className="rb-share-bar" role="img" aria-label={`${c.label}: weight ${c.weight}, ${s}% of the index`}><motion.span className="rb-share-fill" initial={false} animate={{ width: `${s}%` }} transition={{ duration: DUR.slow, ease: EASE.standard }} /></span>
              <span className="rb-share-v num">{s}%<span className="muted"> · w{c.weight}</span></span>
            </li>); })}
        </ul>
        <p className="t14 muted" style={{ margin: 0 }}>Not in the index: {ver.criteria.filter((c) => !scored(c)).map((c) => `${c.label} (${c.kind === 'ELIGIBILITY' ? 'a gate, met or not met' : c.kind === 'COMPATIBILITY' ? 'the candidate’s side, reported separately' : 'weight 0'})`).join('; ') || 'nothing'}.</p>
      </section>

      <section className="rb-grid" aria-labelledby="rb-c">
        <div className="rb-row"><h2 id="rb-c" className="voice t24" style={{ margin: 0 }}>Criteria</h2>
          {narrow ? (
            <div className="ds-views rb-side" role="group" aria-label="Which version to show">
              <button type="button" aria-pressed={side === 'q'} onClick={() => setSide('q')}>Q proposed</button>
              <button type="button" aria-pressed={side === 'you'} onClick={() => setSide('you')}>Your version</button>
            </div>
          ) : <span className="t14 muted">Q’s proposal on the left, {editing ? 'your editable version' : `v${ver.v} as approved`} on the right</span>}
        </div>
        <ol className="rb-crits">
          {ids.map((cid) => {
            const mine = ver.criteria.find((c) => c.id === cid); const q = qCrit.find((c) => c.id === cid);
            return (
              <li key={cid} className="rb-crit ds-sheet" data-removed={!mine ? '1' : undefined}>
                {(!narrow || side === 'q') && <Column w={w} label="Q proposed" c={q} other={mine} gone={!q ? 'Not in Q’s proposal: you added it.' : undefined} />}
                {(!narrow || side === 'you') && (mine
                  ? <Column w={w} label={editing ? 'Your version' : `v${ver.v}`} c={mine} other={q} editable={editing} mandateId={id} />
                  : <div className="rb-col rb-col-gone"><span className="lab">{editing ? 'Your version' : `v${ver.v}`}</span><p className="t14" style={{ margin: 0 }}>You removed “{q?.label}”.</p>{editing && <button type="button" className="ds-btn quiet" onClick={() => op('rb.add', { mandateId: id, words: q?.label ?? '' })}>Put it back</button>}</div>)}
              </li>
            );
          })}
        </ol>
        {editing && (
          <div className="ds-sheet rb-add rb-grid">
            <label htmlFor="rb-add" className="lab">Add a criterion</label>
            <div className="rb-addrow">
              <input id="rb-add" className="ds-input" value={adding} placeholder="For example: mentoring" onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNow(); }} aria-describedby="rb-add-h" aria-invalid={refusal ? true : undefined} />
              <button type="button" className="ds-btn" onClick={addNow} disabled={!adding.trim()}>Add</button>
            </div>
            {refusal ? <p id="rb-add-h" className="t14 rb-refuse" role="alert"><Glyph k="none" size={14} /> Q can’t add this: {refusal.why}. Try instead: {refusal.instead}.</p>
              : <p id="rb-add-h" className="t14 muted" style={{ margin: 0 }}>Only what the job needs. Q refuses protected characteristics and things that stand in for them (age, origin, accent, appearance, CV gaps).</p>}
            {prop?.leftOut.filter((x) => !ver.criteria.some((c) => c.label.toLowerCase().startsWith(x.label.toLowerCase()))).map((x) => (
              <p key={x.label} className="t14" style={{ margin: 0 }}><span className="rb-q">Left out by Q</span> {x.label}: {x.why} <button type="button" className="rb-link" onClick={() => op('rb.add', { mandateId: id, words: x.label })}>Add {x.label.toLowerCase()}</button></p>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <section className="ds-sheet rb-approve rb-grid" aria-labelledby="rb-a">
          <h2 id="rb-a" className="voice t24" style={{ margin: 0 }}>{base ? `Approve v${ver.v}?` : 'Approve the rubric'}</h2>
          {changes.length ? <ul className="rb-diff">{changes.map((d, i) => <li key={i} data-k={d.kind}><span className="rb-dk" aria-hidden="true">{d.kind === 'added' ? '+' : d.kind === 'removed' ? '−' : '~'}</span>{d.text}{d.material ? '' : <span className="muted"> (wording only)</span>}</li>)}</ul>
            : <p className="t14 muted" style={{ margin: 0 }}>{base ? `No changes from v${base.v} yet.` : 'You haven’t changed Q’s proposal. That’s fine if it’s right.'}</p>}
          <p className="t14" style={{ margin: 0 }}>Approving freezes v{ver.v}. Every candidate for this role at this stage is judged against it, and later changes make a new version.{affected.length ? ` ${list(affected.map((p) => firstOf(w, p)))} ${affected.length === 1 ? 'was' : 'were'} rated on v${base?.v}, so you’ll choose how to handle that.` : ''}</p>
          <div className="ds-actions">
            <button type="button" className="ds-btn primary" disabled={!canApprove || (!!base && !changes.length)} onClick={() => op('rb.approve', { mandateId: id })}>{affected.length ? `Approve v${ver.v}…` : `Approve v${ver.v}`}</button>
            {versions.length === 1 && <button type="button" className="ds-btn quiet" onClick={() => op('rb.reset', { mandateId: id })} disabled={!changes.length}>Go back to Q’s proposal</button>}
            {base && <button type="button" className="ds-btn quiet" onClick={() => op('rb.discard', { mandateId: id })}>Discard draft</button>}
          </div>
          {!canApprove && <p className="t14 muted" style={{ margin: 0 }}>Only a recruiter or an admin can approve. You can still edit and suggest.</p>}
        </section>
      )}

      <section className="ds-sheet rb-grid" aria-labelledby="rb-r">
        <h2 id="rb-r" className="voice t24" style={{ margin: 0 }}>Revisions</h2>
        <ol className="rb-revs">
          {[...versions].reverse().map((v) => {
            const prev = versions.find((x) => x.v === v.v - 1 && x.state !== 'Q_PROPOSED') ?? versions.filter((x) => x.v < v.v && x.state !== 'Q_PROPOSED').pop();
            const d = diff(prev?.criteria ?? meta(w).proposals[`${rub.id}:v${v.v}`]?.criteria, v.criteria);
            const edits = meta(w).edits[`${rub.id}:v${v.v}`] ?? [];
            return (
              <li key={v.v}>
                <div className="rb-row"><b>v{v.v} · {v.state === 'Q_PROPOSED' ? 'draft' : v.state === 'APPROVED' ? (v === inForce ? 'approved, in force' : 'approved for the next round') : 'superseded'}</b><span className="t14 muted">{v.state === 'Q_PROPOSED' ? `started by ${actorName(w, v.by)}` : `approved by ${actorName(w, v.approvedBy ?? v.by)}`} · {fmtDay(v.at)}</span></div>
                <p className="t14 muted" style={{ margin: 0 }}>{prev ? `Compared with v${prev.v}` : 'Compared with Q’s proposal'}{v.changeNotice?.decision ? ` · ${v.changeNotice.decision === 'KEEP_FOR_ROUND' ? `kept v${prev?.v} for this round` : `notified and reassessed ${list(v.changeNotice.affected.map((p) => firstOf(w, p)))}`}` : ''}</p>
                {d.length ? <ul className="rb-diff">{d.map((x, i) => <li key={i} data-k={x.kind}><span className="rb-dk" aria-hidden="true">{x.kind === 'added' ? '+' : x.kind === 'removed' ? '−' : '~'}</span>{x.text}</li>)}</ul> : <p className="t14" style={{ margin: 0 }}>Same as {prev ? `v${prev.v}` : 'Q’s proposal'}.</p>}
                {edits.length > 0 && <details className="t14"><summary>Edit log ({edits.length})</summary><ul className="rb-plain">{edits.map((e, i) => <li key={i}>{actorName(w, e.by)} · {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}: {e.text}</li>)}</ul></details>}
              </li>
            );
          })}
        </ol>
      </section>

      {prop && (
        <section className="ds-sheet rb-grid" aria-labelledby="rb-s">
          <h2 id="rb-s" className="voice t24" style={{ margin: 0 }}>What Q used</h2>
          <ul className="rb-plain t14">{prop.sources.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="t14 muted" style={{ margin: 0 }}>ESCO references are illustrative ids for this prototype; production maps to the published ESCO release. Q’s drafting here is rule-based, not a trained model.</p>
        </section>
      )}
    </Canvas>
  );
}

/** One side of a criterion: Q's proposal or your (editable) version. Differences from the other side are marked. */
function Column({ w, label, c, other, editable, mandateId, gone }: { w: World; label: string; c?: RubricCriterion; other?: RubricCriterion; editable?: boolean; mandateId?: string; gone?: string }) {
  const [editLv, setEditLv] = useState(false);
  if (!c) return <div className="rb-col rb-col-gone"><span className="lab">{label}</span><p className="t14 muted" style={{ margin: 0 }}>{gone}</p></div>;
  const req = c.requirementId ? roleOf(w, mandateId ?? 'm_backend')?.reqs.find((r) => r.reqId === c.requirementId) : undefined;
  const dw = other && other.weight !== c.weight; const dm = other && (other.minimum ?? null) !== (c.minimum ?? null);
  const set = (name: string, args: Record<string, unknown>) => op(name, { mandateId, cid: c.id, ...args });
  return (
    <div className="rb-col" data-side={editable ? 'you' : undefined}>
      <div className="rb-row"><span className="lab">{label}</span><span className="rb-kind t14">{KIND_WORD[c.kind]}</span></div>
      <h3 className="rb-ch">{c.label}</h3>
      <div className="rb-facts">
        <div className="rb-fact"><span className="lab">Weight</span>
          {editable && scored(c) ? (
            <span className="rb-step" role="group" aria-label={`Weight for ${c.label}`}>
              <button type="button" className="rb-stepbtn" aria-label={`Lower the weight of ${c.label}`} disabled={c.weight <= 0} onClick={() => set('rb.weight', { weight: c.weight - 1 })}>−</button>
              <output className="num" aria-live="polite">{c.weight}</output>
              <button type="button" className="rb-stepbtn" aria-label={`Raise the weight of ${c.label}`} disabled={c.weight >= 5} onClick={() => set('rb.weight', { weight: c.weight + 1 })}>+</button>
            </span>
          ) : <b className="num" data-diff={dw ? '1' : undefined}>{scored(c) ? c.weight : 'not scored'}</b>}
        </div>
        <div className="rb-fact"><span className="lab">Minimum</span>
          {editable && scored(c) ? (
            <select className="ds-input rb-min" aria-label={`Minimum level for ${c.label}`} value={c.minimum ?? ''} onChange={(e) => set('rb.minimum', { min: e.target.value === '' ? null : Number(e.target.value) })}>
              <option value="">None</option>{LEVELS.slice(1).map((l) => <option key={l} value={l}>Level {l}</option>)}
            </select>
          ) : <b data-diff={dm ? '1' : undefined}>{c.kind === 'ELIGIBILITY' ? 'Must be met' : c.minimum !== undefined ? `Level ${c.minimum}` : 'None'}</b>}
        </div>
      </div>
      {scored(c) && c.minimum !== undefined && <p className="t14 muted" style={{ margin: 0 }}>Below the minimum flags the person for a human review; it never rejects anyone automatically.</p>}
      <div className="rb-anchors-h"><span className="lab">What each level looks like</span>{editable && <button type="button" className="rb-link t14" aria-expanded={editLv} onClick={() => setEditLv(!editLv)}>{editLv ? 'Done' : 'Edit levels'}</button>}</div>
      <ol className="rb-anchors" start={0}>
        {c.anchors.map((a, i) => (
          <li key={i} data-diff={other && other.anchors[i] !== a ? '1' : undefined}><span className="rb-lv num" aria-hidden="true">{i}</span>
            {editLv && editable ? <input className="ds-input" aria-label={`Level ${i} for ${c.label}`} defaultValue={a} onBlur={(e) => { if (e.target.value !== a) { const next = [...c.anchors] as RubricCriterion['anchors']; next[i] = e.target.value; set('rb.patch', { patch: { anchors: next } }); } }} /> : <span><span className="sr">Level {i}: </span>{a}</span>}
          </li>
        ))}
      </ol>
      <details className="rb-more">
        <summary className="t14">Evidence, questions and method</summary>
        <div className="rb-grid" style={{ gap: 8 }}>
          <div><span className="lab">Evidence to inspect</span><ul className="rb-plain t14">{c.evidenceToInspect.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><span className="lab">Questions</span><ul className="rb-plain t14">{c.questions.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><span className="lab">Method</span><p className="t14" style={{ margin: 0 }}>{c.method}</p></div>
        </div>
      </details>
      <p className="t14 rb-why"><span className="rb-q">Why it’s job-related</span> {c.why}</p>
      <p className="t14 muted" style={{ margin: 0 }}>{req ? `Source: brief requirement “${req.label}”` : c.kind === 'ELIGIBILITY' || c.kind === 'COMPATIBILITY' ? 'Source: the role’s conditions' : 'Source: added by the recruiter (not on the brief)'}{c.escoRef ? ` · ${c.escoRef}` : ''}</p>
      {editable && <div><button type="button" className="ds-btn quiet rb-remove" onClick={() => set('rb.remove', {})}>Remove {c.label.toLowerCase()}</button></div>}
    </div>
  );
}
