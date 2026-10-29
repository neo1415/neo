// Q's presence in Direction D: an open bowl and tail (an abstract Q) with a gold core.
// Rule: Q moves only when something real happens. Every state has a distinct SHAPE and a text label,
// so state never depends on colour or motion (reduced motion shows the same shapes, without travel).
//   idle      still bowl, core at rest
//   listening core grows with the user's input (typing or voice level), bowl unchanged
//   thinking  bowl drawn dashed: Q is reading the request and choosing a plan (no fake spinner)
//   working   one point per agent on the bowl; each advances only when its agent finishes a unit;
//             a faint arc behind each point shows how far it has come
//   waiting   a notch opens at the tail: Q needs a decision before it continues
//   blocked   the bowl breaks: an integration or step failed; the label names it
//   done      the core settles once (the flow's single peak moment)
//   offline   bowl outline only, core hollow
import { motion, useReducedMotion } from 'motion/react';

export type QMood = 'idle' | 'listening' | 'thinking' | 'working' | 'waiting' | 'blocked' | 'done' | 'offline';
export interface QAgent { label: string; done: number; total: number; failed?: boolean }

export const MOOD_LABEL: Record<QMood, string> = {
  idle: 'Ready', listening: 'Listening', thinking: 'Reading your request', working: 'Working', waiting: 'Waiting for you', blocked: 'Needs attention', done: 'Done', offline: 'Offline',
};

const R = 13;
const pt = (deg: number) => { const a = (deg * Math.PI) / 180; return { x: 20 + R * Math.cos(a), y: 20 + R * Math.sin(a) }; };
const arc = (from: number, to: number) => { const a = pt(from), b = pt(to); const large = to - from > 180 ? 1 : 0; return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`; };

export function QMark({ mood = 'idle', agents = [], size = 36, level = 0, title }: { mood?: QMood; agents?: QAgent[]; size?: number; level?: number; title?: string }) {
  const reduce = useReducedMotion();
  const live = mood === 'working' ? agents : [];
  const core = mood === 'done' ? 6.5 : mood === 'listening' ? 5 + Math.min(1, level) * 2 : mood === 'working' ? 4 : mood === 'offline' ? 4.5 : 5;
  const bowlDash = mood === 'thinking' ? '3 3.2' : mood === 'offline' ? '1 3' : undefined;
  // The bowl runs from the tail (45°) clockwise round to 0° — leaving the tail opening.
  const bowl = mood === 'blocked' ? `${arc(60, 175)} ${arc(195, 350)}` : 'M 29.2 29.2 A 13 13 0 1 1 33 20';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={{ flex: 'none', overflow: 'visible' }}>
      <path d={bowl} fill="none" stroke="var(--qmark, #e3c27d)" strokeWidth="2" strokeLinecap="round" strokeDasharray={bowlDash} opacity={mood === 'working' ? 0.45 : 1} />
      {mood === 'waiting'
        ? <><path d="M 27 27 L 30.5 30.5" stroke="var(--qmark, #e3c27d)" strokeWidth="2.4" strokeLinecap="round" /><circle cx="33.6" cy="33.6" r="2.6" fill="none" stroke="var(--qmark, #e3c27d)" strokeWidth="1.6" /></>
        : <path d="M 27 27 L 34 34" stroke="var(--qmark, #e3c27d)" strokeWidth="2.4" strokeLinecap="round" opacity={mood === 'offline' ? 0.5 : 1} />}
      {mood === 'offline'
        ? <circle cx="20" cy="20" r={core} fill="none" stroke="var(--qmark, #e3c27d)" strokeWidth="1.5" />
        : <motion.circle cx="20" cy="20" fill="var(--qmark, #e3c27d)" initial={false} animate={{ r: core }} transition={{ duration: reduce ? 0 : mood === 'done' ? 0.5 : 0.25, ease: 'easeOut' }} />}
      {live.map((a, i) => {
        const start = -90 + i * 37;
        const end = start + (a.total ? a.done / a.total : 0) * 300;
        const done = a.done >= a.total;
        const p = pt(end);
        return (
          <g key={a.label}>
            {end - start > 2 && <path d={arc(start, end)} fill="none" stroke="var(--qmark, #e3c27d)" strokeWidth="2" strokeLinecap="round" opacity={0.35} />}
            <motion.circle initial={false} animate={{ cx: p.x, cy: p.y }} transition={{ duration: reduce ? 0 : 0.38, ease: [0.2, 0.7, 0.2, 1] }}
              r={a.failed ? 2.4 : done ? 1.8 : 2.6} fill={a.failed ? 'none' : done ? 'var(--moon-2, #b9b1a3)' : 'var(--qmark, #e3c27d)'} stroke={a.failed ? '#e78d7f' : 'none'} strokeWidth={1.4} />
          </g>
        );
      })}
    </svg>
  );
}

/** A mood from agent progress plus explicit flags, so every surface derives Q's state the same way. */
export function moodOf({ agents = [], thinking, waiting, blocked, done, offline }: { agents?: QAgent[]; thinking?: boolean; waiting?: boolean; blocked?: boolean; done?: boolean; offline?: boolean }): QMood {
  if (offline) return 'offline';
  if (blocked) return 'blocked';
  if (agents.some((a) => a.done < a.total && !a.failed)) return 'working';
  if (thinking) return 'thinking';
  if (waiting) return 'waiting';
  if (done) return 'done';
  return 'idle';
}

/** The line beside the mark: what Q is doing right now, in words. */
export function presenceLine(mood: QMood, agents: QAgent[] = [], detail?: string) {
  if (detail) return detail;
  const live = agents.filter((a) => a.done < a.total && !a.failed);
  if (mood === 'working' && live.length) return `${live.length} ${live.length === 1 ? 'agent' : 'agents'} · ${live[0].label} ${live[0].done}/${live[0].total}`;
  return MOOD_LABEL[mood];
}
