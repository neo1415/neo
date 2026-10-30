// SC-002 · How Talent Q works. An audience switch (hiring / looking for work, kept in the address as ?for=)
// and a contextual demonstration beside each step. Every demo is a small working sample on fictional data.
import { useState } from 'react';
import { Link, navigate, useRoute } from '../../ui/router';
import { SwitchRow } from '../../ds/Switch';
import { ClassShape } from '../evidence/candidate/ProofClass';
import { PROOF_MEANS, PROOF_WORD } from '../evidence/model';
import type { ProofClass } from '../../state/domain';
import { AskAbout, PageHead, Site } from './Site';

function DemoCriteria() {
  const [ok, setOk] = useState<Record<number, boolean>>({});
  const rows = ['Finds why a PostgreSQL query is slow and fixes it', 'Designs and debugs a REST API', 'Explains a fix clearly to a teammate'];
  return (
    <div className="ph-demo" role="group" aria-label="Sample: approve criteria">
      <p className="ph-demo-h"><b>Q’s draft criteria</b><span className="ds-sim">Sample</span></p>
      <ul className="ph-approve">{rows.map((r, i) => <li key={r}><span>{r}</span><button type="button" className="ds-btn" aria-pressed={!!ok[i]} onClick={() => setOk({ ...ok, [i]: !ok[i] })}>{ok[i] ? 'Approved' : 'Approve'}</button></li>)}</ul>
      <p className="t14 muted" role="status">{Object.values(ok).filter(Boolean).length} of 3 approved. Nobody is searched until you approve.</p>
    </div>
  );
}
function DemoClasses() {
  const [open, setOpen] = useState<ProofClass | null>(null);
  const ks: ProofClass[] = ['CLAIM', 'SELF_REPORTED', 'ASSESSED', 'ISSUER_VERIFIED'];
  return (
    <div className="ph-demo" role="group" aria-label="Sample: evidence classes">
      <p className="ph-demo-h"><b>Every item says what kind of evidence it is</b><span className="ds-sim">Sample</span></p>
      <div className="ph-classes">{ks.map((k) => <button key={k} type="button" className="ph-class" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)}><ClassShape k={k} />{PROOF_WORD[k]}</button>)}</div>
      <p className="t14" role="status">{open ? PROOF_MEANS[open] : 'Press one to see what it means.'}</p>
    </div>
  );
}
function DemoStatus() {
  const steps = ['Drafted by Q', 'Approved by you', 'Accepted by the provider', 'Delivered', 'Read'];
  const [at, setAt] = useState(1);
  return (
    <div className="ph-demo" role="group" aria-label="Sample: message status">
      <p className="ph-demo-h"><b>Invitation to Tobi (fictional)</b><span className="ds-sim">Simulated send</span></p>
      <ol className="ph-status">{steps.map((s, i) => <li key={s} data-on={i <= at || undefined}>{s}{i <= at ? '' : <span className="sr"> (not yet)</span>}</li>)}</ol>
      <p className="t14 muted">Accepted isn’t delivered, and delivered isn’t read. Q only shows what a receipt confirms.</p>
      <button type="button" className="ds-btn" onClick={() => setAt(at >= 4 ? 1 : at + 1)}>{at >= 4 ? 'Start again' : 'Next receipt arrives'}</button>
    </div>
  );
}
function DemoShare() {
  const [kora, setKora] = useState(true);
  const [find, setFind] = useState(false);
  return (
    <div className="ph-demo" role="group" aria-label="Sample: who sees your evidence">
      <p className="ph-demo-h"><b>Your debugging sample</b><span className="ds-sim">Sample</span></p>
      <SwitchRow label="Shared with Kora Pay (fictional)" help={kora ? 'They can see this item.' : 'Sharing stopped. Their access has ended.'} on={kora} onChange={setKora} />
      <SwitchRow label="Employers can find me in search" help={find ? 'Verified employers can find your profile.' : 'Nobody can find you; you can still apply.'} on={find} onChange={setFind} />
    </div>
  );
}
function DemoGap() {
  return (
    <div className="ph-demo" role="group" aria-label="Sample: one targeted follow-up">
      <p className="ph-demo-h"><b>Still open for Tobi (fictional)</b><span className="ds-sim">Sample</span></p>
      <p className="t14"><b>API design</b> · his repository suggests it; nobody has reviewed it.</p>
      <p className="t14">Q suggests: <b>one 30-minute endpoint design</b>, reviewed by a named engineer. Or he shares existing work instead.</p>
      <p className="t14 muted">Declining is recorded as declined, never as a failed result.</p>
    </div>
  );
}
function DemoPractice() {
  return (
    <div className="ph-demo ph-practice" role="group" aria-label="Sample: private practice">
      <p className="ph-demo-h"><b>Practice: an incident question</b><span className="ds-sim">Private</span></p>
      <p className="t14">Only you see practice. It is never counted as proof. A reviewed sample becomes evidence only when you choose to share it.</p>
    </div>
  );
}

