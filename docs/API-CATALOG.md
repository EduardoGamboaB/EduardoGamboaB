# Catálogo de API · Mallatex MES

Todos los endpoints se exponen al cliente vía el **gateway** en
`/api/v1/*` (Next.js). Internamente cada uno se reenvía al microservicio
que corresponde. Los esquemas de request/response están en
[`packages/shared-types`](../packages/shared-types/src/) (Zod).

## Convenciones

- Versionado: `v1`. Cambios breaking → `v2` (deprecación 6 meses).
- Auth: `Authorization: Bearer <accessToken>` excepto `/auth/login` y `/health`.
- Trace: header `X-Trace-Id` propagado a todos los servicios.
- Paginación: `?page=1&pageSize=20` (máx 100).
- Errores: `{ error: string, details?: any, traceId?: string }` HTTP 4xx/5xx.

## Identity (`/api/v1/auth/*`, `/api/v1/me`)

| Método | Path | Servicio | Descripción |
|---|---|---|---|
| POST   | `/api/v1/auth/login`   | identity | `{email, password}` → tokens |
| POST   | `/api/v1/auth/refresh` | identity | `{refreshToken}` → rota refresh + nuevo access |
| POST   | `/api/v1/auth/logout`  | identity | Revoca el refresh actual |
| GET    | `/api/v1/me`           | identity | Payload del JWT actual |

## Pedidos (`/api/v1/pedidos`)

| Método | Path | Servicio | Descripción |
|---|---|---|---|
| GET    | `/api/v1/pedidos?estado=&cliente=`        | orders | Lista paginada |
| POST   | `/api/v1/pedidos`                         | orders | Alta (estado `cobranza-pendiente`) |
| GET    | `/api/v1/pedidos/:id`                     | orders | Detalle + bitácora + liberaciones |
| PATCH  | `/api/v1/pedidos/:id`                     | orders | Update parcial |
| POST   | `/api/v1/pedidos/:id/liberar`             | orders | Cobranza libera pago → `orders.released` |
| POST   | `/api/v1/pedidos/:id/entregar`            | orders | Marca entregado → `orders.delivered` |
| GET    | `/api/v1/pedidos/:id/bitacora`            | orders | Historial de cambios de estado |

## Inventario (`/api/v1/rollos`, `/api/v1/recepciones`, `/api/v1/egresos`)

| Método | Path | Servicio | Descripción |
|---|---|---|---|
| GET    | `/api/v1/rollos?estado=&pedido=&empezado=` | inventory | Lista de rollos |
| POST   | `/api/v1/rollos`                           | inventory | Alta manual |
| PATCH  | `/api/v1/rollos/:id`                       | inventory | Cambio de estado/ubicación (auditado) |
| POST   | `/api/v1/recepciones`                      | inventory | MT-PC-001 alta recepción |
| POST   | `/api/v1/recepciones/:id/muestreo`         | inventory | Resultado muestreo (MT-PC-001 act. 13-19) |
| POST   | `/api/v1/egresos`                          | inventory | MT-PC-002 surtir material a producción |
| POST   | `/api/v1/egresos/:id/confirmar`            | inventory | Producción confirma recibido |
| POST   | `/api/v1/retornos`                         | inventory | MT-DT-005 sobrante regresa al almacén |
| GET    | `/api/v1/ubicaciones`                      | inventory | Conteo de rollos por zona |

## Producción (`/api/v1/op`, `/api/v1/mermas`, `/api/v1/avisos`, ...)

