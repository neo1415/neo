// Shared pieces for T4 pages: the person's slice, lite mode, "where you were", voice with honest fallback,
// the answer-mode switch (type, speak, form) and the demo controls a reviewer uses on a phone.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { arrive } from '../../ds/motion';
import { MotionConfig } from 'motion/react';
import { QMark } from '../../ds/QMark';
import { actorOf, update, useWorld } from '../../mock/world';
import { personC, readPersonC, type AnswerMode, type PersonState, type VoiceState } from '../../state/areas/talent-c';
import { SID, welcomeBack } from './runtime';

export function useMe() {
  const actor = useWorld((w) => actorOf(w));
  const pid = actor.personId ?? actor.id;
  const me = useWorld((w) => readPersonC(w, pid));
  const plain = useWorld((w) => !!w.q.prefs[actor.id]?.plain);
  const lite = useWorld((w) => !!(actor.personId && w.consents[actor.personId]?.lite));
  const offline = useWorld((w) => w.network === 'offline');
  return { actor, pid, me, plain, lite, offline };
}
export const patchMe = (pid: string, fn: (p: PersonState) => void) => update((w) => fn(personC(w, pid)));

/** Lite mode: no motion at all, bigger targets, no decorative images (CSS keys off data-lite on the shell). */
const Still = createContext(false);
/** True in lite mode: motion elements render in their final state (no fades either, not just no movement). */
export const useStill = () => useContext(Still);
/** The shared "arrive" entrance, or nothing in lite mode. */
export const useArrive = () => (useContext(Still) ? { initial: false as const } : arrive);
export function LiteWrap({ lite, children }: { lite: boolean; children: ReactNode }) {
  return <Still.Provider value={lite}><MotionConfig reducedMotion={lite ? 'always' : 'user'}><div className="talent-c-page" data-lite={lite ? 'on' : undefined}>{children}</div></MotionConfig></Still.Provider>;
}

/** Pages that are mounted right now. Leaving is decided a tick after unmount, so React's StrictMode remount
 *  (and re-renders) never count as "she left". */
const live = new Map<string, number>();
export function onLeave(key: string, f: () => void) {
  live.set(key, (live.get(key) ?? 0) + 1);
  return () => { live.set(key, (live.get(key) ?? 1) - 1); setTimeout(() => { if (!live.get(key)) f(); }, 0); };
}
/** Record where the person is; if they left mid-step (another page, or closed the app), Q says where they were. */
export function usePlace(pid: string, route: string, label: string, unfinished: boolean) {
  const keep = useRef(unfinished); keep.current = unfinished;
  useEffect(() => {
    if (!live.get(`place:${route}`)) update((w) => {
      const p = personC(w, pid);
      // Coming back to the page she left halfway: Q says where she was. (Q taking her somewhere else is not "coming back".)
      if (p.place?.left && p.place.route === route) welcomeBack(w, pid);
      p.place = { route, label, at: new Date().toISOString(), sid: SID, left: false };
    });
    return onLeave(`place:${route}`, () => update((w) => { const p = personC(w, pid); if (p.place && p.place.route === route) p.place.left = keep.current; }));
  }, [pid, route, label]);
}

// ---------------- Voice, with an honest fallback ----------------
type Rec = { start: () => void; stop: () => void; abort?: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; interimResults: boolean; lang: string; continuous?: boolean };
export const VOICE_NOTE: Record<VoiceState, string> = {
  UNKNOWN: '', OK: '',
  OFF: 'Voice is turned off for you. You can turn it on, or type instead.',
  DENIED: 'The microphone isn’t allowed on this phone, so voice can’t work. I’ve switched you to typing. Your words are kept, and short answers are fine.',
  UNAVAILABLE: 'Voice isn’t available on this phone or browser. I’ve switched you to typing. Your words are kept, and short answers are fine.',
};
export function useVoice(pid: string, onText: (t: string) => void, onFallback: () => void) {
  const voicePref = useWorld((w) => !!w.q.prefs[actorOf(w).id]?.voice);
  const state = useWorld((w) => readPersonC(w, pid).voice);
  const [listening, setListening] = useState(false);
  /** True once voice failed here, so the fallback note shows where it happened, not on every later step. */
  const [fell, setFell] = useState(false);
  const rec = useRef<Rec | null>(null);
  useEffect(() => () => rec.current?.abort?.(), []);
  const setState = (v: VoiceState) => patchMe(pid, (p) => { p.voice = v; });
  const start = () => {
    if (listening) { rec.current?.stop(); return; }
    if (!voicePref) { setState('OFF'); return; }
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) { setState('UNAVAILABLE'); setFell(true); onFallback(); return; }
    try {
      const r = new Ctor(); r.lang = 'en-NG'; r.interimResults = true;
      r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
      r.onend = () => setListening(false);
      r.onerror = (e) => { setListening(false); setState(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'DENIED' : 'UNAVAILABLE'); setFell(true); onFallback(); };
      rec.current = r; setListening(true); setState('OK'); r.start();
    } catch { setListening(false); setState('UNAVAILABLE'); setFell(true); onFallback(); }
  };
  const turnOn = () => update((w) => { const a = actorOf(w); w.q.prefs[a.id] = { ...w.q.prefs[a.id], voice: true }; personC(w, pid).voice = 'UNKNOWN'; });
  return { listening, start, state: fell || state === 'OFF' ? state : 'UNKNOWN' as VoiceState, voicePref, turnOn };
}

