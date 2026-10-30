// Q skills for evidence-first hiring, recruiter side (J12 steps 1–5, 8, 9; build pack 05 scenario P1). The one
// global Q: these skills only read through the shared model (permission-filtered) and act through registered ops.
// Rules kept here: missing CV keywords never reject; a polished CV isn't verified competence; weak writing isn't
// evidence of skill; unknown is never zero; interest is a separate, unscored check; nothing is sent without approval.
import { canSeeCandidate, emit, visibleEvidence } from '../../mock/world';
import type { QAction } from '../../state/domain';
import { registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import { cellFor, criteriaIn, firstName, KORA_ROLE, peopleIn, reqLabel, reqsOf, shortLabel, viewerOrg } from '../../journeys/hire-b/model';
import { proof } from '../../state/areas/proof';
import { BOUNDED_SAMPLE, proofReading } from '../../journeys/evidence/model';
import { decisionsFor, findReqs, interestFor, meansColleague, permittedPool, reqWords, runFind } from '../../journeys/evidence/recruiter/model';
import { acceptPrior, askVerification, draftInterest, draftSampleRequest, moveTo, OUTCOME_WORD, recordReview } from '../../journeys/evidence/recruiter/ops';
import '../../journeys/evidence/recruiter/refs';
import { cmpView } from '../../journeys/hire-b/ops';

const recruiter = (c: QCtx) => c.actor.side === 'recruiter' && !!c.actor.orgId;
/** The Senior Backend role belongs to Kora; other organisations can't search or act on it. */
const owner = (c: QCtx) => c.actor.orgId === 'org_kora';
/** People named in the turn whom the viewer may see; a bare colleague's first name in a panel context isn't a candidate. */
const who = (c: QCtx) => peopleIn(c.norm, c.ents.people).filter((p) => c.w.people.some((x) => x.personId === p) && canSeeCandidate(c.w, p, viewerOrg(c.w)) && !meansColleague(c.w, c.norm, p, c.actor.orgId));
const fn = (c: QCtx, pid: string) => firstName(c.w, pid);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const pron = (pid: string) => (pid === 'p_tobi' || pid === 'p_seyio' || pid === 'p_kunle' ? 'his' : pid === 'p_ife' || pid === 'p_zara' ? 'her' : 'their');
const NOT_YOURS: QReply = { msgs: [{ kind: 'refusal', text: 'I can only look at candidates for roles your organisation runs, and only what they’ve chosen to share with it. I can’t search or act on another organisation’s hiring, and I won’t say whether anything exists there.' }] };

// ============ Step 1: "find someone who can troubleshoot Postgres, not just list it on a CV" ============
const FIND = /\b(find|show|who|people|someone|anyone|anybody|search|look for|investigate|surface|any candidates?)\b/;
const DEMO = /\b(actually|really|proven|demonstrat\w*|shown|fixed|troubleshoot\w*|done it|not just|even if|even though|in practice|hands-?on)\b/;
const CVW = /\b(cv|cvs|resumes?|on paper|keywords?)\b/;
const SURPRISE = /\b(surprising|unexpected|hidden|overlooked|under-?rated)\b.*\b(fits?|candidates?|people|talent)\b|\bshows? more than (the|their) cv\b/;
registerSkill({
  id: 'ev.find', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c)) return 0;
    if (SURPRISE.test(c.norm)) return 0.97;
    if (!FIND.test(c.norm) || who(c).length) return 0;
    if (/\b(draft|message|email|invit\w*|schedule|book|rubric)\b/.test(c.norm)) return 0;
    const reqs = findReqs(c.norm);
    if (reqs.length && (DEMO.test(c.norm) || CVW.test(c.norm))) return 0.97;
    return 0;
  },
  handle: (c) => {
    if (!owner(c)) return NOT_YOURS;
    const surprise = SURPRISE.test(c.norm);
    const reqs = surprise ? [] : findReqs(c.norm);
    const res = runFind(c.w, { r: reqs, mode: surprise ? 'surprise' : undefined });
    const name = (pid: string) => firstName(c.w, pid);
    const focus = res.reqs;
    const beyond = res.rows.filter((r) => (r.best === 'verified' || r.best === 'evidenced') && r.cv.some((x) => x.says !== 'YES'));
    const claims = res.rows.filter((r) => r.reading.shape === 'CLAIMS_AHEAD_OF_PROOF' && focus.some((q) => r.reading.claimedOnly.includes(q) || r.cv.some((x) => x.reqId === q && x.says === 'YES')));
    const reviewed = res.rows.filter((r) => r.group === 'REVIEWED');
    const what = surprise ? 'evidence that goes beyond what a CV says' : reqWords(c.w, focus);
    const lines = [
      `I looked for ${what} in what people shared with Kora, not in CV wording.`,
      surprise
        ? (beyond.length ? `${list(beyond.map((r) => name(r.pid)))} ${beyond.length === 1 ? 'shows' : 'show'} more than ${beyond.length === 1 ? pron(beyond[0].pid) : 'their'} CV says.` : 'Nobody’s evidence goes beyond their CV right now.')
        : (reviewed.length ? `${list(reviewed.map((r) => name(r.pid)))} ${reviewed.length === 1 ? 'has' : 'have'} shown it in reviewed or checked work.${beyond.filter((r) => r.group === 'REVIEWED').map((r) => ` ${name(r.pid)}’s CV doesn’t name it; the work does.`).join('')}` : 'Nobody has shown it in reviewed work yet.'),
      claims.length ? `${list(claims.map((r) => name(r.pid)))}: strong claims, limited supporting evidence so far. That’s unknown, not weak.` : '',
      'No one is left out for missing keywords.',
    ].filter(Boolean);
    const ids = permittedPool(c.w).pids.flatMap((pid) => visibleEvidence(c.w, pid, viewerOrg(c.w)).map((e) => e.evidenceId));
    const pair = [beyond[0]?.pid, claims[0]?.pid].filter(Boolean) as string[];
    const actions: QAction[] = [];
    if (pair.length === 2) actions.push({ label: `Compare ${name(pair[0])} and ${name(pair[1])}`, primary: true, act: { t: 'do', op: 'evr.cmp.proof', args: { people: pair } } });
    else actions.push({ label: 'Open the CV and proof view', primary: true, act: { t: 'do', op: 'evr.cmp.proof', args: {} } });
    if (beyond[0]) actions.push({ label: `Why is ${name(beyond[0].pid)} worth a look?`, act: { t: 'say', text: `why is ${name(beyond[0].pid).toLowerCase()} worth reviewing when ${pron(beyond[0].pid)} cv is weak` } });
    return {
      msgs: [{ kind: 'reply', text: lines.join(' '), ref: { type: 'ev.find', id: JSON.stringify({ r: reqs, mode: surprise ? 'surprise' : undefined, s: { read: res.read, hidden: res.hidden, checked: res.checked }, ids }) },
        used: ['Senior Backend brief v1', `${res.read} permitted candidates`, `${res.checked} shared items`],
        why: 'Permissions come first: I only read people who applied to Kora or let Kora find them, and only what they shared with Kora. Each item is grouped by how it’s known (claim, self-reported, assessed, issuer-verified); there’s no overall score.',
        actions }],
      effects: (w, a) => { emit(w, a.id, 'role_evaluation.requested', `ORG:${a.orgId}`, `${a.first} asked Q to find ${what} for ${w.mandate.title}. Q read ${res.read} permitted candidates and ${res.checked} shared items${res.hidden ? `; ${res.hidden} weren’t visible` : ''}.`, { mandateId: KORA_ROLE, reqs: focus }); },
    };
  },
});

