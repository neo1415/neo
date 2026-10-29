// The candidate's own ratings (AD-E-14): for each role they applied to or were assessed for, how the employer's
// rubric reads their evidence, with the anchor, the evidence used, who rated it, any change and its reason, the
// index only with coverage, and a route to ask for a correction. Shown only to the person rated.
import { useState } from 'react';
import { actorOf, useWorld } from '../../mock/world';
import { Glyph } from '../../ds/Glyph';
import { runAction } from '../../q/core/engine';
import { rubrics } from '../../state/areas/rubrics';
import { card, firstOf, fmtDay, fmtT, indexLine, refView, roleOf, scored } from './model';
import { Meter } from './Scorecard';
import './ops';
import './rubric.css';

export function CandidateRatings() {
  const w = useWorld((x) => x);
  const me = actorOf(w); const pid = me.personId;
  const [asking, setAsking] = useState<string | null>(null);
  const [text, setText] = useState('');
  if (!pid) return null;
  const mine = rubrics(w).ratings.filter((r) => r.personId === pid);
  const groups = mine.map((r) => `${r.rubricId}:${r.v}`).filter((x, i, a) => a.indexOf(x) === i);
  if (!groups.length) return null;
  return (
    <section className="ds-sheet rb-grid" aria-labelledby="my-ratings">
      <h2 id="my-ratings" className="tb-h2" style={{ margin: 0 }}>How employers rated your evidence</h2>
      <p className="t14" style={{ margin: 0 }}>When an employer assesses you against its rubric for a role, you can see each rating, what it was based on and why. If something’s wrong, ask for a correction. A person reviews ratings before any decision.</p>
      {groups.map((g) => {
        const [rubricId, vs] = g.split(':'); const v = Number(vs);
        const rub = rubrics(w).list.find((x) => x.id === rubricId); if (!rub) return null;
        const role = roleOf(w, rub.mandateId); const cd = card(w, rub.mandateId, pid, v); if (!cd || !role) return null;
        const org = w.orgs.find((o) => o.id === rub.orgId)?.name ?? 'The employer';
        return (
          <article key={g} className="rb-grid" style={{ gap: 10 }} aria-label={`${org}, ${role.title}`}>
            <div className="rb-row"><b>{org} · {role.title}</b><span className="t14 muted">Rubric v{v}{cd.ver.state === 'SUPERSEDED' ? ' (since updated; these ratings stay on this version)' : ''}</span></div>
            <p className="t14" style={{ margin: 0 }}>{cd.idx.index === null ? 'Nothing rated yet.' : <><b>{cd.idx.index} out of 100 on the {cd.idx.coverage}% of the rubric your evidence covers</b> ({indexLine(cd.idx)}).</>} The rest is unknown, not zero. This number only applies to this role at {org}; it isn’t a score of you as a person.</p>
            <ul className="rb-rows">
              {cd.rows.filter((x) => scored(x.c) && x.r).map(({ c, r }) => (
                <li key={c.id}>
                  <div className="rb-row"><b>{c.label}</b><Meter r={r} label={c.label} /></div>
                  <p className="t14" style={{ margin: 0 }}><span className="muted">Level {r!.rating} means:</span> {c.anchors[r!.rating]}</p>
                  <p className="t14 muted" style={{ margin: 0 }}>Based on {r!.refs.map((x) => { const v2 = refView(w, null, pid, x); return `${v2.title}${v2.video ? ` at ${fmtT(v2.video.t)}` : ''}`; }).join('; ') || 'interview notes'} · {r!.reviewed ? 'reviewed by a person' : 'proposed by Q, not yet reviewed'}</p>
                  {r!.override && <p className="t14" style={{ margin: 0 }}>{firstOf(w, r!.override.by)} changed this from {r!.override.from} to {r!.rating}: “{r!.override.reason}”</p>}
                  {r!.dispute ? (
                    <p className="t14 rb-dispute" style={{ margin: 0 }}>You asked for a correction on {fmtDay(r!.dispute.at)}: “{r!.dispute.text}” · {r!.dispute.state === 'OPEN' ? 'waiting for a reply' : 'answered'}</p>
                  ) : asking === r!.id ? (
                    <div className="rb-grid" style={{ gap: 6 }}>
                      <label htmlFor={`fix-${r!.id}`} className="t14">What’s wrong, in your words</label>
                      <textarea id={`fix-${r!.id}`} className="ds-input rb-textarea" value={text} onChange={(e) => setText(e.target.value)} />
                      <div className="tb-actions"><button type="button" className="ds-btn primary" disabled={!text.trim()} onClick={() => { void runAction({ label: 'Ask', act: { t: 'do', op: 'rb.dispute', args: { id: r!.id, text } } }); setAsking(null); setText(''); }}>Send to {org}</button><button type="button" className="ds-btn quiet" onClick={() => setAsking(null)}>Cancel</button></div>
                    </div>
                  ) : <div><button type="button" className="rb-link" onClick={() => { setAsking(r!.id); setText(''); }}>Ask for a correction</button></div>}
                </li>
              ))}
            </ul>
            {cd.unknown.length > 0 && <p className="t14 muted rb-same" style={{ margin: 0 }}><Glyph k="none" size={13} /><span>Not rated yet: {cd.unknown.map((c) => c.label).join(', ')}. That’s normal: nothing you’ve shared shows these yet, and they don’t count against you.</span></p>}
          </article>
        );
      })}
    </section>
  );
}
