// T3 · Evidence Passport workspace: uploads (simulated, resumable), certificates with check status and plain
// explanations, previews, confidential originals with redacted summaries, a per-item × per-organisation
// disclosure matrix with "what X sees" (the same visibleEvidence() the recruiter pages read), Q's summary of
// the person with its basis, and discovery settings. Q can do all of it from the conversation.
import { useEffect, useMemo, useState } from 'react';
import type { Evidence } from '@contracts';
import { actorOf, useWorld, visibleEvidence } from '../../mock/world';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { runAction, useViewState } from '../../q/core/engine';
import { prefillQ } from '../../q/QThread';
import { useRoute, navigate } from '../../ui/router';
import { CELL_LABEL, KIND, VER, cellOf, discoveryOf, isCode, myEvidence, orgName, redactedOf, summaryFor, tb, verOf, viewerOrgs, checkRunning, type Cell } from './logic';
import { SeenBy, UploadRow, VerTag } from './ui';
import type { UploadKind } from '../../state/areas/talent-b';

type Tab = 'items' | 'sharing' | 'summary' | 'discovery';
const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

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
    if (v) { setAs(v); setTab('sharing'); } else if (i) { setItem(i); setTab('items'); } else if (t) setTab(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = myEvidence(w, pid);
  const offline = w.network === 'offline';
  return (
    <Canvas title="Evidence Passport" kicker={`${a.name} · private until you share`} open onClose={() => navigate('/c/home')}
      views={[{ id: 'items', label: 'Items' }, { id: 'sharing', label: 'Who sees what' }, { id: 'summary', label: 'How Q describes you' }, { id: 'discovery', label: 'Recruiter search' }]} view={tab} setView={(v) => { setTab(v); if (q) navigate('/c/passport'); }}>
      {offline && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">⚠</span><span>You’re offline. Uploads and checks pause and carry on when you reconnect. Nothing is lost.</span><span /></div>}
      {tab === 'items' && <Items items={items} pid={pid} first={a.first} item={item} setItem={setItem} />}
      {tab === 'sharing' && <Sharing items={items} pid={pid} as={as} setAs={setAs} />}
      {tab === 'summary' && <Summary pid={pid} />}
      {tab === 'discovery' && <Discovery pid={pid} />}
    </Canvas>
  );
}

// ---------------- Items: uploads, cards, previews ----------------
function Items({ items, pid, first, item, setItem }: { items: Evidence[]; pid: string; first: string; item: string | null; setItem: (v: string | null) => void }) {
  const ups = useWorld((w) => tb(w).uploads.filter((u) => u.personId === pid && u.state !== 'CANCELLED' && u.state !== 'DONE'));
  const [link, setLink] = useState('');
  const [linkErr, setLinkErr] = useState('');
  const [drop, setDrop] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const sel = items.find((e) => e.evidenceId === item);
  const up = (kind: UploadKind, name?: string) => act('tb.upload', { kind, name, fail: drop });
  return (
    <>
      <section className="ds-sheet tb-stack" aria-labelledby="tb-up-h">
        <div className="tb-row-between"><h2 id="tb-up-h" className="voice t24" style={{ margin: 0 }}>Add proof</h2><span className="ds-sim">Simulated upload</span></div>
        <p className="t14 muted" style={{ margin: 0 }}>Private until you share it. Or tell Q: “upload my AWS cert”.</p>
        <div className="tb-upbtns">
          <button type="button" className="ds-btn" onClick={() => up('CV')}>CV</button>
          <button type="button" className="ds-btn" onClick={() => up('CERTIFICATE')}>Certificate</button>
          <button type="button" className="ds-btn" onClick={() => up('WORK_SAMPLE')}>Work sample</button>
          <button type="button" className="ds-btn" aria-expanded={showLink} onClick={() => setShowLink(!showLink)}>Link…</button>
        </div>
        {showLink && (
          <form className="tb-linkform" onSubmit={(e) => { e.preventDefault(); if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(link.trim())) { setLinkErr('That doesn’t look like a web address. Try something like github.com/yourname/project.'); return; } setLinkErr(''); up('LINK', link.trim()); setLink(''); setShowLink(false); }}>
            <div className="ds-field" style={{ flex: 1, minWidth: 0 }}><label htmlFor="tb-link">Link to your work</label><input id="tb-link" className="ds-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="github.com/you/project" aria-invalid={!!linkErr} aria-describedby={linkErr ? 'tb-link-err' : undefined} inputMode="url" autoFocus /></div>
            <button type="submit" className="ds-btn">Add link</button>
          </form>
        )}
        {linkErr && <p id="tb-link-err" className="t14" role="alert" style={{ margin: 0, color: 'var(--risk)' }}>{linkErr}</p>}
        <details className="t14"><summary className="muted">Demo options</summary><label className="tb-check"><input type="checkbox" checked={drop} onChange={(e) => setDrop(e.target.checked)} /> Simulate a dropped connection at 60%</label></details>
        {ups.length > 0 && <div className="tb-stack" aria-label="Uploads in progress">{ups.map((u) => <UploadRow key={u.id} u={u} onRetry={() => act('tb.upload.retry', { id: u.id })} onCancel={() => act('tb.upload.cancel', { id: u.id })} />)}</div>}
      </section>

      {sel && <Preview e={sel} onClose={() => setItem(null)} />}
      {items.filter((e) => verOf(e) === 'FAILED').map((e) => <div key={e.evidenceId} className="ds-banner" data-k="risk" role="status"><span aria-hidden="true">✕</span><span><b>{e.title}: check failed.</b> The issuer couldn’t confirm it. Usually a typo or an expired record; you can upload the official PDF or ask for a manual review.</span><button type="button" className="ds-btn" onClick={() => setItem(e.evidenceId)}>Review</button></div>)}

      {items.length === 0 ? (
        <section className="ds-sheet"><p style={{ margin: 0 }}>Your Passport is empty. Add a CV, a certificate, a work sample or a link above, or tell Q about something you’ve done. {first}, nothing here is shared until you choose.</p></section>
      ) : (
        <ul className="tb-grid" aria-label="Your Passport items">
          {items.map((e) => <ItemCard key={e.evidenceId} e={e} selected={e.evidenceId === item} onOpen={() => setItem(e.evidenceId)} />)}
        </ul>
      )}
    </>
  );
}

