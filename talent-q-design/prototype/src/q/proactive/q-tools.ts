// Q-TOOLS proactive rule: sources that disagree stay visible until someone decides how to show them (MO-056).
// It only fires after Q has researched something for this person, so it never appears in other journeys.
import { registerRule } from '../core/proactive';
import { conflictDecision, sourcesFor } from '../../journeys/q-tools/model';
import { PAY_CONFLICT } from '../../journeys/q-tools/web';

registerRule({
  id: 'qt.conflict', side: 'both', priority: 'normal',
  evaluate: (w, a) => {
    const s = sourcesFor(w, a);
    if (!s.some((x) => x.key === `web:${PAY_CONFLICT.a.url}`) || !s.some((x) => x.key === `web:${PAY_CONFLICT.b.url}`) || conflictDecision(w, a)) return [];
    return [{ subject: 'qt.conflict', text: `Two sources disagree on ${PAY_CONFLICT.topic}: ${PAY_CONFLICT.a.says} against ${PAY_CONFLICT.b.says}.`, why: 'Q keeps both and doesn’t pick one silently; how to show them is your call.', actions: [{ label: 'Compare them', primary: true, act: { t: 'nav', to: '/q/sources' } }] }];
  },
});
