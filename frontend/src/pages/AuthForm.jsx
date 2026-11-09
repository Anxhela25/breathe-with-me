import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { safeNext } from '../lib/next.js'

const inputClass = 'w-full rounded-2xl border border-sage/20 bg-white px-4 py-3 text-base outline-none focus:border-sage'

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { register, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const next = safeNext(params)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (isRegister && password.length < 8) {
      setError('Use at least 8 characters for the password.')
      return
    }
    setBusy(true)
    try {
      if (isRegister) {
        await register(email.trim(), password)
        navigate(`/chat-texts?next=${encodeURIComponent(next)}`, { replace: true })
      } else {
        await login(email.trim(), password)
        navigate(next, { replace: true })
      }
    } catch (err) {
      if (err.status === 422) setError('Please check the email address.')
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
        {isRegister && <p className="-mt-1 px-1 text-xs text-sage/70">At least 8 characters.</p>}
        {error && <p role="alert" className="px-1 text-sm text-alert">{error}</p>}
        <Button type="submit" disabled={busy || !email || !password} className="mt-3 disabled:opacity-50">
          {isRegister ? 'Create account' : 'Log in'}
        </Button>
      </form>
      <div className="mt-3 flex flex-col items-center">
        <Button to={`/${otherMode}?next=${encodeURIComponent(next)}`} variant="link">
          {isRegister ? 'I already have an account' : 'Create an account'}
        </Button>
        <Button to="/" variant="link" className="text-sage/70">Not now</Button>
      </div>
    </Screen>
  )
}
