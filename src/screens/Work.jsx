import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Keyboard, Lock, Mic, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Stage from '../ui/Stage'
import { Fact, Lens, MomentHead } from '../ui/kit'
import { useQ } from '../q/useQ'
import { emit, isFilm, waitFor } from '../q/bus'

const param = (k) => new URLSearchParams(window.location.hash.split('?')[1] || '').get(k)
const keep = () => (isFilm() ? '&film=1' : '')

function InviteMoment({ onYes, onSee, onLater }) {
  return (
    <div className="moment">
      <MomentHead label="Confidential" right={<span className="row label" style={{ gap: 6 }}><Lock size={12} /> Your employer can’t see this</span>} />
      <p className="voice" style={{ fontSize: 'var(--t-xl)' }}>A 42-person fintech in Lagos</p>
      <p className="t2" style={{ fontSize: 15, marginTop: 2 }}>Backend Engineer · make their payments API reliable</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, margin: '18px 0' }}>
        <Fact k="Pay" v="$1.8–2k · fits" tone="ok" /><Fact k="Work" v="Remote · fits" tone="ok" /><Fact k="Replies" v="Within 3 days" />
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onYes} data-q="interested">I’m interested</button>
        <button className="btn btn-quiet" onClick={onSee} data-q="what-see">What will they see?</button>
        <button className="btn btn-text" onClick={onLater}>Not now</button>
      </div>
    </div>
  )
}

