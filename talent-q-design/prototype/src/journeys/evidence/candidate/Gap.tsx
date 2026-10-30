// J12 step 12 (pack item F): J7 answers a verified gap. Practice stays private and never becomes employer-visible proof;
// only a reviewed walk-through becomes Assessed evidence, and only the candidate decides who sees it. Reuses J7's own
// incident practice (ta.j7.quiz.start) and career plan; nothing here shares anything.
import { useWorld } from '../../../mock/world';
import { runAction } from '../../../q/core/engine';
import { navigate, Link } from '../../../ui/router';
import { QMark } from '../../../ds/QMark';
import { reqsOf } from '../../hire-b/model';
import { BOUNDED_SAMPLE, orgNm, roleTitle, verifiedGap } from './logic';
import './candidate.css';

export function GapCard({ pid }: { pid: string }) {
  const w = useWorld((x) => x);
  const g = verifiedGap(w, pid);
  if (!g) return null;
  const req = reqsOf(w).find((r) => r.reqId === g.reqId);
  const org = orgNm(w, 'org_kora'); const role = roleTitle(w, 'm_backend');
  const practise = async () => { await runAction({ label: 'Practise privately', act: { t: 'do', op: 'ta.j7.quiz.start', args: { comp: 'incident' } } }); navigate('/c/career'); };
  return (
    <section className="ds-sheet evc-gap" aria-labelledby="evc-gap-h">
      <div className="evc-row"><span className="lab evc-q"><QMark mood="idle" size={18} />Q · private to you</span><span className="ds-tag">{g.level === 'partial' ? 'Partly shown' : 'Not shown yet'}</span></div>
      <h2 id="evc-gap-h" className="voice evc-req-h">{g.label} is {g.level === 'partial' ? 'only partly shown' : 'not shown yet'} for {org}’s {role} role</h2>
      {g.item
        ? <p className="t14" style={{ margin: 0 }}><b>What {org} sees:</b> {g.item.e.title.replace(/:.*/, '')}. {g.item.note}.</p>
        : <p className="t14" style={{ margin: 0 }}>Nothing you share with {org} shows this right now.</p>}
      <ol className="evc-steps">
        <li data-k="private">
          <b>Practise privately</b>
          <span className="t14">An incident-command scenario, 15 minutes. Only you see it. Practice never becomes proof, and no employer sees it.</span>
          <button type="button" className="ds-btn" onClick={() => void practise()}>Practise now</button>
        </li>
        <li data-k="review">
          <b>Get one walk-through reviewed</b>
          <span className="t14">{BOUNDED_SAMPLE.r4.task}, about {BOUNDED_SAMPLE.r4.minutes} minutes. A reviewer’s result makes it Assessed evidence.</span>
        </li>
        <li data-k="share">
          <b>You choose who sees it</b>
          <span className="t14">Nothing is shared on its own. You decide whether {org}, or anyone, sees the result.</span>
        </li>
      </ol>
      <p className="t14 muted" style={{ margin: 0 }}>{req && !req.mustHave ? 'A nice-to-have for this role, not a must-have. ' : ''}Shown because {org}’s reading of your shared evidence marks it {g.level === 'partial' ? 'partial' : 'not shown'}. <Link to="/c/career">Your career plan</Link></p>
    </section>
  );
}
