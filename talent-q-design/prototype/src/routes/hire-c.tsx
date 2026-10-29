// Routes for R3 (Ngozi). Owned by this area (see journeys/BUILD-BRIEF.md).
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { OrgSetup } from '../screens/OrgSetup';
import { Outreach } from '../screens/Outreach';
import { CalendarSetup } from '../screens/CalendarSetup';
import { SlotPicker } from '../screens/SlotPicker';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/r/outreach', side: 'recruiter', label: 'outreach approvals', render: () => legacy(<Outreach />) });
registerRoute({ path: '/r/calendar', side: 'recruiter', label: 'the calendar', render: () => legacy(<CalendarSetup />), nav: { group: 'Hiring', label: 'Calendar', icon: 'calendar', tab: true, order: 17 } });
registerRoute({ path: '/r/setup', side: 'recruiter', label: 'organisation and policy', render: () => legacy(<OrgSetup />), nav: { group: 'Organisation', label: 'Organisation and policy', icon: 'org', order: 31 } });
registerRoute({ path: '/c/slots', side: 'candidate', label: 'interview times', render: () => legacy(<SlotPicker />), nav: { group: 'Work', label: 'Interview times', icon: 'calendar', order: 34 } });
