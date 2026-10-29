// The contact card on a job page (audit addendum §C). The employer's policy comes first, before any drafting:
// when contact is allowed, on which channels, how many new conversations a week, and what stays private. When
// contact is off, it shows the published route and never an address. The draft is editable and goes only on Send.
import { useEffect, useState } from 'react';
import { actorOf, orgOf, useWorld } from '../../mock/world';
import { runAction } from '../../q/core/engine';
import { Link } from '../../ui/router';
import type { Job } from '../../state/domain';
import { mail } from '../../state/areas/mail';
import { candidateStatus, CHANNEL_WORD, contactState } from './logic';
import './contact.css';

const WHEN: Record<string, string> = { BEFORE_APPLYING: 'Before or after you apply', AFTER_APPLYING: 'After you apply', OFF: 'Not taken' };

export function ContactRecruiter({ job }: { job: Job }) {
  const w = useWorld((x) => x);
  const a = actorOf(w); const pid = a.personId!;
  const st = contactState(w, pid, job);
  const org = orgOf(w, job.orgId)?.name ?? 'This employer';
  const draft = mail(w).contactDrafts[pid];
  const mine = draft?.jobId === job.id ? draft : undefined;
  const [text, setText] = useState(mine?.body ?? '');
  const [channel, setChannel] = useState<'IN_APP' | 'EMAIL'>(mine?.channel ?? 'IN_APP');
  useEffect(() => { if (mine) { setText(mine.body); setChannel(mine.channel); } }, [mine?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = st.policy; const off = !p || p.candidateInitiated === 'OFF';
  const status = st.thread ? candidateStatus(w, st.thread, pid) : undefined;
  const say = (t: string) => void runAction({ label: t, act: { t: 'say', text: t } });
  return (
    <section className="ds-sheet cr-contact" id="contact" aria-labelledby="cr-c-h">
      <div className="cr-row"><h2 id="cr-c-h" className="tb-h2">{off ? `Questions for ${org}` : `Ask ${org} about this role`}</h2>{st.thread && status && <span className="ds-tag" data-k={status.tone}>{status.label}</span>}</div>
      <dl className="cr-policy" aria-label={`${org}’s contact policy`}>
        <div><dt>Direct questions</dt><dd>{WHEN[p?.candidateInitiated ?? 'OFF']}</dd></div>
        {!off && <div><dt>How</dt><dd>{st.channels.map((c) => (c === 'EMAIL' ? `by email to ${st.address}` : 'in Talent Q')).join(' or ')}</dd></div>}
        {!off && <div><dt>Limit</dt><dd className="num">{p!.perCandidateWeek} new conversation{p!.perCandidateWeek === 1 ? '' : 's'} a week · {st.left} left</dd></div>}
        <div><dt>Privacy</dt><dd>Recruiters’ personal addresses aren’t shown. {org} sees your name and message, not your Passport.</dd></div>
        {off && <div><dt>Published route</dt><dd><b>{st.route}</b></dd></div>}
      </dl>
      {!st.allowed && <p className="cr-why" role="status">{st.why}{off ? ' Q won’t look up or guess anyone’s address.' : ''}</p>}
      {st.thread && st.thread.messages.length > 0 && (
        <p className="t14" style={{ margin: 0 }}>{status?.can} <Link to="/c/messages">Open the conversation</Link></p>
      )}
      {st.allowed && !st.thread?.messages.some((m) => m.from === pid) && (
        mine || text ? (
          <form className="cr-draft" onSubmit={(e) => { e.preventDefault(); void runAction({ label: 'Send', act: { t: 'do', op: 'contact.send', args: { jobId: job.id, body: text, channel } } }); }}>
            <div className="ds-field"><label htmlFor="cr-text">Your question <span className="muted">· edit freely, it’s yours</span></label>
              <textarea id="cr-text" className="ds-input hc-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} /></div>
            {st.channels.length > 1 && (
              <fieldset className="hc-fs"><legend className="t14"><b>Send it</b></legend>
                <div className="cr-opts">{st.channels.map((c) => <button key={c} type="button" className="ds-opt" aria-pressed={channel === c} onClick={() => setChannel(c)}><span><b>{CHANNEL_WORD[c]}</b><span className="t14 muted" style={{ display: 'block' }}>{c === 'EMAIL' ? `From ${st.mailbox?.address ?? 'your connected email'} to ${st.address}. Send only: replies to your Gmail stay there.` : `${org} replies here; you see when it’s seen, if they open it.`}</span></span></button>)}</div>
              </fieldset>
            )}
            <div className="ds-actions"><button type="submit" className="ds-btn primary" disabled={!text.trim()}>{w.network === 'offline' ? 'Save and send when online' : `Send to ${org}`}</button><span className="ds-sim">Simulated send</span></div>
          </form>
        ) : (
          <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say('can I contact someone about this role?')}>Ask Q to draft a question</button><button type="button" className="ds-btn quiet" onClick={() => setText(`Hello ${org} team,\n\nThank you, ${a.first}`)}>Write my own</button></div>
        )
      )}
      {!st.allowed && !st.thread && <div className="ds-actions"><button type="button" className="ds-btn" onClick={() => say(off ? 'how do I apply for this?' : 'can I contact someone about this role?')}>{off ? 'How do I apply?' : 'Ask Q what I can do'}</button></div>}
    </section>
  );
}
