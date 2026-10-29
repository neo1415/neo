// Routes for R1 (Funmi) and R5 (Bayo). Owned by this area (see journeys/BUILD-BRIEF.md).
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { MandateIntake } from '../screens/MandateIntake';
import { Sourcing } from '../screens/Sourcing';
import { Memory } from '../screens/Memory';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/r/mandate', side: 'recruiter', label: 'the role brief', render: () => legacy(<MandateIntake />) });
registerRoute({ path: '/r/sourcing', side: 'recruiter', label: 'the search', render: () => legacy(<Sourcing />), nav: { group: 'Hiring', label: 'Search', icon: 'search', order: 13, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/memory', side: 'recruiter', label: 'what Q remembers', render: () => legacy(<Memory viewer="recruiter" />), nav: { group: 'Organisation', label: 'What Q remembers', icon: 'memory', order: 33 } });
