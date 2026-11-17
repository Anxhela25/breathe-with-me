import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useSession } from '../context/SessionContext.jsx'

const LIGHT = 4  // same as "light" on the breathing screen

export default function CheckIn() {
  const navigate = useNavigate()
  const { session, recordLevel, mark } = useSession()

  function pick(level) {
    recordLevel(level)
    // "You did it" only when it's really light: 10 -> 8 is better, but still a lot
    if (level <= LIGHT) navigate('/closing')
    // second time it hasn't eased, or the choices were already offered: no new loop, show them
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
