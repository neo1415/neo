import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Lock, Mic, ShieldCheck } from 'lucide-react'
import QPresence from '../q/QPresence'
import { Avatar, Fact, MomentHead, QLine, ease } from '../ui/kit'
import { useNarrow } from '../ui/Stage'

const demo = [
  { who: 'you', text: 'We need someone who can stop our API failures. Up to $2,000 a month.' },
  { who: 'q', text: 'Got it. One honest flag: senior people here usually ask more. Want options?' },
  { who: 'you', text: 'Strong mid-level is fine.' },
  { who: 'q', text: 'Done. I’ll search tonight and bring you people who’d actually say yes.' },
]

function useHeroDemo() {
  const [i, setI] = useState(-1)
  const [state, setState] = useState('idle')
  useEffect(() => {
    let alive = true
    const run = async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms))
      await wait(1400)
      while (alive) {
        for (let k = 0; k < demo.length && alive; k++) {
          setState(demo[k].who === 'you' ? 'listening' : 'thinking')
          if (demo[k].who === 'q') await wait(700)
          setState(demo[k].who === 'you' ? 'listening' : 'speaking')
          setI(k)
          await wait(demo[k].who === 'you' ? 2800 : 3400)
        }
        setState('working'); await wait(2600); setI(-1); setState('idle'); await wait(1400)
      }
    }
    run()
    return () => { alive = false }
  }, [])
  const cur = demo[i]
  return { state, cur, key: i }
}

const Section = ({ children, style }) => <section style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto', padding: '120px 32px', ...style }}>{children}</section>

