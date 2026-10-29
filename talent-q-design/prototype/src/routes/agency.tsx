// Routes for R4 (Dele, Talentbridge agency). Owned by this area (see journeys/BUILD-BRIEF.md).
// Information architecture: the rail carries the six top destinations (Clients, Talent pools, Submittals,
// Campaigns, Agents, Client reports). Secondary pages nest under their parent path (pools/searches,
// pools/compare, clients/notes, clients/docs, clients/mandate/:id) so the rail still marks where you are,
// and each section shows only its own secondary tabs in the page. Older flat paths redirect.
import { useEffect, type ReactNode } from 'react';
import { registerRoute } from './registry';
import { OrgOnly } from './guard';
import { registerRecruiterHome } from './entry';
import { actorOf, orgOf } from '../mock/world';
import type { IconName } from '../ds/icons';
import { AP, startRunner } from '../journeys/agency/model';
import { AgencyHome, Agents, Clients, Compare, Campaigns, Docs, MandatePage, Notes, Pools, Reports, Searches, Submittals } from '../journeys/agency/pages';
import '../styles/agency.css';

registerRecruiterHome((w) => orgOf(w, actorOf(w).orgId)?.kind === 'AGENCY', () => <AgencyHome />);

const guarded = (el: ReactNode) => <OrgOnly orgId="org_tb" what="Talentbridge’s agency workspace">{el}</OrgOnly>;
const nav = (label: string, icon: IconName, order: number, tab = false) => ({ group: 'Agency', label, icon, order, tab, orgKind: 'AGENCY' as const });
const page = (path: string, label: string, render: (p: Record<string, string>) => ReactNode, n?: ReturnType<typeof nav>) => registerRoute({ path, side: 'recruiter', label, render: (p) => guarded(render(p)), nav: n });

// Top destinations (rail). Static children are registered before the ':id' route that shares their depth.
page(AP.clients, 'clients and mandates', () => <Clients />, nav('Clients', 'org', 11, true));
page(AP.notes, 'team notes', () => <Notes />);
page(AP.docs, 'client documents', () => <Docs />);
page(AP.client(':id'), 'a client', (p) => <Clients id={p.id} />);
page(AP.mandate(':id'), 'a mandate', (p) => <MandatePage id={p.id} />);
page(AP.pools, 'talent pools', () => <Pools />, nav('Talent pools', 'people', 12));
page(AP.searches, 'saved searches', () => <Searches />);
page(AP.compare, 'the pool comparison', () => <Compare />);
page(AP.submittals, 'submittals', () => <Submittals />, nav('Submittals', 'approvals', 13));
page(AP.campaigns, 'campaigns', () => <Campaigns />, nav('Outreach', 'mail', 14));
page(AP.agents, 'agents', () => <Agents />, nav('Agents', 'agents', 15, true));
page(AP.reports, 'client reports', () => <Reports />, nav('Client reports', 'measures', 16));

// Earlier flat paths (bookmarks, history, review scripts) land on the nested page.
function Moved({ to }: { to: string }) {
  useEffect(() => { location.replace(`#${to}`); }, [to]);
  return null;
}
const R = '/r/agency';
registerRoute({ path: `${R}/searches`, side: 'recruiter', label: 'saved searches', render: () => <Moved to={AP.searches} /> });
registerRoute({ path: `${R}/compare`, side: 'recruiter', label: 'the pool comparison', render: () => <Moved to={AP.compare} /> });
registerRoute({ path: `${R}/notes`, side: 'recruiter', label: 'team notes', render: () => <Moved to={AP.notes} /> });
registerRoute({ path: `${R}/docs`, side: 'recruiter', label: 'client documents', render: () => <Moved to={AP.docs} /> });
registerRoute({ path: `${R}/client/:id`, side: 'recruiter', label: 'a client', render: (p) => <Moved to={AP.client(p.id)} /> });
registerRoute({ path: `${R}/mandate/:id`, side: 'recruiter', label: 'a mandate', render: (p) => <Moved to={AP.mandate(p.id)} /> });

startRunner();
