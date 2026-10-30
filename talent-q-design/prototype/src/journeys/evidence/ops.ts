// Evidence-first operations (build pack 30 Oct). Every change is an audited event with tenant and candidate scope.
// The prototype simulates the work sample itself; the decisions, states and permissions are what production keeps.
import type { Actor, EvidenceReuseDecision } from '../../state/domain';
import { emit, now, uid, type World } from '../../mock/world';
import { proof } from '../../state/areas/proof';
import { BOUNDED_SAMPLE } from './model';
import { reqLabel } from '../hire-b/model';

const first = (w: World, pid: string) => w.people.find((p) => p.personId === pid)?.name ?? pid;

/** Employer decision for one requirement: accept prior evidence, ask for verification, or one bounded sample. */
export function proposeReuse(w: World, a: Actor, personId: string, reqId: string, decision: EvidenceReuseDecision['decision'], reason: string, evidenceIds: string[] = []): EvidenceReuseDecision {
  const existing = proof(w).reuse.find((d) => d.personId === personId && d.reqId === reqId && d.orgId === a.orgId && !['DECLINED', 'REVIEWED'].includes(d.state));
  if (existing) return existing;
  const d: EvidenceReuseDecision = { id: uid('rd'), orgId: a.orgId!, personId, mandateId: 'm_backend', reqId, decision, evidenceIds, reason, by: a.id, at: now(), state: decision === 'ACCEPT_PRIOR' ? 'REVIEWED' : 'PROPOSED', ...(decision === 'BOUNDED_SAMPLE' ? { effortMinutes: BOUNDED_SAMPLE[reqId]?.minutes ?? 40 } : {}) };
  proof(w).reuse.push(d);
  emit(w, a.id, `evidence.reuse.${decision.toLowerCase()}`, `SHARED:${a.orgId}:${personId}`, `${a.first} ${decision === 'ACCEPT_PRIOR' ? 'accepted existing evidence' : decision === 'REQUEST_VERIFICATION' ? 'asked to verify evidence' : `proposed one ${d.effortMinutes}-minute work sample`} for ${reqLabel(w, reqId)} (${first(w, personId)}). Reason: ${reason}`, { personId, reqId, decisionId: d.id });
  return d;
}

/** The request leaves Kora only through an approved message (correspondence); this marks it sent once that happens. */
export function markReuseSent(w: World, id: string) { const d = proof(w).reuse.find((x) => x.id === id); if (d && d.state === 'PROPOSED') d.state = 'SENT'; }

/** Candidate starts or submits the sample (simulated work). Submission creates a SELF_REPORTED item until reviewed. */
export function startSample(w: World, a: Actor, id: string) { const d = proof(w).reuse.find((x) => x.id === id); if (d && d.personId === a.personId && d.state === 'SENT') { d.state = 'IN_PROGRESS'; emit(w, a.id, 'evidence.sample.started', `SHARED:${d.orgId}:${d.personId}`, `${a.first} started the ${reqLabel(w, d.reqId)} sample.`, { decisionId: id }); } }
export function submitSample(w: World, a: Actor, id: string, summary: string) {
  const d = proof(w).reuse.find((x) => x.id === id); if (!d || d.personId !== a.personId || !['SENT', 'IN_PROGRESS'].includes(d.state)) return;
  const evidenceId = `e_sample_${d.id}`;
  w.evidence.push({ evidenceId, ownerId: d.personId, kind: 'WORK_SAMPLE', title: `Work sample: ${BOUNDED_SAMPLE[d.reqId]?.task ?? reqLabel(w, d.reqId)}`, source: `Talent Q work sample for ${w.orgs.find((o) => o.id === d.orgId)?.name} (simulated)`, observedAt: now().slice(0, 10), verified: false, verification: 'PENDING', origin: 'UPLOAD', shows: summary, limits: `A ${d.effortMinutes}-minute sample on synthetic data. Waiting for a reviewer.`, visibility: 'SHARED_WITH', sharedWith: [d.orgId] });
  proof(w).links.push({ evidenceId, reqId: d.reqId, note: 'Bounded work sample, waiting for review', v: 1, state: 'PROPOSED' });
  d.state = 'SUBMITTED'; d.resultEvidenceId = evidenceId;
  emit(w, a.id, 'evidence.sample.submitted', `SHARED:${d.orgId}:${d.personId}`, `${a.first} submitted the ${reqLabel(w, d.reqId)} sample (simulated).`, { decisionId: id, evidenceId });
}

