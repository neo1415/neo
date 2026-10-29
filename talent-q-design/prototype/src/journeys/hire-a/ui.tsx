// Small shared pieces for hire-a pages, and the live cards Q shows inside its messages (brief, memory,
// source conflict). Cards render from state, so they update when the brief or memory changes.
import { motion } from 'motion/react';
import { useWorld, visibleEvidence, actorOf } from '../../mock/world';
import { Link, useRoute } from '../../ui/router';
import { Glyph, type GlyphKind } from '../../ds/Glyph';
import { DUR, EASE } from '../../ds/motion';
import { runAction } from '../../q/core/engine';
import { readA } from '../../state/areas/hire-a';
import type { MandateX } from '../../state/domain';
import { curV, payText, dayLabel, emailDomain, businessEmail, isVerified, k, naira, postedJob, applicantsFor, failedTries, MAX_TRIES, limitsFor } from './model';
import { CONFLICTS } from '../../q/skills/hire-a';

export const say = (text: string) => void runAction({ label: text, act: { t: 'say', text } });
export const doOp = (label: string, op: string, args: Record<string, unknown>) => void runAction({ label, act: { t: 'do', op, args } });

/** Short status words for tags (the kicker never carries status). */
export const STATUS_SHORT: Record<MandateX['status'], { text: string; k?: 'busy' | 'ok' | 'warn' }> = {
  DRAFT: { text: 'Draft', k: 'busy' }, APPROVED: { text: 'Approved', k: 'ok' }, SOURCING: { text: 'Approved', k: 'ok' }, INTERVIEWING: { text: 'Interviewing', k: 'ok' },
  PAUSED: { text: 'Paused', k: 'warn' }, FILLED: { text: 'Filled' }, CLOSED: { text: 'Closed' },
};
export function StatusTag({ m }: { m: MandateX }) {
  const s = STATUS_SHORT[m.status];
  return <span className="ds-tag" data-k={s.k}><span className="num">v{curV(m)}</span> · {s.text}</span>;
}

/**
 * Offer against an illustrative pay range: a one-value bullet meter (dataviz: a single measure against a
 * reference band is a bullet, not a bar chart). Direct labels, no legend, state in words as well as position.
 * The marker glides when the brief changes (MO-015 mandate revised: orientation, DUR.slow, standard ease).
 */
export function PayRange({ pay, lo, hi }: { pay: number; lo: number; hi: number }) {
  const min = Math.min(lo, pay) * 0.75; const max = Math.max(hi, pay) * 1.15;
  const x = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const where = pay < lo ? 'below' : pay > hi ? 'above' : 'inside';
  const said = where === 'below' ? 'Below the usual range' : where === 'above' ? 'Above the usual range' : 'Inside the usual range';
  return (
    <figure className="hire-a-range" data-where={where} aria-label={`Your offer ${naira(pay)} a month. Usual range ${naira(lo)} to ${naira(hi)} (illustrative). ${said}.`} role="img">
      <div className="track" aria-hidden="true">
        <span className="band" style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
        <motion.span className="mark" initial={false} animate={{ left: x(pay) }} transition={{ duration: DUR.slow, ease: EASE.standard }}><span className="lbl">You · {k(pay)}</span></motion.span>
      </div>
      <div className="scale" aria-hidden="true"><span style={{ left: x(lo) }}>{k(lo)}</span><span style={{ left: x(hi) }}>{k(hi)}</span></div>
      <figcaption className="t14"><Glyph k={where === 'below' ? 'unclear' : 'full'} size={14} /> {said} <span className="muted">· usual {k(lo)}–{k(hi)}, illustrative</span></figcaption>
    </figure>
  );
}

