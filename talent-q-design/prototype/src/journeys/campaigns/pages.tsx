// /r/campaigns and /r/campaigns/:id: hiring campaigns (audit addendum §D). A campaign groups requisitions for
// navigation and workload; every number here is read live from the pipeline, threads, interviews and rubrics.
// Design notes (design-critique, interaction-design, ux-writing, dataviz; see journeys/design/campaigns.md):
//  · "Needs you" leads; roles follow with a labelled stage strip (count + stage name, never colour alone).
//  · The cross-role board is a table on desktop and one card per person on phones (no sideways scroll).
//  · Scorecards show the rubric version in force and how many are assessed; an index is only ever shown with coverage.
//  · Outreach runs (agency) are listed as children of a role, never as the campaign itself.
//  · Archive is immediate and undoable (no "are you sure?"); every change lands in the campaign's history.
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, orgOf, personOf, update, useWorld, type World } from '../../mock/world';
import type { Actor, HiringCampaign, Msg } from '../../state/domain';
import { STAGES, STAGE_LABEL } from '../../state/domain';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { PageIndex } from '../../ds/PageIndex';
import { DUR, EASE, arrive } from '../../ds/motion';
import { Link, navigate } from '../../ui/router';
import { runAction, sendToQ, useViewState } from '../../q/core/engine';
import { prefillQ } from '../../q/QThread';
import { campaigns } from '../../state/areas/campaigns';
import { ClientSwitch } from '../agency/pages';
import { AP, clientIds, clientName, setFocus } from '../agency/model';
import {
  CP, FILTER_LABEL, STATUS_WORD, accessTo, applyFilter, board, canManage, dayText, dueText, forMe, historyOf, isAgencyActor, isClosed, lensOf, messagesFor, nextActions, outreachFor,
  reqOf, reqsFor, scorecard, stageCounts, visibleCampaigns, type NextAction, type Req, type StageCounts,
} from './model';
import './campaigns.css';

const doOp = (label: string, op: string, args: Record<string, unknown> = {}) => void runAction({ label, act: { t: 'do', op, args } });
const say = (t: string) => void sendToQ(t);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const nameOf = (w: World, id: string) => w.actors.find((x) => x.id === id)?.name ?? personOf(w, id)?.name ?? id;
const firstOf = (w: World, id: string) => nameOf(w, id).split(' ')[0];
const openQ = () => { (document.querySelector('.ds-askbar button') as HTMLButtonElement | null)?.click(); };
const close = () => navigate('/r/home');

// ---------------- Stage strip: count + stage name as direct labels; empty stages folded into one line ----------------
export function StageStrip({ sc, compact = false }: { sc: StageCounts; compact?: boolean }) {
  const filled = STAGES.filter((s) => sc.counts[s] > 0);
  const empty = STAGES.filter((s) => !sc.counts[s]);
  const said = STAGES.map((s) => `${STAGE_LABEL[s]} ${sc.counts[s]}`).join(', ');
  if (!filled.length) return <p className="cp-strip-none t14 muted">No one on this role yet.</p>;
  return (
    <div className="cp-strip-wrap">
      <ol className="cp-strip" aria-label={`People by stage: ${said}`} data-compact={compact ? '1' : undefined}>
        {filled.map((s) => (
          <li key={s} data-stage={s} style={{ flexGrow: sc.counts[s] }}>
            <motion.b key={sc.counts[s]} className="num" initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.fast, ease: EASE.enter }}>{sc.counts[s]}</motion.b>
            <span>{STAGE_LABEL[s]}</span>
          </li>
        ))}
      </ol>
      {!compact && empty.length > 0 && <p className="t14 muted cp-strip-empty">None at {empty.map((s) => STAGE_LABEL[s].toLowerCase()).join(', ')}{sc.out ? ` · ${sc.out} not progressing` : ''}</p>}
    </div>
  );
}

function HiddenCount({ n }: { n: number }) {
  if (!n) return null;
  return <p className="t14 cp-hidden" role="note"><Glyph k="none" size={14} /> {n === 1 ? '1 more person isn’t' : `${n} more people aren’t`} shown: their privacy settings don’t let your organisation see them. Talent Q doesn’t say who.</p>;
}

function ActionRow({ w, x, me }: { w: World; x: NextAction; me: Actor }) {
  const go = () => { if (x.go.to) navigate(x.go.to); else if (x.go.say) say(x.go.say); else if (x.go.op) doOp(x.go.label, x.go.op.name, x.go.op.args); };
  const others = x.who.filter((id) => id !== me.id);
  return (
    <li className="cp-act" data-kind={x.kind}>
      <span className="cp-act-k lab">{x.approval ? 'Approval' : x.kind === 'REPLY' ? 'Reply' : x.kind === 'UNFILED' ? 'File' : 'Next'}</span>
      <span className="cp-act-t">{x.text}{!x.who.includes(me.id) && others.length > 0 && <span className="t14 muted"> · with {others.slice(0, 2).map((id) => firstOf(w, id)).join(' or ')}</span>}</span>
      <button type="button" className="ds-btn" onClick={go}>{x.go.label}</button>
    </li>
  );
}

