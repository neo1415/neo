// Routes for R2 (Ada). Owned by this area (see journeys/BUILD-BRIEF.md).
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { Compare } from '../screens/Compare';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/r/compare', side: 'recruiter', label: 'the comparison', render: () => legacy(<Compare />), nav: { group: 'Hiring', label: 'Compare', icon: 'people', order: 14 } });
