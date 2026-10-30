// HIRE-D logic (coverage build, 30 Oct). Pure reads of the one store plus the small writers the ops use.
// Sources: only permitted ones (pack 00 §5: permitted candidate submissions, employer-owned records, direct
// sign-ups, optional authorised evidence integrations; never unauthorised LinkedIn extraction).
import { actorOf, canDiscover, canSeeCandidate, emit, now, orgOf, personOf, relationshipWith, simNow, uid, visibleEvidence, type World } from '../../mock/world';
import type { Actor, CalEvent, Msg, OrgRole } from '../../state/domain';
import { hd, hdw, keyOf, type Availability, type Format, type HiringOutcome, type Offer, type ReminderDecision, type ReminderKind } from '../../state/areas/hire-d';
import { proof } from '../../state/areas/proof';
import { isSuppressed } from '../../state/areas/mail';
import { CAN_MOVE, CAN_SEND, dateIn, findSlots, firstOf, LAGOS, mandatesOf, mandateTitle, minsIn, nextWeek, orgMembers, payBand, tDay, threadFor, tTime, tzOf, weekday, type Slot } from '../hire-c/lib';
import { defaultSender } from '../hire-c/email';

export const SIM = 'simulated';
export const fmtDay = (iso: string) => tDay(iso.length === 10 ? `${iso}T12:00:00Z` : iso, LAGOS);
export const money = (n: number | null | undefined) => (n == null ? '—' : `₦${n >= 1e6 ? `${+(n / 1e6).toFixed(2)}m` : `${Math.round(n / 1e3)}k`}`);
export const can = (a: Actor, roles: OrgRole[]) => roles.includes(a.role ?? 'VIEWER');
export const daysBetween = (a: Date, b: string) => Math.round((new Date(b.length === 10 ? `${b}T12:00:00+01:00` : b).getTime() - a.getTime()) / 864e5);

// ---------------- SC-033 sources ----------------
export type SourceId = 'applicants' | 'shared' | 'discoverable' | 'registered' | 'records' | 'evidence';
export interface SourceDef { id: SourceId; label: string; basis: string; licence: string; freshness: (w: World, orgId: string) => { at: string; live: boolean }; agencyOnly?: boolean; employerOnly?: boolean; enrich?: boolean }
export const SOURCES: SourceDef[] = [
  { id: 'applicants', label: 'People who applied to your roles', basis: 'They applied to you', licence: 'Their own application, under Talent Q’s candidate terms', freshness: (w) => ({ at: simNow(w).toISOString(), live: true }) },
  { id: 'shared', label: 'People who shared evidence with you', basis: 'They chose to share with you', licence: 'Their share, until they stop it', freshness: (w) => ({ at: simNow(w).toISOString(), live: true }) },
  { id: 'discoverable', label: 'Talent Q members open to being found', basis: 'Their discovery setting includes you', licence: 'Their discovery consent; re-checked every time a result is shown', freshness: (w) => ({ at: simNow(w).toISOString(), live: true }) },
  { id: 'registered', label: 'People registered with your agency', basis: 'They registered with you', licence: 'Their agency registration', freshness: (w) => ({ at: simNow(w).toISOString(), live: true }), agencyOnly: true },
  { id: 'records', label: 'Your own past candidates', basis: 'Your organisation’s records', licence: 'Your data, under your retention policy (24 months)', freshness: () => ({ at: '2026-10-12T09:00:00+01:00', live: false }), employerOnly: true },
  { id: 'evidence', label: 'Evidence links candidates added', basis: 'Public repositories a candidate linked themselves', licence: 'Read only what the candidate linked', freshness: (w, o) => ({ at: hd(w).checkedAt[`evidence:${o}`] ?? '2026-10-27T08:00:00+01:00', live: false }), enrich: true },
];
/** Sources Talent Q does not use, said plainly (pack decision, 30 Oct). */
export const NOT_USED = [
  { id: 'linkedin', label: 'LinkedIn profiles', why: 'Not used. Talent Q never extracts or scrapes LinkedIn. A candidate can add their own LinkedIn link to their Passport, and it’s read as a claim.' },
  { id: 'lists', label: 'Bought lists and scraped web profiles', why: 'Not used. People on them never agreed to be found here.' },
  { id: 'peoplegraph', label: 'PeopleGraph (third-party directory)', why: 'Not used for new searches: a third-party directory isn’t a permitted source. Earlier search runs may still mention it.' },
];
export const sourcesFor = (w: World, orgId: string) => { const k = orgOf(w, orgId)?.kind; return SOURCES.filter((s) => !(s.agencyOnly && k !== 'AGENCY') && !(s.employerOnly && k !== 'EMPLOYER')); };
export const scopeOn = (w: World, orgId: string): SourceId[] => (hd(w).scope[orgId]?.on as SourceId[] | undefined) ?? sourcesFor(w, orgId).map((s) => s.id);
export const RECORDS_COUNT = 42;

