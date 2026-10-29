// talent-b seed (T3 Tobi, T5 Zara). Fictional records only.
// - Tobi: a code sample shared with Kora, Talentbridge and Medlink (so revoking one viewer is visible), a
//   public talk link, and a confirmed Medlink interview to prepare for (kept off Kora's calendar on purpose).
// - Zara: a verified employer whose listing closes while she applies (Harbour Freight).
import type { Evidence } from '@contracts';
import type { SeedPatch } from '../../mock/world';

const ev = (e: Partial<Evidence> & Pick<Evidence, 'evidenceId' | 'ownerId' | 'kind' | 'title'>): Evidence => ({ source: 'Talent Q', observedAt: '2026-10-01', verified: false, shows: '', limits: '', visibility: 'PRIVATE', sharedWith: [], origin: 'SEED', ...e });

export const seed: SeedPatch = {
  orgs: [
    { id: 'org_harbour', name: 'Harbour Freight Tech', kind: 'EMPLOYER', industry: 'Logistics software', size: '80 people', city: 'Accra', verified: { domain: true, registry: 'VERIFIED' }, delegation: 'APPROVE_EACH_SEND', setup: { done: true, step: 5 }, guidelines: [] },
  ],
  mandates: [
    { id: 'm_medlink_platform', orgId: 'org_medlink', title: 'Senior Platform Engineer (claims payments)', plain: 'Builds the service that pays clinics for insurance claims', team: 'Platform', location: 'Abuja or remote (Nigeria)', workMode: 'HYBRID',
      pay: { min: 2300000, max: 3000000, currency: 'NGN', period: 'month' }, status: 'INTERVIEWING', createdBy: 'org_medlink',
      requirements: [{ reqId: 'mp1', label: 'Payments systems', mustHave: true, plain: 'Has moved money reliably' }, { reqId: 'mp2', label: 'Go in production', mustHave: true, plain: 'Writes and runs Go services' }, { reqId: 'mp3', label: 'Incident leadership', mustHave: false, plain: 'Has led the response to an outage' }],
      versions: [{ v: 1, at: '2026-10-12', by: 'org_medlink', note: 'Approved' }] },
  ],
  jobs: [
    { id: 'j_harbour_backend', orgId: 'org_harbour', title: 'Backend Engineer (Go)', location: 'Accra or remote (Ghana, Nigeria)', workMode: 'REMOTE', pay: 'US$2,800–3,600 / month', posted: '2026-10-19', status: 'OPEN', needs: ['Go in production', 'Postgres at scale', 'Logistics systems'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within 4 days' } },
    { id: 'j_medlink_platform', orgId: 'org_medlink', mandateId: 'm_medlink_platform', title: 'Senior Platform Engineer (claims payments)', location: 'Abuja or remote (Nigeria)', workMode: 'HYBRID', pay: '₦2.3m–₦3.0m / month', posted: '2026-10-12', status: 'OPEN', needs: ['Payments systems', 'Go in production', 'Incident leadership'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within 5 days' } },
  ],
  pipeline: [{ mandateId: 'm_medlink_platform', personId: 'p_tobi', stage: 'INTERVIEW', at: '2026-10-27', by: 'org_medlink', note: 'Technical interview booked' }],
  applications: [
    { id: 'a_tobi_medlink', jobId: 'j_medlink_platform', personId: 'p_tobi', status: 'INTERVIEW', shared: ['e_tobi_recon', 'e_tobi_payout'], lastEmployerActivity: '2026-10-27',
      timeline: [{ at: '2026-10-20', text: 'You applied', by: 'YOU' }, { at: '2026-10-22', text: 'Medlink viewed your application', by: 'EMPLOYER' }, { at: '2026-10-27', text: 'Medlink invited you to a technical interview', by: 'EMPLOYER' }] },
  ],
  calendar: [
    { id: 'c_tobi_medlink', orgId: 'org_medlink', title: 'Interview: Tobi Adeyemi (Senior Platform Engineer)', start: '2026-11-03T14:00:00+01:00', end: '2026-11-03T15:15:00+01:00', attendees: ['p_tobi'], status: 'CONFIRMED', mandateId: 'm_medlink_platform', personId: 'p_tobi', simulated: true },
  ],
  interviews: [{ id: 'i_tobi_medlink', orgId: 'org_medlink', mandateId: 'm_medlink_platform', personId: 'p_tobi', eventId: 'c_tobi_medlink', panel: [], status: 'CONFIRMED', feedback: [] }],
  evidence: [
    ev({ evidenceId: 'e_tobi_payout', ownerId: 'p_tobi', kind: 'WORK_SAMPLE', title: 'Payout retry worker (code sample)', source: 'Private repository snapshot', observedAt: '2026-09-12', verified: true, verification: 'VERIFIED',
      shows: 'Go worker that retries failed payouts safely, with idempotency keys and back-off.', limits: 'Extracted from a larger codebase; tests included, production traffic not shown.', visibility: 'SHARED_WITH', sharedWith: ['org_kora', 'org_tb', 'org_medlink'] }),
    ev({ evidenceId: 'e_tobi_talk', ownerId: 'p_tobi', kind: 'PROJECT', title: 'Talk: “Exactly-once payouts are a lie” (video link)', source: 'Conference video link', observedAt: '2025-11-08', verification: 'VERIFIED', verified: true,
      shows: 'Explains, to 200 engineers, how to make payouts safe to retry.', limits: 'A talk, not code.', visibility: 'PUBLIC_PROFILE', sharedWith: [] }),
  ],
};
