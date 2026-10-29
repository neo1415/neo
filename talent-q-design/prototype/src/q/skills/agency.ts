// Q skills for the agency (R4, Dele at Talentbridge; Tunde is a Viewer). Everything on the agency pages can
// be done by typing to Q in imperfect language. Tenant isolation is a hard rule: a reply only ever names
// the client in question's records, and requests that mix Kora Pay and Medlink Health are declined.
import { actorOf, canSeeCandidate, emit, simNow, type World } from '../../mock/world';
import type { Actor, QAction } from '../../state/domain';
import { appendQ, pushUndo, registerOp, registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import { agency, type AgentRun, type ClientId } from '../../state/areas/agency';
import {
  AP, AGENCY_ID, mandatePeople, SCOPE, ag, addNote, lc, agencyMandates, briefSigned, buildReport, canAct, canSeeMandate, cancelRun, clientIds, clientName, clientShort, clientsIn, conflicts, consentReason, consentState,
  deniedReason, draftSubmittal, focusOf, fmtDay, interrupt, isAgency, isWithdrawn, isolationCheck, launchCampaign, mandateOf, messageFor, owners, pauseRun, peopleFor, personName, pipelineFor, poolsFor, prioritise,
  ranked, requestAccess, rerunSearch, resumeRun, retryRun, runsFor, searchesFor, sendSubmittal, setFocus, today, withdrawConsent, PRIORITY, RUN_STATE,
} from '../../journeys/agency/model';

const on = (c: QCtx) => c.actor.side === 'recruiter' && isAgency(c.w, c.actor);
const short = (w: World, id: ClientId) => clientShort(w, id);
const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ten: 10 };
const numIn = (norm: string) => { const m = norm.match(/\b(?:top|best|first|only|just|make it)\s+(\d+|one|two|three|four|five|six|seven|eight|ten)\b/) ?? norm.match(/\b(\d+|three|four|five|six)\s+(?:people|candidates|of them|names)\b/); return m ? (NUM[m[1]] ?? Number(m[1])) : undefined; };
const STOP = /\b(stop|pause|halt|hold off|freeze|interrupt|suspend)\b/;
const URGENT = /\b(urgent|urgently|priorit\w*|first|focus on|asap|rush|instead)\b/;
const PAGE = '/r/agency';
const qReply = (w: World, a: Actor, text: string, actions?: QAction[]) => appendQ(w, a.id, { who: 'q', kind: 'reply', engine: 'rules', text, actions });
const say = (text: string, extra: Partial<QReply['msgs'][number]> = {}): QReply => ({ msgs: [{ kind: 'reply', text, ...extra }] });
const viewerNo = (_c: QCtx, what: string): QReply => ({ msgs: [{ kind: 'refusal', text: `Your role at Talentbridge is Viewer, so you can read pools, searches and notes, but you can’t ${what}. Dele or an admin can do that. I can leave Dele a note for you if you like.`, actions: [{ label: 'Leave Dele a note', act: { t: 'say', text: `note for dele: please ${what}` } }] }], effects: (w, a) => emit(w, a.id, 'agency.role.declined', SCOPE, `Q declined “${what}” for ${a.first} (Viewer role).`) });
const clientOf = (c: QCtx) => clientsIn(c.norm)[0] ?? focusOf(c.w, c.actor.id);
const focusFx = (client: ClientId) => (w: World, a: Actor) => setFocus(w, a.id, client);
const setUi = (w: World, a: Actor, key: string, v: unknown) => { (w.q.ui[`${a.id}|${PAGE}`] ??= {})[key] = v; };

function findPool(w: World, norm: string, client?: ClientId) {
  const pools = agency(w).pools.filter((p) => !client || p.clientOrgId === client);
  const kw: [string, RegExp][] = [['pool_kora_pay', /\b(payment\w*|pay|fintech|go)\b/], ['pool_med_ops', /\b(ops|operations?|analysts?)\b/], ['pool_med_api', /\b(remote|backend|api|claims)\b/]];
  for (const [id, re] of kw) if (re.test(norm) && pools.some((p) => p.id === id)) return pools.find((p) => p.id === id)!;
  return client ? pools[0] : undefined;
}
function findSearch(w: World, norm: string, client: ClientId) {
  const list = searchesFor(w, client);
  const scored = list.map((s) => ({ s, n: s.keywords.filter((k) => new RegExp(`\\b${k}\\b`).test(norm)).length })).sort((a, b) => b.n - a.n);
  return scored[0]?.n ? scored[0].s : list[0];
}
function findRuns(w: World, norm: string, client?: ClientId): AgentRun[] {
  let rs = agency(w).runs.filter((r) => !client || r.clientOrgId === client);
  if (/\bcampaign\b/.test(norm)) rs = rs.filter((r) => r.kind === 'CAMPAIGN');
  else if (/\bevidence|checks?\b/.test(norm)) rs = rs.filter((r) => r.kind === 'EVIDENCE');
  else if (/\b(ops|operations?|analyst)\b/.test(norm)) rs = rs.filter((r) => r.mandateId === 'm_ops');
  else if (/\b(backend|api)\b/.test(norm)) rs = rs.filter((r) => /backend/i.test(r.label));
  else if (/\bsearch\w*\b/.test(norm)) rs = rs.filter((r) => r.kind === 'SEARCH');
  return rs;
}

// ---------------- Tenant isolation: never mix clients ----------------
const MIX = /\b(on|onto|into|in|to|with|from|combine|merge|together|mix|share|add|include|both|across|compare|alongside|plus|next to)\b/;
const RECORDS = /\b(reports?|candidates?|people|pools?|submittals?|shortlists?|notes?|results|lists?|data|records?|pipelines?|names|cvs?|profiles?|searches|search)\b/;
registerSkill({
  id: 'agency.isolation', side: 'recruiter',
  match: (c) => (on(c) && clientsIn(c.norm).length >= 2 && MIX.test(c.norm) && RECORDS.test(c.norm) && !STOP.test(c.norm) && !/\b(conflict|clash|resume|run|rerun|re-run|again|urgent|priorit\w*)\b/.test(c.norm) ? 0.96 : 0),
  handle: (c) => {
    const [a, b] = clientsIn(c.norm);
    const target = /\b(on|onto|into|to|in front of)\s+(the\s+)?(kora|med ?link)\w*/.exec(c.norm)?.[3]?.startsWith('kora') ? 'org_kora' : /\b(on|onto|into|to|in front of)\s+(the\s+)?med/.test(c.norm) ? 'org_medlink' : a;
    const other = target === a ? b : a;
    return {
      msgs: [{ kind: 'refusal', text: `I can’t do that. ${clientName(c.w, other)}’s candidates, notes and results stay inside ${short(c.w, other)}’s workspace, so I won’t put them in front of ${clientName(c.w, target)} or into anything ${short(c.w, target)} sees, including reports. That’s Talentbridge’s first rule (“Client data stays inside that client’s workspace”), and each candidate agreed to be put forward to a specific client. If someone from ${short(c.w, other)}’s side would also suit ${short(c.w, target)}, I can ask that person for consent to be considered for ${short(c.w, target)} as a separate record.`,
        why: 'Tenant isolation: one client’s records never appear in another client’s view, search, reply or report',
        actions: [{ label: `Open the ${short(c.w, target)} report`, primary: true, act: { t: 'say', text: `open the ${short(c.w, target)} report` } }, { label: `Show ${short(c.w, other)} separately`, act: { t: 'say', text: `switch to ${short(c.w, other)}` } }] }],
      effects: (w, act) => emit(w, act.id, 'agency.isolation.declined', SCOPE, `Q declined a request that would mix ${clientName(w, a)} and ${clientName(w, b)} records.`),
    };
  },
});

