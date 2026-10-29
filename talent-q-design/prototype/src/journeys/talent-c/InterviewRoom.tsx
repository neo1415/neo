// The interview room (/c/interview), Direction D, phone-first. The questions are the canvas; the global Q
// is the only conversation (ask it to repeat, simplify, pause or explain). Answers by typing, speaking or a
// simple form, with an honest fallback when voice can't work. Nothing is timed. If the connection drops,
// the answer being written is kept on this phone, the interview pauses and carries on when it's back.
// Practice is private and never counted as proof; the real (simulated) interview shows what the employer sees.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Canvas } from '../../ds/Workspace';
import { update, useWorld } from '../../mock/world';
import { personC, readPersonC, roomC, type AnswerMode } from '../../state/areas/talent-c';
import { Link, useRoute } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { answerCurrent, bankOfRoom, qText, startRoom, tipsFor } from './interview';
import { timeText, whenText } from './questions';
import { DemoControls, LiteWrap, MicButton, ModeSwitch, VOICE_NOTE, onLeave, patchMe, useMe, usePlace, useVoice } from './shared';

export function speak(text: string) {
  try { const s = window.speechSynthesis; if (!s) return; s.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 0.92; s.speak(u); } catch { /* no speech on this device */ }
}

export function InterviewRoom() {
  const { query } = useRoute();
  const practiceId = query.get('practice');
  const { actor, pid, me, plain, lite, offline } = useMe();
  const key = practiceId ? `J7:${practiceId}` : me.room === 'REAL' ? 'REAL' : 'PRACTICE';
  useEffect(() => { if (practiceId) patchMe(pid, (p) => { p.room = `J7:${practiceId}`; }); else if (me.room.startsWith('J7:')) patchMe(pid, (p) => { p.room = 'PRACTICE'; }); }, [practiceId, pid]); // eslint-disable-line react-hooks/exhaustive-deps
  const bank = useWorld((w) => bankOfRoom(w, pid, key));
  const room = me.rooms[key];
  const real = key === 'REAL';
  usePlace(pid, '/c/interview', real ? 'your interview' : 'practice', !!room?.started && !room.done);
  // Leaving mid-question pauses honestly (the answer stays saved).
  useEffect(() => onLeave(`room:${key}`, () => update((w) => { const r = personC(w, pid).rooms[key]; if (r?.started && !r.done && !r.paused) r.paused = { reason: 'LEFT', at: new Date().toISOString(), qIndex: r.qIndex }; })), [pid, key]);
  const setRoom = (k: 'PRACTICE' | 'REAL') => patchMe(pid, (p) => { p.room = k; });
  const q = room ? bank.questions[room.qIndex] : bank.questions[0];
  const title = !room?.started ? (real ? `Your interview with ${bank.org}` : bank.j7 ? 'Practice question' : `Practise for ${bank.org}`)
    : room.done ? (real ? (room.submitted ? 'Your answers are sent' : 'Check your answers before sending') : 'Practice finished')
    : `Question ${room.qIndex + 1} of ${bank.questions.length}`;
  return (
    <LiteWrap lite={lite}>
      <Canvas title={title} kicker={real ? `${bank.org} · ${bank.title} · real interview` : bank.j7 ? 'Private practice' : `Practice · only you see this`} open onClose={() => {}}>
        {!bank.j7 && (
          <div className="talent-c-modes talent-c-roomswitch" role="group" aria-label="Practice or real interview">
            <button type="button" aria-pressed={!real} onClick={() => setRoom('PRACTICE')}>Practise</button>
            <button type="button" aria-pressed={real} onClick={() => setRoom('REAL')}>Real interview</button>
          </div>
        )}
        <WhoSees real={real} org={bank.org} plain={plain} />
        {offline && room?.started && !room.done && (
          <div className="ds-banner talent-c-banner" data-k="warn" role="alert">
            <span><b>We lost connection at question {(room.paused?.qIndex ?? room.qIndex) + 1}.</b> Your answer so far is saved on this phone. The interview is paused and nothing is timed; it carries on when you’re back. You can keep writing.</span>
          </div>
        )}
        {!offline && room?.paused && !room.done && (
          <div className="ds-banner talent-c-banner" role="status">
            <span><b>Paused at question {room.paused.qIndex + 1}{room.paused.reason === 'LEFT' ? ' when you left' : ''}.</b> {room.draft.trim() ? 'Your answer so far is still here.' : 'Nothing was lost.'}</span>
            <button type="button" className="ds-btn primary" onClick={() => patchMe(pid, (p) => { p.rooms[key].paused = null; })}>Carry on</button>
          </div>
        )}
        {!room?.started && <Intro real={real} bankWhen={bank.when} tz={actor.timezone} count={bank.questions.length} org={bank.org} onStart={() => update((w) => startRoom(w, pid, key))} />}
        {room?.started && !room.done && q && <QuestionCard pid={pid} k={key} plain={plain} offline={offline} />}
        {room?.done && !real && <PracticeDone pid={pid} k={key} org={bank.org} j7={!!bank.j7} />}
        {room?.done && real && <RealDone pid={pid} />}
        <DemoControls pid={pid} />
      </Canvas>
    </LiteWrap>
  );
}