const PATHS: Record<string, string> = {
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  pause: 'M9 5v14M15 5v14',
  check: 'M5 12.5l4.5 4.5L19 7',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  type: 'M4 7V5h16v2M12 5v14M9 19h6',
  speaker: 'M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  form: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5',
  photo: 'M4 7h3l2-2h6l2 2h3v12H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  alert: 'M12 3l10 18H2zM12 10v4M12 17.5v.5',
  up: 'M12 19V5M6 11l6-6 6 6',
};
export type IconKind = keyof typeof PATHS;
/** Small line icons for T4. Always decorative: the words beside them carry the meaning. */
export function Icon({ k, size = 18 }: { k: IconKind; size?: number }) {
  return <svg className="talent-c-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[k]} /></svg>;
}

const MODE_ICON: Record<AnswerMode, IconKind> = { TEXT: 'type', VOICE: 'mic', FORM: 'form' };
export function ModeSwitch({ value, onChange, label, modes = ['TEXT', 'VOICE', 'FORM'], labels, icons }: { value: AnswerMode; onChange: (m: AnswerMode) => void; label: string; modes?: AnswerMode[]; labels?: Partial<Record<AnswerMode, string>>; icons?: Partial<Record<AnswerMode, IconKind>> }) {
  const L: Record<AnswerMode, string> = { TEXT: 'Type', VOICE: 'Speak', FORM: 'Form', ...labels };
  const I = { ...MODE_ICON, ...icons };
  return (
    <div className="talent-c-modes" role="group" aria-label={label}>
      {modes.map((m) => <button key={m} type="button" aria-pressed={value === m} onClick={() => onChange(m)}><Icon k={I[m]} size={18} /><span>{L[m]}</span></button>)}
    </div>
  );
}

/** The microphone. While listening, Q's mark shows the listening mood and a slow ring breathes (MO-002); lite mode keeps it still. */
export function MicButton({ listening, onClick, label = 'Speak your answer' }: { listening: boolean; onClick: () => void; label?: string }) {
  return (
    <button type="button" className="talent-c-mic" aria-pressed={listening} onClick={onClick}>
      <span className="talent-c-mic-dot" aria-hidden="true">{listening ? <QMark mood="listening" size={30} /> : <Icon k="mic" size={26} />}</span>
      <span>{listening ? 'Listening… tap to stop' : label}</span>
    </button>
  );
}

/** Reviewer controls, visible on phones too (the shell's "Simulate offline" lives in the desktop rail). */
export function DemoControls({ pid, upload }: { pid: string; upload?: boolean }) {
  const offline = useWorld((w) => w.network === 'offline');
  const me = useWorld((w) => readPersonC(w, pid));
  return (
    <details className="talent-c-demo">
      <summary>Demo controls <span className="t14">for reviewers, not part of the app</span></summary>
      <div className="talent-c-demo-row">
        <button type="button" className="ds-btn" aria-pressed={offline} onClick={() => update((w) => { w.network = w.network === 'online' ? 'offline' : 'online'; })}>{offline ? 'Reconnect' : 'Simulate losing connection'}</button>
        <button type="button" className="ds-btn" aria-pressed={me.slow} onClick={() => patchMe(pid, (p) => { p.slow = !p.slow; })}>{me.slow ? 'Connection back to normal' : 'Simulate a slow connection'}</button>
        {upload && <button type="button" className="ds-btn" aria-pressed={me.upload?.failAt !== undefined} onClick={() => patchMe(pid, (p) => {
          const on = p.upload?.failAt === undefined;
          if (!p.upload) p.upload = { evidenceId: 'e_grace_cert', fileName: '', sizeKb: 0, chunks: 10, done: 0, status: 'IDLE', source: 'SAMPLE', attempts: 0 };
          p.upload.failAt = on ? Math.round(p.upload.chunks * 0.6) : undefined;
        })}>{me.upload?.failAt !== undefined ? 'Upload will fail at 60%' : 'Make the upload fail at 60%'}</button>}
      </div>
    </details>
  );
}
