// ORG-ADMIN logic shared by the pages and Q's skills: who may see or change each section (role and tenancy),
// derived figures read from the one store (never invented), and every operation as a registered op so a button,
// a Q chip and the QA hook all go through the same rules. Nothing calls a provider, charges or sends.
import { actorOf, canSeeCandidate, emit, now, orgOf, personOf, simNow, uid, type World } from '../../mock/world';
import { registerOp } from '../../q/core/engine';
import type { Actor, OrgRole } from '../../state/domain';
import { oa, oaw, type Billing, type ChannelKind, type InstrKind, type ModelRoute, type Placement, type TplKind, type WaStatus } from '../../state/areas/org-admin';
import { mandatesOf, nameOf, ROLE_LABEL } from '../hire-c/lib';
import { rubrics } from '../../state/areas/rubrics';

// ---------------- Sections, access and tenancy ----------------
export type Sec = 'instructions' | 'templates' | 'channels' | 'billing' | 'retention' | 'compliance' | 'reports' | 'models' | 'quality' | 'learning' | 'sources' | 'placements';
export type Level = 'EDIT' | 'VIEW' | 'NONE';
export const BASE = '/r/admin';
export const SECTIONS: { id: Sec; label: string; path: string; sc: string; group: 'You' | 'Organisation' | 'Oversight' }[] = [
  { id: 'instructions', label: 'My instructions', path: `${BASE}/instructions`, sc: 'SC-020', group: 'You' },
  { id: 'templates', label: 'Templates', path: `${BASE}/templates`, sc: 'SC-021', group: 'Organisation' },
  { id: 'channels', label: 'Channels', path: `${BASE}/channels`, sc: 'SC-023', group: 'Organisation' },
  { id: 'billing', label: 'Billing and usage', path: `${BASE}/billing`, sc: 'SC-024', group: 'Organisation' },
  { id: 'retention', label: 'Retention', path: `${BASE}/retention`, sc: 'SC-025', group: 'Organisation' },
  { id: 'sources', label: 'Sources', path: `${BASE}/sources`, sc: 'SC-146', group: 'Organisation' },
  { id: 'placements', label: 'Placements', path: `${BASE}/placements`, sc: 'SC-140', group: 'Organisation' },
  { id: 'compliance', label: 'Compliance', path: `${BASE}/compliance`, sc: 'SC-141', group: 'Oversight' },
  { id: 'reports', label: 'Reports', path: `${BASE}/reports`, sc: 'SC-142', group: 'Oversight' },
  { id: 'models', label: 'Models', path: `${BASE}/models`, sc: 'SC-144', group: 'Oversight' },
  { id: 'quality', label: 'Quality checks', path: `${BASE}/quality`, sc: 'SC-145', group: 'Oversight' },
  { id: 'learning', label: 'What Q learned', path: `${BASE}/learning`, sc: 'V29', group: 'Oversight' },
];
export const secOf = (id: Sec) => SECTIONS.find((s) => s.id === id)!;
const ADMIN: OrgRole[] = ['OWNER', 'ADMIN'];
const TABLE: Record<Sec, Partial<Record<OrgRole, Level>>> = {
  instructions: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'EDIT', HIRING_MANAGER: 'EDIT', INTERVIEWER: 'EDIT', VIEWER: 'EDIT' },
  templates: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'EDIT', HIRING_MANAGER: 'VIEW', INTERVIEWER: 'VIEW', VIEWER: 'VIEW' },
  channels: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW' },
  billing: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW' },
  retention: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW' },
  compliance: { OWNER: 'EDIT', ADMIN: 'EDIT' },
  reports: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW', HIRING_MANAGER: 'VIEW', VIEWER: 'VIEW' },
  models: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW' },
  quality: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW' },
  learning: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW' },
  sources: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW', VIEWER: 'VIEW' },
  placements: { OWNER: 'EDIT', ADMIN: 'EDIT', RECRUITER: 'VIEW', VIEWER: 'VIEW' },
};
/** What this person may do with a section. Placements exist only for agencies; nothing exists without an organisation. */
export function level(w: World, a: Actor, sec: Sec): Level {
  if (a.side !== 'recruiter' || !a.orgId) return 'NONE';
  if (sec === 'placements' && orgOf(w, a.orgId)?.kind !== 'AGENCY') return 'NONE';
  return TABLE[sec][a.role ?? 'VIEWER'] ?? 'NONE';
}
export const isAdmin = (a: Actor) => ADMIN.includes(a.role ?? 'VIEWER');
export const admins = (w: World, orgId?: string) => w.actors.filter((x) => x.orgId === orgId && ADMIN.includes(x.role ?? 'VIEWER')).map((x) => x.name);
/** Why a person can't see a section, and who can (permission state copy). */
export function deniedWhy(w: World, a: Actor, sec: Sec) {
  if (sec === 'placements' && orgOf(w, a.orgId)?.kind !== 'AGENCY') return 'Placements and invoices are for recruitment agencies. Your organisation hires directly.';
  const who = admins(w, a.orgId);
  return `${ROLE_LABEL[a.role ?? 'VIEWER']}s don’t see ${secOf(sec).label.toLowerCase()}. ${who.length ? `${who.join(' and ')} can.` : ''}`.trim();
}
const deny = (w: World, a: Actor, sec: Sec, need: Level = 'EDIT') => {
  const l = level(w, a, sec);
  if (l === 'EDIT' || (need === 'VIEW' && l === 'VIEW')) return null;
  return l === 'VIEW' ? `Only ${admins(w, a.orgId).join(' and ') || 'an admin'} can change ${secOf(sec).label.toLowerCase()}. You can see it.` : deniedWhy(w, a, sec);
};
const scope = (a: Actor) => `ORG:${a.orgId}`;
const firstName = (w: World, pid: string) => personOf(w, pid)?.name.split(' ')[0] ?? 'They';

// ---------------- Review states (loading / empty / error), by link ----------------
export type ReviewState = 'ready' | 'loading' | 'empty' | 'error';
export const reviewState = (q: URLSearchParams): ReviewState => { const s = q.get('state'); return s === 'loading' || s === 'empty' || s === 'error' ? s : 'ready'; };

