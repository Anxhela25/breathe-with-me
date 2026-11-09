import { useEffect, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { getEmergency } from '../data/emergency.js'
import { useAuth } from '../context/AuthContext.jsx'
import { listContacts } from '../lib/api.js'

const card = 'rounded-2xl border border-alert/40 bg-alert/5 p-4 text-center text-alert'

export default function UrgentHelp() {
  const { user } = useAuth()
  const { emergency, crisisLine } = getEmergency(user?.country_code)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    if (user) listContacts().then(setContacts).catch(() => setContacts([]))
  }, [user])

  return (
    <Screen>
      <h1 className="mt-10 text-3xl font-bold">You are not alone.</h1>
      <p className="mt-2 text-center text-sage/80">Please reach out to someone now.</p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <a href={`tel:${emergency}`} className={card}>
          Emergency services: <strong className="text-xl">{emergency}</strong>
        </a>
        {crisisLine && (
          <a href={`tel:${crisisLine}`} className={card}>
            Crisis line: <strong className="text-xl">{crisisLine}</strong>
          </a>
        )}
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
        {contacts.length > 0 && <p className="text-sm text-sage/70">Call someone you trust</p>}
        {contacts.map(c => (
          <a key={c.id} href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
            className="block w-full rounded-3xl bg-sage px-6 py-4 text-center text-lg font-bold text-white">
            {c.name} <span className="block text-sm font-normal opacity-90">{c.phone}</span>
          </a>
        ))}
        {user && contacts.length === 0 && (
          <Button to="/settings" variant="link">Add someone you trust</Button>
        )}
        <Button to="/breathe" variant="link">Back to breathing</Button>
      </div>
    </Screen>
  )
}
