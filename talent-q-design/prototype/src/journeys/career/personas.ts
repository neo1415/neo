// J7 data for three journeys: a graduate with no work history (Amaka, T1), a career switcher from sales
// into product or business analysis (Chidi, T2) and an experienced engineer (Tobi). People, roles,
// reviewers and listing counts are fictional; demand lines are illustrative.
// Evidence model (the only way a competency's state changes):
//   practice attempt          private; never changes state beyond "practising"; never moves the atlas
//   work sample submitted     counts as partial until reviewed
//   assessed (rubric+review)  counts as evidenced; moves the atlas
//   verified credential       issuer-confirmed; counts as verified
// A competency someone has only MENTIONED (CV line, conversation) stays "unclear": a claim, not evidence.
import { OCCS as GRAD_OCCS, OCCS_EXTRA as GRAD_EXTRA, type CState, type Occ } from '../../directions/d/data';

export type { CState };
export interface Comp {
  id: string; label: string; plain: string; state: CState;
  evidence?: { title: string; cls: string; proves: string; notProves: string };
  /** Passport item this competency transfers from (e.g. verified sales employment). */
  from?: string;
  /** Words that mean the person has mentioned this competency (claims only, never evidence). */
  kws?: string[];
  /** Why the competency matters for the goals it appears in, in Q's words. */
  why?: string;
}
export interface JOcc { id: string; label: string; short: string; family: string; needs: string[]; demand?: string; extra?: boolean; aliases?: string[] }
export type RecClass = 'Practice attempt' | 'Work sample submitted' | 'Assessed by rubric and reviewer' | 'Verified credential';
export interface Rec { id: string; at: string; comp: string; cls: RecClass; why: string; not: string; moved?: string; level?: number }
export interface Practice {
  comp: string; question: string;
  options: { id: string; text: string; code?: boolean; verdict: 'right' | 'partial' | 'wrong'; kws: string[] }[];
  feedback: Record<'right' | 'partial' | 'wrong', string>;
}
export interface Sample {
  comp: string; title: string; minutes: number; proves: string; not: string;
  /** First review and the improved resubmission (reassessment). */
  first: { level: number; rubric: { c: string; ok: boolean }[]; advice: string };
  improved: { level: number; rubric: { c: string; ok: boolean }[] };
}
export type StepKind = 'Practice' | 'Work sample' | 'Learning' | 'Conversation' | 'Credential';
export interface PlanStep { id: string; comp: string; title: string; kind: StepKind; minutes: number; why: string; goals: string[]; dueIn: number; due?: string; done?: boolean; doneAt?: string; progress?: number; note?: string; resource?: string }
export interface Persona {
  id: 'graduate' | 'switcher' | 'experienced'; name: string; first: string; line: string; goal: string; horizon: string;
  comps: Comp[]; occs: JOcc[]; extra: JOcc[]; families: string[];
  practices: Practice[]; samples: Sample[]; record: Rec[];
  /** Every step Q can put in a plan, tagged with the goals it serves (shared steps keep progress across goals). */
  steps: PlanStep[];
  /** Real listings in the world (w.jobs) for an occupation. */
  jobs: Record<string, string[]>;
  progress: { comp: string; points: { at: string; level: number; cls: 'assessed' | 'practice' }[] }[];
}

const toJ = (o: Occ): JOcc => ({ ...o });

