// Role-specific evaluation rubrics (audit addendum §E). Versions are frozen once approved; ratings bind to
// {rubricId, v}. The index below is PROTOTYPE ARITHMETIC, not a validated employment test (addendum §E):
//   index    = 100 · Σ(j∈O) w_j·(r_j/4) / Σ(j∈O) w_j      (O = criteria with a rating)
//   coverage = 100 · Σ(j∈O) w_j / Σ(all) w_j
// The index is never shown without coverage; unknown criteria are never zero; it is not comparable across roles.
import type { World } from '../../mock/world';
import type { Rating, Rubric, RubricCriterion, RubricVersion } from '../domain';

/** Q's untouched proposal for a draft version (kept so the studio can show "Q proposed" beside "your version"),
 *  and the edit log of a draft before it is approved (who changed what, in plain words). */
export interface RubricMeta {
  proposals: Record<string, { criteria: RubricCriterion[]; at: string; sources: string[]; leftOut: { label: string; why: string }[] }>;
  edits: Record<string, { at: string; by: string; text: string }[]>;
}
export interface RubricsState { list: Rubric[]; ratings: Rating[]; meta?: RubricMeta }

export const area = { id: 'rubrics', init: (): RubricsState => ({ list: [], ratings: [], meta: { proposals: {}, edits: {} } }) };
export const rubrics = (w: World) => w.areas.rubrics as RubricsState;
export const rubricFor = (w: World, mandateId: string) => rubrics(w).list.find((r) => r.mandateId === mandateId);
/**
 * The version in force for the current round: the latest APPROVED one (a Q_PROPOSED draft is never used for
 * scoring), unless that latest version was approved with "keep v1 for this round", in which case the earlier
 * approved version stays in force for everyone in this round and the newer one waits for the next round.
 */
export const approvedVersion = (w: World, mandateId: string): RubricVersion | undefined => {
  const approved = (rubricFor(w, mandateId)?.versions ?? []).filter((v) => v.state === 'APPROVED');
  for (let i = approved.length - 1; i >= 0; i--) if (approved[i].changeNotice?.decision !== 'KEEP_FOR_ROUND' || i === 0) return approved[i];
  return undefined;
};

export interface IndexResult { index: number | null; coverage: number; observed: number; total: number; v?: number; reviewed: number }
/** Observed role-evidence index and coverage for one person on one role, from the approved version only. */
export function roleIndex(w: World, mandateId: string, personId: string, v = approvedVersion(w, mandateId)?.v): IndexResult {
  const rub = rubricFor(w, mandateId); const ver = rub?.versions.find((x) => x.v === v);
  if (!rub || !ver) return { index: null, coverage: 0, observed: 0, total: 0, reviewed: 0 };
  const rs = rubrics(w).ratings.filter((r) => r.rubricId === rub.id && r.v === ver.v && r.personId === personId);
  const crit = ver.criteria.filter((c) => c.kind !== 'COMPATIBILITY');   // compatibility is reported separately, never in the index
  const all = crit.reduce((s, c) => s + c.weight, 0);
  const obs = crit.map((c) => ({ c, r: rs.find((x) => x.criterionId === c.id) })).filter((x) => x.r);
  const ow = obs.reduce((s, x) => s + x.c.weight, 0);
  const index = ow ? Math.round((100 * obs.reduce((s, x) => s + x.c.weight * (x.r!.rating / 4), 0)) / ow) : null;
  return { index, coverage: all ? Math.round((100 * ow) / all) : 0, observed: obs.length, total: crit.length, v: ver.v, reviewed: obs.filter((x) => x.r!.reviewed).length };
}

// ---------- Helpers (rubric builder). None of these change the arithmetic above. ----------
export const meta = (w: World): RubricMeta => ((rubrics(w).meta ??= { proposals: {}, edits: {} }));
/** The editable draft (Q_PROPOSED), if one is open. */
export const draftVersion = (w: World, mandateId: string) => rubricFor(w, mandateId)?.versions.find((v) => v.state === 'Q_PROPOSED');
export const latestApproved = (w: World, mandateId: string) => [...(rubricFor(w, mandateId)?.versions ?? [])].reverse().find((v) => v.state === 'APPROVED');
/** Ratings of one person on one rubric version (one per criterion; see putRating). */
export const ratingsOf = (w: World, rubricId: string, v: number, personId: string) => rubrics(w).ratings.filter((r) => r.rubricId === rubricId && r.v === v && r.personId === personId);
/**
 * Store a rating, keeping one rating per {rubricId, v, personId, criterionId}. A newer Q proposal never replaces a
 * rating a person reviewed or overrode; it is dropped instead (the reviewer's judgement stands until they change it).
 * Every writer (the scorecard, Q, the video evidence report) should use this.
 */
export function putRating(w: World, r: Rating): Rating {
  const s = rubrics(w);
  const i = s.ratings.findIndex((x) => x.rubricId === r.rubricId && x.v === r.v && x.personId === r.personId && x.criterionId === r.criterionId);
  if (i < 0) { s.ratings.push(r); return r; }
  const old = s.ratings[i];
  if (r.source === 'Q_PROPOSED' && (old.reviewed || old.override)) return old;
  s.ratings[i] = { ...r, id: old.id };
  return s.ratings[i];
}
/** People with at least one rating on a version: who a material change would affect. */
export const ratedPeople = (w: World, rubricId: string, v: number) => rubrics(w).ratings.filter((r) => r.rubricId === rubricId && r.v === v).map((r) => r.personId).filter((p, i, a) => a.indexOf(p) === i);
