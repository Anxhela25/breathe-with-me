// In dev, vite proxies /api to the backend. The phone build needs VITE_API_URL.
import * as keys from './tokens.js'

const BASE = import.meta.env.VITE_API_URL ?? ''

// sync, for the places that only ask "is someone logged in?"
export const getToken = () => keys.accessKey()
export const hasLogin = keys.hasKeys
export { loadKeys } from './tokens.js'

// called when the login runs out for good (90 days unused, logged out elsewhere, password changed)
let loggedOut = () => {}
export function whenLoggedOut(callback) { loggedOut = callback }

// one refresh at a time: requests that fail together all wait for the same new keys
let refreshing = null
function refreshKeys() {
  const refresh = keys.refreshKey()
  if (!refresh) return Promise.resolve(false)
  refreshing ??= (async () => {
    try {
      const response = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }),
      })
      if (response.ok) {
        await keys.saveKeys(await response.json())
        return true
      }
      if (response.status === 401) {
        console.info('[login] the login ran out: logged out')
        await keys.clearKeys()
        loggedOut()
      }
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/** Logged in: keeps the pair from the server (login, sign-up, password reset). */
export const saveLogin = keys.saveKeys

/** Log out on this phone: the server cancels its refresh key too. */
export async function logout() {
  const refresh = keys.refreshKey()
  await keys.clearKeys()
  if (refresh) request('POST', '/api/auth/logout', { refresh_token: refresh }).catch(() => {})
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// FastAPI's 422 list also has the sent values (maybe a password), so only field and reason
const fieldErrors = list => (Array.isArray(list) ? list.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('; ') : '')

// every failed call is logged here, so the pages don't have to. Shows in the Xcode console
// and Safari's Web Inspector. Never the body: it can hold a password or a chat message
async function request(method, path, body, retry = true) {
  // renew first when the key is about to run out: the chat works without a login, so it would never say 401
  if (retry && !path.startsWith('/api/auth/') && keys.refreshKey() && keys.accessRunningOut()) {
    await refreshKeys().catch(() => {})  // offline: send it anyway
  }
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    // no answer at all: backend down, wrong VITE_API_URL, or no internet
    console.warn(`[api] ${method} ${path} failed: ${err?.message ?? err} (backend: ${BASE || 'vite proxy'})`)
    throw err
  }
  // the 1-hour key ran out: get new keys quietly and send the same request again, once
  if (response.status === 401 && retry && !path.startsWith('/api/auth/')) {
    if (await refreshKeys()) return request(method, path, body, false)
    if (!keys.refreshKey() && keys.accessKey()) {
      // an old single key from an earlier version ran out
      await keys.clearKeys()
      loggedOut()
    }
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : null
    console.warn(`[api] ${method} ${path} -> ${response.status}: ${detail ?? fieldErrors(data?.detail)}`)
    throw new ApiError(response.status, detail ?? `Request failed: ${response.status}`)
  }
  return data
}

export const sendChat = ({ message, history, level, safeConfirmed = false }) =>
  request('POST', '/api/chat', { message, history, level, safe_confirmed: safeConfirmed })
// "Yes, I need help now": the same 24-hour chat pause as a crisis message (needs an account)
export const pauseChat = () => request('POST', '/api/chat/pause')

// sign-up has two steps: email a code, then create the account with it
export const startRegister = (email, password) => request('POST', '/api/auth/register/start', { email, password })
export const register = (email, password, code, consent) =>
  request('POST', '/api/auth/register', { email, password, code, ...consent })
export const login = (email, password) => request('POST', '/api/auth/login', { email, password })
export const getMe = () => request('GET', '/api/me')
export const updateMe = fields => request('PATCH', '/api/me', fields)

export const createEpisode = fields => request('POST', '/api/episodes', fields)
export const updateEpisode = (id, fields) => request('PATCH', `/api/episodes/${id}`, fields)
export const deleteMe = () => request('DELETE', '/api/me')
export const deleteHistory = () => request('DELETE', '/api/me/history')
export const listEpisodes = () => request('GET', '/api/episodes')

export const listContacts = () => request('GET', '/api/contacts')
export const addContact = contact => request('POST', '/api/contacts', contact)
export const deleteContact = id => request('DELETE', `/api/contacts/${id}`)

export function getInsights() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return request('GET', `/api/insights?tz=${encodeURIComponent(tz)}`)
}

export const forgotPassword = email => request('POST', '/api/auth/forgot-password', { email })
export const resetPassword = (email, code, password) =>
  request('POST', '/api/auth/reset-password', { email, code, password })

export const getCalmBaseline = () => request('GET', '/api/calm-checks/baseline')
export const saveCalmCheck = fields => request('POST', '/api/calm-checks', fields)
export const listCalmChecks = () => request('GET', '/api/calm-checks')
