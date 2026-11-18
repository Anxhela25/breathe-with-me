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
  // coming back (she already answered once): 2 more minutes, then the question again
  const [returning] = useState(() => stay || session.asked > 0)
  const [backSince] = useState(() => (returning && !stay ? Date.now() : null))

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
      footer={!stay && <Button to="/urgent" variant="link" className="text-xs text-sage/70">I need urgent help</Button>}
    >
      <LongSessionNote />
      <div className="mt-16"><BreathingCircle progress={progress} /></div>
      <p className="mt-8 text-base">
        {firstPart && 'Breathe with me for 2 minutes.'}
        {backSince && 'Breathe with me for 2 more minutes.'}
        {stay && "Breathe at your own pace. I'm here."}
        {showQuestion && <>Follow the circle. I&apos;m here.</>}
      </p>

      <div className="mt-12 flex w-full flex-col items-center gap-3">
        {showQuestion && <FeelingPicker onPick={answer} />}
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        {stay && <StayHelp />}
        {/* "I feel better" is the answer: straight to the end, no question asked */}
        {returning && <Button to="/closing" state={{ feeling: 'passing' }}>I feel better</Button>}
      </div>
    </Screen>
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

