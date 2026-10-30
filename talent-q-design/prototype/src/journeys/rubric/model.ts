// Evaluation studio model (audit addendum §E, AD-E-01…14, AD-B-05). One place for: what Q proposes for a role,
// the fairness screen for criteria, the diff between versions, what counts as a material change, how a scorecard
// reads, and the weights the comparison borrows. Pure functions over the one store; ops.ts performs changes.
//
// Rule-based and honest about it: Q's "proposal" is assembled from the approved brief, the organisation's written
// guidelines and an illustrative ESCO/ISCO-08 mapping (founder decision D6). Nothing here is a validated test.
import type { Requirement } from '@contracts';
import { visibleEvidence, type World } from '../../mock/world';
import type { CriterionKind, Rating, Rubric, RubricCriterion, RubricVersion } from '../../state/domain';
import { approvedVersion, draftVersion, latestApproved, meta, ratedPeople, ratingsOf, roleIndex, rubricFor, rubrics } from '../../state/areas/rubrics';
import { media, visibleSegments } from '../../state/areas/media';
import { hc } from '../../state/areas/hire-c';
import { protectedCriterion } from '../../q/core/policy';

// ---------- The role (legacy Senior Backend mandate or a MandateX) ----------
export interface RoleInfo { id: string; orgId: string; title: string; reqs: Requirement[]; workMode: string; location: string; briefV: number }
export function roleOf(w: World, mandateId: string): RoleInfo | null {
  if (mandateId === w.mandate.mandateId) return { id: mandateId, orgId: 'org_kora', title: w.mandate.title, reqs: w.mandate.requirements, workMode: w.mandate.workMode, location: w.mandate.location, briefV: w.mandate.version };
  const m = w.mandates.find((x) => x.id === mandateId);
  return m ? { id: m.id, orgId: m.clientOrgId ?? m.orgId, title: m.title, reqs: m.requirements, workMode: m.workMode, location: m.location, briefV: m.versions[m.versions.length - 1]?.v ?? 1 } : null;
}
/** Which role a sentence is about: the page, then words in the sentence, then the Senior Backend role. */
export function roleIn(w: World, norm: string, route: string): string {
  const m = route.match(/^\/r\/roles\/([\w-]+)/); if (m && roleOf(w, m[1])) return m[1];
  if (/\bpayouts?\b/.test(norm) && !/\bsenior\b/.test(norm)) return 'm_payouts';
  if (/\bsupport lead|customer support\b/.test(norm)) return 'm_support';
  return 'm_backend';
}
export const studioPath = (mandateId: string) => `/r/roles/${mandateId}/rubric`;

