// /r/team: members, roles and what each role can do. Only admins change roles; the last admin can't be removed.
import { actorOf, orgOf, simNow, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { runAction } from '../../q/core/engine';
import type { OrgRole } from '../../state/domain';
import { city, IS_ADMIN, orgMembers, ROLE_LABEL, tTime } from './lib';

const ROLES: OrgRole[] = ['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'VIEWER'];
export function Team() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const admin = IS_ADMIN.includes(a.role ?? 'VIEWER');
  const mem = orgMembers(w, a.orgId);
  const nowIso = simNow(w).toISOString();
  const changes = w.events.filter((e) => e.type === 'team.role.changed' && e.scope === `ORG:${a.orgId}`).slice(-4).reverse();
  const caps: [string, (r: OrgRole) => boolean][] = [
    ['Approve and send messages', (r) => ['ADMIN', 'RECRUITER'].includes(r)],
    ['Draft messages with Q', (r) => ['ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(r)],
    ['Move people between stages', (r) => ['ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(r)],
    ['Arrange interviews and panels', (r) => ['ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(r)],
    ['Give interview feedback', (r) => ['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER'].includes(r)],
    ['Change roles and guidelines', (r) => r === 'ADMIN'],
    ['Read pipelines and profiles', () => true],
  ];
  const short: Record<OrgRole, string> = { OWNER: 'Owner', ADMIN: 'Admin', RECRUITER: 'Recruiter', HIRING_MANAGER: 'Hiring mgr', INTERVIEWER: 'Interviewer', VIEWER: 'Viewer' };
  return (
    <Canvas title="Team" kicker={`${orgOf(w, a.orgId)?.name ?? 'Your organisation'} · ${mem.length} people`} open onClose={() => {}} aside={<span className="hc-policy t14 muted">{admin ? 'You can change roles' : 'Only admins change roles'}</span>}>
      {!admin && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>You’re {ROLE_LABEL[a.role ?? 'VIEWER'].toLowerCase()}. {mem.filter((m) => IS_ADMIN.includes(m.role ?? 'VIEWER')).map((m) => m.name).join(', ')} can change roles.</span><span /></div>}
      <section className="ds-sheet" aria-labelledby="tm-h">
        <h2 id="tm-h" className="sr">Members</h2>
        <ul className="hc-team">
          {mem.map((m) => (
            <li key={m.id}>
              <span className="ds-av hc-av" aria-hidden="true">{m.initials}</span>
              <span style={{ display: 'grid', minWidth: 0 }}><b>{m.name}{m.id === a.id ? <span className="muted" style={{ fontWeight: 400 }}> (you)</span> : ''}</b><span className="t14 muted">{m.title} · {city(m.timezone)}, {tTime(nowIso, m.timezone)} now</span></span>
              {admin ? (
                <span className="ds-field hc-role"><label htmlFor={`role-${m.id}`} className="sr">Role for {m.name}</label>
                  <select id={`role-${m.id}`} className="ds-input" value={m.role ?? 'VIEWER'} onChange={(e) => void runAction({ label: 'Role', act: { t: 'do', op: 'hire-c.role', args: { actorId: m.id, role: e.target.value } } })}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select></span>
              ) : <span className="ds-tag hc-role">{ROLE_LABEL[m.role ?? 'VIEWER']}</span>}
            </li>
          ))}
        </ul>
      </section>
      <section className="ds-sheet" aria-labelledby="rl-h" style={{ display: 'grid', gap: 12 }}>
        <div className="hc-sec-head"><h2 id="rl-h" className="voice t24" style={{ margin: 0 }}>What each role can do</h2><span className="t14 muted">Kora approves each send</span></div>
        <ul className="hc-rolelist">{ROLES.map((r) => <li key={r}><b>{ROLE_LABEL[r]}</b><span className="t14 muted">{caps.filter(([, f]) => f(r)).map(([k]) => k).join(' · ')}</span></li>)}</ul>
        <div className="ds-table-wrap hc-matrixwrap" tabIndex={0} role="region" aria-label="Permissions by role"><table className="ds-table hc-matrix">
          <thead><tr><th scope="col"><span className="sr">Permission</span></th>{ROLES.map((r) => <th key={r} scope="col"><span className="hc-wide">{ROLE_LABEL[r]}</span><span className="hc-narrow">{short[r]}</span><span className="hc-n num">{mem.filter((m) => (m.role ?? 'VIEWER') === r).length}</span></th>)}</tr></thead>
          <tbody>{caps.map(([k, f]) => <tr key={k}><th scope="row">{k}</th>{ROLES.map((r) => <td key={r} data-y={f(r) ? '1' : '0'}>{f(r) ? <><span aria-hidden="true">✓</span><span className="sr">Yes</span></> : <><span aria-hidden="true">–</span><span className="sr">No</span></>}</td>)}</tr>)}</tbody>
        </table></div>
        <p className="t14 muted" style={{ margin: 0 }}>Hiring managers and interviewers can draft but never send to candidates on their own; an admin or recruiter says yes to each message.</p>
      </section>
      <section className="ds-sheet" aria-labelledby="ch-h" style={{ display: 'grid', gap: 8 }}>
        <h2 id="ch-h" className="lab" style={{ margin: 0 }}>Recent changes</h2>
        {changes.length ? <ul className="hc-plain">{changes.map((e) => <li key={e.id}>{e.text}</li>)}</ul> : <p className="t14 muted" style={{ margin: 0 }}>No role changes yet. Changes made here or by asking Q are listed with who made them.</p>}
      </section>
    </Canvas>
  );
}
