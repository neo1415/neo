// Interviews (R2): the list, and a live interview copilot (simulated) with a live rubric, notes, suggested
// follow-ups when an answer is vague, then structured feedback that Q drafts and the human edits and submits.
// Scheduling and messages belong to Calendar and Messages; this page links there instead of rebuilding them.
import { useState } from 'react';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { runAction, useViewState } from '../../q/core/engine';
import { STAGE_LABEL } from '../../state/domain';
import { hireB, type Rating } from '../../state/areas/hire-b';
import { eventOf, firstName, followUpsFor, isVague, KORA_ROLE, koraInterviews, nameOf, questionsFor, reqLabel, reqsOf } from './model';
import { fmtDate, fmtTime } from './ui';
import './ops';

const STATUS: Record<string, string> = { PLANNING: 'Not scheduled yet', INVITED: 'Invited', CONFIRMED: 'Confirmed', DONE: 'Done', CANCELLED: 'Cancelled' };
const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

export function Interviews() {
  const w = useWorld((x) => x);
  const [filter, setFilter] = useViewState<'all' | 'upcoming' | 'feedback' | 'disputed'>('filter', 'all');
  const me = actorOf(w);
  const all = koraInterviews(w);
  const needs = (i: typeof all[number]) => i.panel.includes(me.id) && !i.feedback.some((f) => f.by === me.id) && (i.status === 'DONE' || hireB(w).live[i.id]?.step === 'FEEDBACK');
  const list = all.filter((i) => filter === 'all' || (filter === 'upcoming' && ['INVITED', 'CONFIRMED', 'PLANNING'].includes(i.status)) || (filter === 'feedback' && needs(i)) || (filter === 'disputed' && i.disputed?.state === 'OPEN'));
  const disputes = all.filter((i) => i.disputed?.state === 'OPEN').length;
  return (
    <Canvas title={disputes ? `${disputes} assessment result${disputes > 1 ? 's are' : ' is'} disputed and under review.` : `${all.filter((i) => i.status === 'CONFIRMED').length} interview${all.filter((i) => i.status === 'CONFIRMED').length === 1 ? '' : 's'} confirmed, ${all.filter(needs).length} waiting for your feedback.`}
      kicker="Interviews" open onClose={() => {}}
      aside={<div className="ds-actions"><Link className="ds-btn" to="/r/calendar">Calendar</Link><Link className="ds-btn quiet" to="/r/messages">Messages</Link></div>}>
      <div className="hire-b-chips" role="group" aria-label="Show">
        {([['all', 'All'], ['upcoming', 'Upcoming'], ['feedback', 'Needs your feedback'], ['disputed', 'Disputed']] as const).map(([k, l]) => <button key={k} type="button" className="ds-filter" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      {list.length === 0 && <section className="ds-sheet"><p className="muted" style={{ margin: 0 }}>{filter === 'all' ? 'No interviews yet. Ask Q to plan one, or schedule from the calendar.' : 'Nothing here right now.'}</p></section>}
      <ul className="hire-b-ivlist">
        {list.map((i) => { const ev = eventOf(w, i); const role = i.mandateId === KORA_ROLE ? w.mandate.title : w.mandates.find((m) => m.id === i.mandateId)?.title; return (
          <li key={i.id} className="ds-sheet">
            <div className="hire-b-row"><b><Link to={`/r/interviews/${i.id}`}>{nameOf(w, i.personId)}</Link></b><span className="ds-tag" data-k={i.disputed?.state === 'OPEN' ? 'warn' : i.status === 'CONFIRMED' ? 'ok' : undefined}>{i.disputed?.state === 'OPEN' ? 'Disputed · under review' : STATUS[i.status]}</span></div>
            <p className="t14 muted" style={{ margin: 0 }}>{role} · {ev ? fmtTime(ev.start) : i.status === 'PLANNING' ? 'time not set: schedule it in Calendar' : 'no time recorded'} · panel {i.panel.map((p) => w.actors.find((a) => a.id === p)?.first ?? p).join(' and ')}</p>
            <p className="t14" style={{ margin: 0 }}>{i.feedback.length ? `${i.feedback.length} feedback: ${i.feedback.map((f) => `${w.actors.find((a) => a.id === f.by)?.first} (${f.rating.toLowerCase()})`).join(', ')}` : 'No feedback yet'}{needs(i) ? ' · yours is due' : ''}</p>
          </li>); })}
      </ul>
      <section className="ds-sheet hire-b-grid" aria-label="Demo controls">
        <span className="lab">Demo controls <span className="ds-sim">Simulated</span></span>
        <p className="t14 muted" style={{ margin: 0 }}>Candidates act from their own side. To try the dispute curveball here, simulate Kunle disputing his take-home result.</p>
        <div className="ds-actions"><button type="button" className="ds-btn" disabled={!!w.interviews.find((i) => i.id === 'i_hb_kunle')?.disputed} onClick={() => act('hb.dispute.simulate', { id: 'i_hb_kunle' })}>Simulate: Kunle disputes his assessment</button></div>
      </section>
    </Canvas>
  );
}

export function InterviewRoom({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const me = actorOf(w);
  const i = w.interviews.find((x) => x.id === id && x.orgId === me.orgId);
  const [note, setNote] = useState('');
  const [noteReq, setNoteReq] = useState<string>('');
  const [draftText, setDraftText] = useState<string | null>(null);
  if (!i) return (
    <Canvas title="This interview isn’t available" kicker="Interview" open onClose={() => history.back()}>
      <section className="ds-banner" data-k="risk"><Glyph k="none" /><span>It may belong to another organisation or have been cancelled. <Link to="/r/interviews">All interviews</Link></span><span /></section>
    </Canvas>
  );
  const first = firstName(w, i.personId);
  const l = hireB(w).live[i.id] ?? { step: i.status === 'DONE' && i.feedback.some((f) => f.by === me.id) ? 'SUBMITTED' : 'BRIEF', current: 0, ratings: {}, notes: [] };
  const plan = hireB(w).plans[i.id] ?? questionsFor(w, i.personId);
  const cur = plan[Math.min(l.current, plan.length - 1)];
  const reqs = reqsOf(w);
  const ev = eventOf(w, i);
  const onPanel = i.panel.includes(me.id);
  const pipe = w.pipeline.find((p) => p.personId === i.personId && p.mandateId === i.mandateId);
  const lastNote = [...l.notes].reverse()[0];
  const addNote = () => {
    const t = note.trim(); if (!t) return;
    const reqId = noteReq || cur?.reqId; const vague = isVague(t);
    act('hb.iv.note', { id: i.id, text: t, reqId, vague, followups: vague ? followUpsFor(reqId, t) : [] }); setNote('');
  };
  const draft = l.draft;
  const title = l.step === 'BRIEF' ? `Interview with ${first}: ${plan.filter((q) => q.why.startsWith('Nothing') || q.why.startsWith('Only')).length} things to find out.` : l.step === 'LIVE' ? `Live with ${first} · question ${Math.min(l.current, plan.length - 1) + 1} of ${plan.length}` : l.step === 'FEEDBACK' ? 'Q drafted your feedback. Edit it, then submit.' : `Feedback submitted for ${first}.`;

  return (
    <Canvas title={title} kicker={<>Interview copilot · {nameOf(w, i.personId)}</>} open onClose={() => history.back()} qLine={title}
      aside={<div className="ds-actions"><Link className="ds-btn quiet" to="/r/interviews">All interviews</Link><Link className="ds-btn quiet" to={`/r/people/${i.personId}`}>Profile</Link></div>}>
      {i.disputed?.state === 'OPEN' && <div className="ds-banner" data-k="warn" role="status"><Glyph k="partial" /><span><b>{first} disputed the assessment result.</b> “{i.disputed.reason}” {hireB(w).reviews[i.id] ? 'A review is open; the result is excluded from comparisons until it’s resolved.' : 'It’s excluded from comparisons until a review resolves it.'}</span>
        {hireB(w).reviews[i.id] ? <span className="ds-actions"><button type="button" className="ds-btn" onClick={() => act('hb.review.resolve', { id: i.id, outcome: 'UPHELD' })}>Reviewer upholds (sim.)</button><button type="button" className="ds-btn quiet" onClick={() => act('hb.review.resolve', { id: i.id, outcome: 'REVISED' })}>Reviewer withdraws (sim.)</button></span>
          : <button type="button" className="ds-btn primary" onClick={() => act('hb.review.open', { id: i.id })}>Open a review request</button>}</div>}
      {i.disputed?.state === 'RESOLVED' && <p className="t14" role="status" style={{ margin: 0 }}>The dispute was reviewed: {hireB(w).reviews[i.id]?.state === 'UPHELD' ? 'result upheld' : 'result withdrawn'}.</p>}
      {!onPanel && <div className="ds-banner" role="status"><Glyph k="none" /><span>You’re not on this panel, so you can read it but can’t add feedback.</span><span /></div>}

      <section className="ds-sheet hire-b-grid" aria-label="Interview details">
        <p style={{ margin: 0 }}>{w.mandate.title} · {ev ? fmtTime(ev.start) : 'not scheduled yet'} · panel {i.panel.map((p) => w.actors.find((a) => a.id === p)?.first).join(' and ')}{pipe ? ` · pipeline: ${STAGE_LABEL[pipe.stage]}${pipe.note ? ` (${pipe.note})` : ''}` : ''}</p>
        {i.status === 'PLANNING' && <p className="t14 muted" style={{ margin: 0 }}>No time yet. Ask Q to draft an invitation, or schedule it in <Link to="/r/calendar">Calendar</Link>. You can still prepare questions here.</p>}
        {i.feedback.filter((f) => f.by !== me.id).map((f) => <p key={f.at} className="t14" style={{ margin: 0 }}><b>{w.actors.find((a) => a.id === f.by)?.first}’s feedback ({f.rating.toLowerCase()}):</b> {f.notes}</p>)}
      </section>

      {l.step === 'BRIEF' && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="iv-plan">
          <h2 id="iv-plan" className="voice t24" style={{ margin: 0 }}>Questions from the evidence gaps</h2>
          <ol className="hire-b-qs">{plan.map((q) => <li key={q.id}><span><b>{reqLabel(w, q.reqId)}:</b> {q.text}</span><span className="t14 muted">{q.why}</span></li>)}</ol>
          <p className="t14 muted" style={{ margin: 0 }}>Kora’s guideline: job-related questions only. The copilot listens to your notes, not to the call; nothing is recorded. <span className="ds-sim">Simulated</span></p>
          {onPanel && i.status !== 'PLANNING' && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => act('hb.iv.start', { id: i.id })}>Start the interview</button></div>}
        </section>
      )}

      {l.step === 'LIVE' && cur && (
        <div className="hire-b-live">
          <section className="ds-sheet hire-b-grid" aria-labelledby="iv-now">
            <span className="lab">Ask now · {reqLabel(w, cur.reqId)}</span>
            <h2 id="iv-now" className="voice t24" style={{ margin: 0 }}>{cur.text}</h2>
            <p className="t14 muted" style={{ margin: 0 }}>{cur.why}</p>
            <div className="ds-actions">
              <button type="button" className="ds-btn" disabled={l.current === 0} onClick={() => act('hb.iv.goto', { id: i.id, index: l.current - 1 })}>Previous</button>
              <button type="button" className="ds-btn" disabled={l.current >= plan.length - 1} onClick={() => act('hb.iv.goto', { id: i.id, index: l.current + 1 })}>Next question</button>
            </div>
            <form className="hire-b-grid" onSubmit={(e) => { e.preventDefault(); addNote(); }}>
              <div className="ds-field"><label htmlFor="iv-note">Your note on the answer</label><textarea id="iv-note" className="ds-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did they actually say? Q flags vague answers." /></div>
              <div className="ds-field"><label htmlFor="iv-req">About</label><select id="iv-req" className="ds-input" value={noteReq} onChange={(e) => setNoteReq(e.target.value)}><option value="">This question ({reqLabel(w, cur.reqId)})</option>{reqs.map((r) => <option key={r.reqId} value={r.reqId}>{r.label}</option>)}</select></div>
              <div className="ds-actions"><button type="submit" className="ds-btn primary" disabled={!note.trim()}>Add note</button></div>
            </form>
            {lastNote?.vague && (
              <div className="ds-banner" aria-live="polite" style={{ gridTemplateColumns: 'auto 1fr' }}><Glyph k="unclear" />
                <span><b>That answer sounds general.</b> Try a follow-up:</span>
                <ul className="hire-b-list" style={{ gridColumn: '1 / -1' }}>{lastNote.followups?.map((f) => <li key={f}><span className="hire-b-dia" aria-hidden="true" />{f}</li>)}</ul>
              </div>
            )}
            {l.notes.length > 0 && <ul className="hire-b-notes" aria-label="Notes">{l.notes.map((n) => <li key={n.id}><span className="lab">{n.reqId ? reqLabel(w, n.reqId) : 'General'}{n.vague ? ' · vague' : ''}</span><span>{n.text}</span></li>)}</ul>}
          </section>
          <section className="ds-sheet hire-b-grid" aria-labelledby="iv-rub">
            <h2 id="iv-rub" className="voice t24" style={{ margin: 0 }}>Live rubric</h2>
            <p className="t14 muted" style={{ margin: 0 }}>Rate what they showed in this interview, not the CV.</p>
            {reqs.map((r) => (
              <div key={r.reqId} className="hire-b-grid" style={{ gap: 6 }} role="group" aria-label={`${r.label} rating`}>
                <span className="t14"><b>{r.label}</b>{r.mustHave ? '' : ' · nice to have'}</span>
                <div className="hire-b-chips">{(['STRONG', 'SOME', 'NOT_SHOWN'] as Rating[]).map((k) => <button key={k} type="button" className="ds-filter" aria-pressed={l.ratings[r.reqId] === k} onClick={() => act('hb.iv.rate', { id: i.id, reqId: r.reqId, rating: k })}>{({ STRONG: 'Strong', SOME: 'Some', NOT_SHOWN: 'Not shown' })[k]}</button>)}</div>
              </div>
            ))}
            <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => act('hb.iv.finish', { id: i.id })}>End and write feedback</button></div>
          </section>
        </div>
      )}

      {l.step === 'FEEDBACK' && draft && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="iv-fb">
          <h2 id="iv-fb" className="voice t24" style={{ margin: 0 }}>Your feedback on {first}</h2>
          <p className="t14 muted" style={{ margin: 0 }}>{draft.byQ ? 'Q drafted this from your notes and rubric. It’s yours: change anything.' : 'Edited by you.'}</p>
          <div role="radiogroup" aria-label="Overall" className="hire-b-chips">
            {(['STRONG', 'MIXED', 'CONCERNS'] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={draft.rating === k} className="ds-filter" aria-pressed={draft.rating === k} onClick={() => act('hb.iv.draft', { id: i.id, rating: k, notes: draftText ?? draft.notes })}>{({ STRONG: 'Strong', MIXED: 'Mixed', CONCERNS: 'Concerns' })[k]}</button>)}
          </div>
          <div className="ds-field"><label htmlFor="iv-fbt">Notes for the panel</label><textarea id="iv-fbt" className="ds-input" rows={9} value={draftText ?? draft.notes} onChange={(e) => setDraftText(e.target.value)} onBlur={() => { if (draftText !== null && draftText !== draft.notes) act('hb.iv.draft', { id: i.id, rating: draft.rating, notes: draftText }); }} /></div>
          <p className="t14" style={{ margin: 0 }}><span className="muted">If you submit: </span>the panel sees this, it’s added to {first}’s interview record, and their pipeline card shows your rating. {first} doesn’t see it.</p>
          <div className="ds-actions">
            <button type="button" className="ds-btn primary" disabled={!onPanel} onClick={() => { if (draftText !== null && draftText !== draft.notes) act('hb.iv.draft', { id: i.id, rating: draft.rating, notes: draftText }); setTimeout(() => act('hb.iv.submit', { id: i.id }), 0); }}>Submit feedback</button>
            <Link className="ds-btn quiet" to="/r/interviews">Finish later</Link>
          </div>
        </section>
      )}

      {l.step === 'SUBMITTED' && (
        <section className="ds-sheet hire-b-grid" aria-label="Submitted">
          <div className="ds-banner" role="status"><Glyph k="full" /><span>Submitted {fmtDate(i.feedback.find((f) => f.by === me.id)?.at ?? new Date().toISOString())}. {first}’s pipeline card shows it. Next round? Arrange it from <Link to="/r/messages">Messages</Link> or <Link to="/r/calendar">Calendar</Link>.</span><span /></div>
          {i.feedback.filter((f) => f.by === me.id).map((f) => <p key={f.at} style={{ margin: 0, whiteSpace: 'pre-wrap' }}><b>{f.rating}</b> · {f.notes}</p>)}
        </section>
      )}
    </Canvas>
  );
}
