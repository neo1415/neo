// Evidence-first hiring, recruiter side (J12 steps 1–5, 8, 9; build pack 02 UI items A–C). Reads only; every write
// goes through journeys/evidence/ops.ts (ev.*) or hire-c's correspondence. Built on the shared reading in
// journeys/evidence/model.ts and the comparison's cellFor, so permissions, disputes, revocations and corrections
// apply exactly as they do everywhere else. Retrieval filters by permission (canSeeCandidate, visibleEvidence)
// before Q or a card sees anything. No global talent score: people are grouped by how a requirement is known.
import type { Evidence } from '@contracts';
import { canSeeCandidate, visibleEvidence, type World } from '../../../mock/world';
import type { ProofClass } from '../../../state/domain';
import type { Level } from '../../../state/areas/hire-b';
import { proof } from '../../../state/areas/proof';
import { BOUNDED_SAMPLE, PROOF_WORD, proofClass, proofReading, SHAPE_WORD, type ProofReading } from '../model';
import { cellFor, criteriaIn, KORA_ROLE, reqLabel, reqsOf, shortLabel, viewerOrg } from '../../hire-b/model';

// ---------- Names: Seyi Okoro (candidate) is not Seyi Balogun (Kora's engineering manager) ----------
/** A candidate's first name is ambiguous when a colleague in the viewer's organisation (or another candidate) has it. */
export function ambiguousFirst(w: World, pid: string): boolean {
  const name = w.people.find((p) => p.personId === pid)?.name ?? '';
  const first = name.split(' ')[0];
  if (!first) return false;
  return w.actors.some((a) => a.side === 'recruiter' && a.first === first) || w.people.some((p) => p.personId !== pid && p.name.split(' ')[0] === first);
}
/** Words that put a turn in a panel or team context, where a bare colleague's first name means the colleague. */
const PANEL_CTX = /\b(find (a |some |other )?(new )?times?|panel|panels|interviewers?|calendars?|busy|free at|hiring manager|team|viewer|admin|approver|approvers|swap|replace|colleague|make (him|her|me|them)|with \w+ and \w+)\b/;
/** Words that put a turn in a candidate context. */
const CAND_CTX = /\b(cv|resume|sample|evidence|proof|profile|candidate|candidates|compare|interested|interest|shortlist|postgres|claims?|assessment|work sample)\b/;
/** Whether a person the NLU matched should be dropped: matched only by a surname that a person named in full shares,
 *  or matched by a bare first name in a turn that means a colleague.
 *  Typing the surname always means the candidate. Candidate words win over panel words ("compare Tobi with Seyi"). */
export function meansColleague(w: World, norm: string, pid: string, orgId?: string): boolean {
  const p = w.people.find((x) => x.personId === pid); if (!p) return false;
  const [first, ...rest] = p.name.toLowerCase().split(' ');
  // Matched only by a surname someone else named in full shares ("Seyi Okoro" is not Nneka Okoro).
  if (!new RegExp(`\\b${first}\\b`).test(norm) && w.people.some((o) => o.personId !== pid && new RegExp(`\\b${o.name.toLowerCase()}\\b`).test(norm) && rest.some((l) => o.name.toLowerCase().split(' ').slice(1).includes(l)))) return true;
  if (rest.some((l) => new RegExp(`\\b${l}\\b`).test(norm))) return false;
  const colleague = w.actors.some((a) => a.side === 'recruiter' && (!orgId || a.orgId === orgId) && a.first.toLowerCase() === first);
  if (!colleague || !new RegExp(`\\b${first}\\b`).test(norm)) return false;
  return PANEL_CTX.test(norm) && !CAND_CTX.test(norm);
}

// ---------- Proof marks ----------
export const PROOF_ORDER: ProofClass[] = ['ISSUER_VERIFIED', 'ASSESSED', 'SELF_REPORTED', 'CLAIM', 'DISPUTED'];
export const CV_WORD: Record<'YES' | 'VAGUE' | 'NO' | 'NO_CV', string> = { YES: 'Names it', VAGUE: 'Vague about it', NO: 'Doesn’t name it', NO_CV: 'No CV shared' };

/** The CV line that speaks to a requirement (only when the CV reading says it names it, or vaguely). */
export function cvLineFor(w: World, pid: string, reqId: string): string | null {
  const cv = proof(w).cvs[pid]; if (!cv) return null;
  const m = cv.mentions[reqId] ?? 'NO'; if (m === 'NO') return null;
  // Quote the most specific phrase, not the whole headline: split lines into phrases and prefer one that speaks to
  // this requirement only (the longest such), else the longest phrase that mentions it.
  const frags = cv.lines.slice(1).flatMap((l) => l.split(/\s*[·;]\s*|\.\s+/)).map((x) => x.replace(/\.$/, '').trim()).filter(Boolean);
  const hits = frags.filter((x) => criteriaIn(x.toLowerCase()).includes(reqId));
  const only = hits.filter((x) => criteriaIn(x.toLowerCase()).length === 1 && x.length >= 10).sort((a, b) => b.length - a.length)[0];
  return only ?? hits.sort((a, b) => b.length - a.length)[0] ?? null;
}

