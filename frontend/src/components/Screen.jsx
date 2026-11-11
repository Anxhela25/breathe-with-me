/**
 * Page layout. `calm` gives the screen a soft cream-to-blue background and a gentle fade-in,
 * for quiet spaces like the calm check (give each step its own `key` so it fades in again).
 */
export default function Screen({ children, footer, calm = false }) {
  const page = (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="border-b border-sage/10 pb-3 text-center text-lg font-bold">Breathe With Me</header>
      <main className={`flex flex-1 flex-col items-center ${calm ? 'animate-fade-in' : ''}`}>{children}</main>
      {footer && <footer className="pt-4 text-center">{footer}</footer>}
    </div>
  )
  if (!calm) return page
  return <div className="min-h-full bg-gradient-to-b from-cream via-cream to-soft-blue/40">{page}</div>
}
