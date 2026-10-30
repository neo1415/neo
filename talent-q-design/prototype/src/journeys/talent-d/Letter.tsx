// SC-087 · Cover letter / message builder (Grace for Sunrise Care's Care Coordinator; Chidi for Medlink). Q drafts
// only from the candidate's own sources, with a source on every line. The P6 guard (addedClaims) must find nothing new
// in Q's lines. Lines the candidate writes are hers and are labelled "Your words"; anything in them that isn't in her
// Passport is pointed out (never blocked). She approves; nothing is ever sent from here.
import { useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { QMark } from '../../ds/QMark';
import { arrive } from '../../ds/motion';
import { runAction } from '../../q/core/engine';
import { Link, navigate, useRoute } from '../../ui/router';
import { tb } from '../talent-b/logic';
import { dayTime, demoState, factsFor, inventedIn, letterOf, orgNm } from './logic';
import { Source, Variant } from './ui';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

export function LetterPage({ jobId }: { jobId: string }) {
  const w = useWorld((x) => x); const a = actorOf(w); const pid = a.personId ?? '';
  const { query } = useRoute();
  const job = w.jobs.find((j) => j.id === jobId);
  const ds = demoState(query) ?? (!job ? 'error' : null);
  const [len, setLen] = useState<'NOTE' | 'LETTER'>('NOTE');
  const [edit, setEdit] = useState<number | null>(null);
  const [txt, setTxt] = useState('');
  const [adding, setAdding] = useState(false);
  const facts = factsFor(pid); const l = job ? letterOf(w, pid, job.id) : undefined;
  const org = job ? orgNm(w, job.orgId) : '';
  const declined = (tb(w).declined[pid] ?? []).includes('cover_note');
  const qFlags = l ? l.lines.filter((x) => x.by === 'Q').flatMap((x) => inventedIn(w, pid, jobId, x.text)) : [];
  return (
    <Canvas title={job ? `A note for ${org}` : 'Cover note'} kicker={job ? <>{job.title} · not sent · <Link to={`/c/jobs/${job.id}`}>Back to the job</Link></> : 'Jobs'} open onClose={() => navigate(job ? `/c/jobs/${job.id}` : '/c/jobs')} qLine="Only your facts. You approve; nothing is sent.">
      <Variant state={ds === 'empty' ? null : ds} what="this job" back={{ to: '/c/jobs', label: 'Back to jobs' }}>
        {job && (
          <div className="td-page">
            {declined && <div className="ds-banner" role="status"><span aria-hidden="true">ℹ</span><span>You told Q not to suggest cover notes, so Q won’t bring them up. You can still write one here if you want.</span><span /></div>}
            {(ds === 'empty' || facts.length === 0) ? (
              <section className="ds-sheet tb-empty"><h2 className="tb-h2">Nothing to write from yet</h2><p style={{ margin: 0 }}>Q writes only from your profile and Passport, and they don’t say enough yet. Add a piece of work or a certificate, or write the note yourself.</p><Link className="ds-btn primary" to="/c/passport">Add to your Passport</Link></section>
            ) : !l ? (
              <section className="ds-sheet td-stack" aria-labelledby="td-lt-h">
                <h2 id="td-lt-h" className="tb-h2">What Q will use</h2>
                <ul className="td-auth-list" aria-label="Your facts">
                  {facts.map((f) => <li key={f.id}><span><span>{f.text}</span>{f.caveat && <span className="t14 muted" style={{ display: 'block' }}>{f.caveat}</span>}</span><Source text={f.source} /></li>)}
                </ul>
                <p className="td-note">Nothing else. Q won’t add jobs, years, qualifications or skills that aren’t here.</p>
                <div className="tb-filters" role="radiogroup" aria-label="Length">
                  {([['NOTE', 'Short note'], ['LETTER', 'Cover letter']] as const).map(([k, lab]) => <button key={k} type="button" role="radio" aria-checked={len === k} className="ds-filter" aria-pressed={len === k} onClick={() => setLen(k)}>{lab}</button>)}
                </div>
                <button type="button" className="ds-btn primary" style={{ justifySelf: 'start' }} onClick={() => act('td.letter.draft', { jobId: job.id, length: len })}>Draft it from my facts</button>
              </section>
            ) : (
              <motion.section {...arrive} className="td-stack" aria-labelledby="td-ld-h">
                <div className="tb-row-between"><h2 id="td-ld-h" className="tb-h2">{l.state === 'APPROVED' ? 'Your approved note' : 'Draft, for you to approve'}</h2><span className="ds-tag" data-k={l.state === 'APPROVED' ? 'ok' : 'busy'}>{l.state === 'APPROVED' ? `Approved ${dayTime(l.approvedAt!)} · not sent` : 'Draft · not sent'}</span></div>
                <div className="td-qline"><QMark mood="idle" size={20} /><p>{qFlags.length ? `Something in my lines isn’t in your sources (${qFlags.join(', ')}). I’ll take it out.` : `Every line from me comes from your own sources, shown under it. Change anything; it’s your note.`}</p></div>
                <ol className="td-letter" aria-label="Your note">
                  {l.lines.map((x, i) => {
                    const flags = x.by === 'YOU' ? inventedIn(w, pid, job.id, x.text) : [];
                    return (
                      <li key={i}>
                        {edit === i ? (
                          <div className="td-lline-ed">
                            <label className="sr" htmlFor={`td-l-${i}`}>Line {i + 1}</label>
                            <textarea id={`td-l-${i}`} className="td-ta" value={txt} onChange={(e) => setTxt(e.target.value)} />
                            <div className="tb-actions"><button type="button" className="ds-btn primary" onClick={() => { act('td.letter.edit', { jobId: job.id, i, text: txt }); setEdit(null); }}>Save line</button><button type="button" className="ds-btn quiet" onClick={() => setEdit(null)}>Cancel</button></div>
                          </div>
                        ) : <p className="td-lline">{x.text}</p>}
                        <div className="tb-actions">
                          <Source text={x.source} mine={x.by === 'YOU'} />
                          {edit !== i && l.state === 'DRAFT' && <><button type="button" className="tb-linkbtn" aria-label={`Edit line ${i + 1}`} onClick={() => { setEdit(i); setTxt(x.text); }}>Edit</button><button type="button" className="tb-linkbtn" aria-label={`Remove line ${i + 1}`} onClick={() => act('td.letter.edit', { jobId: job.id, i, remove: true })}>Remove</button></>}
                        </div>
                        {flags.length > 0 && <p className="td-flag" role="note">Not in your Passport: {flags.map((f) => `“${f}”`).join(', ')}. That’s your call; employers will read it as your claim.</p>}
                      </li>
                    );
                  })}
                </ol>
                {l.state === 'DRAFT' && (adding ? (
                  <div className="ds-sheet td-stack">
                    <label className="t14" htmlFor="td-l-new" style={{ fontWeight: 600 }}>A line in your own words</label>
                    <textarea id="td-l-new" className="td-ta" value={txt} onChange={(e) => setTxt(e.target.value)} />
                    <div className="tb-actions"><button type="button" className="ds-btn primary" disabled={!txt.trim()} onClick={() => { act('td.letter.edit', { jobId: job.id, add: true, text: txt.trim() }); setAdding(false); setTxt(''); }}>Add line</button><button type="button" className="ds-btn quiet" onClick={() => setAdding(false)}>Cancel</button></div>
                  </div>
                ) : <button type="button" className="tb-linkbtn" onClick={() => { setAdding(true); setTxt(''); }}>Add a line of your own</button>)}
                <details className="ds-sheet tb-details">
                  <summary><b>What Q won’t add</b></summary>
                  <ul className="t14">
                    <li>Qualifications or certificates you haven’t shown. {pid === 'p_grace' ? 'Your first aid certificate is still pending, so Q says you completed the course, not that you’re certified.' : ''}</li>
                    <li>Years, numbers or employers that aren’t in your profile or Passport.</li>
                    <li>Praise for the employer or promises about you that you didn’t make.</li>
                  </ul>
                </details>
                <div className="tb-actions">
                  {l.state === 'DRAFT' ? <>
                    <button type="button" className="ds-btn primary" onClick={() => act('td.letter.approve', { jobId: job.id })}>Approve this note</button>
                    <button type="button" className="ds-btn quiet" onClick={() => act('td.letter.discard', { jobId: job.id })}>Discard</button>
                  </> : <><p className="t14" style={{ margin: 0 }}>Saved. Nothing was sent. When you apply, you choose whether to include it.</p><button type="button" className="ds-btn" onClick={() => act('td.letter.reopen', { jobId: job.id })}>Edit again</button></>}
                </div>
              </motion.section>
            )}
          </div>
        )}
      </Variant>
    </Canvas>
  );
}
