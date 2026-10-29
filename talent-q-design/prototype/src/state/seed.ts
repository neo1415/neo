// Seed for the one simulated world. All people, organisations, jobs and receipts are fictional.
// The cast is shared across journeys so that one journey's actions show up in another's.
import type { Evidence, Person } from '@contracts';
import type { Actor, Application, CalEvent, Consent, Interview, Job, MandateX, Org, PipelineEntry, QPrefs, Thread } from './domain';

export const NOW = '2026-10-29T09:00:00+01:00';

export const ACTORS: Actor[] = [
  { id: 'u_funmi', name: 'Funmi Adebayo', first: 'Funmi', initials: 'FA', side: 'recruiter', title: 'Founder', timezone: 'Africa/Lagos', journey: 'R1', email: 'funmi@crumbandco.example', signedUp: false },
  { id: 'u_ada', name: 'Ada Okafor', first: 'Ada', initials: 'AO', side: 'recruiter', title: 'Talent partner', timezone: 'Africa/Lagos', orgId: 'org_kora', role: 'RECRUITER', journey: 'R2', email: 'ada@kora.example', signedUp: true },
  { id: 'u_ngozi', name: 'Ngozi Eze', first: 'Ngozi', initials: 'NE', side: 'recruiter', title: 'HR lead', timezone: 'Africa/Lagos', orgId: 'org_kora', role: 'ADMIN', journey: 'R3', email: 'ngozi@kora.example', signedUp: true },
  { id: 'u_seyi', name: 'Seyi Balogun', first: 'Seyi', initials: 'SB', side: 'recruiter', title: 'Engineering manager', timezone: 'Africa/Lagos', orgId: 'org_kora', role: 'HIRING_MANAGER', email: 'seyi@kora.example', signedUp: true },
  { id: 'u_musa', name: 'Musa Danladi', first: 'Musa', initials: 'MD', side: 'recruiter', title: 'Staff engineer', timezone: 'Europe/London', orgId: 'org_kora', role: 'INTERVIEWER', email: 'musa@kora.example', signedUp: true },
  { id: 'u_bayo', name: 'Bayo Ojo', first: 'Bayo', initials: 'BO', side: 'recruiter', title: 'Head of engineering', timezone: 'Africa/Lagos', orgId: 'org_kora', role: 'HIRING_MANAGER', journey: 'R5', email: 'bayo@kora.example', signedUp: true },
  { id: 'u_dele', name: 'Dele Martins', first: 'Dele', initials: 'DM', side: 'recruiter', title: 'Agency director', timezone: 'Africa/Lagos', orgId: 'org_tb', role: 'OWNER', journey: 'R4', email: 'dele@talentbridge.example', signedUp: true },
  { id: 'u_tunde', name: 'Tunde Bello', first: 'Tunde', initials: 'TB', side: 'recruiter', title: 'Agency researcher', timezone: 'Africa/Lagos', orgId: 'org_tb', role: 'VIEWER', email: 'tunde@talentbridge.example', signedUp: true },
  { id: 'p_amaka', name: 'Amaka Eze', first: 'Amaka', initials: 'AE', side: 'candidate', title: 'Economics graduate', timezone: 'Africa/Lagos', personId: 'p_amaka', journey: 'T1', email: 'amaka@mail.example', signedUp: false },
  { id: 'p_chidi', name: 'Chidi Nwosu', first: 'Chidi', initials: 'CN', side: 'candidate', title: 'Sales executive', timezone: 'Africa/Lagos', personId: 'p_chidi', journey: 'T2', email: 'chidi@mail.example', signedUp: true },
  { id: 'p_tobi', name: 'Tobi Adeyemi', first: 'Tobi', initials: 'TA', side: 'candidate', title: 'Senior backend engineer', timezone: 'Africa/Lagos', personId: 'p_tobi', journey: 'T3', email: 'tobi@mail.example', signedUp: true },
  { id: 'p_grace', name: 'Grace Okon', first: 'Grace', initials: 'GO', side: 'candidate', title: 'Care assistant', timezone: 'Africa/Lagos', personId: 'p_grace', journey: 'T4', email: 'grace@mail.example', signedUp: false },
  { id: 'p_zara', name: 'Zara Mensah', first: 'Zara', initials: 'ZM', side: 'candidate', title: 'Backend engineer', timezone: 'Africa/Accra', personId: 'p_zara', journey: 'T5', email: 'zara@mail.example', signedUp: true },
];

