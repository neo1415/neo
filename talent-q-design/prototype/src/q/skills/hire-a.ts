// Q skills for the hire-a area: R1 (Funmi, a first-time employer who doesn't know what she needs) and
// R5 (Bayo, a sceptical hiring manager), plus Kora's Senior Backend intake moved out of the old embedded
// conversation on /r/mandate and /r/sourcing. Everything here is reachable by typing to the global Q in
// imperfect language; pages only show and refine the same state.
import { actorOf, emit, now, orgOf, personOf, simNow, uid, visibleEvidence, type World } from '../../mock/world';
import type { Actor, CalEvent, MandateX, Msg, QAction, QFrame, QMsg, Thread } from '../../state/domain';
import { allSkills, appendQ, pushUndo, registerOp, registerSkill } from '../core/engine';
import { findTerm, GLOSSARY } from '../core/glossary';
import { anyOf, near } from '../core/nlu';
import type { QCtx, QReply, ReplyMsg } from '../core/types';
import { hireA, readA, type HAIntake, type IntakeStep, type RoleKey } from '../../state/areas/hire-a';
import { MANDATE } from '../../mock/fixtures';
import {
  actorName, band, can, createDraft, curV, ensureSeed, firstName, hoursText, isFounder, k, LEVEL_LABEL, listNames, naira, orgMandates, payText, pickMandate,
  POOL, revertTo, revise, ROLE_LABEL, ROLES, rolesIn, round5k, runSearch, scopeOf, simIso, startSourcingWithQ, titleFor, whoCan, dayLabel, timeLabel, poolFor, levelOf,
} from '../../journeys/hire-a/model';

type Out = Omit<QMsg, 'id' | 'at' | 'who'>;
const qsay = (w: World, a: Actor, m: Omit<Out, 'engine'>) => appendQ(w, a.id, { who: 'q', engine: 'rules', ...m });
const ask = (t: string): QAction => ({ label: t, act: { t: 'say', text: t } });
const op = (label: string, name: string, args: Record<string, unknown> = {}, primary = false): QAction => ({ label, primary, act: { t: 'do', op: name, args } });
const nav = (label: string, to: string, primary = false): QAction => ({ label, primary, act: { t: 'nav', to } });
const frame = (intent: string, awaiting: string, slots: Record<string, string> = {}): QFrame => ({ intent, awaiting, slots, startedAt: now() });
/** True when a skill other than `me` clearly owns this turn (explain, undo, back, fairness…), so a frame lets go. */
const strongOther = (c: QCtx, me: string, t = 0.85) => allSkills().some((s) => s.id !== me && (s.side === 'both' || s.side === c.actor.side) && s.match(c) >= t);
const ui = (w: World, a: Actor, route: string, patch: Record<string, unknown>) => { const key = `${a.id}|${route}`; w.q.ui[key] = { ...(w.q.ui[key] ?? {}), ...patch }; };
const findM = (w: World, id: string) => w.mandates.find((m) => m.id === id);

// =====================================================================================================
// R1 · Funmi: from "I don't know what kind of person" to an approved brief, a shortlist and interview holds
// =====================================================================================================
const R1 = 'hire-a.r1';
const intakeOf = (w: World, a: Actor): HAIntake => readA(w).intake[a.id] ?? { step: a.orgId ? 'pains' : 'business', updatedAt: simIso(w) };
const setIntake = (w: World, a: Actor, patch: Partial<HAIntake>) => { const s = hireA(w); s.intake[a.id] = { ...(s.intake[a.id] ?? { step: 'business', updatedAt: '' }), ...patch, updatedAt: simIso(w) }; };
const NEED = /\b(need|want|looking for|hire|hiring|get|find|employ)\b.*\b(someone|somebody|person|people|help|staff|worker|hand|employee|hands)\b|\bhelp (me )?(with|run) (my|the) (business|shop|bakery)\b/;
const CHANGE_MIND = /\b(actually|instead|rather|changed my mind|change of plan|on second thought|what i (really )?need is|i think i (really )?need|not (a|an) |scratch that|i meant)\b/;

/** Roles in a sentence, ignoring work she says she'll keep doing herself ("I can do the baking myself"). */
function rolesFrom(text: string): RoleKey[] {
  const clauses = text.split(/,|;|\bbut\b|\band\b|\.|\bso\b/);
  const kept = clauses.filter((cl) => !/\b(myself|i can (do|handle|manage)|i will (do|handle)|i do the|i am (fine|ok|okay) with|not the)\b/.test(cl));
  const norm = kept.join(' , ') || text;
  const rs = rolesIn(norm);
  for (const r of Object.keys(ROLES) as RoleKey[]) if (norm.includes(ROLES[r].label.replace('’', "'")) || norm.includes(ROLES[r].label.replace('’', ''))) if (!rs.includes(r)) rs.unshift(r);
  return rs;
}
function parseHours(norm: string): { hours?: 'FULL' | 'PART'; days?: number } {
  const n = norm.match(/\b(one|two|three|four|1|2|3|4)\s*(days?|times)\b/)?.[1];
  const days = n ? ({ one: 1, two: 2, three: 3, four: 4 } as Record<string, number>)[n] ?? Number(n) : undefined;
  if (/\bfull[- ]?time\b|\bevery ?day\b|\ball week\b|\bsix days\b|\b5 days\b|\bfive days\b|\bmonday to (friday|saturday)\b/.test(norm)) return { hours: 'FULL' };
  if (/\bpart[- ]?time\b|\bpart time\b|\bfew days\b|\bweekends?\b|\bmornings only\b|\bsome days\b|\bnot every ?day\b/.test(norm) || days) return { hours: 'PART', days: days ?? 3 };
  return {};
}
const notSure = (c: QCtx) => c.ents.unsure || /\b(not sure|no idea|dunno|do not know|what do (people|they) (pay|earn|get)|what is normal|what is usual|you tell me|what should i pay)\b/.test(c.norm);

/** The plain question Q asks at each step. */
function question(step: IntakeStep, st: HAIntake): ReplyMsg | null {
  switch (step) {
    case 'business': return { kind: 'question', text: 'First, what’s your business called, and what does it do? One line is plenty.', actions: [ask('Crumb & Co, a bakery in Ikeja')] };
    case 'pains': return { kind: 'question', text: 'What takes up most of your time at the moment, or what keeps going wrong? Say it however it comes to you: serving customers, keeping track of money, baking, deliveries, or running the shop when you’re away.', actions: [ask('Serving customers, the queue gets long'), ask('Keeping track of the money'), ask('Deliveries')] };
    case 'role': return { kind: 'question', text: 'Which of these is closest to what you need right now?', actions: (Object.keys(ROLES) as RoleKey[]).map((r) => ask(`A ${ROLES[r].label}`)) };
    case 'hours': return { kind: 'question', text: `Would you need the ${ROLES[st.roleKey!].label} full-time, or part-time on certain days?`, actions: [ask('Full-time'), ask('Part-time, 3 days a week'), ask('Not sure')] };
    case 'budget': { const [lo, hi] = band(st.roleKey!, st.hours, st.days); return { kind: 'question', text: 'Roughly how much could you pay each month? A rough number is fine, or say “not sure” and I’ll tell you what’s usual.', actions: [ask(`${k(Math.round((lo + hi) / 2 / 5000) * 5000)} a month`), ask('Not sure')] }; }
    default: return null;
  }
}
function proposeText(_st: HAIntake, r: RoleKey) {
  return `From what you’ve said, a ${ROLES[r].label} sounds right: someone who ${ROLES[r].does}. That’s a working idea, not a decision; you can change your mind at any point and I’ll keep your other answers.`;
}

