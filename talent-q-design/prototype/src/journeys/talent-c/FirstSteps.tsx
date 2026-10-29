// T4 · First steps (phone-first). Three small steps: your work, your certificate, your interview.
// Every step can be done by typing, speaking or a simple form, and she can switch at any point without
// losing words. The certificate upload is resumable: it survives the connection dropping, leaving the
// page and closing the app, and always carries on from the last safe part.
import { useRef, useState } from 'react';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { emit, update, useWorld } from '../../mock/world';
import { personC, type AnswerMode } from '../../state/areas/talent-c';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { bankFor, whenText } from './questions';
import { partsLine, resumeUpload, startUpload, pauseUpload, uploadPct } from './runtime';
import { DemoControls, LiteWrap, MicButton, ModeSwitch, VOICE_NOTE, patchMe, useMe, usePlace, useVoice } from './shared';

const STEPS = ['Your work', 'Your certificate', 'Your interview'];

export function FirstSteps() {
  const { actor, pid, me, plain, lite, offline } = useMe();
  const done = me.stepsDone.length >= 3;
  usePlace(pid, '/c/start', 'your first steps', !done);
  const step = Math.min(me.step, 2);
  const go = (n: number) => patchMe(pid, (p) => { p.step = n; });
  const slowOffer = me.slow && !lite;
  return (
    <LiteWrap lite={lite}>
      <Canvas title={done ? 'All three steps are done' : `Step ${step + 1} of 3: ${STEPS[step].toLowerCase()}`} kicker={`${actor.first} · first steps`} open onClose={() => {}}>
        <ol className="talent-c-steps" aria-label="Your steps">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => go(i)}>
                <span className="n" aria-hidden="true">{me.stepsDone.includes(i) ? '✓' : i + 1}</span>
                <span>{s}<span className="sr">{me.stepsDone.includes(i) ? ' (done)' : i === step ? ' (you are here)' : ''}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <p className="talent-c-lead">{plain ? 'Take your time. Nothing here is timed, and everything you type is kept, even if you leave or lose signal.' : 'Nothing here is timed. Your work is saved as you go, even offline.'} You can also just tell Q what you want, by typing or speaking.</p>
        {slowOffer && (
          <div className="ds-banner talent-c-banner" role="status">
            <span><b>Your connection seems slow.</b> Lite mode uses less data: fewer pictures, no animations, bigger buttons.</span>
            <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Lite on', act: { t: 'do', op: 'talent-c.lite', args: { on: true } } })}>Turn on lite mode</button>
          </div>
        )}
        {offline && <div className="ds-banner talent-c-banner" data-k="warn" role="status"><span><b>No connection.</b> You can keep going; everything is saved on this phone and sent when you’re back.</span></div>}
        {step === 0 && <WorkStep pid={pid} plain={plain} />}
        {step === 1 && <CertStep pid={pid} plain={plain} lite={lite} />}
        {step === 2 && <InterviewStep pid={pid} />}
        <DemoControls pid={pid} upload={step === 1} />
      </Canvas>
    </LiteWrap>
  );
}

