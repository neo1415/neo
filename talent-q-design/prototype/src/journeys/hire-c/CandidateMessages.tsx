// Candidate side of correspondence (/c/messages) and interview times (/c/slots). Candidates see only what was
// actually sent to them (never drafts), in their own time zone, with an honest status. Replying, confirming
// and asking to move are explicit button presses; Q can do the same by typing.
// Design pass (creative, within Direction D's candidate warmth): the page speaks to the person by name, puts
// the next step first as a personal "ticket", shows the conversation as a conversation (their words left,
// yours right), and reassures without promising anything an employer hasn't decided.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { actorOf, orgOf, simNow, useWorld, type World } from '../../mock/world';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { arrive, DUR, EASE } from '../../ds/motion';
import { runAction, useViewState } from '../../q/core/engine';
import type { CalEvent, Msg } from '../../state/domain';
import { addDays, city, evStatusLabel, LAGOS, nameOf, nextWeek, offsetOf, tDay, tLong, tTime } from './lib';
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
const ACTIVE = ['INVITED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'];
const initials = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('');
const verified = (w: World, orgId: string) => { const o = orgOf(w, orgId); return !!(o?.verified.domain && o.verified.registry === 'VERIFIED'); };

export function CandidateMessages() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const narrow = useNarrow();
  const groups = candidateThreads(w, pid);
  const [sel, setSel] = useViewState<string>('sel', '');
  const cur = groups.find((g) => `${pid}|${g.orgId}` === sel || g.orgId === sel) ?? (narrow ? undefined : groups[0]);
  const invites = w.calendar.filter((e) => e.personId === pid && e.status === 'INVITED').length;
  return (
    <Canvas title="Messages" kicker={`${a.first}’s messages with employers`} open onClose={() => {}}>
      {w.network === 'offline' && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">◷</span><span>You’re offline. You can still write; your message is saved and sent when you reconnect.</span><span /></div>}
      {!groups.length && (
        <section className="ds-sheet hc-cempty">
          <h2 className="voice t24" style={{ margin: 0 }}>Nothing here yet, {a.first}.</h2>
          <p style={{ margin: 0 }}>When an employer writes to you, it appears here. You’ll only ever see what they actually sent, never their drafts.</p>
          <p className="t14 muted" style={{ margin: 0 }}>While you wait, Q can help you find roles or get ready for interviews.</p>
        </section>
      )}
      {groups.length > 0 && invites > 0 && !cur && <p className="hc-cnote voice">{invites === 1 ? 'You have an interview invitation waiting.' : `You have ${invites} interview invitations waiting.`}</p>}
      {groups.length > 0 && (
        <div className="hc-inbox hc-cinbox" data-open={cur ? '1' : '0'}>
          {(!narrow || !cur) && (
            <nav className="hc-list" aria-label="Employers">
              <ul>{groups.map((g) => { const last = g.msgs[g.msgs.length - 1]; const org = orgOf(w, g.orgId)?.name ?? ''; const inv = w.calendar.some((e) => e.personId === pid && e.orgId === g.orgId && e.status === 'INVITED'); return (
                <li key={g.orgId}><button type="button" className="hc-row" aria-pressed={cur?.orgId === g.orgId} onClick={() => setSel(`${pid}|${g.orgId}`)}>
                  <span className="ds-av hc-av hc-orgav" aria-hidden="true">{initials(org)}</span>
                  <span className="hc-row-main">
                    <span className="hc-row-top"><b className="hc-ellip">{org}</b><span className="t14 muted num">{tDay(last.at, a.timezone)}</span></span>
                    <span className="t14 hc-ellip hc-preview">{last.from === pid ? <span className="muted">You: </span> : null}{last.subject ?? last.body.slice(0, 60)}</span>
                    {(inv || last.from === pid) && <span className="hc-tags">{inv ? <span className="ds-tag" data-k="busy">Invitation to reply to</span> : <span className="ds-tag">Waiting for {org}</span>}</span>}
                  </span>
                </button></li>); })}</ul>
            </nav>
          )}
          {cur && <CandidateThread key={cur.orgId} orgId={cur.orgId} threadId={cur.threadId} msgs={cur.msgs} onBack={narrow ? () => setSel('') : undefined} />}
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
  const events = w.calendar.filter((e) => e.personId === pid && e.orgId === orgId && ACTIVE.includes(e.status));
  const starters = events.some((e) => e.status === 'INVITED') ? ['Thank you, I’m looking forward to it.', 'Could you tell me more about the interview format?'] : ['Thank you for getting back to me.', 'Is there anything else you need from me?'];
  return (
    <motion.section className="hc-thread ds-sheet hc-cthread" aria-label={`Messages with ${org.name}`} {...arrive}>
      {onBack && <button type="button" className="ds-btn quiet hc-back" onClick={onBack}>← All employers</button>}
      <header className="hc-cthread-head">
        <span className="ds-av hc-orgav lg" aria-hidden="true">{initials(org.name)}</span>
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <h2 className="voice t24" style={{ margin: 0 }}>{org.name}</h2>
          <span className="t14 muted">{job ? job.title : 'Your application'} · {city(LAGOS)}</span>
          <span className="hc-tags">{verified(w, orgId) ? <span className="ds-tag" data-k="ok" title="Email domain and company registry checked">✓ Verified employer</span> : <span className="ds-tag" data-k="warn">This employer isn’t verified yet</span>}{job && <span className="ds-tag">{job.signals.replies}</span>}</span>
        </div>
      </header>
      {events.map((e) => <InterviewCard key={e.id} e={e} threadId={threadId} />)}
      <ol className="hc-msgs hc-chat" aria-label="Messages, oldest first">
        <AnimatePresence initial={false}>
          {msgs.map((m) => { const mine = m.from === pid; return (
            <motion.li key={m.id} className="hc-bubble" data-from={mine ? 'me' : 'them'} {...arrive}>
              <div className="hc-msg-head"><b>{mine ? 'You' : `${nameOf(w, m.from)}`}</b><span className="t14 muted">{tDay(m.at, a.timezone)}, {tTime(m.at, a.timezone)}</span></div>
              {!mine && !verified(w, orgId) && <span className="ds-tag hc-unver" data-k="warn">This employer isn’t verified yet</span>}
              {m.subject && !mine && <p className="hc-subj">{m.subject}</p>}
              <div className="hc-body">{m.body}</div>
              {mine && <span className="hc-sent t14">{m.status === 'QUEUED_OFFLINE' ? '◷ Waiting to send' : <>✓ Sent <span className="ds-sim">Simulated send</span></>}</span>}
            </motion.li>); })}
        </AnimatePresence>
      </ol>
      {waiting >= 0 && <p className="hc-reassure" role="status">{org.name} hasn’t replied yet{waiting > 0 ? ` (${waiting} day${waiting === 1 ? '' : 's'})` : ''}. That’s normal, and it isn’t about you. We can’t say when they’ll reply; you’ll see it here as soon as they do.</p>}
      <form className="hc-reply hc-creply" onSubmit={(ev) => { ev.preventDefault(); if (!text.trim()) return; void runAction({ label: 'Send', act: { t: 'do', op: 'hire-c.c.send', args: { orgId, threadId, kind: 'REPLY', body: text.trim() } } }); setText(''); }}>
        <div className="ds-field"><label htmlFor="c-reply">Write to {org.name}</label>
          <textarea id="c-reply" className="ds-input hc-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="In your own words. Q can help if you’d like." /></div>
        {!text && <div className="hc-starters" role="group" aria-label="Start with">{starters.map((s) => <button key={s} type="button" className="ds-filter" onClick={() => setText(s)}>{s}</button>)}</div>}
        <div className="ds-actions"><button type="submit" className="ds-btn primary" disabled={!text.trim()}>{w.network === 'offline' ? 'Save and send when online' : 'Send'}</button><span className="t14 muted">Only {org.name} sees this.</span></div>
      </form>
    </motion.section>
  );
}

/** The interview as a personal ticket: when (in your time), who, how, and the one next step. */
export function InterviewCard({ e, threadId }: { e: CalEvent; threadId?: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const tz = a.timezone; const org = orgOf(w, e.orgId)!;
  const [asking, setAsking] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const [part, setPart] = useState<'morning' | 'afternoon' | ''>('');
  const [note, setNote] = useState('');
  const panel = e.attendees.filter((x) => x !== a.personId);
  const opts = nextWeek(w).concat(nextWeek(w).map((d) => addDays(d, 7))).filter((d) => d !== e.start.slice(0, 10)).slice(0, 7);
  const diff = (offsetOf(e.start, LAGOS) - offsetOf(e.start, tz)) / 60;
  const send = () => {
    const wish = [days.map((d) => tDay(`${d}T12:00:00Z`, tz)).join(' or '), part].filter(Boolean).join(' ');
    const body = `Hi, thank you for the invitation. I can’t make ${tDay(e.start, tz)} at ${tTime(e.start, tz)}. ${wish ? `Could we move it to ${wish}?` : 'Could we find another time?'}${note.trim() ? ` ${note.trim()}` : ''} Thank you, ${a.first}`;
    void runAction({ label: 'Ask to move', act: { t: 'do', op: 'hire-c.c.send', args: { orgId: e.orgId, threadId: threadId ?? '', kind: 'RESCHEDULE', body, eventId: e.id, days, part: part || null, request: wish || 'another time' } } });
    setAsking(false);
  };
  const [weekday, ...rest] = tLong(e.start, tz).split(' ');
  return (
    <motion.div className="hc-ticket" data-s={e.status} aria-label={`Interview with ${org.name}`} layout="position" transition={{ duration: DUR.normal, ease: EASE.standard }}>
      <div className="hc-ticket-date" aria-hidden="true"><span>{weekday}</span><b className="voice">{rest[0]}</b><span>{rest.slice(1).join(' ')}</span></div>
      <div className="hc-ticket-main">
        <div className="hc-msg-head"><span className="t14"><b>{org.name}</b> · interview</span><span className="ds-tag hc-ctag" data-k={e.status === 'CONFIRMED' ? 'ok' : e.status === 'INVITED' ? 'busy' : 'warn'}>{e.status === 'INVITED' ? 'Waiting for your reply' : evStatusLabel[e.status]}</span></div>
        <p className="voice hc-ticket-when"><span className="sr">{tLong(e.start, tz)}, </span>{tTime(e.start, tz)}–{tTime(e.end, tz)} <span className="hc-ticket-tz">your time ({city(tz)})</span></p>
        <p className="t14" style={{ margin: 0 }}>Video call with {panel.map((x) => nameOf(w, x)).join(' and ')}. {diff === 0 ? `${org.name} is in Lagos, same time as you.` : `For them it’s ${tTime(e.start, LAGOS)} in Lagos (${Math.abs(diff)} hour${Math.abs(diff) === 1 ? '' : 's'} ${diff > 0 ? 'ahead of' : 'behind'} you).`}</p>
        <AnimatePresence mode="wait" initial={false}>
          {e.status === 'RESCHEDULE_REQUESTED' && <motion.p key="r" className="hc-reassure" role="status" {...arrive}>You asked to move this. Your current time stays held until {org.name} offers a new one; nothing changes until they reply.</motion.p>}
          {e.status === 'CONFIRMED' && <motion.p key="c" className="hc-confirmed" role="status" {...arrive}><span aria-hidden="true">✓</span> You’re confirmed. We’ll remind you the day before. Good luck, {a.first}. <span className="ds-sim">Simulated</span></motion.p>}
        </AnimatePresence>
        {e.status !== 'RESCHEDULE_REQUESTED' && !asking && (
          <div className="ds-actions">
            {e.status === 'INVITED' && <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Confirm', act: { t: 'do', op: 'hire-c.c.send', args: { orgId: e.orgId, threadId: threadId ?? '', kind: 'CONFIRM', body: `Thank you, I confirm ${tLong(e.start, tz)} at ${tTime(e.start, tz)} (${city(tz)} time). ${a.first}`, eventId: e.id } } })}>Confirm this time</button>}
            <button type="button" className={`ds-btn ${e.status === 'CONFIRMED' ? 'quiet' : ''}`} onClick={() => setAsking(true)}>Ask for another time</button>
          </div>
        )}
        {e.status === 'INVITED' && !asking && <p className="t14 muted" style={{ margin: 0 }}>Asking for another time is completely normal and doesn’t count against you.</p>}
        <AnimatePresence initial={false}>
          {asking && (
            <motion.form className="hc-ask" onSubmit={(ev) => { ev.preventDefault(); send(); }} {...arrive}>
              <fieldset className="hc-fs"><legend className="t14"><b>Which days could work?</b> <span className="muted">Optional</span></legend>
                <div className="hc-filters">{opts.map((d) => <button key={d} type="button" className="ds-filter" aria-pressed={days.includes(d)} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{tDay(`${d}T12:00:00Z`, tz)}</button>)}</div></fieldset>
              <fieldset className="hc-fs"><legend className="t14"><b>Time of day</b></legend>
                <div className="hc-filters">{(['morning', 'afternoon'] as const).map((p) => <button key={p} type="button" className="ds-filter" aria-pressed={part === p} onClick={() => setPart(part === p ? '' : p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}</div></fieldset>
              <div className="ds-field"><label htmlFor={`note-${e.id}`}>Anything to add? <span className="muted">Optional</span></label><input id={`note-${e.id}`} className="ds-input" value={note} onChange={(x) => setNote(x.target.value)} /></div>
              <div className="ds-actions"><button type="submit" className="ds-btn primary">Send request</button><button type="button" className="ds-btn quiet" onClick={() => setAsking(false)}>Cancel</button></div>
              <p className="t14 muted" style={{ margin: 0 }}>{org.name} chooses the new time. Asking doesn’t cancel your current one.</p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** /c/slots: interview times across employers; the older booking flow (Tobi with Ada) stays below when active. */
export function CandidateSlots() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const evs = w.calendar.filter((e) => e.personId === a.personId && ACTIVE.includes(e.status)).sort((x, y) => x.start.localeCompare(y.start));
  const legacy = a.personId === 'p_tobi' && !!w.scheduling;
  const reply = evs.filter((e) => e.status === 'INVITED').length;
  return (
    <Canvas title={evs.length ? `Your interviews, ${a.first}` : `No interviews yet, ${a.first}`} kicker={`Times in ${city(a.timezone)} time`} open onClose={() => {}}>
      {evs.length > 0 && <p className="hc-cnote voice">{reply ? `${reply === 1 ? 'One invitation needs' : `${reply} invitations need`} your reply. Take your time; nothing is sent without your yes.` : 'You’re all set for now. We’ll remind you the day before each one.'}</p>}
      {!evs.length && !legacy && (
        <section className="ds-sheet hc-cempty">
          <p style={{ margin: 0 }}>When an employer invites you to an interview, it appears here in your own time zone. You can confirm it or ask for another time, whichever suits you.</p>
          <p className="t14 muted" style={{ margin: 0 }}>Try asking Q: “help me prepare for interviews”.</p>
        </section>
      )}
      {evs.map((e) => <section key={e.id} className="hc-ticketwrap"><InterviewCard e={e} threadId={w.threads.find((t) => t.orgId === e.orgId && t.personId === a.personId && t.messages.some((m) => m.status === 'SENT_SIMULATED'))?.id} /></section>)}
      {legacy && <details className="ds-sheet"><summary className="t14" style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}><b>Kora Pay times offered through the earlier booking flow</b></summary><div className="ds-legacy"><SlotPicker /></div></details>}
      <p className="t14 muted" style={{ margin: 0 }}>You can also ask Q: “can I move my interview to Thursday afternoon?” or “confirm my interview”.</p>
    </Canvas>
  );
}
