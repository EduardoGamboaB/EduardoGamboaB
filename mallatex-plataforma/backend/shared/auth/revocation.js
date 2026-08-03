import { getSequelize } from '../persistence/database.js';

/**
 * Denylist de sesiones revocadas (logout server-side).
 *
 * Todos los servicios comparten la tabla identity.revoked_tokens. Cada proceso
 * mantiene un caché en memoria de jtis revocados y lo refresca de forma
 * perezosa (máx. cada REFRESH_MS) al validar peticiones: revocar una sesión se
 * propaga a todos los servicios en ese lapso, y en el emisor (identity, que
 * revoca de forma síncrona) es inmediato.
 *
 * Diseño fail-open deliberado: si la tabla aún no existe o la base no responde,
 * la validación de firma/expiración del JWT sigue siendo la barrera principal.
 */
const REFRESH_MS = Number(process.env.REVOCATION_REFRESH_MS || 30000);

let revoked = new Set();
let lastRefresh = 0;
let refreshing = null;

async function refresh() {
  const db = getSequelize();
  const [rows] = await db.query(
    "SELECT jti FROM identity.revoked_tokens WHERE expires_at > now()"
  );
  revoked = new Set(rows.map((r) => r.jti));
  lastRefresh = Date.now();
}

/** Refresco perezoso, sin bloquear la petición en curso. */
function maybeRefresh() {
  if (Date.now() - lastRefresh < REFRESH_MS || refreshing) return;
  refreshing = refresh()
    .catch(() => { lastRefresh = Date.now(); /* fail-open: reintenta en el próximo ciclo */ })
    .finally(() => { refreshing = null; });
}

/** ¿Está revocado este jti según el caché local? */
export function isRevoked(jti) {
  if (!jti) return false;
  maybeRefresh();
  return revoked.has(jti);
}

/** Revoca un jti: persiste en la denylist y actualiza el caché local YA. */
export async function revokeToken({ jti, sub, exp }) {
  if (!jti) return false;
  const db = getSequelize();
  const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 24 * 3600 * 1000);
  await db.query(
    `INSERT INTO identity.revoked_tokens (jti, subject, expires_at)
     VALUES ($1, $2, $3) ON CONFLICT (jti) DO NOTHING`,
    { bind: [jti, sub != null ? String(sub) : null, expiresAt] }
  );
  revoked.add(jti);
  return true;
}

/** Limpieza de entradas ya expiradas (llamar ocasionalmente, p.ej. al arrancar). */
export async function purgeExpired() {
  const db = getSequelize();
  await db.query('DELETE FROM identity.revoked_tokens WHERE expires_at <= now()').catch(() => {});
}

/** Fuerza un refresco inmediato (útil en pruebas). */
export async function refreshRevocationsNow() {
  await refresh();
}
