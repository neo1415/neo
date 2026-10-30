// ORG-ADMIN slice (coverage brief, 30 Oct): personal instructions (SC-020), approved templates (SC-021), channel
// verification and WhatsApp / phone consent (SC-023, V09), billing and usage with the budget warning (SC-024, MO-035),
// retention (SC-025, D9), compliance incidents (SC-141), model and provider routes (SC-144, V03), quality checks
// (SC-145, D17), learnings from consented outcomes (V29), source licences (SC-146) and agency placements (SC-140).
// Everything is keyed by organisation so tenancy holds: Kora's records never appear for Talentbridge and back.
// Nothing here calls a provider, charges money or sends anything. Every amount is a pricing HYPOTHESIS.
import type { World } from '../../mock/world';

export type InstrKind = 'TONE' | 'PROCESS' | 'LIMIT';
export interface Instruction { id: string; actorId: string; orgId: string; kind: InstrKind; text: string; on: boolean; at: string; used: number; source?: string }

export type TplKind = 'JD' | 'QUESTIONS' | 'SCORECARD';
export interface TplVersion { v: number; body: string[]; by: string; at: string; note: string }
export interface Template { id: string; orgId: string; kind: TplKind; title: string; state: 'DRAFT' | 'PROPOSED' | 'APPROVED' | 'RETIRED'; versions: TplVersion[]; approvedBy?: string; approvedAt?: string; used: number }

export type ChannelKind = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'VOICE';
export type ChannelState = 'NOT_STARTED' | 'CODE_SENT' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED' | 'NOT_OFFERED';
export interface Channel { orgId: string; kind: ChannelKind; state: ChannelState; sender: string; detail: string; at?: string; by?: string }
export type OptIn = 'YES' | 'NO' | 'NOT_ASKED' | 'ASKED';
export interface ChannelChoice { personId: string; whatsapp: OptIn; call: OptIn; at?: string; askedBy?: Record<string, string> }
/** A WhatsApp message kept beside the M9 thread it belongs to (thread id). Provider states are SIMULATED and distinct. */
export type WaStatus = 'AWAITING_APPROVAL' | 'ACCEPTED' | 'DELIVERED' | 'READ' | 'FAILED';
export interface WaMessage { id: string; orgId: string; personId: string; threadId: string; template: string; body: string; status: WaStatus; by: string; approvedBy?: string; history: { status: WaStatus; at: string }[]; simulated: true }
export interface CallCheck { id: string; orgId: string; personId: string; ok: boolean; reasons: { label: string; ok: boolean; detail: string }[]; at: string; scheduled?: string; by: string }

export interface Meter { id: string; label: string; used: number; included: number; unit: string; hint: string }
export interface BudgetReq { id: string; orgId: string; by: string; what: string; amount: number; state: 'OPEN' | 'APPROVED' | 'DECLINED'; at: string; decidedBy?: string }
export interface Billing {
  orgId: string; plan: string; hypothesis: string; range: string; seats: number; period: string;
  meters: Meter[];
  /** Simulated compute spend this month in USD, against a cap an admin sets. */
  budget: { cap: number; spent: number; warnAt: number; decision?: 'STOP' | 'SPEND'; decidedBy?: string; paused: boolean };
  requests: BudgetReq[]; quotes: { at: string; by: string; plan: string }[];
}

export type RetStatus = 'PROPOSED_D9' | 'BY_DESIGN';
export interface RetRule { id: string; data: string; period: string; options: string[]; why: string; status: RetStatus; changedBy?: string }
export interface Deletion { id: string; orgId: string; personId: string; requestedAt: string; via: string; state: 'OPEN' | 'DONE'; receipt?: { deleted: string[]; kept: { what: string; why: string }[] }; doneBy?: string; doneAt?: string }
export interface Retention { orgId: string; jurisdiction: 'NG' | 'UK'; rules: RetRule[]; deletions: Deletion[]; exports: { at: string; by: string }[] }

