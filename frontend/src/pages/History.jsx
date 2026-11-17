import { useEffect, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { listCalmChecks, listEpisodes } from '../lib/api.js'
import { periodOf, shortDate, strengthOf } from '../lib/format.js'

// calm words, never a score: the hidden level is not sent to the app
const CALM_RESULT = { steady: 'Steadier rhythm', gentle: 'Took the time to breathe' }
const CALM_SOURCE = { end_of_session: 'After a help session', practice: 'Practice', baseline: 'First calm check' }

export default function History() {
  const [episodes, setEpisodes] = useState(null)
  const [calmChecks, setCalmChecks] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    listEpisodes().then(setEpisodes).catch(() => setFailed(true))
    listCalmChecks().then(setCalmChecks).catch(() => setCalmChecks([]))
  }, [])

  const empty = episodes?.length === 0 && calmChecks?.length === 0

  return (
    <Screen footer={<Button to="/settings" variant="link" className="text-sage/70">Settings</Button>}>
      <h1 className="mt-6 text-2xl font-bold">My history</h1>
      {failed && <p className="mt-6 text-center">Your history couldn't be loaded. Please check your connection.</p>}
      {empty && (
        <p className="mt-6 text-center text-sage/80">
          Nothing here yet. After a help session or a calm check, it is saved here privately.
        </p>
      )}
      {episodes?.length > 0 && (
        <>
          <Button to="/insights" variant="outline" className="mt-6">See my patterns</Button>
          <ul className="mt-6 flex w-full flex-col gap-2">
            {episodes.map(e => {
              const date = new Date(e.started_at)
              const level = strengthOf(e)
              return (
                <li key={e.id} className="flex items-center justify-between rounded-2xl border border-sage/15 bg-white px-4 py-3">
                  <div>
                    <p className="font-bold">{shortDate(date)}</p>
                    <p className="text-sm text-sage/70">
                      {periodOf(date)}
                      {e.start_level && e.end_level ? ` · ${e.start_level} → ${e.end_level}` : ''}
                    </p>
                  </div>
                  {level && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pistachio font-bold text-sage"
                      aria-label={`Strength ${level} out of 10`}>
                      {level}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {calmChecks?.length > 0 && (
        <section className="mt-8 w-full">
          <h2 className="text-lg font-bold">Calm checks</h2>
          <ul className="mt-3 flex w-full flex-col gap-2">
            {calmChecks.map(c => {
              const date = new Date(c.created_at)
              return (
                <li key={c.id} className="flex items-center justify-between rounded-2xl border border-sage/15 bg-white px-4 py-3">
                  <div>
                    <p className="font-bold">{shortDate(date)} <span className="font-normal text-sage/70">· {periodOf(date)}</span></p>
                    <p className="text-sm text-sage/70">
                      {CALM_RESULT[c.message_key] ?? 'Calm check'} · {CALM_SOURCE[c.source] ?? ''}
                    </p>
                  </div>
                  {c.heart_rate && (
                    <span className="rounded-full bg-pistachio px-3 py-1 text-sm font-bold text-sage"
                      aria-label={`Average heart rate ${c.heart_rate} beats per minute`}>
                      {c.heart_rate} bpm
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <Button to="/" variant="link" className="mt-auto pt-6">Back home</Button>
    </Screen>
  )
}
