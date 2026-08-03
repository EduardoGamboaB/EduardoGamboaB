-- Módulo de MARKETING: banco de activos, solicitudes de formato,
-- publicaciones para redes, calendario de campañas e inventario de impresos.
CREATE SCHEMA IF NOT EXISTS marketing;

-- Campañas (temporalidades de producto/promoción)
CREATE TABLE IF NOT EXISTS marketing.campaigns (
  id          BIGSERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  color       TEXT NOT NULL DEFAULT '#ED3237',
  canal       TEXT,                              -- redes|impresos|expo|mixto
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  productos   JSONB NOT NULL DEFAULT '[]',       -- claves/nombres de producto
  estado      TEXT NOT NULL DEFAULT 'planeada',  -- planeada|vigente|cerrada
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_rango ON marketing.campaigns(fecha_inicio, fecha_fin);

-- Banco de activos (imágenes / video / documentos)
CREATE TABLE IF NOT EXISTS marketing.assets (
  id           BIGSERIAL PRIMARY KEY,
  tipo         TEXT NOT NULL,                    -- imagen|video|documento
  titulo       TEXT NOT NULL,
  descripcion  TEXT,
  categoria    TEXT,                             -- sombra|antigranizo|antiinsecto|...
  product_sku  TEXT,
  campaign_id  BIGINT REFERENCES marketing.campaigns(id) ON DELETE SET NULL,
  mime         TEXT,
  size_bytes   BIGINT NOT NULL DEFAULT 0,
  storage      TEXT NOT NULL DEFAULT 'db',       -- db | s3
  blob         BYTEA,                            -- cuando storage='db'
  s3_key       TEXT,                             -- cuando storage='s3'
  external_url TEXT,                             -- ligas externas (YouTube, etc.)
  pending_sync BOOLEAN NOT NULL DEFAULT FALSE,   -- video en db esperando subir a S3
  uploaded_by  TEXT,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mkt_assets_cat ON marketing.assets(categoria);
CREATE INDEX IF NOT EXISTS idx_mkt_assets_pending ON marketing.assets(pending_sync) WHERE pending_sync;

-- Solicitudes de formato (vendedor -> marketing)
CREATE TABLE IF NOT EXISTS marketing.format_requests (
  id             BIGSERIAL PRIMARY KEY,
  folio          TEXT UNIQUE,                    -- FMT-XXXX
  solicitante_id BIGINT,                         -- attendance.employees.id (o null si usuario web)
  solicitante    TEXT NOT NULL,
  titulo         TEXT NOT NULL,
  descripcion    TEXT,
  referencia_asset_id BIGINT REFERENCES marketing.assets(id) ON DELETE SET NULL,
  estado         TEXT NOT NULL DEFAULT 'solicitado', -- solicitado|en_diseno|entregado|rechazado
  mensajes       JSONB NOT NULL DEFAULT '[]',    -- [{by, role, message, at}]
  entregable_asset_id BIGINT REFERENCES marketing.assets(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Publicaciones listas para compartir en redes
CREATE TABLE IF NOT EXISTS marketing.posts (
  id           BIGSERIAL PRIMARY KEY,
  titulo       TEXT NOT NULL,
  copy_texto   TEXT,                             -- texto sugerido para acompañar
  red          TEXT,                             -- facebook|instagram|whatsapp|tiktok|otro
  asset_id     BIGINT REFERENCES marketing.assets(id) ON DELETE SET NULL,
  campaign_id  BIGINT REFERENCES marketing.campaigns(id) ON DELETE SET NULL,
  publicado_por TEXT,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vistas por empleado (alimenta el contador de "nuevo" en la app)
CREATE TABLE IF NOT EXISTS marketing.post_views (
  post_id     BIGINT NOT NULL REFERENCES marketing.posts(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, employee_id)
);

-- Inventario de artículos impresos
CREATE TABLE IF NOT EXISTS marketing.print_items (
  id        BIGSERIAL PRIMARY KEY,
  nombre    TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'otro',        -- muestrario|tarjeta|carpeta|souvenir|otro
  unidad    TEXT NOT NULL DEFAULT 'pieza',
  minimo    INT NOT NULL DEFAULT 0,
  notas     TEXT,
  activo    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing.print_movements (
  id        BIGSERIAL PRIMARY KEY,
  item_id   BIGINT NOT NULL REFERENCES marketing.print_items(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL,                       -- entrada|salida|ajuste
  cantidad  INT NOT NULL,
  persona   TEXT,                                -- quién entrega/recibe
  motivo    TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mkt_movs_item ON marketing.print_movements(item_id);
