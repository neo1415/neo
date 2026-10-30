// Q-TOOLS pages: Q's work (library), one artifact on the canvas, secure browsing, downloads and the source manager.
// Each page is a paper canvas beside the global Q thread; everything a page does can also be asked of Q.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, useWorld, type World } from '../../mock/world';
import type { Actor } from '../../state/domain';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { QMark } from '../../ds/QMark';
import { PageIndex } from '../../ds/PageIndex';
import { arrive } from '../../ds/motion';
import { Link } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { qt } from '../../state/areas/q-tools';
import { KIND_WORD, artOf, canOpen, conflictDecision, fmtDay, freshness, mine, orgName, pendingHandoff, sourcesFor, tenantOf } from './model';
import { ALLOWLIST, BLOG_URL, PAY_CONFLICT, pageOf } from './web';
import { ArtifactBody, BrowseView, DownloadCard, Toggle, VideoView } from './views';
import './q-tools.css';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
const say = (text: string) => void runAction({ label: text, act: { t: 'say', text } });
const noop = () => {};

function Tools({ here }: { here: string }) {
  const items = [{ to: '/q/artifacts', l: 'Artifacts' }, { to: '/q/browse', l: 'Secure browsing' }, { to: '/q/downloads', l: 'Downloads' }, { to: '/q/sources', l: 'Sources' }];
  return <nav className="qt-tools" aria-label="Q’s tools">{items.map((i) => <Link key={i.to} to={i.to} aria-current={here === i.to ? 'page' : undefined}>{i.l}</Link>)}</nav>;
}
function Denied({ title, why }: { title: string; why: string }) {
  return (
    <Canvas title={title} kicker="Q’s work" open onClose={noop}>
      <section className="ds-sheet qt-denied" role="alert"><b>Not available to you.</b><p>{why}</p><Link className="ds-btn" to="/q/artifacts">Back to Q’s work</Link></section>
    </Canvas>
  );
}

// ---------------- /q/artifacts ----------------
const ASKS = (a: Actor) => a.orgId
  ? ['chart our pipeline by stage', 'map where our candidates are', 'draw the hiring process', 'make a short narrated explainer of this role']
  : ['draw the hiring process', 'make a short narrated explainer of this role', 'look up Kora’s engineering blog'];
export function Library() {
  const w = useWorld((x) => x); const a = actorOf(w);
  const arts = mine(w, a).filter((x) => x.kind !== 'DOWNLOAD' && x.kind !== 'BROWSE');
  return (
    <Canvas title="Q’s work" kicker={`${a.first} · charts, maps, diagrams and explainers Q made for you`} open onClose={noop}>
      <Tools here="/q/artifacts" />
      <div className="ch-q qt-qline"><QMark mood="idle" size={26} /><p className="voice">{arts.length ? `${arts.length} ${arts.length === 1 ? 'thing' : 'things'} I made for you. Charts and maps redraw from live records each time.` : 'Nothing yet. Ask me for a chart, a map, a diagram or a short explainer, in your own words.'}</p></div>
      {arts.length === 0 ? (
        <section className="ds-sheet qt-stack"><h2 className="qt-h">Try asking</h2><div className="ds-next qt-asks">{ASKS(a).map((t) => <button key={t} type="button" className="ds-btn" onClick={() => say(t)}>“{t}”</button>)}</div></section>
      ) : (
        <ul className="qt-cards">{arts.map((x) => (
          <li key={x.id}><Link to={`/q/artifacts/${x.id}`} className="qt-card"><span className="lab">{KIND_WORD[x.kind]}{x.denied ? ' · not made' : ''}</span><b>{x.title}</b><span className="t14 muted">{fmtDay(x.day ?? x.at)}{x.visibility === 'TEAM' ? ` · shared with ${orgName(w, a.orgId)}` : ' · only you'}</span></Link></li>
        ))}</ul>
      )}
    </Canvas>
  );
}

