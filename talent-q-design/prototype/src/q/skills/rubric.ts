// Q skills for the evaluation studio and scorecards (audit addendum §E; J11 steps 5, 8 and 9). Everything the
// studio and the scorecard do can be said to Q in plain, imperfect language, and goes through the same ops:
//   "propose a rubric for the senior backend role" · "make incidents and on-call weight 2" · "add mentoring" ·
//   "remove postgres" · "approve the rubric" · "why is payments in the rubric" · "show Tobi's scorecard" ·
//   "lower postgres to 2 because …" (a reason is required; Q asks for it) · "keep v1 for this round".
// Q refuses protected characteristics and their proxies with a reason and a job-related alternative.
import { emit, type World } from '../../mock/world';
import type { QAction, RubricCriterion } from '../../state/domain';
import { registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import { approvedVersion, draftVersion, latestApproved, ratingsOf, rubricFor, roleIndex } from '../../state/areas/rubrics';
import { card, firstOf, indexLine, list, propose, proposeRatings, roleIn, roleOf, scored, screen, studioPath } from '../../journeys/rubric/model';
import { addCriterion, approvalNeeds, approve, editable, overrideRating, proposeRubric, rateFromEvidence, removeCriterion, reviewCard, setWeight } from '../../journeys/rubric/ops';
import { peopleIn, personInFocus } from '../../journeys/hire-b/model';
import { putRating } from '../../state/areas/rubrics';

const recruiter = (c: QCtx) => c.actor.side === 'recruiter' && !!c.actor.orgId;
const onStudio = (c: QCtx) => /^\/r\/roles\/[\w-]+\/rubric/.test(c.route);
const RUBRICISH = /\b(rubric|rubrik|rubic|criteri\w*|scorecard|evaluation)\b/;
const ctxRubric = (c: QCtx) => onStudio(c) || RUBRICISH.test(c.norm);
const who = (c: QCtx) => peopleIn(c.norm, c.ents.people).filter((p) => c.w.people.some((x) => x.personId === p));
const stay = (c: QCtx, id: string) => (c.route.startsWith(studioPath(id)) ? undefined : { to: studioPath(id), label: 'the evaluation rubric' });
const NUMW: Record<string, number> = { zero: 0, nought: 0, one: 1, two: 2, three: 3, four: 4, five: 5 };
const num = (s: string) => (s in NUMW ? NUMW[s] : Number(s));

/** Criteria named in a sentence, resolved against the version being worked on (draft, else in force). */
const KEYS: [RegExp, string][] = [[/\bpayouts?\b/, 'payouts'], [/\b(payments?|reconcil\w*)\b/, 'payments'], [/\b(golang|go)\b(?! (back|to|ahead|through|over|with|for|on)\b)/, 'go'], [/\b(postgres\w*|sql|database)\b/, 'postgres'], [/\b(on-?call|incidents?)\b/, 'oncall'], [/\bmentor\w*\b/, 'mentoring'], [/\bright to work\b/, 'elig_rtw'], [/\b(compatib\w*|hybrid|preferences?)\b/, 'compat']];
function workingCriteria(w: World, mandateId: string): RubricCriterion[] { return (draftVersion(w, mandateId) ?? latestApproved(w, mandateId))?.criteria ?? []; }
function critsIn(w: World, mandateId: string, norm: string, from = workingCriteria(w, mandateId)): RubricCriterion[] {
  const out: RubricCriterion[] = [];
  for (const [re, k] of KEYS) if (re.test(norm)) { const c = from.find((x) => x.id === `c_${k}`); if (c && !out.includes(c)) out.push(c); }
  for (const c of from) if (!out.includes(c) && norm.includes(c.label.toLowerCase())) out.push(c);
  return out;
}
const share = (cs: RubricCriterion[], c: RubricCriterion) => { const t = cs.filter(scored).reduce((s, x) => s + x.weight, 0); return t ? Math.round((100 * c.weight) / t) : 0; };
const weightsLine = (cs: RubricCriterion[]) => cs.filter(scored).map((c) => `${c.label} ${c.weight}`).join(', ');

// ============ Refusal: protected characteristics and proxies (AD-E-06) ============
registerSkill({
  id: 'rubric.refuse', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c)) return 0;
    const intent = /\b(add|include|score|rate|weigh\w*|criteri\w*|require|prefer|filter|judge|mark)\b/.test(c.norm);
    return intent && (ctxRubric(c) || /\b(score|rate|judge|mark)\b/.test(c.norm)) && screen(c.norm.replace(/\b(add|include|to the rubric|in the rubric|a criterion for|criterion|criteria)\b/g, ' ')) ? 0.985 : 0;
  },
  handle: (c) => {
    const r = screen(c.norm)!; const id = roleIn(c.w, c.norm, c.route);
    return {
      msgs: [{ kind: 'refusal', text: `I can’t put ${r.what} in the rubric: ${r.why}. If there’s a real need behind it, score the job task instead: ${r.instead}.`,
        why: 'Rubric criteria must be job-related and anchored to observable work. Declined requests are logged so the team can see the rule was applied the same way every time.',
        actions: [{ label: 'Why is that a rule?', act: { t: 'say', text: 'why can you not filter by that' } }, ...(onStudio(c) ? [] : [{ label: 'Open the rubric', act: { t: 'nav', to: studioPath(id) } } as QAction])] }],
      effects: (w, a) => emit(w, a.id, 'rubric.refused', `ORG:${a.orgId}`, `Q declined a rubric criterion (${r.what}). Nothing was added.`, { mandateId: id }),
    };
  },
});

