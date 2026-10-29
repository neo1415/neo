// Seed records for R1 (Funmi, Crumb & Co) and R5 (Bayo, Kora Pay). All people are fictional.
// Crumb & Co's search reads only the small-business pool below (Talent Q profiles open to offers, simulated);
// Kora Pay's pipeline is never part of it. Kora gets a Payouts brief awaiting Bayo, two junior engineers,
// and Kunle Bakare's conflicting sources (CV says 6 years of Go, public GitHub suggests about 2).
import type { Evidence, Person } from '@contracts';
import type { SeedPatch } from '../../mock/world';
import type { MandateX } from '../domain';

const p = (personId: string, name: string, headline: string, location: string): Person => ({ personId, name, headline, location, timezone: 'Africa/Lagos', synthetic: true });
const ev = (e: Partial<Evidence> & Pick<Evidence, 'evidenceId' | 'ownerId' | 'kind' | 'title' | 'shows'>): Evidence => ({ source: 'Talent Q profile', observedAt: '2026-09-01', verified: false, limits: '', visibility: 'PUBLIC_PROFILE', sharedWith: [], origin: 'SEED', verification: 'UNVERIFIED', ...e });

export const SMALL_POOL: Person[] = [
  p('p_ha_kemi', 'Kemi Alade', 'Bookkeeper for two shops, part-time · 4 yrs', 'Ikeja, Lagos'),
  p('p_ha_yusuf', 'Yusuf Garba', 'Bookkeeping and sales records · 2 yrs', 'Yaba, Lagos'),
  p('p_ha_halima', 'Halima Bello', 'Accounts assistant, ICAN student · 6 yrs', 'Surulere, Lagos'),
  p('p_ha_tope', 'Tope Fashola', 'Accounting graduate, first bookkeeping role', 'Ikeja, Lagos'),
  p('p_ha_blessing', 'Blessing Udo', 'Shop assistant, bakery and café · 3 yrs', 'Ikeja, Lagos'),
  p('p_ha_femi', 'Femi Coker', 'Cashier and customer service · 2 yrs', 'Ogba, Lagos'),
  p('p_ha_aisha', 'Aisha Lawan', 'Retail assistant, weekends · 1 yr', 'Ikeja, Lagos'),
  p('p_ha_segun', 'Segun Ayodele', 'Shop supervisor, food retail · 5 yrs', 'Maryland, Lagos'),
  p('p_ha_joy', 'Joy Effiong', 'Café manager · 7 yrs', 'Ikeja, Lagos'),
  p('p_ha_ruth', 'Ruth Okeke', 'Baker’s assistant, bread and pastries · 3 yrs', 'Agege, Lagos'),
  p('p_ha_ibrahim', 'Ibrahim Sule', 'Pastry cook · 4 yrs', 'Ikeja, Lagos'),
  p('p_ha_emmanuel', 'Emmanuel Eto', 'Delivery rider with own bike · 3 yrs', 'Ikeja, Lagos'),
  p('p_ha_sani', 'Sani Abubakar', 'Dispatch rider · 2 yrs', 'Ojota, Lagos'),
];
export const KORA_JUNIORS: Person[] = [
  p('p_ha_emeka', 'Emeka Nnadi', 'Junior backend engineer, Go · 1.5 yrs', 'Lagos'),
  p('p_ha_bolu', 'Bolu Adeyinka', 'Backend engineer, payments internship + 2 yrs', 'Lagos'),
];

