// Entry: sign up (SC-009), verify email (SC-010), choose work mode (SC-011), personalise Q (SC-012),
// plus the home router, candidate home and settings shared by every journey.
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { registerRoute } from './registry';
import { actorOf, discoveryRule, emit, simNow, update, useWorld, type World } from '../mock/world';
import { navigate, Link } from '../ui/router';
import { QMark } from '../ds/QMark';
import { Canvas } from '../ds/Workspace';
import { QHome } from '../screens/QHome';
import { appendQ } from '../q/core/engine';
import { SwitchRow } from '../ds/Switch';
import { arrive } from '../ds/motion';
import '../styles/home.css';
import '../ds/ds.css';

// ---------------- Home sections: journeys add blocks to the home pages ----------------
type Section = { id: string; order: number; when: (w: World) => boolean; render: () => ReactNode };
const sections: Record<'recruiter' | 'candidate', Section[]> = { recruiter: [], candidate: [] };
export const registerHomeSection = (side: 'recruiter' | 'candidate', s: Section) => { if (!sections[side].some((x) => x.id === s.id)) sections[side].push(s); };
const homes: { when: (w: World) => boolean; render: () => ReactNode }[] = [];
/** An area can take over the recruiter home for a kind of organisation (e.g. agencies). */
export const registerRecruiterHome = (when: (w: World) => boolean, render: () => ReactNode) => { homes.push({ when, render }); };

function HomeSections({ side }: { side: 'recruiter' | 'candidate' }) {
  const w = useWorld((x) => x);
  return <>{sections[side].filter((s) => s.when(w)).sort((a, b) => a.order - b.order).map((s) => <div key={s.id}>{s.render()}</div>)}</>;
}

function RecruiterHome() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const custom = homes.find((h) => h.when(w));
  if (custom) return <>{custom.render()}</>;
  if (a.orgId === 'org_kora') return <><QHome /><div style={{ padding: '0 clamp(16px, 2.6vw, 40px) 40px', display: 'grid', gap: 16 }}><HomeSections side="recruiter" /></div></>;
  return (
    <Canvas title={`Welcome, ${a.first}`} kicker="Q · getting started" open onClose={() => {}}>
      <section className="ds-sheet" style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
        <h2 className="voice t24" style={{ margin: 0 }}>Tell Q what’s going on in your business.</h2>
        <p style={{ margin: 0 }}>You don’t need to know any recruiting words. Say it the way you’d say it to a friend: what’s taking your time, what keeps going wrong, what you wish someone could do. Q will help you work out who to hire and set everything up as you go.</p>
        <p className="t14 muted" style={{ margin: 0 }}>Use the conversation on the left (or the “Ask Q” bar on a phone). You can type or speak.</p>
      </section>
      <HomeSections side="recruiter" />
    </Canvas>
  );
}

