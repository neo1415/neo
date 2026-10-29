// Contracts for Q's brain in the prototype. Skills are small, testable units that understand one kind
// of request and act on the one store. They never hold closures in the conversation: replies carry
// serialisable actions (QAction), so a conversation survives navigation, reloads and other tabs.
import type { Actor, QFrame, QMsg, Side } from '../../state/domain';
import type { World } from '../../mock/world';
import type { Entities } from './nlu';

export interface QCtx {
  w: World;
  actor: Actor;
  /** Current route, e.g. '/r/people/p_tobi'. */
  route: string;
  text: string;
  /** Lowercased, typo-corrected, contraction-expanded text. */
  norm: string;
  ents: Entities;
  frame: QFrame | null;
  /** The last thing Q said to this person (for "yes", "that one", "change it"). */
  lastQ: QMsg | null;
}

export type ReplyMsg = Omit<QMsg, 'id' | 'at' | 'who' | 'engine'> & { who?: 'q' | 'system' };

export interface QReply {
  msgs: ReplyMsg[];
  /** Mutations applied in the same store update as the reply (atomic). */
  effects?: (w: World, actor: Actor) => void;
  /** Navigate after replying. Label is used for "go back" and the nav history. */
  nav?: { to: string; label: string };
  /** undefined: keep the current frame; null: clear it; QFrame: replace it. */
  frame?: QFrame | null;
}

export interface Skill {
  id: string;
  side: Side | 'both';
  /** How confident this skill is that the turn is for it (0–1). Highest wins above 0.45. */
  match(c: QCtx): number;
  handle(c: QCtx): QReply | Promise<QReply>;
  /**
   * Called first when this skill owns the active frame and is awaiting an answer. Return null when the
   * turn is not an answer (Q then treats it as a topic change and keeps the frame suspended).
   */
  answer?(c: QCtx): QReply | null | Promise<QReply | null>;
}

export interface ProactiveRule {
  id: string;
  side: Side | 'both';
  /** Higher priority suggestions still show when proactive help is set to "quiet". */
  priority: 'high' | 'normal';
  evaluate(w: World, actor: Actor): { subject: string; text: string; why: string; actions: QMsg['actions'] }[];
}

/** A page can render live content inside a Q message (e.g. a plan's agents, a draft). */
export type RefRenderer = (props: { id: string }) => JSX.Element | null;
