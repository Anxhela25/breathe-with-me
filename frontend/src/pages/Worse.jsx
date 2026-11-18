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
          className="flex w-full items-center justify-center gap-3 rounded-3xl bg-alert px-6 py-4 text-white shadow-lg shadow-alert/20 active:scale-[0.98]">
          <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
          </svg>
          <span className="text-left leading-tight">
            <span className="block text-lg font-bold">Yes, I have one</span>
            <span className="block text-sm opacity-90">Call emergency services · {emergency}</span>
          </span>
        </a>
        {/* panic: just breathe, no timer and no questions */}
        <Button to="/breathe" state={{ stay: true }} variant="outline">No, it&apos;s the panic</Button>
      </div>
    </Screen>
  )
}
