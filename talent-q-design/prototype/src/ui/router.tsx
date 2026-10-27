// Minimal hash router: routes are stable, shareable and work from a static file (low-bandwidth friendly).
import { useSyncExternalStore, type AnchorHTMLAttributes } from 'react';

const read = () => {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  return { path, query: new URLSearchParams(query) };
};
let current = read();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => { current = read(); subs.forEach((s) => s()); window.scrollTo(0, 0); });

export function useRoute() {
  return useSyncExternalStore((s) => { subs.add(s); return () => subs.delete(s); }, () => current);
}

export function navigate(to: string) { location.hash = to; }

export function Link({ to, current: isCurrent, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; current?: boolean }) {
  return <a href={`#${to}`} aria-current={isCurrent ? 'page' : undefined} {...rest} />;
}
