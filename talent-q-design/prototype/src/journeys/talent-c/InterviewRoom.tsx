// The interview room (/c/interview), Direction D, phone-first. The questions are the canvas; the global Q
// is the only conversation (ask it to repeat, simplify, pause or explain). Answers by typing, speaking or a
// simple form, with an honest fallback when voice can't work. Nothing is timed. If the connection drops,
// the answer being written is kept on this phone, the interview pauses and carries on when it's back.
// Practice is private and never counted as proof; the real (simulated) interview shows what the employer sees.
//
// Design pass (journeys/design/talent-c.md): one question in focus, progress you can see, compact controls
// close to the question, a calm pause/offline state that never hides the answer, a review that reads like the
// employer's copy and a receipt that ends the journey properly. Motion uses src/ds/motion.ts tokens and never
// gates an action (the motion element is keyed; nothing waits for an exit). Lite mode turns all of it off.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { QMark } from '../../ds/QMark';
import { DUR, EASE, arrive } from '../../ds/motion';
import { update, useWorld } from '../../mock/world';
import { personC, readPersonC, roomC, type AnswerMode } from '../../state/areas/talent-c';
import { Link, useRoute } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { answerCurrent, bankOfRoom, isFollowUp, qText, skipFollowUp, startRoom, tipsFor } from './interview';
import { timeText, whenText } from './questions';
import { DemoControls, Icon, useArrive, useStill, LiteWrap, MicButton, ModeSwitch, VOICE_NOTE, onLeave, patchMe, useMe, usePlace, useVoice } from './shared';

/** Read the question aloud. Returns a stop function; calls onEnd when speech ends, fails or isn't available. */
export function speak(text: string, onEnd?: () => void) {
  let done = false; const end = () => { if (!done) { done = true; onEnd?.(); } };
  try {
    const s = window.speechSynthesis; if (!s) { end(); return () => {}; }
    s.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 0.92;
    u.onend = end; u.onerror = end; s.speak(u);
    // Some phones never fire onend: release the button after roughly the time it takes to read.
    const t = window.setTimeout(end, Math.min(20000, 1500 + text.length * 70));
    return () => { window.clearTimeout(t); try { s.cancel(); } catch { /* ignore */ } end(); };
  } catch { end(); return () => {}; }
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
  const asking = !!room?.started && !room.done;
  const title = !room?.started ? (real ? `Your interview with ${bank.org}` : bank.j7 ? 'Practice question' : `Practise for ${bank.org}`)
    : room.done ? (real ? (room.submitted ? 'Your answers are sent' : 'Check your answers before sending') : 'Practice finished')
    : real ? `Your ${bank.org} interview` : 'Practice interview';
  // Kicker: one line of context. Practice or real is a tag beside the title, never squeezed into the kicker.
  const kicker = bank.j7 ? 'Readiness · one question' : `${bank.org} · ${bank.title}`;
  const tag = real
    ? <span className="ds-tag talent-c-roomtag" data-k="real"><Icon k="lock" /> Real interview</span>
    : <span className="ds-tag talent-c-roomtag" data-k="practice"><Glyph k="practice" size={14} /> Private practice · only you see it</span>;
  const reconnected = useBackOnline(offline, asking);
  // Practice or real: before starting it leads the page; once finished it follows the result (the ending comes first).
  const switcher = (
    <div className="talent-c-modes talent-c-roomswitch" role="group" aria-label="Practice or real interview">
      <button type="button" aria-pressed={!real} onClick={() => setRoom('PRACTICE')}>Practise</button>
      <button type="button" aria-pressed={real} onClick={() => setRoom('REAL')}>Real interview</button>
    </div>
  );
  const enter = lite ? { initial: false as const } : arrive; // outside LiteWrap's context, so read lite directly
  return (
    <LiteWrap lite={lite}>
      <Canvas title={title} kicker={kicker} aside={tag} open onClose={() => {}}>
        {!bank.j7 && !room?.started && switcher}
        {/* Mid-question, practice is marked by the header tag alone; the real room keeps a one-line "what they see". */}
        {!(real && room?.submitted) && !(asking && !real) && !(room?.done && !real) && <WhoSees real={real} org={bank.org} plain={plain} compact={asking || !!room?.done} />}
        {offline && asking && (
          <motion.div {...enter} className="ds-banner talent-c-banner talent-c-state" data-k="warn" role="alert">
            <span className="talent-c-state-icon" aria-hidden="true"><QMark mood="offline" size={28} /></span>
            <span><b>We lost connection at question {(room.paused?.qIndex ?? room.qIndex) + 1}.</b> Your answer so far is saved on this phone. Keep writing if you like; the interview carries on when you’re back.</span>
          </motion.div>
        )}
        {!offline && room?.paused && asking && (
          <motion.div {...enter} className="ds-banner talent-c-banner talent-c-state" role="status">
            <span className="talent-c-state-icon" aria-hidden="true"><Icon k="pause" /></span>
            <span><b>Paused at question {room.paused.qIndex + 1}{room.paused.reason === 'LEFT' ? ' when you left' : ''}.</b> {room.draft.trim() ? 'Your answer so far is still here.' : 'Nothing was lost.'} There’s no clock.</span>
            <button type="button" className="ds-btn primary" onClick={() => patchMe(pid, (p) => { p.rooms[key].paused = null; })}>Carry on</button>
          </motion.div>
        )}
        {reconnected && !offline && !room?.paused && asking && (
          <motion.p {...enter} className="talent-c-flashnote" role="status"><Icon k="check" /> Connected again. Carrying on at question {room.qIndex + 1}.</motion.p>
        )}
        {!room?.started && <Intro real={real} bankWhen={bank.when} tz={actor.timezone} count={bank.questions.length} org={bank.org} onStart={() => update((w) => startRoom(w, pid, key))} />}
        {asking && q && <QuestionCard pid={pid} k={key} plain={plain} offline={offline} />}
        {room?.done && !real && <PracticeDone pid={pid} k={key} org={bank.org} j7={!!bank.j7} first={actor.first} />}
        {room?.done && real && <RealDone pid={pid} />}
        {!bank.j7 && room?.done && real && switcher}
        <DemoControls pid={pid} />
      </Canvas>
    </LiteWrap>
  );
}

