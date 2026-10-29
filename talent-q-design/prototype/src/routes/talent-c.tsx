// Routes for T4 (Grace). Owned by this area (see journeys/BUILD-BRIEF.md).
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { Interview } from '../screens/Interview';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/c/interview', side: 'candidate', label: 'practice and interviews', render: () => legacy(<Interview />), nav: { group: 'Grow', label: 'Practice and interview', icon: 'practice', order: 13 } });