/** The two checks behind "verified employer", read from the store (simulated checks, every attempt kept). */
export function VerifySteps({ orgId }: { orgId: string }) {
  const v = useWorld((w) => readA(w).verify[orgId]);
  const o = useWorld((w) => w.orgs.find((x) => x.id === orgId));
  const email = useWorld((w) => actorOf(w).email);
  if (!o) return null;
  const last = v?.tries[v.tries.length - 1];
  const emailOk = o.verified.domain; const regOk = o.verified.registry === 'VERIFIED';
  const rows: { k: GlyphKind; label: string; detail: string }[] = [
    { k: emailOk ? 'verified' : v?.email && !v.email.ok ? 'unclear' : 'none', label: 'Business email', detail: emailOk ? `${emailDomain(v?.email?.address ?? email)} · confirmed with your sign-up code` : businessEmail(email) ? `${email} · not confirmed yet` : `${emailDomain(email)} is a personal address · needs one at your own domain` },
    { k: regOk ? 'verified' : last && !last.ok ? 'unclear' : 'none', label: 'Business registration (CAC)', detail: regOk ? `${v?.tries.find((t) => t.ok)?.number ?? ''} · matched on the register` : last && !last.ok ? `${last.number} · ${last.reason === 'FORMAT' ? 'too short to check' : 'not found'} · ${MAX_TRIES - (v?.tries.filter((t) => !t.ok).length ?? 0)} tries left` : 'RC or BN number · not checked yet' },
  ];
  return (
    <ol className="hire-a-checks" aria-label={`Verifying ${o.name}`}>
      {rows.map((r) => (
        <li key={r.label}>
          <motion.span key={r.k} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: DUR.normal, ease: EASE.enter }}><Glyph k={r.k} size={18} title={r.k === 'verified' ? 'Done' : r.k === 'unclear' ? 'Didn’t pass' : 'Not yet'} /></motion.span>
          <span><b>{r.label}</b><span className="t14 sub">{r.detail}</span></span>
        </li>
      ))}
    </ol>
  );
}

export function VerifyRef({ id }: { id: string }) {
  const o = useWorld((w) => w.orgs.find((x) => x.id === id));
  const ok = useWorld((w) => isVerified(w, id));
  if (!o) return null;
  return (
    <div className="hire-a-ref" aria-label={`Verification for ${o.name}`}>
      <span className="hire-a-ref-head"><span className="lab">Verify {o.name}</span><span className="ds-tag" data-k={ok ? 'ok' : undefined}>{ok ? 'Verified employer' : 'Not verified yet'}</span></span>
      <VerifySteps orgId={id} />
      <span className="t14 sub">Checks in this prototype are simulated. Nothing is sent to the CAC.</span>
    </div>
  );
}

/** Messages used this week against the allowance: a small segmented meter (one segment per message), with the
 * count in words too, so it never relies on fill alone. Segments fill with a short feedback transition. */
export function Allowance({ used, drafted = 0, cap }: { used: number; drafted?: number; cap: number }) {
  const d = Math.min(drafted, Math.max(0, cap - used));
  return (
    <span className="hire-a-allow" role="img" aria-label={`${used} of ${cap} messages sent this week${d ? `, ${d} drafted` : ''}`}>
      {Array.from({ length: cap }, (_, i) => <motion.span key={i} className="seg" data-s={i < used ? 'sent' : i < used + d ? 'draft' : 'free'} initial={false} animate={{ opacity: i < used ? 1 : i < used + d ? 0.6 : 0.2 }} transition={{ duration: DUR.normal, ease: EASE.standard }} />)}
      <span className="t14 num">{used} of {cap} sent this week{d ? ` · ${d} drafted` : ''}</span>
    </span>
  );
}

/** What a new, unverified organisation can and can't do yet (limits come from orgLimits in the store), and the way out. */
export function LimitsPanel({ orgId, mandate, compact }: { orgId: string; mandate?: MandateX; compact?: boolean }) {
  const o = useWorld((w) => w.orgs.find((x) => x.id === orgId));
  const lim = useWorld((w) => limitsFor(w, orgId));
  const job = useWorld((w) => (mandate ? postedJob(w, mandate.id) : undefined));
  const apps = useWorld((w) => (job ? applicantsFor(w, job.id).length : 0));
  const locked = useWorld((w) => failedTries(w, orgId) >= MAX_TRIES);
  if (!o) return null;
  if (lim.verified) return job ? <p className="t14 hire-a-posted" role="status"><Glyph k="verified" size={14} /> Posted on Talent Q jobs since {dayLabel(job.posted)} · {apps ? `${apps} applied` : 'no applications yet'} <span className="ds-sim">Simulated</span></p> : null;
  return (
    <section className={`ds-sheet hire-a-limits${compact ? ' compact' : ''}`} aria-labelledby={`lim-${orgId}`}>
      <div className="hire-a-limits-head">
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <h2 id={`lim-${orgId}`} className="lab" style={{ margin: 0 }}>Until {o.name} is verified</h2>
          {!compact && <p className="t14 muted" style={{ margin: 0 }}>New businesses have limits, so people can trust the job offers they get. Verifying takes a minute.</p>}
        </div>
        {!locked && <button type="button" className="ds-btn primary" onClick={() => say('verify my business')}>Verify with Q</button>}
      </div>
      <ul className="hire-a-limitlist">
        <li><span>Messages to candidates</span><Allowance used={Math.min(lim.used, lim.outreachPerWeek)} drafted={lim.drafted} cap={lim.outreachPerWeek} /></li>
        <li><span>Posting roles</span><span className="t14"><Glyph k="none" size={14} /> Off until verified</span></li>
        <li><span>What candidates see</span><span className="t14">“Not verified yet” on every message</span></li>
      </ul>
      {!compact && <VerifySteps orgId={orgId} />}
    </section>
  );
}