// ---------------- Interrupt, pause, resume, cancel, prioritise ----------------
registerSkill({
  id: 'agency.interrupt', side: 'recruiter',
  match: (c) => (on(c) && STOP.test(c.norm) && (clientsIn(c.norm).length > 0 || /\b(search|agents?|runs?|campaign|everything|all)\b/.test(c.norm)) && !/\b(suggest|reminders?|tips)\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    if (!canAct(c.actor)) return viewerNo(c, 'pause or redirect agents');
    const named = clientsIn(c.norm);
    const stopRe = /\b(stop|pause|halt|hold off|freeze|interrupt|suspend)\b(?:\s+\w+){0,3}?\s+(kora|med ?link)\w*/;
    const sm = stopRe.exec(c.norm);
    const stop: ClientId | undefined = sm ? (sm[2].startsWith('kora') ? 'org_kora' : 'org_medlink') : named.length === 1 && !URGENT.test(c.norm) ? named[0] : named.find((x) => !new RegExp(`${short(c.w, x).toLowerCase()}\\w*\\s+(is|are)?\\s*(urgent|first|priority)`).test(c.norm));
    const urgent = URGENT.test(c.norm) ? named.find((x) => x !== stop) ?? null : null;
    if (!stop) {
      // "pause the ops search" or "stop everything": specific runs rather than a whole client.
      const rs = findRuns(c.w, c.norm).filter((r) => ['RUNNING', 'QUEUED', 'RETRYING'].includes(r.state));
      if (!rs.length) return say('Nothing that matches is running right now, so there’s nothing to pause.');
      return { msgs: [{ kind: 'reply', text: `Paused ${rs.map((r) => `${short(c.w, r.clientOrgId)} · ${r.label} at ${r.done} of ${r.total}`).join('; ')}. Finished work is kept; say “resume” to continue from there.` }],
        effects: (w, a) => { for (const r of rs) pauseRun(w, a, ag(w).runs.find((x) => x.id === r.id)!, 'Paused by you; resumes from here.'); pushUndo(w, a.id, 'pause agents', 'agency.runs.resume', { ids: rs.map((r) => r.id) }); }, nav: { to: AP.agents, label: 'agents' } };
    }
    const toPause = runsFor(c.w, stop).filter((r) => ['RUNNING', 'QUEUED', 'RETRYING'].includes(r.state));
    const toRaise = urgent ? runsFor(c.w, urgent).filter((r) => !['DONE', 'CANCELLED'].includes(r.state)) : [];
    const failedStop = runsFor(c.w, stop).filter((r) => r.state === 'FAILED');
    return {
      msgs: [{ kind: 'reply', text: `${toPause.length ? `Paused ${short(c.w, stop)}’s ${toPause.length === 1 ? 'agent' : `${toPause.length} agents`}: ${toPause.map((r) => `${r.label.toLowerCase()} at ${r.done} of ${r.total}`).join(', ')}. Nothing finished is lost and each resumes from where it stopped.` : `${short(c.w, stop)} had nothing running to pause.`}${failedStop.length ? ` (${failedStop.map((r) => r.label.toLowerCase()).join(', ')} was already stopped by the provider outage.)` : ''}${urgent ? ` ${short(c.w, urgent)} is now urgent: ${toRaise.length ? `${toRaise.map((r) => r.label.toLowerCase()).join(' and ')} ${toRaise.length === 1 ? 'takes' : 'take'} the free slots first.` : `I’ve started an urgent ${short(c.w, urgent)} search (${searchesFor(c.w, urgent)[0]?.name ?? 'its main saved search'}); it takes the first free slot.`}` : ''}`,
        used: [`${clientName(c.w, stop)} · ${toPause.length} running`, ...(urgent ? [`${clientName(c.w, urgent)} · ${toRaise.length} ${toRaise.length === 1 ? 'agent' : 'agents'}`] : [])],
        actions: [{ label: `Resume ${short(c.w, stop)}`, act: { t: 'say', text: `resume ${short(c.w, stop)}` } }, { label: 'Show agents', primary: true, act: { t: 'nav', to: AP.agents } }] }],
      effects: (w, a) => { interrupt(w, a, stop, urgent); if (urgent) setFocus(w, a.id, urgent); pushUndo(w, a.id, `pause ${short(w, stop)}`, 'agency.runs.resume', { ids: toPause.map((r) => r.id) }); },
      nav: { to: AP.agents, label: 'agents' }, frame: null,
    };
  },
});
registerSkill({
  id: 'agency.resume', side: 'recruiter',
  match: (c) => (on(c) && /\b(resume|unpause|carry on|continue|restart|pick up|start again)\b/.test(`${c.norm} ${c.text.toLowerCase()}`) && !/\breport\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    if (!canAct(c.actor)) return viewerNo(c, 'resume agents');
    const named = clientsIn(c.norm);
    const rs = findRuns(c.w, c.norm, named[0]).filter((r) => r.state === 'PAUSED');
    if (!rs.length) return say(named[0] ? `Nothing of ${short(c.w, named[0])}’s is paused.` : 'Nothing is paused right now.');
    return { msgs: [{ kind: 'reply', text: `Resumed ${rs.map((r) => `${short(c.w, r.clientOrgId)} · ${r.label.toLowerCase()} from ${r.done} of ${r.total}`).join('; ')}. ${rs.length > 1 || agency(c.w).runs.filter((r) => r.state === 'RUNNING').length >= 3 ? 'Three agents run at once; the rest wait for a slot in priority order.' : ''}`.trim() }],
      effects: (w, a) => { for (const r of rs) resumeRun(w, a, ag(w).runs.find((x) => x.id === r.id)!); }, nav: { to: AP.agents, label: 'agents' } };
  },
});
registerSkill({
  id: 'agency.priority', side: 'recruiter',
  match: (c) => (on(c) && /\b(urgent|prioriti[sz]e|priority|bump|move up|lower|deprioriti[sz]e|less important)\b/.test(c.norm) && !STOP.test(c.norm) && clientsIn(c.norm).length === 1 ? 0.88 : 0),
  handle: (c) => {
    if (!canAct(c.actor)) return viewerNo(c, 'change agent priorities');
    const client = clientsIn(c.norm)[0]; const p: 1 | 3 = /\b(lower|deprioriti[sz]e|less important)\b/.test(c.norm) ? 3 : 1;
    const rs = runsFor(c.w, client).filter((r) => !['DONE', 'CANCELLED'].includes(r.state));
    return { msgs: [{ kind: 'reply', text: rs.length ? `${short(c.w, client)}’s ${rs.length === 1 ? 'agent is' : `${rs.length} agents are`} now ${PRIORITY[p].toLowerCase()} priority.${p === 1 ? ' They take free slots first; I haven’t paused anyone else’s work.' : ''}` : `${short(c.w, client)} has no agents running.` }],
      effects: (w, a) => { for (const r of rs) prioritise(w, a, ag(w).runs.find((x) => x.id === r.id)!, p); }, nav: { to: AP.agents, label: 'agents' } };
  },
});
registerSkill({
  id: 'agency.cancel', side: 'recruiter',
  match: (c) => (on(c) && /\b(cancel|kill|abort|scrap)\b/.test(c.norm) && /\b(search|agent|run|campaign|checks?|evidence)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    if (!canAct(c.actor)) return viewerNo(c, 'cancel agents');
    const rs = findRuns(c.w, c.norm, clientsIn(c.norm)[0]).filter((r) => !['DONE', 'CANCELLED'].includes(r.state));
    if (!rs.length) return say('I couldn’t find a running agent that matches. Which one: the search, the evidence checks or a campaign?');
    const r = rs[0];
    return { msgs: [{ kind: 'approval', text: `Cancel ${short(c.w, r.clientOrgId)} · ${r.label} at ${r.done} of ${r.total}? Finished work is kept, but it won’t continue and can’t be resumed. Pausing keeps it resumable.`,
      actions: [{ label: 'Cancel it', primary: true, act: { t: 'do', op: 'agency.run.cancel', args: { id: r.id } } }, { label: 'Pause instead', act: { t: 'do', op: 'agency.run.pause', args: { id: r.id } } }] }] };
  },
});

