// Hiring campaigns: read models and mutations (audit addendum §D, AD-D-01…08).
// A campaign is a grouping and workload entity. Everything shown about its roles is computed here from the one
// store: requisitions are the existing mandates (MandateX, plus the legacy `w.mandate` for m_backend); stage counts
// come from w.pipeline; messages from w.threads; interviews from w.interviews; scorecards from the rubrics slice
// (read-only, index only ever with its coverage). Nothing is copied into the campaign.
// Privacy: people are filtered by canSeeCandidate for the viewing organisation; hidden people are counted, never named.
// Agency: a campaign carries clientOrgId; its roles must belong to that client; lists show one client at a time.
import { actorOf, canSeeCandidate, emit, orgOf, personOf, simNow, uid, type World } from '../../mock/world';
import type { Actor, HiringCampaign, Interview, MandateStatus, Stage, Thread } from '../../state/domain';
import { STAGES, STAGE_LABEL } from '../../state/domain';
import { campaigns, campaignsMut, campaignOf } from '../../state/areas/campaigns';
import { approvedVersion, roleIndex, rubricFor } from '../../state/areas/rubrics';
import { agency } from '../../state/areas/agency';
import { agencyMandates, focusOf } from '../agency/model';

export const CP = { list: '/r/campaigns', one: (id: string) => `/r/campaigns/${id}` } as const;
export const isAgencyActor = (w: World, a: Actor) => orgOf(w, a.orgId)?.kind === 'AGENCY';
/** The client lens for agency staff (shared with the agency pages), undefined for employers. */
export const lensOf = (w: World, a: Actor) => (isAgencyActor(w, a) ? focusOf(w, a.id) : undefined);
export const scopeFor = (c: Pick<HiringCampaign, 'orgId'>) => `ORG:${c.orgId}`;

// ---------------- Requisitions: one read model over MandateX and the legacy Senior Backend mandate ----------------
export interface Req { id: string; title: string; orgId: string; clientOrgId?: string; status: MandateStatus; owner: string; team: string; legacy: boolean; href: string; confidential?: boolean; createdBy: string }
export function reqOf(w: World, id: string): Req | undefined {
  const meta = campaigns(w).roleMeta[id] ?? {};
  if (id === w.mandate.mandateId) return { id, title: w.mandate.title, orgId: 'org_kora', status: w.mandate.status, owner: meta.owner ?? 'u_ada', team: w.mandate.team, legacy: true, href: `/r/roles/${id}`, createdBy: 'u_ada' };
  const m = w.mandates.find((x) => x.id === id);
  if (!m) return undefined;
  const agencyRole = orgOf(w, m.orgId)?.kind === 'AGENCY' || (m.clientOrgId && m.createdBy.startsWith('u_') && orgOf(w, actorOf(w, m.createdBy)?.orgId)?.kind === 'AGENCY');
  return { id, title: m.title, orgId: agencyRole ? 'org_tb' : m.orgId, clientOrgId: m.clientOrgId, status: m.status, owner: meta.owner ?? m.createdBy, team: m.team, legacy: false,
    href: agencyRole ? `/r/agency/clients/mandate/${id}` : `/r/roles/${id}`, confidential: m.confidential, createdBy: m.createdBy };
}
/** Requisitions an organisation (or, for an agency, one client's workspace) may organise. */
export function reqsFor(w: World, orgId: string, clientOrgId?: string): Req[] {
  if (orgOf(w, orgId)?.kind === 'AGENCY') return clientOrgId ? agencyMandates(w, clientOrgId).map((m) => reqOf(w, m.id)!).filter(Boolean) : [];
  const ids = [...(orgId === 'org_kora' ? [w.mandate.mandateId] : []), ...w.mandates.filter((m) => m.orgId === orgId && !(m.clientOrgId && m.clientOrgId !== orgId)).map((m) => m.id)];
  return ids.map((id) => reqOf(w, id)!).filter((r) => r && r.orgId === orgId);
}
export const isClosed = (r: Req) => r.status === 'CLOSED' || r.status === 'FILLED';
export const STATUS_WORD: Record<MandateStatus, string> = { DRAFT: 'Brief in draft', APPROVED: 'Brief approved', SOURCING: 'Finding people', INTERVIEWING: 'Interviewing', PAUSED: 'Paused', FILLED: 'Filled', CLOSED: 'Closed' };

