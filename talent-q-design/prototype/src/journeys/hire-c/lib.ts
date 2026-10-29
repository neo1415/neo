// R3 logic shared by Q's skills and the pages: time zones, free/busy, slot finding, drafting templates,
// the pre-send checks (approval and delegation, candidate, calendar, guidelines, consent) and the simulated send.
// Nothing here really sends or books: statuses say SENT_SIMULATED and receipts are fake.
import { actorOf, emit, now, orgLimits, orgOf, outreachThisWeek, personOf, simNow, uid, type World } from '../../mock/world';
import { appendQ } from '../../q/core/engine';
import type { Actor, CalEvent, Msg, OrgRole, Stage, Thread } from '../../state/domain';
import { STAGE_LABEL } from '../../state/domain';
import { hc, hcw, type Check, type DraftKind, type DraftMeta, type Guide, type Slot, type Tone } from '../../state/areas/hire-c';
import { contentHash, defaultSender, emailChecks, providerSend } from './email';
import { mailboxOf } from '../../state/areas/mail';
import { campaignOf } from '../../state/areas/campaigns';

// ---------------- Time ----------------
export const LAGOS = 'Africa/Lagos';
const CITY: Record<string, string> = { 'Africa/Lagos': 'Lagos', 'Europe/London': 'London', 'Africa/Accra': 'Accra', 'Africa/Nairobi': 'Nairobi' };
export const city = (tz: string) => CITY[tz] ?? tz.split('/').pop()!.replace(/_/g, ' ');
const f = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...o }).format(new Date(iso));
export const tTime = (iso: string, tz: string) => f(iso, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const tDay = (iso: string, tz: string) => f(iso, tz, { weekday: 'short', day: 'numeric', month: 'short' });
export const tLong = (iso: string, tz: string) => f(iso, tz, { weekday: 'long', day: 'numeric', month: 'long' });
export const dateIn = (iso: string | Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(typeof iso === 'string' ? new Date(iso) : iso);
export const minsIn = (iso: string, tz: string) => { const [h, m] = tTime(iso, tz).split(':').map(Number); return h * 60 + m; };
/** Offset from UTC in minutes for a zone at an instant (Lagos +60, London +0 in November). */
export const offsetOf = (iso: string, tz: string) => { const d = new Date(iso); const local = new Date(d.toLocaleString('en-US', { timeZone: tz })); const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })); return Math.round((local.getTime() - utc.getTime()) / 60000); };
export const lagosAt = (date: string, hm: string) => new Date(`${date}T${hm}:00+01:00`).toISOString();
export const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const hm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
export const slotText = (iso: string, tz: string) => `${tLong(iso, tz)} at ${tTime(iso, tz)}`;
export const tzNote = (tz: string, iso: string) => { const d = (offsetOf(iso, tz) - offsetOf(iso, LAGOS)) / 60; return d === 0 ? 'same time as Lagos' : `${Math.abs(d)} hour${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'behind' : 'ahead of'} Lagos`; };

export const today = (w: World) => dateIn(simNow(w), LAGOS);
export const nextWeek = (w: World) => { const t = today(w); const wd = weekday(t); const mon = addDays(t, ((8 - wd) % 7) || 7); return [0, 1, 2, 3, 4].map((i) => addDays(mon, i)); };
/** Turn "friday", "next week", "tomorrow" into dates. A weekday is read in the week of `ref` (the current slot) when given. */
export function resolveDays(w: World, days: string[], norm: string, ref?: string): string[] {
  const t = today(w);
  if (days.includes('next week') && !days.some((d) => WD.includes(d))) return nextWeek(w);
  const out: string[] = [];
  for (const d of days) {
    if (d === 'today') out.push(t);
    else if (d === 'tomorrow') out.push(addDays(t, 1));
    else if (WD.includes(d)) {
      const target = WD.indexOf(d);
      let base: string;
      if (ref) { const r = dateIn(ref, LAGOS); base = addDays(r, -((weekday(r) + 6) % 7)); }
      else if (days.includes('next week') || new RegExp(`next ${d}`).test(norm)) base = nextWeek(w)[0];
      else base = addDays(t, -((weekday(t) + 6) % 7));
      let date = addDays(base, (target + 6) % 7);
      while (date <= t) date = addDays(date, 7);
      out.push(date);
    }
  }
  return out;
}
export const partOf = (norm: string): 'morning' | 'afternoon' | undefined => (/\bmorning\b/.test(norm) ? 'morning' : /\b(afternoon|evening|after lunch)\b/.test(norm) ? 'afternoon' : undefined);
export function parseTime(t?: string) {
  if (!t) return undefined;
  const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/); if (!m) return undefined;
  let h = Number(m[1]); const mm = Number(m[2] ?? 0);
  if (m[3] === 'pm' && h < 12) h += 12; if (m[3] === 'am' && h === 12) h = 0;
  if (!m[3] && h < 8) h += 12;
  return hm(h * 60 + mm);
}

