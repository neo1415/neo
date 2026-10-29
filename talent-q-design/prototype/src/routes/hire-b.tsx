// Routes for R2 (Ada). Owned by this area (see journeys/BUILD-BRIEF.md).
import { registerRoute } from './registry';
import { Compare } from '../screens/Compare';
import { Profile } from '../journeys/hire-b/Profile';
import { Interviews, InterviewRoom } from '../journeys/hire-b/Interviews';
import '../journeys/hire-b/ops';
import '../styles/hire-b.css';

registerRoute({ path: '/r/compare', side: 'recruiter', label: 'the comparison', render: () => <Compare />, nav: { group: 'Hiring', label: 'Compare', icon: 'people', order: 14 } });
registerRoute({ path: '/r/people/:id', side: 'recruiter', label: 'a candidate profile', render: (p) => <Profile key={p.id} id={p.id} /> });
registerRoute({ path: '/r/interviews', side: 'recruiter', label: 'interviews', render: () => <Interviews />, nav: { group: 'Hiring', label: 'Interviews', icon: 'interview', order: 16 } });
registerRoute({ path: '/r/interviews/:id', side: 'recruiter', label: 'the interview', render: (p) => <InterviewRoom key={p.id} id={p.id} /> });