export interface Incident { id: string; orgId: string; title: string; detail: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; state: 'OPEN' | 'RESOLVED'; at: string; resolvedBy?: string; note?: string }

export interface ModelRoute {
  id: string; task: string; plain: string; tier: string; route: string[]; budget: string; timeoutMs: number; fallback: string; cache: string;
  version: string; rollout: 'ALL' | 'PILOT' | 'PAUSED'; issues: string[]; lastTrace?: { at: string; steps: string[] };
}
export type CheckStatus = 'NOT_RUN' | 'SIMULATED_SAMPLE' | 'TOO_FEW' | 'WAITING' | 'ENFORCED' | 'WORKING';
export interface QualityRun { at: string; by: string }

export interface Learning {
  id: string; orgId: string; text: string; change: string; from: string; outcomes: number; excluded: string; consent: string; scope: string; evaluation: string;
  state: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'NOT_ALLOWED'; decidedBy?: string; reason?: string; actorScope?: string;
}

export interface Source { id: string; orgId: string; name: string; kind: string; terms: string; renews?: string; health: 'OK' | 'DEGRADED' | 'EXPIRING' | 'NOT_LICENSED' | 'PENDING'; note: string; lastCheck?: string; paused?: boolean; renewalAsked?: string }

export interface Placement {
  id: string; orgId: string; clientOrgId: string; mandateId: string; personId: string; sourcedBy: string; sourcedAt: string;
  consent: 'YES' | 'PENDING' | 'NO'; submittedAt?: string; stage: 'REPRESENTED' | 'SUBMITTED' | 'INTERVIEWING' | 'OFFER' | 'PLACED';
  attribution: string; dispute?: { by: string; text: string; state: 'OPEN' | 'RESOLVED'; outcome?: string };
  invoice: { state: 'NONE' | 'DRAFT' | 'READY' | 'MARKED_SENT'; step?: number; terms: string; amountNote: string; paid: 'UNKNOWN' | 'MARKED_PAID' };
}

export interface OrgAdminState {
  instructions: Instruction[]; templates: Template[]; channels: Channel[]; choices: Record<string, ChannelChoice>;
  wa: WaMessage[]; calls: CallCheck[]; billing: Billing[]; retention: Retention[]; incidents: Incident[];
  routes: Record<string, ModelRoute[]>; quality: Record<string, QualityRun | undefined>; learnOn: Record<string, { on: boolean; by: string; at: string }>;
  learnings: Learning[]; sources: Source[]; placements: Placement[];
}