// ---------------- People ----------------
export const orgMembers = (w: World, orgId?: string) => w.actors.filter((a) => a.orgId && a.orgId === orgId && a.side === 'recruiter');
export const nameOf = (w: World, id: string) => w.actors.find((a) => a.id === id)?.name ?? personOf(w, id)?.name ?? id;
export const firstOf = (w: World, id: string) => nameOf(w, id).split(' ')[0];
export const tzOf = (w: World, id: string) => w.actors.find((a) => a.id === id && a.side === 'recruiter')?.timezone ?? personOf(w, id)?.timezone ?? LAGOS;
export const listNames = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** Colleagues named in a sentence ("with Seyi and Musa"). */
export function colleaguesIn(w: World, norm: string, orgId?: string, exclude?: string) {
  const ws = norm.replace(/[,.?!']/g, ' ').split(/\s+/);
  return orgMembers(w, orgId).filter((a) => a.id !== exclude && ws.some((x) => x === a.first.toLowerCase() || x === `${a.first.toLowerCase()}s`)).map((a) => a.id);
}
export const CAN_SEND: OrgRole[] = ['OWNER', 'ADMIN', 'RECRUITER'];
export const CAN_MOVE: OrgRole[] = ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'];
export const IS_ADMIN: OrgRole[] = ['OWNER', 'ADMIN'];
export const ROLE_LABEL: Record<OrgRole, string> = { OWNER: 'Owner', ADMIN: 'Admin', RECRUITER: 'Recruiter', HIRING_MANAGER: 'Hiring manager', INTERVIEWER: 'Interviewer', VIEWER: 'Viewer' };
export const ROLE_CAN: Record<OrgRole, string[]> = {
  OWNER: ['Everything an admin can do', 'Close the organisation’s account'],
  ADMIN: ['Approve and send messages', 'Change team roles and permissions', 'Edit guidelines and what Q may do alone', 'Move people between stages'],
  RECRUITER: ['Approve and send messages', 'Draft with Q', 'Move people between stages', 'Arrange interviews'],
  HIRING_MANAGER: ['Draft messages (someone else approves)', 'Move people between stages', 'Change interview panels', 'Give interview feedback'],
  INTERVIEWER: ['See interviews they’re on', 'Give interview feedback'],
  VIEWER: ['Read pipelines and profiles shared with the organisation'],
};
export const pron = (w: World, personId: string) => firstOf(w, personId);

// ---------------- Roles, mandates, pay ----------------
export function mandatesOf(w: World, orgId?: string) {
  const out: { id: string; title: string; engineering: boolean }[] = [];
  if (orgId === 'org_kora') out.push({ id: w.mandate.mandateId, title: w.mandate.title, engineering: true });
  for (const m of w.mandates) if (m.orgId === orgId) out.push({ id: m.id, title: m.title, engineering: /engineer/i.test(m.title) });
  return out;
}
export const mandateTitle = (w: World, id?: string) => (id === w.mandate.mandateId ? w.mandate.title : w.mandates.find((m) => m.id === id)?.title ?? 'this role');
export function payBand(w: World, mandateId?: string) {
  const job = w.jobs.find((j) => j.mandateId === mandateId);
  if (job && job.pay !== 'Not stated') return job.pay.replace(/\s*\/\s*month/, ' a month');
  const m = w.mandates.find((x) => x.id === mandateId);
  if (!m) return undefined;
  const k = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}m` : `${Math.round(n / 1e3)}k`);
  return `₦${k(m.pay.min)}–₦${k(m.pay.max)} a ${m.pay.period}`;
}
export function entryFor(w: World, personId: string, orgId?: string) {
  const ids = new Set(mandatesOf(w, orgId).map((m) => m.id));
  return w.pipeline.find((p) => p.personId === personId && ids.has(p.mandateId));
}
export function defaultPanel(w: World, actor: Actor, mandateId?: string) {
  const eng = mandatesOf(w, actor.orgId).find((m) => m.id === mandateId)?.engineering;
  const mem = orgMembers(w, actor.orgId);
  if (eng) {
    const hm = mem.find((a) => a.role === 'HIRING_MANAGER' && /engineering manager/i.test(a.title)) ?? mem.find((a) => a.role === 'HIRING_MANAGER');
    const eng2 = mem.find((a) => a.role === 'INTERVIEWER');
    return [hm?.id, eng2?.id].filter(Boolean) as string[];
  }
  return [actor.id];
}

// ---------------- Guidelines ----------------
export const guidesOf = (w: World, orgId?: string): Guide[] => (orgId ? hc(w).guides[orgId] ?? [] : []);
export const guide = (w: World, orgId: string | undefined, check: Guide['check']) => guidesOf(w, orgId).find((g) => g.on && g.check === check);
export function interviewHours(w: World, orgId?: string): [number, number] {
  const g = guide(w, orgId, 'HOURS');
  const m = g?.text.match(/(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})/);
  return m ? [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])] : [9 * 60, 17 * 60];
}
export const guideChip = (g: Guide) => `Kora guideline v${g.v}: ${g.text.length > 46 ? `${g.text.slice(0, 44)}…` : g.text}`;
/** Sync the org's plain-text guidelines (read by other areas) with the structured list. */
export function syncOrgGuidelines(w: World, orgId: string) {
  const o = w.orgs.find((x) => x.id === orgId); if (!o) return;
  o.guidelines = (hc(w).guides[orgId] ?? []).filter((g) => g.on).map((g) => `${g.text} (${g.source})`);
}
export function markUsed(w: World, orgId: string | undefined, checks: Guide['check'][], where: string) {
  if (!orgId) return;
  for (const g of hcw(w).guides[orgId] ?? []) if (g.on && checks.includes(g.check)) { g.used += 1; g.lastUsed = where; }
}

// ---------------- Calendar ----------------
const overlaps = (e: { start: string; end: string }, s: string, en: string) => new Date(e.start).getTime() < new Date(en).getTime() && new Date(s).getTime() < new Date(e.end).getTime();
export function busyAt(w: World, id: string, start: string, end: string, exclude: string[] = []) {
  return w.calendar.find((e) => e.status !== 'CANCELLED' && !exclude.includes(e.id) && e.attendees.includes(id) && overlaps(e, start, end));
}
export interface FindOpts { attendees: string[]; personId?: string; dates: string[]; orgId?: string; preferHM?: string; part?: 'morning' | 'afternoon'; exclude?: string[]; limit?: number; dur?: number; perDay?: number }
export function findSlots(w: World, o: FindOpts): Slot[] {
  const [h0, h1] = interviewHours(w, o.orgId); const dur = o.dur ?? 45;
  const lead = simNow(w).getTime() + 18 * 36e5;
  const all = [...o.attendees, ...(o.personId ? [o.personId] : [])];
  const out: Slot[] = [];
  // Offer a spread: at most two times a day when several days are open, so people can pick a day that suits.
  const perDay = o.perDay ?? (o.dates.length > 1 && !o.preferHM ? 2 : 99);
  for (const date of o.dates) {
    if (weekday(date) === 0 || weekday(date) === 6) continue;
    let today0 = 0;
    for (let t = h0; t + dur <= h1 && today0 < perDay; t += 30) {
      const start = lagosAt(date, hm(t)); const end = new Date(new Date(start).getTime() + dur * 6e4).toISOString();
      if (new Date(start).getTime() < lead) continue;
      if (all.some((id) => busyAt(w, id, start, end, o.exclude))) continue;
      const notes = all.map((id) => { const tz = tzOf(w, id); const m = minsIn(start, tz); return { id, name: firstOf(w, id), tz, local: tTime(start, tz), early: m < 9 * 60 || m + dur > 18 * 60 }; });
      if (notes.some((n) => n.early)) continue;
      if (o.part && o.personId) { const m = minsIn(start, tzOf(w, o.personId)); if (o.part === 'morning' ? m >= 12 * 60 : m < 12 * 60) continue; }
      out.push({ start, end, notes }); today0++;
    }
  }
  if (o.preferHM) out.sort((a, b) => Number(tTime(b.start, LAGOS) === o.preferHM) - Number(tTime(a.start, LAGOS) === o.preferHM));
  return out.slice(0, o.limit ?? 4);
}

// ---------------- Threads and drafts ----------------
export const allMsgs = (w: World) => w.threads.flatMap((t) => t.messages.map((m) => ({ t, m })));
export const findMsg = (w: World, id: string) => { for (const t of w.threads) { const m = t.messages.find((x) => x.id === id); if (m) return { t, m }; } return undefined; };
export const latestV = (d: DraftMeta) => d.versions[d.versions.length - 1];
export const OPEN_DRAFT: Msg['status'][] = ['DRAFT', 'AWAITING_APPROVAL'];
export function threadFor(w: World, orgId: string, personId: string, mandateId?: string): Thread {
  let t = w.threads.find((x) => x.orgId === orgId && x.personId === personId && (!mandateId || !x.mandateId || x.mandateId === mandateId));
  if (!t) { t = { id: uid('t'), orgId, personId, mandateId, messages: [] }; w.threads.push(t); }
  return t;
}
/** Has the organisation already sent this person anything? (pay band goes in the first message) */
/** Direction comes from the sender, not the status (RECEIVED is used by some seeds for delivered outgoing messages). */
export const delivered = (m: Msg) => m.status === 'SENT_SIMULATED' || m.status === 'RECEIVED';
export const fromCandidate = (m: Msg, personId: string) => m.from === personId;
export const firstMessage = (w: World, orgId: string, personId: string) => !w.threads.some((t) => t.orgId === orgId && t.personId === personId && t.messages.some((m) => m.from !== personId && (delivered(m) || m.status === 'QUEUED_OFFLINE')));
/** The draft Q is working on with this person: the frame's, else their newest open draft in this org. */
export function currentDraft(w: World, actor: Actor, frameMsg?: string, personId?: string): DraftMeta | undefined {
  const drafts = hc(w).drafts;
  const open = (id: string) => { const f0 = findMsg(w, id); return f0 && OPEN_DRAFT.includes(f0.m.status); };
  if (frameMsg && drafts[frameMsg] && open(frameMsg) && (!personId || drafts[frameMsg].personId === personId)) return drafts[frameMsg];
  // Without a named person, only this person's own drafts count: never pick up a colleague's draft silently.
  const list = Object.values(drafts).filter((d) => d.orgId === actor.orgId && open(d.msgId) && (personId ? d.personId === personId : d.by === actor.id || latestV(d).by === actor.id));
  return list.sort((a, b) => latestV(b).at.localeCompare(latestV(a).at))[0];
}

export function compose(w: World, d: Pick<DraftMeta, 'kind' | 'tone' | 'slot' | 'panel' | 'mandateId' | 'personId' | 'orgId' | 'by'> & { options?: DraftMeta['options'] }): { subject: string; body: string } {
  const p = personOf(w, d.personId)!; const first = p.name.split(' ')[0]; const tz = p.timezone;
  const org = orgOf(w, d.orgId)?.name ?? 'our team'; const title = mandateTitle(w, d.mandateId);
  const sender = w.actors.find((a) => a.id === d.by) ?? actorOf(w);
  const band = guide(w, d.orgId, 'PAY_BAND') && firstMessage(w, d.orgId, d.personId) && d.kind !== 'REJECTION' ? payBand(w, d.mandateId) : undefined;
  const one = (st: string) => `${slotText(st, tz)} (${city(tz)} time${offsetOf(st, tz) !== offsetOf(st, LAGOS) ? `, ${tTime(st, LAGOS)} in Lagos` : ''})`;
  const opts = d.options ?? [];
  const when = d.slot ? (opts.length ? `either ${[d.slot, ...opts].map((o) => one(o.start)).join(' or ')}` : one(d.slot.start)) : 'a time that suits you';
  const panel = listNames(d.panel.filter((x) => x !== d.personId).sort((x, y) => Number(x === d.by) - Number(y === d.by)).map((id) => { if (id === d.by) return 'me'; const a = w.actors.find((x) => x.id === id); return a ? `${a.name} (${a.title}${a.timezone !== LAGOS ? `, joining from ${city(a.timezone)}` : ''})` : nameOf(w, id); }));
  const t = d.tone; const friendly = t === 'friendlier';
  const hi = friendly || t === 'shorter' ? `Hi ${first},` : `Dear ${first},`;
  const sign = friendly ? `Warm wishes,\n${sender.first}\n${org}` : t === 'shorter' ? `${sender.first}, ${org}` : `${t === 'formal' ? 'Yours sincerely' : 'Kind regards'},\n${sender.name}\n${sender.title}, ${org}`;
  const bandLine = band ? (friendly ? `So you have it up front: the pay band for this role is ${band}.` : `The pay band for this role is ${band}.`) : '';
  const parts: string[] = [hi];
  let subject = `Interview: ${title} at ${org}`;
  if (d.kind === 'INVITE') {
    if (t === 'shorter') parts.push(`Could you do a 45-minute video interview for the ${title} role on ${when}, with ${panel}? ${band ? `Pay band: ${band}. ` : ''}Reply to confirm or suggest another time.`);
    else {
      parts.push(friendly ? `Thanks so much for your interest in the ${title} role at ${org}. We’d love to meet you! Would ${when} work for a relaxed 45-minute video chat with ${panel}?`
        : `Thank you for your interest in the ${title} role at ${org}. We would like to invite you to a 45-minute video interview on ${when} with ${panel}.`);
      if (bandLine) parts.push(bandLine);
      parts.push(friendly ? 'If that time doesn’t suit, just reply with what works better and we’ll find another. And if anything would make the interview easier for you, tell us.'
        : 'Please reply to confirm this time, or suggest another time that suits you better. If you need any adjustments for the interview, let us know.');
    }
  } else if (d.kind === 'RESCHEDULE') {
    subject = `New interview time: ${title} at ${org}`;
    parts.push(`${friendly || t === 'neutral' ? 'Thanks for letting us know. ' : ''}We’ve found a new time for your ${title} interview: ${when}, still with ${panel}.`);
    if (bandLine) parts.push(bandLine);
    parts.push('Please reply to confirm it works, or suggest another time. Your earlier time is released.');
  } else if (d.kind === 'FOLLOW_UP') {
    subject = `Following up: ${title} at ${org}`;
    parts.push(`Just checking you saw our message about the ${title} role${d.slot ? `. We’d still like to meet you on ${when}` : ''}. If that time doesn’t work, reply with one that does, or tell us if you’d rather not go ahead; either is fine.`);
    if (bandLine) parts.push(bandLine);
  } else if (d.kind === 'AVAILABILITY') {
    subject = `Next step: ${title} at ${org}`;
    parts.push(`Thank you for your interest in the ${title} role at ${org}. The next step is a 45-minute video interview with ${panel}.`);
    parts.push('Could you reply with two or three times that suit you this week or next? We’ll confirm one, in your time zone.');
    if (bandLine) parts.push(bandLine);
  } else if (d.kind === 'CONFIRMATION') {
    subject = `Confirmed: ${title} interview at ${org}`;
    parts.push(`Thank you for confirming. Your interview is booked for ${d.slot ? one(d.slot.start) : 'the time you chose'}, by video, with ${panel}. The calendar invitation follows separately.`);
    parts.push('If anything changes, just reply to this email.');
  } else if (d.kind === 'REPLY') {
    subject = `Re: your application for ${title}`;
    parts.push(`Thank you for your message and for sharing your work. The ${title} team is reviewing applications now, and we’ll update you here as soon as there’s news about next steps.`);
    if (bandLine) parts.push(bandLine);
  } else {
    subject = `Your application for ${title} at ${org}`;
    parts.push(`Thank you for the time you put into your application for the ${title} role at ${org}. After careful review, we won’t be moving forward with your application for this role.`);
    parts.push('This decision is about this role’s current needs, not a judgement of you. If you’d like feedback, reply and we’ll share what we can. You can also ask us to delete the information we hold about you at any time.');
    if (!friendly) parts.push('We wish you well with your search.');
  }
  parts.push(sign);
  return { subject, body: parts.join('\n\n') };
}

export const KIND_LABEL: Record<DraftKind, string> = { INVITE: 'interview invitation', RESCHEDULE: 'new interview time', FOLLOW_UP: 'follow-up', REJECTION: 'decision message', REPLY: 'reply', AVAILABILITY: 'next-step email', CONFIRMATION: 'confirmation' };

/** Create a draft (status DRAFT) in the person's thread. Returns the message id. */
export function createDraft(w: World, actor: Actor, o: { id?: string; personId: string; kind: DraftKind; tone?: Tone; slot?: { start: string; end: string }; panel?: string[]; mandateId?: string; reason?: string; eventId?: string; options?: { start: string; end: string }[]; channel?: Msg['channel']; senderId?: string; batchId?: string; template?: string; threadId?: string }) {
  const mandateId = o.mandateId ?? entryFor(w, o.personId, actor.orgId)?.mandateId;
  const meta: DraftMeta = { msgId: o.id ?? uid('msg'), threadId: '', personId: o.personId, orgId: actor.orgId!, kind: o.kind, by: actor.id, tone: o.tone ?? 'neutral', slot: o.slot, panel: o.panel ?? defaultPanel(w, actor, mandateId), mandateId, versions: [], reason: o.reason, eventId: o.eventId, options: o.options, batchId: o.batchId, template: o.template };
  const { subject, body } = compose(w, meta);
  const t = (o.threadId && w.threads.find((x) => x.id === o.threadId)) || threadFor(w, actor.orgId!, o.personId, mandateId);
  meta.threadId = t.id;
  meta.campaignId = t.campaignId ?? (mandateId ? campaignOf(w, mandateId, actor.orgId)?.id : undefined);
  const channel = o.channel ?? 'EMAIL';
  const senderId = channel === 'EMAIL' ? (o.senderId ?? defaultSender(w, actor, actor.orgId!, mandateId)?.id) : undefined;
  meta.versions.push({ v: 1, at: now(), by: actor.id, subject, body, note: `First draft (${KIND_LABEL[o.kind]})`, slot: meta.slot, tone: meta.tone, panel: [...meta.panel] });
  t.messages.push({ id: meta.msgId, from: actor.id, to: o.personId, subject, body, at: now(), status: 'DRAFT', channel, senderId });
  hcw(w).drafts[meta.msgId] = meta;
  markUsed(w, actor.orgId, ['PAY_BAND', 'PANEL_TWO', 'HOURS'], `Draft to ${firstOf(w, o.personId)}`);
  emit(w, actor.id, 'message.drafted', `ORG:${actor.orgId}`, `${actor.name} drafted a ${KIND_LABEL[o.kind]} to ${nameOf(w, o.personId)} with Q.`, { msgId: meta.msgId });
  return meta.msgId;
}

/** Add a new version to a draft. A changed draft needs checking (and approving) again. */
export function reviseDraft(w: World, actor: Actor, msgId: string, change: { slot?: { start: string; end: string }; tone?: Tone; panel?: string[]; body?: string; subject?: string; note: string; addBand?: boolean }) {
  const d = hcw(w).drafts[msgId]; const f0 = findMsg(w, msgId); if (!d || !f0) return undefined;
  const prev = latestV(d);
  const oldSlotText = d.slot ? slotText(d.slot.start, personOf(w, d.personId)!.timezone) : undefined;
  if (change.slot) d.slot = change.slot; if (change.tone) d.tone = change.tone; if (change.panel) d.panel = change.panel;
  let { subject, body } = { subject: change.subject ?? prev.subject, body: change.body ?? prev.body };
  if (change.body === undefined) {
    if (!prev.manual || change.tone) ({ subject, body } = compose(w, d));
    else if (change.slot && oldSlotText) {
      // A hand-written draft: swap just the date and time, in the candidate's own time zone.
      const tz = personOf(w, d.personId)!.timezone; const st = change.slot.start;
      const phrase = `${slotText(st, tz)} (${city(tz)} time${offsetOf(st, tz) !== offsetOf(st, LAGOS) ? `, ${tTime(st, LAGOS)} in Lagos` : ''})`;
      const re = /\b(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d{1,2} \w+ at \d{1,2}:\d{2}(?: \([^)]*\))?/;
      body = re.test(body) ? body.replace(re, phrase) : body.replace(oldSlotText, phrase);
    }
    if (change.addBand) { const band = payBand(w, d.mandateId); if (band && !body.includes(band)) { const ps = body.split('\n\n'); ps.splice(Math.max(1, ps.length - 2), 0, `The pay band for this role is ${band}.`); body = ps.join('\n\n'); } }
  }
  d.versions.push({ v: prev.v + 1, at: now(), by: actor.id, subject, body, note: change.note, manual: change.body !== undefined ? true : prev.manual && !change.tone, slot: d.slot, tone: d.tone, panel: [...d.panel] });
  f0.m.body = body; f0.m.subject = subject; f0.m.status = 'DRAFT'; f0.m.at = now();
  d.checks = undefined; d.checkedV = undefined;
  voidApproval(w, d, f0.m, change.note);
  if (d.eventId && change.slot) { const e = w.calendar.find((x) => x.id === d.eventId && x.status === 'HOLD'); if (e) { e.start = change.slot.start; e.end = change.slot.end; } }
  emit(w, actor.id, 'message.revised', `ORG:${d.orgId}`, `${actor.name} revised the draft to ${nameOf(w, d.personId)} (v${prev.v + 1}: ${change.note}).`, { msgId });
  return d.versions[d.versions.length - 1];
}

/** A material edit voids the approval of the old content, and the old idempotency key with it (E01-08). */
export function voidApproval(w: World, d: DraftMeta, m: Msg, why: string) {
  if (!m.approvedHash || m.approvedHash === contentHash(m)) return;
  if (d.approval && !d.approval.voided) d.approval.voided = why;
  m.approvedHash = undefined; m.idempotencyKey = undefined; m.approvedBy = undefined;
  if (m.delivery === 'FAILED' || m.delivery === 'QUEUED') { m.delivery = undefined; m.failReason = undefined; }
  d.scheduledFor = undefined;
  emit(w, 'system', 'email.approval.voided', `ORG:${d.orgId}`, `The approval of the email to ${nameOf(w, d.personId)} no longer applies: the content changed (${why}).`, { msgId: m.id });
}

// ---------------- Pre-send checks ----------------
const NOT_JOB_RELATED = /\b(how old|your age|married|marital|husband|wife|religion|church|mosque|state of origin|tribe|pregnan\w*|children)\b/i;
export function runChecks(w: World, actor: Actor, msgId: string): Check[] {
  const d = hc(w).drafts[msgId]; const f0 = findMsg(w, msgId); if (!d || !f0) return [];
  const o = orgOf(w, d.orgId)!; const p = personOf(w, d.personId)!; const pFirst = p.name.split(' ')[0];
  const out: Check[] = [];
  out.push(...emailChecks(w, actor, d, f0.m));
  // Approval and delegation
  const role = actor.role ?? 'VIEWER';
  if (o.delegation === 'DRAFT_ONLY') out.push({ id: 'deleg', group: 'Approval', label: 'What Q may do alone', ok: false, detail: `${o.name} is set to “draft only”: Q writes, people send it themselves. An admin can change this on Organisation and policy.` });
  else out.push({ id: 'deleg', group: 'Approval', label: 'What Q may do alone', ok: true, detail: o.delegation === 'APPROVE_EACH_SEND' ? 'Approve each send: this message goes only after an explicit yes.' : 'Approved campaign: still shown to you before it goes.' });
  out.push(CAN_SEND.includes(role)
    ? { id: 'role', group: 'Approval', label: 'Who can approve', ok: true, detail: `${actor.first} is ${ROLE_LABEL[role].toLowerCase()} and may approve sends.${d.by !== actor.id ? ` Drafted by ${firstOf(w, d.by)}.` : ''}` }
    : { id: 'role', group: 'Approval', label: 'Who can approve', ok: false, detail: `${actor.first} is ${ROLE_LABEL[role].toLowerCase()}: can draft, but an admin or recruiter must approve. It’s waiting for ${listNames(orgMembers(w, d.orgId).filter((a) => a.role === 'ADMIN').map((a) => a.first))}.` });
  // Candidate availability and time zone
  if (d.slot) {
    const m = minsIn(d.slot.start, p.timezone);
    const req = hc(w).reschedules.find((r) => r.personId === p.personId && !r.handled);
    const reqOk = !req || ((!req.days.length || req.days.includes(dateIn(d.slot.start, LAGOS))) && (!req.part || (req.part === 'morning' ? m < 720 : m >= 720)));
    const inPast = new Date(d.slot.start).getTime() < simNow(w).getTime() + 12 * 36e5;
    const ok = m >= 8 * 60 && m + 45 <= 19 * 60 && !busyAt(w, p.personId, d.slot.start, d.slot.end, d.eventId ? [d.eventId] : []) && reqOk && !inPast;
    out.push({ id: 'cand', group: 'Candidate', label: `${pFirst}’s time and time zone`, ok, detail: ok ? `${tDay(d.slot.start, p.timezone)}, ${tTime(d.slot.start, p.timezone)} ${city(p.timezone)} time (${tzNote(p.timezone, d.slot.start)}).${req ? ` Matches what ${pFirst} asked for.` : ''}`
      : inPast ? 'That time has already passed or is too soon to give notice.' : !reqOk ? `${pFirst} asked for “${req!.text}”. This time doesn’t match.` : `${tTime(d.slot.start, p.timezone)} is outside reasonable hours for ${pFirst} in ${city(p.timezone)}, or clashes with an interview they already have.` });
  }
  // Calendar
  if (d.slot) {
    const exclude = d.eventId ? [d.eventId] : [];
    const clash = d.panel.map((id) => ({ id, e: busyAt(w, id, d.slot!.start, d.slot!.end, exclude) })).filter((x) => x.e);
    if (clash.length) {
      const alt = findSlots(w, { attendees: d.panel, personId: d.personId, dates: [dateIn(d.slot.start, LAGOS), ...nextWeek(w)].filter((x, i, a) => a.indexOf(x) === i), orgId: d.orgId, exclude, limit: 1 })[0];
      out.push({ id: 'cal', group: 'Calendar', label: 'Everyone is free', ok: false, detail: `${listNames(clash.map((x) => firstOf(w, x.id)))} ${clash.length === 1 ? 'is' : 'are'} now busy at ${tDay(d.slot.start, LAGOS)} ${tTime(d.slot.start, LAGOS)}${clash.some((x) => x.e!.id.startsWith('taken')) ? ' (the calendar changed after I proposed it)' : ''}.${alt ? ` Next time that works for everyone: ${tDay(alt.start, LAGOS)} ${tTime(alt.start, LAGOS)} Lagos.` : ''}`,
        fix: alt ? { label: `Use ${tDay(alt.start, LAGOS)} ${tTime(alt.start, LAGOS)}`, op: 'hire-c.fix', args: { msgId, what: 'slot', start: alt.start, end: alt.end } } : undefined });
    } else out.push({ id: 'cal', group: 'Calendar', label: 'Everyone is free', ok: true, detail: `${listNames(d.panel.map((id) => `${firstOf(w, id)} ${tTime(d.slot!.start, tzOf(w, id))} ${city(tzOf(w, id))}`))}: free (busy times only, never meeting details).` });
  }
  // Guidelines
  const body = f0.m.body;
  for (const g of guidesOf(w, d.orgId).filter((x) => x.on && x.check !== 'NONE')) {
    if (g.check === 'PAY_BAND') {
      if (d.kind === 'REJECTION') continue;
      const first = firstMessage(w, d.orgId, d.personId); const band = payBand(w, d.mandateId);
      const ok = !first || !band || body.includes(band);
      out.push({ id: g.id, group: 'Guidelines', label: g.text, ok, detail: ok ? (first ? `Included: ${band}.` : 'Not the first message, so not needed.') : `This is the first message to ${pFirst} and it doesn’t name the pay band (${band}).`, fix: ok ? undefined : { label: 'Add the pay band', op: 'hire-c.fix', args: { msgId, what: 'band' } } });
    } else if (g.check === 'PANEL_TWO' && (d.kind === 'INVITE' || d.kind === 'RESCHEDULE')) {
      const eng = mandatesOf(w, d.orgId).find((m) => m.id === d.mandateId)?.engineering;
      if (!eng) continue;
      const ok = d.panel.length >= 2;
      out.push({ id: g.id, group: 'Guidelines', label: g.text, ok, detail: ok ? `Panel: ${listNames(d.panel.map((id) => firstOf(w, id)))}.` : 'Only one interviewer is on this panel.', fix: ok ? undefined : { label: 'Add a second interviewer', op: 'hire-c.fix', args: { msgId, what: 'panel' } } });
    } else if (g.check === 'HOURS' && d.slot) {
      const [h0, h1] = interviewHours(w, d.orgId); const m = minsIn(d.slot.start, LAGOS);
      const asked = hc(w).reschedules.some((r) => r.personId === d.personId && !r.handled);
      const ok = (m >= h0 && m + 45 <= h1) || asked;
      out.push({ id: g.id, group: 'Guidelines', label: g.text, ok, detail: ok ? `${tTime(d.slot.start, LAGOS)}–${tTime(d.slot.end, LAGOS)} Lagos.${asked && !(m >= h0 && m + 45 <= h1) ? ' Outside usual hours, but the candidate asked.' : ''}` : `${tTime(d.slot.start, LAGOS)} Lagos is outside interview hours.` });
    } else if (g.check === 'JOB_RELATED') {
      const ok = !NOT_JOB_RELATED.test(body);
      out.push({ id: g.id, group: 'Guidelines', label: g.text, ok, detail: ok ? 'Nothing personal or non-job-related in the wording.' : 'The wording asks about something that isn’t job-related. Remove it before sending.' });
    } else if (g.check === 'APPROVE_EACH') out.push({ id: g.id, group: 'Guidelines', label: g.text, ok: true, detail: 'I’ll ask for your yes on this exact version.' });
  }
  // D1: unverified organisations have a weekly allowance; show what's left as a check.
  const al = allowance(w, d.orgId);
  if (!al.verified) out.push(al.left > 0
    ? { id: 'allowance', group: 'Approval', label: 'Weekly message allowance', ok: true, detail: `${al.left} of ${al.limit} messages left this week (unverified). Verifying ${o.name} lifts the limit. The candidate will see “${UNVERIFIED_LINE}”` }
    : { id: 'allowance', group: 'Approval', label: 'Weekly message allowance', ok: false, detail: `0 of ${al.limit} messages left this week (unverified).${al.resetsAt ? ` The next one frees up on ${tDay(al.resetsAt, LAGOS)}.` : ''} Verifying ${o.name} lifts the limit.` });
  // Consent
  const c = w.consents[d.personId];
  if (c?.withdrawnFrom.includes(d.orgId)) out.push({ id: 'consent', group: 'Consent', label: `${pFirst}’s contact consent`, ok: false, detail: `${pFirst} withdrew consent for ${o.name} to contact them. This can’t be sent.` });
  else {
    const ch = f0.m.channel; const allowed = ch === 'EMAIL' ? c?.notifications.email : ch === 'SMS' ? c?.notifications.sms : c?.notifications.inApp;
    const alt = c?.notifications.email ? 'EMAIL' : c?.notifications.inApp ? 'IN_APP' : c?.notifications.sms ? 'SMS' : undefined;
    out.push(allowed !== false ? { id: 'consent', group: 'Consent', label: `${pFirst}’s notification choices`, ok: true, detail: `${pFirst} accepts ${ch === 'EMAIL' ? 'email' : ch === 'SMS' ? 'text messages' : 'messages in Talent Q'}.` }
      : { id: 'consent', group: 'Consent', label: `${pFirst}’s notification choices`, ok: false, detail: `${pFirst} has turned ${ch === 'EMAIL' ? 'email' : ch === 'SMS' ? 'text messages' : 'in-app messages'} off.${alt ? '' : ' No channel is allowed.'}`, fix: alt ? { label: `Send ${alt === 'IN_APP' ? 'in Talent Q' : alt === 'EMAIL' ? 'by email' : 'by text'} instead`, op: 'hire-c.fix', args: { msgId, what: 'channel', channel: alt } } : undefined });
  }
  return out;
}
export const checksPass = (cs: Check[]) => cs.every((c) => c.ok);
/** Run the checks and record them. The "slot taken after proposing" test scenario fires here, once. */
export function checkDraft(w: World, actor: Actor, msgId: string) {
  const d = hcw(w).drafts[msgId]; const f0 = findMsg(w, msgId); if (!d || !f0) return { checks: [] as Check[], queuedForApproval: false, pass: false };
  if (w.scenarios.slotTakenAfterProposal && d.slot) {
    const who = d.panel[d.panel.length - 1];
    w.calendar.push({ id: uid('taken'), orgId: d.orgId, title: 'Busy', start: d.slot.start, end: d.slot.end, attendees: [who], status: 'CONFIRMED', simulated: true });
    w.scenarios.slotTakenAfterProposal = false;
    emit(w, who, 'calendar.changed', `ORG:${d.orgId}`, `${nameOf(w, who)}’s calendar became busy at ${tDay(d.slot.start, LAGOS)} ${tTime(d.slot.start, LAGOS)} (simulated).`);
  }
  const checks = runChecks(w, actor, msgId);
  d.checks = checks; d.checkedAt = now(); d.checkedV = latestV(d).v;
  const others = checks.filter((c) => c.id !== 'role');
  const pass = checksPass(checks);
  const queuedForApproval = !pass && checksPass(others);
  f0.m.status = pass || queuedForApproval ? 'AWAITING_APPROVAL' : 'DRAFT';
  markUsed(w, d.orgId, checks.filter((c) => c.group === 'Guidelines').map((c) => guidesOf(w, d.orgId).find((g) => g.id === c.id)?.check ?? 'NONE'), `Checks for ${firstOf(w, d.personId)}`);
  emit(w, actor.id, 'message.checked', `ORG:${d.orgId}`, `Q checked the draft to ${nameOf(w, d.personId)} (v${latestV(d).v}): ${pass ? 'ready for approval' : queuedForApproval ? 'waiting for an approver' : `${checks.filter((c) => !c.ok).length} to fix`}.`, { msgId });
  return { checks, queuedForApproval, pass };
}

/** The simulated send: status, receipt, calendar invite, interview record, pipeline. Never a real send. */
// ---------------- Unverified organisations (founder decision D1) ----------------
export const UNVERIFIED_LINE = 'This employer isn’t verified yet on Talent Q.';
/** Weekly outreach allowance. Verified organisations have no cap; unverified ones get orgLimits().outreachPerWeek
 *  messages in any rolling 7 days, and the oldest send in the window decides when the next one frees up. */
export function allowance(w: World, orgId: string) {
  const lim = orgLimits(w, orgId);
  if (lim.verified) return { verified: true as const, limit: Infinity, used: 0, left: Infinity, resetsAt: undefined as string | undefined };
  const used = outreachThisWeek(w, orgId); const since = simNow(w).getTime() - 7 * 864e5;
  const sent = w.threads.filter((t) => t.orgId === orgId).flatMap((t) => t.messages).filter((m) => m.status === 'SENT_SIMULATED' && new Date(m.at).getTime() >= since && !m.from.startsWith('p_')).map((m) => m.at).sort();
  const resetsAt = sent[0] ? new Date(new Date(sent[0]).getTime() + 7 * 864e5).toISOString() : undefined;
  return { verified: false as const, limit: lim.outreachPerWeek, used, left: Math.max(0, lim.outreachPerWeek - used), resetsAt };
}
export function allowanceRefusal(w: World, orgId: string) {
  const al = allowance(w, orgId); if (al.verified || al.left > 0) return undefined;
  const org = orgOf(w, orgId)?.name ?? 'Your organisation';
  return `I haven’t sent it. ${org} isn’t verified yet, so it can send ${al.limit} messages to candidates a week, and all ${al.limit} are used: 0 left.${al.resetsAt ? ` The next one frees up on ${tDay(al.resetsAt, LAGOS)} at ${tTime(al.resetsAt, LAGOS)}.` : ''} Verifying ${org} (email domain and company registry) lifts the limit. The draft stays waiting; nothing was sent.`;
}

export function finalizeSend(w: World, msgId: string, approver: string) {
  const f0 = findMsg(w, msgId); const d = hcw(w).drafts[msgId]; if (!f0) return;
  const { t, m } = f0;
  m.status = 'SENT_SIMULATED'; m.at = now(); m.approvedBy = approver; m.receipt = `sim_${Math.random().toString(36).slice(2, 10)}`;
  const org = orgOf(w, t.orgId)!;
  // D1: every message from an unverified organisation carries the notice in its body, so it travels with it.
  if (!orgLimits(w, t.orgId).verified && !m.body.includes(UNVERIFIED_LINE)) m.body = `${m.body}\n\n— ${UNVERIFIED_LINE}`;
  if (d && d.slot && (d.kind === 'INVITE' || d.kind === 'RESCHEDULE')) {
    const title = `Interview: ${nameOf(w, d.personId)} (${mandateTitle(w, d.mandateId)})`;
    let ev = (d.eventId && w.calendar.find((e) => e.id === d.eventId)) || w.calendar.find((e) => e.personId === d.personId && e.orgId === d.orgId && e.status !== 'CANCELLED' && e.status !== 'HOLD' && e.title.startsWith('Interview'));
    if (!ev) { ev = { id: uid('ev'), orgId: d.orgId, title, start: d.slot.start, end: d.slot.end, attendees: [], status: 'INVITED', mandateId: d.mandateId, personId: d.personId, simulated: true }; w.calendar.push(ev); }
    ev.start = d.slot.start; ev.end = d.slot.end; ev.attendees = [...d.panel, d.personId]; ev.status = 'INVITED'; ev.title = title; ev.personId = d.personId; ev.mandateId = d.mandateId;
    d.eventId = ev.id;
    let iv = w.interviews.find((i) => i.personId === d.personId && i.orgId === d.orgId && i.status !== 'CANCELLED' && i.status !== 'DONE');
    if (!iv) { iv = { id: uid('iv'), orgId: d.orgId, mandateId: d.mandateId ?? '', personId: d.personId, panel: [], status: 'INVITED', feedback: [] }; w.interviews.push(iv); }
    iv.eventId = ev.id; iv.panel = [...d.panel]; iv.status = 'INVITED';
    const e = w.pipeline.find((p) => p.personId === d.personId && p.mandateId === d.mandateId);
    if (e && ['SOURCED', 'SHORTLISTED', 'CONTACTED', 'REPLIED'].includes(e.stage)) { e.stage = 'INTERVIEW'; e.at = now().slice(0, 10); e.by = approver; }
    for (const r of hcw(w).reschedules) if (r.personId === d.personId && !r.handled && d.kind === 'RESCHEDULE') r.handled = true;
  } else if (d) {
    const e = w.pipeline.find((p) => p.personId === d.personId && p.mandateId === d.mandateId);
    if (e && ['SOURCED', 'SHORTLISTED'].includes(e.stage) && d.kind !== 'REJECTION') { e.stage = 'CONTACTED'; e.at = now().slice(0, 10); e.by = approver; }
  }
  const app = w.applications.find((a) => a.personId === t.personId && w.jobs.find((j) => j.id === a.jobId)?.orgId === t.orgId);
  if (app) { app.timeline.push({ at: now().slice(0, 10), text: `${org.name} sent you a message: ${m.subject ?? 'message'}`, by: 'EMPLOYER' }); app.lastEmployerActivity = now().slice(0, 10); if (d?.kind === 'INVITE' && ['SUBMITTED', 'VIEWED'].includes(app.status)) app.status = 'INTERVIEW'; }
  emit(w, approver, 'message.sent', `SHARED:${t.orgId}:${t.personId}`, `${org.name} sent ${nameOf(w, t.personId)} a message (simulated): ${m.subject ?? ''}`, { msgId, receipt: m.receipt });
}

/** Approve a checked version. Offline: queue it (nothing is claimed as sent). */
export function approveAndSend(w: World, actor: Actor, msgId: string, v?: number): { ok: boolean; text: string } {
  const f0 = findMsg(w, msgId); const d = hc(w).drafts[msgId];
  if (!f0 || !d) return { ok: false, text: 'I can’t find that draft any more. It may have been discarded.' };
  const pFirst = firstOf(w, d.personId);
  if (f0.m.status === 'SENT_SIMULATED') { if (f0.m.channel === 'EMAIL' && f0.m.acceptedAt) return { ok: false, text: providerSend(w, actor, msgId).text }; return { ok: false, text: `That message to ${pFirst} was already sent (simulated). I won’t send it twice.` }; }
  if (f0.m.status === 'QUEUED_OFFLINE') return { ok: false, text: `It’s already queued and will go when you’re back online.` };
  if (!CAN_SEND.includes(actor.role ?? 'VIEWER')) return { ok: false, text: `Only an admin or recruiter can approve sends at ${orgOf(w, d.orgId)?.name}. I’ve left it waiting for approval; nothing was sent.` };
  if (f0.m.status !== 'AWAITING_APPROVAL' || (v !== undefined && latestV(d).v !== v) || d.checkedV !== latestV(d).v) return { ok: false, text: `This draft hasn’t been checked and approved in its current version, so I haven’t sent it. Say “send it” and I’ll check it again and ask for your yes.` };
  const over = allowanceRefusal(w, d.orgId); if (over) return { ok: false, text: over };
  if (w.network === 'offline') {
    f0.m.status = 'QUEUED_OFFLINE'; f0.m.approvedBy = actor.id;
    emit(w, actor.id, 'message.queued', `ORG:${d.orgId}`, `${actor.name} approved a message to ${nameOf(w, d.personId)} while offline; queued, not sent.`, { msgId });
    return { ok: true, text: `You’re offline, so nothing has been sent. Your approval is saved and the message to ${pFirst} is queued (status: queued offline). When you reconnect I’ll re-check the calendar and then send it.` };
  }
  // Approval binds to this exact content (recipients, subject, body, attachments, sender).
  const isMail = f0.m.channel === 'EMAIL' && !!f0.m.senderId && mailboxOf(w, f0.m.senderId)?.kind !== 'SERVICE';
  if (!f0.m.approvedHash || f0.m.approvedHash !== contentHash(f0.m)) { f0.m.approvedHash = contentHash(f0.m); hcw(w).drafts[msgId].approval = { by: actor.id, at: now(), hash: f0.m.approvedHash, v: latestV(d).v }; emit(w, actor.id, 'email.send.requested', `ORG:${d.orgId}`, `${actor.name} approved v${latestV(d).v} of the ${KIND_LABEL[d.kind]} to ${nameOf(w, d.personId)} (content ${f0.m.approvedHash}).`, { msgId }); }
  f0.m.approvedBy = actor.id;
  const sched = hc(w).drafts[msgId].scheduledFor;
  if (sched && new Date(sched).getTime() > simNow(w).getTime()) { f0.m.delivery = 'QUEUED'; return { ok: true, text: `Approved and scheduled for ${tDay(sched, LAGOS)} at ${tTime(sched, LAGOS)} (simulated). Nothing goes before then; you can cancel it until it goes.` }; }
  if (isMail) {
    const r = providerSend(w, actor, msgId);
    if (!r.ok) return { ok: false, text: r.text };
    finalizeSend(w, msgId, actor.id); markUsed(w, d.orgId, ['APPROVE_EACH', 'PAY_BAND', 'JOB_RELATED'], `Message to ${pFirst}`);
    if (r.reason === 'BOUNCED') return { ok: true, text: r.text };
    return { ok: true, text: `${r.text}${d.slot && (d.kind === 'INVITE' || d.kind === 'RESCHEDULE') ? ` The calendar invite is out to ${listNames(d.panel.map((id) => firstOf(w, id)))}, status “invited” until ${pFirst} confirms.` : ''}` };
  }
  finalizeSend(w, msgId, actor.id);
  markUsed(w, d.orgId, ['APPROVE_EACH', 'PAY_BAND', 'JOB_RELATED'], `Message to ${pFirst}`);
  const ch = f0.m.channel === 'EMAIL' ? 'by email' : f0.m.channel === 'SMS' ? 'by text' : 'in Talent Q';
  return { ok: true, text: `Simulated send: the ${KIND_LABEL[d.kind]} went to ${pFirst} ${ch}. Nothing really left Talent Q.${d.slot && (d.kind === 'INVITE' || d.kind === 'RESCHEDULE' || d.kind === 'FOLLOW_UP') ? ` The calendar invite is out to ${listNames(d.panel.map((id) => firstOf(w, id)))}, status “invited” until ${pFirst} confirms.` : ''}` };
}

/** Flush messages approved while offline: re-check the calendar first, then send. */
export function flushQueued(w: World) {
  const queued = allMsgs(w).filter((x) => x.m.status === 'QUEUED_OFFLINE');
  for (const { m, t } of queued) {
    if (m.from.startsWith('p_')) { m.status = 'RECEIVED'; m.at = now(); emit(w, m.from, 'message.received', `SHARED:${t.orgId}:${t.personId}`, `${nameOf(w, m.from)} sent a message (queued offline, delivered on reconnect).`); appendQ(w, m.from, { who: 'q', kind: 'notice', engine: 'system', text: `Back online: your message to ${orgOf(w, t.orgId)?.name} was delivered (simulated).` }); continue; }
    const d = hc(w).drafts[m.id]; const approver = m.approvedBy ?? actorOf(w).id;
    const clash = d?.slot ? d.panel.find((id) => busyAt(w, id, d.slot!.start, d.slot!.end, d.eventId ? [d.eventId] : [])) : undefined;
    const over = allowanceRefusal(w, t.orgId);
    if (over) { m.status = 'AWAITING_APPROVAL'; appendQ(w, approver, { who: 'q', kind: 'notice', engine: 'system', text: `Back online. ${over}` }); continue; }
    if (clash) { m.status = 'DRAFT'; appendQ(w, approver, { who: 'q', kind: 'notice', engine: 'system', text: `Back online. Before sending, I re-checked: ${firstOf(w, clash)} became busy at that time while you were offline, so I did not send the message to ${firstOf(w, t.personId)}. It’s back in drafts. Say “send it” to pick a new time.`, ref: { type: 'hire-c.draft', id: `${m.id}@${d ? latestV(d).v : 1}` } }); continue; }
    if (m.channel === 'EMAIL' && m.senderId && mailboxOf(w, m.senderId)?.kind !== 'SERVICE') {
      m.status = 'AWAITING_APPROVAL'; m.approvedHash ??= contentHash(m);
      const r = providerSend(w, actorOf(w, approver), m.id);
      if (!r.ok) { appendQ(w, approver, { who: 'q', kind: 'notice', engine: 'system', text: `Back online. ${r.text}` }); continue; }
      finalizeSend(w, m.id, approver);
      appendQ(w, approver, { who: 'q', kind: 'notice', engine: 'system', text: `Back online. I re-checked the calendar and sent the queued message to ${firstOf(w, t.personId)}. ${r.text}` });
      continue;
    }
    finalizeSend(w, m.id, approver);
    appendQ(w, approver, { who: 'q', kind: 'notice', engine: 'system', text: `Back online. I re-checked the calendar and sent the queued message to ${firstOf(w, t.personId)}. Simulated send (receipt ${m.receipt}).` });
  }
}

// ---------------- Pipeline ----------------
export function setStage(w: World, actor: Actor, mandateId: string, personId: string, stage: Stage, note?: string) {
  const e = w.pipeline.find((p) => p.personId === personId && p.mandateId === mandateId); if (!e) return undefined;
  const prev = { stage: e.stage, note: e.note, at: e.at, by: e.by };
  e.stage = stage; e.at = now().slice(0, 10); e.by = actor.id; e.note = note ?? e.note;
  emit(w, actor.id, 'pipeline.moved', `ORG:${actor.orgId}`, `${actor.name} moved ${nameOf(w, personId)} from ${STAGE_LABEL[prev.stage]} to ${STAGE_LABEL[stage]}${note ? ` (reason recorded internally)` : ''}.`, { mandateId, personId, from: prev.stage, to: stage });
  return prev;
}
export const STAGE_WORDS: [RegExp, Stage][] = [[/\binterview\w*\b/, 'INTERVIEW'], [/\bshort ?list\w*\b/, 'SHORTLISTED'], [/\bcontacted\b/, 'CONTACTED'], [/\brepl(ied|y)\b/, 'REPLIED'], [/\boffer\w*\b/, 'OFFER'], [/\bhired?\b/, 'HIRED'], [/\b(found|sourced|back to the start)\b/, 'SOURCED']];

// ---------------- Panel ----------------
export function changePanel(w: World, actor: Actor, interviewId: string, panel: string[]) {
  const iv = w.interviews.find((i) => i.id === interviewId); if (!iv) return undefined;
  const from = [...iv.panel]; iv.panel = [...panel];
  const ev = w.calendar.find((e) => e.id === iv.eventId);
  let holds = 'No time is booked yet.'; let ok = true;
  if (ev) {
    ev.attendees = [...panel, iv.personId];
    const busy = panel.filter((id) => !from.includes(id) && busyAt(w, id, ev.start, ev.end, [ev.id]));
    ok = !busy.length;
    holds = ok ? `Re-checked ${tDay(ev.start, LAGOS)} ${tTime(ev.start, LAGOS)}: ${listNames(panel.filter((id) => !from.includes(id)).map((id) => firstOf(w, id))) || 'everyone'} ${panel.filter((id) => !from.includes(id)).length > 1 ? 'are' : 'is'} free.` : `${listNames(busy.map((id) => firstOf(w, id)))} ${busy.length > 1 ? 'are' : 'is'} busy at ${tDay(ev.start, LAGOS)} ${tTime(ev.start, LAGOS)}: the time needs to move.`;
  }
  hcw(w).panelChanges.push({ id: uid('pc'), interviewId, personId: iv.personId, by: actor.id, at: now(), from, to: [...panel], holds, ok });
  emit(w, actor.id, 'interview.panel.changed', `ORG:${iv.orgId}`, `${actor.name} changed ${nameOf(w, iv.personId)}’s interview panel: ${listNames(from.map((id) => firstOf(w, id)))} → ${listNames(panel.map((id) => firstOf(w, id)))}. ${holds}`, { interviewId });
  return { from, holds, ok };
}

export type { Slot };
export const evStatusLabel: Record<CalEvent['status'], string> = { HOLD: 'Hold', INVITED: 'Invited', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled', RESCHEDULE_REQUESTED: 'Asked to move' };
export const msgStatusLabel: Record<Msg['status'], string> = { DRAFT: 'Draft', AWAITING_APPROVAL: 'Waiting for approval', QUEUED_OFFLINE: 'Queued offline', SENT_SIMULATED: 'Sent (simulated)', RECEIVED: 'Received', DISCARDED: 'Discarded' };

/** Word-level diff between two versions (for "show me what changed"). */
export function diffWords(a: string, b: string): { t: 'same' | 'add' | 'del'; s: string }[] {
  // Sentence-level: a rewrite in a new tone reads as whole sentences out and in, not confetti.
  const tok = (x: string) => x.match(/[^.!?\n]+[.!?]*[ \t]*|\n+/g) ?? [];
  const A = tok(a), B = tok(b);
  const n = A.length, m = B.length; const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: { t: 'same' | 'add' | 'del'; s: string }[] = []; let i = 0, j = 0;
  const push = (t: 'same' | 'add' | 'del', s: string) => { const l = out[out.length - 1]; if (l && l.t === t) l.s += s; else out.push({ t, s }); };
  while (i < n && j < m) { if (A[i] === B[j]) { push('same', A[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) push('del', A[i++]); else push('add', B[j++]); }
  while (i < n) push('del', A[i++]); while (j < m) push('add', B[j++]);
  return out;
}

// ---------------- Presentation helpers (pages and Q's cards) ----------------
export const CHANNEL_LABEL: Record<Msg['channel'], string> = { EMAIL: 'email', SMS: 'text message', IN_APP: 'Talent Q' };
/** "Fri 6 Nov, 10:00 Lagos · 09:00 London": the Lagos time first, then any other zone among the people involved. */
export function whenText(w: World, start: string, ids: string[]) {
  const zones = [...new Set(ids.map((id) => tzOf(w, id)))].filter((tz) => tz !== LAGOS && offsetOf(start, tz) !== offsetOf(start, LAGOS));
  return `${tDay(start, LAGOS)}, ${tTime(start, LAGOS)} Lagos${zones.map((tz) => ` · ${tTime(start, tz)} ${city(tz)}`).join('')}`;
}
/** Short names for guideline checks, for compact check lists. */
export const GUIDE_SHORT: Record<Guide['check'], string> = { PAY_BAND: 'Pay band named', PANEL_TWO: 'Panel of two', APPROVE_EACH: 'Approval before sending', JOB_RELATED: 'Job-related wording only', HOURS: 'Inside interview hours', NONE: 'Guidance' };
const TONE_LABEL: Record<Tone, string> = { neutral: 'Neutral', friendlier: 'Friendlier', formal: 'Formal', shorter: 'Shorter' };
/** What changed between two versions, as plain rows (the summary above a diff). */
export function versionChanges(w: World, d: DraftMeta, prev: DraftMeta['versions'][number], cur: DraftMeta['versions'][number]) {
  const rows: { k: string; from?: string; to: string }[] = [];
  const ids = [...(cur.panel ?? d.panel), d.personId];
  if (cur.slot && prev.slot?.start !== cur.slot.start) rows.push({ k: 'When', from: prev.slot ? whenText(w, prev.slot.start, ids) : undefined, to: whenText(w, cur.slot.start, ids) });
  if (cur.tone && prev.tone !== cur.tone) rows.push({ k: 'Tone', from: prev.tone ? TONE_LABEL[prev.tone] : undefined, to: TONE_LABEL[cur.tone] });
  if (cur.panel && prev.panel && cur.panel.join() !== prev.panel.join()) rows.push({ k: 'Panel', from: listNames(prev.panel.map((x) => firstOf(w, x))), to: listNames(cur.panel.map((x) => firstOf(w, x))) });
  const band = payBand(w, d.mandateId);
  if (band && cur.body.includes(band) && !prev.body.includes(band)) rows.push({ k: 'Pay band', to: `Added: ${band}` });
  if (prev.subject !== cur.subject) rows.push({ k: 'Subject', from: prev.subject, to: cur.subject });
  if (cur.manual && cur.note && !rows.length) rows.push({ k: 'Wording', to: cur.note });
  return rows;
}

/** A failing check as a short phrase for Q's sentence; the card carries the detail. */
export function problemOf(w: World, orgId: string, b: { id: string; group: string }, first: string) {
  const g = guidesOf(w, orgId).find((x) => x.id === b.id);
  if (g) return ({ PAY_BAND: 'the pay band is missing', PANEL_TWO: 'the panel has only one interviewer', HOURS: 'the time is outside interview hours', JOB_RELATED: 'some wording isn’t job-related', APPROVE_EACH: 'it needs approval', NONE: g.text.toLowerCase() } as const)[g.check];
  return ({ cal: 'someone on the panel is now busy', cand: `the time doesn’t suit ${first}`, role: 'it needs an approver', deleg: 'Q is set to draft only', allowance: 'this week’s message allowance is used up', consent: `${first}’s contact choices` } as Record<string, string>)[b.id] ?? b.group.toLowerCase();
}

