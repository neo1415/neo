// SC-092 · Resource and learning player (Tobi: incident leadership; Chidi: product briefs). Tied to a gap in the
// person's own career record. The video is SIMULATED: no media plays; the timeline and captions advance on a timer,
// with a full transcript, the same lesson as an article, keyboard controls, an exercise, and a private practice next.
// Learning is private and is never proof: finishing a lesson changes nothing an employer sees.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { actorOf, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph, GLYPH_LABEL } from '../../ds/Glyph';
import { runAction } from '../../q/core/engine';
import { Link, navigate, useRoute } from '../../ui/router';
import { tdRead } from '../../state/areas/talent-d';
import { compById, personaFor, readJ7, stateOf } from '../career/j7';
import { cueAt, demoState, mmss, resourceById, resourcesFor, type Resource } from './logic';
import { Variant } from './ui';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

function Player({ r, pid }: { r: Resource; pid: string }) {
  const saved = useWorld((w) => tdRead(w).learn[pid]?.[r.id]);
  const captions = saved?.captions ?? true; const transcript = saved?.transcript ?? false;
  const [pos, setPos] = useState(saved?.pos ?? 0);
  const [playing, setPlaying] = useState(false);
  const posRef = useRef(pos); posRef.current = pos;
  const set = (patch: Record<string, unknown>) => act('td.learn.set', { id: r.id, patch });
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setPos((p) => { const n = Math.min(r.video.length, p + 1); if (n >= r.video.length) setPlaying(false); return n; }), 1000);
    return () => window.clearInterval(t);
  }, [playing, r.video.length]);
  useEffect(() => { if (!playing) set({ pos: posRef.current }); }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => set({ pos: posRef.current }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const seek = (s: number) => { const n = Math.max(0, Math.min(r.video.length, s)); setPos(n); set({ pos: n }); };
  const ci = cueAt(r, pos); const cue = r.video.cues[ci];
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); setPlaying((p) => !p); }
    if (e.key === 'ArrowRight') { e.preventDefault(); seek(pos + 5); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); seek(pos - 5); }
    if (e.key === 'c') set({ captions: !captions });
  };
  return (
    <section className="td-stack" aria-labelledby="td-vid-h">
      <h2 id="td-vid-h" className="sr">Video: {r.video.title}</h2>
      <div className="td-player">
        <div className="td-screen" tabIndex={0} role="group" aria-roledescription="video player" aria-label={`${r.video.title}. Simulated video. Space plays or pauses, arrows move 5 seconds, C toggles captions.`} onKeyDown={onKey}>
          <span className="td-screen-sim">Simulated video · no media plays</span>
          <span className="td-screen-title">{r.video.title}</span>
          {captions && <p className="td-cap" aria-hidden="true">{cue.text}</p>}
        </div>
        <div className="td-controls">
          <button type="button" onClick={() => { if (pos >= r.video.length) seek(0); setPlaying((p) => !p); }} aria-label={playing ? 'Pause' : pos >= r.video.length ? 'Replay' : 'Play'}>{playing ? '❚❚ Pause' : pos >= r.video.length ? '↺ Replay' : '▶ Play'}</button>
          <button type="button" onClick={() => seek(pos - 10)} aria-label="Back 10 seconds">−10s</button>
          <button type="button" onClick={() => seek(pos + 10)} aria-label="Forward 10 seconds">+10s</button>
          <input type="range" min={0} max={r.video.length} value={pos} onChange={(e) => seek(Number(e.target.value))} aria-label="Position" aria-valuetext={`${mmss(pos)} of ${mmss(r.video.length)}`} />
          <span className="td-time" aria-hidden="true">{mmss(pos)} / {mmss(r.video.length)}</span>
          <button type="button" aria-pressed={captions} onClick={() => set({ captions: !captions })}>Captions</button>
          <button type="button" aria-pressed={transcript} onClick={() => set({ transcript: !transcript })}>Transcript</button>
        </div>
      </div>
      {/* Captions for assistive tech: announced as they change while playing. */}
      <p className="sr" aria-live={playing && captions ? 'polite' : 'off'}>{cue.text}</p>
      {transcript && (
        <div className="ds-sheet td-stack">
          <h3 className="lab" style={{ margin: 0 }}>Transcript</h3>
          <ol className="td-transcript" aria-label="Transcript; select a line to jump there">
            {r.video.cues.map((c, i) => <li key={i}><button type="button" aria-current={i === ci ? 'true' : undefined} onClick={() => seek(c.t)}><span className="td-time">{mmss(c.t)}</span><span>{c.text}</span></button></li>)}
          </ol>
        </div>
      )}
    </section>
  );
}

