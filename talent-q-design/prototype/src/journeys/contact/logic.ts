// Candidate-initiated recruiter correspondence (audit addendum §C) and the role briefing (AD-C-01).
// Policy first: what the employer allows (before applying, after applying, off), on which channels, how many new
// conversations a week. Q never invents or scrapes a recruiter address; when contact is off it offers the published
// route. Threads live in w.threads with initiatedBy: CANDIDATE and a state; nothing here reaches a real mailbox.
import { emit, now, orgOf, simNow, uid, type World } from '../../mock/world';
import type { Actor, Job, Thread, ThreadState } from '../../state/domain';
import { mail, mailboxOf, policyOf } from '../../state/areas/mail';
import { appendQ } from '../../q/core/engine';
import { BRIEFINGS } from './briefing';

export const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export const briefingFor = (jobId: string) => BRIEFINGS[jobId];

/** Find what the briefing says about a question. Quotes the line and its time; never answers beyond it. */
const TOPICS: [RegExp, RegExp][] = [
  [/on.?call|pager|out of hours|weekend|incident/, /on-call/i],
  [/report to|manager|who.*(lead|boss)|team/, /report to|team of/i],
  [/pay|salary|band|money|compensation/, /pay band|₦/i],
  [/remote|hybrid|office|onsite|where/, /office|hybrid|remote/i],
  [/interview|process|stages|steps|hire/, /interview|stages|steps/i],
  [/stack|go\b|golang|postgres|tech|language/, /Go\b|Postgres/i],
];
export function answerFromBriefing(jobId: string, norm: string) {
  const b = BRIEFINGS[jobId]; if (!b) return undefined;
  const topic = TOPICS.find(([q]) => q.test(norm)); if (!topic) return { b, line: undefined };
  const line = b.transcript.find((l) => topic[1].test(l.text));
  return { b, line };
}

export interface ContactState {
  policy: ReturnType<typeof policyOf>; allowed: boolean; why: string; channels: ('IN_APP' | 'EMAIL')[];
  route: string; address?: string; left: number; applied: boolean; thread?: Thread; mailbox?: ReturnType<typeof mailboxOf>;
}
const WEEK = 7 * 864e5;
export function contactState(w: World, pid: string, job: Job): ContactState {
  const p = policyOf(w, job.orgId); const org = orgOf(w, job.orgId)?.name ?? 'This employer';
  const applied = w.applications.some((a) => a.personId === pid && a.jobId === job.id && a.status !== 'WITHDRAWN' && a.status !== 'DRAFT');
  const thread = w.threads.find((t) => t.orgId === job.orgId && t.personId === pid && (t.mandateId === job.mandateId || !job.mandateId) && t.messages.some((m) => m.status !== 'DISCARDED'));
  const since = simNow(w).getTime() - WEEK;
  const used = mail(w).contactLog.filter((c) => c.personId === pid && c.orgId === job.orgId && new Date(c.at).getTime() >= since).length;
  const left = Math.max(0, (p?.perCandidateWeek ?? 0) - used);
  const mb = mailboxOf(w, mail(w).mailboxes.find((m) => m.owner === pid)?.id);
  const base = { policy: p, channels: p?.channels ?? [], route: p?.publicRoute ?? `Apply through ${org}’s listing`, address: p?.publicAddress, left, applied, thread, mailbox: mb };
  const consentWithdrawn = w.consents[pid]?.withdrawnFrom.includes(job.orgId);
  if (thread && (thread.state === 'BLOCKED' || thread.state === 'REPORTED')) return { ...base, allowed: false, why: `${org} closed this conversation. You can still apply or use the published route.` };
  if (consentWithdrawn) return { ...base, allowed: false, why: `You withdrew consent for ${org} to contact you, so new messages are paused. You can turn it back on in your privacy settings.` };
  // Replying in an established conversation is allowed even when starting one is stricter (AD-C-07).
  if (thread && thread.messages.some((m) => m.from !== pid)) return { ...base, allowed: true, why: `You already have a conversation with ${org}; you can reply there.` };
  if (!p || p.candidateInitiated === 'OFF') return { ...base, allowed: false, why: `${org} doesn’t take direct messages about its roles.` };
  if (p.candidateInitiated === 'AFTER_APPLYING' && !applied) return { ...base, allowed: false, why: `${org} takes questions from people who have applied.` };
  if (left <= 0) return { ...base, allowed: false, why: `You’ve started ${p.perCandidateWeek} conversation${p.perCandidateWeek === 1 ? '' : 's'} with ${org} this week, which is their limit. You can start another next week, or reply in an existing one.` };
  return { ...base, allowed: true, why: p.candidateInitiated === 'BEFORE_APPLYING' ? `${org} welcomes questions before you apply.` : `${org} takes questions from people who have applied, and you have.` };
}
export const CHANNEL_WORD = { IN_APP: 'In Talent Q', EMAIL: 'By email' } as const;

