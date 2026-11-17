import { useEffect, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { getEmergency, telLink } from '../data/emergency.js'
import { useAuth } from '../context/AuthContext.jsx'
import { listContacts } from '../lib/api.js'
import { formatPhone } from '../lib/phone.js'

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
)

// Reached when breathing twice didn't lower the number. No more 1-10 questions from here:
// asking again and again keeps her watching the fear. Instead, something different to do.
export default function NotBetter() {
  const { user } = useAuth()
  const emergency = getEmergency(user?.country_code)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    if (user) listContacts().then(setContacts).catch(() => setContacts([]))
  }, [user])

  return (
    <Screen calm>
      <div className="mt-12 flex h-24 w-24 items-center justify-center rounded-full bg-pistachio" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-10 w-10 stroke-sage" fill="none" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
      </div>
      <h1 className="mt-6 text-center text-3xl font-bold">Not feeling better yet?</h1>
      <p className="mt-3 max-w-xs text-center text-lg text-balance">
        That&apos;s okay. Panic usually passes within 20 minutes.
      </p>
      <p className="mt-6 max-w-xs text-center text-sm text-sage/70 text-balance">
        If you have chest pain, or it lasts longer, contact a doctor or emergency services.
      </p>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        {contacts.length > 0 && <p className="text-sm text-sage/70">You don&apos;t have to do this alone</p>}
        {contacts.map(c => (
          <a key={c.id} href={`tel:${c.phone}`}
            className="flex w-full items-center justify-center gap-3 rounded-3xl bg-sage px-6 py-4 text-white shadow-lg shadow-sage/20 active:scale-[0.98]">
            <PhoneIcon />
            <span className="text-left">
              <span className="block text-lg font-bold">Call {c.name}</span>
              <span className="block text-sm opacity-90">{formatPhone(c.phone)}</span>
            </span>
          </a>
        ))}
        <a href={telLink(emergency)}
          className="flex w-full items-center justify-center gap-2 rounded-3xl border border-alert px-6 py-3 text-alert active:scale-[0.98]">
          <PhoneIcon /> Emergency services <strong>{emergency}</strong>
        </a>
        {/* quiet: the circle only, no more questions */}
        <Button to="/breathe" state={{ quiet: true }} variant="link">Keep breathing</Button>
        {user && contacts.length === 0 && (
          <Button to="/settings" variant="link" className="-mt-2 text-sage/70">Add someone you trust</Button>
        )}
      </div>
    </Screen>
  )
}
