# Contratos de integración

Mallatex · Plataforma de Asistencia (NOI) — *powered by Evorgyn*

Este documento especifica **cómo conectar la plataforma con los sistemas externos**.
Hoy estas integraciones están **simuladas** para operar sin hardware ni credenciales; aquí
se define el contrato exacto (datos, mapeos, idempotencia y punto de implementación en el
código) para habilitarlas en producción.

Integraciones cubiertas:

| # | Sistema | Alimenta | Módulo de código |
|---|---------|----------|------------------|
| 1 | **Hikvision** (checador facial) | Checadas de entrada/salida | `server/checador.js` |
| 2 | **G3** (telemetría de flotilla) | Kilometraje del conductor | `server/connectors.js` (fuente `g3`) |
| 3 | **MES** (manufactura) | m² de costura en fabricación | `server/connectors.js` (fuente `mes`) |
| 4 | **Aspel** (CxC / SAE) | Comisión al pagar facturas | `server/connectors.js` (fuente `aspel`) |
| 5 | **Aspel NOI** (nómina) | Exportación de movimientos | `server/noi.js` |

---

## 0. Principios comunes

- **Mapeo de personas.** Cada empleado tiene identificadores externos en su ficha
  (`server/routes/catalog.js`): `checadorUserId` (Hikvision), `code`/`noiKey` (NOI) y el
  área/puesto. Las integraciones de flotilla/MES/ventas se mapean por estos campos o por
  uno nuevo dedicado (ver cada sección). **Regla:** ninguna integración debe crear
  empleados; sólo referencia empleados existentes. Lo no mapeable se descarta y se registra.
- **Idempotencia.** Toda lectura externa lleva un `externalId` estable. La sincronización
  hace *upsert* por `externalId`: re-ejecutar **actualiza**, no duplica.
- **Ventana temporal.** Las percepciones variables se sincronizan **por periodo de nómina**
  (`periodId` → `startDate`/`endDate`). Las checadas, por rango de fechas.
- **Autenticación / secretos.** Todas las credenciales van por **variables de entorno**
  (nunca en el repo). Sugerencia de nombres en cada sección.
- **Errores.** Un fallo de una fuente no debe abortar el periodo: se registra en bitácora
  y se reintenta. Las escrituras a la plataforma pasan por su capa de datos transaccional.

---

## 1. Hikvision — checador facial (ISAPI/SDK)

**Objetivo:** descargar los eventos de acceso (checadas) del dispositivo y normalizarlos.

**Punto de implementación:** `server/checador.js` → función `syncDevice(deviceId, { startDate, endDate })`.
Hoy genera eventos simulados; debe sustituirse por la consulta ISAPI al equipo real.

**Endpoint típico (ISAPI, HTTP Digest):**

```
POST http://{ip-dispositivo}/ISAPI/AccessControl/AcsEvent?format=json
Authorization: Digest (usuario/clave del dispositivo)
Content-Type: application/json

{
  "AcsEventCond": {
    "searchID": "mtx-<uuid>",
    "searchResultPosition": 0,
    "maxResults": 50,
    "major": 5, "minor": 75,
    "startTime": "2026-07-01T00:00:00-06:00",
    "endTime":   "2026-07-01T23:59:59-06:00"
  }
}
```

**Respuesta → mapeo a una checada de la plataforma:**

| Campo ISAPI | Campo interno (`checadas`) | Notas |
|-------------|----------------------------|-------|
| `employeeNoString` | se busca el empleado por `checadorUserId` | Persona registrada en el equipo. |
| `time` (ISO 8601) | `timestamp` | Respeta la zona horaria del dispositivo. |
| `attendanceStatus` / `major/minor` | `type` = `entrada` \| `salida` | Si el equipo no lo indica, se infiere por horario (primera del día = entrada, última = salida). |
| — | `deviceId` | Dispositivo de origen. |
| serial del evento | `raw` / `externalId` | Para idempotencia. |

**Forma que debe devolver `syncDevice` (igual que hoy):** inserta en la colección
`checadas` registros `{ employeeId, deviceId, timestamp, type, method:'facial', raw }` y
al terminar ejecuta `reprocess({ startDate, endDate })` (ya lo hace) para recalcular la
asistencia. La descarga debe **paginar** (`searchResultPosition`) y ser **idempotente**
(no re-insertar un evento ya descargado; filtra por `raw`/serial).

