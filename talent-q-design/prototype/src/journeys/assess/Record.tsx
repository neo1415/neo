// Interview transcript and evidence (SC-106), consent-scoped: only the parts recorded after the candidate said yes.
// The panel marks answers as evidence for a requirement; those excerpts feed the score review (MO-026). The candidate
// reads their own transcript and, only once the employer shares it, their feedback (SC-107, the candidateNote rule).
import { useState } from 'react';
import { useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { reqLabel, reqsOf } from '../hire-b/model';
import { actorName, feedbackForCandidate, fmtDay, fmtTime, ivOf, liveOp, orgName, personFirst, readRoom, roleTitle, transcriptFor } from './model';
import { NotAvailable, Refusal, useMe, useRun } from './ui';

export function TranscriptPage({ id }: { id: string }) {
  const me = useMe();
  const w = useWorld((x) => x);
  const [msg, run] = useRun();
  const [pick, setPick] = useState<Record<string, string>>({});
  const iv = ivOf(w, id);
  const t = transcriptFor(w, me, id);
  if (!iv || iv.orgId !== me.orgId) return <NotAvailable why="This interview isn’t available. It may belong to another organisation." back={{ to: '/r/interviews', label: 'See all interviews' }} />;
  const r = readRoom(w, id);
  const first = personFirst(w, iv.personId);
  if (!r) return (
    <Canvas title={`No transcript for ${first} yet`} kicker={`Transcript · ${roleTitle(w, iv.mandateId)}`} open onClose={() => history.back()}>
      <section className="ds-sheet as-empty"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>The interview hasn’t happened in the live room.</b><p className="t14 muted as-p"><Link to={`/r/interviews/${id}/live`}>Open the live room</Link></p></div></section>
    </Canvas>
  );
  if (!t.allowed) return <NotAvailable title="Only the panel can read this transcript" why={`Transcripts are kept for ${iv.panel.map((p) => actorName(w, p)).join(' and ')} and the role’s recruiter. Ask one of them if you need something from it.`} back={{ to: '/r/interviews', label: 'See all interviews' }} />;
  const marks = (tid: string) => r.excerpts.filter((e) => e.turnId === tid);
  const title = t.reason === 'not-recorded' ? `${first} said no to recording` : `${first}’s interview: ${r.excerpts.length} answer${r.excerpts.length === 1 ? '' : 's'} marked as evidence`;
  return (
    <Canvas title={title} kicker={`Transcript · ${roleTitle(w, iv.mandateId)}`} open onClose={() => history.back()}
      aside={<div className="ds-actions"><Link className="ds-btn quiet" to={`/r/interviews/${id}/live`}>Live room</Link><Link className="ds-btn" to={`/r/interviews/${id}/review`}>Review scores</Link></div>}>
      <section className="ds-sheet as-grid" aria-labelledby="tr-scope">
        <h2 id="tr-scope" className="as-h2">What this transcript covers</h2>
        <dl className="as-kv">
          <dt>Consent</dt><dd>{r.consent.recording === 'YES' ? `${first} agreed to recording${r.consent.at ? ` at ${fmtTime(r.consent.at)}` : ''}.` : r.consent.recording === 'NO' ? `${first} said no. Nothing was recorded; there is no transcript. That isn’t held against them.` : 'Recording was never agreed, so nothing was recorded.'}</dd>
          <dt>Included</dt><dd>{t.turns.length} recorded turns{t.gaps ? `; ${t.gaps} turn${t.gaps === 1 ? '' : 's'} weren’t recorded (before consent or while paused) and aren’t shown` : ''}.</dd>
          <dt>Who can read it</dt><dd>The panel ({iv.panel.map((p) => actorName(w, p)).join(', ')}), the role’s recruiter, and {first}. Kept 90 days.</dd>
          <dt>Never in it</dt><dd>Any reading of face, voice, accent or emotion. Only words.</dd>
        </dl>
      </section>
      {t.reason !== 'not-recorded' && (
        <section className="ds-sheet as-grid" aria-labelledby="tr-h">
          <h2 id="tr-h" className="as-h2">Transcript</h2>
          {!t.turns.length && <p className="t14 muted as-p">Nothing was said while recording was on.</p>}
          <ol className="as-turns" style={{ maxHeight: 'none' }}>
            {t.turns.map((x) => (
              <li key={x.id} className="as-turn" data-who={x.who}>
                <span className="as-turn-h"><b>{x.who === 'INT' ? actorName(w, x.by ?? '') : first}</b><span className="num">{fmtTime(x.at)}</span>{x.reqId && <span>{reqLabel(w, x.reqId)}</span>}{x.simulated && <span className="ds-sim">Simulated answer</span>}</span>
                <p>{x.text}</p>
                {x.who === 'CAND' && (
                  <div className="as-actions">
                    {marks(x.id).map((m) => <span key={m.id} className="ds-tag" data-k="ok">Evidence: {reqLabel(w, m.reqId)} <button type="button" className="as-link" aria-label={`Remove evidence mark ${reqLabel(w, m.reqId)}`} onClick={() => run((d, a) => liveOp(d, a, id, 'unexcerpt', { eid: m.id }))}>×</button></span>)}
                    <label className="sr" htmlFor={`tr-${x.id}`}>Requirement this answer shows</label>
                    <select id={`tr-${x.id}`} className="ds-input" style={{ width: 'auto' }} value={pick[x.id] ?? x.reqId ?? ''} onChange={(e) => setPick({ ...pick, [x.id]: e.target.value })}>
                      {reqsOf(w).map((q) => <option key={q.reqId} value={q.reqId}>{q.label}</option>)}
                    </select>
                    <button type="button" className="ds-btn" onClick={() => run((d, a) => liveOp(d, a, id, 'excerpt', { turnId: x.id, reqId: pick[x.id] ?? x.reqId }))}>Use as evidence</button>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <Refusal msg={msg} />
        </section>
      )}
      {r.excerpts.length > 0 && (
        <section className="ds-sheet as-grid" aria-labelledby="tr-ex">
          <h2 id="tr-ex" className="as-h2">Excerpts used as evidence</h2>
          <ul className="as-list">{r.excerpts.map((e) => { const x = r.turns.find((y) => y.id === e.turnId); return <li key={e.id} className="as-li"><span className="t14"><b>{reqLabel(w, e.reqId)}</b> · marked by {actorName(w, e.by)}</span><blockquote className="as-quote">{x?.text}</blockquote></li>; })}</ul>
          <p className="t14 muted as-p">Interview answers are one source. They sit beside {first}’s shared evidence; they don’t replace it.</p>
        </section>
      )}
    </Canvas>
  );
}

/** Candidate: your own interview record (SC-106) and, once shared, the employer's feedback (SC-107). */
export function CandidateRecord({ id }: { id: string }) {
  const me = useMe();
  const w = useWorld((x) => x);
  const iv = ivOf(w, id);
  if (!iv || iv.personId !== me.personId) return <NotAvailable why="This interview record isn’t available." back={{ to: '/c/assess', label: 'Your interviews and exercises' }} />;
  const t = transcriptFor(w, me, id); const fb = feedbackForCandidate(w, me.personId!, id); const org = orgName(w, iv.orgId);
  return (
    <Canvas title={fb ? `${org} shared feedback with you` : 'Your interview record'} kicker={`${org} · ${roleTitle(w, iv.mandateId)}`} open onClose={() => history.back()}>
      <section className="ds-sheet as-grid" aria-labelledby="cr-fb">
        <h2 id="cr-fb" className="as-h2">Feedback</h2>
        {!fb ? <p className="as-p">{org} hasn’t shared feedback yet. They choose whether to; Q can’t share it for them, and it isn’t a result either way.</p> : (
          <>
            <p className="t14 muted as-p">Shared by {actorName(w, fb.by)} on {fmtDay(fb.at)}. These are their words, approved by them.</p>
            {fb.strengths.length > 0 && <><h3 className="t19" style={{ margin: 0 }}>What came across well</h3><ul className="as-list">{fb.strengths.map((s) => <li key={s.id} className="as-li"><Glyph k="full" size={16} /> {s.text}</li>)}</ul></>}
            {fb.routes.length > 0 && <><h3 className="t19" style={{ margin: 0 }}>What would help next time</h3><ul className="as-list">{fb.routes.map((s) => <li key={s.id} className="as-li">{s.text}</li>)}</ul></>}
            {fb.note && <blockquote className="as-quote">{fb.note}</blockquote>}
            <div className="as-actions"><Link className="ds-btn" to="/c/interview">Practise privately</Link><span className="t14 muted">Practice is yours alone and never counts as proof.</span></div>
          </>
        )}
      </section>
      <section className="ds-sheet as-grid" aria-labelledby="cr-tr">
        <h2 id="cr-tr" className="as-h2">Your transcript</h2>
        {t.reason === 'not-recorded' ? <p className="as-p">You said no to recording, so there’s no transcript. Only the interviewers’ own notes exist.</p>
          : !t.turns.length ? <p className="as-p">Nothing was recorded.</p>
          : <ol className="as-turns" style={{ maxHeight: 'none' }}>{t.turns.map((x) => <li key={x.id} className="as-turn" data-who={x.who}><span className="as-turn-h"><b>{x.who === 'INT' ? actorName(w, x.by ?? '') : 'You'}</b><span className="num">{fmtTime(x.at)}</span></span><p>{x.text}</p></li>)}</ol>}
        <p className="t14 muted as-p">Something wrong in it? Tell Q “my transcript has a mistake” and it goes to {org} as a correction request.</p>
      </section>
    </Canvas>
  );
}