// ---------------- Instructions (SC-020) ----------------
export const KIND_LABEL: Record<InstrKind, string> = { TONE: 'Tone', PROCESS: 'Process', LIMIT: 'Limit' };
export const myInstructions = (w: World, a: Actor) => oa(w).instructions.filter((i) => i.actorId === a.id && i.orgId === a.orgId);
/** An instruction that an organisation guideline overrides. Organisation rules always win; Q says so. */
export function conflictOf(w: World, orgId: string | undefined, text: string) {
  const t = text.toLowerCase();
  const g = (w.areas['hire-c'] as { guides?: Record<string, { id: string; text: string; on: boolean; check: string }[]> } | undefined)?.guides?.[orgId ?? ''] ?? [];
  if (/pay band|salary|pay\b/.test(t) && /(leave|skip|drop|omit|without|don.t|never|out)/.test(t)) { const x = g.find((y) => y.check === 'PAY_BAND' && y.on); if (x) return x.text; }
  if (/(without|skip|no) (approval|asking)|send (straight|directly)/.test(t)) { const x = g.find((y) => y.check === 'APPROVE_EACH' && y.on); if (x) return x.text; }
  if (/\b(age|religion|married|marital|tribe|state of origin|where .* from)\b/.test(t)) return 'Ask job-related questions only';
  return undefined;
}
export const guessKind = (t: string): InstrKind => (/\b(never|don.t|do not|no more than|at most|only|stop|leave .* out|after \d|before \d)\b/i.test(t) ? 'LIMIT' : /\b(tone|warm|formal|short|friendly|plain|first name)\b/i.test(t) ? 'TONE' : 'PROCESS');

// ---------------- Templates (SC-021) ----------------
export const TPL_KIND: Record<TplKind, string> = { JD: 'Role brief', QUESTIONS: 'Interview questions', SCORECARD: 'Scorecard' };
/** Lines Q flags before a template can be approved: protected characteristics and their proxies. */
export function flagsOf(lines: string[]) {
  const re: [RegExp, string][] = [[/\bwhere .*from originally|state of origin|tribe|ethnic/i, 'state of origin or ethnicity'], [/\b(how old|your age|date of birth)\b/i, 'age'], [/\b(married|children|pregnan|family plans)\b/i, 'marital status or family'], [/\b(religio|church|mosque)\b/i, 'religion'], [/\bnative (english|speaker)\b/i, 'native speaker (a proxy for origin)']];
  return lines.map((l, i) => { const m = re.find(([r]) => r.test(l)); return m ? { i, line: l, what: m[1] } : null; }).filter((x): x is { i: number; line: string; what: string } => !!x);
}
export const latestTpl = <V extends { v: number; body: string[] }>(t: { versions: V[] }): V => t.versions[t.versions.length - 1];

// ---------------- Channels (SC-023, V09) ----------------
export const CH_LABEL: Record<ChannelKind, string> = { EMAIL: 'Email', SMS: 'Text messages (SMS)', WHATSAPP: 'WhatsApp', VOICE: 'Phone calls' };
export const CH_STATE: Record<string, string> = { NOT_STARTED: 'Not set up', CODE_SENT: 'Code sent', IN_REVIEW: 'In review', VERIFIED: 'Verified', FAILED: 'Failed', NOT_OFFERED: 'Not offered' };
export const channelOf = (w: World, orgId: string | undefined, k: ChannelKind) => oa(w).channels.find((c) => c.orgId === orgId && c.kind === k);
export const DEMO_CODE = '428913';
/** Candidates this organisation has a live conversation or pipeline entry with, and may see. */
export function contactable(w: World, orgId?: string) {
  if (!orgId) return [];
  const mids = mandatesOf(w, orgId).map((m) => m.id);
  const ids = [...w.threads.filter((t) => t.orgId === orgId).map((t) => t.personId), ...w.pipeline.filter((p) => mids.includes(p.mandateId)).map((p) => p.personId)];
  return [...new Set(ids)].filter((pid) => personOf(w, pid) && canSeeCandidate(w, pid, orgId));
}
export const choiceOf = (w: World, pid: string) => oa(w).choices[pid] ?? { personId: pid, whatsapp: 'NOT_ASKED' as const, call: 'NOT_ASKED' as const };
export const OPT_LABEL = { YES: 'Yes', NO: 'No', NOT_ASKED: 'Not asked', ASKED: 'Asked, no answer yet' } as const;
export const WA_LABEL: Record<WaStatus, string> = { AWAITING_APPROVAL: 'Waiting for approval', ACCEPTED: 'Accepted by provider', DELIVERED: 'Delivered to phone', READ: 'Read', FAILED: 'Failed' };
export const WA_TEMPLATE = (w: World, orgId: string, pid: string) => `Hi ${firstName(w, pid)}, this is ${orgOf(w, orgId)?.name}. You asked us to reach you on WhatsApp. Could you reply with two times that suit you for a 30-minute call this week? Reply STOP to opt out.`;
export function waChecks(w: World, a: Actor, pid: string) {
  const ch = channelOf(w, a.orgId, 'WHATSAPP'); const c = choiceOf(w, pid); const f = firstName(w, pid);
  const t = w.threads.find((x) => x.orgId === a.orgId && x.personId === pid);
  const last = t?.messages.filter((m) => m.from === pid).at(-1)?.at;
  const inWindow = !!last && simNow(w).getTime() - new Date(last).getTime() < 864e5;
  return [
    { label: 'WhatsApp is verified for your organisation', ok: ch?.state === 'VERIFIED', detail: ch?.state === 'VERIFIED' ? `${ch.sender}` : `WhatsApp is ${CH_STATE[ch?.state ?? 'NOT_STARTED'].toLowerCase()}. An admin verifies it first.` },
    { label: `${f} agreed to WhatsApp`, ok: c.whatsapp === 'YES', detail: c.whatsapp === 'YES' ? `${f} turned it on in their settings${c.at ? ` (${c.at})` : ''}.` : c.whatsapp === 'NO' ? `${f} said no. Use email or Talent Q.` : `Not asked yet. Unknown is not a yes.` },
    { label: 'An approved message template', ok: true, detail: inWindow ? `${f} wrote in the last 24 hours, so a free reply is allowed; Q still uses the template.` : `${f} last wrote over 24 hours ago, so only an approved template may go.` },
    { label: 'A thread to keep it with', ok: !!t, detail: t ? 'It is kept with the existing conversation.' : `No conversation with ${f} yet.` },
  ];
}
export function callChecks(w: World, a: Actor, pid: string) {
  const ch = channelOf(w, a.orgId, 'VOICE'); const c = choiceOf(w, pid); const f = firstName(w, pid); const p = personOf(w, pid);
  const tz = p?.timezone ?? 'Africa/Lagos';
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(simNow(w)));
  return [
    { label: 'Calling is verified for your organisation', ok: ch?.state === 'VERIFIED', detail: ch?.state === 'VERIFIED' ? ch.sender : 'Phone calls are not set up yet. An admin verifies the number first.' },
    { label: `${f} agreed to phone calls`, ok: c.call === 'YES', detail: c.call === 'YES' ? `${f} said yes${c.at ? ` (${c.at})` : ''}.` : c.call === 'NO' ? `${f} said no to calls.` : 'Not asked yet. Unknown is not a yes.' },
    { label: `Daytime where ${f} is`, ok: h >= 9 && h < 19, detail: `It’s ${String(h).padStart(2, '0')}:00 in ${tz.split('/').pop()!.replace(/_/g, ' ')}. Calls go between 09:00 and 19:00 their time.` },
    { label: 'Not recorded', ok: true, detail: 'Calls are never recorded (decision D10 is open).' },
  ];
}

