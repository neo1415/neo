// ORG-ADMIN pages for the person and the organisation: personal instructions (SC-020), approved templates (SC-021),
// channel verification and WhatsApp/phone consent (SC-023, V09), billing and usage with the budget warning
// (SC-024, MO-035), retention and deletions (SC-025, D9), source licences (SC-146) and agency placements (SC-140).
import { useState } from 'react';
import { actorOf, orgOf, personOf, useWorld } from '../../mock/world';
import { Link } from '../../ui/router';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { oa, type InstrKind, type TplKind } from '../../state/areas/org-admin';
import { orgMailPolicy } from '../../state/areas/mail';
import { mandateTitle, nameOf, tDay } from '../hire-c/lib';
import { act, AdminFrame, BudgetWarning, Empty, Sheet, Tag } from './Frame';
import {
  admins, billingOf, budgetShare, callChecks, CH_LABEL, CH_STATE, choiceOf, conflictOf, contactable, DEMO_CODE, flagsOf, INV_TXT, isAdmin, KIND_LABEL, latestTpl,
  myInstructions, OPT_LABEL, placementsFor, STAGE_TXT, TPL_KIND, usd, WA_LABEL, waChecks,
} from './model';

const d10 = (iso?: string) => (iso ? tDay(iso.length === 10 ? `${iso}T12:00:00Z` : iso, 'Africa/Lagos') : '');

