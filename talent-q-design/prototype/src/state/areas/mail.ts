// Connected email and contact policy (addendum E-01; audit addendum §C). Providers are SIMULATED: no mailbox is
// reached. The store holds connection metadata only, never credentials. Messages themselves stay in w.threads.
// Owned by the EMAIL builder: mailboxes, contact policies, suppressions, follow-ups, org email policy, client
// reminder automations, extracted preferences (forgettable), "seen" receipts and the demo failure switch.
import type { World } from '../../mock/world';
import type { ContactPolicy, FailReason, FollowUpRule, MailboxConnection, Suppression } from '../domain';

/** Organisation email policy (E01-22): what Q applies when it drafts and sends from this organisation. */
export interface OrgMailPolicy {
  orgId: string; signature: string; legal: string; language: string; sendingHours: [string, string];
  /** Per mailbox per day; the provider has its own limits on top. */
  dailyCap: number; channels: ('EMAIL' | 'IN_APP' | 'SMS')[]; templates: { id: string; label: string; kind: string }[];
  externalData: string; escalation: string; delegation: string;
}
/** A client's pre-approved reminder automation (R4). Only a person can start it; pausing takes effect at once. */
export interface ReminderAutomation {
  id: string; orgId: string; clientOrgId?: string; mailboxId: string; label: string; messageClass: string;
  state: 'ACTIVE' | 'PAUSED'; cap: number; sent: number; approvedBy: string; approvedAt: string; pausedBy?: string; pausedAt?: string;
}
/** Something Q extracted from an email (a proposed time, a preference). A summary is never the canonical record. */
export interface Extracted { id: string; threadId: string; msgId: string; personId: string; kind: 'TIME' | 'PREFERENCE' | 'QUESTION'; text: string; at: string; forgotten?: boolean }

export interface MailState {
  mailboxes: MailboxConnection[]; policies: ContactPolicy[]; suppressions: Suppression[]; followUps: FollowUpRule[];
  contactLog: { personId: string; orgId: string; at: string }[];
  orgPolicy: OrgMailPolicy[]; automations: ReminderAutomation[]; extracted: Extracted[];
  /** Thread id → when someone at the organisation first opened a candidate-initiated thread ("seen", if known). */
  seen: Record<string, string>;
  /** Follow-up suggestions put off (thread id → until). */
  snoozed: Record<string, string>;
  /** DEMO ONLY: the next provider call for a mailbox fails this way (labelled "Demo" wherever it is set). */
  failNext: Record<string, FailReason | 'BOUNCED'>;
  /** Candidate drafts to an employer, by person and job (editable before sending). */
  contactDrafts: Record<string, { jobId: string; orgId: string; body: string; channel: 'IN_APP' | 'EMAIL'; at: string }>;
}

const KORA_TEMPLATES = [
  { id: 'tpl_invite', label: 'Interview invitation', kind: 'INVITE' },
  { id: 'tpl_avail', label: 'Next step and availability', kind: 'AVAILABILITY' },
  { id: 'tpl_follow', label: 'Polite follow-up', kind: 'FOLLOW_UP' },
  { id: 'tpl_reply', label: 'Reply to a candidate', kind: 'REPLY' },
  { id: 'tpl_decision', label: 'Decision (not progressing)', kind: 'REJECTION' },
];

