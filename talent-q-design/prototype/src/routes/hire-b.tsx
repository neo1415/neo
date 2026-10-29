// Routes for R2 (Ada). Owned by this area (see journeys/BUILD-BRIEF.md).
import { registerRoute } from './registry';
import { OrgOnly } from './guard';
import { Compare } from '../journeys/hire-b/Compare';
import { StudioRoute } from '../journeys/rubric/Studio';
import { Profile } from '../journeys/hire-b/Profile';
import { Interviews, InterviewRoom } from '../journeys/hire-b/Interviews';
import '../journeys/hire-b/ops';
import '../journeys/hire-b/refs';
import '../styles/hire-b.css';

registerRoute({ path: '/r/compare', side: 'recruiter', label: 'the comparison', render: () => <OrgOnly orgId="org_kora" what="Kora Pay’s hiring"><Compare /></OrgOnly>, nav: { group: 'Hiring', label: 'Compare', icon: 'people', order: 14, orgKind: 'EMPLOYER', orgIds: ['org_kora'] } });
registerRoute({ path: '/r/people/:id', side: 'recruiter', label: 'a candidate profile', render: (p) => <Profile key={p.id} id={p.id} /> });
registerRoute({ path: '/r/interviews', side: 'recruiter', label: 'interviews', render: () => <Interviews />, nav: { group: 'Hiring', label: 'Interviews', icon: 'interview', order: 16, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/interviews/:id', side: 'recruiter', label: 'the interview', render: (p) => <InterviewRoom key={p.id} id={p.id} /> });
// Evaluation studio (audit addendum §E). Guarded by the role's organisation, like the comparison.
registerRoute({ path: '/r/roles/:id/rubric', side: 'recruiter', label: 'the evaluation rubric', render: (p) => <StudioRoute key={p.id} id={p.id} /> });
