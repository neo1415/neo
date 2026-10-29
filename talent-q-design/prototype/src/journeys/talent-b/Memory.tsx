// What Q remembers about a candidate: each item with its source, what it's used for and proof it was never
// shared; deletion with a clear plan of what goes and what can't (the audit record), and receipts afterwards.
import { useState } from 'react';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { runAction } from '../../q/core/engine';
import { navigate } from '../../ui/router';
import { deletionPlan, fmtDate, memoriesOf, orgName, tb } from './logic';

export function CandidateMemoryPage() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const ms = memoriesOf(w, pid).filter((m) => m.state === 'ACTIVE');
  const practice = w.memories.filter((m) => m.owner_id === pid && m.lifecycle_status === 'active');
  const dels = tb(w).deletions.filter((d) => d.personId === pid).reverse();
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <Canvas title="What Q remembers" kicker={`${a.first} · private to you`} open onClose={() => navigate('/c/home')}>
      <p className="t14 muted" style={{ margin: 0, maxWidth: 720 }}>Things you told Q, kept so you don’t have to repeat yourself. None of it is shown to employers unless you choose. You can delete anything; tell Q “forget that…” or use the buttons.</p>
      {dels.length > 0 && (
        <section className="ds-sheet tb-stack" aria-labelledby="tb-del-h">
          <h2 id="tb-del-h" className="voice t24" style={{ margin: 0 }}>Deletion receipts</h2>
          <ul className="tb-stack" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-live="polite">
            {dels.map((d) => (
              <li key={d.id} className="tb-receipt">
                <b>Deleted on {fmtDate(d.at)}</b>
                <span className="t14">Deleted: {d.deleted.join('; ')}.</span>
                <span className="t14">Kept: {d.kept.join('; ')}.</span>
                <span className="t14">{d.neverShared ? 'Never shared with any employer: 0 disclosures in your sharing log.' : 'It had been shared; those employers were told it was withdrawn.'}</span>
                <span className="t14 muted num">Receipt {d.id}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {ms.length === 0 && practice.length === 0 ? <section className="ds-sheet"><p style={{ margin: 0 }}>Q doesn’t remember anything about you yet.</p></section> : (
        <ul className="tb-stack" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Remembered items">
          {ms.map((m) => {
            const plan = confirm === m.id ? deletionPlan(w, pid, [m]) : null;
            return (
              <li key={m.id} className="ds-sheet tb-stack">
                <div className="tb-row-between"><span className="lab">{m.sensitive ? 'Sensitive · ' : ''}{m.source}</span><span className="ds-tag" data-k="ok">{m.sharedWith.length ? `Shared with ${m.sharedWith.map((o) => orgName(w, o)).join(', ')}` : 'Never shared'}</span></div>
                <b>{m.text}</b>
                <span className="t14 muted">Used for: {m.usedFor}</span>
                {plan ? (
                  <div className="tb-confirm" role="alertdialog" aria-labelledby={`del-${m.id}`}>
                    <p id={`del-${m.id}`} style={{ margin: 0 }}><b>Delete this?</b> It can’t be undone.</p>
                    <p className="t14" style={{ margin: 0 }}><b>Deleted:</b></p><ul className="t14">{plan.deleted.map((x) => <li key={x}>{x}</li>)}</ul>
                    <p className="t14" style={{ margin: 0 }}><b>Can’t be deleted:</b></p><ul className="t14">{plan.kept.map((x) => <li key={x}>{x}</li>)}</ul>
                    <div className="tb-actions"><button type="button" className="ds-btn danger" onClick={() => { setConfirm(null); void runAction({ label: 'Delete', act: { t: 'do', op: 'tb.forget', args: { ids: [m.id], what: m.key } } }); }}>Delete it</button><button type="button" className="ds-btn quiet" onClick={() => setConfirm(null)}>Keep it</button></div>
                  </div>
                ) : <button type="button" className="ds-btn quiet" style={{ justifySelf: 'start' }} onClick={() => setConfirm(m.id)}>Delete…</button>}
              </li>
            );
          })}
          {practice.map((m) => <li key={m.memory_id} className="ds-sheet tb-stack"><span className="lab">Private practice</span><b>{m.content}</b><span className="t14 muted">{m.importance_reason}</span></li>)}
        </ul>
      )}
    </Canvas>
  );
}
