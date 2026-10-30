// ASSESS area (coverage build, 30 Oct): question banks with locked versions (SC-095, V14), interview plans (MO-018),
// the simulated avatar room (SC-102), the human live room with interviewer-only Q suggestions (SC-103, MO-023),
// consent-scoped transcripts (SC-106), employer-shared candidate feedback (SC-107), interviewer coaching (SC-109, V20)
// and three simulated exercises (SC-111 code, SC-112 cyber incident, SC-113 customer conversation).
// Only `import type` from the store here: this file is globbed eagerly by mock/world.ts.
import type { World } from '../../mock/world';

export interface BankQ { id: string; text: string; tags: string[]; reqId?: string; followUp?: string }
/** DRAFT (editable by the bank's editors) → LOCKED (frozen; Q may add follow-ups but never rewords it) → SUPERSEDED. */
export interface BankVersion { v: number; state: 'DRAFT' | 'LOCKED' | 'SUPERSEDED'; questions: BankQ[]; at: string; by: string; lockedBy?: string; lockedAt?: string; note: string }
export interface BankUpload { file: string; at: string; by: string; accepted: string[]; rejected: { line: string; why: string; instead?: string }[] }
export interface QuestionBank { id: string; orgId: string; mandateId: string; title: string; owner: string; editors: string[]; versions: BankVersion[]; upload?: BankUpload; log: { at: string; by: string; text: string }[] }

export interface PlanCard { reqId: string; label: string; mustHave: boolean; level: string; qs: { id: string; text: string; locked: boolean; why: string }[] }
export interface InterviewPlan { interviewId: string; bankId: string; v: number; at: string; by: string; cards: PlanCard[] }

export interface Turn { id: string; who: 'INT' | 'CAND' | 'SYS'; by?: string; text: string; at: string; reqId?: string; qid?: string; recorded: boolean; simulated?: boolean; leading?: string }
export interface LiveSuggestion { id: string; text: string; reqId?: string; why: string; state: 'NEW' | 'USED' | 'DISMISSED'; at: string }
/** LOBBY → LIVE ⇄ INTERRUPTED → ENDED. Recording only ever starts after the candidate says yes. */
export interface LiveRoom {
  interviewId: string; state: 'LOBBY' | 'LIVE' | 'INTERRUPTED' | 'ENDED';
  consent: { told: boolean; recording: 'NOT_ASKED' | 'PENDING' | 'YES' | 'NO'; at?: string };
  candidateJoined: boolean; recording: 'OFF' | 'ON' | 'PAUSED'; panel: 'OPEN' | 'HIDDEN';
  turns: Turn[]; suggestions: LiveSuggestion[]; awaiting?: string; startedAt?: string; endedAt?: string;
  excerpts: { id: string; turnId: string; reqId: string; by: string; at: string }[];
}
/** Feedback the employer chooses to share (the candidateNote pattern): DRAFT is never visible to the candidate. */
export interface FeedbackShare { interviewId: string; personId: string; orgId: string; strengths: { id: string; text: string; on: boolean }[]; routes: { id: string; text: string; on: boolean }[]; note: string; state: 'DRAFT' | 'SHARED'; sharedAt?: string; by?: string }

/** CHOOSE → (AVATAR: CONSENT → DEVICE) → LIVE ⇄ INTERRUPTED → DONE; or HUMAN_REQUESTED. Text and voice skip the device check. */
export interface AvatarRoom {
  personId: string; orgId: string; mode?: 'AVATAR' | 'TEXT' | 'VOICE' | 'HUMAN';
  step: 'CHOOSE' | 'CONSENT' | 'DEVICE' | 'LIVE' | 'INTERRUPTED' | 'DONE' | 'HUMAN_REQUESTED';
  device?: 'OK' | 'SLOW'; stillImage: boolean; captions: boolean; qIndex: number; answers: { qid: string; text: string; via: 'TEXT' | 'VOICE' }[]; draft: string;
  consentAt?: string; submittedAt?: string; receipt?: string;
}
export interface AvatarSetting { enabled: boolean; at?: string; by?: string }

export type ExerciseKind = 'CODE' | 'CYBER' | 'SALES';
/** ASSIGNED → IN_PROGRESS → SUBMITTED (self-reported) → REVIEWED (assessed or not shown) · or DECLINED (never a fail). */
export interface Exercise {
  id: string; kind: ExerciseKind; personId: string; orgId: string; mandateId: string; reqId?: string; title: string; minutes: number;
  state: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEWED' | 'DECLINED';
  code?: string; runs: { at: string; results: { name: string; pass: boolean; detail: string }[] }[];
  marked?: string[]; cause?: string; action?: string;
  chat?: { who: 'CUST' | 'ME'; text: string; step?: number }[];
  evidenceId?: string; reuseId?: string; submittedAt?: string; summary?: string; whyDeclined?: string;
  review?: { outcome: 'SHOWS_IT' | 'PARTLY' | 'NOT_SHOWN'; note: string; by: string; at: string; shared: boolean };
}

export interface AssessState {
  banks: QuestionBank[]; plans: Record<string, InterviewPlan>; rooms: Record<string, LiveRoom>; feedback: Record<string, FeedbackShare>;
  avatar: Record<string, AvatarRoom>; avatarSettings: Record<string, AvatarSetting>; exercises: Exercise[];
  /** Coaching items an interviewer has acknowledged, per interview (private to that interviewer). */
  coached: Record<string, string[]>;
}

