import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import Landing from './screens/Landing'
import Start from './screens/Start'
import Hire from './screens/Hire'
import Work from './screens/Work'
import Interview from './screens/Interview'
import Film from './film/Film'

export default function App() {
  const loc = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={loc.pathname + loc.search} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }} transition={{ duration: 0.5 }}>
        <Routes location={loc}>
          <Route path="/" element={<Landing />} />
          <Route path="/start" element={<Start />} />
          <Route path="/hire" element={<Hire />} />
          <Route path="/work" element={<Work />} />
          <Route path="/work/interview" element={<Interview />} />
          <Route path="/film" element={<Film />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
