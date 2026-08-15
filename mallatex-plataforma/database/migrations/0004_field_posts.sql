-- APORTES DE CAMPO: contenido generado por los vendedores desde la app móvil.
-- El vendedor sube fotos de sus proyectos con un contexto (proyecto, ubicación,
-- cultivo, cliente) y marketing lo revisa/cura para convertirlo en material del
-- banco (casos de éxito). Sentido inverso al resto del módulo (campo -> marketing).

-- Aporte (metadatos + hilo de mensajes vendedor<->marketing)
CREATE TABLE IF NOT EXISTS marketing.field_posts (
  id          BIGSERIAL PRIMARY KEY,
  folio       TEXT UNIQUE,                       -- APC-XXXX
  autor_id    BIGINT,                            -- attendance.employees.id
  autor       TEXT NOT NULL,                     -- nombre del vendedor
  titulo      TEXT NOT NULL,                     -- p.ej. "Cierre de proyecto Malla Antigranizo"
  ubicacion   TEXT,                              -- "Jocotepec, Jalisco"
  cultivo     TEXT,                              -- "Zarzamora"
  producto    TEXT,                              -- línea/producto aplicado
  cliente     TEXT,                              -- opcional
  contexto    TEXT,                              -- descripción libre del proyecto
  estado      TEXT NOT NULL DEFAULT 'nuevo',     -- nuevo|aprobado|publicado|rechazado
  nota_marketing TEXT,                           -- nota o motivo de rechazo del curador
  mensajes    JSONB NOT NULL DEFAULT '[]',       -- [{by, role, message, at}]
  publicado_asset_ids JSONB NOT NULL DEFAULT '[]', -- assets creados al publicar al banco
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mkt_field_posts_estado ON marketing.field_posts(estado);
CREATE INDEX IF NOT EXISTS idx_mkt_field_posts_autor ON marketing.field_posts(autor_id);

-- Fotos del aporte (una fila por imagen; mismo esquema de almacenamiento que assets)
CREATE TABLE IF NOT EXISTS marketing.field_post_photos (
  id            BIGSERIAL PRIMARY KEY,
  field_post_id BIGINT NOT NULL REFERENCES marketing.field_posts(id) ON DELETE CASCADE,
  mime          TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL DEFAULT 0,
  storage       TEXT NOT NULL DEFAULT 'db',      -- db | s3
  blob          BYTEA,                           -- cuando storage='db'
  s3_key        TEXT,                            -- cuando storage='s3'
  orden         INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mkt_field_photos_post ON marketing.field_post_photos(field_post_id);
