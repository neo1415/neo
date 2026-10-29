// Agency area (R4, Dele at Talentbridge). Pools, saved searches, campaigns, submittals, collaboration notes,
// concurrent agent runs, documents, client reports and access requests. Tenant isolation: EVERY record
// carries clientOrgId, and every view, search, Q reply and report filters by the client in focus.
// Simulated: providers, sends and shares are fictional; statuses say so (SENT_SIMULATED, SHARED_SIMULATED).
import type { World } from '../../mock/world';

export type ClientId = 'org_kora' | 'org_medlink' | string;
export type FitMark = 'verified' | 'full' | 'partial' | 'none';

export interface Pool { id: string; clientOrgId: ClientId; name: string; mandateId: string; members: string[]; createdBy: string }
export interface SavedSearch {
  id: string; clientOrgId: ClientId; mandateId: string; name: string; query: string; keywords: string[];
  lastRunAt: string; results: string[]; newSinceLast: string[];
  /** The (simulated) market this search reads: who matches and since when. */
  universe: { personId: string; since: string }[]; runs: number;
}
export interface CampaignMsg { personId: string; status: 'QUEUED' | 'SENT_SIMULATED' | 'HELD' | 'EXCLUDED'; reason?: string; at?: string; receipt?: string; words: number }
export interface Campaign {
  id: string; clientOrgId: ClientId; poolId: string; mandateId: string; name: string; template: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'DONE';
  limits: { perRun: number; perDay: number; maxWords: number; followUps: number };
  approvedBy?: string; approvedAt?: string; messages: CampaignMsg[];
}
export interface SubmittalPerson { personId: string; included: boolean; reason?: string }
export interface Submittal {
  id: string; clientOrgId: ClientId; mandateId: string; poolId?: string; people: SubmittalPerson[];
  status: 'DRAFT' | 'SENT_SIMULATED' | 'CLIENT_REPLIED' | 'DISCARDED'; createdBy: string; createdAt: string;
  sentAt?: string; receipt?: string; reply?: string; nudgedAt?: string;
}
export interface Note { id: string; clientOrgId: ClientId; mandateId?: string; by: string; text: string; mentions: string[]; at: string; readBy: string[] }
export type RunState = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'FAILED' | 'RETRYING' | 'DONE' | 'CANCELLED';
export interface AgentRun {
  id: string; clientOrgId: ClientId; mandateId: string; label: string; kind: 'SEARCH' | 'EVIDENCE' | 'CAMPAIGN';
  provider: string; providerState: 'OK' | 'DOWN' | 'RECOVERED' | 'SKIPPED';
  total: number; done: number; state: RunState; priority: 1 | 2 | 3;
  /** Scripted outage (simulated): the provider stops answering at this unit, for this many attempts. */
  failAt?: number; failAttempts?: number; attempts: number; retryInTicks?: number;
  yields: { at: number; personId: string }[]; found: string[];
  log: { at: string; text: string; k: 'tool' | 'finding' | 'issue' | 'decision' }[];
  pausedReason?: string; campaignId?: string; searchId?: string; startedBy: string;
}
export interface Doc { id: string; clientOrgId: ClientId; mandateId?: string; name: string; kind: 'BRIEF' | 'SCORECARD' | 'UPLOAD'; signed?: boolean; confidential?: boolean; status: 'UPLOADING' | 'READY' | 'FAILED'; progress: number; summary: string; by: string; at: string }
export interface ReportSection { id: string; h: string; body: string }
export interface Report { clientOrgId: ClientId; v: number; status: 'DRAFT' | 'EDITED' | 'SHARED_SIMULATED'; sections: ReportSection[]; draftedAt: string; editedBy?: string; sharedAt?: string; receipt?: string; history: { v: number; at: string; by: string; note: string }[] }
export interface AccessRequest { id: string; actorId: string; recordId: string; recordLabel: string; clientOrgId: ClientId; reason: string; state: 'PENDING' | 'GRANTED' | 'DECLINED'; at: string; decidedBy?: string }

