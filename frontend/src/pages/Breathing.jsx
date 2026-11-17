import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import BreathingCircle from '../components/BreathingCircle.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useSession } from '../context/SessionContext.jsx'

// in seconds; lower them while testing
const ASK_AFTER_S = 60  // one full minute of breathing before the first question
const OFFER_AFTER_S = 60
const STRONG_RECHECK_S = 120
const KEEP_S = 120  // "Keep breathing" on an offer: this long, then "How do you feel now?"

function stateFor(level) {
  if (level <= 4) return 'light'
  if (level <= 7) return 'medium'
  return 'strong'
}

export default function Breathing() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, recordLevel, start, mark } = useSession()
  const [startedAt] = useState(() => session.startedAt ?? Date.now())
  const [now, setNow] = useState(Date.now())
  // 'start' (A) | 'light' (B) | 'medium' (C) | 'strong' (D) | 'check' (E)
  const [state, setState] = useState('start')
  const [strongSince, setStrongSince] = useState(null)
  const [goingDown, setGoingDown] = useState(false)
  // set when she taps "Keep breathing" on an offer; the ring then runs until it's time to ask again
  const [keepSince, setKeepSince] = useState(null)
  const offerHidden = keepSince !== null
  const softMessage = location.state?.soft === true
  // from "Not feeling better yet?": just the circle, no more questions
  const quiet = location.state?.quiet === true

  useEffect(() => { if (!session.startedAt) start() }, [session.startedAt, start])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = (now - startedAt) / 1000

  // still strong after 2 minutes -> ask again
  useEffect(() => {
    if (state === 'strong' && strongSince && (now - strongSince) / 1000 >= STRONG_RECHECK_S) setState('check')
  }, [state, strongSince, now])

  function pick(level) {
    const previous = session.lastLevel
    recordLevel(level)
    const next = stateFor(level)
    // two rounds of breathing and no lower: stop asking, offer something different
    if (state === 'check' && previous != null && level >= previous) {
      mark({ notBetterShown: true })
      navigate('/not-better')
      return
    }
    // lower but still 8+ counts as progress: one more round
    setGoingDown(state === 'check' && next === 'strong')
    if (next === 'strong') setStrongSince(Date.now())
    setKeepSince(null)
    setState(next)
  }

  const showQuestion = !quiet && ((state === 'start' && elapsed >= ASK_AFTER_S) || state === 'check')
  // after "Keep breathing": ask how she feels once the ring closes, instead of breathing with no end
  useEffect(() => {
    if (keepSince && (now - keepSince) / 1000 >= KEEP_S) navigate('/check-in')
  }, [keepSince, now, navigate])

  const offerReady = elapsed >= OFFER_AFTER_S && !offerHidden
  const chatPaused = session.crisisShown
  // a ring closes around the circle until the next question, so she can see it's going somewhere
  const firstMinute = state === 'start' && !showQuestion && !quiet
  let progress = null
  if (firstMinute) progress = elapsed / ASK_AFTER_S
  if (state === 'strong' && strongSince) progress = (now - strongSince) / 1000 / STRONG_RECHECK_S
  if (keepSince) progress = (now - keepSince) / 1000 / KEEP_S

  return (
    <Screen
      footer={(state === 'strong' || softMessage || chatPaused || quiet) && (
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
        {softMessage && state === 'start' && (
          <p className="text-center text-sm text-sage">
            If this does not pass or feels like an emergency, contact a doctor or emergency services.
          </p>
        )}

        {showQuestion && <NumberPicker question="How strong is it right now, 1 to 10?" onPick={pick} />}

      </div>

      {/* offers at the bottom, like the buttons on every page */}
      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
        {/* the chat stays paused after a crisis, so offer a way to finish instead */}
        {state === 'light' && offerReady && !chatPaused && (
          <Offer text="Would you like to chat?" action="Chat with me" to="/chat" onKeep={() => setKeepSince(Date.now())} />
        )}
        {state === 'light' && offerReady && chatPaused && (
          <Offer text="Are you feeling a bit calmer?" action="I feel a bit better" to="/check-in"
            onKeep={() => setKeepSince(Date.now())} />
        )}
        {state === 'medium' && offerReady && (
          <Offer text="Try grounding together?" action="Start grounding" to="/grounding" onKeep={() => setKeepSince(Date.now())} />
        )}
        {quiet && <Button to="/check-in">I feel a bit better</Button>}
        {(state === 'light' || state === 'medium') && offerHidden && (
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
