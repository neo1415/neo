import { createContext, useContext, useEffect, useState } from 'react'
import { baseRequirements, pipelineSeed } from './data'

const Ctx = createContext(null)
const KEY = 'talentq-state-v1'
const initial = {
  user: { name: 'Ada Nwosu', email: 'ada@paystride.co', role: 'employer', company: 'Paystride' },
  candidateUser: { name: 'Femi Okafor', email: 'femi.okafor@mail.com' },
  reqs: baseRequirements,
  mandateVersion: 2,
  pipeline: pipelineSeed,
  inviteStatus: 'pending',
  interviewDone: false,
  offerAccepted: false,
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return initial }
  })
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  }, [state])
  const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
  const reset = () => setState(initial)
  useEffect(() => { window.__tq = { set, reset } })
  return <Ctx.Provider value={{ ...state, set, reset }}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
