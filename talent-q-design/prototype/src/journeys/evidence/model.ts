// Evidence-first reading (Consolidated Build Pack, 30 Oct). Shared by recruiter and candidate views so both sides use
// the same words. Rules from the pack, kept in code:
//   unverified claim ≠ incompetence · demonstrated sample ≠ guaranteed performance · Q's analysis ≠ the decision.
//   Missing CV keywords never reject. A polished CV is never treated as verified competence. Unknown is not zero.
import type { Evidence } from '@contracts';
import type { World } from '../../mock/world';
import type { ProofClass } from '../../state/domain';
import { cellFor, disputedEvidence, reqsOf } from '../hire-b/model';
import type { Level } from '../../state/areas/hire-b';
import { proof } from '../../state/areas/proof';

/** How an item is known, from its kind and its verification, never from how well it is written. */
export function proofClass(w: World, e: Evidence): ProofClass {
  if (disputedEvidence(w).has(e.evidenceId) || e.verification === 'UNDER_REVIEW') return 'DISPUTED';
  if (e.kind === 'CLAIM') return 'CLAIM';
  if (e.verification === 'VERIFIED') return e.kind === 'CREDENTIAL' || e.kind === 'EMPLOYMENT' || e.kind === 'REFERENCE' ? 'ISSUER_VERIFIED' : 'ASSESSED';
  return 'SELF_REPORTED';
}
export const PROOF_WORD: Record<ProofClass, string> = { CLAIM: 'Claim', SELF_REPORTED: 'Self-reported', ASSESSED: 'Assessed', ISSUER_VERIFIED: 'Issuer-verified', DISPUTED: 'Disputed' };
export const PROOF_MEANS: Record<ProofClass, string> = {
  CLAIM: 'Said by the candidate (CV or conversation). Not evidence of the work, and not a sign it isn’t true.',
  SELF_REPORTED: 'Supplied by the candidate, not yet checked or reviewed by anyone else.',
  ASSESSED: 'Work a reviewer looked at, or an assessment with a recorded result. Shows the task, not guaranteed performance in the job.',
  ISSUER_VERIFIED: 'Confirmed by whoever issued it (a registry, an employer, a referee).',
  DISPUTED: 'Under review after a challenge. Left out of comparisons until it’s resolved.',
};

/** Supported = a requirement with checked or evidenced work behind it (not claims, not partial). */
const supported = (l: Level) => l === 'verified' || l === 'evidenced';

export type ProofShape = 'SHOWS_MORE_THAN_CV' | 'CLAIMS_AHEAD_OF_PROOF' | 'CV_AND_PROOF_AGREE' | 'LITTLE_EITHER_WAY' | 'NO_CV';
export const SHAPE_WORD: Record<ProofShape, string> = {
  SHOWS_MORE_THAN_CV: 'Shows more than the CV says',
  CLAIMS_AHEAD_OF_PROOF: 'Strong claims, limited supporting evidence',
  CV_AND_PROOF_AGREE: 'CV and evidence agree',
  LITTLE_EITHER_WAY: 'Little shown yet, either way',
  NO_CV: 'No CV shared; evidence only',
};

export interface ProofReading { pid: string; shape: ProofShape; rows: { reqId: string; label: string; must: boolean; cv: 'YES' | 'VAGUE' | 'NO' | 'NO_CV'; level: Level }[]; cvNames: number; supportedN: number; claimedOnly: string[]; beyondCv: string[]; open: string[] }

/** Reads one candidate's CV against their visible evidence for the Senior Backend role, requirement by requirement.
 *  Uses the comparison's own cell logic, so permissions, disputes and revocations apply identically. */
export function proofReading(w: World, pid: string): ProofReading {
  const cv = proof(w).cvs[pid];
  const rows = reqsOf(w).map((r) => ({ reqId: r.reqId, label: r.label, must: r.mustHave, cv: cv ? cv.mentions[r.reqId] ?? 'NO' : 'NO_CV' as const, level: cellFor(w, pid, r.reqId).level }));
  const cvNames = rows.filter((x) => x.cv === 'YES').length;
  const supportedN = rows.filter((x) => supported(x.level)).length;
  const claimedOnly = rows.filter((x) => x.cv === 'YES' && !supported(x.level)).map((x) => x.reqId);
  const beyondCv = rows.filter((x) => x.cv !== 'YES' && supported(x.level)).map((x) => x.reqId);
  const open = rows.filter((x) => x.must && !supported(x.level)).map((x) => x.reqId);
  const shape: ProofShape = !cv ? 'NO_CV' : beyondCv.length >= 2 && beyondCv.length > claimedOnly.length ? 'SHOWS_MORE_THAN_CV'
    : claimedOnly.length >= 2 && claimedOnly.length > beyondCv.length ? 'CLAIMS_AHEAD_OF_PROOF'
    : supportedN >= 2 ? 'CV_AND_PROOF_AGREE' : 'LITTLE_EITHER_WAY';
  return { pid, shape, rows, cvNames, supportedN, claimedOnly, beyondCv, open };
}

/** The smallest useful next step per requirement still open: reuse what exists, verify it, or one bounded sample.
 *  Never a full repeat assessment when prior evidence already covers part of it (pack Work A.3). */
export const BOUNDED_SAMPLE: Record<string, { task: string; minutes: number }> = {
  r1: { task: 'A 30-minute walk-through of how money moved in a system you built, with a reviewer', minutes: 30 },
  r2: { task: 'A short Go change to a small service, reviewed', minutes: 45 },
  r3: { task: 'Find and fix one slow query on a copy of a real table', minutes: 40 },
  r4: { task: 'Talk a reviewer through one incident you handled, using your notes', minutes: 30 },
  r5: { task: 'Describe how you helped one person grow, with a reference if you have one', minutes: 20 },
};