| Método | Path | Servicio | Descripción |
|---|---|---|---|
| GET    | `/api/v1/op?linea=&estado=&pedido=`        | production | OP filtradas |
| POST   | `/api/v1/op`                               | production | Alta de OP |
| POST   | `/api/v1/op/:id/iniciar`                   | production | Marca `en-proceso` |
| POST   | `/api/v1/op/:id/terminar`                  | production | Marca `terminada` |
| POST   | `/api/v1/op/:id/registro`                  | production | Operador hace +1 pieza |
| GET    | `/api/v1/lineas/:id/estado`                | production | OP activa + avisos urgentes |
| GET    | `/api/v1/mermas?categoria=&pedido=`        | production | Lista filtrable |
| POST   | `/api/v1/mermas`                           | production | MT-DT-003 alta de merma |
| GET    | `/api/v1/avisos?estado=&linea=`            | production | Avisos del piso |
| POST   | `/api/v1/avisos`                           | production | Operador reporta problema |
| PATCH  | `/api/v1/avisos/:id`                       | production | Cambiar estado |
| GET    | `/api/v1/productividad`                    | production | Turnos registrados |
| POST   | `/api/v1/productividad`                    | production | Alta de turno |
| GET    | `/api/v1/productividad/oee`                | production | OEE planta |
| POST   | `/api/v1/pesaje`                           | production | MT-DT-006 verificación de peso |

## Usuarios (`/api/v1/usuarios`)

| Método | Path | Servicio | Descripción |
|---|---|---|---|
| GET    | `/api/v1/usuarios?role=&tipo=&linea=`      | identity | Lista de usuarios |
| POST   | `/api/v1/usuarios`                         | identity | Alta |
| PATCH  | `/api/v1/usuarios/:id`                     | identity | Update (tipo, línea, etc.) |
| GET    | `/api/v1/usuarios/:id/competencias`        | identity | Política MT-PC-003 § 2 |

## SAE Bridge (`/api/v1/sae/*`)

| Método | Path | Servicio | Descripción |
|---|---|---|---|
| POST   | `/api/v1/sae/sync/recepcion/:id`           | sae-bridge | Push manual al SAE |
| POST   | `/api/v1/sae/sync/egreso/:id`              | sae-bridge | Generar póliza SAE |
| GET    | `/api/v1/sae/reconciliacion`               | sae-bridge | Diff SAE vs MES |

## BFF (agregación)

| Método | Path | Descripción |
|---|---|---|
| GET    | `/api/v1/dashboard/executive`              | Combina pedidos + OEE + mermas + terminados en una sola respuesta para el DirectorApp |

## Eventos de dominio (publicados a Redis Streams `mes:events`)

| Tipo | Producer | Consumers |
|---|---|---|
| `orders.created`               | orders     | (futuro) notifications, sae-bridge |
| `orders.released`              | orders     | production (crea OP automática), inventory (libera para egreso) |
| `orders.delivered`             | orders     | sae-bridge (genera factura) |
| `inventory.receipt.registered` | inventory  | sae-bridge (push al SAE) |
| `inventory.egreso.confirmed`   | inventory  | sae-bridge (póliza), orders (estado material-egresado) |
| `production.op.started`        | production | (futuro) notifications |
| `production.op.finished`       | production | orders (incrementa `terminados`) |
| `production.merma.registered`  | production | (futuro) notifications QC |
| `production.aviso.created`     | production | (futuro) notifications a supervisor |

## Arranque local

```bash
# Variables de entorno
cp .env.example .env

# Levantar todo (db + redis + 5 microservicios + web)
docker compose -f docker-compose.mes.yml up -d

# Migrar las 4 BDs por separado
docker compose -f docker-compose.mes.yml exec orders-svc     npx prisma migrate deploy --schema=prisma/schema.prisma
docker compose -f docker-compose.mes.yml exec inventory-svc  npx prisma migrate deploy --schema=prisma/schema.prisma
docker compose -f docker-compose.mes.yml exec production-svc npx prisma migrate deploy --schema=prisma/schema.prisma
docker compose -f docker-compose.mes.yml exec identity-svc   npx prisma migrate deploy --schema=prisma/schema.prisma

# UI MES: http://localhost:3000/mes
# Health de cada servicio:
curl http://localhost:3001/health  # orders
curl http://localhost:3002/health  # inventory
curl http://localhost:3003/health  # production
curl http://localhost:3004/health  # identity
curl http://localhost:3005/health  # sae-bridge
```

## Dev sin Docker

Cada servicio se puede correr individualmente:

```bash
cd services/orders-svc && npm install && npm run prisma:generate && npm run dev
# repetir para inventory-svc, production-svc, identity-svc, sae-bridge
```

El gateway de Next.js usa `localhost:300X` por defecto.
