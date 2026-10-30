// SC-071 · Work authorisation and permits (Zara). The candidate states it; it is private by default and shared only
// with employers she chooses, each with a consent receipt. It never filters jobs or search. Attaching a document is
// a separate, optional step, and Talent Q never checks it: "attached" is never shown as "verified".
// MO-041 (consent change): ending an employer's access removes their preview content and controls at once.
import { useState } from 'react';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { QMark } from '../../ds/QMark';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { runAction } from '../../q/core/engine';
import { navigate, useRoute } from '../../ui/router';
import type { AuthStatus } from '../../state/areas/talent-d';
import { AUTH_LABEL, AUTH_SHORT, COUNTRIES, REGION_NOTE, authOf, authOrgs, authVisibleTo, dayMonth, demoState, orgNm } from './logic';
import { ReceiptCard, Variant } from './ui';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

export function WorkPermitPage() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId;
  const { query } = useRoute();
  const ds = demoState(query) ?? (!pid ? 'denied' : null);
  const [country, setCountry] = useState('Nigeria');
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [detail, setDetail] = useState('');
  const au = authOf(w, pid ?? '');
  const empty = ds === 'empty' || au.entries.length === 0;
  const orgs = pid ? authOrgs(w, pid) : [];
  const save = () => { if (!status) return; act('td.auth.set', { country, status, detail }); setStatus(null); setDetail(''); };
  return (
    <Canvas title="Where you can work" kicker="Work authorisation · private until you share" open onClose={() => navigate('/c/passport')}
      qLine="Private until you share it. It never hides jobs.">
      <Variant state={ds === 'empty' ? null : ds} what="your work authorisation" back={{ to: '/c/passport', label: 'Back to your Passport' }}>
        <div className="td-page">
          <div className="td-qline"><QMark mood="idle" size={20} /><p>{empty ? `${a.first}, you can tell employers early where you’re allowed to work. It’s optional, it stays private, and it never hides a job from you.` : `${a.first}, ${Object.values(au.shares).filter((r) => !r.endedAt).length ? `${Object.values(au.shares).filter((r) => !r.endedAt).map((r) => orgNm(w, r.org)).join(' and ')} can see what you’ve said. Nobody else can.` : 'nobody can see this yet. Share it only with employers you choose.'}`}</p></div>

          <section className="ds-sheet td-stack" aria-labelledby="td-au-h">
            <h2 id="td-au-h" className="tb-h2">What you’ve said</h2>
            {empty ? (
              <div className="tb-empty"><p style={{ margin: 0 }}>Nothing yet. Add a country below, or tell Q, for example: “I’m a Ghanaian citizen and I’d need a permit for Nigeria”.</p></div>
            ) : (
              <ul className="td-auth-list" aria-label="Your work authorisation">
                {au.entries.map((e) => (
                  <li key={e.country}>
                    <span><span className="td-auth-c">{e.country}</span> · {AUTH_SHORT[e.status]}{e.detail ? <span className="t14 muted" style={{ display: 'block' }}>{e.detail}</span> : null}<span className="t14 muted" style={{ display: 'block' }}>Your statement, {dayMonth(e.at)}. Not checked by anyone.</span></span>
                    <ConfirmButton label="Remove" question={`Remove ${e.country}?`} yes="Remove" onConfirm={() => act('td.auth.remove', { country: e.country })} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ds-sheet td-stack" aria-labelledby="td-au-add">
            <h2 id="td-au-add" className="tb-h2">{empty ? 'Add a country' : 'Add or change a country'}</h2>
            <div className="td-form">
              <label>Country<select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <div className="td-opts" role="radiogroup" aria-label={`Your right to work in ${country}`}>
                {(Object.keys(AUTH_LABEL) as AuthStatus[]).map((k) => <button key={k} type="button" role="radio" aria-checked={status === k} className="ds-opt" aria-pressed={status === k} onClick={() => setStatus(k)}><span><b>{AUTH_LABEL[k]}</b></span></button>)}
              </div>
              <label>Permit type or end date <span className="t14 muted" style={{ fontWeight: 400 }}>(optional, only if you want)</span><input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. residence permit until March 2027" /></label>
              {REGION_NOTE[country] && <p className="td-region"><b>General information, not advice.</b> {REGION_NOTE[country]} Rules change.</p>}
              <div className="tb-actions"><button type="button" className="ds-btn primary" disabled={!status} onClick={save}>Save {country}</button>{!status && <span className="t14 muted">Choose what applies to you.</span>}</div>
            </div>
          </section>

          <section className="ds-sheet td-stack" aria-labelledby="td-au-share">
            <div className="tb-row-between"><h2 id="td-au-share" className="tb-h2">Who can see it</h2><span className="t14 muted">Changes take effect straight away</span></div>
            {empty && <p id="td-au-need" className="t14" style={{ margin: 0 }}>Add a country first; then you can share it.</p>}
            <p className="td-note">Only employers you’ve applied to or shared work with are listed. Search never shows this, to anyone.</p>
            {orgs.length === 0 ? <p style={{ margin: 0 }}>No employers yet. When you apply somewhere, you can choose to share it with them.</p> : (
              <div>
                {orgs.map((o) => {
                  const r = au.shares[o]; const live = !!r && !r.endedAt; const v = pid ? authVisibleTo(w, pid, o) : null;
                  return (
                    <div key={o} className="td-share-row">
                      <div className="td-stack" style={{ gap: 8 }}>
                        <b>{orgNm(w, o)}</b>
                        {r ? (
                          <div className="td-view" data-access={live ? 'live' : 'ended'} aria-live="polite">
                            <span className="lab">What {orgNm(w, o)} sees</span>
                            <div className="td-view-body">
                              {v ? <ul style={{ margin: 0, paddingLeft: 18 }}>{v.entries.map((e) => <li key={e.country}>{e.country}: {AUTH_SHORT[e.status].toLowerCase()} ({a.first}’s statement, not checked)</li>)}{v.doc && <li>Document: {v.doc.name} (attached by {a.first}, not checked by Talent Q)</li>}</ul> : null}
                            </div>
                            <p className="td-view-ended" role="status">Access ended. {orgNm(w, o)} sees nothing, and was told only that access ended.</p>
                          </div>
                        ) : <span className="t14 muted">Can’t see it.</span>}
                        {r && <ReceiptCard r={r} org={orgNm(w, o)} />}
                      </div>
                      <div className="tb-actions">
                        {live
                          ? <ConfirmButton label={`End ${orgNm(w, o)}’s access`} question={`End ${orgNm(w, o)}’s access now?`} yes="End access" onConfirm={() => act('td.auth.unshare', { org: o })} />
                          : (empty ? <button type="button" className="ds-btn" disabled aria-describedby="td-au-need">Share with {orgNm(w, o)}</button> : <ConfirmButton className="ds-btn" label={`Share with ${orgNm(w, o)}`} question={`Share your statement with ${orgNm(w, o)} only?`} yes="Share" onConfirm={() => act('td.auth.share', { org: o })} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="ds-sheet td-stack" aria-labelledby="td-au-doc">
            <h2 id="td-au-doc" className="tb-h2">A document, if an employer asks</h2>
            <p className="td-note">A separate, optional step. Talent Q doesn’t check right-to-work documents, so an attached document is never marked verified. An employer you share it with does their own check, usually at offer stage.</p>
            {!au.doc ? (
              <div className="tb-actions"><button type="button" className="ds-btn" disabled={empty} onClick={() => act('td.auth.doc', { name: 'Ghana passport, bio page (simulated).pdf' })}>Attach a document (simulated)</button>{empty && <span className="t14 muted">Add a country first.</span>}</div>
            ) : (
              <div className="td-stack">
                <p style={{ margin: 0 }}><b>{au.doc.name}</b> <span className="ds-tag">Attached · not checked</span></p>
                {Object.values(au.shares).filter((r) => !r.endedAt).map((r) => (
                  <label key={r.org} className="tb-check"><input type="checkbox" checked={au.doc!.sharedWith.includes(r.org)} onChange={(e) => act('td.auth.doc', { org: r.org, on: e.target.checked })} /> Let {orgNm(w, r.org)} open it for their own check</label>
                ))}
                <ConfirmButton label="Remove the document" question="Remove it? Anyone you shared it with loses access." yes="Remove" onConfirm={() => act('td.auth.doc', { remove: true })} />
              </div>
            )}
          </section>

          <details className="ds-sheet tb-details">
            <summary><b>How Talent Q uses this, and how it doesn’t</b></summary>
            <ul className="t14">
              <li>It never filters jobs, matches or recruiter search. You see the same jobs whatever you say here.</li>
              <li>It’s your statement. Nobody at Talent Q checks it, and it’s never labelled verified.</li>
              <li>Only employers you share it with can read it, and only while you allow it. Each share has a receipt.</li>
              <li>Ending access takes effect straight away. The employer is told only that access ended.</li>
            </ul>
          </details>
        </div>
      </Variant>
    </Canvas>
  );
}
