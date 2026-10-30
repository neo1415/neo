// J12 step 6–8 (candidate): an employer's bounded work-sample request, the simulated sample, submission ("Self-reported,
// waiting for review"), the review outcome once the employer shares it, decline (recorded as declined, not failed),
// and "share existing work instead". Step 10: the candidate's own interest answer. The same card renders on the home
// (compact) and on Applications (full), from the one store.
import { useState } from 'react';
import { motion } from 'motion/react';
import type { EvidenceReuseDecision } from '../../../state/domain';
import { actorOf, useWorld, type World } from '../../../mock/world';
import { runAction } from '../../../q/core/engine';
import { arrive } from '../../../ds/motion';
import { Link } from '../../../ui/router';
import { reqLabel } from '../../hire-b/model';
import { BOUNDED_SAMPLE, briefFor, dayMonth, evcRead, interestFor, offerFor, openRequests, orgNm, proofClass, requestsFor, reviewOf, roleTitle, verifiedGap, whyAsked } from './logic';
import { ProofClassTag } from './ProofClass';
import { GapCard } from './Gap';
import './candidate.css';

const act = (op: string, args: Record<string, unknown> = {}) => runAction({ label: op, act: { t: 'do', op, args } });
const STATE_WORD: Record<EvidenceReuseDecision['state'], string> = { PROPOSED: 'Not sent', SENT: 'Waiting for you', IN_PROGRESS: 'Started', SUBMITTED: 'Waiting for review', REVIEWED: 'Reviewed', DECLINED: 'You declined' };
const STATE_K: Record<EvidenceReuseDecision['state'], string | undefined> = { PROPOSED: undefined, SENT: 'busy', IN_PROGRESS: 'busy', SUBMITTED: undefined, REVIEWED: 'ok', DECLINED: undefined };

