# Guía de despliegue a producción

Mallatex · Plataforma de Asistencia (NOI) — *powered by Evorgyn*

Esta guía deja la plataforma corriendo en producción de forma segura. La aplicación es
un servicio **Node.js (Express)** que sirve la API y el frontend, con persistencia en
**archivo JSON** sobre un volumen. Está pensada para ejecutarse **detrás de un
reverse-proxy con TLS** (la cámara del kiosco exige HTTPS).

---

## 1. Requisitos

- **Node.js ≥ 20** (o Docker).
- Un dominio con **certificado TLS** (Let's Encrypt u otro).
- Un **volumen persistente** para el directorio de datos (`DATA_DIR`).

## 2. Configuración

Toda la configuración es por variables de entorno (ver [`.env.example`](.env.example)).
Copia y ajusta:

```bash
cp .env.example .env
# edita .env: contraseña del admin, dominio, TLS, etc.
```

Claves importantes:

| Variable | Para qué |
|----------|----------|
| `NODE_ENV=production` | Activa el modo producción (errores sin detalle, HSTS, caché estática). |
| `SEED_DEMO=false` | **Obligatorio en producción**: no carga los 13 empleados demo. |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | Crea el **primer administrador** si la base está vacía. Usa una contraseña larga. |
| `DATA_DIR` | Ruta del volumen persistente (p. ej. `/data`). |
| `TRUST_PROXY=1` | Necesario detrás de un proxy TLS (IP real y esquema https). |
| `SESSION_TTL_HOURS` | Caducidad de sesión (TTL deslizante). |
| `LOGIN_RATE_MAX` / `LOGIN_RATE_WINDOW_MIN` | Límite de intentos de acceso (anti fuerza bruta). |

## 2.1 Persistencia: PostgreSQL (recomendado) o archivo

La capa de datos es **conmutable** (`server/db.js`) sin cambiar la lógica de negocio:

| `STORAGE` | Cuándo | Notas |
|-----------|--------|-------|
| `postgres` | **Producción** | Durable y apto para varias réplicas. Un `pg_advisory_lock` garantiza un único escritor. Configura `DATABASE_URL`. |
| `file` | Desarrollo / una sola instancia | Archivo JSON en `DATA_DIR`, con respaldos rotados y candado de instancia única. |

En modo PostgreSQL la aplicación mantiene el estado en memoria y **escribe cada cambio en
PostgreSQL** (por fila, en orden, vaciando la cola en el mismo ciclo de evento y en el
apagado ordenado). El `docker-compose.yml` ya incluye el servicio `db` (PostgreSQL 16).

**Migrar de archivo a PostgreSQL** (una sola vez, con la app detenida):

```bash
DATABASE_URL=postgres://usuario:clave@host:5432/mallatex npm run migrate:pg
# copia todo db.json a PostgreSQL; luego arranca con STORAGE=postgres
```

## 3. Despliegue con Docker (recomendado)

Con [`docker-compose.yml`](docker-compose.yml) se levantan **PostgreSQL**, la app y un
proxy nginx TLS:

```bash
# 1) Certificados en deploy/certs/ (fullchain.pem, privkey.pem)
mkdir -p deploy/certs
#    copia tus certificados ahí (o usa certbot)

# 2) Ajusta el dominio en deploy/nginx.conf y las variables en .env

# 3) Construye y arranca
docker compose up -d --build

# 4) Verifica
curl -fsS https://asistencia.mallatex.mx/api/health
docker compose logs -f app
```

La app queda en la red interna; sólo el proxy expone 80/443. Los datos viven en el
volumen `mallatex-data` (`/data`), con respaldos rotados en `/data/backups`.

## 4. Despliegue sin Docker (systemd)

```bash
npm ci --omit=dev
# como servicio: /etc/systemd/system/mallatex.service
```

```ini
[Unit]
Description=Mallatex Asistencia
After=network.target

[Service]
Type=simple
User=mallatex
WorkingDirectory=/opt/mallatex-asistencia
EnvironmentFile=/opt/mallatex-asistencia/.env
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now mallatex
```

Coloca **nginx/traefik** delante para TLS (reenvía a `http://127.0.0.1:3000` con
`X-Forwarded-Proto`). Ejemplo de nginx en [`deploy/nginx.conf`](deploy/nginx.conf).

## 5. Primer acceso

Al arrancar con la base vacía y `SEED_DEMO=false`, se crean los **catálogos base**
(conceptos NOI y de percepciones variables) y el **administrador** de `BOOTSTRAP_ADMIN_*`.
Inicia sesión, **cambia la contraseña**, y da de alta horarios, checador y empleados.

## 6. Seguridad aplicada

- Contraseñas con **scrypt** (sal por usuario); PIN del portal cifrado.
- **Sesiones con caducidad** (TTL deslizante) y limpieza periódica.
- **Límite de intentos de acceso** por IP + identificador (anti fuerza bruta).
- **Cabeceras de seguridad**: CSP (con nonce para el kiosco), HSTS, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (cámara sólo en el sitio).
- **CORS** restringido (configurable) y `x-powered-by` desactivado.
- Errores 5xx **sin filtrar detalles** en producción.

## 7. Operación

- **Respaldos**: automáticos al arrancar (rotación `BACKUP_KEEP`). Manual:
  `npm run backup`. Programa además una copia del volumen `/data` fuera del servidor.
- **Salud**: `GET /api/health` (vivo) y `GET /api/ready` (listo) para el balanceador.
- **Apagado ordenado**: `SIGTERM`/`SIGINT` cierran conexiones y persisten datos.
- **Actualizar**: `git pull && docker compose up -d --build` (o `npm ci --omit=dev &&
  systemctl restart mallatex`). Los datos persisten en el volumen.

## 8. Consideraciones y límites conocidos

- **Persistencia.** En producción usa `STORAGE=postgres` (ver §2.1): durable y con
  bloqueo de escritor único vía `pg_advisory_lock`. El modo `file` es válido para una sola
  instancia (candado `db.lock`). Las **sesiones** siguen en memoria de cada proceso; para
  varias réplicas de la app conviene moverlas a un almacén compartido (Redis/JWT).
- **Integraciones simuladas.** La descarga del checador **Hikvision** (`server/checador.js`)
  y las fuentes de **percepciones variables** —G3, MES, Aspel— (`server/connectors.js`)
  están simuladas. En producción se reemplazan por las APIs reales; el **contrato exacto**
  (payloads, mapeos y puntos de implementación) está en
  [`docs/integraciones.md`](docs/integraciones.md).
- **Exportación NOI.** Ajusta el layout de la interfaz al de la instalación de Aspel NOI
  del cliente (`server/noi.js`).
