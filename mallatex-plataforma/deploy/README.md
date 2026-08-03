# Despliegue — Plataforma Mallatex

## Imágenes

- `deploy/Dockerfile.backend` — imagen única del backend. El servicio se elige
  con el comando de arranque:
  `npm run start:gateway | start:identity | start:attendance | start:crm | start:mes | start:leads | start:marketing`.
- `deploy/Dockerfile.frontend` — build de producción del frontend Next.js
  (contexto `./frontend`).

## Local (Docker Compose)

```bash
cp .env.example .env
docker compose up --build
```

Levanta PostgreSQL, ejecuta migraciones + seed (servicio `migrate`), y arranca
los 6 microservicios, el gateway (`:3000`) y la web (`:3100`).

## Render (blueprint)

`render.yaml` en la raíz define la base de datos, los 6 microservicios, el
gateway y la web. Conectar el repo en Render → *New Blueprint*. El `JWT_SECRET`
se genera en `identity` y se comparte al resto.

> Ejecutar una vez las migraciones/seed contra la base creada:
> `DATABASE_URL=... node database/migrate.js up && node database/seed.js`
> (o añadir un *Job* de Render que lo haga en el primer deploy).

## Railway

`railway.json` despliega el gateway por defecto. Para cada microservicio, crear
un servicio Railway apuntando al mismo repo y fijar `startCommand`
(`npm run start:<servicio>`) + `DATABASE_URL` del plugin PostgreSQL. Definir las
`*_URL` internas del gateway con los dominios privados de Railway.

## Variables mínimas de producción

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Cadena PostgreSQL (todos los servicios) |
| `DATABASE_SSL=true` | TLS a la base gestionada |
| `JWT_SECRET` | Firma de tokens (igual en todos los servicios) |
| `IDENTITY_URL … MARKETING_URL` | Ruteo interno del gateway |
| `NEXT_PUBLIC_API_BASE` | URL pública del gateway (frontend) |
| `TRUST_PROXY=true` | Detrás de balanceador |
| `S3_MODE`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` | S3/R2 opcional para videos del banco de marketing (`S3_MODE=s3` + `POST /api/mkt/assets/sync-s3` migra los pendientes) |

Ver checklist completo en [`go-live.md`](go-live.md).
