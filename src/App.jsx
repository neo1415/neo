import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import Landing from './screens/Landing'
import Start from './screens/Start'
import Hire from './screens/Hire'
import Work from './screens/Work'
import Interview from './screens/Interview'
import Film from './film/Film'
import Shell, { workCfg } from './app/Shell'
import { Applications, Evidence, Jobs, Privacy, YouChat, YouToday } from './app/You'
import Chat from './app/Chat'
import Voice from './app/Voice'
import { ActivityPage, Interviews, People, PersonPage, RolePage, Roles, Today } from './app/Pages'

export default function App() {
  const loc = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={/^\/(app|you)(\/|$)/.test(loc.pathname) && !loc.pathname.startsWith('/app/voice') ? loc.pathname.split('/')[1] : loc.pathname + loc.search} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }} transition={{ duration: 0.5 }}>
        <Routes location={loc}>
          <Route path="/" element={<Landing />} />
          <Route path="/start" element={<Start />} />
          <Route path="/hire" element={<Hire />} />
          <Route path="/work" element={<Work />} />
          <Route path="/work/interview" element={<Interview />} />
          <Route path="/film" element={<Film />} />
          <Route path="/app/voice" element={<Voice />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<Today />} />
            <Route path="today" element={<Today />} />
            <Route path="chat/:id" element={<Chat />} />
            <Route path="roles" element={<Roles />} />
            <Route path="roles/:id" element={<RolePage />} />
            <Route path="people" element={<People />} />
            <Route path="people/:id" element={<PersonPage />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="activity" element={<ActivityPage />} />
          </Route>
          <Route path="/you" element={<Shell cfg={workCfg} />}>
            <Route index element={<YouToday />} />
            <Route path="today" element={<YouToday />} />
            <Route path="chat/:id" element={<YouChat />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="applications" element={<Applications />} />
            <Route path="evidence" element={<Evidence />} />
            <Route path="privacy" element={<Privacy />} />
          </Route>
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
