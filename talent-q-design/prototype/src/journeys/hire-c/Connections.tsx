// /r/calendar/connect: whose calendar Q can read (busy times only), connecting yours with a clear one-permission
// consent step, and when you take interviews. Replaces the earlier calendar screen in the Direction D frame.
// Honest simulation: providers, consent and checks are simulated; Q never reads what a meeting is.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { actorOf, emit, log, now, orgOf, uid, update, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { arrive } from '../../ds/motion';
import { earliestFromMemory } from '../../q/scripts';
import { Link } from '../../ui/router';
import { city, LAGOS, orgMembers, tDay, tTime } from './lib';

/** The calendar records predate the actor ids; they are keyed p_<first name>. */
const calKey = (first: string) => `p_${first.toLowerCase()}`;
const PROVIDER = { GOOGLE: 'Google Calendar', MICROSOFT: 'Outlook' } as const;

export function Connections() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const mem = orgMembers(w, a.orgId).filter((m) => m.role !== 'VIEWER');
  const [consent, setConsent] = useState(false);
  const mine = w.calendars.find((c) => c.personId === calKey(a.first));
  const connected = (h?: string) => h === 'CONNECTED_FREEBUSY_ONLY' || h === 'CONNECTED_WRITE';
  const earliest = earliestFromMemory();
  const memo = w.memories.find((m) => m.memory_key === 'recruiter.meeting.window' && m.lifecycle_status === 'active');
  const isAda = a.id === 'u_ada';
  const connect = () => update((d) => {
    const c = d.calendars.find((x) => x.personId === calKey(a.first));
    if (c) { c.health = 'CONNECTED_FREEBUSY_ONLY'; c.scopes = ['freebusy.read']; c.checkedAt = now(); }
    else d.calendars.push({ personId: calKey(a.first), provider: 'GOOGLE', health: 'CONNECTED_FREEBUSY_ONLY', scopes: ['freebusy.read'], checkedAt: now() });
    emit(d, a.id, 'calendar.connected', `ORG:${a.orgId}`, `${a.name} connected a calendar for busy times only.`);
    log(d, 'You', 'Connected Google Calendar (busy times only)');
  });
  const disconnect = () => update((d) => { const c = d.calendars.find((x) => x.personId === calKey(a.first)); if (c) { c.health = 'REVOKED'; c.scopes = []; } emit(d, a.id, 'calendar.disconnected', `ORG:${a.orgId}`, `${a.name} disconnected their calendar.`); log(d, 'You', 'Disconnected Google Calendar'); });
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
    <Canvas title="Calendar connections" kicker={orgOf(w, a.orgId)?.name ?? 'Calendar'} open onClose={() => {}} aside={<Link to="/r/calendar" className="ds-btn quiet">← Calendar</Link>}>
      <section className="ds-sheet hc-promise" aria-labelledby="cn-p">
        <h2 id="cn-p" className="voice t24" style={{ margin: 0 }}>Q sees when you’re busy, never what the meeting is.</h2>
        <ul className="hc-plainticks">
          <li><span aria-hidden="true">✓</span>Times only: no titles, people or notes.</li>
          <li><span aria-hidden="true">✓</span>Candidates never see anything from your calendar.</li>
          <li><span aria-hidden="true">✓</span>Creating interview events is a separate permission, asked for the first time it’s needed.</li>
        </ul>
      </section>
      <section className="ds-sheet" aria-labelledby="cn-t" style={{ display: 'grid', gap: 8 }}>
        <div className="hc-sec-head"><h2 id="cn-t" className="voice t24" style={{ margin: 0 }}>The hiring team</h2><span className="ds-sim">Simulated providers</span></div>
        <ul className="hc-conns">
          {mem.map((m) => { const c = w.calendars.find((x) => x.personId === calKey(m.first)); const me = m.id === a.id; const on = c ? connected(c.health) : !me; return (
            <li key={m.id}>
              <span className="ds-av hc-av" aria-hidden="true">{m.initials}</span>
              <span className="hc-lmain"><b>{m.name}{me ? <span className="muted" style={{ fontWeight: 400 }}> (you)</span> : null}</b>
                <span className="t14 muted">{c ? PROVIDER[c.provider] : 'Kora workspace calendar'} · {city(m.timezone)}{c && on ? ` · checked ${tDay(c.checkedAt, LAGOS)} ${tTime(c.checkedAt, LAGOS)}` : ''}</span></span>
              <span className="ds-tag" data-k={on ? 'ok' : c?.health === 'REVOKED' ? 'warn' : undefined}>{on ? '✓ Busy times only' : c?.health === 'REVOKED' ? 'Access removed' : 'Not connected'}</span>
              {me && (on && c ? <button type="button" className="ds-btn quiet" onClick={disconnect}>Disconnect</button> : <button type="button" className="ds-btn primary" onClick={() => setConsent(true)} aria-expanded={consent}>Connect Google Calendar</button>)}
            </li>); })}
        </ul>
        {mine?.health === 'REVOKED' && <p className="t14" role="status" style={{ margin: 0 }}>Q stopped checking your calendar the moment you disconnected. Until you reconnect, Q won’t offer times that include you.</p>}
        <AnimatePresence>
          {consent && (
            <motion.div className="hc-consent" role="dialog" aria-labelledby="cn-c" {...arrive}>
              <h3 id="cn-c" style={{ margin: 0 }}>Connect Google Calendar</h3>
              <p style={{ margin: 0 }}>Q is asking for one permission: <b>see when you’re busy</b>. Times only, not titles, people or notes. You can disconnect at any time and Q stops checking immediately.</p>
              <div className="ds-actions"><button type="button" className="ds-btn primary" autoFocus onClick={() => { connect(); setConsent(false); }}>Allow busy times</button><button type="button" className="ds-btn quiet" onClick={() => setConsent(false)}>Cancel</button><span className="ds-sim">Simulated consent</span></div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {isAda && memo && (
        <section className="ds-sheet" aria-labelledby="cn-w" style={{ display: 'grid', gap: 12 }}>
          <div className="hc-sec-head"><h2 id="cn-w" className="voice t24" style={{ margin: 0 }}>When you take interviews</h2><Link to="/r/memory">Why Q knows this</Link></div>
          <p className="t14 muted" style={{ margin: 0 }}>From {memo.source_refs[0].label}{memo.source_refs[0].quote ? <>: “{memo.source_refs[0].quote}”</> : '.'}</p>
          <div className="hc-prefs">
            <div className="ds-field"><label htmlFor="earliest">Earliest start (Lagos)</label>
              <select id="earliest" className="ds-input" value={earliest} onChange={(e) => setEarliest(e.target.value)}>{['09:00', '09:30', '10:00', '10:30', '11:00'].map((t) => <option key={t}>{t}</option>)}</select>
              <span className="t14 muted">Changing this updates what Q remembers.</span></div>
            <div className="hc-pref"><span className="t14 muted">Protected</span><b>Tuesday review, 13:00–15:00</b></div>
            <div className="hc-pref"><span className="t14 muted">Length and buffer</span><b>{w.prefs.defaultDurationMinutes} min · {w.prefs.bufferMinutes} min either side</b></div>
          </div>
        </section>
      )}
    </Canvas>
  );
}
