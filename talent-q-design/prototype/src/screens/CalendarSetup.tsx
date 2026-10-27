// P7 · SC-149 OAuth permission details, SC-147 meeting preferences, SC-150/151 plan and slots,
// SC-154 confirmation and receipts, SC-155 collision recheck. Scheduling never reads event details.
import { useState } from 'react';
import { SCHEDULING_STATES } from '@contracts';
import { respond, useNamedRun, useRun } from '../mock/runtime';
import { log, now, uid, update, useWorld } from '../mock/world';
import { RunConversation } from '../q/RunConversation';
import { earliestFromMemory, startScheduling } from '../q/scripts';
import { slotScore } from '../q/slots';
import { Banner, Button, Label, Sheet, Sim, Switch, toast } from '../ui/kit';
import { ICal, ILock } from '../ui/icons';
import { Link } from '../ui/router';

export function CalendarSetup() {
  const w = useWorld((x) => x);
  const runId = useNamedRun('schedule');
  const view = useRun(runId, w.network);
  const [consent, setConsent] = useState(false);
  const ada = w.calendars.find((c) => c.personId === 'p_ada')!;
  const seyi = w.calendars.find((c) => c.personId === 'p_seyi')!;
  const connected = ada.health === 'CONNECTED_FREEBUSY_ONLY' || ada.health === 'CONNECTED_WRITE';
  const s = w.scheduling;
  const earliest = earliestFromMemory();
  const mem = w.memories.find((m) => m.memory_key === 'recruiter.meeting.window' && m.lifecycle_status === 'active');
  const chosen = s?.slots.find((x) => x.slotId === s.chosenSlotId);

  const setEarliest = (v: string) => update((d) => {
    const old = d.memories.find((m) => m.memory_key === 'recruiter.meeting.window' && m.lifecycle_status === 'active');
    if (!old || old.structured_value.earliestLocal === v) return;
    old.lifecycle_status = 'superseded';
    const id = uid('mem');
    d.memories.unshift({ ...old, memory_id: id, supersedes_id: old.memory_id, lifecycle_status: 'active', recorded_at: now(), last_confirmed_at: now(), write_mode: 'USER_CONFIRMED',
      content: `Ada takes interview calls after ${v} Lagos time, mornings first, never in the Tuesday review (13:00–15:00).`, structured_value: { ...old.structured_value, earliestLocal: v },
      source_refs: [{ kind: 'MESSAGE', ref: id, label: 'Your change on the calendar page', at: now() }, ...old.source_refs] });
    d.prefs.memoryId = id;
    log(d, 'You', `Changed your earliest interview time to ${v}`);
  });

  return (
    <main className="main stack gap-12">
      <header className="stack gap-3">
        <span className="t-label q-text">Calendar</span>
        <h1 className="t-display">Q finds times without seeing your meetings.</h1>
        <p className="t-lead muted measure">Q reads only when you’re busy, never what the meeting is. Candidates never see anything from your calendar.</p>
      </header>

      <section className="grid-2" aria-label="Calendar connections">
        <div className="panel stack gap-4">
          <div className="row gap-3"><ICal /><h2 className="t-title" style={{ fontSize: 18 }}>Your Google Calendar</h2></div>
          <p className="muted">{connected ? 'Connected for busy times only. Q will ask separately before it creates an event.' : ada.health === 'REVOKED' ? 'Access was removed. Q can’t check your times until you reconnect.' : 'Not connected.'}</p>
          <div className="row wrap gap-2">
            {connected ? <Button onClick={() => update((d) => { d.calendars.find((c) => c.personId === 'p_ada')!.health = 'REVOKED'; d.calendars.find((c) => c.personId === 'p_ada')!.scopes = []; log(d, 'You', 'Disconnected Google Calendar'); })}>Disconnect</Button>
              : <Button variant="primary" onClick={() => setConsent(true)}>Connect Google Calendar</Button>}
            <Sim>Simulated provider</Sim>
          </div>
        </div>
        <div className="panel stack gap-4">
          <div className="row gap-3"><ICal /><h2 className="t-title" style={{ fontSize: 18 }}>Seyi Balogun · Outlook</h2></div>
          <p className="muted">Hiring manager. Connected for busy times only{seyi.health === 'CONNECTED_FREEBUSY_ONLY' ? '' : ' (needs attention)'}. Different providers work together.</p>
          <Sim>Simulated provider</Sim>
        </div>
      </section>

      <section className="stack gap-6" aria-labelledby="prefs-h">
        <div className="row between wrap gap-3"><h2 id="prefs-h" className="t-heading">When you take interviews</h2><Link to="/r/memory">Why Q knows this</Link></div>
        {mem && <p className="muted measure">Q remembers this from {mem.source_refs[0].label}{mem.source_refs[0].quote ? <>: “{mem.source_refs[0].quote}”</> : '.'}</p>}
        <div className="grid-3">
          <div className="field"><label className="field-label" htmlFor="earliest">Earliest start</label>
            <select id="earliest" className="select" value={earliest} onChange={(e) => setEarliest(e.target.value)}>{['09:00', '09:30', '10:00', '10:30', '11:00'].map((t) => <option key={t}>{t}</option>)}</select>
            <span className="field-help">Changing this updates what Q remembers.</span></div>
          <div className="stack gap-1"><span className="field-label">Protected</span><span>Tuesday review, 13:00–15:00</span></div>
          <div className="stack gap-1"><span className="field-label">Length and buffer</span><span>{w.prefs.defaultDurationMinutes} min · {w.prefs.bufferMinutes} min either side</span></div>
        </div>
      </section>

      <section className="stack gap-6" aria-labelledby="sched-h">
        <div className="row between wrap gap-3">
          <h2 id="sched-h" className="t-heading">Interview with Tobi Adeyemi</h2>
          {(!s || ['FAILED', 'CANCELLED'].includes(s.state)) && <Button variant="primary" onClick={() => startScheduling('p_tobi')}>{s ? 'Try again' : 'Find times with Tobi'}</Button>}
        </div>
        {!connected && !s && <Banner tone="info" title="Connect your calendar first">Q needs your busy times. Without them it would have to guess, and it won’t.</Banner>}
        <RunConversation runId={runId} view={view} onRetry={() => startScheduling('p_tobi')} />

        {s && s.slots.length > 0 && !['BOOKED', 'REMINDERS', 'COMPLETED'].includes(s.state) && (
          <div className="paper panel stack gap-4">
            <Label as="h3">Times Q found · your time (Lagos) and Tobi’s</Label>
            <ul className="stack">
              {s.slots.map((sl) => (
                <li key={sl.slotId} className="row wrap gap-4" style={{ padding: '12px 0', borderTop: '1px solid var(--color-line)' }}>
                  <span className="grow" style={{ fontWeight: 500 }}>{sl.recruiterLocal}</span>
                  <span className="t-caption">Tobi: {sl.candidateLocal}</span>
                  <details><summary className="t-caption" style={{ cursor: 'pointer' }}>Why this time · {slotScore(sl)}</summary>
                    <ul className="t-caption" style={{ marginTop: 6 }}>
                      <li>Your preference (mornings): {sl.terms.availabilityPreference}</li><li>Fair to Tobi’s day: {sl.terms.timezoneFairness}</li>
                      <li>Notice: {sl.terms.leadTime}</li><li>Spread across the week: {sl.terms.panelLoadBalance}</li></ul></details>
                </li>
              ))}
            </ul>
            {view.pendingApproval === 'prop_send_slots' && runId && (
              <div className="row wrap gap-3"><Button variant="primary" onClick={() => respond(runId, 'prop_send_slots', 'APPROVED')}>Send these times to Tobi</Button><Button variant="quiet" onClick={() => respond(runId, 'prop_send_slots', 'REJECTED')}>Not now</Button></div>
            )}
            {s.state === 'AWAITING_CANDIDATE' && <p className="muted">Sent. Waiting for Tobi to choose. <Link to="/c/slots">See it as Tobi</Link></p>}
          </div>
        )}

        {s?.state === 'CANDIDATE_COUNTERPROPOSES' && (
          <Banner tone="info" title="Tobi suggested another time" action={<Button compact onClick={() => { update((d) => { d.scheduling!.state = 'AWAITING_CANDIDATE'; d.chat.candidate.push({ id: uid('m'), who: 'q', text: 'Ada can’t do that time, but the other times still stand.', at: now() }); }); toast('Told Tobi the original times still stand.'); }}>Keep the offered times</Button>}>
            “{s.counterProposal?.text}” Q checks a suggested time against everyone’s busy times before it offers it.
          </Banner>
        )}

        {chosen && s && ['BOOKED', 'REMINDERS', 'COMPLETED'].includes(s.state) && w.bookingReceipt && (
          <div className="panel stack gap-3">
            <div className="row gap-3 wrap"><ILock /><h3 className="t-title" style={{ fontSize: 18 }}>Booked: {chosen.recruiterLocal} (Lagos)</h3><Sim>Simulated receipt</Sim></div>
            <p className="muted">Tobi sees {chosen.candidateLocal}. Reminders go out 24 hours and 1 hour before.</p>
            <p className="t-mono subtle">Event {w.bookingReceipt.eventId} · etag {w.bookingReceipt.etag} · {w.bookingReceipt.idempotencyKey}</p>
          </div>
        )}

        {s && (
          <details>
            <summary className="t-label" style={{ cursor: 'pointer' }}>Scheduling record · {s.history.length} steps</summary>
            <ol className="stack gap-2" style={{ marginTop: 12 }}>
              {s.history.map((h, i) => <li key={i} className="row gap-4 wrap"><span className="t-mono subtle" style={{ width: 210 }}>{h.state}</span><span className="t-caption">{h.note}</span></li>)}
            </ol>
            <p className="t-caption" style={{ marginTop: 8 }}>{SCHEDULING_STATES.length} possible states. A chosen time counts as booked only after the calendar confirms.</p>
          </details>
        )}

        <Switch label="Test: make the first offered time busy before it’s booked" help="Shows how Q handles a calendar that changes after times are offered." checked={w.scenarios.slotTakenAfterProposal} onChange={(v) => update((d) => { d.scenarios.slotTakenAfterProposal = v; })} />
      </section>

      <Sheet open={consent} onClose={() => setConsent(false)} title="Connect Google Calendar" side="center">
        <div className="stack gap-5">
          <p>Q is asking for one permission now:</p>
          <ul className="stack gap-3">
            <li className="row gap-3"><span className="ev" data-state="EVIDENCED"><span aria-hidden="true">✓</span></span><span><strong style={{ fontWeight: 600 }}>See when you’re busy.</strong> Times only, not titles, people or notes.</span></li>
            <li className="row gap-3 muted"><span aria-hidden="true">·</span><span>Creating interview events is a separate permission. Q asks for it the first time a candidate chooses a time.</span></li>
          </ul>
          <p className="t-caption">You can disconnect at any time. Q then stops checking immediately. <Sim>Simulated consent screen</Sim></p>
          <div className="row gap-3"><Button variant="primary" onClick={() => { update((d) => { const c = d.calendars.find((x) => x.personId === 'p_ada')!; c.health = 'CONNECTED_FREEBUSY_ONLY'; c.scopes = ['freebusy.read']; c.checkedAt = now(); log(d, 'You', 'Connected Google Calendar (busy times only)'); }); setConsent(false); toast('Google Calendar connected for busy times only.'); }}>Allow busy times</Button><Button variant="quiet" onClick={() => setConsent(false)}>Cancel</Button></div>
        </div>
      </Sheet>
    </main>
  );
}
