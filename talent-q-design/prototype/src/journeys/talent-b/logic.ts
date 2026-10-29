// talent-b logic shared by pages, Q skills and proactive rules: Passport items, per-organisation disclosure,
// simulated uploads and issuer checks, matching with its basis, honest application status, and candidate
// memory with deletion receipts. Everything mutates the one store; nothing is really uploaded, checked or sent.
import type { Evidence } from '@contracts';
import { canDiscover, canSeeCandidate, discoveryRule, emit, getWorld, now, relationshipWith, simNow, uid, update, type World } from '../../mock/world';
import type { Actor, Application, Job } from '../../state/domain';
import { appendQ, pushUndo, registerOp } from '../../q/core/engine';
import { tb, type CandMemory, type Upload, type UploadKind } from '../../state/areas/talent-b';

export { tb };
export const PSCOPE = (pid: string) => `PERSON:${pid}`;
export const orgName = (w: World, id: string) => w.orgs.find((o) => o.id === id)?.name ?? id;
export const shortOrg = (w: World, id: string) => orgName(w, id).replace(/ (Pay|Health|Logistics|Freight Tech|Care Homes)$/, '');
export const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const daysBetween = (a: Date, b: Date) => Math.max(0, Math.floor((b.getTime() - a.getTime()) / 864e5));

// ---------------- Passport ----------------
export type Ver = NonNullable<Evidence['verification']>;
export const verOf = (e: Evidence): Ver => e.verification ?? (e.verified ? 'VERIFIED' : 'UNVERIFIED');
export const VER: Record<Ver, { label: string; plain: string; k: 'ok' | 'warn' | 'risk' | 'busy' | undefined }> = {
  VERIFIED: { label: 'Verified', plain: 'Checked at the source (the issuer or the original repository). Employers see that it was checked.', k: 'ok' },
  PENDING: { label: 'Check pending', plain: 'We’ve asked the source and are waiting. Pending is not failed: nothing is wrong with the item.', k: 'busy' },
  UNVERIFIED: { label: 'Not checked', plain: 'Nobody has checked this at the source yet. Employers see it as your own upload. That isn’t bad; it just carries less weight.', k: undefined },
  FAILED: { label: 'Check failed', plain: 'The source answered but couldn’t confirm it. It may be a typo in a number or an expired record. You can fix it or ask for a manual review.', k: 'risk' },
  UNDER_REVIEW: { label: 'Under review', plain: 'A person at Talent Q (simulated) is looking at it by hand, or we’re waiting for a reference to confirm it.', k: 'warn' },
};
export const KIND: Record<Evidence['kind'], string> = { PROJECT: 'Project', CREDENTIAL: 'Certificate', ASSESSMENT: 'Assessment', WORK_SAMPLE: 'Work sample', REFERENCE: 'Reference', EMPLOYMENT: 'Employment', CLAIM: 'Claim', PRACTICE: 'Practice (private)' };
export const myEvidence = (w: World, pid: string) => w.evidence.filter((e) => e.ownerId === pid && e.kind !== 'PRACTICE');
export const evById = (w: World, id: string) => w.evidence.find((e) => e.evidenceId === id);
export const isCode = (e: Evidence) => /repo|code|library|github|worker|api|service/i.test(`${e.title} ${e.source}`);

/** Organisations shown in the disclosure matrix: the three in Tobi's world plus anyone the person applied to. */
export function viewerOrgs(w: World, pid: string) {
  const ids = ['org_kora', 'org_tb', 'org_medlink'];
  for (const a of w.applications.filter((x) => x.personId === pid)) { const o = w.jobs.find((j) => j.id === a.jobId)?.orgId; if (o && !ids.includes(o)) ids.push(o); }
  return ids.filter((id) => w.orgs.some((o) => o.id === id));
}
export type Cell = 'SHARED' | 'PUBLIC' | 'PUBLIC_UNSEEN' | 'REVOKED' | 'NONE' | 'LOCKED' | 'WITHDRAWN';
export function cellOf(w: World, e: Evidence, org: string): Cell {
  if (e.confidential) return 'LOCKED';
  if (w.consents[e.ownerId]?.withdrawnFrom.includes(org)) return 'WITHDRAWN';
  if (e.revokedFrom?.includes(org)) return 'REVOKED';
  // Public items reach only organisations the store lets see the person at all (same rule as visibleEvidence).
  if (e.visibility === 'PUBLIC_PROFILE') return canSeeCandidate(w, e.ownerId, org) ? 'PUBLIC' : 'PUBLIC_UNSEEN';
  if (e.visibility === 'SHARED_WITH' && e.sharedWith.includes(org)) return 'SHARED';
  return 'NONE';
}
export const CELL_LABEL: Record<Cell, string> = { SHARED: 'Shared', PUBLIC: 'Public', PUBLIC_UNSEEN: 'Public, can’t see you', REVOKED: 'Access ended', NONE: 'Not shared', LOCKED: 'Confidential', WITHDRAWN: 'Consent withdrawn' };
export const cellOn = (c: Cell) => c === 'SHARED' || c === 'PUBLIC';

/** Proof at a glance: how much of the Passport is checked, waiting, the person's own, or confidential. */
export function passportStats(items: Evidence[]) {
  const n = { VERIFIED: 0, WAITING: 0, FAILED: 0, OWN: 0, CONFIDENTIAL: 0 };
  for (const e of items) {
    const v = verOf(e);
    if (e.confidential) n.CONFIDENTIAL++;
    else if (v === 'VERIFIED') n.VERIFIED++;
    else if (v === 'PENDING' || v === 'UNDER_REVIEW') n.WAITING++;
    else if (v === 'FAILED') n.FAILED++;
    else n.OWN++;
  }
  return n;
}

// ---------------- Who can see or find the person (explains the store's policy; never decides it) ----------------
export interface Reach { org: string; name: string; agency: boolean; sees: boolean; via: 'LINK' | 'SEARCH' | null; hidden: boolean; reason: string }
/** One row per organisation. The verdict comes only from canSeeCandidate / relationshipWith / canDiscover in
 *  mock/world.ts, so this preview can't drift from what's enforced; the reason only explains which rule applied. */
