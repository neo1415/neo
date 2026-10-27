import { useEffect, useState } from 'react';

/** True below the breakpoint. Used where a layout changes form on phones (not just reflows). */
export function useNarrow(px = 760) {
  const q = `(max-width: ${px}px)`;
  const [narrow, set] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => set(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [q]);
  return narrow;
}
