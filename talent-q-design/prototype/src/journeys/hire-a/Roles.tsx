// /r/roles and /r/roles/:id: an organisation's role briefs (mandates), scoped to the signed-in person's
// organisation. The brief reads in plain language; versions stay readable; approve, discard and undo go
// through the same Q ops as the conversation, so the page and Q never disagree.
import { useEffect, useState } from 'react';
import { actorOf, personOf, useWorld, visibleEvidence, type World } from '../../mock/world';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { runAction, useViewState } from '../../q/core/engine';
import { prefillQ } from '../../q/QThread';
import { readA } from '../../state/areas/hire-a';
import type { MandateX } from '../../state/domain';
import { STAGE_LABEL } from '../../state/domain';
import { activeLevel, actorName, band, can, curV, dayLabel, ensureSeeded, hoursText, LEVEL_LABEL, naira, orgMandates, payText, POOL, STATUS_PLAIN, levelOf, ROLE_LABEL, whoCan } from './model';
import { evidenceGlyph, openQ } from './ui';
import { CONFLICTS } from '../../q/skills/hire-a';

const say = (text: string) => void runAction({ label: text, act: { t: 'say', text } });
const doOp = (label: string, op: string, args: Record<string, unknown>) => void runAction({ label, act: { t: 'do', op, args } });

