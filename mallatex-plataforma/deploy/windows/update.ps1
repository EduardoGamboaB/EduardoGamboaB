#Requires -Version 5.1
<#
.SYNOPSIS
  Actualiza la Plataforma Mallatex ya instalada (Ruta B / PM2) SIN perder datos.

.DESCRIPTION
  git pull -> dependencias -> migraciones incrementales (nunca reset) -> build de
  la web -> recarga de PM2 sin downtime. Reutiliza DATABASE_URL y la URL pública
  de la web desde ecosystem.config.js (generado por install.ps1).

.EXAMPLE
  .\update.ps1
  .\update.ps1 -Branch main -SkipWebBuild

.NOTES
  Ejecutar COMO ADMINISTRADOR desde deploy\windows del repo. NUNCA corre db:reset.
#>

[CmdletBinding()]
param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  # Rama del proyecto unificado. El código completo NO está en 'main'.
  [string]$Branch = 'claude/mallatex-unified-project-87vgrq',
  # Omite recompilar la web (úsalo si sólo cambió el backend).
  [switch]$SkipWebBuild,
  # Sobrescribe la URL pública del gateway para el build (si no, se lee del ecosystem).
  [string]$PublicApiBase = ''
)

$ErrorActionPreference = 'Stop'
function Info($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  OK $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  ! $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "  X $m" -ForegroundColor Red; exit 1 }

$FrontendDir = Join-Path $ProjectRoot 'frontend'
$EcoPath = Join-Path $ProjectRoot 'ecosystem.config.js'
if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) { Die "package.json no encontrado en '$ProjectRoot'." }
if (-not (Test-Path $EcoPath)) { Die "No hay ecosystem.config.js. ¿Corriste install.ps1 primero?" }

# Recupera configuración desde el ecosystem existente (sin re-pedir secretos).
$DbUrl = (node -e "process.stdout.write(require('$($EcoPath.Replace('\','\\'))').apps.find(a=>a.name==='gateway').env.DATABASE_URL||'')").Trim()
if ([string]::IsNullOrWhiteSpace($DbUrl)) { Die "No pude leer DATABASE_URL del ecosystem." }
if ([string]::IsNullOrWhiteSpace($PublicApiBase)) {
  $PublicApiBase = (node -e "process.stdout.write(require('$($EcoPath.Replace('\','\\'))').apps.find(a=>a.name==='web').env.NEXT_PUBLIC_API_BASE||'')").Trim()
}

Push-Location $ProjectRoot
try {
  # --- 1. Respaldo de seguridad de la base --------------------------------
  Info "Respaldo previo de la base (por si acaso)"
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backupDir = 'C:\backups'; New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $backupFile = Join-Path $backupDir "mallatex-preupdate-$stamp.dump"
  if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    try { & pg_dump "$DbUrl" -F c -f $backupFile; Ok "Respaldo: $backupFile" }
    catch { Warn "No se pudo respaldar automáticamente; continúa bajo tu criterio." }
  } else { Warn "pg_dump no está en PATH; omito respaldo. Respalda manualmente antes de seguir." }

  # --- 2. Traer cambios ----------------------------------------------------
  Info "Trayendo cambios de git"
  if ($Branch) { git fetch origin $Branch; git checkout $Branch; git pull origin $Branch }
  else { git pull }
  Ok "Código actualizado"

  # --- 3. Dependencias -----------------------------------------------------
  Info "Actualizando dependencias"
  npm install --no-audit --no-fund
  Push-Location $FrontendDir; npm install --no-audit --no-fund; Pop-Location
  Ok "Dependencias al día"

  # --- 4. Migraciones incrementales (NUNCA reset) -------------------------
  Info "Aplicando migraciones nuevas (db:migrate up)"
  $env:DATABASE_URL = $DbUrl
  $env:NODE_ENV = 'production'
  npm run db:migrate;  if ($LASTEXITCODE -ne 0) { Die "db:migrate falló ($LASTEXITCODE). La base NO se modificó a medias si la migración es transaccional; revisa el error y reintenta." }
  Ok "Base al día (datos intactos)"

  # --- 5. Build de la web --------------------------------------------------
  if (-not $SkipWebBuild) {
    Info "Recompilando la web (NEXT_PUBLIC_API_BASE = $PublicApiBase)"
    Push-Location $FrontendDir
    if ($PublicApiBase) { $env:NEXT_PUBLIC_API_BASE = $PublicApiBase }
    npm run build;  if ($LASTEXITCODE -ne 0) { Pop-Location; Die "El build de la web falló ($LASTEXITCODE). Los procesos siguen con la versión anterior." }
    Pop-Location
    Ok "Web recompilada"
  } else { Warn "Se omitió el build de la web (-SkipWebBuild)" }

  # --- 6. Recarga sin downtime --------------------------------------------
  Info "Recargando procesos con PM2"
  pm2 reload ecosystem.config.js
  pm2 save
  Ok "Procesos recargados"
}
finally { Pop-Location }

Info "Verificando salud"
Start-Sleep -Seconds 3
try {
  $h = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/health' -TimeoutSec 5
  if ($h.StatusCode -eq 200) { Ok "Gateway 200 en /api/health" } else { Warn "Gateway respondió $($h.StatusCode)" }
} catch { Warn "El gateway no respondió; revisa 'pm2 logs'." }

Write-Host ""
Ok "Actualización completa. Revisa 'pm2 status'. Respaldo previo en C:\backups."
