// /r/messages: the correspondence inbox. Threads per candidate, drafts with versions, the checks Q ran,
// and approve / edit / discard. There is no way to send that skips the checks and an explicit approval.
// Design pass: dense list with one status per row, a thread that separates their words from ours, sent
// messages that read as receipts, and a draft panel whose primary action is always the next honest step.
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { actorOf, orgOf, personOf, simNow, useWorld } from '../../mock/world';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { arrive } from '../../ds/motion';
import { runAction, useViewState } from '../../q/core/engine';
import { Link } from '../../ui/router';
import { hc } from '../../state/areas/hire-c';
import type { Msg } from '../../state/domain';
import { CAN_SEND, CHANNEL_LABEL, city, delivered, diffWords, firstOf, KIND_LABEL, LAGOS, mandateTitle, msgStatusLabel, nameOf, tDay, tTime, whenText } from './lib';
import { ChecksList } from './refs';

type Filter = 'all' | 'approval' | 'drafts' | 'reply' | 'queued' | 'sent';
const FILTERS: [Filter, string][] = [['all', 'All'], ['approval', 'To approve'], ['drafts', 'Drafts'], ['reply', 'Need a reply'], ['queued', 'Queued'], ['sent', 'Sent']];
const when = (iso: string) => `${tDay(iso, LAGOS)}, ${tTime(iso, LAGOS)}`;
const initials = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('');
const preview = (m: Msg) => m.body.replace(/^(hi|dear|hello)\s+[^,\n]*,\s*/i, '').split('\n').find((l) => l.trim())?.slice(0, 90) ?? '';