// ---------------- Provider outage: explain and recover ----------------
registerSkill({
  id: 'agency.retry', side: 'recruiter',
  match: (c) => (on(c) && (/\b(retry|try again|try it again)\b/.test(c.norm) || /\bskip\b.*\b(provider|job ?board|jobboard)\b/.test(c.norm) || (/\b(fail\w*|outage|broken|stuck|went wrong|what happened|down)\b/.test(c.norm) && /\b(search|agent|run|provider|job ?board|ops)\b/.test(c.norm))) ? 0.91 : 0),
  handle: (c) => {
    const failed = agency(c.w).runs.filter((r) => r.state === 'FAILED' || r.state === 'RETRYING');
    const r = failed[0];
    if (!r) {
      const rec = agency(c.w).runs.find((x) => x.providerState === 'RECOVERED' || x.providerState === 'SKIPPED');
      return say(rec ? `Nothing is failing now. Earlier, ${rec.provider} stopped answering during the ${short(c.w, rec.clientOrgId)} ${rec.label.toLowerCase()}; it ${rec.providerState === 'RECOVERED' ? 'recovered after a retry' : 'was skipped'} and the run carried on from where it stopped.` : 'All agents are healthy; nothing has failed.');
    }
    if (/\b(retry|try again|try it again)\b/.test(c.norm) || /\bskip\b/.test(c.norm)) {
      if (!canAct(c.actor)) return viewerNo(c, 'retry agents');
      const skip = /\bskip\b/.test(c.norm);
      return { msgs: [{ kind: 'reply', text: skip ? `Skipping ${r.provider} for the ${short(c.w, r.clientOrgId)} ${r.label.toLowerCase()}. It continues from ${r.done} of ${r.total} on the Talent Q network only, so it may find fewer people.` : `Retrying ${r.provider} for the ${short(c.w, r.clientOrgId)} ${r.label.toLowerCase()} now. If it answers, the run continues from ${r.done} of ${r.total}; nothing already read is repeated.` }],
        effects: (w, a) => { retryRun(w, a, ag(w).runs.find((x) => x.id === r.id)!, skip); }, nav: { to: AP.agents, label: 'agents' } };
    }
    return { msgs: [{ kind: 'reply', text: `${r.provider}, the job board the ${short(c.w, r.clientOrgId)} ${r.label.toLowerCase()} reads from, stopped responding at profile ${r.done} of ${r.total} (a simulated outage). I kept the ${r.done} profiles already read, retried once automatically${r.state === 'RETRYING' ? ' and am retrying now' : ', and it’s still down'}. Only this agent is affected; the other ${agency(c.w).runs.filter((x) => x.id !== r.id && x.state === 'RUNNING').length} running agents are fine.`,
      why: `Attempts so far: ${r.attempts}. Provider status: ${r.providerState === 'DOWN' ? 'not responding' : r.providerState.toLowerCase()}`,
      actions: [{ label: 'Retry now', primary: true, act: { t: 'do', op: 'agency.run.retry', args: { id: r.id } } }, { label: `Skip ${r.provider}`, act: { t: 'do', op: 'agency.run.skip', args: { id: r.id } } }] }] };
  },
});

// ---------------- Saved searches: re-run and diff ----------------
registerSkill({
  id: 'agency.rerun', side: 'recruiter',
  match: (c) => (on(c) && ((/\b(run|rerun|re-run|refresh|redo|repeat|again)\b/.test(c.norm) && /\bsearch\w*\b/.test(c.norm)) || /\b(what is new|anything new|new matches|new people|who is new)\b/.test(c.norm)) && !STOP.test(c.norm) && !/\b(retry|try again)\b/.test(c.norm) ? 0.92 : 0),
  handle: (c) => {
    const client = clientOf(c); const s = findSearch(c.w, c.norm, client);
    if (!s) return say(`${short(c.w, client)} has no saved searches yet.`);
    const t = today(c.w);
    const nowIds = s.universe.filter((u) => u.since <= t && canSeeCandidate(c.w, u.personId, AGENCY_ID)).map((u) => u.personId);
    const added = nowIds.filter((p) => !isWithdrawn(c.w, p) && !s.results.includes(p));
    const dropped = nowIds.filter((p) => isWithdrawn(c.w, p) && s.results.includes(p));
    const total = nowIds.filter((p) => !isWithdrawn(c.w, p)).length;
    return {
      msgs: [{ kind: 'reply', text: `I re-ran “${s.name}” for ${clientName(c.w, client)}. ${total} matches now; ${added.length ? `${added.length} new since ${fmtDay(s.lastRunAt)}: ${added.map((p) => personName(c.w, p)).join(', ')}.` : `nothing new since ${fmtDay(s.lastRunAt)}.`}${dropped.length ? ` ${dropped.map((p) => personName(c.w, p)).join(', ')} no longer appear${dropped.length === 1 ? 's' : ''}: withdrew consent.` : ''} I only searched ${short(c.w, client)}’s criteria; nothing was contacted.`,
        used: [`Saved search · ${s.name}`, `Last run ${fmtDay(s.lastRunAt)}`],
        actions: added.length ? [{ label: `Add ${added.length === 1 ? 'them' : 'them all'} to the pool`, primary: true, act: { t: 'do', op: 'agency.pool.add', args: { searchId: s.id } } }, { label: 'Show the search', act: { t: 'nav', to: AP.searches } }] : [{ label: 'Show the search', act: { t: 'nav', to: AP.searches } }] }],
      effects: (w, a) => { setFocus(w, a.id, client); rerunSearch(w, a, s.id); },
      nav: { to: AP.searches, label: 'saved searches' },
    };
  },
});

// ---------------- Submittals: shortlist to a client, consent checked per person ----------------
const SUBMIT = /\b(submit|in front of|put forward|forward|present|send (them|the|over|across)|send .* to (kora|med)|shortlist (to|for))\b/;
registerSkill({
  id: 'agency.submit', side: 'recruiter',
  match: (c) => (on(c) && SUBMIT.test(c.norm) && !/\b(report|campaign|note)\b/.test(c.norm) && clientsIn(c.norm).length <= 1 ? 0.92 : 0),
  handle: (c) => {
    if (!canAct(c.actor)) return viewerNo(c, 'send submittals to clients');
    const target = clientOf(c);
    const pool = findPool(c.w, c.norm) ?? poolsFor(c.w, target)[0];
    if (!pool) return say(`${short(c.w, target)} has no talent pool yet, so there’s no one to put forward.`);
    if (pool.clientOrgId !== target) {
      return { msgs: [{ kind: 'refusal', text: `The ${pool.name} pool belongs to ${clientName(c.w, pool.clientOrgId)}, so I can’t put it in front of ${clientName(c.w, target)}. Each client only ever sees candidates gathered for them (“Client data stays inside that client’s workspace”). For ${short(c.w, target)}, I can use: ${poolsFor(c.w, target).map((p) => p.name).join(', ')}.`,
        why: 'Tenant isolation', actions: poolsFor(c.w, target).map((p, i) => ({ label: `Use ${p.name}`, primary: i === 0, act: { t: 'say', text: `put the top ${numIn(c.norm) ?? 5} from the ${p.name.toLowerCase()} pool in front of ${short(c.w, target)}` } })) }],
        effects: (w, a) => emit(w, a.id, 'agency.isolation.declined', SCOPE, `Q declined submitting a ${short(w, pool.clientOrgId)} pool to ${short(w, target)}.`) };
    }
    return draftReply(c, target, pool.id, numIn(c.norm) ?? 5, false);
  },
  answer: (c) => {
    const f = c.frame; if (!f || f.awaiting !== 'approve') return null;
    const id = f.slots.id;
    if (c.ents.yes && !numIn(c.norm)) return { msgs: [], effects: (w, a) => { const r = sendSubmittal(w, a, id); qReply(w, a, r.text); }, frame: null };
    const n = numIn(c.norm);
    if (n && (c.ents.correction || /\b(only|just|make it|instead|top)\b/.test(c.norm))) return draftReply(c, f.slots.client, f.slots.pool, n, true);
    if (c.ents.no || /\b(discard|scrap|do not send|hold it)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: 'Okay, I’ve kept it as a draft and sent nothing. You can change it on the Submittals page or ask me again later.' }], frame: null };
    return null;
  },
});
function draftReply(c: QCtx, client: ClientId, poolId: string, n: number, revised: boolean): QReply {
  const pool = agency(c.w).pools.find((p) => p.id === poolId)!;
  const top = ranked(c.w, pool).slice(0, n);
  const gone = pool.members.filter((p) => isWithdrawn(c.w, p));
  const inc = top.filter((p) => consentState(c.w, p, client) === 'OK');
  const exc = top.filter((p) => consentState(c.w, p, client) !== 'OK');
  const id = `sub_${(agency(c.w).seq + 1).toString(36)}_${Math.round(simNow(c.w).getTime() / 1000 % 1e5)}${Math.random().toString(36).slice(2, 5)}`;
  return {
    msgs: [{ kind: 'approval', text: `${revised ? 'Changed it: ' : ''}Here’s the top ${n} from ${short(c.w, client)}’s ${pool.name} pool, ranked by how many of the role’s must-haves their evidence shows. Ready to send ${inc.length}: ${inc.map((p) => personName(c.w, p)).join(', ') || 'no one'}.${exc.length ? ` Not included: ${exc.map((p) => `${personName(c.w, p)} (${lc(consentReason(c.w, p, client))})`).join('; ')}.` : ''}${gone.length ? ` ${gone.map((p) => personName(c.w, p)).join(', ')} ${gone.length === 1 ? 'isn’t' : 'aren’t'} considered: withdrew consent.` : ''} Send this to ${clientName(c.w, client)}? It’s simulated: nothing leaves Talent Q.`,
      used: [`${short(c.w, client)} · ${pool.name} pool`, 'Consent checked per person', `Mandate · ${mandateOf(c.w, pool.mandateId)?.title}`],
      actions: [{ label: `Send to ${short(c.w, client)} (simulated)`, primary: true, act: { t: 'do', op: 'agency.submittal.sendLatest', args: { client } } }, { label: 'Only the top 3', act: { t: 'say', text: 'actually only the top 3' } }, { label: 'Show the submittal', act: { t: 'nav', to: AP.submittals } }] }],
    effects: (w, a) => { setFocus(w, a.id, client); const s = draftSubmittal(w, a, client, poolId, n); s.id = id; pushUndo(w, a.id, `draft submittal to ${short(w, client)}`, 'agency.submittal.discard', { id }); },
    frame: { intent: 'agency.submit', slots: { id, client, pool: poolId }, awaiting: 'approve', startedAt: new Date().toISOString() },
    nav: { to: AP.submittals, label: 'submittals' },
  };
}

