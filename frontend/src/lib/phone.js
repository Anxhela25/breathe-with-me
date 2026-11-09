import { parsePhoneNumberFromString } from 'libphonenumber-js'

/** The number in international format (+355…) when valid for the country, otherwise null. */
export function toInternational(country, national) {
  const number = parsePhoneNumberFromString(national, country)
  return number?.isValid() ? number.number : null
}

export function formatPhone(phone) {
  return parsePhoneNumberFromString(phone)?.formatInternational() ?? phone
}