export function reachOf(w: World, pid: string): Reach[] {
  const c = w.consents[pid]; const rule = discoveryRule(w, pid);
  return w.orgs.map((o) => {
    const sees = canSeeCandidate(w, pid, o.id); const link = relationshipWith(w, pid, o.id); const search = canDiscover(w, pid, o.id);
    const hidden = rule.hideFrom.includes(o.id); const agency = o.kind !== 'EMPLOYER';
    const why = c?.registeredWith?.includes(o.id) ? 'You registered with them.' : w.applications.some((a) => a.personId === pid && w.jobs.find((j) => j.id === a.jobId)?.orgId === o.id) ? 'You applied to them.' : 'You shared items with them.';
    let reason: string;
    if (c?.withdrawnFrom.includes(o.id)) reason = 'You withdrew your consent, so they see nothing at all.';
    else if (link && search) reason = `${why} They can also find you in search.`;
    else if (link) reason = `${why} Your search setting doesn’t change that.`;
    else if (search) reason = agency ? 'A checked agency. Your setting lets agencies find you.' : 'A checked employer. They can find you in search.';
    else if (!c?.discoverable || rule.who === 'NOBODY') reason = 'Search is off, and you’ve no link with them.';
    else if (hidden) reason = 'You hid your profile from them.';
    else if (rule.who === 'VERIFIED_EMPLOYERS' && agency) reason = 'An agency. Your setting allows employers only.';
    else if (!o.verified.domain) reason = 'Their web domain isn’t checked, so they can’t search for anyone.';
    else if (rule.who === 'VERIFIED_EMPLOYERS' && o.verified.registry !== 'VERIFIED') reason = 'Their business registration isn’t confirmed yet. Your setting needs both checks.';
    else reason = 'They can’t find you.';
    return { org: o.id, name: o.name, agency, sees, via: link ? 'LINK' : search ? 'SEARCH' : null, hidden, reason };
  });
}

function share(_w: World, e: Evidence, org: string) {
  e.revokedFrom = (e.revokedFrom ?? []).filter((x) => x !== org);
  if (e.visibility !== 'PUBLIC_PROFILE') { e.visibility = 'SHARED_WITH'; if (!e.sharedWith.includes(org)) e.sharedWith.push(org); }
}
function revoke(w: World, e: Evidence, org: string) {
  e.sharedWith = e.sharedWith.filter((x) => x !== org);
  if (e.visibility === 'SHARED_WITH' && !e.sharedWith.length) e.visibility = 'PRIVATE';
  if (!(e.revokedFrom ?? []).includes(org)) e.revokedFrom = [...(e.revokedFrom ?? []), org];
  void w;
}

registerOp('tb.share', (w, a, actor) => {
  const ids = (a.ids as string[]) ?? [String(a.id)]; const org = String(a.org);
  const items = ids.map((id) => evById(w, id)).filter((e): e is Evidence => !!e && e.ownerId === actor.personId);
  const conf = items.filter((e) => e.confidential);
  if (conf.length) return { say: `I didn’t share “${conf[0].title}”. It’s the confidential original, and it stays private. I can share a redacted summary instead.` };
  for (const e of items) share(w, e, org);
  if (w.q.frames[actor.id]?.intent === 'tb.conf') w.q.frames[actor.id] = null;
  emit(w, actor.id, 'passport.shared', `SHARED:${org}:${actor.personId}`, `${actor.name} shared ${items.length} Passport ${items.length === 1 ? 'item' : 'items'} with ${orgName(w, org)}.`, { ids, org });
  pushUndo(w, actor.id, `share with ${orgName(w, org)}`, 'tb.revoke', { ids, org, silent: true });
  return { say: `${orgName(w, org)} can now see ${items.map((e) => `“${e.title}”`).join(', ')}. This took effect straight away.` };
});
registerOp('tb.revoke', (w, a, actor) => {
  const ids = (a.ids as string[]) ?? [String(a.id)]; const org = String(a.org);
  const items = ids.map((id) => evById(w, id)).filter((e): e is Evidence => !!e && e.ownerId === actor.personId);
  for (const e of items) revoke(w, e, org);
  // The organisation is told only that access ended: no titles, no reason.
  emit(w, actor.id, 'passport.access_ended', `SHARED:${org}:${actor.personId}`, `${actor.name} ended ${orgName(w, org)}’s access to ${items.length} Passport ${items.length === 1 ? 'item' : 'items'}.`, { org, count: items.length });
  emit(w, actor.id, 'passport.revoked', PSCOPE(actor.personId!), `You ended ${orgName(w, org)}’s access to: ${items.map((e) => e.title).join('; ')}.`, { ids, org });
  if (!a.silent) pushUndo(w, actor.id, `end ${orgName(w, org)}’s access`, 'tb.share', { ids, org });
  return a.silent ? undefined : { say: `Done. ${orgName(w, org)} can no longer see ${items.length === 1 ? `“${items[0].title}”` : `those ${items.length} items`}. Their view updated straight away; they’re told only that access ended, not why. Everyone else’s access is unchanged.` };
});

// ---------------- Confidential work: redacted summary + attestation ----------------
/** Q's redacted summary of a confidential original (other areas may hold attestations that also point at it). */
export const redactedOf = (w: World, id: string) => evById(w, `${id}_red`);
export function ensureRedacted(w: World, origId = 'e_tobi_conf') {
  const orig = evById(w, origId); if (!orig) return undefined;
  let r = redactedOf(w, orig.evidenceId);
  if (!r) {
    r = { ...orig, evidenceId: `${orig.evidenceId}_red`, title: 'Fraud-rules engine (redacted summary)', source: 'Redacted by you with Q', confidential: false, redactedOf: orig.evidenceId, origin: 'UPLOAD',
      shows: 'Designed a rules engine that screens payouts for fraud before money leaves: rule versioning, a review queue, and back-testing against past fraud. Client names, volumes and rule thresholds removed.',
      limits: 'A summary, not the original. Numbers and names are removed under the NDA. A reference can confirm it.', visibility: 'PRIVATE', sharedWith: [], revokedFrom: [], verification: 'UNVERIFIED', verified: false, observedAt: now().slice(0, 10) };
    w.evidence.push(r);
    emit(w, orig.ownerId, 'passport.redacted', PSCOPE(orig.ownerId), `Q made a redacted summary of “${orig.title}”. The original stays private.`);
  }
  return r;
}
registerOp('tb.redact', (w, a, actor) => {
  const orig = evById(w, String(a.id ?? 'e_tobi_conf'));
  if (!orig || orig.ownerId !== actor.personId) return { say: 'I couldn’t find that item in your Passport.' };
  ensureRedacted(w, orig.evidenceId);
  return { say: 'I’ve made a redacted summary. Names, volumes and thresholds are removed; the original stays private and can’t be shared. Check the preview before you share it with anyone.' };
});
registerOp('tb.attest', (w, a, actor) => {
  const r = evById(w, String(a.id));
  if (!r) return;
  r.verification = 'UNDER_REVIEW'; r.limits = 'A summary, not the original. Waiting for your former manager at Lumen to confirm it (reference request simulated).';
  emit(w, actor.id, 'passport.attestation_requested', PSCOPE(actor.personId!), `Asked a reference to confirm “${r.title}” (simulated; nothing was sent).`);
  return { say: 'I’ve drafted a request to your former manager to confirm the summary (simulated: nothing was sent). Until they answer, it shows as “under review”.' };
});