function ItemCard({ e, selected, onOpen }: { e: Evidence; selected: boolean; onOpen: () => void }) {
  const w = useWorld((x) => x);
  const v = verOf(e); const running = checkRunning(w, e.evidenceId);
  const red = e.confidential ? redactedOf(w, e.evidenceId) : undefined;
  const checkable = (e.kind === 'CREDENTIAL' || /link|repository/i.test(e.source)) && !e.confidential && v !== 'VERIFIED' && v !== 'UNDER_REVIEW';
  return (
    <li className="ds-sheet tb-card" data-selected={selected || undefined} data-conf={e.confidential || undefined}>
      <div className="tb-row-between"><span className="lab">{KIND[e.kind]}{e.redactedOf ? ' · redacted' : ''} · {e.observedAt.slice(0, 7)}</span>{running ? <span className="ds-tag" data-k="busy" aria-live="polite">Checking…</span> : <VerTag e={e} />}</div>
      <h3 className="tb-title">{e.confidential && <span aria-hidden="true">🔒 </span>}{e.title}</h3>
      <p style={{ margin: 0 }}>{e.shows}</p>
      <p className="t14 muted" style={{ margin: 0 }}><b>Limits:</b> {e.limits}</p>
      <p className="t14" style={{ margin: 0 }}><b>{VER[v].label}:</b> {VER[v].plain}</p>
      <SeenBy e={e} />
      <div className="tb-actions">
        <button type="button" className="ds-btn" onClick={onOpen} aria-expanded={selected}>Preview</button>
        {checkable && <button type="button" className="ds-btn" disabled={running} onClick={() => act('tb.verify', { id: e.evidenceId })}>{v === 'FAILED' ? 'Check again' : 'Check with the source'}</button>}
        {v === 'FAILED' && <button type="button" className="ds-btn" onClick={() => act('tb.verify.review', { id: e.evidenceId })}>Ask for a manual review</button>}
        {e.confidential && e.kind !== 'REFERENCE' && !red && <button type="button" className="ds-btn primary" onClick={() => act('tb.redact', { id: e.evidenceId })}>Make a redacted summary</button>}
        {e.redactedOf && v === 'UNVERIFIED' && <button type="button" className="ds-btn" onClick={() => act('tb.attest', { id: e.evidenceId })}>Ask a reference to confirm</button>}
      </div>
    </li>
  );
}

