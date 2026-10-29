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
  { id: 'roles', label: 'Roles and briefs', test: (e) => /^(mandate|org)\./.test(e.type) },
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
  if (!org) return <Canvas title="Nothing recorded yet" kicker="Audit log" open onClose={openQ}><section className="ds-sheet hire-a-empty"><p style={{ margin: 0 }}>The audit log shows what people and Q did in your organisation. Set up your business with Q first.</p></section></Canvas>;
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
    <Canvas title={filtered ? `${list.length} of ${all.length} recorded actions` : `${all.length} recorded actions at ${org.name}`} kicker="Audit log" open onClose={openQ}>
      <section className="ds-sheet" aria-label="Filters" style={{ display: 'grid', gap: 12 }}>
        <div className="hire-a-filters">
          <div className="ds-field"><label htmlFor="au-who">Person</label>
            <select id="au-who" className="ds-input" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="all">Everyone</option>
              {people.map((p) => { const x = w.actors.find((y) => y.id === p); return <option key={p} value={p}>{actorName(w, p)}{x?.role ? ` (${ROLE_LABEL[x.role]})` : p === 'q' ? ' (assistant)' : ''}</option>; })}
            </select></div>
          <div className="ds-field"><label htmlFor="au-type">Kind of action</label>
            <select id="au-type" className="ds-input" value={type} onChange={(e) => setType(e.target.value)}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></div>
          <div className="ds-field"><label htmlFor="au-q">Words</label><input id="au-q" className="ds-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. panel" /></div>
        </div>

        <div role="group" aria-label="Day" className="hire-a-chips">{(['all', 'today', 'yesterday'] as const).map((d) => <button key={d} type="button" className="ds-filter" aria-pressed={day === d} onClick={() => setDay(d)}>{d === 'all' ? 'Any day' : d === 'today' ? 'Today' : 'Yesterday'}</button>)}
          {filtered && <button type="button" className="ds-btn quiet" onClick={() => { setWho('all'); setType('all'); setQ(''); setDay('all'); }}>Clear filters</button>}</div>
      </section>
      <p className="t14 muted" style={{ margin: 0 }} aria-live="polite">Showing {list.length} {list.length === 1 ? 'action' : 'actions'}. Only {org.name}’s activity is here; other organisations’ is never shown. Actions marked “Q” were done by the assistant; sends and bookings are simulated.</p>
      {!list.length && <section className="ds-sheet hire-a-empty"><p style={{ margin: 0 }}>{all.length ? 'Nothing matches these filters.' : 'Nothing recorded yet.'}</p></section>}
      {Object.entries(groups).map(([d, evs]) => (
        <section key={d} className="ds-sheet" aria-label={label(d)} style={{ display: 'grid', gap: 4 }}>
          <h2 className="lab" style={{ margin: '0 0 6px' }}>{label(d)}</h2>
          <ol className="hire-a-audit">
            {evs.map((e) => (
              <li key={e.id}>
                <span className="num hire-a-time">{timeLabel(e.at, tz)}</span>
                <span style={{ minWidth: 0 }}><b>{actorName(w, e.actor)}</b> <span className="ds-tag" style={{ marginLeft: 4 }}>{kindOf(e)}</span><span style={{ display: 'block' }}>{e.text}</span></span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Canvas>
  );
}
