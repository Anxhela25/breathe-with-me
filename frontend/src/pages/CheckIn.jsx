import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { nextStep } from '../lib/flow.js'

export default function CheckIn() {
  const navigate = useNavigate()
  const { session, recordLevel } = useSession()

  // the rules are in lib/flow.js (with tests)
  function pick(level) {
    recordLevel(level)
    const step = nextStep(level, 'checkin', { usedGrounding: session.usedGrounding, strongRounds: session.strongRounds })
    if (step === 'finish') navigate('/closing')
    else if (step === 'grounding') navigate('/grounding')
    else navigate('/not-better')
  }

  return (
    <Screen>
      <LongSessionNote />
      <div className="mt-16 flex h-64 w-64 items-center justify-center" aria-hidden>
        <div className="h-40 w-40 rounded-full bg-pistachio" />
      </div>
      <div className="mt-24 w-full">
        <NumberPicker question="How do you feel now, 1 to 10?" onPick={pick} />
      </div>
    </Screen>
  )
}
