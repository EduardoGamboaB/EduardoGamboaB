# Anaberries · Captura de Leads — Mallatex

Aplicación web para el **evento de Anaberries**. Permite capturar leads en el
stand, realizar un **sorteo** de premios entre los asistentes y dar
**seguimiento** desde un dashboard.

## Acceso y usuarios

La plataforma del personal está **protegida con login** (correo + contraseña).
**Solo la captura pública de leads** (`/registro`, `/terminos`, `/aviso-privacidad`
y el QR) es accesible sin sesión. El resto —captura del staff, sorteo, dashboard,
administración de eventos y usuarios— requiere iniciar sesión.

- El **administrador inicial** se crea al primer arranque con `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`.
- Desde **👥 Usuarios** (solo admin) se crean, editan, activan/desactivan y
  eliminan cuentas (roles: administrador o staff).
- Las sesiones usan tokens firmados; define `AUTH_SECRET` en producción para que
  sobrevivan a los redeploys.

## Funcionalidades

- **📱 Autoregistro por QR (landing pública)** — el visitante escanea el código
  QR del stand, abre la landing `/registro` (mobile-first) y se registra solo:
  nombre, empresa, celular y correo **válidos** (con disclaimer de que por ese
  medio se contacta al ganador), producto de interés y aceptación de
  **Términos y Condiciones** y **Aviso de Privacidad**. Página `/qr` imprimible
  para el stand. Si un visitante **no puede escanear**, el personal lo registra
  desde la app (captura manual o por foto del gafete).
- **📝 Captura de leads** (personal) — dos modos:
  - **Manual**: formulario rápido (nombre, empresa, contacto, producto de
    interés, volumen, notas, consentimiento).
  - **Foto del gafete (OCR)**: toma o sube una foto del gafete y los datos del
    lead (nombre, empresa, correo, teléfono) se **extraen automáticamente** con
    OCR en el navegador (Tesseract.js, funciona sin internet). El texto leído se
    guarda en Notas para verificación y la foto queda adjunta al lead.

  Detecta duplicados por correo o teléfono y recuerda quién captura.
- **🎁 Sorteo** — selecciona un ganador al azar entre los leads capturados, con
  animación. Opciones para exigir consentimiento y evitar ganadores repetidos.
  Historial de ganadores y posibilidad de anular un sorteo.
- **📊 Dashboard** — KPIs (totales, del día, consentimiento, ganadores),
  gráficas por producto/fuente/hora/captador, tabla con búsqueda y filtros, y
  **exportación a CSV**.
- **⚙️ Administrar eventos (múltiples)** — crea y configura **varios eventos**;
  cada uno con su **código QR propio** (`/qr?e=<id>`), premio, imagen, dinámica,
  fecha/hora y sede. Al guardar, los **Términos y Condiciones** y la landing de
  **ese evento** se actualizan dinámicamente. Incluye un interruptor por evento:
  **¿permitir que ganadores de otros eventos participen en este?**. La captura,
  el sorteo y el QR usan el **evento activo** por defecto.
- **🏆 Folio del ganador por correo** — al sortear se genera un **folio**
  (`ANB-XXXXXX`) que el ganador debe presentar. Si se configura **SMTP**, se le
  **envía por correo** automáticamente (con opción de reenviar); si no, el folio
  queda registrado para entregarlo a mano.

## Requisitos

- Node.js 20 o superior.

## Instalación y ejecución

```bash
cd anaberries-leads
npm install
npm start
```

Abre `http://localhost:4000`.

## Pruebas

```bash
npm test    # 37 pruebas de API (captura, autoregistro, sorteo, dashboard, evento, seguridad)
npm run e2e # prueba end-to-end de la jornada completa en un navegador real (Playwright)
```

La prueba E2E recorre: autoregistro por QR → administración del evento → Términos
y Condiciones dinámicos → landing con premio → captura del staff → sorteo →
dashboard → exportación CSV. Si no hay Chromium disponible, la prueba se omite en
vez de fallar.