export const area = {
  id: 'mail',
  init: (): MailState => ({
    mailboxes: [
      { id: 'mb_ada', owner: 'u_ada', orgId: 'org_kora', provider: 'GOOGLE', address: 'ada@kora.example', label: 'Ada Okafor (Google Workspace)', kind: 'PERSONAL', sendAs: ['u_ada'], scopes: ['SEND', 'READ'], state: 'CONNECTED', connectedAt: '2026-10-02', simulated: true },
      { id: 'mb_kora_careers', owner: 'u_ngozi', orgId: 'org_kora', provider: 'GOOGLE', address: 'careers@kora.example', label: 'Kora Pay Careers (shared)', kind: 'SHARED', sendAs: ['u_ngozi', 'u_ada', 'u_seyi'], scopes: ['SEND', 'READ'], state: 'CONNECTED', connectedAt: '2026-09-15', simulated: true },
      { id: 'mb_ngozi', owner: 'u_ngozi', orgId: 'org_kora', provider: 'MICROSOFT', address: 'ngozi.eze@kora.example', label: 'Ngozi Eze (Microsoft 365)', kind: 'PERSONAL', sendAs: ['u_ngozi'], scopes: ['SEND'], state: 'CONNECTED', connectedAt: '2026-09-20', simulated: true },
      { id: 'mb_dele', owner: 'u_dele', orgId: 'org_tb', provider: 'GOOGLE', address: 'dele@talentbridge.example', label: 'Dele Martins (Google Workspace)', kind: 'PERSONAL', sendAs: ['u_dele'], scopes: ['SEND', 'READ'], state: 'CONNECTED', connectedAt: '2026-08-30', simulated: true },
      { id: 'mb_tb_kora', owner: 'u_dele', orgId: 'org_tb', clientOrgId: 'org_kora', provider: 'OTHER', address: 'kora-hiring@talentbridge.example', label: 'Talentbridge for Kora Pay (client sender)', kind: 'CLIENT', sendAs: ['u_dele'], scopes: ['SEND'], state: 'CONNECTED', connectedAt: '2026-10-10', simulated: true },
      { id: 'mb_tobi', owner: 'p_tobi', provider: 'GOOGLE', address: 'tobi.adeyemi@gmail.example', label: 'Tobi’s Gmail', kind: 'PERSONAL', sendAs: ['p_tobi'], scopes: ['SEND'], state: 'CONNECTED', connectedAt: '2026-10-20', simulated: true },
      { id: 'mb_service', owner: 'system', provider: 'TALENTQ', address: 'notices@talentq.example', label: 'Talent Q notices (service)', kind: 'SERVICE', sendAs: [], scopes: ['SEND'], state: 'CONNECTED', connectedAt: '2026-01-01', simulated: true },
    ],
    policies: [
      { orgId: 'org_kora', candidateInitiated: 'BEFORE_APPLYING', channels: ['IN_APP', 'EMAIL'], perCandidateWeek: 2, publicRoute: 'Apply on the Kora Pay job page', publicAddress: 'careers@kora.example', replyWindowDays: 5 },
      { orgId: 'org_medlink', candidateInitiated: 'AFTER_APPLYING', channels: ['IN_APP'], perCandidateWeek: 1, publicRoute: 'Apply through the Medlink Health listing', replyWindowDays: 7 },
      { orgId: 'org_rivers', candidateInitiated: 'OFF', channels: [], perCandidateWeek: 0, publicRoute: 'Rivers Logistics takes questions through its application form only', replyWindowDays: 0 },
    ],
    suppressions: [], followUps: [], contactLog: [],
    orgPolicy: [
      { orgId: 'org_kora', signature: '{name}\n{title}, Kora Pay\nkora.example/careers', legal: 'Kora Pay processes your data to assess your application. Reply “stop” and we won’t contact you again.', language: 'English (UK)', sendingHours: ['08:00', '18:00'], dailyCap: 40, channels: ['EMAIL', 'IN_APP', 'SMS'], templates: KORA_TEMPLATES, externalData: 'Attach only items the candidate shared with Kora; never forward a profile outside Kora.', escalation: 'A candidate complaint goes to Ngozi Eze (HR lead) the same day.', delegation: 'Approve each send' },
      { orgId: 'org_tb', signature: '{name}\n{title}, Talentbridge', legal: 'Talentbridge acts for its clients. Reply “stop” to opt out.', language: 'English (UK)', sendingHours: ['08:00', '19:00'], dailyCap: 60, channels: ['EMAIL', 'IN_APP'], templates: KORA_TEMPLATES.slice(1, 3), externalData: 'Candidate data stays inside the client it was shared for.', escalation: 'Client complaints go to Dele Martins.', delegation: 'Approved campaigns, within limits' },
    ],
    automations: [
      { id: 'auto_kora_reminder', orgId: 'org_tb', clientOrgId: 'org_kora', mailboxId: 'mb_tb_kora', label: 'Interview-day reminder for Kora Pay candidates', messageClass: 'One reminder the day before a confirmed interview, from the approved template', state: 'ACTIVE', cap: 20, sent: 3, approvedBy: 'u_dele', approvedAt: '2026-10-12' },
    ],
    extracted: [], seen: {}, snoozed: {}, failNext: {}, contactDrafts: {},
  }),
};
export const mail = (w: World) => { const m = w.areas.mail as MailState; const d = area.init(); for (const k of Object.keys(d) as (keyof MailState)[]) if (m[k] === undefined) (m as unknown as Record<string, unknown>)[k] = d[k]; return m; };
export const policyOf = (w: World, orgId: string) => mail(w).policies.find((p) => p.orgId === orgId);
export const orgMailPolicy = (w: World, orgId?: string) => mail(w).orgPolicy.find((p) => p.orgId === orgId);
export const mailboxOf = (w: World, id?: string) => mail(w).mailboxes.find((m) => m.id === id);
/** Mailboxes this actor may send from (authority, not just existence). EXPIRED ones are listed so the UI can offer reconnect. */
export const sendersFor = (w: World, actorId: string, clientOrgId?: string) => mail(w).mailboxes.filter((m) => m.sendAs.includes(actorId) && m.state !== 'REVOKED' && (m.kind !== 'CLIENT' || m.clientOrgId === clientOrgId));
export const canRead = (m?: MailboxConnection) => !!m && m.state === 'CONNECTED' && m.scopes.includes('READ');
export const isSuppressed = (w: World, orgId: string, personId: string) => mail(w).suppressions.some((s) => s.orgId === orgId && s.personId === personId);
export const PROVIDER_NAME: Record<MailboxConnection['provider'], string> = { GOOGLE: 'Google', MICROSOFT: 'Microsoft', OTHER: 'your mail server', TALENTQ: 'Talent Q’s mail service' };
