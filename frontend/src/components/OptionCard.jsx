import { Link } from 'react-router-dom'

const icon = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
  strokeLinejoin: 'round', className: 'h-7 w-7', 'aria-hidden': true }

// eslint-disable-next-line react-refresh/only-export-components
export const ICONS = {
  grounding: <svg {...icon}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>,
  chat: <svg {...icon}><path d="M4 5h16v11H9l-5 4z" /></svg>,
  breathe: <svg {...icon}><path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7" /></svg>,
  heart: <svg {...icon}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>,
}

/** Choice card: icon, title, one line, chevron.
 * `paused` greys it out and disables it, `text` says why. */
export default function OptionCard({ to, state, title, text, tone, icon: svg, paused = false }) {
  if (paused) {
    return (
      <div aria-disabled="true" className="flex items-center gap-4 rounded-2xl border border-sage/10 bg-white/50 p-4 text-left opacity-60">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sage-dark ${tone}`}>{svg}</span>
        <span className="flex-1">
          <span className="block text-lg font-bold">{title}</span>
          <span className="block text-sm text-sage/80">{text}</span>
        </span>
      </div>
    )
  }
  return (
    <Link to={to} state={state}
      className="flex items-center gap-4 rounded-2xl border border-sage/20 bg-white p-4 text-left shadow-sm active:scale-[0.98]">
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sage-dark ${tone}`}>{svg}</span>
      <span className="flex-1">
        <span className="block text-lg font-bold">{title}</span>
        <span className="block text-sm text-sage/80">{text}</span>
      </span>
      <span aria-hidden className="text-2xl text-sage/40">›</span>
    </Link>
  )
}
