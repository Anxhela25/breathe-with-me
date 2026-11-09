import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { addContact, deleteContact, listContacts } from '../lib/api.js'

// Stored now; the numbers per country are added once each one is verified from an official source.
const COUNTRIES = [
  ['', 'Not set'], ['AL', 'Albania'], ['XK', 'Kosovo'], ['MK', 'North Macedonia'], ['ME', 'Montenegro'],
  ['GR', 'Greece'], ['IT', 'Italy'], ['DE', 'Germany'], ['GB', 'United Kingdom'], ['US', 'United States'],
]
const input = 'w-full rounded-2xl border border-sage/20 bg-white px-4 py-3 text-base outline-none focus:border-sage'

function Section({ title, children }) {
  return (
    <section className="w-full border-b border-sage/10 py-5">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
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
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { listContacts().then(setContacts).catch(() => setError("Couldn't load your contacts.")) }, [])

  async function add(event) {
    event.preventDefault()
    setError('')
    try {
      const contact = await addContact({ name, phone })
      setContacts(c => [...c, contact])
      setName('')
      setPhone('')
    } catch (err) {
      setError(err.status === 422 ? 'Please enter a name and a phone number (digits, spaces, +).' : err.message)
    }
  }

  async function remove(id) {
    await deleteContact(id)
    setContacts(c => c.filter(contact => contact.id !== id))
  }

  async function removeEverything() {
    await deleteAccount()
    navigate('/', { replace: true })
  }

  return (
    <Screen>
      <div className="mt-6 flex w-full items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button to="/history" variant="link">My history</Button>
      </div>

      <Section title="Emergency contacts">
        <p className="mb-3 text-sm text-sage/70">People you trust. They appear on the urgent help screen.</p>
        <ul className="mb-3 flex flex-col gap-2">
          {contacts.map(c => (
            <li key={c.id} className="flex items-center justify-between rounded-2xl border border-sage/15 bg-white px-4 py-3">
              <span><strong>{c.name}</strong> <span className="text-sage/80">{c.phone}</span></span>
              <button type="button" onClick={() => remove(c.id)} className="px-2 text-sm text-sage underline">Remove</button>
            </li>
          ))}
        </ul>
        {contacts.length < 5 && (
          <form onSubmit={add} className="flex flex-col gap-2">
            <label htmlFor="contact-name" className="sr-only">Name</label>
            <input id="contact-name" value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={100} className={input} />
            <label htmlFor="contact-phone" className="sr-only">Phone number</label>
            <input id="contact-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number"
              type="tel" inputMode="tel" maxLength={40} className={input} />
            <Button type="submit" variant="outline" disabled={!name.trim() || !phone.trim()} className="disabled:opacity-50">
              Add contact
            </Button>
          </form>
        )}
        {error && <p role="alert" className="mt-2 text-sm font-bold">{error}</p>}
      </Section>

      <Section title="Chat texts">
        <label className="flex items-center justify-between gap-4">
          <span>Save my chat texts <span className="block text-sm text-sage/70">When off, only the topic of each message is kept.</span></span>
          <input id="save-chat" type="checkbox" checked={user.save_chat_texts}
            onChange={e => updateSettings({ save_chat_texts: e.target.checked })} className="h-6 w-6 shrink-0 accent-sage" />
        </label>
      </Section>

      <Section title="Country">
        <label htmlFor="country" className="mb-2 block text-sm text-sage/70">Used to show the right emergency numbers.</label>
        <select id="country" value={user.country_code ?? ''} className={input}
          onChange={e => updateSettings({ country_code: e.target.value || null })}>
          {COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </Section>

      <Section title="Privacy">
        <ul className="list-disc space-y-1 pl-5 text-sm text-sage/80">
          <li>Your entries are private health information. Only you can see them.</li>
          <li>The AI chat never receives your email or name.</li>
          <li>You can delete everything at any time.</li>
        </ul>
        <p className="mt-3 text-sm text-sage/70">Signed in as {user.email}</p>
        <Button variant="link" onClick={() => { logout(); navigate('/', { replace: true }) }} className="mt-1 px-0">Log out</Button>
      </Section>

      <section className="w-full py-5">
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className="font-bold text-sage-dark underline">Delete all my data</button>
        ) : (
          <div className="rounded-2xl border border-sage-dark/40 bg-white p-4">
            <p>This deletes your account, history, contacts and settings. It can't be undone.</p>
            <div className="mt-3 flex gap-3">
              <button type="button" onClick={removeEverything} className="rounded-2xl bg-sage-dark px-4 py-2 font-bold text-white">
                Delete everything
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sage underline">Cancel</button>
            </div>
          </div>
        )}
      </section>
    </Screen>
  )
}
