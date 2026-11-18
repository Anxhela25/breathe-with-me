import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import OptionCard, { ICONS } from '../components/OptionCard.jsx'
import { useSession } from '../context/SessionContext.jsx'

// "About the same" after the first 2 minutes: she picks what feels right, like in other help apps.
export default function TryElse() {
  const { session } = useSession()
  return (
    <Screen calm>
      <LongSessionNote />
      {/* the empty middle gets a calm picture: a path leading on, another way forward */}
      <div className="flex flex-1 flex-col items-center justify-center pt-6">
        <AnotherWay />
        <h1 className="mt-8 text-center text-3xl font-bold">Let&apos;s try something else.</h1>
        <p className="mt-2 max-w-xs text-center text-lg text-sage text-balance">
          It&apos;s okay that it hasn&apos;t eased yet. Pick what feels right for you.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 pt-8">
        <OptionCard to="/grounding" title="Grounding" text="Notice 5 things around you, one sense at a time."
          tone="bg-lavender" icon={ICONS.grounding} />
        {/* after a crisis message the chat stays paused: the card stays, greyed out, saying so */}
        <OptionCard to="/chat" title="Talk to me" tone="bg-soft-blue" icon={ICONS.chat} paused={session.crisisShown}
          text={session.crisisShown ? 'Paused after your last message.' : "Write what you feel. You're talking to an AI."} />
        <OptionCard to="/breathe" title="Keep breathing" text="2 more minutes with the circle."
          tone="bg-pistachio" icon={ICONS.breathe} />
      </div>
    </Screen>
  )
}

/** Another way: soft hills and a winding path that draws itself towards the horizon. */
function AnotherWay() {
  return (
    <svg viewBox="0 0 220 140" className="h-36 w-56" aria-hidden>
      {/* the hills fade out at the sides and bottom instead of ending in a hard edge */}
      <defs>
        <radialGradient id="fade" cx="50%" cy="70%" r="55%">
          <stop offset="60%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id="soft"><rect width="220" height="140" fill="url(#fade)" /></mask>
      </defs>
      <g mask="url(#soft)">
      <path d="M0 92c40-26 80-30 120-14s70 18 100 4v58H0z" fill="#C9DCEB" opacity="0.8" />
      <path d="M0 110c50-22 100-22 150-6s50 10 70 4v32H0z" fill="#E2EADA" />
      </g>
      <path d="M110 140c-30-10-40-20-18-30s40-14 22-26-22-14-4-22" fill="none" stroke="#4A6355" strokeWidth="3"
        strokeLinecap="round" strokeDasharray="1 9" opacity="0.7" />
      <path d="M110 140c-30-10-40-20-18-30s40-14 22-26-22-14-4-22" fill="none" stroke="#4A6355" strokeWidth="2.5"
        strokeLinecap="round" pathLength="1" className="animate-draw" opacity="0.35" />
      <circle cx="110" cy="62" r="5" fill="#4A6355" />
      <path d="M104 40c4-10 14-12 18-4-6 0-12 2-18 4z" fill="#8FB89A" />
      <path d="M110 58V44" stroke="#4A6355" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
