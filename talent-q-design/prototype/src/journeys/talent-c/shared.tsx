// Shared pieces for T4 pages: the person's slice, lite mode, "where you were", voice with honest fallback,
// the answer-mode switch (type, speak, form) and the demo controls a reviewer uses on a phone.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
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
export function LiteWrap({ lite, children }: { lite: boolean; children: ReactNode }) {
  return <MotionConfig reducedMotion={lite ? 'always' : 'user'}><div className="talent-c-page" data-lite={lite ? 'on' : undefined}>{children}</div></MotionConfig>;
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

export function ModeSwitch({ value, onChange, label, modes = ['TEXT', 'VOICE', 'FORM'], labels }: { value: AnswerMode; onChange: (m: AnswerMode) => void; label: string; modes?: AnswerMode[]; labels?: Partial<Record<AnswerMode, string>> }) {
  const L: Record<AnswerMode, string> = { TEXT: 'Type', VOICE: 'Speak', FORM: 'Form', ...labels };
  return (
    <div className="talent-c-modes" role="group" aria-label={label}>
      {modes.map((m) => <button key={m} type="button" aria-pressed={value === m} onClick={() => onChange(m)}>{L[m]}</button>)}
    </div>
  );
}

export function MicButton({ listening, onClick, label = 'Speak your answer' }: { listening: boolean; onClick: () => void; label?: string }) {
  return (
    <button type="button" className="talent-c-mic" aria-pressed={listening} onClick={onClick}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
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
      <summary>Demo controls <span className="ds-sim">Simulated</span></summary>
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
