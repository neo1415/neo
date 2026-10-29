// SC-041 Compare candidates, SC-039 Evidence inspector, SC-040 Role-fit explanation (rebuilt for R2).
// Requirement by requirement, never one score. Ada chooses the people and the criteria (by clicking or by
// telling Q); Q's margin notes are rewritten from state whenever anything changes. The global Q thread is
// the only conversation. View state survives navigation, so "go back to the comparison" restores it exactly.
import { useWorld } from '../mock/world';
import { useViewState, runAction } from '../q/core/engine';
import { Canvas } from '../ds/Workspace';
import { Glyph, GlyphKey } from '../ds/Glyph';
import { Link } from '../ui/router';
import { cellFor, defaultView, firstName, nameOf, rank, readingOf, reqsOf, rolePeople, weightOf, type CompareView } from '../journeys/hire-b/model';
import { LevelMark, VerTag, fmtDate, verOf } from '../journeys/hire-b/ui';
import '../journeys/hire-b/ops';

const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

export function Compare() {
  const w = useWorld((x) => x);
  const [stored] = useViewState<Partial<CompareView> | undefined>('cmp', undefined);
  const v: CompareView = { ...defaultView(w), ...(stored ?? {}) };
  const set = (patch: Partial<CompareView>) => void runAction({ label: 'Update comparison', act: { t: 'do', op: 'hb.cmp.set', args: patch } });
  const pool = rolePeople(w);
  const reqs = reqsOf(w);
  const people = v.people.filter((p) => pool.includes(p));
  const crit = reqs.filter((r) => v.criteria.includes(r.reqId));
  const view = { ...v, people, criteria: crit.map((r) => r.reqId) };
  const ranked = rank(w, view);
  const notes = readingOf(w, view);
  const open = v.open && people.includes(v.open.pid) ? { ...v.open, cell: cellFor(w, v.open.pid, v.open.reqId, view) } : null;

  if (!pool.length) return (
    <Canvas title="No one to compare yet" kicker="Senior Backend · comparison" open onClose={() => {}}>
      <section className="ds-sheet hire-b-grid"><p style={{ margin: 0 }}>Q builds the comparison once people are in the role’s pipeline. Ask Q to start a search, or open <Link to="/r/plan">plans and agents</Link>.</p></section>
    </Canvas>
  );
  const title = !people.length || !crit.length ? 'Choose who and what to compare' : notes[0];

  return (
    <Canvas title={title} kicker={<>Senior Backend · comparison</>} open onClose={() => {}} qLine={notes[0]}
      aside={<div className="ds-actions"><button type="button" className="ds-btn quiet" onClick={() => set(defaultView(w))}>Reset choices</button></div>}>
      <section className="ds-sheet hire-b-grid" aria-label="What to compare">
        <div className="hire-b-grid" style={{ gap: 6 }}>
          <span className="lab" id="cmp-people">People</span>
          <div className="hire-b-chips" role="group" aria-labelledby="cmp-people">
            {pool.map((p) => <button key={p} type="button" className="ds-filter" aria-pressed={people.includes(p)} onClick={() => set({ people: toggle(people, p) })}>{nameOf(w, p)}</button>)}
          </div>
        </div>
        <div className="hire-b-grid" style={{ gap: 6 }}>
          <span className="lab" id="cmp-crit">Criteria</span>
          <div className="hire-b-chips" role="group" aria-labelledby="cmp-crit">
            {reqs.map((r) => <button key={r.reqId} type="button" className="ds-filter" aria-pressed={v.criteria.includes(r.reqId)} onClick={() => set({ criteria: toggle(v.criteria, r.reqId) })}>{r.label}{r.mustHave ? '' : ' (nice to have)'}</button>)}
          </div>
        </div>
        <div className="hire-b-chips" role="group" aria-label="How to read the evidence">
          <button type="button" className="ds-filter" aria-pressed={v.lastYear} onClick={() => set({ lastYear: !v.lastYear })}>Evidence from the last year only</button>
          <button type="button" className="ds-filter" aria-pressed={v.weighting === 'EQUAL'} onClick={() => set({ weighting: v.weighting === 'EQUAL' ? 'Q' : 'EQUAL' })}>Weigh must-haves equally</button>
        </div>
        <p className="t14 muted" style={{ margin: 0 }}>You can also tell Q, for example “compare Tobi and Zara on payments and Go” or “only evidence from the last year”.</p>
      </section>

      <section className="ds-sheet hire-b-grid hire-b-reading" aria-labelledby="cmp-q" aria-live="polite">
        <h2 id="cmp-q" className="lab hire-b-q" style={{ margin: 0 }}>Q’s reading</h2>
        <ul className="hire-b-list">{notes.map((n) => <li key={n}><span className="hire-b-dia" aria-hidden="true" />{n}</li>)}</ul>
        {ranked.length > 1 && (
          <ol className="hire-b-rank" aria-label="Who to talk to first">
            {ranked.map((r) => <li key={r.pid}><Link to={`/r/people/${r.pid}`}>{nameOf(w, r.pid)}</Link><span className="t14 muted"> · {r.verified} verified, {r.evidenced} evidenced, {r.partial} partial, {r.none} not shown</span></li>)}
          </ol>
        )}
        <p className="t14 muted" style={{ margin: 0 }}>Missing evidence isn’t missing ability. “Not shown yet” is a question for the interview.</p>
      </section>

      {people.length > 0 && crit.length > 0 && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="cmp-t">
          <h2 id="cmp-t" className="voice t24" style={{ margin: 0 }}>Evidence by requirement</h2>
          <GlyphKey kinds={['verified', 'full', 'partial', 'unclear', 'none']} />
          <div className="ds-table-wrap hire-b-table">
            <table className="ds-table" style={{ minWidth: 160 + people.length * 170 }}>
              <caption className="sr">Evidence for each requirement and person. Select a cell to see where it comes from.</caption>
              <thead><tr><th scope="col">Requirement</th>{people.map((p) => <th key={p} scope="col"><Link to={`/r/people/${p}`}>{nameOf(w, p)}</Link></th>)}</tr></thead>
              <tbody>
                {crit.map((r) => (
                  <tr key={r.reqId}>
                    <th scope="row"><span className="hire-b-grid" style={{ gap: 2 }}><span>{r.label}</span><span className="t14 muted">{r.mustHave ? 'Must have' : 'Nice to have'}{weightOf(w, r.reqId, v.weighting) > 2 ? ' · Q counts it 1.5×' : ''}</span></span></th>
                    {people.map((p) => { const c = cellFor(w, p, r.reqId, view); const sel = v.open?.pid === p && v.open.reqId === r.reqId; return (
                      <td key={p}>
                        <button type="button" className="hire-b-cell" aria-pressed={sel} aria-label={`${nameOf(w, p)}, ${r.label}: ${c.level}. Show where this comes from`} onClick={() => set({ open: sel ? null : { pid: p, reqId: r.reqId } })}>
                          <LevelMark level={c.level} small />
                          <span className="t14 muted">{c.correction ? `${c.correction.note} (your correction)` : c.items.filter((i) => !i.excluded).map((i) => i.note)[0] ?? (c.items.some((i) => i.excluded === 'review') ? 'Result under review, left out' : c.items.some((i) => i.excluded === 'old') ? 'Only older evidence' : '—')}</span>
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
                <h3 style={{ margin: 0 }}><Link to={`/r/people/${p}`}>{nameOf(w, p)}</Link></h3>
                {crit.map((r) => { const c = cellFor(w, p, r.reqId, view); const sel = v.open?.pid === p && v.open.reqId === r.reqId; return (
                  <button key={r.reqId} type="button" className="hire-b-cell" aria-pressed={sel} onClick={() => set({ open: sel ? null : { pid: p, reqId: r.reqId } })}>
                    <span className="t14"><b>{r.label}</b></span><LevelMark level={c.level} small />
                  </button>); })}
              </article>
            ))}
          </div>
        </section>
      )}

      {open && (
        <section className="ds-sheet hire-b-grid" aria-labelledby="cmp-ins" aria-live="polite">
          <div className="hire-b-row"><h2 id="cmp-ins" className="voice t24" style={{ margin: 0 }}>{nameOf(w, open.pid)} · {reqs.find((r) => r.reqId === open.reqId)?.label}</h2><button type="button" className="ds-btn quiet" onClick={() => set({ open: null })}>Close</button></div>
          <LevelMark level={open.cell.level} />
          {open.cell.correction && <p className="t14" style={{ margin: 0 }}>You corrected this: {open.cell.correction.note}. Say “undo” to restore Q’s reading.</p>}
          {open.cell.items.length === 0 && <p className="muted" style={{ margin: 0 }}>{firstName(w, open.pid)} hasn’t shared anything for this. Q suggests asking in the interview.</p>}
          <ul className="hire-b-ev">
            {open.cell.items.map((i) => (
              <li key={i.e.evidenceId}>
                <div className="hire-b-row"><b>{i.e.confidential ? 'Confidential item (contents not shown)' : i.e.title}</b><VerTag v={verOf(i.e)} /></div>
                {!i.e.confidential && <p className="t14" style={{ margin: 0 }}>{i.e.shows}</p>}
                <p className="t14 muted" style={{ margin: 0 }}>{i.e.source} · {fmtDate(i.e.observedAt)}</p>
                {i.excluded && <p className="t14" style={{ margin: 0 }}><Glyph k="none" size={14} /> Left out: {({ review: 'the candidate disputed this result; it’s under review until resolved', old: 'older than a year, and you asked for the last year only', confidential: 'confidential contents aren’t used', failed: 'the check failed' })[i.excluded]}.</p>}
              </li>
            ))}
          </ul>
          <p className="t14 muted" style={{ margin: 0 }}>Only what {firstName(w, open.pid)} shared with you. Q never uses private or withdrawn items.</p>
        </section>
      )}
      <p className="t14 muted" style={{ margin: 0 }}>People and evidence are fictional. <span className="ds-sim">Simulated</span></p>
    </Canvas>
  );
}
