// Candidate side of evidence-first hiring (build pack 30 Oct; J12 steps 6, 7, 10, 12, 13). Reads the shared model
// (journeys/evidence/model.ts) and the proof slice; never redefines proof classes. Candidate-owned extras the shared
// slice doesn't hold yet (CV drafts, "share existing work instead" offers, unfinished sample answers) live in a small
// candidate slice at w.areas.evcand, created on first write.
import type { Evidence } from '@contracts';
import { simNow, type World } from '../../../mock/world';
import type { EvidenceReuseDecision, HiringIntentConfirmation, ProcessCommitment, ProofClass } from '../../../state/domain';
import { proof, type InterestCheck } from '../../../state/areas/proof';
import { BOUNDED_SAMPLE, PROOF_MEANS, PROOF_WORD, proofClass } from '../model';
import { cellFor, reqLabel } from '../../hire-b/model';

export { PROOF_WORD, PROOF_MEANS, proofClass, BOUNDED_SAMPLE };

// ---------------- Candidate slice ----------------
export interface CvLine { before: string; after: string[]; change: 'SAME' | 'REWORDED' | 'SPLIT' | 'REORDERED'; note?: string; from?: string }
export interface CvDraft { personId: string; at: string; state: 'DRAFT' | 'APPROVED'; lines: CvLine[]; links: string[]; wontAdd: string[]; added: string[]; approvedAt?: string }
export interface Offer { decisionId: string; evidenceIds: string[]; note: string; at: string }
export interface EvCandState { drafts: Record<string, CvDraft>; offers: Offer[]; answers: Record<string, string>; declined: Record<string, string> }
export const evc = (w: World): EvCandState => {
  const s = (w.areas.evcand ??= { drafts: {}, offers: [], answers: {}, declined: {} }) as EvCandState;
  s.drafts ??= {}; s.offers ??= []; s.answers ??= {}; s.declined ??= {};
  return s;
};
/** Read-only view for render (doesn't create the slice). */
export const evcRead = (w: World): EvCandState => (w.areas.evcand as EvCandState | undefined) ?? { drafts: {}, offers: [], answers: {}, declined: {} };

