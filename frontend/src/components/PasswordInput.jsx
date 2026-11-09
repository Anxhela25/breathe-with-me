import { useState } from 'react'

export default function PasswordInput({ id, value, onChange, placeholder = 'Password', autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex w-full items-center rounded-2xl border border-sage/20 bg-white focus-within:border-sage">
      <label htmlFor={id} className="sr-only">{placeholder}</label>
      <input id={id} type={visible ? 'text' : 'password'} placeholder={placeholder} autoComplete={autoComplete}
        autoCapitalize="none" autoCorrect="off" spellCheck={false}
        value={value} onChange={onChange} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base outline-none" />
      <button type="button" onClick={() => setVisible(v => !v)} aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="flex h-12 w-12 shrink-0 items-center justify-center text-sage">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  )
}
