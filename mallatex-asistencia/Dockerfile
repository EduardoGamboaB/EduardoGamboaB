# Imagen de producción — Mallatex · Plataforma de Asistencia (NOI)
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

# Instala sólo dependencias de producción (aprovechando la caché de capas)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Código de la aplicación
COPY server ./server
COPY public ./public

# Directorio de datos (sólo para STORAGE=file; en producción se recomienda STORAGE=postgres).
# Sin instrucción VOLUME: Railway no la soporta (usa Railway Volumes). Para persistir con
# archivo, monta un volumen en /data desde tu orquestador (docker -v, compose o Railway Volumes).
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data /app

USER node
EXPOSE 3000

# Verificación de salud del contenedor
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
