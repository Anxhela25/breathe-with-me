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


export default function UrgentHelp() {
  const { user } = useAuth()
  const emergency = getEmergency(user?.country_code)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    if (user) listContacts().then(setContacts).catch(() => setContacts([]))
  }, [user])

  return (
    <Screen>
      <Orb icon="phone" className="mt-10" />
      <h1 className="mt-6 text-3xl font-bold">You are not alone.</h1>
      <p className="mt-2 text-center text-sage/80">Please reach out to someone now.</p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <EmergencyButton href={telLink(emergency)} title="Emergency services" subtitle={`Call ${emergency}`} />
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
        {contacts.length > 0 && <p className="text-sm text-sage/70">Call someone you trust</p>}
        {contacts.map(c => (
          <a key={c.id} href={`tel:${c.phone}`}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm shadow-sage/10 active:scale-[0.98]">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavender font-bold text-sage-dark">
              {(c.name?.[0] ?? '?').toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">{c.name}</span>
              <span className="block text-sm text-sage/70">{formatPhone(c.phone)}</span>
            </span>
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-white"><PhoneIcon /></span>
          </a>
        ))}
        {user && contacts.length === 0 && (
          <Button to="/settings" variant="link">Add someone you trust</Button>
        )}
      </div>
    </Screen>
  )
}
