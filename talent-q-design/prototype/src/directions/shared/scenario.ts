// One scenario, three designs. Every direction renders these same facts and runs the same state
// machines, so the comparison is about design, not content. All people and data are fictional.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EvidenceState } from '@contracts';
import { EVIDENCE, FITS, MANDATE, PEOPLE } from '../../mock/fixtures';

export const REQS = MANDATE.requirements;
export const SHORTLIST = ['p_tobi', 'p_ife', 'p_kunle'].map((id) => PEOPLE.find((p) => p.personId === id)!);
export const fitOf = (pid: string) => FITS.find((f) => f.personId === pid)!;
export const cellOf = (pid: string, reqId: string) => fitOf(pid).byRequirement.find((r) => r.reqId === reqId)!;
export const evidenceById = (id: string) => EVIDENCE.find((e) => e.evidenceId === id)!;
export const initials = (name: string) => name.split(' ').map((p) => p[0]).join('');

/**
 * Evidence strength is ordinal. The dataviz validator showed adjacent gold steps sit ~9 ΔE apart
 * (below the 15 normal-vision floor), so strength is carried by SHAPE (full / half / empty / dashed)
 * and a label in every direction; colour is only a supporting cue.
 */
export type Strength = 'full' | 'verified' | 'partial' | 'none' | 'unclear';
export function strength(s: EvidenceState): Strength {
  if (s === 'VERIFIED_CAPABILITY') return 'verified';
  if (s === 'EVIDENCED') return 'full';
  if (s === 'EVIDENCE_OUTDATED' || s === 'BELOW_TARGET_ON_ASSESSMENT') return 'partial';
  if (s === 'REQUIREMENT_UNCLEAR') return 'unclear';
  return 'none';
}
export const STRENGTH_LABEL: Record<Strength, string> = { verified: 'Verified', full: 'Evidenced', partial: 'Partial or outdated', none: 'Not shown yet', unclear: 'Requirement unclear' };
export const strengthScore = (s: Strength) => ({ verified: 3, full: 2, partial: 1, none: 0, unclear: 0 })[s];

/** Coverage of must-haves, counted, never combined into one score across requirements. */
export function mustHaveCoverage(pid: string) {
  const must = REQS.filter((r) => r.mustHave);
  return { shown: must.filter((r) => ['verified', 'full'].includes(strength(cellOf(pid, r.reqId).state))).length, total: must.length };
}

// ---------------- Q home: a run that produces an artifact ----------------
export const Q_PROMPT = 'Who should I talk to first for Senior Backend?';
export const Q_SUGGESTIONS = [Q_PROMPT, 'What changed overnight?', 'Draft a note to the hiring manager'];

export interface Step { id: string; label: string; total: number; done: number }
export const RUN_STEPS: Omit<Step, 'done'>[] = [
  { id: 'mandate', label: 'Reading the approved mandate', total: 5 },
  { id: 'evidence', label: 'Checking shared evidence', total: 7 },
  { id: 'compare', label: 'Weighing the hardest requirement', total: 3 },
];
export const Q_ANSWER = 'Talk to Tobi first. He is the only one who has shown the hardest part of this job, reconciling payments at scale, and I could verify it. Ifeoma is close behind with the most complete record. Nobody has shown on-call leadership, so ask all three about it.';
export const USED = ['Mandate v1 · approved', '7 evidence items', 'Your rule: hardest requirement first'];

export type RunPhase = 'idle' | 'thinking' | 'working' | 'answering' | 'done';

/** Simulated Q run. Each step's count advances when its (simulated) unit of work finishes. */
export function useQRun() {
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [steps, setSteps] = useState<Step[]>(RUN_STEPS.map((s) => ({ ...s, done: 0 })));
  const [answer, setAnswer] = useState('');
  const [asked, setAsked] = useState('');
  const timers = useRef<number[]>([]);
  const later = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const ask = useCallback((q: string) => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setAsked(q); setAnswer(''); setSteps(RUN_STEPS.map((s) => ({ ...s, done: 0 }))); setPhase('thinking');
    let t = 700;
    later(t, () => setPhase('working'));
    RUN_STEPS.forEach((s, si) => {
      for (let i = 1; i <= s.total; i++) {
        t += si === 1 ? 260 : 200;
        later(t, () => setSteps((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: i } : x))));
      }
    });
    t += 300;
    later(t, () => setPhase('answering'));
    const words = Q_ANSWER.split(' ');
    words.forEach((_, i) => { later(t + i * 34, () => setAnswer(words.slice(0, i + 1).join(' '))); });
    later(t + words.length * 34 + 200, () => setPhase('done'));
  }, []);

  const reset = useCallback(() => { timers.current.forEach(clearTimeout); setPhase('idle'); setAnswer(''); setAsked(''); }, []);
  const progress = steps.reduce((a, s) => a + s.done / s.total, 0) / steps.length;
  const activeStep = steps.find((s) => s.done < s.total);
  return { phase, steps, answer, asked, ask, reset, progress, activeStep };
}

