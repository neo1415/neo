// /r/messages: the recruitment correspondence hub (E01-18). One list across channels (email, Talent Q, text), filtered
// by state, campaign, role, channel and name; each conversation shows its role and campaign, who started it, and the
// next honest step. Email is first-class: sender, delivery truth (accepted by the provider ≠ read), failures with their
// recovery, reply intelligence with the quoted source, read-scope honesty, and multi-recipient review.
// There is no way to send that skips the checks and an explicit approval of the exact content.
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { actorOf, orgOf, personOf, simNow, useWorld, type World } from '../../mock/world';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { arrive } from '../../ds/motion';
import { runAction, useViewState } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hc } from '../../state/areas/hire-c';
import { isSuppressed, mail, mailboxOf } from '../../state/areas/mail';
import { campaigns, campaignsFor } from '../../state/areas/campaigns';
import type { Msg, Thread } from '../../state/domain';
import { CHANNEL_LABEL, city, delivered, firstOf, LAGOS, mandateTitle, nameOf, tDay, tTime } from './lib';
import { addressOf, deliveryView, pendingMatch, readableInbound } from './email';
import { Composer } from './Composer';
import { Attempts, BatchReview, ReadScope, ReplyCard } from './ReplyIntel';
import './email.css';

type Filter = 'all' | 'approval' | 'drafts' | 'reply' | 'awaiting' | 'problems' | 'queued' | 'sent';
const FILTERS: [Filter, string][] = [['all', 'All'], ['approval', 'To approve'], ['drafts', 'Drafts'], ['reply', 'Need a reply'], ['awaiting', 'Awaiting their reply'], ['problems', 'Not sent'], ['queued', 'Queued'], ['sent', 'Sent']];
const when = (iso: string) => `${tDay(iso, LAGOS)}, ${tTime(iso, LAGOS)}`;
const initials = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('');
const preview = (m: Msg) => m.body.replace(/^(hi|dear|hello)\s+[^,\n]*,\s*/i, '').split('\n').find((l) => l.trim())?.slice(0, 90) ?? '';
type Item = { m: Msg; t: Thread };
const visibleMsg = (w: World, m: Msg) => m.status !== 'DISCARDED' && readableInbound(w, m);

function groupsFor(w: World, orgId: string) {
  const byP = new Map<string, { pid: string; items: Item[]; threads: Thread[] }>();
  for (const t of w.threads.filter((x) => x.orgId === orgId)) {
    const g = byP.get(t.personId) ?? { pid: t.personId, items: [], threads: [] };
    g.threads.push(t);
    for (const m of t.messages) if (visibleMsg(w, m)) g.items.push({ m, t });
    byP.set(t.personId, g);
  }
  return [...byP.values()].filter((g) => g.items.length).map((g) => {
    g.items.sort((x, y) => x.m.at.localeCompare(y.m.at));
    const real = g.items.filter((x) => delivered(x.m));
    const lastReal = real[real.length - 1];
    const lastT = g.items[g.items.length - 1].t;
    return {
      ...g, last: g.items[g.items.length - 1], thread: lastT,
      awaiting: g.items.some((x) => x.m.status === 'AWAITING_APPROVAL' && x.m.delivery !== 'FAILED'),
      drafts: g.items.some((x) => x.m.status === 'DRAFT'), queued: g.items.some((x) => x.m.status === 'QUEUED_OFFLINE' || x.m.delivery === 'QUEUED'),
      waitingOnUs: lastReal?.m.from === g.pid, sent: real.some((x) => x.m.from !== g.pid),
      awaitingTheirs: !!lastReal && lastReal.m.from !== g.pid && lastReal.m.status === 'SENT_SIMULATED' && lastReal.m.delivery !== 'BOUNCED',
      problems: g.items.some((x) => x.m.delivery === 'FAILED' || x.m.delivery === 'BOUNCED'),
      match: g.items.some((x) => pendingMatch(x.m)), candidate: g.threads.some((t) => t.initiatedBy === 'CANDIDATE'),
      campaignIds: [...new Set(g.threads.map((t) => t.campaignId).filter(Boolean))] as string[], mandateIds: [...new Set(g.threads.map((t) => t.mandateId).filter(Boolean))] as string[],
      channels: [...new Set(g.items.map((x) => x.m.channel))],
      suppressed: isSuppressed(w, orgId, g.pid),
    };
  }).sort((x, y) => Number(y.match) - Number(x.match) || Number(y.problems) - Number(x.problems) || Number(y.awaiting) - Number(x.awaiting) || (y.last?.m.at ?? '').localeCompare(x.last?.m.at ?? ''));
}
type G = ReturnType<typeof groupsFor>[number];

