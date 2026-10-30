// Avatar video interview room (SC-102). A simulated, labelled presenter reads the employer's locked questions as
// captions. It is never mandatory: the candidate chooses avatar, text, voice or a person, and can switch to text at
// any moment. No camera is used and nothing judges the candidate's face, voice or manner. On a slow connection the
// avatar becomes a still image with captions (device fallback). Interrupted sessions resume where they stopped.
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { DUR, EASE } from '../../ds/motion';
import { Link } from '../../ui/router';
import { assess } from '../../state/areas/assess';
import { avatarOf, avatarOp, avatarQuestions, orgName } from './model';
import { Demo, NotAvailable, Refusal, Stamp, useMe, useRun } from './ui';

function Figure({ speaking }: { speaking: boolean }) {
  const reduce = useReducedMotion();
  return (
    <svg className="as-figure" viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="64" r="34" />
      <path d="M30 156c4-30 24-46 50-46s46 16 50 46" />
      <circle cx="68" cy="60" r="2.5" /><circle cx="92" cy="60" r="2.5" />
      <motion.path className="mouth" d="M70 78h20" animate={speaking && !reduce ? { scaleY: [1, 3, 1] } : { scaleY: 1 }} transition={speaking && !reduce ? { repeat: Infinity, duration: 0.6, ease: 'easeInOut' } : { duration: 0 }} />
    </svg>
  );
}

const MODES = [
  { k: 'AVATAR', t: 'Simulated avatar', d: 'A video presenter reads the questions with captions. You answer by typing or speaking. No camera.' },
  { k: 'TEXT', t: 'Text only', d: 'The questions as text. Answer in your own time. Works on any phone and any connection.' },
  { k: 'VOICE', t: 'Voice', d: 'Hear the questions read and answer by speaking; you check the words before sending.' },
  { k: 'HUMAN', t: 'With a person', d: 'Ask for this round with someone from the team instead. Choosing this isn’t held against you.' },
] as const;

