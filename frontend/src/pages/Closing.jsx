import { useLocation } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useSession } from '../context/SessionContext.jsx'

// Reached from "I'm fine now" (passed) or "Better" / "I feel better" (passing). Rules in lib/flow.js.
export default function Closing() {
  const { session } = useSession()
  const passed = useLocation().state?.feeling === 'passed'
  // still a little there, so offer to talk; never after a crisis (the chat is paused)
  const offerChat = !passed && !session.crisisShown
  return (
    <Screen calm>
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
      ) : <Sunrise />}
      <h1 className="mt-6 text-center text-3xl font-bold">{passed ? 'You did it.' : "You're getting through it."}</h1>
      <p className="mt-2 max-w-xs text-center text-lg text-balance">
        {passed ? 'It passed.' : 'The feeling is passing.'}
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
        {offerChat && <Button to="/chat" variant="outline">Want to talk about it?</Button>}
        {!passed && <Button to="/breathe" state={{ ownPace: true }} variant="outline">Breathe at my own pace</Button>}
        <Button to="/questions" variant="link">Skip for now</Button>
      </div>
    </Screen>
  )
}

/** It's getting lighter: a sun rises slowly over the horizon and its rays fade in. */
function Sunrise() {
  return (
    <svg viewBox="0 0 160 120" className="mt-20 h-36 w-48" aria-hidden>
      <defs>
        <radialGradient id="glow" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#F6D88E" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#F6D88E" stopOpacity="0" />
        </radialGradient>
        <clipPath id="sky"><rect x="0" y="0" width="160" height="86" /></clipPath>
      </defs>
      <ellipse cx="80" cy="86" rx="78" ry="60" fill="url(#glow)" className="animate-glow" />
      <g clipPath="url(#sky)">
        <g className="sun-rise">
          <g stroke="#E9B95A" strokeWidth="3" strokeLinecap="round" className="sun-rays">
            <path d="M80 34v-12M52 46l-9-8M108 46l9-8M40 70H28M120 70h12" />
          </g>
          <circle cx="80" cy="76" r="26" fill="#F3C969" />
        </g>
      </g>
      <path d="M12 86h136" stroke="#4A6355" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 98h88" stroke="#4A6355" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
      <path d="M58 109h44" stroke="#4A6355" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
    </svg>
  )
}