/** True for a few seconds after the connection comes back (MO-007, "reconnected"). */
function useBackOnline(offline: boolean, active: boolean) {
  const was = useRef(offline); const [show, setShow] = useState(false);
  useEffect(() => {
    if (was.current && !offline && active) { setShow(true); const t = window.setTimeout(() => setShow(false), 4000); was.current = offline; return () => window.clearTimeout(t); }
    was.current = offline; return undefined;
  }, [offline, active]);
  return show;
}

function WhoSees({ real, org, plain, compact }: { real: boolean; org: string; plain: boolean; compact: boolean }) {
  if (!real) return (
    <p className="talent-c-who" data-k="practice"><Glyph k="practice" size={18} /> <span><b>Only you see this.</b> Practice never counts as proof and {org} never sees it.{plain && !compact ? ' Try as many times as you like.' : ''}</span></p>
  );
  return (
    <details className="talent-c-who" data-k="real" open={!compact}>
      <summary><Icon k="eye" /> <b>What {org} will see</b></summary>
      <ul>
        <li>Your final answers, exactly as you send them, and whether you typed or spoke them.</li>
        <li>The wording you answered. If you asked for simpler words, they see the simpler question.</li>
      </ul>
      <p className="t14" style={{ margin: 0 }}><b>They won’t see</b> your practice, drafts you deleted, pauses or how long you took. A person at {org} reads your answers. Q doesn’t decide.</p>
    </details>
  );
}

function Intro({ real, bankWhen, tz, count, org, onStart }: { real: boolean; bankWhen?: string; tz: string; count: number; org: string; onStart: () => void }) {
  return (
    <section className="ds-sheet talent-c-card" aria-labelledby="iv-intro">
      <h2 id="iv-intro" className="voice t24">{real ? `${count} questions from ${org}` : `${count} practice ${count === 1 ? 'question' : 'questions'}`}</h2>
      {real && <p>Booked for <b>{whenText(bankWhen, tz)}</b>{bankWhen ? ` (${timeText(bankWhen, tz)} your time)` : ''}. <span className="ds-sim">Simulated: you can open it now</span></p>}
      <ul className="talent-c-points">
        <li><Icon k="clock" /> <span><b>No time limit.</b> Pause whenever you like.</span></li>
        <li><Icon k="type" /> <span><b>Type, speak or use a simple form.</b> Switch any time; your words are kept.</span></li>
        <li><Icon k="speaker" /> <span><b>Stuck on a question?</b> Tap “Say it again” or “Simpler words”, or ask Q.</span></li>
      </ul>
      <button type="button" className="ds-btn primary talent-c-big" onClick={onStart}>{real ? 'Start the interview' : 'Start practising'}</button>
    </section>
  );
}

