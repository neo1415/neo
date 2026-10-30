// SC-058 Offer and negotiation handoff (/r/offer/:mandateId/:personId). A human decision throughout:
//   (none) → DRAFT (Q drafts terms from the band and only what the candidate shared) → AWAITING_APPROVAL →
//   APPROVED (hiring manager + HR, bound to this version; any change voids them) → HANDED_OFF (a named person sent it
//   outside Talent Q; Q never sends) → NEGOTIATING (their words, recorded by a person) → ACCEPTED | DECLINED.
// Salary shown is only the band and what the candidate chose to share; nothing is inferred from a CV or elsewhere.
import { useState } from 'react';
import { actorOf, personOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { proof } from '../../state/areas/proof';
import { hd } from '../../state/areas/hire-d';
import { STAGE_LABEL } from '../../state/domain';
import { CAN_SEND, firstOf, mandateTitle } from '../hire-c/lib';
import { approvedAll, approversFor, bandOf, compat, curV, fmtDay, mandateOrg, money, offerOf } from './model';

const STATE_WORD = { DRAFT: 'Draft', AWAITING_APPROVAL: 'Waiting for approval', APPROVED: 'Approved, not sent', HANDED_OFF: 'Handed off by a person', NEGOTIATING: 'In negotiation', ACCEPTED: 'Accepted', DECLINED: 'Declined', WITHDRAWN: 'Withdrawn' } as const;
const MODE: Record<string, string> = { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' };
const act = (op: string, args: Record<string, unknown>) => void runAction({ label: op, act: { t: 'do', op, args } });

export function OfferPage({ mid, pid }: { mid: string; pid: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const p = personOf(w, pid);
  const e = w.pipeline.find((x) => x.mandateId === mid && x.personId === pid);
  if (!p || !e || mandateOrg(w, mid) !== a.orgId) return (
    <Canvas title="Not available to you" kicker="Offer" open onClose={() => {}}><section className="ds-sheet hd-empty" role="alert"><b>This offer isn’t in your organisation’s hiring.</b><span className="t14 muted">Nothing about it is shown.</span><Link to="/r/pipeline" className="ds-btn">Back to the pipeline</Link></section></Canvas>
  );
  const f = p.name.split(' ')[0];
  const o = offerOf(w, mid, pid);
  const band = bandOf(w, mid);
  const prefs = proof(w).prefs[pid]; const shared = prefs && prefs.shareWith.includes(a.orgId!) ? prefs : undefined;
  const c = compat(w, { personId: pid, orgId: a.orgId!, mandateId: mid, amount: o?.amount ?? null });
  const mayDraft = ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER');
  return (
    <Canvas title={o ? `Offer for ${p.name}` : `Prepare an offer for ${f}`} kicker={`${mandateTitle(w, mid)} · ${o ? STATE_WORD[o.state] : 'not started'}`} open onClose={() => {}} qLine={o ? `${STATE_WORD[o.state]}. I never send offers.` : 'Your team decides. I draft; a person sends.'}
      aside={<span className="ds-actions"><Link to={`/r/pipeline/${mid}/${pid}`} className="ds-btn quiet">Stage detail</Link></span>}>
      <div className="ds-banner" role="note"><Glyph k="unclear" /><span><b>A human decision.</b> Q drafts the terms for your team to approve. Q never sends an offer: a named person hands it to {f} outside Talent Q, and records it here.</span><span /></div>
      <section className="ds-sheet hd-sec" aria-labelledby="of-fit">
        <div className="hd-head"><h2 id="of-fit" className="voice t24">Compensation compatibility</h2><span className="t14 muted">{shared ? `Shared by ${f}, ${fmtDay(shared.updatedAt)}` : `${f} hasn’t shared preferences with you`}</span></div>
        <table className="ds-table hd-fit">
          <caption className="sr">The role’s approved terms beside what {f} chose to share</caption>
          <thead><tr><th scope="col"><span className="sr">Term</span></th><th scope="col">The role</th><th scope="col">{f} shared</th></tr></thead>
          <tbody>
            <tr><th scope="row">Monthly pay</th><td className="num">{band?.label ?? 'No band'}</td><td>{c.pay ? <span className="num">From {money(c.pay.min)}</span> : <span className="hd-unknown"><Glyph k="unclear" size={12} /> Not shared</span>}</td></tr>
            <tr><th scope="row">Way of working</th><td>{w.mandate.mandateId === mid ? MODE[w.mandate.workMode] : MODE[w.mandates.find((m) => m.id === mid)?.workMode ?? ''] ?? '—'}</td><td>{shared?.workModes?.length ? shared.workModes.map((x) => MODE[x]).join(' or ') : <span className="hd-unknown"><Glyph k="unclear" size={12} /> Not shared</span>}</td></tr>
            <tr><th scope="row">Available from</th><td>To agree</td><td>{shared?.availableFrom ? fmtDay(shared.availableFrom) : <span className="hd-unknown"><Glyph k="unclear" size={12} /> Not shared</span>}</td></tr>
          </tbody>
        </table>
        <ul className="hd-bul hd-compat">{c.notes.map((n) => <li key={n.text} data-k={n.k}>{n.text}</li>)}</ul>
        <p className="t14 muted" style={{ margin: 0 }}>Only the approved band and what {f} chose to share. Q never infers pay from a CV, a past salary or anywhere else.</p>
      </section>
      {!o ? (
        <section className="ds-sheet hd-sec hd-empty" aria-labelledby="of-none">
          <h2 id="of-none" className="voice t24" style={{ margin: 0 }}>No offer yet</h2>
          <span className="t14 muted">{f} is at {STAGE_LABEL[e.stage]}.{['INTERVIEW', 'OFFER'].includes(e.stage) ? '' : ' Offers usually follow an interview; you can still prepare one.'}</span>
          {mayDraft ? <button type="button" className="ds-btn primary" onClick={() => act('hd.offer.draft', { mandateId: mid, personId: pid })}>Ask Q to draft the terms</button> : <span className="t14">Your role can’t start an offer.</span>}
          <span className="t14 muted">It will need {approversFor(w, a.orgId!, mid).map((x) => `${w.actors.find((y) => y.id === x.who)?.name} (${x.role === 'HR' ? 'HR' : 'hiring manager'})`).join(' and ')} to approve.</span>
        </section>
      ) : <OfferBody id={o.id} />}
    </Canvas>
  );
}

function OfferBody({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const o = hd(w).offers.find((x) => x.id === id);
  const [amount, setAmount] = useState(o?.amount != null ? String(o.amount) : '');
  const [start, setStart] = useState(o?.start ?? '');
  const [how, setHow] = useState('Offer letter from Kora’s HR system, sent by Ngozi');
  const [cAmt, setCAmt] = useState(''); const [cText, setCText] = useState('');
  if (!o) return null;
  const f = firstOf(w, o.personId);
  const v = curV(o);
  const editable = ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'NEGOTIATING'].includes(o.state) && ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER');
  const mine = o.approvals.find((x) => x.who === a.id);
  const dirty = (amount === '' ? null : Number(amount.replace(/[^\d]/g, ''))) !== o.amount || (start || null) !== o.start;
  return (
    <>
      <section className="ds-sheet hd-sec" aria-labelledby="of-terms" data-state={o.state}>
        <div className="hd-head"><h2 id="of-terms" className="voice t24">Terms · v{v.v}</h2><span className="hc-status" data-s={o.state === 'APPROVED' || o.state === 'ACCEPTED' ? 'CONFIRMED' : o.state === 'AWAITING_APPROVAL' ? 'AWAITING_APPROVAL' : undefined}>{STATE_WORD[o.state]}</span></div>
        <p style={{ margin: 0 }}>{o.terms}</p>
        <dl className="hd-facts"><div><dt>Monthly salary</dt><dd className="num">{o.amount == null ? 'Not set' : money(o.amount)}</dd></div><div><dt>Start date</dt><dd>{o.start ? fmtDay(o.start) : 'To agree'}</dd></div></dl>
        {editable && (
          <form className="hd-offerform" onSubmit={(x) => { x.preventDefault(); act('hd.offer.edit', { id: o.id, amount: amount === '' ? null : Number(amount.replace(/[^\d]/g, '')), start: start || null, note: 'Edited by hand', revise: o.state === 'NEGOTIATING' }); }}>
            <div className="ds-field"><label htmlFor="of-amt">Monthly salary (₦)</label><input id="of-amt" className="ds-input num" inputMode="numeric" value={amount} onChange={(x) => setAmount(x.target.value)} placeholder="Set by your team" /></div>
            <div className="ds-field"><label htmlFor="of-start">Start date</label><input id="of-start" type="date" className="ds-input" value={start} onChange={(x) => setStart(x.target.value)} /></div>
            <button type="submit" className="ds-btn" disabled={!dirty}>Save as v{v.v + 1}</button>
          </form>
        )}
        <details><summary className="t14">Versions ({o.versions.length})</summary><ul className="hd-list">{[...o.versions].reverse().map((x) => <li key={x.v} className="hd-row"><span className="hd-rowmain"><b>v{x.v} · {money(x.amount)}{x.start ? ` · from ${fmtDay(x.start)}` : ''}</b><span className="t14 muted">{x.by === 'Q' ? 'Q' : firstOf(w, x.by)} · {x.note}</span></span></li>)}</ul></details>
      </section>
      <section className="ds-sheet hd-sec" aria-labelledby="of-appr">
        <div className="hd-head"><h2 id="of-appr" className="voice t24">Approvals</h2><span className="t14 muted">Both needed, for this exact version</span></div>
        <ul className="hd-list">{o.approvals.map((x) => <li key={x.role} className="hd-row" data-ok={x.at && !x.voided && x.v === v.v ? '1' : undefined}><span className="hd-rowmain"><b>{w.actors.find((y) => y.id === x.who)?.name} · {x.role === 'HR' ? 'HR' : 'hiring manager'}</b><span className="t14 muted">{x.voided ? `Approved earlier; no longer counts (${x.voided})` : x.at && x.v === v.v ? `Approved v${x.v}, ${fmtDay(x.at)}` : o.state === 'AWAITING_APPROVAL' ? 'Waiting' : 'Not asked yet'}</span></span></li>)}</ul>
        <div className="ds-actions">
          {(o.state === 'DRAFT' || (o.state === 'NEGOTIATING' && !approvedAll(o))) && <button type="button" className="ds-btn primary" onClick={() => act('hd.offer.request', { id: o.id })}>Ask for approval of v{v.v}</button>}
          {o.state === 'AWAITING_APPROVAL' && mine && !(mine.at && !mine.voided && mine.v === v.v) && <button type="button" className="ds-btn primary" onClick={() => act('hd.offer.approve', { id: o.id })}>Approve v{v.v} as {mine.role === 'HR' ? 'HR' : 'hiring manager'}</button>}
          {o.state === 'AWAITING_APPROVAL' && !mine && <span className="t14 muted">You’re not an approver. Waiting on {o.approvals.filter((x) => !x.at || x.voided || x.v !== v.v).map((x) => firstOf(w, x.who)).join(' and ')}.</span>}
        </div>
      </section>
      {(o.state === 'APPROVED' || o.state === 'HANDED_OFF' || o.state === 'NEGOTIATING' || o.state === 'ACCEPTED' || o.state === 'DECLINED') && (
        <section className="ds-sheet hd-sec" aria-labelledby="of-hand">
          <div className="hd-head"><h2 id="of-hand" className="voice t24">Hand-off and answer</h2></div>
          {o.state === 'APPROVED' && (CAN_SEND.includes(a.role ?? 'VIEWER') ? (
            <form className="hd-offerform" onSubmit={(x) => { x.preventDefault(); act('hd.offer.handoff', { id: o.id, how }); }}>
              <div className="ds-field"><label htmlFor="of-how">How a person sent it</label><input id="of-how" className="ds-input" value={how} onChange={(x) => setHow(x.target.value)} /></div>
              <button type="submit" className="ds-btn primary">Record that a person sent it</button>
            </form>) : <p className="t14 muted" style={{ margin: 0 }}>An admin or recruiter records the hand-off.</p>)}
          {o.handoff && <p style={{ margin: 0 }}>Handed off by <b>{w.actors.find((x) => x.id === o.handoff!.by)?.name}</b>, {fmtDay(o.handoff.at)}: {o.handoff.how}. Not sent by Talent Q.</p>}
          {o.counter && <p style={{ margin: 0 }}><span className="lab">{f}’s response</span> “{o.counter.text}”{o.counter.amount ? <> · asked for <span className="num">{money(o.counter.amount)}</span></> : ''} (recorded by {firstOf(w, o.counter.by)})</p>}
          {(o.state === 'HANDED_OFF' || o.state === 'NEGOTIATING') && (
            <div className="hd-answer">
              <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => act('hd.offer.answer', { id: o.id, what: 'ACCEPTED', note: `${f} accepted in writing` })}>Record: {f} accepted</button><button type="button" className="ds-btn" onClick={() => act('hd.offer.answer', { id: o.id, what: 'DECLINED', note: '' })}>Record: {f} declined</button></div>
              <form className="hd-offerform" onSubmit={(x) => { x.preventDefault(); if (!cText.trim()) return; act('hd.offer.counter', { id: o.id, amount: cAmt ? Number(cAmt.replace(/[^\d]/g, '')) : null, text: cText }); setCText(''); setCAmt(''); }}>
                <div className="ds-field"><label htmlFor="of-ct">{f}’s words, if they asked for changes</label><input id="of-ct" className="ds-input" value={cText} onChange={(x) => setCText(x.target.value)} /></div>
                <div className="ds-field"><label htmlFor="of-ca">Amount they asked for (optional)</label><input id="of-ca" className="ds-input num" inputMode="numeric" value={cAmt} onChange={(x) => setCAmt(x.target.value)} /></div>
                <button type="submit" className="ds-btn">Record their response</button>
              </form>
            </div>
          )}
          {o.answer && <p style={{ margin: 0 }}><b>{o.answer.what === 'ACCEPTED' ? `${f} accepted` : `${f} declined`}</b>, recorded by {firstOf(w, o.answer.by)} on {fmtDay(o.answer.at)}.{o.answer.what === 'ACCEPTED' && <> <Link to="/r/outcomes">Open the placement record</Link></>}</p>}
        </section>
      )}
    </>
  );
}