// ======================================================================================================
// /r/campaigns
// ======================================================================================================
export function CampaignsList() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const org = orgOf(w, a.orgId);
  const agencyMode = isAgencyActor(w, a);
  const lens = lensOf(w, a);
  const list = visibleCampaigns(w, a);
  const active = list.filter((c) => c.status !== 'ARCHIVED');
  const archived = list.filter((c) => c.status === 'ARCHIVED');
  const reqs = org ? reqsFor(w, org.id, lens) : [];
  const loose = reqs.filter((r) => !isClosed(r) && !campaigns(w).list.some((c) => c.orgId === a.orgId && c.roles.includes(r.id)));
  const mine = active.flatMap((c) => forMe(nextActions(w, c), a)).length;
  if (!org) return (
    <Canvas title="Hiring campaigns" kicker="Hiring" open onClose={close}>
      <section className="ds-sheet cp-empty"><b>Campaigns belong to an organisation.</b><p>Set up your business with Q first, then group your roles into campaigns.</p><button type="button" className="ds-btn primary" onClick={() => say('I need to hire someone')}>Start with Q</button></section>
    </Canvas>
  );
  return (
    <Canvas title="Hiring campaigns" kicker={agencyMode ? `${org.name} · for ${clientName(w, lens!)}` : org.name} open onClose={close}
      qLine={mine ? `${plural(mine, 'thing')} across your campaigns need${mine === 1 ? 's' : ''} you.` : 'Nothing in your campaigns needs you right now.'}
      aside={<button type="button" className="ds-btn primary" onClick={() => { prefillQ(agencyMode ? `Create a hiring campaign for ${clientName(w, lens!)} called ` : 'Create a campaign called '); openQ(); }}>New campaign</button>}>
      {agencyMode && <ClientSwitch w={w} a={a} focus={lens!} />}
      <div className="cp-head">
        <p className="cp-lede"><span className="cp-q" aria-hidden="true">◆</span> {active.length ? `${plural(active.length, 'active campaign')} · ${mine ? `${plural(mine, 'thing')} need${mine === 1 ? 's' : ''} you` : 'nothing needs you right now'}.` : 'No active campaigns.'}</p>
        <p className="t14 muted">A hiring campaign groups roles so their people, messages and decisions sit together; each role stays the one place its brief and people live. {agencyMode ? <>Outreach to a talent pool is separate: it runs under one role, in <Link to={AP.campaigns}>Outreach campaigns</Link>.</> : null}</p>
      </div>
      {!active.length && (
        <section className="ds-sheet cp-empty" role="status">
          <b>{agencyMode ? `No hiring campaigns for ${clientName(w, lens!)} yet.` : 'No campaigns yet.'}</b>
          <p>Give a group of roles a name, a goal and a deadline, for example “Q1 Engineering”. Q can set it up from one sentence.</p>
          <button type="button" className="ds-btn primary" onClick={() => { prefillQ('Create a campaign called '); openQ(); }}>Create a campaign with Q</button>
        </section>
      )}
      {active.length > 0 && <ul className="cp-cards" aria-label="Active campaigns">{active.map((c) => <CampaignCard key={c.id} w={w} a={a} c={c} />)}</ul>}
      {loose.length > 0 && (
        <section className="ds-sheet cp-loose" aria-labelledby="cp-loose-h">
          <h2 id="cp-loose-h" className="lab">Not in a campaign</h2>
          <ul>{loose.map((r) => <li key={r.id}><Link to={r.href}><b>{r.title}</b></Link><span className="t14 muted">{STATUS_WORD[r.status]}</span>
            {active.length > 0 && canManage(a) && <button type="button" className="ds-btn quiet" onClick={() => say(`add the ${r.title} role to ${active[0].name}`)}>Add to {active[0].name}</button>}</li>)}</ul>
        </section>
      )}
      {archived.length > 0 && (
        <details className="ds-sheet cp-archived"><summary><b>Archived</b> <span className="num muted">{archived.length}</span></summary>
          <ul>{archived.map((c) => <li key={c.id}><Link to={CP.one(c.id)}>{c.name}</Link><span className="t14 muted">{plural(c.roles.length, 'role')}</span></li>)}</ul>
        </details>
      )}
      <p className="t14 muted">{agencyMode ? `Only ${clientName(w, lens!)}’s campaigns. ${clientIds(w).filter((x) => x !== lens).map((x) => clientName(w, x)).join(' and ')}’s stay in their own workspace.` : `Only ${org.name}’s campaigns. Other organisations’ campaigns, roles and candidates are never shown here.`}</p>
    </Canvas>
  );
}

