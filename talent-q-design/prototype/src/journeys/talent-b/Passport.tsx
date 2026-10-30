// T3 · Evidence Passport workspace: a portfolio of proof (grouped by how much weight it carries, with a
// proof-at-a-glance strip), simulated resumable uploads, issuer checks with plain explanations, inline previews,
// confidential originals with redacted summaries, a per-item × per-organisation disclosure matrix with "what X
// sees" (the same visibleEvidence() the recruiter pages read), Q's summary with its basis, and recruiter-search
// settings whose preview is computed by the store's own privacy policy (canSeeCandidate / canDiscover).
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Evidence } from '@contracts';
import { actorOf, useWorld, visibleEvidence } from '../../mock/world';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { SwitchRow } from '../../ds/Switch';
import { arrive } from '../../ds/motion';
import { runAction, useViewState } from '../../q/core/engine';
import { prefillQ } from '../../q/QThread';
import { useRoute, navigate } from '../../ui/router';
import { CELL_LABEL, KIND, VER, cellOf, cellOn, discoveryOf, isCode, myEvidence, orgName, reachOf, redactedOf, summaryFor, tb, verOf, viewerOrgs, checkRunning, type Cell } from './logic';
import { SeenBy, UploadRow, VerTag } from './ui';
import type { UploadKind } from '../../state/areas/talent-b';
// MEDIA (audit addendum §F): video and voice evidence lives in the Proof view, not on a second evidence page.
import { MediaSection } from '../media/Candidate';
// EVIDENCE-FIRST (build pack 30 Oct, item D): proof classes in the recruiter's words, source, freshness, reuse scope,
// the CV shown as claims, and P6 CV help. Shared logic lives in journeys/evidence/candidate.
import { CLASS_ORDER, PROOF_WORD, freshness, proofClass, reuseScope, requestsFor } from '../evidence/candidate/logic';
import { ClassKey, ProofClassTag } from '../evidence/candidate/ProofClass';
import { CvSection } from '../evidence/candidate/Cv';
import type { ProofClass } from '../../state/domain';
import type { World } from '../../mock/world';
import { media as mediaArea } from '../../state/areas/media';
import { ShareReceiptLine } from '../talent-d/ui'; // TALENT-D (MO-052): shared only after a consent receipt

