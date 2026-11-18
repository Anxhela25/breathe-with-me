import { Link } from 'react-router-dom'

const PhoneSolid = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
  </svg>
)

/**
 * The one look for every emergency action: soft blush, deep rose text, a phone in a circle.
 * `href` calls (tel:), `to` opens a page in the app. `small` for tight places like the chat.
 */
export default function EmergencyButton({ href, to, title, subtitle, small = false, className = '' }) {
  const cls = `flex w-full items-center rounded-3xl border border-rose-soft/30 bg-blush text-rose shadow-md shadow-rose-soft/15 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alert ${
    small ? 'gap-3 py-2 pr-5 pl-2' : 'gap-4 py-3 pr-6 pl-3'} ${className}`
  const content = (
    <>
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-rose-soft text-white ${small ? 'h-9 w-9' : 'h-12 w-12'}`} aria-hidden>
        <PhoneSolid className={small ? 'h-5 w-5' : 'h-6 w-6'} />
      </span>
      <span className="flex-1 text-left leading-tight">
        <span className={`block font-bold ${small ? 'text-base' : 'text-xl'}`}>{title}</span>
        {subtitle && <span className="block text-base opacity-95">{subtitle}</span>}
      </span>
      <span aria-hidden className="text-2xl opacity-70">›</span>
    </>
  )
  return to ? <Link to={to} className={cls}>{content}</Link> : <a href={href} className={cls}>{content}</a>
}
