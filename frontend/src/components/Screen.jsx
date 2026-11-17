import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const iconButton = 'flex h-11 w-11 items-center justify-center rounded-full text-sage active:bg-pistachio focus-visible:outline-2 focus-visible:outline-sage'

/**
 * Page layout. The header has a home button at the top left on every page (`home={false}` hides it,
 * on Home itself) and, when she is logged in, a settings button at the top right.
 * `calm` gives the screen a soft cream-to-blue background and a gentle fade-in, for quiet spaces like
 * the calm check (give each step its own `key` so it fades in again).
 */
export default function Screen({ children, footer, calm = false, home = true, back = false, fit = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname, key } = useLocation()
  const showSettings = user && pathname !== '/settings'

  const page = (
    <div className={`mx-auto flex ${fit ? 'h-full' : 'min-h-full'} w-full max-w-md flex-1 flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]`}>
      {/* keeps scrolled content from showing behind the iPhone's clock and battery */}
      <div className="fixed inset-x-0 top-0 z-20 h-[env(safe-area-inset-top)] bg-cream" aria-hidden />
      <header className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center border-b border-sage/10 pb-3">
        {back ? (
          // pages you browse (settings, history): back to where you came from, home if opened directly
          <button type="button" onClick={() => (key === 'default' ? navigate('/') : navigate(-1))}
            className="flex h-11 items-center gap-0.5 rounded-full pr-2 text-sage active:bg-pistachio">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
            Back
          </button>
        ) : home ? (
          <Link to="/" aria-label="Home" className={iconButton}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 11l8-7 8 7M6 9.5V20h4.5v-5h3v5H18V9.5" />
            </svg>
          </Link>
        ) : <span />}
        <span className="text-center text-lg font-bold">Breathe With Me</span>
        {showSettings ? (
          <Link to="/settings" aria-label="Settings" className={iconButton}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
        ) : <span />}
      </header>
      <main className={`flex flex-1 flex-col items-center ${fit ? 'min-h-0' : ''} ${calm ? 'animate-fade-in' : ''}`}>{children}</main>
      {footer && <footer className="pt-4 text-center">{footer}</footer>}
    </div>
  )
  if (!calm) return page
  return <div className="flex min-h-full flex-col bg-gradient-to-b from-cream via-cream to-soft-blue/40">{page}</div>
}
