// Area slice for T4 (Grace): first steps, the resumable certificate upload, the interview room and where
// she was when she left. Keyed by person so any candidate could use it; Grace (p_grace) is the journey.
// Only `import type` from the store here (this file is globbed eagerly by the store).
import type { World } from '../../mock/world';

export type AnswerMode = 'TEXT' | 'VOICE' | 'FORM';
export type VoiceState = 'UNKNOWN' | 'OK' | 'DENIED' | 'UNAVAILABLE' | 'OFF';

export interface UploadState {
  evidenceId: string;
  fileName: string;
  sizeKb: number;
  chunks: number;
  /** Parts acknowledged by the (simulated) server. Progress is chunks done, never a timer. */
  done: number;
  status: 'IDLE' | 'UPLOADING' | 'PAUSED' | 'FAILED' | 'DONE';
  /** Why it is paused or failed, in plain words for the page and Q. */
  reason?: 'OFFLINE' | 'CLOSED' | 'USER' | 'SERVER' | 'NEED_FILE';
  source: 'SAMPLE' | 'DEVICE';
  /** name|size|lastModified of a real file, so a re-picked file is checked to be the same one. */
  fingerprint?: string;
  attempts: number;
  /** Demo control: the next attempt fails when it reaches this part (simulated server error). */
  failAt?: number;
  startedAt?: string;
  updatedAt?: string;
  /** Milliseconds per part, measured, used to notice a slow connection. */
  lastChunkMs?: number;
}

export interface InterviewRoom {
  mode: 'PRACTICE' | 'REAL';
  started: boolean;
  qIndex: number;
  answers: { qid: string; text: string; via: AnswerMode; simpler: boolean; at: string }[];
  /** The answer being written, saved on this phone as she types. */
  draft: string;
  form: { what: string; did: string; end: string };
  answerMode: AnswerMode;
  simpler: Record<string, boolean>;
  /** Adaptive follow-ups: ASKED while Q waits for the extra detail, DONE once answered (or skipped). */
  followUp?: Record<string, 'ASKED' | 'DONE'>;
  repeats: number;
  paused: null | { reason: 'OFFLINE' | 'USER' | 'LEFT'; at: string; qIndex: number };
  done: boolean;
  submitted?: { at: string; receipt: string; status: 'SENT_SIMULATED' };
}

export interface PersonState {
  /** First steps (/c/start): 0 about your work, 1 certificate, 2 interview. */
  step: number;
  stepsDone: number[];
  stepMode: Record<number, AnswerMode>;
  work: { text: string; form: { job: string; years: string; where: string } };
  certDetails: { course: string; issuer: string; year: string };
  upload: UploadState | null;
  voice: VoiceState;
  slow: boolean;
  /** Where she was, so Q can say it when she comes back. */
  place: null | { route: string; label: string; at: string; sid: string; left: boolean };
  /** Practice and real interview rooms, kept apart: practice is never proof. Keys: PRACTICE, REAL, J7:<competency>. */
  rooms: Record<string, InterviewRoom>;
  room: string;
  practicesDone: number;
}

export interface TalentCState { people: Record<string, PersonState> }

export const newRoom = (mode: 'PRACTICE' | 'REAL'): InterviewRoom => ({ mode, started: false, qIndex: 0, answers: [], draft: '', form: { what: '', did: '', end: '' }, answerMode: 'TEXT', simpler: {}, repeats: 0, paused: null, done: false });
export const newPerson = (): PersonState => ({
  step: 0, stepsDone: [], stepMode: {}, work: { text: '', form: { job: '', years: '', where: '' } }, certDetails: { course: '', issuer: '', year: '' },
  upload: null, voice: 'UNKNOWN', slow: false, place: null, rooms: {}, room: 'PRACTICE', practicesDone: 0,
});

export const area = { id: 'talent-c', init: (): TalentCState => ({ people: {} }) };

/** Typed accessor. Read-only use returns a default without writing; pass a draft to create the record. */
export const talentC = (w: World) => ((w.areas['talent-c'] ??= { people: {} }) as TalentCState);
export function personC(w: World, personId: string): PersonState {
  const s = talentC(w);
  return (s.people[personId] ??= newPerson());
}
export function roomC(w: World, personId: string, key: string): InterviewRoom {
  const p = personC(w, personId);
  return (p.rooms[key] ??= newRoom(key === 'REAL' ? 'REAL' : 'PRACTICE'));
}
const EMPTY = newPerson();
export const readPersonC = (w: World, personId?: string): PersonState => (personId ? (w.areas['talent-c'] as TalentCState | undefined)?.people[personId] ?? EMPTY : EMPTY);