// ---------------- Uploads (simulated, resumable) ----------------
const KIND_OF: Record<UploadKind, Evidence['kind']> = { CV: 'CLAIM', CERTIFICATE: 'CREDENTIAL', WORK_SAMPLE: 'WORK_SAMPLE', LINK: 'PROJECT' };
export function startUpload(w: World, pid: string, kind: UploadKind, name: string, fail = false) {
  const u: Upload = { id: uid('up'), personId: pid, name, kind, progress: 0, state: 'UPLOADING', attempt: 1, startedAt: now(), failAt: fail ? 60 : undefined };
  tb(w).uploads.push(u);
  return u;
}
export const defaultName = (kind: UploadKind, first: string) => ({ CV: `${first}_CV_2026.pdf`, CERTIFICATE: 'certificate.pdf', WORK_SAMPLE: 'work-sample.zip', LINK: 'https://github.com/' + first.toLowerCase() }[kind]);
registerOp('tb.upload', (w, a, actor) => {
  const kind = String(a.kind) as UploadKind; const name = String(a.name ?? defaultName(kind, actor.first));
  startUpload(w, actor.personId!, kind, name, !!a.fail);
  return { say: `Uploading “${name}”. You can keep working; I’ll tell you when it’s in.` };
});
registerOp('tb.upload.retry', (w, a) => {
  const u = tb(w).uploads.find((x) => x.id === a.id) ?? [...tb(w).uploads].reverse().find((x) => x.state === 'FAILED');
  if (!u) return { say: 'There’s no failed upload to retry.' };
  u.state = 'UPLOADING'; u.attempt += 1; u.error = undefined; u.failAt = undefined;
  return { say: `Retrying “${u.name}” from ${u.progress}%. Nothing already sent is lost.` };
});
registerOp('tb.upload.cancel', (w, a) => { const u = tb(w).uploads.find((x) => x.id === a.id); if (u) u.state = 'CANCELLED'; });

function finishUpload(w: World, u: Upload) {
  const kind = KIND_OF[u.kind];
  const id = uid('e');
  const aws = /aws/i.test(u.name);
  const e: Evidence = {
    evidenceId: id, ownerId: u.personId, kind, title: u.kind === 'CV' ? `CV: ${u.name}` : u.kind === 'LINK' ? `Link: ${u.name.replace(/^https?:\/\//, '')}` : u.name.replace(/\.(pdf|zip|png|jpg)$/i, '').replace(/[-_]/g, ' '),
    source: u.kind === 'LINK' ? 'Link you added' : 'Your upload', observedAt: now().slice(0, 10), verified: false,
    verification: u.kind === 'CERTIFICATE' || u.kind === 'LINK' ? 'PENDING' : 'UNVERIFIED', origin: 'UPLOAD', visibility: 'PRIVATE', sharedWith: [], revokedFrom: [],
    shows: u.kind === 'CV' ? 'Your CV. Each line is a claim until something backs it up.' : u.kind === 'CERTIFICATE' ? (aws ? 'An AWS certificate you uploaded.' : 'A certificate you uploaded.') : u.kind === 'LINK' ? 'A link to your public work.' : 'A work sample you uploaded.',
    limits: u.kind === 'CV' ? 'Claims, not evidence.' : u.kind === 'CERTIFICATE' || u.kind === 'LINK' ? 'Check with the source pending.' : 'Not checked; employers see it as your own upload.',
  };
  w.evidence.push(e); u.evidenceId = id; u.state = 'DONE'; u.progress = 100;
  emit(w, u.personId, 'passport.uploaded', PSCOPE(u.personId), `Added “${e.title}” to your Passport (private).`);
  appendQ(w, u.personId, { who: 'q', kind: 'notice', engine: 'rules', text: `“${u.name}” is in your Passport. It’s private until you share it.${e.verification === 'PENDING' ? ' I’ve started a check with the source.' : ''}`, actions: [{ label: 'Open it', act: { t: 'nav', to: `/c/passport?item=${id}` } }] });
  if (e.verification === 'PENDING') startCheck(w, id, u.personId);
}

