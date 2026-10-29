// Shared model for the hire-a area (R1 Funmi, R5 Bayo): role templates, an illustrative pay guide,
// the simulated search pools, mandate versioning, permissions, and one-time seeding of Kora's history
// (audit events and Bayo's remembered preference). Pages and Q skills both use these, so what Q says and
// what the page shows always come from the same state.
import type { MemoryItem, Requirement } from '@contracts';
import { actorOf, canSeeCandidate, emit, getWorld, orgOf, simNow, uid, update, type World } from '../../mock/world';
import type { Actor, MandateX, OrgRole } from '../../state/domain';
import { hireA, readA, type HAIntake, type RoleKey, type Snap } from '../../state/areas/hire-a';
import { startSourcing } from '../../q/scripts';
import { subscribe } from '../../mock/runtime';
import { appendQ, pushUndo } from '../../q/core/engine';

export const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;
export const k = (n: number) => (n >= 1e6 ? `₦${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m` : `₦${Math.round(n / 1000)}k`);
export const round5k = (n: number) => Math.round(n / 5000) * 5000;
export const dayLabel = (iso: string, tz = 'Africa/Lagos') => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
export const timeLabel = (iso: string, tz = 'Africa/Lagos') => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
export const simIso = (w: World) => simNow(w).toISOString();

// ---------------- Roles a small business might need (plain language) ----------------
const rq = (reqId: string, label: string, mustHave: boolean, plain: string): Requirement => ({ reqId, label, mustHave, plain });
export const ROLES: Record<RoleKey, { label: string; plain: string; kws: string[]; full: [number, number]; partOk: boolean; reqs: Requirement[]; does: string }> = {
  bookkeeper: { label: 'bookkeeper', does: 'keeps your daily sales, expenses and supplier payments written down and balanced, and gives you a simple summary each month',
    plain: 'Keeps the money side of the business recorded and balanced: daily sales, cash and transfers, what you spend and what you owe.', partOk: true, full: [180000, 280000],
    kws: ['books', 'bookkeeper', 'bookkeeping', 'accounts', 'accountant', 'accounting', 'money', 'records', 'receipts', 'expenses', 'invoices', 'figures', 'numbers', 'tax', 'cash book', 'sales record', 'balance', 'profit'],
    reqs: [rq('b1', 'Daily sales and expense records', true, 'Writes down every sale and cost the same day, so nothing is missed'), rq('b2', 'Matching cash, POS and transfers', true, 'Checks the money in the till and the bank match what was sold'),
      rq('b3', 'Spreadsheet or bookkeeping app', true, 'Comfortable in Excel, Google Sheets or a simple bookkeeping app'), rq('b4', 'Monthly summary', false, 'Gives you one page each month: what came in, what went out, what is owed'), rq('b5', 'Supplier payments', false, 'Keeps track of what you owe flour and packaging suppliers')] },
  assistant: { label: 'shop assistant', does: 'serves customers, takes payment at the till and keeps the counter stocked, so you can bake',
    plain: 'Serves customers at the counter, takes cash and POS payments, and keeps the shop tidy and stocked.', partOk: true, full: [60000, 90000],
    kws: ['customers', 'customer', 'serve', 'serving', 'counter', 'queue', 'till', 'cashier', 'sell', 'selling', 'shop floor', 'front of shop', 'attend to'],
    reqs: [rq('a1', 'Serving customers', true, 'Friendly and quick with customers, even at busy times'), rq('a2', 'Handling cash and POS', true, 'Takes payment correctly and gives the right change'), rq('a3', 'Keeping the shop stocked', false, 'Refills shelves and keeps the counter clean')] },
  manager: { label: 'shop manager', does: 'runs the shop day to day when you’re not there: opening and closing, the rota, stock and handling problems',
    plain: 'Runs the shop day to day: opens and closes, plans who works when, orders stock and sorts out problems.', partOk: false, full: [150000, 250000],
    kws: ['manage', 'manager', 'run the shop', 'in charge', 'when i am not there', 'when i am away', 'supervise', 'oversee', 'staff', 'rota'],
    reqs: [rq('m1', 'Running a shop day to day', true, 'Has opened, closed and run a shop or café'), rq('m2', 'Managing a small team', true, 'Plans shifts and keeps staff on track'), rq('m3', 'Ordering stock', false, 'Orders supplies before they run out')] },
  baker: { label: 'baker’s assistant', does: 'helps you bake and pack orders, so more gets made each day',
    plain: 'Helps with baking, packing and getting orders ready on time.', partOk: true, full: [70000, 110000],
    kws: ['bake', 'baking', 'baker', 'oven', 'bread', 'cakes', 'pastry', 'pastries', 'production', 'kitchen', 'orders ready'],
    reqs: [rq('k1', 'Baking experience', true, 'Has baked bread or pastries for sale'), rq('k2', 'Food hygiene', true, 'Keeps the kitchen clean and food safe'), rq('k3', 'Early starts', false, 'Can start at 5am on baking days')] },
  rider: { label: 'delivery rider', does: 'takes orders to customers quickly and safely',
    plain: 'Delivers orders to customers around the area, on time and in good condition.', partOk: true, full: [60000, 100000],
    kws: ['deliver', 'delivery', 'deliveries', 'dispatch', 'rider', 'bike', 'drop off'],
    reqs: [rq('d1', 'Own bike or motorbike', true, 'Has reliable transport'), rq('d2', 'Knows the area', true, 'Knows Ikeja and nearby roads'), rq('d3', 'Careful with orders', false, 'Delivers food without damage')] },
};
export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];
const hasKw = (norm: string, kw: string) => (kw.includes(' ') ? norm.includes(kw) : new RegExp(`\\b${kw}`).test(norm));
/** Roles mentioned in a sentence, strongest first. */
export function rolesIn(norm: string): RoleKey[] {
  const scored = ROLE_KEYS.map((r) => ({ r, n: ROLES[r].kws.filter((kw) => hasKw(norm, kw)).length })).filter((x) => x.n > 0);
  return scored.sort((a, b) => b.n - a.n).map((x) => x.r);
}
/** Illustrative monthly pay guide for the role at these hours (labelled illustrative everywhere it shows). */
export function band(role: RoleKey, hours: 'FULL' | 'PART' = 'FULL', days = 3): [number, number] {
  const [a, b] = ROLES[role].full;
  if (hours === 'FULL') return [a, b];
  return [round5k((a * days) / 5), round5k((b * days) / 5)];
}
export const titleFor = (role: RoleKey, hours?: 'FULL' | 'PART', days?: number) => {
  const l = ROLES[role].label;
  const t = hours === 'PART' ? `Part-time ${l}` : `${l[0].toUpperCase()}${l.slice(1)}`;
  return hours === 'PART' && days ? `${t} (${days} days a week)` : t;
};
export const hoursText = (hours?: 'FULL' | 'PART', days?: number) => (hours === 'PART' ? `part-time, ${days ?? 3} days a week` : hours === 'FULL' ? 'full-time' : 'hours not decided');