// ---------------- Campaign access ----------------
/** Campaigns the actor may see: their organisation's, and for agency staff only the client in focus. */
export function visibleCampaigns(w: World, a: Actor): HiringCampaign[] {
  if (!a.orgId) return [];
  const lens = lensOf(w, a);
  return campaigns(w).list.filter((c) => c.orgId === a.orgId && (lens === undefined || c.clientOrgId === lens));
}
export type Access = { ok: true; c: HiringCampaign } | { ok: false; why: 'MISSING' | 'OTHER_ORG' };
export function accessTo(w: World, a: Actor, id: string): Access {
  const c = campaigns(w).list.find((x) => x.id === id);
  if (!c) return { ok: false, why: 'MISSING' };
  if (c.orgId !== a.orgId) return { ok: false, why: 'OTHER_ORG' };
  return { ok: true, c };
}

// ---------------- Stage counts (from w.pipeline, privacy-filtered) ----------------
export interface StageCounts { counts: Record<Stage, number>; inPlay: number; out: number; hidden: number; people: string[] }
export function stageCounts(w: World, roleId: string, viewerOrg: string): StageCounts {
  const counts = Object.fromEntries([...STAGES, 'REJECTED', 'WITHDRAWN'].map((s) => [s, 0])) as Record<Stage, number>;
  let hidden = 0; const people: string[] = [];
  for (const e of w.pipeline.filter((p) => p.mandateId === roleId)) {
    if (!canSeeCandidate(w, e.personId, viewerOrg)) { if (!w.consents[e.personId]?.withdrawnFrom.includes(viewerOrg)) hidden++; continue; }
    counts[e.stage]++; people.push(e.personId);
  }
  const out = counts.REJECTED + counts.WITHDRAWN;
  return { counts, inPlay: STAGES.filter((s) => s !== 'HIRED').reduce((n, s) => n + counts[s], 0), out, hidden, people };
}

// ---------------- Messages by role (from w.threads) ----------------
const fromCandidate = (t: Thread, m: Thread['messages'][number]) => m.from === t.personId;
export interface RoleMessages { threads: Thread[]; awaitingReply: Thread[]; toApprove: number; last?: { t: Thread; at: string; text: string; theirs: boolean } }
export function messagesFor(w: World, viewerOrg: string, roleId: string | null, campaignId: string): RoleMessages {
  const threads = w.threads.filter((t) => t.orgId === viewerOrg && canSeeCandidate(w, t.personId, viewerOrg) && (roleId ? t.mandateId === roleId : t.campaignId === campaignId && !t.mandateId));
  const live = (t: Thread) => t.messages.filter((m) => m.status !== 'DISCARDED');
  const awaitingReply = threads.filter((t) => { const ms = live(t); const l = ms[ms.length - 1]; return l && fromCandidate(t, l) && !['CLOSED', 'BLOCKED', 'MUTED'].includes(t.state ?? ''); });
  const toApprove = threads.flatMap((t) => t.messages).filter((m) => m.status === 'AWAITING_APPROVAL').length;
  const all = threads.flatMap((t) => live(t).map((m) => ({ t, m }))).sort((x, y) => y.m.at.localeCompare(x.m.at));
  const l = all[0];
  return { threads, awaitingReply, toApprove, last: l ? { t: l.t, at: l.m.at, text: l.m.body.replace(/\s+/g, ' ').slice(0, 120), theirs: fromCandidate(l.t, l.m) } : undefined };
}

// ---------------- Per-role scorecard (rubrics slice, read-only; index never without coverage) ----------------
export interface Scorecard { v?: number; proposed: boolean; rows: { personId: string; index: number | null; coverage: number; observed: number; total: number; reviewed: number }[]; assessed: number; of: number }
export function scorecard(w: World, roleId: string, people: string[]): Scorecard {
  const rub = rubricFor(w, roleId); const ver = approvedVersion(w, roleId);
  const proposed = !!rub?.versions.some((v) => v.state === 'Q_PROPOSED');
  if (!ver) return { proposed, rows: [], assessed: 0, of: people.length };
  const rows = people.map((pid) => ({ personId: pid, ...roleIndex(w, roleId, pid, ver.v) }));
  return { v: ver.v, proposed, rows, assessed: rows.filter((r) => r.observed > 0).length, of: people.length };
}