const GRAD_COMPS: Comp[] = [
  { id: 'sheets', label: 'Spreadsheet modelling', plain: 'Models that answer a business question', state: 'none', kws: ['excel', 'spreadsheet', 'google sheets', 'sheets', 'pivot'] },
  { id: 'story', label: 'Dashboard storytelling', plain: 'Turning numbers into a decision', state: 'none', kws: ['dashboard', 'chart', 'power bi', 'presentation', 'powerpoint'] },
  { id: 'stats', label: 'Statistics fundamentals', plain: 'Sampling, significance, confidence', state: 'none', kws: ['statistic', 'econometric', 'regression', 'spss', 'stata', 'analysed', 'analyzed', 'economics'] },
  { id: 'stake', label: 'Stakeholder conversations', plain: 'Asking what a team really needs', state: 'none', kws: ['interviewed', 'committee', 'meeting', 'organised', 'organized'] },
  { id: 'writing', label: 'Product writing', plain: 'A one-page memo a manager can act on', state: 'none', kws: ['report', 'wrote', 'essay', 'thesis', 'write-up', 'memo'] },
  { id: 'sql', label: 'SQL window functions', plain: 'Comparing each row with the ones before it', state: 'none', kws: ['sql'] },
  { id: 'exp', label: 'Experiment design', plain: 'Testing a change fairly', state: 'none', kws: ['experiment', 'a b test'] },
  { id: 'python', label: 'Python for analysis', plain: 'Cleaning and analysing data in code', state: 'none', kws: ['python'] },
  { id: 'research', label: 'User research', plain: 'Learning from the people who use a product', state: 'none', kws: ['survey', 'questionnaire', 'interview'] },
  { id: 'forecast', label: 'Forecasting', plain: 'Projecting demand or revenue', state: 'none', kws: ['forecast', 'projection'] },
  { id: 'process', label: 'Process mapping', plain: 'Drawing how work actually flows', state: 'none', kws: ['process', 'workflow', 'flowchart'] },
  { id: 'accounting', label: 'Accounting basics', plain: 'Reading a P&L and a balance sheet', state: 'none', kws: ['budget', 'accounts', 'bookkeeping', 'treasurer'] },
];

