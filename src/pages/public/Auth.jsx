import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Briefcase, Building2, Check, Eye, EyeOff, Lock, Mail, MailCheck, User, UserRound } from 'lucide-react'
import { Avatar, Button, CheckDraw, Logo, QOrb, Tick, ease, spring, useToast } from '../../ui'
import { useStore } from '../../store'

const roles = [
  { id: 'employer', icon: Briefcase, t: 'I’m hiring for my company', d: 'Founders, HR and hiring managers' },
  { id: 'agency', icon: Building2, t: 'I recruit for clients', d: 'Agencies and independent recruiters' },
  { id: 'candidate', icon: UserRound, t: 'I’m looking for work', d: 'Always free — you control your data' },
]

function ArtPanel({ role }) {
  const isCand = role === 'candidate'
  return (
    <div className="split-art">
      <div className="grid-bg" />
      <div className="glow" style={{ width: 500, height: 500, background: 'rgba(201,160,75,.18)', top: -150, right: -150 }} />
      <div className="grain" />
      <Link to="/" style={{ position: 'relative' }}><Logo dark /></Link>
      <div className="grow" />
      <AnimatePresence mode="wait">
        <motion.div key={isCand ? 'c' : 'e'} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease }} style={{ position: 'relative' }}>
          <QOrb size={44} thinking />
          <h2 style={{ fontSize: 40, color: '#f5f2ea', marginTop: 24, letterSpacing: '-.035em' }}>
            {isCand ? <>Be considered for work that <span className="serif" style={{ color: 'var(--gold-2)' }}>fits you.</span></> : <>A shorter path to a <span className="serif" style={{ color: 'var(--gold-2)' }}>confident</span> hire.</>}
          </h2>
          <p style={{ color: '#9a978e', fontSize: 16, marginTop: 14, maxWidth: 440 }}>
            {isCand ? 'Q builds a private profile from what you approve, finds roles that match your pay and ambitions, and keeps you informed.' : 'Describe the work. Q builds the mandate, finds permissioned evidence and checks mutual interest before you spend a minute interviewing.'}
          </p>
          <div className="lp-card" style={{ marginTop: 36, padding: 18, maxWidth: 420, background: 'rgba(255,255,255,.04)' }}>
            <div className="row" style={{ gap: 12 }}>
              <Avatar name={isCand ? 'Chiamaka Eze' : 'Tunde Bakare'} size={38} hue={isCand ? 4 : 2} />
              <div>
                <div style={{ fontSize: 14, color: '#efece3', fontWeight: 600 }}>{isCand ? 'Chiamaka · New graduate' : 'Tunde · Agency founder'}</div>
                <div style={{ fontSize: 12, color: '#7f7c73' }}>Design-partner persona</div>
              </div>
            </div>
            <p style={{ color: '#cfccc3', fontSize: 14, marginTop: 12, lineHeight: 1.6 }}>
              {isCand ? '“I finally saw entry-level paths that matched what I can actually do — and why I wasn’t a fit for the rest.”' : '“The representation ledger stopped us submitting the same candidate to two clients. That alone pays for it.”'}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="grow" />
      <div style={{ position: 'relative', fontSize: 12, color: '#5f5c55' }} className="row"><Lock size={12} /> Encrypted at rest · Consent-first · Human decisions</div>
    </div>
  )
}

