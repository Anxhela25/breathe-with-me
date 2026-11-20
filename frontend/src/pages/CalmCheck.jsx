// Calm check: 1 minute breathing with the circle, fingertip on the camera.
// Shows the heart rate, and turns how well the rhythm followed the circle into kind words.
// Never during a strong attack, no red zones.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import BreathingCircle from '../components/BreathingCircle.jsx'
import StatTile from '../components/StatTile.jsx'
import { BreathIcon, ClockIcon, HeartIcon, RhythmIcon } from '../components/Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { calmCameraAvailable, lockCalmExposure, startCalmCamera } from '../lib/calmCamera.js'
import { analyzePulse, calmResult, fingerOnLens, pulseWave, RESULT } from '../lib/pulse.js'
import { getCalmBaseline, saveCalmCheck } from '../lib/api.js'
import { useReducedMotion } from '../lib/motion.js'

const MEASURE_S = 60  // seconds with the finger on the lens
const GUIDE = { inhaleMs: 4000, exhaleMs: 6000 }  // the same pace as the breathing screen
const SLOWER = { inhaleMs: 5000, exhaleMs: 7000 }  // longer out-breath
const BREATH_S = (GUIDE.inhaleMs + GUIDE.exhaleMs) / 1000
const BREATHS = Math.round(MEASURE_S / BREATH_S)
const MAX_TRIES = 2
const WAVE_S = 5

const SAFETY = 'If you feel dizzy or unwell, stop and contact a doctor or emergency services.'

