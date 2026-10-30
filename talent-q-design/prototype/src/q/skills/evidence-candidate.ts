// Candidate Q skills and ops for evidence-first hiring (build pack 30 Oct; J12 steps 6, 7, 10, 12, 13 and P6).
// Q explains requests respectfully, records a decline as declined (never failed), answers interest checks, explains
// proof classes in the recruiter's words, never calls a CV untrue, helps the CV read better without adding any claim,
// and stops sharing the debugging sample on request. The work itself goes through the shared ops (ev.*) and the
// Passport's own revoke (tb.revoke); nothing here is a second implementation of them.
import { registerOp, registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import type { QAction } from '../../state/domain';
import { emit, now } from '../../mock/world';
import { proof } from '../../state/areas/proof';
import { answerInterest, declineSample } from '../../journeys/evidence/ops';
import { reqLabel } from '../../journeys/hire-b/model';
import {
  BOUNDED_SAMPLE, PROOF_MEANS, PROOF_WORD, canDraftCv, commitmentFor, evc, fullName, interestFor, makeDraft, openRequests, orgNm, requestsFor, roleTitle, weekdayDate, whyAsked,
} from '../../journeys/evidence/candidate/logic';
import { orgIn } from './talent-b';
import type { ProofClass } from '../../state/domain';

const cand = (c: QCtx) => c.actor.side === 'candidate' && !!c.actor.personId;
const pidOf = (c: QCtx) => c.actor.personId!;
const reply = (text: string, extra: Partial<QReply['msgs'][number]> = {}): QReply['msgs'][number] => ({ kind: 'reply', text, ...extra });
const scope = (orgId: string, pid: string) => `SHARED:${orgId}:${pid}`;

// =====================================================================================================
// Ops (buttons and Q chips call these)
// =====================================================================================================
registerOp('evc.sample.decline', (w, a, actor) => {
  const id = String(a.id); const why = String(a.why ?? '').trim();
  const d = proof(w).reuse.find((x) => x.id === id); if (!d || d.personId !== actor.personId) return;
  declineSample(w, actor, id, why);
  if (why) evc(w).declined[id] = why;
  return { say: `Done. ${orgNm(w, d.orgId)} sees that you declined${why ? ', with your reason' : ''}. It’s recorded as declined, not as a failed result, and your application carries on with what you’ve already shared.` };
});
registerOp('evc.sample.offer', (w, a, actor) => {
  const d = proof(w).reuse.find((x) => x.id === String(a.id)); if (!d || d.personId !== actor.personId || d.state !== 'SENT') return;
  const ids = ((a.ids as string[] | undefined) ?? []).filter((id) => w.evidence.some((e) => e.evidenceId === id && e.ownerId === actor.personId && !e.confidential && e.kind !== 'PRACTICE'));
  const note = String(a.note ?? '').trim();
  // Offering an item shares it with this employer only (the person chose it, for this request). Never anyone else.
  for (const e of w.evidence.filter((x) => ids.includes(x.evidenceId))) {
    e.revokedFrom = (e.revokedFrom ?? []).filter((o) => o !== d.orgId);
    if (e.visibility !== 'PUBLIC_PROFILE') { e.visibility = 'SHARED_WITH'; if (!e.sharedWith.includes(d.orgId)) e.sharedWith.push(d.orgId); }
  }
  const s = evc(w); s.offers = s.offers.filter((o) => o.decisionId !== d.id).concat({ decisionId: d.id, evidenceIds: ids, note, at: now() });
  emit(w, actor.id, 'evidence.sample.offered_existing', scope(d.orgId, d.personId), `${actor.first} offered existing work instead of the ${reqLabel(w, d.reqId)} sample${ids.length ? ` (${ids.length} item${ids.length === 1 ? '' : 's'})` : ''}${note ? `: ${note}` : ''}.`, { decisionId: d.id, evidenceIds: ids });
  return { say: `Sent to ${orgNm(w, d.orgId)} as your alternative. They decide whether it covers ${reqLabel(w, d.reqId).toLowerCase()}; until then the request stays open, and you can still do the sample.` };
});
registerOp('evc.sample.answer', (w, a, actor) => {
  const d = proof(w).reuse.find((x) => x.id === String(a.id)); if (!d || d.personId !== actor.personId) return;
  evc(w).answers[d.id] = String(a.text ?? '');
  return { say: 'Saved. Pick it up whenever you like. Nothing is sent until you press “Submit for review”.' };
});

registerOp('evc.cv.draft', (w, _a, actor) => {
  const pid = actor.personId!; const d = makeDraft(w, pid, now()); if (!d) return;
  evc(w).drafts[pid] = d;
  emit(w, actor.id, 'cv.draft.created', `PERSON:${pid}`, `Q drafted clearer CV wording (${d.lines.length} lines). Nothing added; waiting for ${actor.first}’s approval.`);
  return { say: 'Here’s a clearer draft below your CV. Same facts, plainer wording. Nothing changes until you approve it.' };
});
registerOp('evc.cv.link', (w, a, actor) => {
  const d = evc(w).drafts[actor.personId!]; if (!d || d.state !== 'DRAFT') return;
  const id = String(a.id); const e = w.evidence.find((x) => x.evidenceId === id && x.ownerId === actor.personId); if (!e) return;
  d.links = d.links.includes(id) ? d.links.filter((x) => x !== id) : [...d.links, id];
});
registerOp('evc.cv.approve', (w, _a, actor) => {
  const d = evc(w).drafts[actor.personId!]; if (!d || d.state !== 'DRAFT') return;
  if (d.added.length) return { say: `I can’t approve this draft: it contains words that aren’t in your CV or Passport (${d.added.join(', ')}). I’ll take them out first.` };
  d.state = 'APPROVED'; d.approvedAt = now();
  emit(w, actor.id, 'cv.version.approved', `PERSON:${actor.personId}`, `${actor.first} approved a clearer CV version${d.links.length ? ` with ${d.links.length} linked evidence item${d.links.length === 1 ? '' : 's'}` : ''}. Not sent to anyone.`);
  return { say: 'Approved and saved as your CV. Employers who already have your old version keep it; I won’t send this one anywhere without asking you.' };
});
registerOp('evc.cv.discard', (w, _a, actor) => {
  delete evc(w).drafts[actor.personId!];
  return { say: 'Kept your original. The draft is gone; ask me any time for another.' };
});

registerOp('evc.prefs.set', (w, a, actor) => {
  const pid = actor.personId!; const ps = proof(w).prefs;
  const cur = ps[pid] ?? { personId: pid, updatedAt: now(), shareWith: [] };
  const next = { ...cur, updatedAt: now() } as typeof cur;
  // Blank stays blank: an empty answer removes the field, never sets a default.
  if (a.payMin) { next.payMin = Number(a.payMin); next.currency = (a.currency as typeof cur.currency) ?? 'NGN'; } else { delete next.payMin; delete next.currency; }
  const modes = (a.workModes as NonNullable<typeof cur.workModes> | undefined) ?? []; if (modes.length) next.workModes = modes; else delete next.workModes;
  const locs = (a.locations as string[] | undefined) ?? []; if (locs.length) next.locations = locs; else delete next.locations;
  if (a.availableFrom) next.availableFrom = String(a.availableFrom); else delete next.availableFrom;
  ps[pid] = next;
  for (const org of next.shareWith) emit(w, actor.id, 'candidate.preferences.updated', scope(org, pid), `${actor.first} updated what they want from a role.`);
  emit(w, actor.id, 'candidate.preferences.updated', `PERSON:${pid}`, 'You updated what you want from a role.');
  return { say: `Saved. ${next.shareWith.length ? `${next.shareWith.map((o) => orgNm(w, o)).join(' and ')} see${next.shareWith.length === 1 ? 's' : ''} the change; nobody else does.` : 'Nobody sees these until you share them.'}` };
});
registerOp('evc.prefs.share', (w, a, actor) => {
  const pid = actor.personId!; const org = String(a.org); const on = a.on === true || a.on === 'true';
  const p = (proof(w).prefs[pid] ??= { personId: pid, updatedAt: now(), shareWith: [] });
  p.shareWith = on ? [...new Set([...p.shareWith, org])] : p.shareWith.filter((o) => o !== org);
  emit(w, actor.id, on ? 'candidate.preferences.shared' : 'candidate.preferences.unshared', scope(org, pid), on ? `${actor.first} shared what they want from a role.` : `${actor.first} stopped sharing their preferences.`);
  return { say: on ? `${orgNm(w, org)} can now see what you want from a role. Nobody else can.` : `${orgNm(w, org)} no longer sees what you want from a role.` };
});

// =====================================================================================================
// Skills
// =====================================================================================================

// ---------- P6 · "make my CV sound stronger" ----------
const CV = /\b(cv|resume|r[eé]sum[eé])\b/;
registerSkill({
  id: 'evc.cv', side: 'candidate',
  match: (c) => (cand(c) && CV.test(c.norm) && /(strong|better|improve|rewrite|re-write|polish|clearer|clean|stand out|sound|impress|fix|tidy|word)/.test(c.norm) && !/\b(lie|lying|untrue|fake)\b/.test(c.norm) ? 0.92 : 0),
  handle: (c) => {
    const pid = pidOf(c);
    if (!canDraftCv(c.w, pid)) return { msgs: [reply('I don’t have your CV in Talent Q yet. Upload it in your Passport and I’ll suggest clearer wording. I only reword and reorganise what’s there; I never add jobs, qualifications or skills.', { actions: [{ label: 'Upload a CV', primary: true, act: { t: 'do', op: 'tb.upload', args: { kind: 'CV' } } }] })] };
    const d = makeDraft(c.w, pid, now())!;
    return {
      msgs: [reply(`Here’s a clearer draft. I reorganised it and reworded ${d.lines.filter((l) => l.change !== 'SAME').length} lines, using only what’s already in your CV, profile and Passport. I didn’t add any job, qualification or skill, and I’ve listed what I won’t add. Nothing changes until you approve it.`, {
        kind: 'approval', ref: { type: 'evc.cv', id: pid }, used: ['Your CV', 'Your profile', 'Your Passport'],
        actions: [{ label: 'Review and approve', primary: true, act: { t: 'nav', to: '/c/passport?cv=draft' } }, { label: 'Keep my original', act: { t: 'do', op: 'evc.cv.discard' } }],
      })],
      effects: (w, a) => { evc(w).drafts[pid] = d; emit(w, a.id, 'cv.draft.created', `PERSON:${pid}`, `Q drafted clearer CV wording (${d.lines.length} lines). Nothing added; waiting for ${a.first}’s approval.`); },
      frame: null,
    };
  },
});
registerSkill({
  id: 'evc.cv.add', side: 'candidate',
  match: (c) => (cand(c) && CV.test(c.norm) && /\b(add|put|include|say|claim)\b/.test(c.norm) && /(skill|certif|qualif|degree|job|experience|kubernetes|aws|expert|senior|years)/.test(c.norm) ? 0.94 : 0),
  handle: () => ({ msgs: [reply('I won’t add something to your CV that isn’t already in your CV, your profile or your Passport. If you have it, tell me where it comes from: add the certificate or the work to your Passport, and I’ll word it clearly with its label (Claim, Self-reported, Assessed or Issuer-verified).', { kind: 'refusal', actions: [{ label: 'Add proof to my Passport', primary: true, act: { t: 'nav', to: '/c/passport' } }] })] }),
});
registerSkill({
  id: 'evc.cv.doubt', side: 'candidate',
  match: (c) => (cand(c) && (CV.test(c.norm) || /\bclaim/.test(c.norm)) && /\b(lie|lying|liar|untrue|fake|believe|trust|doubt|true)\b/.test(c.norm) ? 0.93 : 0),
  handle: () => ({ msgs: [reply('No. I never call a CV untrue, and neither does Talent Q. Every CV line is read as a claim, for everyone: it’s your own account, not a sign it’s wrong. What changes how much weight a line carries is a piece of work someone can look at, like one short reviewed sample.', {
    used: ['How Talent Q labels evidence'], actions: [{ label: 'What do the labels mean?', act: { t: 'say', text: 'what does self-reported mean' } }, { label: 'Make my CV clearer', act: { t: 'say', text: 'make my cv sound stronger' } }],
  })] }),
});

// ---------- Proof classes, in the recruiter's words ----------
const CLASS_RE: [RegExp, ProofClass][] = [[/issuer[- ]?verified/, 'ISSUER_VERIFIED'], [/self[- ]?reported/, 'SELF_REPORTED'], [/\bassessed\b/, 'ASSESSED'], [/\bdisputed\b/, 'DISPUTED'], [/\bclaim\b/, 'CLAIM']];
registerSkill({
  id: 'evc.meaning', side: 'candidate',
  match: (c) => (cand(c) && /(mean|what is|what are|explain|difference)/.test(c.norm) && CLASS_RE.some(([r]) => r.test(c.norm)) ? 0.88 : 0),
  handle: (c) => {
    const k = CLASS_RE.find(([r]) => r.test(c.norm))![1];
    return { msgs: [reply(`“${PROOF_WORD[k]}”: ${PROOF_MEANS[k]} Recruiters see exactly the same word for the same item.`, { actions: [{ label: 'See my items by label', act: { t: 'nav', to: '/c/passport' } }] })] };
  },
});

// ---------- J12 step 6 · the request, explained ----------
registerSkill({
  id: 'evc.request', side: 'candidate',
  match: (c) => (cand(c) && openRequests(c.w, pidOf(c)).length > 0 && /(sample|request|task|what does .* want|what do they want|kora want|why .* ask|how long)/.test(c.norm) && !/\b(decline|skip|refuse|not do)\b/.test(c.norm) ? 0.87 : 0),
  handle: (c) => {
    const d = openRequests(c.w, pidOf(c))[0]; const org = orgNm(c.w, d.orgId);
    return { msgs: [reply(`${org} would like one short piece of work: ${BOUNDED_SAMPLE[d.reqId]?.task.toLowerCase() ?? reqLabel(c.w, d.reqId)}, about ${d.effortMinutes ?? 40} minutes. ${whyAsked(c.w, d)} It’s your choice: do it, offer work you already have, or decline. Declining is recorded as declined, not as a fail.`, {
      used: [`${org}’s request`, 'Your CV'],
      actions: [
        { label: 'Do it now', primary: true, act: { t: 'nav', to: `/c/applications?sample=${d.id}` } },
        { label: 'Share existing work instead', act: { t: 'nav', to: '/c/applications' } },
        { label: 'Decline', act: { t: 'say', text: 'decline the sample' } },
      ] as QAction[],
    })] };
  },
});
registerSkill({
  id: 'evc.decline', side: 'candidate',
  match: (c) => (cand(c) && requestsFor(c.w, pidOf(c)).some((d) => d.state === 'SENT' || d.state === 'IN_PROGRESS') && /\b(decline|skip|refuse|say no|not do|not want to do|pass on)\b/.test(c.norm) && /(sample|task|test|assessment|request|it)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const d = openRequests(c.w, pidOf(c))[0]; const org = orgNm(c.w, d.orgId);
    const why = c.text.match(/\b(?:because|as|since)\b\s+(.+)$/i)?.[1]?.trim() ?? '';
    return {
      msgs: [reply(`Done. I told ${org} you declined the ${reqLabel(c.w, d.reqId).toLowerCase()} sample${why ? `, with your reason: “${why}”` : ''}. It’s recorded as declined, not as a failed result, and your application carries on with what you’ve already shared.`)],
      effects: (w, a) => { declineSample(w, a, d.id, why); if (why) evc(w).declined[d.id] = why; },
      frame: null,
    };
  },
});

// ---------- J12 step 10 · interest ----------
registerSkill({
  id: 'evc.interest', side: 'candidate',
  match: (c) => {
    if (!cand(c) || !/\binterest(ed)?\b/.test(c.norm)) return 0;
    const asks = interestFor(c.w, pidOf(c)); const org = orgIn(c.norm);
    return asks.some((i) => (org ? i.orgId === org : i.state === 'REQUESTED')) ? 0.9 : 0;
  },
  handle: (c) => {
    const asks = interestFor(c.w, pidOf(c)); const org = orgIn(c.norm);
    const i = asks.find((x) => (org ? x.orgId === org : x.state === 'REQUESTED')) ?? asks[0];
    const yes = !/\b(not|no|never|isn't|is not|nope)\b/.test(c.norm);
    const name = orgNm(c.w, i.orgId);
    return {
      msgs: [reply(yes ? `Told ${name} you’re interested in ${roleTitle(c.w, i.mandateId)}. They see your answer on its own, apart from how your evidence is reviewed.` : `Told ${name} it isn’t for you right now. Nothing else changes, and you can change your answer.`)],
      effects: (w, a) => answerInterest(w, a, i.orgId, yes),
    };
  },
});

// ---------- Commitments: when will I hear? ----------
registerSkill({
  id: 'evc.commit', side: 'candidate',
  match: (c) => (cand(c) && /(when will|hear back|hear from|update me|next update|get an update|been promised|promised)/.test(c.norm) && c.w.applications.some((a) => a.personId === pidOf(c) && proof(c.w).commitments.some((x) => x.applicationId === a.id)) ? 0.88 : 0),
  handle: (c) => {
    const org = orgIn(c.norm);
    const rows = c.w.applications.filter((a) => a.personId === pidOf(c)).map((a) => commitmentFor(c.w, a.id)).filter((x): x is NonNullable<typeof x> => !!x && (!org || x.orgId === org));
    if (!rows.length) return { msgs: [reply('That employer hasn’t committed to a date for their next update, so I can’t give you one. I won’t guess.')] };
    const lines = rows.map((x) => x.late ? `${orgNm(c.w, x.orgId)} said they’d update you by ${weekdayDate(x.nextUpdateDue)} (${x.milestone.toLowerCase()}). That date has passed and nothing has come. That’s late on their side, not a sign about you.` : `${orgNm(c.w, x.orgId)}: next update by ${weekdayDate(x.nextUpdateDue)}, from ${fullName(c.w, x.owner)}.`);
    const late = rows.find((x) => x.late);
    return { msgs: [reply(lines.join(' '), { used: ['Employers’ commitments to you'], actions: late ? [{ label: `Ask ${orgNm(c.w, late.orgId)} for an update`, primary: true, act: { t: 'say', text: `follow up with ${orgNm(c.w, late.orgId)}` } }] : [{ label: 'Your applications', act: { t: 'nav', to: '/c/applications' } }] })] };
  },
});

// ---------- J12 step 13 · stop sharing the debugging sample ----------
registerSkill({
  id: 'evc.revoke', side: 'candidate',
  match: (c) => (cand(c) && /\b(stop|revoke|end|unshare|no longer|take back|remove)\b/.test(c.norm) && /(debug|incident|lock|slow payout|payouts api)/.test(c.norm) && c.w.evidence.some((e) => e.evidenceId === 'e_tobi_incident' && e.ownerId === pidOf(c)) ? 0.95 : 0),
  handle: (c) => {
    const org = orgIn(c.norm) ?? 'org_kora'; const name = orgNm(c.w, org);
    const e = c.w.evidence.find((x) => x.evidenceId === 'e_tobi_incident')!;
    if (!e.sharedWith.includes(org) || e.revokedFrom?.includes(org)) return { msgs: [reply(`${name} can’t see “${e.title}” already. Nothing to stop.`, { actions: [{ label: `See what ${name} sees`, act: { t: 'nav', to: `/c/passport?as=${org}` } }] })] };
    return { msgs: [reply(`End ${name}’s access to “${e.title}”? Their view updates straight away and nothing cached keeps it. They’re told only that access to an item ended, not which or why. You can undo it.`, {
      kind: 'approval', ref: { type: 'tb.evidence', id: e.evidenceId },
      actions: [{ label: `End ${name}’s access`, primary: true, act: { t: 'do', op: 'tb.revoke', args: { ids: [e.evidenceId], org } } }, { label: `Preview ${name}’s view`, act: { t: 'nav', to: `/c/passport?as=${org}` } }, { label: 'Keep sharing', act: { t: 'say', text: 'keep it' } }],
    })] };
  },
});