/** Creates the org from her one-line description. */
function createOrg(w: World, a: Actor, text: string, norm: string) {
  let name = /crumb/.test(norm) ? 'Crumb & Co' : (text.match(/(?:called|named|name is|it is|it's)\s+([A-Z][\w&'’. -]{1,40}?)(?:,| in | - | and |\.|$)/)?.[1] ?? text.split(/,| - | is a | in /)[0]).trim();
  if (!name || name.split(' ').length > 5) name = 'Your business';
  const cityRaw = text.match(/\bin ([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/)?.[1];
  const city = cityRaw ? (['Ikeja', 'Yaba', 'Surulere', 'Lekki', 'Ikoyi', 'Ojota', 'Agege', 'Maryland', 'Ogba'].includes(cityRaw) ? `${cityRaw}, Lagos` : cityRaw) : 'Lagos';
  const industry = /bak|bread|cake|pastr/.test(norm) ? 'Bakery' : /shop|store|retail/.test(norm) ? 'Retail' : 'Small business';
  const id = name === 'Crumb & Co' ? 'org_crumb' : uid('org');
  if (!w.orgs.some((o) => o.id === id)) w.orgs.push({ id, name, kind: 'EMPLOYER', industry, size: '1–10 people', city, verified: { domain: false, registry: 'NONE' }, delegation: 'APPROVE_EACH_SEND', setup: { done: true, step: 5 }, guidelines: ['Approve each outgoing message', 'Ask job-related questions only'] });
  const me = w.actors.find((x) => x.id === a.id)!; me.orgId = id; me.role = 'OWNER';
  const s = hireA(w); if (!s.orgs.includes(id)) s.orgs.push(id);
  emit(w, a.id, 'org.created', `ORG:${id}`, `${a.name} set up ${name} (${industry.toLowerCase()}, ${city}) in conversation with Q.`);
  return { id, name, city, industry };
}

/** Draft (or re-draft) once role, hours and budget are known; flags a budget below the usual range. */
function draftNow(w: World, a: Actor, st: HAIntake, id: string): { frame: QFrame } {
  const existing = st.mandateId ? findM(w, st.mandateId) : undefined;
  let m: MandateX;
  if (existing) m = revise(w, a, existing.id, { roleKey: st.roleKey, hours: st.hours, days: st.days, pay: st.budget ? { min: st.budget, max: st.budget } : undefined }, 'Updated from your answers')!;
  else { m = createDraft(w, a, st, id); }
  setIntake(w, a, { mandateId: m.id });
  const [lo, hi] = band(st.roleKey!, st.hours, st.days);
  const pay = m.pay.max;
  if (pay < lo) {
    setIntake(w, a, { step: 'budgetfix' });
    qsay(w, a, { kind: 'question', ref: { type: 'hire-a.brief', id: m.id }, used: ['Your answers so far', 'Illustrative pay guide, Lagos 2026'],
      text: `I’ve drafted the role brief: ${m.title}, ${m.location}, ${naira(pay)} a month. One thing first: ${naira(pay)} is below what ${hoursText(st.hours, st.days)} ${ROLES[st.roleKey!].label}s usually earn (about ${naira(lo)}–${naira(hi)} a month; an illustrative guide, not a quote). Below that range fewer good people reply. What would you like to do?`,
      why: 'Compared with an illustrative pay guide for this kind of work and these hours.',
      actions: [op(`Raise it to ${k(lo)}–${k(round5k(lo + (hi - lo) * 0.35))}`, 'hire-a.budget', { id: m.id, how: 'raise' }, true),
        ...(ROLES[st.roleKey!].partOk && !(st.hours === 'PART' && (st.days ?? 3) <= 2) ? [op('Ask for 2 days a week instead', 'hire-a.budget', { id: m.id, how: 'days' })] : []),
        op(`Keep ${k(pay)} and see who replies`, 'hire-a.budget', { id: m.id, how: 'keep' })] });
    return { frame: frame(R1, 'budgetfix', { id: m.id }) };
  }
  setIntake(w, a, { step: 'review' });
  reviewMsg(w, a, m, existing ? `I’ve updated the brief to v${curV(m)}.` : 'Here’s a first draft of your role brief (Talent Q calls it a “mandate”).');
  return { frame: frame(R1, 'review', { id: m.id }) };
}
function reviewMsg(w: World, a: Actor, m: MandateX, lead: string) {
  qsay(w, a, { kind: 'approval', ref: { type: 'hire-a.brief', id: m.id }, used: ['Your answers so far'],
    text: `${lead} ${m.title}, ${m.location}, ${payText(m).toLowerCase()}. It’s open beside this conversation. Nothing is posted and nobody is contacted until you approve it. Change anything by telling me, in your own words.`,
    actions: [op(`Approve v${curV(m)}`, 'hire-a.mandate.approve', { id: m.id, v: curV(m) }, true), ask('What’s a mandate?'), nav('Open the brief', `/r/roles/${m.id}`)] });
}

function applyBudget(w: World, a: Actor, id: string, how: string, amount?: number) {
  const m = findM(w, id); if (!m) return;
  const meta = readA(w).meta[id] ?? {}; const role = meta.roleKey!;
  const [lo, hi] = band(role, meta.hours, meta.days);
  if (how === 'raise') revise(w, a, id, { pay: { min: amount ?? lo, max: amount ?? round5k(lo + (hi - lo) * 0.35) } }, `Pay raised to ${amount ? naira(amount) : `${k(lo)}–${k(round5k(lo + (hi - lo) * 0.35))}`} a month`);
  else if (how === 'days') revise(w, a, id, { hours: 'PART', days: 2 }, 'Changed to 2 days a week to fit the budget');
  else revise(w, a, id, { title: m.title }, `Kept ${naira(m.pay.max)} a month (below the usual range; fewer replies likely)`);
  setIntake(w, a, { step: 'review', hours: readA(w).meta[id]?.hours, days: readA(w).meta[id]?.days });
  const m2 = findM(w, id)!;
  const [lo2, hi2] = band(role, readA(w).meta[id]?.hours, readA(w).meta[id]?.days);
  reviewMsg(w, a, m2, how === 'days' ? `Done: 2 days a week, where the usual range is about ${naira(lo2)}–${naira(hi2)}, so ${naira(m2.pay.max)} fits.` : how === 'raise' ? 'Done: the pay is now inside the usual range.' : `Okay, I’ve kept ${naira(m2.pay.max)}. I’ll tell you if few people reply.`);
  w.q.frames[a.id] = frame(R1, 'review', { id });
}

/** Change role, hours, pay or place on an existing draft (or mid-intake), keeping every other answer. */
function applyChange(c: QCtx): QReply | null {
  const st = intakeOf(c.w, c.actor);
  const roles = rolesFrom(c.norm).filter((r) => r !== st.roleKey);
  const hrs = parseHours(c.norm);
  const money = c.ents.money;
  const place = c.text.match(/\bin ([A-Z][a-zA-Z]+)/)?.[1];
  if (!roles.length && !hrs.hours && !money && !place) return null;
  const role = roles[0] ?? st.roleKey;
  const next: Partial<HAIntake> = { prevRoleKey: roles.length ? st.roleKey : st.prevRoleKey, roleKey: role, ...(hrs.hours ? hrs : {}), ...(money ? { budget: money } : {}) };
  if (role && roles.length && !hrs.hours && !ROLES[role].partOk) next.hours = 'FULL';
  const merged = { ...st, ...next };
  const kept = [st.city && `${st.city}`, merged.hours && hoursText(merged.hours, merged.days), merged.budget && `${naira(merged.budget)} a month`].filter(Boolean) as string[];
  const lead = roles.length ? `No problem: switching from ${st.roleKey ? `a ${ROLES[st.roleKey].label}` : 'that'} to a ${ROLES[role!].label}. I’ve kept what still applies${kept.length ? ` (${kept.join(', ')})` : ''}.` : 'Got it, I’ve changed that.';
  // No draft yet: carry on the intake from wherever it is.
  if (!st.mandateId || !findM(c.w, st.mandateId)) {
    const step: IntakeStep = !merged.roleKey ? 'role' : !merged.hours && ROLES[merged.roleKey].partOk ? 'hours' : !merged.budget ? 'budget' : 'review';
    if (step === 'review') {
      const id = uid('m');
      return { msgs: [], effects: (w, a) => { setIntake(w, a, { ...next, hours: merged.hours ?? 'FULL' }); qsay(w, a, { kind: 'reply', text: lead }); const r = draftNow(w, a, { ...intakeOf(w, a) }, id); w.q.frames[a.id] = r.frame; }, frame: frame(R1, 'review', { id }), nav: { to: `/r/roles/${id}`, label: 'the role brief' } };
    }
    const q = question(step, merged)!;
    return { msgs: [{ kind: 'reply', text: `${lead}${roles.length ? ` ${proposeText(merged, role!)}` : ''}` }, q], effects: (w, a) => setIntake(w, a, { ...next, step }), frame: frame(R1, step) };
  }
  // A draft exists: re-plan it as a new version.
  const id = st.mandateId;
  return { msgs: [], frame: frame(R1, 'review', { id }), nav: { to: `/r/roles/${id}`, label: 'the role brief' },
    effects: (w, a) => {
      const meta = readA(w).meta[id] ?? {};
      const note = roles.length ? `Changed from ${ROLES[st.roleKey!]?.label ?? 'the earlier role'} to ${ROLES[role!].label}` : [hrs.hours && hoursText(hrs.hours, hrs.days), money && `pay ${naira(money)}`, place && `in ${place}`].filter(Boolean).join(', ');
      revise(w, a, id, { roleKey: roles.length ? role : undefined, hours: hrs.hours ?? (roles.length && !ROLES[role!].partOk ? 'FULL' : undefined), days: hrs.days, pay: money ? { min: money, max: money } : undefined, location: place ? (place === 'Ikeja' ? 'Ikeja, Lagos' : place) : undefined }, note);
      const m = findM(w, id)!; const meta2 = readA(w).meta[id] ?? meta;
      setIntake(w, a, { ...next, hours: meta2.hours, days: meta2.days, budget: m.pay.max });
      qsay(w, a, { kind: 'reply', text: `${lead} The brief is now v${curV(m)}: ${m.title}. Version ${curV(m) - 1} is kept, so you can look back at it.` });
      const [lo, hi] = band(meta2.roleKey!, meta2.hours, meta2.days);
      if (m.pay.max < lo) {
        setIntake(w, a, { step: 'budgetfix' });
        qsay(w, a, { kind: 'question', ref: { type: 'hire-a.brief', id }, used: ['Your earlier budget', 'Illustrative pay guide, Lagos 2026'], why: 'Compared with an illustrative pay guide for this kind of work and these hours.',
          text: `One thing changes with it: ${naira(m.pay.max)} a month is below what ${hoursText(meta2.hours, meta2.days)} ${ROLES[meta2.roleKey!].label}s usually earn (about ${naira(lo)}–${naira(hi)}, illustrative). What would you like to do?`,
          actions: [op(`Raise it to ${k(lo)}–${k(round5k(lo + (hi - lo) * 0.35))}`, 'hire-a.budget', { id, how: 'raise' }, true), ...(ROLES[meta2.roleKey!].partOk && (meta2.days ?? 3) > 2 ? [op('Make it 2 days a week', 'hire-a.budget', { id, how: 'days' })] : []), op(`Keep ${k(m.pay.max)}`, 'hire-a.budget', { id, how: 'keep' })] });
        w.q.frames[a.id] = frame(R1, 'budgetfix', { id });
      } else { setIntake(w, a, { step: 'review' }); reviewMsg(w, a, m, 'Have a look.'); }
    } };
}

function startOrResume(c: QCtx): QReply {
  const st = readA(c.w).intake[c.actor.id];
  if (st?.mandateId && findM(c.w, st.mandateId)) return whereWasI(c);
  if (!c.actor.orgId) return { msgs: [{ kind: 'reply', text: 'Happy to work that out with you. Most people start exactly here. I’ll ask a few plain questions, one at a time, and set things up as we go. You can change your mind at any point, and ask me what any word means.' }, question('business', { step: 'business', updatedAt: '' })!], effects: (w, a) => setIntake(w, a, { step: 'business' }), frame: frame(R1, 'business') };
  return { msgs: [{ kind: 'reply', text: 'Let’s work out who would help most.' }, question('pains', { step: 'pains', updatedAt: '' })!], effects: (w, a) => setIntake(w, a, { step: 'pains' }), frame: frame(R1, 'pains') };
}

function r1Answer(c: QCtx): QReply | null {
  const step = c.frame?.awaiting as IntakeStep | 'search' | 'propose' | undefined;
  const st = intakeOf(c.w, c.actor);
  if (strongOther(c, R1)) return null;
  if ((c.ents.correction || CHANGE_MIND.test(c.norm)) && (rolesFrom(c.norm).length || parseHours(c.norm).hours || c.ents.money)) return applyChange(c);
  switch (step) {
    case 'business': {
      if (c.norm.split(' ').length < 1) return null;
      return { msgs: [], frame: frame(R1, 'pains'), effects: (w, a) => {
        const o = createOrg(w, a, c.text, c.norm);
        setIntake(w, a, { step: 'pains', business: o.name, city: o.city });
        qsay(w, a, { kind: 'reply', used: ['your message'], why: 'Organisation created from your answer. You can rename it later.', text: `Thanks. I’ve set up ${o.name} (${o.industry.toLowerCase()}, ${o.city}) as your organisation, with you as the owner.` });
        qsay(w, a, question('pains', st)!);
      } };
    }
    case 'pains': case 'role': {
      const rs = rolesFrom(c.norm);
      if (!rs.length) {
        if (step === 'role' || c.text.trim().endsWith('?')) return step === 'role' ? { msgs: [{ kind: 'reply', text: 'I didn’t catch which one. Pick the closest; we can adjust the details after.' }, question('role', st)!] } : null;
        return { msgs: [{ kind: 'reply', text: 'Thanks, that helps. I didn’t catch the kind of work yet.' }, question('role', st)!], effects: (w, a) => setIntake(w, a, { step: 'role', pains: c.text }), frame: frame(R1, 'role') };
      }
      if (rs.length > 1 && step === 'pains') return { msgs: [{ kind: 'question', text: `I can hear two different jobs there: a ${ROLES[rs[0]].label} and a ${ROLES[rs[1]].label}. One person rarely does both well. Which matters more right now?`, actions: [ask(`The ${ROLES[rs[0]].label}`), ask(`The ${ROLES[rs[1]].label}`)] }], effects: (w, a) => setIntake(w, a, { step: 'role', pains: c.text }), frame: frame(R1, 'role') };
      const r = rs[0];
      const next: IntakeStep = ROLES[r].partOk ? 'hours' : 'budget';
      const st2: HAIntake = { ...st, roleKey: r, hours: ROLES[r].partOk ? undefined : 'FULL' };
      return { msgs: [{ kind: 'reply', text: proposeText(st2, r), why: `Based on your words: “${c.text.slice(0, 70)}”` }, ...(ROLES[r].partOk ? [] : [{ kind: 'reply' as const, text: 'A shop manager usually needs to be there most days, so I’ll assume full-time.' }]), question(next, st2)!],
        effects: (w, a) => setIntake(w, a, { step: next, roleKey: r, pains: st.pains ?? c.text, hours: st2.hours }), frame: frame(R1, next) };
    }
    case 'hours': {
      if (notSure(c)) return { msgs: [{ kind: 'reply', text: `Many small businesses start part-time: ${st.roleKey === 'bookkeeper' ? 'two or three days a week is usually enough to keep the books up to date' : 'three days a week covers the busiest days'}. You can always add days later.` }, question('hours', st)!] };
      const h = parseHours(c.norm); if (!h.hours) return c.text.includes('?') ? null : { msgs: [{ kind: 'reply', text: 'Sorry, I didn’t catch that.' }, question('hours', st)!] };
      const st2 = { ...st, ...h };
      return { msgs: [question('budget', st2)!], effects: (w, a) => setIntake(w, a, { step: 'budget', ...h }), frame: frame(R1, 'budget') };
    }
    case 'budget': {
      if (notSure(c) || (!c.ents.money && /\b(usual|normal|typical|market|how much)\b/.test(c.norm))) {
        const [lo, hi] = band(st.roleKey!, st.hours, st.days);
        return { msgs: [{ kind: 'question', used: ['Illustrative pay guide, Lagos 2026'], text: `For a ${hoursText(st.hours, st.days)} ${ROLES[st.roleKey!].label} in Lagos, people usually ask for about ${naira(lo)}–${naira(hi)} a month. That’s an illustrative guide, not a quote. What could you manage?`, actions: [ask(`${k(lo)} a month`), ask(`${k(round5k((lo + hi) / 2))} a month`)] }] };
      }
      if (!c.ents.money) return c.text.includes('?') ? null : { msgs: [{ kind: 'reply', text: 'A rough monthly number is fine, like “80k” or “₦120,000”.' }] };
      const id = uid('m');
      return { msgs: [], frame: frame(R1, 'review', { id }), nav: { to: `/r/roles/${id}`, label: 'the role brief' },
        effects: (w, a) => { setIntake(w, a, { budget: c.ents.money }); const r = draftNow(w, a, intakeOf(w, a), id); w.q.frames[a.id] = r.frame; } };
    }
    case 'budgetfix': {
      const id = c.frame!.slots.id;
      const how = c.ents.money || /\b(raise|increase|more|pay more|higher|fine,? raise)\b/.test(c.norm) ? 'raise' : /\b(2|two) days\b|\bfewer days\b|\bless days\b/.test(c.norm) ? 'days' : /\b(keep|leave|see who|stay|as it is|no change)\b/.test(c.norm) ? 'keep' : null;
      if (!how) return null;
      return { msgs: [], frame: frame(R1, 'review', { id }), effects: (w, a) => applyBudget(w, a, id, how, c.ents.money) };
    }
    case 'review': {
      const id = c.frame!.slots.id; const m = findM(c.w, id);
      if (!m) return null;
      if (/\b(approve|aprove|approved|looks good|look good|that is fine|that is good|go ahead|perfect|ok approve|yes)\b/.test(c.norm) && !/\bnot\b/.test(c.norm)) return { msgs: [], frame: frame(R1, 'search', { id }), effects: (w, a) => approveIn(w, a, id, curV(m)) };
      return applyChange(c);
    }
    case 'search': {
      const id = c.frame!.slots.id;
      if (c.ents.yes || /\b(find|search|look|go)\b/.test(c.norm)) return searchReply(c, findM(c.w, id));
      if (c.ents.no) return { msgs: [{ kind: 'reply', text: 'Okay. Say “find people” whenever you’re ready; I’ll keep the brief as it is.' }], frame: null };
      return null;
    }
    case 'propose': {
      const id = c.frame!.slots.id; const m = findM(c.w, id); if (!m) return null;
      if (c.ents.yes) return { msgs: [], frame: null, effects: (w, a) => proposeIn(w, a, id, JSON.parse(c.frame!.slots.plan)) };
      if (/\b(morning|afternoon|evening|saturday|different|other|later|earlier|next week)\b/.test(c.norm)) return proposeReply(c, m);
      return null;
    }
    default: return null;
  }
}

registerSkill({
  id: R1, side: 'recruiter',
  match: (c) => {
    if (!isFounder(c.actor)) return 0;
    const st = readA(c.w).intake[c.actor.id];
    if (st && (c.ents.correction || CHANGE_MIND.test(c.norm)) && rolesFrom(c.norm).length) return 0.9;
    if (st?.mandateId && findM(c.w, st.mandateId) && /\b(change|make|set|raise|lower|increase|reduce|move|update)\b/.test(c.norm) && (c.ents.money || parseHours(c.norm).hours)) return 0.84;
    if (NEED.test(c.norm)) return 0.86;
    if (/\b(budget|pay)\b.*\b(fix|options|help|low|too low)\b|\bfix the budget\b/.test(c.norm) && st?.mandateId) return 0.85;
    return 0;
  },
  handle: (c) => {
    const st = readA(c.w).intake[c.actor.id];
    if (st && (c.ents.correction || CHANGE_MIND.test(c.norm) || /\b(change|make|set|raise|lower|increase|reduce|move|update)\b/.test(c.norm))) { const r = applyChange(c); if (r) return r; }
    if (/\b(budget|pay)\b/.test(c.norm) && st?.mandateId) {
      const id = st.mandateId;
      return { msgs: [], effects: (w, a) => { const m = findM(w, id)!; const meta = readA(w).meta[id] ?? {}; const [lo, hi] = band(meta.roleKey!, meta.hours, meta.days);
        qsay(w, a, { kind: 'question', ref: { type: 'hire-a.brief', id }, text: `${naira(m.pay.max)} a month against a usual ${naira(lo)}–${naira(hi)} (illustrative). Your options:`, actions: [op(`Raise it to ${k(lo)}–${k(round5k(lo + (hi - lo) * 0.35))}`, 'hire-a.budget', { id, how: 'raise' }, true), op('Make it 2 days a week', 'hire-a.budget', { id, how: 'days' }), op('Keep it', 'hire-a.budget', { id, how: 'keep' })] }); }, frame: frame(R1, 'budgetfix', { id }) };
    }
    return startOrResume(c);
  },
  answer: r1Answer,
});

// ---------- Approve a brief (any org; checks role; binds to the exact version) ----------
function approveIn(w: World, a: Actor, id: string, v: number) {
  const m = findM(w, id);
  if (!m) { qsay(w, a, { kind: 'reply', text: 'I can’t find that brief any more. It may have been discarded; say “undo that” if it was a mistake.' }); return; }
  if (m.orgId !== a.orgId) { qsay(w, a, { kind: 'refusal', text: 'That brief belongs to another organisation, so I can’t approve it for you.' }); return; }
  if (!can(a, 'approve_brief')) { const who = whoCan(w, a, 'approve_brief'); qsay(w, a, { kind: 'refusal', text: `As ${ROLE_LABEL[a.role!]} you can’t approve briefs. ${listNames(who.map((x) => `${x.name} (${ROLE_LABEL[x.role!]})`))} can.`, actions: who.slice(0, 2).map((x) => op(`Ask ${x.first}`, 'hire-a.request', { to: x.id, what: `approve the “${m.title}” brief`, mandateId: id })) }); return; }
  if (curV(m) !== v) { qsay(w, a, { kind: 'approval', ref: { type: 'hire-a.brief', id }, text: `The brief changed since I asked (it’s now v${curV(m)}), so that approval doesn’t apply. Approve the latest version instead?`, actions: [op(`Approve v${curV(m)}`, 'hire-a.mandate.approve', { id, v: curV(m) }, true)] }); return; }
  if (m.status !== 'DRAFT') { qsay(w, a, { kind: 'reply', text: `v${v} of “${m.title}” is already approved.` }); return; }
  m.status = 'APPROVED';
  const s = hireA(w); s.meta[id] = { ...s.meta[id], approvedV: v, approvedBy: a.id, approvedAt: simIso(w) };
  pushUndo(w, a.id, `Approve ${m.title} v${v}`, 'hire-a.mandate.unapprove', { id });
  emit(w, a.id, 'mandate.approved', scopeOf(a), `${a.name} approved the “${m.title}” brief (v${v}).`, { mandateId: id, v });
  if (s.intake[a.id]?.mandateId === id) setIntake(w, a, { step: 'approved' });
  qsay(w, a, { kind: 'reply', ref: { type: 'hire-a.brief', id }, text: `Approved. v${v} is the brief I’ll work from${m.orgId === 'org_kora' ? ', and the team can see you approved it' : ''}. Shall I look for people who fit? I won’t contact anyone.`, actions: [op('Find people', 'hire-a.search', { id }, true), ask('Not yet')] });
  w.q.frames[a.id] = frame(R1, 'search', { id });
}
registerOp('hire-a.mandate.approve', (w, a, actor) => { approveIn(w, actor, String(a.id), Number(a.v)); });
registerOp('hire-a.mandate.unapprove', (w, a, actor) => { const m = findM(w, String(a.id)); if (m) { m.status = 'DRAFT'; const s = hireA(w); s.meta[m.id] = { ...s.meta[m.id], approvedV: undefined }; if (s.intake[actor.id]?.mandateId === m.id) setIntake(w, actor, { step: 'review' }); emit(w, actor.id, 'mandate.unapproved', scopeOf(actor), `Approval of “${m.title}” undone; it’s a draft again.`); } });
registerOp('hire-a.mandate.revert', (w, a, actor) => { revertTo(w, actor, String(a.id), Number(a.to)); const m = findM(w, String(a.id)); const meta = readA(w).meta[String(a.id)] ?? {}; if (m) setIntake(w, actor, { roleKey: meta.roleKey, hours: meta.hours, days: meta.days, budget: m.pay.max }); });
registerOp('hire-a.mandate.discard', (w, a, actor) => {
  const i = w.mandates.findIndex((m) => m.id === a.id); if (i < 0) return;
  const m = w.mandates[i];
  if (m.orgId !== actor.orgId) return { say: 'That brief belongs to another organisation.' };
  w.mandates.splice(i, 1); hireA(w).discarded[m.id] = m;
  pushUndo(w, actor.id, `Discard the ${m.title} draft`, 'hire-a.mandate.restore', { id: m.id });
  emit(w, actor.id, 'mandate.discarded', scopeOf(actor), `${actor.name} discarded the “${m.title}” draft (v${curV(m)}).`, { mandateId: m.id });
  qsay(w, actor, { kind: 'notice', text: `I discarded the “${m.title}” draft. If that was a mistake, say “undo that” and I’ll bring it back exactly as it was.`, actions: [ask('Undo that')] });
  return { nav: { to: '/r/roles', label: 'your roles' } };
});
registerOp('hire-a.mandate.restore', (w, a, actor) => {
  const s = hireA(w); const m = s.discarded[String(a.id)]; if (!m) return;
  w.mandates.push(m); delete s.discarded[m.id];
  emit(w, actor.id, 'mandate.restored', scopeOf(actor), `Restored the “${m.title}” draft (v${curV(m)}).`, { mandateId: m.id });
  if (s.intake[actor.id]?.mandateId === m.id) w.q.frames[actor.id] = frame(R1, m.status === 'DRAFT' ? 'review' : 'search', { id: m.id });
  return { nav: { to: `/r/roles/${m.id}`, label: 'the role brief' } };
});
registerOp('hire-a.budget', (w, a, actor) => { applyBudget(w, actor, String(a.id), String(a.how)); return { nav: { to: `/r/roles/${a.id}`, label: 'the role brief' } }; });

registerSkill({
  id: 'hire-a.approve', side: 'recruiter',
  match: (c) => (/\b(approve|aprove|approv\w*|sign off|signoff|green ?light|okay the|ok the)\b/.test(c.norm) && !/\b(messages?|invitations?|emails?|outreach|each send|drafts? to|who can|send)\b/.test(c.norm) && orgMandates(c.w, c.actor).some((m) => m.status === 'DRAFT') ? 0.87 : 0),
  handle: (c) => {
    const ms = orgMandates(c.w, c.actor);
    const m = pickMandate(c.w, c.actor, c.norm, c.route);
    const target = m?.status === 'DRAFT' ? m : ms.find((x) => x.status === 'DRAFT');
    if (!target) return { msgs: [{ kind: 'reply', text: 'There’s no draft brief waiting for approval.' }] };
    if (!can(c.actor, 'approve_brief')) return { msgs: [], effects: (w, a) => approveIn(w, a, target.id, curV(target)) };
    const by = actorName(c.w, target.versions[target.versions.length - 1].by);
    return { msgs: [{ kind: 'approval', ref: { type: 'hire-a.brief', id: target.id }, used: [`${target.title} v${curV(target)}`, `Last change by ${by}`],
      text: `Approve “${target.title}” v${curV(target)}? Approving lets ${c.actor.orgId === 'org_kora' ? 'the team' : 'me'} start searching against this exact version; any later change needs approval again.`,
      actions: [op(`Approve v${curV(target)}`, 'hire-a.mandate.approve', { id: target.id, v: curV(target) }, true), nav('Read it first', `/r/roles/${target.id}`)] }] };
  },
});

registerSkill({
  id: 'hire-a.discard', side: 'recruiter',
  match: (c) => (/\b(discard|delete|throw away|bin|scrap|get rid of)\b.*\b(draft|brief|role|mandate|it|this)\b/.test(c.norm) && orgMandates(c.w, c.actor).length ? 0.86 : 0),
  handle: (c) => {
    const m = pickMandate(c.w, c.actor, c.norm, c.route);
    if (!m) return { msgs: [{ kind: 'reply', text: 'There’s no brief to discard.' }] };
    if (!can(c.actor, 'delete_role') && m.createdBy !== c.actor.id) { const who = whoCan(c.w, c.actor, 'delete_role'); return { msgs: [{ kind: 'refusal', text: `Only ${listNames(who.map((x) => x.name))} can discard “${m.title}”.` }] }; }
    return { msgs: [{ kind: 'approval', ref: { type: 'hire-a.brief', id: m.id }, text: `Discard “${m.title}” (v${curV(m)})? You can undo it straight after.`, actions: [op('Discard it', 'hire-a.mandate.discard', { id: m.id }, true), ask('Keep it')] }] };
  },
});

// ---------- Explaining terms mid-task, then returning to the question ----------
const LOCAL_TERMS: Record<string, { term: string; plain: string; re: RegExp }> = {
  hold: { term: 'Hold', plain: 'A time blocked on your own calendar so you don’t double-book it. The other person doesn’t see it, and nothing is booked until they agree.', re: /\b(hold|holds)\b/ },
  version: { term: 'Version', plain: 'Each time the brief changes I save a new version (v1, v2…). Older versions stay readable, and an approval applies to one exact version.', re: /\b(version|v\d)\b/ },
  draft: { term: 'Draft', plain: 'Something written but not used yet. A draft brief isn’t searched; a draft message isn’t sent.', re: /\bdraft\b/ },
  illustrative: { term: 'Illustrative pay guide', plain: 'A rough range from typical Lagos pay for this kind of work, to help you judge. It isn’t a quote or a rule.', re: /\b(illustrative|pay guide)\b/ },
};
registerSkill({
  id: 'hire-a.explain', side: 'recruiter',
  match: (c) => {
    if (!/\b(what does|what is|what are|what do you mean|meaning of|define|explain|wetin be)\b/.test(c.norm) && !/\bmean\??$/.test(c.norm)) return 0;
    const mine = c.frame?.intent === R1 || isFounder(c.actor);
    if (!mine) return 0;
    return findTerm(c.norm) || Object.values(LOCAL_TERMS).some((t) => t.re.test(c.norm)) ? 0.89 : 0;
  },
  handle: (c) => {
    const g = findTerm(c.norm); const l = Object.values(LOCAL_TERMS).find((t) => t.re.test(c.norm));
    const t = g ?? l!;
    const st = readA(c.w).intake[c.actor.id];
    const pending = c.frame?.intent === R1 && c.frame.awaiting && !['review', 'search', 'propose', 'budgetfix'].includes(c.frame.awaiting) && st ? question(c.frame.awaiting as IntakeStep, st) : null;
    const brief = st?.mandateId && findM(c.w, st.mandateId);
    const tail = pending ? ` Back to my question: ${pending.text}` : brief && g?.key === 'mandate' ? ` Yours is “${brief.title}”, open beside this conversation.` : '';
    return { msgs: [{ kind: 'reply', text: `${t.term}: ${t.plain}${g?.example ? ` For example: ${g.example}` : ''}${tail}`, actions: pending?.actions }], frame: c.frame ? { ...c.frame, topic: undefined } : undefined,
      effects: (w, a) => { if (g) (w.q.glossarySeen[a.id] ??= []).push(g.key); } };
  },
});

// ---------- "Where was I?" (both journeys) ----------
const WHERE = /\b(where (was|were) (i|we)|where did (i|we) (stop|leave off|get to)|what was i (doing|working on)|pick up where|carry on (from )?where|remind me (where|what)|where are we( at| up to)?|what (is|was) next|what now|where we stopped|where we left)\b/;
function whereWasI(c: QCtx): QReply {
  const a = c.actor; const w = c.w;
  if (isFounder(a)) {
    const st = readA(w).intake[a.id];
    if (!st) return startOrResume(c);
    const m = st.mandateId ? findM(w, st.mandateId) : undefined;
    const org = orgOf(w, a.orgId);
    const lines: string[] = [];
    if (org) lines.push(`${org.name} is set up, with you as the owner.`);
    if (m) lines.push(`Your brief is “${m.title}”, v${curV(m)}, ${m.status === 'DRAFT' ? `still a draft since ${dayLabel(m.versions[m.versions.length - 1].at)}` : 'approved'}.`);
    const found = m ? readA(w).search[m.id]?.found ?? [] : [];
    const sl = m ? w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED') : [];
    if (found.length) lines.push(`I found ${found.length} people; ${sl.length ? `${sl.length} are on your shortlist` : 'none shortlisted yet'}.`);
    const holds = m ? w.calendar.filter((e) => e.mandateId === m.id && e.status === 'HOLD').length : 0;
    if (holds) lines.push(`${holds} interview times are held and the invitations are drafts waiting for you.`);
    let next: { text: string; actions: QAction[]; frame: QFrame | null };
    if (!m) { const q = question(st.step, st); next = { text: q?.text ?? 'Tell me a little about what you need.', actions: q?.actions ?? [], frame: frame(R1, st.step) }; }
    else if (m.status === 'DRAFT') next = { text: st.step === 'budgetfix' ? 'We stopped at the pay: it was below the usual range and you hadn’t chosen what to do.' : 'We stopped at checking the brief. Approve it when it looks right, or tell me what to change.', actions: [op(`Approve v${curV(m)}`, 'hire-a.mandate.approve', { id: m.id, v: curV(m) }, true), nav('Open the brief', `/r/roles/${m.id}`)], frame: frame(R1, st.step === 'budgetfix' ? 'budgetfix' : 'review', { id: m.id }) };
    else if (!found.length) next = { text: 'Next is finding people for it.', actions: [op('Find people', 'hire-a.search', { id: m.id }, true)], frame: frame(R1, 'search', { id: m.id }) };
    else if (!sl.length) next = { text: 'Next is choosing who to look at closely.', actions: [ask('Shortlist the top 3'), nav('See the people', `/r/roles/${m.id}`)], frame: null };
    else if (!holds) next = { text: 'Next is meeting them.', actions: [ask('Propose interview times')], frame: null };
    else next = { text: 'Next is approving the invitations in Messages.', actions: [nav('Open Messages', '/r/messages', true)], frame: null };
    return { msgs: [{ kind: 'reply', used: ['Your conversation so far', ...(m ? [`${m.title} v${curV(m)}`] : [])], text: `Welcome back. ${lines.join(' ')} ${next.text}`, actions: next.actions }], frame: next.frame, nav: m ? { to: `/r/roles/${m.id}`, label: 'the role brief' } : undefined };
  }
  // Everyone else: what's waiting on them.
  const ms = orgMandates(w, a).filter((m) => m.status === 'DRAFT');
  const reqs = readA(w).requests.filter((r) => r.from === a.id);
  const last = [...(w.q.threads[a.id] ?? [])].reverse().find((m) => m.who === 'q' && m.kind === 'question');
  const parts = [ms.length ? `${ms.length === 1 ? `“${ms[0].title}” is` : `${ms.length} briefs are`} waiting for approval.` : 'No briefs are waiting for approval.', reqs.length ? `You asked ${listNames(reqs.map((r) => actorName(w, r.to)))} to ${reqs[reqs.length - 1].what}.` : '', last ? `My last question to you was: “${last.text.slice(0, 140)}${last.text.length > 140 ? '…' : ''}”` : ''].filter(Boolean);
  return { msgs: [{ kind: 'reply', text: parts.join(' '), actions: ms.length ? [nav(`Open ${ms[0].title}`, `/r/roles/${ms[0].id}`, true)] : [] }] };
}
registerSkill({ id: 'hire-a.where', side: 'recruiter', match: (c) => (WHERE.test(c.norm) ? 0.9 : 0), handle: whereWasI });

// =====================================================================================================
// Search, shortlist and interview holds (org-scoped: Crumb & Co never sees Kora's pipeline)
// =====================================================================================================
function rankFound(w: World, m: MandateX) { return poolFor(w, m).sort((x, y) => (POOL[y].fit.length - POOL[y].unknown.length) - (POOL[x].fit.length - POOL[x].unknown.length) || POOL[y].years - POOL[x].years); }
function searchReply(c: QCtx, m?: MandateX): QReply {
  if (!m) return { msgs: [{ kind: 'reply', text: isFounder(c.actor) ? 'We need a role brief first. Tell me what you need help with and I’ll draft one.' : 'Which role should I search for?' }] };
  if (m.status === 'DRAFT') return { msgs: [{ kind: 'approval', ref: { type: 'hire-a.brief', id: m.id }, text: `“${m.title}” is still a draft, and I only search against an approved brief, so it’s clear what I’m looking for. Approve v${curV(m)} first?`, actions: [op(`Approve v${curV(m)}`, 'hire-a.mandate.approve', { id: m.id, v: curV(m) }, true), nav('Read it first', `/r/roles/${m.id}`)] }] };
  const found = rankFound(c.w, m);
  const top = found[0];
  const kora = m.orgId === 'org_kora';
  return { msgs: [{ kind: 'reply', used: [`${m.title} v${curV(m)} (approved)`, kora ? 'Applicants and Talent Q profiles shared with Kora Pay' : 'Talent Q profiles open to offers (simulated)'],
    text: found.length ? `I found ${found.length} people who could fit${kora ? '' : ', from Talent Q profiles that are open to offers (simulated)'}. ${top ? `${personOf(c.w, top)?.name} looks closest: ${POOL[top].fit[0].toLowerCase()}.` : ''} Pick the ones you want to look at closely; that’s your shortlist.` : 'I didn’t find anyone yet. I’ll keep looking and tell you when someone appears.',
    actions: found.length ? [ask('Shortlist the top 3'), ask('What’s a shortlist?')] : [] }],
    effects: (w, a) => { const mm = findM(w, m.id)!; runSearch(w, a, mm); ui(w, a, '/r/roles', { view: 'people' }); if (readA(w).intake[a.id]?.mandateId === m.id) setIntake(w, a, { step: 'searched' }); },
    frame: null, nav: { to: `/r/roles/${m.id}`, label: `people for ${m.title}` } };
}
registerOp('hire-a.search', (w, a, actor) => {
  const m = findM(w, String(a.id)); if (!m) return;
  const c = { w, actor, norm: '', route: '', text: '', ents: {} } as unknown as QCtx;
  const r = searchReply(c, m);
  r.effects?.(w, actor);
  for (const msg of r.msgs) qsay(w, actor, msg);
  w.q.frames[actor.id] = null;
  return r.nav ? { nav: r.nav } : undefined;
});
registerSkill({
  id: 'hire-a.search', side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId) return 0;
    const yes = /\b(find|search|look for|look|source|hunt)\b.*\b(people|candidates?|someone|somebody|engineers?|bookkeepers?|them|anyone|applicants?|assistants?|riders?|bakers?)\b|\bstart (the )?search\b|\bsearch now\b|\bwho is out there\b|\bany(one|body) (good|out there)\b/.test(c.norm) || near(c.norm, 'candidates') && /\b(find|get|show)\b/.test(c.norm);
    if (!yes) return 0;
    if (c.actor.orgId === 'org_kora' && (/\bsenior backend\b/.test(c.norm) || c.route === '/r/sourcing' || c.route === '/r/mandate')) return 0;
    return orgMandates(c.w, c.actor).length ? 0.84 : 0;
  },
  handle: (c) => searchReply(c, pickMandate(c.w, c.actor, c.norm, c.route)),
});

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, both: 2, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
registerSkill({
  id: 'hire-a.shortlist', side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId || !/\b(shortlist|short list|short-list|shorlist|add|keep|i like|put|remove|drop|take off)\b/.test(c.norm)) return 0;
    const m = pickMandate(c.w, c.actor, c.norm, c.route); const found = m ? readA(c.w).search[m.id]?.found ?? [] : [];
    if (!found.length) return /\b(shortlist|short list)\b/.test(c.norm) && !/\bwhat\b/.test(c.norm) ? 0.6 : 0;
    if (c.ents.people.some((p) => found.includes(p)) || /\b(top|first|best)\s+(\w+)\b|\ball of them\b|\bboth\b/.test(c.norm)) return 0.86;
    return 0;
  },
  handle: (c) => {
    const m = pickMandate(c.w, c.actor, c.norm, c.route);
    const found = m ? readA(c.w).search[m.id]?.found ?? [] : [];
    if (!m || !found.length) return { msgs: [{ kind: 'reply', text: 'There’s nobody to shortlist yet. Shall I search first?', actions: m ? [op('Find people', 'hire-a.search', { id: m.id }, true)] : [] }] };
    const remove = /\b(remove|drop|take off|take .* off)\b/.test(c.norm);
    let pids = c.ents.people.filter((p) => found.includes(p));
    const n = c.norm.match(/\b(?:top|first|best)\s+(\w+)\b/)?.[1];
    if (!pids.length && n && NUM[n]) pids = found.slice(0, NUM[n]);
    if (!pids.length && /\ball of them\b/.test(c.norm)) pids = [...found];
    if (!pids.length && /\bboth\b/.test(c.norm)) pids = found.slice(0, 2);
    if (!pids.length) return { msgs: [{ kind: 'question', text: `Who should go on the shortlist? For example “${firstName(c.w, found[0])} and ${firstName(c.w, found[1] ?? found[0])}”, or “the top 3”.` }] };
    const names = listNames(pids.map((p) => personOf(c.w, p)!.name));
    const total = remove ? c.w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED' && !pids.includes(e.personId)).length : new Set([...c.w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').map((e) => e.personId), ...pids]).size;
    return { msgs: [{ kind: 'reply', text: remove ? `${names} ${pids.length === 1 ? 'is' : 'are'} off the shortlist. ${total} left.` : `${names} ${pids.length === 1 ? 'is' : 'are'} on your shortlist (${total} in total). Next: meet them. I can suggest interview times and draft invitations; nothing is sent until you say so.`, actions: remove ? [] : [ask('Propose interview times'), nav('See the shortlist', `/r/roles/${m.id}`)] }],
      effects: (w, a) => setShort(w, a, m.id, pids, !remove), nav: { to: `/r/roles/${m.id}`, label: `people for ${m.title}` } };
  },
});
function setShort(w: World, a: Actor, id: string, pids: string[], on: boolean) {
  for (const e of w.pipeline) if (e.mandateId === id && pids.includes(e.personId)) { e.stage = on ? 'SHORTLISTED' : 'SOURCED'; e.at = simIso(w); e.by = a.id; }
  ui(w, a, '/r/roles', { view: 'people' });
  const m = findM(w, id)!;
  if (on && readA(w).intake[a.id]?.mandateId === id) setIntake(w, a, { step: 'shortlisted' });
  pushUndo(w, a.id, `${on ? 'Shortlist' : 'Remove'} ${listNames(pids.map((p) => firstName(w, p)))}`, 'hire-a.shortlist', { id, pids, on: !on, silent: true });
  emit(w, a.id, on ? 'pipeline.shortlisted' : 'pipeline.unshortlisted', scopeOf(a), `${a.name} ${on ? 'shortlisted' : 'removed from the shortlist'} ${listNames(pids.map((p) => personOf(w, p)?.name ?? p))} for “${m.title}”.`, { mandateId: id });
}
registerOp('hire-a.shortlist', (w, a, actor) => {
  const id = String(a.id); const pids = a.pids as string[]; const on = !!a.on;
  for (const e of w.pipeline) if (e.mandateId === id && pids.includes(e.personId)) { e.stage = on ? 'SHORTLISTED' : 'SOURCED'; e.at = simIso(w); e.by = actor.id; }
  if (!a.silent) { const m = findM(w, id); if (m) { pushUndo(w, actor.id, `${on ? 'Shortlist' : 'Remove'} ${listNames(pids.map((p) => firstName(w, p)))}`, 'hire-a.shortlist', { id, pids, on: !on, silent: true }); emit(w, actor.id, on ? 'pipeline.shortlisted' : 'pipeline.unshortlisted', scopeOf(actor), `${actor.name} ${on ? 'shortlisted' : 'removed from the shortlist'} ${listNames(pids.map((p) => personOf(w, p)?.name ?? p))} for “${m.title}”.`, { mandateId: id }); if (on && readA(w).intake[actor.id]?.mandateId === id) setIntake(w, actor, { step: 'shortlisted' }); } }
});

