// SC-076 · Candidate work critique and SC-077 · Candidate revision history (Amaka; Chidi's brief too).
// Q critiques the candidate's own work kindly and concretely: what already works, then a few points anchored to her
// paragraphs, each with why and what to try. Q offers wording only where the facts are already hers. Every change is
// a new version (nothing is ever overwritten), with what changed, where it came from and corrections. Versions are
// private until she shares one; an employer keeps the version they were given (MO-029 when access ends).
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, useWorld, visibleEvidence } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { QMark } from '../../ds/QMark';
import { Glyph } from '../../ds/Glyph';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { arrive } from '../../ds/motion';
import { runAction } from '../../q/core/engine';
import { Link, navigate, useRoute } from '../../ui/router';
import type { Critique, Work, WorkVersion } from '../../state/areas/talent-d';
import { canCritique, dayMonth, dayTime, demoState, latest, orgNm, wordDiff, workById, worksOf } from './logic';
import { Source, Variant } from './ui';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
const BY: Record<WorkVersion['by'], string> = { YOU: 'You', YOU_WITH_Q: 'You, using Q’s wording' };
const KIND: Record<string, string> = { ORIGINAL: 'Original', REWORDED: 'Reworded', ADDED: 'Added', REMOVED: 'Removed', CORRECTED: 'Correction', RESTORED: 'Restored' };

function useWork() {
  const w = useWorld((x) => x); const a = actorOf(w); const { query } = useRoute();
  const id = query.get('w'); const mine = worksOf(w, a.personId ?? '');
  const x = id ? workById(w, id) : mine[0];
  const ds = demoState(query) ?? (x && x.personId !== a.personId ? 'denied' : null);
  return { w, a, x: x && x.personId === a.personId ? x : undefined, mine, ds, empty: ds === 'empty' || !x };
}

function WorkSwitch({ mine, cur, base }: { mine: Work[]; cur?: Work; base: string }) {
  if (mine.length < 2) return null;
  return <div className="tb-filters" role="group" aria-label="Your work">{mine.map((m) => <button key={m.id} type="button" className="ds-filter" aria-pressed={cur?.id === m.id} onClick={() => navigate(`${base}?w=${m.id}`)}>{m.title.split(':')[0].slice(0, 40)}</button>)}</div>;
}

