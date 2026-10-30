// TALENT-D motion pieces that attach to existing elements owned by other areas (small additive hooks there):
// MO-014 job list reorder on a filter change (Jobs), MO-030 CV draft growing in as it becomes ready (Passport CV).
// Every one respects prefers-reduced-motion and the person's "lite" setting: then the result is simply drawn.
import { forwardRef, useState, type ReactNode } from 'react';
import { MotionConfig, motion, type HTMLMotionProps } from 'motion/react';
import { actorOf, useWorld } from '../../mock/world';
import { DUR, EASE } from '../../ds/motion';

/** Reduced motion from the OS ('user'), or always when the person chose the lite experience. */
export function Still({ children }: { children: ReactNode }) {
  const lite = useWorld((w) => { const a = actorOf(w); return !!(a.personId && w.consents[a.personId]?.lite); });
  return <MotionConfig reducedMotion={lite ? 'always' : 'user'}>{children}</MotionConfig>;
}

/** MO-014 · filter:changed. Cards that stay glide to their new place; cards that leave fade out quickly; new ones fade
 *  in. No LLM, no progress. Reduced motion: a direct redraw (layout and transforms are switched off by MotionConfig). */
export function FilterMotion({ filter, children }: { filter: string; children: ReactNode }) {
  return <Still><div data-motion="MO-014" data-filter={filter} style={{ display: 'contents' }}>{children}</div></Still>;
}
export const MotionCard = forwardRef<HTMLLIElement, HTMLMotionProps<'li'>>(function MotionCard(props, ref) {
  return <motion.li ref={ref} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DUR.normal, ease: EASE.enter } }} exit={{ opacity: 0, transition: { duration: DUR.fast, ease: EASE.exit } }} transition={{ layout: { duration: DUR.slow, ease: EASE.standard } }} {...props} />;
});

/** MO-030 · artifact:ready. A CV draft that has just been generated grows in line by line (40 ms apart, 200 ms each,
 *  under 500 ms in all); every control works throughout. Reduced motion, or a draft opened later: the loaded document. */
export function useFresh(at: string, ms = 4000) { const [f] = useState(() => Date.now() - Date.parse(at) < ms); return f; }
export function GrowLine({ i, fresh, children }: { i: number; fresh: boolean; children: ReactNode }) {
  return (
    <Still>
      <motion.li data-motion={fresh ? 'MO-030' : undefined} initial={fresh ? { opacity: 0, height: 0 } : false} animate={{ opacity: 1, height: 'auto', transition: { duration: DUR.normal, ease: EASE.enter, delay: Math.min(i, 6) * 0.04 } }} style={{ overflow: fresh ? 'hidden' : undefined }}>
        {children}
      </motion.li>
    </Still>
  );
}
