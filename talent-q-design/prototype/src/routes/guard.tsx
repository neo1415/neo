// Tenant guard for pages that show one organisation's data (e.g. Kora's Senior Backend brief, search and
// comparison). Anyone else who reaches them, by URL or history, sees a permission state instead.
import type { ReactNode } from 'react';
import { actorOf, useWorld } from '../mock/world';
import { Canvas } from '../ds/Workspace';
import { Link } from '../ui/router';

export function OrgOnly({ orgId, what, children }: { orgId: string; what: string; children: ReactNode }) {
  const a = useWorld((w) => actorOf(w));
  const org = useWorld((w) => w.orgs.find((o) => o.id === orgId)?.name ?? 'another organisation');
  if (a.orgId === orgId) return <>{children}</>;
  return (
    <Canvas title="Not available to you" kicker={what} open onClose={() => {}}>
      <section className="ds-sheet" role="alert" style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
        <b>This belongs to {org}.</b>
        <p style={{ margin: 0 }}>Each organisation only sees its own hiring. Nothing from {org} is shown to {a.first}, and nothing of yours is shown to them.</p>
        <Link className="ds-btn" to="/r/home" style={{ justifySelf: 'start' }}>Back to your home</Link>
      </section>
    </Canvas>
  );
}
