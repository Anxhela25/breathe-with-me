// TODO: decide which countries to support and verify each number from an official source.
// 112 works from mobile phones in all EU countries.
export const EMERGENCY = {
  default: { emergency: '112', crisisLine: null },
}

export function getEmergency(countryCode) {
  return EMERGENCY[countryCode] ?? EMERGENCY.default
}
