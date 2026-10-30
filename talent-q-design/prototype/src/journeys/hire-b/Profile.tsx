// Candidate profile for recruiters (R2, design pass). Reads in the order Ada needs it: who this is and Q's
// one-line reading (title + lede) → where they are → how they stand against the brief (one evidence strip and a
// row per requirement, each linking to the items it rests on, with how to check it) → everything they shared,
// checked items first, with provenance on one quiet line → the safe project viewer → questions to ask.
// Only what the person shared with the viewer's organisation; confidential items show that they exist, never
// their contents. Privacy goes through canSeeCandidate / visibleEvidence (mock/world), never around them.
import { useEffect, useRef, useState } from 'react';
import { actorOf, canSeeCandidate, useWorld, visibleEvidence, type World } from '../../mock/world';
import type { Evidence } from '@contracts';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { STAGES, STAGE_LABEL } from '../../state/domain';
import { hireB, type Level } from '../../state/areas/hire-b';
import { assessFor, cellFor, firstName, KORA_ROLE, questionsFor, reqsOf, viewerOrg, visibleIds } from './model';
import { markSeen } from './ops';
import { Ledger } from './Ledger';
import { PROJECTS } from './projects';
import { ProjectViewer } from './ProjectViewer';
import { KIND, LevelMark, ORIGIN, VerTag, fmtDate, verOf } from './ui';
import { PageIndex } from '../../ds/PageIndex';
import { Scorecard } from '../rubric/Scorecard';
import { roleIndex } from '../../state/areas/rubrics';
import { studioPath } from '../rubric/model';
import { media, visibleSegments } from '../../state/areas/media';
import { CvDocument, groupByProof, MutualFit, ReusePanel, ReviewPanel } from '../evidence/recruiter/ProfileProof';
import { ProofHeading } from '../evidence/recruiter/ui';

const IN_WORDS: Record<string, string> = { r1: 'payments', r2: 'Go', r3: 'Postgres', r4: 'on-call leadership', r5: 'mentoring' };
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const WHY_TAG: Record<Level, string> = { verified: 'Already checked: go deeper', evidenced: 'Shown, not checked', partial: 'Thin or older evidence', claim: 'Only claimed', none: 'Not shown yet' };

/** Q's reading of the evidence in one or two plain sentences: what's checked, what's thin, what's unknown. */
function ledeFor(w: World, id: string, cells: { r: { reqId: string }; c: { level: Level } }[], claims: number) {
  const first = firstName(w, id);
  const by = (ls: Level[]) => cells.filter((x) => ls.includes(x.c.level)).map((x) => IN_WORDS[x.r.reqId] ?? x.r.reqId);
  const ver = by(['verified']), shown = by(['evidenced']), thin = by(['partial']), unknown = by(['none', 'claim']);
  const out: string[] = [];
  if (!ver.length && claims) out.push(`${first}’s CV makes strong claims, but little of what’s shared backs them yet.`);
  if (ver.length) out.push(`Checked evidence for ${list(ver)}${shown.length ? `, and ${list(shown)} shown but not checked` : ''}.`);
  else if (shown.length) out.push(`${cap(list(shown))} ${shown.length === 1 ? 'is' : 'are'} shown but not yet checked.`);
  if (thin.length) out.push(`${cap(list(thin))}: thin or older evidence.`);
  if (unknown.length) out.push(`${cap(list(unknown))} ${unknown.length === 1 ? 'isn’t' : 'aren’t'} shown yet, so ask in the interview.`);
  return out.join(' ');
}

