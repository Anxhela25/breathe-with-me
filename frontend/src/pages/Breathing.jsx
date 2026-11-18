import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import Button from '../components/Button.jsx'
import BreathingCircle from '../components/BreathingCircle.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { getEmergency, telLink } from '../data/emergency.js'
import { listContacts } from '../lib/api.js'
import { nextStep } from '../lib/flow.js'

// in seconds; lower them while testing
const ASK_AFTER_S = 60  // one full minute of breathing before the first question
const STRONG_RECHECK_S = 120  // 8-10: 2 more minutes, then the question again
const BACK_S = 120  // coming back to breathing: 2 minutes, then "How do you feel now?"

export default function Breathing() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, recordLevel, start, mark } = useSession()
  const [startedAt] = useState(() => session.startedAt ?? Date.now())
  const [now, setNow] = useState(Date.now())
  // 'start' (first minute, then the question) | 'strong' (2 more minutes for 8-10) | 'check' (asked again)
  const [state, setState] = useState('start')
  const [strongSince, setStrongSince] = useState(null)
  // coming back (from the chat, grounding or urgent help): no new start, 2 minutes, then "How do you feel now?"
  const [returning] = useState(() => location.state?.stay === true || session.lastLevel != null)
  // from "Not feeling better yet?": breathe as long as she wants, no timer and no more questions
  const [stay] = useState(() => location.state?.stay === true)
  const [backSince] = useState(() => (returning && !stay ? Date.now() : null))

  useEffect(() => { if (!session.startedAt) start() }, [session.startedAt, start])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = (now - startedAt) / 1000

  // end of the 2 more minutes: ask again
  useEffect(() => {
    if (state === 'strong' && (now - strongSince) / 1000 >= STRONG_RECHECK_S) setState('check')
  }, [state, strongSince, now])

  // coming back: after 2 minutes ask how she feels, so breathing never goes on with no end
  useEffect(() => {
    if (backSince && (now - backSince) / 1000 >= BACK_S) navigate('/check-in')
  }, [backSince, now, navigate])

  // the rules are in lib/flow.js (with tests)
  function pick(level) {
    recordLevel(level)
    const step = nextStep(level, 'breathing', { usedGrounding: session.usedGrounding, strongRounds: session.strongRounds })
    if (step === 'finish') navigate('/closing')
    else if (step === 'grounding') navigate('/grounding')
    else if (step === 'not-better') navigate('/not-better')
    else {
      mark({ strongRounds: 1 })
      setStrongSince(Date.now())
      setState('strong')
    }
  }

  const showQuestion = !returning && ((state === 'start' && elapsed >= ASK_AFTER_S) || state === 'check')
  const firstMinute = state === 'start' && !showQuestion && !returning
  // a ring closes around the circle until the next question, so she can see it's going somewhere
  let progress = null
  if (firstMinute) progress = elapsed / ASK_AFTER_S
  if (state === 'strong') progress = (now - strongSince) / 1000 / STRONG_RECHECK_S
  if (backSince) progress = (now - backSince) / 1000 / BACK_S

  return (
    <Screen
      footer={(state !== 'start' || returning || session.crisisShown) && !stay && (
        <Button to="/urgent" variant="link" className="text-xs text-sage/70">I need urgent help</Button>
      )}
    >
      <LongSessionNote />
      <div className="mt-16"><BreathingCircle progress={progress} /></div>
      <p className="mt-8 text-base">
        {firstMinute && 'Breathe with me for 1 minute.'}
        {(state === 'strong' || backSince) && 'Breathe with me for 2 more minutes.'}
        {stay && "Breathe at your own pace. I'm here."}
        {!firstMinute && state !== 'strong' && !backSince && !stay && <>Follow the circle. I&apos;m here.</>}
      </p>

      <div className="mt-20 flex w-full flex-col items-center gap-3">
        {showQuestion && <NumberPicker question="How strong is it right now, 1 to 10?" onPick={pick} />}
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        {stay && <StayHelp />}
        {/* "I feel better" is the answer: straight to the end, no number asked */}
        {returning && <Button to="/closing">I feel better</Button>}
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

