// Seed for TALENT-D. Amaka's own project write-up as a Passport item (self-reported), shared with Medlink Health
// at version 1, which still carries a figure she later corrected (her revision history shows it). Fictional.
import type { Evidence } from '@contracts';
import type { SeedPatch } from '../../mock/world';

const ev = (e: Partial<Evidence> & Pick<Evidence, 'evidenceId' | 'ownerId' | 'kind' | 'title'>): Evidence => ({ source: 'Talent Q', observedAt: '2026-10-01', verified: false, shows: '', limits: '', visibility: 'PRIVATE', sharedWith: [], origin: 'SEED', ...e });

export const seed: SeedPatch = {
  evidence: [
    ev({ evidenceId: 'e_amaka_prices', ownerId: 'p_amaka', kind: 'WORK_SAMPLE', title: 'Mile 12 food prices project', source: 'Uploaded by Amaka Eze', observedAt: '2026-10-12', verification: 'UNVERIFIED',
      shows: 'Weekly prices from 12 traders at Mile 12 market, January to June 2025, with her own summary.', limits: 'Her own project; not reviewed by anyone yet.', visibility: 'SHARED_WITH', sharedWith: ['org_medlink'] }),
  ],
};