function WhoSees({ real, org, plain }: { real: boolean; org: string; plain: boolean }) {
  if (!real) return <p className="talent-c-who" data-k="practice"><b>Private practice.</b> Only you see it. It never counts as proof and {org} never sees it. {plain ? 'Try as many times as you like.' : ''}</p>;
  return (
    <details className="talent-c-who" data-k="real" open>
      <summary><b>What {org} will see</b></summary>
      <ul>
        <li>Your final answers, exactly as you send them, and whether you typed or spoke them.</li>
        <li>The wording you answered. If you asked for simpler words, they see the simpler question.</li>
      </ul>
      <p className="t14" style={{ margin: 0 }}><b>They won’t see:</b> your practice, drafts you deleted, pauses, or how long you took. A person at {org} reads your answers. Q doesn’t decide.</p>
    </details>
  );
}

function Intro({ real, bankWhen, tz, count, org, onStart }: { real: boolean; bankWhen?: string; tz: string; count: number; org: string; onStart: () => void }) {
  return (
    <section className="ds-sheet talent-c-card" aria-labelledby="iv-intro">
      <h2 id="iv-intro" className="voice t24">{real ? `${count} questions from ${org}` : `${count} practice ${count === 1 ? 'question' : 'questions'}`}</h2>
      {real && <p>Booked for <b>{whenText(bankWhen, tz)}</b>{bankWhen ? ` (${timeText(bankWhen, tz)} your time)` : ''}. <span className="ds-sim">Simulated: you can open it now</span></p>}
      <ul className="talent-c-list">
        <li>No time limit. Pause whenever you like.</li>
        <li>Answer by typing, speaking or a simple form. Switch any time.</li>
        <li>Ask Q “say it again” or “simpler words” whenever you need.</li>
      </ul>
      <button type="button" className="ds-btn primary talent-c-big" onClick={onStart}>{real ? 'Start the interview' : 'Start practising'}</button>
    </section>
  );
}

