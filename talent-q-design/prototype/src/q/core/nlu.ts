// Bounded natural-language understanding for the prototype's simulated Q.
// This is NOT a language model. It normalises imperfect input (typos, contractions, filler, hesitation),
// extracts entities, and offers helpers skills use to score intents. Its limits are stated in the UI.
import type { World } from '../../mock/world';

const CONTRACTIONS: [RegExp, string][] = [[/\bdon'?t\b/g, 'do not'], [/\bdoesn'?t\b/g, 'does not'], [/\bcan'?t\b/g, 'cannot'], [/\bwon'?t\b/g, 'will not'], [/\bi'?m\b/g, 'i am'], [/\bit'?s\b/g, 'it is'], [/\bwhat'?s\b/g, 'what is'], [/\bthat'?s\b/g, 'that is'], [/\bi'?ve\b/g, 'i have'], [/\bi'?d\b/g, 'i would'], [/\bdidn'?t\b/g, 'did not'], [/\bisn'?t\b/g, 'is not'], [/\bwanna\b/g, 'want to'], [/\bgonna\b/g, 'going to'], [/\bpls\b|\bplz\b/g, 'please'], [/\bu\b/g, 'you'], [/\bur\b/g, 'your'], [/\bthx\b|\bthanks\b/g, 'thank you'], [/\bok+ay\b|\bokk*\b/g, 'ok']];
/** Common misspellings seen in recruiting and job-seeking chat. */
const TYPOS: Record<string, string> = {
  intervew: 'interview', interveiw: 'interview', inteview: 'interview', candiate: 'candidate', canidate: 'candidate', candidte: 'candidate', shedule: 'schedule', schedual: 'schedule', calender: 'calendar',
  recieve: 'receive', recruter: 'recruiter', reccomend: 'recommend', recomend: 'recommend', definately: 'definitely', seperate: 'separate', salery: 'salary', sallary: 'salary', bugdet: 'budget', buget: 'budget',
  experiance: 'experience', experince: 'experience', employes: 'employees', applyed: 'applied', aplied: 'applied', jobb: 'job', resumé: 'cv', curriculum: 'cv', comparision: 'comparison', compair: 'compare',
  freind: 'friend', freindly: 'friendly', freindlier: 'friendlier', mesage: 'message', messege: 'message', invitaion: 'invitation', invitation: 'invitation', fryday: 'friday', tuseday: 'tuesday', wensday: 'wednesday', wednsday: 'wednesday', thurday: 'thursday',
  bussiness: 'business', buisness: 'business', busness: 'business', acount: 'account', acounts: 'accounts', bookeeper: 'bookkeeper', bookeeping: 'bookkeeping', accountnt: 'accountant',
};
const FILLER = /\b(um+|uh+|erm+|hmm+|like,|you know|kind of|sort of|basically|honestly|just)\b/g;