// ---------------- Issuer checks (simulated; the AWS issuer is unreachable, then can't confirm) ----------------
export function startCheck(w: World, evidenceId: string, pid: string) {
  const s = tb(w); const e = evById(w, evidenceId); if (!e) return;
  const attempt = s.checks.filter((c) => c.evidenceId === evidenceId).length + 1;
  s.checks.push({ evidenceId, personId: pid, attempt, startedMs: Date.now(), state: 'RUNNING' });
  e.verification = 'PENDING';
  s.ackFailed = s.ackFailed.filter((x) => x !== evidenceId);
}
export const checkRunning = (w: World, id: string) => tb(w).checks.some((c) => c.evidenceId === id && c.state === 'RUNNING');
export const lastCheck = (w: World, id: string) => [...tb(w).checks].reverse().find((c) => c.evidenceId === id);
registerOp('tb.verify', (w, a, actor) => {
  const e = evById(w, String(a.id)); if (!e) return;
  if (e.confidential) return { say: 'The confidential original can’t be sent to anyone for checking. A reference can confirm the redacted summary instead.' };
  startCheck(w, e.evidenceId, actor.personId!);
  return { say: `Asking the source to confirm “${e.title}” (simulated). This usually takes a moment here; in real life it can take days.` };
});
registerOp('tb.verify.review', (w, a, actor) => {
  const e = evById(w, String(a.id)); if (!e) return;
  e.verification = 'UNDER_REVIEW'; e.limits = 'Manual review requested: a person will compare your upload with the issuer’s records (simulated).';
  tb(w).ackFailed.push(e.evidenceId);
  emit(w, actor.id, 'passport.review_requested', PSCOPE(actor.personId!), `Asked for a manual review of “${e.title}”.`);
  return { say: 'Manual review requested (simulated). It shows as “under review” until someone confirms it. Employers you share it with see that status, not “failed”.' };
});
registerOp('tb.verify.ack', (w, a) => { tb(w).ackFailed.push(String(a.id)); });

function resolveCheck(w: World, c: { evidenceId: string; personId: string; attempt: number; state: string; outcome?: string }) {
  const e = evById(w, c.evidenceId); c.state = 'DONE'; if (!e) return;
  const aws = /aws/i.test(e.title);
  if (aws && c.attempt === 1) {
    c.outcome = 'UNREACHABLE'; e.verification = 'PENDING'; e.limits = 'The issuer (AWS’s credential service) didn’t answer. Still pending, not failed. Try again later.';
    appendQ(w, c.personId, { who: 'q', kind: 'notice', engine: 'rules', text: `AWS’s credential service didn’t answer, so “${e.title}” is still pending. Pending isn’t failed: nothing is wrong with your certificate. I can try again.`, actions: [{ label: 'Try again', primary: true, act: { t: 'do', op: 'tb.verify', args: { id: e.evidenceId } } }] });
  } else if (aws) {
    c.outcome = 'FAILED'; e.verification = 'FAILED'; e.verified = false; e.limits = 'AWS answered but couldn’t match the validation number on this certificate.';
    appendQ(w, c.personId, { who: 'q', kind: 'notice', engine: 'rules', text: `AWS answered this time but couldn’t confirm “${e.title}”: the validation number didn’t match their records. That often means a typo or an expired certificate, not a fake. Here’s what you can do.`,
      actions: [{ label: 'What can I do?', primary: true, act: { t: 'say', text: 'my aws cert failed, what do i do now' } }, { label: 'Ask for a manual review', act: { t: 'do', op: 'tb.verify.review', args: { id: e.evidenceId } } }] });
  } else {
    c.outcome = 'VERIFIED'; e.verification = 'VERIFIED'; e.verified = true; e.limits = e.limits.replace(/Check with the source pending\.|Issuer check pending\.|Repository check pending\.|Not yet verified with the issuer\./, 'Confirmed by the source (simulated).');
    appendQ(w, c.personId, { who: 'q', kind: 'notice', engine: 'rules', text: `“${e.title}” is verified (simulated check). Employers you share it with will see that.` });
  }
  emit(w, c.personId, 'passport.check', PSCOPE(c.personId), `Check for “${e.title}”: ${c.outcome?.toLowerCase()}.`);
}

// ---------------- Discovery ----------------
export const discoveryOf = (w: World, pid: string) => tb(w).discovery[pid] ?? { who: 'VERIFIED_EMPLOYERS' as const, hideFrom: [], showSalary: false };
/** Whether an organisation may find this person in search (respects the global switch and per-org hiding). */
export const discoverableBy = (w: World, pid: string, orgId: string) => canDiscover(w, pid, orgId); // the one policy lives in the store
registerOp('tb.discovery', (w, a, actor) => {
  const pid = actor.personId!; const d = { ...discoveryOf(w, pid) };
  if (a.who) d.who = a.who as typeof d.who;
  if (a.hide) d.hideFrom = [...new Set([...d.hideFrom, String(a.hide)])];
  if (a.unhide) d.hideFrom = d.hideFrom.filter((x) => x !== a.unhide);
  if (a.showSalary !== undefined) d.showSalary = !!a.showSalary;
  tb(w).discovery[pid] = d;
  w.consents[pid] = { ...w.consents[pid], discoverable: d.who !== 'NOBODY' };
  emit(w, actor.id, 'settings.discovery', PSCOPE(pid), `Discovery settings changed: ${d.who.toLowerCase().replace(/_/g, ' ')}${d.hideFrom.length ? `, hidden from ${d.hideFrom.map((x) => orgName(w, x)).join(', ')}` : ''}.`);
  return { say: d.who === 'NOBODY' ? 'Done. No recruiter can find you in search now. You can still apply, and anyone you’ve shared with keeps what you shared.' : d.who === 'VERIFIED_EMPLOYERS' ? 'Done. Only verified employers can find you; agencies can’t.' : 'Done. Verified employers and agencies can find you.' };
});

// ---------------- Q's summary of the person, with corrections ----------------
export interface SummaryLine { topic: string; text: string; basis: string; corrected?: boolean }
export function summaryFor(w: World, pid: string): SummaryLine[] {
  const p = w.people.find((x) => x.personId === pid);
  const ev = myEvidence(w, pid).filter((e) => e.kind !== 'CLAIM' && !e.confidential && verOf(e) !== 'FAILED');
  const has = (re: RegExp) => ev.filter((e) => re.test(`${e.title} ${e.shows}`));
  const lines: SummaryLine[] = [];
  lines.push({ topic: 'role', text: p?.headline ?? 'No headline yet', basis: 'Your profile headline' });
  const pay = has(/payment|payout|settlement|ledger|reconcil|fraud/i);
  if (pay.length) lines.push({ topic: 'payments', text: `Payments and money movement: ${pay.length} ${pay.length === 1 ? 'item' : 'items'} of proof`, basis: pay.map((e) => e.title).join('; ') });
  const go = has(/\bgo\b|golang/i);
  lines.push({ topic: 'go', text: go.length >= 2 ? `Writes Go (${go.length} items)` : go.length ? 'Some Go: one item' : 'No Go shown yet', basis: go.length ? go.map((e) => e.title).join('; ') : 'Nothing in your Passport shows Go' });
  const lead = has(/\bled\b|\blead\b|managed|team of|mentor/i);
  lines.push({ topic: 'lead', text: lead.length ? 'Has led people' : 'No evidence yet of leading people', basis: lead.length ? lead.map((e) => e.title).join('; ') : 'Nothing in your Passport mentions leading or managing a team' });
  const fixes = tb(w).corrections[pid] ?? [];
  return lines.map((l) => { const f = [...fixes].reverse().find((x) => x.topic === l.topic); return f ? { ...l, text: f.said, basis: `You corrected this on ${fmtDate(f.at)}. Earlier I said: “${f.before}”.`, corrected: true } : l; });
}
registerOp('tb.summary.correct', (w, a, actor) => {
  const pid = actor.personId!; const topic = String(a.topic);
  const before = summaryFor(w, pid).find((l) => l.topic === topic)?.text ?? '';
  (tb(w).corrections[pid] ??= []).push({ at: simNow(w).toISOString(), topic, said: String(a.said), before });
  emit(w, actor.id, 'q.summary.corrected', PSCOPE(pid), `You corrected Q’s summary (${topic}).`);
});