/** A person reviews the sample. Only then does it count, as ASSESSED (or partial), with the reviewer's own note. */
export function reviewSample(w: World, a: Actor, id: string, outcome: 'SHOWS_IT' | 'PARTLY' | 'NOT_SHOWN', note: string) {
  const d = proof(w).reuse.find((x) => x.id === id); if (!d || d.orgId !== a.orgId || d.state !== 'SUBMITTED' || !d.resultEvidenceId) return;
  const e = w.evidence.find((x) => x.evidenceId === d.resultEvidenceId)!;
  e.verified = outcome !== 'NOT_SHOWN'; e.verification = outcome === 'NOT_SHOWN' ? 'UNVERIFIED' : 'VERIFIED'; e.origin = 'REVIEW';
  e.source = `${e.source.replace(' (simulated)', '')}, reviewed by ${a.name} (simulated)`; e.limits = `${e.limits.replace(' Waiting for a reviewer.', '')} Reviewer’s note: ${note}`;
  const link = proof(w).links.find((x) => x.evidenceId === e.evidenceId && x.reqId === d.reqId)!;
  link.state = outcome === 'NOT_SHOWN' ? 'DISPUTED' : 'REVIEWED'; link.partial = outcome === 'PARTLY'; link.note = note;
  d.state = 'REVIEWED';
  emit(w, a.id, 'evidence.sample.reviewed', `SHARED:${d.orgId}:${d.personId}`, `${a.first} reviewed ${first(w, d.personId)}’s ${reqLabel(w, d.reqId)} sample: ${outcome === 'SHOWS_IT' ? 'shows it' : outcome === 'PARTLY' ? 'shows part of it' : 'didn’t show it'}. ${note}`, { decisionId: id, outcome });
}

export function declineSample(w: World, a: Actor, id: string, why: string) {
  const d = proof(w).reuse.find((x) => x.id === id); if (!d || d.personId !== a.personId) return;
  d.state = 'DECLINED';
  emit(w, a.id, 'evidence.sample.declined', `SHARED:${d.orgId}:${d.personId}`, `${a.first} declined the ${reqLabel(w, d.reqId)} sample${why ? `: ${why}` : ''}. Declining is recorded as declined, not as a failed result.`, { decisionId: id });
}

/** Interest: the employer asks (after an approved message), the candidate answers. Pending is not a no. */
export function requestInterest(w: World, a: Actor, personId: string, mandateId = 'm_backend') {
  const ex = proof(w).interest.find((i) => i.personId === personId && i.orgId === a.orgId && i.mandateId === mandateId);
  if (ex) return ex;
  const i = { orgId: a.orgId!, personId, mandateId, state: 'REQUESTED' as const, at: now(), by: a.id };
  proof(w).interest.push(i);
  emit(w, a.id, 'candidate.interest_requested', `SHARED:${a.orgId}:${personId}`, `${a.first} asked ${first(w, personId)} whether they’re interested in the role.`, { personId, mandateId });
  return i;
}
export function answerInterest(w: World, a: Actor, orgId: string, yes: boolean, note = '', mandateId = 'm_backend') {
  const i = proof(w).interest.find((x) => x.personId === a.personId && x.orgId === orgId && x.mandateId === mandateId); if (!i) return;
  i.state = yes ? 'CONFIRMED' : 'DECLINED'; i.at = now(); i.note = note || undefined;
  emit(w, a.id, yes ? 'candidate.interest_confirmed' : 'candidate.interest_declined', `SHARED:${orgId}:${a.personId}`, `${a.first} ${yes ? 'confirmed interest' : 'said no, thanks'}${note ? `: ${note}` : ''}.`, { personId: a.personId, mandateId });
}