// ---------------- Campaigns (approved-campaign delegation, per-message limits) ----------------
registerSkill({
  id: 'agency.campaign', side: 'recruiter',
  match: (c) => (on(c) && /\b(campaign|outreach|reach out|message the pool|email the pool|contact the pool)\b/.test(c.norm) && !STOP.test(c.norm) && !/\b(cancel|report)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const client = clientOf(c);
    const camp = agency(c.w).campaigns.filter((x) => x.clientOrgId === client).find((x) => (findPool(c.w, c.norm, client)?.id ?? x.poolId) === x.poolId) ?? agency(c.w).campaigns.find((x) => x.clientOrgId === client);
    if (!camp) return say(`${short(c.w, client)} has no campaign set up yet.`);
    const pool = agency(c.w).pools.find((p) => p.id === camp.poolId)!;
    const wantsGo = /\b(start|launch|run|send|go|approve|kick off|begin)\b/.test(c.norm);
    if (!wantsGo) return { msgs: [{ kind: 'reply', text: `“${camp.name}” for ${short(c.w, client)} is ${camp.status === 'DRAFT' ? 'a draft' : camp.status.toLowerCase()}: ${camp.messages.filter((m) => m.status === 'SENT_SIMULATED').length} sent (simulated), ${camp.messages.filter((m) => m.status === 'HELD').length} held, ${camp.messages.filter((m) => m.status === 'EXCLUDED').length} excluded.` }], effects: focusFx(client), nav: { to: AP.campaigns, label: 'campaigns' } };
    if (!canAct(c.actor)) return viewerNo(c, 'launch campaigns');
    if (!briefSigned(c.w, camp.mandateId)) return { msgs: [{ kind: 'refusal', text: `I can’t launch “${camp.name}” yet: ${short(c.w, client)}’s brief for this role isn’t signed, and Talentbridge’s rule is “Campaigns need a signed client brief”. Upload the signed brief and I’ll prepare it.`, actions: [{ label: 'Upload the signed brief (simulated)', primary: true, act: { t: 'say', text: `upload the signed ${short(c.w, client)} brief` } }] }], effects: focusFx(client), nav: { to: AP.docs, label: 'documents' } };
    const members = pool.members.filter((p) => isWithdrawn(c.w, p) || canSeeCandidate(c.w, p, AGENCY_ID));
    const notShown = pool.members.length - members.length;
    const excluded = members.filter((p) => isWithdrawn(c.w, p));
    const eligible = members.filter((p) => !isWithdrawn(c.w, p));
    const now = eligible.slice(0, camp.limits.perRun);
    const sample = messageFor(c.w, camp.template, now[0] ?? members[0]);
    return {
      msgs: [{ kind: 'approval', text: `Ready to launch “${camp.name}” to ${short(c.w, client)}’s ${pool.name} pool under Talentbridge’s approved-campaign setting: you approve the campaign once, and I send within its limits without asking each time. Limits: ${camp.limits.perRun} messages per run, ${camp.limits.perDay} a day, ${camp.limits.maxWords} words each, ${camp.limits.followUps} follow-up. This run: ${now.map((p) => personName(c.w, p)).join(', ')}; ${Math.max(0, eligible.length - now.length)} wait for the next run.${excluded.length ? ` Excluded: ${excluded.map((p) => `${personName(c.w, p)} (withdrew consent)`).join(', ')}.` : ''}${notShown ? ` ${notShown === 1 ? 'One more person' : `${notShown} more people`} in the pool won’t be contacted: their privacy settings don’t allow agencies to reach them.` : ''} First message: “${sample}” Sends are simulated.`,
        used: ['Delegation · approved campaign', `Signed ${short(c.w, client)} brief`, 'Candidate consent'],
        actions: [{ label: 'Approve and launch (simulated)', primary: true, act: { t: 'do', op: 'agency.campaign.launch', args: { id: camp.id } } }, { label: 'Not yet', act: { t: 'say', text: 'not now' } }] }],
      effects: focusFx(client), nav: { to: AP.campaigns, label: 'campaigns' },
      frame: { intent: 'agency.campaign', slots: { id: camp.id }, awaiting: 'approve', startedAt: new Date().toISOString() },
    };
  },
  answer: (c) => {
    const f = c.frame; if (!f || f.awaiting !== 'approve') return null;
    if (c.ents.yes) return { msgs: [], effects: (w, a) => { const r = launchCampaign(w, a, f.slots.id); qReply(w, a, r.text, [{ label: 'Watch it run', act: { t: 'nav', to: AP.agents } }]); }, frame: null };
    if (c.ents.no) return { msgs: [{ kind: 'reply', text: 'Okay, the campaign stays a draft. Nothing was sent.' }], frame: null };
    return null;
  },
});

