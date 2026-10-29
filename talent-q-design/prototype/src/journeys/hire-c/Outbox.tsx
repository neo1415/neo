// /r/outreach: the outbox. Everything on its way to candidates in one ledger: waiting for a yes, queued
// while offline, and sent (simulated) with its receipt. It replaces the earlier outreach screen; drafts are
// still edited and approved in Messages (one place to act), and older comparison-flow drafts are listed too.
import { actorOf, orgOf, update, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { runAction } from '../../q/core/engine';
import { approveOutreach } from '../../q/scripts';
import type { Msg } from '../../state/domain';
import { CAN_SEND, CHANNEL_LABEL, firstOf, LAGOS, nameOf, tDay, tTime } from './lib';

type Row = { m: Msg; pid: string };
const at = (iso: string) => `${tDay(iso, LAGOS)}, ${tTime(iso, LAGOS)}`;

export function Outbox() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const canSend = CAN_SEND.includes(a.role ?? 'VIEWER');
  const rows: Row[] = w.threads.filter((t) => t.orgId === a.orgId).flatMap((t) => t.messages.filter((m) => m.from !== t.personId).map((m) => ({ m, pid: t.personId })));
  const waiting = rows.filter((r) => r.m.status === 'AWAITING_APPROVAL' || r.m.status === 'DRAFT').sort((x, y) => (x.m.status === 'AWAITING_APPROVAL' ? -1 : 1) - (y.m.status === 'AWAITING_APPROVAL' ? -1 : 1));
  const queued = rows.filter((r) => r.m.status === 'QUEUED_OFFLINE');
  const sent = rows.filter((r) => r.m.status === 'SENT_SIMULATED').sort((x, y) => y.m.at.localeCompare(x.m.at));
  const legacy = a.orgId === 'org_kora' ? w.proposals.filter((p) => ['AWAITING_APPROVAL', 'APPROVED', 'EXECUTING'].includes(p.status)) : [];
  const open = (msgId: string) => void runAction({ label: 'Open', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId } } });
  return (
    <Canvas title="Outbox" kicker={orgOf(w, a.orgId)?.name ?? 'Hiring'} open onClose={() => {}} aside={<span className="hc-policy t14 muted">{waiting.length} waiting · {queued.length} queued · {sent.length} sent</span>}>
      {w.network === 'offline' && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">◷</span><span><b>You’re offline.</b> Approved messages stay queued here until you reconnect; Q re-checks calendars before they go.</span><span /></div>}
      <section className="ds-sheet hc-ledger" aria-labelledby="ob-w">
        <div className="hc-sec-head"><h2 id="ob-w" className="voice t24" style={{ margin: 0 }}>Waiting for a yes</h2><span className="t14 muted">{canSend ? 'You can approve' : 'An admin or recruiter approves'}</span></div>
        {!waiting.length && !legacy.length && <div className="hc-empty"><b>Nothing is waiting.</b><span className="t14 muted">When Q or a colleague drafts a message, it waits here until someone who can approve says yes.</span></div>}
        <ul className="hc-ledgerlist">
          {waiting.map((r) => (
            <li key={r.m.id}>
              <span className="hc-lmain"><b>{nameOf(w, r.pid)}</b><span className="t14 muted">{r.m.subject ?? 'Message'} · drafted by {firstOf(w, r.m.from)}</span></span>
              <span className="hc-status" data-s={r.m.status}>{r.m.status === 'AWAITING_APPROVAL' ? 'Checked, needs a yes' : 'Draft, not checked'}</span>
              <button type="button" className="ds-btn" onClick={() => open(r.m.id)}>Review<span className="sr"> the message to {nameOf(w, r.pid)}</span></button>
            </li>
          ))}
          {legacy.map((p) => (
            <li key={p.proposalId}>
              <span className="hc-lmain"><b>{p.payload.to.name}</b><span className="t14 muted">{p.payload.subject} · from the comparison</span></span>
              <span className="hc-status" data-s="AWAITING_APPROVAL">{p.status === 'AWAITING_APPROVAL' ? 'Needs a yes' : 'Sending…'}</span>
              {canSend && p.status === 'AWAITING_APPROVAL' ? <button type="button" className="ds-btn" onClick={() => { update((d) => { d.proposals.find((x) => x.proposalId === p.proposalId)!.status = 'APPROVED'; }); void approveOutreach(p.proposalId); }}>Approve and send<span className="sr"> to {p.payload.to.name}</span></button> : <span />}
            </li>
          ))}
        </ul>
      </section>
      {queued.length > 0 && (
        <section className="ds-sheet hc-ledger" aria-labelledby="ob-q">
          <div className="hc-sec-head"><h2 id="ob-q" className="voice t24" style={{ margin: 0 }}>Queued while offline</h2><span className="t14 muted">Approved, not sent yet</span></div>
          <ul className="hc-ledgerlist">{queued.map((r) => (
            <li key={r.m.id}><span className="hc-lmain"><b>{nameOf(w, r.pid)}</b><span className="t14 muted">{r.m.subject ?? 'Message'} · approved by {r.m.approvedBy ? firstOf(w, r.m.approvedBy) : '—'}</span></span><span className="hc-status" data-s="QUEUED_OFFLINE">Goes on reconnect</span><button type="button" className="ds-btn quiet" onClick={() => open(r.m.id)}>Open</button></li>
          ))}</ul>
        </section>
      )}
      <section className="ds-sheet hc-ledger" aria-labelledby="ob-s">
        <div className="hc-sec-head"><h2 id="ob-s" className="voice t24" style={{ margin: 0 }}>Sent</h2><span className="ds-sim">Simulated sends</span></div>
        {!sent.length && !w.receipts.length && <div className="hc-empty"><b>Nothing sent yet.</b><span className="t14 muted">Each send gets a receipt here: who approved it, how it went and when.</span></div>}
        <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Sent messages and receipts">
          {(sent.length > 0 || w.receipts.length > 0) && <table className="ds-table hc-receipts">
            <thead><tr><th scope="col">To</th><th scope="col">Sent</th><th scope="col">How</th><th scope="col">Approved by</th><th scope="col">Receipt</th></tr></thead>
            <tbody>
              {sent.map((r) => <tr key={r.m.id}><th scope="row">{nameOf(w, r.pid)}<span className="t14 muted hc-blockline">{r.m.subject ?? 'Message'}</span></th><td className="num">{at(r.m.at)}</td><td>{CHANNEL_LABEL[r.m.channel]}</td><td>{r.m.approvedBy ? firstOf(w, r.m.approvedBy) : '—'}</td><td className="hc-mono">{r.m.receipt ?? "—"}</td></tr>)}
              {a.orgId === 'org_kora' && w.receipts.map((r) => { const p = w.proposals.find((x) => x.proposalId === r.proposalId); return <tr key={r.proposalId}><th scope="row">{p?.payload.to.name ?? '—'}<span className="t14 muted hc-blockline">{p?.payload.subject}</span></th><td className="num">{at(r.at)}</td><td>email</td><td>{r.approvedBy?.split(' ')[0] ?? '—'}</td><td className="hc-mono">{r.providerRef}</td></tr>; })}
            </tbody>
          </table>}
        </div>
      </section>
    </Canvas>
  );
}