function CampaignCard({ w, a, c }: { w: World; a: Actor; c: HiringCampaign }) {
  const acts = nextActions(w, c); const mine = forMe(acts, a).length; const appr = acts.filter((x) => x.approval).length;
  return (
    <motion.li className="ds-sheet cp-card" {...arrive}>
      <div className="cp-card-head">
        <Link to={CP.one(c.id)} className="cp-card-title voice t24">{c.name}</Link>
        <span className="cp-tags">{c.status === 'PAUSED' && <span className="ds-tag" data-k="warn">Paused</span>}{mine > 0 && <span className="ds-tag" data-k="busy">{mine} for you</span>}{appr > 0 && <span className="ds-tag">{plural(appr, 'approval')} waiting</span>}</span>
      </div>
      <p className="t14 muted cp-card-meta">{c.goal ? `${c.goal} · ` : ''}Owner {firstOf(w, c.owner)} · {dueText(w, c.deadline)}</p>
      {c.roles.length ? (
        <ul className="cp-card-roles" aria-label={`Roles in ${c.name}`}>
          {c.roles.map((rid) => { const r = reqOf(w, rid); if (!r) return null; const sc = stageCounts(w, rid, a.orgId!); return (
            <li key={rid}><span className="cp-role-name">{r.title}</span><span className="t14 muted num">{`${sc.inPlay} in play${sc.counts.INTERVIEW ? ` · ${sc.counts.INTERVIEW} at interview` : ''}${sc.hidden ? ` · ${sc.hidden} not shown` : ''}${r.status === 'DRAFT' ? ' · brief in draft' : ''}`}</span></li>
          ); })}
        </ul>
      ) : <p className="t14">No roles yet.</p>}
      <Link to={CP.one(c.id)} className="ds-btn">Open campaign<span className="sr"> {c.name}</span></Link>
    </motion.li>
  );
}

