FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json ./
COPY prisma ./prisma
COPY ../../packages/shared-types /app/packages/shared-types
RUN npm install --no-audit --no-fund
RUN npx prisma generate --schema=prisma/schema.prisma

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app /app
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:20-alpine AS run
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/server.js"]
