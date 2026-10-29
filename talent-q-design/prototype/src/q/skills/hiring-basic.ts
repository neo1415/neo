// Kora's original hiring requests, moved from the old Q home into the global conversation so they work
// from any page: opening the comparison, memory, calendar or outreach.
import { registerSkill } from '../core/engine';

const kora = (c: { actor: { orgId?: string } }) => c.actor.orgId === 'org_kora';

const JUMPS: { re: RegExp; to: string; label: string; text: string; used?: string[] }[] = [
  { re: /\b(compar\w*|shortlist|who should i)\b/, to: '/r/compare', label: 'the comparison', text: 'Here’s the comparison. Each mark shows what kind of evidence backs it.' },
  { re: /\b(schedul\w*|book|calendar)\b/, to: '/r/calendar', label: 'the calendar', text: 'Opening the calendar. I’m using your meeting hours from 20 October.', used: ['Your meeting hours (20 Oct)'] },
  { re: /\b(outreach|reach out)\b/, to: '/r/outreach', label: 'outreach approvals', text: 'Here are the outreach drafts waiting for your approval. Nothing is sent until you approve it.' },
];
registerSkill({
  id: 'hiring.jump', side: 'recruiter',
  match: (c) => (kora(c) && JUMPS.some((j) => j.re.test(c.norm)) ? 0.5 : 0),
  handle: (c) => {
    const j = JUMPS.find((x) => x.re.test(c.norm))!;
    return { msgs: [{ kind: 'reply', text: j.text, used: j.used }], nav: { to: j.to, label: j.label } };
  },
});