// ============ Propose ============
registerSkill({
  id: 'rubric.propose', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(propose|draft|suggest|create|make|build|write|set up|start|need|give me|generate)\b/.test(c.norm) && /\b(rubric|rubrik|rubic|scorecard criteria|evaluation criteria|assessment criteria|how (we|to) (judge|assess|score))\b/.test(c.norm) && !/\bapprov\w*\b/.test(c.norm) ? 0.95 : 0),
  handle: (c) => {
    const id = roleIn(c.w, c.norm, c.route); const role = roleOf(c.w, id)!;
    const d = draftVersion(c.w, id); const ap = latestApproved(c.w, id);
    if (d) return { msgs: [{ kind: 'reply', text: `There’s already a draft (v${d.v}) for ${role.title}: ${weightsLine(d.criteria)}. Change it here, or say “approve the rubric”.`, actions: [{ label: 'Approve the rubric', primary: true, act: { t: 'say', text: 'approve the rubric' } }] }], nav: stay(c, id) };
    if (ap) return { msgs: [{ kind: 'reply', text: `${role.title} already has an approved rubric (v${ap.v}), and it’s frozen. Tell me what to change (for example “add mentoring”) and I’ll start v${ap.v + 1} as a draft.` }], nav: stay(c, id) };
    const p = propose(c.w, id);
    return {
      msgs: [{ kind: 'reply', text: `I drafted a rubric for ${role.title} from the approved brief, ${c.w.orgs.find((o) => o.id === role.orgId)?.name}’s guidelines and ESCO skills (illustrative ids). The criteria and weights are on the page. Right to work is a gate and compatibility sits outside the index.${p.leftOut.length ? ` I left out ${list(p.leftOut.map((x) => x.label.toLowerCase()))}: ${p.leftOut[0].why}` : ''} Nothing scores until you approve it.`,
        ref: { type: 'rb.rubric', id }, used: p.sources, why: 'Rule-based drafting from the brief. The weights are a starting point that needs job analysis and validation; they are not a validated test.',
        actions: [{ label: 'Approve the rubric', primary: true, act: { t: 'say', text: 'approve the rubric' } }, { label: 'Why is payments in it?', act: { t: 'say', text: 'why is payments in the rubric' } }] }],
      effects: (w, a) => { proposeRubric(w, a, id); },
      nav: stay(c, id),
    };
  },
});