/** Q's short, relevant question for a role (3 lines, editable). */
export function draftQuestion(w: World, a: Actor, job: Job, about?: string) {
  const b = BRIEFINGS[job.id];
  const useful = about && about.length > 12 && !/^(this|the|that|your) (role|job|position|vacancy)\b/i.test(about.trim());
  const q = useful ? about!.trim().replace(/^\w/, (x) => x.toUpperCase()).replace(/[?.!\s]*$/, '?') : b ? 'The briefing mentions a one-in-six on-call week. Is the secondary on-call also on the payments team, and how often are you paged out of hours?' : `Could you tell me more about what the first three months in this role look like?`;
  return `Hello ${orgOf(w, job.orgId)?.name} team,\nI’m interested in the ${job.title} role. ${q}\nThank you, ${a.first}`;
}

/** Send a candidate-initiated message. Checks the policy again at send time (things change). */
export function sendContact(w: World, a: Actor, jobId: string, body: string, channel: 'IN_APP' | 'EMAIL'): { ok: boolean; text: string; threadId?: string } {
  const pid = a.personId!; const job = w.jobs.find((j) => j.id === jobId);
  if (!job) return { ok: false, text: 'That job isn’t listed any more.' };
  const org = orgOf(w, job.orgId)?.name ?? 'the employer';
  const st = contactState(w, pid, job);
  if (!st.allowed) return { ok: false, text: `I haven’t sent it. ${st.why} ${st.policy?.candidateInitiated === 'OFF' || !st.policy ? `The published route is: ${st.route}.` : ''}`.trim() };
  if (!body.trim()) return { ok: false, text: 'The message is empty, so I didn’t send it.' };
  if (!st.channels.includes(channel)) channel = st.channels[0] ?? 'IN_APP';
  if (channel === 'EMAIL' && (!st.mailbox || st.mailbox.state !== 'CONNECTED')) return { ok: false, text: `Your email isn’t connected, so I can’t send it by email. I can send it in Talent Q instead, or you can connect your email in Email settings.` };
  const offline = w.network === 'offline';
  let t = st.thread;
  const fresh = !t;
  if (!t) { t = { id: uid('t'), orgId: job.orgId, personId: pid, mandateId: job.mandateId, messages: [], initiatedBy: 'CANDIDATE', state: 'OPEN', channel: { current: channel, reason: channel === 'EMAIL' ? 'You chose email' : `${org} prefers Talent Q messages` } }; w.threads.push(t); }
  const shared = channel === 'EMAIL' ? mailboxOf(w, mail(w).mailboxes.find((m) => m.orgId === job.orgId && m.address === st.address)?.id) : undefined;
  t.messages.push({ id: uid('msg'), from: pid, to: channel === 'EMAIL' ? (st.address ?? job.orgId) : job.orgId, subject: `Question: ${job.title}`, body: body.trim(), at: now(), status: offline ? 'QUEUED_OFFLINE' : 'RECEIVED', channel,
    senderId: channel === 'EMAIL' ? st.mailbox?.id : undefined, delivery: offline ? undefined : 'ACCEPTED', acceptedAt: offline ? undefined : now(),
    inbound: channel === 'EMAIL' && shared ? { mailbox: shared.id, matchedBy: 'SENDER_AND_ROLE' } : undefined });
  if (t.state === 'TIMEOUT' || t.state === 'CLOSED') t.state = 'OPEN';
  if (fresh) mail(w).contactLog.push({ personId: pid, orgId: job.orgId, at: now() });
  delete mail(w).contactDrafts[pid];
  emit(w, a.id, 'contact.candidate.sent', `SHARED:${job.orgId}:${pid}`, `${a.name} asked ${org} a question about ${job.title} (${channel === 'EMAIL' ? 'email, simulated' : 'in Talent Q'}).`, { threadId: t.id, initiatedBy: 'CANDIDATE' });
  // The organisation's people who can reply get one notice (no proactive noise for the candidate).
  const owner = job.orgId === 'org_kora' ? 'u_ada' : undefined;
  if (owner) appendQ(w, owner, { who: 'q', kind: 'notice', engine: 'system', text: `${a.name} asked about ${job.title} (they started the conversation). It isn’t filed under a campaign yet.`, actions: [{ label: 'Open it', act: { t: 'nav', to: '/r/messages' } }, { label: 'Put it in Q4 Engineering', act: { t: 'say', text: 'put this in the Q4 Engineering campaign' } }] });
  return { ok: true, threadId: t.id, text: offline ? `You’re offline, so it hasn’t gone yet. It’s saved and goes to ${org} when you reconnect.`
    : channel === 'EMAIL' ? `Sent by email from ${st.mailbox!.address} to ${st.address} (simulated: accepted by Google). Your Gmail is connected send-only, so I can’t see replies there; ${org}’s replies in Talent Q show in Messages.`
      : `Sent to ${org} in Talent Q (simulated). It’s in Messages with its status. ${org} usually replies within ${st.policy?.replyWindowDays ?? 5} days, but I can’t promise when.` };
}