// ---------- Propose interview times (R1's minimal hand-off; full scheduling lives on Calendar) ----------
function slotsFrom(w: World, norm: string, n: number) {
  const hours = /\bafternoon/.test(norm) ? [14, 15, 16] : /\bmorning/.test(norm) ? [9, 10, 11] : [10, 14];
  const sat = /\bsaturday/.test(norm);
  const out: string[] = [];
  const d = new Date(simNow(w)); d.setUTCHours(0, 0, 0, 0);
  if (/\bnext week\b/.test(norm)) d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7) - 1);
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (sat ? dow !== 6 : dow === 0 || dow === 6) continue;
    for (const h of hours) if (out.length < n) out.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h - 1)).toISOString());
  }
  return out;
}
function proposeReply(c: QCtx, m: MandateX): QReply {
  const sl = c.w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').map((e) => e.personId);
  if (!sl.length) return { msgs: [{ kind: 'reply', text: 'Nobody is on the shortlist yet. Pick who you want to meet first, for example “shortlist the top 2”.' }] };
  const slots = slotsFrom(c.w, c.norm, sl.length);
  const plan = sl.map((pid, i) => ({ pid, start: slots[i] }));
  const tz = c.actor.timezone;
  return { msgs: [{ kind: 'approval', used: ['Your shortlist', 'Weekdays, 10:00 and 14:00 (you can change this)'],
    text: `Here’s a plan: ${plan.map((p) => `${personOf(c.w, p.pid)!.name}, ${dayLabel(p.start, tz)} at ${timeLabel(p.start, tz)}`).join('; ')}. I’ll hold these times on your calendar and draft an invitation to each person. Nothing is sent or booked: the holds are only on your side, and each invitation waits for your approval. Go ahead?`,
    why: 'Holds stop you double-booking while people reply. They are simulated in this prototype.',
    actions: [op('Hold the times and draft invitations', 'hire-a.propose', { id: m.id, plan }, true), ask('Afternoons instead'), ask('What’s a hold?')] }],
    frame: frame(R1, 'propose', { id: m.id, plan: JSON.stringify(plan) }) };
}
function proposeIn(w: World, a: Actor, id: string, plan: { pid: string; start: string }[]) {
  const m = findM(w, id); if (!m) return;
  const org = orgOf(w, a.orgId)?.name ?? 'us';
  const holds: string[] = []; const msgs: string[] = [];
  for (const p of plan) {
    const ev: CalEvent = { id: uid('cal'), orgId: m.orgId, title: `Interview hold: ${personOf(w, p.pid)!.name} (${m.title})`, start: p.start, end: new Date(new Date(p.start).getTime() + 45 * 60000).toISOString(), attendees: [a.id, p.pid], status: 'HOLD', mandateId: id, personId: p.pid, simulated: true };
    w.calendar.push(ev); holds.push(ev.id);
    let t: Thread | undefined = w.threads.find((x) => x.orgId === m.orgId && x.personId === p.pid && x.mandateId === id);
    if (!t) { t = { id: uid('t'), orgId: m.orgId, personId: p.pid, mandateId: id, messages: [] }; w.threads.push(t); }
    const msg: Msg = { id: uid('msg'), from: a.id, to: p.pid, subject: `Interview for ${m.title} at ${org}`, channel: 'EMAIL', status: 'DRAFT', at: now(),
      body: `Hello ${firstName(w, p.pid)},\n\nThank you for your interest in the ${m.title} role at ${org}. Could you come in for a 45-minute chat on ${dayLabel(p.start, a.timezone)} at ${timeLabel(p.start, a.timezone)}? If that time doesn’t work, reply with two times that suit you.\n\n${a.first}, ${org}` };
    t.messages.push(msg); msgs.push(msg.id);
  }
  const names = listNames(plan.map((p) => firstName(w, p.pid)));
  emit(w, a.id, 'calendar.hold.created', scopeOf(a), `${a.name} held ${plan.length} interview time${plan.length === 1 ? '' : 's'} for “${m.title}” (simulated).`, { mandateId: id });
  emit(w, 'q', 'message.drafted', scopeOf(a), `Q drafted ${plan.length} interview invitation${plan.length === 1 ? '' : 's'} (to ${names}) for ${a.first}’s approval. Not sent.`, { mandateId: id });
  if (m.status === 'SOURCING' || m.status === 'APPROVED') m.status = 'INTERVIEWING';
  if (readA(w).intake[a.id]?.mandateId === id) setIntake(w, a, { step: 'scheduled' });
  pushUndo(w, a.id, `Hold ${plan.length} interview times and draft invitations`, 'hire-a.unpropose', { holds, msgs });
  qsay(w, a, { kind: 'reply', used: ['Your shortlist', 'Your calendar (simulated)'], text: `Done, simulated: ${plan.length} time${plan.length === 1 ? '' : 's'} held on your calendar and ${plan.length} draft invitation${plan.length === 1 ? '' : 's'} (to ${names}). Nothing has been sent and nobody is booked. Each invitation waits in Messages for your approval; when someone replies, the Calendar page confirms the time.`,
    actions: [nav('Review the invitations', '/r/messages', true), nav('See the holds', '/r/calendar')] });
}
registerOp('hire-a.propose', (w, a, actor) => { proposeIn(w, actor, String(a.id), a.plan as { pid: string; start: string }[]); w.q.frames[actor.id] = null; });
registerOp('hire-a.unpropose', (w, a) => {
  const holds = a.holds as string[]; const msgs = a.msgs as string[];
  w.calendar = w.calendar.filter((e) => !holds.includes(e.id));
  for (const t of w.threads) t.messages = t.messages.filter((m) => !msgs.includes(m.id) || m.status !== 'DRAFT');
});
registerSkill({
  id: 'hire-a.propose', side: 'recruiter',
  match: (c) => {
    if (!isFounder(c.actor) || !c.actor.orgId) return 0;
    return /\b(propose|suggest|find|set up|setup|arrange|book|schedule|plan|organi[sz]e)\b.*\b(times?|interviews?|meet|meeting|chat)\b|\bcan i meet\b|\bmeet (them|her|him)\b|\binterview (them|her|him)\b/.test(c.norm) ? 0.88 : 0;
  },
  handle: (c) => { const m = pickMandate(c.w, c.actor, c.norm, c.route); return m ? proposeReply(c, m) : { msgs: [{ kind: 'reply', text: 'We need a role and a shortlist first.' }] }; },
});