export interface AgencyState {
  v: 1;
  /** Client in focus, per signed-in person. Every list filters by it. */
  focus: Record<string, ClientId>;
  pools: Pool[]; searches: SavedSearch[]; campaigns: Campaign[]; submittals: Submittal[]; notes: Note[];
  runs: AgentRun[]; docs: Doc[]; reports: Record<string, Report>; access: AccessRequest[];
  /** Fit by requirement for each agency mandate and person (what the evidence shows; never one number). */
  fit: Record<string, Record<string, Record<string, FitMark>>>;
  /** Which clients each candidate has agreed to be put forward to (checked per person before a submittal). */
  shareConsent: Record<string, ClientId[]>;
  /** Candidates who withdrew consent from the agency, with when (mirrors Consent.withdrawnFrom). */
  withdrawn: Record<string, string>;
  lastTickAt: number | null; seq: number;
}

const KP = { kp1: 'verified', kp2: 'full', kp3: 'full' } as const;
const fitRow = (a: FitMark, b: FitMark, c: FitMark, ids: [string, string, string]) => ({ [ids[0]]: a, [ids[1]]: b, [ids[2]]: c });
const K: [string, string, string] = ['kp1', 'kp2', 'kp3'];
const M: [string, string, string] = ['ma1', 'ma2', 'ma3'];
const O: [string, string, string] = ['o1', 'o2', 'o3'];
const C: [string, string, string] = ['k1', 'k2', 'k3'];
const lg = (text: string, k: AgentRun['log'][number]['k'] = 'tool') => ({ at: '2026-10-29T08:58:00+01:00', text, k });

