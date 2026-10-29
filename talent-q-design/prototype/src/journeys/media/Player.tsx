// The simulated player (no real video file): a CSS-drawn poster, a caption line from the transcript, play/pause,
// a scrubber that moves, and a timeline of parts and key moments. Parts a viewer may not see are drawn as a hatched
// gap labelled "Not shared" (never their title), the scrubber skips them, and their transcript is never read here.
// Motion: the playhead moves only while playing (event-caused); seeking jumps instantly (MO-033 style arrival only
// for the caption line). Reduced motion keeps every state visible as text.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MediaEvidence } from '../../state/domain';
import { fmt, lineAt } from './logic';

type Seg = MediaEvidence['segments'][number];
export interface Marker { t: number; tEnd: number; label: string; k?: string }

/** Playback clock limited to the parts the viewer may see. */
export function usePlayback(duration: number, allowed: Seg[], start = 0) {
  const first = allowed[0]?.t ?? 0;
  const [t, setT] = useState(Math.max(start, first));
  const [playing, setPlaying] = useState(false);
  const snap = (x: number) => {
    const c = Math.max(0, Math.min(duration, x));
    if (allowed.some((s) => c >= s.t && c < s.tEnd)) return c;
    const next = allowed.find((s) => s.t > c);
    return next ? next.t : allowed[allowed.length - 1]?.tEnd ?? c;
  };
  const tRef = useRef(t); tRef.current = t;
  useEffect(() => {
    if (!playing) return;
    const h = window.setInterval(() => {
      const n = snap(tRef.current + 1);
      if (n >= (allowed[allowed.length - 1]?.tEnd ?? duration) - 0.01) { setPlaying(false); setT(allowed[allowed.length - 1]?.tEnd ?? duration); return; }
      setT(n);
    }, 1000);
    return () => window.clearInterval(h);
  }, [playing, allowed.map((s) => s.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  return { t, playing, setPlaying, seek: (x: number, play = true) => { setT(snap(x)); if (play) setPlaying(true); } };
}

export function Player({ m, allowed, pb, markers = [], viewer, caption = true }: {
  m: MediaEvidence; allowed: Seg[]; pb: ReturnType<typeof usePlayback>; markers?: Marker[]; viewer: string; caption?: boolean;
}) {
  const { t, playing, setPlaying, seek } = pb;
  const seg = allowed.find((s) => t >= s.t && t < s.tEnd) ?? allowed.find((s) => Math.abs(t - s.tEnd) < 0.01);
  const line = useMemo(() => {
    if (!seg) return null;
    const i = lineAt(m, Math.min(t, seg.tEnd - 0.01));
    const l = m.transcript[i];
    return l && l.t >= seg.t && l.t < seg.tEnd ? l : null; // never a line from a part the viewer can't see
  }, [m, t, seg]);
  const D = m.duration;
  const hidden = m.segments.filter((s) => !allowed.some((a) => a.id === s.id));
  const pct = (x: number) => `${(100 * x) / D}%`;
  return (
    <figure className="mv-player" aria-label={`Simulated video: ${m.title}`}>
      <div className="mv-screen ink" data-playing={playing || undefined}>
        <span className="mv-simtag">Simulated video</span>
        <div className="mv-poster" aria-hidden="true">
          <div className="mv-poster-top"><i /><i /><i /><span>{seg ? seg.label.replace(' (confidential)', '') : m.title}</span></div>
          <div className="mv-code">{Array.from({ length: 7 }, (_, k) => <i key={k} style={{ width: `${30 + ((k * 37 + Math.floor(t / 5) * 11) % 60)}%`, marginLeft: `${(k % 3) * 6}%` }} />)}</div>
        </div>
        <button type="button" className="mv-play" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : `Play from ${fmt(t)}`}>
          {playing ? <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>}
        </button>
        <span className="mv-clock num" aria-live="off">{fmt(t)} / {fmt(D)}</span>
      </div>
      {caption && <p className="mv-caption" aria-live="polite">{line ? <><span className="num lab">{fmt(line.t)}</span> {line.text}{line.edited && <span className="mv-edited">corrected by {m.ownerId === 'p_tobi' ? 'Tobi' : 'the candidate'}</span>}</> : <span className="muted">Press play, or choose a time below.</span>}</p>}
      <div className="mv-timeline">
        <div className="mv-track" aria-hidden="true">
          {m.segments.map((s) => {
            const ok = allowed.some((a) => a.id === s.id);
            return <i key={s.id} className="mv-seg" data-on={ok || undefined} style={{ left: pct(s.t), width: `calc(${pct(s.tEnd - s.t)} - 2px)` }}><span>{ok ? s.label.replace(' (confidential)', '') : 'Not shared'}</span></i>;
          })}
          {markers.map((x, k) => <b key={k} className="mv-mark" data-k={x.k} style={{ left: pct(x.t), width: `max(4px, ${pct(x.tEnd - x.t)})` }} title={`${fmt(x.t)} ${x.label}`} />)}
          <em className="mv-head" style={{ left: pct(t) }} />
        </div>
        <input className="mv-scrub" type="range" min={0} max={D} step={1} value={Math.round(t)} onChange={(e) => seek(Number(e.target.value), false)}
          aria-label={`Position in the video${hidden.length ? `. ${hidden.length} part${hidden.length === 1 ? ' isn’t' : 's aren’t'} shared with ${viewer} and ${hidden.length === 1 ? 'is' : 'are'} skipped` : ''}`}
          aria-valuetext={`${fmt(t)}${seg ? `, ${seg.label.replace(' (confidential)', '')}` : ''}`} />
        <div className="mv-ticks num" aria-hidden="true">{[0, 60, 120, 180, 240, 300, 360].filter((x) => x <= D).map((x) => <span key={x} style={{ left: pct(x) }}>{fmt(x)}</span>)}</div>
      </div>
      <figcaption className="sr">Parts: {m.segments.map((s) => `${fmt(s.t)} to ${fmt(s.tEnd)}: ${allowed.some((a) => a.id === s.id) ? s.label : `not shared with ${viewer}`}`).join('; ')}.</figcaption>
    </figure>
  );
}
