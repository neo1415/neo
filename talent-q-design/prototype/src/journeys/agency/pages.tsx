// Agency pages (R4). Every page shows ONE client at a time (the client in focus), except the agency home and
// the agents monitor, which show each client in its own separate section and never mix candidates.
// Q does the work: each page offers "say it to Q" shortcuts, and every button goes through Q's ops so the
// conversation records what happened.
// Navigation (design pass): the rail holds the top destinations; the page shows only the client lens (which
// client's records you are looking at) and, inside the Clients and Talent pools sections, their own
// secondary tabs. Privacy: people Talentbridge may not see are counted, never named (canSeeCandidate).
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { actorOf, update, useWorld, type World } from '../../mock/world';
import type { Actor, MandateX, QAction } from '../../state/domain';
import { STAGE_LABEL } from '../../state/domain';
import { Canvas } from '../../ds/Workspace';
import { Glyph, GLYPH_LABEL, type GlyphKind } from '../../ds/Glyph';
import { QMark, type QAgent } from '../../ds/QMark';
import { DUR, EASE, arrive } from '../../ds/motion';
import { Link, navigate } from '../../ui/router';
import { runAction, sendToQ, useViewState } from '../../q/core/engine';
import { agency, type AgentRun, type ClientId, type FitMark, type Pool, type Report, type ReportSection } from '../../state/areas/agency';
import {
  AP, lc, agencyMandates, briefSigned, campaignsFor, canAct, canSeeMandate, clientIds, clientName, clientShort, consentReason, consentState, deniedReason, docsFor, fitOf, fmtDay, focusOf, isolationCheck, isWithdrawn,
  allowed, mandateHidden, mandateOf, mandatePeople, messageFor, mustHavesShown, notesFor, peopleFor, personName, pipelineFor, poolsFor, PRIORITY, ranked, removedMembers, runsFor, searchesFor, setFocus, submittalsFor, today, hiddenMembers,
  phaseOf, PHASE_LABEL, PHASE_ORDER, UNIT, SLOTS, type RunPhase } from './model';
import { needsYou } from '../../q/skills/agency';

const doOp = (op: string, args: Record<string, unknown> = {}, label = op) => void runAction({ label, act: { t: 'do', op, args } });
const ask = (text: string) => void sendToQ(text);
const workMode = (m: MandateX) => (m.workMode === 'ONSITE' ? 'On-site' : m.workMode === 'REMOTE' ? 'Remote only' : 'Hybrid');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function useAg() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  return { w, a, A: agency(w), focus: focusOf(w, a.id) };
}

// ---------------- Client identity: one mark per client, by shape and letters (never colour alone) ----------------
const initials = (w: World, c: ClientId) => clientName(w, c).split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
export function ClientMark({ w, c, size = 28 }: { w: World; c: ClientId; size?: number }) {
  return <span className="agency-mark" data-shape={clientIds(w).indexOf(c) % 2 ? 'round' : 'square'} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden="true">{initials(w, c)}</span>;
}

// The client lens: which client's records this page shows. Switching is the only way to see another client.
export function ClientSwitch({ w, a, focus }: { w: World; a: Actor; focus: ClientId }) {
  const others = clientIds(w).filter((c) => c !== focus).map((c) => clientName(w, c));
  return (
    <div className="agency-lens" role="group" aria-label="Client workspace">
      <span className="lab">Client workspace</span>
      <div className="agency-lens-opts">
        {clientIds(w).map((c) => (
          <button key={c} type="button" className="agency-lens-opt" aria-pressed={focus === c} onClick={() => update((d) => setFocus(d, a.id, c))}>
            <ClientMark w={w} c={c} size={26} /><span>{clientName(w, c)}</span>
          </button>
        ))}
      </div>
      <p className="agency-lens-note" aria-live="polite">Showing {clientName(w, focus)} only. {others.join(' and ')}’s records stay out of this view.</p>
    </div>
  );
}

// Secondary tabs, only in sections that have secondary pages.
type Section = 'clients' | 'pools';
const SECTION_TABS: Record<Section, [string, string][]> = {
  clients: [[AP.clients, 'Mandates'], [AP.notes, 'Team notes'], [AP.docs, 'Documents']],
  pools: [[AP.pools, 'Pools'], [AP.searches, 'Saved searches'], [AP.compare, 'Compare']],
};
function SectionTabs({ section, here }: { section: Section; here: string }) {
  return (
    <nav className="agency-tabs" aria-label={section === 'clients' ? 'Client pages' : 'Talent pool pages'}>
      {SECTION_TABS[section].map(([to, l]) => <Link key={to} to={to} current={here === to}>{l}</Link>)}
    </nav>
  );
}

function ViewAs({ w, a }: { w: World; a: Actor }) {
  const staff = w.actors.filter((x) => x.orgId === 'org_tb');
  return (
    <div className="agency-viewas" role="group" aria-label="Demo: view as a colleague">
      {staff.map((s) => <button key={s.id} type="button" className="ds-filter" aria-pressed={a.id === s.id} onClick={() => update((d) => { d.session.actor = s.id; })}>{s.first} · {s.role === 'VIEWER' ? 'Viewer' : s.role === 'OWNER' ? 'Owner' : s.role?.toLowerCase()}</button>)}
    </div>
  );
}
function Frame({ title, kicker, here, section, children, lens = true, aside }: { title: string; kicker: string; here: string; section?: Section; children: ReactNode; lens?: boolean; aside?: ReactNode }) {
  const { w, a, focus } = useAg();
  return (
    <Canvas title={title} kicker={kicker} open onClose={() => navigate('/r/home')} aside={aside ? <div className="agency-aside">{aside}</div> : undefined}>
      {lens && <ClientSwitch w={w} a={a} focus={focus} />}
      {section && <SectionTabs section={section} here={here} />}
      {children}
      {/* Demo-only identity switch, kept out of the product header. */}
      <section className="agency-demo" aria-label="Demo controls"><span className="lab">Demo · view as</span><ViewAs w={w} a={a} /></section>
    </Canvas>
  );
}
function Say({ items }: { items: string[] }) {
  return (
    <div className="agency-say" role="group" aria-label="Try saying to Q">
      <span className="lab">Try saying to Q</span>
      {items.map((t) => <button key={t} type="button" className="ds-chip agency-saychip" onClick={() => ask(t)}>“{t}”</button>)}
    </div>
  );
}
/** Designed empty state: what is missing, why, and the next step. */
function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="agency-empty" role="status"><b>{title}</b>{children && <p>{children}</p>}{action}</div>;
}
const Lock = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>;
/** People hidden by their own privacy settings: a count and the reason, never a name. */
function HiddenNote({ n, what = 'in this pool' }: { n: number; what?: string }) {
  if (!n) return null;
  return (
    <p className="agency-hidden" role="note"><Lock /><span><b>{n === 1 ? '1 more person' : `${n} more people`} {what} {n === 1 ? 'isn’t' : 'aren’t'} shown.</b> Their privacy settings don’t allow agencies to find them, and they haven’t registered with Talentbridge. Talent Q doesn’t say who.</span></p>
  );
}
/** Simple progress bar (uploads). Width follows real progress (MO-016), animated with the motion tokens. */
const Bar = ({ done, total, label }: { done: number; total: number; label: string }) => (
  <div className="agency-meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={`${done} of ${total}`}>
    <motion.i className="fill" initial={false} animate={{ width: `${total ? (done / total) * 100 : 0}%` }} transition={{ duration: DUR.slow, ease: 'linear' }} />
  </div>
);
const consentTag = (w: World, pid: string, client: ClientId) => {
  const s = consentState(w, pid, client);
  return s === 'OK' ? <span className="ds-tag" data-k="ok">Consent to {clientShort(w, client)}</span> : s === 'WITHDRAWN' ? <span className="ds-tag" data-k="risk">Consent withdrawn</span> : <span className="ds-tag" data-k="warn">Consent not asked</span>;
};
const glyphOf = (m: FitMark): GlyphKind => (m === 'verified' ? 'verified' : m === 'full' ? 'full' : m === 'partial' ? 'partial' : 'none');
/** Must-haves with evidence, as pips plus words (a small meter; the words carry the meaning). */
function Pips({ shown, of }: { shown: number; of: number }) {
  return (
    <span className="agency-pips">
      <span aria-hidden="true">{Array.from({ length: of }, (_, i) => <i key={i} data-on={i < shown ? '1' : undefined} />)}</span>
      <span className="t14">Evidence for {shown} of {of} must-haves</span>
    </span>
  );
}

