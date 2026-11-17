import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useSession } from '../context/SessionContext.jsx'

const LIGHT = 4  // same groups as the breathing screen: 1-4 light, 5-7 medium, 8-10 strong
const MEDIUM = 7

export default function CheckIn() {
  const navigate = useNavigate()
  const { session, recordLevel, mark } = useSession()

  // where to go depends on the number now, not on what happened before
  function pick(level) {
    recordLevel(level)
    if (level <= LIGHT) navigate('/closing')
    // grounding once; if it's still 5-7 after that, quiet breathing instead of the same exercise again
    else if (level <= MEDIUM) {
      if (session.usedGrounding) navigate('/breathe', { state: { quiet: true } })
      else navigate('/grounding')
    }
    // 8-10: the "not feeling better" choices if they were shown or it's the second time; else breathe again
    else if (session.notBetterShown || session.checkInMissed) navigate('/not-better')
    else {
      mark({ checkInMissed: true })
      navigate('/breathe', { state: { soft: true } })
    }
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
