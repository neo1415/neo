// P4 · SC-036 Search progress explorer, SC-045 agent execution, SC-120 run states, SC-181 resume.
// The search results are the canvas; Q's commentary arrives in the one global conversation. Every number
// here comes from a run event. Partial results appear as soon as they exist.
import { PEOPLE, SOURCE_POOL } from '../mock/fixtures';
import { useNamedRun, useRun } from '../mock/runtime';
import { actorOf, canSeeCandidate, useWorld } from '../mock/world';
import { Canvas } from '../ds/Workspace';
import { Glyph } from '../ds/Glyph';
import { QMark } from '../ds/QMark';
import { Arrive, Label, RunSteps } from '../ui/kit';
import { Link } from '../ui/router';
import { startSourcingWithQ, orgMandates, STATUS_PLAIN } from '../journeys/hire-a/model';
import { openQ } from '../journeys/hire-a/ui';
import { readA } from '../state/areas/hire-a';

export function Sourcing() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const runId = useNamedRun('sourcing');
  const view = useRun(runId, w.network);
  if (a.orgId !== 'org_kora') return <OtherOrgSearch />;
  const interrupted = !runId && w.sourcing.cursor > 0 && !w.sourcing.done;
  const notStarted = !runId && w.sourcing.cursor === 0;
  // Cached results are re-checked against each person's privacy settings every time they're shown.
  const found = (runId ? view.findings.filter((f) => f.kind === 'candidate').map((f) => f.ref) : w.sourcing.found).filter((pid) => canSeeCandidate(w, pid, 'org_kora'));
  const read = view.steps.find((s) => s.stepId === 'read');
  const progress = view.steps.length ? view.steps.reduce((x, s) => x + (s.total ? s.done / s.total : s.result === 'DONE' ? 1 : 0), 0) / 5 : 0;
  const done = view.completed || (!runId && w.sourcing.done);
  const mood = w.network === 'offline' ? 'offline' : done ? 'done' : view.failure ? 'blocked' : runId ? 'working' : 'idle';
  return (
    <Canvas title={done ? `${w.sourcing.found.length} people to compare` : runId ? `Searching · ${found.length} found so far` : notStarted ? 'Search hasn’t started' : 'Search for Senior Backend'} kicker={<>Search · {w.mandate.title}</>} open onClose={openQ}
      qLine={done ? 'Search finished. Compare them next.' : runId ? 'Searching. You can leave this page.' : w.mandate.status === 'DRAFT' ? 'Approve the brief to start.' : 'Ready to search.'}
      aside={<span style={{ display: 'flex', gap: 8, alignItems: 'center' }} aria-live="polite"><QMark mood={mood} size={32} agents={runId && !done ? [{ label: 'Search', done: Math.round(progress * 5), total: 5 }] : []} /><span className="t14 muted">{done ? 'Done' : runId ? `${Math.round(progress * 100)}%` : 'Not running'}</span></span>}>
      <div className="hire-a-legacy">
        {notStarted && (
          <section className="ds-sheet hire-a-start" aria-labelledby="src-start">
            <h2 id="src-start" className="voice t24" style={{ margin: 0 }}>{w.mandate.status === 'DRAFT' ? 'Approve the brief and Q starts searching' : 'Ready when you are'}</h2>
            <p style={{ margin: 0 }}>Q reads profiles from the sources your organisation allows (see <a href="#/r/sourcing/scope">Search sources</a>), checks each person against the brief’s requirements, and shows people here as soon as it finds them. Nobody is contacted.</p>
            <ol><li>Reads profiles shared with Kora Pay and open to offers</li><li>Checks each requirement, hardest first</li><li>Shows early results while it works</li></ol>
            {w.mandate.status === 'DRAFT' ? <Link to="/r/mandate" className="ds-btn primary">Review the brief</Link> : <button type="button" className="ds-btn primary" onClick={() => startSourcingWithQ()}>Start the search</button>}
          </section>
        )}
        {interrupted && (
          <div className="ds-banner hire-a-banner" data-k="warn" role="status"><Glyph k="partial" /><span><b>This search was interrupted.</b> Q had read {w.sourcing.cursor} of {SOURCE_POOL.length} profiles when the page closed. It will carry on from profile {w.sourcing.cursor + 1}, not start again.</span><button type="button" className="ds-btn primary" onClick={() => startSourcingWithQ()}>Resume</button></div>
        )}
        {!notStarted && <section className="ds-sheet" aria-labelledby="src-steps" style={{ display: 'grid', gap: 12 }}>
          <Label as="h2" id="src-steps">Steps</Label>
          {view.steps.length ? <RunSteps steps={view.steps} /> : <p className="muted" style={{ margin: 0 }}>{w.sourcing.done ? `Finished earlier: ${SOURCE_POOL.length} profiles read, ${w.sourcing.found.length} shortlisted.` : 'Steps appear here as Q starts each one.'}</p>}
        </section>}
        {!notStarted && <section className="ds-sheet" aria-labelledby="src-res" style={{ display: 'grid', gap: 12 }}>
          <div className="row between"><Label as="h2" id="src-res">Early results · {found.length}</Label>{read && <span className="t-mono subtle">{read.done} of {read.total} read</span>}</div>
          {found.length === 0 && <p className="muted" style={{ margin: 0 }}>Nobody yet. People appear here as soon as Q finds them; you don’t have to wait for the whole search.</p>}
          <ul className="stack gap-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {found.map((pid) => { const p = PEOPLE.find((x) => x.personId === pid)!; return (
              <li key={pid}><Arrive><div className="row between gap-4 wrap" style={{ padding: '12px 0', borderTop: '1px solid var(--rule)' }}>
                <div className="stack" style={{ minWidth: 0 }}><span style={{ fontWeight: 600 }}>{p.name}</span><span className="t-caption">{p.headline} · {p.location}</span></div>
                <Link to="/r/compare" className="ds-btn">Evidence</Link>
              </div></Arrive></li>); })}
          </ul>
        </section>}
        {w.sourcing.failedSource && <div className="ds-banner" data-k="warn" role="status"><Glyph k="unclear" /><span><b>One source was unavailable.</b> The check of evidence links candidates added timed out. Results come from 2 of 3 sources. Q will retry it tonight and tell you if anyone new appears.</span></div>}
        {done && <Link to="/r/compare" className="ds-btn primary" style={{ justifySelf: 'start' }}>Compare the {w.mandate.shortlist.length || w.sourcing.found.length} people</Link>}
        {view.failure && <p className="t14" role="alert" style={{ margin: 0, color: 'var(--risk)' }}>{view.failure.message}</p>}
      </div>
    </Canvas>
  );
}

/** Other organisations don't see Kora's search; they see their own roles' searches. */
function OtherOrgSearch() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const ms = orgMandates(w, a);
  return (
    <Canvas title={ms.length ? 'Search for your roles' : 'Search'} kicker="Search" open onClose={openQ}>
      <section className="ds-sheet hire-a-empty">
        {!ms.length && <h2 className="voice t24" style={{ margin: 0 }}>Nothing to search for yet</h2>}
        {ms.length ? <ul className="hire-a-list" style={{ width: '100%' }}>{ms.map((m) => <li key={m.id} className="hire-a-row"><span><b>{m.title}</b> · {STATUS_PLAIN[m.status]}{readA(w).search[m.id] ? ` · ${readA(w).search[m.id].found.length} found` : ''}</span><Link to={`/r/roles/${m.id}`} className="ds-btn">Open</Link></li>)}</ul>
          : <p style={{ margin: 0 }}>Q searches once you have an approved role brief. Tell Q who you need, or what you need help with.</p>}
      </section>
    </Canvas>
  );
}
