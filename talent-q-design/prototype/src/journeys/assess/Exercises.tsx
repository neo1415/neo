// Simulated exercises (SC-111 code, SC-112 cyber incident, SC-113 customer conversation). Each is small, labelled as
// simulated and produces evidence in the same proof classes as the Passport: self-reported on submission, assessed
// (or "not shown") only after a person reviews it. Where the employer asked for a bounded work sample on the same
// requirement (J12), the exercise answers that request through the shared evidence ops instead of a new one.
import { useState } from 'react';
import { useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { Link } from '../../ui/router';
import { proofClass, PROOF_WORD } from '../evidence/model';
import { reqLabel } from '../hire-b/model';
import { CUSTOMER, KIND_WORD, LOGS, actorName, exerciseOf, exerciseOp, fmtDay, linkedReuse, orgName, personFirst, resultsOf, roleTitle } from './model';
import { NotAvailable, Refusal, useMe, useRun } from './ui';
import type { Exercise } from '../../state/areas/assess';

const STATE_WORD: Record<Exercise['state'], string> = { ASSIGNED: 'Not started', IN_PROGRESS: 'In progress', SUBMITTED: 'Self-reported, waiting for review', REVIEWED: 'Reviewed', DECLINED: 'Declined (not a failed result)' };

function Results({ e }: { e: Exercise }) {
  const res = resultsOf(e);
  if (!res.length) return <p className="t14 muted as-p">{e.kind === 'CODE' ? 'Run the tests to see results.' : 'Nothing checked yet.'}</p>;
  return (
    <ul className="as-tests" aria-label="Checks">
      {res.map((r) => <li key={r.name}><span className="as-pf" data-pass={r.pass ? '1' : undefined}>{r.pass ? 'PASS' : 'NOT YET'}</span><span><b>{r.name}</b><br /><span className="muted">{r.detail}</span></span></li>)}
    </ul>
  );
}

export function ExerciseCandidate({ id }: { id: string }) {
  const me = useMe();
  const w = useWorld((x) => x);
  const [msg, run] = useRun();
  const [say, setSay] = useState('');
  const [why, setWhy] = useState<string | null>(null);
  const e = exerciseOf(w, id);
  if (!e || e.personId !== me.personId) return <NotAvailable why="This exercise isn’t available." back={{ to: '/c/assess', label: 'Your interviews and exercises' }} />;
  const org = orgName(w, e.orgId);
  const op = (kind: string, args: Record<string, unknown> = {}) => run((x, a) => exerciseOp(x, a, id, kind, args));
  const open = e.state === 'IN_PROGRESS';
  const ev = e.evidenceId ? w.evidence.find((x) => x.evidenceId === e.evidenceId) : undefined;
  const cls = ev ? proofClass(w, ev) : undefined;
  const reuse = linkedReuse(w, e);
  const note = e.review?.shared ? e.review.note : reuse?.candidateNote;
  return (
    <Canvas title={e.state === 'ASSIGNED' ? `${org} asked for one short exercise` : e.state === 'IN_PROGRESS' ? e.title : e.state === 'SUBMITTED' ? 'Sent. Waiting for a reviewer.' : e.state === 'REVIEWED' ? `${org} reviewed your exercise` : 'You declined this exercise'}
      kicker={`${KIND_WORD[e.kind]} · ${org} · ${roleTitle(w, e.mandateId)}`} open onClose={() => history.back()} aside={<span className="ds-sim">Simulated exercise</span>}>
      <section className="ds-sheet as-grid" aria-labelledby="ex-a">
        <h2 id="ex-a" className="as-h2">{e.title}</h2>
        <dl className="as-kv">
          <dt>About</dt><dd>{e.minutes} minutes, no clock. Synthetic data only: nothing real is touched.</dd>
          {e.reqId && <dt>Shows</dt>}{e.reqId && <dd>{reqLabel(w, e.reqId)}{reuse ? ` · this answers ${org}’s request for one short sample instead of a full assessment` : ''}</dd>}
          <dt>Counts as</dt><dd>Self-reported when you send it; assessed only after a person at {org} reviews it. Declining is recorded as declined, not failed.</dd>
          <dt>Status</dt><dd>{STATE_WORD[e.state]}{cls ? ` · ${PROOF_WORD[cls]}` : ''}</dd>
        </dl>
        {e.state === 'ASSIGNED' && (
          <div className="as-actions">
            <button type="button" className="ds-btn primary" onClick={() => op('start')}>Start the exercise</button>
            {why === null ? <button type="button" className="ds-btn quiet" onClick={() => setWhy('')}>Decline</button> : (
              <form className="as-actions" onSubmit={(x) => { x.preventDefault(); op('decline', { why }); }}>
                <label className="sr" htmlFor="ex-why">Reason (optional)</label>
                <input id="ex-why" className="ds-input" style={{ minWidth: 200 }} placeholder="A reason, if you’d like (optional)" value={why} onChange={(x) => setWhy(x.target.value)} />
                <button type="submit" className="ds-btn">Decline</button><button type="button" className="ds-btn quiet" onClick={() => setWhy(null)}>Back</button>
              </form>
            )}
          </div>
        )}
      </section>
      {open && e.kind === 'CODE' && (
        <section className="ds-sheet as-grid" aria-labelledby="ex-code">
          <h2 id="ex-code" className="as-h2">Make the daily exceptions report fast</h2>
          <p className="t14 as-p">The table <code>exceptions</code> has 200 million rows on a synthetic copy. The report must return the same rows. Add an index or change the query; keep the result the same.</p>
          <div className="ds-field"><label htmlFor="ex-sql">Your SQL (editor: Tab moves focus; use spaces to indent)</label>
            <textarea id="ex-sql" className="as-code" spellCheck={false} rows={10} value={e.code ?? ''} onChange={(x) => op('code', { code: x.target.value })} /></div>
          <div className="as-actions"><button type="button" className="ds-btn" onClick={() => op('run')}>Run the tests</button><span className="t14 muted">Simulated runner: it checks the shape of your change; nothing is executed.</span></div>
          <div aria-live="polite"><Results e={e} /></div>
        </section>
      )}
      {open && e.kind === 'CYBER' && (
        <section className="ds-sheet as-grid" aria-labelledby="ex-log">
          <h2 id="ex-log" className="as-h2">What happened on the night of 29 October?</h2>
          <p className="t14 as-p">A merchant says their settlement is missing. Here are the night’s logs (synthetic, SIEM-style). Tick the events that matter, then say the cause and your first action.</p>
          <ol className="as-log" aria-label="Log timeline, oldest first">
            {LOGS.map((l) => (
              <li key={l.id}><label htmlFor={`lg-${l.id}`}>
                <input id={`lg-${l.id}`} type="checkbox" checked={(e.marked ?? []).includes(l.id)} onChange={() => op('mark', { log: l.id })} />
                <span className="t num">{l.t}</span><span className="src">{l.src} · {l.lvl}</span><span data-lvl={l.lvl}>{l.msg}</span>
              </label></li>
            ))}
          </ol>
          <div className="ds-field"><label htmlFor="ex-cause">The cause, in a sentence</label><textarea id="ex-cause" className="ds-input" rows={2} value={e.cause ?? ''} onChange={(x) => op('notes', { cause: x.target.value })} /></div>
          <div className="ds-field"><label htmlFor="ex-act">Your first action</label><textarea id="ex-act" className="ds-input" rows={2} value={e.action ?? ''} onChange={(x) => op('notes', { action: x.target.value })} /></div>
          <details><summary className="t14">What the reviewer looks at ({resultsOf(e).filter((r) => r.pass).length} of {resultsOf(e).length} in place)</summary><Results e={e} /></details>
        </section>
      )}
      {open && e.kind === 'SALES' && (
        <section className="ds-sheet as-grid" aria-labelledby="ex-chat">
          <h2 id="ex-chat" className="as-h2">A merchant on chat</h2>
          <p className="t14 as-p">The customer is scripted (simulated). Reply as you would at work. A person reads your words against the points below; nobody judges your tone of voice, accent or typing speed.</p>
          <ol className="as-chat" aria-live="polite" aria-label="Conversation">{(e.chat ?? []).map((m, i) => <li key={i} data-who={m.who}><span className="sr">{m.who === 'CUST' ? 'Customer: ' : 'You: '}</span>{m.text}</li>)}</ol>
          {(e.chat ?? []).filter((m) => m.who === 'ME').length < CUSTOMER.length + 1 && (
            <form className="as-actions" onSubmit={(x) => { x.preventDefault(); if (say.trim()) { op('say', { text: say }); setSay(''); } }}>
              <label className="sr" htmlFor="ex-say">Your reply</label>
              <input id="ex-say" className="ds-input" style={{ flex: 1, minWidth: 0 }} value={say} onChange={(x) => setSay(x.target.value)} placeholder="Your reply" />
              <button type="submit" className="ds-btn" disabled={!say.trim()}>Send</button>
            </form>
          )}
          <details><summary className="t14">The conversation rubric</summary><Results e={e} /></details>
        </section>
      )}
      {open && (
        <div className="as-actions">
          <ConfirmButton className="ds-btn primary" label={`Send to ${org}`} question={`Send it to ${org}? It shows as self-reported until a person there reviews it.`} yes="Send" onConfirm={() => op('submit')} />
          <span className="t14 muted">You can stop and come back; nothing is sent until you do.</span>
        </div>
      )}
      {(e.state === 'SUBMITTED' || e.state === 'REVIEWED') && (
        <section className="ds-sheet as-grid" aria-labelledby="ex-res">
          <h2 id="ex-res" className="as-h2">{e.state === 'REVIEWED' ? `Reviewed by ${org}` : 'What you sent'}</h2>
          <p className="as-p">{e.summary}</p>
          {e.state === 'REVIEWED' && <p className="as-p"><b>{e.review?.outcome === 'SHOWS_IT' ? 'It shows the skill.' : e.review?.outcome === 'PARTLY' ? 'It shows part of it.' : 'It didn’t show it this time.'}</b> {cls ? `Now: ${PROOF_WORD[cls]}.` : ''}</p>}
          {note ? <blockquote className="as-quote">{note}<br /><span className="t14 muted">Shared by {org}</span></blockquote> : e.state === 'REVIEWED' && <p className="t14 muted as-p">{org} hasn’t shared the reviewer’s note with you.</p>}
          <Link className="as-link" to="/c/passport">See it in your Evidence Passport</Link>
        </section>
      )}
      <Refusal msg={msg} />
    </Canvas>
  );
}

export function ExercisesRecruiter() {
  const me = useMe();
  const w = useWorld((x) => x);
  const list = useWorld((x) => (x.areas.assess as { exercises: Exercise[] } | undefined)?.exercises.filter((e) => e.orgId === me.orgId) ?? []);
  const waiting = list.filter((e) => e.state === 'SUBMITTED');
  return (
    <Canvas title={waiting.length ? `${waiting.length} exercise${waiting.length === 1 ? '' : 's'} waiting for your review` : list.length ? 'No exercises waiting for review' : 'No exercises sent yet'} kicker="Exercises · simulated" open onClose={() => history.back()}>
      {!me.orgId && <p>Exercises belong to an employer.</p>}
      {list.length === 0 && <section className="ds-sheet as-empty"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>Nothing sent.</b><p className="t14 muted as-p">Ask Q for one short exercise instead of a full take-home when a requirement is still open.</p></div></section>}
      <ul className="as-list">
        {list.map((e) => <ExerciseRow key={e.id} e={e} w={w} />)}
      </ul>
    </Canvas>
  );
}
function ExerciseRow({ e, w }: { e: Exercise; w: Parameters<typeof personFirst>[0] }) {
  const [msg, run] = useRun();
  const [note, setNote] = useState('');
  const [share, setShare] = useState(false);
  const first = personFirst(w, e.personId);
  const ev = e.evidenceId ? w.evidence.find((x) => x.evidenceId === e.evidenceId) : undefined;
  const op = (kind: string, args: Record<string, unknown> = {}) => run((x, a) => exerciseOp(x, a, e.id, kind, args));
  return (
    <li className="ds-sheet as-grid" id={`ex-${e.id}`}>
      <div className="as-row"><span><b>{first}</b> · {KIND_WORD[e.kind]}: {e.title}</span><span className="ds-tag" data-k={e.state === 'SUBMITTED' ? 'busy' : e.state === 'REVIEWED' ? 'ok' : undefined}>{STATE_WORD[e.state]}{ev ? ` · ${PROOF_WORD[proofClass(w, ev)]}` : ''}</span></div>
      <span className="t14 muted">{roleTitle(w, e.mandateId)}{e.reqId ? ` · ${reqLabel(w, e.reqId)}` : ''} · {e.minutes} min{e.reuseId ? ' · answers your bounded-sample request' : ''}{e.submittedAt ? ` · sent ${fmtDay(e.submittedAt)}` : ''}</span>
      {e.state === 'DECLINED' && <p className="t14 as-p">{first} declined{e.whyDeclined ? `: “${e.whyDeclined}”` : ''}. That’s recorded as declined, not as a failed result.</p>}
      {(e.state === 'SUBMITTED' || e.state === 'REVIEWED') && (
        <>
          <p className="as-p">{e.summary}</p>
          <details open={e.state === 'SUBMITTED'}><summary className="t14">Simulated checks</summary><Results e={e} /></details>
          {e.kind === 'SALES' && <details><summary className="t14">The conversation</summary><ol className="as-chat" style={{ marginTop: 8 }}>{(e.chat ?? []).map((m, i) => <li key={i} data-who={m.who}><span className="sr">{m.who === 'CUST' ? 'Customer: ' : `${first}: `}</span>{m.text}</li>)}</ol></details>}
        </>
      )}
      {e.state === 'SUBMITTED' && (
        <form className="as-grid" style={{ gap: 8 }} onSubmit={(x) => x.preventDefault()}>
          <div className="ds-field"><label htmlFor={`rv-${e.id}`}>Your note on what it showed (kept with the result)</label><textarea id={`rv-${e.id}`} className="ds-input" rows={2} value={note} onChange={(x) => setNote(x.target.value)} /></div>
          <label className="t14" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={share} onChange={(x) => setShare(x.target.checked)} style={{ width: 20, height: 20 }} /> Share this note with {first}</label>
          <div className="as-actions" role="group" aria-label="Review outcome">
            <button type="button" className="ds-btn" onClick={() => op('review', { outcome: 'SHOWS_IT', note, share })}>Shows it</button>
            <button type="button" className="ds-btn" onClick={() => op('review', { outcome: 'PARTLY', note, share })}>Shows part of it</button>
            <button type="button" className="ds-btn quiet" onClick={() => op('review', { outcome: 'NOT_SHOWN', note, share })}>Didn’t show it</button>
          </div>
        </form>
      )}
      {e.state === 'REVIEWED' && e.review && (
        <p className="t14 as-p">Reviewed by {actorName(w, e.review.by)}: {e.review.outcome === 'SHOWS_IT' ? 'shows it' : e.review.outcome === 'PARTLY' ? 'shows part of it' : 'didn’t show it'}. “{e.review.note}” {e.review.shared ? `${first} can read this note.` : <button type="button" className="as-link" onClick={() => op('share-note')}>Share the note with {first}</button>}</p>
      )}
      <Refusal msg={msg} />
    </li>
  );
}
