import { useEffect, useState } from 'react'
import { useReducedMotion } from '../lib/motion.js'
import Landscape from './Landscape.jsx'

export const INHALE_MS = 4000
export const EXHALE_MS = 6000

const EASE = 'cubic-bezier(0.45, 0, 0.55, 1)'  // slow at both ends, like a breath

/**
 * Breathing circle: grows on the in-breath, shrinks on the out-breath.
 * `progress` (0-1) draws a ring around it that closes over the exercise.
 */
export default function BreathingCircle({ inhaleMs = INHALE_MS, exhaleMs = EXHALE_MS, progress = null, size = 256, landscape = false }) {
  const [phase, setPhase] = useState('in')
  // start small so the first breath grows from small
  const [started, setStarted] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    // two frames so the browser paints the small circle before the transition
    let second
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setStarted(true)) })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [])

  useEffect(() => {
    if (!started) return undefined
    const t = setTimeout(() => setPhase(p => (p === 'in' ? 'out' : 'in')), phase === 'in' ? inhaleMs : exhaleMs)
    return () => clearTimeout(t)
  }, [started, phase, inhaleMs, exhaleMs])

  const growing = phase === 'in'
  const duration = growing ? inhaleMs : exhaleMs
  const layer = (big, small, delay) => (reduced
    ? { transform: `scale(${(big + small) / 2})` }
    : !started ? { transform: `scale(${small})` }
    : {
        transform: `scale(${growing ? big : small})`,
        transition: `transform ${duration}ms ${EASE} ${delay}ms`,
      })

  const radius = size / 2 - 3
  const circumference = 2 * Math.PI * radius

  if (landscape) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="3" />
            {progress !== null && (
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#4A6355" strokeWidth="3"
                strokeLinecap="round" strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
                style={{ transition: 'stroke-dashoffset 300ms linear' }} />
            )}
          </svg>
          <div className="absolute inset-5 overflow-hidden rounded-full shadow-[0_14px_40px_-14px_rgba(47,65,54,0.45)] ring-4 ring-white/70"
            style={layer(1, 0.72, 0)} aria-hidden>
            <Landscape />
          </div>
        </div>
        <div className="relative mt-6 h-9 w-full" aria-live="polite">
          {/* crossfade the two words */}
          <span className="absolute inset-x-0 text-center font-display text-2xl font-bold transition-opacity duration-700"
            style={{ opacity: growing ? 1 : 0 }} aria-hidden={!growing}>
            Breathe in
          </span>
          <span className="absolute inset-x-0 text-center font-display text-2xl font-bold transition-opacity duration-700"
            style={{ opacity: growing ? 0 : 1 }} aria-hidden={growing}>
            Breathe out
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {progress !== null && (
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2EADA" strokeWidth="3" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#4A6355" strokeWidth="3"
            strokeLinecap="round" strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
            style={{ transition: 'stroke-dashoffset 300ms linear' }} />
        </svg>
      )}
      <div className="absolute inset-3 rounded-full bg-pistachio shadow-[0_0_60px_10px_rgba(226,234,218,0.9)]"
        style={layer(1, 0.6, 0)} aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center" aria-live="polite">
        {/* crossfade the two words */}
        <span className="absolute text-lg text-sage transition-opacity duration-700" style={{ opacity: growing ? 1 : 0 }}
          aria-hidden={!growing}>
          Breathe in
        </span>
        <span className="absolute text-lg text-sage transition-opacity duration-700" style={{ opacity: growing ? 0 : 1 }}
          aria-hidden={growing}>
          Breathe out
        </span>
      </div>
    </div>
  )
}