// ---------------- Matching, with its basis ----------------
const NEED_EV: { need: RegExp; ev: RegExp }[] = [
  { need: /payment|payout/i, ev: /payment|payout|settlement|ledger|reconcil|fraud|money/i },
  { need: /\bgo\b/i, ev: /\bgo\b|golang/i },
  { need: /postgres/i, ev: /postgres/i },
  { need: /sql/i, ev: /sql|postgres|query/i },
  { need: /logistic/i, ev: /fleet|logistic|gps|route|freight/i },
  { need: /incident/i, ev: /incident|outage|on-call|postmortem/i },
  { need: /leadership/i, ev: /\bled\b|\blead\b|managed|team of/i },
];
export type NeedState = 'VERIFIED' | 'SHOWN' | 'TOLD' | 'NONE';
export interface NeedMatch { need: string; state: NeedState; used: Evidence[]; told?: string }
export function matchFor(w: World, pid: string, job: Job): NeedMatch[] {
  const ev = myEvidence(w, pid).filter((e) => e.kind !== 'CLAIM' && !e.confidential && verOf(e) !== 'FAILED');
  const told = tb(w).told[pid] ?? [];
  return job.needs.map((need) => {
    const rule = NEED_EV.find((r) => r.need.test(need));
    const words = need.toLowerCase().split(/\W+/).filter((x) => x.length > 3);
    const used = ev.filter((e) => { const t = `${e.title} ${e.shows}`; return rule ? rule.ev.test(t) : words.some((x) => t.toLowerCase().includes(x)); });
    const t = [...told].reverse().find((x) => x.need === need);
    const state: NeedState = used.some((e) => verOf(e) === 'VERIFIED') ? 'VERIFIED' : used.length ? 'SHOWN' : t ? 'TOLD' : 'NONE';
    return { need, state, used, told: t?.said };
  });
}
export const NEED_LABEL: Record<NeedState, string> = { VERIFIED: 'Shown and checked', SHOWN: 'Shown, not yet checked', TOLD: 'You told me; no proof yet', NONE: 'Not shown yet' };
export const NEED_GLYPH = { VERIFIED: 'verified', SHOWN: 'full', TOLD: 'partial', NONE: 'none' } as const;
export const fitLine = (m: NeedMatch[]) => `${m.filter((x) => x.state === 'VERIFIED' || x.state === 'SHOWN').length} of ${m.length} needs shown`;
registerOp('tb.match.tell', (w, a, actor) => {
  (tb(w).told[actor.personId!] ??= []).push({ need: String(a.need), said: String(a.said), at: simNow(w).toISOString() });
  emit(w, actor.id, 'q.match.corrected', PSCOPE(actor.personId!), `You corrected a match: ${String(a.need)}.`);
});

/** Pay and place, read from what the person told Q (and only what's still remembered). */
export function mutualFit(w: World, pid: string, job: Job): { k: string; text: string; ok: boolean | null }[] {
  const mem = (key: string) => tb(w).memories.find((m) => m.personId === pid && m.key === key && m.state === 'ACTIVE');
  const person = w.people.find((p) => p.personId === pid);
  const out: { k: string; text: string; ok: boolean | null }[] = [];
  const pay = mem('pay.minimum');
  if (job.pay === 'Not stated') out.push({ k: 'Pay', text: 'Not stated by the employer. Worth asking before you spend time on it.', ok: null });
  else if (!pay) out.push({ k: 'Pay', text: `${job.pay}. You haven’t told me what you need, so I can’t compare.`, ok: null });
  else if (/US\$/.test(job.pay)) { const lo = Number(job.pay.match(/([\d,]+)/)?.[1].replace(/,/g, '') ?? 0); out.push({ k: 'Pay', text: `${job.pay}. ${lo >= 3000 ? 'Meets' : 'The bottom of the range is under'} the US$3,000 a month you told me.`, ok: lo >= 3000 ? true : null }); }
  else out.push({ k: 'Pay', text: `${job.pay}. Roughly US$1,500–1,950 at an illustrative ₦1,600 to US$1: below the US$3,000 you told me. Rates move; check before deciding.`, ok: false });
  const move = mem('location.relocation');
  const loc = job.location;
  if (/remote/i.test(loc) || (person && loc.includes(person.location))) out.push({ k: 'Place', text: `${loc}. Works from ${person?.location ?? 'where you are'}.`, ok: true });
  else if (move && /port harcourt/i.test(loc)) out.push({ k: 'Place', text: `${loc}. You told me you wouldn’t move to Port Harcourt.`, ok: false });
  else if (move && /lagos/i.test(loc)) out.push({ k: 'Place', text: `${loc}. You told me you’d move to Lagos for the right role.`, ok: true });
  else out.push({ k: 'Place', text: `${loc}. You’re in ${person?.location ?? 'a different city'}.`, ok: null });
  out.push({ k: 'Way of working', text: job.workMode === 'REMOTE' ? 'Remote' : job.workMode === 'HYBRID' ? 'Hybrid: some days in the office' : 'In the office', ok: null });
  return out;
}

