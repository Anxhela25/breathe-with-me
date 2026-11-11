// Developer test for the calm check (project plan 5.10): does the camera give a clean pulse on this phone?
// Shows the live pulse wave, the heart rate and how many beats look right, and can save a recording
// to tune the measurement. Not part of the help flow.
import { useEffect, useRef, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { calmCameraAvailable, lockCalmExposure, startCalmCamera } from '../lib/calmCamera.js'
import { analyzePulse, fingerOnLens } from '../lib/pulse.js'

const KEEP_S = 90  // seconds of readings kept in memory
const WINDOW_S = 15  // heart rate from the last 15 seconds
const WAVE_S = 6  // seconds of wave on screen

function Wave({ wave, beats }) {
  if (!wave?.length) return <div className="h-32 w-full rounded-2xl bg-white" />
  const end = wave[wave.length - 1].t
  const shown = wave.filter(p => p.t >= end - WAVE_S)
  const values = shown.map(p => p.v)
  const low = Math.min(...values)
  const range = Math.max(...values) - low || 1
  const x = t => ((t - (end - WAVE_S)) / WAVE_S) * 300
  const y = v => 110 - ((v - low) / range) * 100
  const points = shown.map(p => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox="0 0 300 120" className="h-32 w-full rounded-2xl bg-white" aria-label="Pulse wave">
      <polyline points={points} fill="none" stroke="#4A6355" strokeWidth="2" strokeLinejoin="round" />
      {beats.filter(t => t >= end - WAVE_S).map(t => (
        <line key={t} x1={x(t)} x2={x(t)} y1="0" y2="120" stroke="#B4413C" strokeOpacity="0.35" />
      ))}
    </svg>
  )
}

export default function CalmTest() {
  const samples = useRef([])
  const stopCamera = useRef(null)
  const [running, setRunning] = useState(false)
  const [channel, setChannel] = useState('auto')
  const [view, setView] = useState(null)
  const [message, setMessage] = useState('')

  async function start() {
    setMessage('')
    samples.current = []
    try {
      stopCamera.current = await startCalmCamera(frame => {
        samples.current.push(frame)
        const cutoff = frame.t - KEEP_S
        while (samples.current.length && samples.current[0].t < cutoff) samples.current.shift()
      })
      setRunning(true)
      // let the camera adjust to the lit finger first, then keep its brightness fixed
      setTimeout(() => lockCalmExposure().catch(() => {}), 2000)
    } catch (err) {
      setMessage(err?.code === 'PERMISSION_DENIED'
        ? 'Camera access is off. Turn it on in Settings > Breathe With Me > Camera.'
        : `The camera could not start. ${err?.message ?? ''}`)
    }
  }

  async function stop() {
    const done = stopCamera.current
    stopCamera.current = null
    setRunning(false)
    await done?.()
  }

  useEffect(() => () => { stopCamera.current?.() }, [])

  // refresh the numbers 5 times a second
  useEffect(() => {
    if (!running) return undefined
    const timer = setInterval(() => {
      const all = samples.current
      if (!all.length) return
      const last = all[all.length - 1]
      const recent = all.filter(s => s.t >= last.t - WINDOW_S)
      setView({
        last,
        seconds: all.length > 1 ? last.t - all[0].t : 0,
        finger: fingerOnLens(last),
        result: analyzePulse(recent, { channel }),
      })
    }, 200)
    return () => clearInterval(timer)
  }, [running, channel])

  async function saveRecording() {
    setMessage('')
    const data = JSON.stringify({
      device: navigator.userAgent,
      recordedAt: new Date().toISOString(),
      samples: samples.current.map(s => [+s.t.toFixed(4), +s.r.toFixed(2), +s.g.toFixed(2), +s.b.toFixed(2)]),
    })
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const { uri } = await Filesystem.writeFile({
        path: 'calm-check-recording.json', data, directory: Directory.Cache, encoding: Encoding.UTF8,
      })
      await Share.share({ title: 'Calm check recording', files: [uri] })
    } catch (err) {
      if (!/cancel/i.test(err?.message ?? '')) setMessage(`Couldn't save the recording. ${err?.message ?? ''}`)
    }
  }

  if (!calmCameraAvailable()) {
    return (
      <Screen>
        <h1 className="mt-10 text-2xl font-bold">Calm check camera test</h1>
        <p className="mt-3 text-center text-sage/80">This needs the iPhone app: the browser can't use the flash.</p>
        <Button to="/settings" variant="link" className="mt-6">Back</Button>
      </Screen>
    )
  }

  const result = view?.result
  return (
    <Screen>
      <h1 className="mt-6 text-2xl font-bold">Calm check camera test</h1>
      <p className="mt-1 text-center text-sm text-sage/70">
        Rest a fingertip gently on the back camera and the flash. Don&apos;t press hard. Keep still.
      </p>

      <div className="mt-5 w-full"><Wave wave={result?.wave} beats={result?.beats ?? []} /></div>

      <dl className="mt-4 grid w-full grid-cols-2 gap-2 text-sm">
        <Stat label="Finger on lens" value={view ? (view.finger ? 'Yes' : 'No') : '-'} />
        <Stat label="Heart rate" value={result?.bpm ? `${result.bpm} bpm` : '-'} />
        <Stat label="Beats that look right" value={result?.ibis.length ? `${Math.round(result.quality * 100)}%` : '-'} />
        <Stat label="Recording" value={view ? `${Math.round(view.seconds)} s` : '-'} />
        <Stat label="Colour (r / g / b)" value={view
          ? `${view.last.r.toFixed(0)} / ${view.last.g.toFixed(0)} / ${view.last.b.toFixed(0)}` : '-'} />
        <Stat label="Frames per second" value={result ? result.rate.toFixed(1) : '-'} />
      </dl>

      <div className="mt-3 flex w-full gap-2 text-sm">
        {[['auto', 'Auto'], ['r', 'Red'], ['g', 'Green']].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setChannel(value)} aria-pressed={channel === value}
            className={`flex-1 rounded-2xl border px-3 py-2 ${channel === value ? 'border-sage bg-pistachio font-bold' : 'border-sage/20 bg-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {message && <p role="alert" className="mt-3 text-center text-sm font-bold text-alert">{message}</p>}

      <div className="mt-5 flex w-full flex-col items-center gap-2">
        {running
          ? <Button onClick={stop}>Stop</Button>
          : <Button onClick={start}>{view ? 'Start again' : 'Start'}</Button>}
        {!running && view && view.seconds > 5 && (
          <Button variant="outline" onClick={saveRecording}>Save the recording</Button>
        )}
        <Button to="/settings" variant="link">Back</Button>
      </div>
    </Screen>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-sage/15 bg-white px-3 py-2">
      <dt className="text-xs text-sage/70">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  )
}
