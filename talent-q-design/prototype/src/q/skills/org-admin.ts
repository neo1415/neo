// Q skills for ORG-ADMIN. Every main task on the admin pages can be said to Q in plain words and goes through the
// same ops (and the same permission and tenancy rules) as the buttons:
//   "from now on keep my messages short" · "what are my instructions" · "approve the support lead template" ·
//   "remove the flagged line" · "verify whatsapp" · "the code is 428913" · "send zara a whatsapp" · "approve the whatsapp"
//   · "can I call zara" · "how much budget have we used" · "pause new runs" · "approve ada's request" · "how long do we
//   keep transcripts" · "delete grace's records" · "any incidents?" · "time to shortlist" · "which model drafts messages"
//   · "simulate a timeout for drafting" · "what bias checks run" · "what has Q learned" · "approve the first-name
//   learning" · "reject the pay band learning because the sample is too small" · "renew the job board" ·
//   "resume the invoice for halima" · candidates: "turn on whatsapp" / "no phone calls".
import { orgOf, personOf, type World } from '../../mock/world';
import type { Actor, QAction } from '../../state/domain';
import { registerSkill } from '../core/engine';
import type { QCtx, QReply, ReplyMsg } from '../core/types';
import { oa } from '../../state/areas/org-admin';
import {
  BASE, billingOf, budgetShare, CHECK_LABEL, choiceOf, contactable, deniedWhy, doOp, isAdmin, level, placementsFor, probeOp, qualityChecks, roleReport, secOf, usd, WA_LABEL, type Sec,
} from '../../journeys/org-admin/model';

const say = (label: string, text: string, primary = false): QAction => ({ label, primary, act: { t: 'say', text } });
const path = (sec: Sec) => secOf(sec).path;
const stay = (c: QCtx, sec: Sec) => (c.route === path(sec) ? undefined : { to: path(sec), label: secOf(sec).label.toLowerCase() });
const reply = (text: string, extra: Partial<ReplyMsg> = {}): ReplyMsg => ({ kind: 'reply', text, ...extra });
/** Run an op: word the reply from a dry run on a copy, then apply it for real in the same update as the reply. */
function run(c: QCtx, sec: Sec, name: string, args: Record<string, unknown>, extra: Partial<ReplyMsg> = {}, go = true): QReply {
  const text = probeOp(c.w, c.actor, name, args) || 'Done.';
  return { msgs: [reply(text, extra)], effects: (w, a) => { doOp(w, a, name, args); }, nav: go ? stay(c, sec) : undefined };
}
const denied = (c: QCtx, sec: Sec): QReply => ({ msgs: [{ kind: 'refusal', text: `${deniedWhy(c.w, c.actor, sec)} I won’t show it here either.` }] });
/** Candidates the organisation is in conversation with, named in the sentence. Never anyone it can't see. */
function personIn(c: QCtx, pool = contactable(c.w, c.actor.orgId)) {
  return pool.find((pid) => { const n = personOf(c.w, pid)?.name.toLowerCase() ?? ''; return n && (c.norm.includes(n) || new RegExp(`\\b${n.split(' ')[0]}\\b`).test(c.norm)); });
}
const recruiter = (c: QCtx) => c.actor.side === 'recruiter' && !!c.actor.orgId;

