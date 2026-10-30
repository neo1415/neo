// Routes for ORG-ADMIN (coverage brief, 30 Oct). One rail entry (the Admin hub, in the Organisation group beside
// Organisation and policy, Team and Audit log); every section nests under /r/admin so the rail marks where you are.
// Tenancy comes from the signed-in person; there is no organisation picker anywhere in admin.
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { Hub } from '../journeys/org-admin/Frame';
import { Billing, Channels, Instructions, Placements, Retention, Sources, Templates } from '../journeys/org-admin/PagesOrg';
import { Compliance, Learning, Models, MyChannels, Quality, Reports } from '../journeys/org-admin/PagesOversight';
import { BASE } from '../journeys/org-admin/model';

registerRoute({ path: BASE, side: 'recruiter', label: 'admin', render: () => <Hub />, nav: { group: 'Organisation', label: 'Admin', icon: 'command', order: 33 } });
const page = (seg: string, label: string, render: () => ReactNode) => registerRoute({ path: `${BASE}/${seg}`, side: 'recruiter', label, render });
page('instructions', 'my instructions to Q', () => <Instructions />);
page('templates', 'approved templates', () => <Templates />);
page('channels', 'channels', () => <Channels />);
page('billing', 'billing and usage', () => <Billing />);
page('retention', 'retention and deletion', () => <Retention />);
page('sources', 'sources and licences', () => <Sources />);
// Placements: the frame itself refuses employers (without naming any agency); data is the signed-in agency's only.
page('placements', 'placements and invoices', () => <Placements />);
page('compliance', 'compliance', () => <Compliance />);
page('reports', 'reports', () => <Reports />);
page('models', 'models and versions', () => <Models />);
page('quality', 'quality checks', () => <Quality />);
page('learning', 'what Q learned', () => <Learning />);
// The candidate's own channel choices (V09). Recruiters landing here are pointed to admin channels.
registerRoute({ path: '/settings/channels', side: 'both', label: 'channel settings', render: () => <MyChannels /> });
