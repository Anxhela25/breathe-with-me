import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useSession } from '../context/SessionContext.jsx'

export default function CheckIn() {
  const navigate = useNavigate()
  const { session, recordLevel } = useSession()

  function pick(level) {
    const previous = session.lastLevel
    recordLevel(level)
    const lower = previous == null ? level < 8 : level < previous
    if (lower) navigate('/closing')
    else navigate('/breathe', { state: { soft: true } })
  }

  return (
    <Screen>
      <div className="mt-10 h-32 w-32 rounded-full bg-pistachio" aria-hidden />
      <div className="mt-10 w-full">
        <NumberPicker question="How do you feel now, 1 to 10?" onPick={pick} />
      </div>
    </Screen>
  )
}
