// Direction D data. Extends the shared scenario (same people, mandate and evidence as A, B and C)
// with what D's larger views need: a 24-profile pool with screening outcomes, six screened people,
// interview availability, and J7's occupation atlas. Everything is fictional and simulated.
import { EVIDENCE, MANDATE, PEOPLE, FITS } from '../../mock/fixtures';
import { strength, type Strength } from '../shared/scenario';

export const REQS = MANDATE.requirements;
export const ROLE_TITLE = 'Senior Backend Engineer';

// ---------------- Pool: 24 profiles, each processed and given an outcome ----------------
/** Furthest screening stage each profile reached: 0 read · 1 basics fit · 2 must-have evidence · 3 all three must-haves. */
export const STAGES = [
  { id: 0, label: 'Read', plain: 'Profiles Q opened' },
  { id: 1, label: 'Basics fit', plain: 'Location, work mode and seniority match' },
  { id: 2, label: 'Must-have evidence', plain: 'Shows at least one must-have with evidence' },
  { id: 3, label: 'All three shown', plain: 'Evidence for every must-have' },
] as const;
export const SET_ASIDE = [
  { id: 'loc', label: 'Needs relocation the role can’t support', stage: 0, n: 4 },
  { id: 'senior', label: 'Fewer than 4 years in backend roles', stage: 0, n: 6 },
  { id: 'claims', label: 'Claims payments work, nothing to check yet', stage: 1, n: 5 },
  { id: 'stack', label: 'Payments work, but no Go or Postgres shown', stage: 1, n: 3 },
  { id: 'partial', label: 'Shows one or two must-haves, not all three', stage: 2, n: 3 },
] as const;
const named: Record<string, number> = { p_tobi: 3, p_ife: 3, p_kunle: 3, p_zara: 2, p_dayo: 2 };
export interface PoolEntry { id: string; name: string; reached: number; reason?: string; order: number }
export const POOL: PoolEntry[] = (() => {
  const out: PoolEntry[] = [];
  let k = 0;
  for (const [id, reached] of Object.entries(named)) out.push({ id, name: PEOPLE.find((p) => p.personId === id)!.name, reached, order: k++, reason: reached === 2 ? 'Shows one or two must-haves, not all three' : undefined });
  out.push({ id: 'p_musa', name: 'Musa Danjuma', reached: 2, order: k++, reason: 'Shows one or two must-haves, not all three' });
  for (const r of SET_ASIDE) {
    const left = r.id === 'partial' ? 0 : r.n; // the three "partial" people are named above
    for (let i = 0; i < left; i++) out.push({ id: `p_pool_${k}`, name: `Profile ${k + 1}`, reached: r.stage, reason: r.label, order: k++ });
  }
  return out; // 24
})();
/** 240-profile version for the scale demo: counts only, never 240 dots. */
export const POOL_LARGE = { read: 240, basics: 131, must: 38, all: 9 };

// ---------------- Six screened people (three shortlisted + three who reached evidence) ----------------
export interface DPerson { id: string; name: string; first: string; headline: string; states: Strength[]; notes: string[]; shortlist: boolean }
const fromFit = (pid: string) => FITS.find((f) => f.personId === pid)!;
const base = (pid: string, shortlist: boolean): DPerson => {
  const p = PEOPLE.find((x) => x.personId === pid)!;
  const f = fromFit(pid);
  return { id: pid, name: p.name, first: p.name.split(' ')[0], headline: p.headline, shortlist, states: REQS.map((r) => strength(f.byRequirement.find((b) => b.reqId === r.reqId)!.state)), notes: REQS.map((r) => f.byRequirement.find((b) => b.reqId === r.reqId)!.note) };
};
export const SIX: DPerson[] = [
  base('p_tobi', true), base('p_ife', true), base('p_kunle', true),
  { id: 'p_zara', name: 'Zara Mensah', first: 'Zara', headline: 'Backend engineer, logistics · 5 yrs', shortlist: false, states: ['none', 'full', 'full', 'partial', 'unclear'], notes: ['Logistics billing, not payments', 'Two services in production', 'Schema work on 200m-row table', 'Joined one rotation, did not lead', 'Mandate does not say what mentoring means here'] },
  { id: 'p_dayo', name: 'Dayo Lawal', first: 'Dayo', headline: 'Engineering lead, lending · 11 yrs', shortlist: false, states: ['full', 'none', 'partial', 'verified', 'unclear'], notes: ['Loan disbursement ledger', 'Team used Kotlin', 'Postgres work from 2022', 'Incident lead, reference confirms', 'Mandate does not say what mentoring means here'] },
  { id: 'p_musa', name: 'Musa Danjuma', first: 'Musa', headline: 'Backend engineer, remittances · 6 yrs', shortlist: false, states: ['full', 'partial', 'none', 'none', 'unclear'], notes: ['Remittance settlement jobs', 'Go side project, 2023', 'Nothing shared', 'Not mentioned', 'Mandate does not say what mentoring means here'] },
];
export const mustShown = (p: DPerson) => REQS.filter((r, i) => r.mustHave && (p.states[i] === 'verified' || p.states[i] === 'full')).length;
export const MUST_TOTAL = REQS.filter((r) => r.mustHave).length;

