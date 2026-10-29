// The one insertion on the job page: an in-page index (the job page is long on phones), the role briefing (if the
// listing has one), then the contact card. The index also links the job page's own sections by their heading ids.
import type { Job } from '../../state/domain';
import { PageIndex } from '../../ds/PageIndex';
import { RoleBriefing } from './RoleBriefing';
import { ContactRecruiter } from './ContactRecruiter';
import { briefingFor } from './logic';

export function JobContact({ job }: { job: Job }) {
  const items = [
    ...(briefingFor(job.id) ? [{ id: 'briefing', label: 'Briefing' }] : []),
    ...(job.status !== 'CLOSED' ? [{ id: 'contact', label: 'Ask them' }] : []),
    { id: 'tb-why-h', label: 'Fit' }, { id: 'tb-mf-h', label: 'For you' }, { id: 'tb-emp-h', label: 'Employer' },
  ];
  return <><PageIndex items={items} label="On this job page" /><RoleBriefing jobId={job.id} />{job.status !== 'CLOSED' && <ContactRecruiter job={job} />}</>;
}
