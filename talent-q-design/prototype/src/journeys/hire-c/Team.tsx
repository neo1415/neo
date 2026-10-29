// /r/team: members, roles and what each role can do. Only admins change roles; the last admin can't be removed.
import { actorOf, orgOf, simNow, useWorld } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { runAction } from '../../q/core/engine';
import type { OrgRole } from '../../state/domain';
import { city, IS_ADMIN, orgMembers, ROLE_CAN, ROLE_LABEL, tTime } from './lib';

const ROLES: OrgRole[] = ['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'VIEWER'];
export function Team() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const admin = IS_ADMIN.includes(a.role ?? 'VIEWER');
  const mem = orgMembers(w, a.orgId);
  const nowIso = simNow(w).toISOString();
  const changes = w.events.filter((e) => e.type === 'team.role.changed' && e.scope === `ORG:${a.orgId}`).slice(-4).reverse();
  return (
    <Canvas title={`${mem.length} people hire at ${orgOf(w, a.orgId)?.name ?? 'your organisation'}`} kicker="Team and permissions" open onClose={() => {}} aside={<span className="t14 muted">{admin ? 'You can change roles' : 'Only admins change roles'}</span>}>
      {!admin && <div className="ds-banner" role="note"><span aria-hidden="true">i</span><span>You’re {ROLE_LABEL[a.role ?? 'VIEWER'].toLowerCase()}. Roles can be changed by {mem.filter((m) => IS_ADMIN.includes(m.role ?? 'VIEWER')).map((m) => m.name).join(', ')}.</span><span /></div>}
      <section className="ds-sheet" aria-labelledby="tm-h">
        <h2 id="tm-h" className="sr">Members</h2>
        <ul className="hc-team">
          {mem.map((m) => (
            <li key={m.id}>
              <span className="ds-av" aria-hidden="true">{m.initials}</span>
              <span style={{ display: 'grid', minWidth: 0 }}><b>{m.name}{m.id === a.id ? ' (you)' : ''}</b><span className="t14 muted">{m.title} · {city(m.timezone)}, {tTime(nowIso, m.timezone)} now</span></span>
              {admin ? (
                <span className="ds-field hc-role"><label htmlFor={`role-${m.id}`} className="sr">Role for {m.name}</label>
                  <select id={`role-${m.id}`} className="ds-input" value={m.role ?? 'VIEWER'} aria-describedby={`can-${m.id}`} onChange={(e) => void runAction({ label: 'Role', act: { t: 'do', op: 'hire-c.role', args: { actorId: m.id, role: e.target.value } } })}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select></span>
              ) : <span className="ds-tag">{ROLE_LABEL[m.role ?? 'VIEWER']}</span>}
              <span id={`can-${m.id}`} className="t14 muted hc-can">Can: {ROLE_CAN[m.role ?? 'VIEWER'].join(' · ')}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="ds-sheet" aria-labelledby="rl-h" style={{ display: 'grid', gap: 10 }}>
        <h2 id="rl-h" className="voice t24" style={{ margin: 0 }}>What each role can do</h2>
        <div className="ds-table-wrap"><table className="ds-table">
          <thead><tr><th scope="col">Role</th><th scope="col">Can</th></tr></thead>
          <tbody>{ROLES.map((r) => <tr key={r}><th scope="row">{ROLE_LABEL[r]}</th><td>{ROLE_CAN[r].join('; ')}</td></tr>)}</tbody>
        </table></div>
        <p className="t14 muted" style={{ margin: 0 }}>Kora approves each send, so hiring managers and interviewers can draft but never send to candidates on their own.</p>
      </section>
      {changes.length > 0 && <section className="ds-sheet" aria-labelledby="ch-h"><h2 id="ch-h" className="lab" style={{ margin: '0 0 8px' }}>Recent changes</h2><ul className="hc-plain">{changes.map((e) => <li key={e.id}>{e.text}</li>)}</ul></section>}
    </Canvas>
  );
}
