// MO-046 Invite delivery status: Approved → Accepted → Delivered → Read, each step shown only from a receipt.
// CSS motion (hd-rail): the connector fills and the step mark settles in DUR.normal with EASE.enter; with reduced
// motion the transition is off and the status reads as plain text ("Clear message status", the atlas fallback).
// Read is known only when the candidate opened it in Talent Q or replied; email and SMS read receipts aren't tracked.
import { useWorld } from '../../mock/world';
import { runAction } from '../../q/core/engine';
import { registerRef } from '../../q/refs';
import { firstOf, LAGOS, tDay, tTime } from '../hire-c/lib';
import { railOf } from './model';

const when = (iso?: string) => (iso ? `${tDay(iso, LAGOS)} ${tTime(iso, LAGOS)}` : '');

export function DeliveryRail({ msgId, testing = false }: { msgId: string; testing?: boolean }) {
  const w = useWorld((x) => x);
  const r = railOf(w, msgId);
  if (!r) return null;
  const f0 = w.threads.find((t) => t.messages.some((m) => m.id === msgId)); const m = f0?.messages.find((x) => x.id === msgId);
  const pf = f0 ? firstOf(w, f0.personId) : 'They';
  const steps = [
    { k: 'approved', label: 'Approved', at: r.approved?.at, detail: r.approved ? `by ${firstOf(w, r.approved.by)}` : 'waiting for a person' },
    { k: 'accepted', label: 'Accepted', at: r.accepted, detail: r.failed ? r.failed : r.accepted ? 'by the provider (simulated)' : 'not yet' },
    { k: 'delivered', label: 'Delivered', at: r.delivered, detail: r.delivered ? 'receipt from the provider (simulated)' : 'no receipt yet' },
    { k: 'read', label: 'Read', at: r.read, detail: r.read ? r.readWhy : r.readNa ?? 'not opened yet' },
  ];
  const last = steps.reduce((i, s, n) => (s.at ? n : i), -1);
  const status = r.failed ? r.failed : last < 0 ? 'Not sent' : steps[last].label;
  return (
    <div className="hd-railwrap">
      <ol className="hd-rail" data-msg={msgId} data-last={steps[last]?.k ?? 'none'} aria-label={`Delivery of the message to ${pf}: ${status}`}>
        {steps.map((s, i) => (
          <li key={s.k} data-step={s.k} data-done={s.at ? '1' : undefined} data-na={!s.at && s.k === 'read' && r.readNa ? '1' : undefined} data-fail={s.k === 'accepted' && r.failed ? '1' : undefined}>
            <span className="hd-rail-line" aria-hidden="true" style={{ ['--fill' as string]: i < last ? 1 : 0 }} />
            <span className="hd-rail-dot" aria-hidden="true" />
            <span className="hd-rail-txt"><b>{s.label}</b><span className="t14 muted">{s.at ? when(s.at) : ''}{s.at ? ' · ' : ''}{s.detail}</span></span>
          </li>
        ))}
      </ol>
      <p className="sr" aria-live="polite">Status: {status}</p>
      {testing && m && m.status === 'SENT_SIMULATED' && (!r.delivered || (m.channel === 'IN_APP' && !r.read)) && (
        <div className="hd-testrow" role="group" aria-label="Simulate receipts (testing)">
          <span className="lab">Testing</span>
          {!r.delivered && <button type="button" className="ds-btn quiet" onClick={() => void runAction({ label: 'Delivered', act: { t: 'do', op: 'hd.receipt', args: { msgId, what: 'delivered' } } })}>Simulate the delivery receipt</button>}
          {m.channel === 'IN_APP' && !r.read && <button type="button" className="ds-btn quiet" onClick={() => void runAction({ label: 'Read', act: { t: 'do', op: 'hd.receipt', args: { msgId, what: 'read' } } })}>Simulate {pf} opening it</button>}
        </div>
      )}
    </div>
  );
}

registerRef('hire-d.delivery', ({ id }) => <DeliveryRail msgId={id} />);
