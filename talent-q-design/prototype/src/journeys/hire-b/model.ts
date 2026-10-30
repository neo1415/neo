// R2 (Ada): how Q reads shared evidence against a role's requirements. One place for the comparison,
// the profile, Q's skills and the proactive rules, so every surface explains the same thing the same way.
// Rule-based and deliberately transparent: every cell names the evidence (or its absence) behind it.
import type { Evidence, Requirement } from '@contracts';
import { actorOf, canSeeCandidate, simNow, visibleEvidence, type World } from '../../mock/world';
import type { Interview } from '../../state/domain';
import { hireB, type Level, type Rating } from '../../state/areas/hire-b';
import { proof } from '../../state/areas/proof';
import { rubricWeights } from '../rubric/model';

export const KORA_ROLE = 'm_backend';
export const reqsOf = (w: World): Requirement[] => w.mandate.requirements;
export const reqLabel = (w: World, id: string) => reqsOf(w).find((r) => r.reqId === id)?.label ?? id;
/** First name, or the full name when it would be ambiguous: Seyi Okoro (candidate) and Seyi Balogun (Kora's
 *  engineering manager) are different people, so recruiter surfaces always show the surname (merge ledger CL-03). */
export const firstName = (w: World, pid: string) => {
  const n = w.people.find((p) => p.personId === pid)?.name; if (!n) return 'They';
  const f = n.split(' ')[0];
  return w.actors.some((a) => a.side === 'recruiter' && a.first === f) || w.people.some((p) => p.personId !== pid && p.name.split(' ')[0] === f) ? n : f;
};
export const nameOf = (w: World, pid: string) => w.people.find((p) => p.personId === pid)?.name ?? pid;
export const viewerOrg = (w: World) => actorOf(w).orgId ?? 'org_kora';

