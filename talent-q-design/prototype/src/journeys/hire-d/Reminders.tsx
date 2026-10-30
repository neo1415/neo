// SC-159 Interview reminder and follow-up queue (/r/reminders; reads the calendar, process commitments, consents and
// suppressions every render, so the queue is never a stale copy). Each item shows its delivery plan (channel, time,
// the candidate's own choices), its time limits (08:00–20:00 their time, not within 2 hours, one per interview) and
// its state: suggested → approved (scheduled) → sent (accepted) → delivered → read, or stopped with the reason.
// /c/reminders is the candidate's side: they choose channels and can turn reminders off, and the queue obeys.
import { actorOf, orgOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { SwitchRow } from '../../ds/Switch';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hd } from '../../state/areas/hire-d';
import { CAN_SEND, city, firstOf, LAGOS, tDay, tTime, tzOf } from '../hire-c/lib';
import { allowedChannels, CH_WORD, reminderQueue, type QueueItem } from './model';
import { DeliveryRail } from './Delivery';

const act = (op: string, args: Record<string, unknown>) => void runAction({ label: op, act: { t: 'do', op, args } });
const KIND_WORD = { CONFIRM_FOLLOWUP: 'Follow-up', INTERVIEW_24H: 'Reminder', COMMITMENT_UPDATE: 'Promised update' } as const;

export function Reminders() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  if (!a.orgId) return <Canvas title="Reminders" kicker="Hiring" open onClose={() => {}}><section className="ds-sheet hd-empty"><b>Join an organisation to see reminders.</b></section></Canvas>;
  const q = reminderQueue(w, a.orgId);
  const todo = q.filter((x) => !x.decision && !x.blocked);
  const sched = q.filter((x) => x.decision?.state === 'SCHEDULED');
  const done = hd(w).reminders.filter((r) => r.orgId === a.orgId && r.state !== 'SCHEDULED');
  const blocked = q.filter((x) => !x.decision && x.blocked);
  const approver = CAN_SEND.includes(a.role ?? 'VIEWER');
  return (
    <Canvas title="Reminders and follow-ups" kicker={`${orgOf(w, a.orgId)?.name} · interviews and promises`} open onClose={() => {}} qLine={todo.length ? `${todo.length} waiting for your yes.` : 'Nothing waiting for approval.'}
      aside={<Link to="/r/calendar" className="ds-btn quiet">Calendar</Link>}>
      {!approver && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>You can see the queue. An admin or recruiter approves what goes out.</span><span /></div>}
      <p className="t14 muted hd-rules" style={{ margin: 0 }}>Rules: nothing goes without a person’s yes; only on channels the candidate allows; between 08:00 and 20:00 their time; not within 2 hours of an interview; one reminder per interview and one follow-up per invitation. Everything is simulated.</p>
      <section className="ds-sheet hd-sec" aria-labelledby="rm-todo">
        <div className="hd-head"><h2 id="rm-todo" className="voice t24">Waiting for approval</h2><span className="t14 muted">{todo.length || 'None'}</span></div>
        {!todo.length ? <div className="hd-empty"><b>Nothing to approve.</b><span className="t14 muted">Reminders appear here when an interview is invited or confirmed, or when a promised update is due.</span></div>
          : <ul className="hd-list">{todo.map((it) => <Item key={it.id} it={it} approver={approver} />)}</ul>}
      </section>
      {sched.length > 0 && (
        <section className="ds-sheet hd-sec" aria-labelledby="rm-sched">
          <div className="hd-head"><h2 id="rm-sched" className="voice t24">Approved, not sent yet</h2><span className="t14 muted">Re-checked before sending</span></div>
          <ul className="hd-list">{sched.map((it) => <Item key={it.id} it={it} approver={approver} />)}</ul>
        </section>
      )}
      {done.length > 0 && (
        <section className="ds-sheet hd-sec" aria-labelledby="rm-done">
          <div className="hd-head"><h2 id="rm-done" className="voice t24">Sent or stopped</h2></div>
          <ul className="hd-list">{done.map((r) => (
            <li key={r.id} className="hd-row hd-col" data-rem={r.id} data-state={r.state}>
              <span className="hd-rowmain"><b>{KIND_WORD[r.kind]} to {firstOf(w, r.personId)}</b><span className="t14 muted">{r.state === 'SENT' ? `Sent by ${CH_WORD[r.channel]} (simulated), approved by ${firstOf(w, r.approvedBy)}` : `Stopped: ${r.reason}. Nothing was sent.`}</span></span>
              {r.msgId && <DeliveryRail msgId={r.msgId} testing />}
            </li>))}</ul>
        </section>
      )}
      {blocked.length > 0 && (
        <section className="ds-sheet hd-sec" aria-labelledby="rm-blk">
          <div className="hd-head"><h2 id="rm-blk" className="voice t24">Won’t send</h2><span className="t14 muted">The candidate’s choice or a time limit</span></div>
          <ul className="hd-list">{blocked.map((it) => <li key={it.id} className="hd-row" data-rem={it.id} data-state="BLOCKED"><span className="hd-rowmain"><b>{it.title}</b><span className="t14">{it.blocked}</span></span></li>)}</ul>
        </section>
      )}
    </Canvas>
  );
}

