// Entry: sign up (SC-009), verify email (SC-010), choose work mode (SC-011), personalise Q (SC-012),
// plus the home router, candidate home and settings shared by every journey.
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { registerRoute } from './registry';
import { actorOf, emit, simNow, update, useWorld, type World } from '../mock/world';
import { navigate, Link } from '../ui/router';
import { QMark } from '../ds/QMark';
import { Canvas } from '../ds/Workspace';
import { Glyph } from '../ds/Glyph';
import { QHome } from '../screens/QHome';
import { appendQ } from '../q/core/engine';
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

function CandidateHome() {
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const pid = a.personId!;
  const prof = w.profiles[pid];
  const apps = w.applications.filter((x) => x.personId === pid);
  const t = simNow(w).getTime();
  const next = w.calendar.filter((e) => e.personId === pid && e.status !== 'CANCELLED' && new Date(e.start).getTime() > t).sort((x, y) => x.start.localeCompare(y.start))[0];
  const passport = w.evidence.filter((e) => e.ownerId === pid);
  return (
    <Canvas title={`Hello, ${a.first}`} kicker="Q · your day" open onClose={() => {}}>
      <section className="ds-sheet" aria-label="Your day" style={{ display: 'grid', gap: 18, maxWidth: 820 }}>
        {next && (
          <div className="ds-banner"><Glyph k="full" /><span><b>Interview {new Date(next.start).toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: a.timezone })}</b> · {next.title.replace('Interview: ', '')}</span><Link className="ds-btn" to="/c/interview">Prepare</Link></div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
          {[
            { k: 'Profile', v: prof?.done ? 'Set up' : a.signedUp ? 'Not finished' : 'Not started', to: '/c/welcome' },
            { k: 'Evidence Passport', v: `${passport.filter((e) => e.kind !== 'CLAIM' && e.kind !== 'PRACTICE').length} proof · ${passport.filter((e) => e.kind === 'CLAIM').length} claims`, to: '/c/passport' },
            { k: 'Applications', v: apps.length ? `${apps.length} · ${apps.filter((x) => ['VIEWED', 'INTERVIEW', 'OFFER'].includes(x.status)).length} active` : 'None yet', to: '/c/applications' },
          ].map((x) => <Link key={x.k} to={x.to} style={{ background: 'var(--paper)', borderRadius: 14, padding: 14, textDecoration: 'none', color: 'var(--ink)', display: 'grid', gap: 4 }}><span className="t14 muted">{x.k}</span><b>{x.v}</b></Link>)}
        </div>
        <HomeSections side="candidate" />
      </section>
    </Canvas>
  );
}

registerRoute({ path: '/r/home', side: 'recruiter', label: 'Q home', render: () => <RecruiterHome />, nav: { group: 'Q', label: 'Home', icon: 'q', tab: true, order: 1 } });
registerRoute({ path: '/c/home', side: 'candidate', label: 'Q home', render: () => <CandidateHome />, nav: { group: 'Q', label: 'Home', icon: 'q', tab: true, order: 1 } });

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
                <button type="button" className="ds-opt" aria-pressed={prefs.plain} onClick={() => setPrefs({ ...prefs, plain: !prefs.plain })}><span><b>Use plain, simple words</b><span className="t14 muted" style={{ display: 'block' }}>Q avoids jargon and explains any term it has to use.</span></span></button>
                <button type="button" className="ds-opt" aria-pressed={prefs.voice} onClick={() => setPrefs({ ...prefs, voice: !prefs.voice })}><span><b>Let me talk to Q by voice</b><span className="t14 muted" style={{ display: 'block' }}>You can always type instead.</span></span></button>
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
        <button type="button" className="ds-opt" aria-pressed={p.plain} onClick={() => setP({ plain: !p.plain })}><span><b>Plain, simple words</b></span></button>
        <button type="button" className="ds-opt" aria-pressed={p.voice} onClick={() => setP({ voice: !p.voice })}><span><b>Voice input</b><span className="t14 muted" style={{ display: 'block' }}>Uses your device’s speech recognition when available.</span></span></button>
        <p className="t14 muted" style={{ margin: 0 }}>Snoozed or dismissed suggestions: {w.q.suggestions.filter((s) => s.actor === a.id && s.state !== 'OPEN').length}. <button type="button" className="ds-linkbtn" style={{ color: 'var(--ink-2)' }} onClick={() => update((d) => { d.q.suggestions = d.q.suggestions.filter((s) => s.actor !== a.id); })}>Bring them back</button></p>
      </section>
      {c && (
        <section className="ds-sheet" aria-labelledby="st-n" style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
          <h2 id="st-n" className="voice t24" style={{ margin: 0 }}>Notifications and privacy</h2>
          {([['email', 'Email'], ['sms', 'Text message (SMS)'], ['inApp', 'In Talent Q']] as const).map(([k, l]) => <button key={k} type="button" className="ds-opt" aria-pressed={c.notifications[k]} onClick={() => setC({ notifications: { ...c.notifications, [k]: !c.notifications[k] } })}><b>{l}</b></button>)}
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}><legend className="t14" style={{ fontWeight: 600, marginBottom: 6 }}>Job digest</legend>
            <div style={{ display: 'flex', gap: 8 }}>{(['DAILY', 'WEEKLY', 'OFF'] as const).map((v) => <button key={v} type="button" className="ds-filter" aria-pressed={c.notifications.digest === v} onClick={() => setC({ notifications: { ...c.notifications, digest: v } })}>{v === 'OFF' ? 'Off' : v[0] + v.slice(1).toLowerCase()}</button>)}</div></fieldset>
          <button type="button" className="ds-opt" aria-pressed={c.discoverable} onClick={() => setC({ discoverable: !c.discoverable })}><span><b>Let verified employers find my profile</b><span className="t14 muted" style={{ display: 'block' }}>They see only what you’ve shared publicly. Off means you can still apply.</span></span></button>
          <button type="button" className="ds-opt" aria-pressed={c.lite} onClick={() => setC({ lite: !c.lite })}><span><b>Lite mode</b><span className="t14 muted" style={{ display: 'block' }}>Fewer images and animations, bigger buttons, for slow connections.</span></span></button>
          <Link to="/c/memory" className="ds-btn" style={{ justifySelf: 'start' }}>What Q remembers about me</Link>
        </section>
      )}
    </Canvas>
  );
}
registerRoute({ path: '/settings', side: 'both', label: 'settings', render: () => <Settings />, nav: { group: 'You', label: 'Settings', icon: 'org', order: 90 } });