// ---------------- People the simulated search can find ----------------
export interface PoolMeta { role?: RoleKey; level?: 'JUNIOR' | 'MID' | 'SENIOR'; years: number; fit: string[]; unknown: string[]; asks?: number; remote?: boolean }
export const POOL: Record<string, PoolMeta> = {
  p_ha_kemi: { role: 'bookkeeper', years: 4, fit: ['Daily records for two shops', 'Balances cash and POS'], unknown: [], asks: 90000 },
  p_ha_yusuf: { role: 'bookkeeper', years: 2, fit: ['Keeps sales records in Excel'], unknown: ['No work sample yet'], asks: 75000 },
  p_ha_halima: { role: 'bookkeeper', years: 6, fit: ['Accounting exams passed', 'Six years of accounts work'], unknown: ['Asks ₦150k+ a month'], asks: 150000 },
  p_ha_tope: { role: 'bookkeeper', years: 0, fit: ['Accounting degree'], unknown: ['No bookkeeping work yet'], asks: 70000 },
  p_ha_blessing: { role: 'assistant', years: 3, fit: ['Ran a bakery counter', 'Handles cash and POS'], unknown: [], asks: 75000 },
  p_ha_femi: { role: 'assistant', years: 2, fit: ['Cashier for two years'], unknown: ['No reference yet'], asks: 70000 },
  p_ha_aisha: { role: 'assistant', years: 1, fit: ['Weekend retail work'], unknown: ['Weekends only so far'], asks: 50000 },
  p_ha_segun: { role: 'manager', years: 5, fit: ['Opened and closed a shop', 'Managed a rota of 6'], unknown: [], asks: 200000 },
  p_ha_joy: { role: 'manager', years: 7, fit: ['Managed a café of 8'], unknown: ['Asks ₦250k a month'], asks: 250000 },
  p_ha_ruth: { role: 'baker', years: 3, fit: ['Bread and pastries for sale'], unknown: ['No trial bake yet'], asks: 85000 },
  p_ha_ibrahim: { role: 'baker', years: 4, fit: ['Hotel pastry cook'], unknown: [], asks: 95000 },
  p_ha_emmanuel: { role: 'rider', years: 3, fit: ['Own bike, knows Ikeja'], unknown: ['Permit check pending'], asks: 80000 },
  p_ha_sani: { role: 'rider', years: 2, fit: ['Food delivery across Ikeja'], unknown: [], asks: 70000 },
  // Kora Pay (engineering)
  p_tobi: { level: 'SENIOR', years: 7, fit: ['Ledger reconciliation at scale', 'Go library'], unknown: ['Salary expectation'] },
  p_ife: { level: 'SENIOR', years: 9, fit: ['Ran Go payment routing', 'Led incidents'], unknown: [] },
  p_kunle: { level: 'SENIOR', years: 6, fit: ['Open banking API gateway'], unknown: ['Years of Go: sources disagree'], remote: true },
  p_zara: { level: 'MID', years: 5, fit: ['Go fleet API', 'Postgres partitioning'], unknown: ['Payments experience'] },
  p_dayo: { level: 'SENIOR', years: 11, fit: ['Engineering lead, lending'], unknown: ['Based in London'] },
  p_ha_emeka: { level: 'JUNIOR', years: 1.5, fit: ['Go wallet service with tests'], unknown: ['Not production yet'] },
  p_ha_bolu: { level: 'JUNIOR', years: 2, fit: ['Loan disbursement jobs'], unknown: ['Go experience'] },
};
export const KORA_POOL = ['p_tobi', 'p_ife', 'p_kunle', 'p_zara', 'p_dayo', 'p_ha_emeka', 'p_ha_bolu'];
export const LEVEL_LABEL = { JUNIOR: 'Junior', MID: 'Mid-level', SENIOR: 'Senior' } as const;

