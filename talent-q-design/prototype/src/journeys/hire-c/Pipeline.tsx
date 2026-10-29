// /r/pipeline: a board by stage for the organisation's own roles (tenant isolation: an agency's records for
// the same client never appear here). Moving is undoable; "not progressing" needs a job-related reason and
// drafts a consent-respecting message for approval.
import { useState } from 'react';
import { actorOf, orgOf, personOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { runAction, useViewState } from '../../q/core/engine';
import { protectedCriterion } from '../../q/core/policy';
import { normalise } from '../../q/core/nlu';
import { STAGES, STAGE_LABEL, type PipelineEntry, type Stage } from '../../state/domain';
import { CAN_MOVE, firstOf, LAGOS, mandatesOf, ROLE_LABEL, tDay } from './lib';

export function Pipeline() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const ms = mandatesOf(w, a.orgId);
  const [mid, setMid] = useViewState<string>('mandate', 'all');
  const [rejecting, setRejecting] = useState<PipelineEntry | null>(null);
  const ids = new Set(ms.map((m) => m.id));
  const entries = w.pipeline.filter((p) => ids.has(p.mandateId) && (mid === 'all' || p.mandateId === mid));
  const can = CAN_MOVE.includes(a.role ?? 'VIEWER');
  const out = entries.filter((e) => e.stage === 'REJECTED' || e.stage === 'WITHDRAWN');
  const title = (id: string) => ms.find((m) => m.id === id)?.title ?? id;
  const move = (e: PipelineEntry, to: Stage) => { if (to === 'REJECTED') { setRejecting(e); return; } void runAction({ label: 'Move', act: { t: 'do', op: 'hire-c.move', args: { personId: e.personId, mandateId: e.mandateId, stage: to } } }); };
  if (!a.orgId) return <Canvas title="Pipeline" kicker="Hiring" open onClose={() => {}}><p>Join or create an organisation to see a pipeline.</p></Canvas>;
  return (
    <Canvas title={entries.length ? `${entries.filter((e) => e.stage === 'INTERVIEW').length} in interview, ${entries.filter((e) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(e.stage)).length} in play` : 'No one in the pipeline yet'} kicker={`${orgOf(w, a.orgId)?.name} · pipeline`} open onClose={() => {}}
      aside={<span className="t14 muted">Say “move Zara to interview” or “reject Kunle”</span>}>
      <div className="hc-filters" role="group" aria-label="Role">
        <button type="button" className="ds-filter" aria-pressed={mid === 'all'} onClick={() => setMid('all')}>All roles</button>
        {ms.map((m) => <button key={m.id} type="button" className="ds-filter" aria-pressed={mid === m.id} onClick={() => setMid(m.id)}>{m.title}</button>)}
      </div>
      {!can && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>You’re {ROLE_LABEL[a.role ?? 'VIEWER'].toLowerCase()}, so you can see the pipeline but not move people.</span><span /></div>}
      {!entries.length && <section className="ds-sheet"><p style={{ margin: 0 }}>No one is in {mid === 'all' ? 'any role' : title(mid)} yet. Ask Q to search, or add people from a profile.</p></section>}
      {entries.length > 0 && (
        <div className="hc-board" aria-label="Pipeline by stage">
          {STAGES.map((s) => { const col = entries.filter((e) => e.stage === s); return (
            <section key={s} className="hc-col" data-empty={col.length ? undefined : '1'} aria-label={`${STAGE_LABEL[s]}, ${col.length}`}>
              <h2 className="hc-col-h"><span>{STAGE_LABEL[s]}</span><span className="num muted">{col.length}</span></h2>
              {col.length === 0 && <p className="t14 muted" style={{ margin: 0 }}>None</p>}
              {col.map((e) => <Card key={e.personId + e.mandateId} e={e} showRole={mid === 'all'} roleTitle={title(e.mandateId)} can={can} onMove={(to) => move(e, to)} />)}
            </section>); })}
        </div>
      )}
      {out.length > 0 && (
        <details className="ds-sheet"><summary style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}><b>Not progressing or withdrew · {out.length}</b></summary>
          <ul className="hc-plain">{out.map((e) => <li key={e.personId + e.mandateId}><b>{personOf(w, e.personId)?.name}</b> · {title(e.mandateId)} · {STAGE_LABEL[e.stage]} since {tDay(`${e.at}T12:00:00Z`, LAGOS)}{e.note ? <> · <span className="muted">internal reason: {e.note}</span></> : null}
            {can && <button type="button" className="ds-btn quiet" onClick={() => move(e, 'SHORTLISTED')}>Bring back to Shortlisted</button>}</li>)}</ul>
        </details>
      )}
      {rejecting && <RejectForm e={rejecting} onDone={() => setRejecting(null)} />}
    </Canvas>
  );
}

