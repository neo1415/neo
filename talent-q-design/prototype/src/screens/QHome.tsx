// P1 · SC-117 Q home workspace. Since the complete-experience phase the conversation is the global Q thread
// (beside every page); this page is the paper canvas: what needs you and what Q is doing. Kora Pay view.
import { useState, useSyncExternalStore } from 'react';
import { TERMINAL_STATUSES } from '@contracts';
import { allRuns, onRuns, useNamedRun, useRun } from '../mock/runtime';
import { useWorld } from '../mock/world';
import { fmt } from '../q/slots';
import { Arrive, Label, RunSteps, Sim } from '../ui/kit';
import { Canvas } from '../ds/Workspace';
import { Link } from '../ui/router';

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
  const [narrowOpen, setNarrowOpen] = useState(false);

  const headline = waitingCount ? `${waitingCount === 1 ? 'One thing needs' : `${waitingCount} things need`} your yes.`
    : active.length ? 'I’m working. Nothing needs you yet.'
    : w.mandate.status === 'DRAFT' ? 'Tell me who you need.' : 'You’re clear for now.';

  const booked = w.scheduling && ['BOOKED', 'REMINDERS'].includes(w.scheduling.state) ? w.scheduling.slots.find((s) => s.slotId === w.scheduling!.chosenSlotId) : null;

  return (
        <Canvas title={headline} kicker="Q · your day" open={narrowOpen} onClose={() => setNarrowOpen(false)}>
          <section className="ds-sheet ds-legacy" aria-label="What needs you and what Q is doing" style={{ display: 'grid', gap: 28, maxWidth: 820 }}>
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
              {active.length === 0 && <p className="muted">Nothing running.{w.mandate.status === 'DRAFT' ? ' Tell Q who you need to start.' : ''} <Link to="/r/plan">Plans and agents</Link> shows multi-step work.</p>}
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
          </section>
        </Canvas>
  );
}
