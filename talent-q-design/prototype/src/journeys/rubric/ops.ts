// Evaluation studio operations. The studio's controls and Q's skills perform work through these registered ops,
// so a button and a sentence do exactly the same thing. Every change that matters is an audited DomainEvent.
//   Rubric lifecycle: (none) → Q_PROPOSED draft → edits (logged) → APPROVED (frozen) → a later draft → APPROVED
//   with a change notice when ratings exist on the version it replaces → SUPERSEDED (or kept for the round).
import { emit, now, uid, type World } from '../../mock/world';
import type { Actor, Rating, RubricCriterion, RubricVersion } from '../../state/domain';
import { pushUndo, registerOp } from '../../q/core/engine';
import { approvedVersion, draftVersion, latestApproved, meta, putRating, ratingsOf, rubricFor, rubrics } from '../../state/areas/rubrics';
import { affectedBy, baseOf, criterionFor, diff, firstOf, list, proposeRatings, propose, roleOf, screen, scored } from './model';

type Res = void | { say?: string; nav?: { to: string; label: string } };
const orgScope = (w: World, mandateId: string) => `ORG:${roleOf(w, mandateId)?.orgId ?? 'org_kora'}`;
const key = (rubricId: string, v: number) => `${rubricId}:v${v}`;
const logEdit = (w: World, rubricId: string, v: number, by: string, text: string) => { (meta(w).edits[key(rubricId, v)] ??= []).push({ at: now(), by, text }); };

/** Create Q's proposal (v1), or return the open draft. */
export function proposeRubric(w: World, actor: Actor, mandateId: string): RubricVersion | null {
  const role = roleOf(w, mandateId); if (!role) return null;
  let rub = rubricFor(w, mandateId);
  if (rub) { const d = draftVersion(w, mandateId); if (d) return d; if (latestApproved(w, mandateId)) return null; }
  if (!rub) { rub = { id: `rb_${mandateId}`, mandateId, orgId: role.orgId, versions: [] }; rubrics(w).list.push(rub); }
  const p = propose(w, mandateId);
  const v = rub.versions.length + 1;
  const ver: RubricVersion = { v, state: 'Q_PROPOSED', criteria: structuredClone(p.criteria), at: now(), by: 'q', note: 'Q’s proposal' };
  rub.versions.push(ver);
  meta(w).proposals[key(rub.id, v)] = { criteria: structuredClone(p.criteria), at: ver.at, sources: p.sources, leftOut: p.leftOut };
  emit(w, actor.id, 'rubric.proposed', orgScope(w, mandateId), `Q proposed an evaluation rubric for ${role.title} (v${v}, ${p.criteria.length} criteria) for ${actor.first} to edit.`, { mandateId, rubricId: rub.id, v });
  return ver;
}
/** The draft to edit: the open one, or a new draft copied from the latest approved version (approved ones are frozen). */
export function editable(w: World, actor: Actor, mandateId: string): RubricVersion | null {
  const d = draftVersion(w, mandateId); if (d) return d;
  const rub = rubricFor(w, mandateId); const base = latestApproved(w, mandateId);
  if (!rub || !base) return proposeRubric(w, actor, mandateId);
  const v = Math.max(...rub.versions.map((x) => x.v)) + 1;
  const ver: RubricVersion = { v, state: 'Q_PROPOSED', criteria: structuredClone(base.criteria), at: now(), by: actor.id, note: `Draft from v${base.v}` };
  rub.versions.push(ver);
  meta(w).proposals[key(rub.id, v)] = { criteria: structuredClone(base.criteria), at: ver.at, sources: [`Approved v${base.v}`], leftOut: [] };
  return ver;
}

