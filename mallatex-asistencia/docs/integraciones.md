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

Las tres fuentes externas (G3, MES, Aspel) comparten **un mismo contrato**. El único punto
a implementar es la lectura real; el resto (cálculo del importe, *upsert*, bitácora,
exportación a NOI) ya está construido.

**Punto de implementación:** `server/connectors.js` → función `simulatedReadings(source, period, concepts)`.
Sustitúyela por `readings(source, period, concepts)` con la llamada real. Debe devolver un
arreglo de **lecturas normalizadas**:

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
- **Momento del evento:** al registrarse el **pago** en Aspel **CxC/SAE**. Dos opciones:
  1. **Webhook / proceso** que notifica el pago (recomendado): la plataforma expone un
     endpoint que recibe el folio pagado y acumula la base al periodo vigente.
  2. **Consulta programada** a la BD/API de Aspel de las facturas pagadas en el rango.

```jsonc
// Ejemplo de payload de "factura pagada" (webhook Aspel → plataforma)
{
  "folio": "A-10432",
  "vendedor": "MTX006",
  "fechaPago": "2026-07-28",
  "importePagado": 92000.00,
  "moneda": "MXN"
}
```

Mapeo → lectura: `vendedor`→`employeeId`, `importePagado`→`cantidad` (base),
`externalId = "aspel-{folio}"` (por factura, no por periodo → una factura cuenta una sola
vez aunque se re-sincronice). El periodo destino se determina por `fechaPago`.
Reglas a definir con el cliente: comisión sobre **cobrado** vs facturado, pagos parciales,
notas de crédito. Env sugeridas: `ASPEL_API_URL`, `ASPEL_API_TOKEN` o cadena de conexión a
la BD de Aspel; secreto de verificación del webhook `ASPEL_WEBHOOK_SECRET`.

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

## Resumen: qué implementar

| Integración | Función a implementar | Devuelve |
|-------------|-----------------------|----------|
| Hikvision | `syncDevice()` en `server/checador.js` | Inserta `checadas` + `reprocess()` |
| G3 / MES / Aspel | `readings(source, period, concepts)` en `server/connectors.js` | Lecturas `{employeeId, conceptId, cantidad, externalId, reference}` |
| Aspel NOI | Layout en `server/noi.js` | Archivo de interfaz `.txt`/`.csv` |

Todo lo demás —cálculo, idempotencia, revisión, autorización, cierre y exportación— ya está
construido y probado.