// ---------------- Employer signals ----------------
export function signalsOf(w: World, job: Job) {
  const o = w.orgs.find((x) => x.id === job.orgId)!;
  return [
    { k: 'Email domain checked', on: job.signals.domainVerified && o.verified.domain, plain: 'The recruiter’s email is on the company’s own web domain. It shows the person works there; it doesn’t show the job is good.' },
    { k: 'Registered business', on: job.signals.registryVerified && o.verified.registry === 'VERIFIED', plain: o.verified.registry === 'PENDING' ? 'Registration not yet confirmed with the business registry. Not a red flag on its own; it just hasn’t been checked.' : 'Confirmed with the business registry (simulated). It shows the company exists; it says nothing about pay or culture.' },
    { k: 'Recruiter active', on: job.signals.recruiterActive, plain: job.signals.recruiterActive ? 'Someone from this employer used Talent Q in the last 14 days.' : 'Nobody from this employer has used Talent Q in the last 14 days. Applications may not be read.' },
  ];
}
export const verifiedEmployer = (w: World, job: Job) => signalsOf(w, job).slice(0, 2).every((s) => s.on);

// ---------------- Applications: honest status, no promises ----------------
export const APP_LABEL: Record<Application['status'], string> = { DRAFT: 'Draft', SUBMITTED: 'Sent', VIEWED: 'Viewed', INTERVIEW: 'Interview', OFFER: 'Offer', NOT_PROGRESSING: 'Not progressing', WITHDRAWN: 'Withdrawn', JOB_CLOSED: 'Listing closed' };
export const APP_K: Record<Application['status'], 'ok' | 'warn' | 'risk' | 'busy' | undefined> = { DRAFT: undefined, SUBMITTED: undefined, VIEWED: 'busy', INTERVIEW: 'ok', OFFER: 'ok', NOT_PROGRESSING: 'risk', WITHDRAWN: undefined, JOB_CLOSED: 'warn' };
export function appExplain(w: World, a: Application) {
  const job = w.jobs.find((j) => j.id === a.jobId); const org = job ? orgName(w, job.orgId) : 'The employer';
  const applied = a.timeline.find((t) => t.by === 'YOU')?.at ?? a.timeline[0]?.at;
  const last = a.lastEmployerActivity ?? applied;
  const days = last ? daysBetween(new Date(last), simNow(w)) : 0;
  const viewed = [...a.timeline].reverse().find((t) => /viewed/i.test(t.text))?.at;
  const plain: Record<Application['status'], string> = {
    DRAFT: 'Not sent yet.',
    SUBMITTED: `Delivered. ${org} hasn’t opened it, as far as Talent Q can see.`,
    VIEWED: `Someone at ${org} opened it${viewed ? ` on ${fmtDate(viewed)}` : ''}. That’s all “viewed” means: it isn’t a shortlist or a decision.`,
    INTERVIEW: `${org} invited you to interview. It’s a step, not an offer.`,
    OFFER: `${org} made an offer.`,
    NOT_PROGRESSING: `${org} told Talent Q they aren’t taking this application further.`,
    WITHDRAWN: 'You withdrew this application.',
    JOB_CLOSED: 'The employer closed the listing. Your application wasn’t rejected; the job stopped taking applications.',
  };
  const fu = tb(w).followups.find((f) => f.appId === a.id);
  const waiting = (a.status === 'SUBMITTED' || a.status === 'VIEWED') && days >= tb(w).noReplyDays && !fu;
  return { job, org, plain: plain[a.status], days, waiting, followup: fu, applied };
}
function threadFor(w: World, orgId: string, pid: string) {
  let t = w.threads.find((x) => x.orgId === orgId && x.personId === pid);
  if (!t) { t = { id: uid('t'), orgId, personId: pid, messages: [] }; w.threads.push(t); }
  return t;
}
export const followupText = (w: World, a: Application, first: string) => {
  const job = w.jobs.find((j) => j.id === a.jobId);
  return `Hello, I applied for the ${job?.title ?? 'role'} on ${fmtDate(a.timeline[0]?.at ?? now())}. I’m still interested and happy to share more about my work if useful. Could you let me know where things stand? Thank you, ${first}`;
};
registerOp('tb.followup.send', (w, a, actor) => {
  const app = w.applications.find((x) => x.id === a.appId); if (!app || app.personId !== actor.personId) return;
  const job = w.jobs.find((j) => j.id === app.jobId)!;
  const t = threadFor(w, job.orgId, app.personId);
  t.messages.push({ id: uid('msg'), from: app.personId, to: job.orgId, subject: `Following up: ${job.title}`, body: String(a.body ?? followupText(w, app, actor.first)), at: now(), status: 'SENT_SIMULATED', approvedBy: actor.id, receipt: uid('sim'), channel: 'IN_APP' });
  app.timeline.push({ at: simNow(w).toISOString().slice(0, 10), text: 'You sent a polite follow-up (simulated)', by: 'YOU' });
  tb(w).followups = [...tb(w).followups.filter((f) => f.appId !== app.id), { appId: app.id, state: 'SENT_SIMULATED', at: now() }];
  emit(w, actor.id, 'application.followup', `SHARED:${job.orgId}:${app.personId}`, `${actor.name} followed up on the ${job.title} application (simulated).`);
  return { say: `Sent (simulated) to ${orgName(w, job.orgId)}. It’s in your messages. I won’t nudge you about this one again for a while; whether they reply is up to them.` };
});
registerOp('tb.followup.moveon', (w, a, actor) => {
  const app = w.applications.find((x) => x.id === a.appId); if (!app) return;
  tb(w).followups = [...tb(w).followups.filter((f) => f.appId !== app.id), { appId: app.id, state: 'MOVED_ON', at: now() }];
  app.timeline.push({ at: simNow(w).toISOString().slice(0, 10), text: 'You moved on (the application stays open on their side)', by: 'YOU' });
  emit(w, actor.id, 'application.moved_on', PSCOPE(actor.personId!), 'You moved on from an application with no reply.');
  pushUndo(w, actor.id, 'moving on', 'tb.followup.undo', { appId: app.id });
  return { say: 'Okay. I’ve put it at the bottom and won’t remind you again. It stays open on their side, so if they reply, you’ll still see it.' };
});
registerOp('tb.followup.undo', (w, a) => { tb(w).followups = tb(w).followups.filter((f) => f.appId !== a.appId); });
registerOp('tb.app.withdraw', (w, a, actor) => {
  const app = w.applications.find((x) => x.id === a.appId); if (!app || app.personId !== actor.personId) return;
  const job = w.jobs.find((j) => j.id === app.jobId)!;
  app.status = 'WITHDRAWN'; app.timeline.push({ at: simNow(w).toISOString().slice(0, 10), text: 'You withdrew', by: 'YOU' });
  emit(w, actor.id, 'application.withdrawn', `SHARED:${job.orgId}:${app.personId}`, `${actor.name} withdrew from ${job.title}.`);
  return { say: `Withdrawn. ${orgName(w, job.orgId)} is told you withdrew; they keep what you’d already shared with this application.` };
});

