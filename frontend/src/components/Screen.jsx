export default function Screen({ children, footer }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="border-b border-sage/10 pb-3 text-center text-lg font-bold">Breathe With Me</header>
      <main className="flex flex-1 flex-col items-center">{children}</main>
      {footer && <footer className="pt-4 text-center">{footer}</footer>}
    </div>
  )
}
