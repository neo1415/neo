// HIRE-D ops: every page button and every Q skill goes through these, so clicking and asking do the same thing.
import { emit, now, personOf, simNow, uid, type World } from '../../mock/world';
import { appendQ, pushUndo, registerOp } from '../../q/core/engine';
import type { Actor } from '../../state/domain';
import { hd, hdw, keyOf, type Format, type HiringOutcome, type Offer } from '../../state/areas/hire-d';
import { busyAt, CAN_MOVE, CAN_SEND, createDraft, entryFor, findMsg, firstOf, LAGOS, mandateTitle, nameOf, setStage, tDay, tTime } from '../hire-c/lib';
import { hcw } from '../../state/areas/hire-c';
import { allowedChannels, approversFor, bandOf, can, CH_WORD, curV, FORMAT_BODY, FORMAT_WORD, mandateOrg, money, offerOf, reminderQueue, reminderText, sharedPay, simSend, SOURCES, scopeOn, sourcesFor, type SourceId } from './model';

const scope = (a: Actor) => `ORG:${a.orgId}`;
const say = (w: World, a: Actor, text: string, extra: Record<string, unknown> = {}) => appendQ(w, a.id, { who: 'q', kind: 'reply', engine: 'rules', text, ...extra });
const ADMINISH = ['OWNER', 'ADMIN', 'RECRUITER'] as const;
type OpImpl = (w: World, args: Record<string, unknown>, a: Actor) => void | { say?: string; nav?: { to: string; label: string } };
const OPS: Record<string, OpImpl> = {};
const op = (name: string, fn: OpImpl) => { OPS[name] = fn; registerOp(name, fn); };
/** Run a hire-d op inside a Q skill's effects (same code as the button); its "say" becomes Q's reply. */
export function runHd(name: string, w: World, args: Record<string, unknown>, a: Actor) {
  const r = OPS[name]?.(w, args, a);
  if (r && typeof r === 'object' && r.say) say(w, a, r.say);
  return r || undefined;
}

// ---------------- SC-033 scope ----------------
op('hd.scope.set', (w, args, a) => {
  if (!a.orgId) return;
  if (!can(a, [...ADMINISH])) return { say: 'Only an owner, admin or recruiter can change where Q searches. You can still see the sources.' };
  const s = String(args.source) as SourceId; const on = !!args.on;
  const cur = scopeOn(w, a.orgId); const next = on ? [...new Set([...cur, s])] : cur.filter((x) => x !== s);
  if (!next.some((x) => x !== 'evidence')) return { say: 'Q needs at least one source of people to search. Switch another one on first.' };
  hdw(w).scope[a.orgId] = { on: next, by: a.id, at: now() };
  pushUndo(w, a.id, `${on ? 'Included' : 'Left out'} ${SOURCES.find((x) => x.id === s)?.label.toLowerCase()}`, 'hd.scope.set', { source: s, on: !on });
  emit(w, a.id, 'search.scope.changed', scope(a), `${a.name} ${on ? 'included' : 'left out'} “${SOURCES.find((x) => x.id === s)?.label}” in searches.`);
  return { say: `${on ? 'Included' : 'Left out'}: ${SOURCES.find((x) => x.id === s)?.label.toLowerCase()}. Searches use ${next.length} of ${sourcesFor(w, a.orgId).length} sources now. Say “undo” to change it back.` };
});
op('hd.scope.recheck', (w, _args, a) => {
  if (!a.orgId) return;
  if (hd(w).sourceDown) return { say: 'The evidence-link check still isn’t answering. Results keep the last good check, labelled with its date; nothing is guessed.' };
  hdw(w).checkedAt[`evidence:${a.orgId}`] = simNow(w).toISOString();
  return { say: 'Checked the evidence links again just now (simulated). Live sources are always checked when a result is shown.' };
});
op('hd.scope.down', (w, args) => { hdw(w).sourceDown = !!args.on; });

