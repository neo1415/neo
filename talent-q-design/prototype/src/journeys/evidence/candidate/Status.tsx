// Truthful status the employer has committed to (pack item E and §02 HiringIntentConfirmation / ProcessCommitment),
// and the candidate's own "What you want" (CandidateMutualPreferences). Unknown stays blank; nothing is a default.
import { useState } from 'react';
import type { CandidateMutualPreferences } from '../../../state/domain';
import { actorOf, useWorld } from '../../../mock/world';
import { runAction } from '../../../q/core/engine';
import { SwitchRow } from '../../../ds/Switch';
import { commitmentFor, dayMonth, fullName, intentFor, orgNm, prefsOf, weekdayDate } from './logic';
import './candidate.css';

const say = (text: string) => void runAction({ label: text, act: { t: 'say', text } });
const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

const Check = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" /></svg>;

/** "Hiring confirmed by Kora Pay on 27 Oct": only from a participating employer's confirmation, never for a listing
 *  without one (and never "verified" for a discovered post). */
export function IntentLine({ jobId, full, onlyConfirmed }: { jobId: string; full?: boolean; onlyConfirmed?: boolean }) {
  const w = useWorld((x) => x);
  const i = intentFor(w, jobId);
  if (!i && onlyConfirmed) return null;
  if (!i) return <p className="evc-intent" data-on="no"><span aria-hidden="true">–</span>No hiring confirmation from this employer</p>;
  const org = orgNm(w, i.orgId);
  return (
    <div className="evc-intent" data-on="yes">
      <p><Check /><b>Hiring confirmed by {org} on {dayMonth(i.confirmedAt)}</b></p>
      {full && <p className="t14 muted">Confirmed by {fullName(w, i.owner)}. {org} has to confirm again by {dayMonth(i.freshUntil)} or this label comes off. They’ve committed to reply to applicants within {i.replyWithinDays} days.</p>}
    </div>
  );
}

/** The employer's next factual update and who owns it. Late is shown as late, on their side, never as a signal about the person. */
export function CommitmentLine({ appId }: { appId: string }) {
  const w = useWorld((x) => x);
  const c = commitmentFor(w, appId);
  if (!c) return null;
  const org = orgNm(w, c.orgId); const owner = fullName(w, c.owner);
  if (c.state === 'FULFILLED') return <div className="evc-commit" data-k="done"><p><Check /><b>{org} gave the update they promised</b> · {c.milestone}</p></div>;
  if (c.late) return (
    <div className="evc-commit" data-k="late" role="status">
      <p><b>Update overdue</b> · {org} said they’d update you by {weekdayDate(c.nextUpdateDue)} about “{c.milestone.toLowerCase()}”. That date has passed{c.days ? ` (${c.days} ${c.days === 1 ? 'day' : 'days'} ago)` : ''} and nothing has come yet.</p>
      <p className="t14 muted">That’s late on their side. It says nothing about you. Owner: {owner}.</p>
      <div className="evc-acts"><button type="button" className="ds-btn" onClick={() => say(`follow up with ${org}`)}>Ask {org} for an update</button></div>
    </div>
  );
  return (
    <div className="evc-commit" data-k="open">
      <p><b>Next update by {weekdayDate(c.nextUpdateDue)}</b> · {owner}, {org}</p>
      <p className="t14 muted">{c.milestone}. {org} committed to this date; Q tells you if it passes.</p>
    </div>
  );
}

const MODES: { k: NonNullable<CandidateMutualPreferences['workModes']>[number]; label: string }[] = [{ k: 'ONSITE', label: 'In the office' }, { k: 'HYBRID', label: 'Hybrid' }, { k: 'REMOTE', label: 'Remote' }];
const money = (n: number, cur?: string) => `${cur === 'GBP' ? '£' : cur === 'USD' ? 'US$' : '₦'}${n.toLocaleString('en-GB')}`;

