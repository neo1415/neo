import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, Ban, Check, EyeOff, FileText, Github, Globe2, Link2, MessageCircle, Pencil, ShieldCheck, Sparkles, Trash2, UploadCloud, Users, Zap, Eye } from 'lucide-react'
import OnboardingFrame from './OnboardingFrame'
import { Badge, Button, CountUp, QOrb, Segmented, Tick, Toggle, celebrate, ease, spring, stagger } from '../../ui'
import { useStore } from '../../store'

const steps = [
  { t: 'Start your profile', d: 'Upload a CV or talk to Q' },
  { t: 'Review what Q found', d: 'You approve every claim' },
  { t: 'What you want next', d: 'Pay, location, direction' },
  { t: 'Privacy & contact', d: 'Who sees you, and when' },
  { t: 'Add evidence', d: 'Optional proof of skills', optional: true },
  { t: 'You’re in', d: 'See your matches' },
]
const qLines = [
  'Hi Femi — I’m Q. I’ll build a private profile from what you approve. Nothing is shared without your say-so.',
  'I tagged each item with where it came from. Unverified isn’t bad — it just means we haven’t confirmed it yet.',
  'I’ll only show roles that fit these. If something is unknown, I’ll ask instead of guessing.',
  'Confidential mode is great if you’re employed. Your current employer will never see you.',
  'Evidence you add here can be reused across applications — prove it once, share it selectively.',
  'I found 3 opportunities that fit both ways. One employer already sent a confidential invite.',
]

const parsedClaims = [
  { t: 'Senior Backend Engineer · Kudi Ledger', s: '2021 – present · Lagos', src: 'CV' },
  { t: 'Cut p95 latency 41% on payments API', s: 'Achievement', src: 'CV' },
  { t: 'PostgreSQL — partitioning, query tuning', s: 'Skill · 6 yrs', src: 'CV' },
  { t: 'Node.js, Go, TypeScript', s: 'Skills', src: 'CV' },
  { t: 'On-call lead, 14 incident post-mortems', s: 'Experience', src: 'CV' },
  { t: 'B.Eng Computer Engineering · UNILAG', s: '2017', src: 'CV' },
]

