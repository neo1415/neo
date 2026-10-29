// The one insertion on the job page: the role briefing (if the listing has one), then the contact card.
import type { Job } from '../../state/domain';
import { RoleBriefing } from './RoleBriefing';
import { ContactRecruiter } from './ContactRecruiter';

export function JobContact({ job }: { job: Job }) {
  return <><RoleBriefing jobId={job.id} />{job.status !== 'CLOSED' && <ContactRecruiter job={job} />}</>;
}