// =====================================================================================================
// R5 · Bayo: contradictions, permissions, fair criteria, memory correction, source conflicts, audit
// =====================================================================================================
const LEVEL = 'hire-a.r5.level';
function levelReply(c: QCtx, m: MandateX | undefined, v: 'SENIOR' | 'ALL'): Omit<QReply, 'msgs'> & { msgs: ReplyMsg[] } {
  const pool = m ? (readA(c.w).search[m.id]?.found ?? []) : [];
  const hidden = pool.filter((p) => levelOf(p) && levelOf(p) !== 'SENIOR');
  return { msgs: [{ kind: 'reply', text: v === 'SENIOR' ? `Done. ${m ? `The ${m.title} list` : 'Searches'} now show senior people only.${hidden.length ? ` That hides ${listNames(hidden.map((p) => `${personOf(c.w, p)!.name} (${LEVEL_LABEL[levelOf(p)!].toLowerCase()})`))}.` : ''}` : `Done. Junior and mid-level people are back in ${m ? `the ${m.title} list` : 'your searches'}${hidden.length ? `: ${listNames(hidden.map((p) => personOf(c.w, p)!.name))}` : ''}. Your earlier “only seniors” is replaced, and both instructions stay in the audit log.` }],
    effects: (w, a) => { const s = hireA(w); (s.instructions[a.id] ??= []).push({ key: 'level', value: v, text: c.text, at: now() }); ui(w, a, '/r/roles', { view: 'people' }); emit(w, a.id, 'search.instruction', scopeOf(a), `${a.name} told Q: ${v === 'SENIOR' ? 'show senior people only' : 'include junior and mid-level people'}${m ? ` for “${m.title}”` : ''}.`, { value: v }); },
    frame: null, nav: m ? { to: `/r/roles/${m.id}`, label: `people for ${m.title}` } : undefined };
}
registerSkill({
  id: LEVEL, side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId) return 0;
    if (/\b(why|where|how come)\b.*\bjuniors?\b|\bno juniors\s*\?|\b(show|include|add|want|need|see|bring back)\b.*\b(juniors?|graduates|entry[- ]level)\b/.test(c.norm)) return 0.88;
    if (/\b(only|just)\b.*\bseniors?\b|\bseniors? only\b|\bno juniors\b|\bhide (the )?juniors\b/.test(c.norm)) return 0.86;
    return 0;
  },
  handle: (c) => {
    const m = pickMandate(c.w, c.actor, c.norm, c.route);
    const wantsJuniors = /\b(why|where|how come)\b.*\bjuniors?\b|\bno juniors\s*\?|\b(show|include|add|want|need|see|bring back)\b.*\b(juniors?|graduates|entry[- ]level)\b/.test(c.norm);
    const cur = (readA(c.w).instructions[c.actor.id] ?? []).filter((i) => i.key === 'level').pop();
    if (wantsJuniors && cur?.value === 'SENIOR') {
      return { msgs: [{ kind: 'question', used: [`Your instruction, ${timeLabel(cur.at, c.actor.timezone)} today: “${cur.text}”`],
        text: `Because earlier you told me “${cur.text}”, so I’m showing senior people only. Asking for juniors now contradicts that, and I don’t want to guess which you meant. Which should I keep?`,
        why: 'Two of your instructions conflict. Q doesn’t silently pick one.',
        actions: [op('Keep seniors only', 'hire-a.level', { v: 'SENIOR', id: m?.id ?? '' }), op('Include juniors too', 'hire-a.level', { v: 'ALL', id: m?.id ?? '' }, true)] }],
        frame: frame(LEVEL, 'choice', { id: m?.id ?? '' }) };
    }
    if (wantsJuniors) return levelReply(c, m, 'ALL');
    if (cur?.value === 'SENIOR') return { msgs: [{ kind: 'reply', text: 'That’s already the case: I’m showing senior people only.' }] };
    return levelReply(c, m, 'SENIOR');
  },
  answer: (c) => {
    if (strongOther(c, LEVEL, 0.9)) return null;
    const m = findM(c.w, c.frame!.slots.id);
    if (/\b(keep|stick|seniors?)\b/.test(c.norm) && !/\bjuniors?\b/.test(c.norm)) return { ...levelReply(c, m, 'SENIOR'), msgs: [{ kind: 'reply', text: 'Keeping seniors only. Juniors stay hidden; you can ask for them any time.' }] };
    if (/\b(juniors?|both|all|include|everyone|show them)\b/.test(c.norm)) return levelReply(c, m, 'ALL');
    return null;
  },
});
registerOp('hire-a.level', (w, a, actor) => {
  const v = a.v as 'SENIOR' | 'ALL'; const m = findM(w, String(a.id));
  (hireA(w).instructions[actor.id] ??= []).push({ key: 'level', value: v, text: v === 'SENIOR' ? 'keep seniors only' : 'include juniors too', at: now() });
  emit(w, actor.id, 'search.instruction', scopeOf(actor), `${actor.name} resolved a conflict: ${v === 'SENIOR' ? 'keep senior people only' : 'include junior and mid-level people'}${m ? ` for “${m.title}”` : ''}.`, { value: v });
  w.q.frames[actor.id] = null; ui(w, actor, '/r/roles', { view: 'people' });
  return { say: v === 'SENIOR' ? 'Keeping seniors only. The list is unchanged.' : 'Done: juniors and mid-level people are back in the list, marked by level. The earlier “only seniors” is replaced.', nav: m ? { to: `/r/roles/${m.id}`, label: `people for ${m.title}` } : undefined };
});

