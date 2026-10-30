// Recruiter interview coaching (SC-109, V20): private, after-the-call notes on the interviewer's own questions and
// process. Leading questions, talk-time balance, must-haves not asked, general answers left without a follow-up.
// It is never about the candidate: not their face, voice, accent, nerves or personality, and it never changes a score.
import { useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link, useRoute } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { assess } from '../../state/areas/assess';
import { coachedInterviews, coachingFor, fmtDay, ivOf, personName, readRoom } from './model';
import { useMe } from './ui';

export function CoachingPage() {
  const me = useMe();
  const w = useWorld((x) => x);
  const { query } = useRoute();
  const mine = coachedInterviews(w, me);
  const sel = query.get('i') ?? mine[0];
  const c = sel ? coachingFor(w, me, sel) : null;
  const iv = sel ? ivOf(w, sel) : undefined;
  const acked = new Set(assess(w).coached[`${me.id}:${sel}`] ?? []);
  const ack = (item: string) => void runAction({ label: 'Got it', act: { t: 'do', op: 'as.coaching.ack', args: { id: sel, item } } });
  const items = c ? [
    ...c.leading.map((l, i) => ({ key: `lead${i}`, h: 'A leading question', body: <><blockquote className="as-quote">{l.text}</blockquote><span className="t14">{l.why}</span></> })),
    ...(c.talk.share > 50 ? [{ key: 'talk', h: `You did ${c.talk.share}% of the talking`, body: <span className="t14">Aim for the candidate to talk most, around two thirds or more. Shorter questions leave room for longer answers.</span> }] : []),
    ...c.unasked.map((u) => ({ key: `un-${u}`, h: `Must-have not asked: ${u}`, body: <span className="t14">The scorecard will show it as unknown, not zero. Add it to the next round’s plan.</span> })),
    ...c.noFollowUp.map((u) => ({ key: `fu-${u}`, h: `General answer, no follow-up: ${u}`, body: <span className="t14">One “what did you do yourself?” turns a general answer into evidence. Q had a follow-up ready in the panel.</span> })),
    ...(c.offBank ? [{ key: 'off', h: `${c.offBank} question${c.offBank === 1 ? '' : 's'} not from the locked bank`, body: <span className="t14">That’s allowed. They’re marked as extra so every candidate’s interview can still be compared on the same core questions.</span> }] : []),
  ] : [];
  const open = items.filter((x) => !acked.has(x.key));
  const good = c ? [c.talk.share <= 50 && `The candidate did most of the talking (${100 - c.talk.share}%).`, !c.leading.length && 'Every question was open: none suggested an answer.', !c.unasked.length && 'You covered every must-have.', c.usedSug > 0 && !c.noFollowUp.length && 'You followed up when an answer was general.'].filter(Boolean) as string[] : [];
  const title = !mine.length ? 'No interviews to learn from yet' : !c ? 'Coaching is private to each interviewer' : open.length ? `${open.length} thing${open.length === 1 ? '' : 's'} to try next time` : 'Nothing new to work on from this interview';
  return (
    <Canvas title={title} kicker="Your interview coaching · private to you" open onClose={() => history.back()}>
      <p className="as-note"><Glyph k="practice" size={16} /><span><b>Only you see this.</b> It’s about your questions and how the interview ran, never about the candidate’s face, voice, accent or manner, and it doesn’t change anyone’s score.</span></p>
      {mine.length > 1 && (
        <div className="as-actions" role="group" aria-label="Interview">{mine.map((i) => <Link key={i} className="ds-filter" aria-current={i === sel ? 'true' : undefined} to={`/r/coaching?i=${i}`}>{personName(w, ivOf(w, i)?.personId ?? '')}</Link>)}</div>
      )}
      {!mine.length && <section className="ds-sheet as-empty"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>Coaching appears after you interview someone in the live room.</b><p className="t14 muted as-p">Open an interview from the <Link to="/r/questions">question bank</Link> or <Link to="/r/interviews">Interviews</Link>.</p></div></section>}
      {mine.length > 0 && !c && <section className="ds-sheet as-empty" role="status"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>You didn’t ask questions in that interview, so there’s no coaching for you there.</b><p className="t14 muted as-p">Each interviewer sees only their own coaching. A colleague’s isn’t shown to you, or to their manager.</p></div></section>}
      {c && iv && (
        <>
          <section className="ds-sheet as-grid" aria-labelledby="co-talk">
            <div className="as-row"><h2 id="co-talk" className="as-h2">Who did the talking</h2><span className="t14 muted">{personName(w, iv.personId)} · {fmtDay(readRoom(w, c.id)?.startedAt ?? new Date().toISOString())}</span></div>
            <div className="as-talk" role="img" aria-label={`You ${c.talk.share}% of words, candidate ${100 - c.talk.share}%`}><i data-k="me" style={{ width: `${c.talk.share}%` }} /><i data-k="them" style={{ width: `${100 - c.talk.share}%` }} /></div>
            <div className="as-legend"><span><span className="as-sw" data-k="me" />You · <span className="num">{c.talk.share}%</span> ({c.talk.me} words)</span><span><span className="as-sw" data-k="them" />Candidate · <span className="num">{100 - c.talk.share}%</span> ({c.talk.them} words)</span></div>
            <dl className="as-kv">
              <dt>Questions you asked</dt><dd className="num">{c.asked}</dd>
              <dt>Q’s follow-ups</dt><dd>{c.usedSug} used, {c.dismissedSug} set aside</dd>
              <dt>Counted from</dt><dd>Words in the room record, not recordings of anyone’s voice.</dd>
            </dl>
          </section>
          {good.length > 0 && (
            <section className="ds-sheet as-grid" aria-labelledby="co-good">
              <h2 id="co-good" className="as-h2">What worked</h2>
              <ul className="as-list">{good.map((g) => <li key={g} className="as-note"><Glyph k="full" size={16} /><span>{g}</span></li>)}</ul>
            </section>
          )}
          <section className="ds-sheet as-grid" aria-labelledby="co-try">
            <h2 id="co-try" className="as-h2">To try next time</h2>
            {!items.length && <p className="as-p"><Glyph k="full" size={14} /> Open questions, a fair share of talking, every must-have covered. Nothing to change.</p>}
            <ul className="as-list">
              {items.map((x) => (
                <li key={x.key} className="as-li" data-gone={acked.has(x.key) ? '1' : undefined} style={acked.has(x.key) ? { textDecoration: 'none' } : undefined}>
                  <div className="as-row"><b>{x.h}</b>{acked.has(x.key) ? <span className="t14 muted">Noted</span> : <button type="button" className="ds-btn quiet" onClick={() => ack(x.key)}>Got it</button>}</div>
                  {x.body}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Canvas>
  );
}
