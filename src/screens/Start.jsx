import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, FileText, Upload } from 'lucide-react'
import Stage from '../ui/Stage'
import { MomentHead, ease } from '../ui/kit'
import { useQ } from '../q/useQ'
import { isFilm } from '../q/bus'

const param = (k) => new URLSearchParams(window.location.hash.split('?')[1] || '').get(k)
const film = () => (isFilm() ? '&film=1' : '')

function RoleMoment({ onPick }) {
  return (
    <div className="moment" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 10 }}>
      {[['hire', 'I’m hiring', 'Find people, run interviews'], ['work', 'I’m looking for work', 'Private, and free']].map(([k, t, d]) => (
        <button key={k} onClick={() => onPick(k)} data-q={`role-${k}`} style={{ textAlign: 'left', padding: 20, borderRadius: 16, border: '1px solid var(--line)', transition: 'background .15s, border-color .15s' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--gold-line)')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}>
          <div style={{ fontSize: 17 }}>{t}</div><div className="t3" style={{ fontSize: 13.5, marginTop: 4 }}>{d}</div>
        </button>
      ))}
    </div>
  )
}

function SignInMoment({ role, onDone }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <div className="moment">
      <MomentHead label={sent ? 'Check your email' : 'Sign in'} />
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="s" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <p style={{ fontSize: 15.5 }}>We sent a sign-in link to <span style={{ color: 'var(--gold-2)' }}>{email}</span>.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onDone} data-q="open-link">Open the link</button>
          </motion.div>
        ) : (
          <motion.div key="f" exit={{ opacity: 0 }}>
            <button className="btn btn-quiet" style={{ width: '100%', height: 50 }} onClick={onDone} data-q="google">
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
              Continue with Google
            </button>
            <div className="row t3" style={{ margin: '14px 0', fontSize: 12 }}><span className="hairline grow" />or<span className="hairline grow" /></div>
            <div className="row" style={{ gap: 8 }}>
              <input className="field" aria-label="Email address" placeholder={role === 'work' ? 'you@email.com' : 'you@company.com'} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && setSent(true)} data-q="email" />
              <button className="btn btn-primary" style={{ height: 52 }} disabled={!email.includes('@')} onClick={() => setSent(true)} data-q="email-go">Send link</button>
            </div>
            <p className="t3" style={{ fontSize: 12.5, marginTop: 12 }}>No password. We email you a link that signs you in.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ClaimMoment({ claims, onDone }) {
  const [i, setI] = useState(0)
  const yes = () => (i + 1 >= claims.length ? onDone() : setI(i + 1))
  return (
    <div className="moment">
      <MomentHead label="From your CV · you approve each one" right={<span className="label num">{i + 1} of {claims.length}</span>} />
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28, ease }}>
          <p className="voice" style={{ fontSize: 'var(--t-xl)' }}>{claims[i][0]}</p>
          <p className="t3" style={{ fontSize: 14, marginTop: 4 }}>{claims[i][1]}</p>
        </motion.div>
      </AnimatePresence>
      <div className="row" style={{ gap: 8, marginTop: 18 }}>
        <button className="btn btn-primary" onClick={yes} data-q="claim-yes"><Check size={15} /> That’s right</button>
        <button className="btn btn-quiet">Edit</button>
        <button className="btn btn-text" onClick={yes}>Leave it out</button>
      </div>
    </div>
  )
}

function PayMoment({ onDone }) {
  const [v, setV] = useState(1800)
  return (
    <div className="moment">
      <MomentHead label="Private · employers only see whether it fits" />
      <p className="voice num" style={{ fontSize: 'var(--t-3xl)' }}>${v.toLocaleString()}<span className="t3" style={{ fontSize: 'var(--t-lg)' }}> / month</span></p>
      <input type="range" min={600} max={4000} step={100} value={v} onChange={(e) => setV(+e.target.value)} aria-label="Minimum monthly pay" data-q="pay"
        style={{ width: '100%', margin: '16px 0 6px', accentColor: '#d9b56b' }} />
      <p className="t3" style={{ fontSize: 13 }}>People with your evidence usually earn $1,700–2,300 here.</p>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onDone(v)} data-q="pay-ok">That’s my minimum</button>
    </div>
  )
}

