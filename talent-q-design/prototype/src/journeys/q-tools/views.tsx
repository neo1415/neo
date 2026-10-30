// Q-TOOLS views: the artifact renderers, used full size on the canvas and compact inside Q's replies.
// dataviz: one series per chart (no legend; the title names it), thin ink bars with 4 px data-ends, direct labels,
// a recessive baseline, a hover/focus detail per mark and a table view. Gold stays Q's: only the Q mark and Q's words.
// interaction-design: every artifact is a small state machine (building → ready | empty | error | denied), progress is
// derived from real steps, and every animation is caused by an event (MO-031 bars grow once when the data arrives).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { actorOf, simNow, useWorld, type World } from '../../mock/world';
import type { Actor } from '../../state/domain';
import { QMark } from '../../ds/QMark';
import { DUR, EASE, arrive } from '../../ds/motion';
import { useWidth } from '../../ds/Workspace';
import { runAction } from '../../q/core/engine';
import type { QArtifact } from '../../state/areas/q-tools';
import { CITIES, VIEW, amplitude, elapsed, fmtDay, mapData, pipelineData, processSteps, scanStage, storyboard, transcriptOf, wordsOf, WPS, type Frame } from './model';
import { allowed, domainOf, fileOf, pageOf, type WebLink } from './web';

/** Re-render on a short interval while something is in progress (no store writes). */
export function useTick(active: boolean, ms = 200) {
  const [, set] = useState(0);
  useEffect(() => { if (!active) return; const t = window.setInterval(() => set((n) => n + 1), ms); return () => window.clearInterval(t); }, [active, ms]);
}
const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });

export function Toggle<V extends string>({ value, set, options, label }: { value: V; set: (v: V) => void; options: { id: V; label: string }[]; label: string }) {
  return <div className="ds-views" role="group" aria-label={label}>{options.map((o) => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => set(o.id)}>{o.label}</button>)}</div>;
}

// =====================================================================================================
// SC-124 · chart: people by stage (MO-031)
// =====================================================================================================
export function ChartView({ w, a, art, compact }: { w: World; a: Actor; art: QArtifact; compact?: boolean }) {
  const d = pipelineData(w, a, art.scope.mandate);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [sel, setSel] = useState<string | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>(560);
  const max = Math.max(1, ...d.rows.map((r) => r.n));
  if (!d.total) return <p className="qt-empty">{d.hidden ? `No one to show: ${d.hidden} ${d.hidden === 1 ? 'person isn’t' : 'people aren’t'} shown because of their privacy settings.` : 'No one is in this pipeline yet. When people are found or apply, they appear here by stage.'}</p>;
  const labelW = compact ? 84 : 104, rowH = compact ? 26 : 38, barH = compact ? 12 : 18, numW = 34;
  const plotW = Math.max(60, width - labelW - numW);
  const cur = d.rows.find((r) => r.stage === sel);
  const chart = (
    <div ref={ref} className="qt-chart">
      <svg width="100%" height={d.rows.length * rowH + 4} role="group" aria-label={`People by stage, ${d.total} in all`}>
        <line x1={labelW} x2={labelW} y1={0} y2={d.rows.length * rowH} stroke="var(--rule-2)" strokeWidth={1} />
        {d.rows.map((r, i) => {
          const y = i * rowH + (rowH - barH) / 2; const bw = r.n ? Math.max(4, (r.n / max) * plotW) : 0;
          return (
            <g key={r.stage}>
              <text x={labelW - 10} y={y + barH / 2} dominantBaseline="middle" textAnchor="end" className="qt-axis">{r.label}</text>
              {r.n > 0 && <motion.rect x={labelW} y={y} height={barH} rx={4} initial={{ width: 0 }} animate={{ width: bw }} transition={{ duration: DUR.slow + 0.1, ease: EASE.enter, delay: i * 0.03 }} fill={sel === r.stage ? 'var(--ink)' : 'var(--ink-2)'} />}
              <text x={labelW + bw + 8} y={y + barH / 2} dominantBaseline="middle" className="qt-val num">{r.n}</text>
              {!compact && <rect x={0} y={i * rowH} width="100%" height={rowH} fill="transparent" tabIndex={0} role="button" aria-label={`${r.label}: ${r.n} ${r.n === 1 ? 'person' : 'people'}`} className="qt-hit"
                onMouseEnter={() => setSel(r.stage)} onMouseLeave={() => setSel(null)} onFocus={() => setSel(r.stage)} onBlur={() => setSel(null)} />}
            </g>
          );
        })}
      </svg>
      {!compact && <p className="qt-detail t14" aria-live="polite">{cur ? <><b>{cur.label}: {cur.n}</b>{cur.people.length ? ` · ${cur.people.map((p) => `${p.name}${d.roles.length > 1 ? ` (${p.role})` : ''}`).join(', ')}` : ''}</> : 'Point at or tab to a stage to see who is in it.'}</p>}
    </div>
  );
  if (compact) return <>{chart}<p className="t14 muted qt-foot">{d.total} people{d.hidden ? ` · ${d.hidden} not shown (privacy)` : ''}</p></>;
  return (
    <div className="qt-stack">
      <Toggle label="Show as" value={view} set={setView} options={[{ id: 'chart', label: 'Chart' }, { id: 'table', label: 'Table' }]} />
      {view === 'chart' ? chart : (
        <table className="ds-table qt-table"><caption className="sr">People by stage</caption>
          <thead><tr><th scope="col">Stage</th><th scope="col" className="num">People</th><th scope="col">Who</th></tr></thead>
          <tbody>{d.rows.map((r) => <tr key={r.stage}><th scope="row">{r.label}</th><td className="num">{r.n}</td><td>{r.people.map((p) => p.name).join(', ') || '—'}</td></tr>)}</tbody>
        </table>
      )}
      <p className="t14 muted">{d.total} {d.total === 1 ? 'person' : 'people'} across {d.roles.length === 1 ? d.roles[0].title : `${d.roles.length} roles`}. {d.hidden ? `${d.hidden} more ${d.hidden === 1 ? 'isn’t' : 'aren’t'} shown because of their privacy settings; they’re counted here, never named.` : 'Everyone in this pipeline is shown.'}</p>
    </div>
  );
}

