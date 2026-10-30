// Recruiter operations for evidence-first hiring (J12 steps 4, 5, 8, 9). Buttons and Q both call these, so a click
// and a typed request do exactly the same thing. Decisions go through journeys/evidence/ops.ts (ev.*); anything that
// reaches a candidate goes through hire-c's correspondence (draft → checks → explicit approval → simulated send),
// and only the send itself marks a request as sent (onMessageSent). Nothing here sends on its own.
import { actorOf, emit, personOf, type World } from '../../../mock/world';
import type { Actor, QMsg, Stage } from '../../../state/domain';
import { STAGE_LABEL } from '../../../state/domain';
import { appendQ, pushUndo, registerOp } from '../../../q/core/engine';
import { proof } from '../../../state/areas/proof';
import { hc, hcw } from '../../../state/areas/hire-c';
import { createDraft, findMsg, firstMessage, guide, latestV, onMessageSent, OPEN_DRAFT, payBand, setStage, CAN_MOVE } from '../../hire-c/lib';
import { postDraft } from '../../../q/skills/hire-c';
import { markReuseSent, proposeReuse, requestInterest, reviewSample } from '../ops';
import { BOUNDED_SAMPLE } from '../model';
import { cellFor, firstName, KORA_ROLE, reqLabel, shortLabel } from '../../hire-b/model';
import { proofItems } from './model';
import { setCmp } from '../../hire-b/ops';

const post = (w: World, a: Actor, m: Omit<QMsg, 'id' | 'at' | 'who'>) => appendQ(w, a.id, { who: 'q', engine: 'rules', ...m });
export const sampleMsgId = (decisionId: string) => `msg_evs_${decisionId}`;
export const interestMsgId = (pid: string) => `msg_evi_${pid}`;
const sign = (w: World, a: Actor) => `Kind regards,\n${a.name}\n${a.title}, ${w.orgs.find((o) => o.id === a.orgId)?.name ?? ''}`;
const bandLine = (w: World, a: Actor, pid: string) => { const band = guide(w, a.orgId, 'PAY_BAND') && firstMessage(w, a.orgId!, pid) ? payBand(w, KORA_ROLE) : undefined; return band ? `The pay band for this role is ${band}.` : ''; };

/** Replace the composed first version with Q's own wording (still version 1, still unchecked and unapproved). */
function setFirstVersion(w: World, msgId: string, subject: string, body: string, note: string) {
  const d = hcw(w).drafts[msgId]; const f0 = findMsg(w, msgId); if (!d || !f0) return;
  const v = d.versions[0]; v.subject = subject; v.body = body; v.note = note; v.manual = true;
  f0.m.subject = subject; f0.m.body = body;
}