function Preview({ e, onClose }: { e: Evidence; onClose: () => void }) {
  const code = isCode(e) && !e.confidential;
  return (
    <section className="ds-sheet tb-stack tb-preview" aria-labelledby="tb-prev-h">
      <div className="tb-row-between"><h2 id="tb-prev-h" className="voice t24" style={{ margin: 0 }}>Preview: {e.title}</h2><button type="button" className="ds-btn quiet" onClick={onClose}>Close preview</button></div>
      {e.confidential && e.kind === 'REFERENCE' ? (
        <div className="tb-doc"><p><b>{e.title}</b></p><p>From: {e.source}. A reference confirms the work happened without revealing it. It stays confidential.</p></div>
      ) : e.confidential ? (
        <>
          <p className="ds-banner" style={{ margin: 0 }}><span aria-hidden="true">🔒</span><span><b>Only you can open this.</b> It’s marked confidential. Q won’t share it with anyone, even if asked; a redacted summary can be shared instead.</span><span /></p>
          <div className="tb-doc" aria-label="Original document (private)"><p><b>Lumen · Fraud rules v3 · design doc</b></p><p>Rules are evaluated per payout before release. Thresholds for merchant <mark>Kudi Ltd</mark> are set at <mark>₦4.2m / hour</mark>…</p><p>Back-test against <mark>11,400</mark> confirmed fraud cases from 2025…</p></div>
        </>
      ) : e.redactedOf ? (
        <div className="tb-doc" aria-label="Redacted summary"><p><b>Fraud-rules engine · summary</b></p><p>Rules are evaluated per payout before release. Thresholds for merchant <span className="tb-redact" aria-label="removed">██████</span> are set at <span className="tb-redact" aria-label="removed">████</span>.</p><p>Back-tested against <span className="tb-redact" aria-label="removed">█████</span> confirmed fraud cases. Rule versions are reviewed by two people before release.</p><p className="t14 muted">Names, volumes and thresholds removed. This is what an employer would see.</p></div>
      ) : code ? (
        <pre className="tb-code" aria-label="Code excerpt">{`// ${e.title}\nfunc (w *Worker) Retry(ctx context.Context, p Payout) error {\n  key := idempotencyKey(p.ID, p.Attempt)\n  if done, _ := w.store.Seen(ctx, key); done {\n    return nil // already paid: safe to retry\n  }\n  return backoff.Do(ctx, func() error { return w.pay(ctx, p, key) })\n}`}</pre>
      ) : e.kind === 'CREDENTIAL' ? (
        <div className="tb-doc tb-cert" aria-label="Certificate image (simulated)"><p className="lab">Certificate</p><p className="voice t24" style={{ margin: 0 }}>{e.title}</p><p className="t14">Awarded to {e.ownerId === 'p_tobi' ? 'Tobi Adeyemi' : 'you'} · {e.observedAt}</p><p className="t14 muted">Validation no. {/aws/i.test(e.title) ? 'AWS-ASA-7Q2K-91XB' : 'UL/2019/CS/0412'}</p></div>
      ) : (
        <div className="tb-doc"><p>{e.shows}</p><p className="t14 muted">Source: {e.source}</p></div>
      )}
      <p className="t14" style={{ margin: 0 }}><VerTag e={e} /> {VER[verOf(e)].plain}</p>
    </section>
  );
}