/** What the candidate sees for a conversation they started, and what they can still do. */
export function candidateStatus(w: World, t: Thread, pid: string): { label: string; tone?: 'ok' | 'warn' | 'risk' | 'busy'; can: string } {
  const org = orgOf(w, t.orgId)?.name ?? 'The employer';
  const st: ThreadState | undefined = t.state;
  const withdrawnApp = w.applications.some((a) => a.personId === pid && a.status === 'WITHDRAWN' && w.jobs.find((j) => j.id === a.jobId)?.orgId === t.orgId);
  if (st === 'BLOCKED' || st === 'REPORTED') return { label: 'Closed by the employer', tone: 'warn', can: `${org} closed this conversation. Your application, if you made one, isn’t affected. You can still use ${org}’s published route.` };
  if (st === 'CONSENT_REVOKED' || w.consents[pid]?.withdrawnFrom.includes(t.orgId)) return { label: 'Consent withdrawn', tone: 'warn', can: `You withdrew consent for ${org} to contact you. Queued messages and reminders were stopped. Messages already sent can’t be unsent from their inbox.` };
  if (st === 'APPLICATION_WITHDRAWN' || withdrawnApp) return { label: 'Application withdrawn', tone: 'warn', can: 'You withdrew your application. You can still read this conversation.' };
  if (st === 'MUTED') return { label: 'Muted', can: 'You won’t get notices for this conversation. Replies still arrive here. Unmute any time.' };
  const last = t.messages[t.messages.length - 1];
  const theirs = [...t.messages].reverse().find((m) => m.from !== pid && (m.status === 'SENT_SIMULATED' || m.status === 'RECEIVED'));
  if (theirs && theirs.at >= (t.messages.filter((m) => m.from === pid).pop()?.at ?? '')) return { label: 'Replied', tone: 'ok', can: 'You can reply here.' };
  if (last?.status === 'QUEUED_OFFLINE') return { label: 'Waiting to send', tone: 'busy', can: 'It goes when you reconnect.' };
  const pol = policyOf(w, t.orgId);
  const days = last ? (simNow(w).getTime() - new Date(last.at).getTime()) / 864e5 : 0;
  if (st === 'TIMEOUT' || (pol && pol.replyWindowDays && days > pol.replyWindowDays)) return { label: 'No reply yet', tone: 'warn', can: `${org} usually replies within ${pol?.replyWindowDays ?? 7} days and hasn’t yet. That isn’t a rejection. You can send one polite follow-up, or apply if you haven’t.` };
  const seenAt = mail(w).seen[t.id];
  if (seenAt) return { label: `Seen by ${org}`, tone: 'busy', can: `Opened on ${new Date(seenAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}. A reply isn’t guaranteed.` };
  return { label: 'Sent', can: `${org} hasn’t opened it yet, as far as Talent Q can tell.` };
}
