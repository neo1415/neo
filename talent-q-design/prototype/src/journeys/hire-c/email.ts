// Connected email (addendum E-01) on top of R3's correspondence: sender identity and authority, approval bound to
// the exact content (hash), one idempotency key per approved draft, truthful delivery (accepted by the provider is
// not "delivered" or "read"), recovery (token expired → reconnect → resend once), inbound replies matched by
// provider thread with a confirm step when the subject changed, extraction of proposed times, suppression on
// "stop", follow-ups with caps, and a client's pre-approved reminder automation. Every provider is SIMULATED.
import { actorOf, emit, now, orgOf, personOf, simNow, uid, type World } from '../../mock/world';
import { appendQ } from '../../q/core/engine';
import type { Actor, FailReason, MailboxConnection, Msg, Thread } from '../../state/domain';
import { hc, type Check, type DraftMeta } from '../../state/areas/hire-c';
import { canRead, isSuppressed, mail, mailboxOf, orgMailPolicy, PROVIDER_NAME, sendersFor } from '../../state/areas/mail';
import { CAN_SEND, busyAt, dateIn, findMsg, firstOf, LAGOS, latestV, listNames, nameOf, tDay, tLong, tTime, weekday } from './lib';

// ---------------- Identity ----------------
/** The address a candidate gave (their account email). Talent Q never guesses or scrapes an address. */
export const addressOf = (w: World, personId: string) => w.actors.find((a) => a.personId === personId)?.email ?? `${(personOf(w, personId)?.name ?? personId).toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@mail.example`;
export const KIND_WORD: Record<MailboxConnection['kind'], string> = { PERSONAL: 'Personal', ORG: 'Organisation', SHARED: 'Shared', CLIENT: 'Client', SERVICE: 'Talent Q service' };
export const scopeWord = (m: MailboxConnection) => (m.scopes.includes('READ') ? 'Send and read replies' : 'Send only');
export const providerWord = (m: MailboxConnection) => ({ GOOGLE: 'Google', MICROSOFT: 'Microsoft', OTHER: 'Business email (SMTP/IMAP)', TALENTQ: 'Talent Q' } as const)[m.provider];
export function clientOfMandate(w: World, mandateId?: string) { return w.mandates.find((m) => m.id === mandateId)?.clientOrgId; }

/** Who Q speaks for by default: the client sender for client work, else your own mailbox, else a shared one you may
 *  send as. Someone who can't approve gets the shared address the approvers use. Never someone else's mailbox. */
export function defaultSender(w: World, actor: Actor, orgId: string, mandateId?: string): MailboxConnection | undefined {
  const client = clientOfMandate(w, mandateId);
  const mine = sendersFor(w, actor.id, client);
  if (client) { const c = mine.find((m) => m.kind === 'CLIENT' && m.clientOrgId === client); if (c) return c; }
  const own = mine.find((m) => m.kind === 'PERSONAL' && m.orgId === orgId) ?? mine.find((m) => (m.kind === 'SHARED' || m.kind === 'ORG') && m.orgId === orgId);
  if (own) return own;
  const shared = mail(w).mailboxes.find((m) => m.orgId === orgId && (m.kind === 'SHARED' || m.kind === 'ORG') && m.state !== 'REVOKED');
  return shared ?? mailboxOf(w, 'mb_service');
}
/** Senders this person may choose in the composer, with what each is allowed to do. */
export function senderChoices(w: World, actor: Actor, mandateId?: string) {
  const client = clientOfMandate(w, mandateId);
  const all = mail(w).mailboxes.filter((m) => m.orgId === actor.orgId && m.state !== 'REVOKED' && m.kind !== 'SERVICE');
  return all.map((m) => {
    const authorised = m.sendAs.includes(actor.id);
    const wrongClient = m.kind === 'CLIENT' && m.clientOrgId !== client;
    const why = !authorised ? `Only ${listNames(m.sendAs.map((x) => firstOf(w, x)))} may send as this address.` : wrongClient ? `For ${orgOf(w, m.clientOrgId)?.name ?? 'another client'} work only.` : m.state === 'EXPIRED' ? 'Connection expired: reconnect to send.' : `${scopeWord(m)}.`;
    return { m, ok: authorised && !wrongClient, why };
  });
}