// ---------------- SC-034 explore ----------------
op('hd.explore.save', (w, args, a) => {
  if (!a.orgId) return;
  if (!can(a, ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'])) return { say: 'Your role can explore but not save searches.' };
  const q = String(args.query ?? '').trim(); if (!q) return;
  if (hd(w).saved.some((s) => s.orgId === a.orgId && s.query === q)) return { say: `“${q}” is already saved.` };
  hdw(w).saved.unshift({ id: uid('sd'), orgId: a.orgId, label: String(args.label ?? q), query: q, by: a.id, at: now(), seen: (args.seen as string[] | undefined) ?? [] });
  emit(w, a.id, 'search.saved', scope(a), `${a.name} saved the search “${q}”.`);
  return { say: `Saved “${q}”. I’ll show who’s new each time you open Explore. Nobody is contacted.` };
});
op('hd.explore.seen', (w, args) => { const s = hdw(w).saved.find((x) => x.id === args.id); if (s) s.seen = [...new Set([...s.seen, ...((args.pids as string[]) ?? [])])]; });
op('hd.explore.unsave', (w, args, a) => { const i = hdw(w).saved.findIndex((x) => x.id === args.id && x.orgId === a.orgId); if (i >= 0) { const [s] = hdw(w).saved.splice(i, 1); return { say: `Removed the saved search “${s.label}”.` }; } });

// ---------------- SC-053 booking ----------------
op('hd.book.format', (w, args) => { hdw(w).formats[String(args.personId)] = args.format as Format; });
op('hd.book', (w, args, a) => {
  const pid = String(args.personId); const f = firstOf(w, pid);
  if (!a.orgId || !can(a, CAN_MOVE)) return { say: 'Your role can see times but not hold them.' };
  const start = String(args.start), end = String(args.end); const panel = (args.panel as string[]) ?? [];
  const format = (args.format as Format) ?? hd(w).formats[pid] ?? 'VIDEO';
  const clash = [...panel, pid].find((id) => busyAt(w, id, start, end));
  if (clash) return { say: `That time was just taken: ${firstOf(w, clash)} is busy then. I haven’t held anything. Pick another time.` };
  const mid = entryFor(w, pid, a.orgId)?.mandateId;
  const holdId = uid('hold');
  w.calendar.push({ id: holdId, orgId: a.orgId, title: `Hold: interview with ${nameOf(w, pid)}`, start, end, attendees: [...panel], status: 'HOLD', personId: pid, mandateId: mid, simulated: true });
  const msgId = uid('msg');
  createDraft(w, a, { id: msgId, personId: pid, kind: 'INVITE', slot: { start, end }, panel, eventId: holdId, mandateId: mid });
  if (format !== 'VIDEO') {
    const f0 = findMsg(w, msgId); const d = hcw(w).drafts[msgId];
    if (f0 && d) { const fix = (s: string) => s.replace(/45-minute video (interview|chat)/, `45-minute ${FORMAT_BODY[format]}`); f0.m.body = fix(f0.m.body); d.versions[0].body = fix(d.versions[0].body); }
  }
  hdw(w).bookings.push({ id: uid('bk'), orgId: a.orgId, personId: pid, mandateId: mid, format, slot: { start, end }, panel, holdId, msgId, by: a.id, at: now() });
  emit(w, a.id, 'calendar.hold', scope(a), `${a.name} held ${tDay(start, LAGOS)} ${tTime(start, LAGOS)} for ${nameOf(w, pid)}’s interview (${FORMAT_WORD[format].toLowerCase()}, simulated).`, { personId: pid });
  say(w, a, `Held ${tDay(start, LAGOS)} ${tTime(start, LAGOS)} Lagos for the panel (simulated) and drafted the invitation to ${f}. Nothing has gone to ${f}: the hold blocks your team’s time only, and the invitation waits for approval.`, { actions: [{ label: 'Check the invitation', primary: true, act: { t: 'do', op: 'hire-c.check', args: { msgId } } }, { label: 'Open the draft', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId } } }] });
});

// ---------------- SC-056 stage ----------------
op('hd.note.add', (w, args, a) => {
  if (!can(a, CAN_MOVE)) return { say: 'Your role can read notes but not add them.' };
  const k = keyOf(String(args.mandateId), String(args.personId)); const text = String(args.text ?? '').trim(); if (!text) return;
  if (/\b(age|old|young|married|pregnan\w*|religio\w*|tribe|state of origin|accent)\b/i.test(text)) return { say: 'I can’t record that: notes must be about the work. Describe what you saw in the work instead.' };
  (hdw(w).notes[k] ??= []).push({ id: uid('sn'), text, by: a.id, at: now() });
  emit(w, a.id, 'stage.note', scope(a), `${a.name} added an internal note on ${nameOf(w, String(args.personId))}.`, { personId: args.personId });
  return { say: `Noted on ${firstOf(w, String(args.personId))}’s record. Internal only; never sent to them.` };
});
op('hd.due.set', (w, args, a) => {
  if (!can(a, CAN_MOVE)) return { say: 'Your role can’t set due dates.' };
  const k = keyOf(String(args.mandateId), String(args.personId));
  hdw(w).due[k] = { date: String(args.date), what: String(args.what || 'Next step'), by: a.id, at: now() };
  emit(w, a.id, 'stage.due', scope(a), `${a.name} set a due date (${String(args.date)}) for ${nameOf(w, String(args.personId))}.`, { personId: args.personId });
  return { say: `Due ${tDay(`${String(args.date)}T12:00:00Z`, LAGOS)}: ${String(args.what || 'next step')}.` };
});