// ---------------- Next actions and approvals ----------------
export type ActKind = 'BRIEF' | 'RUBRIC' | 'MESSAGE' | 'REPLY' | 'SCHEDULE' | 'FEEDBACK' | 'SEARCH' | 'UNFILED' | 'EMPTY';
export interface NextAction { id: string; kind: ActKind; roleId?: string; text: string; who: string[]; approval: boolean; go: { label: string; to?: string; say?: string; op?: { name: string; args: Record<string, unknown> } } }
const first = (w: World, id: string) => w.actors.find((x) => x.id === id)?.first ?? personOf(w, id)?.name.split(' ')[0] ?? 'someone';
const BRIEF_APPROVERS = ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'];
const SEND_APPROVERS = ['OWNER', 'ADMIN', 'RECRUITER'];
export function nextActions(w: World, c: HiringCampaign): NextAction[] {
  const out: NextAction[] = []; const org = c.orgId;
  const members = w.actors.filter((x) => x.orgId === org);
  if (!c.roles.length) out.push({ id: `${c.id}:empty`, kind: 'EMPTY', text: 'Add the roles this campaign is for', who: [c.owner], approval: false, go: { label: 'Add a role', say: `add a role to ${c.name}` } });
  for (const rid of c.roles) {
    const r = reqOf(w, rid); if (!r || isClosed(r)) continue;
    const short = r.title;
    if (r.status === 'DRAFT') {
      // Who it waits on: the person the author named ("for Bayo’s approval"), else anyone else who may approve briefs.
      const note = r.legacy ? '' : w.mandates.find((m) => m.id === rid)?.versions.slice(-1)[0]?.note ?? '';
      const named = members.find((x) => new RegExp(`for ${x.first}’s approval`).test(note));
      const who = r.legacy ? [r.owner] : named ? [named.id] : members.filter((x) => x.role && BRIEF_APPROVERS.includes(x.role) && x.id !== r.createdBy).map((x) => x.id);
      out.push({ id: `${rid}:brief`, kind: 'BRIEF', roleId: rid, text: `Approve the “${short}” brief${named ? `: waiting for ${named.first}` : ''}`, who, approval: true, go: { label: 'Review the brief', to: r.legacy ? '/r/mandate' : r.href } });
      continue;
    }
    const rub = rubricFor(w, rid);
    if (rub?.versions.some((v) => v.state === 'Q_PROPOSED')) out.push({ id: `${rid}:rubric`, kind: 'RUBRIC', roleId: rid, text: `Approve the rubric Q proposed for ${short}`, who: [r.owner], approval: true, go: { label: 'Review the rubric', to: `/r/roles/${rid}/rubric` } });
    else if (!approvedVersion(w, rid) && !r.clientOrgId) out.push({ id: `${rid}:norubric`, kind: 'RUBRIC', roleId: rid, text: `Agree how ${short} candidates are assessed (no rubric yet)`, who: [r.owner], approval: false, go: { label: 'Start a rubric', to: `/r/roles/${rid}/rubric` } });
    const mm = messagesFor(w, org, rid, c.id);
    const toApprove = mm.threads.flatMap((t) => t.messages.filter((m) => m.status === 'AWAITING_APPROVAL').map((m) => ({ t, m })));
    for (const { t, m } of toApprove) out.push({ id: `${m.id}:approve`, kind: 'MESSAGE', roleId: rid, text: `Approve the message to ${first(w, t.personId)} (${short})`, who: members.filter((x) => x.role && SEND_APPROVERS.includes(x.role)).map((x) => x.id), approval: true, go: { label: 'Open the message', op: { name: 'campaigns.thread', args: { pid: t.personId } } } });
    for (const t of mm.awaitingReply) out.push({ id: `${t.id}:reply`, kind: 'REPLY', roleId: rid, text: `${first(w, t.personId)} wrote about ${short}${t.initiatedBy === 'CANDIDATE' ? ' (they started the conversation)' : ''}: reply`, who: [r.owner], approval: false, go: { label: 'Open the thread', op: { name: 'campaigns.thread', args: { pid: t.personId } } } });
    const ivs: Interview[] = w.interviews.filter((i) => i.mandateId === rid && i.orgId === org && canSeeCandidate(w, i.personId, org));
    for (const i of ivs.filter((x) => x.status === 'PLANNING')) out.push({ id: `${i.id}:plan`, kind: 'SCHEDULE', roleId: rid, text: `Arrange ${first(w, i.personId)}’s interview (${short})`, who: [r.owner], approval: false, go: { label: 'Open interviews', to: `/r/interviews/${i.id}` } });
    for (const i of ivs.filter((x) => x.status === 'DONE')) for (const p of i.panel.filter((pid) => !i.feedback.some((f) => f.by === pid))) out.push({ id: `${i.id}:fb:${p}`, kind: 'FEEDBACK', roleId: rid, text: `Feedback on ${first(w, i.personId)}’s interview is missing from ${first(w, p)}`, who: [p], approval: false, go: { label: 'Open the interview', to: `/r/interviews/${i.id}` } });
    const sc = stageCounts(w, rid, org);
    if (!sc.people.length && !sc.hidden && !r.clientOrgId) out.push({ id: `${rid}:search`, kind: 'SEARCH', roleId: rid, text: `Nobody is on ${short} yet: find people`, who: [r.owner], approval: false, go: { label: 'Find people', to: r.href } });
  }
  const unfiled = messagesFor(w, org, null, c.id);
  for (const t of unfiled.threads) out.push({ id: `${t.id}:file`, kind: 'UNFILED', text: `${first(w, t.personId)}’s message is in this campaign but not filed to a role`, who: [c.owner], approval: false, go: { label: 'Open the thread', op: { name: 'campaigns.thread', args: { pid: t.personId } } } });
  return out;
}
export const forMe = (acts: NextAction[], a: Actor) => acts.filter((x) => x.who.includes(a.id));

