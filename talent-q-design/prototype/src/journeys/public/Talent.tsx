// SC-004 · For talent. Candidate outcomes, evidence and growth, on the warm candidate paper.
import { Link } from '../../ui/router';
import { ClassShape } from '../evidence/candidate/ProofClass';
import { PROOF_MEANS, PROOF_WORD } from '../evidence/model';
import type { ProofClass } from '../../state/domain';
import { AskAbout, PageHead, Site } from './Site';
import { LINE_CANDIDATE, PROMISE_CANDIDATE } from './content';

const LADDER: { k: ProofClass; ex: string }[] = [
  { k: 'CLAIM', ex: '“I’ve built Go services for six years” on a CV' },
  { k: 'SELF_REPORTED', ex: 'A project link you added yourself' },
  { k: 'ASSESSED', ex: 'A short work sample a named reviewer looked at' },
  { k: 'ISSUER_VERIFIED', ex: 'A certificate the issuer confirmed' },
];

export function Talent() {
  return (
    <Site audience="candidate">
      <PageHead kicker="For talent" title={LINE_CANDIDATE} lede={PROMISE_CANDIDATE}>
        <div className="pl-ctas"><Link to="/signup" className="ds-btn primary">Create your free profile</Link><Link to="/site/how?for=talent" className="ds-btn">How it works for you</Link></div>
      </PageHead>

      <section className="ps-band" aria-labelledby="pt-out">
        <h2 id="pt-out" className="voice t30">What changes for you</h2>
        <ul className="pe-outcomes">
          <li><b>Show it once</b><span>Add what shows your work, once, instead of re-doing the same test for every employer.</span></li>
          <li><b>You choose who sees it</b><span>Private until you share. Pick who can find you, share item by item, and stop sharing any time.</span></li>
          <li><b>Genuine openings</b><span>Jobs say whether the employer has confirmed they’re hiring, and when they promised to reply.</span></li>
          <li><b>Help that follows through</b><span>Q helps you prepare, apply and keep track, and tells you when anything changes.</span></li>
        </ul>
      </section>

      <section className="ps-band" aria-labelledby="pt-ev">
        <h2 id="pt-ev" className="voice t30">What counts as evidence</h2>
        <p className="muted">Every item says what kind it is, in the same words employers see. A claim isn’t a black mark; it just isn’t proof yet.</p>
        <ol className="pt-ladder">
          {LADDER.map((l) => <li key={l.k}><span className="pq-cls"><ClassShape k={l.k} size={18} /><b>{PROOF_WORD[l.k]}</b></span><p>{PROOF_MEANS[l.k]}</p><p className="t14 muted">For example: {l.ex}</p></li>)}
        </ol>
        <AskAbout q="I have a weak CV but I can do the work" label="Ask Q what would count for you" />
      </section>

      <section className="ps-band" aria-labelledby="pt-grow">
        <h2 id="pt-grow" className="voice t30">Grow between applications</h2>
        <div className="pe-who">
          <div className="ds-sheet"><p className="lab">Graduates</p><p>A thin CV is normal. One project or short sample can say more than a page of wording.</p></div>
          <div className="ds-sheet"><p className="lab">Career switchers</p><p>See the roles your skills already reach, and the one gap worth closing first.</p></div>
          <div className="ds-sheet"><p className="lab">Experienced specialists</p><p>Share work discreetly, with the employers you pick, without repeating evaluations.</p></div>
        </div>
        <p className="t14 muted">Practice is private and never counted as proof. Lite mode keeps things light on slow or costly data.</p>
      </section>

      <section className="ps-band ps-honest" aria-labelledby="pt-free">
        <h2 id="pt-free" className="voice t24">Free to apply and to be found</h2>
        <p>Your profile, finding work, applying, sharing evidence and basic preparation are free. We won’t charge you to be considered or to get an interview.</p>
        <div className="pl-ctas"><Link to="/signup" className="ds-btn primary">Create your free profile</Link><Link to="/site/trust" className="ds-btn">Your privacy</Link></div>
      </section>
    </Site>
  );
}
