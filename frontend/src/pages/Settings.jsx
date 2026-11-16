import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { addContact, deleteContact, listContacts } from '../lib/api.js'
import PhoneInput from '../components/PhoneInput.jsx'
import { formatPhone, toInternational } from '../lib/phone.js'

// Stored now; the numbers per country are added once each one is verified from an official source.
const MAX_CONTACTS = 5  // same limit as the backend

const COUNTRIES = [
  ['', 'Not set'], ['AL', 'Albania'], ['XK', 'Kosovo'], ['MK', 'North Macedonia'], ['ME', 'Montenegro'],
  ['GR', 'Greece'], ['IT', 'Italy'], ['DE', 'Germany'], ['GB', 'United Kingdom'], ['US', 'United States'],
]
const input = 'w-full rounded-2xl border border-sage/20 bg-white px-4 py-3 text-base outline-none focus:border-sage'

function Section({ title, action, children }) {
  return (
    <section className="w-full border-b border-sage/10 py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
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

  return (
    <Screen>
      <div className="mt-4 flex w-full items-center justify-between">
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="py-2 pr-4 text-sage">‹ Back</button>
        <p role="status" aria-live="polite" className="text-sm font-bold text-sage">{status}</p>
      </div>
      <h1 className="mt-2 w-full text-2xl font-bold">Settings</h1>
      <p className="w-full text-sm text-sage/70">Changes are saved automatically.</p>

      <Section title="Emergency contacts" action={contacts.length < MAX_CONTACTS && !adding && (
        <button type="button" onClick={() => { setAdding(true); setError('') }} aria-label="Add a contact"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sage text-white shadow-md shadow-sage/20 active:scale-95">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        </button>
      )}>
        <p className="mb-3 text-sm text-sage/70">People you trust. They appear on the urgent help screen.</p>
        {contacts.length === 0 && !adding && (
          <p className="rounded-2xl border border-dashed border-sage/30 px-4 py-4 text-center text-sm text-sage/70">
            No one yet. Tap + to add someone you trust.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {contacts.map(c => (
            <li key={c.id} className="flex items-center justify-between rounded-2xl border border-sage/15 bg-white px-4 py-3">
              <span><strong>{c.name}</strong> <span className="text-sage/80">{formatPhone(c.phone)}</span></span>
              <button type="button" onClick={() => remove(c.id)} className="px-2 text-sm text-sage underline">Remove</button>
            </li>
          ))}
        </ul>
        {adding && (
          <form onSubmit={add} className="mt-3 flex flex-col gap-2 rounded-2xl border border-sage/15 bg-white/70 p-3 animate-fade-in">
            <p className="font-bold">New contact</p>
            <label htmlFor="contact-name" className="sr-only">Name</label>
            <input id="contact-name" value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={100}
              className={input} autoFocus />
            <PhoneInput id="contact-phone" country={phoneCountry} onCountryChange={setPhoneCountry}
              value={phone} onChange={setPhone} />
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
        )}
        {error && <p role="alert" className="mt-2 text-sm font-bold">{error}</p>}
      </Section>

      <Section title="Country">
        <label htmlFor="country" className="mb-2 block text-sm text-sage/70">Used to show the right emergency numbers.</label>
        <select id="country" value={user.country_code ?? ''} className={input}
          onChange={e => saved(() => updateSettings({ country_code: e.target.value || null }))}>
          {COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </Section>

      <Section title="Privacy">
        <ul className="list-disc space-y-1 pl-5 text-sm text-sage/80">
          <li>Your entries are private health information. Only you can see them.</li>
          <li>The AI chat never receives your email or name, and chat messages are never saved.</li>
          <li>You can delete everything at any time.</li>
        </ul>
        <p className="mt-3 text-sm text-sage/70">Signed in as {user.email}</p>
        <Button variant="link" onClick={() => { logout(); navigate('/', { replace: true }) }} className="mt-1 px-0">Log out</Button>
      </Section>

      <section className="w-full py-5">
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)}
            className="w-full rounded-3xl border-2 border-alert px-6 py-3 font-bold text-alert active:scale-[0.98]">
            Delete my account
          </button>
        ) : (
          <div role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-text"
            className="rounded-2xl border-2 border-alert bg-white p-4">
            <h2 id="delete-title" className="text-lg font-bold text-alert">Are you sure?</h2>
            <p id="delete-text" className="mt-1">
              This deletes your account, history, contacts and settings. It can't be undone.
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
      </section>
      <div className="flex w-full flex-col items-center gap-1 pt-2">
        <Button onClick={() => navigate('/')}>Done</Button>
        <Button to="/history" variant="link">My history</Button>
        <Button to="/calm-check" variant="link">Calm check | 1 min</Button>
      </div>
    </Screen>
  )
}