// ---------------- Names and dates ----------------
export const orgNm = (w: World, id: string) => w.orgs.find((o) => o.id === id)?.name ?? id;
/** Full name with surname, always: Seyi Okoro (candidate) and Seyi Balogun (Kora) must never be confused. */
export const fullName = (w: World, id: string) => w.actors.find((a) => a.id === id)?.name ?? w.people.find((p) => p.personId === id)?.name ?? id;
const D = (s: string) => new Date(s.length === 10 ? `${s}T12:00:00+01:00` : s);
export const dayMonth = (s: string) => D(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
export const weekdayDate = (s: string) => D(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number) => WORDS[n] ?? String(n);

// ---------------- Proof class: the same words the recruiter sees ----------------
export const CLASS_ORDER: ProofClass[] = ['ISSUER_VERIFIED', 'ASSESSED', 'SELF_REPORTED', 'CLAIM', 'DISPUTED'];
/** One shape per class (never colour alone). Mirrors the shared Glyph vocabulary where it can. */
export const CLASS_SHAPE: Record<ProofClass, 'verified' | 'full' | 'partial' | 'unclear' | 'disputed'> = { ISSUER_VERIFIED: 'verified', ASSESSED: 'full', SELF_REPORTED: 'partial', CLAIM: 'unclear', DISPUTED: 'disputed' };

/** Freshness in words, from when the item was observed to the simulated today. */
export function freshness(w: World, e: Evidence): { text: string; old: boolean } {
  const days = Math.max(0, Math.floor((simNow(w).getTime() - D(e.observedAt).getTime()) / 864e5));
  const years = Math.floor(days / 365.25);
  if (years >= 1) return { text: `${word(years)} year${years === 1 ? '' : 's'} old`, old: years >= 2 };
  const months = Math.floor(days / 30.4);
  if (months >= 1) return { text: `${word(months)} month${months === 1 ? '' : 's'} old`, old: false };
  return { text: days <= 1 ? 'new this week' : `${days} days old`, old: false };
}

/** Who sees it and how it may be reused, in the candidate's terms. No automatic cross-employer sharing. */
export function reuseScope(w: World, e: Evidence): string {
  if (e.kind === 'PRACTICE') return 'Private practice. Only you, and never shared automatically.';
  if (e.confidential) return 'Only you. Confidential originals are never shared.';
  if (e.visibility === 'PUBLIC_PROFILE') return 'Public on your profile, so anyone who can see you sees it.';
  const live = e.visibility === 'SHARED_WITH' ? e.sharedWith.filter((o) => !e.revokedFrom?.includes(o)) : [];
  if (!live.length) return 'Only you. Not reused for any employer unless you choose.';
  const names = live.map((o) => orgNm(w, o));
  return `${names.join(' and ')} only. Not reused for other employers unless you choose.`;
}

// ---------------- Requests from employers (reuse decisions sent to the candidate) ----------------
export const CANDIDATE_STATES: EvidenceReuseDecision['state'][] = ['SENT', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'DECLINED'];
/** Only requests that left the employer through an approved message reach the candidate (never PROPOSED). */
export const requestsFor = (w: World, pid: string) => proof(w).reuse.filter((d) => d.personId === pid && d.decision !== 'ACCEPT_PRIOR' && CANDIDATE_STATES.includes(d.state));
export const openRequests = (w: World, pid: string) => requestsFor(w, pid).filter((d) => d.state === 'SENT' || d.state === 'IN_PROGRESS');
export const offerFor = (w: World, id: string) => evcRead(w).offers.find((o) => o.decisionId === id);

export interface SampleBrief { title: string; context: string; task: string; prompt: string }
const BRIEFS: Record<string, SampleBrief> = {
  r3: { title: 'One slow query', context: 'A copy of a payouts table: 2 million rows of synthetic data. This query takes about 9 seconds at busy times:', task: 'SELECT * FROM payouts\nWHERE merchant_id = $1 AND status = \'PENDING\'\nORDER BY created_at DESC LIMIT 50;', prompt: 'What would you check first, what do you think is slow, and what would you change? Plain notes are fine.' },
  r4: { title: 'One incident, talked through', context: 'Pick an incident you handled. Use your own notes; leave out anything confidential.', task: 'What broke, how you found out, what you did first, and what changed afterwards.', prompt: 'Write the outline you’d talk a reviewer through.' },
};
export function briefFor(w: World, d: EvidenceReuseDecision): SampleBrief {
  return BRIEFS[d.reqId] ?? { title: reqLabel(w, d.reqId), context: BOUNDED_SAMPLE[d.reqId]?.task ?? reqLabel(w, d.reqId), task: BOUNDED_SAMPLE[d.reqId]?.task ?? '', prompt: 'Describe what you would do, in your own words.' };
}
/** Why the employer asks, in respectful terms: never "your CV may be untrue". */
export function whyAsked(w: World, d: EvidenceReuseDecision): string {
  const cv = proof(w).cvs[d.personId]?.mentions[d.reqId];
  const what = reqLabel(w, d.reqId).toLowerCase();
  const org = orgNm(w, d.orgId);
  return cv === 'YES'
    ? `Your CV already describes ${what} work. A short sample lets ${org} see it directly, instead of a full take-home assessment.`
    : `${org} hasn’t seen ${what} work from you yet. One short sample is the smallest thing that would show it, instead of a full assessment.`;
}
export type ReviewOutcome = { word: string; tone: 'ok' | 'part' | 'not'; note: string };
/** The review outcome as the candidate sees it, only once the employer marks it reviewed (shared with the candidate). */
export function reviewOf(w: World, d: EvidenceReuseDecision): ReviewOutcome | null {
  if (d.state !== 'REVIEWED' || !d.resultEvidenceId) return null;
  const l = proof(w).links.find((x) => x.evidenceId === d.resultEvidenceId && x.reqId === d.reqId);
  if (!l) return null;
  if (l.state === 'DISPUTED') return { word: 'The reviewer didn’t see it in this sample', tone: 'not', note: l.note };
  return l.partial ? { word: 'Shows part of it', tone: 'part', note: l.note } : { word: 'Shows it', tone: 'ok', note: l.note };
}

// ---------------- Interest, intents, commitments ----------------
export const interestFor = (w: World, pid: string): InterestCheck[] => proof(w).interest.filter((i) => i.personId === pid);
export const roleTitle = (w: World, mandateId: string) => w.mandates.find((m) => m.id === mandateId)?.title ?? (w.mandate.mandateId === mandateId ? w.mandate.title : 'the role');
/** A participating employer's confirmation. Never set for discovered or external listings. */
export const intentFor = (w: World, jobId: string): HiringIntentConfirmation | undefined => proof(w).intents.find((i) => i.jobId === jobId && i.state === 'ACTIVE');
export function commitmentFor(w: World, appId: string): (ProcessCommitment & { late: boolean; days: number }) | undefined {
  const c = proof(w).commitments.find((x) => x.applicationId === appId);
  if (!c) return undefined;
  const late = c.state === 'OVERDUE' || (c.state === 'OPEN' && D(c.nextUpdateDue).getTime() < simNow(w).getTime() - 12 * 36e5);
  const days = Math.max(0, Math.round((simNow(w).getTime() - D(c.nextUpdateDue).getTime()) / 864e5));
  return { ...c, late, days };
}

// ---------------- J7: a verified gap, answered privately ----------------
/** The role requirement where what the employer can see is only partial (or not shown), for people J7 knows. */
export function verifiedGap(w: World, pid: string) {
  if (pid !== 'p_tobi') return null; // J7 has an authored persona only for Tobi among the Kora shortlist.
  if (!w.pipeline.some((p) => p.personId === pid && p.mandateId === 'm_backend')) return null;
  const c = cellFor(w, pid, 'r4');
  if (c.level === 'verified' || c.level === 'evidenced') return null;
  return { reqId: 'r4', label: reqLabel(w, 'r4'), level: c.level, item: c.items.find((i) => !i.excluded) ?? null };
}

// ---------------- Preferences ----------------
export const prefsOf = (w: World, pid: string) => proof(w).prefs[pid];

// ---------------- CV help (P6): clearer wording, never new claims ----------------
const DRAFTS: Record<string, { lines: CvLine[]; wontAdd: string[]; offer: string[] }> = {
  p_seyio: {
    lines: [
      { before: 'SEYI OKORO — Senior Backend Engineer', after: ['Seyi Okoro · Senior Backend Engineer'], change: 'REWORDED', note: 'Same title, easier to read than capitals.' },
      { before: 'Postgres performance expert · API reliability · Payments · Go at scale', after: ['Focus: Postgres performance, API reliability, payments, Go'], change: 'REWORDED', note: '“Expert” and “at scale” left out: the results below say more than labels. Put them back if you prefer.' },
      { before: 'Led API reliability for a platform serving 30M users, cutting incident volume by 60%.', after: ['Led API reliability for a platform serving 30M users; incident volume fell 60%.'], change: 'REWORDED', note: 'Your numbers, unchanged. Employers read them as your account until something shows them.' },
      { before: 'Designed high-throughput payment services in Go; owned Postgres performance tuning end to end.', after: ['Designed high-throughput payment services in Go.', 'Owned Postgres performance tuning end to end.'], change: 'SPLIT', note: 'Two achievements, two lines.' },
      { before: 'Led on-call rotations and incident reviews; mentored 6 engineers.', after: ['Led on-call rotations and incident reviews.', 'Mentored 6 engineers.'], change: 'SPLIT' },
      { before: 'Certified PostgreSQL Associate.', after: ['PostgreSQL Associate certificate (2019).'], change: 'REWORDED', note: 'The year is from the certificate in your Passport. The issuer hasn’t confirmed it yet, so Q doesn’t call it verified.', from: 'Your Passport' },
    ],
    wontAdd: [
      'An employer, job title or dates. Your CV names none, and Q won’t guess them.',
      '“Assessed” or “verified” next to any skill. Nothing has been reviewed yet; a reviewed sample would change that.',
      'Skills that aren’t in your CV or Passport, such as Kubernetes or AWS.',
    ],
    offer: ['e_seyio_project', 'e_seyio_cert'],
  },
  p_tobi: {
    lines: [
      { before: 'Tobi A.', after: ['Tobi Adeyemi'], change: 'REWORDED', note: 'Your full name, from your profile.', from: 'Your profile' },
      { before: 'Software developer, Lagos', after: ['Backend engineer · Lagos'], change: 'REWORDED', note: 'The title you use on your profile.', from: 'Your profile' },
      { before: 'Lumen (2019 – 2026): worked on backend stuff for the payments team. Did the reconciliation job and fixed things when they broke.', after: ['Lumen, payments team (2019 – 2026)', 'Ran the reconciliation job.', 'Fixed production problems as they came up.'], change: 'SPLIT', note: 'Same facts, one per line, in plain verbs.' },
      { before: 'Skills: Go, SQL, Linux, some Docker', after: ['Skills: Go, SQL, Linux, Docker (some)'], change: 'REORDERED' },
      { before: 'Education: BSc Computer Science, UNILAG', after: ['BSc Computer Science, University of Lagos (UNILAG)'], change: 'REWORDED', note: 'UNILAG spelled out once.' },
    ],
    wontAdd: [
      '“Postgres” as a skill. Your CV doesn’t say it. Your reviewed debugging sample shows it, so Q offers to link that instead of writing a new claim.',
      '“Led incident response.” Your sample shows you worked one incident, not that you led an on-call rota.',
      'Any number (users, uptime, money) you haven’t given.',
    ],
    offer: ['e_tobi_incident', 'e_tobi_payout'],
  },
};
export const canDraftCv = (w: World, pid: string) => !!proof(w).cvs[pid] && !!DRAFTS[pid];
export const cvOffer = (pid: string) => DRAFTS[pid]?.offer ?? [];

/** Words that count as a claim if they appear: capitalised terms, acronyms and any number. Lower-case glue is free. */
const claimTokens = (s: string) => (s.match(/\b(?:[A-Z][\w+.#-]*|\d[\d,.%]*[MmKk%]?)\b/g) ?? []).map((t) => t.replace(/[.,]$/, '').toLowerCase());
/** Anything in the draft that is in neither the CV, the person's profile nor their own Passport. Must be empty. */
export function addedClaims(w: World, pid: string, before: string[], after: string[]): string[] {
  const person = w.people.find((p) => p.personId === pid);
  const source = [...before, person?.name ?? '', person?.headline ?? '', person?.location ?? '', ...w.evidence.filter((e) => e.ownerId === pid).map((e) => `${e.title} ${e.observedAt.slice(0, 4)}`)].join(' ');
  const known = new Set(claimTokens(source).concat(source.toLowerCase().split(/\W+/)));
  const STRUCT = new Set(['focus', 'skills', 'ran', 'fixed', 'mentored', 'owned', 'designed', 'led', 'bsc', 'same', 'university', 'of', 'lagos']);
  return [...new Set(after.flatMap(claimTokens))].filter((t) => !known.has(t) && !STRUCT.has(t));
}
export function makeDraft(w: World, pid: string, at: string): CvDraft | null {
  const cv = proof(w).cvs[pid]; const a = DRAFTS[pid];
  if (!cv || !a) return null;
  const lines = a.lines.map((l, i) => ({ ...l, before: cv.lines[i] ?? l.before }));
  return { personId: pid, at, state: 'DRAFT', lines, links: [], wontAdd: a.wontAdd, added: addedClaims(w, pid, cv.lines, lines.flatMap((l) => l.after)) };
}
