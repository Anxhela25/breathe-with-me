import { useEffect, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { listEpisodes } from '../lib/api.js'
import { periodOf, shortDate, strengthOf } from '../lib/format.js'

export default function History() {
  const [episodes, setEpisodes] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => { listEpisodes().then(setEpisodes).catch(() => setFailed(true)) }, [])

  return (
    <Screen footer={<Button to="/settings" variant="link" className="text-sage/70">Settings</Button>}>
      <h1 className="mt-6 text-2xl font-bold">My history</h1>
      {failed && <p className="mt-6 text-center">Your history couldn't be loaded. Please check your connection.</p>}
      {episodes?.length === 0 && (
        <p className="mt-6 text-center text-sage/80">
          Nothing here yet. After a help session, your answers are saved here privately.
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
      <Button to="/" variant="link" className="mt-6">Back home</Button>
    </Screen>
  )
}
