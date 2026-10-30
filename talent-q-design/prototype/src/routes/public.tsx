// Public site (atlas SC-001…SC-006, SC-008, SC-013; decision D15 resolved 30 Oct: the founder asked for the
// whole blueprint). "/" stays the founder's prototype start (screens/Entry.tsx), which links here.
import { registerRoute } from './registry';
import { Landing } from '../journeys/public/Landing';
import { How } from '../journeys/public/How';
import { Employers } from '../journeys/public/Employers';
import { Talent } from '../journeys/public/Talent';
import { Pricing } from '../journeys/public/Pricing';
import { Trust } from '../journeys/public/Trust';
import { Ask } from '../journeys/public/Ask';
import { SignIn } from '../journeys/public/SignIn';

registerRoute({ path: '/site', side: 'public', bare: true, label: 'Talent Q', render: () => <Landing /> });
registerRoute({ path: '/site/how', side: 'public', bare: true, label: 'how Talent Q works', render: () => <How /> });
registerRoute({ path: '/site/employers', side: 'public', bare: true, label: 'for employers', render: () => <Employers /> });
registerRoute({ path: '/site/talent', side: 'public', bare: true, label: 'for talent', render: () => <Talent /> });
registerRoute({ path: '/site/pricing', side: 'public', bare: true, label: 'pricing', render: () => <Pricing /> });
registerRoute({ path: '/site/trust', side: 'public', bare: true, label: 'trust', render: () => <Trust /> });
registerRoute({ path: '/site/ask', side: 'public', bare: true, label: 'ask Q (sample)', render: () => <Ask /> });
registerRoute({ path: '/sign-in', side: 'public', bare: true, label: 'sign in', render: () => <SignIn /> });
