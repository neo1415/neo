// SC-034 Explore Talent landing and SC-046 Search empty state (a state of this page, not a separate screen).
// Reads: the organisation's roles (curated mandates), its saved discoveries, its search scope (SC-033) and the
// people it may see (canSeeCandidate, re-checked on every render). Loading is a short, labelled local read.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, orgOf, personOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { arrive } from '../../ds/motion';
import { runAction, useViewState } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hd } from '../../state/areas/hire-d';
import { STATUS_PLAIN } from '../hire-a/model';
import { emptyReasons, mandatesOf, newSince, pipelineCount, scopeOn, search, SOURCE_SHORT, SOURCES, sourcesFor, type Hit, type SourceId } from './model';

const SRC_SHORT: Record<SourceId, string> = { applicants: 'Applied', shared: 'Shared with you', discoverable: 'Open to being found', registered: 'Registered with you', records: 'Your records', evidence: 'Evidence link' };

export function Explore() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const [q, setQ] = useViewState<string>('q', '');
  const [text, setText] = useState(q);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setText(q); if (!q) return; setLoading(true); const t = setTimeout(() => setLoading(false), 350); return () => clearTimeout(t); }, [q]);
  if (!a.orgId) return <Canvas title="Explore talent" kicker="Hiring" open onClose={() => {}}><section className="ds-sheet hd-empty"><b>Join or create an organisation to explore talent.</b></section></Canvas>;
  const org = orgOf(w, a.orgId)!;
  const on = scopeOn(w, a.orgId); const all = sourcesFor(w, a.orgId);
  const roles = mandatesOf(w, a.orgId);
  const saved = hd(w).saved.filter((s) => s.orgId === a.orgId);
  const hits = q ? search(w, a.orgId, q) : [];
  const canSave = ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER');
  const statusOf = (id: string) => (id === w.mandate.mandateId ? w.mandate.status : w.mandates.find((m) => m.id === id)?.status) as keyof typeof STATUS_PLAIN | undefined;
  const run = (query: string) => setQ(query.trim());
  return (
    <Canvas title="Explore talent" kicker={`${org.name} · roles and saved discovery`} open onClose={() => {}} qLine={q ? `${hits.length} found for “${q}”.` : 'Search your permitted sources, or open a saved discovery.'}
      aside={<Link to="/r/sourcing/scope" className="ds-btn">Sources · {on.length} of {all.length}</Link>}>
      <form className="ds-sheet hd-searchbar" role="search" onSubmit={(e) => { e.preventDefault(); run(text); }}>
        <label htmlFor="hd-q" className="lab">Who are you looking for?</label>
        <div className="hd-searchrow">
          <input id="hd-q" className="ds-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. postgres, or support lead in Lagos" />
          <button type="submit" className="ds-btn primary">Search</button>
          {q && <button type="button" className="ds-btn quiet" onClick={() => { setText(''); setQ(''); }}>Clear</button>}
        </div>
        <p className="t14 muted" style={{ margin: 0 }}>Searches {on.length} permitted source{on.length === 1 ? '' : 's'}: {all.filter((s) => on.includes(s.id)).map((s) => SOURCE_SHORT[s.id]).join(', ')}. LinkedIn isn’t used. Nobody is contacted.</p>
      </form>
      {hd(w).sourceDown && <div className="ds-banner" data-k="warn" role="status"><Glyph k="unclear" /><span><b>One source didn’t refresh.</b> Evidence links show their last good check. Everything else is live.</span><Link to="/r/sourcing/scope" className="ds-btn quiet">See sources</Link></div>}

      {q && loading && <section className="ds-sheet hd-loading" aria-busy="true" aria-live="polite"><span className="lab">Reading {on.length} sources (simulated, in this browser)</span><div className="ds-skeleton" style={{ height: 18 }} /><div className="ds-skeleton" style={{ height: 18, width: '70%' }} /></section>}
      {q && !loading && hits.length > 0 && <Results hits={hits} q={q} canSave={canSave} orgId={a.orgId} />}
      {q && !loading && hits.length === 0 && <EmptySearch q={q} orgId={a.orgId} onQuery={run} />}

      {!q && (
        <>
          <section className="ds-sheet hd-sec" aria-labelledby="ex-roles">
            <div className="hd-head"><h2 id="ex-roles" className="voice t24">Your roles</h2><span className="t14 muted">{roles.length ? `${roles.length} open or in progress` : ''}</span></div>
            {!roles.length ? <div className="hd-empty"><b>No roles yet.</b><span className="t14 muted">Tell Q who you need. Explore fills in once a role brief exists.</span><Link to="/r/roles" className="ds-btn">Go to roles</Link></div> : (
              <ul className="hd-list">
                {roles.map((m) => { const st = statusOf(m.id); return (
                  <li key={m.id} className="hd-row">
                    <span className="hd-rowmain"><b>{m.title}</b><span className="t14 muted">{st ? STATUS_PLAIN[st] : 'Open'} · {pipelineCount(w, m.id)} in the pipeline</span></span>
                    <span className="ds-actions">
                      <Link to={`/r/roles/${m.id}`} className="ds-btn quiet">Brief<span className="sr"> for {m.title}</span></Link>
                      <Link to="/r/pipeline" className="ds-btn quiet">Pipeline<span className="sr"> for {m.title}</span></Link>
                      <button type="button" className="ds-btn" onClick={() => run(m.title.replace(/\(.*\)|,.*$/g, '').replace(/\b(senior|junior|lead|i|ii)\b/gi, '').trim())}>Explore<span className="sr"> people for {m.title}</span></button>
                    </span>
                  </li>); })}
              </ul>
            )}
          </section>
          <section className="ds-sheet hd-sec" aria-labelledby="ex-saved">
            <div className="hd-head"><h2 id="ex-saved" className="voice t24">Saved discovery</h2><span className="t14 muted">Re-run against today’s permissions each time</span></div>
            {!saved.length ? <div className="hd-empty"><b>Nothing saved yet.</b><span className="t14 muted">Search above, then save it. Q shows who’s new when you come back.</span></div> : (
              <ul className="hd-list">
                {saved.map((s) => { const n = newSince(w, a.orgId!, s.id); return (
                  <li key={s.id} className="hd-row">
                    <span className="hd-rowmain"><b>{s.label}</b><span className="t14 muted">“{s.query}” · saved by {w.actors.find((x) => x.id === s.by)?.first} · {n.hits.length} {n.hits.length === 1 ? 'match' : 'matches'}{n.fresh.length ? `, ${n.fresh.length} new since last look` : ''}</span></span>
                    <span className="ds-actions">
                      <button type="button" className="ds-btn" onClick={() => { void runAction({ label: 'Seen', act: { t: 'do', op: 'hd.explore.seen', args: { id: s.id, pids: n.hits.map((h) => h.pid) } } }); run(s.query); }}>Show<span className="sr"> {s.label}</span></button>
                    </span>
                  </li>); })}
              </ul>
            )}
          </section>
        </>
      )}
    </Canvas>
  );
}

