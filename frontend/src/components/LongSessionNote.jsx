import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { getEmergency, telLink } from '../data/emergency.js'
import { LONG_SESSION_MIN } from '../lib/flow.js'

/**
 * After 20 minutes in a session: a calm note at the top of the help pages. It doesn't take her
 * anywhere (she may be at 2 and almost done, or in the middle of a breath); it just puts the advice and
 * the emergency number in front of her. OK closes it for the rest of the session.
 */
export default function LongSessionNote() {
  const { session, mark } = useSession()
  const { user } = useAuth()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  if (!session.startedAt || session.longNoteClosed) return null
  if ((now - session.startedAt) / 60000 < LONG_SESSION_MIN) return null

  const emergency = getEmergency(user?.country_code)
  return (
    <div role="status" className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-30 px-4 animate-fade-in">
      <div className="mx-auto max-w-md rounded-2xl border border-alert/30 bg-white p-4 shadow-lg shadow-sage/10">
        <p className="font-bold">It&apos;s been {LONG_SESSION_MIN} minutes.</p>
        <p className="mt-0.5 text-sm">If it isn&apos;t easing, please contact a doctor.</p>
        <div className="mt-3 flex gap-2">
          <a href={telLink(emergency)}
            className="flex-1 rounded-xl border border-rose-soft/30 bg-blush px-3 py-2 text-center text-sm font-bold text-rose active:scale-[0.98]">
            Emergency {emergency}
          </a>
          <button type="button" onClick={() => mark({ longNoteClosed: true })}
            className="flex-1 rounded-xl border border-sage px-3 py-2 text-sm text-sage active:bg-pistachio">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