// ---------------- Approval bound to content ----------------
/** FNV-1a over everything a recipient would see. A material edit changes it and voids the approval. */
export function contentHash(m: Pick<Msg, 'to' | 'cc' | 'bcc' | 'subject' | 'body' | 'attachments' | 'senderId' | 'channel'>) {
  const s = JSON.stringify([m.senderId, m.channel, m.to, m.cc ?? [], m.bcc ?? [], m.subject ?? '', m.body, (m.attachments ?? []).map((a) => a.id)]);
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `h_${h.toString(16).padStart(8, '0')}`;
}
export const approvalValid = (m: Msg) => !!m.approvedHash && m.approvedHash === contentHash(m);

// ---------------- Pre-send checks for email ----------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const domainOf = (a: string) => a.split('@')[1]?.toLowerCase() ?? '';
export function sentTodayFrom(w: World, mailboxId: string) { const d = dateIn(simNow(w), LAGOS); return w.threads.flatMap((t) => t.messages).filter((m) => m.senderId === mailboxId && m.acceptedAt && dateIn(m.acceptedAt, LAGOS) === d).length; }
/** Attachments Q can offer for a message: Q artifacts the organisation owns, and nothing of a candidate's it wasn't given. */
export function attachmentOptions(w: World, d: Pick<DraftMeta, 'mandateId' | 'orgId' | 'personId'>) {
  const title = w.mandate.mandateId === d.mandateId ? w.mandate.title : w.mandates.find((m) => m.id === d.mandateId)?.title ?? 'the role';
  return [
    { id: `att_role_${d.mandateId ?? 'x'}`, label: `Role description: ${title} (PDF)`, artifact: `role:${d.mandateId}` },
    { id: `att_guide_${d.mandateId ?? 'x'}`, label: 'Interview guide: format, panel and what to prepare (PDF)', artifact: `guide:${d.mandateId}` },
    { id: 'att_benefits', label: `${orgOf(w, d.orgId)?.name ?? 'Company'} benefits summary (PDF)`, artifact: 'org:benefits' },
  ];
}
export function emailChecks(w: World, actor: Actor, d: DraftMeta, m: Msg): Check[] {
  if (m.channel !== 'EMAIL') return [];
  const out: Check[] = []; const mb = mailboxOf(w, m.senderId); const pFirst = firstOf(w, d.personId);
  const canApprove = CAN_SEND.includes(actor.role ?? 'VIEWER');
  if (!mb) out.push({ id: 'sender', group: 'Sender', label: 'Sending address', ok: false, detail: 'No sender is chosen. Pick an address you may send from, or send it in Talent Q.', fix: { label: 'Send in Talent Q instead', op: 'hire-c.fix', args: { msgId: d.msgId, what: 'channel', channel: 'IN_APP' } } });
  else if (mb.kind === 'SERVICE') out.push({ id: 'sender', group: 'Sender', label: 'Sending address', ok: true, detail: `No mailbox is connected, so ${pFirst} gets a Talent Q notice from ${mb.address} and reads the message in Talent Q. Connect a mailbox to send as yourself.` });
  else if (canApprove && !mb.sendAs.includes(actor.id)) out.push({ id: 'sender', group: 'Sender', label: 'Sending address', ok: false, detail: `${actor.first} isn’t allowed to send as ${mb.address}. Only ${listNames(mb.sendAs.map((x) => firstOf(w, x)))} may.`, fix: (() => { const own = defaultSender(w, actor, d.orgId, d.mandateId); return own && own.id !== mb.id && own.kind !== 'SERVICE' ? { label: `Send from ${own.address}`, op: 'email.setSender', args: { msgId: d.msgId, mailboxId: own.id } } : undefined; })() });
  else if (mb.state === 'EXPIRED') out.push({ id: 'sender', group: 'Sender', label: 'Sending address', ok: false, detail: `${PROVIDER_NAME[mb.provider]} needs you to sign in again for ${mb.address} (the connection expired). Your draft and approval are kept.`, fix: { label: `Reconnect ${mb.address}`, op: 'email.reconnect', args: { mailboxId: mb.id, msgId: d.msgId } } });
  else if (mb.state === 'REVOKED') out.push({ id: 'sender', group: 'Sender', label: 'Sending address', ok: false, detail: `${mb.address} was disconnected. Choose another sender.` });
  else out.push({ id: 'sender', group: 'Sender', label: 'Sending address', ok: true, detail: `From ${mb.address} (${KIND_WORD[mb.kind].toLowerCase()}, ${providerWord(mb)}). ${canApprove ? `${actor.first} may send as this address.` : `${listNames(mb.sendAs.filter((x) => w.actors.find((a) => a.id === x && CAN_SEND.includes(a.role ?? 'VIEWER'))).map((x) => firstOf(w, x)))} can approve and send it.`} ${mb.scopes.includes('READ') ? 'Replies to it can be read by Q.' : 'Send only: Q won’t see email replies to it.'}` });
  // Recipient: a permitted address only, never a guessed one.
  const to = addressOf(w, d.personId);
  out.push(EMAIL_RE.test(to) ? { id: 'to', group: 'Candidate', label: 'Recipient address', ok: true, detail: `${to}: the address ${pFirst} gave Talent Q.` } : { id: 'to', group: 'Candidate', label: 'Recipient address', ok: false, detail: `There’s no usable address for ${pFirst}. Send in Talent Q instead.` });
  if (isSuppressed(w, d.orgId, d.personId)) { const s = mail(w).suppressions.find((x) => x.orgId === d.orgId && x.personId === d.personId)!; out.push({ id: 'suppressed', group: 'Candidate', label: 'Asked not to be contacted', ok: false, detail: `${pFirst} asked ${orgOf(w, d.orgId)?.name} to stop contacting them (${tDay(s.at, LAGOS)}: “${s.reason}”). Nothing can be sent.` }); }
  // Cc/Bcc: well-formed, and nobody outside the organisation is copied in the open.
  const cc = m.cc ?? [], bcc = m.bcc ?? [];
  const bad = [...cc, ...bcc].filter((x) => !EMAIL_RE.test(x));
  const orgDomain = mb && mb.kind !== 'SERVICE' ? domainOf(mb.address) : undefined;
  const outside = cc.filter((x) => EMAIL_RE.test(x) && orgDomain && domainOf(x) !== orgDomain);
  if (bad.length) out.push({ id: 'addr', group: 'Sender', label: 'Copied addresses', ok: false, detail: `“${bad[0]}” isn’t a complete email address. Fix or remove it.` });
  else if (outside.length) out.push({ id: 'disclosure', group: 'Sender', label: 'Who else sees it', ok: false, detail: `${outside.join(', ')} is outside ${orgOf(w, d.orgId)?.name} and would see ${pFirst}’s address in Cc.`, fix: { label: 'Move them to Bcc', op: 'email.ccToBcc', args: { msgId: d.msgId } } });
  else out.push({ id: 'disclosure', group: 'Sender', label: 'Who else sees it', ok: true, detail: cc.length || bcc.length ? `Cc: ${cc.join(', ') || 'nobody'} · Bcc: ${bcc.join(', ') || 'nobody'}. Only colleagues are copied.` : `Only ${pFirst}. One recipient per email, so nobody sees anyone else’s address.` });
  // Sending limits
  const pol = orgMailPolicy(w, d.orgId);
  if (mb && pol && mb.kind !== 'SERVICE') { const n = sentTodayFrom(w, mb.id); out.push(n < pol.dailyCap ? { id: 'limit', group: 'Sender', label: 'Sending limit', ok: true, detail: `${n} of ${pol.dailyCap} sent from ${mb.address} today.` } : { id: 'limit', group: 'Sender', label: 'Sending limit', ok: false, detail: `${pol.dailyCap} of ${pol.dailyCap} sent from ${mb.address} today. It can go tomorrow; schedule it.` }); }
  // Attachments: Q artifacts only, still available.
  for (const a of m.attachments ?? []) {
    const ok = !a.artifact?.startsWith('missing:');
    out.push({ id: `att_${a.id}`, group: 'Consent', label: 'Attachment', ok, detail: ok ? `${a.label}: a ${orgOf(w, d.orgId)?.name} document, fine to share.` : `${a.label} is no longer available (it was replaced). Remove it or attach the current version.`, fix: ok ? undefined : { label: 'Remove the attachment', op: 'email.attach', args: { msgId: d.msgId, id: a.id, on: false } } });
  }
  return out;
}

