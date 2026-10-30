// Question bank studio (SC-095, V14): the employer's own interview questions, uploaded (simulated), screened for
// fairness, versioned and locked. Locked questions are asked word for word; Q may only add a follow-up beside them.
// Who may edit is explicit and audited. The employer half of the avatar room (SC-102) lives here too: whether the
// simulated avatar option is offered, its cost (a hypothesis) and the device fallback.
import { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { PageIndex } from '../../ds/PageIndex';
import { ConfirmButton } from '../../ds/ConfirmButton';
import { SwitchRow } from '../../ds/Switch';
import { Link } from '../../ui/router';
import { assess } from '../../state/areas/assess';
import { reqLabel } from '../hire-b/model';
import { AVATAR_COST, SAMPLE_FILE, actorFirst, actorName, addQuestion, bankDiff, banksOf, canEdit, canManage, discardDraft, draftOf, fmtDay, lockBank, lockedOf, personName, removeQuestion, roleTitle, setAvatarEnabled, setEditor, uploadQuestions } from './model';
import { Refusal, Stamp, useMe, useRun } from './ui';

export function QuestionBank() {
  const me = useMe();
  const banks = useWorld((w) => banksOf(w, me.orgId));
  const w = useWorld((x) => x);
  const [msg, run, setMsg] = useRun();
  const [paste, setPaste] = useState('');
  const [reading, setReading] = useState<null | 'file' | 'broken'>(null);
  const [readErr, setReadErr] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const b = banks[0];
  if (!me.orgId || !b) return (
    <Canvas title="No question banks yet" kicker="Question bank" open onClose={() => history.back()}>
      <section className="ds-sheet as-empty"><Glyph k="none" /><div className="as-grid" style={{ gap: 6 }}><b>{me.orgId ? 'Your organisation hasn’t added interview questions yet.' : 'Question banks belong to an employer.'}</b><p className="t14 muted as-p">Ask Q to draft questions from a role’s brief, or upload your own.</p></div></section>
    </Canvas>
  );
  const locked = lockedOf(b); const draft = draftOf(b); const editable = canEdit(b, me); const manager = canManage(b, me);
  const shown = draft ?? locked!;
  const diff = draft ? bankDiff(locked, draft) : { added: [], removed: [] };
  const newIds = new Set(diff.added.map((q) => q.id));
  const members = w.actors.filter((a) => a.orgId === b.orgId && a.side === 'recruiter');
  const ivs = w.interviews.filter((i) => i.orgId === b.orgId && i.mandateId === b.mandateId && i.status !== 'CANCELLED');
  const avatarOn = !!assess(w).avatarSettings[b.orgId]?.enabled;
  const title = draft ? `Draft v${draft.v} is waiting to be locked` : `v${locked?.v} is locked: ${locked?.questions.length} questions`;
  const startRead = (kind: 'file' | 'broken') => {
    setReadErr(null); setReading(kind);
    window.setTimeout(() => {
      setReading(null);
      if (kind === 'broken') { setReadErr('Couldn’t read “questions.pages”. It isn’t a CSV or text file. Export it as CSV (one question per line) and upload it again.'); return; }
      run((x, a) => uploadQuestions(x, a, b.id));
    }, reduce ? 0 : 700);
  };
  return (
    <Canvas title={title} kicker={`Question bank · ${roleTitle(w, b.mandateId)}`} open onClose={() => history.back()}
      aside={<div className="ds-actions">{locked && <Stamp>Locked v{locked.v}</Stamp>}{draft && <Stamp k="draft">Draft v{draft.v}</Stamp>}</div>}>
      <PageIndex items={[{ id: 'qb-questions', label: 'Questions' }, { id: 'qb-upload', label: 'Upload' }, { id: 'qb-versions', label: 'Versions' }, { id: 'qb-who', label: 'Who can edit' }, { id: 'qb-use', label: 'Interviews' }, { id: 'qb-avatar', label: 'Avatar option' }]} />
      {!editable && (
        <div className="ds-banner" role="status"><Glyph k="none" /><span><b>You can read and use these questions, not change them.</b> Only {b.editors.map((e) => actorName(w, e)).join(' and ')} can edit drafts or lock a version.{manager ? '' : ` Ask ${actorFirst(w, b.owner)} if you need to.`}</span><span /></div>
      )}
      <section id="qb-questions" className="ds-sheet as-grid" aria-labelledby="qb-q-h">
        <div className="as-row">
          <h2 id="qb-q-h" className="as-h2">{draft ? `Draft v${draft.v}: ${draft.questions.length} questions` : `Locked v${locked?.v}: asked word for word`}</h2>
          <span className="t14 muted">{draft ? `${diff.added.length} new, ${diff.removed.length} removed since v${locked?.v}` : `Locked by ${actorName(w, locked!.lockedBy ?? locked!.by)} on ${fmtDay(locked!.lockedAt ?? locked!.at)}`}</span>
        </div>
        <p className="t14 muted as-p">{draft ? 'Nothing in a draft is used in interviews until it’s locked. Interviews already planned keep the version they were planned with.' : 'Q never rewords a locked question. In the live room it may suggest a follow-up beside it, labelled as Q’s.'}</p>
        <ol className="as-list">
          {shown.questions.map((q) => (
            <li key={q.id} className="as-li" data-new={newIds.has(q.id) ? '1' : undefined}>
              <div className="as-row"><span className="as-tags">{q.reqId && <span className="ds-tag">{reqLabel(w, q.reqId)}</span>}{q.tags.filter((t) => !/^(payments|go|postgres|on-call|mentoring)$/.test(t)).map((t) => <span key={t} className="ds-tag">{t}</span>)}{newIds.has(q.id) && <span className="ds-tag as-newtag">New in v{draft!.v}</span>}</span>
                {draft && editable && <button type="button" className="ds-btn quiet" onClick={() => run((x, a) => removeQuestion(x, a, b.id, q.id))} aria-label={`Remove from draft: ${q.text}`}>Remove</button>}</div>
              <p className="as-q">{q.text}</p>
              {q.followUp && <p className="t14 muted as-p">Agreed follow-up: {q.followUp}</p>}
            </li>
          ))}
          {diff.removed.map((q) => <li key={q.id} className="as-li" data-gone="1"><span className="t14">Removed from v{draft!.v}: {q.text}</span></li>)}
        </ol>
        {draft && editable && (
          <div className="as-actions">
            <ConfirmButton className="ds-btn primary" label={`Lock v${draft.v}`} question={`Lock v${draft.v}? From now on, new interview plans ask these ${draft.questions.length} questions word for word.`} yes={`Lock v${draft.v}`} onConfirm={() => run((x, a) => lockBank(x, a, b.id))} />
            <ConfirmButton label="Discard the draft" question={`Discard draft v${draft.v}? v${locked?.v} stays locked.`} yes="Discard" onConfirm={() => run((x, a) => discardDraft(x, a, b.id))} />
          </div>
        )}
        <Refusal msg={msg} />
        {editable && (
          <form className="as-grid" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); const t = paste.trim(); if (!t) { setMsg('Type a question first.'); return; } if (t.includes('\n') || t.includes('|')) run((x, a) => uploadQuestions(x, a, b.id, t, 'pasted text')); else run((x, a) => addQuestion(x, a, b.id, t)); setPaste(''); }}>
            <div className="ds-field"><label htmlFor="qb-add">Add a question to the draft</label>
              <textarea id="qb-add" className="ds-input" rows={2} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="One question per line. Tags after a bar: How do you … | postgres, must-have" /></div>
            <div className="as-actions"><button type="submit" className="ds-btn">Add to draft</button><span className="t14 muted">Each one is checked for fairness and leading wording before it goes in.</span></div>
          </form>
        )}
      </section>

      <section id="qb-upload" className="ds-sheet as-grid" aria-labelledby="qb-u-h">
        <h2 id="qb-u-h" className="as-h2">Upload approved questions</h2>
        <p className="t14 muted as-p">A CSV or text file, one question per line, tags after a bar. Uploading adds to a draft; nothing is used until someone with edit rights locks it. <span className="ds-sim">Simulated: no file is read from your device</span></p>
        {editable ? (
          <div className="as-actions">
            <button type="button" className="ds-btn" disabled={!!reading} onClick={() => startRead('file')}>Upload {SAMPLE_FILE.name}</button>
            <button type="button" className="ds-btn quiet" disabled={!!reading} onClick={() => startRead('broken')}>Try a file that isn’t CSV</button>
          </div>
        ) : <p className="as-note"><Glyph k="none" size={16} /><span>Uploading needs edit rights.</span></p>}
        {reading && <div role="status" aria-live="polite" className="as-grid" style={{ gap: 6 }}><span className="t14">Reading {reading === 'file' ? SAMPLE_FILE.name : 'questions.pages'}…</span><span className="ds-skeleton" style={{ height: 14, width: '60%' }} /><span className="ds-skeleton" style={{ height: 14, width: '40%' }} /></div>}
        {readErr && <p className="as-note" data-k="risk" role="alert"><Glyph k="unclear" size={16} /><span>{readErr}</span></p>}
        {b.upload && !reading && (
          <div className="as-grid" role="status">
            <p className="as-p"><b>{b.upload.file}</b>, uploaded by {actorFirst(w, b.upload.by)}: {b.upload.accepted.length} added, {b.upload.rejected.length} not added.</p>
            {b.upload.rejected.length > 0 && (
              <ul className="as-list" aria-label="Not added, and why">
                {b.upload.rejected.map((r) => <li key={r.line} className="as-li"><span className="t14"><b>Not added:</b> “{r.line}”</span><span className="t14">{r.why}{r.instead ? ` Instead: ${r.instead}` : ''}</span></li>)}
              </ul>
            )}
          </div>
        )}
      </section>

      <section id="qb-versions" className="ds-sheet as-grid" aria-labelledby="qb-v-h">
        <h2 id="qb-v-h" className="as-h2">Versions</h2>
        <ol className="as-list" reversed>
          {[...b.versions].reverse().map((v) => (
            <li key={v.v} className="as-li">
              <div className="as-row"><span><b>v{v.v}</b> · {v.questions.length} questions</span><Stamp k={v.state === 'LOCKED' ? 'locked' : v.state === 'DRAFT' ? 'draft' : 'old'}>{v.state === 'LOCKED' ? 'Locked, in use' : v.state === 'DRAFT' ? 'Draft' : 'Kept for the record'}</Stamp></div>
              <span className="t14 muted">{v.state === 'DRAFT' ? `Started by ${actorName(w, v.by)} on ${fmtDay(v.at)}` : `Locked by ${actorName(w, v.lockedBy ?? v.by)} on ${fmtDay(v.lockedAt ?? v.at)}${v.note ? ` · ${v.note}` : ''}`}</span>
            </li>
          ))}
        </ol>
        <details><summary className="t14">Change log ({b.log.length})</summary><ul className="as-list" style={{ marginTop: 8 }}>{b.log.map((l, i) => <li key={i} className="t14">{fmtDay(l.at)} · {actorName(w, l.by)}: {l.text}</li>)}</ul></details>
      </section>

      <section id="qb-who" className="ds-sheet as-grid" aria-labelledby="qb-w-h">
        <h2 id="qb-w-h" className="as-h2">Who can edit</h2>
        <p className="t14 muted as-p">Everyone at {w.orgs.find((o) => o.id === b.orgId)?.name} can read and use the locked version. {actorName(w, b.owner)} owns it{manager && b.owner !== me.id ? '; as an admin you can change this too' : ''}.</p>
        {members.map((m) => manager && m.id !== b.owner
          ? <SwitchRow key={m.id} label={`${m.name} · ${m.title}`} help={b.editors.includes(m.id) ? 'Can edit drafts and lock versions' : 'Can read and use the locked version'} on={b.editors.includes(m.id)} onChange={(on) => run((x, a) => setEditor(x, a, b.id, m.id, on))} />
          : <p key={m.id} className="as-row as-p"><span><b>{m.name}</b> · {m.title}</span><span className="t14 muted">{m.id === b.owner ? 'Owner · can edit' : b.editors.includes(m.id) ? 'Can edit' : 'Can read'}</span></p>)}
      </section>

      <section id="qb-use" className="ds-sheet as-grid" aria-labelledby="qb-i-h">
        <h2 id="qb-i-h" className="as-h2">Interviews using these questions</h2>
        {ivs.length === 0 ? <p className="t14 muted as-p">No interviews for this role yet.</p> : (
          <ul className="as-list">{ivs.map((i) => { const plan = assess(w).plans[i.id]; return (
            <li key={i.id} className="as-li"><div className="as-row"><b>{personName(w, i.personId)}</b><span className="t14 muted">{plan ? `Planned from v${plan.v || '–'}` : 'No plan yet'}</span></div>
              <div className="as-actions"><Link className="ds-btn" to={`/r/interviews/${i.id}/live`}>{assess(w).rooms[i.id]?.state === 'ENDED' ? 'See the room record' : plan ? 'Open the live room' : 'Plan and open the room'}</Link><Link className="ds-btn quiet" to={`/r/interviews/${i.id}`}>Interview page</Link></div></li>); })}</ul>
        )}
      </section>

      <section id="qb-avatar" className="ds-sheet as-grid" aria-labelledby="qb-a-h">
        <h2 id="qb-a-h" className="as-h2">Avatar interview option</h2>
        <SwitchRow label="Offer a simulated avatar for the first round" help="A video presenter reads your locked questions. Candidates can always choose text, voice or a person instead." on={avatarOn} onChange={(on) => run((x, a) => setAvatarEnabled(x, a, on))} />
        <dl className="as-kv">
          <dt>Provider</dt><dd>Tavus-class conversational video <span className="ds-sim">Not connected: simulated</span></dd>
          <dt>Cost</dt><dd>About ${AVATAR_COST.perMinute.toFixed(2)} a minute, so roughly ${(AVATAR_COST.perMinute * AVATAR_COST.minutes).toFixed(0)} for a {AVATAR_COST.minutes}-minute round. <b>Hypothesis, not a quote:</b> {AVATAR_COST.source}</dd>
          <dt>Device fallback</dt><dd>On a slow connection the avatar becomes a still image with captions; on any device the candidate can switch to text at any time. No camera is used: we never record or judge the candidate’s face.</dd>
          <dt>What it never does</dt><dd>Score, or read emotion, accent, face or personality. A person at your organisation reads the answers.</dd>
        </dl>
      </section>
    </Canvas>
  );
}