export function setWeight(w: World, actor: Actor, mandateId: string, cid: string, weight: number): Res {
  const d = editable(w, actor, mandateId); if (!d) return;
  const c = d.criteria.find((x) => x.id === cid); if (!c) return { say: 'That criterion isn’t in the rubric.' };
  const wt = Math.max(0, Math.min(5, Math.round(weight)));
  if (!scored(c) && wt > 0) return { say: `${c.label} is ${c.kind === 'COMPATIBILITY' ? 'the candidate’s side of the match' : 'a gate (met or not met)'}, so it never carries weight in the index.` };
  if (c.weight === wt) return;
  logEdit(w, rubricFor(w, mandateId)!.id, d.v, actor.id, `${c.label}: weight ${c.weight} → ${wt}`);
  c.weight = wt;
}
export function setMinimum(w: World, actor: Actor, mandateId: string, cid: string, min: number | null): Res {
  const d = editable(w, actor, mandateId); if (!d) return;
  const c = d.criteria.find((x) => x.id === cid); if (!c) return;
  const m = min === null ? undefined : Math.max(0, Math.min(4, min));
  if (c.minimum === m) return;
  logEdit(w, rubricFor(w, mandateId)!.id, d.v, actor.id, `${c.label}: minimum ${c.minimum ?? 'none'} → ${m ?? 'none'}`);
  c.minimum = m;
}
export function patchCriterion(w: World, actor: Actor, mandateId: string, cid: string, patch: Partial<RubricCriterion>): Res {
  const d = editable(w, actor, mandateId); if (!d) return;
  const c = d.criteria.find((x) => x.id === cid); if (!c) return;
  if (patch.label) { const r = screen(patch.label); if (r) return { say: `I can’t use “${patch.label}”: ${r.why}. Instead: ${r.instead}.` }; }
  Object.assign(c, patch);
  logEdit(w, rubricFor(w, mandateId)!.id, d.v, actor.id, `${c.label}: ${Object.keys(patch).join(', ')} edited`);
}
export function addCriterion(w: World, actor: Actor, mandateId: string, words: string): { ok: boolean; say: string; c?: RubricCriterion } {
  const r = screen(words);
  if (r) {
    emit(w, actor.id, 'rubric.refused', orgScope(w, mandateId), `Q declined a rubric criterion (${r.what}). Nothing was added.`, { mandateId });
    return { ok: false, say: `I can’t add a criterion about ${r.what}: ${r.why}. Instead: ${r.instead}.` };
  }
  const d = editable(w, actor, mandateId); if (!d) return { ok: false, say: 'There’s no rubric for this role yet.' };
  const c = criterionFor(w, mandateId, words);
  if (d.criteria.some((x) => x.id === c.id)) return { ok: false, say: `“${c.label}” is already in the rubric.` };
  const at = d.criteria.findIndex((x) => !scored(x));
  d.criteria.splice(at < 0 ? d.criteria.length : at, 0, c);
  logEdit(w, rubricFor(w, mandateId)!.id, d.v, actor.id, `Added “${c.label}” (weight ${c.weight})`);
  return { ok: true, say: '', c };
}
export function removeCriterion(w: World, actor: Actor, mandateId: string, cid: string): Res {
  const d = editable(w, actor, mandateId); if (!d) return;
  const c = d.criteria.find((x) => x.id === cid); if (!c) return;
  d.criteria = d.criteria.filter((x) => x.id !== cid);
  logEdit(w, rubricFor(w, mandateId)!.id, d.v, actor.id, `Removed “${c.label}”`);
}

/** What approval needs: nothing, or a decision on the change notice (ratings exist on the version being replaced). */
export function approvalNeeds(w: World, mandateId: string) {
  const d = draftVersion(w, mandateId); const base = baseOf(w, mandateId);
  if (!d) return { draft: null, lines: [], affected: [] as string[], material: false, base };
  const lines = diff(base?.criteria, d.criteria);
  return { draft: d, lines, material: lines.some((x) => x.material), affected: affectedBy(w, mandateId), base };
}
export function approve(w: World, actor: Actor, mandateId: string, decision?: 'NOTIFY_AND_REASSESS' | 'KEEP_FOR_ROUND'): Res & { needsDecision?: boolean } {
  const rub = rubricFor(w, mandateId); const n = approvalNeeds(w, mandateId); const role = roleOf(w, mandateId);
  if (!rub || !n.draft || !role) return { say: approvedVersion(w, mandateId) ? `Nothing to approve: v${approvedVersion(w, mandateId)!.v} is already in force and there’s no draft.` : 'There’s no rubric draft to approve yet.' };
  if (actor.role && !['OWNER', 'ADMIN', 'RECRUITER'].includes(actor.role)) return { say: `Only a recruiter or an admin can approve a rubric. You can suggest changes; ${firstOf(w, 'u_ada')} or ${firstOf(w, 'u_ngozi')} approves.` };
  if (n.base && !n.lines.length) return { say: `The draft is the same as v${n.base.v}, so there’s nothing new to approve.` };
  const d = n.draft;
  if (n.affected.length && !decision) {
    d.changeNotice = { text: `${list(n.affected.map((p) => firstOf(w, p)))} ${n.affected.length === 1 ? 'was' : 'were'} assessed on v${n.base!.v}. This draft changes how the role is scored (${n.lines.filter((x) => x.material).map((x) => x.text).join('; ')}).`, affected: n.affected };
    emit(w, actor.id, 'rubric.change_notice', orgScope(w, mandateId), `Change notice raised for ${role.title} v${d.v}: ${n.affected.length} assessed on v${n.base!.v}.`, { mandateId, v: d.v, affected: n.affected });
    return { needsDecision: true };
  }
  d.state = 'APPROVED'; d.approvedBy = actor.id; d.at = now();
  d.note = n.base ? `${n.lines.map((x) => x.text).join('; ')}` : 'First approved version';
  if (n.affected.length && decision) {
    d.changeNotice = { ...(d.changeNotice ?? { text: '', affected: n.affected }), affected: n.affected, decision };
    if (decision === 'NOTIFY_AND_REASSESS') {
      n.base!.state = 'SUPERSEDED';
      // Principled re-assessment: unchanged criteria carry the same evidence forward as Q proposals that need a
      // fresh human review on the new version; new or changed criteria start unknown. v1 ratings stay on v1.
      for (const p of n.affected) {
        for (const r of ratingsOf(w, rub.id, n.base!.v, p)) {
          const before = n.base!.criteria.find((c) => c.id === r.criterionId); const after = d.criteria.find((c) => c.id === r.criterionId);
          if (!before || !after || before.anchors.join('|') !== after.anchors.join('|')) continue;
          putRating(w, { ...structuredClone(r), id: uid('rt'), v: d.v, source: 'Q_PROPOSED', reviewed: false, override: undefined, dispute: undefined, at: now(), by: 'q', note: `Carried from v${n.base!.v} (criterion unchanged): ${r.note}`, rating: r.rating });
        }
        emit(w, actor.id, 'rubric.candidate_notified', `SHARED:${role.orgId}:${p}`, `${w.orgs.find((o) => o.id === role.orgId)?.name ?? 'The employer'} changed how the ${role.title} role is assessed (v${d.v}). Your earlier ratings stay on v${n.base!.v}; you’ll be reassessed on v${d.v} before any decision (simulated notice).`, { mandateId, v: d.v, personId: p });
      }
    }
  } else if (n.base) n.base.state = 'SUPERSEDED';
  emit(w, actor.id, 'rubric.approved', orgScope(w, mandateId), `${actor.first} approved the ${role.title} rubric v${d.v}${decision === 'KEEP_FOR_ROUND' ? ` for the next round (v${n.base!.v} stays in force for this round)` : ''}. It is now frozen.`, { mandateId, rubricId: rub.id, v: d.v, decision });
}