const I = (id: string, actorId: string, orgId: string, kind: InstrKind, text: string, used = 0): Instruction => ({ id, actorId, orgId, kind, text, on: true, at: '2026-10-14T10:00:00+01:00', used });
const T = (id: string, orgId: string, kind: TplKind, title: string, state: Template['state'], body: string[], by: string, v = 1, used = 0): Template => ({
  id, orgId, kind, title, state, used, versions: [{ v, body, by, at: '2026-10-12T10:00:00+01:00', note: v > 1 ? 'Updated after the handbook import' : 'First version' }],
  ...(state === 'APPROVED' ? { approvedBy: orgId === 'org_tb' ? 'u_dele' : 'u_ngozi', approvedAt: '2026-10-12' } : {}),
});
const RET = (): RetRule[] => [
  { id: 'ret_app', data: 'Applications and pipeline notes', period: '12 months after the role closes', options: ['6 months after the role closes', '12 months after the role closes', '24 months after the role closes'], why: 'Long enough to answer a candidate’s question or a dispute about the decision.', status: 'PROPOSED_D9' },
  { id: 'ret_msg', data: 'Messages sent to candidates', period: '24 months', options: ['12 months', '24 months', '36 months'], why: 'A record of what was said and approved, for both sides.', status: 'PROPOSED_D9' },
  { id: 'ret_audit', data: 'Audit events (who did what)', period: '6 years', options: ['2 years', '6 years'], why: 'Proof that rules, consents and deletions were honoured.', status: 'PROPOSED_D9' },
  { id: 'ret_tx', data: 'Interview transcripts', period: '6 months after the decision', options: ['90 days after the decision', '6 months after the decision', '12 months after the decision'], why: 'Reviewers can check a rating against what was said.', status: 'PROPOSED_D9' },
  { id: 'ret_rec', data: 'Interview recordings', period: 'Not stored (transcript only)', options: ['Not stored (transcript only)'], why: 'Audio and video are not kept; decision D10 is still open.', status: 'BY_DESIGN' },
  { id: 'ret_files', data: 'Files after deletion (backups)', period: '30 days', options: ['14 days', '30 days'], why: 'Backups roll over; a deleted file is gone from them after this.', status: 'PROPOSED_D9' },
  { id: 'ret_mem', data: 'Candidates’ memories with Q', period: 'Until the candidate deletes them', options: ['Until the candidate deletes them'], why: 'They belong to the candidate. Organisations never hold them.', status: 'BY_DESIGN' },
];
const ROUTES = (): ModelRoute[] => [
  { id: 'r_intent', task: 'Understanding what you type', plain: 'Works out what you asked for before anything else runs.', tier: 'Rules first, then a small fast model', route: ['On-device rules', 'Provider A · small'], budget: '400 tokens', timeoutMs: 800, fallback: 'Rules only; Q asks you to rephrase', cache: 'Per session', version: 'intent v0.9', rollout: 'ALL', issues: [] },
  { id: 'r_draft', task: 'Drafting messages', plain: 'Writes a draft from an approved template, your instructions and the guidelines.', tier: 'Mid-size model', route: ['Provider A · mid', 'Provider B · mid'], budget: '1,500 tokens', timeoutMs: 6000, fallback: 'The approved template with names filled in; never sends', cache: 'None (personal)', version: 'draft v0.4', rollout: 'ALL', issues: ['2 primary timeouts in the last 50 drafts (simulated)'] },
  { id: 'r_evidence', task: 'Reading evidence and explaining a ranking', plain: 'Reads shared evidence against the brief and says what it shows and doesn’t.', tier: 'Large model', route: ['Provider B · large', 'Provider A · large'], budget: '4,000 tokens', timeoutMs: 20000, fallback: 'Show the evidence without Q’s reading', cache: 'Per evidence version', version: 'explain v0.3', rollout: 'PILOT', issues: ['Unvalidated: prototype arithmetic only (D17)'] },
  { id: 'r_speech', task: 'Transcribing voice and video answers', plain: 'Turns speech into text the candidate checks before anyone sees it.', tier: 'Speech-to-text', route: ['Speech provider S1', 'Speech provider S2'], budget: '10 minutes per answer', timeoutMs: 60000, fallback: 'Ask the candidate to type; mark it pending', cache: 'None', version: 'stt v0.2', rollout: 'PILOT', issues: ['Accent never scored; transcript only (D10, D18)'] },
  { id: 'r_cv', task: 'Reading CVs and documents', plain: 'Pulls dates, roles and claims out of a document as claims, not facts.', tier: 'Small model', route: ['Provider A · small', 'Provider B · small'], budget: '2,000 tokens', timeoutMs: 5000, fallback: 'Ask the person to fill the fields', cache: 'Per file hash', version: 'parse v0.5', rollout: 'ALL', issues: [] },
  { id: 'r_source', task: 'Summarising a sourcing run', plain: 'Streams each source’s results as they arrive; no repeat calls for the same query.', tier: 'Mid-size model, streamed', route: ['Provider A · mid', 'Provider B · mid'], budget: '3,000 tokens per source', timeoutMs: 15000, fallback: 'Show raw results with no summary', cache: 'Same query for 24 hours', version: 'source v0.6', rollout: 'ALL', issues: [] },
];

