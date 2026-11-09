import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { getEmergency } from '../data/emergency.js'

export default function UrgentHelp() {
  const { emergency, crisisLine } = getEmergency(null) // TODO: use the country from settings
  return (
    <Screen>
      <h1 className="mt-10 text-3xl font-bold">You are not alone.</h1>
      <p className="mt-2 text-center text-sage/80">Please reach out to someone now.</p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <a href={`tel:${emergency}`} className="rounded-2xl border border-alert/40 bg-alert/5 p-4 text-center text-alert">
          Emergency services: <strong className="text-xl">{emergency}</strong>
        </a>
        {crisisLine && (
          <a href={`tel:${crisisLine}`} className="rounded-2xl border border-alert/40 bg-alert/5 p-4 text-center text-alert">
            Crisis line: <strong className="text-xl">{crisisLine}</strong>
          </a>
        )}
      </div>
      <div className="mt-auto flex w-full flex-col items-center gap-2">
        <Button className="opacity-50 pointer-events-none" aria-disabled>Call someone I trust</Button>
        <Button to="/breathe" variant="link">Back to breathing</Button>
      </div>
    </Screen>
  )
}
