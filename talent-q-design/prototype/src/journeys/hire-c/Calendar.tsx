// /r/calendar: next week for the hiring team across Lagos and London (busy/free only), holds, invitations,
// confirmations and requests to move, interview panels with who changed them, and a test switch for
// "the proposed time is taken before it's sent".
// Design pass: the week is a chart (WeekOverlap) instead of a text table; Q's proposals sit above it with
// one action per row; requests to move lead the bookings list because they need someone.
import { useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, emit, personOf, update, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { arrive } from '../../ds/motion';
import { SwitchRow } from '../../ds/Switch';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hc } from '../../state/areas/hire-c';
import { CAN_MOVE, city, evStatusLabel, firstOf, interviewHours, LAGOS, listNames, nameOf, nextWeek, orgMembers, tDay, tTime, tzNote, whenText } from './lib';
import { WeekOverlap } from './WeekOverlap';

const ORDER: Record<string, number> = { RESCHEDULE_REQUESTED: 0, HOLD: 1, INVITED: 2, CONFIRMED: 3 };

export function Calendar() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const days = nextWeek(w);
  const mem = orgMembers(w, a.orgId).filter((m) => m.role !== 'VIEWER');
  const win = interviewHours(w, a.orgId);
  const mine = w.calendar.filter((e) => e.orgId === a.orgId && e.status !== 'CANCELLED');
  const events = mine.filter((e) => e.status === 'HOLD' || e.personId).sort((x, y) => (ORDER[x.status] ?? 9) - (ORDER[y.status] ?? 9) || x.start.localeCompare(y.start));
  const prop = hc(w).proposals[a.id];
  const ivs = w.interviews.filter((i) => i.orgId === a.orgId && i.status !== 'CANCELLED');
  const changes = hc(w).panelChanges;
  const can = CAN_MOVE.includes(a.role ?? 'VIEWER');
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const abroad = mem.filter((m) => m.timezone !== LAGOS);
  const asks = events.filter((e) => e.status === 'RESCHEDULE_REQUESTED').length;
  return (
    <Canvas title="Calendar" kicker="Next week · Lagos and London" open onClose={() => {}} aside={<Link to="/r/calendar/connect" className="ds-btn">Calendar connections</Link>}>
      {asks > 0 && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">↻</span><span><b>{asks === 1 ? 'A candidate has' : `${asks} candidates have`} asked to move an interview.</b> Their current time stays held until you send a new one.</span><span /></div>}
      {prop && (
        <motion.section className="ds-sheet hc-propsec" aria-labelledby="pr-h" {...arrive}>
          {/* MO-042: a proposal arriving is orientation motion (rise and fade, 200 ms). */}
          <div className="hc-sec-head"><h2 id="pr-h" className="voice t24" style={{ margin: 0 }}>Times for {nameOf(w, prop.personId)}</h2><span className="t14 muted">Q’s search · {prop.label} · 45 min</span></div>
          <ol className="hc-proplist">
            {prop.slots.map((s, i) => (
              <li key={s.start}>
                <span className="hc-opt" aria-hidden="true">{i + 1}</span>
                <span className="hc-propwhen"><b>{tDay(s.start, LAGOS)}, {tTime(s.start, LAGOS)}</b><span className="t14 muted">{s.notes.filter((n) => n.tz !== LAGOS).map((n) => `${n.name} ${n.local} ${city(n.tz)}`).join(' · ') || 'Everyone in Lagos time'}</span></span>
                <span className="ds-actions">
                  <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Hold', act: { t: 'do', op: 'hire-c.useSlot', args: { i, mode: 'hold' } } })}>Hold<span className="sr"> option {i + 1}</span></button>
                  <button type="button" className="ds-btn quiet" onClick={() => void runAction({ label: 'Draft', act: { t: 'do', op: 'hire-c.useSlot', args: { i, mode: 'draft' } } })}>Draft invitation<span className="sr"> for option {i + 1}</span></button>
                </span>
              </li>
            ))}
          </ol>
        </motion.section>
      )}
      <section className="ds-sheet hc-wksec" aria-labelledby="wk-h">
        <div className="hc-sec-head">
          <h2 id="wk-h" className="voice t24" style={{ margin: 0 }}>When the team is free</h2>
          <span className="t14 muted">Interview hours {fmt(win[0])}–{fmt(win[1])} Lagos{abroad.length ? ` · ${abroad.map((m) => `${m.first} is in ${city(m.timezone)}, ${tzNote(m.timezone, `${days[0]}T12:00:00Z`)}`).join(' · ')}` : ''}</span>
        </div>
        <WeekOverlap w={w} days={days} mem={mem} events={mine} win={win} prop={prop} />
        <p className="t14 muted" style={{ margin: 0 }}>Busy times come from connected calendars as times only; Q never reads what a meeting is. Q offers only times inside everyone’s 09:00–18:00 working day.</p>
      </section>
      <section className="ds-sheet" aria-labelledby="ev-h" style={{ display: 'grid', gap: 12 }}>
        <div className="hc-sec-head"><h2 id="ev-h" className="voice t24" style={{ margin: 0 }}>Interviews and holds</h2><span className="t14 muted">{events.length ? `${events.length} booked or held` : ''}</span></div>
        {!events.length && <div className="hc-empty"><b>Nothing booked yet.</b><span className="t14 muted">Ask Q: “find a time for Tobi with Seyi and Musa next week”. Holds block the time for your team only.</span></div>}
        <ul className="hc-events">
          {events.map((e) => { const iv = ivs.find((i) => i.eventId === e.id); const pc = iv ? changes.filter((x) => x.interviewId === iv.id) : []; const p = e.personId ? personOf(w, e.personId) : undefined; const panel = iv ? iv.panel : e.attendees.filter((x) => !x.startsWith('p_')); return (
            <li key={e.id} data-s={e.status}>
              <div className="hc-ev-when"><b className="num">{tDay(e.start, LAGOS)}</b><span className="num">{tTime(e.start, LAGOS)}–{tTime(e.end, LAGOS)}</span></div>
              <div className="hc-ev-main">
                <div className="hc-msg-head"><b>{p ? p.name : e.title}</b><span className="hc-status" data-s={e.status}>{evStatusLabel[e.status]}</span></div>
                <span className="t14 muted">{whenText(w, e.start, [...e.attendees, ...(e.personId ? [e.personId] : [])]).replace(/^[^,]*, /, '')} · Panel: {listNames(panel.map((x) => firstOf(w, x)))}</span>
                {pc.map((x) => <span key={x.id} className="t14 hc-change">Panel changed by {firstOf(w, x.by)}, {tDay(x.at, LAGOS)}: {listNames(x.from.map((y) => firstOf(w, y)))} → {listNames(x.to.map((y) => firstOf(w, y)))}. {x.holds}</span>)}
                <div className="ds-actions">
                  {e.status === 'RESCHEDULE_REQUESTED' && p && <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Find', act: { t: 'say', text: `find a new time for ${p.name.split(' ')[0]}` } })}>Find a new time for {p.name.split(' ')[0]}</button>}
                  {iv && can && <PanelEditor ivId={iv.id} panel={iv.panel} />}
                  {e.status === 'HOLD' && can && <button type="button" className="ds-btn quiet" onClick={() => update((d) => { const x = d.calendar.find((y) => y.id === e.id); if (x) x.status = 'CANCELLED'; emit(d, a.id, 'calendar.hold.released', `ORG:${a.orgId}`, `${a.name} released a hold.`); })}>Release hold</button>}
                </div>
              </div>
            </li>); })}
        </ul>
      </section>
      <section className="ds-sheet hc-testing" aria-labelledby="ts-h">
        <h2 id="ts-h" className="lab" style={{ margin: 0 }}>Testing</h2>
        <SwitchRow label="Someone takes the proposed time before it’s sent" help="The next time Q checks a draft, one panel member’s calendar fills that slot. Q must notice and offer another time." on={w.scenarios.slotTakenAfterProposal} onChange={(v) => update((d) => { d.scenarios.slotTakenAfterProposal = v; })} />
      </section>
    </Canvas>
  );
}

function PanelEditor({ ivId, panel }: { ivId: string; panel: string[] }) {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>(panel);
  const pool = orgMembers(w, a.orgId).filter((m) => m.role !== 'VIEWER');
  if (!open) return <button type="button" className="ds-btn quiet" onClick={() => { setSel(panel); setOpen(true); }}>Change panel</button>;
  return (
    <fieldset className="hc-fs hc-panelfs"><legend className="t14"><b>Who’s on the panel</b></legend>
      <div className="hc-filters">{pool.map((m) => <button key={m.id} type="button" className="ds-filter" aria-pressed={sel.includes(m.id)} onClick={() => setSel(sel.includes(m.id) ? sel.filter((x) => x !== m.id) : [...sel, m.id])}>{m.first}{m.timezone !== LAGOS ? ` (${city(m.timezone)})` : ''}</button>)}</div>
      <div className="ds-actions"><button type="button" className="ds-btn primary" disabled={!sel.length} onClick={() => { void runAction({ label: 'Save panel', act: { t: 'do', op: 'hire-c.panelSet', args: { interviewId: ivId, panel: sel } } }); setOpen(false); }}>Save and re-check holds</button><button type="button" className="ds-btn quiet" onClick={() => setOpen(false)}>Cancel</button></div>
    </fieldset>
  );
}
