import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createEpisode, hasLogin, updateEpisode } from '../lib/api.js'

const SessionContext = createContext(null)

const empty = {
  startLevel: null, lastLevel: null, usedChat: false, usedGrounding: false, crisisShown: false, asked: 0, round: 0, longNoteClosed: false, startedAt: null,
}

// session field -> episode field on the server
const SAVED_FLAGS = { usedChat: 'used_chat', usedGrounding: 'used_grounding', crisisShown: 'crisis_shown' }

export function SessionProvider({ children }) {
  const [session, setSession] = useState(empty)
  const current = useRef(empty)  // latest session, for callbacks
  // logged in: the episode is created at the first step and updated as it goes, so a session
  // that ends early still gets saved. runs in the background, in order, never blocks the UI.
  const episode = useRef(null)  // promise of the episode id, null when not saving
  const queue = useRef(Promise.resolve())

  const update = useCallback(fields => {
    current.current = { ...current.current, ...fields }
    setSession(current.current)
  }, [])

  const sync = useCallback(fields => {
    // only at the first real step, so an accidental tap saves nothing
    if (!episode.current && current.current.startedAt && hasLogin()) {
      episode.current = createEpisode({ started_at: new Date(current.current.startedAt).toISOString() })
        .then(e => e.id).catch(() => null)
    }
    if (!episode.current) return
    const id = episode.current
    queue.current = queue.current
      .then(() => id)
      .then(episodeId => episodeId && updateEpisode(episodeId, fields))
      .catch(() => {})  // offline: save() sends everything again at the end
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

  // end of session: make sure the episode exists (user may have just logged in) and is complete
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

  // episode of this session, to link a calm check
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
