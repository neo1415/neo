// SC-056 Candidate stage detail (/r/pipeline/:mandateId/:personId; a detail state of /r/pipeline). One person in one
// role: the stage track, what is due and by when, internal notes, what waits for approval (messages, offer), the
// interview, and the record of changes. Moves use hire-c's own op (undoable); notes never reach the candidate.
import { useState } from 'react';
import { actorOf, personOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { PageIndex } from '../../ds/PageIndex';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { STAGES, STAGE_LABEL, type Stage as StageT } from '../../state/domain';
import { hd, keyOf } from '../../state/areas/hire-d';
import { proof } from '../../state/areas/proof';
import { CAN_MOVE, evStatusLabel, firstOf, LAGOS, mandateTitle, msgStatusLabel, tDay, tTime } from '../hire-c/lib';
import { daysBetween, fmtDay, mandateOrg, offerOf, pendingApprovals, stageEvents } from './model';
import { simNow } from '../../mock/world';

export function StageDetail({ mid, pid }: { mid: string; pid: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const p = personOf(w, pid);
  const e = w.pipeline.find((x) => x.mandateId === mid && x.personId === pid);
  const [note, setNote] = useState('');
  const [dueOpen, setDueOpen] = useState(false);
  if (!p || !e || mandateOrg(w, mid) !== a.orgId) return (
    <Canvas title="Not available to you" kicker="Pipeline" open onClose={() => {}}>
      <section className="ds-sheet hd-empty" role="alert"><b>This record isn’t in your organisation’s pipeline.</b><span className="t14 muted">Each organisation sees only its own hiring. Nothing about this person is shown.</span><Link to="/r/pipeline" className="ds-btn">Back to the pipeline</Link></section>
    </Canvas>
  );
  const f = p.name.split(' ')[0];
  const k = keyOf(mid, pid);
  const notes = hd(w).notes[k] ?? [];
  const due = hd(w).due[k];
  const commit = proof(w).commitments.find((c) => c.personId === pid && c.mandateId === mid && c.orgId === a.orgId && c.state !== 'FULFILLED');
  const pend = pendingApprovals(w, a.orgId!, pid);
  const offer = offerOf(w, mid, pid);
  const ev = w.calendar.find((x) => x.personId === pid && x.orgId === a.orgId && x.status !== 'CANCELLED');
  const can = CAN_MOVE.includes(a.role ?? 'VIEWER');
  const out = e.stage === 'REJECTED' || e.stage === 'WITHDRAWN';
  const cur = STAGES.indexOf(e.stage);
  const hist = stageEvents(w, a, mid, pid);
  const nowD = simNow(w);
  const dueIn = due ? daysBetween(nowD, due.date) : null;
  const move = (to: StageT) => void runAction({ label: 'Move', act: { t: 'do', op: 'hire-c.move', args: { personId: pid, mandateId: mid, stage: to } } });
  return (
    <Canvas title={`${p.name} · ${STAGE_LABEL[e.stage]}`} kicker={`${mandateTitle(w, mid)} · stage detail`} open onClose={() => {}} qLine={due ? `Due ${fmtDay(due.date)}: ${due.what}.` : 'No due date set.'}
      aside={<span className="ds-actions"><Link to="/r/pipeline" className="ds-btn quiet">Pipeline</Link><Link to={`/r/people/${pid}`} className="ds-btn quiet">Profile</Link></span>}>
      <PageIndex items={[{ id: 'st-track', label: 'Stage' }, { id: 'st-due', label: 'Due' }, { id: 'st-appr', label: 'Approvals' }, { id: 'st-notes', label: 'Notes' }, { id: 'st-hist', label: 'History' }]} />
      <section id="st-track" className="ds-sheet hd-sec" aria-labelledby="st-track-h">
        <div className="hd-head"><h2 id="st-track-h" className="voice t24">Where {f} is</h2><span className="t14 muted">Since {fmtDay(e.at)} · moved by {firstOf(w, e.by)}</span></div>
        <ol className="hd-track" aria-label="Stages">{STAGES.map((s, i) => <li key={s} data-s={out ? 'out' : i < cur ? 'done' : i === cur ? 'now' : 'next'} aria-current={i === cur ? 'step' : undefined}><span className="hd-track-dot" aria-hidden="true" /><span className="t14">{STAGE_LABEL[s]}</span></li>)}</ol>
        {out && <p className="t14" style={{ margin: 0 }}>{STAGE_LABEL[e.stage]}{e.note ? `. Internal reason: ${e.note}` : ''}</p>}
        {can && !out && (
          <div className="ds-actions">
            {cur < STAGES.length - 1 && STAGES[cur + 1] !== 'HIRED' && <button type="button" className="ds-btn" onClick={() => move(STAGES[cur + 1])}>Move to {STAGE_LABEL[STAGES[cur + 1]]}</button>}
            {['INTERVIEW', 'REPLIED', 'SHORTLISTED', 'CONTACTED'].includes(e.stage) && <Link to={`/r/calendar/book/${pid}`} className="ds-btn">Book an interview</Link>}
            {['INTERVIEW', 'OFFER'].includes(e.stage) && <Link to={`/r/offer/${mid}/${pid}`} className="ds-btn">{offer ? 'Open the offer' : 'Prepare an offer'}</Link>}
          </div>
        )}
        {!can && <p className="t14 muted" style={{ margin: 0 }}>Your role can see this record but not move {f}.</p>}
      </section>
      <section id="st-due" className="ds-sheet hd-sec" aria-labelledby="st-due-h">
        <div className="hd-head"><h2 id="st-due-h" className="voice t24">What’s due</h2></div>
        <ul className="hd-list">
          <li className="hd-row"><span className="hd-rowmain"><b>{due ? due.what : 'No next step set'}</b><span className="t14 muted">{due ? `Due ${fmtDay(due.date)}${dueIn !== null ? (dueIn < 0 ? ` · ${-dueIn} day${dueIn === -1 ? '' : 's'} late` : dueIn === 0 ? ' · today' : ` · in ${dueIn} day${dueIn === 1 ? '' : 's'}`) : ''} · set by ${firstOf(w, due.by)}` : 'Internal to your team.'}</span></span>{can && <button type="button" className="ds-btn quiet" aria-expanded={dueOpen} onClick={() => setDueOpen(!dueOpen)}>{due ? 'Change' : 'Set a due date'}</button>}</li>
          {commit && <li className="hd-row"><span className="hd-rowmain"><b>Promised to {f}: {commit.milestone}</b><span className="t14 muted">Update by {fmtDay(commit.nextUpdateDue)}{commit.state === 'OVERDUE' ? ' · late' : ''} · owner {w.actors.find((x) => x.id === commit.owner)?.name}</span></span><Link to="/r/reminders" className="ds-btn quiet">Reminders</Link></li>}
          {ev && <li className="hd-row"><span className="hd-rowmain"><b>Interview {tDay(ev.start, LAGOS)} {tTime(ev.start, LAGOS)}</b><span className="t14 muted">{evStatusLabel[ev.status]}</span></span><Link to={`/r/calendar/book/${pid}`} className="ds-btn quiet">Booking</Link></li>}
        </ul>
        {dueOpen && <DueForm mid={mid} pid={pid} onDone={() => setDueOpen(false)} />}
      </section>
      <section id="st-appr" className="ds-sheet hd-sec" aria-labelledby="st-appr-h">
        <div className="hd-head"><h2 id="st-appr-h" className="voice t24">Waiting for approval</h2><span className="t14 muted">{pend.length + (offer && offer.state === 'AWAITING_APPROVAL' ? 1 : 0) || 'Nothing'}</span></div>
        {!pend.length && !(offer && offer.state === 'AWAITING_APPROVAL') ? <p className="t14 muted" style={{ margin: 0 }}>Nothing waiting. Q never sends without a person’s yes.</p> : (
          <ul className="hd-list">
            {pend.map((m) => <li key={m.id} className="hd-row"><span className="hd-rowmain"><b>{m.subject ?? 'Message'}</b><span className="t14 muted">{msgStatusLabel[m.status]} · by {firstOf(w, m.from)}</span></span><button type="button" className="ds-btn quiet" onClick={() => void runAction({ label: 'Open', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId: m.id } } })}>Open<span className="sr"> {m.subject}</span></button></li>)}
            {offer && offer.state === 'AWAITING_APPROVAL' && <li className="hd-row"><span className="hd-rowmain"><b>Offer v{offer.versions.length}</b><span className="t14 muted">Waiting for {offer.approvals.filter((x) => !x.at || x.voided).map((x) => firstOf(w, x.who)).join(' and ')}</span></span><Link to={`/r/offer/${mid}/${pid}`} className="ds-btn quiet">Open the offer</Link></li>}
          </ul>
        )}
      </section>
      <section id="st-notes" className="ds-sheet hd-sec" aria-labelledby="st-notes-h">
        <div className="hd-head"><h2 id="st-notes-h" className="voice t24">Recruiter notes</h2><span className="t14 muted">Internal; never sent to {f}</span></div>
        {notes.length ? <ul className="hd-list">{notes.map((n) => <li key={n.id} className="hd-row"><span className="hd-rowmain"><span>{n.text}</span><span className="t14 muted">{firstOf(w, n.by)} · {fmtDay(n.at)}</span></span></li>)}</ul> : <p className="t14 muted" style={{ margin: 0 }}>No notes yet.</p>}
        {can && <form className="hd-noteform" onSubmit={(x) => { x.preventDefault(); if (!note.trim()) return; void runAction({ label: 'Note', act: { t: 'do', op: 'hd.note.add', args: { mandateId: mid, personId: pid, text: note } } }); setNote(''); }}>
          <label htmlFor="st-note" className="lab">Add a note about the work</label>
          <div className="hd-searchrow"><input id="st-note" className="ds-input" value={note} onChange={(x) => setNote(x.target.value)} /><button type="submit" className="ds-btn">Add note</button></div>
        </form>}
      </section>
      <section id="st-hist" className="ds-sheet hd-sec" aria-labelledby="st-hist-h">
        <div className="hd-head"><h2 id="st-hist-h" className="voice t24">History</h2><span className="t14 muted">From the audit log</span></div>
        {hist.length ? <ul className="hd-list">{hist.map((h) => <li key={h.id} className="hd-row"><span className="hd-rowmain"><span>{h.text}</span><span className="t14 muted">{tDay(h.at, LAGOS)} {tTime(h.at, LAGOS)}</span></span></li>)}</ul> : <p className="t14 muted" style={{ margin: 0 }}>Nothing recorded in this session yet. Earlier changes: moved to {STAGE_LABEL[e.stage]} on {fmtDay(e.at)} by {firstOf(w, e.by)}.</p>}
      </section>
    </Canvas>
  );
}

function DueForm({ mid, pid, onDone }: { mid: string; pid: string; onDone: () => void }) {
  const w = useWorld((x) => x);
  const cur = hd(w).due[keyOf(mid, pid)];
  const [date, setDate] = useState(cur?.date ?? '');
  const [what, setWhat] = useState(cur?.what ?? '');
  return (
    <form className="hd-dueform" onSubmit={(x) => { x.preventDefault(); if (!date) return; void runAction({ label: 'Due', act: { t: 'do', op: 'hd.due.set', args: { mandateId: mid, personId: pid, date, what } } }); onDone(); }}>
      <div className="ds-field"><label htmlFor="st-dd">Due date</label><input id="st-dd" type="date" className="ds-input" value={date} onChange={(x) => setDate(x.target.value)} required /></div>
      <div className="ds-field"><label htmlFor="st-dw">Next step</label><input id="st-dw" className="ds-input" value={what} onChange={(x) => setWhat(x.target.value)} placeholder="e.g. Book the technical interview" /></div>
      <div className="ds-actions"><button type="submit" className="ds-btn primary">Save due date</button><button type="button" className="ds-btn quiet" onClick={onDone}>Cancel</button></div>
    </form>
  );
}
