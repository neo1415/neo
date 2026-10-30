// SC-006 · Trust and AI explanations. What Q does and does not decide, human review, evidence classes,
// privacy and revocation, simulated vs real, no face/accent/emotion scoring, and the claims we don't make
// (04_SOURCE_LEDGER.md "Unproven claims", rewritten in plain words and used as hard constraints).
import { Link } from '../../ui/router';
import { PageIndex } from '../../ds/PageIndex';
import { ClassShape } from '../evidence/candidate/ProofClass';
import { PROOF_MEANS, PROOF_WORD } from '../evidence/model';
import type { ProofClass } from '../../state/domain';
import { AskAbout, PageHead, Site } from './Site';

const SECTIONS = [
  { id: 'tr-decide', label: 'What Q decides' }, { id: 'tr-review', label: 'Human review' }, { id: 'tr-classes', label: 'Evidence classes' },
  { id: 'tr-privacy', label: 'Privacy' }, { id: 'tr-sim', label: 'Simulated vs real' }, { id: 'tr-never', label: 'No face scoring' }, { id: 'tr-claims', label: 'Claims we don’t make' },
];

export function Trust() {
  return (
    <Site>
      <PageHead kicker="Trust" title="How Q works, and where it stops" lede="Q is the assistant inside Talent Q. It shows its sources, says what it doesn’t know, and asks before it acts." />
      <PageIndex items={SECTIONS} />

      <section id="tr-decide" className="ps-band" aria-labelledby="tr-decide-h">
        <h2 id="tr-decide-h" className="voice t30">What Q does, and what it doesn’t decide</h2>
        <div className="tr-two">
          <div className="ds-sheet"><h3 className="t19">Q does</h3><ul className="tr-list">
            <li>Turns what you say into draft criteria, for you to approve</li>
            <li>Gathers evidence people chose to share, and cites the source of each item</li>
            <li>Explains a comparison criterion by criterion, with what’s still unknown</li>
            <li>Drafts messages, proposes times and keeps statuses honest</li>
          </ul></div>
          <div className="ds-sheet tr-not"><h3 className="t19">Q doesn’t</h3><ul className="tr-list">
            <li>Decide who is hired, moved forward or turned down</li>
            <li>Reject anyone for a missing keyword</li>
            <li>Send anything, to anyone, without a person’s yes</li>
            <li>Combine everything into one score of a person’s worth</li>
            <li>Treat “unknown” as “weak”</li>
          </ul></div>
        </div>
        <AskAbout q="What does Q decide?" label="Ask Q what it can’t decide" />
      </section>

      <section id="tr-review" className="ps-band" aria-labelledby="tr-review-h">
        <h2 id="tr-review-h" className="voice t30">Human review</h2>
        <p>Every hiring decision is made by a person. Criteria are approved by the recruiter before any search. A work sample is reviewed by a named person in the hiring team, and their note is kept. Q’s reading of the evidence is always shown with what it’s based on, so it can be checked and challenged.</p>
        <p className="t14 muted">Q’s analysis isn’t a final hiring decision. A demonstrated sample isn’t a guarantee of performance in the job.</p>
      </section>

      <section id="tr-classes" className="ps-band" aria-labelledby="tr-classes-h">
        <h2 id="tr-classes-h" className="voice t30">Evidence classes</h2>
        <p className="muted">One set of words, used by employers and candidates alike. Shape and word carry the meaning, never colour alone.</p>
        <dl className="tr-classes">
          {(['CLAIM', 'SELF_REPORTED', 'ASSESSED', 'ISSUER_VERIFIED', 'DISPUTED'] as ProofClass[]).map((k) => (
            <div key={k}><dt><ClassShape k={k} size={18} />{PROOF_WORD[k]}</dt><dd>{PROOF_MEANS[k]}</dd></div>
          ))}
        </dl>
      </section>

      <section id="tr-privacy" className="ps-band" aria-labelledby="tr-privacy-h">
        <h2 id="tr-privacy-h" className="voice t30">Privacy and taking things back</h2>
        <ul className="tr-list tr-wide">
          <li><b>Private until you share.</b> Nothing in your profile is visible to an employer until you choose.</li>
          <li><b>You choose who can find you.</b> Anyone hiring, verified employers only, or nobody. You can hide from a named company.</li>
          <li><b>Share item by item, per employer.</b> Sharing with one employer never shares with another.</li>
          <li><b>Stop sharing any time.</b> Their access ends when you stop, and you can check what they still see.</li>
          <li><b>See what Q remembers.</b> You can read it, correct it or remove it.</li>
          <li><b>Agencies keep clients apart.</b> One client’s information never appears in another client’s workspace.</li>
        </ul>
      </section>

      <section id="tr-sim" className="ps-band" aria-labelledby="tr-sim-h">
        <h2 id="tr-sim-h" className="voice t30">Simulated vs real</h2>
        <p>This site and the Talent Q prototype are a design, not a live service. Every person, company and number is fictional. Sending, booking, checking credentials and signing in are simulated, and each is labelled where it happens.</p>
        <p>Even when things are real, Q will only say what a receipt confirms: a message accepted by a provider isn’t delivered, and delivered isn’t read.</p>
      </section>

      <section id="tr-never" className="ps-band" aria-labelledby="tr-never-h">
        <h2 id="tr-never-h" className="voice t30">No face, accent or emotion scoring</h2>
        <p>Q never scores faces, accents, emotion or personality. Video and voice are always optional, with a written alternative. When someone shares a recording, only the words (the transcript) can be reviewed, and they choose which parts.</p>
      </section>

      <section id="tr-claims" className="ps-band ps-honest" aria-labelledby="tr-claims-h">
        <h2 id="tr-claims-h" className="voice t24">Claims we don’t make</h2>
        <p className="muted">None of these is proven, so we don’t say them.</p>
        <ul className="tr-list tr-wide">
          <li>That Talent Q finds better employees than LinkedIn, test platforms or a good recruiter.</li>
          <li>That recruiters will pay any particular price. Our prices are being tested.</li>
          <li>That Q’s matching is statistically validated, or predicts job performance.</li>
          <li>That every job is verified, every email is delivered, or every profile can be reached.</li>
          <li>That paid career coaching will pay for the free candidate core.</li>
          <li>That any network effect or data advantage exists yet.</li>
        </ul>
        <div className="pl-ctas"><Link to="/site/how" className="ds-btn">How Talent Q works</Link><Link to="/signup" className="ds-btn primary">Create an account</Link></div>
      </section>
    </Site>
  );
}
