import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import Button from '../components/Button.jsx'
import BreathingCircle from '../components/BreathingCircle.jsx'
import FeelingPicker from '../components/FeelingPicker.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { getEmergency, telLink } from '../data/emergency.js'
import { listContacts } from '../lib/api.js'
import { LONG_SESSION_MIN } from '../lib/flow.js'
import { useAnswer } from '../lib/useAnswer.js'

// in seconds; lower them while testing
const ASK_AFTER_S = 120  // 2 minutes of breathing, then "How are you now?"
const BACK_S = 120  // coming back to breathing: 2 more minutes, then "How are you now?"

export default function Breathing() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, start } = useSession()
  const answer = useAnswer()
  const [startedAt] = useState(() => session.startedAt ?? Date.now())
  const [now, setNow] = useState(Date.now())
  // from "Not feeling better yet?": breathe as long as she wants, no timer and no more questions
  const [stay] = useState(() => location.state?.stay === true)
  // from "You're getting through it": breathe at her own pace; she says when it passed or when it doesn't
  const [ownPace] = useState(() => location.state?.ownPace === true)
  // coming back (she already answered once): 2 more minutes, then the question again
  const [returning] = useState(() => stay || ownPace || session.asked > 0)
  const [backSince] = useState(() => (returning && !stay && !ownPace ? Date.now() : null))

  useEffect(() => { if (!session.startedAt) start() }, [session.startedAt, start])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = (now - startedAt) / 1000

  useEffect(() => {
    if (backSince && (now - backSince) / 1000 >= BACK_S) navigate('/check-in')
  }, [backSince, now, navigate])

  const showQuestion = !returning && elapsed >= ASK_AFTER_S
  const firstPart = !returning && !showQuestion
  // a ring closes around the circle until the question, so she can see it's going somewhere
  let progress = null
  if (firstPart) progress = elapsed / ASK_AFTER_S
  if (backSince) progress = (now - backSince) / 1000 / BACK_S

  return (
    <Screen
      footer={!stay && !ownPace && <Button to="/urgent" variant="link" className="text-xs text-sage/70">I need urgent help</Button>}
    >
      <LongSessionNote />
      <div className="mt-16"><BreathingCircle progress={progress} /></div>
      <p className="mt-8 text-base">
        {firstPart && 'Breathe with me for 2 minutes.'}
        {backSince && 'Breathe with me for 2 more minutes.'}
        {(stay || ownPace) && "Breathe at your own pace. I'm here."}
        {showQuestion && <>Follow the circle. I&apos;m here.</>}
      </p>

      <div className="mt-12 flex w-full flex-col items-center gap-3">
        {showQuestion && <FeelingPicker onPick={answer} />}
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        {stay && <StayHelp />}
        {ownPace && <OwnPaceNote minutes={(now - session.startedAt) / 60000} />}
        {/* these buttons are the answer: straight on, no question asked */}
        {ownPace && <Button to="/closing" state={{ feeling: 'passed' }}>I&apos;m fine now</Button>}
        {ownPace && <Button to="/not-better" variant="outline">It&apos;s not passing</Button>}
        {returning && !ownPace && <Button to="/closing" state={{ feeling: 'passing' }}>I feel better</Button>}
      </div>
    </Screen>
  )
}

// own-pace breathing: while it's under 20 minutes, the reassurance; after that the doctor note at the top says more
function OwnPaceNote({ minutes }) {
  if (!(minutes < LONG_SESSION_MIN)) return null
  return (
    <p className="mb-2 max-w-xs text-center text-sm text-sage/80 text-balance">
      Panic usually passes within 20 minutes. If you have chest pain, contact a doctor or emergency services.
    </p>
  )
}

// in "stay" breathing: the people she trusts and the emergency number, one tap away
function StayHelp() {
  const { user } = useAuth()
  const emergency = getEmergency(user?.country_code)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    if (user) listContacts().then(setContacts).catch(() => setContacts([]))
  }, [user])

  const small = 'flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm active:scale-[0.98]'
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <p className="max-w-xs text-center text-xs text-sage/70 text-balance">
        If you have chest pain, or it lasts longer, contact a doctor or emergency services.
      </p>
      <div className="flex w-full flex-wrap gap-2">
        {contacts.slice(0, 2).map(c => (
          <a key={c.id} href={`tel:${c.phone}`} className={`${small} border-sage text-sage`}>Call {c.name}</a>
        ))}
        <a href={telLink(emergency)} className={`${small} border-alert text-alert`}>Emergency {emergency}</a>
      </div>
    </div>
  )
}