// ---------- Step 5: one bounded sample instead of the full assessment ----------
export function draftSampleRequest(w: World, a: Actor, pid: string, reqId: string) {
  const p = personOf(w, pid); if (!p || !a.orgId) return;
  const task = BOUNDED_SAMPLE[reqId];
  const cvSays = proof(w).cvs[pid]?.mentions[reqId] === 'YES';
  const d = proposeReuse(w, a, pid, reqId, 'BOUNDED_SAMPLE', `${cvSays ? 'The CV describes this work, but nothing shared shows it yet' : 'Nothing shared shows this yet'}. One bounded sample instead of the full take-home.`);
  const fn = firstName(w, pid);
  if (d.decision !== 'BOUNDED_SAMPLE') { post(w, a, { kind: 'reply', text: `There’s already a ${d.decision === 'ACCEPT_PRIOR' ? 'decision to accept existing evidence' : 'verification request'} for ${fn}’s ${reqLabel(w, reqId)}, so I haven’t asked for a sample too.` }); return; }
  const msgId = sampleMsgId(d.id);
  const existing = findMsg(w, msgId);
  if (existing && !OPEN_DRAFT.includes(existing.m.status)) { post(w, a, { kind: 'reply', text: d.state === 'PROPOSED' ? `The request to ${fn} isn’t waiting any more (${existing.m.status.toLowerCase().replace('_', ' ')}).` : `The ${shortLabel(w, reqId)} sample request to ${fn} already went (simulated). It’s ${d.state === 'SENT' ? 'waiting for them' : d.state.toLowerCase().replace('_', ' ')}.` }); return; }
  if (!existing) {
    createDraft(w, a, { id: msgId, personId: pid, kind: 'EVIDENCE_REQUEST', channel: 'IN_APP', mandateId: KORA_ROLE, reason: task?.task });
    const first = p.name.split(' ')[0];
    const body = [
      `Hi ${first},`,
      `Thank you for applying for the Senior Backend Engineer role at ${w.orgs.find((o) => o.id === a.orgId)?.name}. ${cvSays ? `Your CV describes ${reqLabel(w, reqId).toLowerCase()} work, and we’d like to see one piece of it.` : `We’d like to see one piece of ${reqLabel(w, reqId).toLowerCase()} work.`}`,
      `Instead of our full take-home, could you do one short task? ${task?.task ?? 'One short piece of work'} (about ${d.effortMinutes} minutes). It uses synthetic data, and an engineer at Kora reviews it.`,
      'If you’d rather, share existing work that shows the same thing, or say no. Saying no is recorded as declined, not as a failed result.',
      bandLine(w, a, pid),
      sign(w, a),
    ].filter(Boolean).join('\n\n');
    setFirstVersion(w, msgId, `One short ${shortLabel(w, reqId)} sample for the Senior Backend role`, body, `First draft (one ${d.effortMinutes}-minute sample instead of the full assessment)`);
  }
  postDraft(w, a, msgId, `Recorded: one ${d.effortMinutes}-minute ${shortLabel(w, reqId)} sample for ${fn}, instead of the full assessment. I drafted the request for Talent Q messages; nothing is sent until you approve it.`);
}
registerOp('evr.sample.draft', (w, args, a) => draftSampleRequest(w, a, String(args.personId), String(args.reqId)));

// ---------- Step 5: accept existing evidence (no retest), or ask for it to be verified ----------
export function acceptPrior(w: World, a: Actor, pid: string, reqId: string) {
  const fn = firstName(w, pid);
  const live = proofItems(w, pid, reqId).filter((i) => !i.excluded && (i.cls === 'ASSESSED' || i.cls === 'ISSUER_VERIFIED'));
  if (!live.length) { post(w, a, { kind: 'refusal', text: `Nothing ${fn} shared for ${reqLabel(w, reqId)} has been reviewed or checked, so there’s nothing to accept yet. I can ask for one short sample, or for the existing item to be verified.`, actions: [{ label: `Ask for one short sample`, primary: true, act: { t: 'do', op: 'evr.sample.draft', args: { personId: pid, reqId } } }] }); return; }
  const d = proposeReuse(w, a, pid, reqId, 'ACCEPT_PRIOR', `Reviewed evidence already shows it (${live.length} item${live.length === 1 ? '' : 's'} they shared). No retest.`, live.map((i) => i.e.evidenceId));
  if (d.decision !== 'ACCEPT_PRIOR') { post(w, a, { kind: 'reply', text: `There’s already an open ${d.decision === 'BOUNDED_SAMPLE' ? 'sample request' : 'verification request'} for ${fn}’s ${reqLabel(w, reqId)}. I left it as it is.` }); return; }
  pushUndo(w, a.id, `Accepted ${fn}’s ${shortLabel(w, reqId)} evidence`, 'evr.reuse.undo', { id: d.id });
  post(w, a, { kind: 'undo', text: `Accepted ${fn}’s existing ${shortLabel(w, reqId)} evidence: no retest. Recorded with your name and the items it rests on (${live.length}). ${fn} won’t be asked to prove this again for this role. Demonstrated in a sample isn’t a guarantee in the job, so the interview can still go deeper.`,
    used: [`${live.length} reviewed item${live.length === 1 ? '' : 's'} ${fn} shared`], actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }] });
}
registerOp('evr.accept', (w, args, a) => acceptPrior(w, a, String(args.personId), String(args.reqId)));
registerOp('evr.reuse.undo', (w, args, a) => { const s = proof(w); const d = s.reuse.find((x) => x.id === args.id); if (!d) return; s.reuse = s.reuse.filter((x) => x.id !== d.id); emit(w, a.id, 'evidence.reuse.undone', `SHARED:${d.orgId}:${d.personId}`, `${a.first} undid the ${d.decision === 'ACCEPT_PRIOR' ? 'accepted evidence' : 'decision'} for ${reqLabel(w, d.reqId)} (${firstName(w, d.personId)}).`, { personId: d.personId, reqId: d.reqId }); });