// ---------------- Billing (SC-024, MO-035) ----------------
export const billingOf = (w: World, orgId?: string): Billing | undefined => {
  const b = oa(w).billing.find((x) => x.orgId === orgId); if (!b) return undefined;
  const live = mandatesOf(w, orgId).length;
  return { ...b, meters: b.meters.map((m) => (m.id === 'roles' ? { ...m, used: live } : m)) };
};
export const budgetShare = (b: Billing) => (b.budget.cap ? b.budget.spent / b.budget.cap : 0);
export const overWarn = (b: Billing) => budgetShare(b) >= b.budget.warnAt;
export const usd = (n: number) => `$${n.toFixed(2)}`;

// ---------------- Reports (SC-142): read from the store ----------------
const OPENED: Record<string, string> = { m_backend: '2026-10-20' };
export function rolesFor(w: World, a: Actor) {
  const all = mandatesOf(w, a.orgId);
  // Hiring managers see the roles they hire for (engineering, for Kora's managers); others see every role.
  return a.role === 'HIRING_MANAGER' ? all.filter((m) => m.engineering) : all;
}
export function roleReport(w: World, a: Actor) {
  return rolesFor(w, a).map((m) => {
    const mx = w.mandates.find((x) => x.id === m.id);
    const opened = OPENED[m.id] ?? mx?.versions[0]?.at;
    const pipe = w.pipeline.filter((p) => p.mandateId === m.id);
    const shortlistedAt = pipe.filter((p) => ['SHORTLISTED', 'CONTACTED', 'REPLIED', 'INTERVIEW', 'OFFER', 'HIRED'].includes(p.stage)).map((p) => p.at).sort()[0];
    const days = opened && shortlistedAt ? Math.max(0, Math.round((new Date(shortlistedAt).getTime() - new Date(opened).getTime()) / 864e5)) : null;
    const ts = w.threads.filter((t) => t.orgId === a.orgId && (t.mandateId === m.id || (!t.mandateId && pipe.some((p) => p.personId === t.personId))));
    const contacted = ts.filter((t) => t.messages.some((x) => x.from !== t.personId && (x.status === 'SENT_SIMULATED'))).length;
    const replied = ts.filter((t) => t.messages.some((x) => x.from === t.personId)).length;
    return { id: m.id, title: m.title, opened, shortlistedAt, days, people: pipe.length, shortlisted: pipe.filter((p) => p.stage !== 'SOURCED').length, contacted, replied };
  });
}

// ---------------- Quality (SC-145): status of checks, never invented statistics ----------------
export function qualityChecks(w: World, orgId?: string) {
  const rb = rubrics(w); const mine = rb.list.filter((r) => r.orgId === orgId);
  const ratings = rb.ratings.filter((r) => mine.some((m) => m.id === r.rubricId));
  const overrides = ratings.filter((r) => r.override).length;
  const approved = mine.flatMap((r) => r.versions.filter((v) => v.state !== 'Q_PROPOSED'));
  const refused = w.events.filter((e) => e.scope === `ORG:${orgId}` && e.type === 'rubric.refused').length;
  const multi = mine.some((r) => r.versions.filter((v) => v.state !== 'Q_PROPOSED').length >= 2);
  return [
    { id: 'q_impact', name: 'Selection rates across groups (adverse impact)', status: 'NOT_RUN' as const, reading: 'Not run. Talent Q doesn’t collect protected characteristics, so there is nothing to compare. It needs a voluntary, separate survey and an adviser’s method first (D17).' },
    { id: 'q_raters', name: 'Agreement between Q’s ratings and reviewers', status: ratings.length < 30 ? 'TOO_FEW' as const : 'SIMULATED_SAMPLE' as const, reading: ratings.length ? `${ratings.length} rating${ratings.length === 1 ? '' : 's'} so far, ${overrides} changed by a reviewer. Too few to say anything about agreement (needs at least 30).` : 'No ratings yet. Nothing to compare.' },
    { id: 'q_drift', name: 'Score drift between rubric versions', status: multi ? 'SIMULATED_SAMPLE' as const : 'WAITING' as const, reading: multi ? 'Two approved versions exist. A drift check would re-rate a simulated sample under both; no real outcomes are used.' : 'Waits until a role has two approved rubric versions.' },
    { id: 'q_jobrel', name: 'Job-relatedness sign-off for criteria', status: approved.length ? 'SIMULATED_SAMPLE' as const : 'WAITING' as const, reading: approved.length ? `${approved.length} approved rubric version${approved.length === 1 ? '' : 's'}, signed off inside your organisation. An outside adviser’s review is still open (D17).` : 'No approved rubric yet.' },
    { id: 'q_refused', name: 'Protected characteristics and proxies refused', status: 'WORKING' as const, reading: refused ? `Working: Q declined ${refused} request${refused === 1 ? '' : 's'} to score a protected characteristic or a proxy.` : 'Working: none asked for so far. Q declines them with a reason.' },
    { id: 'q_never', name: 'Faces, accents, emotion and personality', status: 'ENFORCED' as const, reading: 'Never scored. No such signal exists anywhere in Talent Q, so there is nothing to switch off.' },
  ];
}
export const CHECK_LABEL: Record<string, string> = { NOT_RUN: 'Not run · needs D17', SIMULATED_SAMPLE: 'Simulated sample · not validated', TOO_FEW: 'Too few to tell', WAITING: 'Waiting', ENFORCED: 'Enforced by design', WORKING: 'Working' };
export const CHECK_K: Record<string, string> = { NOT_RUN: 'warn', SIMULATED_SAMPLE: 'busy', TOO_FEW: 'warn', WAITING: '', ENFORCED: 'ok', WORKING: 'ok' };

// ---------------- Placements (SC-140) ----------------
export const STAGE_TXT: Record<Placement['stage'], string> = { REPRESENTED: 'Represented', SUBMITTED: 'Submitted', INTERVIEWING: 'Interviewing', OFFER: 'Offer', PLACED: 'Placed' };
export const INV_TXT: Record<Placement['invoice']['state'], string> = { NONE: 'No invoice yet', DRAFT: 'Draft (not finished)', READY: 'Ready to send', MARKED_SENT: 'Marked as sent by you' };
/** Placements the agency may show: people who can still be seen by it. Hidden ones are counted, never named. */
export function placementsFor(w: World, orgId?: string) {
  const all = oa(w).placements.filter((p) => p.orgId === orgId);
  const shown = all.filter((p) => canSeeCandidate(w, p.personId, p.orgId));
  return { shown, hidden: all.length - shown.length };
}

