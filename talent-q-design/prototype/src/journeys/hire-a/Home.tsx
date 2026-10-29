// Founder home (R1): where Funmi is in hiring, in plain steps, with the one next thing to do. It reads the
// same state Q uses for "where was I?", so leaving and coming back always lands in the right place.
// Plus a "waiting on you" block on Kora's home for hiring managers (R5): drafts to approve, sources to check.
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { DUR, EASE } from '../../ds/motion';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { readA } from '../../state/areas/hire-a';
import { curV, dayLabel, ensureSeeded, isVerified, orgMandates, payText, postedJob } from './model';
import { LimitsPanel, openQ } from './ui';

const say = (text: string) => void runAction({ label: text, act: { t: 'say', text } });

export function FounderHome() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const org = w.orgs.find((o) => o.id === a.orgId);
  const st = readA(w).intake[a.id];
  const m = st?.mandateId ? w.mandates.find((x) => x.id === st.mandateId) : orgMandates(w, a)[0];
  const found = m ? readA(w).search[m.id]?.found.length ?? 0 : 0;
  const sl = m ? w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').length : 0;
  const holds = m ? w.calendar.filter((e) => e.mandateId === m.id && e.status === 'HOLD').length : 0;
  const verified = isVerified(w, a.orgId);
  const job = m ? postedJob(w, m.id) : undefined;
  const steps = [
    { label: 'Tell Q about your business', done: !!org, detail: org ? `${org.name} · ${org.city}` : 'One line is enough' },
    { label: 'Work out who you need', done: !!st?.roleKey, detail: m ? m.title : 'Q asks a few plain questions' },
    { label: 'Approve the role brief', done: !!m && m.status !== 'DRAFT', detail: m ? `v${curV(m)} · ${payText(m)}` : 'Q drafts it for you' },
    { label: 'Find people', done: found > 0, detail: found ? `${found} found` : 'Q searches once the brief is approved' },
    { label: 'Choose a shortlist', done: sl > 0, detail: sl ? `${sl} shortlisted` : 'The few you want to meet' },
    { label: 'Arrange interviews', done: holds > 0, detail: holds ? `${holds} times held · invitations waiting for you` : 'Q proposes times; you approve' },
    { label: 'Verify your business', done: verified, detail: verified ? (job ? 'Verified employer · role posted' : 'Verified employer · you can post roles') : 'Your CAC number · lets you post roles and lifts message limits' },
  ];
  const cur = steps.findIndex((s) => !s.done);
  const doneN = steps.filter((s) => s.done).length;
  const next: { title: string; why: string; text: string; act: () => void } | null = !org || !st ? { title: 'Tell Q what’s going on in your business', why: 'You don’t need any recruiting words. Say it the way you’d tell a friend: what takes your time, what keeps going wrong. Q works out who would help and sets things up as you go.', text: 'Start with Q', act: () => say('I need someone to help me with my business but I do not really know what kind of person') }
    : !m ? { title: 'Carry on where you stopped', why: 'Q remembers your answers so far.', text: 'Carry on with Q', act: () => say('where was I?') }
    : m.status === 'DRAFT' ? { title: `Check and approve your ${m.title} brief`, why: 'Nothing is posted or searched until you approve it. Change anything by telling Q.', text: `Review the brief`, act: () => say('where was I?') }
    : !found ? { title: 'Find people for your role', why: 'Q looks for people whose profiles are open to offers. Nobody is contacted.', text: 'Find people', act: () => void runAction({ label: 'Find people', act: { t: 'do', op: 'hire-a.search', args: { id: m.id } } }) }
    : !sl ? { title: 'Choose who to look at closely', why: `${found} people could fit. Pick a few for your shortlist.`, text: 'See the people', act: () => say(`open the people for ${m.title}`) }
    : !holds ? { title: 'Meet your shortlist', why: 'Q suggests times and drafts invitations. Nothing is sent until you approve.', text: 'Propose interview times', act: () => say('propose interview times') }
    : !verified ? { title: `Verify ${org.name}`, why: 'It lets you post the role as a job and lifts the weekly message limit. Give Q your CAC number; it takes a minute.', text: 'Verify with Q', act: () => say('verify my business') } : null;
  return (
    <Canvas title={org ? org.name : `Welcome, ${a.first}`} kicker="Your hiring" open onClose={openQ}
      aside={org ? <span className="ds-tag" data-k={verified ? 'ok' : undefined}>{verified ? 'Verified employer' : 'Not verified yet'}</span> : undefined}>
      {next && (
        <section className="ds-sheet hire-a-next" aria-labelledby="fh-next">
          <span className="lab">{org ? 'Next' : 'Start here'}</span>
          <h2 id="fh-next" className="voice t24">{next.title}</h2>
          <p style={{ margin: 0 }}>{next.why}</p>
          <div className="ds-actions">
            <button type="button" className="ds-btn primary" onClick={next.act}>{next.text}</button>
            {m && <Link to={`/r/roles/${m.id}`} className="ds-btn quiet">Open the role brief</Link>}
          </div>
          {!org && <p className="t14 muted" style={{ margin: 0 }}>Or type to Q (“Ask Q” on a phone). You can also speak.</p>}
        </section>
      )}
      {org && !verified && m && <div style={{ maxWidth: 760 }}><LimitsPanel orgId={org.id} mandate={m} compact /></div>}
      <section className="ds-sheet" aria-labelledby="fh-steps" style={{ display: 'grid', gap: 12, maxWidth: 760 }}>
        <div className="hire-a-progress">
          <div className="row between" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><h2 id="fh-steps" className="lab" style={{ margin: 0 }}>Where you are</h2><span className="t14 muted num">{doneN} of {steps.length} done</span></div>
          {/* MO-008 plan progress: the bar grows to the new step (orientation, DUR.slow). */}
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneN} aria-label="Hiring steps done"><motion.span initial={false} animate={{ width: `${(doneN / steps.length) * 100}%` }} transition={{ duration: DUR.slow, ease: EASE.standard }} /></div>
        </div>
        <ol className="hire-a-steps">
          {steps.map((s, i) => (
            <li key={s.label} aria-current={i === cur ? 'step' : undefined} data-done={s.done ? '1' : undefined}>
              <Glyph k={s.done ? 'verified' : i === cur ? 'partial' : 'none'} title={s.done ? 'Done' : i === cur ? 'Next' : 'Not yet'} />
              <span><b>{s.label}</b><span className="t14 muted" style={{ display: 'block' }}>{s.detail}</span></span>
            </li>
          ))}
        </ol>
        {st && m && <p className="t14 muted" style={{ margin: 0 }}>Last worked on {dayLabel(st.updatedAt, a.timezone)}. Ask Q “where was I?” any time.</p>}
      </section>
    </Canvas>
  );
}