function Card({ e, showRole, roleTitle, can, onMove }: { e: PipelineEntry; showRole: boolean; roleTitle: string; can: boolean; onMove: (s: Stage) => void }) {
  const w = useWorld((x) => x);
  const p = personOf(w, e.personId);
  const ev = w.calendar.find((x) => x.personId === e.personId && x.orgId === actorOf(w).orgId && x.status !== 'CANCELLED');
  const id = `mv-${e.personId}-${e.mandateId}`;
  return (
    <article className="hc-pcard" aria-label={p?.name}>
      <b>{p?.name ?? e.personId}</b>
      {showRole && <span className="t14 muted">{roleTitle}</span>}
      <span className="t14 muted">Since {tDay(`${e.at}T12:00:00Z`, LAGOS)} · by {firstOf(w, e.by)}</span>
      {ev && <span className="t14">Interview {tDay(ev.start, LAGOS)} · {ev.status.toLowerCase().replace('_', ' ')}</span>}
      {can && (
        <div className="hc-move">
          <label htmlFor={id} className="sr">Move {p?.name} to</label>
          <select id={id} className="ds-input" value="" onChange={(x) => { if (x.target.value) onMove(x.target.value as Stage); }}>
            <option value="">Move to…</option>
            {[...STAGES, 'REJECTED' as Stage].filter((s) => s !== e.stage).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </div>
      )}
    </article>
  );
}

function RejectForm({ e, onDone }: { e: PipelineEntry; onDone: () => void }) {
  const w = useWorld((x) => x);
  const p = personOf(w, e.personId)!;
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  return (
    <section className="ds-sheet" role="dialog" aria-labelledby="rj-h" style={{ display: 'grid', gap: 12 }}>
      <h2 id="rj-h" className="voice t24" style={{ margin: 0 }}>Not progressing {p.name.split(' ')[0]}</h2>
      <p style={{ margin: 0 }}>The reason stays in Kora’s internal record and is never put in the message to {p.name.split(' ')[0]}. It must be about the job.</p>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={(x) => { x.preventDefault(); const r = reason.trim(); if (r.length < 4) { setErr('Add a short, job-related reason.'); return; } if (protectedCriterion(normalise(`not progressing because ${r}`)) || /\b(age|old|young|married|pregnan\w*|religio\w*|tribe|state of origin)\b/i.test(r)) { setErr('That isn’t a job-related reason, so it can’t be recorded. Describe what about the work didn’t fit.'); return; } void runAction({ label: 'Reject', act: { t: 'do', op: 'hire-c.reject', args: { personId: e.personId, mandateId: e.mandateId, reason: r } } }); onDone(); }}>
        <div className="ds-field"><label htmlFor="rj-r">Reason (internal)</label><input id="rj-r" className="ds-input" value={reason} onChange={(x) => setReason(x.target.value)} aria-invalid={!!err} aria-describedby={err ? 'rj-e' : undefined} />{err && <span id="rj-e" role="alert" className="t14" style={{ color: 'var(--risk)' }}>{err}</span>}</div>
        <div className="ds-actions"><button type="submit" className="ds-btn primary">Record and draft a kind message</button><button type="button" className="ds-btn quiet" onClick={onDone}>Cancel</button></div>
      </form>
    </section>
  );
}