export function Messages() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const narrow = useNarrow();
  const [sel, setSel] = useViewState<string>('sel', '');
  const [filter, setFilter] = useViewState<Filter>('filter', 'all');
  const groups = useMemo(() => {
    const byP = new Map<string, { pid: string; msgs: { m: Msg; mandateId?: string }[] }>();
    for (const t of w.threads.filter((x) => x.orgId === a.orgId)) {
      const g = byP.get(t.personId) ?? { pid: t.personId, msgs: [] };
      for (const m of t.messages) if (m.status !== 'DISCARDED') g.msgs.push({ m, mandateId: t.mandateId });
      byP.set(t.personId, g);
    }
    return [...byP.values()].map((g) => {
      g.msgs.sort((x, y) => x.m.at.localeCompare(y.m.at));
      const real = g.msgs.filter((x) => delivered(x.m));
      return { ...g, last: g.msgs[g.msgs.length - 1], awaiting: g.msgs.some((x) => x.m.status === 'AWAITING_APPROVAL'), drafts: g.msgs.some((x) => x.m.status === 'DRAFT'), queued: g.msgs.some((x) => x.m.status === 'QUEUED_OFFLINE'), waitingOnUs: real[real.length - 1]?.m.from === g.pid, sent: real.some((x) => x.m.from !== g.pid) };
    }).filter((g) => g.msgs.length).sort((x, y) => Number(y.awaiting) - Number(x.awaiting) || (y.last?.m.at ?? '').localeCompare(x.last?.m.at ?? ''));
  }, [w, a.orgId]);
  const match = (g: (typeof groups)[number], f: Filter) => f === 'all' || (f === 'approval' && g.awaiting) || (f === 'drafts' && g.drafts) || (f === 'reply' && g.waitingOnUs) || (f === 'queued' && g.queued) || (f === 'sent' && g.sent);
  const shown = groups.filter((g) => match(g, filter));
  const cur = groups.find((g) => g.pid === sel) ?? (narrow ? undefined : shown[0]);
  const count = (f: Filter) => groups.filter((g) => match(g, f)).length;
  const org = orgOf(w, a.orgId)?.name ?? 'Your organisation';
  if (!a.orgId) return <Canvas title="Messages" kicker="Hiring" open onClose={() => {}}><section className="ds-sheet hc-empty"><b>Messages appear once you belong to an organisation.</b><span className="t14 muted">Ask Q to set one up, or ask an admin to add you.</span></section></Canvas>;
  const toApprove = count('approval');

  const list = (
    <nav className="hc-list" aria-label="Conversations">
      <div className="hc-filters" role="group" aria-label="Show">
        {FILTERS.filter(([k]) => k === 'all' || k === 'sent' || count(k) > 0 || filter === k).map(([k, l]) => (
          <button key={k} type="button" className="ds-filter" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}{k !== 'all' && k !== 'sent' ? <span className="hc-count num">{count(k)}</span> : null}</button>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="hc-empty">
          <b>{groups.length ? 'Nothing here right now.' : 'No conversations yet.'}</b>
          <span className="t14 muted">{groups.length ? 'Try “All”, or ask Q what’s waiting.' : 'Ask Q: “draft an interview invitation for Tobi”. Drafts wait here until someone approves them.'}</span>
        </div>
      )}
      <ul>
        {shown.map((g) => { const p = personOf(w, g.pid); const lastM = g.last?.m; return (
          <li key={g.pid}>
            <button type="button" className="hc-row" aria-pressed={cur?.pid === g.pid} onClick={() => setSel(g.pid)}>
              <span className="ds-av hc-av" aria-hidden="true">{initials(p?.name ?? '?')}</span>
              <span className="hc-row-main">
                <span className="hc-row-top"><b className="hc-ellip">{p?.name ?? g.pid}</b><span className="t14 muted num">{lastM ? tDay(lastM.at, LAGOS) : ''}</span></span>
                <span className="t14 muted hc-ellip">{mandateTitle(w, g.last?.mandateId)}</span>
                <span className="t14 hc-ellip hc-preview">{lastM && lastM.from !== g.pid ? <span className="muted">{lastM.status === 'DRAFT' || lastM.status === 'AWAITING_APPROVAL' ? 'Draft: ' : 'You: '}</span> : null}{lastM ? preview(lastM) : ''}</span>
                {(g.awaiting || g.drafts || g.queued || g.waitingOnUs) && (
                  <span className="hc-tags">
                    {g.awaiting && <span className="ds-tag" data-k="busy">To approve</span>}
                    {g.drafts && !g.awaiting && <span className="ds-tag">Draft</span>}
                    {g.queued && <span className="ds-tag" data-k="warn">Queued offline</span>}
                    {g.waitingOnUs && <span className="ds-tag" data-k="risk">Needs a reply</span>}
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
      aside={<Link to="/r/outreach" className="ds-btn">Outbox and receipts</Link>}>
      {w.network === 'offline' && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">◷</span><span><b>You’re offline.</b> Approved messages wait in the outbox and go when you reconnect, after Q re-checks the calendars.</span><span /></div>}
      {toApprove > 0 && filter !== 'approval' && (
        <div className="ds-banner hc-approvebar" role="status">
          <span aria-hidden="true" className="hc-dot" />
          <span><b>{toApprove === 1 ? '1 message is' : `${toApprove} messages are`} waiting for approval.</b> <span className="muted">Nothing goes until someone who can approve says yes.</span></span>
          <button type="button" className="ds-btn" onClick={() => { setFilter('approval'); const g = groups.find((x) => x.awaiting); if (g) setSel(g.pid); }}>Review</button>
        </div>
      )}
      <div className="hc-inbox" data-open={cur ? '1' : '0'}>
        {(!narrow || !cur) && list}
        {cur && <ThreadView key={cur.pid} pid={cur.pid} msgs={cur.msgs} onBack={narrow ? () => setSel('') : undefined} />}
      </div>
    </Canvas>
  );
}

function ThreadView({ pid, msgs, onBack }: { pid: string; msgs: { m: Msg; mandateId?: string }[]; onBack?: () => void }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const p = personOf(w, pid)!; const c = w.consents[pid];
  const lastReal = [...msgs].reverse().find((x) => delivered(x.m));
  const waitDays = lastReal && lastReal.m.from === pid ? Math.floor((simNow(w).getTime() - new Date(lastReal.m.at).getTime()) / 864e5) : 0;
  const channels = c ? [c.notifications.email && 'Email', c.notifications.sms && 'Text', c.notifications.inApp && 'Talent Q'].filter(Boolean) as string[] : [];
  const withdrawn = c?.withdrawnFrom.includes(a.orgId!);
  return (
    <motion.section className="hc-thread ds-sheet" aria-label={`Conversation with ${p.name}`} {...arrive}>
      {onBack && <button type="button" className="ds-btn quiet hc-back" onClick={onBack}>← All conversations</button>}
      <header className="hc-thread-head">
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <h2 className="voice t24" style={{ margin: 0 }}>{p.name}</h2>
          <span className="t14 muted">{mandateTitle(w, msgs[0]?.mandateId)} · {city(p.timezone)}, {tTime(simNow(w).toISOString(), p.timezone)} now</span>
          <span className="hc-tags" aria-label="Contact choices">
            {withdrawn ? <span className="ds-tag" data-k="risk">Withdrew consent for {orgOf(w, a.orgId)?.name}</span>
              : channels.length ? channels.map((x) => <span key={x} className="ds-tag">{x} ok</span>) : <span className="ds-tag" data-k="warn">No contact channels on</span>}
          </span>
        </div>
        {!withdrawn && <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Ask Q', act: { t: 'say', text: `draft a reply to ${p.name.split(' ')[0]}` } })}>Draft a reply with Q</button>}
      </header>
      {waitDays >= 1 && <p className="hc-wait" role="status">{p.name.split(' ')[0]} has been waiting {waitDays} day{waitDays === 1 ? '' : 's'} for a reply.</p>}
      <ol className="hc-msgs" aria-label="Messages, oldest first">
        <AnimatePresence initial={false}>
          {msgs.map(({ m }) => (
            <motion.li key={m.id} className="hc-msg" data-from={m.from === pid ? 'them' : 'us'} data-s={m.status} {...arrive} layout="position">
              {m.status === 'DRAFT' || m.status === 'AWAITING_APPROVAL' ? <DraftEditor msgId={m.id} m={m} /> : (
                <>
                  <div className="hc-msg-head"><b>{m.from === pid ? p.name.split(' ')[0] : nameOf(w, m.from)}</b><span className="t14 muted">{when(m.at)} · {CHANNEL_LABEL[m.channel]}</span></div>
                  {m.subject && <p className="hc-subj">{m.subject}</p>}
                  <div className="hc-body">{m.body}</div>
                  {m.status === 'SENT_SIMULATED' && <p className="hc-receiptline"><span className="hc-ok" aria-hidden="true">✓</span><span>Sent · approved by {m.approvedBy ? firstOf(w, m.approvedBy) : '—'} · <span className="hc-mono">{m.receipt}</span></span><span className="ds-sim">Simulated send</span></p>}
                  {m.status === 'QUEUED_OFFLINE' && <p className="hc-receiptline" data-q="1"><span className="hc-ok" aria-hidden="true">◷</span><span>In the outbox · approved by {m.approvedBy ? firstOf(w, m.approvedBy) : '—'}. Not sent yet: it goes when you reconnect.</span></p>}
                </>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </motion.section>
  );
}

function DraftEditor({ msgId, m }: { msgId: string; m: Msg }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const d = hc(w).drafts[msgId];
  const latest = d?.versions[d.versions.length - 1];
  const [text, setText] = useState(m.body);
  const [viewV, setViewV] = useState<number | null>(null);
  useEffect(() => { setText(m.body); }, [m.body]);
  const dirty = text !== m.body;
  const canSend = CAN_SEND.includes(a.role ?? 'VIEWER');
  const canEdit = ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER');
  const checked = d?.checks && d.checkedV === latest?.v;
  const ready = m.status === 'AWAITING_APPROVAL' && checked && d!.checks!.every((c) => c.ok || (c.id === 'role' && canSend));
  const old = viewV !== null ? d?.versions.find((x) => x.v === viewV) : undefined;
  const prev = old ? d?.versions.find((x) => x.v === old.v - 1) : undefined;
  const shown = old ?? latest;
  return (
    <div className="hc-draft" aria-label={`Draft ${KIND_LABEL[d?.kind ?? 'INVITE']}`}>
      <div className="hc-msg-head">
        <b>{d ? `${KIND_LABEL[d.kind].replace(/^\w/, (x) => x.toUpperCase())}` : 'Draft'}</b>
        <span className="t14 muted">{d ? `drafted by ${d.by === a.id ? 'you' : firstOf(w, d.by)}` : ''}</span>
        <span className="hc-status" data-s={m.status}>{msgStatusLabel[m.status]}</span>
      </div>
      {d?.slot && <p className="t14" style={{ margin: 0 }}><span className="muted">When </span><b>{whenText(w, d.slot.start, [...d.panel, d.personId])}</b><span className="muted"> · Panel </span>{d.panel.map((x) => firstOf(w, x)).join(', ')}</p>}
      {d && d.versions.length > 1 && (
        <div className="hc-versions" role="group" aria-label="Versions">
          <span className="t14 muted">Version</span>
          {d.versions.map((v) => <button key={v.v} type="button" className="ds-filter" aria-pressed={(viewV ?? latest!.v) === v.v} onClick={() => setViewV(v.v === latest!.v ? null : v.v)}>v{v.v}</button>)}
          <span className="t14 muted hc-vnote">{shown!.note} · {firstOf(w, shown!.by)}, {when(shown!.at)}</span>
        </div>
      )}
      {old ? (
        <>
          <div className="hc-body hc-diff hc-letter" aria-label={`Version ${old.v}${prev ? `, changes from v${prev.v}` : ''}`}>{prev ? diffWords(prev.body, old.body).map((p, i) => (p.t === 'same' ? <span key={i}>{p.s}</span> : p.t === 'add' ? <ins key={i}><span className="sr">added: </span>{p.s}</ins> : <del key={i}><span className="sr">removed: </span>{p.s}</del>)) : old.body}</div>
          <p className="t14 muted" style={{ margin: 0 }}>An older version, read-only. {prev ? <><ins className="hc-keyins">Highlighted</ins> was added in v{old.v}; struck-through was taken out.</> : null} <button type="button" className="hc-more" onClick={() => setViewV(null)}>Back to v{latest!.v}</button></p>
        </>
      ) : (
        <div className="ds-field">
          <label htmlFor={`body-${msgId}`}>Message to {nameOf(w, m.to)}{latest ? ` · v${latest.v}` : ''}{canEdit ? '' : ' (read-only)'}</label>
          <textarea id={`body-${msgId}`} className="ds-input hc-textarea" value={text} rows={Math.min(16, Math.max(8, text.split('\n').length + 3))} onChange={(e) => setText(e.target.value)} readOnly={!canEdit} />
        </div>
      )}
      {checked && <ChecksList msgId={msgId} />}
      {!old && (
        <div className="ds-actions hc-actionbar">
          {dirty ? <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Save', act: { t: 'do', op: 'hire-c.editBody', args: { msgId, body: text } } })}>Save as v{(latest?.v ?? 1) + 1}</button>
            : ready && canSend ? <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Approve and send', act: { t: 'do', op: 'hire-c.approve', args: { msgId, v: latest?.v } } })}>Approve and send v{latest?.v}</button>
              : <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Check', act: { t: 'do', op: 'hire-c.check', args: { msgId } } })}>{canSend ? 'Check and send' : 'Check and ask for approval'}</button>}
          {dirty && <button type="button" className="ds-btn quiet" onClick={() => setText(m.body)}>Cancel edits</button>}
          <button type="button" className="ds-btn quiet hc-discard" onClick={() => void runAction({ label: 'Discard', act: { t: 'do', op: 'hire-c.discard', args: { msgId } } })}>Discard draft</button>
        </div>
      )}
      {!canSend && <p className="t14 muted" style={{ margin: 0 }}>Your role can draft. An admin or recruiter approves each send.</p>}
      {m.status === 'AWAITING_APPROVAL' && !ready && canSend && <p className="t14 muted" style={{ margin: 0 }}>Q re-checks this version before you approve it.</p>}
    </div>
  );
}