/** On phones the canvas is a sheet; "back to the conversation" opens Q. */
export const openQ = () => { (document.querySelector('.ds-askbar button') as HTMLButtonElement | null)?.click(); };

export function evidenceGlyph(e: { kind: string; verification?: string; verified: boolean }): { k: GlyphKind; label: string } {
  if (e.verified || e.verification === 'VERIFIED') return { k: 'verified', label: 'Verified' };
  if (e.kind === 'CLAIM') return { k: 'unclear', label: 'Claim, not yet backed' };
  if (e.verification === 'PENDING') return { k: 'partial', label: 'Check pending' };
  return { k: 'full', label: 'Evidenced' };
}

export function BriefRef({ id }: { id: string }) {
  const m = useWorld((w) => w.mandates.find((x) => x.id === id) ?? readA(w).discarded[id]);
  const gone = useWorld((w) => !w.mandates.some((x) => x.id === id));
  const here = useRoute().path;
  if (!m) return null;
  return (
    <div className="hire-a-ref" aria-label={`Role brief: ${m.title}`}>
      <span className="hire-a-ref-head"><span className="lab">Role brief</span>{gone ? <span className="ds-tag">Discarded</span> : <StatusTag m={m} />}</span>
      <b className="voice" style={{ fontSize: 18 }}>{m.title}</b>
      <span className="t14 sub">{m.location} · {payText(m)}</span>
      <ul>{m.requirements.slice(0, 3).map((r) => <li key={r.reqId} className="t14">{r.label}{r.mustHave ? '' : ' (nice to have)'}</li>)}</ul>
      {!gone && here !== `/r/roles/${m.id}` && <Link to={`/r/roles/${m.id}`} className="ds-chip" style={{ justifySelf: 'start', textDecoration: 'none' }}>Open the brief</Link>}
    </div>
  );
}

export function MemoryRef({ id }: { id: string }) {
  const m = useWorld((w) => w.memories.find((x) => x.memory_id === id));
  if (!m) return null;
  const src = m.source_refs[0];
  return (
    <div className="hire-a-ref" aria-label="Remembered item">
      <span className="hire-a-ref-head"><span className="lab">What Q remembers</span><span className="ds-tag" data-k={m.lifecycle_status === 'active' ? 'ok' : undefined}>{m.lifecycle_status === 'superseded' ? 'Replaced' : m.lifecycle_status === 'forgotten' ? 'Forgotten' : 'In use'}</span></span>
      <p style={{ margin: 0, textDecoration: m.lifecycle_status === 'active' ? undefined : 'line-through' }}>{m.content}</p>
      <span className="t14 sub">Source: {src.label}{src.quote ? <> · “{src.quote}”</> : null}</span>
      <span className="t14 sub">{m.truth_class === 'INFERENCE' ? 'Q’s inference' : m.truth_class === 'STATED_BY_USER' ? 'Stated by you' : m.truth_class.toLowerCase().replace(/_/g, ' ')}</span>
    </div>
  );
}

export function ConflictRef({ id }: { id: string }) {
  const cf = CONFLICTS[id];
  const ev = useWorld((w) => { const a = actorOf(w); return a.orgId ? visibleEvidence(w, id, a.orgId).filter((e) => e.evidenceId === cf?.a || e.evidenceId === cf?.b) : []; });
  const how = useWorld((w) => readA(w).conflicts[id]);
  if (!cf || ev.length < 2) return null;
  return (
    <div className="hire-a-ref" aria-label="Two sources that disagree">
      <span className="hire-a-ref-head"><span className="lab">{cf.topic}</span><span className="ds-tag" data-k={how ? 'ok' : 'warn'}>{how ? (how === 'INTERVIEW' ? 'Checking in interview' : 'Asked the candidate') : 'Sources disagree'}</span></span>
      <div className="hire-a-two">
        {ev.map((e) => { const g = evidenceGlyph(e); return (
          <div key={e.evidenceId}>
            <span className="t14" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Glyph k={g.k} size={14} />{g.label}</span>
            <b>{e.title}</b>
            <span className="t14">{e.source} · {dayLabel(e.observedAt)}</span>
            <span className="t14">Limit: {e.limits}</span>
          </div>); })}
      </div>
    </div>
  );
}