// ---------------- Who sees what: matrix and per-viewer preview ----------------
function Sharing({ items, pid, as, setAs }: { items: Evidence[]; pid: string; as: string; setAs: (v: string) => void }) {
  const w = useWorld((x) => x);
  const orgs = viewerOrgs(w, pid);
  const narrow = useNarrow(760);
  const shareable = items.filter((e) => e.kind !== 'PRACTICE');
  const toggle = (e: Evidence, o: string, c: Cell) => act(c === 'SHARED' || c === 'PUBLIC' ? 'tb.revoke' : 'tb.share', { ids: [e.evidenceId], org: o });
  const cellBtn = (e: Evidence, o: string) => {
    const c = cellOf(w, e, o); const on = c === 'SHARED' || c === 'PUBLIC';
    if (c === 'LOCKED' || c === 'WITHDRAWN') return <span className="tb-cell" data-c={c}>{c === 'LOCKED' ? '🔒 ' : ''}{CELL_LABEL[c]}</span>;
    return <button type="button" className="tb-cell" data-c={c} aria-pressed={on} aria-label={`${on ? `End ${orgName(w, o)}’s access to` : `Share with ${orgName(w, o)}:`} ${e.title}`} onClick={() => toggle(e, o, c)}>{on ? <Glyph k="full" size={14} /> : <Glyph k="none" size={14} />}{CELL_LABEL[c]}</button>;
  };
  const viewing = as !== 'me' ? as : null;
  const vis = viewing ? visibleEvidence(w, pid, viewing) : [];
  return (
    <>
      <section className="ds-sheet tb-stack" aria-labelledby="tb-as-h">
        <h2 id="tb-as-h" className="voice t24" style={{ margin: 0 }}>Preview what each organisation sees</h2>
        <div className="tb-filters" role="group" aria-label="View as">
          <button type="button" className="ds-filter" aria-pressed={!viewing} onClick={() => setAs('me')}>Me (everything)</button>
          {orgs.map((o) => <button key={o} type="button" className="ds-filter" aria-pressed={viewing === o} onClick={() => setAs(o)}>{orgName(w, o)}</button>)}
        </div>
        {viewing && (
          <div className="tb-viewas" aria-live="polite">
            <p style={{ margin: 0 }}><b>{orgName(w, viewing)} sees {vis.length} of your {shareable.length} items.</b> This is the same data their recruiter page reads. Practice and confidential originals are never visible.</p>
            {vis.length ? <ul className="tb-mini">{vis.map((e) => <li key={e.evidenceId}><span className="tb-break"><b>{e.title}</b> · {KIND[e.kind]}</span><VerTag e={e} /></li>)}</ul> : <p className="t14 muted" style={{ margin: 0 }}>Nothing. {orgName(w, viewing)} sees only that you have a Talent Q profile, if you’re discoverable.</p>}
            {items.some((e) => cellOf(w, e, viewing) === 'REVOKED') && <p className="t14 muted" style={{ margin: 0 }}>{orgName(w, viewing)} was told only that access to {items.filter((e) => cellOf(w, e, viewing) === 'REVOKED').length} item(s) ended, not which or why.</p>}
          </div>
        )}
      </section>
      <section className="ds-sheet tb-stack" aria-labelledby="tb-mx-h">
        <div className="tb-row-between"><h2 id="tb-mx-h" className="voice t24" style={{ margin: 0 }}>Who sees what</h2><span className="t14 muted">Changes take effect straight away</span></div>
        {narrow ? (
          <ul className="tb-matrix-list">
            {shareable.map((e) => <li key={e.evidenceId}><b className="tb-break">{e.title}</b><div className="tb-actions">{orgs.map((o) => <div key={o} className="tb-mcell"><span className="t14 muted">{orgName(w, o)}</span>{cellBtn(e, o)}</div>)}</div></li>)}
          </ul>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table tb-matrix">
              <caption className="sr">Each row is a Passport item; each column an organisation. Buttons share or end access.</caption>
              <thead><tr><th scope="col">Item</th>{orgs.map((o) => <th key={o} scope="col">{orgName(w, o)}</th>)}</tr></thead>
              <tbody>{shareable.map((e) => <tr key={e.evidenceId}><th scope="row"><span className="tb-break">{e.title}</span> <VerTag e={e} /></th>{orgs.map((o) => <td key={o}>{cellBtn(e, o)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        <p className="t14 muted" style={{ margin: 0 }}>“Public” items are on your profile link; ending one organisation’s access hides it from them only. Ask Q: “stop Talentbridge seeing my code”.</p>
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
      <h2 id="tb-sum-h" className="voice t24" style={{ margin: 0 }}>How Q describes you</h2>
      <p className="t14 muted" style={{ margin: 0 }}>Q only uses your Passport and what you’ve told it. Each line shows what it rests on. Employers see this only for items you’ve shared with them.</p>
      <ul className="tb-sum">
        {lines.map((l) => (
          <li key={l.topic} data-corrected={l.corrected || undefined}>
            <b>{l.text}</b>
            <span className="t14 muted">Based on: {l.basis}</span>
            <button type="button" className="ds-btn quiet" style={{ justifySelf: 'start' }} onClick={() => prefillQ(`That's wrong about ${l.topic === 'lead' ? 'leading people' : l.topic === 'go' ? 'Go' : l.topic}: `)}>This is wrong</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------- Recruiter search (discovery) ----------------
function Discovery({ pid }: { pid: string }) {
  const w = useWorld((x) => x);
  const d = discoveryOf(w, pid); const on = !!w.consents[pid]?.discoverable;
  const who = on ? d.who : 'NOBODY';
  const person = w.people.find((p) => p.personId === pid);
  const pub = myEvidence(w, pid).filter((e) => e.visibility === 'PUBLIC_PROFILE');
  const opts = [['VERIFIED_EMPLOYERS', 'Verified employers only', 'Companies whose domain and registration were checked. No agencies.'], ['EMPLOYERS_AND_AGENCIES', 'Verified employers and agencies', 'Includes recruitment agencies like Talentbridge.'], ['NOBODY', 'Nobody', 'You won’t appear in search. You can still apply, and anyone you’ve shared with keeps what you shared.']] as const;
  return (
    <>
      <section className="ds-sheet tb-stack" aria-labelledby="tb-disc-h">
        <h2 id="tb-disc-h" className="voice t24" style={{ margin: 0 }}>Who can find you in recruiter search</h2>
        <div className="tb-stack" role="group" aria-label="Who can find you">
          {opts.map(([v, l, s]) => <button key={v} type="button" className="ds-opt" aria-pressed={who === v} onClick={() => act('tb.discovery', { who: v })}><span><b>{l}</b><span className="t14 muted" style={{ display: 'block' }}>{s}</span></span></button>)}
        </div>
        {d.hideFrom.length > 0 && <p className="t14" style={{ margin: 0 }}>Always hidden from: {d.hideFrom.map((x) => (x === 'org_fleetline' ? 'Fleetline (your current employer, not on Talent Q)' : orgName(w, x))).join(', ')}.</p>}
      </section>
      <section className="ds-sheet tb-stack" aria-labelledby="tb-disc-p">
        <h2 id="tb-disc-p" className="voice t24" style={{ margin: 0 }}>What a recruiter sees when they find you</h2>
        {who === 'NOBODY' ? <p style={{ margin: 0 }}>Nothing: you don’t appear in search.</p> : (
          <div className="tb-viewas"><b>{person?.name}</b><span>{person?.headline} · {person?.location}</span><span className="t14">{pub.length ? `Public items: ${pub.map((e) => e.title).join('; ')}` : 'No public items.'}</span><span className="t14 muted">Pay expectations and anything private are never shown.</span></div>
        )}
      </section>
    </>
  );
}