/** Q's margin note per requirement row (what the row means for the decision). */
export const ROW_NOTES: Record<string, string> = {
  r1: 'Only Tobi’s is verified, and it is the hardest part of the job.',
  r2: 'Ifeoma’s is confirmed by a reference; Tobi’s is a library.',
  r3: 'Tobi’s tuning exercise is timed and verified.',
  r4: 'Only Ifeoma has shown it. Ask the others.',
  r5: 'The mandate doesn’t define mentoring. Ask the hiring manager.',
};
/** The same notes when all six are shown: what is true of three is not always true of six. */
export const ROW_NOTES_SIX: Record<string, string> = {
  r1: 'Still only Tobi’s is verified. Dayo and Musa show it unverified.',
  r2: 'Ifeoma’s is verified; Tobi and Zara show it unverified.',
  r3: 'Tobi’s is verified; four others show it unverified or partly.',
  r4: 'Dayo’s is verified, Ifeoma’s evidenced. Ask the other four.',
  r5: 'The mandate doesn’t define mentoring. Ask the hiring manager.',
};

// ---------------- Technical evidence ----------------
export interface DEvidence { id: string; owner: string; title: string; kind: string; source: string; observed: string; outcome: 'verified' | 'self-reported' | 'outdated'; shows: string; limits: string; reqs: string[] }
const KIND: Record<string, string> = { PROJECT: 'Project', WORK_SAMPLE: 'Work sample', ASSESSMENT: 'Assessment', CREDENTIAL: 'Credential', EMPLOYMENT: 'Employment' };
const REQ_OF: Record<string, string[]> = { e_tobi_recon: ['r1'], e_tobi_go: ['r2'], e_tobi_pg: ['r3'], e_ife_platform: ['r1', 'r2', 'r3'], e_ife_oncall: ['r4'], e_kunle_api: ['r1', 'r3'] };
export const DEVIDENCE: DEvidence[] = EVIDENCE.filter((e) => REQ_OF[e.evidenceId]).map((e) => ({
  id: e.evidenceId, owner: e.ownerId, title: e.title, kind: KIND[e.kind] ?? e.kind, source: e.source, observed: e.observedAt,
  outcome: e.observedAt < '2025-01-01' ? 'outdated' : e.verified ? 'verified' : 'self-reported', shows: e.shows, limits: e.limits, reqs: REQ_OF[e.evidenceId],
}));
DEVIDENCE.push({ id: 'e_tobi_review', owner: 'p_tobi', title: 'Code review of a settlement retry PR', kind: 'Work sample', source: 'Shared repository snapshot', observed: '2026-09-02', outcome: 'self-reported', shows: 'Explains why retries must be idempotent and how the PR enforces it.', limits: 'One review; reviewer’s context not visible.', reqs: ['r1', 'r2'] });

