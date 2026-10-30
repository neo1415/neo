// Openers for the ORG-ADMIN pages: each names the one thing on the page that needs this person, from live state,
// with one action that also works by asking Q. Subjects match the proactive cards so the two never repeat.
import { registerOpener } from '../core/openers';
import { personOf } from '../../mock/world';
import { oa } from '../../state/areas/org-admin';
import { BASE, billingOf, budgetShare, contactable, isAdmin, level, placementsFor, qualityChecks, roleReport, type Sec } from '../../journeys/org-admin/model';

const at = (sec: Sec | '') => (p: string) => p === (sec ? `${BASE}/${sec}` : BASE);
const sayA = (label: string, text: string) => ({ label, primary: true, act: { t: 'say' as const, text } });

registerOpener({ id: 'oa.hub', side: 'recruiter', match: at(''), build: (w, a) => {
  const b = billingOf(w, a.orgId); const out = [];
  if (b && budgetShare(b) >= b.budget.warnAt && !b.budget.decision) out.push({ subject: `oa.budget.${a.orgId}`, text: `The agent budget is at ${Math.round(budgetShare(b) * 100)}%.`, action: sayA('What’s our usage?', 'how much budget have we used') });
  const del = oa(w).retention.find((r) => r.orgId === a.orgId)?.deletions.find((d) => d.state === 'OPEN');
  if (del && level(w, a, 'retention') === 'EDIT') out.push({ subject: del.id, text: `${personOf(w, del.personId)?.name.split(' ')[0]} asked you to delete their records.`, action: sayA('Delete their records', `delete ${personOf(w, del.personId)?.name.split(' ')[0].toLowerCase()}'s records`) });
  return out;
} });
registerOpener({ id: 'oa.instructions', side: 'recruiter', match: at('instructions'), build: (w, a) => {
  const n = oa(w).instructions.filter((i) => i.actorId === a.id).length;
  return [{ subject: 'oa.instr', text: n ? `You have ${n} instruction${n === 1 ? '' : 's'}. Tell me a new one in a sentence.` : 'Tell me how you like Q to work, in a sentence.', action: sayA('Keep follow-ups short', 'from now on keep my follow-ups to three lines') }];
} });
registerOpener({ id: 'oa.templates', side: 'recruiter', match: at('templates'), build: (w, a) => {
  const t = oa(w).templates.find((x) => x.orgId === a.orgId && x.state === 'PROPOSED'); if (!t) return [];
  return [{ subject: t.id, text: `“${t.title}” is waiting${isAdmin(a) ? ' for your approval' : ''}. One line is flagged.`, action: sayA('Remove the flagged line', 'remove the flagged line from the template') }];
} });
registerOpener({ id: 'oa.channels', side: 'recruiter', match: at('channels'), build: (w, a) => {
  const wa = oa(w).channels.find((c) => c.orgId === a.orgId && c.kind === 'WHATSAPP');
  if (wa && wa.state !== 'VERIFIED' && isAdmin(a)) return [{ subject: 'oa.wa.verify', text: 'WhatsApp isn’t verified yet, so no one can be messaged there.', action: sayA('Verify WhatsApp', 'verify whatsapp') }];
  const pid = contactable(w, a.orgId).find((p) => oa(w).choices[p]?.whatsapp === 'YES');
  return pid ? [{ subject: 'oa.wa.send', text: `${personOf(w, pid)?.name.split(' ')[0]} agreed to WhatsApp.`, action: sayA(`Message ${personOf(w, pid)?.name.split(' ')[0]} on WhatsApp`, `send ${personOf(w, pid)?.name.split(' ')[0].toLowerCase()} a whatsapp`) }] : [];
} });
registerOpener({ id: 'oa.billing', side: 'recruiter', match: at('billing'), build: (w, a) => {
  const b = billingOf(w, a.orgId); if (!b) return [];
  const r = b.requests.find((x) => x.state === 'OPEN');
  if (r && isAdmin(a)) return [{ subject: r.id, text: `${w.actors.find((x) => x.id === r.by)?.first} asked for about $${r.amount.toFixed(2)} more.`, action: sayA('Approve the request', 'approve the budget request') }];
  return [{ subject: `oa.budget.${a.orgId}`, text: `Agent budget: ${Math.round(budgetShare(b) * 100)}% used (simulated).`, action: sayA('Explain the usage', 'how much budget have we used') }];
} });
registerOpener({ id: 'oa.retention', side: 'recruiter', match: at('retention'), build: (w, a) => {
  const d = oa(w).retention.find((r) => r.orgId === a.orgId)?.deletions.find((x) => x.state === 'OPEN');
  return d ? [{ subject: d.id, text: `${personOf(w, d.personId)?.name.split(' ')[0]} asked for deletion.`, action: sayA('Delete their records', `delete ${personOf(w, d.personId)?.name.split(' ')[0].toLowerCase()}'s records`) }] : [{ subject: 'oa.ret', text: 'Ask how long anything is kept.', action: sayA('How long do we keep transcripts?', 'how long do we keep transcripts') }];
} });
registerOpener({ id: 'oa.sources', side: 'recruiter', match: at('sources'), build: (w, a) => {
  const s = oa(w).sources.find((x) => x.orgId === a.orgId && x.health === 'EXPIRING' && !x.renewalAsked);
  return s ? [{ subject: s.id, text: `The ${s.name.toLowerCase()} licence ends soon.`, action: sayA('Ask to renew it', 'renew the job board licence') }] : [];
} });
registerOpener({ id: 'oa.placements', side: 'recruiter', match: at('placements'), build: (w, a) => {
  const p = placementsFor(w, a.orgId).shown.find((x) => x.invoice.state === 'DRAFT'); if (!p) return [];
  return [{ subject: p.id, text: `${personOf(w, p.personId)?.name.split(' ')[0]}’s invoice stopped at step ${p.invoice.step} of 3.`, action: sayA('Resume the invoice', `resume the invoice for ${personOf(w, p.personId)?.name.split(' ')[0].toLowerCase()}`) }];
} });
registerOpener({ id: 'oa.compliance', side: 'recruiter', match: at('compliance'), build: (w, a) => {
  const i = oa(w).incidents.find((x) => x.orgId === a.orgId && x.state === 'OPEN');
  return i ? [{ subject: i.id, text: `Open incident: ${i.title.toLowerCase()}.`, action: sayA('Show open incidents', 'any open incidents?') }] : [];
} });
registerOpener({ id: 'oa.reports', side: 'recruiter', match: at('reports'), build: (w, a) => {
  const r = roleReport(w, a).find((x) => x.days === null);
  return r ? [{ subject: 'oa.rp', text: `${r.title} has no shortlist yet.`, action: sayA('Time to shortlist', 'time to shortlist for each role') }] : [];
} });
registerOpener({ id: 'oa.models', side: 'recruiter', match: at('models'), build: () => [{ subject: 'oa.md', text: 'Ask which model a task uses, or try a simulated timeout.', action: sayA('Which model drafts messages?', 'which model drafts messages') }] });
registerOpener({ id: 'oa.quality', side: 'recruiter', match: at('quality'), build: (w, a) => {
  const n = qualityChecks(w, a.orgId).filter((c) => c.status === 'NOT_RUN' || c.status === 'TOO_FEW').length;
  return [{ subject: 'oa.ql', text: `${n} checks can’t say anything yet. Ask me why.`, action: sayA('What bias checks run?', 'what bias checks run') }];
} });
registerOpener({ id: 'oa.learning', side: 'recruiter', match: at('learning'), build: (w, a) => {
  const l = oa(w).learnings.find((x) => x.orgId === a.orgId && x.state === 'PROPOSED'); if (!l) return [];
  return [{ subject: l.id, text: `To review: ${l.text.charAt(0).toLowerCase()}${l.text.slice(1)}`, action: sayA('What has Q learned?', 'what has q learned') }];
} });
registerOpener({ id: 'oa.mychannels', side: 'candidate', match: (p) => p === '/settings/channels', build: (w, a) => {
  const c = oa(w).choices[a.personId ?? '']; if (c?.whatsapp !== 'ASKED') return [];
  return [{ subject: 'oa.asked', text: 'An employer asked whether WhatsApp is okay. It’s your call.', action: sayA('Yes to WhatsApp', 'turn on whatsapp') }];
} });
