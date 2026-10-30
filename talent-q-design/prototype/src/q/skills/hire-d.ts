// HIRE-D skills: everything on the hire-d pages also works by asking Q (typed or spoken). Each skill runs the same
// op a button runs, so the page and the conversation never disagree.
//   sources ("which sources do you search?", "do you use linkedin?", "leave out evidence links")
//   explore ("explore postgres in lagos", "save this search")
//   booking ("book an interview with tobi")         stage ("what stage is tobi at?", "note on tobi: …")
//   offer ("prepare an offer for tobi", "approve the offer")   placements ("which check-ins are due?")
//   reminders ("which reminders need me?", "approve grace's reminder")   delivery ("did grace read the reminder?")
import { personOf, type World } from '../../mock/world';
import type { Actor, QAction } from '../../state/domain';
import { STAGE_LABEL } from '../../state/domain';
import { registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import { isFounder } from '../../journeys/hire-a/model';
import { peopleIn } from './hire-c';
import { hd } from '../../state/areas/hire-d';
import { entryFor, firstOf, LAGOS, tDay, tTime } from '../../journeys/hire-c/lib';
import { availOf, bookingSlots, CH_WORD, coverage, daysBetween, fmtDay, MILESTONE_WORD, NOT_USED, nextMilestone, offerOf, railOf, reminderQueue, scopeOn, search, sourcesFor, SOURCE_SHORT, type SourceId } from '../../journeys/hire-d/model';
import { defaultPanel } from '../../journeys/hire-c/lib';
import { simNow } from '../../mock/world';
import { runHd } from '../../journeys/hire-d/ops';

const hirer = (c: QCtx) => c.actor.side === 'recruiter' && !!c.actor.orgId && !isFounder(c.actor);
const doOp = (label: string, op: string, args: Record<string, unknown>, primary = false): QAction => ({ label, primary, act: { t: 'do', op, args } });
const go = (label: string, to: string, primary = false): QAction => ({ label, primary, act: { t: 'nav', to } });
/** Run an op as part of a reply (same code as the button). */
function opReply(op: string, args: Record<string, unknown>, nav?: { to: string; label: string }): QReply {
  return { msgs: [], effects: (w: World, me: Actor) => { runHd(op, w, args, me); }, nav };
}
const pipelinePerson = (c: QCtx) => peopleIn(c).find((p) => entryFor(c.w, p, c.actor.orgId));

// ---------------- SC-033 sources ----------------
const SRC_WORDS: [RegExp, SourceId][] = [[/\bappli(ed|cants?|cations?)\b/, 'applicants'], [/\bshared\b/, 'shared'], [/\b(discover\w*|members|open to)\b/, 'discoverable'], [/\b(past candidates|own records|records)\b/, 'records'], [/\b(evidence links?|github|repos?|repositories)\b/, 'evidence'], [/\bregistered\b/, 'registered']];
registerSkill({
  id: 'hire-d.scope', side: 'recruiter',
  match: (c) => {
    if (!hirer(c) || /\b(disagree|conflict|differ)\b/.test(c.norm)) return 0;
    if (/\blinked ?in\b/.test(c.norm)) return 0.9;
    if (/\b(leave out|exclude|stop using|start using|switch (off|on)|turn (off|on)|include)\b/.test(c.norm) && SRC_WORDS.some(([re]) => re.test(c.norm)) && /\bsearch\w*\b/.test(c.norm)) return 0.91;
    if (/\b(sources?|search scope|where (do|does) (you|q) (search|look))\b/.test(c.norm) && /\b(search|use|which|what|where|scope|include|exclude|leave out|turn (off|on)|stop using)\b/.test(c.norm)) return 0.9;
    return 0;
  },
  handle: (c) => {
    const a = c.actor; const off = /\b(leave out|exclude|turn off|stop using|switch off|don ?t use|do not use)\b/.test(c.norm); const on = /\b(include|turn on|start using|switch on|add)\b/.test(c.norm);
    const src = SRC_WORDS.find(([re]) => re.test(c.norm))?.[1];
    if (src && (off || on)) return opReply('hd.scope.set', { source: src, on: !off });
    const list = sourcesFor(c.w, a.orgId!); const cur = scopeOn(c.w, a.orgId!);
    const li = /\blinked ?in\b/.test(c.norm);
    return { msgs: [{ kind: 'reply', text: `${li ? `${NOT_USED[0].why} ` : ''}I search ${cur.length} of ${list.length} permitted sources for ${c.w.orgs.find((o) => o.id === a.orgId)?.name}: ${list.filter((s) => cur.includes(s.id)).map((s) => `${SOURCE_SHORT[s.id]} (${coverage(c.w, a.orgId!, s.id) ?? 'unknown'})`).join('; ')}. Each shows its licence and how fresh it is.`, used: ['Your search sources', 'Decision 30 Oct: no LinkedIn extraction'], actions: [go('Open the sources', '/r/sourcing/scope', true), go('Explore talent', '/r/explore')] }] };
  },
});

// ---------------- SC-034 / SC-046 explore ----------------
registerSkill({
  id: 'hire-d.explore', side: 'recruiter',
  match: (c) => (hirer(c) && (/\bexplore\b/.test(c.norm) || /\bsaved? (searches|search|discover\w*)\b/.test(c.norm) || /\bsave (this|the) search\b/.test(c.norm)) ? 0.86 : 0),
  handle: (c) => {
    const a = c.actor; const key = `${a.id}|/r/explore`;
    if (/\bsave (this|the) search\b/.test(c.norm)) { const q = String(c.w.q.ui[key]?.q ?? ''); if (!q) return { msgs: [{ kind: 'reply', text: 'Search for something on Explore first, then I’ll save it.' }], nav: { to: '/r/explore', label: 'explore talent' } }; return opReply('hd.explore.save', { query: q, seen: search(c.w, a.orgId!, q).map((h) => h.pid) }); }
    const q = c.norm.replace(/^.*?\bexplore\b\s*(talent\s*)?(for\s*)?/, '').replace(/[?.!]/g, '').trim();
    if (!q || /\b(saved|landing|page)\b/.test(q)) {
      const saved = hd(c.w).saved.filter((s) => s.orgId === a.orgId);
      return { msgs: [{ kind: 'reply', text: saved.length ? `You have ${saved.length} saved ${saved.length === 1 ? 'search' : 'searches'}: ${saved.map((s) => `“${s.label}”`).join(', ')}. I re-run them against today’s permissions when you open them.` : 'Nothing saved yet. Tell me who you’re looking for.' }], nav: { to: '/r/explore', label: 'explore talent' } };
    }
    const hits = search(c.w, a.orgId!, q);
    return { msgs: [{ kind: 'reply', text: hits.length ? `${hits.length} ${hits.length === 1 ? 'person' : 'people'} for “${q}” in your permitted sources: ${hits.slice(0, 4).map((h) => personOf(c.w, h.pid)?.name).join(', ')}${hits.length > 4 ? '…' : ''}. Matched on words in what they shared, not a score.` : `No one found for “${q}”. I’ve put the reasons and what might help on the page.`, actions: hits.length ? [doOp('Save this search', 'hd.explore.save', { query: q, seen: hits.map((h) => h.pid) })] : [] }],
      effects: (w, me) => { (w.q.ui[`${me.id}|/r/explore`] ??= {}).q = q; }, nav: { to: '/r/explore', label: 'explore talent' } };
  },
});

// ---------------- SC-053 booking ----------------
registerSkill({
  id: 'hire-d.book', side: 'recruiter',
  match: (c) => (hirer(c) && /\bbook\b/.test(c.norm) && /\b(interview|time|slot|call)\b/.test(c.norm) && !/\b(draft|find|propose)\b/.test(c.norm) && pipelinePerson(c) ? 0.94 : 0),
  handle: (c) => {
    const pid = pipelinePerson(c)!; const f = firstOf(c.w, pid);
    const panel = defaultPanel(c.w, c.actor, entryFor(c.w, pid, c.actor.orgId)?.mandateId);
    const s = bookingSlots(c.w, c.actor, pid, panel).filter((x) => x.fits !== false).slice(0, 2);
    const av = availOf(c.w, pid);
    return { msgs: [{ kind: 'reply', text: s.length ? `${av ? `${f} said “${av.text}”. ` : ''}The first mutual times: ${s.map((x) => `${tDay(x.start, LAGOS)} ${tTime(x.start, LAGOS)} Lagos`).join(' or ')}. Pick one on the booking page; I’ll hold it for the panel and draft the invitation. Nothing goes to ${f} until you approve.` : `I can’t find a mutual time for ${f} next week. The booking page shows what’s ruled out and why.`,
      actions: s[0] ? [doOp(`Hold ${tDay(s[0].start, LAGOS)} ${tTime(s[0].start, LAGOS)}`, 'hd.book', { personId: pid, start: s[0].start, end: s[0].end, panel }, true)] : [] }], nav: { to: `/r/calendar/book/${pid}`, label: 'interview booking' } };
  },
});

// ---------------- SC-056 stage ----------------
registerSkill({
  id: 'hire-d.stage', side: 'recruiter',
  match: (c) => {
    if (!hirer(c) || !pipelinePerson(c)) return 0;
    if (/\b(what stage|which stage|stage detail|where is \w+ (in|at)|where.*(pipeline|process))\b/.test(c.norm)) return 0.9;
    if (/\b(add a )?note (on|about|for) \w+/.test(c.norm) && /:/.test(c.text) && !/\b(tunde|dele)\b/.test(c.norm)) return 0.92;
    return 0;
  },
  handle: (c) => {
    const pid = pipelinePerson(c)!; const e = entryFor(c.w, pid, c.actor.orgId)!; const f = firstOf(c.w, pid);
    if (/:/.test(c.text) && /\bnote\b/.test(c.norm)) return opReply('hd.note.add', { mandateId: e.mandateId, personId: pid, text: c.text.split(':').slice(1).join(':').trim() });
    const due = hd(c.w).due[`${e.mandateId}:${pid}`];
    return { msgs: [{ kind: 'reply', text: `${f} is at ${STAGE_LABEL[e.stage]} since ${fmtDay(e.at)}.${due ? ` Next: ${due.what}, due ${fmtDay(due.date)}.` : ' No due date set.'}` }], nav: { to: `/r/pipeline/${e.mandateId}/${pid}`, label: 'stage detail' } };
  },
});

// ---------------- SC-058 offer ----------------
registerSkill({
  id: 'hire-d.offer', side: 'recruiter',
  match: (c) => {
    if (!hirer(c) || !/\boffers?\b/.test(c.norm) || /\b(send|extend|issue|give|make|email)\b/.test(c.norm)) return 0;
    if (/\bapprove\b/.test(c.norm)) return 0.95;
    return /\b(prepare|draft|start|open|show|status|where)\b/.test(c.norm) && pipelinePerson(c) ? 0.95 : 0;
  },
  handle: (c) => {
    if (/\bapprove\b/.test(c.norm)) {
      const o = hd(c.w).offers.find((x) => x.orgId === c.actor.orgId && x.state === 'AWAITING_APPROVAL' && x.approvals.some((y) => y.who === c.actor.id && (!y.at || y.voided)));
      if (!o) return { msgs: [{ kind: 'reply', text: 'No offer is waiting for your approval.' }] };
      return { msgs: [{ kind: 'approval', text: `The offer for ${firstOf(c.w, o.personId)} is v${o.versions.length}: ${o.amount ? `₦${(o.amount / 1e6).toFixed(2)}m a month` : 'no amount'}. Approve this exact version?`, actions: [doOp(`Approve v${o.versions.length}`, 'hd.offer.approve', { id: o.id }, true), go('Open the offer', `/r/offer/${o.mandateId}/${o.personId}`)] }] };
    }
    const pid = pipelinePerson(c)!; const e = entryFor(c.w, pid, c.actor.orgId)!;
    if (offerOf(c.w, e.mandateId, pid)) return { msgs: [{ kind: 'reply', text: `Here’s ${firstOf(c.w, pid)}’s offer.` }], nav: { to: `/r/offer/${e.mandateId}/${pid}`, label: 'the offer' } };
    return opReply('hd.offer.draft', { mandateId: e.mandateId, personId: pid }, { to: `/r/offer/${e.mandateId}/${pid}`, label: 'the offer' });
  },
});

// ---------------- SC-060 placements ----------------
registerSkill({
  id: 'hire-d.outcomes', side: 'recruiter',
  match: (c) => (hirer(c) && /\b(placements?|placement record|outcome journal|check-?ins?|90-day|30-day|new hires?)\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const list = hd(c.w).outcomes.filter((o) => o.orgId === c.actor.orgId);
    const due = list.map((o) => ({ o, n: nextMilestone(o) })).filter((x) => x.n?.due);
    return { msgs: [{ kind: 'reply', text: list.length ? `${list.length} placement record${list.length === 1 ? '' : 's'}. ${due.length ? due.map((x) => `${x.o.name}: ${MILESTONE_WORD[x.n!.kind].toLowerCase()} due ${fmtDay(x.n!.due!)}${daysBetween(simNow(c.w), x.n!.due!) < 0 ? ' (late)' : ''}`).join('; ') + '.' : 'Nothing due.'} Only milestones a person verified, with the new hire’s agreement; never used to score anyone.` : 'No placements yet. A record starts when someone accepts an offer and a person records it.' }], nav: { to: '/r/outcomes', label: 'placements' } };
  },
});

// ---------------- SC-159 reminders and MO-046 delivery ----------------
const REM = /\b(reminders?|follow-?ups?)\b/;
registerSkill({
  id: 'hire-d.reminders', side: 'recruiter',
  match: (c) => {
    if (!hirer(c) || !REM.test(c.norm) || /\b(pause|resume|run|automation|automatic|stop the)\b/.test(c.norm)) return 0;
    if (/\b(deliver\w*|read|receiv\w*|open(ed)?|get)\b/.test(c.norm) && peopleIn(c).length) return 0.9;
    if (/\b(approve|queue|due|waiting|need|which|what|show|list)\b/.test(c.norm)) return 0.87;
    return 0;
  },
  handle: (c) => {
    const a = c.actor; const pid = peopleIn(c)[0];
    if (pid && /\b(deliver\w*|read|receiv\w*|open(ed)?|get)\b/.test(c.norm)) return deliveryReply(c, a, pid);
    const q = reminderQueue(c.w, a.orgId!);
    if (/\bapprove\b/.test(c.norm)) {
      const it = q.find((x) => !x.decision && !x.blocked && (!pid || x.personId === pid));
      if (!it) return { msgs: [{ kind: 'reply', text: 'Nothing in the reminder queue is waiting for approval.' }], nav: { to: '/r/reminders', label: 'reminders' } };
      return opReply('hd.rem.approve', { id: it.id }, { to: '/r/reminders', label: 'reminders' });
    }
    const todo = q.filter((x) => !x.decision && !x.blocked); const blocked = q.filter((x) => !x.decision && x.blocked);
    return { msgs: [{ kind: 'reply', text: `${todo.length ? `${todo.length} waiting for your yes: ${todo.map((x) => `${x.title.toLowerCase()} (by ${x.channel ? CH_WORD[x.channel] : '—'}, ${tDay(x.sendAt, LAGOS)} ${tTime(x.sendAt, LAGOS)})`).join('; ')}.` : 'Nothing is waiting for approval.'}${blocked.length ? ` ${blocked.length} won’t send: ${blocked.map((x) => x.blocked).join(' ')}` : ''}`, actions: todo[0] ? [doOp(`Approve: ${todo[0].title}`, 'hd.rem.approve', { id: todo[0].id }, true), go('Open reminders', '/r/reminders')] : [go('Open reminders', '/r/reminders')] }] };
  },
});
registerSkill({
  id: 'hire-d.delivery', side: 'recruiter',
  match: (c) => (hirer(c) && /\b(delivered|deliver|read it|read the|opened|did \w+ (get|see|read))\b/.test(c.norm) && /\b(invitation|invite|message|reminder|email|update)\b/.test(c.norm) && peopleIn(c).length ? 0.89 : 0),
  handle: (c) => deliveryReply(c, c.actor, peopleIn(c)[0]),
});
function deliveryReply(c: QCtx, a: Actor, pid: string): QReply {
  const f = firstOf(c.w, pid);
  const m = c.w.threads.filter((t) => t.orgId === a.orgId && t.personId === pid).flatMap((t) => t.messages).filter((x) => x.from !== pid && x.status === 'SENT_SIMULATED').sort((x, y) => y.at.localeCompare(x.at))[0];
  if (!m) return { msgs: [{ kind: 'reply', text: `Nothing has been sent to ${f} yet.` }] };
  const r = railOf(c.w, m.id)!;
  const text = r.failed ? `“${m.subject}” wasn’t sent: ${r.failed.toLowerCase()}.` : `“${m.subject}”: accepted by the provider${r.delivered ? ', delivered' : ', no delivery receipt yet'}${r.read ? `, and read (${r.readWhy})` : `. ${r.readNa ?? `Not opened yet`}`}. Accepted isn’t delivered, and delivered isn’t read. All simulated.`;
  return { msgs: [{ kind: 'reply', text, ref: { type: 'hire-d.delivery', id: m.id } }] };
}
