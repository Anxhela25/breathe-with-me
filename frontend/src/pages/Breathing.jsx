import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import BreathingCircle from '../components/BreathingCircle.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { nextStep } from '../lib/flow.js'

// in seconds; lower them while testing
const ASK_AFTER_S = 60  // one full minute of breathing before the first question
const STRONG_RECHECK_S = 120
const KEEP_S = 120  // "Keep breathing" or coming back to breathing: this long, then "How do you feel now?"

export default function Breathing() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, recordLevel, start, mark } = useSession()
  const [startedAt] = useState(() => session.startedAt ?? Date.now())
  const [now, setNow] = useState(Date.now())
  // 'start' | 'light' (chat offered) | 'medium' (grounding offered) | 'strong' (2-minute round) | 'check'
  const [state, setState] = useState('start')
  const [strongSince, setStrongSince] = useState(null)
  const [goingDown, setGoingDown] = useState(false)
  // coming back to breathing (from the chat, grounding, urgent help, "Not feeling better yet?"...):
  // no new start, no question here; 2 minutes with the ring, then "How do you feel now?"
  const [returning] = useState(() => location.state?.quiet === true || session.lastLevel != null)
  // set when she taps "Keep breathing" on an offer, or right away when returning
  const [keepSince, setKeepSince] = useState(() => (returning ? Date.now() : null))

  useEffect(() => { if (!session.startedAt) start() }, [session.startedAt, start])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = (now - startedAt) / 1000

  // end of a strong round: ask again
  useEffect(() => {
    if (state === 'strong' && strongSince && (now - strongSince) / 1000 >= STRONG_RECHECK_S) setState('check')
  }, [state, strongSince, now])

  // end of the extra 2 minutes: ask how she feels, so breathing never goes on with no end
  useEffect(() => {
    if (keepSince && (now - keepSince) / 1000 >= KEEP_S) navigate('/check-in')
  }, [keepSince, now, navigate])

  // the rules are in lib/flow.js (with tests)
  function pick(level) {
    const previous = session.lastLevel
    recordLevel(level)
    const { step, goingDown: lower } = nextStep(level, 'breathing', {
      previous, afterRound: state === 'check', strongRounds: session.strongRounds, minutes: elapsed / 60,
    })
    if (step === 'not-better') {
      navigate('/not-better')
      return
    }
    setKeepSince(null)
    if (step === 'strong-round') {
      mark({ strongRounds: session.strongRounds + 1 })
      setGoingDown(lower)
      setStrongSince(Date.now())
      setState('strong')
    } else setState(step === 'offer-chat' ? 'light' : 'medium')
  }

  const showQuestion = !returning && ((state === 'start' && elapsed >= ASK_AFTER_S) || state === 'check')
  const offerOpen = keepSince === null
  const chatPaused = session.crisisShown
  // a ring closes around the circle until the next question, so she can see it's going somewhere
  const firstMinute = state === 'start' && !showQuestion && !returning
  let progress = null
  if (firstMinute) progress = elapsed / ASK_AFTER_S
  if (state === 'strong' && strongSince) progress = (now - strongSince) / 1000 / STRONG_RECHECK_S
  if (keepSince) progress = (now - keepSince) / 1000 / KEEP_S

  return (
    <Screen
      footer={(state === 'strong' || chatPaused || returning) && (
        <Button to="/urgent" variant="link" className="text-xs text-sage/70">I need urgent help</Button>
      )}
    >
      <div className="mt-16"><BreathingCircle progress={progress} /></div>
      <p className="mt-8 text-base">
        {firstMinute && 'Breathe with me for 1 minute.'}
        {state === 'strong' && (goingDown ? "It's going down. 2 more minutes." : 'Breathe with me for 2 minutes.')}
        {keepSince && 'Breathe with me for 2 more minutes.'}
        {!firstMinute && state !== 'strong' && !keepSince && <>Follow the circle. I&apos;m here.</>}
      </p>

      <div className="mt-20 flex w-full flex-col items-center gap-3">
        {showQuestion && <NumberPicker question="How strong is it right now, 1 to 10?" onPick={pick} />}

      </div>

      {/* offers at the bottom, like the buttons on every page */}
      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        {/* the chat stays paused after a crisis, so offer a way to finish instead */}
        {state === 'light' && offerOpen && !chatPaused && (
          <Offer text="Would you like to chat?" action="Chat with me" to="/chat" onKeep={() => setKeepSince(Date.now())} />
        )}
        {state === 'light' && offerOpen && chatPaused && (
          <Offer text="Are you feeling a bit calmer?" action="I feel a bit better" to="/check-in"
            onKeep={() => setKeepSince(Date.now())} />
        )}
        {state === 'medium' && offerOpen && (
          <Offer text="Try grounding together?" action="Start grounding" to="/grounding" onKeep={() => setKeepSince(Date.now())} />
        )}
        {returning && <Button to="/check-in">I feel a bit better</Button>}
        {(state === 'light' || state === 'medium') && !offerOpen && (
          <Button to="/check-in" variant="outline">I feel a bit better</Button>
        )}
      </div>
    </Screen>
  )
}

function Offer({ text, action, to, onKeep }) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <p className="text-base">{text}</p>
      <Button to={to}>{action}</Button>
      <Button variant="link" onClick={onKeep}>Keep breathing</Button>
    </div>
  )
}