// ---------- Contradictory demands: name the trade-off and ask ----------
const TRADE = 'hire-a.r5.tradeoff';
registerSkill({
  id: TRADE, side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId || isFounder(c.actor)) return 0;
    const seniorCheap = /\b(senior|experienced|strong|top|best)\b/.test(c.norm) && /\b(cheap|cheaper|low (budget|pay|salary|cost)|not pay much|lower pay|inexpensive|less money|under budget|on a budget)\b/.test(c.norm);
    const fastThorough = /\b(fast|quick|quickly|asap|this week|urgent|by friday|tomorrow)\b/.test(c.norm) && /\b(thorough|careful|properly|every|deep|full check|all the checks)\b/.test(c.norm);
    return seniorCheap || fastThorough ? 0.88 : 0;
  },
  handle: (c) => {
    const m = pickMandate(c.w, c.actor, c.norm, c.route);
    const sc = /\b(cheap|cheaper|low|not pay much|lower pay|inexpensive|less money|budget)\b/.test(c.norm);
    if (sc) return { msgs: [{ kind: 'question', used: m ? [`${m.title}: ${payText(m)}`] : [], why: 'Q names trade-offs instead of quietly favouring one half of a request.',
      text: `Those two pull against each other. Senior engineers who have run payouts in production usually ask ${m ? payText(m).toLowerCase() : 'at the top of the band'} or more; a lower budget mostly reaches mid-level people. Which matters more for this hire?`,
      actions: [op('Senior, keep the pay band', 'hire-a.tradeoff', { choice: 'senior', id: m?.id ?? '' }, true), op('Mid-level, lower band', 'hire-a.tradeoff', { choice: 'mid', id: m?.id ?? '' }), ask('Show me what each would cost')] }], frame: frame(TRADE, 'choice', { kind: 'cost', id: m?.id ?? '' }) };
    return { msgs: [{ kind: 'question', why: 'Q names trade-offs instead of quietly favouring one half of a request.',
      text: 'Fast and thorough pull against each other here. Fast: a shortlist by Friday from the people already found, with evidence checks on the top three only. Thorough: work samples and reference checks for everyone, about a week longer. Which do you want?',
      actions: [op('Fast: shortlist by Friday', 'hire-a.tradeoff', { choice: 'fast', id: m?.id ?? '' }, true), op('Thorough: full checks', 'hire-a.tradeoff', { choice: 'thorough', id: m?.id ?? '' })] }], frame: frame(TRADE, 'choice', { kind: 'speed', id: m?.id ?? '' }) };
  },
  answer: (c) => {
    if (strongOther(c, TRADE, 0.9)) return null;
    const ch = /\bsenior\b/.test(c.norm) ? 'senior' : /\bmid\b|\bcheaper\b|\blower\b/.test(c.norm) ? 'mid' : /\bfast|quick\b/.test(c.norm) ? 'fast' : /\bthorough|full\b/.test(c.norm) ? 'thorough' : null;
    if (/\bwhat each would cost|cost\b/.test(c.norm)) return { msgs: [{ kind: 'reply', used: ['Illustrative pay guide, Lagos 2026'], text: 'Roughly, for Lagos backend engineers: senior ₦1.8m–₦2.8m a month, mid-level ₦1.1m–₦1.6m (illustrative, not a quote). A mid-level hire usually needs more support on payout incidents in the first months.' }] };
    if (!ch) return null;
    return { msgs: [], frame: null, effects: (w, a) => tradeoff(w, a, ch, c.frame!.slots.id) };
  },
});
function tradeoff(w: World, a: Actor, choice: string, id: string) {
  const m = findM(w, id);
  const text = choice === 'senior' ? 'Keeping senior and the current pay band.' : choice === 'mid' ? 'Noted: mid-level at a lower band. That changes the brief, so I’ve made it a new draft version for approval.' : choice === 'fast' ? 'Fast it is: a shortlist by Friday, with evidence checks on the top three.' : 'Thorough it is: work samples and references for everyone. I’ll tell you when each check finishes.';
  if (choice === 'mid' && m) revise(w, a, m.id, { pay: { min: 1100000, max: 1600000 }, title: m.title.replace(/^Senior /, '') }, 'Mid-level at ₦1.1m–₦1.6m (Bayo’s trade-off choice)');
  emit(w, a.id, 'search.instruction', scopeOf(a), `${a.name} chose a trade-off: ${choice}.`, { choice });
  qsay(w, a, { kind: 'reply', text });
  w.q.frames[a.id] = null;
}
registerOp('hire-a.tradeoff', (w, a, actor) => { tradeoff(w, actor, String(a.choice), String(a.id)); });

