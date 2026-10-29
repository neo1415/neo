// /settings/email (both sides): connected email accounts (E01-01..03). Connect Google, Microsoft or other business
// email through a simulated consent screen that explains each permission in plain words (send only vs send and read
// replies, minimum scopes), see what each address lets Q do and who may send as it, reconnect when a sign-in expires,
// disconnect and revoke. Personal, organisation/shared, client and Talent Q service senders are kept apart. The
// organisation's email policy and a client's reminder automation sit here too. Demo controls are labelled "Demo".
import { useState } from 'react';
import { actorOf, orgOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { runAction, useViewState } from '../../q/core/engine';
import { navigate } from '../../ui/router';
import { mail, mailboxOf, orgMailPolicy } from '../../state/areas/mail';
import type { MailboxConnection } from '../../state/domain';
import { firstOf, listNames, LAGOS, tDay, tTime } from './lib';
import { KIND_WORD, providerWord, scopeWord } from './email';
import './email.css';

const go = (label: string, op: string, args: Record<string, unknown>) => void runAction({ label, act: { t: 'do', op, args } });
const LOGO: Record<MailboxConnection['provider'], string> = { GOOGLE: 'G', MICROSOFT: 'M', OTHER: '@', TALENTQ: 'Q' };
const STATE: Record<MailboxConnection['state'], { label: string; k?: string }> = { CONNECTED: { label: 'Connected', k: 'ok' }, EXPIRED: { label: 'Sign-in expired', k: 'risk' }, REVOKED: { label: 'Disconnected', k: 'warn' } };
const SCOPE_TEXT = {
  GOOGLE: { send: 'Send email as you (Google scope gmail.send, “sensitive”)', read: 'Read messages in recruiting threads, to see replies (gmail.readonly, a “restricted” scope Google reviews)' },
  MICROSOFT: { send: 'Send mail as you (Microsoft Graph Mail.Send)', read: 'Read mail, to see replies (Mail.Read, with change notifications)' },
  OTHER: { send: 'Send through your mail server (SMTP, with your domain’s SPF and DKIM)', read: 'Read replies over IMAP (checked every few minutes)' },
} as const;

export function EmailSettings() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const [consent, setConsent] = useViewState<string>('consent', '');
  const [back, setBack] = useViewState<string>('back', '');
  const me = a.personId ?? a.id;
  const all = mail(w).mailboxes.filter((m) => m.state !== 'REVOKED' || m.owner === me);
  const visible = a.side === 'candidate' ? all.filter((m) => m.owner === me) : all.filter((m) => (m.orgId === a.orgId && (m.sendAs.includes(a.id) || m.owner === a.id || m.kind === 'SHARED')) || m.kind === 'SERVICE');
  const groups: [string, string, MailboxConnection[]][] = a.side === 'candidate'
    ? [['Your email', 'Q sends only what you approve, from here. Employers never see this address unless you write to them by email.', visible]]
    : [
      ['Yours', 'Personal addresses. Only you send as them.', visible.filter((m) => m.kind === 'PERSONAL')],
      ['Shared with your team', 'Organisation addresses several people may send as.', visible.filter((m) => m.kind === 'SHARED' || m.kind === 'ORG')],
      ['Client senders', 'Used only for that client’s work, so candidates and data never cross between clients.', visible.filter((m) => m.kind === 'CLIENT')],
      ['Talent Q notices', 'Invitations, receipts and reminders Talent Q sends itself, from its own verified domain. Never used to speak for you.', visible.filter((m) => m.kind === 'SERVICE')],
    ];
  const pol = a.orgId ? orgMailPolicy(w, a.orgId) : undefined;
  const autos = mail(w).automations.filter((x) => x.orgId === a.orgId);
  const consentMb = consent && !consent.startsWith('new:') ? mailboxOf(w, consent) : undefined;
  return (
    <Canvas title="Email accounts" kicker={a.side === 'candidate' ? `${a.first}’s settings` : `${orgOf(w, a.orgId)?.name ?? 'Your'} · settings`} open onClose={() => navigate(a.side === 'candidate' ? '/c/home' : '/r/messages')}>
      <p className="t16" style={{ margin: 0, maxWidth: '62ch' }}>Q sends email only from addresses connected here, and only after you approve the exact message. “Sent” means the provider accepted it, not that it was read. All connections in this prototype are simulated.</p>
      {consent && <ConsentScreen key={consent} target={consent} mb={consentMb} onDone={(ok) => { setConsent(''); if (ok && back) { const b = back; setBack(''); navigate(b); } }} />}
      <div className="es-grid">
        {groups.filter(([, , xs]) => xs.length).map(([h, sub, xs]) => (
          <section key={h} className="ds-sheet es-group" aria-labelledby={`es-${h}`}>
            <div><h2 id={`es-${h}`} className="es-h voice">{h}</h2><p className="t14 muted" style={{ margin: 0 }}>{sub}</p></div>
            {xs.map((m) => <MailboxRow key={m.id} m={m} mine={m.owner === me} onReconnect={() => setConsent(m.id)} />)}
          </section>
        ))}
        <section className="ds-sheet es-group" aria-labelledby="es-connect">
          <h2 id="es-connect" className="es-h voice">Connect {visible.some((m) => m.owner === me) ? 'another' : 'an'} account</h2>
          <div className="es-providers">
            {(['GOOGLE', 'MICROSOFT', 'OTHER'] as const).map((p) => (
              <button key={p} type="button" className="ds-opt" onClick={() => setConsent(`new:${p}`)}><span><b>{p === 'GOOGLE' ? 'Google' : p === 'MICROSOFT' ? 'Microsoft' : 'Other business email'}</b><span className="t14 muted" style={{ display: 'block' }}>{p === 'GOOGLE' ? 'Gmail or Google Workspace' : p === 'MICROSOFT' ? 'Outlook, Microsoft 365 or Outlook.com' : 'Your own domain, over SMTP and IMAP where supported'}</span></span></button>
            ))}
          </div>
        </section>
        {pol && a.side === 'recruiter' && (
          <section className="ds-sheet es-group" aria-labelledby="es-pol">
            <div><h2 id="es-pol" className="es-h voice">{orgOf(w, a.orgId)?.name} email policy</h2><p className="t14 muted" style={{ margin: 0 }}>What Q applies to every email from {orgOf(w, a.orgId)?.name}. Admins change it on <a href="#/r/setup">Organisation and policy</a>.</p></div>
            <dl className="es-policy">
              <div><dt>Approval</dt><dd>{pol.delegation}</dd></div>
              <div><dt>Templates</dt><dd>{pol.templates.map((t) => t.label).join(' · ')}</dd></div>
              <div><dt>Signature</dt><dd>{pol.signature.replace('{name}', a.name).replace('{title}', a.title)}</dd></div>
              <div><dt>Footer</dt><dd>{pol.legal}</dd></div>
              <div><dt>Language</dt><dd>{pol.language}</dd></div>
              <div><dt>Sending hours</dt><dd>{pol.sendingHours.join('–')} Lagos; later sends are scheduled</dd></div>
              <div><dt>Limit</dt><dd className="num">{pol.dailyCap} emails per address per day</dd></div>
              <div><dt>Channels</dt><dd>{pol.channels.map((c) => (c === 'IN_APP' ? 'Talent Q' : c === 'SMS' ? 'Text' : 'Email')).join(', ')}</dd></div>
              <div><dt>External data</dt><dd>{pol.externalData}</dd></div>
              <div><dt>Escalation</dt><dd>{pol.escalation}</dd></div>
            </dl>
          </section>
        )}
        {autos.length > 0 && (
          <section className="ds-sheet es-group" aria-labelledby="es-auto">
            <div><h2 id="es-auto" className="es-h voice">Pre-approved reminders</h2><p className="t14 muted" style={{ margin: 0 }}>Narrow automations a client approved. Q never widens them; pausing takes effect at once.</p></div>
            {autos.map((x) => (
              <div key={x.id} className="es-mb">
                <span className="es-logo" aria-hidden="true">↻</span>
                <div className="es-mbmain">
                  <span className="es-addr">{x.label}</span>
                  <span className="t14 muted">{x.messageClass}. From {mailboxOf(w, x.mailboxId)?.address}. Approved by {firstOf(w, x.approvedBy)} on {x.approvedAt}.</span>
                  <span className="hc-tags"><span className="ds-tag" data-k={x.state === 'ACTIVE' ? 'ok' : 'warn'}>{x.state === 'ACTIVE' ? 'Active' : `Paused${x.pausedAt ? ` ${tDay(x.pausedAt, LAGOS)} ${tTime(x.pausedAt, LAGOS)}` : ''}`}</span><span className="ds-tag num">{x.sent} of {x.cap} used</span>{x.clientOrgId && <span className="ds-tag">For {orgOf(w, x.clientOrgId)?.name}</span>}</span>
                </div>
                <div className="es-acts">
                  {x.state === 'ACTIVE' ? <button type="button" className="ds-btn primary" onClick={() => go('Pause', 'email.automation', { id: x.id, action: 'pause' })}>Pause now</button> : <button type="button" className="ds-btn" onClick={() => go('Resume', 'email.automation', { id: x.id, action: 'resume' })}>Resume</button>}
                  <button type="button" className="em-demo" onClick={() => go('Run', 'email.automation', { id: x.id, action: 'run' })}><span className="em-demotag">Demo</span>Run due reminders</button>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </Canvas>
  );
}

function MailboxRow({ m, mine, onReconnect }: { m: MailboxConnection; mine: boolean; onReconnect: () => void }) {
  const w = useWorld((x) => x); const a = actorOf(w);
  const st = STATE[m.state]; const read = m.scopes.includes('READ');
  const fail = mail(w).failNext[m.id];
  return (
    <div className="es-mb" data-state={m.state}>
      <span className="es-logo" aria-hidden="true">{LOGO[m.provider]}</span>
      <div className="es-mbmain">
        <span className="es-addr">{m.address}</span>
        <span className="t14 muted">{providerWord(m)} · {KIND_WORD[m.kind]}{m.kind === 'CLIENT' ? ` for ${orgOf(w, m.clientOrgId)?.name}` : ''} · connected {m.connectedAt}</span>
        <span className="hc-tags"><span className="ds-tag" data-k={st.k}>{st.label}</span><span className="ds-tag">{scopeWord(m)}</span>{fail && <span className="ds-tag" data-k="warn">Demo: next send {fail === 'AUTH_EXPIRED' ? 'finds the sign-in expired' : fail === 'BOUNCED' ? 'bounces' : fail === 'RATE_LIMITED' ? 'is rate-limited' : 'is refused'}</span>}</span>
        <ul className="es-can" aria-label="What Q can do with this address">
          <li>Send messages you approve{m.kind === 'SERVICE' ? ' (Talent Q notices only)' : ''}</li>
          <li data-no={read ? undefined : '1'}>{read ? 'See replies in recruiting threads, so it can summarise them and suggest next steps' : 'Can’t see replies: Q will say so instead of guessing'}</li>
          <li data-no="1">Never deletes, forwards or reads unrelated mail</li>
          {m.kind !== 'SERVICE' && <li>Who may send as it: {listNames(m.sendAs.map((x) => (x === a.id || x === a.personId ? 'you' : firstOf(w, x))))}</li>}
        </ul>
        {m.state === 'EXPIRED' && <p className="em-note" role="status">The {m.provider === 'GOOGLE' ? 'Google' : 'Microsoft'} sign-in expired, so nothing sends from it. Drafts and approvals are kept; after you reconnect, a retry uses the same key and can’t send twice.</p>}
      </div>
      {m.kind !== 'SERVICE' && mine && (
        <div className="es-acts">
          {m.state === 'EXPIRED' && <button type="button" className="ds-btn primary" onClick={onReconnect}>Reconnect</button>}
          {m.state === 'REVOKED' && <button type="button" className="ds-btn" onClick={onReconnect}>Connect again</button>}
          {m.state === 'CONNECTED' && <button type="button" className="ds-btn quiet" onClick={onReconnect}>Change access</button>}
          {m.state !== 'REVOKED' && <ConfirmButton label="Disconnect and revoke" question={`Disconnect ${m.address}? Scheduled emails from it won’t go.`} yes="Disconnect" onConfirm={() => go('Disconnect', 'email.disconnect', { mailboxId: m.id })} />}
          {m.state === 'CONNECTED' && (m.provider === 'GOOGLE' || m.provider === 'MICROSOFT') && <button type="button" className="em-demo" onClick={() => go('Demo', 'email.expire', { mailboxId: m.id })}><span className="em-demotag">Demo</span>Simulate token expiry</button>}
          {m.state === 'CONNECTED' && (
            <label className="em-demo" style={{ cursor: 'default' }}><span className="em-demotag">Demo</span><span className="sr">Next send from {m.address}</span>
              <select className="em-select" style={{ border: 0, background: 'transparent', minHeight: 40 }} value={fail ?? ''} onChange={(e) => go('Demo', 'email.failNext', { mailboxId: m.id, reason: e.target.value || null })}>
                <option value="">Next send: normal</option><option value="BOUNCED">Next send: bounces</option><option value="RATE_LIMITED">Next send: rate-limited</option><option value="SMTP_REJECTED">Next send: server refuses</option>
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

/** A simulated provider consent screen. It explains every permission before agreeing, and lets the person choose
 *  the minimum: send only, or send and read replies. */
function ConsentScreen({ target, mb, onDone }: { target: string; mb?: MailboxConnection; onDone: (ok: boolean) => void }) {
  const w = useWorld((x) => x); const a = actorOf(w);
  const provider = (mb?.provider ?? target.replace('new:', '')) as 'GOOGLE' | 'MICROSOFT' | 'OTHER';
  const [read, setRead] = useState(mb ? mb.scopes.includes('READ') : a.side === 'recruiter');
  const [kind, setKind] = useState<'PERSONAL' | 'SHARED'>(mb?.kind === 'SHARED' ? 'SHARED' : 'PERSONAL');
  const [addr, setAddr] = useState(mb?.address ?? (a.side === 'candidate' ? a.email : a.email));
  const name = provider === 'GOOGLE' ? 'Google' : provider === 'MICROSOFT' ? 'Microsoft' : 'your mail server';
  const sc = SCOPE_TEXT[provider];
  const allow = () => {
    if (mb && mb.state === 'EXPIRED' && read === mb.scopes.includes('READ')) go('Reconnect', 'email.reconnect', { mailboxId: mb.id, consented: true });
    else go('Connect', 'email.connect', { provider, read, kind, address: addr });
    onDone(true);
  };
  return (
    <section className="ds-sheet es-consent" aria-labelledby="es-cons-h" role="dialog" aria-modal="false">
      <span className="ds-sim">Simulated {name} sign-in</span>
      <h3 id="es-cons-h" className="voice t24">{mb?.state === 'EXPIRED' ? `Sign in to ${name} again as ${mb.address}` : mb ? `Change what Talent Q may do with ${mb.address}` : `Connect ${provider === 'OTHER' ? 'business email' : name}`}</h3>
      {!mb && <div className="ds-field"><label htmlFor="es-addr">Email address</label><input id="es-addr" className="ds-input" value={addr} onChange={(e) => setAddr(e.target.value)} /></div>}
      {!mb && a.side === 'recruiter' && (
        <fieldset className="hc-fs"><legend className="t14"><b>Whose address is it?</b></legend>
          <div className="es-providers">
            <button type="button" className="ds-opt" aria-pressed={kind === 'PERSONAL'} onClick={() => setKind('PERSONAL')}><span><b>Mine</b><span className="t14 muted" style={{ display: 'block' }}>Only you send as it.</span></span></button>
            <button type="button" className="ds-opt" aria-pressed={kind === 'SHARED'} onClick={() => setKind('SHARED')}><span><b>Shared team address</b><span className="t14 muted" style={{ display: 'block' }}>An admin chooses who may send as it.</span></span></button>
          </div>
        </fieldset>
      )}
      <fieldset className="hc-fs"><legend className="t14"><b>What Q may do</b></legend>
        <div className="es-providers">
          <button type="button" className="ds-opt" aria-pressed={!read} onClick={() => setRead(false)}><span><b>Send only</b><span className="t14 muted" style={{ display: 'block' }}>Q sends what you approve. It can’t see replies, and will say so.</span></span></button>
          <button type="button" className="ds-opt" aria-pressed={read} onClick={() => setRead(true)}><span><b>Send and read replies</b><span className="t14 muted" style={{ display: 'block' }}>Q also sees replies in recruiting threads, to summarise them and suggest the next step.</span></span></button>
        </div>
      </fieldset>
      <div className="es-scopes" aria-label={`${name} will ask you to allow`}>
        <p className="t14" style={{ margin: 0 }}><b>{name} will ask you to allow:</b></p>
        <div className="es-scope"><span aria-hidden="true">✓</span><span>{sc.send}</span></div>
        {read && <div className="es-scope"><span aria-hidden="true">✓</span><span>{sc.read}</span></div>}
        <div className="es-scope"><span aria-hidden="true">✕</span><span>Not asked for: deleting mail, changing settings, contacts, or your calendar.</span></div>
      </div>
      <p className="t14 muted" style={{ margin: 0 }}>You can disconnect at any time here or in your {name} account; access stops at once. Talent Q keeps the connection details encrypted and never shows them to Q.</p>
      <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={allow}>Allow (simulated)</button><button type="button" className="ds-btn quiet" onClick={() => onDone(false)}>Cancel</button></div>
    </section>
  );
}