export const PERSONAS: Record<Persona['id'], Persona> = {
  graduate: {
    id: 'graduate', name: 'Amaka Eze', first: 'Amaka', line: 'Economics graduate · Enugu', goal: 'oa', horizon: '3 months',
    comps: GRAD_COMPS, occs: GRAD_OCCS.map(toJ), extra: GRAD_EXTRA.map(toJ), families: ['Data', 'Product', 'Growth', 'Operations', 'Finance'],
    practices: [{
      comp: 'sheets', question: 'A shop owner asks: “Which product made me the most money last month?” Your sheet has every sale with product, price and quantity. What do you do first?',
      options: [{ id: 'a', text: 'Sort by price and read the top row', verdict: 'wrong', kws: ['sort', 'price', 'top row'] }, { id: 'b', text: 'Add a revenue column (price × quantity), then total it by product with a pivot table', verdict: 'right', kws: ['revenue', 'pivot', 'total', 'multiply', 'quantity'] }, { id: 'c', text: 'Count how many times each product appears', verdict: 'partial', kws: ['count', 'how many times'] }],
      feedback: { right: 'Right approach: money is price times quantity, totalled per product.', partial: 'Counting sales tells you what sold most often, not what made the most money.', wrong: 'The most expensive item isn’t necessarily the one that made the most money.' },
    }, {
      comp: 'sql', question: 'For each user, how many days passed between their first and second session?',
      options: [{ id: 'a', text: 'Sort by date and subtract the first two rows', verdict: 'partial', kws: ['sort', 'subtract'] }, { id: 'b', text: 'LAG(started_at) OVER (PARTITION BY user_id ORDER BY started_at)', code: true, verdict: 'right', kws: ['lag', 'partition'] }, { id: 'c', text: 'GROUP BY user_id and take MAX minus MIN', verdict: 'wrong', kws: ['group by', 'max', 'min'] }],
      feedback: { right: 'Right technique. LAG compares each session with the one before it, per user.', partial: 'Close, but sorting the whole table mixes users together. Partition by user first.', wrong: 'MAX minus MIN gives first-to-last, not first-to-second.' },
    }],
    samples: [{
      comp: 'sheets', title: 'Market-survey spreadsheet (from your final-year project)', minutes: 45, proves: 'You can build a sheet that answers one business question and explain it.', not: 'Modelling a real company’s data at work.',
      first: { level: 2, rubric: [{ c: 'Data is clean and labelled', ok: true }, { c: 'Answers one clear question', ok: true }, { c: 'Calculations are checkable', ok: false }, { c: 'Explains what the number means', ok: true }], advice: 'Show your formulas, or add a note on how each total is calculated.' },
      improved: { level: 3, rubric: [{ c: 'Data is clean and labelled', ok: true }, { c: 'Answers one clear question', ok: true }, { c: 'Calculations are checkable', ok: true }, { c: 'Explains what the number means', ok: true }] },
    }],
    record: [],
    steps: [
      { id: 'g1', comp: 'sheets', title: 'Practise one spreadsheet question', kind: 'Practice', minutes: 10, why: 'Most entry-level analyst listings ask for spreadsheets.', goals: ['oa', 'jda', 'pa', 'ma', 'fpa', 'fa', 'sp'], dueIn: 3 },
      { id: 'g2', comp: 'sheets', title: 'Submit your market-survey spreadsheet for review', kind: 'Work sample', minutes: 45, why: 'Reviewed work is what moves your map. You already have the project.', goals: ['oa', 'jda', 'ma', 'fpa', 'fa', 'sp'], dueIn: 7 },
      { id: 'g3', comp: 'process', title: 'Free course: process mapping basics (external, about 2 hours)', kind: 'Learning', minutes: 120, why: 'Operations analyst listings ask for it; nothing you’ve mentioned covers it yet.', goals: ['oa', 'sp'], dueIn: 14, resource: 'Process mapping basics · free · about 2 hours (external, illustrative)' },
      { id: 'g4', comp: 'stake', title: 'Write up how you ran the treasurer role: who you spoke to and what changed', kind: 'Work sample', minutes: 40, why: 'You mentioned committee work; a short write-up turns it into something a reviewer can check.', goals: ['oa', 'apm', 'pa', 'uxr'], dueIn: 10 },
      { id: 'g5', comp: 'sql', title: 'Practise SQL window functions', kind: 'Practice', minutes: 20, why: 'Data and product analyst listings ask for SQL.', goals: ['jda', 'pa', 'da', 'ga', 'ma'], dueIn: 5 },
    ],
    jobs: { oa: ['j_medlink_ba', 'j_ta_grad_ops'], pa: ['j_tinda_pa'], jda: ['j_kora_data', 'j_ta_grad_data'], da: ['j_kora_data'], apm: ['j_tinda_apm'] },
    progress: [],
  },
  switcher: {
    id: 'switcher', name: 'Chidi Nwosu', first: 'Chidi', line: 'Sales executive → product or business analysis · Port Harcourt', goal: 'apm', horizon: '4 months',
    comps: [
      { id: 'stake', label: 'Stakeholder conversations', plain: 'Finding out what a team or customer really needs', state: 'partial', from: 'e_chidi_sales', kws: ['stakeholder', 'accounts', 'clients', 'customers'],
        evidence: { title: 'Sales executive, Bole Distributors (employer letter)', cls: 'Transferable from verified work', proves: 'You have managed 40 retail accounts since 2021 (employer-confirmed, simulated).', notProves: 'Running conversations to learn what people need without selling to them.' },
        why: 'Both product and analyst roles spend much of the week asking people what they need.' },
      { id: 'numbers', label: 'Working with numbers and targets', plain: 'Planning against a number and explaining it', state: 'verified', from: 'e_chidi_sales', kws: ['target', 'revenue', 'numbers'],
        evidence: { title: 'Sales executive, Bole Distributors (employer letter)', cls: 'Verified credential', proves: 'Region revenue grew 18% on your accounts (employer-confirmed, simulated).', notProves: 'Building the analysis or model yourself.' },
        why: 'Analysts and product people are judged on numbers they can explain.' },
      { id: 'discovery', label: 'Customer discovery', plain: 'Asking questions that uncover the real problem', state: 'partial', from: 'e_chidi_sales', kws: ['discovery', 'questions', 'objection'],
        evidence: { title: 'Sales executive, Bole Distributors (employer letter)', cls: 'Transferable from verified work', proves: 'Selling to 40 accounts needs open questions about their problems.', notProves: 'Not assessed outside a sales conversation.' },
        why: 'Customer-facing product work starts from the real problem.' },
      { id: 'process', label: 'Process mapping', plain: 'Drawing how work actually flows, and where time is lost', state: 'none', kws: ['process', 'flow', 'map'],
        why: 'Business analyst listings, Medlink’s included, ask for it first. Nothing in your record shows it yet.' },
      { id: 'sheets', label: 'Spreadsheet modelling', plain: 'A model that answers a business question', state: 'unclear', kws: ['excel', 'spreadsheet', 'sheets', 'tracker', 'model'],
        why: 'Analysts build models to answer questions. Your sales evidence shows results, not the model behind them.' },
      { id: 'req', label: 'Requirements writing', plain: 'Turning a need into something a team can build', state: 'none', kws: ['requirements', 'user stor', 'spec'],
        why: 'Business analysts hand clear requirements to the people who build.' },
      { id: 'writing', label: 'Product writing', plain: 'A one-page brief a team can act on', state: 'none', kws: ['brief', 'writing', 'write', 'memo'],
        why: 'Associate PM listings, Tinda’s included, ask for product writing.' },
      { id: 'research', label: 'User research', plain: 'Learning from users without selling to them', state: 'none', kws: ['research', 'interview', 'user'],
        why: 'Talking to customers to sell is different from talking to them to learn. Associate PM listings ask for the second.' },
      { id: 'sql', label: 'Data querying (SQL)', plain: 'Getting answers from a database', state: 'none', kws: ['sql', 'query', 'database'],
        why: 'Product analyst roles query data themselves.' },
    ],
    occs: [
      { id: 'apm', label: 'Associate Product Manager', short: 'Assoc. PM', family: 'Product', needs: ['stake', 'writing', 'research', 'sheets'], demand: 'Tinda’s listing asks for stakeholder conversations, product writing and user research', aliases: ['associate product manager', 'product manager', 'apm', 'pm', 'product management'] },
      { id: 'pa', label: 'Product Analyst', short: 'Product Analyst', family: 'Product', needs: ['sql', 'sheets', 'writing', 'numbers'], aliases: ['product analyst'] },
      { id: 'pmm', label: 'Product Marketing Associate', short: 'Product Mktg', family: 'Product', needs: ['writing', 'discovery', 'research'], aliases: ['product marketing'] },
      { id: 'ba', label: 'Business Analyst', short: 'Business Analyst', family: 'Analysis', needs: ['process', 'sheets', 'stake', 'req'], demand: 'Medlink’s listing asks for process mapping, spreadsheet modelling and stakeholder conversations', aliases: ['business analyst', 'business analysis', 'ba', 'analyst'] },
      { id: 'oa', label: 'Operations Analyst', short: 'Ops Analyst', family: 'Analysis', needs: ['process', 'sheets', 'numbers'], aliases: ['operations analyst', 'ops analyst'] },
      { id: 'sops', label: 'Sales Operations Analyst', short: 'Sales Ops', family: 'Analysis', needs: ['sheets', 'numbers', 'process'], aliases: ['sales operations', 'sales ops'] },
      { id: 'csm', label: 'Customer Success Manager', short: 'Customer Success', family: 'Customer', needs: ['stake', 'discovery', 'numbers'], aliases: ['customer success'] },
      { id: 'ae', label: 'Account Executive', short: 'Account Exec', family: 'Sales', needs: ['discovery', 'numbers', 'stake'], aliases: ['account executive', 'sales'] },
    ],
    extra: [], families: ['Product', 'Analysis', 'Customer', 'Sales'],
    practices: [{
      comp: 'process', question: 'Patients at a Medlink clinic wait 40 minutes at reception. Before suggesting any fix, what do you do first?',
      options: [{ id: 'a', text: 'Recommend an online booking app', verdict: 'wrong', kws: ['app', 'booking', 'recommend'] }, { id: 'b', text: 'Map each step from arrival to seeing a nurse, with who does it and where the time goes', verdict: 'right', kws: ['map', 'each step', 'steps', 'where the time', 'arrival'] }, { id: 'c', text: 'Survey patients about how satisfied they are', verdict: 'partial', kws: ['survey', 'satisfied', 'satisfaction'] }],
      feedback: { right: 'Right order: see how the work really flows and where time is lost, before choosing a fix.', partial: 'Useful later, but satisfaction scores won’t show you where the 40 minutes go.', wrong: 'That jumps to a solution before you know the cause. The delay might not be booking at all.' },
    }, {
      comp: 'writing', question: 'You have one page to propose a reorder feature for shop owners. What goes first?',
      options: [{ id: 'a', text: 'The problem, who has it and how you know', verdict: 'right', kws: ['problem', 'who has it', 'how you know'] }, { id: 'b', text: 'The list of features', verdict: 'wrong', kws: ['features', 'list'] }, { id: 'c', text: 'The launch date', verdict: 'partial', kws: ['launch', 'date'] }],
      feedback: { right: 'Yes: lead with the problem and your evidence for it.', partial: 'Dates matter, but a reader needs the problem first.', wrong: 'Features without a problem are hard to judge.' },
    }],
    samples: [{
      comp: 'process', title: 'Process map: Bole Distributors, order to delivery', minutes: 60, proves: 'You can map a real process, mark hand-offs and find where time is lost.', not: 'Running a change project, or mapping in a team you don’t know.',
      first: { level: 2, rubric: [{ c: 'Shows every step from order to delivery', ok: true }, { c: 'Marks hand-offs between teams', ok: true }, { c: 'Measures where time is lost', ok: false }, { c: 'Proposes one change and its effect', ok: false }], advice: 'Add how long each step takes (even rough minutes), then propose one change and what it would save.' },
      improved: { level: 3, rubric: [{ c: 'Shows every step from order to delivery', ok: true }, { c: 'Marks hand-offs between teams', ok: true }, { c: 'Measures where time is lost', ok: true }, { c: 'Proposes one change and its effect', ok: true }] },
    }, {
      comp: 'writing', title: 'One-page product brief: reorder reminders for shop owners', minutes: 60, proves: 'You can write a brief that starts from a real problem.', not: 'Shipping a product with a team.',
      first: { level: 2, rubric: [{ c: 'States the problem and who has it', ok: true }, { c: 'Shows evidence for the problem', ok: false }, { c: 'Defines what success looks like', ok: true }, { c: 'Fits on one page', ok: true }], advice: 'Add two or three facts from your accounts that show the problem is real.' },
      improved: { level: 3, rubric: [{ c: 'States the problem and who has it', ok: true }, { c: 'Shows evidence for the problem', ok: true }, { c: 'Defines what success looks like', ok: true }, { c: 'Fits on one page', ok: true }] },
    }],
    record: [
      { id: 'r1', at: '2026-09-01', comp: 'numbers', cls: 'Verified credential', why: 'Bole Distributors confirmed your role, 40 accounts and 18% regional growth (employer letter, simulated).', not: 'Product or analysis work.' },
    ],
    steps: [
      { id: 'c1', comp: 'stake', title: 'Rewrite two sales calls as discovery notes: what they needed, not what you sold', kind: 'Practice', minutes: 30, why: 'Turns your strongest transferable skill into the kind both goals ask for.', goals: ['apm', 'ba', 'pmm', 'csm'], dueIn: 4 },
      { id: 'c2', comp: 'sheets', title: 'Spreadsheet modelling for analysts (free course, external, about 3 hours)', kind: 'Learning', minutes: 180, why: 'Your evidence shows results, not the model behind them.', goals: ['apm', 'ba', 'pa', 'oa', 'sops'], dueIn: 10, resource: 'Spreadsheet modelling for analysts · free · about 3 hours (external, illustrative)' },
      { id: 'c3', comp: 'writing', title: 'Write a one-page product brief for a reorder-reminder idea', kind: 'Work sample', minutes: 60, why: 'Tinda’s Associate PM listing asks for product writing; you have none on record.', goals: ['apm', 'pmm', 'pa'], dueIn: 8 },
      { id: 'c4', comp: 'research', title: 'Interview three shop owners without selling; write what you learnt', kind: 'Work sample', minutes: 90, why: 'Learning without selling is the part sales doesn’t show.', goals: ['apm', 'pmm'], dueIn: 14 },
      { id: 'c5', comp: 'process', title: 'Practise process mapping (one question)', kind: 'Practice', minutes: 10, why: 'A quick private check before the real sample.', goals: ['ba', 'oa', 'sops'], dueIn: 3 },
      { id: 'c6', comp: 'process', title: 'Map Bole’s order-to-delivery process and mark where time is lost', kind: 'Work sample', minutes: 60, why: 'Medlink’s listing asks for process mapping first. A reviewed map is evidence.', goals: ['ba', 'oa', 'sops'], dueIn: 7 },
      { id: 'c7', comp: 'req', title: 'Write requirements for one fix from your process map', kind: 'Work sample', minutes: 45, why: 'Analysts hand clear requirements to the people who build.', goals: ['ba'], dueIn: 14 },
      { id: 'c8', comp: 'process', title: 'Free course: process mapping basics (external, about 2 hours)', kind: 'Learning', minutes: 120, why: 'A short grounding before your first map.', goals: ['ba', 'oa'], dueIn: 5, resource: 'Process mapping basics · free · about 2 hours (external, illustrative)' },
    ],
    jobs: { apm: ['j_tinda_apm'], ba: ['j_medlink_ba'], pa: ['j_tinda_pa'], oa: ['j_medlink_ba'] },
    progress: [],
  },
  experienced: {
    id: 'experienced', name: 'Tobi Adeyemi', first: 'Tobi', line: 'Backend engineer · 7 years · Lagos', goal: 'staff', horizon: '12 months',
    comps: [
      { id: 'recon', label: 'Payments reconciliation', plain: 'Matching money to the ledger at scale', state: 'verified', evidence: { title: 'Reconciliation service snapshot', cls: 'Verified credential', proves: 'You designed the 4m-a-day settlement match (verified repository snapshot).', notProves: 'Production metrics, which are self-reported.' } },
      { id: 'pg', label: 'Postgres performance', plain: 'Fixing slow queries on large tables', state: 'full', evidence: { title: 'Query tuning exercise', cls: 'Assessed by rubric and reviewer', proves: '9s → 140ms on a timed exercise.', notProves: 'Tuning under live load.' } },
      { id: 'go', label: 'Go services', plain: 'Writing and running Go under load', state: 'full', evidence: { title: 'Idempotency library review', cls: 'Assessed by rubric and reviewer', proves: 'Idiomatic, tested Go.', notProves: 'A service under load.' } },
      { id: 'sysd', label: 'System design', plain: 'Designing for failure and scale', state: 'full', evidence: { title: 'Practice interview, assessed', cls: 'Assessed by rubric and reviewer', proves: 'Level 3 of 4 on a voice design interview.', notProves: 'Org-wide architecture decisions.' } },
      { id: 'incident', label: 'Incident leadership', plain: 'Leading from page to post-mortem', state: 'none', kws: ['incident', 'outage', 'on-call'] },
      { id: 'writing', label: 'Technical writing', plain: 'Design docs others act on', state: 'partial', evidence: { title: 'RFC draft, 2023', cls: 'Work sample submitted', proves: 'You can structure a design doc.', notProves: 'Unreviewed and three years old.' } },
      { id: 'dist', label: 'Distributed systems', plain: 'Consistency, retries, partitions', state: 'partial', evidence: { title: 'Retry PR review', cls: 'Work sample submitted', proves: 'You reason about idempotent retries.', notProves: 'Not reviewed yet.' } },
      { id: 'mentor', label: 'Mentoring', plain: 'Helping others grow', state: 'unclear' },
      { id: 'roadmap', label: 'Technical strategy', plain: 'Shaping a team’s roadmap', state: 'none' },
    ],
    occs: [
      { id: 'senior', label: 'Senior Backend Engineer', short: 'Senior Backend', family: 'Backend', needs: ['go', 'pg', 'sysd'] },
      { id: 'staff', label: 'Staff Backend Engineer', short: 'Staff Backend', family: 'Backend', needs: ['sysd', 'incident', 'writing', 'dist', 'mentor'], demand: 'Staff listings you saved all ask for incident leadership' },
      { id: 'payarch', label: 'Payments Architect', short: 'Payments Architect', family: 'Backend', needs: ['recon', 'dist', 'writing', 'sysd'] },
      { id: 'platform', label: 'Platform Engineer', short: 'Platform', family: 'Platform', needs: ['go', 'dist', 'incident'] },
      { id: 'sre', label: 'Site Reliability Engineer', short: 'SRE', family: 'Platform', needs: ['incident', 'dist', 'go', 'writing'] },
      { id: 'data', label: 'Data Engineer', short: 'Data Eng.', family: 'Data', needs: ['pg', 'go', 'dist'] },
      { id: 'em', label: 'Engineering Manager', short: 'Eng Manager', family: 'Leadership', needs: ['mentor', 'incident', 'roadmap', 'writing'] },
      { id: 'tl', label: 'Tech Lead', short: 'Tech Lead', family: 'Leadership', needs: ['sysd', 'mentor', 'writing'] },
    ],
    extra: [], families: ['Backend', 'Platform', 'Data', 'Leadership'],
    practices: [{
      comp: 'incident', question: 'Payments are failing for 8% of users and the cause is unknown. What do you do in the first ten minutes?',
      options: [{ id: 'a', text: 'Start debugging the most likely service yourself', verdict: 'partial', kws: ['debug'] }, { id: 'b', text: 'Declare an incident, assign roles (lead, comms, ops), stabilise first, then investigate', verdict: 'right', kws: ['declare', 'roles', 'stabilise', 'stabilize'] }, { id: 'c', text: 'Wait for more data before raising alarm', verdict: 'wrong', kws: ['wait'] }],
      feedback: { right: 'Right order: declare, assign roles, stabilise, then investigate.', partial: 'Debugging alone leaves comms and coordination to nobody.', wrong: 'Waiting while 8% of payments fail costs trust and money.' },
    }],
    samples: [{
      comp: 'incident', title: 'Blameless post-mortem of the March outage', minutes: 45, proves: 'You can run and write up an incident properly.', not: 'That you led it, until a colleague confirms your role.',
      first: { level: 3, rubric: [{ c: 'Clear timeline with detection and response', ok: true }, { c: 'Root cause separated from triggers', ok: true }, { c: 'Follow-ups with owners and dates', ok: true }, { c: 'Shows you led, not only fixed', ok: false }], advice: 'Ask a colleague to confirm your role in a sentence or two.' },
      improved: { level: 4, rubric: [{ c: 'Clear timeline with detection and response', ok: true }, { c: 'Root cause separated from triggers', ok: true }, { c: 'Follow-ups with owners and dates', ok: true }, { c: 'Shows you led, not only fixed', ok: true }] },
    }],
    record: [
      { id: 'r2', at: '2026-10-19', comp: 'sysd', cls: 'Assessed by rubric and reviewer', why: 'Voice design interview scored 3 of 4.', not: 'Org-wide architecture decisions.', level: 3 },
      { id: 'r1', at: '2026-08-14', comp: 'recon', cls: 'Verified credential', why: 'Repository snapshot verified at source (simulated).', not: 'Production metrics.' },
    ],
    steps: [
      { id: 't1', comp: 'incident', title: 'Practise an incident-command scenario', kind: 'Practice', minutes: 15, why: 'Every Staff listing you saved asks for it.', goals: ['staff', 'sre', 'platform', 'em'], dueIn: 4 },
      { id: 't2', comp: 'incident', title: 'Write up the March outage as a blameless review', kind: 'Work sample', minutes: 45, why: 'You mentioned leading it; nothing is shared yet.', goals: ['staff', 'sre', 'platform', 'em'], dueIn: 10 },
      { id: 't3', comp: 'mentor', title: 'Ask a mentee for a short written reference', kind: 'Credential', minutes: 10, why: 'Mentoring is unclear without someone else’s word.', goals: ['staff', 'em', 'tl'], dueIn: 14 },
      { id: 't4', comp: 'writing', title: 'Turn the retry PR into a design doc', kind: 'Work sample', minutes: 60, why: 'Your writing sample is from 2023.', goals: ['staff', 'payarch', 'sre', 'em', 'tl'], dueIn: 21 },
    ],
    jobs: { staff: ['j_medlink_platform'], senior: ['j_kora_backend'] },
    progress: [{ comp: 'sysd', points: [{ at: '2026-10-05', level: 2, cls: 'assessed' }, { at: '2026-10-12', level: 3, cls: 'practice' }, { at: '2026-10-19', level: 3, cls: 'assessed' }] }],
  },
};
