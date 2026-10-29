// J7 atlas views. Desktop: a radial atlas (distance from you = competencies not yet shown), with
// collision-aware labels and family collapse at scale. Phones: distance BANDS (below), because a radial
// chart at 340px can only be glanced at; bands keep every name readable and tappable.
import { useState } from 'react';
import { motion } from 'motion/react';
import { useWidth } from '../../ds/Workspace';
import type { CState, Comp, JOcc } from './personas';

export const shown = (s: CState) => s === 'verified' || s === 'full';
export const gapsOf = (o: JOcc, st: (id: string) => CState) => o.needs.filter((n) => !shown(st(n)));

export function RadialAtlas({ occs, st, sel, onSel, reach, setReach, large, openFam, setOpenFam, moved, fams, goal }: {
  fams: string[]; goal: string; occs: JOcc[]; st: (id: string) => CState; sel: string | null; onSel: (id: string) => void; reach: boolean; setReach: (v: boolean) => void;
  large: boolean; openFam: string | null; setOpenFam: (f: string | null) => void; moved: Record<string, number>;
}) {
  const [ref, w] = useWidth<HTMLDivElement>(720);
  const [hot, setHot] = useState<string | null>(null);
  const narrow = w < 560;
  const H = narrow ? w + 20 : Math.min(640, Math.max(500, w * 0.74));
  const cx = w / 2, cy = H / 2 + 6;
  const maxR = Math.min(w / 2 - (narrow ? 22 : 150), H / 2 - 40);
  const r0 = maxR * 0.2, step = (maxR - r0) / 4;
  const rad = (g: number) => r0 + Math.min(g, 4) * step;
  const famAngle = (f: string) => -90 + fams.indexOf(f) * (360 / fams.length);
  const pos = (o: JOcc, g: number, i: number, nInFam: number) => {
    const spread = large && openFam === o.family ? 120 : Math.min(360 / fams.length - 10, 16 * nInFam);
    const a = ((famAngle(o.family) + (nInFam > 1 ? (i / (nInFam - 1) - 0.5) * spread : 0)) * Math.PI) / 180;
    return { x: cx + rad(g) * Math.cos(a), y: cy + rad(g) * Math.sin(a), a };
  };
  const gap = (o: JOcc) => gapsOf(o, st).length;
  type N = { kind: 'occ'; key: string; o: JOcc; g: number; x: number; y: number; a: number } | { kind: 'fam'; key: string; f: string; n: number; g: number; x: number; y: number; a: number };
  const nodes: N[] = fams.flatMap((f): N[] => {
    const list = occs.filter((o) => o.family === f).sort((a, b) => gap(a) - gap(b) || a.label.localeCompare(b.label));
    if (large && openFam !== f) {
      const g = gap(list[0]);
      return [{ kind: 'fam' as const, key: `f-${f}`, f, n: list.length, g, ...pos(list[0], g, 0, 1) }];
    }
    return list.map((o, i) => ({ kind: 'occ' as const, key: o.id, o, g: gap(o), ...pos(o, gap(o), i, list.length) }));
  });

  // Label placement: greedy, collision-aware. Priority: goal, selected, hovered, then nearest first.
  // A label that cannot be placed without overlap is hidden (the node keeps its accessible name, and
  // hovering or focusing it shows the label); the List view always has every name.
  const fs = narrow ? 12 : 13;
  const famR = maxR + (narrow ? 22 : 30);
  type Box = { x0: number; y0: number; x1: number; y1: number };
  const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const boxes: Box[] = fams.map((f) => { const a = (famAngle(f) * Math.PI) / 180; const x = Math.min(w - f.length * 4.6 - 4, Math.max(f.length * 4.6 + 4, cx + famR * Math.cos(a))), y = cy + famR * Math.sin(a); const hw = f.length * 4.6 + 6; return { x0: x - hw, y0: y - 9, x1: x + hw, y1: y + 9 }; });
  boxes.push({ x0: cx - 22, y0: cy - 22, x1: cx + 22, y1: cy + 22 });
  [0, 1, 2, 3, 4].forEach((g) => boxes.push({ x0: cx + 2, y0: cy - rad(g) + 2, x1: cx + 20, y1: cy - rad(g) + 16 }));
  nodes.forEach((n) => boxes.push({ x0: n.x - 9, y0: n.y - 9, x1: n.x + 9, y1: n.y + 9 }));
  const textOf = (n: N) => (n.kind === 'fam' ? `${n.f} · ${n.n}` : `${narrow ? n.o.short : n.o.label}${n.o.id === goal ? ' · goal' : ''}`);
  const prio = (n: N) => (n.kind === 'occ' && n.o.id === goal ? -3 : n.key === sel ? -2 : n.kind === 'fam' ? 0 : n.g + (n.o.extra ? 0.5 : 0));
  const labels: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' } | null> = {};
  [...nodes].sort((a, b) => prio(a) - prio(b)).forEach((n) => {
    const faded = n.kind === 'occ' && reach && n.g > 2;
    const tw = textOf(n).length * fs * 0.56, r = n.kind === 'fam' ? 20 : 14;
    const right = Math.cos(n.a) >= -0.01;
    const cands: { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }[] = [
      { dx: right ? r : -r, dy: 4, anchor: right ? 'start' : 'end' }, { dx: right ? -r : r, dy: 4, anchor: right ? 'end' : 'start' },
      { dx: 0, dy: -r - 2, anchor: 'middle' }, { dx: 0, dy: r + 12, anchor: 'middle' },
    ];
    const forced = n.key === sel || (n.kind === 'occ' && n.o.id === goal);
    if (faded && !forced) { labels[n.key] = null; return; }
    const own = { x0: n.x - 9, y0: n.y - 9, x1: n.x + 9, y1: n.y + 9 };
    for (const c of cands) {
      const x0 = n.x + c.dx - (c.anchor === 'end' ? tw : c.anchor === 'middle' ? tw / 2 : 0);
      const b = { x0, y0: n.y + c.dy - 12, x1: x0 + tw, y1: n.y + c.dy + 4 };
      if (b.x0 < 2 || b.x1 > w - 2 || b.y0 < 2 || b.y1 > H - 2) continue;
      if (boxes.some((o) => o !== own && !(o.x0 === own.x0 && o.y0 === own.y0) && hit(o, b))) continue;
      labels[n.key] = c; boxes.push(b); return;
    }
    labels[n.key] = forced ? cands[0] : null;
  });
  const within = occs.filter((o) => gap(o) <= 2).length;
  const movedN = Object.entries(moved).filter(([oid, g0]) => { const o = occs.find((x) => x.id === oid); return o && gap(o) < g0; }).length;
  const act = (n: N) => (n.kind === 'fam' ? setOpenFam(n.f) : onSel(n.o.id));
  return (
    <section className="ds-sheet" aria-labelledby="atlas-h" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 id="atlas-h" className="voice t24" style={{ margin: 0, maxWidth: '30ch' }}>{movedN ? `One reviewed piece of work moved ${movedN} occupations a ring closer.` : within ? `${within} occupations are two gaps or fewer away.` : 'Nothing is within two gaps yet. Reviewed work moves you closer.'}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ds-filter" aria-pressed={reach} onClick={() => setReach(!reach)}>Within 2 gaps</button>
          {large && openFam && <button type="button" className="ds-filter" onClick={() => setOpenFam(null)}>Collapse {openFam}</button>}
        </div>
      </div>
      <p className="t14 muted" style={{ margin: 0 }}>Rings count competencies you haven’t shown yet: 0 at the centre, 4 or more at the edge.{large ? ' Families are grouped; select one to open it.' : ''} Names that don’t fit appear on hover; the List view has them all.</p>
      <div ref={ref} style={{ minWidth: 0 }}>
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Career atlas. Occupations placed by family and by number of competencies still to show.">
          {[0, 1, 2, 3, 4].map((g) => <circle key={g} cx={cx} cy={cy} r={rad(g)} fill="none" stroke={g === 2 && reach ? 'var(--ink-3)' : 'var(--rule)'} strokeDasharray={g === 2 && reach ? undefined : '2 4'} strokeWidth={g === 2 && reach ? 1.5 : 1} />)}
          {[0, 1, 2, 3, 4].map((g) => <text key={g} x={cx + 4} y={cy - rad(g) + 13} fontSize={11} fill="var(--ink-3)" fontFamily="var(--data)">{g === 4 ? '4+' : g}</text>)}
          {fams.map((f) => { const a = (famAngle(f) * Math.PI) / 180; const hw = f.length * 4.6 + 4; const x = Math.min(w - hw, Math.max(hw, cx + famR * Math.cos(a))), y = cy + famR * Math.sin(a); return <text key={f} x={x} y={y + 4} fontSize={12} textAnchor="middle" fill="var(--ink-3)" fontFamily="var(--data)" letterSpacing=".08em">{f.toUpperCase()}</text>; })}
          {Object.entries(moved).map(([oid, g0]) => {
            const n = nodes.find((x) => x.key === oid); if (!n || n.kind !== 'occ' || g0 === n.g) return null;
            const x0 = cx + rad(g0) * Math.cos(n.a), y0 = cy + rad(g0) * Math.sin(n.a);
            return <g key={oid}><motion.line x1={x0} y1={y0} x2={n.x} y2={n.y} stroke="var(--gold-ink)" strokeWidth={1.5} strokeDasharray="2 3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.35 }} /><circle cx={x0} cy={y0} r={3} fill="none" stroke="var(--gold-ink)" strokeWidth={1} /></g>;
          })}
          <circle cx={cx} cy={cy} r={narrow ? 16 : 20} fill="var(--ink)" />
          <text x={cx} y={cy + 4} fontSize={12} textAnchor="middle" fill="var(--paper)" fontWeight={600}>You</text>
          {nodes.map((n) => {
            const faded = n.kind === 'occ' && reach && n.g > 2;
            const isSel = sel === n.key, isGoal = n.kind === 'occ' && n.o.id === goal;
            const L = labels[n.key];
            const name = n.kind === 'fam' ? `${n.f}: ${n.n} occupations, nearest is ${n.g} gaps away. Open family.` : `${n.o.label}, ${n.g} ${n.g === 1 ? 'gap' : 'gaps'}${isGoal ? ', your goal' : ''}`;
            return (
              <motion.g key={n.key} className="ds-node" role="button" tabIndex={0} aria-label={name} aria-pressed={n.kind === 'occ' ? isSel : undefined}
                onClick={() => act(n)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(n); } }}
                onMouseEnter={() => setHot(n.key)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(n.key)} onBlur={() => setHot(null)}
                initial={false} animate={{ opacity: faded ? 0.28 : 1 }} transition={{ duration: 0.3 }}>
                <motion.g initial={false} animate={{ x: n.x, y: n.y }} transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}>
                  <circle r={20} fill="transparent" />
                  {n.kind === 'fam' ? (
                    <><circle className="ring" r={15} fill="var(--wash)" stroke="var(--ink-2)" strokeWidth={1.5} /><text y={4} fontSize={11} textAnchor="middle" fontFamily="var(--data)" fill="var(--ink)">{n.n}</text></>
                  ) : (
                    <><circle className="ring" r={isGoal ? 9 : 7} fill={isSel ? 'var(--gold-wash)' : n.g === 0 ? 'var(--ink)' : 'var(--sheet)'} stroke="var(--ink)" strokeWidth={isGoal ? 2.5 : 1.5} />{isGoal && <circle r={14} fill="none" stroke="var(--ink)" strokeWidth={1} />}</>
                  )}
                  {L && <text x={L.dx} y={L.dy} fontSize={fs} fontWeight={isGoal || isSel || hot === n.key ? 600 : 400} textAnchor={L.anchor} fill={n.kind === 'fam' ? 'var(--ink-2)' : 'var(--ink)'} style={{ paintOrder: 'stroke', stroke: 'var(--sheet)', strokeWidth: 4, cursor: 'pointer' }}>{textOf(n)}</text>}
                </motion.g>
              </motion.g>
            );
          })}
          {(() => {
            const n = nodes.find((x) => x.key === hot);
            if (!n || labels[n.key]) return null;
            const t = textOf(n), tw = t.length * fs * 0.56 + 12, right = n.x + 16 + tw < w;
            return (
              <g pointerEvents="none">
                <rect x={right ? n.x + 14 : n.x - 14 - tw} y={n.y - 13} width={tw} height={24} rx={6} fill="var(--ink)" />
                <text x={right ? n.x + 20 : n.x - 20} y={n.y + 4} fontSize={fs} textAnchor={right ? 'start' : 'end'} fill="var(--paper)" fontWeight={600}>{t}</text>
              </g>
            );
          })()}
        </svg>
      </div>
      {narrow && (
        <ol aria-label="Nearest occupations" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {occs.map((o) => ({ o, g: gap(o) })).sort((a, b) => a.g - b.g || a.o.label.localeCompare(b.o.label)).slice(0, 5).map(({ o, g }) => (
            <li key={o.id} style={{ borderTop: '1px solid var(--rule)' }}>
              <button type="button" onClick={() => onSel(o.id)} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, width: '100%', padding: '10px 0', minHeight: 44, alignItems: 'center' }}>
                <span><span style={{ fontWeight: 600 }}>{o.label}</span><span className="t14 muted"> · {o.family}</span></span>
                <span className="num t14" style={{ fontFamily: 'var(--data)' }}>{g} {g === 1 ? 'gap' : 'gaps'}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}


export function OccList({ occs, st, reach, onSel, cb }: { cb: (id: string) => Comp; occs: JOcc[]; st: (id: string) => CState; reach: boolean; onSel: (id: string) => void }) {
  const rows = occs.map((o) => ({ o, g: gapsOf(o, st) })).filter((r) => !reach || r.g.length <= 2).sort((a, b) => a.g.length - b.g.length || a.o.label.localeCompare(b.o.label));
  return (
    <section className="ds-sheet" aria-labelledby="list-h" style={{ display: 'grid', gap: 12 }}>
      <h2 id="list-h" className="voice t24" style={{ margin: 0 }}>Nearest first</h2>
      <div className="ds-ledger-wrap">
        <table className="ds-ledger" style={{ minWidth: 0 }}>
          <thead><tr><th scope="col">Occupation</th><th scope="col">Gaps</th><th scope="col" className="hide-narrow">Still to show</th></tr></thead>
          <tbody>
            {rows.map(({ o, g }) => (
              <tr key={o.id}>
                <th scope="row"><button type="button" onClick={() => onSel(o.id)} style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, minHeight: 32, display: 'inline-flex', alignItems: 'center' }}>{o.label}</button><span className="t14 muted" style={{ display: 'block' }}>{o.family}{o.extra ? ' · illustrative' : ''}</span></th>
                <td className="num" style={{ fontFamily: 'var(--data)' }}>{g.length}</td>
                <td className="hide-narrow t14">{g.map((x) => cb(x).label).join(', ') || 'None. Ready to apply.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------- Role sheet: competencies, evidence, practice, work sample ----------------

/** Phone atlas: occupations grouped into distance bands. Same data and filter as the radial view. */
export function BandAtlas({ occs, st, sel, onSel, reach, setReach, moved, goal, fams }: { occs: JOcc[]; st: (id: string) => CState; sel: string | null; onSel: (id: string) => void; reach: boolean; setReach: (v: boolean) => void; moved: Record<string, number>; goal: string; fams: string[] }) {
  const [fam, setFam] = useState<string | null>(null);
  const rows = occs.filter((o) => !fam || o.family === fam).map((o) => ({ o, g: gapsOf(o, st).length }));
  const bands = [0, 1, 2, 3].map((b) => ({ b, list: rows.filter((r) => (b === 3 ? r.g >= 3 : r.g === b)).sort((a, z) => a.o.label.localeCompare(z.o.label)) }));
  const movedN = Object.entries(moved).filter(([id, g0]) => { const r = rows.find((x) => x.o.id === id); return r && r.g < g0; }).length;
  return (
    <section className="ds-sheet" aria-labelledby="band-h" style={{ display: 'grid', gap: 14 }}>
      <h2 id="band-h" className="voice t24" style={{ margin: 0 }}>{movedN ? `${movedN} occupations moved a band closer.` : rows.some((r) => r.g <= 2) ? `${rows.filter((r) => r.g <= 2).length} occupations are two gaps or fewer away.` : `${rows.length} occupations, nearest ${Math.min(...rows.map((r) => r.g))} gaps away.`}</h2>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} role="group" aria-label="Filter by family">
        <button type="button" className="ds-filter" aria-pressed={!fam} onClick={() => setFam(null)}>All</button>
        {fams.map((f) => <button key={f} type="button" className="ds-filter" aria-pressed={fam === f} onClick={() => setFam(fam === f ? null : f)} style={{ flex: 'none' }}>{f}</button>)}
        <button type="button" className="ds-filter" aria-pressed={reach} onClick={() => setReach(!reach)} style={{ flex: 'none' }}>Hide 3+ gaps</button>
      </div>
      {bands.slice(0, 3).every((x) => !x.list.length) && <p className="t14" style={{ margin: 0 }}>Nothing is two gaps or fewer away yet. What you’ve mentioned starts counting once it’s shown with reviewed work.</p>}
      {bands.filter((x) => !(reach && x.b === 3) && !(x.b < 3 && !x.list.length && bands.slice(0, 3).every((y) => !y.list.length))).map(({ b, list }) => (
        <div key={b} style={{ display: 'grid', gap: 8 }}>
          <h3 className="lab" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="40" height="12" aria-hidden="true">{[0, 1, 2, 3].map((k) => <circle key={k} cx={6 + k * 10} cy={6} r={k <= b ? 3.5 : 2} fill={k <= b ? 'var(--ink-2)' : 'none'} stroke="var(--ink-2)" />)}</svg>
            {b === 0 ? 'Ready now · no gaps' : b === 3 ? '3 or more gaps' : `${b} ${b === 1 ? 'gap' : 'gaps'}`} · {list.length}
          </h3>
          {list.length === 0 && <p className="t14 muted" style={{ margin: 0 }}>None in this band{fam ? ` for ${fam}` : ''}.</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {list.map(({ o, g }) => (
              <motion.li key={o.id} layout layoutId={`band-${o.id}`} transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}>
                <button type="button" onClick={() => onSel(o.id)} aria-pressed={sel === o.id} style={{ all: 'unset', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', width: '100%', minHeight: 52, padding: '8px 12px', borderRadius: 12, background: o.id === goal ? 'var(--gold-wash)' : 'var(--paper)', cursor: 'pointer', border: sel === o.id ? '1.5px solid var(--ink)' : '1.5px solid transparent' }}>
                  <span><b style={{ fontWeight: 600 }}>{o.label}</b>{o.id === goal ? <span className="t14" style={{ color: 'var(--gold-ink)' }}> · your goal</span> : null}<span className="t14 muted" style={{ display: 'block' }}>{o.family}{moved[o.id] != null && moved[o.id] > g ? ` · moved from ${moved[o.id]} gaps` : ''}{o.extra ? ' · illustrative' : ''}</span></span>
                  <span className="num t14" style={{ fontFamily: 'var(--data)' }} aria-label={`${g} gaps`}>{g}</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
