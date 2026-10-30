// Human live interview room (SC-103) with Q's interviewer-only follow-ups (MO-023) and the question plan (MO-018).
// Simulated: there's no call, camera or microphone. The room is the shared record of who is here, what was agreed,
// what was asked and answered. Q's suggestions sit in a labelled side panel the interviewer can hide; the candidate
// sees, before joining, that Q is present for the interviewers and doesn't score them. Recording waits for a yes.
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { DUR, EASE, arrive } from '../../ds/motion';
import { Link } from '../../ui/router';
import { assess } from '../../state/areas/assess';
import { LEVEL_WORD, reqLabel } from '../hire-b/model';
import type { Level } from '../../state/areas/hire-b';
import { actorFirst, actorName, buildPlan, fmtTime, ivOf, liveOp, orgName, personFirst, personName, readRoom, roleTitle } from './model';
import { Demo, NotAvailable, Refusal, Stamp, useMe, useRun } from './ui';

const STATE_WORD = { LOBBY: 'Not started', LIVE: 'Live', INTERRUPTED: 'Connection lost', ENDED: 'Ended' } as const;

function Turns({ id, viewer }: { id: string; viewer: 'INT' | 'CAND' }) {
  const w = useWorld((x) => x);
  const r = readRoom(w, id); const iv = ivOf(w, id)!;
  const turns = (r?.turns ?? []).filter((t) => viewer === 'INT' || t.who !== 'SYS' || /joined|record|Connection|Reconnected|ended|started/i.test(t.text));
  if (!turns.length) return <p className="t14 muted as-p">Nothing said yet.</p>;
  return (
    <ol className="as-turns" aria-label="What was said" aria-live="polite">
      {turns.map((t) => (
        <motion.li key={t.id} className="as-turn" data-who={t.who} {...arrive}>
          <span className="as-turn-h">
            <b>{t.who === 'INT' ? actorFirst(w, t.by ?? '') : t.who === 'CAND' ? personFirst(w, iv.personId) : 'Room'}</b>
            <span className="num">{fmtTime(t.at)}</span>
            {t.reqId && <span>{reqLabel(w, t.reqId)}</span>}
            {t.who !== 'SYS' && <span>{t.recorded ? 'Recorded' : 'Not recorded'}</span>}
            {t.simulated && <span className="ds-sim">Simulated answer</span>}
          </span>
          <p>{t.text}</p>
          {viewer === 'INT' && t.leading && <p className="as-note"><Glyph k="partial" size={14} /><span>Leading question. {t.leading} (Only you see this.)</span></p>}
        </motion.li>
      ))}
    </ol>
  );
}

