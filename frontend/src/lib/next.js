// Only follow in-app paths from ?next=, never an outside address.
export function safeNext(params, fallback = '/') {
  const next = params.get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}