export const ORGS: Org[] = [
  { id: 'org_kora', name: 'Kora Pay', kind: 'EMPLOYER', industry: 'Payments', size: '120 people', city: 'Lagos', verified: { domain: true, registry: 'VERIFIED' }, delegation: 'APPROVE_EACH_SEND', setup: { done: true, step: 5 },
    guidelines: ['Panel of two for engineering interviews (handbook p.7)', 'Approve each outgoing message', 'Ask job-related questions only; never age, marital status, religion, ethnicity or state of origin', 'Interviews 10:00–16:00 Lagos time unless the candidate asks otherwise'] },
  { id: 'org_medlink', name: 'Medlink Health', kind: 'EMPLOYER', industry: 'Healthcare', size: '400 people', city: 'Abuja', verified: { domain: true, registry: 'VERIFIED' }, delegation: 'APPROVE_EACH_SEND', setup: { done: true, step: 5 }, guidelines: ['Remote-first for operations roles'] },
  { id: 'org_tb', name: 'Talentbridge', kind: 'AGENCY', industry: 'Recruitment agency', size: '9 people', city: 'Lagos', verified: { domain: true, registry: 'VERIFIED' }, delegation: 'APPROVED_CAMPAIGN', clients: ['org_kora', 'org_medlink'], setup: { done: true, step: 5 },
    guidelines: ['Client data stays inside that client’s workspace', 'Campaigns need a signed client brief', 'Researchers can view pools, not confidential client records'] },
  { id: 'org_rivers', name: 'Rivers Logistics', kind: 'EMPLOYER', industry: 'Logistics', size: '60 people', city: 'Port Harcourt', verified: { domain: false, registry: 'PENDING' }, delegation: 'DRAFT_ONLY', setup: { done: true, step: 5 }, guidelines: [] },
  { id: 'org_tinda', name: 'Tinda', kind: 'EMPLOYER', industry: 'Consumer apps', size: '45 people', city: 'Lagos', verified: { domain: true, registry: 'VERIFIED' }, delegation: 'APPROVE_EACH_SEND', setup: { done: true, step: 5 }, guidelines: [] },
  { id: 'org_carehome', name: 'Sunrise Care Homes', kind: 'EMPLOYER', industry: 'Care', size: '200 people', city: 'Uyo', verified: { domain: true, registry: 'VERIFIED' }, delegation: 'APPROVE_EACH_SEND', setup: { done: true, step: 5 }, guidelines: [] },
];

const req = (reqId: string, label: string, mustHave: boolean, plain: string) => ({ reqId, label, mustHave, plain });
export const MANDATES: MandateX[] = [
  { id: 'm_support', orgId: 'org_kora', title: 'Customer Support Lead', plain: 'Leads a team of 6 answering merchant questions', team: 'Merchant success', location: 'Lagos', workMode: 'HYBRID', pay: { min: 650000, max: 900000, currency: 'NGN', period: 'month' }, status: 'INTERVIEWING', createdBy: 'u_ngozi',
    requirements: [req('s1', 'Team leadership', true, 'Has led a support or service team'), req('s2', 'Payments knowledge', false, 'Understands card and transfer disputes'), req('s3', 'Written clarity', true, 'Writes replies merchants act on')], versions: [{ v: 1, at: '2026-10-10', by: 'u_ngozi', note: 'Approved' }] },
  { id: 'm_ops', orgId: 'org_medlink', clientOrgId: 'org_medlink', title: 'Operations Analyst', plain: 'Improves how clinics book and track patients', team: 'Operations', location: 'Remote (Nigeria)', workMode: 'REMOTE', pay: { min: 500000, max: 700000, currency: 'NGN', period: 'month' }, status: 'SOURCING', createdBy: 'u_dele',
    requirements: [req('o1', 'Process mapping', true, 'Draws how work actually flows'), req('o2', 'Spreadsheet modelling', true, 'Builds models that answer a question'), req('o3', 'Stakeholder conversations', false, 'Asks teams what they really need')], versions: [{ v: 1, at: '2026-10-20', by: 'u_dele', note: 'From Medlink brief' }] },
  { id: 'm_kora_agency', orgId: 'org_tb', clientOrgId: 'org_kora', title: 'Backend Engineer (Kora Pay, via agency)', plain: 'Second backend hire for Kora’s payouts team', team: 'Payouts', location: 'Lagos', workMode: 'ONSITE', pay: { min: 2200000, max: 2800000, currency: 'NGN', period: 'month' }, status: 'SOURCING', confidential: true, createdBy: 'u_dele',
    requirements: [req('k1', 'Go in production', true, 'Writes and operates Go services'), req('k2', 'Payments systems', true, 'Has worked on money movement'), req('k3', 'On-site in Lagos', true, 'Works from the Lagos office')], versions: [{ v: 1, at: '2026-10-22', by: 'u_dele', note: 'Confidential client brief' }] },
];

