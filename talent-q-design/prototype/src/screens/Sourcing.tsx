// P4 · SC-036 Search progress explorer, SC-045 Recruitment agent execution, SC-120 run states, SC-181 resume.
// Every number on this screen comes from a run event. Partial results appear as soon as they exist.
import { PEOPLE, SOURCE_POOL } from '../mock/fixtures';
import { useNamedRun, useRun } from '../mock/runtime';
import { useWorld } from '../mock/world';
import { QPresence } from '../q/QPresence';
import { RunConversation } from '../q/RunConversation';
import { startSourcing } from '../q/scripts';
import { Arrive, Banner, Button, Label, RunSteps } from '../ui/kit';
import { Link, navigate } from '../ui/router';

export function Sourcing() {
  const w = useWorld((x) => x);
  const runId = useNamedRun('sourcing');
  const view = useRun(runId, w.network);
  const interrupted = !runId && w.sourcing.cursor > 0 && !w.sourcing.done;
  const notStarted = !runId && w.sourcing.cursor === 0;
  const found = runId ? view.findings.filter((f) => f.kind === 'candidate').map((f) => f.ref) : w.sourcing.found;
  const read = view.steps.find((s) => s.stepId === 'read');
  const progress = view.steps.length ? view.steps.reduce((a, s) => a + (s.total ? s.done / s.total : s.result === 'DONE' ? 1 : 0), 0) / 5 : 0;

  return (
    <main className="split">
      <section className="split-conv" aria-labelledby="src-h">
        <div className="row gap-4">
          <QPresence state={w.network === 'offline' ? 'offline' : view.completed || w.sourcing.done ? 'done' : view.failure ? 'error' : runId ? 'working' : 'idle'} size={48} progress={progress} />
          <div className="stack"><span className="t-label q-text">Senior Backend · search</span><h1 id="src-h" className="t-heading">{w.sourcing.done ? 'Search finished' : runId ? 'Searching' : 'Search'}</h1></div>
        </div>
        {notStarted && (
          <div className="stack gap-4">
            <p className="muted">Q starts searching once the mandate is approved.</p>
            {w.mandate.status === 'DRAFT' ? <Link to="/r/mandate" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Approve the mandate first</Link>
              : <Button variant="primary" onClick={() => startSourcing()}>Start the search</Button>}
          </div>
        )}
        {interrupted && (
          <Banner tone="warn" title="This search was interrupted" action={<Button compact variant="primary" onClick={() => startSourcing()}>Resume</Button>}>
            Q had read {w.sourcing.cursor} of {SOURCE_POOL.length} profiles when the page closed. It remembers where it stopped and will carry on from profile {w.sourcing.cursor + 1}, not start again.
          </Banner>
        )}
        <div className="grow"><RunConversation runId={runId} view={view} onRetry={() => startSourcing()} /></div>
        {(view.completed || (!runId && w.sourcing.done)) && <Button variant="primary" onClick={() => navigate('/r/compare')}>Compare the {w.mandate.shortlist.length} people</Button>}
      </section>

      <section className="split-art paper" aria-label="Search progress and early results">
        <div className="stack gap-10" style={{ maxWidth: 760 }}>
          <div className="stack gap-4">
            <Label as="h2">Steps</Label>
            {view.steps.length ? <RunSteps steps={view.steps} /> : <p className="muted">{w.sourcing.done ? `Finished earlier: ${SOURCE_POOL.length} profiles read, ${w.sourcing.found.length} shortlisted.` : 'Steps appear here as Q starts each one.'}</p>}
          </div>
          <div className="stack gap-4">
            <div className="row between"><Label as="h2">Early results · {found.length}</Label>{read && <span className="t-mono subtle">{read.done} of {read.total} read</span>}</div>
            {found.length === 0 && <p className="muted">Nobody yet. People appear here as soon as Q finds them; you don’t have to wait for the whole search.</p>}
            <ul className="stack gap-3">
              {found.map((pid) => { const p = PEOPLE.find((x) => x.personId === pid)!; return (
                <li key={pid}><Arrive><div className="panel row between gap-4 wrap" style={{ padding: 18 }}>
                  <div className="stack"><span style={{ fontWeight: 600 }}>{p.name}</span><span className="t-caption">{p.headline} · {p.location}</span></div>
                  <Link to="/r/compare" className="btn btn-secondary btn-compact">Evidence</Link>
                </div></Arrive></li>); })}
            </ul>
          </div>
          {w.sourcing.failedSource && <Banner tone="warn" title="One source was unavailable">PeopleGraph rate-limited the search. Results come from 2 of 3 sources. Q will retry it tonight and tell you if anyone new appears.</Banner>}
        </div>
      </section>
    </main>
  );
}
