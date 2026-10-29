// Candidate side of video and voice evidence, inside the Evidence Passport (Proof view). One card per recording,
// walking the state machine in logic.ts: consent → source → upload / link → transcribe → self-review (transcript,
// parts per organisation, "what Kora will see") → shared → stop sharing / delete. Nothing is processed before
// consent; a text, form or adjustment alternative is offered at every step that asks for a recording (AD-F-07).
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { MediaEvidence } from '../../state/domain';
import { actorOf, useWorld, type World } from '../../mock/world';
import { runAction } from '../../q/core/engine';
import { useRoute } from '../../ui/router';
import { arrive } from '../../ds/motion';
import { SwitchRow } from '../../ds/Switch';
import { visibleSegments } from '../../state/areas/media';
import { KEY_MOMENTS, SAMPLE, SEGMENTS, type Topic } from '../../state/seeds/media';
import { KEEPS, NO_INFERENCE, consentOrgs, disputesOf, fmt, fmtDate, itemsOf, list, ms, orgName, reportView, roleFor, roleTitle, span, criteriaFor } from './logic';
import { Player, usePlayback } from './Player';
import './media.css';

const act = (op: string, args: Record<string, unknown> = {}) => runAction({ label: op, act: { t: 'do', op, args } });
const TOPIC_LABEL: Record<Topic, string> = { payments: 'Payments', go: 'Go', postgres: 'Postgres', incidents: 'Incidents and on-call', mentoring: 'Mentoring', communication: 'Explaining decisions', design: 'Design trade-offs' };
/** Job relevance of each part: the topics whose key moments fall inside it (AD-F-04). */
const relevance = (segId: string) => {
  const s = SEGMENTS.find((x) => x.id === segId); if (!s) return [];
  return (Object.keys(KEY_MOMENTS) as Topic[]).filter((k) => !['communication', 'design'].includes(k) && KEY_MOMENTS[k].moments.some((m) => m.t >= s.t && m.t < s.tEnd)).map((k) => TOPIC_LABEL[k]);
};