// ---------- Q's proposal ----------
type Lib = { key: string; label: string; kind: CriterionKind; anchors: RubricCriterion['anchors']; evidence: string[]; questions: string[]; method: string; esco: string; jobWhy: string };
const LIB: { re: RegExp; lib: Lib }[] = [
  { re: /payout|transfer/, lib: { key: 'payouts', label: 'Payouts and safe retries', kind: 'SKILL', esco: 'ESCO skill (illustrative id) esco:S-pay-0412 · ISCO-08 2512',
    anchors: ['No work on systems that send money shown', 'Has called a payments or transfer API without owning money movement', 'Built part of a payout flow; can explain what happens when a transfer fails', 'Owned a payout service in production; retries never pay twice, and they can show how', 'Designed payouts at scale; found and recovered real failed or duplicate payouts'],
    evidence: ['Shared projects that send money out', 'A reference from someone who saw the work', 'A walkthrough of the service, if they choose to share one'], questions: ['Walk me through one payout that failed. What did your system do next?', 'How do you make sure a retry never pays a merchant twice?'], method: 'Structured design conversation on a failed payout, plus a reference check', jobWhy: 'Payouts is the team’s daily work: money leaves Kora every day and a retry that pays twice is a real loss.' } },
  { re: /payment|reconcil|money/, lib: { key: 'payments', label: 'Payments and reconciliation', kind: 'SKILL', esco: 'ESCO skill (illustrative id) esco:S-pay-0398 · ISCO-08 2512',
    anchors: ['No work on systems that move money shown', 'Has worked near payments (for example called a payments API) without owning money movement', 'Built or ran part of a payments flow; can explain how failures are handled', 'Owned a payments or reconciliation service in production; can show how mismatches are found and fixed', 'Designed money movement or reconciliation at scale; prevented or recovered real losses and can show it'],
    evidence: ['Shared projects that move or reconcile money', 'A reference from someone who saw the work', 'A walkthrough of the system, if they choose to share one'], questions: ['Tell me about a day the numbers didn’t match. What did you do first?', 'Where could money go missing in the system you worked on?'], method: 'Structured design conversation on reconciliation, plus a reference check (45 min + a call)', jobWhy: 'The team runs settlement and reconciliation for merchants; mistakes lose real money.' } },
  { re: /\bgo\b|golang/, lib: { key: 'go', label: 'Go services in production', kind: 'SKILL', esco: 'ESCO skill (illustrative id) esco:S-dev-1170 (Go) · ISCO-08 2512',
    anchors: ['Has not written Go', 'Has written Go in exercises or small tools', 'Writes Go libraries or services, not yet run under real load', 'Runs Go services in production; handles errors, retries and timeouts deliberately', 'Leads Go service design under load; others rely on their reviews'],
    evidence: ['Code they already wrote (shared repository or sample)', 'A short paid work sample if there is nothing to read'], questions: ['Tell me about a Go service you ran under real load. How did you know it was healthy?', 'How do you handle errors and retries in a Go service?'], method: 'Code review of their own Go, or a short paid work sample (60–90 min)', jobWhy: 'Kora’s backend services are written in Go and run under real load.' } },
  { re: /postgres|sql|database/, lib: { key: 'postgres', label: 'Postgres at scale', kind: 'PRACTICAL', esco: 'ESCO skill (illustrative id) esco:S-db-0754 (PostgreSQL) · ISCO-08 2512',
    anchors: ['No database work shown', 'Uses SQL for simple queries', 'Designs tables and indexes for a working product', 'Fixes slow queries on large tables and can show before and after', 'Plans schema changes, partitioning and capacity for very large tables safely'],
    evidence: ['A tuning exercise or write-up with before and after numbers', 'A walkthrough of database work, if shared'], questions: ['What was the slowest query you fixed, and how slow was it before and after?', 'What would you check before shipping a new index to production?'], method: 'Timed query-tuning exercise on a realistic table (40 min), marked by an engineer', jobWhy: 'Settlement tables grow by millions of rows a day; slow queries delay merchants’ money.' } },
  { re: /on-?call|incident/, lib: { key: 'oncall', label: 'Incidents and on-call', kind: 'INTERVIEW', esco: 'ESCO skill (illustrative id) esco:S-ops-0233 (incident management) · ISCO-08 2512',
    anchors: ['Has not been on call', 'Was on a rota but has not led an incident', 'Handled incidents with support; can describe one step by step', 'Led serious incidents and wrote the review', 'Shaped how a team runs incidents (runbooks, rota, reviews)'],
    evidence: ['An incident review they wrote (redacted if needed)', 'A reference from someone on the same rota'], questions: ['Tell me about one incident you led, step by step. What was your first decision?', 'How did you decide when to roll back?'], method: 'Behavioural interview: one real incident, step by step (30 min)', jobWhy: 'Senior engineers here take part in a one-week-in-four on-call rota and lead when payments break.' } },
  { re: /mentor|coach|junior/, lib: { key: 'mentoring', label: 'Mentoring', kind: 'INTERVIEW', esco: 'ESCO skill (illustrative id) esco:S-tr-0091 (mentor individuals) · ISCO-08 2512',
    anchors: ['No example of helping someone grow', 'Answers questions informally', 'Pairs or reviews regularly with one person', 'Mentored someone over months, with a change they can describe', 'Set up mentoring that others use'],
    evidence: ['A reference from someone they mentored or their manager'], questions: ['Tell me about someone less experienced you helped grow. What could they do afterwards that they couldn’t before?'], method: 'Behavioural interview question with one specific example (15 min)', jobWhy: 'The team is hiring juniors next year and expects seniors to review and pair with them.' } },
];
const libFor = (label: string) => LIB.find((x) => x.re.test(label.toLowerCase()))?.lib;
export const libByKey = (key: string) => LIB.find((x) => x.lib.key === key)?.lib;