function Results({ hits, q, canSave, orgId }: { hits: Hit[]; q: string; canSave: boolean; orgId: string }) {
  const w = useWorld((x) => x);
  const already = hd(w).saved.some((s) => s.orgId === orgId && s.query === q);
  return (
    <motion.section className="ds-sheet hd-sec" aria-labelledby="ex-res" {...arrive}>
      <div className="hd-head"><h2 id="ex-res" className="voice t24">{hits.length} {hits.length === 1 ? 'person' : 'people'} for “{q}”</h2>
        {canSave && !already && <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Save', act: { t: 'do', op: 'hd.explore.save', args: { query: q, seen: hits.map((h) => h.pid) } } })}>Save this search</button>}
        {already && <span className="t14 muted">Saved</span>}
      </div>
      <ul className="hd-list">
        {hits.map((h) => { const p = personOf(w, h.pid)!; return (
          <li key={h.pid} className="hd-row">
            <span className="hd-rowmain"><b>{p.name}</b><span className="t14 muted">{p.headline} · {p.location}</span><span className="hd-tags">{h.sources.map((s) => <span key={s} className="ds-tag">{SRC_SHORT[s]}</span>)}</span></span>
            <Link to={`/r/people/${h.pid}`} className="ds-btn quiet">Evidence<span className="sr"> for {p.name}</span></Link>
          </li>); })}
      </ul>
      <p className="t14 muted" style={{ margin: 0 }}>Matched on words in their profile and the evidence they chose to share, not a score. People who chose not to be found are never shown or counted.</p>
    </motion.section>
  );
}

/** SC-046: reasons, repairs and other ways to find people. Never blames the person searching or the candidates. */
function EmptySearch({ q, orgId, onQuery }: { q: string; orgId: string; onQuery: (q: string) => void }) {
  const w = useWorld((x) => x);
  const r = emptyReasons(w, orgId, q);
  return (
    <motion.section className="ds-sheet hd-sec hd-nores" aria-labelledby="ex-none" {...arrive}>
      <div className="hd-head"><h2 id="ex-none" className="voice t24">No one found for “{q}”</h2></div>
      <div className="hd-cols">
        <div><h3 className="lab">Why</h3><ul className="hd-bul">{r.reasons.map((x) => <li key={x}>{x}</li>)}<li className="muted">People who chose not to be found aren’t shown or counted.</li></ul></div>
        <div><h3 className="lab">Try</h3><div className="hd-stack">{r.repairs.map((x) => <button key={x.label} type="button" className="ds-btn" onClick={() => { if (x.include) void runAction({ label: x.label, act: { t: 'do', op: 'hd.scope.set', args: { source: x.include, on: true } } }); if (x.query !== undefined) onQuery(x.query); }}>{x.label}</button>)}</div></div>
        <div><h3 className="lab">Other ways to find people</h3><div className="hd-stack">{r.alternates.map((x) => 'to' in x && x.to ? <Link key={x.label} to={x.to} className="ds-btn quiet">{x.label}</Link> : <button key={x.label} type="button" className="ds-btn quiet" onClick={() => void runAction({ label: x.label, act: { t: 'say', text: (x as { say: string }).say } })}>{x.label}</button>)}</div></div>
      </div>
      <p className="t14 muted" style={{ margin: 0 }}>Sources searched: {SOURCES.filter((s) => scopeOn(w, orgId).includes(s.id)).map((s) => SOURCE_SHORT[s.id]).join(', ')}. <Link to="/r/sourcing/scope">Change sources</Link></p>
    </motion.section>
  );
}
