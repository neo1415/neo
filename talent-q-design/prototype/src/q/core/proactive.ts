// Proactive assistance: rules read real, authorised state and propose help with a stated reason.
// The person can act, snooze (until a time) or dismiss; Q remembers the decision. "Off" turns all of it
// off; "Quiet" keeps only high-priority items. Nothing here acts on its own: suggestions only prepare.
import { useMemo } from 'react';
import type { Suggestion } from '../../state/domain';
import { actorOf, emit, simNow, useWorld, type World } from '../../mock/world';
import { registerOp } from './engine';
import type { ProactiveRule } from './types';

const rules: ProactiveRule[] = [];
export const registerRule = (r: ProactiveRule) => { if (!rules.some((x) => x.id === r.id)) rules.push(r); };

export function evaluateSuggestions(w: World): Suggestion[] {
  const actor = actorOf(w);
  const prefs = w.q.prefs[actor.id];
  if (!prefs || prefs.proactive === 'OFF' || !actor.signedUp) return [];
  const t = simNow(w).getTime();
  const out: Suggestion[] = [];
  for (const r of rules) {
    if (r.side !== 'both' && r.side !== actor.side) continue;
    if (prefs.proactive === 'QUIET' && r.priority !== 'high') continue;
    for (const s of r.evaluate(w, actor)) {
      const id = `${actor.id}:${r.id}:${s.subject}`;
      const saved = w.q.suggestions.find((x) => x.id === id);
      if (saved && (saved.state === 'DISMISSED' || saved.state === 'DONE')) continue;
      if (saved?.state === 'SNOOZED' && saved.until && new Date(saved.until).getTime() > t) continue;
      out.push({ id, actor: actor.id, rule: r.id, subject: s.subject, text: s.text, why: s.why, actions: s.actions ?? [], at: w.session.now, state: 'OPEN' });
    }
  }
  return out;
}
export function useSuggestions() {
  const w = useWorld((x) => x);
  return useMemo(() => evaluateSuggestions(w), [w]);
}

const decide = (w: World, id: string, state: Suggestion['state'], until?: string) => {
  const i = w.q.suggestions.findIndex((x) => x.id === id);
  const rec: Suggestion = { ...(i >= 0 ? w.q.suggestions[i] : { id, actor: w.session.actor, rule: id.split(':')[1], subject: id.split(':')[2], text: '', why: '', actions: [], at: w.session.now }), state, until };
  if (i >= 0) w.q.suggestions[i] = rec; else w.q.suggestions.push(rec);
};
registerOp('suggestion.dismiss', (w, a, actor) => { decide(w, String(a.id), 'DISMISSED'); emit(w, actor.id, 'q.suggestion.dismissed', actor.orgId ? `ORG:${actor.orgId}` : `PERSON:${actor.personId}`, `Dismissed a suggestion (${String(a.id).split(':')[1]}).`); return { say: 'Okay, I won’t bring that up again. You can turn suggestions down in Settings any time.' }; });
registerOp('suggestion.snooze', (w, a) => { const until = new Date(simNow(w).getTime() + Number(a.hours ?? 24) * 36e5).toISOString(); decide(w, String(a.id), 'SNOOZED', until); return { say: `I’ll remind you ${Number(a.hours ?? 24) >= 24 ? 'tomorrow' : 'later today'}.` }; });
registerOp('suggestion.done', (w, a) => { decide(w, String(a.id), 'DONE'); });
registerOp('prefs.proactive', (w, a, actor) => { w.q.prefs[actor.id] = { ...w.q.prefs[actor.id], proactive: a.level as 'OFF' | 'QUIET' | 'NORMAL' }; return { say: a.level === 'OFF' ? 'Suggestions are off. I’ll only respond when you ask.' : a.level === 'QUIET' ? 'Quiet mode: I’ll only raise things that are time-sensitive.' : 'I’ll suggest things when I notice something useful.' }; });
