# Arquitectura backend · Mallatex MES

Backend dividido en **5 microservicios** + un **API Gateway** dentro de la
app Next.js. Cada servicio es autónomo, con su propia base de datos
PostgreSQL (schema separado) y comunicación HTTP+JSON síncrona; eventos
de dominio se publican en un broker (Redis Streams en este scaffolding,
fácilmente swap a Kafka/NATS).

```
┌────────────────────────────────────────────────────────────────────┐
│                      Mallatex MES (Next.js · :3000)                │
│                                                                    │
│   /mes/...     (App Router · UI)                                   │
│   /api/v1/...  (Gateway · BFF — proxy + agregación)                │
└──────────┬─────────────┬─────────────┬─────────────┬───────────────┘
           │             │             │             │
   ┌───────▼─────┐ ┌─────▼──────┐ ┌────▼────────┐ ┌──▼─────────────┐
   │  orders     │ │ inventory  │ │ production  │ │  identity      │
   │  :3001      │ │   :3002    │ │   :3003     │ │   :3004        │
   │ Pedidos +   │ │ Rollos +   │ │ Líneas +    │ │ Operadores +   │
   │ Cobranza    │ │ Recepción  │ │ Mermas +    │ │ Roles + Auth   │
   │ MT-PC-003   │ │ MT-PC-001/2│ │ MT-PC-003   │ │  (JWT)         │
   └──────┬──────┘ └─────┬──────┘ └─────┬───────┘ └─────┬──────────┘
          │              │              │               │
          │   ┌──────────▼──────────────▼───┐           │
          └───►   PostgreSQL 16             ◄───────────┘
              │   - orders_db (schema)      │
              │   - inventory_db (schema)   │
              │   - production_db (schema)  │
              │   - identity_db (schema)    │
              └─────────────────────────────┘

                  ┌─────────────────────────┐
                  │   sae-bridge :3005      │
                  │   Sync SAE legacy ERP   │
                  │   (worker + REST)       │
                  └─────────────────────────┘
                              │
                  ┌───────────▼─────────────┐
                  │   Redis Streams         │
                  │   - orders.created      │
                  │   - orders.released     │
                  │   - production.started  │
                  │   - merma.registered    │
                  │   - egreso.confirmed    │
                  └─────────────────────────┘
```

## Bounded contexts

| Servicio | Puerto | Responsabilidad | Procesos formales |
|---|---|---|---|
| **orders-svc** | 3001 | Pedidos del cliente, liberación por cobranza, estados | MT-PC-003 directiva |
| **inventory-svc** | 3002 | Rollos, recepciones, egresos, lotes MP, ubicaciones | MT-PC-001, MT-PC-002 |
| **production-svc** | 3003 | OP, líneas, operaciones, mermas, productividad, peso | MT-PC-003 |
| **identity-svc** | 3004 | Usuarios, roles, competencias A/B/C/D, JWT | MT-PC-003 § 2 |
| **sae-bridge** | 3005 | Sincronización bidireccional con SAE legacy (worker) | — |
| **api-gateway** | 3000 | BFF · agregación · auth · forward (en Next.js) | — |

## Por qué este corte

Cada bounded context responde a **una persona del negocio**:

- `orders-svc` ←→ Comercial + Cobranza + Jefe Producción (planificación)
- `inventory-svc` ←→ Almacén + Operaciones (logística)
- `production-svc` ←→ Operador + Jefe Producción (piso)
- `identity-svc` ←→ TI + RH (altas, competencias)
- `sae-bridge` ←→ Operaciones (SAE legacy)

Cambios en uno no obligan a redeploy de los demás. Cada servicio tiene
su propio esquema en la misma instancia Postgres (más simple que N
instancias) y puede migrar a su BD dedicada cuando el volumen lo amerite.

## Contratos

Todos los contratos (DTOs request/response) viven en
`packages/shared-types/src/` como esquemas **Zod**. Cada servicio los
importa para validar entradas; el gateway los importa para tipar las
respuestas. Una sola fuente de verdad.

## Eventos de dominio

Publicados a Redis Streams (`mes:events`). Esquema:

```json
{
  "id": "evt_01HXR3K8MZP",
  "type": "orders.released",
  "occurredAt": "2026-05-25T14:32:00Z",
  "producer": "orders-svc",
  "payload": { "pedidoId": "VFGC-872", "by": "user_maria_l" }
}
```

Consumidores:
- `production-svc` reacciona a `orders.released` → crea OP automática
- `sae-bridge` reacciona a `egreso.confirmed` → genera póliza SAE
- `notifications` (futuro) reacciona a `merma.registered` → email QC

## Despliegue

`docker-compose.yml` levanta todo en local:

```bash
docker compose up -d
# Postgres :5432, Redis :6379
# orders :3001, inventory :3002, production :3003, identity :3004, sae-bridge :3005
# Next.js :3000 (gateway + UI)
```

En producción se recomienda Kubernetes con HPA por servicio: el más
intensivo es `production-svc` (tablets emitiendo registros cada minuto).

## Estructura de carpetas

```
services/
├── orders-svc/
│   ├── src/
│   │   ├── server.ts        Fastify + plugins
│   │   ├── routes/
│   │   │   ├── pedidos.ts
│   │   │   └── health.ts
│   │   ├── repositories/
│   │   ├── events.ts        publish/subscribe Redis Streams
│   │   └── db.ts            Prisma client con su schema
│   ├── prisma/
│   │   └── schema.prisma
│   ├── Dockerfile
│   └── package.json
├── inventory-svc/
├── production-svc/
├── identity-svc/
└── sae-bridge/

packages/
└── shared-types/
    ├── src/
    │   ├── orders.ts
    │   ├── inventory.ts
    │   ├── production.ts
    │   └── identity.ts
    └── package.json

src/app/api/v1/    (gateway · BFF dentro de Next.js)
├── pedidos/
├── rollos/
├── op/
├── mermas/
└── ...
```

## Versionado de API

`v1` es el contrato actual. Cambios breaking → `v2` con período de
deprecación de 6 meses. Header `X-API-Version` opcional.

## Seguridad

- **Identity** emite JWT (RS256, 15min) + refresh (HS256, 7d, rotación).
- **Gateway** valida JWT en cada request, propaga `X-User-Id` + `X-Role`
  a microservicios vía mTLS interno (o IPs whitelisted en entornos
  controlados).
- **Microservicios** confían en los headers del gateway — no validan
  JWT (no son endpoints públicos). Si un equipo necesita acceso
  directo, debe usar el gateway.

## Observabilidad

- Logs estructurados JSON (pino) a stdout → ingesta por Loki/Datadog.
- Métricas en `/metrics` formato Prometheus.
- Trazabilidad OpenTelemetry — header `traceparent` propagado.
- Healthchecks: `/health` (liveness) y `/ready` (readiness con check de
  Postgres + Redis).
