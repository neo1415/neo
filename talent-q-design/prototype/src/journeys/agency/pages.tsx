// Agency pages (R4). Every page shows ONE client at a time (the client in focus), except the agency home and
// the agents monitor, which show each client in its own separate section and never mix candidates.
// Q does the work: each page offers "say it to Q" shortcuts, and every button goes through Q's ops so the
// conversation records what happened.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { actorOf, update, useWorld, type World } from '../../mock/world';
import type { Actor, MandateX, QAction } from '../../state/domain';
import { STAGE_LABEL } from '../../state/domain';
import { Canvas } from '../../ds/Workspace';
import { Glyph, GLYPH_LABEL, type GlyphKind } from '../../ds/Glyph';
import { QMark, type QAgent } from '../../ds/QMark';
import { Link, navigate } from '../../ui/router';
import { runAction, sendToQ, useViewState } from '../../q/core/engine';
import { agency, type AgentRun, type ClientId, type FitMark, type Pool, type Report, type ReportSection } from '../../state/areas/agency';
import {
  lc, agencyMandates, briefSigned, campaignsFor, canAct, canSeeMandate, clientIds, clientName, clientShort, consentReason, consentState, deniedReason, docsFor, fitOf, fmtDay, focusOf, isolationCheck, isWithdrawn,
  mandateOf, messageFor, mustHavesShown, notesFor, peopleFor, personName, pipelineFor, poolsFor, PRIORITY, ranked, removedMembers, RUN_STATE, runsFor, searchesFor, setFocus, submittalsFor, today,
} from './model';
import { needsYou } from '../../q/skills/agency';

const P = '/r/agency';
const doOp = (op: string, args: Record<string, unknown> = {}, label = op) => void runAction({ label, act: { t: 'do', op, args } });
const ask = (text: string) => void sendToQ(text);

function useAg() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  return { w, a, A: agency(w), focus: focusOf(w, a.id) };
}

