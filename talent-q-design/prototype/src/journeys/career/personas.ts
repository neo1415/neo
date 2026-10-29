// J7 data for three distinct journeys: a graduate (Amaka), a career switcher (Chidi) and an experienced
// professional (Tobi). All people, roles, listings and reviewers are fictional; demand figures are illustrative.
// Evidence model (the only way a competency's state changes):
//   practice attempt          private; never changes state beyond "practising"; never moves the atlas
//   work sample submitted     counts as partial until reviewed
//   assessed (rubric+review)  counts as evidenced; moves the atlas
//   verified credential       issuer-confirmed; counts as verified
import { COMPS as AMAKA_COMPS, OCCS as AMAKA_OCCS, OCCS_EXTRA as AMAKA_EXTRA, type CState, type Comp, type Occ } from '../../directions/d/data';

export type { CState, Comp };
export interface JOcc { id: string; label: string; short: string; family: string; needs: string[]; demand?: string; extra?: boolean }
export type RecClass = 'Practice attempt' | 'Work sample submitted' | 'Assessed by rubric and reviewer' | 'Verified credential';
export interface Rec { id: string; at: string; comp: string; cls: RecClass; why: string; not: string; moved?: string }
export interface Practice { comp: string; question: string; options: { id: string; text: string; code?: boolean; verdict: 'right' | 'partial' | 'wrong' }[]; feedback: Record<'right' | 'partial' | 'wrong', string>;
  sample: { title: string; minutes: number; rubric: { c: string; ok: boolean }[]; level: string; proves: string; not: string } }
export interface PlanStep { id: string; comp: string; title: string; kind: 'Practice' | 'Work sample' | 'Course' | 'Conversation' | 'Credential'; minutes: number; why: string; done?: boolean }
export interface Opening { id: string; title: string; org: string; where: string; occ: string; note: string }
export interface Persona {
  id: 'graduate' | 'switcher' | 'experienced'; name: string; first: string; line: string; goal: string; horizon: string;
  comps: Comp[]; occs: JOcc[]; extra: JOcc[]; families: string[]; practice: Practice; record: Rec[]; plan: PlanStep[]; openings: Opening[];
  /** Assessed levels over time per competency (comparable conditions only), for the progress view. */
  progress: { comp: string; points: { at: string; level: number; cls: 'assessed' | 'practice' }[] }[];
}

const toJ = (o: Occ): JOcc => ({ ...o });

