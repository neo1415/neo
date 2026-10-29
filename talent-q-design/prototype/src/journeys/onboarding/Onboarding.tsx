// SC-061 welcome · SC-062 CV ingestion · SC-063 conversational onboarding · SC-064 structured profile ·
// SC-065 experience claims editor · SC-066 skills editor. Candidate-facing, so warmer (data-audience=candidate)
// and personal, but held to the same rule: what a CV or a conversation says is a claim, not evidence.
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { navigate } from '../../ui/router';
import { Glyph } from '../../ds/Glyph';
import { moodOf, type QAgent } from '../../ds/QMark';
import { Canvas, Split, Thread, useNarrow, type Entry } from '../../ds/Workspace';
import { PERSONAS, blankProfile, ingest, setProfile, useProfile, type Claim, type Profile, type SkillItem, type Track } from '../../services/profile';

type View = 'start' | 'found' | 'profile' | 'experience' | 'skills' | 'done';
const STEPS: { id: View; label: string }[] = [{ id: 'start', label: 'Start' }, { id: 'found', label: 'What Q found' }, { id: 'profile', label: 'About you' }, { id: 'experience', label: 'Experience' }, { id: 'skills', label: 'Skills' }, { id: 'done', label: 'Ready' }];
const TRACKS: { id: Track; label: string; line: string }[] = [
  { id: 'graduate', label: 'I’ve just finished studying', line: 'Q helps you show what you can do without years of job titles.' },
  { id: 'switcher', label: 'I’m changing careers', line: 'Q helps translate what you’ve done into the language of the new field.' },
  { id: 'experienced', label: 'I’m experienced in my field', line: 'Q helps you prove depth and keep control of who sees what.' },
];

