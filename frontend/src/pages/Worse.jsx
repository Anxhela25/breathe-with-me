import { useAuth } from '../context/AuthContext.jsx'
import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import Button from '../components/Button.jsx'
import { getEmergency, telLink } from '../data/emergency.js'

// symptoms that may not be panic: panic eases, a heart problem gets worse and doesn't go away
const SIGNS = ['Chest pain or pressure', 'Trouble breathing', 'Pain in your arm, jaw or back', 'Feeling faint']

// "Worse": first make sure it isn't a medical emergency, then breathe at her own pace.
export default function Worse() {
  const { user } = useAuth()
  const emergency = getEmergency(user?.country_code)
  return (
    <Screen calm>
      <LongSessionNote />
      <h1 className="mt-12 text-center text-3xl font-bold">I&apos;m here with you.</h1>
      <p className="mt-3 text-center text-lg">Do you have any of these?</p>
      <ul className="mt-5 w-full space-y-2">
        {SIGNS.map(sign => (
          <li key={sign} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-alert" aria-hidden />
            {sign}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        <a href={telLink(emergency)}
          className="flex w-full items-center gap-4 rounded-3xl bg-alert py-3 pr-6 pl-3 text-white shadow-lg shadow-alert/25 active:scale-[0.98]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
            </svg>
          </span>
          <span className="flex-1 text-left leading-tight">
            <span className="block text-xl font-bold">Yes,</span>
            <span className="block text-base opacity-95">Call emergency services</span>
          </span>
          <span aria-hidden className="text-2xl opacity-70">›</span>
        </a>
        {/* panic: just breathe, no timer and no questions */}
        <Button to="/breathe" state={{ stay: true }} variant="outline">No, it&apos;s the panic</Button>
      </div>
    </Screen>
  )
}
