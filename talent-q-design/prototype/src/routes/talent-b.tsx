// Routes for T3 (Tobi) and T5 (Zara). Owned by this area (see journeys/BUILD-BRIEF.md).
// /c/messages belongs to hire-c; these pages link to it and write to w.threads.
import { registerRoute } from './registry';
import { PassportPage } from '../journeys/talent-b/Passport';
import { JobsPage, JobDetailPage } from '../journeys/talent-b/Jobs';
import { ApplicationsPage } from '../journeys/talent-b/Applications';
import { PrepPage } from '../journeys/talent-b/Prep';
import { CandidateMemoryPage } from '../journeys/talent-b/Memory';
import '../journeys/talent-b/ui';
import '../styles/talent-b.css';

registerRoute({ path: '/c/passport', side: 'candidate', label: 'your Evidence Passport', render: () => <PassportPage />, nav: { group: 'Evidence', label: 'Evidence Passport', icon: 'passport', tab: true, order: 21 } });
registerRoute({ path: '/c/memory', side: 'candidate', label: 'what Q remembers', render: () => <CandidateMemoryPage />, nav: { group: 'Evidence', label: 'What Q remembers', icon: 'memory', order: 23 } });
registerRoute({ path: '/c/jobs', side: 'candidate', label: 'jobs', render: () => <JobsPage />, nav: { group: 'Work', label: 'Jobs', icon: 'search', tab: true, order: 31 } });
registerRoute({ path: '/c/jobs/:id', side: 'candidate', label: 'a job', render: (p) => <JobDetailPage id={p.id} /> });
registerRoute({ path: '/c/applications', side: 'candidate', label: 'your applications', render: () => <ApplicationsPage />, nav: { group: 'Work', label: 'Applications', icon: 'roles', order: 32 } });
registerRoute({ path: '/c/prep', side: 'candidate', label: 'interview prep', render: () => <PrepPage />, nav: { group: 'Interviews', label: 'Prepare', icon: 'interview', order: 41 } });
