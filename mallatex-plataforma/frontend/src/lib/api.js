// ---------------------------------------------------------------------------
// Cliente HTTP unificado hacia el gateway de la plataforma Mallatex.
//
// - URL base desde NEXT_PUBLIC_API_BASE (default http://localhost:3000).
// - Token Bearer leído de localStorage ('mtx_token').
// - Serializa/deserializa JSON.
// - En 401 limpia sesión y redirige a /login.
// ---------------------------------------------------------------------------

export const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE) ||
  'http://localhost:3000'

export const TOKEN_KEY = 'mtx_token'
export const USER_KEY = 'mtx_user'

export function getToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setSession(token, user) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * Petición genérica al gateway.
 * @param {string} path  Ruta que comienza con /api/...
 * @param {object} opts  { method, body, headers, raw }
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, headers = {}, raw = false } = opts
  const token = getToken()

  const finalHeaders = { Accept: 'application/json', ...headers }
  let payload = body
  if (body != null && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  if (token) finalHeaders.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers: finalHeaders, body: payload })
  } catch (e) {
    throw new ApiError('No se pudo conectar con el servidor', 0, null)
  }

  // Un 401 con token vigente = sesión caducada/revocada: se limpia y se
  // redirige al login. Un 401 SIN token es un intento de acceso fallido (p.ej.
  // login con credenciales incorrectas): no es una sesión que expiró, así que
  // se deja pasar para mostrar el mensaje real del servidor ("Credenciales
  // inválidas", etc.).
  if (res.status === 401 && token) {
    clearSession()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new ApiError('Sesión expirada', 401, null)
  }

  if (raw) return res

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Error ${res.status}`
    throw new ApiError(msg, res.status, data)
  }
  return data
}

// Atajos por verbo -----------------------------------------------------------
export const get = (path, headers) => api(path, { method: 'GET', headers })
export const post = (path, body, headers) => api(path, { method: 'POST', body, headers })
export const put = (path, body, headers) => api(path, { method: 'PUT', body, headers })
export const del = (path, headers) => api(path, { method: 'DELETE', headers })

// Login administrativo (email + password).
export async function login(email, password) {
  return api('/api/auth/login', { method: 'POST', body: { email, password } })
}

// Perfil + módulos efectivos de la sesión actual.
export async function me() {
  return api('/api/auth/me')
}

// Cierre de sesión: revoca el token en el servidor (denylist del jti).
// Best-effort: no bloquea el logout local si la red falla.
export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' })
  } catch {
    /* el logout local procede igual */
  }
}
