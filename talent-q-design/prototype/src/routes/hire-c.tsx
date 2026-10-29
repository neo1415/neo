// Routes for R3 (Ngozi). Owned by this area (see journeys/BUILD-BRIEF.md).
// Native pages: messages (both sides), pipeline, team, calendar, organisation and policy, interview times.
// Design pass: the outbox, calendar connections and handbook reading are native Direction D pages now.
import { registerRoute } from './registry';
import { Outbox } from '../journeys/hire-c/Outbox';
import { Connections } from '../journeys/hire-c/Connections';
import { Handbook } from '../journeys/hire-c/Handbook';
import { Messages } from '../journeys/hire-c/Messages';
import { CandidateMessages, CandidateSlots } from '../journeys/hire-c/CandidateMessages';
import { Pipeline } from '../journeys/hire-c/Pipeline';
import { Team } from '../journeys/hire-c/Team';
import { Setup } from '../journeys/hire-c/Setup';
import { Calendar } from '../journeys/hire-c/Calendar';
import '../journeys/hire-c/refs';
import '../journeys/hire-c/ReplyIntel';
import { EmailSettings } from '../journeys/hire-c/EmailSettings';
import '../styles/hire-c.css';

registerRoute({ path: '/r/pipeline', side: 'recruiter', label: 'the pipeline', render: () => <Pipeline />, nav: { group: 'Hiring', label: 'Pipeline', icon: 'measures', tab: true, order: 11, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/messages', side: 'recruiter', label: 'messages', render: () => <Messages />, nav: { group: 'Hiring', label: 'Messages', icon: 'mail', tab: true, order: 15, badge: 'approvals', orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/calendar', side: 'recruiter', label: 'the calendar', render: () => <Calendar />, nav: { group: 'Hiring', label: 'Calendar', icon: 'calendar', tab: true, order: 17, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/calendar/connect', side: 'recruiter', label: 'calendar connections', render: () => <Connections /> });
registerRoute({ path: '/r/team', side: 'recruiter', label: 'your team', render: () => <Team />, nav: { group: 'Organisation', label: 'Team', icon: 'people', order: 32 } });
registerRoute({ path: '/r/setup', side: 'recruiter', label: 'organisation and policy', render: () => <Setup />, nav: { group: 'Organisation', label: 'Organisation and policy', icon: 'org', order: 31 } });
registerRoute({ path: '/r/setup/handbook', side: 'recruiter', label: 'handbook import', render: () => <Handbook /> });
registerRoute({ path: '/r/outreach', side: 'recruiter', label: 'the outbox', render: () => <Outbox /> });
registerRoute({ path: '/c/messages', side: 'candidate', label: 'messages', render: () => <CandidateMessages />, nav: { group: 'Work', label: 'Messages', icon: 'mail', order: 33 } });
registerRoute({ path: '/c/slots', side: 'candidate', label: 'interview times', render: () => <CandidateSlots />, nav: { group: 'Interviews', label: 'Pick a time', icon: 'calendar', order: 43 } });
// Connected email (addendum E-01): accounts, consent, reconnect, policy and automations. Both sides; Settings links here.
registerRoute({ path: '/settings/email', side: 'both', label: 'email settings', render: () => <EmailSettings /> });
