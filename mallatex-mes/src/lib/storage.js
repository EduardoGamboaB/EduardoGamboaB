// Persistencia en localStorage con versionado.
// Estrategia: una clave por slice del contexto, prefijo común para
// poder limpiar todo de un golpe (Reset demo). Si subimos a v0.7
// los datos viejos se ignoran automáticamente (las claves no coinciden).

export const STORAGE_PREFIX = 'mallatex-mes-v0.6:'
export const SCHEMA_VERSION = 1
const META_KEY = STORAGE_PREFIX + '__meta'

/** Comprueba que localStorage esté disponible (modo incógnito, cuota llena). */
export function isStorageAvailable() {
  if (typeof window === 'undefined') return false
  try {
    const k = STORAGE_PREFIX + '__probe'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

/** Lee un slice y lo parsea; si falla, devuelve `fallback` sin romper la app. */
export function loadFromStorage(key, fallback) {
  if (!isStorageAvailable()) return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch (e) {
    console.warn(`[storage] no se pudo cargar "${key}":`, e)
    return fallback
  }
}

/** Guarda un slice y actualiza __meta. Loguea sin romper si falla. */
export function saveToStorage(key, value) {
  if (!isStorageAvailable()) return false
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    window.localStorage.setItem(
      META_KEY,
      JSON.stringify({
        version: '0.6',
        schemaVersion: SCHEMA_VERSION,
        lastUpdate: new Date().toISOString(),
      }),
    )
    return true
  } catch (e) {
    console.warn(`[storage] no se pudo guardar "${key}":`, e)
    return false
  }
}

/** Limpia TODAS las claves del MES (botón "Reset demo"). */
export function clearAllStorage() {
  if (!isStorageAvailable()) return
  try {
    const toRemove = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k)
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k))
  } catch (e) {
    console.warn('[storage] no se pudo limpiar:', e)
  }
}

/** Lee __meta para banner "Última sesión hace X". Null si nunca se ha guardado. */
export function getStorageMeta() {
  if (!isStorageAvailable()) return null
  try {
    const raw = window.localStorage.getItem(META_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** "hace X min/horas/fecha" para banner de bienvenida. */
export function relativeTime(isoString) {
  if (!isoString) return ''
  const then = new Date(isoString).getTime()
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'hace unos segundos'
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  // > 24h → fecha legible local
  return new Date(isoString).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