const generic = (r: Requirement): Lib => ({ key: r.reqId, label: r.label, kind: 'SKILL', esco: 'ESCO mapping not chosen yet (illustrative)',
  anchors: [`No evidence of ${r.label.toLowerCase()}`, 'Some exposure, nothing they owned', 'Has done it with support; can describe one example', 'Does it independently and can show the result', 'Leads it and improves how others do it'],
  evidence: ['Shared work examples', 'A reference'], questions: [`Tell me about one time you did this: ${r.plain.toLowerCase()}.`], method: 'Structured interview question with one specific example', jobWhy: r.plain });

export const critId = (key: string) => `c_${key}`;
function fromLib(l: Lib, r: Requirement | null, weight: number): RubricCriterion {
  return { id: critId(l.key), label: l.label, kind: l.kind, weight, minimum: r?.mustHave ? 2 : undefined, anchors: [...l.anchors] as RubricCriterion['anchors'], evidenceToInspect: [...l.evidence], questions: [...l.questions], method: l.method, requirementId: r?.reqId, escoRef: l.esco,
    why: r ? `From the brief: “${r.label}” (${r.mustHave ? 'must have' : 'nice to have'}). ${l.jobWhy}` : l.jobWhy };
}
/** A criterion the recruiter asked to add (by key, a requirement, or free words) — after the fairness screen. */
export function criterionFor(w: World, mandateId: string, words: string): RubricCriterion {
  const role = roleOf(w, mandateId);
  const l = libFor(words);
  const r = role?.reqs.find((q) => (l ? libFor(q.label)?.key === l.key : q.label.toLowerCase() === words.toLowerCase())) ?? null;
  if (l) return fromLib(l, r, r?.mustHave ? 2 : 1);
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  return { ...fromLib(generic({ reqId: '', label, mustHave: false, plain: `${label}, as the team defines it` }), null, 1), id: `c_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}`, requirementId: undefined, why: `Added by the recruiter. It isn’t on the approved brief yet, so write down why the job needs it before approving.` };
}

/** Q's first proposal, from the approved brief + org guidelines + the taxonomy. Mentoring is left out on purpose when
 *  the brief doesn't define it (the founder's "clarify the requirement first" rule from R2). */
export function propose(w: World, mandateId: string): { criteria: RubricCriterion[]; sources: string[]; leftOut: { label: string; why: string }[] } {
  const role = roleOf(w, mandateId)!;
  const criteria: RubricCriterion[] = []; const leftOut: { label: string; why: string }[] = [];
  for (const r of role.reqs) {
    const l = libFor(r.label) ?? generic(r);
    if (l.key === 'mentoring' && !r.mustHave) { leftOut.push({ label: r.label, why: 'The brief doesn’t say what mentoring means here (how many people, how formal). Decide that first, then add it.' }); continue; }
    if (/on-?site|in lagos|office/.test(r.label.toLowerCase())) { criteria.push({ ...fromLib(generic(r), r, 0), id: `c_${r.reqId}`, kind: 'ELIGIBILITY', minimum: undefined, anchors: ['Can’t meet it', 'Can’t meet it', 'Can’t meet it', 'Can meet it', 'Can meet it'], why: `From the brief: “${r.label}”. A condition of the job, checked as met or not met, not scored.`, method: 'Ask directly, the same way for everyone; offer adjustments where the law requires them' }); continue; }
    criteria.push(fromLib(l, r, r.mustHave ? 2 : 1));
  }
  criteria.push({ id: 'c_elig_rtw', label: 'Right to work in Nigeria', kind: 'ELIGIBILITY', weight: 0, anchors: ['Not met', 'Not met', 'Not met', 'Met', 'Met'], evidenceToInspect: ['The candidate’s own statement; documents only at offer stage'], questions: ['Do you have the right to work in Nigeria, or would you need sponsorship?'], method: 'Same question for everyone; documents checked only at offer', escoRef: undefined, why: 'A legal condition of employment. A gate checked as met or not met, never part of the index.' });
  criteria.push({ id: 'c_compat', label: `${role.workMode === 'HYBRID' ? 'Hybrid' : role.workMode === 'REMOTE' ? 'Remote' : 'On-site'} in ${role.location}, pay range and the on-call rota suit them`, kind: 'COMPATIBILITY', weight: 0, anchors: ['Doesn’t suit them', 'Mostly doesn’t suit', 'Unsure', 'Mostly suits', 'Suits them'], evidenceToInspect: ['What the candidate tells you about their preferences and availability'], questions: ['Does the hybrid pattern and the on-call rota work for you?'], method: 'Ask the candidate; their answer, not Q’s guess', why: 'The candidate’s side of the match. Reported separately and never mixed into the skill index.' });
  const guides = (hc(w).guides[role.orgId] ?? []).filter((g) => g.on && ['JOB_RELATED', 'PANEL_TWO'].includes(g.check)).map((g) => `${g.text} (${g.source})`);
  return { criteria, leftOut, sources: [`${role.title} brief v${role.briefV}`, ...guides, 'ESCO skills on ISCO-08 2512 Software developers (illustrative ids, D6)'] };
}