// ---------------- J7: Amaka, graduate → Product Analyst ----------------
export interface Skill { id: string; label: string; plain: string; state: EvidenceState; level: number | null; roles: string[]; weight: number }
export const ROLES = [
  { id: 'r_now', label: 'Economics graduate', stage: 'now' as const },
  { id: 'r_jda', label: 'Junior Data Analyst', stage: 'next' as const },
  { id: 'r_pa', label: 'Product Analyst', stage: 'goal' as const },
  { id: 'r_ga', label: 'Growth Analyst', stage: 'later' as const },
];
export const SKILLS: Skill[] = [
  { id: 'sheets', label: 'Spreadsheet modelling', plain: 'Building models that answer a business question', state: 'VERIFIED_CAPABILITY', level: 3, roles: ['r_jda', 'r_pa'], weight: 2 },
  { id: 'story', label: 'Dashboard storytelling', plain: 'Turning numbers into a decision', state: 'EVIDENCED', level: 3, roles: ['r_jda', 'r_pa', 'r_ga'], weight: 2 },
  { id: 'sql', label: 'SQL window functions', plain: 'Comparing each row with the ones before it', state: 'NOT_EVIDENCED', level: null, roles: ['r_jda', 'r_pa', 'r_ga'], weight: 3 },
  { id: 'writing', label: 'Product writing', plain: 'A one-page memo a manager can act on', state: 'EVIDENCE_OUTDATED', level: 2, roles: ['r_pa'], weight: 2 },
  { id: 'stake', label: 'Stakeholder conversations', plain: 'Asking what a team really needs', state: 'EVIDENCED', level: 2, roles: ['r_pa', 'r_ga'], weight: 1 },
  { id: 'exp', label: 'Experiment design', plain: 'Testing a change fairly', state: 'REQUIREMENT_UNCLEAR', level: null, roles: ['r_pa', 'r_ga'], weight: 1 },
];
export const PROGRESS = [
  { skill: 'sheets', label: 'Spreadsheet modelling', points: [{ at: '2 Oct', level: 2 }, { at: '9 Oct', level: 2 }, { at: '16 Oct', level: 3 }, { at: '23 Oct', level: 3 }] },
  { skill: 'story', label: 'Dashboard storytelling', points: [{ at: '2 Oct', level: 2 }, { at: '16 Oct', level: 3 }] },
];
export const DEVELOPMENT = [
  { id: 'd1', skill: 'sql', title: 'Cohort retention with LAG()', kind: 'Practice task', minutes: 40, why: 'Asked for in 7 of the 10 Lagos product-analyst listings you saved.' },
  { id: 'd2', skill: 'writing', title: 'Rewrite your thesis as a product memo', kind: 'Work sample', minutes: 60, why: 'Your only writing sample is from 2024.' },
  { id: 'd3', skill: 'sql', title: 'SQL for analysts, module 3', kind: 'External course', minutes: 120, why: 'If you prefer to learn before you practise.' },
];

/** Interactive coaching: one question, a real answer path, feedback, and a measurable change. */
export const COACH_Q = 'For each user, how many days passed between their first and second session?';
export const COACH_OPTIONS = [
  { id: 'a', text: 'Sort by date and subtract the first two rows', verdict: 'partial' as const },
  { id: 'b', text: 'LAG(started_at) OVER (PARTITION BY user_id ORDER BY started_at)', verdict: 'right' as const },
  { id: 'c', text: 'GROUP BY user_id and take MAX minus MIN', verdict: 'wrong' as const },
];
export const COACH_FEEDBACK = {
  right: { level: 2, text: 'Right technique. LAG compares each session with the one before it, per user. To reach level 3, filter to row number 2 and explain why.' },
  partial: { level: 1, text: 'Close in spirit, but sorting the whole table mixes users together. Partition by user first. Try the window version next.' },
  wrong: { level: 1, text: 'MAX minus MIN gives first-to-last, not first-to-second. Window functions keep each user’s order.' },
};

export function useCoach() {
  const [pick, setPick] = useState<string | null>(null);
  const [promoted, setPromoted] = useState(false);
  const verdict = pick ? COACH_OPTIONS.find((o) => o.id === pick)!.verdict : null;
  const feedback = verdict ? COACH_FEEDBACK[verdict] : null;
  return { pick, setPick, verdict, feedback, promoted, promote: () => setPromoted(true), reset: () => { setPick(null); setPromoted(false); }, coverage: promoted ? 7 : 6 };
}