type Intent = { id: string; sec: Sec; re: RegExp; score: number; need?: 'VIEW'; go: (c: QCtx) => QReply };
const INTENTS: Intent[] = [
  // ---------- SC-020 instructions ----------
  { id: 'instr.add', sec: 'instructions', score: 0.93, re: /^(from now on|going forward|in future)\b|\b(add (an |a )?(personal )?instruction|my instruction:?|new instruction)\b/, go: (c) => {
    const text = c.text.replace(/^(q[,:]?\s*)?(from now on|going forward|in future)[,:]?\s*/i, '').replace(/^.*?(add (an |a )?(personal )?instruction|my instruction|new instruction)[:,]?\s*(to |that )?/i, '').trim();
    if (text.length < 4) return { msgs: [{ kind: 'question', text: 'What should I always do, or never do, for you? One sentence.' }] };
    return run(c, 'instructions', 'oa.instr.add', { text }, { used: [`${orgOf(c.w, c.actor.orgId)?.name} guidelines`] });
  } },
  { id: 'instr.list', sec: 'instructions', score: 0.9, re: /\b(what are my instructions|my instructions|show (me )?my instructions|instructions (to|for) q)\b/, go: (c) => {
    const mine = oa(c.w).instructions.filter((i) => i.actorId === c.actor.id);
    return { msgs: [reply(mine.length ? `You have ${mine.length}: ${mine.map((i) => `“${i.text}”${i.on ? '' : ' (paused)'}`).join('; ')}. ${orgOf(c.w, c.actor.orgId)?.name}’s guidelines win where they clash.` : 'You have no personal instructions yet. Say “from now on …” to add one.')], nav: stay(c, 'instructions') };
  } },
  // ---------- SC-021 templates ----------
  { id: 'tpl.approve', sec: 'templates', score: 0.95, re: /\bapprove\b.*\btemplates?\b|\btemplates?\b.*\bapprove/, go: (c) => {
    const ts = oa(c.w).templates.filter((t) => t.orgId === c.actor.orgId && t.state !== 'APPROVED' && t.state !== 'RETIRED');
    const t = ts.find((x) => c.norm.includes(x.title.toLowerCase().split(' ')[0])) ?? ts[0];
    if (!t) return { msgs: [reply('Nothing is waiting for approval.')], nav: stay(c, 'templates') };
    return run(c, 'templates', 'oa.tpl.approve', { id: t.id }, { actions: [say('Remove the flagged line', 'remove the flagged line from the template')] });
  } },
  { id: 'tpl.fix', sec: 'templates', score: 0.94, re: /\b(remove|fix|drop)\b.*\b(flagged|that) (line|question)\b|\bfix the template\b/, go: (c) => {
    const t = oa(c.w).templates.find((x) => x.orgId === c.actor.orgId && x.state === 'PROPOSED');
    return t ? run(c, 'templates', 'oa.tpl.fix', { id: t.id }, { actions: [say('Approve it', 'approve the template', true)] }) : { msgs: [reply('No proposed template has a flagged line.')] };
  } },
  { id: 'tpl.show', sec: 'templates', score: 0.82, need: 'VIEW', re: /\b(show|open|list|which|what)\b.*\btemplates?\b|^templates?$/, go: (c) => {
    const ts = oa(c.w).templates.filter((t) => t.orgId === c.actor.orgId); const w8 = ts.filter((t) => t.state === 'PROPOSED');
    return { msgs: [reply(`${ts.filter((t) => t.state === 'APPROVED').length} approved template${ts.length === 1 ? '' : 's'}${w8.length ? `; ${w8.map((t) => `“${t.title}”`).join(', ')} waiting for approval` : ''}. Email templates live with the email policy.`)], nav: stay(c, 'templates') };
  } },
  // ---------- SC-023 channels, V09 ----------
  { id: 'ch.verify', sec: 'channels', score: 0.94, re: /\b(verify|set up|connect)\b.*\b(whatsapp|sms|text messages|phone|calls?|calling|the number)\b/, go: (c) => {
    const kind = /whatsapp/.test(c.norm) ? 'WHATSAPP' : /sms|text/.test(c.norm) ? 'SMS' : 'VOICE';
    return run(c, 'channels', 'oa.ch.start', { kind });
  } },
  { id: 'ch.code', sec: 'channels', score: 0.96, re: /\b(code is|the code|enter)\b\s*:?\s*\d{4,8}\b/, go: (c) => run(c, 'channels', 'oa.ch.code', { code: c.norm.match(/\d{4,8}/)![0] }) },
  { id: 'wa.approve', sec: 'channels', score: 0.95, need: 'VIEW', re: /\bapprove\b.*\bwhats ?app\b/, go: (c) => {
    const m = oa(c.w).wa.find((x) => x.orgId === c.actor.orgId && x.status === 'AWAITING_APPROVAL');
    return m ? run(c, 'channels', 'oa.wa.approve', { id: m.id }) : { msgs: [reply('No WhatsApp message is waiting for approval.')] };
  } },
  { id: 'wa.status', sec: 'channels', score: 0.9, need: 'VIEW', re: /\b(was|is|did)\b.*\bwhats ?app\b.*\b(delivered|read|sent|status)\b|\bwhats ?app status\b/, go: (c) => {
    const ms = oa(c.w).wa.filter((x) => x.orgId === c.actor.orgId);
    return { msgs: [reply(ms.length ? ms.map((m) => `To ${personOf(c.w, m.personId)?.name.split(' ')[0]}: ${WA_LABEL[m.status].toLowerCase()}${m.status === 'ACCEPTED' ? ' (accepted isn’t delivered yet)' : ''}.`).join(' ') + ' All provider steps are simulated.' : 'No WhatsApp messages yet.')], nav: stay(c, 'channels') };
  } },
  { id: 'wa.draft', sec: 'channels', score: 0.94, need: 'VIEW', re: /\b(send|message|text|draft)\b.*\bwhats ?app\b|\bwhats ?app\b.*\b(to|for)\b/, go: (c) => {
    const pid = personIn(c); if (!pid) return { msgs: [{ kind: 'question', text: 'Who should it go to? I can only message people you’re already in conversation with.' }] };
    return run(c, 'channels', 'oa.wa.draft', { personId: pid }, { actions: [say('Approve it', 'approve the whatsapp message', true)] });
  } },
  { id: 'call.check', sec: 'channels', score: 0.92, need: 'VIEW', re: /\b(can|may|could) (i|we) (call|phone|ring)\b|\b(phone|ring) (?!calls?\b|numbers?\b)\w+\b|\bcall \w+ on the phone\b/, go: (c) => {
    const pid = personIn(c); if (!pid) return { msgs: [{ kind: 'question', text: 'Who would you like to call? I check people you’re already in conversation with.' }] };
    return run(c, 'channels', 'oa.call.check', { personId: pid });
  } },
  { id: 'ch.ask', sec: 'channels', score: 0.92, need: 'VIEW', re: /\bask (\w+) (about|for|if|whether)\b.*\b(whats ?app|calls?|phone)\b/, go: (c) => {
    const pid = personIn(c); if (!pid) return { msgs: [{ kind: 'question', text: 'Who should I ask?' }] };
    return run(c, 'channels', 'oa.choice.ask', { personId: pid, what: /call|phone/.test(c.norm) ? 'call' : 'whatsapp' });
  } },
  { id: 'ch.show', sec: 'channels', score: 0.84, need: 'VIEW', re: /\b(channels?|whats ?app|sms sender|calling)\b/, go: (c) => {
    const ch = oa(c.w).channels.filter((x) => x.orgId === c.actor.orgId);
    const ok = (k: string) => ch.find((x) => x.kind === k)?.state === 'VERIFIED';
    return { msgs: [reply(`Email ${ok('EMAIL') ? 'is' : 'isn’t'} verified, SMS ${ok('SMS') ? 'is' : 'isn’t'}, WhatsApp ${ok('WHATSAPP') ? 'is' : 'isn’t'}, calls ${ok('VOICE') ? 'are' : 'aren’t'}. Each candidate still chooses what they accept.`, { actions: ok('WHATSAPP') ? [] : [say('Verify WhatsApp', 'verify whatsapp', true)] })], nav: stay(c, 'channels') };
  } },
  // ---------- SC-024 billing, MO-035 ----------
  { id: 'bill.stop', sec: 'billing', score: 0.94, re: /\b(pause|stop|halt)\b.*\b(new )?(agent )?runs\b/, go: (c) => run(c, 'billing', 'oa.bill.decide', { decision: 'STOP' }) },
  { id: 'bill.spend', sec: 'billing', score: 0.93, re: /\b(allow|raise|increase|add)\b.*\b(budget|cap|\$ ?\d+|more)\b/, go: (c) => { const n = Number(c.norm.match(/\$ ?(\d+)/)?.[1] ?? c.norm.match(/\b(\d+)\b/)?.[1] ?? 10); return run(c, 'billing', 'oa.bill.decide', { decision: 'SPEND', extra: n }); } },
  { id: 'bill.req', sec: 'billing', score: 0.93, re: /\b(approve|decline|reject|refuse)\b.*\b(budget )?request\b/, go: (c) => {
    const r = billingOf(c.w, c.actor.orgId)?.requests.find((x) => x.state === 'OPEN'); if (!r) return { msgs: [reply('No budget request is waiting.')] };
    return run(c, 'billing', 'oa.bill.req', { id: r.id, ok: /\bapprove\b/.test(c.norm) });
  } },
  { id: 'bill.show', sec: 'billing', score: 0.86, need: 'VIEW', re: /\b(budget|usage|billing|how much (have|did) we (use|used|spend|spent)|our plan|subscription|quota)\b/, go: (c) => {
    const b = billingOf(c.w, c.actor.orgId)!; const sh = budgetShare(b);
    return { msgs: [reply(`Agent budget: ${usd(b.budget.spent)} of ${usd(b.budget.cap)} (${Math.round(sh * 100)}%, simulated). ${sh >= b.budget.warnAt ? (b.budget.decision ? 'A decision is recorded.' : isAdmin(c.actor) ? 'You decide: pause new runs or allow more.' : 'An admin decides what happens next.') : 'Within the cap.'} ${isAdmin(c.actor) ? `Plan: ${b.plan}, ${b.hypothesis} as a pricing hypothesis, not a price. Nothing is charged.` : ''}`.trim(),
      { ref: { type: 'oa.budget', id: c.actor.orgId! }, actions: sh >= b.budget.warnAt && isAdmin(c.actor) && !b.budget.decision ? [say('Pause new runs', 'pause new agent runs'), say('Allow $10 more', 'allow $10 more budget')] : [] })], nav: stay(c, 'billing') };
  } },
  // ---------- SC-025 retention ----------
  { id: 'ret.delete', sec: 'retention', score: 0.95, re: /\b(delete|erase|remove)\b.*\b(records?|data)\b|\b(process|handle|do)\b.*\bdeletion\b/, go: (c) => {
    const r = oa(c.w).retention.find((x) => x.orgId === c.actor.orgId); const open = r?.deletions.filter((d) => d.state === 'OPEN') ?? [];
    const pid = personIn(c, open.map((d) => d.personId)); const d = open.find((x) => x.personId === pid) ?? (open.length === 1 ? open[0] : undefined);
    if (!d) return { msgs: [reply(open.length ? 'Whose request? ' + open.map((x) => personOf(c.w, x.personId)?.name).join(', ') : 'No deletion request is waiting. I only delete when the person asked.')], nav: stay(c, 'retention') };
    return run(c, 'retention', 'oa.ret.delete', { id: d.id });
  } },
  { id: 'ret.export', sec: 'retention', score: 0.93, re: /\b(export|download)\b.*\baudit\b|\baudit export\b/, go: (c) => run(c, 'retention', 'oa.ret.export', {}) },
  { id: 'ret.show', sec: 'retention', score: 0.88, need: 'VIEW', re: /\b(how long|retention|retain)\b|\bkeep\b.*\b(records?|data|transcripts?|recordings?|messages|applications|audit)\b/, go: (c) => {
    const r = oa(c.w).retention.find((x) => x.orgId === c.actor.orgId)!;
    const hit = r.rules.find((x) => x.data.toLowerCase().split(/\W+/).some((wd) => wd.length > 5 && c.norm.includes(wd.replace(/s$/, ''))));
    const t = hit ? `${hit.data}: ${hit.period}. ${hit.why} ${hit.status === 'PROPOSED_D9' ? 'That’s a proposal until the founder and legal decide D9.' : ''}` : `${r.rules.filter((x) => x.status === 'PROPOSED_D9').length} periods are proposals until decision D9; recordings are never stored (transcript only).`;
    return { msgs: [reply(t.trim())], nav: stay(c, 'retention') };
  } },
  // ---------- SC-141 compliance ----------
  { id: 'inc.resolve', sec: 'compliance', score: 0.94, re: /\bresolve\b.*\bincident\b/, go: (c) => {
    const i = oa(c.w).incidents.find((x) => x.orgId === c.actor.orgId && x.state === 'OPEN' && c.norm.split(' ').some((wd) => wd.length > 4 && x.title.toLowerCase().includes(wd))) ?? oa(c.w).incidents.find((x) => x.orgId === c.actor.orgId && x.state === 'OPEN');
    if (!i) return { msgs: [reply('No open incidents.')] };
    const note = c.text.match(/\b(?:because|note:?)\s+(.+)$/i)?.[1];
    if (!note) return { msgs: [{ kind: 'question', text: `What was done about “${i.title}”? Say “resolve the incident because …”.` }] };
    return run(c, 'compliance', 'oa.inc.resolve', { id: i.id, note });
  } },
  { id: 'cp.show', sec: 'compliance', score: 0.86, re: /\b(incidents?|compliance)\b/, go: (c) => {
    const open = oa(c.w).incidents.filter((x) => x.orgId === c.actor.orgId && x.state === 'OPEN');
    return { msgs: [reply(open.length ? `${open.length} open: ${open.map((i) => `“${i.title}”`).join('; ')}. Nothing was sent because of them.` : 'No open incidents.')], nav: stay(c, 'compliance') };
  } },
  // ---------- SC-142 reports ----------
  { id: 'rp.show', sec: 'reports', score: 0.87, need: 'VIEW', re: /\b(time to shortlist|org(anisation|anization)? reports?|engagement|reports? page|how (fast|quickly) .* shortlist)\b|^reports?$/, go: (c) => {
    const rows = roleReport(c.w, c.actor);
    return { msgs: [reply(rows.length ? rows.map((r) => `${r.title}: ${r.days === null ? 'no shortlist yet' : `${r.days} day${r.days === 1 ? '' : 's'} to first shortlist`}, ${r.replied} repl${r.replied === 1 ? 'y' : 'ies'}`).join('; ') + '.' : 'No roles to report on.', { used: ['Your pipeline and conversations'] })], nav: stay(c, 'reports') };
  } },
  // ---------- SC-144 models, V03 ----------
  { id: 'md.trace', sec: 'models', score: 0.93, need: 'VIEW', re: /\bsimulate\b.*\b(timeout|failure|outage)\b/, go: (c) => {
    const rs = oa(c.w).routes[c.actor.orgId!] ?? []; const r = rs.find((x) => c.norm.includes(x.task.toLowerCase().split(' ')[0]) || (/draft/.test(c.norm) && x.id === 'r_draft') || (/transcri/.test(c.norm) && x.id === 'r_speech')) ?? rs.find((x) => x.id === 'r_draft')!;
    return run(c, 'models', 'oa.model.trace', { id: r.id });
  } },
  { id: 'md.show', sec: 'models', score: 0.88, need: 'VIEW', re: /\b(which|what) (ai )?models?\b|\bmodel (routes?|versions?|inspector)\b|\b(scoring versions?|fallbacks?)\b/, go: (c) => {
    const rs = oa(c.w).routes[c.actor.orgId!] ?? [];
    const r = rs.find((x) => (/draft|message|email/.test(c.norm) && x.id === 'r_draft') || (/transcri|voice|speech/.test(c.norm) && x.id === 'r_speech') || (/rank|evidence|explain/.test(c.norm) && x.id === 'r_evidence') || (/cv|document|resume/.test(c.norm) && x.id === 'r_cv') || (/sourc/.test(c.norm) && x.id === 'r_source'));
    return { msgs: [reply(r ? `${r.task}: ${r.route.join(', then ')}; budget ${r.budget}, timeout ${r.timeoutMs >= 1000 ? `${r.timeoutMs / 1000} s` : `${r.timeoutMs} ms`}; if both fail, ${r.fallback.toLowerCase()}. Simulated: no model is called in this prototype.` : `Each task has its own route: small fast models first, a larger one only where needed, each with a budget, a timeout and a fallback that never sends on its own. All simulated.`, { actions: [say('Simulate a timeout', `simulate a timeout for ${r ? r.task.toLowerCase() : 'drafting'}`)] })], nav: stay(c, 'models') };
  } },
  // ---------- SC-145 quality ----------
  { id: 'ql.run', sec: 'quality', score: 0.93, re: /\brun\b.*\b(quality|bias|fairness) checks?\b/, go: (c) => run(c, 'quality', 'oa.quality.run', {}) },
  { id: 'ql.show', sec: 'quality', score: 0.88, need: 'VIEW', re: /\b(bias|fairness|adverse impact|quality checks?|drift)\b/, go: (c) => {
    const cs = qualityChecks(c.w, c.actor.orgId);
    return { msgs: [reply(`${cs.map((x) => `${x.name}: ${CHECK_LABEL[x.status].toLowerCase()}`).join('; ')}. I don’t produce fairness numbers: nothing here is validated yet (D17).`)], nav: stay(c, 'quality') };
  } },
  // ---------- V29 learning ----------
  { id: 'ln.decide', sec: 'learning', score: 0.95, re: /\b(approve|accept|reject|decline)\b.*\blearn(ing|ings|ed)?\b/, go: (c) => {
    const ls = oa(c.w).learnings.filter((l) => l.orgId === c.actor.orgId && l.state === 'PROPOSED');
    const keys: [RegExp, string][] = [[/pay ?band/, 'ln_payband'], [/first.?name/, 'ln_firstname'], [/culture/, 'ln_culture'], [/remind/, 'ln_tb_reminder']];
    const id = keys.find(([re]) => re.test(c.norm))?.[1]; const l = ls.find((x) => x.id === id) ?? (ls.length === 1 ? ls[0] : undefined);
    if (!l) return { msgs: [{ kind: 'question', text: ls.length ? `Which one? ${ls.map((x) => `“${x.text}”`).join(' or ')}` : 'Nothing is waiting for review.' }], nav: stay(c, 'learning') };
    const ok = /\b(approve|accept)\b/.test(c.norm); const reason = c.text.match(/\bbecause\s+(.+)$/i)?.[1];
    if (!ok && !reason) return { msgs: [{ kind: 'question', text: `Why reject “${l.text}”? Say “reject it because …” so the team knows.` }] };
    return run(c, 'learning', 'oa.learn.decide', { id: l.id, ok, reason });
  } },
  { id: 'ln.show', sec: 'learning', score: 0.88, need: 'VIEW', re: /\bwhat (has q|have you|did you|did q) learn(ed|t)?\b|\blearnings?\b/, go: (c) => {
    const ls = oa(c.w).learnings.filter((l) => l.orgId === c.actor.orgId && l.state !== 'NOT_ALLOWED');
    return { msgs: [reply(`${ls.filter((l) => l.state === 'PROPOSED').length} proposed, ${ls.filter((l) => l.state === 'APPROVED').length} approved. Each comes only from ${orgOf(c.w, c.actor.orgId)?.name}’s own consented outcomes, and none applies until a reviewer says yes. Private practice is never used.`)], nav: stay(c, 'learning') };
  } },
  // ---------- SC-146 sources ----------
  { id: 'src.renew', sec: 'sources', score: 0.93, re: /\brenew\b/, go: (c) => { const s = oa(c.w).sources.find((x) => x.orgId === c.actor.orgId && x.health === 'EXPIRING'); return s ? run(c, 'sources', 'oa.src.renew', { id: s.id }) : { msgs: [reply('No licence is close to ending.')] }; } },
  { id: 'src.show', sec: 'sources', score: 0.85, need: 'VIEW', re: /\b(sources? (and|&) licen[cs]es?|licen[cs]es?|connectors?|job board|source health|data sources?)\b/, go: (c) => {
    const ss = oa(c.w).sources.filter((x) => x.orgId === c.actor.orgId);
    return { msgs: [reply(ss.map((s) => `${s.name}: ${s.health === 'OK' ? 'healthy' : s.health === 'NOT_LICENSED' ? 'not licensed (never scraped)' : s.note.toLowerCase()}`).join('; ') + '. Health checks are simulated.')], nav: stay(c, 'sources') };
  } },
  // ---------- SC-140 placements ----------
  { id: 'pl.invoice', sec: 'placements', score: 0.94, re: /\b(resume|finish|continue|start)\b.*\binvoice\b/, go: (c) => {
    const { shown } = placementsFor(c.w, c.actor.orgId); const pid = personIn(c, shown.map((p) => p.personId));
    const p = shown.find((x) => x.personId === pid && (x.stage === 'OFFER' || x.stage === 'PLACED')) ?? shown.find((x) => x.invoice.state === 'DRAFT');
    return p ? run(c, 'placements', 'oa.pl.invoice', { id: p.id }) : { msgs: [reply('No placement is at offer yet, so there’s no invoice to work on.')] };
  } },
  { id: 'pl.show', sec: 'placements', score: 0.88, need: 'VIEW', re: /\b(placements?|invoices?|attribution)\b/, go: (c) => {
    const { shown, hidden } = placementsFor(c.w, c.actor.orgId);
    return { msgs: [reply(`${shown.length} represented${hidden ? ` (${hidden} hidden by their privacy settings)` : ''}: ${shown.map((p) => `${personOf(c.w, p.personId)?.name.split(' ')[0]} → ${orgOf(c.w, p.clientOrgId)?.name} (${p.stage.toLowerCase()}${p.dispute?.state === 'OPEN' ? ', attribution disputed' : ''}${p.invoice.state === 'DRAFT' ? ', invoice unfinished' : ''})`).join('; ')}. Talent Q doesn’t send invoices or see payments.`)], nav: stay(c, 'placements') };
  } },
];