## Configuración (variables de entorno)

Copia `.env.example` y ajústalo, o expórtalas antes de arrancar:

| Variable    | Descripción                                                        | Default |
|-------------|--------------------------------------------------------------------|---------|
| `PORT`      | Puerto del servidor                                                | `4000`  |
| `STAFF_PIN` | PIN para acceder a **Sorteo** y **Dashboard**. Vacío = acceso abierto | vacío |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL. **Si se define, la app usa Postgres** (datos durables, sin volumen). Si se omite, usa archivo JSON. | vacío |
| `DATA_DIR`  | Carpeta de datos en modo archivo (JSON + imágenes)                 | `./data`|
| `NODE_ENV`  | `production` activa cacheo de estáticos                             | dev     |

La **captura de leads es pública** (pensada para el stand/kiosco). El sorteo y
el dashboard quedan tras el `STAFF_PIN` cuando se configura.

Ejemplo:

```bash
STAFF_PIN=2026 PORT=8080 npm start
```

## Producción

La app está lista para publicarse con URL pública y HTTPS. Incluye `Dockerfile`,
`render.yaml` (Blueprint de Render) y `.dockerignore`. Consulta la guía completa
en **[DEPLOY.md](DEPLOY.md)** (checklist, variables de entorno, disco persistente
y proxy TLS). Puntos clave:

- **HTTPS obligatorio** en producción: lo requieren la cámara del gafete y el
  escaneo del QR desde teléfonos.
- Define **`STAFF_PIN`** y monta un **volumen persistente** en `DATA_DIR`.
- Corre en **una sola instancia** (almacén en archivo). Respalda `DATA_DIR`.

## Foto del gafete (OCR)

- El OCR corre **100% en el navegador** con Tesseract.js. Los archivos (motor,
  núcleo WASM y modelos `spa`+`eng`) están vendorizados en
  `public/vendor/tesseract/`, por lo que **no requiere internet** durante el
  evento.
- La **cámara** requiere un *contexto seguro*: funciona en `http://localhost` o
  bajo **HTTPS**. En una red del evento por IP, publica la app con HTTPS o usa
  el botón **«Subir imagen»** como alternativa.
- La foto del gafete se guarda en disco en `data/badges/<id>.jpg` (no dentro del
  JSON) y se consulta desde el dashboard con el ícono 📷.
- El OCR es una ayuda: siempre se muestran los campos para **revisar y
  corregir** antes de guardar.

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
| GET    | `/registro` · `/qr` · `/terminos` · `/aviso-privacidad` | público | Landing de autoregistro, QR y legales |
| POST   | `/api/leads/registro`    | público  | Autoregistro del visitante (valida correo y celular; exige consentimientos; anti-spam) |
| POST   | `/api/leads`             | público  | Registrar lead (con `foto` y `metodoCaptura` opcionales) |
| GET    | `/api/leads/:id/badge`   | personal | Foto del gafete del lead       |
| GET    | `/api/leads`             | personal | Listado con búsqueda/filtros   |
| GET    | `/api/leads/export.csv`  | personal | Exportar CSV                   |
| DELETE | `/api/leads/:id`         | personal | Eliminar lead                  |
| GET    | `/api/raffle/eligible`   | personal | Participantes elegibles        |
| POST   | `/api/raffle/draw`       | personal | Ejecutar sorteo                |
| GET    | `/api/raffle/winners`    | personal | Historial de ganadores         |
| DELETE | `/api/raffle/winners/:id`| personal | Anular sorteo                  |
| GET    | `/api/stats`             | personal | Métricas del dashboard         |
| GET    | `/api/event/public`      | público  | Config del evento (landing y términos) |
| GET    | `/api/event/premio-imagen` | público | Imagen del premio               |
| GET · PUT | `/api/event`          | personal | Ver / actualizar la configuración del evento |

_powered by Mallatex_