function Item({ it, approver }: { it: QueueItem; approver: boolean }) {
  const w = useWorld((x) => x);
  const f = firstOf(w, it.personId); const tz = tzOf(w, it.personId);
  const d = it.decision;
  const sendAt = d?.sendAt ?? it.sendAt;
  return (
    <li className="hd-row hd-col" data-rem={it.id} data-state={d?.state ?? 'SUGGESTED'}>
      <span className="hd-rowmain"><b>{it.title}</b><span className="t14 muted">{it.why}</span></span>
      <dl className="hd-facts">
        <div><dt>Plan</dt><dd>{d ? CH_WORD[d.channel] : it.channel ? CH_WORD[it.channel] : 'No channel'} · {tDay(sendAt, LAGOS)} {tTime(sendAt, LAGOS)} Lagos{tz !== LAGOS ? ` (${tTime(sendAt, tz)} ${city(tz)})` : ''}</dd></div>
        <div><dt>{f} allows</dt><dd>{it.channels.length ? it.channels.map((c) => CH_WORD[c]).join(', ') : 'Nothing'}{hd(w).optOut[it.personId] ? ' · reminders off' : ''}</dd></div>
        <div><dt>Limit</dt><dd>{it.kind === 'COMMITMENT_UPDATE' ? `Due ${it.due ? tDay(`${it.due}T12:00:00Z`, LAGOS) : ''}; factual update only, no decision` : it.kind === 'CONFIRM_FOLLOWUP' ? 'One follow-up per invitation' : 'One reminder, the day before'}</dd></div>
      </dl>
      {approver && <div className="ds-actions">
        {!d && <>
          <button type="button" className="ds-btn primary" onClick={() => act('hd.rem.approve', { id: it.id })}>Approve<span className="sr"> {it.title}</span></button>
          {it.channels.filter((c) => c !== it.channel).map((c) => <button key={c} type="button" className="ds-btn quiet" onClick={() => act('hd.rem.approve', { id: it.id, channel: c })}>Approve by {CH_WORD[c]}</button>)}
        </>}
        {d?.state === 'SCHEDULED' && <>
          <button type="button" className="ds-btn" onClick={() => act('hd.rem.send', { id: it.id })}>Send now<span className="sr"> {it.title}</span></button>
          <button type="button" className="ds-btn quiet" onClick={() => act('hd.rem.cancel', { id: it.id })}>Cancel</button>
        </>}
      </div>}
    </li>
  );
}

/** The candidate's own choices (their notification settings are the authoritative record the queue reads). */
export function CandidateReminders() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  if (!a.personId) return null;
  const n = w.consents[a.personId]?.notifications;
  const off = !!hd(w).optOut[a.personId];
  const ch = allowedChannels(w, a.personId);
  const next = w.calendar.filter((e) => e.personId === a.personId && e.status !== 'CANCELLED' && e.status !== 'HOLD').sort((x, y) => x.start.localeCompare(y.start));
  return (
    <Canvas title="Interview reminders" kicker="Your choices" open onClose={() => {}} qLine={off ? 'Reminders are off.' : `Reminders can reach you by ${ch.map((c) => CH_WORD[c]).join(', ') || 'nothing'}.`}>
      <section className="ds-sheet hd-sec" aria-labelledby="cr-h">
        <div className="hd-head"><h2 id="cr-h" className="voice t24">How employers may remind you</h2></div>
        <SwitchRow label="Interview reminders from employers" help="Off means no reminders or confirmation nudges. Employers can still answer you." on={!off} onChange={(v) => act('hd.optout', { on: !v })} />
        {n && <>
          <SwitchRow label="By email" on={n.email} onChange={(v) => act('hd.notify', { channel: 'email', on: v })} />
          <SwitchRow label="By text message" on={n.sms} onChange={(v) => act('hd.notify', { channel: 'sms', on: v })} />
          <SwitchRow label="In Talent Q" on={n.inApp} onChange={(v) => act('hd.notify', { channel: 'inApp', on: v })} />
        </>}
        <p className="t14 muted" style={{ margin: 0 }}>Never before 08:00 or after 20:00 your time. Employers see only that a channel is off, not why.</p>
      </section>
      <section className="ds-sheet hd-sec" aria-labelledby="cr-n">
        <div className="hd-head"><h2 id="cr-n" className="voice t24">Your interviews</h2></div>
        {next.length ? <ul className="hd-list">{next.map((e) => <li key={e.id} className="hd-row"><span className="hd-rowmain"><b>{orgOf(w, e.orgId)?.name}</b><span className="t14 muted">{tDay(e.start, tzOf(w, a.personId!))} {tTime(e.start, tzOf(w, a.personId!))} your time · {e.status === 'CONFIRMED' ? 'confirmed' : 'waiting for your answer'}</span></span></li>)}</ul> : <p className="t14 muted" style={{ margin: 0 }}>No interviews yet.</p>}
      </section>
    </Canvas>
  );
}
