// SC-172 · Career work sample improvement wizard (Chidi's product brief, from his J7 plan). Five steps: the reviewer's
// notes, suggested edits with their sources (the candidate chooses each; facts only he knows are his to write), a
// preview, a simulated review, then his choice. It becomes evidence only after the review AND his choice (through
// J7's own submitSample), and is shared only after a consent receipt (MO-052: Private → receipt → Shared).
import { motion } from 'motion/react';
import { actorOf, useWorld, visibleEvidence } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { QMark } from '../../ds/QMark';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { arrive } from '../../ds/motion';
import { runAction } from '../../q/core/engine';
import { Link, navigate, useRoute } from '../../ui/router';
import { tdRead, type Wizard } from '../../state/areas/talent-d';
import { personaFor, readJ7, sampleFor } from '../career/j7';
import { demoState, latest, orgNm, wizardFor, wordDiff } from './logic';
import { ReceiptCard, Source, Variant } from './ui';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
const STEPS = ['Reviewer’s notes', 'Choose changes', 'Preview', 'Review', 'Your choice'];
const SHARE_ORGS = ['org_tinda', 'org_medlink'];

export function ImprovePage() {
  const w = useWorld((x) => x); const a = actorOf(w); const pid = a.personId ?? '';
  const { query } = useRoute();
  const ds = demoState(query) ?? (!pid ? 'denied' : null);
  const P = personaFor(pid); const S = readJ7(w, pid);
  const s: Wizard = tdRead(w).wizard[pid] ?? { step: 0, comp: 'writing', picks: {}, fact: '', review: null, choice: null, receipt: null };
  const data = pid === 'p_chidi' ? wizardFor(s.comp) : undefined;
  const sm = sampleFor(P, s.comp);
  const work = data ? tdRead(w).works[data.workId] : undefined;
  const first = S.assessments.filter((x) => x.comp === s.comp)[0];
  const evId = `e_j7_${pid}_assess_${s.comp}`;
  const go = (n: number) => act('td.wiz.step', { step: n });
  const base = work ? (s.review ? work.versions[work.versions.length - 2] : latest(work)) : undefined;
  const preview = base && data ? base.paras.map((p, i) => { const e = data.edits.find((x) => x.para === i && s.picks[x.id] && (x.kind === 'Q_WORDING' || s.fact.trim())); return !e ? p : e.kind === 'YOUR_FACT' ? `${p} ${s.fact.trim()}` : e.after; }) : [];
  const empty = ds === 'empty' || !data || !sm || !work;
  return (
    <Canvas title="Make your sample stronger" kicker={sm ? `${sm.title} · private until you choose` : 'Career · work samples'} open onClose={() => navigate('/c/career')} qLine="You choose every change, and whether it counts.">
      <Variant state={ds === 'empty' ? null : ds} what="your work samples" back={{ to: '/c/career', label: 'Back to your career atlas' }}>
        {empty ? (
          <section className="ds-sheet tb-empty"><h2 className="tb-h2">No sample to improve yet</h2><p style={{ margin: 0 }}>This works on a work sample a reviewer has already read, so the suggestions start from their notes. Do a sample from your career plan first.</p><Link className="ds-btn primary" to="/c/career">Open your career plan</Link></section>
        ) : (
          <div className="td-page">
            <ol className="td-steps" aria-label="Steps">
              {STEPS.map((l, i) => <li key={l} aria-current={s.step === i ? 'step' : undefined} data-s={i < s.step ? 'done' : undefined}>{l}</li>)}
            </ol>

            {s.step === 0 && (
              <motion.section {...arrive} className="ds-sheet td-stack" aria-labelledby="td-w0">
                <h2 id="td-w0" className="tb-h2">What the reviewer said about your original</h2>
                {!first ? (
                  <>
                    <p style={{ margin: 0 }}>Your brief hasn’t been reviewed yet. Improving works best from a reviewer’s notes, so send the original first (simulated reviewer, about a day in real life).</p>
                    <button type="button" className="ds-btn primary" style={{ justifySelf: 'start' }} onClick={() => act('td.wiz.first')}>Send the original for review</button>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0 }}>Level {first.level} of 4, reviewed {new Date(first.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (simulated reviewer).</p>
                    <ul className="td-rubric">{first.rubric.map((r) => <li key={r.c}><Glyph k={r.ok ? 'full' : 'none'} size={18} /><span>{r.c}<span className="sr">: {r.ok ? 'met' : 'not yet'}</span>{!r.ok && <b> · not yet</b>}</span></li>)}</ul>
                    <p className="td-quote" style={{ fontSize: 16 }}>{sm!.first.advice}<cite>The reviewer’s advice</cite></p>
                    <button type="button" className="ds-btn primary" style={{ justifySelf: 'start' }} onClick={() => go(1)}>See suggested changes</button>
                  </>
                )}
              </motion.section>
            )}

            {s.step === 1 && (
              <motion.section {...arrive} className="td-stack" aria-labelledby="td-w1">
                <h2 id="td-w1" className="tb-h2">Choose the changes you want</h2>
                <div className="td-qline"><QMark mood="idle" size={20} /><p>Each suggestion shows its source. Where the fix needs something only you saw, I leave it to you.</p></div>
                <ul className="td-points">
                  {data!.edits.map((e) => (
                    <li key={e.id} className="td-point">
                      <div className="tb-row-between"><h3>{e.title}</h3>{e.fixes && <span className="ds-tag">Answers: {e.fixes}</span>}</div>
                      {e.kind === 'YOUR_FACT' ? (
                        <>
                          <label htmlFor="td-wf" className="t14" style={{ fontWeight: 600 }}>What did you see on your own accounts? Two or three facts.</label>
                          <textarea id="td-wf" className="td-ta" defaultValue={s.fact} onBlur={(ev) => act('td.wiz.fact', { text: ev.target.value })} placeholder="For example, what shop owners told you, or what happened when they ran out." />
                          <p className="t14 muted" style={{ margin: 0 }}>Your words, added to paragraph {e.para + 1}. Q won’t write facts for you.</p>
                        </>
                      ) : (
                        <>
                          <p className="t14" style={{ margin: 0 }}><span className="td-ck">Now</span> {base!.paras[e.para]}</p>
                          <p className="td-sugg">{wordDiff(e.after, base!.paras[e.para]).map((t, k) => <span key={k}>{t.changed ? <span className="td-add">{t.t}</span> : t.t} </span>)}</p>
                          <button type="button" className="ds-opt" aria-pressed={!!s.picks[e.id]} onClick={() => act('td.wiz.pick', { id: e.id, on: !s.picks[e.id] })}><span><b>{s.picks[e.id] ? 'Included' : 'Not included'}</b><span className="t14 muted" style={{ display: 'block' }}>Select to {s.picks[e.id] ? 'leave it out' : 'include it'}</span></span></button>
                        </>
                      )}
                      <Source text={e.source} mine={e.kind === 'YOUR_FACT'} />
                    </li>
                  ))}
                </ul>
                <div className="tb-actions"><button type="button" className="ds-btn primary" onClick={() => go(2)}>Preview</button><button type="button" className="ds-btn quiet" onClick={() => go(0)}>Back</button></div>
              </motion.section>
            )}

            {s.step === 2 && (
              <motion.section {...arrive} className="ds-sheet td-stack" aria-labelledby="td-w2">
                <h2 id="td-w2" className="tb-h2">Your improved brief</h2>
                <div className="td-doc">{preview.map((p, i) => <p key={i} className="td-para" data-marked={p !== base!.paras[i] ? 'yes' : undefined}><span className="td-para-n" aria-hidden="true">¶{i + 1}</span>{p}{p !== base!.paras[i] && <span className="sr"> (changed)</span>}</p>)}</div>
                {!preview.some((p, i) => p !== base!.paras[i]) && <p role="alert" style={{ margin: 0 }}>No changes chosen yet. Go back and include at least one.</p>}
                {!s.fact.trim() && <p className="t14" style={{ margin: 0 }}>You haven’t added your own facts. The reviewer asked for evidence, so without them the result is likely to stay the same.</p>}
                <p className="td-note">Saved as a new version of your brief, private. The reviewer sees it only when you send it.</p>
                <div className="tb-actions"><button type="button" className="ds-btn primary" disabled={!preview.some((p, i) => p !== base!.paras[i])} onClick={() => act('td.wiz.review')}>Send for review (simulated)</button><button type="button" className="ds-btn quiet" onClick={() => go(1)}>Back</button></div>
              </motion.section>
            )}

            {s.step === 3 && s.review && (
              <motion.section {...arrive} className="ds-sheet td-stack" aria-labelledby="td-w3">
                <h2 id="td-w3" className="tb-h2">Reviewed: level {s.review.level} of 4{first ? `, was ${first.level}` : ''}</h2>
                <ul className="td-rubric">{s.review.rubric.map((r) => <li key={r.c}><Glyph k={r.ok ? 'full' : 'none'} size={18} /><span>{r.c}{!r.ok && <b> · not yet</b>}</span></li>)}</ul>
                <p style={{ margin: 0 }}><b>This isn’t evidence yet.</b> You choose whether the improved result replaces the earlier one in your Passport. Either way, it stays private.</p>
                <div className="tb-actions">
                  <button type="button" className="ds-btn primary" disabled={!first || s.review.level <= first.level} onClick={() => act('td.wiz.choose', { use: true })}>Use the improved result</button>
                  <button type="button" className="ds-btn" onClick={() => act('td.wiz.choose', { use: false })}>Keep my earlier result</button>
                </div>
                {first && s.review.level <= first.level && <p className="t14" style={{ margin: 0 }}>The reviewer saw the same as before, so there’s nothing better to use yet. Adding your own facts is what the reviewer asked for.</p>}
              </motion.section>
            )}

            {s.step === 4 && (
              <motion.section {...arrive} className="ds-sheet td-stack" aria-labelledby="td-w4">
                <h2 id="td-w4" className="tb-h2">{s.choice === 'USED' ? 'In your Passport, private' : 'Kept your earlier result'}</h2>
                {s.choice === 'USED' ? (
                  <>
                    <p style={{ margin: 0 }}>Your improved brief is assessed evidence now. Nobody sees it unless you share it. <Link to={`/c/passport?item=${evId}`}>See it in your Passport</Link></p>
                    <h3 className="lab" style={{ margin: '8px 0 0' }}>Share it (optional)</h3>
                    {SHARE_ORGS.map((o) => {
                      const shared = visibleEvidence(w, pid, o).some((e) => e.evidenceId === evId);
                      const rec = s.receipt?.org === o ? s.receipt : null;
                      return (
                        <div key={o} className="td-share-row">
                          <div className="td-stack" style={{ gap: 8 }}>
                            <b>{orgNm(w, o)}</b>
                            <span className="td-sharestate" data-s={shared ? 'shared' : rec ? 'receipt' : 'private'} aria-live="polite"><span>{shared ? `Shared with ${orgNm(w, o)}` : rec ? 'Receipt issued, sharing…' : 'Private'}</span></span>
                            {rec && <ReceiptCard r={rec} org={orgNm(w, o)} />}
                          </div>
                          {!shared && <ConfirmButton className="ds-btn" label={`Share with ${orgNm(w, o)}`} question={`Share your improved brief with ${orgNm(w, o)} only?`} yes="Yes, share it" onConfirm={() => { act('td.wiz.consent', { org: o }); act('tb.share', { ids: [evId], org: o }); }} />}
                          {shared && <ConfirmButton label="End access" question={`End ${orgNm(w, o)}’s access?`} yes="End access" onConfirm={() => act('tb.revoke', { ids: [evId], org: o })} />}
                        </div>
                      );
                    })}
                  </>
                ) : <p style={{ margin: 0 }}>The improved version is kept in your work history, private. <Link to="/c/work/versions?w=w_chidi_brief">See your versions</Link></p>}
                <div className="tb-actions"><Link className="ds-btn" to="/c/career">Back to your career plan</Link><button type="button" className="ds-btn quiet" onClick={() => act('td.wiz.start', { comp: s.comp })}>Start again</button></div>
              </motion.section>
            )}
          </div>
        )}
      </Variant>
    </Canvas>
  );
}
