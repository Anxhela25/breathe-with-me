import { useEffect } from 'react'

/**
 * Centered confirm dialog for things that can't be undone. Tapping outside cancels.
 */
export default function ConfirmDialog({ title, children, confirm, busyText, busy = false, error = '', onConfirm, onCancel }) {
  useEffect(() => {
    const close = event => { if (event.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sage-dark/40 px-8 animate-fade-in"
      onClick={() => { if (!busy) onCancel() }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text"
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-alert/10 text-alert" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
        </div>
        <h2 id="confirm-title" className="mt-4 text-xl font-bold">{title}</h2>
        <div id="confirm-text" className="mt-2 text-sage-dark/80">{children}</div>
        {error && <p role="alert" className="mt-3 text-sm font-bold text-alert">{error}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={onConfirm} disabled={busy}
            className="rounded-2xl bg-alert px-4 py-3 font-bold text-white active:scale-[0.98] disabled:opacity-60">
            {busy ? busyText : confirm}
          </button>
          <button type="button" onClick={onCancel} disabled={busy} autoFocus
            className="rounded-2xl px-4 py-3 text-sage active:bg-pistachio">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
