// Seed records for R4 (Talentbridge agency, clients Kora Pay and Medlink Health). All fictional.
// Tunde (VIEWER) already exists in the base seed; this adds candidates, two client mandates with
// conflicting work modes for similar backend roles, and their pipelines.
import type { SeedPatch } from '../../mock/world';
import type { MandateX, PipelineEntry } from '../domain';

const P = (personId: string, name: string, headline: string, location: string) => ({ personId, name, headline, location, timezone: 'Africa/Lagos', synthetic: true as const });
const req = (reqId: string, label: string, mustHave: boolean, plain: string) => ({ reqId, label, mustHave, plain });

const mandates: MandateX[] = [
  { id: 'm_tb_kora_pay', orgId: 'org_tb', clientOrgId: 'org_kora', title: 'Payments Platform Engineer', plain: 'Builds the services that move merchants’ money for Kora Pay', team: 'Payments platform', location: 'Lagos (on-site, 4 days)', workMode: 'ONSITE',
    pay: { min: 2000000, max: 2600000, currency: 'NGN', period: 'month' }, status: 'SOURCING', createdBy: 'u_dele',
    requirements: [req('kp1', 'Go in production', true, 'Writes and runs Go services'), req('kp2', 'Payments systems', true, 'Has worked on money movement'), req('kp3', 'On-site in Lagos', true, 'Works from the Lagos office four days a week')],
    versions: [{ v: 1, at: '2026-10-21', by: 'u_dele', note: 'From the signed Kora brief' }] },
  { id: 'm_tb_med_api', orgId: 'org_tb', clientOrgId: 'org_medlink', title: 'Backend Engineer, Claims API', plain: 'Builds the API clinics use to file insurance claims', team: 'Claims', location: 'Remote only (Nigeria)', workMode: 'REMOTE',
    pay: { min: 1500000, max: 2000000, currency: 'NGN', period: 'month' }, status: 'SOURCING', createdBy: 'u_dele',
    requirements: [req('ma1', 'API design', true, 'Designs APIs other teams rely on'), req('ma2', 'Health data handling', false, 'Has handled patient or claims data carefully'), req('ma3', 'Remote, written-first work', true, 'Works remotely and writes things down')],
    versions: [{ v: 1, at: '2026-10-24', by: 'u_dele', note: 'From the Medlink brief (awaiting signature)' }] },
];

const pe = (mandateId: string, personId: string, stage: PipelineEntry['stage'], at: string, by = 'u_dele'): PipelineEntry => ({ mandateId, personId, stage, at, by });

export const seed: SeedPatch = {
  people: [
    P('p_tb_femi', 'Femi Ogun', 'Backend engineer, card payments · 6 yrs', 'Lagos'),
    P('p_tb_halima', 'Halima Musa', 'Go engineer, payouts and ledgers · 7 yrs', 'Lagos'),
    P('p_tb_yemi', 'Yemi Adeola', 'Software engineer, wallets · 4 yrs', 'Ibadan'),
    P('p_tb_kemi', 'Kemi Bassey', 'Backend engineer, remittances · 5 yrs', 'Lagos'),
    P('p_tb_segun', 'Segun Ilori', 'Platform engineer, lending · 6 yrs', 'Lagos'),
    P('p_tb_nneka', 'Nneka Okoro', 'API engineer, health insurance · 5 yrs', 'Enugu'),
    P('p_tb_obinna', 'Obinna Udeh', 'Backend engineer, logistics APIs · 4 yrs', 'Owerri'),
    P('p_tb_ruth', 'Ruth Akpan', 'Operations analyst, clinics · 3 yrs', 'Uyo'),
    P('p_tb_bisi', 'Bisi Coker', 'Process analyst, hospital admin · 4 yrs', 'Abeokuta'),
  ],
  mandates,
  pipeline: [
    pe('m_tb_kora_pay', 'p_tb_femi', 'SHORTLISTED', '2026-10-26'), pe('m_tb_kora_pay', 'p_tb_halima', 'SHORTLISTED', '2026-10-26'), pe('m_tb_kora_pay', 'p_tb_yemi', 'SOURCED', '2026-10-26', 'u_tunde'), pe('m_tb_kora_pay', 'p_dayo', 'SOURCED', '2026-10-26'),
    pe('m_tb_med_api', 'p_tb_femi', 'SHORTLISTED', '2026-10-28'), pe('m_tb_med_api', 'p_tb_nneka', 'SOURCED', '2026-10-28', 'u_tunde'), pe('m_tb_med_api', 'p_tb_obinna', 'SOURCED', '2026-10-28', 'u_tunde'),
    pe('m_ops', 'p_tb_ruth', 'CONTACTED', '2026-10-23'),
  ],
};
