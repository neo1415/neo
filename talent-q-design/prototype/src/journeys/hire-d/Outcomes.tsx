// SC-060 Placement outcome journal (/r/outcomes). HiringOutcome (pack 02 §9): consented, human-verified status
// events (offer accepted, start, 30 and 90-day check-ins), each with who verified it and when. Kept apart from
// evidence, ratings and the comparison: it never scores anyone. Longer-term outcomes are not held.
import { useState } from 'react';
import { actorOf, orgOf, simNow, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hd, type HiringOutcome } from '../../state/areas/hire-d';
import { CAN_SEND } from '../hire-c/lib';
import { can, daysBetween, fmtDay, MILESTONE_WORD, nextMilestone } from './model';

const CONSENT_WORD = { NOT_ASKED: 'Not asked yet', ASKED: 'Asked, no answer yet', GIVEN: 'Agreed', DECLINED: 'Said no' } as const;

export function Outcomes() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  if (!a.orgId) return <Canvas title="Placements" kicker="Hiring" open onClose={() => {}}><section className="ds-sheet hd-empty"><b>Join an organisation to see placements.</b></section></Canvas>;
  if (!can(a, ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'])) return (
    <Canvas title="Placements" kicker={orgOf(w, a.orgId)?.name ?? ''} open onClose={() => {}}><section className="ds-sheet hd-empty" role="alert"><b>Placement records are for hiring managers, recruiters and HR.</b><span className="t14 muted">They hold personal milestones about new colleagues, so your role can’t open them.</span></section></Canvas>
  );
  const list = hd(w).outcomes.filter((o) => o.orgId === a.orgId);
  const due = list.filter((o) => { const n = nextMilestone(o); return n?.due && daysBetween(simNow(w), n.due) <= 7; });
  return (
    <Canvas title="Placements" kicker={`${orgOf(w, a.orgId)?.name} · placement outcome journal`} open onClose={() => {}} qLine={due.length ? `${due.length} check-in${due.length === 1 ? '' : 's'} due this week.` : 'Nothing due this week.'}>
      <div className="ds-banner" role="note"><Glyph k="unclear" /><span><b>Kept separately.</b> Only milestones a person verified, and only with the new hire’s agreement. Never used to score candidates, never shown in the comparison or evidence.</span><span /></div>
      {!list.length ? <section className="ds-sheet hd-empty"><b>No placements yet.</b><span className="t14 muted">When someone accepts an offer and a person records it, their placement record starts here.</span><Link to="/r/pipeline" className="ds-btn">Go to the pipeline</Link></section>
        : list.map((o) => <Record key={o.id} o={o} />)}
    </Canvas>
  );
}

function Record({ o }: { o: HiringOutcome }) {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const next = nextMilestone(o);
  const consentOk = o.consent.state === 'GIVEN';
  const first = o.name.split(' ')[0];
  return (
    <section className="ds-sheet hd-sec" aria-labelledby={`ho-${o.id}`} data-outcome={o.id}>
      <div className="hd-head"><h2 id={`ho-${o.id}`} className="voice t24">{o.name} · {o.roleTitle}</h2><span className="hd-consent" data-s={o.consent.state}>Consent: {CONSENT_WORD[o.consent.state]}</span></div>
      <p className="t14 muted" style={{ margin: 0 }}>Scope: {o.consent.scope}{o.consent.at ? ` · ${fmtDay(o.consent.at)}` : ''}. Longer term: {o.longTerm}</p>
      <ol className="hd-journal" aria-label={`Milestones for ${o.name}`}>
        {o.milestones.map((m) => { const late = !m.at && m.due && daysBetween(simNow(w), m.due) < 0; const soon = !m.at && m.due && !late && daysBetween(simNow(w), m.due) <= 7; return (
          <li key={m.kind} data-done={m.at ? '1' : undefined} data-late={late ? '1' : undefined}>
            <span className="hd-jdot" aria-hidden="true" />
            <span className="hd-rowmain"><b>{MILESTONE_WORD[m.kind]}</b>
              <span className="t14 muted">{m.at ? `${fmtDay(m.at)} · verified by ${w.actors.find((x) => x.id === m.verifiedBy)?.name ?? '—'}${m.note ? ` · “${m.note}”` : ''}` : m.due ? `Due ${fmtDay(m.due)}${late ? ' · late' : soon ? ' · this week' : ''} · not verified yet` : 'Not due yet · not verified'}</span></span>
            {!m.at && m === next && (consentOk || m.kind === 'OFFER_ACCEPTED') && can(a, ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER']) && <button type="button" className="ds-btn quiet" aria-expanded={open === m.kind} onClick={() => setOpen(open === m.kind ? null : m.kind)}>Verify<span className="sr"> {MILESTONE_WORD[m.kind]} for {o.name}</span></button>}
          </li>); })}
      </ol>
      {open && (
        <form className="hd-offerform" onSubmit={(x) => { x.preventDefault(); void runAction({ label: 'Verify', act: { t: 'do', op: 'hd.outcome.verify', args: { id: o.id, kind: open, note } } }); setOpen(null); setNote(''); }}>
          <div className="ds-field"><label htmlFor={`hn-${o.id}`}>What you checked (who told you, or what you saw)</label><input id={`hn-${o.id}`} className="ds-input" value={note} onChange={(x) => setNote(x.target.value)} required /></div>
          <button type="submit" className="ds-btn primary">Verify {MILESTONE_WORD[open as keyof typeof MILESTONE_WORD].toLowerCase()}</button>
        </form>
      )}
      {!consentOk && (
        <div className="hd-consentbox">
          <p className="t14" style={{ margin: 0 }}>{o.consent.state === 'DECLINED' ? `${first} said no, so nothing beyond the acceptance is kept.` : `Until ${first} agrees, only the acceptance a person recorded is kept. Later milestones can’t be added.`}</p>
          <div className="ds-actions">
            {o.consent.state === 'NOT_ASKED' && o.personId && CAN_SEND.includes(a.role ?? 'VIEWER') && <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Ask', act: { t: 'do', op: 'hd.outcome.ask', args: { id: o.id } } })}>Ask {first} (approve and send, simulated)</button>}
            {o.consent.state === 'ASKED' && <span className="hd-testrow"><span className="lab">Testing</span><button type="button" className="ds-btn quiet" onClick={() => void runAction({ label: 'Yes', act: { t: 'do', op: 'hd.outcome.answer', args: { id: o.id, state: 'GIVEN' } } })}>Simulate: {first} agrees</button><button type="button" className="ds-btn quiet" onClick={() => void runAction({ label: 'No', act: { t: 'do', op: 'hd.outcome.answer', args: { id: o.id, state: 'DECLINED' } } })}>Simulate: {first} says no</button></span>}
          </div>
        </div>
      )}
      {o.personId && <p className="t14" style={{ margin: 0 }}><Link to={`/r/offer/${o.mandateId}/${o.personId}`}>The offer record</Link></p>}
    </section>
  );
}
