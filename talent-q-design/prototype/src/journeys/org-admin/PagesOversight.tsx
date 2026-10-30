// ORG-ADMIN oversight pages: enterprise compliance dashboard (SC-141), organisation reports (SC-142), model and
// scoring version inspector with provider routes (SC-144, V03), quality checks without invented statistics
// (SC-145, D17), what Q learned from consented outcomes (V29); and the candidate's own channel choices (V09).
import { useState } from 'react';
import { actorOf, eventsFor, orgOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { SwitchRow } from '../../ds/Switch';
import { Link } from '../../ui/router';
import { oa } from '../../state/areas/org-admin';
import { rubrics } from '../../state/areas/rubrics';
import { mandatesOf, nameOf, orgMembers, ROLE_LABEL, tDay } from '../hire-c/lib';
import type { OrgRole } from '../../state/domain';
import { act, AdminFrame, Empty, Sheet, Tag } from './Frame';
import { billingOf, CHECK_K, CHECK_LABEL, choiceOf, contactable, level, OPT_LABEL, qualityChecks, roleReport, usd, WA_LABEL } from './model';

const d10 = (iso?: string) => (iso ? tDay(iso.length === 10 ? `${iso}T12:00:00Z` : iso, 'Africa/Lagos') : '');

// ================= SC-141 Enterprise compliance dashboard =================
export function Compliance() {
  const w = useWorld((x) => x); const a = actorOf(w); const st = oa(w);
  const mem = orgMembers(w, a.orgId);
  const byRole = (['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'VIEWER'] as OrgRole[]).map((r) => ({ r, n: mem.filter((m) => (m.role ?? 'VIEWER') === r).length })).filter((x) => x.n);
  const people = contactable(w, a.orgId);
  const withdrawn = Object.values(w.consents).filter((c) => c.withdrawnFrom.includes(a.orgId ?? '')).length;
  const waUnknown = people.filter((p) => ['NOT_ASKED', 'ASKED'].includes(choiceOf(w, p).whatsapp)).length;
  const emailOff = people.filter((p) => w.consents[p]?.notifications.email === false).length;
  const ret = st.retention.find((r) => r.orgId === a.orgId);
  const incidents = st.incidents.filter((i) => i.orgId === a.orgId);
  const open = incidents.filter((i) => i.state === 'OPEN');
  const refusals = w.events.filter((e) => e.scope === `ORG:${a.orgId}` && /refused|declined/.test(e.type)).length;
  const [note, setNote] = useState<Record<string, string>>({});
  const tiles: [string, string, string, string][] = [
    ['Members', String(mem.length), `${byRole.filter((x) => x.r === 'ADMIN' || x.r === 'OWNER').reduce((s, x) => s + x.n, 0)} can change settings`, '/r/team'],
    ['Consent withdrawn', String(withdrawn), 'people who withdrew from you (names hidden)', '/r/admin/channels'],
    ['Retention', `${ret?.rules.filter((r) => r.status === 'PROPOSED_D9').length ?? 0} proposed`, `${ret?.deletions.filter((d) => d.state === 'OPEN').length ?? 0} deletion request waiting`, '/r/admin/retention'],
    ['Open incidents', String(open.length), `${incidents.length - open.length} resolved`, '#cp-inc'],
  ];
  return (
    <AdminFrame sec="compliance" title="Compliance" lede={open.length ? `${open.length} open incident${open.length === 1 ? '' : 's'}. Nothing was sent because of ${open.length === 1 ? 'it' : 'them'}.` : 'No open incidents.'}
      index={[{ id: 'cp-sum', label: 'Summary' }, { id: 'cp-access', label: 'Access' }, { id: 'cp-consent', label: 'Consent' }, { id: 'cp-inc', label: 'Incidents' }]}>
      {() => (<>
        <section id="cp-sum" className="oa-tiles" aria-label="Summary">{tiles.map(([k, v, s, to]) => <Link key={k} to={to.startsWith('#') ? '/r/admin/compliance' : to} className="oa-tile" onClick={to.startsWith('#') ? (e) => { e.preventDefault(); document.getElementById(to.slice(1))?.scrollIntoView(); } : undefined}><span className="lab">{k}</span><b className="num voice t30">{v}</b><span className="t14 muted">{s}</span></Link>)}</section>
        <Sheet id="cp-access" title="Who can do what" note={<>Roles and their powers are on <Link to="/r/team">Team</Link>. Role changes are in the audit log.</>}>
          <ul className="oa-chips">{byRole.map((x) => <li key={x.r}><Tag>{ROLE_LABEL[x.r]} · <span className="num">{x.n}</span></Tag></li>)}</ul>
        </Sheet>
        <Sheet id="cp-consent" title="Consent" note="Counts only. Unknown is shown as unknown, never as zero.">
          <dl className="oa-dl"><dt>Candidates in conversation</dt><dd className="num">{people.length}</dd><dt>Email turned off</dt><dd className="num">{emailOff}</dd><dt>WhatsApp: not asked or no answer</dt><dd className="num">{waUnknown} <span className="t14 muted">(unknown, not a no)</span></dd><dt>Withdrew from {orgOf(w, a.orgId)?.name}</dt><dd className="num">{withdrawn}</dd><dt>Q declined to score a protected trait</dt><dd className="num">{refusals}</dd></dl>
        </Sheet>
        <Sheet id="cp-inc" title="Incidents" note="Anything that went, or nearly went, against a rule. Resolving one needs a short note.">
          {incidents.length === 0 ? <Empty title="No incidents recorded" /> : <ul className="oa-list">{incidents.map((i) => (
            <li key={i.id}><div className="oa-li-main"><span className="oa-li-tags"><Tag k={i.state === 'OPEN' ? (i.severity === 'LOW' ? 'warn' : 'risk') : 'ok'}>{i.state === 'OPEN' ? `Open · ${i.severity.toLowerCase()}` : '✓ Resolved'}</Tag></span><b>{i.title}</b><span className="t14 muted">{d10(i.at)} · {i.detail}</span>{i.note && <span className="t14">Note: {i.note}{i.resolvedBy ? ` (${nameOf(w, i.resolvedBy)})` : ''}</span>}</div>
              {i.state === 'OPEN' && <div className="oa-row"><label className="ds-field"><span className="sr">Note for {i.title}</span><input className="ds-input" placeholder="What was done" value={note[i.id] ?? ''} onChange={(e) => setNote({ ...note, [i.id]: e.target.value })} /></label><button type="button" className="ds-btn" onClick={() => act('oa.inc.resolve', { id: i.id, note: note[i.id] })}>Resolve</button></div>}</li>))}</ul>}
          <Link to="/r/audit" className="t14">Everything else is in the audit log</Link>
        </Sheet>
      </>)}
    </AdminFrame>
  );
}

// ================= SC-142 Organisation reports =================
export function Reports() {
  const w = useWorld((x) => x); const a = actorOf(w); const rows = roleReport(w, a);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const max = Math.max(1, ...rows.map((r) => r.days ?? 0));
  const b = level(w, a, 'billing') !== 'NONE' ? billingOf(w, a.orgId) : undefined;
  const hm = a.role === 'HIRING_MANAGER';
  const known = rows.filter((r) => r.days !== null);
  return (
    <AdminFrame sec="reports" title="Reports" lede={known.length ? `Fastest shortlist: ${known.sort((x, y) => x.days! - y.days!)[0].title}, in ${known[0].days} day${known[0].days === 1 ? '' : 's'}.` : 'No role has a shortlist yet.'}
      empty={rows.length ? undefined : <Empty title="No roles to report on">{hm ? 'You aren’t hiring for any role yet.' : 'Open a role to see reports.'}</Empty>}
      aside={<div className="ds-views" role="group" aria-label="Show as"><button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button><button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button></div>}>
      {() => (<>
        {hm && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>Showing the {rows.length} role{rows.length === 1 ? '' : 's'} you hire for. Costs and other teams’ roles are for admins and recruiters.</span><span /></div>}
        <Sheet id="rp-tts" title="Days from opening to first shortlist" note="From the role’s first version to the first person shortlisted. Read from your pipeline; nothing is estimated.">
          {view === 'chart' ? <ul className="oa-bars" aria-label="Days to first shortlist by role">{rows.map((r) => (
            <li key={r.id} title={r.days === null ? `${r.title}: no shortlist yet` : `${r.title}: ${r.days} days`}><span className="oa-bar-l">{r.title}</span>
              {r.days === null ? <span className="t14 muted">No shortlist yet</span> : <span className="oa-bar-w"><span className="oa-bar" style={{ width: `${Math.max(4, (100 * r.days) / max)}%` }} /><span className="num t14">{r.days} d</span></span>}</li>))}</ul>
            : <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Days to first shortlist"><table className="ds-table oa-table"><thead><tr><th scope="col">Role</th><th scope="col">Opened</th><th scope="col">First shortlist</th><th scope="col" className="num">Days</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.id}><th scope="row">{r.title}</th><td>{r.opened ? d10(r.opened) : 'Not recorded'}</td><td>{r.shortlistedAt ? d10(r.shortlistedAt) : 'Not yet'}</td><td className="num">{r.days ?? '—'}</td></tr>)}</tbody></table></div>}
        </Sheet>
        <Sheet id="rp-eng" title="Candidate engagement" note="People in the pipeline, conversations started and replies received, per role.">
          <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Engagement by role"><table className="ds-table oa-table">
            <thead><tr><th scope="col">Role</th><th scope="col" className="num">People</th><th scope="col" className="num">Shortlisted</th><th scope="col" className="num">Contacted</th><th scope="col" className="num">Replied</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}><th scope="row">{r.title}</th><td className="num">{r.people}</td><td className="num">{r.shortlisted}</td><td className="num">{r.contacted}</td><td className="num">{r.replied}</td></tr>)}</tbody>
          </table></div>
          <p className="t14 muted" style={{ margin: 0 }}>“Contacted” counts simulated sends. A reply includes candidates who wrote first.</p>
        </Sheet>
        {b && <Sheet id="rp-cost" title="Cost" note="Talent Q usage only. Your own staff time and other tools are not counted.">
          <dl className="oa-dl"><dt>Agent compute this month</dt><dd className="num">{usd(b.budget.spent)} <span className="t14 muted">(simulated)</span></dd><dt>Plan</dt><dd>{b.plan}: {b.hypothesis} <Tag k="warn">Hypothesis</Tag></dd><dt>Cost per role</dt><dd>Not tracked per role yet</dd></dl>
        </Sheet>}
      </>)}
    </AdminFrame>
  );
}

// ================= SC-144 Model and scoring versions + V03 routes =================
export function Models() {
  const w = useWorld((x) => x); const a = actorOf(w); const routes = oa(w).routes[a.orgId ?? ''] ?? [];
  const mids = mandatesOf(w, a.orgId).map((m) => m.id);
  const rbs = rubrics(w).list.filter((r) => mids.includes(r.mandateId));
  const learned = oa(w).learnings.filter((l) => l.orgId === a.orgId && l.state === 'APPROVED');
  const [open, setOpen] = useState<string | null>(null);
  return (
    <AdminFrame sec="models" title="Models and versions" lede="Which model and route each Q task uses, its budget and what happens when it fails. All simulated: no model is called in this prototype."
      index={[{ id: 'md-routes', label: 'Routes' }, { id: 'md-scoring', label: 'Scoring' }, { id: 'md-learned', label: 'Learned' }]}>
      {(lv) => (<>
        <Sheet id="md-routes" title="Routes by task" note="Cheap, fast models first; a larger one only where the task needs it. Each call has a budget and a timeout, and a fallback that never sends or decides on its own.">
          <ul className="oa-list">{routes.map((r) => (
            <li key={r.id}><div className="oa-li-main">
              <span className="oa-li-tags"><Tag k="busy">Simulated</Tag><Tag k={r.rollout === 'PAUSED' ? 'warn' : r.rollout === 'ALL' ? 'ok' : undefined}>{r.version} · {r.rollout === 'ALL' ? 'everyone' : r.rollout === 'PILOT' ? 'pilot' : 'paused'}</Tag>{r.issues.length > 0 && <Tag k="warn">! {r.issues.length} issue</Tag>}</span>
              <b>{r.task}</b><span className="t14 muted">{r.plain}</span>
              <ol className="oa-route" aria-label={`Route for ${r.task}`}>{r.route.map((s, i) => <li key={s}>{i === 0 ? 'First: ' : 'Then: '}{s}</li>)}<li>Last resort: {r.fallback}</li></ol>
              <dl className="oa-dl oa-dl-tight"><dt>Tier</dt><dd>{r.tier}</dd><dt>Budget per call</dt><dd>{r.budget}</dd><dt>Timeout</dt><dd className="num">{r.timeoutMs >= 1000 ? `${r.timeoutMs / 1000} s` : `${r.timeoutMs} ms`}</dd><dt>Cache</dt><dd>{r.cache}</dd>{r.issues.length > 0 && <><dt>Issues</dt><dd>{r.issues.join('; ')}</dd></>}</dl>
              {r.lastTrace && open === r.id && <ol className="oa-trace" aria-label="Last simulated run">{r.lastTrace.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
            </div>
              <div className="oa-row"><button type="button" className="ds-btn quiet" onClick={() => { act('oa.model.trace', { id: r.id }); setOpen(r.id); }}>Simulate a timeout</button>
                {lv === 'EDIT' && (r.rollout === 'PAUSED' ? <button type="button" className="ds-btn quiet" onClick={() => act('oa.model.rollout', { id: r.id, rollout: 'ALL' })}>Resume</button> : <ConfirmPause id={r.id} />)}</div></li>))}</ul>
        </Sheet>
        <Sheet id="md-scoring" title="Scoring method and rubric versions" note="Prototype arithmetic, not a validated test (D17). A person reviews every rating.">
          <dl className="oa-dl"><dt>Ranking explanation</dt><dd>explain v0.3 · equal weight for must-haves unless a person changes it (D4) <Tag k="warn">Not validated</Tag></dd></dl>
          {rbs.length === 0 ? <Empty title="No rubric yet">Rubrics appear here once a role has one. <Link to="/r/roles/m_backend/rubric">Open the Senior Backend rubric</Link></Empty> : <ul className="oa-list">{rbs.map((r) => <li key={r.id}><div className="oa-li-main"><b>{mandatesOf(w, a.orgId).find((m) => m.id === r.mandateId)?.title}</b><span className="t14 muted">{r.versions.map((v) => `v${v.v} ${v.state === 'Q_PROPOSED' ? 'draft' : v.state.toLowerCase()}${v.approvedBy ? ` by ${nameOf(w, v.approvedBy)}` : ''}`).join(' · ')}</span></div><Link className="ds-btn quiet" to={`/r/roles/${r.mandateId}/rubric`}>Open</Link></li>)}</ul>}
        </Sheet>
        <Sheet id="md-learned" title="Learnings in use" note={<>Approved on <Link to="/r/admin/learning">What Q learned</Link>. Each one can be rejected there.</>}>
          {learned.length === 0 ? <Empty title="None in use">Q isn’t applying anything it learned from your outcomes.</Empty> : <ul className="oa-plain">{learned.map((l) => <li key={l.id}><b>{l.change}</b> <span className="t14 muted">· approved by {nameOf(w, l.decidedBy ?? '')}</span></li>)}</ul>}
        </Sheet>
      </>)}
    </AdminFrame>
  );
}
function ConfirmPause({ id }: { id: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="ds-btn quiet" onClick={() => setAsking(true)}>Pause this version</button>;
  return <span role="group" aria-label="Pause this version?" className="ds-confirm"><span className="t14">Pause it? Q uses the fallback.</span><button type="button" className="ds-btn" onClick={() => { setAsking(false); act('oa.model.rollout', { id, rollout: 'PAUSED' }); }}>Pause</button><button type="button" className="ds-btn quiet" autoFocus onClick={() => setAsking(false)}>Keep it</button></span>;
}

// ================= SC-145 Bias and assessment quality =================
export function Quality() {
  const w = useWorld((x) => x); const a = actorOf(w); const checks = qualityChecks(w, a.orgId); const run = oa(w).quality[a.orgId ?? ''];
  return (
    <AdminFrame sec="quality" title="Quality checks" lede="Which checks would run on assessments, and where each one stands. None produces a fairness number yet."
      aside={<button type="button" className="ds-btn" onClick={() => act('oa.quality.run')}>Run checks (simulated)</button>}>
      {() => (<>
        <div className="ds-banner" data-k="warn" role="note"><span aria-hidden="true">!</span><span>Not validated. These are the checks an adviser would sign off (decision D17). Talent Q shows their status, never a made-up statistic.</span><span /></div>
        <Sheet id="ql-checks" title="Checks" note={run ? `Last run ${d10(run.at)} by ${nameOf(w, run.by)} (simulated).` : 'Not run yet.'}>
          <ul className="oa-list">{checks.map((c) => (
            <li key={c.id}><div className="oa-li-main"><span className="oa-li-tags"><Tag k={CHECK_K[c.status]}>{c.status === 'ENFORCED' || c.status === 'WORKING' ? '✓ ' : ''}{CHECK_LABEL[c.status]}</Tag></span><b>{c.name}</b><span className="t14">{c.reading}</span></div></li>))}</ul>
        </Sheet>
        <Sheet id="ql-drift" title="Drift flags" note="Things that changed under people already assessed.">
          {(() => { const flags = rubrics(w).list.filter((r) => r.orgId === a.orgId).flatMap((r) => r.versions.filter((v) => v.changeNotice).map((v) => ({ r, v }))); return flags.length ? <ul className="oa-plain">{flags.map(({ r, v }) => <li key={`${r.id}${v.v}`}>Rubric v{v.v}: {v.changeNotice!.text} · {v.changeNotice!.decision ? 'decided' : 'decision open'}</li>)}</ul> : <Empty title="No drift flags">No rubric changed after people were rated.</Empty>; })()}
        </Sheet>
      </>)}
    </AdminFrame>
  );
}

// ================= V29 What Q learned (reviewed learning from consented outcomes) =================
export function Learning() {
  const w = useWorld((x) => x); const a = actorOf(w); const st = oa(w);
  const ls = st.learnings.filter((l) => l.orgId === a.orgId); const setting = st.learnOn[a.orgId ?? ''];
  const [why, setWhy] = useState<Record<string, string>>({});
  const proposed = ls.filter((l) => l.state === 'PROPOSED');
  return (
    <AdminFrame sec="learning" title="What Q learned" lede={proposed.length ? `${proposed.length} learning${proposed.length === 1 ? '' : 's'} to review. Q applies nothing until a reviewer says yes.` : 'Nothing waiting for review.'}
      index={[{ id: 'ln-setting', label: 'Permission' }, { id: 'ln-list', label: 'Learnings' }, { id: 'ln-never', label: 'Never used' }]}>
      {(lv) => (<>
        <Sheet id="ln-setting" title="Permission" note="Q only learns from your own organisation’s outcomes, only with this on, and only from candidates who agreed. Nothing crosses to other organisations.">
          {lv === 'EDIT' ? <SwitchRow label={`Learn from ${orgOf(w, a.orgId)?.name}’s outcomes`} help={setting ? `Last changed by ${nameOf(w, setting.by)}, ${d10(setting.at)}.` : 'Never set.'} on={!!setting?.on} onChange={() => act('oa.learn.toggle')} />
            : <p className="t14" style={{ margin: 0 }}>Learning is <b>{setting?.on ? 'on' : 'off'}</b> for {orgOf(w, a.orgId)?.name}. An admin changes it.</p>}
        </Sheet>
        <Sheet id="ln-list" title="Learnings" note="Each shows where it came from, what was left out, and how it was checked.">
          {ls.filter((l) => l.state !== 'NOT_ALLOWED').length === 0 ? <Empty title="Nothing learned yet" /> : <ul className="oa-list">{ls.filter((l) => l.state !== 'NOT_ALLOWED').map((l) => (
            <li key={l.id}><div className="oa-li-main">
              <span className="oa-li-tags"><Tag k={l.state === 'APPROVED' ? 'ok' : l.state === 'REJECTED' ? undefined : 'busy'}>{l.state === 'APPROVED' ? '✓ Approved' : l.state === 'REJECTED' ? 'Rejected' : 'Q proposes'}</Tag><Tag>{l.scope}</Tag></span>
              <b>{l.text}</b><span className="t14"><b>Change:</b> {l.change}</span>
              <dl className="oa-dl oa-dl-tight"><dt>From</dt><dd>{l.from} ({l.outcomes})</dd><dt>Left out</dt><dd>{l.excluded}</dd><dt>Permission</dt><dd>{l.consent}</dd><dt>Checked</dt><dd>{l.evaluation}</dd></dl>
              {l.decidedBy && <span className="t14 muted">{l.state === 'APPROVED' ? 'Approved' : 'Rejected'} by {nameOf(w, l.decidedBy)}{l.reason ? `: ${l.reason}` : ''}</span>}
            </div>
              {lv === 'EDIT' && l.state === 'PROPOSED' && <div className="oa-row oa-col">
                <button type="button" className="ds-btn primary" disabled={!setting?.on} onClick={() => act('oa.learn.decide', { id: l.id, ok: true })}>Approve</button>
                <label className="ds-field"><span className="sr">Why reject “{l.text}”</span><input className="ds-input" placeholder="Why reject (needed)" value={why[l.id] ?? ''} onChange={(e) => setWhy({ ...why, [l.id]: e.target.value })} /></label>
                <button type="button" className="ds-btn quiet" disabled={!(why[l.id] ?? '').trim()} onClick={() => act('oa.learn.decide', { id: l.id, ok: false, reason: why[l.id] })}>Reject</button>
                {!setting?.on && <span className="t14 muted">Turn learning on to approve.</span>}
              </div>}
              {lv === 'EDIT' && l.state === 'APPROVED' && <button type="button" className="ds-btn quiet" onClick={() => act('oa.learn.decide', { id: l.id, ok: false, reason: 'Withdrawn after review' })}>Stop using it</button>}
            </li>))}</ul>}
        </Sheet>
        <Sheet id="ln-never" title="Never used to learn" note="By design, whatever the setting.">
          <ul className="oa-plain">{ls.filter((l) => l.state === 'NOT_ALLOWED').map((l) => <li key={l.id}><b>{l.text}.</b> {l.reason}</li>)}<li><b>Anything from another organisation.</b> Each organisation’s outcomes stay its own.</li><li><b>Faces, voices, accents or emotion.</b> They are never scored, so there is nothing to learn from.</li></ul>
        </Sheet>
      </>)}
    </AdminFrame>
  );
}

// ================= V09 candidate side: my channels =================
export function MyChannels() {
  const w = useWorld((x) => x); const a = actorOf(w);
  if (a.side !== 'candidate' || !a.personId) {
    return <Canvas title="Channels" kicker="Settings" open onClose={() => {}}><section className="ds-sheet oa-sheet"><p className="t14" style={{ margin: 0 }}>Your organisation’s channels are set up in admin.</p><Link to="/r/admin/channels" className="ds-btn">Open channels</Link></section></Canvas>;
  }
  const pid = a.personId; const c = choiceOf(w, pid); const n = w.consents[pid]?.notifications;
  const asks = eventsFor(w, a.id).filter((e) => e.type === 'admin.channel.asked' && e.scope.endsWith(`:${pid}`));
  const msgs = oa(w).wa.filter((m) => m.personId === pid && m.status !== 'AWAITING_APPROVAL');
  return (
    <Canvas title="How employers may reach you" kicker="Settings · Channels" open onClose={() => {}}>
      <p className="voice t19 oa-lede">You choose. Employers see yes or no, never why.</p>
      {asks.length > 0 && (c.whatsapp === 'ASKED' || c.whatsapp === 'NOT_ASKED') && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>{asks.map((e) => e.text.split('.')[0]).at(-1)}. Answer below; saying nothing is not a yes.</span><span /></div>}
      <section className="ds-sheet oa-sheet" aria-label="Channels">
        <SwitchRow label="WhatsApp" help={`Now: ${OPT_LABEL[c.whatsapp].toLowerCase()}. Only verified employers you’re in conversation with, using approved templates.`} on={c.whatsapp === 'YES'} onChange={(v) => act('oa.me.choice', { what: 'whatsapp', value: v })} />
        <SwitchRow label="Phone calls" help={`Now: ${OPT_LABEL[c.call].toLowerCase()}. Daytime your time only. Never recorded.`} on={c.call === 'YES'} onChange={(v) => act('oa.me.choice', { what: 'call', value: v })} />
        <SwitchRow label="Text messages (SMS)" help="The same choice as in your notification settings." on={!!n?.sms} onChange={(v) => act('oa.me.choice', { what: 'sms', value: v })} />
      </section>
      <section className="ds-sheet oa-sheet" aria-labelledby="my-wa">
        <h2 id="my-wa" className="voice t24" style={{ margin: 0 }}>WhatsApp messages from employers</h2>
        {msgs.length === 0 ? <Empty title="None yet" /> : <ul className="oa-list">{msgs.map((m) => <li key={m.id}><div className="oa-li-main"><span className="oa-li-tags"><Tag k="ok">{WA_LABEL[m.status]} (simulated)</Tag></span><b>{orgOf(w, m.orgId)?.name}</b><blockquote className="oa-quote">{m.body}</blockquote></div></li>)}</ul>}
        <Link to="/settings" className="t14">All settings</Link>
      </section>
    </Canvas>
  );
}
