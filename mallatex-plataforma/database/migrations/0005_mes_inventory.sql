-- INVENTARIO FÍSICO (MES): artículos con saldo (kardex), conteo físico desde la
-- tablet y sincronización de ajustes con Aspel SAE (vía middieware propio).
-- La existencia NO se guarda: se calcula del historial de movimientos
-- (entradas - salidas +/- ajustes), igual que el inventario de impresos.

-- Artículos de inventario. El SKU coincide con el del SAE (los productos ya
-- existen en ambos; aquí sólo se lleva el saldo y se empujan los ajustes).
CREATE TABLE IF NOT EXISTS mes.inventory_items (
  id          BIGSERIAL PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,             -- clave del artículo en el SAE
  descripcion TEXT NOT NULL,
  unidad      TEXT NOT NULL DEFAULT 'pza',      -- pza|kg|m|rollo...
  ubicacion   TEXT,                             -- almacén/ubicación por defecto
  minimo      NUMERIC(14,3) NOT NULL DEFAULT 0, -- para semáforo de bajo mínimo
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mes_inv_items_activo ON mes.inventory_items(activo);

-- Movimientos (kardex). El ajuste puede ser con signo (+/-).
CREATE TABLE IF NOT EXISTS mes.inventory_movements (
  id          BIGSERIAL PRIMARY KEY,
  item_id     BIGINT NOT NULL REFERENCES mes.inventory_items(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,                    -- entrada|salida|ajuste
  cantidad    NUMERIC(14,3) NOT NULL,
  motivo      TEXT,
  count_id    BIGINT,                           -- si viene de un conteo físico
  origen      TEXT NOT NULL DEFAULT 'web',      -- web|tablet
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mes_inv_movs_item ON mes.inventory_movements(item_id);

-- Conteos físicos (una sesión = un folio CTF-####). Al cerrar, cada renglón con
-- diferencia genera un movimiento de ajuste; luego el conteo se sincroniza al SAE.
CREATE TABLE IF NOT EXISTS mes.inventory_counts (
  id              BIGSERIAL PRIMARY KEY,
  folio           TEXT UNIQUE,                  -- CTF-XXXX
  ubicacion       TEXT,                         -- almacén contado
  estado          TEXT NOT NULL DEFAULT 'abierto', -- abierto|cerrado|sincronizado|error
  created_by      TEXT,
  sae_sync_estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente|enviado|error
  sae_ref         TEXT,                         -- folio/ref que devuelve el SAE
  sae_error       TEXT,
  sae_sync_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mes_inv_counts_estado ON mes.inventory_counts(estado);

-- Renglones del conteo: cantidad contada vs teórica (snapshot al capturar).
CREATE TABLE IF NOT EXISTS mes.inventory_count_lines (
  id          BIGSERIAL PRIMARY KEY,
  count_id    BIGINT NOT NULL REFERENCES mes.inventory_counts(id) ON DELETE CASCADE,
  item_id     BIGINT NOT NULL REFERENCES mes.inventory_items(id) ON DELETE CASCADE,
  sku         TEXT NOT NULL,
  teorico     NUMERIC(14,3) NOT NULL DEFAULT 0, -- saldo del kardex al capturar
  contado     NUMERIC(14,3) NOT NULL DEFAULT 0, -- físico capturado en la tablet
  diferencia  NUMERIC(14,3) NOT NULL DEFAULT 0, -- contado - teorico
  contado_por TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (count_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_mes_inv_lines_count ON mes.inventory_count_lines(count_id);
