// Line icons for the stat tiles (decorative, the label says the same).
const base = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className: 'h-5 w-5',
}

export const HeartIcon = () => (
  <svg {...base}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
)
export const ClockIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></svg>
)
export const BreathIcon = () => (
  <svg {...base}><path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7" /></svg>
)
export const PhoneIcon = () => (
  <svg {...base}><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
)
export const RhythmIcon = () => (
  <svg {...base}><path d="M3 12h3l2-5 4 10 2-5h7" /></svg>
)
