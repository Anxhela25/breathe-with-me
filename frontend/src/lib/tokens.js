// The login keys (backend/app/services/tokens.py): a 1-hour access key sent with every request, and a
// 90-day refresh key that gets a new pair when the access key runs out. The person never notices.
// On the iPhone both live in the Keychain (ios/App/App/KeychainPlugin.swift), in the browser in localStorage.
import { Capacitor, registerPlugin } from '@capacitor/core'

const Keychain = registerPlugin('Keychain')
const KEY = 'bwm_login'
const OLD_KEY = 'bwm_token'  // the single 7-day key of earlier versions

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

/** Once, when the app opens: reads the keys into memory, so every request can use them right away. */
export async function loadKeys() {
  let stored = null
  try {
    stored = await readStored()
  } catch (err) {
    console.warn('[login] reading the saved keys failed:', err?.message ?? err)
  }
  // an older version kept one key in localStorage: move it, it works until it runs out
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

/** The access key runs out within half a minute (or already has): renew it before using it. */
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

/** After login, sign-up, password reset or a refresh: the pair from the server. */
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
