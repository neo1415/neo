// Candidate side of correspondence (/c/messages) and interview times (/c/slots). Candidates see only what was
// actually sent to them (never drafts), in their own time zone, with an honest status. Replying, confirming
// and asking to move are explicit button presses; Q can do the same by typing.
import { useState } from 'react';
import { actorOf, orgOf, simNow, useWorld, type World } from '../../mock/world';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { runAction, useViewState } from '../../q/core/engine';
import type { CalEvent, Msg } from '../../state/domain';
import { addDays, city, evStatusLabel, firstOf, LAGOS, nameOf, nextWeek, offsetOf, tDay, tLong, tTime } from './lib';
import { SlotPicker } from '../../screens/SlotPicker';

const visible = (m: Msg, pid: string) => m.from === pid ? m.status !== 'DISCARDED' : m.status === 'SENT_SIMULATED' || m.status === 'RECEIVED';
export function candidateThreads(w: World, pid: string) {
  const byOrg = new Map<string, { orgId: string; threadId: string; msgs: Msg[] }>();
  for (const t of w.threads.filter((x) => x.personId === pid)) {
    const ms = t.messages.filter((m) => visible(m, pid)); if (!ms.length) continue;
    const g = byOrg.get(t.orgId) ?? { orgId: t.orgId, threadId: t.id, msgs: [] };
    g.msgs.push(...ms); if (ms.some((m) => m.from !== pid)) g.threadId = t.id;
    byOrg.set(t.orgId, g);
  }
  return [...byOrg.values()].map((g) => ({ ...g, msgs: g.msgs.sort((x, y) => x.at.localeCompare(y.at)) })).sort((x, y) => y.msgs[y.msgs.length - 1].at.localeCompare(x.msgs[x.msgs.length - 1].at));
}

export function CandidateMessages() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const narrow = useNarrow();
  const groups = candidateThreads(w, pid);
  const [sel, setSel] = useViewState<string>('sel', '');
  const cur = groups.find((g) => `${pid}|${g.orgId}` === sel || g.orgId === sel) ?? (narrow ? undefined : groups[0]);
  return (
    <Canvas title={groups.length ? 'Your messages with employers' : 'No messages yet'} kicker="Messages" open onClose={() => {}} aside={<span className="t14 muted">Only what employers actually sent you</span>}>
      {w.network === 'offline' && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">!</span><span>You’re offline. You can still write; your message is saved and sent when you reconnect.</span><span /></div>}
      {!groups.length && <section className="ds-sheet" style={{ display: 'grid', gap: 8 }}><p style={{ margin: 0 }}>When an employer writes to you, it appears here. Drafts they haven’t sent are never shown, so nothing here is guesswork.</p></section>}
      {groups.length > 0 && (
        <div className="hc-inbox" data-open={cur ? '1' : '0'}>
          {(!narrow || !cur) && (
            <nav className="hc-list" aria-label="Employers">
              <ul>{groups.map((g) => { const last = g.msgs[g.msgs.length - 1]; return (
                <li key={g.orgId}><button type="button" className="hc-row" aria-pressed={cur?.orgId === g.orgId} onClick={() => setSel(`${pid}|${g.orgId}`)}>
                  <span className="hc-row-top"><b>{orgOf(w, g.orgId)?.name}</b><span className="t14 muted num">{tDay(last.at, a.timezone)}</span></span>
                  <span className="t14 muted hc-ellip">{last.from === pid ? 'You: ' : ''}{last.subject ?? last.body.slice(0, 60)}</span>
                  {last.from === pid && <span className="hc-tags"><span className="ds-tag">Waiting for {orgOf(w, g.orgId)?.name}</span></span>}
                </button></li>); })}</ul>
            </nav>
          )}
          {cur && <CandidateThread orgId={cur.orgId} threadId={cur.threadId} msgs={cur.msgs} onBack={narrow ? () => setSel('') : undefined} />}
        </div>
      )}
    </Canvas>
  );
}

