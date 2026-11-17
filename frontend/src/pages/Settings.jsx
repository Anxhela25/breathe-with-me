import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { addContact, deleteContact, listContacts } from '../lib/api.js'
import PhoneInput from '../components/PhoneInput.jsx'
import { formatPhone, toInternational } from '../lib/phone.js'
import { getEmergency } from '../data/emergency.js'

// Stored now; the numbers per country are added once each one is verified from an official source.
const MAX_CONTACTS = 5  // same limit as the backend

const COUNTRIES = [
  ['', 'Not set'], ['AL', 'Albania'], ['XK', 'Kosovo'], ['MK', 'North Macedonia'], ['ME', 'Montenegro'],
  ['GR', 'Greece'], ['IT', 'Italy'], ['DE', 'Germany'], ['GB', 'United Kingdom'], ['US', 'United States'],
]
const input = 'w-full rounded-xl border border-sage/20 bg-cream px-4 py-3 text-base outline-none focus:border-sage'

// iPhone-style grouped list: a small grey title, then a white card of rows
function Group({ title, note, children }) {
  return (
    <section className="mt-9 w-full">
      {title && <h2 className="mb-2 px-4 text-xs font-bold tracking-wider text-sage/60 uppercase">{title}</h2>}
      <div className="divide-y divide-sage/10 overflow-hidden rounded-2xl bg-white shadow-sm shadow-sage/5">{children}</div>
      {note && <p className="mt-2 px-4 text-xs text-sage/60">{note}</p>}
    </section>
  )
}

const row = 'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left'

