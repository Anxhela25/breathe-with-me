import { createContext, useCallback, useContext, useMemo, useState } from 'react'

// TODO: save sessions to /api/episodes
const SessionContext = createContext(null)

const empty = {
  startLevel: null, lastLevel: null, usedChat: false, usedGrounding: false, crisisShown: false, startedAt: null,
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(empty)

  const start = useCallback(() => setSession({ ...empty, startedAt: Date.now() }), [])
  const recordLevel = useCallback(level => setSession(s => ({
    ...s, startLevel: s.startLevel ?? level, lastLevel: level,
  })), [])
  const mark = useCallback(fields => setSession(s => ({ ...s, ...fields })), [])

  const value = useMemo(() => ({ session, start, recordLevel, mark }), [session, start, recordLevel, mark])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  return useContext(SessionContext)
}