// ---------------- Cross-role board (a person × role view; one person can relate to two roles) ----------------
export interface BoardRow { personId: string; cells: Record<string, Stage | undefined>; multi: boolean; awaiting: boolean; assessed: boolean }
export function board(w: World, c: HiringCampaign, viewerOrg: string): { rows: BoardRow[]; hidden: number } {
  const map = new Map<string, BoardRow>(); let hidden = 0;
  for (const rid of c.roles) {
    const sc = stageCounts(w, rid, viewerOrg); hidden += sc.hidden;
    for (const e of w.pipeline.filter((p) => p.mandateId === rid && sc.people.includes(p.personId))) {
      const row = map.get(e.personId) ?? { personId: e.personId, cells: {}, multi: false, awaiting: false, assessed: false };
      row.cells[rid] = e.stage; map.set(e.personId, row);
    }
  }
  for (const row of map.values()) {
    const ids = Object.keys(row.cells);
    row.multi = ids.length > 1;
    row.awaiting = ids.some((rid) => messagesFor(w, viewerOrg, rid, c.id).awaitingReply.some((t) => t.personId === row.personId));
    row.assessed = ids.some((rid) => roleIndex(w, rid, row.personId).observed > 0);
  }
  const rank = (r: BoardRow) => Math.max(...Object.values(r.cells).map((s) => (s ? STAGES.indexOf(s) : -1)));
  return { rows: [...map.values()].sort((x, y) => rank(y) - rank(x) || (personOf(w, x.personId)?.name ?? '').localeCompare(personOf(w, y.personId)?.name ?? '')), hidden };
}
/** Saved-filter queries: 'all' | 'stage:<STAGE>' | 'multi' | 'reply' | 'assessed' | 'role:<id>'. */
export function applyFilter(rows: BoardRow[], q: string): BoardRow[] {
  if (!q || q === 'all') return rows;
  if (q === 'multi') return rows.filter((r) => r.multi);
  if (q === 'reply') return rows.filter((r) => r.awaiting);
  if (q === 'assessed') return rows.filter((r) => r.assessed);
  if (q.startsWith('stage:')) { const s = q.slice(6) as Stage; return rows.filter((r) => Object.values(r.cells).includes(s)); }
  if (q.startsWith('role:')) { const id = q.slice(5); return rows.filter((r) => r.cells[id]); }
  return rows;
}
export const FILTER_LABEL = (q: string, w: World) => (q === 'multi' ? 'In more than one role' : q === 'reply' ? 'Waiting for a reply' : q === 'assessed' ? 'Assessed on a rubric' : q.startsWith('stage:') ? `At ${STAGE_LABEL[q.slice(6) as Stage].toLowerCase()}` : q.startsWith('role:') ? reqOf(w, q.slice(5))?.title ?? 'One role' : 'Everyone');

// ---------------- Outreach runs: children of a requisition (agency), never the hiring campaign itself ----------------
export const outreachFor = (w: World, c: HiringCampaign) => (c.orgId === 'org_tb' ? agency(w).campaigns.filter((o) => c.roles.includes(o.mandateId) && o.clientOrgId === c.clientOrgId) : []);
/** The hiring campaign an outreach campaign rolls up to (via its requisition). */
export const parentOfOutreach = (w: World, mandateId: string) => campaignOf(w, mandateId, 'org_tb');