/** Segmented progress (MO-022): one segment per question, the text carries the meaning. */
function Progress({ n, of, answered }: { n: number; of: number; answered: number }) {
  if (of < 2) return null;
  return (
    <span className="talent-c-meter" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => <i key={i} data-s={i < answered ? 'done' : i === n ? 'now' : undefined} />)}
    </span>
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
  const fu = isFollowUp(q, room);
  const firstAnswer = fu ? room.answers.find((a) => a.qid === q.id)?.text : undefined;
  const [reading, setReading] = useState(false);
  const enter = useArrive(); const still = useStill();
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);
  // MO-021: a short "saved" note after each answer, on the next question. It never blocks anything.
  const [saved, setSaved] = useState('');
  useEffect(() => { if (!saved) return undefined; const t = window.setTimeout(() => setSaved(''), 3500); return () => window.clearTimeout(t); }, [saved]);
  const save = () => {
    const n = room.qIndex + 1; const wasFu = fu;
    let moved = false; update((w) => { moved = answerCurrent(w, pid, mode); });
    if (moved) setSaved(wasFu ? `Follow-up added to answer ${n}.` : `Answer ${n} saved.`);
  };
  const sayAgain = () => {
    set((r) => { r.repeats += 1; });
    if (reading) { stop.current(); return; }
    setReading(true); stop.current = speak(text, () => setReading(false));
  };
  return (
    <>
      <section className="ds-sheet talent-c-card talent-c-question" data-fu={fu ? '1' : undefined} aria-labelledby="iv-q" aria-live="polite">
        <div className="talent-c-qhead">
          <div className="lab">
            <span>Question {room.qIndex + 1} of {bank.questions.length}</span>
            {fu && <span className="talent-c-chip" data-k="fu">follow-up</span>}
            {room.simpler[q.id] && !fu && <span className="talent-c-chip">simpler words</span>}
            {q.requiredBy && <span className="talent-c-chip" data-k="quiet">asked by {q.requiredBy}</span>}
          </div>
          <Progress n={room.qIndex} of={bank.questions.length} answered={room.qIndex} />
        </div>
        {/* MO-019 / MO-020: a new question rises in; a clarification (simpler words, follow-up) cross-fades. Keyed, so nothing waits. */}
        <motion.h2 key={`${q.id}:${fu ? 'fu' : ''}`} id="iv-q" className="voice talent-c-qtext" initial={still ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.slow, ease: EASE.enter }}>
          <motion.span key={text} initial={still ? false : { opacity: 0.35 }} animate={{ opacity: 1 }} transition={{ duration: DUR.normal, ease: EASE.enter }}>{text}</motion.span>
        </motion.h2>
        {room.repeats > 0 && !still && <motion.span key={room.repeats} className="talent-c-flash" aria-hidden="true" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE.exit }} />}
        {fu && (
          <div className="talent-c-followup">
            <p className="t14" style={{ margin: 0 }}><b>One follow-up.</b> Your first answer is saved. This question needs a little more detail, so Q asks one more thing. Add it, or skip it: your first answer still counts.</p>
            {firstAnswer && <p className="talent-c-quote t14">You said: “{firstAnswer.length > 140 ? `${firstAnswer.slice(0, 140)}…` : firstAnswer}”</p>}
            <button type="button" className="ds-btn" onClick={() => update((w) => skipFollowUp(w, pid))}>Skip this follow-up</button>
          </div>
        )}
        {plain && !fu && <p className="talent-c-tip"><span className="talent-c-tiplab">Tip</span> {q.hint}</p>}
        <div className="talent-c-qtools">
          <button type="button" className="ds-btn" aria-pressed={reading} onClick={sayAgain}><Icon k="speaker" /> {reading ? 'Reading it out…' : 'Say it again'}</button>
          {!fu && <button type="button" className="ds-btn" aria-pressed={!!room.simpler[q.id]} onClick={() => set((r) => { r.simpler[q.id] = !r.simpler[q.id]; })}><Icon k="type" /> {room.simpler[q.id] ? 'Original words' : 'Simpler words'}</button>}
        </div>
        {room.repeats > 0 && <p className="sr" aria-live="assertive">Question again: {text}</p>}
      </section>
      <section className="ds-sheet talent-c-card talent-c-answer" aria-labelledby="iv-a" data-paused={paused || offline ? '1' : undefined}>
        <div className="talent-c-ahead">
          <h3 id="iv-a" className="t19" style={{ margin: 0 }}>{fu ? 'Add a little more' : 'Your answer'}</h3>
          {saved && <motion.span {...enter} key={saved} className="talent-c-saved" role="status"><Icon k="check" /> {saved}</motion.span>}
        </div>
        <ModeSwitch value={mode} onChange={(m) => set((r) => { r.answerMode = m; })} label="Answer by" />
        {mode === 'VOICE' && (
          <div className="talent-c-voice">
            {!v.voicePref ? <p className="talent-c-note" role="status">{VOICE_NOTE.OFF} <button type="button" className="ds-btn" onClick={v.turnOn}>Turn voice on</button></p> : <MicButton listening={v.listening} onClick={v.start} />}
          </div>
        )}
        {(v.state === 'DENIED' || v.state === 'UNAVAILABLE') && <p className="talent-c-note" role="alert">{VOICE_NOTE[v.state]}</p>}
        {mode !== 'FORM' ? (
          <div className="ds-field"><label htmlFor="iv-draft">{mode === 'VOICE' ? 'What Q heard (you can fix it)' : 'Type your answer'}</label>
            <textarea id="iv-draft" className="ds-input talent-c-area" rows={5} value={room.draft} onChange={(e) => { const t = e.target.value; set((r) => { r.draft = t; }); }} placeholder={fu ? 'One or two sentences is plenty.' : 'Short answers are fine.'} /></div>
        ) : (
          <div className="talent-c-form">
            {([['what', 'What happened?'], ['did', 'What did you do?'], ['end', 'How did it end?']] as const).map(([f, l]) => (
              <div key={f} className="ds-field"><label htmlFor={`iv-${f}`}>{l}</label><textarea id={`iv-${f}`} className="ds-input" rows={2} value={room.form[f]} onChange={(e) => { const t = e.target.value; set((r) => { r.form[f] = t; }); }} /></div>
            ))}
          </div>
        )}
        <p className="talent-c-keep t14" aria-live="polite">{room.draft.trim() || room.form.what.trim() ? <><Icon k="check" /> Saved on this phone as you type.</> : 'Nothing is sent until you save it.'}</p>
        <div className="talent-c-actions talent-c-sendrow">
          <button type="button" className="ds-btn primary talent-c-big" disabled={!canSend || offline || paused} onClick={save}>
            {offline ? 'Waiting for connection' : fu ? 'Save answer and go on' : last ? 'Save answer and finish' : 'Save answer, next question'}
          </button>
          {!paused && !offline && <button type="button" className="ds-btn" onClick={() => set((r) => { r.paused = { reason: 'USER', at: new Date().toISOString(), qIndex: r.qIndex }; })}><Icon k="pause" /> Pause</button>}
        </div>
      </section>
    </>
  );
}

