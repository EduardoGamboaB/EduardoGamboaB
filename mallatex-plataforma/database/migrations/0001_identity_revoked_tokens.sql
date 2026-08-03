-- Revocación de sesiones (logout server-side).
-- El JWT lleva un `jti`; al cerrar sesión se registra aquí y todos los
-- servicios lo rechazan (caché con refresco periódico en el kernel de auth).
CREATE TABLE IF NOT EXISTS identity.revoked_tokens (
  jti        TEXT PRIMARY KEY,
  subject    TEXT,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revoked_expires ON identity.revoked_tokens(expires_at);