// ---------------- Ops ----------------
type R = { say?: string; nav?: { to: string; label: string } } | void;
type OpFn = (w: World, args: Record<string, unknown>, a: Actor) => R;
const OPS = new Map<string, OpFn>();
const op = (name: string, fn: OpFn) => { OPS.set(name, fn); registerOp(name, fn); };
/** Run one of these ops directly (Q's skills: once on a copy to word the reply, then for real inside the update). */
export function doOp(w: World, a: Actor, name: string, args: Record<string, unknown> = {}): string {
  const r = OPS.get(name)?.(w, args, a); return (r && typeof r === 'object' && r.say) || '';
}
export const probeOp = (w: World, a: Actor, name: string, args: Record<string, unknown> = {}) => doOp(structuredClone(w), a, name, args);
const s = (x: unknown) => String(x ?? '');

op('oa.instr.add', (w, args, a) => {
  if (!a.orgId) return { say: 'Set up your organisation first.' };
  const text = s(args.text).trim().replace(/^./, (c) => c.toUpperCase()); if (!text) return { say: 'Tell me the instruction in a sentence.' };
  const kind = (args.kind as InstrKind) ?? guessKind(text);
  const st = oaw(w); if (st.instructions.some((i) => i.actorId === a.id && i.text.toLowerCase() === text.toLowerCase())) return { say: 'You already have that instruction.' };
  st.instructions.push({ id: uid('in'), actorId: a.id, orgId: a.orgId, kind, text, on: true, at: now(), used: 0, source: s(args.source) || undefined });
  emit(w, a.id, 'admin.instruction.added', scope(a), `${a.name} added a personal instruction for Q (${KIND_LABEL[kind].toLowerCase()}).`);
  const c = conflictOf(w, a.orgId, text);
  return { say: c ? `Saved. One thing: ${orgOf(w, a.orgId)?.name}’s guideline “${c}” wins where they clash, so I’ll still follow it there.` : `Saved as a ${KIND_LABEL[kind].toLowerCase()} instruction. I’ll use it in your drafts from now on and show it when I do.` };
});
op('oa.instr.toggle', (w, args, a) => { const i = oaw(w).instructions.find((x) => x.id === args.id && x.actorId === a.id); if (!i) return { say: 'That isn’t one of your instructions.' }; i.on = !i.on; return { say: i.on ? 'Back on.' : 'Paused. I’ll ignore it until you turn it back on.' }; });
op('oa.instr.remove', (w, args, a) => { const st = oaw(w); const i = st.instructions.findIndex((x) => x.id === args.id && x.actorId === a.id); if (i < 0) return { say: 'That isn’t one of your instructions.' }; const [x] = st.instructions.splice(i, 1); emit(w, a.id, 'admin.instruction.removed', scope(a), `${a.name} removed a personal instruction.`); return { say: `Removed “${x.text}”.` }; });

op('oa.tpl.propose', (w, args, a) => {
  const d = deny(w, a, 'templates'); if (d) return { say: d };
  const lines = (args.lines as string[] | undefined) ?? s(args.body).split(/\n|;/).map((x) => x.trim()).filter(Boolean);
  const id = uid('tp'); oaw(w).templates.push({ id, orgId: a.orgId!, kind: (args.kind as TplKind) ?? 'QUESTIONS', title: s(args.title) || 'New template', state: isAdmin(a) ? 'DRAFT' : 'PROPOSED', versions: [{ v: 1, body: lines, by: a.id, at: now(), note: 'First version' }], used: 0 });
  emit(w, a.id, 'admin.template.proposed', scope(a), `${a.name} proposed the template “${s(args.title)}”.`);
  return { say: `Proposed “${s(args.title)}”. ${isAdmin(a) ? 'Approve it when it reads right.' : `${admins(w, a.orgId).join(' or ')} approves it before anyone can use it.`}` };
});
op('oa.tpl.approve', (w, args, a) => {
  const t = oaw(w).templates.find((x) => x.id === args.id && x.orgId === a.orgId); if (!t) return { say: 'I can’t find that template in your organisation.' };
  if (!isAdmin(a)) return { say: `Only ${admins(w, a.orgId).join(' or ')} can approve templates. I’ve left it waiting.` };
  const f = flagsOf(latestTpl(t).body); if (f.length) return { say: `I can’t approve “${t.title}” yet: “${f[0].line}” asks about ${f[0].what}. Remove or rewrite that line first.` };
  t.state = 'APPROVED'; t.approvedBy = a.id; t.approvedAt = now().slice(0, 10);
  emit(w, a.id, 'admin.template.approved', scope(a), `${a.name} approved the template “${t.title}” (v${latestTpl(t).v}).`);
  return { say: `Approved “${t.title}” v${latestTpl(t).v}. Q will offer it when someone drafts.` };
});
op('oa.tpl.fix', (w, args, a) => {
  const d = deny(w, a, 'templates'); if (d) return { say: d };
  const t = oaw(w).templates.find((x) => x.id === args.id && x.orgId === a.orgId); if (!t) return { say: 'I can’t find that template.' };
  const cur = latestTpl(t); const f = flagsOf(cur.body); if (!f.length) return { say: 'Nothing flagged in it.' };
  t.versions.push({ v: cur.v + 1, body: cur.body.filter((_, i) => !f.some((x) => x.i === i)), by: a.id, at: now(), note: `Removed ${f.length} flagged line${f.length === 1 ? '' : 's'}` });
  return { say: `Removed “${f[0].line}”. It’s v${cur.v + 1} now and ready for approval.` };
});
op('oa.tpl.retire', (w, args, a) => { if (!isAdmin(a)) return { say: 'Only an admin can retire a template.' }; const t = oaw(w).templates.find((x) => x.id === args.id && x.orgId === a.orgId); if (!t) return { say: 'I can’t find that template.' }; t.state = 'RETIRED'; emit(w, a.id, 'admin.template.retired', scope(a), `${a.name} retired the template “${t.title}”.`); return { say: `Retired “${t.title}”. Drafts already written keep their text.` }; });