export function MediaSection({ pid }: { pid: string }) {
  const items = useWorld((w) => itemsOf(w, pid));
  const { query } = useRoute();
  const ref = useRef<HTMLElement>(null);
  const focus = query.get('media');
  useEffect(() => { if (focus) ref.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [focus]);
  // One recording at a time: the add button hides while one is still being set up, so there's never a second draft.
  const adding = items.some((m) => !['READY', 'REVOKED'].includes(m.state));
  return (
    <section ref={ref} id="passport-media" className="ds-sheet tb-stack mv" aria-labelledby="mv-h">
      <div className="tb-row-between">
        <h2 id="mv-h" className="tb-h2">Video and voice</h2>
        {!adding && <button type="button" className="ds-btn" onClick={() => act('media.start')}>Add a video or voice recording</button>}
      </div>
      {!items.length && <p className="t14 muted" style={{ margin: 0 }}>Walk an employer through your own work, in your own words. You choose who sees which parts, for how long, and you can stop at any time. Or tell Q: “add a video”.</p>}
      <AnimatePresence initial={false}>{items.map((m) => <motion.div key={m.id} {...arrive} layout="position"><Item m={m} pid={pid} /></motion.div>)}</AnimatePresence>
    </section>
  );
}

function Item({ m, pid }: { m: MediaEvidence; pid: string }) {
  if (m.state === 'CONSENT' && !m.consent) return <Consent m={m} pid={pid} />;
  if (m.state === 'CONSENT' || m.state === 'UNSAFE_LINK' || m.state === 'FETCH_FAILED') return <Source m={m} pid={pid} />;
  if (['UPLOADING', 'PAUSED', 'FETCHING', 'TRANSCRIBING'].includes(m.state)) return <Ingest m={m} />;
  if (m.state === 'REVIEW') return <SelfReview m={m} />;
  if (m.state === 'READY') return <Ready m={m} />;
  return <Revoked m={m} />;
}

/** Where the person is in the four steps (goal-gradient): done steps ticked, the current one bold. */
function Steps({ at }: { at: number }) {
  const names = ['Consent', 'Recording', 'Check', 'Share'];
  return <ol className="mv-steps lab" aria-label={`Step ${at} of 4`}>{names.map((n, i) => <li key={n} aria-current={i + 1 === at || (at === 3 && i === 3) ? 'step' : undefined}>{i + 1} {n}{i + 1 < at ? ' ✓' : ''}</li>)}</ol>;
}

// ---------------- 1 · Consent before any processing ----------------
function Consent({ m, pid }: { m: MediaEvidence; pid: string }) {
  const w = useWorld((x) => x);
  const orgs = consentOrgs(w, pid);
  const asked = w.threads.some((t) => t.personId === pid && t.orgId === 'org_kora' && t.messages.some((x) => /video|walkthrough|recording/i.test(x.body)));
  const [who, setWho] = useState<string[]>(['org_kora']);
  const [practice, setPractice] = useState(false);
  const [days, setDays] = useState(90);
  const role = roleTitle(w, roleFor(w, pid, 'org_kora'));
  const purposes = [`Kora Pay: ${role}${asked ? ' (they asked for a walkthrough)' : ''}`, 'Showing my work to the employers I choose'];
  const [purpose, setPurpose] = useState(purposes[0]);
  const until = fmtDate(new Date(new Date(w.session.now).getTime() + days * 864e5).toISOString());
  const toggle = (o: string) => { setPractice(false); setWho(who.includes(o) ? who.filter((x) => x !== o) : [...who, o]); };
  const ok = practice || who.length > 0;
  return (
    <div className="mv-panel tb-stack" aria-labelledby="mv-consent-h">
      <Steps at={1} />
      <h3 id="mv-consent-h" className="tb-title">Before Q looks at anything</h3>
      <p className="t14" style={{ margin: 0 }}>Nothing is uploaded, fetched or transcribed until you agree. You can change this later.</p>
      <fieldset className="mv-field"><legend className="lab">Who can see it</legend>
        <div className="mv-opts">
          {orgs.map((o) => <button key={o} type="button" className="ds-opt" aria-pressed={!practice && who.includes(o)} onClick={() => toggle(o)}><span className="mv-check" aria-hidden="true">{!practice && who.includes(o) ? '✓' : ''}</span><span><b>{orgName(w, o)}</b>{o === 'org_kora' && <span className="t14 muted" style={{ display: 'block' }}>{role}</span>}</span></button>)}
          <button type="button" className="ds-opt" aria-pressed={practice} onClick={() => { setPractice(!practice); }}><span className="mv-check" aria-hidden="true">{practice ? '✓' : ''}</span><span><b>Only me, for practice</b><span className="t14 muted" style={{ display: 'block' }}>No organisation sees it.</span></span></button>
        </div>
        <p className="t14 muted" style={{ margin: 0 }}>Public preview on your profile isn’t available yet. You’ll pick which parts each organisation sees after you’ve checked the transcript.</p>
      </fieldset>
      {!practice && <fieldset className="mv-field"><legend className="lab">What it’s for</legend>
        <div className="mv-opts">{purposes.map((p) => <button key={p} type="button" className="ds-opt" aria-pressed={purpose === p} onClick={() => setPurpose(p)}><span className="mv-check" data-radio aria-hidden="true">{purpose === p ? '●' : ''}</span><span>{p}</span></button>)}</div>
      </fieldset>}
      <fieldset className="mv-field"><legend className="lab">How long</legend>
        <div className="mv-seg3" role="group" aria-label="How long they can see it">{[30, 90, 180].map((d) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{d} days{d === 90 ? ' (usual)' : ''}</button>)}</div>
        <p className="t14 muted" style={{ margin: 0 }}>Until {until}. After that, access ends by itself.</p>
      </fieldset>
      <div className="mv-will">
        <div><h4 className="lab">What Q will do</h4><ul className="t14" data-k="will">
          <li>Transcribe what you say, once, and show it to you to correct</li>
          <li>Find the moments that show your work, with their times</li>
          <li>Match them to what the role asks for, so a person can check each one</li>
          <li>Show you exactly what {practice ? 'it would look like' : who.length ? list(who.map((o) => orgName(w, o))) : 'they'} {practice ? '' : 'will '}see before anything is shared</li>
        </ul></div>
        <div><h4 className="lab">What Q won’t do</h4><ul className="t14" data-k="wont">
          <li>Judge your face, voice, accent or appearance</li>
          <li>Guess how confident, honest or likeable you are, or your personality</li>
          <li>Guess your age, gender, race or any disability</li>
          <li>Open anything you didn’t choose, or sign in as you</li>
          <li>Share a part you didn’t pick</li>
        </ul></div>
      </div>
      <Alternatives orgs={practice ? [] : who} />
      <div className="tb-actions">
        <button type="button" className="ds-btn primary" disabled={!ok} onClick={() => act('media.consent', { id: m.id, orgs: practice ? [] : who, purpose: practice ? 'Private practice' : purpose, days, practice })}>Agree and choose the recording</button>
        <button type="button" className="ds-btn quiet" onClick={() => act('media.cancel', { id: m.id })}>Cancel</button>
      </div>
    </div>
  );
}

function Alternatives({ orgs }: { orgs: string[] }) {
  if (!orgs.length) return null;
  return (
    <div className="mv-alt t14" role="group" aria-label="Alternatives to recording">
      <p style={{ margin: 0 }}><b>Prefer not to record?</b> A written walkthrough counts the same.</p>
      <div className="tb-actions">
        <button type="button" className="ds-btn" onClick={() => act('media.alternative', { kind: 'TEXT', orgs })}>Write it instead</button>
        <button type="button" className="ds-btn" onClick={() => act('media.alternative', { kind: 'FORM', orgs })}>Ask for a short form</button>
        <button type="button" className="ds-btn" onClick={() => act('media.alternative', { kind: 'ADJUSTMENT', orgs })}>Ask for an adjustment</button>
      </div>
      <p className="muted" style={{ margin: 0 }}>You don’t need to give a reason. Q tells them only what you choose here.</p>
    </div>
  );
}

// ---------------- 2 · Choose the recording ----------------
function Source({ m, pid }: { m: MediaEvidence; pid: string }) {
  const w = useWorld((x) => x);
  const note = ms(w).notes?.[m.id];
  const offered = (ms(w).interviewOffered?.[pid] ?? []).filter((o) => m.consent?.orgs.includes(o));
  const [mode, setMode] = useState<'LINK' | 'PORTFOLIO' | null>(m.state === 'UNSAFE_LINK' || m.state === 'FETCH_FAILED' ? null : null);
  const [link, setLink] = useState('');
  const drop = ms(w).dropAt != null;
  return (
    <div className="mv-panel tb-stack" aria-labelledby="mv-src-h">
      <Steps at={2} />
      <h3 id="mv-src-h" className="tb-title">Choose the recording</h3>
      <p className="t14 muted" style={{ margin: 0 }}>{m.consent?.orgs.length ? `For ${list(m.consent.orgs.map((o) => orgName(w, o)))}, until ${fmtDate(m.consent.expires!)}.` : 'Private practice: only you.'}</p>
      {note && (m.state === 'UNSAFE_LINK' || m.state === 'FETCH_FAILED') && (
        <div className="ds-banner" data-k={m.state === 'UNSAFE_LINK' ? 'warn' : 'risk'} role="alert">
          <span aria-hidden="true">{m.state === 'UNSAFE_LINK' ? '⚠' : '✕'}</span>
          <span><b>{m.state === 'UNSAFE_LINK' ? 'I didn’t open that link.' : 'I couldn’t get the video.'}</b> {note.text}{m.link && <span className="mv-link num"> {m.link}</span>}</span><button type="button" className="ds-btn" onClick={() => act('media.source', { id: m.id, source: 'UPLOAD' })}>Upload the file instead</button>
        </div>
      )}
      <div className="mv-opts mv-src">
        <button type="button" className="ds-opt" onClick={() => act('media.source', { id: m.id, source: 'UPLOAD' })}><span><b>Upload a file</b><span className="t14 muted" style={{ display: 'block' }}>{SAMPLE.file} · {SAMPLE.sizeMb} MB · {fmt(SAMPLE.duration)} <span className="ds-sim">Simulated upload</span></span></span></button>
        <button type="button" className="ds-opt" aria-pressed={mode === 'LINK'} onClick={() => setMode(mode === 'LINK' ? null : 'LINK')}><span><b>Paste a link you’re allowed to share</b><span className="t14 muted" style={{ display: 'block' }}>One video, not a whole channel or profile.</span></span></button>
        <button type="button" className="ds-opt" aria-pressed={mode === 'PORTFOLIO'} onClick={() => setMode(mode === 'PORTFOLIO' ? null : 'PORTFOLIO')}><span><b>Link a demo from your portfolio</b><span className="t14 muted" style={{ display: 'block' }}>A page on your own site with the video on it.</span></span></button>
        {offered.length ? <button type="button" className="ds-opt" onClick={() => act('media.source', { id: m.id, source: 'INTERVIEW_RECORDING' })}><span><b>Use your {orgName(w, offered[0])} interview recording</b><span className="t14 muted" style={{ display: 'block' }}>They offered it; a person reviews anything Q finds.</span></span></button>
          : <p className="t14 muted mv-note">An interview recording is only possible when an employer offers one. None has.</p>}
      </div>
      {mode && (
        <form className="tb-linkform" onSubmit={(e) => { e.preventDefault(); if (link.trim()) { void act('media.source', { id: m.id, source: mode, link: link.trim() }); setLink(''); setMode(null); } }}>
          <div className="ds-field" style={{ flex: 1, minWidth: 0 }}><label htmlFor="mv-link">{mode === 'LINK' ? 'Link to the video' : 'Link to the demo page'}</label><input id="mv-link" className="ds-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder={mode === 'LINK' ? 'https://vimeo.com/…' : 'https://yourname.dev/demo'} inputMode="url" autoFocus /></div>
          <button type="submit" className="ds-btn primary">Check the link</button>
        </form>
      )}
      <p className="t14 muted" style={{ margin: 0 }}>Q checks a link before opening it and never opens shortened links. <span className="ds-sim">Simulated link check</span></p>
      <details className="t14 tb-demo"><summary className="muted">Demo settings</summary><SwitchRow label="Drop the connection at 40%" help="Try a paused upload that carries on from the same part." on={drop} onChange={(v) => act('media.dropAt', { on: v })} /></details>
      <Alternatives orgs={m.consent?.orgs ?? []} />
      <div className="tb-actions"><button type="button" className="ds-btn quiet" onClick={() => act('media.cancel', { id: m.id })}>Cancel</button></div>
    </div>
  );
}

// ---------------- 3 · Uploading, paused, fetching, transcribing ----------------
function Ingest({ m }: { m: MediaEvidence }) {
  const w = useWorld((x) => x);
  const note = ms(w).notes?.[m.id];
  const p = m.progress ?? { done: 0, total: 1 };
  const pct = Math.round((100 * p.done) / p.total);
  const label = m.state === 'UPLOADING' ? `Uploading · part ${Math.min(p.done + 1, p.total)} of ${p.total}` : m.state === 'PAUSED' ? `Paused · ${p.done} of ${p.total} parts sent` : m.state === 'FETCHING' ? 'Fetching the video from your link' : 'Transcribing';
  return (
    <div className="mv-panel tb-stack" aria-labelledby="mv-ing-h" data-state={m.state}>
      <Steps at={2} />
      <div className="tb-row-between"><h3 id="mv-ing-h" className="tb-title">{m.title}</h3><span className="ds-sim">{m.state === 'TRANSCRIBING' ? 'Simulated transcription' : m.state === 'FETCHING' ? 'Simulated fetch' : 'Simulated upload'}</span></div>
      <div className="tb-row-between"><b className="t14" aria-live="polite">{label}</b><span className="t14 muted num">{m.state === 'TRANSCRIBING' ? 'A few seconds' : `${pct}%`}</span></div>
      <div className="mv-bar" data-state={m.state} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={m.state === 'TRANSCRIBING' ? undefined : pct}>
        {m.state === 'TRANSCRIBING' ? <i className="mv-indet" /> : Array.from({ length: p.total }, (_, k) => <i key={k} data-done={k < p.done || undefined} />)}
      </div>
      {m.state === 'PAUSED' && <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">⏸</span><span><b>The connection dropped. Nothing is lost.</b> {w.network === 'offline' ? `It carries on from part ${p.done + 1} by itself when you’re back online.` : `You’re back online: carry on from part ${p.done + 1}.`}</span>{w.network === 'offline' ? <span /> : <button type="button" className="ds-btn" onClick={() => act('media.resume', { id: m.id })}>Resume from {pct}%</button>}</div>}
      {m.state === 'UPLOADING' && note?.kind === 'PAUSED' && /Back online/.test(note.text) && <p className="t14" role="status" style={{ margin: 0 }}>{note.text}</p>}
      {m.state === 'TRANSCRIBING' && <p className="t14 muted" style={{ margin: 0 }}>Only you will see the transcript until you choose what to share. I’ll tell you when it’s ready to check.</p>}
    </div>
  );
}

// ---------------- 4 · Self-review: transcript, parts, preview, share ----------------
function SelfReview({ m }: { m: MediaEvidence }) {
  const w = useWorld((x) => x);
  const orgs = m.consent?.orgs ?? [];
  const [as, setAs] = useState(orgs[0] ?? '');
  const anyShared = m.segments.some((s) => s.sharedWith.length);
  return (
    <div className="mv-panel tb-stack" aria-labelledby="mv-rev-h">
      <Steps at={3} />
      <div className="tb-row-between"><h3 id="mv-rev-h" className="tb-title">Check it before anyone sees it</h3><span className="ds-tag" data-k="busy">Only you can see this</span></div>
      <Transcript m={m} />
      {orgs.length > 0 && <Parts m={m} />}
      {orgs.length > 0 && <Preview m={m} as={as} setAs={setAs} orgs={orgs} />}
      <div className="tb-actions mv-sticky">
        {orgs.length ? <button type="button" className="ds-btn primary" disabled={!anyShared} onClick={() => act('media.share', { id: m.id })}>{anyShared ? `Share with ${list(orgs.filter((o) => m.segments.some((s) => s.sharedWith.includes(o))).map((o) => orgName(w, o)))}` : 'Choose a part to share'}</button>
          : <button type="button" className="ds-btn primary" onClick={() => act('media.share', { id: m.id })}>Keep as private practice</button>}
        <button type="button" className="ds-btn quiet" onClick={() => act('media.delete', { id: m.id })}>Delete it</button>
      </div>
    </div>
  );
}

function Transcript({ m, readOnly }: { m: MediaEvidence; readOnly?: boolean }) {
  const w = useWorld((x) => x);
  const cached = ms(w).transcripts?.[m.contentHash];
  const [edit, setEdit] = useState<number | null>(null);
  const [text, setText] = useState('');
  const edited = m.transcript.filter((l) => l.edited).length;
  return (
    <section className="mv-sub" aria-labelledby={`mv-tr-${m.id}`}>
      <div className="tb-row-between"><h4 id={`mv-tr-${m.id}`} className="mv-h4">Transcript</h4><span className="t14 muted">{m.transcript.length} lines{edited ? ` · ${edited} corrected by you` : ''}</span></div>
      <p className="t14 muted" style={{ margin: 0 }}>Fix anything Q heard wrong. Or tell Q: “fix the transcript at 1:40 to …”.</p>
      <div className="mv-transcript">
        {m.segments.map((s) => (
          <div key={s.id} className="mv-tgroup">
            <p className="lab mv-tgroup-h">{s.label} · <span className="num">{span(s.t, s.tEnd)}</span></p>
            <ol>
              {m.transcript.map((l, i) => ({ l, i })).filter(({ l }) => l.t >= s.t && l.t < s.tEnd).map(({ l, i }) => (
                <li key={i} data-edited={l.edited || undefined}>
                  <span className="num mv-t">{fmt(l.t)}</span>
                  {edit === i ? (
                    <form className="mv-edit" onSubmit={(e) => { e.preventDefault(); void act('media.edit', { id: m.id, idx: i, text }); setEdit(null); }}>
                      <label className="sr" htmlFor={`mv-e-${i}`}>Correct the line at {fmt(l.t)}</label>
                      <textarea id={`mv-e-${i}`} className="ds-input" rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
                      <div className="tb-actions"><button type="submit" className="ds-btn primary">Save correction</button><button type="button" className="ds-btn quiet" onClick={() => setEdit(null)}>Cancel</button></div>
                    </form>
                  ) : (
                    <span className="mv-line">{l.text}{l.edited && <span className="ds-tag mv-edtag">Corrected</span>}</span>
                  )}
                  {!readOnly && edit !== i && <button type="button" className="tb-linkbtn mv-fix" onClick={() => { setEdit(i); setText(l.text); }} aria-label={`Correct the line at ${fmt(l.t)}`}>Correct</button>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <details className="t14 tb-details"><summary>How this transcript was made</summary>
        <p style={{ margin: '4px 0 8px' }}>Transcribed once {cached ? `on ${fmtDate(cached.at)} ` : ''}(simulated) and stored against the file’s fingerprint, {m.contentHash}. If you add the same file again, Q reuses this transcript instead of transcribing it twice. Your corrections are kept with it.</p>
      </details>
    </section>
  );
}

function Parts({ m }: { m: MediaEvidence }) {
  const w = useWorld((x) => x);
  const orgs = m.consent?.orgs ?? [];
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <section className="mv-sub" aria-labelledby={`mv-parts-${m.id}`}>
      <h4 id={`mv-parts-${m.id}`} className="mv-h4">Choose what each organisation sees</h4>
      <p className="t14 muted" style={{ margin: 0 }}>Each part is shared on its own. A part you don’t pick is never shown, transcribed for them or used in their report. Or tell Q: “share only the payments and postgres parts with kora”.</p>
      <ul className="mv-parts">
        {m.segments.map((s) => {
          const conf = SEGMENTS.find((x) => x.id === s.id)?.confidential;
          const rel = relevance(s.id);
          return (
            <li key={s.id} data-conf={conf || undefined}>
              <div className="mv-part-h"><b>{conf && <span aria-label="Confidential">🔒 </span>}{s.label}</b><span className="t14 muted num">{span(s.t, s.tEnd)} · {fmt(s.tEnd - s.t)}</span></div>
              {rel.length > 0 && <p className="t14" style={{ margin: 0 }}><span className="muted">Relevant to the role:</span> {rel.join(', ')}</p>}
              {conf && <p className="t14 mv-warn" style={{ margin: 0 }}>Shows a client’s real numbers. Share it only if that client allows it.</p>}
              <div className="mv-orgs">
                {orgs.map((o) => {
                  const on = s.sharedWith.includes(o);
                  const k = `${s.id}:${o}`;
                  if (conf && !on && confirm === k) return <span key={o} className="mv-confirm"><span className="t14">Share this confidential part with {orgName(w, o)}?</span><button type="button" className="ds-btn danger" onClick={() => { void act('media.part', { id: m.id, seg: s.id, org: o, on: true }); setConfirm(null); }}>Share anyway</button><button type="button" className="ds-btn quiet" onClick={() => setConfirm(null)}>Keep it private</button></span>;
                  return <button key={o} type="button" className="mv-toggle" aria-pressed={on} aria-label={`${on ? 'Stop sharing' : 'Share'} “${s.label}” with ${orgName(w, o)}`} onClick={() => (conf && !on ? setConfirm(k) : act('media.part', { id: m.id, seg: s.id, org: o, on: !on }))}><span aria-hidden="true">{on ? '✓' : '+'}</span>{orgName(w, o)} · {on ? 'Shared' : 'Not shared'}</button>;
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "What Kora will see": the same filter the recruiter page applies (parts shared with that organisation only). */
function Preview({ m, as, setAs, orgs }: { m: MediaEvidence; as: string; setAs: (v: string) => void; orgs: string[] }) {
  const w = useWorld((x) => x);
  const ready = m.state === 'READY';
  const allowed = ready ? visibleSegments(w, m.id, as) : m.segments.filter((s) => s.sharedWith.includes(as));
  const vm = useMemo(() => ({ ...m, transcript: m.transcript.filter((l) => allowed.some((s) => l.t >= s.t && l.t < s.tEnd)) }), [m, allowed]);
  const pb = usePlayback(m.duration, allowed);
  const secs = allowed.reduce((a, s) => a + s.tEnd - s.t, 0);
  return (
    <section className="mv-sub" aria-labelledby={`mv-pv-${m.id}`} id={`mv-preview-${m.id}`}>
      <div className="tb-row-between"><h4 id={`mv-pv-${m.id}`} className="mv-h4">What {orgName(w, as)} {ready ? 'sees' : 'will see'}</h4>
        {orgs.length > 1 && <div className="tb-filters" role="group" aria-label="Preview as">{orgs.map((o) => <button key={o} type="button" className="ds-filter" aria-pressed={as === o} onClick={() => setAs(o)}>{orgName(w, o)}</button>)}</div>}
      </div>
      {allowed.length ? (
        <>
          <p className="t14" style={{ margin: 0 }}><b className="num">{allowed.length} of {m.segments.length}</b> parts, <span className="num">{fmt(secs)}</span> of {fmt(m.duration)}: {allowed.map((s) => s.label.replace(' (confidential)', '')).join(' and ')}. Their transcript, and Q’s findings matched to the role. {ready ? `Until ${fmtDate(m.consent!.expires!)}.` : 'Nothing is shared until you press Share.'}</p>
          <div className="mv-cand-player"><Player m={vm} allowed={allowed} pb={pb} viewer={orgName(w, as)} /></div>
          <p className="t14 muted" style={{ margin: 0 }}>{NO_INFERENCE}: {orgName(w, as)}’s report only uses what you said and showed.</p>
        </>
      ) : <p className="t14" style={{ margin: 0 }}>Nothing yet. {orgName(w, as)} won’t see this video at all.</p>}
    </section>
  );
}

// ---------------- 5 · Shared ----------------
function Ready({ m }: { m: MediaEvidence }) {
  const w = useWorld((x) => x);
  const me = actorOf(w);
  const orgs = m.consent?.orgs ?? [];
  const [as, setAs] = useState(orgs[0] ?? '');
  const [change, setChange] = useState(false);
  const [confirm, setConfirm] = useState<'revoke' | 'delete' | null>(null);
  const shared = orgs.filter((o) => visibleSegments(w, m.id, o).length);
  return (
    <div className="mv-panel tb-stack" aria-labelledby="mv-rdy-h">
      <div className="tb-row-between"><h3 id="mv-rdy-h" className="tb-title">{m.title}</h3><span className="ds-tag" data-k={shared.length ? 'ok' : undefined}>{shared.length ? `Shared with ${list(shared.map((o) => orgName(w, o)))}` : 'Only you'}</span></div>
      {shared.length > 0 && <ul className="mv-sharedlist t14">{shared.map((o) => <li key={o}><b>{orgName(w, o)}</b> sees {visibleSegments(w, m.id, o).map((s) => `${s.label.replace(' (confidential)', '')} (${span(s.t, s.tEnd)})`).join(' and ')}, until {fmtDate(m.consent!.expires!)}.</li>)}</ul>}
      {m.segments.some((s) => !s.sharedWith.length) && <p className="t14 muted" style={{ margin: 0 }}>Not shared with anyone: {m.segments.filter((s) => !s.sharedWith.length).map((s) => s.label).join(', ')}.</p>}
      <div className="tb-actions">
        {orgs.length > 0 && <button type="button" className="ds-btn" aria-expanded={change} onClick={() => setChange(!change)}>{change ? 'Done changing' : 'Change what they see'}</button>}
        <button type="button" className="ds-btn" onClick={() => setConfirm('revoke')} disabled={!shared.length}>Stop sharing</button>
        <button type="button" className="ds-btn danger" onClick={() => setConfirm('delete')}>Delete</button>
      </div>
      {confirm && <Confirm m={m} kind={confirm} orgs={shared} onClose={() => setConfirm(null)} />}
      {change && <Parts m={m} />}
      {orgs.length > 0 && <Preview m={m} as={as} setAs={setAs} orgs={orgs} />}
      {shared.map((o) => <TheirReport key={o} m={m} org={o} me={me.id} />)}
      <details className="t14 tb-details"><summary>Your transcript</summary><Transcript m={m} /></details>
    </div>
  );
}

function Confirm({ m, kind, orgs, onClose }: { m: MediaEvidence; kind: 'revoke' | 'delete'; orgs: string[]; onClose: () => void }) {
  const w = useWorld((x) => x);
  return (
    <motion.div {...arrive} className="mv-confirmbox" role="alertdialog" aria-labelledby="mv-cf-h" aria-describedby="mv-cf-d">
      <b id="mv-cf-h">{kind === 'revoke' ? `Stop sharing with ${list(orgs.map((o) => orgName(w, o)))}?` : 'Delete the video, its transcript and your corrections?'}</b>
      <p id="mv-cf-d" className="t14" style={{ margin: 0 }}>{kind === 'revoke' ? 'They can no longer play it or read the transcript, straight away. ' : 'This can’t be undone. '}{orgs.length || kind === 'revoke' ? KEEPS(w, orgs) : 'It was never shared, so no one else keeps anything.'}</p>
      <div className="tb-actions">
        <button type="button" className="ds-btn danger" onClick={() => { void act(kind === 'revoke' ? 'media.revoke' : 'media.delete', { id: m.id }); onClose(); }}>{kind === 'revoke' ? 'Stop sharing' : 'Delete for good'}</button>
        <button type="button" className="ds-btn quiet" onClick={onClose}>Keep it</button>
      </div>
    </motion.div>
  );
}

/** Transparency: the candidate sees Q's findings for each organisation and can ask for a correction (AD-F-12). */
function TheirReport({ m, org, me }: { m: MediaEvidence; org: string; me: string }) {
  const w = useWorld((x) => x);
  const r = ms(w).reviews.filter((x) => x.mediaId === m.id && x.orgId === org).sort((a, b) => b.v - a.v)[0];
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState('');
  if (!r) return null;
  const view = reportView(w, r);
  const cf = criteriaFor(w, roleFor(w, m.ownerId, org) ?? '');
  const label = (id: string) => cf.crit.find((c) => c.id === id)?.label ?? id;
  const ds = disputesOf(r);
  void me;
  return (
    <section className="mv-sub" aria-labelledby={`mv-their-${org}`}>
      <div className="tb-row-between"><h4 id={`mv-their-${org}`} className="mv-h4">What Q told {orgName(w, org)}</h4><span className="ds-tag" data-k={r.state === 'HUMAN_REVIEWED' ? 'ok' : r.state === 'DISPUTED' ? 'warn' : 'busy'}>{r.state === 'HUMAN_REVIEWED' ? 'Checked by a person' : r.state === 'DISPUTED' ? 'Correction requested' : 'Not checked by a person yet'}</span></div>
      <ul className="mv-their">
        {view.findings.map((f) => (
          <li key={f.criterionId}>
            <b>{label(f.criterionId)}</b> <span className="t14 muted num">{f.moments.map((x) => fmt(x.t)).join(', ')}</span>
            <span className="t14">{f.note}</span>
            {ds.some((d) => d.criterionId === f.criterionId) ? <span className="t14 muted">You asked for a correction: “{ds.find((d) => d.criterionId === f.criterionId)!.text}”</span>
              : open === f.criterionId ? (
                <form className="mv-edit" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { void act('media.dispute', { id: r.id, crit: f.criterionId, text: text.trim() }); setOpen(null); setText(''); } }}>
                  <label htmlFor={`mv-d-${f.criterionId}`} className="t14"><b>What’s wrong with this finding?</b></label>
                  <textarea id={`mv-d-${f.criterionId}`} className="ds-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
                  <div className="tb-actions"><button type="submit" className="ds-btn primary">Ask for a correction</button><button type="button" className="ds-btn quiet" onClick={() => setOpen(null)}>Cancel</button></div>
                </form>
              ) : <button type="button" className="tb-linkbtn" onClick={() => setOpen(f.criterionId)}>This is wrong</button>}
          </li>
        ))}
      </ul>
      {view.notShown.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>Not shown in the parts you shared, so not scored (never counted as zero): {view.notShown.map(label).join(', ')}.</p>}
    </section>
  );
}

function Revoked({ m }: { m: MediaEvidence }) {
  const w = useWorld((x) => x);
  const ended = w.evidence.find((e) => e.evidenceId === m.evidenceId)?.revokedFrom ?? [];
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="mv-panel tb-stack" aria-labelledby="mv-rv-h">
      <div className="tb-row-between"><h3 id="mv-rv-h" className="tb-title">{m.title}</h3><span className="ds-tag">Sharing stopped</span></div>
      <p className="t14" style={{ margin: 0 }}>{ended.length ? `${list(ended.map((o) => orgName(w, o)))} can no longer play it or read the transcript.` : 'Nobody else can see it.'} {KEEPS(w, ended)}</p>
      <div className="tb-actions"><button type="button" className="ds-btn danger" onClick={() => setConfirm(true)}>Delete it too</button></div>
      {confirm && <Confirm m={m} kind="delete" orgs={ended} onClose={() => setConfirm(false)} />}
    </div>
  );
}

export const hasMedia = (w: World, pid: string) => itemsOf(w, pid).length > 0;
