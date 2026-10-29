// The multi-agent planner, shared by every recruiter journey. Journey areas register their own pages in
// their own files here (see journeys/BUILD-BRIEF.md).
import { registerRoute } from './registry';
import { Planner } from '../journeys/planner/Planner';

registerRoute({ path: '/r/plan', side: 'recruiter', label: 'plans and agents', render: () => <Planner />, nav: { group: 'Q', label: 'Plans and agents', icon: 'agents', order: 2 } });