op('oa.ch.start', (w, args, a) => {
  const d = deny(w, a, 'channels'); if (d) return { say: d };
  const c = oaw(w).channels.find((x) => x.orgId === a.orgId && x.kind === args.kind); if (!c) return;
  if (c.state === 'VERIFIED') return { say: `${CH_LABEL[c.kind]} is already verified.` };
  c.state = 'CODE_SENT'; c.detail = `A 6-digit code was sent to ${c.sender} (simulated; the demo code is ${DEMO_CODE}).`; c.at = now(); c.by = a.id;
  return { say: `I sent a code to ${c.sender} (simulated). Enter it on the page, or tell me “the code is ${DEMO_CODE}”.` };
});
op('oa.ch.code', (w, args, a) => {
  const d = deny(w, a, 'channels'); if (d) return { say: d };
  const c = oaw(w).channels.find((x) => x.orgId === a.orgId && x.kind === args.kind && x.state === 'CODE_SENT') ?? oaw(w).channels.find((x) => x.orgId === a.orgId && x.state === 'CODE_SENT'); if (!c) return { say: 'No channel is waiting for a code.' };
  if (s(args.code).replace(/\D/g, '') !== DEMO_CODE) { c.detail = `That code didn’t match. Check it and try again (demo code ${DEMO_CODE}).`; return { say: 'That code didn’t match. Nothing changed; try again.' }; }
  c.state = c.kind === 'WHATSAPP' ? 'IN_REVIEW' : 'VERIFIED';
  c.detail = c.kind === 'WHATSAPP' ? 'Number confirmed. The display name and message templates are with the provider for review (simulated).' : 'Number confirmed (simulated).';
  emit(w, a.id, 'admin.channel.code', scope(a), `${a.name} confirmed the ${CH_LABEL[c.kind]} number.`);
  return { say: c.kind === 'WHATSAPP' ? 'Number confirmed. WhatsApp now reviews the display name and templates; that usually takes a day (simulated).' : `${CH_LABEL[c.kind]} is verified.` };
});
op('oa.ch.review', (w, args, a) => {
  const d = deny(w, a, 'channels'); if (d) return { say: d };
  const c = oaw(w).channels.find((x) => x.orgId === a.orgId && x.kind === (args.kind ?? 'WHATSAPP') && x.state === 'IN_REVIEW'); if (!c) return { say: 'Nothing is in review.' };
  c.state = args.ok === false ? 'FAILED' : 'VERIFIED'; c.at = now();
  c.detail = c.state === 'VERIFIED' ? 'Display name and one message template approved (simulated).' : 'The display name was rejected (simulated). Use the registered company name and try again.';
  emit(w, a.id, 'admin.channel.reviewed', scope(a), `${CH_LABEL[c.kind]} review: ${CH_STATE[c.state].toLowerCase()} (simulated).`);
  return { say: c.state === 'VERIFIED' ? `${CH_LABEL[c.kind]} is verified (simulated). Messages still need each candidate’s yes and an approver.` : `The review failed (simulated): ${c.detail}` };
});
op('oa.choice.ask', (w, args, a) => {
  const d = deny(w, a, 'channels', 'VIEW'); if (d) return { say: d };
  const pid = s(args.personId); if (!contactable(w, a.orgId).includes(pid)) return { say: 'I can’t ask someone you don’t have a conversation with.' };
  const st = oaw(w); const c = (st.choices[pid] ??= { personId: pid, whatsapp: 'NOT_ASKED', call: 'NOT_ASKED' });
  const what = args.what === 'call' ? 'call' : 'whatsapp';
  if (c[what] === 'YES' || c[what] === 'NO') return { say: `${firstName(w, pid)} already answered: ${OPT_LABEL[c[what]].toLowerCase()}.` };
  c[what] = 'ASKED'; (c.askedBy ??= {})[a.orgId!] = a.id;
  emit(w, a.id, 'admin.channel.asked', `SHARED:${a.orgId}:${pid}`, `${orgOf(w, a.orgId)?.name} asked whether ${what === 'call' ? 'phone calls' : 'WhatsApp'} is okay. ${firstName(w, pid)} decides in Settings.`);
  return { say: `Asked in Talent Q. ${firstName(w, pid)} answers in their settings; until then it stays “not a yes”.` };
});
op('oa.me.choice', (w, args, a) => {
  if (!a.personId) return;
  const st = oaw(w); const c = (st.choices[a.personId] ??= { personId: a.personId, whatsapp: 'NOT_ASKED', call: 'NOT_ASKED' });
  const what = s(args.what); const v = args.value ? 'YES' : 'NO';
  if (what === 'sms') { w.consents[a.personId].notifications.sms = !!args.value; }
  else if (what === 'call' || what === 'whatsapp') { c[what] = v; c.at = now().slice(0, 10); }
  emit(w, a.id, 'candidate.channel.choice', `PERSON:${a.personId}`, `${a.name} turned ${what === 'sms' ? 'text messages' : what === 'call' ? 'phone calls' : 'WhatsApp'} ${args.value ? 'on' : 'off'}.`);
  return { say: `${what === 'sms' ? 'Text messages' : what === 'call' ? 'Phone calls' : 'WhatsApp'} ${args.value ? 'on' : 'off'}. Employers see only yes or no, never why.` };
});
op('oa.wa.draft', (w, args, a) => {
  const dn = deny(w, a, 'channels', 'VIEW'); if (dn) return { say: dn };
  const pid = s(args.personId); if (!contactable(w, a.orgId).includes(pid)) return { say: 'I can’t message someone you don’t have a conversation with.' };
  const bad = waChecks(w, a, pid).find((c) => !c.ok); if (bad) return { say: `Not yet: ${bad.detail}` };
  const t = w.threads.find((x) => x.orgId === a.orgId && x.personId === pid)!;
  const st = oaw(w); const open = st.wa.find((m) => m.personId === pid && m.orgId === a.orgId && m.status === 'AWAITING_APPROVAL'); if (open) return { say: `There’s already a WhatsApp message to ${firstName(w, pid)} waiting for a yes.` };
  st.wa.push({ id: uid('wa'), orgId: a.orgId!, personId: pid, threadId: t.id, template: 'Ask for call times', body: WA_TEMPLATE(w, a.orgId!, pid), status: 'AWAITING_APPROVAL', by: a.id, history: [{ status: 'AWAITING_APPROVAL', at: now() }], simulated: true });
  return { say: `Drafted from the approved template. It goes only when ${['ADMIN', 'OWNER', 'RECRUITER'].includes(a.role ?? '') ? 'you say yes' : 'an approver says yes'}.` };
});
op('oa.wa.approve', (w, args, a) => {
  if (!['OWNER', 'ADMIN', 'RECRUITER'].includes(a.role ?? '')) return { say: 'Only an admin or recruiter can approve a message.' };
  const m = oaw(w).wa.find((x) => x.id === args.id && x.orgId === a.orgId && x.status === 'AWAITING_APPROVAL'); if (!m) return { say: 'Nothing to approve.' };
  const bad = waChecks(w, a, m.personId).find((c) => !c.ok); if (bad) return { say: `Stopped: ${bad.detail}` };
  m.status = 'ACCEPTED'; m.approvedBy = a.id; m.history.push({ status: 'ACCEPTED', at: now() });
  emit(w, a.id, 'channel.whatsapp.accepted', `SHARED:${a.orgId}:${m.personId}`, `WhatsApp message to ${nameOf(w, m.personId)} approved by ${a.name}; accepted by the provider (simulated).`);
  return { say: 'Approved. The provider accepted it (simulated). Accepted isn’t delivered: I’ll show each step as it comes.' };
});
op('oa.wa.advance', (w, args, a) => {
  const m = oaw(w).wa.find((x) => x.id === args.id && x.orgId === a.orgId); if (!m) return;
  const next: Partial<Record<WaStatus, WaStatus>> = { ACCEPTED: 'DELIVERED', DELIVERED: 'READ' };
  const n = args.fail ? 'FAILED' : next[m.status]; if (!n) return { say: `It’s ${WA_LABEL[m.status].toLowerCase()}; there’s no later step.` };
  m.status = n; m.history.push({ status: n, at: now() });
  emit(w, 'system', `channel.whatsapp.${n.toLowerCase()}`, `SHARED:${a.orgId}:${m.personId}`, `WhatsApp message to ${nameOf(w, m.personId)}: ${WA_LABEL[n].toLowerCase()} (simulated provider update).`);
  return { say: `Provider update (simulated): ${WA_LABEL[n].toLowerCase()}.` };
});
op('oa.call.check', (w, args, a) => {
  const dn = deny(w, a, 'channels', 'VIEW'); if (dn) return { say: dn };
  const pid = s(args.personId); if (!contactable(w, a.orgId).includes(pid)) return { say: 'I can’t check someone you don’t have a conversation with.' };
  const rs = callChecks(w, a, pid); const ok = rs.every((r) => r.ok);
  oaw(w).calls.unshift({ id: uid('call'), orgId: a.orgId!, personId: pid, ok, reasons: rs, at: now(), by: a.id });
  return { say: ok ? `You can call ${firstName(w, pid)}. I won’t place the call; this prototype never dials.` : `Not yet: ${rs.filter((r) => !r.ok).map((r) => r.detail).join(' ')}` };
});
op('oa.call.schedule', (w, args, a) => {
  const c = oaw(w).calls.find((x) => x.id === args.id && x.orgId === a.orgId); if (!c?.ok) return { say: 'That call isn’t eligible.' };
  c.scheduled = new Date(simNow(w).getTime() + 2 * 36e5).toISOString();
  emit(w, a.id, 'channel.call.planned', `SHARED:${a.orgId}:${c.personId}`, `${a.name} planned a call with ${nameOf(w, c.personId)} (simulated; no call placed).`);
  return { say: 'Planned for two hours from now (simulated). No call is placed.' };
});

