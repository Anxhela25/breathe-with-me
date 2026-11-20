// Crisis pause: the AI chat pauses for 24h after a crisis message (see routers/chat.py).
// 24h because the highest risk after a suicidal crisis is the first hours up to about a day,
// and follow-up should happen within 24 hours. During the pause the app points to people.
// Kept on the phone too, so it works without an account and after closing the app.
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const KEY = 'bwm_chat_pause'
// fallback if the server can't be reached. VITE_CHAT_PAUSE_MINUTES=3 for testing
const PAUSE_MINUTES = Number(import.meta.env.VITE_CHAT_PAUSE_MINUTES) || 24 * 60

// first chat after the pause, however much later
export const CHECK_IN = "Welcome back. The last time we talked was a really hard moment, and I'm glad you're here. " +
  'How are you feeling right now?'

function readLocal() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {} } catch { return {} }
}

function writeLocal(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)) } catch { /* storage unavailable: the server still keeps it */ }
}

/** The pause from the phone and the account together: the later end wins. */
export function chatPause(user, now = Date.now()) {
  const local = readLocal()
  const ends = [local.until, user?.chat_paused_until].filter(Boolean).map(t => new Date(t).getTime())
  const until = ends.length ? Math.max(...ends) : null
  const paused = until != null && until > now
  const checkInDue = !paused && until != null && (local.checkIn === true || user?.chat_checkin_due === true)
  return { paused, until: until ? new Date(until) : null, checkInDue }
}

/** "today at 21:46", "tomorrow at 21:46" */
export function pauseEnds(until, now = new Date()) {
  const time = until.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const day = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((day(until) - day(now)) / 86400000)
  if (days <= 0) return `today at ${time}`
  if (days === 1) return `tomorrow at ${time}`
  return `${until.toLocaleDateString(undefined, { weekday: 'long' })} at ${time}`
}

export function useChatPause() {
  const { user, refreshUser } = useAuth()
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick(t => t + 1), [])
  const state = chatPause(user)
  const endsAt = state.until?.getTime()

  // update the page if the pause ends while it's open
  useEffect(() => {
    if (!state.paused) return undefined
    const timer = setTimeout(rerender, Math.min(endsAt - Date.now() + 500, 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [state.paused, endsAt, rerender])

  // until from the server, or 24h from now if offline
  const start = useCallback(until => {
    const end = until ? new Date(until) : new Date(Date.now() + PAUSE_MINUTES * 60000)
    writeLocal({ until: end.toISOString(), checkIn: true })
    rerender()
    refreshUser?.()
  }, [rerender, refreshUser])

  // wrote after the check-in, the server clears its flag on that message
  const checkInDone = useCallback(() => {
    writeLocal({ ...readLocal(), checkIn: false })
    rerender()
    refreshUser?.()
  }, [rerender, refreshUser])

  return { ...state, start, checkInDone }
}