function QuestionCard({ pid, k, plain, offline }: { pid: string; k: string; plain: boolean; offline: boolean }) {
  const room = useWorld((w) => readPersonC(w, pid).rooms[k]);
  const bank = useWorld((w) => bankOfRoom(w, pid, k));
  const q = bank.questions[room.qIndex];
  const text = qText(q, room);
  const set = (fn: (r: typeof room) => void) => update((w) => fn(roomC(w, pid, k)));
  const v = useVoice(pid, (t) => set((r) => { r.draft = t; }), () => set((r) => { r.answerMode = 'TEXT'; }));
  const mode: AnswerMode = room.answerMode;
  const canSend = mode === 'FORM' ? !!(room.form.what.trim() || room.form.did.trim()) : !!room.draft.trim();
  const paused = !!room.paused;
  const last = room.qIndex + 1 === bank.questions.length;
  return (
    <>
      <section className="ds-sheet talent-c-card talent-c-question" aria-labelledby="iv-q" aria-live="polite">
        <span className="lab">Question {room.qIndex + 1} of {bank.questions.length}{q.requiredBy ? ` · asked by ${q.requiredBy}` : ''}{room.simpler[q.id] ? ' · simpler words' : ''}</span>
        <AnimatePresence mode="wait">
          <motion.h2 key={text + room.repeats} id="iv-q" className="voice talent-c-qtext" initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>{text}</motion.h2>
        </AnimatePresence>
        {plain && <p className="t14 muted" style={{ margin: 0 }}>Tip: {q.hint}</p>}
        <div className="talent-c-actions">
          <button type="button" className="ds-btn" onClick={() => { set((r) => { r.repeats += 1; }); speak(text); }}>Say it again</button>
          <button type="button" className="ds-btn" aria-pressed={!!room.simpler[q.id]} onClick={() => set((r) => { r.simpler[q.id] = !r.simpler[q.id]; })}>{room.simpler[q.id] ? 'Original words' : 'Simpler words'}</button>
        </div>
        {room.repeats > 0 && <p className="sr" aria-live="assertive">Question again: {text}</p>}
      </section>
      <section className="ds-sheet talent-c-card" aria-labelledby="iv-a">
        <h3 id="iv-a" className="t19" style={{ margin: 0 }}>Your answer</h3>
        <ModeSwitch value={mode} onChange={(m) => set((r) => { r.answerMode = m; })} label="Answer by" />
        {mode === 'VOICE' && (
          <div className="talent-c-voice">
            {!v.voicePref ? <p className="talent-c-note" role="status">{VOICE_NOTE.OFF} <button type="button" className="ds-btn" onClick={v.turnOn}>Turn voice on</button></p> : <MicButton listening={v.listening} onClick={v.start} />}
          </div>
        )}
        {(v.state === 'DENIED' || v.state === 'UNAVAILABLE') && <p className="talent-c-note" role="alert">{VOICE_NOTE[v.state]}</p>}
        {mode !== 'FORM' ? (
          <div className="ds-field"><label htmlFor="iv-draft">{mode === 'VOICE' ? 'What Q heard (you can fix it)' : 'Type your answer'}</label>
            <textarea id="iv-draft" className="ds-input talent-c-area" rows={5} value={room.draft} onChange={(e) => { const t = e.target.value; set((r) => { r.draft = t; }); }} /></div>
        ) : (
          <div className="talent-c-form">
            {([['what', 'What happened?'], ['did', 'What did you do?'], ['end', 'How did it end?']] as const).map(([f, l]) => (
              <div key={f} className="ds-field"><label htmlFor={`iv-${f}`}>{l}</label><textarea id={`iv-${f}`} className="ds-input" rows={2} value={room.form[f]} onChange={(e) => { const t = e.target.value; set((r) => { r.form[f] = t; }); }} /></div>
            ))}
          </div>
        )}
        <p className="t14 muted" aria-live="polite" style={{ margin: 0 }}>{room.draft.trim() || room.form.what.trim() ? 'Saved on this phone as you type.' : 'Short answers are fine.'}</p>
        <div className="talent-c-actions">
          <button type="button" className="ds-btn primary talent-c-big" disabled={!canSend || offline || paused} onClick={() => update((w) => { answerCurrent(w, pid, mode); })}>
            {offline ? 'Waiting for connection' : last ? 'Save answer and finish' : 'Save answer, next question'}
          </button>
          {!paused && <button type="button" className="ds-btn" onClick={() => set((r) => { r.paused = { reason: 'USER', at: new Date().toISOString(), qIndex: r.qIndex }; })}>Pause</button>}
        </div>
      </section>
    </>
  );
}

