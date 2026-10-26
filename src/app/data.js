// Workspace data: everything Ada can see in one place. Fictional.
import { people as shortlist, interview } from '../data'

export const stages = ['Found', 'Asked', 'Interested', 'Interviewed', 'Offer', 'Hired']

export const roles = [
  { id: 'backend', title: 'Backend Engineer', brief: 'v2', status: 'Active', open: 'Oct 20', budget: '$1,800–2,000 / mo', where: 'Remote · WAT ±2h', summary: 'Femi is interested and interviewed. Your call on the offer.', needs: 1 },
  { id: 'support', title: 'Customer Support Lead', brief: 'v1', status: 'Needs you', open: 'Oct 2', budget: '$900–1,100 / mo', where: 'Lagos · hybrid', summary: 'Three interviewed. Waiting on your feedback for Halima.', needs: 2 },
  { id: 'growth', title: 'Growth Marketer', brief: 'v3', status: 'Filled', open: 'Sep 11', budget: '$1,400 / mo', where: 'Remote', summary: 'Chidi accepted. Starts November 18.', needs: 0 },
]

const extra = [
  { id: 'halima', name: 'Halima Sule', now: 'Support team lead · fintech', city: 'Lagos', fit: 84, want: 86, why: 'Ran a 12-person support team; cut first-response time by half.', source: 'Her own profile', gaps: 'Zendesk admin depth unknown', pay: '$1.0k', fits: true, role: 'support', stage: 'Interviewed' },
  { id: 'bayo', name: 'Bayo Ade', now: 'Senior support agent', city: 'Ibadan', fit: 74, want: 90, why: 'Highest CSAT on his team two years running.', source: 'Applied to you · consented', gaps: 'No people-management evidence', pay: '$0.9k', fits: true, role: 'support', stage: 'Interviewed' },
  { id: 'zainab', name: 'Zainab Bello', now: 'Customer success manager', city: 'Abuja', fit: 79, want: 72, why: 'Built the escalation playbook at a 200-person SaaS.', source: 'Licensed partner', gaps: 'Prefers Abuja on-site', pay: '$1.1k', fits: true, role: 'support', stage: 'Interviewed' },
  { id: 'chidi', name: 'Chidi Nnamdi', now: 'Growth lead', city: 'Remote', fit: 88, want: 92, why: 'Grew a consumer app from 20k to 400k users.', source: 'His own profile', gaps: '', pay: '$1.4k', fits: true, role: 'growth', stage: 'Hired' },
]

const backendStage = { femi: 'Interviewed', kwame: 'Asked', daniel: 'Found', ngozi: 'Found', tobi: 'Found' }
export const everyone = [...shortlist.map((p) => ({ ...p, role: 'backend', stage: backendStage[p.id] })), ...extra]

export const needsYou = [
  { id: 'n1', role: 'backend', kind: 'decision', title: 'Offer Femi Okafor $2,000?', detail: 'Strong on both must-haves. Tolu agreed after the transcript.', cta: 'Review offer', who: 'femi' },
  { id: 'n2', role: 'support', kind: 'feedback', title: 'Your feedback on Halima Sule', detail: 'Tolu scored her 4/5. Yours is the last scorecard.', cta: 'Add feedback', who: 'halima' },
  { id: 'n3', role: 'support', kind: 'approve', title: 'Send Bayo a second interview?', detail: 'Q drafted a 20-minute call with your team lead.', cta: 'Approve', who: 'bayo' },
]

export const interviews = [
  { id: 'i1', who: 'femi', role: 'backend', when: 'Today, 10:12', mode: 'Q-led · voice → text', status: 'Done', length: '16 min', transcript: interview },
  { id: 'i2', who: 'halima', role: 'support', when: 'Yesterday, 15:00', mode: 'Q-led · voice', status: 'Done', length: '14 min', transcript: [] },
  { id: 'i3', who: 'bayo', role: 'support', when: 'Thu, 11:30', mode: 'With Ada & team lead', status: 'Proposed', length: '20 min', transcript: [] },
]

export const activity = [
  ['10:31', 'Interview done · transcript and notes ready', 'backend'],
  ['10:12', 'Started Femi’s interview (he chose voice, later low-data text)', 'backend'],
  ['09:58', 'Femi said yes · pay, remote and notice fit', 'backend'],
  ['09:40', 'Asked Femi · company name hidden', 'backend'],
  ['07:05', '7 people fit both ways · 5 well evidenced', 'backend'],
  ['02:14', 'Skipped 1 person who opted out', 'backend'],
  ['23:42', 'Searched 4 permissioned sources · 575 profiles', 'backend'],
  ['Yesterday', 'Drafted second-interview invite for Bayo', 'support'],
]

export const chats = [
  { id: 'c1', title: 'Backend Engineer brief', when: 'Today' },
  { id: 'c2', title: 'Why Femi?', when: 'Today' },
  { id: 'c3', title: 'Support Lead shortlist', when: 'Yesterday' },
  { id: 'c4', title: 'Offer letter wording', when: 'Previous 7 days' },
]

export const person = (id) => everyone.find((p) => p.id === id)
export const role = (id) => roles.find((r) => r.id === id)
