'use client'

// ---------------------------------------------------------------------------
// AuthProvider — estado de sesión del frontend web.
//
// Mantiene { principal, role, name, modules } resolviendo /api/auth/me con el
// token Bearer guardado. `modules` alimenta el menú (matriz de acceso). Expone
// login()/logout() y un estado de carga para proteger rutas.
// ---------------------------------------------------------------------------

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin, me as apiMe, logout as apiLogout, setSession, clearSession, getToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null) // { principal, role, name, modules, portalModules }
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setSessionState(null)
      setLoading(false)
      return null
    }
    try {
      const data = await apiMe()
      setSessionState(data)
      return data
    } catch {
      setSessionState(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    const res = await apiLogin(email, password)
    setSession(res.token, res.user)
    // El login ya trae modules; confirmamos el perfil con /me.
    const profile = await apiMe().catch(() => ({
      principal: 'admin',
      role: res.user?.role,
      name: res.user?.name,
      modules: res.modules || [],
    }))
    setSessionState(profile)
    return profile
  }, [])

  const logout = useCallback(async () => {
    // Revoca el token en el servidor antes de limpiar el estado local, para
    // que un token ya capturado no siga siendo válido tras el logout.
    await apiLogout()
    clearSession()
    setSessionState(null)
    if (typeof window !== 'undefined') window.location.href = '/login'
  }, [])

  const value = {
    session,
    loading,
    isAuthed: !!session,
    modules: session?.modules || [],
    login,
    logout,
    refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
