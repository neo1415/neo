// Demo data. People and companies are fictional.

export const brief = {
  role: 'Backend Engineer',
  level: 'Strong mid-level, 5+ years',
  outcomes: ['Cut API incidents from ~6 a month to 1', 'p95 latency under 300ms', 'Own on-call and post-mortems'],
  musts: ['Production incident response', 'PostgreSQL performance'],
  nice: ['Node or Go', 'Tracing & SLOs'],
  budget: '$1,800–2,000 / month',
  where: 'Remote · overlaps WAT ±2h',
}

// fit = can they do the work (evidence-weighted) · want = does it suit them · mutual = √(fit × want)
export const people = [
  { id: 'femi', name: 'Femi Okafor', now: 'Senior backend · payments', city: 'Lagos', fit: 83, want: 91, why: 'Cut p95 latency 41% on a 30M-request/day payments API. Led 14 post-mortems.', source: 'His own profile · confirmed 3 days ago', gaps: 'Kubernetes not evidenced', pay: '$1.8–2.1k', fits: true },
  { id: 'kwame', name: 'Kwame Mensah', now: 'Backend II · mobile money', city: 'Accra', fit: 73, want: 88, why: 'Go services for mobile-money settlement. Wrote the team’s runbooks.', source: 'His own profile · 6 days ago', gaps: 'Tracing is self-reported', pay: '$1.6–1.9k', fits: true },
  { id: 'daniel', name: 'Daniel Mwangi', now: 'Site reliability', city: 'Nairobi', fit: 72, want: 76, why: 'Built an SLO program across 40 services.', source: 'His own profile · yesterday', gaps: 'Only 2h overlap — ask', pay: '$2.0–2.3k', fits: true },
  { id: 'ngozi', name: 'Ngozi Obi', now: 'Database engineer', city: 'Abuja', fit: 70, want: 80, why: 'Cut query cost 60% with an index redesign.', source: 'Applied to you in 2025 · consented', gaps: 'No incident evidence yet', pay: '$1.7–2.0k', fits: true },
  { id: 'tobi', name: 'Tobi Adeyemi', now: 'Staff engineer', city: 'Lagos', fit: 93, want: 40, why: 'Designed multi-region failover for card switching.', source: 'Licensed partner network', gaps: 'Expects $3.5k+ — above budget', pay: '$3.5k+', fits: false },
]

export const mutual = (p) => Math.round(Math.sqrt(p.fit * p.want))

// The Q-led interview, shared by Femi's room and Ada's live view.
export const interview = [
  { q: 'Tell me about the last production incident you led. What broke, and how did you find it?',
    a: 'A settlement job held row locks on our ledger, so payouts timed out. I traced it with pg_stat_activity and moved the job to batched updates with SKIP LOCKED.',
    note: { tag: 'Incident response', text: 'Diagnosed lock contention live; specific tooling named', tone: 'ok' } },
  { q: 'How did you make sure it didn’t happen again?',
    a: 'Post-mortem within 48 hours, an alert on lock wait time, and a runbook. Incidents went from five a month to one.',
    note: { tag: 'Reliability', text: 'Prevention, alerting and a measured outcome', tone: 'ok' } },
  { q: 'Describe a query you made dramatically faster. What was the bottleneck?',
    a: 'A transfers lookup scanned four million rows. A composite index on account, status and time took p95 from 2.1 seconds to 86 milliseconds.',
    note: { tag: 'PostgreSQL', text: 'Index design with before/after numbers', tone: 'ok' } },
  { q: 'Last one. How would autoscaling on Kubernetes change that setup?',
    a: 'Honestly, I’ve mostly run on VMs. I’d want to learn how pod scaling interacts with our connection pool first.',
    note: { tag: 'Kubernetes', text: 'Gap stated honestly — learnable, not a must-have', tone: 'warn' } },
]
