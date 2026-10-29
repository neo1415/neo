// talent-a seed (T1 Amaka, T2 Chidi). Fictional records only.
// Two entry-level listings so a new graduate has honest matches: one posted this week (proactive "new
// match"), one remote. Chidi's verified sales employment (e_chidi_sales) and his earlier Tinda application
// are in the shared seed.
import type { SeedPatch } from '../../mock/world';

export const seed: SeedPatch = {
  jobs: [
    { id: 'j_ta_grad_data', orgId: 'org_tinda', title: 'Graduate Data Assistant', location: 'Lagos', workMode: 'HYBRID', pay: '₦250k–₦320k / month', posted: '2026-10-27', status: 'OPEN', needs: ['Spreadsheets', 'Survey analysis', 'Clear writing'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within a week' } },
    { id: 'j_ta_grad_ops', orgId: 'org_medlink', title: 'Operations Trainee (graduate programme)', location: 'Remote (Nigeria)', workMode: 'REMOTE', pay: '₦220k–₦280k / month', posted: '2026-10-24', status: 'OPEN', needs: ['Spreadsheets', 'Clear writing', 'Process mapping'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within 5 days' } },
  ],
};
