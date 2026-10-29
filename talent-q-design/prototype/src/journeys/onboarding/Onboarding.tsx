// Your profile (T1). The global Q drives set-up by conversation; this canvas shows the profile being built,
// and offers the same three ways in: talk to Q, upload a CV (simulated parse) or a short form, switchable
// at any time. Everything shown here is a CLAIM in the person's own words until evidence backs it up.
import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Glyph } from '../../ds/Glyph';
import { Canvas } from '../../ds/Workspace';
import { Link } from '../../ui/router';
import { actorOf, update, useWorld } from '../../mock/world';
import { runAction, useViewState } from '../../q/core/engine';
import { QUESTIONS, SECTIONS, editProfile, missingOf, readProfile, samplesFor, validateForm, type FormDraft, type Profile, type Section } from '../../services/profile';
import { entryMatches, type Match } from './match';
import { taRead } from '../../state/areas/talent-a';
import { draftCv } from '../../q/skills/talent-a';
import type { QAction } from '../../state/domain';

type View = 'profile' | 'form' | 'jobs' | 'cv';
const act = (a: QAction) => void runAction(a);
const say = (text: string) => act({ label: text, act: { t: 'say', text } });
const op = (name: string, args: Record<string, unknown> = {}) => act({ label: name, act: { t: 'do', op: name, args } });

export function Onboarding() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const pid = a.personId ?? 'p_amaka';
  const p = readProfile(w, pid);
  const [view, setView] = useViewState<View>('view', 'profile');
  const matches = useMemo(() => entryMatches(w, pid), [w, pid]);
  const cv = taRead(w).cv[pid];
  const offline = w.network === 'offline';
  const claims = p.experience.reduce((n, x) => n + x.claims.length, 0);
  const title = view === 'jobs' ? (matches.length ? `${matches.length} entry-level ${matches.length === 1 ? 'job asks' : 'jobs ask'} for things you’ve mentioned` : 'Jobs that fit what you’ve told me')
    : view === 'cv' ? (cv ? `${cv.lines.length} CV lines, all from your own words` : 'Your CV, from your own words')
    : view === 'form' ? 'The short form' : p.answered.length ? `Your profile, ${a.first}: ${claims} ${claims === 1 ? 'claim' : 'claims'} so far` : `Welcome, ${a.first}. Let’s show what you can do.`;
  return (
    <Canvas title={title} kicker={<span>Your profile · private to you</span>} open onClose={() => {}}
      views={[{ id: 'profile', label: 'Profile' }, { id: 'form', label: 'Short form' }, { id: 'jobs', label: 'Jobs that fit' }, { id: 'cv', label: 'CV' }]} view={view} setView={setView}
      aside={p.done ? <span className="ds-tag" data-k="ok">Profile set up</span> : p.answered.length ? <span className="ds-tag">{p.answered.length + p.none.length} of 6 · {missingOf(p).length} missing</span> : null}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          {view === 'profile' && <ProfileView p={p} pid={pid} offline={offline} />}
          {view === 'form' && <FormView p={p} pid={pid} />}
          {view === 'jobs' && <JobsView p={p} matches={matches} />}
          {view === 'cv' && <CvView p={p} lines={cv?.lines ?? null} approved={cv?.status === 'APPROVED'} first={a.first} />}
        </motion.div>
      </AnimatePresence>
    </Canvas>
  );
}

function Ways({ p }: { p: Profile }) {
  return (
    <section className="ds-sheet talent-a-ways" aria-labelledby="ways-h">
      <h2 id="ways-h" className="voice t24" style={{ margin: 0 }}>{p.answered.length ? 'Add to it any way you like.' : 'Three ways in. Switch whenever you want.'}</h2>
      <div role="group" aria-label="How you’d like to build your profile" className="talent-a-grid3">
        <button type="button" className="ds-opt" aria-pressed={p.method === 'talk'} onClick={() => say('help me set up my profile')}><span><b>Chat with Q</b><span className="t14 muted" style={{ display: 'block' }}>Small questions, in your own words. Skip anything.</span></span></button>
        <button type="button" className="ds-opt" aria-pressed={p.method === 'cv'} onClick={() => op('ta.cv.choose')}><span><b>Upload a CV</b><span className="t14 muted" style={{ display: 'block' }}>Q reads it and shows you everything before it’s used.</span></span></button>
        <button type="button" className="ds-opt" aria-pressed={p.method === 'form'} onClick={() => op('ta.view', { route: '/c/welcome', view: 'form' })}><span><b>Fill a short form</b><span className="t14 muted" style={{ display: 'block' }}>Seven fields, all optional.</span></span></button>
      </div>
      <ul className="talent-a-promises" aria-label="Promises">
        {['Private by default. You choose each employer who sees anything.', 'What you tell Q is a claim in your words. Q never adds anything you didn’t say.', 'No job history is fine: projects, volunteering and your studies count.'].map((t) => <li key={t}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 3, color: "var(--ink-2)" }}><path d="M5 12.5 10 17.5 19 7" /></svg><span>{t}</span></li>)}
      </ul>
    </section>
  );
}

