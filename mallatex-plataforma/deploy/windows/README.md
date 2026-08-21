# Instalación en Windows Server (Ruta B · nativa con PM2)

Scripts de PowerShell que automatizan la instalación y actualización de la
Plataforma Mallatex **sin Docker** (los procesos corren con PM2). Complementan
el manual PDF *Instalación en Windows Server*.

> Ejecuta siempre en **PowerShell como Administrador**. Requisitos previos que
> los scripts **no** instalan (pero sí validan): Node.js 20 LTS, npm, Git y
> PostgreSQL 16.

## `install.ps1` — instalación completa

Valida prerrequisitos → (opcional) crea la base → instala dependencias
(backend + web) → migraciones + seed → compila la web → genera
`ecosystem.config.js` → arranca los 8 procesos con PM2 y verifica el gateway.

```powershell
cd C:\mallatex\mallatex-plataforma\deploy\windows

.\install.ps1 `
  -DbPassword 'Clave#Fuerte' `
  -PublicApiBase 'https://mallatex.tuempresa.com' `
  -CorsOrigins 'https://mallatex.tuempresa.com' `
  -CreateDatabase
```

Parámetros principales:

| Parámetro | Por defecto | Uso |
|---|---|---|
| `-DbPassword` | *(obligatorio)* | Contraseña del usuario `mallatex` en PostgreSQL. |
| `-PublicApiBase` | `http://localhost:3000` | URL del gateway **que verá el navegador** (se hornea en la web). |
| `-CorsOrigins` | `*` | Orígenes CORS exactos en producción (tu dominio). |
| `-JwtSecret` | *(se genera)* | Secreto JWT ≥24; si se omite, se crea uno aleatorio. |
| `-CreateDatabase` | *(off)* | Crea la base y el usuario (pide superusuario `postgres`). |
| `-ProjectRoot` | raíz del repo | Ruta del proyecto si el script no está en `deploy\windows`. |

Al terminar deja `ecosystem.config.js` en la raíz del proyecto **con secretos** —
protégelo y no lo subas a git (ya está en `.gitignore`).

### Autostart al reiniciar el servidor
PM2 no trae servicio nativo de Windows. Tras `install.ps1`:

1. Instala [`pm2-installer`](https://github.com/jessety/pm2-installer) (registra
   PM2 como servicio de Windows vía NSSM): en su carpeta, `npm run configure`,
   `npm run configure-policy`, `npm run setup`.
2. Vuelve a guardar la lista: `pm2 save`.

Alternativa: un servicio **NSSM** que ejecute `pm2 resurrect` al inicio.

## `update.ps1` — actualización sin perder datos

`git pull` → dependencias → **migraciones incrementales** (`db:migrate up`,
nunca `reset`) → build de la web → `pm2 reload` sin downtime. Hace un
`pg_dump` de respaldo en `C:\backups` antes de tocar nada y reutiliza
`DATABASE_URL` y la URL pública desde `ecosystem.config.js`.

```powershell
cd C:\mallatex\mallatex-plataforma\deploy\windows
.\update.ps1                 # rama actual, recompila web
.\update.ps1 -SkipWebBuild   # sólo cambió el backend
.\update.ps1 -Branch main
```

## Después de instalar (obligatorio en producción)

- Cambia las contraseñas demo (`mallatex2026`) y el PIN `1234`.
- Publica por HTTPS con un proxy inverso (IIS ARR / Caddy): `/api` → `3000`,
  resto → `3100`.
- Deja accesibles al exterior sólo `443` (o `3000`/`3100`); `3001–3006` en
  `localhost`.

## Comandos útiles

```powershell
pm2 status
pm2 logs                # todos
pm2 logs gateway        # uno
pm2 restart all
curl http://localhost:3000/api/health
```