const E: Evidence[] = [
  ev({ evidenceId: 'e_ha_kemi_1', ownerId: 'p_ha_kemi', kind: 'REFERENCE', title: 'Reference from Mama Put Stores owner', source: 'Reference (simulated)', verified: true, verification: 'VERIFIED', shows: 'Kept daily sales and expenses for two shops; owner says the books always balanced.', limits: 'One reference.' }),
  ev({ evidenceId: 'e_ha_kemi_2', ownerId: 'p_ha_kemi', kind: 'WORK_SAMPLE', title: 'Sample monthly summary (redacted)', shows: 'A one-page summary of sales, costs and what is owed to suppliers.', limits: 'Shop names removed.' }),
  ev({ evidenceId: 'e_ha_yusuf_1', ownerId: 'p_ha_yusuf', kind: 'CLAIM', title: 'CV: keeps sales records in Excel', shows: 'Says he records daily sales and POS transfers in a spreadsheet.', limits: 'A claim; no sample yet.' }),
  ev({ evidenceId: 'e_ha_halima_1', ownerId: 'p_ha_halima', kind: 'CREDENTIAL', title: 'ICAN foundation level', source: 'Uploaded certificate', verification: 'PENDING', shows: 'Passed the first professional accounting exams.', limits: 'Issuer check pending. Asks ₦150k+ a month.' }),
  ev({ evidenceId: 'e_ha_tope_1', ownerId: 'p_ha_tope', kind: 'CREDENTIAL', title: 'BSc Accounting', source: 'Uploaded certificate', verification: 'PENDING', shows: 'Accounting degree.', limits: 'No work history yet.' }),
  ev({ evidenceId: 'e_ha_blessing_1', ownerId: 'p_ha_blessing', kind: 'REFERENCE', title: 'Reference from a café owner', source: 'Reference (simulated)', verified: true, verification: 'VERIFIED', shows: 'Ran the counter on busy mornings and handled the till.', limits: 'One reference.' }),
  ev({ evidenceId: 'e_ha_femi_1', ownerId: 'p_ha_femi', kind: 'CLAIM', title: 'CV: cashier at a supermarket', shows: 'Says he handled cash and POS for two years.', limits: 'A claim.' }),
  ev({ evidenceId: 'e_ha_aisha_1', ownerId: 'p_ha_aisha', kind: 'CLAIM', title: 'Weekend retail work', shows: 'Says she worked weekends at a clothes shop.', limits: 'A claim; weekends only.' }),
  ev({ evidenceId: 'e_ha_segun_1', ownerId: 'p_ha_segun', kind: 'EMPLOYMENT', title: 'Shop supervisor, FreshMart', source: 'Employer letter (simulated)', verified: true, verification: 'VERIFIED', shows: 'Opened and closed the shop, managed a rota of 6.', limits: 'Letter only.' }),
  ev({ evidenceId: 'e_ha_joy_1', ownerId: 'p_ha_joy', kind: 'CLAIM', title: 'CV: café manager', shows: 'Says she managed a café of 8 staff.', limits: 'A claim. Asks ₦250k a month.' }),
  ev({ evidenceId: 'e_ha_ruth_1', ownerId: 'p_ha_ruth', kind: 'WORK_SAMPLE', title: 'Photos of bakes (simulated)', shows: 'Bread and pastry photos with dates.', limits: 'Photos, not a trial bake.' }),
  ev({ evidenceId: 'e_ha_ibrahim_1', ownerId: 'p_ha_ibrahim', kind: 'CLAIM', title: 'CV: pastry cook at a hotel', shows: 'Says he made pastries for a hotel breakfast.', limits: 'A claim.' }),
  ev({ evidenceId: 'e_ha_emmanuel_1', ownerId: 'p_ha_emmanuel', kind: 'CREDENTIAL', title: 'Rider’s permit', source: 'Uploaded document', verification: 'PENDING', shows: 'Has a rider’s permit and own bike.', limits: 'Check pending.' }),
  ev({ evidenceId: 'e_ha_sani_1', ownerId: 'p_ha_sani', kind: 'CLAIM', title: 'Dispatch rider for a food app', shows: 'Says he delivered food orders across Ikeja.', limits: 'A claim.' }),
  // Kora juniors (shared with Kora because they applied)
  ev({ evidenceId: 'e_ha_emeka_1', ownerId: 'p_ha_emeka', kind: 'PROJECT', title: 'Go wallet service (bootcamp capstone)', source: 'Public repository', shows: 'A small Go service with tests for wallet top-ups.', limits: 'A course project, not production.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
  ev({ evidenceId: 'e_ha_bolu_1', ownerId: 'p_ha_bolu', kind: 'EMPLOYMENT', title: 'Payments intern, then engineer, at a lender', source: 'Employer letter (simulated)', verified: true, verification: 'VERIFIED', shows: 'Worked on disbursement jobs that pay out loans.', limits: '2 years in total.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
  // Kunle: two sources that disagree. Both shared with Kora; neither is silently preferred.
  ev({ evidenceId: 'e_ha_kunle_cv', ownerId: 'p_kunle', kind: 'CLAIM', title: 'CV: 6 years building Go services (2020 to now)', source: 'CV uploaded by Kunle', observedAt: '2026-10-20', shows: 'Says he has written Go in production since 2020.', limits: 'His own claim.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
  ev({ evidenceId: 'e_ha_kunle_gh', ownerId: 'p_kunle', kind: 'PROJECT', title: 'GitHub: Go activity from March 2024', source: 'Public GitHub profile', observedAt: '2026-10-21', verification: 'VERIFIED', verified: true, shows: 'Public Go commits start in March 2024, about 2 years ago.', limits: 'Only public work shows; private company code would not appear.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
];

const PAYOUTS: MandateX = {
  id: 'm_payouts', orgId: 'org_kora', title: 'Backend Engineer, Payouts', plain: 'Builds and runs the services that pay merchants out every day, and fixes them when a payout fails.', team: 'Payouts', location: 'Lagos', workMode: 'HYBRID',
  pay: { min: 1800000, max: 2600000, currency: 'NGN', period: 'month' }, status: 'DRAFT', createdBy: 'u_ada',
  requirements: [
    { reqId: 'py1', label: 'Payout or transfer systems', mustHave: true, plain: 'Has built or run systems that send money out and retry safely' },
    { reqId: 'py2', label: 'Go in production', mustHave: true, plain: 'Writes and operates Go services under real load' },
    { reqId: 'py3', label: 'Postgres', mustHave: true, plain: 'Designs tables and fixes slow queries' },
    { reqId: 'py4', label: 'On-call', mustHave: false, plain: 'Can take part in an on-call rota, one week in four' },
  ],
  versions: [{ v: 1, at: '2026-10-27T15:10:00+01:00', by: 'u_ada', note: 'Drafted by Ada for Bayo’s approval' }],
};

export const seed: SeedPatch = { people: [...SMALL_POOL, ...KORA_JUNIORS], evidence: E as SeedPatch['evidence'], mandates: [PAYOUTS] };
