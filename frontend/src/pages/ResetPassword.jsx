import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { forgotPassword } from '../lib/api.js'

const MIN_PASSWORD = 12
const inputClass = 'w-full rounded-2xl border border-sage/20 bg-white px-4 py-3 text-base outline-none focus:border-sage'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { resetPassword } = useAuth()
  const email = params.get('email') ?? ''
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState("If an account exists for this email, we've sent a 6-digit code.")
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters. A short phrase is easy to remember.`)
      return
    }
    setBusy(true)
    try {
      await resetPassword(email, code, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.status ? err.message : "Can't reach the server. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError('')
    await forgotPassword(email).catch(() => {})
    setNotice('A new code is on its way. Only the newest code works.')
  }

  return (
    <Screen>
      <h1 className="mt-10 text-2xl font-bold">Check your email</h1>
      <p className="mt-2 text-center text-sage/80">{notice}</p>
      <p className="mt-1 text-center text-sm text-sage/70">{email}</p>
      <form onSubmit={submit} className="mt-8 flex w-full flex-col gap-3" noValidate>
        <label htmlFor="code" className="sr-only">6-digit code</label>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" maxLength={6}
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          className={`${inputClass} text-center text-2xl tracking-[0.4em]`} />
        <label htmlFor="new-password" className="sr-only">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" placeholder="New password"
          value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
        <p className="-mt-1 px-1 text-xs text-sage/70">
          {password.length < MIN_PASSWORD
            ? `At least ${MIN_PASSWORD} characters (${password.length} so far). A few unrelated words work well.`
            : '✓ Long enough'}
        </p>
        {error && <p role="alert" className="px-1 text-sm font-bold">{error}</p>}
        <Button type="submit" disabled={busy || code.length !== 6 || !password} className="mt-3 disabled:opacity-50">
          Save new password
        </Button>
      </form>
      <Button variant="link" onClick={resend} className="mt-3">Send a new code</Button>
      <Button to="/login" variant="link">Back to log in</Button>
    </Screen>
  )
}