// ================= SC-020 Personal instructions =================
export function Instructions() {
  const w = useWorld((x) => x); const a = actorOf(w); const mine = myInstructions(w, a);
  const [text, setText] = useState(''); const [kind, setKind] = useState<InstrKind | ''>('');
  const clash = text.trim() ? conflictOf(w, a.orgId, text) : undefined;
  const add = () => { if (!text.trim()) return; act('oa.instr.add', { text, ...(kind ? { kind } : {}) }); setText(''); setKind(''); };
  return (
    <AdminFrame sec="instructions" title="My instructions to Q" lede={`How Q writes and works for you, ${a.first}. ${orgOf(w, a.orgId)?.name}’s guidelines still come first.`}>
      {() => (<>
        <Sheet id="in-add" title="Add an instruction" note="One sentence. Q sorts it into tone, process or a limit, and tells you if a guideline overrides it.">
          <div className="oa-form">
            <label className="ds-field"><span className="lab">Instruction</span><input id="oa-instr" className="ds-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="e.g. Keep follow-ups to three lines" /></label>
            <label className="ds-field"><span className="lab">Kind</span><select className="ds-input" value={kind} onChange={(e) => setKind(e.target.value as InstrKind)}><option value="">Let Q decide</option>{(['TONE', 'PROCESS', 'LIMIT'] as InstrKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label>
            <button type="button" className="ds-btn primary" onClick={add} disabled={!text.trim()}>Add instruction</button>
          </div>
          {clash && <p className="t14 oa-flag" role="status">{orgOf(w, a.orgId)?.name}’s guideline “{clash}” wins where these clash. You can still save it.</p>}
        </Sheet>
        <Sheet id="in-list" title="Your instructions" note="Only you and Q see these. Q shows which ones it used under each draft.">
          {mine.length === 0 ? <Empty title="No instructions yet">Add one above, or tell Q: “from now on, keep my messages short”.</Empty> : (
            <ul className="oa-list">{mine.map((i) => { const c = conflictOf(w, a.orgId, i.text); return (
              <li key={i.id} data-off={i.on ? undefined : '1'}>
                <div className="oa-li-main"><span className="oa-li-tags"><Tag>{KIND_LABEL[i.kind]}</Tag>{!i.on && <Tag k="warn">Paused</Tag>}{c && <Tag k="warn">Overridden by a guideline</Tag>}{i.source && <Tag k="busy">Learned</Tag>}</span><b>{i.text}</b>
                  <span className="t14 muted">{c ? `Guideline wins: “${c}”. ` : ''}{i.used ? `Used by Q in ${i.used} draft${i.used === 1 ? '' : 's'}.` : 'Not used yet.'}{i.source ? ` ${i.source}.` : ''}</span></div>
                <div className="oa-row"><button type="button" className="ds-btn quiet" onClick={() => act('oa.instr.toggle', { id: i.id })}>{i.on ? 'Pause' : 'Turn on'}</button><ConfirmButton label="Remove" question="Remove this instruction?" yes="Remove" onConfirm={() => act('oa.instr.remove', { id: i.id })} /></div>
              </li>); })}</ul>
          )}
        </Sheet>
      </>)}
    </AdminFrame>
  );
}

// ================= SC-021 Approved templates =================
export function Templates() {
  const w = useWorld((x) => x); const a = actorOf(w); const all = oa(w).templates.filter((t) => t.orgId === a.orgId);
  const [kind, setKind] = useState<TplKind | 'ALL'>('ALL'); const [open, setOpen] = useState<string | null>(null);
  const [nt, setNt] = useState({ title: '', body: '', kind: 'QUESTIONS' as TplKind });
  const list = all.filter((t) => kind === 'ALL' || t.kind === kind);
  const waiting = all.filter((t) => t.state === 'PROPOSED');
  const email = orgMailPolicy(w, a.orgId)?.templates ?? [];
  const admin = isAdmin(a);
  return (
    <AdminFrame sec="templates" title="Approved templates" lede={waiting.length ? `${waiting.length} template${waiting.length === 1 ? '' : 's'} waiting for ${admin ? 'your' : 'an admin’s'} approval.` : 'Every template here is approved. Q starts drafts from these.'}
      index={[{ id: 'tp-list', label: 'Templates' }, { id: 'tp-email', label: 'Email' }, { id: 'tp-new', label: 'Propose' }]}>
      {(lv) => (<>
        <Sheet id="tp-list" title="Briefs, questions and scorecards" aside={<div className="ds-views" role="group" aria-label="Filter templates">{(['ALL', 'JD', 'QUESTIONS', 'SCORECARD'] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'ALL' ? 'All' : TPL_KIND[k]}</button>)}</div>}>
          {list.length === 0 ? <Empty title="No templates of this kind">Propose one below, or ask Q to draft it.</Empty> : (
            <ul className="oa-list">{list.map((t) => { const v = latestTpl(t); const f = flagsOf(v.body); const isOpen = open === t.id || t.state === 'PROPOSED'; return (
              <li key={t.id} data-off={t.state === 'RETIRED' ? '1' : undefined}>
                <div className="oa-li-main">
                  <span className="oa-li-tags"><Tag>{TPL_KIND[t.kind]}</Tag><Tag k={t.state === 'APPROVED' ? 'ok' : t.state === 'PROPOSED' ? 'warn' : undefined}>{t.state === 'APPROVED' ? `✓ Approved v${v.v}` : t.state === 'PROPOSED' ? 'Waiting for approval' : t.state === 'RETIRED' ? 'Retired' : 'Draft'}</Tag>{f.length > 0 && <Tag k="risk">! {f.length} line flagged</Tag>}</span>
                  <b>{t.title}</b>
                  <span className="t14 muted">{t.state === 'APPROVED' ? `Approved by ${nameOf(w, t.approvedBy ?? '')} · ` : `Proposed by ${nameOf(w, v.by)} · `}{t.used ? `used ${t.used} time${t.used === 1 ? '' : 's'}` : 'not used yet'}</span>
                  {isOpen ? <ol className="oa-tplbody">{v.body.map((l, i) => { const fl = f.find((x) => x.i === i); return <li key={i} data-flag={fl ? '1' : undefined}>{l}{fl && <span className="t14"> · <b>Q flags this:</b> it asks about {fl.what}. Ask about the job instead.</span>}</li>; })}</ol>
                    : <button type="button" className="ds-linkbtn t14" onClick={() => setOpen(t.id)}>Show the {v.body.length} lines</button>}
                </div>
                {lv === 'EDIT' && t.state !== 'RETIRED' && <div className="oa-row">
                  {f.length > 0 && <button type="button" className="ds-btn" onClick={() => act('oa.tpl.fix', { id: t.id })}>Remove flagged line</button>}
                  {t.state !== 'APPROVED' && admin && <button type="button" className="ds-btn primary" disabled={f.length > 0} aria-describedby={f.length ? `tpf-${t.id}` : undefined} onClick={() => act('oa.tpl.approve', { id: t.id })}>Approve</button>}
                  {f.length > 0 && admin && <span id={`tpf-${t.id}`} className="sr">Approve is unavailable until the flagged line is removed.</span>}
                  {t.state === 'APPROVED' && admin && <ConfirmButton label="Retire" question="Retire it? Drafts already written keep their text." yes="Retire" onConfirm={() => act('oa.tpl.retire', { id: t.id })} />}
                </div>}
              </li>); })}</ul>
          )}
        </Sheet>
        <Sheet id="tp-email" title="Email templates" note={<>Managed with the email policy. <Link to="/settings/email">Open email settings</Link></>}>
          {email.length ? <ul className="oa-chips">{email.map((t) => <li key={t.id}><Tag k="ok">✓ {t.label}</Tag></li>)}</ul> : <Empty title="No email templates yet" />}
        </Sheet>
        {lv === 'EDIT' && <Sheet id="tp-new" title="Propose a template" note={admin ? 'You can approve it straight after.' : `${admins(w, a.orgId).join(' or ')} approves it before anyone can use it.`}>
          <div className="oa-form">
            <label className="ds-field"><span className="lab">Title</span><input className="ds-input" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} /></label>
            <label className="ds-field"><span className="lab">Kind</span><select className="ds-input" value={nt.kind} onChange={(e) => setNt({ ...nt, kind: e.target.value as TplKind })}>{(['JD', 'QUESTIONS', 'SCORECARD'] as TplKind[]).map((k) => <option key={k} value={k}>{TPL_KIND[k]}</option>)}</select></label>
            <label className="ds-field oa-wide"><span className="lab">Lines (one per line)</span><textarea className="ds-input" rows={4} value={nt.body} onChange={(e) => setNt({ ...nt, body: e.target.value })} /></label>
            <button type="button" className="ds-btn primary" disabled={!nt.title.trim() || !nt.body.trim()} onClick={() => { act('oa.tpl.propose', { ...nt }); setNt({ title: '', body: '', kind: 'QUESTIONS' }); }}>Propose</button>
          </div>
          {flagsOf(nt.body.split('\n')).length > 0 && <p className="t14 oa-flag" role="status">Q will flag “{flagsOf(nt.body.split('\n'))[0].line}”: it asks about {flagsOf(nt.body.split('\n'))[0].what}.</p>}
        </Sheet>}
      </>)}
    </AdminFrame>
  );
}