// ---------------- Interviews ----------------
export const DAYS = ['Mon 2', 'Tue 3', 'Wed 4', 'Thu 5', 'Fri 6'];
export const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
export const BUSY = [
  { d: 0, s: 9, e: 10.5, l: 'Stand-up + 1:1' }, { d: 0, s: 14, e: 15, l: 'Hiring sync' },
  { d: 1, s: 10, e: 11, l: 'Kora all-hands' }, { d: 2, s: 11, e: 12.5, l: 'Panel prep' },
  { d: 3, s: 9, e: 10, l: 'Stand-up' }, { d: 3, s: 15, e: 16.5, l: 'Offer review' }, { d: 4, s: 13, e: 14, l: 'Lunch' },
];
export const RULES = [{ d: -1, s: 9, e: 10, l: 'No calls before 10' }, { d: 1, s: 13, e: 15, l: 'Tuesday review, kept clear' }];
export const SLOTS = [
  { pid: 'p_tobi', d: 1, s: 11, e: 12, why: 'Earliest slot after 10 that avoids Tuesday review; Tobi prefers mornings.' },
  { pid: 'p_ife', d: 2, s: 14, e: 15, why: 'Ifeoma is in the same time zone; afternoon keeps your Wednesday morning for panel prep.' },
  { pid: 'p_kunle', d: 3, s: 11, e: 12, why: 'Kunle is in Nairobi (+2h): 11:00 here is 13:00 for him.' },
];

// ---------------- J7 occupation atlas (Amaka) ----------------
export type CState = 'verified' | 'full' | 'partial' | 'practice' | 'none' | 'unclear';
export interface Comp { id: string; label: string; plain: string; state: CState; evidence?: { title: string; cls: string; proves: string; notProves: string } }
export const COMPS: Comp[] = [
  { id: 'sheets', label: 'Spreadsheet modelling', plain: 'Models that answer a business question', state: 'verified', evidence: { title: 'Business modelling course certificate', cls: 'Verified credential', proves: 'You passed a graded modelling course; the issuer confirmed it (simulated).', notProves: 'That you have modelled real business data at work.' } },
  { id: 'story', label: 'Dashboard storytelling', plain: 'Turning numbers into a decision', state: 'full', evidence: { title: 'Enugu market-prices dashboard', cls: 'Assessed by rubric and reviewer', proves: 'You built a dashboard that leads to one clear decision; a reviewer scored it 3 of 4.', notProves: 'That a team used it to make that decision.' } },
  { id: 'stats', label: 'Statistics fundamentals', plain: 'Sampling, significance, confidence', state: 'full', evidence: { title: 'Econometrics coursework (degree transcript)', cls: 'Verified credential', proves: 'You passed graded statistics modules.', notProves: 'Applying them to product data.' } },
  { id: 'stake', label: 'Stakeholder conversations', plain: 'Asking what a team really needs', state: 'full', evidence: { title: 'Student union budget interviews', cls: 'Assessed by rubric and reviewer', proves: 'Notes from 6 interviews and the decision they led to; a reviewer scored them 2 of 4.', notProves: 'Conversations inside a product team.' } },
  { id: 'writing', label: 'Product writing', plain: 'A one-page memo a manager can act on', state: 'partial', evidence: { title: 'Thesis summary, 2024', cls: 'Work sample submitted', proves: 'You can write a clear argument.', notProves: 'Not reviewed, two years old, and academic rather than a product memo.' } },
  { id: 'sql', label: 'SQL window functions', plain: 'Comparing each row with the ones before it', state: 'none' },
  { id: 'exp', label: 'Experiment design', plain: 'Testing a change fairly', state: 'unclear' },
  { id: 'python', label: 'Python for analysis', plain: 'Cleaning and analysing data in code', state: 'none' },
  { id: 'research', label: 'User research', plain: 'Learning from the people who use a product', state: 'none' },
  { id: 'forecast', label: 'Forecasting', plain: 'Projecting demand or revenue', state: 'partial', evidence: { title: 'Price forecast in thesis, 2024', cls: 'Work sample submitted', proves: 'A simple time-series forecast.', notProves: 'Recent or production forecasting.' } },
  { id: 'process', label: 'Process mapping', plain: 'Drawing how work actually flows', state: 'none' },
  { id: 'accounting', label: 'Accounting basics', plain: 'Reading a P&L and a balance sheet', state: 'none' },
];
export const shown = (s: CState) => s === 'verified' || s === 'full';