export function RequestCard({ d, compact }: { d: EvidenceReuseDecision; compact?: boolean }) {
  const w = useWorld((x) => x);
  const [mode, setMode] = useState<'idle' | 'decline' | 'share'>('idle');
  const org = orgNm(w, d.orgId);
  const req = reqLabel(w, d.reqId);
  const mins = d.effortMinutes ?? BOUNDED_SAMPLE[d.reqId]?.minutes ?? 40;
  const offer = offerFor(w, d.id);
  const result = d.resultEvidenceId ? w.evidence.find((e) => e.evidenceId === d.resultEvidenceId) : undefined;
  const review = reviewOf(w, d);
  const hid = `evc-req-${d.id}`;
  const verb = d.decision === 'REQUEST_VERIFICATION' ? 'confirm' : 'see';
  return (
    <motion.section {...arrive} className="ds-sheet evc-req" data-state={d.state} aria-labelledby={hid}>
      <div className="evc-row"><span className="lab">{org} · {roleTitle(w, d.mandateId)}</span><span className="ds-tag" data-k={STATE_K[d.state]}>{STATE_WORD[d.state]}</span></div>
      <h2 id={hid} className="voice evc-req-h">{d.state === 'SENT' || d.state === 'IN_PROGRESS' ? `${org} would like to ${verb} one piece of your work on ${req}` : `Your ${req} sample for ${org}`}</h2>
      {(d.state === 'SENT' || (d.state === 'IN_PROGRESS' && !compact)) && (
        <dl className="evc-facts">
          <div><dt>What</dt><dd>{BOUNDED_SAMPLE[d.reqId]?.task ?? req}.</dd></div>
          <div><dt>Why</dt><dd>{whyAsked(w, d)}</dd></div>
          <div><dt>Time</dt><dd><b className="num">About {mins} minutes</b>, whenever suits you.</dd></div>
          {!compact && <div><dt>Who sees it</dt><dd>{org} only. Not reused for other employers unless you choose.</dd></div>}
        </dl>
      )}

      {d.state === 'SENT' && !offer && mode === 'idle' && (
        <div className="evc-acts">
          <button type="button" className="ds-btn primary" onClick={() => void act('ev.sample.start', { id: d.id })}>Do it now</button>
          <button type="button" className="ds-btn" onClick={() => setMode('share')}>Share existing work instead</button>
          <button type="button" className="ds-btn quiet" onClick={() => setMode('decline')}>Decline</button>
        </div>
      )}
      {d.state === 'SENT' && mode === 'decline' && <DeclineForm d={d} org={org} onCancel={() => setMode('idle')} />}
      {d.state === 'SENT' && mode === 'share' && !offer && <OfferForm d={d} org={org} onCancel={() => setMode('idle')} />}
      {offer && d.state === 'SENT' && (
        <div className="evc-note" role="status">
          <p><b>You offered existing work instead</b> on {dayMonth(offer.at)}: {offer.evidenceIds.map((id) => w.evidence.find((e) => e.evidenceId === id)?.title).filter(Boolean).join('; ') || 'a note'}.</p>
          <p className="t14 muted">{org} decides whether it covers this. The request stays open until they reply, and you can still do the sample if you’d rather.</p>
          <div className="evc-acts"><button type="button" className="ds-btn" onClick={() => void act('ev.sample.start', { id: d.id })}>Do the sample after all</button></div>
        </div>
      )}

      {d.state === 'IN_PROGRESS' && (compact
        ? <div className="evc-acts"><Link className="ds-btn primary" to={`/c/applications?sample=${d.id}`}>Carry on with the sample</Link><span className="t14 muted">Your notes are kept.</span></div>
        : <SamplePanel d={d} mins={mins} />)}

      {d.state === 'SUBMITTED' && (
        <div className="evc-note" role="status">
          {result && <ProofClassTag id={`${d.id}-r`} k={proofClass(w, result)} extra="waiting for review" />}
          <p>Submitted. {org} reviews it, and you’ll see the outcome here. Until then it counts as your own work, not as a result.</p>
          {result && <Link className="ds-btn" to={`/c/passport?item=${result.evidenceId}`}>See it in your Passport</Link>}
        </div>
      )}
      {d.state === 'REVIEWED' && review && (
        <div className="evc-note evc-reviewed" data-tone={review.tone} role="status">
          {result && <ProofClassTag id={`${d.id}-r`} k={proofClass(w, result)} extra={review.tone === 'part' ? 'partial' : undefined} />}
          <p className="evc-outcome"><b>{review.word}.</b> {review.tone === 'not' ? 'That’s about this one sample, not about you. Your application continues on everything else you’ve shared.' : 'It now counts as reviewed work for this role.'}</p>
          {review.note ? <>
            <blockquote className="evc-quote"><p>“{review.note}”</p><footer className="t14 muted">Reviewer’s note, shared by {org}</footer></blockquote>
            {!compact && <p className="t14 muted">{org} chose to share this note with you. It stays between you and {org}; Q won’t pass it to another employer.</p>}
          </> : <p className="t14 muted">{org} hasn’t shared the reviewer’s note with you.</p>}
        </div>
      )}
      {d.state === 'DECLINED' && (
        <div className="evc-note" role="status">
          <p><b>You declined this sample.</b> It’s recorded as declined, not as a failed result. {org} can still review your application on what you’ve already shared.</p>
          {(d.whyDeclined ?? evcRead(w).declined[d.id]) && <p className="t14 muted">Your reason, as {org} sees it: “{d.whyDeclined ?? evcRead(w).declined[d.id]}”</p>}
        </div>
      )}
    </motion.section>
  );
}

function DeclineForm({ d, org, onCancel }: { d: EvidenceReuseDecision; org: string; onCancel: () => void }) {
  const [why, setWhy] = useState('');
  return (
    <form className="evc-form" onSubmit={(e) => { e.preventDefault(); void act('evc.sample.decline', { id: d.id, why: why.trim() }); }}>
      <div className="ds-field"><label htmlFor={`evc-why-${d.id}`}>Reason (optional)</label><textarea id={`evc-why-${d.id}`} className="ds-input evc-ta" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: I don’t have time this week" /></div>
      <p className="t14 muted">Declining is recorded as declined, never as a fail. {org} sees your reason only if you write one.</p>
      <div className="evc-acts"><button type="submit" className="ds-btn">Decline the sample</button><button type="button" className="ds-btn quiet" onClick={onCancel}>Back</button></div>
    </form>
  );
}