// ---------------- Frame: client switcher, sub-navigation, demo identity ----------------
const SUBNAV: [string, string][] = [['', 'Home'], ['/clients', 'Clients'], ['/pools', 'Pools'], ['/searches', 'Saved searches'], ['/compare', 'Compare'], ['/campaigns', 'Campaigns'], ['/submittals', 'Submittals'], ['/agents', 'Agents'], ['/notes', 'Notes'], ['/docs', 'Documents'], ['/reports', 'Reports']];
function SubNav({ here }: { here: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { const el = ref.current?.querySelector<HTMLElement>('[aria-current="page"]'); const nav = ref.current; if (el && nav && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = el.offsetLeft - nav.clientWidth / 2 + el.clientWidth / 2; }, [here]);
  return (
    <nav ref={ref} className="agency-subnav" aria-label="Agency pages">
      {SUBNAV.map(([p, l]) => { const to = p ? `${P}${p}` : '/r/home'; return <Link key={l} to={to} current={here === to}>{l}</Link>; })}
    </nav>
  );
}
export function ClientSwitch({ w, a, focus }: { w: World; a: Actor; focus: ClientId }) {
  return (
    <div className="agency-switch" role="group" aria-label="Client in focus">
      <span className="lab">Client</span>
      {clientIds(w).map((c) => <button key={c} type="button" className="ds-filter" aria-pressed={focus === c} onClick={() => update((d) => setFocus(d, a.id, c))}>{clientName(w, c)}</button>)}
      <span className="t14 muted agency-only" aria-live="polite">Showing {clientName(w, focus)} only. Other clients’ records stay out of this view.</span>
    </div>
  );
}
function ViewAs({ w, a }: { w: World; a: Actor }) {
  const staff = w.actors.filter((x) => x.orgId === 'org_tb');
  return (
    <div className="agency-viewas" role="group" aria-label="Demo: view as a colleague">
      <span className="ds-sim">Demo</span>
      {staff.map((s) => <button key={s.id} type="button" className="ds-filter" aria-pressed={a.id === s.id} onClick={() => update((d) => { d.session.actor = s.id; })}>{s.first} · {s.role === 'VIEWER' ? 'Viewer' : s.role === 'OWNER' ? 'Owner' : s.role?.toLowerCase()}</button>)}
    </div>
  );
}
function Frame({ title, kicker, here, children, switcher = true, aside }: { title: string; kicker: string; here: string; children: ReactNode; switcher?: boolean; aside?: ReactNode }) {
  const { w, a, focus } = useAg();
  return (
    <Canvas title={title} kicker={kicker} open onClose={() => navigate('/r/home')} aside={<div className="agency-aside">{aside}<ViewAs w={w} a={a} /></div>}>
      <SubNav here={here} />
      {switcher && <ClientSwitch w={w} a={a} focus={focus} />}
      {children}
    </Canvas>
  );
}
function Say({ items }: { items: string[] }) {
  return (
    <div className="agency-say" role="group" aria-label="Say it to Q">
      <span className="lab">Say it to Q</span>
      {items.map((t) => <button key={t} type="button" className="ds-chip agency-saychip" onClick={() => ask(t)}>“{t}”</button>)}
    </div>
  );
}
const Empty = ({ children }: { children: ReactNode }) => <p className="agency-empty">{children}</p>;
const Bar = ({ done, total, label, failed }: { done: number; total: number; label: string; failed?: boolean }) => (
  <div className="agency-bar" data-failed={failed ? '1' : undefined} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={`${done} of ${total}`}><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
);
const consentTag = (w: World, pid: string, client: ClientId) => {
  const s = consentState(w, pid, client);
  return s === 'OK' ? <span className="ds-tag" data-k="ok">Consent to {clientShort(w, client)}</span> : s === 'WITHDRAWN' ? <span className="ds-tag" data-k="risk">Consent withdrawn</span> : <span className="ds-tag" data-k="warn">Consent not asked</span>;
};
const runTag = (r: AgentRun) => <span className="ds-tag" data-k={r.state === 'FAILED' ? 'risk' : r.state === 'RUNNING' || r.state === 'RETRYING' ? 'busy' : r.state === 'DONE' ? 'ok' : r.state === 'PAUSED' ? 'warn' : undefined}>{RUN_STATE[r.state]}</span>;
const glyphOf = (m: FitMark): GlyphKind => (m === 'verified' ? 'verified' : m === 'full' ? 'full' : m === 'partial' ? 'partial' : 'none');

// ---------------- Home ----------------
export function AgencyHome() {
  const { w, a, A } = useAg();
  const items = needsYou(w, a);
  const running = A.runs.filter((r) => r.state === 'RUNNING');
  const agents: QAgent[] = running.map((r) => ({ label: `${clientShort(w, r.clientOrgId)} ${r.label}`, done: r.done, total: r.total }));
  return (
    <Frame title={`${running.length} ${running.length === 1 ? 'agent' : 'agents'} working · ${items.length} ${items.length === 1 ? 'thing needs' : 'things need'} you`} kicker={`Talentbridge · ${a.first}’s agency home`} here="/r/home" switcher={false}>
      <section className="ds-sheet agency-needs" aria-labelledby="ag-needs">
        <h2 id="ag-needs" className="voice t24">{a.role === 'VIEWER' ? 'For you' : 'Needs you'}</h2>
        {items.length ? <ul className="agency-list">{items.map((i) => (
          <li key={i.text}><span>{i.text}</span><button type="button" className="ds-btn" onClick={() => void runAction(i.action)}>{i.action.label}</button></li>
        ))}</ul> : <Empty>Nothing is waiting on you. Q will tell you when something changes.</Empty>}
      </section>
      <div className="agency-grid">
        {clientIds(w).map((c) => {
          const ms = agencyMandates(w, c); const visible = ms.filter((m) => canSeeMandate(w, a, m));
          const rs = runsFor(w, c);
          return (
            <section key={c} className="ds-sheet agency-client" aria-labelledby={`cl-${c}`}>
              <div className="agency-row"><h2 id={`cl-${c}`} className="voice t24">{clientName(w, c)}</h2><span className="ds-tag">{w.orgs.find((o) => o.id === c)?.industry}</span></div>
              <p className="t14 muted">{ms.length} open {ms.length === 1 ? 'mandate' : 'mandates'} · {poolsFor(w, c).length} {poolsFor(w, c).length === 1 ? 'pool' : 'pools'} · {rs.filter((r) => r.state === 'RUNNING').length} {rs.filter((r) => r.state === 'RUNNING').length === 1 ? 'agent' : 'agents'} running{rs.some((r) => r.state === 'FAILED') ? ' · 1 failed' : ''}{rs.some((r) => r.state === 'PAUSED') ? ` · ${rs.filter((r) => r.state === 'PAUSED').length} paused` : ''}</p>
              <ul className="agency-mandates">
                {visible.map((m) => <li key={m.id}><Link to={`${P}/mandate/${m.id}`} onClick={() => update((d) => setFocus(d, a.id, c))}>{m.title}</Link><span className="t14 muted">{m.workMode === 'ONSITE' ? 'On-site' : m.workMode === 'REMOTE' ? 'Remote only' : 'Hybrid'} · {w.pipeline.filter((p) => p.mandateId === m.id && !isWithdrawn(w, p.personId)).length} people{m.confidential ? ' · confidential' : ''}</span></li>)}
                {ms.length > visible.length && <li><span className="muted">{ms.length - visible.length} confidential mandate hidden for your role</span></li>}
              </ul>
              <Link className="ds-btn" to={`${P}/client/${c}`} onClick={() => update((d) => setFocus(d, a.id, c))}>Open {clientShort(w, c)}</Link>
            </section>
          );
        })}
      </div>
      <section className="ds-sheet" aria-labelledby="ag-agents">
        <div className="agency-row"><h2 id="ag-agents" className="voice t24">Agents</h2><QMark mood={running.length ? 'working' : 'idle'} agents={agents} size={36} title={`${running.length} agents running`} /></div>
        <ul className="agency-runs-mini">{A.runs.filter((r) => r.state !== 'DONE' && r.state !== 'CANCELLED').map((r) => (
          <li key={r.id}><span><b>{clientShort(w, r.clientOrgId)}</b> · {r.label}</span>{runTag(r)}<Bar done={r.done} total={r.total} label={`${clientShort(w, r.clientOrgId)} ${r.label}`} failed={r.state === 'FAILED'} /><span className="num t14">{r.done}/{r.total}</span></li>
        ))}</ul>
        <Link className="ds-btn" to={`${P}/agents`}>Monitor agents</Link>
      </section>
      <Say items={['run the kora backend search again and tell me whats new', 'put the top 5 from the payments pool in front of kora', 'stop the medlink search, kora is urgent']} />
    </Frame>
  );
}

// ---------------- Clients and mandates ----------------
export function Clients() {
  const { w, a, focus } = useAg();
  const ms = agencyMandates(w, focus);
  return (
    <Frame title={`${clientName(w, focus)}: ${ms.length} open mandates`} kicker="Agency · clients and mandates" here={`${P}/clients`}>
      <MandateList w={w} a={a} ms={ms} />
      <Say items={[`who is in the ${clientShort(w, focus).toLowerCase()} pipeline`, 'any conflicts between clients?']} />
    </Frame>
  );
}
function MandateList({ w, a, ms }: { w: World; a: Actor; ms: MandateX[] }) {
  if (!ms.length) return <Empty>No mandates for this client yet. Tell Q about the role and it will draft one.</Empty>;
  return (
    <div className="agency-grid">
      {ms.map((m) => {
        const ok = canSeeMandate(w, a, m);
        const ppl = w.pipeline.filter((p) => p.mandateId === m.id && !isWithdrawn(w, p.personId));
        return (
          <article key={m.id} className="ds-sheet agency-card" aria-labelledby={`m-${m.id}`}>
            <div className="agency-row"><h3 id={`m-${m.id}`} className="t19" style={{ margin: 0 }}>{m.title}</h3>{m.confidential && <span className="ds-tag" data-k="warn">Confidential</span>}</div>
            {ok ? <>
              <p className="t14 muted" style={{ margin: 0 }}>{m.plain}</p>
              <p className="t14" style={{ margin: 0 }}><b>{m.workMode === 'ONSITE' ? 'On-site' : m.workMode === 'REMOTE' ? 'Remote only' : 'Hybrid'}</b> · {m.location} · {m.status.toLowerCase()} · {ppl.length} people</p>
            </> : <p className="t14" style={{ margin: 0 }}>Details hidden: you don’t have access to this confidential record.</p>}
            <Link className="ds-btn" to={`${P}/mandate/${m.id}`}>{ok ? 'Open mandate' : 'Why can’t I see this?'}</Link>
          </article>
        );
      })}
    </div>
  );
}
export function ClientPage({ id }: { id: string }) {
  const { w, a, focus } = useAg();
  useEffect(() => { if (focus !== id && clientIds(w).includes(id)) update((d) => setFocus(d, a.id, id)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!clientIds(w).includes(id)) return <Frame title="Not one of your clients" kicker="Agency" here="" switcher={false}><Empty>Talentbridge doesn’t recruit for this organisation, so there’s nothing to show.</Empty></Frame>;
  const ms = agencyMandates(w, id);
  return (
    <Frame title={`${clientName(w, id)} · ${ms.length} mandates, ${pipelineFor(w, id).filter((p) => !isWithdrawn(w, p.personId)).length} people`} kicker="Agency · client" here={`${P}/clients`}>
      <MandateList w={w} a={a} ms={ms} />
      <section className="ds-sheet" aria-labelledby="cl-quick"><h2 id="cl-quick" className="voice t24">{clientShort(w, id)} at a glance</h2>
        <ul className="agency-list">
          <li><span>{poolsFor(w, id).length} talent pools, {searchesFor(w, id).length} saved searches</span><Link className="ds-btn" to={`${P}/pools`}>Pools</Link></li>
          <li><span>{submittalsFor(w, id).length} submittals</span><Link className="ds-btn" to={`${P}/submittals`}>Submittals</Link></li>
          <li><span>{notesFor(w, id).length} team notes</span><Link className="ds-btn" to={`${P}/notes`}>Notes</Link></li>
          <li><span>{docsFor(w, id).length} documents</span><Link className="ds-btn" to={`${P}/docs`}>Documents</Link></li>
        </ul>
      </section>
    </Frame>
  );
}
export function MandatePage({ id }: { id: string }) {
  const { w, a, A } = useAg();
  const m = mandateOf(w, id);
  if (!m || !m.clientOrgId || !clientIds(w).includes(m.clientOrgId)) return <Frame title="Mandate not found" kicker="Agency" here="" switcher={false}><Empty>This mandate doesn’t exist or isn’t one of Talentbridge’s.</Empty></Frame>;
  if (!canSeeMandate(w, a, m)) {
    const req = A.access.find((r) => r.actorId === a.id && r.recordId === m.id);
    return (
      <Frame title="You don’t have access to this record" kicker={`${clientName(w, m.clientOrgId)} · confidential mandate`} here={`${P}/clients`} switcher={false}>
        <div className="ds-banner" data-k="risk" role="alert"><Glyph k="none" /><span><b>Permission denied.</b> {deniedReason(w, a, m)}</span><span /></div>
        <section className="ds-sheet" style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0 }}>You can still use {clientShort(w, m.clientOrgId)}’s pools and saved searches. If you need this record for research, ask Dele. You’ll only see it if he agrees, and the request is logged.</p>
          {req?.state === 'PENDING' ? <p className="ds-tag" data-k="busy" role="status" style={{ justifySelf: 'start' }}>Access requested {fmtDay(req.at)} · waiting for Dele</p>
            : req?.state === 'DECLINED' ? <p className="ds-tag" data-k="risk" role="status" style={{ justifySelf: 'start' }}>Dele declined this request</p>
              : <button type="button" className="ds-btn primary" style={{ justifySelf: 'start' }} onClick={() => doOp('agency.access.request', { id: m.id }, 'Request access')}>Request access from Dele</button>}
          <Link to={`${P}/pools`} className="ds-btn" style={{ justifySelf: 'start' }}>Go to {clientShort(w, m.clientOrgId)}’s pools</Link>
        </section>
      </Frame>
    );
  }
  const ppl = w.pipeline.filter((p) => p.mandateId === m.id);
  return (
    <Frame title={m.title} kicker={`${clientName(w, m.clientOrgId)} · mandate v${m.versions.length}${m.confidential ? ' · confidential' : ''}`} here={`${P}/clients`} switcher={false}>
      {m.confidential && <div className="ds-banner" data-k="warn" role="note"><Glyph k="partial" /><span><b>Confidential.</b> {clientShort(w, m.clientOrgId)} asked that this hire isn’t discussed outside Talentbridge. Viewers need Dele’s permission to see it.</span><span /></div>}
      <section className="ds-sheet" style={{ display: 'grid', gap: 10 }}>
        <p style={{ margin: 0 }}>{m.plain}. <b>{m.workMode === 'ONSITE' ? 'On-site' : m.workMode === 'REMOTE' ? 'Remote only' : 'Hybrid'}</b>, {m.location}. ₦{(m.pay.min / 1e6).toFixed(1)}m–₦{(m.pay.max / 1e6).toFixed(1)}m a month.</p>
        <ul className="agency-reqs">{m.requirements.map((r) => <li key={r.reqId}><b>{r.label}</b>{r.mustHave ? ' (must have)' : ' (nice to have)'}: {r.plain}</li>)}</ul>
      </section>
      <section className="ds-sheet" aria-labelledby="md-pipe"><h2 id="md-pipe" className="voice t24">People ({ppl.filter((p) => !isWithdrawn(w, p.personId)).length})</h2>
        <ul className="agency-list">{ppl.map((p) => <li key={p.personId} data-out={isWithdrawn(w, p.personId) ? '1' : undefined}><span><b>{personName(w, p.personId)}</b> · {isWithdrawn(w, p.personId) ? 'Removed: withdrew consent' : STAGE_LABEL[p.stage]}{p.note ? ` · ${p.note}` : ''}</span>{consentTag(w, p.personId, m.clientOrgId!)}</li>)}</ul>
      </section>
    </Frame>
  );
}

// ---------------- Pools ----------------
export function Pools() {
  const { w, a, focus } = useAg();
  const pools = poolsFor(w, focus);
  return (
    <Frame title={`${clientShort(w, focus)}: ${pools.length} talent ${pools.length === 1 ? 'pool' : 'pools'}, ${pools.reduce((n, p) => n + ranked(w, p).length, 0)} people`} kicker="Agency · talent pools" here={`${P}/pools`}>
      {!pools.length && <Empty>No pools for this client yet.</Empty>}
      {pools.map((p) => <PoolCard key={p.id} w={w} a={a} pool={p} />)}
      <Say items={[`compare the ${pools[0]?.name.toLowerCase() ?? 'payments'} pool`, `put the top 3 from the ${pools[0]?.name.toLowerCase() ?? 'payments'} pool in front of ${clientShort(w, focus).toLowerCase()}`]} />
    </Frame>
  );
}
function PoolCard({ w, a, pool }: { w: World; a: Actor; pool: Pool }) {
  const live = ranked(w, pool); const gone = removedMembers(w, pool);
  const [who, setWho] = useState(live[0] ?? '');
  return (
    <section className="ds-sheet agency-pool" aria-labelledby={`pool-${pool.id}`}>
      <div className="agency-row"><h2 id={`pool-${pool.id}`} className="voice t24">{pool.name}</h2><span className="t14 muted">For {mandateOf(w, pool.mandateId)?.title}</span></div>
      <ul className="agency-people">{live.map((pid, i) => {
        const s = mustHavesShown(w, pool.mandateId, pid);
        return <li key={pid}><span className="num rank">{i + 1}</span><span className="who"><b>{personName(w, pid)}</b><span className="t14 muted">{w.people.find((x) => x.personId === pid)?.headline}</span></span><span className="t14">{s.shown} of {s.of} must-haves shown</span>{consentTag(w, pid, pool.clientOrgId)}</li>;
      })}</ul>
      {gone.length > 0 && <div className="agency-removed" role="note"><b>Removed from this pool</b>{gone.map((pid) => <p key={pid} className="t14" style={{ margin: 0 }}>{personName(w, pid)}: {lc(consentReason(w, pid, pool.clientOrgId))}. Not searchable, contactable or submittable.</p>)}</div>}
      {canAct(a) && live.length > 0 && (
        <details className="agency-demo"><summary>Simulate a candidate withdrawing consent <span className="ds-sim">Simulated</span></summary>
          <div className="agency-row" style={{ marginTop: 8 }}>
            <label className="sr" htmlFor={`wd-${pool.id}`}>Candidate</label>
            <select id={`wd-${pool.id}`} className="ds-input" value={who} onChange={(e) => setWho(e.target.value)}>{live.map((pid) => <option key={pid} value={pid}>{personName(w, pid)}</option>)}</select>
            <button type="button" className="ds-btn" onClick={() => who && doOp('agency.consent.withdraw', { personId: who }, 'Withdraw consent')}>Withdraw their consent</button>
          </div>
          <p className="t14 muted" style={{ margin: '6px 0 0' }}>In the real product only the candidate can do this, from their own account.</p>
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
    <Frame title={`${clientShort(w, focus)}: ${list.length} saved ${list.length === 1 ? 'search' : 'searches'}`} kicker="Agency · saved searches" here={`${P}/searches`}>
      {!list.length && <Empty>No saved searches for this client.</Empty>}
      {list.map((s) => {
        const pending = s.universe.filter((u) => u.since > s.lastRunAt && u.since <= t && !isWithdrawn(w, u.personId) && !s.results.includes(u.personId)).length;
        return (
          <section key={s.id} className="ds-sheet agency-search" aria-labelledby={`ss-${s.id}`}>
            <div className="agency-row"><h2 id={`ss-${s.id}`} className="t19" style={{ margin: 0 }}>{s.name}</h2>{pending > 0 && <span className="ds-tag" data-k="busy">{pending} new waiting</span>}</div>
            <p className="t14 muted" style={{ margin: 0 }}><code className="agency-code">{s.query}</code> · last run {fmtDay(s.lastRunAt)} · run {s.runs} times</p>
            <ul className="agency-list" aria-label="Results">{s.results.map((pid) => <li key={pid}><span><b>{personName(w, pid)}</b> · {w.people.find((x) => x.personId === pid)?.headline}</span>{s.newSinceLast.includes(pid) ? <span className="ds-tag" data-k="busy">New since last run</span> : <span className="t14 muted">Seen before</span>}</li>)}</ul>
            {s.universe.some((u) => isWithdrawn(w, u.personId) && u.since <= t) && <p className="t14 muted" style={{ margin: 0 }}>Not shown: {s.universe.filter((u) => isWithdrawn(w, u.personId)).map((u) => personName(w, u.personId)).join(', ')} (withdrew consent).</p>}
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
  if (!pool) return <Frame title="Nothing to compare" kicker="Agency · compare" here={`${P}/compare`}><Empty>This client has no pools yet.</Empty></Frame>;
  const m = mandateOf(w, pool.mandateId)!;
  const people = ranked(w, pool);
  return (
    <Frame title={`${personName(w, people[0] ?? '')} shows the most for ${m.title}`} kicker={`Agency · compare · ${clientShort(w, focus)}`} here={`${P}/compare`}>
      <div className="agency-switch" role="group" aria-label="Pool">{pools.map((p) => <button key={p.id} type="button" className="ds-filter" aria-pressed={p.id === pool.id} onClick={() => setSel(p.id)}>{p.name}</button>)}</div>
      <p className="t14 muted" style={{ margin: 0 }}>Ranked by how many of the must-haves each person’s evidence shows, strongest kind first. Not a score: open a person to see the evidence. Withdrawn candidates are not compared.</p>
      <ul className="agency-cmp-list" aria-label={`Evidence per requirement, ${pool.name}`}>{people.map((pid) => { const f = fitOf(w, m.id, pid); return (
        <li key={pid} className="ds-sheet"><div className="agency-row"><b>{personName(w, pid)}</b>{consentTag(w, pid, focus)}</div>
          <ul>{m.requirements.map((r) => { const k = glyphOf(f[r.reqId] ?? 'none'); return <li key={r.reqId}><span className="agency-glyph"><Glyph k={k} size={16} />{GLYPH_LABEL[k]}</span><span className="t14">{r.label}{r.mustHave ? '' : ' (nice)'}</span></li>; })}</ul></li>
      ); })}</ul>
      <div className="ds-table-wrap agency-cmp-table">
        <table className="ds-table agency-compare">
          <caption className="sr">Evidence for each requirement of {m.title}, {clientName(w, focus)} pool {pool.name}</caption>
          <thead><tr><th scope="col">Person</th>{m.requirements.map((r) => <th key={r.reqId} scope="col">{r.label}{r.mustHave ? '' : ' (nice)'}</th>)}<th scope="col">Consent</th></tr></thead>
          <tbody>{people.map((pid) => { const f = fitOf(w, m.id, pid); return (
            <tr key={pid}><th scope="row">{personName(w, pid)}</th>{m.requirements.map((r) => { const k = glyphOf(f[r.reqId] ?? 'none'); return <td key={r.reqId}><span className="agency-glyph"><Glyph k={k} size={16} />{GLYPH_LABEL[k]}</span></td>; })}<td>{consentTag(w, pid, focus)}</td></tr>
          ); })}</tbody>
        </table>
      </div>
      <Say items={[`put the top 3 from the ${pool.name.toLowerCase()} pool in front of ${clientShort(w, focus).toLowerCase()}`]} />
    </Frame>
  );
}

// ---------------- Campaigns ----------------
export function Campaigns() {
  const { w, a, focus } = useAg();
  const list = campaignsFor(w, focus);
  const org = w.orgs.find((o) => o.id === 'org_tb')!;
  return (
    <Frame title={`${clientShort(w, focus)}: ${list.length} ${list.length === 1 ? 'campaign' : 'campaigns'}`} kicker="Agency · outreach campaigns" here={`${P}/campaigns`}>
      <div className="ds-banner" role="note"><Glyph k="full" /><span><b>Approval setting: {org.delegation === 'APPROVED_CAMPAIGN' ? 'approved campaign' : org.delegation.toLowerCase()}.</b> You approve a campaign once (who, what it says, its limits). Q then sends within those limits without asking for each message, and stops at any limit. Sends are simulated.</span><span /></div>
      {!list.length && <Empty>No campaigns for this client.</Empty>}
      {list.map((c) => {
        const pool = agency(w).pools.find((p) => p.id === c.poolId)!;
        const signed = briefSigned(w, c.mandateId);
        const sample = messageFor(w, c.template, ranked(w, pool)[0] ?? pool.members[0]);
        return (
          <section key={c.id} className="ds-sheet agency-camp" aria-labelledby={`cp-${c.id}`}>
            <div className="agency-row"><h2 id={`cp-${c.id}`} className="t19" style={{ margin: 0 }}>{c.name}</h2><span className="ds-tag" data-k={c.status === 'RUNNING' ? 'busy' : c.status === 'DONE' ? 'ok' : undefined}>{c.status === 'DRAFT' ? 'Draft' : c.status === 'RUNNING' ? 'Sending' : c.status === 'PAUSED' ? 'Waiting for next run' : 'Done'}</span></div>
            <p className="t14 muted" style={{ margin: 0 }}>To the {pool.name} pool · for {mandateOf(w, c.mandateId)?.title}</p>
            <dl className="agency-limits"><div><dt>Per run</dt><dd className="num">{c.limits.perRun}</dd></div><div><dt>Per day</dt><dd className="num">{c.limits.perDay}</dd></div><div><dt>Words per message</dt><dd className="num">≤ {c.limits.maxWords}</dd></div><div><dt>Follow-ups</dt><dd className="num">{c.limits.followUps}</dd></div></dl>
            <blockquote className="ds-quote">{sample}</blockquote>
            {c.messages.length > 0 && <ul className="agency-list" aria-label="Messages">{c.messages.map((m) => <li key={m.personId} data-out={m.status === 'EXCLUDED' ? '1' : undefined}><span><b>{personName(w, m.personId)}</b>{m.reason ? ` · ${m.reason}` : ''}{m.receipt ? ` · receipt ${m.receipt}` : ''}</span><span className="ds-tag" data-k={m.status === 'SENT_SIMULATED' ? 'ok' : m.status === 'EXCLUDED' ? 'risk' : m.status === 'HELD' ? 'warn' : 'busy'}>{m.status === 'SENT_SIMULATED' ? 'Sent (simulated)' : m.status === 'EXCLUDED' ? 'Excluded' : m.status === 'HELD' ? 'Held' : 'Queued'}</span></li>)}</ul>}
            {!signed && <div className="ds-banner" data-k="warn" role="status"><Glyph k="partial" /><span>Can’t launch: {clientShort(w, c.clientOrgId)}’s brief for this role isn’t signed. Talentbridge rule: “Campaigns need a signed client brief”.</span><Link className="ds-btn" to={`${P}/docs`}>Documents</Link></div>}
            {c.status === 'DRAFT' && signed && (canAct(a)
              ? <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => ask(`launch the ${clientShort(w, c.clientOrgId).toLowerCase()} campaign`)}>Review and launch with Q</button></div>
              : <p className="t14 muted" style={{ margin: 0 }}>Only Dele or an admin can launch campaigns.</p>)}
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
    <Frame title={`${clientShort(w, focus)}: ${list.filter((s) => s.status === 'DRAFT').length} draft, ${list.filter((s) => s.status !== 'DRAFT').length} sent`} kicker="Agency · submittals" here={`${P}/submittals`}>
      {!list.length && <Empty>Nothing submitted to {clientName(w, focus)} yet. Try: “put the top 5 from the payments pool in front of kora”.</Empty>}
      {list.map((s) => {
        const inc = s.people.filter((p) => p.included);
        return (
          <section key={s.id} className="ds-sheet agency-sub" aria-labelledby={`sb-${s.id}`}>
            <div className="agency-row"><h2 id={`sb-${s.id}`} className="t19" style={{ margin: 0 }}>{mandateOf(w, s.mandateId)?.title}</h2><span className="ds-tag" data-k={s.status === 'DRAFT' ? 'warn' : s.status === 'CLIENT_REPLIED' ? 'ok' : 'busy'}>{s.status === 'DRAFT' ? 'Draft · needs your yes' : s.status === 'CLIENT_REPLIED' ? 'Client replied' : `Sent ${fmtDay(s.sentAt)} (simulated)`}</span></div>
            <ul className="agency-list">{s.people.map((p) => (
              <li key={p.personId} data-out={p.included ? undefined : '1'}>
                <span><b>{personName(w, p.personId)}</b>{p.included ? '' : ` · not included: ${p.reason ?? consentReason(w, p.personId, s.clientOrgId)}`}</span>
                {consentTag(w, p.personId, s.clientOrgId)}
                {s.status === 'DRAFT' && canAct(a) && <button type="button" className="ds-btn quiet" aria-pressed={p.included} onClick={() => doOp('agency.submittal.toggle', { id: s.id, personId: p.personId }, 'Toggle')}>{p.included ? 'Leave out' : 'Include'}</button>}
              </li>
            ))}</ul>
            {s.status === 'DRAFT' && (canAct(a) ? <div className="agency-approve" role="group" aria-label="Approval">
              <p className="t14" style={{ margin: 0 }}><b>Effect:</b> sends {inc.length} {inc.length === 1 ? 'profile' : 'profiles'} to {clientName(w, s.clientOrgId)}. Consent is checked again for each person at the moment of sending. Simulated: nothing leaves Talent Q.</p>
              <div className="ds-actions"><button type="button" className="ds-btn primary" disabled={!inc.length} onClick={() => doOp('agency.submittal.send', { id: s.id }, 'Send')}>Send to {clientShort(w, s.clientOrgId)} (simulated)</button><button type="button" className="ds-btn quiet" onClick={() => doOp('agency.submittal.discard', { id: s.id }, 'Discard')}>Discard draft</button></div>
            </div> : <p className="t14 muted" style={{ margin: 0 }}>Only Dele or an admin can send submittals.</p>)}
            {s.status === 'SENT_SIMULATED' && <p className="t14 muted" style={{ margin: 0 }}>Receipt {s.receipt}. {s.nudgedAt ? `Nudged ${fmtDay(s.nudgedAt)}.` : 'No reply yet.'} {canAct(a) && !s.nudgedAt && <button type="button" className="ds-linkbtn agency-link" onClick={() => doOp('agency.submittal.nudge', { id: s.id }, 'Nudge')}>Send a nudge</button>} <button type="button" className="ds-linkbtn agency-link" onClick={() => doOp('agency.submittal.reply', { id: s.id, text: 'Thanks, we’d like to meet the first two next week.' }, 'Reply')}>Simulate a client reply</button></p>}
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
  const mine = A.notes.filter((n) => n.mentions.includes(a.id));
  const [text, setText] = useState('');
  useEffect(() => { if (A.notes.some((n) => n.mentions.includes(a.id) && !n.readBy.includes(a.id) && n.clientOrgId === focus)) setTimeout(() => doOp('agency.note.read', {}, 'read'), 1500); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Frame title={`${clientShort(w, focus)}: ${list.length} team notes`} kicker="Agency · collaboration" here={`${P}/notes`}>
      <form className="ds-sheet agency-noteform" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { ask(`note for ${clientShort(w, focus).toLowerCase()}: ${text.trim()}`); setText(''); } }}>
        <div className="ds-field"><label htmlFor="ag-note">Add a note for the {clientShort(w, focus)} team</label><textarea id="ag-note" className="ds-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type @Tunde or @Dele to mention someone" /></div>
        <button type="submit" className="ds-btn primary" style={{ justifySelf: 'start' }} disabled={!text.trim()}>Add note</button>
        <p className="t14 muted" style={{ margin: 0 }}>Internal to Talentbridge. {clientShort(w, focus)} never sees these notes.</p>
      </form>
      {mine.filter((n) => n.clientOrgId === focus).length > 0 && <p className="t14" style={{ margin: 0 }}><b>Mentions you:</b> {mine.filter((n) => n.clientOrgId === focus).length}</p>}
      {!list.length ? <Empty>No notes for {clientName(w, focus)} yet.</Empty> : <ul className="agency-notes">{list.map((n) => (
        <li key={n.id} className="ds-sheet" data-mine={n.mentions.includes(a.id) ? '1' : undefined}>
          <div className="agency-row"><b>{actorOf(w, n.by).name}</b><span className="t14 muted">{new Date(n.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
          <p style={{ margin: 0 }}>{n.text.split(/(@\w+)/).map((s, i) => s.startsWith('@') ? <mark key={i} className="agency-mention">{s}</mark> : s)}</p>
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
    <Frame title={`${running.length} running${failed ? `, ${failed} failed` : ''}${paused ? `, ${paused} paused` : ''}`} kicker="Agency · agents" here={`${P}/agents`} switcher={false}
      aside={<QMark mood={failed ? 'blocked' : running.length ? 'working' : 'idle'} agents={agents} size={44} title={`Q: ${running.length} agents working`} />}>
      <p className="t14 muted" style={{ margin: 0 }}>Up to three agents run at once; the rest wait in priority order. Progress moves only when an agent finishes a unit of work (one profile read, one message sent). Each client’s agents are listed separately and only ever read that client’s criteria. <span className="ds-sim">Simulated</span></p>
      {clientIds(w).map((c) => {
        const rs = runsFor(w, c);
        return (
          <section key={c} className="agency-runs" aria-labelledby={`rn-${c}`}>
            <h2 id={`rn-${c}`} className="voice t24">{clientName(w, c)}</h2>
            {!rs.length && <Empty>No agents for {clientShort(w, c)}.</Empty>}
            {[...rs].sort((x, y) => x.priority - y.priority).map((r) => <RunCard key={r.id} w={w} a={a} r={r} />)}
          </section>
        );
      })}
      <Say items={['stop the medlink search, kora is urgent', 'resume medlink', 'what happened to the ops search?']} />
    </Frame>
  );
}
function RunCard({ w, a, r }: { w: World; a: Actor; r: AgentRun }) {
  const [log, setLog] = useState(false);
  const act = canAct(a);
  const btn = (label: string, op: string, args: Record<string, unknown> = {}, primary = false) => <button type="button" className={`ds-btn ${primary ? 'primary' : ''}`} disabled={!act} onClick={() => doOp(op, { id: r.id, ...args }, label)}>{label}</button>;
  return (
    <article className="ds-sheet agency-run" data-state={r.state} aria-labelledby={`run-${r.id}`}>
      <div className="agency-row">
        <h3 id={`run-${r.id}`} className="t19" style={{ margin: 0 }}>{r.label}</h3>
        {runTag(r)}
        <span className="ds-tag" data-k={r.priority === 1 ? 'busy' : undefined}>{PRIORITY[r.priority]}</span>
      </div>
      <p className="t14 muted" style={{ margin: 0 }}>{r.kind === 'SEARCH' ? 'Sourcing agent' : r.kind === 'EVIDENCE' ? 'Evidence agent' : 'Campaign sender'} · {r.provider}{r.providerState === 'DOWN' ? ' · not responding' : r.providerState === 'RECOVERED' ? ' · recovered' : r.providerState === 'SKIPPED' ? ' · skipped' : ''} · attempt {Math.max(1, r.attempts)}</p>
      <div className="agency-row agency-prog"><Bar done={r.done} total={r.total} label={`${r.label} progress`} failed={r.state === 'FAILED'} /><span className="num">{r.done}/{r.total} {r.kind === 'CAMPAIGN' ? 'sent' : r.kind === 'EVIDENCE' ? 'checked' : 'profiles'}</span></div>
      {r.state === 'FAILED' && <div className="ds-banner" data-k="risk" role="alert"><Glyph k="none" /><span><b>{r.provider} isn’t responding.</b> {r.done} finished units are kept. {r.retryInTicks ? 'Q will retry once automatically.' : 'Q retried once automatically; it’s still down.'} Other agents are unaffected.</span><span /></div>}
      {r.state === 'PAUSED' && r.pausedReason && <p className="t14" role="status" style={{ margin: 0 }}><b>Paused.</b> {r.pausedReason}</p>}
      {r.found.length > 0 && <p className="t14" style={{ margin: 0 }}>New matches: {r.found.map((p) => personName(w, p)).join(', ')}</p>}
      <div className="ds-actions">
        {(r.state === 'RUNNING' || r.state === 'QUEUED' || r.state === 'RETRYING') && btn('Pause', 'agency.run.pause')}
        {r.state === 'PAUSED' && btn('Resume', 'agency.run.resume', {}, true)}
        {r.state === 'FAILED' && <>{btn('Retry now', 'agency.run.retry', {}, true)}{btn(`Skip ${r.provider}`, 'agency.run.skip')}</>}
        {!['DONE', 'CANCELLED'].includes(r.state) && r.priority > 1 && btn('Make urgent', 'agency.run.priority', { p: 1 })}
        {!['DONE', 'CANCELLED'].includes(r.state) && r.priority < 3 && btn('Lower priority', 'agency.run.priority', { p: 3 })}
        {!['DONE', 'CANCELLED'].includes(r.state) && <button type="button" className="ds-btn quiet" disabled={!act} onClick={() => { if (confirm(`Cancel ${r.label}? Finished work is kept, but it can’t be resumed.`)) doOp('agency.run.cancel', { id: r.id }, 'Cancel'); }}>Cancel</button>}
        <button type="button" className="ds-btn quiet" aria-expanded={log} onClick={() => setLog(!log)}>{log ? 'Hide activity' : 'Activity'}</button>
      </div>
      {!act && <p className="t14 muted" style={{ margin: 0 }}>Viewers can watch agents but not control them.</p>}
      {log && <ol className="agency-log" aria-label={`${r.label} activity`}>{r.log.slice(-8).map((l, i) => <li key={i} data-k={l.k}>{l.text}</li>)}</ol>}
    </article>
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
    <Frame title={`${clientShort(w, focus)}: ${visible.length} documents`} kicker="Agency · client documents" here={`${P}/docs`}>
      <ul className="agency-docs">{visible.map((d) => (
        <li key={d.id} className="ds-sheet">
          <div className="agency-row"><b>{d.name}</b>{d.kind === 'BRIEF' && <span className="ds-tag" data-k={d.signed ? 'ok' : 'warn'}>{d.signed ? 'Signed brief' : 'Not signed'}</span>}{d.confidential && <span className="ds-tag" data-k="warn">Confidential</span>}</div>
          {d.status === 'UPLOADING' ? <div className="agency-row agency-prog"><Bar done={d.progress} total={100} label={`Uploading ${d.name}`} /><span className="num t14">{d.progress}%</span></div> : <p className="t14 muted" style={{ margin: 0 }}>{d.summary}</p>}
          <span className="t14 muted">Added {fmtDay(d.at)} by {actorOf(w, d.by).first}{d.mandateId ? ` · ${mandateOf(w, d.mandateId)?.title}` : ''}</span>
        </li>
      ))}</ul>
      {all.length > visible.length && <p className="t14" role="note" style={{ margin: 0 }}>{all.length - visible.length} confidential document hidden for your role. Ask Dele for access if you need it.</p>}
      {!all.length && <Empty>No documents for this client yet.</Empty>}
      {canAct(a) ? (
        <form className="ds-sheet agency-upload" onSubmit={(e) => { e.preventDefault(); doOp('agency.doc.upload', { client: focus, name: pick }, 'Upload'); }}>
          <div className="ds-field"><label htmlFor="ag-up">Upload a document <span className="ds-sim">Simulated file</span></label>
            <select id="ag-up" className="ds-input" value={pick} onChange={(e) => setPick(e.target.value)}>{PRESETS.map((p) => <option key={p}>{p}</option>)}</select></div>
          <button type="submit" className="ds-btn primary" style={{ justifySelf: 'start' }}>Upload to {clientShort(w, focus)}</button>
        </form>
      ) : <p className="t14 muted" style={{ margin: 0 }}>Viewers can read documents but not upload them.</p>}
      <Say items={[`upload the signed ${clientShort(w, focus).toLowerCase()} brief`]} />
    </Frame>
  );
}

// ---------------- Client reports: Q drafts, Dele edits, then shares (simulated) ----------------
export function Reports() {
  const { w, a, A, focus } = useAg();
  const rep = A.reports[focus];
  return (
    <Frame title={rep ? `${clientShort(w, focus)} report · v${rep.v} ${rep.status === 'SHARED_SIMULATED' ? 'shared' : rep.status === 'EDITED' ? 'edited' : 'draft'}` : `No ${clientShort(w, focus)} report yet`} kicker="Agency · client reporting" here={`${P}/reports`}>
      {!rep ? (
        <section className="ds-sheet" style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0 }}>Q drafts the report from {clientName(w, focus)}’s records only: its mandates, people, submittals and outreach. You edit it, then share it. Nothing about other clients can appear in it.</p>
          {canAct(a) ? <button type="button" className="ds-btn primary" style={{ justifySelf: 'start' }} onClick={() => ask(`draft the ${clientShort(w, focus).toLowerCase()} report`)}>Draft it with Q</button> : <p className="t14 muted" style={{ margin: 0 }}>Only Dele or an admin can draft client reports.</p>}
        </section>
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
      <div className="ds-banner" data-k={chk.ok ? undefined : 'risk'} role="status"><Glyph k={chk.ok ? 'verified' : 'none'} /><span>{chk.ok ? <><b>Isolation check passed.</b> Names only {clientShort(w, rep.clientOrgId)}’s own candidates and roles ({peopleFor(w, rep.clientOrgId).length} people on record).</> : <><b>Can’t be shared as written.</b> It names {[...chk.foreignPeople, ...chk.foreignClients].join(', ')}, outside {clientShort(w, rep.clientOrgId)}’s records.</>}</span><span /></div>
      <article className="ds-sheet agency-report" aria-label={`${clientName(w, rep.clientOrgId)} report, version ${rep.v}`}>
        {secs.map((s, i) => (
          <section key={s.id} aria-labelledby={`rs-${s.id}`}>
            <h2 id={`rs-${s.id}`} className="t19">{s.h}</h2>
            {edit ? <><label className="sr" htmlFor={`rt-${s.id}`}>{s.h}</label><textarea id={`rt-${s.id}`} className="ds-input" rows={3} value={s.body} onChange={(e) => setSecs(secs.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))} /></> : <p style={{ margin: 0 }}>{s.body}</p>}
          </section>
        ))}
      </article>
      {act && <div className="ds-actions">
        {edit ? <><button type="button" className="ds-btn primary" onClick={() => { doOp('agency.report.save', { client: rep.clientOrgId, sections: secs }, 'Save'); setEdit(false); }}>Save as version {rep.v + 1}</button><button type="button" className="ds-btn quiet" onClick={() => { setSecs(rep.sections); setEdit(false); }}>Discard edits</button></>
          : <><button type="button" className="ds-btn" onClick={() => setEdit(true)}>Edit</button>
            {rep.status !== 'SHARED_SIMULATED' && <button type="button" className="ds-btn primary" disabled={!chk.ok} onClick={() => ask(`share the ${clientShort(w, rep.clientOrgId).toLowerCase()} report`)}>Share with {clientShort(w, rep.clientOrgId)}…</button>}
            <button type="button" className="ds-btn quiet" onClick={() => doOp('agency.report.draft', { client: rep.clientOrgId }, 'Redraft')}>Redraft from latest records</button></>}
      </div>}
      {rep.status === 'SHARED_SIMULATED' && <p className="t14" role="status" style={{ margin: 0 }}>Shared {fmtDay(rep.sharedAt)} · receipt {rep.receipt} (simulated).</p>}
      <details className="agency-demo"><summary>Versions ({rep.history.length})</summary><ol className="agency-log">{rep.history.map((h) => <li key={h.v}>v{h.v} · {fmtDay(h.at)} · {h.note}</li>)}</ol></details>
    </>
  );
}

export const askActions = (xs: QAction[]) => xs;