// ---------- Fairness screen (AD-E-06): protected characteristics and their proxies ----------
export interface Refusal { what: string; why: string; instead: string }
const PROXIES: { re: RegExp; r: Refusal }[] = [
  { re: /\bnative (english|speaker)|\baccent\b|\bsounds? (nigerian|british|american|foreign)/, r: { what: 'native speaker or accent', why: 'it stands in for national or ethnic origin, and accent says nothing about whether someone can write a clear incident report', instead: '“Writes clear incident reviews in English” (task-based, judged on a written sample)' } },
  { re: /\b(eye contact|confiden\w* on (camera|video)|facial|body language|tone of voice|voice|smil\w*|appearance|looks? (professional|smart))\b/, r: { what: 'how someone looks or sounds on video', why: 'Talent Q never infers ability, honesty or personality from faces, voices or manner on camera; it’s unreliable and it disadvantages disabled and neurodivergent people', instead: 'a criterion about what they explain, judged from the transcript: “Explains a design decision and its trade-offs”' } },
  { re: /\bculture fit\b|\bfits? (in|our culture)|\bour kind of\b|\blikeable\b/, r: { what: '“culture fit”', why: 'it can’t be anchored to observable work, so it tends to reward people who resemble the panel', instead: 'a named behaviour the job needs, for example “Gives and takes code review well”, with anchors' } },
  { re: /\b(no|without) (career |cv )?gaps?\b|\bgaps? in (their|the) (cv|career)\b|\bcontinuous employment\b/, r: { what: 'gaps in a CV', why: 'gaps follow illness, disability, caring and parenthood, so this proxies protected characteristics without telling you about the work', instead: 'recent evidence of the skill itself, whenever it was gained' } },
  { re: /\b(graduat\w* (after|before|in) \d{4}|years since graduat\w*|digital native|recent graduates?|energetic|fresh)\b/, r: { what: 'graduation year or “energy”', why: 'these are stand-ins for age', instead: 'the experience the job needs, described as tasks' } },
  { re: /\b(top|good|elite|ivy|russell group|first class) (university|universities|school|schools|degree)\b|\bwhich university\b/, r: { what: 'which university someone went to', why: 'it tracks family income and origin more than ability to do this job', instead: 'the skill the degree was meant to show, judged on evidence' } },
  { re: /\b(lives? (near|close|within)|postcode|neighbou?rhood|area they live)\b/, r: { what: 'where someone lives', why: 'location proxies ethnicity and income; the job needs attendance, not an address', instead: 'the hybrid pattern stated the same for everyone (a compatibility question, not a score)' } },
  { re: /\b(health|disabilit\w*|sick days|medical)\b/, r: { what: 'health or disability', why: 'it’s protected, and the law requires adjustments rather than screening', instead: 'the job’s actual duties, with an adjustment route offered to everyone' } },
];
/** Null when the words are fine as a criterion; otherwise what was refused, why, and a job-related alternative. */
export function screen(words: string): Refusal | null {
  const t = ` ${words.toLowerCase()} `;
  if (/\b(accommodation|adjustment|accessib)/.test(t) && !/\b(no|without)\b/.test(t)) return null;
  for (const p of PROXIES) if (p.re.test(t)) return p.r;
  const pr = protectedCriterion(`only ${t}`);
  return pr ? { what: pr.label, why: `${pr.label} isn’t related to doing the job and selecting on it is unlawful in many places`, instead: pr.redirect } : null;
}

