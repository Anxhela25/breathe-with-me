const line = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
  strokeLinecap: 'round', strokeLinejoin: 'round', className: 'h-10 w-10',
}

// eslint-disable-next-line react-refresh/only-export-components
export const ORB_ICONS = {
  heart: <svg {...line}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>,
  phone: <svg {...line}><rect x="7" y="3" width="10" height="18" rx="3" /><path d="M11 17.5h2" /></svg>,
  book: <svg {...line}><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5V19" /></svg>,
}

/**
 * A soft lavender sphere with a white line icon: the picture on the help pages.
 * `ring` adds a faint circle around it. Decorative: the heading says what the page is.
 */
export default function Orb({ icon, ring = false, halo = false, className = '' }) {
  return (
    <div className={`relative flex h-24 w-24 items-center justify-center ${className}`} aria-hidden>
      {ring && <span className="absolute -inset-6 rounded-full border border-white/80 bg-white/20" />}
      {/* a slow glow that breathes with the same rhythm as the circle */}
      {halo && <span className="absolute -inset-3 rounded-full bg-orb/30 animate-halo" />}
      <span className="relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-[0_14px_30px_-12px_rgba(110,90,156,0.55)]"
        style={{ background: 'radial-gradient(circle at 35% 30%, #F6F1FC 0%, #DCD0F0 45%, #B9A6E0 100%)' }}>
        {ORB_ICONS[icon]}
      </span>
    </div>
  )
}
