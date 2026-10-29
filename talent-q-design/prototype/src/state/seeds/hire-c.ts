// R3 seed records: Seyi's unapproved draft to Zara (it names no pay band and clashes with his own calendar),
// Ngozi's unanswered SMS invitation to Grace, and next week's busy blocks for the Kora panel (Musa is in London).
import type { SeedPatch } from '../../mock/world';
import { SEYI_ZARA_BODY } from '../areas/hire-c';

export const seed: SeedPatch = {
  threads: [
    { id: 't_hc_zara', orgId: 'org_kora', personId: 'p_zara', mandateId: 'm_backend', messages: [
      { id: 'hc_zara_inv', from: 'u_seyi', to: 'p_zara', subject: 'Interview: Senior Backend Engineer at Kora Pay', body: SEYI_ZARA_BODY, at: '2026-10-27T16:20:00+01:00', status: 'DRAFT', channel: 'EMAIL' },
    ] },
    { id: 't_hc_grace', orgId: 'org_kora', personId: 'p_grace', mandateId: 'm_support', messages: [
      { id: 'hc_grace_inv', from: 'u_ngozi', to: 'p_grace', subject: 'Interview on Friday: Customer Support Lead', body: 'Hello Grace, this is Ngozi from Kora Pay. We would like to meet you for the Customer Support Lead role on Friday 30 October at 11:00 (Lagos time), by video, for 45 minutes. The pay band is ₦650k–₦900k a month. Please reply YES to confirm or suggest another time. Ngozi, Kora Pay', at: '2026-10-26T10:05:00+01:00', status: 'SENT_SIMULATED', approvedBy: 'u_ngozi', receipt: 'sim_rcpt_grace_1', channel: 'SMS' },
    ] },
  ],
  calendar: [
    { id: 'hc_c1', orgId: 'org_kora', title: 'Busy', start: '2026-11-02T08:00:00.000Z', end: '2026-11-02T10:00:00.000Z', attendees: ['u_seyi'], status: 'CONFIRMED', simulated: true },
    { id: 'hc_c2', orgId: 'org_kora', title: 'Busy', start: '2026-11-06T12:30:00.000Z', end: '2026-11-06T14:00:00.000Z', attendees: ['u_musa'], status: 'CONFIRMED', simulated: true },
    { id: 'hc_c3', orgId: 'org_kora', title: 'Busy', start: '2026-11-05T09:00:00.000Z', end: '2026-11-05T11:00:00.000Z', attendees: ['u_bayo'], status: 'CONFIRMED', simulated: true },
    { id: 'hc_c4', orgId: 'org_kora', title: 'Busy', start: '2026-11-05T13:00:00.000Z', end: '2026-11-05T14:00:00.000Z', attendees: ['u_seyi'], status: 'CONFIRMED', simulated: true },
  ],
};
