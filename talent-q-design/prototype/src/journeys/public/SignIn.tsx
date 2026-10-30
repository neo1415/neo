// SC-008 · Sign in. Email code (passwordless), Google and Microsoft, all SIMULATED and labelled.
// It signs in a member of the demo cast and routes them to the right home (/r/home or /c/home; agencies get
// their own home through the recruiter home). States: ready, loading ("sending", "waiting for Google"),
// error (email format, unknown email, wrong code, cancelled), permission denied (an organisation that requires
// Microsoft), unfinished account (continue sign-up), and a list alternative for the account chooser.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, navigate } from '../../ui/router';
import { QMark } from '../../ds/QMark';
import { DUR, EASE } from '../../ds/motion';
import { emit, now, update, useWorld, type World } from '../../mock/world';
import type { Actor } from '../../state/domain';
import { domainOf, pub, SSO_ONLY, type AuthMethod } from '../../state/areas/public';
import { Site } from './Site';

type Step = { s: 'start' } | { s: 'sending' } | { s: 'code'; actor: string } | { s: 'choose'; provider: 'GOOGLE' | 'MICROSOFT' } | { s: 'waiting'; provider: 'GOOGLE' | 'MICROSOFT'; actor: string };
const PROVIDER = { GOOGLE: 'Google', MICROSOFT: 'Microsoft' } as const;
const homeOf = (a: Actor) => (a.side === 'recruiter' ? '/r/home' : '/c/home');

