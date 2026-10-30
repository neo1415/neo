// SC-053 Calendar booking (/r/calendar/book/:personId; extends /r/calendar and reuses hire-c's scheduling: findSlots
// across time zones, busy times only, the week chart, holds, the invitation draft, checks and approval).
// Mutual slot selection: the team's free times inside interview hours, marked by whether they fit what the candidate
// said. Collisions are listed with who is busy. Booking is honest: a hold blocks the panel's time (simulated); the
// candidate is told nothing until a person approves the invitation; "booked" only after they confirm.
import { useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, personOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { arrive } from '../../ds/motion';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hd, type Format } from '../../state/areas/hire-d';
import { hc } from '../../state/areas/hire-c';
import { CAN_MOVE, CAN_SEND, city, defaultPanel, entryFor, evStatusLabel, findMsg, firstOf, interviewHours, LAGOS, latestV, listNames, mandateTitle, msgStatusLabel, nextWeek, orgMembers, tDay, tTime, tzOf } from '../hire-c/lib';
import { WeekOverlap } from '../hire-c/WeekOverlap';
import { availOf, bookingSlots, collisions, FORMAT_WORD, type BookSlot } from './model';
import { DeliveryRail } from './Delivery';

const FORMATS: Format[] = ['VIDEO', 'PHONE', 'ONSITE'];

