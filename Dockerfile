# Imagen de producción para Railway (build desde la raíz del repositorio).
# Construye la app Anaberries · Captura de Leads que vive en ./anaberries-leads.
# Nota: si en Railway configuras Root Directory = anaberries-leads, se usa el
# Dockerfile de esa subcarpeta y este archivo raíz se ignora.
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

# Dependencias de producción (contexto = raíz del repo).
COPY anaberries-leads/package.json anaberries-leads/package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Código de la aplicación (servidor + frontend con OCR y QR vendorizados).
COPY anaberries-leads/server ./server
COPY anaberries-leads/public ./public

# Directorio de datos. La persistencia se logra montando un Railway Volume en /data
# (Railway no admite la instrucción VOLUME de Docker; se omite a propósito).
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data /app

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
