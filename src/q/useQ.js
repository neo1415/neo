import { useCallback, useEffect, useRef, useState } from 'react'

// A tiny conversational runtime. Screens write their flow as an async script:
//   await q.say('…'); const said = await q.hear('expected words'); q.show(<Moment/>); await q.wait('approve')
export function useQ() {
  const [state, setState] = useState('idle')
  const [line, setLine] = useState({ text: '', key: 0 })
  const [expect, setExpect] = useState(null) // { text, hint } while Q waits for the user's voice
  const [heard, setHeard] = useState('') // live transcript of what the user is saying
  const [moment, setMoment] = useState(null)
  const [log, setLog] = useState([])
  const waiters = useRef({})
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const say = useCallback(async (text, { then = 'idle', pace = 1 } = {}) => {
    if (!alive.current) return
    setState('thinking')
    await sleep(500 * pace)
    setState('speaking')
    setLine((l) => ({ text, key: l.key + 1 }))
    await sleep(Math.min(5200, 380 + text.split(' ').length * 150) * pace)
    if (alive.current) setState(then)
  }, [])

  const think = useCallback(async (ms = 1200) => { setState('thinking'); await sleep(ms) }, [])

  // Resolve when the user speaks (mic) or types. `text` is what the demo transcribes when the mic is used.
  const hear = useCallback((text, hint) => new Promise((resolve) => {
    if ('voice' in pending.current) { const v = pending.current.voice; delete pending.current.voice; return resolve(v) }
    setExpect({ text, hint })
    waiters.current.voice = (said) => { setExpect(null); setHeard(''); resolve(said) }
  }), [])

  // Actions taken before Q is ready to listen for them are queued, never dropped.
  const pending = useRef({})
  const wait = useCallback((name) => new Promise((resolve) => {
    if (name in pending.current) { const v = pending.current[name]; delete pending.current[name]; resolve(v) }
    else waiters.current[name] = resolve
  }), [])
  const fire = useCallback((name, value) => {
    const w = waiters.current[name]
    if (w) { delete waiters.current[name]; w(value) } else pending.current[name] = value
  }, [])
  const note = useCallback((text) => setLog((l) => [{ text, t: new Date().toTimeString().slice(0, 5), id: Math.random() }, ...l].slice(0, 8)), [])

  return { state, setState, line, say, think, hear, expect, heard, setHeard, fire, wait, moment, show: setMoment, log, note, sleep }
}