export interface ProofItem { e: Evidence; cls: ProofClass; note: string; level: Level; reqId: string; excluded?: string }
/** What a person shared that speaks to a requirement, with how each item is known. Excluded items are kept (with
 *  the reason) so a card can say a disputed result is left out; they never raise the level. */
export function proofItems(w: World, pid: string, reqId: string): ProofItem[] {
  return cellFor(w, pid, reqId).items.map((i) => ({ e: i.e, cls: proofClass(w, i.e), note: i.note, level: i.level, reqId, excluded: i.excluded }));
}

// ---------- Step 1: the find ----------
export type FindGroup = 'REVIEWED' | 'SHOWN' | 'PARTIAL' | 'CLAIMED' | 'NONE';
export const GROUP_WORD: Record<FindGroup, string> = {
  REVIEWED: 'Shown in reviewed or checked work',
  SHOWN: 'Shown, not yet reviewed',
  PARTIAL: 'Partly shown',
  CLAIMED: 'Claimed, not yet shown',
  NONE: 'Nothing shared for this yet',
};
export const GROUP_NOTE: Record<FindGroup, string> = {
  REVIEWED: 'A reviewer or issuer has looked at the work. It shows the task, not guaranteed performance.',
  SHOWN: 'Work they shared that nobody has checked yet.',
  PARTIAL: 'Something relevant, but thin, old, or waiting on a check.',
  CLAIMED: 'Said, not shown. That’s unknown, not weak.',
  NONE: 'Unknown, not a no. Worth asking.',
};
const GROUP_OF: Record<Level, FindGroup> = { verified: 'REVIEWED', evidenced: 'SHOWN', partial: 'PARTIAL', claim: 'CLAIMED', none: 'NONE' };
const RANK: Record<Level, number> = { verified: 4, evidenced: 3, partial: 2, claim: 1, none: 0 };

export interface FindQuery { r: string[]; mode?: 'surprise' }
export interface FindRow { pid: string; group: FindGroup; best: Level; reading: ProofReading; items: ProofItem[]; cv: { reqId: string; says: 'YES' | 'VAGUE' | 'NO' | 'NO_CV'; line: string | null }[] }
export interface FindResult { reqs: string[]; rows: FindRow[]; hidden: number; read: number; checked: number; groups: { g: FindGroup; rows: FindRow[] }[] }

/** People in the role's pipeline the viewer's organisation may see. Anyone else is counted, never named. */
export function permittedPool(w: World): { pids: string[]; hidden: number } {
  const org = viewerOrg(w);
  const all = w.pipeline.filter((p) => p.mandateId === KORA_ROLE && !['REJECTED', 'WITHDRAWN'].includes(p.stage)).map((p) => p.personId).filter((id, i, a) => a.indexOf(id) === i);
  const pids = all.filter((pid) => canSeeCandidate(w, pid, org));
  return { pids, hidden: all.length - pids.length };
}

/** Which requirements a find is about, from the words used. Performance and incidents read as Postgres and on-call. */
export function findReqs(norm: string): string[] {
  const out = new Set(criteriaIn(norm));
  if (/\b(performance|slow|latency|troubleshoot\w*|debug\w*|lock\w*|index\w*)\b/.test(norm) && /\b(postgres\w*|database|db|sql|quer\w*|performance|slow|latency)\b/.test(norm)) out.add('r3');
  if (/\bincidents?\b/.test(norm)) out.add('r4');
  return [...out].sort();
}

/** The find, computed from state every time (the card re-renders from this, so revocation updates it). */
export function runFind(w: World, q: FindQuery): FindResult {
  const reqs = q.r.length ? q.r : reqsOf(w).map((r) => r.reqId);
  const { pids, hidden } = permittedPool(w);
  const org = viewerOrg(w);
  let checked = 0;
  const rows: FindRow[] = pids.map((pid) => {
    checked += visibleEvidence(w, pid, org).length;
    const items = reqs.flatMap((r) => proofItems(w, pid, r));
    const best = reqs.map((r) => cellFor(w, pid, r).level).sort((a, b) => RANK[b] - RANK[a])[0] ?? 'none';
    const reading = proofReading(w, pid);
    const cv = reqs.map((r) => ({ reqId: r, says: reading.rows.find((x) => x.reqId === r)?.cv ?? 'NO_CV', line: cvLineFor(w, pid, r) }));
    return { pid, group: GROUP_OF[best], best, reading, items, cv };
  });
  // Within a group: people whose evidence goes beyond their CV first (the "surprising fit"), then the rest by name.
  const surprise = (r: FindRow) => (r.cv.some((c) => c.says !== 'YES') && RANK[r.best] >= 3 ? 1 : 0);
  rows.sort((a, b) => RANK[b.best] - RANK[a.best] || surprise(b) - surprise(a) || a.pid.localeCompare(b.pid));
  const order: FindGroup[] = ['REVIEWED', 'SHOWN', 'PARTIAL', 'CLAIMED', 'NONE'];
  const groups = order.map((g) => ({ g, rows: rows.filter((r) => r.group === g) })).filter((x) => x.rows.length);
  return { reqs, rows, hidden, read: pids.length, checked, groups };
}