**Alternativas:** el SDK de Hikvision (event listener) o la carga de eventos vía webhook si
la red lo permite. Autenticación: `HIKVISION_USER`, `HIKVISION_PASSWORD` (por dispositivo,
mejor guardarlos cifrados en la ficha del dispositivo).

---

## 2·3·4. Percepciones variables — contrato del conector

Las tres fuentes externas (G3, MES, Aspel) comparten **un mismo contrato** y un **driver
conmutable** ya construido:

- **`*_MODE=mock`** (por defecto): lecturas deterministas simuladas, sin credenciales.
- **`*_MODE=http`**: consulta **real** a la API externa (`server/integrations.js` →
  `externalQuantities`). No cambia la lógica de negocio: se activa por variables de entorno.

**Activación (por fuente):**

```bash
G3_MODE=http    G3_BASE_URL=https://api.g3/fleet/mileage        G3_TOKEN=...
MES_MODE=http   MES_BASE_URL=https://mes.mallatex/api/production  MES_TOKEN=...
ASPEL_MODE=http ASPEL_CFDI_URL=https://.../timbrar               ASPEL_TOKEN=...
ASPEL_WEBHOOK_SECRET=...        # valida el webhook de pago
INTEGRATIONS_TIMEOUT_MS=8000
```

El estado de cada conector se consulta en `GET /api/crm/integrations/status` (gerente).

**Contrato REST esperado (modo http)** — `GET {BASE_URL}?from=YYYY-MM-DD&to=YYYY-MM-DD`:

```jsonc
{ "items": [ { "employeeCode": "MTX013", "cantidad": 640 } ] }
// el campo de cantidad puede llamarse cantidad | km | m2 | amount | value
```

Se mapea por **`employeeCode`** (código del empleado). Internamente, `syncSource` genera la
**lectura normalizada** para cada empleado/concepto de la fuente:

```js
// Contrato de una lectura
{
  employeeId,        // id interno del empleado (resuelto desde el identificador externo)
  conceptId,         // id del concepto variable de esa fuente
  cantidad,          // número: km | m² | monto base de ventas (según el concepto)
  externalId,        // string estable y único → idempotencia (upsert)
  reference          // texto para la bitácora / columna Nota
}
```

La plataforma se encarga del resto en `syncSource(source, periodId, actorName)`:

- calcula el importe con `computeVariableImporte(concept, cantidad, rate)` según el modo del
  concepto (`tarifa` = cantidad×tarifa, `porcentaje` = base×%/100, `importe` = directo);
- hace **upsert por `externalId`** en `variableEntries` (marca el origen: `g3`/`mes`/`aspel`);
- **no toca** las capturas manuales;
- queda disponible en *Percepciones variables* y en la **exportación NOI** del periodo.

> Idempotencia recomendada para `externalId`: `"{source}-{periodId}-{employeeId}-{conceptId}"`
> (o el identificador del documento externo: nº de ruta, orden MES, folio de factura).

### 2. G3 — kilometraje del conductor (fuente `g3`)

- **Qué se lee:** kilómetros recorridos por conductor dentro del rango del periodo.
- **Mapeo:** conductor de G3 → empleado. Recomendado: añadir a la ficha del empleado un
  campo `g3DriverId` (o reutilizar `checadorUserId`) y mapear por él.
- **Fuente de datos:** API REST de G3 (rutas/odómetro) o exportación CSV periódica.

```http
GET https://api.g3/fleet/mileage?from=2026-07-16&to=2026-07-31
Authorization: Bearer {G3_API_TOKEN}
→ [{ "driverId": "D-014", "km": 640.0, "tripId": "R-88121" }, ...]
```

Mapeo → lectura: `driverId`→`employeeId`, `km`→`cantidad`, `externalId = "g3-{periodId}-{tripId}"`.
Env sugeridas: `G3_API_URL`, `G3_API_TOKEN`.

### 3. MES — m² de costura en fabricación (fuente `mes`)

- **Qué se lee:** metros cuadrados producidos/cosidos por operador en el periodo (extra al
  estándar, según regla de negocio).
- **Mapeo:** operador MES → empleado (por `code` o un `mesOperatorId` dedicado).
- **Fuente de datos:** API MES o cierre de órdenes de producción.

```http
GET https://mes.mallatex/api/production?from=2026-07-16&to=2026-07-31&metric=m2_extra
Authorization: Bearer {MES_API_TOKEN}
→ [{ "operator": "MTX001", "orderId": "OP-5521", "m2": 45.0 }, ...]
```

