// Connected email and candidate-initiated contact (addendum E-01; audit addendum §C). Recruiter side: email with a
// resolved sender, invitations offering two times, multi-recipient review, refusing someone else's identity, retry
// with the same idempotency key, duplicate prevention, routing a thread into a campaign, confirming a reply's match,
// booking a proposed time, audit questions, read-scope honesty, client senders and automations (R4).
// Candidate side: the role briefing (answers quote the time), the policy before drafting, a short editable question,
// sending in-app or by email, replying by email, muting and consent. Every provider is SIMULATED.
import { actorOf, emit, now, orgOf, personOf, uid, type World } from '../../mock/world';
import type { Actor, QFrame, QMsg, Thread } from '../../state/domain';
import { appendQ, pushUndo, registerOp, registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import { hc, hcw } from '../../state/areas/hire-c';
import { canRead, mail, mailboxOf, PROVIDER_NAME, sendersFor } from '../../state/areas/mail';
import { campaigns, campaignsFor } from '../../state/areas/campaigns';
import {
  addDays, approveAndSend, checkDraft, CAN_SEND, createDraft, currentDraft, entryFor, findMsg, findSlots, firstOf, guidesOf, KIND_LABEL, LAGOS, latestV, listNames, mandateTitle, nameOf, nextWeek, parseTime, resolveDays, reviseDraft, tDay, tTime, defaultPanel, finalizeSend,
} from '../../journeys/hire-c/lib';
import {
  acceptedLine, addressOf, approvalValid, attachmentOptions, automationRun, bookProposed, confirmMatch, contentHash, defaultSender, disconnect, extractTime, looksLikeInstruction, pendingMatch, providerSend, receiveEmail, reconnect, replyMailbox, setFailNext, scopeWord,
} from '../../journeys/hire-c/email';
import { checkAndPost, contextPerson, draftFlow, kindFrom, peopleIn, postDraft } from './hire-c';
import { answerFromBriefing, contactState, draftQuestion, mmss, sendContact } from '../../journeys/contact/logic';
import { orgIn } from './talent-b';

const post = (w: World, a: Actor, m: Omit<QMsg, 'id' | 'at' | 'who'>) => appendQ(w, a.id, { who: 'q', engine: 'rules', ...m });
const frame = (intent: string, slots: Record<string, string>, awaiting?: string): QFrame => ({ intent, slots, awaiting, startedAt: now() });
const hirer = (c: QCtx) => c.actor.side === 'recruiter' && !!c.actor.orgId;
const cand = (c: QCtx) => c.actor.side === 'candidate' && !!c.actor.personId;
const scopeOf = (a: Actor) => (a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId}`);

// =====================================================================================================
// Ops (buttons on pages and in Q's cards)
// =====================================================================================================
type OpImpl = (w: World, args: Record<string, unknown>, a: Actor) => void | { say?: string; nav?: { to: string; label: string } };
const OPS: Record<string, OpImpl> = {};
const op = (name: string, fn: OpImpl) => { OPS[name] = fn; registerOp(name, fn); };
const OPS_RUN = (name: string) => OPS[name];
/** Change something a recipient would see; the draft gets a new version and any approval of the old content is voided. */
function changeEnvelope(w: World, a: Actor, msgId: string, note: string, fn: (m: NonNullable<ReturnType<typeof findMsg>>['m']) => void) {
  const f0 = findMsg(w, msgId); const d = hc(w).drafts[msgId]; if (!f0 || !d) return;
  fn(f0.m);
  reviseDraft(w, a, msgId, { body: f0.m.body, subject: f0.m.subject, note });
}
op('email.setSender', (w, args, a) => {
  const mb = mailboxOf(w, String(args.mailboxId)); const msgId = String(args.msgId); const f0 = findMsg(w, msgId);
  if (!mb || !f0) return;
  if (!mb.sendAs.includes(a.id)) return { say: `You can’t send as ${mb.address}: only ${listNames(mb.sendAs.map((x) => firstOf(w, x)))} may. I haven’t changed the sender.` };
  changeEnvelope(w, a, msgId, `Sender: ${mb.address}`, (m) => { m.senderId = mb.id; m.channel = 'EMAIL'; });
});
op('email.setCopy', (w, args, a) => {
  const list = (v: unknown) => String(v ?? '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
  changeEnvelope(w, a, String(args.msgId), 'Changed Cc/Bcc', (m) => { m.cc = list(args.cc); m.bcc = list(args.bcc); });
});
op('email.save', (w, args, a) => {
  // One saved version for everything typed in the composer: subject, body, Cc and Bcc.
  const msgId = String(args.msgId); const f0 = findMsg(w, msgId); const d = hc(w).drafts[msgId]; if (!f0 || !d) return;
  if (!['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER')) return { say: 'Your role can read drafts but not edit them.' };
  const list = (v: unknown) => String(v ?? '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
  const prevV = latestV(d).v;
  if (args.cc !== undefined) f0.m.cc = list(args.cc); if (args.bcc !== undefined) f0.m.bcc = list(args.bcc);
  const v = reviseDraft(w, a, msgId, { body: String(args.body ?? f0.m.body), subject: String(args.subject ?? f0.m.subject ?? ''), note: 'Edited by hand' });
  if (!v) return;
  pushUndo(w, a.id, `Edited the draft to ${firstOf(w, d.personId)} (v${v.v})`, 'hire-c.restoreVersion', { msgId, v: prevV });
  post(w, a, { kind: 'reply', text: `Saved your edits as v${v.v}.${d.approval && d.approval.voided ? ' That changed what was approved, so the earlier approval no longer applies.' : ''} A changed draft needs checking again before it can be approved.`, ref: { type: 'hire-c.diff', id: `${msgId}@${v.v}` }, actions: [{ label: 'Check and send', primary: true, act: { t: 'do', op: 'hire-c.check', args: { msgId } } }, { label: 'Undo', act: { t: 'do', op: 'undo' } }] });
});
op('email.ccToBcc', (w, args, a) => changeEnvelope(w, a, String(args.msgId), 'Moved outside addresses to Bcc', (m) => { m.bcc = [...(m.bcc ?? []), ...(m.cc ?? [])]; m.cc = []; }));
op('email.attach', (w, args, a) => {
  const msgId = String(args.msgId); const d = hc(w).drafts[msgId]; if (!d) return;
  const opt = attachmentOptions(w, d).find((x) => x.id === args.id);
  changeEnvelope(w, a, msgId, args.on ? `Attached ${opt?.label ?? 'a document'}` : 'Removed an attachment', (m) => {
    const cur = (m.attachments ?? []).filter((x) => x.id !== args.id);
    m.attachments = args.on && opt ? [...cur, { id: opt.id, label: opt.label, artifact: opt.artifact }] : cur;
  });
});
op('email.channel', (w, args, a) => {
  const ch = args.channel as 'EMAIL' | 'IN_APP'; const msgId = String(args.msgId); const d = hc(w).drafts[msgId]; if (!d) return;
  changeEnvelope(w, a, msgId, ch === 'EMAIL' ? 'Switched to email' : 'Switched to a Talent Q message', (m) => { m.channel = ch; if (ch === 'EMAIL' && !m.senderId) m.senderId = defaultSender(w, a, d.orgId, d.mandateId)?.id; });
  const t = w.threads.find((x) => x.id === d.threadId); if (t) t.channel = { current: ch, reason: 'Chosen by a person', overriddenBy: a.id };
});
op('email.schedule', (w, args, a) => {
  const msgId = String(args.msgId); const d = hcw(w).drafts[msgId]; if (!d) return;
  d.scheduledFor = args.at ? String(args.at) : undefined;
  const f0 = findMsg(w, msgId); if (f0 && !args.at && f0.m.delivery === 'QUEUED') { f0.m.delivery = undefined; f0.m.status = 'AWAITING_APPROVAL'; }
  emit(w, a.id, args.at ? 'email.scheduled' : 'email.schedule.cancelled', `ORG:${d.orgId}`, args.at ? `${a.name} set the email to ${nameOf(w, d.personId)} to go at ${tDay(String(args.at), LAGOS)} ${tTime(String(args.at), LAGOS)}.` : `${a.name} cancelled the scheduled email to ${nameOf(w, d.personId)}; it wasn’t sent.`);
  return { say: args.at ? `It will go on ${tDay(String(args.at), LAGOS)} at ${tTime(String(args.at), LAGOS)} once approved. Nothing goes before then.` : 'Schedule cancelled. Nothing was sent; the draft is waiting for you.' };
});
op('email.sendNow', (w, args, a) => {
  // A scheduled, approved email whose time has come (or "send it now"). Same approval, same key.
  const msgId = String(args.msgId); const d = hcw(w).drafts[msgId]; const f0 = findMsg(w, msgId); if (!d || !f0) return;
  d.scheduledFor = undefined; if (f0.m.delivery === 'QUEUED') f0.m.delivery = undefined;
  retry(w, a, msgId);
});
op('email.reconnect', (w, args, a) => {
  const mb = mailboxOf(w, String(args.mailboxId)); if (!mb) return;
  if (!args.consented) { (w.q.ui[`${a.id}|/settings/email`] ??= {}).consent = mb.id; (w.q.ui[`${a.id}|/settings/email`]).back = args.msgId ? '/r/messages' : ''; return { nav: { to: '/settings/email', label: 'email settings' } }; }
  const r = reconnect(w, a, mb.id); if (!r) return;
  const waiting = r.waiting.filter((x) => x.m.approvedBy === a.id || x.m.from === a.id);
  post(w, a, { kind: 'notice', text: `Reconnected ${mb.address} (simulated sign-in with ${PROVIDER_NAME[mb.provider]}).${waiting.length ? ` ${waiting.length === 1 ? `Your approved email to ${firstOf(w, waiting[0].t.personId)} is still waiting` : `${waiting.length} approved emails are still waiting`}, unchanged. Say “send it” and it goes once, with the same key.` : ''}`,
    actions: waiting.length ? [{ label: 'Send it now', primary: true, act: { t: 'do', op: 'email.sendNow', args: { msgId: waiting[0].m.id } } }, { label: 'Open it', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId: waiting[0].m.id } } }] : undefined });
  if (waiting[0]) w.q.frames[a.id] = frame('email.retry', { msgId: waiting[0].m.id }, 'send');
});
op('email.expire', (w, args, a) => {
  // DEMO ONLY: what Google does when a refresh token is revoked or expires.
  const mb = mailboxOf(w, String(args.mailboxId)); if (!mb) return;
  setFailNext(w, mb.id, 'AUTH_EXPIRED');
  emit(w, a.id, 'demo.token.expiry', mb.orgId ? `ORG:${mb.orgId}` : `PERSON:${mb.owner}`, `Demo: the next send from ${mb.address} will find the sign-in expired.`);
  return { say: `Demo: the next send from ${mb.address} will find the ${PROVIDER_NAME[mb.provider]} sign-in expired.` };
});
op('email.failNext', (w, args, a) => {
  const mb = mailboxOf(w, String(args.mailboxId)); if (!mb) return;
  setFailNext(w, mb.id, (args.reason as never) || null);
  emit(w, a.id, 'demo.provider.failure', mb.orgId ? `ORG:${mb.orgId}` : `PERSON:${mb.owner}`, `Demo: next send from ${mb.address}: ${String(args.reason || 'normal')}.`);
});
op('email.disconnect', (w, args, a) => { disconnect(w, a, String(args.mailboxId)); });
op('email.connect', (w, args, a) => {
  const provider = args.provider as 'GOOGLE' | 'MICROSOFT' | 'OTHER'; const read = !!args.read; const kind = (args.kind as 'PERSONAL' | 'SHARED' | 'ORG') ?? 'PERSONAL';
  const address = String(args.address || a.email);
  const ex = mail(w).mailboxes.find((m) => m.address === address && m.state !== 'REVOKED');
  if (ex) { ex.scopes = read ? ['SEND', 'READ'] : ['SEND']; ex.state = 'CONNECTED'; ex.provider = provider; }
  else mail(w).mailboxes.push({ id: uid('mb'), owner: a.id, orgId: a.orgId, provider, address, label: `${a.name} (${provider === 'GOOGLE' ? 'Google' : provider === 'MICROSOFT' ? 'Microsoft' : 'business email'})`, kind, sendAs: [a.id], scopes: read ? ['SEND', 'READ'] : ['SEND'], state: 'CONNECTED', connectedAt: now().slice(0, 10), simulated: true });
  emit(w, a.id, 'mailbox.connected', scopeOf(a), `${a.name} connected ${address} (${read ? 'send and read' : 'send only'}, simulated consent).`);
});
op('email.match', (w, args, a) => {
  const ok = !!args.ok; const r = confirmMatch(w, a, String(args.msgId), ok); if (!r) return;
  if (!ok) { post(w, a, { kind: 'reply', text: `Kept separate: the reply from ${firstOf(w, r.t.personId)} is in its own conversation, not linked to a role. Nothing else changed.` }); return; }
  const x = extractTime(w, r.t, r.m.body);
  if (x?.start) {
    const d = x.draft!; const busy = [...d.panel, d.personId].find((id) => (w.calendar.some((e) => e.status !== 'CANCELLED' && e.id !== d.eventId && e.attendees.includes(id) && new Date(e.start) < new Date(x.end!) && new Date(x.start!) < new Date(e.end))));
    post(w, a, { kind: 'approval', text: `Matched. ${firstOf(w, r.t.personId)} proposes ${tDay(x.start, LAGOS)} at ${tTime(x.start, LAGOS)}${x.offered ? ', one of the times you offered' : ' (not one of the times you offered)'}. ${busy ? `${firstOf(w, busy)} is busy then, so I won’t book it.` : `I checked the calendars: ${listNames(d.panel.map((p) => firstOf(w, p)))} and ${firstOf(w, r.t.personId)} are free. Shall I book it and draft a confirmation for you to approve?`}`,
      ref: { type: 'email.reply', id: r.m.id }, used: [`Calendars: ${listNames(d.panel.map((p) => firstOf(w, p)))} (busy times only)`, `${firstOf(w, r.t.personId)}’s email (read access)`],
      actions: busy ? [{ label: `Find another time for ${firstOf(w, r.t.personId)}`, primary: true, act: { t: 'say', text: `find a new time for ${firstOf(w, r.t.personId)}` } }] : [{ label: `Book ${tDay(x.start, LAGOS)} ${tTime(x.start, LAGOS)}`, primary: true, act: { t: 'do', op: 'email.book', args: { msgId: r.m.id } } }, { label: 'Not yet', act: { t: 'say', text: 'not now' } }] });
    w.q.frames[a.id] = frame('email.book', { msgId: r.m.id }, 'book');
  } else post(w, a, { kind: 'reply', text: `Matched. I didn’t find a specific time in ${firstOf(w, r.t.personId)}’s reply, so I haven’t proposed a booking.`, ref: { type: 'email.reply', id: r.m.id } });
});
op('email.book', (w, args, a) => bookFlow(w, a, String(args.msgId)));
function bookFlow(w: World, a: Actor, msgId: string) {
  const f0 = findMsg(w, msgId); if (f0 && pendingMatch(f0.m)) { post(w, a, { kind: 'question', text: 'First, is this reply really part of this conversation? The subject changed, so I won’t act on it until you confirm.', ref: { type: 'email.reply', id: msgId }, actions: [{ label: 'Yes, it’s this thread', primary: true, act: { t: 'do', op: 'email.match', args: { msgId, ok: true } } }, { label: 'No, keep it separate', act: { t: 'do', op: 'email.match', args: { msgId, ok: false } } }] }); return; }
  const r = bookProposed(w, a, msgId);
  if (!r.ok || !('d' in r) || !r.d) { post(w, a, { kind: 'refusal', text: r.text }); return; }
  const id = uid('msg'); const d = r.d;
  const end = new Date(new Date(r.start!).getTime() + 45 * 6e4).toISOString();
  const prev = findMsg(w, d.msgId)?.m;
  createDraft(w, a, { id, personId: d.personId, kind: 'CONFIRMATION', slot: { start: r.start!, end }, panel: d.panel, mandateId: d.mandateId, eventId: w.calendar.find((e) => e.personId === d.personId && e.orgId === d.orgId && e.status === 'CONFIRMED')?.id, threadId: d.threadId, senderId: prev?.senderId });
  w.q.frames[a.id] = frame('hire-c.draft', { msgId: id }, 'edit');
  post(w, a, { kind: 'notice', text: `${r.text} ${firstOf(w, d.personId)}’s interview is confirmed in the calendar.` });
  checkAndPost(w, a, id, `I drafted the confirmation to ${firstOf(w, d.personId)} from ${mailboxOf(w, prev?.senderId)?.address ?? 'your mailbox'}. `);
}
op('email.snooze', (w, args, a) => { mail(w).snoozed[String(args.threadId)] = new Date(Date.now() + 2 * 864e5).toISOString(); emit(w, a.id, 'email.followup.snoozed', scopeOf(a), `${a.name} put off a follow-up suggestion for 2 days.`); return { say: 'Okay, I won’t suggest a reminder for this conversation for 2 days.' }; });
op('email.followup.dismiss', (w, args, a) => { mail(w).followUps.push({ id: uid('fu'), threadId: String(args.threadId), afterHours: 72, state: 'CANCELLED', auto: false, cap: 1, why: `Dismissed by ${a.name}` }); emit(w, a.id, 'email.followup.cancelled', scopeOf(a), `${a.name} dismissed a follow-up suggestion.`); return { say: 'Dismissed. I won’t suggest a reminder for this conversation again.' }; });
op('email.automation', (w, args, a) => {
  const au = mail(w).automations.find((x) => x.id === args.id); if (!au) return;
  if (args.action === 'run') return { say: automationRun(w, a, au.id) };
  if (au.orgId !== a.orgId) return { say: 'That automation belongs to another organisation.' };
  au.state = args.action === 'pause' ? 'PAUSED' : 'ACTIVE'; if (au.state === 'PAUSED') { au.pausedBy = a.id; au.pausedAt = now(); }
  emit(w, a.id, au.state === 'PAUSED' ? 'automation.paused' : 'automation.resumed', `ORG:${au.orgId}`, `${a.name} ${au.state === 'PAUSED' ? 'paused' : 'resumed'} “${au.label}”${au.clientOrgId ? ` for ${orgOf(w, au.clientOrgId)?.name}` : ''}.`);
  return { say: au.state === 'PAUSED' ? `Paused “${au.label}” now. No reminder goes while it’s paused, including any due today.` : `Resumed “${au.label}”. It stays within its approval: ${au.messageClass.toLowerCase()}, up to ${au.cap}.` };
});
op('email.thread', (w, args, a) => {
  const t = w.threads.find((x) => x.id === args.threadId); if (!t) return;
  const action = String(args.action); const prev = t.state;
  if (action === 'route') { routeThread(w, a, t, String(args.campaignId)); return; }
  t.state = action === 'mute' ? 'MUTED' : action === 'unmute' ? 'OPEN' : action === 'report' ? 'REPORTED' : action === 'block' ? 'BLOCKED' : action === 'close' ? 'CLOSED' : t.state;
  emit(w, a.id, `thread.${action}`, a.side === 'candidate' ? `SHARED:${t.orgId}:${t.personId}` : `ORG:${t.orgId}`, `${a.name} ${action === 'mute' ? 'muted' : action === 'unmute' ? 'unmuted' : action === 'report' ? 'reported' : action === 'block' ? 'blocked' : 'closed'} the conversation ${a.side === 'candidate' ? `with ${orgOf(w, t.orgId)?.name}` : `with ${nameOf(w, t.personId)}`}.`, { threadId: t.id });
  pushUndo(w, a.id, `Changed the conversation (${action})`, 'email.thread.restore', { threadId: t.id, state: prev ?? 'OPEN' });
});
op('email.thread.restore', (w, args) => { const t = w.threads.find((x) => x.id === args.threadId); if (t) t.state = args.state as Thread['state']; });
op('email.forget', (w, args, a) => { const x = mail(w).extracted.find((e) => e.id === args.id); if (!x) return; x.forgotten = true; emit(w, a.id, 'memory.forgotten', scopeOf(a), `${a.name} asked Q to forget an extracted detail (“${x.text}”). The email itself is unchanged.`); return { say: `Forgotten: “${x.text}”. The original email stays in the record; I just won’t use what I extracted from it.` }; });
op('email.seen', (w, args) => { const id = String(args.threadId); if (!mail(w).seen[id]) mail(w).seen[id] = now(); });
op('email.batchApprove', (w, args, a) => {
  const ids = Object.values(hc(w).drafts).filter((d) => d.batchId === args.batchId).map((d) => d.msgId);
  const res: string[] = [];
  for (const id of ids) {
    const f0 = findMsg(w, id); if (!f0) continue; const first = firstOf(w, f0.t.personId);
    if (f0.m.status === 'SENT_SIMULATED') { res.push(`${first}: already sent`); continue; }
    const d = hc(w).drafts[id]; if (d.checkedV !== latestV(d).v) { const { pass } = runCheck(w, a, id); if (!pass) { res.push(`${first}: not sent (${(hc(w).drafts[id].checks ?? []).filter((c) => !c.ok).map((c) => c.label.toLowerCase()).join(', ')})`); continue; } }
    else if ((d.checks ?? []).some((c) => !c.ok)) { res.push(`${first}: not sent (${(d.checks ?? []).filter((c) => !c.ok).map((c) => c.label.toLowerCase()).join(', ')})`); continue; }
    const r = approveOne(w, a, id); res.push(`${first}: ${r}`);
  }
  post(w, a, { kind: 'notice', text: `Each person got their own email; nobody saw anyone else’s address. ${res.join('; ')}.`, ref: { type: 'email.batch', id: String(args.batchId) } });
});
const runCheck = (w: World, a: Actor, id: string) => checkDraft(w, a, id);
function approveOne(w: World, a: Actor, id: string) { const r = approveAndSend(w, a, id); const m = findMsg(w, id)!.m; return r.ok ? (m.acceptedAt ? acceptedLine(w, m) : 'sent (simulated)') : r.text.split('.')[0].toLowerCase(); }

/** Retry an approved email after a failure: the same approval (if the content is unchanged) and the same key. */
function retry(w: World, a: Actor, msgId: string) {
  const f0 = findMsg(w, msgId); const d = hc(w).drafts[msgId]; if (!f0 || !d) return;
  if (f0.m.status === 'SENT_SIMULATED') { post(w, a, { kind: 'reply', text: providerSend(w, a, msgId).text, ref: { type: 'email.status', id: msgId } }); return; }
  if (!approvalValid(f0.m)) { checkAndPost(w, a, msgId, 'The content changed since it was approved, so that approval no longer applies. '); return; }
  const { pass } = checkDraft(w, a, msgId);
  if (!pass) { checkAndPost(w, a, msgId); return; }
  const key = f0.m.idempotencyKey;
  const r = approveAndSend(w, a, msgId, latestV(d).v);
  post(w, a, { kind: r.ok ? 'notice' : 'refusal', text: r.ok ? `${r.text} Sent once, with the same key as the failed attempt (${key}).` : r.text, ref: { type: 'email.status', id: msgId } });
  if (r.ok) w.q.frames[a.id] = frame('email.retry', { msgId }, 'done');
}

/** File a thread under a hiring campaign (and its role). The campaign slice is read-only here. */
function routeThread(w: World, a: Actor, t: Thread, campaignId: string) {
  const c = campaigns(w).list.find((x) => x.id === campaignId && x.orgId === a.orgId);
  if (!c) return;
  const prev = { campaignId: t.campaignId, mandateId: t.mandateId };
  t.campaignId = c.id; if (!t.mandateId || !c.roles.includes(t.mandateId)) t.mandateId = c.roles[0];
  for (const d of Object.values(hcw(w).drafts)) if (d.threadId === t.id) d.campaignId = c.id;
  emit(w, a.id, 'thread.routed', `ORG:${t.orgId}`, `${a.name} filed ${nameOf(w, t.personId)}’s conversation under “${c.name}” → ${mandateTitle(w, t.mandateId)}.`, { threadId: t.id, campaignId: c.id, mandateId: t.mandateId });
  pushUndo(w, a.id, `Filed ${firstOf(w, t.personId)}’s conversation under ${c.name}`, 'email.route.restore', { threadId: t.id, ...prev });
  post(w, a, { kind: 'undo', text: `Filed ${firstOf(w, t.personId)}’s ${t.initiatedBy === 'CANDIDATE' ? 'question' : 'conversation'} under ${c.name} → ${mandateTitle(w, t.mandateId)}. It shows in the campaign and in Messages under that filter. Recorded in the audit log.`,
    actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }, { label: 'Open the campaign', act: { t: 'nav', to: `/r/campaigns/${c.id}` } }] });
}
op('email.route.restore', (w, args) => { const t = w.threads.find((x) => x.id === args.threadId); if (t) { t.campaignId = (args.campaignId as string) || undefined; t.mandateId = (args.mandateId as string) || t.mandateId; } });

// ---------------- Candidate ops ----------------
op('contact.send', (w, args, a) => {
  const r = sendContact(w, a, String(args.jobId), String(args.body ?? ''), (args.channel as 'IN_APP' | 'EMAIL') ?? 'IN_APP');
  post(w, a, { kind: r.ok ? 'notice' : 'refusal', text: r.text, actions: r.ok ? [{ label: 'Open messages', act: { t: 'nav', to: '/c/messages' } }] : undefined });
  if (r.ok) w.q.frames[a.id] = null;
});
op('contact.draft', (w, args, a) => { const pid = a.personId!; const d = mail(w).contactDrafts[pid]; if (d) { d.body = String(args.body ?? d.body); if (args.channel) d.channel = args.channel as 'IN_APP' | 'EMAIL'; } });
op('contact.seek', (w, args, a) => { const k = `${a.id}|briefing`; const cur = (w.q.ui[k] as { n?: number } | undefined)?.n ?? 0; w.q.ui[k] = { t: Number(args.t), n: cur + 1 }; });
op('contact.emailReply', (w, args, a) => {
  const t = w.threads.find((x) => x.id === args.threadId); if (!t) return;
  const body = String(args.body ?? '').trim(); if (!body) return { say: 'The reply is empty, so nothing was sent.' };
  const mb = mail(w).mailboxes.find((m) => m.owner === a.personId && m.state === 'CONNECTED');
  if (!mb) return { say: 'Your email isn’t connected, so I can’t send this by email. You can reply in Talent Q instead.' };
  const r = receiveEmail(w, t, a.personId!, body, String(args.subject ?? 'Re: interview'));
  emit(w, a.id, 'email.candidate.sent', `SHARED:${t.orgId}:${t.personId}`, `${a.name} replied by email from ${mb.address} (simulated).`);
  post(w, a, { kind: 'notice', text: `Sent by email from ${mb.address} (simulated: accepted by Google). ${r.readable ? `${orgOf(w, t.orgId)?.name} has connected ${r.mailbox?.address} with read access, so your reply will show in this conversation for them too.` : `It goes to ${r.mailbox?.address ?? 'their mailbox'}; Talent Q can’t see that mailbox, so it may not show here.`}` });
});
op('contact.thread', (w, args, a) => {
  const t = w.threads.find((x) => x.id === args.threadId && x.personId === a.personId); if (!t) return;
  const act = String(args.action);
  if (act === 'withdrawConsent') {
    const c = w.consents[a.personId!]; if (c && !c.withdrawnFrom.includes(t.orgId)) c.withdrawnFrom.push(t.orgId);
    t.state = 'CONSENT_REVOKED';
    let stopped = 0; for (const x of w.threads.filter((y) => y.orgId === t.orgId && y.personId === a.personId)) for (const m of x.messages) if (m.status === 'QUEUED_OFFLINE' || m.delivery === 'QUEUED' || (m.from !== a.personId && (m.status === 'DRAFT' || m.status === 'AWAITING_APPROVAL'))) { if (m.delivery === 'QUEUED') m.delivery = 'CANCELLED'; m.status = m.from === a.personId ? m.status : 'DISCARDED'; stopped++; }
    for (const f of mail(w).followUps.filter((f) => f.threadId === t.id && f.state !== 'SENT')) f.state = 'CANCELLED';
    emit(w, a.id, 'consent.withdrawn', `SHARED:${t.orgId}:${a.personId}`, `${a.name} withdrew consent for ${orgOf(w, t.orgId)?.name} to contact them. Queued messages and reminders stopped.`);
    return { say: `Done. ${orgOf(w, t.orgId)?.name} can’t contact you through Talent Q any more${stopped ? `, and ${stopped} queued message${stopped === 1 ? '' : 's'} won’t go` : ''}. Emails already sent can’t be unsent from their inbox. You can undo this in your privacy settings.` };
  }
  t.state = act === 'mute' ? 'MUTED' : 'OPEN';
  emit(w, a.id, `thread.${act}`, `SHARED:${t.orgId}:${a.personId}`, `${a.name} ${act === 'mute' ? 'muted' : 'unmuted'} the conversation with ${orgOf(w, t.orgId)?.name}.`);
});
// Kept for older chips: a plain message to an employer goes through the same policy check.
op('tb.msg.send', (w, args, a) => {
  const org = String(args.org); const job = w.jobs.find((j) => j.orgId === org && w.applications.some((x) => x.jobId === j.id && x.personId === a.personId)) ?? w.jobs.find((j) => j.orgId === org && j.status === 'OPEN');
  const t = w.threads.find((x) => x.orgId === org && x.personId === a.personId && x.messages.some((m) => m.from !== a.personId));
  if (t) { t.messages.push({ id: uid('msg'), from: a.personId!, to: org, body: String(args.body), at: now(), status: 'RECEIVED', channel: 'IN_APP', delivery: 'ACCEPTED', acceptedAt: now() }); return { say: `Sent (simulated) to ${orgOf(w, org)?.name}, in your existing conversation.` }; }
  if (!job) return { say: `${orgOf(w, org)?.name} has no open listing I can attach a question to.` };
  const r = sendContact(w, a, job.id, String(args.body), 'IN_APP'); return { say: r.text };
});

// =====================================================================================================
// Recruiter skills
// =====================================================================================================
const EMAIL_WORD = /\b(e-?mail|mail)\b/;
function personFor(c: QCtx) { const ps = peopleIn(c); if (ps[0]) return { id: ps[0] }; return contextPerson(c); }
function selectedThread(c: QCtx): Thread | undefined {
  const sel = (c.w.q.ui[`${c.actor.id}|/r/messages`] as { sel?: string } | undefined)?.sel;
  const pid = peopleIn(c)[0] ?? sel ?? contextPerson(c).id;
  const ts = c.w.threads.filter((t) => t.orgId === c.actor.orgId && t.personId === pid && t.messages.some((m) => m.status !== 'DISCARDED'));
  return ts.sort((x, y) => Number(y.initiatedBy === 'CANDIDATE') - Number(x.initiatedBy === 'CANDIDATE') || (y.messages[y.messages.length - 1]?.at ?? '').localeCompare(x.messages[x.messages.length - 1]?.at ?? ''))[0];
}

/** "email Tobi an interview invite for Thursday or Friday": one email, two offered times, sender and campaign resolved. */
function emailInvite(c: QCtx, pid: string): QReply {
  const w = c.w; const a = c.actor; const first = firstOf(w, pid);
  const entry = entryFor(w, pid, a.orgId);
  if (!entry) return { msgs: [{ kind: 'reply', text: `${first} isn’t in one of ${orgOf(w, a.orgId)?.name}’s roles yet, so I don’t know which job the invitation is for.` }] };
  if (w.consents[pid]?.withdrawnFrom.includes(a.orgId!)) return { msgs: [{ kind: 'refusal', text: `${first} withdrew consent for ${orgOf(w, a.orgId)?.name} to contact them, so I won’t draft anything.` }] };
  const iv = w.interviews.find((i) => i.personId === pid && i.orgId === a.orgId && i.status !== 'CANCELLED');
  const panel = iv?.panel.length ? iv.panel : defaultPanel(w, a, entry.mandateId);
  // "Thursday or Friday": the next Thursday, then the Friday after it (never a Friday that comes before it).
  const raw = c.ents.days.length ? resolveDays(w, c.ents.days.filter((x) => x !== 'next week'), c.norm) : nextWeek(w);
  const days = raw.reduce<string[]>((acc, d) => { let x = d; while (acc.length && x < acc[0]) x = addDays(x, 7); acc.push(x); return acc; }, []);
  const prefer = parseTime(c.ents.time) ?? '14:00';
  const slots = days.map((d) => findSlots(w, { attendees: panel, personId: pid, dates: [d], orgId: a.orgId, preferHM: prefer, limit: 1 })[0]).filter(Boolean);
  if (!slots.length) return { msgs: [{ kind: 'reply', text: `${listNames(panel.map((p) => firstOf(w, p)))} aren’t all free ${days.length > 1 ? 'on those days' : 'that day'} within interview hours, so I haven’t drafted it. Want me to look at next week?`, actions: [{ label: `Find times for ${first}`, primary: true, act: { t: 'say', text: `find a time for ${first} next week` } }] }] };
  const sender = defaultSender(w, a, a.orgId!, entry.mandateId);
  const id = uid('msg');
  return {
    msgs: [],
    effects: (ww, aa) => {
      createDraft(ww, aa, { id, personId: pid, kind: 'INVITE', slot: { start: slots[0].start, end: slots[0].end }, options: slots.slice(1).map((s) => ({ start: s.start, end: s.end })), panel, mandateId: entry.mandateId, eventId: undefined, channel: 'EMAIL', senderId: sender?.id, template: 'tpl_invite' });
      const d = hc(ww).drafts[id]; const camp = d.campaignId ? campaigns(ww).list.find((x) => x.id === d.campaignId)?.name : undefined;
      const times = [slots[0], ...slots.slice(1)].map((s) => `${tDay(s.start, LAGOS)} ${tTime(s.start, LAGOS)}`);
      postDraft(ww, aa, id, `Here’s the email to ${first}: an interview invitation offering ${listNames(times)} Lagos, with ${listNames(panel.map((p) => (p === aa.id ? 'you' : firstOf(ww, p))))}. From ${sender?.address ?? 'your mailbox'} to ${addressOf(ww, pid)}${camp ? `, filed under ${camp}` : ''}. Nothing goes until you approve this exact version.`);
      const m = hc(ww).drafts[id]; void m;
    },
    frame: frame('hire-c.draft', { msgId: id }, 'edit'),
  };
}
registerSkill({
  id: 'email.compose', side: 'recruiter',
  match: (c) => {
    if (!hirer(c) || !EMAIL_WORD.test(c.norm) || /\b(from|as) (the |our |my )?\w+('s)? (gmail|email|mailbox|outlook|account|address)\b/.test(c.norm)) return 0;
    if (/\b(shortlist\w*|all (the )?candidates|the three|the 3)\b/.test(c.norm)) return 0;
    if (/\b(what did|why was|did .* reply|settings|connect|reconnect|disconnect)\b/.test(c.norm)) return 0;
    return personFor(c).id && /\b(e-?mail|mail) (him|her|them|\w+)\b/.test(c.norm) ? 0.93 : 0;
  },
  handle: (c) => {
    const p = personFor(c); if (!p.id) return { msgs: [{ kind: 'question', text: 'Who should the email go to?' }] };
    if (/\b(invit\w*|interview)\b/.test(c.norm)) return emailInvite(c, p.id);
    return draftFlow(c, p.id, kindFrom(c.norm, c.w, p.id, c.actor.orgId), p.id === peopleIn(c)[0] ? undefined : p.why);
  },
});

/** "email the three candidates I shortlisted, explain the next step and ask for availability" */
registerSkill({
  id: 'email.batch', side: 'recruiter',
  match: (c) => (hirer(c) && /\b(e-?mail|write to|message)\b/.test(c.norm) && /\b(shortlist\w*|all (the |my )?candidates|the (three|3) candidates)\b/.test(c.norm) ? 0.94 : 0),
  handle: (c) => {
    const w = c.w; const a = c.actor;
    if (!['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER')) return { msgs: [{ kind: 'refusal', text: 'Your role can’t write to candidates. A recruiter or admin can.' }] };
    const mine = w.pipeline.filter((p) => p.stage === 'SHORTLISTED' && (p.by === a.id || true) && entryFor(w, p.personId, a.orgId)?.mandateId === p.mandateId).filter((p) => (w.mandate.mandateId === p.mandateId ? a.orgId === 'org_kora' : w.mandates.find((m) => m.id === p.mandateId)?.orgId === a.orgId));
    const shortlisted = mine.filter((p) => p.by === a.id).length ? mine.filter((p) => p.by === a.id) : mine;
    if (!shortlisted.length) return { msgs: [{ kind: 'reply', text: 'Nobody is shortlisted on your roles right now, so there’s no one to email.' }] };
    const batchId = uid('batch');
    return {
      msgs: [],
      effects: (ww, aa) => {
        for (const p of shortlisted) {
          const id = uid('msg');
          createDraft(ww, aa, { id, personId: p.personId, kind: 'AVAILABILITY', mandateId: p.mandateId, channel: 'EMAIL', batchId, template: 'tpl_avail' });
          checkDraft(ww, aa, id);
        }
        const ds = Object.values(hc(ww).drafts).filter((d) => d.batchId === batchId);
        const blocked = ds.filter((d) => (d.checks ?? []).some((x) => !x.ok));
        post(ww, aa, { kind: 'approval', text: `I drafted ${ds.length} separate emails, one per person, so nobody sees anyone else’s address: ${listNames(ds.map((d) => firstOf(ww, d.personId)))}. Each explains the next step (a 45-minute interview) and asks for times. ${blocked.length ? `${listNames(blocked.map((d) => firstOf(ww, d.personId)))} can’t be sent as it stands (details on the card).` : 'All passed the checks.'} Approve them and each goes on its own.`,
          ref: { type: 'email.batch', id: batchId }, used: [`${orgOf(ww, aa.orgId)?.name} template: Next step and availability`, 'Contact choices and suppressions', `Sender: ${mailboxOf(ww, findMsg(ww, ds[0].msgId)?.m.senderId)?.address ?? '—'}`],
          actions: [{ label: `Approve and send ${ds.length - blocked.length}`, primary: true, act: { t: 'do', op: 'email.batchApprove', args: { batchId } } }, { label: 'Review in Messages', act: { t: 'nav', to: '/r/messages' } }] });
        ww.q.frames[aa.id] = frame('email.batch', { batchId }, 'approve');
      },
    };
  },
  answer: (c) => {
    const id = c.frame?.slots.batchId; if (!id || !(c.ents.yes || /\b(approve|send (them|all|it))\b/.test(c.norm))) return null;
    return { msgs: [], effects: (w, a) => { OPS_RUN('email.batchApprove')(w, { batchId: id }, a); }, frame: null };
  },
});

/** J11 step 6: "ask Tobi for a walkthrough video of his reconciliation work". In-app, same thread, approved before sending. */
registerSkill({
  id: 'email.evidenceRequest', side: 'recruiter',
  match: (c) => (hirer(c) && /\b(ask|request|invite)\b/.test(c.norm) && /\b(walkthrough|walk through|video|demo|recording|screen ?cast)\b/.test(c.norm) && personFor(c).id ? 0.94 : 0),
  handle: (c) => {
    const w = c.w; const pid = personFor(c).id!; const first = firstOf(w, pid);
    const entry = entryFor(w, pid, c.actor.orgId);
    if (!entry) return { msgs: [{ kind: 'reply', text: `${first} isn’t in one of your roles, so I don’t know what the request is for.` }] };
    const topic = (c.text.match(/\b(?:of|about|showing)\s+(?:his|her|their)?\s*(.{4,}?)[.?!]*$/i)?.[1] ?? 'something you’ve built').replace(/\bhis\b|\bher\b|\btheir\b/gi, 'your').trim();
    const t = w.threads.filter((x) => x.orgId === c.actor.orgId && x.personId === pid).sort((x, y) => Number(y.initiatedBy === 'CANDIDATE') - Number(x.initiatedBy === 'CANDIDATE'))[0];
    const id = uid('msg');
    return { msgs: [], frame: frame('hire-c.draft', { msgId: id }, 'edit'), effects: (ww, aa) => {
      createDraft(ww, aa, { id, personId: pid, kind: 'EVIDENCE_REQUEST', mandateId: entry.mandateId, reason: `your ${topic.replace(/^your\s+/i, '')}`, channel: 'IN_APP', threadId: t?.id });
      postDraft(ww, aa, id, `Here’s the request to ${first}, in Talent Q${t?.initiatedBy === 'CANDIDATE' ? ', in the conversation they started' : ''}. It says ${first} chooses exactly what you see and can send a written walkthrough instead. Nothing goes until you approve it.`);
    } };
  },
});

/** R5 / J11 step 11: "send it from the CEO's gmail". Only addresses this person may send as. */
registerSkill({
  id: 'email.identity', side: 'recruiter',
  match: (c) => (hirer(c) && /\b(send|email|mail|write)\b/.test(c.norm) && /\b(from|as|using) (the |our |my |his |her )?([\w.@-]+('s)? )?(gmail|email|e-mail|mailbox|outlook|account|address|inbox)\b/.test(c.norm) ? 0.96 : /\b(send|email) .*\b(from|as) (the )?(ceo|founder|boss|md|managing director|chairman)\b/.test(c.norm) && hirer(c) ? 0.96 : 0),
  handle: (c) => {
    const w = c.w; const a = c.actor;
    const mine = sendersFor(w, a.id).filter((m) => m.orgId === a.orgId);
    const named = mail(w).mailboxes.find((m) => m.orgId === a.orgId && m.kind !== 'SERVICE' && (c.norm.includes(m.address.split('@')[0]) || (m.kind === 'SHARED' && /\b(careers|shared|team)\b/.test(c.norm))));
    const d = currentDraft(w, a, c.frame?.slots.msgId);
    if (named && named.sendAs.includes(a.id) && !/\b(ceo|founder|boss|chairman)\b/.test(c.norm)) {
      if (!d) return { msgs: [{ kind: 'reply', text: `You may send as ${named.address}. Which message should go from it?` }] };
      return { msgs: [], effects: (ww, aa) => { (OPS_RUN('email.setSender'))(ww, { msgId: d.msgId, mailboxId: named.id }, aa); postDraft(ww, aa, d.msgId, `Switched the sender to ${named.address}. That’s a change to the email, so it needs your approval again.`); } };
    }
    const who = /\b(ceo|founder|chairman|md|managing director)\b/.test(c.norm) ? 'the CEO' : named ? named.address : 'that person';
    emit(w, a.id, 'email.identity.refused', `ORG:${a.orgId}`, `Q declined to send as ${who} for ${a.name}: not an authorised sender.`);
    return { msgs: [{ kind: 'refusal', text: `I can’t send it from ${who === 'the CEO' ? 'the CEO’s Gmail' : who}. Talent Q only sends from mailboxes their owner connected and shared with you, and ${who === 'the CEO' ? 'the CEO hasn’t connected theirs' : 'you aren’t a delegate on it'}. You can send from ${listNames(mine.map((m) => m.address)) || 'no connected mailbox yet'}. If it must come from ${who}, I can prepare a draft for them to send themselves, or they can connect their mailbox and add you as a delegate in Email settings.`,
      why: 'Sending as someone else without their delegation would be impersonation (E-01 §6). The draft and its approval stay as they are.',
      actions: [...(d ? [{ label: `Prepare a draft for ${who}`, primary: true, act: { t: 'do' as const, op: 'email.ownerDraft', args: { msgId: d.msgId, who } } }] : []), ...(mine[0] ? [{ label: `Send from ${mine[0].address}`, act: { t: 'say' as const, text: `send it from ${mine[0].address.split('@')[0]}` } }] : []), { label: 'Email settings', act: { t: 'nav', to: '/settings/email' } }] }] };
  },
});
op('email.ownerDraft', (w, args, a) => {
  const f0 = findMsg(w, String(args.msgId)); if (!f0) return;
  emit(w, a.id, 'email.draft.handoff', `ORG:${f0.t.orgId}`, `${a.name} prepared a copy of the email to ${nameOf(w, f0.t.personId)} for ${String(args.who)} to send from their own mailbox. Talent Q did not send it.`);
  return { say: `Here’s a copy for ${String(args.who)} to send from their own mailbox. Talent Q won’t send it and won’t track it.\n\nTo: ${addressOf(w, f0.t.personId)}\nSubject: ${f0.m.subject ?? ''}\n\n${f0.m.body}` };
});

/** "send it" after a failure (same approval, same key), and "send it again" after a send (duplicate prevented). */
registerSkill({
  id: 'email.retry', side: 'recruiter',
  match: (c) => {
    if (!hirer(c)) return 0;
    const again = /\b(send (it|that|this) again|resend|re-send|send (it )?(one more time|twice)|try again|retry|did it (go|send)|was it sent)\b/.test(c.norm);
    const send = /\b(send it|send (it )?now|send the (email|invite|invitation)|go ahead|approve)\b/.test(c.norm) || (c.ents.yes && c.frame?.intent === 'email.retry');
    if (!again && !send) return 0;
    const id = c.frame?.slots.msgId; const f0 = id ? findMsg(c.w, id) : undefined;
    if (f0 && f0.m.channel === 'EMAIL' && ((f0.m.delivery === 'FAILED' && approvalValid(f0.m)) || (again && f0.m.status === 'SENT_SIMULATED'))) return 0.95;
    const last = lastEmail(c.w, c.actor); if (!last) return 0;
    if (again && last.m.status === 'SENT_SIMULATED') return 0.95;
    if (last.m.delivery === 'FAILED' && approvalValid(last.m) && (again || send)) return 0.95;
    return 0;
  },
  handle: (c) => {
    const id = c.frame?.slots.msgId; const f0 = (id && findMsg(c.w, id)?.m.channel === 'EMAIL' && findMsg(c.w, id)) || lastEmail(c.w, c.actor)!;
    return { msgs: [], effects: (w, a) => retry(w, a, f0.m.id), frame: frame('email.retry', { msgId: f0.m.id }, 'done') };
  },
});
function lastEmail(w: World, a: Actor) {
  return w.threads.filter((t) => t.orgId === a.orgId).flatMap((t) => t.messages.map((m) => ({ t, m }))).filter(({ m }) => m.channel === 'EMAIL' && m.from === a.id && (m.approvedBy === a.id) && (m.delivery || m.status === 'SENT_SIMULATED')).sort((x, y) => (y.m.attempts?.[y.m.attempts.length - 1]?.at ?? y.m.at).localeCompare(x.m.attempts?.[x.m.attempts.length - 1]?.at ?? x.m.at))[0];
}

/** J11 step 3: "put this in the Q4 Engineering campaign" */
registerSkill({
  id: 'email.route', side: 'recruiter',
  match: (c) => (hirer(c) && /\b(put|file|move|add|route|link|assign)\b/.test(c.norm) && /\bcampaign\b/.test(c.norm) && /\b(this|it|thread|conversation|message|question|\w+'s)\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const w = c.w; const a = c.actor;
    const list = campaignsFor(w, a.orgId!);
    const words = c.norm.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((x) => x.length > 1 && !['the', 'put', 'this', 'in', 'into', 'campaign', 'file', 'under', 'it', 'move', 'add', 'to'].includes(x));
    const camp = list.map((x) => ({ x, s: words.filter((wd) => x.name.toLowerCase().includes(wd)).length })).sort((p, q) => q.s - p.s)[0];
    if (!camp || camp.s === 0) return { msgs: [{ kind: 'question', text: `Which campaign? ${list.map((x) => x.name).join(', ')}.` }] };
    const t = selectedThread(c);
    if (!t) return { msgs: [{ kind: 'question', text: 'Which conversation should I file? Open it in Messages, or tell me the person’s name.' }] };
    return { msgs: [], effects: (ww, aa) => { const tt = ww.threads.find((x) => x.id === t.id)!; routeThread(ww, aa, tt, camp.x.id); } };
  },
});

/** Confirm a reply's match ("yes, that's the right thread") and book a proposed time ("book it"). */
registerSkill({
  id: 'email.book', side: 'recruiter',
  match: (c) => {
    if (!hirer(c)) return 0;
    const pend = pendingReplies(c.w, c.actor)[0];
    if (pend && (/\b(right (thread|conversation)|that is right|it is (the right|this) (one|thread)|confirm (the )?match|same (thread|conversation))\b/.test(c.norm) || (c.ents.yes && c.lastQ?.ref?.type === 'email.reply'))) return 0.94;
    if (/\b(book|confirm|lock in)\b/.test(c.norm) && (c.frame?.intent === 'email.book' || bookable(c.w, c.actor)) && !/\b(draft|find)\b/.test(c.norm)) return 0.93;
    if (c.frame?.intent === 'email.book' && c.ents.yes) return 0.93;
    return 0;
  },
  handle: (c) => {
    const pend = pendingReplies(c.w, c.actor)[0];
    if (pend && !/\bbook\b/.test(c.norm)) return { msgs: [], effects: (w, a) => (OPS_RUN('email.match'))(w, { msgId: pend.m.id, ok: true }, a) };
    const id = c.frame?.slots.msgId ?? (pend?.m.id) ?? bookable(c.w, c.actor)?.m.id;
    if (!id) return { msgs: [{ kind: 'reply', text: 'I don’t have a proposed time from a reply to book.' }] };
    return { msgs: [], effects: (w, a) => bookFlow(w, a, id), frame: null };
  },
  answer: (c) => (c.frame?.intent === 'email.book' && (c.ents.yes || /\bbook\b/.test(c.norm)) ? { msgs: [], effects: (w, a) => bookFlow(w, a, c.frame!.slots.msgId), frame: null } : null),
});
function pendingReplies(w: World, a: Actor) { return w.threads.filter((t) => t.orgId === a.orgId).flatMap((t) => t.messages.map((m) => ({ t, m }))).filter(({ m }) => pendingMatch(m) && canRead(mailboxOf(w, m.inbound?.mailbox))); }
function bookable(w: World, a: Actor) { return w.threads.filter((t) => t.orgId === a.orgId).flatMap((t) => t.messages.map((m) => ({ t, m }))).reverse().find(({ t, m }) => m.inbound && m.from === t.personId && !pendingMatch(m) && extractTime(w, t, m.body)?.start && !w.calendar.some((e) => e.personId === t.personId && e.orgId === t.orgId && e.status === 'CONFIRMED')); }

/** Audit and memory (E01-24): what Q sent, why someone was contacted, what instructions applied, forget an extraction. */
registerSkill({
  id: 'email.audit', side: 'recruiter',
  match: (c) => (hirer(c) && (/\bwhat (did|have) (q|you|we) (send|sent|email\w*)\b/.test(c.norm) || /\bwhy (was|were|did) .*(contact\w*|email\w*|messag\w*)\b/.test(c.norm) || /\bwhat (instructions|rules|guidelines) did (q|you) (apply|use|follow)\b/.test(c.norm) || /\bforget (the |that )?(extracted|proposed|time|preference)\b/.test(c.norm)) ? 0.92 : 0),
  handle: (c) => {
    const w = c.w; const a = c.actor; const pid = personFor(c).id;
    if (/\bforget\b/.test(c.norm)) {
      const x = mail(w).extracted.filter((e) => !e.forgotten && (!pid || e.personId === pid)).pop();
      if (!x) return { msgs: [{ kind: 'reply', text: 'I haven’t extracted anything from emails that I’m still using.' }] };
      return { msgs: [], effects: (ww, aa) => { const r = (OPS_RUN('email.forget'))(ww, { id: x.id }, aa); if (r && typeof r === 'object' && r.say) post(ww, aa, { kind: 'reply', text: r.say }); } };
    }
    if (!pid) return { msgs: [{ kind: 'question', text: 'About whom? Tell me the person’s name.' }] };
    const first = firstOf(w, pid);
    const ts = w.threads.filter((t) => t.orgId === a.orgId && t.personId === pid);
    const sent = ts.flatMap((t) => t.messages).filter((m) => m.from !== pid && (m.status === 'SENT_SIMULATED' || m.delivery)).sort((x, y) => x.at.localeCompare(y.at));
    if (/\bwhy\b/.test(c.norm)) {
      const t = ts.find((x) => x.initiatedBy === 'CANDIDATE');
      const e = entryFor(w, pid, a.orgId);
      const reasons = [t ? `${first} started the conversation (asked about ${mandateTitle(w, t.mandateId)} on ${tDay(t.messages[0].at, LAGOS)})` : undefined, e ? `${first} is ${e.stage.toLowerCase()} on ${mandateTitle(w, e.mandateId)} (moved by ${firstOf(w, e.by)} on ${e.at})` : undefined, ...sent.map((m) => `${m.subject ?? 'a message'} was approved by ${m.approvedBy ? firstOf(w, m.approvedBy) : '—'}`)].filter(Boolean);
      return { msgs: [{ kind: 'reply', text: `Why ${first} was contacted: ${reasons.join('; ')}. Every send needed a person’s approval; I never contact anyone on my own.`, actions: [{ label: 'Open the audit log', act: { t: 'nav', to: '/r/audit' } }] }] };
    }
    if (/\binstructions|rules|guidelines\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: `For messages to ${first} I applied ${orgOf(w, a.orgId)?.name}’s guidelines: ${guidesOf(w, a.orgId).filter((g) => g.on).map((g) => `“${g.text}” (v${g.v})`).join('; ')}; the contact policy and suppression list; and the sender rules (only addresses you may send as).` }] };
    if (!sent.length) return { msgs: [{ kind: 'reply', text: `Nothing has been sent to ${first} from ${orgOf(w, a.orgId)?.name}.` }] };
    return { msgs: [{ kind: 'reply', text: `Sent to ${first}: ${sent.map((m) => `“${m.subject ?? 'message'}” on ${tDay(m.at, LAGOS)} by ${m.channel === 'EMAIL' ? 'email' : m.channel === 'SMS' ? 'text' : 'Talent Q'}${m.acceptedAt ? `, ${acceptedLine(w, m)}` : m.delivery === 'FAILED' ? ', not sent (failed)' : ''}`).join('; ')}. These are the records themselves, not my summary.`, ref: sent[sent.length - 1].channel === 'EMAIL' ? { type: 'email.status', id: sent[sent.length - 1].id } : undefined }] };
  },
});

/** Read scope honesty: "did Grace reply by email?" with a send-only mailbox. */
registerSkill({
  id: 'email.readscope', side: 'recruiter',
  match: (c) => (hirer(c) && /\b(did|has|have)\b.*\b(repl\w*|answer\w*|email\w* back|write back|respond\w*)\b/.test(c.norm) && peopleIn(c).length > 0 ? 0.9 : 0),
  handle: (c) => {
    const w = c.w; const a = c.actor; const pid = peopleIn(c)[0]; const first = firstOf(w, pid);
    const t = w.threads.filter((x) => x.orgId === a.orgId && x.personId === pid).sort((x, y) => (y.messages[y.messages.length - 1]?.at ?? '').localeCompare(x.messages[x.messages.length - 1]?.at ?? ''))[0];
    if (!t) return { msgs: [{ kind: 'reply', text: `${orgOf(w, a.orgId)?.name} hasn’t been in touch with ${first}.` }] };
    const mb = replyMailbox(w, t);
    const theirs = t.messages.filter((m) => m.from === pid);
    const lastOut = [...t.messages].reverse().find((m) => m.from !== pid && m.status === 'SENT_SIMULATED');
    const repliedAfter = theirs.some((m) => !lastOut || m.at > lastOut.at);
    const scope = mb && !canRead(mb) ? ` I can’t see email replies to ${mb.address}: it’s connected send-only, so ${first} may have replied there. ${mb.owner === a.id ? 'You can allow read access in Email settings.' : `${firstOf(w, mb.owner)} can allow read access in Email settings.`}` : '';
    return { msgs: [{ kind: 'reply', text: repliedAfter ? `Yes: ${first} replied on ${tDay(theirs[theirs.length - 1].at, LAGOS)}.${scope}` : `No reply from ${first} that I can see.${scope}`, actions: scope ? [{ label: 'Email settings', act: { t: 'nav', to: '/settings/email' } }] : undefined }] };
  },
});

/** R4: client senders and the client's reminder automation. */
registerSkill({
  id: 'email.client', side: 'recruiter',
  match: (c) => (hirer(c) && (/\b(pause|stop|resume|restart|turn (off|on)|run)\b.*\b(automation|reminders?|automatic)\b/.test(c.norm) || /\bwhich (address|email|mailbox|sender)\b/.test(c.norm) || /\bwho (will|would) (it|this) (go|come) from\b/.test(c.norm)) ? 0.92 : 0),
  handle: (c) => {
    const w = c.w; const a = c.actor;
    if (/\b(automation|reminders?|automatic)\b/.test(c.norm)) {
      const org = orgIn(c.norm);
      const au = mail(w).automations.find((x) => x.orgId === a.orgId && (!org || x.clientOrgId === org)) ?? mail(w).automations.find((x) => x.orgId === a.orgId);
      if (!au) return { msgs: [{ kind: 'reply', text: 'There are no reminder automations for your organisation.' }] };
      const action = /\b(pause|stop|turn off)\b/.test(c.norm) ? 'pause' : /\brun\b/.test(c.norm) ? 'run' : 'resume';
      return { msgs: [], effects: (ww, aa) => { const r = (OPS_RUN('email.automation'))(ww, { id: au.id, action }, aa); if (r && typeof r === 'object' && r.say) post(ww, aa, { kind: action === 'pause' ? 'undo' : 'reply', text: r.say, actions: action === 'pause' ? [{ label: 'Resume it', act: { t: 'do', op: 'email.automation', args: { id: au.id, action: 'resume' } } }] : undefined }); } };
    }
    const d = currentDraft(w, a, c.frame?.slots.msgId);
    const mb = d ? mailboxOf(w, findMsg(w, d.msgId)?.m.senderId) : defaultSender(w, a, a.orgId!);
    return { msgs: [{ kind: 'reply', text: mb ? `${d ? 'It will go' : 'Emails go'} from ${mb.address} (${mb.kind === 'CLIENT' ? `the client sender for ${orgOf(w, mb.clientOrgId)?.name}, chosen because this is ${orgOf(w, mb.clientOrgId)?.name} work` : mb.kind.toLowerCase()}), ${scopeWord(mb).toLowerCase()}.` : 'No mailbox is connected yet.', actions: [{ label: 'Email settings', act: { t: 'nav', to: '/settings/email' } }] }] };
  },
});

/** Settings by voice: "connect my outlook", "reconnect my gmail". */
registerSkill({
  id: 'email.settings', side: 'both',
  match: (c) => (/\b(connect|reconnect|disconnect|link|revoke)\b.*\b(gmail|outlook|email|e-mail|mailbox|microsoft|google|inbox)\b/.test(c.norm) || /\bemail settings\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const w = c.w; const a = c.actor;
    const mine = mail(w).mailboxes.filter((m) => m.owner === a.id || m.owner === a.personId);
    if (/\breconnect\b/.test(c.norm)) { const ex = mine.find((m) => m.state === 'EXPIRED') ?? mine[0]; if (ex) return { msgs: [{ kind: 'reply', text: `Opening the ${PROVIDER_NAME[ex.provider]} sign-in for ${ex.address}. It explains exactly what Talent Q may do before you agree.` }], effects: (ww, aa) => { (ww.q.ui[`${aa.id}|/settings/email`] ??= {}).consent = ex.id; }, nav: { to: '/settings/email', label: 'email settings' } }; }
    const prov = /\b(outlook|microsoft|office|365)\b/.test(c.norm) ? 'MICROSOFT' : /\b(gmail|google)\b/.test(c.norm) ? 'GOOGLE' : undefined;
    return { msgs: [{ kind: 'reply', text: prov ? `Here’s how connecting ${prov === 'GOOGLE' ? 'Google' : 'Microsoft'} works: you choose send-only or send-and-read, and see the exact permissions before agreeing. Simulated: no real account is touched.` : 'Your connected email accounts and what each one lets Q do.' }],
      effects: prov ? (ww, aa) => { (ww.q.ui[`${aa.id}|/settings/email`] ??= {}).consent = `new:${prov}`; } : undefined, nav: { to: '/settings/email', label: 'email settings' } };
  },
});

// =====================================================================================================
// Candidate skills
// =====================================================================================================
const routeJobId = (c: QCtx) => c.route.match(/^\/c\/jobs\/([\w-]+)/)?.[1];
/** J11 step 1: answers from the role briefing, quoting the time. */
registerSkill({
  id: 'contact.briefing', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0; const jid = routeJobId(c) ?? (orgIn(c.norm) === 'org_kora' && /\bbriefing\b/.test(c.norm) ? 'j_kora_backend' : undefined);
    if (!jid || !answerFromBriefing(jid, '')) return 0;
    if (/\b(contact|message|email|write to|get in touch|reach)\b/.test(c.norm)) return 0;
    if (/\bbriefing|video\b/.test(c.norm)) return 0.9;
    return answerFromBriefing(jid, c.norm)?.line && /\?|\b(is|are|do|does|who|how|what|when|will|would)\b/.test(c.norm) ? 0.9 : 0;
  },
  handle: (c) => {
    const jid = routeJobId(c) ?? 'j_kora_backend'; const r = answerFromBriefing(jid, c.norm)!;
    if (!r.line) return { msgs: [{ kind: 'reply', text: `The briefing (${mmss(r.b.duration)}) doesn’t cover that, and I won’t guess. You can ask ${orgOf(c.w, 'org_kora')?.name} directly.`, actions: [{ label: 'Ask Kora Pay', primary: true, act: { t: 'say', text: 'can I contact someone about this role?' } }] }] };
    const l = r.line;
    return { msgs: [{ kind: 'reply', text: `From the role briefing at ${mmss(l.t)}, ${l.who} says: “${l.text}”${/on.?call/.test(c.norm) ? ' So yes, it’s real, and it’s paid.' : ''}`, used: [`Role briefing transcript (${r.b.transcriptSource.toLowerCase()})`],
      actions: [{ label: `Play from ${mmss(l.t)}`, primary: true, act: { t: 'do', op: 'contact.seek', args: { t: l.t } } }, { label: 'Ask Kora Pay a follow-up', act: { t: 'say', text: 'can I contact someone about this role?' } }] }] };
  },
});

/** J11 step 2: "can I contact someone about this role?" Policy first, then a short, editable question. */
function contactFlow(c: QCtx, about?: string): QReply {
  const w = c.w; const a = c.actor; const pid = a.personId!;
  const org = orgIn(c.norm);
  const job = w.jobs.find((j) => j.id === routeJobId(c)) ?? (org ? (w.applications.filter((x) => x.personId === pid).map((x) => w.jobs.find((j) => j.id === x.jobId)).find((j) => j?.orgId === org) ?? w.jobs.find((j) => j.orgId === org && j.status === 'OPEN')) : undefined);
  if (!job) return { msgs: [{ kind: 'question', text: 'Which role is it about? Open the job, or tell me the employer.' }] };
  const name = orgOf(w, job.orgId)?.name ?? 'The employer';
  const st = contactState(w, pid, job); const p = st.policy;
  const onPage = routeJobId(c) === job.id;
  if (!st.allowed) {
    return { msgs: [{ kind: 'refusal', text: `${st.why} ${!p || p.candidateInitiated === 'OFF' ? `${name}’s published route: ${st.route}. I won’t look up or guess anyone’s address.` : p.candidateInitiated === 'AFTER_APPLYING' && !st.applied ? `Once you apply, you can ask in Talent Q.` : ''}`.trim(),
      used: [`${name}’s contact policy`], actions: [...(!st.applied && job.status === 'OPEN' ? [{ label: 'Apply for this role', act: { t: 'do' as const, op: 'tb.apply.start', args: { jobId: job.id } } }] : []), ...(onPage ? [] : [{ label: 'Open the job', act: { t: 'nav' as const, to: `/c/jobs/${job.id}` } }])] }] };
  }
  if (st.thread && st.thread.messages.some((m) => m.from !== pid)) return { msgs: [{ kind: 'reply', text: `You already have a conversation with ${name}; reply there and it reaches the same people.`, actions: [{ label: 'Open the conversation', primary: true, act: { t: 'nav', to: '/c/messages' } }] }] };
  const body = draftQuestion(w, a, job, about);
  const how = st.channels.map((ch) => (ch === 'EMAIL' ? `by email to ${st.address}` : 'in Talent Q')).join(' or ');
  return {
    msgs: [{ kind: 'approval', text: `Yes. ${name} welcomes questions ${p!.candidateInitiated === 'BEFORE_APPLYING' ? 'before you apply' : 'from applicants'}, ${how}, up to ${p!.perCandidateWeek} new conversations a week (${st.left} left for you). Recruiters’ personal addresses aren’t shared. Here’s a short question you can edit:\n\n“${body}”\n\nSend it in Talent Q?`,
      used: [`${name}’s contact policy`, ...(answerFromBriefing(job.id, 'on-call')?.line ? ['Role briefing at 1:12'] : [])], why: 'Nothing is sent without your yes. You can change every word on the job page.',
      actions: [{ label: 'Send it', primary: true, act: { t: 'do', op: 'contact.send', args: { jobId: job.id, body, channel: 'IN_APP' } } }, ...(st.channels.includes('EMAIL') ? [{ label: 'Send by email instead', act: { t: 'say' as const, text: 'send it by email instead' } }] : []), ...(onPage ? [] : [{ label: 'Edit it on the job page', act: { t: 'nav' as const, to: `/c/jobs/${job.id}` } }])] }],
    effects: (ww) => { mail(ww).contactDrafts[pid] = { jobId: job.id, orgId: job.orgId, body, channel: 'IN_APP', at: now() }; },
    frame: frame('contact.ask', { jobId: job.id }, 'send'),
  };
}
registerSkill({
  id: 'contact.ask', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    const ask = /\b(contact|message|write to|email|e-mail|get in touch with|reach|talk to|speak to|ask)\b/.test(c.norm) && /\b(someone|anyone|recruiter|hiring (manager|team)|employer|them|kora|medlink|rivers|harbour|tinda|company|team)\b/.test(c.norm);
    if (!ask) return 0;
    if (/(follow ?up|chase|withdraw|apply|share|stop|forget)/.test(c.norm)) return 0;
    if (c.w.threads.some((t) => t.personId === c.actor.personId && t.messages.some((m) => m.status === 'SENT_SIMULATED')) && /\b(reply|respond)\b/.test(c.norm)) return 0;
    return routeJobId(c) || orgIn(c.norm) || /\bthis (role|job)\b/.test(c.norm) ? 0.9 : 0;
  },
  handle: (c) => contactFlow(c, c.text.match(/\b(?:ask(?:ing)? (?:them |kora |if |whether |about )?|about)\s*(.{8,})$/i)?.[1]),
  answer: (c) => {
    if (c.frame?.awaiting !== 'send') return null;
    const pid = c.actor.personId!; const d = mail(c.w).contactDrafts[pid]; const jobId = c.frame.slots.jobId;
    if (!d || d.jobId !== jobId) return null;
    if (c.ents.no || /\b(do not|don't) send|keep it|not now\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: 'Okay, not sent. The draft stays on the job page if you change your mind.' }], frame: null };
    const email = /\b(by )?e-?mail\b/.test(c.norm);
    if (/\b(send|yes|go ahead|ok|okay|sure)\b/.test(c.norm) || c.ents.yes || email) return { msgs: [], effects: (w, a) => (OPS_RUN('contact.send'))(w, { jobId, body: d.body, channel: email ? 'EMAIL' : d.channel }, a), frame: null };
    if (/\b(change|make|ask about|instead|shorter|reword)\b/.test(c.norm)) { const about = c.text.replace(/^.*?\b(ask about|about|instead ask|change it to)\b\s*/i, ''); return contactFlow({ ...c, route: `/c/jobs/${jobId}` }, about); }
    return null;
  },
});

/** J11 step 12 (candidate side): "reply by email: Thursday 14:00 works". */
registerSkill({
  id: 'contact.emailReply', side: 'candidate',
  match: (c) => (cand(c) && /\b(reply|answer|respond|write back)\b.*\b(by|via|over) e-?mail\b|\be-?mail (them|kora|ada|back)\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const w = c.w; const pid = c.actor.personId!;
    const t = w.threads.filter((x) => x.personId === pid && x.messages.some((m) => m.from !== pid && m.channel === 'EMAIL' && m.status === 'SENT_SIMULATED')).sort((x, y) => (y.messages[y.messages.length - 1]?.at ?? '').localeCompare(x.messages[x.messages.length - 1]?.at ?? ''))[0];
    if (!t) return { msgs: [{ kind: 'reply', text: 'No employer has emailed you through Talent Q yet, so there’s nothing to reply to by email.' }] };
    const said = c.text.match(/(?:saying|that|:)\s*["“]?(.{3,}?)["”]?$/i)?.[1];
    if (!said) return { msgs: [{ kind: 'question', text: `What would you like to say to ${orgOf(w, t.orgId)?.name}?` }] };
    const body = `${said.charAt(0).toUpperCase()}${said.slice(1)}\n\n${c.actor.first}`;
    const subject = /thursday|friday|monday|tuesday|wednesday/i.test(said) ? `${said.match(/thursday|friday|monday|tuesday|wednesday/i)![0].replace(/^\w/, (x) => x.toUpperCase())} works for me` : 'Re: interview';
    return { msgs: [{ kind: 'approval', text: `Send this by email from your Gmail to ${orgOf(w, t.orgId)?.name}? Subject “${subject}”.\n\n“${said}”`, why: 'Nothing is sent without your yes.', actions: [{ label: 'Send by email', primary: true, act: { t: 'do', op: 'contact.emailReply', args: { threadId: t.id, body, subject } } }, { label: 'Reply in Talent Q instead', act: { t: 'do', op: 'hire-c.c.send', args: { orgId: t.orgId, threadId: t.id, kind: 'REPLY', body: said } } }] }] };
  },
});

// Untrusted content: email text is data, never instructions. Exposed for the reply card.
export { looksLikeInstruction, contentHash, personOf, actorOf, CAN_SEND, KIND_LABEL, finalizeSend };