// ============ Step 2: "why is Tobi worth reviewing when his CV is weak?" ============
registerSkill({
  id: 'ev.why', side: 'recruiter',
  match: (c) => (recruiter(c) && /\bwhy\b/.test(c.norm) && who(c).length === 1 && /\b(worth|weak|despite|even though|surprising|look at|reviewing|consider\w*|thin cv|poor cv|bad cv)\b/.test(c.norm) ? 0.97 : 0),
  handle: (c) => {
    if (!owner(c)) return NOT_YOURS;
    const pid = who(c)[0]; const f = fn(c, pid);
    const reqs = reqsOf(c.w);
    const cells = reqs.map((r) => ({ r, c: cellFor(c.w, pid, r.reqId) }));
    const shown = cells.filter((x) => x.c.level === 'verified' || x.c.level === 'evidenced');
    const reviewed = shown.flatMap((x) => x.c.items.filter((i) => !i.excluded && i.level === 'verified')).filter((i, k, a) => a.findIndex((y) => y.e.evidenceId === i.e.evidenceId) === k);
    const cv = proof(c.w).cvs[pid];
    const notNamed = shown.filter((x) => (cv?.mentions[x.r.reqId] ?? 'NO') !== 'YES').map((x) => shortLabel(c.w, x.r.reqId));
    const open = cells.filter((x) => x.c.level === 'partial' || x.c.level === 'none' || x.c.level === 'claim');
    const text = [
      shown.length ? `Because of what ${f} shared, not how the CV reads. ${reviewed.length} item${reviewed.length === 1 ? ' was' : 's were'} reviewed or checked, covering ${list(shown.map((x) => shortLabel(c.w, x.r.reqId)))}.` : `${f} hasn’t shared anything that shows a requirement yet, so I can’t make that case.`,
      cv && notNamed.length ? `${pron(pid) === 'his' ? 'His' : pron(pid) === 'her' ? 'Her' : 'Their'} CV doesn’t clearly name ${list(notNamed)}. The CV’s wording isn’t evidence either way: a thin CV isn’t a point in ${pron(pid)} favour, the reviewed work is.` : '',
      open.length ? `Still open: ${list(open.map((x) => `${shortLabel(c.w, x.r.reqId).toLowerCase()} (${x.c.level === 'partial' ? 'partial' : x.c.level === 'claim' ? 'claimed only' : 'not shown'})`))}.` : '',
    ].filter(Boolean).join(' ');
    const acceptable = cells.find((x) => x.r.mustHave && x.c.level === 'verified' && !decisionsFor(c.w, pid).some((d) => d.reqId === x.r.reqId));
    return {
      msgs: [{ kind: 'reply', text, ref: { type: 'ev.why', id: JSON.stringify({ p: pid }) },
        used: [`${visibleEvidence(c.w, pid, viewerOrg(c.w)).length} items ${f} shared with Kora`, ...(cv ? ['CV (a document, not evidence)'] : [])],
        why: 'A reviewed sample shows the task, not guaranteed performance in the job. My reading isn’t the decision; you make it.',
        actions: [
          ...(acceptable ? [{ label: `Accept ${pron(pid)} ${shortLabel(c.w, acceptable.r.reqId)} evidence, no retest`, primary: true, act: { t: 'do', op: 'evr.accept', args: { personId: pid, reqId: acceptable.r.reqId } } } as QAction] : []),
          { label: 'Open the CV and proof view', act: { t: 'do', op: 'evr.cmp.proof', args: {} } },
          { label: `Questions for ${f}`, act: { t: 'say', text: `what should I ask ${f.toLowerCase()} in the interview` } },
        ] }],
    };
  },
});

