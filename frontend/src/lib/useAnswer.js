import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import { nextStep } from './flow.js'

/** What happens after "How are you now?": the same on the breathing page and after other help. */
export function useAnswer() {
  const navigate = useNavigate()
  const { session, mark } = useSession()
  return feeling => {
    const step = nextStep(feeling, session.round)
    // asked: she answered at least once (breathing then doesn't start from zero).
    // round: answers since the last fresh start. After "You're getting through it" or the help page, the
    // next "How are you now?" counts as a new beginning: "About the same" offers something else again
    mark({ asked: session.asked + 1, round: step === 'try-else' ? session.round + 1 : 0 })
    if (step === 'passed' || step === 'passing') navigate('/closing', { state: { feeling: step } })
    else if (step === 'try-else') navigate('/try-else')
    else navigate('/not-better')
  }
}
