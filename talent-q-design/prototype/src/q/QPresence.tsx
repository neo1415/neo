// Q's presence. Since Direction D (29 Oct) this renders the D mark; see src/ds/QMark.tsx.
// Previously (decision D3): a crisp gold disc whose ring carries state. Never colour alone:
// each state has a distinct ring shape and a text label for assistive tech and reduced motion.
import { QMark, type QMood } from '../ds/QMark';

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

/** Delegates to the Direction D mark (src/ds/QMark). The API is unchanged so every screen upgrades at once. */
const MOOD: Record<QState, QMood> = { idle: 'idle', listening: 'listening', thinking: 'thinking', working: 'working', waiting: 'waiting', done: 'done', error: 'blocked', offline: 'offline' };
export function QPresence({ state, size = 56, progress = 0, level = 0, label = false }: Props) {
  const agents = state === 'working' ? [{ label: 'run', done: Math.round(Math.max(0.04, Math.min(1, progress)) * 100), total: 100 }] : [];
  return (
    <span className="row gap-3" style={{ display: 'inline-flex', alignItems: 'center' }} data-q-state={state}>
      <QMark mood={MOOD[state]} agents={agents} size={size} level={level} title={Q_STATE_LABEL[state]} />
      {label && <span className="t-label" aria-hidden="true">{Q_STATE_LABEL[state]}</span>}
    </span>
  );
}