function PracticeDone({ pid, k, org, j7, first }: { pid: string; k: string; org: string; j7: boolean; first: string }) {
  const room = useWorld((w) => readPersonC(w, pid).rooms[k]);
  const tips = tipsFor(room); const still = useStill();
  return (
    <section className="ds-sheet talent-c-card talent-c-end" aria-labelledby="pd-h">
      <motion.span className="talent-c-endmark" aria-hidden="true" initial={still ? false : { scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: DUR.slow, ease: EASE.enter }}><Icon k="check" size={30} /></motion.span>
      <h2 id="pd-h" className="voice t24">Well done{first ? `, ${first}` : ''}. You answered {room.answers.length === 1 ? 'the question' : `all ${room.answers.length}`}.</h2>
      <p className="muted">A few simple tips for next time:</p>
      <ul className="talent-c-tips">{tips.map((t, i) => <motion.li key={t} initial={still ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.normal, ease: EASE.enter, delay: i * 0.04 }}>{t}</motion.li>)}</ul>
      <p className="talent-c-who" data-k="practice"><Glyph k="practice" size={18} /> <span>This practice is private. It isn’t a score, it never counts as proof, and {org} never sees it. <span className="ds-sim">Tips are simulated</span></span></p>
      <div className="talent-c-actions">
        {!j7 && <button type="button" className="ds-btn primary" onClick={() => patchMe(pid, (p) => { p.room = 'REAL'; })}>Go to the real interview</button>}
        <button type="button" className={`ds-btn${j7 ? ' primary' : ''}`} onClick={() => update((w) => startRoom(w, pid, k))}>Practise again</button>
        {j7 && <Link className="ds-btn" to="/c/growth">Back to readiness</Link>}
      </div>
    </section>
  );
}