Mapeo → lectura: `operator`→`employeeId`, `m2`→`cantidad`, `externalId = "mes-{periodId}-{orderId}"`.
Env sugeridas: `MES_API_URL`, `MES_API_TOKEN`.

### 4. Aspel — comisión al pagar facturas (fuente `aspel`)

- **Qué se lee:** la **base de comisión** del vendedor cuando **se cobra la factura**
  (no al emitirla). El concepto `comision_ventas` es de modo `porcentaje`: `cantidad` = base
  en $, y el importe = base × %.
- **Mapeo:** vendedor de la factura → empleado (por `code`/`noiKey` o un `aspelVendedorId`).
- **Momento del evento:** al registrarse el **pago** en Aspel **CxC/SAE**.

**Webhook YA CONSTRUIDO** — `POST /api/integrations/aspel/payment`
(`server/routes/integrations.js`). Sin sesión de usuario; se autentica con el header
`x-webhook-secret: {ASPEL_WEBHOOK_SECRET}` (obligatorio en producción). Al recibir el pago:
1. marca la factura como **`pagada`** (`paidAt`, `paymentRef`, `paidAmount`);
2. genera la **base de comisión** del vendedor como percepción variable del **periodo abierto**
   (concepto fuente `aspel`), **idempotente** por `externalId = "aspel-invoice-{id}"`.

```jsonc
// Payload aceptado (tolera varios nombres de campo)
{
  "invoiceId": 12,            // o "folio": "FAC-00012"  o  "uuid": "..."
  "amount": 92000.00,         // base de comisión (importe pagado)
  "paidAt": "2026-07-28",
  "paymentRef": "PAGO-8842"
}
// → { ok, invoice:{ status:"pagada" }, commission:{ status:"creada", base, importe, periodId } }
```

**Timbrado del CFDI (emisión):** `POST /api/crm/invoices/:id/emit` llama a
`aspelTimbrar()`; en `ASPEL_MODE=http` hace `POST {ASPEL_CFDI_URL}` y guarda el `uuid` real
del PAC (en `mock` genera un UUID CFDI determinista). El campo `timbreMode` registra el modo.
Reglas a definir con el cliente: comisión sobre **cobrado** vs facturado, pagos parciales,
notas de crédito.

---

## 5. Aspel NOI — exportación de nómina

**Punto de implementación:** `server/noi.js` (`buildMovements`, `toFile`).

La plataforma **no** envía registros crudos: consolida el periodo **revisado y autorizado**
y genera un archivo de interfaz mapeado a los **conceptos de Aspel NOI** del cliente. Layout
por defecto (delimitado por `|`, configurable):

```
CLAVE|CONCEPTO|TIPO|DESCRIPCION|UNIDAD|CANTIDAD|IMPORTE|REFERENCIA
MTX006|2103|P|Comisión sobre ventas|$ ventas|92000|2760|Ventas del periodo
```

- `CLAVE` = `noiKey` del empleado; `CONCEPTO` = número de concepto NOI (editable en la app).
- `TIPO` = `P` percepción, `D` deducción, `I` informativo.
- Ajusta el **layout exacto** (orden de columnas, separador, formato de fechas/importes) al
  de la instalación de Aspel NOI del cliente. Los números de concepto se configuran en
  *Periodos y NOI* y en *Percepciones variables*.

---

## Resumen: estado de cada integración

| Integración | Estado | Cómo se activa |
|-------------|--------|----------------|
| Hikvision (checador) | Driver simulado; `syncDevice()` en `server/checador.js` para la lectura ISAPI real | Sustituir la generación simulada por la consulta al equipo |
| G3 / MES (percepciones) | **Driver `mock`\|`http` construido** (`server/integrations.js`) | `*_MODE=http` + `*_BASE_URL`/`*_TOKEN` |
| Aspel — comisión al pago | **Webhook construido** `POST /api/integrations/aspel/payment` | `ASPEL_WEBHOOK_SECRET` |
| Aspel — timbrado CFDI | **Construido** en la emisión (`aspelTimbrar`) | `ASPEL_MODE=http` + `ASPEL_CFDI_URL`/`ASPEL_TOKEN` |
| Aspel NOI (nómina) | Layout en `server/noi.js` | Ajustar columnas/separador al del cliente |

Cálculo, idempotencia, revisión, autorización, cierre y exportación ya están construidos y
probados. Las fuentes externas quedan **listas para producción**: pasan de simulado a real
sólo con variables de entorno, sin tocar la lógica de negocio.
