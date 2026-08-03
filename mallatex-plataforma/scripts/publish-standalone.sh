#!/usr/bin/env bash
# =====================================================================
#  Publica la Plataforma Mallatex como un REPOSITORIO SEPARADO.
#
#  Uso:
#    1) Crea el repo vacío en GitHub (sin README):
#         https://github.com/new  ->  nombre: mallatex-plataforma
#    2) Desde la carpeta mallatex-plataforma/ ejecuta:
#         bash scripts/publish-standalone.sh git@github.com:EduardoGamboaB/mallatex-plataforma.git
#       (o la URL https del repo recién creado)
#
#  El script inicializa un repo Git limpio con SÓLO este proyecto en la
#  raíz (front/back/móvil/datos) y lo sube a la rama main del remoto.
# =====================================================================
set -euo pipefail

REMOTE="${1:-}"
if [[ -z "$REMOTE" ]]; then
  echo "ERROR: indica la URL del repositorio remoto."
  echo "  bash scripts/publish-standalone.sh <git-remote-url>"
  exit 1
fi

# Raíz del proyecto (carpeta que contiene este script/..)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ Publicando $ROOT como repositorio separado en: $REMOTE"

TMP="$(mktemp -d)"
# Copia el árbol excluyendo artefactos y control de versiones del monorepo padre
rsync -a --exclude '.git' --exclude 'node_modules' --exclude '.next' \
         --exclude 'data' --exclude '*.sqlite' --exclude 'dist' --exclude 'build' \
         "$ROOT/" "$TMP/"

cd "$TMP"
git init -q
git checkout -q -b main
git add .
git -c user.name='Mallatex' -c user.email='ing.eduardogamboa@gmail.com' \
    commit -q -m "Plataforma Mallatex unificada: backend DDD + microservicios, web mobile-first, app móvil y datos"
git remote add origin "$REMOTE"

echo "▶ Subiendo a $REMOTE (rama main)..."
git push -u origin main

echo "✓ Publicado. El repositorio separado queda con front/, backend/, mobile/ y database/ en la raíz."
echo "  (copia de trabajo temporal: $TMP)"