const HIRE = [
  { t: 'Tell Q what needs doing', d: 'Say it the way you’d tell a colleague. Q drafts criteria someone could actually show, and what evidence could satisfy each one.', demo: <DemoCriteria />, ask: 'Describe a role' },
  { t: 'See who shows the skills', d: 'Q reads evidence people chose to share: reviewed samples, checked credentials, projects and claims, each labelled. Keyword misses are never rejections.', demo: <DemoClasses />, ask: 'Compare two sample candidates' },
  { t: 'Close only the gaps', d: 'Where a must-have is still open, Q suggests one short, targeted sample or a human review instead of a long test for everyone.', demo: <DemoGap />, ask: 'What does Q decide?' },
  { t: 'Q does the follow-up, with your yes', d: 'Q drafts messages and proposes times. Nothing is sent without approval, and statuses say only what a receipt confirms.', demo: <DemoStatus />, ask: 'Is this real?' },
];
const TALENT = [
  { t: 'Tell Q about yourself', d: 'Upload a CV, chat or fill in a short form. Skip anything. Nothing is shared until you say so.', demo: null, ask: 'Who sees my data?' },
  { t: 'Show what you can do', d: 'Add one thing that shows your work: a project, a certificate, a reference or a short sample. Q says plainly what kind of evidence each item is.', demo: <DemoClasses />, ask: 'I have a weak CV but I can do the work' },
  { t: 'Choose who sees it', d: 'Pick who can find you and share items one employer at a time. Stop sharing whenever you like.', demo: <DemoShare />, ask: 'Who sees my data?' },
  { t: 'Prepare, apply, follow through, grow', d: 'Q points to genuine openings, helps you prepare in private, and keeps track of every application, so you’re never left guessing.', demo: <DemoPractice />, ask: 'What does it cost?' },
];

export function How() {
  const { query } = useRoute();
  const who = query.get('for') === 'talent' ? 'talent' : 'hiring';
  const steps = who === 'talent' ? TALENT : HIRE;
  const set = (v: 'hiring' | 'talent') => navigate(`/site/how${v === 'talent' ? '?for=talent' : ''}`);
  return (
    <Site audience={who === 'talent' ? 'candidate' : undefined}>
      <PageHead kicker="How it works" title="How Talent Q works" lede="The same idea from both sides: evidence first, people in control, and Q doing the legwork in between.">
        <div className="ph-switch" role="radiogroup" aria-label="Show it for">
          {(['hiring', 'talent'] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={who === v} className="ds-filter" onClick={() => set(v)}
              onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); set(v === 'hiring' ? 'talent' : 'hiring'); } }}>
              {v === 'hiring' ? 'I’m hiring' : 'I’m looking for work'}</button>
          ))}
        </div>
      </PageHead>
      <ol className="ph-steps" aria-label={who === 'talent' ? 'Steps for people looking for work' : 'Steps for people hiring'}>
        {steps.map((s, i) => (
          <li key={s.t} className="ph-step">
            <div className="ph-step-text">
              <span className="ph-n num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="voice t24">{s.t}</h2>
              <p>{s.d}</p>
              <AskAbout q={s.ask} label="Ask Q about this" />
            </div>
            {s.demo && <div className="ph-step-demo">{s.demo}</div>}
          </li>
        ))}
      </ol>
      <section className="ps-band ps-honest" aria-labelledby="ph-next">
        <h2 id="ph-next" className="voice t24">{who === 'talent' ? 'Free to apply and to be found' : 'Start with one role'}</h2>
        <p>{who === 'talent' ? 'The core of Talent Q is free for people looking for work.' : 'A one-role pilot is the simplest way to see whether this works for you. Prices are being tested.'}</p>
        <div className="pl-ctas"><Link to="/signup" className="ds-btn primary">Create an account</Link><Link to={who === 'talent' ? '/site/talent' : '/site/employers'} className="ds-btn">{who === 'talent' ? 'For talent' : 'For employers'}</Link></div>
      </section>
    </Site>
  );
}
