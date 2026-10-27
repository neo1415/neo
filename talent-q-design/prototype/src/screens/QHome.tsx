// P1 · SC-117 Q home workspace + SC-118 composer. One home: Q's voice on the dark side, what needs you on paper.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { TERMINAL_STATUSES } from '@contracts';
import { allRuns, onRuns, useNamedRun, useRun } from '../mock/runtime';
import { getWorld, now, uid, update, useWorld } from '../mock/world';
import { QPresence, type QState } from '../q/QPresence';
import { startIntake } from '../q/scripts';
import { fmt } from '../q/slots';
import { Arrive, Composer, Label, MeSays, QSays, RunSteps, Sim } from '../ui/kit';
import { Link, navigate } from '../ui/router';

function useActiveRuns() {
  const runs = useSyncExternalStore(onRuns, () => allRuns().map((r) => `${r.runId}:${r.status}:${r.seq}`).join('|'));
  return runs ? allRuns().filter((r) => !TERMINAL_STATUSES.includes(r.status)) : [];
}

export function QHome() {
  const w = useWorld((x) => x);
  const active = useActiveRuns();
  const pending = w.proposals.filter((p) => p.status === 'AWAITING_APPROVAL');
  const slotsToSend = w.scheduling?.state === 'RECRUITER_CONFIRMATION';
  const counter = w.scheduling?.state === 'CANDIDATE_COUNTERPROPOSES';
  const waitingCount = pending.length + (slotsToSend ? 1 : 0) + (counter ? 1 : 0);
  const sourcingId = useNamedRun('sourcing');
  const sourcing = useRun(sourcingId, w.network);
  const progress = sourcing.steps.length ? sourcing.steps.reduce((a, s) => a + (s.total ? s.done / s.total : s.result === 'DONE' ? 1 : 0), 0) / Math.max(5, sourcing.steps.length) : 0;
  const qState: QState = w.network === 'offline' ? 'offline' : active.length ? 'working' : waitingCount ? 'waiting' : 'idle';
  const end = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [w.chat.recruiter.length]);

  const headline = waitingCount ? `${waitingCount === 1 ? 'One thing needs' : `${waitingCount} things need`} your yes.`
    : active.length ? 'I’m working. Nothing needs you yet.'
    : w.mandate.status === 'DRAFT' ? 'Tell me who you need.' : 'You’re clear for now.';

  const onSend = (text: string) => {
    update((d) => { d.chat.recruiter.push({ id: uid('m'), who: 'me', text, at: now() }); });
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const t = text.toLowerCase();
      const reply = (q: string, link?: { label: string; to: string }, used?: { kind: 'MEMORY' | 'POLICY' | 'CURRENT_PROMPT' | 'AUTHORIZED_FACT'; label: string }[]) =>
        update((d) => { d.chat.recruiter.push({ id: uid('m'), who: 'q', text: q, at: now(), link, used }); });
      if (/hire|need|engineer|role|backend|developer/.test(t) && getWorld().mandate.status === 'DRAFT') {
        startIntake(text);
        reply('I’ve started a mandate from what you said. I have two questions; answer them there or here.', { label: 'Open the mandate', to: '/r/mandate' }, [{ kind: 'CURRENT_PROMPT', label: 'your message' }]);
        navigate('/r/mandate');
      } else if (/compar|shortlist|who/.test(t)) reply('Here’s the shortlist side by side, with each claim linked to its evidence.', { label: 'Open the comparison', to: '/r/compare' });
      else if (/schedul|interview|time|calendar|book/.test(t)) reply('I’ll find times using your remembered hours: after 10:00, mornings first, Tuesday review kept clear.', { label: 'Go to scheduling', to: '/r/calendar' }, [{ kind: 'MEMORY', label: 'Your meeting hours (20 Oct)' }]);
      else if (/remember|memory|forget|know about/.test(t)) reply('This is everything I remember for you, where each item came from, and how to change it.', { label: 'What Q remembers', to: '/r/memory' });
      else if (/message|outreach|email|send/.test(t)) reply('Drafts wait for your approval. Nothing is sent without it.', { label: 'Open approvals', to: '/r/outreach' });
      else reply('I can shape a role, find and compare people, draft outreach for your approval, and schedule interviews. What would you like to start with?');
    }, 450);
  };

  const booked = w.scheduling && ['BOOKED', 'REMINDERS'].includes(w.scheduling.state) ? w.scheduling.slots.find((s) => s.slotId === w.scheduling!.chosenSlotId) : null;

  return (
    <main className="split">
      <section className="split-conv" aria-labelledby="home-h">
        <div className="stack gap-6" style={{ paddingTop: 16 }}>
          <QPresence state={qState} size={64} progress={progress} />
          <div className="stack gap-3">
            <span className="t-label q-text">{qState === 'waiting' ? 'Q · waiting on you' : qState === 'working' ? 'Q · working' : qState === 'offline' ? 'Q · offline' : 'Q · ready'}</span>
            <h1 id="home-h" className="t-display">{headline}</h1>
            <p className="muted measure">Good morning, Ada. I work on Kora Pay’s hiring in the background and only bring you what needs a decision.</p>
          </div>
        </div>
        <div className="stack gap-6 grow" aria-label="Conversation with Q" role="log">
          {w.chat.recruiter.map((m) => m.who === 'me' ? <MeSays key={m.id} text={m.text} /> : (
            <Arrive key={m.id}>
              <div className="stack gap-2">
                <QSays text={m.text} used={m.used} />
                {m.link && <Link to={m.link.to} className="btn btn-secondary btn-compact" style={{ alignSelf: 'flex-start', marginLeft: 17 }}>{m.link.label}</Link>}
              </div>
            </Arrive>
          ))}
          {typing && <p className="t-caption" aria-live="polite" style={{ marginLeft: 17 }}>Q is replying…</p>}
          <div ref={end} />
        </div>
        <Composer onSend={onSend} suggestion={w.mandate.status === 'DRAFT' ? 'I need a senior backend engineer for payments' : 'Who should I talk to first?'} />
      </section>

      <section className="split-art paper" aria-label="What needs you and what Q is doing">
        <div className="stack gap-10" style={{ maxWidth: 760 }}>
          <div className="stack gap-4">
            <Label as="h2">Needs you · {waitingCount}</Label>
            {waitingCount === 0 && <p className="muted">Nothing is waiting on you. When Q needs a yes, it appears here first.</p>}
            {pending.map((p) => (
              <Arrive key={p.proposalId}>
                <article className="moment" data-state="waiting">
                  <div className="row between wrap gap-2"><h3 className="t-title" style={{ fontSize: 18 }}>{p.summary}</h3><span className="t-label">Approve each send · email</span></div>
                  <p className="moment-quote">{p.preview.split('\n\n').slice(0, 2).join('\n\n')}</p>
                  <div className="moment-actions"><Link to="/r/outreach" className="btn btn-primary">Review and approve</Link></div>
                </article>
              </Arrive>
            ))}
            {slotsToSend && (
              <article className="moment"><h3 className="t-title" style={{ fontSize: 18 }}>Send {w.scheduling!.slots.length} interview times to Tobi</h3><p className="muted">Calculated from your remembered hours and Seyi’s busy times.</p><div className="moment-actions"><Link to="/r/calendar" className="btn btn-primary">Review times</Link></div></article>
            )}
            {counter && (
              <article className="moment"><h3 className="t-title" style={{ fontSize: 18 }}>Tobi suggested another time</h3><p className="moment-quote">“{w.scheduling!.counterProposal?.text}”</p><div className="moment-actions"><Link to="/r/calendar" className="btn btn-primary">Review</Link></div></article>
            )}
          </div>

          <div className="stack gap-4">
            <Label as="h2">Q is working on</Label>
            {active.length === 0 && <p className="muted">Nothing running.{w.mandate.status === 'DRAFT' ? ' Tell Q who you need to start.' : ''}</p>}
            {sourcingId && !sourcing.completed && sourcing.steps.length > 0 && (
              <div className="stack gap-3"><Link to="/r/sourcing" className="t-title" style={{ fontSize: 18, color: 'inherit' }}>{sourcing.title || 'Sourcing'}</Link><RunSteps steps={sourcing.steps} /></div>
            )}
            {sourcing.completed && <p>Sourcing finished: {w.mandate.shortlist.length} people to compare. <Link to="/r/compare">Open the comparison</Link></p>}
          </div>

          <div className="stack gap-3">
            <Label as="h2">Coming up</Label>
            {booked ? (
              <p className="row gap-3 wrap"><span className="t-mono">{fmt(booked.start, 'Africa/Lagos', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</span><span>Interview with Tobi Adeyemi and Seyi Balogun</span><Sim>Simulated receipt</Sim></p>
            ) : <p className="muted">No interviews booked yet.</p>}
          </div>

          <div className="stack gap-3">
            <Label as="h2">Recently</Label>
            {w.activity.length === 0 ? <p className="muted">Q’s actions and your approvals will be listed here, newest first.</p> : (
              <ul className="stack gap-2">{w.activity.slice(0, 5).map((a, i) => <li key={i} className="row gap-3"><span className="t-mono subtle" style={{ width: 52 }}>{new Date(a.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span><span><strong style={{ fontWeight: 500 }}>{a.actor}</strong> · {a.text}</span></li>)}</ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
