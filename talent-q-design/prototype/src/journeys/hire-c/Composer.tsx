// The Q email composer (E01-06), grown from R3's draft editor: who it goes from (and what that sender may do), to,
// Cc/Bcc, subject, body, attachments from Q artifacts, tone, template and signature, draft history, the checks, then
// approve / send / schedule. Approval binds to the exact content; a material edit voids it and says so. Failures
// keep the approval and the idempotency key, and the recovery is the primary action (reconnect, retry, switch).
import { useEffect, useState } from 'react';
import { actorOf, orgOf, simNow, useWorld, type World } from '../../mock/world';
import { runAction } from '../../q/core/engine';
import { hc } from '../../state/areas/hire-c';
import { mail, mailboxOf, orgMailPolicy, PROVIDER_NAME } from '../../state/areas/mail';
import { campaigns } from '../../state/areas/campaigns';
import type { Msg } from '../../state/domain';
import { CAN_SEND, diffWords, firstOf, KIND_LABEL, LAGOS, msgStatusLabel, nameOf, tDay, tTime, whenText, addDays, dateIn } from './lib';
import { addressOf, approvalValid, attachmentOptions, contentHash, deliveryView, FAIL_TEXT, KIND_WORD, RECOVERY, scopeWord, senderChoices } from './email';
import { ChecksList } from './refs';
import './email.css';

const go = (label: string, op: string, args: Record<string, unknown>) => void runAction({ label, act: { t: 'do', op, args } });
const say = (text: string) => void runAction({ label: text, act: { t: 'say', text } });
const when = (iso: string) => `${tDay(iso, LAGOS)}, ${tTime(iso, LAGOS)}`;

