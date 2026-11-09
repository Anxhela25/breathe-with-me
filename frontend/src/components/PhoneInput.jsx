import { useMemo } from 'react'
import { AsYouType, getCountries, getCountryCallingCode } from 'libphonenumber-js'

const flag = code => String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))

function countryOptions() {
  const names = new Intl.DisplayNames(undefined, { type: 'region' })
  return getCountries()
    .map(code => ({ code, name: names.of(code) ?? code, dial: getCountryCallingCode(code) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const field = 'rounded-2xl border border-sage/20 bg-white px-3 py-3 text-base outline-none focus:border-sage'

export default function PhoneInput({ country, onCountryChange, value, onChange, id = 'phone' }) {
  const options = useMemo(countryOptions, [])

  function type(event) {
    let digits = event.target.value.replace(/\D/g, '')
    // backspace over a space or bracket should delete the digit before it
    if (event.target.value.length < value.length && digits === value.replace(/\D/g, '')) digits = digits.slice(0, -1)
    onChange(new AsYouType(country).input(digits))
  }

  return (
    <div className="flex w-full gap-2">
      <div className={`${field} relative flex shrink-0 items-center gap-1`}>
        <span aria-hidden>{flag(country)} +{getCountryCallingCode(country)} ▾</span>
        <label htmlFor={`${id}-country`} className="sr-only">Country</label>
        <select id={`${id}-country`} value={country} onChange={e => onCountryChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0">
          {options.map(o => <option key={o.code} value={o.code}>{flag(o.code)} {o.name} +{o.dial}</option>)}
        </select>
      </div>
      <label htmlFor={id} className="sr-only">Phone number</label>
      <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="Phone number"
        value={value} onChange={type} className={`${field} min-w-0 flex-1`} />
    </div>
  )
}