// ---------------- Audit trail (events scoped to the organisation, tagged with the campaign) ----------------
export const historyOf = (w: World, c: HiringCampaign) => w.events.filter((e) => e.scope === scopeFor(c) && (e.data?.campaignId === c.id)).slice().reverse();

// ---------------- Dates ----------------
export const dayText = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Date(iso.length === 10 ? `${iso}T12:00:00+01:00` : iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'Africa/Lagos' });
export function daysLeft(w: World, iso?: string) { if (!iso) return undefined; return Math.ceil((new Date(`${iso}T23:59:00+01:00`).getTime() - simNow(w).getTime()) / 864e5); }
export function dueText(w: World, iso?: string) {
  const d = daysLeft(w, iso); if (d === undefined) return 'No deadline';
  return d < 0 ? `${dayText(iso!)} · ${-d} days late` : d === 0 ? `${dayText(iso!)} · today` : `${dayText(iso!)} · ${d < 15 ? `${d} days left` : `${Math.round(d / 7)} weeks left`}`;
}

// ---------------- Mutations (each audited; inverses registered as ops for undo) ----------------
export type Result = { ok: true; text: string; id?: string } | { ok: false; code: 'CONFLICT' | 'CLOSED' | 'CLIENT' | 'MISSING' | 'PERM' | 'ALREADY' | 'ARCHIVED'; text: string; other?: HiringCampaign };
export const canManage = (a: Actor) => !!a.role && ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role);

export function createCampaign(w: World, a: Actor, name: string, clientOrgId?: string, goal = ''): HiringCampaign {
  const c: HiringCampaign = { id: uid('c'), orgId: a.orgId!, clientOrgId, name, goal, owner: a.id, status: 'ACTIVE', createdAt: simNow(w).toISOString().slice(0, 10), createdBy: a.id, roles: [], savedFilters: [] };
  campaignsMut(w).list.push(c);
  emit(w, a.id, 'campaign.created', scopeFor(c), `${a.name} created the hiring campaign “${name}”${clientOrgId ? ` for ${orgOf(w, clientOrgId)?.name}` : ''}.`, { campaignId: c.id });
  return c;
}
/** Add a requisition. A role belongs to one campaign at most: a role in another campaign is a conflict unless `move`. */
export function addRole(w: World, a: Actor, cid: string, rid: string, move = false): Result {
  const c = campaignsMut(w).list.find((x) => x.id === cid); const r = reqOf(w, rid);
  if (!c || !r) return { ok: false, code: 'MISSING', text: 'I couldn’t find that role or campaign.' };
  if (c.status === 'ARCHIVED') return { ok: false, code: 'ARCHIVED', text: `“${c.name}” is archived. Re-open it first, then add roles.` };
  if (r.orgId !== c.orgId || (c.clientOrgId && r.clientOrgId !== c.clientOrgId)) return { ok: false, code: 'CLIENT', text: c.clientOrgId ? `${r.title} is for ${orgOf(w, r.clientOrgId)?.name ?? 'another organisation'}, and “${c.name}” is ${orgOf(w, c.clientOrgId)?.name}’s. A client campaign only holds that client’s roles.` : `${r.title} isn’t one of ${orgOf(w, c.orgId)?.name}’s roles.` };
  if (c.roles.includes(rid)) return { ok: false, code: 'ALREADY', text: `${r.title} is already in “${c.name}”.` };
  if (isClosed(r)) return { ok: false, code: 'CLOSED', text: `${r.title} is ${r.status === 'FILLED' ? 'filled' : 'closed'}, so it can’t join a campaign. Re-open the role first if you’re hiring for it again.` };
  const other = campaignsMut(w).list.find((x) => x.id !== cid && x.roles.includes(rid));
  if (other && !move) return { ok: false, code: 'CONFLICT', other, text: `${r.title} is already in “${other.name}”. A role belongs to one campaign, so I’d move it rather than copy it.` };
  if (other) { other.roles = other.roles.filter((x) => x !== rid); emit(w, a.id, 'campaign.role.removed', scopeFor(other), `${a.name} moved ${r.title} out of “${other.name}” into “${c.name}”.`, { campaignId: other.id, mandateId: rid }); }
  c.roles.push(rid);
  emit(w, a.id, 'campaign.role.added', scopeFor(c), `${a.name} added ${r.title} to “${c.name}”${other ? ` (moved from “${other.name}”)` : ''}.`, { campaignId: c.id, mandateId: rid, from: other?.id });
  return { ok: true, text: `${r.title} is now in “${c.name}”${other ? `, moved from “${other.name}”` : ''}.` };
}
export function removeRole(w: World, a: Actor, cid: string, rid: string): Result {
  const c = campaignsMut(w).list.find((x) => x.id === cid); const r = reqOf(w, rid);
  if (!c || !c.roles.includes(rid)) return { ok: false, code: 'MISSING', text: 'That role isn’t in this campaign.' };
  c.roles = c.roles.filter((x) => x !== rid);
  emit(w, a.id, 'campaign.role.removed', scopeFor(c), `${a.name} took ${r?.title ?? rid} out of “${c.name}”. The role, its people and messages are unchanged.`, { campaignId: c.id, mandateId: rid });
  return { ok: true, text: `${r?.title ?? 'The role'} is out of “${c.name}”. Nothing about the role itself changed.` };
}
export function setStatus(w: World, a: Actor, cid: string, status: HiringCampaign['status'], reason?: string): Result {
  const c = campaignsMut(w).list.find((x) => x.id === cid);
  if (!c) return { ok: false, code: 'MISSING', text: 'I couldn’t find that campaign.' };
  const was = c.status; c.status = status;
  const verb = status === 'ARCHIVED' ? 'archived' : was === 'ARCHIVED' ? 're-opened' : status === 'PAUSED' ? 'paused' : 'resumed';
  emit(w, a.id, `campaign.${verb.replace('-', '')}`, scopeFor(c), `${a.name} ${verb} “${c.name}”${reason ? `: ${reason}` : ''}.`, { campaignId: c.id, from: was, to: status });
  return { ok: true, text: verb };
}
export function rename(w: World, a: Actor, cid: string, name: string): Result {
  const c = campaignsMut(w).list.find((x) => x.id === cid);
  if (!c) return { ok: false, code: 'MISSING', text: 'I couldn’t find that campaign.' };
  const was = c.name; c.name = name;
  emit(w, a.id, 'campaign.renamed', scopeFor(c), `${a.name} renamed “${was}” to “${name}”.`, { campaignId: c.id, from: was });
  return { ok: true, text: was };
}
export function saveFilter(w: World, a: Actor, cid: string, label: string, query: string) {
  const c = campaignsMut(w).list.find((x) => x.id === cid); if (!c) return;
  (c.savedFilters ??= []).push({ id: uid('sf'), label, query });
  emit(w, a.id, 'campaign.filter.saved', scopeFor(c), `${a.name} saved the filter “${label}” on “${c.name}”.`, { campaignId: c.id });
}