// ================= SC-023 Channel verification + V09 =================
const STEP_K: Record<string, string> = { VERIFIED: 'ok', IN_REVIEW: 'busy', CODE_SENT: 'busy', FAILED: 'risk', NOT_STARTED: 'warn' };
export function Channels() {
  const w = useWorld((x) => x); const a = actorOf(w); const st = oa(w);
  const chans = st.channels.filter((c) => c.orgId === a.orgId);
  const people = contactable(w, a.orgId);
  const wa = st.wa.filter((m) => m.orgId === a.orgId);
  const calls = st.calls.filter((c) => c.orgId === a.orgId).slice(0, 3);
  const [code, setCode] = useState(''); const [pick, setPick] = useState(people.includes('p_zara') ? 'p_zara' : people[0] ?? '');
  const canApprove = ['ADMIN', 'OWNER', 'RECRUITER'].includes(a.role ?? '');
  const notOk = chans.filter((c) => c.state !== 'VERIFIED');
  return (
    <AdminFrame sec="channels" title="Channels" lede={notOk.length ? `${notOk.map((c) => CH_LABEL[c.kind]).join(' and ')} ${notOk.length === 1 ? 'isn’t' : 'aren’t'} verified yet. Candidates choose which channels they accept.` : 'Every channel is verified. Each candidate still chooses which ones they accept.'}
      index={[{ id: 'ch-ver', label: 'Verification' }, { id: 'ch-opt', label: 'Who agreed' }, { id: 'ch-wa', label: 'WhatsApp' }, { id: 'ch-call', label: 'Calls' }]}>
      {(lv) => (<>
        <Sheet id="ch-ver" title="Verification" note="Providers are simulated. A verified channel lets you ask; it never lets you message someone who said no.">
          <ul className="oa-list">{chans.map((c) => (
            <li key={c.kind}>
              <div className="oa-li-main"><span className="oa-li-tags"><Tag k={STEP_K[c.state]}>{c.state === 'VERIFIED' ? '✓ ' : c.state === 'FAILED' ? '! ' : ''}{CH_STATE[c.state]}</Tag></span><b>{CH_LABEL[c.kind]}</b><span className="t14 muted">{c.sender} · {c.detail}</span>
                {c.kind === 'WHATSAPP' && <ol className="oa-steps" aria-label="WhatsApp verification steps">{[['Business verified', true], ['Number confirmed by code', c.state === 'IN_REVIEW' || c.state === 'VERIFIED'], ['Display name and templates approved', c.state === 'VERIFIED']].map(([l, ok]) => <li key={String(l)} data-ok={ok ? '1' : '0'}><span aria-hidden="true">{ok ? '✓' : '○'}</span> {String(l)}<span className="sr">{ok ? ': done' : ': not yet'}</span></li>)}</ol>}
              </div>
              {lv === 'EDIT' && <div className="oa-row">
                {(c.state === 'NOT_STARTED' || c.state === 'FAILED') && c.kind !== 'EMAIL' && <button type="button" className="ds-btn" onClick={() => act('oa.ch.start', { kind: c.kind })}>Verify number (simulated)</button>}
                {c.state === 'CODE_SENT' && <span className="oa-code"><label className="ds-field"><span className="lab">Code (demo: {DEMO_CODE})</span><input className="ds-input" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} /></label><button type="button" className="ds-btn primary" onClick={() => { act('oa.ch.code', { kind: c.kind, code }); setCode(''); }}>Confirm code</button></span>}
                {c.state === 'IN_REVIEW' && c.kind === 'WHATSAPP' && <><button type="button" className="ds-btn" onClick={() => act('oa.ch.review', { kind: c.kind, ok: true })}>Demo: provider approves</button><button type="button" className="ds-btn quiet" onClick={() => act('oa.ch.review', { kind: c.kind, ok: false })}>Demo: provider rejects</button></>}
              </div>}
            </li>))}</ul>
        </Sheet>
        <Sheet id="ch-opt" title="Who agreed to which channel" note="From each candidate’s own settings. “Not asked” is not a yes, and it isn’t a no either.">
          {people.length === 0 ? <Empty title="No candidates in conversation yet" /> : (<>
            <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Channel consent by candidate"><table className="ds-table oa-table">
              <thead><tr><th scope="col">Candidate</th><th scope="col">Email</th><th scope="col">SMS</th><th scope="col">WhatsApp</th><th scope="col">Calls</th><th scope="col"><span className="sr">Ask</span></th></tr></thead>
              <tbody>{people.map((pid) => { const c = choiceOf(w, pid); const n = w.consents[pid]?.notifications; return (
                <tr key={pid}><th scope="row">{personOf(w, pid)?.name}</th><td>{n?.email ? 'Yes' : 'No'}</td><td>{n?.sms ? 'Yes' : 'No'}</td><td data-k={c.whatsapp}>{OPT_LABEL[c.whatsapp]}</td><td data-k={c.call}>{OPT_LABEL[c.call]}</td>
                  <td>{c.whatsapp === 'NOT_ASKED' && <button type="button" className="ds-btn quiet" onClick={() => act('oa.choice.ask', { personId: pid, what: 'whatsapp' })}>Ask about WhatsApp</button>}</td></tr>); })}</tbody>
            </table></div>
          </>)}
        </Sheet>
        <Sheet id="ch-wa" title="WhatsApp message" note="Kept with the candidate’s existing conversation. Accepted, delivered and read are separate provider steps (simulated).">
          {people.length > 0 && <div className="oa-form">
            <label className="ds-field"><span className="lab">To</span><select className="ds-input" value={pick} onChange={(e) => setPick(e.target.value)}>{people.map((p) => <option key={p} value={p}>{personOf(w, p)?.name}</option>)}</select></label>
          </div>}
          {pick && <ul className="oa-checks" aria-label="Before a WhatsApp message can go">{waChecks(w, a, pick).map((c) => <li key={c.label} data-ok={c.ok ? '1' : '0'}><span aria-hidden="true">{c.ok ? '✓' : '✕'}</span><span><b>{c.label}</b><span className="sr">{c.ok ? ': yes' : ': no'}</span><br /><span className="t14 muted">{c.detail}</span></span></li>)}</ul>}
          {pick && <button type="button" className="ds-btn" disabled={!waChecks(w, a, pick).every((c) => c.ok)} onClick={() => act('oa.wa.draft', { personId: pick })}>Draft from the approved template</button>}
          {wa.length > 0 && <ul className="oa-list">{wa.map((m) => (
            <li key={m.id}><div className="oa-li-main">
              <span className="oa-li-tags"><Tag k={m.status === 'READ' || m.status === 'DELIVERED' ? 'ok' : m.status === 'FAILED' ? 'risk' : 'busy'}>{WA_LABEL[m.status]}{m.status !== 'AWAITING_APPROVAL' ? ' (simulated)' : ''}</Tag></span>
              <b>To {personOf(w, m.personId)?.name} · {m.template}</b><blockquote className="oa-quote">{m.body}</blockquote>
              <ol className="oa-ladder" aria-label="Provider steps">{(['ACCEPTED', 'DELIVERED', 'READ'] as const).map((s) => { const h = m.history.find((x) => x.status === s); return <li key={s} data-ok={h ? '1' : '0'}><span aria-hidden="true">{h ? '✓' : '○'}</span> {WA_LABEL[s]}{h ? '' : ' · not yet'}</li>; })}</ol>
              <span className="t14 muted">Thread: <Link to="/r/messages">{mandateTitle(w, w.threads.find((t) => t.id === m.threadId)?.mandateId)}</Link>{m.approvedBy ? ` · approved by ${nameOf(w, m.approvedBy)}` : ''}</span>
            </div>
              <div className="oa-row">
                {m.status === 'AWAITING_APPROVAL' && (canApprove ? <button type="button" className="ds-btn primary" onClick={() => act('oa.wa.approve', { id: m.id })}>Approve and send (simulated)</button> : <span className="t14 muted">Waiting for an approver.</span>)}
                {(m.status === 'ACCEPTED' || m.status === 'DELIVERED') && <><button type="button" className="ds-btn" onClick={() => act('oa.wa.advance', { id: m.id })}>Demo: next provider update</button><button type="button" className="ds-btn quiet" onClick={() => act('oa.wa.advance', { id: m.id, fail: true })}>Demo: delivery fails</button></>}
              </div></li>))}</ul>}
        </Sheet>
        <Sheet id="ch-call" title="Phone calls" note="Q checks eligibility before any call. This prototype never dials.">
          {pick && <ul className="oa-checks" aria-label="Before a call">{callChecks(w, a, pick).map((c) => <li key={c.label} data-ok={c.ok ? '1' : '0'}><span aria-hidden="true">{c.ok ? '✓' : '✕'}</span><span><b>{c.label}</b><span className="sr">{c.ok ? ': yes' : ': no'}</span><br /><span className="t14 muted">{c.detail}</span></span></li>)}</ul>}
          {pick && <button type="button" className="ds-btn" onClick={() => act('oa.call.check', { personId: pick })}>Check whether I can call {personOf(w, pick)?.name.split(' ')[0]}</button>}
          {calls.map((c) => <div key={c.id} className="oa-callres" role="status"><Tag k={c.ok ? 'ok' : 'warn'}>{c.ok ? '✓ Eligible' : 'Not eligible'}</Tag> <span className="t14">{personOf(w, c.personId)?.name} · {c.scheduled ? `planned ${d10(c.scheduled)} (simulated, no call placed)` : c.ok ? '' : c.reasons.filter((r) => !r.ok).map((r) => r.label).join('; ')}</span>
            {c.ok && !c.scheduled && <button type="button" className="ds-btn quiet" onClick={() => act('oa.call.schedule', { id: c.id })}>Plan the call (simulated)</button>}</div>)}
        </Sheet>
      </>)}
    </AdminFrame>
  );
}