// ============ Step 5: "accept Tobi's Postgres evidence, no retest" ============
registerSkill({
  id: 'ev.accept', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(accept|reuse|take|count)\b/.test(c.norm) && who(c).length === 1 && /\b(evidence|proof|sample|no retest|without (a )?retest|no re-?test|as it is|existing)\b/.test(c.norm) ? 0.97 : 0),
  handle: (c) => {
    if (!owner(c)) return NOT_YOURS;
    const pid = who(c)[0];
    let reqs = criteriaIn(c.norm);
    if (!reqs.length) { const r = proofReading(c.w, pid).rows.find((x) => x.must && x.level === 'verified' && !decisionsFor(c.w, pid).some((d) => d.reqId === x.reqId)); if (r) reqs = [r.reqId]; }
    if (!reqs.length) return { msgs: [{ kind: 'question', text: `Which requirement should I accept ${fn(c, pid)}’s existing evidence for?`, actions: reqsOf(c.w).filter((r) => cellFor(c.w, pid, r.reqId).level === 'verified').map((r) => ({ label: r.label, act: { t: 'do', op: 'evr.accept', args: { personId: pid, reqId: r.reqId } } })) }] };
    return { msgs: [], effects: (w, a) => { for (const r of reqs) acceptPrior(w, a, pid, r); } };
  },
});

