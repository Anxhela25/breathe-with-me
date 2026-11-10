/** Live length hint under a new-password field: red while too short, green with a tick once long enough. */
export default function PasswordHint({ password, min }) {
  const longEnough = password.length >= min
  // grey until the user starts typing
  const color = longEnough ? 'font-bold text-ok' : password ? 'text-alert' : 'text-sage/70'
  return (
    <p aria-live="polite" className={`-mt-1 px-1 text-xs ${color}`}>
      {longEnough
        ? '✓ Long enough'
        : `At least ${min} characters (${password.length} so far). A few unrelated words work well.`}
    </p>
  )
}