export const PERSONAS: Record<Persona['id'], Persona> = {
  graduate: {
    id: 'graduate', name: 'Amaka Eze', first: 'Amaka', line: 'Economics graduate · Enugu', goal: 'pa', horizon: '3 months',
    comps: AMAKA_COMPS, occs: AMAKA_OCCS.map(toJ), extra: AMAKA_EXTRA.map(toJ), families: ['Data', 'Product', 'Growth', 'Operations', 'Finance'],
    practice: {
      comp: 'sql', question: 'For each user, how many days passed between their first and second session?',
      options: [{ id: 'a', text: 'Sort by date and subtract the first two rows', verdict: 'partial' }, { id: 'b', text: 'LAG(started_at) OVER (PARTITION BY user_id ORDER BY started_at)', code: true, verdict: 'right' }, { id: 'c', text: 'GROUP BY user_id and take MAX minus MIN', verdict: 'wrong' }],
      feedback: { right: 'Right technique. LAG compares each session with the one before it, per user.', partial: 'Close, but sorting the whole table mixes users together. Partition by user first.', wrong: 'MAX minus MIN gives first-to-last, not first-to-second.' },
      sample: { title: 'Cohort-retention notebook', minutes: 30, rubric: [{ c: 'Uses LAG over a per-user window', ok: true }, { c: 'Orders sessions by start time', ok: true }, { c: 'Handles users with one session', ok: false }, { c: 'Explains what the number means', ok: true }], level: '2 of 4', proves: 'You can use LAG over a per-user window and explain the result.', not: 'Edge cases, or SQL on production-sized data.' },
    },
    record: [
      { id: 'r3', at: '16 Oct', comp: 'sheets', cls: 'Verified credential', why: 'The course issuer confirmed your certificate (simulated).', not: 'Modelling real business data at work.' },
      { id: 'r2', at: '9 Oct', comp: 'story', cls: 'Assessed by rubric and reviewer', why: 'A reviewer scored your market-prices dashboard 3 of 4 on decision clarity.', not: 'That a team used it to decide.' },
      { id: 'r1', at: '2 Oct', comp: 'writing', cls: 'Work sample submitted', why: 'Your 2024 thesis summary. Counted as partial: unreviewed and outdated.', not: 'Writing a product memo.' },
    ],
    plan: [
      { id: 'p1', comp: 'sql', title: 'Practise SQL window functions', kind: 'Practice', minutes: 20, why: '7 of the 10 listings you saved ask for it.' },
      { id: 'p2', comp: 'sql', title: 'Submit a cohort-retention notebook for review', kind: 'Work sample', minutes: 30, why: 'Only reviewed work moves your atlas.' },
      { id: 'p3', comp: 'writing', title: 'Rewrite your thesis as a one-page product memo', kind: 'Work sample', minutes: 60, why: 'Your only writing sample is from 2024.' },
      { id: 'p4', comp: 'exp', title: 'Ask Q to check how 5 listings define A/B testing', kind: 'Conversation', minutes: 5, why: 'Listings disagree on what it means.' },
    ],
    openings: [{ id: 'o1', title: 'Junior Product Analyst', org: 'Tinda (fictional)', where: 'Lagos · hybrid', occ: 'pa', note: 'Asks for SQL and dashboards' }, { id: 'o2', title: 'Data Analyst I', org: 'Kora Pay (fictional)', where: 'Remote', occ: 'jda', note: 'Asks for SQL and spreadsheets' }],
    progress: [
      { comp: 'sheets', points: [{ at: '2 Oct', level: 2, cls: 'assessed' }, { at: '9 Oct', level: 2, cls: 'practice' }, { at: '16 Oct', level: 3, cls: 'assessed' }] },
      { comp: 'story', points: [{ at: '2 Oct', level: 2, cls: 'assessed' }, { at: '9 Oct', level: 3, cls: 'assessed' }] },
    ],
  },
  switcher: {
    id: 'switcher', name: 'Chidi Nwosu', first: 'Chidi', line: 'Retail store lead → sales · Port Harcourt', goal: 'sdr', horizon: '2 months',
    comps: [
      { id: 'cust', label: 'Customer conversations', plain: 'Helping a customer decide', state: 'full', evidence: { title: 'Store manager’s reference', cls: 'Assessed by rubric and reviewer', proves: 'You resolve escalations calmly; reviewed against a service rubric.', notProves: 'Selling to businesses.' } },
      { id: 'target', label: 'Working to targets', plain: 'Planning against a number', state: 'verified', evidence: { title: 'Monthly sales reports, 2023–25', cls: 'Verified credential', proves: 'Your store grew 18% (employer-confirmed, simulated).', notProves: 'Outbound pipeline targets.' } },
      { id: 'discovery', label: 'Discovery questions', plain: 'Finding what a buyer needs', state: 'partial', evidence: { title: 'Role-play with Q, 10 Oct', cls: 'Work sample submitted', proves: 'You ask open questions.', notProves: 'Not reviewed yet.' } },
      { id: 'prospect', label: 'Prospecting', plain: 'Finding and opening new conversations', state: 'none' },
      { id: 'crm', label: 'CRM hygiene', plain: 'Keeping a pipeline honest', state: 'none' },
      { id: 'objection', label: 'Handling objections', plain: 'Responding to “not now”', state: 'unclear' },
      { id: 'writing', label: 'Written outreach', plain: 'A short message someone answers', state: 'none' },
      { id: 'demo', label: 'Product demos', plain: 'Showing value in ten minutes', state: 'none' },
    ],
    occs: [
      { id: 'sdr', label: 'Sales Development Rep', short: 'SDR', family: 'Sales', needs: ['prospect', 'crm', 'discovery', 'writing', 'cust'], demand: '8 of 9 SDR listings ask for prospecting' },
      { id: 'ae', label: 'Account Executive', short: 'Account Exec', family: 'Sales', needs: ['discovery', 'objection', 'demo', 'prospect', 'target'] },
      { id: 'isr', label: 'Inside Sales Rep', short: 'Inside Sales', family: 'Sales', needs: ['prospect', 'objection', 'cust'] },
      { id: 'csa', label: 'Customer Success Associate', short: 'Customer Success', family: 'Customer', needs: ['cust', 'crm', 'demo'] },
      { id: 'sup', label: 'Support Team Lead', short: 'Support Lead', family: 'Customer', needs: ['cust', 'target', 'writing'] },
      { id: 'area', label: 'Retail Area Manager', short: 'Area Manager', family: 'Operations', needs: ['target', 'cust'] },
      { id: 'ops', label: 'Sales Operations Analyst', short: 'Sales Ops', family: 'Operations', needs: ['crm', 'target', 'writing'] },
      { id: 'part', label: 'Partnerships Associate', short: 'Partnerships', family: 'Marketing', needs: ['discovery', 'writing', 'target'] },
      { id: 'mkt', label: 'Marketing Coordinator', short: 'Marketing', family: 'Marketing', needs: ['writing', 'crm', 'demo'] },
    ],
    extra: [], families: ['Sales', 'Customer', 'Operations', 'Marketing'],
    practice: {
      comp: 'prospect', question: 'A clinic owner picks up your cold call: “I’m busy, what is this?” What do you say first?',
      options: [{ id: 'a', text: 'Explain every feature of the product quickly', verdict: 'wrong' }, { id: 'b', text: '“I’ll be quick: clinics like yours lose bookings to no-shows. Is that a problem for you?”', verdict: 'right' }, { id: 'c', text: 'Ask if they have time to talk later', verdict: 'partial' }],
      feedback: { right: 'Good opener: one relevant problem, then a question that hands them control.', partial: 'Polite, but it gives them an easy way out before you’ve said why you called.', wrong: 'Feature lists lose busy people. Lead with their problem.' },
      sample: { title: 'Recorded 5-minute cold-call role-play', minutes: 20, rubric: [{ c: 'Opens with the buyer’s problem', ok: true }, { c: 'Asks an open discovery question', ok: true }, { c: 'Handles the first objection', ok: false }, { c: 'Agrees a clear next step', ok: true }], level: '2 of 4', proves: 'You can open a cold call and agree a next step.', not: 'Sustained pipeline, or handling repeated objections.' },
    },
    record: [
      { id: 'r2', at: '24 Oct', comp: 'discovery', cls: 'Work sample submitted', why: 'Role-play with Q submitted; waiting for a reviewer.', not: 'Not reviewed yet.' },
      { id: 'r1', at: '12 Oct', comp: 'target', cls: 'Verified credential', why: 'Your employer confirmed the store results (simulated).', not: 'Outbound sales targets.' },
    ],
    plan: [
      { id: 'p1', comp: 'prospect', title: 'Practise a cold-call opening', kind: 'Practice', minutes: 10, why: '8 of 9 SDR listings ask for prospecting.' },
      { id: 'p2', comp: 'prospect', title: 'Record a 5-minute role-play for review', kind: 'Work sample', minutes: 20, why: 'Reviewed work is what employers can trust.' },
      { id: 'p3', comp: 'crm', title: 'Free CRM basics module (external)', kind: 'Course', minutes: 120, why: 'Most SDR roles use a CRM daily.' },
      { id: 'p4', comp: 'writing', title: 'Write three outreach messages; Q critiques them', kind: 'Practice', minutes: 25, why: 'Short written outreach is half the job.' },
    ],
    openings: [{ id: 'o1', title: 'Sales Development Rep', org: 'Medlink (fictional)', where: 'Port Harcourt · hybrid', occ: 'sdr', note: 'Hires career switchers; training provided' }],
    progress: [{ comp: 'discovery', points: [{ at: '10 Oct', level: 1, cls: 'practice' }, { at: '24 Oct', level: 2, cls: 'practice' }] }, { comp: 'cust', points: [{ at: '5 Oct', level: 3, cls: 'assessed' }] }],
  },
  experienced: {
    id: 'experienced', name: 'Tobi Adeyemi', first: 'Tobi', line: 'Backend engineer · 7 years · Lagos', goal: 'staff', horizon: '12 months',
    comps: [
      { id: 'recon', label: 'Payments reconciliation', plain: 'Matching money to the ledger at scale', state: 'verified', evidence: { title: 'Reconciliation service snapshot', cls: 'Verified credential', proves: 'You designed the 4m-a-day settlement match (verified repository snapshot).', notProves: 'Production metrics, which are self-reported.' } },
      { id: 'pg', label: 'Postgres performance', plain: 'Fixing slow queries on large tables', state: 'full', evidence: { title: 'Query tuning exercise', cls: 'Assessed by rubric and reviewer', proves: '9s → 140ms on a timed exercise.', notProves: 'Tuning under live load.' } },
      { id: 'go', label: 'Go services', plain: 'Writing and running Go under load', state: 'full', evidence: { title: 'Idempotency library review', cls: 'Assessed by rubric and reviewer', proves: 'Idiomatic, tested Go.', notProves: 'A service under load.' } },
      { id: 'sysd', label: 'System design', plain: 'Designing for failure and scale', state: 'full', evidence: { title: 'Practice interview, assessed', cls: 'Assessed by rubric and reviewer', proves: 'Level 3 of 4 on a voice design interview.', notProves: 'Org-wide architecture decisions.' } },
      { id: 'incident', label: 'Incident leadership', plain: 'Leading from page to post-mortem', state: 'none' },
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
    practice: {
      comp: 'incident', question: 'Payments are failing for 8% of users and the cause is unknown. What do you do in the first ten minutes?',
      options: [{ id: 'a', text: 'Start debugging the most likely service yourself', verdict: 'partial' }, { id: 'b', text: 'Declare an incident, assign roles (lead, comms, ops), stabilise first, then investigate', verdict: 'right' }, { id: 'c', text: 'Wait for more data before raising alarm', verdict: 'wrong' }],
      feedback: { right: 'Right order: declare, assign roles, stabilise, then investigate.', partial: 'Debugging alone leaves comms and coordination to nobody.', wrong: 'Waiting while 8% of payments fail costs trust and money.' },
      sample: { title: 'Blameless post-mortem of the March outage', minutes: 45, rubric: [{ c: 'Clear timeline with detection and response', ok: true }, { c: 'Root cause separated from triggers', ok: true }, { c: 'Follow-ups with owners and dates', ok: true }, { c: 'Shows you led, not only fixed', ok: false }], level: '3 of 4', proves: 'You can run and write up an incident properly.', not: 'That you led it, until a colleague confirms your role.' },
    },
    record: [
      { id: 'r2', at: '19 Oct', comp: 'sysd', cls: 'Assessed by rubric and reviewer', why: 'Voice design interview scored 3 of 4.', not: 'Org-wide architecture decisions.' },
      { id: 'r1', at: '14 Aug', comp: 'recon', cls: 'Verified credential', why: 'Repository snapshot verified at source (simulated).', not: 'Production metrics.' },
    ],
    plan: [
      { id: 'p1', comp: 'incident', title: 'Practise an incident-command scenario', kind: 'Practice', minutes: 15, why: 'Every Staff listing you saved asks for it.' },
      { id: 'p2', comp: 'incident', title: 'Write up the March outage as a blameless review', kind: 'Work sample', minutes: 45, why: 'You mentioned leading it; nothing is shared yet.' },
      { id: 'p3', comp: 'mentor', title: 'Ask a mentee for a short written reference', kind: 'Credential', minutes: 10, why: 'Mentoring is unclear without someone else’s word.' },
      { id: 'p4', comp: 'writing', title: 'Turn the retry PR into a design doc', kind: 'Work sample', minutes: 60, why: 'Your writing sample is from 2023.' },
    ],
    openings: [{ id: 'o1', title: 'Staff Engineer, Payments', org: 'Kora Pay (fictional)', where: 'Lagos', occ: 'staff', note: 'Matches your verified reconciliation work' }, { id: 'o2', title: 'Senior Backend Engineer', org: 'Kora Pay (fictional)', where: 'Lagos', occ: 'senior', note: 'You meet every listed need' }],
    progress: [{ comp: 'sysd', points: [{ at: '5 Oct', level: 2, cls: 'assessed' }, { at: '12 Oct', level: 3, cls: 'practice' }, { at: '19 Oct', level: 3, cls: 'assessed' }] }, { comp: 'pg', points: [{ at: '30 Sep', level: 3, cls: 'assessed' }] }],
  },
};
