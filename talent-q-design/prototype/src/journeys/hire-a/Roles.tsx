// /r/roles and /r/roles/:id: an organisation's role briefs (mandates), scoped to the signed-in person's
// organisation. The brief reads in plain language; versions stay readable; approve, discard and undo go
// through the same Q ops as the conversation, so the page and Q never disagree.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { actorOf, personOf, useWorld, visibleEvidence, type World } from '../../mock/world';
import { arrive } from '../../ds/motion';
import { Canvas } from '../../ds/Workspace';
import { Glyph } from '../../ds/Glyph';
import { Link } from '../../ui/router';
import { useViewState } from '../../q/core/engine';
import { prefillQ } from '../../q/QThread';
import { readA } from '../../state/areas/hire-a';
import type { MandateX } from '../../state/domain';
import { STAGE_LABEL } from '../../state/domain';
import { activeLevel, actorName, band, can, curV, dayLabel, ensureSeeded, hoursText, isVerified, LEVEL_LABEL, naira, orgMandates, payText, POOL, levelOf, postedJob, ROLE_LABEL, whoCan } from './model';
import { doOp, evidenceGlyph, LimitsPanel, openQ, PayRange, say, StatusTag } from './ui';
import { CONFLICTS } from '../../q/skills/hire-a';

/** The one next thing for a role, in plain words (shown on the list so nobody has to open each role). */
function nextFor(w: World, m: MandateX, me: string): string {
  const found = readA(w).search[m.id]?.found.length ?? 0;
  const sl = w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').length;
  if (m.status === 'DRAFT') { const by = m.versions[m.versions.length - 1].by; return by === me ? 'Next: approve it, or ask Q to change it' : `Waiting for approval · last change by ${actorName(w, by).split(' ')[0]}`; }
  if (m.status === 'INTERVIEWING') return 'Interviews under way';
  if (!found) return 'Next: find people';
  return `${found} found · ${sl} shortlisted${postedJob(w, m.id) ? ' · posted' : ''}`;
}

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
        <h2 className="voice t24" style={{ margin: 0 }}>Start with your business</h2>
        <p style={{ margin: 0 }}>You haven’t set up your business yet. Tell Q what’s going on, in your own words, and it will set up your organisation and draft your first role with you.</p>
        <button type="button" className="ds-btn primary" onClick={() => say('I need someone to help me with my business but I do not really know what kind of person')}>I need help but I’m not sure who</button>
      </section>
    </Canvas>
  );
  return (
    <Canvas title="Roles" kicker={org.name} open onClose={openQ}
      aside={ms.length ? <span className="hire-a-summary">{drafts > 0 && <span className="ds-tag" data-k="busy">{drafts} waiting for approval</span>}<span className="ds-tag num">{`${ms.length} ${ms.length === 1 ? "role" : "roles"}`}</span></span> : undefined}>
      {!ms.length ? (
        <section className="ds-sheet hire-a-empty">
          <h2 className="voice t24" style={{ margin: 0 }}>No roles yet</h2>
          <p style={{ margin: 0 }}>Tell Q who you need, or just what you need help with. It drafts the role with you; nothing is posted until you approve.</p>
          <button type="button" className="ds-btn primary" onClick={() => say('I need to hire someone')}>Start a role with Q</button>
        </section>
      ) : (
        <ul className="ds-sheet hire-a-rows" aria-label={`Roles at ${org.name}`}>
          {ms.map((m) => (
            <li key={m.id}>
              <Link to={`/r/roles/${m.id}`} className="hire-a-rowlink">
                <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  <span className="voice t24">{m.title}</span>
                  <span className="meta">{m.location} · {payText(m)} · changed {dayLabel(m.versions[m.versions.length - 1].at, a.timezone)}</span>
                </span>
                <span className="side"><StatusTag m={m} /><span className="next">{nextFor(w, m, a.id)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="t14 muted" style={{ margin: 0 }}>Only {org.name}’s roles. Other organisations’ roles and candidates are never shown here.</p>
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
    <Canvas title={m.title} kicker={<>Role brief · {w.orgs.find((o) => o.id === m.orgId)?.name}</>} aside={<StatusTag m={m} />} views={views} view={view} setView={(v) => { setVer(null); setView(v); }} open onClose={openQ}
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
        <div className="ds-banner hire-a-banner" role="status"><Glyph k="partial" /><span>You’re reading <b>v{ver}</b>, an earlier version. It’s kept so you can see what changed; it isn’t used.</span><button type="button" className="ds-btn" onClick={clearVer}>Back to v{curV(m)}</button></div>
      ) : m.status === 'DRAFT' ? (
        <div className="ds-banner hire-a-banner" data-k="warn" role="status"><Glyph k="none" /><span><b>Draft v{curV(m)}, not approved yet.</b> Nothing is searched or sent until {can(a, 'approve_brief') ? 'you approve it' : `${approvers[0]?.name ?? 'someone who can'} approves it`}.</span>
          {can(a, 'approve_brief') ? <button type="button" className="ds-btn primary" onClick={() => doOp('Approve', 'hire-a.mandate.approve', { id: m.id, v: curV(m) })}>Approve v{curV(m)}</button> : <span className="t14 muted">You’re a {ROLE_LABEL[a.role ?? 'VIEWER']}</span>}</div>
      ) : (
        <div className="ds-banner hire-a-banner" role="status"><Glyph k="verified" /><span><b>Approved v{s.meta[m.id]?.approvedV ?? curV(m)}</b>{approved ? ` by ${actorName(w, approved)}` : ''}{s.meta[m.id]?.approvedAt ? ` on ${dayLabel(s.meta[m.id]!.approvedAt!, a.timezone)}` : ''}. Any change makes a new version that needs approval again.</span>
          {!s.search[m.id] && <button type="button" className="ds-btn primary" onClick={() => doOp('Find people', 'hire-a.search', { id: m.id })}>Find people</button>}</div>
      )}
      <section className="ds-sheet" aria-labelledby="hb-plain" style={{ display: 'grid', gap: 14 }}>
        <h2 id="hb-plain" className="lab" style={{ margin: 0 }}>In plain words</h2>
        <p className="voice t24" style={{ margin: 0 }}>{shown.plain}</p>
        <dl className="hire-a-facts">
          {meta.roleKey && <div><dt>Hours</dt><dd>{hoursText(shown.hours, shown.days)}</dd></div>}
          <div><dt>Where</dt><dd>{shown.location} · {shown.workMode === 'ONSITE' ? 'on site' : shown.workMode.toLowerCase()}</dd></div>
          {!guide && <div><dt>Pay</dt><dd>{payText(shown)}</dd></div>}
          <div><dt>Team</dt><dd>{m.team}</dd></div>
        </dl>
        {guide && (
          <div className="hire-a-paybox" data-below={below ? '1' : undefined}>
            <div><span className="lab">Pay</span><b style={{ display: 'block', marginTop: 4 }}>{payText(shown)}</b><span className="t14 muted">Usual for this work: {naira(guide[0])}–{naira(guide[1])}, an illustrative Lagos guide, not a quote.</span></div>
            <PayRange pay={shown.pay.max} lo={guide[0]} hi={guide[1]} />
          </div>
        )}
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
          {m.status !== 'DRAFT' && !postedJob(w, m.id) && can(a, 'approve_send') && (isVerified(w, m.orgId)
            ? <button type="button" className="ds-btn" onClick={() => say('post the role')}>Post as a job</button>
            : <span className="t14 muted" style={{ alignSelf: 'center' }}>Posting it as a job needs a verified business.</span>)}
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
      <h2 className="voice t24" style={{ margin: 0 }}>{m.status === 'DRAFT' ? 'Approve the brief to search' : 'Ready to search'}</h2>
      <p style={{ margin: 0 }}>{m.status === 'DRAFT' ? 'Q only searches against an approved brief, so it’s clear what it’s looking for. Nobody is contacted.' : 'Q looks for people who fit the approved brief. Nobody is contacted until you say so.'}</p>
      {m.status === 'DRAFT' ? <button type="button" className="ds-btn primary" onClick={() => say(`approve the ${m.title} brief`)}>Approve v{curV(m)}</button> : <button type="button" className="ds-btn primary" onClick={() => doOp('Find people', 'hire-a.search', { id: m.id })}>Find people</button>}
    </section>
  );
  const all = search.found;
  const shown = all.filter((p) => !kora || level === 'ALL' || levelOf(p) === 'SENIOR');
  const hidden = all.length - shown.length;
  const sl = w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').map((e) => e.personId);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {!kora && <LimitsPanel orgId={m.orgId} mandate={m} compact />}
      <div className="hire-a-toolbar">
        <p className="t14 muted" style={{ margin: 0 }} aria-live="polite"><b className="num" style={{ color: 'var(--ink)' }}>{shown.length} shown · {sl.length} shortlisted</b> · found {dayLabel(search.at, a.timezone)} from {kora ? 'applicants and profiles shared with Kora Pay' : 'Talent Q profiles open to offers'} <span className="ds-sim">Simulated search</span></p>
        {kora && <div role="group" aria-label="Level" style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="ds-filter" aria-pressed={level === 'ALL'} onClick={() => doOp('All levels', 'hire-a.level', { v: 'ALL', id: m.id })}>All levels</button>
          <button type="button" className="ds-filter" aria-pressed={level === 'SENIOR'} onClick={() => doOp('Senior only', 'hire-a.level', { v: 'SENIOR', id: m.id })}>Senior only</button>
        </div>}
      </div>
      {hidden > 0 && <p className="t14" role="note" style={{ margin: 0 }}>{hidden} junior or mid-level {hidden === 1 ? 'person is' : 'people are'} hidden by your “only seniors” instruction.</p>}
      {!shown.length && <section className="ds-sheet hire-a-empty"><h2 className="voice t24" style={{ margin: 0 }}>Nobody found yet</h2><p style={{ margin: 0 }}>Nobody who fits has made their profile visible to {w.orgs.find((o) => o.id === m.orgId)?.name} yet. Q keeps looking and tells you when someone appears.</p></section>}
      {shown.length > 0 && <ul className="ds-sheet hire-a-people" aria-label="People found">
        {shown.map((pid) => {
          const p = personOf(w, pid)!; const meta = POOL[pid];
          const on = sl.includes(pid);
          const stage = w.pipeline.find((e) => e.mandateId === m.id && e.personId === pid)?.stage;
          const ev = visibleEvidence(w, pid, a.orgId!).filter((e) => !CONFLICTS[pid] || (e.evidenceId !== CONFLICTS[pid].a && e.evidenceId !== CONFLICTS[pid].b)).slice(0, 2);
          const conflict = CONFLICTS[pid] && visibleEvidence(w, pid, a.orgId!).some((e) => e.evidenceId === CONFLICTS[pid].a);
          return (
            <motion.li key={pid} className="hire-a-person" data-on={on ? '1' : undefined} {...arrive}>
              {/* MO-011 candidate arrives: each person rises in once, when the search writes them. */}
              <div className="hire-a-person-head">
                <div style={{ minWidth: 0 }}>
                  <span className="who"><b className="voice" style={{ fontSize: 20 }}>{p.name}</b>{kora && levelOf(pid) && <span className="ds-tag">{LEVEL_LABEL[levelOf(pid)!]}</span>}</span>
                  <span className="t14 muted" style={{ display: 'block' }}>{p.headline} · {p.location}</span>
                </div>
                <button type="button" className="ds-btn" aria-pressed={on} onClick={() => doOp(on ? 'Remove' : 'Shortlist', 'hire-a.shortlist', { id: m.id, pids: [pid], on: !on })}>{on ? '✓ Shortlisted' : 'Shortlist'}</button>
              </div>
              <div className="hire-a-tags">
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
                <div className="ds-banner hire-a-banner" data-k="warn"><Glyph k="unclear" /><span><b>Sources disagree</b> on {CONFLICTS[pid].topic}: CV says {CONFLICTS[pid].aSays}; GitHub shows {CONFLICTS[pid].bSays}. {readA(w).conflicts[pid] ? (readA(w).conflicts[pid] === 'INTERVIEW' ? 'You’ll check it in the interview.' : 'You asked him about it.') : 'Not resolved.'}</span>
                  <button type="button" className="ds-btn" onClick={() => say(`how many years of experience does ${p.name.split(' ')[0]} really have`)}>See both</button></div>
              )}
            </motion.li>
          );
        })}
      </ul>}
      {!kora && sl.length > 0 && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say('propose interview times')}>Propose interview times for {sl.length}</button><span className="t14 muted">Q drafts; nothing is sent until you approve.</span></div>}
      {!kora && <p className="t14 muted" style={{ margin: 0 }}>Shown: only what each person chose to make visible. Other employers’ candidates are never part of your search.</p>}
    </div>
  );
}
