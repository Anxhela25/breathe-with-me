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
      <h1 className="mt-14 text-center text-3xl font-bold">Let&apos;s try something else.</h1>
      <p className="mt-2 text-center text-lg text-sage">Pick what feels right for you.</p>
      <div className="mt-auto flex w-full flex-col gap-3 pt-8">
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
