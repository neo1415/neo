// The cross-time-zone week (dataviz skill): an overview strip answers "which day has the most shared free
// time?" and a day chart answers "when exactly, and is it fair to London?". One time axis (Lagos), with
// London's clock shown as a second label row on the same scale, never a second scale.
// Marks: busy = muted ink bar; interview = solid ink with the candidate's name; hold = Q's gold, dashed;
// outside someone's working day = hatched; everyone free = gold wash (Q's computed overlap); Q's proposed
// times = numbered gold ticks. Every mark has a hover and keyboard tooltip; a table view carries every value.
import { useState } from 'react';
import { motion } from 'motion/react';
import type { World } from '../../mock/world';
import type { CalEvent } from '../../state/domain';
import { DUR, EASE } from '../../ds/motion';
import type { SlotProposal } from '../../state/areas/hire-c';
import { city, dateIn, evStatusLabel, firstOf, LAGOS, minsIn, offsetOf, tDay, tTime } from './lib';

const A0 = 8 * 60, A1 = 19 * 60; // axis: 08:00–19:00 Lagos
const pct = (m: number) => `${((Math.min(A1, Math.max(A0, m)) - A0) / (A1 - A0)) * 100}%`;
const wid = (a: number, b: number) => `${((Math.min(A1, b) - Math.max(A0, a)) / (A1 - A0)) * 100}%`;
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

interface Member { id: string; first: string; timezone: string }
interface Block { e: CalEvent; a: number; b: number }

function dayModel(date: string, mem: Member[], events: CalEvent[], win: [number, number]) {
  const iso = `${date}T12:00:00Z`;
  const rows = mem.map((m) => {
    const off = (offsetOf(iso, m.timezone) - offsetOf(iso, LAGOS)); // minutes relative to Lagos
    const blocks: Block[] = events.filter((e) => e.attendees.includes(m.id) && dateIn(e.start, LAGOS) === date)
      .map((e) => ({ e, a: minsIn(e.start, LAGOS), b: minsIn(e.end, LAGOS) || 24 * 60 })).sort((x, y) => x.a - y.a);
    // Working day 09:00–18:00 in their own zone, expressed in Lagos minutes.
    return { m, blocks, work: [9 * 60 - off, 18 * 60 - off] as [number, number] };
  });
  const free: [number, number][] = [];
  for (let t = win[0]; t < win[1]; t += 15) {
    const ok = rows.every((r) => t >= r.work[0] && t + 15 <= r.work[1] && !r.blocks.some((x) => x.a < t + 15 && t < x.b));
    if (!ok) continue;
    const l = free[free.length - 1];
    if (l && l[1] === t) l[1] = t + 15; else free.push([t, t + 15]);
  }
  return { rows, free, total: free.reduce((n, [a, b]) => n + (b - a), 0) };
}

