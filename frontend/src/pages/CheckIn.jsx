import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import FeelingPicker from '../components/FeelingPicker.jsx'
import Landscape from '../components/Landscape.jsx'
import { useAnswer } from '../lib/useAnswer.js'

// "How are you now?" after grounding, chat or more breathing (see lib/flow.js)
export default function CheckIn() {
  const answer = useAnswer()
  return (
    <Screen>
      <LongSessionNote />
      {/* landscape from the breathing circle, still breathing slowly */}
      <div className="relative mt-12 flex h-56 w-56 items-center justify-center" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-white/80" />
        <span className="absolute inset-5 rounded-full bg-white/40 animate-halo" />
        <div className="relative h-40 w-40 overflow-hidden rounded-full shadow-[0_14px_40px_-14px_rgba(47,65,54,0.45)] ring-4 ring-white/70 animate-breathe">
          <Landscape />
        </div>
      </div>
      <div className="mt-8 w-full">
        <FeelingPicker onPick={answer} />
      </div>
    </Screen>
  )
}
