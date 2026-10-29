// Routes for R4 (Dele, Talentbridge agency). Owned by this area (see journeys/BUILD-BRIEF.md).
import { registerRoute } from './registry';
import { registerRecruiterHome } from './entry';
import { actorOf, orgOf } from '../mock/world';
import type { IconName } from '../ds/icons';
import { startRunner } from '../journeys/agency/model';
import { AgencyHome, Agents, ClientPage, Clients, Compare, Campaigns, Docs, MandatePage, Notes, Pools, Reports, Searches, Submittals } from '../journeys/agency/pages';
import '../styles/agency.css';

registerRecruiterHome((w) => orgOf(w, actorOf(w).orgId)?.kind === 'AGENCY', () => <AgencyHome />);

const nav = (label: string, icon: IconName, order: number, tab = false) => ({ group: 'Agency', label, icon, order, tab, orgKind: 'AGENCY' as const });
registerRoute({ path: '/r/agency/clients', side: 'recruiter', label: 'clients and mandates', render: () => <Clients />, nav: nav('Clients', 'org', 11, true) });
registerRoute({ path: '/r/agency/client/:id', side: 'recruiter', label: 'a client', render: (p) => <ClientPage id={p.id} /> });
registerRoute({ path: '/r/agency/mandate/:id', side: 'recruiter', label: 'a mandate', render: (p) => <MandatePage id={p.id} /> });
registerRoute({ path: '/r/agency/agents', side: 'recruiter', label: 'agents', render: () => <Agents />, nav: nav('Agents', 'agents', 12, true) });
registerRoute({ path: '/r/agency/pools', side: 'recruiter', label: 'talent pools', render: () => <Pools />, nav: nav('Talent pools', 'people', 13) });
registerRoute({ path: '/r/agency/searches', side: 'recruiter', label: 'saved searches', render: () => <Searches /> });
registerRoute({ path: '/r/agency/compare', side: 'recruiter', label: 'the pool comparison', render: () => <Compare /> });
registerRoute({ path: '/r/agency/campaigns', side: 'recruiter', label: 'campaigns', render: () => <Campaigns />, nav: nav('Campaigns', 'interview', 14) });
registerRoute({ path: '/r/agency/submittals', side: 'recruiter', label: 'submittals', render: () => <Submittals />, nav: nav('Submittals', 'approvals', 15) });
registerRoute({ path: '/r/agency/notes', side: 'recruiter', label: 'team notes', render: () => <Notes /> });
registerRoute({ path: '/r/agency/docs', side: 'recruiter', label: 'client documents', render: () => <Docs /> });
registerRoute({ path: '/r/agency/reports', side: 'recruiter', label: 'client reports', render: () => <Reports />, nav: nav('Client reports', 'measures', 16) });

startRunner();
