// SC-001 · Landing + Q intro. The promise and an entry for each side; Q present as a sample conversation (SC-013).
import { motion } from 'motion/react';
import { Link } from '../../ui/router';
import { arrive } from '../../ds/motion';
import { Site } from './Site';
import { SampleQ } from './SampleQ';
import { LINE_CANDIDATE, LINE_COMMERCIAL, PROMISE_CANDIDATE, PROMISE_RECRUITER } from './content';

export function Landing() {
  return (
    <Site dock={false}>
      <section className="pl-hero" aria-labelledby="pl-h">
        <motion.div className="pl-hero-copy" {...arrive}>
          <p className="lab">For hiring teams and for people looking for work</p>
          <h1 id="pl-h" className="voice pl-title">{LINE_COMMERCIAL}</h1>
          <p className="t19 ps-lede">Find the people who can do the work, not only the people who write the best CVs. See the proof, close only the gaps, and move things forward.</p>
          <div className="pl-doors">
            <Link to="/site/employers" className="pl-door">
              <span className="lab">I’m hiring</span>
              <b className="voice">See who can do the work</b>
              <span className="t14 muted">Recruiters, agencies and founders</span>
            </Link>
            <Link to="/site/talent" className="pl-door" data-audience="candidate">
              <span className="lab">I’m looking for work</span>
              <b className="voice">{LINE_CANDIDATE}</b>
              <span className="t14 muted">Free to apply and to be found</span>
            </Link>
          </div>
        </motion.div>
        <SampleQ path="/site" variant="inline" headingId="pq-hero-h" />
      </section>

      <section className="ps-band" aria-labelledby="pl-promises">
        <h2 id="pl-promises" className="voice t30">Two promises</h2>
        <div className="pl-promises">
          <figure className="ds-sheet pl-promise">
            <figcaption className="lab">If you’re hiring</figcaption>
            <blockquote className="voice t19">“{PROMISE_RECRUITER}”</blockquote>
            <p className="t14 muted">People review and decide. Q never rejects anyone or sends anything without a yes.</p>
          </figure>
          <figure className="ds-sheet pl-promise" data-audience="candidate">
            <figcaption className="lab">If you’re looking for work</figcaption>
            <blockquote className="voice t19">“{PROMISE_CANDIDATE}”</blockquote>
            <p className="t14 muted">No fee to apply or to become searchable.</p>
          </figure>
        </div>
      </section>

      <section className="ps-band" aria-labelledby="pl-example">
        <h2 id="pl-example" className="voice t30">A CV is a claim. Work is evidence.</h2>
        <ol className="pl-steps">
          <li><b>Tell Q what needs doing</b><span>In your own words. Q turns it into criteria someone could actually show, and you approve them.</span></li>
          <li><b>See who shows the skills</b><span>Including people a keyword search would miss. A missing keyword is never a rejection.</span></li>
          <li><b>Close only the gaps</b><span>One short, targeted sample where something is still open, not a 90-minute test for everyone.</span></li>
          <li><b>Q does the follow-up</b><span>Messages, times and updates, each one approved by you, with honest statuses.</span></li>
        </ol>
        <p><Link to="/site/how" className="ds-btn">How Talent Q works</Link></p>
      </section>

      <section className="ps-band" aria-labelledby="pl-never">
        <h2 id="pl-never" className="voice t30">What Q will never do</h2>
        <ul className="pl-never">
          <li>Decide who gets hired.</li>
          <li>Score faces, accents, emotion or personality.</li>
          <li>Show anyone your profile without your say.</li>
          <li>Treat an unverified claim as a sign someone can’t do the work.</li>
        </ul>
        <p><Link to="/site/trust" className="ds-btn">Trust and how Q explains itself</Link></p>
      </section>

      <section className="ps-band ps-honest" aria-labelledby="pl-today">
        <h2 id="pl-today" className="voice t24">Where this is today</h2>
        <p>Talent Q is being designed and tested. There are no customer results to show yet, so this site makes no claims about them. Prices are hypotheses we’re testing.</p>
        <div className="pl-ctas"><Link to="/signup" className="ds-btn primary">Create an account</Link><Link to="/site/pricing" className="ds-btn">See the prices we’re testing</Link></div>
      </section>
    </Site>
  );
}
