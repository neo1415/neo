// Registers the evidence-first operations so buttons and Q actions call one implementation (journeys/evidence/ops.ts).
import { registerOp } from '../core/engine';
import { answerInterest, declineSample, markReuseSent, proposeReuse, requestInterest, reviewSample, startSample, submitSample } from '../../journeys/evidence/ops';
import type { EvidenceReuseDecision } from '../../state/domain';

const S = (a: Record<string, unknown>, k: string) => String(a[k] ?? '');
registerOp('ev.reuse', (w, a, actor) => { proposeReuse(w, actor, S(a, 'personId'), S(a, 'reqId'), S(a, 'decision') as EvidenceReuseDecision['decision'], S(a, 'reason'), (a.evidenceIds as string[] | undefined) ?? []); });
registerOp('ev.reuse.sent', (w, a) => markReuseSent(w, S(a, 'id')));
registerOp('ev.sample.start', (w, a, actor) => startSample(w, actor, S(a, 'id')));
registerOp('ev.sample.submit', (w, a, actor) => submitSample(w, actor, S(a, 'id'), S(a, 'summary')));
registerOp('ev.sample.review', (w, a, actor) => reviewSample(w, actor, S(a, 'id'), S(a, 'outcome') as 'SHOWS_IT' | 'PARTLY' | 'NOT_SHOWN', S(a, 'note')));
registerOp('ev.sample.decline', (w, a, actor) => declineSample(w, actor, S(a, 'id'), S(a, 'why')));
registerOp('ev.interest.request', (w, a, actor) => { requestInterest(w, actor, S(a, 'personId')); });
registerOp('ev.interest.answer', (w, a, actor) => answerInterest(w, actor, S(a, 'orgId'), a.yes === true || a.yes === 'true', S(a, 'note')));
