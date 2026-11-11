// Emergency number by country (the country is chosen in Settings). Checked on 11 November 2026.
// 112 works from mobile phones in every EU country and across the Balkans (Albania, Kosovo,
// North Macedonia, Montenegro, Greece, Italy, Germany...). Only the UK (999, where 112 also works)
// and the US (911, where 112 is not guaranteed) need their own number.

const EMERGENCY = { GB: '999', US: '911' }

export function getEmergency(countryCode) {
  return EMERGENCY[countryCode] ?? '112'
}

/** "112" -> "tel:112" */
export const telLink = number => `tel:${number.replace(/[^\d+]/g, '')}`