// ---------------- Saving and applying (a listing can close part-way) ----------------
registerOp('tb.save', (w, a, actor) => {
  const pid = actor.personId!; const s = (tb(w).saved[pid] ??= []); const id = String(a.jobId);
  const on = !s.includes(id);
  tb(w).saved[pid] = on ? [...s, id] : s.filter((x) => x !== id);
  const job = w.jobs.find((j) => j.id === id);
  return { say: on ? `Saved “${job?.title}”. I’ll tell you if it closes.` : `Removed “${job?.title}” from saved jobs.` };
});
registerOp('tb.apply.start', (w, a, actor) => {
  const job = w.jobs.find((j) => j.id === a.jobId); if (!job) return;
  const pid = actor.personId!;
  const shared = matchFor(w, pid, job).flatMap((m) => m.used.map((e) => e.evidenceId)).filter((v, i, x) => x.indexOf(v) === i);
  tb(w).applying[pid] = { jobId: job.id, shared, startedMs: Date.now(), consent: false, note: '' };
  return { nav: { to: `/c/jobs/${job.id}`, label: job.title } };
});
registerOp('tb.apply.set', (w, a, actor) => {
  const ap = tb(w).applying[actor.personId!]; if (!ap) return;
  if (a.toggle) ap.shared = ap.shared.includes(String(a.toggle)) ? ap.shared.filter((x) => x !== a.toggle) : [...ap.shared, String(a.toggle)];
  if (a.consent !== undefined) ap.consent = !!a.consent;
  if (a.note !== undefined) ap.note = String(a.note);
});
registerOp('tb.apply.cancel', (w, _a, actor) => { tb(w).applying[actor.personId!] = null; return { say: 'Stopped. Nothing was sent.' }; });
function submitApplication(w: World, actor: Actor) {
  const pid = actor.personId!; const ap = tb(w).applying[pid]; if (!ap) return { say: 'There’s no application in progress.' };
  const job = w.jobs.find((j) => j.id === ap.jobId)!;
  if (job.status === 'CLOSED') { ap.blocked = 'closed'; return { say: `Not sent. ${orgName(w, job.orgId)} closed this listing while you were applying. Nothing went to them, and your choices are kept in case it reopens.` }; }
  if (!ap.consent) return { say: 'Tick the box to confirm what this employer will see, then submit.' };
  const items = ap.shared.map((id) => evById(w, id)).filter((e): e is Evidence => !!e && !e.confidential);
  for (const e of items) share(w, e, job.orgId);
  const id = uid('a');
  w.applications.push({ id, jobId: job.id, personId: pid, status: 'SUBMITTED', shared: items.map((e) => e.evidenceId), timeline: [{ at: simNow(w).toISOString().slice(0, 10), text: 'You applied', by: 'YOU' }] });
  tb(w).applying[pid] = null;
  emit(w, actor.id, 'application.submitted', `SHARED:${job.orgId}:${pid}`, `${actor.name} applied for ${job.title} and shared ${items.length} Passport items (simulated).`);
  return { say: `Sent (simulated) to ${orgName(w, job.orgId)}, with ${items.length} items from your Passport. I can’t promise a reply or a decision; I’ll show you exactly what happens, including nothing.`, nav: { to: '/c/applications', label: 'your applications' } };
}
registerOp('tb.apply.submit', (w, _a, actor) => submitApplication(w, actor));
// Submitting through Q's approval chip is the person's explicit consent to share the listed items.
registerOp('tb.apply.submitq', (w, _a, actor) => { const ap = tb(w).applying[actor.personId!]; if (ap) ap.consent = true; return submitApplication(w, actor); });

// ---------------- Advice the person declined (remembered, not repeated) ----------------
export interface Advice { key: string; text: string }
export function adviceFor(w: World, pid: string, job: Job): Advice[] {
  const m = matchFor(w, pid, job); const gap = m.find((x) => x.state === 'NONE');
  const out: Advice[] = [
    { key: 'cover_note', text: `Add a two-line cover note linking your best item to ${gap?.need ?? job.needs[0]}.` },
    { key: 'numbers', text: 'Put before-and-after numbers in your strongest item. Reviewers trust numbers they can check.' },
    gap ? { key: 'gap', text: `${gap.need} isn’t shown yet. If you’ve done it, add one piece of proof, or be ready to talk about it.` } : { key: 'gap', text: 'Every need is shown. Make sure the most recent item is first.' },
    { key: 'follow_up', text: `If there’s no reply in ${tb(w).noReplyDays} days, a short, polite follow-up is fine.` },
  ];
  const no = tb(w).declined[pid] ?? [];
  return out.filter((x) => !no.includes(x.key));
}
registerOp('tb.advice.decline', (w, a, actor) => {
  const pid = actor.personId!; const key = String(a.key);
  tb(w).declined[pid] = [...new Set([...(tb(w).declined[pid] ?? []), key])];
  const label = String(a.label ?? key);
  tb(w).memories.push({ id: uid('cm'), personId: pid, key: `q.advice.declined.${key}`, text: `Don’t suggest ${label} again.`, source: `Your message, ${fmtDate(simNow(w).toISOString())}`, at: now(), usedFor: 'Leaving that advice out of everything Q suggests.', sharedWith: [], state: 'ACTIVE', tags: [key, 'advice', ...label.split(' ')] });
  emit(w, actor.id, 'q.advice.declined', PSCOPE(pid), `You asked Q not to suggest ${label}.`);
});

