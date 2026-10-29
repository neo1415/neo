// Q skills for R2 (Ada, a non-technical recruiter hiring engineers). Everything on the R2 pages can be
// asked for in plain, imperfect language: compare by chosen criteria, explain and defend a ranking and
// accept corrections, separate CV claims from evidence, retry an unavailable integration, recommend
// assessments, generate interview questions from gaps, adaptive follow-ups during an interview, feedback,
// and assessment disputes. Rule-based and honest about it (see core.honest).
import { actorOf, emit, visibleEvidence, type World } from '../../mock/world';
import type { Actor, QAction } from '../../state/domain';
import { registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import { hireB, type Level, type Rating } from '../../state/areas/hire-b';
import { ASSESS, KORA_ROLE, LEVEL_WORD, assessFor, cellFor, criteriaIn, disputedEvidence, firstName, followUpsFor, isVague, koraInterviews, nameOf, peopleIn, personInFocus, questionsFor, rank, readingOf, reqLabel, reqsOf, roleRubric, rolePeople, usesRubric, viewerOrg, weightingNote, type CompareView } from '../../journeys/hire-b/model';
import { addCorrection, cmpView, finishInterview, ghRetry, live, setCmp, startInterview } from '../../journeys/hire-b/ops';
import { PROJECTS } from '../../journeys/hire-b/projects';
import { viewId } from '../../journeys/hire-b/refs';

const kora = (c: QCtx) => c.actor.orgId === 'org_kora' && c.actor.side === 'recruiter';
const who = (c: QCtx) => peopleIn(c.norm, c.ents.people).filter((p) => c.w.people.some((x) => x.personId === p));
const fn = (w: World, p: string) => firstName(w, p);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const orderText = (w: World, v: CompareView) => rank(w, v).map((r) => fn(w, r.pid)).join(', then ');
const toCompare = (c: QCtx) => (c.route === '/r/compare' ? undefined : { to: '/r/compare', label: 'the comparison' });
const interviewRoute = (c: QCtx) => c.route.match(/^\/r\/interviews\/(i_\w+)/)?.[1];
const ivFor = (w: World, pid: string) => koraInterviews(w).find((i) => i.personId === pid && i.mandateId === KORA_ROLE);

// ============ Compare by chosen criteria, and change them mid-comparison ============
const COMPARE = /\b(compare|compared|comparing|comparison|versus|vs|side by side|stack up|against each other)\b/;
const LASTYEAR = /\b(last|past) (year|12 months|twelve months)\b|\brecent (evidence|stuff|work|things)\b|\bonly recent\b/;
const ALLDATES = /\b(any date|all dates|all evidence|older evidence too|include old\w*|not just (the )?last year)\b/;
const EQUAL = /\b(weigh|weight|count)\w*\b.*\b(equal|equally|equaly|equel|same|evenly)\b|\bnot (count|weigh)\w* (it |payments? )?more\b|\bno extra weight\b|\bstop (weighting|weighing)\b/;
const QWEIGHT = /\b(your|q'?s|the rubric'?s?|rubric) (weighting|weights)\b.*\b(back|again|restore|on)\b|\bput (the|your|rubric) (rubric )?weight\w* back\b|\buse the rubric( weights)?\b/;
const ADD = /\b(add|also|include|plus|and also)\b/;
const DROP = /\b(drop|remove|without|exclude|leave out|take out|ignore|not)\b/;
const ONLY = /\b(only|just|instead|switch to|change to|focus on)\b/;

function comparePatch(c: QCtx): { patch: Partial<CompareView>; said: string[] } | null {
  const v = cmpView(c.w, c.actor.id);
  const pool = rolePeople(c.w);
  const ppl = who(c).filter((p) => pool.includes(p));
  const crits = criteriaIn(c.norm);
  const patch: Partial<CompareView> = {}; const said: string[] = [];
  const isCompare = COMPARE.test(c.norm);
  if (ppl.length >= 2 && (isCompare || ONLY.test(c.norm))) { patch.people = ppl; said.push(list(ppl.map((p) => fn(c.w, p)))); }
  else if (ppl.length === 1 && isCompare) { patch.people = pool; said.push(`${fn(c.w, ppl[0])} against everyone on the shortlist`); }
  else if (ppl.length && !isCompare && c.route === '/r/compare') {
    if (DROP.test(c.norm)) { patch.people = v.people.filter((p) => !ppl.includes(p)); said.push(`without ${list(ppl.map((p) => fn(c.w, p)))}`); }
    else if (ADD.test(c.norm)) { patch.people = [...v.people, ...ppl.filter((p) => !v.people.includes(p))]; said.push(`adding ${list(ppl.map((p) => fn(c.w, p)))}`); }
  }
  if (/\bmust-? ?haves?\b/.test(c.norm) && !crits.length) { patch.criteria = reqsOf(c.w).filter((r) => r.mustHave).map((r) => r.reqId); said.push('on the must-haves only'); }
  else if (/\b(all|every) (the )?(requirements|criteria)\b|\beverything\b/.test(c.norm) && !crits.length) { patch.criteria = reqsOf(c.w).map((r) => r.reqId); said.push('on every requirement'); }
  else if (crits.length) {
    const labels = list(crits.map((r) => reqLabel(c.w, r)));
    if (!isCompare && DROP.test(c.norm) && !ONLY.test(c.norm)) { patch.criteria = v.criteria.filter((r) => !crits.includes(r)); said.push(`without ${labels}`); }
    else if (!isCompare && ADD.test(c.norm) && !ONLY.test(c.norm)) { patch.criteria = [...v.criteria, ...crits.filter((r) => !v.criteria.includes(r))]; said.push(`adding ${labels}`); }
    else { patch.criteria = crits; said.push(`on ${labels}`); }
  }
  if (ALLDATES.test(c.norm)) { patch.lastYear = false; said.push('using evidence of any date'); }
  else if (LASTYEAR.test(c.norm)) { patch.lastYear = true; said.push('using evidence from the last year only'); }
  if (EQUAL.test(c.norm)) { patch.weighting = 'EQUAL'; said.push('with every must-have weighed equally'); }
  else if (QWEIGHT.test(c.norm)) { patch.weighting = 'RUBRIC'; said.push(roleRubric(c.w) ? `with the rubric v${roleRubric(c.w)!.v} weights back on` : 'with equal must-haves (there’s no approved rubric yet)'); }
  if (!said.length && isCompare) { said.push('as you left it'); }
  if (!said.length) return null;
  patch.open = null;
  return { patch, said };
}

registerSkill({
  id: 'hire-b.compare', side: 'recruiter',
  match: (c) => {
    if (!kora(c)) return 0;
    if (/\b(draft|invit\w*|message|email|schedule|book)\b/.test(c.norm)) return 0;
    const ppl = who(c), crits = criteriaIn(c.norm);
    if (COMPARE.test(c.norm) && (ppl.length || crits.length || LASTYEAR.test(c.norm) || EQUAL.test(c.norm) || /must-? ?have/.test(c.norm))) return 0.9;
    if (EQUAL.test(c.norm) || QWEIGHT.test(c.norm)) return 0.9;
    if (c.route === '/r/compare' && (LASTYEAR.test(c.norm) || ALLDATES.test(c.norm))) return 0.9;
    if (c.route === '/r/compare' && (crits.length || ppl.length || /must-? ?have/.test(c.norm)) && (ADD.test(c.norm) || DROP.test(c.norm) || ONLY.test(c.norm) || c.ents.correction)) return 0.88;
    if (LASTYEAR.test(c.norm) && /\b(evidence|compar\w*|ledger)\b/.test(c.norm)) return 0.86;
    return 0;
  },
  handle: (c) => {
    const p = comparePatch(c) ?? { patch: {}, said: ['as you left it'] };
    const before = cmpView(c.w, c.actor.id);
    const after: CompareView = { ...before, ...p.patch };
    const ob = orderText(c.w, before), oa = orderText(c.w, after);
    const notes = readingOf(c.w, after);
    const changed = ob !== oa ? ` Order changed: before it was ${ob}; now ${oa}.` : after.people.length > 1 ? ` Order: ${oa}${Object.keys(p.patch).length > 1 ? ' (unchanged)' : ''}.` : '';
    return {
      msgs: [{ kind: 'reply', text: `Comparing ${p.said.join(', ')}.${changed} ${notes[0] ?? ''}`.replace(/\s+/g, ' ').trim(),
        ref: after.people.length && after.criteria.length ? { type: 'hb.ledger', id: viewId({ ...after, people: after.people.filter((x) => rolePeople(c.w).includes(x)) }) } : undefined,
        used: ['Senior Backend brief v1', `${after.people.reduce((n, pid) => n + visibleEvidence(c.w, pid, viewerOrg(c.w)).length, 0)} shared evidence items`, usesRubric(c.w, after.weighting) ? `Rubric v${roleRubric(c.w)!.v} weights` : 'Equal must-haves (no rubric weights)'],
        why: 'Rule-based reading of what each person shared with Kora; I never use private or withdrawn items.',
        actions: [{ label: 'Why this order?', act: { t: 'say', text: 'why is that the order' } }, ...(after.lastYear ? [] : [{ label: 'Last year only', act: { t: 'say', text: 'only evidence from the last year' } } as QAction])] }],
      effects: (w, a) => setCmp(w, a.id, p.patch),
      nav: toCompare(c),
    };
  },
});

// ============ "Why do you say Tobi is stronger? That's not fair." ============
const CHALLENGE = /\b(why|how come|explain|justify|reasoning|prove it|not fair|unfair|biased|bias|on what basis|what makes you)\b/;
const RANKWORD = /\b(stronger|better|first|ahead|top|rank\w*|higher|lead|leads|leading|order|over|best|favou?r\w*|ahead of)\b/;
registerSkill({
  id: 'hire-b.challenge', side: 'recruiter',
  match: (c) => {
    if (!kora(c)) return 0;
    if (/\b(cv|claims?|impressive|on paper)\b/.test(c.norm)) return 0;
    if (CHALLENGE.test(c.norm) && (RANKWORD.test(c.norm) || /\bnot fair|unfair|biased\b/.test(c.norm)) && (who(c).length || c.route === '/r/compare' || /\b(order|ranking|talk to)\b/.test(c.norm))) return 0.93;
    return 0;
  },
  handle: (c) => {
    const v = cmpView(c.w, c.actor.id);
    const rk = rank(c.w, v);
    const named = who(c).filter((p) => v.people.includes(p));
    const a = named[0] ?? rk[0]?.pid; const b = named[1] ?? rk.find((r) => r.pid !== a)?.pid;
    if (!a || !b) return { msgs: [{ kind: 'reply', text: 'There’s only one person in the comparison, so I haven’t ranked anyone. Add someone and I’ll show my reasoning.' }] };
    const eq = rank(c.w, { ...v, weighting: 'EQUAL' });
    const weightLine = `${weightingNote(c.w, v)}${usesRubric(c.w, v.weighting) ? ` With must-haves equal instead, the order would be ${eq.map((r) => fn(c.w, r.pid)).join(', then ')}.` : ''}`;
    const isFair = /\bnot fair|unfair|biased\b/.test(c.norm);
    return {
      msgs: [{ kind: 'reply', text: `${isFair ? 'Fair challenge. ' : ''}Here’s exactly what I used, only from what each of them shared with Kora. ${weightLine} I don’t use CVs, schools, names or anything personal. If I’ve read something wrong, tell me (for example “Tobi’s Go library shouldn’t count as production”) and I’ll correct it and show what changes.`,
        ref: { type: 'hb.reason', id: JSON.stringify({ ...JSON.parse(viewId(v)), a, b }) },
        used: ['Senior Backend brief v1', 'Shared evidence only', usesRubric(c.w, v.weighting) ? `Rubric v${roleRubric(c.w)!.v} weights (approved by a person)` : 'Equal must-haves (placeholder)'],
        why: `Strength levels: verified 3, evidenced 2, partial 1, claimed or not shown 0 (unknown, not weak). ${usesRubric(c.w, v.weighting) ? 'Each requirement counts by its weight in the approved rubric.' : 'Must-haves count double until a rubric is approved.'}`,
        actions: [
          ...(usesRubric(c.w, v.weighting) ? [{ label: 'Weigh must-haves equally', primary: true, act: { t: 'say', text: 'weigh the must-haves equally' } } as QAction] : [{ label: 'Set weights in a rubric', act: { t: 'nav', to: '/r/roles/m_backend/rubric' } } as QAction]),
          { label: `${fn(c.w, a)}’s Go library isn’t production`, act: { t: 'say', text: `${fn(c.w, a).toLowerCase()}'s go library does not count as production go` } },
          ...(c.route === '/r/compare' ? [] : [{ label: 'Open the comparison', act: { t: 'nav', to: '/r/compare' } } as QAction]),
        ] }],
    };
  },
});

// ============ Corrections to Q's reading ============
const DOWN = /\b(does not count|doesn'?t count|should not count|shouldn'?t count|not production|is not production|is not really|not really|weaker than|overrated|too generous|only a library|just a library|not the same as|is not proof|not enough)\b/;
const UP = /\b(should count|does count|it counts|underrated|is production|in production|ran it in production|real production|stronger than (that|you think)|undersold)\b/;
registerSkill({
  id: 'hire-b.correct', side: 'recruiter',
  match: (c) => (kora(c) && who(c).length >= 1 && criteriaIn(c.norm).length >= 1 && (DOWN.test(c.norm) || UP.test(c.norm)) ? 0.94 : 0),
  handle: (c) => {
    const pid = who(c)[0]; const reqId = criteriaIn(c.norm)[0];
    const v = cmpView(c.w, c.actor.id);
    const cur = cellFor(c.w, pid, reqId, v).level;
    const down = DOWN.test(c.norm);
    const order: Level[] = ['none', 'partial', 'evidenced', 'verified'];
    const idx = Math.max(0, order.indexOf(cur === 'claim' ? 'none' : cur));
    const level: Level = down ? order[Math.max(0, idx - 1)] : order[Math.min(2, idx + 1)];
    if (level === cur) return { msgs: [{ kind: 'reply', text: down ? `I already read ${fn(c.w, pid)}’s ${reqLabel(c.w, reqId)} as “${LEVEL_WORD[cur].toLowerCase()}”, so there’s nothing lower to move it to.` : `I can’t raise ${fn(c.w, pid)}’s ${reqLabel(c.w, reqId)} above “evidenced” on anyone’s word: only a check at the source makes it verified. I can ask ${fn(c.w, pid)} for something checkable.` }] };
    const note = down ? (/library/.test(c.norm) ? 'A library, not production experience' : `Counts for less than Q said`) : 'Counts more than Q said';
    const before = orderText(c.w, v);
    const sim = structuredClone(c.w); addCorrection(sim, c.actor, pid, reqId, level, note);
    const after = orderText(sim, v);
    return {
      msgs: [{ kind: 'reply', text: `Accepted. I now read ${fn(c.w, pid)}’s ${reqLabel(c.w, reqId)} as “${LEVEL_WORD[level].toLowerCase()}”, labelled as your correction rather than a check.${!down ? ' It still isn’t verified.' : ''} ${before === after ? `The order stays ${after}, but the margin is ${down ? 'narrower' : 'wider'}.` : `Order before: ${before}. Now: ${after}.`}`, why: 'Corrections are recorded with your name in the audit trail. Say “undo” to restore my reading.',
        actions: [{ label: 'Undo the correction', act: { t: 'do', op: 'undo' } }, ...(c.route === '/r/compare' ? [] : [{ label: 'See the comparison', act: { t: 'nav', to: '/r/compare' } } as QAction])] }],
      effects: (w, a) => { addCorrection(w, a, pid, reqId, level, note); },
    };
  },
});

// ============ Impressive CV, weak evidence ============
registerSkill({
  id: 'hire-b.cv', side: 'recruiter',
  match: (c) => {
    if (!kora(c)) return 0;
    const ppl = who(c);
    const cvish = /\b(cv|impressive|great on paper|looks (great|good|amazing|strong)|on paper|claims?|backed|amazing|experience says|strong background)\b/.test(c.norm);
    if (ppl.length && cvish) return 0.95;
    if (ppl.includes('p_kunle') && /\b(why|low|last|bottom|weak|any good|really)\b/.test(c.norm)) return 0.9;
    return 0;
  },
  handle: (c) => {
    const pid = who(c)[0];
    const items = visibleEvidence(c.w, pid, viewerOrg(c.w));
    const claims = items.filter((e) => e.kind === 'CLAIM');
    const disputed = disputedEvidence(c.w);
    const reqs = reqsOf(c.w);
    const weak: string[] = [], unknown: string[] = [], strong: string[] = [], review: string[] = [];
    for (const r of reqs) {
      const cell = cellFor(c.w, pid, r.reqId);
      const live = cell.items.filter((i) => !i.excluded);
      if (cell.items.some((i) => disputed.has(i.e.evidenceId))) review.push(r.label);
      if (cell.level === 'verified' || cell.level === 'evidenced') strong.push(`${r.label} (${live[0]?.note})`);
      else if (cell.level === 'partial') weak.push(`${r.label}: ${live.filter((i) => i.level === 'partial').map((i) => `${i.note}${new Date(i.e.observedAt).getFullYear() < 2025 ? `, from ${new Date(i.e.observedAt).getFullYear()}` : ''}`).join('; ')}`);
      else unknown.push(cell.level === 'claim' ? `${r.label} (claimed on the CV only)` : r.label);
    }
    const f = fn(c.w, pid);
    const text = [
      claims.length ? `${f}’s CV is impressive, but I have to keep what ${f} says apart from what ${f} has shown.` : `${f} hasn’t shared a CV with claims I can compare. Here’s what the evidence says.`,
      strong.length ? `Shown: ${strong.join('; ')}.` : 'Nothing shared is both recent and specific enough to count as solid evidence yet.',
      weak.length ? `Weak (evidence exists, but it’s thin, old or shows a problem): ${weak.join(' · ')}.` : '',
      unknown.length ? `Unknown (nobody has shown it yet): ${list(unknown)}. Unknown isn’t weak; it means unchecked.` : '',
      review.length ? `${f} disputed an assessment result, so it’s under review and I’ve left it out.` : '',
      `What would prove it: a reference from someone who saw the payments work, a recent Go service ${f} ran (code or a walk-through), or a short paid work sample. I can turn these into interview questions.`,
    ].filter(Boolean).join('\n');
    const iv = ivFor(c.w, pid);
    return {
      msgs: [{ kind: 'reply', text, used: [`${items.length} items ${f} shared`, ...(claims.length ? ['CV claims (not evidence)'] : [])], why: 'A CV line is a claim. I only count something as evidence when there’s a project, assessment, reference or check behind it.',
        actions: [{ label: `Questions to ask ${f}`, primary: true, act: { t: 'say', text: `what should I ask ${f} in the interview` } }, ...(iv ? [] : []), ...(c.route.startsWith(`/r/people/${pid}`) ? [] : [{ label: `Open ${f}’s profile`, act: { t: 'nav', to: `/r/people/${pid}` } } as QAction])] }],
    };
  },
});

// ============ GitHub unavailable: say so, retry, treat as unknown ============
registerSkill({
  id: 'hire-b.github', side: 'recruiter',
  match: (c) => {
    if (!kora(c)) return 0;
    if (/\b(github|repo|repos|repository|repositories)\b/.test(c.norm) && /\b(retry|try again|again|check|down|working|broken|refresh|reload|why|status|unavailable|outage|loading|responding)\b/.test(c.norm)) return 0.92;
    if (c.route.startsWith('/r/people/') && /^(retry|try again|try it again|again)\b/.test(c.norm)) return 0.85;
    return 0;
  },
  handle: (c) => {
    const g = hireB(c.w).github;
    if (g.status === 'OK') return { msgs: [{ kind: 'reply', text: 'GitHub is answering now, and the repositories show the current copy. Answering isn’t the same as verifying: whether a repository really belongs to the candidate is still a separate check.' }] };
    const n = g.tries + 1;
    return {
      msgs: [{ kind: 'reply', text: `GitHub isn’t responding (a simulated outage). I’m trying again now (attempt ${n}). Until it answers I show what I cached on ${new Date(g.cachedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} and treat those repositories as unknown, not weak, in the comparison.`, used: ['GitHub connector (simulated)'] }],
      effects: (w, a) => { ghRetry(w, a); },
    };
  },
});

// ============ Assessment selection ============
registerSkill({
  id: 'hire-b.assess', side: 'recruiter',
  match: (c) => {
    if (!kora(c)) return 0;
    const crits = criteriaIn(c.norm);
    if (!crits.length && !/\b(assessment|assess)\b/.test(c.norm)) return 0;
    if (/\b(github|repo)\b/.test(c.norm)) return 0;
    if (/\b(assess\w*|test|tests|testing|evaluate|exercise|take-?home|work sample|how (do|should|can|would) i (know|tell|check|judge|find out|verify)|what kind of (test|interview))\b/.test(c.norm)) return 0.9;
    return 0;
  },
  handle: (c) => {
    const pid = who(c)[0] ?? personInFocus(c.w, c.route);
    const crits = criteriaIn(c.norm).length ? criteriaIn(c.norm) : reqsOf(c.w).filter((r) => r.mustHave).map((r) => r.reqId);
    const lines = crits.slice(0, 3).map((r) => { const a = assessFor(c.w, pid, r); return `• ${reqLabel(c.w, r)}: ${a.skip ?? `${a.type} (${a.minutes}). Why: ${a.why} Avoid: ${a.avoid}`}`; });
    const iv = pid ? ivFor(c.w, pid) : undefined;
    return {
      msgs: [{ kind: 'reply', text: `${pid ? `For ${fn(c.w, pid)}` : 'For this role'}, here’s what I’d use and why:\n${lines.join('\n')}\nYou don’t need to judge the technical answer yourself: each of these produces something an engineer on the panel can mark against a rubric.`,
        used: ['Senior Backend brief v1', ...(pid ? [`What ${fn(c.w, pid)} has already shown`] : [])],
        actions: [...(iv ? [{ label: `Plan ${fn(c.w, pid!)}’s interview`, primary: true, act: { t: 'do', op: 'hb.plan.keep', args: { id: iv.id, questions: questionsFor(c.w, pid!) } } } as QAction] : []), { label: 'What does rubric mean?', act: { t: 'say', text: 'what does rubric mean' } }] }],
    };
  },
});
void ASSESS;

// ============ Interview questions from evidence gaps ============
registerSkill({
  id: 'hire-b.questions', side: 'recruiter',
  match: (c) => {
    if (!kora(c)) return 0;
    if (/\b(invit\w*|draft (a|an) (message|email|invite))\b/.test(c.norm)) return 0;
    if (/\b(questions?)\b/.test(c.norm) && /\b(interview|ask|asking)\b/.test(c.norm)) return 0.9;
    if (/\bwhat (should|do|can|could) i ask\b/.test(c.norm)) return 0.9;
    return 0;
  },
  handle: (c) => {
    const pid = who(c)[0] ?? personInFocus(c.w, c.route);
    if (!pid) return { msgs: [{ kind: 'question', text: 'Who is the interview with?', actions: rolePeople(c.w).map((p) => ({ label: nameOf(c.w, p), act: { t: 'say', text: `what should I ask ${fn(c.w, p)} in the interview` } })) }] };
    const iv = ivFor(c.w, pid);
    return {
      msgs: [{ kind: 'reply', text: `Questions for ${fn(c.w, pid)}, built from what ${fn(c.w, pid)} has and hasn’t shown: must-haves first, the least-shown first. If an answer sounds vague during the interview, tell me what they said and I’ll suggest a follow-up.`,
        ref: { type: 'hb.questions', id: pid },
        used: [`${fn(c.w, pid)}’s shared evidence`, 'Senior Backend brief v1', 'Kora: job-related questions only'],
        actions: iv ? [{ label: 'Use these in the interview', primary: true, act: { t: 'do', op: 'hb.plan.keep', args: { id: iv.id, questions: questionsFor(c.w, pid) } } }] : [{ label: 'Draft an interview invitation', act: { t: 'say', text: `draft an interview invitation for ${fn(c.w, pid)}` } }] }],
    };
  },
});

// ============ Interview copilot: start, notes, adaptive follow-ups, rating ============
registerSkill({
  id: 'hire-b.iv.start', side: 'recruiter',
  match: (c) => (kora(c) && /\b(start|begin|run|open|launch)\b/.test(c.norm) && /\b(interview|copilot)\b/.test(c.norm) && (who(c).length || interviewRoute(c)) && !/\b(invit\w*|schedul\w*|book)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const pid = who(c)[0] ?? personInFocus(c.w, c.route)!;
    const iv = ivFor(c.w, pid);
    if (!iv) return { msgs: [{ kind: 'reply', text: `There’s no interview with ${fn(c.w, pid)} yet. Scheduling happens in Messages and the calendar.`, actions: [{ label: 'Draft an interview invitation', act: { t: 'say', text: `draft an interview invitation for ${fn(c.w, pid)}` } }] }] };
    if (iv.status === 'PLANNING') return { msgs: [{ kind: 'reply', text: `${fn(c.w, pid)}’s interview isn’t scheduled yet, so I can’t start it. I’ve opened the plan so you can prepare questions.` }], nav: { to: `/r/interviews/${iv.id}`, label: 'the interview' } };
    if (!iv.panel.includes(c.actor.id)) return { msgs: [{ kind: 'refusal', text: `You’re not on ${fn(c.w, pid)}’s panel, so I can’t start the copilot for you. You can still read the plan.` }], nav: { to: `/r/interviews/${iv.id}`, label: 'the interview' } };
    const plan = questionsFor(c.w, pid);
    return {
      msgs: [{ kind: 'reply', text: `Started (simulated: I only see the notes you type, I don’t listen to the call). First question, on ${reqLabel(c.w, plan[0].reqId)}: “${plan[0].text}” Tell me what ${fn(c.w, pid)} says and I’ll flag anything vague.`, why: plan[0].why }],
      effects: (w, a) => startInterview(w, a, iv.id),
      nav: interviewRoute(c) === iv.id ? undefined : { to: `/r/interviews/${iv.id}`, label: 'the interview' },
    };
  },
});

const NOTE = /^(note:?|notes:?|he said|she said|they said|answer:?|candidate said|his answer|her answer|he says|she says|they say|he mentioned|she mentioned|he talked|she talked)\b/;
registerSkill({
  id: 'hire-b.iv.live', side: 'recruiter',
  match: (c) => {
    const id = interviewRoute(c); if (!kora(c) || !id) return 0;
    if (hireB(c.w).live[id]?.step !== 'LIVE') return 0;
    if (NOTE.test(c.norm)) return 0.95;
    if (/\b(follow.?ups?|vague|what (should|do) i ask (next|now)|next question|previous question|go deeper|dig deeper)\b/.test(c.norm)) return 0.92;
    if (/\b(rate|mark|score|give)\b/.test(c.norm) && criteriaIn(c.norm).length && /\b(strong|some|weak|not shown|none|partial)\b/.test(c.norm)) return 0.92;
    return 0;
  },
  handle: (c) => {
    const id = interviewRoute(c)!; const iv = c.w.interviews.find((i) => i.id === id)!;
    const l = hireB(c.w).live[id]; const plan = hireB(c.w).plans[id] ?? questionsFor(c.w, iv.personId);
    const cur = plan[Math.min(l.current, plan.length - 1)];
    const f = fn(c.w, iv.personId);
    if (/\b(rate|mark|score|give)\b/.test(c.norm) && !NOTE.test(c.norm)) {
      const reqId = criteriaIn(c.norm)[0];
      const rating: Rating = /\b(strong)\b/.test(c.norm) ? 'STRONG' : /\b(not shown|none|weak)\b/.test(c.norm) ? 'NOT_SHOWN' : 'SOME';
      return { msgs: [{ kind: 'reply', text: `Rubric: ${reqLabel(c.w, reqId)} marked “${({ STRONG: 'strong', SOME: 'some', NOT_SHOWN: 'not shown' })[rating]}” for this interview.` }], effects: (w) => { live(w, id).ratings[reqId] = rating; } };
    }
    if (/\b(next question|previous question)\b/.test(c.norm)) {
      const n = /previous/.test(c.norm) ? Math.max(0, l.current - 1) : Math.min(plan.length - 1, l.current + 1);
      return { msgs: [{ kind: 'reply', text: `Next, on ${reqLabel(c.w, plan[n].reqId)}: “${plan[n].text}”`, why: plan[n].why }], effects: (w) => { live(w, id).current = n; } };
    }
    if (!NOTE.test(c.norm)) {
      const last = [...l.notes].reverse()[0];
      const fu = followUpsFor(last?.reqId ?? cur.reqId, last?.text ?? '');
      return { msgs: [{ kind: 'reply', text: `Follow-ups for ${reqLabel(c.w, last?.reqId ?? cur.reqId)}:`, ref: { type: 'hb.followups', id: JSON.stringify(fu) } }] };
    }
    const text = c.text.replace(/^\s*(note:?|notes:?|answer:?)\s*/i, '').trim();
    const reqId = criteriaIn(c.norm)[0] ?? cur.reqId;
    const vague = isVague(text);
    const fu = vague ? followUpsFor(reqId, text) : [];
    return {
      msgs: [{ kind: 'reply', text: vague ? `Noted under ${reqLabel(c.w, reqId)}. That answer sounds general: no specific situation, numbers or personal decision yet.` : `Noted under ${reqLabel(c.w, reqId)}. That’s specific. How would you rate it?`,
        ref: vague ? { type: 'hb.followups', id: JSON.stringify(fu) } : undefined,
        why: vague ? 'Vague = phrases like “helped with”, “we did”, “stuff”, with no example or number. It isn’t a judgement of the person; it means you haven’t heard the evidence yet.' : undefined,
        actions: vague ? [] : (['STRONG', 'SOME', 'NOT_SHOWN'] as Rating[]).map((k) => ({ label: ({ STRONG: 'Strong', SOME: 'Some', NOT_SHOWN: 'Not shown' })[k], act: { t: 'do', op: 'hb.iv.rate', args: { id, reqId, rating: k } } })) }],
      effects: (w) => { live(w, id).notes.push({ id: `n_${Date.now()}`, reqId, text, at: new Date().toISOString(), vague, followups: fu }); void f; },
    };
  },
});

// ============ Feedback: Q drafts from notes, the human edits and submits ============
registerSkill({
  id: 'hire-b.feedback', side: 'recruiter',
  match: (c) => (kora(c) && /\b(feedback|scorecard|write-?up)\b/.test(c.norm) && (interviewRoute(c) || who(c).length || /\b(my|the)\b/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const pid = who(c)[0] ?? personInFocus(c.w, c.route);
    const iv = (interviewRoute(c) && c.w.interviews.find((i) => i.id === interviewRoute(c))) || (pid ? ivFor(c.w, pid) : koraInterviews(c.w).find((i) => hireB(c.w).live[i.id]?.step === 'LIVE' || hireB(c.w).live[i.id]?.step === 'FEEDBACK'));
    if (!iv) return { msgs: [{ kind: 'reply', text: 'Which interview is the feedback for? I can’t find one in progress.', actions: [{ label: 'Open interviews', act: { t: 'nav', to: '/r/interviews' } }] }] };
    const f = fn(c.w, iv.personId);
    if (!iv.panel.includes(c.actor.id)) return { msgs: [{ kind: 'refusal', text: `Only ${f}’s panel can write feedback, and you’re not on it. You can read theirs once it’s submitted.` }] };
    const l = hireB(c.w).live[iv.id];
    if (/\b(submit|send|post|file|finali[sz]e)\b/.test(c.norm)) {
      if (!l?.draft) return { msgs: [{ kind: 'reply', text: 'There’s no draft yet. Say “draft my feedback” and I’ll write one from your notes for you to edit.' }] };
      return { msgs: [{ kind: 'approval', text: `Submit your feedback on ${f} (${l.draft.rating.toLowerCase()})? The panel will see it, it’s added to ${f}’s interview record, and the pipeline card shows your rating. ${f} doesn’t see it.`,
        actions: [{ label: 'Submit feedback', primary: true, act: { t: 'do', op: 'hb.iv.submit', args: { id: iv.id } } }, { label: 'Not yet', act: { t: 'say', text: 'not now' } }] }] };
    }
    const notes = l?.notes.length ?? 0;
    return {
      msgs: [{ kind: 'reply', text: `I drafted your feedback on ${f} from ${notes ? `your ${notes} note${notes === 1 ? '' : 's'}` : 'the rubric (you have no notes, so it’s thin)'}. It’s on the page to edit. Nothing is shared until you submit.`, why: 'Overall rating rule: any must-have “not shown” means concerns; all must-haves strong means strong; otherwise mixed. Change it if you disagree.' }],
      effects: (w) => { finishInterview(w, iv.id); },
      nav: interviewRoute(c) === iv.id ? undefined : { to: `/r/interviews/${iv.id}`, label: 'the interview' },
    };
  },
});

// ============ Disputed assessments ============
registerSkill({
  id: 'hire-b.dispute', side: 'recruiter',
  match: (c) => (kora(c) && (/\b(disput\w*|appeal\w*|contest\w*|under review|review request)\b/.test(c.norm) || (/\b(open|start|request)\b.*\breview\b/.test(c.norm) && who(c).length)) ? 0.92 : 0),
  handle: (c) => {
    const pid = who(c)[0];
    const iv = koraInterviews(c.w).find((i) => i.disputed && (!pid || i.personId === pid) && i.disputed.state === 'OPEN') ?? koraInterviews(c.w).find((i) => i.disputed && (!pid || i.personId === pid));
    if (!iv?.disputed) return { msgs: [{ kind: 'reply', text: pid ? `${fn(c.w, pid)} hasn’t disputed any assessment.` : 'No one has disputed an assessment result.' }] };
    const f = fn(c.w, iv.personId);
    const review = hireB(c.w).reviews[iv.id];
    if (iv.disputed.state === 'RESOLVED') return { msgs: [{ kind: 'reply', text: `${f}’s dispute was reviewed: the result was ${review?.state === 'UPHELD' ? 'upheld, so it counts again' : 'withdrawn, so it no longer counts anywhere'}.` }] };
    if (/\b(open|start|request|raise)\b/.test(c.norm) && !review) return { msgs: [{ kind: 'approval', text: `Open a review request for ${f}’s disputed result? Seyi Balogun (hiring manager) reviews it, ${f} is told it’s under review and nothing more, and the result stays out of every comparison until it’s resolved.`, actions: [{ label: 'Open the review', primary: true, act: { t: 'do', op: 'hb.review.open', args: { id: iv.id } } }, { label: 'Not now', act: { t: 'say', text: 'not now' } }] }] };
    const cell = cellFor(c.w, iv.personId, 'r2');
    return {
      msgs: [{ kind: 'reply', text: `${f} disputed the Go take-home result: “${iv.disputed.reason}” ${review ? 'A review is open with Seyi.' : 'No review has been opened yet.'} Until it’s resolved I treat the result as under review and leave it out of every comparison, so ${f}’s Go row now reads “${LEVEL_WORD[cell.level].toLowerCase()}”. That isn’t a judgement either way: it just stops a contested result from deciding anything.`,
        used: [`${f}’s interview record`, 'Musa’s feedback, 24 Oct'],
        actions: [...(review ? [] : [{ label: 'Open a review request', primary: true, act: { t: 'say', text: `open a review for ${f}'s assessment` } } as QAction]), { label: 'See the interview', act: { t: 'nav', to: `/r/interviews/${iv.id}` } }] }],
    };
  },
});

// ============ Role research: what a senior backend engineer actually does ============
registerSkill({
  id: 'hire-b.role', side: 'recruiter',
  match: (c) => (kora(c) && /\bbackend\b/.test(c.norm) && /\b(what (does|do|is|are)|explain|plain|mean|actually|day to day|in english)\b/.test(c.norm) && !/\b(compar\w*|draft|invit\w*)\b/.test(c.norm) ? 0.89 : 0),
  handle: () => ({
    msgs: [{ kind: 'reply', text: `In plain words: a senior backend engineer builds and looks after the parts of Kora’s product customers never see: the systems that move money, store records and talk to banks. “Senior” means they make design decisions, fix things when they break at 2am, and help others get better.\nFor your brief, that means: Payments systems (making sure money is never lost or paid twice), Go (the programming language Kora’s services are written in), Postgres (the database, and keeping it fast as it grows), on-call (being the one who leads when something breaks) and mentoring.\nYou don’t need to judge code yourself: I show what each person has shown, and the panel engineer marks the technical answers.`,
      used: ['Senior Backend brief v1'], actions: [{ label: 'Compare the shortlist', primary: true, act: { t: 'say', text: 'compare the shortlist on the must haves' } }, { label: 'How would I test Go?', act: { t: 'say', text: 'how do i assess go in production' } }] }],
  }),
});

// ============ Confidential and redacted items ============
registerSkill({
  id: 'hire-b.confidential', side: 'recruiter',
  match: (c) => (kora(c) && /\b(confidential|redacted|nda|secret|hidden|private)\b/.test(c.norm) && !/\b(forget|delete)\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const pid = who(c)[0] ?? personInFocus(c.w, c.route) ?? 'p_tobi';
    const conf = visibleEvidence(c.w, pid, viewerOrg(c.w)).filter((e) => e.confidential);
    const f = fn(c.w, pid);
    return { msgs: [{ kind: 'reply', text: conf.length ? `${f} has shared that ${conf.length === 1 ? 'a confidential item exists' : `${conf.length} confidential items exist`}${conf.some((e) => e.redactedOf) ? ', as an attestation from a former manager' : ''}. I can’t read or show the contents, and I don’t use them to compare. Anything ${f} keeps private isn’t shown or counted at all. If it matters, ask ${f} in the interview what they can say about it.` : `${f} hasn’t shared anything confidential with Kora. I never show or count items people keep private.` }] };
  },
});

// ============ Explain a project in plain words ============
registerSkill({
  id: 'hire-b.project', side: 'recruiter',
  match: (c) => (kora(c) && /\b(code|project|portfolio|library|sample|repo|repository)\b/.test(c.norm) && /\b(what|explain|show|mean|tell|understand|look at|see)\b/.test(c.norm) && (who(c).length || c.route.startsWith('/r/people/')) && !/\b(retry|again|down|outage)\b/.test(c.norm) ? 0.87 : 0),
  handle: (c) => {
    const pid = who(c)[0] ?? personInFocus(c.w, c.route)!;
    const items = visibleEvidence(c.w, pid, viewerOrg(c.w)).filter((e) => PROJECTS[e.evidenceId] && !e.confidential);
    const f = fn(c.w, pid);
    if (!items.length) return { msgs: [{ kind: 'reply', text: `${f} hasn’t shared any code or portfolio pages with Kora.` }], nav: c.route.startsWith(`/r/people/${pid}`) ? undefined : { to: `/r/people/${pid}`, label: `${f}’s profile` } };
    const crit = criteriaIn(c.norm);
    const e = items.find((x) => crit.some((r) => (x.title + PROJECTS[x.evidenceId].explain.summary).toLowerCase().includes(r === 'r2' ? 'go' : r === 'r1' ? 'pay' : 'postgres'))) ?? items[0];
    const p = PROJECTS[e.evidenceId];
    return {
      msgs: [{ kind: 'reply', text: `${e.title}: ${p.explain.summary}\nWhat it shows: ${p.explain.shows.join(' ')}\nWhat it doesn’t show: ${p.explain.doesNot.join(' ')}${p.github && hireB(c.w).github.status !== 'OK' ? '\nGitHub isn’t responding right now, so this is my cached copy.' : ''}`, used: [`${e.source}, ${e.observedAt}`], why: 'Read-only: I never run candidates’ code.' }],
      nav: c.route.startsWith(`/r/people/${pid}`) ? undefined : { to: `/r/people/${pid}`, label: `${f}’s profile` },
    };
  },
});

void actorOf; void emit; void ((a: Actor) => a); void ((r: QReply) => r);