type Tab = 'items' | 'sharing' | 'summary' | 'discovery';
const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
const month = (d: string) => new Date(`${d.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

export function PassportPage() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const pid = a.personId!;
  const { query } = useRoute();
  const [tab, setTab] = useViewState<Tab>('tab', 'items');
  const [as, setAs] = useViewState<string>('as', 'me');
  const [item, setItem] = useViewState<string | null>('item', null);
  const q = query.toString();
  useEffect(() => {
    const t = query.get('tab') as Tab | null, v = query.get('as'), i = query.get('item');
    if (v) { setAs(v); setTab('sharing'); } else if (i) { setItem(i); setTab('items'); } else if (query.get('media') || query.get('cv')) setTab('items'); else if (t) setTab(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = myEvidence(w, pid);
  const offline = w.network === 'offline';
  return (
    // Short view labels so all four fit at 390 px without a hidden, sideways-scrolling tab.
    <Canvas title="Evidence Passport" kicker="Private until you choose to share" open onClose={() => navigate('/c/home')}
      views={[{ id: 'items', label: 'Proof' }, { id: 'sharing', label: 'Sharing' }, { id: 'summary', label: 'Summary' }, { id: 'discovery', label: 'Search' }]} view={tab} setView={(v) => { setTab(v); if (q) navigate('/c/passport'); }}>
      {offline && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">⚠</span><span>You’re offline. Uploads and checks pause and carry on when you reconnect. Nothing is lost.</span><span /></div>}
      {tab === 'items' && <Items items={items} pid={pid} first={a.first} item={item} setItem={setItem} />}
      {tab === 'sharing' && <Sharing items={items} pid={pid} as={as} setAs={setAs} />}
      {tab === 'summary' && <Summary pid={pid} />}
      {tab === 'discovery' && <Discovery pid={pid} />}
    </Canvas>
  );
}

// ---------------- Proof at a glance (part-to-whole strip, direct labels, legend always present) ----------------
// Segments are proof classes (the same words recruiters see), plus confidential originals, which have no class to show.
type SegK = ProofClass | 'CONFIDENTIAL';
const SEG: { k: SegK; label: string }[] = [...CLASS_ORDER.map((k) => ({ k: k as SegK, label: PROOF_WORD[k] })), { k: 'CONFIDENTIAL', label: 'Confidential' }];
const segOf = (w: World, e: Evidence): SegK => (e.confidential ? 'CONFIDENTIAL' : proofClass(w, e));
function ProofAtAGlance({ items, pid, first }: { items: Evidence[]; pid: string; first: string }) {
  const w = useWorld((x) => x);
  const person = w.people.find((p) => p.personId === pid);
  const n = Object.fromEntries(SEG.map((s) => [s.k, items.filter((e) => segOf(w, e) === s.k).length])) as Record<SegK, number>;
  const total = items.length;
  const strong = n.ISSUER_VERIFIED + n.ASSESSED;
  const sharedWith = viewerOrgs(w, pid).filter((o) => items.some((e) => cellOn(cellOf(w, e, o)))).length;
  const pub = items.filter((e) => e.visibility === 'PUBLIC_PROFILE' && !e.confidential).length;
  const lead = strong
    ? `${first}, ${strong} of your ${total} items ${strong === 1 ? 'is' : 'are'} assessed or confirmed by the issuer. Employers give those the most weight.`
    : `${first}, nothing is assessed or confirmed by an issuer yet. That’s where everyone starts: one reviewed piece of work changes it.`;
  return (
    <section className="ds-sheet tb-hero" aria-labelledby="tb-hero-h">
      <div className="tb-hero-id">
        <h2 id="tb-hero-h" className="voice tb-hero-name">{person?.name ?? first}</h2>
        <p className="t14 muted" style={{ margin: 0 }}>{[person?.headline, person?.location].filter(Boolean).join(' · ')}</p>
      </div>
      <p className="tb-hero-lead">{lead}</p>
      {total > 0 && (
        <figure className="tb-strip" aria-label="Your proof at a glance">
          <div className="tb-strip-bar" aria-hidden="true">
            {SEG.filter((s) => n[s.k]).map((s) => <i key={s.k} data-k={s.k} style={{ flexGrow: n[s.k] }} title={`${s.label}: ${n[s.k]}`} />)}
          </div>
          <figcaption>
            <ul className="tb-strip-key">
              {SEG.filter((s) => n[s.k]).map((s) => <li key={s.k}><i data-k={s.k} aria-hidden="true" /><b className="num">{n[s.k]}</b> {s.label}</li>)}
            </ul>
          </figcaption>
        </figure>
      )}
      <p className="t14 muted" style={{ margin: 0 }}>{sharedWith ? `Shared with ${sharedWith} organisation${sharedWith === 1 ? '' : 's'}` : 'Not shared with anyone yet'}{pub ? ` · ${pub} public on your profile` : ''}</p>
      <details className="tb-details t14">
        <summary>What the labels mean</summary>
        <p className="t14" style={{ margin: '8px 0' }}>How each item is known. Recruiters see exactly these words.</p>
        <ClassKey />
        <p className="t14" style={{ margin: '12px 0 4px' }}>Checks on an item:</p>
        <ul>{(['VERIFIED', 'PENDING', 'UNDER_REVIEW', 'FAILED', 'UNVERIFIED'] as const).map((v) => <li key={v}><b>{VER[v].label}</b>: {VER[v].plain}</li>)}</ul>
      </details>
    </section>
  );
}

// ---------------- Items: uploads, grouped portfolio, inline previews ----------------
// Grouped by proof class, strongest first; confidential originals apart. "Not yet" reads as normal, never as failure.
const GROUPS: { id: string; title: string; note: string; test: (w: World, e: Evidence) => boolean }[] = [
  { id: 'issuer', title: 'Issuer-verified', note: 'Confirmed by whoever issued it: a registry, an employer or a referee.', test: (w, e) => !e.confidential && proofClass(w, e) === 'ISSUER_VERIFIED' },
  { id: 'assessed', title: 'Assessed', note: 'A reviewer looked at the work, or an assessment recorded a result.', test: (w, e) => !e.confidential && proofClass(w, e) === 'ASSESSED' },
  { id: 'self', title: 'Self-reported', note: 'Your own work, not yet checked or reviewed. Waiting isn’t failing; these still count as yours.', test: (w, e) => !e.confidential && proofClass(w, e) === 'SELF_REPORTED' },
  { id: 'claim', title: 'Claims', note: 'Things you’ve said, for example in your CV. Employers read them as your account.', test: (w, e) => !e.confidential && proofClass(w, e) === 'CLAIM' },
  { id: 'disputed', title: 'Disputed', note: 'Under review after a challenge. Left out of comparisons until it’s resolved.', test: (w, e) => !e.confidential && proofClass(w, e) === 'DISPUTED' },
  { id: 'conf', title: 'Confidential', note: 'Only you can open these. Share a redacted summary instead.', test: (_w, e) => !!e.confidential },
];

function Items({ items, pid, first, item, setItem }: { items: Evidence[]; pid: string; first: string; item: string | null; setItem: (v: string | null) => void }) {
  const w = useWorld((x) => x);
  const ups = useWorld((w) => tb(w).uploads.filter((u) => u.personId === pid && u.state !== 'CANCELLED' && u.state !== 'DONE'));
  const [link, setLink] = useState('');
  const [linkErr, setLinkErr] = useState('');
  const [drop, setDrop] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const up = (kind: UploadKind, name?: string) => act('tb.upload', { kind, name, fail: drop });
  return (
    <>
      {items.length > 0 && <ProofAtAGlance items={items} pid={pid} first={first} />}
      <CvSection pid={pid} />
      <section className="ds-sheet tb-stack" aria-labelledby="tb-up-h">
        <div className="tb-row-between"><h2 id="tb-up-h" className="tb-h2">Add proof</h2><span className="ds-sim">Simulated upload</span></div>
        <p className="t14 muted" style={{ margin: 0 }}>Everything you add stays private until you share it. You can also tell Q: “upload my AWS cert”.</p>
        <div className="tb-upbtns">
          <button type="button" className="ds-btn" onClick={() => up('CV')}>Upload a CV</button>
          <button type="button" className="ds-btn" onClick={() => up('CERTIFICATE')}>Upload a certificate</button>
          <button type="button" className="ds-btn" onClick={() => up('WORK_SAMPLE')}>Upload a work sample</button>
          <button type="button" className="ds-btn" aria-expanded={showLink} onClick={() => setShowLink(!showLink)}>Add a link</button>
          <button type="button" className="ds-btn" onClick={() => act('media.start')}>Add a video or voice</button>
        </div>
        {showLink && (
          <form className="tb-linkform" onSubmit={(e) => { e.preventDefault(); if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(link.trim())) { setLinkErr('That doesn’t look like a web address. Try something like github.com/yourname/project.'); return; } setLinkErr(''); up('LINK', link.trim()); setLink(''); setShowLink(false); }}>
            <div className="ds-field" style={{ flex: 1, minWidth: 0 }}><label htmlFor="tb-link">Link to your work</label><input id="tb-link" className="ds-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="github.com/you/project" aria-invalid={!!linkErr} aria-describedby={linkErr ? 'tb-link-err' : undefined} inputMode="url" autoFocus /></div>
            <button type="submit" className="ds-btn primary">Add link</button>
          </form>
        )}
        {linkErr && <p id="tb-link-err" className="t14" role="alert" style={{ margin: 0, color: 'var(--risk)' }}>{linkErr}</p>}
        {ups.length > 0 && <div className="tb-stack" aria-label="Uploads in progress">{ups.map((u) => <UploadRow key={u.id} u={u} onRetry={() => act('tb.upload.retry', { id: u.id })} onCancel={() => act('tb.upload.cancel', { id: u.id })} />)}</div>}
        <details className="t14 tb-demo"><summary className="muted">Demo settings</summary><SwitchRow label="Drop the connection at 60%" help="For trying out a failed upload and resuming it." on={drop} onChange={setDrop} /></details>
      </section>
      <MediaSection pid={pid} />

      {items.filter((e) => verOf(e) === 'FAILED').map((e) => <div key={e.evidenceId} className="ds-banner" data-k="risk" role="status"><span aria-hidden="true">✕</span><span><b>{e.title}: check failed.</b> The issuer couldn’t confirm it. It’s usually a typo or an expired record, and it’s fixable.</span><button type="button" className="ds-btn" onClick={() => setItem(e.evidenceId)}>See what to do</button></div>)}

      {items.length === 0 ? (
        <section className="ds-sheet tb-empty">
          <Glyph k="none" size={28} />
          <h2 className="tb-h2">Your Passport is ready for its first piece of proof</h2>
          <p style={{ margin: 0 }}>Add a CV, a certificate, a work sample or a link above, or just tell Q about something you’ve done. {first}, nothing here is shared until you choose.</p>
        </section>
      ) : GROUPS.map((g) => {
        const list = items.filter((e) => g.test(w, e));
        if (!list.length) return null;
        return (
          <section key={g.id} className="tb-group" aria-labelledby={`tb-g-${g.id}`}>
            <header className="tb-group-h"><h2 id={`tb-g-${g.id}`} className="tb-h2">{g.title} <span className="tb-count num">{list.length}</span></h2><p className="t14 muted">{g.note}</p></header>
            <ul className="tb-grid" aria-label={g.title}>
              {list.map((e) => [
                <ItemCard key={e.evidenceId} e={e} selected={e.evidenceId === item} onOpen={() => setItem(e.evidenceId === item ? null : e.evidenceId)} />,
                e.evidenceId === item ? <Preview key={`${e.evidenceId}-p`} e={e} onClose={() => setItem(null)} /> : null,
              ])}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function ItemCard({ e, selected, onOpen }: { e: Evidence; selected: boolean; onOpen: () => void }) {
  const w = useWorld((x) => x);
  const v = verOf(e); const running = checkRunning(w, e.evidenceId);
  const red = e.confidential ? redactedOf(w, e.evidenceId) : undefined;
  const fresh = freshness(w, e);
  const waiting = requestsFor(w, e.ownerId).find((d) => d.resultEvidenceId === e.evidenceId && d.state === 'SUBMITTED');
  const live = e.visibility === 'SHARED_WITH' && !e.confidential ? e.sharedWith.filter((o) => !e.revokedFrom?.includes(o)) : [];
  const ended = (e.revokedFrom ?? []).filter((o) => !live.includes(o));
  const checkable = (e.kind === 'CREDENTIAL' || /link|repository/i.test(e.source)) && !e.confidential && v !== 'VERIFIED' && v !== 'UNDER_REVIEW';
  return (
    <li className="ds-sheet tb-card" data-selected={selected || undefined} data-conf={e.confidential || undefined} data-v={v}>
      {/* The proof class leads (the recruiter's word); a check tag shows only while a check is in flight or failed,
          since "Verified" / "Not checked" would repeat what the class already says. */}
      <div className="tb-row-between">{e.confidential ? <span className="lab">{KIND[e.kind]} · {month(e.observedAt)}</span> : <ProofClassTag id={e.evidenceId} k={proofClass(w, e)} extra={waiting ? 'waiting for review' : undefined} />}{running ? <span className="ds-tag" data-k="busy" aria-live="polite">Checking…</span> : (e.confidential || (['PENDING', 'FAILED', 'UNDER_REVIEW'].includes(v) && !waiting)) ? <VerTag e={e} /> : null}</div>
      {!e.confidential && <span className="lab">{KIND[e.kind]}{e.redactedOf ? ' · redacted' : ''} · {month(e.observedAt)}</span>}
      <h3 className="tb-title">{e.confidential && <span className="tb-lock" aria-label="Confidential">🔒</span>}{e.title}</h3>
      <p className="tb-shows">{e.shows}</p>
      <p className="t14 muted tb-limits"><span className="tb-limits-k">Limits</span> {e.limits}</p>
      <dl className="evc-meta" aria-label="About this item">
        <div><dt>Source</dt><dd>{e.source}</dd></div>
        <div><dt>Age</dt><dd className={fresh.old ? 'evc-old' : undefined}>{fresh.text}{fresh.old && e.kind === 'CREDENTIAL' ? '. Employers may weigh recent work more' : ''}</dd></div>
        <div><dt>Reuse</dt><dd>{reuseScope(w, e)}</dd></div>
      </dl>
      <ShareReceiptLine evidenceId={e.evidenceId} ownerId={e.ownerId} sharedWith={live} />
      {waiting && <p className="evc-await">Submitted for {orgName(w, waiting.orgId)}’s review. Until a person reviews it, it counts as your own work.</p>}
      <div className="tb-card-foot">
        <SeenBy e={e} />
        <div className="tb-actions">
          <button type="button" className="ds-btn" onClick={onOpen} aria-expanded={selected}>{selected ? 'Close preview' : 'Preview'}</button>
          {checkable && <button type="button" className="ds-btn" disabled={running} onClick={() => act('tb.verify', { id: e.evidenceId })}>{v === 'FAILED' ? 'Check again' : 'Check with the source'}</button>}
          {v === 'FAILED' && <button type="button" className="ds-btn" onClick={() => act('tb.verify.review', { id: e.evidenceId })}>Ask for a manual review</button>}
          {e.confidential && e.kind !== 'REFERENCE' && !red && <button type="button" className="ds-btn primary" onClick={() => act('tb.redact', { id: e.evidenceId })}>Make a redacted summary</button>}
          {e.redactedOf && v === 'UNVERIFIED' && <button type="button" className="ds-btn" onClick={() => act('tb.attest', { id: e.evidenceId })}>Ask a reference to confirm</button>}
          {live.map((o) => <button key={o} type="button" className="ds-btn quiet" onClick={() => act('tb.revoke', { ids: [e.evidenceId], org: o })}>Stop sharing with {orgName(w, o)}</button>)}
        </div>
        {ended.length > 0 && <p className="t14 muted" style={{ margin: 0 }} role="status">{ended.map((o) => orgName(w, o)).join(', ')} can no longer see this. <button type="button" className="tb-linkbtn" onClick={() => navigate(`/c/passport?as=${ended[0]}`)}>See what {orgName(w, ended[0])} sees now</button></p>}
      </div>
    </li>
  );
}

/** Opens in place, full width right after its card, so the eye doesn't have to travel (MO-033: arrives with the
 *  shared `arrive` token, 200 ms decelerate; reduced motion shows it directly). */
function Preview({ e, onClose }: { e: Evidence; onClose: () => void }) {
  const code = isCode(e) && !e.confidential;
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'nearest' }); }, [e.evidenceId]);
  return (
    <motion.li ref={ref} {...arrive} className="ds-sheet tb-stack tb-preview" aria-labelledby="tb-prev-h">
      <div className="tb-row-between"><h2 id="tb-prev-h" className="tb-h2">Preview: {e.title}</h2><button type="button" className="ds-btn quiet" onClick={onClose}>Close preview</button></div>
      {e.confidential && e.kind === 'REFERENCE' ? (
        <div className="tb-doc"><p><b>{e.title}</b></p><p>From: {e.source}. A reference confirms the work happened without revealing it. It stays confidential.</p></div>
      ) : e.confidential ? (
        <>
          <p className="ds-banner" style={{ margin: 0 }}><span aria-hidden="true">🔒</span><span><b>Only you can open this.</b> It’s marked confidential. Q won’t share it with anyone, even if asked; a redacted summary can be shared instead.</span><span /></p>
          <div className="tb-doc" aria-label="Original document (private)"><p><b>Lumen · Fraud rules v3 · design doc</b></p><p>Rules are evaluated per payout before release. Thresholds for merchant <mark>Kudi Ltd</mark> are set at <mark>₦4.2m / hour</mark>…</p><p>Back-test against <mark>11,400</mark> confirmed fraud cases from 2025…</p><p className="t14 muted" style={{ margin: 0 }}>Highlighted: the details a redacted summary removes.</p></div>
        </>
      ) : e.redactedOf ? (
        <div className="tb-doc" aria-label="Redacted summary"><p><b>Fraud-rules engine · summary</b></p><p>Rules are evaluated per payout before release. Thresholds for merchant <span className="tb-redact" aria-label="removed">██████</span> are set at <span className="tb-redact" aria-label="removed">████</span>.</p><p>Back-tested against <span className="tb-redact" aria-label="removed">█████</span> confirmed fraud cases. Rule versions are reviewed by two people before release.</p><p className="t14 muted" style={{ margin: 0 }}>Names, volumes and thresholds removed. This is what an employer would see.</p></div>
      ) : code ? (
        <pre className="tb-code" aria-label="Code excerpt">{`// ${e.title}\nfunc (w *Worker) Retry(ctx context.Context, p Payout) error {\n  key := idempotencyKey(p.ID, p.Attempt)\n  if done, _ := w.store.Seen(ctx, key); done {\n    return nil // already paid: safe to retry\n  }\n  return backoff.Do(ctx, func() error { return w.pay(ctx, p, key) })\n}`}</pre>
      ) : e.kind === 'CREDENTIAL' ? (
        <div className="tb-doc tb-cert" aria-label="Certificate image (simulated)"><p className="lab">Certificate</p><p className="voice t24" style={{ margin: 0 }}>{e.title}</p><p className="t14">Awarded to {e.ownerId === 'p_tobi' ? 'Tobi Adeyemi' : 'you'} · {e.observedAt}</p><p className="t14 muted">Validation no. {/aws/i.test(e.title) ? 'AWS-ASA-7Q2K-91XB' : 'UL/2019/CS/0412'}</p></div>
      ) : (
        <div className="tb-doc"><p>{e.shows}</p><p className="t14 muted" style={{ margin: 0 }}>Source: {e.source}</p></div>
      )}
      <p className="t14 tb-verline" style={{ margin: 0 }}><VerTag e={e} /> <span>{VER[verOf(e)].plain}</span></p>
      {verOf(e) === 'FAILED' && <p className="t14" style={{ margin: 0 }}><b>What you can do:</b> check the validation number for a typo, upload the official PDF from the issuer, or ask for a manual review.</p>}
    </motion.li>
  );
}