// =====================================================================================================
// SC-076 · Critique
// =====================================================================================================
export function CritiquePage() {
  const { a, x, mine, ds, empty } = useWork();
  const [focus, setFocus] = useState<Critique['focus']>('ALL');
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [showQ, setShowQ] = useState<string | null>(null);
  const cur = x ? latest(x) : undefined; const c = x?.critique;
  const marked = c?.points.find((p) => p.id === (open ?? showQ))?.para;
  return (
    <Canvas title="Q’s read of your work" kicker={x ? `${x.kind} · version ${cur!.v} · private` : 'Your work · private'} open onClose={() => navigate('/c/passport')} qLine="Kind, specific, and yours to take or leave.">
      <Variant state={ds === 'empty' ? null : ds} what="your work" back={{ to: '/c/passport', label: 'Back to your Passport' }}>
        {empty || !x || !cur ? (
          <section className="ds-sheet tb-empty"><h2 className="tb-h2">Nothing to read yet</h2><p style={{ margin: 0 }}>Add a write-up, a brief or any piece of your own work to your Passport, and ask Q to read it. It stays private.</p><Link className="ds-btn primary" to="/c/passport">Add work to your Passport</Link></section>
        ) : (
          <div className="td-page">
            <WorkSwitch mine={mine} cur={x} base="/c/work/critique" />
            <div className="td-grid2">
              <section className="td-stack" aria-labelledby="td-doc-h">
                <div className="tb-row-between"><h2 id="td-doc-h" className="tb-h2">{x.title}</h2><Link className="t14" style={{ color: 'inherit' }} to={`/c/work/versions?w=${x.id}`}>{x.versions.length} versions</Link></div>
                <div className="td-doc" aria-label={`Version ${cur.v}`}>
                  {cur.paras.map((p, i) => <p key={i} className="td-para" data-marked={marked === i ? 'yes' : undefined}><span className="td-para-n" aria-hidden="true">¶{i + 1}</span><span className="sr">Paragraph {i + 1}: </span>{p}</p>)}
                </div>
                <p className="td-note">Version {cur.v}, saved {dayMonth(cur.at)}. Only you can see this page.</p>
              </section>

              <section className="td-stack" aria-labelledby="td-crit-h" aria-live="polite">
                <h2 id="td-crit-h" className="tb-h2">{c ? `What works, and ${c.points.length} things to try` : 'Ask Q to read it'}</h2>
                {!c ? (
                  <div className="ds-sheet td-stack">
                    <p style={{ margin: 0 }}>Q reads your latest version and tells you what already works, then a few specific things to try, with reasons. It doesn’t score you, and it changes nothing on its own.</p>
                    {!canCritique(x.id) ? <p className="t14 muted" style={{ margin: 0 }}>Q can’t read this kind of file in the prototype yet.</p> : (
                      <>
                        <div className="tb-filters" role="radiogroup" aria-label="What should Q focus on">
                          {([['ALL', 'Everything'], ['CLARITY', 'Clarity'], ['EVIDENCE', 'Evidence and reasoning']] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={focus === k} className="ds-filter" aria-pressed={focus === k} onClick={() => setFocus(k)}>{l}</button>)}
                        </div>
                        <button type="button" className="ds-btn primary" style={{ justifySelf: 'start' }} onClick={() => act('td.work.critique', { id: x.id, focus })}>Ask Q to read version {cur.v}</button>
                      </>
                    )}
                  </div>
                ) : (
                  <motion.div {...arrive} className="td-stack">
                    <div className="td-qline"><QMark mood="idle" size={20} /><p>{a.first}, here’s what I noticed in version {c.forV}. Take what helps; leave what doesn’t.</p></div>
                    <div className="ds-sheet td-stack">
                      <h3 className="lab" style={{ margin: 0 }}>Already working</h3>
                      <ul className="td-strengths">{c.strengths.map((s, i) => <li key={i}><Glyph k="full" size={18} /><span>{s}</span></li>)}</ul>
                    </div>
                    <ol className="td-points" aria-label="Things to try">
                      {c.points.map((p) => (
                        <li key={p.id} className="td-point" data-state={p.state}>
                          <div className="tb-row-between"><span className="lab">Paragraph {p.para + 1}</span>{p.state !== 'OPEN' && <span className="ds-tag" data-k={p.state === 'DONE' ? 'ok' : undefined}>{p.state === 'DONE' ? 'Answered in a new version' : 'Left as you wrote it'}</span>}</div>
                          <h3>{p.title}</h3>
                          <p className="td-why">{p.why}</p>
                          <p className="td-try"><b>Try:</b> {p.tryThis}</p>
                          {p.state === 'OPEN' && (
                            <>
                              {showQ === p.id && p.suggestion && (
                                <div className="td-stack">
                                  <p className="td-sugg">{wordDiff(p.suggestion, cur.paras[p.para]).map((t, k) => <span key={k}>{t.changed ? <span className="td-add"><span className="sr">added: </span>{t.t}</span> : t.t} </span>)}</p>
                                  <Source text="Q’s wording, using only your own facts" />
                                </div>
                              )}
                              {showQ === p.id && !p.suggestion && <p className="t14" style={{ margin: 0 }}>Q won’t write this one: the fix needs something only you know. Write it in your words and Q will check the wording.</p>}
                              {open === p.id ? (
                                <div className="td-stack">
                                  <label className="t14" htmlFor={`td-ed-${p.id}`} style={{ fontWeight: 600 }}>Paragraph {p.para + 1}, in your words</label>
                                  <textarea id={`td-ed-${p.id}`} className="td-ta" value={draft} onChange={(e) => setDraft(e.target.value)} />
                                  <div className="tb-actions"><button type="button" className="ds-btn primary" onClick={() => { act('td.work.apply', { id: x.id, para: p.para, text: draft, point: p.id, by: 'YOU' }); setOpen(null); }}>Save as version {cur.v + 1}</button><button type="button" className="ds-btn quiet" onClick={() => setOpen(null)}>Cancel</button></div>
                                </div>
                              ) : (
                                <div className="tb-actions">
                                  {showQ === p.id && p.suggestion
                                    ? <button type="button" className="ds-btn primary" onClick={() => { act('td.work.apply', { id: x.id, para: p.para, text: p.suggestion, point: p.id, by: 'Q' }); setShowQ(null); }}>Use this wording</button>
                                    : <button type="button" className="ds-btn" onClick={() => setShowQ(p.id)}>Show Q’s wording</button>}
                                  <button type="button" className="ds-btn" onClick={() => { setOpen(p.id); setDraft(cur.paras[p.para]); setShowQ(null); }}>Rewrite it myself</button>
                                  <button type="button" className="tb-linkbtn" onClick={() => act('td.work.point', { id: x.id, point: p.id, state: 'NOT_FOR_ME' })}>Not for me</button>
                                </div>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                    {c.forV < cur.v && <button type="button" className="ds-btn" style={{ justifySelf: 'start' }} onClick={() => act('td.work.critique', { id: x.id, focus: c.focus })}>Ask Q to read version {cur.v}</button>}
                    <p className="td-note">Q’s read is private and isn’t evidence. A reviewed sample is what an employer could see, if you choose.</p>
                  </motion.div>
                )}
              </section>
            </div>
          </div>
        )}
      </Variant>
    </Canvas>
  );
}

// =====================================================================================================
// SC-077 · Versions
// =====================================================================================================
export function VersionsPage() {
  const { w, a, x, mine, ds, empty } = useWork();
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const cur = x ? latest(x) : undefined;
  const f = x?.versions.find((v) => v.v === (from ?? Math.max(1, (cur?.v ?? 1) - 1)));
  const t = x?.versions.find((v) => v.v === (to ?? cur?.v));
  const ev = x?.evidenceId ? w.evidence.find((e) => e.evidenceId === x.evidenceId) : undefined;
  const orgs = useMemo(() => (ev ? [...new Set([...ev.sharedWith, ...(ev.revokedFrom ?? []), ...Object.keys(x?.sharedV ?? {})])] : []), [ev, x]);
  return (
    <Canvas title="What changed, and when" kicker={x ? `${x.title.split(':')[0]} · ${x.versions.length} versions · private` : 'Your work'} open onClose={() => navigate('/c/passport')} qLine="Every version is kept. Nothing is overwritten.">
      <Variant state={ds === 'empty' ? null : ds} what="your versions" back={{ to: '/c/passport', label: 'Back to your Passport' }}>
        {empty || !x || !cur ? (
          <section className="ds-sheet tb-empty"><h2 className="tb-h2">No versions yet</h2><p style={{ margin: 0 }}>When you add a piece of work, every change you make is kept here as a version, with what changed and where it came from.</p><Link className="ds-btn primary" to="/c/passport">Add work to your Passport</Link></section>
        ) : (
          <div className="td-page">
            <WorkSwitch mine={mine} cur={x} base="/c/work/versions" />
            <div className="td-grid2">
              <section className="ds-sheet td-stack" aria-labelledby="td-tl-h">
                <h2 id="td-tl-h" className="tb-h2">Versions</h2>
                <ol className="td-timeline" reversed aria-label="Versions, newest first">
                  {[...x.versions].reverse().map((v) => (
                    <li key={v.v} data-latest={v.v === cur.v ? 'yes' : undefined}>
                      <span className="td-vdot" aria-hidden="true" />
                      <div className="td-vhead"><span className="td-vnum">Version {v.v}</span><span className="t14 muted">{dayTime(v.at)} · {BY[v.by]}</span>{v.v === cur.v && <span className="ds-tag">Latest</span>}</div>
                      <p style={{ margin: 0 }}>{v.note}</p>
                      <ul className="td-changes">{v.changes.map((ch, i) => <li key={i}><span className="td-ck">{KIND[ch.kind]}{ch.para !== undefined ? ` · ¶${ch.para + 1}` : ''}</span><span>{ch.what}</span><Source text={ch.source} mine={/^Your|^Typed by you/.test(ch.source)} /></li>)}</ul>
                      {Object.entries(x.sharedV).filter(([, n]) => n === v.v).map(([o]) => <span key={o} className="t14">Given to {orgNm(w, o)}{ev && !visibleEvidence(w, a.personId!, o).some((e) => e.evidenceId === ev.evidenceId) ? ' (access since ended)' : ''}</span>)}
                      <div className="tb-actions">
                        {v.v !== cur.v && <button type="button" className="ds-btn quiet" onClick={() => { setFrom(v.v); setTo(cur.v); document.getElementById('td-cmp-h')?.scrollIntoView({ block: 'start' }); }}>Compare with latest</button>}
                        {v.v !== cur.v && <ConfirmButton label="Restore" question={`Bring back version ${v.v} as a new version?`} yes="Restore" onConfirm={() => act('td.work.restore', { id: x.id, v: v.v })} />}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="td-stack">
                {ev && (
                  <section className="ds-sheet td-stack" aria-labelledby="td-sh-h">
                    <h2 id="td-sh-h" className="tb-h2">Who has which version</h2>
                    <p className="td-note">New versions stay private. An employer keeps the version you gave them until you share another or end their access.</p>
                    {orgs.length === 0 && <p style={{ margin: 0 }}>Nobody. Share from your Passport when you’re ready.</p>}
                    {orgs.map((o) => {
                      const sees = visibleEvidence(w, a.personId!, o).some((e) => e.evidenceId === ev.evidenceId);
                      const has = x.sharedV[o]; const hv = x.versions.find((v) => v.v === has);
                      return (
                        <div key={o} className="td-view td-preview" data-revoked={sees ? undefined : 'yes'} aria-live="polite">
                          <div className="tb-row-between"><b>{orgNm(w, o)}</b>{sees ? <span className="ds-tag">Has version {has ?? cur.v}</span> : <span className="ds-tag" data-k="warn">Access ended</span>}</div>
                          {sees && <div className="td-preview-body">
                            <span className="t14 muted">What they see (opening lines):</span>
                            <p className="t14" style={{ margin: 0 }}>{(hv ?? cur).paras[0]}</p>
                            {has && has < cur.v && <p className="t14" style={{ margin: 0 }}>Their copy is older than yours{x.versions.slice(has).some((v) => v.changes.some((ch) => ch.kind === 'CORRECTED')) ? ' and misses a correction you made' : ''}.</p>}
                          </div>}
                          <p className="td-preview-revoked t14" role="status" style={{ margin: 0 }}><span aria-hidden="true">⊘</span>{orgNm(w, o)} can no longer open any version. They were told only that access ended.</p>
                          <div className="tb-actions">
                            {sees && has !== cur.v && <button type="button" className="ds-btn" onClick={() => act('td.work.sharedv', { id: x.id, org: o })}>Give them version {cur.v}</button>}
                            {sees && <ConfirmButton label="End access" question={`End ${orgNm(w, o)}’s access to every version?`} yes="End access" onConfirm={() => act('tb.revoke', { ids: [ev.evidenceId], org: o })} />}
                            {!sees && <button type="button" className="ds-btn" onClick={() => { act('tb.share', { ids: [ev.evidenceId], org: o }); act('td.work.sharedv', { id: x.id, org: o }); }}>Share version {cur.v} again</button>}
                          </div>
                        </div>
                      );
                    })}
                  </section>
                )}
                <section className="ds-sheet td-stack" aria-labelledby="td-cmp-h">
                  <h2 id="td-cmp-h" className="tb-h2">Compare two versions</h2>
                  <div className="tb-actions">
                    <label className="t14">From <select className="ds-input" value={f?.v} onChange={(e) => setFrom(Number(e.target.value))}>{x.versions.map((v) => <option key={v.v} value={v.v}>Version {v.v}</option>)}</select></label>
                    <label className="t14">to <select className="ds-input" value={t?.v} onChange={(e) => setTo(Number(e.target.value))}>{x.versions.map((v) => <option key={v.v} value={v.v}>Version {v.v}</option>)}</select></label>
                  </div>
                  {f && t && f.v !== t.v ? (
                    <ol className="td-changes" aria-label={`Changes from version ${f.v} to ${t.v}`}>
                      {t.paras.map((p, i) => p === f.paras[i] ? null : (
                        <li key={i}>
                          <span className="td-ck">¶{i + 1}</span>
                          <span><span className="sr">Was: </span>{wordDiff(f.paras[i] ?? '', p).map((x2, k) => <span key={k}>{x2.changed ? <span className="td-del">{x2.t}</span> : x2.t} </span>)}</span>
                          <span><span className="sr">Now: </span>{wordDiff(p, f.paras[i] ?? '').map((x2, k) => <span key={k}>{x2.changed ? <span className="td-add">{x2.t}</span> : x2.t} </span>)}</span>
                        </li>
                      ))}
                      {t.paras.every((p, i) => p === f.paras[i]) && <li>No differences in the text.</li>}
                    </ol>
                  ) : <p className="t14 muted" style={{ margin: 0 }}>Pick two different versions.</p>}
                </section>
                <Link className="ds-btn" style={{ justifySelf: 'start' }} to={`/c/work/critique?w=${x.id}`}>Ask Q to read the latest version</Link>
              </div>
            </div>
          </div>
        )}
      </Variant>
    </Canvas>
  );
}