// ================= SC-024 Billing and usage + MO-035 =================
export function Billing() {
  const w = useWorld((x) => x); const a = actorOf(w); const b = billingOf(w, a.orgId);
  const [view, setView] = useState<'bars' | 'table'>('bars');
  if (!b) return <AdminFrame sec="billing" title="Billing and usage" empty={<Empty title="No plan yet">Your organisation hasn’t chosen a plan. Nothing is charged.</Empty>}>{() => null}</AdminFrame>;
  const admin = isAdmin(a); const share = budgetShare(b);
  return (
    <AdminFrame sec="billing" title="Billing and usage" lede={share >= b.budget.warnAt ? `The agent budget is at ${Math.round(share * 100)}%. ${b.budget.decision ? 'A decision is recorded.' : admin ? 'Decide whether to pause or allow more.' : 'An admin decides what happens next.'}` : `Usage is within the plan. ${usd(b.budget.cap - b.budget.spent)} of agent budget is left this month.`}
      index={[{ id: 'bl-budget', label: 'Budget' }, { id: 'bl-usage', label: 'Usage' }, { id: 'bl-req', label: 'Requests' }, { id: 'bl-plan', label: 'Plan' }]}>
      {(lv) => (<>
        <Sheet id="bl-budget" title="Agent budget" note="Simulated compute cost of Q’s agent runs, against a cap the admin sets. Nothing is charged." aside={<button type="button" className="ds-btn quiet" onClick={() => act('oa.bill.simulate', { runs: 3 })}>Demo: 3 more runs</button>}>
          <BudgetWarning orgId={a.orgId} />
        </Sheet>
        <Sheet id="bl-usage" title="Usage this period" note={b.period} aside={<div className="ds-views" role="group" aria-label="Show usage as"><button type="button" aria-pressed={view === 'bars'} onClick={() => setView('bars')}>Bars</button><button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button></div>}>
          {view === 'bars' ? <ul className="oa-meters">{b.meters.map((m) => { const p = m.included ? m.used / m.included : 0; return (
            <li key={m.id}><div className="oa-budget-row"><b>{m.label}</b><span className="num">{m.used} of {m.included} {m.unit}</span></div>
              <div className="oa-meter" role="img" aria-label={`${m.label}: ${m.used} of ${m.included} ${m.unit}, ${Math.round(p * 100)}%`}><span className="fill" style={{ width: `${Math.min(100, p * 100)}%` }} data-over={p >= 0.8 ? '1' : undefined} /></div>
              <span className="t14 muted">{m.hint}</span></li>); })}</ul>
            : <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Usage table"><table className="ds-table oa-table"><thead><tr><th scope="col">What</th><th scope="col" className="num">Used</th><th scope="col" className="num">Included</th><th scope="col" className="num">Share</th></tr></thead>
              <tbody>{b.meters.map((m) => <tr key={m.id}><th scope="row">{m.label}</th><td className="num">{m.used}</td><td className="num">{m.included}</td><td className="num">{m.included ? Math.round((100 * m.used) / m.included) : 0}%</td></tr>)}</tbody></table></div>}
        </Sheet>
        <Sheet id="bl-req" title="Budget requests" note="When a run would go past the cap, Q stops and asks. An admin decides.">
          {b.requests.length === 0 ? <Empty title="No requests">Nobody has asked to go past the cap.</Empty> : <ul className="oa-list">{b.requests.map((r) => (
            <li key={r.id}><div className="oa-li-main"><span className="oa-li-tags"><Tag k={r.state === 'OPEN' ? 'warn' : r.state === 'APPROVED' ? 'ok' : undefined}>{r.state === 'OPEN' ? 'Waiting' : r.state === 'APPROVED' ? '✓ Approved' : 'Declined'}</Tag></span><b>{r.what}</b><span className="t14 muted">Asked by {nameOf(w, r.by)} · about {usd(r.amount)} (simulated){r.decidedBy ? ` · decided by ${nameOf(w, r.decidedBy)}` : ''}</span></div>
              {r.state === 'OPEN' && lv === 'EDIT' && <div className="oa-row"><button type="button" className="ds-btn primary" onClick={() => act('oa.bill.req', { id: r.id, ok: true })}>Approve {usd(r.amount)}</button><button type="button" className="ds-btn quiet" onClick={() => act('oa.bill.req', { id: r.id, ok: false })}>Decline</button></div>}</li>))}</ul>}
        </Sheet>
        <Sheet id="bl-plan" title={`${b.plan} plan`} note="Pricing is a hypothesis being tested, not a price. Talent Q takes no payment in this prototype.">
          {lv === 'EDIT' ? (<>
            <dl className="oa-dl"><dt>Hypothesis</dt><dd><b>{b.hypothesis}</b> <Tag k="warn">Hypothesis, not a price</Tag></dd><dt>Being tested</dt><dd>{b.range}</dd><dt>Seats</dt><dd className="num">{b.seats}</dd><dt>Payment</dt><dd>None taken. No card on file.</dd></dl>
            <div className="oa-row"><button type="button" className="ds-btn" onClick={() => act('oa.bill.quote', { plan: b.plan })}>Ask for a quote</button>{b.quotes.length > 0 && <span className="t14 muted" role="status">Quote requested {d10(b.quotes.at(-1)!.at)}. No payment taken.</span>}</div>
          </>) : <p className="t14" style={{ margin: 0 }}>Plan details are for admins. You can see usage and the budget.</p>}
        </Sheet>
      </>)}
    </AdminFrame>
  );
}