function SSO() {
  const toast = useToast()
  const providers = [
    ['Google', <svg key="g" width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>],
    ['Microsoft', <svg key="m" width="15" height="15" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>],
    ['LinkedIn', <svg key="l" width="15" height="15" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#0A66C2" /><path fill="#fff" d="M7 9.5h2.6V18H7zM8.3 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11 9.5h2.5v1.2c.4-.7 1.3-1.4 2.7-1.4 2.8 0 3.3 1.8 3.3 4.2V18h-2.6v-4c0-1 0-2.2-1.3-2.2s-1.6 1-1.6 2.1V18H11z" /></svg>],
  ]
  return (
    <div className="grid g3" style={{ gap: 8 }}>
      {providers.map(([n, ic]) => <button key={n} className="btn" onClick={() => toast(`${n} sign-in is a prototype stub`, { tone: 'info' })}>{ic}{n}</button>)}
    </div>
  )
}

function Or() {
  return <div className="row" style={{ gap: 12, margin: '22px 0', color: 'var(--faint)', fontSize: 12 }}><span className="grow" style={{ height: 1, background: 'var(--line)' }} />or with email<span className="grow" style={{ height: 1, background: 'var(--line)' }} /></div>
}

function strength(p) {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++
  return s
}

export function Signup() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { set } = useStore()
  const [role, setRole] = useState(params.get('role'))
  const [stage, setStage] = useState(params.get('role') ? 'form' : 'role')
  const [form, setForm] = useState({ name: '', email: '', company: '', password: '' })
  const [show, setShow] = useState(false)
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const isCand = role === 'candidate'
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)
  const st = strength(form.password)
  const valid = form.name.length > 1 && emailOk && st >= 3 && (isCand || form.company.length > 1)
  const submit = (e) => {
    e.preventDefault()
    setTouched({ name: 1, email: 1, company: 1, password: 1 })
    if (!valid) return
    setLoading(true)
    if (isCand) set({ candidateUser: { name: form.name, email: form.email } })
    else set({ user: { name: form.name, email: form.email, role, company: form.company } })
    setTimeout(() => nav(`/verify?role=${role}&email=${encodeURIComponent(form.email)}`), 900)
  }
  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <motion.div className="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ArtPanel role={role} />
      <div className="split-form">
        <div style={{ width: '100%', maxWidth: 440 }}>
          <AnimatePresence mode="wait">
            {stage === 'role' ? (
              <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease }}>
                <div className="eyebrow">Create your account</div>
                <h1 style={{ fontSize: 32, marginTop: 10 }}>How will you use Talent Q?</h1>
                <p className="muted" style={{ marginTop: 8 }}>We’ll tailor your workspace. You can add another role later.</p>
                <div className="col" style={{ gap: 10, marginTop: 28 }}>
                  {roles.map((r, i) => (
                    <motion.button key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} className={`option ${role === r.id ? 'on' : ''}`} onClick={() => setRole(r.id)} data-q={`role-${r.id}`}>
                      <span className={`ic-box ${role === r.id ? 'dark' : ''}`}><r.icon size={19} /></span>
                      <span><div style={{ fontWeight: 650 }}>{r.t}</div><div className="muted small">{r.d}</div></span>
                      <Tick on={role === r.id} />
                    </motion.button>
                  ))}
                </div>
                <Button variant="primary" size="lg" style={{ width: '100%', marginTop: 22 }} disabled={!role} onClick={() => setStage('form')} iconRight={ArrowRight} data-q="role-continue">Continue</Button>
                <p className="muted small" style={{ textAlign: 'center', marginTop: 18 }}>Already have an account? <Link to="/login" style={{ color: 'var(--text)', fontWeight: 600 }}>Sign in</Link></p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease }} noValidate>
                <button type="button" className="btn ghost sm" style={{ marginLeft: -10 }} onClick={() => setStage('role')}><ArrowLeft size={14} /> {roles.find((r) => r.id === role)?.t}</button>
                <h1 style={{ fontSize: 32, marginTop: 14 }}>{isCand ? 'Start your profile' : 'Start hiring with Q'}</h1>
                <p className="muted" style={{ marginTop: 8 }}>{isCand ? 'Free forever. Nothing is shared until you say so.' : 'First mandate in under 5 minutes. No card required for the pilot.'}</p>
                <div style={{ marginTop: 26 }}><SSO /></div>
                <Or />
                <div className="col" style={{ gap: 14 }}>
                  <div className="field">
                    <label htmlFor="name">Full name</label>
                    <div className="input-wrap"><User size={16} /><input id="name" className={`input ${touched.name && form.name.length < 2 ? 'err' : ''}`} value={form.name} onChange={up('name')} onBlur={() => setTouched({ ...touched, name: 1 })} placeholder={isCand ? 'Femi Okafor' : 'Ada Nwosu'} autoComplete="name" data-q="su-name" /></div>
                  </div>
                  <div className="field">
                    <label htmlFor="email">{isCand ? 'Email' : 'Work email'}</label>
                    <div className="input-wrap"><Mail size={16} /><input id="email" type="email" className={`input ${touched.email ? (emailOk ? 'ok' : 'err') : ''}`} value={form.email} onChange={up('email')} onBlur={() => setTouched({ ...touched, email: 1 })} placeholder={isCand ? 'you@mail.com' : 'you@company.com'} autoComplete="email" data-q="su-email" />
                      <AnimatePresence>{emailOk && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--green)' }}><Check size={18} /></motion.span>}</AnimatePresence>
                    </div>
                    <AnimatePresence>{touched.email && !emailOk && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="small" style={{ color: 'var(--red)' }}>Enter an email like name@company.com</motion.div>}</AnimatePresence>
                  </div>
                  {!isCand && (
                    <div className="field">
                      <label htmlFor="company">{role === 'agency' ? 'Agency name' : 'Company'}</label>
                      <div className="input-wrap"><Building2 size={16} /><input id="company" className="input" value={form.company} onChange={up('company')} placeholder="Paystride" data-q="su-company" /></div>
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="pw">Password</label>
                    <div className="input-wrap"><Lock size={16} /><input id="pw" type={show ? 'text' : 'password'} className="input" value={form.password} onChange={up('password')} placeholder="At least 8 characters" autoComplete="new-password" data-q="su-password" />
                      <button type="button" onClick={() => setShow(!show)} aria-label="Toggle password" style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 0, color: 'var(--muted)' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    <div className="row" style={{ gap: 4, marginTop: 4 }}>
                      {[0, 1, 2, 3].map((i) => <motion.i key={i} animate={{ background: i < st ? ['#c0453b', '#b9791a', '#c9a04b', '#2e8b57'][st - 1] : '#e7e2d7' }} style={{ flex: 1, height: 4, borderRadius: 4 }} />)}
                    </div>
                    <div className="hint">{['Use 8+ characters', 'Weak — add upper & lower case', 'Okay — add a number', 'Good — nearly there', 'Strong password'][st]}</div>
                  </div>
                </div>
                <Button variant="primary" size="lg" style={{ width: '100%', marginTop: 22 }} loading={loading} type="submit" iconRight={loading ? undefined : ArrowRight} data-q="su-submit">{loading ? 'Creating account…' : 'Create account'}</Button>
                <p className="faint tiny" style={{ marginTop: 14, textAlign: 'center' }}>By continuing you agree to the Terms and the Candidate Data Charter.</p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export function Verify() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const role = params.get('role') || 'employer'
  const email = params.get('email') || 'you@company.com'
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [ok, setOk] = useState(false)
  const [secs, setSecs] = useState(30)
  const refs = useRef([])
  useEffect(() => { refs.current[0]?.focus() }, [])
  useEffect(() => { const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t) }, [])
  const setAt = (i, v) => {
    const d = v.replace(/\D/g, '')
    if (d.length > 1) {
      const arr = d.slice(0, 6).split('')
      const next = [...code]
      arr.forEach((ch, k) => { if (i + k < 6) next[i + k] = ch })
      setCode(next)
      refs.current[Math.min(5, i + arr.length)]?.focus()
      return check(next)
    }
    const next = [...code]
    next[i] = d
    setCode(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
    check(next)
  }
  const check = (c) => {
    if (c.every(Boolean)) {
      setTimeout(() => setOk(true), 250)
      setTimeout(() => nav(role === 'candidate' ? '/onboarding/candidate' : '/onboarding/employer'), 1700)
    }
  }
  return (
    <motion.div className="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ArtPanel role={role} />
      <div className="split-form">
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <AnimatePresence mode="wait">
            {ok ? (
              <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col center" style={{ gap: 18 }}>
                <CheckDraw />
                <h1 style={{ fontSize: 28 }}>Email verified</h1>
                <p className="muted">Setting up your {role === 'candidate' ? 'profile' : 'workspace'}…</p>
              </motion.div>
            ) : (
              <motion.div key="code" exit={{ opacity: 0, scale: 0.98 }}>
                <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={spring} className="ic-box gold" style={{ width: 64, height: 64, margin: '0 auto', borderRadius: 18 }}><MailCheck size={28} /></motion.div>
                <h1 style={{ fontSize: 30, marginTop: 22 }}>Check your inbox</h1>
                <p className="muted" style={{ marginTop: 8 }}>We sent a 6-digit code to <b style={{ color: 'var(--text)' }}>{email}</b></p>
                <div className="row center" style={{ gap: 10, marginTop: 30 }}>
                  {code.map((d, i) => (
                    <motion.input key={i} ref={(el) => (refs.current[i] = el)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`otp ${d ? 'filled' : ''} ${code.every(Boolean) ? 'ok' : ''}`} inputMode="numeric" maxLength={6} value={d} aria-label={`Digit ${i + 1}`} data-q={`otp-${i}`}
                      onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus() }} />
                  ))}
                </div>
                <p className="muted small" style={{ marginTop: 22 }}>{secs > 0 ? <>Resend code in 0:{String(secs).padStart(2, '0')}</> : <button className="btn ghost sm" onClick={() => setSecs(30)}>Resend code</button>}</p>
                <p className="faint tiny" style={{ marginTop: 8 }}>Wrong address? <Link to="/signup" style={{ textDecoration: 'underline' }}>Change email</Link></p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export function Login() {
  const nav = useNavigate()
  const [as, setAs] = useState('employer')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!email || !pw) { setErr('Enter your email and password.'); return }
    setErr('')
    setLoading(true)
    setTimeout(() => nav(as === 'candidate' ? '/me' : '/app'), 900)
  }
  return (
    <motion.div className="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ArtPanel role={as} />
      <div className="split-form">
        <form style={{ width: '100%', maxWidth: 420 }} onSubmit={submit} noValidate>
          <div className="eyebrow">Welcome back</div>
          <h1 style={{ fontSize: 32, marginTop: 10 }}>Sign in to Talent Q</h1>
          <div className="seg" style={{ marginTop: 20, width: '100%', display: 'flex' }}>
            {[['employer', 'Employer / Agency'], ['candidate', 'Candidate']].map(([v, l]) => (
              <button type="button" key={v} className={as === v ? 'on' : ''} style={{ flex: 1 }} onClick={() => setAs(v)} data-q={`login-${v}`}>{as === v && <motion.span layoutId="login-pill" className="seg-pill" transition={spring} />}{l}</button>
            ))}
          </div>
          <div style={{ marginTop: 20 }}><SSO /></div>
          <Or />
          <div className="col" style={{ gap: 14 }}>
            <div className="field"><label htmlFor="le">Email</label><div className="input-wrap"><Mail size={16} /><input id="le" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" data-q="li-email" /></div></div>
            <div className="field"><div className="row between"><label htmlFor="lp">Password</label><Link to="/forgot" className="small" style={{ color: 'var(--gold-ink)', fontWeight: 600 }}>Forgot?</Link></div><div className="input-wrap"><Lock size={16} /><input id="lp" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" data-q="li-password" /></div></div>
          </div>
          <AnimatePresence>{err && <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }} exit={{ opacity: 0 }} className="small" style={{ color: 'var(--red)', marginTop: 10 }}>{err}</motion.div>}</AnimatePresence>
          <Button variant="primary" size="lg" style={{ width: '100%', marginTop: 22 }} loading={loading} type="submit" data-q="li-submit">{loading ? 'Signing in…' : 'Sign in'}</Button>
          <p className="muted small" style={{ textAlign: 'center', marginTop: 18 }}>New to Talent Q? <Link to="/signup" style={{ color: 'var(--text)', fontWeight: 600 }}>Create an account</Link></p>
        </form>
      </div>
    </motion.div>
  )
}

export function Forgot() {
  const [sent, setSent] = useState(false)
  return (
    <motion.div className="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ArtPanel role="employer" />
      <div className="split-form">
        <div style={{ width: '100%', maxWidth: 420 }}>
          <Link to="/login" className="btn ghost sm" style={{ marginLeft: -10 }}><ArrowLeft size={14} /> Back to sign in</Link>
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="s" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}><CheckDraw size={56} /><h1 style={{ fontSize: 28, marginTop: 20 }}>Reset link sent</h1><p className="muted" style={{ marginTop: 8 }}>If an account exists for that email, you’ll get a link valid for 30 minutes.</p></motion.div>
            ) : (
              <motion.div key="f" exit={{ opacity: 0 }} style={{ marginTop: 24 }}>
                <h1 style={{ fontSize: 30 }}>Reset your password</h1>
                <p className="muted" style={{ marginTop: 8 }}>Enter the email you signed up with.</p>
                <div className="input-wrap" style={{ marginTop: 22 }}><Mail size={16} /><input className="input" placeholder="you@company.com" /></div>
                <Button variant="primary" size="lg" style={{ width: '100%', marginTop: 16 }} onClick={() => setSent(true)}>Send reset link</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
