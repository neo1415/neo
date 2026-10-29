// Live cards inside Q's replies for R2. Q's text says the finding in a sentence; the card shows the structure
// (who leads on what, the reasoning per requirement, the questions, the follow-ups) so the thread never turns
// into a wall of bullet text. Ids carry the state the reply was about, so an old card stays true to its reply.
import { useWorld } from '../../mock/world';
import { registerRef } from '../../q/refs';
import { Glyph } from '../../ds/Glyph';
import type { Level } from '../../state/areas/hire-b';
import { cellFor, firstName, GLYPH_OF, LEVEL_VALUE, LEVEL_WORD, questionsFor, reqLabel, shortLabel, usesRubric, weightOf, type CompareView } from './model';
import { Ledger } from './Ledger';

const parse = <T,>(s: string): T | null => { try { return JSON.parse(s) as T; } catch { return null; } };
type ViewId = { p: string[]; c: string[]; y?: boolean; q?: boolean };
export const viewId = (v: CompareView) => JSON.stringify({ p: v.people, c: v.criteria, y: v.lastYear || undefined, q: v.weighting !== 'EQUAL' || undefined });
const toView = (x: ViewId): CompareView => ({ people: x.p, criteria: x.c, lastYear: !!x.y, weighting: x.q ? 'RUBRIC' : 'EQUAL' });

function LedgerCard({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const x = parse<ViewId>(id); if (!x) return null;
  const v = toView(x);
  const people = v.people.filter((p) => w.people.some((y) => y.personId === p));
  if (!people.length || !v.criteria.length) return null;
  return (
    <div className="hire-b-qcard" role="group" aria-label="The comparison, as a ledger">
      <div className="hire-b-qcard-head"><span className="lab">Who to talk to first</span><span className="t14 muted">{v.lastYear ? 'Last year only · ' : ''}{usesRubric(w, v.weighting) ? 'Rubric weights' : 'Must-haves equal'}</span></div>
      <Ledger w={w} v={{ ...v, people }} compact />
    </div>
  );
}

const Mark = ({ l }: { l: Level }) => <span className="hire-b-qmark"><Glyph k={GLYPH_OF[l]} size={13} />{LEVEL_WORD[l]}</span>;
function ReasonCard({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const x = parse<ViewId & { a: string; b: string }>(id); if (!x) return null;
  const v = toView(x);
  const fa = firstName(w, x.a), fb = firstName(w, x.b);
  return (
    <div className="hire-b-qcard" role="group" aria-label={`${fa} and ${fb}, requirement by requirement`}>
      <table className="hire-b-qtable">
        <caption className="sr">What Q used for {fa} and {fb}, requirement by requirement</caption>
        <thead><tr><th scope="col">Requirement</th><th scope="col">{fa}</th><th scope="col">{fb}</th></tr></thead>
        <tbody>{v.criteria.map((r) => { const ca = cellFor(w, x.a, r, v), cb = cellFor(w, x.b, r, v); const d = LEVEL_VALUE[ca.level] - LEVEL_VALUE[cb.level]; return (
          <tr key={r}>
            <th scope="row">{shortLabel(w, r)}{usesRubric(w, v.weighting) && <span className="hire-b-lcol-x"> w{weightOf(w, r, v.weighting)}</span>}<span className="hire-b-qahead">{d === 0 ? 'level' : `${d > 0 ? fa : fb} ahead`}</span></th>
            <td data-ahead={d > 0 ? '1' : undefined}><Mark l={ca.level} />{ca.correction && <span className="t14 muted"> (your correction)</span>}</td>
            <td data-ahead={d < 0 ? '1' : undefined}><Mark l={cb.level} />{cb.correction && <span className="t14 muted"> (your correction)</span>}</td>
          </tr>); })}</tbody>
      </table>
    </div>
  );
}

function QuestionsCard({ id }: { id: string }) {
  const w = useWorld((x) => x);
  if (!w.people.some((p) => p.personId === id)) return null;
  const qs = questionsFor(w, id).slice(0, 4);
  return (
    <div className="hire-b-qcard" role="group" aria-label={`Questions for ${firstName(w, id)}`}>
      <ol className="hire-b-qlist hire-b-qlist-sm">{qs.map((q) => <li key={q.id}><span className="hire-b-qtags"><span className="hire-b-qreq">{reqLabel(w, q.reqId)}</span><span className="hire-b-qwhy"><Glyph k={GLYPH_OF[q.level]} size={12} />{q.why.split(':')[0]}</span></span><span className="hire-b-qtext">{q.text}</span></li>)}</ol>
    </div>
  );
}

function FollowCard({ id }: { id: string }) {
  const xs = parse<string[]>(id); if (!xs?.length) return null;
  return (
    <div className="hire-b-qcard" role="group" aria-label="Follow-up questions">
      <span className="lab">Ask one of these</span>
      <ol className="hire-b-follow-list">{xs.map((f) => <li key={f}>{f}</li>)}</ol>
    </div>
  );
}

registerRef('hb.ledger', LedgerCard);
registerRef('hb.reason', ReasonCard);
registerRef('hb.questions', QuestionsCard);
registerRef('hb.followups', FollowCard);
