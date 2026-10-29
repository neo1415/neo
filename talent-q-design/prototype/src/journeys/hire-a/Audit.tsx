// /r/audit: who did what in this organisation, in plain words. Built from the one event log (w.events),
// limited to the signed-in person's organisation (tenant isolation). Filters by person, kind and day survive
// navigation, and Q can set them ("who changed the panel", "what did you do yesterday").
import { useEffect } from 'react';
import { actorOf, simNow, useWorld } from '../../mock/world';
import type { DomainEvent } from '../../state/domain';
import { Canvas } from '../../ds/Workspace';
import { useViewState } from '../../q/core/engine';
import { actorName, ensureSeeded, ROLE_LABEL, timeLabel } from './model';
import { openQ } from './ui';

const KINDS: { id: string; label: string; test: (e: DomainEvent) => boolean }[] = [
  { id: 'all', label: 'Everything', test: () => true },
  { id: 'roles', label: 'Roles and briefs', test: (e) => /^(mandate|org|job)\./.test(e.type) },
  { id: 'people', label: 'Candidates', test: (e) => /^(pipeline|search|evidence|q\.search)\./.test(e.type) },
  { id: 'messages', label: 'Messages', test: (e) => /^(message|outreach|request)\./.test(e.type) },
  { id: 'interviews', label: 'Interviews and panels', test: (e) => /^(interview|calendar|scheduling)\./.test(e.type) },
  { id: 'policy', label: 'Policy, fairness and permissions', test: (e) => /^(policy|settings|q\.policy|q\.permission|q\.prefs)\./.test(e.type) },
  { id: 'memory', label: 'Memory', test: (e) => /^memory\./.test(e.type) },
];
const kindOf = (e: DomainEvent) => KINDS.slice(1).find((k) => k.test(e))?.label ?? 'Other';

export function Audit() {
  useEffect(() => { ensureSeeded(); }, []);
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const org = w.orgs.find((o) => o.id === a.orgId);
  const [who, setWho] = useViewState('who', 'all');
  const [type, setType] = useViewState('type', 'all');
  const [q, setQ] = useViewState('q', '');
  const [day, setDay] = useViewState<'all' | 'today' | 'yesterday'>('day', 'all');
  if (!org) return <Canvas title="Audit log" kicker="Your organisation" open onClose={openQ}><section className="ds-sheet hire-a-empty"><h2 className="voice t24" style={{ margin: 0 }}>Nothing recorded yet</h2><p style={{ margin: 0 }}>The audit log shows what people and Q did in your organisation. Set up your business with Q first.</p></section></Canvas>;
  const tz = a.timezone;
  const dstr = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
  const today = dstr(simNow(w).toISOString());
  const yest = dstr(new Date(simNow(w).getTime() - 864e5).toISOString());
  const all = w.events.filter((e) => e.scope === `ORG:${org.id}` || e.scope.startsWith(`SHARED:${org.id}:`)).sort((x, y) => y.at.localeCompare(x.at));
  const people = [...new Set(all.map((e) => e.actor))];
  const kind = KINDS.find((k) => k.id === type) ?? KINDS[0];
  const term = q.trim().toLowerCase();
  const list = all.filter((e) => (who === 'all' || e.actor === who) && kind.test(e) && (!term || e.text.toLowerCase().includes(term) || e.type.includes(term)) && (day === 'all' || dstr(e.at) === (day === 'today' ? today : yest)));
  const groups = list.reduce<Record<string, DomainEvent[]>>((g, e) => { (g[dstr(e.at)] ??= []).push(e); return g; }, {});
  const label = (d: string) => (d === today ? 'Today' : d === yest ? 'Yesterday' : new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }));
  const filtered = who !== 'all' || type !== 'all' || !!term || day !== 'all';
  return (
    <Canvas title={filtered ? `${list.length} of ${all.length} actions` : 'Audit log'} kicker={org.name} open onClose={openQ}
      aside={<span className="ds-tag num">{all.length} recorded</span>}>
      <div aria-label="Filters" role="search" style={{ display: 'grid', gap: 10 }}>
        <div className="hire-a-auditbar">
          <div className="ds-field"><label htmlFor="au-who">Person</label>
            <select id="au-who" className="ds-input" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="all">Everyone</option>
              {people.map((p) => { const x = w.actors.find((y) => y.id === p); return <option key={p} value={p}>{actorName(w, p)}{x?.role ? ` (${ROLE_LABEL[x.role]})` : p === 'q' ? ' (assistant)' : ''}</option>; })}
            </select></div>
          <div className="ds-field"><label htmlFor="au-type">Kind of action</label>
            <select id="au-type" className="ds-input" value={type} onChange={(e) => setType(e.target.value)}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></div>
          <div className="ds-field words"><label htmlFor="au-q">Words</label><input id="au-q" type="search" className="ds-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. panel" /></div>
        </div>
        <div role="group" aria-label="Day" className="hire-a-chips">{(['all', 'today', 'yesterday'] as const).map((d) => <button key={d} type="button" className="ds-filter" aria-pressed={day === d} onClick={() => setDay(d)}>{d === 'all' ? 'Any day' : d === 'today' ? 'Today' : 'Yesterday'}</button>)}
          {filtered && <button type="button" className="ds-btn quiet" onClick={() => { setWho('all'); setType('all'); setQ(''); setDay('all'); }}>Clear filters</button>}</div>
      </div>
      <p className="t14 muted" style={{ margin: 0 }} aria-live="polite">{filtered ? `${list.length} ${list.length === 1 ? 'action matches' : 'actions match'}.` : `Everything people and Q did at ${org.name}, newest first.`} Other organisations’ activity is never shown. Sends and bookings are simulated.</p>
      {!list.length ? (
        <section className="ds-sheet hire-a-empty">
          <h2 className="voice t24" style={{ margin: 0 }}>{all.length ? 'Nothing matches these filters' : 'Nothing recorded yet'}</h2>
          <p style={{ margin: 0 }}>{all.length ? 'Try another day or person, or clear the filters.' : 'When someone changes a role, approves something, or Q acts for you, it appears here.'}</p>
          {filtered && <button type="button" className="ds-btn" onClick={() => { setWho('all'); setType('all'); setQ(''); setDay('all'); }}>Clear filters</button>}
        </section>
      ) : (
        <div className="ds-sheet hire-a-days">
          {Object.entries(groups).map(([d, evs]) => (
            <section key={d} aria-label={label(d)}>
              <h2 className="lab">{label(d)}</h2>
              <ol className="hire-a-audit">
                {evs.map((e) => (
                  <li key={e.id}>
                    <span className="num hire-a-time">{timeLabel(e.at, tz)}</span>
                    <span style={{ minWidth: 0 }}><span className="who"><b>{actorName(w, e.actor)}</b><span className="kind">{kindOf(e)}</span></span><span style={{ display: 'block' }}>{e.text}</span></span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Canvas>
  );
}