export const area = {
  id: 'agency',
  init: (): AgencyState => ({
    v: 1,
    focus: {},
    pools: [
      { id: 'pool_kora_pay', clientOrgId: 'org_kora', mandateId: 'm_tb_kora_pay', name: 'Payments engineers', members: ['p_tb_femi', 'p_tb_halima', 'p_tb_yemi', 'p_tb_kemi', 'p_tb_segun', 'p_dayo', 'p_zara'], createdBy: 'u_dele' },
      { id: 'pool_med_ops', clientOrgId: 'org_medlink', mandateId: 'm_ops', name: 'Operations analysts', members: ['p_tb_ruth', 'p_chidi', 'p_amaka', 'p_tb_bisi'], createdBy: 'u_dele' },
      { id: 'pool_med_api', clientOrgId: 'org_medlink', mandateId: 'm_tb_med_api', name: 'Remote backend engineers', members: ['p_tb_femi', 'p_tb_nneka', 'p_tb_obinna'], createdBy: 'u_tunde' },
    ],
    searches: [
      { id: 'ss_kora_backend', clientOrgId: 'org_kora', mandateId: 'm_tb_kora_pay', name: 'Kora backend: Go and payments, on-site Lagos', query: 'Go in production AND payments AND Lagos on-site', keywords: ['backend', 'payments', 'go', 'engineer'],
        lastRunAt: '2026-10-26', results: ['p_tb_femi', 'p_tb_halima', 'p_tb_yemi', 'p_dayo'], newSinceLast: [], runs: 3,
        universe: [{ personId: 'p_tb_femi', since: '2026-10-01' }, { personId: 'p_tb_halima', since: '2026-10-02' }, { personId: 'p_tb_yemi', since: '2026-10-12' }, { personId: 'p_dayo', since: '2026-10-20' }, { personId: 'p_tb_kemi', since: '2026-10-27' }, { personId: 'p_tb_segun', since: '2026-10-28' }] },
      { id: 'ss_med_ops', clientOrgId: 'org_medlink', mandateId: 'm_ops', name: 'Medlink operations analyst, remote', query: 'process mapping AND spreadsheet modelling AND remote', keywords: ['ops', 'operations', 'analyst'],
        lastRunAt: '2026-10-25', results: ['p_tb_ruth', 'p_chidi', 'p_amaka'], newSinceLast: [], runs: 2,
        universe: [{ personId: 'p_tb_ruth', since: '2026-10-05' }, { personId: 'p_chidi', since: '2026-10-10' }, { personId: 'p_amaka', since: '2026-10-11' }, { personId: 'p_tb_bisi', since: '2026-10-27' }] },
      { id: 'ss_med_api', clientOrgId: 'org_medlink', mandateId: 'm_tb_med_api', name: 'Medlink claims API backend, remote only', query: 'API design AND remote-only', keywords: ['backend', 'api', 'claims', 'engineer', 'remote'],
        lastRunAt: '2026-10-28', results: ['p_tb_femi', 'p_tb_nneka', 'p_tb_obinna'], newSinceLast: [], runs: 1,
        universe: [{ personId: 'p_tb_femi', since: '2026-10-01' }, { personId: 'p_tb_nneka', since: '2026-10-15' }, { personId: 'p_tb_obinna', since: '2026-10-18' }] },
    ],
    campaigns: [
      { id: 'camp_kora_pay', clientOrgId: 'org_kora', poolId: 'pool_kora_pay', mandateId: 'm_tb_kora_pay', name: 'Payments engineers: first contact', status: 'DRAFT',
        template: 'Hi {first}, I’m Dele at Talentbridge. Kora Pay is hiring a Payments Platform Engineer for its Lagos office (on-site). Your work on {hook} stood out. Would you be open to a 20-minute call this week? If not, just say so and I won’t follow up.',
        limits: { perRun: 4, perDay: 8, maxWords: 120, followUps: 1 }, messages: [] },
      { id: 'camp_med_api', clientOrgId: 'org_medlink', poolId: 'pool_med_api', mandateId: 'm_tb_med_api', name: 'Remote backend: Medlink claims API', status: 'DRAFT',
        template: 'Hi {first}, I’m Dele at Talentbridge. Medlink Health is hiring a remote-only Backend Engineer for its claims API. Your work on {hook} looks relevant. Open to a short chat?',
        limits: { perRun: 3, perDay: 6, maxWords: 120, followUps: 1 }, messages: [] },
    ],
    submittals: [
      { id: 'sub_med_ops_1', clientOrgId: 'org_medlink', mandateId: 'm_ops', poolId: 'pool_med_ops', people: [{ personId: 'p_tb_ruth', included: true }, { personId: 'p_chidi', included: true }], status: 'SENT_SIMULATED', createdBy: 'u_dele', createdAt: '2026-10-23', sentAt: '2026-10-23', receipt: 'sub_sim_7k2' },
    ],
    notes: [
      { id: 'n1', clientOrgId: 'org_kora', mandateId: 'm_tb_kora_pay', by: 'u_dele', text: 'Kora confirmed on-site in Lagos, four days a week. Seyi leads the payouts team.', mentions: [], at: '2026-10-27T15:10:00+01:00', readBy: ['u_dele'] },
      { id: 'n2', clientOrgId: 'org_medlink', mandateId: 'm_ops', by: 'u_tunde', text: '@Dele Ruth’s first reference came back positive. Second referee is on leave until Monday.', mentions: ['u_dele'], at: '2026-10-28T11:30:00+01:00', readBy: ['u_tunde'] },
    ],
    runs: [
      { id: 'run_kora_backend', clientOrgId: 'org_kora', mandateId: 'm_tb_kora_pay', label: 'Backend search', kind: 'SEARCH', provider: 'Talent Q network', providerState: 'OK', total: 24, done: 3, state: 'RUNNING', priority: 2, attempts: 1,
        yields: [{ at: 6, personId: 'p_tb_kemi' }, { at: 15, personId: 'p_tb_segun' }], found: [], log: [lg('Sourcing agent started · talent.search (Talent Q network)'), lg('Read 3 of 24 profiles')], startedBy: 'u_dele', searchId: 'ss_kora_backend' },
      { id: 'run_med_api', clientOrgId: 'org_medlink', mandateId: 'm_tb_med_api', label: 'Remote backend search', kind: 'SEARCH', provider: 'GitHub public profiles', providerState: 'OK', total: 36, done: 4, state: 'RUNNING', priority: 2, attempts: 1,
        yields: [{ at: 12, personId: 'p_tb_obinna' }], found: [], log: [lg('Sourcing agent started · talent.search (GitHub public profiles)'), lg('Read 4 of 36 profiles')], startedBy: 'u_dele', searchId: 'ss_med_api' },
      { id: 'run_med_ops', clientOrgId: 'org_medlink', mandateId: 'm_ops', label: 'Operations analyst search', kind: 'SEARCH', provider: 'JobBoard NG', providerState: 'OK', total: 14, done: 2, state: 'RUNNING', priority: 2, attempts: 1, failAt: 5, failAttempts: 2,
        yields: [{ at: 4, personId: 'p_tb_bisi' }], found: [], log: [lg('Sourcing agent started · talent.search (JobBoard NG)')], startedBy: 'u_dele', searchId: 'ss_med_ops' },
      { id: 'run_kora_evidence', clientOrgId: 'org_kora', mandateId: 'm_tb_kora_pay', label: 'Evidence checks for the shortlist', kind: 'EVIDENCE', provider: 'Evidence verifier', providerState: 'OK', total: 8, done: 0, state: 'QUEUED', priority: 3, attempts: 0,
        yields: [], found: [], log: [lg('Waiting for a free slot (3 agents run at once)')], startedBy: 'u_dele' },
    ],
    docs: [
      { id: 'd_kora_brief', clientOrgId: 'org_kora', mandateId: 'm_tb_kora_pay', name: 'Kora Pay client brief (signed).pdf', kind: 'BRIEF', signed: true, status: 'READY', progress: 100, summary: 'Payments Platform Engineer: Go, money movement, on-site Lagos four days a week. Fee 18%. Signed 21 Oct.', by: 'u_dele', at: '2026-10-21' },
      { id: 'd_kora_conf', clientOrgId: 'org_kora', mandateId: 'm_kora_agency', name: 'Kora payouts hire: confidential brief.pdf', kind: 'BRIEF', signed: true, confidential: true, status: 'READY', progress: 100, summary: 'Replacement hire for a payouts engineer who has not yet resigned publicly. Do not contact current Kora staff.', by: 'u_dele', at: '2026-10-22' },
      { id: 'd_med_brief', clientOrgId: 'org_medlink', mandateId: 'm_tb_med_api', name: 'Medlink claims API brief v2 (unsigned).docx', kind: 'BRIEF', signed: false, status: 'READY', progress: 100, summary: 'Remote-only backend engineer for the claims API. Waiting for Medlink’s signature.', by: 'u_dele', at: '2026-10-24' },
      { id: 'd_med_score', clientOrgId: 'org_medlink', mandateId: 'm_ops', name: 'Operations analyst scorecard.xlsx', kind: 'SCORECARD', status: 'READY', progress: 100, summary: 'Three criteria agreed with Medlink operations: process mapping, modelling, stakeholder interviews.', by: 'u_tunde', at: '2026-10-20' },
    ],
    reports: {},
    access: [],
    fit: {
      m_tb_kora_pay: {
        p_tb_femi: { ...KP }, p_tb_halima: fitRow('verified', 'verified', 'full', K), p_tb_yemi: fitRow('full', 'partial', 'full', K), p_tb_kemi: fitRow('full', 'full', 'full', K),
        p_tb_segun: fitRow('partial', 'full', 'full', K), p_dayo: fitRow('verified', 'full', 'none', K), p_zara: fitRow('full', 'none', 'none', K),
      },
      m_tb_med_api: { p_tb_femi: fitRow('verified', 'none', 'full', M), p_tb_nneka: fitRow('full', 'full', 'full', M), p_tb_obinna: fitRow('full', 'partial', 'full', M) },
      m_ops: { p_tb_ruth: fitRow('verified', 'full', 'full', O), p_chidi: fitRow('partial', 'partial', 'full', O), p_amaka: fitRow('partial', 'full', 'none', O), p_tb_bisi: fitRow('full', 'full', 'partial', O) },
      m_kora_agency: { p_dayo: fitRow('verified', 'full', 'none', C), p_zara: fitRow('full', 'none', 'full', C) },
    },
    shareConsent: {
      p_tb_femi: ['org_kora', 'org_medlink'], p_tb_halima: ['org_kora'], p_tb_yemi: ['org_kora'], p_tb_kemi: ['org_kora'], p_dayo: ['org_kora'], p_zara: ['org_kora'],
      p_tb_ruth: ['org_medlink'], p_chidi: ['org_medlink'], p_amaka: ['org_medlink'], p_tb_bisi: ['org_medlink'], p_tb_nneka: ['org_medlink'], p_tb_obinna: ['org_medlink'],
    },
    withdrawn: {},
    lastTickAt: null, seq: 0,
  }),
};

/** Typed accessor for the agency slice (falls back to a fresh slice if an older saved world lacks it). */
let FALLBACK: AgencyState | null = null;
export const agency = (w: World): AgencyState => (w.areas.agency as AgencyState | undefined) ?? (FALLBACK ??= area.init());