/** Plain-words labels for a set of requirements ("Postgres and on-call"). */
export const reqWords = (w: World, reqs: string[]) => { const xs = reqs.map((r) => shortLabel(w, r)); return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`; };

// ---------- Per person: headline, open items, next step ----------
export const shapeWord = (w: World, pid: string) => SHAPE_WORD[proofReading(w, pid).shape];

/** The reuse decisions for a person in the viewer's organisation (newest first). */
export const decisionsFor = (w: World, pid: string) => proof(w).reuse.filter((d) => d.personId === pid && d.orgId === viewerOrg(w)).slice().reverse();
export const interestFor = (w: World, pid: string) => proof(w).interest.find((i) => i.personId === pid && i.orgId === viewerOrg(w) && i.mandateId === KORA_ROLE);
export const INTEREST_WORD = { NONE: 'Not asked yet', REQUESTED: 'Asked, waiting for an answer', CONFIRMED: 'Interested', DECLINED: 'Said no, thanks' } as const;

export interface NextStep { text: string; say?: string }
/** The smallest useful next step for one person: reuse what exists, one bounded sample, or a question. */
export function nextStepFor(w: World, pid: string, name: string): NextStep {
  const ds = decisionsFor(w, pid);
  const live = ds.find((d) => d.decision === 'BOUNDED_SAMPLE' && !['REVIEWED', 'DECLINED'].includes(d.state));
  if (live) {
    const what = `${shortLabel(w, live.reqId)} sample (${live.effortMinutes ?? BOUNDED_SAMPLE[live.reqId]?.minutes ?? 40} min)`;
    if (live.state === 'SUBMITTED') return { text: `Review the ${what}. It counts once a person has looked at it.`, say: `review ${name.toLowerCase()}'s sample` };
    if (live.state === 'PROPOSED') return { text: `The ${what} request is drafted, not sent. Approve it in Messages or tell Q “send it”.` };
    return { text: `Waiting for the ${what}. Nothing to do yet.` };
  }
  const r = proofReading(w, pid);
  // The claim one bounded piece of work would settle soonest: a must-have with some (partial) support first.
  const must = (x: string) => !!reqsOf(w).find((q) => q.reqId === x)?.mustHave && !!BOUNDED_SAMPLE[x];
  const firstClaim = r.claimedOnly.find((x) => must(x) && r.rows.find((y) => y.reqId === x)?.level === 'partial') ?? r.claimedOnly.find(must) ?? r.claimedOnly[0];
  if (r.shape === 'CLAIMS_AHEAD_OF_PROOF' && firstClaim && BOUNDED_SAMPLE[firstClaim]) return { text: `Ask for one ${BOUNDED_SAMPLE[firstClaim].minutes}-minute ${shortLabel(w, firstClaim)} sample instead of the full assessment.`, say: `ask ${name.toLowerCase()} for one short ${shortLabel(w, firstClaim).toLowerCase()} sample instead of the full assessment` };
  const accepted = new Set(ds.filter((d) => d.decision === 'ACCEPT_PRIOR').map((d) => d.reqId));
  const reuse = r.rows.find((x) => (x.level === 'verified') && x.must && !accepted.has(x.reqId) && x.cv !== 'YES');
  const open = r.open[0] ?? r.rows.find((x) => x.level === 'partial' || x.level === 'none' || x.level === 'claim')?.reqId;
  if (reuse) return { text: `Accept the reviewed ${shortLabel(w, reuse.reqId)} evidence (no retest)${open ? `, then talk through ${shortLabel(w, open).toLowerCase()} in the interview` : ''}.`, say: `accept ${name.toLowerCase()}'s ${shortLabel(w, reuse.reqId).toLowerCase()} evidence, no retest` };
  if (open) return { text: `Ask about ${reqLabel(w, open).toLowerCase()} in the interview: nothing shared shows it yet.` };
  return { text: 'Enough is shown to talk. Plan the interview.' };
}

export const proofWord = (c: ProofClass) => PROOF_WORD[c];