function CandidateThread({ orgId, threadId, msgs, onBack }: { orgId: string; threadId: string; msgs: Msg[]; onBack?: () => void }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!; const org = orgOf(w, orgId)!;
  const [text, setText] = useState('');
  const job = w.jobs.find((j) => j.orgId === orgId && w.applications.some((ap) => ap.jobId === j.id && ap.personId === pid));
  const last = msgs[msgs.length - 1];
  const waiting = last.from === pid ? Math.floor((simNow(w).getTime() - new Date(last.at).getTime()) / 864e5) : -1;
  const events = w.calendar.filter((e) => e.personId === pid && e.orgId === orgId && ['INVITED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(e.status));
  return (
    <section className="hc-thread ds-sheet" aria-label={`Messages with ${org.name}`}>
      {onBack && <button type="button" className="ds-btn quiet" onClick={onBack} style={{ justifySelf: 'start' }}>← All employers</button>}
      <header style={{ display: 'grid', gap: 4 }}>
        <h2 className="voice t24" style={{ margin: 0 }}>{org.name}</h2>
        <span className="t14 muted">{org.verified.domain && org.verified.registry === 'VERIFIED' ? 'Verified employer (domain and company registry)' : 'Not fully verified'} · {city(LAGOS)}{job ? ` · ${job.signals.replies}` : ''}</span>
      </header>
      {events.map((e) => <InterviewCard key={e.id} e={e} threadId={threadId} />)}
      <ol className="hc-msgs" aria-label="Messages, oldest first">
        {msgs.map((m) => (
          <li key={m.id} className="hc-msg" data-from={m.from === pid ? 'us' : 'them'}>
            <div className="hc-msg-head"><b>{m.from === pid ? 'You' : nameOf(w, m.from)}</b><span className="t14 muted">{tDay(m.at, a.timezone)}, {tTime(m.at, a.timezone)}</span>{m.status === 'QUEUED_OFFLINE' && <span className="hc-status" data-s="QUEUED_OFFLINE">Waiting to send</span>}</div>
            {m.subject && m.from !== pid && <p className="hc-subj">{m.subject}</p>}
            <div className="hc-body">{m.body}</div>
            {m.from !== pid && <span className="ds-sim" style={{ justifySelf: 'start' }}>Simulated message</span>}
          </li>
        ))}
      </ol>
      {waiting >= 0 && <p className="t14" role="status" style={{ margin: 0 }}>{org.name} hasn’t replied yet{waiting > 0 ? ` (${waiting} day${waiting === 1 ? '' : 's'})` : ''}. We can’t say when they will; you’ll see it here as soon as they do.</p>}
      <form className="hc-reply" onSubmit={(ev) => { ev.preventDefault(); if (!text.trim()) return; void runAction({ label: 'Send', act: { t: 'do', op: 'hire-c.c.send', args: { orgId, threadId, kind: 'REPLY', body: text.trim() } } }); setText(''); }}>
        <div className="ds-field"><label htmlFor="c-reply">Reply to {org.name}</label>
          <textarea id="c-reply" className="ds-input hc-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your reply. You can also ask Q to help." /></div>
        <div className="ds-actions"><button type="submit" className="ds-btn primary" disabled={!text.trim()}>{w.network === 'offline' ? 'Save and send when online' : 'Send reply'}</button><span className="t14 muted">Sending is simulated.</span></div>
      </form>
    </section>
  );
}

export function InterviewCard({ e, threadId }: { e: CalEvent; threadId?: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const tz = a.timezone; const org = orgOf(w, e.orgId)!;
  const [asking, setAsking] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const [part, setPart] = useState<'morning' | 'afternoon' | ''>('');
  const [note, setNote] = useState('');
  const panel = e.attendees.filter((x) => x !== a.personId).map((x) => nameOf(w, x));
  const opts = nextWeek(w).concat(nextWeek(w).map((d) => addDays(d, 7))).filter((d) => d !== e.start.slice(0, 10)).slice(0, 7);
  const send = () => {
    const wish = [days.map((d) => tDay(`${d}T12:00:00Z`, tz)).join(' or '), part].filter(Boolean).join(' ');
    const body = `Hi, thank you for the invitation. I can’t make ${tDay(e.start, tz)} at ${tTime(e.start, tz)}. ${wish ? `Could we move it to ${wish}?` : 'Could we find another time?'}${note.trim() ? ` ${note.trim()}` : ''} Thank you, ${a.first}`;
    void runAction({ label: 'Ask to move', act: { t: 'do', op: 'hire-c.c.send', args: { orgId: e.orgId, threadId: threadId ?? '', kind: 'RESCHEDULE', body, eventId: e.id, days, part: part || null, request: wish || 'another time' } } });
    setAsking(false);
  };
  return (
    <div className="hc-iv" aria-label={`Interview with ${org.name}`}>
      <div className="hc-msg-head"><b>Interview · {tLong(e.start, tz)}, {tTime(e.start, tz)}–{tTime(e.end, tz)} {city(tz)} time</b><span className="hc-status" data-s={e.status}>{evStatusLabel[e.status]}</span></div>
      <p className="t14" style={{ margin: 0 }}>With {panel.join(', ')} · video · {org.name} is in Lagos ({(() => { const d = (offsetOf(e.start, LAGOS) - offsetOf(e.start, tz)) / 60; return d === 0 ? 'same time as you' : `${Math.abs(d)} hour${Math.abs(d) === 1 ? '' : 's'} ${d > 0 ? 'ahead of' : 'behind'} you`; })()}).</p>
      {e.status === 'RESCHEDULE_REQUESTED' && <p className="t14" role="status" style={{ margin: 0 }}>You asked to move this. Your current time stays held until {org.name} offers a new one; nothing is decided until they reply.</p>}
      {e.status === 'CONFIRMED' && <p className="t14" style={{ margin: 0 }}>Confirmed. We’ll remind you the day before. <span className="ds-sim">Simulated</span></p>}
      {e.status !== 'RESCHEDULE_REQUESTED' && !asking && (
        <div className="ds-actions">
          {e.status === 'INVITED' && <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Confirm', act: { t: 'do', op: 'hire-c.c.send', args: { orgId: e.orgId, threadId: threadId ?? '', kind: 'CONFIRM', body: `Thank you, I confirm ${tLong(e.start, tz)} at ${tTime(e.start, tz)} (${city(tz)} time). ${a.first}`, eventId: e.id } } })}>Confirm this time</button>}
          <button type="button" className="ds-btn" onClick={() => setAsking(true)}>Ask for another time</button>
        </div>
      )}
      {asking && (
        <form className="hc-ask" onSubmit={(ev) => { ev.preventDefault(); send(); }}>
          <fieldset className="hc-fs"><legend className="t14"><b>Which days could work?</b> (optional)</legend>
            <div className="hc-filters">{opts.map((d) => <button key={d} type="button" className="ds-filter" aria-pressed={days.includes(d)} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{tDay(`${d}T12:00:00Z`, tz)}</button>)}</div></fieldset>
          <fieldset className="hc-fs"><legend className="t14"><b>Time of day</b></legend>
            <div className="hc-filters">{(['morning', 'afternoon'] as const).map((p) => <button key={p} type="button" className="ds-filter" aria-pressed={part === p} onClick={() => setPart(part === p ? '' : p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}</div></fieldset>
          <div className="ds-field"><label htmlFor={`note-${e.id}`}>Anything to add? (optional)</label><input id={`note-${e.id}`} className="ds-input" value={note} onChange={(x) => setNote(x.target.value)} /></div>
          <div className="ds-actions"><button type="submit" className="ds-btn primary">Send request</button><button type="button" className="ds-btn quiet" onClick={() => setAsking(false)}>Cancel</button></div>
          <p className="t14 muted" style={{ margin: 0 }}>{org.name} chooses the new time. Asking doesn’t cancel your current time.</p>
        </form>
      )}
    </div>
  );
}

/** /c/slots: interview times across employers; the older booking flow (Tobi with Ada) stays below when active. */
export function CandidateSlots() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const evs = w.calendar.filter((e) => e.personId === a.personId && ['INVITED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(e.status)).sort((x, y) => x.start.localeCompare(y.start));
  const legacy = a.personId === 'p_tobi' && !!w.scheduling;
  return (
    <Canvas title={evs.length ? `${evs.length === 1 ? 'One interview' : `${evs.length} interviews`} in your calendar` : 'No interview times yet'} kicker="Interview times" open onClose={() => {}} aside={<span className="t14 muted">Times in {city(a.timezone)} time</span>}>
      {!evs.length && !legacy && <section className="ds-sheet"><p style={{ margin: 0 }}>When an employer invites you to an interview, the time appears here in your own time zone, and you can confirm it or ask for another.</p></section>}
      {evs.map((e) => <section key={e.id} className="ds-sheet" style={{ display: 'grid', gap: 10 }}><span className="lab">{orgOf(w, e.orgId)?.name} · {e.title.replace(/^Interview: [^(]*\(/, '').replace(/\)$/, '')}</span><InterviewCard e={e} threadId={w.threads.find((t) => t.orgId === e.orgId && t.personId === a.personId && t.messages.some((m) => m.status === 'SENT_SIMULATED'))?.id} /></section>)}
      {legacy && <details className="ds-sheet"><summary className="t14" style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}><b>Kora Pay times offered through the earlier booking flow</b></summary><div className="ds-legacy"><SlotPicker /></div></details>}
      <p className="t14 muted" style={{ margin: 0 }}>Ask Q “can I move my interview to Thursday afternoon?” or “confirm my interview”. {firstOf(w, a.id)}, nothing is sent without your yes.</p>
    </Canvas>
  );
}