op('oa.bill.simulate', (w, args, a) => {
  const dn = deny(w, a, 'billing', 'VIEW'); if (dn) return { say: dn };
  const b = oaw(w).billing.find((x) => x.orgId === a.orgId); if (!b) return;
  if (b.budget.paused) return { say: 'New agent runs are paused by your budget decision. Nothing ran.' };
  const n = Number(args.runs ?? 3); const runs = b.meters.find((m) => m.id === 'runs')!; const before = b.budget.spent / b.budget.cap;
  runs.used += n; b.budget.spent = Math.round((b.budget.spent + n * 0.8) * 100) / 100;
  const after = b.budget.spent / b.budget.cap;
  if (before < b.budget.warnAt && after >= b.budget.warnAt) { b.budget.decision = undefined; emit(w, 'system', 'budget.threshold', scope(a), `Agent budget passed ${Math.round(b.budget.warnAt * 100)}% (${usd(b.budget.spent)} of ${usd(b.budget.cap)}, simulated).`); return { say: `That took the agent budget past ${Math.round(b.budget.warnAt * 100)}%: ${usd(b.budget.spent)} of ${usd(b.budget.cap)} (simulated). ${isAdmin(a) ? 'Decide on the billing page: pause new runs or allow more.' : `${admins(w, a.orgId).join(' or ')} decides whether to allow more.`}` }; }
  return { say: `${n} more agent runs recorded (simulated): ${usd(b.budget.spent)} of ${usd(b.budget.cap)}.` };
});
op('oa.bill.decide', (w, args, a) => {
  const d = deny(w, a, 'billing'); if (d) return { say: d };
  const b = oaw(w).billing.find((x) => x.orgId === a.orgId)!; const dec = args.decision === 'SPEND' ? 'SPEND' : 'STOP';
  b.budget.decision = dec; b.budget.decidedBy = a.id;
  if (dec === 'STOP') b.budget.paused = true; else { b.budget.paused = false; b.budget.cap = Math.round((b.budget.cap + Number(args.extra ?? 10)) * 100) / 100; }
  emit(w, a.id, 'budget.decided', scope(a), dec === 'STOP' ? `${a.name} paused new agent runs for the rest of the month.` : `${a.name} raised the agent budget to ${usd(b.budget.cap)} (simulated; nothing charged).`);
  return { say: dec === 'STOP' ? 'Paused. Runs already going finish; no new ones start this month unless you change it.' : `Raised the cap to ${usd(b.budget.cap)}. Nothing is charged in this prototype.` };
});
op('oa.bill.resume', (w, _args, a) => { const d = deny(w, a, 'billing'); if (d) return { say: d }; const b = oaw(w).billing.find((x) => x.orgId === a.orgId)!; b.budget.paused = false; b.budget.decision = undefined; return { say: 'New agent runs can start again.' }; });
op('oa.bill.req', (w, args, a) => {
  const d = deny(w, a, 'billing'); if (d) return { say: d };
  const b = oaw(w).billing.find((x) => x.orgId === a.orgId)!; const r = b.requests.find((x) => x.id === args.id && x.state === 'OPEN'); if (!r) return { say: 'That request is already decided.' };
  r.state = args.ok ? 'APPROVED' : 'DECLINED'; r.decidedBy = a.id; if (args.ok) b.budget.cap = Math.round((b.budget.cap + r.amount) * 100) / 100;
  emit(w, a.id, 'budget.request', scope(a), `${a.name} ${args.ok ? 'approved' : 'declined'} ${nameOf(w, r.by)}’s request: ${r.what}.`);
  return { say: args.ok ? `Approved. The cap is ${usd(b.budget.cap)} now, and I’ve told ${nameOf(w, r.by).split(' ')[0]}.` : `Declined. I’ve told ${nameOf(w, r.by).split(' ')[0]}; nothing ran.` };
});
op('oa.bill.quote', (w, args, a) => {
  const d = deny(w, a, 'billing'); if (d) return { say: d };
  const b = oaw(w).billing.find((x) => x.orgId === a.orgId)!; b.quotes.push({ at: now(), by: a.id, plan: s(args.plan) || b.plan });
  emit(w, a.id, 'billing.quote', scope(a), `${a.name} asked for a quote (no payment taken).`);
  return { say: 'Quote request recorded. No card was asked for and nothing was charged; pricing is still a hypothesis.' };
});

