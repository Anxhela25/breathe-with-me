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
      {/* the empty middle gets a calm picture: three soft circles, one for each choice below */}
      <div className="flex flex-1 flex-col items-center justify-center pt-6">
        <ThreeWays />
        <h1 className="mt-8 text-center text-3xl font-bold">Let&apos;s try something else.</h1>
        <p className="mt-2 max-w-xs text-center text-lg text-sage text-balance">
          It&apos;s okay that it hasn&apos;t eased yet. Pick what feels right for you.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 pt-8">
        <OptionCard to="/grounding" title="Grounding" text="Notice 5 things around you, one sense at a time."
          tone="bg-lavender" icon={ICONS.grounding} />
        {/* never after a crisis message: the chat stays paused */}
        {!session.crisisShown && (
          <OptionCard to="/chat" title="Talk to me" text="Write what you feel. You're talking to an AI."
            tone="bg-soft-blue" icon={ICONS.chat} />
        )}
        <OptionCard to="/breathe" title="Keep breathing" text="2 more minutes with the circle."
          tone="bg-pistachio" icon={ICONS.breathe} />
      </div>
    </Screen>
  )
}

/** Three soft circles in the colours of the three choices, breathing slowly one after another. */
function ThreeWays() {
  return (
    <svg viewBox="0 0 200 140" className="h-36 w-52" aria-hidden>
      <circle cx="70" cy="62" r="40" fill="#DCD6EC" opacity="0.9" className="three-ways" />
      <circle cx="130" cy="62" r="40" fill="#C9DCEB" opacity="0.9" className="three-ways" style={{ animationDelay: '1.3s' }} />
      <circle cx="100" cy="98" r="40" fill="#E2EADA" opacity="0.9" className="three-ways" style={{ animationDelay: '2.6s' }} />
    </svg>
  )
}

