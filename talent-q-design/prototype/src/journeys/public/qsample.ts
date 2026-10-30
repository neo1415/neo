// SC-013 · Public sample Q. A visitor can ask a few things and get honest, labelled SAMPLE answers.
// Rules (from the founder's positioning and the source ledger's "Unproven claims"):
// - it never claims real candidates, real results, accuracy, or that anyone would pay a price;
// - it can't see or search people: a request for real people is refused in plain words (permission denied);
// - every reply is labelled "Sample answer" and the fictional people are labelled fictional;
// - it leads into /signup (create an account) or /sign-in, and can move the visitor between public pages.
// It is a small rule matcher, not a model. That is said on the panel.
import { useSyncExternalStore } from 'react';

export type CardKind = 'criteria-backend' | 'criteria-data' | 'criteria-generic' | 'compare' | 'prices' | 'decide';
export interface SChip { label: string; say?: string; to?: string; go?: boolean }
export interface SMsg { id: string; who: 'me' | 'q'; text: string; card?: CardKind; chips?: SChip[]; kind?: 'reply' | 'refusal' | 'fallback' | 'opener' }
export type SState = 'ready' | 'thinking' | 'offline';

const KEY = 'tq.public.sampleq';
// Kept only in this tab (sessionStorage), so the sample conversation follows the visitor across public pages.
let msgs: SMsg[] = (() => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as SMsg[]; } catch { return []; } })();
let state = 'ready' as SState;
let pendingText = '';
let awaitingRole = false;
let n = msgs.length;
const subs = new Set<() => void>();
let snap: { msgs: SMsg[]; state: SState; pendingText: string } = { msgs, state, pendingText };
const emit = () => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs)); } catch { /* storage unavailable: conversation lives in memory */ } snap = { msgs, state, pendingText }; subs.forEach((f) => f()); };
export const useSampleQ = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => snap);
export const resetSampleQ = () => { msgs = []; state = 'ready'; pendingText = ''; awaitingRole = false; emit(); };
/** Demo of the error state: the next question fails as if the connection dropped; Retry keeps the question. */
let failNext = false;
export const simulateDrop = () => { failNext = true; };

const go = (to: string, label: string, primary = false): SChip => ({ label, to, go: primary });
const say = (text: string, label = text): SChip => ({ label, say: text });
const SIGNUP = go('/signup', 'Create an account', true);

/** Questions the sample can answer, shown as chips and as the accessible list of every answer. */
export const STARTERS: SChip[] = [
  say('Describe a role', 'Describe a role for Q'),
  say('Compare two sample candidates'),
  say('What does Q decide?'),
  say('Who sees my data?'),
  say('What does it cost?'),
  say('Is this real?'),
];

