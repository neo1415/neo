// Interviews (R2, design pass): the list, grouped by what Ada has to do next, and the live interview copilot
// (simulated): a question rail that shows coverage (MO-022), the question to ask now with what the evidence
// said before the interview, follow-ups that arrive the moment an answer sounds vague (MO-023), a compact live
// rubric, then structured feedback that Q drafts and the human edits and submits. Scheduling and messages
// belong to Calendar and Messages; this page links there instead of rebuilding them.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { actorOf, useWorld, type World } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { arrive } from '../../ds/motion';
import { Link } from '../../ui/router';
import { runAction, useViewState } from '../../q/core/engine';
import { STAGE_LABEL, type Interview } from '../../state/domain';
import { hireB, type Rating } from '../../state/areas/hire-b';
import { cellFor, eventOf, firstName, shortLabel, followUpsFor, isVague, KORA_ROLE, koraInterviews, nameOf, questionsFor, reqLabel, reqsOf } from './model';
import { LevelMark, fmtDate } from './ui';
import './ops';

const STATUS: Record<string, string> = { PLANNING: 'Not scheduled', INVITED: 'Invited', CONFIRMED: 'Confirmed', DONE: 'Done', CANCELLED: 'Cancelled' };
const RATE: Record<Rating, string> = { STRONG: 'Strong', SOME: 'Some', NOT_SHOWN: 'Not shown' };
const OVERALL = { STRONG: 'Strong', MIXED: 'Mixed', CONCERNS: 'Concerns' } as const;
const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
const LAGOS = 'Africa/Lagos';
const dayNum = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', timeZone: LAGOS });
const wk = (s: string) => new Date(s).toLocaleDateString('en-GB', { weekday: 'short', timeZone: LAGOS });
const mon = (s: string) => new Date(s).toLocaleDateString('en-GB', { month: 'short', timeZone: LAGOS });
const hhmm = (s: string) => new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: LAGOS });
const whenText = (s: string) => new Date(s).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: LAGOS });
const firstOfActor = (w: World, id: string) => w.actors.find((a) => a.id === id)?.first ?? id;

type Filter = 'all' | 'upcoming' | 'feedback' | 'disputed';

