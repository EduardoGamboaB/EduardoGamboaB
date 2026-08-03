# Plataforma Mallatex

Plataforma web unificada de **Tejidos Técnicos Mallatex** que integra en un solo
proyecto todo lo desarrollado previamente por separado:

| Origen | Se integra como |
|---|---|
| **Aplicación según requerimientos** (asistencia, NOI, RH, control de acceso) | contexto `attendance` + portal web + app móvil |
| **MES** (Manufacturing Execution System, 6 perfiles operativos) | contexto `mes` + consola web + módulos móviles de línea |
| **Captura de leads — Anaberries** (eventos, sorteo, dashboard) | contexto `leads` |
| **CRM móvil de ventas** | contexto `crm` + app móvil |

Todo queda organizado en un **monorepo** separado por **frontend**, **backend**,
**móvil** y **scripts de datos**, con backend en **DDD + microservicios**,
persistencia con **DAO (Sequelize)** sobre un **esquema relacional PostgreSQL**,
una **app móvil única** y una **web responsiva, adaptativa y mobile-first**.

---

## Estructura del monorepo

```
mallatex-plataforma/
├── backend/                     # DDD + microservicios (Node.js/Express)
│   ├── shared/                  # Kernel: DDD, persistencia (DAO/Sequelize), auth, http
│   ├── gateway/                 # API Gateway (punto de entrada único)
│   └── services/
│       ├── identity/            # Auth, usuarios, roles y matriz de módulos
│       ├── attendance/          # Asistencia, checadas, NOI, RH, portal, campo
│       ├── crm/                 # Clientes, rutas, visitas, cotizaciones, facturación
│       ├── mes/                 # Órdenes de producción, líneas, rollos, mermas
│       └── leads/               # Captura Anaberries, sorteo, dashboard
├── frontend/                    # Web unificada Next.js (responsiva, mobile-first)
├── mobile/                      # App única Expo/React Native (campo + ventas + MES)
├── database/                    # Esquema relacional, migraciones y seeds (DAO)
│   ├── schema.sql               # DDL normalizado (identity/attendance/crm/mes/leads)
│   ├── migrate.js  seed.js      # Runners de migración y sembrado
├── deploy/                      # Dockerfiles, blueprints y guías de despliegue
├── docker-compose.yml           # Stack local completo (db + servicios + web)
├── render.yaml  railway.json    # Despliegue a producción (un clic)
└── .github/workflows/ci.yml     # CI: build, migrate, seed, test
```

## Arquitectura

- **DDD por bounded context.** Cada microservicio tiene sus capas:
  `domain/` (agregados, entidades, value objects, servicios de dominio),
  `application/` (casos de uso), `infrastructure/` (DAO Sequelize) e
  `interfaces/` (rutas HTTP). El kernel compartido (`backend/shared`) aporta
  las primitivas (`Entity`, `AggregateRoot`, `ValueObject`, `Result`,
  `DomainEvent`) y el patrón **DAO** (`BaseDAO`).
- **Persistencia relacional con DAO.** Sequelize mapea los modelos al esquema
  relacional PostgreSQL (un esquema por contexto). Los repositorios heredan de
  `BaseDAO` y traducen filas ORM ↔ entidades de dominio.
- **Microservicios tras un gateway.** El `gateway` unifica los cinco servicios
  bajo un único origen `/api/*`, de modo que web y móvil consumen una sola URL.
- **Acceso unificado.** La **matriz de acceso** (rol/perfil → módulos por
  superficie web/portal/móvil) vive en `identity` y es la única fuente de
  verdad: gobierna el menú web, el portal del empleado y el menú móvil.

Detalle completo en [`docs/architecture.md`](docs/architecture.md).

## Puesta en marcha (local)

### Opción A — Docker (todo el stack)

```bash
cp .env.example .env
docker compose up --build
# Gateway:  http://localhost:3000
# Web:      http://localhost:3100
```

El servicio `migrate` aplica el esquema y siembra datos demo automáticamente.

### Opción B — Node directo

```bash
cp .env.example .env
npm install --workspaces --include-workspace-root

# Base de datos (PostgreSQL en marcha) + esquema + datos demo
npm run db:reset

# Arranca gateway + 5 microservicios
npm run dev

# Frontend (otra terminal)
cd frontend && npm install && npm run dev   # http://localhost:3000 (Next)
```

## Cuentas demo

Contraseña web `mallatex2026`:

| Correo | Rol |
|---|---|
| `admin@mallatex.mx` | admin (acceso total) |
| `contabilidad@mallatex.mx` | contador |
| `nomina@mallatex.mx` | nómina |
| `comercial@mallatex.mx` | gerente comercial |

App móvil / portal (empleados) — código + PIN `1234`:

| Código | Perfil | Ve en móvil |
|---|---|---|
| `MTX001` | operativo | Asistencia + Perfil |
| `MTX002` | comercial | CRM completo |
| `MTX021` | linea | Módulos MES (tablet, producción, mermas) |

## Despliegue a producción

- **Render:** blueprint en [`render.yaml`](render.yaml) (base de datos +
  microservicios + gateway + web, un clic).
- **Railway:** [`railway.json`](railway.json) (gateway por defecto; cada
  servicio como su propio deploy con `startCommand`).
- **Docker:** imágenes en `deploy/`. Guía en [`deploy/README.md`](deploy/README.md)
  y checklist en [`deploy/go-live.md`](deploy/go-live.md).

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Gateway + microservicios en desarrollo |
| `npm run db:migrate` / `db:rollback` | Aplica migraciones versionadas / elimina esquemas |
| `node database/migrate.js status` | Estado de migraciones (aplicadas vs pendientes) |
| `npm run db:seed` | Siembra catálogos y datos demo |
| `npm run db:reset` | Recrea el esquema y siembra |
| `npm test` | Pruebas de todos los workspaces |

---

_Mallatex — «Protegemos lo que siembras.» Plataforma powered by Evorgyn._