export const area = {
  id: 'org-admin',
  init: (): OrgAdminState => ({
    instructions: [
      I('in_ada_1', 'u_ada', 'org_kora', 'TONE', 'Short, warm messages. Use first names.', 6),
      I('in_ada_2', 'u_ada', 'org_kora', 'PROCESS', 'Always offer two interview times, never one.', 3),
      I('in_ada_3', 'u_ada', 'org_kora', 'LIMIT', 'Leave the pay band out of messages for senior roles.', 0),
      I('in_bayo_1', 'u_bayo', 'org_kora', 'PROCESS', 'Send me a one-paragraph summary of my roles on Fridays.', 1),
      I('in_ngozi_1', 'u_ngozi', 'org_kora', 'TONE', 'Formal for decision messages; plain everywhere else.', 4),
      I('in_dele_1', 'u_dele', 'org_tb', 'LIMIT', 'Never name a confidential client before the first call.', 5),
    ],
    templates: [
      T('tp_jd_eng', 'org_kora', 'JD', 'Engineering role brief', 'APPROVED', ['What the team does, in one paragraph', 'Must-haves (3 at most), each observable', 'Pay band and work mode', 'How we assess: work sample, then panel of two'], 'u_ngozi', 2, 4),
      T('tp_q_backend', 'org_kora', 'QUESTIONS', 'Backend interview questions', 'APPROVED', ['Walk me through a money-movement bug you fixed.', 'How would you make a payout job safe to retry?', 'Tell me about an incident you led and what changed after.'], 'u_ngozi', 1, 2),
      T('tp_sc_eng', 'org_kora', 'SCORECARD', 'Engineering scorecard', 'APPROVED', ['Uses the role’s approved rubric', 'Each rating cites evidence or a quote', 'Overall view written last'], 'u_ngozi', 1, 1),
      T('tp_q_support', 'org_kora', 'QUESTIONS', 'Support lead questions', 'PROPOSED', ['How do you calm a merchant whose payout is late?', 'Where are you from originally?', 'Show me how you’d write a reply to a disputed charge.'], 'u_ada', 1, 0),
      T('tp_jd_tb', 'org_tb', 'JD', 'Client role brief (agency)', 'APPROVED', ['Client named only after the candidate agrees', 'Must-haves agreed with the client', 'Fee terms never shown to candidates'], 'u_dele', 1, 3),
    ],
    channels: [
      { orgId: 'org_kora', kind: 'EMAIL', state: 'VERIFIED', sender: 'careers@kora.example', detail: 'Domain verified; sends through connected mailboxes.', at: '2026-09-15', by: 'u_ngozi' },
      { orgId: 'org_kora', kind: 'SMS', state: 'IN_REVIEW', sender: 'Sender ID “KoraPay”', detail: 'Sender ID registration is with the carrier (simulated, partner-dependent).', at: '2026-10-20', by: 'u_ngozi' },
      { orgId: 'org_kora', kind: 'WHATSAPP', state: 'NOT_STARTED', sender: '+234 800 000 0142 (demo number)', detail: 'Not set up. Needs a verified business number, an approved display name and approved message templates.' },
      { orgId: 'org_kora', kind: 'VOICE', state: 'NOT_STARTED', sender: '+234 800 000 0142 (demo number)', detail: 'Calls are placed from a verified number. Calls are never recorded (D10).' },
      { orgId: 'org_tb', kind: 'EMAIL', state: 'VERIFIED', sender: 'dele@talentbridge.example', detail: 'Domain verified.', at: '2026-08-30', by: 'u_dele' },
      { orgId: 'org_tb', kind: 'SMS', state: 'NOT_STARTED', sender: 'Not chosen', detail: 'Not set up.' },
      { orgId: 'org_tb', kind: 'WHATSAPP', state: 'VERIFIED', sender: '+234 800 000 0277 (demo number)', detail: 'Verified (simulated). Two message templates approved.', at: '2026-10-05', by: 'u_dele' },
      { orgId: 'org_tb', kind: 'VOICE', state: 'VERIFIED', sender: '+234 800 000 0277 (demo number)', detail: 'Verified (simulated). Never recorded.', at: '2026-10-05', by: 'u_dele' },
    ],
    choices: {
      p_zara: { personId: 'p_zara', whatsapp: 'YES', call: 'NOT_ASKED', at: '2026-10-25' },
      p_grace: { personId: 'p_grace', whatsapp: 'NO', call: 'NO', at: '2026-10-26' },
      p_tb_halima: { personId: 'p_tb_halima', whatsapp: 'YES', call: 'YES', at: '2026-10-20' },
    },
    wa: [], calls: [],
    billing: [
      { orgId: 'org_kora', plan: 'Team', hypothesis: '$249 a month', range: 'tested range $149–$399 per hiring team', seats: 6, period: '1–31 October 2026',
        meters: [
          { id: 'roles', label: 'Live roles', used: 0, included: 5, unit: 'roles', hint: 'Counted from your open roles.' },
          { id: 'runs', label: 'Agent runs', used: 38, included: 50, unit: 'runs', hint: 'Sourcing, screening and drafting runs Q started for you.' },
          { id: 'checks', label: 'Evidence checks', used: 12, included: 40, unit: 'checks', hint: 'Simulated issuer and repository checks.' },
          { id: 'minutes', label: 'Transcription', used: 46, included: 300, unit: 'minutes', hint: 'Voice and video answers, transcript only.' },
        ],
        budget: { cap: 40, spent: 30.4, warnAt: 0.8, paused: false },
        requests: [{ id: 'br_1', orgId: 'org_kora', by: 'u_ada', what: 'A second sourcing run for Customer Support Lead (about 6 runs)', amount: 4.8, state: 'OPEN', at: '2026-10-28T15:10:00+01:00' }],
        quotes: [] },
      { orgId: 'org_tb', plan: 'Agency', hypothesis: '$499 a month', range: 'tested range $299–$799 for small agencies', seats: 9, period: '1–31 October 2026',
        meters: [
          { id: 'roles', label: 'Live mandates', used: 0, included: 10, unit: 'mandates', hint: 'Counted from your open mandates.' },
          { id: 'runs', label: 'Agent runs', used: 61, included: 120, unit: 'runs', hint: 'Three can run at once (D11).' },
          { id: 'checks', label: 'Evidence checks', used: 20, included: 80, unit: 'checks', hint: 'Simulated.' },
          { id: 'minutes', label: 'Transcription', used: 0, included: 300, unit: 'minutes', hint: 'Transcript only.' },
        ],
        budget: { cap: 90, spent: 41.2, warnAt: 0.8, paused: false }, requests: [], quotes: [] },
    ],
    retention: [
      { orgId: 'org_kora', jurisdiction: 'NG', rules: RET(), exports: [],
        deletions: [{ id: 'del_grace', orgId: 'org_kora', personId: 'p_grace', requestedAt: '2026-10-28T11:30:00+01:00', via: 'Grace asked in Talent Q settings', state: 'OPEN' }] },
      { orgId: 'org_tb', jurisdiction: 'NG', rules: RET(), exports: [], deletions: [] },
    ],
    incidents: [
      { id: 'inc_hours', orgId: 'org_kora', title: 'Interview invitation drafted outside interview hours', detail: 'Q proposed 09:00 for Musa (London). The hours guideline caught it before approval; nothing was sent.', severity: 'LOW', state: 'OPEN', at: '2026-10-27T17:05:00+01:00' },
      { id: 'inc_mailbox', orgId: 'org_kora', title: 'Shared mailbox token near expiry', detail: 'careers@kora.example needs reconnecting within 14 days (simulated).', severity: 'MEDIUM', state: 'OPEN', at: '2026-10-28T09:00:00+01:00' },
      { id: 'inc_tb_client', orgId: 'org_tb', title: 'Client name in a draft before the first call', detail: 'Dele’s instruction caught “Kora Pay” in a draft to a new candidate. Removed before approval.', severity: 'LOW', state: 'RESOLVED', at: '2026-10-22T12:00:00+01:00', resolvedBy: 'u_dele', note: 'Instruction worked as intended.' },
    ],
    routes: { org_kora: ROUTES(), org_tb: ROUTES() },
    quality: {},
    learnOn: { org_kora: { on: true, by: 'u_ngozi', at: '2026-10-12' }, org_tb: { on: false, by: 'u_dele', at: '2026-10-01' } },
    learnings: [
      { id: 'ln_payband', orgId: 'org_kora', text: 'First messages that named the pay band got a reply more often.', change: 'Keep the pay band near the top of first messages.', from: 'Reply outcomes on Kora’s own first messages', outcomes: 9, excluded: '2 left out: those candidates said no to “help improve Talent Q”', consent: 'Kora’s admin turned on learning from Kora’s outcomes (Ngozi, 12 Oct)', scope: 'Kora Pay only', evaluation: 'Simulated sample of 9 threads. Too few to tell whether it’s real; shown so you can judge it.', state: 'PROPOSED' },
      { id: 'ln_firstname', orgId: 'org_kora', text: 'Ngozi changes “Dear candidate” to the person’s first name in every draft.', change: 'Add a personal instruction for Ngozi: open with the first name.', from: 'Ngozi’s own edits to Q’s drafts (7 of 7)', outcomes: 7, excluded: 'None', consent: 'Ngozi’s own edits, used only for Ngozi', scope: 'Ngozi’s drafts only', evaluation: 'Every one of the 7 edits made the same change.', state: 'PROPOSED', actorScope: 'u_ngozi' },
      { id: 'ln_culture', orgId: 'org_kora', text: '“Culture fit” in interview feedback was challenged in review twice.', change: 'Ask the interviewer for a job-related reason when feedback says “culture fit”.', from: 'Reviewed interview feedback', outcomes: 4, excluded: 'None', consent: 'Kora’s own review outcomes', scope: 'Kora Pay only', evaluation: 'Simulated sample of 4 reviews. Not a statistic.', state: 'PROPOSED' },
      { id: 'ln_practice', orgId: 'org_kora', text: 'Candidates’ private practice answers', change: 'None', from: 'Private practice', outcomes: 0, excluded: 'All of it', consent: 'Never asked: practice is private to the candidate', scope: '—', evaluation: '—', state: 'NOT_ALLOWED', reason: 'Private practice is never used to train or tune Q, for anyone.' },
      { id: 'ln_tb_reminder', orgId: 'org_tb', text: 'Reminders sent the day before an interview cut no-shows.', change: 'Keep the reminder automation on for confirmed interviews.', from: 'Talentbridge reminder outcomes', outcomes: 3, excluded: 'None', consent: 'Learning is off for Talentbridge, so this stays a suggestion only', scope: 'Talentbridge only', evaluation: 'Simulated sample of 3. Not a statistic.', state: 'PROPOSED' },
    ],
    sources: [
      { id: 'src_net', orgId: 'org_kora', name: 'Talent Q network', kind: 'Candidate profiles', terms: 'Each person’s own discovery rule decides who finds them.', health: 'OK', note: 'Consented profiles only.' },
      { id: 'src_gh', orgId: 'org_kora', name: 'Public code repositories', kind: 'Public work', terms: 'Public API terms; rate limited.', health: 'DEGRADED', note: 'Rate limited in 2 of the last 10 checks (simulated).' },
      { id: 'src_board', orgId: 'org_kora', name: 'Job board feed', kind: 'Job listings', terms: 'Annual licence, read-only.', renews: '2026-11-08', health: 'EXPIRING', note: 'Licence ends in 9 days.' },
      { id: 'src_cac', orgId: 'org_kora', name: 'Company registry check', kind: 'Organisation verification', terms: 'Partner contract not signed (D7).', health: 'PENDING', note: 'Checks are simulated until a partner is chosen.' },
      { id: 'src_li', orgId: 'org_kora', name: 'Professional networking sites', kind: 'Profiles', terms: 'No licence. Talent Q does not scrape.', health: 'NOT_LICENSED', note: 'Not connected, by design.' },
      { id: 'src_net_tb', orgId: 'org_tb', name: 'Talent Q network', kind: 'Candidate profiles', terms: 'Each person’s own discovery rule decides who finds them.', health: 'OK', note: 'Consented profiles only.' },
      { id: 'src_crm', orgId: 'org_tb', name: 'Talentbridge candidate records (import)', kind: 'Agency records', terms: 'Talentbridge’s own data; stays in Talentbridge.', renews: '2027-01-15', health: 'OK', note: '9 registered candidates imported.' },
      { id: 'src_li_tb', orgId: 'org_tb', name: 'Professional networking sites', kind: 'Profiles', terms: 'No licence. Talent Q does not scrape.', health: 'NOT_LICENSED', note: 'Not connected, by design.' },
    ],
    placements: [
      { id: 'pl_halima', orgId: 'org_tb', clientOrgId: 'org_kora', mandateId: 'm_tb_kora_pay', personId: 'p_tb_halima', sourcedBy: 'u_dele', sourcedAt: '2026-10-26', consent: 'YES', submittedAt: '2026-10-27', stage: 'OFFER', attribution: 'Talentbridge: registered with Talentbridge and submitted with her consent on 27 Oct.', invoice: { state: 'DRAFT', step: 2, terms: '15% of first-year base (from the signed Kora brief, fictional)', amountNote: 'Calculated when the offer is accepted', paid: 'UNKNOWN' } },
      { id: 'pl_femi', orgId: 'org_tb', clientOrgId: 'org_kora', mandateId: 'm_tb_kora_pay', personId: 'p_tb_femi', sourcedBy: 'u_dele', sourcedAt: '2026-10-26', consent: 'YES', submittedAt: '2026-10-28', stage: 'INTERVIEWING', attribution: 'Talentbridge: submitted to Kora with his consent on 28 Oct.', invoice: { state: 'NONE', terms: '15% of first-year base (fictional)', amountNote: '—', paid: 'UNKNOWN' } },
      { id: 'pl_femi_med', orgId: 'org_tb', clientOrgId: 'org_medlink', mandateId: 'm_tb_med_api', personId: 'p_tb_femi', sourcedBy: 'u_dele', sourcedAt: '2026-10-28', consent: 'PENDING', stage: 'REPRESENTED', attribution: 'Not submitted. Femi hasn’t agreed to be put forward to Medlink yet.', invoice: { state: 'NONE', terms: 'Medlink terms awaiting signature', amountNote: '—', paid: 'UNKNOWN' } },
      { id: 'pl_ruth', orgId: 'org_tb', clientOrgId: 'org_medlink', mandateId: 'm_ops', personId: 'p_tb_ruth', sourcedBy: 'u_dele', sourcedAt: '2026-10-23', consent: 'YES', submittedAt: '2026-10-24', stage: 'SUBMITTED', attribution: 'Disputed: Medlink says Ruth applied to its own listing first.', dispute: { by: 'Medlink Health', text: 'Ruth applied through our listing on 22 Oct.', state: 'OPEN' }, invoice: { state: 'NONE', terms: 'Medlink terms awaiting signature', amountNote: '—', paid: 'UNKNOWN' } },
    ],
  }),
};

/** Typed accessors. Reading never mutates; inside update() use oaw() for a writable slice. */
export const oa = (w: World) => ((w.areas['org-admin'] as OrgAdminState | undefined) ?? area.init());
export const oaw = (w: World) => ((w.areas['org-admin'] ??= area.init()) as OrgAdminState);
