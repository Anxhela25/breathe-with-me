import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import Button from '../components/Button.jsx'
import { useSession } from '../context/SessionContext.jsx'

const STEPS = [
  [5, 'things you can see'],
  [4, 'things you can touch'],
  [3, 'things you can hear'],
  [2, 'things you can smell'],
  [1, 'thing you can taste'],
]

export default function Grounding() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const { mark } = useSession()
  const [number, text] = STEPS[step]
  const last = step === STEPS.length - 1

  function next() {
    if (step === 0) mark({ usedGrounding: true })
    if (last) navigate('/check-in')
    else setStep(step + 1)
  }

  return (
    <Screen>
      <LongSessionNote />
      <p className="mt-6 text-xs font-bold tracking-[0.2em] text-sage/60 uppercase">Step {step + 1} of {STEPS.length}</p>
      <div key={step} className="mt-auto mb-auto flex flex-col items-center animate-fade-in">
        {/* number in a lavender glow with a faint ring */}
        <div className="relative flex h-60 w-60 items-center justify-center">
          <span aria-hidden className="absolute inset-0 rounded-full border border-white/80" />
          <span aria-hidden className="absolute inset-6 rounded-full border border-sage/10"
            style={{ background: 'radial-gradient(circle, #E9E1F5 0%, rgba(233,225,245,0.55) 55%, rgba(233,225,245,0) 75%)' }} />
          <span className="relative font-display text-9xl font-bold text-sage">{number}</span>
        </div>
        <span className="mt-4 text-2xl">{text}</span>
        <Pebbles count={STEPS.length} current={step} />
      </div>
      <div className="flex w-full flex-col items-center gap-2">
        <Button onClick={next}>{last ? 'Done' : 'Next'}</Button>
        <Button to="/breathe" variant="link">Back to breathing</Button>
      </div>
    </Screen>
  )
}

const TILT = [-8, 6, -4, 8, -6]

/** Five pebbles: lavender = done, white = current, grey = still to come. */
function Pebbles({ count, current }) {
  return (
    <div className="mt-6 flex items-center gap-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const look = i < current ? 'w-5 bg-orb'
          : i === current ? 'w-6 bg-white shadow-md shadow-sage/20 ring-1 ring-sage/10'
          : 'w-4 bg-sage/15'
        return <span key={i} className={`h-3.5 rounded-full ${look}`} style={{ transform: `rotate(${TILT[i % TILT.length]}deg)` }} />
      })}
    </div>
  )
}
