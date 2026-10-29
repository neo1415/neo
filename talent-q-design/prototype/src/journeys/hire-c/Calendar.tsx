// /r/calendar: next week for the hiring team across Lagos and London (busy/free only), holds, invitations,
// confirmations and requests to move, interview panels with who changed them, and a test switch for
// "the proposed time is taken before it's sent".
import { useState } from 'react';
import { actorOf, emit, personOf, update, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hc } from '../../state/areas/hire-c';
import { CAN_MOVE, city, dateIn, evStatusLabel, firstOf, interviewHours, LAGOS, listNames, nameOf, nextWeek, orgMembers, tDay, tTime, tzNote } from './lib';

export function Calendar() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const days = nextWeek(w);
  const mem = orgMembers(w, a.orgId).filter((m) => m.role !== 'VIEWER');
  const [h0, h1] = interviewHours(w, a.orgId);
  const mine = w.calendar.filter((e) => e.orgId === a.orgId);
  const events = mine.filter((e) => e.status !== 'CANCELLED' && (e.status === 'HOLD' || e.personId)).sort((x, y) => x.start.localeCompare(y.start));
  const prop = hc(w).proposals[a.id];
  const ivs = w.interviews.filter((i) => i.orgId === a.orgId && i.status !== 'CANCELLED');
  const changes = hc(w).panelChanges;
  const can = CAN_MOVE.includes(a.role ?? 'VIEWER');
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return (
    <Canvas title="Next week across Lagos and London" kicker="Calendar · busy times only" open onClose={() => {}} aside={<Link to="/r/calendar/connect" className="ds-btn">Calendar connections</Link>}>
      <section className="ds-sheet" aria-labelledby="tz-h" style={{ display: 'grid', gap: 10 }}>
        <h2 id="tz-h" className="lab" style={{ margin: 0 }}>Who’s where</h2>
        <ul className="hc-zones">
          {mem.map((m) => <li key={m.id}><b>{m.first}</b> <span className="t14 muted">{city(m.timezone)}{m.timezone !== LAGOS ? ` · ${tzNote(m.timezone, `${days[0]}T12:00:00Z`)}` : ''}</span></li>)}
        </ul>
        <p className="t14 muted" style={{ margin: 0 }}>Interview hours: {fmt(h0)}–{fmt(h1)} Lagos (from the organisation’s guidelines). Q only offers times inside everyone’s working day, 09:00–18:00 local.</p>
      </section>
      {prop && (
        <section className="ds-sheet" aria-labelledby="pr-h" style={{ display: 'grid', gap: 8 }}>
          <h2 id="pr-h" className="lab" style={{ margin: 0 }}>Q’s proposed times for {nameOf(w, prop.personId)} · {prop.label}</h2>
          <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Calendar table, scrolls sideways"><table className="ds-table">
            <thead><tr><th scope="col">Day</th>{[...prop.panel, prop.personId].map((id) => <th key={id} scope="col">{firstOf(w, id)} <span className="t14 muted">({city(w.actors.find((x) => x.id === id && x.side === 'recruiter')?.timezone ?? personOf(w, id)?.timezone ?? LAGOS)})</span></th>)}<th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{prop.slots.map((s, i) => <tr key={s.start}><th scope="row">{tDay(s.start, LAGOS)}</th>{s.notes.map((n) => <td key={n.id} className="num">{n.local}</td>)}
              <td><div className="ds-actions"><button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Hold', act: { t: 'do', op: 'hire-c.useSlot', args: { i, mode: 'hold' } } })}>Hold</button><button type="button" className="ds-btn quiet" onClick={() => void runAction({ label: 'Draft', act: { t: 'do', op: 'hire-c.useSlot', args: { i, mode: 'draft' } } })}>Draft invitation</button></div></td></tr>)}</tbody>
          </table></div>
        </section>
      )}
      <section className="ds-sheet" aria-labelledby="wk-h" style={{ display: 'grid', gap: 8 }}>
        <h2 id="wk-h" className="lab" style={{ margin: 0 }}>Busy and booked, Mon {tDay(`${days[0]}T12:00:00Z`, LAGOS).split(' ').slice(1).join(' ')} – Fri (Lagos time)</h2>
        <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Calendar table, scrolls sideways"><table className="ds-table hc-week">
          <thead><tr><th scope="col">Person</th>{days.map((d) => <th key={d} scope="col">{tDay(`${d}T12:00:00Z`, LAGOS)}</th>)}</tr></thead>
          <tbody>{mem.map((m) => <tr key={m.id}><th scope="row">{m.first}<span className="t14 muted" style={{ display: 'block' }}>{city(m.timezone)}</span></th>
            {days.map((d) => { const evs = mine.filter((e) => e.status !== 'CANCELLED' && e.attendees.includes(m.id) && dateIn(e.start, LAGOS) === d).sort((x, y) => x.start.localeCompare(y.start)); return (
              <td key={d}>{evs.length ? <ul className="hc-blocks">{evs.map((e) => <li key={e.id} data-s={e.status}>{tTime(e.start, LAGOS)}–{tTime(e.end, LAGOS)} <span className="t14">{e.personId ? `${evStatusLabel[e.status]}: ${firstOf(w, e.personId)}` : 'Busy'}</span></li>)}</ul> : <span className="t14 muted">Free</span>}</td>); })}</tr>)}</tbody>
        </table></div>
        <p className="t14 muted" style={{ margin: 0 }}>“Busy” blocks come from connected calendars as times only; Q never reads what they are. <span className="ds-sim">Simulated</span></p>
      </section>
      <section className="ds-sheet" aria-labelledby="ev-h" style={{ display: 'grid', gap: 10 }}>
        <h2 id="ev-h" className="voice t24" style={{ margin: 0 }}>Interviews, holds and invitations</h2>
        {!events.length && <p style={{ margin: 0 }}>Nothing booked yet. Ask Q: “find a time for Tobi with Seyi and Musa next week”.</p>}
        <ul className="hc-events">
          {events.map((e) => { const iv = ivs.find((i) => i.eventId === e.id); const pc = iv ? changes.filter((x) => x.interviewId === iv.id) : []; const p = e.personId ? personOf(w, e.personId) : undefined; return (
            <li key={e.id}>
              <div className="hc-msg-head"><b>{p ? p.name : e.title}</b><span className="hc-status" data-s={e.status}>{evStatusLabel[e.status]}</span></div>
              <span className="t14">{tDay(e.start, LAGOS)}, {tTime(e.start, LAGOS)}–{tTime(e.end, LAGOS)} Lagos{[...new Set(e.attendees.map((x) => w.actors.find((y) => y.id === x)?.timezone ?? personOf(w, x)?.timezone ?? LAGOS))].filter((tz) => tz !== LAGOS).map((tz) => ` · ${tTime(e.start, tz)} ${city(tz)}`).join('')}</span>
              <span className="t14 muted">{iv ? `Panel: ${listNames(iv.panel.map((x) => nameOf(w, x)))}` : `With ${listNames(e.attendees.filter((x) => !x.startsWith('p_')).map((x) => firstOf(w, x)))}`}</span>
              {pc.map((x) => <span key={x.id} className="t14">Panel changed by {nameOf(w, x.by)}, {tDay(x.at, LAGOS)} {tTime(x.at, LAGOS)}: {listNames(x.from.map((y) => firstOf(w, y)))} → {listNames(x.to.map((y) => firstOf(w, y)))}. {x.holds}</span>)}
              {iv && can && <PanelEditor ivId={iv.id} panel={iv.panel} />}
              {e.status === 'HOLD' && can && <div className="ds-actions"><button type="button" className="ds-btn quiet" onClick={() => update((d) => { const x = d.calendar.find((y) => y.id === e.id); if (x) x.status = 'CANCELLED'; emit(d, a.id, 'calendar.hold.released', `ORG:${a.orgId}`, `${a.name} released a hold.`); })}>Release hold</button></div>}
              {e.status === 'RESCHEDULE_REQUESTED' && p && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Find', act: { t: 'say', text: `find a new time for ${p.name.split(' ')[0]}` } })}>Find a new time for {p.name.split(' ')[0]}</button></div>}
            </li>); })}
        </ul>
      </section>
      <section className="ds-sheet" aria-labelledby="ts-h" style={{ display: 'grid', gap: 8 }}>
        <h2 id="ts-h" className="lab" style={{ margin: 0 }}>Test the hard cases</h2>
        <button type="button" className="ds-opt" aria-pressed={w.scenarios.slotTakenAfterProposal} onClick={() => update((d) => { d.scenarios.slotTakenAfterProposal = !d.scenarios.slotTakenAfterProposal; })}>
          <span><b>Someone takes the proposed time before it’s sent</b><span className="t14 muted" style={{ display: 'block' }}>The next time Q checks a draft, one panel member’s calendar fills that slot. Q must notice and offer another time.</span></span>
        </button>
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
  if (!open) return <div className="ds-actions"><button type="button" className="ds-btn quiet" onClick={() => { setSel(panel); setOpen(true); }}>Change panel</button></div>;
  return (
    <fieldset className="hc-fs"><legend className="t14"><b>Panel</b></legend>
      <div className="hc-filters">{pool.map((m) => <button key={m.id} type="button" className="ds-filter" aria-pressed={sel.includes(m.id)} onClick={() => setSel(sel.includes(m.id) ? sel.filter((x) => x !== m.id) : [...sel, m.id])}>{m.first}</button>)}</div>
      <div className="ds-actions"><button type="button" className="ds-btn primary" disabled={!sel.length} onClick={() => { void runAction({ label: 'Save panel', act: { t: 'do', op: 'hire-c.panelSet', args: { interviewId: ivId, panel: sel } } }); setOpen(false); }}>Save panel</button><button type="button" className="ds-btn quiet" onClick={() => setOpen(false)}>Cancel</button></div>
    </fieldset>
  );
}