// ---------------- Sending (simulated provider) ----------------
const PROV_ID = () => `sim-${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 8)}`;
export const acceptedLine = (w: World, m: Msg) => { const mb = mailboxOf(w, m.senderId); return `accepted by ${mb ? PROVIDER_NAME[mb.provider] : 'the provider'} (simulated) at ${m.acceptedAt ? tTime(m.acceptedAt, LAGOS) : '—'}`; };
export const FAIL_TEXT: Record<FailReason | 'BOUNCED', (mb: MailboxConnection | undefined) => string> = {
  AUTH_EXPIRED: (mb) => `${mb ? PROVIDER_NAME[mb.provider] : 'The provider'} says the sign-in for ${mb?.address ?? 'this mailbox'} has expired, so nothing was sent.`,
  DISCONNECTED: (mb) => `${mb?.address ?? 'The mailbox'} is disconnected, so nothing was sent.`,
  SMTP_REJECTED: (mb) => `${mb?.address ?? 'The mail server'}’s server refused the message (550: sender not allowed), so nothing was sent.`,
  RATE_LIMITED: (mb) => `${mb ? PROVIDER_NAME[mb.provider] : 'The provider'} asked us to slow down (too many messages in a short time). Nothing was sent.`,
  SUPPRESSED: () => 'The person asked not to be contacted, so nothing was sent.',
  BAD_ADDRESS: () => 'The address isn’t valid, so nothing was sent.',
  OFFLINE: () => 'You’re offline, so nothing was sent yet.',
  MISSING_ATTACHMENT: () => 'An attachment is no longer available, so nothing was sent.',
  BOUNCED: (mb) => `${mb ? PROVIDER_NAME[mb.provider] : 'The provider'} accepted it, then it bounced: the recipient’s server said the mailbox doesn’t exist.`,
};
export const RECOVERY: Partial<Record<FailReason | 'BOUNCED', string>> = {
  AUTH_EXPIRED: 'Reconnect the mailbox, then send again: it goes once, with the same key.',
  RATE_LIMITED: 'Try again in a few minutes, or schedule it. The key stays the same, so it can’t go twice.',
  SMTP_REJECTED: 'Check the mailbox’s sending settings, or send from another address you may use.',
  DISCONNECTED: 'Choose another sender, or reconnect in Email settings.',
  BOUNCED: 'Send it in Talent Q instead, or ask for a current address. Nothing is resent automatically.',
};

