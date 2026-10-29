// The role briefing on a job page (AD-C-01): a simulated 2-minute video with chapters and the employer's transcript.
// Chapters and transcript lines are buttons that seek; the line being spoken is marked by weight and a bar (not colour
// alone). Q can seek the player ("play from 1:12") through view state, so the answer and the evidence stay together.
import { useEffect, useRef, useState } from 'react';
import { actorOf, useWorld } from '../../mock/world';
import { runAction } from '../../q/core/engine';
import { briefingFor, mmss } from './logic';
import './contact.css';

export function RoleBriefing({ jobId }: { jobId: string }) {
  const b = briefingFor(jobId);
  const seek = useWorld((w) => (w.q.ui[`${actorOf(w).id}|briefing`] as { t?: number; n?: number } | undefined));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const lastSeek = useRef<number | undefined>(undefined);
  useEffect(() => { if (seek?.n !== undefined && seek.n !== lastSeek.current) { lastSeek.current = seek.n; if (typeof seek.t === 'number') { setT(seek.t); setShowAll(true); } } }, [seek]);
  useEffect(() => {
    if (!playing || !b) return;
    const id = window.setInterval(() => setT((x) => { if (x + 1 >= b.duration) { setPlaying(false); return b.duration; } return x + 1; }), 1000);
    return () => window.clearInterval(id);
  }, [playing, b]);
  if (!b) return null;
  const cur = [...b.transcript].reverse().find((l) => l.t <= t) ?? b.transcript[0];
  const chap = [...b.chapters].reverse().find((c) => c.t <= t) ?? b.chapters[0];
  const lines = showAll ? b.transcript : b.transcript.filter((l) => Math.abs(l.t - cur.t) <= 30).slice(0, 4);
  const ask = (text: string) => void runAction({ label: text, act: { t: 'say', text } });
  return (
    <section className="ds-sheet cr-brief" id="briefing" aria-labelledby="cr-brief-h">
      <div className="cr-row"><h2 id="cr-brief-h" className="tb-h2">Role briefing</h2><span className="t14 muted">{mmss(b.duration)} · {b.by}, {b.byTitle}</span></div>
      <div className="cr-player" role="group" aria-label={`Video: ${b.title}`}>
        <div className="cr-screen">
          <span className="ds-sim cr-simtag">Simulated video</span>
          <p className="cr-caption voice" aria-live="polite"><span className="sr">{b.by} says: </span>“{cur.text}”</p>
          <span className="cr-chapnow t14">{chap.label}</span>
        </div>
        <div className="cr-controls">
          <button type="button" className="ds-btn cr-play" aria-pressed={playing} onClick={() => { if (t >= b.duration) setT(0); setPlaying(!playing); }}>{playing ? 'Pause' : t > 0 && t < b.duration ? 'Resume' : 'Play'}</button>
          <label className="sr" htmlFor="cr-seek">Position in the briefing</label>
          <input id="cr-seek" className="cr-seek" type="range" min={0} max={b.duration} step={1} value={t} onChange={(e) => setT(Number(e.target.value))} aria-valuetext={`${mmss(t)} of ${mmss(b.duration)}`} />
          <span className="num t14 cr-time">{mmss(t)} / {mmss(b.duration)}</span>
        </div>
        <ol className="cr-chapters" aria-label="Chapters">
          {b.chapters.map((c) => <li key={c.t}><button type="button" aria-current={c.t === chap.t ? 'true' : undefined} onClick={() => { setT(c.t); setShowAll(true); }}><span className="num">{mmss(c.t)}</span>{c.label}</button></li>)}
        </ol>
      </div>
      <div className="cr-transcript">
        <div className="cr-row"><h3 className="t14 cr-h3">Transcript</h3><button type="button" className="hc-more" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : 'Show the whole transcript'}</button></div>
        <ol aria-label="Transcript lines">
          {lines.map((l) => <li key={l.t} data-now={l.t === cur.t ? '1' : undefined}><button type="button" onClick={() => setT(l.t)} aria-label={`${mmss(l.t)}: ${l.text}`}><span className="num cr-ts">{mmss(l.t)}</span><span>{l.text}</span></button></li>)}
        </ol>
        <p className="t14 muted" style={{ margin: 0 }}>{b.transcriptSource}. Q answers from it and says where.</p>
      </div>
      <div className="hc-starters" role="group" aria-label="Ask Q about the briefing">
        <button type="button" className="ds-filter" onClick={() => ask('is the on-call real?')}>Is the on-call real?</button>
        <button type="button" className="ds-filter" onClick={() => ask('who would I report to?')}>Who would I report to?</button>
        <button type="button" className="ds-filter" onClick={() => ask('how do they interview?')}>How do they interview?</button>
      </div>
    </section>
  );
}
