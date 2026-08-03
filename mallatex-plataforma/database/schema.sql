-- =====================================================================
--  Plataforma Mallatex — Esquema relacional unificado (PostgreSQL 14+)
--  Bounded contexts como esquemas: identity, attendance, crm, mes, leads
--  Convención: snake_case, PK id, timestamps created_at/updated_at.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS attendance;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS mes;
CREATE SCHEMA IF NOT EXISTS leads;

-- ---------------------------------------------------------------------
--  IDENTITY — usuarios, roles, matriz de acceso (web/portal/móvil)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS identity.users (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT        NOT NULL,
  email            TEXT        NOT NULL UNIQUE,
  role             TEXT        NOT NULL DEFAULT 'comercial',   -- admin|contador|nomina|comercial
  position         TEXT,
  password_hash    TEXT        NOT NULL,
  active           BOOLEAN     NOT NULL DEFAULT TRUE,
  extra_modules    JSONB       NOT NULL DEFAULT '[]',
  revoked_modules  JSONB       NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de módulos por superficie (web|portal|mobile)
CREATE TABLE IF NOT EXISTS identity.module_catalog (
  key       TEXT NOT NULL,
  surface   TEXT NOT NULL,           -- web | portal | mobile
  grp       TEXT,
  label     TEXT NOT NULL,
  sort      INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (surface, key)
);

-- Matriz configurable: rol/perfil -> módulo por superficie
CREATE TABLE IF NOT EXISTS identity.access_grant (
  subject_type TEXT NOT NULL,        -- role | profile
  subject_key  TEXT NOT NULL,        -- admin|contador|... | comercial|operativo
  surface      TEXT NOT NULL,        -- web | portal | mobile
  module_key   TEXT NOT NULL,
  PRIMARY KEY (subject_type, subject_key, surface, module_key)
);

-- ---------------------------------------------------------------------
--  ATTENDANCE / RH / NÓMINA
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance.schedules (
  id                BIGSERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  entry_time        TIME NOT NULL DEFAULT '08:00',
  exit_time         TIME NOT NULL DEFAULT '18:00',
  lunch_minutes     INT  NOT NULL DEFAULT 60,
  tolerance_minutes INT  NOT NULL DEFAULT 10,
  late_after_minutes INT NOT NULL DEFAULT 15,
  hours_per_day     NUMERIC(4,2) NOT NULL DEFAULT 8,
  work_days         JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance.devices (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  brand      TEXT,
  model      TEXT,
  serial     TEXT,
  ip         TEXT,
  location   TEXT,
  last_sync  TIMESTAMPTZ,
  active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS attendance.sites (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  client        TEXT,
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  radius_meters INT NOT NULL DEFAULT 150,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS attendance.employees (
  id                     BIGSERIAL PRIMARY KEY,
  code                   TEXT NOT NULL UNIQUE,          -- MTX001
  noi_key                TEXT,
  name                   TEXT NOT NULL,
  rfc                    TEXT,
  department             TEXT,
  position               TEXT,
  schedule_id            BIGINT REFERENCES attendance.schedules(id) ON DELETE SET NULL,
  device_id              BIGINT REFERENCES attendance.devices(id) ON DELETE SET NULL,
  checador_user_id       TEXT,
  pin_hash               TEXT,
  daily_salary           NUMERIC(12,2) NOT NULL DEFAULT 0,
  hire_date              DATE,
  bonus_eligible         BOOLEAN NOT NULL DEFAULT TRUE,
  work_mode              TEXT NOT NULL DEFAULT 'planta',  -- planta|campo|hibrido
  app_profile            TEXT,                            -- comercial|operativo (override)
  allowed_site_ids       JSONB NOT NULL DEFAULT '[]',
  face_descriptor        JSONB,                           -- 128 floats
  face_photo             TEXT,
  active                 BOOLEAN NOT NULL DEFAULT TRUE,
  extra_modules          JSONB NOT NULL DEFAULT '[]',
  revoked_modules        JSONB NOT NULL DEFAULT '[]',
  portal_extra_modules   JSONB NOT NULL DEFAULT '[]',
  portal_revoked_modules JSONB NOT NULL DEFAULT '[]',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employees_department ON attendance.employees(department);

CREATE TABLE IF NOT EXISTS attendance.checadas (
  id               BIGSERIAL PRIMARY KEY,
  employee_id      BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  device_id        BIGINT REFERENCES attendance.devices(id) ON DELETE SET NULL,
  ts               TIMESTAMPTZ NOT NULL,
  type             TEXT NOT NULL,                  -- entrada|salida
  method           TEXT NOT NULL DEFAULT 'facial', -- facial|manual|campo
  raw              JSONB,
  lat              NUMERIC(10,7),
  lng              NUMERIC(10,7),
  site_id          BIGINT REFERENCES attendance.sites(id) ON DELETE SET NULL,
  distance_meters  NUMERIC(10,2),
  within_geofence  BOOLEAN,
  face_match_distance NUMERIC(6,4),
  face_verified    BOOLEAN,
  mocked           BOOLEAN NOT NULL DEFAULT FALSE,
  offline          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checadas_emp_ts ON attendance.checadas(employee_id, ts);

CREATE TABLE IF NOT EXISTS attendance.incidents (
  id            BIGSERIAL PRIMARY KEY,
  employee_id   BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,     -- vacaciones|permiso|incapacidad|falta|justificada
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pendiente', -- pendiente|autorizada|rechazada
  created_by    TEXT,
  authorized_by TEXT,
  self_service  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance.attendance_day (
  id                  BIGSERIAL PRIMARY KEY,
  employee_id         BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  schedule_id         BIGINT REFERENCES attendance.schedules(id) ON DELETE SET NULL,
  first_in            TIMESTAMPTZ,
  last_out            TIMESTAMPTZ,
  checada_count       INT NOT NULL DEFAULT 0,
  worked_minutes      INT NOT NULL DEFAULT 0,
  late_minutes        INT NOT NULL DEFAULT 0,
  early_leave_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes    INT NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pendiente',
  incident_id         BIGINT REFERENCES attendance.incidents(id) ON DELETE SET NULL,
  manual_status       TEXT,
  manual_note         TEXT,
  auto_note           TEXT,
  UNIQUE (employee_id, date)
);

CREATE TABLE IF NOT EXISTS attendance.overtime (
  id                 BIGSERIAL PRIMARY KEY,
  employee_id        BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  calculated_minutes INT NOT NULL DEFAULT 0,
  authorized_minutes INT NOT NULL DEFAULT 0,
  type               TEXT NOT NULL DEFAULT 'ordinario', -- ordinario|doble
  status             TEXT NOT NULL DEFAULT 'pendiente',
  authorized_by      TEXT
);

CREATE TABLE IF NOT EXISTS attendance.periods (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'abierto',   -- abierto|cerrado
  closed_by  TEXT,
  closed_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS attendance.noi_concepts (
  id          BIGSERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  noi_number  INT,
  tipo        TEXT,          -- P|D|I
  descripcion TEXT,
  unidad      TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS attendance.variable_concepts (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  noi_number INT,
  tipo       TEXT,
  unidad     TEXT,
  modo       TEXT NOT NULL DEFAULT 'tarifa',   -- tarifa|porcentaje|importe
  rate       NUMERIC(12,4) NOT NULL DEFAULT 0,
  department TEXT,
  source     TEXT NOT NULL DEFAULT 'manual',   -- manual|g3|mes|aspel
  enabled    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS attendance.variable_entries (
  id          BIGSERIAL PRIMARY KEY,
  period_id   BIGINT NOT NULL REFERENCES attendance.periods(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  concept_id  BIGINT NOT NULL REFERENCES attendance.variable_concepts(id) ON DELETE CASCADE,
  cantidad    NUMERIC(14,4) NOT NULL DEFAULT 0,
  rate        NUMERIC(12,4),
  importe     NUMERIC(14,2) NOT NULL DEFAULT 0,
  note        TEXT,
  source      TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  created_by  TEXT,
  synced_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_id, employee_id, concept_id, external_id)
);

CREATE TABLE IF NOT EXISTS attendance.payslips (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  period_id   BIGINT NOT NULL REFERENCES attendance.periods(id) ON DELETE CASCADE,
  perceptions JSONB NOT NULL DEFAULT '[]',
  deductions  JSONB NOT NULL DEFAULT '[]',
  total_p     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_d     NUMERIC(14,2) NOT NULL DEFAULT 0,
  neto        NUMERIC(14,2) NOT NULL DEFAULT 0,
  emitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period_id)
);

CREATE TABLE IF NOT EXISTS attendance.tickets (
  id            BIGSERIAL PRIMARY KEY,
  employee_id   BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  category      TEXT,
  subject       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'abierto',   -- abierto|en_proceso|resuelto
  messages      JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance.audit_log (
  id         BIGSERIAL PRIMARY KEY,
  ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    TEXT,
  user_name  TEXT,
  role       TEXT,
  action     TEXT,
  entity     TEXT,
  entity_id  TEXT,
  detail     JSONB
);

-- ---------------------------------------------------------------------
--  CRM / VENTAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm.clients (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'prospecto',  -- cliente|prospecto
  stage        TEXT,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  lat          NUMERIC(10,7),
  lng          NUMERIC(10,7),
  cultivo      TEXT,
  assigned_to  BIGINT REFERENCES attendance.employees(id) ON DELETE SET NULL,
  notes        TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON crm.clients(assigned_to);

CREATE TABLE IF NOT EXISTS crm.sales_routes (
  id                 BIGSERIAL PRIMARY KEY,
  employee_id        BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  date               DATE NOT NULL DEFAULT CURRENT_DATE,
  status             TEXT NOT NULL DEFAULT 'activa',   -- activa|finalizada
  started_at         TIMESTAMPTZ,
  ended_at           TIMESTAMPTZ,
  planned_client_ids JSONB NOT NULL DEFAULT '[]',
  track              JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS crm.visits (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  client_id   BIGINT REFERENCES crm.clients(id) ON DELETE SET NULL,
  route_id    BIGINT REFERENCES crm.sales_routes(id) ON DELETE SET NULL,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat         NUMERIC(10,7),
  lng         NUMERIC(10,7),
  found       BOOLEAN,
  status      TEXT,
  type        TEXT,
  notes       TEXT,
  photos      JSONB NOT NULL DEFAULT '[]',
  offline     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS crm.sales_objectives (
  id              BIGSERIAL PRIMARY KEY,
  employee_id     BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  period          TEXT NOT NULL,
  target_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  achieved_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  UNIQUE (employee_id, period)
);

CREATE TABLE IF NOT EXISTS crm.products (
  id        BIGSERIAL PRIMARY KEY,
  sku       TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  category  TEXT,
  unit      TEXT NOT NULL DEFAULT 'm2',
  price     NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock     NUMERIC(14,2) NOT NULL DEFAULT 0,
  warehouse TEXT,
  specs     JSONB NOT NULL DEFAULT '{}',
  active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS crm.quotes (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  client_id   BIGINT REFERENCES crm.clients(id) ON DELETE SET NULL,
  items       JSONB NOT NULL DEFAULT '[]',
  subtotal    NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  folio       TEXT UNIQUE,                     -- COT-XXXX
  status      TEXT NOT NULL DEFAULT 'borrador',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.orders (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  client_id   BIGINT REFERENCES crm.clients(id) ON DELETE SET NULL,
  quote_id    BIGINT REFERENCES crm.quotes(id) ON DELETE SET NULL,
  items       JSONB NOT NULL DEFAULT '[]',
  subtotal    NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  folio       TEXT UNIQUE,                     -- PED-XXXX
  status      TEXT NOT NULL DEFAULT 'nuevo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.expense_requests (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  concept     TEXT,
  destination TEXT,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  from_date   DATE,
  to_date     DATE,
  status      TEXT NOT NULL DEFAULT 'solicitada',
  folio       TEXT UNIQUE,                     -- VIA-XXXX
  decided_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.expenses (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES attendance.employees(id) ON DELETE CASCADE,
  request_id  BIGINT REFERENCES crm.expense_requests(id) ON DELETE SET NULL,
  category    TEXT,
  merchant    TEXT,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  date        DATE,
  has_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  rfc         TEXT,
  photo       TEXT,
  status      TEXT NOT NULL DEFAULT 'solicitada',
  folio       TEXT UNIQUE,                     -- GTO-XXXX
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.invoices (
  id           BIGSERIAL PRIMARY KEY,
  employee_id  BIGINT REFERENCES attendance.employees(id) ON DELETE SET NULL,
  client_id    BIGINT REFERENCES crm.clients(id) ON DELETE SET NULL,
  order_id     BIGINT REFERENCES crm.orders(id) ON DELETE SET NULL,
  rfc          TEXT,
  razon_social TEXT,
  uso_cfdi     TEXT,
  amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'solicitada', -- solicitada|emitida|pagada|cancelada
  uuid         TEXT,
  folio        TEXT UNIQUE,                     -- FAC-XXXX
  paid_at      TIMESTAMPTZ,
  payment_ref  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
--  MES — Manufactura (procesos MT-PC-001/002/003)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mes.production_lines (
  id     BIGSERIAL PRIMARY KEY,
  code   TEXT NOT NULL UNIQUE,      -- LC1..LC4, LK, LP, LE
  name   TEXT NOT NULL,
  type   TEXT,                      -- costura|corte|perforadora|embobinado
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS mes.operators (
  id              BIGSERIAL PRIMARY KEY,
  employee_id     BIGINT REFERENCES attendance.employees(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  role            TEXT,
  tipo            TEXT,             -- A|B|C|D (competencia)
  machines        JSONB NOT NULL DEFAULT '[]',
  line_id         BIGINT REFERENCES mes.production_lines(id) ON DELETE SET NULL,
  promedio_ml_hr  NUMERIC(10,2),
  color           TEXT,
  initial         TEXT
);

CREATE TABLE IF NOT EXISTS mes.production_orders (
  id               BIGSERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,      -- EZE503, FEL..., etc.
  cliente          TEXT,
  material         TEXT,
  medida           TEXT,
  rollos           INT NOT NULL DEFAULT 0,
  ancho            NUMERIC(8,2),
  largo            NUMERIC(8,2),
  procesos         JSONB NOT NULL DEFAULT '[]',
  proceso_actual   TEXT,
  line_id          BIGINT REFERENCES mes.production_lines(id) ON DELETE SET NULL,
  meta             INT NOT NULL DEFAULT 0,
  hechas           INT NOT NULL DEFAULT 0,
  m2               NUMERIC(14,2) NOT NULL DEFAULT 0,
  terminados       INT NOT NULL DEFAULT 0,
  entregados       INT NOT NULL DEFAULT 0,
  pendientes       INT NOT NULL DEFAULT 0,
  en_piso          INT NOT NULL DEFAULT 0,
  fecha_pedido     DATE,
  compromiso       DATE,
  forma_entrega    TEXT,
  estado           TEXT NOT NULL DEFAULT 'cobranza-pendiente',
  pago_confirmado  BOOLEAN NOT NULL DEFAULT FALSE,
  material_egresado BOOLEAN NOT NULL DEFAULT FALSE,
  observaciones    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prod_orders_estado ON mes.production_orders(estado);

CREATE TABLE IF NOT EXISTS mes.production_suborders (
  id        BIGSERIAL PRIMARY KEY,
  order_id  BIGINT NOT NULL REFERENCES mes.production_orders(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  rollos    INT NOT NULL DEFAULT 0,
  medida    TEXT,
  estado    TEXT
);

CREATE TABLE IF NOT EXISTS mes.rolls (
  id        BIGSERIAL PRIMARY KEY,
  code      TEXT NOT NULL UNIQUE,
  material  TEXT,
  medida    TEXT,
  lote      TEXT,
  peso      NUMERIC(10,2),
  ubicacion TEXT,
  order_id  BIGINT REFERENCES mes.production_orders(id) ON DELETE SET NULL,
  estado    TEXT NOT NULL DEFAULT 'almacen',   -- almacen|reservado|en-linea
  empezado  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS mes.avisos (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  line_id     BIGINT REFERENCES mes.production_lines(id) ON DELETE SET NULL,
  operator_id BIGINT REFERENCES mes.operators(id) ON DELETE SET NULL,
  tipo        TEXT,
  descripcion TEXT,
  tiempo      TEXT,
  estado      TEXT NOT NULL DEFAULT 'abierto'
);

CREATE TABLE IF NOT EXISTS mes.mermas (
  id          BIGSERIAL PRIMARY KEY,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  operator_id BIGINT REFERENCES mes.operators(id) ON DELETE SET NULL,
  line_id     BIGINT REFERENCES mes.production_lines(id) ON DELETE SET NULL,
  material    TEXT,
  metros      NUMERIC(12,2) NOT NULL DEFAULT 0,
  categoria   TEXT,   -- prima|sobrante|defecto|desperdicio
  defecto     TEXT,
  order_id    BIGINT REFERENCES mes.production_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mes.recepciones (
  id         BIGSERIAL PRIMARY KEY,        -- MT-DT-001
  ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  proveedor  TEXT,
  material   TEXT,
  cantidad   NUMERIC(14,2),
  unidad     TEXT,
  lote       TEXT,
  incidencia TEXT,
  recibido_por TEXT
);

CREATE TABLE IF NOT EXISTS mes.egresos (
  id         BIGSERIAL PRIMARY KEY,        -- MT-DT-002
  ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id   BIGINT REFERENCES mes.production_orders(id) ON DELETE SET NULL,
  material   TEXT,
  cantidad   NUMERIC(14,2),
  unidad     TEXT,
  entregado_por TEXT
);

CREATE TABLE IF NOT EXISTS mes.productos_terminados (
  id            BIGSERIAL PRIMARY KEY,     -- MT-DT-006
  ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id      BIGINT REFERENCES mes.production_orders(id) ON DELETE SET NULL,
  rollos        INT,
  peso_teorico  NUMERIC(12,2),
  peso_real     NUMERIC(12,2),
  verificado_por TEXT
);

CREATE TABLE IF NOT EXISTS mes.productividad (
  id          BIGSERIAL PRIMARY KEY,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  turno       TEXT,
  line_id     BIGINT REFERENCES mes.production_lines(id) ON DELETE SET NULL,
  operator_id BIGINT REFERENCES mes.operators(id) ON DELETE SET NULL,
  metros      NUMERIC(12,2),
  piezas      INT,
  horas       NUMERIC(6,2),
  ml_hr       NUMERIC(10,2),
  pz_hr       NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS mes.locations (
  id       BIGSERIAL PRIMARY KEY,
  code     TEXT NOT NULL UNIQUE,
  zona     TEXT,
  descripcion TEXT,
  ocupada  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------
--  LEADS — Captura Anaberries (eventos, sorteo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads.events (
  id                        BIGSERIAL PRIMARY KEY,
  name                      TEXT NOT NULL,
  edition                   TEXT,
  tipo                      TEXT,
  premio                    TEXT,
  premio_imagen             BOOLEAN NOT NULL DEFAULT FALSE,
  dinamica                  TEXT,
  fecha                     DATE,
  hora                      TIME,
  lugar                     TEXT,
  plazo_contacto_dias       INT NOT NULL DEFAULT 30,
  permite_ganadores_previos BOOLEAN NOT NULL DEFAULT TRUE,
  finalizado                BOOLEAN NOT NULL DEFAULT FALSE,
  activo                    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads.leads (
  id                BIGSERIAL PRIMARY KEY,
  event_id          BIGINT NOT NULL REFERENCES leads.events(id) ON DELETE CASCADE,
  folio             TEXT NOT NULL,                -- ANB-XXXXXX
  nombre            TEXT NOT NULL,
  empresa           TEXT,
  estado            TEXT,
  email             TEXT,
  telefono          TEXT,
  cargo             TEXT,
  interes           TEXT,
  volumen           TEXT,
  notas             TEXT,
  consentimiento    BOOLEAN NOT NULL DEFAULT FALSE,
  fuente            TEXT,
  capturado_por     TEXT,
  metodo_captura    TEXT,   -- manual|gafete|autoregistro
  tiene_foto        BOOLEAN NOT NULL DEFAULT FALSE,
  acepta_terminos   BOOLEAN,
  acepta_privacidad BOOLEAN,
  consentimiento_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, folio)
);
CREATE INDEX IF NOT EXISTS idx_leads_event ON leads.leads(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads.leads(email);

CREATE TABLE IF NOT EXISTS leads.draws (
  id            BIGSERIAL PRIMARY KEY,
  event_id      BIGINT NOT NULL REFERENCES leads.events(id) ON DELETE CASCADE,
  premio        TEXT,
  folio         TEXT,
  lead_id       BIGINT REFERENCES leads.leads(id) ON DELETE SET NULL,
  nombre        TEXT,
  empresa       TEXT,
  telefono      TEXT,
  email         TEXT,
  participantes INT,
  email_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  email_estado  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads.blobs (
  key        TEXT PRIMARY KEY,       -- badge:<leadId> | event:premio:<eventId>
  mime       TEXT,
  data       BYTEA,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