/** Attempt the provider call for an approved email. The approval and the key survive a failure. */
export function providerSend(w: World, actor: Actor, msgId: string): { ok: boolean; text: string; reason?: FailReason | 'BOUNCED' } {
  const f0 = findMsg(w, msgId)!; const m = f0.m; const mb = mailboxOf(w, m.senderId);
  const pFirst = firstOf(w, f0.t.personId);
  m.idempotencyKey ??= `idem_${msgId.replace(/^msg_|^hc_/, '')}_${(m.approvedHash ?? contentHash(m)).slice(2, 8)}`;
  if (m.delivery === 'ACCEPTED' || m.delivery === 'DELIVERED') { (m.attempts ??= []).push({ at: now(), result: 'DUPLICATE_PREVENTED' }); return { ok: false, text: `Already sent at ${m.acceptedAt ? tTime(m.acceptedAt, LAGOS) : '—'}, ${acceptedLine(w, m)}. I didn’t send it again.` }; }
  const demo = mb ? mail(w).failNext[mb.id] : undefined; if (mb && demo) delete mail(w).failNext[mb.id];
  let reason: FailReason | undefined;
  if (!mb || mb.state === 'REVOKED') reason = 'DISCONNECTED';
  else if (mb.state === 'EXPIRED' || demo === 'AUTH_EXPIRED') { reason = 'AUTH_EXPIRED'; mb.state = 'EXPIRED'; }
  else if (demo === 'RATE_LIMITED' || demo === 'SMTP_REJECTED') reason = demo;
  else if (isSuppressed(w, f0.t.orgId, f0.t.personId)) reason = 'SUPPRESSED';
  if (reason) {
    m.delivery = 'FAILED'; m.failReason = reason; (m.attempts ??= []).push({ at: now(), result: 'FAILED', reason });
    emit(w, actor.id, 'email.send.failed', `ORG:${f0.t.orgId}`, `Email to ${nameOf(w, f0.t.personId)} not sent: ${reason} (simulated). Key ${m.idempotencyKey}.`, { msgId, reason });
    if (reason === 'AUTH_EXPIRED' && mb) emit(w, 'system', 'mailbox.expired', `ORG:${f0.t.orgId}`, `${mb.address}: the ${PROVIDER_NAME[mb.provider]} sign-in expired (simulated).`, { mailboxId: mb.id });
    return { ok: false, reason, text: `Not sent. ${FAIL_TEXT[reason](mb)} Your approval of this exact version is kept, so it’s approved, not sent. ${RECOVERY[reason] ?? ''}`.trim() };
  }
  m.delivery = 'ACCEPTED'; m.providerId = PROV_ID(); m.acceptedAt = now(); m.failReason = undefined;
  (m.attempts ??= []).push({ at: now(), result: 'ACCEPTED' });
  emit(w, actor.id, 'email.provider.accepted', `ORG:${f0.t.orgId}`, `Email to ${nameOf(w, f0.t.personId)} accepted by ${PROVIDER_NAME[mb!.provider]} (simulated), id ${m.providerId}, key ${m.idempotencyKey}.`, { msgId });
  if (demo === 'BOUNCED') {
    m.delivery = 'BOUNCED';
    emit(w, 'system', 'email.delivery.updated', `ORG:${f0.t.orgId}`, `Email to ${nameOf(w, f0.t.personId)} bounced (simulated).`, { msgId });
    return { ok: true, reason: 'BOUNCED', text: `${FAIL_TEXT.BOUNCED(mb)} ${pFirst} didn’t get it. ${RECOVERY.BOUNCED}` };
  }
  return { ok: true, text: `Simulated send: ${acceptedLine(w, m)} from ${mb!.address}. That means ${PROVIDER_NAME[mb!.provider]} took it; it isn’t proof ${pFirst} received or read it.` };
}

