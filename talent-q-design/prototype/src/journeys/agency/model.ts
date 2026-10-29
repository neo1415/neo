// Agency (R4) model: client-scoped selectors, mutations and the simulated multi-agent runner.
// Tenant isolation is enforced HERE, not in the views: every selector takes the client in focus and
// returns only that client's records, so pages, Q replies and reports cannot mix Kora and Medlink.
import { actorOf, canSeeCandidate, emit, getWorld, orgOf, simNow, uid, update, type World } from '../../mock/world';
import type { Actor, MandateX } from '../../state/domain';
import { agency, area, type AgencyState, type AgentRun, type ClientId, type FitMark, type Pool, type Report, type Submittal } from '../../state/areas/agency';
import { appendQ } from '../../q/core/engine';

export const AGENCY_ID = 'org_tb';
/** Mutable slice inside an update() draft (creates it for worlds saved before this area existed). */
export const ag = (w: World): AgencyState => (w.areas.agency ??= area.init()) as AgencyState;
export { agency };

export const isAgency = (w: World, a: Actor = actorOf(w)) => orgOf(w, a.orgId)?.kind === 'AGENCY';
export const clientIds = (w: World): ClientId[] => orgOf(w, AGENCY_ID)?.clients ?? [];
export const clientName = (w: World, id: ClientId) => orgOf(w, id)?.name ?? id;
export const clientShort = (w: World, id: ClientId) => clientName(w, id).split(' ')[0];
export const focusOf = (w: World, actorId = w.session.actor): ClientId => agency(w).focus[actorId] ?? clientIds(w)[0] ?? 'org_kora';
export const personName = (w: World, id: string) => w.people.find((p) => p.personId === id)?.name ?? id;
export const firstName = (w: World, id: string) => personName(w, id).split(' ')[0];
export const today = (w: World) => simNow(w).toISOString().slice(0, 10);
export const fmtDay = (d?: string) => (d ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
const agencyActors = (w: World) => w.actors.filter((a) => a.orgId === AGENCY_ID);
export const owners = (w: World) => agencyActors(w).filter((a) => a.role === 'OWNER' || a.role === 'ADMIN');
export const canAct = (a: Actor) => a.role === 'OWNER' || a.role === 'ADMIN' || a.role === 'RECRUITER';
export const SCOPE = `ORG:${AGENCY_ID}`;
/** Lower-case the first letter only (keeps month names and people's names capitalised). */
export const lc = (s?: string) => (s ? s[0].toLowerCase() + s.slice(1) : '');

/** Which clients a sentence names (tolerant of "korapay", "med link", "medlnk"). */
export function clientsIn(norm: string): ClientId[] {
  const out: ClientId[] = [];
  if (/\bkora\w*\b|\bkorra\b/.test(norm)) out.push('org_kora');
  if (/\bmed ?li?n?k\w*\b|\bmedlink\b|\bmedlnk\b|\bmed link\b/.test(norm)) out.push('org_medlink');
  return out;
}

// ---------------- Client-scoped selectors ----------------
export const agencyMandates = (w: World, client: ClientId): MandateX[] => {
  const staff = agencyActors(w).map((a) => a.id);
  return w.mandates.filter((m) => m.clientOrgId === client && (m.orgId === AGENCY_ID || staff.includes(m.createdBy)));
};
export const mandateOf = (w: World, id: string) => w.mandates.find((m) => m.id === id);
export const poolsFor = (w: World, client: ClientId) => agency(w).pools.filter((p) => p.clientOrgId === client);
export const searchesFor = (w: World, client: ClientId) => agency(w).searches.filter((s) => s.clientOrgId === client);
export const campaignsFor = (w: World, client: ClientId) => agency(w).campaigns.filter((c) => c.clientOrgId === client);
export const submittalsFor = (w: World, client: ClientId) => agency(w).submittals.filter((s) => s.clientOrgId === client && s.status !== 'DISCARDED');
export const notesFor = (w: World, client: ClientId) => agency(w).notes.filter((n) => n.clientOrgId === client);
export const runsFor = (w: World, client: ClientId) => agency(w).runs.filter((r) => r.clientOrgId === client);
export const docsFor = (w: World, client: ClientId) => agency(w).docs.filter((d) => d.clientOrgId === client);
export const pipelineFor = (w: World, client: ClientId) => { const ids = agencyMandates(w, client).map((m) => m.id); return w.pipeline.filter((p) => ids.includes(p.mandateId)); };
/** Everyone who appears in a client's records (pipeline or pools): the only people a client view or report may name. */
export const peopleFor = (w: World, client: ClientId) => [...new Set([...pipelineFor(w, client).map((p) => p.personId), ...poolsFor(w, client).flatMap((p) => p.members)])].filter((p) => allowed(w, p));

// ---------------- Permissions (confidential records) ----------------
export function hasAccess(w: World, a: Actor, recordId: string) {
  return agency(w).access.some((r) => r.actorId === a.id && r.recordId === recordId && r.state === 'GRANTED');
}
export function canSeeMandate(w: World, a: Actor, m: MandateX) {
  if (!m.confidential) return true;
  if (a.role === 'OWNER' || a.role === 'ADMIN' || a.role === 'RECRUITER') return true;
  return hasAccess(w, a, m.id);
}
export const deniedReason = (w: World, a: Actor, m: MandateX) => `${clientName(w, m.clientOrgId!)} marked this mandate confidential. Your role is ${a.role === 'VIEWER' ? 'Viewer (researcher)' : a.role?.toLowerCase()}, and Talentbridge’s rule is “Researchers can view pools, not confidential client records”.`;

// ---------------- Consent (checked per person, per client) ----------------
export type ConsentState = 'OK' | 'WITHDRAWN' | 'NOT_GIVEN';
export function consentState(w: World, personId: string, client: ClientId): ConsentState {
  const c = w.consents[personId];
  if (c?.withdrawnFrom.includes(AGENCY_ID) || c?.withdrawnFrom.includes(client) || agency(w).withdrawn[personId]) return 'WITHDRAWN';
  return (agency(w).shareConsent[personId] ?? []).includes(client) ? 'OK' : 'NOT_GIVEN';
}
export const isWithdrawn = (w: World, personId: string) => !!agency(w).withdrawn[personId] || !!w.consents[personId]?.withdrawnFrom.includes(AGENCY_ID);
export function consentReason(w: World, personId: string, client: ClientId) {
  const s = consentState(w, personId, client);
  if (s === 'WITHDRAWN') return `Withdrew consent on ${fmtDay(agency(w).withdrawn[personId] ?? today(w))}`;
  if (s === 'NOT_GIVEN') return `Hasn’t agreed to be put forward to ${clientShort(w, client)} yet`;
  return '';
}

// ---------------- Ranking (by evidence per requirement; never one number on screen) ----------------
const W: Record<FitMark, number> = { verified: 3, full: 2, partial: 1, none: 0 };
export const fitOf = (w: World, mandateId: string, personId: string) => agency(w).fit[mandateId]?.[personId] ?? {};
export function fitScore(w: World, mandateId: string, personId: string) {
  const m = mandateOf(w, mandateId); const f = fitOf(w, mandateId, personId);
  return (m?.requirements ?? []).reduce((s, r) => s + W[f[r.reqId] ?? 'none'] * (r.mustHave ? 2 : 1), 0);
}
export const mustHavesShown = (w: World, mandateId: string, personId: string) => {
  const m = mandateOf(w, mandateId); const f = fitOf(w, mandateId, personId);
  const must = (m?.requirements ?? []).filter((r) => r.mustHave);
  return { shown: must.filter((r) => (f[r.reqId] ?? 'none') !== 'none').length, of: must.length };
};
/** Privacy: pool members the agency may see (registered with it, or discoverable by agencies). */
export const allowed = (w: World, personId: string) => canSeeCandidate(w, personId, AGENCY_ID);
export const activeMembers = (w: World, pool: Pool) => pool.members.filter((p) => !isWithdrawn(w, p) && allowed(w, p));
/** Members hidden by their own privacy settings: counted, never named. */
export const hiddenMembers = (w: World, pool: Pool) => pool.members.filter((p) => !isWithdrawn(w, p) && !allowed(w, p));
export const removedMembers = (w: World, pool: Pool) => pool.members.filter((p) => isWithdrawn(w, p));
export const ranked = (w: World, pool: Pool) => [...activeMembers(w, pool)].sort((a, b) => fitScore(w, pool.mandateId, b) - fitScore(w, pool.mandateId, a) || personName(w, a).localeCompare(personName(w, b)));

// ---------------- Conflicts: same person, two clients, incompatible work modes ----------------
export function conflicts(w: World) {
  const out: { personId: string; a: MandateX; b: MandateX }[] = [];
  const ms = clientIds(w).flatMap((c) => agencyMandates(w, c));
  const byPerson = new Map<string, MandateX[]>();
  for (const p of w.pipeline) { const m = ms.find((x) => x.id === p.mandateId); if (m && !['REJECTED', 'WITHDRAWN'].includes(p.stage)) byPerson.set(p.personId, [...(byPerson.get(p.personId) ?? []), m]); }
  for (const [personId, list] of byPerson) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.clientOrgId !== b.clientOrgId && ((a.workMode === 'ONSITE' && b.workMode === 'REMOTE') || (a.workMode === 'REMOTE' && b.workMode === 'ONSITE')) && !isWithdrawn(w, personId)) out.push({ personId, a, b });
  }
  return out;
}

