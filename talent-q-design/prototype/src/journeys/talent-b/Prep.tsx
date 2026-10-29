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
    <ol className="tb-prep">
      {m.map((n) => (
        <li key={n.need}>
          <div className="tb-need-h"><Glyph k={NEED_GLYPH[n.state]} size={18} /><b>{n.need}</b><span className="tb-need-state">{NEED_LABEL[n.state]}</span></div>
          <blockquote className="tb-question"><span className="lab">Likely question</span>{QUESTION.find(([re]) => re.test(n.need))?.[1] ?? `Tell us about your experience with ${n.need.toLowerCase()}.`}</blockquote>
          <p className="t14" style={{ margin: 0 }}>{n.used.length ? <><b>Point to:</b> {[...n.used].sort((x, y) => Number(y.verified) - Number(x.verified)).slice(0, 3).map((e) => e.title).join('; ')}.</> : n.told ? <>You said: “{n.told}”. Have one concrete example ready, with a number.</> : <>Nothing shown yet. Prepare a short story: the situation, what you did, what changed.</>}</p>
          <button type="button" className="tb-linkbtn" onClick={() => prefillQ(`Let's practise the ${n.need.toLowerCase()} question`)}>Practise this with Q</button>
        </li>
      ))}
    </ol>
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
    <Canvas title="Interview prep" kicker="Private to you" open onClose={() => navigate('/c/home')}>
      {ev && job ? (
        <>
          <section className="ds-sheet tb-stack tb-prephero" aria-labelledby="tb-pr-h">
            <span className="lab">Next interview · {orgName(w, job.orgId)}</span>
            <h2 id="tb-pr-h" className="tb-h2">{job.title}</h2>
            <p className="tb-when"><b>{new Date(ev.start).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: a.timezone })}</b><span>{new Date(ev.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: a.timezone })} your time · {Math.round((new Date(ev.end).getTime() - new Date(ev.start).getTime()) / 60000)} minutes · video call</span><span className="ds-sim">Simulated invite</span></p>
            <p className="t14 muted" style={{ margin: 0 }}>Q prepares this only from the job’s stated needs, your own Passport and the invite. It never sees the employer’s private notes or scoring.</p>
            <div className="tb-actions"><Link className="ds-btn primary" to="/c/interview">Open the practice room</Link><Link className="ds-btn" to="/c/slots">Ask for a different time</Link></div>
          </section>
          <section className="ds-sheet tb-stack" aria-labelledby="tb-pr-t">
            <h2 id="tb-pr-t" className="tb-h2">What they’ll probably ask, and your proof</h2>
            <JobPrep job={job} pid={pid} />
          </section>
        </>
      ) : (
        <section className="ds-sheet tb-stack">
          <p style={{ margin: 0 }}>No interview is booked yet. That isn’t a sign either way. {live.length ? 'Here’s prep for the roles you’ve applied to, so you’re ready if one comes.' : 'When you apply for a role, prep for it will appear here.'}</p>
          {!live.length && <Link className="ds-btn" style={{ justifySelf: 'start' }} to="/c/jobs">Find jobs</Link>}
        </section>
      )}
      {!ev && live.map((j) => <section key={j.id} className="ds-sheet tb-stack" aria-label={`Prep for ${j.title}`}><h2 className="tb-h2">{orgName(w, j.orgId)} · {j.title}</h2><JobPrep job={j} pid={pid} /></section>)}
      <p className="t14 muted" style={{ margin: 0 }}>Practice with Q is private and never counts as proof. Nothing here is shared.</p>
    </Canvas>
  );
}
