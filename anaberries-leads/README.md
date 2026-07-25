# Anaberries · Captura de Leads — Mallatex

Aplicación web para el **evento de Anaberries**. Permite capturar leads en el
stand, realizar un **sorteo** de premios entre los asistentes y dar
**seguimiento** desde un dashboard.

## Funcionalidades

- **📝 Captura de leads** — formulario rápido (nombre, empresa, contacto,
  producto de interés, volumen, notas, consentimiento). Detecta duplicados por
  correo o teléfono y recuerda quién captura.
- **🎁 Sorteo** — selecciona un ganador al azar entre los leads capturados, con
  animación. Opciones para exigir consentimiento y evitar ganadores repetidos.
  Historial de ganadores y posibilidad de anular un sorteo.
- **📊 Dashboard** — KPIs (totales, del día, consentimiento, ganadores),
  gráficas por producto/fuente/hora/captador, tabla con búsqueda y filtros, y
  **exportación a CSV**.

## Requisitos

- Node.js 20 o superior.

## Instalación y ejecución

```bash
cd anaberries-leads
npm install
npm start
```

Abre `http://localhost:4000`.

## Configuración (variables de entorno)

Copia `.env.example` y ajústalo, o expórtalas antes de arrancar:

| Variable    | Descripción                                                        | Default |
|-------------|--------------------------------------------------------------------|---------|
| `PORT`      | Puerto del servidor                                                | `4000`  |
| `STAFF_PIN` | PIN para acceder a **Sorteo** y **Dashboard**. Vacío = acceso abierto | vacío |
| `DATA_DIR`  | Carpeta de datos (JSON)                                             | `./data`|
| `NODE_ENV`  | `production` activa cacheo de estáticos                             | dev     |

La **captura de leads es pública** (pensada para el stand/kiosco). El sorteo y
el dashboard quedan tras el `STAFF_PIN` cuando se configura.

Ejemplo:

```bash
STAFF_PIN=2026 PORT=8080 npm start
```

## Datos

Se guardan en `data/db.json` (escritura atómica, sin base de datos externa).
Respalda ese archivo para conservar los leads del evento. Desde el dashboard se
puede exportar todo a CSV.

## Arquitectura

- **Backend**: Node.js + Express (ESM), sin base de datos (almacén JSON).
  - `server/index.js` — arranque y montaje de rutas.
  - `server/routes/leads.js` — captura, listado, exportación.
  - `server/routes/raffle.js` — sorteo y ganadores.
  - `server/routes/stats.js` — métricas del dashboard.
  - `server/auth.js` — acceso del personal por PIN.
  - `server/store.js` — persistencia en `db.json`.
- **Frontend**: SPA de una sola página en `public/` (HTML + CSS + JS vanilla),
  con identidad visual Mallatex.

## API (resumen)

| Método | Ruta                     | Acceso   | Descripción                    |
|--------|--------------------------|----------|--------------------------------|
| GET    | `/api/access`            | público  | Estado del acceso (PIN)        |
| GET    | `/api/leads/meta`        | público  | Catálogos del formulario       |
| POST   | `/api/leads`             | público  | Registrar lead                 |
| GET    | `/api/leads`             | personal | Listado con búsqueda/filtros   |
| GET    | `/api/leads/export.csv`  | personal | Exportar CSV                   |
| DELETE | `/api/leads/:id`         | personal | Eliminar lead                  |
| GET    | `/api/raffle/eligible`   | personal | Participantes elegibles        |
| POST   | `/api/raffle/draw`       | personal | Ejecutar sorteo                |
| GET    | `/api/raffle/winners`    | personal | Historial de ganadores         |
| DELETE | `/api/raffle/winners/:id`| personal | Anular sorteo                  |
| GET    | `/api/stats`             | personal | Métricas del dashboard         |

_powered by Mallatex_
