// Synthetic, fictional data. Every person and company here is invented for the design prototype.
import type { Evidence, Mandate, MemoryItem, Person, RoleFit, CalendarConnection, MeetingPreferences, BusyInterval, CareerGoal, J7Measures, RoleGap, PolicyCitation } from '@contracts';

export const ORG = { orgId: 'org_kora', name: 'Kora Pay', recruiterId: 'p_ada', recruiterName: 'Ada Okafor', timezone: 'Africa/Lagos' };

export const MANDATE: Mandate = {
  mandateId: 'm_backend',
  title: 'Senior Backend Engineer',
  team: 'Payments platform',
  location: 'Lagos',
  workMode: 'HYBRID',
  payBand: '₦2.4m–₦3.1m / month',
  version: 1,
  status: 'DRAFT',
  requirements: [
    { reqId: 'r1', label: 'Payments systems', mustHave: true, plain: 'Has built or run systems that move money and reconcile it' },
    { reqId: 'r2', label: 'Go in production', mustHave: true, plain: 'Writes and operates Go services under real load' },
    { reqId: 'r3', label: 'Postgres at scale', mustHave: true, plain: 'Designs schemas and fixes slow queries on large tables' },
    { reqId: 'r4', label: 'On-call leadership', mustHave: false, plain: 'Has led incident response and written post-mortems' },
    { reqId: 'r5', label: 'Mentoring', mustHave: false, plain: 'Has helped less experienced engineers grow' },
  ],
};

export const PEOPLE: Person[] = [
  { personId: 'p_tobi', name: 'Tobi Adeyemi', headline: 'Backend engineer, reconciliation · 7 yrs', location: 'Lagos', timezone: 'Africa/Lagos', synthetic: true },
  { personId: 'p_ife', name: 'Ifeoma Obi', headline: 'Platform engineer, Go and Postgres · 9 yrs', location: 'Abuja', timezone: 'Africa/Lagos', synthetic: true },
  { personId: 'p_kunle', name: 'Kunle Bakare', headline: 'Senior engineer, fintech APIs · 8 yrs', location: 'Nairobi (remote)', timezone: 'Africa/Nairobi', synthetic: true },
  { personId: 'p_zara', name: 'Zara Mensah', headline: 'Backend engineer, logistics · 5 yrs', location: 'Accra', timezone: 'Africa/Accra', synthetic: true },
  { personId: 'p_dayo', name: 'Dayo Lawal', headline: 'Engineering lead, lending · 11 yrs', location: 'London', timezone: 'Europe/London', synthetic: true },
  { personId: 'p_amaka', name: 'Amaka Eze', headline: 'Economics graduate, aspiring product analyst', location: 'Enugu', timezone: 'Africa/Lagos', synthetic: true },
  { personId: 'p_chidi', name: 'Chidi Nwosu', headline: 'Retail store lead moving into sales development', location: 'Port Harcourt', timezone: 'Africa/Lagos', synthetic: true },
];

/** Profiles the sourcing run reads, in order. 24 is small on purpose: every one is actually processed by the mock. */
export const SOURCE_POOL = [
  'p_tobi', 'p_zara', 'p_ife', 'p_dayo', 'p_kunle',
  ...Array.from({ length: 19 }, (_, i) => `p_pool_${i + 1}`),
];