// ---------- Versions: diff and material change (AD-E-04, AD-E-07) ----------
export interface DiffLine { kind: 'added' | 'removed' | 'weight' | 'minimum' | 'anchors' | 'label' | 'details'; text: string; material: boolean }
export function diff(a: RubricCriterion[] | undefined, b: RubricCriterion[]): DiffLine[] {
  const out: DiffLine[] = []; const prev = a ?? [];
  for (const c of b) {
    const o = prev.find((x) => x.id === c.id);
    if (!o) { out.push({ kind: 'added', text: `Added “${c.label}” (weight ${c.weight})`, material: true }); continue; }
    if (o.label !== c.label) out.push({ kind: 'label', text: `Renamed “${o.label}” to “${c.label}”`, material: false });
    if (o.weight !== c.weight) out.push({ kind: 'weight', text: `${c.label}: weight ${o.weight} → ${c.weight}`, material: true });
    if ((o.minimum ?? null) !== (c.minimum ?? null)) out.push({ kind: 'minimum', text: `${c.label}: minimum ${o.minimum ?? 'none'} → ${c.minimum ?? 'none'}`, material: true });
    if (o.anchors.join('|') !== c.anchors.join('|')) out.push({ kind: 'anchors', text: `${c.label}: level descriptions changed`, material: true });
    if (o.questions.join('|') !== c.questions.join('|') || o.evidenceToInspect.join('|') !== c.evidenceToInspect.join('|') || o.method !== c.method) out.push({ kind: 'details', text: `${c.label}: questions, evidence or method edited`, material: false });
  }
  for (const o of prev) if (!b.some((x) => x.id === o.id)) out.push({ kind: 'removed', text: `Removed “${o.label}”`, material: true });
  return out;
}
/** The version a draft is compared with: the one in force (or the latest approved). */
export const baseOf = (w: World, mandateId: string) => approvedVersion(w, mandateId) ?? latestApproved(w, mandateId);
/** People whose ratings sit on the version a material change would replace. */
export function affectedBy(w: World, mandateId: string): string[] {
  const rub = rubricFor(w, mandateId); const d = draftVersion(w, mandateId); const base = baseOf(w, mandateId);
  if (!rub || !d || !base) return [];
  if (!diff(base.criteria, d.criteria).some((x) => x.material)) return [];
  return ratedPeople(w, rub.id, base.v);
}

// ---------- Scorecard reading ----------
export const KIND_WORD: Record<CriterionKind, string> = { ELIGIBILITY: 'Eligibility', SKILL: 'Demonstrated skill', INTERVIEW: 'Structured interview', PRACTICAL: 'Practical assessment', COMPATIBILITY: 'Candidate compatibility' };
export const scored = (c: RubricCriterion) => c.kind !== 'COMPATIBILITY' && c.kind !== 'ELIGIBILITY' && c.weight > 0;
export const UNC_WORD = { LOW: 'Low uncertainty', MEDIUM: 'Some uncertainty', HIGH: 'High uncertainty' } as const;
export const fmtT = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export const fmtDay = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const actorName = (w: World, id: string) => w.actors.find((a) => a.id === id)?.name ?? (id === 'q' ? 'Q' : id);
/** First name; a candidate who shares a first name with a colleague (Seyi Okoro vs Seyi Balogun) gets the full name. */
export const firstOf = (w: World, id: string) => {
  const a = w.actors.find((x) => x.id === id); if (a && a.side === 'recruiter') return a.first;
  const name = w.people.find((p) => p.personId === id)?.name ?? a?.name; if (!name) return id;
  const f = name.split(' ')[0];
  return w.actors.some((x) => x.side === 'recruiter' && x.first === f) ? name : f;
};

