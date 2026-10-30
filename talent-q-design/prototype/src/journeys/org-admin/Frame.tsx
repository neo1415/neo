// The admin frame shared by every ORG-ADMIN page: one canvas, a section switcher (link row on desktop, a select on
// phones so nothing scrolls sideways), the permission state, and review states by link (?state=loading|empty|error).
// Tenancy: every page reads the signed-in person's organisation only; there is no organisation picker.
import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import { actorOf, orgOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { PageIndex } from '../../ds/PageIndex';
import { arrive, DUR, EASE } from '../../ds/motion';
import { Link, navigate, useRoute } from '../../ui/router';
import { runAction, sendToQ } from '../../q/core/engine';
import { registerRef } from '../../q/refs';
import { BASE, budgetShare, billingOf, deniedWhy, isAdmin, level, reviewState, SECTIONS, secOf, usd, type Level, type Sec } from './model';
import { oa } from '../../state/areas/org-admin';
import './org-admin.css';

export const act = (op: string, args: Record<string, unknown> = {}, label = op) => runAction({ label, act: { t: 'do', op, args } });
export const ask = (text: string) => void sendToQ(text);

/** A labelled status word with a shape, never colour alone. */
export function Tag({ k, children }: { k?: string; children: ReactNode }) { return <span className="ds-tag" data-k={k || undefined}>{children}</span>; }
export function Sheet({ id, title, note, children, aside }: { id: string; title: string; note?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="ds-sheet oa-sheet" id={id} aria-labelledby={`${id}-h`}>
      <div className="oa-head"><div><h2 id={`${id}-h`} className="voice t24">{title}</h2>{note && <p className="t14 muted oa-note">{note}</p>}</div>{aside}</div>
      {children}
    </section>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="oa-empty" role="status"><b>{title}</b>{children && <span className="t14 muted">{children}</span>}</div>;
}

function Sections({ sec }: { sec?: Sec }) {
  const w = useWorld((x) => x); const a = actorOf(w);
  const list = SECTIONS.filter((s) => level(w, a, s.id) !== 'NONE');
  return (
    <nav className="oa-secnav" aria-label="Admin sections">
      <ul className="oa-seclinks">
        <li><Link to={BASE} current={!sec}>Overview</Link></li>
        {list.map((s) => <li key={s.id}><Link to={s.path} current={s.id === sec}>{s.label}</Link></li>)}
      </ul>
      <label className="oa-secselect ds-field"><span className="sr">Admin section</span>
        <select className="ds-input" value={sec ? secOf(sec).path : BASE} onChange={(e) => navigate(e.target.value)}>
          <option value={BASE}>Overview</option>
          {list.map((s) => <option key={s.id} value={s.path}>{s.label}</option>)}
        </select>
      </label>
    </nav>
  );
}

function Skeleton() {
  return <div className="oa-skel" role="status" aria-label="Loading"><span className="ds-skeleton" style={{ height: 22, width: '40%' }} /><span className="ds-skeleton" style={{ height: 90 }} /><span className="ds-skeleton" style={{ height: 90 }} /><span className="sr">Loading…</span></div>;
}

/** Frame for one section. Children get the person's access level for that section. */
export function AdminFrame({ sec, title, lede, aside, index, empty, children }: {
  sec: Sec; title: string; lede?: ReactNode; aside?: ReactNode; index?: { id: string; label: string }[];
  /** Shown instead of the page when there is nothing yet (or forced with ?state=empty). */ empty?: ReactNode | null;
  children: (lv: Level) => ReactNode;
}) {
  const w = useWorld((x) => x); const a = actorOf(w); const o = orgOf(w, a.orgId);
  const { path, query } = useRoute(); const st = reviewState(query);
  const lv = level(w, a, sec);
  const kicker = `${o?.name ?? 'No organisation'} · ${secOf(sec).group === 'You' ? 'Just you' : 'Admin'}`;
  if (!o || a.side !== 'recruiter') return <Canvas title={title} kicker="Admin" open onClose={() => {}}><Empty title="Set up your organisation first">Admin settings belong to an organisation. Tell Q about your business to create one.</Empty></Canvas>;
  if (lv === 'NONE') {
    return (
      <Canvas title={title} kicker={kicker} open onClose={() => {}}>
        <Sections sec={sec} />
        <section className="ds-sheet oa-denied" role="alert">
          <b>You can’t open {secOf(sec).label.toLowerCase()}.</b>
          <p className="t14" style={{ margin: 0 }}>{deniedWhy(w, a, sec)} Nothing from this page is shown to you, and asking Q won’t show it either.</p>
          <Link className="ds-btn" to={BASE}>Back to admin overview</Link>
        </section>
      </Canvas>
    );
  }
  const retry = () => navigate(path);
  return (
    <Canvas title={title} kicker={kicker} open onClose={() => {}} aside={aside}>
      <Sections sec={sec} />
      {lede && <p className="voice t19 oa-lede">{lede}</p>}
      {lv === 'VIEW' && sec !== 'instructions' && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>You can read this. {isAdmin(a) ? '' : `Changes are made by an admin.`}</span><span /></div>}
      {st === 'loading' ? <Skeleton />
        : st === 'error' ? <div className="ds-banner" data-k="risk" role="alert"><span aria-hidden="true">!</span><span>Couldn’t load {secOf(sec).label.toLowerCase()}. The service didn’t answer (simulated). Your settings are unchanged.</span><button type="button" className="ds-btn" onClick={retry}>Try again</button></div>
        : st === 'empty' || (empty !== undefined && empty !== null) ? (empty ?? <Empty title="Nothing here yet" />)
        : <>{index && <PageIndex items={index} />}{children(lv)}</>}
    </Canvas>
  );
}

// ---------------- MO-035: the agent budget warning (used on billing and as a live card in Q's thread) ----------------
export function BudgetWarning({ orgId, compact }: { orgId?: string; compact?: boolean }) {
  const w = useWorld((x) => x); const a = actorOf(w); const b = billingOf(w, orgId); if (!b) return null;
  const share = budgetShare(b); const over = share >= b.budget.warnAt; const admin = isAdmin(a) && a.orgId === orgId;
  if (!over && compact) return null;
  return (
    <motion.div className="oa-budget" data-over={over ? '1' : undefined} data-paused={b.budget.paused ? '1' : undefined} role={over && !b.budget.decision ? 'alert' : 'group'} aria-label="Agent budget" {...(over ? arrive : {})}>
      <div className="oa-budget-row">
        <span className="lab">Agent budget this month</span>
        <span className="num"><b>{usd(b.budget.spent)}</b> of {usd(b.budget.cap)} · {Math.round(share * 100)}%</span>
      </div>
      <div className="oa-meter" aria-hidden="true">
        <motion.span className="fill" initial={false} animate={{ width: `${Math.min(100, share * 100)}%` }} transition={{ duration: DUR.slow, ease: EASE.standard }} />
        <span className="mark" style={{ left: `${b.budget.warnAt * 100}%` }} />
      </div>
      {over && (
        <div className="oa-budget-warn">
          <p className="t14" style={{ margin: 0 }}><b>{b.budget.paused ? 'New agent runs are paused.' : b.budget.decision === 'SPEND' ? `Cap raised to ${usd(b.budget.cap)}.` : `Past ${Math.round(b.budget.warnAt * 100)}% of the agent budget.`}</b>{' '}
            {b.budget.paused ? 'Runs already going finish. Nothing new starts this month.' : b.budget.decision === 'SPEND' ? 'Nothing is charged in this prototype.' : 'Runs keep going until the cap; then they stop and ask. Simulated cost, no charge.'}</p>
          {admin && !b.budget.decision && <div className="oa-row"><button type="button" className="ds-btn" onClick={() => act('oa.bill.decide', { decision: 'STOP' })}>Pause new runs</button><button type="button" className="ds-btn quiet" onClick={() => act('oa.bill.decide', { decision: 'SPEND', extra: 10 })}>Allow $10 more</button></div>}
          {admin && b.budget.paused && <button type="button" className="ds-btn quiet" onClick={() => act('oa.bill.resume')}>Let runs start again</button>}
          {!admin && !b.budget.decision && <p className="t14 muted" style={{ margin: 0 }}>An admin decides whether to pause or allow more.</p>}
        </div>
      )}
    </motion.div>
  );
}
registerRef('oa.budget', ({ id }) => <div className="ds oa-refcard"><BudgetWarning orgId={id} /><Link to={`${BASE}/billing`} className="t14">Open billing and usage</Link></div>);

// ---------------- Overview (hub) ----------------
export function Hub() {
  const w = useWorld((x) => x); const a = actorOf(w); const o = orgOf(w, a.orgId); const st = oa(w);
  if (!o || a.side !== 'recruiter') return <Canvas title="Admin" kicker="Admin" open onClose={() => {}}><Empty title="Set up your organisation first">Admin settings belong to an organisation. Tell Q about your business to create one.</Empty></Canvas>;
  const b = billingOf(w, a.orgId);
  const needs: Partial<Record<Sec, string>> = {
    templates: (() => { const n = st.templates.filter((t) => t.orgId === a.orgId && t.state === 'PROPOSED').length; return n ? `${n} waiting for approval` : ''; })(),
    channels: (() => { const n = st.channels.filter((c) => c.orgId === a.orgId && c.state !== 'VERIFIED').length; return n ? `${n} not verified` : ''; })(),
    billing: b && budgetShare(b) >= b.budget.warnAt ? `Budget at ${Math.round(budgetShare(b) * 100)}%` : b?.requests.some((r) => r.state === 'OPEN') ? '1 budget request' : '',
    retention: (() => { const n = st.retention.find((r) => r.orgId === a.orgId)?.deletions.filter((d) => d.state === 'OPEN').length ?? 0; return n ? `${n} deletion request` : ''; })(),
    compliance: (() => { const n = st.incidents.filter((i) => i.orgId === a.orgId && i.state === 'OPEN').length; return n ? `${n} open incident${n === 1 ? '' : 's'}` : ''; })(),
    learning: (() => { const n = st.learnings.filter((l) => l.orgId === a.orgId && l.state === 'PROPOSED').length; return n ? `${n} to review` : ''; })(),
    sources: (() => { const n = st.sources.filter((s) => s.orgId === a.orgId && (s.health === 'EXPIRING' || s.health === 'DEGRADED')).length; return n ? `${n} need attention` : ''; })(),
    placements: (() => { const n = st.placements.filter((p) => p.orgId === a.orgId && (p.dispute?.state === 'OPEN' || p.invoice.state === 'DRAFT')).length; return n ? `${n} need you` : ''; })(),
  };
  const groups = (['You', 'Organisation', 'Oversight'] as const).map((g) => ({ g, items: SECTIONS.filter((s) => s.group === g && level(w, a, s.id) !== 'NONE') })).filter((x) => x.items.length);
  const hidden = SECTIONS.filter((s) => level(w, a, s.id) === 'NONE' && !(s.id === 'placements' && o.kind !== 'AGENCY'));
  return (
    <Canvas title="Admin" kicker={`${o.name} · ${a.name}`} open onClose={() => {}} aside={<Link to="/r/audit" className="ds-btn">Audit log</Link>}>
      <p className="voice t19 oa-lede">{isAdmin(a) ? `Everything ${o.name} has set up for Q, and what needs you.` : `What you can see and set for ${o.name}.`}</p>
      {b && <BudgetWarning orgId={a.orgId} compact />}
      {groups.map(({ g, items }) => (
        <section key={g} className="ds-sheet oa-sheet" aria-labelledby={`hub-${g}`}>
          <h2 id={`hub-${g}`} className="lab" style={{ margin: 0 }}>{g === 'You' ? 'Just you' : g}</h2>
          <ul className="oa-hub">
            {items.map((s) => <li key={s.id}><Link to={s.path}><b>{s.label}</b><span className="t14 muted">{HUB_LINE[s.id]}</span>{needs[s.id] ? <Tag k="warn">{needs[s.id]}</Tag> : <span className="t14 muted oa-quiet">Nothing needs you</span>}</Link></li>)}
          </ul>
        </section>
      ))}
      <section className="ds-sheet oa-sheet" aria-labelledby="hub-elsewhere">
        <h2 id="hub-elsewhere" className="lab" style={{ margin: 0 }}>Also here</h2>
        <ul className="oa-hub">
          <li><Link to="/r/setup"><b>Organisation and policy</b><span className="t14 muted">Delegation and guidelines Q checks.</span></Link></li>
          <li><Link to="/r/team"><b>Team</b><span className="t14 muted">Members and roles.</span></Link></li>
          <li><Link to="/settings/email"><b>Email settings</b><span className="t14 muted">Mailboxes, signature and email templates.</span></Link></li>
        </ul>
        {hidden.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>Not shown to you: {hidden.map((s) => s.label.toLowerCase()).join(', ')}. {deniedWhy(w, a, hidden[0].id).split('. ').slice(1).join('. ')}</p>}
      </section>
    </Canvas>
  );
}
const HUB_LINE: Record<Sec, string> = {
  instructions: 'How Q writes and works for you.', templates: 'Approved briefs, questions and scorecards.', channels: 'Email, SMS, WhatsApp and calls, and who agreed.',
  billing: 'Plan, usage and the agent budget.', retention: 'How long records are kept, and deletions.', sources: 'Where candidates and checks come from, and licences.',
  placements: 'Who you represent, attribution and invoices.', compliance: 'Access, consent, retention and incidents.', reports: 'Time to shortlist, engagement and cost.',
  models: 'Which model and route each Q task uses.', quality: 'Checks that would run, and their status.', learning: 'What Q proposes to learn, for your review.',
};