// ---------- Actions outside your role: refuse, name who can, offer to ask them ----------
const OFFER = /\b(send|make|give|extend|issue|draft)\b.*\b(offer|ofer|offr|offers)\b|\boffer (letter|to)\b/;
const POLICY = /\b(change|turn off|disable|remove|update|edit|switch off|drop|get rid of|scrap|override|relax)\b.*\b(policy|policies|rule|rules|guideline|guidelines|panel of two|approve each send|approval setting|delegation|handbook)\b/;
const BULK = /\b(send|message|email|blast)\b.*\b(all of them|everyone|them all|all (the )?(candidates|people|shortlist))\b/;
registerSkill({
  id: 'hire-a.perm', side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId || isFounder(c.actor)) return 0;
    if (OFFER.test(c.norm) && !/\bwho can\b/.test(c.norm)) return 0.93;
    if (POLICY.test(c.norm)) return 0.9;
    if (BULK.test(c.norm)) return 0.9;
    return 0;
  },
  handle: (c) => {
    const a = c.actor; const org = orgOf(c.w, a.orgId)!;
    if (BULK.test(c.norm) && !OFFER.test(c.norm)) {
      const m = pickMandate(c.w, a, c.norm, c.route);
      let pids = m ? c.w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').map((e) => e.personId) : [];
      let title = m?.title ?? '';
      if (!pids.length && a.orgId === 'org_kora') { pids = c.w.pipeline.filter((e) => e.mandateId === 'm_backend' && e.stage === 'SHORTLISTED').map((e) => e.personId); title = 'Senior Backend Engineer'; }
      const approvers = whoCan(c.w, a, 'approve_send');
      if (!pids.length) return { msgs: [{ kind: 'reply', text: 'There’s nobody on a shortlist to message yet.' }] };
      return { msgs: [{ kind: 'refusal', used: [`${org.name}: ${org.delegation === 'APPROVE_EACH_SEND' ? 'approve each send' : org.delegation.toLowerCase()}`, `Your role: ${ROLE_LABEL[a.role!]}`],
        text: `I can’t send them all now. ${org.name} approves every message one at a time, and there’s no “send all” that skips that${can(a, 'approve_send') ? '' : `; as ${ROLE_LABEL[a.role!]} you can’t approve sends either`}. What I’ve done instead: prepared ${pids.length} drafts (to ${listNames(pids.map((p) => personOf(c.w, p)!.name))}), each waiting for ${can(a, 'approve_send') ? 'your' : listNames(approvers.filter((x) => x.role === 'RECRUITER' || x.role === 'ADMIN').map((x) => x.first))}${can(a, 'approve_send') ? '' : '’s'} approval. Nothing has been sent.`,
        why: 'Approve each send is an organisation rule; Q prepares but never bulk-sends.',
        actions: [nav('See the drafts', '/r/messages', true), ...(approvers[0] ? [op(`Ask ${approvers[0].first} to review them`, 'hire-a.request', { to: approvers.find((x) => x.role === 'RECRUITER')?.id ?? approvers[0].id, what: `review ${pids.length} outreach drafts for ${title}` })] : [])] }],
        effects: (w, me) => {
          for (const pid of pids) {
            let t = w.threads.find((x) => x.orgId === me.orgId && x.personId === pid && x.mandateId === (m?.id ?? 'm_backend'));
            if (!t) { t = { id: uid('t'), orgId: me.orgId!, personId: pid, mandateId: m?.id ?? 'm_backend', messages: [] }; w.threads.push(t); }
            if (!t.messages.some((x) => x.status === 'AWAITING_APPROVAL')) t.messages.push({ id: uid('msg'), from: me.id, to: pid, subject: `${title} at ${org.name}`, body: `Hello ${firstName(w, pid)},\n\nI lead engineering at ${org.name}. We’re hiring a ${title} and your work stood out. Would you be open to a short call?\n\n${me.first}, ${org.name}`, at: now(), status: 'AWAITING_APPROVAL', channel: 'EMAIL' });
          }
          emit(w, me.id, 'q.permission.declined', scopeOf(me), `${me.name} asked Q to send messages to all shortlisted people at once. Q prepared ${pids.length} drafts for approval instead (approve each send).`);
        } };
    }
    const cap = OFFER.test(c.norm) ? 'send_offer' : 'change_policy';
    if (can(a, cap)) return { msgs: [{ kind: 'reply', text: cap === 'send_offer' ? 'Offers aren’t part of this prototype yet. I can draft the offer conversation as a message for your approval.' : 'You can change that in Organisation and policy. I’ll open it.' }], nav: cap === 'change_policy' ? { to: '/r/setup', label: 'organisation and policy' } : undefined };
    const who = whoCan(c.w, a, cap).filter((x) => cap !== 'send_offer' || x.role !== 'OWNER');
    const person = c.ents.people[0] ? personOf(c.w, c.ents.people[0]) : undefined;
    const what = cap === 'send_offer' ? `send an offer${person ? ` to ${person.name}` : ''}` : `change ${org.name}’s policy (“${c.text.slice(0, 80)}”)`;
    return { msgs: [{ kind: 'refusal', used: [`Your role: ${ROLE_LABEL[a.role!]}`, `${org.name} roles and permissions`],
      text: `I can’t ${what} for you. At ${org.name}, ${cap === 'send_offer' ? 'offers are sent by' : 'policy is changed by'} ${listNames(who.map((x) => `${x.name} (${ROLE_LABEL[x.role!]})`))}; you’re a ${ROLE_LABEL[a.role!]}. I can ask ${who.length > 1 ? 'one of them' : who[0]?.first ?? 'them'} for you${cap === 'send_offer' ? ', with your recommendation attached' : ''}.`,
      actions: [...who.slice(0, 2).map((x, i) => op(`Ask ${x.first}`, 'hire-a.request', { to: x.id, what, pid: person?.personId ?? '' }, i === 0)), ask('No thanks')] }],
      effects: (w, me) => emit(w, me.id, 'q.permission.declined', scopeOf(me), `Q declined a request outside ${me.first}’s role (${ROLE_LABEL[me.role!]}): ${what}.`) };
  },
});
registerOp('hire-a.request', (w, a, actor) => {
  const to = String(a.to); const what = String(a.what); const target = actorOf(w, to);
  hireA(w).requests.push({ id: uid('rq'), from: actor.id, to, what, text: what, at: now() });
  emit(w, actor.id, 'request.created', scopeOf(actor), `${actor.name} asked ${target.name} to ${what}.`);
  appendQ(w, to, { who: 'q', engine: 'rules', kind: 'notice', text: `${actor.name} asked you to ${what}. Reply here or open the role to act on it.` });
  return { say: `Asked ${target.name} (inside Talent Q, simulated). It’s waiting in ${target.first}’s conversation with me. I’ll tell you when ${target.first} acts on it.` };
});

// ---------- Fair hiring: job-related alternatives after the core guard declines ----------
const PROXIES: { re: RegExp; label: string; redirect: string }[] = [
  { re: /\bgraduat\w* (after|before|since|from|in the last) (19|20)?\d\d\b|\bdigital natives?\b|\bfresh blood\b|\bnot too old\b/, label: 'age (through graduation year or “fresh blood”)', redirect: 'recent, hands-on experience with the tools the job uses' },
  { re: /\bno (career )?gaps\b|\bgaps? in (their|the|his|her) cv\b|\bwithout (any )?gaps\b/, label: 'career gaps, which often come from caregiving, illness or study', redirect: 'recent, relevant experience the job needs' },
  { re: /\bnative (english )?speakers?\b|\b(no|without) (an )?accents?\b|\bneutral accent\b/, label: 'origin (through accent or “native speaker”)', redirect: 'the language level the job needs, checked the same way for everyone' },
  { re: /\bpresentable\b|\bgood appearance\b/, label: 'appearance', redirect: 'how they work with customers, judged from references and a conversation' },
];
registerSkill({
  id: 'hire-a.fair.proxy', side: 'recruiter',
  match: (c) => (PROXIES.some((p) => p.re.test(c.norm)) ? 0.96 : 0),
  handle: (c) => {
    const p = PROXIES.find((x) => x.re.test(c.norm))!;
    return { msgs: [{ kind: 'refusal', text: `I can’t use that. It stands in for ${p.label}, which isn’t related to doing the job and shuts out good people. If there’s a real need behind it, I can use ${p.redirect} instead.`, actions: [ask('Let me describe what the job actually needs'), ask('Why is that a rule?')] }],
      effects: (w, a) => emit(w, a.id, 'q.policy.declined', scopeOf(a), `Q declined a criterion that stands in for ${p.label}. Nothing was applied to any search.`, { criterion: 'proxy' }) };
  },
});
function jobRelated(w: World, m?: MandateX): { label: string; plain: string }[] {
  if (m?.orgId === 'org_kora' || !m) return [
    { label: 'Has run payouts in production', plain: 'Has operated a payout or transfer system with real money' },
    { label: 'On-call one week in four', plain: 'Can join the on-call rota one week in four' },
    { label: 'Lagos office 3 days a week', plain: 'Can work from the Lagos office three days a week' }];
  const r = readA(w).meta[m.id]?.roleKey;
  return r === 'bookkeeper' ? [{ label: 'Can start at 8am on shop days', plain: 'Available from 8am on the days they work' }, { label: 'Has used a POS report', plain: 'Can read the daily POS settlement report' }]
    : [{ label: 'Can work Saturdays', plain: 'Available on Saturdays, the busiest day' }, { label: 'Can be at the shop by 7am', plain: 'Can open the shop at 7am' }];
}
registerSkill({
  id: 'hire-a.fair.redirect', side: 'recruiter',
  match: (c) => (/\b(describe what the job (actually |really )?needs|what (can|should) i (filter|ask|look|use)( for| by)?( instead)?|job[- ]related (criteria|things|questions)|what is allowed)\b/.test(c.norm) ? 0.85 : 0),
  handle: (c) => {
    const m = pickMandate(c.w, c.actor, c.norm, c.route);
    const opts = jobRelated(c.w, m);
    return { msgs: [{ kind: 'question', used: m ? [`${m.title} v${curV(m)}`, 'Fair-hiring rules'] : ['Fair-hiring rules'], text: `Good. Here are job-related things I can use${m ? ` for “${m.title}”` : ''}, applied the same way to everyone. Pick any to add to the brief, or tell me your own in terms of the work.`,
      actions: m ? opts.map((o, i) => op(o.label, 'hire-a.addreq', { id: m.id, label: o.label, plain: o.plain }, i === 0)) : [] }] };
  },
});
registerOp('hire-a.addreq', (w, a, actor) => {
  const m = findM(w, String(a.id)); if (!m) return;
  if (!can(actor, 'edit_brief')) return { say: 'You can’t change this brief with your role.' };
  if (m.requirements.some((r) => r.label === a.label)) return { say: 'That’s already in the brief.' };
  revise(w, actor, m.id, { requirements: [...m.requirements, { reqId: uid('rq'), label: String(a.label), mustHave: true, plain: String(a.plain) }] }, `Added “${a.label}”`);
  const mm = findM(w, m.id)!;
  qsay(w, actor, { kind: 'approval', ref: { type: 'hire-a.brief', id: m.id }, text: `Added “${a.label}” as a must-have. That’s a change, so the brief is now v${curV(mm)} and needs approval again.`, actions: [op(`Approve v${curV(mm)}`, 'hire-a.mandate.approve', { id: m.id, v: curV(mm) }, true)] });
  return { nav: { to: `/r/roles/${m.id}`, label: 'the role brief' } };
});

