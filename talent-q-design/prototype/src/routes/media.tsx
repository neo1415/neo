// MEDIA routes (audit addendum §F). The candidate side lives inside the Evidence Passport (/c/passport, Proof view);
// this file adds the recruiter's evidence report. Owned by the MEDIA builder.
import { registerRoute } from './registry';
import { VideoReport } from '../journeys/media/Report';
import '../journeys/media/logic';

registerRoute({ path: '/r/people/:id/video', side: 'recruiter', label: 'a candidate’s video evidence', render: (p) => <VideoReport key={p.id} id={p.id} /> });