// ================= SC-025 Compliance and retention =================
export function Retention() {
  const w = useWorld((x) => x); const a = actorOf(w); const r = oa(w).retention.find((x) => x.orgId === a.orgId);
  if (!r) return <AdminFrame sec="retention" title="Retention and deletion" empty={<Empty title="No retention settings yet" />}>{() => null}</AdminFrame>;
  const open = r.deletions.filter((d) => d.state === 'OPEN');
  return (
    <AdminFrame sec="retention" title="Retention and deletion" lede={open.length ? `${open.length} deletion request${open.length === 1 ? '' : 's'} waiting. Periods are proposals until decision D9 is made.` : 'No deletion requests waiting. Periods are proposals until decision D9 is made.'}
      index={[{ id: 'rt-del', label: 'Deletion requests' }, { id: 'rt-rules', label: 'Periods' }, { id: 'rt-audit', label: 'Audit' }]}>
      {(lv) => (<>
        <Sheet id="rt-del" title="Deletion requests" note="A candidate can ask any organisation to delete what it holds about them. The receipt says what is kept and why.">
          {r.deletions.length === 0 ? <Empty title="No requests">Nobody has asked you to delete their records.</Empty> : <ul className="oa-list">{r.deletions.map((d) => (
            <li key={d.id}><div className="oa-li-main"><span className="oa-li-tags"><Tag k={d.state === 'OPEN' ? 'warn' : 'ok'}>{d.state === 'OPEN' ? 'Waiting' : '✓ Done'}</Tag></span><b>{personOf(w, d.personId)?.name}</b><span className="t14 muted">{d.via} · {d10(d.requestedAt)}{d.doneBy ? ` · done by ${nameOf(w, d.doneBy)}` : ''}</span>
              {d.receipt && <div className="oa-receipt"><span className="lab">Receipt</span><p className="t14" style={{ margin: 0 }}><b>Deleted:</b> {d.receipt.deleted.join('; ')}.</p><ul className="t14">{d.receipt.kept.map((k) => <li key={k.what}><b>Kept:</b> {k.what}. {k.why}</li>)}</ul><span className="t14 muted">Legal wording follows the {r.jurisdiction === 'UK' ? 'UK GDPR' : 'Nigeria (NDPA)'} template.</span></div>}
            </div>{d.state === 'OPEN' && lv === 'EDIT' && <ConfirmButton className="ds-btn primary" label="Delete their records" question={`Delete ${personOf(w, d.personId)?.name.split(' ')[0]}’s records? Messages and the audit event are kept.`} yes="Delete" onConfirm={() => act('oa.ret.delete', { id: d.id })} />}</li>))}</ul>}
        </Sheet>
        <Sheet id="rt-rules" title="How long records are kept" note={<>Proposed periods. The founder and legal still decide these (D9), so every row says “proposed”.</>}
          aside={lv === 'EDIT' ? <label className="ds-field oa-inline"><span className="lab">Template</span><select className="ds-input" value={r.jurisdiction} onChange={(e) => act('oa.ret.jur', { jur: e.target.value })}><option value="NG">Nigeria (NDPA)</option><option value="UK">UK GDPR</option></select></label> : <Tag>{r.jurisdiction === 'UK' ? 'UK GDPR' : 'Nigeria (NDPA)'}</Tag>}>
          <ul className="oa-list">{r.rules.map((x) => (
            <li key={x.id}><div className="oa-li-main"><span className="oa-li-tags"><Tag k={x.status === 'BY_DESIGN' ? 'ok' : 'warn'}>{x.status === 'BY_DESIGN' ? 'By design' : 'Proposed · D9 open'}</Tag></span><b>{x.data}</b><span className="t14 muted">{x.why}</span></div>
              {lv === 'EDIT' && x.options.length > 1 ? <label className="ds-field oa-inline"><span className="sr">Period for {x.data}</span><select className="ds-input" value={x.period} onChange={(e) => act('oa.ret.set', { id: x.id, period: e.target.value })}>{x.options.map((o) => <option key={o}>{o}</option>)}</select></label> : <span className="t14"><b>{x.period}</b></span>}</li>))}</ul>
        </Sheet>
        <Sheet id="rt-audit" title="Audit" note="Every change here is in the audit log with who made it.">
          <div className="oa-row"><Link to="/r/audit" className="ds-btn">Open the audit log</Link>{lv === 'EDIT' && <button type="button" className="ds-btn quiet" onClick={() => act('oa.ret.export')}>Prepare an audit export (simulated)</button>}</div>
          {r.exports.length > 0 && <p className="t14 muted" role="status" style={{ margin: 0 }}>Export prepared {d10(r.exports.at(-1)!.at)} by {nameOf(w, r.exports.at(-1)!.by)}. Nothing was downloaded.</p>}
        </Sheet>
      </>)}
    </AdminFrame>
  );
}

