// TALENT-D content and pure helpers. Everything Q "writes" here is authored and checked against the person's own
// sources: Q rewords and organises, it never supplies a fact (the same guard as the P6 CV help: addedClaims).
import type { Evidence } from '@contracts';
import { actorOf, simNow, type World } from '../../mock/world';
import type { AuthStatus, Critique, Letter, LetterLine, Work, WorkAuth } from '../../state/areas/talent-d';
import { newAuth, tdRead } from '../../state/areas/talent-d';
import { addedClaims } from '../evidence/candidate/logic';

export const orgNm = (w: World, id: string) => w.orgs.find((o) => o.id === id)?.name ?? id;
const D = (s: string) => new Date(s.length === 10 ? `${s}T12:00:00+01:00` : s);
export const dayMonth = (s: string) => D(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
export const dayTime = (s: string) => D(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
export const me = (w: World) => actorOf(w);
export const receiptId = (w: World) => `TQ-${String(w.events.length + 1000).slice(-4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// =====================================================================================================
// Demo states (atlas variants: loading, ready, empty, error, permission denied). Real states come from data;
// "?state=" lets a reviewer see the loading and error designs without breaking anything.
// =====================================================================================================
export type DemoState = 'loading' | 'error' | 'denied' | 'empty' | null;
export const demoState = (q: URLSearchParams): DemoState => { const s = q.get('state'); return s === 'loading' || s === 'error' || s === 'denied' || s === 'empty' ? s : null; };

// =====================================================================================================
// SC-071 · Work authorisation
// =====================================================================================================
export const AUTH_LABEL: Record<AuthStatus, string> = {
  CITIZEN: 'Citizen or permanent resident',
  HOLDS_PERMIT: 'I hold a permit or visa that lets me work',
  NEEDS_PERMIT: 'I would need a permit or visa',
  NOT_SURE: 'I’m not sure',
};
export const AUTH_SHORT: Record<AuthStatus, string> = { CITIZEN: 'No permit needed', HOLDS_PERMIT: 'Holds a permit', NEEDS_PERMIT: 'Would need a permit', NOT_SURE: 'Not sure yet' };
export const COUNTRIES = ['Nigeria', 'Ghana', 'United Kingdom', 'Kenya', 'South Africa'];
/** General notes, labelled as such. Never advice, never a decision, and never used to hide jobs. */
export const REGION_NOTE: Record<string, string> = {
  Nigeria: 'ECOWAS citizens can enter Nigeria without a visa. Working for a Nigerian employer usually also needs a residence permit; the employer confirms what they need.',
  Ghana: 'Ghanaian citizens need no permit to work in Ghana. Other ECOWAS citizens can enter without a visa; working usually needs a residence or work permit.',
  'United Kingdom': 'Most people who aren’t UK or Irish citizens need a visa to work in the UK. Some employers sponsor one; many don’t.',
  Kenya: 'Non-citizens usually need a work permit, normally applied for with the employer.',
  'South Africa': 'Non-citizens usually need a work visa. The employer often has to show why they are hiring from abroad.',
};
const NO_AUTH: WorkAuth = newAuth();
export const authOf = (w: World, pid: string): WorkAuth => tdRead(w).auth[pid] ?? NO_AUTH;
export const liveShares = (a: WorkAuth) => Object.values(a.shares).filter((r) => !r.endedAt);
/** What one organisation can read. The single read path: a page for that organisation would use this. */
export function authVisibleTo(w: World, pid: string, org: string) {
  if (w.consents[pid]?.withdrawnFrom.includes(org)) return null;
  const a = authOf(w, pid); const r = a.shares[org];
  if (!r || r.endedAt) return null;
  return { entries: a.entries, doc: a.doc && a.doc.sharedWith.includes(org) ? a.doc : null, since: r.at };
}
/** Organisations the person already has a relationship with (applied, shared something, registered): the only
 *  ones offered for sharing. Never a search audience. */
export function authOrgs(w: World, pid: string) {
  const ids = new Set<string>();
  for (const a of w.applications.filter((x) => x.personId === pid && x.status !== 'WITHDRAWN')) { const o = w.jobs.find((j) => j.id === a.jobId)?.orgId; if (o) ids.add(o); }
  for (const e of w.evidence.filter((x) => x.ownerId === pid)) for (const o of e.sharedWith) ids.add(o);
  for (const o of w.consents[pid]?.registeredWith ?? []) ids.add(o);
  for (const o of Object.keys(authOf(w, pid).shares)) ids.add(o);
  return [...ids].filter((id) => w.orgs.some((o) => o.id === id));
}

// =====================================================================================================
// SC-076 / SC-077 · Work, critique and versions
// =====================================================================================================
export const worksOf = (w: World, pid: string) => Object.values(tdRead(w).works).filter((x) => x.personId === pid);
export const latest = (x: Work) => x.versions[x.versions.length - 1];
export const workById = (w: World, id: string) => tdRead(w).works[id];

/** Q's critique of Amaka's write-up: kind, specific, anchored to her paragraphs. Q only offers wording where the
 *  facts are already hers; where the fix needs something only she knows, Q says so instead of inventing it. */
const CRITIQUES: Record<string, Omit<Critique, 'at' | 'forV' | 'focus'>> = {
  w_amaka_prices: {
    strengths: [
      'You collected your own data: weekly prices from 12 traders over six months. That’s real fieldwork, and most summaries don’t have it.',
      'Your figures are specific (21% for tomatoes, 9% for rice), so a reader can check them.',
    ],
    points: [
      { id: 'lead', para: 0, title: 'Lead with what you found', why: 'A reader decides in the first two lines whether to keep going. “Prices went up a lot” makes them wait for your point.', tryThis: 'Open with your finding and your method in one breath.', suggestion: 'Tomato prices at Mile 12 market in Lagos rose 21% between January and June 2025; rice rose 9%. I recorded weekly prices from 12 traders to understand why.', state: 'OPEN' },
      { id: 'cause', para: 2, title: 'Say which cause your data can speak to', why: 'Listing five causes and saying all of them “probably played a part” reads as a guess, and your weekly data is stronger than that.', tryThis: 'Say what your weeks show: did prices jump at a particular time? If your data can’t tell the causes apart, say that plainly. That’s honest analysis, not a weakness.', suggestion: null, state: 'OPEN' },
      { id: 'end', para: 3, title: 'End with something a reader can use', why: '“The government should do something” is hard to act on, and it isn’t what your data shows.', tryThis: 'Close with what your data shows and one thing you would measure next.', suggestion: 'My data shows how much prices rose, but not why. Next, I would compare the same weeks with transport costs to test one explanation.', state: 'OPEN' },
    ],
  },
  w_chidi_brief: {
    strengths: ['You start from a real problem (stock-outs before the next visit), not from a feature list.', 'Your success line names two things someone could count.'],
    points: [
      { id: 'evidence', para: 0, title: 'Show the problem is real', why: 'A reader will ask “how do you know?”. Your 40 accounts at Bole are exactly where that answer lives.', tryThis: 'Add two or three things you saw on your own accounts. Only you know these, so Q won’t write them.', suggestion: null, state: 'OPEN' },
      { id: 'who', para: 1, title: 'Make “who” specific', why: '“Small retail shops” could be anyone. The shops you know are the strongest example you have.', tryThis: 'Name the shops you know, from your verified work.', suggestion: 'Who: owners of small retail shops who buy from a distributor, like the 40 accounts I managed at Bole Distributors.', state: 'OPEN' },
    ],
  },
};
export const canCritique = (id: string) => !!CRITIQUES[id];
export function makeCritique(id: string, forV: number, focus: Critique['focus'], at: string): Critique | null {
  const c = CRITIQUES[id]; if (!c) return null;
  const points = c.points.filter((p) => focus === 'ALL' || (focus === 'CLARITY' ? p.id !== 'cause' && p.id !== 'evidence' : p.id === 'cause' || p.id === 'evidence' || p.id === 'end'));
  return { at, forV, focus, strengths: c.strengths, points: points.map((p) => ({ ...p })) };
}

/** Words on one side only (set-based, as the P6 CV diff does). */
const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, '');
export function wordDiff(a: string, b: string) {
  const keep = new Set(b.split(/\s+/).map(norm).filter(Boolean));
  return a.split(/\s+/).filter(Boolean).map((t) => ({ t, changed: !!norm(t) && !keep.has(norm(t)) }));
}

// =====================================================================================================
// SC-087 · Cover notes, grounded in the person's own sources
// =====================================================================================================
export interface Fact { id: string; text: string; source: string; evidenceId?: string; caveat?: string }
const FACTS: Record<string, Fact[]> = {
  p_grace: [
    { id: 'role', text: 'I have worked as a care assistant for four years.', source: 'Your profile' },
    { id: 'place', text: 'I live in Uyo.', source: 'Your profile' },
    { id: 'aid', text: 'I completed a first aid course with the Red Cross; the certificate check is still pending.', source: 'Your Passport: first aid certificate (pending)', evidenceId: 'e_grace_cert', caveat: 'Pending, so Q says “completed a course”, not “certified”.' },
    { id: 'steady', text: 'I am looking for a steadier role.', source: 'Your profile' },
  ],
  p_chidi: [
    { id: 'sales', text: 'Since 2021 I have managed 40 retail accounts as a sales executive at Bole Distributors.', source: 'Your Passport: employer letter (verified)', evidenceId: 'e_chidi_sales' },
    { id: 'growth', text: 'Revenue in my region grew 18% on my accounts.', source: 'Your Passport: employer letter (verified)', evidenceId: 'e_chidi_sales' },
    { id: 'switch', text: 'I am moving from sales into product and business analysis.', source: 'What you told Q about your goal' },
  ],
  p_zara: [
    { id: 'api', text: 'I built a Go service that ingests GPS pings and serves routes.', source: 'Your Passport: fleet tracking API (public repo)', evidenceId: 'e_zara_api' },
    { id: 'pg', text: 'I partitioned a 200m-row Postgres table by month and wrote up the trade-offs.', source: 'Your Passport: Postgres write-up', evidenceId: 'e_zara_pg' },
  ],
};
export const factsFor = (pid: string) => FACTS[pid] ?? [];
export const letterKey = (pid: string, jobId: string) => `${pid}:${jobId}`;
export const letterOf = (w: World, pid: string, jobId: string): Letter | undefined => tdRead(w).letters[letterKey(pid, jobId)];

export function draftLetter(w: World, pid: string, jobId: string, length: Letter['length'], at: string): Letter | null {
  const job = w.jobs.find((j) => j.id === jobId); const facts = factsFor(pid);
  if (!job || !facts.length) return null;
  const org = orgNm(w, job.orgId);
  const lines: LetterLine[] = [
    { text: `Hello ${org} team,`, source: null, by: 'Q' },
    { text: `I would like to apply for the ${job.title} role.`, source: 'The job you’re applying for', by: 'Q' },
    ...(length === 'NOTE' ? facts.slice(0, 2) : facts).map((f) => ({ text: f.text, source: f.source, by: 'Q' as const })),
    { text: 'I would be glad to talk about how I could help.', source: null, by: 'Q' },
    { text: `${w.people.find((p) => p.personId === pid)?.name ?? ''}`, source: 'Your profile', by: 'Q' },
  ];
  return { personId: pid, jobId, at, length, state: 'DRAFT', lines };
}
/** Opening words and courtesy are not claims; everything else must already be in the person's sources. */
const COURTESY = new Set(['hello', 'team', 'i', 'dear', 'thank', 'thanks', 'kind', 'regards', 'since']);
const CRED = /\b(certified|licensed|degree|diploma|qualified|registered nurse|manager|led|expert|years?)\b/gi;
export function letterSources(w: World, pid: string, jobId: string) {
  const job = w.jobs.find((j) => j.id === jobId);
  return [...factsFor(pid).map((f) => f.text), job ? `${job.title} ${orgNm(w, job.orgId)}` : '', w.people.find((p) => p.personId === pid)?.name ?? ''];
}
/** The P6 guard (addedClaims) plus credential words. Q's own draft must return nothing. */
export function inventedIn(w: World, pid: string, jobId: string, text: string): string[] {
  const sources = letterSources(w, pid, jobId);
  const body = text.split(/(?<=[.!?,])\s+/).map((s) => s.split(/\s+/).slice(1).join(' ')).join(' ');
  const caps = addedClaims(w, pid, sources, [body]).filter((t) => !COURTESY.has(t));
  const src = sources.join(' ').toLowerCase();
  const creds = (text.match(CRED) ?? []).map((t) => t.toLowerCase()).filter((t) => !src.includes(t));
  return [...new Set([...caps, ...creds])];
}

// =====================================================================================================
// SC-092 · Learning resources, each tied to a gap
// =====================================================================================================
export interface Cue { t: number; text: string }
export interface Resource {
  id: string; comp: string; personas: string[]; title: string; gapLine: string; minutes: number;
  video: { title: string; length: number; cues: Cue[] };
  article: { h: string; p: string }[];
  links: { label: string; note: string }[];
  exercise: { prompt: string; hint: string; check: RegExp[] };
  practice: { label: string; op: string; args: Record<string, unknown> };
}
export const RESOURCES: Resource[] = [
  {
    id: 'incident-first-10', comp: 'incident', personas: ['p_tobi'], minutes: 12, title: 'Leading an incident: the first ten minutes',
    gapLine: 'Incident leadership isn’t shown in your Passport yet. Staff listings you saved ask for it.',
    video: { title: 'Declare, assign, stabilise', length: 96, cues: [
      { t: 0, text: 'When something breaks, the first ten minutes decide how the next hour goes.' },
      { t: 12, text: 'Step one: declare it. Say out loud, in the channel, that this is an incident.' },
      { t: 26, text: 'Step two: assign roles. One person leads, one person talks to customers and colleagues, others fix.' },
      { t: 42, text: 'The lead doesn’t debug. The lead keeps the picture and makes decisions.' },
      { t: 56, text: 'Step three: stabilise before you investigate. Roll back, fail over or switch off the feature.' },
      { t: 72, text: 'Then find the cause, with time to think, once customers are safe.' },
      { t: 84, text: 'Afterwards, write it up without blame, with owners and dates for every follow-up.' },
    ] },
    article: [
      { h: 'Why the lead doesn’t debug', p: 'If the person leading is deep in logs, nobody is watching the whole picture: who is affected, who has been told, what has been tried. Leading is a separate job for the length of the incident.' },
      { h: 'Stabilise, then investigate', p: 'Customers care that it stops, not why it started. A rollback that works in two minutes beats a root cause found in forty.' },
      { h: 'The write-up', p: 'A good post-mortem has a timeline, the cause separated from the trigger, and follow-ups with an owner and a date. It names systems, not people.' },
    ],
    links: [{ label: 'An incident-management chapter from a public reliability book', note: 'External and illustrative. The prototype doesn’t open outside links.' }],
    exercise: { prompt: 'Payments are failing for 8% of users. Write the first three messages you would post in the incident channel.', hint: 'Who leads, who talks to customers, and what you’ll do to stop the damage.', check: [/declar|incident/i, /lead|comms|role|assign/i, /roll ?back|fail ?over|switch off|disable|stabil/i] },
    practice: { label: 'Practise privately (one question)', op: 'ta.j7.quiz.start', args: { comp: 'incident' } },
  },
  {
    id: 'brief-one-page', comp: 'writing', personas: ['p_chidi'], minutes: 10, title: 'A one-page product brief people act on',
    gapLine: 'Product writing isn’t on your record yet. Tinda’s Associate PM and Junior Product Analyst listings ask for it.',
    video: { title: 'Problem first, then evidence', length: 80, cues: [
      { t: 0, text: 'A brief has one job: help a team decide whether to build something.' },
      { t: 14, text: 'Start with the problem, and who has it. Not the feature.' },
      { t: 28, text: 'Then show how you know. Two or three facts you saw yourself beat any opinion.' },
      { t: 44, text: 'Say what success looks like in things someone could count.' },
      { t: 60, text: 'Keep it to one page. If it needs more, it’s probably two briefs.' },
    ] },
    article: [
      { h: 'Problem before solution', p: 'Readers judge an idea by the problem it solves. If the problem isn’t clear, every feature looks arbitrary.' },
      { h: 'Evidence you saw yourself', p: 'From sales, you already have it: what customers asked for, what went wrong, what you heard more than once. Write down what you saw, not what you assume.' },
      { h: 'Success you can count', p: 'Pick one or two measures a team could check after launch, such as stock-outs per month or repeat orders.' },
    ],
    links: [{ label: 'A free product-writing guide (external)', note: 'External and illustrative. The prototype doesn’t open outside links.' }],
    exercise: { prompt: 'Write two facts you saw on your own accounts that show shop owners run out of stock.', hint: 'Things you saw or heard yourself. Rough numbers are fine if you mark them as rough.', check: [/\w{3,}/, /\b(shop|account|owner|customer|stock|order)\w*/i] },
    practice: { label: 'Practise privately (one question)', op: 'ta.j7.quiz.start', args: { comp: 'writing' } },
  },
];
export const resourceById = (id: string) => RESOURCES.find((r) => r.id === id);
export const resourcesFor = (pid: string) => RESOURCES.filter((r) => r.personas.includes(pid));
export const cueAt = (r: Resource, pos: number) => { let i = 0; r.video.cues.forEach((c, k) => { if (c.t <= pos) i = k; }); return i; };
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// =====================================================================================================
// SC-172 · Improvement wizard (J7 samples)
// =====================================================================================================
export interface Edit { id: string; title: string; kind: 'YOUR_FACT' | 'Q_WORDING'; para: number; after: string; source: string; fixes?: string }
export const WIZ_EDITS: Record<string, { workId: string; edits: Edit[] }> = {
  writing: {
    workId: 'w_chidi_brief',
    edits: [
      { id: 'fact', title: 'Add what you saw on your accounts', kind: 'YOUR_FACT', para: 0, after: '', source: 'You: only you know what you saw', fixes: 'Shows evidence for the problem' },
      { id: 'who', title: 'Make “who” specific', kind: 'Q_WORDING', para: 1, after: 'Who: owners of small retail shops who buy from a distributor, like the 40 accounts I managed at Bole Distributors.', source: 'Your Passport: Bole Distributors employer letter (verified)' },
      { id: 'success', title: 'Make success countable', kind: 'Q_WORDING', para: 3, after: 'Success: fewer weeks where a shop runs out of its best-selling items, and more repeat orders per shop each month.', source: 'Your own success line, made countable (no new facts)' },
    ],
  },
};
export const wizardFor = (comp: string) => WIZ_EDITS[comp];

// =====================================================================================================
// SC-175 · Recovery after a rejection
// =====================================================================================================
/** What the employer chose to share, word for word (simulated reply). Q never adds reasons of its own. */
export const EMPLOYER_FEEDBACK: Record<string, string> = {
  a_chidi_tinda: 'Thanks for asking, Chidi. We went with candidates who could show product writing, such as a brief or a spec. Your sales record was strong. We’d be glad to see an application for a future role.',
};
/** Next steps derived only from the employer's words, mapped to the person's own career data. */
export function stepsFromFeedback(text: string) {
  const s: { id: string; label: string; to: string; why: string }[] = [];
  if (/writing|brief|spec/i.test(text)) {
    s.push({ id: 'improve', label: 'Improve your product brief', to: '/c/career/improve', why: 'Tinda named product writing. Your brief is the closest thing you have.' });
    s.push({ id: 'learn', label: 'A 10-minute lesson on briefs', to: '/c/learn/brief-one-page', why: 'Short teaching and one exercise, tied to the same gap.' });
  }
  if (/future role|future/i.test(text)) s.push({ id: 'jobs', label: 'See open roles that ask for product writing', to: '/c/jobs', why: 'Tinda said they’d welcome another application.' });
  return s;
}
export const evidenceTitle = (w: World, id?: string): Evidence | undefined => (id ? w.evidence.find((e) => e.evidenceId === id) : undefined);
export const daysAgo = (w: World, at: string) => Math.max(0, Math.round((simNow(w).getTime() - D(at).getTime()) / 864e5));
