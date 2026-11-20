// Login tokens (backend services/tokens.py): 1h access token + 90 day refresh token.
// On iPhone they're in the Keychain (KeychainPlugin.swift), in the browser in localStorage.
import { Capacitor, registerPlugin } from '@capacitor/core'

const Keychain = registerPlugin('Keychain')
const KEY = 'bwm_login'
const OLD_KEY = 'bwm_token'  // single 7-day token from older versions

let keys = { access: null, refresh: null }
const onPhone = () => Capacitor.getPlatform() === 'ios'

async function readStored() {
  if (onPhone()) {
    const { value } = await Keychain.get({ key: KEY })
    return value ? JSON.parse(value) : null
  }
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

async function writeStored(value) {
  if (onPhone()) {
    if (value) await Keychain.set({ key: KEY, value: JSON.stringify(value) })
    else await Keychain.remove({ key: KEY })
    return
  }
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value))
    else localStorage.removeItem(KEY)
  } catch { /* storage unavailable: logged in until the app closes */ }
}

/** Called once on start: load the tokens into memory. */
export async function loadKeys() {
  let stored = null
  try {
    stored = await readStored()
  } catch (err) {
    console.warn('[login] reading the saved keys failed:', err?.message ?? err)
  }
  // older versions kept one token in localStorage, move it over
  try {
    const old = localStorage.getItem(OLD_KEY)
    if (old) {
      localStorage.removeItem(OLD_KEY)
      if (!stored) {
        stored = { access: old, refresh: null }
        await writeStored(stored)
      }
    }
  } catch { /* storage unavailable */ }
  keys = { access: stored?.access ?? null, refresh: stored?.refresh ?? null }
}

export const accessKey = () => keys.access

/** True if the access token expires within 30s (or already has). */
export function accessRunningOut(now = Date.now()) {
  if (!keys.access) return Boolean(keys.refresh)
  try {
    const { exp } = JSON.parse(atob(keys.access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return exp * 1000 - now < 30000
  } catch {
    return true
  }
}

export const refreshKey = () => keys.refresh
export const hasKeys = () => Boolean(keys.access || keys.refresh)

/** Save the pair from login, sign-up, reset or refresh. */
export async function saveKeys({ access_token: access, refresh_token: refresh }) {
  keys = { access, refresh }
  try {
    await writeStored(keys)
  } catch (err) {
    console.warn('[login] saving the keys failed:', err?.message ?? err)
  }
}

export async function clearKeys() {
  keys = { access: null, refresh: null }
  try {
    await writeStored(null)
  } catch (err) {
    console.warn('[login] deleting the keys failed:', err?.message ?? err)
  }
}