// ---------- Memory: show what Q remembered, its source, and correct it ----------
const MEMFIX = 'hire-a.memfix';
const STOP = new Set(['that', 'this', 'with', 'what', 'have', 'never', 'said', 'wrong', 'about', 'your', 'from', 'were', 'there', 'they', 'remember', 'remembered', 'true', 'does', 'you', 'fine', 'okay']);
function memHits(w: World, a: Actor, norm: string) {
  const words = norm.replace(/[^a-z ]/g, ' ').split(' ').filter((x) => x.length > 3 && !STOP.has(x));
  return w.memories.filter((m) => m.lifecycle_status === 'active' && m.tenant_id === a.orgId && m.visibility_scope !== 'CANDIDATE_PRIVATE_PRACTICE' && (m.owner_id === a.id || m.visibility_scope === 'TEAM' || m.visibility_scope === 'ORGANIZATION')
    && words.some((x) => m.retrieval_tags.includes(x) || m.content.toLowerCase().includes(x)))
    .sort((x, y) => Number(y.owner_id === a.id) - Number(x.owner_id === a.id));
}
const TRUTH_PLAIN: Record<string, string> = { STATED_BY_USER: 'you said this', VERIFIED_FACT: 'a checked fact', THIRD_PARTY_CLAIM: 'someone else’s claim', INFERENCE: 'my inference, not something you said directly', ORG_POLICY: 'an organisation rule' };
registerSkill({
  id: MEMFIX, side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId) return 0;
    const wrong = /\b(wrong|not true|never said|did not say|didnt say|that is not right|incorrect|got (that|it) wrong|not what i said|i never|thats wrong|that is wrong)\b/.test(c.norm);
    const show = /\bwhat do you (remember|know|have)\b.*\babout\b/.test(c.norm);
    if (!wrong && !show) return 0;
    return memHits(c.w, c.actor, c.norm).length ? (wrong ? 0.92 : 0.84) : 0;
  },
  handle: (c) => {
    const hit = memHits(c.w, c.actor, c.norm)[0];
    if (!hit) return { msgs: [{ kind: 'reply', text: 'I can’t find anything I remember about that.', actions: [nav('Show what you remember', '/r/memory')] }] };
    const src = hit.source_refs[0];
    const wrong = !/\bwhat do you (remember|know|have)\b/.test(c.norm);
    const remoteish = hit.retrieval_tags.includes('remote');
    return { msgs: [{ kind: wrong ? 'question' : 'reply', ref: { type: 'hire-a.memory', id: hit.memory_id }, used: [src.label],
      text: `Here’s what I had: “${hit.content}” Source: ${src.label}${src.quote ? ` (“${src.quote}”)` : ''}. That was ${TRUTH_PLAIN[hit.truth_class]}${hit.truth_class === 'INFERENCE' ? ', so I shouldn’t have treated it as your rule' : ''}.${wrong ? ' What should I remember instead?' : ''}`,
      actions: wrong ? [...(remoteish ? [op('Hybrid: Lagos office 3 days a week', 'hire-a.memory.correct', { id: hit.memory_id, text: 'Payouts role: hybrid, in the Lagos office at least 3 days a week. Fully remote is not fine.' }, true), op('Onsite in Lagos only', 'hire-a.memory.correct', { id: hit.memory_id, text: 'Payouts role: onsite in Lagos only. Remote is not fine.' })] : []), op('Just forget it', 'hire-a.memory.forget', { id: hit.memory_id })] : [nav('See everything Q remembers', '/r/memory')] }],
      frame: wrong ? frame(MEMFIX, 'value', { id: hit.memory_id }) : undefined };
  },
  answer: (c) => {
    if (strongOther(c, MEMFIX)) return null;
    if (c.text.trim().split(' ').length < 2 || c.text.trim().endsWith('?')) return null;
    const id = c.frame!.slots.id;
    return { msgs: [], frame: null, effects: (w, a) => correctMemory(w, a, id, c.text.trim()) };
  },
});
function correctMemory(w: World, a: Actor, id: string, text: string) {
  const old = w.memories.find((m) => m.memory_id === id); if (!old) return;
  old.lifecycle_status = 'superseded';
  const nid = uid('mem');
  const remoteOk = /\bremote\b/i.test(text) ? !/\b(not|no|never|isn.t|onsite|hybrid)\b/i.test(text) : old.structured_value.remoteOk;
  w.memories.unshift({ ...old, memory_id: nid, content: text, structured_value: { ...old.structured_value, remoteOk }, supersedes_id: id, lifecycle_status: 'active', truth_class: 'STATED_BY_USER', write_mode: 'USER_CONFIRMED', evidence_status: 'SUPPORTED',
    recorded_at: now(), last_confirmed_at: now(), source_refs: [{ kind: 'MESSAGE', ref: nid, label: `Your correction, ${dayLabel(simIso(w))}`, quote: text, at: now() }, ...old.source_refs] });
  pushUndo(w, a.id, 'Correct a memory', 'hire-a.memory.uncorrect', { nid, id });
  emit(w, a.id, 'memory.corrected', scopeOf(a), `${a.name} corrected what Q remembered: “${old.content}” is replaced by “${text}”.`, { memoryId: nid, supersedes: id });
  qsay(w, a, { kind: 'reply', ref: { type: 'hire-a.memory', id: nid }, text: `Corrected. From now on I’ll use: “${text}” The old version is kept in history, marked as replaced, so you can see what changed.${remoteOk === false ? ' Kunle Bakare is in Nairobi, so I’ve marked his location as a mismatch on the Payouts list rather than removing him.' : ''}`, actions: [nav('See what Q remembers', '/r/memory')] });
  w.q.frames[a.id] = null;
}
registerOp('hire-a.memory.correct', (w, a, actor) => { correctMemory(w, actor, String(a.id), String(a.text)); });
registerOp('hire-a.memory.forget', (w, a, actor) => {
  const m = w.memories.find((x) => x.memory_id === a.id); if (!m) return;
  m.lifecycle_status = 'forgotten'; m.delete_or_revoke_state = 'DELETE_REQUESTED';
  emit(w, actor.id, 'memory.forgotten', scopeOf(actor), `${actor.name} asked Q to forget: “${m.content}”.`);
  w.q.frames[actor.id] = null;
  return { say: 'Forgotten. I won’t use it, and I won’t assume anything about that until you tell me.' };
});
registerOp('hire-a.memory.uncorrect', (w, a) => { w.memories = w.memories.filter((m) => m.memory_id !== a.nid); const o = w.memories.find((m) => m.memory_id === a.id); if (o) o.lifecycle_status = 'active'; });

// ---------- Source conflicts: show both, never pick silently ----------
export const CONFLICTS: Record<string, { a: string; b: string; topic: string; aSays: string; bSays: string; why: string }> = {
  p_kunle: { a: 'e_ha_kunle_cv', b: 'e_ha_kunle_gh', topic: 'years of Go experience', aSays: '6 years (since 2020)', bSays: 'about 2 years (since March 2024)', why: 'GitHub only shows public work, so private company code wouldn’t appear; the CV is his own claim.' },
};
registerSkill({
  id: 'hire-a.conflict', side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId) return 0;
    const pid = c.ents.people.find((p) => CONFLICTS[p]);
    if (!pid) return /\b(sources?|cv and github)\b.*\b(disagree|conflict|differ)\b/.test(c.norm) ? 0.8 : 0;
    if (/\b(years?|yrs|experience|how long|dates?|cv|github|sources?|disagree|conflict)\b/.test(c.norm)) return 0.92;
    return /\b(experienced|senior|real|true|accurate|legit|check|lying|lie)\b/.test(c.norm) ? 0.88 : 0;
  },
  handle: (c) => {
    const pid = c.ents.people.find((p) => CONFLICTS[p]) ?? 'p_kunle';
    const cf = CONFLICTS[pid]; const p = personOf(c.w, pid)!;
    const vis = visibleEvidence(c.w, pid, c.actor.orgId!).map((e) => e.evidenceId);
    if (!vis.includes(cf.a) || !vis.includes(cf.b)) return { msgs: [{ kind: 'reply', text: `I can’t see ${p.name.split(' ')[0]}’s sources from ${orgOf(c.w, c.actor.orgId)?.name}. They haven’t been shared with you.` }] };
    const done = readA(c.w).conflicts[pid];
    return { msgs: [{ kind: 'reply', ref: { type: 'hire-a.conflict', id: pid }, used: ['CV (Kunle’s own claim)', 'Public GitHub profile'], why: 'Two sources give different numbers. Talent Q shows both and never picks one silently.',
      text: `Two sources disagree about ${p.name}’s ${cf.topic}, and I haven’t picked one. His CV says ${cf.aSays}. His public GitHub shows ${cf.bSays}. Both could be true: ${cf.why}${done ? ` You chose to ${done === 'INTERVIEW' ? 'check it in the interview' : 'ask him'}.` : ' How do you want to handle it?'}`,
      actions: done ? [] : [op('Check it in the interview', 'hire-a.conflict', { pid, how: 'INTERVIEW' }, true), op('Draft a question to Kunle', 'hire-a.conflict', { pid, how: 'ASKED' })] }] };
  },
});
registerOp('hire-a.conflict', (w, a, actor) => {
  const pid = String(a.pid); const how = a.how as 'INTERVIEW' | 'ASKED';
  hireA(w).conflicts[pid] = how;
  const name = personOf(w, pid)?.name ?? pid;
  if (how === 'ASKED') {
    let t = w.threads.find((x) => x.orgId === actor.orgId && x.personId === pid);
    if (!t) { t = { id: uid('t'), orgId: actor.orgId!, personId: pid, mandateId: 'm_payouts', messages: [] }; w.threads.push(t); }
    t.messages.push({ id: uid('msg'), from: actor.id, to: pid, subject: 'A quick question about your Go experience', channel: 'EMAIL', status: can(actor, 'approve_send') ? 'DRAFT' : 'AWAITING_APPROVAL', at: now(),
      body: `Hello ${name.split(' ')[0]},\n\nThanks for sharing your CV and GitHub. Your CV mentions Go since 2020, and your public GitHub shows Go from 2024. Could you tell us a little about the Go work before 2024? Private or company code is completely fine; a short description is enough.\n\n${actor.first}, Kora Pay` });
  }
  emit(w, actor.id, 'evidence.conflict.handled', scopeOf(actor), `${actor.name} chose to ${how === 'INTERVIEW' ? 'check in the interview' : 'ask'} ${name} about conflicting sources (${CONFLICTS[pid]?.topic}). Neither source was discarded.`);
  return { say: how === 'INTERVIEW' ? `Added to ${name.split(' ')[0]}’s interview plan: “Walk us through your Go work before 2024.” Both sources stay on his profile, marked as disagreeing.` : `Drafted a short, neutral question to ${name.split(' ')[0]}. It isn’t sent: ${can(actor, 'approve_send') ? 'it’s waiting for you in Messages' : 'Ada or Ngozi approves each send'}.` };
});