// =====================================================================================================
// SC-124 · map: where candidates are (city level, no basemap)
// =====================================================================================================
const W = 600, H = 470;
const proj = ([lat, lon]: [number, number]) => ({ x: ((lon - VIEW.lonMin) / (VIEW.lonMax - VIEW.lonMin)) * W, y: H - ((lat - VIEW.latMin) / (VIEW.latMax - VIEW.latMin)) * H });
export function MapView({ w, a, art, compact }: { w: World; a: Actor; art: QArtifact; compact?: boolean }) {
  const d = mapData(w, a, art.scope.mandate);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [sel, setSel] = useState<string | null>(null);
  const [wref, ww] = useWidth<HTMLDivElement>(W);
  // Text stays at real 12–15 px whatever the map's rendered width (viewBox units scale with it).
  const k = Math.max(1, W / Math.max(1, ww));
  if (!d.total) return <p className="qt-empty">{d.hidden ? `No one to place: ${d.hidden} ${d.hidden === 1 ? 'person isn’t' : 'people aren’t'} shown because of their privacy settings.` : 'No candidates yet, so there’s nothing to map.'}</p>;
  const inView = d.places.filter((p) => p.inView), outside = d.places.filter((p) => !p.inView);
  const cur = d.places.find((p) => p.city === sel);
  if (compact) return <ul className="qt-mini">{d.places.slice(0, 4).map((p) => <li key={p.city}><span>{p.city}</span><b className="num">{p.people.length}</b></li>)}{d.unknown.length > 0 && <li><span>Location not shared</span><b className="num">{d.unknown.length}</b></li>}</ul>;
  const list = (
    <table className="ds-table qt-table"><caption className="sr">Candidates by city</caption>
      <thead><tr><th scope="col">City</th><th scope="col" className="num">People</th><th scope="col">Who</th></tr></thead>
      <tbody>
        {d.places.map((p) => <tr key={p.city}><th scope="row">{p.city}{!p.inView ? <span className="t14 muted"> · outside the map</span> : null}</th><td className="num">{p.people.length}</td><td>{p.people.map((x) => x.name).join(', ')}</td></tr>)}
        {d.unknown.length > 0 && <tr><th scope="row">Location not shared</th><td className="num">{d.unknown.length}</td><td>{d.unknown.map((x) => x.name).join(', ')}</td></tr>}
      </tbody>
    </table>
  );
  return (
    <div className="qt-stack">
      <Toggle label="Show as" value={view} set={setView} options={[{ id: 'map', label: 'Map' }, { id: 'list', label: 'List' }]} />
      {view === 'list' ? list : (
        <div className="qt-mapwrap" ref={wref}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label={`Candidates by city, ${inView.length} cities on the map`} className="qt-map">
            {[4, 6, 8, 10, 12].map((lat) => <line key={lat} x1={0} x2={W} y1={proj([lat, 0]).y} y2={proj([lat, 0]).y} className="qt-grat" />)}
            {[0, 2, 4, 6, 8].map((lon) => <line key={lon} y1={0} y2={H} x1={proj([0, lon]).x} x2={proj([0, lon]).x} className="qt-grat" />)}
            {Object.entries(CITIES).filter(([c, ll]) => !d.places.some((p) => p.city === c) && proj(ll).x > 0 && proj(ll).x < W && proj(ll).y > 0 && proj(ll).y < H).map(([c, ll]) => <g key={c} aria-hidden="true"><circle cx={proj(ll).x} cy={proj(ll).y} r={2.5 * k} className="qt-ghost" />{k < 1.3 && <text x={proj(ll).x > W - 90 ? proj(ll).x - 7 : proj(ll).x + 7} textAnchor={proj(ll).x > W - 90 ? 'end' : 'start'} y={proj(ll).y + (c === 'Uyo' ? -6 : 4)} className="qt-ghosttxt" style={{ fontSize: 12 * k }}>{c}</text>}</g>)}
            {inView.map((p, i) => {
              const { x, y } = proj(p.ll); const r = (7 + Math.sqrt(p.people.length) * 6) * Math.sqrt(k);
              const left = x > W - 130 * k;
              return (
                <g key={p.city}>
                  <motion.circle cx={x} cy={y} initial={{ r: 0 }} animate={{ r }} transition={{ duration: DUR.slow, ease: EASE.enter, delay: i * 0.04 }} className="qt-dot" data-on={sel === p.city ? '1' : undefined} />
                  <text x={left ? x - r - 6 : x + r + 6} y={y - 2 * k} textAnchor={left ? 'end' : 'start'} className="qt-cityname" style={{ fontSize: 15 * k }}>{p.city}</text>
                  <text x={left ? x - r - 6 : x + r + 6} y={y + 15 * k} textAnchor={left ? 'end' : 'start'} className="qt-citynum num" style={{ fontSize: 13 * k }}>{p.people.length} {p.people.length === 1 ? 'person' : 'people'}</text>
                  <circle cx={x} cy={y} r={Math.max(22 * k, r + 4)} fill="transparent" tabIndex={0} role="button" aria-label={`${p.city}: ${p.people.length} ${p.people.length === 1 ? 'person' : 'people'}`} className="qt-hit"
                    onMouseEnter={() => setSel(p.city)} onMouseLeave={() => setSel(null)} onFocus={() => setSel(p.city)} onBlur={() => setSel(null)} />
                </g>
              );
            })}
          </svg>
          <p className="qt-detail t14" aria-live="polite">{cur ? <><b>{cur.city}: {cur.people.length}</b> · {cur.people.map((x) => x.name).join(', ')}</> : 'Point at or tab to a city to see who is there.'}</p>
          {(outside.length > 0 || d.unknown.length > 0) && (
            <ul className="qt-outside" aria-label="Not on this map">
              {outside.map((p) => <li key={p.city}><span aria-hidden="true">→</span> {p.city}: <b className="num">{p.people.length}</b> <span className="muted">outside this view</span></li>)}
              {d.unknown.length > 0 && <li><span aria-hidden="true">?</span> Location not shared: <b className="num">{d.unknown.length}</b> <span className="muted">(unknown, not zero)</span></li>}
            </ul>
          )}
        </div>
      )}
      <p className="t14 muted">City only, as each person put it on their profile; dots sit on approximate city centres, with no basemap and no addresses. {d.hidden ? `${d.hidden} ${d.hidden === 1 ? 'person isn’t' : 'people aren’t'} shown because of their privacy settings.` : ''}</p>
    </div>
  );
}

