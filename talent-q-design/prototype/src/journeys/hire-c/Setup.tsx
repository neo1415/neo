// /r/setup: the organisation, what Q may do alone (delegation), and editable guidelines. Each guideline shows
// whether Q can check it, how often Q used it and where it was last used, so its effect is visible.
import { useState } from 'react';
import { actorOf, emit, orgOf, update, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import type { Org } from '../../state/domain';
import type { Guide } from '../../state/areas/hire-c';
import { SwitchRow } from '../../ds/Switch';
import { guidesOf, IS_ADMIN } from './lib';

const CHECK_LABEL = { PAY_BAND: 'Q checks every first message', PANEL_TWO: 'Q checks every engineering panel', APPROVE_EACH: 'Q asks for a yes on each send', JOB_RELATED: 'Q checks the wording', HOURS: 'Q only proposes times inside these hours', NONE: 'Guidance: Q cites it, can’t check it' } as const;
function GuideMeta({ g }: { g: Guide }) {
  return <><span className="hc-gtag" data-k={g.check === 'NONE' ? 'guide' : 'check'}>{g.on ? CHECK_LABEL[g.check] : 'Off: Q ignores it'}</span> {g.source} · v{g.v} · <span>{g.used ? `Used by Q ${g.used} time${g.used === 1 ? '' : 's'}${g.lastUsed ? `, last in “${g.lastUsed}”` : ''}` : 'Not used yet'}</span></>;
}
const DELEG: [Org['delegation'], string, string][] = [['DRAFT_ONLY', 'Draft only', 'Q writes; people send it themselves.'], ['APPROVE_EACH_SEND', 'Approve each send', 'Q sends each message only after an approver says yes.'], ['APPROVED_CAMPAIGN', 'Approved campaigns', 'Q sends within limits an admin sets: template, audience, number and end date.']];

export function Setup() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const o = orgOf(w, a.orgId);
  const admin = IS_ADMIN.includes(a.role ?? 'VIEWER');
  const gs = guidesOf(w, a.orgId);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [add, setAdd] = useState('');
  if (!o) return <Canvas title="Organisation" kicker="Setup" open onClose={() => {}}><p>Tell Q about your business to set up your organisation.</p></Canvas>;
  const setDeleg = (v: Org['delegation']) => update((d) => { const oo = d.orgs.find((x) => x.id === o.id)!; oo.delegation = v; if (o.id === 'org_kora') d.org.delegation = v; emit(d, a.id, 'org.delegation.changed', `ORG:${o.id}`, `${a.name} set what Q may do alone to “${DELEG.find((x) => x[0] === v)![1]}”.`); });
  return (
     <Canvas title="Organisation and policy" kicker={o.name} open onClose={() => {}} aside={<Link to="/r/setup/handbook" className="ds-btn">Read a handbook</Link>}>
      {!admin && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>Only admins change these. Q follows them for everyone at {o.name}, including you.</span><span /></div>}
      <section className="ds-sheet hc-orgcard" aria-labelledby="org-h">
        <h2 id="org-h" className="voice t24" style={{ margin: 0 }}>{o.name}</h2>
        <span className="t14 muted">{o.industry} · {o.size} · {o.city}</span>
        <span className="hc-tags"><span className="ds-tag" data-k={o.verified.domain ? 'ok' : 'warn'}>{o.verified.domain ? '✓ Email domain verified' : 'Email domain not verified'}</span><span className="ds-tag" data-k={o.verified.registry === 'VERIFIED' ? 'ok' : 'warn'}>{o.verified.registry === 'VERIFIED' ? '✓ Company registry verified' : `Company registry: ${o.verified.registry.toLowerCase()}`}</span></span>
      </section>
      <section className="ds-sheet" aria-labelledby="gl-h" style={{ display: 'grid', gap: 12 }}>
        <div><h2 id="gl-h" className="voice t24" style={{ margin: 0 }}>Guidelines</h2><p className="t14 muted" style={{ margin: '4px 0 0' }}>Q cites these when it drafts and checks the ones it can before anything is sent. Turning one off changes the next draft, not ones already written.</p></div>
        <ul className="hc-guides">
          {gs.map((g) => (
            <li key={g.id} data-on={g.on ? '1' : '0'}>
              {edit === g.id ? (
                <form className="hc-gedit" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) void runAction({ label: 'Save', act: { t: 'do', op: 'hire-c.guide', args: { action: 'edit', id: g.id, text: draft.trim() } } }); setEdit(null); }}>
                  <div className="ds-field"><label htmlFor={`g-${g.id}`}>Guideline text</label><input id={`g-${g.id}`} className="ds-input" value={draft} onChange={(e) => setDraft(e.target.value)} /></div>
                  {g.check === 'HOURS' && <p className="t14 muted" style={{ margin: 0 }}>Q reads the hours from the text, like “10:00–16:00”.</p>}
                  <div className="ds-actions"><button type="submit" className="ds-btn primary">Save as v{g.v + 1}</button><button type="button" className="ds-btn quiet" onClick={() => setEdit(null)}>Cancel</button></div>
                </form>
              ) : (
                <div className="hc-guide">
                  {admin ? (
                    <SwitchRow label={g.text} on={g.on} onChange={() => void runAction({ label: 'Toggle', act: { t: 'do', op: 'hire-c.guide', args: { action: 'toggle', id: g.id } } })}
                      help={<GuideMeta g={g} />} />
                  ) : (
                    <div className="ds-switchrow"><div className="txt"><b>{g.text}</b><span className="t14 muted"><GuideMeta g={g} /></span></div><span className="ds-tag" data-k={g.on ? 'ok' : undefined}>{g.on ? 'On' : 'Off'}</span></div>
                  )}
                  {admin && <button type="button" className="hc-more hc-gedit-btn" onClick={() => { setEdit(g.id); setDraft(g.text); }}>Edit wording<span className="sr">: {g.text}</span></button>}
                </div>
              )}
            </li>
          ))}
        </ul>
        {admin && (
          <form className="hc-gadd" onSubmit={(e) => { e.preventDefault(); if (add.trim().length > 5) { void runAction({ label: 'Add', act: { t: 'do', op: 'hire-c.guide', args: { action: 'add', text: add.trim() } } }); setAdd(''); } }}>
            <div className="ds-field"><label htmlFor="g-add">Add a guideline</label><input id="g-add" className="ds-input" value={add} onChange={(e) => setAdd(e.target.value)} placeholder="For example: mention our hybrid days (Tue–Thu) in every invitation" /></div>
            <button type="submit" className="ds-btn" disabled={add.trim().length <= 5}>Add</button>
          </form>
        )}
      </section>
      <section className="ds-sheet" aria-labelledby="dl-h" style={{ display: 'grid', gap: 10 }}>
        <h2 id="dl-h" className="voice t24" style={{ margin: 0 }}>What Q may do on its own</h2>
        {DELEG.map(([v, t, d]) => <button key={v} type="button" className="ds-opt" aria-pressed={o.delegation === v} aria-disabled={!admin} onClick={() => admin && setDeleg(v)}><span><b>{t}</b><span className="t14 muted" style={{ display: 'block' }}>{d}</span></span></button>)}
        <p className="t14 muted" style={{ margin: 0 }}>Whatever is chosen, Q never sends to someone who hasn’t agreed to be contacted, and every send is simulated in this prototype.</p>
      </section>
    </Canvas>
  );
}
