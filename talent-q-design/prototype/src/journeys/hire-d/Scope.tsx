// SC-033 Search scope & data source selector (/r/sourcing/scope; extends /r/sourcing, whose runs read this scope
// through Explore and Q). Permitted sources only, each with why Talent Q may use it, its licence, freshness and
// coverage; what is NOT used (LinkedIn extraction, bought lists, third-party directories) is said plainly.
import { useState } from 'react';
import { actorOf, orgOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { SwitchRow } from '../../ds/Switch';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hd } from '../../state/areas/hire-d';
import { can, coverage, freshness, NOT_USED, scopeOn, sourcesFor } from './model';

const STATE_WORD = { LIVE: 'Live', OK: 'Fresh', STALE: 'Stale', ERROR: 'Not refreshed' } as const;

export function Scope() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const [checking, setChecking] = useState(false);
  if (!a.orgId) return <Canvas title="Where Q searches" kicker="Search" open onClose={() => {}}><section className="ds-sheet hd-empty"><b>Join an organisation to choose search sources.</b></section></Canvas>;
  const org = orgOf(w, a.orgId)!;
  const list = sourcesFor(w, a.orgId); const on = scopeOn(w, a.orgId);
  const edit = can(a, ['OWNER', 'ADMIN', 'RECRUITER']);
  const set = (source: string, v: boolean) => void runAction({ label: 'Scope', act: { t: 'do', op: 'hd.scope.set', args: { source, on: v } } });
  const recheck = () => { setChecking(true); setTimeout(() => { setChecking(false); void runAction({ label: 'Recheck', act: { t: 'do', op: 'hd.scope.recheck' } }); }, 500); };
  const last = hd(w).scope[a.orgId];
  return (
    <Canvas title="Where Q searches" kicker={`${org.name} · search sources`} open onClose={() => {}} qLine={`${on.length} of ${list.length} sources on. LinkedIn is never used.`}
      aside={<span className="ds-actions"><Link to="/r/explore" className="ds-btn quiet">Explore talent</Link><Link to="/r/sourcing" className="ds-btn quiet">Search runs</Link></span>}>
      {!edit && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>You can see the sources, but only an owner, admin or recruiter can change them.</span><span /></div>}
      {hd(w).sourceDown && <div className="ds-banner" data-k="warn" role="alert"><Glyph k="unclear" /><span><b>Evidence links couldn’t be refreshed.</b> Q keeps the last good check and labels its date. Try again later; nothing is guessed in the meantime.</span><button type="button" className="ds-btn quiet" onClick={recheck}>Try again</button></div>}
      <section className="ds-sheet hd-sec" aria-labelledby="sc-h" aria-busy={checking}>
        <div className="hd-head"><h2 id="sc-h" className="voice t24">Sources Q may use</h2><button type="button" className="ds-btn quiet" onClick={recheck} disabled={checking}>{checking ? 'Checking…' : 'Check freshness now'}</button></div>
        <div className="ds-table-wrap hd-desk">
          <table className="ds-table hd-srctable">
            <caption className="sr">Each permitted source, why it may be used, its licence, freshness, coverage and whether it is on</caption>
            <thead><tr><th scope="col">Source</th><th scope="col">Why Q may use it</th><th scope="col">Licence</th><th scope="col">Freshness</th><th scope="col" className="num">People</th><th scope="col">In searches</th></tr></thead>
            <tbody>{list.map((s) => { const f = freshness(w, a.orgId!, s); const n = coverage(w, a.orgId!, s.id); return (
              <tr key={s.id} data-src={s.id}>
                <th scope="row">{s.label}{s.enrich && <span className="t14 muted hd-block">Adds checks to people found elsewhere</span>}</th>
                <td>{s.basis}</td><td className="t14">{s.licence}</td>
                <td><span className="hd-fresh" data-s={f.state}>{STATE_WORD[f.state]}</span><span className="t14 muted hd-block">{f.label}</span></td>
                <td className="num">{n === null ? 'Unknown' : n}{s.id === 'records' && <span className="t14 muted hd-block">simulated count</span>}</td>
                <td>{edit ? <button type="button" role="switch" aria-checked={on.includes(s.id)} className="ds-switch" aria-label={`Use ${s.label}`} onClick={() => set(s.id, !on.includes(s.id))}><span className="knob" aria-hidden="true" /><span className="state">{on.includes(s.id) ? 'On' : 'Off'}</span></button> : <span>{on.includes(s.id) ? 'On' : 'Off'}</span>}</td>
              </tr>); })}</tbody>
          </table>
        </div>
        <ul className="hd-cards hd-phone" aria-label="Sources">
          {list.map((s) => { const f = freshness(w, a.orgId!, s); const n = coverage(w, a.orgId!, s.id); return (
            <li key={s.id} className="hd-card" data-src={s.id}>
              {edit ? <SwitchRow label={s.label} help={`${s.basis}. ${s.licence}.`} on={on.includes(s.id)} onChange={(v) => set(s.id, v)} /> : <p style={{ margin: 0 }}><b>{s.label}</b> · {on.includes(s.id) ? 'On' : 'Off'}<span className="t14 muted hd-block">{s.basis}. {s.licence}.</span></p>}
              <p className="t14" style={{ margin: 0 }}><span className="hd-fresh" data-s={f.state}>{STATE_WORD[f.state]}</span> {f.label} · {n === null ? 'Unknown' : n} {s.id === 'records' ? 'records (simulated count)' : n === 1 ? 'person' : 'people'}</p>
            </li>); })}
        </ul>
        {last && <p className="t14 muted" style={{ margin: 0 }}>Last changed by {w.actors.find((x) => x.id === last.by)?.name}. Say “undo” to reverse the last change.</p>}
      </section>
      <section className="ds-sheet hd-sec" aria-labelledby="nu-h">
        <div className="hd-head"><h2 id="nu-h" className="voice t24">Not used</h2><span className="t14 muted">Decided 30 Oct</span></div>
        <ul className="hd-list hd-notused">{NOT_USED.map((x) => <li key={x.id} className="hd-row" data-src={x.id}><span className="hd-rowmain"><b><Glyph k="none" size={14} /> {x.label}</b><span className="t14">{x.why}</span></span></li>)}</ul>
      </section>
      <section className="ds-sheet hd-testing" aria-labelledby="sc-t">
        <h2 id="sc-t" className="lab" style={{ margin: 0 }}>Testing</h2>
        <SwitchRow label="The evidence-link check fails" help="Shows how a source error looks. Simulated." on={hd(w).sourceDown} onChange={(v) => void runAction({ label: 'Down', act: { t: 'do', op: 'hd.scope.down', args: { on: v } } })} />
      </section>
    </Canvas>
  );
}
