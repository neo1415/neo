// /r/messages: the correspondence inbox. Threads per candidate, drafts with versions, the checks Q ran,
// and approve / edit / discard. There is no way to send that skips the checks and an explicit approval.
import { useEffect, useMemo, useState } from 'react';
import { actorOf, orgOf, personOf, simNow, useWorld } from '../../mock/world';
import { Canvas, useNarrow } from '../../ds/Workspace';
import { runAction, useViewState } from '../../q/core/engine';
import { hc } from '../../state/areas/hire-c';
import type { Msg } from '../../state/domain';
import { CAN_SEND, city, delivered, diffWords, firstOf, KIND_LABEL, LAGOS, mandateTitle, msgStatusLabel, nameOf, tDay, tTime } from './lib';
import { ChecksList } from './refs';

type Filter = 'all' | 'approval' | 'drafts' | 'reply' | 'sent';
const FILTERS: [Filter, string][] = [['all', 'All'], ['approval', 'Waiting for approval'], ['drafts', 'Drafts'], ['reply', 'Waiting on us'], ['sent', 'Sent']];
const when = (iso: string) => `${tDay(iso, LAGOS)}, ${tTime(iso, LAGOS)}`;

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
  const shown = groups.filter((g) => filter === 'all' || (filter === 'approval' && g.awaiting) || (filter === 'drafts' && g.drafts) || (filter === 'reply' && g.waitingOnUs) || (filter === 'sent' && g.sent));
  const cur = groups.find((g) => g.pid === sel) ?? (narrow ? undefined : shown[0]);
  const counts = { approval: groups.filter((g) => g.awaiting).length, drafts: groups.filter((g) => g.drafts).length, reply: groups.filter((g) => g.waitingOnUs).length };
  if (!a.orgId) return <Canvas title="Messages" kicker="Hiring" open onClose={() => {}}><p>Messages appear once you belong to an organisation.</p></Canvas>;

  const list = (
    <nav className="hc-list" aria-label="Conversations">
      <div className="hc-filters" role="group" aria-label="Show">
        {FILTERS.map(([k, l]) => <button key={k} type="button" className="ds-filter" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}{k !== 'all' && k !== 'sent' && counts[k] ? ` · ${counts[k]}` : ''}</button>)}
      </div>
      {shown.length === 0 && <p className="t14 muted" style={{ padding: '8px 4px' }}>{groups.length ? 'Nothing here with this filter.' : 'No conversations yet. Ask Q to draft an invitation, for example “draft an interview invitation for Tobi”.'}</p>}
      <ul>
        {shown.map((g) => (
          <li key={g.pid}>
            <button type="button" className="hc-row" aria-pressed={cur?.pid === g.pid} onClick={() => setSel(g.pid)}>
              <span className="hc-row-top"><b>{nameOf(w, g.pid)}</b><span className="t14 muted num">{g.last ? tDay(g.last.m.at, LAGOS) : ''}</span></span>
              <span className="t14 muted hc-ellip">{mandateTitle(w, g.last?.mandateId)} · {g.last?.m.from === g.pid ? '' : 'You: '}{g.last?.m.body.replace(/^(hi|dear|hello)\s+[^,\n]*,\s*/i, '').split('\n').find((l) => l.trim())?.slice(0, 70)}</span>
              <span className="hc-tags">
                {g.awaiting && <span className="ds-tag" data-k="busy">Waiting for approval</span>}
                {g.drafts && <span className="ds-tag">Draft</span>}
                {g.queued && <span className="ds-tag" data-k="warn">Queued offline</span>}
                {g.waitingOnUs && <span className="ds-tag" data-k="risk">Waiting on us</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
  return (
    <Canvas title={counts.approval ? `${counts.approval} ${counts.approval === 1 ? 'message needs' : 'messages need'} approval.` : 'Messages with candidates'} kicker={`${orgOf(w, a.orgId)?.name} · messages`} open onClose={() => {}}
      aside={<span className="t14 muted">Approve each send · sends are simulated</span>}>
      {w.network === 'offline' && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">!</span><span>You’re offline. Approved messages are queued and sent when you reconnect, after a calendar re-check.</span><span /></div>}
      <div className="hc-inbox" data-open={cur ? '1' : '0'}>
        {(!narrow || !cur) && list}
        {cur && <ThreadView pid={cur.pid} msgs={cur.msgs} onBack={narrow ? () => setSel('') : undefined} />}
      </div>
    </Canvas>
  );
}

function ThreadView({ pid, msgs, onBack }: { pid: string; msgs: { m: Msg; mandateId?: string }[]; onBack?: () => void }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const p = personOf(w, pid)!; const c = w.consents[pid];
  const lastReal = [...msgs].reverse().find((x) => delivered(x.m));
  const waitDays = lastReal && lastReal.m.from === pid ? Math.floor((simNow(w).getTime() - new Date(lastReal.m.at).getTime()) / 864e5) : 0;
  return (
    <section className="hc-thread ds-sheet" aria-label={`Conversation with ${p.name}`}>
      {onBack && <button type="button" className="ds-btn quiet" onClick={onBack} style={{ justifySelf: 'start' }}>← All conversations</button>}
      <header className="hc-thread-head">
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <h2 className="voice t24" style={{ margin: 0 }}>{p.name}</h2>
          <span className="t14 muted">{mandateTitle(w, msgs[0]?.mandateId)} · {city(p.timezone)} time (now {tTime(simNow(w).toISOString(), p.timezone)})</span>
          <span className="t14 muted">Contact choices: {c ? [c.notifications.email && 'email', c.notifications.sms && 'text', c.notifications.inApp && 'in Talent Q'].filter(Boolean).join(', ') || 'none' : 'unknown'}{c?.withdrawnFrom.includes(a.orgId!) ? ' · withdrew consent for Kora' : ''}</span>
        </div>
        <button type="button" className="ds-btn" onClick={() => void runAction({ label: 'Ask Q', act: { t: 'say', text: `draft a reply to ${p.name.split(' ')[0]}` } })}>Ask Q to draft a reply</button>
      </header>
      {waitDays >= 1 && <p className="ds-note" style={{ margin: 0 }}>{p.name.split(' ')[0]} has been waiting on a reply for {waitDays} day{waitDays === 1 ? '' : 's'}.</p>}
      <ol className="hc-msgs" aria-label="Messages, oldest first">
        {msgs.map(({ m }) => (
          <li key={m.id} className="hc-msg" data-from={m.from === pid ? 'them' : 'us'} data-s={m.status}>
            {m.status === 'DRAFT' || m.status === 'AWAITING_APPROVAL' ? <DraftEditor msgId={m.id} m={m} /> : (
              <>
                <div className="hc-msg-head"><b>{m.from === pid ? p.name : nameOf(w, m.from)}</b><span className="t14 muted">{when(m.at)} · {m.channel === 'EMAIL' ? 'email' : m.channel === 'SMS' ? 'text' : 'Talent Q'}</span><span className="hc-status" data-s={m.status}>{m.from !== pid && m.status === 'RECEIVED' ? 'Delivered' : msgStatusLabel[m.status]}</span></div>
                {m.subject && <p className="hc-subj">{m.subject}</p>}
                <div className="hc-body">{m.body}</div>
                {m.status === 'SENT_SIMULATED' && <p className="t14 muted" style={{ margin: 0 }}><span className="ds-sim">Simulated send</span> Approved by {m.approvedBy ? firstOf(w, m.approvedBy) : '—'} · receipt <span className="num">{m.receipt}</span></p>}
                {m.status === 'QUEUED_OFFLINE' && <p className="t14" style={{ margin: 0 }}>Approved by {m.approvedBy ? firstOf(w, m.approvedBy) : '—'}. Not sent yet: it goes when you reconnect.</p>}
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
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
  const checked = d?.checks && d.checkedV === latest?.v;
  const ready = m.status === 'AWAITING_APPROVAL' && checked && d!.checks!.every((c) => c.ok || (c.id === 'role' && canSend));
  const old = viewV !== null ? d?.versions.find((x) => x.v === viewV) : undefined;
  const prev = old ? d?.versions.find((x) => x.v === old.v - 1) : undefined;
  return (
    <div className="hc-draft" aria-label={`Draft ${KIND_LABEL[d?.kind ?? 'INVITE']}`}>
      <div className="hc-msg-head"><b>{d ? `${KIND_LABEL[d.kind].replace(/^\w/, (x) => x.toUpperCase())} · drafted by ${firstOf(w, d.by)}` : 'Draft'}</b><span className="hc-status" data-s={m.status}>{msgStatusLabel[m.status]}</span></div>
      {d && d.versions.length > 1 && (
        <div className="hc-versions" role="group" aria-label="Versions">
          {d.versions.map((v) => <button key={v.v} type="button" className="ds-filter" aria-pressed={(viewV ?? latest!.v) === v.v} onClick={() => setViewV(v.v === latest!.v ? null : v.v)} title={v.note}>v{v.v}</button>)}
          <span className="t14 muted">{(old ?? latest)!.note} · {firstOf(w, (old ?? latest)!.by)}, {when((old ?? latest)!.at)}</span>
        </div>
      )}
      {old ? (
        <div className="hc-body hc-diff" aria-label={`Version ${old.v}${prev ? `, changes from v${prev.v}` : ''}`}>{prev ? diffWords(prev.body, old.body).map((p, i) => (p.t === 'same' ? <span key={i}>{p.s}</span> : p.t === 'add' ? <ins key={i}>{p.s}</ins> : <del key={i}>{p.s}</del>)) : old.body}</div>
      ) : (
        <div className="ds-field">
          <label htmlFor={`body-${msgId}`}>Message to {nameOf(w, m.to)} {latest ? `(v${latest.v}, editable)` : ''}</label>
          <textarea id={`body-${msgId}`} className="ds-input hc-textarea" value={text} rows={10} onChange={(e) => setText(e.target.value)} readOnly={!['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(a.role ?? 'VIEWER')} />
        </div>
      )}
      {checked && <ChecksList msgId={msgId} />}
      {!old && (
        <div className="ds-actions">
          {dirty ? <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Save', act: { t: 'do', op: 'hire-c.editBody', args: { msgId, body: text } } })}>Save as v{(latest?.v ?? 1) + 1}</button>
            : ready && canSend ? <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Approve and send', act: { t: 'do', op: 'hire-c.approve', args: { msgId, v: latest?.v } } })}>Approve and send v{latest?.v}</button>
              : <button type="button" className="ds-btn primary" onClick={() => void runAction({ label: 'Check', act: { t: 'do', op: 'hire-c.check', args: { msgId } } })}>{canSend ? 'Check and send' : 'Check and ask for approval'}</button>}
          {dirty && <button type="button" className="ds-btn quiet" onClick={() => setText(m.body)}>Cancel edits</button>}
          <button type="button" className="ds-btn danger" onClick={() => void runAction({ label: 'Discard', act: { t: 'do', op: 'hire-c.discard', args: { msgId } } })}>Discard</button>
        </div>
      )}
      {!canSend && <p className="t14 muted" style={{ margin: 0 }}>Your role can draft. An admin or recruiter approves each send.</p>}
      {m.status === 'AWAITING_APPROVAL' && !ready && canSend && <p className="t14 muted" style={{ margin: 0 }}>Q re-checks this version before you approve it.</p>}
    </div>
  );
}