function OfferForm({ d, org, onCancel }: { d: EvidenceReuseDecision; org: string; onCancel: () => void }) {
  const w = useWorld((x) => x);
  const pid = actorOf(w).personId!;
  const mine = w.evidence.filter((e) => e.ownerId === pid && e.kind !== 'PRACTICE' && e.kind !== 'CLAIM' && !e.confidential);
  const [pick, setPick] = useState<string[]>([]);
  const [note, setNote] = useState('');
  return (
    <form className="evc-form" onSubmit={(e) => { e.preventDefault(); void act('evc.sample.offer', { id: d.id, ids: pick, note: note.trim() }); onCancel(); }}>
      <p className="t14" style={{ margin: 0 }}>Choose work that already shows this. {org} sees only what you pick, for this role.</p>
      <div className="evc-opts" role="group" aria-label="Your work to offer">
        {mine.map((e) => <button key={e.evidenceId} type="button" className="ds-opt" aria-pressed={pick.includes(e.evidenceId)} onClick={() => setPick(pick.includes(e.evidenceId) ? pick.filter((x) => x !== e.evidenceId) : [...pick, e.evidenceId])}><span><b>{e.title}</b><span className="t14 muted" style={{ display: 'block' }}>{pick.includes(e.evidenceId) ? 'Will be offered' : 'Not offered'}</span></span></button>)}
      </div>
      <div className="ds-field"><label htmlFor={`evc-note-${d.id}`}>A note for {org} (optional)</label><textarea id={`evc-note-${d.id}`} className="ds-input evc-ta" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Or a link to work they can look at" /></div>
      <div className="evc-acts"><button type="submit" className="ds-btn primary" disabled={!pick.length && !note.trim()}>Offer this instead</button><button type="button" className="ds-btn quiet" onClick={onCancel}>Back</button></div>
    </form>
  );
}

function SamplePanel({ d, mins }: { d: EvidenceReuseDecision; mins: number }) {
  const w = useWorld((x) => x);
  const b = briefFor(w, d);
  const saved = evcRead(w).answers[d.id] ?? '';
  const [text, setText] = useState(saved);
  const ready = text.trim().length >= 30;
  return (
    <form className="evc-sample" aria-label="Work sample" onSubmit={(e) => { e.preventDefault(); if (ready) void act('ev.sample.submit', { id: d.id, summary: text.trim() }); }}>
      <div className="evc-row"><h3 className="evc-h3">{b.title}</h3><span className="ds-sim">Simulated sample</span></div>
      <p className="t14" style={{ margin: 0 }}>{b.context}</p>
      <pre className="evc-task">{b.task}</pre>
      <div className="ds-field">
        <label htmlFor={`evc-ans-${d.id}`}>Your answer</label>
        <span className="t14 muted" id={`evc-ans-h-${d.id}`}>{b.prompt} About {mins} minutes; there’s no timer.</span>
        <textarea id={`evc-ans-${d.id}`} className="ds-input evc-ta evc-answer" rows={7} value={text} onChange={(e) => setText(e.target.value)} aria-describedby={`evc-ans-h-${d.id}`} />
      </div>
      <div className="evc-acts">
        <button type="submit" className="ds-btn primary" disabled={!ready}>Submit for review</button>
        <button type="button" className="ds-btn quiet" onClick={() => void act('evc.sample.answer', { id: d.id, text })}>Save and finish later</button>
      </div>
      {!ready && <p className="t14 muted" style={{ margin: 0 }}>A few sentences is enough to submit.</p>}
    </form>
  );
}