/** A reference the viewing organisation may still see, with its title, age and reliability. */
export interface RefView { title: string; when?: string; reliability: string; video?: { t: number; tEnd?: number }; quote?: string; visible: boolean }
export function refView(w: World, orgId: string | null, personId: string, ref: Rating['refs'][number]): RefView {
  const ev = w.evidence.find((e) => e.evidenceId === ref.evidenceId);
  const md = media(w).items.find((m) => m.evidenceId === ref.evidenceId || m.id === ref.evidenceId);
  let visible = true;
  if (orgId) {
    if (md) visible = ref.t === undefined ? visibleSegments(w, md.id, orgId).length > 0 : visibleSegments(w, md.id, orgId).some((s) => ref.t! >= s.t && ref.t! < s.tEnd);
    else if (ev) visible = visibleEvidence(w, personId, orgId).some((e) => e.evidenceId === ev.evidenceId) && !ev.confidential;
  }
  const v = ev?.verification ?? (ev?.verified ? 'VERIFIED' : 'UNVERIFIED');
  const reliability = md ? 'Candidate’s own video, transcript checked by them' : ev ? ({ VERIFIED: 'Checked at the source', PENDING: 'Check pending', UNVERIFIED: 'Not checked yet', FAILED: 'Check failed', UNDER_REVIEW: 'Under review' } as Record<string, string>)[v] : 'Interview notes';
  return { title: md?.title ?? ev?.title ?? 'Interview notes', when: ev?.observedAt, reliability, video: ref.t !== undefined ? { t: ref.t, tEnd: ref.tEnd } : undefined, quote: ref.quote, visible };
}
/** How old the newest evidence behind a rating is, in words. */
export function freshness(w: World, r: Rating): string {
  const days = (s: string) => Math.max(0, Math.round((new Date(w.session.now).getTime() - new Date(s).getTime()) / 864e5));
  const dates = r.refs.map((x) => w.evidence.find((e) => e.evidenceId === x.evidenceId)?.observedAt).filter(Boolean) as string[];
  const newest = dates.sort().pop() ?? r.at;
  const d = days(newest);
  return d < 2 ? 'Evidence from this week' : d < 60 ? `Evidence ${d} days old` : d < 400 ? `Evidence ${Math.round(d / 30)} months old` : `Evidence over a year old (${new Date(newest).getFullYear()})`;
}

export interface Card { rub: Rubric; ver: RubricVersion; rows: { c: RubricCriterion; r?: Rating }[]; idx: ReturnType<typeof roleIndex>; unknown: RubricCriterion[]; older: number[] }
/** The scorecard for one person on one role (the version in force unless a version is asked for). */
export function card(w: World, mandateId: string, personId: string, v?: number): Card | null {
  const rub = rubricFor(w, mandateId); const ver = v ? rub?.versions.find((x) => x.v === v) : approvedVersion(w, mandateId);
  if (!rub || !ver || ver.state === 'Q_PROPOSED') return null;
  const rs = ratingsOf(w, rub.id, ver.v, personId);
  const rows = ver.criteria.map((c) => ({ c, r: rs.find((x) => x.criterionId === c.id) }));
  const older = rub.versions.filter((x) => x.v !== ver.v && x.state !== 'Q_PROPOSED' && ratingsOf(w, rub.id, x.v, personId).length).map((x) => x.v);
  return { rub, ver, rows, idx: roleIndex(w, mandateId, personId, ver.v), unknown: rows.filter((x) => !x.r && scored(x.c)).map((x) => x.c), older };
}
export const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** "62 at 55% coverage": the only way the index is ever written. */
export const indexLine = (i: { index: number | null; coverage: number }) => (i.index === null ? 'No index yet: nothing rated' : `${i.index} at ${i.coverage}% coverage`);

// ---------- What the comparison borrows (AD-B-05, AD-E-09) ----------
/** Requirement → weight from the rubric in force for a role; null when no rubric is approved. */
export function rubricWeights(w: World, mandateId: string): { weights: Record<string, number>; v: number; by: string; at: string; extra: string[] } | null {
  const ver = approvedVersion(w, mandateId); if (!ver) return null;
  const weights: Record<string, number> = {}; const extra: string[] = [];
  for (const c of ver.criteria) { if (!scored(c)) continue; if (c.requirementId) weights[c.requirementId] = (weights[c.requirementId] ?? 0) + c.weight; else extra.push(c.label); }
  return { weights, v: ver.v, by: ver.approvedBy ?? ver.by, at: ver.at, extra };
}