function PracticeDone({ pid, k, org, j7 }: { pid: string; k: string; org: string; j7: boolean }) {
  const room = useWorld((w) => readPersonC(w, pid).rooms[k]);
  return (
    <section className="ds-sheet talent-c-card" aria-labelledby="pd-h">
      <h2 id="pd-h" className="voice t24">Well done. Here are a few simple tips.</h2>
      <ul className="talent-c-list">{tipsFor(room).map((t) => <li key={t}>{t}</li>)}</ul>
      <p className="talent-c-who" data-k="practice">This practice is private. It isn’t a score, it never counts as proof, and {org} never sees it. <span className="ds-sim">Tips are simulated</span></p>
      <div className="talent-c-actions">
        <button type="button" className="ds-btn primary" onClick={() => update((w) => startRoom(w, pid, k))}>Practise again</button>
        {!j7 && <button type="button" className="ds-btn" onClick={() => patchMe(pid, (p) => { p.room = 'REAL'; })}>Go to the real interview</button>}
        {j7 && <Link className="ds-btn" to="/c/growth">Back to readiness</Link>}
      </div>
    </section>
  );
}

function RealDone({ pid }: { pid: string }) {
  const room = useWorld((w) => readPersonC(w, pid).rooms.REAL);
  const [confirm, setConfirm] = useState(false);
  const bank = useWorld((w) => bankOfRoom(w, pid, 'REAL'));
  const offline = useWorld((w) => w.network === 'offline');
  if (room.submitted) return (
    <section className="ds-sheet talent-c-card" aria-labelledby="rd-h">
      <h2 id="rd-h" className="voice t24">Sent to {bank.org}</h2>
      <p>Receipt <span className="num">{room.submitted.receipt}</span> · <span className="ds-sim">Sent (simulated)</span></p>
      <p>A person at {bank.org} reads your answers. Q doesn’t decide, and can’t tell you the result. You’ll hear from {bank.org} directly.</p>
      <Link className="ds-btn" to="/c/home">Back to home</Link>
    </section>
  );
  return (
    <section className="ds-sheet talent-c-card" aria-labelledby="rd-h">
      <h2 id="rd-h" className="voice t24">This is exactly what {bank.org} will see</h2>
      <ol className="talent-c-review">
        {room.answers.map((a) => { const q = bank.questions.find((x) => x.id === a.qid)!; return (
          <li key={a.qid}><p className="t14 muted" style={{ margin: 0 }}>{a.simpler ? q.simpler : q.text}</p><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{a.text}</p><span className="t14 muted">{a.via === 'VOICE' ? 'Spoken' : a.via === 'FORM' ? 'Form' : 'Typed'}</span></li>
        ); })}
      </ol>
      <p>Sending can’t be undone. You can change any answer first.</p>
      <div className="talent-c-actions">
        {!confirm ? <button type="button" className="ds-btn primary talent-c-big" disabled={offline} onClick={() => setConfirm(true)}>{offline ? 'Waiting for connection' : `Send my answers to ${bank.org}`}</button>
          : <div className="talent-c-confirm" role="group" aria-label="Confirm sending">
              <p style={{ margin: 0 }}><b>Send these {room.answers.length} answers to {bank.org} now?</b></p>
              <button type="button" className="ds-btn primary talent-c-big" disabled={offline} onClick={() => void runAction({ label: 'Yes, send them', act: { t: 'do', op: 'talent-c.interview.submit' } })}>Yes, send them <span className="ds-sim">Simulated</span></button>
              <button type="button" className="ds-btn" onClick={() => setConfirm(false)}>Not yet</button>
            </div>}
        <button type="button" className="ds-btn" onClick={() => update((w) => { const r = roomC(w, pid, 'REAL'); r.done = false; r.qIndex = 0; const a = r.answers[0]; r.draft = a?.via === 'FORM' ? '' : a?.text ?? ''; })}>Change my answers</button>
      </div>
      <p className="t14 muted">You can also tell Q “send my answers”. Nothing is sent until you say yes.</p>
    </section>
  );
}
