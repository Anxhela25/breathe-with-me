// In dev, vite proxies /api to the backend. The phone build needs VITE_API_URL.
const BASE = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'bwm_token'

// TODO: move the token to the iOS Keychain before real users
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${BASE}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : null
    throw new ApiError(response.status, detail ?? `Request failed: ${response.status}`)
  }
  return data
}

export const sendChat = ({ message, history, level }) => request('POST', '/api/chat', { message, history, level })

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
