// Mock data for the Talent Q prototype. All people and companies are fictional.

export const PRIOR = 0.5

export const baseRequirements = [
  { id: 'r1', label: 'Production API reliability & incident response', short: 'API reliability', w: 0.3, must: true },
  { id: 'r2', label: 'PostgreSQL query & index performance', short: 'PostgreSQL perf', w: 0.25, must: true },
  { id: 'r3', label: 'Node.js or Go service design', short: 'Node / Go', w: 0.2, must: false },
  { id: 'r4', label: 'Observability — tracing, SLOs, alerting', short: 'Observability', w: 0.15, must: false },
  { id: 'r5', label: 'Clear written async communication', short: 'Async comms', w: 0.1, must: false },
]

export const sources = {
  profile: { label: 'Candidate-owned profile', tone: 'green' },
  past: { label: 'Your past applicants · consented', tone: 'blue' },
  partner: { label: 'Licensed partner network', tone: 'violet' },
  public: { label: 'Permitted public work (GitHub)', tone: '' },
}

export const candidates = [
  {
    id: 'femi', name: 'Femi Okafor', title: 'Senior Backend Engineer', company: 'Kudi Ledger', city: 'Lagos', years: 7,
    s: [0.92, 0.88, 0.9, 0.8, 0.85], c: [0.9, 0.86, 0.95, 0.72, 0.62], A: 91, source: 'profile', fresh: '3 days ago', status: 'Open · confidential',
    salary: '$1,800–2,100/mo', remote: 'Remote, WAT ±2h', notice: '4 weeks',
    evidence: ['Cut p95 latency 41% on a 30M-req/day payments API (verified work sample)', 'Led 14 incident post-mortems; on-call lead 2 yrs', 'PostgreSQL partitioning of 2B-row ledger table'],
    unknown: ['Kubernetes depth not evidenced'],
  },
  {
    id: 'tobi', name: 'Tobi Adeyemi', title: 'Staff Engineer', company: 'Fintrack', city: 'Lagos', years: 11,
    s: [0.95, 0.94, 0.92, 0.9, 0.8], c: [0.92, 0.9, 0.9, 0.86, 0.7], A: 40, source: 'partner', fresh: '2 weeks ago', status: 'Passive',
    salary: '$3,500+/mo', remote: 'Remote only', notice: '3 months',
    evidence: ['Designed multi-region failover for card switching', 'Postgres contributor (2 patches merged)'],
    unknown: ['Compensation expectation above mandate budget'],
  },
  {
    id: 'kwame', name: 'Kwame Mensah', title: 'Backend Engineer II', company: 'Hubtel-style Payments', city: 'Accra', years: 5,
    s: [0.8, 0.76, 0.86, 0.62, 0.9], c: [0.82, 0.72, 0.9, 0.55, 0.8], A: 88, source: 'profile', fresh: '6 days ago', status: 'Actively looking',
    salary: '$1,600–1,900/mo', remote: 'Remote, GMT', notice: '2 weeks',
    evidence: ['Go microservices handling mobile-money settlements', 'Wrote team runbooks adopted org-wide'],
    unknown: ['Observability evidence limited to self-report'],
  },
  {
    id: 'ngozi', name: 'Ngozi Obi', title: 'Database Engineer', company: 'Stackline', city: 'Abuja', years: 6,
    s: [0.84, 0.94, 0.7, 0.75, 0.72], c: [0.55, 0.85, 0.65, 0.38, 0.5], A: 80, source: 'past', fresh: '5 months ago', status: 'Applied before (2025)',
    salary: '$1,700–2,000/mo', remote: 'Hybrid Abuja / remote', notice: '1 month',
    evidence: ['Reduced query cost 60% via index redesign'],
    unknown: ['Incident response not evidenced', 'Profile last confirmed 5 months ago'],
  },
  {
    id: 'daniel', name: 'Daniel Mwangi', title: 'Site Reliability Engineer', company: 'Savanna Cloud', city: 'Nairobi', years: 6,
    s: [0.86, 0.68, 0.74, 0.92, 0.8], c: [0.78, 0.6, 0.75, 0.88, 0.72], A: 76, source: 'profile', fresh: '1 day ago', status: 'Open to offers',
    salary: '$2,000–2,300/mo', remote: 'Remote, EAT', notice: '1 month',
    evidence: ['Built SLO program across 40 services', 'OpenTelemetry rollout lead'],
    unknown: ['Timezone overlap: 2h — confirm working pattern'],
  },
  {
    id: 'aisha', name: 'Aisha Yusuf', title: 'Data Engineer', company: 'Agrolink', city: 'Kano', years: 4,
    s: [0.62, 0.86, 0.72, 0.6, 0.9], c: [0.5, 0.9, 0.6, 0.35, 0.86], A: 84, source: 'public', fresh: '3 weeks ago', status: 'Unknown',
    salary: 'Unknown — ask', remote: 'Unknown', notice: 'Unknown',
    evidence: ['dbt + Postgres warehouse projects (public GitHub)'],
    unknown: ['Preferences unknown — match provisional', 'Production on-call not evidenced'],
  },
  {
    id: 'chiamaka', name: 'Chiamaka Eze', title: 'Junior Backend Engineer', company: 'Graduate, UNN', city: 'Enugu', years: 1,
    s: [0.52, 0.56, 0.74, 0.42, 0.84], c: [0.6, 0.62, 0.82, 0.5, 0.8], A: 96, source: 'profile', fresh: 'today', status: 'Actively looking',
    salary: '$700–900/mo', remote: 'Remote / relocate', notice: 'Immediate',
    evidence: ['Q practice task: diagnosed slow query (scored 78/100)', 'Open-source Node CLI, 300★'],
    unknown: ['Junior — fits "train a junior hire" alternative'],
  },
]