// Candidate home (creative-direction refresh, L2): personal and encouraging, not a stat dashboard.
// Q speaks first in one line; the next real commitment is the anchor; "where you are" is a path written in
// the person's terms, where "not yet" reads as normal, never as failure.
function CandidateHome() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const pid = a.personId!;
  const prof = w.profiles[pid];
  const apps = w.applications.filter((x) => x.personId === pid);
  const now = simNow(w);
  const next = w.calendar.filter((e) => e.personId === pid && e.status !== 'CANCELLED' && new Date(e.start).getTime() > now.getTime()).sort((x, y) => x.start.localeCompare(y.start))[0];
  const proof = w.evidence.filter((e) => e.ownerId === pid && e.kind !== 'CLAIM' && e.kind !== 'PRACTICE');
  const checked = proof.filter((e) => e.verification === 'VERIFIED' || e.verified).length;
  const answered = prof ? (prof.answered?.length ?? 0) : 0;
  const moving = apps.filter((x) => ['VIEWED', 'INTERVIEW', 'OFFER'].includes(x.status)).length;
  const hour = Number(now.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: a.timezone }));
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const org = next ? w.orgs.find((o) => o.id === next.orgId)?.name : undefined;
  const role = next ? (next.mandateId && w.mandates.find((m) => m.id === next.mandateId)?.title) || (next.mandateId === w.mandate.mandateId ? w.mandate.title : undefined) : undefined;
  const days = next ? Math.round((new Date(next.start).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 864e5) : 0;
  const when = next ? new Date(next.start) : null;
  const tz = { timeZone: a.timezone } as const;
  const qLine = next && days <= 2
    ? `Your interview with ${org ?? 'the employer'} is ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in two days'}. A short practice could help, and only you will see it.`
    : !prof?.done ? (answered ? `Welcome back. You’re ${answered} of 6 parts into your profile; we can carry on whenever you like.` : `Let’s start with you: a few small questions in your own words, and you can skip anything.`)
    : !checked ? 'Your profile is set up. One piece of proof, like a certificate or a project, would make it much stronger.'
    : !apps.length ? 'You’re ready to apply. I can show you the jobs that fit what you’ve shown so far.'
    : moving ? `${moving === 1 ? 'One application is' : `${moving} applications are`} moving. I’ll tell you as soon as anything changes.`
    : 'Your applications are with employers. I’ll tell you as soon as anyone replies.';
  const path = [
    { id: 'me', done: !!prof?.done, title: 'Tell Q about yourself', text: prof?.done ? 'Your profile is set up. You can change it any time.' : answered ? `${answered} of 6 parts done. Pick up where you left off.` : 'A few small questions, in your own words. Skip anything.', to: '/c/welcome', cta: prof?.done ? 'See your profile' : answered ? 'Carry on' : 'Start' },
    { id: 'proof', done: checked > 0, title: 'Show what you can do', text: checked ? `${checked} ${checked === 1 ? 'piece of proof is' : 'pieces of proof are'} checked. Employers trust these most.` : proof.length ? `${proof.length} ${proof.length === 1 ? 'item is' : 'items are'} waiting to be checked.` : 'Add one thing that shows your work: a certificate, a project or a reference.', to: '/c/passport', cta: 'Your Evidence Passport' },
    { id: 'apply', done: apps.length > 0, title: 'Apply when you’re ready', text: apps.length ? `You’ve applied to ${apps.length}. ${moving ? `${moving} ${moving === 1 ? 'is' : 'are'} moving.` : 'No replies yet, which is normal in the first week.'}` : 'No applications yet, and that’s fine. Q will point out jobs that fit you.', to: apps.length ? '/c/applications' : '/c/jobs', cta: apps.length ? 'Your applications' : 'Jobs that fit' },
  ];
  return (
    <Canvas title={`${hello}, ${a.first}`} kicker={now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', ...tz })} open onClose={() => {}}>
      <div className="ch">
        <motion.div className="ch-q" {...arrive}><QMark mood="idle" size={28} /><p className="voice">{qLine}</p></motion.div>
        {next && when && (
          <section className="ds-sheet ch-next" aria-labelledby="ch-next-h">
            <div className="ch-when" aria-hidden="true"><span className="d">{when.toLocaleDateString('en-GB', { weekday: 'short', ...tz })}</span><span className="t">{when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...tz })}</span></div>
            <div className="ch-what">
              <h2 id="ch-next-h" className="voice">Interview{org ? ` with ${org}` : ''}</h2>
              <p>{role ? `${role} · ` : ''}{when.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', ...tz })}</p>
              <div className="ch-acts"><Link className="ds-btn primary" to="/c/interview">Practise first</Link><Link className="ds-btn quiet" to="/c/messages">Details and messages</Link></div>
            </div>
          </section>
        )}
        <section aria-labelledby="ch-path-h" className="ch-pathwrap">
          <h2 id="ch-path-h" className="lab">Where you are</h2>
          <ol className="ch-path">
            {path.map((x) => (
              <li key={x.id} data-done={x.done || undefined}>
                <span className="mark" aria-hidden="true">{x.done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg> : null}</span>
                <div><b>{x.title}</b><span className="sr">{x.done ? ' (done)' : ''}</span><p>{x.text}</p><Link to={x.to} className="ch-link">{x.cta}</Link></div>
              </li>
            ))}
          </ol>
        </section>
        <HomeSections side="candidate" />
      </div>
    </Canvas>
  );
}

registerRoute({ path: '/r/home', side: 'recruiter', label: 'Q home', render: () => <RecruiterHome />, nav: { group: 'Q', label: 'Home', icon: 'home', tab: true, order: 1 } });
registerRoute({ path: '/c/home', side: 'candidate', label: 'Q home', render: () => <CandidateHome />, nav: { group: 'Q', label: 'Home', icon: 'home', tab: true, order: 1 } });