export function Interviews() {
  const w = useWorld((x) => x);
  const [filter, setFilter] = useViewState<Filter>('filter', 'all');
  const me = actorOf(w);
  const all = koraInterviews(w);
  const needs = (i: Interview) => i.panel.includes(me.id) && !i.feedback.some((f) => f.by === me.id) && (i.status === 'DONE' || hireB(w).live[i.id]?.step === 'FEEDBACK');
  const disputed = (i: Interview) => i.disputed?.state === 'OPEN';
  const upcoming = (i: Interview) => ['INVITED', 'CONFIRMED'].includes(i.status) && !needs(i);
  const time = (i: Interview) => eventOf(w, i)?.start ?? '';
  const groups: { id: string; title: string; items: Interview[]; show: Filter[] }[] = [
    { id: 'disputed', title: 'Disputed: needs a review', items: all.filter(disputed), show: ['all', 'disputed'] },
    { id: 'feedback', title: 'Waiting for your feedback', items: all.filter((i) => needs(i) && !disputed(i)), show: ['all', 'feedback'] },
    { id: 'upcoming', title: 'Coming up', items: all.filter((i) => upcoming(i) && !disputed(i)).sort((a, b) => time(a).localeCompare(time(b))), show: ['all', 'upcoming'] },
    { id: 'planning', title: 'Not scheduled yet', items: all.filter((i) => i.status === 'PLANNING' && !disputed(i)), show: ['all', 'upcoming'] },
    { id: 'done', title: 'Done', items: all.filter((i) => i.status === 'DONE' && !needs(i) && !disputed(i)), show: ['all'] },
  ];
  const count: Record<Filter, number> = { all: all.length, upcoming: groups[2].items.length + groups[3].items.length, feedback: all.filter(needs).length, disputed: groups[0].items.length };
  const next = groups[2].items.find((i) => eventOf(w, i));
  const title = count.disputed ? `${count.disputed} disputed result${count.disputed > 1 ? 's need' : ' needs'} a review`
    : count.feedback ? `${count.feedback} interview${count.feedback > 1 ? 's are' : ' is'} waiting for your feedback`
    : next ? `Next: ${nameOf(w, next.personId)}, ${whenText(time(next))}` : 'No interviews coming up';
  const visible = groups.filter((g) => g.show.includes(filter) && g.items.length);

  return (
    <Canvas title={title} kicker={`Interviews · ${w.orgs.find((o) => o.id === me.orgId)?.name ?? 'your team'}`} open onClose={() => {}}
      aside={<div className="ds-actions"><Link className="ds-btn" to="/r/calendar">Calendar</Link><Link className="ds-btn quiet" to="/r/messages">Messages</Link></div>}>
      <div className="hire-b-chips" role="group" aria-label="Show">
        {([['all', 'All'], ['upcoming', 'Upcoming'], ['feedback', 'Needs your feedback'], ['disputed', 'Disputed']] as const).map(([k, l]) => <button key={k} type="button" className="ds-filter" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l} <span className="num hire-b-count">{count[k]}</span></button>)}
      </div>
      {visible.length === 0 && (
        <section className="ds-sheet hire-b-empty"><Glyph k={filter === 'all' ? 'none' : 'full'} /><div>
          <b>{filter === 'all' ? 'No interviews yet.' : filter === 'feedback' ? 'You’re up to date: no feedback waiting.' : filter === 'disputed' ? 'No disputed results.' : 'Nothing coming up.'}</b>
          <p className="t14 muted" style={{ margin: 0 }}>{filter === 'all' ? 'Ask Q to plan one, or schedule it from the calendar.' : 'Switch to All to see every interview.'}</p>
        </div></section>
      )}
      {visible.map((g) => (
        <section key={g.id} className="ds-sheet hire-b-ivgroup" aria-labelledby={`ivg-${g.id}`}>
          <h2 id={`ivg-${g.id}`} className="hire-b-ivgh">{g.title} <span className="muted num">{g.items.length}</span></h2>
          <ul className="hire-b-ivlist">
            {g.items.map((i) => { const ev = eventOf(w, i); const role = i.mandateId === KORA_ROLE ? w.mandate.title : w.mandates.find((m) => m.id === i.mandateId)?.title; const mine = i.panel.includes(me.id);
              const action = disputed(i) ? 'Review the dispute' : needs(i) ? 'Write feedback' : i.status === 'CONFIRMED' && mine ? 'Open the copilot' : i.status === 'PLANNING' ? 'Prepare questions' : 'Open';
              return (
              <li key={i.id} className="hire-b-ivrow">
                <span className="hire-b-when" aria-hidden={!ev}>{ev ? <><span>{wk(ev.start)}</span><b className="num">{dayNum(ev.start)}</b><span>{mon(ev.start)} · <span className="num">{hhmm(ev.start)}</span></span></> : <span className="muted">No time</span>}</span>
                <span className="hire-b-ivmain">
                  <span className="hire-b-ivname"><Link to={`/r/interviews/${i.id}`}>{nameOf(w, i.personId)}</Link><span className="ds-tag" data-k={disputed(i) ? 'warn' : i.status === 'CONFIRMED' ? 'ok' : undefined}>{disputed(i) ? 'Under review' : STATUS[i.status]}</span></span>
                  <span className="t14 muted">{role}{ev ? <span className="sr"> · {whenText(ev.start)}</span> : ''} · panel {i.panel.map((p) => firstOfActor(w, p)).join(' and ')}</span>
                  <span className="t14">{i.feedback.length ? `Feedback: ${i.feedback.map((f) => `${firstOfActor(w, f.by)} (${f.rating.toLowerCase()})`).join(', ')}` : 'No feedback yet'}{needs(i) ? ' · yours is due' : ''}</span>
                </span>
                <Link className={`ds-btn ${needs(i) || disputed(i) ? 'primary' : 'quiet'} hire-b-ivgo`} to={`/r/interviews/${i.id}`} aria-label={`${action}: ${nameOf(w, i.personId)}`}>{action}</Link>
              </li>); })}
          </ul>
        </section>
      ))}
      <section className="hire-b-demo" aria-label="Demo controls">
        <span className="lab">Demo controls</span>
        <p className="t14 muted" style={{ margin: 0 }}>Candidates act from their own side. To try the dispute here, simulate Kunle disputing his take-home result.</p>
        <div className="ds-actions"><button type="button" className="ds-btn quiet" disabled={!!w.interviews.find((i) => i.id === 'i_hb_kunle')?.disputed} onClick={() => act('hb.dispute.simulate', { id: 'i_hb_kunle' })}>Simulate: Kunle disputes his assessment</button></div>
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
      <section className="ds-sheet hire-b-empty"><Glyph k="none" /><div><b>It may belong to another organisation or have been cancelled.</b><p className="t14 muted" style={{ margin: 0 }}><Link to="/r/interviews">See all interviews</Link></p></div></section>
    </Canvas>
  );
  const first = firstName(w, i.personId);
  const l = hireB(w).live[i.id] ?? { step: i.status === 'DONE' && i.feedback.some((f) => f.by === me.id) ? 'SUBMITTED' : 'BRIEF', current: 0, ratings: {}, notes: [] };
  const plan = hireB(w).plans[i.id] ?? questionsFor(w, i.personId);
  const idx = Math.min(l.current, plan.length - 1);
  const cur = plan[idx];
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
  const unknowns = plan.filter((q) => q.why.startsWith('Nothing') || q.why.startsWith('Only')).length;
  const rated = reqs.filter((r) => l.ratings[r.reqId]).length;
  const mustUnrated = reqs.filter((r) => r.mustHave && !l.ratings[r.reqId]);
  const doneElsewhere = l.step === 'BRIEF' && i.status === 'DONE';
  const title = doneElsewhere ? `${first}’s interview is done` : l.step === 'BRIEF' ? `Interview with ${first}: ${unknowns ? `${unknowns} thing${unknowns === 1 ? '' : 's'} to find out` : 'go deeper on what’s checked'}`
    : l.step === 'LIVE' ? `Live with ${first} · question ${idx + 1} of ${plan.length}`
    : l.step === 'FEEDBACK' ? 'Q drafted your feedback. Edit it, then submit.' : `Feedback submitted for ${first}`;
  const others = i.feedback.filter((f) => f.by !== me.id);

  return (
    <Canvas title={title} kicker={`Interview · ${nameOf(w, i.personId)}`} open onClose={() => history.back()} qLine={title}
      aside={<div className="ds-actions"><Link className="ds-btn quiet" to="/r/interviews">All interviews</Link><Link className="ds-btn quiet" to={`/r/people/${i.personId}`}>Profile</Link></div>}>
      <p className="hire-b-meta t14">
        <span>{w.mandate.title}</span>
        <span>{ev ? whenText(ev.start) : i.status === 'DONE' ? 'Time not recorded' : 'Not scheduled yet'}</span>
        <span>Panel {i.panel.map((p) => firstOfActor(w, p)).join(' and ')}</span>
        {pipe && <span>Pipeline: {STAGE_LABEL[pipe.stage]}</span>}
        {l.step === 'LIVE' && <span className="ds-sim">Simulated copilot</span>}
      </p>
      {i.disputed?.state === 'OPEN' && <div className="ds-banner" data-k="warn" role="status"><Glyph k="partial" /><span><b>{first} disputed the assessment result.</b> “{i.disputed.reason}” {hireB(w).reviews[i.id] ? 'A review is open; the result is left out of comparisons until it’s resolved.' : 'It’s left out of comparisons until a review resolves it.'}</span>
        {hireB(w).reviews[i.id] ? <span className="ds-actions"><button type="button" className="ds-btn" onClick={() => act('hb.review.resolve', { id: i.id, outcome: 'UPHELD' })}>Simulate: reviewer upholds</button><button type="button" className="ds-btn quiet" onClick={() => act('hb.review.resolve', { id: i.id, outcome: 'REVISED' })}>Simulate: reviewer withdraws</button></span>
          : <button type="button" className="ds-btn primary" onClick={() => act('hb.review.open', { id: i.id })}>Open a review request</button>}</div>}
      {i.disputed?.state === 'RESOLVED' && <p className="t14" role="status" style={{ margin: 0 }}><Glyph k="full" size={14} /> The dispute was reviewed: {hireB(w).reviews[i.id]?.state === 'UPHELD' ? 'result upheld' : 'result withdrawn'}.</p>}
      {!onPanel && <div className="ds-banner" role="status"><Glyph k="none" /><span>You’re not on this panel, so you can read it but can’t add feedback.</span><span /></div>}
      {i.status === 'PLANNING' && <div className="ds-banner" role="status"><Glyph k="unclear" /><span>No time yet. Ask Q to draft an invitation, or schedule it in <Link to="/r/calendar">Calendar</Link>. You can still prepare the questions.</span><span /></div>}
      {others.length > 0 && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="iv-oth">
          <h2 id="iv-oth" className="hire-b-ivgh">Other feedback</h2>
          {others.map((f) => <div key={f.at} className="hire-b-fbq"><span className="hire-b-ivname"><b>{firstOfActor(w, f.by)}</b><span className="ds-tag" data-k={f.rating === 'CONCERNS' ? 'warn' : f.rating === 'STRONG' ? 'ok' : undefined}>{OVERALL[f.rating as keyof typeof OVERALL] ?? f.rating}</span><span className="t14 muted">{fmtDate(f.at)}</span></span><p style={{ margin: 0 }}>{f.notes}</p></div>)}
        </section>
      )}

      {l.step === 'BRIEF' && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="iv-plan">
          <h2 id="iv-plan" className="voice t24" style={{ margin: 0 }}>{doneElsewhere ? 'Questions for a next round' : 'Questions from the evidence'}</h2>
          <p className="t14 muted" style={{ margin: 0 }}>Must-haves first; within them, the least-shown first. Kora’s guideline: job-related questions only. The copilot reads the notes you type; it doesn’t listen to the call, and nothing is recorded.</p>
          <ol className="hire-b-qlist">{plan.map((q) => { const c = cellFor(w, i.personId, q.reqId); return <li key={q.id}><span className="hire-b-qtags"><span className="hire-b-qreq">{reqLabel(w, q.reqId)}</span><LevelMark level={c.level} small /></span><span className="hire-b-qtext">{q.text}</span></li>; })}</ol>
          {onPanel && !['PLANNING', 'DONE'].includes(i.status) && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => act('hb.iv.start', { id: i.id })}>Start the interview</button><span className="t14 muted">You can also say “start the interview” to Q.</span></div>}
        </section>
      )}

      {l.step === 'LIVE' && cur && (
        <>
          <ol className="hire-b-rail" aria-label="Questions: progress">
            {plan.map((q, n) => { const noted = l.notes.some((x) => x.reqId === q.reqId); const r = l.ratings[q.reqId]; return (
              <li key={q.id}>
                <button type="button" aria-current={n === idx ? 'step' : undefined} data-done={r ? '1' : noted ? 'n' : undefined} onClick={() => act('hb.iv.goto', { id: i.id, index: n })}>
                  <span className="num hire-b-rail-n">{r ? '✓' : n + 1}</span><span className="hire-b-rail-l">{shortLabel(w, q.reqId)}</span>
                  <span className="sr">{r ? `, rated ${RATE[r].toLowerCase()}` : noted ? ', noted' : ', not asked yet'}</span>
                </button>
              </li>); })}
          </ol>
          <div className="hire-b-live">
            <section className="ds-sheet hire-b-grid" aria-labelledby="iv-now">
              <div className="hire-b-row"><span className="lab">Ask now · {reqLabel(w, cur.reqId)}</span><span className="hire-b-before t14"><span className="muted">Before the interview:</span> <LevelMark level={cellFor(w, i.personId, cur.reqId).level} small /></span></div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2 key={cur.id} id="iv-now" className="voice hire-b-ask" {...arrive}>{cur.text}</motion.h2>
              </AnimatePresence>
              <p className="t14 muted" style={{ margin: 0 }}>{cur.why}</p>
              <AnimatePresence initial={false}>
                {lastNote?.vague && (
                  <motion.div key={lastNote.id} className="hire-b-follow" aria-live="polite" {...arrive}>
                    <span className="lab hire-b-q">Q suggests a follow-up</span>
                    <p style={{ margin: 0 }}><b>That answer sounds general.</b> No specific situation, number or personal decision yet. Try:</p>
                    <ul className="hire-b-list">{lastNote.followups?.map((f) => <li key={f}><span className="hire-b-dia" aria-hidden="true" />{f}</li>)}</ul>
                  </motion.div>
                )}
              </AnimatePresence>
              <form className="hire-b-noteform" onSubmit={(e) => { e.preventDefault(); addNote(); }}>
                <div className="ds-field"><label htmlFor="iv-note">What did {first} say?</label><textarea id="iv-note" className="ds-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Their words, as close as you can. Q flags vague answers." /></div>
                <div className="hire-b-noterow">
                  <label className="t14" htmlFor="iv-req">About</label>
                  <select id="iv-req" className="ds-input" value={noteReq} onChange={(e) => setNoteReq(e.target.value)}><option value="">This question ({reqLabel(w, cur.reqId)})</option>{reqs.map((r) => <option key={r.reqId} value={r.reqId}>{r.label}</option>)}</select>
                  <button type="submit" className="ds-btn primary" disabled={!note.trim()}>Add note</button>
                </div>
              </form>
              <div className="ds-actions hire-b-qnav">
                <button type="button" className="ds-btn quiet" disabled={idx === 0} onClick={() => act('hb.iv.goto', { id: i.id, index: idx - 1 })}>Previous</button>
                <button type="button" className="ds-btn" disabled={idx >= plan.length - 1} onClick={() => act('hb.iv.goto', { id: i.id, index: idx + 1 })}>Next question</button>
              </div>
              {l.notes.length > 0 && <ul className="hire-b-notes" aria-label="Your notes">{[...l.notes].reverse().map((n) => <motion.li key={n.id} {...arrive}><span className="lab">{n.reqId ? reqLabel(w, n.reqId) : 'General'}{n.vague ? ' · sounds general' : ''}</span><span>{n.text}</span></motion.li>)}</ul>}
            </section>
            <section className="ds-sheet hire-b-grid" aria-labelledby="iv-rub">
              <div className="hire-b-row"><h2 id="iv-rub" className="voice t24" style={{ margin: 0 }}>Live rubric</h2><span className="t14 muted num">{rated} of {reqs.length} rated</span></div>
              <p className="t14 muted" style={{ margin: 0 }}>Rate what {first} showed in this interview, not the CV.</p>
              {reqs.map((r) => (
                <div key={r.reqId} className="hire-b-rubrow">
                  <span className="t14"><b>{r.label}</b>{r.mustHave ? '' : <span className="muted"> · nice to have</span>}</span>
                  <div className="hire-b-rate" role="group" aria-label={`${r.label} rating`}>{(['STRONG', 'SOME', 'NOT_SHOWN'] as Rating[]).map((k) => <button key={k} type="button" aria-pressed={l.ratings[r.reqId] === k} onClick={() => act('hb.iv.rate', { id: i.id, reqId: r.reqId, rating: k })}>{RATE[k]}</button>)}</div>
                </div>
              ))}
              {mustUnrated.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>Not rated yet: {mustUnrated.map((r) => r.label).join(', ')}. That’s fine; the feedback will say “not covered”.</p>}
              <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => act('hb.iv.finish', { id: i.id })}>End and write feedback</button></div>
            </section>
          </div>
        </>
      )}

      {l.step === 'FEEDBACK' && draft && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="iv-fb">
          <h2 id="iv-fb" className="voice t24" style={{ margin: 0 }}>Your feedback on {first}</h2>
          <p className="t14 muted" style={{ margin: 0 }}>{draft.byQ ? 'Q drafted this from your notes and rubric. It’s yours: change anything.' : 'Edited by you.'}</p>
          <ul className="hire-b-readout" aria-label="Your rubric">
            {reqs.map((r) => { const k = l.ratings[r.reqId]; return <li key={r.reqId} data-k={k ?? 'NONE'}><span>{r.label}{r.mustHave ? '' : <span className="muted"> · nice to have</span>}</span><b>{k ? RATE[k] : 'Not covered'}</b></li>; })}
          </ul>
          <div className="hire-b-grid" style={{ gap: 6 }}>
            <span className="t14" id="iv-ov"><b>Overall</b> <span className="muted">· Q suggested {OVERALL[draft.rating].toLowerCase()} from the must-haves; change it if you disagree</span></span>
            <div role="radiogroup" aria-labelledby="iv-ov" className="hire-b-rate hire-b-rate-lg">
              {(['STRONG', 'MIXED', 'CONCERNS'] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={draft.rating === k} onClick={() => act('hb.iv.draft', { id: i.id, rating: k, notes: draftText ?? draft.notes })}>{OVERALL[k]}</button>)}
            </div>
          </div>
          <div className="ds-field"><label htmlFor="iv-fbt">Notes for the panel</label><textarea id="iv-fbt" className="ds-input" rows={9} value={draftText ?? draft.notes} onChange={(e) => setDraftText(e.target.value)} onBlur={() => { if (draftText !== null && draftText !== draft.notes) act('hb.iv.draft', { id: i.id, rating: draft.rating, notes: draftText }); }} /></div>
          <div className="hire-b-consq t14"><Glyph k="unclear" size={14} /><span>When you submit, the panel sees this, it’s added to {first}’s interview record, and their pipeline card shows your rating. {first} doesn’t see it.</span></div>
          <div className="ds-actions">
            <button type="button" className="ds-btn primary" disabled={!onPanel} onClick={() => { if (draftText !== null && draftText !== draft.notes) act('hb.iv.draft', { id: i.id, rating: draft.rating, notes: draftText }); setTimeout(() => act('hb.iv.submit', { id: i.id }), 0); }}>Submit feedback</button>
            <Link className="ds-btn quiet" to="/r/interviews">Finish later</Link>
          </div>
        </section>
      )}

      {l.step === 'SUBMITTED' && (
        <motion.section {...arrive} className="ds-sheet hire-b-grid hire-b-done" aria-labelledby="iv-done">
          <div className="hire-b-done-head"><span className="hire-b-okmark" aria-hidden="true">✓</span><div><h2 id="iv-done" className="voice t24" style={{ margin: 0 }}>Thanks, that’s with the panel</h2><p className="t14 muted" style={{ margin: 0 }}>Submitted {fmtDate(i.feedback.find((f) => f.by === me.id)?.at ?? new Date().toISOString())}. {first}’s pipeline card shows it.</p></div></div>
          {i.feedback.filter((f) => f.by === me.id).map((f) => <div key={f.at} className="hire-b-fbq"><span className="ds-tag" style={{ justifySelf: 'start' }}>{OVERALL[f.rating as keyof typeof OVERALL] ?? f.rating}</span><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{f.notes}</p></div>)}
          <p className="t14" style={{ margin: 0 }}>Next round? Arrange it from <Link to="/r/messages">Messages</Link> or <Link to="/r/calendar">Calendar</Link>, or ask Q.</p>
        </motion.section>
      )}
    </Canvas>
  );
}
