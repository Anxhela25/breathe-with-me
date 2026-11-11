// Calm check (project plan section 5): one minute of breathing with the circle while a fingertip rests
// on the camera. The heart rate is shown in calm colours; how well the rhythm followed the circle is
// turned into kind words. Never during a strong attack, never a red zone.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import BreathingCircle from '../components/BreathingCircle.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { calmCameraAvailable, lockCalmExposure, startCalmCamera } from '../lib/calmCamera.js'
import { analyzePulse, calmResult, fingerOnLens, RESULT } from '../lib/pulse.js'
import { getCalmBaseline, saveCalmCheck } from '../lib/api.js'

const MEASURE_S = 60  // seconds with the finger on the lens
const GUIDE = { inhaleMs: 4000, exhaleMs: 6000 }  // the same pace as the breathing screen
const SLOWER = { inhaleMs: 5000, exhaleMs: 7000 }  // "breathe a little longer": a longer out-breath
const MAX_TRIES = 2
const WAVE_S = 5

const SAFETY = 'If you feel dizzy or unwell, stop and contact a doctor or emergency services.'

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
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) getCalmBaseline().then(setHistory).catch(() => {})
  }, [user])

  const firstTime = !fromSession && history.count === 0
  const source = fromSession ? 'end_of_session' : firstTime ? 'baseline' : 'practice'

  async function finish(samples) {
    const result = calmResult(analyzePulse(samples), (GUIDE.inhaleMs + GUIDE.exhaleMs) / 1000, history.baseline)
    if (result.key === RESULT.retry) {
      setTries(t => t + 1)
      setOutcome(result)
      setPhase('result')
      return
    }
    setOutcome(result)
    setPhase('result')
    if (!user) return  // nothing is saved without an account
    try {
      await saveCalmCheck({
        source,
        level: Math.round(result.level * 1000) / 1000,
        message_key: result.key,
        heart_rate: result.heartRate,
        episode_id: fromSession ? await episodeId() : null,
      })
    } catch { /* the result is still shown; saving is not worth interrupting her */ }
  }

  if (phase === 'unavailable') {
    return (
      <Screen>
        <div className="mt-12 h-28 w-28 rounded-full bg-pistachio" aria-hidden />
        <h1 className="mt-8 text-center text-2xl font-bold">The calm check works in the iPhone app.</h1>
        <p className="mt-2 text-center text-sage/80">It needs the phone&apos;s camera and flash.</p>
        <div className="mt-auto w-full pt-8"><Button onClick={leave}>Continue</Button></div>
      </Screen>
    )
  }

  if (phase === 'intro') {
    return (
      <Screen>
        <div className="mt-10 flex h-40 w-28 items-start justify-center rounded-3xl border-2 border-sage/30 bg-white pt-4" aria-hidden>
          <div className="h-12 w-12 rounded-full bg-[#E8C4B0] shadow-[0_0_0_6px_rgba(226,234,218,0.9)]" />
        </div>
        <h1 className="mt-8 text-center text-2xl font-bold">
          {firstTime ? "Let's learn your calm rhythm." : 'Rest your fingertip on the camera.'}
        </h1>
        <p className="mt-2 text-center text-sage/80">
          {firstTime && 'Do this once, when you feel calm and are sitting comfortably. '}
          Rest your fingertip gently on the back camera and the flash. Do not press hard.
          Then breathe with the circle for one minute.
        </p>
        <p className="mt-4 text-center text-xs text-sage/70">{SAFETY}</p>
        {error && <p role="alert" className="mt-4 text-center text-sm font-bold">{error}</p>}
        <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
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

  // result
  if (outcome?.key === RESULT.retry) {
    const canRetry = tries < MAX_TRIES
    return (
      <Screen>
        <div className="mt-12 h-28 w-28 rounded-full bg-pistachio" aria-hidden />
        <h1 className="mt-8 text-center text-2xl font-bold">{canRetry ? "Let's try again." : "That's okay."}</h1>
        <p className="mt-2 text-center text-sage/80">
          {canRetry ? 'Rest your finger gently and keep it still.' : "We'll skip it this time."}
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
    <Screen>
      {outcome?.heartRate && (
        <div className="mt-12 flex h-44 w-44 flex-col items-center justify-center rounded-full border-[10px] border-pistachio bg-white"
          aria-label={`Average heart rate ${outcome.heartRate} beats per minute`}>
          <span className="text-6xl font-bold text-sage">{outcome.heartRate}</span>
          <span className="text-sm text-sage/70">bpm</span>
        </div>
      )}
      <p className="mt-8 text-center text-xl">
        {steady
          ? (history.count ? 'Your rhythm looks steadier than before.' : 'Your rhythm is following your breathing.')
          : 'Well done for taking this time.'}
      </p>
      {!steady && <p className="mt-2 text-center text-sage/80">A few slower breaths can help even more.</p>}
      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-8">
        {steady ? <Button onClick={leave}>Done</Button> : (
          <>
            <Button onClick={() => setPhase('slower')}>Breathe a little longer</Button>
            <Button variant="link" onClick={leave}>Done</Button>
          </>
        )}
      </div>
    </Screen>
  )
}

function Measuring({ onDone, onStop, onError }) {
  // the latest callbacks, so the camera starts once and isn't restarted when the parent re-renders
  const callbacks = useRef({ onDone, onError })
  useEffect(() => { callbacks.current = { onDone, onError } })
  const samples = useRef([])
  const stopCamera = useRef(null)
  const fingerSeconds = useRef(0)
  const locked = useRef(false)
  const finished = useRef(false)
  const [view, setView] = useState({ progress: 0, finger: true, wave: [] })

  useEffect(() => {
    let cancelled = false
    samples.current = []
    fingerSeconds.current = 0
    startCalmCamera(frame => {
      const all = samples.current
      const previous = all[all.length - 1]
      all.push(frame)
      // the minute only counts while the finger is on the lens
      if (previous && fingerOnLens(frame)) fingerSeconds.current += Math.min(0.1, frame.t - previous.t)
      if (!locked.current && fingerSeconds.current > 1.5) {
        locked.current = true
        lockCalmExposure().catch(() => {})
      }
    }).then(stop => {
      if (cancelled) stop()
      else stopCamera.current = stop
    }).catch(err => {
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
    const timer = setInterval(async () => {
      const all = samples.current
      if (!all.length || finished.current) return
      const last = all[all.length - 1]
      const progress = Math.min(1, fingerSeconds.current / MEASURE_S)
      const recent = analyzePulse(all.filter(s => s.t >= last.t - 8))
      setView({ progress, finger: fingerOnLens(last), wave: recent?.wave.filter(p => p.t >= last.t - WAVE_S) ?? [] })
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

  return (
    <Screen>
      <div className="mt-6"><BreathingCircle {...GUIDE} /></div>
      <p className="mt-2 text-center" aria-live="polite">
        {view.finger ? 'Keep your finger still. Breathe with the circle.' : 'Rest your finger gently on the camera.'}
      </p>
      <div className="mt-6 h-1.5 w-2/3 overflow-hidden rounded-full bg-pistachio" role="progressbar"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.progress * 100)}>
        <div className="h-full rounded-full bg-sage transition-[width] duration-300" style={{ width: `${view.progress * 100}%` }} />
      </div>
      <SoftWave wave={view.wave} faded={!view.finger} />
      <div className="mt-auto pt-4"><Button variant="link" onClick={onStop}>Stop</Button></div>
    </Screen>
  )
}

/** The live pulse, smoothed and pale: it shows the reading works without counting beats. */
function SoftWave({ wave, faded }) {
  if (wave.length < 10) return <div className="mt-6 h-20 w-full" />
  const start = wave[0].t
  const span = wave[wave.length - 1].t - start || 1
  const values = wave.map(p => p.v)
  const low = Math.min(...values)
  const range = Math.max(...values) - low || 1
  const points = wave.map(p => `${(((p.t - start) / span) * 300).toFixed(1)},${(70 - ((p.v - low) / range) * 60).toFixed(1)}`).join(' ')
  return (
    <svg viewBox="0 0 300 80" className={`mt-6 h-20 w-full rounded-2xl bg-pistachio/50 transition-opacity duration-500 ${faded ? 'opacity-20' : 'opacity-100'}`}
      aria-hidden>
      <polyline points={points} fill="none" stroke="#4A6355" strokeOpacity="0.7" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
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
    <Screen>
      <div className="mt-6"><BreathingCircle {...SLOWER} /></div>
      <p className="mt-2 text-center">Make the out-breath a little longer.</p>
      <div className="mt-6 h-1.5 w-2/3 overflow-hidden rounded-full bg-pistachio">
        <div className="h-full rounded-full bg-sage transition-[width] duration-1000" style={{ width: `${(seconds / MEASURE_S) * 100}%` }} />
      </div>
      <div className="mt-auto flex flex-col items-center pt-4">
        {done ? <Button onClick={onDone}>Done</Button> : <Button variant="link" onClick={onDone}>Stop</Button>}
      </div>
    </Screen>
  )
}
