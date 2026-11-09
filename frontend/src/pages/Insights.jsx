import { useEffect, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { getInsights } from '../lib/api.js'

export default function Insights() {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => { getInsights().then(setData).catch(() => setFailed(true)) }, [])

  if (failed) {
    return (
      <Screen>
        <p className="mt-12 text-center">Your patterns couldn't be loaded. Please check your connection.</p>
        <Button to="/history" variant="link" className="mt-4">Back to history</Button>
      </Screen>
    )
  }
  if (!data) return <Screen />

  return (
    <Screen footer={<p className="text-xs text-sage/60">These are patterns, not a diagnosis.</p>}>
      <h1 className="mt-6 text-2xl font-bold">Your patterns</h1>

      {!data.ready && (
        <div className="mt-10 w-full text-center">
          <p className="text-lg">I need a few more entries to see patterns.</p>
          <div className="mx-auto mt-6 h-2 w-2/3 overflow-hidden rounded-full bg-pistachio" role="progressbar"
            aria-valuemin={0} aria-valuemax={data.needed} aria-valuenow={data.count}>
            <div className="h-full rounded-full bg-sage" style={{ width: `${(data.count / data.needed) * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-sage/70">{data.count} of {data.needed} entries</p>
        </div>
      )}

      {data.ready && (
        <div className="mt-6 flex w-full flex-col gap-3">
          {data.patterns.length === 0 && (
            <p className="text-center text-sage/80">No clear pattern yet. That's normal; patterns can take time to show.</p>
          )}
          {data.patterns.map(p => (
            <p key={p.key} className="rounded-2xl border border-sage/15 bg-white px-4 py-3">{p.text}</p>
          ))}
        </div>
      )}

      {data.count > 0 && <Button to="/summary" className="mt-8">Export summary for my doctor</Button>}
      <Button to="/history" variant="link" className="mt-2">Back to history</Button>
    </Screen>
  )
}