export function answer(raw: string): Omit<SMsg, 'id' | 'who'> {
  const t = raw.toLowerCase().replace(/[’']/g, "'").trim();
  if (!t) return { kind: 'fallback', text: 'Ask a question, or pick one below.', chips: STARTERS.slice(0, 3) };
  // Honesty first: is any of this real?
  if (/\b(is (this|it|q) real|simulat\w*|fake|demo|made up|real data|ai model|llm|chatgpt)\b/.test(t))
    return { kind: 'reply', text: 'No. This is a sample conversation with fictional people. I’m a small set of written answers here, not a live model, and I can’t see anyone’s data. Inside the prototype, everything that would touch a real system is simulated and labelled.', chips: [go('/site/trust', 'Read how Q is kept honest'), SIGNUP] };
  // Permission denied: real people, real search.
  if (/\b(real|actual|live|available)\b.*\b(candidates?|people|engineers?|developers?|profiles?|talent)\b|\b(search|find|show|list|get)( me)? (some |real |the )?(candidates?|people|engineers?|developers?|profiles?|cvs?)\b|\bwho('s| is) (looking|available)\b/.test(t))
    return { kind: 'refusal', text: 'I can’t search or show real people here. This page is public, and nobody’s profile is visible on it. People decide who can find them; only verified employers and agencies they allow can search, after signing in.', chips: [say('Compare two sample candidates', 'Show the fictional sample instead'), SIGNUP] };
  // Results and accuracy: unproven claims stay unproven.
  if (/\b(accura\w*|proven|prove|success rate|results?|better than|linkedin|guarantee\w*|does it work|validated|statistic\w*|how good)\b/.test(t))
    return { kind: 'reply', text: 'That isn’t proven yet. Talent Q is being designed and tested, so there are no results to quote. We don’t claim it finds better people than LinkedIn, a test platform or a good recruiter, and the matching in this prototype isn’t validated. A demonstrated sample also doesn’t guarantee how someone will do in the job.', chips: [go('/site/trust', 'Claims we don’t make'), say('Compare two sample candidates')] };
  if (/\b(face|faces|accent|emotion\w*|personality|camera|video interview|webcam|voice tone|facial)\b/.test(t))
    return { kind: 'reply', text: 'Never. Q doesn’t score faces, accents, emotion or personality. Video and voice are optional; when someone shares them, only what they said (the transcript) can be reviewed, and the person chooses which parts.', chips: [go('/site/trust', 'Read the trust page')] };
  if (/\b(decid\w*|reject\w*|who hires|automat\w*|auto[- ]?reject|in charge|final say)\b/.test(t))
    return { kind: 'reply', card: 'decide', text: 'Q does the legwork; people make the decisions. Q never rejects anyone and never sends anything without a person’s yes.', chips: [go('/site/trust', 'More on human review')] };
  if (/\b(privacy|private|my data|who sees|who can see|delete|revoke|stop sharing|share|sharing|consent|gdpr|ndpr)\b/.test(t))
    return { kind: 'reply', text: 'You choose. Your profile stays private until you share it, and you pick who can find you in search. You can stop sharing with an employer at any time; their access ends then, and you can see what they still see.', chips: [go('/site/trust', 'Privacy and revocation'), go('/site/talent', 'For talent')] };
  if (/\b(price|prices|pricing|cost|costs|how much|pay|paid|plan|plans|subscription|fee|fees|free)\b/.test(t))
    return { kind: 'reply', card: 'prices', text: 'For people looking for work, the core is free: no fee to apply or to be found. For employers and agencies, these are the prices we’re testing. They’re hypotheses, not proven prices, and this site takes no payment.', chips: [go('/site/pricing', 'See the pricing page')] };
  if (/\b(compare|tobi|seyi|two (sample )?candidates|cv (vs|versus)|example)\b/.test(t))
    return { kind: 'reply', card: 'compare', text: 'Here are two fictional candidates for a backend role that troubleshoots PostgreSQL and APIs. Tobi’s CV is thin; Seyi’s is polished. Q reads the evidence for each criterion separately, and never turns it into one score.', chips: [say('What does Q decide?'), SIGNUP] };
  if (/\b(sign ?in|log ?in|login)\b/.test(t)) return { kind: 'reply', text: 'You can sign in with an email code, Google or Microsoft. In this prototype all three are simulated.', chips: [go('/sign-in', 'Sign in', true)] };
  if (/\b(sign ?up|get started|create (an )?account|join|register)\b/.test(t)) return { kind: 'reply', text: 'Creating an account takes a minute. You can tell Q what you need in your own words straight after.', chips: [SIGNUP] };
  if (/\b(how (does|do) (it|this|talent q|q) work|how it works|steps)\b/.test(t)) return { kind: 'reply', text: 'In short: you tell Q what needs doing, Q turns it into things it can check, gathers evidence people chose to share, and does the follow-up work once you say yes.', chips: [go('/site/how', 'How Talent Q works')] };
  // A role, either after "Describe a role" or straight away.
  if (awaitingRole || /\b(hire|hiring|need (a|an|someone)|looking for (a|an) \w+|role|engineer|developer|analyst|designer|manager|assistant)\b/.test(t)) {
    if (/^describe a role$/.test(t)) { awaitingRole = true; return { kind: 'reply', text: 'Tell me the role in a line, the way you’d say it to a colleague. For example: “a backend engineer who can fix slow Postgres queries”.' }; }
    awaitingRole = false;
    if (/\b(backend|back-end|postgres\w*|api|apis|server|database|go|golang|node|python|java)\b/.test(t))
      return { kind: 'reply', card: 'criteria-backend', text: 'Here’s how I’d turn that into criteria someone can actually show. This is a sample: on a real role, you approve or change every line before anyone is searched.', chips: [say('Compare two sample candidates', 'See two sample candidates'), SIGNUP] };
    if (/\b(data|analyst|analytics|sql|excel|dashboard\w*|report\w*|bi)\b/.test(t))
      return { kind: 'reply', card: 'criteria-data', text: 'Here’s how I’d turn that into criteria someone can actually show. This is a sample: on a real role, you approve or change every line before anyone is searched.', chips: [SIGNUP] };
    return { kind: 'reply', card: 'criteria-generic', text: 'In this sample I only have worked examples for backend and data roles. For any role, the steps are the same: what the work is, what someone could show for it, and who checks it. You approve every line.', chips: [say('a backend engineer who can fix slow Postgres queries', 'Try the backend example'), SIGNUP] };
  }
  if (/\b(cv|resume|job|jobs|work|career|graduate|switch\w*|apply|applying|nobody replies)\b/.test(t))
    return { kind: 'reply', text: 'Show what you can do, even if your CV doesn’t. Add one thing that shows your work, like a project, a certificate or a short sample, and choose who sees it. Applying and being found are free.', chips: [go('/site/talent', 'For talent'), SIGNUP] };
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(t)) return { kind: 'reply', text: 'Hello. I can answer a few sample questions here. Pick one, or ask your own.', chips: STARTERS.slice(0, 3) };
  return { kind: 'fallback', text: 'I only have a few sample answers on this page, and that question isn’t one of them. These I can answer:', chips: STARTERS };
}

/** Ask the sample Q. The reply comes after a short "reading" state (a fixed 450 ms, labelled, never a fake progress bar). */
export function ask(text: string) {
  const q = text.trim(); if (!q || state === 'thinking') return;
  if (state !== 'offline') msgs = [...msgs, { id: `m${++n}`, who: 'me', text: q }];
  state = 'thinking'; pendingText = q; emit();
  setTimeout(() => {
    if (failNext) { failNext = false; state = 'offline'; emit(); return; }
    msgs = [...msgs, { id: `m${++n}`, who: 'q', ...answer(q) }];
    state = 'ready'; pendingText = ''; emit();
  }, 450);
}
export const retry = () => { if (state === 'offline') ask(pendingText); };

/** Page-aware openers: one line naming what this page is for, one primary chip. */
export function openerFor(path: string): SMsg {
  const o: Record<string, [string, SChip]> = {
    '/site': ['Try me on a role you’re hiring for, or see how I’d read two sample candidates.', say('Describe a role', 'Describe a role')],
    '/site/how': ['Ask me about any step the page doesn’t answer.', say('What does Q decide?')],
    '/site/employers': ['Describe a role in a line and I’ll show the criteria I’d propose.', say('Describe a role', 'Describe a role')],
    '/site/talent': ['Ask me what counts as proof when your CV is thin.', say('I have a weak CV but I can do the work', 'What counts as proof?')],
    '/site/pricing': ['These prices are being tested. Ask me what each one includes.', say('What does it cost?', 'Summarise the prices')],
    '/site/trust': ['Ask me what I’m not allowed to decide.', say('What does Q decide?')],
    '/site/ask': ['This is a sample conversation with fictional people. Ask me something, or pick a question.', say('Describe a role', 'Describe a role')],
  };
  const [text, chip] = o[path] ?? o['/site'];
  return { id: `open-${path}`, who: 'q', kind: 'opener', text, chips: [{ ...chip, go: true }, ...STARTERS.filter((s) => s.say !== chip.say)] };
}

/** Every sample answer, for the accessible list alternative. */
export const ALL_ANSWERS: { q: string; a: string }[] = [
  ['Is this real?', 'Is this real?'], ['Show me real candidates', 'Show me real candidates'], ['Is it accurate?', 'Is it accurate?'],
  ['Does Q score faces or accents?', 'Does Q score faces or accents?'], ['What does Q decide?', 'What does Q decide?'], ['Who sees my data?', 'Who sees my data?'],
  ['What does it cost?', 'What does it cost?'], ['Compare two sample candidates', 'Compare two sample candidates'], ['A backend engineer who can fix slow Postgres queries', 'a backend engineer who can fix slow postgres queries'],
  ['A data analyst who builds dashboards', 'a data analyst who builds dashboards'], ['I have a weak CV but I can do the work', 'I have a weak CV but I can do the work'],
].map(([q, probe]) => { const saved = awaitingRole; awaitingRole = false; const r = answer(probe); awaitingRole = saved; return { q, a: r.text }; });