// ============ Weights ============
const WEIGHT_RE = /\b(weigh\w*|count\w*|worth|weight)\b/;
const NUM_RE = /\b(?:to|of|at|as|=|weight|weigh|weighs|worth|count|counts|be)\s+(?:a\s+)?(\d|zero|one|two|three|four|five)\b|\b(\d|zero|one|two|three|four|five)\s*(?:points?|x)?\s*$/;
registerSkill({
  id: 'rubric.weight', side: 'recruiter',
  match: (c) => {
    if (!recruiter(c) || !WEIGHT_RE.test(c.norm) || !NUM_RE.test(c.norm)) return 0;
    const id = roleIn(c.w, c.norm, c.route);
    return (ctxRubric(c) || draftVersion(c.w, id)) && critsIn(c.w, id, c.norm).length ? 0.95 : 0;
  },
  handle: (c) => {
    const id = roleIn(c.w, c.norm, c.route); const m = c.norm.match(NUM_RE)!; const n = num(m[1] ?? m[2]);
    const cs = critsIn(c.w, id, c.norm);
    const frozen = !draftVersion(c.w, id) && latestApproved(c.w, id);
    const sim = structuredClone(c.w); const notes: string[] = [];
    for (const x of cs) { const r = setWeight(sim, c.actor, id, x.id, n); if (r && r.say) notes.push(r.say); }
    const after = workingCriteria(sim, id);
    const changed = cs.map((x) => after.find((y) => y.id === x.id)!).filter((x) => x && x.weight === n);
    if (!changed.length) return { msgs: [{ kind: 'reply', text: notes[0] ?? `${list(cs.map((x) => x.label))} already ${cs.length === 1 ? 'weighs' : 'weigh'} ${n}.` }] };
    return {
      msgs: [{ kind: 'reply', text: `${frozen ? `v${frozen.v} is frozen, so I started draft v${frozen.v + 1}. ` : ''}${list(changed.map((x) => x.label))} now ${changed.length === 1 ? 'weighs' : 'weigh'} ${n} (was ${cs.map((x) => x.weight).join(', ')}), ${changed.map((x) => `${share(after, x)}%`).join(' and ')} of the index. Weights now: ${weightsLine(after)}.`, ref: { type: 'rb.rubric', id }, actions: [{ label: 'Approve the rubric', primary: true, act: { t: 'say', text: 'approve the rubric' } }, { label: 'Undo: open the draft', act: { t: 'nav', to: studioPath(id) } }] }],
      effects: (w, a) => { for (const x of cs) setWeight(w, a, id, x.id, n); },
      nav: stay(c, id),
    };
  },
});

// ============ Add / remove ============
registerSkill({
  id: 'rubric.add', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(add|include|put back|bring back)\b/.test(c.norm) && ctxRubric(c) && !/\b(evidence|video|note|to the campaign|campaign)\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const id = roleIn(c.w, c.norm, c.route);
    const words = c.norm.replace(/[,.?!]/g, ' ').replace(/\b(please|can you|could you|q|add|include|put back|bring back|to|into|in|the|rubric|a|an|new|criterion|criteria|for|as|well|too|also|it|role|senior backend|engineer)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (!words) return { msgs: [{ kind: 'question', text: 'What should I add? Name what the job needs, for example “mentoring” or “writes clear incident reviews”.' }] };
    const sim = structuredClone(c.w);
    const frozen = !draftVersion(c.w, id) && latestApproved(c.w, id);
    const r = addCriterion(sim, c.actor, id, words);
    if (!r.ok) return { msgs: [{ kind: r.say.startsWith('I can’t') ? 'refusal' : 'reply', text: r.say }], effects: r.say.startsWith('I can’t') ? (w, a) => { addCriterion(w, a, id, words); } : undefined };
    const n = approvalNeeds(sim, id);
    const affected = n.affected.length ? ` Approving it changes how people are scored, and ${list(n.affected.map((p) => firstOf(c.w, p)))} ${n.affected.length === 1 ? 'was' : 'were'} rated on v${n.base?.v}, so you’ll choose: notify and reassess, or keep v${n.base?.v} for this round.` : '';
    return {
      msgs: [{ kind: 'reply', text: `${frozen ? `v${frozen.v} is frozen, so I started draft v${frozen.v + 1} and added ` : 'Added '}“${r.c!.label}” (weight ${r.c!.weight}${r.c!.requirementId ? ', from the brief' : ', not on the brief yet'}) with anchored levels, a question and a method.${affected}`, ref: { type: 'rb.rubric', id },
        actions: [{ label: 'Approve it', primary: true, act: { t: 'say', text: 'approve the rubric' } }, { label: `Why ${r.c!.label.toLowerCase()}?`, act: { t: 'say', text: `why is ${r.c!.label.toLowerCase()} in the rubric` } }] }],
      effects: (w, a) => { addCriterion(w, a, id, words); },
      nav: stay(c, id),
    };
  },
});
registerSkill({
  id: 'rubric.remove', side: 'recruiter',
  match: (c) => { if (!recruiter(c) || !/\b(remove|drop|take out|delete|get rid of|leave out)\b/.test(c.norm) || !ctxRubric(c)) return 0; return critsIn(c.w, roleIn(c.w, c.norm, c.route), c.norm).length ? 0.93 : 0; },
  handle: (c) => {
    const id = roleIn(c.w, c.norm, c.route); const cs = critsIn(c.w, id, c.norm);
    const frozen = !draftVersion(c.w, id) && latestApproved(c.w, id);
    return {
      msgs: [{ kind: 'reply', text: `${frozen ? `v${frozen.v} is frozen, so I started draft v${frozen.v + 1} and removed ` : 'Removed '}${list(cs.map((x) => `“${x.label}”`))}. ${cs.some((x) => x.requirementId) ? 'It’s still on the brief, so say why in the rubric note or change the brief too.' : ''}`.trim(), ref: { type: 'rb.rubric', id }, actions: [{ label: 'Put it back', act: { t: 'say', text: `add ${cs[0].label.toLowerCase()} to the rubric` } }] }],
      effects: (w, a) => { for (const x of cs) removeCriterion(w, a, id, x.id); },
      nav: stay(c, id),
    };
  },
});

