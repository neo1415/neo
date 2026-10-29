// Reply intelligence (E01-19) and its Q cards. A short summary Q derived, the quoted source underneath it (the
// summary never replaces the email), the times it extracted (forgettable), how the reply was matched to this thread
// (confirm when the subject changed), and a suggested next step that still needs approval. Email is untrusted
// content: anything that reads like an instruction is shown as text and never acted on. With a send-only mailbox,
// Q says plainly that it can't see email replies.
import { motion } from 'motion/react';
import { useWorld, type World } from '../../mock/world';
import { arrive } from '../../ds/motion';
import { runAction } from '../../q/core/engine';
import { registerRef } from '../../q/refs';
import { hc } from '../../state/areas/hire-c';
import { canRead, mail, mailboxOf, PROVIDER_NAME } from '../../state/areas/mail';
import type { Msg, Thread } from '../../state/domain';
import { findMsg, firstOf, LAGOS, nameOf, tDay, tTime } from './lib';
import { deliveryView, extractTime, looksLikeInstruction, pendingMatch, replyMailbox } from './email';
import './email.css';

const go = (label: string, op: string, args: Record<string, unknown>) => void runAction({ label, act: { t: 'do', op, args } });
const STOP = /\b(stop (contacting|emailing|messaging)|unsubscribe|do not contact|don'?t contact)\b/i;

export function summaryOf(w: World, t: Thread, m: Msg) {
  const first = firstOf(w, t.personId); const x = extractTime(w, t, m.body);
  if (STOP.test(m.body)) return `${first} asks ${'not to be contacted again'}. Recorded as a suppression; nothing more will be sent.`;
  if (x?.start) return `${first} accepts ${tDay(x.start, LAGOS)} at ${tTime(x.start, LAGOS)}${x.offered ? ', one of the times offered' : ''}. No other questions.`;
  if (x?.day || x?.hm) return `${first} mentions ${[x.day, x.hm].filter(Boolean).join(' ')}, which doesn’t match a time offered.`;
  if (/\?/.test(m.body)) return `${first} asks a question: “${m.body.split('?')[0].split(/[.!\n]/).pop()?.trim()}?”`;
  return `${first} replied; nothing to act on that I can see.`;
}

export function ReplyCard({ t, m, compact }: { t: Thread; m: Msg; compact?: boolean }) {
  const w = useWorld((x) => x);
  const mb = mailboxOf(w, m.inbound?.mailbox);
  const pend = pendingMatch(m);
  const x = extractTime(w, t, m.body);
  const ext = mail(w).extracted.filter((e) => e.msgId === m.id);
  const booked = w.calendar.some((e) => e.personId === t.personId && e.orgId === t.orgId && e.status === 'CONFIRMED' && x?.start && e.start === x.start);
  const first = firstOf(w, t.personId);
  const lastOut = [...t.messages].reverse().find((y) => y.from !== t.personId && y.subject && y.at < m.at);
  return (
    <motion.div className="em-intel" role="group" aria-label={`Reply from ${first}: what Q found`} {...arrive}>
      <div className="hc-card-head"><span className="lab">Reply from {first} · {tDay(m.at, LAGOS)} {tTime(m.at, LAGOS)}</span><span className="ds-sim">Simulated inbox</span></div>
      <p className="em-summary voice">{summaryOf(w, t, m)}</p>
      <blockquote className="em-quote"><span className="t14 muted">{m.channel === 'EMAIL' ? `Email to ${mb?.address ?? 'your mailbox'}` : 'In Talent Q'} · subject “{m.subject}”</span><span className="em-qbody">{m.body}</span></blockquote>
      {looksLikeInstruction(m.body) && <p className="em-note" data-k="warn">This email contains instructions. Q treats email as information only and didn’t act on them.</p>}
      <dl className="em-env compact">
        <div><dt>Matched</dt><dd>{pend ? <>By the email thread and sender, but the subject changed{lastOut ? <> (was “{lastOut.subject}”)</> : null}. <b>Waiting for you to confirm.</b></> : m.inbound?.matchedBy === 'USER_CONFIRMED' ? 'Confirmed by a person' : m.inbound?.matchedBy === 'SENDER_AND_ROLE' ? 'By sender and the role it’s about' : 'By the email thread'}</dd></div>
        {ext.length > 0 && <div><dt>Q extracted</dt><dd>{ext.map((e) => <span key={e.id} className="em-chiprow">{e.forgotten ? <s>{e.text}</s> : <b>{e.text}</b>}{!e.forgotten && <button type="button" className="hc-more" onClick={() => go('Forget', 'email.forget', { id: e.id })}>Forget this</button>}{e.forgotten && <span className="t14 muted"> forgotten; the email is unchanged</span>}</span>)}</dd></div>}
      </dl>
      {!compact && (
        <div className="ds-actions">
          {pend ? <>
            <button type="button" className="ds-btn primary" onClick={() => go('Confirm', 'email.match', { msgId: m.id, ok: true })}>Yes, it belongs here</button>
            <button type="button" className="ds-btn quiet" onClick={() => go('Separate', 'email.match', { msgId: m.id, ok: false })}>No, keep it separate</button>
          </> : x?.start && !booked ? <button type="button" className="ds-btn primary" onClick={() => go('Book', 'email.book', { msgId: m.id })}>Book {tDay(x.start, LAGOS)} {tTime(x.start, LAGOS)} and draft a confirmation</button>
            : booked ? <span className="ds-tag" data-k="ok">✓ Booked (simulated calendar)</span> : null}
        </div>
      )}
      {!compact && !pend && x?.start && !booked && <p className="t14 muted" style={{ margin: 0 }}>Q checks the calendars first and only books if everyone is free. The confirmation still needs your approval.</p>}
    </motion.div>
  );
}

/** "Q can't see replies" panel for a send-only (or expired) mailbox. Shows no data it doesn't have. */
export function ReadScope({ t }: { t: Thread }) {
  const w = useWorld((x) => x);
  const mb = replyMailbox(w, t);
  if (!mb || canRead(mb)) return null;
  return (
    <p className="em-scope" role="note"><b>Q can’t see email replies to {mb.address}.</b> {mb.state === 'EXPIRED' ? `The ${PROVIDER_NAME[mb.provider]} sign-in expired.` : 'It’s connected send-only.'} {firstOf(w, t.personId)} may have replied there; check that inbox. Replies in Talent Q still show here. <a href="#/settings/email">Email settings</a></p>
  );
}

// ---------------- Q cards ----------------
function ReplyRef({ id }: { id: string }) {
  const w = useWorld((x) => x); const f0 = findMsg(w, id);
  if (!f0) return <p className="t14 muted" style={{ margin: 0 }}>That reply was moved to its own conversation.</p>;
  return <ReplyCard t={f0.t} m={f0.m} />;
}
function StatusRef({ id }: { id: string }) {
  const w = useWorld((x) => x); const f0 = findMsg(w, id); if (!f0) return null;
  const m = f0.m; const dv = deliveryView(w, m); const mb = mailboxOf(w, m.senderId);
  return (
    <div className="hc-card" role="group" aria-label={`Email status for ${nameOf(w, f0.t.personId)}`}>
      <div className="hc-card-head"><span className="lab">{m.subject}</span><span className="ds-tag" data-k={dv?.tone}>{dv?.label ?? m.status}</span></div>
      <Attempts m={m} />
      <p className="t14 muted" style={{ margin: 0 }}>From {mb?.address ?? '—'} to {nameOf(w, f0.t.personId)}{m.idempotencyKey ? <> · key <span className="hc-mono">{m.idempotencyKey}</span></> : null}{m.providerId ? <> · provider id <span className="hc-mono">{m.providerId}</span></> : null}</p>
    </div>
  );
}
/** Each provider attempt, oldest first: the honest record behind "sent once". */
export function Attempts({ m }: { m: Msg }) {
  if (!m.attempts?.length) return null;
  return (
    <ol className="em-attempts" aria-label="Send attempts">
      {m.attempts.map((x, i) => <li key={i} data-r={x.result}><span className="num">{tTime(x.at, LAGOS)}</span><span>{x.result === 'ACCEPTED' ? 'Accepted by the provider (simulated)' : x.result === 'DUPLICATE_PREVENTED' ? 'Asked again: duplicate prevented, not resent' : `Failed: ${x.reason === 'AUTH_EXPIRED' ? 'sign-in expired' : x.reason === 'RATE_LIMITED' ? 'rate-limited' : x.reason === 'SMTP_REJECTED' ? 'server refused it' : (x.reason ?? '').toLowerCase().replace(/_/g, ' ')}`}</span></li>)}
    </ol>
  );
}
function BatchRef({ id }: { id: string }) {
  const w = useWorld((x) => x);
  return <BatchReview w={w} batchId={id} />;
}
/** Multi-recipient review (E01-20): one row per person, their own draft and status, marks for suppression and limits. */
export function BatchReview({ w, batchId, onOpen }: { w: World; batchId: string; onOpen?: (pid: string) => void }) {
  const ds = Object.values(hc(w).drafts).filter((d) => d.batchId === batchId);
  if (!ds.length) return null;
  const rows = ds.map((d) => { const m = findMsg(w, d.msgId)?.m; const bad = (d.checks ?? []).filter((c) => !c.ok); return { d, m, bad }; });
  const open = rows.filter((r) => r.m && r.m.status !== 'SENT_SIMULATED' && r.m.status !== 'DISCARDED');
  const okN = open.filter((r) => !r.bad.length).length;
  return (
    <div className="hc-card em-batch" role="group" aria-label="Several individual emails">
      <div className="hc-card-head"><span className="lab">{ds.length} individual emails · one recipient each</span><span className="ds-sim">Simulated send</span></div>
      <ul className="em-batchrows">
        {rows.map(({ d, m, bad }) => { const dv = m ? deliveryView(w, m) : undefined; return (
          <li key={d.msgId}>
            <span className="em-bname"><b>{nameOf(w, d.personId)}</b><span className="t14 muted">{m?.subject}</span></span>
            <span className="em-bstate">
              {m?.status === 'SENT_SIMULATED' ? <span className="ds-tag" data-k={dv?.tone ?? 'ok'}>{dv?.label ?? 'Sent (simulated)'}</span>
                : bad.length ? bad.map((b) => <span key={b.id} className="ds-tag" data-k="risk">{b.id === 'suppressed' ? 'Asked not to be contacted' : b.id === 'limit' ? 'Sending limit reached' : b.label}</span>)
                  : <span className="ds-tag" data-k="busy">Ready to approve</span>}
              {onOpen && <button type="button" className="hc-more" onClick={() => onOpen(d.personId)}>Open</button>}
            </span>
          </li>); })}
      </ul>
      {open.length > 0 && <div className="ds-actions"><button type="button" className="ds-btn primary" disabled={!okN} onClick={() => go('Approve', 'email.batchApprove', { batchId })}>Approve and send {okN}</button><span className="t14 muted">Each email is approved and sent on its own. {open.length - okN ? `${open.length - okN} won’t go.` : ''}</span></div>}
    </div>
  );
}

registerRef('email.reply', ReplyRef);
registerRef('email.status', StatusRef);
registerRef('email.batch', BatchRef);
