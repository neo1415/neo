// J7 career state and the operations Q (and the atlas page) perform on it. One store (World v4): each
// person's J7 lives at w.j7[personId] and is PERSON-scoped. Practice and assessments are mirrored into the
// Passport as PRIVATE items; nothing here ever widens who can see anything. Sharing is a separate,
// explicitly approved act (see the talent-a skills).
import { emit, simNow, visibleEvidence, type World } from '../../mock/world';
import { anyOf, near } from '../../q/core/nlu';
import { profileText, readProfile } from '../../services/profile';
import { PERSONAS, type CState, type JOcc, type Persona, type PlanStep, type Practice, type Rec, type Sample } from './personas';

export type PId = Persona['id'];
export const PERSON_OF: Record<PId, string> = { graduate: 'p_amaka', switcher: 'p_chidi', experienced: 'p_tobi' };
export const pidFor = (personId: string): PId => (personId === 'p_chidi' ? 'switcher' : personId === 'p_tobi' ? 'experienced' : 'graduate');
export const personaFor = (personId: string): Persona => PERSONAS[pidFor(personId)];
export const shown = (s: CState) => s === 'verified' || s === 'full';

export interface Assessment { id: string; comp: string; at: string; level: number; round: number; rubric: { c: string; ok: boolean }[] }
export interface J7State {
  v: 2; goal: string; states: Record<string, CState>; record: Rec[]; plan: PlanStep[]; moved: Record<string, number>;
  archived: { occ: string; at: string; why: string; steps: PlanStep[] }[];
  quiz: { comp: string; pick: string | null } | null;
  assessments: Assessment[];
  adjustments: { at: string; comp: string; choice: 'kept' | 'swapped' | 'removed' | 'added'; said?: string }[];
  /** What the person has told Q about a competency (a claim; it never changes the state on its own). */
  mentioned: Record<string, string>;
  startedAt: string; lastVisit: string;
}