function ChoiceMoment({ label, options, onPick }) {
  return (
    <div className="moment">
      <MomentHead label={label} />
      <div className="col" style={{ gap: 8 }}>
        {options.map(([k, t, d]) => (
          <button key={k} onClick={() => onPick(t)} data-q={`choice-${k}`} className="row" style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: '1px solid var(--line)' }}>
            <span className="grow"><span style={{ display: 'block', fontSize: 15 }}>{t}</span>{d && <span className="t3" style={{ fontSize: 13 }}>{d}</span>}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ConnectMoment({ onDone }) {
  const [c, setC] = useState(null)
  return (
    <div className="moment">
      <MomentHead label="Your workspace" />
      {[['Company', 'Paystride · Lagos'], ['Hiring in', 'Nigeria, and remote'], ['Rules', 'Nigeria Data Protection Act · a person makes every decision']].map(([k, v], i) => (
        <div key={k} className="row" style={{ alignItems: 'baseline', padding: '9px 0', borderTop: i ? '1px solid var(--line)' : 0 }}><span className="label" style={{ width: 110, flexShrink: 0 }}>{k}</span><span style={{ fontSize: 15 }}>{v}</span></div>
      ))}
      <div className="row" style={{ gap: 8, marginTop: 18 }}>
        {c === 'done' ? <span className="chip ok"><Check size={13} /> Calendar connected</span> : <button className="btn btn-quiet" onClick={() => { setC('busy'); setTimeout(() => setC('done'), 1200) }} data-q="calendar">{c === 'busy' ? 'Connecting…' : 'Connect Google Calendar'}</button>}
        <button className="btn btn-primary" onClick={onDone} data-q="workspace-ok">Looks right</button>
      </div>
    </div>
  )
}

function DropOnQ({ onFile }) {
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const go = () => { setBusy(true); setTimeout(onFile, 1600) }
  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); go() }} className="moment" style={{ textAlign: 'center', borderStyle: 'dashed', borderColor: over ? 'var(--gold)' : 'var(--line-2)', transition: 'border-color .2s' }}>
      <AnimatePresence mode="wait">
        {busy ? (
          <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="row" style={{ justifyContent: 'center', gap: 12 }}>
            <motion.span animate={{ y: [0, -40], opacity: [1, 0], scale: [1, 0.6] }} transition={{ duration: 1.2 }}><FileText size={22} style={{ color: 'var(--gold)' }} /></motion.span>
            <span className="t2">Femi_Okafor_CV.pdf · reading</span>
          </motion.div>
        ) : (
          <motion.div key="i" exit={{ opacity: 0 }}>
            <p className="t2" style={{ fontSize: 15 }}>Drop your CV here. I leave out your age, photo, religion and marital status.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={go} data-q="cv"><Upload size={15} /> Choose a file</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Start() {
  const q = useQ()
  const nav = useNavigate()
  const started = useRef(false)
  const [who, setWho] = useState('You')

  useEffect(() => {
    if (started.current) return
    started.current = true
    const M = (key, node) => q.show({ key, node })
    ;(async () => {
      let role = param('role')
      if (!role) {
        await q.say('Hi, I’m Q. Are you hiring, or looking for work?')
        M('role', <RoleMoment onPick={(r) => q.fire('voice', r)} />)
        role = await q.hear('I’m hiring.', 'Tap one, or just tell me')
        role = /hir/i.test(role) ? 'hire' : 'work'
      } else {
        await q.say(role === 'hire' ? 'Hi, I’m Q. Let’s find you someone good.' : 'Hi, I’m Q. Let’s find you something good.', { pace: 0.8 })
      }
      M('sign', <SignInMoment role={role} onDone={() => q.fire('signed')} />)
      await q.say('First, so I remember you next time.')
      await q.wait('signed')
      q.show(null)

      if (role === 'hire') {
        setWho('Ada Nwosu')
        await q.say('Welcome, Ada. What’s the company called?')
        await q.hear('Paystride. We’re a payments startup in Lagos.')
        q.note('Paystride · payments · Lagos')
        await q.say('Nice. Where do you hire?')
        await q.hear('Mostly Nigeria, and some remote.')
        q.note('Hiring in Nigeria and remote')
        M('ws', <ConnectMoment onDone={() => q.fire('ok')} />)
        await q.say('Then I’ll follow Nigeria’s data law, and a person makes every hiring decision. That part can’t be turned off.')
        await q.wait('ok')
        q.show(null)
        await q.say('All set. Let’s talk about who you need.', { then: 'working' })
        await q.sleep(800)
        nav(`/hire?at=brief${film()}`)
      } else {
        setWho('Femi Okafor')
        M('cv', <DropOnQ onFile={() => q.fire('file')} />)
        await q.say('Welcome, Femi. Give me your CV, or just tell me what you do.')
        await q.wait('file')
        q.show(null)
        await q.think(1400)
        q.note('Read CV · 2 pages')
        M('claims', <ClaimMoment onDone={() => q.fire('claims')} claims={[['Senior backend engineer at Kudi Ledger', '2021 to now · Lagos'], ['Cut p95 latency 41% on a payments API', 'Achievement · I’ll mark it unverified until there’s evidence'], ['PostgreSQL, Node and Go', 'Skills · 6 years'], ['Led 14 incident post-mortems', 'Experience']]} />)
        await q.say('Here’s what I found. Nothing is used until you say it’s right.')
        await q.wait('claims')
        q.note('4 claims approved')
        M('pay', <PayMoment onDone={(v) => q.fire('pay', v)} />)
        await q.say('What’s the least you’d take each month?')
        await q.wait('pay')
        M('vis', <ChoiceMoment label="Visibility" options={[['conf', 'Keep me confidential', 'Only invited employers see you. Kudi Ledger never does.'], ['open', 'Let verified employers find me', '']]} onPick={(t) => q.fire('voice', t)} />)
        await q.say('Should Kudi Ledger be able to see you here?')
        await q.hear('No — keep me confidential.', 'Tap one, or tell me')
        q.note('Confidential · Kudi Ledger blocked')
        q.show(null)
        await q.say('Done. You’re invisible to them. I’ll only bring you things that fit.', { then: 'working' })
        await q.sleep(800)
        nav(`/work?at=invite${film()}`)
      }
    })()
  }, [])

  return <Stage q={q} user={who} />
}
