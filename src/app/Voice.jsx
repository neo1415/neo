import { useNavigate } from 'react-router-dom'
import Hire from '../screens/Hire'

// Voice mode from the workspace: the ambient home, picking up today's most important decision.
export default function Voice() {
  const nav = useNavigate()
  return <Hire at="decide" onBack={() => nav('/app/today')} />
}
