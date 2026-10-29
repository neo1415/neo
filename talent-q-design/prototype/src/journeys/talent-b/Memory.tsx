// What Q remembers about a candidate: each item with its source, what it's used for and proof it was never
// shared; deletion with a clear plan of what goes and what can't (the audit record), and receipts afterwards.
import { useState } from 'react';
import { motion } from 'motion/react';
import { arrive } from '../../ds/motion';
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
    <Canvas title="What Q remembers" kicker="Private to you, and yours to delete" open onClose={() => navigate('/c/home')}>
      <p className="t14 muted" style={{ margin: 0, maxWidth: 720 }}>Things you told Q, kept so you don’t have to repeat yourself. None of it is shown to employers unless you choose. Delete anything here, or tell Q “forget that…”.</p>
      {dels.length > 0 && (
        <section className="ds-sheet tb-stack" aria-labelledby="tb-del-h">
          <h2 id="tb-del-h" className="tb-h2">Deletion receipts</h2>
          <ul className="tb-stack" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-live="polite">
            {dels.map((d) => (
              <motion.li key={d.id} {...arrive} className="tb-receipt">
                <div className="tb-row-between"><b>Deleted on {fmtDate(d.at)}</b><span className="ds-tag" data-k="ok">✓ Gone</span></div>
                <dl className="tb-receipt-dl">
                  <div><dt>Deleted</dt><dd>{d.deleted.join('; ')}.</dd></div>
                  <div><dt>Kept</dt><dd>{d.kept.join('; ')}.</dd></div>
                  <div><dt>Shared?</dt><dd>{d.neverShared ? 'Never shared with any employer: 0 disclosures in your sharing log.' : 'It had been shared; those employers were told it was withdrawn.'}</dd></div>
                </dl>
                <span className="t14 muted num tb-receipt-id">Receipt {d.id}</span>
              </motion.li>
            ))}
          </ul>
        </section>
      )}
      {ms.length === 0 && practice.length === 0 ? (
        <section className="ds-sheet tb-empty"><h2 className="tb-h2">Q doesn’t remember anything about you yet</h2><p className="t14 muted" style={{ margin: 0 }}>When you tell Q something worth keeping, like the pay you need or where you’d move, it appears here first, and you can delete it any time.</p></section>
      ) : (
        <section className="ds-sheet" aria-labelledby="tb-mem-h">
          <div className="tb-row-between"><h2 id="tb-mem-h" className="tb-h2">Remembered <span className="tb-count num">{ms.length + practice.length}</span></h2></div>
          <ul className="tb-memlist" aria-label="Remembered items">
            {ms.map((m) => {
              const plan = confirm === m.id ? deletionPlan(w, pid, [m]) : null;
              return (
                <li key={m.id} data-sensitive={m.sensitive || undefined}>
                  <div className="tb-row-between"><span className="lab">{m.source}</span><span className="tb-memtags">{m.sensitive && <span className="ds-tag" data-k="warn">Sensitive</span>}<span className="ds-tag">{m.sharedWith.length ? `Shared with ${m.sharedWith.map((o) => orgName(w, o)).join(', ')}` : 'Never shared'}</span></span></div>
                  <b className="tb-memtext">{m.text}</b>
                  <span className="t14 muted">Used for: {m.usedFor}</span>
                  {plan ? (
                    <div className="tb-confirm" role="alertdialog" aria-labelledby={`del-${m.id}`}>
                      <p id={`del-${m.id}`} style={{ margin: 0 }}><b>Delete this?</b> It can’t be undone.</p>
                      <p className="t14" style={{ margin: 0 }}><b>Deleted:</b></p><ul className="t14">{plan.deleted.map((x) => <li key={x}>{x}</li>)}</ul>
                      <p className="t14" style={{ margin: 0 }}><b>Can’t be deleted:</b></p><ul className="t14">{plan.kept.map((x) => <li key={x}>{x}</li>)}</ul>
                      <div className="tb-actions"><button type="button" className="ds-btn danger" onClick={() => { setConfirm(null); void runAction({ label: 'Delete', act: { t: 'do', op: 'tb.forget', args: { ids: [m.id], what: m.key } } }); }}>Delete it</button><button type="button" className="ds-btn quiet" onClick={() => setConfirm(null)}>Keep it</button></div>
                    </div>
                  ) : <button type="button" className="tb-linkbtn" onClick={() => setConfirm(m.id)} aria-label={`Delete: ${m.text}`}>Delete…</button>}
                </li>
              );
            })}
            {practice.map((m) => <li key={m.memory_id}><span className="lab">Private practice</span><b className="tb-memtext">{m.content}</b><span className="t14 muted">{m.importance_reason}</span></li>)}
          </ul>
        </section>
      )}
    </Canvas>
  );
}
