// Turns the camera colour readings into heartbeats (PPG).
// Each beat pushes more blood into the fingertip, so the image gets a bit darker.
// Just signal processing, no AI. The numbers are first guesses, tune with real recordings.

const MIN_BEAT_GAP_S = 0.33  // fastest: about 180 beats per minute
const MIN_IBI_MS = 300
const MAX_IBI_MS = 1500  // slowest: 40 beats per minute
const MAX_JUMP = 0.3  // a beat more than 30% away from the usual gap is probably a movement

/** A fingertip lit by the flash looks bright red with very little green and blue. */
export function fingerOnLens({ r, g, b }) {
  return r > 60 && r > 2 * g && r > 2 * b
}

export const median = list => {
  if (!list.length) return null
  const sorted = [...list].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// 2nd order Butterworth (Audio EQ Cookbook). Run forwards and backwards
// so the beats don't shift in time.
function biquad(values, type, cutoff, rate) {
  const w = (2 * Math.PI * cutoff) / rate
  const alpha = Math.sin(w) / Math.SQRT2
  const cos = Math.cos(w)
  const [b0, b1, b2] = type === 'low'
    ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2]
    : [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
  const [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha]
  const run = input => {
    const out = new Array(input.length)
    let [x1, x2, y1, y2] = [input[0], input[0], type === 'low' ? input[0] : 0, type === 'low' ? input[0] : 0]
    for (let i = 0; i < input.length; i++) {
      const y = (b0 * input[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
      ;[x2, x1, y2, y1] = [x1, input[i], y1, y]
      out[i] = y
    }
    return out
  }
  return run(run(values).reverse()).reverse()
}

/** Keeps only changes at heartbeat speed (about 40 to 210 beats per minute). */
function pulseBand(values, rate) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return biquad(biquad(values.map(v => v - mean), 'high', 0.7, rate), 'low', 3.5, rate)
}

/** Filtered pulse wave only, for drawing. Cheap enough for every frame. */
export function pulseWave(samples, channel = 'r') {
  if (samples.length < 30) return []
  const times = samples.map(s => s.t)
  const rate = (samples.length - 1) / (times[times.length - 1] - times[0])
  return pulseBand(samples.map(s => -s[channel]), rate).map((v, i) => ({ t: times[i], v }))
}

/**
 * samples: [{ t, r, g, b }], ~30 per second.
 * Returns the wave, beat times and intervals, or null if too short.
 * channel 'auto' tries red and green and uses the cleaner one (depends on the phone).
 */
export function analyzePulse(samples, { channel = 'auto' } = {}) {
  if (channel === 'auto') {
    const [red, green] = ['r', 'g'].map(c => analyzePulse(samples, { channel: c }))
    if (!red || !green) return red ?? green
    const score = result => result.quality * result.clean.length
    return score(green) > score(red) ? green : red
  }
  if (samples.length < 90) return null
  const times = samples.map(s => s.t)
  const rate = (samples.length - 1) / (times[times.length - 1] - times[0])
  // invert (more blood = darker = peak up), then keep only heartbeat-speed changes
  const wave = pulseBand(samples.map(s => -s[channel]), rate)

  // candidate beats: highest point within 0.25s on each side, above the drift line
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
    // interpolate the peak between frames (30fps is coarse)
    const [a, b, c] = [wave[i - 1], wave[i], wave[i + 1]]
    const bend = a - 2 * b + c
    const shift = bend === 0 ? 0 : Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / bend))
    const time = times[i] + shift * ((times[i + 1] - times[i - 1]) / 2)
    if (!beats.length || time - beats[beats.length - 1] >= MIN_BEAT_GAP_S) beats.push(time)
  }

  const ibis = []  // intervals in ms, with the time of the second beat
  for (let k = 1; k < beats.length; k++) ibis.push({ t: beats[k], ms: (beats[k] - beats[k - 1]) * 1000 })
  const usual = median(ibis.map(x => x.ms).filter(ms => ms >= MIN_IBI_MS && ms <= MAX_IBI_MS))
  const clean = ibis.filter(x => usual && x.ms >= MIN_IBI_MS && x.ms <= MAX_IBI_MS
    && Math.abs(x.ms - usual) / usual <= MAX_JUMP)

  return {
    channel,
    rate,
    wave: wave.map((v, i) => ({ t: times[i], v })),
    beats,
    ibis,
    clean,
    bpm: clean.length ? Math.round(60000 / median(clean.map(x => x.ms))) : null,
    quality: ibis.length ? clean.length / ibis.length : 0,  // share of beats that look ok
  }
}

/**
 * How well the heart rhythm follows the breathing guide, 0 to 1.
 * Slow breathing speeds the heart up on the in-breath and slows it on the out-breath.
 * This is how much of the interval change happens at the breathing pace (one breath every
 * `breathSeconds`) vs all slow changes (0.04-0.4 Hz), the HRV "coherence" measure.
 * Returns null without enough clean beats.
 */
export function rhythmLevel(clean, breathSeconds = 10) {
  if (clean.length < 25) return null
  const start = clean[0].t
  const end = clean[clean.length - 1].t
  if (end - start < 30) return null
  // beats are uneven: resample at 4Hz with linear interpolation
  const step = 0.25
  const series = []
  let k = 0
  for (let t = start; t <= end; t += step) {
    while (k < clean.length - 2 && clean[k + 1].t < t) k++
    const [a, b] = [clean[k], clean[k + 1]]
    series.push(a.ms + ((b.ms - a.ms) * (t - a.t)) / (b.t - a.t || 1))
  }
  // remove mean and linear drift
  const n = series.length
  const meanT = (n - 1) / 2
  const meanV = series.reduce((s, v) => s + v, 0) / n
  let slopeTop = 0
  let slopeBottom = 0
  series.forEach((v, i) => { slopeTop += (i - meanT) * (v - meanV); slopeBottom += (i - meanT) ** 2 })
  const slope = slopeTop / slopeBottom
  const flat = series.map((v, i) => v - meanV - slope * (i - meanT))

  const guide = 1 / breathSeconds
  let inStep = 0
  let total = 0
  for (let f = 0.04; f <= 0.4; f += 0.005) {
    let re = 0
    let im = 0
    flat.forEach((v, i) => {
      const angle = 2 * Math.PI * f * i * step
      re += v * Math.cos(angle)
      im -= v * Math.sin(angle)
    })
    const power = re * re + im * im
    total += power
    if (Math.abs(f - guide) <= 0.02) inStep += power
  }
  return total ? inStep / total : null
}

export const RESULT = { steady: 'steady', gentle: 'gentle', retry: 'retry' }

/**
 * Picks the words shown to the user. Never a number, never "low" or "failed".
 * baseline: usual level from earlier checks, null at first.
 * Thresholds are first guesses, tune with real checks.
 */
export function calmResult(result, breathSeconds, baseline) {
  if (!result || result.quality < 0.6 || result.clean.length < 25) return { key: RESULT.retry }
  const level = rhythmLevel(result.clean, breathSeconds)
  if (level == null) return { key: RESULT.retry }
  const steady = baseline == null ? level >= 0.35 : level >= Math.min(0.5, baseline * 0.9)
  return { key: steady ? RESULT.steady : RESULT.gentle, level, heartRate: result.bpm }
}
