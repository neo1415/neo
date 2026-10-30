// Shared bits for TALENT-D pages: the atlas variants (loading, error, permission denied, empty), source chips,
// consent receipts, and the MO-040 stage tag (an application's stage changes only after an employer event).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DUR, EASE } from '../../ds/motion';
import { Link } from '../../ui/router';
import { actorOf, useWorld } from '../../mock/world';
import { tdRead } from '../../state/areas/talent-d';
import type { Receipt } from '../../state/areas/talent-d';
import type { AppStatus } from '../../state/domain';
import { dayTime, type DemoState } from './logic';
import { APP_K as K, APP_LABEL as STAGE } from '../talent-b/logic';
import { Still } from './motions';
import './talent-d.css';

/** Loading, error and permission-denied variants, shared by every TALENT-D page. Text carries every state. */
export function Variant({ state, what, back, children }: { state: DemoState; what: string; back: { to: string; label: string }; children?: ReactNode }) {
  if (state === 'loading') return (
    <section className="ds-sheet td-stack" aria-busy="true" aria-label={`Loading ${what}`}>
      <p className="t14 muted" role="status" style={{ margin: 0 }}>Loading {what}…</p>
      <div className="ds-skeleton td-skel" style={{ width: '60%' }} /><div className="ds-skeleton td-skel" /><div className="ds-skeleton td-skel" style={{ width: '80%' }} />
    </section>
  );
  if (state === 'error') return (
    <section className="ds-sheet td-stack" role="alert">
      <h2 className="tb-h2">Couldn’t load {what}</h2>
      <p style={{ margin: 0 }}>The connection dropped before it finished. Nothing you saved is lost, and nothing was shared.</p>
      <div className="tb-actions"><Link className="ds-btn primary" to={location.hash.replace(/^#/, '').replace(/[?&]state=error/, '')}>Try again</Link><Link className="ds-btn quiet" to={back.to}>{back.label}</Link></div>
    </section>
  );
  if (state === 'denied') return (
    <section className="ds-sheet td-stack" role="alert">
      <h2 className="tb-h2">This isn’t yours to open</h2>
      <p style={{ margin: 0 }}>It belongs to another person, and only they can see it. Nothing about it is shown here.</p>
      <Link className="ds-btn" style={{ justifySelf: 'start' }} to={back.to}>{back.label}</Link>
    </section>
  );
  return <>{children}</>;
}

/** Where a line comes from. "Your words" is its own source, never hidden. */
export function Source({ text, mine }: { text: string | null; mine?: boolean }) {
  if (!text && !mine) return null;
  return <span className="td-src" data-k={mine ? 'you' : 'src'}><span aria-hidden="true">{mine ? '✎' : '↳'}</span><span className="sr">Source: </span>{mine && !text ? 'Your words' : text}</span>;
}

/** A consent receipt: what, who, when, and how to end it. MO-052/MO-041 hang their state change on it. */
export function ReceiptCard({ r, org, onEnd }: { r: Receipt; org: string; onEnd?: () => void }) {
  return (
    <div className="td-receipt" data-ended={r.endedAt ? 'yes' : undefined} role="group" aria-label={`Consent receipt ${r.id}`}>
      <div className="tb-row-between"><span className="lab">Consent receipt</span><span className="num t14">{r.id}</span></div>
      <dl className="td-dl">
        <div><dt>What</dt><dd>{r.what}</dd></div>
        <div><dt>Who</dt><dd>{org} only</dd></div>
        <div><dt>When</dt><dd>{dayTime(r.at)}</dd></div>
        <div><dt>Status</dt><dd>{r.endedAt ? `Access ended ${dayTime(r.endedAt)}` : 'Active until you end it'}</dd></div>
      </dl>
      {!r.endedAt && onEnd && <button type="button" className="ds-btn quiet" onClick={onEnd}>End {org}’s access</button>}
    </div>
  );
}

/** MO-040: the stage changes only when the employer's event lands; the old stage slides out, the new one settles
 *  in (200 ms, decelerate). Reduced motion: the stage text simply changes. A polite live region says it once. */
export function StageTag({ status, by }: { status: AppStatus; by?: string }) {
  const prev = useRef(status); const [changed, setChanged] = useState<string | null>(null);
  useEffect(() => { if (prev.current !== status) { setChanged(`Status changed from ${STAGE[prev.current]} to ${STAGE[status]}${by ? `, after ${by} updated it` : ''}.`); prev.current = status; } }, [status, by]);
  return (
    <Still><span className="td-stage" data-changed={changed ? 'yes' : undefined}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={status} className="ds-tag" data-k={K[status]} data-stage={status}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE.enter } }} exit={{ opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE.exit } }}>
          {STAGE[status]}
        </motion.span>
      </AnimatePresence>
      <span className="sr" aria-live="polite">{changed ?? ''}</span>
    </span></Still>
  );
}

/** MO-052 on the Passport card: an item shared from the wizard says it went out only after a consent receipt. */
export function ShareReceiptLine({ evidenceId, ownerId, sharedWith }: { evidenceId: string; ownerId: string; sharedWith: string[] }) {
  const r = useWorld((w) => { const s = tdRead(w).wizard[ownerId]; return s?.receipt && evidenceId === `e_j7_${ownerId}_assess_${s.comp}` ? s.receipt : null; });
  const org = useWorld((w) => (r ? w.orgs.find((o) => o.id === r.org)?.name ?? r.org : ''));
  if (!r) return null;
  const live = sharedWith.includes(r.org);
  return <p className="t14" style={{ margin: 0 }}><span className="td-sharestate" data-s={live ? 'shared' : 'private'}><span>{live ? `Shared with ${org}` : 'Private'}</span></span> {live ? `after your consent receipt ${r.id}, ${dayTime(r.at)}.` : `Receipt ${r.id} is kept; ${org}’s access has ended.`}</p>;
}

/** The way into a cover note from a job page (SC-087). Respects "not for me" on cover notes: then it's a quiet link. */
export function LetterLink({ jobId }: { jobId: string }) {
  const declined = useWorld((w) => { const a = actorOf(w); return ((w.areas['talent-b'] as { declined?: Record<string, string[]> } | undefined)?.declined?.[a.personId ?? ''] ?? []).includes('cover_note'); });
  const has = useWorld((w) => { const a = actorOf(w); return !!tdRead(w).letters[`${a.personId}:${jobId}`]; });
  return <p className="t14" style={{ margin: 0 }}><Link to={`/c/jobs/${jobId}/letter`} style={{ color: 'inherit' }}>{has ? 'Your cover note for this job' : declined ? 'Write a cover note yourself' : 'Write a short cover note with Q, from your own facts'}</Link></p>;
}
