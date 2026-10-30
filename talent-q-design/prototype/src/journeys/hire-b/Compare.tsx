// Moved from src/screens/Compare.tsx into hire-b (rubric pass) so the weighting can come from the approved rubric.
// SC-041 Compare candidates, SC-039 Evidence inspector, SC-040 Role-fit explanation (rebuilt for R2, design pass).
// Requirement by requirement, never one score. The page reads top to bottom as: the finding (title) → what you
// chose (one filter row) → what changed since your last change → the ledger (chart) with Q's margin notes →
// the evidence behind every block (the table view) → the inspector for one block. Ada changes the choices by
// clicking or by telling Q; both go through the same op, so "what changed" is recorded either way.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useWorld } from '../../mock/world';
import { useViewState, runAction } from '../../q/core/engine';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { arrive } from '../../ds/motion';
import { SwitchRow } from '../../ds/Switch';
import { Link } from '../../ui/router';
import { cellFor, changesSince, defaultView, firstName, headline, KORA_ROLE, LEVEL_WORD, nameOf, readingOf, reqsOf, roleRubric, rolePeople, shortLabel, usesRubric, weightingNote, weightOf, type CompareView } from './model';
import { CvProofView } from '../evidence/recruiter/CvProof';
import { proofReading, SHAPE_WORD } from '../evidence/model';
import { Ledger } from './Ledger';
import { LevelMark, VerTag, fmtDate, verOf } from './ui';
import './ops';
import { roleIndex } from '../../state/areas/rubrics';
import { indexLine, studioPath } from '../rubric/model';

/** Q's margin notes for the CV and proof view: the shape per person in words, then what that means. */
function proofNotes(w: Parameters<typeof readingOf>[0], v: CompareView): string[] {
  if (!v.people.length || !v.criteria.length) return ['Pick at least one person and one requirement and I’ll set the CV beside the evidence.'];
  const lab = (ids: string[]) => ids.filter((r) => v.criteria.includes(r)).map((r) => shortLabel(w, r));
  const join = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const out = v.people.map((p) => { const r = proofReading(w, p); const b = lab(r.beyondCv), c = lab(r.claimedOnly);
    return `${nameOf(w, p)}: ${SHAPE_WORD[r.shape].charAt(0).toLowerCase()}${SHAPE_WORD[r.shape].slice(1)}.${b.length ? ` Shown beyond the CV: ${join(b)}.` : ''}${c.length ? ` Claimed, not yet shown: ${join(c)}.` : ''}`; });
  out.push('A CV’s wording isn’t evidence either way: a polished CV isn’t proof, and a thin one isn’t a point in anyone’s favour. Unknown isn’t zero; it’s a question to ask.');
  out.push(weightingNote(w, v));
  return out;
}

const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