/** Where Kora (or anyone) can see this person from. A person can be in several. */
export function sourcesOf(w: World, pid: string, orgId: string): SourceId[] {
  const out: SourceId[] = [];
  if (w.applications.some((a) => a.personId === pid && w.jobs.find((j) => j.id === a.jobId)?.orgId === orgId)) out.push('applicants');
  if (w.evidence.some((e) => e.ownerId === pid && e.visibility === 'SHARED_WITH' && e.sharedWith.includes(orgId) && !e.revokedFrom?.includes(orgId))) out.push('shared');
  if (w.consents[pid]?.registeredWith?.includes(orgId)) out.push('registered');
  if (canDiscover(w, pid, orgId)) out.push('discoverable');
  return out;
}
export function coverage(w: World, orgId: string, s: SourceId): number | null {
  if (s === 'records') return RECORDS_COUNT;
  if (s === 'evidence') return w.people.filter((p) => canSeeCandidate(w, p.personId, orgId) && visibleEvidence(w, p.personId, orgId).some((e) => /github|public repo/i.test(e.source))).length;
  return w.people.filter((p) => !w.consents[p.personId]?.withdrawnFrom.includes(orgId) && sourcesOf(w, p.personId, orgId).includes(s)).length;
}
export function freshness(w: World, orgId: string, s: SourceDef): { label: string; state: 'LIVE' | 'OK' | 'STALE' | 'ERROR' } {
  if (s.id === 'evidence' && hd(w).sourceDown) return { label: 'Couldn’t refresh: the repository host didn’t answer', state: 'ERROR' };
  const f = s.freshness(w, orgId);
  if (f.live) return { label: 'Live: checked each time a result is shown', state: 'LIVE' };
  const d = -daysBetween(simNow(w), f.at);
  return { label: `Last refreshed ${fmtDay(f.at)} (${d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`})`, state: d > 14 ? 'STALE' : 'OK' };
}

// ---------------- SC-034 / SC-046 explore and search ----------------
const STOP = new Set(['the', 'and', 'for', 'with', 'who', 'can', 'someone', 'people', 'find', 'any', 'in', 'or', 'a', 'an', 'of', 'to', 'explore', 'search', 'me', 'show', 'engineers', 'engineer', 'based']);
export const CITIES = ['lagos', 'abuja', 'kano', 'accra', 'nairobi', 'london', 'enugu', 'uyo', 'ibadan', 'port harcourt', 'remote'];
const RELATED: Record<string, string> = { rust: 'Go', kotlin: 'Go', mysql: 'Postgres', k8s: 'Kubernetes', react: 'APIs' };
export function terms(q: string) {
  const s = q.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ');
  const city = CITIES.filter((c) => new RegExp(`\\b${c}\\b`).test(s));
  let rest = s; city.forEach((c) => { rest = rest.replace(c, ' '); });
  const words = rest.split(/\s+/).filter((x) => x.length >= 2 && !STOP.has(x)).map((x) => x.replace(/s$/, ''));
  return { words: [...new Set(words)], city };
}
function hay(w: World, pid: string, orgId: string) {
  const p = personOf(w, pid); if (!p) return '';
  return [p.name, p.headline, ...visibleEvidence(w, pid, orgId).map((e) => `${e.title} ${e.shows}`)].join(' ').toLowerCase();
}
export interface Hit { pid: string; sources: SourceId[] }
/** People this organisation may see, from the sources it chose, matching every word (and the place, if named). */
export function search(w: World, orgId: string, q: string, on: SourceId[] = scopeOn(w, orgId), ignoreCity = false): Hit[] {
  const { words, city } = terms(q);
  if (!words.length && !city.length) return [];
  return w.people.filter((p) => canSeeCandidate(w, p.personId, orgId)).map((p) => ({ pid: p.personId, sources: sourcesOf(w, p.personId, orgId) }))
    .filter((h) => h.sources.some((s) => on.includes(s)))
    .filter((h) => { const t = hay(w, h.pid, orgId); return words.every((x) => t.includes(x)); })
    .filter((h) => ignoreCity || !city.length || city.some((c) => (c === 'remote' ? /remote/i.test(personOf(w, h.pid)!.location) : personOf(w, h.pid)!.location.toLowerCase().includes(c))));
}
/** Why a search found nobody, and what would help. Never counts or names people who chose not to be found. */
export function emptyReasons(w: World, orgId: string, q: string) {
  const { words, city } = terms(q); const on = scopeOn(w, orgId);
  const all = sourcesFor(w, orgId).map((s) => s.id);
  const reasons: string[] = []; const repairs: { label: string; query?: string; include?: SourceId }[] = [];
  const noCity = city.length ? search(w, orgId, q, on, true) : [];
  if (city.length && noCity.length) { reasons.push(`${noCity.length} ${noCity.length === 1 ? 'person matches' : 'people match'} the skills, but not in ${city.map((c) => c[0].toUpperCase() + c.slice(1)).join(' or ')}.`); repairs.push({ label: `Search without “${city.join(', ')}”`, query: words.join(' ') }); }
  const off = all.filter((s) => !on.includes(s));
  const offHits = off.length ? search(w, orgId, q, all) .filter((h) => !h.sources.some((s) => on.includes(s))) : [];
  if (offHits.length) { const src = off.find((s) => offHits.some((h) => h.sources.includes(s)))!; reasons.push(`${offHits.length} more ${offHits.length === 1 ? 'person is' : 'people are'} in a source you switched off (${SOURCES.find((s) => s.id === src)!.label.toLowerCase()}).`); repairs.push({ label: `Include ${SOURCES.find((s) => s.id === src)!.label.toLowerCase()}`, include: src }); }
  const unknown = words.filter((x) => !w.people.some((p) => canSeeCandidate(w, p.personId, orgId) && hay(w, p.personId, orgId).includes(x)));
  for (const u of unknown) { reasons.push(`Nobody you can see mentions “${u}” in their profile or shared evidence.`); if (RELATED[u]) repairs.push({ label: `Try a related skill: ${RELATED[u]}`, query: [...words.filter((x) => x !== u), RELATED[u].toLowerCase(), ...city].join(' ') }); }
  if (!reasons.length) reasons.push('No one matches all of those words together.');
  if (words.length > 1) repairs.push({ label: `Fewer words: “${words[0]}”`, query: words[0] });
  return { reasons, repairs, alternates: [
    { label: 'Post the role so people can apply', to: '/r/roles' },
    { label: 'Ask your team for referrals', say: `draft a referral request for ${q}` },
    ...(orgOf(w, orgId)?.kind === 'EMPLOYER' && w.orgs.some((o) => o.kind === 'AGENCY' && o.clients?.includes(orgId)) ? [{ label: 'Brief your agency partner (Talentbridge)', say: 'how do I brief talentbridge' }] : []),
  ] };
}
export function newSince(w: World, orgId: string, sid: string) {
  const s = hd(w).saved.find((x) => x.id === sid); if (!s) return { hits: [] as Hit[], fresh: [] as Hit[] };
  const hits = search(w, orgId, s.query); return { hits, fresh: hits.filter((h) => !s.seen.includes(h.pid)) };
}
export const pipelineCount = (w: World, mid: string) => w.pipeline.filter((p) => p.mandateId === mid && !['REJECTED', 'WITHDRAWN'].includes(p.stage)).length;

// ---------------- SC-053 booking ----------------
export interface BookSlot extends Slot { fits: boolean | null }
export const availOf = (w: World, pid: string): Availability | undefined => hd(w).availability[pid];
/** Team-free times (hire-c's search across time zones and calendars), marked by whether they fit what the candidate said. */
export function bookingSlots(w: World, a: Actor, pid: string, panel: string[]): BookSlot[] {
  const av = availOf(w, pid);
  const s = findSlots(w, { attendees: panel, personId: pid, dates: nextWeek(w), orgId: a.orgId, limit: 30, perDay: 6 });
  const tz = tzOf(w, pid);
  return s.map((x) => {
    if (!av) return { ...x, fits: null };
    const m = minsIn(x.start, tz); const d = weekday(dateIn(x.start, tz));
    const ok = (!av.part || (av.part === 'morning' ? m < 12 * 60 : m >= 12 * 60)) && (!av.days || av.days.includes(d));
    return { ...x, fits: ok };
  });
}
/** Times inside interview hours that are ruled out, and by whom (collisions). Busy times only; Q never reads titles. */
export function collisions(w: World, panel: string[], pid: string, days: string[]) {
  const out: { start: string; who: string[] }[] = [];
  for (const d of days) for (const h of [10, 11, 12, 13, 14, 15]) {
    const start = new Date(`${d}T${String(h).padStart(2, '0')}:00:00+01:00`).toISOString(); const end = new Date(new Date(start).getTime() + 45 * 6e4).toISOString();
    const who = [...panel, pid].filter((id) => w.calendar.some((e) => e.status !== 'CANCELLED' && e.attendees.includes(id) && new Date(e.start) < new Date(end) && new Date(e.end) > new Date(start)));
    if (who.length) out.push({ start, who });
  }
  return out;
}
export const FORMAT_WORD: Record<Format, string> = { VIDEO: 'Video call', PHONE: 'Phone call', ONSITE: 'In person, Lagos office' };
export const FORMAT_BODY: Record<Format, string> = { VIDEO: 'video interview', PHONE: 'phone interview', ONSITE: 'in-person interview at our Lagos office' };

// ---------------- SC-056 stage ----------------
export function stageEvents(w: World, a: Actor, _mid: string, pid: string) {
  return w.events.filter((e) => (e.scope === `ORG:${a.orgId}` || e.scope === `SHARED:${a.orgId}:${pid}`) && (e.data?.personId === pid || (e.data?.msgId && w.threads.some((t) => t.personId === pid && t.messages.some((m) => m.id === e.data!.msgId))) || e.text.includes(personOf(w, pid)?.name ?? '§'))).slice(-12).reverse();
}
export const mandateOrg = (w: World, mid: string) => (mid === w.mandate.mandateId ? 'org_kora' : w.mandates.find((m) => m.id === mid)?.orgId);
export const pendingApprovals = (w: World, orgId: string, pid: string) => w.threads.filter((t) => t.orgId === orgId && t.personId === pid).flatMap((t) => t.messages.filter((m) => m.status === 'DRAFT' || m.status === 'AWAITING_APPROVAL'));

// ---------------- SC-058 offers ----------------
/** What the candidate chose to share with this organisation about pay. Nothing else is ever used. */
export function sharedPay(w: World, pid: string, orgId: string) {
  const p = proof(w).prefs[pid];
  return p && p.shareWith.includes(orgId) && p.payMin ? { min: p.payMin, at: p.updatedAt } : undefined;
}
export function bandOf(w: World, mid: string) {
  if (mid === w.mandate.mandateId) { const m = w.mandate.payBand.match(/₦([\d.]+)m–₦([\d.]+)m/); if (m) return { min: +m[1] * 1e6, max: +m[2] * 1e6, label: w.mandate.payBand }; }
  const x = w.mandates.find((m) => m.id === mid); if (x) return { min: x.pay.min, max: x.pay.max, label: payBand(w, mid) ?? '' };
  return undefined;
}
export function approversFor(w: World, orgId: string, mid: string): { role: 'HIRING_MANAGER' | 'HR'; who: string }[] {
  const mem = orgMembers(w, orgId);
  const eng = /engineer/i.test(mandateTitle(w, mid));
  const hm = (eng ? mem.find((m) => m.role === 'HIRING_MANAGER' && /engineering manager/i.test(m.title)) : undefined) ?? mem.find((m) => m.role === 'HIRING_MANAGER');
  const hr = mem.find((m) => m.role === 'ADMIN') ?? mem.find((m) => m.role === 'OWNER');
  return [...(hm ? [{ role: 'HIRING_MANAGER' as const, who: hm.id }] : []), ...(hr ? [{ role: 'HR' as const, who: hr.id }] : [])];
}
export const offerOf = (w: World, mid: string, pid: string) => hd(w).offers.find((o) => o.mandateId === mid && o.personId === pid && o.state !== 'WITHDRAWN');
export const curV = (o: Offer) => o.versions[o.versions.length - 1];
export const approvedAll = (o: Offer) => o.approvals.length > 0 && o.approvals.every((x) => x.at && !x.voided && x.v === curV(o).v);
export function compat(w: World, o: Pick<Offer, 'personId' | 'orgId' | 'mandateId' | 'amount'>) {
  const band = bandOf(w, o.mandateId); const pay = sharedPay(w, o.personId, o.orgId);
  const notes: { k: 'ok' | 'warn' | 'unknown'; text: string }[] = [];
  const f = firstOf(w, o.personId);
  if (o.amount == null) notes.push({ k: 'unknown', text: 'No amount yet. A person sets it; Q doesn’t guess.' });
  else if (band && (o.amount < band.min || o.amount > band.max)) notes.push({ k: 'warn', text: `${money(o.amount)} is outside the approved band (${band.label}).` });
  else if (band) notes.push({ k: 'ok', text: `${money(o.amount)} is inside the approved band (${band.label}).` });
  if (!pay) notes.push({ k: 'unknown', text: `${f} hasn’t shared pay expectations with you. Unknown isn’t a mismatch: ask ${f}, don’t guess.` });
  else if (o.amount != null && o.amount < pay.min) notes.push({ k: 'warn', text: `Below what ${f} shared (from ${money(pay.min)} a month).` });
  else if (o.amount != null) notes.push({ k: 'ok', text: `Meets what ${f} shared (from ${money(pay.min)} a month).` });
  return { band, pay, notes };
}

// ---------------- SC-060 outcomes ----------------
export const MILESTONE_WORD: Record<HiringOutcome['milestones'][number]['kind'], string> = { OFFER_ACCEPTED: 'Offer accepted', STARTED: 'Started', CHECKIN_30: '30-day check-in', CHECKIN_90: '90-day check-in' };
export const nextMilestone = (o: HiringOutcome) => o.milestones.find((m) => !m.at);

// ---------------- SC-159 reminders ----------------
export interface QueueItem { id: string; kind: ReminderKind; personId: string; subject: string; title: string; why: string; sendAt: string; channel: ReminderDecision['channel'] | null; channels: ReminderDecision['channel'][]; blocked?: string; decision?: ReminderDecision; mandateId?: string; due?: string }
export const CH_WORD: Record<ReminderDecision['channel'], string> = { EMAIL: 'email', SMS: 'text message', IN_APP: 'Talent Q' };
/** Channels the candidate allows, in their own notification settings. */
export function allowedChannels(w: World, pid: string): ReminderDecision['channel'][] {
  const n = w.consents[pid]?.notifications; if (!n) return [];
  return [...(n.email ? ['EMAIL' as const] : []), ...(n.sms ? ['SMS' as const] : []), ...(n.inApp ? ['IN_APP' as const] : [])];
}
/** Send inside 08:00–20:00 in the candidate's own time zone. */
export function inQuietHours(w: World, pid: string, iso: string) { const m = minsIn(iso, tzOf(w, pid)); return m < 8 * 60 || m >= 20 * 60; }
function clampSend(w: World, pid: string, iso: string) {
  let t = new Date(iso);
  for (let i = 0; i < 48 && inQuietHours(w, pid, t.toISOString()); i++) t = new Date(t.getTime() - 36e5);
  return t.toISOString();
}
/** The queue, read from authoritative state every time: interviews on the calendar, process commitments, consents. */
export function reminderQueue(w: World, orgId: string): QueueItem[] {
  const t = simNow(w).getTime(); const out: QueueItem[] = [];
  const dec = (id: string) => hd(w).reminders.find((r) => r.id === id);
  const evs = w.calendar.filter((e): e is CalEvent & { personId: string } => e.orgId === orgId && !!e.personId && (e.status === 'INVITED' || e.status === 'CONFIRMED') && new Date(e.start).getTime() > t - 36e5);
  for (const e of evs) {
    const pid = e.personId; const f = firstOf(w, pid);
    const sentInvite = w.threads.filter((x) => x.orgId === orgId && x.personId === pid).flatMap((x) => x.messages).filter((m) => m.from !== pid && m.status === 'SENT_SIMULATED').sort((x, y) => y.at.localeCompare(x.at))[0];
    const confirmed = e.status === 'CONFIRMED';
    const kind: ReminderKind = confirmed ? 'INTERVIEW_24H' : 'CONFIRM_FOLLOWUP';
    const id = `${kind}:${e.id}`;
    const want = confirmed ? new Date(new Date(e.start).getTime() - 24 * 36e5).toISOString() : new Date(Math.max(t, new Date(sentInvite?.at ?? e.start).getTime() + 48 * 36e5)).toISOString();
    const sendAt = clampSend(w, pid, new Date(Math.max(t, new Date(want).getTime())).toISOString());
    const ch = allowedChannels(w, pid);
    const pref = (sentInvite?.channel && ch.includes(sentInvite.channel) ? sentInvite.channel : ch[0]) ?? null;
    let blocked: string | undefined;
    if (hd(w).optOut[pid]) blocked = `${f} turned off interview reminders on ${fmtDay(hd(w).optOut[pid].at)}. Q won’t remind or ask again.`;
    else if (!ch.length) blocked = `${f} has turned off email, text and Talent Q notices. Nothing can go.`;
    else if (isSuppressed(w, orgId, pid)) blocked = `${f} asked ${orgOf(w, orgId)?.name} to stop messaging. Nothing can go.`;
    else if (new Date(e.start).getTime() - t < 2 * 36e5) blocked = 'Less than 2 hours before the interview: too late to remind.';
    out.push({ id, kind, personId: pid, subject: e.id, mandateId: e.mandateId, title: confirmed ? `Remind ${f} the day before` : `Ask ${f} to confirm`, why: confirmed ? `Interview ${tDay(e.start, LAGOS)} at ${tTime(e.start, LAGOS)} Lagos is confirmed.` : `Invited${sentInvite ? ` ${fmtDay(sentInvite.at)}` : ''} for ${tDay(e.start, LAGOS)} at ${tTime(e.start, LAGOS)} Lagos; no confirmation yet.`, sendAt, channel: pref, channels: ch, blocked, decision: dec(id) });
  }
  for (const c of proof(w).commitments.filter((x) => x.orgId === orgId && x.state !== 'FULFILLED')) {
    const due = new Date(`${c.nextUpdateDue}T17:00:00+01:00`).getTime();
    if (due - t > 5 * 864e5) continue;
    const id = `COMMITMENT_UPDATE:${c.id}`; const f = firstOf(w, c.personId); const ch = allowedChannels(w, c.personId);
    const late = due < t;
    out.push({ id, kind: 'COMMITMENT_UPDATE', personId: c.personId, subject: c.id, mandateId: c.mandateId, due: c.nextUpdateDue, title: `Tell ${f} where things stand`, why: `Promised: “${c.milestone}”, update by ${fmtDay(c.nextUpdateDue)}${late ? ' (late)' : ''}. Owner: ${w.actors.find((x) => x.id === c.owner)?.name ?? 'unassigned'}.`, sendAt: clampSend(w, c.personId, new Date(t).toISOString()), channel: ch.includes('IN_APP') ? 'IN_APP' : ch[0] ?? null, channels: ch, blocked: !ch.length ? `${f} has turned off every notice channel.` : isSuppressed(w, orgId, c.personId) ? `${f} asked you to stop messaging.` : undefined, decision: dec(id) });
  }
  return out.sort((a, b) => Number(!!a.decision) - Number(!!b.decision) || Number(!!a.blocked) - Number(!!b.blocked) || a.sendAt.localeCompare(b.sendAt));
}
export function reminderText(w: World, it: QueueItem, orgId: string): { subject: string; body: string } {
  const f = firstOf(w, it.personId); const org = orgOf(w, orgId)?.name ?? ''; const ev = w.calendar.find((e) => e.id === it.subject);
  const tz = tzOf(w, it.personId); const when = ev ? `${tDay(ev.start, tz)} at ${tTime(ev.start, tz)} (your time)` : '';
  if (it.kind === 'INTERVIEW_24H') return { subject: `Reminder: your interview with ${org}`, body: `Hi ${f}, a reminder that your interview with ${org} is ${when}. Reply if you need to change it. You can turn these reminders off in Talent Q.` };
  if (it.kind === 'CONFIRM_FOLLOWUP') return { subject: `Can you make ${when}?`, body: `Hi ${f}, checking you saw our invitation for ${when}. Please confirm, or suggest another time. Either is fine. You can turn these reminders off in Talent Q.` };
  const c = proof(w).commitments.find((x) => x.id === it.subject);
  return { subject: `An update on your application`, body: `Hi ${f}, an update on “${c?.milestone ?? 'your application'}” for ${mandateTitle(w, it.mandateId)}: we haven’t finished yet, and we’ll write again by ${c ? fmtDay(addDaysIso(c.nextUpdateDue, 5)) : 'next week'}. Nothing has been decided.` };
}
const addDaysIso = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** Simulated send after a person approved: accepted only; delivered and read need their own (simulated) evidence. */
export function simSend(w: World, a: Actor, o: { orgId: string; personId: string; mandateId?: string; channel: Msg['channel']; subject: string; body: string }) {
  const t = threadFor(w, o.orgId, o.personId, o.mandateId);
  const sender = o.channel === 'EMAIL' ? defaultSender(w, a, o.orgId, o.mandateId)?.id : undefined;
  const m: Msg = { id: uid('msg'), from: a.id, to: o.personId, subject: o.subject, body: o.body, at: now(), status: 'SENT_SIMULATED', approvedBy: a.id, receipt: `sim_${Math.random().toString(36).slice(2, 10)}`, channel: o.channel, senderId: sender, delivery: 'ACCEPTED', acceptedAt: now(), providerId: `sim-${Math.random().toString(36).slice(2, 8)}` };
  t.messages.push(m);
  emit(w, a.id, 'message.sent', `SHARED:${o.orgId}:${o.personId}`, `${orgOf(w, o.orgId)?.name} sent ${personOf(w, o.personId)?.name} a message (simulated): ${o.subject}`, { msgId: m.id, personId: o.personId });
  return m;
}

// ---------------- MO-046 delivery ----------------
export interface Rail { approved?: { at: string; by: string }; accepted?: string; delivered?: string; read?: string; readWhy?: string; readNa?: string; failed?: string }
/** Truthful receipts: accepted ≠ delivered ≠ read. Read is known only when the candidate opened it in Talent Q or replied. */
export function railOf(w: World, msgId: string): Rail | undefined {
  for (const t of w.threads) {
    const m = t.messages.find((x) => x.id === msgId); if (!m) continue;
    const r = hd(w).receipts[msgId] ?? {};
    const sent = m.status === 'SENT_SIMULATED' || m.status === 'RECEIVED';
    if (!sent) return { approved: undefined };
    const reply = t.messages.find((x) => x.from === t.personId && x.at > m.at);
    const fail = m.delivery === 'FAILED' || m.delivery === 'BOUNCED' ? (m.delivery === 'BOUNCED' ? 'Bounced' : 'Not sent') : undefined;
    return {
      approved: m.approvedBy ? { at: m.acceptedAt ?? m.at, by: m.approvedBy } : undefined,
      accepted: fail ? undefined : m.acceptedAt ?? m.at,
      delivered: m.delivery === 'DELIVERED' ? r.deliveredAt ?? m.at : r.deliveredAt,
      read: r.readAt ?? reply?.at, readWhy: r.readAt ? 'opened in Talent Q' : reply ? 'replied' : undefined,
      readNa: m.channel === 'IN_APP' ? undefined : `Not tracked for ${m.channel === 'EMAIL' ? 'email' : 'text messages'} (no tracking pixels). Shown only if ${firstOf(w, t.personId)} replies.`,
      failed: fail,
    };
  }
  return undefined;
}
export const canSendRoles = CAN_SEND; export const canMoveRoles = CAN_MOVE;
export { mandatesOf, actorOf, relationshipWith, hdw, keyOf };