// ---------------- Organisations and permissions ----------------
export const SEEDED_ORGS = ['org_kora', 'org_medlink', 'org_tb', 'org_rivers', 'org_tinda', 'org_carehome'];
/** A founder or small business that Q set up in conversation (R1): no org yet, or an org Q created. */
export const isFounder = (a: Actor) => a.side === 'recruiter' && (!a.orgId || !SEEDED_ORGS.includes(a.orgId));
export const ROLE_LABEL: Record<OrgRole, string> = { OWNER: 'owner', ADMIN: 'admin', RECRUITER: 'recruiter', HIRING_MANAGER: 'hiring manager', INTERVIEWER: 'interviewer', VIEWER: 'viewer' };
export type Capability = 'approve_brief' | 'edit_brief' | 'send_offer' | 'approve_send' | 'change_policy' | 'delete_role';
const CAN: Record<Capability, OrgRole[]> = {
  approve_brief: ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'],
  edit_brief: ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'],
  send_offer: ['OWNER', 'ADMIN', 'RECRUITER'],
  approve_send: ['OWNER', 'ADMIN', 'RECRUITER'],
  change_policy: ['OWNER', 'ADMIN'],
  delete_role: ['OWNER', 'ADMIN', 'RECRUITER'],
};
export const can = (a: Actor, cap: Capability) => !!a.role && CAN[cap].includes(a.role);
/** Who in the actor's organisation can do it (named, so Q can offer to ask them). */
export const whoCan = (w: World, a: Actor, cap: Capability) => w.actors.filter((x) => x.orgId === a.orgId && x.id !== a.id && x.role && CAN[cap].includes(x.role));
export const scopeOf = (a: Actor) => (a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId ?? a.id}`);

// ---------------- Mandates: org-scoped reads, versions, snapshots ----------------
export const orgMandates = (w: World, a: Actor) => (a.orgId ? w.mandates.filter((m) => m.orgId === a.orgId) : []);
export const lastAt = (m: MandateX) => m.versions[m.versions.length - 1]?.at ?? '';
export const curV = (m: MandateX) => m.versions[m.versions.length - 1]?.v ?? 1;
export const snapOf = (m: MandateX, hours?: 'FULL' | 'PART', days?: number): Snap => ({ title: m.title, plain: m.plain, location: m.location, workMode: m.workMode, pay: { ...m.pay }, requirements: m.requirements.map((r) => ({ ...r })), hours, days });
export const STATUS_PLAIN: Record<MandateX['status'], string> = { DRAFT: 'Draft · not approved yet', APPROVED: 'Approved · ready to search', SOURCING: 'Approved · people found', INTERVIEWING: 'Interviewing', PAUSED: 'Paused', FILLED: 'Filled', CLOSED: 'Closed' };
export const payText = (m: Pick<MandateX, 'pay'>) => (m.pay.min && m.pay.min !== m.pay.max ? `${naira(m.pay.min)}–${naira(m.pay.max)} a ${m.pay.period}` : `Up to ${naira(m.pay.max)} a ${m.pay.period}`);

/** Pick the mandate a turn is about: the page you're on, a title word you said, then the most recent. */
export function pickMandate(w: World, a: Actor, norm: string, route: string): MandateX | undefined {
  const ms = orgMandates(w, a);
  const onPage = route.match(/^\/r\/roles\/([^/?]+)/)?.[1];
  if (onPage) { const m = ms.find((x) => x.id === onPage); if (m) return m; }
  const named = ms.find((m) => m.title.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 4 && !['engineer', 'senior'].includes(t)).some((t) => norm.includes(t)));
  if (named) return named;
  const mine = a.id ? readA(w).intake[a.id]?.mandateId : undefined;
  if (mine) { const m = ms.find((x) => x.id === mine); if (m) return m; }
  return [...ms].filter((m) => m.status !== 'CLOSED' && m.status !== 'FILLED').sort((x, y) => lastAt(y).localeCompare(lastAt(x)))[0];
}

export function createDraft(w: World, a: Actor, st: HAIntake, id = uid('m')): MandateX {
  const role = st.roleKey!; const R = ROLES[role];
  const pay = st.budget ?? band(role, st.hours, st.days)[1];
  const m: MandateX = {
    id, orgId: a.orgId!, title: titleFor(role, st.hours, st.hours === 'PART' ? st.days : undefined), plain: R.plain, team: orgOf(w, a.orgId)?.name ?? 'Your business',
    location: st.city ?? 'Lagos', workMode: 'ONSITE', pay: { min: pay, max: pay, currency: 'NGN', period: 'month' },
    requirements: R.reqs.map((r) => ({ ...r })), status: 'DRAFT', createdBy: a.id,
    versions: [{ v: 1, at: simIso(w), by: a.id, note: 'Drafted by Q from your conversation' }],
  };
  w.mandates.push(m);
  const s = hireA(w);
  s.meta[m.id] = { roleKey: role, hours: st.hours, days: st.days };
  (s.snapshots[m.id] ??= {})[1] = snapOf(m, st.hours, st.days);
  emit(w, a.id, 'mandate.created', scopeOf(a), `Q drafted the “${m.title}” role brief (v1) from ${a.first}’s conversation.`, { mandateId: m.id });
  return m;
}

/** Change a brief: a new version, back to draft if it was approved (approval binds to a version). Undoable. */
export function revise(w: World, a: Actor, id: string, patch: Partial<Omit<Snap, 'pay'>> & { pay?: { min: number; max: number }; roleKey?: RoleKey }, note: string) {
  const m = w.mandates.find((x) => x.id === id); if (!m) return null;
  const s = hireA(w); const meta = (s.meta[id] ??= {});
  const prevV = curV(m);
  (s.snapshots[id] ??= {})[prevV] ??= snapOf(m, meta.hours, meta.days);
  const wasApproved = m.status !== 'DRAFT';
  if (patch.roleKey && patch.roleKey !== meta.roleKey) {
    const R = ROLES[patch.roleKey];
    m.plain = R.plain; m.requirements = R.reqs.map((r) => ({ ...r })); meta.roleKey = patch.roleKey;
    if (!R.partOk && (patch.hours ?? meta.hours) === 'PART') patch.hours = 'FULL';
  }
  if (patch.hours) meta.hours = patch.hours;
  if (patch.days) meta.days = patch.days;
  if (patch.pay) m.pay = { ...m.pay, ...patch.pay };
  if (patch.location) m.location = patch.location;
  if (patch.workMode) m.workMode = patch.workMode;
  if (patch.requirements) m.requirements = patch.requirements;
  if (meta.roleKey && (patch.roleKey || patch.hours || patch.days)) m.title = titleFor(meta.roleKey, meta.hours, meta.hours === 'PART' ? meta.days : undefined);
  if (patch.title) m.title = patch.title;
  const v = prevV + 1;
  m.versions.push({ v, at: simIso(w), by: a.id, note });
  if (wasApproved) { m.status = 'DRAFT'; meta.approvedV = undefined; }
  s.snapshots[id][v] = snapOf(m, meta.hours, meta.days);
  pushUndo(w, a.id, `Change ${m.title} to v${v}`, 'hire-a.mandate.revert', { id, to: prevV });
  emit(w, a.id, 'mandate.revised', scopeOf(a), `Changed the “${m.title}” brief to v${v}: ${note}.`, { mandateId: id, v });
  return m;
}
export function revertTo(w: World, a: Actor, id: string, to: number) {
  const m = w.mandates.find((x) => x.id === id); const s = hireA(w); const snap = s.snapshots[id]?.[to];
  if (!m || !snap) return;
  Object.assign(m, { title: snap.title, plain: snap.plain, location: snap.location, workMode: snap.workMode, pay: { ...snap.pay }, requirements: snap.requirements.map((r) => ({ ...r })) });
  m.versions = m.versions.filter((x) => x.v <= to);
  delete s.snapshots[id][to + 1];
  s.meta[id] = { ...s.meta[id], hours: snap.hours, days: snap.days, roleKey: (Object.keys(ROLES) as RoleKey[]).find((r) => snap.title.toLowerCase().includes(ROLES[r].label.toLowerCase())) ?? s.meta[id]?.roleKey };
  emit(w, a.id, 'mandate.reverted', scopeOf(a), `Undid a change: “${m.title}” is back to v${to}.`, { mandateId: id });
}

// ---------------- Search (simulated, org-scoped pools) ----------------
export function poolFor(w: World, m: MandateX): string[] {
  // Privacy: only people this organisation may see (their own discovery rules, or a relationship they created).
  if (m.orgId === 'org_kora') return KORA_POOL.filter((p) => canSeeCandidate(w, p, m.orgId));
  const role = readA(w).meta[m.id]?.roleKey;
  return Object.entries(POOL).filter(([p, x]) => x.role && x.role === role && canSeeCandidate(w, p, m.orgId)).map(([p]) => p);
}
export function runSearch(w: World, a: Actor, m: MandateX) {
  const found = poolFor(w, m).sort((x, y) => (POOL[y].fit.length - POOL[y].unknown.length) - (POOL[x].fit.length - POOL[x].unknown.length) || POOL[y].years - POOL[x].years);
  hireA(w).search[m.id] = { at: simIso(w), found, by: a.id };
  for (const pid of found) if (!w.pipeline.some((e) => e.mandateId === m.id && e.personId === pid)) w.pipeline.push({ mandateId: m.id, personId: pid, stage: 'SOURCED', at: simIso(w), by: 'q' });
  if (m.status === 'APPROVED') m.status = 'SOURCING';
  emit(w, 'q', 'q.search.ran', scopeOf(a), `Q searched for “${m.title}” (simulated) and found ${found.length} people who may fit.`, { mandateId: m.id });
  return found;
}
export const levelOf = (pid: string) => POOL[pid]?.level;
export function activeLevel(w: World, a: Actor): 'SENIOR' | 'ALL' {
  const l = (readA(w).instructions[a.id] ?? []).filter((i) => i.key === 'level');
  return l[l.length - 1]?.value ?? 'ALL';
}

// ---------------- Kora sourcing: forward the run's results into the one Q conversation ----------------
export function startSourcingWithQ() {
  const runId = startSourcing();
  let said = false;
  const off = subscribe(runId, 0, (e) => {
    if (e.type === 'q.message.completed' && !said) {
      said = true;
      update((w) => appendQ(w, w.session.actor, { who: 'q', kind: 'notice', engine: 'rules', text: e.data.text, used: ['Mandate v1 (approved)', '2 of 3 sources', 'Fit per requirement'], actions: [{ label: 'Compare them', primary: true, act: { t: 'nav', to: '/r/compare' } }] }));
      off();
    }
    if (e.type === 'q.step.updated' && e.data.failure && !said) {
      update((w) => appendQ(w, w.session.actor, { who: 'q', kind: 'notice', engine: 'rules', text: e.data.failure!.message }));
    }
    if (e.type === 'q.run.failed') off();
  });
  return runId;
}

// ---------------- One-time seed of Kora's history (audit events, Bayo's remembered preference) ----------------
const SEED_EVENTS = [
  { id: 'ev_ha_s1', at: '2026-10-26T10:00:00+01:00', actor: 'u_ngozi', type: 'policy.changed', text: 'Updated Kora Pay’s guideline: interviews run 10:00–16:00 Lagos time unless the candidate asks otherwise.' },
  { id: 'ev_ha_s2', at: '2026-10-27T15:10:00+01:00', actor: 'u_ada', type: 'mandate.created', text: 'Drafted the “Backend Engineer, Payouts” brief (v1) for Bayo’s approval.', data: { mandateId: 'm_payouts' } },
  { id: 'ev_ha_s3', at: '2026-10-28T09:05:00+01:00', actor: 'q', type: 'q.search.ran', text: 'Q searched 2 of 3 sources for Senior Backend and read 24 profiles. PeopleGraph was unavailable (rate limited).' },
  { id: 'ev_ha_s4', at: '2026-10-28T11:20:00+01:00', actor: 'u_ngozi', type: 'interview.panel.changed', text: 'Changed the Senior Backend interview panel: Seyi Balogun replaces Musa Danladi for Tobi Adeyemi’s interview.', data: { mandateId: 'm_backend', removed: 'u_musa', added: 'u_seyi' } },
  { id: 'ev_ha_s5', at: '2026-10-28T14:02:00+01:00', actor: 'q', type: 'message.drafted', text: 'Q drafted outreach to Ifeoma Obi for Ada’s approval. Not sent.' },
  { id: 'ev_ha_s6', at: '2026-10-28T16:45:00+01:00', actor: 'q', type: 'memory.inferred', text: 'Q noted “Bayo is fine with remote candidates for Payouts” from Bayo’s comment on Kunle Bakare. Marked as Q’s inference, not confirmed.' },
  { id: 'ev_ha_s7', at: '2026-10-28T17:30:00+01:00', actor: 'u_ada', type: 'message.approved', text: 'Approved one outreach message to Tobi Adeyemi (sent, simulated).' },
];
export function bayoMemory(): MemoryItem {
  const at = '2026-10-28T16:45:00+01:00';
  return {
    memory_id: 'mem_bayo_remote', layer: 'PREFERENCE_OR_RULE', memory_key: 'mandate.m_payouts.remote_ok', subject_type: 'MANDATE', subject_id: 'm_payouts', tenant_id: 'org_kora', visibility_scope: 'TEAM', owner_id: 'u_bayo',
    content: 'Bayo is fine with fully remote candidates for the Payouts role.', structured_value: { remoteOk: true },
    source_refs: [{ kind: 'MESSAGE', ref: 'msg_bayo_1028', label: 'Q’s reading of your comment on Kunle Bakare, 28 Oct', quote: 'Nairobi is fine for the first screen.', at }],
    source_timestamp: at, recorded_at: at, last_confirmed_at: null, expires_at: '2026-12-31T00:00:00Z', retention_class: 'TEMPORARY_TASK', truth_class: 'INFERENCE', evidence_status: 'UNSUPPORTED',
    lifecycle_status: 'active', write_mode: 'DERIVED', importance_reason: 'Decides whether remote candidates appear in the Payouts search.', confidence_basis: 'Q’s inference from one comment',
    consent_and_purpose: 'Hiring for roles at Kora Pay', supersedes_id: null, payload_schema_version: 1, retrieval_tags: ['remote', 'payouts', 'location', 'work', 'mode'], encryption_class: 'STANDARD', delete_or_revoke_state: 'NONE',
  };
}
export const needsSeed = (w: World) => !w.events.some((e) => e.id === 'ev_ha_s1') || !w.memories.some((m) => m.memory_id === 'mem_bayo_remote' || m.supersedes_id === 'mem_bayo_remote');
export function ensureSeed(w: World) {
  if (!w.events.some((e) => e.id === 'ev_ha_s1')) w.events.unshift(...SEED_EVENTS.map((e) => ({ ...e, scope: 'ORG:org_kora' })));
  if (!w.memories.some((m) => m.memory_id === 'mem_bayo_remote' || m.supersedes_id === 'mem_bayo_remote')) w.memories.push(bayoMemory());
}
/** Safe to call from effects and page mounts: writes only when something is missing. */
export function ensureSeeded() { if (needsSeed(getWorld())) update((w) => { ensureSeed(w); }); }

// ---------------- Display helpers ----------------
export function actorName(w: World, id: string) {
  if (id === 'q') return 'Q';
  if (id === 'system') return 'System';
  const a = w.actors.find((x) => x.id === id); if (a) return a.name;
  return w.people.find((p) => p.personId === id)?.name ?? id;
}
export const firstName = (w: World, pid: string) => (w.people.find((p) => p.personId === pid)?.name ?? pid).split(' ')[0];
export const listNames = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
export const me = (w: World) => actorOf(w);
