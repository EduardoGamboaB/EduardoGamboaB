# Hospedar la plataforma en una red pública (URL de acceso)

Para obtener una **URL pública con HTTPS** hay que desplegar en una plataforma que tú
controles (con tu cuenta). HTTPS no es opcional: la **cámara del kiosco** sólo funciona en
`localhost` o sobre HTTPS. Abajo, la opción recomendada (Render) y alternativas.

---

## Opción recomendada — Render (gratis, HTTPS y PostgreSQL gestionados)

Resultado: una URL tipo `https://mallatex-asistencia.onrender.com`.

### A) Un clic con Blueprint

El archivo `render.yaml` **ya está en la raíz del repositorio**, listo para auto-detección.

1. En <https://render.com> → **New +** → **Blueprint** → conecta tu cuenta de GitHub y
   selecciona el repo `eduardogamboab/eduardogamboab`.
2. Elige la rama **`claude/app-requisitos-3528w4`** (donde vive este trabajo). Si ya
   fusionaste el PR a tu rama por defecto, selecciónala y quita el campo `branch` del yaml.
3. Render lee `render.yaml` y crea **el servicio web + la base PostgreSQL** con las
   variables ya configuradas. Te pedirá el valor de `ASPEL_WEBHOOK_SECRET` (déjalo vacío o
   pon cualquier cadena; sólo se usa si conectas Aspel real). Pulsa **Apply**.
4. Al terminar (2-4 min), abre la URL `https://…onrender.com`.

**Cuentas para probar de inmediato** (con `SEED_DEMO=true`):
- Administrativos (correo + `mallatex2026`): `admin@`, `contabilidad@`, `nomina@`,
  `comercial@` `mallatex.mx` — cada uno ve su menú según su rol.
- Colaboradores (portal web y app móvil): código **MTX001**…**MTX013** + PIN **1234**.

**App móvil:** apúntala a esta URL pública desde su pantalla de acceso (o en
`mallatex-movil/src/config.js`). Para el binario nativo, ver `mallatex-movil/docs/build-nativo-eas.md`.

> Notas del plan Free de Render: el servicio **se duerme tras inactividad** (el primer acceso
> tarda ~30 s en “despertar”) y la base PostgreSQL free tiene vigencia limitada. Para una demo
> estable o producción, sube ambos a un plan de pago.

### B) Manual (sin mover el archivo)

1. En Render → **New +** → **PostgreSQL** → nombre `mallatex-db`, plan Free → **Create**.
   Copia su *Internal Connection String*.
2. **New +** → **Web Service** → conecta el repo y configura:
   - **Root Directory:** `mallatex-asistencia`
   - **Runtime:** Node
   - **Build Command:** `npm ci --omit=dev`
   - **Start Command:** `node server/index.js`
   - **Health Check Path:** `/api/health`
3. En **Environment**, agrega:
   | Clave | Valor |
   |-------|-------|
   | `NODE_ENV` | `production` |
   | `STORAGE` | `postgres` |
   | `DATABASE_URL` | *(el connection string de mallatex-db)* |
   | `TRUST_PROXY` | `1` |
   | `SEED_DEMO` | `true` *(datos demo para probar; `false` en producción real)* |
4. **Create Web Service**. En unos minutos tendrás la URL pública.

> **Nota:** el plan Free “duerme” tras inactividad (el primer acceso tarda ~30 s) y la base
> Free caduca a los ~30 días — perfecto para **pruebas/demo**. Para uso real, sube de plan y
> pon `SEED_DEMO=false` con `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`.

### Acceso (datos demo)

- **Admin:** `admin@mallatex.mx` / `mallatex2026` (también `contabilidad@` y `nomina@`).
- **Portal del empleado:** código `MTX001`, PIN `1234`.
- **Kiosco:** `/kiosk` (la cámara funciona porque Render sirve HTTPS).

---

## Railway (URL pública con HTTPS + PostgreSQL)

Resultado: una URL tipo `https://mallatex-asistencia.up.railway.app`.

> **Monorepo:** este repositorio contiene **dos proyectos** (`anaberries-leads` y
> `mallatex-asistencia`). El `railway.json`/`Dockerfile` de la **raíz** son de Anaberries,
> así que para desplegar Mallatex hay que fijar el **Root Directory = `mallatex-asistencia`**
> (ahí vive su propio `railway.json` + `Dockerfile`). Así Railway construye el proyecto correcto
> y no toca Anaberries.

1. En <https://railway.app> → **New Project** → **Deploy from GitHub repo** → autoriza y elige
   `eduardogamboab/eduardogamboab`.
2. En el servicio → **Settings** → **Source**: fija **Root Directory** = `mallatex-asistencia`
   y **Branch** = `main` (o `claude/app-requisitos-3528w4` antes de fusionar). Railway detecta
   `mallatex-asistencia/railway.json` → **build por Dockerfile** con healthcheck `/api/health`.
3. En el proyecto → **New** → **Database** → **Add PostgreSQL**.
4. En el servicio → **Variables** → agrega:
   - `STORAGE = postgres`
   - `DATABASE_URL = ${{Postgres.DATABASE_URL}}` (referencia a la base del paso 3)
   - `NODE_ENV = production` · `TRUST_PROXY = 1` · `ENABLE_HSTS = true` · `SESSION_TTL_HOURS = 12`
   - `SEED_DEMO = true` (para probar de inmediato con las cuentas demo)
   - *(opcional)* `ASPEL_WEBHOOK_SECRET`, y las de integración (`G3_MODE`, `MES_MODE`,
     `ASPEL_MODE`…) si vas a conectarlas de verdad (ver `docs/integraciones.md`).
5. Railway despliega y expone la URL en **Settings → Networking → Generate Domain**.

**Vía CLI** (equivalente): `npm i -g @railway/cli` → `railway login` → dentro de
`mallatex-asistencia/`: `railway init` → `railway add` (PostgreSQL) → define las variables →
`railway up`.

Cuentas demo y cómo apuntar la app móvil: iguales que en la sección de Render (arriba).

## Otras alternativas

- **Fly.io** (<https://fly.io>): `fly launch` usando el `Dockerfile`; crea Postgres con
  `fly postgres create` y enlázalo (`DATABASE_URL`). URL HTTPS incluida.
- **VPS propio** (DigitalOcean/Linode/EC2): sigue [`DEPLOY.md`](../DEPLOY.md) con
  `docker compose` + nginx TLS y tu dominio.

Todas requieren **tu cuenta**; el código ya está listo (Docker, PostgreSQL conmutable,
health checks, HTTPS-aware). Si me dices cuál prefieres, dejo su configuración exacta.
