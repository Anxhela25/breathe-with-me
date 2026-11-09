// In dev, vite proxies /api to the backend. The phone build needs VITE_API_URL.
const BASE = import.meta.env.VITE_API_URL ?? ''

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

export function sendChat({ message, history, level }) {
  return post('/api/chat', { message, history, level })
}