// ---------------- Collaboration notes with @mentions ----------------
registerSkill({
  id: 'agency.note', side: 'recruiter',
  match: (c) => (on(c) && (/@\w+/.test(c.text) || (/\b(tell|ask|remind|ping|message|note for|note to)\s+(tunde|dele)\b/.test(c.norm) && !/\b(access|see it|see the)\b/.test(c.norm)) || /\b(add|leave|write|make) (a )?note\b/.test(c.norm) || /^note:?\s/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const client = clientOf(c);
    const raw = c.text.replace(/^\s*(please\s+)?(add|leave|write|make)\s+(a\s+)?note\s*(for|to)?\s*/i, '').replace(/^\s*note\s*(for|to)?\s*:?\s*/i, '').trim();
    const text = /\b(tunde|dele)\b/i.test(raw) && !/@/.test(raw) ? raw.replace(/^(tell|ask|remind|let|ping|message)\s+(tunde|dele)\b\s*(to\s+)?/i, (_m, _v, who) => `@${who[0].toUpperCase()}${who.slice(1).toLowerCase()} `).replace(/^(tunde|dele)\b\s*:?\s*/i, (_m, who) => `@${who[0].toUpperCase()}${who.slice(1).toLowerCase()} `) : raw;
    const mention = c.w.actors.filter((a) => a.orgId === AGENCY_ID && a.id !== c.actor.id && new RegExp(`\\b${a.first}\\b`, 'i').test(text));
    return { msgs: [{ kind: 'reply', text: `Added to ${clientName(c.w, client)}’s notes${mention.length ? `, mentioning ${mention.map((a) => a.first).join(' and ')}. ${mention.map((a) => a.first).join(' and ')} will see it under “Mentions you”` : ''}. Only Talentbridge staff can read it; ${short(c.w, client)} never sees internal notes.`, actions: [{ label: 'Show notes', act: { t: 'nav', to: AP.notes } }] }],
      effects: (w, a) => { setFocus(w, a.id, client); const n = addNote(w, a, client, text); pushUndo(w, a.id, 'add a note', 'agency.note.delete', { id: n.id }); } };
  },
});

// ---------------- Client reports ----------------
registerSkill({
  id: 'agency.report', side: 'recruiter',
  match: (c) => (on(c) && /\b(report|status update|update for the client)\b/.test(c.norm) && clientsIn(c.norm).length <= 1 ? 0.9 : 0),
  handle: (c) => {
    const client = clientOf(c);
    const rep = agency(c.w).reports[client];
    if (/\b(share|send|publish|email)\b/.test(c.norm)) {
      if (!canAct(c.actor)) return viewerNo(c, 'share client reports');
      if (!rep) return { msgs: [{ kind: 'reply', text: `There’s no ${short(c.w, client)} report yet. I’ll draft one first from ${short(c.w, client)}’s records only, so you can read and edit it before anything is shared.` }], effects: (w, a) => { setFocus(w, a.id, client); ag(w).reports[client] = buildReport(w, client, a.id); }, nav: { to: AP.reports, label: 'client reports' } };
      const chk = isolationCheck(c.w, rep);
      if (!chk.ok) return { msgs: [{ kind: 'refusal', text: `I can’t share this version: it names ${[...chk.foreignPeople, ...chk.foreignClients].join(', ')}, which ${chk.foreignPeople.length + chk.foreignClients.length === 1 ? 'isn’t' : 'aren’t'} part of ${short(c.w, client)}’s records. Remove ${chk.foreignPeople.length + chk.foreignClients.length === 1 ? 'it' : 'them'} and I’ll check again.`, why: 'Isolation check runs before every share' }], nav: { to: AP.reports, label: 'client reports' } };
      return { msgs: [{ kind: 'approval', text: `Share version ${rep.v} of the ${short(c.w, client)} report${rep.status === 'EDITED' ? ' with your edits' : ''} with ${clientName(c.w, client)}? I checked it: it names only ${short(c.w, client)}’s own candidates and roles. Sharing is simulated.`, used: [`${short(c.w, client)} report v${rep.v}`, 'Isolation check passed'],
        actions: [{ label: `Share with ${short(c.w, client)} (simulated)`, primary: true, act: { t: 'do', op: 'agency.report.share', args: { client } } }, { label: 'Let me edit first', act: { t: 'nav', to: AP.reports } }] }], effects: focusFx(client), nav: { to: AP.reports, label: 'client reports' } };
    }
    const redraft = !rep || /\b(draft|write|prepare|make|create|redo|regenerate|update|refresh|new)\b/.test(c.norm);
    return { msgs: [{ kind: 'reply', text: redraft ? `I’ve drafted ${rep ? `version ${rep.v + 1} of ` : ''}the ${clientName(c.w, client)} report from ${short(c.w, client)}’s records only: ${agencyMandates(c.w, client).length} roles, ${pipelineFor(c.w, client).length} people, submittals and outreach. Edit any section on the page, then tell me to share it.` : `Here’s the ${short(c.w, client)} report (version ${rep!.v}, ${rep!.status === 'SHARED_SIMULATED' ? 'shared' : rep!.status === 'EDITED' ? 'edited by you' : 'draft'}).`,
      used: [`${short(c.w, client)} records only`], actions: [{ label: 'Share it', act: { t: 'say', text: `share the ${short(c.w, client)} report` } }] }],
      effects: (w, a) => { setFocus(w, a.id, client); if (redraft) ag(w).reports[client] = buildReport(w, client, a.id, ag(w).reports[client]); }, nav: { to: AP.reports, label: 'client reports' } };
  },
});

// ---------------- Conflicting client requirements ----------------
registerSkill({
  id: 'agency.conflict', side: 'recruiter',
  match: (c) => (on(c) && (/\b(conflict\w*|clash\w*|contradict\w*|incompatible)\b/.test(c.norm) || (/\b(onsite|on-site|on site|remote)\b/.test(c.norm) && clientsIn(c.norm).length === 2)) ? 0.94 : 0),
  handle: (c) => {
    const cs = conflicts(c.w);
    if (!cs.length) return say('I don’t see any conflicts between your clients’ requirements right now.');
    return { msgs: [{ kind: 'reply', text: cs.map((x) => `${personName(c.w, x.personId)} is in progress for two similar roles with opposite requirements: ${clientName(c.w, x.a.clientOrgId!)} wants ${x.a.workMode === 'ONSITE' ? `on-site (${x.a.location})` : 'remote only'} for ${x.a.title}, and ${clientName(c.w, x.b.clientOrgId!)} wants ${x.b.workMode === 'ONSITE' ? `on-site (${x.b.location})` : 'remote only'} for ${x.b.title}.`).join(' ') + ' They can’t both be right for the same person, so ask the candidate which they actually want before either submittal goes further. I keep the two records separate: neither client will see the other’s role, notes or the fact that the candidate is being considered elsewhere.',
      why: 'Shown to you because you see both clients; never in a client-facing view', used: cs.flatMap((x) => [`${short(c.w, x.a.clientOrgId!)} · ${x.a.workMode.toLowerCase()}`, `${short(c.w, x.b.clientOrgId!)} · ${x.b.workMode.toLowerCase()}`]),
      actions: [{ label: `Ask ${personName(c.w, cs[0].personId).split(' ')[0]} which they prefer (draft)`, primary: true, act: { t: 'say', text: `note for tunde: please check with ${personName(c.w, cs[0].personId).split(' ')[0]} whether they want on-site or remote before we submit` } }] }] };
  },
});

// ---------------- Confidential records and access requests ----------------
registerSkill({
  id: 'agency.access', side: 'recruiter',
  match: (c) => {
    if (!on(c)) return 0;
    if (/\b(request|ask for|need) access\b/.test(c.norm)) return 0.93;
    if (/\b(grant|give|approve|allow|let)\b.*\b(tunde|access|see it)\b/.test(c.norm) && c.actor.role !== 'VIEWER') return 0.95;
    if (/\b(confidential|payouts|via agency|backend engineer \(kora)/.test(c.norm) && /\b(open|show|see|view|read)\b/.test(c.norm)) return 0.92;
    return 0;
  },
  handle: (c) => {
    const m = mandateOf(c.w, 'm_kora_agency')!;
    if (/\b(grant|give|approve|allow|let)\b/.test(c.norm) && c.actor.role !== 'VIEWER') {
      const req = agency(c.w).access.find((r) => r.state === 'PENDING');
      if (!req) return say('There are no access requests waiting.');
      return { msgs: [{ kind: 'approval', text: `${actorOf(c.w, req.actorId).first} asked to see the confidential ${req.recordLabel} record. Granting lets them read that one record, including the confidential brief. It’s logged.`, actions: [{ label: `Let ${actorOf(c.w, req.actorId).first} see it`, primary: true, act: { t: 'do', op: 'agency.access.decide', args: { id: req.id, d: 'GRANTED' } } }, { label: 'Decline', act: { t: 'do', op: 'agency.access.decide', args: { id: req.id, d: 'DECLINED' } } }] }] };
    }
    if (canSeeMandate(c.w, c.actor, m)) return { msgs: [{ kind: 'reply', text: `Opening ${m.title}. It’s confidential for ${short(c.w, m.clientOrgId!)}: please don’t discuss it outside Talentbridge.` }], effects: focusFx(m.clientOrgId!), nav: { to: AP.mandate(m.id), label: m.title } };
    if (/\b(request|ask for|need) access\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: `I’ve asked Dele to let you see it. You’ll get access only if he says yes; until then the record stays hidden. I’ll tell you when he decides.` }], effects: (w, a) => { requestAccess(w, a, m); } };
    return { msgs: [{ kind: 'refusal', text: `You don’t have access to that record. ${deniedReason(c.w, c.actor, m)} You can still work with the ${short(c.w, m.clientOrgId!)} pools and searches. If you need it for your research, I can ask Dele for access.`, why: 'Permission denied: confidential client record, Viewer role',
      actions: [{ label: 'Ask Dele for access', primary: true, act: { t: 'say', text: 'request access' } }] }], effects: (w, a) => emit(w, a.id, 'agency.access.denied', SCOPE, `${a.first} was denied a confidential record (${clientShort(w, m.clientOrgId!)} · ${m.title}).`) };
  },
});

