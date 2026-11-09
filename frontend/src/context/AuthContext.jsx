import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!api.getToken())

  useEffect(() => {
    if (!api.getToken()) return
    api.getMe()
      .then(setUser)
      .catch(() => api.setToken(null))  // expired or invalid token
      .finally(() => setReady(true))
  }, [])

  const signIn = useCallback(async (action, ...args) => {
    const { access_token: token } = await action(...args)
    api.setToken(token)
    const me = await api.getMe()
    setUser(me)
    return me
  }, [])

  const register = useCallback(
    (email, password, consent) => signIn(api.register, email, password, consent), [signIn],
  )
  const login = useCallback((email, password) => signIn(api.login, email, password), [signIn])
  const logout = useCallback(() => { api.setToken(null); setUser(null) }, [])
  const updateSettings = useCallback(async fields => setUser(await api.updateMe(fields)), [])

  const value = useMemo(
    () => ({ user, ready, register, login, logout, updateSettings }),
    [user, ready, register, login, logout, updateSettings],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
