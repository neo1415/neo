// talent-b Q skills (T3 Tobi, T5 Zara). Everything the pages do is reachable by typing to Q in imperfect
// language: uploads, checks, sharing and revoking per organisation, confidential work, Q's summary and its
// correction, discovery, interview prep, jobs and employer signals, matches and challenges, applying,
// honest status, follow-ups, declined advice, notifications, memory and deletion.
import type { Evidence } from '@contracts';
import { registerOp, registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import type { Job, QAction } from '../../state/domain';
import { emit, simNow, uid, now, visibleEvidence, type World } from '../../mock/world';
import {
  APP_LABEL, NEED_LABEL, VER, adviceFor, appExplain, cellOf, deletionPlan, discoveryOf, evById, findMemories, fitLine, followupText, isCode, matchFor,
  memoriesOf, myEvidence, orgName, ensureRedacted, signalsOf, startCheck, startUpload, summaryFor, tb, verOf, verifiedEmployer, viewerOrgs, defaultName, PSCOPE, fmtDate,
} from '../../journeys/talent-b/logic';
import type { UploadKind } from '../../state/areas/talent-b';

const cand = (c: QCtx) => c.actor.side === 'candidate' && !!c.actor.personId;
const pidOf = (c: QCtx) => c.actor.personId!;
const reply = (text: string, extra: Partial<QReply['msgs'][number]> = {}): QReply['msgs'][number] => ({ kind: 'reply', text, ...extra });

// ---------- entity helpers ----------
const ORG_KW: [RegExp, string][] = [[/\bkora\b|\bkorapay\b/, 'org_kora'], [/talent ?bri?dge|talentbrige|\bthe agency\b|\bagency\b/, 'org_tb'], [/med ?link/, 'org_medlink'], [/\brivers?\b/, 'org_rivers'], [/harbou?r/, 'org_harbour'], [/\btinda\b/, 'org_tinda']];
export const orgIn = (norm: string) => ORG_KW.find(([re]) => re.test(norm))?.[1];
const EV_KW: [RegExp, RegExp][] = [
  [/\baws\b|amazon|solutions architect/, /aws/i], [/degree|\bbsc\b|unilag|university/, /bsc|degree/i], [/fraud|lumen|confidential|\bnda\b|rules engine/, /fraud/i],
  [/recon|ledger|settlement/, /reconcil/i], [/idempoten|library|\blib\b/, /library/i], [/worker|payout code|retry/, /worker/i], [/\btalk\b|video|conference/, /talk/i],
  [/postgres|query|partition/, /postgres/i], [/fleet|tracking|gps/, /fleet/i], [/\bcv\b/, /^CV:/],
];
function evIn(w: World, pid: string, norm: string): Evidence[] {
  const mine = myEvidence(w, pid);
  const hits = EV_KW.filter(([k]) => k.test(norm)).flatMap(([, t]) => mine.filter((e) => t.test(e.title)));
  const wantRed = /redact|summary|cleaned|anonymi/.test(norm);
  return [...new Set(hits)].filter((e) => !(/fraud/i.test(e.title)) || (wantRed ? !!e.redactedOf : !e.redactedOf));
}
const routeJob = (c: QCtx) => c.w.jobs.find((j) => j.id === c.route.match(/^\/c\/jobs\/([\w-]+)/)?.[1]);
function jobFor(c: QCtx): Job | undefined {
  const org = orgIn(c.norm); const pid = pidOf(c);
  if (org) {
    const mine = c.w.applications.filter((a) => a.personId === pid).map((a) => c.w.jobs.find((j) => j.id === a.jobId)).find((j) => j?.orgId === org);
    return mine ?? (tb(c.w).saved[pid] ?? []).map((id) => c.w.jobs.find((j) => j.id === id)).find((j) => j?.orgId === org) ?? c.w.jobs.find((j) => j.orgId === org && j.status === 'OPEN') ?? c.w.jobs.find((j) => j.orgId === org);
  }
  return routeJob(c);
}
const jobName = (w: World, j: Job) => `${orgName(w, j.orgId)}’s ${j.title}`;
const passportUsed = (w: World, pid: string) => `Your Passport · ${myEvidence(w, pid).length} items`;

// =====================================================================================================
// T3 · Evidence Passport
// =====================================================================================================

// ---------- Confidential originals are never shared (even casually); a redacted summary is offered ----------
const CONF_REFUSAL = (w: World, org?: string) => reply(`I can’t share the original “Fraud-rules engine at Lumen”${org ? ` with ${orgName(w, org)}` : ''}. You marked it confidential, under an NDA until March 2027 (you told me on 14 Oct). Even if you’re happy to, the NDA protects Lumen too, so the original stays locked for everyone, me included. What I can do: a redacted summary with names, volumes and thresholds removed, plus a former colleague who confirms it.`, {
  kind: 'refusal', used: ['Confidential mark on the item', 'What Q remembers · NDA until Mar 2027'],
  actions: [{ label: 'Make a redacted summary', primary: true, act: { t: 'say', text: 'yes make the redacted summary' } }, { label: 'See the original (only me)', act: { t: 'nav', to: '/c/passport?item=e_tobi_conf' } }],
});
function redactedReply(c: QCtx, org?: string): QReply {
  return {
    msgs: [reply(`Here’s the redacted summary, private for now: “Designed a rules engine that screens payouts for fraud before money leaves: rule versioning, a review queue, and back-testing against past fraud.” Client names, volumes and rule thresholds are removed. ${org ? `Share it with ${orgName(c.w, org)}?` : 'Who should see it?'}`, {
      kind: 'approval', ref: { type: 'tb.evidence', id: 'e_tobi_conf_red' },
      actions: [
        ...(org ? [{ label: `Share the summary with ${orgName(c.w, org)}`, primary: true, act: { t: 'do', op: 'tb.share', args: { ids: ['e_tobi_conf_red'], org } } } as QAction] : []),
        { label: 'Ask a former colleague to confirm it', act: { t: 'do', op: 'tb.attest', args: { id: 'e_tobi_conf_red' } } },
        { label: 'Open it in my Passport', act: { t: 'nav', to: '/c/passport?item=e_tobi_conf_red' } },
      ],
    })],
    effects: (w) => { ensureRedacted(w); },
    frame: { intent: 'tb.conf', slots: org ? { org, stage: 'share-redacted' } : { stage: 'share-redacted' }, startedAt: now() },
  };
}
const CASUAL_ORIGINAL = /(original|unredacted|full (version|thing|doc|document)|whole (thing|doc)|real (one|doc|version)|as it is|anyway|it is fine|its fine|i do not mind|nobody will know|trust me|they will not tell|between us|i am ok with it|no one will know)/;
registerSkill({
  id: 'tb.conf', side: 'candidate',
  match: (c) => (cand(c) && /\b(send|share|show|give|forward|attach)\b/.test(c.norm) && /(original|unredacted|uncensored|full version|the real (one|doc))/.test(c.norm) && (evIn(c.w, pidOf(c), c.norm).some((e) => e.confidential) || /fraud|lumen|confidential|nda/.test(c.norm) || c.frame?.intent === 'tb.conf') ? 0.95 : 0),
  handle: (c) => ({ msgs: [CONF_REFUSAL(c.w, orgIn(c.norm) ?? c.frame?.slots.org)], frame: { intent: 'tb.conf', slots: { org: orgIn(c.norm) ?? c.frame?.slots.org ?? '' }, awaiting: 'redact', startedAt: now() } }),
  answer: (c) => {
    if (c.frame?.topic === 'suspended' && !/original|redact|summary|fraud|lumen|confidential/.test(c.norm)) return null;
    const org = orgIn(c.norm) ?? c.frame?.slots.org ?? undefined;
    if (/\b(send|share|give|forward)\b/.test(c.norm) && CASUAL_ORIGINAL.test(c.norm) && !/summary|redact/.test(c.norm)) return { msgs: [reply('I understand it’s frustrating, but I still won’t share the original. This isn’t a judgement of you: the confidential mark locks it for everyone. If the NDA has actually ended, you can remove the mark yourself on the item in your Passport, and I’ll note when and why. Until then, the redacted summary is the safe way to show this work.', { kind: 'refusal', actions: [{ label: 'Make the redacted summary', primary: true, act: { t: 'say', text: 'ok make the redacted summary' } }] })] };
    if (/redact|summary|yes|yeah|ok|sure|do that|go ahead|please/.test(c.norm) && !/\bno\b/.test(c.norm)) {
      if (c.frame?.slots.stage === 'share-redacted' && org && /share|send|yes|ok|go ahead/.test(c.norm)) return { msgs: [reply(`Shared the redacted summary with ${orgName(c.w, org)}. The original stays private.`)], effects: (w, a) => { const e = evById(w, 'e_tobi_conf_red'); if (e) { e.visibility = 'SHARED_WITH'; if (!e.sharedWith.includes(org)) e.sharedWith.push(org); e.revokedFrom = (e.revokedFrom ?? []).filter((x) => x !== org); emit(w, a.id, 'passport.shared', `SHARED:${org}:${a.personId}`, `${a.name} shared 1 Passport item with ${orgName(w, org)}.`); } }, frame: null };
      return redactedReply(c, org || undefined);
    }
    return null;
  },
});
registerSkill({
  id: 'tb.redact', side: 'candidate',
  match: (c) => (cand(c) && /redact|anonymi[sz]e|blank out|hide the (names|numbers)|cleaned up version|safe version/.test(c.norm) ? 0.9 : 0),
  handle: (c) => redactedReply(c, orgIn(c.norm)),
});

// ---------- Share with one organisation (approval) ----------
const REVOKE_RE = /\b(stop|revoke|remove|take away|take back|end|cut off|block|unshare|no longer|withdraw|hide)\b/;
registerSkill({
  id: 'tb.share', side: 'candidate',
  match: (c) => {
    if (!cand(c) || REVOKE_RE.test(c.norm) || !/\b(share|send|show|give|let)\b/.test(c.norm) || /what (does|do|can|would)|sees\b|view as|preview/.test(c.norm)) return 0;
    if (/(original|unredacted)/.test(c.norm)) return 0;
    return orgIn(c.norm) && (evIn(c.w, pidOf(c), c.norm).length || /\b(code|work|portfolio|passport|everything|project|certificate|cert)\b/.test(c.norm)) ? 0.88 : 0;
  },
  handle: (c) => {
    const pid = pidOf(c); const org = orgIn(c.norm)!;
    let items = evIn(c.w, pid, c.norm);
    if (!items.length) items = myEvidence(c.w, pid).filter((e) => e.kind !== 'CLAIM' && !e.confidential && (!/code/.test(c.norm) || isCode(e)) && ['NONE', 'REVOKED'].includes(cellOf(c.w, e, org)));
    if (items.some((e) => e.confidential)) return { msgs: [CONF_REFUSAL(c.w, org)], frame: { intent: 'tb.conf', slots: { org }, awaiting: 'redact', startedAt: now() } };
    const failed = items.filter((e) => verOf(e) === 'FAILED');
    if (!items.length) return { msgs: [reply(`${orgName(c.w, org)} can already see everything that matches. Want to check what they see?`, { actions: [{ label: `What ${orgName(c.w, org)} sees`, act: { t: 'nav', to: `/c/passport?as=${org}` } }] })] };
    return { msgs: [reply(`Share ${items.length === 1 ? `“${items[0].title}”` : `${items.length} items`} with ${orgName(c.w, org)}? They’ll see ${items.length === 1 ? 'it' : 'these'} with what ${items.length === 1 ? 'it shows' : 'each shows'}, ${items.length === 1 ? 'its' : 'their'} limits and check status${failed.length ? `. Note: “${failed[0].title}” shows “check failed” right now` : ''}. Nothing else changes, and you can end access any time.`, {
      kind: 'approval', used: [passportUsed(c.w, pid), 'Sharing settings'],
      actions: [{ label: `Share with ${orgName(c.w, org)}`, primary: true, act: { t: 'do', op: 'tb.share', args: { ids: items.map((e) => e.evidenceId), org } } }, { label: `Preview what ${orgName(c.w, org)} sees`, act: { t: 'nav', to: `/c/passport?as=${org}` } }, { label: 'Not now', act: { t: 'say', text: 'keep it' } }],
    })] };
  },
});

// ---------- Revoke one organisation's access ("stop Talentbridge seeing my code") ----------
registerSkill({
  id: 'tb.revoke', side: 'candidate',
  match: (c) => (cand(c) && REVOKE_RE.test(c.norm) && orgIn(c.norm) && !/\b(find|search|discover)\b/.test(c.norm) && !/application|applying/.test(c.norm)
    && (evIn(c.w, pidOf(c), c.norm).length || /\b(code|work|portfolio|passport|everything|access|seeing|see|items?|stuff|repo)\b/.test(c.norm)) ? 0.92 : 0),
  handle: (c) => {
    const pid = pidOf(c); const org = orgIn(c.norm)!;
    const visible = myEvidence(c.w, pid).filter((e) => ['SHARED', 'PUBLIC'].includes(cellOf(c.w, e, org)));
    const named = evIn(c.w, pid, c.norm);
    const items = /\bcode|repo/.test(c.norm) ? visible.filter(isCode) : named.length ? named.filter((e) => visible.includes(e)) : visible;
    if (!items.length) return { msgs: [reply(`${orgName(c.w, org)} can’t see ${/code/.test(c.norm) ? 'any of your code' : 'that'} right now, so there’s nothing to end.`, { actions: [{ label: `What ${orgName(c.w, org)} sees`, act: { t: 'nav', to: `/c/passport?as=${org}` } }] })] };
    const others = viewerOrgs(c.w, pid).filter((o) => o !== org).map((o) => orgName(c.w, o));
    return { msgs: [reply(`${orgName(c.w, org)} will lose access to ${items.map((e) => `“${e.title}”${e.visibility === 'PUBLIC_PROFILE' ? ' (public on your profile: I’ll hide it from them only)' : ''}`).join(' and ')}. ${others.join(' and ')} keep${others.length === 1 ? 's' : ''} what they have. ${orgName(c.w, org)} is told only that access ended, not why, and their view updates straight away.`, {
      kind: 'approval', used: ['Sharing settings', passportUsed(c.w, pid)],
      actions: [{ label: `End ${orgName(c.w, org)}’s access`, primary: true, act: { t: 'do', op: 'tb.revoke', args: { ids: items.map((e) => e.evidenceId), org } } }, { label: `Preview ${orgName(c.w, org)}’s view`, act: { t: 'nav', to: `/c/passport?as=${org}` } }, { label: 'Keep it', act: { t: 'say', text: 'keep it' } }],
    })] };
  },
});

// ---------- "What does Kora see?" ----------
registerSkill({
  id: 'tb.viewas', side: 'candidate',
  match: (c) => (cand(c) && orgIn(c.norm) && /(what|how much|which|everything).*(see|sees|seeing|view|visible)|view as|preview|through .* eyes|as \w+ sees/.test(c.norm) && !REVOKE_RE.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const pid = pidOf(c); const org = orgIn(c.norm)!;
    const vis = visibleEvidence(c.w, pid, org); // the same rule the recruiter pages and the Passport preview read
    const total = myEvidence(c.w, pid).length;
    return { msgs: [reply(`${orgName(c.w, org)} sees ${vis.length} of your ${total} items${vis.length ? `: ${vis.map((e) => e.title).join('; ')}` : ''}. Nothing else, and never your practice or anything confidential. The page now shows exactly their view.`, { used: ['Sharing settings'] })], nav: { to: `/c/passport?as=${org}`, label: `what ${orgName(c.w, org)} sees` } };
  },
});

// ---------- Uploads ----------
registerSkill({
  id: 'tb.upload', side: 'candidate',
  match: (c) => (cand(c) && /\b(upload|uplaod|uplod|upoad|upload\w*|add|attach|put|drop)\b/.test(c.norm) && /\b(cv|certificate|cert|certs|work sample|sample|portfolio|link|github|repo|file|document|pdf|project)\b/.test(c.norm) && !/\b(share|send)\b.*\b(with|to)\b/.test(c.norm) && !/\b(review|assess|reassess|submit)\b/.test(c.norm)
    ? (c.route.startsWith('/c/passport') || /\b(cv|cert|certificate|link|github|pdf|file|zip|doc|passport)\b/.test(c.norm) ? 0.9 : 0.86) : 0),
  handle: (c) => {
    const n = c.norm; const pid = pidOf(c);
    const kind: UploadKind = /\bcv\b/.test(n) ? 'CV' : /certificate|cert\b|certs/.test(n) ? 'CERTIFICATE' : /link|github|repo|http|url|www/.test(n) ? 'LINK' : 'WORK_SAMPLE';
    const url = c.text.match(/https?:\/\/\S+|github\.com\/\S+/)?.[0];
    const name = kind === 'LINK' ? (url ?? defaultName('LINK', c.actor.first)) : kind === 'CERTIFICATE' ? (/aws|amazon/.test(n) ? (/official|from aws|account/.test(n) ? 'AWS-certificate-official.pdf' : 'AWS-certificate.pdf') : /kubernetes|cka/.test(n) ? 'CKA-certificate.pdf' : 'certificate.pdf') : kind === 'CV' ? defaultName('CV', c.actor.first) : (/design|doc/.test(n) ? 'system-design-doc.pdf' : 'payments-work-sample.zip');
    const fail = kind === 'WORK_SAMPLE' && !tb(c.w).uploads.some((u) => u.personId === pid && u.kind === 'WORK_SAMPLE');
    return { msgs: [reply(`Uploading “${name}” to your Passport (simulated). It stays private until you share it. You can keep talking to me while it goes.`, { ref: { type: 'tb.uploads', id: pid } })],
      effects: (w) => { startUpload(w, pid, kind, name, fail); }, nav: c.route.startsWith('/c/passport') ? undefined : { to: '/c/passport', label: 'your Evidence Passport' } };
  },
});
registerSkill({
  id: 'tb.upload.retry', side: 'candidate',
  match: (c) => (cand(c) && /\b(retry|try again|resume|carry on|continue|again)\b/.test(c.norm) && tb(c.w).uploads.some((u) => u.personId === pidOf(c) && u.state === 'FAILED') && (/upl(o|a)\w*d/.test(c.norm) || /upload/i.test(c.lastQ?.text ?? '')) ? 0.9 : 0),
  handle: (c) => {
    const u = [...tb(c.w).uploads].reverse().find((x) => x.personId === pidOf(c) && x.state === 'FAILED')!;
    return { msgs: [reply(`Retrying “${u.name}” from ${u.progress}%.`, { ref: { type: 'tb.uploads', id: pidOf(c) } })], effects: (w) => { const x = tb(w).uploads.find((y) => y.id === u.id)!; x.state = 'UPLOADING'; x.attempt += 1; x.error = undefined; x.failAt = undefined; } };
  },
});

// ---------- Verification status, retry, and what to do after a failure ----------
const CERT_RE = /\b(aws|amazon|cert|certs|certificate|certification|degree|bsc|credential|repo|fleet api)\b/;
registerSkill({
  id: 'tb.verify', side: 'candidate',
  match: (c) => (cand(c) && (CERT_RE.test(c.norm) || /\b(it|that)\b/.test(c.norm) && /verif|check/.test(c.lastQ?.text.toLowerCase() ?? '')) && /(verif|check|status|happening|pending|fail|failed|wrong|update|what do i do|now what|next|fix|try again|again|confirm|stuck|why)/.test(c.norm) && !/\b(upload|attach)\b/.test(c.norm) && !/\b(share|send)\b.*\b(with|to)\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const pid = pidOf(c);
    let e = evIn(c.w, pid, c.norm)[0];
    if (!e) e = myEvidence(c.w, pid).find((x) => verOf(x) === 'FAILED') ?? myEvidence(c.w, pid).find((x) => verOf(x) === 'PENDING') ?? myEvidence(c.w, pid).find((x) => x.kind === 'CREDENTIAL')!;
    if (!e) return { msgs: [reply('You don’t have a certificate in your Passport yet. You can upload one and I’ll ask the issuer to confirm it.', { actions: [{ label: 'Upload a certificate', act: { t: 'say', text: 'upload a certificate' } }] })] };
    const v = verOf(e); const last = [...tb(c.w).checks].reverse().find((x) => x.evidenceId === e.evidenceId);
    const again = /again|re-?check|retry|check (it|now)|recheck|try/.test(c.norm) && !/what do i do|now what|next/.test(c.norm);
    if (again && v !== 'VERIFIED') return { msgs: [reply(`Asking the issuer again about “${e.title}” (simulated).`, { ref: { type: 'tb.evidence', id: e.evidenceId } })], effects: (w) => startCheck(w, e.evidenceId, pid) };
    if (v === 'FAILED') return { msgs: [reply(`“${e.title}”: the issuer answered but couldn’t confirm it. That usually means a mistyped validation number or an expired certificate; it doesn’t mean anyone thinks it’s fake. It isn’t shared with anyone${e.sharedWith.length ? ' except ' + e.sharedWith.map((o) => orgName(c.w, o)).join(', ') : ''}. You can: upload the official PDF from your AWS Certification account (it carries the right number); ask for a manual review, where a person compares your upload with the issuer’s records; or leave it unshared until it’s sorted. Your other proof still counts.`, {
      used: [`Check history · ${tb(c.w).checks.filter((x) => x.evidenceId === e.evidenceId).length} attempts`], why: VER.FAILED.plain,
      actions: [{ label: 'Upload the official PDF', primary: true, act: { t: 'say', text: 'upload the official aws certificate pdf from my aws account' } }, { label: 'Ask for a manual review', act: { t: 'do', op: 'tb.verify.review', args: { id: e.evidenceId } } }, { label: 'Leave it for now', act: { t: 'do', op: 'tb.verify.ack', args: { id: e.evidenceId } } }],
    })], effects: (w) => { if (!tb(w).ackFailed.includes(e.evidenceId)) tb(w).ackFailed.push(e.evidenceId); } };
    const lastLine = last ? ` Last check: ${last.outcome === 'UNREACHABLE' ? 'the issuer didn’t answer' : last.outcome?.toLowerCase() ?? 'running now'}.` : '';
    return { msgs: [reply(`“${e.title}” is ${VER[v].label.toLowerCase()}. ${VER[v].plain}${lastLine}`, { ref: { type: 'tb.evidence', id: e.evidenceId },
      actions: v === 'VERIFIED' ? [] : [{ label: 'Check again now', primary: true, act: { t: 'do', op: 'tb.verify', args: { id: e.evidenceId } } }, { label: 'Open in my Passport', act: { t: 'nav', to: `/c/passport?item=${e.evidenceId}` } }] })] };
  },
});

// ---------- Q's summary of the person, and correcting it ----------
registerSkill({
  id: 'tb.summary', side: 'candidate',
  match: (c) => (cand(c) && /(describe me|summary of me|summari[sz]e me|your summary|what do you think of me|what do you (say|tell) (about|employers about) me|how do i come across|how do you see me|sum me up|your analysis of me|what you think i am)/.test(c.norm) ? 0.87 : 0),
  handle: (c) => {
    const lines = summaryFor(c.w, pidOf(c));
    return { msgs: [reply(`Here’s how I’d describe you: ${lines.map((l) => l.text).join('; ')}. Each line below is based on what your Passport shows or what you told me. If any of it is wrong, tell me in your own words.`, { ref: { type: 'tb.summary', id: pidOf(c) }, used: [passportUsed(c.w, pidOf(c))], why: 'I only describe what your Passport shows or what you’ve told me; I never guess.' })],
      frame: { intent: 'tb.summary', slots: {}, startedAt: now() } };
  },
  answer: (c) => (c.frame?.topic !== 'suspended' && (CHALLENGE.test(c.norm) || /\b(i led|i lead|i managed|i manage|i ran|team of|i write go|years)\b/.test(c.norm)) ? correctSummary(c) : null),
});
const CHALLENGE = /(wrong|not true|incorrect|not fair|unfair|not right|disagree|that is not|you are missing|you missed|not accurate|inaccurate|rubbish|nonsense|actually)/;
function correctSummary(c: QCtx): QReply {
  const n = c.norm; const lines = summaryFor(c.w, pidOf(c));
  const topic = /\b(led|lead|leading|manage|managed|manager|team|mentor)/.test(n) ? 'lead' : /\b(go|golang)\b/.test(n) ? 'go' : /\byears?\b|\byrs\b/.test(n) ? 'role' : /payment|payout/.test(n) ? 'payments' : '';
  if (!topic) return { msgs: [reply('Which part is wrong? Tell me what’s true and I’ll change it.', { kind: 'question', actions: lines.map((l) => ({ label: `“${l.text.slice(0, 40)}${l.text.length > 40 ? '…' : ''}”`, act: { t: 'say', text: `the part about ${l.topic === 'lead' ? 'leading a team' : l.topic} is wrong` } as const })) })], frame: { intent: 'tb.summary', slots: {}, startedAt: now() } };
  const line = lines.find((l) => l.topic === topic);
  const num = (re: RegExp) => n.match(re)?.[1];
  const team = num(/team of (\d+)/) ?? num(/(\d+) (people|engineers|devs|developers)/); const yrs = num(/(\d+) (years|yrs|year)/); const at = c.text.match(/\bat ([A-Z][\w]+)/)?.[1] ?? (/lumen/.test(n) ? 'Lumen' : '');
  const said = topic === 'lead' ? `Led a team${team ? ` of ${team}` : ''}${at ? ` at ${at}` : ''}${yrs ? ` for ${yrs} years` : ''} (you told me; no proof shared yet)`
    : topic === 'go' ? 'Writes Go every day (you told me), backed by a library and a payout worker in your Passport'
    : topic === 'role' && yrs ? `${(line?.text ?? '').replace(/\d+ yrs?|\d+ years?/, `${yrs} yrs`)}${/\d+ (yrs?|years?)/.test(line?.text ?? '') ? '' : ` · ${yrs} yrs`} (you corrected this)`
    : `${line?.text ?? ''} (you disagreed; tell me what’s true)`;
  if (!line) return { msgs: [reply('I don’t say anything about that yet. Tell me what you’d like it to say.')] };
  return {
    msgs: [reply(`You’re right to push back. I said “${line.text}” because of this: ${line.basis}. I only go on what your Passport shows, so I missed it. I’ve changed it to: “${said}”. It’s marked as something you told me, so employers can tell it apart from checked proof.`, {
      used: ['Your summary', passportUsed(c.w, pidOf(c))],
      actions: [{ label: 'See my summary', act: { t: 'nav', to: '/c/passport?tab=summary' } }, ...(topic === 'lead' ? [{ label: 'Add proof of leading', act: { t: 'say', text: 'upload a work sample about leading the payouts team' } } as QAction] : []), { label: 'Undo that change', act: { t: 'do', op: 'tb.summary.undo', args: { topic } } }],
    })],
    effects: (w, a) => { (tb(w).corrections[a.personId!] ??= []).push({ at: simNow(w).toISOString(), topic, said, before: line.text }); emit(w, a.id, 'q.summary.corrected', PSCOPE(a.personId!), `You corrected Q’s summary (${topic}).`); },
    frame: null,
  };
}
registerOp('tb.summary.undo', (w, a, actor) => { const l = tb(w).corrections[actor.personId!] ?? []; const i = l.map((x) => x.topic).lastIndexOf(String(a.topic)); if (i >= 0) l.splice(i, 1); return { say: 'Put back as it was.' }; });
registerSkill({
  id: 'tb.summary.challenge', side: 'candidate',
  match: (c) => (cand(c) && CHALLENGE.test(c.norm) && /(you said|summary|describe|no evidence|leading|led|lead|team|golang|\bgo\b|some go|years)/.test(c.norm) && !orgIn(c.norm) && !/match/.test(c.norm) ? 0.86 : 0),
  handle: (c) => correctSummary(c),
});

// ---------- Discovery: who can find me ----------
registerSkill({
  id: 'tb.discovery', side: 'candidate',
  match: (c) => (cand(c) && (/(who can (find|see|search)|find(ing)? me|search(ing)? for me|discover|visible to (recruiters|employers|agencies)|hide (me|my profile)|headhunt|recruiters (can )?(find|contact|message)|agencies (can )?(find|contact))/.test(c.norm)) && !/\bjobs?\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const n = c.norm; const pid = pidOf(c); const d = discoveryOf(c.w, pid);
    const restrictAgencies = /(agenc|talentbridge|headhunt)/.test(n) && /(stop|no|not|never|hide|block|do not|only)/.test(n);
    const nobody = /(nobody|no one|everyone|all recruiters|hide me|hide my profile|stop (all )?recruiters|invisible|not be found|do not want to be found)/.test(n) && !restrictAgencies;
    const widen = /(let|allow).*(agenc|everyone|anyone)/.test(n) && !/not|stop/.test(n);
    const employer = n.match(/hide (me )?from (\w+)/)?.[2] ?? (/my (current )?(employer|boss|company|job)|fleetline/.test(n) ? 'fleetline' : '');
    if (employer && !orgIn(n)) return { msgs: [reply(`${employer === 'fleetline' || /employer|boss|company|job/.test(employer) ? 'Fleetline' : employer} isn’t on Talent Q, so they can’t search for you here. If they ever join, you’ll be hidden from them automatically: I’ve noted it.`, { used: ['Discovery settings'] })], effects: (w) => { const x = discoveryOf(w, pid); tb(w).discovery[pid] = { ...x, hideFrom: [...new Set([...x.hideFrom, 'org_fleetline'])] }; } };
    if (widen) return { msgs: [reply('Let verified employers and agencies find you in search? They see only your headline, city and public items until you share more.', { kind: 'approval', actions: [{ label: 'Yes, include agencies', primary: true, act: { t: 'do', op: 'tb.discovery', args: { who: 'EMPLOYERS_AND_AGENCIES' } } }, { label: 'Keep employers only', act: { t: 'say', text: 'keep it' } }] })] };
    if (nobody || restrictAgencies) { const who = nobody ? 'NOBODY' : 'VERIFIED_EMPLOYERS';
      return { msgs: [reply(who === 'NOBODY' ? 'Done: no recruiter can find you in search now. You can still apply, and anyone you’ve already shared with keeps exactly what you shared (you can end that separately).' : 'Done: only verified employers can find you now; agencies, including Talentbridge, can’t. Anything you already shared with an agency is unchanged.', { used: ['Discovery settings'], actions: [{ label: 'Undo', act: { t: 'do', op: 'tb.discovery', args: { who: d.who } } }, { label: 'See discovery settings', act: { t: 'nav', to: '/c/passport?tab=discovery' } }] })],
        effects: (w, a) => { const x = discoveryOf(w, pid); tb(w).discovery[pid] = { ...x, who }; w.consents[pid] = { ...w.consents[pid], discoverable: who !== 'NOBODY' }; emit(w, a.id, 'settings.discovery', PSCOPE(pid), `Discovery: ${who.toLowerCase().replace(/_/g, ' ')}.`); } }; }
    const label = !c.w.consents[pid]?.discoverable || d.who === 'NOBODY' ? 'Nobody can find you in search right now.' : d.who === 'VERIFIED_EMPLOYERS' ? 'Only verified employers can find you in search; agencies can’t.' : 'Verified employers and agencies can find you in search.';
    return { msgs: [reply(`${label} When they find you, they see your headline, city and public items only. Everything else is per organisation, and you choose.`, { used: ['Discovery settings'], actions: [{ label: 'Change it', act: { t: 'nav', to: '/c/passport?tab=discovery' } }] })] };
  },
});

// ---------- Interview prep ----------
registerSkill({
  id: 'tb.prep', side: 'candidate',
  match: (c) => (cand(c) && /(prep|prepare|ready|get ready|practi[sc]e for|nervous about|tips for).*(interview)|interview (prep|tips|coming up)|my interview|upcoming interview/.test(c.norm) ? 0.87 : 0),
  handle: (c) => {
    const pid = pidOf(c); const t = simNow(c.w).getTime();
    const ev = c.w.calendar.filter((e) => e.personId === pid && e.status !== 'CANCELLED' && new Date(e.start).getTime() > t).sort((a, b) => a.start.localeCompare(b.start))[0];
    const job = ev ? c.w.jobs.find((j) => j.mandateId === ev.mandateId) : undefined;
    const text = ev && job ? `Your ${orgName(c.w, job.orgId)} interview is ${new Date(ev.start).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: c.actor.timezone })} your time. I’ve put together what they’re likely to ask about, the proof you can point to for each, and the gaps to have a story ready for. Practice with me is private and never counts as proof.`
      : 'You don’t have an interview booked yet. That isn’t a sign either way. I’ve set up prep for the roles you’ve applied to, so you’re ready if one comes.';
    return { msgs: [reply(text, { used: ev ? ['Your calendar', 'The job’s stated needs', passportUsed(c.w, pid)] : ['Your applications'] })], nav: { to: '/c/prep', label: 'interview prep' } };
  },
});

// =====================================================================================================
// T5 · Jobs, signals, matching, applying, status
// =====================================================================================================
registerSkill({
  id: 'tb.jobs', side: 'candidate',
  match: (c) => (cand(c) && /(find|show|any|look for|looking for|search|browse|recommend|similar|other|more|still open).*(jobs?|roles?|openings|vacancies|positions)|^jobs?\b|(jobs?|roles?) (for me|that fit)/.test(c.norm) && !/apply|applied|application/.test(c.norm) ? 0.8 : 0),
  handle: (c) => {
    const verified = /verified|legit|real|trust|genuine/.test(c.norm);
    const similar = /similar|like that|like it|still open|other/.test(c.norm);
    const open = c.w.jobs.filter((j) => j.status === 'OPEN' && (!verified || verifiedEmployer(c.w, j)));
    const pid = pidOf(c);
    const ranked = open.map((j) => ({ j, m: matchFor(c.w, pid, j) })).sort((a, b) => b.m.filter((x) => x.state !== 'NONE').length - a.m.filter((x) => x.state !== 'NONE').length).slice(0, 3);
    return { msgs: [reply(`${similar ? 'Still open and closest to what you’ve shown' : 'Jobs that fit what your Passport shows'}${verified ? ', verified employers only' : ''}: ${ranked.map((r) => `${jobName(c.w, r.j)} (${fitLine(r.m)})`).join('; ')}. Each one shows what the employer’s signals mean and which of your proof I matched.`, { used: [passportUsed(c.w, pid)] })],
      nav: { to: `/c/jobs${verified ? '?f=verified' : ''}`, label: 'jobs' } };
  },
});
registerSkill({
  id: 'tb.trust', side: 'candidate',
  match: (c) => (cand(c) && /(legit|scam|real company|is .* real|trust|trustworthy|genuine|fake|safe to apply|dodgy|shady|verified employer|what does verified mean|signals?|badges?)/.test(c.norm) && (orgIn(c.norm) || /job|employer|company|listing|this|they|signals?|badges?/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const job = jobFor(c) ?? c.w.jobs.find((j) => j.id === 'j_rivers_backend')!;
    const sig = signalsOf(c.w, job); const ok = verifiedEmployer(c.w, job);
    return { msgs: [reply(`${orgName(c.w, job.orgId)}: ${sig.map((s) => `${s.k}: ${s.on ? 'yes' : 'no'}`).join(' · ')}. ${ok ? 'These show the company and recruiter are real. They don’t tell you pay is fair or that you’ll hear back.' : 'Not verified doesn’t mean a scam; it means Talent Q hasn’t confirmed who they are. Don’t share anything sensitive, and don’t pay anyone to apply.'} ${job.signals.replies}.`, {
      why: 'Signals come from simulated checks on the email domain, the business registry and recent activity.', actions: [{ label: `Open ${job.title}`, act: { t: 'nav', to: `/c/jobs/${job.id}` } }, { label: 'Verified employers only', act: { t: 'nav', to: '/c/jobs?f=verified' } }] })] };
  },
});
registerSkill({
  id: 'tb.match', side: 'candidate',
  match: (c) => (cand(c) && /\b(why|how)\b.*(match|fit|suit|good for me|recommend|show(ed|n)? me)|what evidence|which evidence|which proof|based on what|what did you use/.test(c.norm) && !CHALLENGE.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const pid = pidOf(c);
    const job = jobFor(c) ?? c.w.jobs.find((j) => j.id === (c.w.applications.find((a) => a.personId === pid && a.status !== 'WITHDRAWN')?.jobId ?? 'j_kora_backend'))!;
    const m = matchFor(c.w, pid, job);
    return { msgs: [reply(`${jobName(c.w, job)}: ${fitLine(m)}. ${m.map((x) => `${x.need}: ${NEED_LABEL[x.state].toLowerCase()}${x.used.length ? ` (I used ${x.used.slice(0, 2).map((e) => e.title).join(' and ')})` : x.told ? ' (from what you told me)' : ''}`).join('; ')}. I only use what’s in your Passport. If I’ve got something wrong, say so.`, { ref: { type: 'tb.match', id: `${pid}~${job.id}` },
      used: [passportUsed(c.w, pid), `${job.title} · stated needs`], why: 'A match counts the job’s stated needs that your proof shows. It’s not a prediction of the employer’s decision.', actions: [{ label: 'Open the job', act: { t: 'nav', to: `/c/jobs/${job.id}` } }] })],
      frame: { intent: 'tb.match', slots: { jobId: job.id }, startedAt: now() } };
  },
  answer: (c) => (c.frame?.topic !== 'suspended' && (CHALLENGE.test(c.norm) || /\b(i have|i did|i built|i worked|i do|but i)\b/.test(c.norm)) ? challengeMatch(c, c.frame?.slots.jobId) : null),
});
function challengeMatch(c: QCtx, jobId?: string): QReply {
  const pid = pidOf(c);
  const job = c.w.jobs.find((j) => j.id === jobId) ?? jobFor(c) ?? c.w.jobs.find((j) => j.id === 'j_kora_backend')!;
  const m = matchFor(c.w, pid, job);
  const target = m.find((x) => (/payment|payout|money|fintech/.test(c.norm) && /payment/i.test(x.need)) || (/\bgo\b|golang/.test(c.norm) && /\bgo\b/i.test(x.need)) || (/postgres|sql|database/.test(c.norm) && /postgres|sql/i.test(x.need)) || (/logistic|fleet|delivery/.test(c.norm) && /logistic/i.test(x.need)) || (/incident|outage|on.?call/.test(c.norm) && /incident/i.test(x.need)));
  if (!target) return { msgs: [reply(`Which part is off? For ${job.title} I looked at: ${m.map((x) => x.need).join(', ')}. Tell me what I missed.`, { kind: 'question' })], frame: { intent: 'tb.match', slots: { jobId: job.id }, startedAt: now() } };
  if (target.state === 'VERIFIED' || target.state === 'SHOWN') return { msgs: [reply(`For ${target.need} I used ${target.used.map((e) => `“${e.title}”`).join(', ')}. If that overstates it, you can stop sharing that item with ${orgName(c.w, job.orgId)}, or tell me what’s more accurate.`)], frame: null };
  const said = c.text.replace(/^((no|nah|nope|that'?s|thats|that is|you'?re|ur|actually|wrong|not true|incorrect|not right|totally|so)[\s,!.]*)+/i, '').replace(/^\w/, (x) => x.toUpperCase()).trim().slice(0, 140);
  return {
    msgs: [reply(`Fair challenge. I had ${target.need} as “not shown” because nothing in your Passport mentions it; I don’t read your CV lines as proof. I’ve changed it to “you told me”, using your words: “${said}”. ${orgName(c.w, job.orgId)} would see that as your statement, not checked proof. One piece of proof would make it count fully.`, {
      used: [passportUsed(c.w, pid)], actions: [{ label: 'Add proof now', primary: true, act: { t: 'say', text: 'upload a work sample about payments' } }, { label: 'See the updated match', act: { t: 'nav', to: `/c/jobs/${job.id}` } }] })],
    effects: (w, a) => { (tb(w).told[a.personId!] ??= []).push({ need: target.need, said, at: simNow(w).toISOString() }); emit(w, a.id, 'q.match.corrected', PSCOPE(a.personId!), `You corrected a match: ${target.need}.`); },
    frame: null,
  };
}
registerSkill({
  id: 'tb.match.challenge', side: 'candidate',
  match: (c) => (cand(c) && CHALLENGE.test(c.norm) && /(match|fit|you said i|not shown|you missed|i have done|i have worked)/.test(c.norm) ? 0.88 : 0),
  handle: (c) => challengeMatch(c, routeJob(c)?.id),
});

registerSkill({
  id: 'tb.save', side: 'candidate',
  match: (c) => (cand(c) && /\b(save|bookmark|keep an eye on|watch)\b/.test(c.norm) && (orgIn(c.norm) || routeJob(c)) && /job|role|this|listing|it/.test(c.norm) ? 0.85 : 0),
  handle: (c) => { const job = jobFor(c)!; return { msgs: [reply(`Saved ${jobName(c.w, job)}. I’ll tell you if it closes.`)], effects: (w, a) => { const s = (tb(w).saved[a.personId!] ??= []); if (!s.includes(job.id)) s.push(job.id); } }; },
});

registerSkill({
  id: 'tb.apply', side: 'candidate',
  match: (c) => (cand(c) && (/\b(apply|put in an application|send my application|submit)\b/.test(c.norm) || (!!tb(c.w).applying[pidOf(c)] && /\bsend (it|this|that)\b/.test(c.norm))) && (orgIn(c.norm) || routeJob(c) || tb(c.w).applying[pidOf(c)]) && !/(status|update|withdraw|follow|tips|advice)/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const pid = pidOf(c); const ap = tb(c.w).applying[pid];
    const job = jobFor(c) ?? (ap ? c.w.jobs.find((j) => j.id === ap.jobId) : undefined);
    if (!job) return { msgs: [reply('Which job? Tell me the company or open the job first.', { kind: 'question' })] };
    if (job.status === 'CLOSED') return { msgs: [reply(`${jobName(c.w, job)} has closed, so it isn’t taking applications. That isn’t about you. Want similar open jobs?`, { actions: [{ label: 'Similar open jobs', primary: true, act: { t: 'say', text: 'show me similar jobs that are still open' } }] })] };
    if (c.w.applications.some((a) => a.personId === pid && a.jobId === job.id && a.status !== 'WITHDRAWN')) return { msgs: [reply(`You’ve already applied for ${jobName(c.w, job)}.`, { actions: [{ label: 'See its status', act: { t: 'nav', to: '/c/applications' } }] })] };
    const confirm = /\b(submit|send it|send my application|go ahead)\b/.test(c.norm) && ap?.jobId === job.id;
    if (confirm) return { msgs: [reply(`Submit to ${orgName(c.w, job.orgId)} with ${ap!.shared.length} items from your Passport? Once sent, they keep what you shared with this application.`, { kind: 'approval', actions: [{ label: 'Submit (simulated)', primary: true, act: { t: 'do', op: 'tb.apply.submitq', args: {} } }, { label: 'Not yet', act: { t: 'say', text: 'keep it' } }] })] };
    const m = matchFor(c.w, pid, job); const items = [...new Set(m.flatMap((x) => x.used))];
    const unv = !verifiedEmployer(c.w, job);
    return {
      msgs: [reply(`I’ve started your application to ${jobName(c.w, job)}. I’d share ${items.length ? items.map((e) => `“${e.title}”`).join(' and ') : 'nothing yet (your Passport has no matching proof)'}, nothing else. ${unv ? 'This employer isn’t verified, so I’d share as little as possible. ' : ''}Nothing is sent until you confirm.`, {
        kind: 'approval', used: [passportUsed(c.w, pid), 'Job’s stated needs'],
        actions: [{ label: 'Submit (simulated)', primary: true, act: { t: 'do', op: 'tb.apply.submitq', args: {} } }, { label: 'Change what’s shared', act: { t: 'nav', to: `/c/jobs/${job.id}` } }, { label: 'Stop', act: { t: 'do', op: 'tb.apply.cancel' } }] })],
      effects: (w) => { tb(w).applying[pid] = { jobId: job.id, shared: items.map((e) => e.evidenceId), startedMs: Date.now(), consent: false, note: '' }; },
      nav: c.route === `/c/jobs/${job.id}` ? undefined : { to: `/c/jobs/${job.id}`, label: job.title },
    };
  },
});
registerSkill({
  id: 'tb.status', side: 'candidate',
  match: (c) => (cand(c) && /(status|update|news|heard back|hear back|reply|replied|respond|responded|any word|ghost|ignor|nobody (is )?(replying|answering)|no one replies|what is happening with|where are we)/.test(c.norm) && (orgIn(c.norm) || /application|applied|jobs?|recruiter|employer|they|them/.test(c.norm)) && !/(follow ?up|chase|nudge|message)/.test(c.norm) ? 0.86 : 0),
  handle: (c) => {
    const pid = pidOf(c); const org = orgIn(c.norm);
    const apps = c.w.applications.filter((a) => a.personId === pid && (!org || c.w.jobs.find((j) => j.id === a.jobId)?.orgId === org));
    if (!apps.length) return { msgs: [reply(org ? `You haven’t applied to ${orgName(c.w, org)}.` : 'You haven’t applied for anything yet.', { actions: [{ label: 'Find jobs', act: { t: 'nav', to: '/c/jobs' } }] })] };
    const lines = apps.map((a) => { const x = appExplain(c.w, a); return `${x.job?.title} at ${x.org}: ${APP_LABEL[a.status]}. ${x.plain}${(a.status === 'SUBMITTED' || a.status === 'VIEWED') ? ` No reply in ${x.days} days.` : ''}`; });
    const waiting = apps.map((a) => ({ a, x: appExplain(c.w, a) })).filter((y) => y.x.waiting);
    return { msgs: [reply(`${lines.join(' ')} ${waiting.length ? `${waiting.map((y) => y.x.org).join(' and ')} ${waiting.length === 1 ? 'hasn’t' : 'haven’t'} replied in ${waiting[0].x.days} days. That’s common and says nothing about you; many employers never reply to anyone. You could send one polite follow-up, or move on.` : 'I can’t promise any outcome; I’ll tell you exactly what happens.'}`, {
      ref: { type: 'tb.apps', id: pid }, used: ['Your applications'], why: 'Statuses come only from what the employer did in Talent Q. I never guess a decision.',
      actions: [...(waiting.length ? [{ label: `Draft a follow-up to ${waiting[0].x.org}`, primary: true, act: { t: 'say', text: `follow up with ${waiting[0].x.org}` } } as QAction, { label: 'Move on from it', act: { t: 'do', op: 'tb.followup.moveon', args: { appId: waiting[0].a.id } } } as QAction] : []), { label: 'See all applications', act: { t: 'nav', to: '/c/applications' } }] })] };
  },
});
registerSkill({
  id: 'tb.followup', side: 'candidate',
  match: (c) => (cand(c) && (/(follow ?-?up|chase|nudge|remind them|check in with|polite (message|note))/.test(c.norm) || /move on|give up on|forget about (rivers|kora|harbour|that job|them)/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const pid = pidOf(c); const org = orgIn(c.norm);
    const apps = c.w.applications.filter((a) => a.personId === pid && ['SUBMITTED', 'VIEWED'].includes(a.status) && (!org || c.w.jobs.find((j) => j.id === a.jobId)?.orgId === org));
    const app = apps.map((a) => ({ a, x: appExplain(c.w, a) })).sort((p, q) => q.x.days - p.x.days)[0];
    if (!app) return { msgs: [reply(org ? `There’s no open application with ${orgName(c.w, org)} to follow up on.` : 'There’s nothing waiting on a reply right now.')] };
    if (/move on|give up|forget about/.test(c.norm)) return { msgs: [reply(`Move on from ${app.x.job?.title} at ${app.x.org}? It stays open on their side; I just stop reminding you.`, { kind: 'approval', actions: [{ label: 'Move on', primary: true, act: { t: 'do', op: 'tb.followup.moveon', args: { appId: app.a.id } } }, { label: 'Keep waiting', act: { t: 'say', text: 'keep it' } }] })] };
    const body = followupText(c.w, app.a, c.actor.first);
    const early = app.x.days < tb(c.w).noReplyDays;
    return { msgs: [reply(`${early ? `It’s been ${app.x.days} days; most employers take ${tb(c.w).noReplyDays} or more, so it may be early. ` : `It’s been ${app.x.days} days with no reply from ${app.x.org}. That’s on them, not you. `}Here’s a short, polite follow-up. I won’t send it without your yes: “${body}”`, {
      kind: 'approval', used: ['Your application', `${app.x.org} · ${app.x.job?.signals.replies ?? ''}`],
      actions: [{ label: 'Send (simulated)', primary: true, act: { t: 'do', op: 'tb.followup.send', args: { appId: app.a.id, body } } }, { label: 'Move on instead', act: { t: 'do', op: 'tb.followup.moveon', args: { appId: app.a.id } } }, { label: 'Open messages', act: { t: 'nav', to: '/c/messages' } }] })] };
  },
});
registerSkill({
  id: 'tb.withdraw', side: 'candidate',
  match: (c) => (cand(c) && /\bwithdraw\b|pull out of|pull my application/.test(c.norm) && (orgIn(c.norm) || /application/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const org = orgIn(c.norm); const app = c.w.applications.find((a) => a.personId === pidOf(c) && !['WITHDRAWN', 'NOT_PROGRESSING', 'JOB_CLOSED'].includes(a.status) && (!org || c.w.jobs.find((j) => j.id === a.jobId)?.orgId === org));
    if (!app) return { msgs: [reply('I couldn’t find an open application to withdraw.')] };
    const x = appExplain(c.w, app);
    return { msgs: [reply(`Withdraw from ${x.job?.title} at ${x.org}? They’ll be told you withdrew. They keep what you’d already shared with this application; you can end their access to Passport items separately.`, { kind: 'approval', actions: [{ label: 'Withdraw', primary: true, act: { t: 'do', op: 'tb.app.withdraw', args: { appId: app.id } } }, { label: 'Keep it', act: { t: 'say', text: 'keep it' } }] })] };
  },
});

// ---------- Advice, and remembering advice the person rejects ----------
const ADVICE_LABEL: Record<string, string> = { cover_note: 'cover letters or cover notes', numbers: 'adding numbers to your proof', gap: 'filling gaps in your proof', follow_up: 'following up with employers' };
registerSkill({
  id: 'tb.advice', side: 'candidate',
  match: (c) => (cand(c) && /(tips|advice|suggestions?|improve|better chance|stand out|what should i (do|add|change)|how (can|do) i (improve|do better|get noticed))/.test(c.norm) && !/(interview)/.test(c.norm) && !/(stop|do not|never|no more)/.test(c.norm) ? 0.84 : 0),
  handle: (c) => {
    const pid = pidOf(c);
    const job = jobFor(c) ?? c.w.jobs.find((j) => j.id === (c.w.applications.find((a) => a.personId === pid && ['SUBMITTED', 'VIEWED'].includes(a.status) && c.w.jobs.find((x) => x.id === a.jobId)?.status === 'OPEN')?.jobId ?? 'j_kora_backend'))!;
    const adv = adviceFor(c.w, pid, job); const declined = tb(c.w).declined[pid] ?? [];
    return { msgs: [reply(`For ${jobName(c.w, job)}: ${adv.map((a, k) => `(${k + 1}) ${a.text}`).join(' ')}${declined.length ? ` I’ve left out ${declined.map((k) => ADVICE_LABEL[k] ?? k).join(' and ')}, as you asked.` : ''} These are suggestions, not rules. Tell me if any don’t suit you.`, { used: [passportUsed(c.w, pid), `${job.title} · stated needs`, ...(declined.length ? ['What Q remembers · advice you declined'] : [])] })],
      frame: { intent: 'tb.advice', slots: { keys: adv.map((a) => a.key).join(',') }, startedAt: now() } };
  },
  answer: (c) => (c.frame?.topic !== 'suspended' && DECLINE.test(c.norm) ? declineAdvice(c) : null),
});
const DECLINE = /(stop (telling|suggesting|saying|recommending|asking)|do not (tell|suggest|recommend|ask)|not (going to|gonna) (write|do)|i (will not|refuse to|am not going to|am not) (write|do|writing|doing)|never (suggest|again)|pointless|waste of time|i hate|no more .*(cover|advice)|i do not (want|do|write) (to (do|write) )?(that|cover|those)|not doing that|i do not need)/;
function declineAdvice(c: QCtx): QReply {
  const keys = (c.frame?.slots.keys ?? '').split(',').filter(Boolean);
  const key = /cover/.test(c.norm) ? 'cover_note' : /number/.test(c.norm) ? 'numbers' : /follow/.test(c.norm) ? 'follow_up' : /gap|proof/.test(c.norm) ? 'gap' : keys[0] ?? 'cover_note';
  const label = ADVICE_LABEL[key] ?? key;
  return { msgs: [reply(`Understood. I won’t suggest ${label} again, for this job or any other. That’s your call to make. I’ve noted it in What Q remembers, where you can remove it if you change your mind.`, { used: ['What Q remembers'], actions: [{ label: 'See what you remember', act: { t: 'nav', to: '/c/memory' } }] })],
    effects: (w, a) => { const pid = a.personId!; tb(w).declined[pid] = [...new Set([...(tb(w).declined[pid] ?? []), key])]; tb(w).memories.push({ id: uid('cm'), personId: pid, key: `q.advice.declined.${key}`, text: `Don’t suggest ${label} again.`, source: `Your message, ${fmtDate(simNow(w).toISOString())}`, at: now(), usedFor: 'Leaving that advice out of everything Q suggests.', sharedWith: [], state: 'ACTIVE', tags: [key, 'advice', ...label.split(' ')] }); emit(w, a.id, 'q.advice.declined', PSCOPE(pid), `You asked Q not to suggest ${label}.`); },
    frame: null };
}
registerSkill({ id: 'tb.advice.decline', side: 'candidate', match: (c) => (cand(c) && DECLINE.test(c.norm) && /(cover|advice|suggest|tip|that|number|follow)/.test(c.norm) ? 0.9 : 0), handle: (c) => declineAdvice(c) });

// ---------- Notifications (through Q; /settings shows the same values) ----------
registerSkill({
  id: 'tb.notify', side: 'candidate',
  match: (c) => (cand(c) && /(notif|email me|text me|texts|\bsms\b|digest|alerts?|stop (emailing|texting|messaging me)|do not (email|text)|ping me|spam me|so many emails|too many emails)/.test(c.norm) && !/(follow ?up|recruiter|kora|rivers)/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const n = c.norm; const cur = c.w.consents[pidOf(c)].notifications; const p: Partial<typeof cur> = {};
    const off = (re: RegExp) => new RegExp(`(stop|no|do not|turn off|disable|mute|without|fewer|less|not)[\\w ]{0,20}(${re.source})`).test(n);
    if (/(no|stop|turn off|mute|disable|all) (all )?notifications|stop notifying|leave me alone/.test(n)) Object.assign(p, { email: false, sms: false, inApp: false, digest: 'OFF' });
    if (/only (by )?email|email only|just email/.test(n)) Object.assign(p, { email: true, sms: false, inApp: false });
    if (/only (in )?(the )?app|in app only/.test(n)) Object.assign(p, { email: false, sms: false, inApp: true });
    if (off(/text|sms/)) p.sms = false; else if (/(text|sms) me/.test(n)) p.sms = true;
    if (off(/email|emailing|emails/)) p.email = false;
    if (off(/in app|app notif/)) p.inApp = false;
    if (/daily/.test(n)) p.digest = 'DAILY'; else if (/weekly|once a week/.test(n)) p.digest = 'WEEKLY'; else if (off(/digest/)) p.digest = 'OFF';
    if (/too many emails|so many emails|spam/.test(n) && p.digest === undefined) p.digest = 'WEEKLY';
    if (!Object.keys(p).length) return { msgs: [reply(`Right now: email ${cur.email ? 'on' : 'off'}, text messages ${cur.sms ? 'on' : 'off'}, in Talent Q ${cur.inApp ? 'on' : 'off'}, job digest ${cur.digest.toLowerCase()}. What would you like to change?`, { kind: 'question', actions: [{ label: 'Weekly email only', act: { t: 'say', text: 'only email me, weekly' } }, { label: 'No text messages', act: { t: 'say', text: 'stop texting me' } }, { label: 'Open settings', act: { t: 'nav', to: '/settings' } }] })] };
    const nx = { ...cur, ...p };
    return { msgs: [reply(`Done. Email ${nx.email ? 'on' : 'off'}, text messages ${nx.sms ? 'on' : 'off'}, in Talent Q ${nx.inApp ? 'on' : 'off'}, job digest ${nx.digest.toLowerCase()}. ${!nx.email && !nx.sms && !nx.inApp ? 'You’ll still see updates when you open Talent Q. ' : ''}I can’t filter by employer yet. You can change any of this in Settings.`, { used: ['Notification settings'], actions: [{ label: 'Undo', act: { t: 'say', text: 'undo' } }, { label: 'Open settings', act: { t: 'nav', to: '/settings' } }] })],
      effects: (w, a) => { const before = { ...w.consents[a.personId!].notifications }; w.consents[a.personId!] = { ...w.consents[a.personId!], notifications: nx }; emit(w, a.id, 'settings.changed', PSCOPE(a.personId!), 'Notification settings changed (through Q).'); (w.q.undo[a.id] ??= []).push({ id: uid('u'), label: 'notification change', at: now(), inverse: { op: 'tb.notify', args: { patch: before, silent: true } } }); } };
  },
});

// ---------- Memory and deletion ----------
registerSkill({
  id: 'tb.forget', side: 'candidate',
  match: (c) => (cand(c) && /\b(forget|delete|erase|remove|wipe|scrub)\b/.test(c.norm) && !/(application|draft|upload|forget about (rivers|kora|harbour|that job|them))/.test(c.norm) && !orgIn(c.norm) && (findMemories(c.w, pidOf(c), c.norm).length > 0 || /(about me|that i|what i (said|told))/.test(c.norm)) ? 0.94 : 0),
  handle: (c) => {
    const pid = pidOf(c); const ms = findMemories(c.w, pid, c.norm);
    if (!ms.length) return { msgs: [reply('I can’t find anything I remember that matches that. Here’s everything I keep about you, so you can check.', { actions: [{ label: 'What you remember', act: { t: 'nav', to: '/c/memory' } }] })] };
    const plan = deletionPlan(c.w, pid, ms);
    return { msgs: [reply(`Here’s exactly what happens if I forget “${ms[0].text.replace(/\.$/, '')}”. Deleted: ${plan.deleted.join('; ')}. Can’t be deleted: ${plan.kept.join('; ')}. ${plan.neverShared ? 'It was never shared with any employer: your sharing log shows 0 disclosures.' : ''} This can’t be undone.`, {
      kind: 'approval', used: ['What Q remembers', 'Sharing log'],
      actions: [{ label: 'Delete it', primary: true, act: { t: 'do', op: 'tb.forget', args: { ids: ms.map((m) => m.id), what: ms[0].key } } }, { label: 'Keep it', act: { t: 'say', text: 'keep it' } }] })] };
  },
});
registerSkill({
  id: 'tb.memory', side: 'candidate',
  match: (c) => (cand(c) && /(what (do|did) you (remember|know|keep|store|have) (about|on) me|what have you (saved|stored|kept)|my data|what you know about me)/.test(c.norm) ? 0.87 : 0),
  handle: (c) => {
    const ms = memoriesOf(c.w, pidOf(c)).filter((m) => m.state === 'ACTIVE');
    return { msgs: [reply(`I remember ${ms.length} things you’ve told me${ms.length ? `, including: ${ms.slice(0, 3).map((m) => m.text.replace(/\.$/, '')).join('; ')}` : ''}. None of it is shared with employers unless you choose. You can delete any of it.`, { used: ['What Q remembers'] })], nav: { to: '/c/memory', label: 'what Q remembers' } };
  },
});

// ---------- Messages to an employer ----------
// Moved to q/skills/email.ts (contact.ask, contact.briefing, contact.emailReply; op tb.msg.send kept there): the
// employer's contact policy is shown before drafting, and the send goes through the same policy check (audit §C).