// ---------- Q-proposed ratings from shared evidence (separate from the video report, which MEDIA writes) ----------
/** Q's reading of each shared item against the anchors: rating and uncertainty. Unknowns are never rated. */
const EV_RATING: Record<string, { key: string; rating: 0 | 1 | 2 | 3 | 4; u: 'LOW' | 'MEDIUM' | 'HIGH'; note: string }[]> = {
  e_tobi_recon: [{ key: 'payments', rating: 3, u: 'LOW', note: 'Owned reconciliation for about 4m card settlements a day; checked at the source.' }],
  e_tobi_go: [{ key: 'go', rating: 2, u: 'MEDIUM', note: 'A Go library, not a service run under load (anchor 2).' }],
  e_tobi_payout: [{ key: 'go', rating: 3, u: 'MEDIUM', note: 'Go payout worker with safe retries, in production.' }],
  e_tobi_pg: [{ key: 'postgres', rating: 3, u: 'LOW', note: 'Tuning exercise: a 9s query cut to 140ms, before and after shown.' }],
  e_ife_platform: [{ key: 'payments', rating: 2, u: 'MEDIUM', note: 'Card routing rather than reconciliation.' }, { key: 'go', rating: 3, u: 'LOW', note: 'Reference confirms she ran Go services in production.' }, { key: 'postgres', rating: 2, u: 'HIGH', note: 'Postgres mentioned by her reference; no numbers.' }],
  e_ife_oncall: [{ key: 'oncall', rating: 3, u: 'LOW', note: 'Led two serious incidents and wrote the reviews.' }],
  e_kunle_api: [{ key: 'payments', rating: 2, u: 'HIGH', note: 'Payments API case study from 2024.' }],
  e_hb_kunle_assess: [{ key: 'go', rating: 2, u: 'MEDIUM', note: 'Take-home works, but a retry could pay twice.' }],
  e_zara_api: [{ key: 'go', rating: 3, u: 'MEDIUM', note: 'Go service ingesting GPS pings in production; repository check pending.' }],
  e_zara_pg: [{ key: 'postgres', rating: 3, u: 'MEDIUM', note: 'Partitioned a 200m-row table by month; numbers self-reported.' }],
};
export function proposeRatings(w: World, mandateId: string, personId: string, orgId: string): Omit<Rating, 'id' | 'at' | 'by'>[] {
  const rub = rubricFor(w, mandateId); const ver = approvedVersion(w, mandateId); if (!rub || !ver) return [];
  const have = new Set(ratingsOf(w, rub.id, ver.v, personId).map((r) => r.criterionId));
  const items = visibleEvidence(w, personId, orgId).filter((e) => !e.confidential && e.kind !== 'CLAIM' && e.verification !== 'UNDER_REVIEW' && e.verification !== 'FAILED');
  const out: Omit<Rating, 'id' | 'at' | 'by'>[] = [];
  for (const c of ver.criteria) {
    if (!scored(c) || have.has(c.id)) continue;
    const key = c.id.replace(/^c_/, '');
    const hits = items.flatMap((e) => (EV_RATING[e.evidenceId] ?? []).filter((x) => x.key === key).map((x) => ({ e, x })));
    if (!hits.length) continue;
    const best = hits.sort((a, b) => b.x.rating - a.x.rating || (a.x.u === 'LOW' ? -1 : 1))[0];
    out.push({ rubricId: rub.id, v: ver.v, personId, criterionId: c.id, rating: best.x.rating, uncertainty: best.x.u, refs: hits.map((h) => ({ evidenceId: h.e.evidenceId })), note: best.x.note, source: 'Q_PROPOSED', reviewed: false });
  }
  return out;
}
export const roleRatings = (w: World, mandateId: string) => { const rub = rubricFor(w, mandateId); return rub ? rubrics(w).ratings.filter((r) => r.rubricId === rub.id) : []; };
export { meta };