// ================= SC-146 Source licences and connectivity =================
const HEALTH: Record<string, [string, string]> = { OK: ['✓ Healthy', 'ok'], DEGRADED: ['! Degraded', 'warn'], EXPIRING: ['! Licence ending', 'warn'], NOT_LICENSED: ['Not licensed', ''], PENDING: ['Pending partner', 'busy'] };
export function Sources() {
  const w = useWorld((x) => x); const a = actorOf(w); const src = oa(w).sources.filter((s) => s.orgId === a.orgId);
  const attn = src.filter((s) => s.health === 'EXPIRING' || s.health === 'DEGRADED');
  return (
    <AdminFrame sec="sources" title="Sources and licences" lede={attn.length ? `${attn.map((s) => s.name).join(' and ')} need${attn.length === 1 ? 's' : ''} attention.` : 'Every connected source is healthy.'} empty={src.length ? undefined : <Empty title="No sources connected" />}>
      {(lv) => (
        <Sheet id="src-list" title="Where candidates and checks come from" note="Health checks are simulated. Talent Q never scrapes a site it has no licence for.">
          <ul className="oa-list">{src.map((s) => (
            <li key={s.id} data-off={s.paused ? '1' : undefined}><div className="oa-li-main"><span className="oa-li-tags"><Tag k={HEALTH[s.health][1]}>{HEALTH[s.health][0]}</Tag>{s.paused && <Tag>Paused</Tag>}{s.renewalAsked && <Tag k="busy">Renewal asked {d10(s.renewalAsked)}</Tag>}</span>
              <b>{s.name}</b><span className="t14 muted">{s.kind} · {s.terms}{s.renews ? ` · renews ${d10(s.renews)}` : ''}</span><span className="t14">{s.note}{s.lastCheck ? ` Checked ${d10(s.lastCheck)}.` : ''}</span></div>
              <div className="oa-row">{s.health !== 'NOT_LICENSED' && <button type="button" className="ds-btn quiet" onClick={() => act('oa.src.test', { id: s.id })}>Check now (simulated)</button>}
                {lv === 'EDIT' && s.health !== 'NOT_LICENSED' && <button type="button" className="ds-btn quiet" onClick={() => act('oa.src.pause', { id: s.id })}>{s.paused ? 'Resume' : 'Pause'}</button>}
                {lv === 'EDIT' && s.health === 'EXPIRING' && !s.renewalAsked && <button type="button" className="ds-btn" onClick={() => act('oa.src.renew', { id: s.id })}>Ask to renew</button>}</div></li>))}</ul>
        </Sheet>
      )}
    </AdminFrame>
  );
}

