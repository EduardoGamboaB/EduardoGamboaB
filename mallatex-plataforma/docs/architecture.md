# Arquitectura — Plataforma Mallatex

## 1. Visión general

La plataforma es un **monorepo** con cuatro entregables separados —
**backend**, **frontend**, **móvil** y **scripts de datos** — que integran los
cuatro proyectos previos de Mallatex en un sistema coherente.

```
            ┌───────────────┐        ┌───────────────┐
   Web ───▶ │               │        │  PostgreSQL   │
            │  API Gateway  │        │  (6 esquemas) │
 Móvil ───▶ │  :3000        │        └───────▲───────┘
            └──────┬────────┘                │  DAO (Sequelize)
                   │  reverse proxy /api/*    │
   ┌───────────────┼───────────────┬─────────┼───────────────┬───────────────┐
   ▼               ▼               ▼          ▼               ▼               ▼
identity:3001  attendance:3002  crm:3003   mes:3004      leads:3005   marketing:3006
```

## 2. Diseño dirigido por el dominio (DDD)

Cada microservicio es un **bounded context** con las mismas cuatro capas:

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Dominio | `src/domain/` | Agregados, entidades, value objects, servicios de dominio, invariantes y eventos. Sin dependencias de framework. |
| Aplicación | `src/application/` | Casos de uso; orquesta dominio + DAO. Devuelve `Result`/DTO. |
| Infraestructura | `src/infrastructure/` | **DAO** (repositorios) sobre Sequelize; mapeo fila ↔ entidad. |
| Interfaces | `src/interfaces/` | Rutas HTTP Express; validación de transporte y auth. |

El **kernel compartido** (`backend/shared`) provee:

- `ddd/` — `Entity`, `ValueObject`, `AggregateRoot` (con eventos de dominio),
  `Result`/`DomainError`.
- `persistence/` — instancia Sequelize (`getSequelize`), `withTransaction`
  (Unit of Work) y **`BaseDAO`** (CRUD, paginación, upsert, hooks
  `toDomain`/`toPersistence`).
- `auth/` — JWT (`signToken`/`verifyToken`), scrypt (`hashSecret`/`verifySecret`)
  y middlewares (`requireAuth`, `adminOnly`, `requireRole`, `requireModule`,
  `requireEmployee`, `requireCommercialProfile`).
- `http/` — fábrica de servidor Express (helmet, CORS, healthchecks, manejo de
  errores) y `asyncHandler`.
- `messaging/` — `eventBus` en proceso (punto de extensión a NATS/RabbitMQ/Kafka).

## 3. Patrón DAO y esquema relacional

El requisito de **persistencia con DAO** se cumple con Sequelize como ORM y
`BaseDAO` como interfaz de acceso a datos. El **esquema relacional** está
normalizado en `database/schema.sql`, con un esquema PostgreSQL por contexto:

- `identity` — `users`, `module_catalog`, `access_grant`.
- `attendance` — `employees`, `schedules`, `devices`, `sites`, `checadas`,
  `attendance_day`, `incidents`, `overtime`, `periods`, `noi_concepts`,
  `variable_concepts`, `variable_entries`, `payslips`, `tickets`, `audit_log`.
- `crm` — `clients`, `sales_routes`, `visits`, `sales_objectives`, `products`,
  `quotes`, `orders`, `expense_requests`, `expenses`, `invoices`.
- `mes` — `production_lines`, `operators`, `production_orders`,
  `production_suborders`, `rolls`, `avisos`, `mermas`, `recepciones`,
  `egresos`, `productos_terminados`, `productividad`, `locations`.
- `leads` — `events`, `leads`, `draws`, `blobs`.
- `marketing` — `campaigns`, `assets` (banco de materiales; blob en BD o clave
  S3), `format_requests`, `posts` + `post_views`, `print_items` +
  `print_movements`.

Las claves foráneas cruzan contextos sólo por id (p.ej. `crm.clients.assigned_to`
→ `attendance.employees.id`); no hay acoplamiento de código entre servicios.

## 4. Modelo de acceso unificado

`identity` centraliza la autorización. El JWT emitido en el login ya transporta
los **módulos efectivos** del sujeto, de modo que el gateway y cada servicio
autorizan sin reconsultar la matriz.

- **Superficies:** `web` (consola admin), `portal` (autoservicio del empleado),
  `mobile` (app de campo/ventas/MES).
- **Matriz base:** `access_grant(subject_type, subject_key, surface, module_key)`
  otorga módulos por **rol** (usuarios: admin, contador, nomina, comercial,
  produccion, direccion, marketing) o **perfil** (empleados: comercial,
  operativo, linea).
- **Overrides por sujeto:** `extra_modules` / `revoked_modules` (y sus variantes
  de portal) conceden o revocan módulos puntuales.
- **Resolución:** `AccessPolicy.effectiveModules()` = base ∪ extra − revocados
  (admin siempre = todo). El menú web/portal/móvil se pinta desde esa lista.

## 5. Frontend web

Next.js 14 (App Router), **mobile-first** y adaptativo. El shell renderiza el
menú a partir de `GET /api/auth/me → modules`. Sistema de diseño con la marca
Mallatex (rojo `#ED3237`, familia Barlow) y `ProcessTag` para anclar pantallas
MES a los procesos formales `MT-PC-XXX`.

## 6. App móvil

Expo/React Native único. Navegación por drawer cuyos módulos se filtran por
`profile.modules` del backend. Reúne asistencia de campo (selfie + GPS +
geocerca, cola offline, biometría), CRM de ventas y los nuevos módulos MES de
línea (`mes-tablet`, `mes-produccion-movil`, `mes-mermas`). Un mismo login por
código + PIN contra el gateway.

## 7. Contexto marketing y almacenamiento S3

El servicio `marketing` cubre banco de materiales (imágenes/videos/documentos),
solicitudes de formatos con folio `FMT-`, publicaciones difundidas al equipo
móvil (con contador de no vistas), calendario de campañas e inventario de
artículos impresos con stock calculado por movimientos.

Los archivos se guardan como blob en PostgreSQL, salvo los **videos**, que se
suben a un bucket **S3/R2** cuando está configurado (`S3_MODE=s3` + credenciales
en `.env`). Sin S3, los videos ≤ `MKT_VIDEO_DB_MAX_MB` quedan en BD marcados
`pending_sync`; al configurar el bucket, `POST /api/mkt/assets/sync-s3` migra
todos los pendientes (la descarga usa URLs prefirmadas de 15 min). El SDK de AWS
se importa de forma diferida: el servicio arranca sin él cuando `S3_MODE=off`.

## 8. Integraciones

Contratos `mock|http` por fuente (G3 → kilometraje, MES → costura m², Aspel →
timbrado CFDI y webhook de pagos que genera la comisión de ventas). Cada captura
variable registra su `source` para trazabilidad.

## 9. Despliegue

Imagen de backend única parametrizada por comando (`start:<servicio>`);
frontend Next.js en imagen propia. Blueprints para Render y Railway, stack local
con Docker Compose y CI que aplica esquema + seed + pruebas en cada push.
