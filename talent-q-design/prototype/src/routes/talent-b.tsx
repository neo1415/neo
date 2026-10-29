// Routes for T3 (Tobi) and T5 (Zara). Owned by this area (see journeys/BUILD-BRIEF.md).
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { Passport } from '../screens/Passport';
import { Memory } from '../screens/Memory';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/c/passport', side: 'candidate', label: 'your Evidence Passport', render: () => legacy(<Passport />), nav: { group: 'Evidence', label: 'Evidence Passport', icon: 'passport', tab: true, order: 21 } });
registerRoute({ path: '/c/memory', side: 'candidate', label: 'what Q remembers', render: () => legacy(<Memory viewer="candidate" />), nav: { group: 'Evidence', label: 'What Q remembers', icon: 'memory', order: 23 } });