op('oa.ret.set', (w, args, a) => {
  const d = deny(w, a, 'retention'); if (d) return { say: d };
  const r = oaw(w).retention.find((x) => x.orgId === a.orgId)?.rules.find((x) => x.id === args.id); if (!r) return;
  if (r.status === 'BY_DESIGN') return { say: `${r.data}: ${r.period}. That isn’t a setting.` };
  if (!r.options.includes(s(args.period))) return { say: `Choose one of: ${r.options.join(', ')}.` };
  r.period = s(args.period); r.changedBy = a.id;
  emit(w, a.id, 'retention.changed', scope(a), `${a.name} set “${r.data}” to ${r.period} (still subject to decision D9).`);
  return { say: `Set to ${r.period}. It stays marked “proposed” until the founder and legal settle D9.` };
});
op('oa.ret.jur', (w, args, a) => { const d = deny(w, a, 'retention'); if (d) return { say: d }; const r = oaw(w).retention.find((x) => x.orgId === a.orgId)!; r.jurisdiction = args.jur === 'UK' ? 'UK' : 'NG'; return { say: `Using the ${r.jurisdiction === 'UK' ? 'UK GDPR' : 'Nigeria (NDPA)'} template. Periods are unchanged; the legal wording on receipts follows it.` }; });
op('oa.ret.delete', (w, args, a) => {
  const d = deny(w, a, 'retention'); if (d) return { say: d };
  const r = oaw(w).retention.find((x) => x.orgId === a.orgId)!; const x = r.deletions.find((y) => y.id === args.id && y.state === 'OPEN'); if (!x) return { say: 'That request is already done.' };
  const mids = mandatesOf(w, a.orgId).map((m) => m.id);
  const pipe = w.pipeline.filter((p) => p.personId === x.personId && mids.includes(p.mandateId));
  w.pipeline = w.pipeline.filter((p) => !(p.personId === x.personId && mids.includes(p.mandateId)));
  const msgs = w.threads.filter((t) => t.orgId === a.orgId && t.personId === x.personId).reduce((n, t) => n + t.messages.length, 0);
  x.state = 'DONE'; x.doneBy = a.id; x.doneAt = now();
  x.receipt = { deleted: [`${pipe.length} pipeline entr${pipe.length === 1 ? 'y' : 'ies'} and their notes`, 'Ratings and comparison notes about them', 'Copies of evidence they had shared with you (their originals stay theirs)'],
    kept: [{ what: `${msgs} sent or received message${msgs === 1 ? '' : 's'}`, why: 'A record of what was said, kept for the proposed messages period (D9).' }, { what: 'The audit event for this deletion', why: 'Proof the request was honoured.' }] };
  emit(w, a.id, 'retention.deleted', `SHARED:${a.orgId}:${x.personId}`, `${orgOf(w, a.orgId)?.name} deleted ${nameOf(w, x.personId)}’s records at their request. Kept: messages and this audit event.`);
  return { say: `Done. ${firstName(w, x.personId)}’s records are deleted; the receipt lists what is kept and why. They can see it too.` };
});
op('oa.ret.export', (w, _args, a) => { const d = deny(w, a, 'retention'); if (d) return { say: d }; oaw(w).retention.find((x) => x.orgId === a.orgId)!.exports.push({ at: now(), by: a.id }); emit(w, a.id, 'audit.export', scope(a), `${a.name} prepared an audit export (simulated; nothing downloaded).`); return { say: 'Audit export prepared (simulated). Nothing was downloaded or sent.' }; });

op('oa.inc.resolve', (w, args, a) => {
  const d = deny(w, a, 'compliance'); if (d) return { say: d };
  const i = oaw(w).incidents.find((x) => x.id === args.id && x.orgId === a.orgId && x.state === 'OPEN'); if (!i) return { say: 'That incident is already resolved.' };
  i.state = 'RESOLVED'; i.resolvedBy = a.id; i.note = s(args.note) || 'Reviewed; no further action.';
  emit(w, a.id, 'compliance.incident.resolved', scope(a), `${a.name} resolved “${i.title}”: ${i.note}`);
  return { say: `Resolved “${i.title}”. The note is in the audit log.` };
});

const routeOf = (w: World, a: Actor, id: unknown): ModelRoute | undefined => oaw(w).routes[a.orgId ?? '']?.find((r) => r.id === id);
op('oa.model.trace', (w, args, a) => {
  const dn = deny(w, a, 'models', 'VIEW'); if (dn) return { say: dn };
  const r = routeOf(w, a, args.id); if (!r) return;
  const t = now(); const fail = args.fail !== false;
  r.lastTrace = { at: t, steps: fail ? [`Sent to ${r.route[0]} (simulated)`, `No answer within ${r.timeoutMs >= 1000 ? `${r.timeoutMs / 1000} s` : `${r.timeoutMs} ms`}: stopped waiting`, r.route[1] ? `Tried ${r.route[1]} (simulated): answered` : `Fell back: ${r.fallback}`, 'Budget kept: the first call was cut off, not paid twice'] : [`Sent to ${r.route[0]} (simulated): answered in time`] };
  emit(w, a.id, 'model.trace', scope(a), `Simulated ${fail ? 'timeout' : 'run'} for “${r.task}”: ${r.lastTrace.steps.at(-2) ?? r.lastTrace.steps[0]}.`);
  return { say: fail ? `Simulated a timeout on ${r.route[0]} for “${r.task}”: after ${r.timeoutMs / 1000} s I moved to ${r.route[1] ?? 'the fallback'}. No real model was called.` : 'Simulated a normal run.' };
});
op('oa.model.rollout', (w, args, a) => {
  const d = deny(w, a, 'models'); if (d) return { say: d };
  const r = routeOf(w, a, args.id); if (!r) return; r.rollout = (args.rollout as ModelRoute['rollout']) ?? 'PAUSED';
  emit(w, a.id, 'model.rollout', scope(a), `${a.name} set “${r.task}” (${r.version}) to ${r.rollout.toLowerCase()} for ${orgOf(w, a.orgId)?.name}.`);
  return { say: r.rollout === 'PAUSED' ? `Paused ${r.version} for your organisation. Q uses the fallback (${r.fallback.toLowerCase()}) until you resume it.` : `${r.version} is ${r.rollout === 'ALL' ? 'on for everyone' : 'on for the pilot group'}.` };
});
op('oa.quality.run', (w, _args, a) => { const d = deny(w, a, 'quality'); if (d) return { say: d }; oaw(w).quality[a.orgId!] = { at: now(), by: a.id }; emit(w, a.id, 'quality.run', scope(a), `${a.name} ran the quality checks (simulated; no fairness statistic produced).`); return { say: 'Ran the checks. None produces a fairness number: the ones that would need protected data are not run, and the rest report counts or “too few to tell”.' }; });
op('oa.learn.toggle', (w, _args, a) => { const d = deny(w, a, 'learning'); if (d) return { say: d }; const st = oaw(w); const cur = st.learnOn[a.orgId!]?.on ?? false; st.learnOn[a.orgId!] = { on: !cur, by: a.id, at: now().slice(0, 10) }; emit(w, a.id, 'learning.setting', scope(a), `${a.name} turned learning from ${orgOf(w, a.orgId)?.name}’s outcomes ${!cur ? 'on' : 'off'}.`); return { say: !cur ? `On. Q may propose learnings from ${orgOf(w, a.orgId)?.name}’s own outcomes; each still needs a reviewer’s yes.` : 'Off. Q proposes nothing new from your outcomes; approved learnings stay until you reject them.' }; });
op('oa.learn.decide', (w, args, a) => {
  const d = deny(w, a, 'learning'); if (d) return { say: d };
  const st = oaw(w); const l = st.learnings.find((x) => x.id === args.id && x.orgId === a.orgId); if (!l) return { say: 'I can’t find that learning.' };
  if (l.state === 'NOT_ALLOWED') return { say: l.reason ?? 'That isn’t allowed.' };
  if (args.ok && !st.learnOn[a.orgId!]?.on) return { say: 'Learning is off for your organisation, so I can’t apply it. Turn it on first, or keep it as a suggestion.' };
  if (!args.ok && !s(args.reason).trim()) return { say: 'Say why in a few words, so the team knows what Q got wrong.' };
  l.state = args.ok ? 'APPROVED' : 'REJECTED'; l.decidedBy = a.id; l.reason = args.ok ? undefined : s(args.reason);
  if (args.ok && l.actorScope) { const who = l.actorScope; if (!st.instructions.some((i) => i.actorId === who && /first name/i.test(i.text))) st.instructions.push({ id: uid('in'), actorId: who, orgId: a.orgId!, kind: 'TONE', text: 'Open every message with the person’s first name.', on: true, at: now(), used: 0, source: 'Learned from your edits (approved)' }); }
  emit(w, a.id, 'learning.decided', scope(a), `${a.name} ${args.ok ? 'approved' : 'rejected'} the learning “${l.text}”${args.ok ? '' : `: ${l.reason}`}.`);
  return { say: args.ok ? `Approved. ${l.actorScope ? `It’s now one of ${nameOf(w, l.actorScope).split(' ')[0]}’s instructions, marked “learned”.` : 'Q applies it from the next draft and shows it when it does.'} You can reject it later.` : 'Rejected. Q won’t apply it, and the reason is kept with it.' };
});
op('oa.src.test', (w, args, a) => { const dn = deny(w, a, 'sources', 'VIEW'); if (dn) return { say: dn }; const x = oaw(w).sources.find((y) => y.id === args.id && y.orgId === a.orgId); if (!x) return; x.lastCheck = now(); return { say: x.health === 'NOT_LICENSED' ? `${x.name} isn’t connected; there is no licence and Talent Q doesn’t scrape.` : `Checked ${x.name} (simulated): ${x.health === 'OK' ? 'healthy' : x.note.toLowerCase()}` }; });
op('oa.src.pause', (w, args, a) => { const d = deny(w, a, 'sources'); if (d) return { say: d }; const x = oaw(w).sources.find((y) => y.id === args.id && y.orgId === a.orgId); if (!x) return; x.paused = !x.paused; emit(w, a.id, 'source.paused', scope(a), `${a.name} ${x.paused ? 'paused' : 'resumed'} ${x.name}.`); return { say: x.paused ? `Paused ${x.name}. New searches skip it; results already found stay.` : `${x.name} is back on.` }; });
op('oa.src.renew', (w, args, a) => { const d = deny(w, a, 'sources'); if (d) return { say: d }; const x = oaw(w).sources.find((y) => y.id === args.id && y.orgId === a.orgId); if (!x) return; x.renewalAsked = now().slice(0, 10); emit(w, a.id, 'source.renewal', scope(a), `${a.name} asked to renew ${x.name} (no payment taken).`); return { say: `Renewal request recorded for ${x.name}. Nothing was paid; the provider’s terms still apply.` }; });

