// Interview prep for the next booked interview (or for live applications when none is booked). Built only
// from what the candidate can see: the job's stated needs, their own Passport and the calendar invite.
// Practice with Q is private and never counts as proof.
import { actorOf, simNow, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { prefillQ } from '../../q/QThread';
import { Link, navigate } from '../../ui/router';
import { NEED_GLYPH, NEED_LABEL, matchFor, orgName } from './logic';
import type { Job } from '../../state/domain';

const QUESTION: [RegExp, string][] = [
  [/payment|payout/i, 'Walk us through how you’d make a payout safe to retry.'],
  [/\bgo\b/i, 'Tell us about a Go service you ran in production. What broke?'],
  [/postgres|sql/i, 'A report query takes nine seconds. How do you find out why?'],
  [/incident/i, 'Describe an outage you led the response to. What changed afterwards?'],
  [/logistic/i, 'How would you model a delivery that changes route halfway?'],
];

function JobPrep({ job, pid }: { job: Job; pid: string }) {
  const w = useWorld((x) => x);
  const m = matchFor(w, pid, job);
  return (
    <ul className="tb-needs">
      {m.map((n) => (
        <li key={n.need}>
          <Glyph k={NEED_GLYPH[n.state]} size={20} />
          <span><b>{n.need}</b> · {NEED_LABEL[n.state].toLowerCase()}
            <span style={{ display: 'block' }}>Likely question: “{QUESTION.find(([re]) => re.test(n.need))?.[1] ?? `Tell us about your experience with ${n.need.toLowerCase()}.`}”</span>
            <span className="t14" style={{ display: 'block' }}>{n.used.length ? <>Point to: {[...n.used].sort((x, y) => Number(y.verified) - Number(x.verified)).slice(0, 3).map((e) => e.title).join('; ')}.</> : n.told ? <>You said: “{n.told}”. Have one concrete example ready, with a number.</> : <>Nothing shown yet. Prepare a short story: the situation, what you did, what changed.</>}</span>
            <button type="button" className="ds-btn quiet" onClick={() => prefillQ(`Let's practise the ${n.need.toLowerCase()} question`)}>Practise with Q</button>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PrepPage() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const t = simNow(w).getTime();
  const ev = w.calendar.filter((e) => e.personId === pid && e.status !== 'CANCELLED' && new Date(e.start).getTime() > t).sort((x, y) => x.start.localeCompare(y.start))[0];
  const job = ev ? w.jobs.find((j) => j.mandateId && j.mandateId === ev.mandateId) : undefined;
  const live = w.applications.filter((x) => x.personId === pid && ['SUBMITTED', 'VIEWED'].includes(x.status)).map((x) => w.jobs.find((j) => j.id === x.jobId)).filter((j): j is Job => !!j && j.status === 'OPEN');
  return (
    <Canvas title="Interview prep" kicker={`${a.first} · private to you`} open onClose={() => navigate('/c/home')}>
      {ev && job ? (
        <>
          <section className="ds-sheet tb-stack" aria-labelledby="tb-pr-h">
            <h2 id="tb-pr-h" className="voice t24" style={{ margin: 0 }}>{orgName(w, job.orgId)} · {job.title}</h2>
            <p style={{ margin: 0 }}><b>{new Date(ev.start).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: a.timezone })}</b> your time · {Math.round((new Date(ev.end).getTime() - new Date(ev.start).getTime()) / 60000)} minutes · video call <span className="ds-sim">Simulated invite</span></p>
            <p className="t14 muted" style={{ margin: 0 }}>Q prepares this only from the job’s stated needs, your own Passport and the invite. It never sees the employer’s private notes or scoring.</p>
            <div className="tb-actions"><Link className="ds-btn" to="/c/slots">Need a different time?</Link><Link className="ds-btn" to="/c/interview">Open the practice room</Link></div>
          </section>
          <section className="ds-sheet tb-stack" aria-labelledby="tb-pr-t">
            <h2 id="tb-pr-t" className="voice t24" style={{ margin: 0 }}>What they’ll probably ask, and your proof</h2>
            <JobPrep job={job} pid={pid} />
          </section>
        </>
      ) : (
        <section className="ds-sheet tb-stack">
          <p style={{ margin: 0 }}>No interview is booked yet. That isn’t a sign either way. {live.length ? 'Here’s prep for the roles you’ve applied to, so you’re ready if one comes.' : 'When you apply for a role, prep for it will appear here.'}</p>
          {!live.length && <Link className="ds-btn" style={{ justifySelf: 'start' }} to="/c/jobs">Find jobs</Link>}
        </section>
      )}
      {!ev && live.map((j) => <section key={j.id} className="ds-sheet tb-stack" aria-label={`Prep for ${j.title}`}><h2 className="voice t24" style={{ margin: 0 }}>{orgName(w, j.orgId)} · {j.title}</h2><JobPrep job={j} pid={pid} /></section>)}
      <p className="t14 muted" style={{ margin: 0 }}>Practice is private and never counts as proof. Nothing here is shared.</p>
    </Canvas>
  );
}
