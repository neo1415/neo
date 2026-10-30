// Recruiter "Today" for an employer team (Kora). Reads the one store: drafts waiting for approval, interviews
// coming up, every role with where its people are, Q's running work and the organisation's recent activity.
// Design (design-elevation + dataviz): one line from Q states the finding; "Needs you" leads; each role's
// pipeline is a labelled stage strip (direct labels, no legend, counts as text so it survives greyscale).
import { useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { TERMINAL_STATUSES } from '@contracts';
import { allRuns, onRuns, useNamedRun, useRun } from '../mock/runtime';
import { actorOf, canSeeCandidate, eventsFor, simNow, useWorld, type World } from '../mock/world';
import { STAGES, STAGE_LABEL, type Stage } from '../state/domain';
import { Canvas } from '../ds/Workspace';
import { QMark } from '../ds/QMark';
import { arrive } from '../ds/motion';
import { RunSteps } from '../ui/kit';
import { Link } from '../ui/router';
import '../styles/home.css';
import { runAction } from '../q/core/engine';
import { proof } from '../state/areas/proof';
import { firstName as candName, shortLabel } from '../journeys/hire-b/model';
import '../journeys/evidence/recruiter/evidence.css';

function useActiveRuns() {
  const runs = useSyncExternalStore(onRuns, () => allRuns().map((r) => `${r.runId}:${r.status}:${r.seq}`).join('|'));
  return runs ? allRuns().filter((r) => !TERMINAL_STATUSES.includes(r.status)) : [];
}

/** “today at 14:00”, “tomorrow at 11:00”, “on Monday at 09:00”. */
const relDay = (iso: string, now: Date, timeZone: string) => {
  const d = (x: Date) => x.toLocaleDateString('en-CA', { timeZone });
  const t = new Date(iso); const diff = Math.round((Date.parse(d(t)) - Date.parse(d(now))) / 864e5);
  const hm = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone });
  return diff === 0 ? `today at ${hm}` : diff === 1 ? `tomorrow at ${hm}` : `on ${t.toLocaleDateString('en-GB', { weekday: 'long', timeZone })} at ${hm}`;
};
const nameOf = (w: World, pid: string) => w.people.find((p) => p.personId === pid)?.name ?? 'a candidate';
const first = (w: World, pid: string) => nameOf(w, pid).split(' ')[0];