export function RolesList() {
  useEffect(() => { ensureSeeded(); }, []);
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const org = w.orgs.find((o) => o.id === a.orgId);
  const ms = orgMandates(w, a).sort((x, y) => (y.versions[y.versions.length - 1]?.at ?? '').localeCompare(x.versions[x.versions.length - 1]?.at ?? ''));
  const drafts = ms.filter((m) => m.status === 'DRAFT').length;
  if (!org) return (
    <Canvas title="No roles yet" kicker="Roles" open onClose={openQ}>
      <section className="ds-sheet hire-a-empty">
        <p style={{ margin: 0 }}>You haven’t set up your business yet. Tell Q what’s going on, in your own words, and it will set up your organisation and draft your first role with you.</p>
        <button type="button" className="ds-btn primary" onClick={() => say('I need someone to help me with my business but I do not really know what kind of person')}>I need help but I’m not sure who</button>
      </section>
    </Canvas>
  );
  return (
    <Canvas title={ms.length ? (drafts ? `${drafts} draft${drafts === 1 ? '' : 's'} waiting for approval` : `${ms.length} role${ms.length === 1 ? '' : 's'} in progress`) : 'No roles yet'} kicker={`Roles · ${org.name}`} open onClose={openQ}>
      {!ms.length && <section className="ds-sheet hire-a-empty"><p style={{ margin: 0 }}>No roles yet. Tell Q who you need, or what you need help with, and it will draft one with you.</p><button type="button" className="ds-btn primary" onClick={() => say('I need to hire someone')}>Start a role with Q</button></section>}
      <ul className="hire-a-list" aria-label={`Roles at ${org.name}`}>
        {ms.map((m) => {
          const found = readA(w).search[m.id]?.found.length ?? 0;
          const sl = w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').length;
          return (
            <li key={m.id} className="ds-sheet hire-a-row">
              <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                <Link to={`/r/roles/${m.id}`} className="voice t24 hire-a-title">{m.title}</Link>
                <span className="t14 muted">{m.location} · {payText(m)} · v{curV(m)} · last change {dayLabel(m.versions[m.versions.length - 1].at, a.timezone)} by {actorName(w, m.versions[m.versions.length - 1].by)}</span>
              </div>
              <div className="hire-a-tags">
                <span className="ds-tag" data-k={m.status === 'DRAFT' ? 'busy' : 'ok'}>{STATUS_PLAIN[m.status]}</span>
                {found > 0 && <span className="ds-tag num">{found} found · {sl} shortlisted</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="t14 muted" style={{ margin: 0 }}>Only {org.name}’s roles are shown. Other organisations’ roles and candidates are never visible here.</p>
    </Canvas>
  );
}

type View = 'brief' | 'people' | 'versions';
export function RoleDetail({ id }: { id: string }) {
  useEffect(() => { ensureSeeded(); }, []);
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const [view, setView] = useViewState<View>('view', 'brief');
  const [ver, setVer] = useState<number | null>(null);
  useEffect(() => { setVer(null); }, [id]);
  const m = w.mandates.find((x) => x.id === id);
  const gone = readA(w).discarded[id];
  if (!m && gone && gone.orgId === a.orgId) return (
    <Canvas title="This draft was discarded" kicker="Role brief" open onClose={openQ}>
      <section className="ds-sheet hire-a-empty" role="status">
        <p style={{ margin: 0 }}>“{gone.title}” (v{curV(gone)}) was discarded. If that was a mistake, bring it back exactly as it was, or say “undo that” to Q.</p>
        <button type="button" className="ds-btn primary" onClick={() => doOp('Restore', 'hire-a.mandate.restore', { id })}>Restore the draft</button>
      </section>
    </Canvas>
  );
  if (!m) return <Canvas title="Role not found" kicker="Role brief" open onClose={openQ}><section className="ds-sheet hire-a-empty"><p style={{ margin: 0 }}>This role doesn’t exist, or it has been closed.</p><Link to="/r/roles" className="ds-btn">See your roles</Link></section></Canvas>;
  if (m.orgId !== a.orgId) return (
    <Canvas title="You don’t have access to this role" kicker="Role brief" open onClose={openQ}>
      <section className="ds-sheet hire-a-empty" role="alert"><p style={{ margin: 0 }}>This role belongs to another organisation. Talent Q keeps each organisation’s roles and candidates separate, so nothing about it is shown here.</p><Link to="/r/roles" className="ds-btn">See your roles</Link></section>
    </Canvas>
  );
  const views = [{ id: 'brief' as const, label: 'Brief' }, { id: 'people' as const, label: `People${readA(w).search[m.id] ? ` · ${readA(w).search[m.id].found.length}` : ''}` }, { id: 'versions' as const, label: `Versions · ${m.versions.length}` }];
  return (
    <Canvas title={m.title} kicker={<>Role brief · {STATUS_PLAIN[m.status]}</>} views={views} view={view} setView={(v) => { setVer(null); setView(v); }} open onClose={openQ}
      qLine={m.status === 'DRAFT' ? `Draft v${curV(m)}: approve it when it looks right, or tell me what to change.` : `v${curV(m)} is approved.`}>
      {view === 'brief' && <Brief w={w} m={m} ver={ver} clearVer={() => setVer(null)} />}
      {view === 'people' && <People w={w} m={m} />}
      {view === 'versions' && <Versions w={w} m={m} open={(v) => { setVer(v); setView('brief'); }} />}
    </Canvas>
  );
}

function Brief({ w, m, ver, clearVer }: { w: World; m: MandateX; ver: number | null; clearVer: () => void }) {
  const a = actorOf(w);
  const s = readA(w);
  const meta = s.meta[m.id] ?? {};
  const snap = ver && ver !== curV(m) ? s.snapshots[m.id]?.[ver] : null;
  const shown = snap ?? { title: m.title, plain: m.plain, location: m.location, workMode: m.workMode, pay: m.pay, requirements: m.requirements, hours: meta.hours, days: meta.days };
  const guide = meta.roleKey ? band(meta.roleKey, shown.hours, shown.days) : null;
  const below = guide && shown.pay.max < guide[0];
  const approvers = whoCan(w, a, 'approve_brief');
  const approved = s.meta[m.id]?.approvedBy;
  return (
    <div className="hire-a-brief">
      {snap ? (
        <div className="ds-banner" role="status"><Glyph k="partial" /><span>You’re reading <b>v{ver}</b>, an earlier version. It’s kept so you can see what changed; it isn’t used.</span><button type="button" className="ds-btn" onClick={clearVer}>Back to v{curV(m)}</button></div>
      ) : m.status === 'DRAFT' ? (
        <div className="ds-banner" data-k="warn" role="status"><Glyph k="none" /><span><b>Draft v{curV(m)} · not approved.</b> Nothing is searched or sent until {can(a, 'approve_brief') ? 'you approve it' : `${approvers[0]?.name ?? 'someone who can'} approves it`}.</span>
          {can(a, 'approve_brief') ? <button type="button" className="ds-btn primary" onClick={() => doOp('Approve', 'hire-a.mandate.approve', { id: m.id, v: curV(m) })}>Approve v{curV(m)}</button> : <span className="t14 muted">You’re a {ROLE_LABEL[a.role ?? 'VIEWER']}</span>}</div>
      ) : (
        <div className="ds-banner" role="status"><Glyph k="verified" /><span><b>Approved v{s.meta[m.id]?.approvedV ?? curV(m)}</b>{approved ? ` by ${actorName(w, approved)}` : ''}{s.meta[m.id]?.approvedAt ? ` on ${dayLabel(s.meta[m.id]!.approvedAt!, a.timezone)}` : ''}. Any change makes a new version that needs approval again.</span>
          {!s.search[m.id] && <button type="button" className="ds-btn primary" onClick={() => doOp('Find people', 'hire-a.search', { id: m.id })}>Find people</button>}</div>
      )}
      <section className="ds-sheet" aria-labelledby="hb-plain" style={{ display: 'grid', gap: 14 }}>
        <h2 id="hb-plain" className="lab" style={{ margin: 0 }}>In plain words</h2>
        <p className="voice t24" style={{ margin: 0 }}>{shown.plain}</p>
        <dl className="hire-a-facts">
          {meta.roleKey && <div><dt>Hours</dt><dd>{hoursText(shown.hours, shown.days)}</dd></div>}
          <div><dt>Where</dt><dd>{shown.location} · {shown.workMode === 'ONSITE' ? 'on site' : shown.workMode.toLowerCase()}</dd></div>
          <div><dt>Pay</dt><dd>{payText(shown)}{guide && <span className="t14 muted" style={{ display: 'block' }}>Usual: {naira(guide[0])}–{naira(guide[1])} <span className="ds-sim">Illustrative</span></span>}{below && <span className="ds-tag" data-k="warn" style={{ marginTop: 6 }}>Below the usual range</span>}</dd></div>
          <div><dt>Team</dt><dd>{m.team}</dd></div>
        </dl>
      </section>
      <section className="ds-sheet" aria-labelledby="hb-req" style={{ display: 'grid', gap: 10 }}>
        <h2 id="hb-req" className="lab" style={{ margin: 0 }}>What they must be able to show</h2>
        <ol className="hire-a-reqs">
          {shown.requirements.map((r) => <li key={r.reqId}><span><b>{r.label}</b><span className="t14 muted" style={{ display: 'block' }}>{r.plain}</span></span><span className="ds-tag" data-k={r.mustHave ? 'ok' : undefined}>{r.mustHave ? 'Must have' : 'Nice to have'}</span></li>)}
        </ol>
      </section>
      {!snap && (
        <div className="ds-actions">
          <button type="button" className="ds-btn" onClick={() => { prefillQ('Change the brief: '); openQ(); }}>Ask Q to change something</button>
          {m.status === 'DRAFT' && (can(a, 'delete_role') || m.createdBy === a.id) && <button type="button" className="ds-btn quiet" onClick={() => doOp('Discard draft', 'hire-a.mandate.discard', { id: m.id })}>Discard draft</button>}
          {m.status !== 'DRAFT' && s.search[m.id] && <button type="button" className="ds-btn" onClick={() => say(`open the people for ${m.title}`)}>See the people</button>}
        </div>
      )}
    </div>
  );
}

function Versions({ w, m, open }: { w: World; m: MandateX; open: (v: number) => void }) {
  const a = actorOf(w);
  return (
    <section className="ds-sheet" aria-labelledby="hv-h" style={{ display: 'grid', gap: 10 }}>
      <h2 id="hv-h" className="lab" style={{ margin: 0 }}>Every version, newest first</h2>
      <ol className="hire-a-versions" reversed>
        {[...m.versions].reverse().map((v) => (
          <li key={v.v}>
            <span className="num" style={{ fontFamily: 'var(--data)' }}>v{v.v}</span>
            <span><b>{v.note}</b><span className="t14 muted" style={{ display: 'block' }}>{dayLabel(v.at, a.timezone)} · {actorName(w, v.by)}{v.v === curV(m) ? ' · current' : ''}{readA(w).meta[m.id]?.approvedV === v.v ? ' · approved' : ''}</span></span>
            {v.v !== curV(m) && readA(w).snapshots[m.id]?.[v.v] && <button type="button" className="ds-btn" onClick={() => open(v.v)}>Read v{v.v}</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function People({ w, m }: { w: World; m: MandateX }) {
  const a = actorOf(w);
  const search = readA(w).search[m.id];
  const kora = m.orgId === 'org_kora';
  const level = activeLevel(w, a);
  const remoteOk = w.memories.find((x) => x.lifecycle_status === 'active' && x.memory_key === 'mandate.m_payouts.remote_ok')?.structured_value.remoteOk;
  if (!search) return (
    <section className="ds-sheet hire-a-empty">
      <p style={{ margin: 0 }}>{m.status === 'DRAFT' ? 'No search yet. Q only searches against an approved brief, so it’s clear what it is looking for.' : 'No search yet.'}</p>
      {m.status === 'DRAFT' ? <button type="button" className="ds-btn" onClick={() => say(`approve the ${m.title} brief`)}>Approve the brief first</button> : <button type="button" className="ds-btn primary" onClick={() => doOp('Find people', 'hire-a.search', { id: m.id })}>Find people</button>}
    </section>
  );
  const all = search.found;
  const shown = all.filter((p) => !kora || level === 'ALL' || levelOf(p) === 'SENIOR');
  const hidden = all.length - shown.length;
  const sl = w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').map((e) => e.personId);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="hire-a-toolbar">
        <p className="t14 muted" style={{ margin: 0 }} aria-live="polite">{shown.length} shown · {sl.length} shortlisted · found {dayLabel(search.at, a.timezone)} from {kora ? 'applicants and profiles shared with Kora Pay' : 'Talent Q profiles open to offers'} <span className="ds-sim">Simulated</span></p>
        {kora && <div role="group" aria-label="Level" style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="ds-filter" aria-pressed={level === 'ALL'} onClick={() => doOp('All levels', 'hire-a.level', { v: 'ALL', id: m.id })}>All levels</button>
          <button type="button" className="ds-filter" aria-pressed={level === 'SENIOR'} onClick={() => doOp('Senior only', 'hire-a.level', { v: 'SENIOR', id: m.id })}>Senior only</button>
        </div>}
      </div>
      {hidden > 0 && <p className="t14" role="note" style={{ margin: 0 }}>{hidden} junior or mid-level {hidden === 1 ? 'person is' : 'people are'} hidden by your “only seniors” instruction.</p>}
      <ul className="hire-a-people" aria-label="People found">
        {shown.map((pid) => {
          const p = personOf(w, pid)!; const meta = POOL[pid];
          const on = sl.includes(pid);
          const stage = w.pipeline.find((e) => e.mandateId === m.id && e.personId === pid)?.stage;
          const ev = visibleEvidence(w, pid, a.orgId!).filter((e) => !CONFLICTS[pid] || (e.evidenceId !== CONFLICTS[pid].a && e.evidenceId !== CONFLICTS[pid].b)).slice(0, 2);
          const conflict = CONFLICTS[pid] && visibleEvidence(w, pid, a.orgId!).some((e) => e.evidenceId === CONFLICTS[pid].a);
          return (
            <li key={pid} className="ds-sheet hire-a-person" data-on={on ? '1' : undefined}>
              <div className="hire-a-person-head">
                <div style={{ minWidth: 0 }}>
                  <b className="voice" style={{ fontSize: 20 }}>{p.name}</b>
                  <span className="t14 muted" style={{ display: 'block' }}>{p.headline} · {p.location}</span>
                </div>
                <button type="button" className="ds-btn" aria-pressed={on} onClick={() => doOp(on ? 'Remove' : 'Shortlist', 'hire-a.shortlist', { id: m.id, pids: [pid], on: !on })}>{on ? '✓ Shortlisted' : 'Shortlist'}</button>
              </div>
              <div className="hire-a-tags">
                {kora && levelOf(pid) && <span className="ds-tag">{LEVEL_LABEL[levelOf(pid)!]}</span>}
                {stage && stage !== 'SOURCED' && <span className="ds-tag" data-k="ok">{STAGE_LABEL[stage]}</span>}
                {meta?.remote && remoteOk === false && <span className="ds-tag" data-k="warn">Outside Lagos · brief is hybrid</span>}
                {!kora && meta?.asks && meta.asks > m.pay.max && <span className="ds-tag" data-k="warn">Asks about {naira(meta.asks)}</span>}
              </div>
              <ul className="hire-a-fit">
                {meta?.fit.map((f) => <li key={f}><Glyph k="full" size={16} />{f}</li>)}
                {meta?.unknown.map((f) => <li key={f}><Glyph k="none" size={16} /><span>Not shown yet: {f.toLowerCase()}</span></li>)}
                {ev.map((e) => { const g = evidenceGlyph(e); return <li key={e.evidenceId}><Glyph k={g.k} size={16} /><span>{e.title} <span className="muted">· {g.label}</span></span></li>; })}
              </ul>
              {conflict && (
                <div className="ds-banner" data-k="warn"><Glyph k="unclear" /><span><b>Sources disagree</b> on {CONFLICTS[pid].topic}: CV says {CONFLICTS[pid].aSays}; GitHub shows {CONFLICTS[pid].bSays}. {readA(w).conflicts[pid] ? (readA(w).conflicts[pid] === 'INTERVIEW' ? 'You’ll check it in the interview.' : 'You asked him about it.') : 'Not resolved.'}</span>
                  <button type="button" className="ds-btn" onClick={() => say(`how many years of experience does ${p.name.split(' ')[0]} really have`)}>See both</button></div>
              )}
            </li>
          );
        })}
      </ul>
      {!kora && sl.length > 0 && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say('propose interview times')}>Propose interview times for {sl.length}</button><span className="t14 muted">Q drafts; nothing is sent until you approve.</span></div>}
      {!kora && <p className="t14 muted" style={{ margin: 0 }}>Shown: only what each person chose to make visible. Other employers’ candidates are never part of your search.</p>}
    </div>
  );
}
