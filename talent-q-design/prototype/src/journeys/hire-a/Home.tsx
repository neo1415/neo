// Founder home (R1): where Funmi is in hiring, in plain steps, with the one next thing to do. It reads the
// same state Q uses for "where was I?", so leaving and coming back always lands in the right place.
// Plus a "waiting on you" block on Kora's home for hiring managers (R5): drafts to approve, sources to check.
import { useEffect } from 'react';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { readA } from '../../state/areas/hire-a';
import { curV, dayLabel, ensureSeeded, orgMandates, payText } from './model';
import { openQ } from './ui';

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
  const steps = [
    { label: 'Tell Q about your business', done: !!org, detail: org ? `${org.name} · ${org.city}` : 'One line is enough' },
    { label: 'Work out who you need', done: !!st?.roleKey, detail: m ? m.title : 'Q asks a few plain questions' },
    { label: 'Approve the role brief', done: !!m && m.status !== 'DRAFT', detail: m ? `v${curV(m)} · ${payText(m)}` : 'Q drafts it for you' },
    { label: 'Find people', done: found > 0, detail: found ? `${found} found` : 'Q searches once the brief is approved' },
    { label: 'Choose a shortlist', done: sl > 0, detail: sl ? `${sl} shortlisted` : 'The few you want to meet' },
    { label: 'Arrange interviews', done: holds > 0, detail: holds ? `${holds} times held · invitations waiting for you` : 'Q proposes times; you approve' },
  ];
  const cur = steps.findIndex((s) => !s.done);
  const next: { text: string; act: () => void } | null = !org || !st ? { text: 'Start with Q', act: () => say('I need someone to help me with my business but I do not really know what kind of person') }
    : !m ? { text: 'Carry on where we stopped', act: () => say('where was I?') }
    : m.status === 'DRAFT' ? { text: `Review the ${m.title} brief`, act: () => say('where was I?') }
    : !found ? { text: 'Find people', act: () => void runAction({ label: 'Find people', act: { t: 'do', op: 'hire-a.search', args: { id: m.id } } }) }
    : !sl ? { text: 'Choose who to look at', act: () => say(`open the people for ${m.title}`) }
    : !holds ? { text: 'Propose interview times', act: () => say('propose interview times') } : null;
  return (
    <Canvas title={org ? `${org.name} · hiring` : `Welcome, ${a.first}`} kicker="Q · your hiring" open onClose={openQ}>
      {!org && (
        <section className="ds-sheet" style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
          <h2 className="voice t24" style={{ margin: 0 }}>Tell Q what’s going on in your business.</h2>
          <p style={{ margin: 0 }}>You don’t need to know any recruiting words. Say it the way you’d say it to a friend: what’s taking your time, what keeps going wrong. Q will work out who would help, and set everything up as you go.</p>
          <p className="t14 muted" style={{ margin: 0 }}>Use the conversation beside this page (or “Ask Q” on a phone). You can type or speak.</p>
        </section>
      )}
      <section className="ds-sheet" aria-labelledby="fh-steps" style={{ display: 'grid', gap: 12, maxWidth: 760 }}>
        <h2 id="fh-steps" className="lab" style={{ margin: 0 }}>Where you are</h2>
        <ol className="hire-a-steps">
          {steps.map((s, i) => (
            <li key={s.label} aria-current={i === cur ? 'step' : undefined}>
              <Glyph k={s.done ? 'verified' : i === cur ? 'partial' : 'none'} title={s.done ? 'Done' : i === cur ? 'Next' : 'Not yet'} />
              <span><b>{s.label}</b><span className="t14 muted" style={{ display: 'block' }}>{s.detail}</span></span>
            </li>
          ))}
        </ol>
        {next && <button type="button" className="ds-btn primary" style={{ justifySelf: 'start' }} onClick={next.act}>{next.text}</button>}
        {m && <Link to={`/r/roles/${m.id}`} className="t14">Open the role brief</Link>}
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
        {drafts.map((m) => <li key={m.id} className="hire-a-row" style={{ padding: '8px 0' }}><span><b>{m.title}</b> · draft v{curV(m)} from {w.actors.find((x) => x.id === m.createdBy)?.first}, {dayLabel(m.versions[m.versions.length - 1].at, a.timezone)}</span><Link to={`/r/roles/${m.id}`} className="ds-btn">Review</Link></li>)}
        {conflict && <li className="hire-a-row" style={{ padding: '8px 0' }}><span><b>Kunle Bakare</b> · his CV and GitHub disagree about his experience</span><button type="button" className="ds-btn" onClick={() => say('how many years of experience does kunle really have')}>See both</button></li>}
      </ul>
    </section>
  );
}
