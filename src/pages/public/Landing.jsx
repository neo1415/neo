import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight, BadgeCheck, Briefcase, CalendarCheck, Check, ChevronDown, FileSearch, Fingerprint, Handshake, Layers,
  Lock, MessageSquareText, Mic, Scale, ScanSearch, ShieldCheck, Sparkles, UserRound, Users, Wand2, Workflow,
} from 'lucide-react'
import { Avatar, Button, CountUp, Logo, QOrb, Typing, ease, spring } from '../../ui'

const intakeScript = [
  { who: 'me', text: 'We need a backend engineer who can stop our API failures and speed up the database. Up to $2,000/month, must overlap our hours.' },
  { who: 'q', text: 'Got it. Two quick questions so I search for the right person:' },
  { who: 'q', chips: ['Fully remote is fine', 'Must be in Lagos'], text: 'Is remote work acceptable if they overlap WAT ±2h?' },
  { who: 'me', text: 'Remote is fine.' },
  { who: 'q', brief: true, text: 'Here is your draft mandate. Heads-up: "senior" at $2,000 is tight — I\'ll show two realistic options.' },
]

function HeroDemo() {
  const [step, setStep] = useState(0)
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    if (step >= intakeScript.length) {
      const t = setTimeout(() => setStep(0), 5200)
      return () => clearTimeout(t)
    }
    const next = intakeScript[step]
    setTyping(next.who === 'q')
    const t = setTimeout(() => { setTyping(false); setStep((s) => s + 1) }, next.who === 'q' ? 1500 : 1100)
    return () => clearTimeout(t)
  }, [step])
  const shown = intakeScript.slice(0, step)
  return (
    <div className="lp-card" style={{ padding: 0, overflow: 'hidden', boxShadow: '0 40px 120px -30px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.04)' }}>
      <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', gap: 10 }}>
        <div className="row" style={{ gap: 6 }}>{['#ff5f57', '#febc2e', '#28c840'].map((c) => <i key={c} style={{ width: 10, height: 10, borderRadius: 9, background: c, opacity: 0.8 }} />)}</div>
        <span style={{ fontSize: 12, color: '#7f7c73', marginLeft: 8 }}>New mandate · Talent Q</span>
        <span className="grow" />
        <span style={{ fontSize: 11, color: '#7f7c73' }} className="row"><Lock size={11} /> Paystride workspace</span>
      </div>
      <div style={{ padding: 20, height: 400, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-end', background: 'radial-gradient(ellipse at top, rgba(201,160,75,.07), transparent 60%)' }}>
        <AnimatePresence initial={false}>
          {shown.map((m, i) => (
            <motion.div key={i + '-' + step % 100} layout initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} style={{ display: 'flex', gap: 10, justifyContent: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
              {m.who === 'q' && <QOrb size={24} />}
              <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.5, background: m.who === 'me' ? 'linear-gradient(180deg,#d9b462,#c49639)' : 'rgba(255,255,255,.06)', color: m.who === 'me' ? '#1a1408' : '#e8e5dc', border: m.who === 'me' ? 'none' : '1px solid rgba(255,255,255,.08)', fontWeight: m.who === 'me' ? 500 : 400 }}>
                {m.text}
                {m.chips && <div className="row" style={{ marginTop: 8 }}>{m.chips.map((c, k) => <span key={c} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(201,160,75,.4)', color: k === 0 ? '#1a1408' : '#e2c27c', background: k === 0 ? '#e2c27c' : 'transparent' }}>{c}</span>)}</div>}
                {m.brief && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ delay: 0.3, duration: 0.5, ease }} style={{ marginTop: 10, padding: 12, borderRadius: 10, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ fontSize: 11, color: '#c9a04b', fontWeight: 600, letterSpacing: '.1em' }}>MANDATE v1 · BACKEND ENGINEER</div>
                    {['API reliability & incident response · must', 'PostgreSQL performance · must', 'Node.js / Go · preferred', 'Remote, WAT ±2h · $1.8–2k/mo'].map((l, k) => (
                      <motion.div key={l} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + k * 0.12 }} className="row" style={{ fontSize: 12.5, marginTop: 6, color: '#d8d5cc' }}><Check size={13} color="#6fd39a" /> {l}</motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && <div className="row" style={{ gap: 10 }}><QOrb size={24} thinking /><div style={{ padding: '6px 14px', borderRadius: 14, background: 'rgba(255,255,255,.06)' }}><Typing /></div></div>}
      </div>
      <div className="row" style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.07)', gap: 8 }}>
        <div className="grow" style={{ height: 40, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', padding: '0 14px', color: '#6f6c64', fontSize: 13 }}>Describe the work, not the job title…</div>
        <span style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.06)', color: '#e2c27c' }}><Mic size={17} /></span>
      </div>
    </div>
  )
}

function QMatchExplorer() {
  const [F, setF] = useState(82)
  const [A, setA] = useState(90)
  const M = Math.sqrt(F * A)
  return (
    <div className="lp-card" style={{ padding: 32 }}>
      <div className="row between">
        <div className="eyebrow" style={{ color: 'var(--gold)' }}>Try Q-Match</div>
        <span style={{ fontSize: 12, color: '#7f7c73' }}>A ranking heuristic — not a probability of success</span>
      </div>
      {[['Employer fit  F', 'Can they do the work? Weighted by evidence confidence.', F, setF], ['Candidate compatibility  A', 'Do pay, location and ambitions fit them?', A, setA]].map(([l, d, v, set]) => (
        <div key={l} style={{ marginTop: 26 }}>
          <div className="row between"><div style={{ fontWeight: 600, color: '#efece3' }}>{l}</div><div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, color: '#f5f2ea' }}>{v}</div></div>
          <div style={{ fontSize: 13, color: '#8a877e', margin: '4px 0 12px' }}>{d}</div>
          <input aria-label={l} className="range" type="range" min={0} max={100} value={v} onChange={(e) => set(+e.target.value)} style={{ '--p': v + '%', background: `linear-gradient(90deg, var(--gold) ${v}%, rgba(255,255,255,.1) ${v}%)` }} />
        </div>
      ))}
      <div className="row" style={{ marginTop: 32, padding: 20, borderRadius: 14, background: 'rgba(201,160,75,.08)', border: '1px solid rgba(201,160,75,.22)', gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: '#c9a04b', fontWeight: 600, letterSpacing: '.1em' }}>MUTUAL INDEX</div>
          <div className="mono" style={{ color: '#a9a69d', fontSize: 13, marginTop: 4 }}>M = √(F × A)</div>
        </div>
        <span className="grow" />
        <motion.div key={Math.round(M)} initial={{ scale: 1.15, color: '#fff' }} animate={{ scale: 1, color: '#e2c27c' }} transition={spring} style={{ fontFamily: 'var(--display)', fontSize: 52, fontWeight: 750, letterSpacing: '-.04em' }}>{M.toFixed(1)}</motion.div>
      </div>
      <p style={{ fontSize: 13, color: '#8a877e', marginTop: 14 }}>A great CV with a terrible fit for the candidate ranks lower than a strong, genuinely interested match. Try F 93 / A 40.</p>
    </div>
  )
}

const employerSteps = [
  { icon: MessageSquareText, t: 'Explain the job', d: 'Describe outcomes in plain words or voice. Q asks what matters, what is mandatory and who decides.' },
  { icon: FileSearch, t: 'Build a real mandate', d: 'A versioned brief with competencies, budget and rubric. Unrealistic combos get honest trade-offs.' },
  { icon: ScanSearch, t: 'See the evidence', d: 'Matches from permissioned sources — with where each claim came from and when it was confirmed.' },
  { icon: Handshake, t: 'Confirm mutual interest', d: 'Pay, location and appetite are checked before anyone books an interview.' },
  { icon: Scale, t: 'Assess and decide', d: 'Structured screens, practical tasks and a rubric comparison. A human makes the call.' },
]

const features = [
  { icon: Wand2, t: 'Conversational role intake', d: 'Text or voice; turns business outcomes into a versioned job brief.', tag: 'Employers' },
  { icon: Scale, t: 'Hiring feasibility review', d: 'Flags budget and location contradictions with realistic alternatives.', tag: 'Employers' },
  { icon: Layers, t: 'Evidence-linked shortlist', d: 'Hybrid search with provenance, freshness and “unknown” labels.', tag: 'Employers' },
  { icon: Workflow, t: 'Policy-bound Q agents', d: 'Delegate sourcing and follow-ups with scope, spend caps and escalation.', tag: 'Employers' },
  { icon: UserRound, t: 'Candidate-led profile', d: 'Upload a CV or talk to Q. You approve every claim before it is used.', tag: 'Candidates' },
  { icon: Fingerprint, t: 'Reusable skill evidence', d: 'Prove a skill once; share it selectively with employers you choose.', tag: 'Candidates' },
  { icon: Mic, t: 'Private interview rehearsal', d: 'Practice by role with feedback. Never visible to employers by default.', tag: 'Candidates' },
  { icon: CalendarCheck, t: 'Status you can trust', d: 'Participating employers commit to review windows. No silent ghosting.', tag: 'Candidates' },
]

const plans = [
  { n: 'Pilot mandate', p: '129', u: 'one-off', d: 'One 30-day active hiring requirement.', f: ['Conversational intake', 'Evidence-linked shortlist', 'Mutual interest checks', 'Basic pipeline'] },
  { n: 'Growth', p: '349', u: '/month', d: 'Small HR teams, up to 3 active mandates.', f: ['Everything in Pilot', 'Q-led structured screens', 'Team scorecards & approvals', 'Calendar & ATS connectors'], hot: true },
  { n: 'Agency', p: '799', u: '/month', d: 'Multi-client recruiting at pace.', f: ['Client mandates & billing', 'Representation ledger', 'Duplicate-submission guard', 'Persistent Q agents'] },
  { n: 'Enterprise', p: '24k', u: '/year from', d: 'Governance, residency, integrations.', f: ['Jurisdiction policy gates', 'SSO, audit & data residency', 'Custom rubrics & evaluation', 'Dedicated success team'] },
]

export default function Landing() {
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [faq, setFaq] = useState(0)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroO = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', f)
    return () => window.removeEventListener('scroll', f)
  }, [])

  const words = ['Hire', 'on', 'evidence,']
  return (
    <motion.div className="lp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <Logo dark />
        <div className="row hide-m" style={{ gap: 28, marginLeft: 20 }}>
          <a className="link" href="#how">How it works</a>
          <a className="link" href="#qmatch">Q-Match</a>
          <a className="link" href="#candidates">For candidates</a>
          <a className="link" href="#trust">Trust</a>
          <a className="link" href="#pricing">Pricing</a>
        </div>
        <span className="grow" />
        <Link className="link hide-m" to="/login" style={{ color: '#d8d5cc', fontWeight: 500 }} data-q="nav-login">Sign in</Link>
        <Button variant="gold" onClick={() => nav('/signup')} iconRight={ArrowRight} data-q="nav-signup">Get started</Button>
      </nav>

      {/* HERO */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <div className="grid-bg" />
        <motion.div className="glow" style={{ width: 620, height: 620, background: 'rgba(201,160,75,.20)', top: -200, right: -100 }} animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="glow" style={{ width: 480, height: 480, background: 'rgba(80,90,140,.18)', bottom: -200, left: -120 }} animate={{ x: [0, -30, 0], y: [0, -20, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="grain" />
        <motion.div className="lp-section" style={{ y: heroY, opacity: heroO, position: 'relative', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 64, alignItems: 'center', paddingTop: 140, width: '100%' }}>
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="row" style={{ display: 'inline-flex', padding: '6px 14px 6px 6px', borderRadius: 99, border: '1px solid rgba(201,160,75,.3)', background: 'rgba(201,160,75,.08)', fontSize: 13, color: '#e2c27c', gap: 10 }}>
              <span style={{ background: '#c9a04b', color: '#1a1408', padding: '2px 8px', borderRadius: 99, fontWeight: 650, fontSize: 11 }}>NEW</span>
              Design-partner pilots now open in Lagos, London & remote
            </motion.div>
            <h1 style={{ marginTop: 28 }}>
              {words.map((w, i) => (
                <motion.span key={w} style={{ display: 'inline-block', marginRight: 18 }} initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.2 + i * 0.1, duration: 0.7, ease }}>{w}</motion.span>
              ))}
              <br />
              <motion.span className="serif" style={{ display: 'inline-block', color: 'var(--gold-2)', fontSize: '1.08em' }} initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.55, duration: 0.8, ease }}>not noise.</motion.span>
            </h1>
            <motion.p className="lead" style={{ marginTop: 26, maxWidth: 540 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              Talent Q is the AI-native path from a genuine hiring need to a qualified, interested candidate — and an accountable decision. Meet <b style={{ color: '#efece3' }}>Q</b>, who clarifies the work, shows the evidence and keeps both sides moving.
            </motion.p>
            <motion.div className="row" style={{ marginTop: 36, gap: 12 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <Button variant="gold" size="lg" icon={Briefcase} onClick={() => nav('/signup?role=employer')} data-q="hero-hire">I'm hiring</Button>
              <Button variant="dark-outline" size="lg" icon={UserRound} onClick={() => nav('/signup?role=candidate')} data-q="hero-seek">I'm looking for work</Button>
            </motion.div>
            <motion.div className="row" style={{ marginTop: 36, gap: 22, color: '#7f7c73', fontSize: 13 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
              <span className="row"><ShieldCheck size={15} color="#c9a04b" /> Human decides, always</span>
              <span className="row"><BadgeCheck size={15} color="#c9a04b" /> Free for candidates</span>
              <span className="row"><Lock size={15} color="#c9a04b" /> Consent on every claim</span>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 40, rotateX: 12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.5, duration: 1, ease }} style={{ perspective: 1000, position: 'relative' }}>
            <HeroDemo />
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4, ...spring }} className="lp-card" style={{ position: 'absolute', left: -48, bottom: -36, padding: '12px 16px', background: '#15171c', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 20px 50px -10px rgba(0,0,0,.7)' }}>
              <Avatar name="Femi Okafor" size={36} hue={1} online />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#efece3' }}>Femi accepted your interest check</div>
                <div style={{ fontSize: 12, color: '#7f7c73' }}>Pay ✓ · Remote ✓ · Mutual 86.7</div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{ position: 'absolute', bottom: 24, left: '50%', translateX: '-50%', color: '#5f5c55' }}><ChevronDown /></motion.div>
      </section>

      {/* PROBLEM STATS */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', background: '#0e0f13' }}>
        <div className="lp-section" style={{ paddingTop: 72, paddingBottom: 72, display: 'grid', gridTemplateColumns: '1.2fr repeat(3, 1fr)', gap: 40, alignItems: 'center' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>The problem</div>
            <p style={{ fontSize: 22, color: '#efece3', fontFamily: 'var(--display)', fontWeight: 600, marginTop: 10, letterSpacing: '-.02em', lineHeight: 1.3 }}>Finding applicants got easy. Finding the right person got harder.</p>
          </div>
          {[[68, '%', 'of US HR professionals say full-time recruiting is difficult', 'SHRM 2026'], [81, '%', 'of US job seekers rejected without speaking to anyone', 'Greenhouse 2026'], [45, '%', 'of interviewees report being ghosted by employers', 'Greenhouse 2026']].map(([n, s, d, src]) => (
            <div key={d}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 52, fontWeight: 750, color: '#f5f2ea', letterSpacing: '-.04em' }}><CountUp to={n} suffix={s} /></div>
              <div style={{ color: '#9a978e', fontSize: 14, marginTop: 4 }}>{d}</div>
              <div style={{ color: '#5f5c55', fontSize: 11.5, marginTop: 6 }}>{src}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="lp-section">
        <div style={{ maxWidth: 720 }}>
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>How it works for employers</div>
          <h2 style={{ marginTop: 12 }}>From “we need someone” to a <span className="serif" style={{ color: 'var(--gold-2)' }}>defensible</span> hire.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginTop: 56, position: 'relative' }}>
          <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease }} style={{ position: 'absolute', top: 27, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,160,75,.6), transparent)', transformOrigin: 'left' }} />
          {employerSteps.map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ delay: i * 0.1, duration: 0.6, ease }} style={{ position: 'relative' }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, display: 'grid', placeItems: 'center', background: '#15171c', border: '1px solid rgba(201,160,75,.3)', color: '#e2c27c', position: 'relative', zIndex: 1 }}><s.icon size={22} /></div>
              <div style={{ fontSize: 12, color: '#c9a04b', fontWeight: 600, marginTop: 18 }}>STEP {i + 1}</div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 650, fontSize: 18, color: '#f2efe6', marginTop: 6 }}>{s.t}</div>
              <p style={{ color: '#8f8c83', fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* QMATCH */}
      <section id="qmatch" className="lp-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', paddingTop: 40 }}>
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>Q-Match</div>
          <h2 style={{ marginTop: 12 }}>Two-sided fit. <span className="serif" style={{ color: 'var(--gold-2)' }}>Transparent</span> by design.</h2>
          <p className="lead" style={{ marginTop: 20 }}>Not one big model guessing “the best candidate”. Q-Match combines deterministic, auditable scores — and tells you what it doesn’t know.</p>
          <div className="col" style={{ gap: 14, marginTop: 28 }}>
            {[['Evidence, weighted by confidence', 'Unverified claims fall back to a neutral prior — never treated as failure.'], ['Coverage reported separately', 'High fit with low coverage means “collect more evidence”, not “reject”.'], ['No protected traits as inputs', 'Age, sex, ethnicity, disability or social lifestyle never enter the score.']].map(([t, d]) => (
              <div key={t} className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(201,160,75,.14)', color: '#e2c27c', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}><Check size={14} /></span>
                <div><div style={{ color: '#efece3', fontWeight: 600 }}>{t}</div><div style={{ color: '#8f8c83', fontSize: 14, marginTop: 2 }}>{d}</div></div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }} data-q="qmatch-card"><QMatchExplorer /></motion.div>
      </section>

      {/* CANDIDATES */}
      <section id="candidates" style={{ background: 'linear-gradient(180deg, #0b0c0f, #121318)' }}>
        <div className="lp-section" style={{ display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 64, alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }} style={{ position: 'relative', height: 480 }}>
            {[
              { x: 0, y: 0, r: -4, c: <><div className="row" style={{ gap: 10 }}><Avatar name="Paystride" size={34} hue={1} /><div><div style={{ fontWeight: 600, color: '#efece3' }}>Confidential invite</div><div style={{ fontSize: 12, color: '#8a877e' }}>Paystride · Backend Engineer</div></div></div><div className="row" style={{ marginTop: 14, gap: 6 }}>{['Pay fits', 'Remote', 'Mutual 87'].map((t) => <span key={t} style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 99, background: 'rgba(111,211,154,.12)', color: '#7fd8a5' }}>{t}</span>)}</div></> },
              { x: 150, y: 150, r: 3, c: <><div style={{ fontSize: 11, color: '#c9a04b', fontWeight: 600, letterSpacing: '.1em' }}>EVIDENCE WALLET</div>{['PostgreSQL performance · verified', 'Incident lead · reference ✓', 'Q practice: API debugging 86'].map((t) => <div key={t} className="row" style={{ marginTop: 10, fontSize: 13, color: '#d8d5cc' }}><BadgeCheck size={14} color="#c9a04b" />{t}</div>)}</> },
              { x: 30, y: 320, r: -2, c: <><div className="row between"><div style={{ fontWeight: 600, color: '#efece3' }}>Application status</div><span style={{ fontSize: 11, color: '#7fd8a5' }}>● Live</span></div><div className="row" style={{ marginTop: 14, gap: 4 }}>{[1, 1, 1, 0, 0].map((d, i) => <i key={i} style={{ flex: 1, height: 5, borderRadius: 9, background: d ? '#c9a04b' : 'rgba(255,255,255,.1)' }} />)}</div><div style={{ fontSize: 12, color: '#8a877e', marginTop: 8 }}>Employer reviews within 3 working days</div></> },
            ].map((card, i) => (
              <motion.div key={i} className="lp-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.15, ...spring }} whileHover={{ y: -6, rotate: 0 }} style={{ position: 'absolute', left: card.x, top: card.y, width: 320, padding: 18, rotate: card.r, background: '#17191f', boxShadow: '0 30px 60px -20px rgba(0,0,0,.6)' }}>{card.c}</motion.div>
            ))}
          </motion.div>
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>For candidates</div>
            <h2 style={{ marginTop: 12 }}>Your evidence. Your terms. <span className="serif" style={{ color: 'var(--gold-2)' }}>Your next move.</span></h2>
            <p className="lead" style={{ marginTop: 20 }}>Upload a CV or just talk to Q. You approve every claim, decide who can contact you, and keep proof of your skills from one process to the next. Free — always.</p>
            <div className="grid g2" style={{ marginTop: 28, gap: 12 }}>
              {['Confidential mode — your employer never sees you', 'Accept, defer or decline any contact', 'Private interview practice with feedback', 'Meaningful feedback when you don’t get it'].map((t) => (
                <div key={t} className="row" style={{ alignItems: 'flex-start', color: '#cfccc3', fontSize: 14, gap: 10 }}><Check size={16} color="#c9a04b" style={{ marginTop: 2, flexShrink: 0 }} />{t}</div>
              ))}
            </div>
            <div style={{ marginTop: 32 }}><Button variant="gold" size="lg" iconRight={ArrowRight} onClick={() => nav('/signup?role=candidate')}>Build my profile</Button></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section">
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>One product, both sides</div>
            <h2 style={{ marginTop: 12 }}>Everything between need and <span className="serif" style={{ color: 'var(--gold-2)' }}>hire.</span></h2>
          </div>
        </div>
        <div className="grid g4" style={{ marginTop: 48 }}>
          {features.map((f, i) => (
            <motion.div key={f.t} className="lp-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.08, duration: 0.5, ease }} whileHover={{ y: -4, borderColor: 'rgba(201,160,75,.35)' }} style={{ padding: 22 }}>
              <div className="row between"><span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(201,160,75,.1)', color: '#e2c27c' }}><f.icon size={19} /></span><span style={{ fontSize: 11, color: '#7f7c73' }}>{f.tag}</span></div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 650, fontSize: 16, color: '#f2efe6', marginTop: 18 }}>{f.t}</div>
              <p style={{ color: '#8f8c83', fontSize: 13.5, marginTop: 6 }}>{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" style={{ background: '#0e0f13', borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div className="lp-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 64 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>Trust & governance</div>
            <h2 style={{ marginTop: 12 }}>AI advises. <span className="serif" style={{ color: 'var(--gold-2)' }}>People decide.</span></h2>
            <p className="lead" style={{ marginTop: 20 }}>Built for the EU AI Act high-risk timeline and Nigeria’s Data Protection Act from day one — not bolted on later.</p>
          </div>
          <div className="grid g2">
            {[[ShieldCheck, 'Human review gates', 'No silent automated rejection or hiring decision.'], [Fingerprint, 'Consent & provenance', 'Every evidence item links to source, freshness and permission scope.'], [Users, 'Tenant isolation', 'Company, agency and candidate access strictly segregated and logged.'], [Sparkles, 'Explainable rankings', 'Replay any recommendation against the rubric and model version.']].map(([I, t, d], i) => (
              <motion.div key={t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,.07)' }}>
                <I size={20} color="#c9a04b" />
                <div style={{ fontWeight: 600, color: '#efece3', marginTop: 12 }}>{t}</div>
                <div style={{ color: '#8f8c83', fontSize: 13.5, marginTop: 4 }}>{d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="lp-section">
        <div style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>Pricing</div>
          <h2 style={{ marginTop: 12 }}>Employers pay. <span className="serif" style={{ color: 'var(--gold-2)' }}>Candidates never do.</span></h2>
          <p className="lead" style={{ marginTop: 14 }}>Pilot pricing in USD. Specialist assessments, verification and premium video are metered.</p>
        </div>
        <div className="grid g4" style={{ marginTop: 52, alignItems: 'stretch' }}>
          {plans.map((p, i) => (
            <motion.div key={p.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, ease }} whileHover={{ y: -6 }} className="lp-card" style={{ padding: 26, position: 'relative', ...(p.hot ? { background: 'linear-gradient(180deg, rgba(201,160,75,.16), rgba(201,160,75,.03))', borderColor: 'rgba(201,160,75,.45)' } : {}) }}>
              {p.hot && <span style={{ position: 'absolute', top: -11, left: 26, fontSize: 11, fontWeight: 650, background: '#c9a04b', color: '#1a1408', padding: '3px 10px', borderRadius: 99 }}>Most chosen</span>}
              <div style={{ fontWeight: 600, color: '#efece3' }}>{p.n}</div>
              <div className="row" style={{ alignItems: 'baseline', marginTop: 14, gap: 4 }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 750, color: '#f7f4ec', letterSpacing: '-.04em' }}>${p.p}</span>
                <span style={{ color: '#7f7c73', fontSize: 13 }}>{p.u}</span>
              </div>
              <p style={{ color: '#8f8c83', fontSize: 13.5, marginTop: 6, minHeight: 40 }}>{p.d}</p>
              <div className="col" style={{ gap: 9, marginTop: 18 }}>{p.f.map((f) => <div key={f} className="row" style={{ fontSize: 13.5, color: '#cfccc3' }}><Check size={14} color="#c9a04b" />{f}</div>)}</div>
              <Button variant={p.hot ? 'gold' : 'dark-outline'} className="" style={{ width: '100%', marginTop: 24 }} onClick={() => nav('/signup?role=employer')}>{i === 3 ? 'Talk to us' : 'Start ' + p.n.split(' ')[0].toLowerCase()}</Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section" style={{ paddingTop: 20, maxWidth: 860 }}>
        <h2 style={{ textAlign: 'center', fontSize: 36 }}>Questions, answered honestly</h2>
        <div className="col" style={{ marginTop: 36, gap: 10 }}>
          {[['Where do candidates come from?', 'Candidate-owned profiles, your own consented past applicants, licensed partners and permitted public professional information. We never scrape platforms that prohibit it — and “no verified candidate found” is a legitimate answer.'], ['Does Q decide who gets hired?', 'No. Q can propose, summarise and coordinate. A human reviewer makes every consequential decision, and AI advice is always labelled as such.'], ['Is my job search visible to my current employer?', 'Not in confidential mode. Interest checks are private, and your status never changes publicly without your action.'], ['Is the match score a probability of success?', 'No. The mutual index is a ranking heuristic. We validate weights against real outcomes before making any predictive claim.']].map(([q, a], i) => (
            <div key={q} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', background: faq === i ? 'rgba(255,255,255,.03)' : 'transparent' }}>
              <button onClick={() => setFaq(faq === i ? -1 : i)} className="row between" style={{ width: '100%', padding: '18px 20px', background: 'none', border: 0, color: '#efece3', fontWeight: 600, fontSize: 15.5, textAlign: 'left' }} aria-expanded={faq === i}>
                {q}<motion.span animate={{ rotate: faq === i ? 180 : 0 }}><ChevronDown size={18} color="#8f8c83" /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {faq === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }}><p style={{ padding: '0 20px 20px', color: '#9a978e', fontSize: 14.5, lineHeight: 1.65 }}>{a}</p></motion.div>}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="glow" style={{ width: 700, height: 400, background: 'rgba(201,160,75,.18)', left: '50%', top: '30%', transform: 'translateX(-50%)' }} />
        <div className="lp-section" style={{ textAlign: 'center', position: 'relative' }}>
          <QOrb size={64} thinking />
          <h2 style={{ marginTop: 28, fontSize: 56 }}>Make your next hire a <span className="serif" style={{ color: 'var(--gold-2)' }}>decision</span>,<br />not a lottery.</h2>
          <div className="row center" style={{ marginTop: 36, gap: 12 }}>
            <Button variant="gold" size="lg" onClick={() => nav('/signup?role=employer')} iconRight={ArrowRight}>Start a pilot mandate</Button>
            <Button variant="dark-outline" size="lg" onClick={() => nav('/signup?role=candidate')}>Join as a candidate</Button>
          </div>
        </div>
      </section>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div className="lp-section row between" style={{ padding: '32px 48px', color: '#6f6c64', fontSize: 13 }}>
          <Logo dark size={22} />
          <div className="row" style={{ gap: 24 }}><span>Privacy</span><span>Candidate rights</span><span>AI transparency</span><span>© 2026 Talent Q</span></div>
        </div>
      </footer>
    </motion.div>
  )
}