export function overrideRating(w: World, actor: Actor, ratingId: string, value: number, reason: string): Res {
  const r = rubrics(w).ratings.find((x) => x.id === ratingId); if (!r) return { say: 'I can’t find that rating.' };
  if (!reason.trim()) return { say: 'An override needs a reason. It goes in the audit trail and the candidate can see it.' };
  const v = Math.max(0, Math.min(4, Math.round(value))) as Rating['rating'];
  const rub = rubrics(w).list.find((x) => x.id === r.rubricId)!; const c = rub.versions.find((x) => x.v === r.v)?.criteria.find((x) => x.id === r.criterionId);
  const prev = structuredClone(r);
  r.override = { from: r.override?.from ?? r.rating, reason: reason.trim(), by: actor.id, at: now() };
  r.rating = v; r.reviewed = true;
  pushUndo(w, actor.id, `your override of ${firstOf(w, r.personId)}’s ${c?.label ?? 'rating'}`, 'rb.rating.restore', { rating: prev });
  emit(w, actor.id, 'rating.overridden', `ORG:${rub.orgId}`, `${actor.first} changed ${firstOf(w, r.personId)}’s ${c?.label ?? 'rating'} from ${prev.rating} to ${v} on rubric v${r.v}: “${reason.trim()}”.`, { personId: r.personId, ratingId: r.id, from: prev.rating, to: v });
}
export function reviewCard(w: World, actor: Actor, mandateId: string, personId: string, v?: number): number {
  const rub = rubricFor(w, mandateId); const ver = v ?? approvedVersion(w, mandateId)?.v; if (!rub || !ver) return 0;
  let n = 0;
  for (const r of ratingsOf(w, rub.id, ver, personId)) if (!r.reviewed) { r.reviewed = true; n++; }
  if (n) emit(w, actor.id, 'scorecard.reviewed', `ORG:${rub.orgId}`, `${actor.first} reviewed ${firstOf(w, personId)}’s scorecard on rubric v${ver} (${n} Q-proposed rating${n === 1 ? '' : 's'}).`, { personId, v: ver });
  return n;
}
export function rateFromEvidence(w: World, actor: Actor, mandateId: string, personId: string): number {
  const role = roleOf(w, mandateId); if (!role) return 0;
  const rs = proposeRatings(w, mandateId, personId, role.orgId);
  for (const r of rs) putRating(w, { ...r, id: uid('rt'), at: now(), by: 'q' });
  if (rs.length) emit(w, actor.id, 'rating.proposed', `ORG:${role.orgId}`, `Q proposed ${rs.length} rating${rs.length === 1 ? '' : 's'} for ${firstOf(w, personId)} from shared evidence (not yet reviewed).`, { personId, mandateId });
  return rs.length;
}
export function dispute(w: World, actor: Actor, ratingId: string, text: string): Res {
  const r = rubrics(w).ratings.find((x) => x.id === ratingId); if (!r) return;
  if (actor.personId !== r.personId) return { say: 'Only the person who was rated can ask for a correction.' };
  r.dispute = { by: actor.id, text: text.trim(), state: 'OPEN', at: now() };
  const rub = rubrics(w).list.find((x) => x.id === r.rubricId)!;
  emit(w, actor.id, 'rating.disputed', `SHARED:${rub.orgId}:${r.personId}`, `${firstOf(w, r.personId)} asked for a correction to a rating on rubric v${r.v}: “${text.trim().slice(0, 140)}”.`, { ratingId, personId: r.personId });
}
export function resolveDispute(w: World, actor: Actor, ratingId: string, note: string): Res {
  const r = rubrics(w).ratings.find((x) => x.id === ratingId); if (!r?.dispute) return;
  r.dispute.state = 'RESOLVED';
  const rub = rubrics(w).list.find((x) => x.id === r.rubricId)!;
  emit(w, actor.id, 'rating.dispute_resolved', `SHARED:${rub.orgId}:${r.personId}`, `${actor.first} answered ${firstOf(w, r.personId)}’s correction request: ${note}`, { ratingId, personId: r.personId });
}

