import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useSession } from '../context/SessionContext.jsx'

// Only reached once the panic eased, so the calm check is never offered during a strong attack.
export default function Closing() {
  const { session } = useSession()
  const offerChat = session.lastLevel >= 2 && session.lastLevel <= 4 && !session.crisisShown
  return (
    <Screen>
      <div className="mt-28 flex h-28 w-28 items-center justify-center rounded-full bg-pistachio" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-12 w-12 stroke-sage" fill="none" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-bold">You did it.</h1>
      <p className="mt-1 text-lg">It passed.</p>
      {session.crisisShown && (
        <div className="mt-6 w-full rounded-2xl border border-alert/40 bg-alert/5 p-4 text-center text-sm">
          <p>If the thoughts of hurting yourself come back, please don&apos;t stay alone with them.
            Call someone you trust or emergency services.</p>
          <Button to="/urgent" variant="link" className="mt-1 text-alert">Show emergency numbers</Button>
        </div>
      )}
      {/* actions at the bottom, where the thumb is */}
      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
        <p className="mb-2">Want a one-minute calm check?</p>
        <Button to="/calm-check?from=session">Start calm check</Button>
        {/* 2-4: a little is still there, so offer to talk; never after a crisis (the chat is paused) */}
        {offerChat && <Button to="/chat" variant="outline">Want to talk about it?</Button>}
        <Button to="/questions" variant="link">Skip for now</Button>
      </div>
    </Screen>
  )
}
