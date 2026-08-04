# Plataforma Mallatex

Plataforma web unificada de **Tejidos Técnicos Mallatex** que integra en un solo
proyecto todo lo desarrollado previamente por separado:

| Origen | Se integra como |
|---|---|
| **Aplicación según requerimientos** (asistencia, NOI, RH, control de acceso) | contexto `attendance` + portal web + app móvil |
| **MES** (Manufacturing Execution System, 6 perfiles operativos) | contexto `mes` + consola web + módulos móviles de línea |
| **Captura de leads — Anaberries** (eventos, sorteo, dashboard) | contexto `leads` |
| **CRM móvil de ventas** | contexto `crm` + app móvil |
| **Marketing** (banco de materiales, formatos, publicaciones, calendario de campañas, impresos) | contexto `marketing` + consola web + módulo móvil «Material de venta» |

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
│       ├── leads/               # Captura Anaberries, sorteo, dashboard
│       └── marketing/           # Banco de materiales, formatos, campañas, impresos
├── frontend/                    # Web unificada Next.js (responsiva, mobile-first)
├── mobile/                      # App única Expo/React Native (campo + ventas + MES)
├── database/                    # Esquema relacional, migraciones y seeds (DAO)
│   ├── schema.sql               # DDL normalizado (identity/attendance/crm/mes/leads/marketing)
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
- **Microservicios tras un gateway.** El `gateway` unifica los seis servicios
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

# Arranca gateway + 6 microservicios
npm run dev

# Frontend (otra terminal)
cd frontend && npm install && npm run dev   # http://localhost:3000 (Next)
```

Kiosko de planta (tablet por línea): `http://<web>/kiosko` — pantalla completa
para checar entrada/salida y autoservicio RH; la línea (LC1..LE) se configura
en la propia tablet al primer arranque.

### Notificaciones push y reconocimiento facial (fase 2 móvil)

- **Push**: al iniciar sesión, la app registra su `ExponentPushToken`
  (`POST /api/field/push-token`); cuando marketing publica material nuevo, el
  servicio avisa a todo el equipo vía Expo (sin credenciales adicionales).
  Para builds EAS, definir `extra.eas.projectId` en `mobile/app.json`.
- **Rostro**: el colaborador se autoenrola desde la app (Perfil → Mi rostro) o
  el kiosco (Autoservicio → Mi rostro). Con solo foto queda como *referencia*;
  el descriptor 128D (enrolamiento completo) se calcula en el kiosco si se
  instala el modelo [face-api.js](https://github.com/justadudewhohacks/face-api.js)
  en `frontend/public/models/face-api/` (drop-in opcional: `face-api.min.js`
  cargado en la página + pesos de tiny_face_detector, face_landmark_68 y
  face_recognition). El matching por descriptor ya está implementado y probado
  en el backend.

### Videos del banco de marketing (S3 opcional)

Sin configurar nada, los videos quedan en la base de datos marcados
«pendiente de sincronizar». Para moverlos a un bucket S3/R2: definir en `.env`
`S3_MODE=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY` (y `S3_ENDPOINT` si es R2/compatible), reiniciar el
servicio `marketing` y pulsar **«Sincronizar a S3»** en *Marketing → Banco*
(o `POST /api/mkt/assets/sync-s3`).

## Cuentas demo

Contraseña web `mallatex2026`:

| Correo | Rol |
|---|---|
| `admin@mallatex.mx` | admin (acceso total) |
| `contabilidad@mallatex.mx` | contador |
| `nomina@mallatex.mx` | nómina |
| `comercial@mallatex.mx` | gerente comercial |
| `marketing@mallatex.mx` | marketing |

App móvil / portal (empleados) — código + PIN `1234`:

| Código | Perfil | Ve en móvil |
|---|---|---|
| `MTX001` | operativo | Asistencia + Perfil |
| `MTX002` | comercial | CRM completo + Material de venta |
| `MTX021` | linea | Módulos MES (tablet, producción, mermas) |

## Seguridad

Endurecimiento aplicado (ver detalle en el informe de pentest):

- **Secreto JWT:** el arranque **aborta en producción** si `JWT_SECRET` falta,
  es débil o mide <24 caracteres. Genera uno con `openssl rand -base64 48`.
- **Autorización:** los endpoints de PII y operaciones destructivas de leads,
  el sorteo y el dashboard exigen sesión de administración (no cualquier token).
- **Banco de contenido:** los archivos se validan por *magic bytes* contra una
  lista blanca por tipo (no se acepta HTML/SVG) y se sirven como descarga con
  `nosniff`; las ligas externas se restringen a `http(s)`.
- **Web:** CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS y `Referrer-Policy` en
  `next.config.js`; el logout revoca el token en el servidor.
- **API:** CORS con `*` deshabilita credenciales; `/api/gateway/routes` no
  expone URLs internas en producción; rate limiting por IP en el autoregistro
  público de leads; tamaño validado **antes** de decodificar base64.
- **Móvil:** la selfie de la cola offline se guarda en almacenamiento privado
  (no en `AsyncStorage` en claro); la URL del servidor exige `https://` (salvo
  LAN local); `usesCleartextTraffic:false` (Android) y ATS estricto (iOS).

**Pendiente (requiere build nativo):** *certificate pinning* en la app móvil.
Necesita un plugin de config + EAS build (p. ej. `react-native-ssl-pinning` o
`expo-build-properties`), no expresable en el runtime JS gestionado. Mitigación
interina vigente: HTTPS forzado + ATS/cleartext deshabilitado.

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
| `npm run test:e2e` | Suite E2E vía gateway (220 aserciones) — ver [`docs/manual-e2e.md`](docs/manual-e2e.md) |

---

_Mallatex — «Protegemos lo que siembras.» Plataforma powered by Evorgyn._
