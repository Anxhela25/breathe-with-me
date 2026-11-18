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
          className="block w-full rounded-3xl bg-alert px-6 py-4 text-center text-lg font-bold text-white shadow-lg shadow-alert/20 active:scale-[0.98]">
          Yes · Call emergency {emergency}
        </a>
        {/* panic: just breathe, no timer and no questions */}
        <Button to="/breathe" state={{ stay: true }} variant="outline">No, it&apos;s the panic</Button>
      </div>
    </Screen>
  )
}
