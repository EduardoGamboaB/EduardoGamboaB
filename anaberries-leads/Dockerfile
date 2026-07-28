# Imagen de producción — Anaberries · Captura de Leads (Mallatex)
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

# Instala sólo dependencias de producción (aprovechando la caché de capas)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Código de la aplicación (incluye el motor OCR y el generador de QR vendorizados en public/)
COPY server ./server
COPY public ./public

# Directorio de datos (leads + fotos de gafetes). La persistencia se logra montando
# un volumen en /data (en Railway, un Railway Volume; su builder no admite VOLUME).
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data /app

USER node
EXPOSE 4000

# Verificación de salud del contenedor
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
