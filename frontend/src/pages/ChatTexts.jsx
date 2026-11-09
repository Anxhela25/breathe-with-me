import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { safeNext } from '../lib/next.js'

const option = 'w-full rounded-2xl border px-4 py-3 text-center'

export default function ChatTexts() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { updateSettings } = useAuth()
  const [keep, setKeep] = useState(false)  // privacy first: off by default
  const [busy, setBusy] = useState(false)

  async function next() {
    setBusy(true)
    try { await updateSettings({ save_chat_texts: keep }) } catch { /* can be changed later in settings */ }
    navigate(safeNext(params), { replace: true })
  }

  return (
    <Screen>
      <h1 className="mt-10 text-2xl font-bold">Save your chat texts?</h1>
      <p className="mt-2 text-center text-sm text-sage/70">You can change this anytime.</p>
      <div className="mt-8 flex w-full flex-col gap-3" role="radiogroup" aria-label="Chat texts">
        <button type="button" role="radio" aria-checked={keep} onClick={() => setKeep(true)}
          className={`${option} ${keep ? 'border-sage bg-pistachio' : 'border-sage/20 bg-white'}`}>
          Save them
        </button>
        <button type="button" role="radio" aria-checked={!keep} onClick={() => setKeep(false)}
          className={`${option} ${!keep ? 'border-sage bg-pistachio' : 'border-sage/20 bg-white'}`}>
          Delete after each session
        </button>
      </div>
      <div className="mt-auto w-full pt-8">
        <Button onClick={next} disabled={busy} className="disabled:opacity-50">Continue</Button>
      </div>
    </Screen>
  )
}
