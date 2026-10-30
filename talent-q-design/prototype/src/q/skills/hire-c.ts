// R3 skills (area hire-c): drafting correspondence for every recruiter journey (draft → edit with a version
// diff → checks → explicit approval → simulated send), finding times across time zones, holds, panels,
// the pipeline (move with undo, reject with a reason), team roles, org guidelines, and the candidate side
// (confirm, reschedule, reply). Everything is reachable by typing; pages show and refine the same state.
import { actorOf, emit, getWorld, now, orgOf, personOf, uid, update, type World } from '../../mock/world';
import type { Actor, OrgRole, QFrame, QMsg, Stage } from '../../state/domain';
import { STAGE_LABEL } from '../../state/domain';
import { appendQ, pushUndo, registerOp, registerSkill } from '../core/engine';
import { anyOf, entities, normalise } from '../core/nlu';
import { protectedCriterion } from '../core/policy';
import type { QCtx, QReply } from '../core/types';
import { hc, hcw, type DraftKind, type Guide, type Tone } from '../../state/areas/hire-c';
import { meansColleague } from '../../journeys/evidence/recruiter/model';
import {
  approveAndSend, busyAt, CAN_MOVE, CAN_SEND, changePanel, checkDraft, city, colleaguesIn, createDraft, currentDraft, dateIn, defaultPanel, entryFor, findMsg, findSlots, firstOf,
  flushQueued, guide, guideChip, problemOf, guidesOf, IS_ADMIN, KIND_LABEL, LAGOS, latestV, listNames, mandateTitle, nameOf, nextWeek, orgMembers, parseTime, partOf, payBand, resolveDays,
  reviseDraft, ROLE_CAN, ROLE_LABEL, setStage, STAGE_WORDS, syncOrgGuidelines, tDay, tTime, tzNote, tzOf,
} from '../../journeys/hire-c/lib';

