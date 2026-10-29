// R3 proactive rules, all read from real state: drafts nobody approved (never sent on their own), candidates
// who haven't replied, candidates waiting on Kora, a colleague changing an interview panel, a candidate asking
// to move an interview, and messages queued while offline. Q suggests; it never acts on its own.
import { registerRule } from '../core/proactive';
import { simNow, type World } from '../../mock/world';
import type { Actor } from '../../state/domain';
import { hc } from '../../state/areas/hire-c';
import { CAN_SEND, firstOf, IS_ADMIN, KIND_LABEL, LAGOS, listNames, tDay, tTime } from '../../journeys/hire-c/lib';
import { canRead, isSuppressed, mail } from '../../state/areas/mail';
import { FOLLOW_CAP, followUpsUsed, replyMailboxFor } from '../../journeys/hire-c/email';

const days = (w: World, at: string) => Math.floor((simNow(w).getTime() - new Date(at).getTime()) / 864e5);
const ago = (n: number) => (n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`);
const canAct = (a: Actor) => a.side === 'recruiter' && !!a.orgId && CAN_SEND.includes(a.role ?? 'VIEWER');

registerRule({
  id: 'hire-c.unapproved', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => {
    if (!canAct(a)) return [];
    const out = [];
    for (const t of w.threads.filter((x) => x.orgId === a.orgId)) for (const m of t.messages) {
      if (m.status !== 'DRAFT' && m.status !== 'AWAITING_APPROVAL') continue;
      const mine = m.from === a.id; const n = days(w, m.at);
      if (mine ? n < 1 : !(IS_ADMIN.includes(a.role ?? 'VIEWER') || m.status === 'AWAITING_APPROVAL')) continue;
      const d = hc(w).drafts[m.id]; const kind = d ? KIND_LABEL[d.kind] : 'message';
      out.push({ subject: m.id,
        text: `${mine ? 'Your' : `${firstOf(w, m.from)}’s`} ${kind} to ${firstOf(w, t.personId)} has been ${m.status === 'AWAITING_APPROVAL' ? 'waiting for approval' : 'a draft'} since ${tDay(m.at, LAGOS)}. It hasn’t been approved, so it hasn’t been sent.`,
        why: `Kora approves each send, so drafts never go out on their own. This one was written ${ago(n)}${t.messages.some((x) => x.from === t.personId) ? ` and ${firstOf(w, t.personId)} is waiting on Kora` : ''}.`,
        actions: [{ label: 'Check it and send', primary: true, act: { t: 'say' as const, text: `check and send the ${kind} to ${firstOf(w, t.personId)}` } }, { label: 'Open it', act: { t: 'do' as const, op: 'hire-c.openMsg', args: { msgId: m.id } } }] });
    }
    return out;
  },
});

registerRule({
  id: 'hire-c.noreply', side: 'recruiter', priority: 'normal',
  evaluate: (w, a) => {
    if (!canAct(a)) return [];
    const out = [];
    const people = [...new Set(w.threads.filter((t) => t.orgId === a.orgId).map((t) => t.personId))];
    for (const pid of people) {
      const ms = w.threads.filter((t) => t.orgId === a.orgId && t.personId === pid).flatMap((t) => t.messages).filter((m) => m.status === 'SENT_SIMULATED' || m.status === 'RECEIVED').sort((x, y) => x.at.localeCompare(y.at));
      const last = ms[ms.length - 1]; if (!last) continue;
      const open = w.threads.some((t) => t.orgId === a.orgId && t.personId === pid && t.messages.some((m) => m.status === 'DRAFT' || m.status === 'AWAITING_APPROVAL'));
      const n = days(w, last.at); const first = firstOf(w, pid);
      const soon = w.calendar.some((e) => e.personId === pid && e.orgId === a.orgId && e.status === 'INVITED' && new Date(e.start).getTime() - simNow(w).getTime() < 3 * 864e5);
      // Follow-up suggestion (E01-16): from thread state, capped per conversation, snoozable and dismissable, and
      // honest about what Q can't see (a send-only mailbox).
      const th = w.threads.find((t) => t.orgId === a.orgId && t.personId === pid && t.messages.includes(last))!;
      const snoozed = (mail(w).snoozed[th.id] ?? '') > new Date().toISOString();
      const dismissed = mail(w).followUps.some((f) => f.threadId === th.id && f.state === 'CANCELLED');
      const used = followUpsUsed(w, th.id);
      if (last.from !== pid && (n >= 2 || (n >= 1 && soon)) && (last.from === a.id || IS_ADMIN.includes(a.role ?? 'VIEWER')) && !open && !snoozed && !dismissed && used < FOLLOW_CAP && !isSuppressed(w, a.orgId!, pid) && last.delivery !== 'BOUNCED') {
        const ev = w.calendar.find((e) => e.personId === pid && e.orgId === a.orgId && e.status === 'INVITED');
        const mb = replyMailboxFor(w, a.orgId!, pid); const blind = mb && !canRead(mb);
        out.push({ subject: `out:${last.id}`, text: `${first} hasn’t replied to the message sent ${tDay(last.at, LAGOS)} (${ago(n)}).${ev ? ` The interview on ${tDay(ev.start, LAGOS)} at ${tTime(ev.start, LAGOS)} is still unconfirmed.` : ''}${blind ? ` I can only see replies in Talent Q: ${mb!.address} is send-only, so ${first} may have answered there.` : ''} Shall I draft a polite reminder?`,
          why: `From the message log: sent ${tDay(last.at, LAGOS)} by ${last.channel === 'SMS' ? 'text' : last.channel === 'EMAIL' ? `email${last.acceptedAt ? ' (accepted by the provider, which isn’t proof it was read)' : ''}` : 'Talent Q'}, no reply since${ev ? ', and the calendar invite is still “invited”, not “confirmed”' : ''}. Reminders used for this conversation: ${used} of ${FOLLOW_CAP}. Nothing is sent without your approval.`,
          actions: [{ label: 'Draft a follow-up', primary: true, act: { t: 'say' as const, text: `draft a follow up to ${first}` } }, { label: 'Snooze 2 days', act: { t: 'do' as const, op: 'email.snooze', args: { threadId: th.id } } }, { label: 'Don’t suggest again', act: { t: 'do' as const, op: 'email.followup.dismiss', args: { threadId: th.id } } }] });
      }
      if (last.from === pid && n >= 1 && !open && (IS_ADMIN.includes(a.role ?? 'VIEWER') || last.to === a.id)) {
        out.push({ subject: `in:${last.id}`, text: `${first} wrote to Kora ${ago(n)} and hasn’t had a reply: “${last.body.slice(0, 80)}${last.body.length > 80 ? '…' : ''}”`,
          why: `The newest message with ${first} is theirs, from ${tDay(last.at, LAGOS)}. Candidates see an honest “waiting for Kora” status.`,
          actions: [{ label: `Draft a reply to ${first}`, primary: true, act: { t: 'say' as const, text: `draft a reply to ${first}` } }, { label: 'Open it', act: { t: 'do' as const, op: 'hire-c.openMsg', args: { msgId: last.id } } }] });
      }
    }
    return out;
  },
});

registerRule({
  id: 'hire-c.panel', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => {
    if (a.side !== 'recruiter' || !a.orgId) return [];
    return hc(w).panelChanges.filter((pc) => pc.by !== a.id && (IS_ADMIN.includes(a.role ?? 'VIEWER') || pc.from.includes(a.id) || pc.to.includes(a.id)) && w.interviews.find((i) => i.id === pc.interviewId)?.orgId === a.orgId).map((pc) => ({
      subject: pc.id,
      text: `${firstOf(w, pc.by)} changed ${firstOf(w, pc.personId)}’s interview panel on ${tDay(pc.at, LAGOS)}: ${listNames(pc.from.map((x) => firstOf(w, x)))} → ${listNames(pc.to.map((x) => firstOf(w, x)))}. ${pc.holds}`,
      why: `Recorded when ${firstOf(w, pc.by)} made the change. ${pc.ok ? 'I re-checked the booked time against the new panel’s calendars.' : 'The new panel isn’t free at the booked time.'} ${firstOf(w, pc.personId)} hasn’t been told.`,
      actions: pc.ok ? [{ label: 'Show the interview', primary: true, act: { t: 'nav' as const, to: '/r/calendar' } }] : [{ label: `Find a new time for ${firstOf(w, pc.personId)}`, primary: true, act: { t: 'say' as const, text: `find a new time for ${firstOf(w, pc.personId)}` } }, { label: 'Show the interview', act: { t: 'nav' as const, to: '/r/calendar' } }],
    }));
  },
});

registerRule({
  id: 'hire-c.reschedule', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => {
    if (!canAct(a)) return [];
    return hc(w).reschedules.filter((r) => !r.handled && w.calendar.find((e) => e.id === r.eventId)?.orgId === a.orgId).map((r) => {
      const ev = w.calendar.find((e) => e.id === r.eventId)!;
      return { subject: r.eventId + r.at, text: `${firstOf(w, r.personId)} asked to move the interview on ${tDay(ev.start, LAGOS)} at ${tTime(ev.start, LAGOS)}: “${r.text}”.`,
        why: `${firstOf(w, r.personId)} sent this from their messages ${ago(days(w, r.at))}. The current time stays held until you offer a new one.`,
        actions: [{ label: 'Find a new time', primary: true, act: { t: 'say' as const, text: `find a new time for ${firstOf(w, r.personId)}` } }, { label: 'Open the message', act: { t: 'nav' as const, to: '/r/messages' } }] };
    });
  },
});

registerRule({
  id: 'hire-c.queued', side: 'both', priority: 'high',
  evaluate: (w, a) => {
    if (w.network !== 'offline') return [];
    const q = w.threads.flatMap((t) => t.messages).filter((m) => m.status === 'QUEUED_OFFLINE' && (m.approvedBy === a.id || m.from === a.id || m.from === a.personId));
    return q.length ? [{ subject: 'queued', text: `${q.length} message${q.length === 1 ? ' is' : 's are'} queued while you’re offline. Nothing has been sent; ${q.length === 1 ? 'it goes' : 'they go'} when you reconnect.`, why: 'The connection is off (simulated), so sends wait in the outbox.', actions: [] }] : [];
  },
});

// A reply arrived by email with a changed subject: one notice per reply until a person confirms the match (E01-12).
registerRule({
  id: 'email.match', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => {
    if (!canAct(a)) return [];
    return w.threads.filter((t) => t.orgId === a.orgId).flatMap((t) => t.messages.filter((m) => m.inbound?.subjectChanged && m.inbound.matchedBy !== 'USER_CONFIRMED' && canRead(mail(w).mailboxes.find((x) => x.id === m.inbound?.mailbox))).map((m) => ({
      subject: `match:${m.id}`, text: `${firstOf(w, t.personId)} replied by email with a different subject (“${m.subject}”). Is it about the same conversation?`,
      why: 'I matched it by the email thread and sender, but the subject changed, so I won’t attach it or act on it until you confirm.',
      actions: [{ label: 'Yes, it’s this thread', primary: true, act: { t: 'do' as const, op: 'email.match', args: { msgId: m.id, ok: true } } }, { label: 'Keep it separate', act: { t: 'do' as const, op: 'email.match', args: { msgId: m.id, ok: false } } }],
    })));
  },
});

// A mailbox the person sends from has expired: say so once, with the reconnect (E01-23).
registerRule({
  id: 'email.expired', side: 'recruiter', priority: 'high',
  evaluate: (w, a) => mail(w).mailboxes.filter((m) => m.state === 'EXPIRED' && m.sendAs.includes(a.id)).map((m) => {
    const waiting = w.threads.flatMap((t) => t.messages).filter((x) => x.senderId === m.id && x.delivery === 'FAILED').length;
    return { subject: `expired:${m.id}`, text: `${m.address} needs you to sign in again; nothing sends from it until then.${waiting ? ` ${waiting} approved email${waiting === 1 ? ' is' : 's are'} waiting, unchanged.` : ''}`,
      why: `${m.provider === 'GOOGLE' ? 'Google' : 'Microsoft'} reported the sign-in as expired (simulated). Drafts, approvals and idempotency keys are kept.`,
      actions: [{ label: 'Reconnect', primary: true, act: { t: 'do' as const, op: 'email.reconnect', args: { mailboxId: m.id } } }] };
  }),
});
