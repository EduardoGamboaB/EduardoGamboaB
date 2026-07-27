# Despliegue en producción — Anaberries · Captura de Leads

Guía para publicar la plataforma con URL pública y HTTPS (necesario para que la
cámara de los teléfonos funcione y para que el QR sea escaneable desde cualquier
dispositivo).

## Componentes publicados

| Ruta | Público | Descripción |
|------|---------|-------------|
| `/registro` | ✅ visitantes | Landing de autoregistro (destino del QR) |
| `/qr` | organizador | Código QR imprimible que apunta a `/registro` |
| `/terminos`, `/aviso-privacidad` | ✅ | Legales enlazados desde la landing |
| `/` | personal | App de captura / sorteo / dashboard (PIN) |

## Antes de publicar (checklist)

- [ ] Definir `STAFF_PIN` (protege Sorteo y Dashboard). **No** dejarlo vacío en producción.
- [ ] Completar los textos legales: `public/terminos.html` y
      `public/aviso-privacidad.html` (razón social, domicilio, premio, correo ARCO, fechas).
- [ ] Confirmar el nombre del evento en `data/db.json` → `event.name` (o dejar el valor por defecto).
- [ ] Asegurar **HTTPS** y un **volumen/disco persistente** montado en `DATA_DIR` (`/data`).
- [ ] Verificar el QR abriendo `/qr` en el dominio final y escaneándolo con un teléfono.

## Variables de entorno

| Variable | Descripción | Recomendado en prod |
|----------|-------------|---------------------|
| `PORT` | Puerto | `4000` (o el que asigne el host) |
| `STAFF_PIN` | PIN de Sorteo/Dashboard | **obligatorio** |
| `DATA_DIR` | Carpeta de datos persistente | `/data` (volumen) |
| `NODE_ENV` | Entorno | `production` |
| `TRUST_PROXY` | Nº de proxies de confianza | `1` (detrás de nginx/Render) |
| `REGISTRO_RATE_MAX` / `REGISTRO_RATE_WINDOW_MS` | Límite anti-spam del autoregistro | `60` / `60000` |

## Opción A — Render (Blueprint, 1 clic)

El repo incluye `anaberries-leads/render.yaml`. En Render: **New + → Blueprint →**
selecciona el repositorio. Crea el servicio web con disco persistente en `/data` y
HTTPS automático. Captura `STAFF_PIN` cuando lo pida (está marcado como secreto).

## Opción B — Docker

```bash
cd anaberries-leads
docker build -t anaberries-leads .
docker run -d --name anaberries \
  -p 4000:4000 \
  -e STAFF_PIN=TU_PIN \
  -e NODE_ENV=production \
  -e TRUST_PROXY=1 \
  -v anaberries-data:/data \
  anaberries-leads
```

Publica detrás de un proxy con TLS (nginx, Caddy, Cloudflare, etc.). Ejemplo mínimo
de nginx como *reverse proxy* con HTTPS:

```nginx
server {
  listen 443 ssl;
  server_name registro.tudominio.mx;
  # ssl_certificate / ssl_certificate_key ...
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Opción C — Node directo (VPS)

```bash
cd anaberries-leads
npm ci --omit=dev
STAFF_PIN=TU_PIN NODE_ENV=production TRUST_PROXY=1 DATA_DIR=/var/anaberries node server/index.js
```

Usa un supervisor (systemd, pm2) para reinicios automáticos y coloca TLS delante.

## Datos y respaldo

- Todo se guarda en `DATA_DIR`: `db.json` (leads, sorteos) y `badges/` (fotos de gafetes).
- Respalda `DATA_DIR` durante y después del evento; también puedes exportar CSV
  desde el Dashboard.
- La app corre en **una sola instancia** (almacén en archivo). No escalar a múltiples réplicas.

## Salud

- `GET /api/health` → `{ ok: true }` para health checks del orquestador.