export function Composer({ msgId, m }: { msgId: string; m: Msg }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const d = hc(w).drafts[msgId];
  const latest = d?.versions[d.versions.length - 1];
  const [text, setText] = useState(m.body);
  const [subject, setSubject] = useState(m.subject ?? '');
  const [cc, setCc] = useState((m.cc ?? []).join(', '));
  const [bcc, setBcc] = useState((m.bcc ?? []).join(', '));
  const [showCopy, setShowCopy] = useState(!!(m.cc?.length || m.bcc?.length));
  const [viewV, setViewV] = useState<number | null>(null);
  const [sched, setSched] = useState(false);
  useEffect(() => { setText(m.body); setSubject(m.subject ?? ''); setCc((m.cc ?? []).join(', ')); setBcc((m.bcc ?? []).join(', ')); }, [m.body, m.subject, m.cc, m.bcc]);
  const dirty = text !== m.body || subject !== (m.subject ?? '') || cc !== (m.cc ?? []).join(', ') || bcc !== (m.bcc ?? []).join(', ');
  const canSend = CAN_SEND.includes(a.role ?? 'VIEWER');
  const canEdit = ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER');
  const checked = d?.checks && d.checkedV === latest?.v;
  const ready = m.status === 'AWAITING_APPROVAL' && checked && d!.checks!.every((c) => c.ok || (c.id === 'role' && canSend));
  const old = viewV !== null ? d?.versions.find((x) => x.v === viewV) : undefined;
  const prev = old ? d?.versions.find((x) => x.v === old.v - 1) : undefined;
  const email = m.channel === 'EMAIL';
  const mb = mailboxOf(w, m.senderId);
  const choices = senderChoices(w, a, d?.mandateId);
  const pol = orgMailPolicy(w, d?.orgId);
  const failed = m.delivery === 'FAILED';
  const approvedKept = failed && approvalValid(m);
  const scheduled = m.delivery === 'QUEUED' && d?.scheduledFor;
  const camp = d?.campaignId ? campaigns(w).list.find((c) => c.id === d.campaignId) : undefined;
  const tpl = pol?.templates.find((t) => t.id === d?.template) ?? pol?.templates.find((t) => t.kind === d?.kind);
  const atts = d ? attachmentOptions(w, d) : [];
  const dv = deliveryView(w, m);
  const tomorrow9 = new Date(`${addDays(dateIn(simNow(w), LAGOS), 1)}T09:00:00+01:00`).toISOString();
  const shown = old ?? latest;
  if (!d) return null;
  return (
    <div className="hc-draft em-compose" aria-label={`Draft ${KIND_LABEL[d.kind]}`}>
      <div className="hc-msg-head">
        <b>{KIND_LABEL[d.kind].replace(/^\w/, (x) => x.toUpperCase())}</b>
        <span className="t14 muted">drafted by {d.by === a.id ? 'you' : firstOf(w, d.by)}{tpl ? ` · template: ${tpl.label}` : ''}</span>
        <span className="hc-status" data-s={failed ? 'FIX' : m.status}>{approvedKept ? 'Approved, not sent' : scheduled ? 'Scheduled' : msgStatusLabel[m.status]}</span>
      </div>

      {(failed || m.delivery === 'BOUNCED') && (
        <div className="em-alert" role="alert" data-k="risk">
          <b>{approvedKept ? 'Approved, not sent.' : 'Not sent.'}</b> <span>{FAIL_TEXT[m.failReason ?? 'DISCONNECTED'](mb)}</span>
          {RECOVERY[m.failReason ?? 'DISCONNECTED'] && <span className="muted"> {RECOVERY[m.failReason ?? 'DISCONNECTED']}</span>}
          {m.idempotencyKey && <span className="em-key">Key <span className="hc-mono">{m.idempotencyKey}</span> is kept, so a retry can’t send twice.</span>}
          <div className="ds-actions">
            {m.failReason === 'AUTH_EXPIRED' && mb?.state === 'EXPIRED' && <button type="button" className="ds-btn primary" onClick={() => go('Reconnect', 'email.reconnect', { mailboxId: mb!.id, msgId })}>Reconnect {mb!.address}</button>}
            {m.failReason !== 'AUTH_EXPIRED' && approvedKept && mb?.state === 'CONNECTED' && <button type="button" className="ds-btn primary" onClick={() => go('Retry', 'email.sendNow', { msgId })}>Try again (same key)</button>}
            {approvedKept && mb?.state === 'CONNECTED' && m.failReason === 'AUTH_EXPIRED' && <button type="button" className="ds-btn primary" onClick={() => go('Send', 'email.sendNow', { msgId })}>Send now (same key)</button>}
            <button type="button" className="ds-btn quiet" onClick={() => go('Switch', 'email.channel', { msgId, channel: 'IN_APP' })}>Send in Talent Q instead</button>
          </div>
        </div>
      )}
      {d.approval?.voided && !m.approvedHash && <p className="em-note" role="status">An earlier approval no longer applies: the content changed after it was approved ({d.approval.voided.toLowerCase()}). It needs a fresh yes.</p>}
      {scheduled && <p className="em-note" role="status">Approved. Goes {when(d.scheduledFor!)} Lagos (simulated). <button type="button" className="hc-more" onClick={() => go('Cancel', 'email.schedule', { msgId, at: null })}>Cancel the schedule</button> <button type="button" className="hc-more" onClick={() => go('Send now', 'email.sendNow', { msgId })}>Send now instead</button></p>}

      <dl className="em-env" aria-label="Envelope">
        <div><dt>Channel</dt><dd>
          <span className="em-seg" role="group" aria-label="Channel">
            <button type="button" aria-pressed={email} onClick={() => !email && go('Email', 'email.channel', { msgId, channel: 'EMAIL' })}>Email</button>
            <button type="button" aria-pressed={m.channel === 'IN_APP'} onClick={() => m.channel !== 'IN_APP' && go('Talent Q', 'email.channel', { msgId, channel: 'IN_APP' })}>Talent Q</button>
          </span>
          <span className="t14 muted em-why">{channelReason(w, d.personId, m.channel)}</span>
        </dd></div>
        {email && <div><dt><label htmlFor={`from-${msgId}`}>From</label></dt><dd>
          <select id={`from-${msgId}`} className="ds-input em-select" value={m.senderId ?? ''} disabled={!canEdit} onChange={(e) => go('Sender', 'email.setSender', { msgId, mailboxId: e.target.value })}>
            {!choices.some((c) => c.m.id === m.senderId) && mb && <option value={mb.id}>{mb.address} ({KIND_WORD[mb.kind]})</option>}
            {choices.map(({ m: x, ok }) => <option key={x.id} value={x.id} disabled={!ok}>{x.address} · {KIND_WORD[x.kind]}{ok ? '' : ' (not yours to send as)'}</option>)}
          </select>
          {mb && <span className="t14 em-why">{mb.kind === 'SERVICE' ? 'Talent Q notice: the candidate reads it in Talent Q.' : <>{PROVIDER_NAME[mb.provider]} · {scopeWord(mb)}{mb.state === 'EXPIRED' ? <b className="em-risk"> · sign-in expired</b> : ''}{mb.kind === 'CLIENT' ? ` · for ${orgOf(w, mb.clientOrgId)?.name} work only` : ''}</>}</span>}
          {mb && mb.kind !== 'SERVICE' && mb.state === 'CONNECTED' && (mb.provider === 'GOOGLE' || mb.provider === 'MICROSOFT') && <button type="button" className="em-demo" onClick={() => go('Demo', 'email.expire', { mailboxId: mb.id })} aria-label={`Demo: simulate token expiry for ${mb.address}`}><span className="em-demotag">Demo</span>{mail(w).failNext[mb.id] === 'AUTH_EXPIRED' ? 'Token expiry armed for the next send' : 'Simulate token expiry'}</button>}
        </dd></div>}
        <div><dt>To</dt><dd><b>{nameOf(w, d.personId)}</b>{email && <span className="t14 muted"> &lt;{addressOf(w, d.personId)}&gt;</span>}</dd></div>
        {email && (showCopy ? (
          <>
            <div><dt><label htmlFor={`cc-${msgId}`}>Cc</label></dt><dd><input id={`cc-${msgId}`} className="ds-input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="colleague@kora.example" readOnly={!canEdit} /></dd></div>
            <div><dt><label htmlFor={`bcc-${msgId}`}>Bcc</label></dt><dd><input id={`bcc-${msgId}`} className="ds-input" value={bcc} onChange={(e) => setBcc(e.target.value)} readOnly={!canEdit} /><span className="t14 muted em-why">Bcc copies are hidden from {firstOf(w, d.personId)}.</span></dd></div>
          </>
        ) : <div><dt>Copies</dt><dd><button type="button" className="hc-more" onClick={() => setShowCopy(true)}>Add Cc or Bcc</button></dd></div>)}
        {d.slot && <div><dt>When</dt><dd><b>{whenText(w, d.slot.start, [...d.panel, d.personId])}</b>{d.options?.map((o) => <span key={o.start}> or <b>{whenText(w, o.start, [...d.panel, d.personId])}</b></span>)}<span className="t14 muted"> · panel {d.panel.map((x) => firstOf(w, x)).join(', ')}</span></dd></div>}
        {camp && <div><dt>Campaign</dt><dd>{camp.name}</dd></div>}
      </dl>

      {d.versions.length > 1 && (
        <div className="hc-versions" role="group" aria-label="Draft history">
          <span className="t14 muted">History</span>
          {d.versions.map((v) => <button key={v.v} type="button" className="ds-filter" aria-pressed={(viewV ?? latest!.v) === v.v} onClick={() => setViewV(v.v === latest!.v ? null : v.v)}>v{v.v}</button>)}
          <span className="t14 muted hc-vnote">{shown!.note} · {firstOf(w, shown!.by)}, {when(shown!.at)}</span>
        </div>
      )}
      {old ? (
        <>
          <div className="hc-body hc-diff hc-letter" aria-label={`Version ${old.v}`}>{prev ? diffWords(prev.body, old.body).map((p, i) => (p.t === 'same' ? <span key={i}>{p.s}</span> : p.t === 'add' ? <ins key={i}><span className="sr">added: </span>{p.s}</ins> : <del key={i}><span className="sr">removed: </span>{p.s}</del>)) : old.body}</div>
          <p className="t14 muted" style={{ margin: 0 }}>An older version, read-only. <button type="button" className="hc-more" onClick={() => setViewV(null)}>Back to v{latest!.v}</button></p>
        </>
      ) : (
        <>
          {email && <div className="ds-field"><label htmlFor={`subj-${msgId}`}>Subject</label><input id={`subj-${msgId}`} className="ds-input" value={subject} onChange={(e) => setSubject(e.target.value)} readOnly={!canEdit} /></div>}
          <div className="ds-field">
            <label htmlFor={`body-${msgId}`}>Message{latest ? ` · v${latest.v}` : ''}{canEdit ? '' : ' (read-only)'}</label>
            <textarea id={`body-${msgId}`} className="ds-input hc-textarea" value={text} rows={Math.min(16, Math.max(8, text.split('\n').length + 3))} onChange={(e) => setText(e.target.value)} readOnly={!canEdit} />
          </div>
          <div className="em-tools">
            <span className="hc-starters" role="group" aria-label="Tone">
              {['friendlier', 'more formal', 'shorter'].map((t) => <button key={t} type="button" className="ds-filter" disabled={!canEdit} onClick={() => say(`make it ${t}`)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
            </span>
            {email && pol && <span className="t14 muted">Signature and footer: {orgOf(w, d.orgId)?.name} policy (“{pol.legal.split('.')[0]}.”)</span>}
          </div>
          {email && atts.length > 0 && (
            <details className="em-attdisc" open={(m.attachments ?? []).length > 0}><summary className="t14"><b>Attachments</b> <span className="muted">{(m.attachments ?? []).length ? `${m.attachments!.length} attached` : `optional · ${atts.length} ${orgOf(w, d.orgId)?.name} documents available`}</span></summary>
            <fieldset className="hc-fs em-atts"><legend className="sr">Attach from Q’s documents</legend>
              {atts.map((x) => { const on = (m.attachments ?? []).some((y) => y.id === x.id); return (
                <label key={x.id} className="em-att"><input type="checkbox" checked={on} disabled={!canEdit} onChange={(e) => go('Attach', 'email.attach', { msgId, id: x.id, on: e.target.checked })} /> <span>{x.label}</span></label>); })}
              <span className="t14 muted">Only {orgOf(w, d.orgId)?.name} documents. A candidate’s evidence is never attached to a message to someone else.</span>
            </fieldset>
            </details>
          )}
        </>
      )}
      {checked && <ChecksList msgId={msgId} />}
      {!old && (!failed || dirty) && !scheduled && (
        <div className="ds-actions hc-actionbar">
          {dirty ? <button type="button" className="ds-btn primary" onClick={() => go('Save', 'email.save', { msgId, body: text, subject, cc, bcc })}>Save as v{(latest?.v ?? 1) + 1}</button>
            : ready && canSend ? <button type="button" className="ds-btn primary" onClick={() => go('Approve and send', 'hire-c.approve', { msgId, v: latest?.v })}>Approve and send v{latest?.v}</button>
              : <button type="button" className="ds-btn primary" onClick={() => go('Check', 'hire-c.check', { msgId })}>{canSend ? 'Check and send' : 'Check and ask for approval'}</button>}
          {!dirty && ready && canSend && email && (sched
            ? <button type="button" className="ds-btn" onClick={() => { go('Schedule', 'email.schedule', { msgId, at: tomorrow9 }); go('Approve', 'hire-c.approve', { msgId, v: latest?.v }); setSched(false); }}>Approve for {tDay(tomorrow9, LAGOS)} 09:00</button>
            : <button type="button" className="ds-btn quiet" onClick={() => setSched(true)}>Schedule…</button>)}
          {dirty && <button type="button" className="ds-btn quiet" onClick={() => { setText(m.body); setSubject(m.subject ?? ''); setCc((m.cc ?? []).join(', ')); setBcc((m.bcc ?? []).join(', ')); }}>Cancel edits</button>}
          <button type="button" className="ds-btn quiet hc-discard" onClick={() => go('Discard', 'hire-c.discard', { msgId })}>Discard draft</button>
        </div>
      )}
      {!canSend && <p className="t14 muted" style={{ margin: 0 }}>Your role can draft. An admin or recruiter approves each send.</p>}
      {ready && canSend && <p className="t14 muted" style={{ margin: 0 }}>Your approval covers exactly this: {email ? `from ${mb?.address}, to ${addressOf(w, d.personId)}${m.cc?.length ? `, Cc ${m.cc.join(', ')}` : ''}, this subject, this text${m.attachments?.length ? ` and ${m.attachments.length} attachment${m.attachments.length === 1 ? '' : 's'}` : ''}` : 'this text'} <span className="hc-mono">({contentHash(m)})</span>. Any change needs a new yes.</p>}
      {dv && !failed && <p className="t14 muted" style={{ margin: 0 }}>{dv.label}{dv.detail ? `: ${dv.detail}` : ''}</p>}
    </div>
  );
}

/** Q's channel recommendation, in words, with the person's override always available (E01-17). */
export function channelReason(w: World, personId: string, ch: Msg['channel']) {
  const c = w.consents[personId]; const first = firstOf(w, personId);
  if (ch === 'EMAIL') return c?.notifications.email ? `Recommended: ${first} accepts email, and it’s an invitation they’ll want in their inbox.` : `${first} has turned email off. Talent Q is the better channel.`;
  if (ch === 'IN_APP') return `${first} sees it in Talent Q, with read status if they open it.`;
  return `${first} accepts text messages.`;
}
