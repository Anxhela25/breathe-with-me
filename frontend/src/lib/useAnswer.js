import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import { nextStep } from './flow.js'

/** What happens after "How are you now?" (breathing page and after other help). */
export function useAnswer() {
  const navigate = useNavigate()
  const { session, mark } = useSession()
  return feeling => {
    const step = nextStep(feeling, session.round)
    // asked: answered at least once (then breathing doesn't start from zero).
    // round: answers since the last fresh start. After "You're getting through it" or the help page
    // the next answer is a new start, so "About the same" offers something else again
    mark({ asked: session.asked + 1, round: step === 'try-else' ? session.round + 1 : 0 })
    if (step === 'passed' || step === 'passing') navigate('/closing', { state: { feeling: step } })
    else if (step === 'try-else') navigate('/try-else')
    else if (step === 'worse') navigate('/worse')
    else navigate('/not-better')
  }
}