export function scoreCandidate(cand, reqs) {
  const total = reqs.reduce((a, r) => a + r.w, 0)
  let F = 0
  let C = 0
  reqs.forEach((r, j) => {
    const w = r.w / total
    const c = cand.c[j]
    const s = cand.s[j]
    F += w * (c * s + (1 - c) * PRIOR)
    C += w * c
  })
  F *= 100
  C *= 100
  const M = Math.sqrt(F * cand.A)
  return { F: Math.round(F), C: Math.round(C), A: cand.A, M: Math.round(M * 10) / 10 }
}

export const pipelineSeed = {
  interested: ['kwame', 'daniel'],
  contacted: ['femi', 'aisha'],
  screened: ['ngozi'],
  interviewed: [],
  offered: [],
  hired: [],
}

export const stages = [
  { id: 'interested', label: 'Interested', tone: 'blue' },
  { id: 'contacted', label: 'Contacted', tone: 'violet' },
  { id: 'screened', label: 'Screened', tone: 'amber' },
  { id: 'interviewed', label: 'Interviewed', tone: 'gold' },
  { id: 'offered', label: 'Offered', tone: 'green' },
  { id: 'hired', label: 'Hired', tone: 'dark' },
]

export const opportunities = [
  { id: 'paystride', company: 'Paystride', role: 'Backend Engineer — API reliability', city: 'Lagos · Remote (WAT ±2h)', pay: '$1,800–2,000/mo', F: 83, A: 91, invite: true, confidential: true, window: 'Reviews within 3 working days', logo: 'P', hue: 1, tags: ['Fintech', 'Series A', '42 people'] },
  { id: 'kora', company: 'Kora Health', role: 'Platform Engineer', city: 'Remote · Africa', pay: '$1,900–2,400/mo', F: 81, A: 84, logo: 'K', hue: 2, tags: ['Healthtech', 'Seed'] },
  { id: 'northwind', company: 'Northwind Logistics', role: 'Backend Engineer (Go)', city: 'Remote · EU overlap', pay: '€3,200–3,800/mo', F: 78, A: 72, logo: 'N', hue: 3, tags: ['Logistics', '300 people'] },
  { id: 'ledgerline', company: 'Ledgerline', role: 'Senior SRE', city: 'Lagos · Hybrid', pay: '$2,200–2,600/mo', F: 74, A: 66, logo: 'L', hue: 4, tags: ['Payments'] },
]

export const agentFeed = [
  { t: '2m', icon: 'search', text: 'Refreshed shortlist for Backend Engineer — 2 new consented profiles', tone: 'gold' },
  { t: '14m', icon: 'mail', text: 'Femi Okafor accepted the confidential interest check', tone: 'green' },
  { t: '1h', icon: 'alert', text: 'Escalated: Tobi Adeyemi compensation ($3.5k) is above budget ceiling', tone: 'amber' },
  { t: '3h', icon: 'cal', text: 'Proposed 3 interview slots to Kwame Mensah (GMT)', tone: '' },
  { t: '5h', icon: 'shield', text: 'Skipped 1 profile: candidate opted out of outreach', tone: '' },
]
