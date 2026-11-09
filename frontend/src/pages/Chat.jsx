import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { sendChat } from '../lib/api.js'

// used when the backend can't be reached
const OFFLINE_REPLY = "I'm here. Let's keep following the circle together."
const EMERGENCY_NOTE = 'If you think this is a real medical emergency, call emergency services.'

export default function Chat() {
  const navigate = useNavigate()
  const { session, mark } = useSession()
  const [lines, setLines] = useState([])
  const [text, setText] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [nextStep, setNextStep] = useState(null)
  const bottom = useRef(null)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines, waiting])

  // stays paused for the rest of the session after a crisis message
  if (session.crisisShown) {
    return (
      <Screen>
        <h1 className="mt-10 text-2xl font-bold">The chat is paused.</h1>
        <p className="mt-2 text-center text-sage/80">Please reach out to someone now.</p>
        <div className="mt-8 flex w-full flex-col items-center gap-2">
          <Button to="/urgent">Show emergency numbers</Button>
          <Button to="/breathe" variant="link">Back to breathing</Button>
        </div>
      </Screen>
    )
  }

  async function send(event) {
    event.preventDefault()
    const message = text.trim()
    if (!message || waiting) return
    const history = lines.map(({ role, content }) => ({ role, content }))
    setLines(l => [...l, { role: 'user', content: message }])
    setText('')
    setWaiting(true)
    mark({ usedChat: true })
    try {
      const out = await sendChat({ message, history, level: session.lastLevel })
      if (out.kind === 'crisis') {
        mark({ crisisShown: true })
        navigate('/urgent', { replace: true })
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

  const started = lines.length > 0

  return (
    <Screen footer={<Button to="/urgent" variant="link" className="text-xs text-sage/70">I need urgent help</Button>}>
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
        <div ref={bottom} />
      </div>

      {nextStep && !waiting && (
        <div className="mt-4 flex w-full flex-col items-center gap-1">
          {nextStep === 'grounding'
            ? <Button to="/grounding">Start grounding</Button>
            : <Button to="/breathe">Back to breathing</Button>}
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
        <Button type="submit" variant={started ? 'outline' : 'primary'} disabled={!text.trim() || waiting}
          className="disabled:opacity-50">
          Send
        </Button>
        {!started && <Button to="/breathe" variant="link">No, just breathe</Button>}
      </form>
    </Screen>
  )
}
