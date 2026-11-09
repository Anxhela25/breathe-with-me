import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { safeNext } from '../lib/next.js'

const MIN_PASSWORD = 12
const inputClass = 'w-full rounded-2xl border border-sage/20 bg-white px-4 py-3 text-base outline-none focus:border-sage'

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { register, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAdult, setIsAdult] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const next = safeNext(params)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (isRegister && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters. A short phrase is easy to remember.`)
      return
    }
    if (isRegister && !(isAdult && consent)) {
      setError('Please confirm both boxes to create an account.')
      return
    }
    setBusy(true)
    try {
      if (isRegister) {
        await register(email.trim(), password, { is_adult: isAdult, health_data_consent: consent })
        navigate(`/chat-texts?next=${encodeURIComponent(next)}`, { replace: true })
      } else {
        await login(email.trim(), password)
        navigate(next, { replace: true })
      }
    } catch (err) {
      if (err.status === 422 && err.message.startsWith('Request failed')) setError('Please check the email address.')
      else if (err.status) setError(err.message)
      else setError("Can't reach the server. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const otherMode = isRegister ? 'login' : 'register'
  return (
    <Screen footer={isRegister && (
      <p className="text-xs text-sage/70">
        Your entries are private health information. Only you can see them, and you can delete them at any time.
      </p>
    )}>
      <h1 className="mt-10 text-2xl font-bold">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
      <form onSubmit={submit} className="mt-8 flex w-full flex-col gap-3" noValidate>
        <label htmlFor="email" className="sr-only">Email</label>
        <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
        <label htmlFor="password" className="sr-only">Password</label>
        <input id="password" type="password" placeholder="Password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} />
        {isRegister && (
          <p className="-mt-1 px-1 text-xs text-sage/70">
            {password.length < MIN_PASSWORD
              ? `At least ${MIN_PASSWORD} characters (${password.length} so far). A few unrelated words work well.`
              : '✓ Long enough'}
          </p>
        )}
        {isRegister && (
          <div className="mt-2 flex flex-col gap-3 px-1 text-sm">
            <label className="flex items-start gap-3">
              <input id="is-adult" type="checkbox" checked={isAdult} onChange={e => setIsAdult(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-sage" />
              <span>I am 18 or older.</span>
            </label>
            <label className="flex items-start gap-3">
              <input id="consent" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-sage" />
              <span>I agree that my entries, which are health information, are stored privately to show my history.
                I can delete them at any time.</span>
            </label>
          </div>
        )}
        {error && <p role="alert" className="px-1 text-sm font-bold">{error}</p>}
        <Button type="submit" disabled={busy || !email || !password || (isRegister && !(isAdult && consent))}
          className="mt-3 disabled:opacity-50">
          {isRegister ? 'Create account' : 'Log in'}
        </Button>
      </form>
      <div className="mt-3 flex flex-col items-center">
        <Button to={`/${otherMode}?next=${encodeURIComponent(next)}`} variant="link">
          {isRegister ? 'I already have an account' : 'Create an account'}
        </Button>
        {!isRegister && (
          <Button to={`/forgot-password?email=${encodeURIComponent(email)}`} variant="link">Forgot password?</Button>
        )}
        <Button to="/" variant="link" className="text-sage/70">Not now</Button>
      </div>
    </Screen>
  )
}
