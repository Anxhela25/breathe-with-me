import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Home() {
  const navigate = useNavigate()
  const { start } = useSession()
  const { user } = useAuth()

  function needHelp() {
    start()
    navigate('/breathe')
  }

  return (
    <Screen footer={<p className="text-xs text-sage/60">Support tool, not treatment.</p>}>
      <div className="mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-pistachio" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-8 w-8 stroke-sage" fill="none" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" />
        </svg>
      </div>
      <div className="mt-auto mb-auto flex w-full flex-col items-center gap-4">
        <Button onClick={needHelp} className="py-6 text-xl">I need help now.</Button>
        <Button to={user ? '/history' : '/login?next=/history'} variant="link">Review my history.</Button>
      </div>
    </Screen>
  )
}