export function WaitingOnYou() {
  useEffect(() => { ensureSeeded(); }, []);
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const drafts = orgMandates(w, a).filter((m) => m.status === 'DRAFT' && m.createdBy !== a.id);
  const conflict = !readA(w).conflicts.p_kunle;
  if (!drafts.length && !conflict) return null;
  return (
    <section className="ds-sheet" aria-labelledby="hw-h" style={{ display: 'grid', gap: 10 }}>
      <h2 id="hw-h" className="lab" style={{ margin: 0 }}>Waiting on you</h2>
      <ul className="hire-a-list">
        {drafts.map((m) => <li key={m.id} className="hire-a-row" style={{ padding: '8px 0', borderTop: '1px solid var(--rule)' }}><span><b>{m.title}</b> · draft v{curV(m)} from {w.actors.find((x) => x.id === m.createdBy)?.first}, {dayLabel(m.versions[m.versions.length - 1].at, a.timezone)}</span><Link to={`/r/roles/${m.id}`} className="ds-btn">Review</Link></li>)}
        {conflict && <li className="hire-a-row" style={{ padding: '8px 0' }}><span><b>Kunle Bakare</b> · his CV and GitHub disagree about his experience</span><button type="button" className="ds-btn" onClick={() => say('how many years of experience does kunle really have')}>See both</button></li>}
      </ul>
    </section>
  );
}