op('oa.pl.invoice', (w, args, a) => {
  const d = deny(w, a, 'placements'); if (d) return { say: d };
  const p = oaw(w).placements.find((x) => x.id === args.id && x.orgId === a.orgId); if (!p) return;
  if (p.stage !== 'OFFER' && p.stage !== 'PLACED') return { say: 'Invoices start at an offer.' };
  if (p.invoice.state === 'NONE') { p.invoice.state = 'DRAFT'; p.invoice.step = 1; return { say: 'Started a draft invoice.' }; }
  if (p.invoice.state === 'DRAFT') { p.invoice.step = (p.invoice.step ?? 1) + 1; if (p.invoice.step >= 3) { p.invoice.state = 'READY'; p.invoice.step = 3; return { say: 'Finished. It’s ready for you to send from your accounting tool; Talent Q doesn’t send invoices or take payment.' }; } return { say: `Step ${p.invoice.step} of 3 done.` }; }
  return { say: 'Already ready.' };
});
op('oa.pl.sent', (w, args, a) => { const d = deny(w, a, 'placements'); if (d) return { say: d }; const p = oaw(w).placements.find((x) => x.id === args.id && x.orgId === a.orgId && x.invoice.state === 'READY'); if (!p) return { say: 'Finish the invoice first.' }; p.invoice.state = 'MARKED_SENT'; emit(w, a.id, 'placement.invoice', scope(a), `${a.name} marked the ${orgOf(w, p.clientOrgId)?.name} invoice as sent from their own tool.`); return { say: 'Marked as sent by you. Whether it’s paid stays unknown until you mark it.' }; });
op('oa.pl.paid', (w, args, a) => { const d = deny(w, a, 'placements'); if (d) return { say: d }; const p = oaw(w).placements.find((x) => x.id === args.id && x.orgId === a.orgId && x.invoice.state === 'MARKED_SENT'); if (!p) return; p.invoice.paid = 'MARKED_PAID'; return { say: 'Marked as paid by you. Talent Q can’t see your bank, so this is your word.' }; });
op('oa.pl.consent', (w, args, a) => { const d = deny(w, a, 'placements'); if (d) return { say: d }; const p = oaw(w).placements.find((x) => x.id === args.id && x.orgId === a.orgId && x.consent === 'PENDING'); if (!p) return; emit(w, a.id, 'placement.consent.asked', `SHARED:${a.orgId}:${p.personId}`, `${orgOf(w, a.orgId)?.name} asked whether it may put ${nameOf(w, p.personId)} forward to ${orgOf(w, p.clientOrgId)?.name}.`); return { say: `Asked ${firstName(w, p.personId)} in Talent Q. Nothing goes to ${orgOf(w, p.clientOrgId)?.name} until they say yes (agency registration terms are still open, D2).` }; });
op('oa.pl.dispute', (w, args, a) => {
  const d = deny(w, a, 'placements'); if (d) return { say: d };
  const p = oaw(w).placements.find((x) => x.id === args.id && x.orgId === a.orgId && x.dispute?.state === 'OPEN'); if (!p) return;
  const keep = args.outcome === 'client';
  p.dispute!.state = 'RESOLVED'; p.dispute!.outcome = keep ? `${orgOf(w, p.clientOrgId)?.name}’s own applicant: no fee` : 'Talentbridge’s introduction, agreed with the client';
  p.attribution = keep ? `${orgOf(w, p.clientOrgId)?.name}: she applied to their listing first. No fee applies.` : 'Talentbridge: introduction accepted by the client.';
  emit(w, a.id, 'placement.dispute', scope(a), `${a.name} settled the attribution for ${nameOf(w, p.personId)}: ${p.dispute!.outcome}.`);
  return { say: `Recorded: ${p.dispute!.outcome}.` };
});

export { actorOf };