export function Compare() {
  const w = useWorld((x) => x);
  const [stored] = useViewState<Partial<CompareView> | undefined>('cmp', undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const insRef = useRef<HTMLElement>(null);
  const v: CompareView = { ...defaultView(w), ...(stored ?? {}) };
  const set = (patch: Partial<CompareView>) => void runAction({ label: 'Update comparison', act: { t: 'do', op: 'hb.cmp.set', args: patch } });
  const pool = rolePeople(w);
  const reqs = reqsOf(w);
  const people = v.people.filter((p) => pool.includes(p));
  const crit = reqs.filter((r) => v.criteria.includes(r.reqId));
  const view: CompareView = { ...v, people, criteria: crit.map((r) => r.reqId) };
  const lens = v.lens === 'proof' ? 'proof' : 'ledger';
  const notes = lens === 'proof' ? proofNotes(w, view) : readingOf(w, view);
  const open = v.open && people.includes(v.open.pid) ? { ...v.open, cell: cellFor(w, v.open.pid, v.open.reqId, view) } : null;
  const change = v.last ? changesSince(w, view, v.last) : null;
  const openKey = open ? `${open.pid}:${open.reqId}` : '';
  // Orientation: bring the inspector into view when a block is chosen (smooth unless reduced motion).
  useEffect(() => { if (openKey) insRef.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [openKey]);

  if (!pool.length) return (
    <Canvas title="No one to compare yet" kicker="Senior Backend Engineer" open onClose={() => {}}>
      <section className="ds-sheet hire-b-empty"><Glyph k="none" /><div><b>The comparison fills in once people are in this role’s pipeline.</b><p className="t14 muted" style={{ margin: 0 }}>Ask Q to start a search, or open <Link to="/r/plan">plans and agents</Link>.</p></div></section>
    </Canvas>
  );
  const ready = people.length > 0 && crit.length > 0;
  const rub = roleRubric(w);
  const summary = `${people.length} ${people.length === 1 ? 'person' : 'people'} · ${crit.length} requirement${crit.length === 1 ? '' : 's'}${v.lastYear ? ' · last year only' : ''} · ${usesRubric(w, v.weighting) ? `rubric v${rub!.v} weights` : 'must-haves equal'}`;

  return (
    <Canvas title={lens === 'proof' ? 'What the CVs say, and what the evidence shows' : headline(w, view)} kicker="Senior Backend Engineer · comparison" open onClose={() => {}} qLine={notes[0]}
      views={[{ id: 'ledger', label: 'Evidence ledger' }, { id: 'proof', label: 'CV and proof' }]} view={lens} setView={(x) => set({ lens: x, open: null })}
      aside={<div className="ds-actions"><button type="button" className="ds-btn quiet" onClick={() => set(defaultView(w))}>Reset choices</button></div>}>

      <section className="ds-sheet hire-b-filters" data-open={filtersOpen ? '1' : '0'} aria-label="What to compare">
        <button type="button" className="hire-b-filters-sum" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
          <span><span className="lab">Comparing</span> {summary}</span><span className="hire-b-filters-chev" aria-hidden="true">{filtersOpen ? 'Done' : 'Change'}</span>
        </button>
        <div className="hire-b-filters-body">
          <div className="hire-b-frow"><span className="lab" id="cmp-people">People</span>
            <div className="hire-b-chips" role="group" aria-labelledby="cmp-people">
              {pool.map((p) => <button key={p} type="button" className="ds-filter" aria-pressed={people.includes(p)} onClick={() => set({ people: toggle(people, p) })}>{nameOf(w, p)}</button>)}
            </div>
          </div>
          <div className="hire-b-frow"><span className="lab" id="cmp-crit">Requirements</span>
            <div className="hire-b-chips" role="group" aria-labelledby="cmp-crit">
              {reqs.map((r) => <button key={r.reqId} type="button" className="ds-filter" aria-pressed={v.criteria.includes(r.reqId)} onClick={() => set({ criteria: toggle(v.criteria, r.reqId) })}>{r.label}{r.mustHave ? '' : <span className="muted"> · nice to have</span>}</button>)}
            </div>
          </div>
          <div className="hire-b-switches">
            <SwitchRow label="Evidence from the last year only" help="Leaves out anything older than a year." on={v.lastYear} onChange={(on) => set({ lastYear: on })} />
            <SwitchRow label="Weigh must-haves equally" help={rub ? `Turns off the rubric v${rub.v} weights for this view. The rubric itself doesn’t change.` : 'Already on: there’s no approved rubric for this role yet.'} on={v.weighting === 'EQUAL' || !rub} onChange={(on) => set({ weighting: on ? 'EQUAL' : 'RUBRIC' })} />
          </div>
        </div>
      </section>

      <AnimatePresence initial={false}>
        {ready && v.last && change && (
          <motion.section key={v.last.at} {...arrive} className="hire-b-changed-note" aria-live="polite" aria-labelledby="cmp-ch">
            <h2 id="cmp-ch" className="lab hire-b-q" style={{ margin: 0 }}>What changed</h2>
            <p style={{ margin: 0 }}><b>{v.last.label}.</b> {change.moves.length ? change.moves.join(' ') : change.margin ?? ''}</p>
            {change.cells.length > 0 && <ul className="hire-b-list t14">{change.cells.map((c) => <li key={`${c.pid}${c.reqId}`}><span className="hire-b-dia" aria-hidden="true" />{firstName(w, c.pid)} · {shortLabel(w, c.reqId)}: {LEVEL_WORD[c.from].toLowerCase()} → <b>{LEVEL_WORD[c.to].toLowerCase()}</b></li>)}</ul>}
          </motion.section>
        )}
      </AnimatePresence>

      {ready && lens === 'proof' && (
        <section className="ds-sheet hire-b-grid evr-cvp-sec" aria-labelledby="cmp-p">
          <div className="hire-b-row"><h2 id="cmp-p" className="voice t24" style={{ margin: 0 }}>CV and proof, requirement by requirement</h2><span className="t14 muted">Not a ranking. Select a cell to see the evidence</span></div>
          <CvProofView w={w} v={view} onCell={(pid, reqId) => set({ open: v.open?.pid === pid && v.open.reqId === reqId ? null : { pid, reqId } })} />
          <aside className="hire-b-margin evr-cvp-notes" aria-labelledby="cmp-pq" aria-live="polite">
            <h3 id="cmp-pq" className="lab hire-b-q" style={{ margin: 0 }}>Q’s notes</h3>
            <ul className="hire-b-list t14">{notes.map((n) => <li key={n}><span className="hire-b-dia" aria-hidden="true" />{n}</li>)}</ul>
            <p className="t14" style={{ margin: 0 }}><Link to={studioPath(KORA_ROLE)}>{rub ? `Open rubric v${rub.v}` : 'Set weights in a rubric'}</Link></p>
          </aside>
        </section>
      )}

      {lens === 'proof' && ready ? null : !ready ? (
        <section className="ds-sheet hire-b-empty"><Glyph k="unclear" /><div><b>{!people.length ? 'Pick at least one person.' : 'Pick at least one requirement.'}</b><p className="t14 muted" style={{ margin: 0 }}>Or tell Q, for example “compare Tobi and Zara on payments and Go”.</p></div></section>
      ) : (
        <section className="ds-sheet hire-b-grid hire-b-ledger-sec" aria-labelledby="cmp-l">
          <div className="hire-b-row"><h2 id="cmp-l" className="voice t24" style={{ margin: 0 }}>Who to talk to first</h2><span className="t14 muted">Select a block to see the evidence</span></div>
          <div className="hire-b-ledger-wrap">
            <Ledger w={w} v={view} change={change} onCell={(pid, reqId) => set({ open: v.open?.pid === pid && v.open.reqId === reqId ? null : { pid, reqId } })} />
            <aside className="hire-b-margin" aria-labelledby="cmp-q" aria-live="polite">
              <h3 id="cmp-q" className="lab hire-b-q" style={{ margin: 0 }}>Q’s notes</h3>
              <ul className="hire-b-list t14">{notes.map((n) => <li key={n}><span className="hire-b-dia" aria-hidden="true" />{n}</li>)}</ul>
              <p className="t14" style={{ margin: 0 }}><Link to={studioPath(KORA_ROLE)}>{rub ? `Open rubric v${rub.v}` : 'Set weights in a rubric'}</Link></p>
            </aside>
          </div>
        </section>
      )}

      {ready && rub && lens === 'ledger' && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="cmp-sc">
          <div className="hire-b-row"><h2 id="cmp-sc" className="voice t24" style={{ margin: 0 }}>Scorecards on rubric v{rub.v}</h2><span className="t14 muted">Index only with coverage</span></div>
          {people.some((p) => roleIndex(w, KORA_ROLE, p, rub.v).index !== null)
            ? <ul className="hire-b-list t14">{people.map((p) => { const i = roleIndex(w, KORA_ROLE, p, rub.v); return <li key={p}><span className="hire-b-dia" aria-hidden="true" /><span><Link to={`/r/people/${p}`}>{nameOf(w, p)}</Link>: {i.index === null ? 'not rated yet' : `${indexLine(i)} · ${i.reviewed} of ${i.observed} rating${i.observed === 1 ? '' : 's'} reviewed by a person`}</span></li>; })}</ul>
            : <p className="t14" style={{ margin: 0 }}>Nobody has been rated against rubric v{rub.v} yet. Open a profile and ask Q to rate from shared evidence, or add a walkthrough review.</p>}
          <p className="t14 muted" style={{ margin: 0 }}>The ledger above ranks shared evidence; the index rates it against the rubric’s anchors. Unknown criteria aren’t counted as zero, so a high index at low coverage isn’t a strong result. Not a validated test.</p>
        </section>
      )}

      {open && (
        <section ref={insRef} className="ds-sheet hire-b-grid hire-b-inspect" aria-labelledby="cmp-ins" aria-live="polite">
          <div className="hire-b-row"><h2 id="cmp-ins" className="voice t24" style={{ margin: 0 }}>{firstName(w, open.pid)} · {reqs.find((r) => r.reqId === open.reqId)?.label}</h2><button type="button" className="ds-btn quiet" onClick={() => set({ open: null })}>Close</button></div>
          <LevelMark level={open.cell.level} />
          {open.cell.correction && <p className="t14" style={{ margin: 0 }}>You corrected this: {open.cell.correction.note}. Say “undo” to restore Q’s reading.</p>}
          {open.cell.items.length === 0 && <p className="muted" style={{ margin: 0 }}>{firstName(w, open.pid)} hasn’t shared anything for this. That’s a question for the interview, not a mark against them.</p>}
          <ul className="hire-b-ev">
            {open.cell.items.map((i) => (
              <li key={i.e.evidenceId} data-out={i.excluded ? '1' : undefined}>
                <div className="hire-b-row"><b>{i.e.confidential ? 'Confidential item (contents not shown)' : i.e.title}</b><VerTag v={verOf(i.e)} /></div>
                {!i.e.confidential && <p className="t14" style={{ margin: 0 }}>{i.e.shows}</p>}
                <p className="t14 muted" style={{ margin: 0 }}>{i.e.source} · {fmtDate(i.e.observedAt)}</p>
                {i.excluded && <p className="t14" style={{ margin: 0 }}><Glyph k="none" size={14} /> Left out: {({ review: 'the candidate disputed this result; it’s under review until resolved', old: 'older than a year, and you asked for the last year only', confidential: 'confidential contents aren’t used', failed: 'the check failed' })[i.excluded]}.</p>}
              </li>
            ))}
          </ul>
          <p className="t14 muted" style={{ margin: 0 }}>Only what {firstName(w, open.pid)} shared with Kora. Q never uses private or withdrawn items. <Link to={`/r/people/${open.pid}`}>Open {firstName(w, open.pid)}’s profile</Link></p>
        </section>
      )}

      {ready && lens === 'ledger' && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="cmp-t">
          <h2 id="cmp-t" className="voice t24" style={{ margin: 0 }}>The evidence behind each block</h2>
          <div className="hire-b-table">
            <table className="ds-table hire-b-etable">
              <caption className="sr">Evidence for each requirement and person. Select a cell to see where it comes from.</caption>
              <colgroup><col style={{ width: people.length > 3 ? '19%' : '24%' }} />{people.map((p) => <col key={p} />)}</colgroup>
              <thead><tr><th scope="col">Requirement</th>{people.map((p) => <th key={p} scope="col"><Link to={`/r/people/${p}`}>{nameOf(w, p)}</Link></th>)}</tr></thead>
              <tbody>
                {crit.map((r) => (
                  <tr key={r.reqId}>
                    <th scope="row"><span className="hire-b-grid" style={{ gap: 2 }}><span>{r.label}</span><span className="t14 muted">{r.mustHave ? 'Must have' : 'Nice to have'}{usesRubric(w, v.weighting) ? (weightOf(w, r.reqId, v.weighting) ? ` · rubric weight ${weightOf(w, r.reqId, v.weighting)}` : ' · not in the rubric') : ''}</span></span></th>
                    {people.map((p) => { const c = cellFor(w, p, r.reqId, view); const sel = v.open?.pid === p && v.open.reqId === r.reqId; return (
                      <td key={p}>
                        <button type="button" className="hire-b-cell" aria-pressed={sel} aria-label={`${nameOf(w, p)}, ${r.label}: ${LEVEL_WORD[c.level]}. Show where this comes from`} onClick={() => set({ open: sel ? null : { pid: p, reqId: r.reqId } })}>
                          <LevelMark level={c.level} small />
                          <span className="t14 muted">{c.correction ? `${c.correction.note} (your correction)` : c.items.filter((i) => !i.excluded).map((i) => i.note)[0] ?? (c.items.some((i) => i.excluded === 'review') ? 'Result under review, left out' : c.items.some((i) => i.excluded === 'old') ? 'Only older evidence' : 'Nothing shared yet')}</span>
                        </button>
                      </td>); })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hire-b-cards">
            {people.map((p) => (
              <article key={p} className="hire-b-card" aria-label={nameOf(w, p)}>
                <h3 style={{ margin: 0, fontSize: 16 }}><Link to={`/r/people/${p}`}>{nameOf(w, p)}</Link></h3>
                {crit.map((r) => { const c = cellFor(w, p, r.reqId, view); const sel = v.open?.pid === p && v.open.reqId === r.reqId; return (
                  <button key={r.reqId} type="button" className="hire-b-cell hire-b-cell-row" aria-pressed={sel} onClick={() => set({ open: sel ? null : { pid: p, reqId: r.reqId } })}>
                    <span className="t14">{r.label}</span><LevelMark level={c.level} small />
                    {(c.correction || c.items.some((i) => i.excluded === 'review')) && <span className="t14 muted hire-b-cell-note">{c.correction ? `${c.correction.note} (your correction)` : 'Result under review, left out'}</span>}
                  </button>); })}
              </article>
            ))}
          </div>
        </section>
      )}
    </Canvas>
  );
}