export function Booking({ pid }: { pid: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const p = personOf(w, pid);
  const entry = p ? entryFor(w, pid, a.orgId) : undefined;
  const [panel, setPanel] = useState<string[] | null>(null);
  const [showOther, setShowOther] = useState(false);
  if (!p || !entry || !a.orgId) return (
    <Canvas title="Book an interview" kicker="Calendar" open onClose={() => {}}>
      <section className="ds-sheet hd-empty" role="alert"><b>{p ? `${p.name.split(' ')[0]} isn’t in your organisation’s pipeline.` : 'No one to book.'}</b><span className="t14 muted">You can only book interviews for people in your own roles. Nothing about them is shown here.</span><Link to="/r/calendar" className="ds-btn">Back to the calendar</Link></section>
    </Canvas>
  );
  const f = p.name.split(' ')[0];
  const team = panel ?? defaultPanel(w, a, entry.mandateId);
  const fmt = hd(w).formats[pid] ?? 'VIDEO';
  const av = availOf(w, pid);
  const slots = bookingSlots(w, a, pid, team);
  const fit = slots.filter((s) => s.fits !== false); const other = slots.filter((s) => s.fits === false);
  const days = nextWeek(w);
  const coll = collisions(w, team, pid, days);
  const mem = orgMembers(w, a.orgId).filter((m) => m.role !== 'VIEWER');
  const booking = [...hd(w).bookings].reverse().find((b) => b.personId === pid && b.orgId === a.orgId);
  const canHold = CAN_MOVE.includes(a.role ?? 'VIEWER');
  const tz = tzOf(w, pid);
  const prop = { id: 'hd', personId: pid, panel: team, slots: fit.slice(0, 4), at: '', by: a.id, label: 'Mutual times', kind: 'INVITE' as const };
  const win = interviewHours(w, a.orgId);
  return (
    <Canvas title={`Book an interview with ${f}`} kicker={`${mandateTitle(w, entry.mandateId)} · next week`} open onClose={() => {}} qLine={booking ? 'Hold placed. The invitation waits for a yes.' : `${fit.length} mutual time${fit.length === 1 ? '' : 's'} next week.`}
      aside={<Link to="/r/calendar" className="ds-btn quiet">Calendar</Link>}>
      {booking && <BookingStatus id={booking.id} />}
      <section className="ds-sheet hd-sec" aria-labelledby="bk-set">
        <div className="hd-head"><h2 id="bk-set" className="voice t24">Panel and format</h2><span className="t14 muted">{f} is in {city(tz)}{tz !== LAGOS ? ` (${tTime(`${days[0]}T12:00:00Z`, tz)} when it’s ${tTime(`${days[0]}T12:00:00Z`, LAGOS)} in Lagos)` : ', same time as Lagos'}</span></div>
        <fieldset className="hd-fs"><legend className="lab">Panel</legend>
          <div className="hd-chips">{mem.map((m) => <button key={m.id} type="button" className="ds-filter" aria-pressed={team.includes(m.id)} onClick={() => setPanel(team.includes(m.id) ? team.filter((x) => x !== m.id) : [...team, m.id])}>{m.first}{m.timezone !== LAGOS ? ` (${city(m.timezone)})` : ''}</button>)}</div>
        </fieldset>
        <fieldset className="hd-fs"><legend className="lab">Interview format</legend>
          <div className="hd-chips" role="radiogroup" aria-label="Interview format">{FORMATS.map((x) => <button key={x} type="button" role="radio" aria-checked={fmt === x} className="ds-filter" onClick={() => void runAction({ label: 'Format', act: { t: 'do', op: 'hd.book.format', args: { personId: pid, format: x } } })}>{FORMAT_WORD[x]}</button>)}</div>
          {fmt === 'ONSITE' && !/lagos/i.test(p.location) && <p className="t14 hd-warn" style={{ margin: 0 }}>{f} is in {p.location}. Ask before inviting them to travel; a video call may be fairer.</p>}
        </fieldset>
        <p className="t14" style={{ margin: 0 }}><span className="lab">What {f} said</span> {av ? `“${av.text}” (from their reply, ${tDay(av.sharedAt, LAGOS)})` : `${f} hasn’t said when suits. Offer two times and let them choose.`}</p>
      </section>
      <section className="ds-sheet hd-sec" aria-labelledby="bk-times">
        <div className="hd-head"><h2 id="bk-times" className="voice t24">Times that work for both sides</h2><span className="t14 muted">45 min · inside {String(win[0] / 60).padStart(2, '0')}:00–{String(win[1] / 60).padStart(2, '0')}:00 Lagos and everyone’s working day</span></div>
        {!team.length ? <div className="hd-empty"><b>Pick at least one person for the panel.</b></div> : !slots.length ? <div className="hd-empty"><b>No shared free time next week.</b><span className="t14 muted">Try a smaller panel, or ask Q to look at the week after.</span></div> : (
          <>
            {!fit.length && <div className="hd-empty"><b>Nothing next week fits what {f} said.</b><span className="t14 muted">The team’s free times are below; ask {f} whether one could work.</span></div>}
            <ol className="hd-slots">{fit.slice(0, 6).map((s, i) => <SlotRow key={s.start} s={s} i={i} pid={pid} team={team} fmt={fmt} canHold={canHold} held={!!booking} />)}</ol>
            {other.length > 0 && <button type="button" className="ds-btn quiet" aria-expanded={showOther} onClick={() => setShowOther(!showOther)}>{showOther ? 'Hide' : 'Show'} {other.length} team-free time{other.length === 1 ? '' : 's'} outside what {f} said</button>}
            {showOther && <ol className="hd-slots">{other.slice(0, 6).map((s, i) => <SlotRow key={s.start} s={s} i={i + fit.length} pid={pid} team={team} fmt={fmt} canHold={canHold} held={!!booking} />)}</ol>}
          </>
        )}
      </section>
      <section className="ds-sheet hd-sec" aria-labelledby="bk-coll">
        <div className="hd-head"><h2 id="bk-coll" className="voice t24">Ruled out</h2><span className="t14 muted">{coll.length} time{coll.length === 1 ? '' : 's'} on the hour with someone busy</span></div>
        {coll.length ? <ul className="hd-list hd-coll">{coll.slice(0, 8).map((c) => <li key={c.start} className="hd-row"><span className="num">{tDay(c.start, LAGOS)} {tTime(c.start, LAGOS)}</span><span className="t14">{listNames(c.who.map((x) => firstOf(w, x)))} busy</span></li>)}</ul> : <p className="t14 muted" style={{ margin: 0 }}>No collisions on the hour next week.</p>}
        {coll.length > 8 && <p className="t14 muted" style={{ margin: 0 }}>And {coll.length - 8} more. The chart below shows the whole week.</p>}
      </section>
      <section className="ds-sheet hd-sec" aria-labelledby="bk-wk">
        <div className="hd-head"><h2 id="bk-wk" className="voice t24">The week</h2><span className="t14 muted">Busy times only; Q never reads what a meeting is</span></div>
        <WeekOverlap w={w} days={days} mem={mem.filter((m) => team.includes(m.id))} events={w.calendar.filter((e) => e.orgId === a.orgId && e.status !== 'CANCELLED')} win={win} prop={prop} />
      </section>
    </Canvas>
  );
}

function SlotRow({ s, i, pid, team, fmt, canHold, held }: { s: BookSlot; i: number; pid: string; team: string[]; fmt: Format; canHold: boolean; held: boolean }) {
  const w = useWorld((x) => x);
  const others = s.notes.filter((n) => n.tz !== LAGOS);
  return (
    <li className="hd-slot" data-fits={s.fits === null ? 'unknown' : s.fits ? 'yes' : 'no'}>
      <span className="hd-opt num" aria-hidden="true">{i + 1}</span>
      <span className="hd-rowmain"><b className="num">{tDay(s.start, LAGOS)}, {tTime(s.start, LAGOS)} Lagos</b>
        <span className="t14 muted">{others.length ? others.map((n) => `${n.name} ${n.local} ${city(n.tz)}`).join(' · ') : 'Everyone on Lagos time'}{s.fits === true ? ` · fits what ${firstOf(w, pid)} said` : s.fits === null ? ` · ${firstOf(w, pid)} hasn’t said` : ''}</span></span>
      {canHold && !held && <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Hold', act: { t: 'do', op: 'hd.book', args: { personId: pid, start: s.start, end: s.end, panel: team, format: fmt } } })}>Hold and draft<span className="sr"> option {i + 1}, {tDay(s.start, LAGOS)} {tTime(s.start, LAGOS)}</span></button>}
    </li>
  );
}

function BookingStatus({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const b = hd(w).bookings.find((x) => x.id === id)!;
  const f = firstOf(w, b.personId);
  const ev = w.calendar.find((e) => e.id === b.holdId) ?? w.calendar.find((e) => e.personId === b.personId && e.orgId === b.orgId && e.status !== 'CANCELLED');
  const m = findMsg(w, b.msgId)?.m; const d = hc(w).drafts[b.msgId];
  const sent = m?.status === 'SENT_SIMULATED';
  const ready = m?.status === 'AWAITING_APPROVAL' && d && d.checkedV === latestV(d).v;
  const step = !sent ? 'held' : ev?.status === 'CONFIRMED' ? 'booked' : 'invited';
  return (
    <motion.section className="ds-sheet hd-sec hd-bookstatus" aria-labelledby="bk-st" data-step={step} {...arrive}>
      <div className="hd-head"><h2 id="bk-st" className="voice t24">{step === 'booked' ? `Booked: ${f} confirmed` : step === 'invited' ? `Invited: waiting for ${f} to confirm` : 'Held for your team, not booked yet'}</h2>{ev && <span className="hc-status" data-s={ev.status}>{evStatusLabel[ev.status]}</span>}</div>
      <p style={{ margin: 0 }}><b className="num">{tDay(b.slot.start, LAGOS)}, {tTime(b.slot.start, LAGOS)} Lagos</b> · {FORMAT_WORD[b.format]} · Panel: {listNames(b.panel.map((x) => firstOf(w, x)))}{tzOf(w, b.personId) !== LAGOS ? ` · ${tTime(b.slot.start, tzOf(w, b.personId))} for ${f} in ${city(tzOf(w, b.personId))}` : ''}</p>
      <p className="t14 muted" style={{ margin: 0 }}>{step === 'held' ? `The hold is on your panel’s calendars only (simulated). ${f} hasn’t been told anything.` : step === 'invited' ? `Invitation approved and handed to the provider (simulated). It counts as booked only when ${f} confirms.` : `${f} confirmed. Reminders follow ${f}’s own notification choices.`}</p>
      <p className="t14" style={{ margin: 0 }}><span className="lab">Invitation</span> {m ? msgStatusLabel[m.status] : 'Gone'}{d ? ` · v${latestV(d).v}` : ''}</p>
      {sent && <DeliveryRail msgId={b.msgId} testing />}
      <div className="ds-actions">
        {m && (m.status === 'DRAFT' || (m.status === 'AWAITING_APPROVAL' && !ready)) && <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Check', act: { t: 'do', op: 'hire-c.check', args: { msgId: b.msgId } } })}>Check the invitation</button>}
        {ready && CAN_SEND.includes(a.role ?? 'VIEWER') && <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Approve', act: { t: 'do', op: 'hire-c.approve', args: { msgId: b.msgId, v: latestV(d!).v } } })}>Approve and send v{latestV(d!).v}</button>}
        {m && <button type="button" className="ds-btn quiet" onClick={() => void runAction({ label: 'Open', act: { t: 'do', op: 'hire-c.openMsg', args: { msgId: b.msgId } } })}>Open in Messages</button>}
        {sent && <Link to="/r/reminders" className="ds-btn quiet">Reminders</Link>}
      </div>
    </motion.section>
  );
}