// ---------------- Step 1: your work (type, speak, or a simple form) ----------------
function WorkStep({ pid, plain }: { pid: string; plain: boolean }) {
  const { me } = useMe();
  const mode: AnswerMode = me.stepMode[0] ?? 'TEXT';
  const setMode = (m: AnswerMode) => patchMe(pid, (p) => { p.stepMode[0] = m; });
  const v = useVoice(pid, (t) => patchMe(pid, (p) => { p.work.text = t; }), () => setMode('TEXT'));
  const f = me.work.form;
  const has = me.work.text.trim() || f.job.trim();
  const save = () => update((w) => {
    const p = personC(w, pid);
    p.stepsDone = [...new Set([...p.stepsDone, 0])]; p.step = 1;
    const said = [f.job && `${f.job}`, f.years && `${f.years} years`, f.where && `at ${f.where}`].filter(Boolean).join(', ') || p.work.text.trim().slice(0, 140);
    const id = `e_${pid}_work_claim`;
    const ev = { evidenceId: id, ownerId: pid, kind: 'CLAIM' as const, title: `Work: ${said}`, source: 'You told Q', observedAt: new Date().toISOString().slice(0, 10), verified: false, verification: 'UNVERIFIED' as const, shows: 'What you said about your work.', limits: 'Your own words, not checked.', visibility: 'PRIVATE' as const, sharedWith: [], origin: 'ONBOARDING' as const };
    const i = w.evidence.findIndex((e) => e.evidenceId === id); if (i >= 0) w.evidence[i] = ev; else w.evidence.push(ev);
    emit(w, w.session.actor, 'profile.work.saved', `PERSON:${pid}`, 'Saved what you said about your work (private).');
  });
  return (
    <section className="ds-sheet talent-c-card" aria-labelledby="ws-h">
      <h2 id="ws-h" className="voice t24">What work have you done?</h2>
      <p className="muted">{plain ? 'Say it your way. “Care assistant for 4 years” is enough.' : 'A sentence is enough; you can add more later.'} This stays private to you.</p>
      <ModeSwitch value={mode} onChange={setMode} label="How do you want to answer?" />
      <VoiceFallback v={v} />
      {mode !== 'FORM' && <>
        {mode === 'VOICE' && <VoiceBlock v={v} />}
        <div className="ds-field"><label htmlFor="ws-text">{mode === 'VOICE' ? 'What Q heard (you can fix it)' : 'Your answer'}</label>
          <textarea id="ws-text" className="ds-input talent-c-area" rows={4} value={me.work.text} onChange={(e) => patchMe(pid, (p) => { p.work.text = e.target.value; })} placeholder="For example: I look after older people at home. 4 years." /></div>
      </>}
      {mode === 'FORM' && (
        <div className="talent-c-form">
          <div className="ds-field"><label htmlFor="ws-job">Job</label><input id="ws-job" className="ds-input" value={f.job} onChange={(e) => patchMe(pid, (p) => { p.work.form.job = e.target.value; })} placeholder="Care assistant" /></div>
          <div className="ds-field"><label htmlFor="ws-years">How many years</label><input id="ws-years" className="ds-input" inputMode="numeric" value={f.years} onChange={(e) => patchMe(pid, (p) => { p.work.form.years = e.target.value; })} placeholder="4" /></div>
          <div className="ds-field"><label htmlFor="ws-where">Where (optional)</label><input id="ws-where" className="ds-input" value={f.where} onChange={(e) => patchMe(pid, (p) => { p.work.form.where = e.target.value; })} placeholder="A care home in Uyo" /></div>
        </div>
      )}
      {(me.work.text.trim() && mode === 'FORM') || (f.job.trim() && mode !== 'FORM') ? <p className="t14 muted">Your other answer is kept too; switching doesn’t lose anything.</p> : null}
      <div className="talent-c-actions">
        <button type="button" className="ds-btn primary" disabled={!has} onClick={save}>Save and go to step 2</button>
        <button type="button" className="ds-btn quiet" onClick={() => patchMe(pid, (p) => { p.step = 1; })}>Skip for now</button>
      </div>
    </section>
  );
}

function VoiceBlock({ v }: { v: ReturnType<typeof useVoice> }) {
  return (
    <div className="talent-c-voice">
      {!v.voicePref ? (
        <p className="talent-c-note" role="status">{VOICE_NOTE.OFF} <button type="button" className="ds-btn" onClick={v.turnOn}>Turn voice on</button></p>
      ) : <MicButton listening={v.listening} onClick={v.start} />}
    </div>
  );
}
/** Shown after a voice fallback, whichever way she now answers. */
function VoiceFallback({ v }: { v: ReturnType<typeof useVoice> }) {
  return v.state === 'DENIED' || v.state === 'UNAVAILABLE' ? <p className="talent-c-note" role="alert">{VOICE_NOTE[v.state]}</p> : null;
}

