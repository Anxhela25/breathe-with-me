// Error reports to Sentry. Off when VITE_SENTRY_DSN is empty (local dev).
// No personal data: no IP or user, emails masked, query strings removed.
import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g

function scrub(value) {
  if (typeof value === 'string') return value.replace(EMAIL, '[email]')
  if (Array.isArray(value)) return value.map(scrub)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v)]))
  }
  return value
}

const noQuery = url => (typeof url === 'string' ? url.split('?')[0] : url)

export function initMonitoring() {
  if (!DSN) return
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.user
      if (event.request) event.request = { url: noQuery(event.request.url) }
      return scrub(event)
    },
    beforeBreadcrumb(crumb) {
      if (crumb.data?.url) crumb.data.url = noQuery(crumb.data.url)
      return scrub(crumb)
    },
  })
}

// like logger.log at work: report something important that isn't a crash
export function report(message, extra) {
  if (DSN) Sentry.captureMessage(message, { level: 'error', extra })
}

// for createRoot, so React render errors are reported too
export const reactErrorHandlers = DSN
  ? { onUncaughtError: Sentry.reactErrorHandler(), onCaughtError: Sentry.reactErrorHandler() }
  : {}
