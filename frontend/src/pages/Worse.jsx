import { useAuth } from '../context/AuthContext.jsx'
import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import Button from '../components/Button.jsx'
import Orb from '../components/Orb.jsx'
import EmergencyButton from '../components/EmergencyButton.jsx'
import { getEmergency, telLink } from '../data/emergency.js'

const line = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
  strokeLinecap: 'round', strokeLinejoin: 'round', className: 'h-6 w-6', 'aria-hidden': true,
}

// symptoms that may not be panic: panic eases, a heart problem gets worse and doesn't go away
const SIGNS = [
  ['Chest pain or pressure', <svg key="chest" {...line}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    <path d="M7.5 11.5h2.5l1-2 2 4 1-2h2.5" />
  </svg>],
  ['Trouble breathing', <svg key="lungs" {...line}>
    <path d="M12 4v8M12 12c-1 .8-2 1.2-3 1.2M12 12c1 .8 2 1.2 3 1.2" />
    <path d="M9.5 8C6.5 7.5 4 10.5 4 14.5 4 17.5 5 20 7 20s3-1.5 3-4.5V9" />
    <path d="M14.5 8c3-.5 5.5 2.5 5.5 6.5 0 3-1 5.5-3 5.5s-3-1.5-3-4.5V9" />
  </svg>],
  ['Pain in your arm, jaw or back', <svg key="body" {...line}>
    <circle cx="11" cy="6.5" r="3" />
    <path d="M5 21v-2.5A6 6 0 0 1 11 12.5a6 6 0 0 1 6 6V21" />
    <path d="M19 8.5l2-1M19.5 11.5h2" />
  </svg>],
  ['Feeling faint', <svg key="faint" {...line}>
    <path d="M12 12.5a1.5 1.5 0 1 1 1.5-1.5 3.5 3.5 0 1 1-3.5-3.5A5.5 5.5 0 1 1 6.5 13" />
  </svg>],
]

// "Worse": first make sure it isn't a medical emergency, then breathe at her own pace.
export default function Worse() {
  const { user } = useAuth()
  const emergency = getEmergency(user?.country_code)
  return (
    <Screen calm>
      <LongSessionNote />
      <Orb icon="heart" halo className="mt-8" />
      <h1 className="mt-6 text-center text-3xl font-bold">I&apos;m here with you.</h1>
      <p className="mt-2 text-center text-sage/80">First, let&apos;s make sure it&apos;s panic.</p>

      {/* one soft card to read, not four buttons to choose from */}
      <section aria-labelledby="signs-title" className="mt-6 w-full rounded-3xl bg-white/90 px-4 pt-4 pb-5 shadow-sm shadow-sage/10">
        <h2 id="signs-title" className="text-center text-xs font-bold tracking-[0.18em] text-alert/80 uppercase">
          Signs it may not be panic
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
          {SIGNS.map(([label, icon]) => (
            <li key={label} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-alert/10 text-alert">{icon}</span>
              <span className="text-[15px] leading-snug">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        <p className="font-display text-xl font-bold">Do you have any of these?</p>
        <EmergencyButton href={telLink(emergency)} title="Yes," subtitle="Call emergency services" />
        {/* panic: just breathe, no timer and no questions */}
        <Button to="/breathe" state={{ stay: true }} variant="outline">No, it&apos;s the panic</Button>
      </div>
    </Screen>
  )
}
