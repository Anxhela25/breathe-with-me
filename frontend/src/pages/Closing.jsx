import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'

// TODO: calm check and quick questions
export default function Closing() {
  return (
    <Screen>
      <div className="mt-12 flex h-28 w-28 items-center justify-center rounded-full bg-pistachio" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-12 w-12 stroke-sage" fill="none" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-bold">You did it.</h1>
      <p className="mt-1 text-lg">It passed.</p>
      <p className="mt-10">Want a one-minute calm check?</p>
      <div className="mt-6 flex w-full flex-col items-center gap-2">
        <Button to="/calm-check" className="opacity-50 pointer-events-none" aria-disabled>Start calm check</Button>
        <Button to="/" variant="link">Skip for now</Button>
      </div>
    </Screen>
  )
}