const scope = (a: Actor) => (a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId}`);
const post = (w: World, a: Actor, m: Omit<QMsg, 'id' | 'at' | 'who'>) => appendQ(w, a.id, { who: 'q', engine: 'rules', ...m });
const recruiter = (c: QCtx) => c.actor.side === 'recruiter' && !!c.actor.orgId && orgOf(c.w, c.actor.orgId)?.kind === 'EMPLOYER';
const frame = (intent: string, slots: Record<string, string>, awaiting?: string): QFrame => ({ intent, slots, awaiting, startedAt: now() });

// ---------------- Who is "him"? ----------------
/** People named in the turn, including possessives ("zara's", "tobis"). */
export function peopleIn(c: QCtx) {
  const ws = c.norm.replace(/[,.?!]/g, ' ').split(/\s+/).map((x) => x.replace(/'?s$/, '')).filter(Boolean);
  const colleagues = new Set(orgMembers(c.w, c.actor.orgId).map((a) => a.first.toLowerCase()));
  const first = (pid: string) => personOf(c.w, pid)?.name.split(' ')[0].toLowerCase() ?? '';
  // Drop people matched only by a surname that is also a colleague's first name ("Musa" is Kora's engineer, not Halima Musa).
  const out = c.ents.people.filter((pid) => ws.includes(first(pid)) || !personOf(c.w, pid)!.name.toLowerCase().split(' ').slice(1).some((l) => colleagues.has(l)))
    // "with Seyi and Musa" in a panel context means Seyi Balogun (colleague), not Seyi Okoro (candidate).
    .filter((pid) => !meansColleague(c.w, c.norm, pid, c.actor.orgId));
  for (const x of ws) {
    if (colleagues.has(x) || x.length < 3) continue;
    const exact = c.w.people.filter((pp) => first(pp.personId) === x);
    // Short forms people actually type: "Ife" for Ifeoma. Only when exactly one person in the org's pipeline fits.
    const pre = exact.length ? exact : x.length >= 3 ? c.w.people.filter((pp) => first(pp.personId).startsWith(x) && entryFor(c.w, pp.personId, c.actor.orgId)) : [];
    if (pre.length === 1 && !out.includes(pre[0].personId)) out.push(pre[0].personId);
  }
  return out;
}
/** The last person in context: the profile on screen, the last profile visited, or the last person discussed. */
export function contextPerson(c: QCtx): { id?: string; why?: string } {
  const here = c.route.match(/\/people\/(p_\w+)/)?.[1];
  if (here) return { id: here, why: 'the profile you’re looking at' };
  const cands: { id: string; at: string; why: string }[] = [];
  for (const n of c.w.q.nav[c.actor.id] ?? []) { const m = n.path.match(/\/people\/(p_\w+)/); if (m) cands.push({ id: m[1], at: n.at, why: 'the profile you just viewed' }); }
  const th = c.w.q.threads[c.actor.id] ?? [];
  for (const m of th.slice(-14)) {
    const r = m.route?.match(/\/people\/(p_\w+)/); if (r) cands.push({ id: r[1], at: m.at, why: 'the profile you just viewed' });
    if (m.who === 'me') { const ps = entities(normalise(m.text), c.w).people; if (ps.length === 1) cands.push({ id: ps[0], at: m.at, why: 'who we were just talking about' }); }
  }
  const lp = hc(c.w).lastPerson?.[c.actor.id]; if (lp) cands.push({ id: lp.id, at: lp.at, why: 'the profile you just viewed' });
  const best = cands.sort((a, b) => a.at.localeCompare(b.at)).pop();
  return best ? { id: best.id, why: best.why } : {};
}
const PRONOUN = /\b(him|her|them|this (person|candidate)|that (person|candidate)|this one)\b/;

// ---------------- Replies about drafts ----------------
function usedFor(w: World, a: Actor, msgId: string) {
  const d = hc(w).drafts[msgId]; if (!d) return [];
  const f0 = findMsg(w, msgId); const out: string[] = [];
  const band = payBand(w, d.mandateId); const pb = guide(w, d.orgId, 'PAY_BAND');
  if (pb && band && f0?.m.body.includes(band)) out.push(guideChip(pb));
  const panel = guide(w, d.orgId, 'PANEL_TWO'); if (panel && d.panel.length >= 2 && (d.kind === 'INVITE' || d.kind === 'RESCHEDULE')) out.push(guideChip(panel));
  if (d.slot) { const h = guide(w, d.orgId, 'HOURS'); if (h) out.push(guideChip(h)); out.push(`Calendars: ${listNames(d.panel.map((id) => firstOf(w, id)))} (busy times only)`); }
  const p = personOf(w, d.personId)!; out.push(`${p.name.split(' ')[0]}: ${city(p.timezone)} time`);
  void a; return out;
}
export function postDraft(w: World, a: Actor, msgId: string, lead: string) {
  const d = hc(w).drafts[msgId]; if (!d) return;
  const first = firstOf(w, d.personId);
  post(w, a, { kind: 'reply', text: lead, used: usedFor(w, a, msgId), ref: { type: 'hire-c.draft', id: `${msgId}@${latestV(d).v}` },
    why: d.by !== a.id ? `Drafted by ${firstOf(w, d.by)}; nothing is sent until someone who can approve says yes.` : 'Nothing is sent until you approve it.',
    actions: [{ label: 'Send it', primary: true, act: { t: 'say', text: 'send it' } }, { label: 'Make it friendlier', act: { t: 'say', text: 'make it a bit friendlier' } }, { label: 'Open in messages', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId } } }, ...(d.kind === 'INVITE' ? [{ label: `Find other times for ${first}`, act: { t: 'say' as const, text: `find other times for ${first}` } }] : [])] });
  w.q.frames[a.id] = frame('hire-c.draft', { msgId }, 'edit');
}
export function describeSlot(w: World, d: { slot?: { start: string }; panel: string[]; personId: string }) {
  if (!d.slot) return 'no time yet';
  const abroad = [...d.panel, d.personId].filter((id) => tzOf(w, id) !== LAGOS && tzOf(w, id) !== 'Africa/Accra' ? true : tzOf(w, id) === 'Africa/Accra');
  const extra = abroad.map((id) => `${tTime(d.slot!.start, tzOf(w, id))} for ${firstOf(w, id)} in ${city(tzOf(w, id))}`);
  return `${tDay(d.slot.start, LAGOS)}, ${tTime(d.slot.start, LAGOS)} Lagos${extra.length ? ` (${extra.join(', ')})` : ''}`;
}

/** Run the checks and tell the person the outcome, with fixes or an approval request. */
export function checkAndPost(w: World, a: Actor, msgId: string, lead = '') {
  const d = hc(w).drafts[msgId]; if (!d) return;
  const { checks, pass, queuedForApproval } = checkDraft(w, a, msgId);
  const first = firstOf(w, d.personId); const v = latestV(d).v;
  // The checks card lists every guideline it applied, so the context chips stay short (design pass: no chip wall).
  const nG = checks.filter((c) => c.group === 'Guidelines').length;
  const used = [`${orgOf(w, d.orgId)?.name ?? 'Organisation'} guidelines (${nG})`, `${first}’s contact choices`, ...(d.slot ? [`Calendars: ${listNames(d.panel.map((id) => firstOf(w, id)))}`] : [])];
  const ref = { type: 'hire-c.checks', id: `${msgId}@${v}` };
  if (pass) {
    post(w, a, { kind: 'approval', text: `${lead}v${v} of the ${KIND_LABEL[d.kind]} to ${first} passed every check. Approve this exact version and I’ll send it.`, used, ref,
      actions: [{ label: 'Approve and send', primary: true, act: { t: 'do', op: 'hire-c.approve', args: { msgId, v } } }, { label: 'Edit first', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId } } }, { label: 'Not now', act: { t: 'say', text: 'not now' } }] });
    w.q.frames[a.id] = frame('hire-c.draft', { msgId }, 'approval');
  } else if (queuedForApproval) {
    const approvers = orgMembers(w, d.orgId).filter((x) => x.role === 'ADMIN' || x.role === 'OWNER').map((x) => x.first);
    post(w, a, { kind: 'refusal', text: `${lead}You can’t send this one yourself: at ${orgOf(w, d.orgId)?.name}, a ${ROLE_LABEL[a.role ?? 'VIEWER'].toLowerCase()} can draft, but an admin or recruiter approves each send. Everything else checks out, so I’ve put it in the approval queue for ${listNames(approvers)}. Nothing has been sent.`, used, ref,
      why: `Kora’s delegation is “approve each send”, and your role is ${ROLE_LABEL[a.role ?? 'VIEWER'].toLowerCase()}.` });
    emit(w, a.id, 'message.approval.requested', `ORG:${d.orgId}`, `${a.name} asked for approval to send a ${KIND_LABEL[d.kind]} to ${nameOf(w, d.personId)}.`, { msgId });
    w.q.frames[a.id] = null;
  } else {
    const bad = checks.filter((c) => !c.ok);
    post(w, a, { kind: 'reply', text: `${lead}I haven’t sent it. ${bad.length === 1 ? 'One thing needs' : `${bad.length} things need`} sorting first: ${listNames(bad.map((b) => problemOf(w, d.orgId, b, first)))}. ${bad.some((b) => b.fix) ? 'The details and fixes are below.' : 'The details are below.'}`, used, ref,
      actions: [...bad.filter((b) => b.fix).map((b, i) => ({ label: b.fix!.label, primary: i === 0, act: { t: 'do' as const, op: b.fix!.op, args: b.fix!.args } })), { label: 'Open the draft', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId } } }] });
    w.q.frames[a.id] = frame('hire-c.draft', { msgId }, 'fix');
  }
}

// ---------------- Ops (buttons on pages and in Q's replies) ----------------
type OpImpl = (w: World, args: Record<string, unknown>, a: Actor) => void | { say?: string; nav?: { to: string; label: string } };
/** Ops are registered with the engine and kept here so skills can run the same code inside their effects. */
const OPS: Record<string, OpImpl> = {};
const op = (name: string, fn: OpImpl) => { OPS[name] = fn; registerOp(name, fn); };
/** Run an op inside a skill's effects; a plain "say" result becomes Q's reply. */
const runOp = (name: string, w: World, args: Record<string, unknown>, a: Actor) => { const r = OPS[name]?.(w, args, a); if (r && typeof r === 'object' && r.say) post(w, a, { kind: 'reply', text: r.say }); };
op('hire-c.openMsg', (w, args, a) => {
  const msgId = String(args.msgId ?? ''); const f0 = findMsg(w, msgId);
  const side = a.side === 'recruiter' ? '/r/messages' : '/c/messages';
  if (f0) (w.q.ui[`${a.id}|${side}`] ??= {}).sel = f0.t.personId + (a.side === 'candidate' ? `|${f0.t.orgId}` : '');
  return { nav: { to: side, label: 'messages' } };
});
op('hire-c.editBody', (w, args, a) => {
  const d = hc(w).drafts[String(args.msgId)]; if (!d) return;
  if (!['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER')) return { say: 'Your role can read drafts but not edit them.' };
  const prevV = latestV(d).v;
  const v = reviseDraft(w, a, d.msgId, { body: String(args.body), subject: args.subject ? String(args.subject) : undefined, note: 'Edited by hand' });
  if (!v) return;
  pushUndo(w, a.id, `Edited the draft to ${firstOf(w, d.personId)} (v${v.v})`, 'hire-c.restoreVersion', { msgId: d.msgId, v: prevV });
  post(w, a, { kind: 'reply', text: `Saved your edits as v${v.v}. A changed draft needs checking again before it can be approved.`, ref: { type: 'hire-c.diff', id: `${d.msgId}@${v.v}` }, actions: [{ label: 'Check and send', primary: true, act: { t: 'do', op: 'hire-c.check', args: { msgId: d.msgId } } }, { label: 'Undo', act: { t: 'do', op: 'undo' } }] });
});
op('hire-c.check', (w, args, a) => { checkAndPost(w, a, String(args.msgId)); });
op('hire-c.approve', (w, args, a) => {
  const msgId = String(args.msgId); const d = hc(w).drafts[msgId];
  // Re-check calendar and consent at the moment of approval: things change.
  if (d && CAN_SEND.includes(a.role ?? 'VIEWER')) {
    const f0 = findMsg(w, msgId);
    if (f0?.m.status === 'AWAITING_APPROVAL' && d.checkedV === latestV(d).v) {
      const { pass } = checkDraft(w, a, msgId);
      if (!pass) { checkAndPost(w, a, msgId, 'Something changed since the last check. '); return; }
    }
  }
  const r = approveAndSend(w, a, msgId, args.v === undefined ? undefined : Number(args.v));
  post(w, a, { kind: r.ok ? 'notice' : 'refusal', text: r.text, ref: d ? { type: 'hire-c.draft', id: `${msgId}@${latestV(d).v}` } : undefined });
  if (r.ok) w.q.frames[a.id] = null;
});
op('hire-c.fix', (w, args, a) => {
  const msgId = String(args.msgId); const d = hcw(w).drafts[msgId]; if (!d) return { say: 'That draft is gone.' };
  const what = String(args.what);
  if (what === 'band') reviseDraft(w, a, msgId, { addBand: true, note: 'Added the pay band (Kora guideline)' });
  else if (what === 'slot') reviseDraft(w, a, msgId, { slot: { start: String(args.start), end: String(args.end) }, note: `Moved to ${tDay(String(args.start), LAGOS)} ${tTime(String(args.start), LAGOS)} (everyone free)` });
  else if (what === 'panel') { const extra = defaultPanel(w, a, d.mandateId).find((id) => !d.panel.includes(id)) ?? orgMembers(w, d.orgId).find((x) => x.role === 'INTERVIEWER' && !d.panel.includes(x.id))?.id; if (extra) reviseDraft(w, a, msgId, { panel: [...d.panel, extra], note: `Added ${firstOf(w, extra)} to the panel` }); }
  else if (what === 'channel') { const f0 = findMsg(w, msgId); if (f0) f0.m.channel = args.channel as 'EMAIL' | 'IN_APP' | 'SMS'; reviseDraft(w, a, msgId, { note: 'Changed the channel to one the candidate accepts' }); }
  const v = latestV(hc(w).drafts[msgId]);
  post(w, a, { kind: 'reply', text: `Fixed in v${v.v}: ${v.note.toLowerCase()}.`, ref: { type: 'hire-c.diff', id: `${msgId}@${v.v}` } });
  checkAndPost(w, a, msgId);
});
op('hire-c.discard', (w, args, a) => {
  const f0 = findMsg(w, String(args.msgId)); if (!f0) return { say: 'That draft is already gone.' };
  const prev = f0.m.status; f0.m.status = 'DISCARDED';
  pushUndo(w, a.id, `Discarded the draft to ${firstOf(w, f0.t.personId)}`, 'hire-c.restore', { msgId: f0.m.id, status: prev });
  emit(w, a.id, 'message.discarded', scope(a), `${a.name} discarded a draft to ${nameOf(w, f0.t.personId)}.`);
  if (w.q.frames[a.id]?.slots.msgId === f0.m.id) w.q.frames[a.id] = null;
  post(w, a, { kind: 'undo', text: `Discarded the draft to ${firstOf(w, f0.t.personId)}. It was never sent.`, actions: [{ label: 'Undo', primary: true, act: { t: 'do', op: 'undo' } }] });
});
op('hire-c.restore', (w, args) => { const f0 = findMsg(w, String(args.msgId)); if (f0) { f0.m.status = 'DRAFT'; const d = hcw(w).drafts[f0.m.id]; if (d) d.checkedV = undefined; } });
op('hire-c.restoreVersion', (w, args, a) => {
  const d = hc(w).drafts[String(args.msgId)]; const old = d?.versions.find((x) => x.v === Number(args.v)); if (!d || !old) return;
  reviseDraft(w, a, d.msgId, { slot: old.slot, panel: old.panel, body: old.body, subject: old.subject, note: `Back to v${old.v}` });
  const dd = hcw(w).drafts[d.msgId]; if (old.tone) dd.tone = old.tone;
});
op('hire-c.stage', (w, args, a) => { setStage(w, a, String(args.mandateId), String(args.personId), args.stage as Stage, args.note as string | undefined); });
op('hire-c.move', (w, args, a) => {
  if (!CAN_MOVE.includes(a.role ?? 'VIEWER')) return { say: `As ${ROLE_LABEL[a.role ?? 'VIEWER'].toLowerCase()} you can see the pipeline but not move people. An admin can change your role.` };
  const pid = String(args.personId), mid = String(args.mandateId), to = args.stage as Stage;
  const prev = setStage(w, a, mid, pid, to); if (!prev) return;
  pushUndo(w, a.id, `Moved ${firstOf(w, pid)} to ${STAGE_LABEL[to]}`, 'hire-c.stage', { mandateId: mid, personId: pid, stage: prev.stage, note: prev.note ?? '' });
  post(w, a, { kind: 'undo', text: `Moved ${firstOf(w, pid)} from ${STAGE_LABEL[prev.stage]} to ${STAGE_LABEL[to]} on ${mandateTitle(w, mid)}. Moving a card doesn’t message anyone.${to === 'INTERVIEW' && !w.calendar.some((e) => e.personId === pid && e.orgId === a.orgId && e.status !== 'CANCELLED') ? ` No interview is booked yet.` : ''}`,
    actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }, ...(to === 'INTERVIEW' ? [{ label: `Find a time with ${firstOf(w, pid)}`, primary: true, act: { t: 'say' as const, text: `find a time for ${firstOf(w, pid)} next week` } }] : []), { label: 'Open the pipeline', act: { t: 'nav', to: '/r/pipeline' } }] });
});
op('hire-c.reject', (w, args, a) => { rejectEffects(w, a, String(args.personId), String(args.mandateId), String(args.reason)); });
op('hire-c.useSlot', (w, args, a) => {
  const p = hc(w).proposals[a.id]; const s = p?.slots[Number(args.i ?? 0)];
  if (!p || !s) return { say: 'Those times have changed. Ask me to find times again.' };
  if (busyAt(w, p.panel.concat(p.personId).find((id) => busyAt(w, id, s.start, s.end)) ?? '', s.start, s.end)) return { say: `That time was just taken. Ask me to find times again for ${firstOf(w, p.personId)}.` };
  const pf = firstOf(w, p.personId);
  if (args.mode === 'hold') {
    const id = uid('hold');
    w.calendar.push({ id, orgId: a.orgId!, title: `Hold: interview with ${nameOf(w, p.personId)}`, start: s.start, end: s.end, attendees: [...p.panel], status: 'HOLD', personId: p.personId, mandateId: entryFor(w, p.personId, a.orgId)?.mandateId, simulated: true });
    emit(w, a.id, 'calendar.hold', scope(a), `${a.name} held ${tDay(s.start, LAGOS)} ${tTime(s.start, LAGOS)} for ${nameOf(w, p.personId)}’s interview (simulated).`);
    post(w, a, { kind: 'reply', text: `Held ${tDay(s.start, LAGOS)} ${tTime(s.start, LAGOS)} Lagos in ${listNames(p.panel.map((x) => firstOf(w, x)))}’s calendars. A hold blocks the time for your team only; ${pf} isn’t told until you send an invitation.`,
      actions: [{ label: `Draft the invitation to ${pf}`, primary: true, act: { t: 'say', text: `draft the interview invitation for ${pf}` } }, { label: 'Show the calendar', act: { t: 'nav', to: '/r/calendar' } }] });
    return;
  }
  const hold = w.calendar.find((e) => e.status === 'HOLD' && e.personId === p.personId && e.start === s.start);
  const id = uid('msg');
  createDraft(w, a, { id, personId: p.personId, kind: p.kind, slot: { start: s.start, end: s.end }, panel: p.panel, eventId: hold?.id ?? (p.kind === 'RESCHEDULE' ? w.calendar.find((e) => e.personId === p.personId && e.orgId === a.orgId && e.status === 'RESCHEDULE_REQUESTED')?.id : undefined) });
  postDraft(w, a, id, `Drafted ${p.kind === 'RESCHEDULE' ? 'the new time' : 'the invitation'} for ${describeSlot(w, { slot: s, panel: p.panel, personId: p.personId })}. ${guide(w, a.orgId, 'PAY_BAND') && findMsg(w, id)?.m.body.includes(payBand(w, hc(w).drafts[id].mandateId) ?? '§') ? 'The pay band is in, as Kora’s guidelines ask for the first message. ' : ''}Nothing is sent until you approve it.`);
});
op('hire-c.role', (w, args, a) => {
  const who = w.actors.find((x) => x.id === args.actorId); const role = args.role as OrgRole;
  if (!who || !IS_ADMIN.includes(a.role ?? 'VIEWER')) return { say: 'Only an admin can change roles.' };
  const admins = orgMembers(w, a.orgId).filter((x) => IS_ADMIN.includes(x.role ?? 'VIEWER'));
  if (IS_ADMIN.includes(who.role ?? 'VIEWER') && !IS_ADMIN.includes(role) && admins.length <= 1) return { say: `${who.first} is the only admin, so I can’t remove admin rights: nobody could manage the team. Make someone else an admin first.` };
  const prev = who.role ?? 'VIEWER'; if (prev === role) return { say: `${who.first} is already ${ROLE_LABEL[role].toLowerCase()}.` };
  who.role = role;
  if (!args.silent) pushUndo(w, a.id, `Made ${who.first} ${ROLE_LABEL[role].toLowerCase()}`, 'hire-c.role', { actorId: who.id, role: prev, silent: true });
  emit(w, a.id, 'team.role.changed', scope(a), `${a.name} changed ${who.name}’s role from ${ROLE_LABEL[prev]} to ${ROLE_LABEL[role]}.`);
  if (!args.silent) post(w, a, { kind: 'undo', text: `${who.first} is now ${ROLE_LABEL[role].toLowerCase()} (was ${ROLE_LABEL[prev].toLowerCase()}). They can: ${ROLE_CAN[role].join('; ').toLowerCase()}.`, actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }] });
});
op('hire-c.guide', (w, args, a) => {
  if (!IS_ADMIN.includes(a.role ?? 'VIEWER')) return { say: 'Only an admin can change the organisation’s guidelines. Q still follows them for you.' };
  const list = (hcw(w).guides[a.orgId!] ??= []);
  const g = list.find((x) => x.id === args.id);
  if (args.action === 'add') { list.push({ id: uid('g'), text: String(args.text), source: `Added by ${a.name}`, check: 'NONE', on: true, v: 1, by: a.id, at: now(), used: 0 }); }
  else if (g && args.action === 'toggle') { g.on = !g.on; g.v += 1; g.by = a.id; g.at = now(); }
  else if (g && args.action === 'edit') { g.text = String(args.text); g.v += 1; g.by = a.id; g.at = now(); }
  else if (g && args.action === 'remove') { list.splice(list.indexOf(g), 1); }
  syncOrgGuidelines(w, a.orgId!);
  emit(w, a.id, 'org.guideline.changed', scope(a), `${a.name} ${args.action === 'add' ? 'added' : args.action === 'remove' ? 'removed' : args.action === 'toggle' ? (g?.on ? 'turned on' : 'turned off') : 'edited'} a guideline: ${String(args.text ?? g?.text ?? '')}`);
});
op('hire-c.panelSet', (w, args, a) => {
  if (!CAN_MOVE.includes(a.role ?? 'VIEWER')) return { say: 'Only admins, recruiters and hiring managers can change a panel.' };
  const r = changePanel(w, a, String(args.interviewId), args.panel as string[]); if (!r) return;
  if (!args.silent) {
    pushUndo(w, a.id, 'Changed the interview panel', 'hire-c.panelSet', { interviewId: args.interviewId, panel: r.from, silent: true });
    const iv = w.interviews.find((i) => i.id === args.interviewId)!;
    post(w, a, { kind: 'undo', text: `Changed ${firstOf(w, iv.personId)}’s panel: ${listNames(r.from.map((x) => firstOf(w, x)))} → ${listNames(iv.panel.map((x) => firstOf(w, x)))}. ${r.holds}`, actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }] });
  }
});
op('hire-c.c.send', (w, args, a) => candidateSend(w, a, args));
op('hire-c.proposal', (w, args, a) => { const p = hc(w).proposals[a.id]; if (p) p.label = String(args.label ?? p.label); });

// Remember the last candidate profile each recruiter opened, however they got there (link, Q, back button).
if (typeof window !== 'undefined') {
  const track = () => {
    const pid = location.hash.match(/^#\/r\/people\/(p_\w+)/)?.[1]; if (!pid) return;
    const w = getWorld(); const a = actorOf(w); if (a.side !== 'recruiter') return;
    if (hc(w).lastPerson?.[a.id]?.id === pid) return;
    update((d) => { (hcw(d).lastPerson ??= {})[d.session.actor] = { id: pid, at: now() }; });
  };
  window.addEventListener('hashchange', track); setTimeout(track, 0);
}

// Reconnect: messages approved while offline are re-checked and sent (or returned to drafts with the reason).
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    const w = getWorld();
    if (w.network !== 'online' || !w.threads.some((t) => t.messages.some((m) => m.status === 'QUEUED_OFFLINE'))) return;
    update((d) => { if (d.network === 'online') flushQueued(d); });
  }, 700);
}

// ---------------- Drafting ----------------
const DRAFT_VERB = /\b(draft|write|compose|prepare|put together|create|do)\b/;
const DRAFT_OBJ = /\b(invit\w*|invite|message|email|e-mail|note|follow ?-?up|rejection|reply|response|letter|text|sms)\b/;
export function kindFrom(norm: string, w: World, personId: string, orgId?: string): DraftKind {
  if (/\b(reject\w*|declin\w*|turn (him|her|them) down|not progressing|unsuccessful)\b/.test(norm)) return 'REJECTION';
  if (/\b(follow ?-?up|chase|nudge|remind\w*)\b/.test(norm)) return 'FOLLOW_UP';
  if (/\b(reschedul\w*|new time|move (the|her|his|their) interview)\b/.test(norm) && w.calendar.some((e) => e.personId === personId && e.orgId === orgId && e.status !== 'CANCELLED' && e.status !== 'HOLD')) return 'RESCHEDULE';
  if (/\b(reply|respond|response|answer)\b/.test(norm)) return 'REPLY';
  return 'INVITE';
}
export function draftFlow(c: QCtx, personId: string, kind: DraftKind, why?: string): QReply {
  const a = c.actor; const w = c.w; const p = personOf(w, personId)!; const first = p.name.split(' ')[0];
  if (!['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER')) return { msgs: [{ kind: 'refusal', text: `As ${ROLE_LABEL[a.role ?? 'VIEWER'].toLowerCase()} you can’t write to candidates from ${orgOf(w, a.orgId)?.name}. A recruiter or admin can.` }] };
  if (w.consents[personId]?.withdrawnFrom.includes(a.orgId!)) return { msgs: [{ kind: 'refusal', text: `${first} withdrew consent for ${orgOf(w, a.orgId)?.name} to contact them, so I won’t draft anything to them.` }] };
  const entry = entryFor(w, personId, a.orgId);
  if (!entry) return { msgs: [{ kind: 'reply', text: `${first} isn’t in any of ${orgOf(w, a.orgId)?.name}’s roles yet, so I don’t know which job to write about. Add them to a role first, from their profile or the search.` }] };
  if ((entry.stage === 'REJECTED' || entry.stage === 'WITHDRAWN') && kind !== 'REJECTION' && kind !== 'REPLY') return { msgs: [{ kind: 'reply', text: `${first} is marked “${entry.stage === 'REJECTED' ? 'not progressing' : 'withdrew'}” for ${mandateTitle(w, entry.mandateId)}, so I haven’t drafted an ${KIND_LABEL[kind]}. If that’s changed, move ${first} back first (say “move ${first} to shortlisted”).` }] };
  const existing = currentDraft(w, a, undefined, personId);
  if (existing && existing.kind === kind) {
    return { msgs: [], effects: (ww, aa) => postDraft(ww, aa, existing.msgId, `There’s already a ${KIND_LABEL[kind]} to ${first}${existing.by !== aa.id ? `, drafted by ${firstOf(ww, existing.by)} on ${tDay(existing.versions[0].at, LAGOS)}` : ''}. It hasn’t been approved, so it hasn’t been sent. I’ll work on that one rather than start a second.`), frame: frame('hire-c.draft', { msgId: existing.msgId }, 'edit') };
  }
  // Pick a time: a hold, the last proposal, a named day, or the first time next week that works for everyone.
  const panel = (() => { const named = colleaguesIn(w, c.norm, a.orgId); if (named.length) return /\b(with me|me and|and me)\b/.test(c.norm) ? [a.id, ...named] : named; const iv = w.interviews.find((i) => i.personId === personId && i.orgId === a.orgId && i.status !== 'CANCELLED'); return iv?.panel.length ? iv.panel : defaultPanel(w, a, entry.mandateId); })();
  const ev = w.calendar.find((e) => e.personId === personId && e.orgId === a.orgId && e.status !== 'CANCELLED' && e.status !== 'HOLD');
  const hold = w.calendar.find((e) => e.personId === personId && e.orgId === a.orgId && e.status === 'HOLD');
  let slot: { start: string; end: string } | undefined; let eventId: string | undefined = hold?.id;
  if (kind === 'INVITE') {
    const prop = hc(w).proposals[a.id];
    const days = c.ents.days.length ? resolveDays(w, c.ents.days, c.norm) : nextWeek(w);
    if (hold && !c.ents.days.length) slot = { start: hold.start, end: hold.end };
    else if (prop && prop.personId === personId && prop.slots[0] && !c.ents.days.length) slot = { start: prop.slots[0].start, end: prop.slots[0].end };
    else { const s = findSlots(w, { attendees: panel, personId, dates: days, orgId: a.orgId, preferHM: parseTime(c.ents.time), part: partOf(c.norm), limit: 1 })[0]; if (s) slot = { start: s.start, end: s.end }; }
  } else if (kind === 'FOLLOW_UP' && ev) slot = { start: ev.start, end: ev.end };
  else if (kind === 'RESCHEDULE' && ev) {
    eventId = ev.id;
    const req = hc(w).reschedules.find((r) => r.personId === personId && !r.handled);
    const days = c.ents.days.length ? resolveDays(w, c.ents.days, c.norm) : req?.days.length ? req.days : nextWeek(w);
    const s = findSlots(w, { attendees: panel, personId, dates: days, orgId: a.orgId, part: partOf(c.norm) ?? req?.part, exclude: [ev.id], limit: 1 })[0]; if (s) slot = { start: s.start, end: s.end };
  }
  const id = uid('msg');
  return {
    msgs: [],
    effects: (ww, aa) => {
      createDraft(ww, aa, { id, personId, kind, slot, panel, mandateId: entry.mandateId, eventId });
      const d = hc(ww).drafts[id]; const band = payBand(ww, d.mandateId);
      const bandNote = band && findMsg(ww, id)?.m.body.includes(band) ? ` I named the pay band (${band}) because Kora’s guidelines ask for it in the first message.` : '';
      const when = slot ? ` for ${describeSlot(ww, { slot, panel, personId })}, with ${listNames(panel.filter((x) => x !== aa.id).map((x) => firstOf(ww, x)))}${panel.includes(aa.id) ? ' and you' : ''}` : kind === 'INVITE' ? '. I couldn’t find a time next week that works for everyone, so it asks what suits them' : '';
      postDraft(ww, aa, id, `${why ? `I took that to mean ${first}, from ${why}. ` : ''}Here’s a draft ${KIND_LABEL[kind]} to ${first}${when}.${kind === 'INVITE' || kind === 'RESCHEDULE' ? bandNote : ''} It’s only a draft: nothing goes out until you approve it.`);
    },
    frame: frame('hire-c.draft', { msgId: id }, 'edit'),
  };
}

function editFlow(c: QCtx, msgId: string): QReply {
  const w = c.w; const d = hc(w).drafts[msgId]; const first = firstOf(w, d.personId);
  const change: Parameters<typeof reviseDraft>[3] = { note: '' }; const notes: string[] = []; const extra: string[] = [];
  // Day and time
  if (c.ents.days.length || c.ents.time) {
    const dates = c.ents.days.length ? resolveDays(w, c.ents.days, c.norm, d.slot?.start) : d.slot ? [dateIn(d.slot.start, LAGOS)] : nextWeek(w);
    const want = parseTime(c.ents.time) ?? (d.slot ? tTime(d.slot.start, LAGOS) : undefined);
    const s = findSlots(w, { attendees: d.panel, personId: d.personId, dates, orgId: d.orgId, preferHM: want, part: partOf(c.norm), exclude: d.eventId ? [d.eventId] : [], limit: 6 })[0];
    if (!s) return { msgs: [{ kind: 'reply', text: `Nobody on the panel is free for 45 minutes on ${dates.map((x) => tDay(`${x}T12:00:00Z`, LAGOS)).join(', ')} within interview hours, so I haven’t changed the draft. Want me to find the nearest days that work?`, actions: [{ label: `Find times for ${first}`, primary: true, act: { t: 'say', text: `find a time for ${first} next week` } }] }] };
    change.slot = { start: s.start, end: s.end };
    notes.push(`moved to ${tDay(s.start, LAGOS)} ${tTime(s.start, LAGOS)}`);
    if (want && tTime(s.start, LAGOS) !== want) extra.push(`${want} isn’t free for everyone that day, so I used ${tTime(s.start, LAGOS)}.`);
  }
  if (c.ents.tone) { change.tone = c.ents.tone === 'warmer' ? 'friendlier' : (c.ents.tone as Tone); notes.push(`${change.tone === 'friendlier' ? 'friendlier' : change.tone} tone`); }
  else if (/\b(warm|nicer|kinder|relaxed)\b/.test(c.norm)) { change.tone = 'friendlier'; notes.push('friendlier tone'); }
  if (/\b(add|include|put in|mention)\b.*\b(pay|salary|band)\b/.test(c.norm)) { change.addBand = true; notes.push('added the pay band'); }
  if (/\b(remove|take out|drop|delete|leave out)\b.*\b(pay|salary|band)\b/.test(c.norm)) {
    const g = guide(w, d.orgId, 'PAY_BAND');
    if (g) extra.push(`I’ve kept the pay band: Kora’s guideline “${g.text}” (v${g.v}) asks for it. An admin can change that on Organisation and policy.`);
  }
  const named = colleaguesIn(w, c.norm, d.orgId);
  if (named.length && /\b(add|include|with|instead|swap|replace|remove|without|drop)\b/.test(c.norm)) {
    const removing = /\b(remove|without|drop|take off)\b/.test(c.norm);
    const panel = removing ? d.panel.filter((x) => !named.includes(x)) : /\b(instead|swap|replace)\b/.test(c.norm) && named.length >= 2 ? d.panel.map((x) => (x === named[0] ? named[1] : x)) : [...new Set([...d.panel, ...named])];
    change.panel = panel; notes.push(`panel: ${listNames(panel.map((x) => firstOf(w, x)))}`);
  }
  if (!notes.length) return { msgs: [{ kind: 'question', text: extra.length ? extra.join(' ') : `What should I change in the draft to ${first}: the day, the time, the tone, or the people on the panel?`, actions: [{ label: 'Make it friendlier', act: { t: 'say', text: 'make it friendlier' } }, { label: 'Move it to Thursday', act: { t: 'say', text: 'move it to thursday' } }, { label: 'Make it shorter', act: { t: 'say', text: 'make it shorter' } }] }], frame: frame('hire-c.draft', { msgId }, 'edit') };
  change.note = notes.join(' · ').replace(/^\w/, (x) => x.toUpperCase());
  const prevV = latestV(d).v;
  return {
    msgs: [],
    effects: (ww, aa) => {
      const v = reviseDraft(ww, aa, msgId, change); if (!v) return;
      pushUndo(ww, aa.id, `Changed the draft to ${first} (v${v.v})`, 'hire-c.restoreVersion', { msgId, v: prevV });
      const dd = hc(ww).drafts[msgId];
      post(ww, aa, { kind: 'reply', text: `Done: v${v.v} of the draft to ${first}. ${change.note}.${change.slot ? ` That’s ${describeSlot(ww, dd)}.` : ''} ${extra.join(' ')} Here’s what changed from v${prevV}:`.replace(/\s+/g, ' '), used: usedFor(ww, aa, msgId), ref: { type: 'hire-c.diff', id: `${msgId}@${v.v}` },
        why: 'I edit the same draft in place and keep every version; say “undo” to go back.',
        actions: [{ label: 'Send it', primary: true, act: { t: 'say', text: 'send it' } }, { label: 'Undo this change', act: { t: 'do', op: 'undo' } }, { label: 'Open in messages', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId } } }] });
    },
    frame: frame('hire-c.draft', { msgId }, 'edit'),
  };
}

function sendFlow(_c: QCtx, msgId: string): QReply {
  return { msgs: [], effects: (w, a) => checkAndPost(w, a, msgId), frame: undefined };
}

const SEND = /\b(send|sent|approve|go ahead|ship it|fire it off|post it)\b/;
const EDIT = /\b(change|make|move|add|remove|shorter|longer|reword|rewrite|warmer|tone|formal|friendl\w*|instead|swap|without|include|mention|switch)\b/;
const DISCARD = /\b(discard|delete|bin|scrap|throw (it )?away|cancel the draft|get rid of)\b/;
const stageIn = (norm: string) => STAGE_WORDS.find(([re]) => re.test(norm))?.[1];

registerSkill({
  id: 'hire-c.draft', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c)) return 0;
    if (DRAFT_VERB.test(c.norm) && DRAFT_OBJ.test(c.norm)) return 0.9;
    if (/\b(invite|invit\w*)\b/.test(c.norm) && (peopleIn(c).length || PRONOUN.test(c.norm)) && !/\bsend\b/.test(c.norm)) return 0.86;
    if (/\b(follow ?-?up|chase|nudge)\b/.test(c.norm) && peopleIn(c).length) return 0.86;
    return 0;
  },
  handle: (c) => {
    const ps = peopleIn(c);
    let pid = ps[0]; let why: string | undefined;
    if (!pid) { const ctx = contextPerson(c); pid = ctx.id ?? ''; why = ctx.why; }
    if (!pid) return { msgs: [{ kind: 'question', text: 'Who is the message for? Tell me their name, or open their profile and say “for him” or “for her”.' }], frame: frame('hire-c.draft', { want: c.norm }, 'person') };
    return draftFlow(c, pid, kindFrom(c.norm, c.w, pid, c.actor.orgId), why);
  },
  answer: (c) => {
    const f = c.frame!; const a = c.actor;
    if (f.awaiting === 'person') {
      const pid = peopleIn(c)[0]; if (!pid) return null;
      return draftFlow(c, pid, kindFrom(f.slots.want ?? '', c.w, pid, a.orgId));
    }
    const d = currentDraft(c.w, a, f.slots.msgId); if (!d) return null;
    const ps = peopleIn(c);
    if (ps.some((p) => p !== d.personId)) return null;
    if (stageIn(c.norm) && ps.length && !c.ents.days.length) return null;
    if (/\b(find|look for|other) (a |some )?(new )?times?\b/.test(c.norm)) return null;
    if (/\b(show|what) (me )?(the )?(changes|diff|difference)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: `Changes in v${latestV(d).v}:`, ref: { type: 'hire-c.diff', id: `${d.msgId}@${latestV(d).v}` } }] };
    if (DISCARD.test(c.norm)) return { msgs: [], effects: (w, aa) => { const run = { msgId: d.msgId }; const op = (w2: World, x: Actor) => { const f0 = findMsg(w2, run.msgId); if (!f0) return; const prev = f0.m.status; f0.m.status = 'DISCARDED'; pushUndo(w2, x.id, `Discarded the draft to ${firstOf(w2, d.personId)}`, 'hire-c.restore', { msgId: run.msgId, status: prev }); post(w2, x, { kind: 'undo', text: `Discarded the draft to ${firstOf(w2, d.personId)}. It was never sent. Say “undo” if that was a mistake.`, actions: [{ label: 'Undo', primary: true, act: { t: 'do', op: 'undo' } }] }); }; op(w, aa); }, frame: null };
    const f0 = findMsg(c.w, d.msgId)!;
    if (f.awaiting === 'approval' && f0.m.status === 'AWAITING_APPROVAL' && (/\b(approve|approved|yes send|go ahead|send it now)\b/.test(c.norm) || (c.ents.yes && !EDIT.test(c.norm))))
      return { msgs: [], effects: (w, aa) => { const r = approveAndSend(w, aa, d.msgId, latestV(d).v); post(w, aa, { kind: r.ok ? 'notice' : 'refusal', text: r.text, ref: { type: 'hire-c.draft', id: `${d.msgId}@${latestV(d).v}` } }); }, frame: null };
    if (SEND.test(c.norm) && !c.ents.days.length && !c.ents.tone) return sendFlow(c, d.msgId);
    if (roleIn(c.norm) || /\b(guideline|rule|policy|pipeline|team)\b/.test(c.norm)) return null;
    if (c.ents.days.length || c.ents.time || c.ents.tone || (EDIT.test(c.norm) && /\b(it|draft|message|invite|invitation|wording|shorter|longer|warmer|friendl\w*|formal|tone|pay|band|salary|panel|interviewers?|time|day)\b/.test(c.norm))) return editFlow(c, d.msgId);
    if (c.ents.no || /\b(not now|later|leave it)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: `Okay. The draft to ${firstOf(c.w, d.personId)} stays ${f0.m.status === 'AWAITING_APPROVAL' ? 'waiting for approval' : 'a draft'}; nothing is sent. It’s in Messages when you want it.` }], frame: null };
    return null;
  },
});

registerSkill({
  id: 'hire-c.edit', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c) || DRAFT_OBJ.test(c.norm) && DRAFT_VERB.test(c.norm)) return 0;
    if (!(c.ents.days.length || c.ents.tone || EDIT.test(c.norm)) || !/\b(it|the draft|the message|the invite|the invitation|that|draft|message|invit\w*)\b/.test(c.norm)) return 0;
    if (stageIn(c.norm) && peopleIn(c).length && !c.ents.days.length) return 0;
    if (/\b(panel|interviewers?)\b/.test(c.norm) && !/\b(draft|message|invit\w*)\b/.test(c.norm)) return 0;
    return currentDraft(c.w, c.actor, undefined, peopleIn(c)[0]) ? 0.8 : 0;
  },
  handle: (c) => editFlow(c, currentDraft(c.w, c.actor, undefined, peopleIn(c)[0])!.msgId),
});

registerSkill({
  id: 'hire-c.send', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c) || !SEND.test(c.norm) || DRAFT_VERB.test(c.norm) && /\bdraft (a|an)\b/.test(c.norm)) return 0;
    const pid = peopleIn(c)[0];
    if (!/\b(it|the draft|draft|message|invite|invitation|invit\w*|email|reply|follow ?-?up|that)\b/.test(c.norm) && !pid) return 0;
    return currentDraft(c.w, c.actor, c.frame?.slots.msgId, pid) ? 0.9 : pid ? 0.6 : 0;
  },
  handle: (c) => {
    const pid = peopleIn(c)[0];
    const d = currentDraft(c.w, c.actor, c.frame?.slots.msgId, pid);
    if (!d) return { msgs: [{ kind: 'reply', text: `There’s no draft to ${pid ? firstOf(c.w, pid) : 'anyone'} waiting. Want me to write one? Nothing is ever sent without a draft you’ve approved.`, actions: pid ? [{ label: `Draft an invitation to ${firstOf(c.w, pid)}`, primary: true, act: { t: 'say', text: `draft an interview invitation for ${firstOf(c.w, pid)}` } }] : [] }] };
    return { ...sendFlow(c, d.msgId), frame: frame('hire-c.draft', { msgId: d.msgId }, 'approval') };
  },
});

registerSkill({
  id: 'hire-c.discard', side: 'recruiter',
  match: (c) => (recruiter(c) && DISCARD.test(c.norm) && /\b(draft|message|invite|invitation|it)\b/.test(c.norm) && currentDraft(c.w, c.actor, c.frame?.slots.msgId, peopleIn(c)[0]) ? 0.86 : 0),
  handle: (c) => { const d = currentDraft(c.w, c.actor, c.frame?.slots.msgId, peopleIn(c)[0])!; return { msgs: [], effects: (w, a) => { const fn = (w2: World) => { const f0 = findMsg(w2, d.msgId); if (f0) { const prev = f0.m.status; f0.m.status = 'DISCARDED'; pushUndo(w2, a.id, `Discarded the draft to ${firstOf(w2, d.personId)}`, 'hire-c.restore', { msgId: d.msgId, status: prev }); } }; fn(w); post(w, a, { kind: 'undo', text: `Discarded the draft to ${firstOf(w, d.personId)}. It was never sent.`, actions: [{ label: 'Undo', primary: true, act: { t: 'do', op: 'undo' } }] }); }, frame: null }; },
});

// ---------------- Finding a time ----------------
const FIND = [/\b(find|suggest|look for|get|check|propose|any|show)\b.*\b(times?|slots?|availability|overlap)\b/, /\bwhen (can|could|are|is)\b.*\b(free|meet|available)\b/, /\b(schedule|arrange|set up|book|organi[sz]e)\b.*\b(interview|call|chat|meeting)\b/, /\bnew time\b/];
function findFlow(c: QCtx, pid: string, why?: string): QReply {
  const w = c.w; const a = c.actor; const first = firstOf(w, pid);
  const entry = entryFor(w, pid, a.orgId);
  if (!entry) return { msgs: [{ kind: 'reply', text: `${first} isn’t in one of ${orgOf(w, a.orgId)?.name}’s roles, so I can’t arrange an interview yet.` }] };
  const ev = w.calendar.find((e) => e.personId === pid && e.orgId === a.orgId && e.status !== 'CANCELLED' && e.status !== 'HOLD');
  const req = hc(w).reschedules.find((r) => r.personId === pid && !r.handled);
  const resched = !!ev && (/\b(new|another|different|other)\b.*\btime|reschedul|\bmove\b/.test(c.norm) || !!req);
  const named = colleaguesIn(w, c.norm, a.orgId, undefined);
  const iv = w.interviews.find((i) => i.personId === pid && i.orgId === a.orgId && i.status !== 'CANCELLED');
  const panel = named.length ? (/\b(with me|me and|and me)\b/.test(c.norm) ? [a.id, ...named.filter((x) => x !== a.id)] : named) : iv?.panel.length ? iv.panel : defaultPanel(w, a, entry.mandateId);
  const days = c.ents.days.length ? resolveDays(w, c.ents.days, c.norm) : req?.days.length ? req.days : nextWeek(w);
  const part = partOf(c.norm) ?? req?.part;
  const slots = findSlots(w, { attendees: panel, personId: pid, dates: days, orgId: a.orgId, part, exclude: ev ? [ev.id] : [], limit: 4 });
  const [h0, h1] = [guide(w, a.orgId, 'HOURS')?.text.match(/\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2}/)?.[0] ?? '09:00–17:00', ''];
  void h1;
  const abroad = [...panel, pid].filter((id) => tzOf(w, id) !== LAGOS);
  const zoneLine = abroad.length ? ` ${listNames(abroad.map((id) => `${firstOf(w, id)} is in ${city(tzOf(w, id))} (${tzNote(tzOf(w, id), `${days[0]}T12:00:00Z`)})`))}, so I’ve only kept times inside everyone’s working day and show each person’s local time.` : ' Everyone is on Lagos time.';
  const dayText = c.ents.days.includes('next week') || !c.ents.days.length ? (req && !c.ents.days.length ? `on the day ${first} asked for` : 'next week') : days.map((x) => tDay(`${x}T12:00:00Z`, LAGOS)).join(', ');
  const used = [`Calendars: ${listNames(panel.map((id) => firstOf(w, id)))} (busy times only)`, `${first}: ${city(tzOf(w, pid))} time`, ...abroad.filter((x) => x !== pid).map((id) => `${firstOf(w, id)}: ${city(tzOf(w, id))} time`), ...(guide(w, a.orgId, 'HOURS') ? [guideChip(guide(w, a.orgId, 'HOURS')!)] : []), ...(req ? [`${first}’s request: “${req.text}”`] : [])];
  if (!slots.length) return { msgs: [{ kind: 'reply', text: `I couldn’t find 45 minutes ${dayText} when ${listNames([...panel.map((id) => firstOf(w, id)), first])} are all free within interview hours (${h0} Lagos).${zoneLine} Options: try the week after, widen the hours, or change the panel.`, used,
    actions: [{ label: 'Try the week after', act: { t: 'say', text: `find a time for ${first} the week after next` } }, { label: 'Show the calendar', act: { t: 'nav', to: '/r/calendar' } }] }] };
  const id = uid('prop');
  return {
    msgs: [{ kind: 'reply', text: `${why ? `For ${first} (${why}): ` : ''}${slots.length} time${slots.length === 1 ? '' : 's'} ${dayText} work${slots.length === 1 ? 's' : ''} for ${listNames([...panel.map((x) => (x === a.id ? 'you' : firstOf(w, x))), first])}.${zoneLine}${resched ? ` ${first}’s current time stays until the new one is sent.` : ''}`, used,
      ref: { type: 'hire-c.slots', id }, why: 'Times come from busy/free only; I never read what anyone’s meetings are about.',
      actions: [{ label: `${resched ? 'Draft the new time' : 'Draft the invitation'} for ${tDay(slots[0].start, LAGOS)} ${tTime(slots[0].start, LAGOS)}`, primary: true, act: { t: 'do', op: 'hire-c.useSlot', args: { i: 0, mode: 'draft' } } }, { label: `Hold ${tDay(slots[0].start, LAGOS)} ${tTime(slots[0].start, LAGOS)}`, act: { t: 'do', op: 'hire-c.useSlot', args: { i: 0, mode: 'hold' } } }, { label: 'Show the calendar', act: { t: 'nav', to: '/r/calendar' } }] }],
    effects: (ww, aa) => { hcw(ww).proposals[aa.id] = { id, personId: pid, panel, slots, at: now(), by: aa.id, label: dayText, kind: resched ? 'RESCHEDULE' : 'INVITE' }; },
    frame: frame('hire-c.findtime', { proposal: id, personId: pid }, 'slot'),
  };
}
const ORD: [RegExp, number][] = [[/\b(first|1st|one|top|earliest)\b/, 0], [/\b(second|2nd|two)\b/, 1], [/\b(third|3rd|three)\b/, 2], [/\b(fourth|4th|four|last)\b/, 3]];
registerSkill({
  id: 'hire-c.findtime', side: 'recruiter',
  match: (c) => (recruiter(c) && FIND.some((re) => re.test(c.norm)) ? 0.88 : 0),
  handle: (c) => {
    let pid = peopleIn(c)[0]; let why: string | undefined;
    if (!pid) { const ctx = contextPerson(c); pid = ctx.id ?? ''; why = ctx.why; }
    if (!pid) return { msgs: [{ kind: 'question', text: 'Who is the interview with? Tell me the candidate’s name and who should be on the panel.' }] };
    return findFlow(c, pid, peopleIn(c)[0] ? undefined : why);
  },
  answer: (c) => {
    const p = hc(c.w).proposals[c.actor.id]; if (!p || p.id !== c.frame?.slots.proposal) return null;
    let i = ORD.find(([re]) => re.test(c.norm))?.[1];
    if (i === undefined && c.ents.days.length) { const d = resolveDays(c.w, c.ents.days, c.norm)[0]; const k = p.slots.findIndex((s) => dateIn(s.start, LAGOS) === d && (!c.ents.time || tTime(s.start, LAGOS) === parseTime(c.ents.time))); if (k >= 0) i = k; }
    if (i === undefined || !p.slots[i]) return null;
    const mode = /\b(hold|block|reserve|pencil)\b/.test(c.norm) ? 'hold' : 'draft';
    return { msgs: [], effects: (w, a) => runOp('hire-c.useSlot', w, { i, mode }, a), frame: null };
  },
});

// ---------------- Pipeline ----------------
const REJECT = /\b(reject\w*|turn (him|her|them)? ?down|decline|not progressing|not progress|not move forward|not moving forward|let (him|her|them) go)\b/;
function rejectEffects(w: World, a: Actor, pid: string, mid: string, reason: string) {
  const prev = setStage(w, a, mid, pid, 'REJECTED', reason); if (!prev) return;
  pushUndo(w, a.id, `Marked ${firstOf(w, pid)} as not progressing`, 'hire-c.stage', { mandateId: mid, personId: pid, stage: prev.stage, note: prev.note ?? '' });
  const c = w.consents[pid]; const first = firstOf(w, pid);
  const contactable = c && !c.withdrawnFrom.includes(a.orgId!) && (c.notifications.email || c.notifications.inApp || c.notifications.sms);
  if (!contactable) { post(w, a, { kind: 'undo', text: `Recorded: ${first} is not progressing for ${mandateTitle(w, mid)}. The reason stays in ${orgOf(w, a.orgId)?.name}’s record. ${first} has turned off messages from employers, so I haven’t drafted one.`, actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }] }); return; }
  const id = uid('msg');
  createDraft(w, a, { id, personId: pid, kind: 'REJECTION', mandateId: mid, reason });
  postDraft(w, a, id, `Recorded: ${first} is not progressing for ${mandateTitle(w, mid)}. The reason (“${reason}”) stays in ${orgOf(w, a.orgId)?.name}’s internal record. I’ve drafted a kind message that doesn’t mention it, offers feedback if ${first} asks, and says how to have their data deleted. It isn’t sent until you approve it; say “undo” to put ${first} back.`);
}
registerSkill({
  id: 'hire-c.move', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c)) return 0;
    const ps = peopleIn(c);
    if (REJECT.test(c.norm) && (ps.length || PRONOUN.test(c.norm)) && !DRAFT_VERB.test(c.norm)) return 0.9;
    if (/\b(move|put|advance|progress|bump|shift|push|drag)\b/.test(c.norm) && stageIn(c.norm) && ps.length && !c.ents.days.length) return 0.9;
    return 0;
  },
  handle: (c) => {
    const pid = peopleIn(c)[0] ?? contextPerson(c).id;
    if (!pid) return { msgs: [{ kind: 'question', text: 'Who should I move? Tell me their name.' }] };
    const first = firstOf(c.w, pid);
    if (!CAN_MOVE.includes(c.actor.role ?? 'VIEWER')) return { msgs: [{ kind: 'refusal', text: `As ${ROLE_LABEL[c.actor.role ?? 'VIEWER'].toLowerCase()} you can see the pipeline but not move people. An admin can change your role on Team.` }] };
    const e = entryFor(c.w, pid, c.actor.orgId);
    if (!e) return { msgs: [{ kind: 'reply', text: `${first} isn’t in ${orgOf(c.w, c.actor.orgId)?.name}’s pipeline.` }] };
    if (REJECT.test(c.norm)) {
      const given = c.text.match(/\b(?:because|reason[:\s]+|as)\s+(.{6,})$/i)?.[1];
      if (given) { const pc = protectedCriterion(normalise(given)); if (!pc) return { msgs: [], effects: (w, a) => rejectEffects(w, a, pid, e.mandateId, given.trim()), frame: null }; }
      return { msgs: [{ kind: 'question', text: `What’s the reason for not progressing ${first} for ${mandateTitle(c.w, e.mandateId)}? It stays in Kora’s internal record and won’t go in the message to ${first}. It must be about the job.`,
        actions: [{ label: 'Not enough production Go experience', act: { t: 'say', text: 'Not enough production Go experience' } }, { label: 'Another candidate was a closer fit', act: { t: 'say', text: 'Another candidate was a closer fit for the role' } }, { label: 'Location doesn’t fit the role', act: { t: 'say', text: 'Location does not fit the role' } }, { label: 'Cancel', act: { t: 'say', text: 'cancel' } }] }],
        frame: frame('hire-c.move', { personId: pid, mandateId: e.mandateId }, 'reason') };
    }
    const to = stageIn(c.norm)!;
    if (e.stage === to) return { msgs: [{ kind: 'reply', text: `${first} is already at ${STAGE_LABEL[to]}.` }] };
    return { msgs: [], effects: (w, a) => runOp('hire-c.move', w, { personId: pid, mandateId: e.mandateId, stage: to }, a) };
  },
  answer: (c) => {
    if (c.frame?.awaiting !== 'reason') return null;
    if (c.ents.no || /^(cancel|never mind|stop)/.test(c.norm)) return { msgs: [{ kind: 'reply', text: 'Okay, nothing changed.' }], frame: null };
    if (peopleIn(c).some((p) => p !== c.frame!.slots.personId) || FIND.some((re) => re.test(c.norm))) return null;
    const pc = protectedCriterion(c.norm) ?? (/\b(age|old|young|married|pregnan\w*|religio\w*|tribe|state of origin|gender|woman|man)\b/.test(c.norm) ? { label: 'a personal characteristic' } : null);
    if (pc) return { msgs: [{ kind: 'refusal', text: `I can’t record that as a reason: it’s about ${pc.label}, not the job. Tell me what about the work didn’t fit, for example skills, experience the role needs, or availability.` }] };
    const { personId, mandateId } = c.frame.slots;
    return { msgs: [], effects: (w, a) => rejectEffects(w, a, personId, mandateId, c.text.trim()), frame: null };
  },
});

// ---------------- Panels ----------------
registerSkill({
  id: 'hire-c.panel', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c)) return 0;
    const named = colleaguesIn(c.w, c.norm, c.actor.orgId);
    if (/\b(panel|interviewers?)\b/.test(c.norm) && /\b(swap|replace|change|add|remove|take off|put|instead)\b/.test(c.norm) && named.length) return 0.89;
    if (/\b(swap|replace)\b/.test(c.norm) && named.length >= 2 && !/\b(draft|message|invit\w*)\b/.test(c.norm)) return 0.86;
    return 0;
  },
  handle: (c) => {
    const w = c.w; const a = c.actor;
    if (!CAN_MOVE.includes(a.role ?? 'VIEWER')) return { msgs: [{ kind: 'refusal', text: 'Only admins, recruiters and hiring managers can change an interview panel.' }] };
    // Names in the order they were said: "swap Musa for Bayo" / "replace Musa with Bayo" → Musa out, Bayo in.
    const ws = c.norm.replace(/[,.?!']/g, ' ').split(/\s+/);
    const order = colleaguesIn(w, c.norm, a.orgId).map((id) => ({ id, i: ws.findIndex((x) => x === firstOf(w, id).toLowerCase() || x === `${firstOf(w, id).toLowerCase()}s`) })).sort((x, y) => x.i - y.i).map((x) => x.id);
    const pid = peopleIn(c)[0] ?? contextPerson(c).id;
    const ivs = w.interviews.filter((i) => i.orgId === a.orgId && i.status !== 'CANCELLED' && i.status !== 'DONE' && (!pid || i.personId === pid));
    const iv = ivs[ivs.length - 1];
    if (!iv) {
      const d = currentDraft(w, a, undefined, pid);
      if (d) return editFlow(c, d.msgId);
      return { msgs: [{ kind: 'reply', text: `There’s no interview${pid ? ` with ${firstOf(w, pid)}` : ''} with a panel yet. Ask me to find a time first.` }] };
    }
    let panel = [...iv.panel];
    const removing = /\b(remove|take off|drop|without)\b/.test(c.norm); const adding = /\b(add|put)\b/.test(c.norm) && !/\b(instead|swap|replace)\b/.test(c.norm);
    if (/\b(swap|replace|instead|change)\b/.test(c.norm) && order.length >= 2) {
      const [x, y] = /\binstead of\b/.test(c.norm) ? [order[1], order[0]] : [order[0], order[1]];
      const out = panel.includes(x) ? x : y; const inn = out === x ? y : x;
      panel = panel.map((p) => (p === out ? inn : p));
    } else if (removing) panel = panel.filter((p) => !order.includes(p));
    else if (adding) panel = [...new Set([...panel, ...order])];
    else return { msgs: [{ kind: 'question', text: `Who should come off ${firstOf(w, iv.personId)}’s panel, and who should join? The panel now is ${listNames(iv.panel.map((x) => firstOf(w, x)))}.` }] };
    if (panel.join() === iv.panel.join()) return { msgs: [{ kind: 'reply', text: `${firstOf(w, iv.personId)}’s panel is already ${listNames(panel.map((x) => firstOf(w, x)))}.` }] };
    const eng = guide(w, a.orgId, 'PANEL_TWO');
    return {
      msgs: [],
      effects: (ww, aa) => {
        const r = changePanel(ww, aa, iv.id, panel); if (!r) return;
        pushUndo(ww, aa.id, `Changed ${firstOf(ww, iv.personId)}’s panel`, 'hire-c.panelSet', { interviewId: iv.id, panel: r.from, silent: true });
        const admins = orgMembers(ww, aa.orgId).filter((x) => x.role === 'ADMIN' && x.id !== aa.id).map((x) => x.first);
        post(ww, aa, { kind: 'undo', text: `Done: ${firstOf(ww, iv.personId)}’s panel is now ${listNames(panel.map((x) => firstOf(ww, x)))} (was ${listNames(r.from.map((x) => firstOf(ww, x)))}). ${r.holds}${panel.length < 2 && eng ? ` Note: Kora’s guideline asks for a panel of two for engineering interviews.` : ''}${admins.length ? ` I’ll tell ${listNames(admins)} next time they’re here.` : ''} ${firstOf(ww, iv.personId)} hasn’t been told; that would need a message you approve.`.replace(/\s+/g, ' '),
          used: [`Calendars: ${listNames(panel.map((x) => firstOf(ww, x)))} (busy times only)`, ...(eng ? [guideChip(eng)] : [])], actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }, { label: 'Show the calendar', act: { t: 'nav', to: '/r/calendar' } }] });
      },
    };
  },
});

// ---------------- Team and roles ----------------
const ROLE_WORDS: [RegExp, OrgRole][] = [[/\bhiring manager\b/, 'HIRING_MANAGER'], [/\b(admin|administrator)\b/, 'ADMIN'], [/\brecruiter\b/, 'RECRUITER'], [/\binterviewer\b/, 'INTERVIEWER'], [/\b(viewer|read only|read-only)\b/, 'VIEWER'], [/\bowner\b/, 'OWNER']];
const roleIn = (norm: string) => ROLE_WORDS.find(([re]) => re.test(norm))?.[1];
registerSkill({
  id: 'hire-c.team', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c)) return 0;
    const named = colleaguesIn(c.w, c.norm, c.actor.orgId);
    if (named.length && roleIn(c.norm) && /\b(make|set|change|give|promote|demote|turn|switch|role)\b/.test(c.norm)) return 0.9;
    if (/\bwhat can (a|an|the)\b/.test(c.norm) && roleIn(c.norm)) return 0.86;
    if (/\b(what does (a|an) .* do|roles? and permissions|who can (approve|send))\b/.test(c.norm)) return 0.84;
    if (/\b(who is on|who's on|my team|the team|team members|colleagues)\b/.test(c.norm) && !/\bpanel\b/.test(c.norm)) return 0.78;
    return 0;
  },
  handle: (c) => {
    const w = c.w; const a = c.actor; const named = colleaguesIn(w, c.norm, a.orgId); const role = roleIn(c.norm);
    if (named.length && role && /\b(make|set|change|give|promote|demote|turn|switch|role)\b/.test(c.norm)) {
      const who = w.actors.find((x) => x.id === named[0])!;
      if (!IS_ADMIN.includes(a.role ?? 'VIEWER')) return { msgs: [{ kind: 'refusal', text: `Only an admin can change roles at ${orgOf(w, a.orgId)?.name}. ${listNames(orgMembers(w, a.orgId).filter((x) => IS_ADMIN.includes(x.role ?? 'VIEWER')).map((x) => x.name))} can. I haven’t changed anything.` }] };
      return { msgs: [], effects: (ww, aa) => { runOp('hire-c.role', ww, { actorId: who.id, role }, aa); }, nav: { to: '/r/team', label: 'your team' } };
    }
    if (role && /\bwhat\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: `A ${ROLE_LABEL[role].toLowerCase()} can: ${ROLE_CAN[role].join('; ').toLowerCase()}.${role === 'HIRING_MANAGER' ? ' They can’t approve or send messages on their own at Kora, because Kora approves each send.' : ''}`, actions: [{ label: 'Open Team', act: { t: 'nav', to: '/r/team' } }] }] };
    const mem = orgMembers(w, a.orgId);
    return { msgs: [{ kind: 'reply', text: `${orgOf(w, a.orgId)?.name}’s hiring team: ${mem.map((m) => `${m.first} (${ROLE_LABEL[m.role ?? 'VIEWER'].toLowerCase()}, ${city(m.timezone)})`).join(', ')}. Approvers: ${listNames(mem.filter((m) => CAN_SEND.includes(m.role ?? 'VIEWER')).map((m) => m.first))}.` }], nav: { to: '/r/team', label: 'your team' } };
  },
});

// ---------------- Guidelines ----------------
registerSkill({
  id: 'hire-c.guide', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c)) return 0;
    if (/\b(add|new|create)\b.*\b(guideline|rule|policy)\b/.test(c.norm)) return 0.88;
    if (/\b(turn off|switch off|disable|stop (using|applying|putting|including)|pause|turn on|switch on|enable|turn it back on|back on)\b/.test(c.norm) && /\b(guideline|rule|pay band|band|hours|panel)\b/.test(c.norm))
      // An admin naming a specific guideline gets it changed (above the generic "go to policy" handler).
      return IS_ADMIN.includes(c.actor.role ?? 'VIEWER') && /\b(pay|band|hours|panel)\b/.test(c.norm) ? 0.92 : 0.86;
    if (/\b(what are|show|list|which)\b.*\b(our |the )?(guidelines|rules|policies)\b/.test(c.norm)) return 0.84;
    return 0;
  },
  handle: (c) => {
    const w = c.w; const a = c.actor; const gs = guidesOf(w, a.orgId);
    const admin = IS_ADMIN.includes(a.role ?? 'VIEWER');
    if (/\b(add|new|create)\b/.test(c.norm)) {
      const text = c.text.split(/[:–-]|\bthat\b/i).slice(1).join(' ').trim().replace(/^\s*(we|to)\s+/i, (m) => m);
      if (!admin) return { msgs: [{ kind: 'refusal', text: 'Only an admin can add guidelines. I’ve not changed anything.' }] };
      if (text.length < 6) return { msgs: [{ kind: 'question', text: 'What should the guideline say? For example: “add a guideline: mention our hybrid working days in every invitation”.' }] };
      const clean = text.charAt(0).toUpperCase() + text.slice(1);
      return { msgs: [{ kind: 'reply', text: `Added: “${clean}”. I’ll cite it when I draft for ${orgOf(w, a.orgId)?.name}. I can’t check it automatically, so it shows as guidance in the checks, not a pass or fail.` }], effects: (ww, aa) => { runOp('hire-c.guide', ww, { action: 'add', text: clean }, aa); }, nav: { to: '/r/setup', label: 'organisation and policy' } };
    }
    const target = /\b(pay|band)\b/.test(c.norm) ? gs.find((g) => g.check === 'PAY_BAND') : /\bhours\b/.test(c.norm) ? gs.find((g) => g.check === 'HOURS') : /\bpanel\b/.test(c.norm) ? gs.find((g) => g.check === 'PANEL_TWO') : undefined;
    if (/\b(turn|switch|disable|enable|stop|pause|back on)\b/.test(c.norm)) {
      if (!target) return { msgs: [{ kind: 'question', text: `Which guideline? ${gs.map((g) => `“${g.text}”`).join(', ')}.` }] };
      if (!admin) return { msgs: [{ kind: 'refusal', text: `Only an admin can change “${target.text}”. I’ll keep following it.` }] };
      const on = /\b(turn on|switch on|enable|back on)\b/.test(c.norm);
      if (target.on === on) return { msgs: [{ kind: 'reply', text: `“${target.text}” is already ${on ? 'on' : 'off'}.` }] };
      return { msgs: [{ kind: 'undo', text: `${on ? 'Turned on' : 'Turned off'}: “${target.text}”. ${on ? 'I’ll apply it from the next draft.' : 'I’ll stop applying it from the next draft; drafts already written keep their wording.'}`, actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }] }],
        effects: (ww, aa) => { runOp('hire-c.guide', ww, { action: 'toggle', id: target.id }, aa); pushUndo(ww, aa.id, `Turned ${on ? 'on' : 'off'} a guideline`, 'hire-c.guide', { action: 'toggle', id: target.id }); } };
    }
    return { msgs: [{ kind: 'reply', text: `${orgOf(w, a.orgId)?.name}’s guidelines I follow: ${gs.filter((g) => g.on).map((g) => `“${g.text}” (v${g.v})`).join('; ')}.${gs.some((g) => !g.on) ? ` Turned off: ${gs.filter((g) => !g.on).map((g) => `“${g.text}”`).join(', ')}.` : ''}`, used: gs.filter((g) => g.on).map(guideChip) }], nav: { to: '/r/setup', label: 'organisation and policy' } };
  },
});

// ---------------- Inbox summary ----------------
registerSkill({
  id: 'hire-c.inbox', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(anything waiting|what needs (my )?(approval|attention)|approvals?|unanswered|who (has not|hasn't) replied|any replies|new messages|any messages)\b/.test(c.norm) && !/\b(send|draft)\b/.test(c.norm) ? 0.8 : 0),
  handle: (c) => {
    const w = c.w; const a = c.actor;
    const mine = w.threads.filter((t) => t.orgId === a.orgId);
    const waiting = mine.flatMap((t) => t.messages.filter((m) => m.status === 'AWAITING_APPROVAL').map((m) => ({ t, m })));
    const drafts = mine.flatMap((t) => t.messages.filter((m) => m.status === 'DRAFT').map((m) => ({ t, m })));
    const queued = mine.flatMap((t) => t.messages.filter((m) => m.status === 'QUEUED_OFFLINE'));
    const people = [...new Set(mine.map((t) => t.personId))];
    const unanswered = people.filter((p) => { const ms = mine.filter((t) => t.personId === p).flatMap((t) => t.messages).filter((m) => m.status === 'RECEIVED' || m.status === 'SENT_SIMULATED').sort((x, y) => x.at.localeCompare(y.at)); return ms.length && ms[ms.length - 1].from === p; });
    const parts = [`${waiting.length} waiting for approval${waiting.length ? ` (${listNames(waiting.map((x) => firstOf(w, x.t.personId)))})` : ''}`, `${drafts.length} draft${drafts.length === 1 ? '' : 's'}${drafts.length ? ` (${listNames(drafts.map((x) => firstOf(w, x.t.personId)))})` : ''}`, `${unanswered.length} candidate${unanswered.length === 1 ? '' : 's'} waiting on a reply${unanswered.length ? ` (${listNames(unanswered.map((p) => firstOf(w, p)))})` : ''}`];
    if (queued.length) parts.push(`${queued.length} queued offline`);
    return { msgs: [{ kind: 'reply', text: `In ${orgOf(w, a.orgId)?.name}’s messages: ${parts.join(', ')}.`, actions: [{ label: 'Open messages', primary: true, act: { t: 'nav', to: '/r/messages' } }, ...unanswered.slice(0, 1).map((p) => ({ label: `Draft a reply to ${firstOf(w, p)}`, act: { t: 'say' as const, text: `draft a reply to ${firstOf(w, p)}` } }))] }] };
  },
});

// ---------------- Candidate side: confirm, ask to move, reply ----------------
function candidateEvents(w: World, a: Actor) { return w.calendar.filter((e) => e.personId === a.personId && ['INVITED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(e.status)).sort((x, y) => x.start.localeCompare(y.start)); }
function candidateSend(w: World, a: Actor, args: Record<string, unknown>) {
  const pid = a.personId!; const orgId = String(args.orgId);
  const t = w.threads.find((x) => x.id === args.threadId) ?? w.threads.find((x) => x.orgId === orgId && x.personId === pid && x.messages.some((m) => m.status === 'SENT_SIMULATED'));
  if (!t) return { say: 'I can’t find that conversation.' };
  const kind = String(args.kind ?? 'REPLY'); const body = String(args.body ?? '').trim();
  if (!body) return { say: 'The message is empty, so I didn’t send it.' };
  const offline = w.network === 'offline';
  const to = [...t.messages].reverse().find((m) => m.status === 'SENT_SIMULATED')?.from ?? orgMembers(w, t.orgId).find((x) => x.role === 'ADMIN')?.id ?? '';
  t.messages.push({ id: uid('msg'), from: pid, to, subject: kind === 'RESCHEDULE' ? 'Request to move my interview' : kind === 'CONFIRM' ? 'Interview confirmed' : 'Reply', body, at: now(), status: offline ? 'QUEUED_OFFLINE' : 'RECEIVED', channel: 'IN_APP' });
  const ev = w.calendar.find((e) => e.id === args.eventId);
  if (ev && kind === 'RESCHEDULE') { ev.status = 'RESCHEDULE_REQUESTED'; hcw(w).reschedules.push({ eventId: ev.id, personId: pid, text: String(args.request ?? body), days: (args.days as string[]) ?? [], part: args.part as 'morning' | 'afternoon' | undefined, at: now() }); const iv = w.interviews.find((i) => i.eventId === ev.id); if (iv) iv.status = 'PLANNING'; }
  if (ev && kind === 'CONFIRM') { ev.status = 'CONFIRMED'; const iv = w.interviews.find((i) => i.eventId === ev.id); if (iv) iv.status = 'CONFIRMED'; }
  const e = w.pipeline.find((p) => p.personId === pid && mandateOrg(w, p.mandateId) === t.orgId && p.stage === 'CONTACTED'); if (e) e.stage = 'REPLIED';
  emit(w, a.id, kind === 'RESCHEDULE' ? 'interview.reschedule.requested' : kind === 'CONFIRM' ? 'interview.confirmed' : 'message.received', `SHARED:${t.orgId}:${pid}`, `${a.name} ${kind === 'RESCHEDULE' ? 'asked to move the interview' : kind === 'CONFIRM' ? 'confirmed the interview' : 'replied'}${offline ? ' (queued offline)' : ''}.`);
  const org = orgOf(w, t.orgId)?.name;
  post(w, a, { kind: 'notice', text: offline ? `You’re offline, so it hasn’t gone yet. It’s saved and will be delivered to ${org} when you reconnect.` : kind === 'RESCHEDULE' ? `Sent to ${org} (simulated): your request to move the interview. Your current time is still held until they offer a new one, and nothing changes until they reply. They usually reply within a few days, but I can’t promise when.` : kind === 'CONFIRM' ? `Confirmed with ${org} (simulated). It’s in your interview times, with a reminder the day before.` : `Sent to ${org} (simulated). I’ll tell you when they reply.` });
  return undefined;
}
const mandateOrg = (w: World, mid: string) => (mid === w.mandate.mandateId ? 'org_kora' : w.mandates.find((m) => m.id === mid)?.orgId);

registerSkill({
  id: 'hire-c.c.reschedule', side: 'candidate',
  match: (c) => (c.actor.personId && /\b(reschedul\w*|move (it|my interview|the interview)|another time|different time|change the time|can not make|cannot make|can't make|push it)\b/.test(c.norm) && candidateEvents(c.w, c.actor).length ? 0.88 : 0),
  handle: (c) => {
    const ev = candidateEvents(c.w, c.actor).find((e) => e.status !== 'RESCHEDULE_REQUESTED') ?? candidateEvents(c.w, c.actor)[0];
    const org = orgOf(c.w, ev.orgId)?.name ?? 'the employer'; const tz = c.actor.timezone;
    const days = c.ents.days.length ? resolveDays(c.w, c.ents.days, c.norm) : []; const part = partOf(c.norm);
    const wish = [days.map((d) => tDay(`${d}T12:00:00Z`, tz)).join(' or '), part].filter(Boolean).join(' ');
    const t = c.w.threads.find((x) => x.orgId === ev.orgId && x.personId === c.actor.personId && x.messages.some((m) => m.status === 'SENT_SIMULATED'));
    const to = t ? firstOf(c.w, [...t.messages].reverse().find((m) => m.status === 'SENT_SIMULATED')!.from) : org;
    const body = `Hi ${to}, thank you for the invitation. I can’t make ${tDay(ev.start, tz)} at ${tTime(ev.start, tz)}. ${wish ? `Could we move it to ${wish}?` : 'Could we find another time?'} Thank you, ${c.actor.first}`;
    return { msgs: [{ kind: 'approval', text: `I can send ${org} this request. Your current time stays held until they offer a new one, and they decide the new time. Send it?\n\n“${body}”`, why: 'Nothing is sent without your yes.',
      actions: [{ label: 'Send the request', primary: true, act: { t: 'do', op: 'hire-c.c.send', args: { orgId: ev.orgId, threadId: t?.id ?? '', kind: 'RESCHEDULE', body, eventId: ev.id, days, part: part ?? null, request: wish || 'another time' } } }, { label: 'Change the wording', act: { t: 'nav', to: '/c/messages' } }, { label: 'Keep my time', act: { t: 'say', text: 'keep it' } }] }] };
  },
});
registerSkill({
  id: 'hire-c.c.confirm', side: 'candidate',
  match: (c) => (c.actor.personId && /\b(confirm\w*|i can make it|that works|i will be there|i'll be there|accept the (interview|invitation|time))\b/.test(c.norm) && candidateEvents(c.w, c.actor).some((e) => e.status === 'INVITED') ? 0.86 : 0),
  handle: (c) => {
    const ev = candidateEvents(c.w, c.actor).find((e) => e.status === 'INVITED')!; const tz = c.actor.timezone; const org = orgOf(c.w, ev.orgId)?.name;
    const t = c.w.threads.find((x) => x.orgId === ev.orgId && x.personId === c.actor.personId && x.messages.some((m) => m.status === 'SENT_SIMULATED'));
    const body = `Thank you, I confirm ${tLongSafe(ev.start, tz)} at ${tTime(ev.start, tz)} (${city(tz)} time). ${c.actor.first}`;
    return { msgs: [{ kind: 'approval', text: `Confirm your interview with ${org} on ${tDay(ev.start, tz)} at ${tTime(ev.start, tz)} ${city(tz)} time? I’ll send them: “${body}”`, actions: [{ label: 'Confirm it', primary: true, act: { t: 'do', op: 'hire-c.c.send', args: { orgId: ev.orgId, threadId: t?.id ?? '', kind: 'CONFIRM', body, eventId: ev.id } } }, { label: 'Ask for another time', act: { t: 'say', text: 'can I reschedule my interview' } }] }] };
  },
});
const tLongSafe = (iso: string, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
registerSkill({
  id: 'hire-c.c.reply', side: 'candidate',
  match: (c) => (c.actor.personId && /\b(reply|write back|answer|respond|message|tell)\b.*\b(kora|them|recruiter|employer|ngozi|seyi|ada)\b/.test(c.norm) && c.w.threads.some((t) => t.personId === c.actor.personId && t.messages.some((m) => m.status === 'SENT_SIMULATED')) ? 0.8 : 0),
  handle: (c) => {
    const t = c.w.threads.filter((x) => x.personId === c.actor.personId && x.messages.some((m) => m.status === 'SENT_SIMULATED')).sort((x, y) => (y.messages[y.messages.length - 1]?.at ?? '').localeCompare(x.messages[x.messages.length - 1]?.at ?? ''))[0];
    const said = c.text.match(/(?:saying|that|:)\s*(.{3,})$/i)?.[1];
    const org = orgOf(c.w, t.orgId)?.name;
    if (!said) return { msgs: [{ kind: 'question', text: `What would you like to say to ${org}? You can also write it yourself in Messages.`, actions: [{ label: 'Open messages', act: { t: 'nav', to: '/c/messages' } }] }] };
    const body = said.charAt(0).toUpperCase() + said.slice(1);
    return { msgs: [{ kind: 'approval', text: `Send this to ${org}? “${body}”`, actions: [{ label: 'Send', primary: true, act: { t: 'do', op: 'hire-c.c.send', args: { orgId: t.orgId, threadId: t.id, kind: 'REPLY', body } } }, { label: 'Not now', act: { t: 'say', text: 'keep it' } }] }] };
  },
});

void actorOf; void anyOf;
export type { Guide };
