import { Link, useLocation, useNavigate } from 'react-router-dom'

const pill = 'flex h-10 w-10 items-center justify-center rounded-full text-sage-dark active:bg-pistachio focus-visible:outline-2 focus-visible:outline-sage'

/**
 * Page layout. The header has a back and a home button at the top left on every page (`home={false}`
 * hides home) and a settings button at the top right.
 * `calm` gives the screen a soft cream-to-blue background and a short, gentle entrance, for quiet spaces
 * like the calm check (give each step its own `key` so it plays again).
 */
export default function Screen({ children, footer, calm = false, home = true, fit = false, keyboard = false }) {
  const navigate = useNavigate()
  const { pathname, key } = useLocation()
  // on every page; logged out, it asks to log in first and then opens Settings
  const showSettings = pathname !== '/settings'

  const page = (
    <div className={`mx-auto flex ${fit ? 'h-full' : 'min-h-full'} w-full max-w-md flex-1 flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] ${keyboard ? 'pb-2' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]'}`}>
      {/* keeps scrolled content from showing behind the iPhone's clock and battery */}
      <div className="fixed inset-x-0 top-0 z-20 h-[env(safe-area-inset-top)] bg-cream" aria-hidden />
      <header className="grid grid-cols-[5.5rem_1fr_5.5rem] items-center border-b border-sage/10 pb-3">
        {/* like the iPhone's own apps: round glassy buttons, back and home together in one capsule */}
        <div className="flex h-10 w-fit items-center rounded-full border border-white/70 bg-white/70 shadow-sm shadow-sage/10 backdrop-blur">
          <button type="button" aria-label="Back" onClick={() => (key === 'default' ? navigate('/') : navigate(-1))}
            className={pill}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14.5 5.5L8 12l6.5 6.5" /></svg>
          </button>
          {home && (
            <>
              <span className="h-5 w-px bg-sage/15" aria-hidden />
              <Link to="/" aria-label="Home" className={pill}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 11l8-7 8 7M6 9.5V20h4.5v-5h3v5H18V9.5" />
                </svg>
              </Link>
            </>
          )}
        </div>
        <span className="text-center font-display text-lg font-bold">Breathe With Me</span>
        {showSettings ? (
          <Link to="/settings" aria-label="Settings"
            className={`${pill} justify-self-end border border-white/70 bg-white/70 shadow-sm shadow-sage/10 backdrop-blur`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
        ) : <span />}
      </header>
      <main className={`flex flex-1 flex-col items-center ${fit ? 'min-h-0' : ''} ${calm ? 'animate-enter' : ''}`}>{children}</main>
      {footer && <footer className="pt-4 text-center">{footer}</footer>}
    </div>
  )
  // every page: a soft cream-to-blue sky with two faint clouds behind the content (decorative only)
  return (
    <div className={`relative flex ${fit ? 'h-full' : 'min-h-full'} flex-col overflow-hidden bg-gradient-to-b from-cream via-cream to-soft-blue/40`}>
      <span aria-hidden className="pointer-events-none absolute -left-12 top-36 h-16 w-60 rounded-full bg-white/70 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute -right-12 top-[58%] h-14 w-52 rounded-full bg-white/60 blur-2xl" />
      <div className={fit ? 'relative h-full' : 'relative flex flex-1 flex-col'}>{page}</div>
    </div>
  )
}
