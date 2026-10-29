// Route registry. Each feature area registers its pages in its own file under src/routes/ (discovered
// automatically), so areas can be built in parallel without editing a shared routing file.
// A route renders as the CANVAS beside the global Q thread; Q is never absent from a product page.
import type { ReactNode } from 'react';
import type { IconName } from '../ds/icons';

export interface RouteDef {
  /** Path pattern; ':param' segments are passed to render(). */
  path: string;
  side: 'recruiter' | 'candidate' | 'both' | 'public';
  render: (params: Record<string, string>) => ReactNode;
  /** Shown in the rail when set. Groups: 'Q' | 'Hiring' | 'Agency' | 'Knowledge' | 'Grow' | 'Evidence' | 'Work'. */
  nav?: { group: string; label: string; icon: IconName; tab?: boolean; order: number; badge?: string; orgKind?: 'EMPLOYER' | 'AGENCY'; /** Only for members of these organisations (pages showing one org's data). */ orgIds?: string[] };
  /** Human label for "go back to …" and history. */
  label: string;
  /** Public and signup pages render without the shell. */
  bare?: boolean;
}

const routes: RouteDef[] = [];
export const registerRoute = (r: RouteDef) => { const i = routes.findIndex((x) => x.path === r.path); if (i >= 0) routes[i] = r; else routes.push(r); };
export const allRoutes = () => routes;

export function matchRoute(path: string): { def: RouteDef; params: Record<string, string> } | null {
  for (const def of routes) {
    const a = def.path.split('/'), b = path.split('/');
    if (a.length !== b.length) continue;
    const params: Record<string, string> = {};
    if (a.every((seg, i) => (seg.startsWith(':') ? ((params[seg.slice(1)] = decodeURIComponent(b[i])), true) : seg === b[i]))) return { def, params };
  }
  return null;
}
