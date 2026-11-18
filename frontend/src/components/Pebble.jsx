/** Pebble, the friendly companion: a soft, smiling shape. Decorative, so it is hidden from screen readers. */
export default function Pebble({ className = 'h-[72px] w-[72px]' }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pebble-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C9E0CF" />
          <stop offset="1" stopColor="#9CC0D6" />
        </linearGradient>
      </defs>
      <path d="M60 14c24 0 40 18 42 42 2 26-12 50-40 50S16 86 18 58C20 32 36 14 60 14z" fill="url(#pebble-fill)" />
      <path d="M42 60q6-6 12 0M66 60q6-6 12 0" stroke="#2F4136" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="72" r="6" fill="#F2B8A2" opacity=".7" />
      <circle cx="82" cy="72" r="6" fill="#F2B8A2" opacity=".7" />
      <path d="M52 76q8 7 16 0" stroke="#2F4136" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}
