import { MotionConfig } from 'motion/react';
import { useRoute } from '../ui/router';
import { ToastHost } from '../ui/kit';
import { Entry } from '../screens/Entry';
import { Gallery } from '../screens/Gallery';
import { Directions } from '../directions';
import { AppShell } from '../ds/AppShell';
import { matchRoute } from '../routes/registry';
import { useWorld, actorOf } from '../mock/world';

// Feature areas register routes, Q skills, proactive rules and seed data in their own files.
// Discovering them here means areas can be built in parallel without editing a shared file.
import.meta.glob('../routes/*.tsx', { eager: true });
import.meta.glob('../q/skills/*.ts', { eager: true });
import.meta.glob('../q/proactive/*.ts', { eager: true });

export function App() {
  const { path } = useRoute();
  const actor = useWorld((w) => actorOf(w));
  if (path === '/x' || path.startsWith('/x/')) return <MotionConfig reducedMotion="user"><Directions path={path} /></MotionConfig>;
  if (path === '/gallery') return <MotionConfig reducedMotion="user"><Gallery /></MotionConfig>;
  const m = matchRoute(path);
  if (!m) {
    if (path === '/' || path === '') return <MotionConfig reducedMotion="user"><Entry /></MotionConfig>;
    return <MotionConfig reducedMotion="user"><NotFound /></MotionConfig>;
  }
  if (m.def.bare || m.def.side === 'public') return <MotionConfig reducedMotion="user">{m.def.render(m.params)}<ToastHost /></MotionConfig>;
  // A product page for the other side than the signed-in person: say so instead of leaking data.
  if (m.def.side !== 'both' && m.def.side !== actor.side) return <MotionConfig reducedMotion="user"><WrongSide side={m.def.side} /></MotionConfig>;
  return (
    <MotionConfig reducedMotion="user">
      <AppShell path={path}>{m.def.render(m.params)}</AppShell>
      <ToastHost />
    </MotionConfig>
  );
}

function WrongSide({ side }: { side: string }) {
  return (
    <main className="main" style={{ padding: 48 }}>
      <h1 className="t-display">This page is for {side === 'recruiter' ? 'employers' : 'candidates'}.</h1>
      <p className="muted" style={{ marginTop: 12 }}>You’re signed in as someone on the other side. Switch person from the menu, or <a href="#/">go to the start</a>.</p>
    </main>
  );
}
function NotFound() {
  return (
    <main className="main" style={{ padding: 48 }}>
      <h1 className="t-display">This page doesn’t exist.</h1>
      <p className="muted" style={{ marginTop: 12 }}><a href="#/">Go to the start</a></p>
    </main>
  );
}
