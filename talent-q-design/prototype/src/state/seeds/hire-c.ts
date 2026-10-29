// R3 seed records: Seyi's unapproved draft to Zara (it names no pay band and clashes with his own calendar),
// Ngozi's unanswered SMS invitation to Grace, and next week's busy blocks for the Kora panel (Musa is in London).
import type { SeedPatch } from '../../mock/world';
import { SEYI_ZARA_BODY } from '../areas/hire-c';

export const seed: SeedPatch = {
  threads: [
    { id: 't_hc_zara', orgId: 'org_kora', personId: 'p_zara', mandateId: 'm_backend', messages: [
      { id: 'hc_zara_inv', from: 'u_seyi', to: 'p_zara', subject: 'Interview: Senior Backend Engineer at Kora Pay', body: SEYI_ZARA_BODY, at: '2026-10-27T16:20:00+01:00', status: 'DRAFT', channel: 'EMAIL', senderId: 'mb_kora_careers' },
    ] },
    { id: 't_hc_grace', orgId: 'org_kora', personId: 'p_grace', mandateId: 'm_support', messages: [
      { id: 'hc_grace_mail', from: 'u_ngozi', to: 'p_grace', subject: 'Customer Support Lead: your application', body: 'Hello Grace,\n\nThank you for applying for the Customer Support Lead role at Kora Pay. I’ll text you shortly with an interview time; email works too if you prefer.\n\nNgozi Eze\nHR lead, Kora Pay', at: '2026-10-24T15:10:00+01:00', status: 'SENT_SIMULATED', approvedBy: 'u_ngozi', receipt: 'sim_rcpt_grace_0', channel: 'EMAIL', senderId: 'mb_ngozi', delivery: 'ACCEPTED', acceptedAt: '2026-10-24T15:10:00+01:00', providerId: 'sim-ms-7f2a91', idempotencyKey: 'idem_grace_0_3f9a21', approvedHash: 'h_seed0001', attempts: [{ at: '2026-10-24T15:10:00+01:00', result: 'ACCEPTED' }] },
      { id: 'hc_grace_inv', from: 'u_ngozi', to: 'p_grace', subject: 'Interview on Friday: Customer Support Lead', body: 'Hello Grace, this is Ngozi from Kora Pay. We would like to meet you for the Customer Support Lead role on Friday 30 October at 11:00 (Lagos time), by video, for 45 minutes. The pay band is ₦650k–₦900k a month. Please reply YES to confirm or suggest another time. Ngozi, Kora Pay', at: '2026-10-26T10:05:00+01:00', status: 'SENT_SIMULATED', approvedBy: 'u_ngozi', receipt: 'sim_rcpt_grace_1', channel: 'SMS' },
    ] },
    // Candidate-initiated contact (audit addendum §C): Tobi asked Medlink a question after applying, 9 days ago. Medlink's
    // reply window is 7 days, so the thread reads "no reply yet", never as a rejection.
    { id: 't_tobi_medlink_q', orgId: 'org_medlink', personId: 'p_tobi', mandateId: 'm_medlink_platform', initiatedBy: 'CANDIDATE', state: 'TIMEOUT', channel: { current: 'IN_APP', reason: 'Medlink takes candidate questions in Talent Q only' }, messages: [
      { id: 'cq_tobi_medlink', from: 'p_tobi', to: 'org_medlink', subject: 'Question: Senior Platform Engineer', body: 'Hello, I’ve applied for the Senior Platform Engineer role. Is the platform team on a shared on-call rota with product teams, or separate? Thank you, Tobi', at: '2026-10-20T11:30:00+01:00', status: 'RECEIVED', channel: 'IN_APP', delivery: 'ACCEPTED', acceptedAt: '2026-10-20T11:30:00+01:00' },
    ] },
  ],
  calendar: [
    { id: 'hc_c1', orgId: 'org_kora', title: 'Busy', start: '2026-11-02T08:00:00.000Z', end: '2026-11-02T10:00:00.000Z', attendees: ['u_seyi'], status: 'CONFIRMED', simulated: true },
    { id: 'hc_c2', orgId: 'org_kora', title: 'Busy', start: '2026-11-06T12:30:00.000Z', end: '2026-11-06T14:00:00.000Z', attendees: ['u_musa'], status: 'CONFIRMED', simulated: true },
    { id: 'hc_c3', orgId: 'org_kora', title: 'Busy', start: '2026-11-05T09:00:00.000Z', end: '2026-11-05T11:00:00.000Z', attendees: ['u_bayo'], status: 'CONFIRMED', simulated: true },
    { id: 'hc_c4', orgId: 'org_kora', title: 'Busy', start: '2026-11-05T13:00:00.000Z', end: '2026-11-05T14:00:00.000Z', attendees: ['u_seyi'], status: 'CONFIRMED', simulated: true },
  ],
};