export function askVerification(w: World, a: Actor, pid: string, reqId: string) {
  const fn = firstName(w, pid);
  const items = proofItems(w, pid, reqId).filter((i) => !i.excluded && i.cls === 'SELF_REPORTED');
  if (!items.length) { post(w, a, { kind: 'reply', text: `${fn} hasn’t shared anything for ${reqLabel(w, reqId)} that a check could confirm.` }); return; }
  const d = proposeReuse(w, a, pid, reqId, 'REQUEST_VERIFICATION', `Confirm ${items.length === 1 ? 'one self-reported item' : `${items.length} self-reported items`} with the issuer or source.`, items.map((i) => i.e.evidenceId));
  post(w, a, { kind: 'reply', text: d.decision === 'REQUEST_VERIFICATION' ? `Recorded a request to verify ${items.length === 1 ? 'the self-reported item' : `${items.length} self-reported items`} for ${reqLabel(w, reqId)} at the source (simulated: no issuer is contacted in this prototype). Until it’s confirmed it stays “Self-reported”, which is unknown, not weak. Nothing was sent to ${fn}.` : `There’s already an open decision for ${fn}’s ${reqLabel(w, reqId)}; I left it as it is.` });
}
registerOp('evr.verify', (w, args, a) => askVerification(w, a, String(args.personId), String(args.reqId)));

// ---------- Step 8: a person reviews the sample ----------
export const OUTCOME_WORD = { SHOWS_IT: 'Shows it', PARTLY: 'Shows part of it', NOT_SHOWN: 'Didn’t show it' } as const;
export function recordReview(w: World, a: Actor, id: string, outcome: keyof typeof OUTCOME_WORD, note: string, share = false) {
  const d = proof(w).reuse.find((x) => x.id === id);
  if (!d || d.state !== 'SUBMITTED') { post(w, a, { kind: 'reply', text: 'That sample isn’t waiting for a review any more.' }); return; }
  if (!note) { post(w, a, { kind: 'reply', text: 'Add a short note on what the sample showed before recording the review. The note goes on the record with your name.' }); return; }
  reviewSample(w, a, id, outcome, note, share);
  const fn = firstName(w, d.personId);
  const lvl = cellFor(w, d.personId, d.reqId).level;
  post(w, a, { kind: 'notice', text: `Recorded: ${OUTCOME_WORD[outcome].toLowerCase()}. ${outcome === 'NOT_SHOWN' ? `The sample doesn’t count towards ${reqLabel(w, d.reqId)}, and that’s about this sample, not a verdict on ${fn}.` : `${fn}’s sample is now Assessed${outcome === 'PARTLY' ? ' (partial)' : ''}, reviewed by you, and the comparison reads ${reqLabel(w, d.reqId)} as “${lvl === 'verified' ? 'verified' : lvl === 'partial' ? 'partial' : lvl}”.`} Your note is on the record${share ? ` and shared with ${fn}` : `; ${fn} doesn’t see it unless you share it`}.`,
    actions: [{ label: 'See the CV and proof view', act: { t: 'do', op: 'evr.cmp.proof', args: {} } }, { label: 'Move both to interview', act: { t: 'say', text: 'move both to interview' } }] });
}
registerOp('evr.review', (w, args, a) => recordReview(w, a, String(args.id), args.outcome as keyof typeof OUTCOME_WORD, String(args.note ?? '').trim(), args.share === true));

