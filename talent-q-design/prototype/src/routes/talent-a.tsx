// Routes for T1 (Amaka) and T2 (Chidi). Owned by this area (see journeys/BUILD-BRIEF.md).
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { Career } from '../screens/Career';
import { Onboarding } from '../journeys/onboarding/Onboarding';
import { J7 } from '../journeys/career/Career';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/c/welcome', side: 'candidate', label: 'getting started', render: () => <Onboarding />, nav: { group: 'Q', label: 'Getting started', icon: 'welcome', order: 3 } });
registerRoute({ path: '/c/career', side: 'candidate', label: 'your career atlas', render: () => <J7 />, nav: { group: 'Grow', label: 'Career atlas', icon: 'atlas', tab: true, order: 11 } });
registerRoute({ path: '/c/growth', side: 'candidate', label: 'readiness to apply', render: () => legacy(<Career />), nav: { group: 'Grow', label: 'Readiness to apply', icon: 'measures', order: 12 } });