// ============ Approve, and the change notice ============
const KEEP = /\bkeep (v ?\d+|version \d+|the (old|current|first|earlier) (version|rubric)|it) (for|in) (this|the current) round\b|\bkeep v ?\d+\b/;
const NOTIFY = /\bnotify (and|&) re-?assess\b|\bre-?assess (them|everyone|both|the candidates)\b|\bnotify (them|the candidates|everyone)\b/;
function decide(c: QCtx, id: string, decision: 'NOTIFY_AND_REASSESS' | 'KEEP_FOR_ROUND'): QReply {
  const n = approvalNeeds(c.w, id);
  if (!n.draft || !n.affected.length) return { msgs: [{ kind: 'reply', text: 'There’s no change waiting on that decision.' }], frame: null };
  const names = list(n.affected.map((p) => firstOf(c.w, p)));
  return {
    msgs: [{ kind: 'reply', text: decision === 'KEEP_FOR_ROUND'
      ? `Done. v${n.draft.v} is approved for the next round; v${n.base!.v} stays in force for this one, so ${names} and anyone else this round are judged the same way. Their v${n.base!.v} ratings stay on v${n.base!.v}.`
      : `Done. v${n.draft.v} is approved and in force. ${names} ${n.affected.length === 1 ? 'has' : 'have'} been notified (simulated) and will be reassessed on v${n.draft.v}: unchanged criteria carry over as Q proposals for you to review, new ones start unknown. Their v${n.base!.v} ratings stay on v${n.base!.v}.` }],
    effects: (w, a) => { approve(w, a, id, decision); },
    frame: null, nav: stay(c, id),
  };
}
registerSkill({
  id: 'rubric.approve', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(approve|aprove|approv\w*|sign off|signoff|finali[sz]e|freeze|lock in)\b/.test(c.norm) && (onStudio(c) ? !/\b(message|email|invite|draft (a|an))\b/.test(c.norm) : RUBRICISH.test(c.norm)) ? 0.96 : 0),
  handle: (c) => {
    const id = roleIn(c.w, c.norm, c.route); const role = roleOf(c.w, id)!;
    const n = approvalNeeds(c.w, id);
    if (!n.draft) return { msgs: [{ kind: 'reply', text: approvedVersion(c.w, id) ? `${role.title}’s rubric v${approvedVersion(c.w, id)!.v} is already approved and in force. There’s no draft to approve.` : `There’s no rubric for ${role.title} yet. Shall I propose one?`, actions: approvedVersion(c.w, id) ? [] : [{ label: 'Propose a rubric', primary: true, act: { t: 'say', text: `propose a rubric for the ${role.title.toLowerCase()} role` } }] }], nav: stay(c, id) };
    if (c.actor.role && !['OWNER', 'ADMIN', 'RECRUITER'].includes(c.actor.role)) return { msgs: [{ kind: 'refusal', text: `Only a recruiter or an admin can approve a rubric at ${c.w.orgs.find((o) => o.id === role.orgId)?.name}. I’ve kept the draft; Ada or Ngozi can approve it.` }] };
    if (n.base && !n.lines.length) return { msgs: [{ kind: 'reply', text: `The draft is the same as v${n.base.v}, so there’s nothing new to approve.` }] };
    if (KEEP.test(c.norm)) return decide(c, id, 'KEEP_FOR_ROUND');
    if (NOTIFY.test(c.norm)) return decide(c, id, 'NOTIFY_AND_REASSESS');
    if (n.affected.length) {
      const names = n.affected.map((p) => `${firstOf(c.w, p)} (${indexLine(roleIndex(c.w, id, p, n.base!.v))} on v${n.base!.v})`);
      return {
        msgs: [{ kind: 'approval', text: `Before I approve v${n.draft.v}: it changes how the role is scored (${n.lines.filter((x) => x.material).map((x) => x.text).join('; ')}), and ${list(names)} ${n.affected.length === 1 ? 'was' : 'were'} already assessed on v${n.base!.v}. Choose one. Either way their v${n.base!.v} ratings stay on v${n.base!.v}; nothing is re-scored silently.`,
          actions: [{ label: 'Notify and reassess', primary: true, act: { t: 'say', text: 'notify and reassess' } }, { label: `Keep v${n.base!.v} for this round`, act: { t: 'say', text: `keep v${n.base!.v} for this round` } }] }],
        effects: (w, a) => { approve(w, a, id); },
        frame: { intent: 'rubric.approve', slots: { mandateId: id }, awaiting: 'notice', startedAt: new Date().toISOString() },
        nav: stay(c, id),
      };
    }
    return {
      msgs: [{ kind: 'reply', text: `Approved. ${role.title} rubric v${n.draft.v} is frozen: every candidate for this role at this stage is judged against it, and any change makes a new version. The comparison now uses its weights (${weightsLine(n.draft.criteria)}).`, why: 'Approval is recorded with your name and time in the audit trail.',
        actions: [{ label: 'See the comparison', act: { t: 'nav', to: '/r/compare' } }] }],
      effects: (w, a) => { approve(w, a, id); },
      nav: stay(c, id),
    };
  },
  answer: (c) => {
    const id = String(c.frame?.slots.mandateId ?? 'm_backend');
    if (c.frame?.awaiting !== 'notice') return null;
    if (KEEP.test(c.norm) || /\b(keep (it|the old one)|this round)\b/.test(c.norm)) return decide(c, id, 'KEEP_FOR_ROUND');
    if (NOTIFY.test(c.norm) || /\b(notify|reassess)\b/.test(c.norm)) return decide(c, id, 'NOTIFY_AND_REASSESS');
    return null;
  },
});
registerSkill({
  id: 'rubric.decide', side: 'recruiter',
  match: (c) => (recruiter(c) && (KEEP.test(c.norm) || NOTIFY.test(c.norm)) && approvalNeeds(c.w, roleIn(c.w, c.norm, c.route)).affected.length ? 0.96 : 0),
  handle: (c) => decide(c, roleIn(c.w, c.norm, c.route), KEEP.test(c.norm) ? 'KEEP_FOR_ROUND' : 'NOTIFY_AND_REASSESS'),
});

