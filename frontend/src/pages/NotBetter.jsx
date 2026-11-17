import { useEffect, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { getEmergency, telLink } from '../data/emergency.js'
import { useAuth } from '../context/AuthContext.jsx'
import { listContacts } from '../lib/api.js'
import { formatPhone } from '../lib/phone.js'

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
    <Screen>
      <h1 className="mt-10 text-center text-3xl font-bold">Not feeling better yet?</h1>
      <p className="mt-3 max-w-xs text-center text-sage/80 text-balance">
        That&apos;s okay. Panic usually passes within 20 minutes, even when it feels endless.
      </p>

      <a href={telLink(emergency)}
        className="mt-8 block w-full rounded-2xl border border-alert/40 bg-alert/5 p-4 text-center text-alert">
        Emergency services: <strong className="text-xl">{emergency}</strong>
      </a>
      <p className="mt-3 max-w-xs text-center text-sm text-sage/80 text-balance">
        If you have chest pain, or it lasts more than 20 minutes, contact a doctor or emergency services.
      </p>

      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
        {contacts.length > 0 && <p className="text-sm text-sage/70">You don&apos;t have to do this alone</p>}
        {contacts.map(c => (
          <a key={c.id} href={`tel:${c.phone}`}
            className="block w-full rounded-3xl bg-sage px-6 py-4 text-center text-lg font-bold text-white">
            Call {c.name} <span className="block text-sm font-normal opacity-90">{formatPhone(c.phone)}</span>
          </a>
        ))}
        <Button to="/grounding" variant={contacts.length ? 'outline' : 'primary'}>Try grounding</Button>
        {/* quiet: the circle only, no more questions */}
        <Button to="/breathe" state={{ quiet: true }} variant="link">Keep breathing</Button>
        {user && contacts.length === 0 && (
          <Button to="/settings" variant="link" className="text-sage/70">Add someone you trust</Button>
        )}
      </div>
    </Screen>
  )
}