export function LiveRoomRecruiter({ id }: { id: string }) {
  const me = useMe();
  const w = useWorld((x) => x);
  const [msg, run] = useRun();
  const [own, setOwn] = useState('');
  const reduce = useReducedMotion();
  const iv = ivOf(w, id);
  if (!iv || iv.orgId !== me.orgId) return <NotAvailable why="This interview isn’t available. It may belong to another organisation." back={{ to: '/r/interviews', label: 'See all interviews' }} />;
  const r = readRoom(w, id);
  const plan = assess(w).plans[id];
  const onPanel = iv.panel.includes(me.id);
  const first = personFirst(w, iv.personId);
  const state = r?.state ?? 'LOBBY';
  const asked = r?.turns.filter((t) => t.who === 'INT').length ?? 0;
  const sugs = (r?.suggestions ?? []).filter((s) => s.state === 'NEW');
  const title = state === 'LOBBY' ? `Get ready: ${first}’s interview` : state === 'LIVE' ? `Live with ${first} · ${asked} question${asked === 1 ? '' : 's'} asked` : state === 'INTERRUPTED' ? `Connection lost with ${first}` : `${first}’s interview has ended`;
  const live = (kind: string, args: Record<string, unknown> = {}) => run((x, a) => liveOp(x, a, id, kind, args));
  const askedReq = new Set(r?.turns.filter((t) => t.who === 'INT').map((t) => t.reqId));
  return (
    <Canvas title={title} kicker={`Live room · ${roleTitle(w, iv.mandateId)}`} open onClose={() => history.back()} qLine={title}
      aside={<div className="ds-actions"><span className="ds-tag" data-k={state === 'LIVE' ? 'ok' : state === 'INTERRUPTED' ? 'warn' : undefined}>{STATE_WORD[state]}</span><span className="ds-sim">Simulated room</span></div>}>
      {!onPanel && <div className="ds-banner" role="status"><Glyph k="none" /><span><b>You’re not on this panel.</b> Only {iv.panel.map((p) => actorName(w, p)).join(' and ')} can run this room.</span><span /></div>}
      {state === 'INTERRUPTED' && <div className="ds-banner" data-k="warn" role="alert"><Glyph k="partial" /><span><b>The connection dropped.</b> Everything said so far is kept. Recording is paused until you turn it back on.</span><button type="button" className="ds-btn primary" onClick={() => live('resume')}>Reconnect</button></div>}
      <div className="as-live">
        <div className="as-grid">
          <section className="ds-sheet as-grid" aria-labelledby="lv-plan">
            <div className="as-row"><h2 id="lv-plan" className="as-h2">Question plan</h2>{plan && <span className="t14 muted">{plan.v ? `From locked bank v${plan.v}` : 'Q’s suggestions (no locked bank)'} · must-haves first</span>}</div>
            {!plan ? (
              <div className="as-grid" style={{ gap: 8 }}>
                <p className="t14 muted as-p">Q groups your locked questions by requirement, must-haves first and the least-shown first, so you go deeper where the evidence is thin and don’t re-test what’s already checked.</p>
                <div className="as-actions"><button type="button" className="ds-btn primary" disabled={!onPanel} onClick={() => run((x, a) => { buildPlan(x, a, id); })}>Build the question plan</button></div>
              </div>
            ) : (
              <ol className="as-plan" aria-label="Plan by requirement">
                {plan.cards.map((c, i) => (
                  <motion.li key={c.reqId} className="as-card" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.slow, ease: EASE.enter, delay: reduce ? 0 : i * 0.08 }}>
                    <div className="as-row"><h3>{c.label}</h3><span className="t14 muted">{c.mustHave ? 'Must have' : 'Nice to have'}</span></div>
                    <span className="t14">Before the interview: {LEVEL_WORD[c.level as Level] ?? c.level}</span>
                    {c.qs.map((q) => (
                      <div key={q.id} className="as-grid" style={{ gap: 6 }}>
                        <p className="as-p" style={{ fontFamily: 'var(--voice)', fontSize: 17 }}>{q.text}</p>
                        <span className="t14 muted">{q.locked && <><Stamp>Locked v{plan.v}</Stamp>{' '}</>}{q.why}</span>
                        {state === 'LIVE' && onPanel && <button type="button" className={`ds-btn ${askedReq.has(c.reqId) ? 'quiet' : ''}`} disabled={!!r?.awaiting} onClick={() => live('ask', { text: q.text, reqId: c.reqId, qid: q.id })}>{askedReq.has(c.reqId) ? 'Ask again' : 'Ask this'}</button>}
                      </div>
                    ))}
                  </motion.li>
                ))}
              </ol>
            )}
          </section>
          <section className="ds-sheet as-grid" aria-labelledby="lv-said">
            <div className="as-row"><h2 id="lv-said" className="as-h2">What was said</h2>{r?.consent.recording === 'YES' && r.recording === 'ON' ? <span className="as-rec" data-on="1"><i aria-hidden="true" />Recording</span> : <span className="as-rec"><i aria-hidden="true" />Not recording</span>}</div>
            <Turns id={id} viewer="INT" />
            {state === 'LIVE' && onPanel && (
              <>
                {r?.awaiting && <p className="t14 as-p" role="status">Waiting for {first}’s answer…</p>}
                <form className="as-grid" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (live('ask', { text: own })) setOwn(''); }}>
                  <div className="ds-field"><label htmlFor="lv-own">Ask your own question</label><input id="lv-own" className="ds-input" value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Open questions work best: “Tell me about a time…”" /></div>
                  <div className="as-actions"><button type="submit" className="ds-btn" disabled={!own.trim() || !!r?.awaiting}>Ask</button></div>
                </form>
              </>
            )}
            <Refusal msg={msg} />
            {state === 'ENDED' && (
              <div className="as-actions">
                <Link className="ds-btn primary" to={`/r/interviews/${id}/transcript`}>Transcript and evidence</Link>
                <Link className="ds-btn" to={`/r/interviews/${id}/review`}>Review scores</Link>
                <Link className="ds-btn quiet" to={`/r/coaching?i=${id}`}>Your coaching</Link>
              </div>
            )}
          </section>
        </div>
        <div className="as-grid">
          {/* MO-023: Q's follow-ups slide in beside the transcript, never over it; hidden on request; a static card under reduced motion. */}
          {r && state !== 'ENDED' && (
            <section className="as-qpanel" aria-labelledby="lv-q">
              <div className="as-row"><span id="lv-q" className="as-qlab"><span className="as-qdot" aria-hidden="true" />Q · follow-ups</span><button type="button" className="ds-btn quiet" aria-expanded={r.panel === 'OPEN'} onClick={() => live('panel')}>{r.panel === 'OPEN' ? 'Hide' : `Show${sugs.length ? ` (${sugs.length})` : ''}`}</button></div>
              <p className="t14 as-p"><b>Only interviewers see this.</b> {first} was told Q is here for you. Q reads the answers as words; it doesn’t score {first} or read their face or voice.</p>
              {r.panel === 'OPEN' && (
                <div className="as-grid" style={{ gap: 8 }} aria-live="polite">
                  {!sugs.length && <p className="t14 muted as-p">Nothing to suggest. When an answer sounds general, a follow-up appears here.</p>}
                  <AnimatePresence initial={false}>
                    {sugs.map((s) => (
                      <motion.div key={s.id} className="as-sug" initial={reduce ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0, transition: { duration: DUR.normal, ease: EASE.enter } }} exit={{ opacity: 0, transition: { duration: DUR.fast, ease: EASE.exit } }}>
                        <span className="t14 muted">{s.reqId ? reqLabel(w, s.reqId) : 'General'} · {s.why}</span>
                        <b>{s.text}</b>
                        <div className="as-actions"><button type="button" className="ds-btn" disabled={state !== 'LIVE' || !!r.awaiting || !onPanel} onClick={() => live('suggestion', { sid: s.id, use: true })}>Ask it</button><button type="button" className="ds-btn quiet" onClick={() => live('suggestion', { sid: s.id })}>Not now</button></div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}
          <section className="ds-sheet as-grid" aria-labelledby="lv-who">
            <h2 id="lv-who" className="as-h2">In the room</h2>
            <ul className="as-people">
              {iv.panel.map((p) => <li key={p}><span className="as-av" aria-hidden="true">{w.actors.find((a) => a.id === p)?.initials}</span><span><b>{actorName(w, p)}</b>{p === me.id ? ' (you)' : ''}<br /><span className="t14 muted">Interviewer</span></span></li>)}
              <li><span className="as-av" aria-hidden="true">{personName(w, iv.personId).split(' ').map((x) => x[0]).join('')}</span><span><b>{personName(w, iv.personId)}</b><br /><span className="t14 muted">Candidate · {r?.candidateJoined ? 'joined, told Q is present' : 'not joined yet'}</span></span></li>
              <li><span className="as-av" data-q="1" aria-hidden="true">Q</span><span><b>Q</b><br /><span className="t14 muted">Suggests follow-ups to interviewers only. Doesn’t score.</span></span></li>
            </ul>
          </section>
          <section className="ds-sheet as-grid" aria-labelledby="lv-rec">
            <h2 id="lv-rec" className="as-h2">Consent and recording</h2>
            <dl className="as-kv">
              <dt>Told Q is here</dt><dd>{r?.consent.told ? `Yes, before joining` : `When ${first} joins`}</dd>
              <dt>Recording</dt><dd>{({ NOT_ASKED: 'Not asked yet', PENDING: `Waiting for ${first}’s answer`, YES: `${first} agreed`, NO: `${first} said no. The interview carries on; only your notes are kept.` } as const)[r?.consent.recording ?? 'NOT_ASKED']}</dd>
            </dl>
            {onPanel && state !== 'ENDED' && (
              <div className="as-actions">
                {(!r || r.consent.recording === 'NOT_ASKED') && <button type="button" className="ds-btn" onClick={() => live('ask-consent')}>Ask {first} to agree to recording</button>}
                {r?.consent.recording === 'YES' && <button type="button" className="ds-btn" aria-pressed={r.recording === 'ON'} onClick={() => live('record', { on: r.recording !== 'ON' })}>{r.recording === 'ON' ? 'Pause recording' : 'Start recording'}</button>}
                {state === 'LOBBY' && <button type="button" className="ds-btn primary" disabled={!r?.candidateJoined} onClick={() => live('start')}>{r?.candidateJoined ? 'Start the interview' : `Waiting for ${first} to join`}</button>}
                {(state === 'LIVE' || state === 'INTERRUPTED') && <ConfirmButton label="End the interview" question="End the interview? You can’t add to it afterwards." yes="End it" onConfirm={() => live('end')} />}
              </div>
            )}
            <p className="t14 muted as-p">Transcripts keep only the recorded parts, for 90 days, for the panel and the role’s recruiter. {first} can read their own.</p>
          </section>
          {onPanel && state !== 'ENDED' && (
            <Demo note={`${first} acts from their own side (#/c/assess/live/${id}?as=${iv.personId}). Here you can simulate them.`}>
              {!r?.candidateJoined && <button type="button" className="ds-btn quiet" onClick={() => live('join')}>Simulate: {first} joins</button>}
              {r?.consent.recording === 'PENDING' && <><button type="button" className="ds-btn quiet" onClick={() => live('consent', { yes: true })}>Simulate: {first} agrees</button><button type="button" className="ds-btn quiet" onClick={() => live('consent', { yes: false })}>Simulate: {first} says no</button></>}
              {r?.awaiting && <button type="button" className="ds-btn quiet" onClick={() => live('answer')}>Simulate: {first} answers</button>}
              {state === 'LIVE' && <button type="button" className="ds-btn quiet" onClick={() => live('drop')}>Simulate: connection drops</button>}
            </Demo>
          )}
        </div>
      </div>
    </Canvas>
  );
}

export function LiveRoomCandidate({ id }: { id: string }) {
  const me = useMe();
  const w = useWorld((x) => x);
  const [msg, run] = useRun();
  const [text, setText] = useState('');
  const iv = ivOf(w, id);
  if (!iv || iv.personId !== me.personId) return <NotAvailable why="This interview isn’t available." back={{ to: '/c/assess', label: 'Your interviews and exercises' }} />;
  const r = readRoom(w, id); const org = orgName(w, iv.orgId);
  const live = (kind: string, args: Record<string, unknown> = {}) => run((x, a) => liveOp(x, a, id, kind, args));
  const lastQ = [...(r?.turns ?? [])].reverse().find((t) => t.who === 'INT');
  const joined = !!r?.candidateJoined;
  const state = r?.state ?? 'LOBBY';
  const title = !joined ? `Your interview with ${org}` : state === 'ENDED' ? 'Your interview has ended' : state === 'LIVE' ? 'You’re in the interview' : state === 'INTERRUPTED' ? 'Connection lost' : 'Waiting for the interviewers';
  return (
    <Canvas title={title} kicker={`${org} · ${roleTitle(w, iv.mandateId)}`} open onClose={() => history.back()} aside={<span className="ds-sim">Simulated room</span>}>
      <section className="ds-sheet as-grid" aria-labelledby="lc-who">
        <h2 id="lc-who" className="as-h2">Who’s here</h2>
        <ul className="as-people">
          {iv.panel.map((p) => <li key={p}><span className="as-av" aria-hidden="true">{w.actors.find((a) => a.id === p)?.initials}</span><span><b>{actorName(w, p)}</b><br /><span className="t14 muted">{w.actors.find((a) => a.id === p)?.title}, {org}</span></span></li>)}
          <li><span className="as-av" data-q="1" aria-hidden="true">Q</span><span><b>Q is here for the interviewers</b><br /><span className="t14 muted">It may suggest follow-up questions to them. It doesn’t score you, and it doesn’t watch your face or listen to how you sound.</span></span></li>
        </ul>
        {!joined && <div className="as-actions"><button type="button" className="ds-btn primary" onClick={() => live('join')}>Join the interview</button><span className="t14 muted">Joining doesn’t start a recording.</span></div>}
      </section>
      {joined && r?.consent.recording === 'PENDING' && (
        <section className="ds-sheet as-grid" aria-labelledby="lc-rec" role="group">
          <h2 id="lc-rec" className="as-h2">May {org} record this interview?</h2>
          <p className="as-p">If you say yes, they keep a transcript of the recorded parts for 90 days, for the interviewers only. You can read it too. Saying no is fine: the interview carries on and only their notes are kept.</p>
          <div className="as-actions"><button type="button" className="ds-btn primary" onClick={() => live('consent', { yes: true })}>Yes, record it</button><button type="button" className="ds-btn" onClick={() => live('consent', { yes: false })}>No, don’t record</button></div>
        </section>
      )}
      {joined && r && r.consent.recording !== 'PENDING' && r.consent.recording !== 'NOT_ASKED' && <p className="t14 as-p" role="status"><Glyph k={r.consent.recording === 'YES' ? 'full' : 'none'} size={14} /> {r.consent.recording === 'YES' ? (r.recording === 'ON' ? 'Recording is on, as you agreed.' : 'You agreed to recording; it isn’t on right now.') : 'Not recorded, as you asked.'}</p>}
      {state === 'INTERRUPTED' && <div className="ds-banner" data-k="warn" role="alert"><Glyph k="partial" /><span><b>The connection dropped.</b> Nothing you said is lost. The interviewers will reconnect.</span><span /></div>}
      {joined && state === 'LIVE' && (
        <section className="ds-sheet as-grid" aria-labelledby="lc-q">
          <h2 id="lc-q" className="as-h2">{lastQ ? 'The question' : 'Waiting for the first question'}</h2>
          {lastQ && <p className="as-q" aria-live="polite">{lastQ.text}</p>}
          {r?.awaiting && (
            <form className="as-grid" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (live('answer', { text })) setText(''); }}>
              <div className="ds-field"><label htmlFor="lc-a">Your answer (typed; speaking works the same in a real call)</label><textarea id="lc-a" className="ds-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} /></div>
              <div className="as-actions"><button type="submit" className="ds-btn primary" disabled={!text.trim()}>Send answer</button><span className="t14 muted">No time limit.</span></div>
            </form>
          )}
        </section>
      )}
      {joined && (
        <section className="ds-sheet as-grid" aria-labelledby="lc-said">
          <h2 id="lc-said" className="as-h2">Captions</h2>
          <Turns id={id} viewer="CAND" />
        </section>
      )}
      <Refusal msg={msg} />
      {state === 'ENDED' && <div className="as-actions"><Link className="ds-btn primary" to={`/c/assess/record/${id}`}>Your interview record</Link></div>}
    </Canvas>
  );
}