// ============ Why is X in the rubric ============
registerSkill({
  id: 'rubric.why', side: 'recruiter',
  match: (c) => (recruiter(c) && /\bwhy\b/.test(c.norm) && (/\b(in|on|part of|count\w*|weigh\w*)\b/.test(c.norm)) && ctxRubric(c) && !/\b(cannot|can not|not allowed|refuse|filter by that)\b/.test(c.norm) ? 0.94 : 0),
  handle: (c) => {
    const id = roleIn(c.w, c.norm, c.route); const cs = workingCriteria(c.w, id);
    const x = critsIn(c.w, id, c.norm)[0];
    if (!cs.length) return { msgs: [{ kind: 'reply', text: 'There’s no rubric for this role yet.' }] };
    if (!x) return { msgs: [{ kind: 'reply', text: `That isn’t in the rubric. It has: ${cs.map((y) => y.label).join(', ')}.` }] };
    const req = x.requirementId ? roleOf(c.w, id)?.reqs.find((r) => r.reqId === x.requirementId) : undefined;
    return { msgs: [{ kind: 'reply', text: `${x.label}: ${x.why} ${scored(x) ? `It weighs ${x.weight} (${share(cs, x)}% of the index)${x.minimum !== undefined ? `, with a minimum of level ${x.minimum} that flags a human review, never an automatic no` : ''}.` : 'It isn’t part of the index.'} Judged by: ${x.method.toLowerCase()}.`,
      used: [req ? `Brief requirement “${req.label}” (${req.mustHave ? 'must have' : 'nice to have'})` : 'Added by the recruiter', ...(x.escoRef ? [x.escoRef] : [])], actions: [{ label: `Make it weigh ${x.weight + 1}`, act: { t: 'say', text: `make ${x.label.toLowerCase()} weight ${x.weight + 1}` } }] }] };
  },
});

