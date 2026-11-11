import { Link } from 'react-router-dom'

/**
 * Page layout. Every page has a small home button at the top left, so she can always go back
 * (`home={false}` hides it, on Home itself). `calm` gives the screen a soft cream-to-blue background
 * and a gentle fade-in, for quiet spaces like the calm check (give each step its own `key`).
 */
export default function Screen({ children, footer, calm = false, home = true }) {
  const page = (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center border-b border-sage/10 pb-3">
        {home ? (
          <Link to="/" aria-label="Home"
            className="flex h-11 w-11 items-center justify-center rounded-full text-sage active:bg-pistachio focus-visible:outline-2 focus-visible:outline-sage">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 11l8-7 8 7M6 9.5V20h4.5v-5h3v5H18V9.5" />
            </svg>
          </Link>
        ) : <span />}
        <span className="text-center text-lg font-bold">Breathe With Me</span>
        <span />
      </header>
      <main className={`flex flex-1 flex-col items-center ${calm ? 'animate-fade-in' : ''}`}>{children}</main>
      {footer && <footer className="pt-4 text-center">{footer}</footer>}
    </div>
  )
  if (!calm) return page
  return <div className="min-h-full bg-gradient-to-b from-cream via-cream to-soft-blue/40">{page}</div>
}