export default function Landing() {
  const nav = useNavigate()
  const narrow = useNarrow()
  const d = useHeroDemo()
  const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 0.7, ease } }
  return (
    <div style={{ position: 'relative' }}>
      <div className="atmos" />
      <nav className="topbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(var(--void), rgba(11,10,8,0))' }}>
        <div className="wordmark">Talent <b>Q</b></div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-text hide-sm" onClick={() => nav('/start')}>Sign in</button>
          <button className="btn btn-quiet btn-sm" onClick={() => nav('/start')} data-q="nav-start">Talk to Q</button>
        </div>
      </nav>

      {/* Hero: Q is the product, so Q is the hero. */}
      <header style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '110px 24px 60px' }}>
        <QPresence size={narrow ? 150 : 210} state={d.state} />
        <div style={{ height: 64, marginTop: 6, display: 'grid', placeItems: 'center' }}>
          {d.cur && (
            <motion.p key={d.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 15, maxWidth: 520, color: d.cur.who === 'q' ? 'var(--gold-2)' : 'var(--text-2)' }} className={d.cur.who === 'q' ? 'voice' : ''}>
              {d.cur.who === 'you' && <Mic size={13} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--gold)' }} />}
              {d.cur.who === 'q' ? <span style={{ fontSize: 19 }}>{d.cur.text}</span> : `“${d.cur.text}”`}
            </motion.p>
          )}
        </div>
        <motion.h1 initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.2, duration: 1, ease }} className="voice" style={{ fontSize: narrow ? 52 : 'var(--t-5xl)', lineHeight: 1, marginTop: 18, letterSpacing: '-0.03em' }}>
          Hire by talking.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} className="t2" style={{ fontSize: narrow ? 16 : 19, maxWidth: 560, marginTop: 20, lineHeight: 1.55 }}>
          Talent Q is a recruiter you speak to. It finds people who fit, and who’d actually say yes. Then it brings you only the decisions.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.6, ease }} className="row" style={{ marginTop: 34, gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn btn-primary" style={{ height: 52, padding: '0 26px', fontSize: 15 }} onClick={() => nav('/start?role=hire')} data-q="hero-hire">I’m hiring</button>
          <button className="btn btn-quiet" style={{ height: 52, padding: '0 26px', fontSize: 15 }} onClick={() => nav('/start?role=work')} data-q="hero-work">I’m looking for work</button>
        </motion.div>
      </header>

      <main>
      {/* Three beats, three different compositions. */}
      <Section>
        <motion.div {...reveal} style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div className="label" style={{ color: 'var(--gold)' }}>Say what you need</div>
            <h2 className="voice" style={{ fontSize: narrow ? 36 : 'var(--t-4xl)', marginTop: 14 }}>Describe the work. Not a job title.</h2>
            <p className="t2" style={{ fontSize: 17, marginTop: 16, maxWidth: 440 }}>Q turns a sentence into a real brief: outcomes, must-haves, budget. If the numbers don’t add up, it tells you before wasting anyone’s time.</p>
          </div>
          <div className="moment" style={{ maxWidth: 520 }}>
            <MomentHead label="Brief · v2" right={<span className="label">v1 kept</span>} />
            {[['Role', 'Strong mid-level, 5+ years'], ['First 90 days', 'Cut API incidents to 1 a month'], ['Must have', 'Incident response · PostgreSQL'], ['Budget', '$1,800–2,000 / month']].map(([k, v], i) => (
              <div key={k} className="row" style={{ alignItems: 'baseline', padding: '9px 0', borderTop: i ? '1px solid var(--line)' : 0 }}><span className="label" style={{ width: 120 }}>{k}</span><span style={{ fontSize: 15 }}>{v}</span></div>
            ))}
          </div>
        </motion.div>
      </Section>

      <Section style={{ textAlign: 'center', paddingTop: 40 }}>
        <motion.div {...reveal}>
          <div className="label" style={{ color: 'var(--gold)' }}>Q does the legwork</div>
          <h2 className="voice" style={{ fontSize: narrow ? 36 : 'var(--t-4xl)', margin: '14px auto 0', maxWidth: '18ch' }}>Overnight, quietly, only where people agreed to be found.</h2>
          <div className="row num" style={{ justifyContent: 'center', gap: narrow ? 40 : 120, marginTop: 56 }}>
            {[['575', 'looked at'], ['7', 'fit both ways'], ['0', 'messages sent without you']].map(([n, l], i) => (
              <div key={l}><div className="voice" style={{ fontSize: narrow ? 44 : 72, color: i === 1 ? 'var(--gold)' : 'var(--text)', lineHeight: 1 }}>{n}</div><div className="label" style={{ marginTop: 10 }}>{l}</div></div>
            ))}
          </div>
        </motion.div>
      </Section>

      <Section>
        <motion.div {...reveal} style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div className="moment" style={{ maxWidth: 520, order: narrow ? 2 : 0 }}>
            <MomentHead label="Worth your time" right={<span className="label num">Mutual 87</span>} />
            <div className="row" style={{ gap: 14, marginBottom: 12 }}><Avatar name="Femi Okafor" size={44} /><div><div style={{ fontSize: 17, fontWeight: 560 }}>Femi Okafor</div><div className="t3" style={{ fontSize: 13.5 }}>Senior backend · Lagos</div></div></div>
            <p className="voice" style={{ fontSize: 'var(--t-lg)', marginBottom: 16 }}>“Cut p95 latency 41% on a 30M-request/day payments API.”</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}><Fact k="Pay" v="Fits" tone="ok" /><Fact k="Remote" v="Fits" tone="ok" /><Fact k="Unknown" v="Kubernetes" tone="warn" /></div>
            <div className="row" style={{ gap: 8 }}><span className="btn btn-primary">Ask if he’s interested</span><span className="btn btn-quiet">Why him?</span></div>
          </div>
          <div>
            <div className="label" style={{ color: 'var(--gold)' }}>You make the calls</div>
            <h2 className="voice" style={{ fontSize: narrow ? 36 : 'var(--t-4xl)', marginTop: 14 }}>Q brings you decisions, not dashboards.</h2>
            <p className="t2" style={{ fontSize: 17, marginTop: 16, maxWidth: 440 }}>Every suggestion shows its evidence, where it came from, and what Q doesn’t know. Nothing is sent and no one is rejected without a person saying so.</p>
          </div>
        </motion.div>
      </Section>

      {/* The interview */}
      <Section style={{ paddingTop: 40 }}>
        <motion.div {...reveal} style={{ borderRadius: 28, border: '1px solid var(--line)', background: 'var(--ink-1)', padding: narrow ? 28 : 64, display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1.1fr 1fr', gap: 48, alignItems: 'center', overflow: 'hidden' }}>
          <div>
            <div className="label" style={{ color: 'var(--gold)' }}>The interview</div>
            <h2 className="voice" style={{ fontSize: narrow ? 34 : 'var(--t-4xl)', marginTop: 14 }}>Q interviews. People decide.</h2>
            <p className="t2" style={{ fontSize: 17, marginTop: 16 }}>Structured questions built from the brief. Text, voice or video, whichever the candidate prefers. If the signal drops, nothing is lost. You can watch live, or read the transcript later with Q’s notes beside it.</p>
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 28 }}>
            <QPresence size={140} state="speaking" />
            <div style={{ width: 150, aspectRatio: '3/4', borderRadius: 18, border: '1px solid var(--line-2)', background: 'radial-gradient(120% 90% at 70% 10%, #3a3125, #15130f 70%)', position: 'relative' }}><span className="label" style={{ position: 'absolute', left: 10, bottom: 10, color: 'var(--text)' }}>Candidate</span></div>
          </div>
        </motion.div>
      </Section>

      {/* Candidates */}
      <Section style={{ textAlign: 'center' }}>
        <motion.div {...reveal}>
          <div className="label" style={{ color: 'var(--gold)' }}>Looking for work?</div>
          <h2 className="voice" style={{ fontSize: narrow ? 36 : 'var(--t-4xl)', margin: '14px auto 0', maxWidth: '20ch' }}>Be found for what you can do, on your terms.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(3, 1fr)', gap: 32, marginTop: 56, textAlign: 'left' }}>
            {[[Lock, 'Confidential by default', 'Your employer never sees you. Companies see only what you allow.'], [ShieldCheck, 'No more silence', 'Employers commit to a reply date. Q tells you the moment anything changes.'], [Mic, 'Free, always', 'Practice interviews, keep your evidence, and never pay to be seen.']].map(([I, t, dsc]) => (
              <div key={t} style={{ borderTop: '1px solid var(--line-2)', paddingTop: 20 }}><I size={18} style={{ color: 'var(--gold)' }} /><div style={{ fontSize: 17, marginTop: 14 }}>{t}</div><p className="t2" style={{ fontSize: 15, marginTop: 6 }}>{dsc}</p></div>
            ))}
          </div>
          <button className="btn btn-quiet" style={{ marginTop: 48, height: 50, padding: '0 24px' }} onClick={() => nav('/start?role=work')}>Build my private profile</button>
        </motion.div>
      </Section>

      {/* Pricing as a quiet table, not a card grid */}
      <Section style={{ paddingTop: 40 }}>
        <motion.div {...reveal}>
          <div className="label" style={{ color: 'var(--gold)' }}>Pricing</div>
          <h2 className="voice" style={{ fontSize: narrow ? 32 : 'var(--t-3xl)', marginTop: 14 }}>Employers pay. Candidates never do.</h2>
          <div style={{ marginTop: 36 }}>
            {[['Pilot', 'One role for 30 days', '$129'], ['Growth', 'Up to three open roles', '$349 / mo'], ['Agency', 'Many clients, one ledger', '$799 / mo'], ['Enterprise', 'Governance, residency, integrations', 'From $24k / yr']].map(([n, dsc, p]) => (
              <div key={n} className="row" style={{ padding: '20px 0', borderTop: '1px solid var(--line)', gap: 20 }}>
                <span style={{ width: narrow ? 90 : 180, fontSize: 17 }}>{n}</span><span className="grow t2">{dsc}</span><span className="voice num" style={{ fontSize: 'var(--t-xl)' }}>{p}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </Section>

      <Section style={{ textAlign: 'center', paddingBottom: 80 }}>
        <motion.div {...reveal} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <QPresence size={110} state="idle" />
          <h2 className="voice" style={{ fontSize: narrow ? 40 : 'var(--t-4xl)', marginTop: 10 }}>Say hello to Q.</h2>
          <button className="btn btn-primary" style={{ marginTop: 26, height: 52, padding: '0 28px' }} onClick={() => nav('/start')}>Start talking</button>
        </motion.div>
      </Section>
      </main>
      <footer className="row t3" style={{ position: 'relative', zIndex: 1, justifyContent: 'space-between', padding: '28px 32px', borderTop: '1px solid var(--line)', fontSize: 13, flexWrap: 'wrap', gap: 12 }}>
        <span className="wordmark" style={{ fontSize: 15 }}>Talent <b>Q</b></span>
        <span>Privacy · Candidate rights · How Q makes suggestions</span>
      </footer>
    </div>
  )
}