// ============ Scorecard ============
registerSkill({
  id: 'rubric.scorecard', side: 'recruiter',
  match: (c) => (recruiter(c) && who(c).length && /\b(scorecard|score card|scores?|index|ratings?|rubric)\b/.test(c.norm) && /\b(show|open|see|what|how|view|give)\b/.test(c.norm) && !/\b(lower|raise|change|set|override|propose|add|approve)\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const pid = who(c)[0]; const id = 'm_backend'; const f = firstOf(c.w, pid);
    const cd = card(c.w, id, pid);
    if (!cd) return { msgs: [{ kind: 'reply', text: `There’s no approved rubric for ${roleOf(c.w, id)!.title} yet, so ${f} has no scorecard. I compare on equal must-haves until there is one.`, actions: [{ label: 'Propose a rubric', primary: true, act: { t: 'say', text: 'propose a rubric for the senior backend role' } }] }] };
    const unrev = cd.rows.filter((x) => x.r && !x.r.reviewed).length;
    return {
      msgs: [{ kind: 'reply', text: `${f} on rubric v${cd.ver.v}: ${indexLine(cd.idx)}.${cd.unknown.length ? ` ${list(cd.unknown.map((x) => x.label))} ${cd.unknown.length === 1 ? 'isn’t' : 'aren’t'} rated, so ${cd.unknown.length === 1 ? 'it’s' : 'they’re'} unknown, not zero.` : ''}${unrev ? ` ${unrev} rating${unrev === 1 ? ' is' : 's are'} still Q’s proposal, not reviewed.` : ''}`,
        ref: { type: 'rb.card', id: JSON.stringify({ pid, id, v: cd.ver.v }) }, why: 'Index = weighted average of the rated criteria only (rating ÷ 4); coverage = the share of the rubric’s weight that has a rating. A prototype formula, not a validated test.' }],
      nav: c.route === `/r/people/${pid}` ? undefined : { to: `/r/people/${pid}`, label: `${f}’s profile` },
    };
  },
});

