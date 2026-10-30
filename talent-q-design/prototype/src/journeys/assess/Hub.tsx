// Assessment hubs: one place per side that lists what needs the person (task-first lists, also on phones).
import { useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { assess } from '../../state/areas/assess';
import { KIND_WORD, avatarOf, banksOf, coachedInterviews, draftOf, feedbackForCandidate, lockedOf, orgName, personName, readRoom } from './model';
import { useMe } from './ui';

export function RecruiterHub() {
  const me = useMe();
  const w = useWorld((x) => x);
  const ivs = w.interviews.filter((i) => i.orgId === me.orgId && i.mandateId === 'm_backend' && i.status !== 'CANCELLED');
  const ex = assess(w).exercises.filter((e) => e.orgId === me.orgId);
  const toReview = ex.filter((e) => e.state === 'SUBMITTED');
  const bank = banksOf(w, me.orgId)[0];
  const coach = coachedInterviews(w, me);
  const title = toReview.length ? `${toReview.length} exercise${toReview.length === 1 ? '' : 's'} to review` : bank && draftOf(bank) ? `Draft v${draftOf(bank)!.v} of your questions isn’t locked yet` : 'Interviews and exercises';
  if (!me.orgId) return <Canvas title="Assessments" kicker="Assessments" open onClose={() => history.back()}><p>Assessments belong to an employer.</p></Canvas>;
  return (
    <Canvas title={title} kicker="Assessments" open onClose={() => history.back()}>
      <ul className="as-hub">
        <li className="ds-sheet"><span className="lab">Questions</span>{bank ? <><b>{bank.title}</b><span className="t14">{draftOf(bank) ? `Draft v${draftOf(bank)!.v} waiting · ` : ''}v{lockedOf(bank)?.v} locked, {lockedOf(bank)?.questions.length} questions</span></> : <span className="t14">No question bank yet.</span>}<Link className="ds-btn" to="/r/questions">Open the question bank</Link></li>
        <li className="ds-sheet"><span className="lab">Exercises</span><b>{toReview.length ? `${toReview.length} waiting for review` : 'Nothing waiting'}</b><span className="t14">{ex.length} sent · self-reported until reviewed</span><Link className={`ds-btn ${toReview.length ? 'primary' : ''}`} to="/r/exercises">Review exercises</Link></li>
        <li className="ds-sheet"><span className="lab">Your coaching</span><b>{coach.length ? `${coach.length} interview${coach.length === 1 ? '' : 's'} to learn from` : 'Nothing yet'}</b><span className="t14">Private to you. About your questions, never the candidate.</span><Link className="ds-btn" to="/r/coaching">Open coaching</Link></li>
      </ul>
      <section className="ds-sheet as-grid" aria-labelledby="hb-iv">
        <h2 id="hb-iv" className="as-h2">Interviews in the live room</h2>
        {!ivs.length && <p className="t14 muted as-p">No interviews for this role.</p>}
        <ul className="as-list">
          {ivs.map((i) => { const r = readRoom(w, i.id); return (
            <li key={i.id} className="as-li">
              <div className="as-row"><b>{personName(w, i.personId)}</b><span className="t14 muted">{r ? { LOBBY: 'Room open, not started', LIVE: 'Live now', INTERRUPTED: 'Connection lost', ENDED: 'Ended' }[r.state] : 'Room not opened'}</span></div>
              <div className="as-actions">
                <Link className="ds-btn" to={`/r/interviews/${i.id}/live`}>Live room</Link>
                {r?.state === 'ENDED' && <><Link className="ds-btn quiet" to={`/r/interviews/${i.id}/transcript`}>Transcript</Link><Link className="ds-btn quiet" to={`/r/interviews/${i.id}/review`}>Review</Link></>}
              </div>
            </li>); })}
        </ul>
      </section>
    </Canvas>
  );
}

export function CandidateHub() {
  const me = useMe();
  const w = useWorld((x) => x);
  const pid = me.personId;
  const ex = assess(w).exercises.filter((e) => e.personId === pid);
  const ivs = w.interviews.filter((i) => i.personId === pid && (assess(w).rooms[i.id] || assess(w).feedback[i.id]));
  const kora = w.pipeline.some((p) => p.personId === pid && p.mandateId === 'm_backend');
  const av = pid ? avatarOf(w, pid, 'org_kora') : undefined;
  const todo = ex.filter((e) => e.state === 'ASSIGNED' || e.state === 'IN_PROGRESS').length;
  return (
    <Canvas title={todo ? `${todo} exercise${todo === 1 ? '' : 's'} waiting for you` : 'Your interviews and exercises'} kicker="Assessments" open onClose={() => history.back()}>
      {!ex.length && !ivs.length && !kora && <section className="ds-sheet as-empty"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>Nothing here yet.</b><p className="t14 muted as-p">When an employer asks you for an interview or a short exercise, it appears here. Practise privately any time in the <Link to="/c/interview">interview room</Link>.</p></div></section>}
      {kora && (
        <section className="ds-sheet as-grid" aria-labelledby="ch-r1">
          <h2 id="ch-r1" className="as-h2">Kora Pay · first round</h2>
          <p className="t14 as-p">Answer Kora’s locked questions your way: a simulated avatar, text, voice, or with a person.{av?.submittedAt ? ' Sent.' : av ? ' Started.' : ''}</p>
          <Link className="ds-btn" to="/c/assess/avatar">{av?.submittedAt ? 'See what you sent' : av ? 'Carry on' : 'Choose how to do it'}</Link>
        </section>
      )}
      {ex.length > 0 && (
        <section className="ds-sheet as-grid" aria-labelledby="ch-ex">
          <h2 id="ch-ex" className="as-h2">Exercises</h2>
          <ul className="as-list">{ex.map((e) => <li key={e.id} className="as-li"><div className="as-row"><b>{e.title}</b><span className="t14 muted">{KIND_WORD[e.kind]} · {orgName(w, e.orgId)} · {e.minutes} min</span></div><span className="t14">{{ ASSIGNED: 'Not started', IN_PROGRESS: 'In progress, saved', SUBMITTED: 'Self-reported, waiting for review', REVIEWED: 'Reviewed', DECLINED: 'Declined, not a failed result' }[e.state]}</span><Link className="ds-btn" to={`/c/assess/ex/${e.id}`}>{e.state === 'ASSIGNED' ? 'Open' : e.state === 'IN_PROGRESS' ? 'Carry on' : 'See it'}</Link></li>)}</ul>
        </section>
      )}
      {ivs.length > 0 && (
        <section className="ds-sheet as-grid" aria-labelledby="ch-iv">
          <h2 id="ch-iv" className="as-h2">Live interviews</h2>
          <ul className="as-list">{ivs.map((i) => { const r = readRoom(w, i.id); const fb = feedbackForCandidate(w, pid!, i.id); return (
            <li key={i.id} className="as-li"><div className="as-row"><b>{orgName(w, i.orgId)}</b><span className="t14 muted">{r?.state === 'ENDED' ? 'Ended' : r ? 'Room open' : ''}{fb ? ' · feedback shared' : ''}</span></div>
              <div className="as-actions">{r && r.state !== 'ENDED' && <Link className="ds-btn primary" to={`/c/assess/live/${i.id}`}>Join</Link>}{r?.state === 'ENDED' && <Link className="ds-btn" to={`/c/assess/record/${i.id}`}>{fb ? 'Read the feedback' : 'Your record'}</Link>}</div></li>); })}</ul>
        </section>
      )}
    </Canvas>
  );
}
