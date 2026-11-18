import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import Pebble from '../components/Pebble.jsx'

// soft sun and hills behind the content: decorative only, they never sit over a button
const DECOR = [
  {
    className: 'right-[-18px] top-[150px] h-[110px] w-[110px] rounded-full shadow-[0_0_0_16px_rgba(255,246,223,0.45)]',
    style: { background: 'radial-gradient(circle at 40% 40%, #FFF6DF, #F9D9A0)' },
  },
  { className: 'bottom-[-110px] left-[-20%] right-[-20%] h-[260px] rounded-[50%] bg-[#B9D0BF]' },
  { className: 'bottom-[-150px] left-[10%] right-[-30%] h-[260px] rounded-[50%] bg-[#9FBAA8]' },
]

const LINK_PILL = 'rounded-full bg-white/60 px-4 py-2 active:bg-white'

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { start } = useSession()

  // no animation before leaving: in a panic every second waiting feels long
  function begin() {
    start()
    navigate('/breathe')
  }

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-gradient-to-b from-cream via-pistachio to-soft-blue">
      {DECOR.map(({ className, style }, i) => (
        <span key={i} aria-hidden className={`pointer-events-none absolute ${className}`} style={style} />
      ))}

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="flex h-11 w-full justify-end">
          <Link to="/settings" aria-label="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-sage active:bg-white/50 focus-visible:outline-2 focus-visible:outline-sage">
            <SettingsIcon />
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center">
          <Pebble />
          <h1 className="mt-4 text-center text-[2.6rem] font-bold leading-tight text-sage-dark">Breathe With Me!</h1>
        </div>

        {/* breathes slowly while waiting */}
        <button type="button" onClick={begin} aria-label="Start breathing, I need help now"
          className="relative flex h-44 w-44 items-center transition-transform active:scale-95 justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage">
          <span className="absolute inset-0 rounded-full bg-white/40 animate-halo" aria-hidden />
          <span className="absolute inset-0 rounded-full bg-white shadow-xl shadow-sage/15 animate-breathe" aria-hidden />
          <span className="relative text-3xl font-bold text-sage">Start</span>
        </button>

        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-center text-xl text-sage-dark">When it feels like too much,<br />tap Start. I&apos;m right here, and I&apos;ll breathe with you.</p>
          {/* daily practice when calm; it also builds her usual rhythm (baseline) */}
          <div className="flex items-center gap-2 text-sm text-sage">
            <Link to="/calm-check" className={LINK_PILL}>Calm check | 1 min</Link>
            <Link to="/history" className={LINK_PILL}>My history</Link>
          </div>
        </div>

        <p className="text-xs text-sage/70">Support tool, not treatment.</p>
      </div>
    </div>
  )
}
