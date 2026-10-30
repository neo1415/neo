// SC-175 · Rejected application recovery coaching (Chidi, Tinda's Associate PM). Warm and honest: Q uses only what
// the employer chose to share, quoted word for word, and never guesses their reasons. Without feedback it says so and
// offers a polite request (drafted, approved by him, simulated send: sent ≠ read). Next steps come from the employer's
// own words, mapped to his career plan, plus new private practice. MO-040: the stage follows the employer's event.
import { motion } from 'motion/react';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { QMark } from '../../ds/QMark';
import { Glyph } from '../../ds/Glyph';
import { arrive } from '../../ds/motion';
import { runAction } from '../../q/core/engine';
import { Link, navigate, useRoute } from '../../ui/router';
import { tdRead } from '../../state/areas/talent-d';
import { dayMonth, dayTime, demoState, evidenceTitle, orgNm, stepsFromFeedback } from './logic';
import { StageTag, Variant } from './ui';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

export function RecoveryPage({ appId }: { appId: string }) {
  const w = useWorld((x) => x); const a = actorOf(w); const pid = a.personId ?? '';
  const { query } = useRoute();
  const app = w.applications.find((x) => x.id === appId);
  const job = app && w.jobs.find((j) => j.id === app.jobId);
  const org = job ? orgNm(w, job.orgId) : '';
  const ds = demoState(query) ?? (!app || !job ? 'error' : app.personId !== pid ? 'denied' : null);
  const r = tdRead(w).recovery[appId] ?? { asked: null, feedback: null, steps: [] };
  const msg = r.asked ? w.threads.flatMap((t) => t.messages).find((m) => m.id === r.asked!.msgId) : undefined;
  const steps = r.feedback ? stepsFromFeedback(r.feedback.text) : [];
  const decided = app?.timeline.filter((t) => t.by === 'EMPLOYER').at(-1);
  const shared = app ? app.shared.map((id) => evidenceTitle(w, id)).filter(Boolean) : [];
  const verified = w.evidence.filter((e) => e.ownerId === pid && e.verification === 'VERIFIED' && e.kind !== 'PRACTICE');
  return (
    <Canvas title={job ? `After ${org}’s decision` : 'Application'} kicker={job ? <>{job.title} · <Link to="/c/applications">All applications</Link></> : 'Applications'} open onClose={() => navigate('/c/applications')} qLine="Only what they told you. No guesses.">
      <Variant state={ds === 'empty' ? null : ds} what="this application" back={{ to: '/c/applications', label: 'Back to your applications' }}>
        {app && job && (app.status !== 'NOT_PROGRESSING' || ds === 'empty') ? (
          <section className="ds-sheet tb-empty"><h2 className="tb-h2">Nothing to recover from</h2><p style={{ margin: 0 }}>This application is still {app.status === 'WITHDRAWN' ? 'withdrawn by you' : 'open'}: <StageTag status={app.status} />. This page is for after an employer decides not to go further.</p><Link className="ds-btn" to="/c/applications">Back to your applications</Link></section>
        ) : app && job && (
          <div className="td-page">
            <div className="tb-row-between"><span className="t14">Status: <StageTag status={app.status} by={org} /></span>{decided && <span className="t14 muted">{org} updated it on {dayMonth(decided.at)}</span>}</div>
            <div className="td-qline"><QMark mood="idle" size={20} /><p>I’m sorry, {a.first}. This is one team’s decision about one role.{verified.length ? ` It doesn’t change what your record shows: “${verified[0].title.split(',').slice(0, 2).join(',')}” is still confirmed.` : ''} {r.feedback ? `${org} shared some feedback, and I’ll only use their words.` : `${org} didn’t say why, and I won’t guess.`}</p></div>

            <section className="ds-sheet td-stack" aria-labelledby="td-fb-h">
              <h2 id="td-fb-h" className="tb-h2">What {org} told you</h2>
              {r.feedback ? (
                <motion.blockquote {...arrive} className="td-quote">“{r.feedback.text}”<cite>{org}, shared with you {dayTime(r.feedback.at)}. Quoted exactly.</cite></motion.blockquote>
              ) : (
                <>
                  <p style={{ margin: 0 }}>Only that they aren’t taking your application further. No reason was shared. Employers often don’t give one, and the reason can be anything, including things that have nothing to do with your application. I won’t fill the gap with a guess.</p>
                  {!r.asked && <div className="tb-actions"><button type="button" className="ds-btn primary" onClick={() => act('td.rec.ask', { appId })}>Ask {org} for feedback</button><span className="t14 muted">You’ll see the message before anything is sent.</span></div>}
                  {r.asked && msg && (
                    <div className="td-msg" aria-label="Your request">
                      <div className="tb-row-between"><span className="lab">To {org} · in Talent Q</span><span className="ds-tag" data-k={r.asked.state === 'DRAFT' ? 'busy' : undefined}>{r.asked.state === 'DRAFT' ? 'Draft · not sent' : 'Sent (simulated) · not read yet'}</span></div>
                      <p style={{ margin: 0 }}>{msg.body}</p>
                      {r.asked.state === 'DRAFT'
                        ? <div className="tb-actions"><button type="button" className="ds-btn primary" onClick={() => act('td.rec.send', { appId })}>Send it</button><button type="button" className="ds-btn quiet" onClick={() => act('td.rec.cancel', { appId })}>Don’t send</button></div>
                        : <p className="t14 muted" style={{ margin: 0 }}>Sent on {dayTime(msg.at)}. They may not reply; that’s common and isn’t a verdict on you. <Link to="/c/messages">See it in messages</Link></p>}
                    </div>
                  )}
                  {r.asked?.state === 'SENT_SIMULATED' && (
                    <details className="tb-details t14">
                      <summary>Reviewer control (simulated employer)</summary>
                      <button type="button" className="ds-btn" onClick={() => act('td.rec.employer', { appId })}>Simulate {org} replying with feedback</button>
                    </details>
                  )}
                </>
              )}
            </section>

            <section className="ds-sheet td-stack" aria-labelledby="td-ns-h">
              <h2 id="td-ns-h" className="tb-h2">{r.feedback ? `Next steps from what ${org} said` : 'Useful next steps'}</h2>
              {!r.feedback && <p className="td-note">These don’t assume why. They’re what helps after any “no”.</p>}
              <ul className="td-nextsteps">
                {(steps.length ? steps : [
                  { id: 'plan', label: 'Your career plan is unchanged', to: '/c/career', why: 'One decision doesn’t move anything in your record.' },
                  { id: 'jobs', label: 'Look at open roles', to: '/c/jobs', why: 'Applying to several at once spreads the risk of any one “no”.' },
                ]).map((x) => (
                  <li key={x.id} data-done={r.steps.includes(x.id) || undefined}>
                    <span><b>{x.label}</b><span className="t14 muted" style={{ display: 'block' }}>{x.why}</span></span>
                    <span className="tb-actions"><Link className="ds-btn" to={x.to}>Open</Link><button type="button" className="tb-linkbtn" aria-pressed={r.steps.includes(x.id)} onClick={() => act('td.rec.step', { appId, id: x.id })}>{r.steps.includes(x.id) ? 'Done ✓' : 'Mark done'}</button></span>
                  </li>
                ))}
                <li>
                  <span><b>New practice, private</b><span className="t14 muted" style={{ display: 'block' }}>{r.feedback && /writing|brief/i.test(r.feedback.text) ? 'One question on product writing. Only you see it, and it never counts as proof.' : 'One question from your plan. Only you see it.'}</span></span>
                  <button type="button" className="ds-btn" onClick={() => act('ta.j7.quiz.start', r.feedback && /writing|brief/i.test(r.feedback.text) ? { comp: 'writing' } : {})}>Practise</button>
                </li>
              </ul>
            </section>

            <section className="ds-sheet td-stack" aria-labelledby="td-keep-h">
              <h2 id="td-keep-h" className="tb-h2">What stays the same</h2>
              <ul className="td-strengths">
                <li><Glyph k="full" size={18} /><span>{shared.length ? `${org} still has what you shared: ${shared.map((e) => e!.title).join('; ')}. End it from your Passport if you want.` : `You didn’t share any Passport items with ${org}, so they hold nothing of yours beyond the application.`}</span></li>
                <li><Glyph k="full" size={18} /><span>Nothing in your Passport or career record changed because of this decision.</span></li>
              </ul>
            </section>
          </div>
        )}
      </Variant>
    </Canvas>
  );
}
