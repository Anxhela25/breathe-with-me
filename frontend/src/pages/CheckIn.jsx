import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useSession } from '../context/SessionContext.jsx'

const LIGHT = 4  // same as "light" on the breathing screen

export default function CheckIn() {
  const navigate = useNavigate()
  const { session, recordLevel } = useSession()

  function pick(level) {
    const previous = session.lastLevel
    recordLevel(level)
    // finish when it eased, or when it's light anyway (after a 1 there's no lower number to give)
    const better = level <= LIGHT || (previous == null ? level < 8 : level < previous)
    if (better) navigate('/closing')
    else navigate('/breathe', { state: { soft: true } })
  }

  return (
    <Screen>
      <div className="mt-10 h-32 w-32 rounded-full bg-pistachio" aria-hidden />
      <div className="mt-auto w-full pt-8">
        <NumberPicker question="How do you feel now, 1 to 10?" onPick={pick} />
      </div>
    </Screen>
  )
}
