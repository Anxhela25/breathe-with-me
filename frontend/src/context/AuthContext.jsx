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
  const resetPassword = useCallback(
    (email, code, password) => signIn(api.resetPassword, email, code, password), [signIn],
  )
  const logout = useCallback(() => { api.setToken(null); setUser(null) }, [])
  const updateSettings = useCallback(async fields => setUser(await api.updateMe(fields)), [])
  const deleteAccount = useCallback(async () => { await api.deleteMe(); logout() }, [logout])

  const value = useMemo(
    () => ({ user, ready, register, login, resetPassword, logout, updateSettings, deleteAccount }),
    [user, ready, register, login, resetPassword, logout, updateSettings, deleteAccount],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
