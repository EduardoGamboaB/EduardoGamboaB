# Hospedar la plataforma en una red pública (URL de acceso)

Para obtener una **URL pública con HTTPS** hay que desplegar en una plataforma que tú
controles (con tu cuenta). HTTPS no es opcional: la **cámara del kiosco** sólo funciona en
`localhost` o sobre HTTPS. Abajo, la opción recomendada (Render) y alternativas.

---

## Opción recomendada — Render (gratis, HTTPS y PostgreSQL gestionados)

Resultado: una URL tipo `https://mallatex-asistencia.onrender.com`.

### A) Un clic con Blueprint

1. Copia [`render.yaml`](../render.yaml) a la **raíz** del repositorio y súbelo.
2. En <https://render.com> → **New +** → **Blueprint** → conecta tu cuenta de GitHub y
   selecciona el repo `eduardogamboab/eduardogamboab`.
3. Render lee `render.yaml` y crea **el servicio web + la base PostgreSQL** con las
   variables ya configuradas. Pulsa **Apply**.
4. Al terminar, abre la URL `https://…onrender.com`.

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

## Alternativas

- **Railway** (<https://railway.app>): "New Project" → *Deploy from GitHub* → Root Directory
  `mallatex-asistencia`; agrega un **PostgreSQL** y las mismas variables. Da URL HTTPS.
- **Fly.io** (<https://fly.io>): `fly launch` usando el `Dockerfile`; crea Postgres con
  `fly postgres create` y enlázalo (`DATABASE_URL`). URL HTTPS incluida.
- **VPS propio** (DigitalOcean/Linode/EC2): sigue [`DEPLOY.md`](../DEPLOY.md) con
  `docker compose` + nginx TLS y tu dominio.

Todas requieren **tu cuenta**; el código ya está listo (Docker, PostgreSQL conmutable,
health checks, HTTPS-aware). Si me dices cuál prefieres, dejo su configuración exacta.
