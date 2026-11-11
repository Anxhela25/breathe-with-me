// Turns the camera's colour readings into heartbeats (photoplethysmography, PPG).
// Each heartbeat pushes a little more blood into the fingertip, so the image gets slightly darker.
// This is plain signal processing on the phone, not an AI model. The numbers are first guesses and
// are tuned with real recordings from the test screen.

const MIN_BEAT_GAP_S = 0.33  // fastest: about 180 beats per minute
const MIN_IBI_MS = 300
const MAX_IBI_MS = 1500  // slowest: 40 beats per minute
const MAX_JUMP = 0.3  // a beat more than 30% away from the usual gap is probably a movement

/** A fingertip lit by the flash looks bright red with very little green and blue. */
export function fingerOnLens({ r, g, b }) {
  return r > 60 && r > 2 * g && r > 2 * b
}

function movingAverage(values, size) {
  const half = Math.floor(size / 2)
  const result = new Array(values.length)
  let sum = 0
  let from = 0
  let to = -1
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - half)
    const end = Math.min(values.length - 1, i + half)
    while (to < end) sum += values[++to]
    while (from < start) sum -= values[from++]
    result[i] = sum / (to - from + 1)
  }
  return result
}

const median = list => {
  if (!list.length) return null
  const sorted = [...list].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * samples: [{ t (seconds), r, g, b }], about 30 per second.
 * Returns the pulse wave, the beat times and the time between beats, or null if too short.
 */
export function analyzePulse(samples, { channel = 'r' } = {}) {
  if (samples.length < 90) return null
  const times = samples.map(s => s.t)
  const rate = (samples.length - 1) / (times[times.length - 1] - times[0])
  // remove the slow drift (1 s average), and flip it: more blood = darker = a peak upwards
  const raw = samples.map(s => s[channel])
  const trend = movingAverage(raw, Math.round(rate))
  const pulse = raw.map((value, i) => trend[i] - value)
  // smooth out camera noise (about 0.1 s)
  const wave = movingAverage(pulse, Math.max(3, Math.round(rate * 0.1)))

  // candidate beats: the highest point within 0.25 s on each side, above the drift line
  const half = Math.max(1, Math.round(rate * 0.25))
  const candidates = []
  for (let i = half; i < wave.length - half; i++) {
    if (wave[i] <= 0) continue
    let highest = true
    for (let j = i - half; j <= i + half && highest; j++) if (wave[j] > wave[i]) highest = false
    if (highest) candidates.push(i)
  }
  // drop small bumps (the second little wave after each beat)
  const typical = median(candidates.map(i => wave[i])) ?? 0
  const beats = []
  for (const i of candidates.filter(i => wave[i] >= 0.35 * typical)) {
    // place the beat between frames, from the shape of the peak (30 frames a second is coarse)
    const [a, b, c] = [wave[i - 1], wave[i], wave[i + 1]]
    const bend = a - 2 * b + c
    const shift = bend === 0 ? 0 : Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / bend))
    const time = times[i] + shift * ((times[i + 1] - times[i - 1]) / 2)
    if (!beats.length || time - beats[beats.length - 1] >= MIN_BEAT_GAP_S) beats.push(time)
  }

  const ibis = []  // time between beats, in ms, with the time of the second beat
  for (let k = 1; k < beats.length; k++) ibis.push({ t: beats[k], ms: (beats[k] - beats[k - 1]) * 1000 })
  const usual = median(ibis.map(x => x.ms).filter(ms => ms >= MIN_IBI_MS && ms <= MAX_IBI_MS))
  const clean = ibis.filter(x => usual && x.ms >= MIN_IBI_MS && x.ms <= MAX_IBI_MS
    && Math.abs(x.ms - usual) / usual <= MAX_JUMP)

  return {
    rate,
    wave: wave.map((v, i) => ({ t: times[i], v })),
    beats,
    ibis,
    clean,
    bpm: clean.length ? Math.round(60000 / median(clean.map(x => x.ms))) : null,
    quality: ibis.length ? clean.length / ibis.length : 0,  // share of beats that look right
  }
}
