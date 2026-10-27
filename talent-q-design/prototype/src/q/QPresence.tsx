// Q's presence (decision D3): a crisp gold disc whose ring carries state. Never colour alone:
// each state has a distinct ring shape and a text label for assistive tech and reduced motion.
import { motion, useReducedMotion } from 'motion/react';

export type QState = 'idle' | 'listening' | 'thinking' | 'working' | 'waiting' | 'done' | 'error' | 'offline';

export const Q_STATE_LABEL: Record<QState, string> = {
  idle: 'Q is ready',
  listening: 'Q is listening',
  thinking: 'Q is working out what you asked',
  working: 'Q is working',
  waiting: 'Q is waiting for you',
  done: 'Q has finished',
  error: 'Q hit a problem',
  offline: 'Q is offline',
};

interface Props {
  state: QState;
  size?: number;
  /** 0..1, only for `working`: measured progress from run steps. */
  progress?: number;
  /** 0..1 input level while listening. */
  level?: number;
  label?: boolean;
}

export function QPresence({ state, size = 56, progress = 0, level = 0, label = false }: Props) {
  const reduce = useReducedMotion();
  const r = 23; // ring radius in a 56 viewBox
  const c = 2 * Math.PI * r;
  const discR = state === 'waiting' || state === 'offline' ? 9 : 11;
  const arc = state === 'working' ? Math.max(0.04, Math.min(1, progress)) : state === 'thinking' ? 0.22 : 1;

  return (
    <span className="row gap-3" style={{ display: 'inline-flex' }}>
      <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={Q_STATE_LABEL[state]} data-q-state={state} style={{ flex: 'none' }}>
        {/* track */}
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-line-strong)" strokeWidth="1.25"
          strokeDasharray={state === 'waiting' ? '3 4' : state === 'offline' ? '1 5' : undefined} />
        {/* active ring */}
        {(state === 'working' || state === 'thinking' || state === 'listening' || state === 'done') && (
          <motion.circle
            cx="28" cy="28" r={r} fill="none" stroke="var(--color-q)" strokeWidth="1.75" strokeLinecap="round"
            style={{ rotate: -90, transformOrigin: '28px 28px' }}
            strokeDasharray={`${c * arc} ${c}`}
            animate={state === 'thinking' && !reduce ? { rotate: [-90, 270] } : state === 'listening' ? { opacity: 0.45 + level * 0.55 } : { rotate: -90 }}
            transition={state === 'thinking' ? { duration: 2.4, ease: 'linear', repeat: Infinity } : { duration: 0.24 }}
          />
        )}
        {state === 'error' && <path d="M28 2 v8" stroke="var(--color-risk)" strokeWidth="2.5" strokeLinecap="round" />}
        {/* disc */}
        <motion.circle
          cx="28" cy="28" fill="var(--color-q)"
          initial={false}
          animate={{
            r: state === 'listening' && !reduce ? discR + level * 3 : discR,
            opacity: state === 'waiting' || state === 'offline' ? 0.55 : 1,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        />
        {state === 'done' && !reduce && (
          <motion.circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-q)" strokeWidth="1"
            initial={{ opacity: 0.8, scale: 1 }} animate={{ opacity: 0, scale: 1.18 }} transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ transformOrigin: '28px 28px' }} />
        )}
        {state === 'idle' && !reduce && (
          <motion.circle cx="28" cy="28" r={discR + 4} fill="none" stroke="var(--color-q)" strokeWidth="0.75"
            animate={{ opacity: [0.0, 0.35, 0.0] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }} />
        )}
      </svg>
      {label && <span className="t-label" aria-hidden="true">{Q_STATE_LABEL[state]}</span>}
    </span>
  );
}