// ---------- Words Q recognises for each requirement ----------
const CRIT: Record<string, RegExp> = {
  r1: /\b(payments?|reconcil\w*|money|settlements?|fintech)\b/,
  r2: /\b(golang|go)\b/,
  r3: /\b(postgres\w*|sql|databases?|db|queries|query)\b/,
  r4: /\b(on-?call|oncall|incidents?|outages?|post-?mortems?)\b/,
  r5: /\b(mentor\w*|coach\w*|juniors?)\b/,
};
/** Strip phrases where "go" is a verb, so "go back" never reads as the Go language. */
const ungo = (s: string) => s.replace(/\b(go|going) (back|to|ahead|through|over|with|for|on)\b|\blet'?s go\b/g, ' ');
export function criteriaIn(norm: string): string[] { const s = ungo(norm); return Object.keys(CRIT).filter((k) => CRIT[k].test(s)); }

// ---------- People Q recognises (plus short forms the NLU doesn't know) ----------
const ALIASES: [RegExp, string][] = [[/\bife'?s?\b|\bifeoma'?s?\b/, 'p_ife'], [/\btobi'?s?\b/, 'p_tobi'], [/\bzara'?s?\b/, 'p_zara'], [/\bkunle'?s?\b/, 'p_kunle']];
export function peopleIn(norm: string, fromEnts: string[]): string[] {
  const out = [...fromEnts];
  for (const [re, id] of ALIASES) if (re.test(norm) && !out.includes(id)) out.push(id);
  // Keep the order in which they were mentioned.
  const pos = (id: string) => { const n = id.replace('p_', ''); const i = norm.indexOf(n === 'ife' ? 'if' : n); return i < 0 ? 999 : i; };
  return out.sort((a, b) => pos(a) - pos(b));
}
/** The person "him/her/them" refers to: the page, then the most recent person named in the conversation. */
export function personInFocus(w: World, route: string): string | null {
  const m = route.match(/\/r\/people\/(p_\w+)/); if (m) return m[1];
  const iv = route.match(/\/r\/interviews\/(i_\w+)/); if (iv) return w.interviews.find((i) => i.id === iv[1])?.personId ?? null;
  const t = w.q.threads[w.session.actor] ?? [];
  for (let i = t.length - 1; i >= 0; i--) { const ids = peopleIn(t[i].text.toLowerCase(), []); if (ids.length) return ids[ids.length - 1]; }
  return null;
}

// ---------- Which requirement each piece of evidence speaks to ----------
export const EV_REQ: Record<string, { reqId: string; note: string; partial?: boolean }[]> = {
  e_tobi_recon: [{ reqId: 'r1', note: 'Reconciliation for 4m card settlements a day' }],
  e_tobi_go: [{ reqId: 'r2', note: 'Go library, not a service under load' }],
  e_tobi_payout: [{ reqId: 'r2', note: 'Go payout worker with safe retries' }, { reqId: 'r1', note: 'Retries failed payouts without paying twice', partial: true }],
  e_tobi_talk: [{ reqId: 'r1', note: 'Conference talk on safe payouts (a talk, not code)', partial: true }],
  e_tobi_pg: [{ reqId: 'r3', note: 'Tuning exercise: 9s query cut to 140ms' }],
  e_ife_platform: [{ reqId: 'r1', note: 'Card routing, not reconciliation' }, { reqId: 'r2', note: 'Reference confirms she ran Go services' }, { reqId: 'r3', note: 'Postgres mentioned by her reference', partial: true }],
  e_ife_oncall: [{ reqId: 'r4', note: 'Led two serious incidents, wrote the reviews' }],
  e_kunle_api: [{ reqId: 'r1', note: 'Payments API case study' }, { reqId: 'r3', note: 'Gateway used Postgres', partial: true }],
  e_hb_kunle_cv: [{ reqId: 'r1', note: 'CV says he led payments engineering' }, { reqId: 'r2', note: 'CV says “Go expert”' }],
  e_hb_kunle_assess: [{ reqId: 'r2', note: 'Take-home works; retries could pay twice', partial: true }],
  e_ha_kunle_cv: [{ reqId: 'r2', note: 'CV says 6 years of Go in production' }],
  e_ha_kunle_gh: [{ reqId: 'r2', note: 'Public Go commits only since March 2024', partial: true }],
  e_zara_api: [{ reqId: 'r2', note: 'Go service that ingests GPS pings' }],
  e_zara_pg: [{ reqId: 'r3', note: 'Partitioned a 200m-row table by month' }],
  // Evidence-first contrast (build pack 30 Oct): Tobi's reviewed debugging sample; Seyi Okoro's claims and unconfirmed items.
  e_tobi_incident: [{ reqId: 'r3', note: 'Traced a slow API to Postgres lock contention; p95 8s → 180ms' }, { reqId: 'r4', note: 'Worked a real incident, but a sample, not an on-call rota', partial: true }],
  e_seyio_cv: [{ reqId: 'r1', note: 'CV says payments at scale' }, { reqId: 'r2', note: 'CV says “Go at scale”' }, { reqId: 'r3', note: 'CV says “Postgres performance expert”' }, { reqId: 'r4', note: 'CV says he led on-call and incident reviews' }, { reqId: 'r5', note: 'CV says he mentored 6 engineers' }],
  e_seyio_cert: [{ reqId: 'r3', note: '2019 entry-level certificate, issuer not yet confirmed', partial: true }],
  e_seyio_project: [{ reqId: 'r4', note: 'His account of an API reliability programme; nothing shown', partial: true }],
};

export const LEVEL_VALUE: Record<Level, number> = { verified: 3, evidenced: 2, partial: 1, claim: 0, none: 0 };
export const LEVEL_WORD: Record<Level, string> = { verified: 'Verified', evidenced: 'Evidenced, not checked', partial: 'Partial or outdated', claim: 'Claimed, not shown', none: 'Not shown yet' };
export const GLYPH_OF: Record<Level, 'verified' | 'full' | 'partial' | 'none' | 'unclear'> = { verified: 'verified', evidenced: 'full', partial: 'partial', claim: 'unclear', none: 'none' };

export const isGithub = (e: Evidence) => /github|public repo/i.test(e.source);
const YEAR = 365 * 864e5;
const outdated = (w: World, e: Evidence) => simNow(w).getTime() - new Date(e.observedAt).getTime() > 2 * YEAR;

/** Assessment results a candidate disputed: under review and excluded until resolved. */
export function disputedEvidence(w: World): Set<string> {
  const s = new Set<string>();
  for (const i of w.interviews) if (i.disputed && i.disputed.state === 'OPEN') i.feedback.forEach((f) => f.evidenceRefs.forEach((id) => s.add(id)));
  for (const e of w.evidence) if (e.verification === 'UNDER_REVIEW') s.add(e.evidenceId);
  return s;
}

export interface CellItem { e: Evidence; level: Level; note: string; excluded?: 'review' | 'old' | 'confidential' | 'failed' }
export interface Cell { level: Level; items: CellItem[]; correction?: { note: string; by: string } }
export interface Opts { lastYear?: boolean }

export function itemLevel(w: World, e: Evidence, partial?: boolean): Level {
  if (e.kind === 'CLAIM') return 'claim';
  if (partial || outdated(w, e)) return 'partial';
  return e.verification === 'VERIFIED' ? 'verified' : 'evidenced';
}

export function cellFor(w: World, pid: string, reqId: string, o: Opts = {}): Cell {
  const org = viewerOrg(w);
  const disputed = disputedEvidence(w);
  const cutoff = simNow(w).getTime() - YEAR;
  const items: CellItem[] = [];
  for (const e of visibleEvidence(w, pid, org)) {
    const m = EV_REQ[e.evidenceId]?.find((x) => x.reqId === reqId) ?? proof(w).links.find((x) => x.evidenceId === e.evidenceId && x.reqId === reqId && x.state === 'REVIEWED'); if (!m) continue;
    const level = itemLevel(w, e, m.partial);
    const excluded = e.confidential ? 'confidential' : disputed.has(e.evidenceId) ? 'review' : e.verification === 'FAILED' ? 'failed' : o.lastYear && new Date(e.observedAt).getTime() < cutoff ? 'old' : undefined;
    items.push({ e, level, note: m.note, excluded });
  }
  let level: Level = 'none';
  for (const it of items) if (!it.excluded && LEVEL_VALUE[it.level] >= LEVEL_VALUE[level] && (it.level !== 'claim' || level === 'none')) level = it.level;
  const c = [...hireB(w).corrections].reverse().find((x) => x.personId === pid && x.reqId === reqId);
  if (c) return { level: c.level, items, correction: { note: c.note, by: c.by } };
  return { level, items };
}

/** RUBRIC: the weights of the rubric version in force for the role (AD-B-05, AD-E-09), or, with no approved rubric,
 *  equal must-haves (labelled as a placeholder). EQUAL: the recruiter turned the rubric weights off. ('Q' is the
 *  pre-rubric value some saved views still hold; it now means RUBRIC.) */
export type Weighting = 'RUBRIC' | 'EQUAL' | 'Q';
/** lens: the evidence ledger (default) or the CV and proof view (J12 step 3); both read the same choices. */
export interface CompareView { people: string[]; criteria: string[]; lastYear: boolean; weighting: Weighting; open?: { pid: string; reqId: string } | null; last?: Snapshot | null; lens?: 'ledger' | 'proof' }
export const defaultView = (w: World): CompareView => ({ people: rolePeople(w), criteria: reqsOf(w).map((r) => r.reqId), lastYear: false, weighting: 'RUBRIC', open: null });
export const roleRubric = (w: World) => rubricWeights(w, KORA_ROLE);
/** True when the approved rubric's weights are being used. */
export const usesRubric = (w: World, mode: Weighting) => mode !== 'EQUAL' && !!roleRubric(w);
/** Equal must-haves: a must-have counts twice a nice-to-have. Rubric: the criterion weight from the version in force. */
export const weightOf = (w: World, reqId: string, mode: Weighting) => {
  const r = reqsOf(w).find((x) => x.reqId === reqId); const base = r?.mustHave ? 2 : 1;
  const rw = mode === 'EQUAL' ? null : roleRubric(w);
  return rw ? rw.weights[reqId] ?? 0 : base;
};
/** The requirements that carry weight in this view (a requirement left out of the rubric isn't ranked on). */
export const weighted = (w: World, v: CompareView) => v.criteria.filter((r) => weightOf(w, r, v.weighting) > 0);
const dayOf = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
/** One sentence on where the weights come from (the margin note, Q's replies, the switch's help). */
export function weightingNote(w: World, v: Pick<CompareView, 'weighting' | 'criteria'>): string {
  const rw = roleRubric(w);
  if (!rw) return 'No approved rubric for this role yet, so must-haves count the same (twice a nice-to-have). That’s a placeholder, not Kora’s judgement: approve a rubric to set the weights.';
  const by = w.actors.find((a) => a.id === rw.by)?.first ?? 'your team';
  if (v.weighting === 'EQUAL') return `You turned the rubric weights off, so must-haves count the same. Rubric v${rw.v} (approved by ${by}) is unchanged.`;
  const out = v.criteria.filter((r) => rw.weights[r] === undefined).map((r) => reqLabel(w, r));
  return `Weights from rubric v${rw.v}, approved by ${by} on ${dayOf(rw.at)}: ${v.criteria.filter((r) => rw.weights[r]).map((r) => `${shortLabel(w, r)} ${rw.weights[r]}`).join(', ')}.${out.length ? ` ${out.join(' and ')} ${out.length === 1 ? 'isn’t' : 'aren’t'} in the rubric, so ${out.length === 1 ? 'it doesn’t' : 'they don’t'} count in the order.` : ''}`;
}

/** People in Kora's Senior Backend pipeline who are still in the process. */
export const rolePeople = (w: World) => w.pipeline.filter((p) => p.mandateId === KORA_ROLE && !['REJECTED', 'WITHDRAWN'].includes(p.stage)).map((p) => p.personId).filter((id, i, a) => a.indexOf(id) === i && canSeeCandidate(w, id, 'org_kora'));

export interface Ranked { pid: string; score: number; verified: number; evidenced: number; partial: number; none: number }
export function rank(w: World, v: CompareView): Ranked[] {
  // Saved views are caches: re-check privacy every time they are read.
  return v.people.filter((pid) => canSeeCandidate(w, pid, viewerOrg(w))).map((pid) => {
    const r: Ranked = { pid, score: 0, verified: 0, evidenced: 0, partial: 0, none: 0 };
    for (const req of v.criteria) {
      const c = cellFor(w, pid, req, { lastYear: v.lastYear });
      r.score += LEVEL_VALUE[c.level] * weightOf(w, req, v.weighting);
      if (c.level === 'verified') r.verified++; else if (c.level === 'evidenced') r.evidenced++; else if (c.level === 'partial') r.partial++; else r.none++;
    }
    return r;
  }).sort((a, b) => b.score - a.score);
}

/** Q's margin notes: rewritten whenever the people, criteria, filter, weighting or evidence change. */
export function readingOf(w: World, v: CompareView): string[] {
  if (!v.people.length || !v.criteria.length) return ['Pick at least one person and one requirement and I’ll compare them.'];
  const out: string[] = [];
  const rk = rank(w, v);
  const [a, b] = rk;
  const fn = (p: string) => firstName(w, p);
  const strongest = (pid: string) => v.criteria.filter((r) => cellFor(w, pid, r, v).level === 'verified').map((r) => reqLabel(w, r));
  if (a && b && a.score === b.score) out.push(`${fn(a.pid)} and ${fn(b.pid)} are level on what you chose. I’d talk to both.`);
  else if (a) out.push(`${fn(a.pid)} has the strongest evidence on what you chose${strongest(a.pid).length ? `, checked at the source for ${strongest(a.pid).join(' and ')}` : ''}.${b ? ` ${fn(b.pid)} is next${a.score - b.score < 2 ? ', and close' : ''}.` : ''}`);
  const nobody = v.criteria.filter((r) => v.people.every((p) => ['none', 'claim'].includes(cellFor(w, p, r, v).level)));
  if (nobody.length) out.push(`Nobody has shown ${nobody.map((r) => reqLabel(w, r)).join(' or ')} yet. That’s a question for the interview, not a reason to rule anyone out.`);
  out.push(weightingNote(w, v));
  const claims = v.people.filter((p) => v.criteria.some((r) => cellFor(w, p, r, v).level === 'claim'));
  if (claims.length) out.push(`${claims.map(fn).reduce((acc, x, k, a) => (k === 0 ? x : `${acc}${k === a.length - 1 ? ' and ' : ', '}${x}`), '')} ${claims.length === 1 ? 'has' : 'have'} CV claims with nothing behind them yet. Unknown isn’t the same as weak.`);
  const review = v.people.filter((p) => v.criteria.some((r) => cellFor(w, p, r, v).items.some((i) => i.excluded === 'review')));
  if (review.length) out.push(`${review.map(fn).reduce((acc, x, k, a) => (k === 0 ? x : `${acc}${k === a.length - 1 ? ' and ' : ', '}${x}`), '')}’s disputed assessment is under review, so I’ve left it out until it’s resolved.`);
  if (v.lastYear) { const old = v.people.filter((p) => v.criteria.some((r) => cellFor(w, p, r, v).items.some((i) => i.excluded === 'old'))); out.push(old.length ? `Using evidence from the last year only: ${old.map(fn).reduce((acc, x, k, a) => (k === 0 ? x : `${acc}${k === a.length - 1 ? ' and ' : ', '}${x}`), '')} lose${old.length === 1 ? 's' : ''} older items.` : 'Using evidence from the last year only. Nobody loses anything on these requirements.'); }
  const gh = v.people.filter((p) => visibleEvidence(w, p, viewerOrg(w)).some((e) => isGithub(e) && v.criteria.some((r) => EV_REQ[e.evidenceId]?.some((m) => m.reqId === r))));
  if (gh.length && hireB(w).github.status !== 'OK') out.push(`GitHub isn’t responding, so ${gh.map(fn).reduce((acc, x, k, a) => (k === 0 ? x : `${acc}${k === a.length - 1 ? ' and ' : ', '}${x}`), '')}’s repositories are shown from my cached copy and stay unchecked.`);
  const corr = hireB(w).corrections.filter((c) => v.people.includes(c.personId) && v.criteria.includes(c.reqId));
  if (corr.length) out.push(`Includes ${corr.length === 1 ? 'your correction' : `${corr.length} corrections`}: ${corr.map((c) => `${fn(c.personId)}, ${reqLabel(w, c.reqId)}`).join('; ')}.`);
  return out;
}

// ---------- Assessments Q can recommend, and why ----------
export const ASSESS: Record<string, { type: string; minutes: string; why: string; avoid: string }> = {
  r1: { type: 'Structured design conversation on reconciliation, plus a reference check', minutes: '45 min + a call', why: 'Payments judgement shows up in how someone reasons about money going missing, which a conversation probes better than a coding test. A reference confirms it happened at real scale.', avoid: 'A generic coding test: it won’t tell you whether they’ve handled real money.' },
  r2: { type: 'Code review of their own Go, or a short paid work sample', minutes: '60–90 min', why: 'Reading code they already wrote is fairer and quicker than a new test. If there’s nothing to read, a short paid task on a real-looking service shows how they handle errors and retries.', avoid: 'Trick puzzles or whiteboard algorithms: they test interview practice, not production Go.' },
  r3: { type: 'Timed query-tuning exercise', minutes: '40 min', why: 'Fixing a slow query on a large table is the job itself, and the result is easy to check.', avoid: 'Asking them to recite index types.' },
  r4: { type: 'Behavioural interview: walk through one real incident', minutes: '30 min', why: 'On-call leadership is about decisions under pressure. Asking for one specific incident, step by step, separates leading from being present.', avoid: 'Hypothetical “what would you do” questions on their own.' },
  r5: { type: 'Clarify the requirement first', minutes: '—', why: 'Your role brief doesn’t say what mentoring means here (how many people, how formal). Decide that, then ask for one example.', avoid: 'Scoring something the team hasn’t defined.' },
};
/** If a person already has verified evidence for a requirement, don't make them prove it again. */
export function assessFor(w: World, pid: string | null, reqId: string) {
  const a = ASSESS[reqId];
  const c = pid ? cellFor(w, pid, reqId) : null;
  const skip = c?.level === 'verified' ? `${firstName(w, pid!)} already has checked evidence for this (${c.items.find((i) => i.level === 'verified')?.e.title}). I wouldn’t test it again; a short conversation about it is enough.` : null;
  return { ...a, skip };
}

// ---------- Interview questions from evidence gaps ----------
const QBANK: Record<string, Record<Level | 'any', string>> = {
  r1: { verified: 'Your reconciliation job matched 4m settlements a day. Tell me about a day the numbers didn’t match: what did you do first?', evidenced: 'Walk me through how money moved in the system you worked on. Where could it go missing?', partial: 'Your payments work is from a while ago. What’s the most recent time you handled money movement, and what changed?', claim: 'Your CV says you led payments engineering. Pick one system: what did it do, and what did you personally build?', none: 'Have you worked on anything that moves or reconciles money? Tell me about it.', any: '' },
  r2: { verified: 'What’s one Go service you ran in production that you’d design differently today?', evidenced: 'Your Go sample is a library. Tell me about a Go service you ran under real load: how did you know it was healthy?', partial: 'In your take-home, a retry could send a payout twice. How would you prevent that in production?', claim: 'You describe yourself as a Go expert. Talk me through how you handle errors and retries in a Go service.', none: 'What languages have you run in production, and how quickly could you pick up Go?', any: '' },
  r3: { verified: 'Your tuning exercise cut a query from 9s to 140ms. What would you check before shipping that index to production?', evidenced: 'Tell me about the biggest table you’ve worked with. What went wrong as it grew?', partial: 'How have you worked with Postgres recently, and at what size?', claim: 'Tell me about a slow query you fixed. How did you find the cause?', none: 'How have you used databases in your work? What’s the largest table you’ve looked after?', any: '' },
  r4: { verified: 'Tell me about the hardest incident you led. What was your first decision?', evidenced: 'In the incidents you led, how did you decide when to roll back?', partial: 'Tell me about the most recent incident you were part of. What was your role, specifically?', claim: 'Tell me about one incident you led, step by step.', none: 'Have you been on call? Tell me about one specific incident: what happened, and what did you do?', any: '' },
  r5: { verified: '', evidenced: '', partial: '', claim: '', none: 'Tell me about someone less experienced you helped grow. What did you do, and what changed for them?', any: 'Tell me about someone less experienced you helped grow. What did you do, and what changed for them?' },
};
export function questionsFor(w: World, pid: string) {
  return reqsOf(w).map((r) => { const c = cellFor(w, pid, r.reqId); const text = QBANK[r.reqId]?.[c.level] || QBANK[r.reqId]?.any || `Tell me about your experience with ${r.label.toLowerCase()}.`;
    const why = c.level === 'verified' ? 'Already checked: go deeper, don’t re-test.' : c.level === 'none' ? 'Nothing shown yet: find out, don’t assume.' : c.level === 'claim' ? 'Only claimed: ask for a specific example.' : c.level === 'partial' ? 'Evidence is partial or old: ask what’s changed.' : 'Shown but not checked: ask how it ran in real life.';
    return { id: `q_${r.reqId}`, reqId: r.reqId, text, why, level: c.level, mustHave: r.mustHave };
  }).sort((a, b) => Number(b.mustHave) - Number(a.mustHave) || LEVEL_VALUE[a.level] - LEVEL_VALUE[b.level]);
}

// ---------- Vague answers and adaptive follow-ups ----------
const VAGUE = /\b(helped|help with|involved|worked on|a lot|lots|kind of|kinda|sort of|stuff|things|various|some|basically|familiar|handled|we did|the team|exposure|assisted|participated)\b/;
export function isVague(text: string) {
  const t = text.toLowerCase();
  const specific = /\d/.test(t) || /\b(i decided|i wrote|i built|i rolled back|i led|because)\b/.test(t);
  return !specific && (VAGUE.test(t) || t.split(/\s+/).length < 7);
}
const FOLLOW: Record<string, string[]> = {
  r1: ['What did you personally build or own in that payments system?', 'When the numbers didn’t match, who noticed, and what did you do?'],
  r2: ['Which part of that Go service did you write yourself?', 'How did you know the service was healthy under load? What did you watch?'],
  r3: ['What was the slowest query you fixed, and how slow was it before and after?', 'How big was the table, roughly?'],
  r4: ['What was your role in that incident, specifically: who decided what to do?', 'How long did it last, and how did you know it was fixed?', 'What changed afterwards because of you?'],
  r5: ['Who was the person, and what could they do afterwards that they couldn’t before?'],
};
export function followUpsFor(reqId: string | undefined, text: string) {
  const base = FOLLOW[reqId ?? ''] ?? [];
  const generic = ['Can you walk me through one specific time, step by step?', 'What did you do yourself, as opposed to the team?'];
  const t = text.toLowerCase();
  const extra = /\b(we|team)\b/.test(t) ? ['You said “we”. What was your part?'] : [];
  return [...extra, ...base, ...generic].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
}

// ---------- Interview helpers ----------
export const koraInterviews = (w: World) => w.interviews.filter((i) => i.orgId === viewerOrg(w));
export const eventOf = (w: World, i: Interview) => (i.eventId ? w.calendar.find((e) => e.id === i.eventId) : undefined);
export function draftFeedback(w: World, i: Interview, ratings: Record<string, Rating>, notes: { reqId?: string; text: string }[]) {
  const reqs = reqsOf(w);
  const must = reqs.filter((r) => r.mustHave);
  const rating: 'STRONG' | 'MIXED' | 'CONCERNS' = must.some((r) => ratings[r.reqId] === 'NOT_SHOWN') ? 'CONCERNS' : must.every((r) => ratings[r.reqId] === 'STRONG') ? 'STRONG' : 'MIXED';
  const by = (k: Rating) => reqs.filter((r) => ratings[r.reqId] === k).map((r) => r.label);
  const unasked = reqs.filter((r) => !ratings[r.reqId]).map((r) => r.label);
  const lines = [
    by('STRONG').length ? `Strong: ${by('STRONG').join(', ')}.` : '',
    by('SOME').length ? `Some evidence: ${by('SOME').join(', ')}.` : '',
    by('NOT_SHOWN').length ? `Not shown in the interview: ${by('NOT_SHOWN').join(', ')}.` : '',
    unasked.length ? `Not covered: ${unasked.join(', ')}.` : '',
    notes.length ? `\nFrom the notes:\n${notes.map((n) => `• ${n.reqId ? `${reqLabel(w, n.reqId)}: ` : ''}${n.text}`).join('\n')}` : '',
  ].filter(Boolean);
  void i;
  return { rating, notes: lines.join('\n') };
}

/** id:verification of everything a person shares with the viewer's org (for "since you last looked"). */
export const visibleIds = (w: World, pid: string) => visibleEvidence(w, pid, viewerOrg(w)).map((e) => `${e.evidenceId}:${e.verification ?? (e.verified ? 'VERIFIED' : 'UNVERIFIED')}`).sort();

// ---------- Ledger: short labels, headline, and "what changed" snapshots ----------
/** Short requirement names for the ledger's column heads and Q cards (the full label stays in tables). */
export const SHORT: Record<string, string> = { r1: 'Payments', r2: 'Go', r3: 'Postgres', r4: 'On-call', r5: 'Mentoring' };
export const shortLabel = (w: World, id: string) => SHORT[id] ?? reqLabel(w, id).split(' ')[0];

/** The page title: the finding, in one short sentence (dataviz: the title states the finding). */
export function headline(w: World, v: CompareView): string {
  if (!v.people.length || !v.criteria.length) return 'Choose who and what to compare';
  const rk = rank(w, v); const [a, b] = rk; const fn = (p: string) => firstName(w, p);
  if (!b) return `${fn(a.pid)} on their own: nothing to rank yet`;
  if (a.score === b.score) return `${fn(a.pid)} and ${fn(b.pid)} are level on what you chose`;
  return `${fn(a.pid)} has the strongest evidence. ${fn(b.pid)} is ${a.score - b.score < 2 ? 'close behind' : 'next'}`;
}

export interface Snapshot { label: string; at: string; order: string[]; scores: Record<string, number>; cells: Record<string, Level> }
export function snapshot(w: World, v: CompareView, label: string): Snapshot {
  const rk = rank(w, v); const cells: Record<string, Level> = {};
  for (const p of v.people) for (const r of v.criteria) cells[`${p}:${r}`] = cellFor(w, p, r, v).level;
  return { label, at: new Date().toISOString(), order: rk.map((r) => r.pid), scores: Object.fromEntries(rk.map((r) => [r.pid, r.score])), cells };
}
/** Plain-words description of a change to the comparison's choices (null when nothing that matters changed). */
export function describeChange(w: World, a: CompareView, b: CompareView): string | null {
  const out: string[] = []; const fn = (p: string) => firstName(w, p);
  const join = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const addP = b.people.filter((p) => !a.people.includes(p)), dropP = a.people.filter((p) => !b.people.includes(p));
  const addC = b.criteria.filter((r) => !a.criteria.includes(r)), dropC = a.criteria.filter((r) => !b.criteria.includes(r));
  // Same verb, one clause: "You took out Zara, Payments and Postgres".
  const added = [...(dropP.length ? [] : addP.map(fn)), ...(dropC.length ? [] : addC.map((r) => shortLabel(w, r)))];
  const removed = [...(addP.length ? [] : dropP.map(fn)), ...(addC.length ? [] : dropC.map((r) => shortLabel(w, r)))];
  if (addP.length && dropP.length) out.push(`chose ${join(b.people.map(fn))}`);
  if (addC.length && dropC.length) out.push(`compared on ${join(b.criteria.map((r) => shortLabel(w, r)))} only`);
  if (added.length) out.push(`added ${join(added)}`);
  if (removed.length) out.push(`took out ${join(removed)}`);
  if (a.lastYear !== b.lastYear) out.push(b.lastYear ? 'kept evidence from the last year only' : 'brought back older evidence');
  if ((a.weighting === 'EQUAL') !== (b.weighting === 'EQUAL')) out.push(b.weighting === 'EQUAL' ? 'weighed the must-haves equally' : 'put the rubric weights back');
  if (!out.length) return null;
  return `You ${join(out)}`;
}
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
export interface Change { moves: string[]; cells: { pid: string; reqId: string; from: Level; to: Level }[]; margin?: string }
export function changesSince(w: World, v: CompareView, s: Snapshot): Change {
  const rk = rank(w, v); const fn = (p: string) => firstName(w, p);
  const moves: string[] = [];
  rk.forEach((r, i) => { const j = s.order.indexOf(r.pid); if (j >= 0 && j !== i) moves.push(`${fn(r.pid)} moved ${j > i ? 'up' : 'down'} from ${ORD[j]} to ${ORD[i]}.`); });
  const cells: Change['cells'] = [];
  for (const p of v.people) for (const r of v.criteria) { const from = s.cells[`${p}:${r}`]; if (!from) continue; const to = cellFor(w, p, r, v).level; if (from !== to) cells.push({ pid: p, reqId: r, from, to }); }
  let margin: string | undefined;
  const [a, b] = rk;
  if (!moves.length && a && b && s.scores[a.pid] !== undefined && s.scores[b.pid] !== undefined) {
    const before = s.scores[a.pid] - s.scores[b.pid], after = a.score - b.score;
    margin = after === before ? `The order didn’t change.` : after === 0 ? `${fn(a.pid)} and ${fn(b.pid)} are now level.` : `The order didn’t change, but ${fn(a.pid)}’s lead over ${fn(b.pid)} ${after < before ? 'narrowed' : 'grew'}.`;
  }
  return { moves, cells, margin };
}