// ---------------- Step 2: certificate (resumable upload, or type the details) ----------------
function CertStep({ pid, plain, lite }: { pid: string; plain: boolean; lite: boolean }) {
  const { me, offline } = useMe();
  const ev = useWorld((w) => w.evidence.find((e) => e.evidenceId === 'e_grace_cert' && e.ownerId === pid) ?? w.evidence.find((e) => e.ownerId === pid && e.kind === 'CREDENTIAL'));
  const mode: AnswerMode = me.stepMode[1] ?? 'FORM';
  const setMode = (m: AnswerMode) => patchMe(pid, (p) => { p.stepMode[1] = m; });
  const v = useVoice(pid, (t) => patchMe(pid, (p) => { p.certDetails.course = t; }), () => setMode('TEXT'));
  const [msg, setMsg] = useState('');
  const pick = useRef<HTMLInputElement>(null);
  const u = me.upload && me.upload.status !== 'IDLE' ? me.upload : null;
  const p = u ? uploadPct(u) : 0;
  const status = !u ? '' : u.status === 'DONE' ? 'Sent in full.' : u.status === 'UPLOADING' ? `Sending… ${partsLine(u)} safe.`
    : u.status === 'FAILED' ? `Stopped at ${p}%: part ${u.done + 1} didn’t go through. The first ${u.done} parts are safe.`
    : u.reason === 'OFFLINE' ? `Paused at ${p}%: no connection. ${u.done} parts are safe. It carries on by itself when you’re back online.`
    : u.reason === 'CLOSED' ? `Paused at ${p}%: the app was closed. ${u.done} parts are safe.`
    : u.reason === 'NEED_FILE' ? `Paused at ${p}%. Choose the same photo again (${u.fileName}); the ${u.done} parts already sent are skipped.`
    : `Paused at ${p}%. ${u.done} parts are safe.`;
  const onFile = (file?: File) => {
    if (!file) return;
    if (u && u.status !== 'DONE' && u.done > 0) { const r = resumeUpload(pid, file); setMsg(r.say); }
    else { startUpload(pid, { kind: 'DEVICE', file }); setMsg(''); }
  };
  const resume = () => { const r = resumeUpload(pid); setMsg(r.say); if (!r.ok && me.upload?.source === 'DEVICE') pick.current?.click(); };
  return (
    <section className="ds-sheet talent-c-card" aria-labelledby="cs-h">
      <h2 id="cs-h" className="voice t24">Add your certificate</h2>
      {ev && <p className="talent-c-item"><Glyph k="unclear" title="Waiting for a check" /> <span><b>{ev.title}</b><span className="t14 muted" style={{ display: 'block' }}>{ev.verification === 'PENDING' ? (plain ? 'Waiting for a check with whoever gave it. That’s normal.' : 'Issuer check pending.') : ev.limits}</span></span></p>}
      <p className="muted">{plain ? 'A photo of it is best. If you can’t, type what it says instead.' : 'Upload a photo or PDF, or type the details.'} Only you see it until you choose to share.</p>
      <ModeSwitch value={mode === 'FORM' ? 'FORM' : mode} onChange={setMode} label="How do you want to add it?" modes={['FORM', 'TEXT', 'VOICE']} labels={{ FORM: 'Photo', TEXT: 'Type it', VOICE: 'Say it' }} />
      <VoiceFallback v={v} />
      {mode === 'FORM' && (
        <div className="talent-c-upload">
          {!lite && <CertPicture />}
          <input ref={pick} id="cs-file" type="file" accept="image/*,application/pdf" capture="environment" className="sr" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          {!u && <div className="talent-c-actions">
            <label htmlFor="cs-file" className="ds-btn primary" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick.current?.click(); } }}>Take or choose a photo</label>
            <button type="button" className="ds-btn" onClick={() => { startUpload(pid, { kind: 'SAMPLE' }); setMsg(''); }}>Use the sample photo <span className="ds-sim">Demo</span></button>
          </div>}
          {u && (
            <div className="talent-c-progress" data-s={u.status}>
              <div className="row"><b>{u.fileName}</b><span className="num">{Math.round(u.sizeKb / 102.4) / 10} MB</span></div>
              <div className="bar" role="progressbar" aria-label="Certificate upload" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-valuetext={`${p}%, ${u.done} of ${u.chunks} parts`}>
                {Array.from({ length: u.chunks }, (_, i) => <i key={i} data-on={i < u.done ? '1' : undefined} />)}
              </div>
              <p className="t14" aria-live="polite" style={{ margin: 0 }}>{status}</p>
              <div className="talent-c-actions">
                {u.status === 'UPLOADING' && <button type="button" className="ds-btn" onClick={() => pauseUpload(pid)}>Pause</button>}
                {(u.status === 'PAUSED' || u.status === 'FAILED') && u.reason !== 'NEED_FILE' && <button type="button" className="ds-btn primary" disabled={offline} onClick={resume}>{u.status === 'FAILED' ? `Try again from ${p}%` : `Carry on from ${p}%`}</button>}
                {u.reason === 'NEED_FILE' && <label htmlFor="cs-file" className="ds-btn primary" role="button" tabIndex={0}>Choose the same photo</label>}
                {u.status === 'DONE' && <button type="button" className="ds-btn primary" onClick={() => patchMe(pid, (pp) => { pp.stepsDone = [...new Set([...pp.stepsDone, 1])]; pp.step = 2; })}>Go to step 3</button>}
              </div>
            </div>
          )}
          {msg && u?.status !== 'DONE' && <p className="talent-c-note" role="status">{msg}</p>}
        </div>
      )}
      {mode !== 'FORM' && (
        <div className="talent-c-form">
          {mode === 'VOICE' && <VoiceBlock v={v} />}
          <div className="ds-field"><label htmlFor="cs-course">Name of the course</label><input id="cs-course" className="ds-input" value={me.certDetails.course} onChange={(e) => patchMe(pid, (pp) => { pp.certDetails.course = e.target.value; })} placeholder="First aid" /></div>
          <div className="ds-field"><label htmlFor="cs-issuer">Who gave it</label><input id="cs-issuer" className="ds-input" value={me.certDetails.issuer} onChange={(e) => patchMe(pid, (pp) => { pp.certDetails.issuer = e.target.value; })} placeholder="Red Cross" /></div>
          <div className="ds-field"><label htmlFor="cs-year">Year</label><input id="cs-year" className="ds-input" inputMode="numeric" value={me.certDetails.year} onChange={(e) => patchMe(pid, (pp) => { pp.certDetails.year = e.target.value; })} placeholder="2025" /></div>
          <p className="t14 muted">Typed details count as something you said, not proof, until a photo or the issuer backs them up.</p>
          <button type="button" className="ds-btn primary" disabled={!me.certDetails.course.trim()} onClick={() => patchMe(pid, (pp) => { pp.stepsDone = [...new Set([...pp.stepsDone, 1])]; pp.step = 2; })}>Save and go to step 3</button>
        </div>
      )}
    </section>
  );
}
function CertPicture() {
  return (
    <svg className="talent-c-pic" viewBox="0 0 120 80" aria-hidden="true">
      <rect x="6" y="6" width="108" height="68" rx="6" fill="var(--sheet)" stroke="var(--rule-2)" />
      <path d="M22 24h60M22 34h76M22 44h48" stroke="var(--ink-3)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="94" cy="56" r="10" fill="var(--gold-wash)" stroke="var(--gold)" strokeWidth="2" />
    </svg>
  );
}