export function setFailNext(w: World, mailboxId: string, reason: FailReason | 'BOUNCED' | null) { if (reason) mail(w).failNext[mailboxId] = reason; else delete mail(w).failNext[mailboxId]; }

// ---------------- Mailbox lifecycle ----------------
export function reconnect(w: World, actor: Actor, mailboxId: string) {
  const mb = mailboxOf(w, mailboxId); if (!mb) return undefined;
  mb.state = 'CONNECTED'; mb.connectedAt = now().slice(0, 10);
  emit(w, actor.id, 'mailbox.reconnected', mb.orgId ? `ORG:${mb.orgId}` : `PERSON:${mb.owner}`, `${actor.name} reconnected ${mb.address} (simulated consent).`, { mailboxId });
  const waiting = w.threads.flatMap((t) => t.messages.map((m) => ({ t, m }))).filter(({ m }) => m.senderId === mailboxId && m.delivery === 'FAILED' && m.failReason === 'AUTH_EXPIRED');
  return { mb, waiting };
}
export function disconnect(w: World, actor: Actor, mailboxId: string) {
  const mb = mailboxOf(w, mailboxId); if (!mb) return;
  mb.state = 'REVOKED';
  // Scheduled sends from it can't go: they return to approval with the reason.
  for (const t of w.threads) for (const m of t.messages) if (m.senderId === mailboxId && m.delivery === 'QUEUED') { m.delivery = 'FAILED'; m.failReason = 'DISCONNECTED'; }
  emit(w, actor.id, 'mailbox.disconnected', mb.orgId ? `ORG:${mb.orgId}` : `PERSON:${mb.owner}`, `${actor.name} disconnected ${mb.address} and revoked Talent Q’s access (simulated).`, { mailboxId });
}