export function Onboarding() {
  const p = useProfile((x) => x);
  const narrow = useNarrow();
  const [view, setView] = useState<View>(p.done ? 'done' : p.step >= 2 ? (['found', 'found', 'found', 'profile', 'experience', 'skills', 'done'] as View[])[p.step] : 'start');
  const [open, setOpen] = useState(false);
  const [parse, setParse] = useState<{ agents: QAgent[]; error?: { message: string; recover: string[] } } | null>(null);
  const persona = p.track ? PERSONAS[p.track] : null;
  const first = (persona?.name ?? '').split(' ')[0];
  const show = (v: View) => { setView(v); if (narrow) setOpen(true); };

  const chooseTrack = (t: Track) => setProfile((x) => ({ ...x, track: t, name: PERSONAS[t].name, location: PERSONAS[t].location, step: 1 }));
  const read = async (file: 'pdf' | 'scan') => {
    if (!p.track) return;
    setProfile((x) => ({ ...x, method: 'cv' }));
    const agents: QAgent[] = [{ label: 'Reading the file', done: 0, total: 2 }, { label: 'Finding your experience', done: 0, total: PERSONAS[p.track].experience.length }, { label: 'Finding skills you mention', done: 0, total: PERSONAS[p.track].skills.length }, { label: 'Checking dates line up', done: 0, total: 1 }];
    setParse({ agents }); show('found');
    const idx = { read: 0, experience: 1, skills: 2, dates: 3 } as const;
    const r = await ingest.parse(p.track, file, (e) => setParse((s) => s && { ...s, agents: s.agents.map((a, i) => (i === idx[e.stage] ? { ...a, done: e.done } : a)) }));
    if (!r.ok) { setParse((s) => s && { agents: s.agents.map((a, i) => (i === 0 ? { ...a, failed: true } : a)), error: { message: r.message, recover: r.recover } }); return; }
    setParse(null);
    setProfile((x) => ({ ...x, experience: r.experience, skills: r.skills, step: 2 }));
  };
  const talk = () => { setParse(null); setProfile((x) => ({ ...x, method: 'talk', experience: structuredClone(PERSONAS[x.track!].experience).map((e) => ({ ...e, claims: e.claims.map((c) => ({ ...c, source: 'CONVERSATION' as const })) })), skills: structuredClone(PERSONAS[x.track!].skills), step: 2 })); show('found'); };
  const answer = (qid: string, a: string) => {
    setProfile((x) => {
      const answers = { ...x.answers, [qid]: a };
      const n = Object.keys(answers).length;
      const skills = qid === 'tools' && /SQL/.test(a) && !x.skills.some((s) => s.label === 'SQL (basic)') ? [...x.skills, { id: 'sq', label: 'SQL (basic)', state: 'claimed' as const, note: 'You said so in conversation' }] : x.skills;
      return { ...x, answers, skills, step: n >= 2 ? 3 : x.step };
    });
  };
  const allAnswered = persona ? persona.questions.every((q) => p.answers[q.id]) : false;

  const entries = useMemo<Entry[]>(() => {
    const e: Entry[] = [{ id: 'hi', who: 'q', text: 'Hi, I’m Q. I’ll help you build a profile that shows what you can do, not just what you say. Everything stays private until you choose to share it. Where are you starting from?',
      chips: !p.track ? TRACKS.map((t, i) => ({ label: t.label, go: i === 0, on: () => chooseTrack(t.id) })) : undefined }];
    if (!p.track || !persona) return e;
    e.push({ id: 'track', who: 'me', text: TRACKS.find((t) => t.id === p.track)!.label });
    e.push({ id: 'how', who: 'q', text: `${TRACKS.find((t) => t.id === p.track)!.line} How would you like to begin? A CV is quickest; talking it through works just as well.`,
      chips: p.step === 1 && !parse ? [{ label: `Upload ${persona.file}`, go: true, on: () => read('pdf') }, { label: 'Upload a phone photo of my CV', on: () => read('scan') }, { label: 'Talk it through with Q', on: talk }, { label: 'Fill in a form', on: () => { setProfile((x) => ({ ...x, method: 'form', step: 3 })); show('profile'); } }] : undefined });
    if (parse?.error) {
      e.push({ id: 'err', who: 'q', plan: parse.agents, text: `${parse.error.message} Nothing was saved from it. What would you like to do?`,
        chips: [{ label: `Upload ${persona.file} instead`, go: true, on: () => read('pdf') }, { label: 'Talk it through with Q', on: talk }, { label: 'Fill in a form', on: () => { setParse(null); setProfile((x) => ({ ...x, method: 'form', step: 3 })); show('profile'); } }] });
      return e;
    }
    if (parse) { e.push({ id: 'parse', who: 'q', plan: parse.agents, live: true, text: 'Reading your CV. I’ll show you everything I take from it before anything is saved.' }); return e; }
    if (p.step < 2) return e;
    const n = p.experience.reduce((a, x) => a + x.claims.length, 0);
    e.push({ id: 'found', who: 'q', used: [p.method === 'cv' ? persona.file : 'Our conversation'], text: `I found ${p.experience.length} roles and ${n} things you say you did. They’re listed as claims, in your words. Two need a quick check. A few questions first:`, why: 'Shown as claims: what you say, before any proof' });
    persona.questions.forEach((q) => {
      e.push({ id: `q-${q.id}`, who: 'q', text: q.ask, chips: !p.answers[q.id] ? q.options.map((o, i) => ({ label: o, go: i === 0, on: () => answer(q.id, o) })) : undefined });
      if (p.answers[q.id]) e.push({ id: `a-${q.id}`, who: 'me', text: p.answers[q.id] });
      if (!p.answers[q.id]) return;
    });
    if (!allAnswered) return e.slice(0, e.findIndex((x) => x.id.startsWith('q-') && !p.answers[x.id.slice(2)]) + 1);
    e.push({ id: 'next', who: 'q', text: `Thanks, ${first}. Next, check the basics, then tidy your claims and skills. You can stop at any point; I’ll keep your place.`,
      chips: p.done ? [{ label: 'Open my career atlas', go: true, on: () => navigate('/c/career') }, { label: 'Open my Evidence Passport', on: () => navigate('/c/passport') }]
        : [{ label: view === 'profile' ? 'Go to experience' : view === 'experience' ? 'Go to skills' : view === 'skills' ? 'Finish' : 'Check the basics', go: true, on: () => { const nx: View = view === 'profile' ? 'experience' : view === 'experience' ? 'skills' : view === 'skills' ? 'done' : 'profile'; if (nx === 'done') setProfile((x) => ({ ...x, done: true, step: 6 })); show(nx); } }] });
    if (p.done) e.push({ id: 'ready', who: 'q', text: `Your profile is ready and private. ${p.skills.filter((s) => s.state === 'evidenced').length} skills already have evidence; the rest are claims you can back up with practice, work samples or credentials.` });
    return e;
  }, [p, parse, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const agents = parse?.agents ?? [];
  const mood = moodOf({ agents, blocked: !!parse?.error, waiting: p.step === 2 && !allAnswered, done: p.done });
  const views = STEPS.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.label}`, ready: s.id === 'start' || (s.id === 'found' ? p.step >= 2 || !!parse : s.id === 'done' ? p.done : p.step >= 3) }));
  return (
    <Split id="onboarding"
      thread={<Thread title="Getting started" entries={entries} agents={agents} busy={parse?.error ? false : undefined} mood={mood} detail={parse?.error ? 'Couldn’t read that file' : undefined} placeholder="Tell Q about yourself"
        onSend={(t) => { if (p.step === 2 && persona) { const q = persona.questions.find((x) => !p.answers[x.id]); if (q) answer(q.id, t); } }} />}
      canvas={
        <Canvas title={view === 'start' ? (p.track ? `Welcome, ${first}` : 'Welcome to Talent Q') : STEPS.find((s) => s.id === view)!.label} kicker="Your profile · private" views={views} view={view} setView={setView}
          open={open} onClose={() => setOpen(false)} qLine={[...entries].reverse().find((x) => x.who === 'q' && x.text)?.text}
          aside={p.track ? <button type="button" className="ds-btn quiet" onClick={() => { if (confirm('Start onboarding again? Your answers here will be cleared.')) { setProfile(() => blankProfile()); setParse(null); setView('start'); } }}>Start again</button> : null}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view + (parse ? 'p' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
              {view === 'start' && <Welcome p={p} onTrack={chooseTrack} onCv={() => read('pdf')} onTalk={talk} />}
              {view === 'found' && <Found p={p} parse={parse} />}
              {view === 'profile' && <About p={p} onNext={() => show('experience')} />}
              {view === 'experience' && <ExperienceEditor p={p} onNext={() => show('skills')} />}
              {view === 'skills' && <SkillsEditor p={p} onNext={() => { setProfile((x) => ({ ...x, done: true, step: 6 })); show('done'); }} />}
              {view === 'done' && <Done p={p} />}
            </motion.div>
          </AnimatePresence>
        </Canvas>
      } />
  );
}

function Welcome({ p, onTrack, onCv, onTalk }: { p: Profile; onTrack: (t: Track) => void; onCv: () => void; onTalk: () => void }) {
  return (
    <section className="ds-sheet" aria-labelledby="w-h" style={{ display: 'grid', gap: 20, maxWidth: 820 }}>
      <h2 id="w-h" className="voice t24" style={{ margin: 0 }}>Show what you can do. Keep control of who sees it.</h2>
      <div role="group" aria-label="Where are you starting from?" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
        {TRACKS.map((t) => (
          <button key={t.id} type="button" className="ds-opt" aria-pressed={p.track === t.id} onClick={() => onTrack(t.id)} style={{ flexDirection: 'column', gap: 6 }}>
            <b>{t.label}</b><span className="t14 muted">{t.line}</span>
          </button>
        ))}
      </div>
      {p.track && (
        <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={onCv}>Upload my CV</button><button type="button" className="ds-btn" onClick={onTalk}>Talk it through</button><span className="t14 muted">Sample file: {PERSONAS[p.track].file} (simulated upload)</span></div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }} aria-label="Promises">
        {['Private by default. You choose each employer who sees anything.', 'A CV is a list of claims. Proof comes from work samples, assessments and verified credentials.', 'You can export or delete everything, any time.'].map((t) => <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><Glyph k="verified" size={18} /><span>{t}</span></li>)}
      </ul>
    </section>
  );
}

const SOURCE: Record<Claim['source'], string> = { CV: 'From your CV', CONVERSATION: 'From our conversation', YOU: 'Added by you' };
function Found({ p, parse }: { p: Profile; parse: { agents: QAgent[]; error?: { message: string; recover: string[] } } | null }) {
  if (parse?.error) return (
    <section className="ds-sheet" style={{ display: 'grid', gap: 12 }} aria-labelledby="f-err">
      <h2 id="f-err" className="voice t24" style={{ margin: 0 }}>I couldn’t read that file.</h2>
      <p style={{ margin: 0 }}>{parse.error.message} Nothing from it was saved.</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>{parse.error.recover.map((r) => <li key={r}>{r}</li>)}</ul>
    </section>
  );
  if (parse) return (
    <section className="ds-sheet" style={{ display: 'grid', gap: 14 }} aria-busy="true" aria-labelledby="f-load">
      <h2 id="f-load" className="voice t24" style={{ margin: 0 }}>Reading… nothing is saved until you check it.</h2>
      {[0.6, 0.9, 0.75, 0.5].map((w, i) => <div key={i} className="ds-skeleton" style={{ height: 18, width: `${w * 100}%` }} />)}
    </section>
  );
  return (
    <section className="ds-sheet" aria-labelledby="f-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="f-h" className="voice t24" style={{ margin: 0 }}>{p.experience.length} roles, {p.experience.reduce((a, x) => a + x.claims.length, 0)} claims. Two need your eye.</h2>
      {p.experience.map((x) => (
        <article key={x.id} style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--rule)', paddingTop: 12 }}>
          <div><b>{x.title}</b> <span className="muted">· {x.org} · {x.when}</span></div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {x.claims.map((c) => <li key={c.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10 }}><Glyph k="none" title="Claim" /><span>{c.text}<span className="t14 muted" style={{ display: 'block' }}>{SOURCE[c.source]} · {c.confidence === 'sure' ? 'read clearly' : 'please check'}{c.flagged ? ` · ${c.flagged}` : ''}</span></span></li>)}
          </ul>
        </article>
      ))}
    </section>
  );
}

function About({ p, onNext }: { p: Profile; onNext: () => void }) {
  const [touched, setTouched] = useState(false);
  const err = touched && !p.location.trim() ? 'Add a city, or “Remote only”, so Q can match roles you can actually take.' : '';
  return (
    <form className="ds-sheet" aria-labelledby="a-h" style={{ display: 'grid', gap: 16, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); setTouched(true); if (p.location.trim()) onNext(); }}>
      <h2 id="a-h" className="voice t24" style={{ margin: 0 }}>The basics. Change any of it later.</h2>
      <div className="ds-field"><label htmlFor="pf-name">Name</label><input id="pf-name" className="ds-input" value={p.name} onChange={(e) => setProfile((x) => ({ ...x, name: e.target.value }))} autoComplete="name" /></div>
      <div className="ds-field"><label htmlFor="pf-loc">Where you can work from</label><input id="pf-loc" className="ds-input" value={p.location} aria-invalid={!!err} aria-describedby={err ? 'pf-loc-err' : undefined} onChange={(e) => setProfile((x) => ({ ...x, location: e.target.value }))} />{err && <span id="pf-loc-err" className="t14" style={{ color: 'var(--risk)' }}>{err}</span>}</div>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}><legend className="t14" style={{ fontWeight: 600, marginBottom: 6 }}>How you’d like to work</legend>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(['remote', 'hybrid', 'onsite'] as const).map((m) => <button key={m} type="button" className="ds-filter" aria-pressed={p.workMode === m} onClick={() => setProfile((x) => ({ ...x, workMode: m }))}>{m[0].toUpperCase() + m.slice(1)}</button>)}</div></fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}><legend className="t14" style={{ fontWeight: 600, marginBottom: 6 }}>Who can see your profile</legend>
        {([['private', 'Only me (recommended to start)'], ['employers-i-choose', 'Employers I choose, one at a time']] as const).map(([v, l]) => <button key={v} type="button" className="ds-opt" aria-pressed={p.visibility === v} onClick={() => setProfile((x) => ({ ...x, visibility: v }))}>{l}</button>)}</fieldset>
      <div className="ds-actions"><button type="submit" className="ds-btn primary">Save and continue</button></div>
    </form>
  );
}

function ExperienceEditor({ p, onNext }: { p: Profile; onNext: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const fix = (xid: string, cid: string, text: string) => setProfile((x) => ({ ...x, experience: x.experience.map((e) => (e.id === xid ? { ...e, claims: e.claims.map((c) => (c.id === cid ? { ...c, text, flagged: undefined, confidence: 'sure', source: 'YOU' } : c)) } : e)) }));
  const remove = (xid: string, cid: string) => setProfile((x) => ({ ...x, experience: x.experience.map((e) => (e.id === xid ? { ...e, claims: e.claims.filter((c) => c.id !== cid) } : e)) }));
  const flagged = p.experience.flatMap((e) => e.claims).filter((c) => c.flagged).length;
  return (
    <section className="ds-sheet" aria-labelledby="x-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="x-h" className="voice t24" style={{ margin: 0 }}>{flagged ? `${flagged} ${flagged === 1 ? 'claim is' : 'claims are'} vague. A number makes it believable.` : 'Every claim is clear. Next, back the strongest ones with evidence.'}</h2>
      {p.experience.map((x) => (
        <article key={x.id} style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--rule)', paddingTop: 12 }}>
          <div><b>{x.title}</b> <span className="muted">· {x.org} · {x.when}</span></div>
          {x.claims.map((c) => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 10, alignItems: 'start' }}>
              <Glyph k="none" title="Claim, not yet evidenced" />
              {editing === c.id ? (
                <form onSubmit={(e) => { e.preventDefault(); fix(x.id, c.id, draft); setEditing(null); }} style={{ display: 'grid', gap: 8 }}>
                  <label htmlFor={`ed-${c.id}`} className="sr">Edit claim</label>
                  <input id={`ed-${c.id}`} className="ds-input" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                  <div className="ds-actions"><button type="submit" className="ds-btn primary">Save</button><button type="button" className="ds-btn quiet" onClick={() => setEditing(null)}>Cancel</button></div>
                </form>
              ) : (
                <span>{c.text}{c.flagged && <span className="ds-note" style={{ display: 'block' }}>Q: {c.flagged}</span>}<span className="t14 muted" style={{ display: 'block' }}>{SOURCE[c.source]} · claim · add evidence from your Passport later</span></span>
              )}
              {editing !== c.id && <span style={{ display: 'flex', gap: 4 }}><button type="button" className="ds-btn quiet" onClick={() => { setEditing(c.id); setDraft(c.flagged && c.text.startsWith('Improved') ? 'Cut the weekly trade report from 2 days to 3 hours with a shared dashboard' : c.text); }} aria-label={`Edit: ${c.text}`}>Edit</button><button type="button" className="ds-btn quiet" onClick={() => remove(x.id, c.id)} aria-label={`Remove: ${c.text}`}>Remove</button></span>}
            </div>
          ))}
        </article>
      ))}
      <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={onNext}>Continue to skills</button></div>
    </section>
  );
}

function SkillsEditor({ p, onNext }: { p: Profile; onNext: () => void }) {
  const [add, setAdd] = useState('');
  const set = (id: string, f: (s: SkillItem) => SkillItem | null) => setProfile((x) => ({ ...x, skills: x.skills.map((s) => (s.id === id ? f(s) : s)).filter(Boolean) as SkillItem[] }));
  const g = (s: SkillItem) => (s.state === 'evidenced' ? 'full' : s.state === 'suggested' ? 'unclear' : 'none') as 'full' | 'unclear' | 'none';
  return (
    <section className="ds-sheet" aria-labelledby="s-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="s-h" className="voice t24" style={{ margin: 0 }}>{p.skills.filter((s) => s.state === 'evidenced').length} skills have evidence. The rest are claims until you show them.</h2>
      <ul aria-label="Key" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', listStyle: 'none', margin: 0, padding: 0 }} className="t14">
        <li style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Glyph k="full" size={16} />Evidenced (from your Passport)</li><li style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Glyph k="none" size={16} />Claimed by you</li><li style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Glyph k="unclear" size={16} />Suggested by Q: not added until you confirm</li>
      </ul>
      {!p.skills.length && <p className="muted">No skills yet. Add the first one below.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {p.skills.map((s) => (
          <li key={s.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 10, alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--rule)' }}>
            <Glyph k={g(s)} title={s.state} />
            <span><b style={{ fontWeight: 600 }}>{s.label}</b>{s.note && <span className="t14 muted" style={{ display: 'block' }}>{s.note}</span>}</span>
            {s.state === 'suggested' ? <span style={{ display: 'flex', gap: 4 }}><button type="button" className="ds-btn" onClick={() => set(s.id, (x) => ({ ...x, state: 'claimed', note: 'Confirmed by you · claim' }))}>It’s true, add it</button><button type="button" className="ds-btn quiet" onClick={() => set(s.id, () => null)}>Not me</button></span>
              : s.state === 'claimed' ? <button type="button" className="ds-btn quiet" onClick={() => set(s.id, () => null)} aria-label={`Remove ${s.label}`}>Remove</button> : <span className="ds-tag" data-k="ok">Evidence on file</span>}
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (!add.trim()) return; setProfile((x) => ({ ...x, skills: [...x.skills, { id: `s${Date.now()}`, label: add.trim(), state: 'claimed', note: 'Added by you · claim' }] })); setAdd(''); }} style={{ display: 'flex', gap: 8 }}>
        <label htmlFor="sk-add" className="sr">Add a skill</label><input id="sk-add" className="ds-input" value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add a skill, e.g. Excel pivot tables" /><button type="submit" className="ds-btn">Add</button>
      </form>
      <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={onNext}>Finish</button></div>
    </section>
  );
}

function Done({ p }: { p: Profile }) {
  const claims = p.experience.reduce((a, x) => a + x.claims.length, 0);
  return (
    <section className="ds-sheet" aria-labelledby="d-h" style={{ display: 'grid', gap: 16, maxWidth: 760 }}>
      <h2 id="d-h" className="voice t30" style={{ margin: 0 }}>You’re set up, {p.name.split(' ')[0]}. Nothing is shared.</h2>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: 0 }}>
        {[[String(p.experience.length), 'roles'], [String(claims), 'claims, in your words'], [String(p.skills.filter((s) => s.state === 'evidenced').length), 'skills with evidence'], ['0', 'employers who can see you']].map(([n, l]) => <div key={l} style={{ background: 'var(--paper)', borderRadius: 14, padding: 14 }}><dt className="t14 muted">{l}</dt><dd className="num voice t30" style={{ margin: 0 }}>{n}</dd></div>)}
      </dl>
      <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => navigate('/c/career')}>See where you could go</button><button type="button" className="ds-btn" onClick={() => navigate('/c/passport')}>Add evidence</button></div>
    </section>
  );
}