// =====================================================================================================
// SC-126 · diagram: the hiring process as a vector figure, with a text outline
// =====================================================================================================
export function DiagramView({ w, a, compact }: { w: World; a: Actor; art: QArtifact; compact?: boolean }) {
  const p = processSteps(w, a);
  const [view, setView] = useState<'figure' | 'outline'>('figure');
  const [ref, width] = useWidth<HTMLDivElement>(640);
  const cols = compact ? 1 : Math.max(1, Math.min(4, Math.floor((width + 24) / 190)));
  const bw = Math.min(220, (width - (cols - 1) * 36) / cols), bh = 92, gx = 36, gy = 44;
  const pos = (i: number) => { const row = Math.floor(i / cols); const c = i % cols; const col = row % 2 ? cols - 1 - c : c; return { x: col * (bw + gx), y: row * (bh + gy), row }; };
  const rows = Math.ceil(p.steps.length / cols);
  const svgW = cols * bw + (cols - 1) * gx, svgH = rows * bh + (rows - 1) * gy + 4;
  const saveSvg = () => { const el = document.getElementById('qt-figure'); if (!el) return; const blob = new Blob([el.outerHTML], { type: 'image/svg+xml' }); const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = 'hiring-process.svg'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); };
  if (compact) return <ol className="qt-mini qt-steps">{p.steps.map((s) => <li key={s.id}><span>{s.label}</span>{s.n !== undefined && <b className="num">{s.n}</b>}</li>)}</ol>;
  const outline = (
    <ol className="qt-outline">{p.steps.map((s) => <li key={s.id}><b>{s.label}</b>{s.n !== undefined ? <span className="num"> · {s.n} now</span> : null}{s.here ? <span> · you are here</span> : null}<span className="muted"> — {s.note}</span>{s.gate && <span className="qt-gate">Check: {s.gate}</span>}</li>)}</ol>
  );
  return (
    <div className="qt-stack">
      <div className="qt-row"><Toggle label="Show as" value={view} set={setView} options={[{ id: 'figure', label: 'Figure' }, { id: 'outline', label: 'Outline' }]} />{view === 'figure' && <button type="button" className="ds-btn quiet" onClick={saveSvg}>Save as SVG</button>}</div>
      {view === 'outline' ? outline : (
        <div ref={ref} className="qt-figure">
          <svg id="qt-figure" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${svgW} ${svgH}`} width="100%" role="img" aria-label={`${p.title}: ${p.steps.map((s) => s.label).join(', then ')}. The outline view has the full text.`}>
            {p.steps.slice(1).map((s, k) => {
              const i = k + 1; const A = pos(i - 1), B = pos(i);
              const d = A.row === B.row ? (B.x > A.x ? `M${A.x + bw} ${A.y + bh / 2} H${B.x - 6}` : `M${A.x} ${A.y + bh / 2} H${B.x + bw + 6}`) : `M${A.x + bw / 2} ${A.y + bh} V${B.y - 6}`;
              const ex = A.row === B.row ? (B.x > A.x ? B.x - 6 : B.x + bw + 6) : B.x + bw / 2, ey = A.row === B.row ? B.y + bh / 2 : B.y - 6;
              const dir = A.row === B.row ? (B.x > A.x ? 0 : 180) : 90;
              return <g key={s.id}><motion.path d={d} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: DUR.slow, delay: 0.05 * i }} /><path d="M0 -5 L8 0 L0 5 Z" fill="var(--ink-3)" transform={`translate(${ex} ${ey}) rotate(${dir}) translate(-2 0)`} /></g>;
            })}
            {p.steps.map((s, i) => { const { x, y } = pos(i); return (
              <g key={s.id} transform={`translate(${x} ${y})`}>
                <rect width={bw} height={bh} rx={12} fill={s.here ? 'var(--wash)' : 'var(--sheet)'} stroke={s.here ? 'var(--ink)' : 'var(--rule-2)'} strokeWidth={s.here ? 2 : 1} />
                <text x={14} y={26} className="qt-fig-title">{s.label}{s.n !== undefined ? <tspan className="qt-fig-n" dx={8}>{s.n}</tspan> : null}</text>
                <foreignObject x={14} y={34} width={bw - 24} height={bh - 38}><p className="qt-fig-note">{s.gate ? `◇ ${s.gate}` : s.note}</p></foreignObject>
              </g>); })}
          </svg>
        </div>
      )}
      <p className="t14 muted">Drawn from: {p.basis.join(' · ')}. Counts are live. ◇ marks a check where a person decides.</p>
    </div>
  );
}

// =====================================================================================================
// SC-127 · narrated video: a storyboard with captions and a transcript (simulated) · MO-032
// =====================================================================================================
const frameMs = (f: Frame) => Math.max(2600, (wordsOf(f.caption).length / WPS) * 1000);
export function VideoView({ w, art, compact, start = 0, onFrame }: { w: World; art: QArtifact; compact?: boolean; start?: number; onFrame?: (i: number) => void }) {
  const sb = useMemo(() => storyboard(w, art.scope), [w, art.scope]);
  const net = w.network;
  const built = sb ? Math.min(sb.frames.length, Math.floor((elapsed(art) / art.buildMs) * sb.frames.length)) : 0;
  const building = !!sb && built < sb.frames.length;
  useTick(building, 250);
  const [i, setI] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [t0, setT0] = useState(0);
  const [paused, setPaused] = useState<string | null>(null);
  const [showT, setShowT] = useState(false);
  useTick(playing, 120);
  useEffect(() => { onFrame?.(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (playing && net === 'offline') { setPlaying(false); setPaused(`Stopped at frame ${i + 1}: you went offline. Resume when you’re back.`); } }, [net, playing, i]);
  if (!sb) return <p className="qt-empty">I couldn’t find that role, so there’s nothing to show.</p>;
  const f = sb.frames[Math.min(i, sb.frames.length - 1)];
  const pos = playing ? Date.now() - t0 : 0;
  if (playing && pos > frameMs(f)) { if (i < sb.frames.length - 1) { setI(i + 1); setT0(Date.now()); } else { setPlaying(false); setPaused(null); } }
  const words = wordsOf(f.caption); const said = playing ? Math.min(words.length, Math.floor((pos / 1000) * WPS) + 1) : words.length;
  if (building) return (
    <div className="qt-video" aria-busy="true">
      <div className="qt-screen qt-screen-building"><QMark mood="working" agents={[{ label: 'frames', done: built, total: sb.frames.length }]} size={40} /><p>Drawing frame {built + 1} of {sb.frames.length}</p></div>
      <ol className="qt-strip">{sb.frames.map((x, k) => <li key={x.title} data-done={k < built ? '1' : undefined}>{k < built ? x.title : '…'}</li>)}</ol>
    </div>
  );
  const play = () => { if (net === 'offline') { setPaused('You’re offline. The storyboard is saved here; play resumes when you reconnect.'); return; } setPaused(null); setPlaying(true); setT0(Date.now()); };
  const pause = () => { setPlaying(false); setPaused(`Paused at frame ${i + 1} of ${sb.frames.length}. Resume picks up here.`); };
  const screen = (
    <div className="qt-screen" aria-roledescription="storyboard frame" aria-label={`Frame ${i + 1} of ${sb.frames.length}: ${f.title}`}>
      <span className="qt-simtag">Simulated video · storyboard</span>
      <AnimatePresence mode="wait"><motion.div key={i} className="qt-frame" {...arrive}>
        <span className="lab">{i + 1} / {sb.frames.length}</span>
        <h2 className="voice">{f.title}</h2>
        <ul>{f.lines.map((l) => <li key={l}>{l}</li>)}</ul>
      </motion.div></AnimatePresence>
      <p className="qt-caption" aria-live={playing ? 'off' : 'polite'}>{words.slice(0, said).join(' ')}<span className="qt-unsaid">{said < words.length ? ` ${words.slice(said).join(' ')}` : ''}</span></p>
    </div>
  );
  if (compact) return <div className="qt-video qt-video-sm">{screen}</div>;
  return (
    <div className="qt-video">
      {screen}
      <div className="qt-controls" role="group" aria-label="Playback">
        <button type="button" className="ds-btn" onClick={() => { setPlaying(false); setI(Math.max(0, i - 1)); }} disabled={i === 0} aria-label="Previous frame">‹</button>
        {playing ? <button type="button" className="ds-btn primary" onClick={pause}>Pause</button> : <button type="button" className="ds-btn primary" onClick={play}>{paused ? 'Resume' : i === sb.frames.length - 1 && !paused ? 'Play from here' : 'Play'}</button>}
        <button type="button" className="ds-btn" onClick={() => { setPlaying(false); setI(Math.min(sb.frames.length - 1, i + 1)); }} disabled={i === sb.frames.length - 1} aria-label="Next frame">›</button>
        <span className="qt-speakline">{playing ? <><QMark mood="speaking" level={amplitude(words[Math.max(0, said - 1)] ?? '')} size={22} /> Q is narrating (captions; no audio in the prototype)</> : paused ? <span role="status">{paused}</span> : 'Captions are always on.'}</span>
      </div>
      <ol className="qt-strip" aria-label="Frames">{sb.frames.map((x, k) => <li key={x.title}><button type="button" aria-current={k === i ? 'true' : undefined} onClick={() => { setPlaying(false); setI(k); }}>{k + 1}. {x.title}</button></li>)}</ol>
      <div className="qt-row"><button type="button" className="ds-btn quiet" aria-expanded={showT} onClick={() => setShowT(!showT)}>{showT ? 'Hide transcript' : 'Read the transcript'}</button></div>
      {showT && <p className="qt-transcript">{transcriptOf(sb.frames)}</p>}
      <dl className="qt-prov">
        <div><dt>Made by</dt><dd>Q, from {sb.basis}</dd></div>
        <div><dt>Voice</dt><dd>Q’s synthetic voice. No one’s voice was cloned; shown as captions here.</dd></div>
        <div><dt>People in it</dt><dd>None. No candidate data was used.</dd></div>
        <div><dt>Rendering</dt><dd>Simulated: a five-frame storyboard. No video file was made.</dd></div>
      </dl>
    </div>
  );
}

// =====================================================================================================
// SC-128 · secure browsing: sandboxed, read-only snapshot inside an untrusted-content fence
// =====================================================================================================
export function LinkRow({ l, onPick, picked }: { l: WebLink; onPick: (l: WebLink) => void; picked: boolean }) {
  const ok = allowed(l.url); const f = l.file ? fileOf(l.file) : undefined;
  return (
    <li className="qt-link" data-picked={picked ? '1' : undefined}>
      <button type="button" className="qt-linkbtn" aria-describedby={`pv-${l.url}`} onClick={() => onPick(l)} onFocus={() => onPick(l)} onMouseEnter={() => onPick(l)}>{l.label}</button>
      <span id={`pv-${l.url}`} className="qt-preview t14">
        <span className="qt-domain">{domainOf(l.url)}</span>
        {!ok && <span className="ds-tag" data-k="risk">Not allowed</span>}
        {f && <span className="muted">{f.type} · {f.sizeMb} MB · {f.sizeMb > 25 ? 'over the 25 MB limit' : 'scanned before anyone can open it'}</span>}
        {!f && ok && pageOf(l.url) && <span className="muted">Page: {pageOf(l.url)!.title}</span>}
      </span>
    </li>
  );
}
export function BrowseView({ w, art, compact }: { w: World; art: QArtifact; compact?: boolean }) {
  const p = pageOf(art.scope.url);
  const loading = elapsed(art) < art.buildMs;
  useTick(loading, 150);
  const [pick, setPick] = useState<WebLink | null>(null);
  const a = actorOf(w);
  if (art.denied) return <p className="qt-empty">{art.denied}</p>;
  if (!p) return <p className="qt-empty">The page didn’t load. Nothing was saved.</p>;
  const inj = p.blocks.filter((b) => b.injection);
  if (compact) return (
    <div className="qt-mini-browse"><span className="qt-domain">{domainOf(p.url)}</span><p>{p.summary}</p>{inj.length > 0 && <p className="qt-ignored t14">This page has text that tries to instruct Q. Q ignored it.</p>}</div>
  );
  const choose = (l: WebLink) => {
    if (!allowed(l.url)) return;
    if (l.file) act('qt.download', { file: l.file, from: p.url }); else act('qt.browse', { url: l.url });
  };
  const requested = (d: string) => (w.areas['q-tools'] as { allowRequests: { domain: string; by: string }[] } | undefined)?.allowRequests.some((r) => r.domain === d && r.by === a.id);
  return (
    <div className="qt-stack">
      <div className="qt-addr" role="group" aria-label="Page address and safety">
        <span className="qt-domain">{p.url}</span>
        <span className="qt-tags"><span className="ds-tag">Sandboxed</span><span className="ds-tag">Read-only</span><span className="ds-tag">Scripts off</span><span className="ds-sim">Simulated fetch</span></span>
      </div>
      {!loading && <div className="ch-q qt-qline qt-qread"><QMark mood="idle" size={24} /><p className="voice"><span className="sr">Q’s reading: </span>{p.summary}{inj.length ? ' One paragraph tries to instruct me; I ignored it.' : ''}</p></div>}
      {loading ? <div className="qt-fence" aria-busy="true"><p className="muted">Fetching a read-only copy…</p><div className="ds-skeleton" style={{ height: 14, width: '70%' }} /><div className="ds-skeleton" style={{ height: 14, width: '90%' }} /></div> : (
        <section className="qt-fence" aria-label="Fetched page text, untrusted">
          <p className="qt-fence-lab"><span className="lab">Fetched text · untrusted</span><span className="t14">Q reads this as data. Nothing on a page can instruct Q.</span></p>
          <h2 className="voice qt-pagetitle">{p.title}</h2>
          {p.blocks.map((b, k) => b.injection ? (
            <div key={k} className="qt-inject" role="note">
              <p><s>{b.text}</s></p>
              <p className="t14"><b>Ignored.</b> This text tries to give Q an instruction. Q treats page text as information only, so it did nothing, sent nothing and told you here.</p>
            </div>
          ) : b.t === 'h' ? <h3 key={k}>{b.text}</h3> : <p key={k} className={b.t === 'meta' ? 't14 muted' : undefined}>{b.text}</p>)}
        </section>
      )}
      {!loading && p.links.length > 0 && (
        <section className="qt-links" aria-labelledby="qt-links-h">
          <h2 id="qt-links-h" className="lab">Links on this page</h2>
          <ul>{p.links.map((l) => <LinkRow key={l.url} l={l} picked={pick?.url === l.url} onPick={setPick} />)}</ul>
          {pick && (
            <div className="qt-pickbar" role="status">
              {allowed(pick.url) ? <><span>{pick.file ? `Download ${fileOf(pick.file)?.name}? It’s scanned first; you can open it only if it’s clean.` : `Open ${domainOf(pick.url)} in the same sandbox?`}</span><button type="button" className="ds-btn primary" onClick={() => choose(pick)}>{pick.file ? 'Download and scan' : 'Open read-only'}</button></>
                : <><span><b>{domainOf(pick.url)} isn’t on the allowed list,</b> so Q won’t open it. An admin can add it.</span>{requested(domainOf(pick.url)) ? <span className="ds-tag" data-k="busy">Asked an admin</span> : <button type="button" className="ds-btn" onClick={() => act('qt.allow.request', { domain: domainOf(pick.url) })}>Ask an admin</button>}</>}
            </div>
          )}
        </section>
      )}
      <dl className="qt-prov">
        <div><dt>Publisher</dt><dd>{p.publisher}</dd></div>
        <div><dt>Published</dt><dd>{fmtDay(p.publishedAt)}</dd></div>
        <div><dt>Licence</dt><dd>{p.licence}</dd></div>
      </dl>
    </div>
  );
}

// =====================================================================================================
// SC-130 · download and extraction (MO-034: the receipt appears only after the scan completes)
// =====================================================================================================
const STAGE_WORD = { CHECKING: 'Checking size and type', SCANNING: 'Scanning for threats', EXTRACTING: 'Extracting text', CLEAN: 'Clean', BLOCKED: 'Blocked', QUARANTINED: 'Quarantined' } as const;
export function DownloadCard({ w, art, compact }: { w: World; art: QArtifact; compact?: boolean }) {
  const f = fileOf(art.scope.file);
  const s = f ? scanStage(art, f) : null;
  const done = !!s && ['CLEAN', 'BLOCKED', 'QUARANTINED'].includes(s.stage);
  useTick(!done, 150);
  const opened = (w.areas['q-tools'] as { opened: string[] } | undefined)?.opened.includes(art.id);
  if (art.denied) return <p className="qt-empty">{art.denied}</p>;
  if (!f || !s) return <p className="qt-empty">That file couldn’t be found.</p>;
  const steps = [{ k: 'CHECKING', l: `Size and type (limit 25 MB)` }, { k: 'SCANNING', l: 'Threat scan' }, { k: 'EXTRACTING', l: 'Text extraction' }] as const;
  const st = (idx: number) => (s.step > idx + 1 || (done && s.step === idx + 1 && s.stage === 'CLEAN') ? (idx === 2 && s.stage !== 'CLEAN' && done ? 'skip' : 'done') : s.step === idx + 1 ? (done ? 'stop' : 'run') : (done ? 'skip' : 'wait'));
  return (
    <article className="qt-dl" data-outcome={done ? s.stage : 'RUN'} aria-label={`${f.name}: ${STAGE_WORD[s.stage]}`}>
      <div className="qt-dl-head"><b className="qt-fname">{f.name}</b><span className="t14 muted">{f.type} · {f.sizeMb} MB · from {domainOf(f.url)}</span></div>
      <ol className="qt-scan" aria-label="Checks">{steps.map((x, i) => { const v = st(i); return <li key={x.k} data-s={v}><i aria-hidden="true" />{x.l}<span className="sr"> · {v === 'done' ? 'passed' : v === 'run' ? 'in progress' : v === 'stop' ? 'stopped here' : v === 'skip' ? 'not run' : 'waiting'}</span>{v === 'run' && x.k === 'EXTRACTING' && s.page ? <span className="num t14 muted"> page {s.page} of {f.pages}</span> : null}</li>; })}</ol>
      {!done ? <p className="t14" role="status">{STAGE_WORD[s.stage]}… Nobody can open the file until this finishes.</p> : (
        <motion.div className="qt-receipt" {...arrive} role="status">
          <span className="ds-tag" data-k={s.stage === 'CLEAN' ? 'ok' : 'risk'}>{STAGE_WORD[s.stage]}</span>
          <p className="t14" style={{ margin: 0 }}>{f.reason}</p>
          {!compact && <p className="t14 muted" style={{ margin: 0 }}>Scan receipt · simulated · {fmtDay(simNow(w).toISOString())} · {s.stage === 'CLEAN' ? `${f.pages} pages of text extracted` : 'file kept out of your workspace'}</p>}
          {s.stage === 'CLEAN' && !compact && (opened ? <span className="ds-tag">Opened</span> : <button type="button" className="ds-btn" onClick={() => act('qt.open', { id: art.id })}>Open read-only</button>)}
        </motion.div>
      )}
      {opened && !compact && f.extract && <div className="qt-extract"><span className="lab">Extracted text · {f.pages} pages</span>{f.extract.map((x) => <p key={x}>{x}</p>)}</div>}
    </article>
  );
}

export function ArtifactBody({ w, art, compact }: { w: World; art: QArtifact; compact?: boolean }): ReactNode {
  const a = actorOf(w);
  if (art.denied) return <p className="qt-empty">{art.denied}</p>;
  switch (art.kind) {
    case 'CHART': return <ChartView w={w} a={a} art={art} compact={compact} />;
    case 'MAP': return <MapView w={w} a={a} art={art} compact={compact} />;
    case 'DIAGRAM': return <DiagramView w={w} a={a} art={art} compact={compact} />;
    case 'VIDEO': return <VideoView w={w} art={art} compact={compact} />;
    case 'BROWSE': return <BrowseView w={w} art={art} compact={compact} />;
    case 'DOWNLOAD': return <DownloadCard w={w} art={art} compact={compact} />;
  }
}
export const useW = () => useWorld((x) => x);
