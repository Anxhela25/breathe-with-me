import { useEffect, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { getEmergency, telLink } from '../data/emergency.js'
import { useAuth } from '../context/AuthContext.jsx'
import { listContacts } from '../lib/api.js'
import { formatPhone } from '../lib/phone.js'
import Orb from '../components/Orb.jsx'
import EmergencyButton from '../components/EmergencyButton.jsx'
import { PhoneIcon } from '../components/Icons.jsx'

/** Panic as a wave: it rises, peaks and falls into calm water, where a small boat waits. */
function PanicWave() {
  return (
    <figure className="mt-auto flex w-full flex-col items-center pt-8">
      <svg viewBox="0 0 300 90" className="w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#DCD0F0" stopOpacity="0.9" />
            <stop offset="1" stopColor="#DCD0F0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wave-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#B9A6E0" />
            <stop offset="0.55" stopColor="#B9A6E0" />
            <stop offset="1" stopColor="#8FA99A" />
          </linearGradient>
        </defs>
        <path d="M0 74C40 74 60 68 90 44c20-18 35-28 50-28 20 0 35 18 55 38 25 20 55 20 105 20v16H0z" fill="url(#wave-fill)" />
        <path d="M0 74C40 74 60 68 90 44c20-18 35-28 50-28 20 0 35 18 55 38 25 20 55 20 105 20"
          fill="none" stroke="url(#wave-line)" strokeWidth="3" strokeLinecap="round" />
        {/* the boat on the calm water after the wave */}
        <g transform="translate(250 50)">
          <path d="M11 1v19" stroke="#4A6355" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M12 3l9 15h-9z" fill="#FFFFFF" stroke="#8FA99A" strokeWidth="1" />
          <path d="M1 21h22l-4 5H5z" fill="#4A6355" />
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-sage/70">Like a wave, panic rises, peaks, and passes.</figcaption>
    </figure>
  )
}

// Reached when the 2 more minutes (8-10) or grounding (5-7) didn't help (rules in lib/flow.js).
// No more questions from here: people to call, the emergency number, or breathing at her own pace.
export default function NotBetter() {
  const { user } = useAuth()
  const emergency = getEmergency(user?.country_code)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    if (user) listContacts().then(setContacts).catch(() => setContacts([]))
  }, [user])

  return (
    <Screen calm>
      <Orb icon="heart" halo className="mt-12" />
      <h1 className="mt-6 text-center text-3xl font-bold">Not feeling better yet?</h1>
      <p className="mt-3 text-center text-lg text-pretty">
        That&apos;s okay. Panic usually passes within 20 minutes.
      </p>
      <p className="mt-6 max-w-xs text-center text-sm text-sage/70 text-balance">
        If you have chest pain, or it lasts longer, contact a doctor or emergency services.
      </p>

      <PanicWave />

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        {contacts.length > 0 && <p className="text-sm text-sage/70">You don&apos;t have to do this alone</p>}
        {contacts.map(c => (
          <a key={c.id} href={`tel:${c.phone}`}
            className="flex w-full items-center gap-3 rounded-3xl bg-white p-3 text-left shadow-sm shadow-sage/10 active:scale-[0.98]">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavender font-bold text-sage-dark">
              {(c.name?.[0] ?? '?').toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">Call {c.name}</span>
              <span className="block text-sm text-sage/70">{formatPhone(c.phone)}</span>
            </span>
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-white"><PhoneIcon /></span>
          </a>
        ))}
        <EmergencyButton href={telLink(emergency)} title="Emergency services" subtitle={`Call ${emergency}`} />
        {/* stay: breathing with no timer and no more questions, help one tap away */}
        <Button to="/breathe" state={{ stay: true }} variant="link">Keep breathing</Button>
        {user && contacts.length === 0 && (
          <Button to="/settings" variant="link" className="-mt-2 text-sage/70">Add someone you trust</Button>
        )}
      </div>
    </Screen>
  )
}
