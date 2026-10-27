// P9 · SC-067 Evidence Passport, SC-073 sharing manager, SC-074 what employers see, SC-028/V28 candidate control.
// Sharing changes take effect immediately on the employer side (shared store), including revocation.
import { useState } from 'react';
import type { Evidence } from '@contracts';
import { log, update, useWorld } from '../mock/world';
import { Button, Label, Segmented, Sim, toast } from '../ui/kit';
import { IEye, IEyeOff, ILock } from '../ui/icons';

type View = 'mine' | 'kora';
const KIND: Record<Evidence['kind'], string> = { PROJECT: 'Project', CREDENTIAL: 'Credential', ASSESSMENT: 'Assessment', WORK_SAMPLE: 'Work sample', REFERENCE: 'Reference', EMPLOYMENT: 'Employment' };

export function Passport() {
  const evidence = useWorld((w) => w.evidence);
  const items = evidence.filter((e) => e.ownerId === 'p_tobi');
  const [view, setView] = useState<View>('mine');
  const visibleToKora = (e: Evidence) => e.visibility === 'PUBLIC_PROFILE' || (e.visibility === 'SHARED_WITH' && e.sharedWith.includes('org_kora'));
  const shown = view === 'kora' ? items.filter(visibleToKora) : items;

  const setVis = (id: string, v: Evidence['visibility']) => update((d) => {
    const e = d.evidence.find((x) => x.evidenceId === id)!;
    e.visibility = v;
    e.sharedWith = v === 'SHARED_WITH' ? ['org_kora'] : [];
    log(d, 'Candidate', `${v === 'PRIVATE' ? 'Stopped sharing' : 'Shared'} “${e.title}”`);
  });

  return (
    <main className="main stack gap-10">
      <header className="stack gap-3">
        <span className="t-label q-text">Tobi Adeyemi · Evidence Passport</span>
        <h1 className="t-display">What you’ve done, and who can see it.</h1>
        <p className="t-lead muted measure">Each item says what it shows and what it doesn’t. You decide who sees it. Practice stays private unless you choose to add it here.</p>
        <Segmented label="View as" value={view} onChange={setView} options={[{ value: 'mine', label: 'Everything (only you)' }, { value: 'kora', label: 'What Kora Pay sees' }]} />
      </header>

      {view === 'kora' && <p className="muted" role="status">Kora Pay sees {shown.length} of your {items.length} items. Nothing else, including your practice, is visible to them.</p>}

      <ul className="grid-2">
        {shown.map((e) => (
          <li key={e.evidenceId} className="panel stack gap-4">
            <div className="row between gap-3 wrap"><span className="t-label">{KIND[e.kind]} · {e.observedAt.slice(0, 7)}</span><span className="tag">{e.verified ? 'Verified' : 'Not verified'}</span></div>
            <h2 className="t-title" style={{ fontSize: 19 }}>{e.title}</h2>
            <p>{e.shows}</p>
            <p className="t-caption">Limits: {e.limits}</p>
            {view === 'mine' && (
              <div className="stack gap-2" style={{ borderTop: '1px solid var(--color-line)', paddingTop: 14 }}>
                <span className="row gap-2 t-caption">{e.visibility === 'PRIVATE' ? <ILock width={16} /> : <IEye width={16} />}
                  {e.visibility === 'PRIVATE' ? 'Only you' : e.visibility === 'PUBLIC_PROFILE' ? 'Anyone with your profile link' : 'Shared with Kora Pay'}</span>
                <div className="row wrap gap-2">
                  {e.visibility !== 'SHARED_WITH' && <Button compact onClick={() => { setVis(e.evidenceId, 'SHARED_WITH'); toast(`Kora Pay can now see “${e.title}”.`); }}>Share with Kora Pay</Button>}
                  {e.visibility !== 'PRIVATE' && <Button compact variant="quiet" onClick={() => { setVis(e.evidenceId, 'PRIVATE'); toast(`Kora Pay can no longer see “${e.title}”. This took effect immediately.`); }}><IEyeOff width={16} />Make private</Button>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="muted">Nothing is visible to Kora Pay right now.</p>}

      <section className="stack gap-3" aria-labelledby="exp-h">
        <Label as="h2" id="exp-h">Your data</Label>
        <div className="row wrap gap-3"><Button onClick={() => toast('Export prepared (simulated).')}>Export everything</Button><Button variant="danger" onClick={() => toast('Deletion request recorded (simulated). Nothing was deleted in this prototype.')}>Delete my passport</Button><Sim /></div>
      </section>
    </main>
  );
}