// ---------- Step 8: move people on, each on their own evidence (audited, undoable) ----------
export function moveTo(w: World, a: Actor, pids: string[], stage: Stage) {
  if (!CAN_MOVE.includes(a.role ?? 'VIEWER')) { post(w, a, { kind: 'refusal', text: 'Your role can see the pipeline but not move people.' }); return; }
  const prev: { personId: string; stage: Stage }[] = [];
  for (const pid of pids) { const r = setStage(w, a, KORA_ROLE, pid, stage, 'Progressed on their own evidence'); if (r) prev.push({ personId: pid, stage: r.stage }); }
  if (!prev.length) return;
  pushUndo(w, a.id, `Moved ${pids.map((p) => firstName(w, p)).join(' and ')} to ${STAGE_LABEL[stage]}`, 'evr.stages.restore', { prev });
  post(w, a, { kind: 'undo', text: `Moved ${pids.map((p) => firstName(w, p)).join(' and ')} to ${STAGE_LABEL[stage]}, each on their own evidence. Moving a card doesn’t message anyone; invitations go through Messages with your approval.`,
    actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }, { label: 'Open the pipeline', act: { t: 'nav', to: '/r/pipeline' } }] });
}
registerOp('evr.move', (w, args, a) => moveTo(w, a, (args.pids as string[]) ?? [], (args.stage as Stage) ?? 'INTERVIEW'));
registerOp('evr.stages.restore', (w, args, a) => { for (const p of (args.prev as { personId: string; stage: Stage }[]) ?? []) setStage(w, a, KORA_ROLE, p.personId, p.stage); });

// ---------- Step 9: ask whether they're interested (an approved message, then a pending check) ----------
export function draftInterest(w: World, a: Actor, pid: string) {
  const p = personOf(w, pid); if (!p || !a.orgId) return;
  const fn = firstName(w, pid);
  const ex = proof(w).interest.find((i) => i.personId === pid && i.orgId === a.orgId && i.mandateId === KORA_ROLE);
  if (ex) { post(w, a, { kind: 'reply', text: ex.state === 'REQUESTED' ? `You already asked ${fn}; the answer is pending. Pending isn’t a no.` : `${fn} already answered: ${ex.state === 'CONFIRMED' ? 'interested' : 'no, thanks'}.` }); return; }
  const msgId = interestMsgId(pid);
  const f0 = findMsg(w, msgId);
  if (f0 && !OPEN_DRAFT.includes(f0.m.status)) { post(w, a, { kind: 'reply', text: `The question already went to ${fn} (simulated). The answer is pending.` }); return; }
  if (!f0) {
    createDraft(w, a, { id: msgId, personId: pid, kind: 'FOLLOW_UP', channel: 'IN_APP', mandateId: KORA_ROLE });
    const org = w.orgs.find((o) => o.id === a.orgId)?.name;
    const body = [
      `Hi ${p.name.split(' ')[0]},`,
      `We’ve been looking at the work you shared with ${org} for the Senior Backend Engineer role, and we’d like to know whether you’re interested in going further.`,
      'A yes or a no is equally fine, and you can ask us anything first. You can answer here in Talent Q.',
      bandLine(w, a, pid),
      sign(w, a),
    ].filter(Boolean).join('\n\n');
    setFirstVersion(w, msgId, `Are you interested in the Senior Backend role at ${org}?`, body, 'First draft (interest check)');
  }
  postDraft(w, a, msgId, `I drafted a short question to ${fn} in Talent Q messages. Interest is a separate check from suitability: I never guess it or score it. Nothing is sent until you approve it.`);
}
registerOp('evr.interest.draft', (w, args, a) => draftInterest(w, a, String(args.personId)));

// Only the real (simulated) send moves a request on: approval first, then ev.reuse.sent / ev.interest.request.
onMessageSent((w, msgId, approver) => {
  if (msgId.startsWith('msg_evs_')) {
    const id = msgId.slice('msg_evs_'.length); const d = proof(w).reuse.find((x) => x.id === id);
    if (d && d.state === 'PROPOSED') { markReuseSent(w, id); emit(w, approver, 'evidence.reuse.sent', `SHARED:${d.orgId}:${d.personId}`, `The ${reqLabel(w, d.reqId)} sample request went to ${firstName(w, d.personId)} after approval (simulated).`, { personId: d.personId, decisionId: id, msgId }); }
  } else if (msgId.startsWith('msg_evi_')) {
    const pid = msgId.slice('msg_evi_'.length); const a = actorOf(w, approver);
    if (a?.orgId) requestInterest(w, a, pid);
  }
});

// ---------- Step 3: open the comparison's CV and proof view (optionally for chosen people) ----------
registerOp('evr.cmp.proof', (w, args, a) => {
  const people = Array.isArray(args.people) ? (args.people as string[]) : undefined;
  setCmp(w, a.id, { lens: 'proof', open: null, ...(people?.length ? { people } : {}) });
  return { nav: { to: '/r/compare', label: 'the comparison' } };
});

void hc; void latestV;