// ---------------- Step 3: your interview ----------------
function InterviewStep({ pid }: { pid: string }) {
  const { me, actor } = useMe();
  const bank = useWorld((w) => bankFor(w, pid, null));
  return (
    <section className="ds-sheet talent-c-card" aria-labelledby="is-h">
      <h2 id="is-h" className="voice t24">Your interview</h2>
      <p><b>{bank.org} · {bank.title}</b><br />{whenText(bank.when, actor.timezone)} <span className="ds-sim">Simulated</span></p>
      <p className="muted">You can practise first. Practice is private: it never counts as proof and {bank.org} never sees it.{me.practicesDone ? ` You’ve practised ${me.practicesDone === 1 ? 'once' : `${me.practicesDone} times`}.` : ''}</p>
      <div className="talent-c-actions">
        <Link className="ds-btn primary" to="/c/interview" onClick={() => patchMe(pid, (p) => { p.room = 'PRACTICE'; p.stepsDone = [...new Set([...p.stepsDone, 2])]; })}>Practise now</Link>
        <Link className="ds-btn" to="/c/interview" onClick={() => patchMe(pid, (p) => { p.room = 'REAL'; p.stepsDone = [...new Set([...p.stepsDone, 2])]; })}>Open the interview room</Link>
      </div>
    </section>
  );
}
