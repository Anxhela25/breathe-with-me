// Emergency numbers and crisis lines by country (the country is chosen in Settings).
// Checked on 11 November 2026. A crisis line is only listed when a reliable source confirms it;
// re-check every number before real users, and add a crisis line only from an official source.
//
// Sources:
// - 112 in the EU and candidate countries: European Commission, Your Europe, "Emergency number 112".
// - Albania: 112 since 2016 (older 127 ambulance, 129 police still work). No confirmed adult crisis line.
// - Kosovo: 112 (Emergency Management Agency, ame.rks-gov.net). No confirmed crisis line.
// - North Macedonia: 112 (single emergency number). No confirmed crisis line.
// - Montenegro: 112. A mental health line 116 111 appears in one directory only: not confirmed, not listed.
// - Greece: Klimaka suicide prevention line 1018, 24/7 (UNHCR Greece help page and helpline directories).
// - Italy: Telefono Amico Italia 02 2327 2327, 9:00 to midnight (telefonoamico.it press release, 2024).
// - Germany: TelefonSeelsorge 0800 111 0 111, free, 24/7.
// - United Kingdom: 999 (112 also works); Samaritans 116 123, free, 24/7.
// - United States: 911; 988 Suicide & Crisis Lifeline, call or text, 24/7.

const EU = { emergency: '112' }

export const EMERGENCY = {
  AL: EU,
  XK: EU,
  MK: EU,
  ME: EU,
  GR: { ...EU, crisis: { name: 'Klimaka suicide prevention', number: '1018', hours: '24/7' } },
  IT: { ...EU, crisis: { name: 'Telefono Amico', number: '02 2327 2327', hours: '9:00 to midnight' } },
  DE: { ...EU, crisis: { name: 'TelefonSeelsorge', number: '0800 111 0 111', hours: '24/7, free' } },
  GB: { emergency: '999', crisis: { name: 'Samaritans', number: '116 123', hours: '24/7, free' } },
  US: { emergency: '911', crisis: { name: '988 Suicide & Crisis Lifeline', number: '988', hours: '24/7, call or text' } },
  // no country chosen yet: 112 works from mobile phones across Europe
  default: EU,
}

export function getEmergency(countryCode) {
  return EMERGENCY[countryCode] ?? EMERGENCY.default
}

/** "02 2327 2327" -> "tel:0223272327" */
export const telLink = number => `tel:${number.replace(/[^\d+]/g, '')}`