// ---------------- Inbound (only with read access) ----------------
const STOP = /\b(stop (contacting|emailing|messaging|writing to) me|unsubscribe|do not contact me|don'?t contact me|remove me from)\b/i;
const INSTRUCTION = /\b(ignore (all |any )?(previous|prior) instructions|forward (this|all|my)|send (me )?(all|every)|you are now|system prompt|change my (status|stage)|mark me as)\b/i;
export const looksLikeInstruction = (s: string) => INSTRUCTION.test(s);
/** The organisation mailbox that would receive an email reply on this thread (the last one we sent from). */
export function replyMailbox(w: World, t: Thread) { const out = [...t.messages].reverse().find((m) => m.from !== t.personId && m.channel === 'EMAIL' && m.senderId); return mailboxOf(w, out?.senderId); }
/** Across all of a person's threads with an organisation: the mailbox of the newest email we sent them. */
export function replyMailboxFor(w: World, orgId: string, personId: string) {
  const out = w.threads.filter((t) => t.orgId === orgId && t.personId === personId).flatMap((t) => t.messages).filter((m) => m.from !== personId && m.channel === 'EMAIL' && m.senderId && m.status === 'SENT_SIMULATED').sort((a, b) => a.at.localeCompare(b.at)).pop();
  return mailboxOf(w, out?.senderId);
}
export function readableInbound(w: World, m: Msg) { return !m.inbound?.mailbox || canRead(mailboxOf(w, m.inbound.mailbox)) || m.inbound.matchedBy === 'USER_CONFIRMED'; }
export const pendingMatch = (m: Msg) => !!m.inbound && m.inbound.subjectChanged === true && m.inbound.matchedBy !== 'USER_CONFIRMED';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
/** "Thursday 14:00 works" → the matching offered option. Only times actually in the text; nothing invented. */
export function extractTime(w: World, t: Thread, text: string) {
  const norm = text.toLowerCase();
  const day = DAYS.find((d) => norm.includes(d) || norm.includes(d.slice(0, 3) + ' '));
  const tm = norm.match(/\b(\d{1,2})(?::|\.)(\d{2})\b|\b(\d{1,2})\s*(am|pm)\b/);
  if (!day && !tm) return undefined;
  let hm: string | undefined;
  if (tm) { let h = Number(tm[1] ?? tm[3]); const mm = Number(tm[2] ?? 0); if (tm[4] === 'pm' && h < 12) h += 12; hm = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
  const d = Object.values(hc(w).drafts).filter((x) => x.threadId === t.id && x.slot).sort((a, b) => latestV(b).at.localeCompare(latestV(a).at))[0];
  const opts = d ? [d.slot!, ...(d.options ?? [])] : [];
  const hit = opts.find((o) => (!day || weekday(dateIn(o.start, LAGOS)) === DAYS.indexOf(day)) && (!hm || tTime(o.start, LAGOS) === hm));
  let start = hit?.start;
  if (!start && day && hm) { const base = opts.find((o) => weekday(dateIn(o.start, LAGOS)) === DAYS.indexOf(day)); if (base) start = new Date(`${dateIn(base.start, LAGOS)}T${hm}:00+01:00`).toISOString(); }
  return { day, hm, start, end: start ? new Date(new Date(start).getTime() + 45 * 6e4).toISOString() : undefined, offered: !!hit, draft: d };
}

/** A reply arrives by email. Talent Q only sees it when the receiving mailbox has read access. */
export function receiveEmail(w: World, t: Thread, fromPid: string, body: string, subject: string) {
  const mb = replyMailbox(w, t) ?? mailboxOf(w, mail(w).mailboxes.find((x) => x.orgId === t.orgId && x.kind === 'SHARED')?.id);
  const lastOut = [...t.messages].reverse().find((m) => m.from !== fromPid && m.channel === 'EMAIL' && m.subject);
  const base = (lastOut?.subject ?? '').replace(/^(re|fwd?):\s*/i, '');
  const subjectChanged = !!lastOut && !subject.toLowerCase().includes(base.toLowerCase().slice(0, 18));
  const id = uid('msg');
  const m: Msg = { id, from: fromPid, to: mb?.address ?? t.orgId, subject, body, at: now(), status: 'RECEIVED', channel: 'EMAIL', senderId: mail(w).mailboxes.find((x) => x.owner === fromPid)?.id, delivery: 'ACCEPTED', acceptedAt: now(),
    inbound: { mailbox: mb?.id, matchedBy: 'PROVIDER_THREAD', subjectChanged } };
  t.messages.push(m);
  if (t.state === 'OPEN' || !t.state) t.state = 'REPLIED';
  const readable = canRead(mb);
  if (readable) {
    if (STOP.test(body)) {
      if (!isSuppressed(w, t.orgId, fromPid)) mail(w).suppressions.push({ orgId: t.orgId, personId: fromPid, reason: body.slice(0, 80), at: now() });
      for (const fu of mail(w).followUps.filter((x) => x.threadId === t.id && (x.state === 'SUGGESTED' || x.state === 'SCHEDULED'))) fu.state = 'CANCELLED';
      for (const x of t.messages) if (x.delivery === 'QUEUED') { x.delivery = 'CANCELLED'; }
      emit(w, 'system', 'suppression.recorded', `ORG:${t.orgId}`, `${nameOf(w, fromPid)} asked ${orgOf(w, t.orgId)?.name} to stop contacting them. Recorded; queued messages and reminders cancelled.`, { personId: fromPid });
    }
    const x = extractTime(w, t, body);
    if (x?.start) mail(w).extracted.push({ id: uid('xt'), threadId: t.id, msgId: id, personId: fromPid, kind: 'TIME', text: `${x.day ? x.day[0].toUpperCase() + x.day.slice(1) : ''} ${x.hm ?? ''}`.trim(), at: now() });
    emit(w, 'system', 'email.reply.observed', `ORG:${t.orgId}`, `Reply from ${nameOf(w, fromPid)} seen in ${mb!.address} (simulated)${subjectChanged ? ', subject changed: waiting for a person to confirm the match' : ''}.`, { msgId: id, threadId: t.id });
    // Tell whoever sent the last email (or every approver): one notice, with the confirm step first.
    const owner = lastOut?.approvedBy ?? lastOut?.from;
    if (owner && w.actors.some((a) => a.id === owner)) appendQ(w, owner, { who: 'q', kind: subjectChanged ? 'question' : 'notice', engine: 'system', text: subjectChanged
      ? `${firstOf(w, fromPid)} replied by email, but with a different subject (“${subject}”). I matched it to your thread about ${base || 'the role'} by the email thread and sender. Is this the right conversation?`
      : `${firstOf(w, fromPid)} replied by email.`, ref: { type: 'email.reply', id }, actions: subjectChanged
      ? [{ label: 'Yes, it’s this thread', primary: true, act: { t: 'do', op: 'email.match', args: { msgId: id, ok: true } } }, { label: 'No, keep it separate', act: { t: 'do', op: 'email.match', args: { msgId: id, ok: false } } }]
      : [{ label: 'Open the conversation', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId: id } } }] });
  }
  return { m, readable, mailbox: mb };
}