// ---------------- Agent monitoring: phase icon + word, truthful progress, one obvious next action ----------------
function PhaseIcon({ p }: { p: RunPhase }) {
  const c = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, 'aria-hidden': true };
  switch (p) {
    case 'running': return <svg {...c} className="spin"><circle cx="8" cy="8" r="6" opacity=".25" /><path d="M8 2a6 6 0 0 1 6 6" /></svg>;
    case 'retrying': return <svg {...c} className="spin"><path d="M13.5 8A5.5 5.5 0 1 1 11 3.4" /><path d="M11.5 1v3h-3" /></svg>;
    case 'waiting': return <svg {...c}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.2 1.4" /></svg>;
    case 'failed': return <svg {...c}><circle cx="8" cy="8" r="6" /><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" /></svg>;
    case 'paused': return <svg {...c}><circle cx="8" cy="8" r="6" /><path d="M6.5 5.5v5M9.5 5.5v5" /></svg>;
    case 'interrupted': return <svg {...c}><circle cx="8" cy="8" r="6" strokeDasharray="2.4 2" /><path d="M6.5 5.5v5M9.5 5.5v5" /></svg>;
    case 'done': return <svg {...c}><circle cx="8" cy="8" r="6" /><path d="M5.3 8.2l1.9 1.9 3.6-3.8" /></svg>;
    default: return <svg {...c}><circle cx="8" cy="8" r="6" /><path d="M4 12l8-8" /></svg>;
  }
}
const PhaseTag = ({ p }: { p: RunPhase }) => <span className="agency-phase" data-phase={p}><PhaseIcon p={p} />{PHASE_LABEL[p]}</span>;

function Meter({ r }: { r: AgentRun }) {
  const p = phaseOf(r); const pct = (n: number) => `${r.total ? Math.min(100, (n / r.total) * 100) : 0}%`;
  return (
    <div className="agency-meter" data-phase={p} role="progressbar" aria-label={`${r.label}: ${PHASE_LABEL[p].toLowerCase()}`} aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.done} aria-valuetext={`${r.done} of ${r.total} ${UNIT[r.kind]}`}>
      {/* The fill moves only when a unit of work finishes (MO-009): 300 ms, linear, as progress should. */}
      <motion.i className="fill" initial={false} animate={{ width: pct(r.done) }} transition={{ duration: DUR.slow, ease: 'linear' }}>{p === 'running' && <span className="edge" />}</motion.i>
      {/* Retrying: the remaining track shimmers while Q waits for the provider (MO-036); static under reduced motion. */}
      {p === 'retrying' && <i className="seek" style={{ left: pct(r.done) }} />}
      {r.resumedFrom != null && r.resumedFrom > 0 && r.resumedFrom < r.total && <i className="mark" data-k="resume" style={{ left: pct(r.resumedFrom) }} title={`Resumed at ${r.resumedFrom}`} />}
      {r.failedAt != null && r.failedAt < r.total && <i className="mark" data-k="fail" style={{ left: pct(r.failedAt) }} title={`Provider failed at ${r.failedAt}`} />}
    </div>
  );
}
/** The live count: a brief fade when a unit finishes, so the change is noticed without a distraction. */
const Count = ({ r }: { r: AgentRun }) => (
  <span className="num agency-count"><motion.b key={r.done} initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} transition={{ duration: DUR.normal, ease: EASE.enter }}>{r.done}</motion.b> of {r.total} {UNIT[r.kind]}</span>
);

function AgentSummary({ runs }: { runs: AgentRun[] }) {
  const busy = runs.filter((r) => r.state === 'RUNNING' || r.state === 'RETRYING').length;
  const counts = PHASE_ORDER.filter((p) => p !== 'done' && p !== 'cancelled').map((p) => [p, runs.filter((r) => phaseOf(r) === p).length] as const).filter(([, n]) => n);
  const finished = runs.filter((r) => r.state === 'DONE').length;
  return (
    <div className="agency-sum">
      <div className="agency-slots" role="img" aria-label={`${Math.min(busy, SLOTS)} of ${SLOTS} agent slots in use`}>
        <span aria-hidden="true">{Array.from({ length: SLOTS }, (_, i) => <i key={i} data-on={i < busy ? '1' : undefined} />)}</span>
        <span className="t14"><b>{Math.min(busy, SLOTS)} of {SLOTS}</b> slots in use</span>
      </div>
      <ul className="agency-counts" aria-label="Agents by state">
        {counts.map(([p, n]) => <li key={p} data-phase={p}><PhaseIcon p={p} /><b className="num">{n}</b> {PHASE_LABEL[p].toLowerCase()}</li>)}
        {finished > 0 && <li data-phase="done"><PhaseIcon p="done" /><b className="num">{finished}</b> finished</li>}
      </ul>
    </div>
  );
}