export function WeekOverlap({ w, days, mem, events, win, prop }: { w: World; days: string[]; mem: Member[]; events: CalEvent[]; win: [number, number]; prop?: SlotProposal }) {
  const models = days.map((d) => ({ d, ...dayModel(d, mem, events, win) }));
  const best = models.reduce((x, y) => (y.total > x.total ? y : x), models[0]);
  const propDay = prop?.slots[0] ? dateIn(prop.slots[0].start, LAGOS) : undefined;
  const [day, setDay] = useState<string>(propDay && days.includes(propDay) ? propDay : best.d);
  const cur = models.find((x) => x.d === day) ?? models[0];
  const winLen = win[1] - win[0];
  const zones = [...new Set(mem.map((m) => m.timezone))].filter((tz) => tz !== LAGOS);
  const [tip, setTip] = useState<{ x: string; y: number; text: string } | null>(null);
  const show = (x: string, y: number, text: string) => ({ onPointerEnter: () => setTip({ x, y, text }), onPointerLeave: () => setTip(null), onFocus: () => setTip({ x, y, text }), onBlur: () => setTip(null), tabIndex: 0, 'aria-label': text, role: 'img' as const });
  const props = prop ? prop.slots.filter((s) => dateIn(s.start, LAGOS) === cur.d) : [];
  const ticks: number[] = []; for (let t = A0; t <= A1; t += 120) ticks.push(t);
  return (
    <div className="hc-wk">
      <div className="hc-wkstrip" role="group" aria-label="Shared free time per day, inside interview hours">
        {models.map((x) => (
          <button key={x.d} type="button" className="hc-wkday" aria-pressed={x.d === cur.d} onClick={() => setDay(x.d)}>
            <span className="hc-wkd"><span className="hc-wide">{tDay(`${x.d}T12:00:00Z`, LAGOS)}</span><span className="hc-narrow">{tDay(`${x.d}T12:00:00Z`, LAGOS).split(' ').slice(0, 2).join(' ')}</span></span>
            <span className="hc-meter" aria-hidden="true"><motion.span initial={{ width: 0 }} animate={{ width: `${(x.total / winLen) * 100}%`, transition: { duration: DUR.slow, ease: EASE.enter } }} /></span>
            <span className="t14 num">{x.total ? <>{dur(x.total)}<span className="hc-wide"> together</span></> : 'None'}</span>
          </button>
        ))}
      </div>
      <div className="hc-chart" aria-label={`${tDay(`${cur.d}T12:00:00Z`, LAGOS)}: everyone’s busy times, Lagos time`}>
        <div className="hc-chart-title">
          <b>{tDay(`${cur.d}T12:00:00Z`, LAGOS)}</b>
          <span className="t14 muted">{cur.free.length ? `Everyone free ${cur.free.map(([a, b]) => `${hm(a)}–${hm(b)}`).join(', ')} Lagos` : 'No time when everyone is free inside interview hours'}</span>
        </div>
        <div className="hc-grid">
          <span className="hc-axlab t14 muted">Lagos</span>
          <div className="hc-axis" aria-hidden="true">{ticks.map((t) => <span key={t} style={{ left: pct(t) }}>{hm(t)}</span>)}</div>
          {zones.map((tz) => { const off = offsetOf(`${cur.d}T12:00:00Z`, tz) - offsetOf(`${cur.d}T12:00:00Z`, LAGOS); return (
            <div key={tz} className="hc-row2" style={{ display: 'contents' }}>
              <span className="hc-axlab t14 muted">{city(tz)}</span>
              <div className="hc-axis sub" aria-hidden="true">{ticks.map((t) => <span key={t} style={{ left: pct(t) }}>{hm((t + off + 1440) % 1440)}</span>)}</div>
            </div>); })}
          {cur.rows.map((r, ri) => (
            <div key={r.m.id} style={{ display: 'contents' }}>
              <span className="hc-who"><b>{r.m.first}</b>{r.m.timezone !== LAGOS && <span className="t14 muted"> {city(r.m.timezone)}</span>}</span>
              <div className="hc-track">
                <span className="hc-win" style={{ left: pct(win[0]), width: wid(win[0], win[1]) }} aria-hidden="true" />
                {r.work[0] > A0 && <span className="hc-off" style={{ left: pct(A0), width: wid(A0, r.work[0]) }} {...show(pct(A0), ri, `${r.m.first}: before ${city(r.m.timezone)} working hours (until ${hm(r.work[0])} Lagos)`)} />}
                {r.work[1] < A1 && <span className="hc-off" style={{ left: pct(r.work[1]), width: wid(r.work[1], A1) }} {...show(pct(r.work[1]), ri, `${r.m.first}: after ${city(r.m.timezone)} working hours (from ${hm(r.work[1])} Lagos)`)} />}
                {r.blocks.map((x) => { const label = x.e.personId ? `${evStatusLabel[x.e.status]}: ${firstOf(w, x.e.personId)}` : 'Busy'; return (
                  <span key={x.e.id} className="hc-blk" data-s={x.e.personId || x.e.status === 'HOLD' ? x.e.status : 'BUSY'} style={{ left: pct(x.a), width: wid(x.a, x.b) }} {...show(pct(x.a), ri, `${r.m.first}, ${hm(x.a)}–${hm(x.b)} Lagos: ${label}`)}>
                    {x.e.personId && x.b - x.a >= 45 && <span className="hc-blk-l" aria-hidden="true">{firstOf(w, x.e.personId)}</span>}
                  </span>); })}
                {tip?.y === ri && <Tip x={tip.x} text={tip.text} />}
              </div>
            </div>
          ))}
          <span className="hc-who hc-all"><b><span className="hc-wide">Everyone</span><span className="hc-narrow">All</span></b></span>
          <div className="hc-track hc-alltrack">
            <span className="hc-win" style={{ left: pct(win[0]), width: wid(win[0], win[1]) }} aria-hidden="true" />
            {cur.free.map(([a, b]) => <span key={a} className="hc-free" style={{ left: pct(a), width: wid(a, b) }} {...show(pct(a), cur.rows.length, `Everyone free ${hm(a)}–${hm(b)} Lagos (${dur(b - a)})`)} />)}
            {props.map((s) => { const i = prop!.slots.indexOf(s); const a = minsIn(s.start, LAGOS); return <span key={s.start} className="hc-prop" style={{ left: pct(a), width: wid(a, a + 45) }} {...show(pct(a), cur.rows.length, `Q’s option ${i + 1}: ${hm(a)} Lagos, 45 minutes`)}><span aria-hidden="true">{i + 1}</span></span>; })}
            {tip?.y === cur.rows.length && <Tip x={tip.x} text={tip.text} />}
          </div>
        </div>
        <ul className="hc-legend" aria-label="Key">
          <li><span className="hc-sw" data-k="busy" />Busy</li>
          <li><span className="hc-sw" data-k="iv" />Interview</li>
          <li><span className="hc-sw" data-k="hold" />Hold</li>
          <li><span className="hc-sw" data-k="off" />Outside their working day</li>
          <li><span className="hc-sw" data-k="free" />Everyone free</li>
          {prop && <li><span className="hc-sw" data-k="prop" />Q’s proposed time</li>}
        </ul>
      </div>
      <details className="hc-disclose">
        <summary>Show the week as a table</summary>
        <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Busy and booked times, table"><table className="ds-table hc-week">
          <thead><tr><th scope="col">Person</th>{days.map((d) => <th key={d} scope="col">{tDay(`${d}T12:00:00Z`, LAGOS)}</th>)}</tr></thead>
          <tbody>{mem.map((m) => <tr key={m.id}><th scope="row">{m.first}<span className="t14 muted" style={{ display: 'block' }}>{city(m.timezone)}</span></th>
            {models.map((x) => { const r = x.rows.find((y) => y.m.id === m.id)!; return <td key={x.d}>{r.blocks.length ? <ul className="hc-blocks">{r.blocks.map((b) => <li key={b.e.id} data-s={b.e.status}>{tTime(b.e.start, LAGOS)}–{tTime(b.e.end, LAGOS)} <span className="t14">{b.e.personId ? `${evStatusLabel[b.e.status]}: ${firstOf(w, b.e.personId)}` : 'Busy'}</span></li>)}</ul> : <span className="t14 muted">Free</span>}</td>; })}</tr>)}
          <tr><th scope="row">Everyone free</th>{models.map((x) => <td key={x.d} className="t14">{x.free.map(([a, b]) => `${hm(a)}–${hm(b)}`).join(', ') || '—'}</td>)}</tr></tbody>
        </table></div>
      </details>
    </div>
  );
}

/** One tooltip, next to the mark, value first (dataviz interaction rules). Never the only way to a value. */
function Tip({ x, text }: { x: string; text: string }) {
  return <motion.span className="hc-tip" role="tooltip" aria-hidden="true" style={{ left: `min(${x}, calc(100% - 230px))` }} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DUR.fast } }}>{text}</motion.span>;
}