const timeLeft = seconds => {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function CalmCheck() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { episodeId } = useSession()
  const fromSession = params.get('from') === 'session'
  const leave = useCallback(() => navigate(fromSession ? '/questions' : '/', { replace: true }), [navigate, fromSession])

  const [phase, setPhase] = useState(calmCameraAvailable() ? 'intro' : 'unavailable')
  const [history, setHistory] = useState({ count: null, baseline: null })
  const [tries, setTries] = useState(0)
  const [outcome, setOutcome] = useState(null)
  const [saved, setSaved] = useState('idle')  // idle | saving | saved | failed
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) getCalmBaseline().then(setHistory).catch(() => {})
  }, [user])

  const firstTime = !fromSession && history.count === 0
  const source = fromSession ? 'end_of_session' : firstTime ? 'baseline' : 'practice'

  function finish(samples) {
    const result = calmResult(analyzePulse(samples), BREATH_S, history.baseline)
    if (result.key === RESULT.retry) setTries(t => t + 1)
    setOutcome(result)
    setSaved('idle')
    setPhase('result')
    // auto-saved when logged in, failed readings aren't saved
    if (result.key !== RESULT.retry && user) save(result)
  }

  async function save(result) {
    setSaved('saving')
    try {
      await saveCalmCheck({
        source,
        level: Math.round(result.level * 1000) / 1000,
        message_key: result.key,
        heart_rate: result.heartRate,
        episode_id: fromSession ? await episodeId() : null,
      })
      setSaved('saved')
    } catch {
      setSaved('failed')
    }
  }

  if (phase === 'unavailable') {
    return (
      <Screen calm key="unavailable">
        <div className="mt-10"><FingerIllustration /></div>
        <h1 className="mt-8 text-center text-2xl font-bold">The calm check works in the iPhone app.</h1>
        <p className="mt-2 text-center text-sage/80">It needs the phone&apos;s camera and flash.</p>
        <div className="mt-auto w-full pt-8"><Button onClick={leave}>Continue</Button></div>
      </Screen>
    )
  }

  if (phase === 'intro') {
    return (
      <Screen calm key="intro">
        <div className="mt-8"><FingerIllustration /></div>
        <h1 className="mt-8 text-center text-2xl font-bold">
          {firstTime ? "Let's learn your calm rhythm." : 'Rest your fingertip on the camera.'}
        </h1>
        <p className="mt-2 text-center text-sage/80">
          {firstTime && 'Do this once, when you feel calm and are sitting comfortably. '}
          Rest your fingertip gently on the back camera and the flash. Do not press hard.
          Then breathe with the circle for one minute.
        </p>
        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          <StatTile icon={<ClockIcon />} label="Takes" value="1 minute" tone="blue" />
          <StatTile icon={<BreathIcon />} label="Breaths" value={`${BREATHS} slow ones`} tone="lavender" />
        </div>
        <p className="mt-4 text-center text-xs text-sage/70">{SAFETY}</p>
        {error && <p role="alert" className="mt-3 text-center text-sm font-bold">{error}</p>}
        <div className="mt-auto flex w-full flex-col items-center gap-2 pt-6">
          <Button onClick={() => { setError(''); setPhase('measuring') }}>I&apos;m ready</Button>
          <Button variant="link" onClick={leave}>Not now</Button>
        </div>
      </Screen>
    )
  }

  if (phase === 'measuring') {
    return <Measuring onDone={finish} onStop={leave} onError={message => { setError(message); setPhase('intro') }} />
  }

  if (phase === 'slower') return <SlowerGuide onDone={leave} />

  if (outcome?.key === RESULT.retry) {
    const canRetry = tries < MAX_TRIES
    return (
      <Screen calm key={`retry-${tries}`}>
        <div className="mt-8"><FingerIllustration /></div>
        <h1 className="mt-8 text-center text-2xl font-bold">{canRetry ? "Let's try again." : "That's okay."}</h1>
        <p className="mt-2 text-center text-sage/80">
          {canRetry ? 'Rest your finger gently and keep it still. Warm fingers read best.' : "We'll skip it this time."}
        </p>
        <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
          {canRetry ? (
            <>
              <Button onClick={() => setPhase('measuring')}>Try again</Button>
              <Button variant="link" onClick={leave}>Not now</Button>
            </>
          ) : <Button onClick={leave}>Continue</Button>}
        </div>
      </Screen>
    )
  }

  const steady = outcome?.key === RESULT.steady
  return (
    <Screen calm key="result">
      <div className="mt-8"><ResultRing heartRate={outcome?.heartRate} steady={steady} /></div>
      <p className="mt-6 text-center text-xl">
        {steady
          ? (history.count ? 'Your rhythm looks steadier than before.' : 'Your rhythm is following your breathing.')
          : 'Well done for taking this time.'}
      </p>
      {!steady && <p className="mt-1 text-center text-sage/80">A few slower breaths can help even more.</p>}
      <div className="mt-6 grid w-full grid-cols-2 gap-2">
        <StatTile icon={<HeartIcon />} label="Heart rate" value={outcome?.heartRate ? `${outcome.heartRate} bpm` : '-'} />
        <StatTile icon={<RhythmIcon />} label="Rhythm" value={steady ? 'Steadier' : 'Settling'} tone="lavender" />
        <StatTile icon={<ClockIcon />} label="Time" value="1 minute" tone="blue" />
        <StatTile icon={<BreathIcon />} label="Breaths" value={`${BREATHS} slow ones`} />
      </div>
      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
        {!steady && <Button onClick={() => setPhase('slower')}>Breathe a little longer</Button>}
        {!user && (
          <p className="py-2 text-center text-sm text-sage/70">Log in to keep your calm checks in your history.</p>
        )}
        {saved === 'saved' && (
          <p role="status" className="flex items-center gap-2 py-2 text-sm font-bold text-ok">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            Saved to your history
          </p>
        )}
        {saved === 'failed' && (
          <p role="alert" className="py-2 text-center text-sm">
            Couldn&apos;t save it.{' '}
            <button type="button" onClick={() => save(outcome)} className="font-bold underline">Try again</button>
          </p>
        )}
        <Button variant={steady ? 'primary' : 'link'} onClick={leave}>Done</Button>
      </div>
    </Screen>
  )
}

