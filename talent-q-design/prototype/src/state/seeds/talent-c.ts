// Seed for T4 (Grace). The cast, her certificate (e_grace_cert, pending), the calendar invite (c4) and the
// interview (i_grace) are in the shared seed; this adds the invitation she received by text message.
import type { SeedPatch } from '../../mock/world';

export const seed: SeedPatch = {
  threads: [
    { id: 't_grace_kora', orgId: 'org_kora', personId: 'p_grace', mandateId: 'm_support', messages: [
      { id: 'm_grace_1', from: 'u_ngozi', to: 'p_grace', subject: 'Interview: Customer Support Lead', body: 'Hello Grace, thank you for your interest. Your interview is on Friday 30 October at 11:00. You can answer by typing or speaking, on your phone, at your own pace. Reply here if you need a different time. Ngozi, Kora Pay', at: '2026-10-27T15:20:00+01:00', status: 'SENT_SIMULATED', channel: 'SMS' },
    ] },
  ],
};
