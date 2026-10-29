// Routes for hiring campaigns (audit addendum §D). Owned by the campaigns builder.
// One rail entry, "Campaigns", in the Hiring group for employers (above Roles: a campaign groups roles). Agency staff
// reach their client campaigns from the agency rail (Clients) and the outreach page; their rail item "Campaigns" stays
// the outreach list, so the agency rail never shows two items with the same name (see the shared-file request in
// journeys/handoff/campaigns.md for renaming it "Outreach").
import { registerRoute } from './registry';
import { registerRef } from '../q/refs';
import { registerOpener } from '../q/core/openers';
import { CampaignPage, CampaignRef, CampaignsList } from '../journeys/campaigns/pages';
import { accessTo, forMe, nextActions, visibleCampaigns } from '../journeys/campaigns/model';

registerRoute({ path: '/r/campaigns', side: 'recruiter', label: 'hiring campaigns', render: () => <CampaignsList />,
  nav: { group: 'Hiring', label: 'Campaigns', icon: 'atlas', order: 10, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/campaigns/:id', side: 'recruiter', label: 'a hiring campaign', render: (p) => <CampaignPage id={p.id} /> });
registerRef('campaigns.card', CampaignRef);

// Q's opening line on campaign pages names the one thing that needs the reader, from live state (AD-B-01).
registerOpener({
  id: 'campaigns', side: 'recruiter', match: (p) => p === '/r/campaigns' || p.startsWith('/r/campaigns/'),
  build: (w, a, path) => {
    const id = path.split('/')[3];
    const list = id ? (() => { const r = accessTo(w, a, id); return r.ok ? [r.c] : []; })() : visibleCampaigns(w, a).filter((c) => c.status === 'ACTIVE');
    const acts = list.flatMap((c) => forMe(nextActions(w, c), a).map((x) => ({ c, x })));
    if (!acts.length) return [];
    const { c, x } = acts[0];
    return [{ subject: `campaign:${x.id}`, text: `${x.text}${id ? '' : ` (${c.name})`}.`, action: { label: 'What needs me here?', primary: true, act: { t: 'say', text: `what needs me in the ${c.name} campaign` } } }];
  },
});
