// SC-003 · For employers. Outcomes, the sample journey (the founder's Tobi/Seyi example, fictional), and trust.
import { useState } from 'react';
import { Link } from '../../ui/router';
import { ClassShape } from '../evidence/candidate/ProofClass';
import { PROOF_WORD } from '../evidence/model';
import type { ProofClass } from '../../state/domain';
import { AskAbout, PageHead, Site } from './Site';
import { PROMISE_RECRUITER } from './content';

const JOURNEY: { t: string; d: string; show?: 'crit' | 'search' | 'cmp' | 'follow' | 'send'; ask: string }[] = [
  { t: 'The role', d: 'Kora Pay (fictional) needs a backend engineer who can troubleshoot PostgreSQL and APIs. Ada tells Q in two sentences; Q drafts three criteria and Ada approves them.', show: 'crit', ask: 'a backend engineer who can fix slow postgres queries' },
  { t: 'Beyond keywords', d: 'Q searches people who chose to be found, by what they’ve shown rather than CV wording. Tobi’s CV misses most of the keywords. He isn’t dropped.', show: 'search', ask: 'show me real candidates' },
  { t: 'The comparison', d: 'Q shows what supports each criterion, for each person, with sources. No overall score.', show: 'cmp', ask: 'Compare two sample candidates' },
  { t: 'One follow-up, not a test for everyone', d: 'API design is still open for Tobi, and almost everything is for Seyi. Q suggests one short, bounded sample each, reviewed by a named engineer.', show: 'follow', ask: 'What does Q decide?' },
  { t: 'Contact, with permission', d: 'Q drafts the invitations. Ada approves each one. Statuses say what a receipt confirms, and both sides get updates.', show: 'send', ask: 'Is this real?' },
];
const ROWS: { req: string; tobi: ProofClass; tobiSrc: string; seyi: ProofClass; seyiSrc: string }[] = [
  { req: 'PostgreSQL troubleshooting', tobi: 'ASSESSED', tobiSrc: 'Debugging sample, reviewed by a named engineer', seyi: 'CLAIM', seyiSrc: 'CV line, 2019' },
  { req: 'API design and debugging', tobi: 'SELF_REPORTED', tobiSrc: 'Repository shared with permission', seyi: 'CLAIM', seyiSrc: 'CV line' },
  { req: 'Explains work clearly', tobi: 'SELF_REPORTED', tobiSrc: 'Product walk-through', seyi: 'SELF_REPORTED', seyiSrc: 'Cover note' },
];

function Compare() {
  return (
    <div className="pe-cmp" role="group" aria-label="Fictional comparison">
      <p className="ph-demo-h"><b>Tobi and Seyi · fictional people</b><span className="ds-sim">Sample</span></p>
      <div className="pe-cmp-cols">
        {(['tobi', 'seyi'] as const).map((p) => (
          <section key={p} className="pe-person" aria-label={p === 'tobi' ? 'Tobi' : 'Seyi'}>
            <h4 className="voice t19">{p === 'tobi' ? 'Tobi' : 'Seyi'} <span className="t14 muted">{p === 'tobi' ? 'thin CV' : 'polished CV'}</span></h4>
            <p className="pe-reading">{p === 'tobi' ? 'Shows more than his CV says' : 'Strong claims, limited supporting evidence'}</p>
            <ul>{ROWS.map((r) => <li key={r.req}><span className="pe-req">{r.req}</span><span className="pq-cls"><ClassShape k={r[p]} />{PROOF_WORD[r[p]]}</span><span className="t14 muted">{p === 'tobi' ? r.tobiSrc : r.seyiSrc}</span></li>)}</ul>
          </section>
        ))}
      </div>
      <p className="t14 muted">Weak writing isn’t treated as a sign of skill either. Unverified isn’t incompetent; a good sample isn’t a guarantee.</p>
    </div>
  );
}