const A = (a: Record<string, unknown>, k: string) => String(a[k] ?? '');
registerOp('rb.propose', (w, a, actor) => { proposeRubric(w, actor, A(a, 'mandateId')); });
registerOp('rb.weight', (w, a, actor) => setWeight(w, actor, A(a, 'mandateId'), A(a, 'cid'), Number(a.weight)));
registerOp('rb.minimum', (w, a, actor) => setMinimum(w, actor, A(a, 'mandateId'), A(a, 'cid'), a.min === null || a.min === undefined ? null : Number(a.min)));
registerOp('rb.patch', (w, a, actor) => patchCriterion(w, actor, A(a, 'mandateId'), A(a, 'cid'), a.patch as Partial<RubricCriterion>));
registerOp('rb.add', (w, a, actor) => { const r = addCriterion(w, actor, A(a, 'mandateId'), A(a, 'words')); return r.ok ? undefined : { say: r.say }; });
registerOp('rb.remove', (w, a, actor) => removeCriterion(w, actor, A(a, 'mandateId'), A(a, 'cid')));
registerOp('rb.reset', (w, a, actor) => {
  const rub = rubricFor(w, A(a, 'mandateId')); const d = draftVersion(w, A(a, 'mandateId')); if (!rub || !d) return;
  const p = meta(w).proposals[key(rub.id, d.v)]; if (!p) return;
  d.criteria = structuredClone(p.criteria); logEdit(w, rub.id, d.v, actor.id, 'Went back to Q’s proposal');
});
registerOp('rb.discard', (w, a, actor) => {
  const rub = rubricFor(w, A(a, 'mandateId')); const d = draftVersion(w, A(a, 'mandateId')); if (!rub || !d || !latestApproved(w, A(a, 'mandateId'))) return;
  rub.versions = rub.versions.filter((x) => x !== d);
  emit(w, actor.id, 'rubric.draft_discarded', `ORG:${rub.orgId}`, `${actor.first} discarded the v${d.v} draft; v${approvedVersion(w, A(a, 'mandateId'))?.v} stays in force.`);
});
registerOp('rb.approve', (w, a, actor) => { const r = approve(w, actor, A(a, 'mandateId'), (a.decision as 'NOTIFY_AND_REASSESS' | 'KEEP_FOR_ROUND' | undefined) || undefined); return r && 'say' in r ? { say: r.say } : undefined; });
registerOp('rb.rating.override', (w, a, actor) => overrideRating(w, actor, A(a, 'id'), Number(a.rating), A(a, 'reason')));
registerOp('rb.rating.restore', (w, a) => { const prev = a.rating as Rating; const s = rubrics(w); const i = s.ratings.findIndex((x) => x.id === prev.id); if (i >= 0) s.ratings[i] = prev; });
registerOp('rb.review', (w, a, actor) => { reviewCard(w, actor, A(a, 'mandateId'), A(a, 'personId'), a.v ? Number(a.v) : undefined); });
registerOp('rb.rate', (w, a, actor) => { const n = rateFromEvidence(w, actor, A(a, 'mandateId'), A(a, 'personId')); if (!n) return { say: `I found nothing new ${firstOf(w, A(a, 'personId'))} shared that I could rate against the rubric. Criteria with no evidence stay unknown, not zero.` }; });
registerOp('rb.dispute', (w, a, actor) => dispute(w, actor, A(a, 'id'), A(a, 'text')));
registerOp('rb.dispute.resolve', (w, a, actor) => resolveDispute(w, actor, A(a, 'id'), A(a, 'note')));
