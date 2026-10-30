// Evidence-first contrast cast (Consolidated Build Pack, 30 Oct; 00_START_HERE "the key product example").
// Fictional test data. Tobi (existing T3 cast) has a thin CV and reviewed evidence; Seyi Okoro (new) has a polished
// CV whose claims are not yet supported. Seyi Okoro is a candidate; Seyi Balogun is Kora's engineering manager —
// different people, always shown with surnames (merge ledger CL-03).
import type { Evidence } from '@contracts';
import type { SeedPatch } from '../../mock/world';

const ev = (e: Partial<Evidence> & Pick<Evidence, 'evidenceId' | 'ownerId' | 'kind' | 'title'>): Evidence => ({ source: 'Talent Q', observedAt: '2026-10-01', verified: false, shows: '', limits: '', visibility: 'SHARED_WITH', sharedWith: ['org_kora'], origin: 'SEED', ...e });

export const seed: SeedPatch = {
  people: [{ personId: 'p_seyio', name: 'Seyi Okoro', headline: 'Senior Backend Engineer · Postgres, Go, payments, APIs · 8 yrs', location: 'Lagos', timezone: 'Africa/Lagos', synthetic: true }],
  actors: [{ id: 'p_seyio', name: 'Seyi Okoro', first: 'Seyi', initials: 'SO', side: 'candidate', title: 'Senior backend engineer', timezone: 'Africa/Lagos', personId: 'p_seyio', journey: 'J12', email: 'seyi.okoro@mail.example', signedUp: true }],
  evidence: [
    // Tobi: a reviewed troubleshooting work sample, shared with Kora by Tobi (the pack's "reviewed debugging work sample").
    ev({ evidenceId: 'e_tobi_incident', ownerId: 'p_tobi', kind: 'WORK_SAMPLE', title: 'Debugging sample: slow payouts API traced to Postgres lock contention', source: 'Talent Q work sample, reviewed by Musa Danladi (Kora)', observedAt: '2026-10-21', verified: true, verification: 'VERIFIED', origin: 'REVIEW', shows: 'Found why payout requests slowed to 8 seconds under load: two jobs locked the same rows. Rewrote the update order and added an index; p95 fell to 180ms.', limits: 'A 90-minute sample on a copy of a real incident, with synthetic data. One reviewer.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
    // Seyi Okoro: polished claims, an old credential waiting on its issuer, and a project he describes but hasn't shown.
    ev({ evidenceId: 'e_seyio_cv', ownerId: 'p_seyio', kind: 'CLAIM', title: 'CV: “Postgres performance expert. Led API reliability for 30M users. Payments and Go at scale.”', source: 'CV uploaded by Seyi Okoro', observedAt: '2026-10-24', verification: 'UNVERIFIED', origin: 'UPLOAD', shows: 'What Seyi Okoro says about his work.', limits: 'Claims in his own words. Nothing yet shows the work itself.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
    ev({ evidenceId: 'e_seyio_cert', ownerId: 'p_seyio', kind: 'CREDENTIAL', title: 'PostgreSQL Associate certificate (2019)', source: 'Certificate PDF uploaded by Seyi Okoro', observedAt: '2019-03-11', verification: 'PENDING', origin: 'UPLOAD', shows: 'An entry-level Postgres certificate, if the issuer confirms it.', limits: 'Seven years old, and the issuer hasn’t confirmed it yet.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
    ev({ evidenceId: 'e_seyio_project', ownerId: 'p_seyio', kind: 'PROJECT', title: 'Checkout API reliability programme (described)', source: 'Project description written by Seyi Okoro', observedAt: '2025-11-02', verification: 'UNVERIFIED', origin: 'UPLOAD', shows: 'Seyi Okoro’s account of cutting checkout errors after an outage.', limits: 'His description only: no code, metrics, reference or reviewer.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
  ],
  pipeline: [{ mandateId: 'm_backend', personId: 'p_seyio', stage: 'SOURCED', at: '2026-10-28', by: 'u_ngozi', note: 'Applied via the Kora job page' }],
  applications: [{ id: 'a_seyio_kora', jobId: 'j_kora_backend', personId: 'p_seyio', status: 'SUBMITTED', shared: ['e_seyio_cv', 'e_seyio_cert', 'e_seyio_project'], timeline: [{ at: '2026-10-28', text: 'You applied', by: 'YOU' }] }],
};