export const EVIDENCE: Evidence[] = [
  { evidenceId: 'e_tobi_recon', ownerId: 'p_tobi', kind: 'PROJECT', title: 'Ledger reconciliation service at Lumen', source: 'Shared repository snapshot', observedAt: '2026-08-14', verified: true, shows: 'Designed the job that matches 4m daily card settlements to the ledger and flags mismatches within minutes.', limits: 'Code was reviewed statically; production metrics are self-reported.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] },
  { evidenceId: 'e_tobi_go', ownerId: 'p_tobi', kind: 'WORK_SAMPLE', title: 'Go idempotency library', source: 'Public repository', observedAt: '2026-05-02', verified: false, shows: 'Writes idiomatic, tested Go with clear error handling.', limits: 'A library, not a service under load.', visibility: 'PUBLIC_PROFILE', sharedWith: [] },
  { evidenceId: 'e_tobi_pg', ownerId: 'p_tobi', kind: 'ASSESSMENT', title: 'Postgres query tuning exercise', source: 'Talent Q practice (promoted by Tobi)', observedAt: '2026-09-30', verified: true, shows: 'Cut a 9-second report query to 140ms with an index and a rewrite.', limits: 'Timed exercise on synthetic data.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] },
  { evidenceId: 'e_tobi_cert', ownerId: 'p_tobi', kind: 'CREDENTIAL', title: 'BSc Computer Science, UNILAG', source: 'Uploaded certificate', observedAt: '2019-11-01', verified: false, shows: 'Degree in computer science.', limits: 'Not yet verified with the issuer.', visibility: 'PRIVATE', sharedWith: [] },
  { evidenceId: 'e_ife_platform', ownerId: 'p_ife', kind: 'EMPLOYMENT', title: 'Platform team, Paystack-like processor', source: 'Reference check (simulated)', observedAt: '2026-06-10', verified: true, shows: 'Ran the Go services that route card payments.', limits: 'Reference from a former manager.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] },
  { evidenceId: 'e_ife_oncall', ownerId: 'p_ife', kind: 'WORK_SAMPLE', title: 'Incident post-mortems (3)', source: 'Shared documents', observedAt: '2026-04-21', verified: false, shows: 'Led two P1 incidents and wrote blameless reviews.', limits: 'Redacted copies.', visibility: 'SHARED_WITH', sharedWith: ['org_kora'] },
  { evidenceId: 'e_kunle_api', ownerId: 'p_kunle', kind: 'PROJECT', title: 'Open banking API gateway', source: 'Case study', observedAt: '2024-02-01', verified: false, shows: 'Built a payments API used by 30 banks.', limits: 'Over two years old.', visibility: 'PUBLIC_PROFILE', sharedWith: [] },
];

export const FITS: RoleFit[] = [
  { personId: 'p_tobi', mandateId: 'm_backend', unknowns: ['Salary expectation not stated'], mutual: { workMode: 'MATCH', pay: 'UNKNOWN', location: 'MATCH' },
    byRequirement: [
      { reqId: 'r1', state: 'VERIFIED_CAPABILITY', evidenceIds: ['e_tobi_recon'], note: 'Reconciliation at 4m settlements a day' },
      { reqId: 'r2', state: 'EVIDENCED', evidenceIds: ['e_tobi_go'], note: 'Library, not a service' },
      { reqId: 'r3', state: 'VERIFIED_CAPABILITY', evidenceIds: ['e_tobi_pg'], note: 'Tuning exercise, 9s → 140ms' },
      { reqId: 'r4', state: 'NOT_EVIDENCED', evidenceIds: [], note: 'Nothing shared yet; ask in interview' },
      { reqId: 'r5', state: 'REQUIREMENT_UNCLEAR', evidenceIds: [], note: 'Mandate does not say what mentoring means here' },
    ] },
  { personId: 'p_ife', mandateId: 'm_backend', unknowns: [], mutual: { workMode: 'PARTIAL', pay: 'MATCH', location: 'PARTIAL' },
    byRequirement: [
      { reqId: 'r1', state: 'EVIDENCED', evidenceIds: ['e_ife_platform'], note: 'Card routing, not reconciliation' },
      { reqId: 'r2', state: 'VERIFIED_CAPABILITY', evidenceIds: ['e_ife_platform'], note: 'Reference confirms' },
      { reqId: 'r3', state: 'EVIDENCED', evidenceIds: ['e_ife_platform'], note: 'Mentioned by reference' },
      { reqId: 'r4', state: 'EVIDENCED', evidenceIds: ['e_ife_oncall'], note: 'Two P1 incidents led' },
      { reqId: 'r5', state: 'REQUIREMENT_UNCLEAR', evidenceIds: [], note: 'Mandate does not say what mentoring means here' },
    ] },
  { personId: 'p_kunle', mandateId: 'm_backend', unknowns: ['Relocation or remote preference'], mutual: { workMode: 'UNKNOWN', pay: 'UNKNOWN', location: 'MISMATCH' },
    byRequirement: [
      { reqId: 'r1', state: 'EVIDENCE_OUTDATED', evidenceIds: ['e_kunle_api'], note: 'Case study from 2024' },
      { reqId: 'r2', state: 'NOT_EVIDENCED', evidenceIds: [], note: 'Profile says Java and Kotlin' },
      { reqId: 'r3', state: 'EVIDENCED', evidenceIds: ['e_kunle_api'], note: 'Gateway used Postgres' },
      { reqId: 'r4', state: 'NOT_EVIDENCED', evidenceIds: [], note: 'Not mentioned' },
      { reqId: 'r5', state: 'REQUIREMENT_UNCLEAR', evidenceIds: [], note: 'Mandate does not say what mentoring means here' },
    ] },
];

export const POLICIES: (PolicyCitation & { title: string; source: string; status: 'ACTIVE' | 'PENDING_REVIEW' })[] = [
  { policyId: 'pol_platform_consent', version: 1, layer: 'PLATFORM', title: 'Contact needs a lawful basis', text: 'Only contact people whose profile allows recruiter contact, or who applied.', source: 'Talent Q platform rule', status: 'ACTIVE' },
  { policyId: 'pol_ng_ndpa', version: 1, layer: 'JURISDICTION', title: 'Nigeria data protection', text: 'Tell candidates why we hold their data and how to have it deleted, in the first message.', source: 'NDPA 2023 (summary, not legal advice)', status: 'ACTIVE' },
  { policyId: 'pol_kora_tone', version: 2, layer: 'ORG_RULE', title: 'Kora Pay outreach tone', text: 'Plain, warm, no exaggeration. Name the team and the pay band in the first message.', source: 'Kora hiring handbook, p.4', status: 'ACTIVE' },
  { policyId: 'pol_kora_hours', version: 1, layer: 'ORG_RULE', title: 'Interview hours', text: 'Interviews run 09:00–17:00 Lagos time, Monday to Friday.', source: 'Kora hiring handbook, p.7', status: 'ACTIVE' },
  { policyId: 'pol_kora_panel', version: 1, layer: 'ORG_RULE', title: 'Panel for senior roles', text: 'Senior engineering interviews need the hiring manager and one engineer.', source: 'Kora hiring handbook, p.7', status: 'PENDING_REVIEW' },
];

export const CALENDARS: CalendarConnection[] = [
  { personId: 'p_ada', provider: 'GOOGLE', health: 'NOT_CONNECTED', scopes: [], checkedAt: '2026-10-27T08:00:00Z' },
  { personId: 'p_seyi', provider: 'MICROSOFT', health: 'CONNECTED_FREEBUSY_ONLY', scopes: ['freebusy.read'], checkedAt: '2026-10-27T08:00:00Z' },
];

export const PANEL = [
  { personId: 'p_ada', name: 'Ada Okafor', role: 'Recruiter', provider: 'GOOGLE' as const, required: true },
  { personId: 'p_seyi', name: 'Seyi Balogun', role: 'Hiring manager', provider: 'MICROSOFT' as const, required: true },
];

export const ADA_PREFS: MeetingPreferences = {
  personId: 'p_ada', timezone: 'Africa/Lagos',
  workingHours: [1, 2, 3, 4, 5].map((d) => ({ day: d as 1, start: '09:00', end: '17:00' })),
  noMeetingBlocks: [{ label: 'Tuesday review', day: 2, start: '13:00', end: '15:00' }],
  bufferMinutes: 15, minLeadHours: 24, preferMornings: true, defaultDurationMinutes: 45, memoryId: 'mem_ada_hours',
};

/** Busy intervals only: the mock calendars never expose titles. Week of Mon 2 Nov 2026, UTC. */
export const BUSY: Record<string, BusyInterval[]> = {
  p_ada: [
    { start: '2026-11-02T08:00:00Z', end: '2026-11-02T09:30:00Z' },
    { start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:00:00Z' },
  ],
  p_seyi: [
    { start: '2026-11-03T08:00:00Z', end: '2026-11-03T10:00:00Z' },
    { start: '2026-11-05T13:00:00Z', end: '2026-11-05T16:00:00Z' },
  ],
};

const t = '2026-10-20T10:12:00Z';
export const MEMORIES: MemoryItem[] = [
  mem('mem_ada_hours', 'PREFERENCE_OR_RULE', 'recruiter.meeting.window', 'p_ada', 'PERSONAL_PRIVATE', 'Ada takes interview calls after 10:00 Lagos time, mornings first, never in the Tuesday review (13:00–15:00).',
    [{ kind: 'MESSAGE', ref: 'msg_ada_0412', label: 'Your message, 20 Oct', quote: 'No calls before 10, mornings are best, and keep Tuesday 1–3 clear for review.', at: t }], 'STATED_BY_USER', 'CONFIRMED_PREFERENCE', 'Used every time Q proposes interview times for you.'),
  mem('mem_ada_tone', 'PREFERENCE_OR_RULE', 'recruiter.outreach.signoff', 'p_ada', 'PERSONAL_PRIVATE', 'Ada signs outreach “Ada, Kora Pay hiring” and prefers first names.',
    [{ kind: 'MESSAGE', ref: 'msg_ada_0398', label: 'Your edit to a draft, 18 Oct', quote: 'Just “Ada, Kora Pay hiring” please.', at: '2026-10-18T09:01:00Z' }], 'STATED_BY_USER', 'CONFIRMED_PREFERENCE', 'Applied to every outreach draft.'),
  mem('mem_kora_panel', 'PREFERENCE_OR_RULE', 'org.interview.panel.senior', 'org_kora', 'ORGANIZATION', 'Senior engineering interviews include the hiring manager and one engineer.',
    [{ kind: 'POLICY', ref: 'pol_kora_panel@1', label: 'Kora hiring handbook, p.7', at: '2026-10-01T00:00:00Z' }], 'ORG_POLICY', 'ORG_GUIDELINE', 'Org rule. You cannot change it here; an admin can.'),
  mem('mem_backend_qplan', 'EPISODIC_TASK', 'mandate.m_backend.question_plan', 'm_backend', 'TEAM', 'Agreed interview plan for Senior Backend: reconciliation design, an incident walk-through, and one locked question on idempotency.',
    [{ kind: 'RUN', ref: 'run_plan_1022', label: 'Interview plan you approved, 22 Oct', at: '2026-10-22T15:40:00Z' }], 'STATED_BY_USER', 'TEMPORARY_TASK', 'Lets Q prepare interviews for this role without asking again.'),
  mem('mem_tobi_salary', 'ENTITY_KNOWLEDGE', 'person.p_tobi.salary_expectation', 'p_tobi', 'TEAM', 'Tobi expects about ₦2.2m a month.',
    [{ kind: 'DOCUMENT', ref: 'doc_scrape_0912', label: 'Third-party salary site', at: '2026-09-12T00:00:00Z' }], 'THIRD_PARTY_CLAIM', 'TEMPORARY_TASK', 'Inferred from an outside source; not confirmed by Tobi.', 'CONTESTED'),
  mem('mem_tobi_practice', 'ENTITY_KNOWLEDGE', 'person.p_tobi.practice.system_design', 'p_tobi', 'CANDIDATE_PRIVATE_PRACTICE', 'Tobi practised a system design interview twice this month.',
    [{ kind: 'ASSESSMENT', ref: 'att_tobi_sd_2', label: 'Tobi’s private practice', at: '2026-10-19T19:00:00Z' }], 'VERIFIED_FACT', 'CONFIRMED_PREFERENCE', 'Private to Tobi. Never visible to employers.'),
];

function mem(memory_id: string, layer: MemoryItem['layer'], memory_key: string, subject_id: string, visibility_scope: MemoryItem['visibility_scope'], content: string,
  source_refs: MemoryItem['source_refs'], truth_class: MemoryItem['truth_class'], retention_class: MemoryItem['retention_class'], importance_reason: string,
  evidence_status: MemoryItem['evidence_status'] = 'SUPPORTED'): MemoryItem {
  return {
    memory_id, layer, memory_key, subject_type: subject_id.startsWith('p_') ? 'PERSON' : subject_id.startsWith('m_') ? 'MANDATE' : 'ORGANIZATION', subject_id,
    tenant_id: 'org_kora', visibility_scope, owner_id: visibility_scope === 'CANDIDATE_PRIVATE_PRACTICE' ? 'p_tobi' : 'p_ada', content, structured_value: {}, source_refs,
    source_timestamp: source_refs[0].at, recorded_at: source_refs[0].at, last_confirmed_at: truth_class === 'STATED_BY_USER' ? source_refs[0].at : null,
    expires_at: retention_class === 'TEMPORARY_TASK' ? '2026-12-31T00:00:00Z' : null, retention_class, truth_class, evidence_status, lifecycle_status: 'active',
    write_mode: truth_class === 'STATED_BY_USER' ? 'USER_CONFIRMED' : truth_class === 'ORG_POLICY' ? 'ADMIN_VERIFIED' : 'DERIVED', importance_reason,
    confidence_basis: truth_class === 'THIRD_PARTY_CLAIM' ? 'Single outside source' : 'Direct source', consent_and_purpose: 'Hiring for roles at Kora Pay',
    supersedes_id: null, payload_schema_version: 1, retrieval_tags: memory_key.split('.'), encryption_class: 'STANDARD', delete_or_revoke_state: 'NONE',
  };
}

// ---- J7 personas ----
export type PersonaId = 'p_tobi' | 'p_amaka' | 'p_chidi';
export const PERSONAS: Record<PersonaId, { label: string; track: string; goal: CareerGoal; measures: J7Measures; gaps: RoleGap[]; path: { id: string; label: string; current?: boolean; target?: boolean }[] }> = {
  p_amaka: {
    label: 'Amaka · graduate', track: 'Graduate',
    goal: { goalId: 'g_amaka', targetRole: 'Product Analyst', roleFamily: 'Data and product', horizon: '3 months', preferences: { location: 'Lagos or remote', remote: true, salaryFloor: '₦450k' }, status: 'ACTIVE' },
    measures: {
      evidence_coverage: { covered: 6, total: 9 },
      competency_mastery: [{ competencyId: 'c_sql_window', level: null, rubricVersion: 'sql-2026.2', conditions: 'Not yet assessed', uncertainty: 'n/a' }, { competencyId: 'c_sheets', level: 3, rubricVersion: 'sheets-2026.1', conditions: 'Timed, 40 min, synthetic data', uncertainty: '±1 level' }],
      practice_progress: [{ competencyId: 'c_sheets', attempts: [{ at: '2026-10-02', level: 2 }, { at: '2026-10-16', level: 3 }], comparable: true }],
      role_fit: { mandateId: null, summary: 'PARTIAL' },
      readiness_to_apply: [{ item: 'CV states one quantified project', done: true }, { item: 'One SQL sample you are happy to share', done: false }, { item: 'Two practice interviews done', done: true }, { item: 'Stakeholder writing sample from this year', done: false }],
      growth_plan_adherence: { private: true, planned: 5, done: 3 },
    },
    gaps: [
      { competencyId: 'c_sql_window', state: 'NOT_EVIDENCED', why: 'Product Analyst roles in Lagos ask for SQL window functions in 7 of 10 listings. You have not shown it yet — that is different from not having it.', nextStep: 'A 40-minute practice task on cohort retention', minutes: 40 },
      { competencyId: 'c_writing', state: 'EVIDENCE_OUTDATED', why: 'Your writing sample is a 2024 class essay. Employers look for a recent product write-up.', nextStep: 'Rewrite your final-year project as a one-page product memo', minutes: 60 },
      { competencyId: 'c_experiment', state: 'REQUIREMENT_UNCLEAR', why: 'Only some listings mention A/B testing, and they define it differently.', nextStep: 'Q will check the next 5 listings you save', minutes: 0 },
    ],
    path: [{ id: 'n1', label: 'Economics graduate', current: true }, { id: 'n2', label: 'Junior data analyst' }, { id: 'n3', label: 'Product Analyst', target: true }, { id: 'n4', label: 'Growth analyst' }],
  },
  p_chidi: {
    label: 'Chidi · career switcher', track: 'Career switcher',
    goal: { goalId: 'g_chidi', targetRole: 'Sales Development Rep', roleFamily: 'Sales', horizon: '2 months', preferences: { location: 'Port Harcourt or remote', remote: true }, status: 'ACTIVE' },
    measures: {
      evidence_coverage: { covered: 4, total: 8 },
      competency_mastery: [{ competencyId: 'c_discovery', level: 2, rubricVersion: 'sales-2026.1', conditions: 'Role-play, text', uncertainty: '±1 level' }],
      practice_progress: [{ competencyId: 'c_discovery', attempts: [{ at: '2026-10-10', level: 1 }, { at: '2026-10-24', level: 2 }], comparable: true }],
      role_fit: { mandateId: null, summary: 'PARTIAL' },
      readiness_to_apply: [{ item: 'Store results reframed as sales outcomes', done: true }, { item: 'Cold-call role-play recorded', done: false }, { item: 'CRM basics', done: false }],
      growth_plan_adherence: { private: true, planned: 4, done: 2 },
    },
    gaps: [
      { competencyId: 'c_prospecting', state: 'NOT_EVIDENCED', why: 'Your store-lead work shows customer handling and targets, but not outbound prospecting.', nextStep: 'A 20-minute cold-call role-play with Q', minutes: 20 },
      { competencyId: 'c_crm', state: 'NOT_EVIDENCED', why: 'Most SDR roles use a CRM daily.', nextStep: 'A free 2-hour CRM basics module (external link)', minutes: 120 },
    ],
    path: [{ id: 'n1', label: 'Retail store lead', current: true }, { id: 'n2', label: 'Sales Development Rep', target: true }, { id: 'n3', label: 'Account Executive' }],
  },
  p_tobi: {
    label: 'Tobi · specialist', track: 'Specialist',
    goal: { goalId: 'g_tobi', targetRole: 'Staff Backend Engineer', roleFamily: 'Engineering', horizon: '12 months', preferences: { location: 'Lagos', remote: false }, status: 'ACTIVE' },
    measures: {
      evidence_coverage: { covered: 7, total: 10 },
      competency_mastery: [{ competencyId: 'c_sysdesign', level: 3, rubricVersion: 'eng-sd-2026.2', conditions: 'Practice interview, voice', uncertainty: '±1 level' }],
      practice_progress: [{ competencyId: 'c_sysdesign', attempts: [{ at: '2026-10-05', level: 2 }, { at: '2026-10-19', level: 3 }], comparable: true }],
      role_fit: { mandateId: 'm_backend', summary: 'STRONG' },
      readiness_to_apply: [{ item: 'Reconciliation project shared', done: true }, { item: 'Incident leadership example', done: false }],
      growth_plan_adherence: { private: true, planned: 3, done: 3 },
    },
    gaps: [
      { competencyId: 'c_oncall', state: 'NOT_EVIDENCED', why: 'Staff roles expect incident leadership. You mentioned leading one in conversation but have not shared anything.', nextStep: 'Write up the March outage as a blameless review', minutes: 45 },
    ],
    path: [{ id: 'n1', label: 'Backend engineer', current: true }, { id: 'n2', label: 'Senior Backend Engineer' }, { id: 'n3', label: 'Staff Backend Engineer', target: true }],
  },
};

// Structured values Q actually computes with. Correcting the memory changes them.
MEMORIES[0].structured_value = { earliestLocal: '10:00', preferMornings: true, protectedBlock: 'Tue 13:00–15:00' };
