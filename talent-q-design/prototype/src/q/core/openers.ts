// Q's opening line (audit addendum §B, AD-B-01/02), shown when a person's conversation with Q is empty.
// Rules (from design-skills:ux-writing): name ONE concrete thing on this page from live state, in 14 words or
// fewer where possible; offer one verb-first action; never repeat the page's heading or a Q card already showing
// (same subject); plain words; with proactivity off, only an invitation. The generic line is the last fallback.
// Areas register openers for their pages in q/openers/*.ts (discovered by glob, like skills and rules).
import type { Actor, QAction } from '../../state/domain';
import type { World } from '../../mock/world';

export interface Opening { subject: string; text: string; action?: QAction }
export interface Opener { id: string; side: 'recruiter' | 'candidate' | 'both'; match: (path: string) => boolean; build: (w: World, a: Actor, path: string) => Opening[] }

const openers: Opener[] = [];
export const registerOpener = (o: Opener) => { if (!openers.some((x) => x.id === o.id)) openers.push(o); };

/** Invitation used when nothing on the page is actionable, or when proactivity is off. */
export function invitation(a: Actor): Opening {
  // No greeting: pages already greet by name, and saying it twice is noise.
  if (a.side === 'candidate') return { subject: 'invite', text: 'Tell me what you’re hoping for, in your own words. You decide what employers see.' };
  if (!a.orgId) return { subject: 'invite', text: 'Tell me what keeps going wrong in your business. One line is enough.', action: { label: 'Start with Q', primary: true, act: { t: 'say', text: 'I need help but I’m not sure who to hire' } } };
  return { subject: 'invite', text: 'Ask me about anyone or anything in your hiring.' };
}

export function opening(w: World, a: Actor, path: string, shownSubjects: string[]): Opening {
  const prefs = w.q.prefs[a.id];
  if (prefs?.proactive === 'OFF') return invitation(a);
  for (const o of openers) {
    if (o.side !== 'both' && o.side !== a.side) continue;
    if (!o.match(path)) continue;
    const pick = o.build(w, a, path).find((x) => !shownSubjects.includes(x.subject));
    if (pick) return pick;
  }
  return invitation(a);
}