function Measuring({ onDone, onStop, onError }) {
  // latest callbacks in refs, so the camera starts once and isn't restarted on re-render
  const callbacks = useRef({ onDone, onError })
  useEffect(() => { callbacks.current = { onDone, onError } })
  const samples = useRef([])
  const channel = useRef('r')  // red or green, whichever gives a cleaner pulse on this phone
  const stopCamera = useRef(null)
  const fingerSeconds = useRef(0)
  const locked = useRef(false)
  const finished = useRef(false)
  const [view, setView] = useState({ progress: 0, finger: true, bpm: null })

  useEffect(() => {
    let cancelled = false
    samples.current = []
    fingerSeconds.current = 0
    startCalmCamera(frame => {
      const all = samples.current
      const previous = all[all.length - 1]
      all.push(frame)
      // only count time while the finger is on the lens
      if (previous && fingerOnLens(frame)) fingerSeconds.current += Math.min(0.1, frame.t - previous.t)
      if (!locked.current && fingerSeconds.current > 1.5) {
        locked.current = true
        lockCalmExposure().catch(err => console.warn('[calm check] exposure lock failed:', err?.message ?? err))
      }
    }).then(stop => {
      if (cancelled) stop()
      else stopCamera.current = stop
    }).catch(err => {
      console.warn('[calm check] camera failed to start:', err?.code, err?.message ?? err)
      if (!cancelled) {
        callbacks.current.onError(err?.code === 'PERMISSION_DENIED'
          ? 'Camera access is off. You can turn it on in Settings > Breathe With Me > Camera.'
          : "The camera couldn't start. Please try again.")
      }
    })
    return () => {
      cancelled = true
      stopCamera.current?.()
      stopCamera.current = null
    }
  }, [])

  useEffect(() => {
    let ticks = 0
    const timer = setInterval(async () => {
      const all = samples.current
      if (!all.length || finished.current) return
      const last = all[all.length - 1]
      const progress = Math.min(1, fingerSeconds.current / MEASURE_S)
      // every second: heart rate + best channel from the last 15s
      let bpm
      if (++ticks % 4 === 0) {
        const recent = analyzePulse(all.filter(s => s.t >= last.t - 15))
        if (recent) channel.current = recent.channel
        bpm = recent && recent.quality >= 0.6 ? recent.bpm : null
      }
      setView(v => ({ progress, finger: fingerOnLens(last), bpm: bpm === undefined ? v.bpm : bpm }))
      if (progress >= 1) {
        finished.current = true
        const stop = stopCamera.current
        stopCamera.current = null
        await stop?.()
        callbacks.current.onDone(samples.current)
      }
    }, 250)
    return () => clearInterval(timer)
  }, [])

  const secondsIn = view.progress * MEASURE_S
  return (
    <Screen calm key="measuring">
      <div className="mt-8"><BreathingCircle {...GUIDE} progress={view.progress} /></div>
      <p className="mt-8 h-6 text-center" aria-live="polite">
        {view.finger ? 'Keep your finger still. Breathe with the circle.' : 'Rest your finger gently on the camera.'}
      </p>
      <div className="mt-8 grid w-full grid-cols-3 gap-3">
        <StatTile icon={<HeartIcon />} label="Heart" value={view.bpm ? `${view.bpm}` : '…'} />
        <StatTile icon={<ClockIcon />} label="Left" value={timeLeft(MEASURE_S - secondsIn)} tone="blue" />
        <StatTile icon={<BreathIcon />} label="Breaths"
          value={`${Math.min(BREATHS, Math.floor(secondsIn / BREATH_S))}/${BREATHS}`} tone="lavender" />
      </div>
      <LiveWave samples={samples} channel={channel} faded={!view.finger} />
      <div className="mt-auto pt-3"><Button variant="link" onClick={onStop}>Stop</Button></div>
    </Screen>
  )
}

/** Live pulse line with a pale fill, drawn every frame. No beat markers. */
function LiveWave({ samples, channel, faded }) {
  const canvas = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    let frame
    let lastDraw = 0
    const draw = now => {
      frame = requestAnimationFrame(draw)
      if (now - lastDraw < (reduced ? 500 : 30)) return  // ~30fps, twice a second with Reduce Motion
      lastDraw = now
      const el = canvas.current
      const all = samples.current
      if (!el || all.length < 30) return
      const last = all[all.length - 1].t
      const wave = pulseWave(all.slice(-Math.min(all.length, 8 * 30)), channel.current).filter(p => p.t >= last - WAVE_S)
      const ratio = window.devicePixelRatio || 1
      const width = el.clientWidth
      const height = el.clientHeight
      if (el.width !== width * ratio) { el.width = width * ratio; el.height = height * ratio }
      const ctx = el.getContext('2d')
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, width, height)
      if (wave.length < 10) return
      const values = wave.map(p => p.v)
      const low = Math.min(...values)
      const range = Math.max(...values) - low || 1
      const x = t => ((t - (last - WAVE_S)) / WAVE_S) * width
      const y = v => height - 10 - ((v - low) / range) * (height - 20)
      ctx.beginPath()
      wave.forEach((p, i) => (i ? ctx.lineTo(x(p.t), y(p.v)) : ctx.moveTo(x(p.t), y(p.v))))
      // fill under the line
      ctx.lineTo(x(wave[wave.length - 1].t), height)
      ctx.lineTo(x(wave[0].t), height)
      ctx.closePath()
      const fill = ctx.createLinearGradient(0, 0, 0, height)
      fill.addColorStop(0, 'rgba(201, 220, 235, 0.65)')
      fill.addColorStop(1, 'rgba(226, 234, 218, 0)')
      ctx.fillStyle = fill
      ctx.fill()
      // the line itself
      ctx.beginPath()
      wave.forEach((p, i) => (i ? ctx.lineTo(x(p.t), y(p.v)) : ctx.moveTo(x(p.t), y(p.v))))
      ctx.strokeStyle = 'rgba(74, 99, 85, 0.75)'
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [samples, channel, reduced])

  return (
    <canvas ref={canvas} aria-hidden
      className={`mt-6 h-20 w-full rounded-2xl bg-white/60 transition-opacity duration-500 ${faded ? 'opacity-25' : 'opacity-100'}`} />
  )
}

