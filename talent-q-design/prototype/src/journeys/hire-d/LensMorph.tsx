// MO-013 Candidate comparison morph (trigger compare:changed). The comparison's main sheet is one shared element
// across its two lenses (evidence ledger ↔ CV and proof): its box morphs between the two layouts (layout
// animation, DUR.slow, EASE.standard) while the content cross-fades in DUR.normal. Nothing is faked: the content
// is the real view; only the change between them moves. Reduced motion: the table redraws directly (atlas fallback).
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DUR, EASE } from '../../ds/motion';

export function LensMorph({ lens, children }: { lens: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className="hd-morph" data-morph={lens} data-motion="off">{children}</div>;
  return (
    <motion.div layoutId="hd-cmp-morph" layout className="hd-morph" data-morph={lens} data-motion="on" key={lens}
      transition={{ layout: { duration: DUR.slow, ease: EASE.standard } }}
      initial={{ opacity: 0.35, scale: 0.985 }} animate={{ opacity: 1, scale: 1, transition: { duration: DUR.normal, ease: EASE.enter } }}>
      {children}
    </motion.div>
  );
}
