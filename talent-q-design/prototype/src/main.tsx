import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { App } from './app/App';
import { canDiscover, canSeeCandidate, getWorld, orgLimits, outreachThisWeek, relationshipWith, update, visibleEvidence } from './mock/world';

// QA hook for the privacy tests (qa/scripts/review/privacy.mjs). The prototype holds only simulated data.
(window as unknown as { __tqQA: unknown }).__tqQA = { canDiscover, canSeeCandidate, relationshipWith, visibleEvidence, orgLimits, outreachThisWeek, getWorld, update };

// Review links: "#/r/home?as=u_ada" opens any page as that person, already signed up (demo only).
// The parameter is applied once and removed, so the address bar shows the plain route.
function openAs() {
  const [route, query = ''] = location.hash.slice(1).split('?');
  const as = new URLSearchParams(query).get('as');
  if (!as || !getWorld().actors.some((a) => a.id === as)) return;
  update((w) => { w.session.actor = as; w.actors.find((a) => a.id === as)!.signedUp = true; });
  const rest = new URLSearchParams(query); rest.delete('as');
  history.replaceState(null, '', `#${route || '/'}${rest.size ? `?${rest}` : ''}`);
}
openAs();
window.addEventListener('hashchange', openAs);

document.documentElement.dataset.theme = 'light';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
