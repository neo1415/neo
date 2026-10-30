// ASSESS routes (coverage build, 30 Oct). Owned by the ASSESS builder. Interview sub-pages sit under /r/interviews/:id
// (so the Interviews rail entry stays current); the hubs and the question bank have their own entries.
import { registerRoute } from './registry';
import { QuestionBank } from '../journeys/assess/Bank';
import { LiveRoomCandidate, LiveRoomRecruiter } from '../journeys/assess/LiveRoom';
import { AvatarRoom } from '../journeys/assess/Avatar';
import { CandidateRecord, TranscriptPage } from '../journeys/assess/Record';
import { ScoreReview } from '../journeys/assess/Review';
import { CoachingPage } from '../journeys/assess/Coaching';
import { ExerciseCandidate, ExercisesRecruiter } from '../journeys/assess/Exercises';
import { CandidateHub, RecruiterHub } from '../journeys/assess/Hub';
import '../journeys/assess/ops';

registerRoute({ path: '/r/assess', side: 'recruiter', label: 'assessments', render: () => <RecruiterHub />, nav: { group: 'Hiring', label: 'Assessments', icon: 'practice', order: 18, orgKind: 'EMPLOYER', also: ['/r/questions', '/r/exercises', '/r/coaching'] } });
registerRoute({ path: '/r/questions', side: 'recruiter', label: 'the question bank', render: () => <QuestionBank /> });
registerRoute({ path: '/r/exercises', side: 'recruiter', label: 'exercises', render: () => <ExercisesRecruiter /> });
registerRoute({ path: '/r/coaching', side: 'recruiter', label: 'your interview coaching', render: () => <CoachingPage /> });
registerRoute({ path: '/r/interviews/:id/live', side: 'recruiter', label: 'the live interview room', render: (p) => <LiveRoomRecruiter key={p.id} id={p.id} /> });
registerRoute({ path: '/r/interviews/:id/transcript', side: 'recruiter', label: 'the interview transcript', render: (p) => <TranscriptPage key={p.id} id={p.id} /> });
registerRoute({ path: '/r/interviews/:id/review', side: 'recruiter', label: 'the score review', render: (p) => <ScoreReview key={p.id} id={p.id} /> });

registerRoute({ path: '/c/assess', side: 'candidate', label: 'your interviews and exercises', render: () => <CandidateHub />, nav: { group: 'Interviews', label: 'Interviews and exercises', icon: 'interview', order: 44 } });
registerRoute({ path: '/c/assess/avatar', side: 'candidate', label: 'the first-round interview', render: () => <AvatarRoom /> });
registerRoute({ path: '/c/assess/live/:id', side: 'candidate', label: 'the live interview', render: (p) => <LiveRoomCandidate key={p.id} id={p.id} /> });
registerRoute({ path: '/c/assess/record/:id', side: 'candidate', label: 'your interview record', render: (p) => <CandidateRecord key={p.id} id={p.id} /> });
registerRoute({ path: '/c/assess/ex/:id', side: 'candidate', label: 'an exercise', render: (p) => <ExerciseCandidate key={p.id} id={p.id} /> });