function RealDone({ pid }: { pid: string }) {
  const room = useWorld((w) => readPersonC(w, pid).rooms.REAL);
  const [confirm, setConfirm] = useState(false);
  const enter = useArrive(); const still = useStill();
  const bank = useWorld((w) => bankOfRoom(w, pid, 'REAL'));
  const offline = useWorld((w) => w.network === 'offline');
  const answers = (
    <ol className="talent-c-review">
      {room.answers.map((a, i) => { const q = bank.questions.find((x) => x.id === a.qid)!; return (
        <li key={a.qid}>
          <span className="talent-c-review-h"><span className="lab">Question {i + 1}</span><span className="ds-tag">{a.via === 'VOICE' ? 'Spoken' : a.via === 'FORM' ? 'Form' : 'Typed'}</span>{a.simpler && <span className="ds-tag">Simpler words</span>}</span>
          <p className="talent-c-review-q">{a.simpler ? q.simpler : q.text}</p>
          <p className="talent-c-review-a">{a.text}</p>
        </li>
      ); })}
    </ol>
  );
  if (room.submitted) {
    const at = new Date(room.submitted.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return (
      <section className="ds-sheet talent-c-card talent-c-end" aria-labelledby="rd-h">
        {/* MO-028: the receipt arrives once; under reduced motion or lite it is simply there. */}
        <motion.span className="talent-c-endmark" aria-hidden="true" initial={still ? false : { scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: DUR.slow, ease: EASE.enter }}><Icon k="check" size={30} /></motion.span>
        <h2 id="rd-h" className="voice t24">Sent to {bank.org}. Well done.</h2>
        <dl className="talent-c-receipt">
          <div><dt>Receipt</dt><dd className="num">{room.submitted.receipt}</dd></div>
          <div><dt>Sent</dt><dd>{at}</dd></div>
          <div><dt>Answers</dt><dd>{room.answers.length}</dd></div>
          <div><dt>Status</dt><dd><span className="ds-sim">Sent (simulated)</span></dd></div>
        </dl>
        <h3 className="t19" style={{ margin: 0 }}>What happens next</h3>
        <ul className="talent-c-points">
          <li><Icon k="eye" /> <span>A person at {bank.org} reads your answers.</span></li>
          <li><Icon k="lock" /> <span>Q doesn’t decide, and can’t tell you the result.</span></li>
          <li><Icon k="mail" /> <span>You’ll hear from {bank.org} directly.</span></li>
        </ul>
        <details className="talent-c-sent"><summary>See what you sent</summary>{answers}</details>
        <div className="talent-c-actions"><Link className="ds-btn primary" to="/c/home">Back to home</Link></div>
      </section>
    );
  }
  return (
    <section className="ds-sheet talent-c-card" aria-labelledby="rd-h">
      <h2 id="rd-h" className="voice t24">This is exactly what {bank.org} will see</h2>
      {answers}
      <p className="talent-c-keep t14"><Icon k="lock" /> Sending can’t be undone. You can change any answer first.</p>
      {!confirm ? (
        <div className="talent-c-actions">
          <button type="button" className="ds-btn primary talent-c-big" disabled={offline} onClick={() => setConfirm(true)}>{offline ? 'Waiting for connection' : `Send my answers to ${bank.org}`}</button>
          <button type="button" className="ds-btn" onClick={() => update((w) => { const r = roomC(w, pid, 'REAL'); r.done = false; r.qIndex = 0; const a = r.answers[0]; r.draft = a?.via === 'FORM' ? '' : a?.text ?? ''; })}>Change my answers</button>
        </div>
      ) : (
        <motion.div {...enter} className="talent-c-confirm" role="group" aria-label="Confirm sending">
          <p style={{ margin: 0 }}><b>Send these {room.answers.length} answers to {bank.org} now?</b> They’ll see them exactly as shown above.</p>
          <div className="talent-c-actions">
            <button type="button" className="ds-btn primary talent-c-big" disabled={offline} onClick={() => void runAction({ label: 'Yes, send them', act: { t: 'do', op: 'talent-c.interview.submit' } })}>Yes, send them <span className="ds-sim">Simulated send</span></button>
            <button type="button" className="ds-btn" onClick={() => setConfirm(false)}>Not yet</button>
          </div>
        </motion.div>
      )}
      <p className="t14 muted" style={{ margin: 0 }}>You can also tell Q “send my answers”. Nothing is sent until you say yes.</p>
    </section>
  );
}