// ================= SC-140 Agency placements and invoices =================
export function Placements() {
  const w = useWorld((x) => x); const a = actorOf(w); const { shown, hidden } = placementsFor(w, a.orgId);
  const need = shown.filter((p) => p.dispute?.state === 'OPEN' || p.invoice.state === 'DRAFT' || p.consent === 'PENDING');
  return (
    <AdminFrame sec="placements" title="Placements and invoices" lede={need.length ? `${need.length} placement${need.length === 1 ? '' : 's'} need${need.length === 1 ? 's' : ''} you: ${need.map((p) => p.dispute?.state === 'OPEN' ? 'a disputed attribution' : p.invoice.state === 'DRAFT' ? 'an unfinished invoice' : 'a consent to ask for').join(', ')}.` : 'Nothing needs you.'}
      empty={shown.length || hidden ? undefined : <Empty title="No one represented yet">People appear here once you put them forward to a client.</Empty>}>
      {(lv) => (<>
        {hidden > 0 && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>{hidden} {hidden === 1 ? 'person is' : 'people are'} hidden because their privacy settings no longer allow Talentbridge to see them.</span><span /></div>}
        <Sheet id="pl-list" title="Who you represent" note="Attribution follows consent and the first submittal. Talent Q doesn’t send invoices or take payment; it keeps your draft and its status.">
          <ul className="oa-list">{shown.map((p) => (
            <li key={p.id}><div className="oa-li-main">
              <span className="oa-li-tags"><Tag>{STAGE_TXT[p.stage]}</Tag><Tag k={p.consent === 'YES' ? 'ok' : 'warn'}>{p.consent === 'YES' ? '✓ Agreed to be put forward' : 'Consent not given yet'}</Tag>{p.dispute?.state === 'OPEN' && <Tag k="risk">! Attribution disputed</Tag>}</span>
              <b>{personOf(w, p.personId)?.name} → {orgOf(w, p.clientOrgId)?.name}</b>
              <span className="t14 muted">{mandateTitle(w, p.mandateId)} · sourced by {nameOf(w, p.sourcedBy)} {d10(p.sourcedAt)}{p.submittedAt ? ` · submitted ${d10(p.submittedAt)}` : ''}</span>
              <span className="t14">{p.attribution}</span>
              {p.dispute && <span className="t14">{p.dispute.state === 'OPEN' ? <>“{p.dispute.text}” ({p.dispute.by})</> : <>Settled: {p.dispute.outcome}</>}</span>}
              <span className="t14"><b>Invoice:</b> {INV_TXT[p.invoice.state]}{p.invoice.state === 'DRAFT' ? ` · stopped at step ${p.invoice.step} of 3` : ''} · {p.invoice.terms} · Paid: {p.invoice.paid === 'UNKNOWN' ? 'unknown (Talent Q can’t see payments)' : 'marked paid by you'}</span>
            </div>
              {lv === 'EDIT' && <div className="oa-row">
                {p.consent === 'PENDING' && <button type="button" className="ds-btn" onClick={() => act('oa.pl.consent', { id: p.id })}>Ask {personOf(w, p.personId)?.name.split(' ')[0]} for consent</button>}
                {p.dispute?.state === 'OPEN' && <><button type="button" className="ds-btn" onClick={() => act('oa.pl.dispute', { id: p.id, outcome: 'client' })}>Accept: client’s own applicant</button><button type="button" className="ds-btn quiet" onClick={() => act('oa.pl.dispute', { id: p.id, outcome: 'agency' })}>Client agreed it was ours</button></>}
                {(p.stage === 'OFFER' || p.stage === 'PLACED') && (p.invoice.state === 'NONE' || p.invoice.state === 'DRAFT') && <button type="button" className="ds-btn primary" onClick={() => act('oa.pl.invoice', { id: p.id })}>{p.invoice.state === 'DRAFT' ? `Resume invoice (step ${(p.invoice.step ?? 1) + 1} of 3)` : 'Start invoice'}</button>}
                {p.invoice.state === 'READY' && <button type="button" className="ds-btn" onClick={() => act('oa.pl.sent', { id: p.id })}>Mark as sent from my tool</button>}
                {p.invoice.state === 'MARKED_SENT' && p.invoice.paid === 'UNKNOWN' && <button type="button" className="ds-btn quiet" onClick={() => act('oa.pl.paid', { id: p.id })}>Mark as paid</button>}
              </div>}</li>))}</ul>
        </Sheet>
      </>)}
    </AdminFrame>
  );
}

