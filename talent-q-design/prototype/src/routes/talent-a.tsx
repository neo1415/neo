// Routes for T1 (Amaka) and T2 (Chidi). Owned by this area (see journeys/BUILD-BRIEF.md).
// The global Q drives both pages through src/q/skills/talent-a.ts; the pages are canvases only.
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { InShell } from '../ds/Workspace';
import { Career } from '../screens/Career';
import { Onboarding } from '../journeys/onboarding/Onboarding';
import { J7 } from '../journeys/career/Career';
import '../journeys/onboarding/refs';
import '../styles/talent-a.css';

// On phones the shell has no Split, so a Canvas would otherwise render as a sheet with a dead back button.
// These pages are full pages beside the global Q (the "Ask Q" bar), so they render inline everywhere.
const page = (n: ReactNode) => <InShell.Provider value>{n}</InShell.Provider>;

registerRoute({ path: '/c/welcome', side: 'candidate', label: 'your profile', render: () => page(<Onboarding />), nav: { group: 'Q', label: 'Your profile', icon: 'welcome', order: 3 } });
registerRoute({ path: '/c/career', side: 'candidate', label: 'your career atlas', render: () => page(<J7 />), nav: { group: 'Grow', label: 'Career atlas', icon: 'atlas', tab: true, order: 11 } });
registerRoute({ path: '/c/growth', side: 'candidate', label: 'readiness to apply', render: () => page(<Career />), nav: { group: 'Grow', label: 'Readiness to apply', icon: 'measures', order: 12 } });
