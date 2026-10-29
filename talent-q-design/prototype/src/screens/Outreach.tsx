// P6 · SC-049 Approve outgoing message, SC-048 composer, SC-158 bounded delegation, SC-047 contact permission.
// Policy is resolved before drafting and shown before approval. Approval binds to the exact text (hash).
import { useEffect, useRef, useState } from 'react';
import { POLICY_PRECEDENCE, type DelegationMode } from '@contracts';
import { update, useWorld } from '../mock/world';
import { approveOutreach, sha256 } from '../q/scripts';
import { Banner, Button, Choice, Label, Sim, TextArea, toast } from '../ui/kit';
import { Link } from '../ui/router';

const UNDO_MS = 5000;

export function Outreach() {
  const w = useWorld((x) => x);
  const pending = w.proposals.filter((p) => p.status === 'AWAITING_APPROVAL' || p.status === 'APPROVED' || p.status === 'EXECUTING');
  const [selId, setSelId] = useState<string | null>(null);
  const sel = pending.find((p) => p.proposalId === selId) ?? pending[0];
  const [body, setBody] = useState(sel?.payload.body ?? '');
  const [hash, setHash] = useState(sel?.payloadHash ?? '');
  const timer = useRef<number | null>(null);
  useEffect(() => { setBody(sel?.payload.body ?? ''); setHash(sel?.payloadHash ?? ''); }, [sel?.proposalId]);
  useEffect(() => { if (sel) sha256(JSON.stringify({ ...sel.payload, body })).then(setHash); }, [body, sel]);
  const edited = sel && body !== sel.payload.body;

  const approve = () => {
    if (!sel) return;
    const id = sel.proposalId;
    update((d) => { d.proposals.find((p) => p.proposalId === id)!.status = 'APPROVED'; });
    timer.current = window.setTimeout(() => { approveOutreach(id, edited ? body : undefined).then(() => toast(<>Sent to {sel.payload.to.name}. <Sim>Simulated email</Sim></>)); }, UNDO_MS);
    toast(<>Sending to {sel.payload.to.name} in 5 seconds.</>, { label: 'Undo', run: () => { if (timer.current) clearTimeout(timer.current); update((d) => { d.proposals.find((p) => p.proposalId === id)!.status = 'AWAITING_APPROVAL'; }); } }, UNDO_MS);
  };

  return (
    <main className="main stack gap-10">
      <header className="stack gap-3">
        <span className="t-label q-text">Approvals · earlier outreach flow</span>
        <p className="muted measure">Candidate messages now live in <Link to="/r/messages">Messages</Link>, where Q checks each draft before you approve it. Talk to Q in the conversation beside this page; this screen has no conversation of its own.</p>
        <h1 className="t-display">{pending.length ? 'Nothing goes out without your yes.' : 'No drafts are waiting.'}</h1>
        {!pending.length && <p className="muted measure">When Q drafts a message, it waits here with the rules it followed. <Link to="/r/compare">Draft one from the comparison</Link>.</p>}
      </header>

      {pending.length > 1 && (
        <div className="row wrap gap-2" role="group" aria-label="Drafts waiting">
          {pending.map((p) => <Button key={p.proposalId} compact variant={p.proposalId === sel?.proposalId ? 'primary' : 'secondary'} aria-pressed={p.proposalId === sel?.proposalId} onClick={() => setSelId(p.proposalId)}>{p.payload.to.name}</Button>)}
        </div>
      )}
      {sel && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="stack gap-6" aria-labelledby="draft-h">
            <div className="stack gap-1">
              <h2 id="draft-h" className="t-title">{sel.summary}</h2>
              <p className="t-caption">To {sel.payload.to.name} · by email · from Ada Okafor</p>
            </div>
            <div className="paper panel stack gap-4">
              <p className="t-label">Subject: {sel.payload.subject}</p>
              <TextArea label="Message" value={body} onChange={setBody} rows={12} help="Edit freely. Your approval covers exactly the text you approve." />
            </div>
            {edited && <Banner tone="info" title="You changed the draft">Approval will bind to the edited text. Q rechecks the rules before sending.</Banner>}
            <div className="row wrap gap-3">
              <Button variant="primary" onClick={approve} disabled={sel.status !== 'AWAITING_APPROVAL'}>{sel.status === 'AWAITING_APPROVAL' ? 'Approve and send' : sel.status === 'EXECUTING' ? 'Sending…' : 'Approved, sending'}</Button>
              <Button variant="quiet" onClick={() => update((d) => { d.proposals.find((p) => p.proposalId === sel.proposalId)!.status = 'REJECTED'; })}>Don’t send</Button>
            </div>
            <p className="t-mono subtle" style={{ wordBreak: 'break-all' }}>Approval binds to {hash.slice(0, 23)}…</p>
          </section>

          <aside className="stack gap-8" aria-label="Why this draft is allowed">
            <div className="stack gap-3">
              <Label as="h2">Rules applied, in order</Label>
              <ol className="stack gap-3">
                {[...sel.policies].sort((a, b) => POLICY_PRECEDENCE.indexOf(a.layer) - POLICY_PRECEDENCE.indexOf(b.layer)).map((p) => (
                  <li key={p.policyId} className="stack gap-1" style={{ borderTop: '1px solid var(--color-line)', paddingTop: 12 }}>
                    <span className="t-label">{p.layer.replace('_', ' ').toLowerCase()} · v{p.version}</span>
                    <span>{p.text}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="stack gap-3">
              <Label as="h2">Channel</Label>
              <p>Email. Tobi’s profile allows recruiter contact by email.</p>
              <p className="t-caption">WhatsApp calls aren’t offered: business calling isn’t available to senders based in Nigeria. SMS needs Tobi’s opt-in, which we don’t have.</p>
            </div>
            <Delegation value={w.org.delegation} onChange={(v) => update((d) => { d.org.delegation = v; })} />
          </aside>
        </div>
      )}

      {w.receipts.length > 0 && (
        <section className="stack gap-3" aria-labelledby="sent-h">
          <Label as="h2" id="sent-h">Sent</Label>
          <ul className="stack">
            {w.receipts.map((r) => { const p = w.proposals.find((x) => x.proposalId === r.proposalId); return (
              <li key={r.proposalId} className="row wrap gap-4" style={{ padding: '12px 0', borderTop: '1px solid var(--color-line)' }}>
                <span className="grow">{p?.summary}</span><span className="t-mono subtle">{r.idempotencyKey}</span><Sim>Simulated receipt</Sim>
              </li>); })}
          </ul>
        </section>
      )}
    </main>
  );
}

function Delegation({ value, onChange }: { value: DelegationMode; onChange: (v: DelegationMode) => void }) {
  return (
    <fieldset className="stack gap-2" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="t-label" style={{ marginBottom: 8 }}>How much Q may do on its own</legend>
      <Choice name="deleg" value="DRAFT_ONLY" checked={value === 'DRAFT_ONLY'} onChange={(v) => onChange(v as DelegationMode)} title="Draft only" detail="Q writes; you send it yourself." />
      <Choice name="deleg" value="APPROVE_EACH_SEND" checked={value === 'APPROVE_EACH_SEND'} onChange={(v) => onChange(v as DelegationMode)} title="Approve each send" detail="Q sends only after you approve each message." />
      <Choice name="deleg" value="APPROVED_CAMPAIGN" checked={value === 'APPROVED_CAMPAIGN'} onChange={(v) => onChange(v as DelegationMode)} title="Approved campaign"
        detail="Q sends within limits you set: this template, this shortlist, at most 10 messages, ending 14 Nov." />
    </fieldset>
  );
}
