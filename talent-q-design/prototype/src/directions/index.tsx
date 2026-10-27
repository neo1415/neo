// Design-direction exploration (founder review, 27 Oct). Four directions, same three experiences.
// D (Living Intelligence Workspace) unifies A, B and C at the founder's request.
// Each direction is lazy-loaded so its fonts and styles only load when visited.
import { lazy, Suspense } from 'react';
import { Link } from '../ui/router';

const A = { home: lazy(() => import('./a/A').then((m) => ({ default: m.AHome }))), compare: lazy(() => import('./a/A').then((m) => ({ default: m.ACompare }))), career: lazy(() => import('./a/A').then((m) => ({ default: m.ACareer }))) };
const B = { home: lazy(() => import('./b/B').then((m) => ({ default: m.BHome }))), compare: lazy(() => import('./b/B').then((m) => ({ default: m.BCompare }))), career: lazy(() => import('./b/B').then((m) => ({ default: m.BCareer }))) };
const C = { home: lazy(() => import('./c/C').then((m) => ({ default: m.CHome }))), compare: lazy(() => import('./c/C').then((m) => ({ default: m.CCompare }))), career: lazy(() => import('./c/C').then((m) => ({ default: m.CCareer }))) };
const D = { home: lazy(() => import('./d/D').then((m) => ({ default: m.DHome }))), compare: lazy(() => import('./d/D').then((m) => ({ default: m.DCompare }))), career: lazy(() => import('./d/D').then((m) => ({ default: m.DCareer }))) };
const DIRS = { a: A, b: B, c: C, d: D } as const;

export const DIRECTIONS = [
  { id: 'a', name: 'Atelier', line: 'Lucid, annotated, atelier', what: 'An editorial spread. Q writes in gold ink, artifacts read like annotated features, and the conversation lives in the margin.' },
  { id: 'b', name: 'Constellation', line: 'Luminous, spatial, observatory', what: 'A dark spatial field with one light source. Q is an orbit whose satellites are its live agents, and evidence is drawn as connections.' },
  { id: 'c', name: 'Studio', line: 'Bold, warm, studio', what: 'A warm, kinetic stage of modules. Q is a large flat gold form that becomes the thing it made, one focus at a time.' },
  { id: 'd', name: 'Living Intelligence Workspace', line: 'One thread, one evolving artifact', what: 'An ink thread where Q works, beside a paper canvas where it builds the view each task needs. Q moves only when its agents finish work; every view of the artifact stays a tap away.' },
] as const;

export function Directions({ path }: { path: string }) {
  const [, , d, exp] = path.split('/');
  const set = DIRS[d as keyof typeof DIRS];
  const Screen = set?.[(exp || 'home') as keyof typeof A];
  if (!Screen) return <Picker />;
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#111' }} aria-busy="true" />}><Screen /></Suspense>;
}

function Picker() {
  return (
    <main style={{ minHeight: '100vh', background: '#f4f1ea', color: '#17150f', fontFamily: 'system-ui, sans-serif', padding: 'clamp(24px,5vw,64px) clamp(16px,4vw,56px)' }}>
      <p style={{ fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', color: '#5d5648', margin: 0 }}>Talent Q · design direction review · simulated data</p>
      <h1 style={{ fontSize: 'clamp(32px,4.5vw,52px)', lineHeight: 1.1, margin: '12px 0 8px', fontWeight: 600, letterSpacing: '-.02em' }}>Four directions, the same three experiences.</h1>
      <p style={{ maxWidth: '62ch', fontSize: 18, color: '#3f3a30', margin: 0 }}>Each direction is a working prototype. Open any experience; every one adapts to phone width.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, marginTop: 36 }}>
        {DIRECTIONS.map((x) => (
          <section key={x.id} aria-labelledby={`d-${x.id}`} style={{ background: '#fff', border: '1px solid #d9cfbd', borderRadius: 16, padding: 24, display: 'grid', gap: 12, alignContent: 'start' }}>
            <span style={{ fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a5a17' }}>Direction {x.id.toUpperCase()}</span>
            <h2 id={`d-${x.id}`} style={{ margin: 0, fontSize: 28 }}>{x.name}</h2>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#3f3a30' }}>{x.line}</p>
            <p style={{ margin: 0, color: '#3f3a30' }}>{x.what}</p>
            <nav aria-label={`${x.name} experiences`} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {[['home', 'Q home and a generated artifact'], ['compare', 'Recruiter discovery and evidence comparison'], ['career', 'J7 career intelligence']].map(([k, l]) => (
                <Link key={k} to={`/x/${x.id}/${k}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, padding: '0 16px', border: '1px solid #17150f', borderRadius: 999, color: '#17150f', textDecoration: 'none', fontWeight: 500 }}>{l}<span aria-hidden="true">→</span></Link>
              ))}
            </nav>
          </section>
        ))}
      </div>
      <section aria-labelledby="d-choice" style={{ marginTop: 40, maxWidth: 1080, display: 'grid', gap: 16 }}>
        <h2 id="d-choice" style={{ margin: 0, fontSize: 28 }}>Choosing: what D changes, and what it costs</h2>
        <p style={{ margin: 0, color: '#3f3a30', maxWidth: '68ch' }}>D unifies A’s typography and evidence ledger, B’s working Q and relationship map, and C’s next-step chips and phone layouts into one system: an ink thread where Q works and a paper canvas where it builds the view each step needs. The full critique is in <code>decisions/DIRECTION-REVIEW.md</code>.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
          {[['What D improves', ['Q visibly works: agents advance on the mark only as work finishes (A was quiet).', 'The map is a view, not the default: the ledger reads first, so B’s learnability and scale risks are handled.', 'One artifact with views and versions, in one continuous conversation, with no drift back to C’s tiles.', 'J7 separates practice from proof: only assessed evidence moves the atlas, and every change is justified in the record.']],
            ['Trade-offs that remain', ['View choice is scripted here. Production needs Q to return typed artifact views with a reason.', 'The ink thread is heavy on wide desktop work; it may need to collapse.', 'Restraint costs spectacle: the Q mark is small and still when idle.', 'On phones the atlas is a glance; the list does the work. No usability test has been run yet.']]].map(([h, items]) => (
            <div key={h as string} style={{ background: '#fff', border: '1px solid #d9cfbd', borderRadius: 16, padding: 24 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 19 }}>{h as string}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#3f3a30', display: 'grid', gap: 6 }}>{(items as string[]).map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