function RunRow({ w, a, r, compact = false }: { w: World; a: Actor; r: AgentRun; compact?: boolean }) {
  const [log, setLog] = useState(false);
  const [more, setMore] = useState(false);
  const act = canAct(a); const p = phaseOf(r); const live = !['DONE', 'CANCELLED'].includes(r.state);
  const btn = (label: string, op: string, args: Record<string, unknown> = {}, primary = false) => <button type="button" className={`ds-btn ${primary ? 'primary' : ''}`} onClick={() => doOp(op, { id: r.id, ...args }, label)}>{label}</button>;
  const provider = `${r.provider}${r.providerState === 'DOWN' ? ' · not responding' : r.providerState === 'RECOVERED' ? ' · recovered' : r.providerState === 'SKIPPED' ? ' · skipped' : ''}`;
  return (
    <motion.article layout="position" transition={{ duration: DUR.normal, ease: EASE.standard }} className="agency-run" data-phase={p} aria-labelledby={`run-${r.id}`}>
      <div className="agency-run-head">
        <PhaseTag p={p} />
        <div className="agency-run-title">
          <h3 id={`run-${r.id}`}>{compact && <><b>{clientShort(w, r.clientOrgId)}</b> · </>}{r.label}</h3>
          {!compact && <p className="t14 muted">{r.kind === 'SEARCH' ? 'Sourcing agent' : r.kind === 'EVIDENCE' ? 'Evidence agent' : 'Campaign sender'} · {provider}{r.attempts > 1 ? ` · attempt ${r.attempts}` : ''}</p>}
        </div>
        {r.priority !== 2 && <span className="ds-tag" data-k={r.priority === 1 ? 'busy' : undefined}>{PRIORITY[r.priority]}</span>}
      </div>
      <div className="agency-run-prog"><Meter r={r} /><Count r={r} /></div>
      {!compact && <>
        {p === 'failed' && <div className="ds-banner agency-run-banner" data-k="risk" role="alert"><PhaseIcon p="failed" /><span><b>{r.provider} isn’t responding.</b> {r.done} finished units are kept. {r.retryInTicks ? 'Q will retry once automatically.' : 'Q retried once automatically; it’s still down.'} Other agents are unaffected.</span><span /></div>}
        {(p === 'paused' || p === 'interrupted') && r.pausedReason && <p className="t14 agency-run-why" role="status"><b>{p === 'interrupted' ? 'Interrupted.' : 'Paused.'}</b> {r.pausedReason}</p>}
        {r.resumedFrom != null && live && p !== 'paused' && <p className="t14 muted agency-run-why">Resumed at {r.resumedFrom} of {r.total}. No finished work is repeated.</p>}
        {r.found.length > 0 && <p className="t14 agency-run-why"><b>New matches:</b> {r.found.map((x) => personName(w, x)).join(', ')}</p>}
        <div className="ds-actions agency-run-actions">
          {act && (r.state === 'RUNNING' || r.state === 'QUEUED' || r.state === 'RETRYING') && btn('Pause', 'agency.run.pause')}
          {act && r.state === 'PAUSED' && btn('Resume', 'agency.run.resume', {}, true)}
          {act && r.state === 'FAILED' && <>{btn('Retry now', 'agency.run.retry', {}, true)}{btn(`Skip ${r.provider}`, 'agency.run.skip')}</>}
          {act && live && <button type="button" className="ds-btn quiet" aria-expanded={more} onClick={() => setMore(!more)} aria-label={`${more ? 'Fewer' : 'More'} options for ${r.label}`}>{more ? 'Fewer options' : 'More options'}</button>}
          <button type="button" className="ds-btn quiet" aria-expanded={log} onClick={() => setLog(!log)}>{log ? 'Hide activity' : 'Activity'}</button>
        </div>
        {more && act && live && (
          <motion.div className="ds-actions agency-run-more" {...arrive}>
            {r.priority > 1 && btn('Make urgent', 'agency.run.priority', { p: 1 })}
            {r.priority < 3 && btn('Lower priority', 'agency.run.priority', { p: 3 })}
            <button type="button" className="ds-btn quiet" onClick={() => { if (confirm(`Cancel ${r.label}? Finished work is kept, but it can’t be resumed.`)) doOp('agency.run.cancel', { id: r.id }, 'Cancel'); }}>Cancel this agent</button>
          </motion.div>
        )}
        {log && <ol className="agency-log" aria-label={`${r.label} activity`}>{r.log.slice(-8).map((l, i) => <li key={i} data-k={l.k}>{l.text}</li>)}</ol>}
      </>}
    </motion.article>
  );
}
const byPhase = (x: AgentRun, y: AgentRun) => PHASE_ORDER.indexOf(phaseOf(x)) - PHASE_ORDER.indexOf(phaseOf(y)) || x.priority - y.priority;

// ---------------- Home ----------------
export function AgencyHome() {
  const { w, a, A } = useAg();
  const items = needsYou(w, a);
  const running = A.runs.filter((r) => r.state === 'RUNNING');
  const active = A.runs.filter((r) => !['DONE', 'CANCELLED'].includes(r.state)).sort(byPhase);
  const agents: QAgent[] = running.map((r) => ({ label: `${clientShort(w, r.clientOrgId)} ${r.label}`, done: r.done, total: r.total }));
  return (
    <Frame title={`${running.length} ${running.length === 1 ? 'agent' : 'agents'} working · ${items.length} ${items.length === 1 ? 'thing needs' : 'things need'} you`} kicker={`Talentbridge · ${a.first}’s agency home`} here="/r/home" lens={false}>
      <section className="ds-sheet agency-needs" aria-labelledby="ag-needs">
        <h2 id="ag-needs" className="voice t24">{a.role === 'VIEWER' ? 'For you' : 'Needs you'}</h2>
        {items.length ? <ul className="agency-list">{items.map((i) => (
          <li key={i.text}><span>{i.text}</span><button type="button" className="ds-btn" onClick={() => void runAction(i.action)}>{i.action.label}</button></li>
        ))}</ul> : <Empty title="Nothing is waiting on you.">Q will tell you here when something changes.</Empty>}
      </section>
      <div className="agency-grid">
        {clientIds(w).map((c) => {
          const ms = agencyMandates(w, c); const visible = ms.filter((m) => canSeeMandate(w, a, m));
          const rs = runsFor(w, c); const failed = rs.filter((r) => r.state === 'FAILED').length; const paused = rs.filter((r) => r.state === 'PAUSED').length;
          return (
            <section key={c} className="ds-sheet agency-client" aria-labelledby={`cl-${c}`}>
              <div className="agency-client-head"><ClientMark w={w} c={c} size={36} /><h2 id={`cl-${c}`} className="voice t24">{clientName(w, c)}</h2><span className="ds-tag">{w.orgs.find((o) => o.id === c)?.industry}</span></div>
              <ul className="agency-inline-facts">
                <li><b className="num">{ms.length}</b>{ms.length === 1 ? 'mandate' : 'mandates'}</li>
                <li><b className="num">{poolsFor(w, c).length}</b>{poolsFor(w, c).length === 1 ? 'pool' : 'pools'}</li>
                <li><b className="num">{rs.filter((r) => r.state === 'RUNNING').length}</b>{rs.filter((r) => r.state === 'RUNNING').length === 1 ? 'agent running' : 'agents running'}</li>
              </ul>
              {(failed > 0 || paused > 0) && <p className="agency-client-flags">{failed > 0 && <PhaseTag p="failed" />}{paused > 0 && <span className="agency-phase" data-phase="paused"><PhaseIcon p="paused" />{paused} paused</span>}</p>}
              <ul className="agency-mandates">
                {visible.map((m) => <li key={m.id}><Link to={AP.mandate(m.id)} onClick={() => update((d) => setFocus(d, a.id, c))}>{m.title}</Link><span className="t14 muted">{workMode(m)} · {plural(mandatePeople(w, m.id).filter((p) => !isWithdrawn(w, p.personId)).length, 'person', 'people')}{m.confidential ? ' · confidential' : ''}</span></li>)}
                {ms.length > visible.length && <li><span className="t14 muted"><Lock /> {ms.length - visible.length} confidential mandate hidden for your role</span></li>}
              </ul>
              <Link className="ds-btn" to={AP.client(c)} onClick={() => update((d) => setFocus(d, a.id, c))}>Open {clientShort(w, c)}</Link>
            </section>
          );
        })}
      </div>
      <section className="ds-sheet agency-home-agents" aria-labelledby="ag-agents">
        <div className="agency-row"><h2 id="ag-agents" className="voice t24">Agents</h2><QMark mood={running.length ? 'working' : 'idle'} agents={agents} size={36} title={`${running.length} agents running`} /></div>
        <AgentSummary runs={A.runs} />
        {active.length ? <div className="agency-runlist">{active.map((r) => <RunRow key={r.id} w={w} a={a} r={r} compact />)}</div> : <Empty title="No agents are working right now.">Ask Q to run a saved search or launch a campaign.</Empty>}
        <Link className="ds-btn" to={AP.agents}>Monitor agents</Link>
      </section>
      <Say items={['run the kora backend search again and tell me whats new', 'put the top 5 from the payments pool in front of kora', 'stop the medlink search, kora is urgent']} />
    </Frame>
  );
}

