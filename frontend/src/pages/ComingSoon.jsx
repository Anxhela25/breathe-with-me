import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'

export default function ComingSoon({ title }) {
  return (
    <Screen>
      <h1 className="mt-10 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sage/70">Coming in the next part.</p>
      <div className="mt-auto w-full"><Button to="/breathe" variant="outline">Back to breathing</Button></div>
    </Screen>
  )
}
