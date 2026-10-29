// Seed records for R2 (Ada). Owned by hire-b. All people, organisations and records are fictional.
import type { Evidence } from '@contracts';
import type { SeedPatch } from '../../mock/world';

const ev = (e: Partial<Evidence> & Pick<Evidence, 'evidenceId' | 'ownerId' | 'kind' | 'title'>): Evidence => ({ source: 'Talent Q', observedAt: '2026-10-01', verified: false, shows: '', limits: '', visibility: 'SHARED_WITH', sharedWith: ['org_kora'], origin: 'SEED', ...e });

export const seed: SeedPatch = {
  evidence: [
    // Kunle: an impressive CV with weak evidence behind it.
    ev({ evidenceId: 'e_hb_kunle_cv', ownerId: 'p_kunle', kind: 'CLAIM', title: 'CV: “Led payments engineering at three fintechs. Go expert. Scaled to 10 million users.”', source: 'CV uploaded by Kunle', observedAt: '2026-10-02', verification: 'UNVERIFIED', origin: 'UPLOAD', shows: 'What Kunle says about himself.', limits: 'Claims only: no project, reference or code backs these lines yet.', visibility: 'PUBLIC_PROFILE', sharedWith: [] }),
    ev({ evidenceId: 'e_hb_kunle_assess', ownerId: 'p_kunle', kind: 'ASSESSMENT', title: 'Go take-home: payout retry service', source: 'Kora take-home, reviewed by Musa Danladi', observedAt: '2026-10-23', verified: true, verification: 'VERIFIED', origin: 'REVIEW', shows: 'A working service, but retries were not idempotent, so one payout could be sent twice.', limits: 'A 4-hour exercise marked by one reviewer.' }),
    // Tobi: a confidential project shared only as an attestation, and a portfolio page.
    ev({ evidenceId: 'e_hb_tobi_attest', ownerId: 'p_tobi', kind: 'REFERENCE', title: 'Reference attestation for a confidential project', source: 'Former manager at Lumen (attestation requested)', observedAt: '2026-10-12', verification: 'PENDING', origin: 'UPLOAD', confidential: true, redactedOf: 'e_tobi_conf', shows: 'Confidential.', limits: 'Confidential.' }),
    ev({ evidenceId: 'e_hb_tobi_site', ownerId: 'p_tobi', kind: 'PROJECT', title: 'Settlement status page (portfolio snapshot)', source: 'Portfolio site snapshot, tobi-builds.example', observedAt: '2026-09-18', verification: 'UNVERIFIED', origin: 'UPLOAD', shows: 'A status page merchants use to see when their settlement will land.', limits: 'A static snapshot; Q can’t see how it was built or run.' }),
  ],
  interviews: [
    { id: 'i_hb_ife', orgId: 'org_kora', mandateId: 'm_backend', personId: 'p_ife', eventId: 'c_hb_ife', panel: ['u_ada', 'u_musa'], status: 'CONFIRMED', feedback: [] },
    { id: 'i_hb_tobi', orgId: 'org_kora', mandateId: 'm_backend', personId: 'p_tobi', panel: ['u_ada', 'u_musa'], status: 'PLANNING', feedback: [] },
    { id: 'i_hb_kunle', orgId: 'org_kora', mandateId: 'm_backend', personId: 'p_kunle', panel: ['u_musa', 'u_seyi'], status: 'DONE',
      feedback: [{ by: 'u_musa', rating: 'CONCERNS', notes: 'The take-home works, but retries can pay out twice. He explained Go well in conversation; I couldn’t see payments depth.', at: '2026-10-24T16:00:00+01:00', evidenceRefs: ['e_hb_kunle_assess'] }] },
  ],
  calendar: [
    { id: 'c_hb_ife', orgId: 'org_kora', title: 'Interview: Ifeoma Obi (Senior Backend)', start: '2026-10-29T14:00:00+01:00', end: '2026-10-29T15:00:00+01:00', attendees: ['u_ada', 'u_musa', 'p_ife'], status: 'CONFIRMED', mandateId: 'm_backend', personId: 'p_ife', simulated: true },
  ],
};