// ---------------- Mutations (called inside update() / ops / skill effects) ----------------
export function setFocus(w: World, actorId: string, client: ClientId) { ag(w).focus[actorId] = client; }

export function rerunSearch(w: World, actor: Actor, searchId: string) {
  const s = ag(w).searches.find((x) => x.id === searchId)!;
  const t = today(w);
  const prev = s.results;
  const now = s.universe.filter((u) => u.since <= t).map((u) => u.personId);
  const results = now.filter((p) => !isWithdrawn(w, p));
  const dropped = now.filter((p) => isWithdrawn(w, p));
  s.newSinceLast = results.filter((p) => !prev.includes(p));
  s.results = results; s.lastRunAt = t; s.runs += 1;
  emit(w, actor.id, 'agency.search.rerun', SCOPE, `Re-ran saved search “${s.name}” for ${clientName(w, s.clientOrgId)}: ${results.length} matches, ${s.newSinceLast.length} new.`, { clientOrgId: s.clientOrgId, searchId });
  return { s, added: s.newSinceLast, dropped };
}

export function draftSubmittal(w: World, actor: Actor, client: ClientId, poolId: string, n: number): Submittal {
  const A = ag(w); const pool = A.pools.find((p) => p.id === poolId)!;
  for (const s of A.submittals) if (s.status === 'DRAFT' && s.clientOrgId === client && s.mandateId === pool.mandateId) s.status = 'DISCARDED';
  const top = ranked(w, pool).slice(0, n);
  const people = [
    ...top.map((p) => { const st = consentState(w, p, client); return { personId: p, included: st === 'OK', reason: st === 'OK' ? undefined : consentReason(w, p, client) }; }),
    ...removedMembers(w, pool).map((p) => ({ personId: p, included: false, reason: consentReason(w, p, client) })),
  ];
  const s: Submittal = { id: uid('sub'), clientOrgId: client, mandateId: pool.mandateId, poolId, people, status: 'DRAFT', createdBy: actor.id, createdAt: today(w) };
  A.submittals.push(s);
  emit(w, actor.id, 'agency.submittal.drafted', SCOPE, `Drafted a submittal of ${people.filter((p) => p.included).length} to ${clientName(w, client)}.`, { clientOrgId: client });
  return s;
}

