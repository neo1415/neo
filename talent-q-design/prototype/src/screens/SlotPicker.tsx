// P8 · SC-153 Candidate time selection and counterproposal, SC-152 channel preference, SC-160 reschedule.
// Times shown in the candidate's own zone first. Choosing is not booking: we say "booked" only after the calendar confirms.
import { useState } from 'react';
import { log, setSchedulingState, update, useWorld } from '../mock/world';
import { commitBooking, counterpropose } from '../q/scripts';
import { Banner, Button, Choice, Label, QSays, Sim, TextArea, toast } from '../ui/kit';
import { QPresence } from '../q/QPresence';

export function SlotPicker() {
  const w = useWorld((x) => x);
  const s = w.scheduling;
  const [pick, setPick] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [suggest, setSuggest] = useState(false);
  const [text, setText] = useState('');
  const [taken, setTaken] = useState(false);
  const chosen = s?.slots.find((x) => x.slotId === s.chosenSlotId);
  const bookedStates = ['BOOKED', 'REMINDERS', 'COMPLETED'];
  const inProgress = s && ['CANDIDATE_ACCEPTS', 'AVAILABILITY_RECHECK', 'EVENT_WRITE', 'PROVIDER_ACK'].includes(s.state);
  const optedOut = w.activity.some((a) => a.text.startsWith('Tobi stopped'));

  const confirm = async () => {
    if (!pick) return;
    setBusy(true); setTaken(false);
    const r = await commitBooking(pick);
    setBusy(false);
    if (r === 'TAKEN') { setTaken(true); setPick(''); }
  };

  return (
    <main className="main stack gap-10" style={{ maxWidth: 720 }}>
      <div className="row gap-4">
        <QPresence state={busy || inProgress ? 'working' : s && bookedStates.includes(s.state) ? 'done' : s?.state === 'AWAITING_CANDIDATE' ? 'waiting' : 'idle'} size={48} progress={0.5} />
        <div className="stack"><span className="t-label q-text">Tobi Adeyemi · interviews</span><h1 className="t-heading">{s && bookedStates.includes(s.state) ? 'You’re booked.' : s?.state === 'AWAITING_CANDIDATE' ? 'Choose a time that suits you.' : 'No interview times yet.'}</h1></div>
      </div>

      {w.chat.candidate.length > 0 && <div className="stack gap-6">{w.chat.candidate.slice(-2).map((m) => <QSays key={m.id} text={m.text} />)}</div>}

      {optedOut && <Banner tone="info" title="You’ve stopped messages from Kora Pay">They can’t contact you about this role. You can change this at any time.</Banner>}

      {!s || ['DRAFT_REQUEST', 'POLICY_AND_CONSENT_CHECK', 'CALENDAR_CONNECTION_CHECK', 'AVAILABILITY_READ', 'SLOTS_CALCULATED', 'RECRUITER_CONFIRMATION'].includes(s.state) ? (
        <p className="muted">When Kora Pay offers times, they appear here and Q will let you know by email.</p>
      ) : null}

      {taken && <Banner tone="warn" title="That time was just taken">Someone on the panel became busy after the times were offered. It was never booked. The other times are still open.</Banner>}

      {s?.state === 'AWAITING_CANDIDATE' && (
        <form className="stack gap-6" onSubmit={(e) => { e.preventDefault(); confirm(); }}>
          <fieldset className="stack gap-2" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="t-label" style={{ marginBottom: 8 }}>Times in your time zone (Lagos) · 45 minutes · video</legend>
            {s.slots.map((sl) => <Choice key={sl.slotId} name="slot" value={sl.slotId} checked={pick === sl.slotId} onChange={setPick} title={sl.candidateLocal} detail={sl.dstNote} />)}
          </fieldset>
          <div className="row wrap gap-3">
            <Button type="submit" variant="primary" disabled={!pick || busy}>{busy ? 'Checking the time is still free…' : 'Choose this time'}</Button>
            <Button variant="secondary" onClick={() => setSuggest(true)}>None of these work</Button>
          </div>
          <p className="t-caption">Need text instead of video, or another adjustment? <button type="button" className="btn btn-quiet btn-compact" onClick={() => { update((d) => { d.scheduling!.mode = 'TEXT_ACCESSIBLE'; log(d, 'Candidate', 'Tobi asked for a text-based interview'); }); toast('Kora Pay will see you asked for a text interview.'); }}>Ask for a text interview</button></p>
        </form>
      )}

      {suggest && s?.state === 'AWAITING_CANDIDATE' && (
        <form className="stack gap-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { counterpropose(text.trim()); setSuggest(false); toast('Sent. Q will check it against the panel’s calendars.'); } }}>
          <TextArea label="When would work for you?" value={text} onChange={setText} rows={3} help="For example: Thursday after 3pm, or any morning next week." />
          <div className="row gap-3"><Button type="submit" variant="primary" disabled={!text.trim()}>Suggest this</Button><Button variant="quiet" onClick={() => setSuggest(false)}>Cancel</Button></div>
        </form>
      )}

      {s?.state === 'CANDIDATE_COUNTERPROPOSES' && <Banner tone="info" title="Suggestion sent">Kora Pay will reply here. Your original options stay available until they do.</Banner>}

      {inProgress && (
        <ol className="steps" aria-label="Booking progress" aria-live="polite">
          {[['AVAILABILITY_RECHECK', 'Checking the time is still free'], ['EVENT_WRITE', 'Adding it to the calendars'], ['PROVIDER_ACK', 'Waiting for the calendar to confirm']].map(([k, label]) => {
            const order = ['CANDIDATE_ACCEPTS', 'AVAILABILITY_RECHECK', 'EVENT_WRITE', 'PROVIDER_ACK'];
            const done = order.indexOf(s!.state) > order.indexOf(k);
            return <li key={k} className="step" data-result={done ? 'DONE' : s!.state === k ? 'RUNNING' : 'HELD'}><span className="step-mark" aria-hidden="true">{done ? '✓' : '·'}</span><span>{label}</span><span className="step-count">{done ? 'done' : s!.state === k ? 'now' : ''}</span></li>;
          })}
        </ol>
      )}

      {chosen && s && bookedStates.includes(s.state) && (
        <div className="panel stack gap-4">
          <Label as="h2">Confirmed</Label>
          <p className="t-title">{chosen.candidateLocal}</p>
          <p className="muted">With Ada Okafor and Seyi Balogun, Kora Pay. Video link: meet.example/kora-backend.</p>
          <p className="t-caption">The calendar confirmed this booking. <Sim>Simulated receipt</Sim></p>
          <div className="row wrap gap-3">
            <Button onClick={() => { update((d) => { setSchedulingState(d, 'RESCHEDULED', 'Tobi asked to reschedule; the event was cancelled (simulated)'); setSchedulingState(d, 'SLOTS_CALCULATED', 'Remaining offered times reopened'); setSchedulingState(d, 'AWAITING_CANDIDATE'); d.scheduling!.slots = d.scheduling!.slots.filter((x) => x.slotId !== d.scheduling!.chosenSlotId); d.scheduling!.chosenSlotId = undefined; d.bookingReceipt = null; log(d, 'Candidate', 'Tobi asked to reschedule'); }); }}>Reschedule</Button>
            <Button variant="quiet" onClick={() => toast('Calendar file downloaded (simulated).')}>Add to my calendar</Button>
          </div>
        </div>
      )}

      {s && (
        <details>
          <summary className="t-label" style={{ cursor: 'pointer' }}>How Kora Pay contacts you</summary>
          <div className="stack gap-3" style={{ marginTop: 12 }}>
            <p>Email, to the address on your profile. WhatsApp calls aren’t available for this company. SMS needs your opt-in.</p>
            <Button variant="danger" compact onClick={() => { update((d) => { log(d, 'Candidate', 'Tobi stopped messages from Kora Pay about this role'); }); toast('Kora Pay can no longer message you about this role.'); }}>Stop messages about this role</Button>
          </div>
        </details>
      )}
    </main>
  );
}
