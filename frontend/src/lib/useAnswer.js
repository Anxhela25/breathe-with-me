import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import { nextStep } from './flow.js'

/** What happens after "How are you now?": the same on the breathing page and after other help. */
export function useAnswer() {
  const navigate = useNavigate()
  const { session, mark } = useSession()
  return feeling => {
    const step = nextStep(feeling, session.asked)
    mark({ asked: session.asked + 1 })
    if (step === 'passed' || step === 'passing') navigate('/closing', { state: { feeling: step } })
    else if (step === 'try-else') navigate('/try-else')
    else navigate('/not-better')
  }
}
