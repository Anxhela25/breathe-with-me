import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createEpisode, getToken, updateEpisode } from '../lib/api.js'

const SessionContext = createContext(null)

const empty = {
  startLevel: null, lastLevel: null, usedChat: false, usedGrounding: false, crisisShown: false, startedAt: null,
}

// session field -> episode field on the server
const SAVED_FLAGS = { usedChat: 'used_chat', usedGrounding: 'used_grounding', crisisShown: 'crisis_shown' }

export function SessionProvider({ children }) {
  const [session, setSession] = useState(empty)
  const current = useRef(empty)  // the latest session, readable inside callbacks
  // For logged-in users the episode is created at the first step and updated as it goes, so a
  // session that ends early (urgent help, app closed) is still recorded. Saving runs in the background,
  // in order, and never blocks or interrupts help.
  const episode = useRef(null)  // Promise of the episode id, or null when not saving
  const queue = useRef(Promise.resolve())

  const update = useCallback(fields => {
    current.current = { ...current.current, ...fields }
    setSession(current.current)
  }, [])

  const sync = useCallback(fields => {
    // created at the first real step (a 1-10 answer, chat, grounding), so an accidental tap saves nothing
    if (!episode.current && current.current.startedAt && getToken()) {
      episode.current = createEpisode({ started_at: new Date(current.current.startedAt).toISOString() })
        .then(e => e.id).catch(() => null)
    }
    if (!episode.current) return
    const id = episode.current
    queue.current = queue.current
      .then(() => id)
      .then(episodeId => episodeId && updateEpisode(episodeId, fields))
      .catch(() => {})  // offline: save() at the end sends everything again
  }, [])

  const start = useCallback(() => {
    const startedAt = Date.now()
    current.current = { ...empty, startedAt }
    setSession(current.current)
    queue.current = Promise.resolve()
    episode.current = null
  }, [])

  const recordLevel = useCallback(level => {
    const first = current.current.startLevel == null
    update({ startLevel: first ? level : current.current.startLevel, lastLevel: level })
    sync(first ? { start_level: level, end_level: level } : { end_level: level })
  }, [update, sync])

  const mark = useCallback(fields => {
    update(fields)
    const saved = Object.fromEntries(
      Object.entries(fields).filter(([key]) => key in SAVED_FLAGS).map(([key, value]) => [SAVED_FLAGS[key], value]),
    )
    if (Object.keys(saved).length) sync(saved)
  }, [update, sync])

  // End of the session: makes sure the episode exists (the user may have just logged in) and is complete.
  const save = useCallback(async () => {
    const s = current.current
    if (!s.startedAt) return null
    const create = () => createEpisode({ started_at: new Date(s.startedAt).toISOString() }).then(e => e.id)
    let id = episode.current ? await episode.current : null
    if (!id) {
      episode.current = create()
      id = await episode.current
    }
    await queue.current
    await updateEpisode(id, {
      start_level: s.startLevel,
      end_level: s.lastLevel,
      used_chat: s.usedChat,
      used_grounding: s.usedGrounding,
      crisis_shown: s.crisisShown,
      finished: true,
    })
    return id
  }, [])

  // the saved episode of this session, if any (for linking a calm check to it)
  const episodeId = useCallback(async () => (episode.current ? episode.current : null), [])

  const value = useMemo(
    () => ({ session, start, recordLevel, mark, save, episodeId }),
    [session, start, recordLevel, mark, save, episodeId],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  return useContext(SessionContext)
}
