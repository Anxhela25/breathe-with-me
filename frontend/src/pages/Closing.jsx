import { useLocation } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useSession } from '../context/SessionContext.jsx'

// Only reached once the panic eased (1-4), so the calm check is never offered during a strong attack.
export default function Closing() {
  const { session } = useSession()
  const location = useLocation()
  const offerChat = session.lastLevel >= 2 && session.lastLevel <= 4 && !session.crisisShown
  // still light, but higher than the last answer (3 -> 4): don't say it passed
  if (location.state?.rising) return <StillThere offerChat={offerChat} />
  const passed = session.lastLevel === 1
  return (
    <Screen calm>
      {/* two different moments: gone (1) gets a full green check; easing (2-4) a softer wave, no "You did it" */}
      {passed ? (
        <div className="relative mt-24 flex h-32 w-32 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-pistachio animate-halo" />
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-sage shadow-lg shadow-sage/30">
            <svg viewBox="0 0 24 24" className="h-12 w-12 stroke-white" fill="none" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className="animate-draw" />
            </svg>
          </span>
        </div>
      ) : (
        <div className="mt-24 flex h-28 w-28 items-center justify-center rounded-full bg-soft-blue" aria-hidden>
          {/* waves getting smaller: it's settling */}
          <svg viewBox="0 0 24 24" className="h-12 w-12 stroke-sage-dark" fill="none" strokeWidth="1.8"
            strokeLinecap="round">
            <path d="M3 8c2-3 4-3 6 0s4 3 6 0 4-3 6 0" pathLength="1" className="animate-draw" />
            <path d="M5 13c1.7-1.8 3.3-1.8 5 0s3.3 1.8 5 0 3.3-1.8 4 0" opacity="0.7" />
            <path d="M7 17.5c1.3-1 2.7-1 4 0s2.7 1 4 0" opacity="0.45" />
          </svg>
        </div>
      )}
      <h1 className="mt-6 text-center text-3xl font-bold">{passed ? 'You did it.' : "It's easing."}</h1>
      <p className="mt-2 max-w-xs text-center text-lg text-balance">
        {passed ? 'It passed.' : "You're getting through it."}
      </p>
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

function StillThere({ offerChat }) {
  return (
    <Screen>
      <div className="mt-28 flex h-28 w-28 items-center justify-center rounded-full bg-pistachio" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-12 w-12 stroke-sage" fill="none" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7" />
        </svg>
      </div>
      <h1 className="mt-6 text-center text-3xl font-bold">It&apos;s still a little there.</h1>
      <p className="mt-1 text-lg">That&apos;s okay.</p>
      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
        {/* 2 minutes of breathing with the ring, then "How do you feel now?" */}
        <Button to="/breathe" state={{ quiet: true }}>Breathe a bit longer</Button>
        {offerChat && <Button to="/chat" variant="outline">Want to talk about it?</Button>}
        <Button to="/calm-check?from=session" variant="link">I&apos;m okay for now</Button>
      </div>
    </Screen>
  )
}