// ============ Override with a reason (asked for when missing) ============
const LEVEL_RE = /\b(?:to|at|as|a)\s+(?:level\s+)?([0-4]|zero|one|two|three|four)\b|\b([0-4])\s*(?:\/|out of|of)\s*4\b/;
const REASON_RE = /\s*(?:,|;|:|\s-\s|\bbecause\b|\bsince\b|\bas\b(?! a\b)|\breason\b|\bthe reason is\b)\s*(.+)$/i;
function overrideTarget(c: QCtx) {
  const id = 'm_backend'; const ver = approvedVersion(c.w, id); const rub = rubricFor(c.w, id);
  const pid = who(c)[0] ?? personInFocus(c.w, c.route);
  if (!ver || !rub || !pid) return null;
  const x = critsIn(c.w, id, c.norm, ver.criteria)[0]; if (!x) return null;
  const r = ratingsOf(c.w, rub.id, ver.v, pid).find((y) => y.criterionId === x.id);
  return { id, ver, rub, pid, x, r };
}
function doOverride(c: QCtx, t: NonNullable<ReturnType<typeof overrideTarget>>, value: number, reason: string): QReply {
  const f = firstOf(c.w, t.pid);
  return {
    msgs: [{ kind: 'reply', text: `Done. ${f}’s ${t.x.label} is now ${value} of 4${t.r ? ` (was ${t.r.rating}, ${t.r.source === 'Q_PROPOSED' && !t.r.reviewed ? 'Q’s proposal' : 'reviewed'})` : ''}: “${t.x.anchors[value]}”. Your reason is in the audit trail and ${f} can see it. ${indexLine(roleIndex((() => { const s = structuredClone(c.w); if (t.r) overrideRating(s, c.actor, t.r.id, value, reason); else putRating(s, { id: 'tmp', rubricId: t.rub.id, v: t.ver.v, personId: t.pid, criterionId: t.x.id, rating: value as 0, uncertainty: 'MEDIUM', refs: [], note: reason, source: 'REVIEWER', by: c.actor.id, at: new Date().toISOString(), reviewed: true }); return s; })(), t.id, t.pid, t.ver.v))} now.`,
      why: 'Overrides keep the original rating, who changed it, when and why.', actions: [{ label: 'Undo the override', act: { t: 'do', op: 'undo' } }] }],
    effects: (w, a) => {
      if (t.r) overrideRating(w, a, t.r.id, value, reason);
      else { putRating(w, { id: `rt_${Date.now()}`, rubricId: t.rub.id, v: t.ver.v, personId: t.pid, criterionId: t.x.id, rating: value as 0, uncertainty: 'MEDIUM', refs: [], note: `Rated by ${a.first}: ${reason}`, source: 'REVIEWER', by: a.id, at: new Date().toISOString(), reviewed: true }); emit(w, a.id, 'rating.set', `ORG:${a.orgId}`, `${a.first} rated ${f}’s ${t.x.label} ${value} on rubric v${t.ver.v}: “${reason}”.`, { personId: t.pid }); }
    },
    frame: null,
  };
}
registerSkill({
  id: 'rubric.override', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(lower|raise|drop|bump|set|change|move|put|mark|rate|override|downgrade|upgrade|reduce|increase)\b/.test(c.norm) && LEVEL_RE.test(c.norm) && !WEIGHT_RE.test(c.norm) && (!onStudio(c) || who(c).length > 0) && overrideTarget(c) ? 0.95 : 0),
  handle: (c) => {
    const t = overrideTarget(c)!; const m = c.norm.match(LEVEL_RE)!; const value = num(m[1] ?? m[2]);
    const after = c.text.replace(/^.*?\b(?:to|at|as)\s+(?:level\s+)?(?:[0-4]|zero|one|two|three|four)\b/i, '');
    const reason = (after.match(REASON_RE)?.[1] ?? '').trim().replace(/^the reason is\s*/i, '');
    if (!reason) return {
      msgs: [{ kind: 'question', text: `What’s the reason for changing ${firstOf(c.w, t.pid)}’s ${t.x.label} to ${value}? An override needs one: it goes in the audit trail and ${firstOf(c.w, t.pid)} can see it.` }],
      frame: { intent: 'rubric.override', slots: { pid: t.pid, cid: t.x.id, value: String(value) }, awaiting: 'reason', startedAt: new Date().toISOString() },
    };
    return doOverride(c, t, value, reason);
  },
  answer: (c) => {
    if (c.frame?.awaiting !== 'reason') return null;
    if (/^(cancel|never ?mind|forget it|no|stop|leave it)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: 'Okay, I left the rating as it was.' }], frame: null };
    if (c.norm.split(' ').length < 2) return null;
    const s = c.frame.slots; const id = 'm_backend'; const ver = approvedVersion(c.w, id); const rub = rubricFor(c.w, id);
    const x = ver?.criteria.find((y) => y.id === s.cid); if (!ver || !rub || !x) return null;
    const r = ratingsOf(c.w, rub.id, ver.v, s.pid).find((y) => y.criterionId === x.id);
    return doOverride(c, { id, ver, rub, pid: s.pid, x, r }, Number(s.value), c.text.replace(/^\s*(because|since|reason:?)\s*/i, '').trim());
  },
});