function Tile({ color, children }) {
  return <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`} aria-hidden>{children}</span>
}

const Chevron = () => <span aria-hidden className="text-xl leading-none text-sage/40">›</span>

const icon = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round', strokeLinejoin: 'round', className: 'h-[18px] w-[18px]',
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, updateSettings, logout, deleteAccount } = useAuth()
  const [contacts, setContacts] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneCountry, setPhoneCountry] = useState(user.country_code || 'AL')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [adding, setAdding] = useState(false)  // the new-contact form opens from the + button
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [status, setStatus] = useState('')
  const statusTimer = useRef(null)

  function flashSaved() {
    clearTimeout(statusTimer.current)
    setStatus('Saved ✓')
    statusTimer.current = setTimeout(() => setStatus(''), 2500)
  }

  // every change saves right away, so show it clearly
  async function saved(action) {
    try {
      await action()
      flashSaved()
      return true
    } catch {
      setStatus("Couldn't save. Please check your connection.")
      return false
    }
  }

  useEffect(() => () => clearTimeout(statusTimer.current), [])

  useEffect(() => { listContacts().then(setContacts).catch(() => setError("Couldn't load your contacts.")) }, [])

  async function add(event) {
    event.preventDefault()
    setError('')
    const international = toInternational(phoneCountry, phone)
    if (!international) {
      setError('This phone number is not valid for the selected country.')
      return
    }
    try {
      const contact = await addContact({ name, phone: international })
      setContacts(c => [...c, contact])
      setName('')
      setPhone('')
      setAdding(false)
      flashSaved()
    } catch (err) {
      setError(err.status === 422 ? 'Please check the name and the phone number.' : err.message)
    }
  }

  async function remove(id) {
    if (await saved(() => deleteContact(id))) setContacts(c => c.filter(contact => contact.id !== id))
  }

  async function removeEverything() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount()
      navigate('/', { replace: true })
    } catch {
      setDeleteError("Couldn't delete your account. Please check your connection and try again.")
      setDeleting(false)
    }
  }

  const initial = (user.email?.[0] ?? '?').toUpperCase()

  return (
    <Screen>
      <div className="mt-2 flex w-full items-center justify-between">
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="py-2 pr-4 text-sage">‹ Back</button>
        <p role="status" aria-live="polite" className="text-sm font-bold text-sage">{status}</p>
      </div>
      <h1 className="mt-1 w-full text-3xl font-bold">Settings</h1>

      {/* account */}
      <div className="mt-5 flex w-full items-center gap-4 rounded-2xl bg-white p-4 shadow-sm shadow-sage/5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage text-2xl font-bold text-white"
          aria-hidden>{initial}</span>
        <span className="min-w-0">
          <span className="block truncate font-bold">{user.email}</span>
          <span className="block text-sm text-sage/70">Changes are saved automatically</span>
        </span>
      </div>

      <Group title="People you trust" note="They appear on the urgent help screen, ready to call.">
        {contacts.map(c => (
          <div key={c.id} className={row}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pistachio font-bold text-sage"
              aria-hidden>{c.name[0]?.toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{c.name}</span>
              <span className="block text-sm text-sage/70">{formatPhone(c.phone)}</span>
            </span>
            <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-alert/80 active:bg-alert/10">
              <svg {...icon} aria-hidden><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
            </button>
          </div>
        ))}
        {adding ? (
          <form onSubmit={add} className={`${row} flex-col items-stretch gap-2 animate-fade-in`}>
            <p className="font-bold">New contact</p>
            <label htmlFor="contact-name" className="sr-only">Name</label>
            <input id="contact-name" value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={100}
              className={input} autoFocus />
            <PhoneInput id="contact-phone" country={phoneCountry} onCountryChange={setPhoneCountry}
              value={phone} onChange={setPhone} />
            {error && <p role="alert" className="text-sm font-bold text-alert">{error}</p>}
            <div className="mt-1 flex gap-2">
              <Button type="button" variant="outline" className="flex-1"
                onClick={() => { setAdding(false); setName(''); setPhone(''); setError('') }}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || !phone.trim()} className="flex-1 py-3 text-base disabled:opacity-50">
                Save
              </Button>
            </div>
          </form>
        ) : contacts.length < MAX_CONTACTS && (
          <button type="button" onClick={() => { setAdding(true); setError('') }} className={`${row} text-sage`}>
            <Tile color="bg-sage text-white">
              <svg {...icon}><path d="M12 5v14M5 12h14" /></svg>
            </Tile>
            <span className="font-bold">{contacts.length ? 'Add someone else' : 'Add someone you trust'}</span>
          </button>
        )}
        {error && !adding && <p role="alert" className={`${row} text-sm font-bold text-alert`}>{error}</p>}
      </Group>

      <Group title="Emergency" note="Used to show the right emergency number.">
        <label htmlFor="country" className={`${row} relative`}>
          <Tile color="bg-soft-blue text-sage-dark">
            <svg {...icon}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
          </Tile>
          <span className="flex-1">Country</span>
          <span className="text-sage/70">{COUNTRIES.find(([code]) => code === (user.country_code ?? ''))?.[1]}</span>
          <Chevron />
          {/* the real select sits on top, invisible, so tapping the row opens the iPhone picker */}
          <select id="country" value={user.country_code ?? ''} className="absolute inset-0 opacity-0"
            onChange={e => saved(() => updateSettings({ country_code: e.target.value || null }))}>
            {COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <div className={row}>
          <Tile color="bg-alert/15 text-alert">
            <svg {...icon}><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
          </Tile>
          <span className="flex-1">Emergency number</span>
          <span className="font-bold text-alert">{getEmergency(user.country_code)}</span>
        </div>
      </Group>

      <Group title="Your data">
        <Link to="/history" className={row}>
          <Tile color="bg-pistachio text-sage">
            <svg {...icon}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></svg>
          </Tile>
          <span className="flex-1">My history</span>
          <Chevron />
        </Link>
        <Link to="/calm-check" className={row}>
          <Tile color="bg-lavender text-sage-dark">
            <svg {...icon}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
          </Tile>
          <span className="flex-1">Calm check</span>
          <span className="text-sm text-sage/60">1 min</span>
          <Chevron />
        </Link>
      </Group>

      <Group title="Privacy">
        {[
          'Your entries are private health information. Only you can see them.',
          'The AI chat never receives your email or name, and chat messages are never saved.',
          'You can delete everything at any time.',
        ].map(text => (
          <p key={text} className={`${row} items-start text-sm text-sage-dark/80`}>
            <svg {...icon} className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            {text}
          </p>
        ))}
      </Group>

      <Group title="Account">
        <button type="button" onClick={() => { logout(); navigate('/', { replace: true }) }} className={row}>
          <Tile color="bg-pistachio text-sage">
            <svg {...icon}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></svg>
          </Tile>
          <span className="flex-1">Log out</span>
        </button>
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${row} text-alert`}>
            <Tile color="bg-alert/15 text-alert">
              <svg {...icon}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
            </Tile>
            <span className="flex-1">Delete my account</span>
          </button>
        ) : (
          <div role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-text" className="p-4">
            <h2 id="delete-title" className="text-lg font-bold text-alert">Are you sure?</h2>
            <p id="delete-text" className="mt-1">
              This deletes your account, history, contacts and settings. It can&apos;t be undone.
            </p>
            {deleteError && <p role="alert" className="mt-2 text-sm font-bold text-alert">{deleteError}</p>}
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={removeEverything} disabled={deleting}
                className="rounded-2xl bg-alert px-4 py-3 font-bold text-white disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button type="button" onClick={() => { setConfirmDelete(false); setDeleteError('') }} autoFocus
                className="rounded-2xl border border-sage px-4 py-3 text-sage">
                No, keep my account
              </button>
            </div>
          </div>
        )}
      </Group>

      {/* no Done button: changes save as you go, and Back is at the top */}
      <p className="mt-10 mb-2 text-center text-xs text-sage/50">Breathe With Me · Support tool, not treatment</p>
    </Screen>
  )
}
