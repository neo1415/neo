// Evidence-first hiring slice (Consolidated Build Pack, 30 Oct). CVs as documents (separate from evidence), employer
// decisions about reusing evidence, hiring-intent confirmations, process commitments and candidates' own preferences.
// Simulated data. The logic that reads it lives in journeys/evidence/model.ts.
import type { World } from '../../mock/world';
import type { CandidateMutualPreferences, CvDoc, EvidenceReuseDecision, HiringIntentConfirmation, ProcessCommitment } from '../domain';

/** EvidenceClaimLink (pack §02.3): evidence → requirement, versioned, with its own review state. Static links for
 *  seeded evidence live in hire-b's EV_REQ; links for evidence created in the prototype (a reviewed sample) live here. */
export interface EvidenceLink { evidenceId: string; reqId: string; note: string; partial?: boolean; v: number; state: 'PROPOSED' | 'REVIEWED' | 'DISPUTED' }
/** Candidate interest in a role: a pending check, shown apart from suitability; never scored. */
export interface InterestCheck { orgId: string; personId: string; mandateId: string; state: 'REQUESTED' | 'CONFIRMED' | 'DECLINED'; at: string; by: string; note?: string }
export interface ProofState { interest: InterestCheck[]; links: EvidenceLink[]; cvs: Record<string, CvDoc>; reuse: EvidenceReuseDecision[]; intents: HiringIntentConfirmation[]; commitments: ProcessCommitment[]; prefs: Record<string, CandidateMutualPreferences> }

export const area = {
  id: 'proof',
  init: (): ProofState => ({
    links: [],
    interest: [],
    cvs: {
      p_tobi: { personId: 'p_tobi', uploadedAt: '2026-10-20', polish: 'THIN', mentions: { r1: 'VAGUE', r2: 'YES', r3: 'NO', r4: 'NO', r5: 'NO' }, lines: [
        'Tobi A.',
        'Software developer, Lagos',
        'Lumen (2019 – 2026): worked on backend stuff for the payments team. Did the reconciliation job and fixed things when they broke.',
        'Skills: Go, SQL, Linux, some Docker',
        'Education: BSc Computer Science, UNILAG',
      ] },
      p_seyio: { personId: 'p_seyio', uploadedAt: '2026-10-24', polish: 'POLISHED', mentions: { r1: 'YES', r2: 'YES', r3: 'YES', r4: 'YES', r5: 'YES' }, lines: [
        'SEYI OKORO — Senior Backend Engineer',
        'Postgres performance expert · API reliability · Payments · Go at scale',
        'Led API reliability for a platform serving 30M users, cutting incident volume by 60%.',
        'Designed high-throughput payment services in Go; owned Postgres performance tuning end to end.',
        'Led on-call rotations and incident reviews; mentored 6 engineers.',
        'Certified PostgreSQL Associate.',
      ] },
    },
    reuse: [],
    intents: [
      { jobId: 'j_kora_backend', orgId: 'org_kora', state: 'ACTIVE', owner: 'u_ada', confirmedAt: '2026-10-27', freshUntil: '2026-11-10', replyWithinDays: 5 },
      { jobId: 'j_kora_data', orgId: 'org_kora', state: 'ACTIVE', owner: 'u_ngozi', confirmedAt: '2026-10-22', freshUntil: '2026-11-05', replyWithinDays: 7 },
    ],
    commitments: [
      { id: 'pc_seyio', orgId: 'org_kora', personId: 'p_seyio', applicationId: 'a_seyio_kora', mandateId: 'm_backend', milestone: 'First review of your application', nextUpdateDue: '2026-11-02', owner: 'u_ada', state: 'OPEN' },
      { id: 'pc_zara', orgId: 'org_kora', personId: 'p_zara', applicationId: 'a_zara_kora', mandateId: 'm_backend', milestone: 'Decision on an interview', nextUpdateDue: '2026-10-28', owner: 'u_ngozi', state: 'OVERDUE' },
    ],
    prefs: {
      p_tobi: { personId: 'p_tobi', payMin: 2500000, currency: 'NGN', workModes: ['HYBRID', 'ONSITE'], locations: ['Lagos'], availableFrom: '2026-12-01', updatedAt: '2026-10-20', shareWith: ['org_kora'] },
      p_seyio: { personId: 'p_seyio', workModes: ['REMOTE', 'HYBRID'], updatedAt: '2026-10-24', shareWith: ['org_kora'] },
    },
  }),
};
export const proof = (w: World) => w.areas.proof as ProofState;
