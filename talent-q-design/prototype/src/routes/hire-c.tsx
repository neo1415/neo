// Routes for R3 (Ngozi). Owned by this area (see journeys/BUILD-BRIEF.md).
// Native pages: messages (both sides), pipeline, team, calendar, organisation and policy, interview times.
// The older screens stay reachable where they still add something (calendar connections, handbook import).
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { OrgSetup } from '../screens/OrgSetup';
import { Outreach } from '../screens/Outreach';
import { CalendarSetup } from '../screens/CalendarSetup';
import { Messages } from '../journeys/hire-c/Messages';
import { CandidateMessages, CandidateSlots } from '../journeys/hire-c/CandidateMessages';
import { Pipeline } from '../journeys/hire-c/Pipeline';
import { Team } from '../journeys/hire-c/Team';
import { Setup } from '../journeys/hire-c/Setup';
import { Calendar } from '../journeys/hire-c/Calendar';
import '../journeys/hire-c/refs';
import '../styles/hire-c.css';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/r/pipeline', side: 'recruiter', label: 'the pipeline', render: () => <Pipeline />, nav: { group: 'Hiring', label: 'Pipeline', icon: 'measures', tab: true, order: 11, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/messages', side: 'recruiter', label: 'messages', render: () => <Messages />, nav: { group: 'Hiring', label: 'Messages', icon: 'interview', tab: true, order: 15, badge: 'approvals', orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/calendar', side: 'recruiter', label: 'the calendar', render: () => <Calendar />, nav: { group: 'Hiring', label: 'Calendar', icon: 'calendar', tab: true, order: 17, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/calendar/connect', side: 'recruiter', label: 'calendar connections', render: () => legacy(<CalendarSetup />) });
registerRoute({ path: '/r/team', side: 'recruiter', label: 'your team', render: () => <Team />, nav: { group: 'Organisation', label: 'Team', icon: 'people', order: 32 } });
registerRoute({ path: '/r/setup', side: 'recruiter', label: 'organisation and policy', render: () => <Setup />, nav: { group: 'Organisation', label: 'Organisation and policy', icon: 'org', order: 31 } });
registerRoute({ path: '/r/setup/handbook', side: 'recruiter', label: 'handbook import', render: () => legacy(<OrgSetup />) });
registerRoute({ path: '/r/outreach', side: 'recruiter', label: 'outreach approvals', render: () => legacy(<Outreach />) });
registerRoute({ path: '/c/messages', side: 'candidate', label: 'messages', render: () => <CandidateMessages />, nav: { group: 'Work', label: 'Messages', icon: 'interview', order: 33 } });
registerRoute({ path: '/c/slots', side: 'candidate', label: 'interview times', render: () => <CandidateSlots />, nav: { group: 'Work', label: 'Interview times', icon: 'calendar', order: 34 } });