/** "What you want": edited only by the candidate, shown to an employer only when shared, never scored. */
export function PrefsPanel() {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const p = prefsOf(w, pid);
  const orgs = [...new Set(w.applications.filter((x) => x.personId === pid).map((x) => w.jobs.find((j) => j.id === x.jobId)?.orgId).filter((x): x is string => !!x))];
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ pay: p?.payMin ? String(p.payMin) : '', cur: p?.currency ?? 'NGN', modes: p?.workModes ?? [], places: (p?.locations ?? []).join(', '), from: p?.availableFrom ?? '' });
  const blank = <span className="evc-blank">Not said</span>;
  const shared = p?.shareWith ?? [];
  return (
    <section className="ds-sheet evc-prefs" aria-labelledby="evc-prefs-h">
      <div className="evc-row"><h2 id="evc-prefs-h" className="tb-h2">What you want</h2>{!edit && <button type="button" className="ds-btn" onClick={() => { setF({ pay: p?.payMin ? String(p.payMin) : '', cur: p?.currency ?? 'NGN', modes: p?.workModes ?? [], places: (p?.locations ?? []).join(', '), from: p?.availableFrom ?? '' }); setEdit(true); }}>Edit</button>}</div>
      <p className="t14 muted" style={{ margin: 0 }}>Only you change these. Anything you leave blank stays blank: it’s never filled in for you or scored against you.</p>
      {!edit ? (
        <dl className="evc-dl">
          <div><dt>Lowest pay you’d take</dt><dd>{p?.payMin ? <span className="num">{money(p.payMin, p.currency)} a month</span> : blank}</dd></div>
          <div><dt>Ways of working</dt><dd>{p?.workModes?.length ? p.workModes.map((m) => MODES.find((x) => x.k === m)?.label).join(', ') : blank}</dd></div>
          <div><dt>Places</dt><dd>{p?.locations?.length ? p.locations.join(', ') : blank}</dd></div>
          <div><dt>Available from</dt><dd>{p?.availableFrom ? dayMonth(p.availableFrom) : blank}</dd></div>
        </dl>
      ) : (
        <form className="evc-form" onSubmit={(e) => { e.preventDefault(); act('evc.prefs.set', { payMin: f.pay ? Number(f.pay.replace(/[^\d]/g, '')) : null, currency: f.pay ? f.cur : null, workModes: f.modes, locations: f.places.split(',').map((x) => x.trim()).filter(Boolean), availableFrom: f.from || null }); setEdit(false); }}>
          <div className="evc-payrow">
            <div className="ds-field" style={{ flex: 1, minWidth: 0 }}><label htmlFor="evc-pay">Lowest monthly pay (leave blank if you’d rather not say)</label><input id="evc-pay" className="ds-input" inputMode="numeric" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })} /></div>
            <div className="ds-field"><label htmlFor="evc-cur">Currency</label><select id="evc-cur" className="ds-input" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value as 'NGN' })}><option value="NGN">NGN</option><option value="USD">USD</option><option value="GBP">GBP</option></select></div>
          </div>
          <div className="evc-opts evc-opts-row" role="group" aria-label="Ways of working">{MODES.map((m) => <button key={m.k} type="button" className="ds-opt" aria-pressed={f.modes.includes(m.k)} onClick={() => setF({ ...f, modes: f.modes.includes(m.k) ? f.modes.filter((x) => x !== m.k) : [...f.modes, m.k] })}><b>{m.label}</b></button>)}</div>
          <div className="ds-field"><label htmlFor="evc-places">Places (separate with commas)</label><input id="evc-places" className="ds-input" value={f.places} onChange={(e) => setF({ ...f, places: e.target.value })} /></div>
          <div className="ds-field"><label htmlFor="evc-from">Available from</label><input id="evc-from" type="date" className="ds-input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
          <div className="evc-acts"><button type="submit" className="ds-btn primary">Save</button><button type="button" className="ds-btn quiet" onClick={() => setEdit(false)}>Cancel</button></div>
        </form>
      )}
      {orgs.length > 0 && (
        <div className="evc-share">
          <h3 className="lab" style={{ margin: 0 }}>Who sees these</h3>
          {orgs.map((o) => <SwitchRow key={o} label={orgNm(w, o)} help={shared.includes(o) ? 'Sees these to check mutual fit. Not passed to anyone else.' : 'Doesn’t see these.'} on={shared.includes(o)} onChange={(v) => act('evc.prefs.share', { org: o, on: v })} />)}
        </div>
      )}
    </section>
  );
}
