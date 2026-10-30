// Public-site content that more than one page (and the sample Q) uses. Sources:
// docs/sources/batch-6/00_START_HERE_PRODUCT_DECISION.md (positioning, two promises, Tobi/Seyi example) and
// 01_BUYER_EVIDENCE_AND_PRICING.md (offers; every price is a HYPOTHESIS from desk research, not a proven price).
import type { OfferId } from '../../state/areas/public';

export const LINE_COMMERCIAL = 'Evidence-first hiring, with Q doing the work.';
export const LINE_CANDIDATE = 'Show what you can do, even if your CV doesn’t.';
export const PROMISE_RECRUITER = 'Tell Q what needs doing. See candidates who demonstrate the skills, including people a keyword search would miss. Q helps you validate, contact, assess and coordinate them.';
export const PROMISE_CANDIDATE = 'Show your real capabilities once, choose who sees them, find genuine opportunities, and let Q help you prepare, apply and follow through.';

export interface Offer { id: OfferId; name: string; who: string; price: string; unit: string; includes: string[]; testing: string; free?: boolean }
export const OFFERS: Offer[] = [
  { id: 'pilot', name: 'Role pilot', who: 'For a first try, or a business that hires once or twice a year', price: '$99–$299', unit: 'one role, one month',
    includes: ['One live role, from criteria to interviews', 'Q’s work on that role, with a person reviewing Q’s results', 'Bounded work samples where a criterion is still open'],
    testing: 'Whether a short, fixed-price pilot lowers the hurdle of a first purchase. A one-role mandate at $79–$249, with no subscription, is being tested for occasional hirers.' },
  { id: 'team', name: 'Team plan', who: 'For in-house recruiters hiring every month', price: '$149–$399', unit: 'per hiring team, per month',
    includes: ['A stated allowance of live roles and Q work, shown up front', 'Shared criteria, approvals and messages for the team', 'Truthful statuses for every message and booking'],
    testing: 'Which allowance feels predictable, so a team never meets a surprise bill.' },
  { id: 'agency', name: 'Agency plan', who: 'For specialist agencies working for several clients', price: '$299–$799', unit: 'per month, or priced per live mandate',
    includes: ['Separate workspaces per client; client data never mixes', 'Evidence-backed submittals a client can read', 'Per-client reporting, with every send approved'],
    testing: 'Whether agencies prefer a monthly plan or a price per live mandate.' },
  { id: 'candidate', name: 'Candidate core', who: 'For anyone looking for work or wanting to grow', price: 'Free', unit: 'no fee to apply or to be found', free: true,
    includes: ['Your profile and Evidence Passport', 'Finding work, applying and following up', 'Sharing evidence with whoever you choose', 'Basic interview preparation'],
    testing: 'Optional paid practice ($5–$15 a month) is an idea only. It isn’t offered, and the core stays free.' },
];

/** Compare options (atlas SC-005: mandate / seat / agent / assessment). "Not decided" is said, never shown as zero. */
export const COMPARE: { row: string; cells: Record<OfferId, string> }[] = [
  { row: 'How it’s priced', cells: { pilot: 'Per role (a mandate)', team: 'Per hiring team (not per seat)', agency: 'Per month or per live mandate', candidate: 'Free' } },
  { row: 'Q’s work (agents)', cells: { pilot: 'Included for the one role', team: 'Allowance shown up front; size not decided', agency: 'Allowance per client; size not decided', candidate: 'Included' } },
  { row: 'Work samples (assessment)', cells: { pilot: 'Included where a criterion is open', team: 'Included; limit not decided', agency: 'Included; limit not decided', candidate: 'Free to take; never a fee to be considered' } },
  { row: 'People reviewing Q’s results', cells: { pilot: 'Yes, during the pilot', team: 'Your team', agency: 'Your team', candidate: 'You choose who sees what' } },
];
