// Routes for R4 (Dele, Talentbridge agency). Owned by this area (see journeys/BUILD-BRIEF.md).
import { registerRoute } from './registry';
import { OrgOnly } from './guard';
import { registerRecruiterHome } from './entry';
import { actorOf, orgOf } from '../mock/world';
import type { IconName } from '../ds/icons';
import { startRunner } from '../journeys/agency/model';
import { AgencyHome, Agents, ClientPage, Clients, Compare, Campaigns, Docs, MandatePage, Notes, Pools, Reports, Searches, Submittals } from '../journeys/agency/pages';
import '../styles/agency.css';

registerRecruiterHome((w) => orgOf(w, actorOf(w).orgId)?.kind === 'AGENCY', () => <AgencyHome />);

const nav = (label: string, icon: IconName, order: number, tab = false) => ({ group: 'Agency', label, icon, order, tab, orgKind: 'AGENCY' as const });
registerRoute({ path: '/r/agency/clients', side: 'recruiter', label: 'clients and mandates', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Clients /></OrgOnly>, nav: nav('Clients', 'org', 11, true) });
registerRoute({ path: '/r/agency/client/:id', side: 'recruiter', label: 'a client', render: (p) => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><ClientPage id={p.id} /></OrgOnly> });
registerRoute({ path: '/r/agency/mandate/:id', side: 'recruiter', label: 'a mandate', render: (p) => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><MandatePage id={p.id} /></OrgOnly> });
registerRoute({ path: '/r/agency/agents', side: 'recruiter', label: 'agents', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Agents /></OrgOnly>, nav: nav('Agents', 'agents', 12, true) });
registerRoute({ path: '/r/agency/pools', side: 'recruiter', label: 'talent pools', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Pools /></OrgOnly>, nav: nav('Talent pools', 'people', 13) });
registerRoute({ path: '/r/agency/searches', side: 'recruiter', label: 'saved searches', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Searches /></OrgOnly> });
registerRoute({ path: '/r/agency/compare', side: 'recruiter', label: 'the pool comparison', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Compare /></OrgOnly> });
registerRoute({ path: '/r/agency/campaigns', side: 'recruiter', label: 'campaigns', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Campaigns /></OrgOnly>, nav: nav('Campaigns', 'interview', 14) });
registerRoute({ path: '/r/agency/submittals', side: 'recruiter', label: 'submittals', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Submittals /></OrgOnly>, nav: nav('Submittals', 'approvals', 15) });
registerRoute({ path: '/r/agency/notes', side: 'recruiter', label: 'team notes', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Notes /></OrgOnly> });
registerRoute({ path: '/r/agency/docs', side: 'recruiter', label: 'client documents', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Docs /></OrgOnly> });
registerRoute({ path: '/r/agency/reports', side: 'recruiter', label: 'client reports', render: () => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace"><Reports /></OrgOnly>, nav: nav('Client reports', 'measures', 16) });

startRunner();