// ---------------- Language: find a campaign or a role in what someone said ----------------
const STOP = new Set(['the', 'campaign', 'campaigns', 'hiring', 'and', 'for', 'role', 'roles', 'engineer', 'this', 'that', 'into', 'with', 'our', 'my', 'add', 'to', 'in', 'of', 'a', 'an', 'it', 'show', 'me', 'open', 'agency']);
const words = (s: string) => s.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t));
/** The campaign named in `norm` (best word overlap), among those the actor may see. */
export function campaignIn(w: World, a: Actor, norm: string, includeArchived = true): HiringCampaign | undefined {
  const said = new Set(words(norm));
  const scored = visibleCampaigns(w, a).filter((c) => includeArchived || c.status !== 'ARCHIVED').map((c) => ({ c, n: words(c.name).filter((t) => said.has(t) || (t.length > 4 && [...said].some((s) => s.length > 3 && t.startsWith(s)))).length })).filter((x) => x.n > 0).sort((x, y) => y.n - x.n);
  return scored[0]?.c;
}
const ROLE_STOP = new Set(['engineer', 'the', 'role', 'lead', 'and', 'via', 'agency', 'kora', 'pay', 'medlink', 'health']);
/** The requisition named in `norm`: distinctive title words count most (payouts, senior, support, ios). */
export function roleIn(w: World, reqs: Req[], norm: string): Req | undefined {
  const said = new Set(norm.toLowerCase().split(/[^a-z0-9]+/));
  const scored = reqs.map((r) => {
    const ts = r.title.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !ROLE_STOP.has(t));
    const hits = ts.filter((t) => said.has(t) || said.has(t.replace(/s$/, '')) || said.has(`${t}s`));
    return { r, n: hits.length, frac: ts.length ? hits.length / ts.length : 0 };
  }).filter((x) => x.n > 0).sort((x, y) => y.n - x.n || y.frac - x.frac);
  return scored[0]?.r;
}