// ============ Step 5: "ask Seyi Okoro for one short Postgres sample instead of the full assessment" ============
registerSkill({
  id: 'ev.sample', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(ask|request|get|send|set)\b/.test(c.norm) && who(c).length === 1 && /\b(sample|short task|small task|bounded|instead of the full)\b/.test(c.norm) && !/\breview\w*\b/.test(c.norm) ? 0.97 : 0),
  handle: (c) => {
    if (!owner(c)) return NOT_YOURS;
    const pid = who(c)[0];
    const r = proofReading(c.w, pid);
    const reqId = criteriaIn(c.norm).find((x) => BOUNDED_SAMPLE[x]) ?? r.claimedOnly.find((x) => BOUNDED_SAMPLE[x]) ?? r.open[0];
    if (!reqId) return { msgs: [{ kind: 'reply', text: `${fn(c, pid)}’s must-haves are already shown, so I wouldn’t ask for a sample. A conversation is enough.` }] };
    if (cellFor(c.w, pid, reqId).level === 'verified') return { msgs: [{ kind: 'reply', text: `${fn(c, pid)} already has reviewed or checked evidence for ${reqLabel(c.w, reqId)}. I wouldn’t ask for a sample; accept it instead and talk about it in the interview.`, actions: [{ label: 'Accept the existing evidence', primary: true, act: { t: 'do', op: 'evr.accept', args: { personId: pid, reqId } } }] }] };
    return { msgs: [], effects: (w, a) => draftSampleRequest(w, a, pid, reqId) };
  },
});

// ============ "ask for Seyi Okoro's certificate to be verified" ============
registerSkill({
  id: 'ev.verify', side: 'recruiter',
  match: (c) => (recruiter(c) && who(c).length === 1 && /\b(verify|verified|verification|confirm with the issuer|check (the|his|her|their) (certificate|credential))\b/.test(c.norm) && !/\bwhat does\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    if (!owner(c)) return NOT_YOURS;
    const pid = who(c)[0];
    const reqId = criteriaIn(c.norm)[0] ?? reqsOf(c.w).map((r) => r.reqId).find((r) => cellFor(c.w, pid, r).items.some((i) => !i.excluded && i.e.kind !== 'CLAIM' && i.e.verification !== 'VERIFIED'));
    if (!reqId) return { msgs: [{ kind: 'reply', text: `${fn(c, pid)} hasn’t shared anything that a check could confirm.` }] };
    return { msgs: [], effects: (w, a) => askVerification(w, a, pid, reqId) };
  },
});

