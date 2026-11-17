import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import NumberPicker from '../components/NumberPicker.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { updateEpisode } from '../lib/api.js'

const PLACES = [['home', 'Home'], ['work', 'Work'], ['street', 'Street'], ['other', 'Other']]
const SLEEP = [['well', 'Well'], ['little', 'Little'], ['very_little', 'Very little']]
const EXTRAS = [
  ['expected', 'Did you expect it?', [[true, 'I expected it'], [false, 'Out of the blue']]],
  ['with_someone', 'Were you alone?', [[false, 'Alone'], [true, 'With someone']]],
  ['coffee', 'Coffee today?', [[true, 'Yes'], [false, 'No']]],
]
const choiceBase = 'w-full rounded-2xl border px-4 py-3 text-center'
const choice = `${choiceBase} border-sage/20 bg-white active:bg-pistachio`
const selected = `${choiceBase} border-sage bg-pistachio font-bold`

export default function QuickQuestions() {
  const { user, ready } = useAuth()
  if (!ready) return <Screen />
  return user ? <Questions /> : <AccountOffer />
}

function AccountOffer() {
  return (
    <Screen>
      <h1 className="mt-12 text-center text-2xl font-bold">Want to keep a private history?</h1>
      <p className="mt-3 text-center text-sage/80">
        With an account, this session and your answers are saved. Over time you can see patterns and share a summary
        with your doctor.
      </p>
      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
        <Button to="/register?next=/questions">Create an account</Button>
        <Button to="/login?next=/questions" variant="link">I already have an account</Button>
        <Button to="/" variant="link" className="text-sage/70">Not now</Button>
      </div>
    </Screen>
  )
}

function Questions() {
  const navigate = useNavigate()
  const { save } = useSession()
  const [episodeId, setEpisodeId] = useState(null)
  const [failed, setFailed] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [note, setNote] = useState('')

  useEffect(() => {
    save().then(setEpisodeId).catch(() => setFailed(true))
  }, [save])

  function answer(fields) {
    setAnswers(a => ({ ...a, ...fields }))
    setStep(s => s + 1)
  }

  async function finish(extra = {}) {
    const fields = { ...answers, ...extra }
    if (episodeId && Object.keys(fields).length) {
      try { await updateEpisode(episodeId, fields) } catch { setFailed(true); return }
    }
    navigate('/', { replace: true })
  }

  if (failed) {
    return (
      <Screen>
        <h1 className="mt-12 text-center text-2xl font-bold">This session couldn't be saved.</h1>
        <p className="mt-3 text-center text-sage/80">Please check your connection. You can still go back home.</p>
        <div className="mt-auto w-full pt-8"><Button to="/">Back home</Button></div>
      </Screen>
    )
  }

  const skip = <Button variant="link" onClick={() => answer({})}>Skip</Button>
  return (
    <Screen>
      <p className="mt-6 text-sm text-sage/60">All questions are optional.</p>
      <div className="mt-8 flex w-full flex-col items-center gap-3">
        {step === 0 && (
          <>
            <NumberPicker question="How strong was the worst moment?" onPick={n => answer({ worst_level: n })} />
            {skip}
          </>
        )}
        {step === 1 && (
          <>
            <p className="text-xl">Where were you?</p>
            {PLACES.map(([value, label]) => (
              <button key={value} type="button" className={choice} onClick={() => answer({ place: value })}>{label}</button>
            ))}
            {skip}
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-xl">How did you sleep last night?</p>
            {SLEEP.map(([value, label]) => (
              <button key={value} type="button" className={choice} onClick={() => answer({ sleep: value })}>{label}</button>
            ))}
            {skip}
          </>
        )}
        {step >= 3 && (
          <>
            <p className="text-xl">Anything else? (optional)</p>
            {EXTRAS.map(([field, question, options]) => (
              <div key={field} className="w-full">
                <p className="mb-2 text-center text-sm text-sage/70">{question}</p>
                <div className="flex w-full gap-3">
                  {options.map(([value, label]) => (
                    <button key={label} type="button" aria-pressed={answers[field] === value}
                      onClick={() => setAnswers(a => ({ ...a, [field]: a[field] === value ? undefined : value }))}
                      className={answers[field] === value ? selected : choice}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <label htmlFor="note" className="sr-only">Note</label>
            <textarea id="note" value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={2000}
              placeholder="Any note…"
              className="w-full resize-none rounded-2xl border border-sage/20 bg-white p-3 text-base outline-none focus:border-sage" />
            <Button onClick={() => finish(note.trim() ? { note: note.trim() } : {})} disabled={!episodeId}
              className="mt-2 disabled:opacity-50">
              Save
            </Button>
            <Button variant="link" onClick={() => finish()}>Skip</Button>
          </>
        )}
      </div>
    </Screen>
  )
}