export function Employers() {
  const [step, setStep] = useState(0);
  const s = JOURNEY[step];
  return (
    <Site>
      <PageHead kicker="For employers" title="See who can do the work" lede={PROMISE_RECRUITER}>
        <div className="pl-ctas"><Link to="/site/pricing" className="ds-btn primary">Start with a role pilot</Link><Link to="/signup" className="ds-btn">Create an account</Link></div>
      </PageHead>

      <section className="ps-band" aria-labelledby="pe-out">
        <h2 id="pe-out" className="voice t30">What you get</h2>
        <ul className="pe-outcomes">
          <li><b>A short list you can defend</b><span>Three to five people who show the skills and said they’re interested, each with the evidence behind them.</span></li>
          <li><b>Less CV triage</b><span>Q reads the evidence; you review what matters. The time saved is something we’re measuring, not promising.</span></li>
          <li><b>One place for the follow-up</b><span>Messages, times and updates drafted by Q and approved by you, with statuses that never overstate.</span></li>
        </ul>
      </section>

      <section className="ps-band" aria-labelledby="pe-j">
        <h2 id="pe-j" className="voice t30">A sample journey</h2>
        <p className="muted">Fictional people and company. Step through it, or ask Q.</p>
        <div className="pe-journey">
          <ol className="pe-jsteps" aria-label="Journey steps">
            {JOURNEY.map((j, i) => <li key={j.t}><button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}><span className="num">{i + 1}</span>{j.t}</button></li>)}
          </ol>
          <div className="pe-jbody" aria-live="polite">
            <h3 className="voice t24">{s.t}</h3>
            <p>{s.d}</p>
            {s.show === 'crit' && <div className="ph-demo"><p className="ph-demo-h"><b>Approved criteria · Senior backend engineer</b><span className="ds-sim">Sample</span></p><ol className="pe-follow"><li><b>Must</b> · Finds why a PostgreSQL query is slow and fixes it</li><li><b>Must</b> · Designs and debugs a REST API</li><li><b>Helps</b> · Explains a fix clearly to a teammate</li></ol><p className="t14 muted">Approved by Ada Okafor. Nobody was searched before this.</p></div>}
            {s.show === 'search' && <div className="ph-demo"><p className="ph-demo-h"><b>Why Tobi is still here</b><span className="ds-sim">Sample</span></p><dl className="pe-why"><div><dt>CV keywords</dt><dd>2 of 9 matched</dd></div><div><dt>Evidence he shared</dt><dd>A reviewed debugging sample, a repository, a product walk-through</dd></div><div><dt>Q’s reading</dt><dd>Kept: his evidence speaks to both must-haves. A keyword miss is never a rejection.</dd></div></dl></div>}
            {s.show === 'cmp' && <Compare />}
            {s.show === 'send' && <div className="ph-demo"><p className="ph-demo-h"><b>Invitation to Tobi</b><span className="ds-sim">Simulated send</span></p><ol className="ph-status"><li data-on>Drafted by Q</li><li data-on>Approved by Ada</li><li data-on>Accepted by the provider</li><li>Delivered <span className="t14 muted">· no receipt yet</span></li><li>Read <span className="t14 muted">· unknown</span></li></ol></div>}
            {s.show === 'follow' && <div className="ph-demo"><p className="ph-demo-h"><b>Proposed: one bounded sample each</b><span className="ds-sim">Sample</span></p><ul className="pe-follow"><li><b>Tobi</b> · Design one endpoint for a refund flow, about 30 minutes</li><li><b>Seyi</b> · Find the slow query in a short log, about 30 minutes</li></ul><p className="t14 muted">Either can decline, or share existing work instead. Declining is recorded as declined, never as a failed result.</p></div>}
            <div className="pe-jnav">
              <button type="button" className="ds-btn quiet" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
              {step < JOURNEY.length - 1 ? <button type="button" className="ds-btn" onClick={() => setStep(step + 1)}>Next step</button> : <Link to="/signup" className="ds-btn primary">Try it on your role</Link>}
            </div>
            <AskAbout q={s.ask} label="Ask Q about this step" />
          </div>
        </div>
      </section>

      <section className="ps-band" aria-labelledby="pe-who">
        <h2 id="pe-who" className="voice t30">Who it’s for</h2>
        <div className="pe-who">
          <div className="ds-sheet"><p className="lab">In-house recruiters</p><p>Several specialist roles open and little time to judge technical work. Start with one role.</p></div>
          <div className="ds-sheet"><p className="lab">Specialist agencies</p><p>A separate workspace per client, so client data never mixes, and submittals your clients can read.</p></div>
          <div className="ds-sheet"><p className="lab">Founders who hire now and then</p><p>No recruiting words needed. Tell Q what keeps going wrong; pay per role, not a subscription.</p></div>
        </div>
      </section>

      <section className="ps-band ps-honest" aria-labelledby="pe-trust">
        <h2 id="pe-trust" className="voice t24">You stay in charge</h2>
        <p>Q never rejects anyone, never sends a message without your yes, and never scores faces, accents or emotion. Candidates choose what you see; when they stop sharing, your access ends.</p>
        <div className="pl-ctas"><Link to="/site/trust" className="ds-btn">How Q explains itself</Link><Link to="/site/pricing" className="ds-btn">Prices we’re testing</Link></div>
      </section>
    </Site>
  );
}