export function Messages() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const narrow = useNarrow();
  const [sel, setSel] = useViewState<string>('sel', '');
  const [filter, setFilter] = useViewState<Filter>('filter', 'all');
  const [camp, setCamp] = useViewState<string>('camp', '');
  const [role, setRole] = useViewState<string>('role', '');
  const [ch, setCh] = useViewState<string>('ch', '');
  const [q, setQ] = useViewState<string>('q', '');
  const [more, setMore] = useState(false);
  const groups = useMemo(() => (a.orgId ? groupsFor(w, a.orgId) : []), [w, a.orgId]);
  const match = (g: G, f: Filter) => f === 'all' || (f === 'approval' && g.awaiting) || (f === 'drafts' && g.drafts) || (f === 'reply' && g.waitingOnUs) || (f === 'awaiting' && g.awaitingTheirs) || (f === 'problems' && g.problems) || (f === 'queued' && g.queued) || (f === 'sent' && g.sent);
  const facet = (g: G) => (!camp || (camp === '_none' ? !g.campaignIds.length : g.campaignIds.includes(camp))) && (!role || g.mandateIds.includes(role)) && (!ch || g.channels.includes(ch as Msg['channel'])) && (!q.trim() || (personOf(w, g.pid)?.name ?? '').toLowerCase().includes(q.trim().toLowerCase()));
  const shown = groups.filter((g) => match(g, filter) && facet(g));
  const cur = groups.find((g) => g.pid === sel) ?? (narrow ? undefined : shown[0]);
  const count = (f: Filter) => groups.filter((g) => match(g, f) && facet(g)).length;
  const org = orgOf(w, a.orgId)?.name ?? 'Your organisation';
  if (!a.orgId) return <Canvas title="Messages" kicker="Hiring" open onClose={() => {}}><section className="ds-sheet hc-empty"><b>Messages appear once you belong to an organisation.</b><span className="t14 muted">Ask Q to set one up, or ask an admin to add you.</span></section></Canvas>;
  const toApprove = count('approval');
  const camps = campaignsFor(w, a.orgId);
  const roles = [...new Set(groups.flatMap((g) => g.mandateIds))];
  const expired = mail(w).mailboxes.filter((m) => m.orgId === a.orgId && m.state === 'EXPIRED' && m.sendAs.includes(a.id));
  const batches = [...new Set(Object.values(hc(w).drafts).filter((d) => d.batchId && d.orgId === a.orgId && d.by === a.id).map((d) => d.batchId!))];
  const openBatch = batches.reverse().find((b) => Object.values(hc(w).drafts).some((d) => d.batchId === b && ['DRAFT', 'AWAITING_APPROVAL'].includes(w.threads.flatMap((t) => t.messages).find((m) => m.id === d.msgId)?.status ?? '')));
  const facets = camp || role || ch || q;

  const list = (
    <nav className="hc-list" aria-label="Conversations">
      <div className="em-facets" role="group" aria-label="Filter conversations">
        <label className="sr" htmlFor="em-q">Find a person</label>
        <input id="em-q" className="ds-input em-search" type="search" placeholder="Find a person" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="ds-btn quiet em-morebtn" aria-expanded={more || !!(camp || role || ch)} onClick={() => setMore(!more)}>Campaign, role, channel{[camp, role, ch].filter(Boolean).length ? ` (${[camp, role, ch].filter(Boolean).length})` : ''}</button>
        {(more || camp || role || ch) && <>
        <label className="sr" htmlFor="em-camp">Campaign</label>
        <select id="em-camp" className="ds-input em-select" value={camp} onChange={(e) => setCamp(e.target.value)}><option value="">All campaigns</option>{camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="_none">Not filed</option></select>
        <label className="sr" htmlFor="em-role">Role</label>
        <select id="em-role" className="ds-input em-select" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option>{roles.map((r) => <option key={r} value={r}>{mandateTitle(w, r)}</option>)}</select>
        <label className="sr" htmlFor="em-ch">Channel</label>
        <select id="em-ch" className="ds-input em-select" value={ch} onChange={(e) => setCh(e.target.value)}><option value="">All channels</option><option value="EMAIL">Email</option><option value="IN_APP">Talent Q</option><option value="SMS">Text</option></select>
        </>}
      </div>
      <div className="hc-filters" role="group" aria-label="Show">
        {FILTERS.filter(([k]) => k === 'all' || k === 'sent' || count(k) > 0 || filter === k).map(([k, l]) => (
          <button key={k} type="button" className="ds-filter" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}{k !== 'all' && k !== 'sent' ? <span className="hc-count num">{count(k)}</span> : null}</button>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="hc-empty">
          <b>{groups.length ? 'Nothing matches.' : 'No conversations yet.'}</b>
          <span className="t14 muted">{groups.length ? (facets ? 'Clear the filters above, or ask Q what’s waiting.' : 'Try “All”, or ask Q what’s waiting.') : 'Ask Q: “email Tobi an interview invite for Thursday or Friday”. Drafts wait here until someone approves them.'}</span>
          {facets && <button type="button" className="hc-more" onClick={() => { setCamp(''); setRole(''); setCh(''); setQ(''); }}>Clear filters</button>}
        </div>
      )}
      <ul>
        {shown.map((g) => { const p = personOf(w, g.pid); const lastM = g.last?.m; const cName = g.campaignIds[0] ? campaigns(w).list.find((c) => c.id === g.campaignIds[0])?.name : undefined; return (
          <li key={g.pid}>
            <button type="button" className="hc-row" aria-pressed={cur?.pid === g.pid} onClick={() => setSel(g.pid)}>
              <span className="ds-av hc-av" aria-hidden="true">{initials(p?.name ?? '?')}</span>
              <span className="hc-row-main">
                <span className="hc-row-top"><b className="hc-ellip">{p?.name ?? g.pid}</b><span className="t14 muted num">{lastM ? tDay(lastM.at, LAGOS) : ''}</span></span>
                <span className="t14 muted hc-ellip">{mandateTitle(w, g.thread.mandateId)}{cName ? ` · ${cName}` : ''}</span>
                <span className="t14 hc-ellip hc-preview">{lastM && lastM.from !== g.pid ? <span className="muted">{lastM.status === 'DRAFT' || lastM.status === 'AWAITING_APPROVAL' ? 'Draft: ' : 'You: '}</span> : null}{lastM ? preview(lastM) : ''}</span>
                {(g.awaiting || g.drafts || g.queued || g.waitingOnUs || g.problems || g.match || g.candidate || g.suppressed || g.awaitingTheirs) && (
                  <span className="hc-tags">
                    {g.match && <span className="ds-tag" data-k="busy">Confirm the match</span>}
                    {g.problems && <span className="ds-tag" data-k="risk">Not sent</span>}
                    {g.awaiting && <span className="ds-tag" data-k="busy">To approve</span>}
                    {g.drafts && !g.awaiting && <span className="ds-tag">Draft</span>}
                    {g.queued && <span className="ds-tag" data-k="warn">Queued</span>}
                    {g.waitingOnUs && <span className="ds-tag" data-k="risk">Needs a reply</span>}
                    {g.awaitingTheirs && !g.awaiting && !g.drafts && <span className="ds-tag">Awaiting their reply</span>}
                    {g.candidate && <span className="ds-tag">They started it</span>}
                    {g.suppressed && <span className="ds-tag" data-k="warn">Asked not to be contacted</span>}
                  </span>
                )}
              </span>
            </button>
          </li>); })}
      </ul>
    </nav>
  );
  return (
    <Canvas title="Messages" kicker={org} open onClose={() => {}}
      aside={<span className="em-aside"><Link to="/settings/email" className="ds-btn">Email settings</Link><Link to="/r/outreach" className="ds-btn quiet">Outbox and receipts</Link></span>}>
      {w.network === 'offline' && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">◷</span><span><b>You’re offline.</b> Approved messages wait in the outbox and go when you reconnect, after Q re-checks the calendars.</span><span /></div>}
      {expired.map((m) => (
        <div key={m.id} className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">!</span><span><b>{m.address} needs you to sign in again.</b> <span className="muted">The {m.provider === 'GOOGLE' ? 'Google' : 'Microsoft'} connection expired. Nothing sends from it until you reconnect; drafts and approvals are kept.</span></span><button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Reconnect', act: { t: 'do', op: 'email.reconnect', args: { mailboxId: m.id } } })}>Reconnect</button></div>
      ))}
      {toApprove > 0 && filter !== 'approval' && (
        <div className="ds-banner hc-approvebar" role="status">
          <span aria-hidden="true" className="hc-dot" />
          <span><b>{toApprove === 1 ? '1 message is' : `${toApprove} messages are`} waiting for approval.</b> <span className="muted">Nothing goes until someone who can approve says yes.</span></span>
          <button type="button" className="ds-btn" onClick={() => { setFilter('approval'); const g = groups.find((x) => x.awaiting); if (g) setSel(g.pid); }}>Review</button>
        </div>
      )}
      {openBatch && <BatchReview w={w} batchId={openBatch} onOpen={(pid) => setSel(pid)} />}
      <div className="hc-inbox" data-open={cur ? '1' : '0'}>
        {(!narrow || !cur) && list}
        {cur && <ThreadView key={cur.pid} g={cur} onBack={narrow ? () => setSel('') : undefined} />}
      </div>
    </Canvas>
  );
}

function ThreadView({ g, onBack }: { g: G; onBack?: () => void }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = g.pid; const p = personOf(w, pid)!; const c = w.consents[pid];
  const items = g.items;
  const lastReal = [...items].reverse().find((x) => delivered(x.m));
  const waitDays = lastReal && lastReal.m.from === pid ? Math.floor((simNow(w).getTime() - new Date(lastReal.m.at).getTime()) / 864e5) : 0;
  const channels = c ? [c.notifications.email && 'Email', c.notifications.sms && 'Text', c.notifications.inApp && 'Talent Q'].filter(Boolean) as string[] : [];
  const withdrawn = c?.withdrawnFrom.includes(a.orgId!);
  const t = g.threads.find((x) => x.initiatedBy === 'CANDIDATE') ?? g.thread;
  const camps = campaignsFor(w, a.orgId!);
  const camp = t.campaignId ? campaigns(w).list.find((x) => x.id === t.campaignId) : undefined;
  const lastInbound = [...items].reverse().find((x) => x.m.from === pid && x.m.channel === 'EMAIL' && x.m.inbound);
  // "Seen" is recorded when someone at the organisation opens a conversation the candidate started (shown to them as "Seen").
  useEffect(() => { if (t.initiatedBy === 'CANDIDATE' && !mail(w).seen[t.id]) void runAction({ label: 'seen', act: { t: 'do', op: 'email.seen', args: { threadId: t.id } } }); }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = (action: string, extra: Record<string, unknown> = {}) => void runAction({ label: action, act: { t: 'do', op: 'email.thread', args: { threadId: t.id, action, ...extra } } });
  return (
    <motion.section className="hc-thread ds-sheet" aria-label={`Conversation with ${p.name}`} {...arrive}>
      {onBack && <button type="button" className="ds-btn quiet hc-back" onClick={onBack}>← All conversations</button>}
      <header className="hc-thread-head">
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <h2 className="voice t24" style={{ margin: 0 }}>{p.name}</h2>
          <span className="t14 muted">{mandateTitle(w, t.mandateId)} · {city(p.timezone)}, {tTime(simNow(w).toISOString(), p.timezone)} now</span>
          <span className="hc-tags" aria-label="Contact choices">
            {withdrawn ? <span className="ds-tag" data-k="risk">Withdrew consent for {orgOf(w, a.orgId)?.name}</span>
              : g.suppressed ? <span className="ds-tag" data-k="warn">Asked not to be contacted</span>
                : channels.length ? channels.map((x) => <span key={x} className="ds-tag">{x} ok</span>) : <span className="ds-tag" data-k="warn">No contact channels on</span>}
            {t.initiatedBy === 'CANDIDATE' && <span className="ds-tag">Started by {p.name.split(' ')[0]}</span>}
            {t.state && t.state !== 'OPEN' && t.state !== 'REPLIED' && <span className="ds-tag" data-k="warn">{t.state === 'MUTED' ? 'Muted' : t.state === 'REPORTED' ? 'Reported' : t.state === 'BLOCKED' ? 'Blocked' : t.state === 'TIMEOUT' ? 'No reply in time' : t.state.toLowerCase()}</span>}
          </span>
        </div>
        {!withdrawn && !g.suppressed && t.state !== 'BLOCKED' && <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Ask Q', act: { t: 'say', text: `draft a reply to ${p.name.split(' ')[0]}` } })}>Draft a reply with Q</button>}
      </header>
      <div className="em-file">
        <label className="t14" htmlFor={`camp-${t.id}`}><b>Campaign</b></label>
        <select id={`camp-${t.id}`} className="ds-input em-select" value={t.campaignId ?? ''} onChange={(e) => e.target.value && act('route', { campaignId: e.target.value })}>
          {!camp && <option value="">Not filed yet</option>}
          {camps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        {camp && <Link className="hc-more" to={`/r/campaigns/${camp.id}`}>Open {camp.name}</Link>}
        {t.initiatedBy === 'CANDIDATE' && (
          <span className="em-tactions" role="group" aria-label="Conversation controls">
            {t.state === 'MUTED' ? <button type="button" className="hc-more" onClick={() => act('unmute')}>Unmute</button> : <button type="button" className="hc-more" onClick={() => act('mute')}>Mute</button>}
            {t.state !== 'REPORTED' && t.state !== 'BLOCKED' && <button type="button" className="hc-more" onClick={() => act('report')}>Report as unwanted</button>}
            {t.state !== 'BLOCKED' && <button type="button" className="hc-more" onClick={() => act('block')}>Block</button>}
          </span>
        )}
      </div>
      <ReadScope t={g.thread} />
      {lastInbound && <ReplyCard t={lastInbound.t} m={lastInbound.m} />}
      {waitDays >= 1 && <p className="hc-wait" role="status">{p.name.split(' ')[0]} has been waiting {waitDays} day{waitDays === 1 ? '' : 's'} for a reply.</p>}
      <ol className="hc-msgs" aria-label="Messages, oldest first">
        <AnimatePresence initial={false}>
          {items.map(({ m }) => (
            <motion.li key={m.id} className="hc-msg" data-from={m.from === pid ? 'them' : 'us'} data-s={m.status} {...arrive} layout="position">
              {(m.status === 'DRAFT' || m.status === 'AWAITING_APPROVAL') && m.from !== pid ? <Composer msgId={m.id} m={m} /> : <SentMsg m={m} pid={pid} />}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </motion.section>
  );
}

function SentMsg({ m, pid }: { m: Msg; pid: string }) {
  const w = useWorld((x) => x);
  const p = personOf(w, pid)!; const theirs = m.from === pid; const mb = mailboxOf(w, m.senderId);
  const dv = deliveryView(w, m);
  return (
    <>
      <div className="hc-msg-head"><b>{theirs ? p.name.split(' ')[0] : nameOf(w, m.from)}</b><span className="t14 muted">{when(m.at)} · {CHANNEL_LABEL[m.channel]}</span>{dv && !theirs && <span className="ds-tag em-dtag" data-k={dv.tone}>{dv.label}</span>}</div>
      {m.channel === 'EMAIL' && <p className="t14 muted em-envline">{theirs ? <>From {addressOf(w, pid)} to {mailboxOf(w, m.inbound?.mailbox)?.address ?? m.to}</> : <>From {mb?.address ?? '—'} to {addressOf(w, pid)}{m.cc?.length ? ` · Cc ${m.cc.join(', ')}` : ''}{m.bcc?.length ? ` · Bcc ${m.bcc.length}` : ''}</>}{m.attachments?.length ? ` · ${m.attachments.length} attachment${m.attachments.length === 1 ? '' : 's'}` : ''}</p>}
      {m.subject && <p className="hc-subj">{m.subject}</p>}
      <div className="hc-body">{m.body}</div>
      {m.attachments?.length ? <ul className="em-attlist">{m.attachments.map((x) => <li key={x.id}>📎 {x.label}</li>)}</ul> : null}
      {!theirs && m.status === 'SENT_SIMULATED' && (
        <p className="hc-receiptline"><span className="hc-ok" aria-hidden="true">✓</span><span>{m.channel === 'EMAIL' && m.acceptedAt ? <>{dv?.label} · {dv?.detail}</> : <>Sent</>} · approved by {m.approvedBy ? firstOf(w, m.approvedBy) : '—'}{m.idempotencyKey ? <> · key <span className="hc-mono">{m.idempotencyKey}</span></> : <> · <span className="hc-mono">{m.receipt}</span></>}</span><span className="ds-sim">Simulated send</span></p>
      )}
      {!theirs && m.attempts && m.attempts.length > 1 && <Attempts m={m} />}
      {m.status === 'QUEUED_OFFLINE' && <p className="hc-receiptline" data-q="1"><span className="hc-ok" aria-hidden="true">◷</span><span>In the outbox · approved by {m.approvedBy ? firstOf(w, m.approvedBy) : '—'}. Not sent yet: it goes when you reconnect.</span></p>}
    </>
  );
}
