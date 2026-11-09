import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
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
      <p className="mt-8 text-sm text-sage/60">Step {step + 1} of {STEPS.length}</p>
      <div key={step} className="mt-auto mb-auto flex flex-col items-center">
        <span className="text-9xl font-bold text-sage">{number}</span>
        <span className="mt-4 text-2xl">{text}</span>
      </div>
      <div className="flex w-full flex-col items-center gap-2">
        <Button onClick={next}>{last ? 'Done' : 'Next'}</Button>
        <Button to="/breathe" variant="link">Back to breathing</Button>
      </div>
    </Screen>
  )
}