// ---------------- SC-058 offers ----------------
const offerById = (w: World, id: string) => hdw(w).offers.find((o) => o.id === id);
op('hd.offer.draft', (w, args, a) => {
  const mid = String(args.mandateId), pid = String(args.personId); const f = firstOf(w, pid);
  if (!a.orgId || mandateOrg(w, mid) !== a.orgId) return { say: 'That role belongs to another organisation.' };
  if (!can(a, ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'])) return { say: 'Your role can’t start an offer.' };
  if (offerOf(w, mid, pid)) return { nav: { to: `/r/offer/${mid}/${pid}`, label: 'the offer' } };
  const band = bandOf(w, mid); const pay = sharedPay(w, pid, a.orgId);
  // Q's starting point uses only what the candidate shared, inside the approved band. Unknown stays empty.
  const amount = pay && band ? Math.min(Math.max(pay.min, band.min), band.max) : null;
  const o: Offer = { id: uid('of'), orgId: a.orgId, personId: pid, mandateId: mid, state: 'DRAFT', currency: 'NGN', amount, start: null, requestedBy: a.id,
    terms: `${mandateTitle(w, mid)} at ${w.orgs.find((x) => x.id === a.orgId)?.name}. Monthly salary as below, within the approved band. Start date to agree with ${f}. Subject to references.`,
    versions: [{ v: 1, at: now(), by: 'Q', amount, start: null, note: pay ? `Q’s draft: starts from what ${f} shared (from ${money(pay.min)}), inside the band` : `Q’s draft: ${f} hasn’t shared pay, so the amount is left for you` }],
    approvals: approversFor(w, a.orgId, mid).map((x) => ({ ...x })) };
  hdw(w).offers.push(o);
  emit(w, a.id, 'offer.drafted', scope(a), `${a.name} asked Q to draft an offer for ${nameOf(w, pid)} (not sent).`, { personId: pid });
  return { say: `I drafted an offer summary for ${f}. It’s for your team to decide: it needs ${o.approvals.map((x) => firstOf(w, x.who)).join(' and ')} to approve, and a person sends it. I never send offers.`, nav: { to: `/r/offer/${mid}/${pid}`, label: 'the offer' } };
});
op('hd.offer.edit', (w, args, a) => {
  const o = offerById(w, String(args.id)); if (!o) return;
  if (!can(a, ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'])) return { say: 'Your role can’t change the offer.' };
  if (['HANDED_OFF', 'ACCEPTED', 'DECLINED'].includes(o.state) && !args.revise) return { say: 'This offer has already been handed off. Record a revised offer instead.' };
  const amount = args.amount === null || args.amount === '' || args.amount === undefined ? null : Number(args.amount);
  const start = args.start ? String(args.start) : null;
  const prev = curV(o);
  if (prev.amount === amount && prev.start === start) return;
  o.amount = amount; o.start = start;
  o.versions.push({ v: prev.v + 1, at: now(), by: a.id, amount, start, note: String(args.note ?? 'Edited') });
  let voided = false;
  for (const x of o.approvals) if (x.at && !x.voided) { x.voided = `v${prev.v + 1} changed the terms`; voided = true; }
  if (o.state === 'APPROVED' || o.state === 'AWAITING_APPROVAL' || o.state === 'NEGOTIATING') o.state = o.state === 'NEGOTIATING' ? 'NEGOTIATING' : 'DRAFT';
  emit(w, a.id, 'offer.revised', scope(a), `${a.name} revised the offer for ${nameOf(w, o.personId)} (v${prev.v + 1}).`, { personId: o.personId });
  return { say: `Saved v${prev.v + 1}.${voided ? ' Earlier approvals were for different terms, so they no longer count: ask again.' : ''}` };
});
op('hd.offer.request', (w, args, a) => {
  const o = offerById(w, String(args.id)); if (!o) return;
  if (o.amount == null) return { say: 'Set an amount first. I won’t ask anyone to approve an offer without one.' };
  const band = bandOf(w, o.mandateId);
  if (band && (o.amount < band.min || o.amount > band.max)) return { say: `${money(o.amount)} is outside the approved band (${band.label}). Change it, or ask HR to change the band first.` };
  o.state = 'AWAITING_APPROVAL';
  emit(w, a.id, 'offer.approval.requested', scope(a), `${a.name} asked ${o.approvals.map((x) => nameOf(w, x.who)).join(' and ')} to approve v${curV(o).v} of the offer for ${nameOf(w, o.personId)}.`, { personId: o.personId });
  return { say: `Asked ${o.approvals.map((x) => firstOf(w, x.who)).join(' and ')} to approve v${curV(o).v}. Nothing goes to ${firstOf(w, o.personId)}.` };
});
op('hd.offer.approve', (w, args, a) => {
  const o = offerById(w, String(args.id)); if (!o) return;
  const mine = o.approvals.filter((x) => x.who === a.id);
  if (!mine.length) return { say: `You’re not one of the approvers for this offer. ${o.approvals.map((x) => `${nameOf(w, x.who)} (${x.role === 'HR' ? 'HR' : 'hiring manager'})`).join(' and ')} approve it.` };
  if (o.state !== 'AWAITING_APPROVAL') return { say: 'This offer isn’t waiting for approval right now.' };
  for (const x of mine) { x.at = now(); x.v = curV(o).v; x.voided = undefined; }
  if (o.approvals.every((x) => x.at && !x.voided && x.v === curV(o).v)) o.state = 'APPROVED';
  emit(w, a.id, 'offer.approved', scope(a), `${a.name} approved v${curV(o).v} of the offer for ${nameOf(w, o.personId)}.`, { personId: o.personId });
  return { say: o.state === 'APPROVED' ? `Approved. Both approvals are in for v${curV(o).v}. A person now hands it to ${firstOf(w, o.personId)}; I don’t send offers.` : `Approved. Still waiting for ${o.approvals.filter((x) => !x.at || x.voided).map((x) => firstOf(w, x.who)).join(' and ')}.` };
});
op('hd.offer.handoff', (w, args, a) => {
  const o = offerById(w, String(args.id)); if (!o) return;
  if (o.state !== 'APPROVED') return { say: 'It needs every approval for the current version before it can be handed off.' };
  if (!can(a, CAN_SEND)) return { say: 'Only an admin or recruiter records that an offer went out.' };
  o.state = 'HANDED_OFF'; o.handoff = { by: a.id, at: now(), how: String(args.how ?? 'Sent by a person from Kora’s offer letter process') };
  const prev = setStage(w, a, o.mandateId, o.personId, 'OFFER');
  if (prev) pushUndo(w, a.id, `Moved ${firstOf(w, o.personId)} to Offer`, 'hire-c.stage', { mandateId: o.mandateId, personId: o.personId, stage: prev.stage, note: prev.note ?? '' });
  emit(w, a.id, 'offer.handed_off', scope(a), `${a.name} recorded that the offer for ${nameOf(w, o.personId)} was handed off (outside Talent Q).`, { personId: o.personId });
  return { say: `Recorded: ${a.first} handed the offer to ${firstOf(w, o.personId)} (outside Talent Q; nothing was sent from here). ${firstOf(w, o.personId)} is now at Offer in the pipeline.` };
});
op('hd.offer.counter', (w, args, a) => {
  const o = offerById(w, String(args.id)); if (!o) return;
  const amt = args.amount ? Number(args.amount) : null;
  o.counter = { amount: amt, text: String(args.text ?? ''), at: now(), by: a.id }; o.state = 'NEGOTIATING';
  emit(w, a.id, 'offer.counter', scope(a), `${a.name} recorded ${nameOf(w, o.personId)}’s response to the offer.`, { personId: o.personId });
  const band = bandOf(w, o.mandateId);
  return { say: `Recorded ${firstOf(w, o.personId)}’s answer.${amt != null && band ? amt > band.max ? ` ${money(amt)} is above the band (${band.label}); HR decides whether to change it.` : ` ${money(amt)} is inside the band. A revised offer needs approving again.` : ''}` };
});
op('hd.offer.answer', (w, args, a) => {
  const o = offerById(w, String(args.id)); if (!o) return;
  if (!['HANDED_OFF', 'NEGOTIATING'].includes(o.state)) return { say: 'Record an answer once the offer has been handed off.' };
  const what = args.what === 'DECLINED' ? 'DECLINED' : 'ACCEPTED';
  o.state = what; o.answer = { what, at: now(), by: a.id, note: String(args.note ?? '') };
  if (what === 'ACCEPTED') {
    setStage(w, a, o.mandateId, o.personId, 'HIRED');
    const rec: HiringOutcome = { id: uid('ho'), orgId: o.orgId, personId: o.personId, name: personOf(w, o.personId)?.name ?? o.personId, roleTitle: mandateTitle(w, o.mandateId), mandateId: o.mandateId, offerId: o.id,
      milestones: [{ kind: 'OFFER_ACCEPTED', at: now().slice(0, 10), verifiedBy: a.id, note: String(args.note || 'Acceptance received by a person') }, { kind: 'STARTED', due: o.start ?? undefined }, { kind: 'CHECKIN_30' }, { kind: 'CHECKIN_90' }],
      consent: { state: 'NOT_ASKED', scope: 'Status milestones only (offer, start, 30 and 90 days)' }, longTerm: 'Not held. Longer-term outcomes need their own legal basis and a separate consent.' };
    hdw(w).outcomes.push(rec);
  }
  emit(w, a.id, `offer.${what.toLowerCase()}`, scope(a), `${a.name} recorded that ${nameOf(w, o.personId)} ${what === 'ACCEPTED' ? 'accepted' : 'declined'} the offer.`, { personId: o.personId });
  return { say: what === 'ACCEPTED' ? `Recorded: ${firstOf(w, o.personId)} accepted. I started a placement record with that milestone, verified by you. Later milestones stay empty until a person checks them, and nothing is used beyond status unless ${firstOf(w, o.personId)} agrees.` : `Recorded: ${firstOf(w, o.personId)} declined. That stays on the offer record only.` };
});

// ---------------- SC-060 outcomes ----------------
const outcomeById = (w: World, id: string) => hdw(w).outcomes.find((o) => o.id === id);
op('hd.outcome.verify', (w, args, a) => {
  const o = outcomeById(w, String(args.id)); if (!o || o.orgId !== a.orgId) return;
  if (!can(a, ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'])) return { say: 'Your role can read placement records but not verify milestones.' };
  const m = o.milestones.find((x) => x.kind === args.kind); if (!m) return;
  m.at = String(args.date || simNow(w).toISOString().slice(0, 10)); m.verifiedBy = a.id; m.note = String(args.note ?? '');
  emit(w, a.id, 'outcome.verified', scope(a), `${a.name} verified a placement milestone for ${o.name}.`, { personId: o.personId });
  return { say: `Verified by you. The record says who checked it and when.` };
});
op('hd.outcome.ask', (w, _args, a) => {
  const o = outcomeById(w, String(_args.id)); if (!o || !o.personId) return;
  if (!can(a, CAN_SEND)) return { say: 'Only an admin or recruiter can send the consent request.' };
  simSend(w, a, { orgId: o.orgId, personId: o.personId, mandateId: o.mandateId, channel: 'IN_APP', subject: 'May we keep your placement milestones?', body: `Hi ${o.name.split(' ')[0]}, congratulations again. With your permission, ${w.orgs.find((x) => x.id === o.orgId)?.name} would keep a short record of your start date and your 30 and 90-day check-ins, to learn how well our hiring works. It’s never used to score you, and you can say no or change your mind later.` });
  o.consent = { ...o.consent, state: 'ASKED', at: now() };
  return { say: `Sent the consent request to ${o.name.split(' ')[0]} in Talent Q (simulated, approved by you). Until they answer, only the milestone you verified is kept.` };
});
op('hd.outcome.answer', (w, args) => { const o = outcomeById(w, String(args.id)); if (o) o.consent = { ...o.consent, state: args.state === 'DECLINED' ? 'DECLINED' : 'GIVEN', at: now() }; });

// ---------------- SC-159 reminders ----------------
op('hd.rem.approve', (w, args, a) => {
  if (!a.orgId) return;
  if (!can(a, CAN_SEND)) return { say: 'Only an admin or recruiter approves reminders. I’ve left it in the queue.' };
  const it = reminderQueue(w, a.orgId).find((x) => x.id === args.id); if (!it) return { say: 'That reminder isn’t due any more: the interview or promise changed.' };
  if (it.blocked) return { say: `I can’t queue that one. ${it.blocked}` };
  const ch = (args.channel as typeof it.channel) ?? it.channel; if (!ch || !it.channels.includes(ch)) return { say: `${firstOf(w, it.personId)} doesn’t accept ${ch ? CH_WORD[ch] : 'that channel'}.` };
  hdw(w).reminders.push({ id: it.id, orgId: a.orgId, personId: it.personId, kind: it.kind, subject: it.subject, state: 'SCHEDULED', sendAt: it.sendAt, channel: ch, approvedBy: a.id, at: now() });
  emit(w, a.id, 'reminder.scheduled', scope(a), `${a.name} approved a reminder to ${nameOf(w, it.personId)} for ${tDay(it.sendAt, LAGOS)} ${tTime(it.sendAt, LAGOS)} (simulated).`, { personId: it.personId });
  return { say: `Approved. It goes ${tDay(it.sendAt, LAGOS)} at ${tTime(it.sendAt, LAGOS)} Lagos by ${CH_WORD[ch]} (simulated). Nothing goes before then, and I re-check the calendar and ${firstOf(w, it.personId)}’s choices first.` };
});
op('hd.rem.cancel', (w, args, a) => {
  const r = hdw(w).reminders.find((x) => x.id === args.id && x.orgId === a.orgId); if (!r || r.state !== 'SCHEDULED') return;
  r.state = 'CANCELLED'; r.reason = `Cancelled by ${a.first}`;
  return { say: 'Cancelled. Nothing was sent.' };
});
op('hd.rem.send', (w, args, a) => {
  if (!a.orgId) return;
  const r = hdw(w).reminders.find((x) => x.id === args.id && x.orgId === a.orgId); if (!r || r.state !== 'SCHEDULED') return;
  // Re-read authoritative state at send time: the interview, the candidate's choices, suppression.
  const it = reminderQueue(w, a.orgId).find((x) => x.id === r.id);
  const why = !it ? 'the interview or promise behind it changed' : it.blocked ? it.blocked : !allowedChannels(w, r.personId).includes(r.channel) ? `${firstOf(w, r.personId)} no longer accepts ${CH_WORD[r.channel]}` : '';
  if (why) { r.state = 'CANCELLED'; r.reason = why.replace(/\.$/, ''); emit(w, a.id, 'reminder.cancelled', scope(a), `A reminder to ${nameOf(w, r.personId)} was stopped before sending: ${r.reason}.`, { personId: r.personId }); return { say: `I didn’t send it: ${r.reason}. Nothing went.` }; }
  const t = reminderText(w, it!, a.orgId);
  const m = simSend(w, a, { orgId: a.orgId, personId: r.personId, mandateId: it!.mandateId, channel: r.channel, subject: t.subject, body: t.body });
  r.state = 'SENT'; r.msgId = m.id;
  return { say: `Sent (simulated) by ${CH_WORD[r.channel]}. The provider has accepted it; that isn’t the same as delivered or read.`, };
});

// ---------------- MO-046 receipts (simulated provider and candidate events, labelled as testing) ----------------
op('hd.receipt', (w, args) => {
  const id = String(args.msgId); const f0 = findMsg(w, id); if (!f0) return;
  const r = (hdw(w).receipts[id] ??= {});
  if (args.what === 'delivered') { r.deliveredAt = now(); if (f0.m.delivery === 'ACCEPTED' || !f0.m.delivery) f0.m.delivery = 'DELIVERED'; }
  if (args.what === 'read' && f0.m.channel === 'IN_APP') { r.deliveredAt ??= now(); r.readAt = now(); if (f0.m.delivery !== 'DELIVERED') f0.m.delivery = 'DELIVERED'; }
});

// ---------------- Candidate side: reminder choices (their own) ----------------
op('hd.optout', (w, args, a) => {
  if (!a.personId) return;
  if (args.on) hdw(w).optOut[a.personId] = { at: simNow(w).toISOString() }; else delete hdw(w).optOut[a.personId];
  emit(w, a.id, 'reminders.choice', `PERSON:${a.personId}`, `${a.name} turned interview reminders ${args.on ? 'off' : 'on'}.`);
  return { say: args.on ? 'Interview reminders are off. Employers can still write to you; they just won’t send reminders.' : 'Interview reminders are on again.' };
});
op('hd.notify', (w, args, a) => {
  if (!a.personId) return; const c = w.consents[a.personId]; if (!c) return;
  const k = String(args.channel) as 'email' | 'sms' | 'inApp'; c.notifications[k] = !!args.on;
  emit(w, a.id, 'notifications.changed', `PERSON:${a.personId}`, `${a.name} turned ${k === 'inApp' ? 'Talent Q' : k} notices ${args.on ? 'on' : 'off'}.`);
});