export function InterestCard({ orgId, mandateId }: { orgId: string; mandateId: string }) {
  const w = useWorld((x) => x);
  const pid = actorOf(w).personId!;
  const i = interestFor(w, pid).find((x) => x.orgId === orgId && x.mandateId === mandateId);
  const [no, setNo] = useState(false);
  const [note, setNote] = useState('');
  if (!i) return null;
  const org = orgNm(w, orgId); const role = roleTitle(w, mandateId);
  return (
    <motion.section {...arrive} className="ds-sheet evc-int" data-state={i.state} aria-labelledby={`evc-int-${orgId}`}>
      <div className="evc-row"><span className="lab">{org} · {role}</span><span className="ds-tag" data-k={i.state === 'REQUESTED' ? 'busy' : i.state === 'CONFIRMED' ? 'ok' : undefined}>{i.state === 'REQUESTED' ? 'Asked you' : i.state === 'CONFIRMED' ? 'You’re interested' : 'You said no'}</span></div>
      <h2 id={`evc-int-${orgId}`} className="voice evc-req-h">{i.state === 'REQUESTED' ? `Are you interested in ${org}’s ${role} role?` : i.state === 'CONFIRMED' ? `You told ${org} you’re interested` : `You told ${org} it isn’t for you right now`}</h2>
      {i.state === 'REQUESTED' && <p className="t14" style={{ margin: 0 }}>{org} asked before taking more of your time. Your answer is shown to them on its own, apart from how your evidence is reviewed. Not answering yet is fine; it isn’t a no.</p>}
      {i.state !== 'REQUESTED' && <p className="t14 muted" style={{ margin: 0 }}>Answered {dayMonth(i.at)}{i.note ? ` · “${i.note}”` : ''}. You can change it.</p>}
      {i.state === 'REQUESTED' && !no && (
        <div className="evc-acts">
          <button type="button" className="ds-btn primary" onClick={() => void act('ev.interest.answer', { orgId, yes: true })}>Yes, I’m interested</button>
          <button type="button" className="ds-btn quiet" onClick={() => setNo(true)}>Not right now</button>
        </div>
      )}
      {no && i.state === 'REQUESTED' && (
        <form className="evc-form" onSubmit={(e) => { e.preventDefault(); void act('ev.interest.answer', { orgId, yes: false, note: note.trim() }); setNo(false); }}>
          <div className="ds-field"><label htmlFor={`evc-int-n-${orgId}`}>Anything you’d like {org} to know? (optional)</label><input id={`evc-int-n-${orgId}`} className="ds-input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="evc-acts"><button type="submit" className="ds-btn">Send my answer</button><button type="button" className="ds-btn quiet" onClick={() => setNo(false)}>Back</button></div>
        </form>
      )}
      {i.state !== 'REQUESTED' && <div className="evc-acts"><button type="button" className="tb-linkbtn" onClick={() => void act('ev.interest.answer', { orgId, yes: i.state !== 'CONFIRMED' })}>{i.state === 'CONFIRMED' ? 'Change to not interested' : 'Change to interested'}</button></div>}
    </motion.section>
  );
}

/** One line for Q's home greeting when something from an employer is waiting on the candidate. */
export function evidenceHomeLine(w: World, pid: string): string | null {
  const d = openRequests(w, pid)[0];
  if (d) {
    const org = orgNm(w, d.orgId);
    return d.state === 'IN_PROGRESS'
      ? `Your ${reqLabel(w, d.reqId)} sample for ${org} is saved. Pick it up whenever you’re ready.`
      : `${org} would like to see one short piece of your work, about ${d.effortMinutes ?? 40} minutes. It’s your choice, and saying no is recorded as no, not as a fail.`;
  }
  const i = interestFor(w, pid).find((x) => x.state === 'REQUESTED');
  if (i) return `${orgNm(w, i.orgId)} asked whether you’re interested in their ${roleTitle(w, i.mandateId)} role. One tap answers it.`;
  return null;
}

/** Home block: requests waiting on the person, interest checks, and J7's answer to a verified gap. */
export function EvidenceHomeCards({ part = 'asks' }: { part?: 'asks' | 'grow' }) {
  const w = useWorld((x) => x);
  const pid = actorOf(w).personId;
  if (!pid) return null;
  if (part === 'grow') return verifiedGap(w, pid) ? <GapCard pid={pid} /> : null;
  const reqs = requestsFor(w, pid).filter((d) => d.state !== 'DECLINED');
  const asks = interestFor(w, pid).filter((i) => i.state === 'REQUESTED');
  if (!reqs.length && !asks.length) return null;
  return (
    <div className="evc-home" aria-label="From employers and Q">
      {reqs.map((d) => <RequestCard key={d.id} d={d} compact />)}
      {asks.map((i) => <InterestCard key={`${i.orgId}${i.mandateId}`} orgId={i.orgId} mandateId={i.mandateId} />)}
    </div>
  );
}
