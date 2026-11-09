import { useEffect, useState } from 'react'

export const INHALE_MS = 4000
export const EXHALE_MS = 6000

export default function BreathingCircle({ inhaleMs = INHALE_MS, exhaleMs = EXHALE_MS }) {
  const [phase, setPhase] = useState('in')

  useEffect(() => {
    const t = setTimeout(() => setPhase(p => (p === 'in' ? 'out' : 'in')), phase === 'in' ? inhaleMs : exhaleMs)
    return () => clearTimeout(t)
  }, [phase, inhaleMs, exhaleMs])

  const growing = phase === 'in'
  return (
    <div className="flex h-64 w-64 items-center justify-center" aria-live="polite">
      <div
        className="flex items-center justify-center rounded-full bg-pistachio shadow-[0_0_60px_10px_rgba(226,234,218,0.9)] ease-in-out"
        style={{
          width: '100%', height: '100%',
          transform: `scale(${growing ? 1 : 0.6})`,
          transitionProperty: 'transform',
          transitionDuration: `${growing ? inhaleMs : exhaleMs}ms`,
        }}
      >
        <span className="text-lg text-sage" style={{ transform: `scale(${growing ? 1 : 1.5})`, transition: 'inherit' }}>
          {growing ? 'Breathe in' : 'Breathe out'}
        </span>
      </div>
    </div>
  )
}