function FormatMoment({ onStart }) {
  const [f, setF] = useState('voice')
  const opts = [['text', Keyboard, 'Text', 'Lightest on data'], ['voice', Mic, 'Voice', '~15 minutes'], ['video', Video, 'Video', 'Optional']]
  return (
    <div className="moment">
      <MomentHead label="Interview with Q · for Paystride" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
        {opts.map(([k, I, t, d]) => (
          <button key={k} onClick={() => setF(k)} data-q={`fmt-${k}`} style={{ textAlign: 'left', padding: 14, borderRadius: 14, border: `1px solid ${f === k ? 'var(--gold-line)' : 'var(--line)'}`, background: f === k ? 'var(--gold-dim)' : 'transparent', transition: 'all .15s' }}>
            <I size={18} style={{ color: f === k ? 'var(--gold)' : 'var(--text-2)' }} />
            <div style={{ fontSize: 15, marginTop: 10 }}>{t}</div><div className="t3" style={{ fontSize: 12.5 }}>{d}</div>
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" onClick={() => onStart(f)} data-q="start-now">Start now</button>
        <button className="btn btn-text">Later today</button>
      </div>
    </div>
  )
}

function OfferMoment({ onAccept }) {
  return (
    <div className="moment">
      <MomentHead label="Offer · Paystride" right={<span className="label">Reply by Nov 5</span>} />
      <p className="voice" style={{ fontSize: 'var(--t-3xl)', lineHeight: 1 }}>$2,000<span className="t3" style={{ fontSize: 'var(--t-lg)' }}> / month</span></p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, margin: '18px 0' }}>
        <Fact k="Pay" v="Above your $1.8k" tone="ok" /><Fact k="Work" v="Remote · WAT" tone="ok" /><Fact k="Starts" v="December 1" tone="ok" />
      </div>
      <p className="t2" style={{ fontSize: 14, marginBottom: 18, lineHeight: 1.55 }}><span className="label" style={{ color: 'var(--gold)', marginRight: 8 }}>Q’s take</span>It meets everything you asked for. Similar roles pay $1.9–2.3k. You can ask questions without losing the offer.</p>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-gold" onClick={onAccept} data-q="accept-offer">Accept offer</button>
        <button className="btn btn-quiet">Ask a question</button>
      </div>
    </div>
  )
}

function DisclosureLens() {
  const [s, set] = useState({ summary: true, evidence: true, employer: false, pay: false })
  const rows = [['summary', 'Your summary and experience'], ['evidence', 'Three verified pieces of evidence'], ['employer', 'Your current employer’s name'], ['pay', 'Your exact pay expectation']]
  return (
    <div style={{ maxWidth: 560 }}>
      <p className="voice" style={{ fontSize: 'var(--t-2xl)', margin: '8px 0 24px' }}>If you say yes, they’ll see only what you allow.</p>
      {rows.map(([k, t]) => (
        <button key={k} onClick={() => set({ ...s, [k]: !s[k] })} className="row" style={{ width: '100%', padding: '16px 0', borderTop: '1px solid var(--line)', textAlign: 'left' }} data-q={`share-${k}`}>
          <span className="grow" style={{ fontSize: 15.5, color: s[k] ? 'var(--text)' : 'var(--text-3)' }}>{t}</span>
          <span style={{ width: 40, height: 24, borderRadius: 99, background: s[k] ? 'var(--gold)' : 'var(--ink-3)', position: 'relative', transition: 'background .2s' }}><motion.i layout style={{ position: 'absolute', top: 3, left: s[k] ? 19 : 3, width: 18, height: 18, borderRadius: 99, background: '#fff8ec' }} /></span>
        </button>
      ))}
      <p className="t3" style={{ fontSize: 13, marginTop: 16 }}>Kudi Ledger, your current employer, is blocked automatically.</p>
    </div>
  )
}

export default function Work() {
  const q = useQ()
  const nav = useNavigate()
  const [lens, setLens] = useState(false)
  const [bloom, setBloom] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const M = (key, node) => q.show({ key, node })
    const at = param('at') || 'invite'

    const invite = async () => {
      await q.say('Morning, Femi. Nothing urgent yet — I’m keeping an eye out.', { then: 'working' })
      await waitFor('invite_sent', { fallbackMs: 2500 })
      q.note('Confidential interest from a fintech')
      await q.say('Someone wants to talk. It’s confidential — Kudi Ledger can’t see any of this.')
      let a
      do {
        M('inv', <InviteMoment onYes={() => q.fire('act', 'yes')} onSee={() => q.fire('act', 'see')} onLater={() => q.fire('act', 'later')} />)
        a = await q.wait('act')
        if (a === 'see') { setLens(true); await q.wait('lensClosed') }
      } while (a === 'see')
      emit('invite_accepted')
      q.note('Said yes · shared 3 items of evidence')
      q.show(null)
      await q.say('Done. They’re Paystride. They see your summary and three pieces of evidence — nothing else.', { then: 'working' })
      await waitFor('interview_invited', { fallbackMs: 3000 })
      await q.say('They’d like me to interview you. Four questions. Now, or later today?')
      M('fmt', <FormatMoment onStart={(f) => q.fire('start', f)} />)
      const f = await q.wait('start')
      nav(`/work/interview?mode=${f}${keep()}`)
    }

    const after = async () => {
      await q.say('Paystride promised a reply within three days. I’ll tell you the moment anything moves.', { then: 'working' })
      await waitFor('offer_sent', { fallbackMs: 4000 })
      q.note('Offer from Paystride')
      setBloom(true); setTimeout(() => setBloom(false), 2500)
      await q.say('Paystride made you an offer.')
      M('offer', <OfferMoment onAccept={() => q.fire('accept')} />)
      await q.wait('accept')
      emit('offer_accepted')
      q.show(null)
      setBloom(true)
      await q.say('Congratulations, Femi. I’ve hidden your profile — your evidence comes with you.', { then: 'done' })
    }
    ;({ invite, after }[at] || invite)()
  }, [])

  return (
    <>
      <Stage workspace="/you/today" q={q} user="Femi Okafor" focus="Confidential mode" bloom={bloom} />
      <Lens open={lens} onClose={() => { setLens(false); q.fire('lensClosed') }} title="What Paystride will see" width={640}><DisclosureLens /></Lens>
    </>
  )
}
