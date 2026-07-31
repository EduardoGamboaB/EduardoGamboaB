# Mallatex — CRM móvil de ventas (arquitectura y hoja de ruta)

La app móvil evoluciona de "asistencia de campo" a un **CRM móvil avanzado para el squad de
vendedores**: cartera asignada desde central, rutas de visita con GPS y evidencia,
cotizador/pedidos, inventario, objetivos de venta, asistente técnico y esquema
administrativo (viáticos, gastos, facturas). Todo con **modo offline**.

## Roles y flujo web ↔ móvil

- **Gerente comercial (app web):** administra el catálogo de clientes/prospectos, **asigna
  cartera** a cada vendedor, define **objetivos de venta por trimestre** y consulta el
  seguimiento y los recorridos.
- **Vendedor (app móvil):** trabaja su cartera, **inicia ruta** (registro de recorrido por
  GPS), **marca visitas** con evidencia (fotos), estatus (localizado / no localizado /
  reagendado) y tipo de visita; consulta inventario, **cotiza y levanta pedidos**, ve su
  **desempeño vs. objetivo**, usa el **asistente técnico** y gestiona sus **viáticos/gastos/
  facturas**.

## Módulos y estado

| Módulo | Descripción | Fase |
|--------|-------------|------|
| **Autenticación y perfil** | Login (código+PIN), biometría, gestión de perfil. | ✅ 1 |
| **Cartera de clientes/prospectos** | Clientes asignados desde central; alta de prospectos. | ✅ 1 |
| **Ruta de visitas + GPS** | Iniciar ruta, registrar recorrido, marcar visitas. | ✅ 1 |
| **Visita con evidencia** | Estatus (localizado/no/reagendado), tipo, fotos, notas, geo. | ✅ 1 |
| **Objetivos y desempeño** | Meta trimestral y avance del vendedor. | ✅ 1 |
| **Offline** | Cola local + sincronización (visitas, recorrido). | ✅ 1 |
| **Inventario** | Consulta de existencias por producto/almacén. | ✅ 2 |
| **Cotizador** | Arma cotización con productos, precios y descuentos. | ✅ 2 |
| **Pedidos** | Levanta pedido desde la cotización; seguimiento de estatus. | ✅ 2 |
| **Asistente técnico (bot)** | Recomienda malla por cultivo, clima, terreno, etc. | ✅ 3 |
| **Viáticos** | Solicitud de viáticos; el gerente aprueba/rechaza desde la web. | ✅ 3 |
| **Gastos** | Comprobación de gastos con foto del ticket; revisión y aprobación web. | ✅ 3 |
| **Facturas** | Solicitud desde pedido/manual; emisión de CFDI (integración Aspel) desde la web. | ✅ 3 |

## Modelo de datos (CRM)

```jsonc
// clients  (cartera; se asigna desde la web)
{ "id", "name", "type": "cliente|prospecto", "stage": "prospecto|negociacion|cliente",
  "contactName", "phone", "email", "address", "lat", "lng",
  "cultivo", "assignedTo" /* employeeId del vendedor */, "notes", "active" }

// visits  (una visita marcada en campo)
{ "id", "employeeId", "clientId", "routeId", "timestamp", "lat", "lng",
  "found": true, "status": "realizada|no_localizado|reagendada",
  "type": "prospeccion|seguimiento|cierre|cobranza|entrega|postventa",
  "notes", "photos": ["dataURL"], "offline" }

// routes  (recorrido del día)
{ "id", "employeeId", "date", "status": "en_curso|finalizada",
  "startedAt", "endedAt", "track": [{ "lat","lng","ts" }], "plannedClientIds": [] }

// salesObjectives  (meta por periodo)
{ "id", "employeeId", "period": "Q3-2026", "targetAmount", "achievedAmount" }

// (fase 2) products/inventory, quotes, orders   ·   (fase 3) expenses, perDiem, invoices
```

## API (resumen)

- **Web / gerente (admin):** `/api/crm/clients` (CRUD + asignación), `/api/crm/objectives`,
  `/api/crm/expense-requests/:id/decision` (aprobar viáticos),
  `/api/crm/expenses/:id/decision` + `/photo` (revisar gastos),
  `/api/crm/invoices/:id/emit|cancel` (emisión CFDI · Aspel).
- **Móvil / vendedor (sesión de empleado):**
  `/api/sales/my-clients`, `/api/sales/clients` (alta de prospecto),
  `/api/sales/visits` (registrar), `/api/sales/routes/start|:id/track|:id/end`,
  `/api/sales/objectives/me`, `/api/sales/products|quotes|orders`, `/api/sales/advisor`,
  `/api/sales/expense-requests`, `/api/sales/expenses`, `/api/sales/invoices`.

## Notas

- Reutiliza la base ya construida: autenticación de empleado, cámara, GPS/geocerca, cola
  offline, motor de datos conmutable (archivo/PostgreSQL) y el mismo backend.
- Las integraciones de inventario/pedidos/facturas se conectan al ERP (Aspel SAE/NOI) siguiendo
  el patrón de `docs/integraciones.md`.
