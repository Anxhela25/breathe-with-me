import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { nextStep } from '../lib/flow.js'

export default function CheckIn() {
  const navigate = useNavigate()
  const { session, recordLevel, mark } = useSession()

  // the rules are in lib/flow.js (with tests)
  function pick(level) {
    const previous = session.lastLevel
    recordLevel(level)
    const minutes = session.startedAt ? (Date.now() - session.startedAt) / 60000 : 0
    const { step, long } = nextStep(level, 'checkin', {
      previous, usedGrounding: session.usedGrounding, usedQuiet: session.usedQuiet, minutes,
    })
    if (step === 'closing') navigate('/closing')
    else if (step === 'still-there') navigate('/closing', { state: { rising: true } })
    else if (step === 'grounding') navigate('/grounding')
    else if (step === 'quiet') {
      mark({ usedQuiet: true })
      navigate('/breathe', { state: { quiet: true } })
    } else navigate('/not-better', { state: { long } })
  }

  return (
    <Screen>
      <div className="mt-16 flex h-64 w-64 items-center justify-center" aria-hidden>
        <div className="h-40 w-40 rounded-full bg-pistachio" />
      </div>
      <div className="mt-24 w-full">
        <NumberPicker question="How do you feel now, 1 to 10?" onPick={pick} />
      </div>
    </Screen>
  )
}