const SOURCE: Record<string, string> = { CV: 'From your CV', CONVERSATION: 'From our conversation', YOU: 'Added by you' };
function sectionStatus(p: Profile, s: Section): { label: string; k: 'none' | 'unclear' | 'partial'; tone?: string } {
  if (p.answered.includes(s)) return { label: 'Answered · claim', k: 'none' };
  if (p.none.includes(s)) return { label: 'None, and that’s fine', k: 'partial' };
  if (p.skipped.includes(s)) return { label: 'Skipped · noted as missing', k: 'unclear', tone: 'warn' };
  return { label: 'Not yet', k: 'unclear' };
}
function ProfileView({ p, pid, offline }: { p: Profile; pid: string; offline: boolean }) {
  const files = samplesFor(pid);
  const remove = (xid: string, cid: string) => update((w) => editProfile(w, pid, (x) => { x.experience = x.experience.map((e) => (e.id === xid ? { ...e, claims: e.claims.filter((c) => c.id !== cid) } : e)).filter((e) => e.claims.length); }));
  return (
    <>
      <Ways p={p} />
      {p.cv.status === 'reading' && (
        <section className="ds-sheet" aria-busy="true" aria-labelledby="cv-read-h" style={{ display: 'grid', gap: 12 }}>
          <h2 id="cv-read-h" className="voice t24" style={{ margin: 0 }}>Reading {p.cv.file}… nothing is used until you see it.</h2>
          {[0.6, 0.9, 0.75].map((x, i) => <div key={i} className="ds-skeleton" style={{ height: 16, width: `${x * 100}%` }} />)}
        </section>
      )}
      {p.cv.status === 'unreadable' && !p.answered.length && (
        <div className="ds-banner" data-k="risk" role="status">
          <Glyph k="unclear" />
          <span><b>Q couldn’t read {p.cv.file}.</b> It’s a photo of a page, so there’s no text to read reliably. Nothing was saved from it.</span>
          <span className="ds-actions">{files.filter((f) => f.kind === 'pdf').map((f) => <button key={f.file} type="button" className="ds-btn" disabled={offline} onClick={() => op('ta.cv.read', { file: f.file, kind: 'pdf' })}>Upload {f.file}</button>)}</span>
        </div>
      )}
      {offline && <p className="ds-banner" data-k="warn" role="status" style={{ margin: 0 }}><Glyph k="unclear" /><span>You’re offline. Your profile is saved on this device; CV reading waits until you reconnect.</span><span /></p>}
      <section className="ds-sheet" aria-labelledby="prof-h" style={{ display: 'grid', gap: 4 }}>
        <h2 id="prof-h" className="voice t24" style={{ margin: '0 0 8px' }}>{p.answered.length ? 'What you’ve told Q, in your words' : 'Your profile will build here as you talk to Q'}</h2>
        <ul className="talent-a-sections">
          {SECTIONS.map((s) => {
            const st = sectionStatus(p, s);
            const exp = p.experience.filter((e) => (s === 'project' ? e.kind === 'project' || e.kind === 'course' : s === 'volunteer' ? e.kind === 'volunteer' : false));
            const jobs = s === 'project' ? p.experience.filter((e) => e.kind === 'job') : [];
            return (
              <li key={s}>
                <Glyph k={st.k} title={st.label} />
                <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                  <p style={{ margin: 0 }}><b>{QUESTIONS[s].label}</b> <span className="t14 muted">· {st.label}</span></p>
                  {s === 'study' && p.study && <p style={{ margin: 0 }}>{p.study}</p>}
                  {s === 'tools' && p.skills.length > 0 && <p style={{ margin: 0 }}>{p.skills.map((k) => k.label).join(', ')} <span className="t14 muted">· claims</span></p>}
                  {s === 'location' && p.location && <p style={{ margin: 0 }}>{p.location}{p.workMode ? ` · ${p.workMode}` : ''}</p>}
                  {s === 'goal' && p.goal && <p style={{ margin: 0 }}>{p.goal}</p>}
                  {[...jobs, ...exp].map((e) => (
                    <div key={e.id} style={{ display: 'grid', gap: 4 }}>
                      <span className="t14" style={{ fontWeight: 600 }}>{e.title}{e.org ? ` · ${e.org}` : ''}{e.when ? ` · ${e.when}` : ''}</span>
                      {e.claims.map((c) => (
                        <div key={c.id} className="talent-a-claim">
                          <span>“{c.text.replace(/\.$/, '')}”<span className="t14 muted" style={{ display: 'block' }}>{SOURCE[c.source]} · claim{c.flagged ? ` · Q: ${c.flagged}` : ''}</span></span>
                          <button type="button" className="ds-btn quiet" onClick={() => remove(e.id, c.id)} aria-label={`Remove: ${c.text}`}>Remove</button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {p.noJobs && <p className="t14 muted" style={{ margin: '8px 0 0' }}>No job history yet. That’s expected straight from school; Q builds from your studies, projects and volunteering, and never invents a job.</p>}
      </section>
      {p.answered.length > 0 && (
        <section className="ds-sheet" aria-labelledby="sum-h" style={{ display: 'grid', gap: 12 }}>
          <h2 id="sum-h" className="lab" style={{ margin: 0 }}>At a glance</h2>
          <dl className="talent-a-stats">
            {[[String(p.experience.reduce((n, x) => n + x.claims.length, 0)), 'claims, in your words'], [String(p.skills.length), 'tools you named'], [String(missingOf(p).length), 'still missing'], ['0', 'employers who can see you']].map(([n, l]) => <div key={l}><dt className="t14 muted">{l}</dt><dd className="num voice t30">{n}</dd></div>)}
          </dl>
          <div className="ds-actions">
            <button type="button" className="ds-btn primary" onClick={() => say('show me entry level jobs that fit me')}>Jobs that fit me</button>
            <button type="button" className="ds-btn" onClick={() => say('what jobs could i do with what i have')}>Where could I go?</button>
            <button type="button" className="ds-btn" onClick={() => say('help me write my cv')}>Help with my CV</button>
          </div>
        </section>
      )}
    </>
  );
}

const FIELDS: { k: keyof FormDraft; label: string; hint?: string; long?: boolean; mode?: 'numeric' }[] = [
  { k: 'name', label: 'Your name' }, { k: 'location', label: 'Where you can work from', hint: 'A city, or “Remote only”' },
  { k: 'study', label: 'Course and university', hint: 'For example: Economics, UNN' }, { k: 'year', label: 'Year you finished', hint: 'Four digits, for example 2026', mode: 'numeric' },
  { k: 'project', label: 'One project from school', hint: 'What it was about and what you did', long: true }, { k: 'volunteer', label: 'Volunteering or activities (optional)', long: true },
  { k: 'tools', label: 'Tools you’ve used', hint: 'Excel, Google Sheets, Word…' },
];
function FormView({ p, pid }: { p: Profile; pid: string }) {
  const set = (k: keyof FormDraft, v: string) => update((w) => editProfile(w, pid, (x) => { x.form = { ...x.form, [k]: v }; if (x.formErrors[k]) x.formErrors = validateForm(x.form); }));
  const errs = p.formErrors ?? {};
  return (
    <form className="ds-sheet" aria-labelledby="form-h" style={{ display: 'grid', gap: 14, maxWidth: 680 }} noValidate onSubmit={(e) => { e.preventDefault(); op('ta.form.save'); }}>
      <h2 id="form-h" className="voice t24" style={{ margin: 0 }}>Fill in what you like. Everything is optional.</h2>
      <p className="t14 muted" style={{ margin: 0 }}>Anything you’ve already told Q is kept. If something looks wrong when you save, Q will tell you what and help you fix it.</p>
      {Object.keys(errs).length > 0 && <div className="ds-banner" data-k="risk" role="alert"><Glyph k="unclear" /><span><b>Not saved yet.</b> {Object.keys(errs).length === 1 ? 'One field needs a look' : `${Object.keys(errs).length} fields need a look`}; Q has a suggestion in the conversation.</span><span /></div>}
      {FIELDS.map((f) => {
        const err = errs[f.k]; const id = `ta-f-${f.k}`;
        const common = { id, className: 'ds-input', value: p.form[f.k], 'aria-invalid': !!err, 'aria-describedby': [f.hint ? `${id}-h` : '', err ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined };
        return (
          <div key={f.k} className="ds-field">
            <label htmlFor={id}>{f.label}</label>
            {f.hint && <span id={`${id}-h`} className="t14 muted">{f.hint}</span>}
            {f.long ? <textarea {...common} rows={3} onChange={(e) => set(f.k, e.target.value)} /> : <input {...common} inputMode={f.mode} onChange={(e) => set(f.k, e.target.value)} />}
            {err && <span id={`${id}-e`} className="t14" style={{ color: 'var(--risk)' }}>{err}</span>}
          </div>
        );
      })}
      <div className="ds-actions"><button type="submit" className="ds-btn primary">Save</button><button type="button" className="ds-btn quiet" onClick={() => say('help me set up my profile')}>I’d rather chat with Q</button></div>
    </form>
  );
}

const NEED_GLYPH = { evidenced: 'full', mentioned: 'unclear', none: 'none' } as const;
const NEED_LABEL = { evidenced: 'Evidenced', mentioned: 'Mentioned by you (claim)', none: 'Not shown yet' } as const;
function JobsView({ p, matches }: { p: Profile; matches: Match[] }) {
  if (!p.answered.length) return (
    <section className="ds-sheet" style={{ display: 'grid', gap: 12 }} aria-labelledby="jobs-empty"><h2 id="jobs-empty" className="voice t24" style={{ margin: 0 }}>Q needs to know a little about you first.</h2>
      <p style={{ margin: 0 }}>Matches compare what a listing asks for with what you’ve told Q. Tell Q about your studies or a project, or upload a CV.</p>
      <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say('help me set up my profile')}>Set up my profile</button></div></section>
  );
  if (!matches.length) return <section className="ds-sheet" aria-labelledby="jobs-none"><h2 id="jobs-none" className="voice t24" style={{ margin: 0 }}>No open entry-level listing asks for anything you’ve mentioned yet.</h2><p style={{ margin: '8px 0 0' }}>That isn’t a judgement of you. Adding one project or tool usually changes it.</p></section>;
  return (
    <section className="ds-sheet" aria-labelledby="jobs-h" style={{ display: 'grid', gap: 14 }}>
      <h2 id="jobs-h" className="voice t24" style={{ margin: 0 }}>Closest first. Mentioned is a claim, not proof, and the employer decides.</h2>
      <ul aria-label="Key" className="talent-a-key t14">{(['evidenced', 'mentioned', 'none'] as const).map((k) => <li key={k}><Glyph k={NEED_GLYPH[k]} size={16} />{NEED_LABEL[k]}</li>)}</ul>
      <ul className="talent-a-jobs">
        {matches.map((m) => (
          <li key={m.job.id}>
            <div className="talent-a-jobhead">
              <span><b>{m.job.title}</b> <span className="muted">· {m.org} · {m.job.location} · {m.job.pay}</span>{m.isNew && <span className="ds-tag" data-k="busy" style={{ marginLeft: 8 }}>New this week</span>}</span>
              <span className="num t14">{m.fit} of {m.needs.length}</span>
            </div>
            <ul className="talent-a-needs">{m.needs.map((n) => <li key={n.need}><Glyph k={NEED_GLYPH[n.state]} title={NEED_LABEL[n.state]} /><span><b style={{ fontWeight: 600 }}>{n.need}</b><span className="t14 muted"> · {n.state === 'none' ? 'not shown yet' : n.basis}</span></span></li>)}</ul>
            {m.notes.length > 0 && <p className="t14 muted" style={{ margin: 0 }}>{m.notes.join(' ')}</p>}
            <div className="ds-actions">
              {m.applied ? <><span className="ds-tag" data-k="ok">Applied · {m.applied.toLowerCase().replace('_', ' ')}</span><Link className="ds-btn" to="/c/applications">My applications</Link></>
                : <button type="button" className="ds-btn" onClick={() => say(`apply for the ${m.org.split(' ')[0].toLowerCase()} ${m.job.title.toLowerCase()} job`)}>Apply with Q</button>}
              <button type="button" className="ds-btn quiet" onClick={() => say(`why does the ${m.org.split(' ')[0].toLowerCase()} ${m.job.title.toLowerCase()} job fit me`)}>Why?</button>
              <Link className="ds-btn quiet" to={`/c/jobs/${m.job.id}`}>Open listing</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CvView({ p, lines, approved, first }: { p: Profile; lines: ReturnType<typeof draftCv> | null; approved: boolean; first: string }) {
  if (!p.answered.length) return <section className="ds-sheet" aria-labelledby="cv-empty" style={{ display: 'grid', gap: 12 }}><h2 id="cv-empty" className="voice t24" style={{ margin: 0 }}>Q writes CV lines only from what you’ve told it.</h2><div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say('help me set up my profile')}>Tell Q about yourself</button></div></section>;
  if (!lines) return <section className="ds-sheet" aria-labelledby="cv-none" style={{ display: 'grid', gap: 12 }}><h2 id="cv-none" className="voice t24" style={{ margin: 0 }}>No draft yet.</h2><p style={{ margin: 0 }}>Ask Q to draft your CV. Every line will trace back to something you said; nothing is invented.</p><div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => say('help me write my cv')}>Draft my CV</button></div></section>;
  const groups = ['Education', 'Projects', 'Volunteering', 'Work', 'Skills'] as const;
  const claimText = (from: string) => p.experience.flatMap((e) => e.claims).find((c) => c.id === from);
  const download = () => {
    const txt = [`${p.name || first}`, p.location, '', ...groups.flatMap((g) => { const ls = lines.filter((l) => l.section === g); return ls.length ? [g.toUpperCase(), ...ls.map((l) => `- ${l.text}`), ''] : []; }), 'Drafted with Talent Q from your own words (prototype).'].join('\n');
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); const el = document.createElement('a'); el.href = url; el.download = `cv-${first.toLowerCase()}.txt`; el.click(); URL.revokeObjectURL(url);
  };
  return (
    <section className="ds-sheet" aria-labelledby="cv-h" style={{ display: 'grid', gap: 14 }}>
      <h2 id="cv-h" className="voice t24" style={{ margin: 0 }}>{approved ? 'Saved. Private until you approve an application.' : 'Draft. Check each line; every one traces to your words.'}</h2>
      {groups.map((g) => { const ls = lines.filter((l) => l.section === g); if (!ls.length) return null; return (
        <div key={g} style={{ display: 'grid', gap: 6 }}>
          <h3 className="lab" style={{ margin: 0 }}>{g}</h3>
          <ul className="talent-a-cv">{ls.map((l) => { const c = claimText(l.from); return <li key={l.id}><span>{l.text}</span><span className="t14 muted">{c ? `${SOURCE[c.source]}: “${c.text.replace(/\.$/, '').slice(0, 70)}${c.text.length > 70 ? '…' : ''}”` : l.from === 'study' ? 'From what you studied' : 'From the tools you named'}{c?.flagged ? ` · Q: ${c.flagged}` : ''}</span></li>; })}</ul>
        </div>); })}
      {!p.experience.some((e) => e.kind === 'job') && <p className="t14 muted" style={{ margin: 0 }}>No work section, because you haven’t had a job yet. That’s normal for a graduate CV; projects and volunteering lead.</p>}
      <div className="ds-actions">
        {!approved && <button type="button" className="ds-btn primary" onClick={() => op('ta.cv.approve')}>Use these lines</button>}
        <button type="button" className="ds-btn" onClick={download}>Download as text</button>
        <button type="button" className="ds-btn quiet" onClick={() => say('help me write my cv')}>Redraft from my profile</button>
      </div>
    </section>
  );
}