function Parsing({ onDone }) {
  const lines = ['Reading document structure', 'Extracting roles & dates', 'Identifying skills & evidence', 'Checking for sensitive data to exclude']
  const [i, setI] = useState(0)
  useEffect(() => {
    if (i >= lines.length) { const t = setTimeout(onDone, 500); return () => clearTimeout(t) }
    const t = setTimeout(() => setI(i + 1), 650)
    return () => clearTimeout(t)
  }, [i])
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ padding: 28, marginTop: 28 }}>
      <div className="row" style={{ gap: 14 }}>
        <div className="ic-box gold" style={{ width: 48, height: 56, borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
          <FileText size={22} />
          <motion.i animate={{ y: [-30, 30] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'var(--gold)', boxShadow: '0 0 12px var(--gold)' }} />
        </div>
        <div className="grow"><div style={{ fontWeight: 600 }}>Femi_Okafor_CV_2026.pdf</div><div className="muted small">248 KB · 2 pages</div></div>
        <QOrb size={30} thinking={i < lines.length} />
      </div>
      <div className="col" style={{ gap: 10, marginTop: 22 }}>
        {lines.map((l, k) => (
          <motion.div key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: k <= i ? 1 : 0.35, x: 0 }} transition={{ delay: k * 0.05 }} className="row" style={{ gap: 10, fontSize: 14 }}>
            {k < i ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} style={{ color: 'var(--green)' }}><Check size={16} strokeWidth={3} /></motion.span> : k === i ? <span className="spin" style={{ width: 14, height: 14, border: '2px solid var(--gold)', borderRightColor: 'transparent', borderRadius: '50%' }} /> : <span style={{ width: 16 }} />}
            {l}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default function CandidateOnboarding() {
  const nav = useNavigate()
  const { candidateUser } = useStore()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState(null) // upload | talk
  const [drag, setDrag] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | parsing | done
  const [claims, setClaims] = useState(parsedClaims.map((c) => ({ ...c, ok: true })))
  const [pay, setPay] = useState(1800)
  const [pattern, setPattern] = useState('Remote')
  const [locs, setLocs] = useState(['Lagos', 'Remote — Africa'])
  const [dirs, setDirs] = useState(['Senior backend', 'Platform / SRE'])
  const [avail, setAvail] = useState('4 weeks notice')
  const [vis, setVis] = useState('confidential')
  const [priv, setPriv] = useState({ verified: true, salary: true, practice: false })
  const [evid, setEvid] = useState({})
  const first = (candidateUser?.name || 'Femi').split(' ')[0]

  const toggleIn = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const startUpload = () => { setMode('upload'); setPhase('parsing') }

  const body = [
    <div key="0">
      <div className="eyebrow">Welcome, {first}</div>
      <h1 style={{ fontSize: 34, marginTop: 10 }}>Let’s build your professional profile</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Two ways to start. Both take about two minutes.</p>
      {phase === 'parsing' ? <Parsing onDone={() => { setPhase('done'); setStep(1) }} /> : (
        <div className="grid g2" style={{ marginTop: 28, gap: 14 }}>
          <motion.div {...stagger(0)} className={`dropzone ${drag ? 'drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); startUpload() }} data-q="cv-drop">
            <motion.div animate={{ y: drag ? -6 : [0, -4, 0] }} transition={drag ? spring : { duration: 2.4, repeat: Infinity }} className="ic-box gold" style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 16 }}><UploadCloud size={26} /></motion.div>
            <div className="card-title" style={{ marginTop: 16 }}>Upload your CV</div>
            <p className="muted small" style={{ marginTop: 4 }}>PDF or DOCX · drag here or browse</p>
            <Button variant="primary" style={{ marginTop: 16 }} onClick={startUpload} data-q="cv-upload">Choose file</Button>
          </motion.div>
          <motion.button {...stagger(1)} className="dropzone" style={{ borderStyle: 'solid', cursor: 'pointer' }} onClick={() => { setMode('talk'); setPhase('parsing') }}>
            <div style={{ display: 'grid', placeItems: 'center' }}><QOrb size={56} /></div>
            <div className="card-title" style={{ marginTop: 16 }}>Talk to Q instead</div>
            <p className="muted small" style={{ marginTop: 4 }}>No CV? Describe your work by voice or text</p>
            <span className="btn" style={{ marginTop: 16 }}><MessageCircle size={16} /> Start conversation</span>
          </motion.button>
        </div>
      )}
      <div className="row" style={{ marginTop: 22, gap: 8, color: 'var(--muted)', fontSize: 12.5 }}><ShieldCheck size={14} /> We automatically exclude date of birth, photo, religion and marital status.</div>
    </div>,
    <div key="1">
      <h1 style={{ fontSize: 34 }}>Here’s what I found</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Untick anything you don’t want used. Edit wording any time.</p>
      <div className="row" style={{ marginTop: 22, gap: 10 }}>
        <Badge tone="gold" icon={Sparkles}>{claims.filter((c) => c.ok).length} claims approved</Badge>
        <Badge icon={FileText}>Source: your CV</Badge>
        <Badge tone="amber">Unverified until evidence is added</Badge>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        {claims.map((c, i) => (
          <motion.div key={c.t} {...stagger(i, 0.07)} className="row" style={{ padding: '13px 16px', borderBottom: i < claims.length - 1 ? '1px solid var(--line)' : 'none', gap: 14, opacity: c.ok ? 1 : 0.45, transition: 'opacity .25s' }}>
            <button onClick={() => setClaims(claims.map((x, k) => (k === i ? { ...x, ok: !x.ok } : x)))} className="option" style={{ padding: 0, border: 0, width: 'auto', background: 'none' }} aria-label="Approve claim" data-q={`claim-${i}`}>
              <span className="tick" style={{ margin: 0, ...(c.ok ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: '#fff' } : {}) }}>{c.ok && <Check size={12} strokeWidth={3} />}</span>
            </button>
            <div className="grow"><div style={{ fontWeight: 600, textDecoration: c.ok ? 'none' : 'line-through' }}>{c.t}</div><div className="muted small">{c.s}</div></div>
            <Badge>From CV</Badge>
            <button className="btn ghost sm icon" aria-label="Edit"><Pencil size={14} /></button>
          </motion.div>
        ))}
      </div>
    </div>,
    <div key="2">
      <h1 style={{ fontSize: 34 }}>What do you want next?</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Employers see whether you’re compatible — never your exact number unless you share it.</p>
      <div className="card pad" style={{ marginTop: 26 }}>
        <div className="row between"><label style={{ fontWeight: 600, fontSize: 13 }}>Minimum monthly pay (USD)</label><motion.span key={pay} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ fontFamily: 'var(--display)', fontWeight: 750, fontSize: 24 }}>${pay.toLocaleString()}</motion.span></div>
        <input className="range" type="range" min={500} max={5000} step={100} value={pay} onChange={(e) => setPay(+e.target.value)} style={{ '--p': ((pay - 500) / 4500) * 100 + '%', marginTop: 14 }} aria-label="Minimum pay" data-q="pay-range" />
        <div className="row between tiny faint" style={{ marginTop: 6 }}><span>$500</span><span>Market median for your profile: <b style={{ color: 'var(--gold-ink)' }}>$1,950</b></span><span>$5,000+</span></div>
      </div>
      <div className="col" style={{ gap: 22, marginTop: 24 }}>
        <div className="field"><label>Work pattern</label><Segmented id="pattern" options={['Remote', 'Hybrid', 'On-site', 'Flexible']} value={pattern} onChange={setPattern} /></div>
        <div className="field"><label>Locations</label><div className="row wrap" style={{ gap: 8 }}>{['Lagos', 'Abuja', 'Remote — Africa', 'Remote — EU overlap', 'Relocate: UK', 'Relocate: Canada'].map((l) => <button key={l} className={`chip ${locs.includes(l) ? 'on' : ''}`} onClick={() => toggleIn(locs, setLocs, l)}>{l}</button>)}</div></div>
        <div className="field"><label>Career direction</label><div className="row wrap" style={{ gap: 8 }}>{['Senior backend', 'Platform / SRE', 'Engineering manager', 'Staff / principal', 'Data engineering'].map((l, i) => <button key={l} className={`chip ${dirs.includes(l) ? 'on' : ''}`} onClick={() => toggleIn(dirs, setDirs, l)} data-q={`dir-${i}`}>{l}</button>)}</div></div>
        <div className="field"><label>Availability</label><Segmented id="avail" options={['Immediately', '2 weeks notice', '4 weeks notice', 'Just exploring']} value={avail} onChange={setAvail} /></div>
      </div>
    </div>,
    <div key="3">
      <h1 style={{ fontSize: 34 }}>You decide who sees you</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Change this any time. Every contact request can be accepted, deferred or declined.</p>
      <div className="grid g3" style={{ marginTop: 26, gap: 10 }}>
        {[['open', 'Open', 'Discoverable by verified employers', Eye], ['confidential', 'Confidential', 'Invite-only; identity hidden until you accept', EyeOff], ['hidden', 'Hidden', 'Only you can see your profile', Ban]].map(([k, t, d, I], i) => (
          <motion.button key={k} {...stagger(i)} className={`option ${vis === k ? 'on' : ''}`} style={{ flexDirection: 'column', gap: 10 }} onClick={() => setVis(k)} data-q={`vis-${k}`}>
            <div className="row" style={{ width: '100%' }}><span className={`ic-box ${vis === k ? 'dark' : ''}`}><I size={18} /></span><Tick on={vis === k} /></div>
            <div><div style={{ fontWeight: 650 }}>{t}</div><div className="muted small">{d}</div></div>
          </motion.button>
        ))}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="row" style={{ padding: '14px 18px', gap: 14, borderBottom: '1px solid var(--line)' }}>
          <span className="ic-box red"><Ban size={17} /></span>
          <div className="grow"><div style={{ fontWeight: 600 }}>Block my current employer</div><div className="muted small">Kudi Ledger and its recruiters can never see or contact you</div></div>
          <Badge tone="green" icon={Check}>Auto-blocked</Badge>
        </div>
        {[['verified', 'Only verified employers can contact me', 'Companies with confirmed identity and active mandates'], ['salary', 'Hide my exact pay expectation', 'Employers see “compatible” or “not compatible” only'], ['practice', 'Let employers see practice interview results', 'Off by default — practice stays private']].map(([k, t, d]) => (
          <div key={k} className="row" style={{ padding: '14px 18px', gap: 14, borderBottom: '1px solid var(--line)' }}>
            <div className="grow"><div style={{ fontWeight: 600 }}>{t}</div><div className="muted small">{d}</div></div>
            <Toggle on={priv[k]} onChange={(v) => setPriv({ ...priv, [k]: v })} label={t} />
          </div>
        ))}
      </div>
    </div>,
    <div key="4">
      <h1 style={{ fontSize: 34 }}>Add evidence <span className="muted" style={{ fontWeight: 500, fontSize: 20 }}>(optional)</span></h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Evidence raises confidence in your skills — and stops you repeating the same test for every employer.</p>
      <div className="col" style={{ gap: 10, marginTop: 26 }}>
        {[['gh', 'Link GitHub', 'Q reads public repos you choose — nothing private', Github, 'Connected · 3 repos selected'], ['port', 'Portfolio or case study', 'Add a link or upload a write-up', Link2, 'Added · ledger-partitioning.pdf'], ['cert', 'Credential or certificate', 'Q checks with the issuer where possible', Award, 'Verification requested'], ['task', '15-min practice task: debug a slow API', 'Earn a verified skill signal for API reliability', Zap, 'Scheduled for later']].map(([k, t, d, I, done], i) => (
          <motion.div key={k} {...stagger(i)} className="card row" style={{ padding: 16, gap: 14 }}>
            <span className={`ic-box ${evid[k] ? 'green' : ''}`}><I size={18} /></span>
            <div className="grow"><div style={{ fontWeight: 600 }}>{t}</div><AnimatePresence mode="wait"><motion.div key={evid[k] ? 'd' : 'n'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="small" style={{ color: evid[k] ? 'var(--green)' : 'var(--muted)' }}>{evid[k] ? done : d}</motion.div></AnimatePresence></div>
            {evid[k] ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}><Badge tone="green" icon={Check}>Added</Badge></motion.span> : <Button size="sm" onClick={() => setEvid({ ...evid, [k]: true })} data-q={`evid-${k}`}>Add</Button>}
          </motion.div>
        ))}
      </div>
    </div>,
    <div key="5" style={{ textAlign: 'center', paddingTop: 20 }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} style={{ display: 'inline-block' }}><QOrb size={96} thinking /></motion.div>
      <h1 style={{ fontSize: 40, marginTop: 28 }}>Your profile is <span className="serif" style={{ color: 'var(--gold)' }}>live</span> — privately.</h1>
      <p className="muted" style={{ marginTop: 12, fontSize: 16, maxWidth: 520, marginInline: 'auto' }}>You’re in {vis} mode. I found opportunities that fit both ways — including one confidential invite.</p>
      <div className="grid g3" style={{ marginTop: 32, maxWidth: 560, marginInline: 'auto' }}>
        {[[<CountUp key="a" to={3} />, 'mutual matches'], [<CountUp key="b" to={1} />, 'confidential invite'], [<CountUp key="c" to={78} suffix="%" />, 'profile strength']].map(([n, l], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="card pad"><div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 750 }}>{n}</div><div className="muted small">{l}</div></motion.div>
        ))}
      </div>
    </div>,
  ]

  return (
    <OnboardingFrame steps={steps} step={step} setStep={(s) => { setStep(s); if (s === steps.length - 1) setTimeout(() => celebrate(), 300) }} qSays={qLines[step]} canNext={step !== 0 || phase === 'done'} hideNav={step === 0 && phase !== 'done'}
      nextLabel={step === steps.length - 1 ? 'See my matches' : undefined} onFinish={() => nav('/me')}>
      {body[step]}
    </OnboardingFrame>
  )
}