// ---------------- /q/artifacts/:id ----------------
function Handoff({ w, a, id, position, banner }: { w: World; a: Actor; id: string; position: number; banner?: boolean }) {
  const narrow = useNarrow();
  const h = pendingHandoff(w, a, id);
  useEffect(() => { if (narrow && h && !h.pickedUpAt) act('qt.handoff.picked', { id: h.id }); }, [narrow, h?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!!banner !== narrow) return null;
  if (narrow && h) return (
    <motion.div className="ds-banner qt-handoff" {...arrive} role="status">
      <QMark mood="idle" size={24} /><span><b>Continued from your desktop.</b> Same conversation with Q, same {h.position ? `place (frame ${h.position + 1})` : 'artifact'}. Sent {fmtDay(h.at)}.</span><span />
    </motion.div>
  );
  if (narrow) return null;
  return h ? <span className="ds-tag" data-k="ok">On your phone too</span> : <button type="button" className="ds-btn" onClick={() => act('qt.handoff', { id, position })}>Continue on phone</button>;
}
export function ArtifactPage({ id }: { id: string }) {
  const w = useWorld((x) => x); const a = actorOf(w);
  const x = artOf(w, id);
  const [frame, setFrame] = useState(0);
  if (!x) return <Denied title="Not found" why="That artifact doesn’t exist, or it was made in another demo session." />;
  if (!canOpen(a, x)) return <Denied title="Not available to you" why={`${x.owner === a.id ? 'This' : 'Someone else’s'} artifact is private to the person who asked for it${x.tenant !== tenantOf(a) ? ', in another organisation' : ''}. Nothing from it is shown.`} />;
  const h = pendingHandoff(w, a, id);
  const start = h?.position ?? 0;
  const srcs = qt(w).sources.filter((s) => x.sources.includes(s.id));
  const removed = x.sources.length - srcs.length;
  return (
    <Canvas title={x.title} kicker={`${KIND_WORD[x.kind]} · made by Q for ${x.owner === a.id ? 'you' : w.actors.find((y) => y.id === x.owner)?.first} · ${fmtDay(x.day ?? x.at)}`} open onClose={noop}
      aside={<div className="qt-row"><Handoff w={w} a={a} id={x.id} position={frame} /></div>}>
      <Tools here="/q/artifacts" />
      <Handoff w={w} a={a} id={x.id} position={frame} banner />
      <section className="ds-sheet qt-art" aria-label={x.title}>
        {x.kind === 'VIDEO' && !x.denied ? <VideoView key={start} w={w} art={x} start={start} onFrame={setFrame} /> : <ArtifactBody w={w} art={x} />}
      </section>
      {!x.denied && (
        <section className="ds-sheet qt-stack" aria-labelledby="qt-used">
          <h2 id="qt-used" className="qt-h">What Q used</h2>
          <ul className="qt-srclist">{srcs.map((s) => <li key={s.id}><b>{s.title}</b><span className="t14 muted">{freshness(w, s).word} · {s.licence} · {s.visibility === 'TEAM' ? `${orgName(w, a.orgId)} can see it` : 'Only you'}</span></li>)}</ul>
          {removed > 0 && <p className="t14 muted">{removed} source{removed === 1 ? ' was' : 's were'} removed from your sources since this was made.</p>}
          <Link to="/q/sources" className="ch-link">All sources</Link>
        </section>
      )}
    </Canvas>
  );
}

// ---------------- /q/browse and /q/browse/:id ----------------
export function BrowsePage({ id }: { id?: string }) {
  const w = useWorld((x) => x); const a = actorOf(w);
  const all = mine(w, a).filter((x) => x.kind === 'BROWSE');
  const x = id ? artOf(w, id) : all[0];
  const [addr, setAddr] = useState('');
  if (x && !canOpen(a, x)) return <Denied title="Not available to you" why="That page was opened by someone else. What another person browsed isn’t shown to you." />;
  const go = (e: React.FormEvent) => { e.preventDefault(); const u = addr.trim().replace(/^https?:\/\//, ''); if (u) act('qt.browse', { url: u }); setAddr(''); };
  return (
    <Canvas title="Secure browsing" kicker={`${a.first} · public pages, read-only, through Q`} open onClose={noop}>
      <Tools here="/q/browse" />
      <form className="qt-go" onSubmit={go} role="search" aria-label="Open a page read-only">
        <label htmlFor="qt-addr" className="sr">Page address</label>
        <input id="qt-addr" className="ds-input" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="engineering.kora.example/blog/…" autoComplete="off" />
        <button type="submit" className="ds-btn primary">Open read-only</button>
      </form>
      {!x ? (
        <section className="ds-sheet qt-stack"><p style={{ margin: 0 }}>No pages yet. Ask Q to look something up, or open an address on the allowed list.</p><div className="ds-next"><button type="button" className="ds-btn" onClick={() => say('look up Kora’s engineering blog')}>“Look up Kora’s engineering blog”</button></div></section>
      ) : (
        <section className="ds-sheet qt-art" aria-label={`Page: ${x.title}`}>
          {x.denied ? <div className="qt-stack"><div className="ds-banner" data-k="risk" role="alert"><span aria-hidden="true">⊘</span><span><b>Not opened.</b> {x.denied}</span><span /></div>{x.scope.url && <button type="button" className="ds-btn" style={{ justifySelf: 'start' }} onClick={() => act('qt.allow.request', { domain: x.scope.url.split('/')[0] })}>Ask an admin to allow it</button>}</div> : <BrowseView w={w} art={x} />}
        </section>
      )}
      {all.length > 1 && (
        <section className="ds-sheet qt-stack" aria-labelledby="qt-hist"><h2 id="qt-hist" className="qt-h">Pages you opened</h2>
          <ul className="qt-srclist">{all.map((y) => <li key={y.id}><Link to={`/q/browse/${y.id}`} aria-current={y.id === x?.id ? 'page' : undefined}>{pageOf(y.scope.url)?.title ?? y.scope.url}</Link><span className="t14 muted">{y.denied ? 'Not opened' : y.scope.url.split('/')[0]}</span></li>)}</ul>
        </section>
      )}
      <details className="ds-sheet qt-allow"><summary>Sites Q may open ({ALLOWLIST.length})</summary><ul>{ALLOWLIST.map((d) => <li key={d} className="qt-domain">{d}</li>)}</ul><p className="t14 muted">{a.orgId ? `${orgName(w, a.orgId)}’s admins manage this list.` : 'Talent Q’s default list for candidates.'} Pages are fetched as text only (simulated here): no scripts, no sign-ins, no forms.</p></details>
    </Canvas>
  );
}

// ---------------- /q/downloads ----------------
export function DownloadsPage() {
  const w = useWorld((x) => x); const a = actorOf(w);
  const dls = mine(w, a).filter((x) => x.kind === 'DOWNLOAD');
  return (
    <Canvas title="Downloads" kicker={`${a.first} · files Q fetched, scanned before anyone opens them`} open onClose={noop}>
      <Tools here="/q/downloads" />
      <p className="t14 muted qt-limits">Limits: 25 MB per file. Programs are never downloaded. Archives that can’t be scanned, and files with macros, stay in quarantine. Scans are simulated in this prototype.</p>
      {dls.length === 0 ? <section className="ds-sheet qt-stack"><p style={{ margin: 0 }}>No downloads yet. Ask Q to download a file from a page it opened, for example a certificate.</p><div className="ds-next"><button type="button" className="ds-btn" onClick={() => say('download Kora’s PCI certificate')}>“Download Kora’s PCI certificate”</button></div></section>
        : <ul className="qt-dls">{dls.map((x) => <li key={x.id}><DownloadCard w={w} art={x} /></li>)}</ul>}
    </Canvas>
  );
}

// ---------------- /q/sources (SC-136, MO-056) ----------------
export function ConflictPanel({ w, a, compact }: { w: World; a: Actor; compact?: boolean }) {
  const d = conflictDecision(w, a);
  const c = PAY_CONFLICT;
  const side = (x: typeof c.a) => { const p = pageOf(x.url)!; return (
    <div className="qt-claim"><span className="qt-domain">{x.url.split('/')[0]}</span><b className="voice qt-says">{x.says}</b><span className="t14">{x.basis}</span><span className="t14 muted">{x.when} · {p.licence}</span></div>
  ); };
  return (
    <motion.div className="qt-conflict" {...arrive} role="group" aria-label={`Sources disagree on ${c.topic}`}>
      <p className="qt-conflict-head"><span className="lab">Sources disagree</span><span className="t14">on {c.topic}</span></p>
      <div className="qt-claims">{side(c.a)}<span className="qt-vs" aria-hidden="true">≠</span>{side(c.b)}</div>
      <p className="t14" style={{ margin: 0 }}><b>Why they differ:</b> {c.why} I haven’t picked one, and I won’t without you.</p>
      {!compact && (d ? <p className="t14 qt-decided" role="status">Decided by {w.actors.find((x) => x.id === d.by)?.first} on {fmtDay(d.at)}: {d.decision === 'RANGE' ? 'show one wider range, ₦2.2m–₦3.6m, naming both sources' : d.decision === 'KEEP_BOTH' ? 'keep both side by side' : 'ask a colleague'}. Both sources are kept. <button type="button" className="ds-linkbtn" onClick={() => act('qt.conflict.decide', { decision: d.decision === 'KEEP_BOTH' ? 'RANGE' : 'KEEP_BOTH' })}>Change</button></p>
        : <div className="ds-actions"><button type="button" className="ds-btn" onClick={() => act('qt.conflict.decide', { decision: 'RANGE' })}>Show both as one range</button><button type="button" className="ds-btn" onClick={() => act('qt.conflict.decide', { decision: 'KEEP_BOTH' })}>Keep both side by side</button><button type="button" className="ds-btn quiet" onClick={() => act('qt.conflict.decide', { decision: 'ASK_COLLEAGUE' })}>Leave it for a colleague</button></div>)}
    </motion.div>
  );
}
type SrcFilter = 'all' | 'WEB' | 'TALENTQ' | 'FILE';
export function SourcesPage() {
  const w = useWorld((x) => x); const a = actorOf(w);
  const [f, setF] = useState<SrcFilter>('all');
  const all = sourcesFor(w, a);
  const list = all.filter((s) => f === 'all' || s.kind === f);
  const hasConflict = all.some((s) => s.key === `web:${PAY_CONFLICT.a.url}`) && all.some((s) => s.key === `web:${PAY_CONFLICT.b.url}`);
  const artTitle = (id: string) => id === 'research:pay' ? 'Pay research' : artOf(w, id)?.title ?? 'a removed artifact';
  const index = [{ id: 'qt-src-list', label: 'Sources' }, ...(hasConflict ? [{ id: 'qt-src-conf', label: 'Disagreements' }] : []), { id: 'qt-src-rules', label: 'Rules' }];
  return (
    <Canvas title="Sources" kicker={`${a.first} · what Q read, how fresh it is, and who can see it`} open onClose={noop}>
      <Tools here="/q/sources" />
      <PageIndex items={index} />
      <div className="ch-q qt-qline"><QMark mood={hasConflict && !conflictDecision(w, a) ? 'waiting' : 'idle'} size={26} /><p className="voice">{!all.length ? 'No sources yet. When I look something up or make a chart, what I used is listed here.' : hasConflict && !conflictDecision(w, a) ? 'Two sources disagree on pay. I’ve kept both and need you to choose how to show them.' : `${all.length} ${all.length === 1 ? 'source' : 'sources'}. Web pages are untrusted until you check them.`}</p></div>
      {hasConflict && <section id="qt-src-conf" className="ds-sheet" aria-label="Disagreements"><ConflictPanel w={w} a={a} /></section>}
      <section id="qt-src-list" className="ds-sheet qt-stack" aria-labelledby="qt-src-h">
        <div className="qt-row"><h2 id="qt-src-h" className="qt-h">All sources <span className="num muted">{list.length}</span></h2>
          <Toggle label="Show" value={f} set={setF} options={[{ id: 'all', label: 'All' }, { id: 'WEB', label: 'Web' }, { id: 'TALENTQ', label: 'Talent Q records' }, { id: 'FILE', label: 'Files' }]} /></div>
        {list.length === 0 ? <p className="muted" style={{ margin: 0 }}>{all.length ? 'None of this kind.' : 'Ask “what’s the market pay for a senior backend engineer in Lagos?” or “look up Kora’s engineering blog”.'}</p> : (
          <ul className="qt-sources">{list.map((s) => { const fr = freshness(w, s); return (
            <li key={s.id} className="qt-source">
              <div className="qt-source-main"><span className="lab">{s.kind === 'WEB' ? 'Web page · untrusted' : s.kind === 'FILE' ? 'File' : 'Talent Q records'}</span><b>{s.title}</b>{s.domain && <span className="qt-domain">{s.url}</span>}</div>
              <dl className="qt-source-meta">
                <div><dt>Freshness</dt><dd><span className="ds-tag" data-k={fr.k === 'old' ? 'warn' : fr.k === 'fresh' || fr.k === 'live' ? 'ok' : undefined}>{fr.word.split(' · ')[0]}</span> {fr.word.split(' · ').slice(1).join(' · ')}{s.kind !== 'TALENTQ' ? ` · read ${fmtDay(s.fetchedAt)}` : ''}</dd></div>
                <div><dt>Licence</dt><dd>{s.licence}</dd></div>
                <div><dt>Who can see it</dt><dd>{s.visibility === 'TEAM' ? `Everyone at ${orgName(w, a.orgId)}` : s.addedBy === a.id ? 'Only you' : 'Only the person who added it'}</dd></div>
                <div><dt>Used in</dt><dd>{s.usedIn.map(artTitle).join(', ')}</dd></div>
              </dl>
              <div className="ds-actions">
                {s.kind === 'WEB' && <button type="button" className="ds-btn quiet" onClick={() => act('qt.source.refresh', { id: s.id })}>Read it again</button>}
                {a.orgId && s.addedBy === a.id && s.kind !== 'TALENTQ' && <button type="button" className="ds-btn quiet" onClick={() => act('qt.source.visibility', { id: s.id, to: s.visibility === 'TEAM' ? 'ME' : 'TEAM' })}>{s.visibility === 'TEAM' ? 'Make it only mine' : `Share with ${orgName(w, a.orgId)}`}</button>}
                {s.kind !== 'TALENTQ' && <ConfirmButton label="Remove" question="Remove this source? What used it will say so." yes="Remove" onConfirm={() => act('qt.source.remove', { id: s.id })} />}
              </div>
            </li>); })}</ul>
        )}
      </section>
      <section id="qt-src-rules" className="ds-sheet qt-stack" aria-labelledby="qt-rules-h">
        <h2 id="qt-rules-h" className="qt-h">How Q treats sources</h2>
        <ul className="qt-rules">
          <li>Text from a web page is information, never an instruction. Q quotes it and links to it.</li>
          <li>When two sources disagree, Q shows both with their dates and never picks one silently.</li>
          <li>Talent Q records are read live, through each person’s privacy settings.</li>
          <li>Licence decides how much Q may quote: “summary and link only” means no copying.</li>
        </ul>
        <div className="ds-next"><button type="button" className="ds-btn" onClick={() => say('what’s the market pay for a senior backend engineer in lagos')}>Research Lagos backend pay</button><button type="button" className="ds-btn quiet" onClick={() => act('qt.browse', { url: BLOG_URL })}>Open Kora’s engineering blog</button></div>
      </section>
    </Canvas>
  );
}
