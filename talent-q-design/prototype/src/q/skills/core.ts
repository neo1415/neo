// Core skills every journey relies on: help and next steps, honesty about Q, explaining terms, "go back",
// undo, opening pages and people, forgetting, preferences, the fair-hiring guard, and small talk.
import { actorOf, emit, type World } from '../../mock/world';
import type { Actor, QAction } from '../../state/domain';
import { qBack, registerOp, registerSkill } from '../core/engine';
import { GLOSSARY, findTerm } from '../core/glossary';
import { anyOf } from '../core/nlu';
import { protectedCriterion } from '../core/policy';


/** For people who asked for plain words: keep only the first n sentences. */
const brief = (t: string, n: number) => (t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t]).slice(0, n).join('').trim();
const scopeOf = (a: Actor) => (a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId}`);

// ---------- Pages Q can open by name ----------
const PAGES: { side: 'recruiter' | 'candidate'; kws: string[]; to: string; label: string }[] = [
  { side: 'recruiter', kws: ['pipeline', 'board', 'stages'], to: '/r/pipeline', label: 'the pipeline' },
  { side: 'recruiter', kws: ['messages', 'inbox', 'emails', 'correspondence'], to: '/r/messages', label: 'messages' },
  { side: 'recruiter', kws: ['calendar', 'availability'], to: '/r/calendar', label: 'the calendar' },
  { side: 'recruiter', kws: ['interviews', 'interview list'], to: '/r/interviews', label: 'interviews' },
  { side: 'recruiter', kws: ['comparison', 'compare', 'ledger', 'shortlist'], to: '/r/compare', label: 'the comparison' },
  { side: 'recruiter', kws: ['team', 'colleagues', 'permissions'], to: '/r/team', label: 'your team' },
  { side: 'recruiter', kws: ['plans', 'agents'], to: '/r/plan', label: 'plans and agents' },
  { side: 'recruiter', kws: ['audit', 'activity log', 'history of actions'], to: '/r/audit', label: 'the audit log' },
  { side: 'recruiter', kws: ['policy', 'policies', 'guidelines', 'organisation settings', 'organization settings'], to: '/r/setup', label: 'organisation and policy' },
  { side: 'recruiter', kws: ['roles', 'mandates', 'jobs i am hiring'], to: '/r/roles', label: 'your roles' },
  { side: 'recruiter', kws: ['memory', 'what you remember'], to: '/r/memory', label: 'what Q remembers' },
  { side: 'candidate', kws: ['jobs', 'openings', 'vacancies'], to: '/c/jobs', label: 'jobs' },
  { side: 'candidate', kws: ['applications', 'applied'], to: '/c/applications', label: 'your applications' },
  { side: 'candidate', kws: ['passport', 'evidence', 'portfolio', 'certificates'], to: '/c/passport', label: 'your Evidence Passport' },
  { side: 'candidate', kws: ['career', 'atlas', 'growth', 'development plan'], to: '/c/career', label: 'your career atlas' },
  { side: 'candidate', kws: ['messages', 'inbox'], to: '/c/messages', label: 'messages' },
  { side: 'candidate', kws: ['practice', 'rehearse', 'mock interview'], to: '/c/interview', label: 'practice' },
  { side: 'candidate', kws: ['memory', 'what you remember', 'what you know about me'], to: '/c/memory', label: 'what Q remembers' },
  { side: 'recruiter', kws: ['settings', 'notifications', 'preferences'], to: '/settings', label: 'settings' },
  { side: 'candidate', kws: ['settings', 'notifications', 'preferences', 'privacy'], to: '/settings', label: 'settings' },
];
const OPEN = /\b(open|show|take me|go to|bring up|where is|where are|see|view|display|navigate)\b/;

registerSkill({
  id: 'core.open', side: 'both',
  match: (c) => {
    if (!OPEN.test(c.norm)) return 0;
    if (c.ents.people.length && c.actor.side === 'recruiter' && /\b(everything|profile|about|details|more on)\b/.test(c.norm)) return 0.85;
    return PAGES.some((p) => p.side === c.actor.side && anyOf(c.norm, p.kws)) ? 0.7 : 0;
  },
  handle: (c) => {
    if (c.ents.people.length && c.actor.side === 'recruiter') {
      const pid = c.ents.people[0]; const p = c.w.people.find((x) => x.personId === pid)!;
      return { msgs: [{ kind: 'reply', text: `Here’s ${p.name.split(' ')[0]}’s profile: what they’ve shared with ${c.w.orgs.find((o) => o.id === c.actor.orgId)?.name ?? 'you'}, where each piece comes from, and where they are in your hiring. I’ll keep our conversation here.` }], nav: { to: `/r/people/${pid}`, label: `${p.name}’s profile` } };
    }
    const p = PAGES.find((x) => x.side === c.actor.side && anyOf(c.norm, x.kws))!;
    return { msgs: [{ kind: 'reply', text: `Opening ${p.label}.` }], nav: { to: p.to, label: p.label } };
  },
});

registerSkill({
  id: 'core.back', side: 'both',
  match: (c) => (c.ents.back ? 0.9 : 0),
  handle: () => {
    const r = qBack();
    return { msgs: [{ kind: 'reply', text: r ? `Back to ${r.label}, as you left it.` : 'This is the first place we’ve been today, so there’s nowhere to go back to.' }] };
  },
});

registerSkill({
  id: 'core.undo', side: 'both',
  match: (c) => (c.ents.undo ? 0.92 : 0),
  handle: (c) => {
    const u = c.w.q.undo[c.actor.id];
    if (!u?.length) return { msgs: [{ kind: 'reply', text: 'There’s nothing I can undo right now. Sent messages and booked meetings can’t be unsent, but I can help write a correction.' }] };
    return { msgs: [{ kind: 'undo', text: `Undo “${u[u.length - 1].label}”?`, actions: [{ label: 'Undo it', primary: true, act: { t: 'do', op: 'undo' } }, { label: 'Keep it', act: { t: 'say', text: 'keep it' } }] }] };
  },
});

registerSkill({
  id: 'core.explain', side: 'both',
  match: (c) => (/\b(what does|what is|what are|what do you mean|meaning of|define|explain)\b/.test(c.norm) && findTerm(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const t = findTerm(c.norm)!;
    const plain = c.w.q.prefs[c.actor.id]?.plain;
    return { msgs: [{ kind: 'reply', text: plain ? `${t.term}: ${brief(t.plain, 1)}` : `${t.term}: ${t.plain}${t.example ? ` For example: ${t.example}` : ''}` }],
      effects: (w, a) => { (w.q.glossarySeen[a.id] ??= []).push(t.key); } };
  },
});

registerSkill({
  id: 'core.honest', side: 'both',
  match: (c) => (/\b(are you (a )?(real|human|person|robot|ai|bot)|who are you|what are you|is this real|are you chatgpt)\b/.test(c.norm) ? 0.9 : 0),
  handle: () => ({ msgs: [{ kind: 'reply', text: 'I’m Q, the assistant inside Talent Q. In this prototype my understanding is a rule-based simulation, not a full AI model: I handle hiring and career tasks and tell you when I don’t understand. Everything I “send” or “book” here is simulated and labelled as such.' }] }),
});

registerSkill({
  id: 'core.capabilities', side: 'both',
  match: (c) => (/\b(what can you do|what do you do|how does this work|how do i use|help$|^help\b|what can i ask)\b/.test(c.norm) ? 0.8 : 0),
  handle: (c) => ({ msgs: [{ kind: 'reply', text: c.actor.side === 'recruiter'
    ? 'I can help you work out who you need, write the role, find and compare people on real evidence, draft messages for your approval, and arrange interviews around your team’s calendars. You can type or speak normally; you don’t need to know where things are in the app.'
    : 'I can help you set up your profile from a CV or a chat, find jobs that fit, show what employers are looking for, help you practise and prove skills, and keep track of applications. You decide what any employer sees.',
    actions: c.actor.side === 'recruiter' ? [{ label: 'I need to hire someone', primary: true, act: { t: 'say', text: 'I need to hire someone' } }] : [{ label: 'Help me find a job', primary: true, act: { t: 'say', text: 'help me find a job' } }] }] }),
});

registerSkill({
  id: 'core.prefs', side: 'both',
  match: (c) => (/\b(stop|turn off|no more|fewer|less|quiet|mute|disable)\b.*\b(suggest|suggestions|tips|nudges|interrupt)/.test(c.norm) || /\b(turn on|more)\b.*\bsuggest/.test(c.norm) ? 0.85 : 0),
  handle: (c) => {
    const level = /\b(turn on|more)\b/.test(c.norm) ? 'NORMAL' : /\b(fewer|less|quiet)\b/.test(c.norm) ? 'QUIET' : 'OFF';
    return { msgs: [{ kind: 'reply', text: level === 'OFF' ? 'Done. I won’t suggest anything unless you ask. You can change this in Settings.' : level === 'QUIET' ? 'Done. I’ll only raise things that are time-sensitive.' : 'Done. I’ll suggest things when I notice something useful.' }],
      effects: (w, a) => { w.q.prefs[a.id] = { ...w.q.prefs[a.id], proactive: level }; emit(w, a.id, 'q.prefs.changed', scopeOf(a), `Proactive suggestions set to ${level.toLowerCase()}.`); } };
  },
});

// ---------- Fair hiring: decline non-job-related criteria and redirect ----------
registerSkill({
  id: 'core.fairness', side: 'recruiter',
  match: (c) => (protectedCriterion(c.norm) ? 0.97 : 0),
  handle: (c) => {
    const p = protectedCriterion(c.norm)!;
    return {
      msgs: [{ kind: 'refusal', text: `I can’t filter or rank people by ${p.label}. It isn’t related to doing the job, it’s against Talent Q’s rules and ${c.w.orgs.find((o) => o.id === c.actor.orgId)?.name ?? 'most employers’'} guidelines, and in many places it’s unlawful. If there’s a real need behind it, tell me what the job requires and I’ll use that instead — for example ${p.redirect}.`,
        actions: [{ label: 'Describe what the job needs', primary: true, act: { t: 'say', text: 'let me describe what the job actually needs' } }, { label: 'Why is that a rule?', act: { t: 'say', text: 'why can you not filter by that' } }] }],
      effects: (w, a) => emit(w, a.id, 'q.policy.declined', scopeOf(a), `Q declined a non-job-related criterion (${p.label}). The request was not applied to any search.`, { criterion: p.key }),
    };
  },
});
registerSkill({
  id: 'core.fairness.why', side: 'recruiter',
  match: (c) => (/\bwhy\b.*\b(cannot|can not|not allowed|rule|refuse|filter by that)\b/.test(c.norm) ? 0.8 : 0),
  handle: () => ({ msgs: [{ kind: 'reply', text: 'Because characteristics like age, sex, religion or origin don’t predict whether someone can do the work, and using them shuts good people out. Talent Q only lets you select on things the job really needs, and logs any declined request in the audit trail so the team can see the rule was applied consistently.' }] }),
});

// ---------- Forget ----------
registerSkill({
  id: 'core.forget', side: 'both',
  match: (c) => (/\b(forget|delete|erase|remove)\b.*\b(my|that|what i|about)\b/.test(c.norm) && !/\b(draft|message|plan|application)\b/.test(c.norm) ? 0.86 : 0),
  handle: (c) => {
    const hits = c.w.memories.filter((m) => m.lifecycle_status !== 'forgotten' && (m.owner_id === c.actor.id || m.owner_id === c.actor.personId || (c.actor.personId === 'p_tobi' && m.owner_id === 'p_tobi')) && m.retrieval_tags.some((t) => c.norm.includes(t)));
    const what = c.norm.replace(/.*\b(forget|delete|erase|remove)\b\s*/, '').replace(/^(about )?(my|the|that)\s*/, '') || 'that';
    return {
      msgs: [{ kind: 'approval', text: hits.length ? `I have ${hits.length} remembered ${hits.length === 1 ? 'item' : 'items'} about “${what}”. Forgetting removes ${hits.length === 1 ? 'it' : 'them'} from what I use and from anything an employer could ever see. This can’t be undone.` : `I don’t have anything saved about “${what}” that I can find. I can show you everything I remember so you can check.`,
        actions: hits.length ? [{ label: 'Forget it', primary: true, act: { t: 'do', op: 'memory.forget', args: { ids: hits.map((h) => h.memory_id) } } }, { label: 'Keep it', act: { t: 'say', text: 'keep it' } }] : [{ label: 'Show what you remember', act: { t: 'nav', to: c.actor.side === 'recruiter' ? '/r/memory' : '/c/memory' } }] }],
    };
  },
});
registerOp('memory.forget', (w, a, actor) => {
  const ids = (a.ids as string[]) ?? [];
  for (const m of w.memories) if (ids.includes(m.memory_id)) { m.lifecycle_status = 'forgotten'; m.delete_or_revoke_state = 'DELETE_REQUESTED'; }
  emit(w, actor.id, 'memory.forgotten', scopeOf(actor), `Forgot ${ids.length} remembered ${ids.length === 1 ? 'item' : 'items'} at the person’s request.`);
  return { say: 'Forgotten. It’s no longer used by me and is queued for permanent deletion. You can see the record of this request in What Q remembers.' };
});

// ---------- Small talk and "I'm lost" ----------
registerSkill({ id: 'core.thanks', side: 'both', match: (c) => (c.ents.thanks && c.norm.split(' ').length <= 5 ? 0.6 : 0), handle: () => ({ msgs: [{ kind: 'reply', text: 'You’re welcome.' }] }) });
registerSkill({ id: 'core.keep', side: 'both', match: (c) => (/^(keep it|leave it|no thanks|not now|never mind|nevermind)$/.test(c.norm) ? 0.7 : 0), handle: () => ({ msgs: [{ kind: 'reply', text: 'Okay, nothing changed.' }], frame: null }) });
registerSkill({
  id: 'core.lost', side: 'both',
  match: (c) => (c.ents.unsure && !findTerm(c.norm) && c.norm.split(' ').length < 14 ? 0.62 : 0),
  handle: (c) => { const n = nextStepFor(c.w, c.actor); return { msgs: [{ kind: 'reply', text: c.w.q.prefs[c.actor.id]?.plain ? brief(n.text, 2) : n.text, actions: n.actions }] }; },
});
export function nextStepFor(w: World, a: Actor): { text: string; actions: QAction[] } {
  if (a.side === 'recruiter') {
    if (!a.orgId) return { text: 'No problem. The simplest start is to tell me, in your own words, what’s taking up your time or what you wish someone could do for you. I’ll work out the kind of person with you.', actions: [{ label: 'I need help but don’t know who', primary: true, act: { t: 'say', text: 'I need someone to help me with my business but I do not know what kind of person' } }] };
    const waiting = w.proposals.filter((p) => p.status === 'AWAITING_APPROVAL').length + w.threads.flatMap((t) => t.messages).filter((m) => m.status === 'AWAITING_APPROVAL').length;
    if (waiting) return { text: `You have ${waiting} message${waiting === 1 ? '' : 's'} waiting for your approval. That’s the most useful next step.`, actions: [{ label: 'Show me', primary: true, act: { t: 'nav', to: '/r/messages' } }] };
    return { text: 'Here’s where things stand: your roles, the people in each, and anything waiting on you are on Q home. You can also just tell me what you want to get done.', actions: [{ label: 'Open the pipeline', act: { t: 'nav', to: '/r/pipeline' } }, { label: 'Who should I talk to first?', act: { t: 'say', text: 'who should I talk to first' } }] };
  }
  const prof = a.personId ? w.profiles[a.personId] : undefined;
  if (!prof?.done) return { text: 'No problem. Let’s start small: tell me a bit about what you’ve done, even if it isn’t a “proper job”, or upload a CV if you have one. You can skip anything.', actions: [{ label: 'Set up my profile', primary: true, act: { t: 'nav', to: '/c/welcome' } }] };
  return { text: 'A good next step is to look at jobs that fit what you’ve shown so far, or to see what’s missing for the job you want.', actions: [{ label: 'Jobs that fit me', primary: true, act: { t: 'nav', to: '/c/jobs' } }, { label: 'My career atlas', act: { t: 'nav', to: '/c/career' } }] };
}

registerOp('nav.back', () => { qBack(); });
void GLOSSARY; void actorOf;
