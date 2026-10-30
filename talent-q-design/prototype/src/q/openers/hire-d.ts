// Openers for the hire-d pages: each names the one thing on the page that needs the person, from live state.
import { simNow } from '../../mock/world';
import { registerOpener } from '../core/openers';
import { hd } from '../../state/areas/hire-d';
import { defaultPanel, entryFor, firstOf, LAGOS, tDay, tTime } from '../../journeys/hire-c/lib';
import { bookingSlots, CH_WORD, daysBetween, fmtDay, freshness, MILESTONE_WORD, newSince, nextMilestone, offerOf, reminderQueue, sourcesFor } from '../../journeys/hire-d/model';

registerOpener({ id: 'hd.explore', side: 'recruiter', match: (p) => p === '/r/explore', build: (w, a) => {
  if (!a.orgId) return [];
  const fresh = hd(w).saved.filter((s) => s.orgId === a.orgId).map((s) => ({ s, n: newSince(w, a.orgId!, s.id).fresh.length })).filter((x) => x.n > 0);
  return [...fresh.map((x) => ({ subject: `hd.saved.${x.s.id}`, text: `${x.n} new for “${x.s.label}” since you last looked.`, action: { label: 'Show them', primary: true, act: { t: 'say' as const, text: `explore ${x.s.query}` } } })),
    { subject: 'hd.explore', text: 'Tell me who you’re looking for, in plain words.', action: { label: 'Explore Postgres in Lagos', act: { t: 'say', text: 'explore postgres in lagos' } } }];
} });
registerOpener({ id: 'hd.scope', side: 'recruiter', match: (p) => p === '/r/sourcing/scope', build: (w, a) => {
  if (!a.orgId) return [];
  const bad = sourcesFor(w, a.orgId).map((s) => ({ s, f: freshness(w, a.orgId!, s) })).filter((x) => x.f.state === 'ERROR' || x.f.state === 'STALE');
  return [...bad.map((x) => ({ subject: `hd.src.${x.s.id}`, text: x.f.state === 'ERROR' ? `${x.s.label} didn’t refresh. Results keep the last good check.` : `${x.s.label}: ${x.f.label.toLowerCase()}. Worth refreshing.`, action: { label: 'Which sources do you search?', act: { t: 'say' as const, text: 'which sources do you search' } } })),
    { subject: 'hd.scope', text: 'Ask what each source is, or switch one off by name.', action: { label: 'Do you use LinkedIn?', act: { t: 'say', text: 'do you use linkedin' } } }];
} });
registerOpener({ id: 'hd.book', side: 'recruiter', match: (p) => p.startsWith('/r/calendar/book/'), build: (w, a, path) => {
  const pid = path.split('/').pop()!; const e = entryFor(w, pid, a.orgId); if (!e) return [];
  const b = [...hd(w).bookings].reverse().find((x) => x.personId === pid && x.orgId === a.orgId);
  if (b) return [{ subject: `hd.bk.${b.id}`, text: `The invitation to ${firstOf(w, pid)} waits for a check and your yes.`, action: { label: 'Check it', primary: true, act: { t: 'do', op: 'hire-c.check', args: { msgId: b.msgId } } } }];
  const s = bookingSlots(w, a, pid, defaultPanel(w, a, e.mandateId)).filter((x) => x.fits !== false);
  return s[0] ? [{ subject: `hd.book.${pid}`, text: `${s.length} mutual times for ${firstOf(w, pid)}; the first is ${tDay(s[0].start, LAGOS)} ${tTime(s[0].start, LAGOS)}.`, action: { label: 'Book it', primary: true, act: { t: 'say', text: `book an interview with ${firstOf(w, pid)}` } } }] : [];
} });
registerOpener({ id: 'hd.stage', side: 'recruiter', match: (p) => /^\/r\/pipeline\/[^/]+\/[^/]+$/.test(p), build: (w, _a, path) => {
  const [, , , mid, pid] = path.split('/'); const d = hd(w).due[`${mid}:${pid}`];
  return d ? [{ subject: `hd.due.${mid}.${pid}`, text: `Due ${fmtDay(d.date)}: ${d.what.charAt(0).toLowerCase()}${d.what.slice(1)}.`, action: { label: `Book ${firstOf(w, pid)}`, primary: true, act: { t: 'nav', to: `/r/calendar/book/${pid}` } } }]
    : [{ subject: `hd.stage.${pid}`, text: `No next step is set for ${firstOf(w, pid)}. Set a due date so nothing slips.` }];
} });
registerOpener({ id: 'hd.offer', side: 'recruiter', match: (p) => p.startsWith('/r/offer/'), build: (w, a, path) => {
  const [, , , mid, pid] = path.split('/'); const o = offerOf(w, mid, pid); const f = firstOf(w, pid);
  if (!o) return [{ subject: `hd.offer.${pid}`, text: `I can draft ${f}’s terms from the band and what ${f} shared. Your team decides.`, action: { label: 'Draft the terms', primary: true, act: { t: 'do', op: 'hd.offer.draft', args: { mandateId: mid, personId: pid } } } }];
  const waiting = o.approvals.filter((x) => !x.at || x.voided);
  if (o.state === 'AWAITING_APPROVAL' && waiting.some((x) => x.who === a.id)) return [{ subject: `hd.offer.${o.id}`, text: `The offer for ${f} needs your approval.`, action: { label: 'Approve the offer', primary: true, act: { t: 'say', text: 'approve the offer' } } }];
  if (o.state === 'AWAITING_APPROVAL') return [{ subject: `hd.offer.${o.id}`, text: `Waiting for ${waiting.map((x) => firstOf(w, x.who)).join(' and ')} to approve.` }];
  if (o.state === 'APPROVED') return [{ subject: `hd.offer.${o.id}`, text: `Approved. A person sends it to ${f}; record it here when they do.` }];
  return [];
} });
registerOpener({ id: 'hd.outcomes', side: 'recruiter', match: (p) => p === '/r/outcomes', build: (w, a) => hd(w).outcomes.filter((o) => o.orgId === a.orgId).map((o) => ({ o, n: nextMilestone(o) })).filter((x) => x.n?.due && daysBetween(simNow(w), x.n.due) <= 7)
  .map((x) => ({ subject: `hd.ho.${x.o.id}`, text: `${x.o.name.split(' ')[0]}’s ${MILESTONE_WORD[x.n!.kind].toLowerCase()} is due ${fmtDay(x.n!.due!)}.`, action: { label: 'Which check-ins are due?', act: { t: 'say' as const, text: 'which check-ins are due' } } })) });
registerOpener({ id: 'hd.reminders', side: 'recruiter', match: (p) => p === '/r/reminders', build: (w, a) => {
  if (!a.orgId) return [];
  return reminderQueue(w, a.orgId).filter((x) => !x.decision && !x.blocked).map((x) => ({ subject: `hd.rem.${x.id}`, text: `${x.title} by ${x.channel ? CH_WORD[x.channel] : '—'}: ready for your yes.`, action: { label: 'Approve it', primary: true, act: { t: 'do' as const, op: 'hd.rem.approve', args: { id: x.id } } } }));
} });
registerOpener({ id: 'hd.c.reminders', side: 'candidate', match: (p) => p === '/c/reminders', build: (w, a) => a.personId ? [{ subject: 'hd.c.rem', text: hd(w).optOut[a.personId] ? 'Reminders are off. Employers can still answer you.' : 'You choose how employers remind you, or turn it off.' }] : [] });
