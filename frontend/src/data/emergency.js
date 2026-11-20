// Emergency number per country (from Settings, else the phone region). Checked 11 Nov 2026.
// 112 works on mobile in all EU countries and the Balkans.
// Only the UK (999) and the US (911) need their own number.

const EMERGENCY = { GB: '999', US: '911' }

/** The country from the phone's region setting ("en-GB" -> "GB"), or undefined if it has none. */
export function deviceCountry() {
  for (const tag of navigator.languages ?? [navigator.language]) {
    try {
      const region = new Intl.Locale(tag).region
      if (region) return region
    } catch { /* not a valid language tag */ }
  }
  return undefined
}

/** The country set in Settings comes first; otherwise the phone's region; otherwise 112. */
export function getEmergency(countryCode) {
  return EMERGENCY[countryCode ?? deviceCountry()] ?? '112'
}

export const telLink = number => `tel:${number.replace(/[^\d+]/g, '')}`