const pick = (c: QCtx) => INTENTS.find((i) => i.re.test(c.norm));
registerSkill({
  id: 'org-admin', side: 'recruiter',
  match: (c) => { if (!recruiter(c)) return 0; const i = pick(c); if (!i) return 0; if (i.sec === 'placements' && orgOf(c.w, c.actor.orgId)?.kind !== 'AGENCY') return 0; return c.route.startsWith(BASE) ? Math.min(0.99, i.score + 0.03) : i.score; },
  handle: (c) => {
    // No access: refuse without revealing anything. View-only people may still ask; each op says who decides.
    const i = pick(c)!; return level(c.w, c.actor, i.sec) === 'NONE' ? denied(c, i.sec) : i.go(c);
  },
});

// ---------- V09 candidate side: their own channel choices ----------
registerSkill({
  id: 'org-admin.me', side: 'candidate',
  match: (c) => (/\b(whats ?app|phone calls?|calls?)\b/.test(c.norm) && /\b(turn|switch|allow|stop|no|yes|okay|ok|block|don.t|do not|on|off)\b/.test(c.norm) && !/\b(text|sms)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const what = /whats ?app/.test(c.norm) ? 'whatsapp' : 'call';
    const value = !/\b(stop|no|off|block|don.t|do not|never)\b/.test(c.norm);
    const before = choiceOf(c.w, c.actor.personId ?? '')[what];
    const text = probeOp(c.w, c.actor, 'oa.me.choice', { what, value });
    return { msgs: [reply(`${text}${before === 'ASKED' ? ' I’ve let the employer who asked see your answer.' : ''}`, { actions: [{ label: 'Open channel settings', act: { t: 'nav', to: '/settings/channels' } }] })], effects: (w: World, a: Actor) => { doOp(w, a, 'oa.me.choice', { what, value }); } };
  },
});