// ---------------- Signup, verify, work mode, personalise ----------------
function Signup() {
  const a = useWorld((w) => actorOf(w));
  const [step, setStep] = useState<'account' | 'verify' | 'mode' | 'q'>(a.signedUp ? 'q' : 'account');
  const [email, setEmail] = useState(a.email);
  const [name, setName] = useState(a.name);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'recruiter' | 'candidate'>(a.side);
  const [prefs, setPrefs] = useState({ plain: a.id === 'u_funmi' || a.id === 'p_grace', voice: a.id !== 'p_grace', proactive: 'NORMAL' as 'OFF' | 'QUIET' | 'NORMAL' });
  const finish = () => {
    update((w) => {
      const me = w.actors.find((x) => x.id === w.session.actor)!;
      me.signedUp = true; me.name = name; me.first = name.split(' ')[0]; me.email = email;
      w.q.prefs[me.id] = { ...w.q.prefs[me.id], ...prefs };
      emit(w, me.id, 'account.created', me.orgId ? `ORG:${me.orgId}` : `PERSON:${me.personId ?? me.id}`, `${me.name} created an account (${mode === 'recruiter' ? 'hiring' : 'looking for work'}).`);
      appendQ(w, me.id, { who: 'q', kind: 'reply', engine: 'system', text: mode === 'recruiter'
        ? `Welcome, ${me.first}. You don’t need to know recruiting terms or fill in forms first. Tell me what’s happening in your business, in your own words, and I’ll help you work out who you need.`
        : `Welcome, ${me.first}. I’ll help you show what you can do and find work that fits. You can upload a CV, chat with me, or fill in a short form. Everything stays private until you choose to share it.`,
        actions: mode === 'recruiter' ? [{ label: 'I need help but I’m not sure who', primary: true, act: { t: 'say', text: 'I need someone to help me with my business but I do not really know what kind of person' } }] : [{ label: 'Set up my profile', primary: true, act: { t: 'nav', to: '/c/welcome' } }, { label: 'I’ve been applying and nobody replies', act: { t: 'say', text: 'I have been applying for jobs and nobody is replying' } }] });
    });
    navigate(mode === 'recruiter' ? '/r/home' : '/c/home');
  };
  return (
    <div className="ds" data-audience={mode === 'candidate' ? 'candidate' : undefined} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <main className="ds-sheet" aria-labelledby="su-h" style={{ width: 'min(520px, 100%)', display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><QMark mood="idle" size={40} /><span className="voice t24">Talent Q</span><span className="ds-sim" style={{ marginLeft: 'auto' }}>Simulated</span></div>
        <ol aria-label="Steps" style={{ display: 'flex', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>{['Account', 'Verify', 'You', 'Q'].map((s, i) => <li key={s} className="t14" style={{ flex: 1, borderTop: `3px solid ${['account', 'verify', 'mode', 'q'].indexOf(step) >= i ? 'var(--ink)' : 'var(--rule)'}`, paddingTop: 6 }}>{s}</li>)}</ol>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} style={{ display: 'grid', gap: 14 }}>
            {step === 'account' && (
              <form style={{ display: 'grid', gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('That email doesn’t look complete. Check for a missing @ or dot.'); return; } setErr(''); setStep('verify'); }}>
                <h1 id="su-h" className="voice t30" style={{ margin: 0 }}>Create your account</h1>
                <div className="ds-field"><label htmlFor="su-name">Your name</label><input id="su-name" className="ds-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
                <div className="ds-field"><label htmlFor="su-email">Email</label><input id="su-email" className="ds-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'su-err' : undefined} autoComplete="email" />{err && <span id="su-err" className="t14" style={{ color: 'var(--risk)' }}>{err}</span>}</div>
                <button type="submit" className="ds-btn primary">Continue</button>
                <button type="button" className="ds-btn" onClick={() => { setErr(''); setStep('mode'); }}>Continue with Google (simulated)</button>
                <p className="t14 muted" style={{ margin: 0 }}>Already have an account? <Link to="/">Sign in</Link></p>
              </form>
            )}
            {step === 'verify' && (
              <form style={{ display: 'grid', gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (code.trim() !== '123456') { setErr('That code doesn’t match. Check the latest email, or send a new code.'); return; } setErr(''); setStep('mode'); }}>
                <h1 id="su-h" className="voice t30" style={{ margin: 0 }}>Check your email</h1>
                <p style={{ margin: 0 }}>We sent a 6-digit code to <b>{email}</b>. <span className="ds-sim">Simulated: the code is 123456</span></p>
                <div className="ds-field"><label htmlFor="su-code">Code</label><input id="su-code" className="ds-input" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'su-err2' : undefined} autoComplete="one-time-code" />{err && <span id="su-err2" className="t14" style={{ color: 'var(--risk)' }} role="alert">{err}</span>}</div>
                <button type="submit" className="ds-btn primary">Verify</button>
                <button type="button" className="ds-btn quiet" onClick={() => { setCode(''); setErr('A new code is on its way (simulated: still 123456).'); }}>Send a new code</button>
              </form>
            )}
            {step === 'mode' && (
              <div style={{ display: 'grid', gap: 12 }}>
                <h1 id="su-h" className="voice t30" style={{ margin: 0 }}>What brings you here?</h1>
                <button type="button" className="ds-opt" aria-pressed={mode === 'recruiter'} onClick={() => setMode('recruiter')}><b>I want to hire someone</b></button>
                <button type="button" className="ds-opt" aria-pressed={mode === 'candidate'} onClick={() => setMode('candidate')}><b>I’m looking for work or want to grow</b></button>
                {mode !== a.side && <p className="t14" role="note" style={{ margin: 0, color: 'var(--warn)' }}>In this demo, {a.first} is on the {a.side === 'recruiter' ? 'hiring' : 'candidate'} side; the other side is shown by a different demo person.</p>}
                <button type="button" className="ds-btn primary" disabled={mode !== a.side} onClick={() => setStep('q')}>Continue</button>
              </div>
            )}
            {step === 'q' && (
              <div style={{ display: 'grid', gap: 12 }}>
                <h1 id="su-h" className="voice t30" style={{ margin: 0 }}>How should Q work with you?</h1>
                <div><SwitchRow label="Use plain, simple words" help="Q avoids jargon and explains any term it has to use." on={prefs.plain} onChange={(v) => setPrefs({ ...prefs, plain: v })} />
                <SwitchRow label="Talk to Q by voice" help="You can always type instead." on={prefs.voice} onChange={(v) => setPrefs({ ...prefs, voice: v })} /></div>
                <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}><legend className="t14" style={{ fontWeight: 600, marginBottom: 6 }}>Should Q suggest things on its own?</legend>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{([['NORMAL', 'Yes, when useful'], ['QUIET', 'Only urgent things'], ['OFF', 'Only when I ask']] as const).map(([v, l]) => <button key={v} type="button" className="ds-filter" aria-pressed={prefs.proactive === v} onClick={() => setPrefs({ ...prefs, proactive: v })}>{l}</button>)}</div></fieldset>
                <button type="button" className="ds-btn primary" onClick={finish}>Start</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
registerRoute({ path: '/signup', side: 'public', bare: true, label: 'sign up', render: () => <Signup /> });

// ---------------- Settings (both sides) ----------------
/** The candidate's discovery rule in plain words (the rule itself is set on the Evidence Passport). */
const findRule = (w: World, pid: string) => {
  if (!w.consents[pid]?.discoverable) return 'Nobody can find you in search. You can still apply, and anyone you’ve shared with keeps what you shared.';
  const r = discoveryRule(w, pid); const hidden = r.hideFrom.map((o) => w.orgs.find((x) => x.id === o)?.name ?? o);
  const base = r.who === 'NOBODY' ? 'Nobody can find you in search.' : r.who === 'VERIFIED_EMPLOYERS' ? 'Only verified employers can find you. Agencies can’t.' : r.who === 'EMPLOYERS_AND_AGENCIES' ? 'Verified employers and agencies can find you.' : 'Anyone hiring can find you. Businesses that aren’t verified yet can only send a few messages a week.';
  return hidden.length ? `${base} Hidden from ${hidden.join(', ')}.` : base;
};
function Settings() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const p = w.q.prefs[a.id];
  const c = a.personId ? w.consents[a.personId] : undefined;
  const setP = (patch: Partial<typeof p>) => update((d) => { d.q.prefs[a.id] = { ...d.q.prefs[a.id], ...patch }; emit(d, a.id, 'settings.changed', a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId}`, `Settings changed: ${Object.keys(patch).join(', ')}.`); });
  const setC = (patch: Partial<NonNullable<typeof c>>) => update((d) => { if (!a.personId) return; d.consents[a.personId] = { ...d.consents[a.personId], ...patch }; emit(d, a.id, 'settings.changed', `PERSON:${a.personId}`, `Privacy or notification settings changed.`); });
  return (
    <Canvas title="Settings" kicker={`${a.name} · ${a.side === 'recruiter' ? 'hiring' : 'candidate'}`} open onClose={() => {}}>
      <section className="ds-sheet" aria-labelledby="st-q" style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
        <h2 id="st-q" className="voice t24" style={{ margin: 0 }}>How Q works with you</h2>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}><legend className="t14" style={{ fontWeight: 600, marginBottom: 6 }}>Suggestions Q makes on its own</legend>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{([['NORMAL', 'When useful'], ['QUIET', 'Only time-sensitive'], ['OFF', 'Only when I ask']] as const).map(([v, l]) => <button key={v} type="button" className="ds-filter" aria-pressed={p.proactive === v} onClick={() => setP({ proactive: v })}>{l}</button>)}</div></fieldset>
        <div><SwitchRow label="Plain, simple words" help="Q avoids jargon and explains any term it has to use." on={p.plain} onChange={(v) => setP({ plain: v })} />
        <SwitchRow label="Voice input" help="Uses your device’s speech recognition when it’s available. You can always type." on={p.voice} onChange={(v) => setP({ voice: v })} /></div>
        <p className="t14 muted" style={{ margin: 0 }}>Snoozed or dismissed suggestions: {w.q.suggestions.filter((s) => s.actor === a.id && s.state !== 'OPEN').length}. <button type="button" className="ds-linkbtn" style={{ color: 'var(--ink-2)' }} onClick={() => update((d) => { d.q.suggestions = d.q.suggestions.filter((s) => s.actor !== a.id); })}>Bring them back</button></p>
      </section>
      {c && (
        <section className="ds-sheet" aria-labelledby="st-n" style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
          <h2 id="st-n" className="voice t24" style={{ margin: 0 }}>Notifications and privacy</h2>
          <div>{([['email', 'Email', 'Updates and messages from employers you’re talking to.'], ['sms', 'Text message (SMS)', 'Only for interviews and anything urgent.'], ['inApp', 'In Talent Q', 'Shown when you open the app.']] as const).map(([k, l, h]) => <SwitchRow key={k} label={l} help={h} on={c.notifications[k]} onChange={(v) => setC({ notifications: { ...c.notifications, [k]: v } })} />)}</div>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}><legend className="t14" style={{ fontWeight: 600, marginBottom: 6 }}>Job digest</legend>
            <div style={{ display: 'flex', gap: 8 }}>{(['DAILY', 'WEEKLY', 'OFF'] as const).map((v) => <button key={v} type="button" className="ds-filter" aria-pressed={c.notifications.digest === v} onClick={() => setC({ notifications: { ...c.notifications, digest: v } })}>{v === 'OFF' ? 'Off' : v[0] + v.slice(1).toLowerCase()}</button>)}</div></fieldset>
          <div className="ds-switchrow"><div className="txt"><b>Who can find you in search</b><span className="t14 muted">{findRule(w, a.personId!)}</span></div><Link className="ds-btn" to="/c/passport?tab=discovery">Change</Link></div>
          <SwitchRow label="Lite mode" help="Fewer images and animations and bigger buttons, for slow connections." on={c.lite} onChange={(v) => setC({ lite: v })} />
          <Link to="/c/memory" className="ds-btn" style={{ justifySelf: 'start' }}>What Q remembers about me</Link>
        </section>
      )}
    </Canvas>
  );
}
registerRoute({ path: '/settings', side: 'both', label: 'settings', render: () => <Settings />, nav: { group: 'You', label: 'Settings', icon: 'org', order: 90 } });