/** Confirm (or reject) a match the person was asked about. Rejecting moves it to its own thread, unlinked. */
export function confirmMatch(w: World, actor: Actor, msgId: string, ok: boolean) {
  const f0 = findMsg(w, msgId); if (!f0 || !f0.m.inbound) return undefined;
  if (ok) { f0.m.inbound.matchedBy = 'USER_CONFIRMED'; emit(w, actor.id, 'email.match.confirmed', `ORG:${f0.t.orgId}`, `${actor.name} confirmed a reply from ${nameOf(w, f0.t.personId)} belongs to this thread.`, { msgId }); return f0; }
  f0.t.messages.splice(f0.t.messages.indexOf(f0.m), 1);
  const t2: Thread = { id: uid('t'), orgId: f0.t.orgId, personId: f0.t.personId, messages: [{ ...f0.m, inbound: { ...f0.m.inbound, matchedBy: 'USER_CONFIRMED', subjectChanged: true } }] };
  w.threads.push(t2);
  emit(w, actor.id, 'email.match.rejected', `ORG:${f0.t.orgId}`, `${actor.name} kept a reply from ${nameOf(w, f0.t.personId)} separate from the thread Q suggested.`, { msgId });
  return { t: t2, m: t2.messages[0] };
}

/** Book the time a candidate proposed, against the panel's and the candidate's calendars. Never double-books. */
export function bookProposed(w: World, actor: Actor, msgId: string) {
  const f0 = findMsg(w, msgId); if (!f0) return { ok: false, text: 'I can’t find that reply any more.' };
  const x = extractTime(w, f0.t, f0.m.body); const first = firstOf(w, f0.t.personId);
  if (!x?.start || !x.draft) return { ok: false, text: `I couldn’t find a specific time in ${first}’s reply, so I haven’t booked anything.` };
  const d = x.draft; const panel = d.panel;
  const clash = [...panel, d.personId].find((id) => busyAt(w, id, x.start!, x.end!, d.eventId ? [d.eventId] : []));
  if (clash) return { ok: false, text: `${tLong(x.start, LAGOS)} at ${tTime(x.start, LAGOS)} isn’t free any more: ${firstOf(w, clash)} is busy. Nothing is booked. I can offer ${first} another time.` };
  if (!CAN_SEND.includes(actor.role ?? 'VIEWER')) return { ok: false, text: 'Only a recruiter or admin can book interviews here. Nothing is booked.' };
  let ev = (d.eventId && w.calendar.find((e) => e.id === d.eventId)) || undefined;
  if (!ev) { ev = { id: uid('ev'), orgId: d.orgId, title: `Interview: ${nameOf(w, d.personId)}`, start: x.start, end: x.end!, attendees: [...panel, d.personId], status: 'CONFIRMED', mandateId: d.mandateId, personId: d.personId, simulated: true }; w.calendar.push(ev); }
  ev.start = x.start; ev.end = x.end!; ev.status = 'CONFIRMED'; ev.attendees = [...panel, d.personId];
  let iv = w.interviews.find((i) => i.personId === d.personId && i.orgId === d.orgId && i.status !== 'CANCELLED' && i.status !== 'DONE');
  if (!iv) { iv = { id: uid('iv'), orgId: d.orgId, mandateId: d.mandateId ?? '', personId: d.personId, panel: [...panel], status: 'CONFIRMED', feedback: [] }; w.interviews.push(iv); }
  iv.eventId = ev.id; iv.status = 'CONFIRMED'; iv.panel = [...panel];
  emit(w, actor.id, 'interview.booked', `SHARED:${d.orgId}:${d.personId}`, `${actor.name} booked ${first}’s interview for ${tDay(x.start, LAGOS)} ${tTime(x.start, LAGOS)} from their email reply (simulated calendar).`, { msgId });
  return { ok: true, text: `Booked ${tLong(x.start, LAGOS)} at ${tTime(x.start, LAGOS)} Lagos with ${listNames(panel.map((p) => firstOf(w, p)))} (simulated calendar): everyone was free.`, start: x.start, d };
}