// ---------------- Notifications ----------------
registerOp('tb.notify', (w, a, actor) => {
  const pid = actor.personId!; const c = w.consents[pid];
  const before = { ...c.notifications };
  w.consents[pid] = { ...c, notifications: { ...c.notifications, ...(a.patch as Partial<typeof c.notifications>) } };
  emit(w, actor.id, 'settings.changed', PSCOPE(pid), 'Notification settings changed (through Q).');
  if (!a.silent) pushUndo(w, actor.id, 'notification change', 'tb.notify', { patch: before, silent: true });
});

// ---------------- Candidate memory and deletion ----------------
export const memoriesOf = (w: World, pid: string) => tb(w).memories.filter((m) => m.personId === pid);
export function findMemories(w: World, pid: string, norm: string): CandMemory[] {
  return memoriesOf(w, pid).filter((m) => m.state === 'ACTIVE' && m.tags.some((t) => norm.includes(t.toLowerCase())));
}
export function deletionPlan(w: World, pid: string, ms: CandMemory[]) {
  const apps = w.applications.filter((a) => a.personId === pid && a.status !== 'DRAFT');
  const deleted = ms.map((m) => `“${m.text}” (from ${m.source.toLowerCase()})`);
  deleted.push('Every place Q used it: it won’t shape suggestions, matches or drafts any more');
  const kept = ['A deletion record: the date and the kind of item, with no content. It’s kept so you can prove this was deleted, and it can’t be removed'];
  if (apps.length) kept.push(`${apps.length} application${apps.length === 1 ? '' : 's'} you already sent. Those employers hold their own copies; none of them included this`);
  kept.push('Messages you already sent');
  const neverShared = ms.every((m) => m.sharedWith.length === 0);
  return { deleted, kept, neverShared };
}
registerOp('tb.forget', (w, a, actor) => {
  const pid = actor.personId!; const ids = (a.ids as string[]) ?? [];
  const ms = memoriesOf(w, pid).filter((m) => ids.includes(m.id) && m.state === 'ACTIVE');
  if (!ms.length) return { say: 'That’s already gone.' };
  const plan = deletionPlan(w, pid, ms);
  for (const m of ms) { if (m.key.startsWith('q.advice.declined.')) tb(w).declined[pid] = (tb(w).declined[pid] ?? []).filter((k) => `q.advice.declined.${k}` !== m.key); m.state = 'DELETED'; m.text = ''; m.tags = []; m.source = ''; }
  tb(w).deletions.push({ id: uid('del'), personId: pid, at: now(), what: String(a.what ?? 'a remembered item'), deleted: plan.deleted.map((x) => x.replace(/“.*”/, '“…”')), kept: plan.kept, neverShared: plan.neverShared });
  emit(w, actor.id, 'memory.deleted', PSCOPE(pid), `${ms.length} remembered ${ms.length === 1 ? 'item was' : 'items were'} deleted at your request (content not kept).`);
  return { say: `Deleted. I no longer know that, and it wasn’t ever shared with an employer (0 disclosures in your sharing log). The receipt is in What Q remembers.`, nav: { to: '/c/memory', label: 'what Q remembers' } };
});

// ---------------- Ticker: uploads progress, checks resolve, a listing closes mid-application ----------------
function tick() {
  const w = getWorld(); const s = tb(w); if (!s || w.network === 'offline') return;
  const t = Date.now();
  const busy = s.uploads.some((u) => u.state === 'UPLOADING') || s.checks.some((c) => c.state === 'RUNNING' && t - c.startedMs > 1600)
    || Object.values(s.applying).some((ap) => ap && !ap.blocked && s.closesOnApply.includes(ap.jobId) && t - ap.startedMs > 2500 && w.jobs.find((j) => j.id === ap.jobId)?.status === 'OPEN');
  if (!busy) return;
  update((d) => {
    const x = tb(d);
    for (const u of x.uploads.filter((u) => u.state === 'UPLOADING')) {
      u.progress = Math.min(100, u.progress + 10);
      if (u.failAt && u.attempt === 1 && u.progress >= u.failAt) { u.progress = u.failAt; u.state = 'FAILED'; u.error = `The connection dropped at ${u.failAt}%. Nothing is lost: retrying carries on from ${u.failAt}%.`; appendQ(d, u.personId, { who: 'q', kind: 'notice', engine: 'rules', text: `Uploading “${u.name}” stopped at ${u.failAt}% because the connection dropped. Nothing is lost.`, actions: [{ label: `Retry from ${u.failAt}%`, primary: true, act: { t: 'do', op: 'tb.upload.retry', args: { id: u.id } } }] }); }
      else if (u.progress >= 100) finishUpload(d, u);
    }
    for (const c of x.checks.filter((c) => c.state === 'RUNNING' && t - c.startedMs > 1600)) resolveCheck(d, c);
    for (const [pid, ap] of Object.entries(x.applying)) {
      if (!ap || ap.blocked || !x.closesOnApply.includes(ap.jobId) || t - ap.startedMs <= 2500) continue;
      const job = d.jobs.find((j) => j.id === ap.jobId); if (!job || job.status !== 'OPEN') continue;
      job.status = 'CLOSED'; ap.blocked = 'closed';
      emit(d, job.orgId, 'job.closed', 'PUBLIC', `${orgName(d, job.orgId)} closed the listing “${job.title}”.`);
      appendQ(d, pid, { who: 'q', kind: 'notice', engine: 'rules', text: `Heads up: ${orgName(d, job.orgId)} closed “${job.title}” while you were applying. Nothing was sent, and your choices are kept. It isn’t about you; employers close listings when they have enough applicants or the role changes.`,
        actions: [{ label: 'Show similar open jobs', primary: true, act: { t: 'say', text: 'show me similar jobs that are still open' } }, { label: 'Keep my draft', act: { t: 'say', text: 'keep it' } }] });
    }
  });
}
if (typeof window !== 'undefined') { const g = window as unknown as { __tbTick?: number }; if (!g.__tbTick) g.__tbTick = window.setInterval(tick, 250); }

export const actorPid = (a: Actor) => a.personId ?? a.id;