export const PIPELINE: PipelineEntry[] = [
  { mandateId: 'm_backend', personId: 'p_tobi', stage: 'SHORTLISTED', at: '2026-10-24', by: 'u_ada' },
  { mandateId: 'm_backend', personId: 'p_ife', stage: 'SHORTLISTED', at: '2026-10-24', by: 'u_ada' },
  { mandateId: 'm_backend', personId: 'p_kunle', stage: 'SHORTLISTED', at: '2026-10-24', by: 'u_ada' },
  { mandateId: 'm_backend', personId: 'p_zara', stage: 'REPLIED', at: '2026-10-27', by: 'u_ngozi', note: 'Applied via the Kora job page' },
  { mandateId: 'm_support', personId: 'p_grace', stage: 'SOURCED', at: '2026-10-26', by: 'u_ngozi' },
  { mandateId: 'm_ops', personId: 'p_chidi', stage: 'SOURCED', at: '2026-10-25', by: 'u_dele' },
  { mandateId: 'm_ops', personId: 'p_amaka', stage: 'SOURCED', at: '2026-10-25', by: 'u_dele' },
  { mandateId: 'm_kora_agency', personId: 'p_dayo', stage: 'SHORTLISTED', at: '2026-10-26', by: 'u_dele' },
  { mandateId: 'm_kora_agency', personId: 'p_zara', stage: 'SOURCED', at: '2026-10-26', by: 'u_tunde' },
];

export const EXTRA_PEOPLE: Person[] = [
  { personId: 'p_grace', name: 'Grace Okon', headline: 'Care assistant, 4 yrs · looking for a steadier role', location: 'Uyo', timezone: 'Africa/Lagos', synthetic: true },
];

