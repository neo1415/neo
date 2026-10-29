// Pages that existed before the complete-experience phase, registered in the route registry.
// Original (bridged) screens render on paper through the legacy bridge with their logic unchanged.
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { OrgSetup } from '../screens/OrgSetup';
import { MandateIntake } from '../screens/MandateIntake';
import { Sourcing } from '../screens/Sourcing';
import { Compare } from '../screens/Compare';
import { Outreach } from '../screens/Outreach';
import { CalendarSetup } from '../screens/CalendarSetup';
import { SlotPicker } from '../screens/SlotPicker';
import { Passport } from '../screens/Passport';
import { Career } from '../screens/Career';
import { Interview } from '../screens/Interview';
import { Memory } from '../screens/Memory';
import { Planner } from '../journeys/planner/Planner';
import { Onboarding } from '../journeys/onboarding/Onboarding';
import { J7 } from '../journeys/career/Career';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/r/plan', side: 'recruiter', label: 'plans and agents', render: () => <Planner />, nav: { group: 'Q', label: 'Plans and agents', icon: 'agents', order: 2 } });
registerRoute({ path: '/r/mandate', side: 'recruiter', label: 'the role brief', render: () => legacy(<MandateIntake />) });
registerRoute({ path: '/r/sourcing', side: 'recruiter', label: 'the search', render: () => legacy(<Sourcing />), nav: { group: 'Hiring', label: 'Search', icon: 'search', order: 13, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/compare', side: 'recruiter', label: 'the comparison', render: () => legacy(<Compare />), nav: { group: 'Hiring', label: 'Compare', icon: 'people', order: 14 } });
registerRoute({ path: '/r/outreach', side: 'recruiter', label: 'outreach approvals', render: () => legacy(<Outreach />) });
registerRoute({ path: '/r/calendar', side: 'recruiter', label: 'the calendar', render: () => legacy(<CalendarSetup />), nav: { group: 'Hiring', label: 'Calendar', icon: 'calendar', tab: true, order: 17 } });
registerRoute({ path: '/r/memory', side: 'recruiter', label: 'what Q remembers', render: () => legacy(<Memory viewer="recruiter" />), nav: { group: 'Organisation', label: 'What Q remembers', icon: 'memory', order: 33 } });
registerRoute({ path: '/r/setup', side: 'recruiter', label: 'organisation and policy', render: () => legacy(<OrgSetup />), nav: { group: 'Organisation', label: 'Organisation and policy', icon: 'org', order: 31 } });

registerRoute({ path: '/c/welcome', side: 'candidate', label: 'getting started', render: () => <Onboarding />, nav: { group: 'Q', label: 'Getting started', icon: 'welcome', order: 3 } });
registerRoute({ path: '/c/career', side: 'candidate', label: 'your career atlas', render: () => <J7 />, nav: { group: 'Grow', label: 'Career atlas', icon: 'atlas', tab: true, order: 11 } });
registerRoute({ path: '/c/growth', side: 'candidate', label: 'readiness to apply', render: () => legacy(<Career />), nav: { group: 'Grow', label: 'Readiness to apply', icon: 'measures', order: 12 } });
registerRoute({ path: '/c/interview', side: 'candidate', label: 'practice and interviews', render: () => legacy(<Interview />), nav: { group: 'Grow', label: 'Practice and interview', icon: 'practice', order: 13 } });
registerRoute({ path: '/c/passport', side: 'candidate', label: 'your Evidence Passport', render: () => legacy(<Passport />), nav: { group: 'Evidence', label: 'Evidence Passport', icon: 'passport', tab: true, order: 21 } });
registerRoute({ path: '/c/slots', side: 'candidate', label: 'interview times', render: () => legacy(<SlotPicker />), nav: { group: 'Work', label: 'Interview times', icon: 'calendar', order: 34 } });
registerRoute({ path: '/c/memory', side: 'candidate', label: 'what Q remembers', render: () => legacy(<Memory viewer="candidate" />), nav: { group: 'Evidence', label: 'What Q remembers', icon: 'memory', order: 23 } });