// ---------- Audit: "who changed the panel", "what did you do yesterday" ----------
const CHANGED = /\b(changed|change|chnaged|chaged|chagned|edited|edit|updated|modified|swapped|removed|added|approved|deleted|touched|moved|messed with|altered)\b/;
const SUBJECTS: { kw: string[]; label: string; re: RegExp }[] = [
  { kw: ['panel', 'pannel', 'interviewers'], label: 'panel', re: /panel/ },
  { kw: ['policy', 'guideline', 'rule', 'rules', 'handbook'], label: 'policy', re: /policy|guideline/ },
  { kw: ['brief', 'mandate', 'role', 'payouts'], label: 'brief', re: /mandate|brief/ },
  { kw: ['memory', 'remember'], label: 'memory', re: /memory/ },
  { kw: ['message', 'outreach', 'email'], label: 'messages', re: /message/ },
];
const orgEvents = (w: World, a: Actor) => w.events.filter((e) => a.orgId && (e.scope === `ORG:${a.orgId}` || e.scope.startsWith(`SHARED:${a.orgId}:`)));
registerSkill({
  id: 'hire-a.audit.who', side: 'recruiter',
  match: (c) => (c.actor.orgId && /\bwho\b/.test(c.norm) && CHANGED.test(c.norm) && SUBJECTS.some((s) => s.kw.some((k2) => near(c.norm, k2))) ? 0.88 : 0),
  handle: (c) => {
    const subj = SUBJECTS.find((s) => s.kw.some((k2) => near(c.norm, k2)))!;
    const evs = orgEvents(c.w, c.actor).filter((e) => !/declined|request|unhandled|instruction/.test(e.type) && (subj.re.test(e.type) || subj.kw.some((k2) => e.text.toLowerCase().includes(k2)))).sort((x, y) => y.at.localeCompare(x.at));
    const hit = evs[0];
    const when = hit ? `${dayLabel(hit.at, c.actor.timezone)} at ${timeLabel(hit.at, c.actor.timezone)}` : '';
    return { msgs: [{ kind: 'reply', used: [`${orgOf(c.w, c.actor.orgId)?.name} audit log`],
      text: hit ? `${actorName(c.w, hit.actor)} did, on ${when}. ${hit.text}${evs.length > 1 ? ` There ${evs.length - 1 === 1 ? 'is 1 earlier change' : `are ${evs.length - 1} earlier changes`} to the ${subj.label} in the log.` : ''} I’ve opened the audit log filtered to “${subj.label}”.` : `I can’t find a recorded change to the ${subj.label} in ${orgOf(c.w, c.actor.orgId)?.name}’s log.`,
      actions: [nav('Open the audit log', '/r/audit')] }],
      effects: (w, a) => { ensureSeed(w); ui(w, a, '/r/audit', { q: subj.label, who: 'all', type: 'all', day: 'all' }); }, nav: { to: '/r/audit', label: 'the audit log' } };
  },
});
registerSkill({
  id: 'hire-a.audit.did', side: 'recruiter',
  match: (c) => (c.actor.orgId && (/\bwhat (did|have|has) (you|q) (do|done|did|been doing)\b|\bwat did (you|u) do\b|\bwhat you did\b|\byour (actions|activity)\b|\bwhat did q do\b/.test(c.norm)) ? 0.88 : 0),
  handle: (c) => {
    const a = c.actor; const tz = a.timezone;
    const yest = /\byesterday|yday|yesterdy\b/.test(c.norm);
    const d = new Date(simNow(c.w).getTime() - (yest ? 864e5 : 0));
    const day = d.toLocaleDateString('en-CA', { timeZone: tz });
    const evs = orgEvents(c.w, a).filter((e) => e.actor === 'q' && new Date(e.at).toLocaleDateString('en-CA', { timeZone: tz }) === day).sort((x, y) => x.at.localeCompare(y.at));
    return { msgs: [{ kind: 'reply', used: [`${orgOf(c.w, a.orgId)?.name} audit log`],
      text: evs.length ? `${yest ? 'Yesterday' : 'Today'} I did ${evs.length} thing${evs.length === 1 ? '' : 's'} at ${orgOf(c.w, a.orgId)?.name}: ${evs.slice(0, 5).map((e) => `${timeLabel(e.at, tz)}, ${e.text.replace(/^Q /, '').replace(/\.$/, '')}`).join('; ')}. Nothing was sent without a person’s approval. The full log is open.` : `I have no recorded actions ${yest ? 'yesterday' : 'today'} at ${orgOf(c.w, a.orgId)?.name}.`,
      actions: [nav('Open the audit log', '/r/audit')] }],
      effects: (w, me) => { ensureSeed(w); ui(w, me, '/r/audit', { who: 'q', type: 'all', q: '', day: yest ? 'yesterday' : 'today' }); }, nav: { to: '/r/audit', label: 'the audit log' } };
  },
});

// =====================================================================================================
// Kora Senior Backend intake (moved out of the embedded conversation on /r/mandate)
// =====================================================================================================
const KI = 'hire-a.kora.intake';
const kora = (c: QCtx) => c.actor.orgId === 'org_kora';
const HARDEST = [{ re: /\b(payment|payments|reconcil\w*|ledger|settlement)\b/, idx: 0, label: 'Payments reconciliation' }, { re: /\b(scal\w*|go services?|golang|\bgo\b|load)\b/, idx: 1, label: 'Scaling Go services' }, { re: /\b(postgres\w*|database|db|queries|sql)\b/, idx: 2, label: 'Postgres performance' }];
const KORA_REVIEW = (w: World): ReplyMsg => ({ kind: 'approval', used: ['Kora Pay tone and pay guidance v2', 'Requirements from your answers'],
  text: `Kora Pay’s handbook asks for the pay band in the first message, so it’s in the brief (${w.mandate.payBand}). Check the requirements beside this conversation; change anything there or tell me. Approve it and I’ll start searching. I won’t contact anyone.`,
  actions: [op('Approve and start searching', 'hire-a.kora.approve', {}, true), nav('Open the brief', '/r/mandate')] });
registerSkill({
  id: KI, side: 'recruiter',
  match: (c) => (kora(c) && c.w.mandate.status === 'DRAFT' && /\b(hire|need|engineer|backend|developer|senior backend)\b/.test(c.norm) && !/\bjuniors?\b|\bseniors\b|\boffer\b/.test(c.norm) ? 0.62 : 0),
  handle: (c) => ({ msgs: [{ kind: 'question', used: ['your message', 'Platform engineer mandate, Aug'],
    text: `I’ve started the Senior Backend brief from what you said (“${c.text.slice(0, 80)}”) and filled in the rest from Kora Pay’s last backend role. Two questions, then you can approve it. First: is this role hybrid in Lagos, onsite, or open to remote?`,
    actions: [ask('Hybrid, Lagos'), ask('Onsite, Lagos'), ask('Remote in Africa')] }], frame: frame(KI, 'mode'), nav: { to: '/r/mandate', label: 'the role brief' },
    effects: (w) => { hireA(w).koraIntake = { step: 'mode', at: now() }; } }),
  answer: (c) => {
    if (strongOther(c, KI)) return null;
    const step = c.frame!.awaiting;
    if (step === 'mode') {
      const mode = /\bhybrid\b/.test(c.norm) ? 'HYBRID' : /\b(onsite|on site|office|in person)\b/.test(c.norm) ? 'ONSITE' : /\bremote\b/.test(c.norm) ? 'REMOTE' : null;
      if (!mode) return c.text.includes('?') ? null : { msgs: [{ kind: 'question', text: 'Sorry, which is it: hybrid in Lagos, onsite in Lagos, or remote?', actions: [ask('Hybrid, Lagos'), ask('Onsite, Lagos'), ask('Remote in Africa')] }] };
      return { msgs: [{ kind: 'question', text: `${mode === 'HYBRID' ? 'Hybrid in Lagos' : mode === 'ONSITE' ? 'Onsite in Lagos' : 'Remote in Africa'}: noted on the brief. What’s the hardest part of the job, the thing they must already have done?`, actions: HARDEST.map((h) => ask(h.label)) }],
        effects: (w, a) => { w.mandate.workMode = mode; w.mandate.location = mode === 'REMOTE' ? 'Remote (Africa)' : 'Lagos'; hireA(w).koraIntake = { step: 'hardest', at: now() }; emit(w, a.id, 'mandate.revised', scopeOf(a), `Senior Backend brief: work mode set to ${mode.toLowerCase()}.`); }, frame: frame(KI, 'hardest') };
    }
    if (step === 'hardest') {
      const h = HARDEST.find((x) => x.re.test(c.norm));
      if (!h) return c.text.includes('?') ? null : { msgs: [{ kind: 'question', text: 'Which of these is closest?', actions: HARDEST.map((x) => ask(x.label)) }] };
      return { msgs: [], frame: frame(KI, 'review'), effects: (w, a) => {
        const reqs = [...MANDATE.requirements]; const [first] = reqs.splice(h.idx, 1); w.mandate.requirements = [first, ...reqs];
        hireA(w).koraIntake = { step: 'review', at: now() };
        emit(w, a.id, 'mandate.revised', scopeOf(a), `Senior Backend brief: “${first.label}” set as the hardest requirement.`);
        qsay(w, a, KORA_REVIEW(w));
      } };
    }
    if (step === 'review') {
      if (/\b(approve|aprove|looks good|go ahead|yes|start)\b/.test(c.norm) && !/\bnot\b/.test(c.norm)) return { msgs: [], frame: null, effects: (w, a) => koraApprove(w, a) };
      const mode = /\bhybrid\b/.test(c.norm) ? 'HYBRID' : /\bonsite|office\b/.test(c.norm) ? 'ONSITE' : /\bremote\b/.test(c.norm) ? 'REMOTE' : null;
      if (mode) return { msgs: [], effects: (w) => { w.mandate.workMode = mode; w.mandate.location = mode === 'REMOTE' ? 'Remote (Africa)' : 'Lagos'; qsay(w, actorOf(w), { kind: 'reply', text: `Changed to ${mode.toLowerCase()}.` }); qsay(w, actorOf(w), KORA_REVIEW(w)); } };
      return null;
    }
    return null;
  },
});
function koraApprove(w: World, a: Actor) {
  if (!can(a, 'approve_brief')) { qsay(w, a, { kind: 'refusal', text: `As ${ROLE_LABEL[a.role!]} you can’t approve briefs.` }); return; }
  if (w.mandate.status !== 'DRAFT') { qsay(w, a, { kind: 'reply', text: 'The Senior Backend brief is already approved.' }); return; }
  w.mandate.status = 'APPROVED'; w.mandate.approvedBy = a.name;
  w.activity.unshift({ at: now(), actor: 'You', text: `Approved the Senior Backend mandate v${w.mandate.version}` });
  emit(w, a.id, 'mandate.approved', scopeOf(a), `${a.name} approved the Senior Backend brief (v${w.mandate.version}).`, { mandateId: 'm_backend' });
  hireA(w).koraIntake = undefined; w.q.frames[a.id] = null;
  qsay(w, a, { kind: 'reply', text: 'Approved. I’m starting the search now. You can leave this page; I’ll keep going and tell you here when people appear.' });
  setTimeout(() => startSourcingWithQ(), 0);
}
registerOp('hire-a.kora.approve', (w, _a, actor) => { koraApprove(w, actor); return { nav: { to: '/r/sourcing', label: 'the search' } }; });
registerSkill({
  id: 'hire-a.kora.search', side: 'recruiter',
  match: (c) => (kora(c) && (/\b(search|sourcing|searching)\b/.test(c.norm) && /\b(how|status|going|done|finished|progress|resume|continue|start|restart|carry on|where)\b/.test(c.norm) || /\b(resume|continue|carry on with) (the )?search\b/.test(c.norm)) && (c.route === '/r/sourcing' || c.route === '/r/mandate' || /\bsenior backend\b/.test(c.norm) || !orgMandates(c.w, c.actor).some((m) => m.status !== 'DRAFT')) ? 0.83 : 0),
  handle: (c) => {
    const s = c.w.sourcing; const m = c.w.mandate;
    if (m.status === 'DRAFT') return { msgs: [{ kind: 'approval', text: 'The Senior Backend brief isn’t approved yet, so I haven’t searched. Approve it and I’ll start.', actions: [op('Approve and start searching', 'hire-a.kora.approve', {}, true)] }], nav: { to: '/r/mandate', label: 'the role brief' } };
    if (s.done) return { msgs: [{ kind: 'reply', text: `The search finished: ${s.found.length} people to compare${s.failedSource ? '; one source (PeopleGraph) was unavailable and will be retried tonight' : ''}.`, actions: [nav('Compare them', '/r/compare', true)] }], nav: { to: '/r/sourcing', label: 'the search' } };
    if (s.cursor > 0 && !/\b(how|status|going|progress)\b/.test(c.norm) || /\b(resume|continue|carry on|restart|start)\b/.test(c.norm)) { setTimeout(() => startSourcingWithQ(), 0); return { msgs: [{ kind: 'reply', text: s.cursor ? `Resuming from profile ${s.cursor + 1}; I won’t start again from the top.` : 'Starting the search.' }], nav: { to: '/r/sourcing', label: 'the search' } }; }
    return { msgs: [{ kind: 'reply', text: s.cursor ? `I’ve read ${s.cursor} profiles so far and found ${s.found.length}.` : 'The search hasn’t started yet.', actions: s.cursor ? [] : [ask('Start the search')] }], nav: { to: '/r/sourcing', label: 'the search' } };
  },
});

// ---------- Opening a role by name ----------
registerSkill({
  id: 'hire-a.open', side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId || !/\b(open|show|take me|go to|see|view|bring up)\b/.test(c.norm)) return 0;
    if (/\b(my|our|the|all) (roles|jobs|briefs|mandates)\b/.test(c.norm)) return 0.75;
    return /\b(brief|role|mandate|people|shortlist|list|versions?)\b/.test(c.norm) && orgMandates(c.w, c.actor).length ? 0.76 : 0;
  },
  handle: (c) => {
    if (/\b(my|our|the|all) (roles|jobs|briefs|mandates)\b/.test(c.norm)) return { msgs: [{ kind: 'reply', text: 'Here are your roles.' }], nav: { to: '/r/roles', label: 'your roles' } };
    const m = pickMandate(c.w, c.actor, c.norm, c.route)!;
    const view = /\b(people|shortlist|list|candidates)\b/.test(c.norm) ? 'people' : /\bversions?\b/.test(c.norm) ? 'versions' : 'brief';
    return { msgs: [{ kind: 'reply', text: `Opening “${m.title}”${view === 'brief' ? '' : `, ${view}`}.` }], effects: (w, a) => ui(w, a, '/r/roles', { view }), nav: { to: `/r/roles/${m.id}`, label: m.title } };
  },
});

void GLOSSARY; void anyOf; void titleFor; void k;