export function normalise(text: string) {
  let s = ` ${text.toLowerCase().replace(/[’`]/g, "'")} `;
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  s = s.replace(FILLER, ' ');
  s = s.replace(/[^a-z0-9₦£$%:'\-\s,.?!]/g, ' ');
  // "resume" is a CV only as a noun ("my resume"); "resume the search" stays a verb.
  s = s.replace(/\b(my|a|the|your|her|his|their|upload|send|attach|updated|new|old) resume\b/g, '$1 cv').replace(/\bresume (file|pdf|doc)\b/g, 'cv $1');
  s = s.split(/\s+/).map((t) => TYPOS[t.replace(/[,.?!]/g, '')] ?? t).join(' ');
  return s.replace(/\s+/g, ' ').trim();
}

/** Levenshtein distance, for fuzzy name and keyword matching. */
export function lev(a: string, b: string) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
const words = (s: string) => s.replace(/[,.?!]/g, ' ').split(/\s+/).filter(Boolean);
/** True if any word in the text is within an edit distance of the keyword (scaled by length). */
export function near(norm: string, kw: string) {
  if (norm.includes(kw)) return true;
  const tol = kw.length <= 4 ? 0 : kw.length <= 7 ? 1 : 2;
  return words(norm).some((w) => Math.abs(w.length - kw.length) <= tol && lev(w, kw) <= tol);
}
export const anyOf = (norm: string, kws: string[]) => kws.some((k) => (k.includes(' ') ? norm.includes(k) : near(norm, k)));
export const countOf = (norm: string, kws: string[]) => kws.filter((k) => (k.includes(' ') ? norm.includes(k) : near(norm, k))).length;

export interface Entities {
  people: string[]; days: string[]; time?: string; money?: number; moneyText?: string; tone?: 'friendlier' | 'formal' | 'shorter' | 'warmer';
  yes: boolean; no: boolean; undo: boolean; back: boolean; correction: boolean; stop: boolean; unsure: boolean; thanks: boolean;
}
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'tomorrow', 'today', 'next week'];

export function entities(norm: string, w: World): Entities {
  const ws = words(norm);
  const people = w.people.filter((p) => { const first = p.name.split(' ')[0].toLowerCase(); const last = p.name.split(' ')[1]?.toLowerCase() ?? ''; return ws.some((x) => x === first || x === last || (first.length > 4 && lev(x, first) <= 1)); }).map((p) => p.personId);
  const days = DAYS.filter((d) => d.includes(' ') ? norm.includes(d) : ws.some((x) => x === d || (d.length > 5 && lev(x, d) <= 1)));
  const time = norm.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)?.[0] ?? norm.match(/\b(\d{1,2}):(\d{2})\b/)?.[0];
  // Money: "80k", "₦80,000", "200 thousand", "1.2m", "150000 naira"
  let money: number | undefined; let moneyText: string | undefined;
  const mm = norm.match(/(?:₦|ngn|n)?\s?(\d+(?:[.,]\d+)?)\s?(k|m|thousand|million|naira)?\b/g)?.find((x) => /k|m|thousand|million|naira|₦|\d{4,}/.test(x));
  if (mm) {
    const n = parseFloat(mm.replace(/[^\d.]/g, '').replace(/,/g, ''));
    money = /m|million/.test(mm.replace(/naira/, '')) && !/\d{4,}/.test(mm) ? n * 1e6 : /k|thousand/.test(mm) ? n * 1e3 : n;
    if (money < 1000) money = undefined; else moneyText = `₦${money.toLocaleString('en-NG')}`;
  }
  const tone = anyOf(norm, ['friendly', 'friendlier', 'warmer', 'less formal', 'casual']) ? 'friendlier' : anyOf(norm, ['formal', 'professional']) ? 'formal' : anyOf(norm, ['shorter', 'brief', 'concise']) ? 'shorter' : undefined;
  return {
    people, days, time, money, moneyText, tone,
    yes: /^(yes|yeah|yep|yup|sure|ok|okay|go ahead|do it|please do|correct|that is right|sounds good|great|perfect|send it|approve)\b/.test(norm) || /\b(yes please|go ahead|do it)\b/.test(norm),
    no: /^(no|nope|nah|not now|do not|stop|cancel|never mind|nevermind)\b/.test(norm),
    undo: /\b(undo|reverse that|put it back|bring it back|i did not mean (that|to)|that was a mistake|oops|restore)\b/.test(norm),
    back: /\b(go back|back to|return to|previous page|where i was)\b/.test(norm),
    correction: /^(actually|no,|wait|sorry,|i meant|i mean|scratch that|change that|instead)\b/.test(norm) || /\b(i meant|instead of|on second thought|changed my mind|change of plan)\b/.test(norm),
    stop: /\b(stop|pause|hold on|wait a moment|cancel that)\b/.test(norm),
    unsure: /\b(i do not know|not sure|no idea|confused|i am lost|what do i do|what should i do|help me|i do not understand|what does .* mean)\b/.test(norm),
    thanks: /\b(thank you|cheers|appreciate)\b/.test(norm),
  };
}

/** Money formatting for replies. */
export const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;
