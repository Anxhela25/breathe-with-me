import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
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
  const bottom = useRef(null)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines, waiting])

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

  return (
    <Screen>
      <p className="mt-3 rounded-full bg-pistachio px-3 py-1 text-xs text-sage">You are talking to an AI, not a person.</p>

      {!started && <p className="mt-10 text-center text-xl">Do you want to tell me what you feel?</p>}

      <div className="mt-6 flex w-full flex-1 flex-col gap-3 overflow-y-auto" aria-live="polite">
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
        <div ref={bottom} />
      </div>

      {nextStep && !waiting && (
        <div className="mt-4 flex w-full flex-col items-center gap-1">
          {nextStep === 'choose' && (
            <>
              <Button to="/breathe">Breathing circle</Button>
              <Button to="/grounding" variant="outline">Grounding</Button>
            </>
          )}
          {nextStep === 'grounding' && <Button to="/grounding">Start grounding</Button>}
          {nextStep === 'breathing' && <Button to="/breathe">Back to breathing</Button>}
        </div>
      )}

      <form onSubmit={send} className="mt-4 flex w-full flex-col items-center gap-2">
        <label htmlFor="chat-text" className="sr-only">Write what you feel</label>
        <textarea
          id="chat-text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write here…"
          rows={started ? 2 : 4}
          maxLength={2000}
          className="w-full resize-none rounded-2xl border border-sage/20 bg-white p-3 text-base outline-none focus:border-sage"
        />
        <Button type="submit" variant={started ? 'outline' : 'primary'} disabled={!text.trim() || waiting || asking}
          className="disabled:opacity-50">
          Send
        </Button>
        {!started && <Button to="/breathe" variant="link">No, just breathe</Button>}
      </form>

      {/* always on screen, whatever she writes and however long the chat gets */}
      <div className="sticky bottom-0 z-10 mt-3 w-full bg-cream pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Link to="/urgent"
          className="block w-full rounded-3xl border-2 border-alert px-6 py-3 text-center font-bold text-alert active:scale-[0.98]">
          I need urgent help
        </Link>
      </div>
    </Screen>
  )
}
