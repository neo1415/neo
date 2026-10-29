// Recruiter: Q's evidence report on a candidate's shared video (/r/people/:id/video). Reads only what
// canSeeCandidate and visibleSegments allow: parts not shared with the viewer's organisation are a hatched
// "Not shared" gap, their transcript never reaches the page (it's filtered before rendering), and criteria only
// they could show are listed as "Not shown", never scored as zero. Every finding is timestamped and plays.
// Order follows the task: Q's reading → the player → findings by criterion (with coverage) → not shown →
// transcript → how it was made (cost and caching).
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, canSeeCandidate, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { PageIndex } from '../../ds/PageIndex';
import { arrive } from '../../ds/motion';
import { Link, useRoute } from '../../ui/router';
import { runAction } from '../../q/core/engine';
import { visibleSegments } from '../../state/areas/media';
import { roleIndex } from '../../state/areas/rubrics';
import type { MediaReview } from '../../state/domain';
import { NO_INFERENCE, criteriaFor, disputesOf, fmt, fmtDate, keyFor, list, ms, ratingFor, reportView, roleFor, roleTitle, span, videoCoverage, type Crit } from './logic';
import { Player, usePlayback, type Marker } from './Player';
import './media.css';

const act = (op: string, args: Record<string, unknown> = {}) => runAction({ label: op, act: { t: 'do', op, args } });
/** Lower-case a criterion label mid-sentence, keeping proper nouns (Go, Postgres). */
const lc = (s: string) => (/^(Go|Postgres|SQL|API)\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const UNC: Record<string, { label: string; k?: string; plain: string }> = {
  LOW: { label: 'Low uncertainty', k: 'ok', plain: 'Shown clearly on screen and in what was said.' },
  MEDIUM: { label: 'Some uncertainty', k: 'warn', plain: 'Shown, but partly resting on the candidate’s own report or a narrow example.' },
  HIGH: { label: 'High uncertainty', k: 'risk', plain: 'Barely shown; treat it as a lead for the interview, not evidence.' },
};

export function VideoReport({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const me = actorOf(w);
  const org = me.orgId ?? '';
  const person = w.people.find((p) => p.personId === id);
  const first = person?.name.split(' ')[0] ?? 'This person';
  const { query } = useRoute();
  if (!person) return <Gone title="We can’t find this person" text="There’s no one with this link in your hiring." />;
  if (!org || !canSeeCandidate(w, id, org)) return <Gone title={`You can’t see ${first}’s video`} text={`${first} hasn’t shared anything with your organisation, or has stopped sharing. Q won’t say what, if anything, exists.`} />;
  const item = ms(w).items.filter((m) => m.ownerId === id && visibleSegments(w, m.id, org).length).slice(-1)[0];
  if (!item) return (
    <Canvas title={`${first}’s video evidence`} kicker={`${person.name} · video`} open onClose={() => history.back()} aside={<Link className="ds-btn quiet" to={`/r/people/${id}`}>Back to the profile</Link>}>
      <section className="ds-sheet mv-empty" role="status"><Glyph k="none" size={28} /><div className="tb-stack"><b>No video or voice recording is shared with you.</b><p className="t14 muted" style={{ margin: 0 }}>If {first} shares one, it appears here with Q’s report, and Q tells you. You can ask for one in your messages; {first} chooses whether to record, write it instead, or ask for an adjustment.</p></div></section>
    </Canvas>
  );
  return <Report key={item.id} pid={id} mediaId={item.id} org={org} start={Number(query.get('t') ?? NaN)} autoplay={query.get('play') === '1'} />;
}

function Gone({ title, text }: { title: string; text: string }) {
  return (
    <Canvas title={title} kicker="Video evidence" open onClose={() => history.back()}>
      <section className="ds-sheet mv-empty" role="alert"><Glyph k="none" size={28} /><div className="tb-stack"><b>Nothing here you’re allowed to see.</b><p className="t14" style={{ margin: 0 }}>{text}</p><Link className="ds-btn" to="/r/compare" style={{ justifySelf: 'start' }}>Back to the comparison</Link></div></section>
    </Canvas>
  );
}

function Report({ pid, mediaId, org, start, autoplay }: { pid: string; mediaId: string; org: string; start: number; autoplay: boolean }) {
  const w = useWorld((x) => x);
  const me = actorOf(w);
  const m = ms(w).items.find((x) => x.id === mediaId)!;
  const person = w.people.find((p) => p.personId === pid)!;
  const first = person.name.split(' ')[0];
  const segs = visibleSegments(w, mediaId, org);
  // The page never holds the transcript of a part it can't see.
  const vm = useMemo(() => ({ ...m, transcript: m.transcript.filter((l) => segs.some((s) => l.t >= s.t && l.t < s.tEnd)) }), [m, segs.map((s) => s.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const mandateId = roleFor(w, pid, org) ?? '';
  const cf = criteriaFor(w, mandateId);
  const all = ms(w).reviews.filter((r) => r.mediaId === mediaId && r.orgId === org);
  const want = keyFor(w, mediaId, org, cf.rubricId ?? 'brief', cf.v ?? 0);
  const r: MediaReview | undefined = all.find((x) => x.cacheKey === want) ?? [...all].sort((a, b) => b.v - a.v)[0];
  const olderVersion = !!r && cf.rubricId && r.rubricId === cf.rubricId && r.v !== cf.v;
  const needs = !r || (r.cacheKey !== want && !olderVersion);
  // Built once per cache key (contentHash + rubric version + shared parts); opening the page again is a cache read.
  useEffect(() => { if (needs) void act('media.ensure', { media: mediaId, org }); }, [needs, want, mediaId, org]);
  useEffect(() => { void act('media.seen', { id: mediaId }); }, [mediaId]);
  const pb = usePlayback(m.duration, segs, Number.isFinite(start) ? start : 0);
  useEffect(() => { if (Number.isFinite(start)) pb.seek(start, autoplay); }, [start, autoplay]); // eslint-disable-line react-hooks/exhaustive-deps
  const playerRef = useRef<HTMLElement>(null);
  const seek = (t: number) => { pb.seek(t, true); playerRef.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  const secs = segs.reduce((a, s) => a + s.tEnd - s.t, 0);
  const role = roleTitle(w, mandateId);

  // Criteria labels/weights come from the version the review was built on (v1 stays v1 after v2 is approved).
  const crit: Crit[] = useMemo(() => {
    if (!r || r.rubricId === 'brief') return cf.crit;
    const rub = (w.areas.rubrics as { list: { id: string; versions: { v: number; criteria: Crit[] }[] }[] }).list.find((x) => x.id === r.rubricId);
    return rub?.versions.find((v) => v.v === r.v)?.criteria ?? cf.crit;
  }, [r?.id, w.areas.rubrics]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = r ? reportView(w, r) : null;
  const byId = (id: string) => crit.find((c) => c.id === id);
  const markers: Marker[] = (view?.findings ?? []).flatMap((f) => f.moments.map((x) => ({ t: x.t, tEnd: x.tEnd, label: byId(f.criterionId)?.label ?? '' })));
  const shownIds = view?.findings.map((f) => f.criterionId) ?? [];
  const cov = videoCoverage(crit, shownIds);
  const idx = r && r.rubricId !== 'brief' ? roleIndex(w, mandateId, pid, r.v) : null;
  const notShown = (view?.notShown ?? []).map(byId).filter((c): c is Crit => !!c);
  const notAssessed = notShown.filter((c) => c.kind === 'ELIGIBILITY' || c.kind === 'COMPATIBILITY');
  const gaps = notShown.filter((c) => !notAssessed.includes(c));
  const scored = !!r && r.rubricId !== 'brief';
  const lede = view ? `${view.findings.length ? `Shows ${list(view.findings.map((f) => lc(byId(f.criterionId)?.label ?? '')))}, with ${markers.length} moments you can play.` : 'Nothing in the shared parts speaks to the role’s criteria.'}${gaps.length ? ` ${cap(list(gaps.map((c) => lc(c.label))))} ${gaps.length === 1 ? 'isn’t' : 'aren’t'} in what ${first} shared, so ${gaps.length === 1 ? 'it isn’t' : 'they aren’t'} scored: ask in the interview.` : ''}` : '';
  const disputes = r ? disputesOf(r).filter((d) => d.state === 'OPEN') : [];
  const index = [{ id: 'mv-player', label: 'Video' }, { id: 'mv-findings', label: 'Findings' }, { id: 'mv-notshown', label: 'Not shown' }, { id: 'mv-transcript', label: 'Transcript' }, { id: 'mv-how', label: 'How it was made' }];

  return (
    <Canvas title={`${first}’s walkthrough video`} kicker={`${role} · video evidence`} open onClose={() => history.back()} qLine={lede.split('.')[0]}
      aside={<Link className="ds-btn quiet" to={`/r/people/${pid}`}>Back to the profile</Link>}>
      <div className="mv-report">
        {lede && <p className="mv-lede"><span className="mv-diamond" aria-hidden="true">◆</span>{lede}</p>}
        <p className="mv-noinf" role="note"><b>{NO_INFERENCE}.</b> Only what {first} said and showed on screen is used. Q won’t answer questions like “is he confident?”.</p>
        {disputes.length > 0 && r && (
          <div className="ds-banner" data-k="warn" role="status"><span aria-hidden="true">⚑</span><span><b>{first} asked for a correction.</b> “{disputes[0].text}” (about {byId(disputes[0].criterionId)?.label}). Look at the moments before relying on it.</span><button type="button" className="ds-btn" onClick={() => act('media.resolve', { id: r.id })}>Mark as looked at</button></div>
        )}
        {olderVersion && r && (
          <div className="ds-banner" role="status"><span aria-hidden="true">ⓥ</span><span><b>This report uses rubric v{r.v}.</b> v{cf.v} is now approved. Ratings on v{r.v} stay on v{r.v}; nothing is re-scored unless you ask.</span><button type="button" className="ds-btn" onClick={() => act('media.rebuild', { media: mediaId, org, v: cf.v })}>Prepare a v{cf.v} report</button></div>
        )}
        <PageIndex items={index} />

        <section id="mv-player" ref={playerRef} className="ds-sheet tb-stack" aria-labelledby="mv-player-h">
          <div className="tb-row-between"><h2 id="mv-player-h" className="tb-h2">{m.title}</h2><span className="t14 muted num">{segs.length} of {m.segments.length} parts · {fmt(secs)} of {fmt(m.duration)}</span></div>
          <Player m={vm} allowed={segs} pb={pb} markers={markers} viewer={w.orgs.find((o) => o.id === org)?.name ?? 'you'} />
          <p className="t14 muted" style={{ margin: 0 }}>Shared by {first} until {fmtDate(m.consent!.expires!)} for “{m.consent!.purpose}”. {m.segments.length - segs.length ? `${m.segments.length - segs.length} part isn’t shared with you; the player skips it.` : ''}</p>
        </section>

        <section id="mv-findings" className="ds-sheet tb-stack" aria-labelledby="mv-f-h">
          <div className="tb-row-between">
            <h2 id="mv-f-h" className="tb-h2">{scored ? `Findings against rubric v${r!.v}` : 'Findings against the role brief'}</h2>
            {r && <span className="ds-tag" data-k={r.state === 'HUMAN_REVIEWED' ? 'ok' : r.state === 'DISPUTED' ? 'warn' : 'busy'}>{r.state === 'HUMAN_REVIEWED' ? `Reviewed by ${w.actors.find((a) => a.id === r.reviewedBy)?.first ?? 'a person'}` : r.state === 'DISPUTED' ? 'Correction requested' : 'Q’s draft · not reviewed'}</span>}
          </div>
          {!scored && <p className="ds-banner" style={{ margin: 0 }}><span aria-hidden="true">ⓘ</span><span>Kora hasn’t approved a rubric for this role yet, so Q maps the video to the brief’s requirements and doesn’t rate anything. <Link to={`/r/roles/${mandateId}/rubric`}>Open the rubric</Link></span><span /></p>}
          {!r ? <div className="mv-skel" role="status"><span className="ds-skeleton" /><span className="t14 muted">Q is preparing the report once. It’s kept for this rubric version, so opening it again doesn’t re-run anything.</span></div> : (
            <>
              <Coverage crit={crit} shown={shownIds} cov={cov} idx={idx} />
              {r.state !== 'HUMAN_REVIEWED' && view!.findings.length > 0 && (
                <div className="mv-reviewbar"><button type="button" className="ds-btn primary" onClick={() => act('media.reviewed', { id: r.id })}>Mark the report reviewed</button><span className="t14 muted">After you’ve played the moments. Change any rating below first if you disagree.</span></div>
              )}
              <ol className="mv-findings">
                {view!.findings.map((f) => <Finding key={f.criterionId} r={r} f={f} c={byId(f.criterionId)} seek={seek} scored={scored} meId={me.id} />)}
              </ol>

            </>
          )}
        </section>

        <section id="mv-notshown" className="ds-sheet tb-stack" aria-labelledby="mv-ns-h">
          <h2 id="mv-ns-h" className="tb-h2">Not shown</h2>
          {gaps.length ? <>
            <p className="t14" style={{ margin: 0 }}>The parts {first} shared don’t show these. They’re <b>not scored and never counted as zero</b>; coverage goes down instead. Ask about them in the interview.</p>
            <ul className="mv-ns">{gaps.map((c) => <li key={c.id}><Glyph k="none" size={14} /><b>{c.label}</b>{c.weight !== 1 && <span className="t14 muted num"> · weight {c.weight}</span>}</li>)}</ul>
          </> : <p className="t14" style={{ margin: 0 }}>Every criterion Q could check from a video is shown somewhere in what {first} shared.</p>}
          {notAssessed.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>Not assessed from a video at all: {notAssessed.map((c) => c.label).join(', ')} (eligibility and preferences are checked separately).</p>}
        </section>

        <section id="mv-transcript" className="ds-sheet tb-stack" aria-labelledby="mv-tr-h">
          <div className="tb-row-between"><h2 id="mv-tr-h" className="tb-h2">Transcript of the shared parts</h2><span className="t14 muted">{vm.transcript.filter((l) => l.edited).length ? `${vm.transcript.filter((l) => l.edited).length} line corrected by ${first}` : 'Checked by ' + first}</span></div>
          <div className="mv-rtr-wrap" tabIndex={0} role="region" aria-label="Transcript of the shared parts">{segs.map((s) => (
            <div key={s.id} className="mv-tgroup">
              <p className="lab mv-tgroup-h">{s.label} · <span className="num">{span(s.t, s.tEnd)}</span></p>
              <ol className="mv-rtr">{vm.transcript.filter((l) => l.t >= s.t && l.t < s.tEnd).map((l) => <li key={l.t}><button type="button" className="mv-tbtn num" onClick={() => seek(l.t)} aria-label={`Play from ${fmt(l.t)}`}>{fmt(l.t)}</button><span>{l.text}{l.edited && <span className="ds-tag mv-edtag">Corrected by {first}</span>}</span></li>)}</ol>
            </div>
          ))}</div>
          {m.segments.length > segs.length && <p className="t14 muted" style={{ margin: 0 }}>{m.segments.length - segs.length} part not shared with you. Its transcript isn’t available to you or to Q’s report.</p>}
        </section>

        <details id="mv-how" className="ds-sheet tb-details t14">
          <summary><b>How this report was made, and what it cost</b></summary>
          <ul>
            <li><b>Transcribed once.</b> The file was transcribed a single time (simulated) and stored against its fingerprint, <span className="num">{m.contentHash}</span>. {first} checked it and corrected {m.transcript.filter((l) => l.edited).length} line(s).</li>
            <li><b>Cached report.</b> Key moments and this report are kept for {r ? `${r.rubricId === 'brief' ? 'the role brief' : `rubric v${r.v}`} and the parts shared with you` : 'this rubric version'}{r ? ` (key ${r.cacheKey})` : ''}. Opening the page again, or another person on your team opening it, doesn’t re-run anything. It runs again only if the rubric version or what {first} shares changes.</li>
            <li><b>Frame review only when the task needs it.</b> Looking at the picture (for example reading a diagram or a dashboard) costs more, so it runs only for criteria that need it. Not used here: every finding comes from what {first} said and the code and queries described.</li>
            <li><b>Simulated analysis.</b> In this prototype the moments and proposed ratings are prepared in advance for this file. No AI model watched the video.</li>
          </ul>
        </details>
      </div>
    </Canvas>
  );
}

/** Part-to-whole: each criterion is a block, width = weight; filled = shown in the video, track = not shown. */
function Coverage({ crit, shown, cov, idx }: { crit: Crit[]; shown: string[]; cov: { pct: number; n: number; of: number }; idx: ReturnType<typeof roleIndex> | null }) {
  const job = crit.filter((c) => c.kind !== 'COMPATIBILITY' && c.weight > 0);
  return (
    <figure className="mv-cov" aria-labelledby="mv-cov-cap">
      <figcaption id="mv-cov-cap" className="t14"><b className="num">{cov.n} of {cov.of}</b> criteria shown in the video, <b className="num">{cov.pct}%</b> of the role’s weight.{idx && idx.index !== null && <> All evidence on the scorecard: index <b className="num">{idx.index}</b> at <b className="num">{idx.coverage}%</b> coverage <span className="muted">(prototype arithmetic, not a validated test)</span>.</>}</figcaption>
      <div className="mv-cov-bar" role="img" aria-label={job.map((c) => `${c.label}: ${shown.includes(c.id) ? 'shown' : 'not shown'}, weight ${c.weight}`).join('; ')}>
        {job.map((c) => <i key={c.id} data-on={shown.includes(c.id) || undefined} style={{ flexGrow: c.weight }} title={`${c.label} · weight ${c.weight} · ${shown.includes(c.id) ? 'shown' : 'not shown'}`}><span>{c.label}</span></i>)}
      </div>
      <ul className="mv-cov-key t14" aria-hidden="true"><li><i data-on /> Shown in the video</li><li><i /> Not shown (not scored)</li><li className="muted">Block width = weight</li></ul>
    </figure>
  );
}

function Finding({ r, f, c, seek, scored, meId }: { r: MediaReview; f: ReturnType<typeof reportView>['findings'][number]; c?: Crit; seek: (t: number) => void; scored: boolean; meId: string }) {
  const w = useWorld((x) => x);
  const rt = ratingFor(w, r, f.criterionId);
  const rating = rt?.rating ?? f.rating;
  const [edit, setEdit] = useState(false);
  const [to, setTo] = useState<number>(rating ?? 2);
  const [reason, setReason] = useState('');
  const u = UNC[f.uncertainty];
  const dispute = disputesOf(r).find((d) => d.criterionId === f.criterionId && d.state === 'OPEN');
  const comm = /communicat|explain/i.test(c?.label ?? '') && !/accent/.test(f.note);
  const [all, setAll] = useState(false);
  const shown = all ? f.moments : f.moments.slice(0, 2);
  void meId;
  return (
    <motion.li layout="position" className="mv-finding" data-disputed={dispute ? true : undefined}>
      <div className="mv-fhead">
        <h3 className="tb-title">{c?.label ?? f.criterionId}{c && c.weight !== 1 && <span className="mv-w num"> ×{c.weight}</span>}</h3>
        <div className="mv-fmeta">
          {scored && rating !== undefined && <span className="mv-rating" aria-label={`${rt?.override ? 'Rated' : 'Q proposes'} ${rating} of 4`}><span className="mv-dots" aria-hidden="true">{[1, 2, 3, 4].map((k) => <i key={k} data-on={k <= rating || undefined} />)}</span><b className="num">{rating}/4</b><span className="t14 muted">{rt?.override ? `by ${w.actors.find((a) => a.id === rt.override!.by)?.first ?? 'reviewer'}` : 'Q proposes'}</span></span>}
          <span className="ds-tag" data-k={u.k} title={u.plain}>{u.label}</span>
        </div>
      </div>
      {scored && rating !== undefined && c?.anchors?.[rating] && <p className="t14 mv-anchor"><span className="muted">Level {rating} means:</span> {c.anchors[rating]}</p>}
      {rt?.override && <p className="t14 mv-override">Changed from {rt.override.from} to {rating}: “{rt.override.reason}”</p>}
      <ul className="mv-moments">
        {shown.map((x) => (
          <li key={x.t}><button type="button" className="mv-tbtn num" onClick={() => seek(x.t)} aria-label={`Play ${span(x.t, x.tEnd)}`}><span aria-hidden="true">▶</span> {span(x.t, x.tEnd)}</button><q className="mv-quote">{x.text}</q></li>
        ))}
      </ul>
      {f.moments.length > 2 && <button type="button" className="tb-linkbtn" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show fewer moments' : `Show ${f.moments.length - 2} more moment${f.moments.length - 2 === 1 ? '' : 's'}`}</button>}
      <p className="t14" style={{ margin: 0 }}><span className="muted">Why:</span> {f.note}</p>
      {comm && <p className="t14 muted" style={{ margin: 0 }}>Judged on the content of what was said, against the anchors. Accent, fluency, pace and voice aren’t used; a written answer counts the same.</p>}
      {dispute && <p className="t14 mv-override" role="note">{w.people.find((p) => p.personId === r.personId)?.name.split(' ')[0]} disputes this: “{dispute.text}”</p>}
      {scored && rt && (edit ? (
        <form className="mv-edit" onSubmit={(e) => { e.preventDefault(); if (reason.trim()) { void act('media.override', { id: r.id, crit: f.criterionId, to, reason }); setEdit(false); setReason(''); } }}>
          <div className="mv-seg3" role="group" aria-label="New rating">{[0, 1, 2, 3, 4].map((k) => <button key={k} type="button" aria-pressed={to === k} onClick={() => setTo(k)}>{k}</button>)}</div>
          <label htmlFor={`mv-r-${f.criterionId}`} className="t14"><b>Reason</b> (recorded in the audit log)</label>
          <textarea id={`mv-r-${f.criterionId}`} className="ds-input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. the tuning was on synthetic data" />
          <div className="tb-actions"><button type="submit" className="ds-btn primary" disabled={!reason.trim()}>Save rating</button><button type="button" className="ds-btn quiet" onClick={() => setEdit(false)}>Cancel</button></div>
        </form>
      ) : <button type="button" className="tb-linkbtn" onClick={() => { setTo(rating ?? 2); setEdit(true); }}>Change rating</button>)}
    </motion.li>
  );
}
void arrive;
