// Candidate profile for recruiters (R2): only what the person shared with the viewer's organisation,
// with provenance per item, their place in the pipeline, a safe project viewer, and how Q would check
// each requirement. Confidential items show that they exist, never their contents.
import { useEffect, useRef } from 'react';
import { actorOf, useWorld, visibleEvidence } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { STAGES, STAGE_LABEL } from '../../state/domain';
import { hireB } from '../../state/areas/hire-b';
import { assessFor, cellFor, firstName, KORA_ROLE, questionsFor, reqsOf, viewerOrg, visibleIds } from './model';
import { markSeen } from './ops';
import { ProjectViewer } from './ProjectViewer';
import { KIND, LevelMark, ORIGIN, VerTag, fmtDate, verOf } from './ui';

export function Profile({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const me = actorOf(w);
  const person = w.people.find((p) => p.personId === id);
  const org = viewerOrg(w);
  const orgName = w.orgs.find((o) => o.id === org)?.name ?? 'your organisation';
  const prevSeen = useRef<{ at: string; items: string[] } | null | undefined>(undefined);
  if (prevSeen.current === undefined) prevSeen.current = hireB(w).seen[me.id]?.[id] ?? null;
  useEffect(() => { if (person) markSeen(id); }, [id, person, w.evidence]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!person) return (
    <Canvas title="We can’t find this person" kicker="Candidate profile" open onClose={() => history.back()}>
      <section className="ds-sheet hire-b-grid"><p style={{ margin: 0 }}>There’s no one with this link in your hiring. They may have deleted their account. <Link to="/r/compare">Back to the comparison</Link></p></section>
    </Canvas>
  );
  const first = firstName(w, id);
  const withdrawn = w.consents[id]?.withdrawnFrom.includes(org);
  const inPipeline = w.pipeline.some((p) => p.personId === id && (w.mandate.mandateId === p.mandateId || w.mandates.find((m) => m.id === p.mandateId)?.orgId === org));
  if (withdrawn || (!inPipeline && w.consents[id] && !w.consents[id].discoverable)) return (
    <Canvas title={`You can’t see ${first}’s profile`} kicker="Candidate profile · permission" open onClose={() => history.back()}>
      <section className="ds-banner" data-k="risk" role="status"><Glyph k="none" /><span>{withdrawn ? `${first} has stopped sharing their profile with ${orgName}. Q no longer uses anything they shared, and won’t say what it was.` : `${first} isn’t discoverable and hasn’t applied to ${orgName}, so there’s nothing you’re allowed to see.`}</span><Link className="ds-btn" to="/r/compare">Back</Link></section>
    </Canvas>
  );

  const items = visibleEvidence(w, id, org);
  const revoked = w.evidence.filter((e) => e.ownerId === id && e.revokedFrom?.includes(org)).length;
  const reqs = reqsOf(w);
  const cells = reqs.map((r) => ({ r, c: cellFor(w, id, r.reqId) }));
  const ver = cells.filter((x) => x.c.level === 'verified').map((x) => x.r.label);
  const none = cells.filter((x) => x.c.level === 'none' || x.c.level === 'claim').map((x) => x.r.label);
  const title = ver.length ? `${first} has checked evidence for ${ver.join(' and ')}${none.length ? `; ${none.slice(0, 2).join(' and ')} ${none.length === 1 ? 'isn’t' : 'aren’t'} shown yet.` : '.'}` : `${first} hasn’t shown checked evidence for this role yet${none.length ? `; ${none.length} requirements are unknown, not failed.` : '.'}`;
  const pipe = w.pipeline.find((p) => p.personId === id && p.mandateId === KORA_ROLE);
  const iv = w.interviews.find((i) => i.personId === id && i.orgId === org && i.mandateId === KORA_ROLE);
  const prev = prevSeen.current;
  const nowIds = visibleIds(w, id);
  const fresh = prev ? nowIds.filter((x) => !prev.items.includes(x)).map((x) => x.split(':')) : [];
  const claims = items.filter((e) => e.kind === 'CLAIM');
  const weakVsClaim = claims.length > 0 && cells.filter((x) => x.c.level === 'verified' || x.c.level === 'evidenced').length <= 1;
  const qs = questionsFor(w, id).slice(0, 3);

  return (
    <Canvas title={title} kicker={<>Candidate profile · what {first} shared with {orgName}</>} open onClose={() => history.back()} qLine={`${person.name}`}
      aside={<div className="ds-actions">
        <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Compare', act: { t: 'say', text: `compare ${first} with the others` } })}>Compare</button>
        {iv && <Link className="ds-btn" to={`/r/interviews/${iv.id}`}>Interview</Link>}
        <Link className="ds-btn quiet" to="/r/messages">Messages</Link>
      </div>}>
      {w.network === 'offline' && <div className="ds-banner" data-k="warn" role="status"><Glyph k="unclear" /><span>You’re offline. This is what was loaded; new sharing changes will appear when you reconnect.</span><span /></div>}
      {fresh.length > 0 && (
        <div className="ds-banner" role="status"><Glyph k="verified" /><span><b>New since you last looked ({fmtDate(prev!.at)}):</b> {fresh.map(([eid, v]) => `${items.find((e) => e.evidenceId === eid)?.title ?? 'an item'} (${v === 'VERIFIED' ? 'verified' : v.toLowerCase().replace('_', ' ')})`).join('; ')}.</span><span /></div>
      )}

      <div className="hire-b-two">
        <section className="ds-sheet hire-b-grid" aria-labelledby="pf-who">
          <h2 id="pf-who" className="voice t24" style={{ margin: 0 }}>{person.name}</h2>
          <p style={{ margin: 0 }}>{person.headline}</p>
          <p className="t14 muted" style={{ margin: 0 }}>{person.location} · {person.timezone.replace('_', ' ')}</p>
          <p className="t14 muted" style={{ margin: 0 }}>You see only what {first} chose to share with {orgName}. Private items, practice and anything they took back are never shown or counted.</p>
          {revoked > 0 && <p className="t14" role="status" style={{ margin: 0 }}><Glyph k="none" size={14} /> {first} ended {orgName}’s access to {revoked === 1 ? 'an item' : `${revoked} items`} they’d shared. Q no longer uses {revoked === 1 ? 'it' : 'them'}.</p>}
        </section>
        <section className="ds-sheet hire-b-grid" aria-labelledby="pf-pipe">
          <h2 id="pf-pipe" className="voice t24" style={{ margin: 0 }}>Where {first} is</h2>
          {pipe ? (
            <>
              <p className="t14 muted" style={{ margin: 0 }}>{w.mandate.title} · since {fmtDate(pipe.at)}{pipe.note ? ` · ${pipe.note}` : ''}</p>
              <ol className="hire-b-stages" aria-label="Pipeline stages">
                {STAGES.map((s) => { const i = STAGES.indexOf(s), cur = STAGES.indexOf(pipe.stage as typeof s); return <li key={s} data-on={i <= cur ? '1' : undefined} aria-current={s === pipe.stage ? 'step' : undefined}>{STAGE_LABEL[s]}{s === pipe.stage && <span className="sr"> (current stage)</span>}</li>; })}
              </ol>
              {!STAGES.includes(pipe.stage) && <p style={{ margin: 0 }}>{STAGE_LABEL[pipe.stage]}</p>}
              <p className="t14" style={{ margin: 0 }}><Link to="/r/pipeline">Open the pipeline</Link> · scheduling and messages live in <Link to="/r/calendar">Calendar</Link> and <Link to="/r/messages">Messages</Link>.</p>
            </>
          ) : <p className="muted" style={{ margin: 0 }}>{first} isn’t in {orgName}’s Senior Backend pipeline.</p>}
        </section>
      </div>

      {weakVsClaim && (
        <section className="ds-banner" data-k="warn" aria-label="Q’s honest read"><Glyph k="unclear" />
          <span><b>Impressive CV, thin evidence.</b> {first}’s CV makes strong claims, but almost nothing shared backs them yet. That makes most of it <i>unknown</i>, which isn’t the same as weak. What would prove it: a reference from one of the fintechs, a recent Go service they ran, or a short paid work sample.</span>
          <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Ask Q', act: { t: 'say', text: `is ${first}'s cv backed by evidence` } })}>Ask Q why</button>
        </section>
      )}

      <section className="ds-sheet hire-b-grid" aria-labelledby="pf-ev">
        <div className="hire-b-row"><h2 id="pf-ev" className="voice t24" style={{ margin: 0 }}>Shared with {orgName}</h2><span className="t14 muted">{items.length} item{items.length === 1 ? '' : 's'}</span></div>
        {items.length === 0 && <p className="muted" style={{ margin: 0 }}>{first} hasn’t shared anything with you yet. Ask about it in conversation instead of assuming.</p>}
        <ul className="hire-b-ev">
          {items.map((e) => (
            <li key={e.evidenceId}>
              <div className="hire-b-row">
                <span className="lab">{KIND[e.kind]}{e.confidential ? ' · confidential' : ''}</span>
                <VerTag v={verOf(e)} />
              </div>
              {e.confidential ? (
                <>
                  <b>{e.redactedOf ? 'A confidential project, shared as an attestation' : 'A confidential item'}</b>
                  <p className="t14" style={{ margin: 0 }}>{first} has shared that this exists. Its contents are confidential: Q can’t read or show them and doesn’t use them to compare. You can ask {first} about it in the interview.</p>
                </>
              ) : (
                <>
                  <b>{e.title}</b>
                  <p className="t14" style={{ margin: 0 }}>{e.shows}</p>
                  {e.limits && <p className="t14 muted" style={{ margin: 0 }}>Limits: {e.limits}</p>}
                </>
              )}
              <dl className="hire-b-prov">
                <div><dt>Source</dt><dd>{e.source}</dd></div>
                <div><dt>Date</dt><dd>{fmtDate(e.observedAt)}</dd></div>
                <div><dt>Origin</dt><dd>{ORIGIN[e.origin ?? 'SEED']}</dd></div>
                <div><dt>Shared</dt><dd>{e.visibility === 'PUBLIC_PROFILE' ? 'On their public profile' : `With ${orgName} only`}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <ProjectViewer items={items} first={first} />

      <section className="ds-sheet hire-b-grid" aria-labelledby="pf-fit">
        <h2 id="pf-fit" className="voice t24" style={{ margin: 0 }}>Against the Senior Backend brief</h2>
        <p className="t14 muted" style={{ margin: 0 }}>Requirement by requirement, never one score. “How to check” is the assessment Q recommends, and why.</p>
        <ul className="hire-b-fit">
          {cells.map(({ r, c }) => { const a = assessFor(w, id, r.reqId); return (
            <li key={r.reqId}>
              <div className="hire-b-row"><b>{r.label}<span className="t14 muted"> · {r.mustHave ? 'must have' : 'nice to have'}</span></b><LevelMark level={c.level} /></div>
              <p className="t14" style={{ margin: 0 }}>{c.correction ? `${c.correction.note} (your correction)` : c.items.filter((i) => !i.excluded).map((i) => i.note).join(' · ') || 'Nothing shared for this yet.'}{c.items.some((i) => i.excluded === 'review') ? ' · One result is under review and left out.' : ''}</p>
              <p className="t14" style={{ margin: 0 }}><span className="hire-b-q">How to check:</span> {a.skip ?? `${a.type} (${a.minutes}). ${a.why}`}</p>
            </li>
          ); })}
        </ul>
      </section>

      <section className="ds-sheet hire-b-grid" aria-labelledby="pf-q">
        <h2 id="pf-q" className="voice t24" style={{ margin: 0 }}>Questions Q would ask {first}</h2>
        <p className="t14 muted" style={{ margin: 0 }}>Generated from the gaps above: unknowns first, checked things only to go deeper.</p>
        <ol className="hire-b-qs">{qs.map((q) => <li key={q.id}><span>{q.text}</span><span className="t14 muted">{q.why}</span></li>)}</ol>
        <div className="ds-actions">
          {iv && <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Keep', act: { t: 'do', op: 'hb.plan.keep', args: { id: iv.id, questions: questionsFor(w, id) } } })}>Use these in the interview</button>}
          <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'More', act: { t: 'say', text: `what should I ask ${first} in the interview` } })}>Ask Q for more</button>
        </div>
      </section>
    </Canvas>
  );
}
