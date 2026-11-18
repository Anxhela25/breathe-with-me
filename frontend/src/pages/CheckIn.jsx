import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import FeelingPicker from '../components/FeelingPicker.jsx'
import { useAnswer } from '../lib/useAnswer.js'

// "How are you now?" after grounding, the chat or more breathing (rules in lib/flow.js)
export default function CheckIn() {
  const answer = useAnswer()
  return (
    <Screen>
      <LongSessionNote />
      <div className="mt-16 flex h-56 w-56 items-center justify-center" aria-hidden>
        <div className="h-36 w-36 rounded-full bg-pistachio" />
      </div>
      <div className="mt-10 w-full">
        <FeelingPicker onPick={answer} />
      </div>
    </Screen>
  )
}