const T0 = '2026-10-22T10:00:00+01:00';
const Q = (id: string, reqId: string, text: string, tags: string[], followUp?: string): BankQ => ({ id, reqId, text, tags, followUp });
export const BANK_V1: BankQ[] = [
  Q('bq1', 'r1', 'Tell me about a day the numbers in a payments system didn’t match. What did you do first?', ['payments', 'must-have'], 'Who noticed first, and how long did it take?'),
  Q('bq2', 'r2', 'Tell me about a Go service you ran under real load. How did you know it was healthy?', ['go', 'must-have'], 'What did you watch, and what would page you?'),
  Q('bq3', 'r3', 'What was the slowest query you fixed? How slow was it before and after?', ['postgres', 'must-have'], 'How big was the table, roughly?'),
  Q('bq4', 'r4', 'Tell me about one incident you led, step by step. What was your first decision?', ['on-call', 'nice to have'], 'What was your part, as opposed to the team’s?'),
  Q('bq5', 'r5', 'Tell me about someone less experienced you helped grow. What could they do afterwards?', ['mentoring', 'nice to have']),
];

export const area = {
  id: 'assess',
  init: (): AssessState => ({
    banks: [{ id: 'qb_kora_backend', orgId: 'org_kora', mandateId: 'm_backend', title: 'Senior Backend Engineer: interview questions', owner: 'u_ngozi', editors: ['u_ngozi', 'u_ada'],
      versions: [{ v: 1, state: 'LOCKED', questions: BANK_V1, at: T0, by: 'u_ngozi', lockedBy: 'u_ngozi', lockedAt: T0, note: 'Agreed with Seyi Balogun for the first round' }],
      log: [{ at: T0, by: 'u_ngozi', text: 'Locked v1 (5 questions).' }] }],
    plans: {}, feedback: {},
    // A past interview Musa ran (not recorded: Kunle said no). Its coaching is Musa's alone.
    rooms: { i_hb_kunle: { interviewId: 'i_hb_kunle', state: 'ENDED', consent: { told: true, recording: 'NO', at: '2026-10-20T14:02:00+01:00' }, candidateJoined: true, recording: 'OFF', panel: 'OPEN', startedAt: '2026-10-20T14:03:00+01:00', endedAt: '2026-10-20T14:41:00+01:00', excerpts: [], suggestions: [{ id: 'sg_k1', text: 'What was your role in that incident, specifically: who decided what to do?', reqId: 'r4', why: 'The answer was general.', state: 'DISMISSED', at: '2026-10-20T14:30:00+01:00' }],
      turns: [
        { id: 'tk1', who: 'INT', by: 'u_musa', text: 'So, at Kora we care a lot about reliability, and we run Go services that move a lot of money for merchants every day, so the first thing I want to understand, and take your time, is how you think about retries, because you’d agree idempotency matters most in payments, right?', at: '2026-10-20T14:05:00+01:00', reqId: 'r1', recorded: false, leading: 'It suggests the answer you want. Ask it open: “How do you …?” or “Tell me about a time …”.' },
        { id: 'tk2', who: 'CAND', text: 'Yes, definitely. Idempotency keys on every request.', at: '2026-10-20T14:06:00+01:00', reqId: 'r1', recorded: false },
        { id: 'tk3', who: 'INT', by: 'u_musa', text: 'Great. And in your take-home, the payout worker could retry and pay twice under one condition, which is when the network call times out after the provider has already accepted it, and I wanted to walk through that with you in some detail because it matters for us.', at: '2026-10-20T14:12:00+01:00', reqId: 'r2', recorded: false },
        { id: 'tk4', who: 'CAND', text: 'Right, I would store the key first and check it before sending.', at: '2026-10-20T14:14:00+01:00', reqId: 'r2', recorded: false },
        { id: 'tk5', who: 'INT', by: 'u_musa', text: 'Tell me about an incident you were part of.', at: '2026-10-20T14:28:00+01:00', reqId: 'r4', recorded: false },
        { id: 'tk6', who: 'CAND', text: 'We had some outages and the team handled them.', at: '2026-10-20T14:29:00+01:00', reqId: 'r4', recorded: false },
      ] } }, avatar: {}, avatarSettings: { org_kora: { enabled: true, at: T0, by: 'u_ngozi' } },
    exercises: [
      { id: 'ex_code_seyio', kind: 'CODE', personId: 'p_seyio', orgId: 'org_kora', mandateId: 'm_backend', reqId: 'r3', title: 'Find and fix one slow query', minutes: 40, state: 'ASSIGNED', runs: [] },
      { id: 'ex_cyber_tobi', kind: 'CYBER', personId: 'p_tobi', orgId: 'org_kora', mandateId: 'm_backend', reqId: 'r4', title: 'Investigate a settlement outage from its logs', minutes: 30, state: 'ASSIGNED', runs: [] },
      { id: 'ex_sales_grace', kind: 'SALES', personId: 'p_grace', orgId: 'org_kora', mandateId: 'm_support', title: 'Help a worried merchant on chat', minutes: 15, state: 'ASSIGNED', runs: [] },
    ],
    coached: {},
  }),
};
export const assess = (w: World) => (w.areas.assess ??= area.init()) as AssessState;