const ev = (e: Partial<Evidence> & Pick<Evidence, 'evidenceId' | 'ownerId' | 'kind' | 'title'>): Evidence => ({ source: 'Talent Q', observedAt: '2026-10-01', verified: false, shows: '', limits: '', visibility: 'PRIVATE', sharedWith: [], origin: 'SEED', ...e });
export const EXTRA_EVIDENCE: Evidence[] = [
  ev({ evidenceId: 'e_tobi_conf', ownerId: 'p_tobi', kind: 'PROJECT', title: 'Fraud-rules engine at Lumen (confidential)', source: 'Private document', observedAt: '2026-07-01', verified: false, verification: 'UNVERIFIED', confidential: true, shows: 'Designed the rules engine that blocks fraudulent payouts.', limits: 'Confidential under NDA; cannot be shared as-is.' }),
  ev({ evidenceId: 'e_tobi_aws', ownerId: 'p_tobi', kind: 'CREDENTIAL', title: 'AWS Solutions Architect – Associate', source: 'Uploaded certificate', observedAt: '2025-03-10', verification: 'PENDING', shows: 'Passed the associate-level cloud architecture exam.', limits: 'Issuer check pending.' }),
  ev({ evidenceId: 'e_zara_api', ownerId: 'p_zara', kind: 'PROJECT', title: 'Fleet tracking API (public repo)', source: 'GitHub public repository', observedAt: '2026-06-02', verified: false, verification: 'PENDING', shows: 'A Go service that ingests GPS pings and serves routes.', limits: 'Repository check pending.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
  ev({ evidenceId: 'e_zara_pg', ownerId: 'p_zara', kind: 'WORK_SAMPLE', title: 'Postgres partitioning write-up', source: 'Shared document', observedAt: '2026-05-11', verified: false, verification: 'UNVERIFIED', shows: 'Partitioned a 200m-row table by month and explained the trade-offs.', limits: 'Self-reported numbers.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] }),
  ev({ evidenceId: 'e_chidi_sales', ownerId: 'p_chidi', kind: 'EMPLOYMENT', title: 'Sales executive, Bole Distributors, 2021–now', source: 'Employer letter (simulated)', observedAt: '2026-09-01', verified: true, verification: 'VERIFIED', shows: 'Managed 40 retail accounts; grew region revenue 18%.', limits: 'Sales role; no product or analysis title.' }),
  ev({ evidenceId: 'e_grace_cert', ownerId: 'p_grace', kind: 'CREDENTIAL', title: 'First aid certificate (Red Cross, simulated)', source: 'Photo upload', observedAt: '2025-12-01', verified: false, verification: 'PENDING', shows: 'Completed a first aid course.', limits: 'Issuer check pending.' }),
];

export const JOBS: Job[] = [
  { id: 'j_kora_backend', orgId: 'org_kora', mandateId: 'm_backend', title: 'Senior Backend Engineer', location: 'Lagos', workMode: 'HYBRID', pay: '₦2.4m–₦3.1m / month', posted: '2026-10-22', status: 'OPEN', needs: ['Payments systems', 'Go in production', 'Postgres at scale'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within 3 days' } },
  { id: 'j_rivers_backend', orgId: 'org_rivers', title: 'Backend Engineer', location: 'Port Harcourt', workMode: 'ONSITE', pay: 'Not stated', posted: '2026-09-30', status: 'OPEN', needs: ['Go', 'Logistics systems'], signals: { domainVerified: false, registryVerified: false, recruiterActive: false, replies: 'No replies recorded in 30 days' } },
  { id: 'j_tinda_pa', orgId: 'org_tinda', title: 'Junior Product Analyst', location: 'Lagos', workMode: 'HYBRID', pay: '₦450k–₦600k / month', posted: '2026-10-18', status: 'OPEN', needs: ['SQL', 'Dashboards', 'Product writing'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within a week' } },
  { id: 'j_kora_data', orgId: 'org_kora', title: 'Data Analyst I', location: 'Remote', workMode: 'REMOTE', pay: '₦500k–₦650k / month', posted: '2026-10-15', status: 'OPEN', needs: ['SQL', 'Spreadsheets', 'Statistics'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within 3 days' } },
  { id: 'j_medlink_ba', orgId: 'org_medlink', mandateId: 'm_ops', title: 'Business Analyst (Operations)', location: 'Remote (Nigeria)', workMode: 'REMOTE', pay: '₦500k–₦700k / month', posted: '2026-10-21', status: 'OPEN', needs: ['Process mapping', 'Spreadsheet modelling', 'Stakeholder conversations'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within 5 days' } },
  { id: 'j_tinda_apm', orgId: 'org_tinda', title: 'Associate Product Manager', location: 'Lagos', workMode: 'HYBRID', pay: '₦700k–₦900k / month', posted: '2026-10-02', status: 'OPEN', needs: ['Stakeholder conversations', 'Product writing', 'User research'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within a week' } },
  { id: 'j_care_coord', orgId: 'org_carehome', title: 'Care Coordinator', location: 'Uyo', workMode: 'ONSITE', pay: '₦220k–₦280k / month', posted: '2026-10-20', status: 'OPEN', needs: ['Care experience', 'Rota planning', 'First aid'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within 3 days' } },
  { id: 'j_kora_support', orgId: 'org_kora', mandateId: 'm_support', title: 'Customer Support Lead', location: 'Lagos', workMode: 'HYBRID', pay: '₦650k–₦900k / month', posted: '2026-10-10', status: 'OPEN', needs: ['Team leadership', 'Written clarity'], signals: { domainVerified: true, registryVerified: true, recruiterActive: true, replies: 'Usually replies within 3 days' } },
];

export const APPLICATIONS: Application[] = [
  { id: 'a_zara_rivers', jobId: 'j_rivers_backend', personId: 'p_zara', status: 'SUBMITTED', shared: ['e_zara_api'], timeline: [{ at: '2026-10-05', text: 'You applied', by: 'YOU' }], lastEmployerActivity: undefined },
  { id: 'a_zara_kora', jobId: 'j_kora_backend', personId: 'p_zara', status: 'VIEWED', shared: ['e_zara_api', 'e_zara_pg'], timeline: [{ at: '2026-10-26', text: 'You applied', by: 'YOU' }, { at: '2026-10-27', text: 'Kora Pay viewed your application', by: 'EMPLOYER' }], lastEmployerActivity: '2026-10-27' },
  { id: 'a_chidi_tinda', jobId: 'j_tinda_apm', personId: 'p_chidi', status: 'NOT_PROGRESSING', shared: [], timeline: [{ at: '2026-10-03', text: 'You applied', by: 'YOU' }, { at: '2026-10-17', text: 'Tinda is not progressing your application', by: 'EMPLOYER' }] },
];

export const THREADS: Thread[] = [
  { id: 't_zara_kora', orgId: 'org_kora', personId: 'p_zara', mandateId: 'm_backend', messages: [
    { id: 'm1', from: 'p_zara', to: 'u_ngozi', subject: 'Application: Senior Backend Engineer', body: 'Hi, I applied on Monday. Happy to share more about the fleet API if useful.', at: '2026-10-27T10:12:00+01:00', status: 'RECEIVED', channel: 'IN_APP' },
  ] },
];

/** Busy calendars (simulated free/busy only). Monday 2 Nov 2026 onward. */
export const CAL: CalEvent[] = [
  { id: 'c1', orgId: 'org_kora', title: 'Busy', start: '2026-11-03T10:00:00+01:00', end: '2026-11-03T11:00:00+01:00', attendees: ['u_ngozi'], status: 'CONFIRMED', simulated: true },
  { id: 'c2', orgId: 'org_kora', title: 'Busy', start: '2026-11-03T14:00:00+01:00', end: '2026-11-03T15:30:00+01:00', attendees: ['u_seyi'], status: 'CONFIRMED', simulated: true },
  { id: 'c3', orgId: 'org_kora', title: 'Busy', start: '2026-11-04T09:00:00+00:00', end: '2026-11-04T12:00:00+00:00', attendees: ['u_musa'], status: 'CONFIRMED', simulated: true },
  { id: 'c4', orgId: 'org_kora', title: 'Interview: Grace Okon (Support Lead)', start: '2026-10-30T11:00:00+01:00', end: '2026-10-30T11:45:00+01:00', attendees: ['u_ngozi', 'p_grace'], status: 'INVITED', mandateId: 'm_support', personId: 'p_grace', simulated: true },
];

export const INTERVIEWS: Interview[] = [
  { id: 'i_grace', orgId: 'org_kora', mandateId: 'm_support', personId: 'p_grace', eventId: 'c4', panel: ['u_ngozi'], status: 'INVITED', feedback: [] },
];

export const consentFor = (personId: string): Consent => ({ personId, discoverable: personId !== 'p_grace', withdrawnFrom: [], notifications: { email: true, sms: personId === 'p_grace', inApp: true, digest: 'WEEKLY' }, lite: false });
export const defaultPrefs = (a: Actor): QPrefs => ({ proactive: 'NORMAL', voice: a.id !== 'p_grace', plain: a.id === 'u_funmi' || a.id === 'p_grace' });