// ---------------- Clients and mandates (one client in focus) ----------------
export function Clients({ id }: { id?: string } = {}) {
  const { w, a, focus } = useAg();
  useEffect(() => { if (id && focus !== id && clientIds(w).includes(id)) update((d) => setFocus(d, a.id, id)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (id && !clientIds(w).includes(id)) return <Frame title="Not one of your clients" kicker="Agency" here={AP.clients} lens={false}><Empty title="Talentbridge doesn’t recruit for this organisation." action={<Link className="ds-btn" to={AP.clients}>Back to your clients</Link>}>There’s nothing to show.</Empty></Frame>;
  const c = id ?? focus;
  const ms = agencyMandates(w, c);
  const people = pipelineFor(w, c).filter((p) => !isWithdrawn(w, p.personId));
  return (
    <Frame title={`${clientName(w, c)}: ${plural(ms.length, 'open mandate')}`} kicker="Clients and mandates" here={AP.clients} section="clients">
      <MandateList w={w} a={a} ms={ms} />
      <section className="ds-sheet" aria-labelledby="cl-quick"><h2 id="cl-quick" className="voice t24">{clientShort(w, c)} at a glance</h2>
        <ul className="agency-list">
          <li><span>{plural(new Set(people.map((p) => p.personId)).size, 'person', 'people')} in progress</span></li>
          <li><span>{plural(poolsFor(w, c).length, 'talent pool')}, {plural(searchesFor(w, c).length, 'saved search', 'saved searches')}</span><Link className="ds-btn" to={AP.pools}>Talent pools</Link></li>
          <li><span>{plural(submittalsFor(w, c).length, 'submittal')}</span><Link className="ds-btn" to={AP.submittals}>Submittals</Link></li>
        </ul>
      </section>
      <Say items={[`who is in the ${clientShort(w, c).toLowerCase()} pipeline`, 'any conflicts between clients?']} />
    </Frame>
  );
}
function MandateList({ w, a, ms }: { w: World; a: Actor; ms: MandateX[] }) {
  if (!ms.length) return <Empty title="No mandates for this client yet.">Tell Q about the role and it will draft one.</Empty>;
  return (
    <div className="agency-grid">
      {ms.map((m) => {
        const ok = canSeeMandate(w, a, m);
        const ppl = mandatePeople(w, m.id).filter((p) => !isWithdrawn(w, p.personId));
        return (
          <article key={m.id} className="ds-sheet agency-card" aria-labelledby={`m-${m.id}`}>
            <div className="agency-row"><h2 id={`m-${m.id}`} className="t19">{m.title}</h2>{m.confidential && <span className="ds-tag" data-k="warn">Confidential</span>}</div>
            {ok ? <>
              <p className="t14 muted">{m.plain}</p>
              <p className="t14"><b>{workMode(m)}</b> · {m.location} · {plural(ppl.length, 'person', 'people')}</p>
            </> : <p className="t14"><Lock /> Details hidden: you don’t have access to this confidential record.</p>}
            <Link className="ds-btn" to={AP.mandate(m.id)}>{ok ? 'Open mandate' : 'Why can’t I see this?'}</Link>
          </article>
        );
      })}
    </div>
  );
}
export function MandatePage({ id }: { id: string }) {
  const { w, a, A } = useAg();
  const m = mandateOf(w, id);
  if (!m || !m.clientOrgId || !clientIds(w).includes(m.clientOrgId)) return <Frame title="Mandate not found" kicker="Clients and mandates" here="" lens={false}><Empty title="This mandate doesn’t exist or isn’t one of Talentbridge’s." action={<Link className="ds-btn" to={AP.clients}>Back to clients</Link>} /></Frame>;
  if (!canSeeMandate(w, a, m)) {
    const req = A.access.find((r) => r.actorId === a.id && r.recordId === m.id);
    return (
      <Frame title="You don’t have access to this record" kicker={`${clientName(w, m.clientOrgId)} · mandate`} here="" lens={false}>
        <div className="ds-banner" data-k="risk" role="alert"><Glyph k="none" /><span><b>Permission denied.</b> {deniedReason(w, a, m)}</span><span /></div>
        <section className="ds-sheet agency-stack">
          <p>You can still use {clientShort(w, m.clientOrgId)}’s pools and saved searches. If you need this record for research, ask Dele. You’ll only see it if he agrees, and the request is logged.</p>
          {req?.state === 'PENDING' ? <p className="ds-tag" data-k="busy" role="status">Access requested {fmtDay(req.at)} · waiting for Dele</p>
            : req?.state === 'DECLINED' ? <p className="ds-tag" data-k="risk" role="status">Dele declined this request</p>
              : <button type="button" className="ds-btn primary" onClick={() => doOp('agency.access.request', { id: m.id }, 'Request access')}>Request access from Dele</button>}
          <Link to={AP.pools} className="ds-btn">Go to {clientShort(w, m.clientOrgId)}’s pools</Link>
        </section>
      </Frame>
    );
  }
  const ppl = mandatePeople(w, m.id); const hidden = mandateHidden(w, m.id);
  return (
    <Frame title={m.title} kicker={`${clientName(w, m.clientOrgId)} · mandate v${m.versions.length}`} here="" lens={false}
      aside={<><ClientMark w={w} c={m.clientOrgId} size={32} />{m.confidential && <span className="ds-tag" data-k="warn">Confidential</span>}</>}>
      {m.confidential && <div className="ds-banner" data-k="warn" role="note"><Glyph k="partial" /><span><b>Confidential.</b> {clientShort(w, m.clientOrgId)} asked that this hire isn’t discussed outside Talentbridge. Viewers need Dele’s permission to see it.</span><span /></div>}
      <section className="ds-sheet agency-stack">
        <p>{m.plain}. <b>{workMode(m)}</b>, {m.location}. ₦{(m.pay.min / 1e6).toFixed(1)}m–₦{(m.pay.max / 1e6).toFixed(1)}m a month.</p>
        <ul className="agency-reqs">{m.requirements.map((r) => <li key={r.reqId}><span className="ds-tag" data-k={r.mustHave ? undefined : 'muted'}>{r.mustHave ? 'Must have' : 'Nice to have'}</span><span><b>{r.label}</b>: {r.plain}</span></li>)}</ul>
      </section>
      <section className="ds-sheet" aria-labelledby="md-pipe"><h2 id="md-pipe" className="voice t24">People ({ppl.filter((p) => !isWithdrawn(w, p.personId)).length})</h2>
        {ppl.length ? <ul className="agency-list">{ppl.map((p) => <li key={p.personId} data-out={isWithdrawn(w, p.personId) ? '1' : undefined}><span><b>{personName(w, p.personId)}</b> · {isWithdrawn(w, p.personId) ? 'Removed: withdrew consent' : STAGE_LABEL[p.stage]}{p.note ? ` · ${p.note}` : ''}</span>{consentTag(w, p.personId, m.clientOrgId!)}</li>)}</ul>
          : <Empty title="No one on this mandate yet.">Ask Q to run its saved search.</Empty>}
        <HiddenNote n={hidden} what="on this mandate" />
      </section>
    </Frame>
  );
}

// ---------------- Pools ----------------
export function Pools() {
  const { w, a, focus } = useAg();
  const pools = poolsFor(w, focus);
  const n = pools.reduce((s, p) => s + ranked(w, p).length, 0);
  return (
    <Frame title={`${clientShort(w, focus)}: ${plural(n, 'person', 'people')} in ${plural(pools.length, 'pool')}`} kicker="Talent pools" here={AP.pools} section="pools">
      {!pools.length && <Empty title={`No talent pools for ${clientName(w, focus)} yet.`}>Run a saved search and add the people it finds.</Empty>}
      {pools.map((p) => <PoolCard key={p.id} w={w} a={a} pool={p} />)}
      <Say items={[`compare the ${pools[0]?.name.toLowerCase() ?? 'payments'} pool`, `put the top 3 from the ${pools[0]?.name.toLowerCase() ?? 'payments'} pool in front of ${clientShort(w, focus).toLowerCase()}`]} />
    </Frame>
  );
}
function PoolCard({ w, a, pool }: { w: World; a: Actor; pool: Pool }) {
  const live = ranked(w, pool); const gone = removedMembers(w, pool); const hidden = hiddenMembers(w, pool).length;
  const [who, setWho] = useState(live[0] ?? '');
  return (
    <section className="ds-sheet agency-pool" aria-labelledby={`pool-${pool.id}`}>
      <div className="agency-row"><h2 id={`pool-${pool.id}`} className="voice t24">{pool.name}</h2><span className="t14 muted">For {mandateOf(w, pool.mandateId)?.title} · ranked by evidence</span></div>
      {live.length ? <ol className="agency-people">{live.map((pid, i) => {
        const s = mustHavesShown(w, pool.mandateId, pid);
        return <li key={pid}><span className="num rank">{i + 1}</span><span className="who"><b>{personName(w, pid)}</b><span className="t14 muted">{w.people.find((x) => x.personId === pid)?.headline}</span></span><Pips shown={s.shown} of={s.of} />{consentTag(w, pid, pool.clientOrgId)}</li>;
      })}</ol> : <Empty title="No one in this pool can be shown.">Run the saved search to find people who can be.</Empty>}
      <HiddenNote n={hidden} />
      {gone.length > 0 && <div className="agency-removed" role="note"><b>Removed from this pool</b>{gone.map((pid) => <p key={pid} className="t14">{personName(w, pid)}: {lc(consentReason(w, pid, pool.clientOrgId))}. Not searchable, contactable or submittable.</p>)}</div>}
      {canAct(a) && live.length > 0 && (
        <details className="agency-demo"><summary>Simulate a candidate withdrawing consent <span className="ds-sim">Simulated</span></summary>
          <div className="agency-row" style={{ marginTop: 8, justifyContent: 'flex-start' }}>
            <label className="sr" htmlFor={`wd-${pool.id}`}>Candidate</label>
            <select id={`wd-${pool.id}`} className="ds-input" value={who} onChange={(e) => setWho(e.target.value)}>{live.map((pid) => <option key={pid} value={pid}>{personName(w, pid)}</option>)}</select>
            <button type="button" className="ds-btn" onClick={() => who && doOp('agency.consent.withdraw', { personId: who }, 'Withdraw consent')}>Withdraw their consent</button>
          </div>
          <p className="t14 muted">In the real product only the candidate can do this, from their own account.</p>
        </details>
      )}
    </section>
  );
}

// ---------------- Saved searches ----------------
export function Searches() {
  const { w, a, focus } = useAg();
  const list = searchesFor(w, focus);
  const t = today(w);
  return (
    <Frame title={`${clientShort(w, focus)}: ${plural(list.length, 'saved search', 'saved searches')}`} kicker="Talent pools · saved searches" here={AP.searches} section="pools">
      {!list.length && <Empty title={`No saved searches for ${clientName(w, focus)}.`}>Describe who you’re looking for to Q and ask it to save the search.</Empty>}
      {list.map((s) => {
        const vis = s.universe.filter((u) => u.since <= t && allowed(w, u.personId));
        const pending = vis.filter((u) => u.since > s.lastRunAt && !isWithdrawn(w, u.personId) && !s.results.includes(u.personId)).length;
        const results = s.results.filter((p) => allowed(w, p));
        const hidden = s.universe.filter((u) => u.since <= t && !allowed(w, u.personId) && !isWithdrawn(w, u.personId)).length;
        const out = s.universe.filter((u) => u.since <= t && isWithdrawn(w, u.personId));
        return (
          <section key={s.id} className="ds-sheet agency-search" aria-labelledby={`ss-${s.id}`}>
            <div className="agency-row"><h2 id={`ss-${s.id}`} className="t19">{s.name}</h2>{pending > 0 && <span className="ds-tag" data-k="busy">{pending} new waiting</span>}</div>
            <p className="t14 muted"><code className="agency-code">{s.query}</code> · last run {fmtDay(s.lastRunAt)} · run {plural(s.runs, 'time')}</p>
            {results.length ? <ul className="agency-list" aria-label="Results">{results.map((pid) => <li key={pid}><span><b>{personName(w, pid)}</b> · {w.people.find((x) => x.personId === pid)?.headline}</span>{s.newSinceLast.includes(pid) ? <span className="ds-tag" data-k="busy">New since last run</span> : <span className="t14 muted">Seen before</span>}</li>)}</ul>
              : <Empty title="No results yet.">Re-run the search to see who matches today.</Empty>}
            {out.length > 0 && <p className="t14 muted">Not shown: {out.map((u) => personName(w, u.personId)).join(', ')} (withdrew consent).</p>}
            <HiddenNote n={hidden} what="match this search but" />
            <div className="ds-actions">
              <button type="button" className="ds-btn primary" onClick={() => doOp('agency.search.rerun', { id: s.id }, 'Re-run')}>Re-run and show what’s new</button>
              {s.newSinceLast.length > 0 && canAct(a) && <button type="button" className="ds-btn" onClick={() => doOp('agency.pool.add', { searchId: s.id }, 'Add to pool')}>Add new people to the pool</button>}
            </div>
          </section>
        );
      })}
      <Say items={[`run the ${clientShort(w, focus).toLowerCase()} ${list[0]?.keywords[0] ?? ''} search again and tell me whats new`]} />
    </Frame>
  );
}

// ---------------- Compare ----------------
export function Compare() {
  const { w, focus } = useAg();
  const pools = poolsFor(w, focus);
  const [sel, setSel] = useViewState<string>('compare.pool', pools[0]?.id ?? '');
  const pool = pools.find((p) => p.id === sel) ?? pools[0];
  if (!pool) return <Frame title="Nothing to compare" kicker="Talent pools · compare" here={AP.compare} section="pools"><Empty title={`${clientName(w, focus)} has no pools yet.`}>Once a pool has people in it, you can compare their evidence here.</Empty></Frame>;
  const m = mandateOf(w, pool.mandateId)!;
  const people = ranked(w, pool);
  return (
    <Frame title={people.length ? `${personName(w, people[0])} shows the most for ${m.title}` : `No one to compare for ${m.title}`} kicker="Talent pools · compare" here={AP.compare} section="pools">
      {pools.length > 1 && <div className="agency-switch" role="group" aria-label="Pool">{pools.map((p) => <button key={p.id} type="button" className="ds-filter" aria-pressed={p.id === pool.id} onClick={() => setSel(p.id)}>{p.name}</button>)}</div>}
      <p className="t14 muted">Ranked by how many must-haves each person’s evidence shows, strongest kind first. It isn’t a score: open a person to see the evidence. Withdrawn candidates aren’t compared.</p>
      {!people.length && <Empty title="No one in this pool can be compared.">Everyone in it has withdrawn or is hidden by their privacy settings.</Empty>}
      <ul className="agency-cmp-list" aria-label={`Evidence per requirement, ${pool.name}`}>{people.map((pid) => { const f = fitOf(w, m.id, pid); return (
        <li key={pid} className="ds-sheet"><div className="agency-row"><b>{personName(w, pid)}</b>{consentTag(w, pid, focus)}</div>
          <ul>{m.requirements.map((r) => { const k = glyphOf(f[r.reqId] ?? 'none'); return <li key={r.reqId}><span className="t14">{r.label}{r.mustHave ? '' : ' (nice)'}</span><span className="agency-glyph"><Glyph k={k} size={16} />{GLYPH_LABEL[k]}</span></li>; })}</ul></li>
      ); })}</ul>
      {people.length > 0 && <div className="ds-table-wrap agency-cmp-table">
        <table className="ds-table agency-compare">
          <caption className="sr">Evidence for each requirement of {m.title}, {clientName(w, focus)} pool {pool.name}</caption>
          <thead><tr><th scope="col">Person</th>{m.requirements.map((r) => <th key={r.reqId} scope="col">{r.label}{r.mustHave ? '' : ' (nice)'}</th>)}<th scope="col">Consent</th></tr></thead>
          <tbody>{people.map((pid) => { const f = fitOf(w, m.id, pid); return (
            <tr key={pid}><th scope="row">{personName(w, pid)}</th>{m.requirements.map((r) => { const k = glyphOf(f[r.reqId] ?? 'none'); return <td key={r.reqId}><span className="agency-glyph"><Glyph k={k} size={16} />{GLYPH_LABEL[k]}</span></td>; })}<td>{consentTag(w, pid, focus)}</td></tr>
          ); })}</tbody>
        </table>
      </div>}
      <HiddenNote n={hiddenMembers(w, pool).length} />
      <Say items={[`put the top 3 from the ${pool.name.toLowerCase()} pool in front of ${clientShort(w, focus).toLowerCase()}`]} />
    </Frame>
  );
}

// ---------------- Campaigns ----------------
const CAMP_STATUS = { DRAFT: 'Draft', RUNNING: 'Sending', PAUSED: 'Waiting for next run', DONE: 'Done' } as const;
const MSG_STATUS = { SENT_SIMULATED: ['ok', 'Sent (simulated)'], EXCLUDED: ['risk', 'Excluded'], HELD: ['warn', 'Held'], QUEUED: ['busy', 'Queued'] } as const;
export function Campaigns() {
  const { w, a, focus } = useAg();
  const list = campaignsFor(w, focus);
  const org = w.orgs.find((o) => o.id === 'org_tb')!;
  return (
    <Frame title={`${clientShort(w, focus)}: ${plural(list.length, 'campaign')}`} kicker="Outreach campaigns" here={AP.campaigns}>
      <div className="ds-banner" role="note"><Glyph k="full" /><span><b>You approve each campaign once</b> ({org.delegation === 'APPROVED_CAMPAIGN' ? 'Talentbridge’s “approved campaign” setting' : `setting: ${org.delegation.toLowerCase()}`}): who it goes to, what it says and its limits. Q then sends within those limits without asking for each message, and stops at any limit.</span><span /></div>
      {!list.length && <Empty title={`No campaigns for ${clientName(w, focus)}.`}>Ask Q to draft one for a pool.</Empty>}
      {list.map((c) => {
        const pool = agency(w).pools.find((p) => p.id === c.poolId)!;
        const signed = briefSigned(w, c.mandateId);
        const sample = messageFor(w, c.template, ranked(w, pool)[0] ?? pool.members.find((p) => allowed(w, p)) ?? '');
        const sent = c.messages.filter((m) => m.status === 'SENT_SIMULATED').length;
        return (
          <section key={c.id} className="ds-sheet agency-camp" aria-labelledby={`cp-${c.id}`}>
            <div className="agency-row"><h2 id={`cp-${c.id}`} className="t19">{c.name}</h2><span className="ds-tag" data-k={c.status === 'RUNNING' ? 'busy' : c.status === 'DONE' ? 'ok' : undefined}>{CAMP_STATUS[c.status]}</span></div>
            <p className="t14 muted">To the {pool.name} pool · for {mandateOf(w, c.mandateId)?.title}</p>
            <dl className="agency-facts">
              <div><dt>Per run</dt><dd className="num">{c.limits.perRun}</dd></div><div><dt>Per day</dt><dd className="num">{c.limits.perDay}</dd></div><div><dt>Words per message</dt><dd className="num">≤ {c.limits.maxWords}</dd></div><div><dt>Follow-ups</dt><dd className="num">{c.limits.followUps}</dd></div>
            </dl>
            <figure className="agency-sample"><figcaption className="lab">First message</figcaption><blockquote className="ds-quote">{sample}</blockquote></figure>
            {c.messages.length > 0 && <>
              <div className="agency-run-prog"><Bar done={sent} total={c.messages.length} label={`${c.name}: messages sent`} /><span className="num agency-count"><b>{sent}</b> of {c.messages.length} sent</span></div>
              <ul className="agency-list" aria-label="Messages">{c.messages.map((m) => <li key={m.personId} data-out={m.status === 'EXCLUDED' ? '1' : undefined}><span><b>{personName(w, m.personId)}</b>{m.reason ? ` · ${m.reason}` : ''}{m.receipt ? ` · receipt ${m.receipt}` : ''}</span><span className="ds-tag" data-k={MSG_STATUS[m.status][0]}>{MSG_STATUS[m.status][1]}</span></li>)}</ul>
            </>}
            <HiddenNote n={c.notShown ?? (c.messages.length ? 0 : hiddenMembers(w, pool).length)} what="in this pool" />
            {!signed && <div className="ds-banner" data-k="warn" role="status"><Glyph k="partial" /><span>Can’t launch yet: {clientShort(w, c.clientOrgId)}’s brief for this role isn’t signed. Talentbridge rule: “Campaigns need a signed client brief”.</span><Link className="ds-btn" to={AP.docs}>Documents</Link></div>}
            {c.status === 'DRAFT' && signed && (canAct(a)
              ? <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => ask(`launch the ${clientShort(w, c.clientOrgId).toLowerCase()} campaign`)}>Review and launch with Q</button></div>
              : <p className="t14 muted">Only Dele or an admin can launch campaigns.</p>)}
          </section>
        );
      })}
    </Frame>
  );
}

// ---------------- Submittals ----------------
export function Submittals() {
  const { w, a, focus } = useAg();
  const list = [...submittalsFor(w, focus)].reverse();
  return (
    <Frame title={`${clientShort(w, focus)}: ${list.filter((s) => s.status === 'DRAFT').length} draft, ${list.filter((s) => s.status !== 'DRAFT').length} sent`} kicker="Submittals" here={AP.submittals}>
      {!list.length && <Empty title={`Nothing submitted to ${clientName(w, focus)} yet.`} action={<button type="button" className="ds-chip agency-saychip" onClick={() => ask(`put the top 3 from the ${poolsFor(w, focus)[0]?.name.toLowerCase() ?? ''} pool in front of ${clientShort(w, focus).toLowerCase()}`)}>“put the top 3 from the {poolsFor(w, focus)[0]?.name.toLowerCase() ?? ''} pool in front of {clientShort(w, focus).toLowerCase()}”</button>}>Ask Q to shortlist people from a pool. You approve before anything is sent.</Empty>}
      {list.map((s) => {
        const rows = s.people.filter((p) => allowed(w, p.personId) || isWithdrawn(w, p.personId));
        const inc = rows.filter((p) => p.included);
        return (
          <section key={s.id} className="ds-sheet agency-sub" aria-labelledby={`sb-${s.id}`}>
            <div className="agency-row"><h2 id={`sb-${s.id}`} className="t19">{mandateOf(w, s.mandateId)?.title}</h2><span className="ds-tag" data-k={s.status === 'DRAFT' ? 'warn' : s.status === 'CLIENT_REPLIED' ? 'ok' : 'busy'}>{s.status === 'DRAFT' ? 'Draft · needs your yes' : s.status === 'CLIENT_REPLIED' ? 'Client replied' : `Sent ${fmtDay(s.sentAt)} (simulated)`}</span></div>
            <ul className="agency-list">{rows.map((p) => (
              <li key={p.personId} data-out={p.included ? undefined : '1'}>
                <span><b>{personName(w, p.personId)}</b>{p.included ? '' : ` · not included: ${p.reason ?? consentReason(w, p.personId, s.clientOrgId)}`}</span>
                {consentTag(w, p.personId, s.clientOrgId)}
                {s.status === 'DRAFT' && canAct(a) && <button type="button" className="ds-btn quiet" aria-pressed={p.included} onClick={() => doOp('agency.submittal.toggle', { id: s.id, personId: p.personId }, 'Toggle')}>{p.included ? 'Leave out' : 'Include'}</button>}
              </li>
            ))}</ul>
            <HiddenNote n={s.people.length - rows.length} what="on this submittal" />
            {s.status === 'DRAFT' && (canAct(a) ? <div className="agency-approve" role="group" aria-label="Approval">
              <p className="t14"><b>Sends {plural(inc.length, 'profile')} to {clientName(w, s.clientOrgId)}.</b> Consent is checked again for each person at the moment of sending. Simulated: nothing leaves Talent Q.</p>
              <div className="ds-actions"><button type="button" className="ds-btn primary" disabled={!inc.length} onClick={() => doOp('agency.submittal.send', { id: s.id }, 'Send')}>Send to {clientShort(w, s.clientOrgId)} (simulated)</button><button type="button" className="ds-btn quiet" onClick={() => doOp('agency.submittal.discard', { id: s.id }, 'Discard')}>Discard draft</button></div>
            </div> : <p className="t14 muted">Only Dele or an admin can send submittals.</p>)}
            {s.status === 'SENT_SIMULATED' && <div className="agency-row agency-sent"><span className="t14 muted">Receipt {s.receipt}. {s.nudgedAt ? `Nudged ${fmtDay(s.nudgedAt)}.` : 'No reply yet.'}</span><span className="ds-actions">{canAct(a) && !s.nudgedAt && <button type="button" className="ds-btn quiet" onClick={() => doOp('agency.submittal.nudge', { id: s.id }, 'Nudge')}>Send a nudge (simulated)</button>}<button type="button" className="ds-btn quiet" onClick={() => doOp('agency.submittal.reply', { id: s.id, text: 'Thanks, we’d like to meet the first two next week.' }, 'Reply')}>Simulate a client reply</button></span></div>}
            {s.reply && <blockquote className="ds-quote">{clientShort(w, s.clientOrgId)}: {s.reply}</blockquote>}
          </section>
        );
      })}
    </Frame>
  );
}

// ---------------- Notes and mentions ----------------
export function Notes() {
  const { w, a, A, focus } = useAg();
  const list = [...notesFor(w, focus)].sort((x, y) => y.at.localeCompare(x.at));
  const mine = A.notes.filter((n) => n.mentions.includes(a.id) && n.clientOrgId === focus).length;
  const [text, setText] = useState('');
  useEffect(() => { if (A.notes.some((n) => n.mentions.includes(a.id) && !n.readBy.includes(a.id) && n.clientOrgId === focus)) setTimeout(() => doOp('agency.note.read', {}, 'read'), 1500); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Frame title={`${clientShort(w, focus)}: ${plural(list.length, 'team note')}`} kicker="Clients · team notes" here={AP.notes} section="clients">
      <form className="ds-sheet agency-noteform" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { ask(`note for ${clientShort(w, focus).toLowerCase()}: ${text.trim()}`); setText(''); } }}>
        <div className="ds-field"><label htmlFor="ag-note">Add a note for the {clientShort(w, focus)} team</label><textarea id="ag-note" className="ds-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type @Tunde or @Dele to mention someone" /></div>
        <div className="agency-row"><p className="t14 muted"><Lock /> Only Talentbridge staff can read notes. {clientShort(w, focus)} never sees them.</p><button type="submit" className="ds-btn primary" disabled={!text.trim()}>Add note</button></div>
      </form>
      {mine > 0 && <p className="t14"><span className="ds-tag" data-k="busy">{plural(mine, 'note mentions', 'notes mention')} you</span></p>}
      {!list.length ? <Empty title={`No notes for ${clientName(w, focus)} yet.`}>Notes help the team hand work over. Mention a colleague with @ to get their attention.</Empty> : <ul className="agency-notes">{list.map((n) => (
        <li key={n.id} className="ds-sheet" data-mine={n.mentions.includes(a.id) ? '1' : undefined}>
          <div className="agency-row"><b>{actorOf(w, n.by).name}</b><span className="t14 muted">{new Date(n.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
          <p>{n.text.split(/(@\w+)/).map((s, i) => s.startsWith('@') ? <mark key={i} className="agency-mention">{s}</mark> : s)}</p>
          {n.mentions.includes(a.id) && <span className="ds-tag" data-k="busy">Mentions you{n.readBy.includes(a.id) ? '' : ' · new'}</span>}
        </li>
      ))}</ul>}
    </Frame>
  );
}

// ---------------- Agents: concurrent runs, truthful progress, controls ----------------
export function Agents() {
  const { w, a, A } = useAg();
  const running = A.runs.filter((r) => r.state === 'RUNNING');
  const failed = A.runs.filter((r) => r.state === 'FAILED').length; const paused = A.runs.filter((r) => r.state === 'PAUSED').length;
  const agents: QAgent[] = running.map((r) => ({ label: `${clientShort(w, r.clientOrgId)} ${r.label}`, done: r.done, total: r.total }));
  return (
    <Frame title={`${running.length} running${failed ? `, ${failed} failed` : ''}${paused ? `, ${paused} paused` : ''}`} kicker="Agents" here={AP.agents} lens={false}
      aside={<QMark mood={failed ? 'blocked' : running.length ? 'working' : 'idle'} agents={agents} size={44} title={`Q: ${running.length} agents working`} />}>
      <AgentSummary runs={A.runs} />
      <p className="t14 muted">Three agents run at once; the rest wait in priority order. Progress moves only when a unit of work finishes. Each client’s agents only read that client’s criteria. <span className="ds-sim">Simulated</span></p>
      {!canAct(a) && <p className="t14" role="note"><b>View only.</b> Viewers can watch agents but not control them.</p>}
      {clientIds(w).map((c) => {
        const rs = runsFor(w, c); const active = rs.filter((r) => !['DONE', 'CANCELLED'].includes(r.state)).sort(byPhase); const ended = rs.filter((r) => ['DONE', 'CANCELLED'].includes(r.state));
        return (
          <section key={c} className="agency-runs" aria-labelledby={`rn-${c}`}>
            <h2 id={`rn-${c}`} className="voice t24 agency-runs-head"><ClientMark w={w} c={c} size={30} />{clientName(w, c)}<span className="t14 muted">{plural(active.length, 'active agent')}</span></h2>
            {active.length ? <div className="agency-runlist">{active.map((r) => <RunRow key={r.id} w={w} a={a} r={r} />)}</div> : <Empty title={`No agents working for ${clientShort(w, c)}.`}>Ask Q to run one of {clientShort(w, c)}’s saved searches.</Empty>}
            {ended.length > 0 && <details className="agency-ended"><summary>Finished or cancelled ({ended.length})</summary><div className="agency-runlist">{ended.map((r) => <RunRow key={r.id} w={w} a={a} r={r} />)}</div></details>}
          </section>
        );
      })}
      <Say items={['stop the medlink search, kora is urgent', 'resume medlink', 'what happened to the ops search?']} />
    </Frame>
  );
}

// ---------------- Documents ----------------
const PRESETS = ['Interview scorecard.pdf', 'Client feedback notes.docx', 'Salary benchmark (simulated).xlsx'];
export function Docs() {
  const { w, a, focus } = useAg();
  const all = docsFor(w, focus);
  const visible = all.filter((d) => !d.confidential || canSeeMandate(w, a, mandateOf(w, d.mandateId ?? '') ?? ({ confidential: true } as MandateX)));
  const [pick, setPick] = useState(PRESETS[0]);
  return (
    <Frame title={`${clientShort(w, focus)}: ${plural(visible.length, 'document')}`} kicker="Clients · documents" here={AP.docs} section="clients">
      {all.length ? <ul className="agency-docs">{visible.map((d) => (
        <motion.li key={d.id} className="ds-sheet" {...arrive}>
          <div className="agency-row"><b>{d.name}</b><span className="agency-row" style={{ gap: 6 }}>{d.kind === 'BRIEF' && <span className="ds-tag" data-k={d.signed ? 'ok' : 'warn'}>{d.signed ? 'Signed brief' : 'Not signed'}</span>}{d.confidential && <span className="ds-tag" data-k="warn">Confidential</span>}</span></div>
          {d.status === 'UPLOADING' ? <div className="agency-run-prog"><Bar done={d.progress} total={100} label={`Uploading ${d.name}`} /><span className="num agency-count">Uploading · {d.progress}%</span></div> : <p className="t14 muted">{d.summary}</p>}
          <span className="t14 muted">Added {fmtDay(d.at)} by {actorOf(w, d.by).first}{d.mandateId ? ` · ${mandateOf(w, d.mandateId)?.title}` : ''}</span>
        </motion.li>
      ))}</ul> : <Empty title={`No documents for ${clientName(w, focus)} yet.`}>Upload the signed client brief first: campaigns need it.</Empty>}
      {all.length > visible.length && <p className="t14 agency-hidden" role="note"><Lock /><span>{plural(all.length - visible.length, 'confidential document')} hidden for your role. Ask Dele for access if you need it.</span></p>}
      {canAct(a) ? (
        <form className="ds-sheet agency-upload" onSubmit={(e) => { e.preventDefault(); doOp('agency.doc.upload', { client: focus, name: pick }, 'Upload'); }}>
          <div className="ds-field"><label htmlFor="ag-up">Upload a document <span className="ds-sim">Simulated upload</span></label>
            <select id="ag-up" className="ds-input" value={pick} onChange={(e) => setPick(e.target.value)}>{PRESETS.map((p) => <option key={p}>{p}</option>)}</select></div>
          <button type="submit" className="ds-btn primary">Upload to {clientShort(w, focus)}</button>
        </form>
      ) : <p className="t14 muted">Viewers can read documents but not upload them.</p>}
      <Say items={[`upload the signed ${clientShort(w, focus).toLowerCase()} brief`]} />
    </Frame>
  );
}

// ---------------- Client reports: Q drafts, Dele edits, then shares (simulated) ----------------
export function Reports() {
  const { w, a, A, focus } = useAg();
  const rep = A.reports[focus];
  const status = rep ? (rep.status === 'SHARED_SIMULATED' ? ['ok', `Version ${rep.v} · shared (simulated)`] : rep.status === 'EDITED' ? [undefined, `Version ${rep.v} · edited`] : ['warn', `Version ${rep.v} · draft`]) : null;
  return (
    <Frame title={`${clientName(w, focus)} report`} kicker="Client reports" here={AP.reports} aside={status ? <span className="ds-tag" data-k={status[0]}>{status[1]}</span> : undefined}>
      {!rep ? (
        <Empty title={`No ${clientShort(w, focus)} report yet.`} action={canAct(a) ? <button type="button" className="ds-btn primary" onClick={() => ask(`draft the ${clientShort(w, focus).toLowerCase()} report`)}>Draft it with Q</button> : <p className="t14 muted">Only Dele or an admin can draft client reports.</p>}>
          Q drafts it from {clientName(w, focus)}’s records only: its mandates, people, submittals and outreach. You edit it, then share it. Nothing about other clients can appear in it.
        </Empty>
      ) : <ReportEditor key={`${focus}-${rep.v}`} w={w} a={a} rep={rep} />}
    </Frame>
  );
}
function ReportEditor({ w, a, rep }: { w: World; a: Actor; rep: Report }) {
  const [edit, setEdit] = useState(false);
  const [secs, setSecs] = useState<ReportSection[]>(rep.sections);
  const chk = isolationCheck(w, { ...rep, sections: secs });
  const act = canAct(a);
  return (
    <>
      <div className="ds-banner" data-k={chk.ok ? undefined : 'risk'} role="status"><Glyph k={chk.ok ? 'verified' : 'none'} /><span>{chk.ok ? <><b>Isolation check passed.</b> Names only {clientShort(w, rep.clientOrgId)}’s own candidates and roles ({plural(peopleFor(w, rep.clientOrgId).length, 'person', 'people')} on record).</> : <><b>Can’t be shared as written.</b> It names {[...chk.foreignPeople, ...chk.foreignClients].join(', ')}, outside {clientShort(w, rep.clientOrgId)}’s records. Remove them to share.</>}</span><span /></div>
      <article className="ds-sheet agency-report" aria-label={`${clientName(w, rep.clientOrgId)} report, version ${rep.v}`}>
        {secs.map((s, i) => (
          <section key={s.id} aria-labelledby={`rs-${s.id}`}>
            <h2 id={`rs-${s.id}`} className="t19">{s.h}</h2>
            {edit ? <><label className="sr" htmlFor={`rt-${s.id}`}>{s.h}</label><textarea id={`rt-${s.id}`} className="ds-input" rows={3} value={s.body} onChange={(e) => setSecs(secs.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))} /></> : <p>{s.body}</p>}
          </section>
        ))}
      </article>
      {act && <div className="ds-actions">
        {edit ? <><button type="button" className="ds-btn primary" onClick={() => { doOp('agency.report.save', { client: rep.clientOrgId, sections: secs }, 'Save'); setEdit(false); }}>Save as version {rep.v + 1}</button><button type="button" className="ds-btn quiet" onClick={() => { setSecs(rep.sections); setEdit(false); }}>Discard edits</button></>
          : <><button type="button" className="ds-btn" onClick={() => setEdit(true)}>Edit</button>
            {rep.status !== 'SHARED_SIMULATED' && <button type="button" className="ds-btn primary" disabled={!chk.ok} onClick={() => ask(`share the ${clientShort(w, rep.clientOrgId).toLowerCase()} report`)}>Share with {clientShort(w, rep.clientOrgId)}…</button>}
            <button type="button" className="ds-btn quiet" onClick={() => doOp('agency.report.draft', { client: rep.clientOrgId }, 'Redraft')}>Redraft from latest records</button></>}
      </div>}
      {rep.status === 'SHARED_SIMULATED' && <p className="t14" role="status">Shared {fmtDay(rep.sharedAt)} · receipt {rep.receipt} (simulated).</p>}
      <details className="agency-demo"><summary>Versions ({rep.history.length})</summary><ol className="agency-log">{rep.history.map((h) => <li key={h.v}>v{h.v} · {fmtDay(h.at)} · {h.note}</li>)}</ol></details>
    </>
  );
}

export const askActions = (xs: QAction[]) => xs;
