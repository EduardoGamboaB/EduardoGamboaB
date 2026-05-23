# Arquitectura · Mallatex Production Suite

## Visión general

Suite **web + móvil** para el control de producción de agrotextiles. Una sola
base de código Next.js sirve simultáneamente:

- **Aplicación web** (escritorio): dashboard, gestión de pedidos, catálogo,
  reportes — para gerencia, comercial y supervisión.
- **Aplicación móvil PWA**: registro de producción, escaneo de QR de órdenes,
  consultas rápidas — para operarios y supervisores en planta.
- **API REST**: endpoints en `/api/*` consumibles por integraciones (ERP,
  básculas, lectores RFID, balanzas, etc.).

## Capas

```
┌──────────────────────────────────────────────┐
│ UI (App Router · React Server Components)    │
│  ├─ Layout responsive (sidebar / bottom nav) │
│  ├─ Páginas por módulo                       │
│  └─ Componentes UI (Tailwind tokens marca)   │
└────────────────────┬─────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│ Capa de aplicación (Server Actions + API)    │
│  ├─ Casos de uso (PedidoService, OPService)  │
│  └─ Validación con Zod                       │
└────────────────────┬─────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│ Persistencia (Prisma ORM)                    │
└────────────────────┬─────────────────────────┘
                     │
              ┌──────▼──────┐
              │ PostgreSQL  │
              └─────────────┘
```

## Decisiones de diseño

### Mobile-first PWA en lugar de app nativa

Una **PWA Next.js** instalable cubre el 95 % de casos de uso de planta:
registro de producción, consultas, escaneo de QR con `BarcodeDetector`. Si en
el futuro se necesita acceso a APIs nativas avanzadas (NFC industrial,
impresoras térmicas Bluetooth Low Energy), se puede empaquetar la PWA con
Capacitor o crear una app React Native compartiendo la capa de datos.

### App Router + Server Components

- **Rendering en servidor por defecto** — minimiza JS en planta (tablets de
  baja potencia).
- **Server Actions** para mutaciones — no exponemos la BD al cliente.
- **Streaming + Suspense** — pantallas pesadas como Dashboard cargan en
  partes.

### Prisma + SQLite/PostgreSQL

- En **desarrollo**: SQLite (cero configuración).
- En **producción**: PostgreSQL (concurrencia, transacciones, JSONB para
  especificaciones de productos).
- El schema queda **listo para cambiar** modificando una sola línea en
  `prisma/schema.prisma`.

### Autenticación con NextAuth

Modelo de roles incluido: ADMIN, SUPERVISOR, OPERARIO, COMERCIAL, CALIDAD.
Cada ruta del módulo `(app)` puede comprobar `auth()` y restringir por rol.

## Modelo de dominio (extracto)

Las entidades principales y sus relaciones:

- `Cliente` 1—* `Pedido` 1—* `ItemPedido` *—1 `Producto`
- `Pedido` 1—* `OrdenProduccion` (una OP produce un solo producto, puede o no
  estar vinculada a un pedido)
- `OrdenProduccion` 1—* `RegistroProduccion` (cada turno/operario)
- `OrdenProduccion` 1—* `Rollo` (trazabilidad rollo a rollo)
- `OrdenProduccion` 1—* `ConsumoMateriaPrima`
- `OrdenProduccion` 1—* `ParoProduccion`
- `Rollo` 1—* `InspeccionCalidad`
- `Almacen` 1—* `MovimientoStock` (entradas, salidas, traspasos, mermas)

Ver `prisma/schema.prisma` para el modelo completo.

## Trazabilidad

Cada **rollo** producido recibe un código único (`R-YYYY-#####`) y un QR
incrustado. El QR puede leerse desde:

1. **App PWA** (cámara del móvil del supervisor).
2. **Lector industrial** que llame al endpoint `/api/rollos/:codigo`.

A partir del rollo se puede reconstruir toda la historia:

```
Rollo R-2026-00128
   ↓
Orden OP-2026-00001 (máquina TEL-01, operario María, turno matutino)
   ↓
Consumos: 380 kg HDPE virgen lote H-220, 18 kg MB negro lote N-15
   ↓
Pedido PED-2026-00001 (Invernaderos del Bajío)
   ↓
Inspección INS-2026-0042 (APROBADO por Ana Calidad)
   ↓
Salida 2026-06-05 (guía SAT 1234)
```

## Escalabilidad

| Componente | Estrategia |
|---|---|
| Aplicación Next.js | Despliegue stateless en múltiples instancias detrás de un load balancer |
| Base de datos | PostgreSQL con réplicas de lectura para reportes |
| Activos estáticos | CDN (Vercel/Cloudflare) |
| Trabajos en segundo plano | Workers separados que consuman colas (BullMQ / Inngest) — generación de reportes pesados, sincronización con ERP |
| Integraciones de planta (PLC) | Servicio externo expuesto vía OPC-UA → REST gateway |

## Roadmap técnico

1. ✅ Modelo de datos completo.
2. ✅ Shell responsivo (sidebar + bottom nav).
3. ✅ Pantallas de los 7 módulos.
4. ⏳ Server Actions completos para CRUD.
5. ⏳ Service Worker (next-pwa) para uso offline en planta.
6. ⏳ Escaneo de QR con `BarcodeDetector` API.
7. ⏳ Tests E2E con Playwright sobre los flujos críticos.
8. ⏳ Integración con CFDI 4.0 para facturación.
9. ⏳ Conector con balanzas industriales (Mettler Toledo, Ohaus) por puerto
   serie/IoT.