// ---------------- Sharing: preview as an organisation, and the disclosure matrix ----------------
function Sharing({ items, pid, as, setAs }: { items: Evidence[]; pid: string; as: string; setAs: (v: string) => void }) {
  const w = useWorld((x) => x);
  const orgs = viewerOrgs(w, pid);
  const reach = useMemo(() => reachOf(w, pid), [w, pid]);
  const narrow = useNarrow(760);
  const shareable = items.filter((e) => e.kind !== 'PRACTICE');
  const toggle = (e: Evidence, o: string, c: Cell) => act(cellOn(c) ? 'tb.revoke' : 'tb.share', { ids: [e.evidenceId], org: o });
  const cellBtn = (e: Evidence, o: string) => {
    const c = cellOf(w, e, o); const on = cellOn(c);
    if (mediaArea(w)?.items.some((m) => m.evidenceId === e.evidenceId) && c !== 'WITHDRAWN') return <button type="button" className="tb-cell" data-c={c} aria-label={`Choose which parts of “${e.title}” ${orgName(w, o)} sees`} onClick={() => navigate('/c/passport?media=parts')}>{on ? <Glyph k="full" size={12} /> : <span aria-hidden="true" className="tb-plus">+</span>}{on ? 'Some parts' : 'Choose parts'}</button>;
    if (c === 'LOCKED' || c === 'WITHDRAWN' || c === 'PUBLIC_UNSEEN') return <span className="tb-cell" data-c={c}>{c === 'LOCKED' ? <span aria-hidden="true">🔒</span> : null}{CELL_LABEL[c]}</span>;
    return <button type="button" className="tb-cell" data-c={c} aria-pressed={on} aria-label={`${on ? `End ${orgName(w, o)}’s access to` : `Share with ${orgName(w, o)}:`} ${e.title}`} onClick={() => toggle(e, o, c)}>{on ? <Glyph k="full" size={12} /> : <span aria-hidden="true" className="tb-plus">+</span>}{on ? CELL_LABEL[c] : c === 'REVOKED' ? 'Access ended' : 'Share'}</button>;
  };
  const viewing = as !== 'me' ? as : null;
  const vis = viewing ? visibleEvidence(w, pid, viewing) : [];
  const vr = viewing ? reach.find((r) => r.org === viewing) : undefined;
  const orgHead = (o: string) => { const r = reach.find((x) => x.org === o); return <><span>{orgName(w, o)}</span><span className="tb-colnote">{r?.agency ? 'Agency' : 'Employer'}</span></>; };
  return (
    <>
      <section className="ds-sheet tb-stack" aria-labelledby="tb-as-h">
        <h2 id="tb-as-h" className="tb-h2">See your Passport as they do</h2>
        <div className="tb-filters" role="group" aria-label="View as">
          <button type="button" className="ds-filter" aria-pressed={!viewing} onClick={() => setAs('me')}>Me (everything)</button>
          {orgs.map((o) => <button key={o} type="button" className="ds-filter" aria-pressed={viewing === o} onClick={() => setAs(o)}>{orgName(w, o)}</button>)}
        </div>
        {viewing ? (
          <motion.div key={viewing} {...arrive} className="tb-viewas" aria-live="polite">
            <p className="tb-viewas-k"><b className="num">{vis.length}</b><span>of your {shareable.length} items are visible to <b>{orgName(w, viewing)}</b>.</span></p>
            {vr && <p className="t14 muted" style={{ margin: 0 }}>{vr.sees ? vr.reason : `They can’t see you at all. ${vr.reason}`}</p>}
            {vis.length ? <ul className="tb-mini">{vis.map((e) => <li key={e.evidenceId}><span className="tb-break"><b>{e.title}</b> · {KIND[e.kind]}</span><VerTag e={e} /></li>)}</ul> : <p className="t14" style={{ margin: 0 }}>Nothing from your Passport.</p>}
            {items.some((e) => cellOf(w, e, viewing) === 'REVOKED') && <p className="t14 muted" style={{ margin: 0 }}>{orgName(w, viewing)} was told only that access to {items.filter((e) => cellOf(w, e, viewing) === 'REVOKED').length} item(s) ended, not which or why.</p>}
            <p className="t14 muted" style={{ margin: 0 }}>This is the same data their recruiter page reads. Practice and confidential originals are never visible.</p>
          </motion.div>
        ) : <p className="t14 muted" style={{ margin: 0 }}>Pick an organisation to see exactly what their recruiters see.</p>}
      </section>
      <section className="ds-sheet tb-stack" aria-labelledby="tb-mx-h">
        <div className="tb-row-between"><h2 id="tb-mx-h" className="tb-h2">Who sees what</h2><span className="t14 muted">Changes take effect straight away</span></div>
        {narrow ? (
          <ul className="tb-matrix-list">
            {shareable.map((e) => (
              <li key={e.evidenceId}>
                <div className="tb-row-between"><b className="tb-break">{e.title}</b><VerTag e={e} /></div>
                <ul className="tb-mrows">{orgs.map((o) => <li key={o}><span className="tb-mrow-org">{orgHead(o)}</span>{cellBtn(e, o)}</li>)}</ul>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ds-table-wrap" tabIndex={0} role="region" aria-label="Disclosure table">
            <table className="ds-table tb-matrix">
              <caption className="sr">Each row is a Passport item; each column an organisation. Buttons share or end access.</caption>
              <thead><tr><th scope="col">Item</th>{orgs.map((o) => <th key={o} scope="col"><span className="tb-colhead">{orgHead(o)}</span></th>)}</tr></thead>
              <tbody>{shareable.map((e) => <tr key={e.evidenceId}><th scope="row"><span className="tb-rowhead"><span className="tb-break">{e.title}</span><VerTag e={e} /></span></th>{orgs.map((o) => <td key={o}>{cellBtn(e, o)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        <p className="t14 muted" style={{ margin: 0 }}><b>Public</b> items are on your profile, so any organisation that can find or see you sees them. Ending one organisation’s access hides them from that organisation only. Or ask Q: “stop Talentbridge seeing my code”.</p>
      </section>
    </>
  );
}

// ---------------- Q's summary of the person, with its basis and corrections ----------------
function Summary({ pid }: { pid: string }) {
  const w = useWorld((x) => x);
  const lines = useMemo(() => summaryFor(w, pid), [w, pid]);
  return (
    <section className="ds-sheet tb-stack" aria-labelledby="tb-sum-h">
      <h2 id="tb-sum-h" className="tb-h2">How Q describes you</h2>
      <p className="t14 muted" style={{ margin: 0 }}>Q only uses your Passport and what you’ve told it, and each line shows what it rests on. Employers see this only for items you’ve shared with them.</p>
      <ul className="tb-sum">
        {lines.map((l) => (
          <li key={l.topic} data-corrected={l.corrected || undefined}>
            <b className="tb-sum-text">{l.text}</b>
            <span className="t14 muted">{l.corrected ? '' : 'Based on: '}{l.basis}</span>
            <button type="button" className="tb-linkbtn" onClick={() => prefillQ(`That's wrong about ${l.topic === 'lead' ? 'leading people' : l.topic === 'go' ? 'Go' : l.topic}: `)}>Correct this</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------- Recruiter search: the rule, and an honest preview computed by the store's policy ----------------
function Discovery({ pid }: { pid: string }) {
  const w = useWorld((x) => x);
  const d = discoveryOf(w, pid); const on = !!w.consents[pid]?.discoverable;
  const who = on ? d.who : 'NOBODY';
  const person = w.people.find((p) => p.personId === pid);
  const pub = myEvidence(w, pid).filter((e) => e.visibility === 'PUBLIC_PROFILE' && !e.confidential);
  const reach = useMemo(() => reachOf(w, pid), [w, pid]);
  const yes = reach.filter((r) => r.sees); const no = reach.filter((r) => !r.sees);
  const offOrg = d.hideFrom.filter((x) => !w.orgs.some((o) => o.id === x));
  const opts = [
    ['ANYONE', 'Anyone looking to hire', 'Any employer or agency on Talent Q. New businesses that aren’t verified yet can find you too, but they can only send a few messages a week, can’t post jobs, and every message from them says they aren’t verified.'],
    ['VERIFIED_EMPLOYERS', 'Checked employers only', 'Employers whose web domain and business registration we’ve both checked. Agencies can’t find you.'],
    ['EMPLOYERS_AND_AGENCIES', 'Employers and agencies', 'Any employer or recruitment agency whose web domain we’ve checked, including employers whose registration isn’t confirmed yet.'],
    ['NOBODY', 'Nobody', 'You won’t appear in search. You can still apply, and anyone you’ve shared with keeps what you shared.'],
  ] as const;
  const row = (r: (typeof reach)[number]) => (
    <li key={r.org} data-sees={r.sees || undefined}>
      <span className="tb-reach-mark" aria-hidden="true">{r.sees ? <Glyph k="full" size={14} /> : <Glyph k="none" size={14} />}</span>
      <span className="tb-reach-body"><b>{r.name}</b> <span className="tb-colnote">{r.agency ? 'Agency' : 'Employer'}{r.via === 'LINK' ? ' · you have a link' : r.via === 'SEARCH' ? ' · can find you' : ''}</span><span className="t14 muted" style={{ display: 'block' }}>{r.reason}</span></span>
      {who !== 'NOBODY' && r.via !== 'LINK' && (r.hidden
        ? <button type="button" className="tb-linkbtn" onClick={() => act('tb.discovery', { unhide: r.org })} aria-label={`Stop hiding from ${r.name}`}>Stop hiding</button>
        : r.via === 'SEARCH' ? <button type="button" className="tb-linkbtn" onClick={() => act('tb.discovery', { hide: r.org })} aria-label={`Hide from ${r.name}`}>Hide from them</button> : null)}
    </li>
  );
  return (
    <>
      <section className="ds-sheet tb-stack" aria-labelledby="tb-disc-h">
        <h2 id="tb-disc-h" className="tb-h2">Who can find you in recruiter search</h2>
        <p className="t14 muted" style={{ margin: 0 }}>Search is how recruiters who don’t know you yet come across your profile.</p>
        <div className="tb-stack" role="group" aria-label="Who can find you">
          {opts.map(([v, l, s]) => <button key={v} type="button" className="ds-opt" aria-pressed={who === v} onClick={() => act('tb.discovery', { who: v })}><span><b>{l}</b><span className="t14 muted" style={{ display: 'block' }}>{s}</span></span></button>)}
        </div>
      </section>

      <section className="ds-sheet tb-stack" aria-labelledby="tb-reach-h">
        <div className="tb-row-between"><h2 id="tb-reach-h" className="tb-h2">Right now</h2><span className="t14 muted num">{yes.length} can see you · {no.length} can’t</span></div>
        <p className="t14 muted" style={{ margin: 0 }}>Worked out by the same rules Talent Q uses to decide, so this list is exactly what happens.</p>
        <ul className="tb-reach" aria-label="Organisations that can see you">{yes.map(row)}</ul>
        {no.length > 0 && <><h3 className="lab" style={{ margin: '4px 0 0' }}>Can’t find you</h3><ul className="tb-reach" aria-label="Organisations that can’t find you">{no.map(row)}</ul></>}
        {offOrg.length > 0 && <p className="t14" style={{ margin: 0 }}>Also always hidden from: {offOrg.map((x) => (x === 'org_fleetline' ? 'Fleetline, your current employer (not on Talent Q)' : x)).join(', ')}.</p>}
      </section>

      <section className="ds-sheet tb-stack" aria-labelledby="tb-rules-h">
        <h2 id="tb-rules-h" className="tb-h2">How it works, in plain words</h2>
        <ol className="tb-rules">
          <li><b>Search follows your setting above.</b> “Checked” means we confirmed the organisation’s web domain, and for employers-only, their business registration too.</li>
          <li><b>Hiding from one organisation</b> takes you out of their search, whatever your setting.</li>
          <li><b>If you applied, shared something or registered with them,</b> they can still see you and what you gave them, even with search off. End that from Sharing.</li>
          <li><b>Withdrawing consent beats everything.</b> They then see nothing at all.</li>
        </ol>
      </section>

      <section className="ds-sheet tb-stack" aria-labelledby="tb-disc-p">
        <h2 id="tb-disc-p" className="tb-h2">What a recruiter sees when they find you</h2>
        {who === 'NOBODY' ? <p style={{ margin: 0 }}>Nothing: you don’t appear in search.</p> : (
          <div className="tb-viewas"><b>{person?.name}</b><span>{person?.headline} · {person?.location}</span><span className="t14">{pub.length ? `Public items: ${pub.map((e) => e.title).join('; ')}` : 'No public items.'}</span><span className="t14 muted">Pay expectations and anything private are never shown.</span></div>
        )}
      </section>
    </>
  );
}
