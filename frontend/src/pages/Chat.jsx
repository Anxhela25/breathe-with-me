import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import { BreathIcon } from '../components/Icons.jsx'
import Button from '../components/Button.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { sendChat } from '../lib/api.js'

// used when the backend can't be reached
const OFFLINE_REPLY = "I'm here. Let's keep following the circle together."
const EMERGENCY_NOTE = 'If you think this is a real medical emergency, call emergency services.'
const CHECK_NO_REPLY = "Thank you for telling me. Let's follow the circle together. " +
  'If those thoughts come, the urgent help button is always at the bottom.'

export default function Chat() {
  const navigate = useNavigate()
  const { session, mark } = useSession()
  const [lines, setLines] = useState([])
  const [text, setText] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [nextStep, setNextStep] = useState(null)
  // the safety check wasn't sure: ask the user directly before anything else
  const [asking, setAsking] = useState(false)
  // she answered "No, it's the panic": an unavailable safety check won't ask again in this chat
  const [safeConfirmed, setSafeConfirmed] = useState(false)
  const list = useRef(null)
  const screen = useVisibleScreen()
  const keyboardOpen = screen.height < window.innerHeight - 100

  // "Are you safe?" is answered with its two buttons: close the keyboard so the whole question shows
  useEffect(() => { if (asking) document.activeElement?.blur() }, [asking])

  // newest message in view: scroll only the message list, never the page
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [lines, waiting, asking, nextStep, screen.height])

  // stays paused for the rest of the session after a crisis message
  if (session.crisisShown) {
    return (
      <Screen>
        <h1 className="mt-10 text-2xl font-bold">The chat is paused.</h1>
        <p className="mt-2 text-center text-sage/80">Please reach out to someone now.</p>
        <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
          <Button to="/urgent">Show emergency numbers</Button>
          <Button to="/breathe" variant="outline">Back to breathing</Button>
          <Button to="/check-in" variant="link">I feel a bit better</Button>
        </div>
      </Screen>
    )
  }

  async function send(event) {
    event.preventDefault()
    const message = text.trim()
    if (!message || waiting || asking) return
    const history = lines.map(({ role, content }) => ({ role, content }))
    setLines(l => [...l, { role: 'user', content: message }])
    setText('')
    setWaiting(true)
    mark({ usedChat: true })
    try {
      const out = await sendChat({ message, history, level: session.lastLevel, safeConfirmed })
      if (out.kind === 'crisis') {
        mark({ crisisShown: true })
        navigate('/urgent', { replace: true })
        return
      }
      if (out.kind === 'check') {
        setAsking(true)
        setNextStep(null)
        return
      }
      setLines(l => [...l, { role: 'assistant', content: out.reply, note: out.emergency_note }])
      setNextStep(out.next_step)
    } catch {
      setLines(l => [...l, { role: 'assistant', content: OFFLINE_REPLY }])
      setNextStep('breathing')
    } finally {
      setWaiting(false)
    }
  }

  function answerCheck(atRisk) {
    setAsking(false)
    if (atRisk) {
      mark({ crisisShown: true })
      navigate('/urgent', { replace: true })
      return
    }
    setSafeConfirmed(true)
    setLines(l => [...l, { role: 'assistant', content: CHECK_NO_REPLY }])
    setNextStep('breathing')
  }

  const started = lines.length > 0

  // the chat fills exactly the part of the screen above the keyboard, like a messaging app:
  // the header stays, the messages sit right above the text box, only the messages scroll
  return (
    <div className="fixed inset-x-0 overflow-hidden" style={{ top: screen.top, height: screen.height }}>
      <Screen fit keyboard={keyboardOpen}>
        <LongSessionNote />
        <p className="mt-3 rounded-full bg-pistachio px-3 py-1 text-xs text-sage">You are talking to an AI, not a person.</p>

        {!started && <p className="mt-10 text-center text-xl">Do you want to tell me what you feel?</p>}

        <div ref={list} className="mt-6 flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto" aria-live="polite">
          <div className="mt-auto" aria-hidden />
          {lines.map((line, i) => (
            <div key={i} className={line.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start gap-2'}>
              <p className={line.role === 'user'
                ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-pistachio px-4 py-2'
                : 'max-w-[85%] rounded-2xl rounded-bl-sm border border-sage/15 bg-white px-4 py-2'}>
                {line.content}
              </p>
              {line.note && (
                <p className="max-w-[85%] rounded-2xl border border-alert/40 bg-alert/5 px-4 py-2 text-sm text-alert">
                  {EMERGENCY_NOTE}
                </p>
              )}
            </div>
          ))}
          {waiting && <p className="w-fit rounded-2xl border border-sage/15 bg-white px-4 py-2 text-sage/60">…</p>}
          {asking && (
            <div role="alertdialog" aria-labelledby="check-question"
              className="flex w-full flex-col gap-3 rounded-2xl border-2 border-alert bg-white p-4">
              <p id="check-question" className="font-bold">
                I want to make sure you're okay. Are you thinking about ending your life or hurting yourself?
              </p>
              <button type="button" onClick={() => answerCheck(true)}
                className="rounded-2xl bg-alert px-4 py-3 font-bold text-white">
                Yes, I need help now
              </button>
              <button type="button" onClick={() => answerCheck(false)}
                className="rounded-2xl border border-sage px-4 py-3 text-sage">
                No, it's the panic
              </button>
            </div>
          )}
          {/* the next step as soft suggestions under the last reply, like quick replies in a messaging app */}
          {nextStep && !waiting && !asking && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {(nextStep === 'breathing' || nextStep === 'choose') && (
                <Suggestion to="/breathe" icon={<BreathIcon />}>
                  {nextStep === 'choose' ? 'Breathing circle' : 'Back to breathing'}
                </Suggestion>
              )}
              {(nextStep === 'grounding' || nextStep === 'choose') && (
                <Suggestion to="/grounding" icon={<GroundIcon />}>
                  {nextStep === 'choose' ? 'Grounding' : 'Start grounding'}
                </Suggestion>
              )}
            </div>
          )}
        </div>


        <form onSubmit={send} className="mt-4 flex w-full flex-col items-center gap-2">
          <label htmlFor="chat-text" className="sr-only">Write what you feel</label>
          <div className="relative w-full">
            <textarea
              id="chat-text"
              value={text}
              onChange={e => setText(e.target.value)}
              // Return sends, like a messaging app; the keyboard shows "send" on that key
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e) }}
              enterKeyHint="send"
              placeholder="Write here…"
              rows={started ? 1 : 3}
              maxLength={2000}
              className="block w-full resize-none rounded-3xl border border-sage/20 bg-white py-3 pr-14 pl-4 text-base outline-none focus:border-sage"
            />
            <button type="submit" aria-label="Send" disabled={!text.trim() || waiting || asking}
              className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-sage text-white transition active:scale-95 disabled:bg-sage/25">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" />
              </svg>
            </button>
          </div>
          {!started && <Button to="/breathe" variant="link">No, just breathe</Button>}
        </form>

        {/* always on screen, whatever she writes and however long the chat gets */}
        <div className="mt-3 w-full">
          <Link to="/urgent"
            className="block w-full rounded-3xl border-2 border-alert px-6 py-3 text-center font-bold text-alert active:scale-[0.98]">
            I need urgent help
          </Link>
        </div>
      </Screen>
    </div>
  )
}

function Suggestion({ to, icon, children }) {
  return (
    <Link to={to}
      className="flex items-center gap-2 rounded-full border border-sage/25 bg-pistachio/70 py-2 pr-4 pl-2 text-sage-dark active:scale-95">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sage">{icon}</span>
      {children}
      <span aria-hidden className="text-sage/60">›</span>
    </Link>
  )
}

const GroundIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 21c-4-3-6-6-6-10a6 6 0 0 1 12 0c0 4-2 7-6 10z" /><circle cx="12" cy="11" r="2" />
  </svg>
)

/** The part of the screen that is visible above the keyboard. The iPhone doesn't shrink the page when
 * the keyboard opens, it slides the whole page up, so the chat sizes itself from this instead. */
function useVisibleScreen() {
  const read = () => ({ top: window.visualViewport?.offsetTop ?? 0, height: window.visualViewport?.height ?? window.innerHeight })
  const [box, setBox] = useState(read)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined
    const update = () => setBox(read())
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])
  return box
}