export function AvatarRoom({ orgId = 'org_kora' }: { orgId?: string }) {
  const me = useMe();
  const w = useWorld((x) => x);
  const [msg, run] = useRun();
  const [checking, setChecking] = useState(false);
  const reduce = useReducedMotion();
  const pid = me.personId;
  const r = pid ? avatarOf(w, pid, orgId) : undefined;
  const qs = pid ? avatarQuestions(w, pid, orgId) : { qs: [], role: '' };
  const enabled = !!assess(w).avatarSettings[orgId]?.enabled;
  const [speaking, setSpeaking] = useState(false);
  const step = r?.step ?? 'CHOOSE';
  const q = qs.qs[r?.qIndex ?? 0];
  useEffect(() => { if (step !== 'LIVE' || r?.mode !== 'AVATAR' || r.stillImage) return; setSpeaking(true); const t = window.setTimeout(() => setSpeaking(false), 2400); return () => window.clearTimeout(t); }, [step, r?.qIndex, r?.mode, r?.stillImage]);
  if (!pid) return <NotAvailable why="Only the candidate can take this interview." back={{ to: '/c/home', label: 'Back to home' }} />;
  const org = orgName(w, orgId);
  const op = (kind: string, args: Record<string, unknown> = {}) => run((x, a) => avatarOp(x, a, orgId, kind, args));
  const title = step === 'CHOOSE' ? `How would you like to do ${org}’s first round?` : step === 'CONSENT' ? 'Before the avatar starts' : step === 'DEVICE' ? 'Checking your connection' : step === 'LIVE' ? `Question ${(r?.qIndex ?? 0) + 1} of ${qs.qs.length}` : step === 'INTERRUPTED' ? 'Paused: the connection dropped' : step === 'HUMAN_REQUESTED' ? 'You asked for a person' : r?.submittedAt ? `Sent to ${org}` : 'Check your answers';
  if (!qs.qs.length) return (
    <Canvas title={`${org} hasn’t set the questions yet`} kicker={`${org} · first round`} open onClose={() => history.back()}>
      <section className="ds-sheet as-empty"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>There’s nothing to answer yet.</b><p className="t14 muted as-p">You’ll get a message when {org} is ready. Meanwhile you can practise privately in the <Link to="/c/interview">interview room</Link>.</p></div></section>
    </Canvas>
  );
  return (
    <Canvas title={title} kicker={`${org} · ${qs.role} · first round`} open onClose={() => history.back()} aside={<span className="ds-sim">Simulated</span>}>
      {step === 'CHOOSE' && (
        <section className="ds-sheet as-grid" aria-labelledby="av-ch">
          <h2 id="av-ch" className="as-h2">Pick the way that suits you. All of them count the same.</h2>
          <div className="as-choices" role="group" aria-labelledby="av-ch">
            {MODES.map((m) => { const off = m.k === 'AVATAR' && !enabled; return (
              <button key={m.k} type="button" className="as-choice" aria-disabled={off} aria-pressed={r?.mode === m.k} onClick={() => { if (!off) op('choose', { mode: m.k }); }}>
                <b>{m.t}</b><span className="t14">{off ? `${org} hasn’t turned this option on. The others all work.` : m.d}</span>
              </button>); })}
          </div>
          <p className="t14 muted as-p">{qs.qs.length} questions, written by {org} and locked (v{qs.v}), so everyone gets the same words. No time limit. A person at {org} reads your answers.</p>
        </section>
      )}
      {step === 'CONSENT' && (
        <section className="ds-sheet as-grid" aria-labelledby="av-c">
          <h2 id="av-c" className="as-h2">What the avatar is, and what it isn’t</h2>
          <ul className="as-list">
            <li className="as-li">It’s a simulated video presenter, not a person and not Q. It reads {org}’s questions with captions on.</li>
            <li className="as-li">It doesn’t use your camera. It doesn’t judge your face, voice, accent or how confident you seem.</li>
            <li className="as-li">Only your answers are sent, and only when you say so. You can switch to text at any time.</li>
          </ul>
          <div className="as-actions"><button type="button" className="ds-btn primary" onClick={() => { op('consent'); setChecking(true); window.setTimeout(() => setChecking(false), reduce ? 0 : 700); }}>Agree and continue</button><button type="button" className="ds-btn" onClick={() => op('choose', { mode: 'TEXT' })}>Use text instead</button></div>
        </section>
      )}
      {step === 'DEVICE' && (
        <section className="ds-sheet as-grid" aria-labelledby="av-d" aria-busy={checking}>
          <h2 id="av-d" className="as-h2">{checking ? 'Checking your connection…' : r?.device === 'SLOW' ? 'Your connection is slow, so the avatar will be a still image' : 'Your connection is fine for the avatar'}</h2>
          {checking ? <span className="ds-skeleton" style={{ height: 14, width: '50%' }} role="status" aria-label="Checking" /> : (
            <>
              <p className="t14 as-p">{r?.device === 'SLOW' ? 'Captions carry every word; nothing is lost. You can also switch to text.' : 'If it gets slow later, the avatar becomes a still image with captions on its own.'}</p>
              <div className="as-actions"><button type="button" className="ds-btn primary" onClick={() => op('device', { go: true, slow: r?.device === 'SLOW' })}>Start</button><button type="button" className="ds-btn" onClick={() => op('choose', { mode: 'TEXT' })}>Use text instead</button></div>
              <Demo note="Simulate a phone on a weak connection."><button type="button" className="ds-btn quiet" onClick={() => op('device', { slow: r?.device !== 'SLOW' })}>Simulate: {r?.device === 'SLOW' ? 'good' : 'slow'} connection</button></Demo>
            </>
          )}
        </section>
      )}
      {(step === 'LIVE' || step === 'INTERRUPTED') && q && r && (
        <>
          {step === 'INTERRUPTED' && <div className="ds-banner" data-k="warn" role="alert"><Glyph k="partial" /><span><b>Paused at question {r.qIndex + 1}.</b> Your answers so far are saved{r.draft ? ', and so is what you were writing' : ''}. There’s no clock.</span><button type="button" className="ds-btn primary" onClick={() => op('resume')}>Carry on</button></div>}
          {r.mode === 'AVATAR' ? (
            <section className="as-stage" aria-label="Simulated avatar presenting the question">
              <span className="as-stagetag">Simulated avatar · not a person</span>
              {r.stillImage ? <span className="lab">Still image (slow connection) · captions on</span> : <Figure speaking={speaking} />}
              <motion.p key={q.id} className="as-caption" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.normal, ease: EASE.enter }}>{q.text}</motion.p>
            </section>
          ) : (
            <section className="ds-sheet as-grid"><span className="lab">Question {r.qIndex + 1} of {qs.qs.length}</span><p className="as-q" aria-live="polite">{q.text}</p></section>
          )}
          <p className="t14 as-p"><Stamp>{org}’s own question · v{qs.v}</Stamp> <span className="muted">Same words for every candidate.</span></p>
          <section className="ds-sheet as-grid" aria-labelledby="av-a">
            <h2 id="av-a" className="as-h2">Your answer</h2>
            <div className="ds-field"><label htmlFor="av-in">{r.mode === 'VOICE' ? 'What you said (check the words; voice is simulated here, so type)' : 'Type your answer'}</label>
              <textarea id="av-in" className="ds-input" rows={5} value={r.draft} disabled={step === 'INTERRUPTED'} onChange={(e) => op('draft', { text: e.target.value })} /></div>
            <div className="as-actions">
              <button type="button" className="ds-btn primary" disabled={!r.draft.trim() || step === 'INTERRUPTED'} onClick={() => op('answer', { via: r.mode === 'VOICE' ? 'VOICE' : 'TEXT' })}>{r.qIndex + 1 === qs.qs.length ? 'Save and finish' : 'Save, next question'}</button>
              {r.mode === 'AVATAR' && <button type="button" className="ds-btn" onClick={() => op('lite')}>{r.stillImage ? 'Show the avatar' : 'Still image only'}</button>}
              {r.mode !== 'TEXT' && <button type="button" className="ds-btn quiet" onClick={() => op('choose', { mode: 'TEXT' })}>Switch to text</button>}
              <button type="button" className="ds-btn quiet" onClick={() => op('choose', { mode: 'HUMAN' })}>Ask for a person</button>
            </div>
          </section>
          {step === 'LIVE' && <Demo note="Simulate losing the connection mid-answer."><button type="button" className="ds-btn quiet" onClick={() => op('drop')}>Simulate: connection drops</button></Demo>}
        </>
      )}
      {step === 'DONE' && r && (
        <section className="ds-sheet as-grid" aria-labelledby="av-done">
          <h2 id="av-done" className="as-h2">{r.submittedAt ? `Sent. A person at ${org} reads your answers.` : `This is exactly what ${org} will see`}</h2>
          <ol className="as-list">{r.answers.map((a) => { const qq = qs.qs.find((x) => x.id === a.qid); return <li key={a.qid} className="as-li"><span className="t14 muted">{qq?.text}</span><p className="as-p">{a.text}</p><span className="ds-tag" style={{ justifySelf: 'start' }}>{a.via === 'VOICE' ? 'Spoken' : 'Typed'}</span></li>; })}</ol>
          {r.submittedAt ? <dl className="as-kv"><dt>Receipt</dt><dd className="num">{r.receipt}</dd><dt>Status</dt><dd><span className="ds-sim">Sent (simulated)</span></dd><dt>Format</dt><dd>{r.mode === 'AVATAR' ? 'Simulated avatar' : r.mode === 'VOICE' ? 'Voice' : 'Text'}; {org} sees the format only so they know how you answered.</dd></dl>
            : <div className="as-actions"><button type="button" className="ds-btn primary" onClick={() => op('submit')}>Send my answers to {org}</button><span className="t14 muted">Nothing is sent until you do.</span></div>}
          <Link className="as-link" to="/c/assess">Back to your interviews and exercises</Link>
        </section>
      )}
      {step === 'HUMAN_REQUESTED' && (
        <section className="ds-sheet as-grid" aria-labelledby="av-h">
          <h2 id="av-h" className="as-h2">{org} will offer you times with a person</h2>
          <p className="as-p">You’ll get a message with times to choose from. This isn’t held against you, and you don’t need to give a reason.</p>
          <div className="as-actions"><Link className="ds-btn primary" to="/c/assess">Done</Link><button type="button" className="ds-btn quiet" onClick={() => op('back')}>Change my mind</button></div>
        </section>
      )}
      <Refusal msg={msg} />
    </Canvas>
  );
}