export function sendSubmittal(w: World, actor: Actor, id: string) {
  const s = ag(w).submittals.find((x) => x.id === id);
  if (!s || s.status !== 'DRAFT') return { ok: false, text: 'That submittal isn’t a draft any more, so there’s nothing to send.' };
  // Consent is checked again at the moment of sending: it can change between draft and send.
  for (const p of s.people) { const st = consentState(w, p.personId, s.clientOrgId); if (st !== 'OK') { p.included = false; p.reason = consentReason(w, p.personId, s.clientOrgId); } }
  const inc = s.people.filter((p) => p.included);
  if (!inc.length) return { ok: false, text: 'No one on this shortlist can be sent: none of them has agreed to be put forward to this client.' };
  s.status = 'SENT_SIMULATED'; s.sentAt = today(w); s.receipt = `sub_sim_${(++ag(w).seq + 300).toString(36)}`;
  for (const p of inc) { const e = w.pipeline.find((x) => x.mandateId === s.mandateId && x.personId === p.personId); if (e && ['SOURCED', 'SHORTLISTED'].includes(e.stage)) { e.stage = 'SHORTLISTED'; e.note = `Submitted to ${clientShort(w, s.clientOrgId)} ${fmtDay(s.sentAt)}`; } else if (!e) w.pipeline.push({ mandateId: s.mandateId, personId: p.personId, stage: 'SHORTLISTED', at: today(w), by: actor.id, note: `Submitted to ${clientShort(w, s.clientOrgId)}` }); }
  emit(w, actor.id, 'agency.submittal.sent', SCOPE, `Sent ${inc.length} candidates to ${clientName(w, s.clientOrgId)} (simulated, receipt ${s.receipt}).`, { clientOrgId: s.clientOrgId, receipt: s.receipt });
  return { ok: true, text: `Sent to ${clientName(w, s.clientOrgId)}: ${inc.map((p) => personName(w, p.personId)).join(', ')}. Receipt ${s.receipt} (simulated: nothing left Talent Q).${s.people.some((p) => !p.included) ? ` Not sent: ${s.people.filter((p) => !p.included).map((p) => `${personName(w, p.personId)} (${lc(p.reason)})`).join('; ')}.` : ''}` };
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
export const HOOKS: Record<string, string> = { p_tb_femi: 'card settlement services', p_tb_halima: 'the payouts ledger', p_tb_yemi: 'wallet top-ups', p_tb_kemi: 'remittance rails', p_tb_segun: 'loan disbursement', p_dayo: 'lending platforms', p_zara: 'the fleet tracking API', p_tb_nneka: 'insurance claims APIs', p_tb_obinna: 'logistics APIs' };
export const messageFor = (w: World, template: string, personId: string) => template.replace('{first}', firstName(w, personId)).replace('{hook}', HOOKS[personId] ?? 'your recent work');
export const briefSigned = (w: World, mandateId: string) => agency(w).docs.some((d) => d.mandateId === mandateId && d.kind === 'BRIEF' && d.signed && d.status === 'READY');

export function launchCampaign(w: World, actor: Actor, id: string) {
  const A = ag(w); const c = A.campaigns.find((x) => x.id === id)!;
  const org = orgOf(w, AGENCY_ID)!;
  if (!canAct(actor)) return { ok: false, text: `Your role (${actor.role}) can’t launch campaigns. Dele or an admin can.` };
  if (org.delegation !== 'APPROVED_CAMPAIGN') return { ok: false, text: 'Talentbridge’s approval setting doesn’t allow campaigns: each message needs its own yes.' };
  if (!briefSigned(w, c.mandateId)) return { ok: false, text: `${clientShort(w, c.clientOrgId)}’s brief for this role isn’t signed yet, and Talentbridge’s rule is “Campaigns need a signed client brief”. Upload the signed brief and I can launch it.` };
  if (c.status === 'RUNNING') return { ok: false, text: 'That campaign is already running.' };
  const pool = A.pools.find((p) => p.id === c.poolId)!;
  let queued = 0;
  c.messages = pool.members.map((p) => {
    const body = messageFor(w, c.template, p); const n = words(body);
    if (isWithdrawn(w, p)) return { personId: p, status: 'EXCLUDED' as const, reason: consentReason(w, p, c.clientOrgId), words: n };
    if (!allowed(w, p)) return { personId: p, status: 'EXCLUDED' as const, reason: 'Their privacy settings don’t allow agencies to contact them', words: n };
    if (n > c.limits.maxWords) return { personId: p, status: 'HELD' as const, reason: `Message is ${n} words; the limit is ${c.limits.maxWords}`, words: n };
    if (c.messages.some((m) => m.personId === p && m.status === 'SENT_SIMULATED')) return c.messages.find((m) => m.personId === p)!;
    if (queued >= c.limits.perRun) return { personId: p, status: 'HELD' as const, reason: `Over this run’s limit of ${c.limits.perRun}; goes in the next run`, words: n };
    queued++; return { personId: p, status: 'QUEUED' as const, words: n };
  });
  c.status = 'RUNNING'; c.approvedBy = actor.id; c.approvedAt = today(w);
  A.runs.push({ id: uid('run'), clientOrgId: c.clientOrgId, mandateId: c.mandateId, label: `Campaign: ${c.name}`, kind: 'CAMPAIGN', provider: 'Email (simulated)', providerState: 'OK', total: queued, done: 0, state: 'QUEUED', priority: 2, attempts: 0, yields: [], found: [], log: [{ at: new Date().toISOString(), text: `Approved by ${actor.first}: ${queued} messages within the limits`, k: 'decision' }], campaignId: c.id, startedBy: actor.id });
  emit(w, actor.id, 'agency.campaign.approved', SCOPE, `Approved campaign “${c.name}” for ${clientName(w, c.clientOrgId)}: ${queued} to send now (simulated), ${c.messages.filter((m) => m.status === 'HELD').length} held, ${c.messages.filter((m) => m.status === 'EXCLUDED').length} excluded.`, { clientOrgId: c.clientOrgId });
  return { ok: true, text: `Campaign approved under Talentbridge’s “approved campaign” setting. ${queued} messages go now, one at a time (simulated: nothing really leaves Talent Q). ${c.messages.filter((m) => m.status === 'HELD').length} wait for the next run because of the limit of ${c.limits.perRun} per run; ${c.messages.filter((m) => m.status === 'EXCLUDED').length} excluded.${c.messages.filter((m) => m.status === 'EXCLUDED').map((m) => ` ${personName(w, m.personId)}: ${lc(m.reason)}.`).join('')}` };
}

export function withdrawConsent(w: World, personId: string) {
  const A = ag(w); const t = today(w); const name = personName(w, personId);
  const c = w.consents[personId]; if (c && !c.withdrawnFrom.includes(AGENCY_ID)) c.withdrawnFrom.push(AGENCY_ID);
  A.withdrawn[personId] = t;
  const reason = `Withdrew consent on ${fmtDay(t)}`;
  const touched: string[] = [];
  for (const p of A.pools) if (p.members.includes(personId)) touched.push(`the ${p.name} pool (${clientShort(w, p.clientOrgId)})`);
  for (const cp of A.campaigns) { let n = 0; for (const m of cp.messages) if (m.personId === personId && (m.status === 'QUEUED' || m.status === 'HELD')) { m.status = 'EXCLUDED'; m.reason = reason; n++; } if (n || cp.messages.some((m) => m.personId === personId)) touched.push(`the “${cp.name}” campaign${n ? ` (${n} unsent message cancelled)` : ''}`); }
  for (const s of A.submittals) if (s.status === 'DRAFT') for (const p of s.people) if (p.personId === personId) { p.included = false; p.reason = reason; touched.push(`the draft ${clientShort(w, s.clientOrgId)} submittal`); }
  for (const s of A.searches) { s.results = s.results.filter((p) => p !== personId); s.newSinceLast = s.newSinceLast.filter((p) => p !== personId); }
  for (const r of A.runs) r.found = r.found.filter((p) => p !== personId);
  emit(w, personId, 'consent.withdrawn', `PERSON:${personId}`, `${name} withdrew consent for Talentbridge (simulated).`);
  emit(w, 'system', 'agency.consent.withdrawn', SCOPE, `${name} withdrew consent. Removed from pools, campaigns, searches and draft submittals.`, { personId });
  const sent = A.campaigns.some((cp) => cp.messages.some((m) => m.personId === personId && m.status === 'SENT_SIMULATED')) || A.submittals.some((s) => s.status !== 'DRAFT' && s.people.some((p) => p.personId === personId && p.included));
  for (const o of owners(w)) appendQ(w, o.id, { who: 'q', kind: 'notice', engine: 'system', text: `${name} withdrew consent for Talentbridge to hold or share their details. I’ve taken them out of ${touched.length ? touched.join(', ') : 'everything active'}. They no longer appear in searches, campaigns or new submittals.${sent ? ' Anything already sent before today stays sent; I can’t unsend it, but nothing further will go out.' : ''}`, why: 'Consent changed on the candidate’s record', actions: [{ label: 'Show the pool', act: { t: 'nav', to: '/r/agency/pools' } }] });
  return touched;
}

export function pauseRun(w: World, actor: Actor, r: AgentRun, reason: string) {
  if (!['RUNNING', 'QUEUED', 'RETRYING'].includes(r.state)) return false;
  r.state = 'PAUSED'; r.pausedReason = reason; r.log.push({ at: new Date().toISOString(), text: `Paused by ${actor.first} at ${r.done} of ${r.total}. ${reason}`, k: 'decision' });
  emit(w, actor.id, 'agency.run.paused', SCOPE, `Paused ${clientShort(w, r.clientOrgId)} · ${r.label} at ${r.done}/${r.total}.`, { clientOrgId: r.clientOrgId }); return true;
}
export function resumeRun(w: World, actor: Actor, r: AgentRun) {
  if (r.state !== 'PAUSED') return false;
  r.state = 'QUEUED'; r.pausedReason = undefined; r.log.push({ at: new Date().toISOString(), text: `Resumed by ${actor.first} from ${r.done} of ${r.total}; no finished work is repeated`, k: 'decision' });
  emit(w, actor.id, 'agency.run.resumed', SCOPE, `Resumed ${clientShort(w, r.clientOrgId)} · ${r.label} from ${r.done}/${r.total}.`, { clientOrgId: r.clientOrgId }); return true;
}
export function cancelRun(w: World, actor: Actor, r: AgentRun) {
  if (['DONE', 'CANCELLED'].includes(r.state)) return false;
  r.state = 'CANCELLED'; r.log.push({ at: new Date().toISOString(), text: `Cancelled by ${actor.first} at ${r.done} of ${r.total}. Finished work is kept.`, k: 'decision' });
  if (r.campaignId) { const c = ag(w).campaigns.find((x) => x.id === r.campaignId); if (c) { c.status = 'PAUSED'; for (const m of c.messages) if (m.status === 'QUEUED') { m.status = 'HELD'; m.reason = 'Campaign cancelled before this was sent'; } } }
  emit(w, actor.id, 'agency.run.cancelled', SCOPE, `Cancelled ${clientShort(w, r.clientOrgId)} · ${r.label}.`, { clientOrgId: r.clientOrgId }); return true;
}
export function retryRun(_w: World, actor: Actor, r: AgentRun, skipProvider = false) {
  if (r.state !== 'FAILED') return false;
  if (skipProvider) {
    r.providerState = 'SKIPPED'; r.state = 'QUEUED'; r.total = r.done + Math.max(2, Math.ceil((r.total - r.done) / 2)); r.failAt = undefined;
    r.log.push({ at: new Date().toISOString(), text: `${r.provider} skipped by ${actor.first}; continuing on the Talent Q network only (${r.total - r.done} profiles left)`, k: 'decision' });
  } else { r.state = 'RETRYING'; r.retryInTicks = 2; r.log.push({ at: new Date().toISOString(), text: `Retry requested by ${actor.first}`, k: 'decision' }); }
  return true;
}
export function prioritise(w: World, actor: Actor, r: AgentRun, p: 1 | 2 | 3) {
  r.priority = p; r.log.push({ at: new Date().toISOString(), text: `Priority set to ${p === 1 ? 'urgent' : p === 2 ? 'normal' : 'low'} by ${actor.first}`, k: 'decision' });
  if (p === 1 && r.state === 'PAUSED') resumeRun(w, actor, r);
}
/** "Stop the Medlink search, Kora is urgent": pause one client's work (resumable), raise and start the other's. */
export function interrupt(w: World, actor: Actor, stop: ClientId, urgent: ClientId | null) {
  const A = ag(w);
  const paused = A.runs.filter((r) => r.clientOrgId === stop && ['RUNNING', 'QUEUED', 'RETRYING'].includes(r.state));
  for (const r of paused) pauseRun(w, actor, r, urgent ? `${clientShort(w, urgent)} is urgent; resumes from here.` : 'Resumes from here.');
  const raised = urgent ? A.runs.filter((r) => r.clientOrgId === urgent && !['DONE', 'CANCELLED'].includes(r.state)) : [];
  // Nothing of the urgent client's is active: start its main saved search as a new urgent agent.
  if (urgent && !raised.length) {
    const s = A.searches.find((x) => x.clientOrgId === urgent);
    if (s) { const r: AgentRun = { id: uid('run'), clientOrgId: urgent, mandateId: s.mandateId, label: `Urgent search: ${mandateOf(w, s.mandateId)?.title ?? s.name}`, kind: 'SEARCH', provider: 'Talent Q network', providerState: 'OK', total: 12, done: 0, state: 'QUEUED', priority: 1, attempts: 0, yields: [], found: [], log: [{ at: new Date().toISOString(), text: `Started by ${actor.first} as urgent`, k: 'decision' }], startedBy: actor.id, searchId: s.id }; A.runs.push(r); raised.push(r); }
  }
  for (const r of raised) { r.priority = 1; if (r.state === 'PAUSED') resumeRun(w, actor, r); r.log.push({ at: new Date().toISOString(), text: `Marked urgent by ${actor.first}`, k: 'decision' }); }
  fillSlots(w);
  return { paused, raised };
}

export function addNote(w: World, actor: Actor, client: ClientId, text: string, mandateId?: string) {
  const mentions = agencyActors(w).filter((a) => a.id !== actor.id && new RegExp(`@?\\b${a.first}\\b`, 'i').test(text)).map((a) => a.id);
  const n = { id: uid('note'), clientOrgId: client, mandateId, by: actor.id, text, mentions, at: new Date(simNow(w).getTime() + (ag(w).seq++ % 50) * 60000).toISOString(), readBy: [actor.id] };
  ag(w).notes.push(n);
  emit(w, actor.id, 'agency.note.added', SCOPE, `${actor.first} added a ${clientShort(w, client)} note${mentions.length ? ` mentioning ${mentions.map((m) => actorOf(w, m).first).join(', ')}` : ''}.`, { clientOrgId: client });
  return n;
}

export function requestAccess(w: World, actor: Actor, m: MandateX) {
  const A = ag(w);
  const ex = A.access.find((r) => r.actorId === actor.id && r.recordId === m.id && r.state === 'PENDING');
  if (ex) return ex;
  const r = { id: uid('acc'), actorId: actor.id, recordId: m.id, recordLabel: `${clientShort(w, m.clientOrgId!)} · ${m.title}`, clientOrgId: m.clientOrgId!, reason: 'Research for the shortlist', state: 'PENDING' as const, at: today(w) };
  A.access.push(r);
  emit(w, actor.id, 'agency.access.requested', SCOPE, `${actor.first} asked for access to a confidential record (${r.recordLabel}).`, { clientOrgId: r.clientOrgId });
  for (const o of owners(w)) appendQ(w, o.id, { who: 'q', kind: 'notice', engine: 'system', text: `${actor.first} asked to see the confidential ${r.recordLabel} record. Their role is Viewer, so they can’t see it until you say yes.`, actions: [{ label: `Let ${actor.first} see it`, primary: true, act: { t: 'do', op: 'agency.access.decide', args: { id: r.id, d: 'GRANTED' } } }, { label: 'Decline', act: { t: 'do', op: 'agency.access.decide', args: { id: r.id, d: 'DECLINED' } } }] });
  return r;
}

// ---------------- Reports (drafted from ONE client's records only) ----------------
export function buildReport(w: World, client: ClientId, by: string, prev?: Report): Report {
  const name = clientName(w, client);
  const ms = agencyMandates(w, client);
  const pipe = pipelineFor(w, client);
  const subs = submittalsFor(w, client).filter((s) => s.status !== 'DRAFT');
  const camps = campaignsFor(w, client);
  const withdrawnHere = peopleFor(w, client).filter((p) => isWithdrawn(w, p)).length;
  const sections = [
    { id: 'summary', h: 'Summary', body: `Status for ${name} on ${fmtDay(today(w))}. ${ms.length} open ${ms.length === 1 ? 'role' : 'roles'}, ${pipe.filter((p) => !isWithdrawn(w, p.personId)).length} people in progress, ${subs.reduce((n, s) => n + s.people.filter((p) => p.included).length, 0)} put forward so far.` },
    ...ms.map((m) => {
      const here = pipe.filter((p) => p.mandateId === m.id && !isWithdrawn(w, p.personId));
      const short = here.filter((p) => ['SHORTLISTED', 'CONTACTED', 'REPLIED', 'INTERVIEW'].includes(p.stage)).map((p) => personName(w, p.personId));
      return { id: `m_${m.id}`, h: `${m.title}${m.confidential ? ' (confidential)' : ''}`, body: `${here.length} in progress. ${short.length ? `Shortlisted or in conversation: ${short.join(', ')}.` : 'No shortlist yet.'} Work mode as briefed: ${m.workMode === 'ONSITE' ? 'on-site' : m.workMode === 'REMOTE' ? 'remote only' : 'hybrid'}, ${m.location}.` };
    }),
    { id: 'subs', h: 'Candidates put forward', body: subs.length ? subs.map((s) => `${fmtDay(s.sentAt)}: ${s.people.filter((p) => p.included).map((p) => personName(w, p.personId)).join(', ')} for ${mandateOf(w, s.mandateId)?.title}${s.reply ? `; your reply: ${s.reply}` : '; waiting for your feedback'}.`).join(' ') : 'None yet this period.' },
    { id: 'outreach', h: 'Outreach', body: camps.some((c) => c.messages.length) ? camps.filter((c) => c.messages.length).map((c) => `${c.name}: ${c.messages.filter((m) => m.status === 'SENT_SIMULATED').length} contacted, ${c.messages.filter((m) => m.status === 'HELD' || m.status === 'QUEUED').length} scheduled.`).join(' ') : 'No outreach campaign has run yet.' },
    { id: 'next', h: 'Risks and next steps', body: `${withdrawnHere ? `${withdrawnHere} candidate${withdrawnHere === 1 ? '' : 's'} left the process at their own request and ${withdrawnHere === 1 ? 'is' : 'are'} no longer included. ` : ''}We’ll confirm availability and work-mode fit with each shortlisted candidate before interviews.` },
  ];
  return { clientOrgId: client, v: (prev?.v ?? 0) + 1, status: 'DRAFT', sections, draftedAt: new Date().toISOString(), history: [...(prev?.history ?? []), { v: (prev?.v ?? 0) + 1, at: today(w), by, note: 'Drafted by Q from this client’s records only' }] };
}
/** Isolation check: every person and organisation named in a client report must belong to that client's records. */
export function isolationCheck(w: World, r: Report) {
  const text = r.sections.map((s) => `${s.h} ${s.body}`).join(' ').toLowerCase();
  const allowed = new Set(peopleFor(w, r.clientOrgId));
  const foreignPeople = w.people.filter((p) => !allowed.has(p.personId) && text.includes(p.name.toLowerCase())).map((p) => p.name);
  const foreignClients = clientIds(w).filter((c) => c !== r.clientOrgId && new RegExp(`\\b${clientShort(w, c).toLowerCase()}\\b`).test(text)).map((c) => clientName(w, c));
  return { ok: !foreignPeople.length && !foreignClients.length, foreignPeople, foreignClients };
}

// ---------------- The runner: one unit of work per tick per running agent ----------------
export const SLOTS = 3;
function note(w: World, text: string, actions?: { label: string; primary?: boolean; act: { t: 'say'; text: string } | { t: 'nav'; to: string } | { t: 'do'; op: string; args?: Record<string, unknown> } }[]) {
  for (const o of owners(w)) appendQ(w, o.id, { who: 'q', kind: 'notice', engine: 'system', text, actions });
}
const at = () => new Date().toISOString();
export function fillSlots(w: World) {
  const A = ag(w);
  const busy = A.runs.filter((r) => r.state === 'RUNNING' || r.state === 'RETRYING').length;
  const queued = A.runs.filter((r) => r.state === 'QUEUED').sort((a, b) => a.priority - b.priority);
  for (const r of queued.slice(0, Math.max(0, SLOTS - busy))) { r.state = 'RUNNING'; r.attempts = Math.max(1, r.attempts); r.log.push({ at: at(), text: `Started (slot free)${r.priority === 1 ? ' · urgent' : ''}`, k: 'tool' }); }
  // Urgent work never waits behind normal work: if all slots are busy, the lowest-priority runner yields.
  const urgentWaiting = A.runs.filter((r) => r.state === 'QUEUED' && r.priority === 1);
  for (const u of urgentWaiting) {
    const victim = A.runs.filter((r) => r.state === 'RUNNING' && r.priority > 1).sort((a, b) => b.priority - a.priority)[0];
    if (!victim) break;
    victim.state = 'QUEUED'; victim.log.push({ at: at(), text: 'Yielded its slot to urgent work; continues from here', k: 'decision' });
    u.state = 'RUNNING'; u.log.push({ at: at(), text: 'Started · urgent', k: 'tool' });
  }
}
function finish(w: World, r: AgentRun) {
  r.state = 'DONE';
  if (r.kind === 'SEARCH') {
    r.log.push({ at: at(), text: `Finished: read ${r.total} profiles${r.providerState === 'SKIPPED' ? ` (${r.provider} skipped)` : ''}, ${r.found.length} new ${r.found.length === 1 ? 'match' : 'matches'}`, k: 'decision' });
    const s = ag(w).searches.find((x) => x.id === r.searchId);
    if (s) for (const p of r.found) if (!s.universe.some((u) => u.personId === p)) s.universe.push({ personId: p, since: today(w) });
    note(w, `${clientShort(w, r.clientOrgId)} · ${r.label} finished: ${r.total} profiles read, ${r.found.length ? `${r.found.length} new (${r.found.map((p) => personName(w, p)).join(', ')})` : 'nothing new'}. Nothing was sent to anyone.`, [{ label: 'Show agents', act: { t: 'nav', to: '/r/agency/agents' } }]);
  } else if (r.kind === 'CAMPAIGN') {
    const c = ag(w).campaigns.find((x) => x.id === r.campaignId);
    if (c) c.status = c.messages.some((m) => m.status === 'HELD') ? 'PAUSED' : 'DONE';
    r.log.push({ at: at(), text: `Finished this run: ${c?.messages.filter((m) => m.status === 'SENT_SIMULATED').length ?? 0} sent (simulated); ${c?.messages.filter((m) => m.status === 'HELD').length ?? 0} wait for the next run`, k: 'decision' });
  } else r.log.push({ at: at(), text: `Finished: ${r.total} checks`, k: 'decision' });
}
export function tick(w: World) {
  const A = ag(w);
  A.lastTickAt = Date.now();
  for (const d of A.docs) if (d.status === 'UPLOADING') { d.progress = Math.min(100, d.progress + 25); if (d.progress >= 100) d.status = 'READY'; }
  for (const r of A.runs) {
    if (r.state === 'FAILED' && r.retryInTicks != null && r.retryInTicks > 0 && r.attempts === 1) {
      r.retryInTicks -= 1;
      if (r.retryInTicks === 0) { r.state = 'RETRYING'; r.retryInTicks = 1; r.log.push({ at: at(), text: `Retrying ${r.provider} automatically (attempt 2)`, k: 'tool' }); }
      continue;
    }
    if (r.state === 'RETRYING') {
      r.retryInTicks = (r.retryInTicks ?? 1) - 1;
      if (r.retryInTicks > 0) continue;
      r.attempts += 1;
      if (r.attempts <= (r.failAttempts ?? 0)) {
        r.state = 'FAILED'; r.retryInTicks = undefined;
        r.log.push({ at: at(), text: `${r.provider} still not responding after an automatic retry. Waiting for your decision; other agents carry on.`, k: 'issue' });
        note(w, `The ${clientShort(w, r.clientOrgId)} ${r.label.toLowerCase()} is stuck: ${r.provider} (a simulated job board) still isn’t answering after one automatic retry. ${r.done} of ${r.total} profiles are kept. Other clients’ agents aren’t affected. I can retry now, or skip that provider and finish on the Talent Q network.`,
          [{ label: 'Retry now', primary: true, act: { t: 'do', op: 'agency.run.retry', args: { id: r.id } } }, { label: `Skip ${r.provider}`, act: { t: 'do', op: 'agency.run.skip', args: { id: r.id } } }]);
      } else {
        r.state = 'RUNNING'; r.providerState = 'RECOVERED'; r.retryInTicks = undefined;
        r.log.push({ at: at(), text: `${r.provider} answered on attempt ${r.attempts}. Continuing from ${r.done} of ${r.total}; nothing was lost.`, k: 'decision' });
        note(w, `${r.provider} is answering again. The ${clientShort(w, r.clientOrgId)} ${r.label.toLowerCase()} continues from ${r.done} of ${r.total}; nothing was lost or repeated.`);
      }
    }
  }
  fillSlots(w);
  for (const r of A.runs.filter((x) => x.state === 'RUNNING').sort((a, b) => a.priority - b.priority).slice(0, SLOTS)) {
    if (r.failAt != null && r.done === r.failAt && r.providerState === 'OK' && r.attempts === 1) {
      r.state = 'FAILED'; r.providerState = 'DOWN'; r.retryInTicks = 4;
      r.log.push({ at: at(), text: `${r.provider} stopped responding (simulated outage). ${r.done} of ${r.total} kept. Will retry automatically once.`, k: 'issue' });
      note(w, `${r.provider} stopped responding during the ${clientShort(w, r.clientOrgId)} ${r.label.toLowerCase()} (a simulated outage). I’ve kept the ${r.done} profiles already read and will retry once automatically. The other agents are unaffected.`, [{ label: 'Show agents', act: { t: 'nav', to: '/r/agency/agents' } }]);
      continue;
    }
    if (r.kind === 'CAMPAIGN') {
      const c = A.campaigns.find((x) => x.id === r.campaignId);
      const m = c?.messages.find((x) => x.status === 'QUEUED');
      if (m && c) {
        if (isWithdrawn(w, m.personId)) { m.status = 'EXCLUDED'; m.reason = consentReason(w, m.personId, c.clientOrgId); r.log.push({ at: at(), text: `Skipped ${personName(w, m.personId)}: consent withdrawn`, k: 'issue' }); }
        else { m.status = 'SENT_SIMULATED'; m.at = at(); m.receipt = `msg_sim_${(++A.seq + 500).toString(36)}`; r.log.push({ at: at(), text: `Sent to ${personName(w, m.personId)} (${m.words} words, receipt ${m.receipt}, simulated)`, k: 'tool' }); }
      }
      r.done += 1;
    } else {
      r.done += 1;
      const y = r.yields.find((x) => x.at === r.done);
      if (y && !isWithdrawn(w, y.personId) && !r.found.includes(y.personId)) {
        const inPool = A.pools.some((p) => p.clientOrgId === r.clientOrgId && p.members.includes(y.personId));
        if (!inPool) r.found.push(y.personId);
        r.log.push({ at: at(), text: `${personName(w, y.personId)}${inPool ? ' (already in the pool)' : ': new match'}`, k: 'finding' });
      } else if (r.kind === 'SEARCH' && r.done % 4 === 0) r.log.push({ at: at(), text: `Read ${r.done} of ${r.total} profiles`, k: 'tool' });
      else if (r.kind === 'EVIDENCE') r.log.push({ at: at(), text: `Checked evidence item ${r.done} of ${r.total}`, k: 'tool' });
    }
    if (r.done >= r.total) finish(w, r);
  }
  fillSlots(w);
}

let timer: number | null = null;
const needsTick = (w: World) => { const A = agency(w); return A.runs.some((r) => ['RUNNING', 'RETRYING', 'QUEUED'].includes(r.state) || (r.state === 'FAILED' && (r.retryInTicks ?? 0) > 0 && r.attempts === 1)) || A.docs.some((d) => d.status === 'UPLOADING'); };
export const TICK_MS = 1000;
/** Agents run in this tab while someone from the agency is signed in. A run left RUNNING by a closed tab says so. */
export function startRunner() {
  if (typeof window === 'undefined' || timer != null) return;
  const w0 = getWorld(); const A0 = agency(w0);
  if (A0.lastTickAt && Date.now() - A0.lastTickAt > 15000 && A0.runs.some((r) => r.state === 'RUNNING')) {
    update((w) => { for (const r of ag(w).runs) if (r.state === 'RUNNING') { r.state = 'PAUSED'; r.pausedReason = 'Interrupted when the page closed. Every finished unit was kept; resume continues from here.'; r.log.push({ at: at(), text: `Interrupted at ${r.done} of ${r.total} when the page closed`, k: 'issue' }); } });
  }
  timer = window.setInterval(() => {
    const w = getWorld();
    if (!isAgency(w) || !needsTick(w) || w.network === 'offline') return;
    update((d) => tick(d));
  }, TICK_MS);
}

export const RUN_STATE: Record<AgentRun['state'], string> = { QUEUED: 'Waiting for a slot', RUNNING: 'Running', PAUSED: 'Paused', FAILED: 'Failed', RETRYING: 'Retrying', DONE: 'Finished', CANCELLED: 'Cancelled' };
export const PRIORITY: Record<1 | 2 | 3, string> = { 1: 'Urgent', 2: 'Normal', 3: 'Low' };