// ======================================================================================================
// /r/campaigns/:id
// ======================================================================================================
export function CampaignPage({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const acc = accessTo(w, a, id);
  const c = acc.ok ? acc.c : undefined;
  // Agency: opening a client's campaign switches the client lens to that client (one client at a time).
  useEffect(() => { if (c?.clientOrgId && isAgencyActor(w, a) && lensOf(w, a) !== c.clientOrgId) update((d) => setFocus(d, a.id, c.clientOrgId!)); }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!acc.ok) return (
    <Canvas title={acc.why === 'MISSING' ? 'Campaign not found' : 'You don’t have access to this campaign'} kicker="Hiring campaign" open onClose={close}>
      <section className="ds-sheet cp-empty" role={acc.why === 'MISSING' ? 'status' : 'alert'}>
        <p>{acc.why === 'MISSING' ? 'This campaign doesn’t exist, or the link is wrong.' : 'It belongs to another organisation. Talent Q keeps each organisation’s campaigns, roles and candidates separate, so nothing about it is shown.'}</p>
        <Link to={CP.list} className="ds-btn">See your campaigns</Link>
      </section>
    </Canvas>
  );
  return <Overview w={w} a={a} c={c!} />;
}

function Overview({ w, a, c }: { w: World; a: Actor; c: HiringCampaign }) {
  const narrow = useNarrow();
  const org = a.orgId!;
  const agencyMode = isAgencyActor(w, a);
  const acts = nextActions(w, c);
  const mine = forMe(acts, a);
  const approvals = acts.filter((x) => x.approval);
  const roles = c.roles.map((rid) => reqOf(w, rid)).filter((r): r is Req => !!r);
  const people = new Set(roles.flatMap((r) => stageCounts(w, r.id, org).people)).size;
  const archived = c.status === 'ARCHIVED';
  const outreach = outreachFor(w, c);
  const index = [
    { id: 'cp-needs', label: 'Needs you' }, { id: 'cp-roles', label: 'Roles' }, { id: 'cp-board', label: 'Board' }, { id: 'cp-scores', label: 'Scorecards' },
    { id: 'cp-msgs', label: 'Messages' }, ...(agencyMode ? [{ id: 'cp-out', label: 'Outreach' }] : []), { id: 'cp-hist', label: 'History' },
  ];
  const lede = archived ? `Archived. Its roles carry on as they are; re-open the campaign to organise them here again.`
    : !roles.length ? 'No roles yet. Add the roles this campaign is for, and their people and messages appear here.'
      : `${plural(roles.length, 'role')} · ${plural(people, 'person', 'people')} in play · ${mine.length ? `${plural(mine.length, 'thing')} need${mine.length === 1 ? 's' : ''} you` : 'nothing needs you right now'}.`;
  return (
    <Canvas title={c.name} kicker={agencyMode ? `Hiring campaign · for ${orgOf(w, c.clientOrgId)?.name}` : `Hiring campaign · ${orgOf(w, c.orgId)?.name}`} open onClose={close}
      qLine={mine.length ? `${plural(mine.length, 'thing')} here need${mine.length === 1 ? 's' : ''} you.` : 'Nothing here needs you right now.'}
      aside={<span className="cp-tags">{archived ? <span className="ds-tag">Archived</span> : c.status === 'PAUSED' ? <span className="ds-tag" data-k="warn">Paused</span> : <span className="ds-tag" data-k="ok">Active</span>}<span className="ds-tag num">{dueText(w, c.deadline)}</span></span>}>
      <div className="cp-head">
        <p className="cp-lede"><span className="cp-q" aria-hidden="true">◆</span> {lede}</p>
        <p className="t14 muted">{c.goal ? `${c.goal}. ` : ''}Owner {nameOf(w, c.owner)}. <Link to={CP.list}>All campaigns</Link></p>
      </div>
      {agencyMode && <ClientSwitch w={w} a={a} focus={c.clientOrgId ?? lensOf(w, a)!} />}
      {archived && <div className="ds-banner" role="status"><Glyph k="partial" /><span><b>This campaign is archived.</b> Nothing was closed or sent: the roles, their people and messages are unchanged.</span>{canManage(a) ? <button type="button" className="ds-btn primary" onClick={() => doOp('Re-open', 'campaigns.reopen', { id: c.id })}>Re-open</button> : <span />}</div>}
      <PageIndex items={index} label="Sections of this campaign" />

      <section id="cp-needs" className="ds-sheet cp-sec" aria-labelledby="cp-needs-h">
        <div className="cp-sec-head"><h2 id="cp-needs-h" className="t19">Needs you <span className="num muted">{mine.length}</span></h2><span className="t14 muted">{plural(approvals.length, 'approval')} waiting in this campaign</span></div>
        {mine.length ? <ul className="cp-acts">{mine.map((x) => <ActionRow key={x.id} w={w} x={x} me={a} />)}</ul> : <p className="t14 muted">Nothing is waiting on you here.</p>}
        {acts.length > mine.length && (
          <details className="cp-others"><summary className="t14">Waiting on others <span className="num">{acts.length - mine.length}</span></summary>
            <ul className="cp-acts">{acts.filter((x) => !mine.includes(x)).map((x) => <ActionRow key={x.id} w={w} x={x} me={a} />)}</ul>
          </details>
        )}
      </section>

      <section id="cp-roles" className="ds-sheet cp-sec" aria-labelledby="cp-roles-h">
        <div className="cp-sec-head"><h2 id="cp-roles-h" className="t19">Roles <span className="num muted">{roles.length}</span></h2>{!archived && canManage(a) && <AddRole w={w} a={a} c={c} />}</div>
        {!roles.length ? <div className="cp-empty" role="status"><b>No roles yet.</b><p className="t14">Add a role and its brief, people and messages show up here. The role itself doesn’t change.</p></div>
          : <ul className="cp-roles">{roles.map((r) => <RoleRow key={r.id} w={w} a={a} c={c} r={r} acts={acts.filter((x) => x.roleId === r.id)} />)}</ul>}
      </section>

      <Board w={w} a={a} c={c} narrow={narrow} />
      {agencyMode ? (
        <section id="cp-scores" className="ds-sheet cp-sec" aria-labelledby="cp-scores-h"><h2 id="cp-scores-h" className="t19">Scorecards by role</h2>
          <p className="t14">{orgOf(w, c.clientOrgId)?.name} assesses candidates against its own rubrics. Those scorecards belong to the client and aren’t shared with Talentbridge, so none are shown here.</p></section>
      ) : <Scorecards w={w} a={a} c={c} roles={roles} />}
      <Messages w={w} a={a} c={c} roles={roles} agencyMode={agencyMode} />
      {agencyMode && (
        <section id="cp-out" className="ds-sheet cp-sec" aria-labelledby="cp-out-h">
          <div className="cp-sec-head"><h2 id="cp-out-h" className="t19">Outreach runs <span className="num muted">{outreach.length}</span></h2><Link to={AP.campaigns} className="t14">All outreach</Link></div>
          <p className="t14 muted">Outreach campaigns message a talent pool for one role. They sit under that role, inside this hiring campaign; they aren’t the campaign.</p>
          {outreach.length ? <ul className="cp-list">{outreach.map((o) => <li key={o.id}><span><b>{o.name}</b><span className="t14 muted"> · for {reqOf(w, o.mandateId)?.title}</span></span><span className="ds-tag" data-k={o.status === 'RUNNING' ? 'busy' : o.status === 'DONE' ? 'ok' : undefined}>{o.status === 'DRAFT' ? 'Draft' : o.status === 'RUNNING' ? 'Sending' : o.status === 'DONE' ? 'Done' : o.status.toLowerCase()}</span></li>)}</ul>
            : <p className="t14">No outreach runs for these roles.</p>}
        </section>
      )}
      <History w={w} a={a} c={c} />
    </Canvas>
  );
}

function RoleRow({ w, a, c, r, acts }: { w: World; a: Actor; c: HiringCampaign; r: Req; acts: NextAction[] }) {
  const sc = stageCounts(w, r.id, a.orgId!);
  const meta = campaigns(w).roleMeta[r.id] ?? {};
  const ivs = w.interviews.filter((i) => i.mandateId === r.id && i.orgId === a.orgId && i.status !== 'CANCELLED').length;
  const next = acts[0];
  return (
    <motion.li className="cp-role" layout transition={{ duration: DUR.normal, ease: EASE.standard }}>
      <div className="cp-role-head">
        <span className="cp-role-title"><Link to={r.href} className="voice t19">{r.title}</Link>{r.confidential && <span className="ds-tag" data-k="warn">Confidential</span>}</span>
        <span className="ds-tag" data-k={r.status === 'DRAFT' ? 'busy' : isClosed(r) ? undefined : 'ok'}>{STATUS_WORD[r.status]}</span>
      </div>
      <p className="t14 muted cp-role-meta">Owner {firstOf(w, r.owner)} · due {meta.due ? dayText(meta.due) : c.deadline ? `${dayText(c.deadline)} (campaign)` : 'not set'}{ivs ? ` · ${plural(ivs, 'interview')}` : ''}</p>
      <StageStrip sc={sc} />
      <HiddenCount n={sc.hidden} />
      {next && <p className="cp-next t14"><span className="lab">Next</span> {next.text}</p>}
      {canManage(a) && c.status !== 'ARCHIVED' && <button type="button" className="ds-linkbtn t14 cp-remove" onClick={() => doOp('Take out', 'campaigns.role.remove', { cid: c.id, rid: r.id })}>Take out of this campaign<span className="sr"> ({r.title})</span></button>}
    </motion.li>
  );
}

/** Add a role: lists every requisition with its state, so conflicts (in another campaign, closed) are seen before choosing. */
function AddRole({ w, a, c }: { w: World; a: Actor; c: HiringCampaign }) {
  const [open, setOpen] = useState(false);
  const [conflict, setConflict] = useState<{ rid: string; other: HiringCampaign } | null>(null);
  const reqs = reqsFor(w, a.orgId!, c.clientOrgId).filter((r) => !c.roles.includes(r.id));
  const inOther = (rid: string) => campaigns(w).list.find((x) => x.id !== c.id && x.orgId === c.orgId && x.roles.includes(rid));
  if (!open) return <button type="button" className="ds-btn" aria-expanded="false" onClick={() => setOpen(true)}>Add a role</button>;
  return (
    <div className="cp-add" role="group" aria-label="Add a role to this campaign">
      <div className="cp-add-head"><span className="lab">Add a role</span><button type="button" className="ds-linkbtn t14" onClick={() => { setOpen(false); setConflict(null); }}>Done</button></div>
      {!reqs.length && <p className="t14">Every role you can add is already here. Ask Q to draft a new role.</p>}
      <ul>
        {reqs.map((r) => { const o = inOther(r.id); const closed = isClosed(r); return (
          <li key={r.id} data-state={closed ? 'closed' : o ? 'other' : 'free'}>
            <span><b>{r.title}</b><span className="t14 muted" style={{ display: 'block' }}>{closed ? `${STATUS_WORD[r.status]}: re-open the role before adding it` : o ? `In “${o.name}”` : STATUS_WORD[r.status]}</span></span>
            <button type="button" className="ds-btn" disabled={closed} onClick={() => { if (o) setConflict({ rid: r.id, other: o }); else { doOp('Add', 'campaigns.role.add', { cid: c.id, rid: r.id }); } }}>{o ? 'Move here…' : 'Add'}<span className="sr"> {r.title}</span></button>
          </li>
        ); })}
      </ul>
      {conflict && (
        <div className="ds-banner" data-k="warn" role="alert"><Glyph k="unclear" />
          <span><b>{reqOf(w, conflict.rid)?.title} is in “{conflict.other.name}”.</b> A role belongs to one campaign, so it moves rather than appearing twice. Its people and messages don’t change.</span>
          <span className="cp-banner-acts"><button type="button" className="ds-btn primary" onClick={() => { doOp('Move', 'campaigns.role.add', { cid: c.id, rid: conflict.rid, move: true }); setConflict(null); }}>Move it here</button><button type="button" className="ds-btn quiet" onClick={() => setConflict(null)}>Keep it there</button></span>
        </div>
      )}
    </div>
  );
}

/** Employers open the profile; agency staff see the name only (profiles live in the client's workspace). */
function PersonName({ w, a, pid }: { w: World; a: Actor; pid: string }) {
  const n = personOf(w, pid)?.name ?? pid;
  return isAgencyActor(w, a) ? <b>{n}</b> : <Link to={`/r/people/${pid}`}><b>{n}</b></Link>;
}
// ---------------- Cross-role board with saved filters ----------------
const BUILTIN = ['all', 'multi', 'reply', 'stage:INTERVIEW', 'assessed'];
function Board({ w, a, c, narrow }: { w: World; a: Actor; c: HiringCampaign; narrow: boolean }) {
  const [q, setQ] = useViewState<string>(`filter:${c.id}`, 'all');
  const [naming, setNaming] = useState(false); const [label, setLabel] = useState('');
  const { rows, hidden } = useMemo(() => board(w, c, a.orgId!), [w, c, a.orgId]);
  const shown = applyFilter(rows, q);
  const saved = c.savedFilters ?? [];
  const isSaved = saved.some((f) => f.query === q) || q === 'all';
  const roles = c.roles.map((rid) => reqOf(w, rid)).filter((r): r is Req => !!r);
  const chip = (query: string, text: string, key = query) => <button key={key} type="button" className="ds-filter" aria-pressed={q === query} onClick={() => setQ(query)}>{text} <span className="num muted">{applyFilter(rows, query).length}</span></button>;
  return (
    <section id="cp-board" className="ds-sheet cp-sec" aria-labelledby="cp-board-h">
      <div className="cp-sec-head"><h2 id="cp-board-h" className="t19">People across roles <span className="num muted">{rows.length}</span></h2><span className="t14 muted">One row per person; a person can be on two roles</span></div>
      {rows.length > 0 && (
        <div className="cp-filters" role="group" aria-label="Filter the board">
          {BUILTIN.map((x) => chip(x, x === 'all' ? 'Everyone' : FILTER_LABEL(x, w)))}
          {saved.filter((f) => !BUILTIN.includes(f.query)).map((f) => chip(f.query, f.label, f.id))}
          {!isSaved && !naming && <button type="button" className="ds-linkbtn t14" onClick={() => { setNaming(true); setLabel(FILTER_LABEL(q, w)); }}>Save this filter</button>}
          {naming && <form className="cp-save" onSubmit={(e) => { e.preventDefault(); if (label.trim()) doOp('Save filter', 'campaigns.filter.save', { cid: c.id, label: label.trim(), query: q }); setNaming(false); }}>
            <label htmlFor="cp-fname" className="sr">Filter name</label><input id="cp-fname" className="ds-input" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus /><button type="submit" className="ds-btn">Save</button></form>}
        </div>
      )}
      {!rows.length ? <p className="t14">No one is on these roles yet. People appear here once they’re found, apply or are referred.</p>
        : !shown.length ? <p className="t14" role="status">No one matches “{FILTER_LABEL(q, w)}”. <button type="button" className="ds-linkbtn" onClick={() => setQ('all')}>Show everyone</button></p>
          : narrow ? (
            <ul className="cp-board-cards" aria-label="People across roles">
              {shown.map((r) => <motion.li key={r.personId} {...arrive}><PersonName w={w} a={a} pid={r.personId} />
                <ul>{roles.filter((x) => r.cells[x.id]).map((x) => <li key={x.id}><span className="t14">{x.title}</span><span className="ds-tag" data-stage={r.cells[x.id]}>{STAGE_LABEL[r.cells[x.id]!]}</span></li>)}</ul>
                {(r.multi || r.awaiting) && <span className="t14 muted">{[r.multi && 'On two roles', r.awaiting && 'Waiting for your reply'].filter(Boolean).join(' · ')}</span>}</motion.li>)}
            </ul>
          ) : (
            <div className="ds-table-wrap"><table className="ds-table cp-board">
              <caption className="sr">People in {c.name}, by role and stage</caption>
              <thead><tr><th scope="col">Person</th>{roles.map((x) => <th key={x.id} scope="col">{x.title}</th>)}<th scope="col">Note</th></tr></thead>
              <tbody>{shown.map((r) => <tr key={r.personId}>
                <th scope="row"><PersonName w={w} a={a} pid={r.personId} /></th>
                {roles.map((x) => <td key={x.id}>{r.cells[x.id] ? <span className="ds-tag" data-stage={r.cells[x.id]}>{STAGE_LABEL[r.cells[x.id]!]}</span> : <span className="muted" aria-label="Not on this role">·</span>}</td>)}
                <td className="t14 muted">{[r.multi && 'On two roles', r.awaiting && 'Waiting for your reply'].filter(Boolean).join(' · ')}</td>
              </tr>)}</tbody>
            </table></div>
          )}
      <HiddenCount n={hidden} />
    </section>
  );
}

// ---------------- Per-role scorecards (rubric version in force; index only with coverage) ----------------
function Scorecards({ w, a, c, roles }: { w: World; a: Actor; c: HiringCampaign; roles: Req[] }) {
  void c;
  return (
    <section id="cp-scores" className="ds-sheet cp-sec" aria-labelledby="cp-scores-h">
      <div className="cp-sec-head"><h2 id="cp-scores-h" className="t19">Scorecards by role</h2></div>
      <p className="t14 muted">Each role is assessed against its own approved rubric. The index is prototype arithmetic, not a validated test: it’s shown only with its coverage, and it can’t be compared across roles.</p>
      {!roles.length && <p className="t14">Add a role to see its scorecard.</p>}
      <ul className="cp-scores">{roles.map((r) => {
        const sc = stageCounts(w, r.id, a.orgId!); const card = scorecard(w, r.id, sc.people);
        return (
          <li key={r.id} className="cp-score">
            <div className="cp-role-head"><b>{r.title}</b>{card.v ? <span className="ds-tag num">Rubric v{card.v} in force</span> : <span className="ds-tag" data-k={card.proposed ? 'busy' : undefined}>{card.proposed ? 'Rubric proposed, not approved' : 'No approved rubric'}</span>}</div>
            {card.v ? <>
              <p className="t14"><b className="num">{card.assessed} of {plural(card.of, 'person', 'people')}</b> assessed on v{card.v}.</p>
              {card.rows.filter((x) => x.observed > 0).length > 0 && <ul className="cp-score-rows">{card.rows.filter((x) => x.observed > 0).map((x) => (
                <li key={x.personId}><span>{personOf(w, x.personId)?.name}</span>
                  <span className="cp-cov" role="img" aria-label={`Index ${x.index} at ${x.coverage}% coverage, ${x.observed} of ${x.total} criteria`}><span className="num"><b>{x.index}</b> at {x.coverage}% coverage</span><span className="cp-covbar" aria-hidden="true"><i style={{ width: `${x.coverage}%` }} /></span><span className="t14 muted num">{x.observed}/{x.total} criteria{x.reviewed < x.observed ? ` · ${x.observed - x.reviewed} not reviewed` : ''}</span></span></li>
              ))}</ul>}
            </> : <p className="t14">{r.clientOrgId ? 'Agency roles use the client’s assessment. None is shared here.' : card.proposed ? 'Q proposed a rubric. Until someone approves it, nobody is assessed.' : 'Nobody is assessed until a rubric is agreed and approved.'}</p>}
            {!r.clientOrgId && <Link to={`/r/roles/${r.id}/rubric`} className="t14">{card.v ? 'Open the rubric' : card.proposed ? 'Review the proposal' : 'Agree a rubric'}<span className="sr"> for {r.title}</span></Link>}
          </li>
        );
      })}</ul>
    </section>
  );
}

// ---------------- Messages by role (from the one correspondence store) ----------------
function Messages({ w, a, c, roles, agencyMode }: { w: World; a: Actor; c: HiringCampaign; roles: Req[]; agencyMode: boolean }) {
  const groups: { key: string; title: string; m: ReturnType<typeof messagesFor> }[] = [
    ...roles.map((r) => ({ key: r.id, title: r.title, m: messagesFor(w, a.orgId!, r.id, c.id) })),
    { key: 'unfiled', title: 'In this campaign, not filed to a role', m: messagesFor(w, a.orgId!, null, c.id) },
  ].filter((g) => g.key !== 'unfiled' || g.m.threads.length);
  const total = groups.reduce((n, g) => n + new Set(g.m.threads.map((t) => t.personId)).size, 0);
  return (
    <section id="cp-msgs" className="ds-sheet cp-sec" aria-labelledby="cp-msgs-h">
      <div className="cp-sec-head"><h2 id="cp-msgs-h" className="t19">Messages by role <span className="num muted">{total}</span></h2>{!agencyMode && <Link to="/r/messages" className="t14">All messages</Link>}</div>
      {!roles.length && <p className="t14">No roles, so no messages yet.</p>}
      <ul className="cp-msgs">{groups.map((g) => (
        <li key={g.key}>
          <div className="cp-role-head"><b>{g.title}</b><span className="t14 muted num">{plural(new Set(g.m.threads.map((t) => t.personId)).size, 'person', 'people')}{g.m.awaitingReply.length ? ` · ${new Set(g.m.awaitingReply.map((t) => t.personId)).size} waiting for a reply` : ''}{g.m.toApprove ? ` · ${g.m.toApprove} to approve` : ''}</span></div>
          {g.m.threads.length ? <ul className="cp-threads">{byPerson(g.m.threads).slice(0, 4).map(({ pid, l, them, n }) => (
            <li key={pid}><button type="button" className="cp-thread" onClick={() => doOp('Open thread', 'campaigns.thread', { pid })}>
              <span><b>{personOf(w, pid)?.name}</b>{them && <span className="ds-tag">They wrote first</span>}{n > 1 && <span className="t14 muted num">{n} conversations</span>}</span>
              <span className="t14 muted cp-ellip">{l.from === pid ? '' : 'You: '}{l.body.replace(/\s+/g, ' ').slice(0, 90)}</span>
              <span className="t14 num muted">{dayText(l.at)}{l.from === pid ? ' · needs a reply' : ''}</span>
            </button></li>
          ))}</ul> : <p className="t14 muted">No conversations for this role yet.</p>}
        </li>
      ))}</ul>
    </section>
  );
}

/** One row per person (their conversations about this role merged), latest message first, like the messages hub. */
function byPerson(threads: ReturnType<typeof messagesFor>['threads']) {
  const m = new Map<string, { pid: string; l: Msg; them: boolean; n: number }>();
  for (const t of threads) {
    const l = t.messages.filter((x) => x.status !== 'DISCARDED').slice(-1)[0]; if (!l) continue;
    const cur = m.get(t.personId);
    if (!cur) m.set(t.personId, { pid: t.personId, l, them: t.initiatedBy === 'CANDIDATE', n: 1 });
    else { cur.n++; cur.them ||= t.initiatedBy === 'CANDIDATE'; if (l.at > cur.l.at) cur.l = l; }
  }
  return [...m.values()].sort((x, y) => y.l.at.localeCompare(x.l.at));
}
// ---------------- History, archive and re-open ----------------
function History({ w, a, c }: { w: World; a: Actor; c: HiringCampaign }) {
  const h = historyOf(w, c);
  const archived = c.status === 'ARCHIVED';
  const open = c.roles.map((rid) => reqOf(w, rid)).filter((r) => r && !isClosed(r)).length;
  return (
    <section id="cp-hist" className="ds-sheet cp-sec" aria-labelledby="cp-hist-h">
      <div className="cp-sec-head"><h2 id="cp-hist-h" className="t19">History</h2>
        {canManage(a) && (archived
          ? <button type="button" className="ds-btn" onClick={() => doOp('Re-open', 'campaigns.reopen', { id: c.id })}>Re-open campaign</button>
          : <button type="button" className="ds-btn quiet" onClick={() => doOp('Archive', 'campaigns.archive', { id: c.id })}>Archive campaign</button>)}
      </div>
      {!archived && canManage(a) && <p className="t14 muted">Archiving only takes it off your active list{open ? `; its ${plural(open, 'open role')} keep${open === 1 ? 's' : ''} going` : ''}. You can undo it or re-open it any time.</p>}
      {h.length ? <ol className="cp-hist">{h.slice(0, 12).map((e) => <li key={e.id}><span className="num t14 muted">{dayText(e.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><span className="t14">{e.text}</span></li>)}</ol>
        : <p className="t14 muted">Created {dayText(c.createdAt)} by {nameOf(w, c.createdBy)}. Changes made from now on are listed here.</p>}
    </section>
  );
}

/** Q's live card for a campaign (thread is ink): roles, people in play and what needs the reader. */
export function CampaignRef({ id }: { id: string }): JSX.Element | null {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const acc = accessTo(w, a, id);
  if (!acc.ok) return null;
  const c = acc.c; const acts = nextActions(w, c); const mine = forMe(acts, a);
  return (
    <div className="cp-ref" aria-label={`Campaign ${c.name}`}>
      <span className="cp-ref-head"><span className="lab">{c.status === 'ARCHIVED' ? 'Archived campaign' : 'Hiring campaign'}</span><span className="num t14">{dueText(w, c.deadline)}</span></span>
      <b>{c.name}</b>
      {c.roles.length ? <ul>{c.roles.map((rid) => { const r = reqOf(w, rid); if (!r) return null; const sc = stageCounts(w, rid, a.orgId!); return <li key={rid}><span>{r.title}</span><span className="num">{`${sc.inPlay} in play${sc.counts.INTERVIEW ? `, ${sc.counts.INTERVIEW} at interview` : ''}${r.status === 'DRAFT' ? ', brief in draft' : ''}`}</span></li>; })}</ul> : <span className="t14">No roles yet.</span>}
      {mine.length > 0 && <span className="t14">Needs you: {mine.slice(0, 3).map((x) => x.text.replace(/: (reply|find people)$/, '')).join('; ')}{mine.length > 3 ? `; and ${mine.length - 3} more` : ''}.</span>}
    </div>
  );
}