/** Heart rate in a ring that fills in and counts up. Check mark when steady. */
function ResultRing({ heartRate, steady }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? heartRate : 0)

  useEffect(() => {
    if (!heartRate || reduced) { setShown(heartRate); return undefined }
    let frame
    const start = performance.now()
    const tick = now => {
      // frame time can be a bit before start, clamp to 0
      const t = Math.min(1, Math.max(0, (now - start) / 1200))
      setShown(Math.round(heartRate * (1 - (1 - t) ** 3)))  // ease out
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [heartRate, reduced])

  return (
    <div className="relative h-48 w-48">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 192 192" aria-hidden>
        <circle cx="96" cy="96" r="86" fill="white" fillOpacity="0.85" stroke="#E2EADA" strokeWidth="10" />
        <circle cx="96" cy="96" r="86" fill="none" stroke="#C9DCEB" strokeWidth="10" strokeLinecap="round"
          pathLength="1" className="animate-draw" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"
        aria-label={heartRate ? `Average heart rate ${heartRate} beats per minute` : undefined}>
        {heartRate ? (
          <>
            <span className="text-6xl font-bold tabular-nums text-sage">{shown}</span>
            <span className="text-sm text-sage/70">bpm</span>
          </>
        ) : <span className="text-sage/70">Done</span>}
      </div>
      {steady && (
        <span className="absolute -bottom-2 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-pistachio shadow-md shadow-sage/10">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#4A6355" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className="animate-draw" style={{ animationDelay: '900ms' }} />
          </svg>
        </span>
      )}
    </div>
  )
}

/**
 * Looping animation: phone from the back, a finger slides onto the camera, flash glows.
 * Static with Reduce Motion.
 */
function FingerIllustration() {
  return (
    <svg viewBox="0 0 240 150" className="h-36 w-56" aria-hidden>
      {/* phone, horizontal, from the back */}
      <rect x="8" y="14" width="196" height="122" rx="26" fill="white" />
      {/* camera: two lenses + flash */}
      <rect x="22" y="28" width="74" height="56" rx="18" fill="#E2EADA" />
      <circle cx="42" cy="46" r="10" fill="#2F4136" fillOpacity="0.85" />
      <circle cx="42" cy="70" r="9" fill="#2F4136" fillOpacity="0.85" />
      <circle cx="70" cy="46" r="5" fill="#F5E6B8" />
      {/* flash glow through the finger */}
      <circle cx="54" cy="46" r="30" fill="#F5D9A8" className="finger-glow" />
      {/* finger sliding in from the right */}
      <g className="finger-slide">
        <path d="M260 26 L56 26 Q30 26 30 46 Q30 66 56 66 L260 66 Z" fill="#E8C4B0" stroke="#C99A85" strokeWidth="2" />
        <path d="M44 36 Q36 36 36 46 Q36 56 44 56 L56 56 Q60 46 56 36 Z" fill="#F2D7C8" stroke="#C99A85" strokeWidth="1.5" />
      </g>
      <rect x="8" y="14" width="196" height="122" rx="26" fill="none" stroke="#4A6355" strokeOpacity="0.35" strokeWidth="3" />
    </svg>
  )
}

function SlowerGuide({ onDone }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => Math.min(MEASURE_S, s + 1)), 1000)
    return () => clearInterval(timer)
  }, [])
  const done = seconds >= MEASURE_S
  return (
    <Screen calm key="slower">
      <div className="mt-8"><BreathingCircle {...SLOWER} progress={seconds / MEASURE_S} /></div>
      <p className="mt-8 text-center">Make the out-breath a little longer.</p>
      <div className="mt-8 w-1/2">
        <StatTile icon={<ClockIcon />} label="Left" value={timeLeft(MEASURE_S - seconds)} tone="blue" />
      </div>
      <div className="mt-auto flex flex-col items-center pt-4">
        {done ? <Button onClick={onDone}>Done</Button> : <Button variant="link" onClick={onDone}>Stop</Button>}
      </div>
    </Screen>
  )
}
