// Routes for HIRE-D (coverage build, 30 Oct). Each extends an existing page rather than duplicating it:
//   /r/explore            SC-034 Explore Talent landing, with SC-046 (search empty state) as one of its states
//   /r/sourcing/scope     SC-033 search scope and sources (extends /r/sourcing)
//   /r/calendar/book/:id  SC-053 calendar booking (extends /r/calendar; hire-c's scheduling underneath)
//   /r/pipeline/:m/:p     SC-056 candidate stage detail (a detail state of /r/pipeline)
//   /r/offer/:m/:p        SC-058 offer and negotiation handoff
//   /r/outcomes           SC-060 placement outcome journal
//   /r/reminders          SC-159 interview reminder and follow-up queue; /c/reminders is the candidate's choice
import { registerRoute } from './registry';
import { Explore } from '../journeys/hire-d/Explore';
import { Scope } from '../journeys/hire-d/Scope';
import { Booking } from '../journeys/hire-d/Booking';
import { StageDetail } from '../journeys/hire-d/Stage';
import { OfferPage } from '../journeys/hire-d/Offer';
import { Outcomes } from '../journeys/hire-d/Outcomes';
import { CandidateReminders, Reminders } from '../journeys/hire-d/Reminders';
import '../journeys/hire-d/ops';
import '../journeys/hire-d/Delivery';
import '../journeys/hire-d/hire-d.css';

registerRoute({ path: '/r/explore', side: 'recruiter', label: 'explore talent', render: () => <Explore />, nav: { group: 'Hiring', label: 'Explore talent', icon: 'search', order: 12, also: ['/r/sourcing/scope'] } });
registerRoute({ path: '/r/sourcing/scope', side: 'recruiter', label: 'search sources', render: () => <Scope /> });
registerRoute({ path: '/r/calendar/book/:id', side: 'recruiter', label: 'interview booking', render: (p) => <Booking key={p.id} pid={p.id} /> });
registerRoute({ path: '/r/pipeline/:mid/:pid', side: 'recruiter', label: 'stage detail', render: (p) => <StageDetail key={p.mid + p.pid} mid={p.mid} pid={p.pid} /> });
registerRoute({ path: '/r/offer/:mid/:pid', side: 'recruiter', label: 'the offer', render: (p) => <OfferPage key={p.mid + p.pid} mid={p.mid} pid={p.pid} /> });
registerRoute({ path: '/r/outcomes', side: 'recruiter', label: 'placements', render: () => <Outcomes />, nav: { group: 'Hiring', label: 'Placements', icon: 'people', order: 19, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/reminders', side: 'recruiter', label: 'reminders', render: () => <Reminders />, nav: { group: 'Hiring', label: 'Reminders', icon: 'calendar', order: 18, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/c/reminders', side: 'candidate', label: 'interview reminders', render: () => <CandidateReminders /> });
