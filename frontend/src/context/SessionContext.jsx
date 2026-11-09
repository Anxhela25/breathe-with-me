import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createEpisode, updateEpisode } from '../lib/api.js'

const SessionContext = createContext(null)

const empty = {
  startLevel: null, lastLevel: null, usedChat: false, usedGrounding: false, crisisShown: false,
  startedAt: null, episodeId: null,
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(empty)
  const saving = useRef(null)

  const start = useCallback(() => setSession({ ...empty, startedAt: Date.now() }), [])
  const recordLevel = useCallback(level => setSession(s => ({
    ...s, startLevel: s.startLevel ?? level, lastLevel: level,
  })), [])
  const mark = useCallback(fields => setSession(s => ({ ...s, ...fields })), [])

  // Sessions are saved once, at the end, and only for logged-in users. Help never waits for this.
  const save = useCallback(async () => {
    if (!session.startedAt) return null
    if (session.episodeId) return session.episodeId
    if (saving.current) return saving.current
    saving.current = (async () => {
      const episode = await createEpisode({
        start_level: session.startLevel,
        started_at: new Date(session.startedAt).toISOString(),
      })
      await updateEpisode(episode.id, {
        end_level: session.lastLevel,
        used_chat: session.usedChat,
        used_grounding: session.usedGrounding,
        crisis_shown: session.crisisShown,
        finished: true,
      })
      setSession(s => ({ ...s, episodeId: episode.id }))
      return episode.id
    })().finally(() => { saving.current = null })
    return saving.current
  }, [session])

  const value = useMemo(
    () => ({ session, start, recordLevel, mark, save }),
    [session, start, recordLevel, mark, save],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  return useContext(SessionContext)
}