/** Sign the actor in (simulated) and go to their home. An account that never finished sign-up continues it. */
function signIn(id: string, method: AuthMethod) {
  let to = '/signup';
  update((w: World) => {
    const a = w.actors.find((x) => x.id === id)!;
    w.session.actor = id;
    if (!a.signedUp) return;
    pub(w).signIns.push({ actor: id, method, at: now() });
    emit(w, id, 'auth.signed_in', a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId ?? id}`, `${a.name} signed in with ${method === 'EMAIL_CODE' ? 'an email code' : PROVIDER[method]} (simulated).`, { method });
    to = homeOf(a);
  });
  navigate(to);
}

export function SignIn() {
  const actors = useWorld((w) => w.actors.filter((a) => a.journey || a.orgId));
  const [step, setStep] = useState<Step>({ s: 'start' });
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<{ kind: 'format' | 'unknown' | 'sso' | 'code' | 'cancel' | 'unfinished'; text: string; actor?: string } | null>(null);
  const [demo, setDemo] = useState(false);

  const sendCode = () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setErr({ kind: 'format', text: 'That email doesn’t look complete. Check for a missing @ or dot.' });
    const sso = SSO_ONLY[domainOf(e)];
    if (sso) return setErr({ kind: 'sso', text: `${sso.orgName} asks its team to sign in with Microsoft, so email codes are turned off for ${domainOf(e)}. This is a simulated organisation rule.` });
    const a = actors.find((x) => x.email.toLowerCase() === e);
    if (!a) return setErr({ kind: 'unknown', text: 'No Talent Q account uses that email. Check the spelling, or create an account.' });
    if (!a.signedUp) return setErr({ kind: 'unfinished', text: `${a.first}, you started creating an account but didn’t finish. Carry on where you left off.`, actor: a.id });
    setErr(null); setStep({ s: 'sending' });
    setTimeout(() => setStep({ s: 'code', actor: a.id }), 500);
  };
  const checkCode = (actor: string) => {
    if (code.trim() !== '123456') return setErr({ kind: 'code', text: 'That code doesn’t match. Check the latest email, or send a new code.' });
    setErr(null); signIn(actor, 'EMAIL_CODE');
  };
  const pick = (provider: 'GOOGLE' | 'MICROSOFT', id: string) => { setErr(null); setStep({ s: 'waiting', provider, actor: id }); setTimeout(() => signIn(id, provider), 600); };
  const choosable = (p: 'GOOGLE' | 'MICROSOFT') => actors.filter((a) => (p === 'MICROSOFT' ? !!a.orgId : !SSO_ONLY[domainOf(a.email)]));
  const codeActor = step.s === 'code' ? actors.find((a) => a.id === step.actor) : undefined;

  return (
    <Site dock={false}>
      <div className="si-wrap">
        <section className="ds-sheet si-card" aria-labelledby="si-h">
          <div className="si-top"><QMark size={36} mood={step.s === 'sending' || step.s === 'waiting' ? 'thinking' : 'idle'} /><span className="ds-sim">Simulated sign-in</span></div>
          <AnimatePresence mode="wait">
            <motion.div key={step.s} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0, transition: { duration: DUR.normal, ease: EASE.enter } }} exit={{ opacity: 0, x: -12, transition: { duration: DUR.fast, ease: EASE.exit } }} className="si-body">
              {(step.s === 'start' || step.s === 'sending') && (
                <>
                  <h1 id="si-h" className="voice t30">Sign in to Talent Q</h1>
                  <form className="si-form" noValidate onSubmit={(e) => { e.preventDefault(); sendCode(); }}>
                    <div className="ds-field"><label htmlFor="si-email">Email</label>
                      <input id="si-email" className="ds-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (err) setErr(null); }} autoComplete="email" aria-invalid={!!err && err.kind !== 'cancel'} aria-describedby={err ? 'si-err' : 'si-help'} />
                      <span id="si-help" className="t14 muted">We’ll email you a 6-digit code. No password to remember.</span></div>
                    {err && (
                      <div id="si-err" className="si-err" role="alert" data-k={err.kind}>
                        <p>{err.text}</p>
                        {err.kind === 'unknown' && <Link to="/signup" className="ds-btn">Create an account</Link>}
                        {err.kind === 'sso' && <button type="button" className="ds-btn" onClick={() => { setErr(null); setStep({ s: 'choose', provider: 'MICROSOFT' }); }}>Continue with Microsoft</button>}
                        {err.kind === 'unfinished' && <button type="button" className="ds-btn" onClick={() => signIn(err.actor!, 'EMAIL_CODE')}>Finish creating my account</button>}
                      </div>
                    )}
                    <button type="submit" className="ds-btn primary" disabled={step.s === 'sending'}>{step.s === 'sending' ? 'Sending code…' : 'Email me a code'}</button>
                  </form>
                  <div className="si-or" aria-hidden="true"><span>or</span></div>
                  <div className="si-providers">
                    <button type="button" className="ds-btn" onClick={() => { setErr(null); setStep({ s: 'choose', provider: 'GOOGLE' }); }}>Continue with Google <span className="ds-sim">Simulated</span></button>
                    <button type="button" className="ds-btn" onClick={() => { setErr(null); setStep({ s: 'choose', provider: 'MICROSOFT' }); }}>Continue with Microsoft <span className="ds-sim">Simulated</span></button>
                  </div>
                  <p className="t14 muted si-new">New to Talent Q? <Link to="/signup">Create an account</Link></p>
                  <details className="si-demo" open={demo} onToggle={(e) => setDemo((e.target as HTMLDetailsElement).open)}>
                    <summary>Demo emails (fictional people)</summary>
                    <ul>{actors.map((a) => <li key={a.id}><button type="button" className="ds-linkbtn" onClick={() => { setEmail(a.email); setErr(null); }}>{a.email}</button> <span className="t14 muted">{a.name}{a.signedUp ? '' : ' · unfinished account'}</span></li>)}</ul>
                    <p className="t14 muted">The code is always 123456.</p>
                  </details>
                </>
              )}
              {step.s === 'code' && codeActor && (
                <form className="si-form" noValidate onSubmit={(e) => { e.preventDefault(); checkCode(step.actor); }}>
                  <h1 id="si-h" className="voice t30">Check your email</h1>
                  <p>We sent a 6-digit code to <b>{codeActor.email}</b>. <span className="ds-sim">Simulated: the code is 123456</span></p>
                  <div className="ds-field"><label htmlFor="si-code">Code</label>
                    <input id="si-code" className="ds-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={err?.kind === 'code'} aria-describedby={err ? 'si-err' : undefined} /></div>
                  {err && <div id="si-err" className="si-err" role="alert" data-k={err.kind}><p>{err.text}</p></div>}
                  <button type="submit" className="ds-btn primary">Sign in</button>
                  <div className="pl-ctas">
                    <button type="button" className="ds-btn quiet" onClick={() => { setCode(''); setErr({ kind: 'cancel', text: 'A new code is on its way (simulated: still 123456).' }); }}>Send a new code</button>
                    <button type="button" className="ds-btn quiet" onClick={() => { setCode(''); setErr(null); setStep({ s: 'start' }); }}>Use a different email</button>
                  </div>
                </form>
              )}
              {step.s === 'choose' && (
                <div className="si-form">
                  <h1 id="si-h" className="voice t30">Choose a {PROVIDER[step.provider]} account</h1>
                  <p className="t14 muted">A stand-in for {PROVIDER[step.provider]}’s own window. Nothing is sent to {PROVIDER[step.provider]}.</p>
                  <ul className="si-accounts" aria-label={`${PROVIDER[step.provider]} accounts (simulated)`}>
                    {choosable(step.provider).map((a) => (
                      <li key={a.id}><button type="button" className="ds-opt" onClick={() => pick(step.provider, a.id)}>
                        <span className="ds-av" aria-hidden="true">{a.initials}</span><span><b>{a.name}</b><br /><span className="t14 muted">{a.email}{a.signedUp ? '' : ' · account not finished'}</span></span>
                      </button></li>
                    ))}
                  </ul>
                  <button type="button" className="ds-btn quiet" onClick={() => { setStep({ s: 'start' }); setErr({ kind: 'cancel', text: `${PROVIDER[step.provider]} sign-in was cancelled. Nothing changed.` }); }}>Cancel</button>
                </div>
              )}
              {step.s === 'waiting' && (
                <div className="si-form" role="status">
                  <h1 id="si-h" className="voice t30">Signing you in</h1>
                  <p>Waiting for {PROVIDER[step.provider]} to confirm (simulated)…</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </Site>
  );
}