export function QHome() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const org = a.orgId!;
  const now = simNow(w);
  const tz = { timeZone: a.timezone } as const;
  const active = useActiveRuns();
  const sourcingId = useNamedRun('sourcing');
  const sourcing = useRun(sourcingId, w.network);

  // Needs you: drafts waiting for a yes, people waiting on a reply, reschedule requests, open disputes.
  const threads = w.threads.filter((t) => t.orgId === org);
  const drafts = threads.flatMap((t) => t.messages.filter((m) => m.status === 'AWAITING_APPROVAL' || m.status === 'DRAFT').map((m) => ({ t, m })));
  const waiting = threads.filter((t) => t.messages.at(-1)?.status === 'RECEIVED');
  const resched = w.calendar.filter((e) => e.orgId === org && e.status === 'RESCHEDULE_REQUESTED');
  const disputes = w.interviews.filter((i) => i.orgId === org && i.disputed?.state === 'OPEN');
  const needs = [
    ...drafts.map(({ t, m }) => {
      const who = m.from === a.id ? 'Your' : `${w.actors.find((x) => x.id === m.from)?.first ?? 'A colleague'}’s`;
      const kind = /interview/i.test(m.subject ?? '') ? 'interview invitation' : 'message';
      return { k: `d-${m.id}`, text: `${who} ${kind} to ${first(w, t.personId)} is waiting for approval. Nothing is sent until someone says yes.`, to: '/r/messages', cta: 'Review' };
    }),
    ...waiting.map((t) => ({ k: `w-${t.id}`, text: `${first(w, t.personId)} replied and is waiting on Kora.`, to: '/r/messages', cta: 'Reply' })),
    ...resched.map((e) => ({ k: `r-${e.id}`, text: `${e.personId ? first(w, e.personId) : 'A candidate'} asked to move their interview.`, to: '/r/calendar', cta: 'Find a time' })),
    ...disputes.map((i) => ({ k: `x-${i.id}`, text: `${first(w, i.personId)} disputed an assessment. It’s left out of comparisons until it’s reviewed.`, to: `/r/interviews/${i.id}`, cta: 'Open' })),
    // Evidence-first (J12): from the authoritative reuse decisions and interest checks, for people still visible.
    ...proof(w).reuse.filter((d) => d.orgId === org && d.state === 'SUBMITTED' && canSeeCandidate(w, d.personId, org)).map((d) => ({ k: `s-${d.id}`, text: `${candName(w, d.personId)} sent the ${shortLabel(w, d.reqId)} sample (simulated). It counts once someone reviews it.`, to: `/r/people/${d.personId}`, cta: 'Review' })),
    ...proof(w).interest.filter((i) => i.orgId === org && i.state === 'REQUESTED' && canSeeCandidate(w, i.personId, org)).map((i) => ({ k: `i-${i.personId}`, text: `${candName(w, i.personId)} hasn’t said yet whether they’re interested (asked ${new Date(i.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}). Pending isn’t a no.`, to: `/r/people/${i.personId}`, cta: 'Open' })),
  ];

  // Interviews only: personal busy blocks belong on the calendar, not on Today.
  const upcoming = w.calendar.filter((e) => e.orgId === org && !!e.personId && e.status !== 'CANCELLED' && new Date(e.start) > now).sort((x, y) => x.start.localeCompare(y.start)).slice(0, 4);

  // Roles: the original Senior Backend brief plus the organisation's other mandates, with stage counts.
  const roles = [
    ...(w.mandate.status !== 'DRAFT' || w.pipeline.some((p) => p.mandateId === w.mandate.mandateId) ? [{ id: w.mandate.mandateId, title: w.mandate.title, to: '/r/compare' }] : []),
    ...w.mandates.filter((m) => m.orgId === org && !['FILLED', 'CLOSED'].includes(m.status)).map((m) => ({ id: m.id, title: m.title, to: '/r/pipeline' })),
  ].map((r) => {
    const people = w.pipeline.filter((p) => p.mandateId === r.id && STAGES.includes(p.stage));
    const counts = STAGES.map((s) => ({ s, n: people.filter((p) => p.stage === s).length })).filter((x) => x.n);
    return { ...r, total: people.length, counts };
  }).filter((r) => r.total);

  const recent = eventsFor(w, a.id).filter((e) => e.scope.startsWith(`ORG:${org}`) || e.scope.startsWith(`SHARED:${org}:`)).slice(-6).reverse();

  const qLine = needs.length
    ? `${needs.length === 1 ? 'One thing needs' : `${needs.length} things need`} you today${upcoming[0] ? `, and the next interview is ${relDay(upcoming[0].start, now, a.timezone)}` : ''}.`
    : active.length ? 'I’m working on your search. Nothing needs you yet.'
    : w.mandate.status === 'DRAFT' && !roles.length ? 'Tell me who you need, in your own words, and I’ll draft the brief.'
    : 'You’re clear for now. I’ll tell you when anything needs you.';
  const hour = Number(now.toLocaleString('en-GB', { hour: '2-digit', hour12: false, ...tz }));

  return (
    <Canvas title={`${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${a.first}`} kicker={`${w.orgs.find((o) => o.id === org)?.name ?? ''} · ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', ...tz })}`} open onClose={() => {}}>
      <div className="rh">
        <motion.div className="ch-q" {...arrive}><QMark mood={active.length ? 'working' : needs.length ? 'waiting' : 'idle'} size={28} /><p className="voice">{qLine}</p></motion.div>

        {org === 'org_kora' && w.pipeline.some((p) => p.mandateId === 'm_backend') && (
          <section className="ds-sheet evr-task" aria-labelledby="rh-t">
            <div><h2 id="rh-t" className="rh-h" style={{ margin: 0 }}>Ask Q to look</h2><p className="t14 muted">People whose shared work shows more than their CV says, for {w.mandate.title}. Q reads only what people shared with you.</p></div>
            <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Investigate surprising fits', act: { t: 'say', text: 'investigate surprising fits for the senior backend role' } })}>Investigate surprising fits</button>
          </section>
        )}

        <div className="rh-cols">
          <section className="ds-sheet rh-needs" aria-labelledby="rh-n">
            <h2 id="rh-n" className="rh-h">Needs you <span className="num">{needs.length}</span></h2>
            {needs.length === 0 ? <p className="muted">Nothing is waiting on you. When Q or a colleague needs a yes, it shows here first.</p> : (
              <ul className="rh-list">{needs.map((n) => <li key={n.k}><span>{n.text}</span><Link className="ds-btn" to={n.to}>{n.cta}</Link></li>)}</ul>
            )}
          </section>
          <section className="ds-sheet" aria-labelledby="rh-c">
            <h2 id="rh-c" className="rh-h">Coming up</h2>
            {upcoming.length === 0 ? <p className="muted">No interviews booked. Ask Q to find a time with anyone on a shortlist.</p> : (
              <ol className="rh-time">{upcoming.map((e) => (
                <li key={e.id}>
                  <time dateTime={e.start}><b>{new Date(e.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', ...tz })}</b><span>{new Date(e.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...tz })}</span></time>
                  <span>{e.personId ? `${nameOf(w, e.personId)}` : e.title}<span className="t14 muted"> · {e.status === 'HOLD' ? 'held, not sent' : e.status === 'INVITED' ? 'invited' : e.status === 'CONFIRMED' ? 'confirmed' : 'asked to move'}</span></span>
                </li>
              ))}</ol>
            )}
          </section>
        </div>

        {(active.length > 0 || (sourcingId && sourcing.steps.length > 0 && !sourcing.completed)) && (
          <section className="ds-sheet" aria-labelledby="rh-w">
            <h2 id="rh-w" className="rh-h">Q is working on</h2>
            {sourcingId && !sourcing.completed && sourcing.steps.length > 0 ? <div className="ds-legacy" style={{ display: 'grid', gap: 8 }}><Link to="/r/sourcing">{sourcing.title || 'Search'}</Link><RunSteps steps={sourcing.steps} /></div>
              : <p className="muted">{active.length} task{active.length === 1 ? '' : 's'} running. <Link to="/r/plan">See plans and agents</Link></p>}
          </section>
        )}

        <section className="ds-sheet" aria-labelledby="rh-r">
          <h2 id="rh-r" className="rh-h">Your roles</h2>
          {roles.length === 0 ? <p className="muted">No open roles yet. Tell Q who you need and it will draft a brief for you to approve.</p> : (
            <ul className="rh-roles">{roles.map((r) => (
              <li key={r.id}>
                <div className="rh-role-top"><Link to={r.to}><b>{r.title}</b></Link><span className="t14 muted">{r.total} {r.total === 1 ? 'person' : 'people'}</span></div>
                <div className="rh-strip" role="img" aria-label={r.counts.map((c) => `${c.n} ${STAGE_LABEL[c.s as Stage]}`).join(', ')}>
                  {r.counts.map((c) => <span key={c.s} style={{ flexGrow: c.n }} data-s={c.s}><b>{c.n}</b> {STAGE_LABEL[c.s as Stage]}</span>)}
                </div>
              </li>
            ))}</ul>
          )}
        </section>

        <section aria-labelledby="rh-a" className="rh-recent">
          <h2 id="rh-a" className="lab">Recently</h2>
          {recent.length === 0 ? <p className="muted t14">Q’s actions and your team’s approvals appear here, newest first, with who did what.</p> : (
            <ul>{recent.map((e) => <li key={e.id}><time className="num">{new Date(e.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...tz })}</time><span>{e.text}</span></li>)}</ul>
          )}
          <Link to="/r/audit" className="ch-link">Full activity log</Link>
        </section>
      </div>
    </Canvas>
  );
}
