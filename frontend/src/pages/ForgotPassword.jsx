import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { forgotPassword } from '../lib/api.js'

const inputClass = 'w-full rounded-2xl border border-sage/20 bg-white px-4 py-3 text-base outline-none focus:border-sage'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await forgotPassword(email.trim())
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)
    } catch (err) {
      setError(err.status === 422 ? 'Please check the email address.' : "Can't reach the server. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <h1 className="mt-10 text-2xl font-bold">Forgot your password?</h1>
      <p className="mt-2 text-center text-sage/80">Enter your email and we'll send you a 6-digit code.</p>
      <form onSubmit={submit} className="mt-8 flex w-full flex-1 flex-col gap-3" noValidate>
        <label htmlFor="email" className="sr-only">Email</label>
        <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
        {error && <p role="alert" className="px-1 text-sm font-bold">{error}</p>}
        <Button type="submit" disabled={busy || !email.trim()} className="mt-auto disabled:opacity-50">Send code</Button>
      </form>
      <Button to="/login" variant="link" className="mt-3">Back to log in</Button>
    </Screen>
  )
}
