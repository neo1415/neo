import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { App } from './app/App';
import { canDiscover, canSeeCandidate, getWorld, relationshipWith, update, visibleEvidence } from './mock/world';

// QA hook for the privacy tests (qa/scripts/review/privacy.mjs). The prototype holds only simulated data.
(window as unknown as { __tqQA: unknown }).__tqQA = { canDiscover, canSeeCandidate, relationshipWith, visibleEvidence, getWorld, update };

document.documentElement.dataset.theme = 'light';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
