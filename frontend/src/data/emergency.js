// Emergency number by country, from Settings or else the phone's region. Checked on 11 November 2026.
// 112 works from mobile phones in every EU country and across the Balkans (Albania, Kosovo,
// North Macedonia, Montenegro, Greece, Italy, Germany...). Only the UK (999, where 112 also works)
// and the US (911, where 112 is not guaranteed) need their own number.

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

/** "112" -> "tel:112" */
export const telLink = number => `tel:${number.replace(/[^\d+]/g, '')}`
