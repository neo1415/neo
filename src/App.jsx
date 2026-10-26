import { AnimatePresence } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import Landing from './pages/public/Landing'
import { Login, Signup, Verify, Forgot } from './pages/public/Auth'
import EmployerOnboarding from './pages/public/EmployerOnboarding'
import CandidateOnboarding from './pages/public/CandidateOnboarding'
import Scene from './pages/public/Scene'

import EmployerShell from './pages/employer/Shell'
import Dashboard from './pages/employer/Dashboard'
import Intake from './pages/employer/Intake'
import Shortlist from './pages/employer/Shortlist'
import Pipeline from './pages/employer/Pipeline'
import Assessment from './pages/employer/Assessment'
import Decision from './pages/employer/Decision'
import Agents from './pages/employer/Agents'
import Agency from './pages/employer/Agency'
import Analytics from './pages/employer/Analytics'
import Governance from './pages/employer/Governance'

import CandidateShell from './pages/candidate/Shell'
import Home from './pages/candidate/Home'
import Invite from './pages/candidate/Invite'
import Interview from './pages/candidate/Interview'
import Rehearsal from './pages/candidate/Rehearsal'
import Evidence from './pages/candidate/Evidence'
import Applications from './pages/candidate/Applications'
import Growth from './pages/candidate/Growth'
import Offer from './pages/candidate/Offer'
import Privacy from './pages/candidate/Privacy'

export default function App() {
  const loc = useLocation()
  const top = loc.pathname.split('/')[1] || 'home'
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  return (
    <AnimatePresence mode="wait">
      <Routes location={loc} key={top === 'app' || top === 'me' ? top : loc.pathname + loc.search}>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/onboarding/employer" element={<EmployerOnboarding />} />
        <Route path="/onboarding/candidate" element={<CandidateOnboarding />} />
        <Route path="/scene/:id" element={<Scene />} />
        <Route path="/app" element={<EmployerShell />}>
          <Route index element={<Dashboard />} />
          <Route path="intake" element={<Intake />} />
          <Route path="shortlist" element={<Shortlist />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="assess" element={<Assessment />} />
          <Route path="decision" element={<Decision />} />
          <Route path="agents" element={<Agents />} />
          <Route path="agency" element={<Agency />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="governance" element={<Governance />} />
        </Route>
        <Route path="/me" element={<CandidateShell />}>
          <Route index element={<Home />} />
          <Route path="invite" element={<Invite />} />
          <Route path="interview" element={<Interview />} />
          <Route path="rehearsal" element={<Rehearsal />} />
          <Route path="evidence" element={<Evidence />} />
          <Route path="applications" element={<Applications />} />
          <Route path="growth" element={<Growth />} />
          <Route path="offer" element={<Offer />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}