export function Profile({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const me = actorOf(w);
  const person = w.people.find((p) => p.personId === id);
  const org = viewerOrg(w);
  const orgName = w.orgs.find((o) => o.id === org)?.name ?? 'your organisation';
  const prevSeen = useRef<{ at: string; items: string[] } | null | undefined>(undefined);
  const [viewSel, setViewSel] = useState<string | undefined>(undefined);
  if (prevSeen.current === undefined) prevSeen.current = hireB(w).seen[me.id]?.[id] ?? null;
  useEffect(() => { if (person) markSeen(id); }, [id, person, w.evidence]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!person) return (
    <Canvas title="We can’t find this person" kicker="Candidate profile" open onClose={() => history.back()}>
      <section className="ds-sheet hire-b-empty"><Glyph k="none" /><div><b>There’s no one with this link in your hiring.</b><p className="t14 muted" style={{ margin: 0 }}>They may have deleted their account. <Link to="/r/compare">Back to the comparison</Link></p></div></section>
    </Canvas>
  );
  const first = firstName(w, id);
  const withdrawn = w.consents[id]?.withdrawnFrom.includes(org);
  if (withdrawn || !canSeeCandidate(w, id, org)) return (
    <Canvas title={`You can’t see ${first}’s profile`} kicker="Candidate profile" open onClose={() => history.back()}>
      <section className="ds-sheet hire-b-gone" role="status">
        <Glyph k="none" size={28} />
        <div className="hire-b-grid" style={{ gap: 8 }}>
          <h2 className="voice t24" style={{ margin: 0 }}>{withdrawn ? `${first} has stopped sharing with ${orgName}` : `Nothing here you’re allowed to see`}</h2>
          <p style={{ margin: 0 }}>{withdrawn ? `${first} has stopped sharing their profile with ${orgName}. Q no longer uses anything they shared, and won’t say what it was.` : `${first} isn’t discoverable and hasn’t applied to ${orgName}.`}</p>
          <p className="t14 muted" style={{ margin: 0 }}>{withdrawn ? `${first} is no longer in your comparison. Notes your team wrote stay in your records; anything ${first} shared does not.` : 'If they apply or make their profile discoverable, it will appear here.'}</p>
          <div className="ds-actions"><Link className="ds-btn" to="/r/compare">Back to the comparison</Link></div>
        </div>
      </section>
    </Canvas>
  );

  const items = visibleEvidence(w, id, org);
  const revoked = w.evidence.filter((e) => e.ownerId === id && e.revokedFrom?.includes(org)).length;
  const reqs = reqsOf(w);
  const cells = reqs.map((r) => ({ r, c: cellFor(w, id, r.reqId) }));
  const pipe = w.pipeline.find((p) => p.personId === id && p.mandateId === KORA_ROLE);
  const iv = w.interviews.find((i) => i.personId === id && i.orgId === org && i.mandateId === KORA_ROLE);
  const prev = prevSeen.current;
  const nowIds = visibleIds(w, id);
  const fresh = prev ? nowIds.filter((x) => !prev.items.includes(x)).map((x) => x.split(':')) : [];
  const claims = items.filter((e) => e.kind === 'CLAIM');
  const weakVsClaim = claims.length > 0 && cells.filter((x) => x.c.level === 'verified' || x.c.level === 'evidenced').length <= 1;
  const qs = questionsFor(w, id).slice(0, 3);
  const lede = ledeFor(w, id, cells, claims.length);
  const conf = items.filter((e) => e.confidential);
  const goTo = (eid: string) => document.getElementById(`ev-${eid}`)?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const preview = (eid: string) => { setViewSel(eid); requestAnimationFrame(() => document.getElementById('pv-h')?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })); };
  const rIdx = roleIndex(w, KORA_ROLE, id);
  // History: audited events about this person that the viewer's organisation may see (newest first).
  const hist = w.events.filter((e) => (e.data as { personId?: string } | undefined)?.personId === id && (e.scope === `ORG:${org}` || e.scope === `SHARED:${org}:${id}`)).slice(-12).reverse();
  void studioPath;
  const stageIdx = pipe ? STAGES.indexOf(pipe.stage as typeof STAGES[number]) : -1;

  const evItem = (e: Evidence) => (
    <li key={e.evidenceId} id={`ev-${e.evidenceId}`} tabIndex={-1}>
      <div className="hire-b-row"><span className="lab">{KIND[e.kind]}{e.confidential ? ' · confidential' : ''}</span><VerTag v={verOf(e)} /></div>
      {e.confidential ? (
        <>
          <b>{e.redactedOf ? 'A confidential project, shared as an attestation' : 'A confidential item'}</b>
          <p className="t14" style={{ margin: 0 }}>{first} has shared that this exists. Its contents are confidential: Q can’t read or show them and doesn’t use them to compare. You can ask {first} about it in the interview.</p>
        </>
      ) : (
        <>
          <b>{e.title}</b>
          <p className="t14" style={{ margin: 0 }}>{e.shows}</p>
          {e.limits && <p className="t14 muted" style={{ margin: 0 }}><span className="hire-b-limit">Doesn’t show</span> {e.limits.replace(/^Limits:\s*/, '')}</p>}
        </>
      )}
      <p className="hire-b-provline">Source: {e.source} · {fmtDate(e.observedAt)} · {ORIGIN[e.origin ?? 'SEED'].toLowerCase()} · {e.visibility === 'PUBLIC_PROFILE' ? 'on their public profile' : `shared with ${orgName} only`}</p>
      {PROJECTS[e.evidenceId] && !e.confidential && <div><button type="button" className="ds-btn quiet hire-b-inline" onClick={() => preview(e.evidenceId)}>Preview safely</button></div>}
    </li>
  );

  return (
    <Canvas title={person.name} kicker={`Candidate · ${w.mandate.title}`} open onClose={() => history.back()} qLine={lede}
      aside={<div className="ds-actions">
        <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Compare', act: { t: 'say', text: `compare ${first} with the others` } })}>Compare</button>
        {iv && <Link className="ds-btn" to={`/r/interviews/${iv.id}`}>Interview</Link>}
        <Link className="ds-btn quiet" to="/r/messages">Messages</Link>
      </div>}>
      {/* Q's reading of the evidence leads the page; the person's name is the title (critique F4). */}
      <p className="voice hire-b-lede" style={{ margin: 0 }}><span className="hire-b-lede-q" aria-hidden="true" />{lede}</p>
      {/* AD-B-03: the profile is long on phones (about nine screens), so it gets a sticky in-page index. */}
      <PageIndex items={[{ id: 'pf-cv', label: 'CV' }, { id: 'pf-fit', label: 'Fit' }, { id: 'pf-reuse', label: 'Gaps' }, { id: 'pf-score', label: 'Scorecard' }, { id: 'pf-ev', label: 'Evidence' }, { id: 'pf-mutual', label: 'Mutual fit' }, { id: 'pf-q', label: 'Interview' }, { id: 'pf-hist', label: 'History' }]} />
      {w.network === 'offline' && <div className="ds-banner" data-k="warn" role="status"><Glyph k="unclear" /><span>You’re offline. This is what was loaded; new sharing changes will appear when you reconnect.</span><span /></div>}
      {fresh.length > 0 && (
        <div className="ds-banner" role="status"><Glyph k="verified" /><span><b>New since you last looked ({fmtDate(prev!.at)}):</b> {fresh.map(([eid, v]) => `${items.find((e) => e.evidenceId === eid)?.title ?? 'an item'} (${v === 'VERIFIED' ? 'verified' : v.toLowerCase().replace('_', ' ')})`).join('; ')}.</span><span /></div>
      )}
      {weakVsClaim && (
        <section className="ds-banner" data-k="warn" aria-label="Q’s honest read"><Glyph k="unclear" />
          <span><b>Strong claims, limited supporting evidence.</b> Most of {first}’s CV is <i>unknown</i>, which isn’t the same as weak. What would settle it: one short piece of work, a reference, or a check of an item already shared.</span>
          <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Ask Q', act: { t: 'say', text: `is ${first}'s cv backed by evidence` } })}>Ask Q why</button>
        </section>
      )}

      <ReviewPanel w={w} pid={id} />

      <section className="ds-sheet hire-b-facts" aria-label={`About ${first}`}>
        <div className="hire-b-grid" style={{ gap: 4 }}>
          <h2 className="hire-b-facth" style={{ margin: 0 }}>About {first}</h2>
          <p style={{ margin: 0 }}>{person.headline}</p>
          <p className="t14 muted" style={{ margin: 0 }}>{person.location} · {person.timezone.replace('_', ' ')}</p>
        </div>
        <div className="hire-b-grid" style={{ gap: 6 }}>
          <h2 className="hire-b-facth" style={{ margin: 0 }}>Where {first} is</h2>
          {pipe ? (
            <>
              <p style={{ margin: 0 }}><b>{STAGE_LABEL[pipe.stage]}</b><span className="t14 muted"> · {stageIdx >= 0 ? `step ${stageIdx + 1} of ${STAGES.length} · ` : ''}since {fmtDate(pipe.at)}</span></p>
              {stageIdx >= 0 && <ol className="hire-b-meter" aria-label="Pipeline stages">{STAGES.map((s, i) => <li key={s} data-on={i <= stageIdx ? '1' : undefined} aria-current={i === stageIdx ? 'step' : undefined}><span className="sr">{STAGE_LABEL[s]}{i === stageIdx ? ' (current stage)' : i < stageIdx ? ' (done)' : ''}</span></li>)}</ol>}
              {pipe.note && <p className="t14 muted" style={{ margin: 0 }}>{pipe.note}</p>}
              <p className="t14" style={{ margin: 0 }}><Link to="/r/pipeline">Open the pipeline</Link></p>
            </>
          ) : <p className="muted" style={{ margin: 0 }}>{first} isn’t in {orgName}’s Senior Backend pipeline.</p>}
        </div>
      </section>

      <CvDocument w={w} pid={id} />

      <section id="pf-fit" className="ds-sheet hire-b-grid" aria-labelledby="pf-fit-h">
        <div className="hire-b-row"><h2 id="pf-fit-h" className="voice t24" style={{ margin: 0 }}>Against the Senior Backend brief</h2><Link className="t14" to="/r/compare">Compare with others</Link></div>
        <Ledger w={w} v={{ people: [id], criteria: reqs.map((r) => r.reqId), lastYear: false, weighting: 'RUBRIC' }} ranked={false} bare noKey />
        <ul className="hire-b-fit">
          {cells.map(({ r, c }) => { const a = assessFor(w, id, r.reqId); const live = c.items.filter((i) => !i.excluded); return (
            <li key={r.reqId}>
              <div className="hire-b-row"><span><b>{r.label}</b><span className="t14 muted"> · {r.mustHave ? 'must have' : 'nice to have'}</span></span><LevelMark level={c.level} /></div>
              {c.correction ? <p className="t14" style={{ margin: 0 }}>{c.correction.note} (your correction)</p>
                : live.length ? <ul className="hire-b-refs">{live.map((i) => <li key={i.e.evidenceId}><button type="button" className="hire-b-ref" onClick={() => goTo(i.e.evidenceId)}>{i.note}<span className="sr">, go to the item</span></button></li>)}</ul>
                : <p className="t14 muted" style={{ margin: 0 }}>Nothing shared for this yet.</p>}
              {c.items.some((i) => i.excluded === 'review') && <p className="t14" style={{ margin: 0 }}><Glyph k="partial" size={14} /> One result is under review and left out.</p>}
              <p className="t14 hire-b-how"><span className="hire-b-q">How to check</span> {a.skip ? 'Already checked at the source. Talk about it; don’t test it again.' : `${a.type}${a.minutes !== '—' ? ` (${a.minutes})` : ''}. ${a.why}`}</p>
            </li>
          ); })}
        </ul>
      </section>

      <ReusePanel w={w} pid={id} />

      <section id="pf-score" className="ds-sheet hire-b-grid" aria-labelledby="pf-score-h">
        <div className="hire-b-row"><h2 id="pf-score-h" className="voice t24" style={{ margin: 0 }}>Scorecard</h2><span className="t14 muted">{rIdx.v ? `Rubric v${rIdx.v}` : 'No rubric yet'}</span></div>
        <p className="t14 muted" style={{ margin: 0 }}>The fit above says how strong the proof is. The scorecard rates the level that proof shows, against the rubric’s anchors. They’re separate signals.</p>
        <Scorecard personId={id} mandateId={KORA_ROLE} orgId={org} />
      </section>

      <section id="pf-ev" className="ds-sheet hire-b-grid" aria-labelledby="pf-ev-h">
        <div className="hire-b-row"><h2 id="pf-ev-h" className="voice t24" style={{ margin: 0 }}>Shared with {orgName}</h2><span className="t14 muted">{items.length} item{items.length === 1 ? '' : 's'}</span></div>
        <p className="t14 muted" style={{ margin: 0 }}>Only what {first} chose to share with {orgName}. Private items, practice and anything they took back are never shown or counted.</p>
        {/* Video evidence (AD-F-09): only items with at least one part shared with this organisation, never the rest. */}
        {media(w).items.filter((m) => m.ownerId === id && visibleSegments(w, m.id, org).length > 0).map((m) => (
          <p key={m.id} className="t14" style={{ margin: 0 }}><Glyph k="verified" size={14} /> {first} shared parts of a video: <b>{m.title}</b>. <Link to={`/r/people/${id}/video`}>Open the video evidence</Link></p>
        ))}
        {revoked > 0 && <p className="t14" role="status" style={{ margin: 0 }}><Glyph k="none" size={14} /> {first} ended {orgName}’s access to {revoked === 1 ? 'an item' : `${revoked} items`} they’d shared. Q no longer uses {revoked === 1 ? 'it' : 'them'}.</p>}
        {items.length === 0 && <div className="hire-b-empty"><Glyph k="none" /><div><b>{first} hasn’t shared anything with you yet.</b><p className="t14 muted" style={{ margin: 0 }}>Ask about their work in conversation instead of assuming.</p></div></div>}
        {/* J12: grouped by how each item is known (the same five words the candidate sees), each with its meaning. */}
        {groupByProof(w, items).map((g) => <div key={g.c} className="evr-pgroup" data-c={g.c}><ProofHeading c={g.c} n={g.items.length} /><ul className="hire-b-ev">{g.items.map(evItem)}</ul></div>)}
        {conf.length > 0 && <><h3 className="hire-b-evh"><Glyph k="unclear" size={16} />Confidential <span className="muted">{conf.length}</span></h3><ul className="hire-b-ev">{conf.map(evItem)}</ul></>}
      </section>

      <MutualFit w={w} pid={id} />

      <ProjectViewer items={items} first={first} sel={viewSel} onSel={setViewSel} />

      <section id="pf-q" className="ds-sheet hire-b-grid" aria-labelledby="pf-q-h">
        <h2 id="pf-q-h" className="voice t24" style={{ margin: 0 }}>Questions Q would ask {first}</h2>
        <p className="t14 muted" style={{ margin: 0 }}>Built from the evidence above: must-haves first, the least-shown first. Checked things are only there to go deeper.</p>
        <ol className="hire-b-qlist">{qs.map((q) => <li key={q.id}><span className="hire-b-qtags"><span className="hire-b-qreq">{reqs.find((r) => r.reqId === q.reqId)?.label}</span><span className="hire-b-qwhy" data-l={q.level}><Glyph k={q.level === 'verified' ? 'verified' : q.level === 'none' ? 'none' : q.level === 'claim' ? 'unclear' : q.level === 'partial' ? 'partial' : 'full'} size={12} />{WHY_TAG[q.level]}</span></span><span className="hire-b-qtext">{q.text}</span></li>)}</ol>
        <div className="ds-actions">
          {iv && <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Keep', act: { t: 'do', op: 'hb.plan.keep', args: { id: iv.id, questions: questionsFor(w, id) } } })}>Use these in the interview</button>}
          <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'More', act: { t: 'say', text: `what should I ask ${first} in the interview` } })}>Ask Q for more</button>
        </div>
      </section>
      <section id="pf-hist" className="ds-sheet hire-b-grid" aria-labelledby="pf-hist-h">
        <h2 id="pf-hist-h" className="voice t24" style={{ margin: 0 }}>History</h2>
        {hist.length ? <ol className="hire-b-hist">{hist.map((e) => <li key={e.id}><span className="t14 muted num">{fmtDate(e.at)}</span><span className="t14">{e.text}</span></li>)}</ol>
          : <p className="t14 muted" style={{ margin: 0 }}>Nothing recorded about {first} yet. Ratings, overrides, reviews and pipeline moves appear here.</p>}
      </section>
    </Canvas>
  );
}