// ============ Review, rate from shared evidence, and validity ============
registerSkill({
  id: 'rubric.review', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(mark|set|confirm|sign off)\b.*\b(scorecard|ratings?)\b.*\b(reviewed|checked|done)\b|\breview(ed)? (all )?(the |his |her |their )?(scorecard|ratings)\b/.test(c.norm) && !/\breport\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const pid = who(c)[0] ?? personInFocus(c.w, c.route); const id = 'm_backend';
    if (!pid) return { msgs: [{ kind: 'question', text: 'Whose scorecard?' }] };
    const n = (() => { const s = structuredClone(c.w); return reviewCard(s, c.actor, id, pid); })();
    return { msgs: [{ kind: 'reply', text: n ? `Marked ${n} of ${firstOf(c.w, pid)}’s Q-proposed rating${n === 1 ? '' : 's'} as reviewed by you. That’s recorded with your name.` : `Everything on ${firstOf(c.w, pid)}’s scorecard is already reviewed by a person.` }], effects: (w, a) => { reviewCard(w, a, id, pid); } };
  },
});
registerSkill({
  id: 'rubric.rate', side: 'recruiter',
  match: (c) => (recruiter(c) && who(c).length && (/\b(rate|score|assess)\b.*\b(against|on|with|using) (the )?rubric\b/.test(c.norm) || /\bpropose (the )?ratings?\b/.test(c.norm)) ? 0.92 : 0),
  handle: (c) => {
    const pid = who(c)[0]; const id = 'm_backend'; const f = firstOf(c.w, pid);
    if (!approvedVersion(c.w, id)) return { msgs: [{ kind: 'reply', text: 'There’s no approved rubric to rate against yet.' }] };
    const n = proposeRatings(c.w, id, pid, c.actor.orgId!).length;
    return { msgs: [{ kind: 'reply', text: n ? `I proposed ${n} rating${n === 1 ? '' : 's'} for ${f} from what ${f} shared with you, each against the rubric’s anchors with its evidence and uncertainty. They’re proposals until you review them. Criteria with no evidence stay unknown.` : `${f} hasn’t shared anything new I can rate against the rubric. Unrated criteria stay unknown, not zero.` }],
      effects: (w, a) => { rateFromEvidence(w, a, id, pid); }, nav: c.route === `/r/people/${pid}` ? undefined : { to: `/r/people/${pid}`, label: `${f}’s profile` } };
  },
});
registerSkill({
  id: 'rubric.validity', side: 'recruiter',
  match: (c) => (recruiter(c) && (/\b(index|weights?|rubric|score|scorecard|coverage)\b/.test(c.norm) && /\b(valid\w*|accurate|reliable|scientific|proven|trust|mean|means)\b/.test(c.norm)) && !/\bwhat does rubric mean\b/.test(c.norm) ? 0.88 : 0),
  handle: () => ({ msgs: [{ kind: 'reply', text: 'The index is a weighted average of the rated criteria only (each rating out of 4), and coverage is how much of the rubric’s weight has a rating. “62 at 55% coverage” means 62 on the half of the rubric we have evidence for; the rest is unknown, not zero. It isn’t a probability of doing well, it can’t be compared across roles, and neither the weights nor the formula are validated yet. That needs a job analysis with people who do the work and monitoring for adverse impact. A person makes every decision.' }] }),
});

registerSkill({
  id: 'rubric.open', side: 'recruiter',
  match: (c) => (recruiter(c) && /\b(open|show|go to|see|take me to|where is)\b/.test(c.norm) && /\b(rubric|evaluation studio)\b/.test(c.norm) && !who(c).length && !onStudio(c) ? 0.9 : 0),
  handle: (c) => { const id = roleIn(c.w, c.norm, c.route); const v = approvedVersion(c.w, id); const d = draftVersion(c.w, id);
    return { msgs: [{ kind: 'reply', text: d ? `Opening draft v${d.v} of the ${roleOf(c.w, id)!.title} rubric.` : v ? `Opening the ${roleOf(c.w, id)!.title} rubric (v${v.v}, in force).` : `There’s no rubric for ${roleOf(c.w, id)!.title} yet. I’ve opened the studio; say “propose a rubric” and I’ll draft one.` }], nav: { to: studioPath(id), label: 'the evaluation rubric' } }; },
});
void editable;