// ============ Step 8: "review Seyi Okoro's sample" ============
const OUTCOME: [RegExp, keyof typeof OUTCOME_WORD][] = [[/\b(part of it|partly|partially|some of it|partial)\b/, 'PARTLY'], [/\b(did not show|does not show|didn'?t show|not shown|no it)\b/, 'NOT_SHOWN'], [/\bshows? it\b|\bshowed it\b|\bfully\b/, 'SHOWS_IT']];
registerSkill({
  id: 'ev.review', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(review|mark|rate|assess)\w*\b/.test(c.norm) && /\b(sample|work sample)\b/.test(c.norm) && !/\b(ask|request)\b.*\bfor\b/.test(c.norm) ? 0.97 : 0),
  handle: (c) => {
    if (!owner(c)) return NOT_YOURS;
    const subm = proof(c.w).reuse.filter((d) => d.orgId === c.actor.orgId && d.state === 'SUBMITTED' && canSeeCandidate(c.w, d.personId, c.actor.orgId!));
    const named = who(c)[0];
    const d = subm.find((x) => !named || x.personId === named);
    if (!d) {
      const any = named ? decisionsFor(c.w, named).find((x) => x.decision === 'BOUNDED_SAMPLE') : undefined;
      return { msgs: [{ kind: 'reply', text: any ? `${fn(c, named!)}’s ${shortLabel(c.w, any.reqId)} sample isn’t waiting for a review: it’s ${({ PROPOSED: 'drafted, not sent yet', SENT: 'sent, and not started', IN_PROGRESS: 'in progress', SUBMITTED: 'submitted', REVIEWED: 'already reviewed', DECLINED: 'declined, which isn’t a failed result' })[any.state]}.` : 'No work sample is waiting for a review.' }] };
    }
    const pid = d.personId; const f = fn(c, pid);
    const outcome = OUTCOME.find(([re]) => re.test(c.norm))?.[1];
    const note = c.text.match(/(?:[:—–-]|\bnote:?|\bbecause)\s+(.{6,})$/i)?.[1]?.trim();
    if (outcome && note) return { msgs: [], effects: (w, a) => recordReview(w, a, d.id, outcome, note) };
    return {
      msgs: [{ kind: 'reply', text: `${f}’s ${shortLabel(c.w, d.reqId)} sample is on ${pron(pid)} profile. Choose what it shows and add a short note; it counts only once you record it, as Assessed with your name.${outcome ? ' I need a note before I record it.' : ''}`,
        why: 'A person reviews every sample. “Didn’t show it” is about this sample, not a verdict on the person.' }],
      nav: c.route === `/r/people/${pid}` ? undefined : { to: `/r/people/${pid}`, label: `${f}’s profile` },
    };
  },
});

// ============ Step 8: "move both to interview" ============
registerSkill({
  id: 'ev.move', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c) || !/\b(move|put|advance|progress|take)\b/.test(c.norm) || !/\binterview\w*\b/.test(c.norm)) return 0;
    if (/\b(both|the two|these two|them both|both of them)\b/.test(c.norm)) return 0.97;
    return who(c).length >= 2 ? 0.95 : 0;
  },
  handle: (c) => {
    if (!owner(c)) return NOT_YOURS;
    let pids = who(c);
    if (pids.length < 2) {
      const recent = proof(c.w).reuse.filter((d) => d.orgId === c.actor.orgId).map((d) => d.personId).reverse().filter((p, i, a) => a.indexOf(p) === i);
      const view = cmpView(c.w, c.actor.id);
      pids = recent.length === 2 ? recent : view.people.length === 2 ? view.people : [];
    }
    pids = pids.filter((p) => canSeeCandidate(c.w, p, c.actor.orgId!) && c.w.pipeline.some((e) => e.personId === p && e.mandateId === KORA_ROLE));
    if (pids.length < 2) return { msgs: [{ kind: 'question', text: 'Which two people should I move to interview? Tell me their names.' }] };
    const already = pids.filter((p) => c.w.pipeline.find((e) => e.personId === p && e.mandateId === KORA_ROLE)?.stage === 'INTERVIEW');
    if (already.length === pids.length) return { msgs: [{ kind: 'reply', text: `${list(pids.map((p) => fn(c, p)))} are already at Interview.` }] };
    return { msgs: [], effects: (w, a) => moveTo(w, a, pids.filter((p) => !already.includes(p)), 'INTERVIEW') };
  },
});

// ============ Step 9: "is Tobi interested?" ============
registerSkill({
  id: 'ev.interest', side: 'recruiter',
  match: (c) => (recruiter(c) && who(c).length === 1 && /\b(interested|interest|keen|want (the|this) (role|job)|up for it)\b/.test(c.norm) && !/\b(draft|invit\w*)\b/.test(c.norm) ? 0.96 : 0),
  handle: (c) => {
    if (!owner(c)) return NOT_YOURS;
    const pid = who(c)[0]; const f = fn(c, pid);
    const i = interestFor(c.w, pid);
    if (/\b(ask|check|find out)\b/.test(c.norm) && !i) return { msgs: [], effects: (w, a) => draftInterest(w, a, pid) };
    if (!i) return { msgs: [{ kind: 'reply', text: `I don’t know yet: nobody at Kora has asked ${f}. Interest is a separate check from suitability, and I never guess it or score it. Want me to draft a short question for you to approve?`,
      actions: [{ label: `Ask ${f}`, primary: true, act: { t: 'do', op: 'evr.interest.draft', args: { personId: pid } } }, { label: 'Not now', act: { t: 'say', text: 'not now' } }] }] };
    const when = new Date(i.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return { msgs: [{ kind: 'reply', text: i.state === 'REQUESTED' ? `Asked on ${when}, no answer yet. Pending isn’t a no, and it doesn’t change how ${pron(pid)} evidence reads.` : i.state === 'CONFIRMED' ? `Yes: ${f} confirmed interest on ${when}${i.note ? ` (“${i.note}”)` : ''}.` : `${f} said no, thanks, on ${when}${i.note ? ` (“${i.note}”)` : ''}. That’s ${pron(pid)} choice, not a mark against ${pron(pid) === 'his' ? 'him' : pron(pid) === 'her' ? 'her' : 'them'}.` }] };
  },
});