export const FAMILIES = ['Data', 'Product', 'Growth', 'Operations', 'Finance'] as const;
export type Family = (typeof FAMILIES)[number];
export interface Occ { id: string; label: string; short: string; family: Family; needs: string[]; demand?: string; extra?: boolean }
export const OCCS: Occ[] = [
  { id: 'jda', label: 'Junior Data Analyst', short: 'Jr Data Analyst', family: 'Data', needs: ['sheets', 'story', 'sql', 'stats'], demand: '9 of the 10 listings you saved ask for SQL' },
  { id: 'da', label: 'Data Analyst', short: 'Data Analyst', family: 'Data', needs: ['sql', 'stats', 'story', 'python'] },
  { id: 'ae', label: 'Analytics Engineer', short: 'Analytics Eng.', family: 'Data', needs: ['sql', 'python', 'writing'] },
  { id: 'ds', label: 'Data Scientist', short: 'Data Scientist', family: 'Data', needs: ['python', 'stats', 'exp', 'sql'] },
  { id: 'pa', label: 'Product Analyst', short: 'Product Analyst', family: 'Product', needs: ['sql', 'story', 'stake', 'writing', 'exp'], demand: '7 of the 10 listings you saved ask for SQL' },
  { id: 'apm', label: 'Associate Product Manager', short: 'Assoc. PM', family: 'Product', needs: ['stake', 'writing', 'research', 'exp'] },
  { id: 'uxr', label: 'UX Researcher', short: 'UX Researcher', family: 'Product', needs: ['research', 'stake', 'writing', 'stats'] },
  { id: 'ga', label: 'Growth Analyst', short: 'Growth Analyst', family: 'Growth', needs: ['sql', 'exp', 'story', 'stats'] },
  { id: 'ma', label: 'Marketing Analyst', short: 'Marketing Analyst', family: 'Growth', needs: ['sheets', 'story', 'stats', 'sql'] },
  { id: 'oa', label: 'Operations Analyst', short: 'Ops Analyst', family: 'Operations', needs: ['sheets', 'process', 'stake'] },
  { id: 'sp', label: 'Supply Planner', short: 'Supply Planner', family: 'Operations', needs: ['forecast', 'sheets', 'process'] },
  { id: 'fpa', label: 'FP&A Analyst', short: 'FP&A Analyst', family: 'Finance', needs: ['sheets', 'forecast', 'accounting', 'story'] },
  { id: 'fa', label: 'Financial Analyst', short: 'Financial Analyst', family: 'Finance', needs: ['sheets', 'accounting', 'writing'] },
  { id: 'cra', label: 'Credit Risk Analyst', short: 'Credit Risk', family: 'Finance', needs: ['stats', 'sql', 'python', 'accounting'] },
];
/** Scale demo: 34 more occupations so the atlas has 48. Illustrative, generated deterministically. */
const EXTRA_NAMES: Record<Family, string[]> = {
  Data: ['BI Developer', 'Data Quality Analyst', 'Reporting Analyst', 'ML Engineer', 'Data Engineer', 'Insights Analyst', 'Research Analyst', 'Statistician'],
  Product: ['Product Ops Associate', 'Product Manager', 'Service Designer', 'Content Designer', 'Technical PM', 'Product Marketing Assoc.', 'Product Designer'],
  Growth: ['CRM Analyst', 'Pricing Analyst', 'SEO Analyst', 'Lifecycle Marketer', 'Performance Marketer', 'Market Researcher'],
  Operations: ['Logistics Analyst', 'Procurement Analyst', 'Business Analyst', 'Project Coordinator', 'Quality Analyst', 'Ops Associate'],
  Finance: ['Treasury Analyst', 'Audit Associate', 'Investment Analyst', 'Revenue Analyst', 'Payroll Analyst', 'Tax Associate', 'Budget Analyst'],
};
const POOL_SKILLS = ['sql', 'python', 'stats', 'research', 'accounting', 'forecast', 'process', 'exp', 'writing', 'sheets', 'story', 'stake'];
export const OCCS_EXTRA: Occ[] = FAMILIES.flatMap((f) => EXTRA_NAMES[f].map((n, i) => {
  const seed = (n.length * 7 + i * 3) % POOL_SKILLS.length;
  const needs = Array.from(new Set([POOL_SKILLS[seed], POOL_SKILLS[(seed + 3) % 12], POOL_SKILLS[(seed + 5) % 12], POOL_SKILLS[(seed + 8) % 12]]));
  return { id: `x_${f}_${i}`, label: n, short: n, family: f, needs, extra: true };
}));
export const gapsOf = (o: Occ, state: (id: string) => CState) => o.needs.filter((n) => !shown(state(n)));
export const compById = (id: string) => COMPS.find((c) => c.id === id)!;