// ---------------- Consent withdrawn (candidate action, simulated from the agency side) ----------------
registerSkill({
  id: 'agency.consent', side: 'recruiter',
  match: (c) => (on(c) && c.ents.people.length > 0 && (/\b(withdr\w*|revok\w*|pulled out|opted out|took back)\b.*\bconsent\b|\bconsent\b.*\b(withdr\w*|revok\w*)/.test(c.norm) || /\bwhy\b.*\b(not|excluded|left out|missing|dropped)\b/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const pid = c.ents.people[0]; const name = personName(c.w, pid);
    if (/\bwhy\b/.test(c.norm)) {
      const client = clientOf(c);
      const r = consentReason(c.w, pid, client);
      if (!peopleFor(c.w, client).includes(pid)) return say(`${name} isn’t part of ${short(c.w, client)}’s records, so I can’t say anything about them here.`);
      return say(r ? `${name} isn’t included for ${short(c.w, client)}: ${lc(r)}. ${consentState(c.w, pid, client) === 'WITHDRAWN' ? 'They can give consent again from their own account; I won’t ask on their behalf.' : 'I can ask them (simulated) before the next submittal.'}` : `${name} has agreed to be put forward to ${short(c.w, client)}; nothing is holding them back.`);
    }
    if (isWithdrawn(c.w, pid)) return say(`${name} had already withdrawn consent on ${fmtDay(agency(c.w).withdrawn[pid])}.`);
    return { msgs: [], effects: (w, a) => { qReply(w, a, `Simulating ${name} withdrawing consent from their own account (in the real product only the candidate can do this).`); withdrawConsent(w, pid); } };
  },
});

// ---------------- Documents (simulated uploads) ----------------
registerSkill({
  id: 'agency.upload', side: 'recruiter',
  match: (c) => (on(c) && /\b(upload|attach|add)\b.*\b(brief|document|doc|file|pdf|scorecard)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    if (!canAct(c.actor)) return viewerNo(c, 'upload client documents');
    const client = clientOf(c);
    const signed = /\bsigned\b/.test(c.norm);
    const ms = agencyMandates(c.w, client).filter((x) => !x.confidential);
    const m = ms.find((x) => agency(c.w).docs.some((d) => d.mandateId === x.id && d.kind === 'BRIEF' && !d.signed)) ?? ms.find((x) => agency(c.w).campaigns.some((k) => k.mandateId === x.id) && !briefSigned(c.w, x.id)) ?? ms.find((x) => !briefSigned(c.w, x.id)) ?? ms[0];
    const name = `${clientName(c.w, client)} ${m.title} brief${signed ? ' (signed)' : ''}.pdf`;
    return { msgs: [{ kind: 'reply', text: `Uploading “${name}” to ${short(c.w, client)}’s documents (simulated: no real file). ${signed ? `Once it’s in, ${short(c.w, client)}’s campaign for ${m.title} can be launched.` : ''}`.trim(), actions: [{ label: 'Show documents', act: { t: 'nav', to: AP.docs } }] }],
      effects: (w, a) => { setFocus(w, a.id, client); ag(w).docs.push({ id: `d_${Date.now().toString(36)}`, clientOrgId: client, mandateId: m.id, name, kind: 'BRIEF', signed, status: 'UPLOADING', progress: 0, summary: signed ? `Signed brief for ${m.title}.` : `Brief for ${m.title}.`, by: a.id, at: today(w) }); emit(w, a.id, 'agency.doc.uploaded', SCOPE, `${a.first} uploaded ${name} (simulated).`, { clientOrgId: client }); },
      nav: { to: AP.docs, label: 'documents' } };
  },
});

// ---------------- Compare across a pool for a client's mandate ----------------
registerSkill({
  id: 'agency.compare', side: 'recruiter',
  match: (c) => (on(c) && /\b(compare|comparison|side by side|rank|who is strongest|best in)\b/.test(c.norm) && clientsIn(c.norm).length <= 1 ? 0.95 : 0),
  handle: (c) => {
    const client = clientOf(c); const pool = findPool(c.w, c.norm, client) ?? poolsFor(c.w, client)[0];
    if (!pool) return say(`${short(c.w, client)} has no pool to compare yet.`);
    const top = ranked(c.w, pool).slice(0, 3).map((p) => personName(c.w, p));
    return { msgs: [{ kind: 'reply', text: `Comparing ${short(c.w, client)}’s ${pool.name} pool against ${mandateOf(c.w, pool.mandateId)?.title}. Each mark shows what kind of evidence backs each requirement. Strongest on the must-haves: ${top.join(', ')}.`, used: [`${short(c.w, client)} · ${pool.name}`] }],
      effects: (w, a) => { setFocus(w, a.id, client); setUi(w, a, 'compare.pool', pool.id); }, nav: { to: AP.compare, label: 'the comparison' } };
  },
});

// ---------------- Who is in a client's pipeline (one client only) ----------------
registerSkill({
  id: 'agency.list', side: 'recruiter',
  match: (c) => (on(c) && /\b(who is|who are|whos|who's|list|show|which)\b/.test(c.norm) && /\b(candidates|people|pipeline|shortlist(ed)?|pool)\b/.test(c.norm) && clientsIn(c.norm).length <= 1 && !SUBMIT.test(c.norm) ? 0.87 : 0),
  handle: (c) => {
    const client = clientOf(c);
    const ms = agencyMandates(c.w, client).filter((m) => canSeeMandate(c.w, c.actor, m));
    const hidden = agencyMandates(c.w, client).length - ms.length;
    const lines = ms.map((m) => { const ppl = mandatePeople(c.w, m.id).filter((p) => !isWithdrawn(c.w, p.personId)); return `${m.title}: ${ppl.length ? ppl.map((p) => personName(c.w, p.personId)).join(', ') : 'no one yet'}`; });
    return { msgs: [{ kind: 'reply', text: `${clientName(c.w, client)} only. ${lines.join('. ')}.${hidden ? ` ${hidden} confidential ${hidden === 1 ? 'role is' : 'roles are'} hidden for your role.` : ''}`, used: [`${short(c.w, client)} records`] }], effects: focusFx(client), nav: { to: AP.client(client), label: clientName(c.w, client) } };
  },
});

// ---------------- Status: what needs me, how are the agents ----------------
registerSkill({
  id: 'agency.status', side: 'recruiter',
  match: (c) => (on(c) && /\b(what needs me|what needs my|needs my attention|anything for me|how are (the )?agents|agents doing|status|what is going on|catch me up|update me|where are we)\b/.test(c.norm) && !/\breport\b/.test(c.norm) ? 0.86 : 0),
  handle: (c) => {
    const A = agency(c.w);
    const running = A.runs.filter((r) => r.state === 'RUNNING');
    const items = needsYou(c.w, c.actor);
    return { msgs: [{ kind: 'reply', text: `${running.length} agents running (${running.map((r) => `${short(c.w, r.clientOrgId)} · ${r.label.toLowerCase()} ${r.done}/${r.total}`).join('; ') || 'none'}), ${A.runs.filter((r) => r.state === 'PAUSED').length} paused, ${A.runs.filter((r) => r.state === 'FAILED').length} failed. ${items.length ? `Waiting on you: ${items.map((i) => i.text).join(' ')}` : 'Nothing is waiting on you.'}`,
      actions: items.slice(0, 3).map((i, k) => ({ ...i.action, primary: k === 0 })) }] };
  },
});

// ---------------- Open agency pages and switch client focus ----------------
const PAGES: [RegExp, string, string][] = [
  [/\bagents?|runs?|monitor\w*\b/, AP.agents, 'agents'], [/\bsaved searches|searches\b/, AP.searches, 'saved searches'], [/\bcompar\w*\b/, AP.compare, 'the pool comparison'], [/\bpools?\b/, AP.pools, 'talent pools'], [/\bcampaigns?\b/, AP.campaigns, 'campaigns'],
  [/\bsubmittals?\b/, AP.submittals, 'submittals'], [/\b(documents?|docs|files|briefs?)\b/, AP.docs, 'documents'], [/\breports?\b/, AP.reports, 'client reports'], [/\bnotes?|mentions?\b/, AP.notes, 'notes'], [/\bclients?\b/, AP.clients, 'clients'], [/\bmandates?|roles\b/, AP.clients, 'clients and mandates'],
];
registerSkill({
  id: 'agency.open', side: 'recruiter',
  match: (c) => {
    if (!on(c)) return 0;
    const verb = /\b(open|show|take me|go to|bring up|switch|view|see|back to|focus|look at)\b/.test(c.norm);
    if (verb && PAGES.some(([re]) => re.test(c.norm))) return 0.86;
    if (verb && clientsIn(c.norm).length === 1) return 0.84;
    return 0;
  },
  handle: (c) => {
    const client = clientsIn(c.norm)[0];
    const page = PAGES.find(([re]) => re.test(c.norm));
    const to = page ? page[1] : AP.client(client!);
    const label = page ? page[2] : clientName(c.w, client!);
    return { msgs: [{ kind: 'reply', text: `${page ? `Opening ${label}` : `Switched to ${clientName(c.w, client!)}`}${client ? `, showing ${clientName(c.w, client)} only` : ''}.${client ? ' Other clients’ records stay out of this view.' : ''}` }],
      effects: client ? focusFx(client) : undefined, nav: { to, label } };
  },
});

// ---------------- What needs Dele (shared by home, status and proactive) ----------------
export function needsYou(w: World, a: Actor): { text: string; action: QAction }[] {
  const A = agency(w); const out: { text: string; action: QAction }[] = [];
  if (a.role === 'VIEWER') {
    const mine = A.notes.filter((n) => n.mentions.includes(a.id) && !n.readBy.includes(a.id));
    if (mine.length) out.push({ text: `${mine.length} ${mine.length === 1 ? 'note mentions' : 'notes mention'} you.`, action: { label: 'Show notes', act: { t: 'nav', to: AP.notes } } });
    for (const r of A.access.filter((x) => x.actorId === a.id && x.state !== 'PENDING')) out.push({ text: `Access to ${r.recordLabel}: ${r.state === 'GRANTED' ? 'granted' : 'declined'}.`, action: { label: 'Open it', act: { t: 'nav', to: AP.mandate(r.recordId) } } });
    return out;
  }
  for (const r of A.runs.filter((x) => x.state === 'FAILED')) out.push({ text: `${short(w, r.clientOrgId)} ${r.label.toLowerCase()} failed: ${r.provider} isn’t responding.`, action: { label: 'Retry now', act: { t: 'do', op: 'agency.run.retry', args: { id: r.id } } } });
  for (const r of A.access.filter((x) => x.state === 'PENDING')) out.push({ text: `${actorOf(w, r.actorId).first} asked to see ${r.recordLabel}.`, action: { label: `Let ${actorOf(w, r.actorId).first} see it`, act: { t: 'do', op: 'agency.access.decide', args: { id: r.id, d: 'GRANTED' } } } });
  for (const x of conflicts(w)) out.push({ text: `${personName(w, x.personId)}: ${short(w, x.a.clientOrgId!)} wants ${x.a.workMode === 'ONSITE' ? 'on-site' : 'remote'}, ${short(w, x.b.clientOrgId!)} wants ${x.b.workMode === 'ONSITE' ? 'on-site' : 'remote'}.`, action: { label: 'Explain the conflict', act: { t: 'say', text: 'explain the kora and medlink conflict' } } });
  for (const s of A.submittals.filter((x) => x.status === 'SENT_SIMULATED' && !x.reply && !x.nudgedAt && x.sentAt && (simNow(w).getTime() - new Date(`${x.sentAt}T12:00:00Z`).getTime()) / 864e5 >= 3)) out.push({ text: `${clientName(w, s.clientOrgId)} hasn’t replied to the ${fmtDay(s.sentAt)} submittal.`, action: { label: 'Draft a nudge', act: { t: 'do', op: 'agency.submittal.nudge', args: { id: s.id } } } });
  for (const s of A.submittals.filter((x) => x.status === 'DRAFT')) out.push({ text: `A ${short(w, s.clientOrgId)} submittal is waiting for your yes.`, action: { label: 'Review it', act: { t: 'nav', to: AP.submittals } } });
  for (const n of A.notes.filter((x) => x.mentions.includes(a.id) && !x.readBy.includes(a.id))) out.push({ text: `${actorOf(w, n.by).first} mentioned you on ${short(w, n.clientOrgId)}.`, action: { label: 'Read it', act: { t: 'nav', to: AP.notes } } });
  return out;
}

// ---------------- Ops (buttons on pages and chips in Q's replies use these) ----------------
const run = (w: World, id: unknown) => ag(w).runs.find((r) => r.id === id);
const guard = (actor: Actor, what: string) => (canAct(actor) ? null : { say: `Your role is Viewer, so you can’t ${what}. Dele or an admin can.` });
registerOp('agency.focus', (w, a, actor) => { setFocus(w, actor.id, String(a.client)); });
registerOp('agency.run.pause', (w, a, actor) => { const g = guard(actor, 'pause agents'); if (g) return g; const r = run(w, a.id); if (r && pauseRun(w, actor, r, 'Paused by you; resumes from here.')) { pushUndo(w, actor.id, `pause ${r.label}`, 'agency.runs.resume', { ids: [r.id] }); return { say: `Paused ${short(w, r.clientOrgId)} · ${r.label} at ${r.done} of ${r.total}. It resumes from there.` }; } });
registerOp('agency.run.resume', (w, a, actor) => { const g = guard(actor, 'resume agents'); if (g) return g; const r = run(w, a.id); if (r && resumeRun(w, actor, r)) return { say: `Resumed ${short(w, r.clientOrgId)} · ${r.label} from ${r.done} of ${r.total}.` }; });
registerOp('agency.runs.resume', (w, a, actor) => { for (const id of (a.ids as string[]) ?? []) { const r = run(w, id); if (r) resumeRun(w, actor, r); } });
registerOp('agency.run.cancel', (w, a, actor) => { const g = guard(actor, 'cancel agents'); if (g) return g; const r = run(w, a.id); if (r && cancelRun(w, actor, r)) return { say: `Cancelled ${short(w, r.clientOrgId)} · ${r.label}. The ${r.done} finished units are kept.` }; });
registerOp('agency.run.retry', (w, a, actor) => { const g = guard(actor, 'retry agents'); if (g) return g; const r = run(w, a.id); if (r && retryRun(w, actor, r)) return { say: `Retrying ${r.provider} for ${short(w, r.clientOrgId)} · ${r.label}. It continues from ${r.done} of ${r.total} if the provider answers.` }; return { say: 'That agent isn’t failing any more, so there’s nothing to retry.' }; });
registerOp('agency.run.skip', (w, a, actor) => { const g = guard(actor, 'change agents'); if (g) return g; const r = run(w, a.id); if (r && retryRun(w, actor, r, true)) return { say: `Skipped ${r.provider}. ${short(w, r.clientOrgId)} · ${r.label} continues on the Talent Q network from ${r.done}.` }; });
registerOp('agency.run.priority', (w, a, actor) => { const g = guard(actor, 'change priorities'); if (g) return g; const r = run(w, a.id); if (r) { prioritise(w, actor, r, Number(a.p) as 1 | 2 | 3); return { say: `${short(w, r.clientOrgId)} · ${r.label} is now ${PRIORITY[r.priority].toLowerCase()} priority.` }; } });
registerOp('agency.submittal.sendLatest', (w, a, actor) => { const g = guard(actor, 'send submittals'); if (g) return g; const s = [...ag(w).submittals].reverse().find((x) => x.clientOrgId === a.client && x.status === 'DRAFT'); if (!s) return { say: 'There’s no draft submittal to send.' }; w.q.frames[actor.id] = null; return { say: sendSubmittal(w, actor, s.id).text }; });
registerOp('agency.submittal.send', (w, a, actor) => { const g = guard(actor, 'send submittals'); if (g) return g; w.q.frames[actor.id] = null; return { say: sendSubmittal(w, actor, String(a.id)).text }; });
registerOp('agency.submittal.discard', (w, a) => { const s = ag(w).submittals.find((x) => x.id === a.id); if (s && s.status === 'DRAFT') s.status = 'DISCARDED'; });
registerOp('agency.submittal.toggle', (w, a, actor) => { const s = ag(w).submittals.find((x) => x.id === a.id); const p = s?.people.find((x) => x.personId === a.personId); if (!s || !p || s.status !== 'DRAFT') return; if (!p.included && consentState(w, p.personId, s.clientOrgId) !== 'OK') return { say: `I can’t include ${personName(w, p.personId)}: ${lc(consentReason(w, p.personId, s.clientOrgId))}.` }; p.included = !p.included; p.reason = p.included ? undefined : `Left out by ${actor.first}`; });
registerOp('agency.submittal.nudge', (w, a, actor) => { const g = guard(actor, 'nudge clients'); if (g) return g; const s = ag(w).submittals.find((x) => x.id === a.id); if (!s) return; s.nudgedAt = today(w); emit(w, actor.id, 'agency.submittal.nudged', SCOPE, `Nudged ${clientName(w, s.clientOrgId)} about the ${fmtDay(s.sentAt)} submittal (simulated).`, { clientOrgId: s.clientOrgId }); return { say: `Sent ${clientName(w, s.clientOrgId)} a short nudge about the ${fmtDay(s.sentAt)} shortlist (simulated): “Hi, just checking you received the ${s.people.filter((p) => p.included).length} profiles for ${mandateOf(w, s.mandateId)?.title}. Happy to walk you through them.” I won’t nudge again unless you ask.` }; });
registerOp('agency.submittal.reply', (w, a) => { const s = ag(w).submittals.find((x) => x.id === a.id); if (!s) return; s.status = 'CLIENT_REPLIED'; s.reply = String(a.text ?? 'Would like to interview the first two.'); });
registerOp('agency.campaign.launch', (w, a, actor) => { w.q.frames[actor.id] = null; return { say: launchCampaign(w, actor, String(a.id)).text }; });
registerOp('agency.pool.add', (w, a, actor) => { const g = guard(actor, 'change pools'); if (g) return g; const s = ag(w).searches.find((x) => x.id === a.searchId); if (!s) return; const pool = ag(w).pools.find((p) => p.clientOrgId === s.clientOrgId && p.mandateId === s.mandateId) ?? ag(w).pools.find((p) => p.clientOrgId === s.clientOrgId); if (!pool) return; const add = s.newSinceLast.filter((p) => !pool.members.includes(p) && !isWithdrawn(w, p)); pool.members.push(...add); return { say: add.length ? `Added ${add.map((p) => personName(w, p)).join(', ')} to ${short(w, s.clientOrgId)}’s ${pool.name} pool.` : `They’re already in ${short(w, s.clientOrgId)}’s ${pool.name} pool.` }; });
registerOp('agency.search.rerun', (w, a, actor) => { const r = rerunSearch(w, actor, String(a.id)); return { say: `Re-ran “${r.s.name}”: ${r.s.results.length} matches, ${r.added.length ? `new: ${r.added.map((p) => personName(w, p)).join(', ')}` : 'nothing new'}.` }; });
registerOp('agency.note.delete', (w, a) => { ag(w).notes = ag(w).notes.filter((n) => n.id !== a.id); });
registerOp('agency.note.read', (w, _a, actor) => { for (const n of ag(w).notes) if (n.mentions.includes(actor.id) && !n.readBy.includes(actor.id)) n.readBy.push(actor.id); });
registerOp('agency.consent.withdraw', (w, a) => { withdrawConsent(w, String(a.personId)); });
registerOp('agency.access.request', (w, a, actor) => { const m = mandateOf(w, String(a.id)); if (m) requestAccess(w, actor, m); return { say: 'I’ve asked Dele for access. The record stays hidden until he says yes.' }; });
registerOp('agency.access.decide', (w, a, actor) => {
  if (actor.role === 'VIEWER') return { say: 'Only Dele or an admin can decide access requests.' };
  const r = ag(w).access.find((x) => x.id === a.id); if (!r || r.state !== 'PENDING') return { say: 'That request has already been decided.' };
  r.state = a.d === 'GRANTED' ? 'GRANTED' : 'DECLINED'; r.decidedBy = actor.id;
  emit(w, actor.id, 'agency.access.decided', SCOPE, `${actor.first} ${r.state === 'GRANTED' ? 'granted' : 'declined'} ${actorOf(w, r.actorId).first}’s access to ${r.recordLabel}.`, { clientOrgId: r.clientOrgId });
  (w.q.threads[r.actorId] ??= []).push({ id: `qm_${Date.now().toString(36)}`, at: new Date().toISOString(), who: 'q', kind: 'notice', engine: 'system', text: r.state === 'GRANTED' ? `${actor.first} gave you access to ${r.recordLabel}. It’s confidential: keep it inside Talentbridge.` : `${actor.first} declined access to ${r.recordLabel}.`, actions: r.state === 'GRANTED' ? [{ label: 'Open it', primary: true, act: { t: 'nav', to: AP.mandate(r.recordId) } }] : undefined });
  return { say: `${r.state === 'GRANTED' ? 'Granted' : 'Declined'}. I’ve told ${actorOf(w, r.actorId).first}, and it’s in the audit log.` };
});
registerOp('agency.report.save', (w, a, actor) => { const r = ag(w).reports[String(a.client)]; if (!r) return; r.sections = a.sections as typeof r.sections; r.v += 1; r.status = 'EDITED'; r.editedBy = actor.id; r.history.push({ v: r.v, at: today(w), by: actor.id, note: `Edited by ${actor.first}` }); return { say: `Saved your edits as version ${r.v}. ${isolationCheck(w, r).ok ? 'It still names only this client’s records.' : 'Heads-up: it now names someone or something outside this client’s records, so I won’t share it until that’s removed.'}` }; });
registerOp('agency.report.share', (w, a, actor) => {
  const g = guard(actor, 'share reports'); if (g) return g;
  const r = ag(w).reports[String(a.client)]; if (!r) return { say: 'There’s no report to share yet.' };
  const chk = isolationCheck(w, r); if (!chk.ok) return { say: `Not shared: it names ${[...chk.foreignPeople, ...chk.foreignClients].join(', ')}, outside ${clientShort(w, r.clientOrgId)}’s records.` };
  r.status = 'SHARED_SIMULATED'; r.sharedAt = today(w); r.receipt = `rep_sim_${(++ag(w).seq + 900).toString(36)}`;
  emit(w, actor.id, 'agency.report.shared', SCOPE, `Shared ${clientName(w, r.clientOrgId)} report v${r.v} (simulated, ${r.receipt}).`, { clientOrgId: r.clientOrgId });
  return { say: `Shared version ${r.v} with ${clientName(w, r.clientOrgId)} (simulated, receipt ${r.receipt}). Nothing actually left Talent Q.` };
});
registerOp('agency.report.draft', (w, a, actor) => { const c = String(a.client); ag(w).reports[c] = buildReport(w, c, actor.id, ag(w).reports[c]); return { say: `Drafted version ${ag(w).reports[c].v} of the ${clientShort(w, c)} report from ${clientShort(w, c)}’s records only.` }; });
registerOp('agency.doc.upload', (w, a, actor) => { const g = guard(actor, 'upload documents'); if (g) return g; const c = String(a.client); ag(w).docs.push({ id: `d_${Date.now().toString(36)}`, clientOrgId: c, mandateId: a.mandateId as string | undefined, name: String(a.name), kind: 'UPLOAD', signed: !!a.signed, status: 'UPLOADING', progress: 0, summary: String(a.summary ?? 'Uploaded by you (simulated file).'), by: actor.id, at: today(w) }); });
registerOp('agency.actor', (w, a) => { w.session.actor = String(a.id); });
void clientIds; void RUN_STATE; void owners;
