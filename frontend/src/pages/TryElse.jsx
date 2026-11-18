import { Link } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import LongSessionNote from '../components/LongSessionNote.jsx'
import { useSession } from '../context/SessionContext.jsx'

const icon = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
  strokeLinejoin: 'round', className: 'h-7 w-7', 'aria-hidden': true }

// "About the same" after the first 2 minutes: she picks what feels right, like in other help apps.
export default function TryElse() {
  const { session } = useSession()
  const options = [
    ['/grounding', 'Grounding', 'Notice 5 things around you, one sense at a time.', 'bg-lavender',
      <svg key="g" {...icon}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>],
    // never after a crisis message: the chat stays paused
    !session.crisisShown && ['/chat', 'Talk to me', "Write what you feel. You're talking to an AI.", 'bg-soft-blue',
      <svg key="c" {...icon}><path d="M4 5h16v11H9l-5 4z" /></svg>],
    ['/breathe', 'Keep breathing', '2 more minutes with the circle.', 'bg-pistachio',
      <svg key="b" {...icon}><path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7" /></svg>],
  ].filter(Boolean)

  return (
    <Screen calm>
      <LongSessionNote />
      <h1 className="mt-14 text-center text-3xl font-bold">Let&apos;s try something else.</h1>
      <p className="mt-2 text-center text-lg text-sage">Pick what feels right for you.</p>
      <div className="mt-auto flex w-full flex-col gap-3 pt-8">
        {options.map(([to, title, text, tone, svg]) => (
          <Link key={to} to={to}
            className="flex items-center gap-4 rounded-2xl border border-sage/20 bg-white p-4 text-left shadow-sm active:scale-[0.98]">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sage-dark ${tone}`}>{svg}</span>
            <span className="flex-1">
              <span className="block text-lg font-bold">{title}</span>
              <span className="block text-sm text-sage/80">{text}</span>
            </span>
            <span aria-hidden className="text-2xl text-sage/40">›</span>
          </Link>
        ))}
      </div>
    </Screen>
  )
}
