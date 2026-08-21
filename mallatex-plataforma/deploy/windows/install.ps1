#Requires -Version 5.1
<#
.SYNOPSIS
  Instalación nativa (sin Docker) de la Plataforma Mallatex en Windows Server.
  Automatiza la "Ruta B" del manual: dependencias, migraciones + seed, build de
  la web, generación del ecosystem de PM2 y arranque de los 8 procesos.

.DESCRIPTION
  Idempotente: se puede volver a ejecutar. NO instala Node/PostgreSQL/Git
  (deben existir); sí valida que estén presentes. La creación de la base es
  opcional (-CreateDatabase).

.EXAMPLE
  .\install.ps1 -DbPassword 'Clave#Fuerte' -PublicApiBase 'https://mallatex.empresa.com' -CreateDatabase

.NOTES
  Ejecutar en PowerShell COMO ADMINISTRADOR, desde la carpeta deploy\windows del repo.
#>

[CmdletBinding()]
param(
  # Carpeta raíz del proyecto (la que contiene package.json y scripts\dev.js).
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  # Conexión a PostgreSQL.
  [string]$DbHost = 'localhost',
  [int]$DbPort = 5432,
  [string]$DbName = 'mallatex',
  [string]$DbUser = 'mallatex',
  [Parameter(Mandatory = $true)][string]$DbPassword,
  # URL pública del gateway que verá el navegador (se hornea en la web).
  [string]$PublicApiBase = 'http://localhost:3000',
  # Secreto JWT (>=32). Si se omite, se genera uno aleatorio.
  [string]$JwtSecret = '',
  # Orígenes CORS exactos (tu dominio). '*' sólo para pruebas locales.
  [string]$CorsOrigins = '*',
  # Secreto del webhook de pagos (Aspel).
  [string]$AspelWebhookSecret = '',
  # Crea la base y el usuario (pide credenciales de superusuario postgres).
  [switch]$CreateDatabase,
  # Superusuario para crear la base (sólo con -CreateDatabase).
  [string]$PostgresSuperUser = 'postgres'
)

$ErrorActionPreference = 'Stop'
function Info($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  OK $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  ! $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "  X $m" -ForegroundColor Red; exit 1 }

function Require-Cmd($name, $hint) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $c) { Die "Falta '$name'. $hint" }
  return $c
}

# --- 0. Contexto -----------------------------------------------------------
Info "Plataforma Mallatex · instalación nativa en Windows Server"
if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) {
  Die "No encuentro package.json en '$ProjectRoot'. Pasa -ProjectRoot con la ruta correcta."
}
$FrontendDir = Join-Path $ProjectRoot 'frontend'
Ok "Proyecto: $ProjectRoot"

# --- 1. Prerrequisitos -----------------------------------------------------
Info "Verificando prerrequisitos"
Require-Cmd node 'Instala Node.js 20 LTS: winget install OpenJS.NodeJS.LTS' | Out-Null
$nodeMajor = ([int]((node --version) -replace 'v(\d+).*', '$1'))
if ($nodeMajor -lt 20) { Die "Node $((node --version)) detectado; se requiere >= 20." }
Ok "Node $((node --version))"
Require-Cmd npm 'Viene con Node.' | Out-Null
Require-Cmd psql 'Instala PostgreSQL 16: winget install PostgreSQL.PostgreSQL.16' | Out-Null
Ok "npm y psql presentes"

# --- 2. Secretos -----------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
  $JwtSecret = (node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))").Trim()
  Ok "JWT_SECRET generado ($($JwtSecret.Length) caracteres)"
}
if ($JwtSecret.Length -lt 24) { Die "JWT_SECRET demasiado corto (>=24). Los servicios no arrancan en producción." }
if ([string]::IsNullOrWhiteSpace($AspelWebhookSecret)) {
  $AspelWebhookSecret = (node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))").Trim()
}
$DbUrl = "postgres://$($DbUser):$($DbPassword)@$($DbHost):$($DbPort)/$($DbName)"

# --- 3. Base de datos (opcional) ------------------------------------------
if ($CreateDatabase) {
  Info "Creando base y usuario en PostgreSQL (superusuario '$PostgresSuperUser')"
  $sql = @"
DO `$`$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DbUser') THEN
    CREATE ROLE $DbUser LOGIN PASSWORD '$DbPassword';
  END IF;
END `$`$;
"@
  $sql | psql -U $PostgresSuperUser -h $DbHost -p $DbPort -v ON_ERROR_STOP=1 -d postgres
  # CREATE DATABASE no admite IF NOT EXISTS; se ignora el error si ya existe.
  & psql -U $PostgresSuperUser -h $DbHost -p $DbPort -d postgres -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>$null
  Ok "Base '$DbName' y usuario '$DbUser' listos"
}