export function LearnPage({ id }: { id: string }) {
  const w = useWorld((x) => x); const a = actorOf(w); const pid = a.personId ?? '';
  const { query } = useRoute();
  const r = resourceById(id);
  const ds = demoState(query) ?? (!pid ? 'denied' : null);
  const st = tdRead(w).learn[pid]?.[id];
  const mode = st?.mode ?? 'VIDEO';
  const [answer, setAnswer] = useState(st?.answer ?? '');
  const [checked, setChecked] = useState(false);
  const mine = resourcesFor(pid);
  const P = personaFor(pid); const S = readJ7(w, pid);
  const cs = r ? stateOf(w, pid, S, r.comp) : 'none';
  const label = r && P.comps.some((c) => c.id === r.comp) ? compById(P, r.comp).label : r?.comp;
  const hits = r ? r.exercise.check.map((re) => re.test(answer)) : [];
  return (
    <Canvas title={r?.title ?? 'Lesson not found'} kicker={r ? `Lesson · about ${r.minutes} minutes · private` : 'Learning'} open onClose={() => navigate('/c/career')}
      views={r ? [{ id: 'VIDEO', label: 'Video' }, { id: 'ARTICLE', label: 'Article' }] : undefined} view={mode} setView={(v) => act('td.learn.set', { id, patch: { mode: v } })}
      qLine="Learning is private. It isn’t proof.">
      <Variant state={ds === 'empty' ? null : ds} what="this lesson" back={{ to: '/c/career', label: 'Back to your career atlas' }}>
        {!r || ds === 'empty' ? (
          <section className="ds-sheet tb-empty"><h2 className="tb-h2">No lesson here</h2><p style={{ margin: 0 }}>This lesson doesn’t exist or was removed.{mine.length ? ' These are tied to your plan:' : ' Your plan doesn’t have a lesson yet.'}</p>{mine.map((m) => <Link key={m.id} className="ds-btn" to={`/c/learn/${m.id}`}>{m.title}</Link>)}</section>
        ) : (
          <div className="td-page">
            <section className="ds-sheet td-stack" aria-labelledby="td-why-h">
              <h2 id="td-why-h" className="lab" style={{ margin: 0 }}>Why this lesson</h2>
              <p style={{ margin: 0 }}>{r.gapLine}</p>
              <p className="t14" style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}><Glyph k={cs} size={16} /><span>{label}: <b>{GLYPH_LABEL[cs].toLowerCase()}</b> in your record. Finishing this lesson won’t change that; a reviewed sample would.</span></p>
            </section>
            {mode === 'VIDEO' ? <Player r={r} pid={pid} /> : (
              <article className="ds-sheet td-article" aria-label={r.title}>
                {r.article.map((s) => <section key={s.h}><h3>{s.h}</h3><p>{s.p}</p></section>)}
              </article>
            )}
            <section className="ds-sheet td-stack" aria-labelledby="td-ex-h">
              <h2 id="td-ex-h" className="tb-h2">Try it</h2>
              <label htmlFor="td-ex" style={{ fontWeight: 600 }}>{r.exercise.prompt}</label>
              <p className="t14 muted" style={{ margin: 0 }} id="td-ex-hint">{r.exercise.hint}</p>
              <textarea id="td-ex" aria-describedby="td-ex-hint" className="td-ta" value={answer} onChange={(e) => { setAnswer(e.target.value); setChecked(false); }} onBlur={() => act('td.learn.set', { id, patch: { answer } })} />
              <div className="tb-actions"><button type="button" className="ds-btn" disabled={!answer.trim()} onClick={() => { setChecked(true); act('td.learn.set', { id, patch: { answer } }); }}>Check my answer</button><span className="t14 muted">Private. Nobody else sees it.</span></div>
              {checked && (
                <div className="td-stack" role="status">
                  {hits.every(Boolean) ? <p style={{ margin: 0 }}>That covers what the lesson asks for. If you want to show it, the next step is one practice question, then a reviewed sample.</p>
                    : <p style={{ margin: 0 }}>Good start. You could also cover {r.exercise.hint.toLowerCase().replace(/\.$/, '')}. {r.comp === 'incident' ? `Missing: ${['declaring it', 'who leads and who talks to people', 'how you stop the damage'].filter((_, i) => !hits[i]).join(', ')}.` : ''}</p>}
                </div>
              )}
            </section>
            <section className="ds-sheet td-stack" aria-labelledby="td-more-h">
              <h2 id="td-more-h" className="lab" style={{ margin: 0 }}>Further reading</h2>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{r.links.map((l) => <li key={l.label}>{l.label} <span className="t14 muted">({l.note})</span></li>)}</ul>
            </section>
            <div className="tb-actions">
              {st?.done ? <span className="ds-tag" data-k="ok">Finished · private</span> : <button type="button" className="ds-btn primary" onClick={() => act('td.learn.done', { id })}>Mark as finished</button>}
              <button type="button" className="ds-btn" onClick={() => void runAction({ label: r.practice.label, act: { t: 'do', op: r.practice.op, args: r.practice.args } })}>{r.practice.label}</button>
              {pid === 'p_chidi' && r.comp === 'writing' && <Link className="ds-btn quiet" to="/c/career/improve">Improve your brief</Link>}
            </div>
          </div>
        )}
      </Variant>
    </Canvas>
  );
}
