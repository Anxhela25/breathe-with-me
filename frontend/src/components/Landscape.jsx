import { useId } from 'react'

/**
 * A calm little world in a circle: lavender sky, a white sun, sage hills and still water.
 * `boat` adds a small sailboat (the closing "You did it."). Decorative: hidden from screen readers.
 * It fills its box; the parent sets the size and the round clip.
 */
export default function Landscape({ boat = false }) {
  const id = useId()
  const sky = `${id}-sky`
  const water = `${id}-water`
  return (
    <svg viewBox="0 0 200 200" className="block h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E2D7F1" />
          <stop offset="0.6" stopColor="#F0EBF7" />
          <stop offset="1" stopColor="#F5F2F2" />
        </linearGradient>
        <linearGradient id={water} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7D9684" />
          <stop offset="1" stopColor="#5C7766" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${sky})`} />
      <circle cx="138" cy="58" r="13" fill="#FFFFFF" opacity="0.95" />
      <circle cx="66" cy="80" r="5" fill="#FFFFFF" opacity="0.55" />
      <path d="M0 128C30 112 55 104 85 112s55-12 85-8c15 2 25 8 30 12v34H0z" fill="#BFD0BE" />
      <path d="M0 140c40-14 80-10 110-4s60-4 90-2v16H0z" fill="#A3B8A6" />
      <rect y="148" width="200" height="52" fill={`url(#${water})`} />
      <path d="M62 166h76" stroke="#E8EEE8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M80 178h40" stroke="#E8EEE8" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      {boat && (
        <g transform="translate(104 124)">
          <path d="M12 1v19" stroke="#F7F6F1" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13 3l10 16H13z" fill="#FFFFFF" />
          <path d="M2 21h24l-4 5H6z" fill="#F3EFE8" />
        </g>
      )}
    </svg>
  )
}