# --- 4. Dependencias -------------------------------------------------------
Push-Location $ProjectRoot
try {
  Info "Instalando dependencias del backend (workspaces)"
  npm install --no-audit --no-fund
  Ok "Backend instalado"

  Info "Instalando dependencias de la web"
  Push-Location $FrontendDir
  npm install --no-audit --no-fund
  Pop-Location
  Ok "Web instalada"

  # --- 5. Migraciones + seed ----------------------------------------------
  Info "Aplicando migraciones y seed"
  $env:DATABASE_URL = $DbUrl
  $env:NODE_ENV = 'production'
  npm run db:migrate;  if ($LASTEXITCODE -ne 0) { Die "db:migrate falló ($LASTEXITCODE). Revisa DATABASE_URL y que PostgreSQL esté arriba." }
  npm run db:seed;     if ($LASTEXITCODE -ne 0) { Die "db:seed falló ($LASTEXITCODE)." }
  Ok "Base migrada y sembrada"

  # --- 6. Build de la web --------------------------------------------------
  Info "Compilando la web (NEXT_PUBLIC_API_BASE = $PublicApiBase)"
  Push-Location $FrontendDir
  $env:NEXT_PUBLIC_API_BASE = $PublicApiBase
  npm run build;  if ($LASTEXITCODE -ne 0) { Pop-Location; Die "El build de la web falló ($LASTEXITCODE)." }
  Pop-Location
  Ok "Web compilada"

  # --- 7. ecosystem.config.js de PM2 --------------------------------------
  Info "Generando ecosystem.config.js"
  $rootEsc = $ProjectRoot.Replace('\', '\\')
  $template = @'
// Generado por install.ps1 — NO subir a git (contiene secretos).
const ROOT = "__ROOT__";
const shared = {
  NODE_ENV: "production",
  DATABASE_URL: "__DBURL__",
  DATABASE_SSL: "false",
  JWT_SECRET: "__JWT__",
  CORS_ORIGINS: "__CORS__",
  TRUST_PROXY: "true",
  ASPEL_WEBHOOK_SECRET: "__ASPEL__",
};
const svc = (name, file, port, extra = {}) => ({
  name, script: file, cwd: ROOT, interpreter: "node",
  env: { ...shared, PORT: String(port), SERVICE_NAME: name, ...extra },
});
module.exports = { apps: [
  svc("identity",   "backend/services/identity/src/index.js",   3001),
  svc("attendance", "backend/services/attendance/src/index.js", 3002, { TZ: "America/Mexico_City" }),
  svc("crm",        "backend/services/crm/src/index.js",        3003),
  svc("mes",        "backend/services/mes/src/index.js",        3004),
  svc("leads",      "backend/services/leads/src/index.js",      3005),
  svc("marketing",  "backend/services/marketing/src/index.js",  3006, { JSON_LIMIT: "40mb" }),
  { name: "gateway", script: "backend/gateway/src/index.js", cwd: ROOT, interpreter: "node",
    env: { ...shared, PORT: "3000", SERVICE_NAME: "gateway",
      IDENTITY_URL: "http://localhost:3001", ATTENDANCE_URL: "http://localhost:3002",
      CRM_URL: "http://localhost:3003", MES_URL: "http://localhost:3004",
      LEADS_URL: "http://localhost:3005", MARKETING_URL: "http://localhost:3006" } },
  { name: "web", script: "node_modules/next/dist/bin/next", args: "start -p 3100",
    cwd: ROOT + "\\frontend", interpreter: "node",
    env: { PORT: "3100", NEXT_PUBLIC_API_BASE: "__APIBASE__" } },
] };
'@
  $eco = $template.
    Replace('__ROOT__', $rootEsc).
    Replace('__DBURL__', $DbUrl).
    Replace('__JWT__', $JwtSecret).
    Replace('__CORS__', $CorsOrigins).
    Replace('__ASPEL__', $AspelWebhookSecret).
    Replace('__APIBASE__', $PublicApiBase)
  $ecoPath = Join-Path $ProjectRoot 'ecosystem.config.js'
  Set-Content -Path $ecoPath -Value $eco -Encoding UTF8
  Ok "Escrito $ecoPath"

  # --- 8. PM2 --------------------------------------------------------------
  if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Info "Instalando PM2 global"
    npm install -g pm2
    # Refresca PATH para ver el bin global recién instalado en esta sesión.
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  }
  if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Die "PM2 no quedó en PATH. Abre una consola nueva y ejecuta: pm2 start `"$ecoPath`"; pm2 save"
  }
  Info "Arrancando procesos con PM2"
  pm2 start $ecoPath
  pm2 save
  Ok "Procesos arrancados y guardados"
}
finally { Pop-Location }

# --- 9. Verificación rápida -----------------------------------------------
Info "Verificando salud del gateway"
Start-Sleep -Seconds 4
try {
  $h = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/health' -TimeoutSec 5
  if ($h.StatusCode -eq 200) { Ok "Gateway responde 200 en /api/health" } else { Warn "Gateway respondió $($h.StatusCode)" }
} catch { Warn "El gateway aún no responde; revisa 'pm2 logs gateway'." }

Write-Host ""
Info "Instalación completa. Siguientes pasos:"
Write-Host "  1. Autostart al reiniciar: configura PM2 como servicio (pm2-installer) y luego 'pm2 save'." -ForegroundColor Gray
Write-Host "  2. Publica por HTTPS con un proxy inverso (IIS ARR / Caddy) -> /api al 3000, resto al 3100." -ForegroundColor Gray
Write-Host "  3. ENDURECE: cambia las contrasenas demo (mallatex2026) y el PIN 1234." -ForegroundColor Gray
Write-Host "  4. Protege ecosystem.config.js (contiene secretos). No lo subas a git." -ForegroundColor Gray
Write-Host "  Comandos utiles: pm2 status | pm2 logs | pm2 restart all" -ForegroundColor Gray