const DAY = 864e5;
export const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * DAY).toISOString();
export const simISO = (w: World) => simNow(w).toISOString();
export const fmtDay = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00+01:00` : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a.length === 10 ? `${a}T12:00:00+01:00` : a).getTime()) / DAY);

// ---------------- Understanding names of occupations and competencies ----------------
const words = (s: string) => s.replace(/[,.?!()]/g, ' ').split(/\s+/).filter(Boolean);
/** Every word of the phrase is (fuzzily) present; two-letter tokens like "ba"/"pm" must match exactly. */
const phraseIn = (norm: string, phrase: string) => { const ws = words(norm); return phrase.split(' ').every((p) => (p.length <= 3 ? ws.includes(p) : near(norm, p))); };
export function occFromText(P: Persona, norm: string): JOcc | null {
  let best: { o: JOcc; n: number } | null = null;
  for (const o of [...P.occs, ...P.extra]) for (const a of [o.label.toLowerCase(), o.short.toLowerCase(), ...(o.aliases ?? [])]) {
    if (a.length < 2 || !phraseIn(norm, a)) continue;
    const n = a.length;
    if (!best || n > best.n) best = { o, n };
  }
  return best?.o ?? null;
}
export function compFromText(P: Persona, norm: string) {
  let best: { id: string; n: number } | null = null;
  for (const c of P.comps) for (const k of [c.label.toLowerCase(), ...(c.kws ?? [])]) {
    const hit = k.includes(' ') ? phraseIn(norm, k) : anyOf(norm, [k]);
    if (hit && (!best || k.length > best.n)) best = { id: c.id, n: k.length };
  }
  return best ? P.comps.find((c) => c.id === best!.id)! : null;
}

// ---------------- Reading state ----------------
function planFor(P: Persona, goal: string, start: string): PlanStep[] {
  return P.steps.filter((s) => s.goals.includes(goal)).slice(0, 5).map((s) => ({ ...s, due: addDays(start, s.dueIn) }));
}
export function freshJ7(w: World, personId: string): J7State {
  const P = personaFor(personId); const start = simISO(w);
  let goal = P.goal;
  if (P.id === 'graduate') { const g = readProfile(w, personId).goal.toLowerCase(); const o = g ? occFromText(P, g) : null; if (o) goal = o.id; }
  return { v: 2, goal, states: Object.fromEntries(P.comps.map((c) => [c.id, c.state])), record: structuredClone(P.record), plan: planFor(P, goal, start), moved: {}, archived: [], quiz: null, assessments: [], adjustments: [], mentioned: {}, startedAt: start, lastVisit: start };
}
export const readJ7 = (w: World, personId: string): J7State => { const s = w.j7[personId] as J7State | undefined; return s && s.v === 2 ? s : freshJ7(w, personId); };
/** Mutable J7 state inside update()/effects. */
export const j7 = (w: World, personId: string): J7State => { const s = readJ7(w, personId); w.j7[personId] = s; return s; };

/** State of a competency for display: a stored state, or "unclear" when the person has only mentioned it. */
export function stateOf(w: World, personId: string, S: J7State, comp: string): CState {
  const s = S.states[comp] ?? 'none';
  if (s !== 'none') return s;
  const c = personaFor(personId).comps.find((x) => x.id === comp);
  if (S.mentioned[comp]) return 'unclear';
  const txt = profileText(readProfile(w, personId));
  return c?.kws?.some((k) => txt.includes(k)) ? 'unclear' : 'none';
}
/** The person's own words behind a "mentioned" competency (for showing the basis, never as proof). */
export function mentionOf(w: World, personId: string, S: J7State, comp: string): string | null {
  if (S.mentioned[comp]) return S.mentioned[comp];
  const c = personaFor(personId).comps.find((x) => x.id === comp); const p = readProfile(w, personId);
  const k = c?.kws?.find((x) => profileText(p).includes(x)); if (!k) return null;
  const cl = p.experience.flatMap((e) => e.claims).find((x) => x.text.toLowerCase().includes(k));
  if (cl) return cl.text;
  if (p.study.toLowerCase().includes(k)) return p.study;
  const sk = p.skills.find((x) => x.label.toLowerCase().includes(k)); return sk ? `You listed ${sk.label}` : null;
}
export const gapsFor = (w: World, personId: string, S: J7State, o: JOcc) => o.needs.filter((n) => !shown(stateOf(w, personId, S, n)));
export const occById = (P: Persona, id: string) => [...P.occs, ...P.extra].find((o) => o.id === id);
export const compById = (P: Persona, id: string) => P.comps.find((c) => c.id === id)!;
export const practiceFor = (P: Persona, comp?: string) => P.practices.find((p) => p.comp === comp) ?? null;
export const sampleFor = (P: Persona, comp?: string) => P.samples.find((s) => s.comp === comp) ?? null;
export function nearest(w: World, personId: string, S: J7State, n = 3) {
  const P = personaFor(personId);
  const said = (o: JOcc) => o.needs.filter((c) => stateOf(w, personId, S, c) === 'unclear').length;
  return P.occs.map((o) => ({ o, g: gapsFor(w, personId, S, o), m: said(o) })).sort((a, b) => a.g.length - b.g.length || b.m - a.m || a.o.label.localeCompare(b.o.label)).slice(0, n);
}
/** The competency Q should focus on next for the goal: an unshown need with a practice or a sample. */
export function focusComp(w: World, personId: string, S: J7State) {
  const P = personaFor(personId); const goal = occById(P, S.goal)!;
  const g = gapsFor(w, personId, S, goal);
  return g.find((c) => P.samples.some((s) => s.comp === c)) ?? g.find((c) => P.practices.some((p) => p.comp === c)) ?? g[0] ?? null;
}
export const overdue = (w: World, S: J7State) => S.plan.filter((s) => !s.done && s.due && new Date(s.due).getTime() < simNow(w).getTime());
/** What any employer organisation can see of this person right now (J7 never adds to it on its own). */
export function employerView(w: World, personId: string) {
  return ['org_medlink', 'org_tinda', 'org_kora'].map((org) => ({ org, name: w.orgs.find((o) => o.id === org)?.name ?? org, items: visibleEvidence(w, personId, org) }));
}
export const jobsFor = (w: World, P: Persona, occ: string) => (P.jobs[occ] ?? []).map((id) => w.jobs.find((j) => j.id === id)).filter(Boolean) as World['jobs'];

// ---------------- Operations (mutate inside update()/effects) ----------------
const scope = (personId: string) => `PERSON:${personId}`;
function mirror(w: World, personId: string, r: Rec, kind: 'PRACTICE' | 'ASSESSMENT', title: string, level?: number) {
  const id = kind === 'PRACTICE' ? `e_j7_${personId}_${r.id}` : `e_j7_${personId}_assess_${r.comp}`;
  const prev = w.evidence.find((e) => e.evidenceId === id);
  const item = { evidenceId: id, ownerId: personId, kind, title: kind === 'PRACTICE' ? `Practice: ${title}` : `${title}${level ? ` · level ${level} of 4` : ''}`,
    source: kind === 'PRACTICE' ? 'Talent Q practice (private)' : 'Talent Q rubric review (simulated reviewer)', observedAt: r.at.slice(0, 10), verified: kind !== 'PRACTICE', verification: kind === 'PRACTICE' ? 'UNVERIFIED' as const : 'VERIFIED' as const,
    shows: r.why, limits: r.not, visibility: prev?.visibility ?? 'PRIVATE' as const, sharedWith: prev?.sharedWith ?? [], origin: 'J7' as const };
  if (prev) Object.assign(prev, item); else w.evidence.push(item);
}

export function setGoal(w: World, personId: string, occId: string, why: string) {
  const P = personaFor(personId); const S = j7(w, personId);
  if (S.goal === occId || !occById(P, occId)) return null;
  const from = S.goal; const at = simISO(w);
  const kept = S.plan.filter((s) => s.goals.includes(occId));
  const archived = S.plan.filter((s) => !s.goals.includes(occId));
  // Steps from an earlier time this goal was chosen come back with their progress.
  const back = S.archived.find((a) => a.occ === occId)?.steps.filter((s) => !kept.some((k) => k.id === s.id)) ?? [];
  const added = P.steps.filter((s) => s.goals.includes(occId) && !kept.some((k) => k.id === s.id) && !back.some((b) => b.id === s.id)).map((s) => ({ ...s, due: addDays(at, s.dueIn) }));
  S.archived = [{ occ: from, at, why, steps: archived }, ...S.archived.filter((a) => a.occ !== occId)];
  S.plan = [...kept, ...back, ...added];
  S.goal = occId;
  emit(w, personId, 'j7.goal.changed', scope(personId), `Career goal changed from ${occById(P, from)?.label} to ${occById(P, occId)!.label}. ${archived.length} steps archived, ${kept.length} kept.`);
  return { from: occById(P, from)!, to: occById(P, occId)!, kept, archived, added: [...back, ...added] };
}

export function startQuiz(w: World, personId: string, comp?: string): Practice | null {
  const P = personaFor(personId); const S = j7(w, personId);
  const pr = practiceFor(P, comp) ?? practiceFor(P, focusComp(w, personId, S) ?? undefined) ?? P.practices[0] ?? null;
  if (pr) S.quiz = { comp: pr.comp, pick: null };
  return pr;
}
export function answerQuiz(w: World, personId: string, optId: string) {
  const P = personaFor(personId); const S = j7(w, personId);
  if (!S.quiz) return null;
  const pr = practiceFor(P, S.quiz.comp)!; const o = pr.options.find((x) => x.id === optId);
  if (!o) return null;
  S.quiz.pick = optId;
  const at = simISO(w);
  const r: Rec = { id: `rp${S.record.length + 1}_${Math.random().toString(36).slice(2, 6)}`, at, comp: pr.comp, cls: 'Practice attempt', why: o.verdict === 'right' ? 'Chose the right approach on one practice question.' : 'Tried one practice question; not the strongest approach yet.', not: 'That you can do this at work. Practice is not proof.', level: o.verdict === 'right' ? 2 : 1 };
  S.record.unshift(r);
  if (['none', 'unclear'].includes(S.states[pr.comp] ?? 'none')) S.states[pr.comp] = 'practice';
  const step = S.plan.find((s) => s.comp === pr.comp && s.kind === 'Practice' && !s.done);
  if (step && o.verdict === 'right') { step.done = true; step.doneAt = at; }
  mirror(w, personId, r, 'PRACTICE', compById(P, pr.comp).label);
  emit(w, personId, 'j7.practice.logged', scope(personId), `Practice attempt logged for ${compById(P, pr.comp).label} (private, not proof).`);
  return { pr, o, verdict: o.verdict };
}

export function submitSample(w: World, personId: string, comp?: string) {
  const P = personaFor(personId); const S = j7(w, personId);
  const sm: Sample | null = sampleFor(P, comp) ?? sampleFor(P, focusComp(w, personId, S) ?? undefined) ?? sampleFor(P, S.assessments[0]?.comp) ?? P.samples[0] ?? null;
  if (!sm) return null;
  const prev = S.assessments.filter((a) => a.comp === sm.comp);
  const round = prev.length + 1;
  const res = round === 1 ? sm.first : sm.improved;
  const at = simISO(w);
  const occs = [...P.occs, ...P.extra];
  const before = Object.fromEntries(occs.map((o) => [o.id, gapsFor(w, personId, S, o).length]));
  const wasShown = shown(S.states[sm.comp] ?? 'none');
  S.states[sm.comp] = 'full';
  const touched = wasShown ? [] : occs.filter((o) => o.needs.includes(sm.comp));
  if (!wasShown) S.moved = Object.fromEntries(touched.map((o) => [o.id, before[o.id]]));
  S.assessments.push({ id: `as${S.assessments.length + 1}`, comp: sm.comp, at, level: res.level, round, rubric: res.rubric });
  const r: Rec = { id: `ra${S.record.length + 1}_${round}`, at, comp: sm.comp, cls: 'Assessed by rubric and reviewer', level: res.level,
    why: `${sm.title}${round > 1 ? ' (improved version)' : ''} scored level ${res.level} of 4: ${res.rubric.filter((x) => x.ok).length} of ${res.rubric.length} rubric criteria met; reviewer signed off (simulated).`,
    not: sm.not, moved: touched.length ? `${touched.length} occupations moved one ring closer` : undefined };
  S.record.unshift(r);
  const step = S.plan.find((s) => s.comp === sm.comp && s.kind === 'Work sample' && !s.done);
  if (step) { step.done = true; step.doneAt = at; }
  mirror(w, personId, r, 'ASSESSMENT', sm.title, res.level);
  emit(w, personId, 'j7.assessment.completed', scope(personId), `${sm.title} assessed at level ${res.level} (round ${round}); added to your Passport as private.`);
  return { sm, round, level: res.level, rubric: res.rubric, prevLevel: prev[prev.length - 1]?.level, moved: touched.length, advice: round === 1 ? sm.first.advice : null };
}

export function changesSince(w: World, personId: string) {
  const P = personaFor(personId); const S = readJ7(w, personId);
  const nowIso = simISO(w); const since = S.lastVisit;
  const days = daysBetween(since, nowIso);
  const od = overdue(w, S);
  const doneSince = S.plan.filter((s) => s.done && s.doneAt && s.doneAt > since);
  const stalePractice = S.record.filter((r) => r.cls === 'Practice attempt' && daysBetween(r.at, nowIso) >= 14);
  const goalJobs = jobsFor(w, P, S.goal);
  const jobNotes = goalJobs.map((j) => {
    const age = daysBetween(j.posted, nowIso); const app = w.applications.find((a) => a.jobId === j.id && a.personId === personId);
    return { j, note: j.status === 'CLOSED' ? 'has closed' : app ? `you applied; status: ${app.status.replace('_', ' ').toLowerCase()}` : age > 30 ? `still listed, but posted ${age} days ago, so it may be close to filled` : `still open (posted ${age} days ago)` };
  });
  return { days, since, od, doneSince, stalePractice, jobNotes, visible: employerView(w, personId).reduce((n, x) => n + x.items.length, 0) };
}
