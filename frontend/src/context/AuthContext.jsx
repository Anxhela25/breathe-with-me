import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  // on start: load the tokens from the Keychain, then fetch the user (refreshes if needed).
  // offline keeps the tokens, only the server can log out (api.js)
  useEffect(() => {
    api.whenLoggedOut(() => setUser(null))
    api.loadKeys()
      .then(() => (api.hasLogin() ? api.getMe().then(setUser) : null))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const signIn = useCallback(async (action, ...args) => {
    await api.saveLogin(await action(...args))
    const me = await api.getMe()
    setUser(me)
    return me
  }, [])

  const register = useCallback(
    (email, password, code, consent) => signIn(api.register, email, password, code, consent), [signIn],
  )
  const login = useCallback((email, password) => signIn(api.login, email, password), [signIn])
  const resetPassword = useCallback(
    (email, code, password) => signIn(api.resetPassword, email, code, password), [signIn],
  )
  // after the server changed something on the account, e.g. the chat pause
  const refreshUser = useCallback(() => {
    if (api.hasLogin()) api.getMe().then(setUser).catch(() => {})
  }, [])
  const logout = useCallback(() => { api.logout(); setUser(null) }, [])
  const updateSettings = useCallback(async fields => setUser(await api.updateMe(fields)), [])
  const deleteAccount = useCallback(async () => { await api.deleteMe(); logout() }, [logout])

  const value = useMemo(
    () => ({ user, ready, register, login, resetPassword, logout, updateSettings, deleteAccount, refreshUser }),
    [user, ready, register, login, resetPassword, logout, updateSettings, deleteAccount, refreshUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