// ---------------- Follow-ups and automations ----------------
export const FOLLOW_CAP = 1;
export function followUpsUsed(w: World, threadId: string) { return mail(w).followUps.filter((f) => f.threadId === threadId && f.state === 'SENT').length + Object.values(hc(w).drafts).filter((d) => d.threadId === threadId && d.kind === 'FOLLOW_UP' && findMsg(w, d.msgId)?.m.status === 'SENT_SIMULATED').length; }
export function automationRun(w: World, actor: Actor, id: string) {
  const a = mail(w).automations.find((x) => x.id === id); if (!a) return 'There’s no such automation.';
  if (a.state === 'PAUSED') { emit(w, 'system', 'automation.skipped', `ORG:${a.orgId}`, `“${a.label}” is paused: no reminders sent.`); return `Nothing sent: “${a.label}” is paused (by ${a.pausedBy ? firstOf(w, a.pausedBy) : 'the client'} at ${a.pausedAt ? tTime(a.pausedAt, LAGOS) : '—'}).`; }
  const due = w.calendar.filter((e) => e.orgId === a.clientOrgId && e.status === 'CONFIRMED' && new Date(e.start).getTime() - simNow(w).getTime() < 36 * 36e5 && new Date(e.start).getTime() > simNow(w).getTime()).length;
  const n = Math.min(due, a.cap - a.sent); a.sent += n;
  emit(w, actor.id, 'automation.ran', `ORG:${a.orgId}`, `“${a.label}” ran within its approval: ${n} reminder${n === 1 ? '' : 's'} (simulated).`);
  return `“${a.label}” ran within its approval: ${n} reminder${n === 1 ? '' : 's'} sent (simulated), ${a.sent} of ${a.cap} used.`;
}

// ---------------- Presentation ----------------
export type DeliveryView = { label: string; tone: 'ok' | 'warn' | 'risk' | 'busy' | undefined; detail?: string };
export function deliveryView(w: World, m: Msg): DeliveryView | undefined {
  if (m.channel !== 'EMAIL' || !m.senderId) return undefined;
  const mb = mailboxOf(w, m.senderId); const prov = mb ? PROVIDER_NAME[mb.provider] : 'the provider';
  if (m.delivery === 'ACCEPTED') return { label: `Accepted by ${prov} (simulated)`, tone: 'ok', detail: `at ${m.acceptedAt ? `${tDay(m.acceptedAt, LAGOS)} ${tTime(m.acceptedAt, LAGOS)}` : '—'} · not proof it was read` };
  if (m.delivery === 'DELIVERED') return { label: `Delivered (${prov} confirmed)`, tone: 'ok' };
  if (m.delivery === 'BOUNCED') return { label: 'Bounced', tone: 'risk', detail: FAIL_TEXT.BOUNCED(mb) };
  if (m.delivery === 'FAILED') return { label: m.approvedHash ? 'Approved, not sent' : 'Not sent', tone: 'risk', detail: FAIL_TEXT[m.failReason ?? 'DISCONNECTED'](mb) };
  if (m.delivery === 'QUEUED') return { label: 'Scheduled', tone: 'busy' };
  if (m.delivery === 'CANCELLED') return { label: 'Cancelled', tone: 'warn' };
  return undefined;
}
export { actorOf };
