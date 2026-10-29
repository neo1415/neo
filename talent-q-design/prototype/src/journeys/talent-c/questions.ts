// Interview question banks for the interview room. Each question has a plain "simpler" wording the person
// can ask for at any time; if they answer the simpler wording, the employer sees that wording too.
import type { World } from '../../mock/world';

export interface IQ { id: string; text: string; simpler: string; hint: string; requiredBy?: string }
export interface Bank { key: string; title: string; org: string; orgId?: string; when?: string; eventId?: string; questions: IQ[]; j7?: boolean }

const SUPPORT: IQ[] = [
  { id: 's1', text: 'Tell us about a time you looked after someone who was upset or worried. What did you do?', simpler: 'Think of a time someone was upset. What did you do to help them?', hint: 'Say who it was (no names needed), what was wrong, and what you did first.' },
  { id: 's2', text: 'Have you ever shown a new colleague how to do the job? How did you make sure they got it right?', simpler: 'Did you ever teach someone new at work? How did you help them learn?', hint: 'One example is enough. Say how you checked they understood.', requiredBy: 'Kora Pay' },
  { id: 's3', text: 'A customer says money left their account, but the shop says it never arrived. What would you do first?', simpler: 'Someone says they paid, but the shop says no money came. What would you do first?', hint: 'There’s no single right answer. Say the first two things you would do.' },
  { id: 's4', text: 'Write a short message to a customer explaining that their problem will take two more days to fix.', simpler: 'Write a short, kind message telling someone their problem needs 2 more days.', hint: 'Two or three sentences is plenty.' },
];
const BACKEND: IQ[] = [
  { id: 'q1', text: 'Walk me through how your reconciliation service catches a mismatch, step by step.', simpler: 'When two records of a payment don’t match, how does your system notice? Step by step.', hint: 'Start with what runs, then what happens when something is wrong.' },
  { id: 'q2', text: 'How do you make a payment request safe to retry?', simpler: 'If a payment request is sent twice by accident, how do you stop the customer paying twice?', hint: 'Say where you keep track of requests and for how long.', requiredBy: 'Kora Pay' },
  { id: 'q3', text: 'Tell me about an incident you led. What did you do in the first ten minutes?', simpler: 'Think of a time something broke at work and you led the fix. What did you do first?', hint: 'Then say what you changed afterwards.' },
];
const J7: Record<string, IQ> = {
  c_sql_window: { id: 'p1', text: 'You have a table of app sessions (user_id, started_at). How would you find, for each user, how many days passed between their first and second session?', simpler: 'For each person, how would you work out the days between their first and second visit?', hint: 'Name the function you would use.' },
  c_writing: { id: 'p1', text: 'In three sentences, tell a product manager what your final-year project found and what they should do about it.', simpler: 'In three sentences: what did your project find, and what should someone do about it?', hint: 'Put the most important number first.' },
  c_prospecting: { id: 'p1', text: 'I’m a busy operations manager. You have 30 seconds on the phone. Go.', simpler: 'You have 30 seconds to tell a busy manager why they should talk to you. What do you say?', hint: 'Ask a question early.' },
  c_crm: { id: 'p1', text: 'A lead replied “maybe next quarter”. What do you record in the CRM, and what happens next?', simpler: 'Someone said “maybe later”. What do you write down, and when do you follow up?', hint: 'Give a date.' },
  c_oncall: { id: 'p1', text: 'Describe the March outage as if writing the first paragraph of a blameless review.', simpler: 'Describe what went wrong in March without blaming anyone.', hint: 'Say the impact in numbers.' },
};

/** Which questions this person gets: their own interview's, or a J7 practice question. */
export function bankFor(w: World, personId: string | undefined, practiceId: string | null): Bank {
  if (practiceId && J7[practiceId]) return { key: `J7:${practiceId}`, title: 'Practice question', org: 'Private practice', questions: [J7[practiceId]], j7: true };
  const iv = w.interviews.find((i) => i.personId === personId && i.status !== 'CANCELLED' && i.status !== 'DONE');
  const m = iv ? w.mandates.find((x) => x.id === iv.mandateId) : undefined;
  const org = w.orgs.find((o) => o.id === iv?.orgId);
  const ev = iv?.eventId ? w.calendar.find((c) => c.id === iv.eventId) : undefined;
  return { key: 'INTERVIEW', title: m?.title ?? 'Senior Backend Engineer', org: org?.name ?? 'Kora Pay', orgId: org?.id ?? 'org_kora', when: ev?.start, eventId: ev?.id, questions: iv?.mandateId === 'm_support' ? SUPPORT : BACKEND };
}
export const whenText = (iso?: string, tz = 'Africa/Lagos') => (iso ? new Date(iso).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz }) : 'not booked yet');
export const timeText = (iso: string, tz = 'Africa/Lagos') => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
