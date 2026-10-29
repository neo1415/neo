// Routes for T4 (Grace). Owned by this area (see journeys/BUILD-BRIEF.md).
import { registerRoute } from './registry';
import { registerHomeSection } from './entry';
import { Link } from '../ui/router';
import { actorOf, useWorld, type World } from '../mock/world';
import { readPersonC } from '../state/areas/talent-c';
import { Interview } from '../screens/Interview';
import { FirstSteps } from '../journeys/talent-c/FirstSteps';
import { uploadPct } from '../journeys/talent-c/runtime';
import '../styles/talent-c.css';

registerRoute({ path: '/c/interview', side: 'candidate', label: 'practice and interviews', render: () => <Interview />, nav: { group: 'Grow', label: 'Practice and interview', icon: 'practice', order: 13 } });
// Reached from home, Q ("help me start") and proactive suggestions; kept out of the rail (nine-item limit).
registerRoute({ path: '/c/start', side: 'candidate', label: 'your first steps', render: () => <FirstSteps /> });

const mine = (w: World) => { const a = actorOf(w); return a.side === 'candidate' && !!a.personId && (!!w.q.prefs[a.id]?.plain || !!readPersonC(w, a.personId).place); };
registerHomeSection('candidate', { id: 'talent-c.first-steps', order: 5, when: mine, render: () => <FirstStepsCard /> });

function FirstStepsCard() {
  const s = useWorld((w) => { const a = actorOf(w); const p = readPersonC(w, a.personId); return { done: p.stepsDone.length, step: Math.min(p.step, 2), up: p.upload && p.upload.status !== 'DONE' && p.upload.done ? uploadPct(p.upload) : null }; });
  if (s.done >= 3) return null;
  return (
    <div className="talent-c-home">
      <span className="lab">First steps · {s.done} of 3 done</span>
      <p className="voice t19" style={{ margin: 0 }}>{s.done === 0 ? 'Three small steps: your work, your certificate, your interview.' : `Next: step ${s.step + 1} of 3.${s.up !== null ? ` Your certificate is ${s.up}% sent.` : ''}`}</p>
      <Link className="ds-btn primary" to="/c/start">{s.done ? 'Carry on' : 'Start'}</Link>
    </div>
  );
}
